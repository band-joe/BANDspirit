# BANDspirit – Security-Massnahmenkatalog

**Datum:** 2026-09-21
**Branch:** `security-issues`
**Methodik:** Manuelle Code-Review (Backend `backend/BandSpirit.Api`, Frontend `frontend/`,
`docker-compose.yml`) plus punktuelle Live-Verifikation gegen die laufende lokale
Docker-Compose-Umgebung über ein selbst angelegtes, danach wieder gelöschtes Test-Konto
(keine echten Zugangsdaten/`.env`-Werte verwendet oder eingesehen).

> Hinweis: Im Ordner `Dokumentation/` liegt bereits eine `Sicherheitspruefung.pdf`. Ihr Inhalt
> ist als Vektorgrafik/Pfade exportiert (kein extrahierbarer Text) und konnte in dieser Umgebung
> nicht automatisiert gelesen werden (PDF-Rendering-Tooling – `pdftoppm`/poppler – ist hier nicht
> installiert). Dieser Katalog wurde daher unabhängig davon erstellt; ein manueller Abgleich mit
> der bestehenden Prüfung wird empfohlen.

## Zusammenfassung

| ID | Schweregrad | Titel | Status |
|----|-------------|-------|--------|
| SEC-AUDIT-01 | **Kritisch** | Passwort-Hash-Leak über OData `$expand` | ✅ Behoben (dieser Branch) |
| SEC-AUDIT-02 | Hoch | Ungeprüfter Content-Type bei Datei-Uploads, inline ausgeliefert (Firmenlogo, öffentlich) | Offen |
| SEC-AUDIT-03 | Mittel | `S3PersonRoleAssignment.User` exponiert mehr Felder als für `RoleRead` vorgesehen | Offen |
| SEC-AUDIT-04 | Mittel | Swagger/OpenAPI unauthentifiziert in allen Umgebungen erreichbar | Offen (bewusste Design-Entscheidung, zur Überprüfung) |
| SEC-AUDIT-05 | Mittel | PostgreSQL/MinIO-Ports direkt auf den Host gemappt | Offen (Infrastruktur) |
| SEC-AUDIT-06 | Niedrig | `X-Forwarded-For` wird ungeprüft vertraut (Rate-Limit-Umgehung bei direktem API-Zugriff) | Offen (aktuell nur durch Netzwerktopologie entschärft) |
| SEC-AUDIT-07 | Niedrig | Keine Dateityp-/Endungs-Allowlist bei Dokument-Uploads | Offen |
| SEC-AUDIT-08 | Niedrig | Unbereinigter Dateiname im S3-Objektschlüssel | Offen |

---

## SEC-AUDIT-01 (Kritisch): Passwort-Hash-Leak über OData `$expand` — ✅ Behoben

**Betroffen:** `Program.cs` (OData-EDM-Modell), `Models/User.cs`, jede Route mit
Navigation zu `User` (aktuell: `S3PersonRoleAssignment.User`).

**Befund:** `User.Password` und `User.VerificationToken` sind mit `[JsonIgnore]`
markiert. Dieses Attribut schützt aber ausschliesslich die separate REST-JSON-Pipeline
(`AddJsonOptions`) – **nicht** den OData-Formatter. Sobald eine andere Entität eine
Navigation Property vom Typ `User` besitzt, serialisiert OData bei `$expand` die volle
`User`-Entität inklusive BCrypt-Passwort-Hash und E-Mail-Verifizierungs-Token-Hash.

**Live-Verifikation:** Mit einem frisch angelegten Test-Konto der einfachen Rolle
`"User"` (Berechtigung `RoleRead`, die Standardrolle jedes Mitglieds) lieferte

```
GET /odata/Roles?$expand=Assignments($expand=User)
```

— exakt die Query, die das Frontend selbst in `organisation/page.tsx` und
`kreise/[id]/page.tsx` für die Mitgliederanzeige verwendet — das vollständige
`User`-Objekt inklusive `"password"` (BCrypt-Hash, `null` nur weil der getestete
Datensatz zufällig keinen gesetzten Hash hatte) und `"verificationToken"`. Damit konnte
**jeder angemeldete Benutzer** die Passwort-Hashes und Verifizierungs-Tokens **aller
anderen Benutzer** abrufen — offline crackbar, direktes Account-Takeover-Risiko.

**Fix (umgesetzt):** `Password` und `VerificationToken` global im OData-EDM-Modell
ignoriert (`odataModelBuilder.EntityType<User>().Ignore(...)`), analog zum bereits
bestehenden Muster für `SpannungWorkItem.ZugewiesenAn` (UI-12-Fix). Wirkt für **jeden**
aktuellen und künftigen Navigationspfad zu `User`, nicht nur für den hier gefundenen.

**Verifiziert:** Erneuter Live-Test nach dem Fix – Antwort enthält weder `"password"`
noch `"verificationToken"` als Schlüssel mehr.

**Empfehlung für künftige Entwicklung:** Bei jeder neuen Navigation Property zu `User`
(oder generell zu Entitäten mit sensiblen Feldern) prüfen, ob das Ziel bereits im
EDM-Modell abgesichert ist – `[JsonIgnore]` allein genügt für OData-Routen **nicht**.

---

## SEC-AUDIT-02 (Hoch): Ungeprüfter Content-Type bei Datei-Uploads, inline ausgeliefert

**Betroffen:** `Controllers/FirmaController.cs` (`FirmaLogoController.UploadLogo`/`LogoAbrufen`),
analog `Controllers/S3RollenDefinitionDokumenteController.cs`.

**Befund:** Beim Upload wird der vom Client gesendete `IFormFile.ContentType`
ungeprüft übernommen und in S3/MinIO gespeichert (`FirmaController.cs`, Zeile ~137):

```csharp
var contentType = string.IsNullOrWhiteSpace(datei.ContentType)
    ? "application/octet-stream"
    : datei.ContentType;
```

Weder Dateiendung noch tatsächlicher Dateiinhalt (Magic Bytes) werden validiert. Beim
Abruf des Firmenlogos (`GET /api/firma/logo`, **`[AllowAnonymous]`**, wird von der
Login-Seite für jeden Besucher geladen) wird dieser gespeicherte Content-Type
unverändert zurückgegeben:

```csharp
return File(inhalt, contentType);
```

Die 2-Parameter-Überladung von `File(...)` setzt **kein** `Content-Disposition:
attachment` – der Inhalt wird also inline im Browser gerendert.

**Risiko:** Ein Konto mit der Berechtigung `StammdatenManage` (kompromittiert oder
böswillig) könnte eine Datei mit `Content-Type: text/html` (oder `image/svg+xml` mit
eingebettetem `<script>`) als "Logo" hochladen. Diese würde danach **unauthentifiziert,
für jeden Besucher der Login-Seite**, als HTML/JS im Origin der Applikation ausgeliefert
und ausgeführt → persistenter, unauthentifiziert erreichbarer Stored-XSS mit Zugriff auf
alle eingeloggten Sessions (inkl. Admin-Sessions), sobald jemand die Seite öffnet.

**Empfehlung:**
1. Beim Logo-Upload eine Allowlist erzwingen (`image/png`, `image/jpeg`, `image/webp`,
   `image/svg+xml` nur nach serverseitiger Sanitisierung oder besser ganz ausschliessen).
2. Magic-Bytes-Prüfung statt reinem Vertrauen in den Client-Header.
3. Beim Ausliefern grundsätzlich einen eigenen, server-kontrollierten Content-Type
   setzen (nicht den gespeicherten Client-Wert 1:1 übernehmen) bzw. `Content-Disposition`
   zumindest für alles ausser klar geprüften Bildtypen auf `attachment` setzen.

---

## SEC-AUDIT-03 (Mittel): `S3PersonRoleAssignment.User` exponiert mehr Felder als vorgesehen

**Betroffen:** `Models/S3PersonRoleAssignment.cs`, erreichbar über `RolesController`
(`$expand=Assignments($expand=User)`, Berechtigung `RoleRead`).

**Befund:** Der direkte `Users`-EntitySet ist bewusst auf `UserDto` beschränkt und durch
`Permissions.UserRead` geschützt. Über `S3PersonRoleAssignment.User` ist der volle
`User`-Entitätstyp (abzüglich der jetzt in SEC-AUDIT-01 ignorierten Felder) aber bereits
mit der niedrigsten Berechtigungsstufe (`RoleRead`, hat jede Standard-"User"-Rolle)
erreichbar – u. a. `abacusPersonalnummer` (Personalnummer, Personaldaten-Charakter),
`role`, `roleId`, `emailCanonical`, `rowVersion`, `verificationTokenExpiry`,
`createdById`/`changedById`. Das ist keine geheime Information wie in SEC-AUDIT-01, aber
ein Bruch des Least-Privilege-Prinzips: Daten, die regulär `UserRead` voraussetzen, sind
über einen Umweg bereits mit `RoleRead` einsehbar.

**Empfehlung:** Mittelfristig die Navigation durch eine schlanke Projektion ersetzen
(nur `id`, `name`, ggf. `email`/`portraetPfad` – was die UI tatsächlich für die
Mitgliederanzeige benötigt), statt die volle Entität (minus zwei Felder) zu exponieren.
Kein akuter Handlungsdruck wie SEC-AUDIT-01, da keine Secrets mehr betroffen sind.

---

## SEC-AUDIT-04 (Mittel): Swagger/OpenAPI unauthentifiziert in allen Umgebungen

**Betroffen:** `Program.cs`, Swagger-Konfiguration (`/api/swagger`).

**Befund:** Laut Code-Kommentar ist dies eine **bewusste** Design-Entscheidung ("Doku
als Deeplink ohne Berechtigungsprüfung"). Das komplette API-Schema (alle Routen, DTOs,
Felder) ist damit ohne Login für jeden erreichbar, der die Applikation erreichen kann –
"Try it out" erfordert zwar ein gültiges JWT, die reine Schema-Einsicht nicht.

**Einschätzung:** Für eine interne Pilotphase vertretbar, aber Informationsgewinn für
Angreifer (Aufklärung der Angriffsfläche). Empfehlung: mindestens in einer späteren
Produktivumgebung Swagger hinter `[Authorize]` oder auf Nicht-Produktiv-Umgebungen
beschränken.

---

## SEC-AUDIT-05 (Mittel): PostgreSQL/MinIO-Ports direkt auf den Host gemappt

**Betroffen:** `docker-compose.yml` (Postgres `5432:5432`, MinIO `9000:9000`/`9011:9001`).

**Befund:** Beide Dienste sind ohne Bind-Adresse auf den Host gemappt (`0.0.0.0` implizit),
statt z. B. `127.0.0.1:5432:5432`. Ob das in der realen BAND-Infrastruktur zusätzlich
durch Firewall/Netzwerksegmentierung abgesichert ist, kann aus dem Repository nicht
beurteilt werden.

**Empfehlung:** Für jede Umgebung, in der der Docker-Host nicht vollständig isoliert
ist, Host-Bindings auf `127.0.0.1` einschränken bzw. die Portfreigaben ganz entfernen,
sofern kein externer Zugriff auf diese Dienste benötigt wird.

---

## SEC-AUDIT-06 (Niedrig): `X-Forwarded-For` wird ungeprüft vertraut

**Betroffen:** `Program.cs`, `UseForwardedHeaders` (`KnownNetworks`/`KnownProxies` geleert).

**Befund:** Bewusste, dokumentierte Entscheidung wegen dynamischer Docker-interner
nginx-IPs. Das API-Backend selbst ist aktuell nicht auf dem Host-Port exponiert
(`bandspirit-api` hat keinen `ports:`-Eintrag in `docker-compose.yml`), wodurch dieser
Pfad heute nicht direkt erreichbar ist. Würde der API-Container jemals direkt erreichbar
werden (Fehlkonfiguration, anderes Deployment-Target), könnte jede Client-IP über den
Header frei vorgetäuscht werden – das IP-partitionierte Rate-Limiting (Brute-Force-Schutz
auf `/api/auth/*`) wäre dann trivial umgehbar.

**Empfehlung:** Als dokumentierte Deployment-Invariante festhalten ("API-Container darf
nie direkt, nur über nginx erreichbar sein") und – falls das Deployment-Modell sich
ändert (z. B. Kubernetes mit festen Proxy-IPs) – `KnownProxies`/`KnownNetworks` auf die
tatsächlichen Proxy-Adressen einschränken.

---

## SEC-AUDIT-07 (Niedrig): Keine Dateityp-/Endungs-Allowlist bei Dokument-Uploads

**Betroffen:** `S3RollenDefinitionDokumenteController.cs` und allgemein alle
Upload-Endpunkte.

**Befund:** Es existiert keine serverseitige Prüfung erlaubter Dateitypen/-endungen für
allgemeine Rollendefinitions-Dokumente. Anders als beim Logo (SEC-AUDIT-02) werden diese
Dateien beim Download mit explizitem `fileDownloadName` ausgeliefert (`File(bytes,
contentType, dokument.Dateiname)`), was Browser i. d. R. zu einem Download statt
Inline-Rendering zwingt – das Risiko ist daher deutlich geringer als bei SEC-AUDIT-02,
aber als Defense-in-Depth-Lücke trotzdem erwähnenswert (z. B. Speicherung von Malware,
die dann von jemandem lokal geöffnet wird).

**Empfehlung:** Gemeinsame Allowlist/Validierung für alle Upload-Pfade einführen (z. B.
zentraler Helper in `S3StorageService`).

---

## SEC-AUDIT-08 (Niedrig): Unbereinigter Dateiname im S3-Objektschlüssel

**Betroffen:** `S3StorageService.UploadAsync`.

**Befund:**

```csharp
var key = $"{FolderPrefix}/{Guid.NewGuid():N}-{dateiname}";
```

Der ursprüngliche, clientseitige Dateiname wird ungeprüft in den S3-Objektschlüssel
übernommen. Da S3/MinIO-Schlüssel ein flacher String-Namespace ohne Pfadauflösung sind,
ist klassisches Path-Traversal (`../../`) hier nicht wirksam ausnutzbar; das
GUID-Präfix verhindert zudem Kollisionen/Überschreiben bestehender Objekte. Verbleibendes
Risiko ist gering (keine Zeichen-Allowlist, theoretisch ungewöhnlich lange oder mit
Steuerzeichen versehene Schlüssel).

**Empfehlung:** Dateinamen vor Verwendung auf ein sicheres Zeichen-Set beschränken
(z. B. `[a-zA-Z0-9._-]`), rein kosmetisch/defensiv, kein akuter Fix nötig.

---

## Nicht als Sicherheitslücke bewertet (positiv geprüft)

Der Vollständigkeit halber: folgende häufige Schwachstellenklassen wurden geprüft und
**nicht** als Lücke bestätigt:

- **JWT-Konfiguration:** `ValidateIssuer`/`ValidateAudience`/`ValidateLifetime`/
  `ValidateIssuerSigningKey` alle aktiv, `ClockSkew = TimeSpan.Zero`, Signatur über
  konfigurierten Secret (Start-Check verhindert Platzhalter-Secret).
- **CORS:** auf konfigurierte `AllowedOrigins` beschränkt, kein `AllowAnyOrigin()`.
- **SQL-Injection:** keine Verwendung von `FromSqlRaw`/`ExecuteSqlRaw` mit
  String-Interpolation gefunden; alle dynamischen Queries laufen über EF-Core-LINQ
  (parametrisiert) oder über handgeschriebene, ausschliesslich statische
  Migrations-SQL-Strings.
- **XSS im Frontend:** kein `dangerouslySetInnerHTML` in `app/`/`components/` gefunden.
- **Rate-Limiting:** dediziertes, IP-partitioniertes Limit für `/api/auth/*` (20/60s)
  plus globales Limit für alle übrigen Endpunkte – bereits als bewusste
  Defense-in-Depth-Massnahme umgesetzt (siehe Code-Kommentare zu SEC-M7).
- **Security-Header (nginx):** `X-Content-Type-Options`, `Strict-Transport-Security`,
  `Referrer-Policy`, `Permissions-Policy` sind in Live-Antworten vorhanden.
- **Passwort-Reset/E-Mail-Verification:** Tokens werden ausschliesslich als SHA-256-Hash
  gespeichert, Klartext nur per E-Mail versendet; kein User-Enumeration-Leak in
  `forgot-password` (immer generische 200-Antwort).
- **Selbstregistrierung:** `POST /api/auth/signup` ist bereits auf `Authorize(Roles =
  "Admin")` beschränkt (APP-13), keine offene Selbstregistrierung.

---

## Empfohlene Reihenfolge

1. ~~SEC-AUDIT-01~~ – bereits behoben auf diesem Branch.
2. SEC-AUDIT-02 – zeitnah, da öffentlich (unauthentifiziert) erreichbar und mit
   XSS-Impact auf alle Nutzer:innen inkl. Admins.
3. SEC-AUDIT-03 bis SEC-AUDIT-08 – keine akute Ausnutzbarkeit ohne bereits privilegierten
   bzw. kompromittierten Zugang; nach Priorität/Kapazität einplanen.
