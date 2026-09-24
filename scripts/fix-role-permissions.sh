#!/usr/bin/env bash
# ==============================================================================
# BANDspirit – RolePermissions nachtragen/bereinigen (Spannungen, Tickets,
#              Kreisrollen, BI-Guide, BI-Kompass)
# ------------------------------------------------------------------------------
# RolePermissionSeeder.cs befüllt die Tabelle "RolePermissions" nur beim
# allerersten Start (leere Tabelle) - auf bereits laufenden Installationen
# wirken spätere Änderungen am Seeder NICHT rückwirkend. Dieses Skript trägt
# fehlende Zeilen direkt nach und entfernt nicht mehr vorgesehene
# BI-Guide-Rechte - idempotent (mehrfach ausführbar) und ohne Zugangsdaten im
# Skript (nutzt die Container-eigenen Umgebungsvariablen).
#
# Fachlicher Hintergrund (siehe Commits 1c2395b/29e8bb2 im Branch
# "berechtigungen" sowie der Ticket-Read-Fix hier im selben Branch):
#   - Jede Rolle soll Spannungen erfassen UND anschauen können
#     (org:driver:create + org:driver:read).
#   - Jede Rolle soll Tickets erstellen UND anschauen können
#     (ticket:create + ticket:read). Ohne ticket:read kann eine Rolle zwar
#     Tickets anlegen, aber weder die eigenen Tickets noch die globale Suche
#     (Hilfe & Support -> Suche) nutzen, da diese SupportTickets per OData
#     abfragt.
#   Betrifft die Basisrollen "User", "BiGuideAdmin", "Metriker" - "Admin" und
#   "CircleAdmin" hatten diese Berechtigungen bereits.
#
# Ergänzt im Branch "berechtigungen-bi-guide-kreisrollen":
#   - CircleAdmin bewirtschaftet Kreisrollen (org:role:read/create/update/
#     assign/unassign).
#   - BI-Guide sieht und verwaltet nur BiGuideAdmin (und Admin):
#     biguide:read/manage wird bei allen anderen Rollen ENTFERNT.
#   - BI-Kompass: neue Berechtigungen bikompass:read (alle Rollen) und
#     bikompass:manage (nur BiGuideAdmin und Admin).
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
echo " BANDspirit – RolePermissions nachtragen/bereinigen"
echo " Container: $PG_CONTAINER"
echo "=============================================================="
echo ""

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# ── SQL-Skripte lokal vorbereiten ────────────────────────────────────────────
cat > "$TMP_DIR/before_after.sql" <<'EOF'
SELECT "Role", string_agg("Permission", ', ' ORDER BY "Permission") AS "Permissions"
FROM "RolePermissions"
WHERE "Permission" IN ('org:driver:read','org:driver:create','ticket:create','ticket:read')
   OR "Permission" LIKE 'org:role:%'
   OR "Permission" LIKE 'biguide:%'
   OR "Permission" LIKE 'bikompass:%'
GROUP BY "Role"
ORDER BY "Role";
EOF

cat > "$TMP_DIR/fix.sql" <<'EOF'
BEGIN;

INSERT INTO "RolePermissions" ("Id","Role","Permission","RoleId","CreatedAt","UpdatedAt")
SELECT gen_random_uuid(), v.role, v.permission, br."Id", now(), now()
FROM (VALUES
  ('User',         'org:driver:create'),
  ('User',         'ticket:read'),
  ('BiGuideAdmin', 'org:driver:read'),
  ('BiGuideAdmin', 'org:driver:create'),
  ('BiGuideAdmin', 'ticket:create'),
  ('BiGuideAdmin', 'ticket:read'),
  ('Metriker',     'org:driver:read'),
  ('Metriker',     'org:driver:create'),
  ('Metriker',     'ticket:create'),
  ('Metriker',     'ticket:read')
) AS v(role, permission)
LEFT JOIN "BenutzerRollen" br ON br."Name" = v.role
ON CONFLICT ("Role", "Permission") DO NOTHING;

-- Kreisrollen, BI-Guide, BI-Kompass (nur für Rollen, die auf dem System existieren)
INSERT INTO "RolePermissions" ("Id","Role","Permission","RoleId","CreatedAt","UpdatedAt")
SELECT gen_random_uuid(), v.role, v.permission, br."Id", now(), now()
FROM (VALUES
  ('CircleAdmin',  'org:role:read'),
  ('CircleAdmin',  'org:role:create'),
  ('CircleAdmin',  'org:role:update'),
  ('CircleAdmin',  'org:role:assign'),
  ('CircleAdmin',  'org:role:unassign'),
  ('Admin',        'biguide:read'),
  ('Admin',        'biguide:manage'),
  ('BiGuideAdmin', 'biguide:read'),
  ('BiGuideAdmin', 'biguide:manage'),
  ('Admin',        'bikompass:read'),
  ('Admin',        'bikompass:manage'),
  ('BiGuideAdmin', 'bikompass:read'),
  ('BiGuideAdmin', 'bikompass:manage'),
  ('User',         'bikompass:read'),
  ('CircleAdmin',  'bikompass:read'),
  ('Metriker',     'bikompass:read')
) AS v(role, permission)
JOIN "BenutzerRollen" br ON br."Name" = v.role
ON CONFLICT ("Role", "Permission") DO NOTHING;

-- BI-Guide ist BiGuideAdmin (und Admin) vorbehalten
DELETE FROM "RolePermissions"
WHERE "Permission" IN ('biguide:read','biguide:manage')
  AND "Role" NOT IN ('Admin','BiGuideAdmin');

COMMIT;
EOF

# ── Ins Container kopieren ───────────────────────────────────────────────────
docker cp "$TMP_DIR/before_after.sql" "$PG_CONTAINER:/tmp/rp_before_after.sql" >/dev/null
docker cp "$TMP_DIR/fix.sql" "$PG_CONTAINER:/tmp/rp_fix.sql" >/dev/null

echo "-> Vorher:"
docker exec "$PG_CONTAINER" bash -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /tmp/rp_before_after.sql'

echo ""
echo "-> Nachtragen/Bereinigen ..."
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
