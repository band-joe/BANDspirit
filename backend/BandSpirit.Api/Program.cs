using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using BandSpirit.Api.DTOs;
using BandSpirit.Api.Infrastructure.Auth;
using BandSpirit.Api.Infrastructure.Config;
using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Infrastructure.Middleware;
using BandSpirit.Api.Infrastructure.Seeding;
using BandSpirit.Api.Models;
using BandSpirit.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.OData;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OData.ModelBuilder;
using Serilog;

// ── Serilog früh initialisieren ─────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    // DSGVO-M1: Log-Dateien max. 90 Tage aufbewahren (Speicherbegrenzung).
    .WriteTo.File("logs/bandspirit-.log", rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 90)
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // ── Serilog als Host-Logger ──────────────────────────────────────────────
    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .WriteTo.Console()
        .WriteTo.File("logs/bandspirit-.log", rollingInterval: RollingInterval.Day,
            retainedFileCountLimit: 90));

    var config = builder.Configuration;

    // ── OData EDM-Modell aufbauen ─────────────────────────────────────────────
    var odataModelBuilder = new ODataConventionModelBuilder();
    // SEC-M4: UserDto statt User exposieren (ohne Password-Hash)
    odataModelBuilder.EntitySet<UserDto>("Users");
    odataModelBuilder.EntitySet<BenutzerRolle>("BenutzerRollen");
    odataModelBuilder.EntitySet<S3Circle>("Circles");
    odataModelBuilder.EntitySet<S3Role>("Roles");
    odataModelBuilder.EntitySet<S3PersonRoleAssignment>("PersonRoleAssignments");
    odataModelBuilder.EntitySet<S3Meeting>("Meetings");
    odataModelBuilder.EntitySet<S3Proposal>("Proposals");
    odataModelBuilder.EntitySet<S3Driver>("Drivers");
    odataModelBuilder.EntitySet<OKR>("OKRs");
    odataModelBuilder.EntitySet<KeyResult>("KeyResults");
    odataModelBuilder.EntitySet<KpiDefinition>("KpiDefinitions");
    odataModelBuilder.EntitySet<KpiMeasurement>("KpiMeasurements");
    odataModelBuilder.EntitySet<OkrZyklus>("OkrZyklen");
    // UI-11 (P005): SupportTicketDto statt roher Entität - flaches ErstellerName-Feld
    // per Server-Join, ohne die volle User-Entität (Passwort-Hash!) über $expand
    // zugänglich zu machen (siehe SupportTicket.Ersteller-Kommentar).
    odataModelBuilder.EntitySet<SupportTicketDto>("SupportTickets");
    odataModelBuilder.EntitySet<FAQ>("FAQs");
    odataModelBuilder.EntitySet<BIKompassVersion>("BiKompassVersions");
    odataModelBuilder.EntitySet<BIGuideNews>("BiGuideNews");
    odataModelBuilder.EntitySet<BiGuideKategorie>("BiGuideKategorien");
    odataModelBuilder.EntitySet<AppLog>("AppLogs");
    odataModelBuilder.EntitySet<Stammdaten>("Stammdaten");
    odataModelBuilder.EntitySet<S3RollenDefinition>("S3RollenDefinitionen");
    odataModelBuilder.EntitySet<S3RolleKennzahl>("S3RolleKennzahlen");
    odataModelBuilder.EntitySet<S3LebenszyklusPhase>("S3LebenszyklusPhasen");
    odataModelBuilder.EntitySet<S3CircleLebenszyklus>("S3CircleLebenszyklen");
    odataModelBuilder.EntitySet<SpannungWorkItem>("SpannungWorkItems");
    // UI-12 (P005): ZugewiesenAn (User-Navigation) explizit aus dem OData-EDM-
    // Modell ausschliessen - sonst könnte $expand=ZugewiesenAn die volle
    // User-Entität (inkl. Passwort-Hash) offenlegen. Das Frontend löst den
    // Anzeigenamen stattdessen clientseitig über die bereits geladene
    // Users-Liste auf.
    odataModelBuilder.EntityType<SpannungWorkItem>().Ignore(w => w.ZugewiesenAn);
    odataModelBuilder.EntitySet<S3Objection>("Objections");
    odataModelBuilder.Singleton<Firma>("Firma");

    // OData Actions
    odataModelBuilder.EntityType<S3Proposal>().Action("Decide").Parameter<string>("status");
    odataModelBuilder.EntityType<S3Role>().Action("Assign").Parameter<string>("userId");
    odataModelBuilder.EntityType<S3Role>().Action("Unassign").Parameter<string>("userId");

    // WICHTIG: OData-Eigenschaftsnamen als camelCase serialisieren (id, name, role,
    // aktiv, createdAt ...). Das gesamte Frontend erwartet camelCase; ohne diese
    // Zeile liefert OData PascalCase (Name, Role, Aktiv ...), wodurch im Frontend
    // alle Felder `undefined` sind und z. B. die Benutzerverwaltung mit einer
    // clientseitigen Exception (u.name.charAt(...) auf undefined) abstürzt.
    // Enum-Werte (z. B. Role) bleiben dabei PascalCase ("Admin"), passend zu rbac.ts.
    // PascalCase in $orderby/$filter-Query-Strings bleibt weiterhin gültig.
    odataModelBuilder.EnableLowerCamelCase();

    var edmModel = odataModelBuilder.GetEdmModel();

    // ── MVC + OData ────────────────────────────────────────────────────────────
    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            // Case-insensitive Property-Binding (z. B. "email" → Email)
            options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
            // K84: camelCase-Serialisierung für alle non-OData-Endpunkte.
            // Ohne diese Zeile liefert System.Text.Json PascalCase (Token, UserId, ...).
            // NextAuth authorize() erwartet data.token und data.userId (camelCase).
            // Fehlende Felder → authorize() gibt null zurück → AccessDenied im Browser.
            // OData-Endpunkte sind davon unberührt (eigene Serialisierung via EnableLowerCamelCase).
            options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        })
        .AddOData(options => options
            .Select().Filter().OrderBy().Expand().Count().SetMaxTop(500)
            .AddRouteComponents("odata", edmModel));

    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
        {
            Title = "BANDspirit API",
            Version = "v1",
            Description =
                "REST- und OData-Schnittstelle für BANDspirit.\n\n" +
                "**Authentifizierung:** JWT Bearer-Token. Token via `POST /api/auth/login` " +
                "beziehen, dann im Authorize-Dialog (🔒) als `Bearer <token>` eintragen.\n\n" +
                "**OData-Endpunkte** unterstützen `$filter`, `$orderby`, `$select`, `$expand`, `$top`, `$skip`, `$count`."
        });

        // JWT Bearer-Token-Authentifizierung im Swagger-UI aktivieren.
        c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
        {
            Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = Microsoft.OpenApi.Models.ParameterLocation.Header,
            Description = "JWT-Token, erhalten via POST /api/auth/login. Format: Bearer {token}"
        });
        c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
        {
            {
                new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Reference = new Microsoft.OpenApi.Models.OpenApiReference
                    {
                        Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        });

        // XML-Inline-Kommentare der Controller einbinden (falls vorhanden).
        var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
        var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
        if (File.Exists(xmlPath))
        {
            c.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);
        }
    });

    // ── HttpContext-Zugriff (für Audit-Felder: aktueller Benutzer) ───────────────
    builder.Services.AddHttpContextAccessor();

    // ── Datenbank (PostgreSQL) ──────────────────────────────────────────────────
    builder.Services.AddDbContext<BandSpiritDbContext>(options =>
        options.UseNpgsql(config.GetConnectionString("Default")));

    // ── Caching ─────────────────────────────────────────────────────────────────
    builder.Services.AddMemoryCache();

    // ── Redis-Verbindung (für Token-Sperrliste / SEC-M6) ─────────────────────────
    // AbortOnConnectFail=false: Der App-Start scheitert NICHT, falls Redis kurzzeitig
    // nicht erreichbar ist; die Verbindung wird im Hintergrund wiederhergestellt.
    var redisConn = config["Redis:ConnectionString"];
    if (!string.IsNullOrEmpty(redisConn))
    {
        builder.Services.AddSingleton<StackExchange.Redis.IConnectionMultiplexer>(sp =>
        {
            var options = StackExchange.Redis.ConfigurationOptions.Parse(redisConn);
            options.AbortOnConnectFail = false;
            return StackExchange.Redis.ConnectionMultiplexer.Connect(options);
        });
    }
    builder.Services.AddSingleton<TokenBlacklistService>();

    // ── DSGVO-M1: Aufbewahrungs-/Löschkonzept ────────────────────────────────────
    // Hintergrunddienst, der alte Audit-Logs und verbrauchte Reset-Tokens gemäß
    // konfigurierbarer Fristen (Abschnitt "Retention") automatisch löscht.
    builder.Services.AddHostedService<RetentionCleanupService>();

    // ── Benachrichtigungen ──────────────────────────────────────────────────────
    // K82: NotificationService versendet E-Mails via SMTP (MailKit) über einen
    // internen Relay (Smtp__Host, z. B. mail.band.local:25).
    builder.Services.AddHttpClient(); // weiterhin registriert (allg. Nutzung)
    builder.Services.AddScoped<NotificationService>();

    // ── S3-Client (Singleton) ────────────────────────────────────────────────────
    builder.Services.AddSingleton<Amazon.S3.IAmazonS3>(sp =>
    {
        var cfg = sp.GetRequiredService<IConfiguration>();
        var serviceUrl = cfg["S3:ServiceUrl"];
        var region = cfg["S3:Region"] ?? "us-east-1";
        var accessKey = cfg["S3:AccessKey"];
        var secretKey = cfg["S3:SecretKey"];
        var forcePathStyle = cfg.GetValue<bool>("S3:ForcePathStyle", false);

        var s3Config = new Amazon.S3.AmazonS3Config
        {
            RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(region),
            ForcePathStyle = forcePathStyle
        };

        if (!string.IsNullOrEmpty(serviceUrl))
        {
            s3Config.ServiceURL = serviceUrl;
        }

        if (!string.IsNullOrEmpty(accessKey) && !string.IsNullOrEmpty(secretKey))
        {
            return new Amazon.S3.AmazonS3Client(accessKey, secretKey, s3Config);
        }

        return new Amazon.S3.AmazonS3Client(s3Config);
    });

    // ── CC-M4: JWT-Konfiguration typisiert (IOptions<JwtOptions>) ────────────────
    builder.Services.Configure<JwtOptions>(config.GetSection(JwtOptions.Section));
    
    // SEC-M3: Startup-Validierung – Platzhalter-Secret NICHT produktiv erlaubt!
    var jwtSecret = config["Jwt:Secret"] ?? "PLACEHOLDER_MIN_32_CHARS_PLACEHOLDER_1234";
    const string PLACEHOLDER_SECRET = "PLACEHOLDER_MIN_32_CHARS_PLACEHOLDER_1234";
    if (jwtSecret == PLACEHOLDER_SECRET)
    {
        throw new InvalidOperationException(
            "SICHERHEITSFEHLER: Der JWT-Secret ist noch auf dem Platzhalter-Wert. " +
            "Bitte setzen Sie die Umgebungsvariable 'Jwt__Secret' auf einen sicheren, zufälligen Wert (min. 32 Zeichen). " +
            "Beispiel: openssl rand -base64 32");
    }

    // ── Anwendungsdienste (DI) ───────────────────────────────────────────────────
    builder.Services.AddScoped<AuthService>();
    builder.Services.AddScoped<JwtTokenService>();
    builder.Services.AddScoped<RbacService>();
    builder.Services.AddScoped<AuditService>();
    builder.Services.AddScoped<S3StorageService>();
    builder.Services.AddScoped<IcsService>();
    builder.Services.AddScoped<KpiService>();
    builder.Services.AddScoped<OkrService>();

    // ── JWT-Authentifizierung ─────────────────────────────────────────────────────
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = config["Jwt:Issuer"] ?? "BandSpirit",
                ValidAudience = config["Jwt:Audience"] ?? "BandSpirit",
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
                ClockSkew = TimeSpan.Zero
            };

            // SEC-M6: Nach erfolgreicher Signatur-/Ablaufprüfung zusätzlich die
            // Sperrliste prüfen. Gesperrte Tokens (jti) werden abgewiesen.
            // APP-02 (P005): Zusätzlich wird bei jedem Request geprüft, ob der
            // Benutzer noch aktiv ist. Deaktivierte Konten werden sofort abgewiesen,
            // ohne auf Token-Ablauf warten zu müssen.
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    var jti = context.Principal?.FindFirst(
                        System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)?.Value;
                    if (!string.IsNullOrEmpty(jti))
                    {
                        var blacklist = context.HttpContext.RequestServices
                            .GetRequiredService<TokenBlacklistService>();
                        if (await blacklist.IsRevokedAsync(jti))
                        {
                            context.Fail("Token wurde widerrufen (Logout).");
                            return;
                        }
                    }

                    // APP-02 (P005): Benutzer-Aktiv-Status aus DB prüfen.
                    // Verhindert, dass deaktivierte Konten mit laufenden Tokens
                    // weiterhin Zugriff erhalten.
                    var userIdClaim = context.Principal?.FindFirst(
                        System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                        ?? context.Principal?.FindFirst("sub")?.Value;
                    if (Guid.TryParse(userIdClaim, out var userId))
                    {
                        var db = context.HttpContext.RequestServices
                            .GetRequiredService<BandSpirit.Api.Infrastructure.Data.BandSpiritDbContext>();
                        var benutzer = await db.Users
                            .AsNoTracking()
                            .Where(u => u.Id == userId)
                            .Select(u => new { u.Aktiv })
                            .FirstOrDefaultAsync();
                        if (benutzer is null || !benutzer.Aktiv)
                        {
                            context.Fail("Konto ist deaktiviert oder nicht mehr vorhanden.");
                        }
                    }
                }
            };
        });

    // ── RBAC-Autorisierung ───────────────────────────────────────────────────────
    builder.Services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, PermissionAuthorizationHandler>();
    builder.Services.AddAuthorization(options =>
    {
        // Für jede Berechtigung eine gleichnamige Policy registrieren.
        foreach (var permission in Permissions.All)
        {
            options.AddPolicy(permission, policy =>
                policy.Requirements.Add(new PermissionRequirement(permission)));
        }
    });

    // ── CORS für das Frontend ──────────────────────────────────────────────────────
    var allowedOrigins = config.GetSection("AllowedOrigins").Get<string[]>()
                         ?? new[] { "http://localhost:3000" };
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("Frontend", policy => policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
    });

    // ── Rate-Limiting (Fixed Window) ────────────────────────────────────────────────
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        // Auth: strengeres Limit für Login/Signup/Reset (Brute-Force-Schutz).
        //
        // FIX (Login-401 hinter nginx/Docker): Zuvor war dies ein EINZIGER globaler
        // Fixed-Window-Bucket (5/60s NICHT partitioniert). In der Docker-Architektur
        // läuft der Login serverseitig über den Frontend-Container, d. h. das Backend
        // sieht für ALLE Anmeldungen dieselbe Absender-IP. Dadurch teilten sich sämtliche
        // Nutzer die 5 Versuche/Minute -> bereits wenige (Test-)Logins erschöpften den
        // Bucket -> Backend antwortete 429 -> NextAuth authorize() erhielt !res.ok ->
        // return null -> 401 im Browser (ohne Passwortfehler).
        //
        // Nun PRO IP partitioniert und realistischer dimensioniert. In Kombination mit
        // UseForwardedHeaders (siehe Pipeline) wird die echte Client-IP aus X-Forwarded-For
        // verwendet, sofern vorhanden.
        options.AddPolicy("auth", httpContext =>
        {
            var partitionKey = httpContext.Connection.RemoteIpAddress?.ToString() ?? "anonym";
            return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromSeconds(60),
                PermitLimit = 20,
                QueueLimit = 0
            });
        });

        // API: 100 Anfragen / 10 Sekunden (benannte Policy, optional pro Controller)
        options.AddFixedWindowLimiter("api", opt =>
        {
            opt.Window = TimeSpan.FromSeconds(10);
            opt.PermitLimit = 100;
            opt.QueueLimit = 0;
        });

        // SEC-M7: GLOBALES Rate-Limit für ALLE Endpunkte (Defense-in-Depth).
        // Partitioniert pro Benutzer (falls angemeldet) bzw. pro IP-Adresse.
        // Zuvor war nur der Auth-Controller limitiert; alle anderen Endpunkte
        // (OData, Dashboard, Uploads) waren ohne Begrenzung (DoS-/Brute-Force-Risiko).
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        {
            var partitionKey = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                               ?? httpContext.Connection.RemoteIpAddress?.ToString()
                               ?? "anonym";

            return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromSeconds(10),
                PermitLimit = 100,
                QueueLimit = 0
            });
        });
    });

    // ── Health Checks (DB + Redis) ────────────────────────────────────────────────
    var healthChecks = builder.Services.AddHealthChecks();
    var connectionString = config.GetConnectionString("Default");
    if (!string.IsNullOrEmpty(connectionString))
    {
        healthChecks.AddNpgSql(connectionString, name: "postgres");
    }
    var redisConnection = config["Redis:ConnectionString"];
    if (!string.IsNullOrEmpty(redisConnection))
    {
        healthChecks.AddRedis(redisConnection, name: "redis");
    }

    var app = builder.Build();

    // ── Middleware-Pipeline (Reihenfolge beachten) ──────────────────────────────────

    // Echte Client-IP hinter dem nginx-Reverse-Proxy ermitteln (X-Forwarded-For /
    // X-Forwarded-Proto). MUSS früh in der Pipeline stehen, damit nachgelagerte
    // Middleware (Rate-Limiting, Logging) die korrekte Absender-IP sieht.
    // KnownNetworks/KnownProxies werden geleert, da die Proxys im Docker-Netz mit
    // dynamischen internen IPs laufen und ohnehin nicht öffentlich erreichbar sind.
    var forwardedOptions = new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
    };
    forwardedOptions.KnownNetworks.Clear();
    forwardedOptions.KnownProxies.Clear();
    app.UseForwardedHeaders(forwardedOptions);

    app.UseSerilogRequestLogging();

    // API-Dokumentation (Swagger / OpenAPI) ist in allen Environments verfügbar.
    // Route-Präfix /api/swagger/ → nginx leitet /api/* an das Backend weiter,
    // dadurch ist die Doku ohne separate nginx-Konfiguration erreichbar.
    // Kein [Authorize] auf den Swagger-Endpunkten: die Doku ist als Deeplink
    // ohne Berechtigungsprüfung zugänglich. Die Try-It-Out-Funktion erfordert
    // ein gültiges JWT-Token (im Authorize-Dialog einzutragen).
    app.UseSwagger(c =>
    {
        c.RouteTemplate = "api/swagger/{documentName}/swagger.json";
    });
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/api/swagger/v1/swagger.json", "BANDspirit API v1");
        c.RoutePrefix = "api/swagger";
        c.DocumentTitle = "BANDspirit – API Dokumentation";
        c.EnableTryItOutByDefault();
        c.DisplayRequestDuration();
        c.EnableFilter();
        c.EnableDeepLinking();
    });

    if (!app.Environment.IsDevelopment())
    {
        // In Produktion: globale Fehlerbehandlung + HSTS.
        app.UseExceptionHandler("/error");
        app.UseHsts();
    }

    // Sicherheits-Header setzen.
    app.UseMiddleware<SecurityHeadersMiddleware>();

    app.UseCors("Frontend");

    app.UseRateLimiter();

    app.UseAuthentication();
    app.UseAuthorization();

    // Audit-Logging nach der Autorisierung (Benutzer ist bekannt).
    app.UseMiddleware<AuditMiddleware>();

    app.MapControllers();
    app.MapHealthChecks("/health");

    // Fehler-Endpunkt für UseExceptionHandler("/error") – liefert RFC 7807
    // ProblemDetails statt einem leeren 500 Internal Server Error.
    // Ohne diesen Endpunkt antwortet UseExceptionHandler mit content-length 0,
    // was die Fehlerdiagnose vollständig verhindert.
    app.Map("/error", (HttpContext ctx, ILoggerFactory loggerFactory) =>
    {
        var ex = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        if (ex is not null)
        {
            var logger = loggerFactory.CreateLogger("GlobalErrorHandler");
            logger.LogError(ex, "Unbehandelte Exception: {Message}", ex.Message);
        }
        var code = ex is UnauthorizedAccessException ? StatusCodes.Status403Forbidden
                                                     : StatusCodes.Status500InternalServerError;
        return Results.Problem(
            title: "Ein interner Fehler ist aufgetreten.",
            detail: ex?.Message,
            statusCode: code);
    }).ExcludeFromDescription();

    // ── EF-Migration + Seeding (Development + Docker) ────────────────────────────────
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<BandSpiritDbContext>();
        var cfg = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        
        // DataSeeder auch im Docker-Environment ausführen, damit Admin-Benutzer angelegt wird
        if (app.Environment.IsDevelopment() || app.Environment.EnvironmentName == "Docker")
        {
            try
            {
                await db.Database.MigrateAsync();
                await RolePermissionSeeder.SeedAsync(db);
                await DataSeeder.SeedAsync(db, cfg, logger);
                Log.Information("Datenbank migriert und Seed-Daten angelegt.");
            }
            catch (Exception ex)
            {
                Log.Warning(ex, "Migration/Seeding beim Start übersprungen (DB evtl. nicht erreichbar).");
            }
        }
    }

    Log.Information("BANDspirit API startet …");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "BANDspirit API konnte nicht gestartet werden.");
}
finally
{
    Log.CloseAndFlush();
}

/// <summary>Sichtbar für Integrationstests.</summary>
public partial class Program { }
