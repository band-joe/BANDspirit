from docx import Document
from docx.shared import Pt, Inches, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.style import WD_STYLE_TYPE
import datetime

doc = Document()

# Page setup
section = doc.sections[0]
section.top_margin = Cm(2.5)
section.bottom_margin = Cm(2)
section.left_margin = Cm(2.5)
section.right_margin = Cm(2.5)

# Styles
style_title = doc.styles.add_style('DocTitle', WD_STYLE_TYPE.PARAGRAPH)
style_title.font.name = 'Calibri'
style_title.font.size = Pt(26)
style_title.font.bold = True
style_title.font.color.rgb = RGBColor(0x1a, 0x23, 0x7e)
style_title.paragraph_format.space_after = Pt(6)
style_title.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER

style_subtitle = doc.styles.add_style('DocSubtitle', WD_STYLE_TYPE.PARAGRAPH)
style_subtitle.font.name = 'Calibri'
style_subtitle.font.size = Pt(14)
style_subtitle.font.color.rgb = RGBColor(0x0d, 0x47, 0xa1)
style_subtitle.paragraph_format.space_after = Pt(4)
style_subtitle.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER

style_section = doc.styles.add_style('SectionHead', WD_STYLE_TYPE.PARAGRAPH)
style_section.font.name = 'Calibri'
style_section.font.size = Pt(16)
style_section.font.bold = True
style_section.font.color.rgb = RGBColor(0x1a, 0x23, 0x7e)
style_section.paragraph_format.space_before = Pt(18)
style_section.paragraph_format.space_after = Pt(8)

style_subsection = doc.styles.add_style('SubSectionHead', WD_STYLE_TYPE.PARAGRAPH)
style_subsection.font.name = 'Calibri'
style_subsection.font.size = Pt(13)
style_subsection.font.bold = True
style_subsection.font.color.rgb = RGBColor(0x0d, 0x47, 0xa1)
style_subsection.paragraph_format.space_before = Pt(12)
style_subsection.paragraph_format.space_after = Pt(6)

style_body = doc.styles['Normal']
style_body.font.name = 'Calibri'
style_body.font.size = Pt(11)
style_body.paragraph_format.space_after = Pt(6)
style_body.paragraph_format.line_spacing = Pt(16)

# Helper
def add_bullet(text, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    if bold_prefix:
        r = p.add_run(bold_prefix)
        r.bold = True
        p.add_run(f' {text}')
    else:
        p.add_run(text)
    return p

def make_header_row(table, headers):
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ''
        r = cell.paragraphs[0].add_run(h)
        r.bold = True
        r.font.size = Pt(9.5)
        r.font.name = 'Calibri'

def add_data_row(table, data):
    row = table.add_row()
    for i, text in enumerate(data):
        cell = row.cells[i]
        cell.text = ''
        r = cell.paragraphs[0].add_run(str(text))
        r.font.size = Pt(9.5)
        r.font.name = 'Calibri'
    return row

# ============ COVER PAGE ============
p = doc.add_paragraph('BANDspirit', style='DocTitle')
p = doc.add_paragraph('Klientenmanagement-System', style='DocSubtitle')
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run('\n')
r = p.add_run('Content Engineering Dokument')
r.font.size = Pt(18)
r.font.bold = True
r.font.color.rgb = RGBColor(0x1a, 0x23, 0x7e)
p.add_run('\n')
r2 = p.add_run('Version 1.5')
r2.font.size = Pt(14)
r2.font.color.rgb = RGBColor(0x0d, 0x47, 0xa1)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run('\n\n')
r = p.add_run(f'Stand: {datetime.date.today().strftime("%d.%m.%Y")}')
r.font.size = Pt(11)
r.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
p.add_run('\n')
r = p.add_run('bandkms.abacusai.app')
r.font.size = Pt(11)
r.font.color.rgb = RGBColor(0x0d, 0x47, 0xa1)

doc.add_page_break()

# ============ \u00c4NDERUNGSHISTORIE ============
doc.add_paragraph('\u00c4nderungshistorie', style='SectionHead')

table = doc.add_table(rows=1, cols=3, style='Table Grid')
table.alignment = WD_TABLE_ALIGNMENT.LEFT
make_header_row(table, ['Version', 'Datum', '\u00c4nderungen'])

changes = [
    ('1.5', '06.05.2026', 'Modul 9 Erweiterung: Kontakt-Tags (Mehrfach-Tagging, Filterung, CRUD-Verwaltung), Kontaktart (Person/Organisation), Organisations-Zuordnung, Tag-Verwaltungsseite unter Einstellungen'),
    ('1.4', '06.05.2026', 'Modul 4 Erweiterung: Einsatzplanung \u2014 Mutation und Kopie'),
    ('1.3', '05.05.2026', 'Modul 12: Meeting-Planer \u2014 Wochenkalender, ICS-Einladungen, Meeting-Er\u00f6ffnung'),
    ('1.2', '05.05.2026', 'Modul 11: Meetings, Transkription, KI-Protokoll; Security Hardening'),
    ('1.1', '05.05.2026', 'Modul 10: Benutzerverwaltung, User-Kontakt-Verkn\u00fcpfung'),
    ('1.0', '30.04.2026', 'Initiale Version, Module 1\u20139'),
]
for v, d, c in changes:
    add_data_row(table, [v, d, c])

# ============ MODULE OVERVIEW ============
doc.add_paragraph('Modul\u00fcbersicht', style='SectionHead')

table2 = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(table2, ['#', 'Modul', 'Beschreibung'])

modules = [
    ('1', 'Dashboard', 'KPI-Karten, Aktivit\u00e4ten, Workflows'),
    ('2', 'Klienten', 'Stammdaten CRUD, 360\u00b0-Ansicht'),
    ('3', 'Intake', 'Checklisten-Workflow'),
    ('4', 'Einsatzplanung', 'Listen-/Statusansicht, Mutation und Kopie (v1.4)'),
    ('5', 'Arbeitspl\u00e4tze', 'Kapazit\u00e4ts-Dashboard'),
    ('6', 'Berufsbilder', 'Katalog, Kompetenz-Tags'),
    ('7', 'Berichtswesen', 'Vorlagen, PDF-Export'),
    ('8', 'Abrechnungen', 'Freigabe-Workflow, DATEV-Export'),
    ('9', 'Kontakte', 'Kontaktpersonen, M:N-Zuordnung, Kontakt-Tags, Kontaktart (Person/Organisation), Organisations-Zuordnung (v1.5)'),
    ('10', 'Benutzerverwaltung', 'CRUD, RBAC, Soft-Delete (v1.1)'),
    ('11', 'Meetings', 'Aufnahme, Transkription, KI-Protokoll (v1.2)'),
    ('12', 'Meeting-Planer', 'Wochenkalender, ICS-Einladungen, Meeting-Er\u00f6ffnung (v1.3)'),
]
for num, name, desc in modules:
    row = table2.add_row()
    for i, t in enumerate([num, name, desc]):
        cell = row.cells[i]
        cell.text = ''
        r = cell.paragraphs[0].add_run(t)
        r.font.size = Pt(9.5)
        if i == 1:
            r.bold = True

doc.add_page_break()

# ============ V1.5 CONTENT: KONTAKT-TAGS + KONTAKTART ============
doc.add_paragraph('Modul 9 Erweiterung: Kontakt-Tags & Kontaktart (v1.5)', style='SectionHead')

doc.add_paragraph('\u00dcbersicht', style='SubSectionHead')
doc.add_paragraph(
    'Version 1.5 erweitert das Kontaktmodul um zwei wesentliche Funktionsbereiche:\n\n'
    'A) Kontakt-Tags: Kontakte k\u00f6nnen mit beliebig vielen Tags (Schlagw\u00f6rtern) versehen werden. '
    'Tags sind wiederverwendbare, farbcodierte Bezeichnungen, die eine flexible Kategorisierung '
    'erm\u00f6glichen. Die Kontaktliste kann nach Tags gefiltert werden (UND-Logik). '
    'Tags werden \u00fcber eine neue Verwaltungsseite unter Einstellungen \u2192 Kontakt-Tags verwaltet.\n\n'
    'B) Kontaktart (Person/Organisation): Jeder Kontakt wird als \u201ePerson\u201c oder '
    '\u201eOrganisation\u201c klassifiziert. Personen k\u00f6nnen einer Organisation zugeordnet werden '
    '(selbstreferenzierende Relation). Organisationen zeigen ihre zugeordneten Personen an.'
)

doc.add_paragraph('Ist-Analyse', style='SubSectionHead')
doc.add_paragraph(
    'Kontakte werden bisher ausschlie\u00dflich \u00fcber den Kontakttyp (KontaktTyp-Enum: Betreuer, '
    'Angeh\u00f6riger, Arzt, Beh\u00f6rde, Arbeitgeber, Therapeut, Sozialarbeiter, Sonstiges) klassifiziert. '
    'Eine weitergehende, flexible Kategorisierung \u00fcber mehrere Dimensionen hinweg (z.\u202fB. '
    '\u201eNetzwerkpartner\u201c, \u201eDringend\u201c, \u201eRegularer Austausch\u201c) ist nicht m\u00f6glich. '
    'Die Filterung auf der Kontaktliste beschr\u00e4nkt sich auf Freitext-Suche und Typ-Filter.'
)

# --- FR-9.1 DATENMODELL ---
doc.add_paragraph('FR-9.1: Datenmodell', style='SubSectionHead')

doc.add_paragraph('Zwei neue Modelle erweitern das bestehende Schema:')

tbl_models = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_models, ['Modell', 'Feld', 'Beschreibung'])

model_rows = [
    ('KontaktTag', 'id (UUID)', 'Prim\u00e4rschl\u00fcssel'),
    ('', 'bezeichnung (String, unique)', 'Name des Tags (max. 50 Zeichen)'),
    ('', 'farbe (String)', 'Hex-Farbcode f\u00fcr UI-Darstellung (Standard: #6b7280)'),
    ('', 'aktiv (Boolean)', 'Soft-Delete-Flag (Standard: true)'),
    ('', 'createdAt / updatedAt', 'Zeitstempel'),
    ('KontaktTagZuordnung', 'id (UUID)', 'Prim\u00e4rschl\u00fcssel'),
    ('', 'kontaktId (FK \u2192 Kontakt)', 'Zugeordneter Kontakt'),
    ('', 'tagId (FK \u2192 KontaktTag)', 'Zugeordneter Tag'),
    ('', 'createdAt', 'Zeitstempel'),
]
for m, f, d in model_rows:
    add_data_row(tbl_models, [m, f, d])

doc.add_paragraph('\nRelation: Kontakt \u2194 KontaktTag ist M:N \u00fcber die Zuordnungstabelle. '
    'Ein unique-Constraint auf (kontaktId, tagId) verhindert doppelte Zuweisungen. '
    'Cascade-Delete: Beim L\u00f6schen eines Kontakts oder Tags werden die Zuordnungen automatisch entfernt.')

# --- FR-9.2 TAG-VERWALTUNG ---
doc.add_paragraph('FR-9.2: Tag-Verwaltung (CRUD)', style='SubSectionHead')

doc.add_paragraph('Tags werden \u00fcber eine eigene API verwaltet:')

tbl_tag_api = doc.add_table(rows=1, cols=4, style='Table Grid')
make_header_row(tbl_tag_api, ['Pfad', 'Methode', 'Beschreibung', 'Berechtigung'])

tag_api_rows = [
    ('/api/kontakt-tags', 'GET', 'Liste aller Tags (optional: ?aktiv=true)', 'kontakt:read'),
    ('/api/kontakt-tags', 'POST', 'Neuen Tag erstellen (bezeichnung, farbe)', 'kontakt:update'),
    ('/api/kontakt-tags/[id]', 'PUT', 'Tag bearbeiten (bezeichnung, farbe, aktiv)', 'kontakt:update'),
    ('/api/kontakt-tags/[id]', 'DELETE', 'Tag l\u00f6schen (inkl. aller Zuordnungen)', 'kontakt:update'),
]
for p, m, d, b in tag_api_rows:
    add_data_row(tbl_tag_api, [p, m, d, b])

doc.add_paragraph('\nValidierungsregeln:')
val_rules = [
    'Bezeichnung ist Pflichtfeld (1\u201350 Zeichen)',
    'Bezeichnung muss eindeutig sein (unique-Constraint)',
    'Farbe ist optional, Standard: #6b7280 (Grau)',
    'Tags k\u00f6nnen direkt im Tag-Selektor inline erstellt werden (kein separater Verwaltungsdialog erforderlich)',
]
for rule in val_rules:
    add_bullet(rule)

# --- FR-9.3 TAG-ZUWEISUNG ---
doc.add_paragraph('FR-9.3: Tag-Zuweisung an Kontakte', style='SubSectionHead')

doc.add_paragraph(
    'Tags werden beim Erstellen und Bearbeiten eines Kontakts zugewiesen. '
    'Die bestehenden Kontakt-API-Endpunkte wurden erweitert:'
)

tbl_kontakt_api = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_kontakt_api, ['Endpunkt', '\u00c4nderung', 'Details'])

kontakt_api_rows = [
    ('POST /api/kontakte', 'Erweitert', 'Neuer optionaler Parameter tagIds: string[] im Request-Body'),
    ('PUT /api/kontakte/[id]', 'Erweitert', 'Neuer optionaler Parameter tagIds: string[]. Ersetzt alle bestehenden Tags (Delete + Re-Create in Transaktion)'),
    ('GET /api/kontakte', 'Erweitert', 'Tags in Response enthalten. Neuer Filter-Parameter tagIds (kommasepariert). UND-Logik: Kontakt muss alle gew\u00e4hlten Tags besitzen'),
    ('GET /api/kontakte/[id]', 'Erweitert', 'Tags in Response enthalten (mit Tag-Details)'),
]
for e, a, d in kontakt_api_rows:
    add_data_row(tbl_kontakt_api, [e, a, d])

# --- FR-9.4 UI ---
doc.add_paragraph('FR-9.4: UI-Erweiterungen', style='SubSectionHead')

ui_items = [
    ('Kontaktliste (/kontakte):', 'Tag-Filter-Leiste unterhalb der Suchzeile. Klickbare Tag-Badges mit Farbe und Kontakt-Anzahl. Mehrfachauswahl m\u00f6glich (UND-Logik). \u201eAlle zur\u00fccksetzen\u201c-Link zum Aufheben aller Tag-Filter.'),
    ('Kontakt-Karten:', 'Tags werden als farbcodierte Mini-Badges auf jeder Kontakt-Karte angezeigt.'),
    ('Neuer Kontakt (/kontakte/neu):', 'Tag-Selektor-Komponente im Formular. Bestehende Tags ausw\u00e4hlbar, neue Tags inline erstellbar.'),
    ('Kontakt-Detail (/kontakte/[id]):', 'Tags im Header als Badges angezeigt (Lesemodus). Im Bearbeitungsmodus: Tag-Selektor zum Hinzuf\u00fcgen/Entfernen von Tags.'),
    ('Tag-Selektor-Komponente:', 'Wiederverwendbare Komponente (KontaktTagSelector). Dropdown mit verf\u00fcgbaren Tags. Inline-Erstellung neuer Tags mit Eingabefeld. Entfernen zugewiesener Tags per X-Button.'),
]
for prefix, text in ui_items:
    add_bullet(text, prefix)

# --- FR-9.5 BERECHTIGUNGEN ---
doc.add_paragraph('FR-9.5: Berechtigungen', style='SubSectionHead')

doc.add_paragraph(
    'Die Tag-Verwaltung nutzt bestehende Kontakt-Berechtigungen. '
    'Keine neuen RBAC-Schl\u00fcssel erforderlich.'
)

tbl_perms = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_perms, ['Aktion', 'Berechtigung', 'Rollen'])

perm_rows = [
    ('Tags lesen / filtern', 'kontakt:read', 'Alle Rollen'),
    ('Tags erstellen', 'kontakt:update', 'ADMIN, FALLMANAGER, TEAMLEITUNG'),
    ('Tags bearbeiten / l\u00f6schen', 'kontakt:update', 'ADMIN, FALLMANAGER, TEAMLEITUNG'),
    ('Tags einem Kontakt zuweisen', 'kontakt:update', 'ADMIN, FALLMANAGER, TEAMLEITUNG'),
]
for a, b, r in perm_rows:
    add_data_row(tbl_perms, [a, b, r])

# --- SEED-DATEN ---
doc.add_paragraph('Seed-Daten (v1.5)', style='SubSectionHead')

doc.add_paragraph('Vordefinierte Tags:')

tbl_seeds = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_seeds, ['Tag', 'Farbe', 'Beispiel-Zuordnungen'])

seed_rows = [
    ('Netzwerkpartner', '#2196f3 (Blau)', 'Dr. Hans Meier, Lisa Krause'),
    ('Dringend', '#e53935 (Rot)', '\u2014 (verf\u00fcgbar)'),
    ('Ehrenamtlich', '#4caf50 (Gr\u00fcn)', '\u2014 (verf\u00fcgbar)'),
    ('Kostentr\u00e4ger-Kontakt', '#ff9800 (Orange)', 'Frank Berger'),
    ('Regelm\u00e4\u00dfiger Austausch', '#9c27b0 (Violett)', 'Dr. Hans Meier, Frank Berger, Michael Wagner'),
    ('Bezugsperson', '#00897b (Teal)', 'Sandra M\u00fcller, Michael Wagner'),
]
for t, f, z in seed_rows:
    add_data_row(tbl_seeds, [t, f, z])

# --- GESCH\u00c4FTSREGELN ---
doc.add_paragraph('Gesch\u00e4ftsregeln (v1.5 \u2014 Zusammenfassung)', style='SubSectionHead')

rules_v15 = [
    'Ein Kontakt kann beliebig viele Tags besitzen (M:N-Relation)',
    'Ein Tag kann beliebig vielen Kontakten zugewiesen werden',
    'Tag-Bezeichnungen m\u00fcssen systemweit eindeutig sein',
    'Tag-Filter auf der Kontaktliste verwenden UND-Logik (Kontakt muss alle ausgew\u00e4hlten Tags besitzen)',
    'Tags k\u00f6nnen inline im Tag-Selektor erstellt werden (kein separater Verwaltungsdialog)',
    'Beim L\u00f6schen eines Tags werden alle Zuordnungen automatisch entfernt (Cascade)',
    'Tag-Update am Kontakt: Alle bestehenden Zuordnungen werden in einer Transaktion ersetzt',
]
for rule in rules_v15:
    add_bullet(rule)

# ============ V1.5b: KONTAKTART (PERSON / ORGANISATION) ============
doc.add_page_break()
doc.add_paragraph('Kontaktart: Person / Organisation (v1.5)', style='SectionHead')

doc.add_paragraph('FR-9.6: Datenmodell-Erweiterung \u2014 Kontaktart', style='SubSectionHead')

doc.add_paragraph(
    'Das Kontakt-Modell wird um folgende Felder erweitert:'
)

tbl_ka = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_ka, ['Feld', 'Typ', 'Beschreibung'])

ka_rows = [
    ('kontaktart', 'Enum (PERSON, ORGANISATION)', 'Klassifizierung des Kontakts. Standard: PERSON'),
    ('organisationKontaktId', 'String? (FK \u2192 Kontakt)', 'Selbstreferenz: Zuordnung einer Person zu einer Organisation'),
]
for f, t, d in ka_rows:
    add_data_row(tbl_ka, [f, t, d])

doc.add_paragraph(
    '\nDie Relation ist selbstreferenzierend: Ein Kontakt mit kontaktart=PERSON kann \u00fcber '
    'organisationKontaktId auf einen anderen Kontakt mit kontaktart=ORGANISATION verweisen. '
    'Die R\u00fcckrelation \u201emitarbeiter\u201c zeigt alle Personen, die einer Organisation zugeordnet sind. '
    'Indizes auf kontaktart und organisationKontaktId gew\u00e4hrleisten performante Abfragen.'
)

doc.add_paragraph('FR-9.7: API-Erweiterungen \u2014 Kontaktart', style='SubSectionHead')

tbl_ka_api = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_ka_api, ['Endpunkt', '\u00c4nderung', 'Details'])

ka_api_rows = [
    ('POST /api/kontakte', 'Erweitert', 'Neue optionale Parameter: kontaktart (PERSON|ORGANISATION), organisationKontaktId (nur bei PERSON)'),
    ('PUT /api/kontakte/[id]', 'Erweitert', 'kontaktart + organisationKontaktId in Update-Transaktion. Wechsel zu ORGANISATION entfernt automatisch die Organisations-Zuordnung'),
    ('GET /api/kontakte', 'Erweitert', 'Neuer Filter-Parameter: kontaktart. organisationKontakt in Response enthalten'),
    ('GET /api/kontakte/[id]', 'Erweitert', 'organisationKontakt (Name der zugeordneten Organisation) und mitarbeiter (aktive Personen bei ORGANISATION) in Response'),
]
for e, a, d in ka_api_rows:
    add_data_row(tbl_ka_api, [e, a, d])

doc.add_paragraph('FR-9.8: UI-Erweiterungen \u2014 Kontaktart', style='SubSectionHead')

ka_ui_items = [
    ('Neuer Kontakt (/kontakte/neu):', 'Radio-Buttons f\u00fcr Kontaktart (Person/Organisation). Bei Person: Dropdown zur Auswahl einer zugeordneten Organisation. Labels passen sich an (Name/Zusatz statt Vorname/Nachname f\u00fcr Organisationen).'),
    ('Kontakt-Detail (/kontakte/[id]):', 'Kontaktart-Badge im Header (Person-Icon oder Building-Icon). Organisations-Link als klickbarer Verweis. Im Bearbeitungsmodus: Kontaktart-Wechsel mit automatischer Anpassung der Felder.'),
    ('Kontakt-Detail \u2014 Mitarbeiter-Sektion:', 'Bei ORGANISATION: Neue Karte \u201eZugeordnete Personen\u201c mit klickbaren Links zu den zugeordneten Person-Kontakten.'),
    ('Kontaktliste (/kontakte):', 'Kontaktart-Badge auf jeder Karte (Person/Organisation). Neuer Dropdown-Filter \u201eAlle Kontaktarten\u201c. Organisations-Name bei Personen mit Zuordnung angezeigt.'),
]
for prefix, text in ka_ui_items:
    add_bullet(text, prefix)

doc.add_paragraph('FR-9.9: Tag-Verwaltungsseite', style='SubSectionHead')

doc.add_paragraph(
    'Tags werden \u00fcber eine dedizierte Verwaltungsseite unter Einstellungen \u2192 Kontakt-Tags '
    'verwaltet. Die Sidebar-Navigation wurde um einen klappbaren \u201eEinstellungen\u201c-Bereich erweitert, '
    'der die Unterseiten \u201eKontakt-Tags\u201c und \u201eMeeting-Typen\u201c enth\u00e4lt.'
)

tag_mgmt_items = [
    'Tabellarische \u00dcbersicht aller Tags mit Farbvorschau, Bezeichnung, Anzahl zugeordneter Kontakte und Aktiv-Status',
    'Erstellen neuer Tags: Dialog mit Bezeichnung, Farbpaletten-Picker (12 vordefinierte Farben + Freitext-Hex-Eingabe)',
    'Bearbeiten: Dialog mit Bezeichnung, Farbe, Aktiv/Inaktiv-Toggle',
    'L\u00f6schen: Best\u00e4tigungsdialog mit Hinweis auf betroffene Kontakt-Zuordnungen',
    'Berechtigung: kontakt:update erforderlich f\u00fcr alle Schreiboperationen',
]
for item in tag_mgmt_items:
    add_bullet(item)

# --- SEED-DATEN V1.5 ERWEITERUNG ---
doc.add_paragraph('Seed-Daten \u2014 Kontaktart (v1.5)', style='SubSectionHead')

doc.add_paragraph('Vordefinierte Organisations-Kontakte:')

tbl_org_seeds = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_org_seeds, ['Organisation', 'Typ', 'Zugeordnete Personen'])

org_seed_rows = [
    ('Hausarztpraxis Meier', 'Arzt', 'Dr. Hans Meier'),
    ('Jobcenter Berlin Mitte', 'Beh\u00f6rde', 'Frank Berger'),
    ('Sozialwerk Berlin e.V.', 'Sozialarbeiter', 'Michael Wagner'),
]
for o, t, p in org_seed_rows:
    add_data_row(tbl_org_seeds, [o, t, p])

doc.add_paragraph('Gesch\u00e4ftsregeln (v1.5 \u2014 Kontaktart)', style='SubSectionHead')

ka_rules = [
    'Jeder Kontakt hat eine Kontaktart: PERSON (Standard) oder ORGANISATION',
    'Nur Personen k\u00f6nnen einer Organisation zugeordnet werden (organisationKontaktId)',
    'Beim Wechsel der Kontaktart von PERSON zu ORGANISATION wird die Organisations-Zuordnung automatisch entfernt',
    'Organisationen zeigen in der Detailansicht ihre zugeordneten Personen (mitarbeiter-Relation)',
    'Die Kontaktliste kann nach Kontaktart gefiltert werden',
    'Organisations-Kontakte k\u00f6nnen auch Tags besitzen \u2014 Tags sind kontaktart-unabh\u00e4ngig',
]
for rule in ka_rules:
    add_bullet(rule)

# ============ BISHERIGE MODULE (REFERENZ) ============
doc.add_page_break()
doc.add_paragraph('Bisherige Module (Referenz)', style='SectionHead')

doc.add_paragraph(
    'Die vollst\u00e4ndige Dokumentation der Module 1\u201312 ist in den vorherigen Versionen '
    '(v1.0\u2013v1.4) des Content Engineering Dokuments enthalten. Nachfolgend eine Kurz\u00fcbersicht:'
)

ref_items = [
    ('Module 1\u20139 (v1.0):', 'Dashboard, Klienten, Intake, Einsatzplanung, Arbeitspl\u00e4tze, Berufsbilder, Berichtswesen, Abrechnungen, Kontakte'),
    ('Modul 10 (v1.1):', 'Benutzerverwaltung mit RBAC, Soft-Delete, User-Kontakt-Verkn\u00fcpfung'),
    ('Modul 11 (v1.2):', 'Meetings mit konfigurierbaren Typen, Audioaufnahme, Echtzeit-Transkription, KI-Protokollerstellung'),
    ('Modul 12 (v1.3):', 'Meeting-Planer mit Wochenkalender, ICS-Einladungen per E-Mail, Meeting-Er\u00f6ffnung aus Termin'),
    ('Modul 4 Erweiterung (v1.4):', 'Einsatzplanung \u2014 Mutation bestehender Einsatzpl\u00e4ne und Duplizierung als neue Eins\u00e4tze'),
]
for prefix, text in ref_items:
    add_bullet(text, prefix)

# ============ TESTBENUTZER ============
doc.add_paragraph('Testbenutzer', style='SectionHead')
doc.add_paragraph('Alle Passw\u00f6rter: Test123!')

tbl_users = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_users, ['E-Mail', 'Rolle', 'Kontaktverkn\u00fcpfung'])
users = [
    ('admin@klientenmanagement.de', 'Admin', '\u2014'),
    ('fallmanager@klientenmanagement.de', 'Fallmanager', 'Thomas Berger (Betreuer)'),
    ('planer@klientenmanagement.de', 'Einsatzplaner', '\u2014'),
    ('team@klientenmanagement.de', 'Teamleitung', '\u2014'),
    ('buchhaltung@klientenmanagement.de', 'Buchhalter', '\u2014'),
]
for e, r, k in users:
    add_data_row(tbl_users, [e, r, k])

# ============ FOOTER ============
section = doc.sections[0]
footer = section.footer
footer_para = footer.paragraphs[0]
footer_para.text = 'BANDspirit \u2014 Content Engineering Dokument v1.5'
footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
for run in footer_para.runs:
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)

# Save
outpath = '/home/ubuntu/klientenmanagement/nextjs_space/public/BANDspirit_Content_Engineering_v1.5.docx'
doc.save(outpath)
print(f'Dokument gespeichert: {outpath}')
