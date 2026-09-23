#!/usr/bin/env bash
# ==============================================================================
# BANDspirit – E-Mail-Verifizierung eines Benutzers manuell setzen
# ------------------------------------------------------------------------------
# Setzt das Feld "EmailVerified" (Users-Tabelle) fuer einen Benutzer direkt in
# der Datenbank. Gedacht fuer den Fall, dass der Bestaetigungslink (POST
# /api/auth/verify-email, siehe AuthController.cs) nicht ankommt/funktioniert
# und ein Admin den Benutzer manuell freischalten muss (Login ist erst nach
# EmailVerified = true moeglich, siehe AuthService.ValidateCredentialsAsync).
#
# Sucht den Benutzer case-/whitespace-insensitiv ueber dieselbe Normalisierung
# wie die App selbst (AuthService.NormalizeEmail: trim + lowercase), Abgleich
# gegen die Spalte "EmailCanonical".
#
# ------------------------------------------------------------------------------
# Aufruf (aus dem Projektverzeichnis):
#   chmod +x scripts/set-email-verified.sh
#   ./scripts/set-email-verified.sh <email> [true|false]
#
# Beispiele:
#   ./scripts/set-email-verified.sh max.muster@band.ch          # setzt auf true
#   ./scripts/set-email-verified.sh max.muster@band.ch true
#   ./scripts/set-email-verified.sh max.muster@band.ch false     # zuruecksetzen
#
# Optionen ueber Umgebungsvariablen:
#   PG_CONTAINER=bandspirit-postgres   Container-Name (Standard: bandspirit-postgres)
# ==============================================================================
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-bandspirit-postgres}"

EMAIL="${1:-}"
WERT="${2:-true}"

if [ -z "$EMAIL" ]; then
  echo "FEHLER: Bitte E-Mail-Adresse angeben."
  echo "Aufruf: ./scripts/set-email-verified.sh <email> [true|false]"
  exit 1
fi

case "$WERT" in
  true|false) ;;
  *)
    echo "FEHLER: Zweites Argument muss 'true' oder 'false' sein, nicht '$WERT'."
    exit 1
    ;;
esac

if ! command -v docker >/dev/null 2>&1; then
  echo "FEHLER: docker nicht gefunden."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  echo "FEHLER: Container '$PG_CONTAINER' laeuft nicht."
  echo "        Bitte zuerst 'docker compose up -d' ausfuehren."
  exit 1
fi

# E-Mail wie in AuthService.NormalizeEmail() normalisieren (trim + lowercase),
# damit der Abgleich gegen "EmailCanonical" identisch zur App-Logik ist, und
# fuer die SQL-Literale escapen (einzelnes ' -> '').
EMAIL_CANONICAL="$(printf '%s' "$EMAIL" | tr '[:upper:]' '[:lower:]' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
EMAIL_SQL="${EMAIL_CANONICAL//\'/\'\'}"

echo "=============================================================="
echo " BANDspirit – EmailVerified setzen"
echo " E-Mail:        $EMAIL"
echo " Neuer Wert:    $WERT"
echo "=============================================================="
echo ""

TMP_SQL="$(mktemp)"
trap 'rm -f "$TMP_SQL"' EXIT

cat > "$TMP_SQL" <<EOF
SELECT "Id" || '|' || "Email" || '|' || "EmailVerified"::text || '|' || "Aktiv"::text
FROM "Users" WHERE "EmailCanonical" = '$EMAIL_SQL';
EOF

docker cp "$TMP_SQL" "$PG_CONTAINER:/tmp/set-email-verified-select.sql" >/dev/null
VORHER="$(docker exec "$PG_CONTAINER" bash -c \
  'psql -X -A -t -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/set-email-verified-select.sql')"
docker exec "$PG_CONTAINER" rm -f /tmp/set-email-verified-select.sql

if [ -z "$VORHER" ]; then
  echo "FEHLER: Kein Benutzer mit dieser E-Mail-Adresse gefunden."
  exit 1
fi

IFS='|' read -r USER_ID USER_EMAIL ALT_WERT USER_AKTIV <<< "$VORHER"
echo "-> Gefunden: $USER_EMAIL (Id: $USER_ID, Aktiv: $USER_AKTIV)"
echo "   EmailVerified bisher: $ALT_WERT"

if [ "$ALT_WERT" = "$WERT" ]; then
  echo ""
  echo "EmailVerified ist bereits '$WERT' – keine Aenderung noetig."
  exit 0
fi

cat > "$TMP_SQL" <<EOF
UPDATE "Users" SET "EmailVerified" = $WERT, "UpdatedAt" = now()
WHERE "EmailCanonical" = '$EMAIL_SQL';
EOF

docker cp "$TMP_SQL" "$PG_CONTAINER:/tmp/set-email-verified-update.sql" >/dev/null
docker exec "$PG_CONTAINER" bash -c \
  'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/set-email-verified-update.sql' >/dev/null
docker exec "$PG_CONTAINER" rm -f /tmp/set-email-verified-update.sql

echo ""
echo "=============================================================="
echo " OK: EmailVerified fuer $USER_EMAIL ist jetzt '$WERT'."
echo "=============================================================="
