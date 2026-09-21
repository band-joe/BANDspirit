#!/usr/bin/env bash
#
# BANDspirit – DB-Backup einlesen.
#
# Liest ein mit pg_dump erstelltes, gzip-komprimiertes Backup
# (bandspirit-backup-*.sql.gz) in eine PostgreSQL-Datenbank ein.
#
# Das Backup wurde mit `pg_dump --clean --if-exists` erstellt: es enthält vor
# jedem CREATE-Statement ein DROP ... IF EXISTS. Ein Einlesen funktioniert
# daher sowohl gegen eine leere als auch gegen eine bereits befüllte
# Ziel-Datenbank (bestehende gleichnamige Objekte werden dabei ersetzt).
#
# Verwendung:
#   ./import-backup.sh <backup-datei.sql.gz> [db-name] [db-user] [db-host] [db-port]
#
# Beispiele:
#   # In den laufenden lokalen Docker-Compose-Postgres einlesen (Standardwerte):
#   ./import-backup.sh bandspirit-backup-20260921_171836.sql.gz
#
#   # In eine andere/neue Postgres-Instanz einlesen (z. B. Zielserver bei einem
#   # Umzug):
#   ./import-backup.sh bandspirit-backup-20260921_171836.sql.gz bandspirit bandspirit db.example.ch 5432
#
# WICHTIG: Das Backup enthält vollständige Personendaten (Name, E-Mail,
# Passwort-Hash) aller Benutzer. Datei nach Gebrauch entsprechend schützen/
# löschen, nicht per E-Mail versenden, nicht in Git committen.

set -euo pipefail

BACKUP_DATEI="${1:?Usage: $0 <backup-datei.sql.gz> [db-name] [db-user] [db-host] [db-port]}"
DB_NAME="${2:-bandspirit}"
DB_USER="${3:-bandspirit}"
DB_HOST="${4:-}"
DB_PORT="${5:-5432}"

if [[ ! -f "$BACKUP_DATEI" ]]; then
    echo "Fehler: Backup-Datei '$BACKUP_DATEI' nicht gefunden." >&2
    exit 1
fi

echo "Lese Backup '$BACKUP_DATEI' in Datenbank '$DB_NAME' ein..."
read -r -p "Bestehende gleichnamige Objekte in '$DB_NAME' werden dabei ersetzt (DROP ... IF EXISTS aus dem Backup). Fortfahren? [j/N] " ANTWORT
if [[ ! "$ANTWORT" =~ ^[jJ]$ ]]; then
    echo "Abgebrochen."
    exit 1
fi

if [[ -z "$DB_HOST" ]]; then
    # Kein Host angegeben: Standardfall - laufender lokaler Docker-Compose-Stack.
    echo "Kein Host angegeben, verwende den lokalen Docker-Compose-Postgres-Container."
    gunzip -c "$BACKUP_DATEI" | docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" --set ON_ERROR_STOP=on
else
    gunzip -c "$BACKUP_DATEI" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --set ON_ERROR_STOP=on
fi

echo "Import abgeschlossen."
