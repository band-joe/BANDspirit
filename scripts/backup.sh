#!/usr/bin/env bash
# ==============================================================================
# BANDspirit – Backup-Script
# ------------------------------------------------------------------------------
# Erstellt ein vollstaendiges Backup des BANDspirit-Docker-Stacks:
#
#   1. PostgreSQL-Datenbank  -> logischer Dump (pg_dump, komprimiert)
#   2. Docker-Volumes        -> jeweils als .tar.gz
#        - postgres-data  (Datenbank-Dateien, physisch)
#        - minio-data     (hochgeladene Dateien / Objektspeicher)
#        - redis-data     (Cache / Redis-Persistenz)
#        - nginx-logs     (Zugriffs-/Fehlerprotokolle von nginx)
#
# Alle Backups landen in einem zeitgestempelten Unterordner unter BACKUP_ROOT.
# Alte Backups werden nach RETENTION_DAYS Tagen automatisch geloescht.
#
# ------------------------------------------------------------------------------
# Aufruf (aus dem Projektverzeichnis, z. B. /opt/bandspirit):
#   chmod +x scripts/backup.sh
#   ./scripts/backup.sh
#
# Optionen ueber Umgebungsvariablen:
#   BACKUP_ROOT=/pfad/zu/backups   Zielordner (Standard: <projekt>/backups)
#   RETENTION_DAYS=14              Aufbewahrung in Tagen (Standard: 14; 0 = nie loeschen)
#   TARGET=/pfad/zu/bandspirit     Projektverzeichnis (Standard: uebergeordnet)
#
# Beispiel (Backups woanders ablegen, 30 Tage aufbewahren):
#   BACKUP_ROOT=/mnt/nas/bandspirit RETENTION_DAYS=30 ./scripts/backup.sh
#
# Fuer automatische, taegliche Backups (z. B. 02:30 Uhr) per crontab:
#   30 2 * * * cd /opt/bandspirit && ./scripts/backup.sh >> /var/log/bandspirit-backup.log 2>&1
# ==============================================================================
set -uo pipefail

# ── Pfade / Konfiguration ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${TARGET:-$(dirname "$SCRIPT_DIR")}"
BACKUP_ROOT="${BACKUP_ROOT:-$TARGET/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# Feste Container-Namen (aus docker-compose.yml)
PG_CONTAINER="bandspirit-postgres"

# Zu sichernde Volumes: "Container:Mountpfad:Ausgabename"
# Der Volume-Name wird robust ueber die tatsaechlichen Container-Mounts ermittelt,
# unabhaengig vom Compose-Projektpraefix.
VOLUME_SPECS=(
  "bandspirit-postgres:/var/lib/postgresql/data:postgres-data"
  "bandspirit-minio:/data:minio-data"
  "bandspirit-redis:/data:redis-data"
  "bandspirit-nginx:/var/log/nginx:nginx-logs"
)

STAMP="$(date +%Y%m%d_%H%M%S)"
OUTDIR="$BACKUP_ROOT/$STAMP"

echo "=============================================================="
echo " BANDspirit – Backup"
echo " Zeitpunkt:        $STAMP"
echo " Projekt:          $TARGET"
echo " Backup-Ordner:    $OUTDIR"
echo " Aufbewahrung:     ${RETENTION_DAYS} Tage"
echo "=============================================================="

# ── Docker pruefen ───────────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "FEHLER: docker nicht gefunden."; exit 1
fi

mkdir -p "$OUTDIR" || { echo "FEHLER: Backup-Ordner kann nicht erstellt werden."; exit 1; }

FEHLER=0

# ── 1. PostgreSQL-Dump ───────────────────────────────────────────────────────
echo ""
echo "-> 1/2  PostgreSQL-Datenbank sichern (pg_dump) ..."
if docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  DUMP_FILE="$OUTDIR/db_dump_${STAMP}.sql.gz"
  # Benutzer/DB werden aus den Container-Umgebungsvariablen gelesen -> keine
  # Passwoerter im Skript noetig. --clean --if-exists erleichtert das Zuruecklesen.
  if docker exec "$PG_CONTAINER" sh -c \
       'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' \
       2>"$OUTDIR/db_dump.err" | gzip > "$DUMP_FILE"; then
    if [ -s "$DUMP_FILE" ]; then
      echo "   OK: $(basename "$DUMP_FILE") ($(du -h "$DUMP_FILE" | cut -f1))"
      rm -f "$OUTDIR/db_dump.err"
    else
      echo "   FEHLER: Dump ist leer. Siehe $OUTDIR/db_dump.err"; FEHLER=1
    fi
  else
    echo "   FEHLER: pg_dump fehlgeschlagen. Siehe $OUTDIR/db_dump.err"; FEHLER=1
  fi
else
  echo "   FEHLER: Container '$PG_CONTAINER' laeuft nicht – DB-Dump uebersprungen."
  echo "           (Stack mit 'docker compose up -d' starten und erneut versuchen.)"
  FEHLER=1
fi

# ── 2. Docker-Volumes sichern ────────────────────────────────────────────────
echo ""
echo "-> 2/2  Docker-Volumes sichern ..."

# Ermittelt den tatsaechlichen Volume-Namen anhand von Container + Mountpfad.
resolve_volume() {
  local container="$1" dest="$2"
  docker inspect -f \
    "{{range .Mounts}}{{if eq .Destination \"$dest\"}}{{.Name}}{{end}}{{end}}" \
    "$container" 2>/dev/null
}

for spec in "${VOLUME_SPECS[@]}"; do
  IFS=':' read -r c_name m_path out_name <<< "$spec"
  vol="$(resolve_volume "$c_name" "$m_path")"
  if [ -z "$vol" ]; then
    echo "   WARNUNG: Volume fuer $out_name ($c_name:$m_path) nicht gefunden – uebersprungen."
    FEHLER=1
    continue
  fi
  archive="$OUTDIR/${out_name}_${STAMP}.tar.gz"
  # Volume schreibgeschuetzt in einen Hilfscontainer mounten und archivieren.
  if docker run --rm \
       -v "$vol":/src:ro \
       -v "$OUTDIR":/backup \
       alpine:3.20 \
       sh -c "tar -czf '/backup/$(basename "$archive")' -C /src . " 2>/dev/null; then
    echo "   OK: $(basename "$archive")  [Volume: $vol]  ($(du -h "$archive" | cut -f1))"
  else
    echo "   FEHLER: Volume '$vol' ($out_name) konnte nicht gesichert werden."; FEHLER=1
  fi
done

# ── Manifest / Zusammenfassung ───────────────────────────────────────────────
MANIFEST="$OUTDIR/manifest.txt"
{
  echo "BANDspirit Backup"
  echo "Zeitpunkt: $STAMP"
  echo "Projekt:   $TARGET"
  echo ""
  echo "Inhalt:"
  ls -lh "$OUTDIR" | tail -n +2
} > "$MANIFEST"

# ── Aufbewahrung: alte Backups loeschen ──────────────────────────────────────
if [ "$RETENTION_DAYS" -gt 0 ] 2>/dev/null; then
  echo ""
  echo "-> Alte Backups (> ${RETENTION_DAYS} Tage) entfernen ..."
  # Nur zeitgestempelte Unterordner im Format JJJJMMTT_HHMMSS beruecksichtigen.
  find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d \
       -name '20*_*' -mtime +"$RETENTION_DAYS" -print -exec rm -rf {} + 2>/dev/null \
    | sed 's/^/   geloescht: /' || true
fi

# ── Ergebnis ─────────────────────────────────────────────────────────────────
echo ""
echo "=============================================================="
if [ "$FEHLER" = "0" ]; then
  echo " Backup erfolgreich abgeschlossen."
else
  echo " Backup mit WARNUNGEN/FEHLERN abgeschlossen – bitte Meldungen pruefen."
fi
echo " Ablage: $OUTDIR"
echo " Groesse gesamt: $(du -sh "$OUTDIR" 2>/dev/null | cut -f1)"
echo "=============================================================="
exit "$FEHLER"
