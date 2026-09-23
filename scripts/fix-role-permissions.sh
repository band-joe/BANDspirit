#!/usr/bin/env bash
# ==============================================================================
# BANDspirit – Fehlende RolePermissions nachtragen (Spannungen/Tickets)
# ------------------------------------------------------------------------------
# RolePermissionSeeder.cs befüllt die Tabelle "RolePermissions" nur beim
# allerersten Start (leere Tabelle) - auf bereits laufenden Installationen
# wirken spätere Änderungen am Seeder NICHT rückwirkend. Dieses Skript trägt
# fehlende Zeilen direkt nach, idempotent (mehrfach ausführbar, ändert nichts
# an bereits vorhandenen Berechtigungen) und ohne Zugangsdaten im Skript
# (nutzt die Container-eigenen Umgebungsvariablen).
#
# Fachlicher Hintergrund (siehe Commits 1c2395b/29e8bb2 im Branch
# "berechtigungen"):
#   - Jede Rolle soll Spannungen erfassen UND anschauen können
#     (org:driver:create + org:driver:read).
#   - Jede Rolle soll Tickets erstellen können (ticket:create).
#   Betrifft die Basisrollen "User", "BiGuideAdmin", "Metriker" - "Admin" und
#   "CircleAdmin" hatten diese Berechtigungen bereits.
#
# ------------------------------------------------------------------------------
# Aufruf (aus dem Projektverzeichnis des Zielsystems):
#   chmod +x scripts/fix-role-permissions.sh
#   ./scripts/fix-role-permissions.sh
#
# Optionen über Umgebungsvariablen:
#   PG_CONTAINER=bandspirit-postgres   Container-Name (Standard: bandspirit-postgres)
#
# Hinweis: Rollen, die auf dem Zielsystem nicht existieren (z. B. weil
# "BiGuideAdmin"/"Metriker" dort nicht angelegt wurden), werden übersprungen -
# das Skript schlägt dadurch nicht fehl, legt aber auch keine neuen Rollen an.
# ==============================================================================
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-bandspirit-postgres}"

if ! command -v docker >/dev/null 2>&1; then
  echo "FEHLER: docker nicht gefunden."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  echo "FEHLER: Container '$PG_CONTAINER' laeuft nicht."
  echo "        Bitte zuerst 'docker compose up -d' ausfuehren."
  exit 1
fi

echo "=============================================================="
echo " BANDspirit – Fehlende RolePermissions nachtragen"
echo " Container: $PG_CONTAINER"
echo "=============================================================="
echo ""

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# ── SQL-Skripte lokal vorbereiten ────────────────────────────────────────────
cat > "$TMP_DIR/before_after.sql" <<'EOF'
SELECT "Role", "Permission" FROM "RolePermissions"
WHERE "Permission" IN ('org:driver:read','org:driver:create','ticket:create')
  AND "Role" IN ('User','BiGuideAdmin','Metriker')
ORDER BY "Role", "Permission";
EOF

cat > "$TMP_DIR/fix.sql" <<'EOF'
BEGIN;

INSERT INTO "RolePermissions" ("Id","Role","Permission","RoleId","CreatedAt","UpdatedAt")
SELECT gen_random_uuid(), v.role, v.permission, br."Id", now(), now()
FROM (VALUES
  ('User',         'org:driver:create'),
  ('BiGuideAdmin', 'org:driver:read'),
  ('BiGuideAdmin', 'org:driver:create'),
  ('BiGuideAdmin', 'ticket:create'),
  ('Metriker',     'org:driver:read'),
  ('Metriker',     'org:driver:create'),
  ('Metriker',     'ticket:create')
) AS v(role, permission)
LEFT JOIN "BenutzerRollen" br ON br."Name" = v.role
ON CONFLICT ("Role", "Permission") DO NOTHING;

COMMIT;
EOF

# ── Ins Container kopieren ───────────────────────────────────────────────────
docker cp "$TMP_DIR/before_after.sql" "$PG_CONTAINER:/tmp/rp_before_after.sql" >/dev/null
docker cp "$TMP_DIR/fix.sql" "$PG_CONTAINER:/tmp/rp_fix.sql" >/dev/null

echo "-> Vorher:"
docker exec "$PG_CONTAINER" bash -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/rp_before_after.sql'

echo ""
echo "-> Nachtragen ..."
docker exec "$PG_CONTAINER" bash -c \
  'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/rp_fix.sql'

echo ""
echo "-> Nachher:"
docker exec "$PG_CONTAINER" bash -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/rp_before_after.sql'

docker exec "$PG_CONTAINER" rm -f /tmp/rp_before_after.sql /tmp/rp_fix.sql

echo ""
echo "=============================================================="
echo " Fertig. Aenderungen wirken innerhalb von 60s (RBAC-Cache-TTL)"
echo " oder sofort nach einem Neustart des api-Containers."
echo "=============================================================="
