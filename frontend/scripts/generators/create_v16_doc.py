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
r2 = p.add_run('Version 1.6')
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
    ('1.6', '06.05.2026', 'Meeting-Planer: Betreuende Person (Kontakt) statt Berufsbild, Workflow-Reminder; Einsatzplanung: Stundenbasierte Planung'),
    ('1.5', '06.05.2026', 'Kontakt-Tags (Mehrfach-Tagging, Filterung, CRUD-Verwaltung), Kontaktart (Person/Organisation), Organisations-Zuordnung'),
    ('1.4', '06.05.2026', 'Modul 4 Erweiterung: Einsatzplanung \u2014 Mutation und Kopie'),
    ('1.3', '05.05.2026', 'Modul 12: Meeting-Planer \u2014 Wochenkalender, ICS-Einladungen'),
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
    ('1', 'Dashboard', 'KPI-Karten, Aktivit\u00e4ten, Workflows, Reminder-\u00dcbersicht (v1.6)'),
    ('2', 'Klienten', 'Stammdaten CRUD, 360\u00b0-Ansicht'),
    ('3', 'Intake', 'Checklisten-Workflow'),
    ('4', 'Einsatzplanung', 'Listen-/Statusansicht, Mutation/Kopie (v1.4), Stundenbasierte Planung (v1.6)'),
    ('5', 'Arbeitspl\u00e4tze', 'Kapazit\u00e4ts-Dashboard'),
    ('6', 'Berufsbilder', 'Katalog, Kompetenz-Tags'),
    ('7', 'Berichtswesen', 'Vorlagen, PDF-Export'),
    ('8', 'Abrechnungen', 'Freigabe-Workflow, DATEV-Export'),
    ('9', 'Kontakte', 'Kontaktpersonen, Tags, Kontaktart (v1.5), Betreuende Person (v1.6)'),
    ('10', 'Benutzerverwaltung', 'CRUD, RBAC, Soft-Delete (v1.1)'),
    ('11', 'Meetings', 'Aufnahme, Transkription, KI-Protokoll (v1.2)'),
    ('12', 'Meeting-Planer', 'Wochenkalender, Betreuende Person, Workflow-Reminder (v1.6)'),
    ('13', 'Workflow-Items', 'Aufgaben-/Reminder-System f\u00fcr betreuende Personen (v1.6)'),
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

# ============================================================
# V1.6 ANFORDERUNG A: BETREUENDE PERSON IM MEETING-PLANER
# ============================================================
doc.add_paragraph('Anforderung A: Betreuende Person im Meeting-Planer (v1.6)', style='SectionHead')

doc.add_paragraph('\u00dcbersicht', style='SubSectionHead')
doc.add_paragraph(
    'Beim Erstellen eines geplanten Meetings \u00fcber den Meeting-Planer wird das bisherige Feld '
    '\u201eBerufsbild\u201c durch ein neues Feld \u201eBetreuende Person\u201c (Kontakt) ersetzt. '
    'Die betreuende Person ist ein Kontakt aus dem Kontaktmodul und wird dem Meeting als '
    'verantwortliche Betreuungsperson zugeordnet. Diese Zuordnung dient als Grundlage f\u00fcr '
    'automatische Workflow-Reminder (siehe Anforderung B).'
)

doc.add_paragraph('Ist-Analyse', style='SubSectionHead')
doc.add_paragraph(
    'Das Modell GeplantesMeeting enth\u00e4lt aktuell folgende Felder: '
    'titel, beschreibung, datum, datumEnde, ort, meetingTypId, status, meetingId (Verkn\u00fcpfung '
    'zum durchgef\u00fchrten Meeting), erstelltVonId, teilnehmer (M:N \u00fcber GeplantesMeetingTeilnehmer).\n\n'
    'Es existiert kein Feld f\u00fcr eine betreuende Person. Die Teilnehmerliste enth\u00e4lt Klienten, '
    'Kontakte und externe E-Mail-Adressen \u2014 ohne Unterscheidung einer besonderen Rolle wie '
    '\u201eBetreuungsperson\u201c. Ein Berufsbild-Feld existiert am Meeting-Planer nicht direkt, '
    'jedoch am Einsatzplan-Modell (berufsbildId). Die Anforderung zielt darauf ab, diese '
    'strukturelle L\u00fccke durch eine explizite Kontakt-Zuordnung zu schlie\u00dfen.'
)

# --- FR-12.1 DATENMODELL ---
doc.add_paragraph('FR-12.1: Datenmodell \u2014 Betreuende Person', style='SubSectionHead')

doc.add_paragraph('Das Modell GeplantesMeeting wird um folgende Felder erweitert:')

tbl_bp = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_bp, ['Feld', 'Typ', 'Beschreibung'])

bp_rows = [
    ('betreuendePersonId', 'String? (FK \u2192 Kontakt)', 'Optionaler Verweis auf einen Kontakt, der als betreuende Person f\u00fcr dieses Meeting fungiert'),
    ('betreuendePerson', 'Kontakt? (Relation)', 'Navigations-Eigenschaft zur betreuenden Person'),
]
for f, t, d in bp_rows:
    add_data_row(tbl_bp, [f, t, d])

doc.add_paragraph(
    '\nGeschäftsregeln:'
)

bp_rules = [
    'Die betreuende Person muss ein aktiver Kontakt sein (aktiv = true)',
    'Die betreuende Person kann, muss aber nicht gleichzeitig Teilnehmer des Meetings sein',
    'Beim Erstellen eines Meetings ist die betreuende Person optional, wird aber empfohlen',
    'Die betreuende Person wird separat von der Teilnehmerliste verwaltet (eigenes Feld, keine Rolle in Teilnehmer)',
    'Der Kontakt-Typ der betreuenden Person ist nicht eingeschr\u00e4nkt (Betreuer, Sozialarbeiter, etc.)',
    'Wird ein Meeting er\u00f6ffnet (GeplantesMeeting \u2192 Meeting), wird die betreuende Person in das er\u00f6ffnete Meeting \u00fcbernommen',
]
for rule in bp_rules:
    add_bullet(rule)

# --- FR-12.2 API ---
doc.add_paragraph('FR-12.2: API-Erweiterungen \u2014 Betreuende Person', style='SubSectionHead')

tbl_bp_api = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_bp_api, ['Endpunkt', '\u00c4nderung', 'Details'])

bp_api_rows = [
    ('POST /api/meeting-planner', 'Erweitert', 'Neuer optionaler Parameter betreuendePersonId (String). Wird validiert gegen aktive Kontakte'),
    ('PUT /api/meeting-planner/[id]', 'Erweitert', 'betreuendePersonId kann gesetzt, ge\u00e4ndert oder entfernt werden'),
    ('GET /api/meeting-planner', 'Erweitert', 'betreuendePerson (id, vorname, nachname, organisation) in Response enthalten'),
    ('GET /api/meeting-planner/[id]', 'Erweitert', 'betreuendePerson vollst\u00e4ndig in Response enthalten'),
    ('POST /api/meeting-planner/[id]/eroeffnen', 'Erweitert', 'betreuendePersonId wird bei Meeting-Er\u00f6ffnung an das Meeting-Modell weitergegeben'),
]
for e, a, d in bp_api_rows:
    add_data_row(tbl_bp_api, [e, a, d])

# --- FR-12.3 UI ---
doc.add_paragraph('FR-12.3: UI-Erweiterungen \u2014 Betreuende Person', style='SubSectionHead')

bp_ui_items = [
    ('Meeting-Erstellungsformular:', 'Neues Dropdown-Feld \u201eBetreuende Person\u201c unterhalb der Teilnehmerliste. Durchsuchbare Kontaktliste mit Filter nach aktiven Kontakten. Anzeige: Vorname Nachname (Organisation). Optional \u2014 kann leer gelassen werden.'),
    ('Meeting-Detailansicht (Kalender):', 'Betreuende Person als eigene Zeile im Detail-Panel mit Icon und klickbarem Link zum Kontakt-Detail.'),
    ('Meeting-Bearbeitungsdialog:', 'Betreuende Person \u00e4nderbar im Bearbeitungsmodus mit gleichem Dropdown wie bei Erstellung.'),
    ('Wochenkalender-Ansicht:', 'Optionale Anzeige des Namens der betreuenden Person auf dem Kalender-Event-Block.'),
]
for prefix, text in bp_ui_items:
    add_bullet(text, prefix)

doc.add_page_break()

# ============================================================
# V1.6 ANFORDERUNG B: WORKFLOW-ITEMS / REMINDER
# ============================================================
doc.add_paragraph('Anforderung B: Workflow-Items / Reminder-System (v1.6)', style='SectionHead')

doc.add_paragraph('\u00dcbersicht', style='SubSectionHead')
doc.add_paragraph(
    'Wird einem geplanten Meeting eine betreuende Person zugeordnet, wird automatisch ein '
    'Workflow-Item (Reminder) erstellt. Dieses Workflow-Item erscheint als offene Aufgabe '
    'im Dashboard und auf einer dedizierten \u00dcbersichtsseite. Der Reminder informiert die '
    'betreuende Person (bzw. den zust\u00e4ndigen Fallmanager) \u00fcber das anstehende Meeting '
    'und kann als erledigt markiert werden.'
)

doc.add_paragraph('Ist-Analyse', style='SubSectionHead')
doc.add_paragraph(
    'Aktuell existiert kein Aufgaben- oder Reminder-System in BANDspirit. Offene Workflows '
    'werden \u00fcber das Dashboard als Aggregation (offene Intakes, Berichte im Entwurf, '
    'offene Abrechnungen je Bearbeiter) dargestellt \u2014 es handelt sich dabei jedoch um '
    'abgeleitete Z\u00e4hler, nicht um eigenst\u00e4ndige Aufgaben-Entit\u00e4ten. '
    'Ein dediziertes Reminder-Modell fehlt.'
)

# --- FR-13.1 DATENMODELL ---
doc.add_paragraph('FR-13.1: Datenmodell \u2014 WorkflowItem', style='SubSectionHead')

doc.add_paragraph('Neues Modell WorkflowItem:')

tbl_wf = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_wf, ['Feld', 'Typ', 'Beschreibung'])

wf_rows = [
    ('id', 'String (UUID)', 'Prim\u00e4rschl\u00fcssel'),
    ('typ', 'WorkflowItemTyp (Enum)', 'Art des Workflow-Items: MEETING_REMINDER, ALLGEMEIN (erweiterbar)'),
    ('titel', 'String', 'Kurzbeschreibung der Aufgabe (z.\u202fB. \u201eMeeting-Vorbereitung: Hilfeplangespr\u00e4ch\u201c)'),
    ('beschreibung', 'String? (Text)', 'Optionale ausf\u00fchrliche Beschreibung'),
    ('faelligAm', 'DateTime', 'F\u00e4lligkeitsdatum/-zeit des Reminders'),
    ('status', 'WorkflowItemStatus (Enum)', 'OFFEN, IN_BEARBEITUNG, ERLEDIGT, STORNIERT'),
    ('prioritaet', 'WorkflowItemPrioritaet (Enum)', 'NIEDRIG, NORMAL, HOCH, DRINGEND'),
    ('zustaendigerKontaktId', 'String (FK \u2192 Kontakt)', 'Die betreuende Person, f\u00fcr die der Reminder gilt'),
    ('zustaendigerUserId', 'String? (FK \u2192 User)', 'Optionaler Benutzer, dem die Aufgabe zugewiesen ist'),
    ('geplantesMeetingId', 'String? (FK \u2192 GeplantesMeeting)', 'Verkn\u00fcpfung zum ausl\u00f6senden geplanten Meeting (bei MEETING_REMINDER)'),
    ('klientId', 'String? (FK \u2192 Klient)', 'Optionaler Klienten-Bezug'),
    ('erstelltVonId', 'String (FK \u2192 User)', 'Ersteller des Workflow-Items'),
    ('erledigtAm', 'DateTime?', 'Zeitstempel der Erledigung'),
    ('erledigtVonId', 'String? (FK \u2192 User)', 'Benutzer, der das Item als erledigt markiert hat'),
    ('createdAt', 'DateTime', 'Erstellungszeitpunkt'),
    ('updatedAt', 'DateTime', 'Letzte \u00c4nderung'),
]
for f, t, d in wf_rows:
    add_data_row(tbl_wf, [f, t, d])

doc.add_paragraph('\nNeue Enums:')

tbl_enums = doc.add_table(rows=1, cols=2, style='Table Grid')
make_header_row(tbl_enums, ['Enum', 'Werte'])

enum_rows = [
    ('WorkflowItemTyp', 'MEETING_REMINDER, ALLGEMEIN'),
    ('WorkflowItemStatus', 'OFFEN, IN_BEARBEITUNG, ERLEDIGT, STORNIERT'),
    ('WorkflowItemPrioritaet', 'NIEDRIG, NORMAL, HOCH, DRINGEND'),
]
for e, w in enum_rows:
    add_data_row(tbl_enums, [e, w])

doc.add_paragraph('\nGesch\u00e4ftsregeln:')

wf_rules = [
    'Beim Erstellen eines GeplantesMeeting mit betreuendePersonId wird automatisch ein WorkflowItem vom Typ MEETING_REMINDER erstellt',
    'Der Titel des Reminders wird automatisch generiert: \u201eMeeting-Vorbereitung: {Meetingtitel}\u201c',
    'Das F\u00e4lligkeitsdatum (faelligAm) wird standardm\u00e4\u00dfig auf 24 Stunden vor dem Meeting-Datum gesetzt',
    'Der zustaendigerKontaktId verweist auf die betreuende Person',
    'Optional kann \u00fcber zustaendigerUserId ein BANDspirit-Benutzer zugewiesen werden (z.\u202fB. Fallmanager)',
    'Wird das Meeting abgesagt (Status \u2192 ABGESAGT), wird der zugeh\u00f6rige Reminder automatisch auf STORNIERT gesetzt',
    'Wird die betreuende Person nachtr\u00e4glich ge\u00e4ndert, wird der bestehende Reminder aktualisiert (neuer zustaendigerKontaktId)',
    'Wird die betreuende Person entfernt, wird der zugeh\u00f6rige Reminder auf STORNIERT gesetzt',
    'Ein Reminder kann manuell als ERLEDIGT markiert werden \u2014 dies \u00e4ndert nicht den Meeting-Status',
    'Workflow-Items sind generisch modelliert und k\u00f6nnen sp\u00e4ter f\u00fcr weitere Typen erweitert werden (z.\u202fB. Bericht-Reminder, Abrechnungs-Frist)',
]
for rule in wf_rules:
    add_bullet(rule)

# --- FR-13.2 API ---
doc.add_paragraph('FR-13.2: API-Endpunkte \u2014 WorkflowItem', style='SubSectionHead')

tbl_wf_api = doc.add_table(rows=1, cols=4, style='Table Grid')
make_header_row(tbl_wf_api, ['Pfad', 'Methode', 'Beschreibung', 'Berechtigung'])

wf_api_rows = [
    ('/api/workflow-items', 'GET', 'Liste aller Workflow-Items. Filter: status, typ, zustaendigerUserId, faelligVon/Bis. Sortierung: faelligAm ASC', 'workflow:read'),
    ('/api/workflow-items', 'POST', 'Manuell ein Workflow-Item erstellen (Typ ALLGEMEIN)', 'workflow:create'),
    ('/api/workflow-items/[id]', 'GET', 'Einzelnes Workflow-Item mit Relationen', 'workflow:read'),
    ('/api/workflow-items/[id]', 'PUT', 'Status\u00e4nderung, Beschreibung, Zust\u00e4ndigkeit \u00e4ndern', 'workflow:update'),
    ('/api/workflow-items/[id]/erledigt', 'POST', 'Shortcut: Status \u2192 ERLEDIGT setzen', 'workflow:update'),
    ('/api/workflow-items/dashboard', 'GET', 'Aggregierte Z\u00e4hler f\u00fcr Dashboard-Widget (offen, \u00fcberf\u00e4llig, heute f\u00e4llig)', 'workflow:read'),
]
for p, m, d, b in wf_api_rows:
    add_data_row(tbl_wf_api, [p, m, d, b])

# --- FR-13.3 UI ---
doc.add_paragraph('FR-13.3: UI \u2014 Workflow-Items', style='SubSectionHead')

wf_ui_items = [
    ('Dashboard-Widget:', 'Neue KPI-Karte \u201eOffene Reminder\u201c mit Z\u00e4hler. Untergliederung: \u00dcberf\u00e4llig (rot), Heute f\u00e4llig (gelb), Kommende 7 Tage (gr\u00fcn). Klick f\u00fchrt zur Workflow-Items-\u00dcbersicht.'),
    ('Workflow-Items-Seite (/workflow-items):', 'Tabellarische/Kartenansicht aller offenen Workflow-Items. Filter: Status, Typ, Zust\u00e4ndiger, Zeitraum. Schnellaktion: \u201eErledigt\u201c-Button direkt in der Liste. Verkn\u00fcpfungs-Link zum Meeting-Planer (falls MEETING_REMINDER).'),
    ('Meeting-Planer Detailansicht:', 'Anzeige des zugeh\u00f6rigen Workflow-Items mit Status-Badge. Direkt-Link zur Workflow-Item-Detailseite.'),
    ('Sidebar-Navigation:', 'Neuer Navigationseintrag \u201eAufgaben\u201c mit Badge-Counter f\u00fcr offene Items.'),
]
for prefix, text in wf_ui_items:
    add_bullet(text, prefix)

# --- FR-13.4 BERECHTIGUNGEN ---
doc.add_paragraph('FR-13.4: Berechtigungen \u2014 WorkflowItem', style='SubSectionHead')

tbl_wf_perms = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_wf_perms, ['Aktion', 'Berechtigung', 'Rollen'])

wf_perm_rows = [
    ('Workflow-Items lesen', 'workflow:read', 'Alle Rollen'),
    ('Workflow-Items erstellen (manuell)', 'workflow:create', 'ADMIN, FALLMANAGER, TEAMLEITUNG'),
    ('Workflow-Items bearbeiten / erledigen', 'workflow:update', 'ADMIN, FALLMANAGER, TEAMLEITUNG'),
]
for a, b, r in wf_perm_rows:
    add_data_row(tbl_wf_perms, [a, b, r])

doc.add_page_break()

# ============================================================
# V1.6 ANFORDERUNG C: EINSATZPLANUNG STUNDENBASIERT
# ============================================================
doc.add_paragraph('Anforderung C: Stundenbasierte Einsatzplanung (v1.6)', style='SectionHead')

doc.add_paragraph('\u00dcbersicht', style='SubSectionHead')
doc.add_paragraph(
    'Die Einsatzplanung wird von einer rein wochenbasierten Stundenzuweisung '
    '(stundenWoche als Dezimalwert) zu einer stundenbasierten Planung erweitert. '
    'Ein Einsatzplan kann nun auf Stundenbasis genau geplant werden \u2014 inklusive '
    'konkreter Wochentage und Uhrzeiten. Dies erm\u00f6glicht eine pr\u00e4zise Kapazit\u00e4tsplanung '
    'und Kollisionserkennung auf Arbeitsplatzebene.'
)

doc.add_paragraph('Ist-Analyse', style='SubSectionHead')
doc.add_paragraph(
    'Das aktuelle Einsatzplan-Modell enth\u00e4lt:\n'
    '\u2022 klientId, arbeitsplatzId, berufsbildId (optional)\n'
    '\u2022 startDatum, endDatum (optional)\n'
    '\u2022 stundenWoche (Decimal) \u2014 Wochenstunden als einzelner Wert\n'
    '\u2022 status (GEPLANT, AKTIV, PAUSIERT, BEENDET)\n\n'
    'Es fehlt eine granulare Zeitplanung: welche Wochentage, welche Uhrzeiten, '
    'wie viele Stunden pro Tag. Die Kapazit\u00e4tspr\u00fcfung erfolgt derzeit nur auf '
    'Gesamtwochenstunden-Ebene.'
)

# --- FR-4.5 DATENMODELL ---
doc.add_paragraph('FR-4.5: Datenmodell \u2014 Stundenbasierte Planung', style='SubSectionHead')

doc.add_paragraph('Neues Modell EinsatzZeitblock:')

tbl_ez = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_ez, ['Feld', 'Typ', 'Beschreibung'])

ez_rows = [
    ('id', 'String (UUID)', 'Prim\u00e4rschl\u00fcssel'),
    ('einsatzplanId', 'String (FK \u2192 Einsatzplan)', 'Zugeordneter Einsatzplan'),
    ('wochentag', 'Wochentag (Enum)', 'Tag der Woche (MO, DI, MI, DO, FR, SA, SO)'),
    ('startZeit', 'String', 'Beginn des Zeitblocks im Format HH:MM (z.\u202fB. \u201e08:00\u201c)'),
    ('endZeit', 'String', 'Ende des Zeitblocks im Format HH:MM (z.\u202fB. \u201e16:30\u201c)'),
    ('pause', 'Int (Minuten)', 'Pausendauer in Minuten (Standard: 0)'),
    ('notiz', 'String?', 'Optionale Notiz zum Zeitblock'),
    ('aktiv', 'Boolean', 'Ob der Zeitblock aktiv ist (Standard: true)'),
    ('createdAt', 'DateTime', 'Erstellungszeitpunkt'),
    ('updatedAt', 'DateTime', 'Letzte \u00c4nderung'),
]
for f, t, d in ez_rows:
    add_data_row(tbl_ez, [f, t, d])

doc.add_paragraph('\nNeues Enum:')

tbl_wt_enum = doc.add_table(rows=1, cols=2, style='Table Grid')
make_header_row(tbl_wt_enum, ['Enum', 'Werte'])
add_data_row(tbl_wt_enum, ['Wochentag', 'MO, DI, MI, DO, FR, SA, SO'])

doc.add_paragraph('\nErweiterung Einsatzplan-Modell:')

tbl_ep_ext = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_ep_ext, ['Feld', 'Typ', 'Beschreibung'])

ep_ext_rows = [
    ('zeitbloecke', 'EinsatzZeitblock[] (Relation)', 'Liste der w\u00f6chentlichen Zeitbl\u00f6cke'),
    ('betreuendePersonId', 'String? (FK \u2192 Kontakt)', 'Betreuende Person f\u00fcr diesen Einsatz (ersetzt/erg\u00e4nzt Berufsbild-Kontext)'),
]
for f, t, d in ep_ext_rows:
    add_data_row(tbl_ep_ext, [f, t, d])

doc.add_paragraph('\nGesch\u00e4ftsregeln:')

ez_rules = [
    'Ein Einsatzplan kann beliebig viele Zeitbl\u00f6cke haben (z.\u202fB. Mo 08:00\u201312:00, Mi 13:00\u201317:00)',
    'Zeitbl\u00f6cke d\u00fcrfen sich innerhalb eines Einsatzplans nicht \u00fcberlappen',
    'Die Summe aller Zeitblock-Stunden (abz\u00fcglich Pausen) wird als berechnetes Feld stundenWocheBerechnet bereitgestellt',
    'Das bestehende Feld stundenWoche bleibt als manueller \u00dcberschreibungswert erhalten (Abw\u00e4rtskompatibilit\u00e4t)',
    'startZeit muss vor endZeit liegen (Validierung)',
    'Kapazit\u00e4tspr\u00fcfung wird auf Zeitblock-Ebene erweitert: Kollisionen auf Arbeitsplatz + Wochentag + Zeitfenster werden erkannt',
    'Zeitbl\u00f6cke k\u00f6nnen nur bei Status GEPLANT oder AKTIV ge\u00e4ndert werden',
    'Beim Kopieren eines Einsatzplans (FR-4.2) werden Zeitbl\u00f6cke mit\u00fcbernommen',
]
for rule in ez_rules:
    add_bullet(rule)

# --- FR-4.6 API ---
doc.add_paragraph('FR-4.6: API-Erweiterungen \u2014 Stundenbasierte Planung', style='SubSectionHead')

tbl_ez_api = doc.add_table(rows=1, cols=3, style='Table Grid')
make_header_row(tbl_ez_api, ['Endpunkt', '\u00c4nderung', 'Details'])

ez_api_rows = [
    ('POST /api/einsatzplaene', 'Erweitert', 'Neuer optionaler Parameter zeitbloecke[]: Array von {wochentag, startZeit, endZeit, pause?}. Neuer Parameter betreuendePersonId'),
    ('PUT /api/einsatzplaene/[id]', 'Erweitert', 'zeitbloecke[] kann aktualisiert werden (Delete + Re-Create in Transaktion). betreuendePersonId \u00e4nderbar'),
    ('GET /api/einsatzplaene', 'Erweitert', 'zeitbloecke und betreuendePerson in Response. Neuer Filter: wochentag'),
    ('GET /api/einsatzplaene/[id]', 'Erweitert', 'zeitbloecke, betreuendePerson und stundenWocheBerechnet in Response'),
    ('POST /api/einsatzplaene/[id]/kopie', 'Erweitert', 'Zeitbl\u00f6cke werden mitkopiert'),
    ('GET /api/arbeitsplaetze/[id]/belegung', 'Neu', 'Gibt die Belegung eines Arbeitsplatzes pro Wochentag/Stunde zur\u00fcck (f\u00fcr Kollisionserkennung)'),
]
for e, a, d in ez_api_rows:
    add_data_row(tbl_ez_api, [e, a, d])

# --- FR-4.7 UI ---
doc.add_paragraph('FR-4.7: UI-Erweiterungen \u2014 Stundenbasierte Planung', style='SubSectionHead')

ez_ui_items = [
    ('Einsatz-Erstellungsformular:', 'Neuer Bereich \u201eWochenplan\u201c unterhalb der Basisdaten. Tabellarische Eingabe: Pro Wochentag eine Zeile mit Startzeit, Endzeit, Pause. Zeilen k\u00f6nnen hinzugef\u00fcgt/entfernt werden. Automatische Berechnung der Wochenstunden. Neues Dropdown \u201eBetreuende Person\u201c (Kontakt-Selektor).'),
    ('Einsatz-Detailansicht:', 'Visualisierung des Wochenplans als kompakte Tabelle (Mo\u2013So mit Zeiten). Betreuende Person als klickbarer Link. Berechnete vs. manuelle Wochenstunden-Anzeige.'),
    ('Einsatz-Bearbeitungsmodus:', 'Zeitbl\u00f6cke inline editierbar. Kollisionswarnungen in Echtzeit (roter Rahmen bei \u00dcberlappung mit anderem Einsatz am gleichen Arbeitsplatz).'),
    ('Arbeitsplatz-Kapazit\u00e4tsansicht:', 'Erweiterte Ansicht mit stundenbasierter Belegung pro Wochentag. Visuelle Darstellung als Heatmap oder Balkendiagramm.'),
]
for prefix, text in ez_ui_items:
    add_bullet(text, prefix)

doc.add_page_break()

# ============================================================
# ZUSAMMENFASSUNG V1.6
# ============================================================
doc.add_paragraph('Zusammenfassung: \u00c4nderungen v1.6', style='SectionHead')

doc.add_paragraph(
    'Version 1.6 f\u00fchrt drei zusammenh\u00e4ngende Erweiterungen ein, die das Meeting- und '
    'Einsatzmanagement signifikant verbessern:'
)

summary_items = [
    ('A) Betreuende Person im Meeting-Planer:', 'Ein Kontakt wird als betreuende Person einem geplanten Meeting zugeordnet. Dies ersetzt die konzeptionelle Verkn\u00fcpfung \u00fcber Berufsbilder durch eine direkte Personenzuordnung.'),
    ('B) Workflow-Items / Reminder:', 'Neues Modul 13 \u2014 ein generisches Aufgaben-/Reminder-System. Automatische Erstellung bei Meeting-Planung mit betreuender Person. Dashboard-Integration und dedizierte \u00dcbersichtsseite.'),
    ('C) Stundenbasierte Einsatzplanung:', 'Einsatzpl\u00e4ne k\u00f6nnen mit konkreten Wochentagen und Uhrzeiten geplant werden. Kollisionserkennung auf Arbeitsplatz-Zeitblock-Ebene. Betreuende Person auch am Einsatzplan.'),
]
for prefix, text in summary_items:
    add_bullet(text, prefix)

doc.add_paragraph('\nNeue Datenmodelle:', style='SubSectionHead')

new_models_items = [
    'WorkflowItem (id, typ, titel, beschreibung, faelligAm, status, prioritaet, zustaendigerKontaktId, zustaendigerUserId, geplantesMeetingId, klientId, erstelltVonId, erledigtAm, erledigtVonId)',
    'EinsatzZeitblock (id, einsatzplanId, wochentag, startZeit, endZeit, pause, notiz, aktiv)',
]
for item in new_models_items:
    add_bullet(item)

doc.add_paragraph('\nNeue Enums:', style='SubSectionHead')

new_enums_items = [
    'WorkflowItemTyp: MEETING_REMINDER, ALLGEMEIN',
    'WorkflowItemStatus: OFFEN, IN_BEARBEITUNG, ERLEDIGT, STORNIERT',
    'WorkflowItemPrioritaet: NIEDRIG, NORMAL, HOCH, DRINGEND',
    'Wochentag: MO, DI, MI, DO, FR, SA, SO',
]
for item in new_enums_items:
    add_bullet(item)

doc.add_paragraph('\nErweiterte Modelle:', style='SubSectionHead')

ext_models_items = [
    'GeplantesMeeting: +betreuendePersonId (FK \u2192 Kontakt)',
    'Einsatzplan: +zeitbloecke (Relation), +betreuendePersonId (FK \u2192 Kontakt)',
    'Meeting: +betreuendePersonId (FK \u2192 Kontakt) \u2014 \u00fcbernommen bei Meeting-Er\u00f6ffnung',
]
for item in ext_models_items:
    add_bullet(item)

doc.add_paragraph('\nNeue RBAC-Berechtigungen:', style='SubSectionHead')

new_perms_items = [
    'workflow:read \u2014 Workflow-Items lesen (alle Rollen)',
    'workflow:create \u2014 Workflow-Items manuell erstellen (ADMIN, FALLMANAGER, TEAMLEITUNG)',
    'workflow:update \u2014 Workflow-Items bearbeiten/erledigen (ADMIN, FALLMANAGER, TEAMLEITUNG)',
]
for item in new_perms_items:
    add_bullet(item)

# ============ BISHERIGE MODULE (REFERENZ) ============
doc.add_page_break()
doc.add_paragraph('Bisherige Module (Referenz)', style='SectionHead')

doc.add_paragraph(
    'Die vollst\u00e4ndige Dokumentation der Module 1\u201312 ist in den vorherigen Versionen '
    '(v1.0\u2013v1.5) des Content Engineering Dokuments enthalten. Nachfolgend eine Kurz\u00fcbersicht:'
)

ref_items = [
    ('Module 1\u20139 (v1.0):', 'Dashboard, Klienten, Intake, Einsatzplanung, Arbeitspl\u00e4tze, Berufsbilder, Berichtswesen, Abrechnungen, Kontakte'),
    ('Modul 10 (v1.1):', 'Benutzerverwaltung mit RBAC, Soft-Delete, User-Kontakt-Verkn\u00fcpfung'),
    ('Modul 11 (v1.2):', 'Meetings mit Audioaufnahme, Transkription, KI-Protokollerstellung'),
    ('Modul 12 (v1.3):', 'Meeting-Planer mit Wochenkalender, ICS-Einladungen, Meeting-Er\u00f6ffnung'),
    ('Modul 4 Erweiterung (v1.4):', 'Einsatzplanung \u2014 Mutation und Kopie'),
    ('Modul 9 Erweiterung (v1.5):', 'Kontakt-Tags, Kontaktart (Person/Organisation), Organisations-Zuordnung, Tag-Verwaltungsseite'),
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
footer_para.text = 'BANDspirit \u2014 Content Engineering Dokument v1.6'
footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
for run in footer_para.runs:
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)

# Save
outpath = '/home/ubuntu/klientenmanagement/nextjs_space/public/BANDspirit_Content_Engineering_v1.6.docx'
doc.save(outpath)
print(f'Dokument gespeichert: {outpath}')
