#!/usr/bin/env bash
# ==============================================================================
# BANDspirit – Admin-Login Diagnose
# Prüft, ob die Umgebungsvariable DEFAULT_ADMIN_PASSWORD korrekt geladen wird
# ==============================================================================
set -euo pipefail

echo "======================================================================"
echo " BANDspirit – Admin-Login Diagnose"
echo "======================================================================"
echo ""

# 1. .env-Datei prüfen
echo "1. .env-Datei (DEFAULT_ADMIN_PASSWORD):"
if [ -f .env ]; then
  grep "^DEFAULT_ADMIN_PASSWORD=" .env || echo "   ❌ DEFAULT_ADMIN_PASSWORD nicht in .env gefunden!"
else
  echo "   ❌ Keine .env-Datei gefunden!"
fi
echo ""

# 2. Container-Umgebungsvariablen prüfen
echo "2. API-Container Umgebungsvariablen (DefaultAdminPassword):"
docker exec bandspirit-api printenv | grep -i "DefaultAdminPassword" || echo "   ❌ DefaultAdminPassword nicht im Container gesetzt!"
echo ""

# 3. Aktueller Admin-User in der DB
echo "3. Admin-User in der Datenbank:"
docker exec -it bandspirit-postgres psql -U bandspirit -d bandspirit -t -c \
  "SELECT 'Email: ' || \"Email\", 'Aktiv: ' || \"Aktiv\"::text, 'Role: ' || \"Role\" FROM \"Users\" WHERE \"Email\" = 'admin@bandspirit.local';" \
  || echo "   ❌ Konnte DB nicht abfragen!"
echo ""

# 4. API-Container Logs (Seeding)
echo "4. API-Container Logs (Admin-Seeding):"
docker logs bandspirit-api 2>&1 | grep -iE "(admin.*wurde angelegt|admin.*passwort|konfiguriert)" | tail -5 || echo "   (keine relevanten Logs gefunden)"
echo ""

echo "======================================================================"
echo " Empfohlene Aktion:"
echo "======================================================================"
echo "Falls 'DefaultAdminPassword' im Container NICHT gesetzt ist:"
echo "  → docker compose restart api"
echo ""
echo "Falls Admin-User bereits existiert mit falschem Passwort:"
echo "  → docker exec -it bandspirit-postgres psql -U bandspirit -d bandspirit"
echo "  → DELETE FROM \"Users\" WHERE \"Email\" = 'admin@bandspirit.local';"
echo "  → \\q"
echo "  → docker compose restart api"
echo "======================================================================"
