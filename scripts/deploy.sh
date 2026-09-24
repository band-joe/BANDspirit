#!/usr/bin/env bash
# ==============================================================================
# BANDspirit – Deploy-Script (Betriebssystem, z. B. Proxmox-VM)
# ------------------------------------------------------------------------------
# Holt den aktuellen Stand von "main" aus dem GitLab und baut/startet den
# Docker-Stack neu. Auf dem Betriebssystem wird NICHT entwickelt: Änderungen
# kommen ausschliesslich über GitLab-Merge-Requests nach "main".
#
# Ablauf:
#   1. Vorabprüfungen (Branch main, keine lokalen Änderungen, .env vorhanden
#      und nicht von Git verfolgt)
#   2. Optional: Backup über scripts/backup.sh (--backup)
#   3. git fetch + Fast-Forward auf origin/main (kein Merge, kein Force)
#   4. docker compose up -d --build, danach Warten auf den Health-Check der API
#      (Datenbank-Migrationen laufen beim API-Start automatisch)
#   5. Hinweis, falls mit dem Update Skripte unter scripts/ oder migration/
#      geändert wurden (z. B. fix-role-permissions.sh) - diese werden NICHT
#      automatisch ausgeführt.
#
# ------------------------------------------------------------------------------
# Aufruf (aus einem beliebigen Verzeichnis):
#   ./scripts/deploy.sh             # Update holen und deployen
#   ./scripts/deploy.sh --backup    # vorher Backup erstellen
#   ./scripts/deploy.sh --build     # neu bauen, auch wenn kein Update vorliegt
#
# Voraussetzungen (einmalig, siehe README):
#   - gitlab.bi-infra.band.local ist per DNS bzw. /etc/hosts auflösbar
#   - SSH-Deploy-Key (nur lesend) ist im GitLab-Projekt hinterlegt
#   - "origin" zeigt auf git@gitlab.bi-infra.band.local:bi-inf/apps/bandspirit/bandspirit.git
# ==============================================================================
set -euo pipefail

BRANCH="main"
API_CONTAINER="${API_CONTAINER:-bandspirit-api}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"

MIT_BACKUP=false
IMMER_BAUEN=false
for arg in "$@"; do
  case "$arg" in
    --backup) MIT_BACKUP=true ;;
    --build)  IMMER_BAUEN=true ;;
    -h|--help)
      sed -n '2,/^# =====.*$/p' "$0" | sed -n '2,$p' | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *)
      echo "FEHLER: Unbekannte Option '$arg' (erlaubt: --backup, --build, --help)."
      exit 1 ;;
  esac
done

cd "$(dirname "$0")/.."

fehler() { echo ""; echo "FEHLER: $*"; exit 1; }

echo "=============================================================="
echo " BANDspirit – Deploy"
echo " Verzeichnis: $(pwd)"
echo "=============================================================="
echo ""

# ── 1. Vorabprüfungen ────────────────────────────────────────────────────────
command -v git >/dev/null 2>&1    || fehler "git nicht gefunden."
command -v docker >/dev/null 2>&1 || fehler "docker nicht gefunden."

AKTUELLER_BRANCH="$(git branch --show-current)"
[ "$AKTUELLER_BRANCH" = "$BRANCH" ] || fehler "Aktueller Branch ist '$AKTUELLER_BRANCH', erwartet '$BRANCH'.
       Wechseln mit: git switch $BRANCH"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  git status --short --untracked-files=no
  fehler "Es gibt lokale Änderungen an versionierten Dateien (siehe oben).
       Auf diesem System wird nicht entwickelt - Änderungen bitte über GitLab
       einbringen. Verwerfen mit: git restore <datei>"
fi

[ -f .env ] || fehler ".env fehlt. Ohne .env startet der Stack nicht."

if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  fehler ".env wird noch von Git verfolgt. Ein Update würde sie löschen.
       Einmalig ausführen: git rm --cached .env .env.bak"
fi

# ── 2. Optionales Backup ─────────────────────────────────────────────────────
if [ "$MIT_BACKUP" = true ]; then
  echo "-> Backup ..."
  ./scripts/backup.sh
  echo ""
fi

# ── 3. Update holen (nur Fast-Forward) ───────────────────────────────────────
echo "-> Hole origin/$BRANCH ..."
git fetch --quiet origin "$BRANCH" \
  || fehler "git fetch fehlgeschlagen. GitLab erreichbar? Test: ssh -T git@gitlab.bi-infra.band.local"

ALT="$(git rev-parse HEAD)"
NEU="$(git rev-parse "origin/$BRANCH")"

if [ "$ALT" = "$NEU" ]; then
  echo "   Bereits aktuell ($(git log --oneline -1 HEAD))."
  if [ "$IMMER_BAUEN" = false ]; then
    echo ""
    echo "Nichts zu tun. Mit --build trotzdem neu bauen."
    exit 0
  fi
else
  if ! git merge-base --is-ancestor "$ALT" "$NEU"; then
    fehler "Lokaler Stand ist kein Vorgänger von origin/$BRANCH (History wurde
       umgeschrieben oder lokal committet). Kein automatisches Update.
       Prüfen mit: git log --oneline --graph HEAD origin/$BRANCH"
  fi
  echo "   Neue Commits:"
  git log --oneline "$ALT..$NEU" | sed 's/^/     /'
  git merge --quiet --ff-only "origin/$BRANCH"
  echo "   Aktualisiert auf $(git log --oneline -1 HEAD)."
fi
echo ""

# ── 4. Stack neu bauen und starten ───────────────────────────────────────────
echo "-> docker compose up -d --build ..."
docker compose up -d --build
echo ""

echo "-> Warte auf API (max. ${HEALTH_TIMEOUT}s) ..."
START=$(date +%s)
while true; do
  STATUS="$(docker inspect -f '{{.State.Health.Status}}' "$API_CONTAINER" 2>/dev/null || echo "unbekannt")"
  [ "$STATUS" = "healthy" ] && { echo "   API ist bereit."; break; }
  if [ $(( $(date +%s) - START )) -ge "$HEALTH_TIMEOUT" ]; then
    fehler "API nach ${HEALTH_TIMEOUT}s nicht bereit (Status: $STATUS).
       Logs ansehen mit: docker compose logs --tail=100 api"
  fi
  sleep 3
done
echo ""

# ── 5. Hinweis auf geänderte Skripte ─────────────────────────────────────────
if [ "$ALT" != "$NEU" ]; then
  SKRIPTE="$(git diff --name-only "$ALT" "$NEU" -- scripts/ migration/ | grep -v '^scripts/deploy.sh$' || true)"
  if [ -n "$SKRIPTE" ]; then
    echo "!! Mit diesem Update wurden Skripte geändert:"
    echo "$SKRIPTE" | sed 's/^/     /'
    echo "   Prüfen, ob eines davon ausgeführt werden muss (z. B."
    echo "   ./scripts/fix-role-permissions.sh nach Berechtigungsänderungen)."
    echo ""
  fi
fi

echo "=============================================================="
echo " Deploy abgeschlossen: $(git log --oneline -1 HEAD)"
echo "=============================================================="
