#!/usr/bin/env bash
# ==============================================================================
# BANDspirit – Admin-Passwort automatisch zurücksetzen
# Löscht den Admin-User aus der DB und startet die API neu → Admin wird mit
# dem in .env konfigurierten Passwort neu angelegt
# ==============================================================================
set -euo pipefail

echo "======================================================================"
echo " BANDspirit – Admin-Passwort zurücksetzen"
echo "======================================================================"
echo ""

# .env prüfen
if [ ! -f .env ]; then
  echo "❌ FEHLER: .env-Datei nicht gefunden!"
  echo "   Bitte .env mit DEFAULT_ADMIN_PASSWORD anlegen."
  exit 1
fi

ADMIN_PW=$(grep "^DEFAULT_ADMIN_PASSWORD=" .env | cut -d'=' -f2)
if [ -z "$ADMIN_PW" ] || [ "$ADMIN_PW" = "PLACEHOLDER" ]; then
  echo "❌ FEHLER: DEFAULT_ADMIN_PASSWORD ist nicht gesetzt oder = PLACEHOLDER!"
  echo "   Bitte in .env konfigurieren."
  exit 1
fi

echo "✓ DEFAULT_ADMIN_PASSWORD in .env gefunden: ${ADMIN_PW:0:3}***"
echo ""

# Container prüfen
if ! docker ps --format '{{.Names}}' | grep -q "^bandspirit-api$"; then
  echo "❌ FEHLER: Container 'bandspirit-api' läuft nicht!"
  echo "   Bitte zuerst 'docker compose up -d' ausführen."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^bandspirit-postgres$"; then
  echo "❌ FEHLER: Container 'bandspirit-postgres' läuft nicht!"
  exit 1
fi

echo "✓ Container laufen."
echo ""

# Admin-User löschen
echo "→ Lösche Admin-User aus der Datenbank ..."
docker exec bandspirit-postgres psql -U bandspirit -d bandspirit -c \
  "DELETE FROM \"Users\" WHERE \"Email\" = 'admin@bandspirit.local';" \
  > /dev/null 2>&1 && echo "  ✓ Gelöscht" || echo "  (war bereits nicht vorhanden)"

echo ""
echo "→ Starte API-Container neu (Admin wird neu angelegt) ..."
docker compose restart api > /dev/null 2>&1
echo "  ✓ Neugestartet"

echo ""
echo "→ Warte 5 Sekunden auf Seeding ..."
sleep 5

echo ""
echo "→ Prüfe, ob Admin-User neu angelegt wurde ..."
docker exec bandspirit-postgres psql -U bandspirit -d bandspirit -t -c \
  "SELECT 'Email: ' || \"Email\", 'Aktiv: ' || \"Aktiv\"::text FROM \"Users\" WHERE \"Email\" = 'admin@bandspirit.local';"

echo ""
echo "======================================================================"
echo " ✓ Admin-Passwort wurde zurückgesetzt!"
echo ""
echo "   Login:    admin@bandspirit.local"
echo "   Passwort: $ADMIN_PW"
echo "======================================================================"
