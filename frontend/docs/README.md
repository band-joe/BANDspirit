# BANDspirit — Klientenmanagement-System

**Version 1.8** | Webbasiertes Klientenmanagement-System für soziale Dienstleister und Beschäftigungsträger.

**Live:** [bandkms.abacusai.app](https://bandkms.abacusai.app)

---

## Änderungshistorie

| Version | Datum | Änderungen |
|---|---|---|
| 1.4 | 2026-05-06 | Modul 4 Erweiterung: Einsatzplanung — Mutation und Kopie. Bestehende Einsatzpläne können nun mutiert (Felder bearbeiten: Arbeitsplatz, Stunden/Woche, Start-/Enddatum, Berufsbild) und kopiert (Duplikat als neuer GEPLANT-Einsatz) werden. Statusabhängige Mutationsregeln, Kapazitäts-Revalidierung, Audit-Logging für Feldänderungen. Neuer API-Endpunkt: `POST /api/einsatzplaene/[id]/kopie`. |
| 1.3 | 2026-05-05 | Modul 12: Meeting-Planer — Zukunftsplanung von Meetings mit Wochenkalender-Ansicht, ICS-Kalendereinladungen per E-Mail, Teilnehmerverwaltung (Klienten/Kontakte/externe E-Mails), und Überführung geplanter Termine in durchgeführte Meetings (Modul 11). Neue RBAC-Berechtigungen (`meeting_planer:read`, `meeting_planer:create`, `meeting_planer:update`). Neues Datenmodell: `GeplantesMeeting`, `GeplantesMeetingTeilnehmer`, `GeplantesMeetingStatus` Enum. |
| 1.2 | 2026-05-05 | Modul 11: Meetings mit konfigurierbaren Meeting-Typen (Customizing), Teilnehmern aus Klienten und Kontakten, Browser-basierter Audioaufnahme, Echtzeit-Transkription (Web Speech API), KI-gestützter Protokollerstellung (LLM-API). Neue RBAC-Berechtigungen (`meeting:read`, `meeting:create`, `meeting:update`, `meeting_typ:manage`). |
| 1.1 | 2026-05-05 | Modul 10: Benutzerverwaltung mit rollenbasierter Berechtigungsverwaltung. User-Kontakt-Verknüpfung (1:1 optional). Erweiterte RBAC-Berechtigungen (`user:read`, `user:create`, `user:update`, `user:delete`). Soft-Delete für Benutzer. Bidirektionale Navigation zwischen User und Kontakt. |
| 1.0 | 2026-04-30 | Initiale Version mit Modulen 1–9 (Dashboard, Klienten, Intake, Einsatzplanung, Arbeitsplätze, Berufsbilder, Berichtswesen, Abrechnungen, Kontakte). |

---

## Überblick

Das System steuert den vollständigen Lebenszyklus eines Klienten — vom Intake über die Einsatzplanung bis hin zur Abrechnung. Es bietet rollenbasierte Zugriffskontrolle, Benutzerverwaltung, Kontaktverwaltung, Berichtswesen und einen mehrstufigen Abrechnungs-Workflow mit DATEV-Export.

## Module

| # | Modul | Beschreibung |
|---|---|---|
| 1 | **Dashboard** | KPI-Karten, letzte Aktivitäten, offene Workflows je Bearbeiter |
| 2 | **Klienten** | Stammdaten CRUD, 360°-Ansicht (Tabs: Stammdaten, Intake, Einsätze, Kontakte) |
| 3 | **Intake** | Checklisten-Workflow (OFFEN → IN_BEARBEITUNG → ABGESCHLOSSEN) |
| 4 | **Einsatzplanung** | Listen-/Statusansicht mit Geschäftsregeln, Mutation und Kopie *(v1.4)* |
| 5 | **Arbeitsplätze** | Kapazitäts-Dashboard mit Auslastungs-Anzeige |
| 6 | **Berufsbilder** | Katalog mit Kompetenz-Tags, Branchenfilter, Arbeitsplatz-Zuordnung (M:N) |
| 7 | **Berichtswesen** | Vorlagen mit Platzhaltervariablen, Freitext-Felder, Druckansicht/PDF-Export |
| 8 | **Abrechnungen** | Mehrstufiger Freigabe-Workflow, DATEV-CSV-Export, Audit-Log-Timeline |
| 9 | **Kontakte** | Kontaktpersonen-Verwaltung mit Zuordnung zu Klienten (M:N) |
| 10 | **Benutzerverwaltung** | Benutzer CRUD, Rollenzuweisung, Kontaktverknüpfung, Soft-Delete *(v1.1)* |
| 11 | **Meetings** | Meeting-Verwaltung mit konfigurierbaren Typen, Teilnehmer aus Klienten/Kontakten, Aufnahme, Transkription, KI-Protokoll *(v1.2)* |
| 12 | **Meeting-Planer** | Zukunftsplanung mit Wochenkalender, ICS-Einladungen per E-Mail, Meeting-Eröffnung aus Termin *(v1.3)* |

## Rollen & Berechtigungen (RBAC)

| Rolle | Schwerpunkte |
|---|---|
| **ADMIN** | Vollzugriff auf alle Module inkl. Benutzerverwaltung, Customizing und Meeting-Planer |
| **FALLMANAGER** | Klienten, Intake, Berichte, Kontakte, Meetings (CRUD), Meeting-Planer (CRUD) |
| **EINSATZPLANER** | Einsätze, Arbeitsplätze, Berufsbilder, Meetings (lesen), Meeting-Planer (lesen) |
| **TEAMLEITUNG** | Alles lesen + genehmigen, Kontakte, Benutzer (lesen), Meetings + Meeting-Planer (CRUD) |
| **BUCHHALTER** | Abrechnungen erstellen/prüfen/exportieren, Leistungskatalog, Meetings + Meeting-Planer (lesen) |

### Berechtigungsschlüssel (v1.3)

| Bereich | Berechtigungen |
|---|---|
| Klienten | `klient:create`, `klient:read`, `klient:update`, `klient:delete` |
| Intake | `intake:create`, `intake:read`, `intake:update` |
| Einsatz | `einsatz:create`, `einsatz:read`, `einsatz:update` |
| Arbeitsplatz | `arbeitsplatz:create`, `arbeitsplatz:read`, `arbeitsplatz:update` |
| Berufsbild | `berufsbild:create`, `berufsbild:read`, `berufsbild:update` |
| Bericht | `bericht:create`, `bericht:read`, `bericht:update`, `bericht_template:manage` |
| Abrechnung | `abrechnung:create`, `abrechnung:read`, `abrechnung:pruefen`, `abrechnung:genehmigen`, `abrechnung:exportieren` |
| Leistung | `leistung:manage` |
| Kontakte | `kontakt:create`, `kontakt:read`, `kontakt:update` |
| Benutzer | `user:read`, `user:create`, `user:update`, `user:delete`, `user:manage` |
| **Meetings** | `meeting:read`, `meeting:create`, `meeting:update`, `meeting_typ:manage` |
| **Meeting-Planer** | `meeting_planer:read`, `meeting_planer:create`, `meeting_planer:update` |
| Dashboard | `dashboard:read` |

### Berechtigungsmatrix (Benutzer + Meetings + Meeting-Planer)

| Berechtigung | ADMIN | TEAMLEITUNG | FALLMANAGER | EINSATZPLANER | BUCHHALTER |
|---|:---:|:---:|:---:|:---:|:---:|
| `user:read` | ✓ | ✓ | | | |
| `user:create` | ✓ | | | | |
| `user:update` | ✓ | | | | |
| `user:delete` | ✓ | | | | |
| `user:manage` | ✓ | | | | |
| `meeting:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `meeting:create` | ✓ | ✓ | ✓ | | |
| `meeting:update` | ✓ | ✓ | ✓ | | |
| `meeting_typ:manage` | ✓ | | | | |
| `meeting_planer:read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `meeting_planer:create` | ✓ | ✓ | ✓ | | |
| `meeting_planer:update` | ✓ | ✓ | ✓ | | |

## Modul 10: Benutzerverwaltung (v1.1)

### Funktionen
- **Benutzerliste** — Tabellarische Übersicht mit Suche, Rollenfilter und Statusfilter
- **Benutzer erstellen** — Name, E-Mail, Passwort, Rollenzuweisung, Kontaktverknüpfung
- **Benutzer bearbeiten** — Inline-Bearbeitung aller Felder inkl. Passwort-Reset
- **Rollenverwaltung** — 5 Rollen (Admin, Teamleitung, Fallmanager, Einsatzplaner, Buchhalter)
- **Kontaktverknüpfung** — Optionale 1:1-Verknüpfung mit einem Kontakt (bidirektional)
- **Soft-Delete** — Benutzer werden deaktiviert statt gelöscht (Referenzintegrität)
- **Selbstschutz** — Admin kann eigene Rolle/Status nicht ändern, sich nicht selbst löschen
- **Aktivitätsübersicht** — Zähler für Intakes, Berichte, Abrechnungen, Audit-Einträge

### User-Kontakt-Verknüpfung
- Ein Kontakt kann gleichzeitig ein User sein (z.B. Betreuer, der sowohl Systembenutzer als auch Kontaktperson ist)
- Die Verknüpfung erfolgt auf der User-Seite (`User.kontaktId → Kontakt.id`, 1:1 optional)
- Auf der Kontakt-Detailseite wird der verknüpfte User angezeigt
- Ein Kontakt kann nur einem User zugeordnet werden (unique Constraint)

## Modul 11: Meetings (v1.2)

### Funktionen
- **Meeting-Typen (Customizing)** — Administratoren können Meeting-Arten frei definieren (z.B. Fallkonferenz, Hilfeplangespräch, Teambesprechung, Einzelgespräch, Supervision)
- **Meeting erstellen** — Titel, Datum/Uhrzeit, Dauer, Ort, Meeting-Typ, Notizen
- **Teilnehmer** — Teilnehmer aus zwei Quellen:
  - **Klienten** (Modul 2) — Klienten können als Teilnehmer hinzugefügt werden
  - **Kontakte** (Modul 9) — Kontaktpersonen (Betreuer, Ärzte, Behörden etc.) können als Teilnehmer hinzugefügt werden
  - Teilnehmerrolle im Meeting beschreibbar (z.B. „Protokollführer", „Fallverantwortlich")
- **Audioaufnahme** — Browser-basierte Aufnahme des Meetings via MediaRecorder API
- **Echtzeit-Transkription** — Web Speech API (SpeechRecognition) für Echtzeit-Umwandlung Sprache → Text
- **KI-Protokollerstellung** — LLM-API (Plattform-integriert) generiert aus der Transkription:
  - Strukturierte Zusammenfassung
  - Beschlüsse und Maßnahmen
  - Offene Punkte / Aufgaben
- **Meetingliste** — Tabellarische Übersicht mit Suche, Filter nach Typ und Datum

### Meeting-Typen (Customizing)
- Frei konfigurierbare Meeting-Arten über eigene Verwaltungsseite
- Felder: Bezeichnung, Beschreibung, Farbe (für visuelle Unterscheidung), Aktiv-Flag
- Nur ADMIN hat Zugriff auf Customizing (`meeting_typ:manage`)
- Deaktivierte Typen werden bei Neuanlage nicht angezeigt, bestehende Meetings behalten ihren Typ

### Datenmodell (v1.2)

#### MeetingTyp (Customizing)
| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID | Primärschlüssel |
| bezeichnung | String | Name des Meeting-Typs |
| beschreibung | String? | Optionale Beschreibung |
| farbe | String | Hex-Farbcode für Badges (z.B. #2196f3) |
| aktiv | Boolean | Aktiv-Flag für Customizing |
| createdAt | DateTime | Erstellungszeitpunkt |

#### Meeting
| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID | Primärschlüssel |
| titel | String | Meeting-Titel |
| datum | DateTime | Datum und Uhrzeit |
| dauer | Int? | Dauer in Minuten |
| ort | String? | Ort / Raum |
| meetingTypId | String | FK → MeetingTyp |
| notizen | Text? | Freitext-Notizen |
| transkription | Text? | Transkribierter Text (Web Speech API) |
| zusammenfassung | Text? | KI-generierte Zusammenfassung |
| erstelltVonId | String | FK → User (Ersteller) |
| createdAt | DateTime | Erstellungszeitpunkt |
| updatedAt | DateTime | Letzte Änderung |

#### MeetingTeilnehmer
| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID | Primärschlüssel |
| meetingId | String | FK → Meeting |
| klientId | String? | FK → Klient (optional) |
| kontaktId | String? | FK → Kontakt (optional) |
| rolle | String? | Rolle im Meeting (z.B. „Protokollführer") |
| createdAt | DateTime | Erstellungszeitpunkt |

> **Hinweis:** Ein Teilnehmer ist entweder ein Klient ODER ein Kontakt (exklusiv). Es muss genau eines der beiden Felder gesetzt sein.

### Technische Umsetzung

#### Audioaufnahme
- **MediaRecorder API** (Browser) für Audio-Aufnahme
- Start/Stop/Pause-Steuerung in der Meeting-Detailseite
- Audio wird lokal im Browser verarbeitet (kein Upload nötig)

#### Transkription
- **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`)
- Echtzeit-Anzeige des transkribierten Texts während der Aufnahme
- Sprache: Deutsch (`de-DE`)
- Ergebnis wird im `transkription`-Feld gespeichert

#### KI-Zusammenfassung
- **LLM-API** (Plattform) generiert aus Transkription ein strukturiertes Protokoll
- Streaming-Antwort für Echtzeit-Fortschritt
- Prompt: Deutsche Sprache, Fokus auf Beschlüsse, Maßnahmen, offene Punkte
- Ergebnis wird im `zusammenfassung`-Feld gespeichert

## Modul 12: Meeting-Planer (v1.3)

### Funktionen
- **Zukunftsplanung** — Meetings können nur in der Zukunft erfasst werden (Server-seitige Validierung)
- **Wochenkalender-Ansicht** — Grafische Darstellung aller geplanten Meetings auf einer Wochensicht (Mo–So, 07:00–20:00)
  - Wochennavigation vor/zurück, „Heute"-Button, KW-Anzeige
  - Klick auf Wochentag öffnet Erstelldialog mit vorausgefülltem Datum
  - Events farbcodiert nach Meeting-Typ, mit Titel, Uhrzeit und Ort
- **Meeting-Planung (CRUD)** — Erstellung und Bearbeitung geplanter Meetings mit:
  - Titel, Start- und Enddatum, Ort, Meeting-Typ, Beschreibung
  - Teilnehmer aus Klienten (Modul 2) und Kontakten (Modul 9)
  - Zusätzliche externe E-Mail-Adressen als Teilnehmer
- **ICS-Kalendereinladung per E-Mail** — Beim Erstellen eines Meetings erhalten alle Teilnehmer mit E-Mail-Adresse eine Einladung:
  - ICS-Datei (iCalendar, RFC 5545) als Anhang
  - HTML-formatierte E-Mail mit Meeting-Details
  - Erinnerung (VALARM) 15 Minuten vor Beginn
- **Meeting-Status-Workflow** — `GEPLANT → BESTÄTIGT → DURCHGEFÜHRT` oder `GEPLANT → ABGESAGT`
- **Meeting eröffnen** — Aus einem geplanten Termin wird direkt ein neues Meeting (Modul 11) erstellt:
  - Alle Daten (Titel, Typ, Teilnehmer, Ort) werden übernommen
  - Der geplante Termin wird auf Status „DURCHGEFÜHRT" gesetzt und mit dem Meeting verknüpft
  - Weiterleitung zur Meeting-Detailseite (Aufnahme, Transkription, KI-Protokoll)
- **Detailansicht** — Dialog mit allen Informationen, Status-Badge, Teilnehmerliste mit Einladungsstatus
- **Absage** — Geplante Meetings können abgesagt werden (Soft-Status-Änderung, abgesagte Einträge werden halbtransparent dargestellt)

### Datenmodell (v1.3)

#### GeplantesMeeting
| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID | Primärschlüssel |
| titel | String | Meeting-Titel |
| beschreibung | Text? | Agenda / Hinweise |
| datum | DateTime | Startdatum und -uhrzeit |
| datumEnde | DateTime | Enddatum und -uhrzeit |
| ort | String? | Ort / Raum |
| meetingTypId | String | FK → MeetingTyp |
| status | GeplantesMeetingStatus | Status (GEPLANT, BESTAETIGT, ABGESAGT, DURCHGEFUEHRT) |
| meetingId | String? (unique) | FK → Meeting (nach Eröffnung) |
| erstelltVonId | String | FK → User (Ersteller) |
| createdAt | DateTime | Erstellungszeitpunkt |
| updatedAt | DateTime | Letzte Änderung |

#### GeplantesMeetingTeilnehmer
| Feld | Typ | Beschreibung |
|---|---|---|
| id | UUID | Primärschlüssel |
| geplantesMeetingId | String | FK → GeplantesMeeting |
| klientId | String? | FK → Klient (optional) |
| kontaktId | String? | FK → Kontakt (optional) |
| email | String? | E-Mail-Adresse (für Einladungen) |
| einladungGesendet | Boolean | Ob ICS-Einladung versendet wurde |
| createdAt | DateTime | Erstellungszeitpunkt |

#### GeplantesMeetingStatus (Enum)
- `GEPLANT` — Termin geplant, noch nicht bestätigt
- `BESTAETIGT` — Termin bestätigt
- `ABGESAGT` — Termin abgesagt
- `DURCHGEFUEHRT` — Termin durchgeführt, Meeting (Modul 11) eröffnet

### ICS-Generierung
- Standardkonformes iCalendar-Format (RFC 5545)
- METHOD:REQUEST für Einladungen
- VALARM mit 15-Minuten-Erinnerung
- Organisator (ORGANIZER) = Ersteller des geplanten Meetings
- Teilnehmer (ATTENDEE) = alle Teilnehmer mit E-Mail-Adresse
- ICS-Datei wird als Base64-kodierter Anhang per E-Mail versendet

### Technische Umsetzung
- **ICS-Generator** (`lib/ics.ts`): Standalone-Modul für iCalendar-Generierung
- **E-Mail-Versand**: Über die Plattform-eigene Notification-API (kein externer Dienst)
- **Wochenkalender**: Custom CSS Grid mit 7 Spalten (Wochentage) × 14 Zeilen (Stundenslots)
- **Zukunftsvalidierung**: Server-seitig (Datum > jetzt) und Client-seitig (automatische Anpassung)

> **Hinweis zur Ollama-Anbindung:** Die Plattform bietet eine integrierte LLM-API, die dieselbe Funktionalität wie Ollama bietet (Textverarbeitung, Zusammenfassung, Analyse). Eine direkte Ollama-Anbindung ist in der gehosteten Umgebung nicht möglich, da Ollama einen dedizierten Server benötigt. Sollte zukünftig ein eigener Ollama-Server bereitgestellt werden, kann der LLM-Endpunkt in der API-Route ausgetauscht werden.

## Modul 4 Erweiterung: Einsatzplanung — Mutation und Kopie (v1.4)

### Übersicht

Bestehende Einsatzpläne können nach der Erstellung **mutiert** (Feldänderungen) und **kopiert** (Duplizierung als neuer Einsatzplan) werden. Die Erweiterung berücksichtigt statusabhängige Einschränkungen, Geschäftsregel-Revalidierung und lückenlose Audit-Protokollierung.

### Funktionale Anforderungen

#### FR-4.1: Einsatzplan mutieren (Feldbearbeitung)

Ein bestehender Einsatzplan kann in folgenden Feldern bearbeitet werden:

| Feld | Typ | Beschreibung |
|---|---|---|
| arbeitsplatzId | String | Zuordnung zu einem anderen Arbeitsplatz |
| berufsbildId | String? | Zuordnung zu einem anderen/keinem Berufsbild |
| stundenWoche | Decimal | Wöchentliche Arbeitsstunden |
| startDatum | DateTime | Beginn des Einsatzes |
| endDatum | DateTime? | Ende des Einsatzes (optional) |

**Statusabhängige Mutationsregeln:**

| Status | Mutation erlaubt? | Einschränkungen |
|---|:---:|---|
| GEPLANT | ✓ Vollständig | Alle Felder frei editierbar |
| AKTIV | ✓ Eingeschränkt | Nur `stundenWoche`, `endDatum`, `berufsbildId` änderbar. `arbeitsplatzId` und `startDatum` gesperrt (da Einsatz bereits läuft). |
| PAUSIERT | ✓ Eingeschränkt | Wie AKTIV — nur `stundenWoche`, `endDatum`, `berufsbildId` änderbar |
| BEENDET | ✗ Gesperrt | Keine Mutation möglich (abgeschlossener Einsatz) |

**Geschäftsregeln bei Mutation:**
- **Kapazitätsprüfung:** Bei Änderung von `arbeitsplatzId` wird die Kapazität des neuen Arbeitsplatzes geprüft (aktive Einsätze < maxKapazitaet). Die Kapazität des alten Arbeitsplatzes wird freigegeben.
- **Datumsvalidierung:** `endDatum` muss nach `startDatum` liegen (falls gesetzt). `startDatum` darf nicht in der Vergangenheit geändert werden bei GEPLANT-Status.
- **Klient-Validierung:** `klientId` ist **nicht** mutierbar — ein Einsatz bleibt immer dem ursprünglichen Klienten zugeordnet.
- **Audit-Log:** Jede Feldänderung wird im AuditLog mit Vor-/Nachwert protokolliert (Aktion: `EINSATZ_MUTIERT`).

**API-Erweiterung:**
- `PUT /api/einsatzplaene/[id]` — Erweitert um Feld-Mutation (zusätzlich zum bestehenden Status-Übergang). Der Request-Body kann nun sowohl `status` als auch Feldänderungen enthalten.

#### FR-4.2: Einsatzplan kopieren (Duplizierung)

Ein bestehender Einsatzplan kann als Vorlage für einen neuen Einsatzplan dupliziert werden.

**Kopierverhalten:**
- Es wird ein **neuer** Einsatzplan erstellt mit Status `GEPLANT`
- Folgende Felder werden übernommen: `arbeitsplatzId`, `berufsbildId`, `stundenWoche`
- Folgende Felder werden **nicht** übernommen: `startDatum`, `endDatum` (müssen neu gesetzt werden), `status` (immer GEPLANT)
- `klientId` wird übernommen — kann aber im Erstelldialog geändert werden

**Geschäftsregeln bei Kopie:**
- **Max. 1 aktiver Einsatz:** Die bestehende Regel (max. 1 aktiver Einsatz pro Klient) wird beim Kopieren beachtet. Da der kopierte Einsatz im Status GEPLANT startet, wird diese Regel erst bei der Aktivierung geprüft.
- **Kapazitätsprüfung:** Wird beim Kopieren **nicht** geprüft (erst bei Aktivierung relevant), da der neue Einsatz als GEPLANT erstellt wird.
- **Klient-Validierung:** Klient muss weiterhin AKTIV sein und einen abgeschlossenen Intake haben.

**Benutzerinteraktion:**
- In der Einsatzplan-Detailansicht und in der Listenansicht wird ein „Kopieren"-Button angezeigt
- Beim Klick öffnet sich das Einsatzplan-Erstellformular, vorausgefüllt mit den Daten des Quell-Einsatzes
- Der Benutzer kann alle Felder vor dem Speichern anpassen
- Nach dem Speichern wird der neue Einsatzplan erstellt (der Quell-Einsatz bleibt unverändert)

**API-Endpunkt (neu):**
- `POST /api/einsatzplaene/[id]/kopie` — Erstellt eine Kopie des Einsatzplans mit ID `[id]`. Gibt die kopierbaren Felder zurück, die im Erstelldialog vorausgefüllt werden.

#### FR-4.3: UI-Erweiterungen

- **Einsatzplan-Detailseite:** Neue Buttons „Bearbeiten" und „Kopieren" (kontextsensitiv je nach Status und Berechtigung)
- **Einsatzplan-Listenansicht:** Kontextmenü mit Optionen „Bearbeiten", „Kopieren"
- **Bearbeitungsmodus:** Inline-Bearbeitung oder Modal-Dialog mit den mutierbaren Feldern (statusabhängig)
- **Validierungsfeedback:** Echtzeit-Validierung der Geschäftsregeln (Kapazität, Datumslogik) im Formular
- **Audit-Anzeige:** Mutationshistorie in der Detailansicht sichtbar (wer hat wann was geändert)

#### FR-4.4: Berechtigungen

Die Mutation und Kopie nutzen die bestehende Berechtigung `einsatz:update` (Mutation) und `einsatz:create` (Kopie). Keine neuen RBAC-Schlüssel erforderlich.

| Aktion | Berechtigung | Rollen |
|---|---|---|
| Einsatz mutieren | `einsatz:update` | ADMIN, EINSATZPLANER, TEAMLEITUNG |
| Einsatz kopieren | `einsatz:create` | ADMIN, EINSATZPLANER, TEAMLEITUNG |

### API-Endpunkte (v1.4)

| Pfad | Methode | Beschreibung |
|---|---|---|
| `/api/einsatzplaene/[id]` | PUT | **Erweitert** — Feld-Mutation + Status-Übergang |
| **`/api/einsatzplaene/[id]/kopie`** | **POST** | **Neu** — Einsatzplan kopieren (gibt Vorlagedaten zurück) |

### Geschäftsregeln (v1.4 — Ergänzungen)

- Einsatzplan-Mutation: Nur im Status GEPLANT vollständig editierbar; bei AKTIV/PAUSIERT eingeschränkt auf `stundenWoche`, `endDatum`, `berufsbildId`
- Einsatzplan-Mutation: Im Status BEENDET keine Feldänderungen möglich
- Einsatzplan-Mutation: Bei Arbeitsplatzwechsel Kapazitäts-Revalidierung (alter Platz freigeben, neuer Platz prüfen)
- Einsatzplan-Mutation: `klientId` ist unveränderbar (Zuordnung zum Klienten permanent)
- Einsatzplan-Mutation: Jede Änderung wird im AuditLog protokolliert (Aktion: `EINSATZ_MUTIERT`)
- Einsatzplan-Kopie: Erstellt neuen Einsatz im Status GEPLANT
- Einsatzplan-Kopie: Start-/Enddatum müssen neu vergeben werden
- Einsatzplan-Kopie: Max-1-aktiv-Regel wird erst bei Aktivierung geprüft

## Testbenutzer

Alle Passwort: `Test123!`

| E-Mail | Rolle | Kontaktverknüpfung |
|---|---|---|
| admin@klientenmanagement.de | Admin | — |
| fallmanager@klientenmanagement.de | Fallmanager | Thomas Berger (Betreuer) |
| planer@klientenmanagement.de | Einsatzplaner | — |
| team@klientenmanagement.de | Teamleitung | — |
| buchhaltung@klientenmanagement.de | Buchhalter | — |

## Technischer Stack

- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Datenbank:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js v4 (Credentials Provider, JWT)
- **UI:** shadcn/ui Komponenten, Framer Motion Animationen
- **Lokalisierung:** Alle UI-Texte auf Deutsch, UTF-8

## Datenmodell

### Kern-Entitäten
- **User** — Benutzer mit Rollen, optional verknüpft mit Kontakt (`kontaktId`, 1:1, v1.1)
- **Klient** — Stammdaten (Name, Geburtsdatum, SV-Nummer, Adresse, Status)
- **Kostenträger** — Zuweisende Behörde/Institution
- **Intake** — Aufnahme-Checkliste mit Workflow-Status
- **Arbeitsplatz** — Standort mit Kapazität
- **Einsatzplan** — Klient-Arbeitsplatz-Zuordnung mit Zeitraum

### Erweiterte Entitäten
- **Berufsbild** — Berufsprofile mit Kompetenzen (M:N zu Arbeitsplätzen)
- **BerichtTemplate** — HTML-Vorlagen mit Platzhaltern
- **Bericht** — Generierte Berichte auf Basis von Templates
- **Leistung** — Abrechnungskatalog (Einheit + Preis)
- **Abrechnung** — Abrechnungsposition mit mehrstufigem Workflow
- **AuditLog** — Protokollierung von Statusübergängen
- **Kontakt** — Kontaktpersonen (Arzt, Angehörige, Behörde, etc.), optional verknüpft mit User (v1.1)
- **KlientKontakt** — M:N-Zuordnung Klient ↔ Kontakt

### Enums
- **UserRole:** ADMIN, FALLMANAGER, EINSATZPLANER, TEAMLEITUNG, BUCHHALTER
- **KlientStatus:** AKTIV, INAKTIV, ARCHIVIERT
- **Geschlecht:** MAENNLICH, WEIBLICH, DIVERS
- **IntakeStatus:** OFFEN, IN_BEARBEITUNG, ABGESCHLOSSEN, ABGEBROCHEN
- **PlanStatus:** GEPLANT, AKTIV, PAUSIERT, BEENDET
- **Branche:** HANDWERK, IT, GASTRONOMIE, BUERO, SOZIALES, LOGISTIK, REINIGUNG, SONSTIGES
- **BerichtStatus:** ENTWURF, FERTIG
- **AbrechnungEinheit:** TAG, STUNDE, MONAT, PAUSCHALE
- **AbrechnungStatus:** ENTWURF, EINGEREICHT, GEPRUEFT, GENEHMIGT, ABGELEHNT, EXPORTIERT, STORNIERT
- **KontaktTyp:** BETREUER, ANGEHOERIGER, ARZT, BEHOERDE, ARBEITGEBER, THERAPEUT, SOZIALARBEITER, SONSTIGES
- **GeplantesMeetingStatus:** GEPLANT, BESTAETIGT, ABGESAGT, DURCHGEFUEHRT *(v1.3)*

## Geschäftsregeln

- Max. 1 aktiver Einsatz pro Klient
- Arbeitsplatz-Kapazität darf nicht überschritten werden
- Einsatz nur für AKTIVE Klienten mit abgeschlossenem Intake
- SV-Nummer Format: `XX XXXXXX X XXX` (Regex-Validierung)
- Geburtsdatum: Alter 14–120
- Abrechnungs-Workflow: rollenbasierte Übergänge (Buchhalter prüft, Teamleitung/Admin genehmigt)
- Benutzer-Deaktivierung statt Löschung (Soft-Delete, v1.1)
- Selbstschutz: Eigene Rolle/Status nicht änderbar, kein Self-Delete (v1.1)
- Kontakt-User-Verknüpfung: 1:1, ein Kontakt kann maximal einem User zugeordnet sein (v1.1)
- Geplante Meetings: Datum muss in der Zukunft liegen (v1.3)
- Geplante Meetings: Enddatum muss nach Startdatum liegen (v1.3)
- Geplante Meetings: Ein geplantes Meeting kann nur einmal in ein Meeting überführt werden (unique meetingId, v1.3)
- ICS-Einladungen werden nur an Teilnehmer mit E-Mail-Adresse versendet (v1.3)
- Einsatzplan-Mutation: Nur im Status GEPLANT vollständig editierbar; AKTIV/PAUSIERT eingeschränkt; BEENDET gesperrt (v1.4)
- Einsatzplan-Mutation: Bei Arbeitsplatzwechsel Kapazitäts-Revalidierung erforderlich (v1.4)
- Einsatzplan-Mutation: `klientId` ist unveränderbar (v1.4)
- Einsatzplan-Mutation: Jede Feldänderung wird im AuditLog protokolliert — `EINSATZ_MUTIERT` (v1.4)
- Einsatzplan-Kopie: Neuer Einsatz immer im Status GEPLANT, Start-/Enddatum müssen neu vergeben werden (v1.4)

## API-Endpunkte

| Pfad | Methoden | Beschreibung |
|---|---|---|
| `/api/dashboard` | GET | KPIs + offene Workflows |
| `/api/klienten` | GET, POST | Klienten-Liste und Erstellung |
| `/api/klienten/[id]` | GET, PUT | Klienten-Detail und Bearbeitung |
| `/api/intakes` | GET, POST | Intake-Liste und Erstellung |
| `/api/intakes/[id]` | GET, PUT | Intake-Detail und Bearbeitung |
| `/api/einsatzplaene` | GET, POST | Einsatzpläne |
| `/api/einsatzplaene/[id]` | GET, PUT | Einsatzplan-Detail, Feld-Mutation + Status-Übergang *(PUT erweitert v1.4)* |
| **`/api/einsatzplaene/[id]/kopie`** | **POST** | **Einsatzplan kopieren (v1.4)** |
| `/api/arbeitsplaetze` | GET, POST | Arbeitsplätze |
| `/api/arbeitsplaetze/[id]` | GET, PUT | Arbeitsplatz-Detail |
| `/api/berufsbilder` | GET, POST | Berufsbilder |
| `/api/berufsbilder/[id]` | GET, PUT | Berufsbild-Detail |
| `/api/bericht-templates` | GET | Berichtsvorlagen |
| `/api/berichte` | GET, POST | Berichte |
| `/api/berichte/[id]` | GET, PUT | Bericht-Detail |
| `/api/leistungen` | GET, POST | Leistungskatalog |
| `/api/abrechnungen` | GET, POST | Abrechnungen |
| `/api/abrechnungen/[id]` | GET | Abrechnung-Detail |
| `/api/abrechnungen/[id]/workflow` | POST | Workflow-Übergänge |
| `/api/abrechnungen/export` | GET | DATEV-CSV-Export |
| `/api/kontakte` | GET, POST | Kontakte |
| `/api/kontakte/[id]` | GET, PUT | Kontakt-Detail (inkl. verknüpfter User, v1.1) |
| `/api/klient-kontakte` | POST, DELETE | Klient-Kontakt-Zuordnung |
| `/api/kostentraeger` | GET | Kostenträger |
| `/api/users` | GET, POST | Benutzerliste und Erstellung (v1.1) |
| `/api/users/[id]` | GET, PUT, DELETE | Benutzer-Detail, Bearbeitung, Deaktivierung (v1.1) |
| **`/api/meeting-typen`** | **GET, POST** | **Meeting-Typen Customizing (v1.2)** |
| **`/api/meeting-typen/[id]`** | **PUT** | **Meeting-Typ bearbeiten (v1.2)** |
| **`/api/meetings`** | **GET, POST** | **Meetingliste und Erstellung (v1.2)** |
| **`/api/meetings/[id]`** | **GET, PUT** | **Meeting-Detail und Bearbeitung (v1.2)** |
| **`/api/meetings/[id]/zusammenfassung`** | **POST** | **KI-Protokollerstellung aus Transkription (v1.2)** |
| **`/api/meeting-planner`** | **GET, POST** | **Geplante Meetings — Liste und Erstellung (v1.3)** |
| **`/api/meeting-planner/[id]`** | **GET, PUT, DELETE** | **Geplantes Meeting — Detail, Bearbeitung, Absage (v1.3)** |

## Projektstruktur

```
nextjs_space/
├── app/
│   ├── (dashboard)/          # Geschützte Dashboard-Seiten
│   │   ├── dashboard/        # Startseite mit KPIs
│   │   ├── klienten/         # Klienten-Verwaltung
│   │   ├── intakes/          # Intake-Verwaltung
│   │   ├── einsatzplanung/   # Einsatzplanung
│   │   ├── arbeitsplaetze/   # Arbeitsplätze
│   │   ├── berufsbilder/     # Berufsbilder-Katalog
│   │   ├── berichte/         # Berichtswesen
│   │   ├── abrechnungen/     # Abrechnungsmodul
│   │   ├── kontakte/         # Kontakteverwaltung
│   │   ├── benutzer/         # Benutzerverwaltung (v1.1)
│   │   ├── meetings/         # Meeting-Verwaltung (v1.2)
│   │   ├── meeting-planer/   # Meeting-Planer mit Wochenkalender (v1.3)
│   │   └── customizing/      # Meeting-Typen Customizing (v1.2)
│   ├── api/                  # API-Routen
│   └── login/                # Login-Seite
├── components/
│   ├── dashboard-shell.tsx   # Layout mit Sidebar
│   ├── klient-form.tsx       # Klienten-Formular
│   └── ui/                   # shadcn/ui Komponenten
├── docs/
│   ├── README.md             # Diese Datei
│   └── klientenmanagement_app_spezifikation.html  # Original-Spezifikation
├── lib/
│   ├── api-auth.ts           # API-Authentifizierung
│   ├── auth-options.ts       # NextAuth Konfiguration
│   ├── prisma.ts             # Prisma Client
│   ├── rbac.ts               # Rollenbasierte Zugriffskontrolle
│   ├── ics.ts                # ICS-Kalender-Generierung (v1.3)
│   ├── utils.ts              # Hilfsfunktionen
│   └── validations.ts        # Zod-Schemas
├── prisma/
│   └── schema.prisma         # Datenbank-Schema
├── scripts/
│   └── seed.ts               # Testdaten-Seed
└── middleware.ts              # Auth-Middleware
```

## Seed-Daten

| Entität | Anzahl | Beispiele |
|---|---|---|
| User | 6 | Admin, Fallmanager (→Kontakt: Thomas Berger), Planer, Teamleitung, Buchhalter |
| Kostenträger | 3 | Jobcenter Berlin, Arbeitsagentur Hamburg, DRV Bund |
| Arbeitsplätze | 4 | Holzwerkstatt, Metallwerkstatt, Büro/IT, Gastronomie |
| Klienten | 3 | Maria Müller, Thomas Schmidt, Anna Weber |
| Intakes | 3 | 1× abgeschlossen, 1× abgeschlossen, 1× in Bearbeitung |
| Einsatzpläne | 2 | 2× aktiv |
| Berufsbilder | 5 | Tischler, Bürokauffrau, Koch, IT-Fachkraft, Metallarbeiter |
| BerichtTemplates | 3 | Eingliederungsbericht, Abschlussbericht, Intake-Protokoll |
| Leistungen | 5 | Eingliederung, Qualifizierung, Betreuung, Begleitung, Intake |
| Kontakte | 5 | Dr. Meier (Arzt), Sandra Müller (Angehörige), Frank Berger (Behörde), Lisa Krause (Therapeut), Michael Wagner (Betreuer) |
| Klient-Kontakt-Zuordnungen | 6 | Verteilung auf 3 Klienten |
| User-Kontakt-Verknüpfungen | 1 | Fallmanager → Thomas Berger (v1.1) |
| Meeting-Typen | 5 | Fallkonferenz, Hilfeplangespräch, Teambesprechung, Einzelgespräch, Supervision (v1.2) |

## Farbschema

- **Primary:** #1a237e (Deep Indigo)
- **Accent:** #0d47a1 (Dark Blue)
- **Success:** #2e7d32
- **Warning:** #e65100
- **Sidebar:** bg-[#1a237e] mit weißem Text
