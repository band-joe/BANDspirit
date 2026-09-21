using System.Security.Claims;
using System.Text.Json;
using BandSpirit.Api.Infrastructure;
using BandSpirit.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace BandSpirit.Api.Infrastructure.Data;

/// <summary>
/// Zentraler EF-Core-DbContext für BANDspirit.
/// Enthält alle DbSets, die Fluent-API-Konfiguration (Indizes, Unique Constraints)
/// sowie einen Override von SaveChangesAsync zum automatischen Setzen der Audit-Felder.
/// </summary>
public class BandSpiritDbContext : DbContext
{
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public BandSpiritDbContext(DbContextOptions<BandSpiritDbContext> options) : base(options)
    {
    }

    public BandSpiritDbContext(DbContextOptions<BandSpiritDbContext> options, IHttpContextAccessor httpContextAccessor)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>Ermittelt die ID des aktuell angemeldeten Benutzers aus dem Token (oder null).</summary>
    private string? AktuelleBenutzerId()
    {
        var user = _httpContextAccessor?.HttpContext?.User;
        if (user is null) return null;
        return user.FindFirstValue(ClaimTypes.NameIdentifier)
               ?? user.FindFirstValue("sub");
    }

    // ── DbSets (28 Entitäten) ────────────────────────────────────────────────
    public DbSet<User> Users => Set<User>();
    public DbSet<BenutzerRolle> BenutzerRollen => Set<BenutzerRolle>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Firma> Firmas => Set<Firma>();
    public DbSet<Stammdaten> Stammdaten => Set<Stammdaten>();
    public DbSet<AppLog> AppLogs => Set<AppLog>();
    public DbSet<S3Circle> S3Circles => Set<S3Circle>();
    public DbSet<S3RollenDefinition> S3RollenDefinitionen => Set<S3RollenDefinition>();
    public DbSet<S3LebenszyklusPhase> S3LebenszyklusPhasen => Set<S3LebenszyklusPhase>();
    public DbSet<S3CircleLebenszyklus> S3CircleLebenszyklen => Set<S3CircleLebenszyklus>();
    public DbSet<S3Role> S3Roles => Set<S3Role>();
    public DbSet<S3PersonRoleAssignment> S3PersonRoleAssignments => Set<S3PersonRoleAssignment>();
    public DbSet<S3CircleReview> S3CircleReviews => Set<S3CircleReview>();
    public DbSet<S3Meeting> S3Meetings => Set<S3Meeting>();
    public DbSet<S3MeetingAgendaItem> S3MeetingAgendaItems => Set<S3MeetingAgendaItem>();
    public DbSet<S3Proposal> S3Proposals => Set<S3Proposal>();
    public DbSet<S3Objection> S3Objections => Set<S3Objection>();
    public DbSet<S3Decision> S3Decisions => Set<S3Decision>();
    public DbSet<S3Driver> S3Drivers => Set<S3Driver>();
    public DbSet<SpannungWorkItem> SpannungWorkItems => Set<SpannungWorkItem>();
    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
    public DbSet<FAQ> FAQs => Set<FAQ>();
    public DbSet<BIKompassVersion> BIKompassVersionen => Set<BIKompassVersion>();
    public DbSet<BIGuideNews> BIGuideNews => Set<BIGuideNews>();
    public DbSet<BiGuideKategorie> BiGuideKategorien => Set<BiGuideKategorie>();
    public DbSet<OKR> OKRs => Set<OKR>();
    public DbSet<KeyResult> KeyResults => Set<KeyResult>();
    public DbSet<KpiDefinition> KpiDefinitions => Set<KpiDefinition>();
    public DbSet<KpiMeasurement> KpiMeasurements => Set<KpiMeasurement>();
    public DbSet<OkrZyklus> OkrZyklen => Set<OkrZyklus>();
    public DbSet<MailVerteiler> MailVerteiler => Set<MailVerteiler>();
    public DbSet<MailVerteilerBenutzer> MailVerteilerBenutzer => Set<MailVerteilerBenutzer>();
    public DbSet<S3RolleKennzahl> S3RolleKennzahlen => Set<S3RolleKennzahl>();
    public DbSet<S3RolleDokument> S3RolleDokumente => Set<S3RolleDokument>();

    /// <summary>Konfiguriert Indizes, Unique Constraints und Beziehungen.</summary>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── APP-19 (P005): DateTime UTC-Normalisierung ─────────────────────
        // PostgreSQL timestamp with time zone erfordert DateTimeKind.Utc.
        // Alle DateTime/DateTime?-Properties werden beim Lesen und Schreiben
        // automatisch auf Utc normalisiert, damit ISO-Z-Werte vom Frontend
        // keinen HTTP 500 (Kind=Unspecified) auslösen.
        var utcConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
            v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
        var utcNullConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime?, DateTime?>(
            v => v.HasValue ? (v.Value.Kind == DateTimeKind.Utc ? v.Value : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)) : v,
            v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                    property.SetValueConverter(utcConverter);
                else if (property.ClrType == typeof(DateTime?))
                    property.SetValueConverter(utcNullConverter);
            }
        }

        // ── User ──────────────────────────────────────────────────────────
        // Role ist ein String (Name einer BenutzerRolle). Die Spalte war bereits
        // als Text gespeichert (früher via HasConversion<string>() über das Enum),
        // daher ändert sich am DB-Schema nichts.
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.HasIndex(u => u.Role);
            // DB-13: Unique-Index auf normalisierte E-Mail (case-insensitive Duplikatsprüfung)
            e.HasIndex(u => u.EmailCanonical).IsUnique();
        });

        // ── BenutzerRolle (Applikationsrolle, Unique-Name) ─────────────────
        modelBuilder.Entity<BenutzerRolle>(e =>
        {
            e.HasIndex(r => r.Name).IsUnique();
        });

        // ── PasswordResetToken ────────────────────────────────────────────
        modelBuilder.Entity<PasswordResetToken>(e =>
        {
            e.HasIndex(t => t.Token).IsUnique();
            e.HasIndex(t => t.UserId);
        });

        // ── RefreshToken (APP-02: Session-Timeout) ─────────────────────────
        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasIndex(t => t.Token).IsUnique();
            e.HasIndex(t => t.UserId);
            e.HasIndex(t => t.ExpiresAt);
        });

        // ── RolePermission (Unique: [Role, Permission]) ───────────────────
        modelBuilder.Entity<RolePermission>(e =>
        {
            e.HasIndex(r => new { r.Role, r.Permission }).IsUnique();
        });

        // ── Firma (Singleton, string-Id) ──────────────────────────────────
        modelBuilder.Entity<Firma>(e =>
        {
            e.Property(f => f.Id).ValueGeneratedNever();
        });

        // ── Stammdaten (Unique: [Kategorie, Code]) ────────────────────────
        modelBuilder.Entity<Stammdaten>(e =>
        {
            e.HasIndex(s => new { s.Kategorie, s.Code }).IsUnique();
        });

        // ── AppLog (Indizes für schnelle Abfragen) ────────────────────────
        modelBuilder.Entity<AppLog>(e =>
        {
            e.HasIndex(a => a.Modul);
            e.HasIndex(a => a.UserId);
            e.HasIndex(a => a.CreatedAt);
            e.HasIndex(a => a.EntityId);
        });

        // ── S3Circle (Self-Reference + Indizes) ───────────────────────────
        modelBuilder.Entity<S3Circle>(e =>
        {
            e.Property(c => c.Name).IsRequired().HasMaxLength(200);
            e.HasIndex(c => c.ParentId);
            e.HasIndex(c => c.RootId);
            e.HasIndex(c => c.IsActive);
            e.HasIndex(c => c.LifecyclePhase);
            e.HasOne(c => c.Parent)
                .WithMany()
                .HasForeignKey(c => c.ParentId)
                .OnDelete(DeleteBehavior.Restrict);
            // RootId als eigenständige Selbstreferenz ohne Navigationsproperty,
            // damit EF sie nicht mit der Parent-Beziehung zu einer 1:1-Beziehung
            // zusammenfasst (sonst würde ParentId fälschlich unique).
            e.HasOne<S3Circle>()
                .WithMany()
                .HasForeignKey(c => c.RootId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── S3LebenszyklusPhase (Stammdaten) ──────────────────────────────
        modelBuilder.Entity<S3LebenszyklusPhase>(e =>
        {
            e.Property(p => p.Name).IsRequired().HasMaxLength(100);
            e.HasIndex(p => p.Name).IsUnique();
            e.HasIndex(p => p.Aktiv);
        });

        // ── S3CircleLebenszyklus (Historie) ───────────────────────────────
        modelBuilder.Entity<S3CircleLebenszyklus>(e =>
        {
            e.HasIndex(l => l.S3CircleId);
            e.HasIndex(l => l.StartDatum);
            e.HasOne(l => l.S3Circle)
                .WithMany()
                .HasForeignKey(l => l.S3CircleId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.LebenszyklusPhase)
                .WithMany()
                .HasForeignKey(l => l.LebenszyklusPhaseId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── S3Role ─────────────────────────────────────────────────────────
        modelBuilder.Entity<S3Role>(e =>
        {
            e.HasIndex(r => r.CircleId);
            // DB-03-Fix: RolesController.Post prüfte Eindeutigkeit von
            // (CircleId, RollenDefinitionId) nur per Anwendungscode (Race
            // Condition bei gleichzeitigen Requests möglich) und ohne
            // DB-Backstop; PATCH prüfte gar nicht. Ein Composite-Unique-Index
            // ist jetzt die tatsächliche Quelle der Wahrheit; die Controller
            // fangen die resultierende Unique-Violation ab und melden sie als
            // freundlichen 409 statt eines rohen 500ers.
            e.HasIndex(r => new { r.CircleId, r.RollenDefinitionId }).IsUnique();
            e.HasOne(r => r.Circle).WithMany().HasForeignKey(r => r.CircleId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.RollenDefinition).WithMany().HasForeignKey(r => r.RollenDefinitionId).OnDelete(DeleteBehavior.Restrict);
        });

        // ── S3Rolle Detail-Tabs (Kennzahlen, Dokumente) ──────────────────
        // DB-04-Fix: RoleId/RollenDefinitionId sind beide nullable (Instanz-
        // ODER Definitions-Eigentümer). Ohne Constraint konnten Zeilen mit
        // BEIDEN oder KEINEM Owner entstehen (z. B. via generischem OData-PATCH
        // auf S3RolleKennzahlen, das beide Felder clientseitig überschreiben
        // liess). CHECK erzwingt jetzt "genau einer von beiden".
        modelBuilder.Entity<S3RolleKennzahl>(e =>
        {
            e.HasIndex(k => k.RoleId);
            e.HasIndex(k => k.RollenDefinitionId);
            e.HasOne(k => k.Role).WithMany(r => r.Kennzahlen).HasForeignKey(k => k.RoleId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(k => k.RollenDefinition).WithMany().HasForeignKey(k => k.RollenDefinitionId).OnDelete(DeleteBehavior.Cascade);
            e.ToTable(t => t.HasCheckConstraint(
                "CK_S3RolleKennzahlen_GenauEinOwner",
                "(\"RoleId\" IS NOT NULL) <> (\"RollenDefinitionId\" IS NOT NULL)"));
        });

        modelBuilder.Entity<S3RolleDokument>(e =>
        {
            e.HasIndex(d => d.RoleId);
            e.HasIndex(d => d.RollenDefinitionId);
            e.HasOne(d => d.Role).WithMany(r => r.Dokumente).HasForeignKey(d => d.RoleId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(d => d.RollenDefinition).WithMany().HasForeignKey(d => d.RollenDefinitionId).OnDelete(DeleteBehavior.Cascade);
            e.ToTable(t => t.HasCheckConstraint(
                "CK_S3RolleDokumente_GenauEinOwner",
                "(\"RoleId\" IS NOT NULL) <> (\"RollenDefinitionId\" IS NOT NULL)"));
        });

        // ── S3PersonRoleAssignment (Unique: [UserId, RoleId]) ─────────────
        modelBuilder.Entity<S3PersonRoleAssignment>(e =>
        {
            e.HasIndex(p => new { p.UserId, p.RoleId }).IsUnique();
            e.HasOne(p => p.Role).WithMany(r => r.Assignments).HasForeignKey(p => p.RoleId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── SupportTicket (UI-11 / DB-01: FK auf Ersteller statt loser string) ──
        modelBuilder.Entity<SupportTicket>(e =>
        {
            e.HasIndex(t => t.ErstellerId);
            e.HasOne(t => t.Ersteller).WithMany().HasForeignKey(t => t.ErstellerId).OnDelete(DeleteBehavior.SetNull);
        });

        // ── S3Meeting (Indizes) ───────────────────────────────────────────
        modelBuilder.Entity<S3Meeting>(e =>
        {
            e.HasIndex(m => m.CircleId);
            e.HasIndex(m => m.ScheduledAt);
            e.HasIndex(m => m.Status);
            e.HasOne(m => m.Circle).WithMany().HasForeignKey(m => m.CircleId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(m => m.AgendaItems).WithOne(a => a.Meeting!).HasForeignKey(a => a.MeetingId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── S3Proposal / S3Objection ──────────────────────────────────────
        modelBuilder.Entity<S3Proposal>(e =>
        {
            e.HasIndex(p => p.CircleId);
            e.HasMany(p => p.Objections).WithOne(o => o.Proposal!).HasForeignKey(o => o.ProposalId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── S3Driver / SpannungWorkItem ───────────────────────────────────
        modelBuilder.Entity<S3Driver>(e =>
        {
            e.HasIndex(d => d.CircleId);
            // UI-12-Fix: Fehlte bisher explizit - $expand=Circle lieferte deshalb
            // immer null statt des tatsächlichen Kreises (Frontend griff ohne
            // Optional-Chaining auf driver.circle.name/.id zu -> Absturz).
            e.HasOne(d => d.Circle).WithMany().HasForeignKey(d => d.CircleId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(d => d.WorkItems).WithOne(w => w.Driver!).HasForeignKey(w => w.DriverId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SpannungWorkItem>(e =>
        {
            e.HasIndex(w => w.ZugewiesenAnId);
            e.HasOne(w => w.ZugewiesenAn).WithMany().HasForeignKey(w => w.ZugewiesenAnId).OnDelete(DeleteBehavior.SetNull);
        });

        // UI-30-Fix: S3CircleReview existierte bereits als Modell, hatte aber
        // nie eine FK-Konfiguration (war komplett unbenutzt/unerreichbar).
        modelBuilder.Entity<S3CircleReview>(e =>
        {
            e.HasIndex(r => r.CircleId);
            e.HasOne(r => r.Circle).WithMany().HasForeignKey(r => r.CircleId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── OKR / KeyResult ────────────────────────────────────────────────
        modelBuilder.Entity<OKR>(e =>
        {
            e.HasMany(o => o.KeyResults).WithOne(k => k.Okr!).HasForeignKey(k => k.OkrId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(o => o.Zyklus).WithMany().HasForeignKey(o => o.ZyklusId).OnDelete(DeleteBehavior.SetNull);
        });

        // ── KpiDefinition / KpiMeasurement ────────────────────────────────
        modelBuilder.Entity<KpiMeasurement>(e =>
        {
            e.HasIndex(m => m.KpiDefinitionId);
            e.HasIndex(m => m.Messdatum);
            e.HasOne(m => m.KpiDefinition).WithMany(d => d.Measurements).HasForeignKey(m => m.KpiDefinitionId).OnDelete(DeleteBehavior.Cascade);
        });

        // ── MailVerteiler (Unique-Name + Kind-Beziehung) ──────────────────
        modelBuilder.Entity<MailVerteiler>(e =>
        {
            e.Property(v => v.Name).IsRequired().HasMaxLength(200);
            e.HasIndex(v => v.Name).IsUnique();
            e.HasIndex(v => v.Typ);
            e.HasMany(v => v.Mitglieder)
                .WithOne(m => m.MailVerteiler!)
                .HasForeignKey(m => m.MailVerteilerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── MailVerteilerBenutzer (Zuordnung → Benutzer) ──────────────────
        modelBuilder.Entity<MailVerteilerBenutzer>(e =>
        {
            e.HasIndex(m => new { m.MailVerteilerId, m.UserId }).IsUnique();
            e.HasOne(m => m.User)
                .WithMany()
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    /// <summary>
    /// Kennung, die als Ersteller/Änderer eingetragen wird, wenn kein angemeldeter
    /// Benutzer im Kontext vorhanden ist (z. B. beim Seeding oder bei
    /// Hintergrund-Operationen). So bleibt kein Audit-Feld leer.
    /// </summary>
    public const string SystemBenutzerId = "system";

    /// <summary>Ermittelt den Anzeigenamen des aktuell angemeldeten Benutzers (oder null).</summary>
    private string? AktuellerBenutzerName()
    {
        var user = _httpContextAccessor?.HttpContext?.User;
        if (user is null) return null;
        return user.FindFirstValue(ClaimTypes.Name) ?? user.FindFirstValue("name");
    }

    /// <summary>
    /// Felder, die nicht ins Detailprotokoll (vorher/nachher) aufgenommen werden:
    /// technische Audit-Felder sowie sicherheitsrelevante Geheimnisse.
    /// </summary>
    /// <remarks>
    /// APP-01 (P005): Korrektur der Property-Namen – nutzt echte Entity-Felder statt
    /// nicht existierender Namen. Passwort-/Token-Änderungen werden protokolliert,
    /// aber ohne Wert ("geändert", nicht "von X zu Y").
    /// </remarks>
    private static readonly HashSet<string> NichtProtokollierteFelder = new(StringComparer.OrdinalIgnoreCase)
    {
        nameof(AuditableEntity.CreatedAt),
        nameof(AuditableEntity.UpdatedAt),
        nameof(AuditableEntity.CreatedById),
        nameof(AuditableEntity.ChangedById),
        // Sicherheitsrelevante Geheimnisse (echte Property-Namen aus User/PasswordResetToken)
        "Password",  // User.Password (BCrypt-Hash)
        "Token"      // PasswordResetToken.Token (Reset-Token)
    };

    /// <summary>
    /// Setzt die Audit-Felder (CreatedAt/UpdatedAt sowie CreatedById/ChangedById)
    /// für alle hinzugefügten/geänderten Entitäten. Fehlt ein angemeldeter Benutzer
    /// (Seeding/Hintergrund), wird "system" eingetragen. Gemeinsame Logik für den
    /// synchronen und asynchronen Speichervorgang (Maßnahme 4).
    /// </summary>
    private void WendeAuditFelderAn()
    {
        var jetzt = DateTime.UtcNow;
        var aktuelleBenutzerId = AktuelleBenutzerId();
        var benutzerId = aktuelleBenutzerId ?? SystemBenutzerId;
        // Liegt ein HTTP-Kontext mit angemeldetem Benutzer vor, handelt es sich um
        // einen API-Aufruf (z. B. OData-POST/PATCH). Dann werden die Audit-Felder
        // ausnahmslos serverseitig gesetzt – vom Client mitgeschickte Werte werden
        // ignoriert (Manipulationsschutz). Ohne HTTP-Kontext (Seeding/Hintergrund)
        // bleibt ein bereits gesetzter CreatedById erhalten.
        var istApiAufruf = aktuelleBenutzerId != null;
        foreach (var eintrag in ChangeTracker.Entries<AuditableEntity>())
        {
            if (eintrag.State == EntityState.Added)
            {
                eintrag.Entity.CreatedAt = jetzt;
                eintrag.Entity.UpdatedAt = jetzt;
                // APP-18 (P005): Bei API-Aufrufen IMMER serverseitig setzen (kein Client-Wert).
                // Nur bei Hintergrund-Operationen (Seeding) bleibt ein gesetzter Wert erhalten.
                if (istApiAufruf)
                {
                    eintrag.Entity.CreatedById = benutzerId;
                }
                else if (string.IsNullOrEmpty(eintrag.Entity.CreatedById))
                {
                    eintrag.Entity.CreatedById = benutzerId;
                }
                eintrag.Entity.ChangedById = benutzerId;
            }
            else if (eintrag.State == EntityState.Modified)
            {
                // Schutz gegen Manipulation: CreatedAt/CreatedById kennzeichnen die
                // Erstanlage und dürfen nachträglich nicht verändert werden. Sollte
                // ein Client sie (etwa via OData-PATCH) mitschicken, werden die
                // ursprünglichen Datenbankwerte wiederhergestellt.
                eintrag.Property(nameof(AuditableEntity.CreatedAt)).CurrentValue =
                    eintrag.Property(nameof(AuditableEntity.CreatedAt)).OriginalValue;
                eintrag.Property(nameof(AuditableEntity.CreatedAt)).IsModified = false;
                eintrag.Property(nameof(AuditableEntity.CreatedById)).CurrentValue =
                    eintrag.Property(nameof(AuditableEntity.CreatedById)).OriginalValue;
                eintrag.Property(nameof(AuditableEntity.CreatedById)).IsModified = false;

                eintrag.Entity.UpdatedAt = jetzt;
                eintrag.Entity.ChangedById = benutzerId;
            }
        }
    }

    /// <summary>
    /// Erfasst vor dem Speichern die Datenänderungen (Anlegen/Ändern/Löschen) als
    /// strukturiertes Detailprotokoll (Maßnahme 5). Für geänderte Datensätze werden
    /// die betroffenen Felder mit altem und neuem Wert (vorher/nachher) festgehalten.
    /// AppLog-Einträge selbst werden nicht protokolliert (verhindert Endlosschleife
    /// und Rauschen).
    /// </summary>
    private List<AppLog> ErfasseAenderungen()
    {
        var jetzt = DateTime.UtcNow;
        var benutzerId = AktuelleBenutzerId() ?? SystemBenutzerId;
        var benutzerName = AktuellerBenutzerName();
        var protokoll = new List<AppLog>();

        foreach (var eintrag in ChangeTracker.Entries<AuditableEntity>())
        {
            // AppLog selbst nicht protokollieren (keine Rekursion / kein Rauschen).
            if (eintrag.Entity is AppLog)
            {
                continue;
            }

            string aktion;
            string? details = null;

            switch (eintrag.State)
            {
                case EntityState.Added:
                    aktion = "CREATE";
                    break;

                case EntityState.Modified:
                    aktion = "UPDATE";
                    var aenderungen = new List<object>();
                    foreach (var prop in eintrag.Properties)
                    {
                        var name = prop.Metadata.Name;
                        if (!prop.IsModified || NichtProtokollierteFelder.Contains(name))
                        {
                            continue;
                        }
                        var alt = eintrag.OriginalValues[name];
                        var neu = eintrag.CurrentValues[name];
                        if (Equals(alt, neu))
                        {
                            continue;
                        }
                        aenderungen.Add(new
                        {
                            Feld = name,
                            Alt = alt?.ToString(),
                            Neu = neu?.ToString()
                        });
                    }
                    // Nur protokollieren, wenn sich fachlich etwas geändert hat.
                    if (aenderungen.Count == 0)
                    {
                        continue;
                    }
                    details = JsonSerializer.Serialize(aenderungen);
                    break;

                case EntityState.Deleted:
                    aktion = "DELETE";
                    break;

                default:
                    continue;
            }

            // M2.2 / UI-19-Fix: Modul über den zentralen Katalog aus dem EntityType
            // ableiten. Der vorherige Switch nutzte an drei Stellen C#-Typnamen, die
            // es nie gab ("AppUser" statt "User", "RollenDefinition" statt
            // "S3RollenDefinition", "BiGuideEintrag" statt "BIGuideNews") - diese
            // Fälle trafen nie und fielen unbemerkt auf "System" zurück.
            var typeName = eintrag.Entity.GetType().Name;
            var modul = AuditModul.VonEntityTypName(typeName);

            // M2.3: EntityName mit Klartext (Name/Titel) statt nur Typ-Name
            var nameEigenschaft = eintrag.Properties
                .FirstOrDefault(p => p.Metadata.Name is "Name" or "Titel");
            var klartext = nameEigenschaft?.CurrentValue?.ToString();
            var entityName = klartext ?? typeName;

            protokoll.Add(new AppLog
            {
                Modul = modul,
                Aktion = aktion,
                EntityName = entityName,
                EntityId = ErmittleEntityId(eintrag),
                UserId = benutzerId,
                UserName = benutzerName,
                Details = details,
                // Audit-Felder direkt setzen, da diese Einträge erst nach
                // WendeAuditFelderAn() hinzugefügt werden.
                CreatedAt = jetzt,
                UpdatedAt = jetzt,
                CreatedById = benutzerId,
                ChangedById = benutzerId
            });
        }

        return protokoll;
    }

    /// <summary>Liest – falls vorhanden – den Primärschlüssel "Id" der Entität als Text.</summary>
    private static string? ErmittleEntityId(EntityEntry eintrag)
    {
        var idProperty = eintrag.Metadata.FindPrimaryKey()?.Properties
            .FirstOrDefault(p => p.Name.Equals("Id", StringComparison.OrdinalIgnoreCase));
        if (idProperty is null)
        {
            return null;
        }
        var wert = eintrag.Property(idProperty.Name).CurrentValue;
        return wert?.ToString();
    }

    /// <summary>
    /// Synchroner Speichervorgang. Wendet dieselbe Audit- und Protokoll-Logik an
    /// wie der asynchrone Vorgang (Maßnahme 4 – Vorsorge, falls künftig synchron
    /// gespeichert wird).
    /// </summary>
    public override int SaveChanges()
    {
        var protokoll = ErfasseAenderungen();
        WendeAuditFelderAn();
        if (protokoll.Count > 0)
        {
            AppLogs.AddRange(protokoll);
        }
        return base.SaveChanges();
    }

    /// <summary>
    /// Setzt automatisch die Audit-Felder (CreatedAt/UpdatedAt sowie
    /// CreatedById/ChangedById) und erfasst ein Detailprotokoll (vorher/nachher)
    /// beim Speichern der Änderungen. Fehlt ein angemeldeter Benutzer
    /// (Seeding/Hintergrund), wird "system" eingetragen.
    /// </summary>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var protokoll = ErfasseAenderungen();
        NormalisiereEmailFelder();
        WendeAuditFelderAn();
        if (protokoll.Count > 0)
        {
            await AppLogs.AddRangeAsync(protokoll, cancellationToken);
        }
        return await base.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// DB-13: Normalisiert die E-Mail-Adresse bei User-Entitäten (Trim + ToLowerInvariant).
    /// Wird automatisch vor jedem SaveChanges aufgerufen.
    /// </summary>
    private void NormalisiereEmailFelder()
    {
        foreach (var eintrag in ChangeTracker.Entries<User>())
        {
            if (eintrag.State is EntityState.Added or EntityState.Modified)
            {
                var user = eintrag.Entity;
                if (!string.IsNullOrWhiteSpace(user.Email))
                {
                    user.EmailCanonical = user.Email.Trim().ToLowerInvariant();
                }
            }
        }
    }
}
