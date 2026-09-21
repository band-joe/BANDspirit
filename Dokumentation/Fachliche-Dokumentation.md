# Fachliche Dokumentation

Geschäftsprozesse und Domänenmodell — BANDspirit V2

**Stand:** 2026-09-21 — aktualisierte Fassung von `Fachliche-Dokumentation.pdf` (Stand
2026-09-18). Die PDF-Datei ist als Vektorgrafik ohne extrahierbaren Text exportiert und
kann daher nicht direkt bearbeitet werden; diese Markdown-Datei übernimmt Struktur und
Inhalt, korrigiert veraltete Angaben (siehe **Änderungen gegenüber der PDF** am Ende) und
sollte künftig als Quelle für einen neuen PDF-Export dienen.

## 1. Überblick

BANDspirit ist ein webbasiertes Organisations- und Administrationssystem. Es bildet die
Organisationsstruktur nach Soziokratie 3.0 ab und stellt zentrale Verwaltungsfunktionen wie
Benutzerverwaltung, Rollenverwaltung, Stammdaten, BI-Kompass und BI-Guide bereit. Die
Applikation ist auf die Kern-Module **Organisation**, **Administration** und **Hilfe**
fokussiert.

## 2. Organisation (Soziokratie 3.0)

Das Modul «Organisation» bildet die Prinzipien der Soziokratie 3.0 ab und unterstützt die
partizipative Organisationsentwicklung bei BANDspirit.

### 2.1 Kreisstruktur (Fraktale Organisation)
Organisationseinheiten werden als Kreise (Circles) abgebildet. Jeder Kreis hat einen
definierten Purpose (Zweck) und eine Verantwortlichkeit. Kreise können hierarchisch
verschachtelt sein (Sub-Kreise, via `ParentId`/`RootId`). Interaktives Organigramm mit
SVG-Visualisierung. Ein Kreis wird nie hart gelöscht, sondern nur deaktiviert
(`IsActive = false`) — das erhält die Nachvollziehbarkeit im Application-Log.

### 2.2 Rollen & Rollenzuweisung
Innerhalb eines Kreises werden Rollen aus vordefinierten Rollendefinitionen gewählt.
Spezialrollen (als Flags auf der Kreisrolle): Koordinator, Vertreter (Repräsentant),
Facilitator. Eine Rollen-Vorlage (Rollendefinition) kann pro Kreis nur einmal als
Kreisrolle angelegt werden. Jede Kreisrolle erlaubt **0..n** zugewiesene Benutzer — es
gibt keine Kardinalitätssperre mehr auf Rollenebene (frühere Beschränkung entfernt).
Rollen werden analog zu Kreisen nur deaktiviert, nie hart gelöscht.

### 2.3 Double Linking
Zwischen Eltern- und Kindkreisen bestehen zwei Verbindungen: Der Koordinator (top-down)
und der Vertreter (bottom-up). Dieses Double Linking stellt sicher, dass Informationen in
beide Richtungen fliessen.

### 2.4 Consent-Entscheidungsprozess
Entscheidungen werden im Consent-Verfahren getroffen: Ein Vorschlag (Proposal) wird
vorgestellt, Einwände (Objections) werden erhoben und integriert. Erst wenn alle Einwände
integriert oder zurückgezogen sind, kann ein Consent-Entscheid (Decision) gefällt werden.

### 2.5 Governance-Meetings
Strukturierte Meetings mit Agenda-Management: Governance-Meetings
(Strukturentscheidungen), Operations-Meetings (operative Koordination) und
Retrospektiven. Status-Workflow: Geplant → Laufend → Abgeschlossen/Abgesagt.

### 2.6 Spannungen (Drivers) & WorkItems
Spannungen beschreiben Handlungsbedarf (Priorität + Status). Jede Spannung kann einen
Entscheid haben und 0:n WorkItems (Aufgaben) zugewiesen bekommen. Geschäftsregel: Status
«Erledigt» wird im UI erst freigegeben, wenn alle WorkItems erledigt sind; nach Erledigung
keine weitere Bearbeitung. Tab-basierte Übersicht über alle Kreise hinweg.

### 2.7 Life Cycle Prozess
Lifecycle-Management für Kreise mit **5 Phasen**: Entwurf → Aktiv → In Review → Ruhend →
Aufgelöst (konfigurierbare Stammdaten-Liste, `S3LebenszyklusPhasen`). Review-Prozess mit
Ergebnis (Weiterführen/Konsolidieren/Archivieren), Notizen und Massnahmen;
Standard-Review-Intervall 90 Tage.

### 2.8 OKR & KPI
Objectives & Key Results (OKR) sowie Kennzahlen (KPI) können **organisationsweit**
(kein zugeordneter Kreis) oder **kreisgebunden** geführt werden. OKR-Zyklen gruppieren
Objectives zeitlich; jedes Objective hat 0:n Key Results. KPI-Definitionen haben einen
Zielwert und 0:n Messungen (Measurements) mit Ampel-Status.

### 2.9 BI-Kompass
Versioniertes Markdown-Dokument für Organisations-Leitlinien. Neue Versionen werden
automatisch nummeriert. PDF-Upload mit **regelbasierter Text- und
Kapitel-Extraktion** (Bibliothek `UglyToad.PdfPig`): Der PDF-Text wird pro Seite anhand der
Wortpositionen zu Zeilen rekonstruiert und anhand der Kapitel-Nummerierung als Markdown
strukturiert — **keine KI-/LLM-gestützte Extraktion**. Bearbeitungsrecht: gemäss
Berechtigungsmodell (typischerweise Admin und Lead Link).

### 2.10 BI-Guide News
Internes News-Forum für Organisations-Informationen, gruppiert nach konfigurierbaren
Kategorien. Aktuelle News werden prominent auf dem Dashboard angezeigt.

## 3. Administration

Das Modul «Administration» bündelt die Verwaltungsfunktionen der Applikation.

### 3.1 Benutzerverwaltung
Anlegen, Bearbeiten und Deaktivieren von Benutzerkonten. Benutzer melden sich per
E-Mail/Passwort oder via Microsoft Entra ID (SSO) an; bei Entra-ID-Login werden neue
Konten bei Erstanmeldung automatisch angelegt (Just-in-Time-Provisionierung, immer mit
Standardrolle). Neue lokale Konten werden ausschliesslich durch Administratoren angelegt
(kein offenes Self-Signup) und müssen ihre E-Mail-Adresse über einen Bestätigungslink
verifizieren, bevor ein Login möglich ist. «Benutzer deaktivieren» löscht das Konto
**nicht**, sondern setzt es inaktiv.

### 3.2 Rollenverwaltung
Zwei getrennte Rollenkonzepte: **Benutzerrollen** (Applikationszugriff, z. B. Admin/User,
mit DB-basierten Einzelberechtigungen) und **Rollendefinitionen** (soziokratische
S3-Rollenvorlagen für Kreise, mit Zweck/Verantwortlichkeit/Kennzahlen/Dokumenten).
Benutzerrollen können ebenfalls nur deaktiviert, nie gelöscht werden.

### 3.3 Stammdaten
Generische, konfigurierbare Schlüssel/Wert-Listen (Kategorie + Code), z. B. Prioritäten.
Über die Stammdatenverwaltung um weitere Kategorien erweiterbar.

### 3.4 Mail-Verteiler
Gruppierte Empfängerlisten für interne Kommunikation, optional an einen Kreis oder eine
Rollendefinition gekoppelt (CSV-Export der Empfänger möglich).

### 3.5 Firma-Einstellungen
Zentrale Firmenstammdaten (Name, Adresse, Kontakt, Logo, Branding) als Singleton-Datensatz.

### 3.6 Application-Log
Lückenloses Audit-Log aller Entitäts-Änderungen (Create/Update/Delete mit Vorher-/
Nachher-Werten) sowie sicherheitsrelevanter Zugriffs-Ereignisse (401/403/Fehler-Codes),
filterbar nach Modul, Zeitraum und Suchtext.

## 4. Hilfe & Support

### 4.1 Support-Tickets
Alle Benutzer können Support-Tickets erstellen. Admins/Lead Links können Tickets
bearbeiten und beantworten. E-Mail-Benachrichtigung bei neuen Tickets.

### 4.2 FAQ
Häufig gestellte Fragen, gruppiert nach Kategorie. CRUD für Admins, Accordion-Ansicht für
alle Benutzer.

### 4.3 Globale Suche
Suche über zentrale Datenquellen: Benutzer, BI-Guide, FAQ, Tickets, Kreise. Ergebnisse
gruppiert nach Typ mit Verlinkung zur Quelle.

## 5. Rollenmodell

Berechtigungen sind vollständig DB-basiert (Tabelle `RolePermission`) und können über die
Rollenverwaltung angepasst werden — welche konkreten Benutzerrollen mit welchen
Berechtigungen im laufenden Betrieb existieren, ist damit eine Konfigurationsfrage der
jeweiligen Umgebung und nicht im Code fixiert. Werkseitig vorgesehen sind die zwei
Basisrollen:

| Rolle | Berechtigungsumfang |
|---|---|
| **Admin** | Vollzugriff auf alle Module inkl. Benutzerverwaltung, Stammdaten, Rollenverwaltung. |
| **User** | Grundrechte: Kreise/Rollen/Meetings/Drivers lesen, Dashboard, BI-Guide, FAQ lesen, Support-Tickets erstellen, Dokumentation lesen, KPI/OKR lesen. |

Darüber hinaus können beliebige weitere, fachlich benannte Rollen mit individuell
zusammengestellten Berechtigungen angelegt werden (z. B. rollenspezifische Zugriffsprofile
für einzelne Fachbereiche) — Berechtigungsumfang und Bezeichnung dieser Rollen sind pro
Umgebung/Mandant konfigurierbar.

## 6. Domänenmodell

Die zentralen Entitäten des Systems (vollständiges Klassendiagramm: siehe
`Backend-Klassendiagramm.puml`, vollständiges ERD: siehe `ERD-Datenmodell.puml`):

- **User** — Systembenutzer mit Rolle und Berechtigungen
- **Kreis** (S3Circle) — Organisationseinheit mit Zweck und Verantwortlichkeit (Soziokratie 3.0)
- **Rolle** (S3Role) / **Rollendefinition** (S3RollenDefinition) — Kreisrolle mit Accountabilities
- **Meeting** / **AgendaItem** — Governance-, Operations- und Retrospektive-Meetings
- **Proposal / Objection / Decision** — Consent-Entscheidungsprozess
- **Driver (Spannung)** / **WorkItem** — Organisatorische Treiber mit Aufgaben und Entscheid
- **CircleReview** / **CircleLebenszyklus** / **LebenszyklusPhase** — Life-Cycle-Reviews für Kreise
- **OKR** / **KeyResult** / **OkrZyklus** — Objectives & Key Results, organisationsweit oder kreisgebunden
- **KpiDefinition** / **KpiMeasurement** — Kennzahlen, organisationsweit oder kreisgebunden
- **Support-Ticket** / **FAQ** — Internes Hilfe-System
- **BIKompassVersion** — Versioniertes Organisations-Leitdokument
- **BIGuideNews** / **BiGuideKategorie** — Internes News-Forum
- **Stammdaten** — Konfigurierbare Schlüssel/Wert-Listen (z. B. Prioritäten)
- **Firma** — Firmeneinstellungen (Singleton)
- **BenutzerRolle** / **RolePermission** — DB-basierte Berechtigungssteuerung
- **MailVerteiler** / **MailVerteilerBenutzer** — Interne Empfängerlisten
- **AppLog** — Application-Log für Audit-Trail

**Audit-/Tracking-Standard:** Alle Entitäten erben von `AuditableEntity` und verfügen über
standardisierte Felder zur Nachverfolgung: `createdById` (Ersteller), `changedById`
(letzter Bearbeiter), `createdAt`, `updatedAt` (automatisch bei jeder Erstellung/Änderung
gesetzt) sowie ein optionales Gültigkeits-Zeitfenster `dateFrom`/`dateTo` ("Gültig
ab"/"Gültig bis"), das bei mehreren Entitäten (Kreise, Rollendefinitionen,
BI-Kompass-Versionen) im UI editierbar ist.

**Lösch-Policy:** Kreise, S3-Rollen und Benutzerrollen werden nie hart gelöscht, sondern
nur deaktiviert — das erhält die Konsistenz des Application-Logs (Audit-Einträge
referenzieren diese Entitäten über ihre ID weiter).

---

## Änderungen gegenüber der PDF (Stand 2026-09-18)

Beim Abgleich mit dem aktuellen Code wurden folgende Abweichungen der PDF-Fassung
festgestellt und in dieser Fassung korrigiert:

1. **Life-Cycle-Phasen (2.7):** PDF nannte 4 Phasen ("Anlage → Betrieb → Review →
   Archiviert"). Tatsächlich sind es 5, mit anderen Namen: Entwurf → Aktiv → In Review →
   Ruhend → Aufgelöst (`DataSeeder.cs`). Die in der PDF genannten aggregierten
   Prozent-KPIs ("Zweck+Lead ≥90%, Review in 90d ≥80%") werden serverseitig **nicht**
   berechnet (bewusst reduzierter Funktionsumfang, siehe Kommentar in
   `CircleLifecycleController.cs`) und wurden daher nicht übernommen.
2. **BI-Kompass PDF-Extraktion (2.9):** PDF sprach von "LLM-basierter Textextraktion".
   Tatsächlich verwendet `BiKompassController.cs` die deterministische Bibliothek
   `UglyToad.PdfPig` mit regelbasierter Kapitel-Erkennung — keine KI/LLM-Komponente.
3. **OKR & KPI (neuer Abschnitt 2.8):** In der PDF komplett gefehlt, obwohl ein
   vollständiges Modul (4 Controller, 3 Einstellungsseiten) existiert.
4. **Rollen-Kardinalität (2.2):** PDF erwähnte "Lead-Link-Erkennung (max. 1 pro Kreis)"
   im Sinne einer Zuweisungssperre. Diese Sperre (`ErlaubtMehrfachbesetzung`) wurde per
   Business-Entscheid entfernt — jede Kreisrolle erlaubt jetzt 0..n zugewiesene Benutzer.
5. **Administration (neuer Abschnitt 3):** Die PDF nannte "Administration" in der
   Übersicht (Abschnitt 1) als Kern-Modul, hatte dafür aber keinen eigenen Inhaltsabschnitt
   (sie sprang von "Hilfe & Support" direkt zu "Rollenmodell"). Ergänzt.
6. **Lösch-Policy für Kreise/Rollen:** Neu (2026-09-21): Kreise und S3-Rollen werden nicht
   mehr gelöscht, nur noch deaktiviert (Business-Entscheid, Konsistenz des
   Application-Logs).
7. **Rollenmodell (Abschnitt 4/5):** Die in der PDF genannten vier konkreten Rollen
   ("Administrator", "Lead Link", "Fachperson Berufliche Integration",
   "Sachbearbeiter:in Vermittlung") sind keine Code-Konstanten, sondern
   Laufzeit-Konfiguration (DB-basiertes RBAC) dieser spezifischen Umgebung und daher aus
   dem Code nicht verifizierbar. Codeseitig fest vorgesehen sind nur "Admin" und "User"
   als Seed-Basisrollen; die vier in der PDF genannten Rollen wurden nicht übernommen, da
   ihre Aktualität nicht bestätigt werden konnte — bei Bedarf bitte anhand der aktuellen
   Rollenverwaltung (Einstellungen → Berechtigungen) verifizieren und ergänzen.
8. **Stammdaten-Beispiel:** PDF nannte "Geschlecht, Branche" als Beispiel-Kategorien.
   Codeseitig seed ist nur die Kategorie "Prioritaet"; da Stammdaten laufzeit-erweiterbar
   sind, wurde das Beispiel entsprechend generalisiert statt als falsch markiert.
9. **Audit-Standard:** Ergänzt um das bisher nicht erwähnte `dateFrom`/`dateTo`-Feld
   ("Gültig ab/bis"), das auf allen Entitäten existiert und bei mehreren aktiv genutzt wird.
