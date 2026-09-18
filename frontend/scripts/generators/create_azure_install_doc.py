# -*- coding: utf-8 -*-
"""Generates: BANDspirit_Azure_Installationsanleitung_V1.0.0.8.docx"""

from docx import Document
from docx.shared import Pt, RGBColor, Cm, Inches, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
import datetime

doc = Document()

# ── Brand colors ──
BAND_TEAL = RGBColor(0x3e, 0x8f, 0x88)
BAND_DARK = RGBColor(0x2a, 0x6b, 0x64)
BAND_ACCENT = RGBColor(0x0d, 0x47, 0xa1)
BLACK = RGBColor(0x33, 0x33, 0x33)
GRAY = RGBColor(0x66, 0x66, 0x66)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)

# ── Page setup ──
section = doc.sections[0]
section.top_margin = Cm(2.5)
section.bottom_margin = Cm(2)
section.left_margin = Cm(2.5)
section.right_margin = Cm(2.5)

# ── Styles ──
def make_style(name, size, bold=False, color=BAND_TEAL, align=None, space_before=0, space_after=6):
    s = doc.styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)
    s.font.name = 'Calibri'
    s.font.size = Pt(size)
    s.font.bold = bold
    s.font.color.rgb = color
    s.paragraph_format.space_before = Pt(space_before)
    s.paragraph_format.space_after = Pt(space_after)
    if align:
        s.paragraph_format.alignment = align
    return s

style_title = make_style('DocTitle', 28, True, BAND_TEAL, WD_ALIGN_PARAGRAPH.CENTER, 0, 4)
style_subtitle = make_style('DocSubtitle', 14, False, BAND_DARK, WD_ALIGN_PARAGRAPH.CENTER, 0, 4)
style_section = make_style('SectionHead', 16, True, BAND_TEAL, space_before=20, space_after=8)
style_subsection = make_style('SubSectionHead', 13, True, BAND_DARK, space_before=14, space_after=6)
style_subsubsection = make_style('SubSubSectionHead', 11.5, True, BAND_ACCENT, space_before=10, space_after=4)

style_body = doc.styles['Normal']
style_body.font.name = 'Calibri'
style_body.font.size = Pt(10.5)
style_body.font.color.rgb = BLACK
style_body.paragraph_format.space_after = Pt(5)
style_body.paragraph_format.line_spacing = Pt(15)

# Code style
style_code = doc.styles.add_style('CodeBlock', WD_STYLE_TYPE.PARAGRAPH)
style_code.font.name = 'Consolas'
style_code.font.size = Pt(8.5)
style_code.font.color.rgb = RGBColor(0x1a, 0x1a, 0x1a)
style_code.paragraph_format.space_before = Pt(2)
style_code.paragraph_format.space_after = Pt(2)
style_code.paragraph_format.line_spacing = Pt(12)

# ── Helpers ──
def add_bullet(text, bold_prefix=None, level=0):
    style_name = 'List Bullet' + (' 2' if level == 1 else ' 3' if level == 2 else '')
    p = doc.add_paragraph(style=style_name)
    if bold_prefix:
        r = p.add_run(bold_prefix)
        r.bold = True
        r.font.size = Pt(10.5)
        p.add_run(f' {text}').font.size = Pt(10.5)
    else:
        p.add_run(text).font.size = Pt(10.5)
    return p

def add_code(lines, title=None):
    if title:
        p = doc.add_paragraph()
        r = p.add_run(title)
        r.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = GRAY
        p.paragraph_format.space_after = Pt(2)
    for line in lines:
        p = doc.add_paragraph(style='CodeBlock')
        p.add_run(line)
        # Gray background shading
        pPr = p._element.get_or_add_pPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:val="clear" w:color="auto" w:fill="F5F5F5"/>')
        pPr.append(shd)

def add_info_box(text, box_type='info'):
    colors = {'info': 'D6EAF8', 'warning': 'FEF9E7', 'success': 'D5F5E3'}
    icons = {'info': 'ℹ️', 'warning': '⚠️', 'success': '✅'}
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.text = ''
    p = cell.paragraphs[0]
    r = p.add_run(f'{icons.get(box_type, "")} {text}')
    r.font.size = Pt(9.5)
    r.font.name = 'Calibri'
    # Shading
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:val="clear" w:color="auto" w:fill="{colors.get(box_type, "D6EAF8")}"/>')
    tcPr.append(shd)

def add_table(headers, rows):
    tbl = doc.add_table(rows=1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.style = 'Table Grid'
    # Header row
    for i, h in enumerate(headers):
        cell = tbl.rows[0].cells[i]
        cell.text = ''
        r = cell.paragraphs[0].add_run(h)
        r.bold = True
        r.font.size = Pt(9)
        r.font.name = 'Calibri'
        r.font.color.rgb = WHITE
        # Teal background
        tc = cell._tc
        tcPr = tc.get_or_add_tcPr()
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:val="clear" w:color="auto" w:fill="3E8F88"/>')
        tcPr.append(shd)
    # Data rows
    for row_data in rows:
        row = tbl.add_row()
        for i, text in enumerate(row_data):
            cell = row.cells[i]
            cell.text = ''
            r = cell.paragraphs[0].add_run(str(text))
            r.font.size = Pt(9)
            r.font.name = 'Calibri'
    return tbl

def add_numbered_list(items):
    for item in items:
        p = doc.add_paragraph(style='List Number')
        if isinstance(item, tuple):
            r = p.add_run(item[0])
            r.bold = True
            r.font.size = Pt(10.5)
            p.add_run(f' — {item[1]}').font.size = Pt(10.5)
        else:
            p.add_run(item).font.size = Pt(10.5)

def page_break():
    doc.add_page_break()

# ══════════════════════════════════════════════════════════════
#  TITELSEITE
# ══════════════════════════════════════════════════════════════

for _ in range(6):
    doc.add_paragraph()

p = doc.add_paragraph(style='DocTitle')
p.add_run('BANDspirit')

p = doc.add_paragraph(style='DocSubtitle')
p.add_run('Installationsanleitung für die Produktivsetzung')
p.paragraph_format.space_after = Pt(2)

p = doc.add_paragraph(style='DocSubtitle')
r = p.add_run('Azure DevOps Umgebung')
r.font.size = Pt(12)
p.paragraph_format.space_after = Pt(20)

# Horizontal line
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(4)
p.paragraph_format.space_after = Pt(4)
pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="8" w:space="1" w:color="3E8F88"/></w:pBdr>')
p._element.get_or_add_pPr().append(pBdr)

meta_data = [
    ('Dokument:', 'Installationsanleitung Azure DevOps'),
    ('Version:', 'V.1.0.0.8'),
    ('Datum:', datetime.date.today().strftime('%d.%m.%Y')),
    ('Klassifikation:', 'Vertraulich — Nur für autorisiertes Personal'),
    ('Zielgruppe:', 'IT-Administration, DevOps, Projektleitung'),
]

tbl = doc.add_table(rows=len(meta_data), cols=2)
tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
for i, (label, val) in enumerate(meta_data):
    c0 = tbl.rows[i].cells[0]
    c0.text = ''
    r = c0.paragraphs[0].add_run(label)
    r.bold = True
    r.font.size = Pt(10)
    r.font.name = 'Calibri'
    r.font.color.rgb = BAND_DARK
    c1 = tbl.rows[i].cells[1]
    c1.text = ''
    r = c1.paragraphs[0].add_run(val)
    r.font.size = Pt(10)
    r.font.name = 'Calibri'

page_break()

# ══════════════════════════════════════════════════════════════
#  INHALTSVERZEICHNIS
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('Inhaltsverzeichnis', style='SectionHead')

toc_items = [
    '1. Dokumentübersicht',
    '2. Voraussetzungen',
    '   2.1 Azure-Abonnement & Berechtigungen',
    '   2.2 Lokale Werkzeuge',
    '   2.3 Quellsystem-Informationen',
    '3. Zielarchitektur Azure',
    '   3.1 Architektur-Übersicht',
    '   3.2 Umgebungskonzept (DEV / PREPROD / PROD)',
    '   3.3 Komponentenübersicht',
    '4. Azure-Infrastruktur aufsetzen',
    '   4.1 Resource Groups',
    '   4.2 Azure Database for PostgreSQL',
    '   4.3 Azure App Service',
    '   4.4 Azure Blob Storage',
    '   4.5 Azure Key Vault',
    '   4.6 Application Insights',
    '   4.7 Azure DNS / Custom Domain',
    '5. Azure DevOps — Repository & Branching',
    '   5.1 Projekt erstellen',
    '   5.2 Branching-Strategie',
    '   5.3 Repository initialisieren',
    '   5.4 Branch Policies',
    '6. CI/CD Pipeline (YAML)',
    '   6.1 Pipeline-Datei (azure-pipelines.yml)',
    '   6.2 Build-Stage',
    '   6.3 Deploy-Stages (DEV / PREPROD / PROD)',
    '   6.4 Freigabe-Gates & Approvals',
    '   6.5 Service Connection',
    '   6.6 Prisma-Migration im Deploy',
    '7. Azure Entra ID — SSO-Anbindung',
    '   7.1 App Registration erstellen',
    '   7.2 API-Berechtigungen & Consent',
    '   7.3 Gruppen-Claim (Rollen-Mapping)',
    '   7.4 NextAuth.js — Azure AD Provider',
    '   7.5 Login-Seite (Dual-Auth)',
    '8. Umgebungsvariablen & Secrets',
    '   8.1 Variablen-Referenz',
    '   8.2 Key Vault References',
    '   8.3 Umgebungsspezifische Werte',
    '9. Datenbank-Migration',
    '   9.1 Schema anwenden',
    '   9.2 Seed-Daten importieren',
    '   9.3 Bestehende Daten migrieren',
    '   9.4 Backup-Strategie',
    '10. Azure Blob Storage (Datei-Migration)',
    '   10.1 Storage-Container einrichten',
    '   10.2 Azure Blob SDK implementieren',
    '   10.3 Betroffene API-Routen',
    '   10.4 Bestehende Dateien migrieren',
    '11. Monitoring & Logging',
    '   11.1 Application Insights',
    '   11.2 Health-Check Endpoint',
    '   11.3 Empfohlene Alerts',
    '   11.4 Log Analytics Workspace',
    '12. Sicherheitsmassnahmen',
    '   12.1 Netzwerk-Isolation (VNet)',
    '   12.2 SSL/TLS',
    '   12.3 WAF (Web Application Firewall)',
    '   12.4 Managed Identity',
    '   12.5 Secret Rotation',
    '13. Go-Live Checkliste',
    '14. Rollback-Verfahren',
    '15. Betriebshandbuch (Day-2 Operations)',
    'Anhang A: Vollständige azure-pipelines.yml',
    'Anhang B: Umgebungsvariablen-Matrix',
    'Anhang C: Kontakte & Eskalation',
]

for item in toc_items:
    p = doc.add_paragraph()
    indent = item.count('   ')
    p.paragraph_format.left_indent = Cm(indent * 0.8)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(item.strip())
    r.font.size = Pt(10 if indent == 0 else 9.5)
    r.font.name = 'Calibri'
    if indent == 0:
        r.bold = True
        r.font.color.rgb = BAND_TEAL
    else:
        r.font.color.rgb = GRAY

page_break()

# ══════════════════════════════════════════════════════════════
#  1. DOKUMENTÜBERSICHT
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('1. Dokumentübersicht', style='SectionHead')

doc.add_paragraph(
    'Dieses Dokument beschreibt die vollständige Installationsanleitung für die Migration und '
    'Produktivsetzung der BANDspirit-Applikation auf einer Microsoft Azure DevOps Umgebung. '
    'Es richtet sich an IT-Administratoren, DevOps-Engineers und Projektverantwortliche, die für '
    'die Einrichtung, Konfiguration und den Betrieb der Infrastruktur zuständig sind.'
)

doc.add_paragraph(
    'Die Anleitung deckt den gesamten Lebenszyklus ab: von der Provisionierung der Azure-Ressourcen '
    'über die Einrichtung der CI/CD-Pipeline in Azure DevOps bis hin zur SSO-Integration mit '
    'Azure Entra ID und dem Go-Live-Prozess.'
)

doc.add_paragraph('Geltungsbereich:', style='SubSubSectionHead')
add_bullet('BANDspirit Klientenmanagement-System (aktuelle Version)')
add_bullet('Drei Umgebungen: DEV (Entwicklung), PREPROD (Abnahme), PROD (Produktion)')
add_bullet('Azure-Region: Switzerland North (switzerlandnorth)')
add_bullet('Branching: develop → release/* → main')

doc.add_paragraph('Referenzdokumente:', style='SubSubSectionHead')
add_bullet('BANDspirit Context Engineering V1.1.x')
add_bullet('BANDspirit Sicherheitsaudit V1.2')
add_bullet('BANDspirit Benutzerverwaltung V1.3.26')
add_bullet('Azure Well-Architected Framework (Microsoft)')

page_break()

# ══════════════════════════════════════════════════════════════
#  2. VORAUSSETZUNGEN
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('2. Voraussetzungen', style='SectionHead')

doc.add_paragraph('2.1 Azure-Abonnement & Berechtigungen', style='SubSectionHead')
add_bullet('Aktives Azure-Abonnement (Pay-as-you-go, Enterprise Agreement oder CSP)')
add_bullet('Rolle Contributor oder höher auf Subscription-Ebene')
add_bullet('Zugriff auf Azure Entra ID (ehem. Azure AD) mit Berechtigung zur App-Registrierung')
add_bullet('Azure DevOps Organisation mit Projektberechtigung (Project Collection Administrator oder Project Administrator)')
add_bullet('Berechtigung zur Erstellung von Service Connections in Azure DevOps')

doc.add_paragraph('2.2 Lokale Werkzeuge', style='SubSectionHead')

add_table(
    ['Werkzeug', 'Mindestversion', 'Zweck'],
    [
        ['az (Azure CLI)', '≥ 2.50', 'Infrastruktur-Provisionierung, Konfiguration'],
        ['git', '≥ 2.30', 'Versionsverwaltung, Repository-Setup'],
        ['node', '≥ 18 LTS', 'Build-Prozess, Prisma-CLI'],
        ['yarn', '≥ 1.22', 'Dependency-Management'],
        ['psql', '≥ 14', 'Datenbank-Migration und -Diagnose'],
        ['openssl', '≥ 1.1', 'Secret-Generierung (NEXTAUTH_SECRET)'],
    ]
)

doc.add_paragraph()

doc.add_paragraph('2.3 Quellsystem-Informationen', style='SubSectionHead')

add_table(
    ['Eigenschaft', 'Wert'],
    [
        ['Applikation', 'BANDspirit Klientenmanagement-System'],
        ['Framework', 'Next.js 14 (App Router, Standalone-Build)'],
        ['ORM', 'Prisma ORM mit PostgreSQL'],
        ['Authentifizierung', 'NextAuth.js (Credentials + Azure AD)'],
        ['Dateiablage', 'Cloud-basierte Speicherung (→ Azure Blob Storage)'],
        ['Runtime', 'Node.js 18 LTS'],
        ['Build-Output', 'Standalone-Build (.build/standalone/)'],
        ['Prisma-Modelle', '23+ Modelle (User, Organisation, Hilfe, etc.)'],
    ]
)

page_break()

# ══════════════════════════════════════════════════════════════
#  3. ZIELARCHITEKTUR
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('3. Zielarchitektur Azure', style='SectionHead')

doc.add_paragraph('3.1 Architektur-Übersicht', style='SubSectionHead')

doc.add_paragraph(
    'Die Zielarchitektur bildet drei vollständig isolierte Umgebungen (DEV, PREPROD, PROD) ab. '
    'Jede Umgebung verfügt über eigene Ressourcen in einer dedizierten Resource Group. '
    'Gemeinsam genutzte Dienste (Entra ID, DNS) werden zentral verwaltet.'
)

add_code([
    '┌──────────────────────────────────────────────────────┐',
    '│  Azure DevOps                                        │',
    '│  ┌────────────┐   ┌─────────────────────────────────┐│',
    '│  │ Git Repo   │──▶│ CI/CD Pipeline (YAML)           ││',
    '│  │ (main,     │   │ Build → DEV → PREPROD → PROD    ││',
    '│  │  develop,  │   └──────┬──────┬──────┬────────────┘│',
    '│  │  release)  │          │      │      │             │',
    '│  └────────────┘          │      │      │             │',
    '└──────────────────────────┼──────┼──────┼─────────────┘',
    '                           ▼      ▼      ▼',
    '              ┌───────────────────────────────────────┐',
    '              │  Azure Resource Groups                │',
    '              │                                       │',
    '              │  rg-bandspirit-dev                     │',
    '              │  rg-bandspirit-preprod                 │',
    '              │  rg-bandspirit-prod                    │',
    '              │                                       │',
    '              │  Pro Umgebung:                         │',
    '              │  ├─ App Service (Node 18 LTS)          │',
    '              │  ├─ PostgreSQL Flexible Server          │',
    '              │  ├─ Azure Blob Storage                  │',
    '              │  ├─ Application Insights                │',
    '              │  └─ Key Vault (Secrets)                 │',
    '              │                                       │',
    '              │  Shared:                               │',
    '              │  ├─ Azure Entra ID (SSO)               │',
    '              │  └─ Azure DNS / Custom Domain           │',
    '              └───────────────────────────────────────┘',
], title='Architektur-Diagramm')

doc.add_paragraph('3.2 Umgebungskonzept', style='SubSectionHead')

add_table(
    ['Umgebung', 'Branch', 'URL-Muster', 'Zweck', 'Freigabe'],
    [
        ['DEV', 'develop', 'app-bandspirit-dev.azurewebsites.net', 'Entwicklung & Integration', 'Automatisch'],
        ['PREPROD', 'release/*', 'app-bandspirit-preprod.azurewebsites.net', 'Abnahme & QA', '1 Approver'],
        ['PROD', 'main', 'bandspirit.ihredomain.ch', 'Produktion', '2 Approver (4-Augen)'],
    ]
)

doc.add_paragraph()

doc.add_paragraph('3.3 Komponentenübersicht', style='SubSectionHead')

add_table(
    ['Komponente', 'Azure-Dienst', 'SKU (DEV)', 'SKU (PROD)', 'Beschreibung'],
    [
        ['Web-Applikation', 'App Service', 'B1 (Basic)', 'P1v2 (Premium)', 'Next.js Standalone, Node.js 18'],
        ['Datenbank', 'PostgreSQL Flexible', 'B1ms (Burstable)', 'D2s_v3 (General Purpose)', 'PostgreSQL 15, SSL erzwungen'],
        ['Dateiablage', 'Blob Storage', 'Standard LRS', 'Standard ZRS', 'Dokumente, Logos, Uploads'],
        ['Secrets', 'Key Vault', 'Standard', 'Standard', 'DATABASE_URL, NEXTAUTH_SECRET, etc.'],
        ['Monitoring', 'Application Insights', 'Free Tier', 'Standard', 'Performance, Fehler, Verfügbarkeit'],
        ['Identity', 'Entra ID', 'Shared', 'Shared', 'SSO via OpenID Connect'],
        ['DNS', 'Azure DNS', 'Shared', 'Shared', 'Custom Domain + SSL'],
    ]
)

page_break()

# ══════════════════════════════════════════════════════════════
#  4. AZURE-INFRASTRUKTUR AUFSETZEN
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('4. Azure-Infrastruktur aufsetzen', style='SectionHead')

doc.add_paragraph(
    'Alle Befehle verwenden die Azure CLI (az) und können in einer Bash-Shell oder Azure Cloud Shell '
    'ausgeführt werden. Die Variablen LOCATION und PREFIX werden durchgehend verwendet.'
)

add_code([
    '# Grundlegende Variablen',
    'LOCATION="switzerlandnorth"   # Rechenzentrum Schweiz',
    'PREFIX="bandspirit"',
    '',
    '# Azure Login',
    'az login',
], title='Vorbereitung')

# 4.1
doc.add_paragraph('4.1 Resource Groups erstellen', style='SubSectionHead')

add_code([
    '# Eine Resource Group pro Umgebung',
    'az group create --name rg-$PREFIX-dev     --location $LOCATION',
    'az group create --name rg-$PREFIX-preprod --location $LOCATION',
    'az group create --name rg-$PREFIX-prod    --location $LOCATION',
    '',
    '# Tags für Kostenzuordnung',
    'for ENV in dev preprod prod; do',
    '  az group update --name rg-$PREFIX-$ENV \\',
    '    --tags project=bandspirit environment=$ENV team=IT',
    'done',
], title='Resource Groups (Azure CLI)')

# 4.2
doc.add_paragraph('4.2 Azure Database for PostgreSQL (Flexible Server)', style='SubSectionHead')

add_code([
    '# Variablen',
    'DB_ADMIN="bandspiritadmin"',
    'DB_NAME="bandspirit"',
    '',
    '# ─── DEV ───',
    'ENV="dev"',
    'az postgres flexible-server create \\',
    '  --resource-group rg-$PREFIX-$ENV \\',
    '  --name pg-$PREFIX-$ENV \\',
    '  --location $LOCATION \\',
    '  --admin-user $DB_ADMIN \\',
    '  --admin-password "<SICHERES_PASSWORT_DEV>" \\',
    '  --sku-name Standard_B1ms \\',
    '  --tier Burstable \\',
    '  --storage-size 32 \\',
    '  --version 15 \\',
    '  --yes',
    '',
    '# Firewall: Azure-Services erlauben',
    'az postgres flexible-server firewall-rule create \\',
    '  --resource-group rg-$PREFIX-$ENV \\',
    '  --name pg-$PREFIX-$ENV \\',
    '  --rule-name AllowAzureServices \\',
    '  --start-ip-address 0.0.0.0 \\',
    '  --end-ip-address 0.0.0.0',
    '',
    '# Datenbank erstellen',
    'az postgres flexible-server db create \\',
    '  --resource-group rg-$PREFIX-$ENV \\',
    '  --server-name pg-$PREFIX-$ENV \\',
    '  --database-name $DB_NAME',
    '',
    '# SSL erzwingen',
    'az postgres flexible-server parameter set \\',
    '  --resource-group rg-$PREFIX-$ENV \\',
    '  --server-name pg-$PREFIX-$ENV \\',
    '  --name require_secure_transport \\',
    '  --value on',
], title='PostgreSQL Flexible Server — DEV')

add_info_box(
    'PROD-Empfehlung: Mindestens Standard_D2s_v3 (General Purpose) mit VNet-Integration verwenden. '
    'Geo-redundante Backups aktivieren (--backup-retention 35 --geo-redundant-backup Enabled).',
    'warning'
)

add_code([
    '# ─── PROD ───',
    'ENV="prod"',
    'az postgres flexible-server create \\',
    '  --resource-group rg-$PREFIX-$ENV \\',
    '  --name pg-$PREFIX-$ENV \\',
    '  --location $LOCATION \\',
    '  --admin-user $DB_ADMIN \\',
    '  --admin-password "<SICHERES_PASSWORT_PROD>" \\',
    '  --sku-name Standard_D2s_v3 \\',
    '  --tier GeneralPurpose \\',
    '  --storage-size 64 \\',
    '  --version 15 \\',
    '  --backup-retention 35 \\',
    '  --geo-redundant-backup Enabled \\',
    '  --yes',
], title='PostgreSQL Flexible Server — PROD')

doc.add_paragraph()

# 4.3
doc.add_paragraph('4.3 Azure App Service', style='SubSectionHead')

add_code([
    '# App Service Plan (Linux) — pro Umgebung',
    'for ENV in dev preprod prod; do',
    '  SKU="B2"',
    '  [ "$ENV" = "prod" ] && SKU="P1v2"',
    '',
    '  az appservice plan create \\',
    '    --resource-group rg-$PREFIX-$ENV \\',
    '    --name plan-$PREFIX-$ENV \\',
    '    --sku $SKU \\',
    '    --is-linux',
    '',
    '  az webapp create \\',
    '    --resource-group rg-$PREFIX-$ENV \\',
    '    --plan plan-$PREFIX-$ENV \\',
    '    --name app-$PREFIX-$ENV \\',
    '    --runtime "NODE:18-lts"',
    '',
    '  # Startup Command für Next.js Standalone',
    '  az webapp config set \\',
    '    --resource-group rg-$PREFIX-$ENV \\',
    '    --name app-$PREFIX-$ENV \\',
    '    --startup-file "node .build/standalone/app/server.js"',
    '',
    '  # Always-On aktivieren (verhindert Cold-Starts)',
    '  az webapp config set \\',
    '    --resource-group rg-$PREFIX-$ENV \\',
    '    --name app-$PREFIX-$ENV \\',
    '    --always-on true',
    'done',
], title='App Service — alle Umgebungen')

# 4.4
doc.add_paragraph('4.4 Azure Blob Storage', style='SubSectionHead')

add_code([
    'for ENV in dev preprod prod; do',
    '  STORAGE_NAME="st${PREFIX}${ENV}"   # max. 24 Zeichen, lowercase',
    '  REDUNDANCY="Standard_LRS"',
    '  [ "$ENV" = "prod" ] && REDUNDANCY="Standard_ZRS"',
    '',
    '  az storage account create \\',
    '    --resource-group rg-$PREFIX-$ENV \\',
    '    --name $STORAGE_NAME \\',
    '    --sku $REDUNDANCY \\',
    '    --kind StorageV2 \\',
    '    --location $LOCATION \\',
    '    --min-tls-version TLS1_2',
    '',
    '  az storage container create \\',
    '    --account-name $STORAGE_NAME \\',
    '    --name uploads \\',
    '    --public-access off',
    'done',
], title='Blob Storage — alle Umgebungen')

# 4.5
doc.add_paragraph('4.5 Azure Key Vault', style='SubSectionHead')

add_code([
    'for ENV in dev preprod prod; do',
    '  az keyvault create \\',
    '    --resource-group rg-$PREFIX-$ENV \\',
    '    --name kv-$PREFIX-$ENV \\',
    '    --location $LOCATION \\',
    '    --enable-rbac-authorization true',
    '',
    '  # Managed Identity der Web App aktivieren',
    '  az webapp identity assign \\',
    '    --resource-group rg-$PREFIX-$ENV \\',
    '    --name app-$PREFIX-$ENV',
    '',
    '  # Key Vault Secrets User Rolle zuweisen',
    '  PRINCIPAL_ID=$(az webapp identity show \\',
    '    --resource-group rg-$PREFIX-$ENV \\',
    '    --name app-$PREFIX-$ENV \\',
    '    --query principalId -o tsv)',
    '',
    '  KV_ID=$(az keyvault show --name kv-$PREFIX-$ENV --query id -o tsv)',
    '',
    '  az role assignment create \\',
    '    --role "Key Vault Secrets User" \\',
    '    --assignee $PRINCIPAL_ID \\',
    '    --scope $KV_ID',
    'done',
], title='Key Vault — alle Umgebungen')

add_code([
    '# Secrets hinterlegen (Beispiel DEV)',
    'ENV="dev"',
    '',
    'az keyvault secret set --vault-name kv-$PREFIX-$ENV \\',
    '  --name DATABASE-URL \\',
    '  --value "postgresql://bandspiritadmin:<PW>@pg-$PREFIX-$ENV.postgres.database.azure.com:5432/bandspirit?sslmode=require"',
    '',
    'az keyvault secret set --vault-name kv-$PREFIX-$ENV \\',
    '  --name NEXTAUTH-SECRET \\',
    '  --value "$(openssl rand -base64 32)"',
    '',
    'az keyvault secret set --vault-name kv-$PREFIX-$ENV \\',
    '  --name AZURE-AD-SECRET \\',
    '  --value "<CLIENT_SECRET_AUS_ENTRA_APP_REGISTRATION>"',
    '',
    'az keyvault secret set --vault-name kv-$PREFIX-$ENV \\',
    '  --name AZURE-STORAGE-CONNECTION \\',
    '  --value "$(az storage account show-connection-string \\',
    '    --resource-group rg-$PREFIX-$ENV \\',
    '    --name st${PREFIX}${ENV} \\',
    '    --query connectionString -o tsv)"',
], title='Secrets in Key Vault hinterlegen')

# 4.6
doc.add_paragraph('4.6 Application Insights', style='SubSectionHead')

add_code([
    'for ENV in dev preprod prod; do',
    '  az monitor app-insights component create \\',
    '    --resource-group rg-$PREFIX-$ENV \\',
    '    --app ai-$PREFIX-$ENV \\',
    '    --location $LOCATION \\',
    '    --kind web \\',
    '    --application-type web',
    '',
    '  # Connection String in Key Vault speichern',
    '  CONN=$(az monitor app-insights component show \\',
    '    --resource-group rg-$PREFIX-$ENV \\',
    '    --app ai-$PREFIX-$ENV \\',
    '    --query connectionString -o tsv)',
    '',
    '  az keyvault secret set --vault-name kv-$PREFIX-$ENV \\',
    '    --name APPINSIGHTS-CONNECTION \\',
    '    --value "$CONN"',
    'done',
], title='Application Insights')

# 4.7
doc.add_paragraph('4.7 Azure DNS / Custom Domain (PROD)', style='SubSectionHead')

add_code([
    '# DNS Zone erstellen (falls Azure DNS verwendet wird)',
    'az network dns zone create \\',
    '  --resource-group rg-$PREFIX-prod \\',
    '  --name bandspirit.ihredomain.ch',
    '',
    '# CNAME Record: bandspirit → App Service',
    'az network dns record-set cname set-record \\',
    '  --resource-group rg-$PREFIX-prod \\',
    '  --zone-name ihredomain.ch \\',
    '  --record-set-name bandspirit \\',
    '  --cname app-$PREFIX-prod.azurewebsites.net',
    '',
    '# Custom Domain im App Service hinzufügen',
    'az webapp config hostname add \\',
    '  --resource-group rg-$PREFIX-prod \\',
    '  --webapp-name app-$PREFIX-prod \\',
    '  --hostname bandspirit.ihredomain.ch',
    '',
    '# Managed SSL-Zertifikat',
    'az webapp config ssl create \\',
    '  --resource-group rg-$PREFIX-prod \\',
    '  --name app-$PREFIX-prod \\',
    '  --hostname bandspirit.ihredomain.ch',
], title='Custom Domain + SSL')

page_break()

# ══════════════════════════════════════════════════════════════
#  5. AZURE DEVOPS — REPOSITORY & BRANCHING
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('5. Azure DevOps — Repository & Branching', style='SectionHead')

doc.add_paragraph('5.1 Projekt erstellen', style='SubSectionHead')

add_numbered_list([
    'Azure DevOps Portal öffnen: https://dev.azure.com/{organisation}',
    'Neues Projekt erstellen: BANDspirit-KMS (Visibility: Private)',
    'Unter Repos wird automatisch ein leeres Git-Repository angelegt',
    'Optional: Wiki für Betriebsdokumentation aktivieren',
])

doc.add_paragraph('5.2 Branching-Strategie', style='SubSectionHead')

add_table(
    ['Branch', 'Umgebung', 'Trigger', 'Merge-Richtung'],
    [
        ['develop', 'DEV', 'Push / Merge', 'feature/* → develop'],
        ['release/*', 'PREPROD', 'Push + manuelle Freigabe', 'develop → release/x.y.z'],
        ['main', 'PROD', 'Merge + 4-Augen-Freigabe', 'release/* → main'],
    ]
)

doc.add_paragraph()

doc.add_paragraph('5.3 Repository initialisieren', style='SubSectionHead')

add_code([
    '# Quellcode-Export vorbereiten',
    'cd /pfad/zum/bandspirit-quellcode/nextjs_space',
    '',
    '# .gitignore erstellen',
    'cat > .gitignore << \'EOF\'',
    'node_modules/',
    '.next/',
    '.build/',
    'dist/',
    '.env',
    '.env.local',
    '.env.*.local',
    '*.log',
    '.DS_Store',
    '.deploy/',
    'uploads/',
    'EOF',
    '',
    '# Git initialisieren + erster Commit',
    'git init',
    'git checkout -b main',
    'git add -A',
    'git commit -m "Initial: BANDspirit KMS V.1.0.0.8"',
    '',
    '# Azure DevOps Remote',
    'git remote add origin https://dev.azure.com/{org}/{project}/_git/BANDspirit-KMS',
    'git push -u origin main',
    '',
    '# Develop-Branch erstellen',
    'git checkout -b develop',
    'git push -u origin develop',
], title='Repository initialisieren')

add_info_box(
    'Die Datei .env darf NICHT ins Repository. Alle Secrets werden über Azure Key Vault '
    'und App Service Configuration verwaltet.',
    'warning'
)

doc.add_paragraph('5.4 Branch Policies', style='SubSectionHead')

doc.add_paragraph(
    'Folgende Branch Policies sollten für main und release/* konfiguriert werden:'
)
add_bullet('Minimum 1 Reviewer (main: 2 Reviewer)', bold_prefix='Code Review:')
add_bullet('Build-Validierung (Pipeline muss erfolgreich sein)', bold_prefix='Build Validation:')
add_bullet('Alle Diskussionen müssen gelöst sein', bold_prefix='Comment Resolution:')
add_bullet('Arbeitselemente müssen verlinkt sein', bold_prefix='Work Item Linking:')

page_break()

# ══════════════════════════════════════════════════════════════
#  6. CI/CD PIPELINE
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('6. CI/CD Pipeline (YAML)', style='SectionHead')

doc.add_paragraph(
    'Die gesamte CI/CD-Konfiguration liegt als YAML-Datei im Repository und wird '
    'automatisch von Azure DevOps erkannt und ausgeführt.'
)

doc.add_paragraph('6.1 Pipeline-Datei', style='SubSectionHead')

doc.add_paragraph(
    'Die Datei azure-pipelines.yml wird im Repository-Root abgelegt. '
    'Die vollständige Datei befindet sich in Anhang A.'
)

doc.add_paragraph('6.2 Build-Stage', style='SubSectionHead')

add_code([
    '# Stage: Build & Test',
    'stages:',
    '- stage: Build',
    '  displayName: "Build & Test"',
    '  jobs:',
    '  - job: BuildJob',
    '    steps:',
    '    - task: NodeTool@0',
    '      inputs:',
    '        versionSpec: "18.x"',
    '      displayName: "Node.js installieren"',
    '',
    '    - script: |',
    '        corepack enable',
    '        yarn install --frozen-lockfile',
    '      displayName: "Dependencies installieren"',
    '',
    '    - script: yarn prisma generate',
    '      displayName: "Prisma Client generieren"',
    '',
    '    - script: yarn tsc --noEmit',
    '      displayName: "TypeScript Typ-Prüfung"',
    '',
    '    - script: |',
    '        NEXT_DIST_DIR=.build \\',
    '        NEXT_OUTPUT_MODE=standalone \\',
    '        NODE_OPTIONS="--max-old-space-size=8192" \\',
    '        yarn build',
    '      displayName: "Next.js Build (Standalone)"',
    '',
    '    - script: |',
    '        mkdir -p .build/standalone/app/public',
    '        cp -r public/* .build/standalone/app/public/ 2>/dev/null || true',
    '        cp -r .build/static .build/standalone/app/.build/',
    '      displayName: "Static Assets kopieren"',
    '',
    '    - task: ArchiveFiles@2',
    '      inputs:',
    '        rootFolderOrFile: ".build/standalone"',
    '        includeRootFolder: false',
    '        archiveType: "zip"',
    '        archiveFile: "$(Build.ArtifactStagingDirectory)/app.zip"',
    '      displayName: "Build-Artefakt packen"',
    '',
    '    - publish: $(Build.ArtifactStagingDirectory)/app.zip',
    '      artifact: drop',
    '      displayName: "Artefakt publizieren"',
], title='Build-Stage (YAML)')

doc.add_paragraph('6.3 Deploy-Stages', style='SubSectionHead')

add_code([
    '# ─── Deploy DEV ───',
    '- stage: DeployDev',
    '  displayName: "Deploy → DEV"',
    '  dependsOn: Build',
    '  condition: |',
    '    and(succeeded(), eq(variables[\'Build.SourceBranch\'], \'refs/heads/develop\'))',
    '  jobs:',
    '  - deployment: DeployDevJob',
    '    environment: "bandspirit-dev"',
    '    strategy:',
    '      runOnce:',
    '        deploy:',
    '          steps:',
    '          - download: current',
    '            artifact: drop',
    '          - task: AzureWebApp@1',
    '            inputs:',
    '              azureSubscription: "Azure-ServiceConnection"',
    '              appType: "webAppLinux"',
    '              appName: "app-bandspirit-dev"',
    '              package: "$(Pipeline.Workspace)/drop/app.zip"',
    '              startUpCommand: "node app/server.js"',
    '',
    '# ─── Deploy PREPROD ─── (analog, mit release/* Trigger)',
    '# ─── Deploy PROD ─── (analog, mit main Trigger + Approval)',
    '# Siehe Anhang A für vollständige Pipeline',
], title='Deploy-Stages (YAML-Auszug)')

doc.add_paragraph('6.4 Freigabe-Gates & Approvals', style='SubSectionHead')

add_numbered_list([
    'Azure DevOps → Pipelines → Environments öffnen',
    'Environment bandspirit-preprod → Approvals and checks → 1 Approver hinzufügen',
    'Environment bandspirit-prod → Mind. 2 Approver (4-Augen-Prinzip) konfigurieren',
    'Optional: Business Hours Gate (Deployments nur Mo–Fr 08:00–17:00)',
    'Optional: Pre-Deployment Check (Health-Endpoint prüfen)',
])

doc.add_paragraph('6.5 Service Connection', style='SubSectionHead')

add_numbered_list([
    'Project Settings → Service Connections → New → Azure Resource Manager',
    'Typ: Service Principal (automatic)',
    'Name: Azure-ServiceConnection',
    'Scope: Subscription (oder spezifische Resource Groups für Least Privilege)',
])

doc.add_paragraph('6.6 Prisma-Migration im Deploy', style='SubSectionHead')

add_code([
    '# Zusätzlicher Step nach AzureWebApp@1 (pro Umgebung):',
    '- script: |',
    '    az webapp ssh \\',
    '      --resource-group rg-bandspirit-$ENV \\',
    '      --name app-bandspirit-$ENV \\',
    '      --command "npx prisma db push"',
    '  displayName: "Prisma Schema synchronisieren"',
], title='Prisma-Migration (Post-Deploy)')

add_info_box(
    'PROD: Niemals --accept-data-loss verwenden! Stattdessen prisma migrate deploy mit vorab generierten '
    'Migrations-Dateien verwenden (npx prisma migrate dev --name <beschreibung> lokal erstellen, '
    'dann npx prisma migrate deploy im Deploy).',
    'warning'
)

page_break()

# ══════════════════════════════════════════════════════════════
#  7. AZURE ENTRA ID — SSO
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('7. Azure Entra ID — SSO-Anbindung', style='SectionHead')

doc.add_paragraph(
    'Azure Entra ID (ehem. Azure AD) wird als Identity Provider über OpenID Connect '
    'an NextAuth.js angebunden. Das bestehende Credential-Login (E-Mail + Passwort) '
    'bleibt parallel bestehen (Dual-Auth).'
)

doc.add_paragraph('7.1 App Registration erstellen', style='SubSectionHead')

add_numbered_list([
    'Azure Portal → Microsoft Entra ID → App registrations → New registration',
    'Name: BANDspirit KMS',
    'Account types: Accounts in this organizational directory only (Single Tenant)',
    'Redirect URIs hinzufügen (siehe Tabelle)',
    'Certificates & secrets → New client secret → Wert in Key Vault speichern',
])

add_table(
    ['Umgebung', 'Redirect URI'],
    [
        ['DEV', 'https://app-bandspirit-dev.azurewebsites.net/api/auth/callback/azure-ad'],
        ['PREPROD', 'https://app-bandspirit-preprod.azurewebsites.net/api/auth/callback/azure-ad'],
        ['PROD', 'https://app-bandspirit-prod.azurewebsites.net/api/auth/callback/azure-ad'],
        ['PROD (Custom)', 'https://bandspirit.ihredomain.ch/api/auth/callback/azure-ad'],
    ]
)

doc.add_paragraph()

doc.add_paragraph('7.2 API-Berechtigungen & Admin Consent', style='SubSectionHead')

add_numbered_list([
    'API permissions → Add → Microsoft Graph → Delegated',
    'Berechtigungen hinzufügen: openid, profile, email, User.Read',
    'Grant admin consent klicken',
])

doc.add_paragraph('7.3 Gruppen-Claim für Rollen-Mapping', style='SubSectionHead')

doc.add_paragraph(
    'Optional: Sicherheitsgruppen in Entra ID für automatisches Rollen-Mapping:'
)

add_table(
    ['Entra-Gruppe', 'BANDspirit-Rolle', 'Beschreibung'],
    [
        ['BANDspirit-Admin', 'ADMIN', 'Vollzugriff auf alle Module'],
        ['BANDspirit-LeadLink', 'TEAMLEITUNG (Lead Link)', 'Teamleitung, erweiterte Berechtigungen'],
        ['BANDspirit-Fachperson', 'FALLMANAGER (Fachperson BI)', 'Fachliche Bearbeitung'],
        ['BANDspirit-Sachbearbeiter', 'EINSATZPLANER (Sachbearbeiter:in)', 'Lesezugriff, eingeschränkte Bearbeitung'],
    ]
)

doc.add_paragraph()
add_numbered_list([
    'Token configuration → Add groups claim → Security groups',
    'Sicherheitsgruppen in Entra ID erstellen',
    'Benutzer den entsprechenden Gruppen zuweisen',
])

doc.add_paragraph('7.4 NextAuth.js — Azure AD Provider', style='SubSectionHead')

add_code([
    '// lib/auth-options.ts — Provider hinzufügen',
    "import AzureADProvider from 'next-auth/providers/azure-ad';",
    '',
    '// Im providers-Array ergänzen:',
    'AzureADProvider({',
    '  clientId: process.env.AZURE_AD_CLIENT_ID!,',
    '  clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,',
    '  tenantId: process.env.AZURE_AD_TENANT_ID!,',
    '  authorization: {',
    '    params: {',
    "      scope: 'openid profile email User.Read',",
    '    },',
    '  },',
    '}),',
], title='Azure AD Provider (TypeScript)')

add_code([
    '// signIn-Callback — Auto-Provisioning',
    "async signIn({ user, account }) {",
    "  if (account?.provider === 'azure-ad') {",
    '    const dbUser = await prisma.user.upsert({',
    '      where: { email: user.email! },',
    '      update: { name: user.name || undefined, isActive: true },',
    '      create: {',
    '        email: user.email!,',
    "        name: user.name || 'Azure User',",
    "        password: '',       // SSO-User: kein lokales Passwort",
    "        role: 'FALLMANAGER', // Default-Rolle",
    '        isActive: true,',
    '      },',
    '    });',
    '    return dbUser.isActive;',
    '  }',
    '  return true;',
    '},',
], title='Auto-Provisioning Callback')

doc.add_paragraph('7.5 Login-Seite (Dual-Auth)', style='SubSectionHead')

doc.add_paragraph(
    'Die Login-Seite wird um einen «Mit Microsoft anmelden»-Button erweitert. '
    'Beide Authentifizierungsmethoden (Credentials + SSO) bleiben parallel verfügbar.'
)

add_info_box(
    'Dual-Auth: Benutzer können sich wahlweise mit Azure Entra ID (SSO) oder '
    'lokalem E-Mail/Passwort anmelden. SSO-Benutzer werden automatisch in der '
    'lokalen Datenbank angelegt (Auto-Provisioning).',
    'info'
)

page_break()

# ══════════════════════════════════════════════════════════════
#  8. UMGEBUNGSVARIABLEN
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('8. Umgebungsvariablen & Secrets', style='SectionHead')

doc.add_paragraph('8.1 Variablen-Referenz', style='SubSectionHead')

add_table(
    ['Variable', 'Quelle', 'Beschreibung', 'Pflicht'],
    [
        ['DATABASE_URL', 'Key Vault', 'PostgreSQL Connection String (SSL)', 'Ja'],
        ['NEXTAUTH_SECRET', 'Key Vault', 'JWT-Signaturschlüssel (min. 32 Zeichen)', 'Ja'],
        ['NEXTAUTH_URL', 'App Setting', 'Öffentliche URL der Umgebung', 'Ja'],
        ['AZURE_AD_CLIENT_ID', 'App Setting', 'Entra App Registration Client-ID', 'Ja'],
        ['AZURE_AD_CLIENT_SECRET', 'Key Vault', 'Entra Client Secret', 'Ja'],
        ['AZURE_AD_TENANT_ID', 'App Setting', 'Azure Tenant-ID', 'Ja'],
        ['AZURE_STORAGE_CONNECTION_STRING', 'Key Vault', 'Blob Storage Connection String', 'Ja'],
        ['AZURE_STORAGE_CONTAINER', 'App Setting', 'Blob Container Name ("uploads")', 'Ja'],
        ['APPLICATIONINSIGHTS_CONNECTION_STRING', 'Key Vault', 'App Insights Connection', 'Empfohlen'],
        ['NODE_ENV', 'App Setting', 'production', 'Ja'],
        ['PORT', 'App Setting', '8080 (Azure Standard)', 'Ja'],
    ]
)

doc.add_paragraph()

doc.add_paragraph('8.2 Key Vault References', style='SubSectionHead')

doc.add_paragraph(
    'Secrets werden nicht direkt in App Service Configuration gespeichert, sondern über '
    'Key Vault References eingebunden:'
)

add_code([
    '# Syntax für App Service Configuration:',
    '@Microsoft.KeyVault(VaultName=kv-bandspirit-prod;SecretName=DATABASE-URL)',
    '',
    '# Voraussetzung: Managed Identity der Web App hat die Rolle',
    '# "Key Vault Secrets User" auf dem jeweiligen Key Vault.',
], title='Key Vault Reference Syntax')

doc.add_paragraph('8.3 Umgebungsspezifische Werte', style='SubSectionHead')

add_code([
    '# Alle App Settings auf einmal setzen (Beispiel PROD)',
    'az webapp config appsettings set \\',
    '  --resource-group rg-bandspirit-prod \\',
    '  --name app-bandspirit-prod \\',
    '  --settings \\',
    '    DATABASE_URL="@Microsoft.KeyVault(VaultName=kv-bandspirit-prod;SecretName=DATABASE-URL)" \\',
    '    NEXTAUTH_SECRET="@Microsoft.KeyVault(VaultName=kv-bandspirit-prod;SecretName=NEXTAUTH-SECRET)" \\',
    '    NEXTAUTH_URL="https://bandspirit.ihredomain.ch" \\',
    '    AZURE_AD_CLIENT_ID="<CLIENT-ID>" \\',
    '    AZURE_AD_CLIENT_SECRET="@Microsoft.KeyVault(VaultName=kv-bandspirit-prod;SecretName=AZURE-AD-SECRET)" \\',
    '    AZURE_AD_TENANT_ID="<TENANT-ID>" \\',
    '    AZURE_STORAGE_CONNECTION_STRING="@Microsoft.KeyVault(VaultName=kv-bandspirit-prod;SecretName=AZURE-STORAGE-CONNECTION)" \\',
    '    AZURE_STORAGE_CONTAINER="uploads" \\',
    '    APPLICATIONINSIGHTS_CONNECTION_STRING="@Microsoft.KeyVault(VaultName=kv-bandspirit-prod;SecretName=APPINSIGHTS-CONNECTION)" \\',
    '    NODE_ENV="production" \\',
    '    PORT="8080"',
], title='App Settings setzen (PROD)')

page_break()

# ══════════════════════════════════════════════════════════════
#  9. DATENBANK-MIGRATION
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('9. Datenbank-Migration', style='SectionHead')

doc.add_paragraph('9.1 Schema anwenden', style='SubSectionHead')

add_code([
    '# Lokal mit Azure-DB verbinden',
    'export DATABASE_URL="postgresql://bandspiritadmin:<PW>@pg-bandspirit-dev.postgres.database.azure.com:5432/bandspirit?sslmode=require"',
    '',
    '# Erstmalig: Schema anwenden (DEV)',
    'npx prisma db push',
    '',
    '# Für PROD: Migrations-basiert (empfohlen)',
    'npx prisma migrate dev --name init',
    '# Generiert migrations/ Ordner mit SQL-Dateien',
    '',
    '# In PREPROD/PROD nur deployen:',
    'npx prisma migrate deploy',
], title='Prisma-Migration')

add_info_box(
    'Empfehlung: Für Produktion immer prisma migrate verwenden (nicht prisma db push). '
    'Migrations werden versioniert und sind reproduzierbar. Niemals --accept-data-loss in PROD!',
    'warning'
)

doc.add_paragraph('9.2 Seed-Daten importieren', style='SubSectionHead')

add_code([
    '# Initiale Stammdaten, Rollen-Permissions, Default-User',
    'npx prisma db seed',
    '',
    '# Enthält:',
    '# - Admin-Benutzer (Passwort nach erstem Login ändern!)',
    '# - Stammdaten (Geschlecht, Branche)',
    '# - Rollen-Berechtigungen (249 Einträge)',
    '# - BI-Kompass Platzhalter-Version',
    '# - Standard-Rollendefinitionen (5 Einträge)',
], title='Seed-Daten')

doc.add_paragraph('9.3 Bestehende Daten migrieren', style='SubSectionHead')

add_code([
    '# Export aus bestehender Datenbank',
    'pg_dump --format=custom --no-owner --no-privileges \\',
    '  -h <AKTUELLE_DB_HOST> -U <USER> -d <DB_NAME> \\',
    '  > bandspirit_backup.dump',
    '',
    '# Import in Azure PostgreSQL',
    'pg_restore --no-owner --no-privileges \\',
    '  -h pg-bandspirit-prod.postgres.database.azure.com \\',
    '  -U bandspiritadmin -d bandspirit \\',
    '  bandspirit_backup.dump',
    '',
    '# Alternativ: Nur Daten (Schema ist schon via Prisma erstellt)',
    'pg_restore --data-only --no-owner --no-privileges \\',
    '  -h pg-bandspirit-prod.postgres.database.azure.com \\',
    '  -U bandspiritadmin -d bandspirit \\',
    '  bandspirit_backup.dump',
], title='Daten-Migration mit pg_dump/pg_restore')

add_info_box(
    'Vor jeder Migration ein vollständiges Backup erstellen! Bei Schema-Unterschieden zuerst '
    'prisma migrate deploy ausführen, dann Daten importieren.',
    'warning'
)

doc.add_paragraph('9.4 Backup-Strategie', style='SubSectionHead')

add_table(
    ['Aspekt', 'DEV', 'PREPROD', 'PROD'],
    [
        ['Automatische Backups', '7 Tage', '14 Tage', '35 Tage'],
        ['Geo-redundant', 'Nein', 'Nein', 'Ja'],
        ['PITR (Point-in-Time)', 'Ja', 'Ja', 'Ja'],
        ['Manuelles Backup (Cron)', '—', 'Wöchentlich', 'Täglich + vor Deploy'],
    ]
)

page_break()

# ══════════════════════════════════════════════════════════════
#  10. AZURE BLOB STORAGE
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('10. Azure Blob Storage (Datei-Migration)', style='SectionHead')

doc.add_paragraph('10.1 Storage-Container einrichten', style='SubSectionHead')

doc.add_paragraph(
    'Die Container sind bereits in Kapitel 4.4 erstellt worden. '
    'Zusätzliche Container können bei Bedarf angelegt werden:'
)

add_code([
    '# Optional: Separate Container für verschiedene Dateitypen',
    'az storage container create --account-name stbandspiritprod --name logos --public-access off',
    'az storage container create --account-name stbandspiritprod --name dokumente --public-access off',
], title='Zusätzliche Container')

doc.add_paragraph('10.2 Azure Blob SDK implementieren', style='SubSectionHead')

add_code([
    '# Dependency installieren',
    'yarn add @azure/storage-blob',
], title='Dependency')

add_code([
    '// lib/azure-storage.ts',
    'import {',
    '  BlobServiceClient,',
    '  BlobSASPermissions,',
    "} from '@azure/storage-blob';",
    '',
    'const blobService = BlobServiceClient.fromConnectionString(',
    '  process.env.AZURE_STORAGE_CONNECTION_STRING!',
    ');',
    'const container = blobService.getContainerClient(',
    '  process.env.AZURE_STORAGE_CONTAINER!',
    ');',
    '',
    'export async function uploadFile(',
    '  buffer: Buffer, path: string, contentType: string',
    ') {',
    '  const blob = container.getBlockBlobClient(path);',
    '  await blob.uploadData(buffer, {',
    '    blobHTTPHeaders: { blobContentType: contentType },',
    '  });',
    '  return blob.url;',
    '}',
    '',
    'export async function getSignedUrl(path: string, expiresInSec = 3600) {',
    '  const blob = container.getBlockBlobClient(path);',
    '  return blob.generateSasUrl({',
    "    permissions: BlobSASPermissions.parse('r'),",
    '    expiresOn: new Date(Date.now() + expiresInSec * 1000),',
    '  });',
    '}',
    '',
    'export async function deleteFile(path: string) {',
    '  const blob = container.getBlockBlobClient(path);',
    '  await blob.deleteIfExists();',
    '}',
], title='Azure Blob Storage Helper')

doc.add_paragraph('10.3 Betroffene API-Routen', style='SubSectionHead')

add_table(
    ['API-Route', 'Funktion', 'Anpassung'],
    [
        ['/api/firma/logo', 'Logo-Upload', 'S3 → Azure Blob (Presigned URL → SAS Token)'],
        ['/api/bi-kompass/upload', 'PDF-Upload', 'S3 → Azure Blob (falls gespeichert)'],
        ['actions.ts (Server Action)', 'getFileUrl', 'S3 getSignedUrl → Azure getSignedUrl'],
    ]
)

doc.add_paragraph()

doc.add_paragraph('10.4 Bestehende Dateien migrieren', style='SubSectionHead')

add_code([
    '# AzCopy für Migration bestehender Dateien',
    '# (falls Dateien aus bisherigem Storage übernommen werden müssen)',
    'azcopy copy \\',
    '  "https://<QUELLE>.blob.core.windows.net/<container>/*" \\',
    '  "https://stbandspiritprod.blob.core.windows.net/uploads/" \\',
    '  --recursive',
], title='Datei-Migration mit AzCopy')

page_break()

# ══════════════════════════════════════════════════════════════
#  11. MONITORING & LOGGING
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('11. Monitoring & Logging', style='SectionHead')

doc.add_paragraph('11.1 Application Insights', style='SubSectionHead')

add_code([
    '# Dependency',
    'yarn add applicationinsights',
], title='Dependency')

add_code([
    '// instrumentation.ts (im Projekt-Root)',
    "import * as appInsights from 'applicationinsights';",
    '',
    'if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {',
    '  appInsights',
    '    .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)',
    '    .setAutoDependencyCorrelation(true)',
    '    .setAutoCollectRequests(true)',
    '    .setAutoCollectPerformance(true)',
    '    .setAutoCollectExceptions(true)',
    '    .setAutoCollectDependencies(true)',
    '    .start();',
    '}',
], title='Application Insights Setup')

doc.add_paragraph('11.2 Health-Check Endpoint', style='SubSectionHead')

add_code([
    '// app/api/health/route.ts',
    "import { NextResponse } from 'next/server';",
    "import { prisma } from '@/lib/prisma';",
    '',
    "export const dynamic = 'force-dynamic';",
    '',
    'export async function GET() {',
    '  try {',
    '    await prisma.$queryRaw`SELECT 1`;',
    '    return NextResponse.json({ status: "ok", db: "connected" });',
    '  } catch {',
    '    return NextResponse.json(',
    '      { status: "error", db: "disconnected" },',
    '      { status: 503 }',
    '    );',
    '  }',
    '}',
], title='Health-Check')

doc.add_paragraph('11.3 Empfohlene Alerts', style='SubSectionHead')

add_table(
    ['Metrik', 'Schwellenwert', 'Aktion', 'Schweregrad'],
    [
        ['HTTP 5xx Fehlerrate', '> 10 / Minute', 'E-Mail + Teams', 'Kritisch'],
        ['CPU-Auslastung', '> 80% über 5 Min', 'E-Mail', 'Warnung'],
        ['Speichernutzung', '> 85%', 'E-Mail', 'Warnung'],
        ['DB Connections', '> 80% des Limits', 'E-Mail + Teams', 'Warnung'],
        ['Response Time P95', '> 3 Sekunden', 'E-Mail', 'Warnung'],
        ['Health-Check', 'Fehlschlag 3x', 'E-Mail + Teams + PagerDuty', 'Kritisch'],
        ['Disk I/O', '> 90%', 'E-Mail', 'Warnung'],
    ]
)

doc.add_paragraph()

doc.add_paragraph('11.4 Log Analytics Workspace', style='SubSectionHead')

add_code([
    '# Log Analytics Workspace erstellen',
    'az monitor log-analytics workspace create \\',
    '  --resource-group rg-bandspirit-prod \\',
    '  --workspace-name law-bandspirit-prod \\',
    '  --location $LOCATION',
    '',
    '# App Service Diagnostic Logs aktivieren',
    'az webapp log config \\',
    '  --resource-group rg-bandspirit-prod \\',
    '  --name app-bandspirit-prod \\',
    '  --application-logging filesystem \\',
    '  --detailed-error-messages true \\',
    '  --failed-request-tracing true \\',
    '  --web-server-logging filesystem',
], title='Log Analytics')

page_break()

# ══════════════════════════════════════════════════════════════
#  12. SICHERHEITSMASSNAHMEN
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('12. Sicherheitsmassnahmen', style='SectionHead')

doc.add_paragraph('12.1 Netzwerk-Isolation (VNet)', style='SubSectionHead')

doc.add_paragraph(
    'Für die PROD-Umgebung wird eine VNet-Integration empfohlen, um den Datenverkehr '
    'zwischen App Service und PostgreSQL über ein privates Netzwerk zu leiten:'
)

add_code([
    '# VNet erstellen',
    'az network vnet create \\',
    '  --resource-group rg-bandspirit-prod \\',
    '  --name vnet-bandspirit-prod \\',
    '  --location $LOCATION \\',
    '  --address-prefix 10.0.0.0/16',
    '',
    '# Subnets',
    'az network vnet subnet create \\',
    '  --resource-group rg-bandspirit-prod \\',
    '  --vnet-name vnet-bandspirit-prod \\',
    '  --name snet-webapp \\',
    '  --address-prefix 10.0.1.0/24 \\',
    '  --delegations Microsoft.Web/serverFarms',
    '',
    'az network vnet subnet create \\',
    '  --resource-group rg-bandspirit-prod \\',
    '  --vnet-name vnet-bandspirit-prod \\',
    '  --name snet-postgres \\',
    '  --address-prefix 10.0.2.0/24 \\',
    '  --delegations Microsoft.DBforPostgreSQL/flexibleServers',
    '',
    '# App Service VNet Integration',
    'az webapp vnet-integration add \\',
    '  --resource-group rg-bandspirit-prod \\',
    '  --name app-bandspirit-prod \\',
    '  --vnet vnet-bandspirit-prod \\',
    '  --subnet snet-webapp',
], title='VNet-Integration (PROD)')

doc.add_paragraph('12.2 SSL/TLS', style='SubSectionHead')
add_bullet('TLS 1.2 als Mindestversion auf allen Diensten erzwungen')
add_bullet('PostgreSQL: require_secure_transport = on')
add_bullet('Blob Storage: --min-tls-version TLS1_2')
add_bullet('App Service: HTTPS Only aktiviert (HTTP → 301 Redirect)')

add_code([
    '# HTTPS Only aktivieren',
    'az webapp update \\',
    '  --resource-group rg-bandspirit-prod \\',
    '  --name app-bandspirit-prod \\',
    '  --set httpsOnly=true',
], title='HTTPS Only')

doc.add_paragraph('12.3 WAF (Web Application Firewall)', style='SubSectionHead')

doc.add_paragraph(
    'Für zusätzlichen Schutz kann Azure Front Door mit WAF-Richtlinien vor den App Service geschaltet werden:'
)
add_bullet('OWASP 3.2 Regel-Set (SQL-Injection, XSS, etc.)')
add_bullet('Rate-Limiting (max. 1000 Requests/Minute pro IP)')
add_bullet('Geo-Filtering (optional: nur CH/EU erlauben)')
add_bullet('Bot Protection')

doc.add_paragraph('12.4 Managed Identity', style='SubSectionHead')

doc.add_paragraph(
    'Alle Dienst-zu-Dienst-Authentifizierungen verwenden Azure Managed Identity — '
    'keine statischen Credentials:'
)
add_bullet('App Service → Key Vault (Key Vault Secrets User)', bold_prefix='Rolle:')
add_bullet('App Service → Blob Storage (Storage Blob Data Contributor)', bold_prefix='Rolle:')
add_bullet('App Service → Application Insights (Monitoring Metrics Publisher)', bold_prefix='Rolle:')

doc.add_paragraph('12.5 Secret Rotation', style='SubSectionHead')

add_table(
    ['Secret', 'Rotationsintervall', 'Verfahren'],
    [
        ['NEXTAUTH_SECRET', '6 Monate', 'Neuen Wert generieren, in Key Vault aktualisieren, App neu starten'],
        ['AZURE_AD_CLIENT_SECRET', '12 Monate (vor Ablauf!)', 'Neues Secret in Entra erstellen, Key Vault aktualisieren'],
        ['DB Admin-Passwort', '6 Monate', 'az postgres flexible-server update, Key Vault aktualisieren'],
    ]
)

page_break()

# ══════════════════════════════════════════════════════════════
#  13. GO-LIVE CHECKLISTE
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('13. Go-Live Checkliste', style='SectionHead')

checklist_sections = [
    ('Infrastruktur', [
        'Resource Groups (dev/preprod/prod) erstellt',
        'PostgreSQL Flexible Server pro Umgebung provisioniert',
        'App Service Plans + Web Apps erstellt',
        'Blob Storage Accounts + Container erstellt',
        'Key Vault mit allen Secrets befüllt',
        'Managed Identity: Web App → Key Vault Zugriff konfiguriert',
        'Application Insights konfiguriert',
        'VNet-Integration für PROD eingerichtet',
    ]),
    ('Repository & Pipeline', [
        'Azure DevOps Projekt erstellt',
        'Source Code in Azure Repos gepusht',
        'Branching-Strategie eingerichtet (develop/release/main)',
        'azure-pipelines.yml validiert und eingecheckt',
        'Service Connection konfiguriert',
        'Environments mit Freigabe-Gates erstellt',
        'Branch Policies aktiviert',
        'Erster Pipeline-Durchlauf erfolgreich (alle 3 Stages)',
    ]),
    ('Authentifizierung (Entra ID)', [
        'App Registration erstellt',
        'Client Secret generiert und in Key Vault gespeichert',
        'Redirect URIs für alle Umgebungen eingetragen',
        'API Permissions + Admin Consent erteilt',
        'NextAuth.js Azure AD Provider implementiert',
        'Login-Seite mit SSO-Button erweitert',
        'Auto-Provisioning Callback implementiert',
        'Gruppen-Mapping konfiguriert und getestet (optional)',
    ]),
    ('Datenbank & Storage', [
        'Prisma Schema auf Azure DB angewendet',
        'Seed-Daten importiert',
        'Bestehende Daten migriert (falls vorhanden)',
        'Cloud Storage auf Azure Blob SDK umgestellt',
        'Upload/Download in allen Umgebungen getestet',
        'Backup-Strategie konfiguriert (automatisch + manuell)',
        'PITR (Point-in-Time Recovery) getestet',
    ]),
    ('Sicherheit', [
        'SSL/TLS auf allen Diensten erzwungen',
        'HTTPS Only aktiviert',
        'VNet-Integration für DB (PROD)',
        'Key Vault RBAC korrekt konfiguriert',
        'Keine Secrets in Repository oder Logs',
        'WAF / Front Door (optional, empfohlen)',
    ]),
    ('Testing & Go-Live', [
        'Alle CRUD-Operationen in DEV getestet',
        'RBAC-Berechtigungen pro Rolle geprüft',
        'SSO-Login + Credential-Login funktioniert',
        'PREPROD-Abnahme durch Fachbereich',
        'Custom Domain + SSL-Zertifikat (PROD) konfiguriert',
        'DNS-Einträge gesetzt und propagiert',
        'PROD-Deployment via Pipeline',
        'Smoke-Test: Login, Dashboard, Organisation, Dokumentation',
        'Monitoring-Alerts konfiguriert und verifiziert',
        'Rollback-Plan dokumentiert und kommuniziert',
        'Betriebsteam eingewiesen',
    ]),
]

for section_name, items in checklist_sections:
    doc.add_paragraph(section_name, style='SubSectionHead')
    for item in items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.5)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run('☐  ')
        r.font.size = Pt(10)
        r2 = p.add_run(item)
        r2.font.size = Pt(10)
        r2.font.name = 'Calibri'

page_break()

# ══════════════════════════════════════════════════════════════
#  14. ROLLBACK-VERFAHREN
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('14. Rollback-Verfahren', style='SectionHead')

doc.add_paragraph(
    'Ein klar definiertes Rollback-Verfahren ist essenziell für sichere Deployments. '
    'BANDspirit unterstützt mehrere Rollback-Strategien:'
)

doc.add_paragraph('Applikations-Rollback (schnell, < 5 Min)', style='SubSubSectionHead')
add_code([
    '# Letztes erfolgreiches Deployment wiederherstellen',
    'az webapp deployment slot swap \\',
    '  --resource-group rg-bandspirit-prod \\',
    '  --name app-bandspirit-prod \\',
    '  --slot staging \\',
    '  --target-slot production',
    '',
    '# Oder: Vorherige Version aus Pipeline-Artefakt deployen',
    '# In Azure DevOps: Pipeline → Runs → gewünschten Run → Rerun stages',
], title='App-Rollback')

doc.add_paragraph('Datenbank-Rollback (PITR)', style='SubSubSectionHead')
add_code([
    '# Point-in-Time Recovery',
    'az postgres flexible-server restore \\',
    '  --resource-group rg-bandspirit-prod \\',
    '  --name pg-bandspirit-prod-restored \\',
    '  --source-server pg-bandspirit-prod \\',
    '  --restore-time "2026-06-04T10:00:00Z"',
    '',
    '# Danach: DATABASE_URL auf neuen Server umstellen',
], title='DB-Rollback (PITR)')

add_info_box(
    'Wichtig: Bei Rollbacks mit Schema-Änderungen muss auch die Datenbank zurückgesetzt werden. '
    'Immer zuerst DB-Backup erstellen, dann App-Rollback, dann DB-Rollback falls nötig.',
    'warning'
)

page_break()

# ══════════════════════════════════════════════════════════════
#  15. BETRIEBSHANDBUCH
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('15. Betriebshandbuch (Day-2 Operations)', style='SectionHead')

doc.add_paragraph('Regelmässige Wartungsaufgaben:', style='SubSectionHead')

add_table(
    ['Aufgabe', 'Frequenz', 'Verantwortlich', 'Beschreibung'],
    [
        ['DB-Backup prüfen', 'Täglich', 'DBA / DevOps', 'Automatische Backups in Azure Portal prüfen'],
        ['Log Review', 'Wöchentlich', 'DevOps', 'Application Insights Exceptions prüfen'],
        ['Dependency Updates', 'Monatlich', 'Entwicklung', 'yarn audit, npm audit, Prisma Updates'],
        ['Secret Rotation', 'Halbjährlich', 'Security / DevOps', 'NEXTAUTH_SECRET, DB-Passwort rotieren'],
        ['Entra ID Review', 'Quartalsweise', 'IT-Admin', 'Benutzer/Gruppen-Zuordnungen prüfen'],
        ['SSL-Zertifikat', 'Automatisch', 'Azure', 'Managed Certificate (auto-renewal)'],
        ['Kapazitäts-Review', 'Quartalsweise', 'DevOps', 'SKU-Anpassung bei Wachstum prüfen'],
        ['Sicherheits-Patches', 'Monatlich', 'DevOps', 'Node.js LTS, OS-Updates (Azure managed)'],
    ]
)

doc.add_paragraph()

doc.add_paragraph('Skalierung:', style='SubSectionHead')

add_table(
    ['Komponente', 'Skalierungsoption', 'Trigger'],
    [
        ['App Service', 'Vertical: B2 → P1v2 → P2v2', 'CPU > 80% dauerhaft'],
        ['App Service', 'Horizontal: 1 → N Instanzen (Auto-Scale)', 'Requests > 1000/min'],
        ['PostgreSQL', 'B1ms → D2s → D4s', 'DB Connections > 80%'],
        ['PostgreSQL', 'Storage: 32GB → 64GB → 128GB', 'Storage > 80%'],
        ['Blob Storage', 'Automatisch skalierend', 'N/A'],
    ]
)

page_break()

# ══════════════════════════════════════════════════════════════
#  ANHANG A: VOLLSTÄNDIGE PIPELINE
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('Anhang A: Vollständige azure-pipelines.yml', style='SectionHead')

pipeline_lines = [
    '# azure-pipelines.yml',
    '# BANDspirit KMS — CI/CD Pipeline',
    '# ============================================================',
    '',
    'trigger:',
    '  branches:',
    '    include:',
    '      - main',
    '      - develop',
    '      - release/*',
    '',
    'pool:',
    '  vmImage: "ubuntu-latest"',
    '',
    'variables:',
    '  nodeVersion: "18.x"',
    '',
    'stages:',
    '',
    '# ──── BUILD ────',
    '- stage: Build',
    '  displayName: "Build & Test"',
    '  jobs:',
    '  - job: BuildJob',
    '    steps:',
    '    - task: NodeTool@0',
    '      inputs:',
    '        versionSpec: "$(nodeVersion)"',
    '      displayName: "Node.js installieren"',
    '',
    '    - script: |',
    '        corepack enable',
    '        yarn install --frozen-lockfile',
    '      displayName: "Dependencies installieren"',
    '',
    '    - script: yarn prisma generate',
    '      displayName: "Prisma Client generieren"',
    '',
    '    - script: yarn tsc --noEmit',
    '      displayName: "TypeScript Typ-Prüfung"',
    '',
    '    - script: |',
    '        NEXT_DIST_DIR=.build \\',
    '        NEXT_OUTPUT_MODE=standalone \\',
    '        NODE_OPTIONS="--max-old-space-size=8192" \\',
    '        yarn build',
    '      displayName: "Next.js Build (Standalone)"',
    '',
    '    - script: |',
    '        mkdir -p .build/standalone/app/public',
    '        cp -r public/* .build/standalone/app/public/ 2>/dev/null || true',
    '        cp -r .build/static .build/standalone/app/.build/',
    '      displayName: "Static Assets kopieren"',
    '',
    '    - task: ArchiveFiles@2',
    '      inputs:',
    '        rootFolderOrFile: ".build/standalone"',
    '        includeRootFolder: false',
    '        archiveType: "zip"',
    '        archiveFile: "$(Build.ArtifactStagingDirectory)/app.zip"',
    '      displayName: "Build-Artefakt packen"',
    '',
    '    - publish: $(Build.ArtifactStagingDirectory)/app.zip',
    '      artifact: drop',
    '      displayName: "Artefakt publizieren"',
    '',
    '# ──── DEPLOY DEV ────',
    '- stage: DeployDev',
    '  displayName: "Deploy → DEV"',
    '  dependsOn: Build',
    '  condition: and(succeeded(), eq(variables[\'Build.SourceBranch\'], \'refs/heads/develop\'))',
    '  jobs:',
    '  - deployment: DeployDevJob',
    '    environment: "bandspirit-dev"',
    '    strategy:',
    '      runOnce:',
    '        deploy:',
    '          steps:',
    '          - download: current',
    '            artifact: drop',
    '          - task: AzureWebApp@1',
    '            inputs:',
    '              azureSubscription: "Azure-ServiceConnection"',
    '              appType: "webAppLinux"',
    '              appName: "app-bandspirit-dev"',
    '              package: "$(Pipeline.Workspace)/drop/app.zip"',
    '              startUpCommand: "node app/server.js"',
    '          - script: |',
    '              az webapp ssh --resource-group rg-bandspirit-dev \\',
    '                --name app-bandspirit-dev \\',
    '                --command "npx prisma db push"',
    '            displayName: "Prisma Schema sync (DEV)"',
    '',
    '# ──── DEPLOY PREPROD ────',
    '- stage: DeployPreprod',
    '  displayName: "Deploy → PREPROD"',
    '  dependsOn: Build',
    '  condition: and(succeeded(), startsWith(variables[\'Build.SourceBranch\'], \'refs/heads/release/\'))',
    '  jobs:',
    '  - deployment: DeployPreprodJob',
    '    environment: "bandspirit-preprod"',
    '    strategy:',
    '      runOnce:',
    '        deploy:',
    '          steps:',
    '          - download: current',
    '            artifact: drop',
    '          - task: AzureWebApp@1',
    '            inputs:',
    '              azureSubscription: "Azure-ServiceConnection"',
    '              appType: "webAppLinux"',
    '              appName: "app-bandspirit-preprod"',
    '              package: "$(Pipeline.Workspace)/drop/app.zip"',
    '              startUpCommand: "node app/server.js"',
    '          - script: |',
    '              az webapp ssh --resource-group rg-bandspirit-preprod \\',
    '                --name app-bandspirit-preprod \\',
    '                --command "npx prisma migrate deploy"',
    '            displayName: "Prisma Migration (PREPROD)"',
    '',
    '# ──── DEPLOY PROD ────',
    '- stage: DeployProd',
    '  displayName: "Deploy → PROD"',
    '  dependsOn: DeployPreprod',
    '  condition: and(succeeded(), eq(variables[\'Build.SourceBranch\'], \'refs/heads/main\'))',
    '  jobs:',
    '  - deployment: DeployProdJob',
    '    environment: "bandspirit-prod"',
    '    strategy:',
    '      runOnce:',
    '        deploy:',
    '          steps:',
    '          - download: current',
    '            artifact: drop',
    '          - task: AzureWebApp@1',
    '            inputs:',
    '              azureSubscription: "Azure-ServiceConnection"',
    '              appType: "webAppLinux"',
    '              appName: "app-bandspirit-prod"',
    '              package: "$(Pipeline.Workspace)/drop/app.zip"',
    '              startUpCommand: "node app/server.js"',
    '          - script: |',
    '              az webapp ssh --resource-group rg-bandspirit-prod \\',
    '                --name app-bandspirit-prod \\',
    '                --command "npx prisma migrate deploy"',
    '            displayName: "Prisma Migration (PROD)"',
]
add_code(pipeline_lines, title='azure-pipelines.yml (vollständig)')

page_break()

# ══════════════════════════════════════════════════════════════
#  ANHANG B: UMGEBUNGSVARIABLEN-MATRIX
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('Anhang B: Umgebungsvariablen-Matrix', style='SectionHead')

add_table(
    ['Variable', 'DEV', 'PREPROD', 'PROD'],
    [
        ['DATABASE_URL', 'KV: kv-bandspirit-dev', 'KV: kv-bandspirit-preprod', 'KV: kv-bandspirit-prod'],
        ['NEXTAUTH_SECRET', 'KV (pro Umgebung)', 'KV (pro Umgebung)', 'KV (pro Umgebung)'],
        ['NEXTAUTH_URL', 'https://app-bandspirit-dev...', 'https://app-bandspirit-preprod...', 'https://bandspirit.ihredomain.ch'],
        ['AZURE_AD_CLIENT_ID', 'Gleiche App Registration', 'Gleiche App Registration', 'Gleiche App Registration'],
        ['AZURE_AD_CLIENT_SECRET', 'KV (gleicher Wert)', 'KV (gleicher Wert)', 'KV (gleicher Wert)'],
        ['AZURE_AD_TENANT_ID', 'Gleich', 'Gleich', 'Gleich'],
        ['AZURE_STORAGE_*', 'KV: stbandspiritdev', 'KV: stbandspiritpreprod', 'KV: stbandspiritprod'],
        ['NODE_ENV', 'production', 'production', 'production'],
        ['PORT', '8080', '8080', '8080'],
    ]
)

page_break()

# ══════════════════════════════════════════════════════════════
#  ANHANG C: KONTAKTE & ESKALATION
# ══════════════════════════════════════════════════════════════

doc.add_paragraph('Anhang C: Kontakte & Eskalation', style='SectionHead')

add_table(
    ['Rolle', 'Name', 'E-Mail', 'Telefon'],
    [
        ['Projektleitung', '<Name>', '<email>', '<telefon>'],
        ['DevOps Engineer', '<Name>', '<email>', '<telefon>'],
        ['DBA', '<Name>', '<email>', '<telefon>'],
        ['IT-Sicherheit', '<Name>', '<email>', '<telefon>'],
        ['Azure-Support', 'Microsoft', 'portal.azure.com', '—'],
    ]
)

doc.add_paragraph()

doc.add_paragraph('Eskalationspfad:', style='SubSectionHead')
add_numbered_list([
    ('Stufe 1:', 'DevOps Engineer (Reaktionszeit: 30 Min)'),
    ('Stufe 2:', 'Projektleitung (Reaktionszeit: 1 Std)'),
    ('Stufe 3:', 'IT-Leitung + Azure-Support (Reaktionszeit: 2 Std)'),
])

# Footer
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(30)
pBdr2 = parse_xml(f'<w:pBdr {nsdecls("w")}><w:top w:val="single" w:sz="4" w:space="1" w:color="3E8F88"/></w:pBdr>')
p._element.get_or_add_pPr().append(pBdr2)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('BANDspirit — Installationsanleitung Azure DevOps — V.1.0.0.8 — Juni 2026')
r.font.size = Pt(8.5)
r.font.color.rgb = GRAY
r.font.name = 'Calibri'

# ── Save ──
output_path = '/home/ubuntu/klientenmanagement/nextjs_space/docs/BANDspirit_Azure_Installationsanleitung_V1.0.0.8.docx'
doc.save(output_path)
print(f'Dokument erstellt: {output_path}')
