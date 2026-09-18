#!/usr/bin/env bash
# ==============================================================================
# BANDspirit – Vollständiges Docker-Cleanup
# Stoppt und löscht ALLE BANDspirit-Container, Images, Volumes und Netzwerke
# ==============================================================================
set -euo pipefail

echo "======================================================================"
echo " BANDspirit – Docker Vollständiges Cleanup"
echo "======================================================================"
echo ""
echo "⚠️  WARNUNG: Dies löscht ALLE BANDspirit-Container, Images und Volumes!"
echo "   Alle Daten gehen verloren, wenn sie nicht anderweitig gesichert sind."
echo ""
read -p "Wirklich fortfahren? (ja/nein): " confirm
if [ "$confirm" != "ja" ]; then
  echo "Abgebrochen."
  exit 0
fi
echo ""

# 1. Container stoppen und entfernen
echo "1. Stoppe und entferne alle bandspirit-Container..."
CONTAINERS=$(docker ps -aq --filter "name=bandspirit" 2>/dev/null || true)
if [ -n "$CONTAINERS" ]; then
  echo "   Gefunden: $(echo "$CONTAINERS" | wc -l) Container"
  docker stop $CONTAINERS 2>/dev/null || true
  docker rm -f $CONTAINERS 2>/dev/null || true
  echo "   ✓ Container entfernt"
else
  echo "   → Keine bandspirit-Container gefunden"
fi
echo ""

# 2. Images löschen
echo "2. Lösche alle bandspirit-Images..."
IMAGES=$(docker images --filter "reference=*bandspirit*" -q 2>/dev/null || true)
if [ -n "$IMAGES" ]; then
  echo "   Gefunden: $(echo "$IMAGES" | wc -l) Images"
  docker rmi -f $IMAGES 2>/dev/null || true
  echo "   ✓ Images entfernt"
else
  echo "   → Keine bandspirit-Images gefunden"
fi
echo ""

# 3. Volumes löschen
echo "3. Lösche alle bandspirit-Volumes..."
VOLUMES=$(docker volume ls --filter "name=bandspirit" -q 2>/dev/null || true)
if [ -n "$VOLUMES" ]; then
  echo "   Gefunden: $(echo "$VOLUMES" | wc -l) Volumes"
  docker volume rm -f $VOLUMES 2>/dev/null || true
  echo "   ✓ Volumes entfernt"
else
  echo "   → Keine bandspirit-Volumes gefunden"
fi
echo ""

# 4. Netzwerk löschen
echo "4. Lösche bandspirit-Netzwerk..."
NETWORK=$(docker network ls --filter "name=bandspirit" -q 2>/dev/null || true)
if [ -n "$NETWORK" ]; then
  docker network rm $NETWORK 2>/dev/null || true
  echo "   ✓ Netzwerk entfernt"
else
  echo "   → Kein bandspirit-Netzwerk gefunden"
fi
echo ""

# 5. Prüfung
echo "5. Prüfe verbleibende bandspirit-Ressourcen..."
REMAINING_C=$(docker ps -aq --filter "name=bandspirit" 2>/dev/null | wc -l)
REMAINING_I=$(docker images --filter "reference=*bandspirit*" -q 2>/dev/null | wc -l)
REMAINING_V=$(docker volume ls --filter "name=bandspirit" -q 2>/dev/null | wc -l)
REMAINING_N=$(docker network ls --filter "name=bandspirit" -q 2>/dev/null | wc -l)

if [ $REMAINING_C -eq 0 ] && [ $REMAINING_I -eq 0 ] && [ $REMAINING_V -eq 0 ] && [ $REMAINING_N -eq 0 ]; then
  echo "   ✓ Alle bandspirit-Ressourcen erfolgreich entfernt!"
else
  echo "   ⚠️  Einige Ressourcen konnten nicht entfernt werden:"
  [ $REMAINING_C -gt 0 ] && echo "      - Container: $REMAINING_C"
  [ $REMAINING_I -gt 0 ] && echo "      - Images: $REMAINING_I"
  [ $REMAINING_V -gt 0 ] && echo "      - Volumes: $REMAINING_V"
  [ $REMAINING_N -gt 0 ] && echo "      - Netzwerke: $REMAINING_N"
fi

echo ""
echo "======================================================================"
echo " Cleanup abgeschlossen."
echo ""
echo " Nächste Schritte:"
echo "   1. cd /opt/bandspirit"
echo "   2. docker compose up -d --build"
echo "======================================================================"
