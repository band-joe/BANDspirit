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

def add_table_row(table, cells_data, bold=False, bg_color=None):
    row = table.add_row()
    for i, text in enumerate(cells_data):
        cell = row.cells[i]
        cell.text = ''
        p = cell.paragraphs[0]
        r = p.add_run(str(text))
        r.font.size = Pt(9.5)
        r.font.name = 'Calibri'
        if bold:
            r.bold = True
        if bg_color:
            from docx.oxml.ns import qn
            shading = cell._element.makeelement(qn('w:shd'), {
                qn('w:val'): 'clear',
                qn('w:color'): 'auto',
                qn('w:fill'): bg_color,
            })
            cell._element.get_or_add_tcPr = lambda: cell._element.find(qn('w:tcPr')) or cell._element.makeelement(qn('w:tcPr'), {})
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
r2 = p.add_run('Version 1.3')
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

# ============ ÄNDERUNGSHISTORIE ============
doc.add_paragraph('\u00c4nderungshistorie', style='SectionHead')

table = doc.add_table(rows=1, cols=3, style='Table Grid')
table.alignment = WD_TABLE_ALIGNMENT.LEFT
for i, h in enumerate(['Version', 'Datum', '\u00c4nderungen']):
    cell = table.rows[0].cells[i]
    cell.text = ''
    r = cell.paragraphs[0].add_run(h)
    r.bold = True
    r.font.size = Pt(9.5)
    r.font.name = 'Calibri'

changes = [
    ('1.3', '05.05.2026', 'Modul 12: Meeting-Planer \u2014 Wochenkalender, ICS-Einladungen, Meeting-Er\u00f6ffnung'),
    ('1.2', '05.05.2026', 'Modul 11: Meetings, Transkription, KI-Protokoll; Security Hardening'),
    ('1.1', '05.05.2026', 'Modul 10: Benutzerverwaltung, User-Kontakt-Verkn\u00fcpfung'),
    ('1.0', '30.04.2026', 'Initiale Version, Module 1\u20139'),
]
for v, d, c in changes:
    row = table.add_row()
    for i, t in enumerate([v, d, c]):
        cell = row.cells[i]
        cell.text = ''
        r = cell.paragraphs[0].add_run(t)
        r.font.size = Pt(9.5)
        r.font.name = 'Calibri'

# ============ MODULE OVERVIEW ============
doc.add_paragraph('Modul\u00fcbersicht', style='SectionHead')

table2 = doc.add_table(rows=1, cols=3, style='Table Grid')
for i, h in enumerate(['#', 'Modul', 'Beschreibung']):
    cell = table2.rows[0].cells[i]
    cell.text = ''
    r = cell.paragraphs[0].add_run(h)
    r.bold = True
    r.font.size = Pt(9.5)

modules = [
    ('1', 'Dashboard', 'KPI-Karten, Aktivit\u00e4ten, Workflows'),
    ('2', 'Klienten', 'Stammdaten CRUD, 360\u00b0-Ansicht'),
    ('3', 'Intake', 'Checklisten-Workflow'),
    ('4', 'Einsatzplanung', 'Listen-/Statusansicht'),
    ('5', 'Arbeitspl\u00e4tze', 'Kapazit\u00e4ts-Dashboard'),
    ('6', 'Berufsbilder', 'Katalog, Kompetenz-Tags'),
    ('7', 'Berichtswesen', 'Vorlagen, PDF-Export'),
    ('8', 'Abrechnungen', 'Freigabe-Workflow, DATEV-Export'),
    ('9', 'Kontakte', 'Kontaktpersonen, M:N-Zuordnung'),
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

# ============ MODUL 12: MEETING-PLANER ============
doc.add_paragraph('Modul 12: Meeting-Planer (v1.3)', style='SectionHead')

doc.add_paragraph('Zweck', style='SubSectionHead')
doc.add_paragraph('Der Meeting-Planer erm\u00f6glicht die vorausschauende Terminplanung von Besprechungen. Geplante Meetings werden in einer grafischen Wochenansicht dargestellt. Teilnehmende erhalten automatisch eine Kalendereinladung (ICS-Datei) per E-Mail. Aus einem geplanten Termin kann direkt ein Protokoll-Meeting (Modul 11) er\u00f6ffnet werden.')

doc.add_paragraph('Funktionale Anforderungen', style='SubSectionHead')

reqs = [
    ('FR-12.1 Zukunftsplanung:', 'Meetings k\u00f6nnen ausschlie\u00dflich in der Zukunft erfasst werden. Server-seitige Validierung stellt sicher, dass das Startdatum nach dem aktuellen Zeitpunkt liegt.'),
    ('FR-12.2 Wochenkalender:', 'Grafische Darstellung aller geplanten Termine auf einer Wochensicht (Mo\u2013So, 07:00\u201320:00). Navigation per Vor/Zur\u00fcck-Buttons und \u201eHeute\u201c-Schnellzugriff. Kalenderwochen-Anzeige (KW). Farbcodierung nach Meeting-Typ.'),
    ('FR-12.3 Meeting-Erstellung:', 'Dialog zur Erfassung von: Titel (Pflicht), Start-/Enddatum (Pflicht), Ort, Meeting-Typ (Pflicht), Beschreibung. Klick auf einen Wochentag \u00f6ffnet den Dialog mit vorausgef\u00fclltem Datum.'),
    ('FR-12.4 Teilnehmerverwaltung:', 'Teilnehmer aus drei Quellen: Klienten (Modul 2), Kontakte (Modul 9), externe E-Mail-Adressen. Suchfunktion f\u00fcr Personen mit Typ-Kennzeichnung (K/Ko).'),
    ('FR-12.5 ICS-Einladung:', 'Beim Erstellen eines Meetings erhalten alle Teilnehmer mit hinterlegter E-Mail-Adresse automatisch eine ICS-Kalendereinladung. Format: iCalendar (RFC 5545), METHOD:REQUEST. 15-Minuten-Erinnerung (VALARM).'),
    ('FR-12.6 Status-Workflow:', 'GEPLANT \u2192 BEST\u00c4TIGT \u2192 DURCHGEF\u00dcHRT oder GEPLANT \u2192 ABGESAGT. Abgesagte Termine werden halbtransparent dargestellt.'),
    ('FR-12.7 Meeting er\u00f6ffnen:', 'Aus einem geplanten Termin wird per Klick ein neues Meeting (Modul 11) erstellt. Alle Daten (Titel, Typ, Teilnehmer, Ort, Beschreibung) werden \u00fcbernommen. Der geplante Termin erh\u00e4lt Status DURCHGEF\u00dcHRT und wird mit dem Meeting verkn\u00fcpft.'),
    ('FR-12.8 Detailansicht:', 'Dialog mit allen Meeting-Informationen: Status-Badge, Teilnehmerliste mit Einladungsstatus (\u2713 gesendet), Verkn\u00fcpfung zum durchgef\u00fchrten Meeting.'),
]
for prefix, text in reqs:
    add_bullet(text, prefix)

doc.add_paragraph('Datenmodell', style='SubSectionHead')

# GeplantesMeeting table
doc.add_paragraph('GeplantesMeeting')
table3 = doc.add_table(rows=1, cols=3, style='Table Grid')
for i, h in enumerate(['Feld', 'Typ', 'Beschreibung']):
    cell = table3.rows[0].cells[i]
    cell.text = ''
    r = cell.paragraphs[0].add_run(h)
    r.bold = True
    r.font.size = Pt(9)

fields_gm = [
    ('id', 'UUID', 'Prim\u00e4rschl\u00fcssel'),
    ('titel', 'String', 'Meeting-Titel'),
    ('beschreibung', 'Text?', 'Agenda / Hinweise'),
    ('datum', 'DateTime', 'Startdatum und -uhrzeit'),
    ('datumEnde', 'DateTime', 'Enddatum und -uhrzeit'),
    ('ort', 'String?', 'Ort / Raum'),
    ('meetingTypId', 'String', 'FK \u2192 MeetingTyp'),
    ('status', 'Enum', 'GEPLANT, BESTAETIGT, ABGESAGT, DURCHGEFUEHRT'),
    ('meetingId', 'String? (unique)', 'FK \u2192 Meeting (nach Er\u00f6ffnung)'),
    ('erstelltVonId', 'String', 'FK \u2192 User (Ersteller)'),
]
for f, t, d in fields_gm:
    row = table3.add_row()
    for i, text in enumerate([f, t, d]):
        cell = row.cells[i]
        cell.text = ''
        r = cell.paragraphs[0].add_run(text)
        r.font.size = Pt(9)

# GeplantesMeetingTeilnehmer table
doc.add_paragraph('\nGeplantesMeetingTeilnehmer')
table4 = doc.add_table(rows=1, cols=3, style='Table Grid')
for i, h in enumerate(['Feld', 'Typ', 'Beschreibung']):
    cell = table4.rows[0].cells[i]
    cell.text = ''
    r = cell.paragraphs[0].add_run(h)
    r.bold = True
    r.font.size = Pt(9)

fields_gt = [
    ('id', 'UUID', 'Prim\u00e4rschl\u00fcssel'),
    ('geplantesMeetingId', 'String', 'FK \u2192 GeplantesMeeting'),
    ('klientId', 'String?', 'FK \u2192 Klient (optional)'),
    ('kontaktId', 'String?', 'FK \u2192 Kontakt (optional)'),
    ('email', 'String?', 'E-Mail f\u00fcr Einladung'),
    ('einladungGesendet', 'Boolean', 'ICS-Einladung versendet?'),
]
for f, t, d in fields_gt:
    row = table4.add_row()
    for i, text in enumerate([f, t, d]):
        cell = row.cells[i]
        cell.text = ''
        r = cell.paragraphs[0].add_run(text)
        r.font.size = Pt(9)

doc.add_paragraph('RBAC-Berechtigungen', style='SubSectionHead')

table5 = doc.add_table(rows=1, cols=6, style='Table Grid')
for i, h in enumerate(['Berechtigung', 'ADMIN', 'TEAMLEITUNG', 'FALLMANAGER', 'EINSATZPLANER', 'BUCHHALTER']):
    cell = table5.rows[0].cells[i]
    cell.text = ''
    r = cell.paragraphs[0].add_run(h)
    r.bold = True
    r.font.size = Pt(9)

perms = [
    ('meeting_planer:read', '\u2713', '\u2713', '\u2713', '\u2713', '\u2713'),
    ('meeting_planer:create', '\u2713', '\u2713', '\u2713', '', ''),
    ('meeting_planer:update', '\u2713', '\u2713', '\u2713', '', ''),
]
for row_data in perms:
    row = table5.add_row()
    for i, text in enumerate(row_data):
        cell = row.cells[i]
        cell.text = ''
        r = cell.paragraphs[0].add_run(text)
        r.font.size = Pt(9)
        if i > 0:
            cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

doc.add_paragraph('Technische Architektur', style='SubSectionHead')

tech_items = [
    ('ICS-Generator (lib/ics.ts):', 'Standalone-Modul zur Generierung standardkonformer iCalendar-Dateien (RFC 5545). Unterst\u00fctzt ORGANIZER, ATTENDEE, VALARM und alle relevanten Felder.'),
    ('E-Mail-Versand:', 'Plattform-eigene Notification-API. ICS als Base64-kodierter Anhang. HTML-formatierte E-Mail mit Meeting-Details.'),
    ('Wochenkalender:', 'Custom CSS Grid (7 Spalten \u00d7 14 Stundenslots). Responsive, Touch-optimiert. Events als absolut positionierte Elemente mit farbcodierter Darstellung.'),
    ('API-Endpunkte:', '/api/meeting-planner (GET, POST), /api/meeting-planner/[id] (GET, PUT, DELETE). Zod-basierte Validierung (geplantesMeetingSchema).'),
    ('Zukunftsvalidierung:', 'Server-seitig (datum > now()) und Client-seitig (automatische Anpassung auf n\u00e4chste volle Stunde).'),
]
for prefix, text in tech_items:
    add_bullet(text, prefix)

doc.add_paragraph('Gesch\u00e4ftsregeln', style='SubSectionHead')

rules = [
    'Meeting-Termin muss in der Zukunft liegen (Server-Validierung)',
    'Enddatum muss nach dem Startdatum liegen',
    'Ein geplantes Meeting kann nur einmal in ein Meeting \u00fcberf\u00fchrt werden (unique meetingId)',
    'ICS-Einladungen werden nur an Teilnehmer mit E-Mail-Adresse versendet',
    'Abgesagte Meetings bleiben im Kalender sichtbar (halbtransparent)',
]
for rule in rules:
    add_bullet(rule)

# ============ Footer ============
section = doc.sections[0]
footer = section.footer
footer_para = footer.paragraphs[0]
footer_para.text = 'BANDspirit \u2014 Content Engineering Dokument v1.3'
footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
for run in footer_para.runs:
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)

# Save
outpath = '/home/ubuntu/klientenmanagement/nextjs_space/public/BANDspirit_Content_Engineering_v1.3.docx'
doc.save(outpath)
print(f'Dokument gespeichert: {outpath}')
