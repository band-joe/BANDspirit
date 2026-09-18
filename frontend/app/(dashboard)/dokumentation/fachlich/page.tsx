'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FachlicheDokumentationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dokumentation">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Fachliche Dokumentation
          </h1>
          <p className="text-muted-foreground">Geschäftsprozesse und Domänenmodell — BANDspirit V.2.0</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">1. Überblick</CardTitle></CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>BANDspirit ist ein webbasiertes Organisations- und Administrationssystem. Es bildet die Organisationsstruktur nach Soziokratie 3.0 ab und stellt zentrale Verwaltungsfunktionen wie Benutzerverwaltung, Rollenverwaltung, Stammdaten, BI-Kompass und BI-Guide bereit. Die Applikation wurde auf die Kern-Module Organisation, Administration und Hilfe fokussiert.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">2. Organisation (Soziokratie 3.0)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">Das Modul «Organisation» bildet die Prinzipien der Soziokratie 3.0 ab und unterstützt die partizipative Organisationsentwicklung bei BANDspirit.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">2.1 Kreisstruktur (Fraktale Organisation)</h4>
            <p className="text-sm text-muted-foreground">Organisationseinheiten werden als Kreise (Circles) abgebildet. Jeder Kreis hat einen definierten Purpose (Zweck) und eine Domain (Verantwortungsbereich). Kreise können hierarchisch verschachtelt sein (Sub-Kreise). Interaktives Organigramm mit SVG-Visualisierung.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">2.2 Rollen & Rollenzuweisung</h4>
            <p className="text-sm text-muted-foreground">Innerhalb eines Kreises werden Rollen mit Accountabilities und Domain definiert. Spezialrollen: Koordinator, Vertreter, Moderator. Rollen können aus vordefinierten Rollendefinitionen gewählt werden, inkl. Lead-Link-Erkennung (max. 1 pro Kreis).</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">2.3 Double Linking</h4>
            <p className="text-sm text-muted-foreground">Zwischen Eltern- und Kindkreisen bestehen zwei Verbindungen: Der Koordinator (top-down) und der Vertreter (bottom-up). Dieses Double Linking stellt sicher, dass Informationen in beide Richtungen fliessen.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">2.4 Consent-Entscheidungsprozess</h4>
            <p className="text-sm text-muted-foreground">Entscheidungen werden im Consent-Verfahren getroffen: Ein Vorschlag (Proposal) wird vorgestellt, Einwände (Objections) werden erhoben und integriert. Erst wenn alle Einwände integriert oder zurückgezogen sind, kann ein Consent-Entscheid (Decision) gefällt werden.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">2.5 Governance-Meetings</h4>
            <p className="text-sm text-muted-foreground">Strukturierte Meetings mit Agenda-Management: Governance-Meetings (Strukturentscheidungen), Operations-Meetings (operative Koordination) und Retrospektiven. Status-Workflow: Geplant → Laufend → Abgeschlossen/Abgesagt.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">2.6 Spannungen (Drivers) & WorkItems</h4>
            <p className="text-sm text-muted-foreground">Spannungen beschreiben Handlungsbedarf (Priorität + Status). Jede Spannung kann einen Entscheid haben und 0:n WorkItems (Aufgaben) zugewiesen bekommen. Geschäftsregel: Status «Erledigt» nur wenn alle WorkItems erledigt sind. Keine Bearbeitung nach Erledigung. Tab-basierte Übersicht über alle Kreise hinweg.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">2.7 Life Cycle Prozess</h4>
            <p className="text-sm text-muted-foreground">Lifecycle-Management für Kreise mit 4 Phasen: Anlage → Betrieb → Review → Archiviert. KPIs (Zweck+Lead ≥90%, Review in 90d ≥80%). Review-Prozess mit Ergebnis (Weiterführen/Konsolidieren/Archivieren), Notizen und Massnahmen.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">2.8 BI-Kompass</h4>
            <p className="text-sm text-muted-foreground">Versioniertes Markdown-Dokument für Organisations-Leitlinien. Neue Versionen werden automatisch nummeriert. PDF-Upload mit LLM-basierter Textextraktion. Bearbeitungsrecht: ADMIN und Lead Link.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">2.9 BI-Guide News</h4>
            <p className="text-sm text-muted-foreground">Internes News-Forum für Organisations-Informationen. Kategorien: Allgemein, Prozesse, Schulung, Änderungen, Tipps & Tricks. Aktuelle News (≤5 Tage) werden prominent auf dem Dashboard angezeigt.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">3. Hilfe & Support</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">3.1 Support-Tickets</h4>
            <p className="text-sm text-muted-foreground">Alle Benutzer können Support-Tickets erstellen. Admins/Lead Links können Tickets bearbeiten und beantworten. E-Mail-Benachrichtigung bei neuen Tickets.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">3.2 FAQ</h4>
            <p className="text-sm text-muted-foreground">Häufig gestellte Fragen, gruppiert nach Kategorie. CRUD für Admins, Accordion-Ansicht für alle Benutzer.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">3.3 Globale Suche</h4>
            <p className="text-sm text-muted-foreground">Suche über zentrale Datenquellen: Benutzer, BI-Guide, FAQ, Tickets, Kreise. Ergebnisse gruppiert nach Typ mit Verlinkung zur Quelle.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">4. Rollenmodell</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">4 System-Rollen mit ca. 30 Einzel-Berechtigungen. Berechtigungen sind DB-basiert und können über die Rollenverwaltung angepasst werden.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg">
              <h4 className="font-semibold">Administrator</h4>
              <p className="text-sm text-muted-foreground">Vollzugriff auf alle Module inkl. Benutzerverwaltung, Stammdaten, Rollenverwaltung.</p>
            </div>
            <div className="p-3 border rounded-lg">
              <h4 className="font-semibold">Lead Link</h4>
              <p className="text-sm text-muted-foreground">Erweiterte Rechte für Organisation, Stammdaten, BI-Guide/Kompass-Verwaltung.</p>
            </div>
            <div className="p-3 border rounded-lg">
              <h4 className="font-semibold">Fachperson Berufliche Integration</h4>
              <p className="text-sm text-muted-foreground">Vollzugriff auf Organisation, Kreise, Meetings, Spannungen.</p>
            </div>
            <div className="p-3 border rounded-lg">
              <h4 className="font-semibold">Sachbearbeiter:in Vermittlung</h4>
              <p className="text-sm text-muted-foreground">Leserechte auf Organisation, Dashboard und Hilfe-Modul.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">5. Domänenmodell</CardTitle></CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>Die zentralen Entitäten des Systems:</p>
          <ul className="text-sm space-y-1">
            <li><strong>User</strong> — Systembenutzer mit Rolle und Berechtigungen</li>
            <li><strong>Kreis</strong> — Organisationseinheit mit Purpose und Domain (Soziokratie 3.0)</li>
            <li><strong>Rolle</strong> — Kreisrolle mit Accountabilities, Rollendefinition</li>
            <li><strong>Meeting</strong> — Governance-, Operations- und Retrospektive-Meetings</li>
            <li><strong>Proposal / Objection / Decision</strong> — Consent-Entscheidungsprozess</li>
            <li><strong>Driver (Spannung)</strong> — Organisatorische Treiber mit WorkItems und Entscheid</li>
            <li><strong>CircleReview</strong> — Life Cycle Reviews für Kreise</li>
            <li><strong>Support-Ticket / FAQ</strong> — Internes Hilfe-System</li>
            <li><strong>BIKompassVersion</strong> — Versioniertes Organisations-Leitdokument</li>
            <li><strong>BIGuideNews</strong> — Internes News-Forum</li>
            <li><strong>Stammdaten</strong> — Konfigurierbare Enums (Geschlecht, Branche)</li>
            <li><strong>Firma</strong> — Firmeneinstellungen (Singleton)</li>
            <li><strong>RolePermission</strong> — DB-basierte Berechtigungssteuerung</li>
            <li><strong>AppLog</strong> — Application-Log für Audit-Trail</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-3"><strong>Audit-/Tracking-Standard:</strong> Entitäten verfügen über standardisierte Felder zur Nachverfolgung: <em>createdById</em> (Ersteller), <em>changedById</em> (letzter Bearbeiter), <em>createdAt</em>, <em>updatedAt</em>. Diese werden bei jeder Erstellung und Änderung automatisch gesetzt.</p>
        </CardContent>
      </Card>
    </div>
  );
}
