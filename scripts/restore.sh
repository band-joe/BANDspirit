#!/usr/bin/env bash
# ==============================================================================
# BANDspirit – Restore-Script (Wiederherstellung)
# ------------------------------------------------------------------------------
# Stellt ein zuvor mit backup.sh erzeugtes Backup wieder her:
#
#   1. PostgreSQL-Datenbank  <- aus db_dump_*.sql.gz (pg_restore via psql)
#   2. Docker-Volumes        <- aus <name>_*.tar.gz
#        (minio-data, redis-data, nginx-logs; postgres-data optional)
#
# ACHTUNG: Die Wiederherstellung UEBERSCHREIBT vorhandene Daten!
#          Bitte vorher sicherstellen, dass das richtige Backup gewaehlt ist.
#
# ------------------------------------------------------------------------------
# Aufruf (aus dem Projektverzeichnis):
#   chmod +x scripts/restore.sh
#   ./scripts/restore.sh /pfad/zum/backup-ordner
#
# Beispiel:
#   ./scripts/restore.sh ./backups/20260816_023000
#
# Standardmaessig werden DB-Dump + Objektspeicher (minio) wiederhergestellt.
# Zusaetzliche Optionen (Umgebungsvariablen):
#   RESTORE_VOLUMES="minio-data redis-data nginx-logs"   welche Volumes (Standard: minio-data)
#   RESTORE_DB=1                                          DB-Dump einspielen (Standard: 1)
#   TARGET=/pfad/zu/bandspirit                            Projektverzeichnis
#
# Hinweis: Das physische Volume 'postgres-data' wird bewusst NICHT standardmaessig
# zurueckgespielt – die Datenbank wird ueber den logischen SQL-Dump wiederhergestellt.
# ==============================================================================
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${TARGET:-$(dirname "$SCRIPT_DIR")}"
BACKUP_DIR="${1:-}"
RESTORE_DB="${RESTORE_DB:-1}"
RESTORE_VOLUMES="${RESTORE_VOLUMES:-minio-data}"

PG_CONTAINER="bandspirit-postgres"

# Zuordnung Volume-Ausgabename -> Container:Mountpfad (fuer resolve_volume)
declare -A VOL_MOUNT=(
  ["postgres-data"]="bandspirit-postgres:/var/lib/postgresql/data"
  ["minio-data"]="bandspirit-minio:/data"
  ["redis-data"]="bandspirit-redis:/data"
  ["nginx-logs"]="bandspirit-nginx:/var/log/nginx"
)

if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then
  echo "FEHLER: Bitte einen gueltigen Backup-Ordner angeben."
  echo "Aufruf: ./scripts/restore.sh /pfad/zum/backup-ordner"
  exit 1
fi

echo "=============================================================="
echo " BANDspirit – Wiederherstellung"
echo " Backup-Ordner: $BACKUP_DIR"
echo " DB einspielen: $([ "$RESTORE_DB" = "1" ] && echo ja || echo nein)"
echo " Volumes:       $RESTORE_VOLUMES"
echo "=============================================================="
echo ""
echo " ACHTUNG: Vorhandene Daten werden ueberschrieben!"
printf " Fortfahren? [ja/NEIN]: "
read -r ANTWORT
case "$ANTWORT" in
  ja|Ja|JA|j|J) ;;
  *) echo "Abgebrochen."; exit 0 ;;
esac

command -v docker >/dev/null 2>&1 || { echo "FEHLER: docker nicht gefunden."; exit 1; }

resolve_volume() {
  local container="$1" dest="$2"
  docker inspect -f \
    "{{range .Mounts}}{{if eq .Destination \"$dest\"}}{{.Name}}{{end}}{{end}}" \
    "$container" 2>/dev/null
}

FEHLER=0

# ── 1. Datenbank wiederherstellen ────────────────────────────────────────────
if [ "$RESTORE_DB" = "1" ]; then
  echo ""
  echo "-> Datenbank wiederherstellen ..."
  DUMP_FILE="$(ls -1 "$BACKUP_DIR"/db_dump_*.sql.gz 2>/dev/null | head -n1)"
  if [ -z "$DUMP_FILE" ]; then
    echo "   WARNUNG: Kein db_dump_*.sql.gz gefunden – uebersprungen."; FEHLER=1
  elif ! docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
    echo "   FEHLER: Container '$PG_CONTAINER' laeuft nicht."; FEHLER=1
  else
    echo "   Datei: $(basename "$DUMP_FILE")"
    if gunzip -c "$DUMP_FILE" | docker exec -i "$PG_CONTAINER" sh -c \
         'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>"$BACKUP_DIR/restore_db.err"; then
      echo "   OK: Datenbank eingespielt."
      rm -f "$BACKUP_DIR/restore_db.err"
    else
      echo "   FEHLER: psql-Restore fehlgeschlagen. Siehe $BACKUP_DIR/restore_db.err"; FEHLER=1
    fi
  fi
fi

# ── 2. Volumes wiederherstellen ──────────────────────────────────────────────
echo ""
echo "-> Volumes wiederherstellen ..."
for out_name in $RESTORE_VOLUMES; do
  spec="${VOL_MOUNT[$out_name]:-}"
  if [ -z "$spec" ]; then
    echo "   WARNUNG: Unbekanntes Volume '$out_name' – uebersprungen."; FEHLER=1; continue
  fi
  archive="$(ls -1 "$BACKUP_DIR"/${out_name}_*.tar.gz 2>/dev/null | head -n1)"
  if [ -z "$archive" ]; then
    echo "   WARNUNG: Kein Archiv fuer '$out_name' gefunden – uebersprungen."; FEHLER=1; continue
  fi
  IFS=':' read -r c_name m_path <<< "$spec"
  vol="$(resolve_volume "$c_name" "$m_path")"
  if [ -z "$vol" ]; then
    echo "   WARNUNG: Volume fuer '$out_name' nicht gefunden – uebersprungen."; FEHLER=1; continue
  fi
  echo "   $out_name  <-  $(basename "$archive")  [Volume: $vol]"
  # Inhalt leeren und Archiv entpacken.
  if docker run --rm \
       -v "$vol":/dst \
       -v "$BACKUP_DIR":/backup:ro \
       alpine:3.20 \
       sh -c "rm -rf /dst/* /dst/..?* /dst/.[!.]* 2>/dev/null; tar -xzf '/backup/$(basename "$archive")' -C /dst"; then
    echo "     OK."
  else
    echo "     FEHLER beim Entpacken."; FEHLER=1
  fi
done

echo ""
echo "=============================================================="
if [ "$FEHLER" = "0" ]; then
  echo " Wiederherstellung abgeschlossen."
else
  echo " Wiederherstellung mit WARNUNGEN/FEHLERN – bitte Meldungen pruefen."
fi
echo " Empfehlung: Stack neu starten -> docker compose restart"
echo "=============================================================="
exit "$FEHLER"
