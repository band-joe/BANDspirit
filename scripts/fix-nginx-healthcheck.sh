#!/usr/bin/env bash
# ==============================================================================
# BANDspirit – nginx-Healthcheck reparieren
# Aktualisiert docker-compose.yml (wget → curl) und startet nginx neu
# ==============================================================================
set -euo pipefail

echo "======================================================================"
echo " BANDspirit – nginx-Healthcheck reparieren"
echo "======================================================================"
echo ""

# Prüfen, ob docker-compose.yml die alte wget-Version hat
if grep -q "wget.*nginx-health" docker-compose.yml 2>/dev/null; then
  echo "→ Fehlerhafte Healthcheck gefunden (wget statt curl)"
  echo "→ Aktualisiere docker-compose.yml ..."
  
  # Backup
  cp docker-compose.yml docker-compose.yml.backup-$(date +%Y%m%d_%H%M%S)
  
  # Ersetzen
  sed -i "s/test: \['CMD', 'wget', '--no-verbose', '--tries=1', '-O', '\/dev\/null', 'http:\/\/localhost:80\/nginx-health'\]/test: ['CMD', 'curl', '-f', 'http:\/\/localhost:80\/nginx-health']/" docker-compose.yml
  
  echo "  ✓ docker-compose.yml aktualisiert"
else
  echo "✓ docker-compose.yml verwendet bereits curl – keine Änderung nötig"
fi

echo ""
echo "→ Starte nginx-Container neu ..."
docker compose up -d --force-recreate nginx

echo ""
echo "→ Warte 10 Sekunden auf Healthcheck ..."
sleep 10

echo ""
echo "→ Container-Status:"
docker ps --filter name=bandspirit-nginx --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "======================================================================"
echo " ✓ nginx-Healthcheck repariert!"
echo ""
echo " Falls nginx immer noch unhealthy:"
echo "   1. docker logs bandspirit-nginx"
echo "   2. Prüfe, ob api-Container healthy ist (nginx wartet darauf)"
echo "   3. ./diagnose-containers.sh"
echo "======================================================================"
