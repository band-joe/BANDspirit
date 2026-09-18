# -*- coding: utf-8 -*-
"""Generates: BANDspirit_Ubuntu_Installationsanleitung_V1.0.0.9.docx"""

from docx import Document
from docx.shared import Pt, RGBColor, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
import datetime

doc = Document()

# ── Brand colors ──
BAND_TEAL = RGBColor(0x3e, 0x8f, 0x88)
BAND_DARK = RGBColor(0x2a, 0x6b, 0x64)
BLACK = RGBColor(0x33, 0x33, 0x33)
GRAY = RGBColor(0x66, 0x66, 0x66)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_BG = 'F0F7F6'
WARN_BG = 'FFF8E1'
INFO_BG = 'E3F2FD'
CODE_BG = 'F5F5F5'
TEAL_BG = '3E8F88'

# ── Helpers ──
def set_cell_shading(cell, color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color}"/>')
    tcPr.append(shading)

def add_styled_para(text, style='Normal', bold=False, color=None, size=None, space_after=6, space_before=0, align=None):
    p = doc.add_paragraph(style=style)
    run = p.add_run(text)
    if bold:
        run.bold = True
    if color:
        run.font.color.rgb = color
    if size:
        run.font.size = Pt(size)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(space_before)
    if align:
        p.alignment = align
    return p

def add_heading_styled(text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.color.rgb = BAND_DARK if level <= 2 else BAND_TEAL
    return h

def add_code_block(code, title=None):
    if title:
        add_styled_para(title, bold=True, size=9, color=GRAY, space_after=2)
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
    cell = tbl.cell(0, 0)
    set_cell_shading(cell, CODE_BG)
    p = cell.paragraphs[0]
    run = p.add_run(code)
    run.font.name = 'Consolas'
    run.font.size = Pt(8.5)
    run.font.color.rgb = BLACK
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.space_before = Pt(0)
    doc.add_paragraph()  # spacer

def add_info_box(text, box_type='info'):
    bg = INFO_BG if box_type == 'info' else WARN_BG
    prefix = 'ℹ️ ' if box_type == 'info' else '⚠️ '
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
    cell = tbl.cell(0, 0)
    set_cell_shading(cell, bg)
    p = cell.paragraphs[0]
    run = p.add_run(prefix + text)
    run.font.size = Pt(9)
    run.font.color.rgb = BLACK
    doc.add_paragraph()

def add_table(headers, rows, col_widths=None):
    tbl = doc.add_table(rows=1 + len(rows), cols=len(headers))
    tbl.style = 'Table Grid'
    tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
    # Header
    for i, h in enumerate(headers):
        cell = tbl.rows[0].cells[i]
        set_cell_shading(cell, TEAL_BG)
        p = cell.paragraphs[0]
        run = p.add_run(h)
        run.bold = True
        run.font.color.rgb = WHITE
        run.font.size = Pt(9)
    # Rows
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = tbl.rows[ri + 1].cells[ci]
            p = cell.paragraphs[0]
            run = p.add_run(str(val))
            run.font.size = Pt(9)
            run.font.color.rgb = BLACK
            if ri % 2 == 1:
                set_cell_shading(cell, LIGHT_BG)
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in tbl.rows:
                row.cells[i].width = Cm(w)
    doc.add_paragraph()

def add_bullet(text, level=0, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    if bold_prefix:
        r = p.add_run(bold_prefix)
        r.bold = True
        r.font.size = Pt(10)
        r.font.color.rgb = BLACK
        r2 = p.add_run(text)
        r2.font.size = Pt(10)
        r2.font.color.rgb = BLACK
    else:
        run = p.add_run(text)
        run.font.size = Pt(10)
        run.font.color.rgb = BLACK
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.left_indent = Cm(1.5 + level * 0.8)

# ============================================================
# TITLE PAGE
# ============================================================
for _ in range(6):
    doc.add_paragraph()

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run('BANDspirit')
run.font.size = Pt(36)
run.font.color.rgb = BAND_TEAL
run.bold = True

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = subtitle.add_run('Installationsanleitung\nUbuntu Server')
run.font.size = Pt(22)
run.font.color.rgb = BAND_DARK

doc.add_paragraph()

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
for label, value in [
    ('Version: ', 'V.1.0.0.9'),
    ('Datum: ', datetime.date.today().strftime('%d.%m.%Y')),
    ('Klassifikation: ', 'Intern / Vertraulich'),
    ('Plattform: ', 'Ubuntu Server 22.04 / 24.04 LTS'),
]:
    run = meta.add_run(label)
    run.font.size = Pt(11)
    run.font.color.rgb = GRAY
    run = meta.add_run(value + '\n')
    run.font.size = Pt(11)
    run.font.color.rgb = BLACK
    run.bold = True

doc.add_page_break()

# ============================================================
# INHALTSVERZEICHNIS
# ============================================================
add_heading_styled('Inhaltsverzeichnis', 1)

toc_items = [
    ('1', 'Dokumentübersicht'),
    ('2', 'Voraussetzungen'),
    ('3', 'Server-Grundkonfiguration'),
    ('4', 'Docker & Docker Compose installieren'),
    ('5', 'Applikation bereitstellen'),
    ('6', 'Umgebungsvariablen konfigurieren'),
    ('7', 'Erster Start'),
    ('8', 'Datenbank initialisieren'),
    ('9', 'SSL/TLS mit Let\'s Encrypt'),
    ('10', 'Firewall (UFW)'),
    ('11', 'Monitoring & Logs'),
    ('12', 'Backup-Strategie'),
    ('13', 'Update & Deployment'),
    ('14', 'Troubleshooting'),
    ('15', 'Sicherheitshärtung'),
    ('A', 'Anhang: Vollständige Dateistruktur'),
    ('B', 'Anhang: Umgebungsvariablen-Referenz'),
    ('C', 'Anhang: Checkliste Erstinstallation'),
]

for nr, label in toc_items:
    p = doc.add_paragraph()
    run = p.add_run(f'{nr}. ' if nr.isdigit() else f'Anhang {nr}: ')
    run.bold = True
    run.font.size = Pt(11)
    run.font.color.rgb = BAND_TEAL
    run2 = p.add_run(label)
    run2.font.size = Pt(11)
    run2.font.color.rgb = BLACK
    p.paragraph_format.space_after = Pt(2)

doc.add_page_break()

# ============================================================
# 1. DOKUMENTÜBERSICHT
# ============================================================
add_heading_styled('1. Dokumentübersicht', 1)

add_styled_para(
    'Diese Anleitung beschreibt die vollständige Installation und Inbetriebnahme '
    'der BANDspirit-Applikation auf einem Ubuntu Server mittels Docker Compose. '
    'Die Infrastruktur umfasst vier Container-Services:',
    size=10
)

add_table(
    ['Service', 'Image', 'Aufgabe'],
    [
        ['Nginx', 'nginx:1.27-alpine', 'Reverse Proxy, SSL-Termination, Rate-Limiting, Gzip'],
        ['App', 'Multi-Stage Build', 'BANDspirit-Applikation (Node.js Standalone)'],
        ['PostgreSQL', 'postgres:16-alpine', 'Relationale Datenbank mit CH-Locale'],
        ['Redis', 'redis:7-alpine', 'Session-Cache, Rate-Limiting, AOF-Persistenz'],
    ],
    col_widths=[3, 4.5, 8]
)

add_styled_para(
    'Zielgruppe: System-Administratoren und DevOps-Ingenieure mit Linux- und Docker-Grundkenntnissen.',
    size=10, color=GRAY
)

# ============================================================
# 2. VORAUSSETZUNGEN
# ============================================================
add_heading_styled('2. Voraussetzungen', 1)

add_heading_styled('2.1 Hardware-Anforderungen', 2)
add_table(
    ['Ressource', 'Minimum', 'Empfohlen'],
    [
        ['CPU', '2 vCPU', '4 vCPU'],
        ['RAM', '4 GB', '8 GB'],
        ['Festplatte', '40 GB SSD', '80 GB SSD'],
        ['Netzwerk', '100 Mbit/s', '1 Gbit/s'],
    ],
    col_widths=[4, 4, 4]
)

add_heading_styled('2.2 Software-Anforderungen', 2)
add_table(
    ['Software', 'Version', 'Bemerkung'],
    [
        ['Ubuntu Server', '22.04 LTS oder 24.04 LTS', 'Frische Minimal-Installation'],
        ['Docker Engine', '>= 24.x', 'Wird in Kapitel 4 installiert'],
        ['Docker Compose', '>= 2.20', 'Plugin (docker compose)'],
        ['Git', '>= 2.x', 'Für Repository-Verwaltung'],
        ['curl / wget', 'Aktuell', 'Bereits in Ubuntu enthalten'],
    ],
    col_widths=[4, 4, 6]
)

add_heading_styled('2.3 Netzwerk-Anforderungen', 2)
add_table(
    ['Port', 'Protokoll', 'Richtung', 'Verwendung'],
    [
        ['22', 'TCP', 'Eingehend', 'SSH-Zugriff (Administration)'],
        ['80', 'TCP', 'Eingehend', 'HTTP (Redirect auf HTTPS)'],
        ['443', 'TCP', 'Eingehend', 'HTTPS (Applikation)'],
        ['5432', 'TCP', 'Nur intern', 'PostgreSQL (nur Docker-Netzwerk)'],
        ['6379', 'TCP', 'Nur intern', 'Redis (nur Docker-Netzwerk)'],
    ],
    col_widths=[2, 2.5, 3, 7]
)

add_info_box('PostgreSQL und Redis sind nur innerhalb des Docker-Netzwerks erreichbar und nicht von aussen zugänglich.')

# ============================================================
# 3. SERVER-GRUNDKONFIGURATION
# ============================================================
add_heading_styled('3. Server-Grundkonfiguration', 1)

add_heading_styled('3.1 System aktualisieren', 2)
add_code_block(
    'sudo apt update && sudo apt upgrade -y\n'
    'sudo apt install -y curl wget git gnupg2 ca-certificates lsb-release \\\n'
    '    software-properties-common unattended-upgrades apt-transport-https',
    'Terminal'
)

add_heading_styled('3.2 Benutzer anlegen (optional)', 2)
add_styled_para('Falls kein dedizierter Service-Benutzer existiert:', size=10)
add_code_block(
    '# Service-Benutzer anlegen\n'
    'sudo adduser --disabled-password --gecos "BANDspirit Service" bandspirit\n'
    'sudo usermod -aG sudo bandspirit\n'
    'sudo usermod -aG docker bandspirit  # nach Docker-Installation\n\n'
    '# Wechseln zum Benutzer\n'
    'su - bandspirit',
    'Terminal'
)

add_heading_styled('3.3 Zeitzone setzen', 2)
add_code_block(
    'sudo timedatectl set-timezone Europe/Zurich\n'
    'timedatectl status',
    'Terminal'
)

add_heading_styled('3.4 Hostname setzen', 2)
add_code_block(
    'sudo hostnamectl set-hostname bandspirit-prod\n'
    'echo "127.0.1.1  bandspirit-prod" | sudo tee -a /etc/hosts',
    'Terminal'
)

add_heading_styled('3.5 Automatische Sicherheits-Updates', 2)
add_code_block(
    'sudo dpkg-reconfigure -plow unattended-upgrades\n'
    '# Bestätigen: "Yes" für automatische Sicherheits-Updates',
    'Terminal'
)

# ============================================================
# 4. DOCKER & DOCKER COMPOSE
# ============================================================
add_heading_styled('4. Docker & Docker Compose installieren', 1)

add_heading_styled('4.1 Docker Engine installieren', 2)
add_code_block(
    '# Docker GPG-Schlüssel hinzufügen\n'
    'sudo install -m 0755 -d /etc/apt/keyrings\n'
    'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \\\n'
    '    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg\n'
    'sudo chmod a+r /etc/apt/keyrings/docker.gpg\n\n'
    '# Repository hinzufügen\n'
    'echo \\\n'
    '  "deb [arch=$(dpkg --print-architecture) '
    'signed-by=/etc/apt/keyrings/docker.gpg] \\\n'
    '  https://download.docker.com/linux/ubuntu \\\n'
    '  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \\\n'
    '  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null\n\n'
    '# Docker installieren\n'
    'sudo apt update\n'
    'sudo apt install -y docker-ce docker-ce-cli containerd.io \\\n'
    '    docker-buildx-plugin docker-compose-plugin',
    'Terminal'
)

add_heading_styled('4.2 Docker-Benutzerrechte', 2)
add_code_block(
    '# Aktuellen Benutzer zur Docker-Gruppe hinzufügen\n'
    'sudo usermod -aG docker $USER\n\n'
    '# Session neu laden (oder abmelden/anmelden)\n'
    'newgrp docker\n\n'
    '# Prüfen\n'
    'docker --version\n'
    'docker compose version',
    'Terminal'
)

add_heading_styled('4.3 Docker-Dienst konfigurieren', 2)
add_styled_para('Docker-Daemon-Konfiguration für Produktion:', size=10)
add_code_block(
    'sudo tee /etc/docker/daemon.json << \'EOF\'\n'
    '{\n'
    '  "log-driver": "json-file",\n'
    '  "log-opts": {\n'
    '    "max-size": "10m",\n'
    '    "max-file": "3"\n'
    '  },\n'
    '  "storage-driver": "overlay2",\n'
    '  "live-restore": true,\n'
    '  "default-address-pools": [\n'
    '    { "base": "172.17.0.0/16", "size": 24 }\n'
    '  ]\n'
    '}\n'
    'EOF\n\n'
    'sudo systemctl restart docker\n'
    'sudo systemctl enable docker',
    '/etc/docker/daemon.json'
)

add_info_box('live-restore: true ermöglicht Docker-Updates ohne Container-Neustart.')

# ============================================================
# 5. APPLIKATION BEREITSTELLEN
# ============================================================
add_heading_styled('5. Applikation bereitstellen', 1)

add_heading_styled('5.1 Projektverzeichnis anlegen', 2)
add_code_block(
    '# Verzeichnis anlegen\n'
    'sudo mkdir -p /opt/bandspirit\n'
    'sudo chown $USER:$USER /opt/bandspirit\n'
    'cd /opt/bandspirit',
    'Terminal'
)

add_heading_styled('5.2 Quellcode übertragen', 2)
add_styled_para('Variante A: Git-Repository klonen (empfohlen)', bold=True, size=10)
add_code_block(
    'git clone https://your-repo-url.git .\n'
    '# Oder von Azure DevOps:\n'
    'git clone https://dev.azure.com/ORG/PROJECT/_git/bandspirit .',
    'Terminal'
)

add_styled_para('Variante B: Manuell kopieren (SCP/SFTP)', bold=True, size=10)
add_code_block(
    '# Von lokalem Rechner:\n'
    'scp -r ./bandspirit/* user@server:/opt/bandspirit/',
    'Terminal (lokal)'
)

add_heading_styled('5.3 Dateistruktur prüfen', 2)
add_code_block(
    'ls -la /opt/bandspirit/\n'
    '# Erwartete Struktur:\n'
    '# ├── docker-compose.yml\n'
    '# ├── Dockerfile\n'
    '# ├── .dockerignore\n'
    '# ├── .env.docker.example\n'
    '# ├── docker/\n'
    '# │   ├── nginx/\n'
    '# │   │   ├── nginx.conf\n'
    '# │   │   ├── conf.d/\n'
    '# │   │   │   ├── default.conf\n'
    '# │   │   │   └── proxy-params.conf\n'
    '# │   │   └── ssl/\n'
    '# │   └── postgres/\n'
    '# │       └── init/\n'
    '# │           └── 01-extensions.sql\n'
    '# ├── prisma/\n'
    '# ├── app/\n'
    '# ├── components/\n'
    '# ├── lib/\n'
    '# ├── public/\n'
    '# └── package.json',
    'Terminal'
)

# ============================================================
# 6. UMGEBUNGSVARIABLEN KONFIGURIEREN
# ============================================================
add_heading_styled('6. Umgebungsvariablen konfigurieren', 1)

add_heading_styled('6.1 .env.docker erstellen', 2)
add_code_block(
    'cd /opt/bandspirit\n'
    'cp .env.docker.example .env.docker\n'
    'chmod 600 .env.docker  # Nur für Owner lesbar',
    'Terminal'
)

add_heading_styled('6.2 Pflicht-Variablen setzen', 2)
add_code_block(
    '# .env.docker bearbeiten\n'
    'nano .env.docker\n\n'
    '# ======= PFLICHT =======\n'
    'POSTGRES_USER=bandspirit\n'
    'POSTGRES_PASSWORD=<SICHERES_PASSWORT_GENERIEREN>\n'
    'POSTGRES_DB=bandspirit\n\n'
    'NEXTAUTH_URL=https://bandspirit.ihredomain.ch\n'
    'NEXTAUTH_SECRET=<SECRET_GENERIEREN>',
    '.env.docker'
)

add_info_box('Passwort und Secret generieren:\n'
    'openssl rand -base64 32    # für POSTGRES_PASSWORD\n'
    'openssl rand -base64 32    # für NEXTAUTH_SECRET')

add_heading_styled('6.3 Optionale Variablen', 2)
add_table(
    ['Variable', 'Beschreibung', 'Erforderlich'],
    [
        ['AWS_REGION', 'AWS-Region für S3-Speicher', 'Nur bei Datei-Upload'],
        ['AWS_ACCESS_KEY_ID', 'AWS-Zugriffsschlüssel', 'Nur bei Datei-Upload'],
        ['AWS_SECRET_ACCESS_KEY', 'AWS-Secret', 'Nur bei Datei-Upload'],
        ['AWS_BUCKET_NAME', 'S3-Bucket-Name', 'Nur bei Datei-Upload'],
        ['ABACUSAI_API_KEY', 'API-Schlüssel für LLM', 'Nur bei KI-Funktionen'],
        ['WEB_APP_ID', 'Webapp-ID für Benachrichtigungen', 'Nur bei E-Mail-Versand'],
    ],
    col_widths=[5, 6, 4]
)

add_info_box('Sicherheitshinweis: Die .env.docker-Datei sollte niemals in ein Git-Repository eingecheckt werden!', 'warning')

# ============================================================
# 7. ERSTER START
# ============================================================
add_heading_styled('7. Erster Start', 1)

add_heading_styled('7.1 Images bauen und starten', 2)
add_code_block(
    'cd /opt/bandspirit\n\n'
    '# Images bauen und Container starten\n'
    'docker compose --env-file .env.docker up -d --build\n\n'
    '# Build-Fortschritt verfolgen (erster Build dauert 3–5 Minuten)\n'
    'docker compose --env-file .env.docker logs -f app',
    'Terminal'
)

add_heading_styled('7.2 Status prüfen', 2)
add_code_block(
    '# Alle Container prüfen\n'
    'docker compose --env-file .env.docker ps\n\n'
    '# Erwartete Ausgabe:\n'
    '# NAME                  STATUS                   PORTS\n'
    '# bandspirit-nginx      Up (healthy)             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp\n'
    '# bandspirit-app        Up (healthy)             3000/tcp\n'
    '# bandspirit-postgres   Up (healthy)             0.0.0.0:5432->5432/tcp\n'
    '# bandspirit-redis      Up (healthy)             6379/tcp',
    'Terminal'
)

add_heading_styled('7.3 Health-Checks prüfen', 2)
add_code_block(
    '# Nginx (via externem Port)\n'
    'curl -s http://localhost/nginx-health\n'
    '# Erwartet: OK\n\n'
    '# App (direkt im Container)\n'
    'docker exec bandspirit-app wget -qO- http://localhost:3000/api/auth/providers\n'
    '# Erwartet: JSON mit Provider-Liste\n\n'
    '# PostgreSQL\n'
    'docker exec bandspirit-postgres pg_isready -U bandspirit\n'
    '# Erwartet: accepting connections\n\n'
    '# Redis\n'
    'docker exec bandspirit-redis redis-cli ping\n'
    '# Erwartet: PONG',
    'Terminal'
)

# ============================================================
# 8. DATENBANK INITIALISIEREN
# ============================================================
add_heading_styled('8. Datenbank initialisieren', 1)

add_heading_styled('8.1 Schema erstellen', 2)
add_code_block(
    '# Prisma-Schema auf die Datenbank anwenden\n'
    'docker compose --env-file .env.docker exec app \\\n'
    '    npx prisma db push\n\n'
    '# Prüfen ob Tabellen erstellt wurden\n'
    'docker exec bandspirit-postgres psql -U bandspirit -d bandspirit \\\n'
    '    -c "SELECT tablename FROM pg_tables WHERE schemaname=\'public\' ORDER BY tablename;"',
    'Terminal'
)

add_heading_styled('8.2 Seed-Daten laden', 2)
add_styled_para(
    'Die Seed-Daten erstellen den Admin-Benutzer und Grundkonfigurationen:',
    size=10
)
add_code_block(
    '# Seed-Daten einfügen\n'
    'docker compose --env-file .env.docker exec app \\\n'
    '    npx prisma db seed\n\n'
    '# Prüfen ob der Admin-Benutzer erstellt wurde\n'
    'docker exec bandspirit-postgres psql -U bandspirit -d bandspirit \\\n'
    '    -c "SELECT email, role, \\"isActive\\" FROM \\"User\\";"',
    'Terminal'
)

add_info_box('Nach dem Seed-Vorgang ist der Standard-Admin-Benutzer verfügbar. '
    'Die Zugangsdaten werden im Terminal angezeigt. Bitte nach dem ersten Login das Passwort ändern!')

add_heading_styled('8.3 Daten aus bestehendem System migrieren (optional)', 2)
add_styled_para(
    'Falls Daten aus einer bestehenden Umgebung migriert werden sollen:',
    size=10
)
add_code_block(
    '# Export von Quell-Datenbank\n'
    'pg_dump -h <QUELL_HOST> -U <QUELL_USER> -d <QUELL_DB> \\\n'
    '    --data-only --disable-triggers \\\n'
    '    > bandspirit_data_export.sql\n\n'
    '# Import in Docker-PostgreSQL\n'
    'cat bandspirit_data_export.sql | \\\n'
    '    docker exec -i bandspirit-postgres psql -U bandspirit -d bandspirit',
    'Terminal'
)

add_info_box('Bei Datenmigrationen zuerst das Schema erstellen (8.1), dann die Daten importieren. '
    'Den Seed-Schritt (8.2) überspringen wenn bereits Produktivdaten vorhanden sind.', 'warning')

# ============================================================
# 9. SSL/TLS MIT LET'S ENCRYPT
# ============================================================
add_heading_styled('9. SSL/TLS mit Let\'s Encrypt', 1)

add_heading_styled('9.1 Certbot installieren', 2)
add_code_block(
    'sudo apt install -y certbot',
    'Terminal'
)

add_heading_styled('9.2 Zertifikat anfordern', 2)
add_code_block(
    '# Container stoppen (Port 80 muss frei sein)\n'
    'docker compose --env-file .env.docker down\n\n'
    '# Zertifikat beantragen\n'
    'sudo certbot certonly --standalone \\\n'
    '    -d bandspirit.ihredomain.ch \\\n'
    '    --email admin@ihredomain.ch \\\n'
    '    --agree-tos \\\n'
    '    --no-eff-email\n\n'
    '# Zertifikat in Docker-Verzeichnis kopieren\n'
    'sudo cp /etc/letsencrypt/live/bandspirit.ihredomain.ch/fullchain.pem \\\n'
    '    /opt/bandspirit/docker/nginx/ssl/\n'
    'sudo cp /etc/letsencrypt/live/bandspirit.ihredomain.ch/privkey.pem \\\n'
    '    /opt/bandspirit/docker/nginx/ssl/\n'
    'sudo chown $USER:$USER /opt/bandspirit/docker/nginx/ssl/*.pem',
    'Terminal'
)

add_heading_styled('9.3 Nginx für HTTPS konfigurieren', 2)
add_styled_para(
    'Die Datei docker/nginx/conf.d/default.conf enthält einen vorbereiteten HTTPS-Block. '
    'Diesen aktivieren:',
    size=10
)
add_code_block(
    '# docker/nginx/conf.d/default.conf\n\n'
    '# HTTP → HTTPS Redirect\n'
    'server {\n'
    '    listen 80;\n'
    '    server_name bandspirit.ihredomain.ch;\n'
    '    return 301 https://$host$request_uri;\n'
    '}\n\n'
    '# HTTPS-Server\n'
    'server {\n'
    '    listen 443 ssl http2;\n'
    '    server_name bandspirit.ihredomain.ch;\n\n'
    '    ssl_certificate     /etc/nginx/ssl/fullchain.pem;\n'
    '    ssl_certificate_key /etc/nginx/ssl/privkey.pem;\n'
    '    ssl_protocols       TLSv1.2 TLSv1.3;\n'
    '    ssl_ciphers         HIGH:!aNULL:!MD5;\n'
    '    ssl_prefer_server_ciphers on;\n'
    '    ssl_session_cache   shared:SSL:10m;\n'
    '    ssl_session_timeout 1d;\n\n'
    '    # HSTS (erst nach erfolgreichem SSL-Test aktivieren)\n'
    '    add_header Strict-Transport-Security "max-age=63072000" always;\n\n'
    '    # ... Location-Blöcke wie im HTTP-Server ...\n'
    '    location / {\n'
    '        proxy_pass http://bandspirit_app;\n'
    '        include /etc/nginx/conf.d/proxy-params.conf;\n'
    '    }\n'
    '}',
    'docker/nginx/conf.d/default.conf'
)

add_heading_styled('9.4 Container neu starten', 2)
add_code_block(
    'docker compose --env-file .env.docker up -d\n\n'
    '# SSL-Verbindung testen\n'
    'curl -I https://bandspirit.ihredomain.ch',
    'Terminal'
)

add_heading_styled('9.5 Automatische Zertifikatserneuerung', 2)
add_code_block(
    '# Erneuerungsscript erstellen\n'
    'sudo tee /opt/bandspirit/renew-cert.sh << \'EOF\'\n'
    '#!/bin/bash\n'
    'cd /opt/bandspirit\n'
    'docker compose --env-file .env.docker stop nginx\n'
    'certbot renew --quiet\n'
    'cp /etc/letsencrypt/live/bandspirit.ihredomain.ch/fullchain.pem docker/nginx/ssl/\n'
    'cp /etc/letsencrypt/live/bandspirit.ihredomain.ch/privkey.pem docker/nginx/ssl/\n'
    'docker compose --env-file .env.docker start nginx\n'
    'EOF\n\n'
    'chmod +x /opt/bandspirit/renew-cert.sh\n\n'
    '# Cronjob für monatliche Erneuerung\n'
    'echo "0 3 1 * * /opt/bandspirit/renew-cert.sh >> /var/log/certbot-renew.log 2>&1" | \\\n'
    '    sudo tee -a /var/crontab/root',
    'Terminal'
)

# ============================================================
# 10. FIREWALL (UFW)
# ============================================================
add_heading_styled('10. Firewall (UFW)', 1)

add_code_block(
    '# UFW aktivieren\n'
    'sudo ufw default deny incoming\n'
    'sudo ufw default allow outgoing\n\n'
    '# SSH erlauben (WICHTIG: Vorher sicherstellen!)\n'
    'sudo ufw allow 22/tcp comment "SSH"\n\n'
    '# HTTP und HTTPS erlauben\n'
    'sudo ufw allow 80/tcp comment "HTTP"\n'
    'sudo ufw allow 443/tcp comment "HTTPS"\n\n'
    '# UFW aktivieren\n'
    'sudo ufw enable\n\n'
    '# Status prüfen\n'
    'sudo ufw status verbose',
    'Terminal'
)

add_info_box('WICHTIG: SSH (Port 22) unbedingt zuerst erlauben, bevor UFW aktiviert wird! '
    'Andernfalls wird der SSH-Zugang gesperrt.', 'warning')

add_styled_para(
    'PostgreSQL (5432) und Redis (6379) sollten NICHT öffentlich erreichbar sein. '
    'Diese Ports sind nur über das Docker-interne Netzwerk zugänglich.',
    size=10
)

# ============================================================
# 11. MONITORING & LOGS
# ============================================================
add_heading_styled('11. Monitoring & Logs', 1)

add_heading_styled('11.1 Container-Logs einsehen', 2)
add_code_block(
    '# Alle Services\n'
    'docker compose --env-file .env.docker logs\n\n'
    '# Einzelner Service (live)\n'
    'docker compose --env-file .env.docker logs -f app\n'
    'docker compose --env-file .env.docker logs -f nginx\n'
    'docker compose --env-file .env.docker logs -f postgres\n\n'
    '# Letzte 100 Zeilen\n'
    'docker compose --env-file .env.docker logs --tail=100 app',
    'Terminal'
)

add_heading_styled('11.2 Nginx Access-Logs', 2)
add_code_block(
    '# Access-Log\n'
    'docker exec bandspirit-nginx cat /var/log/nginx/access.log | tail -20\n\n'
    '# Error-Log\n'
    'docker exec bandspirit-nginx cat /var/log/nginx/error.log | tail -20',
    'Terminal'
)

add_heading_styled('11.3 Datenbank-Statistiken', 2)
add_code_block(
    '# Verbindungsanzahl\n'
    'docker exec bandspirit-postgres psql -U bandspirit -d bandspirit \\\n'
    '    -c "SELECT count(*) FROM pg_stat_activity;"\n\n'
    '# Tabellengrössen\n'
    'docker exec bandspirit-postgres psql -U bandspirit -d bandspirit \\\n'
    '    -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) \\\n'
    '        FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;"\n\n'
    '# Datenbank-Grösse\n'
    'docker exec bandspirit-postgres psql -U bandspirit -d bandspirit \\\n'
    '    -c "SELECT pg_size_pretty(pg_database_size(\'bandspirit\'));"',
    'Terminal'
)

add_heading_styled('11.4 Ressourcenüberwachung', 2)
add_code_block(
    '# Docker-Container Ressourcenverbrauch\n'
    'docker stats --no-stream\n\n'
    '# Festplattenverbrauch\n'
    'docker system df\n\n'
    '# Disk-Usage der Volumes\n'
    'docker volume ls\n'
    'sudo du -sh /var/lib/docker/volumes/bandspirit_*',
    'Terminal'
)

add_heading_styled('11.5 Einfaches Monitoring-Script', 2)
add_code_block(
    '#!/bin/bash\n'
    '# /opt/bandspirit/monitor.sh\n'
    '# Prüft ob alle Services laufen und sendet Warnung\n\n'
    'SERVICES=("bandspirit-nginx" "bandspirit-app" "bandspirit-postgres" "bandspirit-redis")\n\n'
    'for SVC in "${SERVICES[@]}"; do\n'
    '    STATUS=$(docker inspect --format="{{.State.Health.Status}}" $SVC 2>/dev/null)\n'
    '    if [ "$STATUS" != "healthy" ]; then\n'
    '        echo "[WARNUNG] $(date): $SVC ist $STATUS" >> /var/log/bandspirit-monitor.log\n'
    '        # Optional: E-Mail-Benachrichtigung\n'
    '        # mail -s "BANDspirit: $SVC $STATUS" admin@example.ch < /dev/null\n'
    '    fi\n'
    'done',
    '/opt/bandspirit/monitor.sh'
)

add_code_block(
    '# Cronjob: alle 5 Minuten prüfen\n'
    'chmod +x /opt/bandspirit/monitor.sh\n'
    'crontab -e\n'
    '# Zeile hinzufügen:\n'
    '*/5 * * * * /opt/bandspirit/monitor.sh',
    'Terminal'
)

# ============================================================
# 12. BACKUP-STRATEGIE
# ============================================================
add_heading_styled('12. Backup-Strategie', 1)

add_heading_styled('12.1 Datenbank-Backup', 2)
add_code_block(
    '#!/bin/bash\n'
    '# /opt/bandspirit/backup-db.sh\n\n'
    'BACKUP_DIR="/opt/bandspirit/backups/db"\n'
    'TIMESTAMP=$(date +%Y%m%d_%H%M%S)\n'
    'RETENTION_DAYS=30\n\n'
    'mkdir -p $BACKUP_DIR\n\n'
    '# pg_dump im Container ausführen\n'
    'docker exec bandspirit-postgres pg_dump \\\n'
    '    -U bandspirit \\\n'
    '    -d bandspirit \\\n'
    '    --format=custom \\\n'
    '    --compress=9 \\\n'
    '    > "$BACKUP_DIR/bandspirit_${TIMESTAMP}.dump"\n\n'
    '# Prüfen ob Backup erfolgreich\n'
    'if [ $? -eq 0 ]; then\n'
    '    echo "[OK] DB-Backup erstellt: bandspirit_${TIMESTAMP}.dump"\n'
    '    # Alte Backups löschen\n'
    '    find $BACKUP_DIR -name "*.dump" -mtime +$RETENTION_DAYS -delete\n'
    'else\n'
    '    echo "[FEHLER] DB-Backup fehlgeschlagen!"\n'
    '    exit 1\n'
    'fi',
    '/opt/bandspirit/backup-db.sh'
)

add_heading_styled('12.2 Redis-Backup', 2)
add_code_block(
    '# Redis-Snapshot manuell auslösen\n'
    'docker exec bandspirit-redis redis-cli BGSAVE\n\n'
    '# Snapshot-Datei kopieren\n'
    'docker cp bandspirit-redis:/data/appendonly.aof /opt/bandspirit/backups/redis/',
    'Terminal'
)

add_heading_styled('12.3 Automatische Backups (Cronjob)', 2)
add_code_block(
    'chmod +x /opt/bandspirit/backup-db.sh\n\n'
    '# Tägliches Backup um 02:00 Uhr\n'
    'crontab -e\n'
    '# Zeile hinzufügen:\n'
    '0 2 * * * /opt/bandspirit/backup-db.sh >> /var/log/bandspirit-backup.log 2>&1',
    'Terminal'
)

add_heading_styled('12.4 Backup wiederherstellen', 2)
add_code_block(
    '# Datenbank wiederherstellen\n'
    'docker exec -i bandspirit-postgres pg_restore \\\n'
    '    -U bandspirit \\\n'
    '    -d bandspirit \\\n'
    '    --clean --if-exists \\\n'
    '    < /opt/bandspirit/backups/db/bandspirit_YYYYMMDD_HHMMSS.dump',
    'Terminal'
)

add_info_box('Backups regelmässig testen! Mindestens einmal pro Quartal einen Restore auf einem Test-System durchführen.', 'warning')

# ============================================================
# 13. UPDATE & DEPLOYMENT
# ============================================================
add_heading_styled('13. Update & Deployment', 1)

add_heading_styled('13.1 Standard-Update-Ablauf', 2)
add_code_block(
    'cd /opt/bandspirit\n\n'
    '# 1. Backup erstellen (IMMER vor Update!)\n'
    './backup-db.sh\n\n'
    '# 2. Neuen Code holen\n'
    'git pull origin main\n\n'
    '# 3. Images neu bauen und Container ersetzen\n'
    'docker compose --env-file .env.docker up -d --build\n\n'
    '# 4. Datenbank-Schema aktualisieren (falls nötig)\n'
    'docker compose --env-file .env.docker exec app npx prisma db push\n\n'
    '# 5. Status prüfen\n'
    'docker compose --env-file .env.docker ps\n'
    'docker compose --env-file .env.docker logs --tail=50 app',
    'Terminal'
)

add_heading_styled('13.2 Zero-Downtime Update (optional)', 2)
add_styled_para(
    'Für Updates ohne Unterbrechung kann ein Blue-Green-Deployment-Ansatz verwendet werden:',
    size=10
)
add_code_block(
    '# 1. Neues Image bauen (ohne bestehende Container zu stoppen)\n'
    'docker compose --env-file .env.docker build app\n\n'
    '# 2. Nur den App-Container ersetzen (Nginx, DB, Redis laufen weiter)\n'
    'docker compose --env-file .env.docker up -d --no-deps app\n\n'
    '# 3. Health-Check abwarten\n'
    'sleep 30\n'
    'docker compose --env-file .env.docker ps',
    'Terminal'
)

add_heading_styled('13.3 Rollback', 2)
add_code_block(
    '# Zum vorherigen Git-Stand zurückkehren\n'
    'git log --oneline -5  # Commit-Hash finden\n'
    'git checkout <COMMIT_HASH>\n\n'
    '# Neu bauen\n'
    'docker compose --env-file .env.docker up -d --build\n\n'
    '# Falls DB-Schema-Rollback nötig:\n'
    'docker exec -i bandspirit-postgres pg_restore \\\n'
    '    -U bandspirit -d bandspirit --clean --if-exists \\\n'
    '    < /opt/bandspirit/backups/db/<LETZTES_BACKUP>.dump',
    'Terminal'
)

add_heading_styled('13.4 Docker-System aufräumen', 2)
add_code_block(
    '# Nicht mehr verwendete Images entfernen\n'
    'docker image prune -f\n\n'
    '# Vollständige Bereinigung (Vorsicht!)\n'
    'docker system prune -f --volumes  # Löscht auch ungenutzte Volumes!',
    'Terminal'
)

# ============================================================
# 14. TROUBLESHOOTING
# ============================================================
add_heading_styled('14. Troubleshooting', 1)

add_table(
    ['Problem', 'Ursache', 'Lösung'],
    [
        ['Container startet nicht', 'Port bereits belegt', 'sudo lsof -i :80 \u2014 Prozess beenden oder Port in .env.docker ändern'],
        ['App: 502 Bad Gateway', 'App-Container noch nicht ready', 'docker logs bandspirit-app \u2014 auf Fehler prüfen, 30s warten'],
        ['DB-Verbindung schlägt fehl', 'Falsches Passwort in .env.docker', 'POSTGRES_PASSWORD in .env.docker prüfen'],
        ['Permission denied (Docker)', 'User nicht in docker-Gruppe', 'sudo usermod -aG docker $USER && newgrp docker'],
        ['Out of Memory', 'Zu wenig RAM', 'Server auf mind. 4 GB RAM aufrüsten'],
        ['SSL-Zertifikat abgelaufen', 'Certbot-Cronjob fehlt', 'Kapitel 9.5: Automatische Erneuerung einrichten'],
        ['Langsame Responses', 'Hohe DB-Last', 'docker stats prüfen, ggf. shared_buffers in docker-compose.yml erhöhen'],
        ['Build schlägt fehl', 'Node-Module-Cache korrupt', 'docker builder prune && docker compose build --no-cache'],
        ['Prisma-Fehler', 'Schema nicht synchron', 'docker compose exec app npx prisma db push'],
        ['Redis-Fehler', 'Speicher voll', 'docker exec bandspirit-redis redis-cli INFO memory \u2014 maxmemory anpassen'],
    ],
    col_widths=[4, 4, 7.5]
)

add_heading_styled('14.1 Vollständiger Neustart', 2)
add_code_block(
    '# Alle Container stoppen und entfernen\n'
    'docker compose --env-file .env.docker down\n\n'
    '# Komplett neu aufbauen\n'
    'docker compose --env-file .env.docker up -d --build --force-recreate\n\n'
    '# WARNUNG: Volumes löschen = Datenverlust!\n'
    '# Nur im Notfall:\n'
    '# docker compose --env-file .env.docker down -v\n'
    '# docker compose --env-file .env.docker up -d --build',
    'Terminal'
)

# ============================================================
# 15. SICHERHEITSHÄRTUNG
# ============================================================
add_heading_styled('15. Sicherheitshärtung', 1)

add_heading_styled('15.1 SSH härten', 2)
add_code_block(
    '# /etc/ssh/sshd_config anpassen:\n'
    'sudo nano /etc/ssh/sshd_config\n\n'
    '# Empfohlene Einstellungen:\n'
    'PermitRootLogin no\n'
    'PasswordAuthentication no          # Nur SSH-Keys\n'
    'PubkeyAuthentication yes\n'
    'MaxAuthTries 3\n'
    'AllowUsers bandspirit              # Nur Service-User\n\n'
    'sudo systemctl restart ssh',
    '/etc/ssh/sshd_config'
)

add_heading_styled('15.2 Fail2Ban installieren', 2)
add_code_block(
    'sudo apt install -y fail2ban\n\n'
    'sudo tee /etc/fail2ban/jail.local << \'EOF\'\n'
    '[sshd]\n'
    'enabled = true\n'
    'port = 22\n'
    'filter = sshd\n'
    'logpath = /var/log/auth.log\n'
    'maxretry = 3\n'
    'bantime = 3600\n'
    'findtime = 600\n'
    'EOF\n\n'
    'sudo systemctl enable fail2ban\n'
    'sudo systemctl start fail2ban\n'
    'sudo fail2ban-client status sshd',
    'Terminal'
)

add_heading_styled('15.3 Docker-Sicherheit', 2)
add_bullet('Container laufen als Non-root User (nextjs:nodejs)', bold_prefix='Non-root: ')
add_bullet('Nur Nginx-Ports (80/443) sind öffentlich exponiert', bold_prefix='Minimale Ports: ')
add_bullet('PostgreSQL und Redis sind nur im Docker-Netzwerk erreichbar', bold_prefix='Interne Services: ')
add_bullet('Health-Checks überwachen alle Services automatisch', bold_prefix='Health-Checks: ')
add_bullet('.env.docker mit chmod 600 schützen', bold_prefix='Env-Datei: ')

add_heading_styled('15.4 Regelmässige Wartung', 2)
add_table(
    ['Aufgabe', 'Frequenz', 'Befehl / Aktion'],
    [
        ['Sicherheits-Updates', 'Täglich (automatisch)', 'unattended-upgrades'],
        ['Docker-Images aktualisieren', 'Monatlich', 'docker compose pull && docker compose up -d'],
        ['Datenbank-Backup prüfen', 'Wöchentlich', 'Backup-Log prüfen, Test-Restore'],
        ['SSL-Zertifikat prüfen', 'Monatlich', 'certbot certificates'],
        ['Festplattenplatz', 'Wöchentlich', 'df -h && docker system df'],
        ['Log-Rotation', 'Monatlich', 'docker system prune -f'],
        ['Fail2Ban-Status', 'Monatlich', 'sudo fail2ban-client status'],
    ],
    col_widths=[5, 3.5, 7]
)

# ============================================================
# ANHANG A: DATEISTRUKTUR
# ============================================================
doc.add_page_break()
add_heading_styled('Anhang A: Vollständige Dateistruktur', 1)

add_code_block(
    '/opt/bandspirit/\n'
    '├── docker-compose.yml          # Service-Orchestrierung\n'
    '├── Dockerfile                   # Multi-Stage Build\n'
    '├── .dockerignore                # Build-Ausschlüsse\n'
    '├── .env.docker                  # Umgebungsvariablen (nicht in Git!)\n'
    '├── .env.docker.example          # Vorlage für Umgebungsvariablen\n'
    '├── docker/\n'
    '│   ├── nginx/\n'
    '│   │   ├── nginx.conf              # Nginx-Hauptkonfiguration\n'
    '│   │   ├── conf.d/\n'
    '│   │   │   ├── default.conf        # Server-Block (HTTP/HTTPS)\n'
    '│   │   │   └── proxy-params.conf   # Proxy-Header\n'
    '│   │   └── ssl/\n'
    '│   │       ├── fullchain.pem       # SSL-Zertifikat\n'
    '│   │       └── privkey.pem         # SSL-Private Key\n'
    '│   └── postgres/\n'
    '│       └── init/\n'
    '│           └── 01-extensions.sql   # DB-Erweiterungen\n'
    '├── backups/\n'
    '│   ├── db/                          # Datenbank-Dumps\n'
    '│   └── redis/                       # Redis-Snapshots\n'
    '├── backup-db.sh                 # Backup-Script\n'
    '├── monitor.sh                   # Monitoring-Script\n'
    '├── renew-cert.sh                # SSL-Erneuerung\n'
    '├── app/                         # Applikations-Code\n'
    '├── components/                  # UI-Komponenten\n'
    '├── lib/                         # Hilfsbibliotheken\n'
    '├── prisma/                      # Datenbank-Schema\n'
    '└── public/                      # Statische Assets',
    'Dateistruktur'
)

# ============================================================
# ANHANG B: UMGEBUNGSVARIABLEN-REFERENZ
# ============================================================
add_heading_styled('Anhang B: Umgebungsvariablen-Referenz', 1)

add_table(
    ['Variable', 'Pflicht', 'Beschreibung', 'Beispielwert'],
    [
        ['POSTGRES_USER', 'Ja', 'Datenbank-Benutzer', 'bandspirit'],
        ['POSTGRES_PASSWORD', 'Ja', 'Datenbank-Passwort', '(generiert)'],
        ['POSTGRES_DB', 'Ja', 'Datenbank-Name', 'bandspirit'],
        ['POSTGRES_PORT', 'Nein', 'Externer DB-Port', '5432'],
        ['NEXTAUTH_URL', 'Ja', 'Öffentliche App-URL', 'https://bandspirit.ch'],
        ['NEXTAUTH_SECRET', 'Ja', 'Auth-Secret (32+ Zeichen)', '(generiert)'],
        ['NGINX_HTTP_PORT', 'Nein', 'HTTP-Port (Default: 80)', '80'],
        ['NGINX_HTTPS_PORT', 'Nein', 'HTTPS-Port (Default: 443)', '443'],
        ['AWS_REGION', 'Nein', 'AWS-Region', 'eu-central-1'],
        ['AWS_ACCESS_KEY_ID', 'Nein', 'AWS-Zugriffsschlüssel', 'AKIAIOSFODNN'],
        ['AWS_SECRET_ACCESS_KEY', 'Nein', 'AWS-Secret', '(secret)'],
        ['AWS_BUCKET_NAME', 'Nein', 'S3-Bucket', 'bandspirit-files'],
        ['ABACUSAI_API_KEY', 'Nein', 'LLM-API-Schlüssel', '(API Key)'],
        ['WEB_APP_ID', 'Nein', 'Benachrichtigungs-ID', '(App ID)'],
    ],
    col_widths=[4.5, 1.5, 5, 4]
)

# ============================================================
# ANHANG C: CHECKLISTE ERSTINSTALLATION
# ============================================================
doc.add_page_break()
add_heading_styled('Anhang C: Checkliste Erstinstallation', 1)

add_styled_para('Bitte alle Punkte der Reihe nach abarbeiten und abhaken:', size=10, space_after=10)

checklist = [
    ('Server-Grundkonfiguration', [
        'Ubuntu 22.04/24.04 LTS installiert',
        'System aktualisiert (apt update && apt upgrade)',
        'Zeitzone auf Europe/Zurich gesetzt',
        'Hostname gesetzt',
        'Automatische Sicherheits-Updates aktiviert',
    ]),
    ('Docker', [
        'Docker Engine installiert und getestet',
        'Docker Compose Plugin verfügbar',
        'Daemon-Konfiguration (daemon.json) erstellt',
        'Benutzer in docker-Gruppe',
    ]),
    ('Applikation', [
        'Quellcode auf Server übertragen',
        'Dateistruktur geprüft (docker-compose.yml vorhanden)',
        '.env.docker erstellt und konfiguriert',
        'Sichere Passwörter generiert',
    ]),
    ('Erster Start', [
        'docker compose up -d --build erfolgreich',
        'Alle 4 Container laufen (healthy)',
        'Datenbank-Schema erstellt (prisma db push)',
        'Seed-Daten geladen',
        'Login im Browser erfolgreich',
    ]),
    ('Sicherheit', [
        'SSL-Zertifikat installiert (Let\'s Encrypt)',
        'HTTPS-Redirect aktiv',
        'Firewall (UFW) konfiguriert',
        'SSH gehärtet (Key-only, kein Root)',
        'Fail2Ban aktiv',
        '.env.docker mit chmod 600 geschützt',
    ]),
    ('Betrieb', [
        'Backup-Cronjob eingerichtet',
        'Monitoring-Script aktiv',
        'SSL-Erneuerungs-Cronjob eingerichtet',
        'Dokumentation für Team erstellt',
    ]),
]

for section, items in checklist:
    add_styled_para(section, bold=True, size=11, color=BAND_TEAL, space_before=8, space_after=4)
    for item in items:
        p = doc.add_paragraph()
        run = p.add_run('☐  ')
        run.font.size = Pt(12)
        run = p.add_run(item)
        run.font.size = Pt(10)
        run.font.color.rgb = BLACK
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.left_indent = Cm(1)

# ============================================================
# FOOTER
# ============================================================
doc.add_paragraph()
doc.add_paragraph()
footer = doc.add_paragraph()
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = footer.add_run('BANDspirit — Installationsanleitung Ubuntu Server — V.1.0.0.9')
run.font.size = Pt(8)
run.font.color.rgb = GRAY

# ============================================================
# SAVE
# ============================================================
out_path = '/home/ubuntu/klientenmanagement/nextjs_space/docs/BANDspirit_Ubuntu_Installationsanleitung_V1.0.0.9.docx'
doc.save(out_path)
print(f'Dokument erstellt: {out_path}')
