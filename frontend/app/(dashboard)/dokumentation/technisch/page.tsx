'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TechnischeDokumentationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dokumentation">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" /> Technische Dokumentation
          </h1>
          <p className="text-muted-foreground">Architektur, Stack und Infrastruktur — V.2.0</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">1. Technologie-Stack</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg">
              <h4 className="font-semibold text-sm">Frontend</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                <li>• Next.js 14 (App Router, Standalone-Build)</li>
                <li>• React 18</li>
                <li>• Tailwind CSS + shadcn/ui</li>
                <li>• NextAuth.js v4 (Session-Verwaltung)</li>
                <li>• TanStack Query + SWR (Datenabruf)</li>
                <li>• Framer Motion, Lucide Icons, ReactMarkdown</li>
              </ul>
            </div>
            <div className="p-3 border rounded-lg">
              <h4 className="font-semibold text-sm">Backend</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                <li>• C# / ASP.NET Core 8 (.NET 8)</li>
                <li>• Microsoft.AspNetCore.OData 8 (REST + OData)</li>
                <li>• Entity Framework Core 8 (Npgsql / PostgreSQL)</li>
                <li>• JWT Bearer Authentication</li>
                <li>• BCrypt.Net (Passwort-Hashing)</li>
                <li>• Serilog (strukturiertes Logging)</li>
              </ul>
            </div>
            <div className="p-3 border rounded-lg">
              <h4 className="font-semibold text-sm">Datenhaltung & Integrationen</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                <li>• PostgreSQL 16 (Primärdatenbank)</li>
                <li>• Redis 7 (Caching / Health-Check)</li>
                <li>• MinIO / S3 (AWSSDK.S3 — Datei-Uploads)</li>
                <li>• MailKit / SMTP (Microsoft Exchange, E-Mail)</li>
              </ul>
            </div>
            <div className="p-3 border rounded-lg">
              <h4 className="font-semibold text-sm">DevOps / Deployment</h4>
              <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                <li>• Docker &amp; Docker Compose (Ubuntu Server)</li>
                <li>• Nginx als Reverse Proxy (SSL/TLS)</li>
                <li>• Multi-Stage Docker-Builds (SDK → Runtime)</li>
                <li>• Health Checks (PostgreSQL, Redis)</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Hinweis: Das Frontend (Next.js) konsumiert ausschliesslich die C#-Backend-API. Die frühere
            Umsetzung auf Basis von Next.js API-Routes und Prisma ORM wurde vollständig durch das
            ASP.NET-Core-/OData-Backend abgelöst (siehe Context-Versionen, V.2.0).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">2. Architektur</CardTitle></CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>Die Applikation ist als Client-Server-Architektur mit klarer Schichtentrennung aufgebaut:</p>
          <ul className="text-sm space-y-1">
            <li><strong>Presentation Layer</strong> — Next.js 14 App Router (React Client Components), Session über NextAuth.js</li>
            <li><strong>Reverse Proxy</strong> — Nginx terminiert SSL/TLS und leitet Anfragen an Frontend (<code>frontend:3000</code>) bzw. Backend (<code>api:8080</code>)</li>
            <li><strong>API Layer</strong> — ASP.NET Core Controller: OData-Controller (Abfrage &amp; CRUD) unter <code>/odata/*</code> und klassische REST-Controller unter <code>/api/*</code></li>
            <li><strong>Business Logic</strong> — Services (AuthService, RbacService, KpiService, OkrService, IcsService, NotificationService, S3StorageService …)</li>
            <li><strong>Cross-Cutting</strong> — SecurityHeadersMiddleware, AuditMiddleware, Rate-Limiting, JWT-Authentifizierung, RBAC-Autorisierung</li>
            <li><strong>Data Access</strong> — Entity Framework Core (<code>BandSpiritDbContext</code>) auf PostgreSQL; automatisches Audit über die <code>SaveChangesAsync</code>-Override</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">3. Datenmodell</CardTitle></CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>Das System umfasst 27 Entity-Framework-Core-Entitäten. Alle fachlichen Entitäten erben von
            <code> AuditableEntity</code> (Id, CreatedAt/By, LastModifiedAt/By). Auszug der zentralen Entitäten:</p>
          <div className="overflow-x-auto">
            <table className="text-sm w-full">
              <thead><tr className="border-b"><th className="text-left pb-2 pr-4">Entität</th><th className="text-left pb-2 pr-4">Beschreibung</th><th className="text-left pb-2">Relationen</th></tr></thead>
              <tbody className="divide-y">
                <tr><td className="py-1.5 pr-4 font-mono text-xs">User</td><td className="py-1.5 pr-4">Systembenutzer</td><td className="py-1.5 text-muted-foreground">PasswordResetTokens, Rollen-Zuweisungen</td></tr>
                <tr><td className="py-1.5 pr-4 font-mono text-xs">S3Circle</td><td className="py-1.5 pr-4">Soziokratischer Kreis (S3)</td><td className="py-1.5 text-muted-foreground">S3Role, Links, Reviews, Meetings, Proposals</td></tr>
                <tr><td className="py-1.5 pr-4 font-mono text-xs">S3Role</td><td className="py-1.5 pr-4">Kreisrolle</td><td className="py-1.5 text-muted-foreground">S3Circle, S3PersonRoleAssignment</td></tr>
                <tr><td className="py-1.5 pr-4 font-mono text-xs">S3PersonRoleAssignment</td><td className="py-1.5 pr-4">Rollenzuweisung Person↔Rolle</td><td className="py-1.5 text-muted-foreground">User, S3Role</td></tr>
                <tr><td className="py-1.5 pr-4 font-mono text-xs">S3Meeting / …AgendaItem</td><td className="py-1.5 pr-4">Meetings &amp; Agenda</td><td className="py-1.5 text-muted-foreground">S3Circle, AgendaItems (1:N)</td></tr>
                <tr><td className="py-1.5 pr-4 font-mono text-xs">S3Proposal / Objection / Decision</td><td className="py-1.5 pr-4">Consent-Entscheidungsprozess</td><td className="py-1.5 text-muted-foreground">S3Circle, User</td></tr>
                <tr><td className="py-1.5 pr-4 font-mono text-xs">S3Driver / SpannungWorkItem</td><td className="py-1.5 pr-4">Treiber &amp; Spannungen</td><td className="py-1.5 text-muted-foreground">User (Reporter/Assignee)</td></tr>
                <tr><td className="py-1.5 pr-4 font-mono text-xs">OKR / KeyResult</td><td className="py-1.5 pr-4">Objectives &amp; Key Results</td><td className="py-1.5 text-muted-foreground">KeyResults (1:N)</td></tr>
                <tr><td className="py-1.5 pr-4 font-mono text-xs">KpiDefinition / KpiMeasurement</td><td className="py-1.5 pr-4">KPI-Definition &amp; Messwerte</td><td className="py-1.5 text-muted-foreground">Messwerte (1:N)</td></tr>
                <tr><td className="py-1.5 pr-4 font-mono text-xs">SupportTicket / FAQ</td><td className="py-1.5 pr-4">Hilfe &amp; Support</td><td className="py-1.5 text-muted-foreground">User (Reporter/Assignee)</td></tr>
                <tr><td className="py-1.5 pr-4 font-mono text-xs">BIKompassVersion / BIGuideNews</td><td className="py-1.5 pr-4">BI-Kompass &amp; BI-Guide</td><td className="py-1.5 text-muted-foreground">Ersteller (User)</td></tr>
                <tr><td className="py-1.5 pr-4 font-mono text-xs">RolePermission</td><td className="py-1.5 pr-4">DB-basierte RBAC</td><td className="py-1.5 text-muted-foreground">Rolle + Permission</td></tr>
                <tr><td className="py-1.5 pr-4 font-mono text-xs">Firma</td><td className="py-1.5 pr-4">Firmeneinstellungen</td><td className="py-1.5 text-muted-foreground">OData-Singleton, Logo via S3/MinIO</td></tr>
                <tr><td className="py-1.5 pr-4 font-mono text-xs">Stammdaten / AppLog</td><td className="py-1.5 pr-4">Konfiguration &amp; Logs</td><td className="py-1.5 text-muted-foreground">Schlüssel/Wert, Serilog-Sink</td></tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Das vollständige Datenmodell inkl. aller Felder und Enums ist im PDF «ERD / Datenmodell» dokumentiert.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">4. Sicherheit</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• <strong>Authentifizierung:</strong> JWT Bearer Tokens (Gültigkeit 8&nbsp;Stunden), ausgestellt vom <code>JwtTokenService</code>. Frontend hält die Session über NextAuth.js (Credentials-Provider ruft <code>/api/auth/login</code> auf).</p>
          <p>• <strong>Passwort-Hashing:</strong> BCrypt.Net (<code>BCrypt.Net.BCrypt.HashPassword/Verify</code>, Standard-WorkFactor 11). Passwort-Reset per Token (1&nbsp;Stunde gültig).</p>
          <p>• <strong>Autorisierung:</strong> RBAC über <code>PermissionAuthorizationHandler</code> und die Permission-Registry <code>Permissions.All</code>; Berechtigungen werden vom <code>RbacService</code> ermittelt (60&nbsp;s In-Memory-Cache mit DB-Fallback).</p>
          <p>• <strong>Single Sign-On:</strong> Microsoft Entra ID (Azure AD) via <code>/api/auth/entra-callback</code> — Zuordnung über die E-Mail-Adresse zu bestehenden, aktiven Konten.</p>
          <p>• <strong>Rate-Limiting:</strong> Fixed-Window-Limiter — «auth» 5&nbsp;Anfragen/60&nbsp;s, «api» 100&nbsp;Anfragen/10&nbsp;s.</p>
          <p>• <strong>Security-Header:</strong> <code>SecurityHeadersMiddleware</code> setzt u.a. X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS.</p>
          <p>• <strong>Audit-Trail:</strong> <code>AuditMiddleware</code> + automatische Audit-Felder (CreatedBy/LastModifiedBy) in <code>BandSpiritDbContext.SaveChangesAsync</code>.</p>
          <p>• <strong>Datenzugriff:</strong> Entity Framework Core mit parametrisierten Queries (kein Raw-SQL) — Schutz vor SQL-Injection.</p>
          <p>• <strong>Fehlerbehandlung:</strong> Keine internen Fehlermeldungen in API-Responses, generische deutschsprachige Texte.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">5. E-Mail-Benachrichtigungen</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• <strong>NotificationService:</strong> E-Mail-Versand über MailKit/SMTP (Microsoft Exchange / Office 365, StartTLS oder SSL).</p>
          <p>• <strong>Passwort-Reset:</strong> Token-basierter Reset-Link per E-Mail.</p>
          <p>• <strong>Support-Ticket:</strong> Benachrichtigung an die Administration bei neuen Tickets.</p>
          <p>• <strong>Meeting-Einladung:</strong> Versand inkl. ICS-Kalendereintrag (<code>IcsService</code>).</p>
          <p className="text-xs text-muted-foreground">Ist kein SMTP konfiguriert, wird der Versand protokolliert und übersprungen (kein Abbruch).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">6. Deployment</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• <strong>Orchestrierung:</strong> Docker Compose mit den Services <code>nginx</code>, <code>frontend</code>, <code>api</code>, <code>postgres</code> (16), <code>redis</code> (7) und <code>minio</code>.</p>
          <p>• <strong>Reverse Proxy:</strong> Nginx (1.27) leitet <code>/odata</code> und <code>/api</code> an das Backend, alles Übrige an das Frontend.</p>
          <p>• <strong>Backend-Image:</strong> Multi-Stage Dockerfile (SDK 8.0 → aspnet 8.0 Runtime), Non-Root-User, Health-Check via <code>curl</code>.</p>
          <p>• <strong>Datenbank:</strong> PostgreSQL 16 mit persistentem Volume; EF-Core-Migrationen werden beim Start angewendet und Seed-Daten angelegt (<code>DataSeeder</code>).</p>
          <p>• <strong>Objektspeicher:</strong> MinIO (S3-kompatibel) für Logo- und Datei-Uploads.</p>
          <p>• <strong>Betrieb:</strong> Ubuntu Server; SSL/TLS über Nginx. Details siehe PDF «Installationsanleitung Docker & Azure Cloud».</p>
        </CardContent>
      </Card>
    </div>
  );
}
