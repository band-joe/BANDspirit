# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

BANDspirit is an organization/governance platform (soziokratische Kreise, Meetings, Anträge/Proposals,
OKRs, KPIs, Support-Tickets) for the Band-Genossenschaft. It's a two-tier app:

- **Backend** (`backend/BandSpirit.Api`): ASP.NET Core 8 + Entity Framework Core 8 + OData v4, PostgreSQL 16
  (`de_CH.UTF-8` collation, `Europe/Zurich` timezone), Redis 7 for token blacklisting, AWS S3 (or MinIO
  locally) for file storage.
- **Frontend** (`frontend/`): Next.js 14 (App Router, standalone output), NextAuth for session/JWT handling.
- **Reverse proxy**: nginx routes `/` → frontend, `/api/*` and `/odata/*` → backend.

Read `backend/CONVENTIONS.md` before touching backend code — it defines naming/language rules and is
treated as binding, not just background.

## Commands

### Backend (`backend/BandSpirit.Api`)

```bash
dotnet restore
dotnet run                                        # runs on http://localhost:8080, Development env by default
dotnet ef database update                         # apply migrations (requires running Postgres)
dotnet ef migrations add <Name> -o Infrastructure/Data/Migrations
```

Tests live in `backend/BandSpirit.Api.Tests` (xUnit):

```bash
cd backend/BandSpirit.Api.Tests
dotnet test
dotnet test --filter FullyQualifiedName~AuthServiceTests   # single class
dotnet test --filter "FullyQualifiedName~Login_ValidCredentials_ReturnsToken"  # single test
```

### Frontend (`frontend/`)

```bash
npm run dev      # next dev
npm run build    # next build
npm run start    # next start
npm run lint      # next lint
```

There is no configured frontend test runner (no `test` script in package.json).

### Full stack via Docker

```bash
docker compose up -d --build   # brings up nginx, frontend, api, postgres, redis, minio
docker compose logs -f api
docker compose down
```

Migrations and role/permission seeding (`RolePermissionSeeder`, `DataSeeder`) run automatically on
startup in `Development` and `Docker` environments (see `Program.cs`). A seeded admin user exists at
`admin@bandspirit.local` — change its password immediately in any real environment.

Secrets in `docker-compose.yml`, `appsettings*.json`, and `.env*` are `PLACEHOLDER` values — never
commit real credentials. `Jwt:Secret` must be ≥32 chars and not the placeholder value or the API
refuses to start (see the startup check in `Program.cs`).

## Backend architecture

- **Controllers**: mix of plain REST (`AuthController`, `DashboardController`, `FirmaController`,
  `MailVerteilerController`, `CircleLifecycleController`, `RolePermissionsController`, `ProfilController`,
  `CircleHierarchyController`, …) and OData-backed controllers exposing `EntitySet`s declared in
  `Program.cs` (`Users`, `BenutzerRollen`, `Circles`, `Roles`, `PersonRoleAssignments`, `Meetings`,
  `Proposals`, `Objections`, `Drivers`, `SpannungWorkItems`, `OKRs`, `KeyResults`, `OkrZyklen`,
  `KpiDefinitions`, `KpiMeasurements`, `SupportTickets`, `FAQs`, `BiKompassVersions`, `BiGuideNews`,
  `BiGuideKategorien`, `AppLogs`, `Stammdaten`, `S3RollenDefinitionen`, `S3RolleKennzahlen`,
  `S3LebenszyklusPhasen`, `S3CircleLebenszyklen`, plus the `Firma` singleton). OData query options
  (`$filter`, `$select`, `$expand`, `$orderby`, `$top`, `$skip`, `$count`) are enabled with
  `SetMaxTop(500)`.
- **API documentation**: Swagger/OpenAPI UI at `/api/swagger` (raw schema at
  `/api/swagger/v1/swagger.json`), enabled only in `Development`/`Docker` (SEC-AUDIT-04 in
  `Program.cs`). Deliberately no `[Authorize]` on the Swagger endpoints themselves — browsing the schema
  needs no login; only "Try it out" on individual endpoints needs a JWT via the Authorize dialog.
- **Serialization split**: OData responses use `EnableLowerCamelCase()` (camelCase properties, PascalCase
  enum values e.g. `"Admin"`). Non-OData REST endpoints use `JsonNamingPolicy.CamelCase` configured
  separately in `AddJsonOptions`. Both must stay in sync with what the frontend expects — see the comment
  block in `Program.cs` around the OData model builder for the historical reason (breaking this crashes
  the frontend user list, and NextAuth's `authorize()` expects `data.token`/`data.userId`).
- **Models/DTOs**: entities never leave the API directly when they carry sensitive data — e.g. `User` is
  exposed via `UserDto` (no password hash) over OData. All entities inherit from `AuditableEntity`.
- **RBAC** (`Infrastructure/Auth/Permissions.cs`, `PermissionAuthorizationHandler`,
  `PermissionRequirement`): permission strings follow `<bereich>:<ressource>:<aktion>` or
  `<bereich>:<aktion>` (e.g. `user:read`, `org:circle:create`). One ASP.NET authorization policy per
  permission is registered dynamically from `Permissions.All` in `Program.cs`. Lookup order: in-memory
  cache (60s) → `RolePermission` DB table → hardcoded fallback (emergency only). Controllers must use the
  `Permissions.*` constants in `[Authorize(Policy = ...)]`, never string literals.
- **Auth flow**: JWT bearer tokens (default 8h TTL, configurable via `JwtOptions`), plus optional
  Microsoft Entra ID login. `TokenBlacklistService` (Redis-backed) revokes tokens by `jti` on logout.
  `OnTokenValidated` also re-checks the user's `Aktiv` flag on every request so disabling an account takes
  effect before token expiry.
- **Audit logging** (`Services/AuditService.cs`, `Infrastructure/Middleware/AuditMiddleware.cs`): two
  non-overlapping sources write to `AppLog` — `DbContext.SaveChanges` logs entity CREATE/UPDATE/DELETE
  (before/after values), `AuditMiddleware` logs access/security events (401/403/≥400 responses, IP). Don't
  add a third logging path; keep this split to avoid duplicate entries. The `AppLog.Details` JSON schema
  (`vorher`, `nachher`, `geaenderteFelder`, `ip`, `statusCode`, `pfad`) is documented in
  `backend/CONVENTIONS.md`.
- **Rate limiting**: dedicated `auth` policy (partitioned per IP) plus a global partitioned limiter
  (per authenticated user, else per IP) as defense-in-depth — see the detailed comments in `Program.cs`
  about why this is partitioned (shared IP behind nginx/Docker) rather than a single global bucket.
- **Migrations**: EF Core migrations under `Infrastructure/Data/Migrations/`. Seeding logic lives in
  `Infrastructure/Seeding/` (`DataSeeder` for base data/admin user, `RolePermissionSeeder` for
  roles/permissions — source of truth for default RBAC data; the hardcoded fallback in `RbacService` is
  only a safety net).
- **Config**: strongly-typed options classes under `Infrastructure/Config/` bound via `IOptions<T>`
  (e.g. `JwtOptions`) — don't reach into `IConfiguration` directly in services/controllers.

## Frontend architecture

- **Routing**: App Router under `app/`. `app/(dashboard)/` is a route group holding all authenticated
  pages (organisation, benutzer, einstellungen, mail-verteiler, dokumentation, application-log, ma-profil,
  hilfe, etc.) sharing `app/(dashboard)/layout.tsx`. Public/auth pages (`login`, `signup`,
  `passwort-vergessen`, `passwort-zuruecksetzen`, `email-bestaetigen`) live at the top level.
- **Auth**: NextAuth (`lib/auth-options.ts`, route at `app/api/auth/[...nextauth]`) wraps the backend JWT;
  the session's `accessToken` is injected as a Bearer token by `lib/api-client.ts`. `middleware.ts`
  enforces route access server-side: `/admin/*` requires `role === 'Admin'`, and for the four managed
  roles (Admin/Mitglied/Lead-Link/BI-Guide) `lib/nav-access.ts` provides a per-role page/tab whitelist
  (`normalizeManagedRole`, `roleCanAccessKey`, `pathToAccessKey`) that middleware enforces with a redirect
  to `ACCESS_REDIRECT_TARGET`. Benutzerrollen map as Admin→Administrator, User→Mitglied,
  CircleAdmin→Lead-Link, BiGuideAdmin→BI-Guide (the S3 circle role "Lead Link" is not used for access
  control). Unrecognized/custom roles (e.g. Metriker) are left unrestricted by that whitelist.
- **RBAC on the frontend** (`lib/rbac.ts`): client-side permission model mirroring the backend's
  `<bereich>:<aktion>` strings, used for UI filtering only — the authoritative check is always the C#
  backend. In components, check permissions with `const { can } = usePermissions()` → `can('x:y')`
  (`hooks/use-permissions.ts`): it uses the DB-backed permissions of the user's Benutzerrolle and only
  falls back to the static `DEFAULT_PERMISSIONS` (which know just Admin/User) while those are loading.
  Don't call the static `hasPermission(role, …)` from `lib/rbac.ts` in pages — it ignores DB roles such
  as CircleAdmin or BiGuideAdmin. Keep `Permission` values here in sync with
  `Infrastructure/Auth/Permissions.cs` on the backend. BI-Guide (`biguide:*`) is reserved for
  BiGuideAdmin/Admin; BI-Kompass has its own `bikompass:read` (all roles) / `bikompass:manage`
  (BiGuideAdmin/Admin). Permission changes for existing installations go into
  `scripts/fix-role-permissions.sh` (the seeder only runs on an empty table).
- **Data fetching**: all backend calls go through `lib/api-client.ts` (`apiClient.get/post/patch/put/delete`),
  which injects the bearer token, throws `ApiError` on non-2xx, and exposes `getAllPages` to transparently
  follow OData `@odata.nextLink` pagination. `lib/odata.ts` provides `ODataQuery` (fluent `$filter`/
  `$select`/`$expand`/`$orderby`/`$top`/`$skip`/`$count`/`$search` builder) plus `odataQueries`, a set of
  prebuilt queries per entity — prefer extending `odataQueries` over hand-building ad-hoc OData strings.
  Server data + caching goes through React Query (`@tanstack/react-query`); see `hooks/use-odata.ts` and
  `hooks/use-odata-mutation.ts` for the standard query/mutation wrappers and `lib/query-keys.ts` for cache
  key conventions.
- **UI system**: see `frontend/STYLE_GUIDE.md` for the full design token / component reference (typography,
  color tokens, spacing scale, `AppShell`/`AuthLayout`/`PageHeader` layout components, animation
  components under `@/components/ui/animate`, and the full `@/components/ui/*` component catalogue). Don't
  remove entries from the root `app/layout.tsx` provider stack without reason — `ThemeProvider`, `Toaster`,
  and `ChunkLoadErrorHandler` are all load-bearing (the latter specifically works around a known
  ChunkLoadError race condition).
- **Stammdaten**: generic key/value master-data records (`Kategorie`/`SortOrder`-based) are managed via
  `components/stammdaten-verwaltung.tsx`, `components/stammdaten-select.tsx`, and `hooks/use-stammdaten.ts`
  — reuse these instead of building bespoke dropdown/admin UI for new lookup-style data.

## Language conventions

Domain code is German, infrastructure code is English (see `backend/CONVENTIONS.md` §1.1 for the full
table): entities/services/controllers/domain properties use German names (`Firma`, `Kreis`,
`BenutzerRolle`, `Beschreibung`, `Aktiv`); ASP.NET infra, DTOs, and generic utilities use English
(`BandSpiritDbContext`, `UserDto`, `JwtOptions`). Sociocracy 3.0 model names intentionally stay in English
(`S3Circle`, `S3Role`, `S3Proposal`, `Driver`, `Objection`) to match S3 literature, while their domain
properties (`Beschreibung`, `Titel`) stay German. This split is intentional — don't "fix" it by
translating one side to match the other.

## Handling of personal/sensitive data

This is an internal pilot app for Band-Genossenschaft. Do not paste real client/Klient personal data, IV
reports, staff/HR data, or real credentials/secrets into prompts or files — flag it once if you notice
such data was pasted, then continue. This does not apply to obvious placeholders, test/seed data, or
schema/field names.
