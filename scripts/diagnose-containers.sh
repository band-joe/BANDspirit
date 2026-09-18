#!/usr/bin/env bash
# ==============================================================================
# BANDspirit – Container-Diagnose
# Prüft den Status aller Container und zeigt Logs von unhealthy Containern
# ==============================================================================
set -euo pipefail

echo "======================================================================"
echo " BANDspirit – Container-Diagnose"
echo "======================================================================"
echo ""

# 1. Container-Status
echo "1. Container-Status (alle):"
docker ps -a --filter name=bandspirit --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 2. Unhealthy Container identifizieren
echo "2. Unhealthy Container:"
UNHEALTHY=$(docker ps --filter "health=unhealthy" --filter name=bandspirit --format "{{.Names}}" || true)
if [ -z "$UNHEALTHY" ]; then
  echo "   ✓ Alle Container sind healthy!"
else
  echo "   ❌ Folgende Container sind unhealthy:"
  echo "   $UNHEALTHY"
fi
echo ""

# 3. nginx-Healthcheck manuell testen
echo "3. nginx-Healthcheck manuell testen (/nginx-health):"
if docker exec bandspirit-nginx wget --no-verbose --tries=1 --spider http://localhost:80/nginx-health 2>&1 | grep -q "200 OK"; then
  echo "   ✓ nginx-Healthcheck funktioniert (wget vorhanden)"
elif docker exec bandspirit-nginx sh -c "command -v curl" >/dev/null 2>&1; then
  if docker exec bandspirit-nginx curl -f http://localhost:80/nginx-health >/dev/null 2>&1; then
    echo "   ✓ nginx-Healthcheck funktioniert (curl)"
    echo "   ⚠️  ABER: docker-compose.yml verwendet wget, das fehlt!"
  else
    echo "   ❌ nginx-Healthcheck schlägt fehl (curl)"
  fi
else
  echo "   ❌ Weder wget noch curl im nginx-Container verfügbar!"
  echo "   → Healthcheck kann nicht durchgeführt werden."
fi
echo ""

# 4. API-Healthcheck testen
echo "4. API-Healthcheck (/health):"
if docker exec bandspirit-api curl -f http://localhost:8080/health >/dev/null 2>&1; then
  echo "   ✓ API-Healthcheck funktioniert"
else
  echo "   ❌ API-Healthcheck schlägt fehl"
  echo "   → Letzte API-Logs:"
  docker logs --tail 20 bandspirit-api 2>&1 | grep -iE "(error|exception|fail|health)" || echo "   (keine Fehler in den letzten 20 Zeilen)"
fi
echo ""

# 5. Frontend-Status
echo "5. Frontend-Status:"
if docker exec bandspirit-frontend sh -c "ps aux | grep -v grep | grep node" >/dev/null 2>&1; then
  echo "   ✓ Frontend-Prozess läuft"
else
  echo "   ❌ Frontend-Prozess läuft nicht"
fi
echo ""

# 6. Logs der unhealthy Container
if [ -n "$UNHEALTHY" ]; then
  echo "6. Logs der unhealthy Container (letzte 30 Zeilen):"
  for container in $UNHEALTHY; do
    echo ""
    echo "   ── $container ──"
    docker logs --tail 30 "$container" 2>&1 | sed 's/^/   /'
  done
else
  echo "6. Alle Container sind healthy – keine Logs nötig."
fi

echo ""
echo "======================================================================"
echo " Empfohlene Aktionen:"
echo "======================================================================"
echo "Falls nginx unhealthy (wegen fehlender wget):"
echo "  → docker-compose.yml anpassen: Healthcheck auf curl umstellen"
echo ""
echo "Falls API unhealthy:"
echo "  → docker logs bandspirit-api (Fehlerursache prüfen)"
echo "  → Datenbank-Verbindung prüfen (ConnectionString in .env)"
echo ""
echo "Falls Frontend unhealthy:"
echo "  → docker logs bandspirit-frontend"
echo "  → API_BASE_URL in .env prüfen"
echo "======================================================================"
