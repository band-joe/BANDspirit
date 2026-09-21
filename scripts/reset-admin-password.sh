#!/usr/bin/env bash
# ==============================================================================
# BANDspirit – Admin-Passwort auf den in .env konfigurierten Wert zurücksetzen
#
# Nutzt die Selbstheilungs-Logik in DataSeeder.cs: Bei JEDEM API-Start prüft
# der Seeder, ob das gespeicherte Passwort-Hash von admin@bandspirit.local
# gegen DEFAULT_ADMIN_PASSWORD verifiziert – falls nicht, wird es automatisch
# neu gesetzt (siehe Infrastructure/Seeding/DataSeeder.cs, Zeile ~73-78).
#
# Anders als scripts/fix-admin-password.sh wird der Benutzer NICHT gelöscht
# und neu angelegt (das würde die User-ID, CreatedAt, RowVersion und alle
# darauf verweisenden Audit-/Fremdschlüssel-Einträge verlieren) – ein reiner
# Neustart des api-Containers genügt.
# ==============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

echo "======================================================================"
echo " BANDspirit – Admin-Passwort zurücksetzen (nicht-destruktiv)"
echo "======================================================================"
echo ""

if [ ! -f .env ]; then
  echo "❌ FEHLER: .env-Datei nicht gefunden!"
  echo "   Bitte im Projekt-Root ausführen und DEFAULT_ADMIN_PASSWORD konfigurieren."
  exit 1
fi

ADMIN_PW=$(grep "^DEFAULT_ADMIN_PASSWORD=" .env | head -n1 | cut -d'=' -f2-)
if [ -z "$ADMIN_PW" ] || [ "$ADMIN_PW" = "PLACEHOLDER" ]; then
  echo "❌ FEHLER: DEFAULT_ADMIN_PASSWORD ist in .env nicht gesetzt oder = PLACEHOLDER."
  echo "   Bitte in .env einen echten Wert eintragen, dann dieses Skript erneut ausführen."
  exit 1
fi

echo "✓ DEFAULT_ADMIN_PASSWORD in .env gefunden (${#ADMIN_PW} Zeichen, Wert wird nicht angezeigt)."
echo ""

if ! docker compose ps --format '{{.Name}}' 2>/dev/null | grep -q "^bandspirit-api$"; then
  echo "❌ FEHLER: Container 'bandspirit-api' läuft nicht."
  echo "   Bitte zuerst 'docker compose up -d' ausführen."
  exit 1
fi

echo "→ Starte api-Container neu, damit DataSeeder das Passwort neu synchronisiert ..."
docker compose restart api
echo "  ✓ Neugestartet"
echo ""

echo "→ Warte auf Health-Check ..."
for i in $(seq 1 15); do
  if curl -fs http://localhost/health > /dev/null 2>&1; then
    echo "  ✓ API ist erreichbar."
    break
  fi
  sleep 2
done

echo ""
echo "→ Prüfe Login mit dem konfigurierten Passwort ..."
RESPONSE=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@bandspirit.local\",\"password\":\"${ADMIN_PW}\"}")

if echo "$RESPONSE" | grep -q '"token"'; then
  echo "  ✓ Login erfolgreich – Passwort ist synchronisiert."
else
  echo "  ❌ Login fehlgeschlagen. Antwort:"
  echo "  $RESPONSE"
  echo ""
  echo "  Prüfe 'docker compose logs api' auf die Zeile"
  echo "  'Admin-Passwort wurde auf den in DefaultAdminPassword konfigurierten Wert (zurück-)gesetzt.'"
  exit 1
fi

echo ""
echo "======================================================================"
echo " ✓ Fertig. Login: admin@bandspirit.local / (Wert aus DEFAULT_ADMIN_PASSWORD)"
echo "======================================================================"
