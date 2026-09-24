# BANDspirit V2

BANDspirit ist eine Organisations- und Governance-Plattform (soziokratische Kreise,
Meetings, Anträge, OKRs, KPIs, Support). Diese Version besteht aus einem
**Next.js-Frontend** und einem **C#/ASP.NET-Core-8-Backend** mit **OData v4**.

---

## Projektübersicht

| Kategorie | Technologie |
|---|---|
| Frontend | Next.js (Standalone) |
| Backend | ASP.NET Core 8, OData v4 |
| ORM | Entity Framework Core 8 |
| Datenbank | PostgreSQL 16 (Collation `de_CH.UTF-8`, Zeitzone `Europe/Zurich`) |
| Cache | Redis 7 |
| Auth | JWT (8 h TTL) + Microsoft Entra ID (optional) |
| Storage | AWS S3 (Logos, Dokumente) |
| Reverse Proxy | Nginx |

---

## Verzeichnisstruktur

```
bandspirit/
├── docker-compose.yml          # Orchestrierung aller 5 Dienste
├── README.md                   # Diese Datei
├── docker/
│   └── nginx/
│       └── nginx.conf          # Reverse-Proxy-Konfiguration
├── frontend/                   # Next.js-Frontend (eigenständig)
└── backend/
    └── BandSpirit.Api/         # C#-Backend
        ├── Controllers/        # Auth-, OData- und REST-Controller
        ├── Models/             # 37 Entitäten (AuditableEntity als Basis)
        ├── DTOs/               # Datenübertragungsobjekte
        ├── Services/           # Fach-/Hilfsdienste (Auth, JWT, RBAC, S3, ICS …)
        ├── Infrastructure/
        │   ├── Data/           # DbContext + EF-Migrationen
        │   ├── Auth/           # RBAC (Permissions, Handler, Requirement)
        │   ├── Middleware/     # Security-Header + Audit-Logging
        │   └── Seeding/        # Grunddaten + Rollen/Berechtigungen
        ├── Program.cs          # Startup (OData, JWT, CORS, Rate-Limiting, Health)
        ├── appsettings.json
        ├── appsettings.Docker.json
        └── Dockerfile
```

---

## Schnellstart mit Docker

Voraussetzung: Docker + Docker Compose.

1. **Platzhalter ersetzen:** In `docker-compose.yml` alle `PLACEHOLDER`-Werte
   (Datenbank-Passwort, JWT-Secret ≥ 32 Zeichen, AWS-/Abacus-Zugangsdaten) durch
   echte Werte ersetzen. **Niemals echte Secrets committen.**

2. **Starten:**

   ```bash
   docker compose up -d --build
   ```

3. **Aufrufen:**

   - Anwendung (über Nginx): <http://localhost>
   - API-Health-Check: <http://localhost/health>
   - OData-Basis: <http://localhost/odata>

4. **Logs ansehen:**

   ```bash
   docker compose logs -f api
   ```

5. **Stoppen:**

   ```bash
   docker compose down
   ```

Beim ersten Start (Umgebung `Docker`/`Development`) werden EF-Migrationen sowie
Rollen-/Grunddaten automatisch angewendet. Ein initialer Admin-Benutzer wird
angelegt:

- **E-Mail:** `admin@bandspirit.local`
- **Passwort:** `Admin123!` → **umgehend ändern!**

---

## Deployment auf das Betriebssystem (Proxmox)

Entwickelt wird in der WSL-Umgebung, Änderungen gelangen per Merge Request nach
`main`. Das Betriebssystem holt sich nur `main` aus dem GitLab – dort wird
weder entwickelt noch gepusht.

**Einmalig einrichten:**

1. `gitlab.bi-infra.band.local` auflösbar machen (DNS oder Eintrag in `/etc/hosts`).
2. SSH-Key der VM im GitLab-Projekt als **Deploy Key ohne Schreibrecht** hinterlegen
   (Settings → Repository → Deploy keys), testen mit `ssh -T git@gitlab.bi-infra.band.local`.
3. `origin` setzen:
   `git remote set-url origin git@gitlab.bi-infra.band.local:bi-inf/apps/bandspirit/bandspirit.git`
4. `.env` darf nicht von Git verfolgt werden: `git rm --cached .env .env.bak`
5. Umgebungsspezifisches nicht in versionierten Dateien ändern, sondern
   auslagern (alles per `.gitignore` ausgeschlossen):
   - eigene nginx-Konfiguration als `docker/nginx/nginx.<umgebung>.conf`,
     eingebunden über eine `docker-compose.override.yml` (lädt Compose automatisch):
     ```yaml
     services:
       nginx:
         volumes:
           - ./docker/nginx/nginx.test.conf:/etc/nginx/nginx.conf:ro
     ```
   - TLS-Zertifikat und -Schlüssel unter `docker/nginx/ssl/`

**Update einspielen:**

```bash
./scripts/deploy.sh            # holt main (nur Fast-Forward) und baut den Stack neu
./scripts/deploy.sh --backup   # vorher Backup über scripts/backup.sh
```

Das Skript bricht ab bei lokalen Änderungen, falschem Branch, fehlender oder
versionierter `.env` sowie bei abweichender History. Es weist darauf hin, wenn
mit dem Update Skripte unter `scripts/` oder `migration/` geändert wurden
(z. B. `fix-role-permissions.sh`) – diese werden nicht automatisch ausgeführt.
Datenbank-Migrationen laufen beim Start der API automatisch.

---

## Lokale Entwicklung (ohne Docker)

Voraussetzung: .NET 8 SDK, PostgreSQL, Redis.

```bash
cd backend/BandSpirit.Api

# Abhängigkeiten wiederherstellen
dotnet restore

# Datenbank-Migrationen anwenden (setzt laufende PostgreSQL-Instanz voraus)
dotnet ef database update

# Anwendung starten (Standard-Umgebung: Development)
dotnet run
```

Die API läuft standardmäßig auf `http://localhost:8080`. Die Verbindungs-Zeichenfolge
und weitere Einstellungen werden aus `appsettings.json` (bzw.
`appsettings.Development.json`) gelesen.

### Neue Migration erstellen

```bash
dotnet ef migrations add <Name> -o Infrastructure/Data/Migrations
dotnet ef database update
```

---

## API-Überblick

### Interaktive API-Dokumentation (Swagger / OpenAPI)

- **Deeplink:** `/api/swagger` (bzw. `/api/swagger/v1/swagger.json` für das rohe
  OpenAPI-Schema).
- **Ohne Login aufrufbar:** Kein `[Authorize]` auf den Swagger-Endpunkten — das
  API-Schema und die Swagger-UI sind ohne Berechtigungsprüfung erreichbar. Nur
  die "Try it out"-Funktion einzelner Endpunkte braucht ein gültiges JWT
  (über den 🔒-Authorize-Dialog in der UI einzutragen, siehe `POST
  /api/auth/login`).
- **Nur in `Development`/`Docker`-Umgebung aktiv** (`Program.cs`,
  SEC-AUDIT-04) — in einer künftigen gehärteten Produktivumgebung bewusst
  nicht mehr unauthentifiziert einsehbar.

### Authentifizierung (REST, kein OData)

| Methode | Pfad | Beschreibung |
|---|---|---|
| POST | `/api/auth/login` | Anmeldung mit E-Mail/Passwort → JWT |
| POST | `/api/auth/entra-callback` | Entra-ID-Token → JWT |
| POST | `/api/auth/forgot-password` | Passwort-Reset anfordern |
| POST | `/api/auth/reset-password` | Passwort mit Token zurücksetzen |
| POST | `/api/auth/signup` | Neuen Benutzer registrieren |
| POST | `/api/auth/verify-email` | E-Mail-Adresse per Bestätigungslink verifizieren |
| POST | `/api/auth/resend-verification` | Bestätigungslink erneut zusenden |
| POST | `/api/auth/refresh` | JWT anhand Refresh-Token erneuern |
| POST | `/api/auth/logout` | Token invalidieren (Blacklist) |

### OData v4 (`/odata`)

EntitySets: `Users`, `BenutzerRollen`, `Circles`, `Roles`,
`PersonRoleAssignments`, `Meetings`, `Proposals`, `Objections`, `Drivers`,
`SpannungWorkItems`, `OKRs`, `KeyResults`, `OkrZyklen`, `KpiDefinitions`,
`KpiMeasurements`, `SupportTickets`, `FAQs`, `BiKompassVersions`,
`BiGuideNews`, `BiGuideKategorien`, `AppLogs`, `Stammdaten`,
`S3RollenDefinitionen`, `S3RolleKennzahlen`, `S3LebenszyklusPhasen`,
`S3CircleLebenszyklen` sowie der Singleton `Firma`.

Unterstützte Query-Optionen: `$filter`, `$select`, `$expand`, `$orderby`,
`$top`, `$skip`, `$count`.

OData-Actions: `Proposals({id})/Decide`, `Roles({id})/Assign`,
`Roles({id})/Unassign`.

### Weitere REST-Endpunkte

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/dashboard` | Aggregierte Kennzahlen |
| GET | `/api/org/graph` | Gesamte Kreis-Hierarchie als Baum inkl. Rollen/Besetzungen (kein separates GET pro einzelnem Kreis — Filterung auf einen Kreis/dessen Vorfahren erfolgt clientseitig) |
| GET/POST | `/api/org/circle-lifecycle` | Life-Cycle-Reviews für Kreise |
| POST | `/api/circles/{id}/anhaengen`, `/api/circles/{id}/loesen` | Kreis unter einen anderen Kreis hängen / zu Root-Kreis lösen |
| GET | `/api/rollen/meine` | Eigene Berechtigungen |
| GET | `/api/profil/meins` | Eigenes Profil: Name, E-Mail, Foto, Kreis-Zugehörigkeit je Kreis mit dessen Lead-Link (Kreis-ID bewusst nicht enthalten) |
| GET | `/api/profil/meins/lead-links-ueber-mir` | Lead-Link-Hierarchie ÜBER dem angemeldeten Benutzer: Lead-Links der eigenen Kreise + aller Elternkreise bis zur Wurzel, tiefensortiert |
| GET | `/api/profil/benutzer` | Schlanke Liste aller Benutzer (Id, Name, E-Mail, Aktiv) für die Benutzersuche |
| GET | `/api/profil/benutzer/{id}` | Profil eines beliebigen Benutzers (wie `/meins`, inkl. Kreis-Zugehörigkeit + Lead-Link je Kreis) |
| GET/POST/DELETE | `/api/profil/foto` | Eigenes Profilfoto ansehen/hochladen/löschen (S3) |
| GET | `/api/profil/benutzer/{id}/foto` | Profilfoto eines beliebigen Benutzers ansehen (S3) |
| GET/POST/PUT/DELETE | `/api/mailverteiler` | Mail-Verteiler-Verwaltung |
| GET/PUT | `/api/role-permissions` | Berechtigungen je Benutzerrolle |
| GET/POST/DELETE | `/api/rollendefinitionen/{id}/dokumente` | Dokumente je S3-Rollendefinition |
| GET | `/api/kreise/{id}/aktivitaeten` | Aktivitäts-Feed eines Kreises |
| GET | `/api/rollen/{id}/aktivitaeten` | Aktivitäts-Feed einer Kreisrolle |
| POST/GET/DELETE | `/api/firma/logo` | Firmenlogo hoch-/herunterladen (S3) |
| POST | `/api/bi-kompass/upload` | PDF hochladen → serverseitige, regelbasierte Text-/Kapitel-Extraktion (`UglyToad.PdfPig`), liefert Markdown zurück (kein S3-Presigned-URL, keine KI-Extraktion) |

---

## Sicherheit

- **RBAC:** Berechtigungen werden aus der Tabelle `RolePermission` gelesen
  (Fallback: hartkodiert, Cache 60 s). Benutzerrollen werden als eigene Entität
  (`BenutzerRolle`) gepflegt (Einstellungen → Benutzerrollen); Standardrollen:
  `Admin`, `User`. Weitere Rollen im Betrieb: `CircleAdmin` (Lead Link, u. a.
  Kreise und Kreisrollen bewirtschaften), `BiGuideAdmin` (BI-Guide sehen und
  verwalten, BI-Kompass bewirtschaften), `Metriker`. Den BI-Kompass lesen alle
  Rollen (`bikompass:read`). Auf bestehenden Installationen gleicht
  `scripts/fix-role-permissions.sh` die RolePermissions an.
- **Rate-Limiting:** Auth 5 Anfragen/60 s, API 100 Anfragen/10 s.
- **Security-Header:** `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Strict-Transport-Security`.
- **Audit-Log:** Verändernde Anfragen werden in `AppLog` protokolliert.

---

## Umgebungsvariablen

Konfiguration erfolgt über `appsettings*.json` oder Umgebungsvariablen
(Doppel-Unterstrich `__` als Trennzeichen für verschachtelte Schlüssel).

| Variable | Beschreibung | Beispiel |
|---|---|---|
| `ConnectionStrings__Default` | PostgreSQL-Verbindung | `Host=postgres;Database=bandspirit;Username=bandspirit;Password=…` |
| `Jwt__Secret` | JWT-Signaturschlüssel (**≥ 32 Zeichen**) | `PLACEHOLDER…` |
| `Jwt__ExpiresHours` | Token-Gültigkeit in Stunden | `8` |
| `Redis__ConnectionString` | Redis-Verbindung | `redis:6379` |
| `AzureAd__ClientId` | Entra-ID Client-ID | `Dummy` |
| `AzureAd__TenantId` | Entra-ID Tenant-ID | `Dummy` |
| `AzureAd__ClientSecret` | Entra-ID Client-Secret | `Dummy` |
| `AzureAd__Enabled` | Entra-ID aktivieren | `false` |
| `Aws__Region` | AWS-Region | `us-west-2` |
| `Aws__BucketName` | S3-Bucket | `PLACEHOLDER` |
| `Aws__FolderPrefix` | S3-Präfix | `bandspirit` |
| `AbacusAi__ApiKey` | Abacus.AI API-Key | `PLACEHOLDER` |
| `AbacusAi__WebAppId` | Abacus.AI Web-App-ID | `PLACEHOLDER` |
| `AbacusAi__NotifIds__*` | Notification-IDs | `PLACEHOLDER` |
| `AllowedOrigins` | Erlaubte CORS-Ursprünge | `http://localhost:3000` |

> **Hinweis:** In diesem Repository stehen überall `PLACEHOLDER`-Werte. Echte
> Zugangsdaten dürfen nicht eingecheckt werden.
