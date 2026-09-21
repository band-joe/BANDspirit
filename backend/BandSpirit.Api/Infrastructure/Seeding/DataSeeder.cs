using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BandSpirit.Api.Infrastructure.Seeding;

/// <summary>
/// Legt Grunddaten an: Admin-Benutzer, Firma-Singleton, Beispiel-Stammdaten.
/// </summary>
public static class DataSeeder
{
    public static async Task SeedAsync(BandSpiritDbContext db, IConfiguration config, ILogger logger)
    {
        // ── Firma-Singleton ────────────────────────────────────────────────
        if (!await db.Firmas.AnyAsync())
        {
            db.Firmas.Add(new Firma
            {
                Id = "singleton",
                Firmenname = "BANDspirit AG"
            });
        }

        // ── Applikations-Benutzerrollen (BenutzerRolle) ─────────────────────
        // DB-02-Fix: Muss VOR dem Admin-Benutzer laufen (und sofort gespeichert
        // werden), damit unten dessen stabile RoleId aufgelöst werden kann -
        // ursprünglich stand dieser Block weiter unten, zu einem Zeitpunkt, an
        // dem die Benutzerrollen-Katalogzeilen noch gar nicht in der Datenbank
        // existierten (nur ein einziges SaveChangesAsync ganz am Ende).
        // Werden idempotent nach Name angelegt. Die Namen sind identisch zu den
        // bisherigen Rollenwerten in Users.Role sowie RolePermission.Role, damit
        // JWT-Claims, RBAC und Middleware unverändert weiter funktionieren.
        var standardBenutzerRollen = new (string Name, string Beschreibung, bool IstSystemAdmin, int SortOrder)[]
        {
            (BenutzerRollenNamen.Admin, "System-Administrator der Applikation mit Vollzugriff.", true,  1),
            (BenutzerRollenNamen.User,  "Standard-Benutzer mit Grundrechten.",                   false, 2),
        };

        var vorhandeneBenutzerRollen = await db.BenutzerRollen
            .Select(r => r.Name)
            .ToListAsync();

        foreach (var r in standardBenutzerRollen)
        {
            if (!vorhandeneBenutzerRollen.Contains(r.Name))
            {
                db.BenutzerRollen.Add(new BenutzerRolle
                {
                    Name = r.Name,
                    Beschreibung = r.Beschreibung,
                    IstSystemAdmin = r.IstSystemAdmin,
                    SortOrder = r.SortOrder,
                    Aktiv = true
                });
                logger.LogInformation("Benutzerrolle '{Name}' wurde angelegt.", r.Name);
            }
        }
        await db.SaveChangesAsync();

        // ── Admin-Benutzer ─────────────────────────────────────────────────
        // Robust: legt den Admin an, falls er fehlt, und stellt bei bereits
        // vorhandenem Admin sicher, dass er aktiv ist und das in
        // DefaultAdminPassword konfigurierte Passwort funktioniert. So schlägt
        // der Login nicht mehr fehl, wenn die DB aus einem früheren Lauf einen
        // Admin mit anderem/zufälligem Passwort enthält.
        const string adminEmail = "admin@bandspirit.local";
        var adminPassword = config["DefaultAdminPassword"];
        var passwortKonfiguriert = !string.IsNullOrEmpty(adminPassword) && adminPassword != "PLACEHOLDER";

        // DB-02-Fix: Stabile RoleId der "Admin"-Katalogzeile (jetzt garantiert
        // vorhanden, siehe oben) für die folgenden Zuweisungen auflösen.
        var adminRoleId = await db.BenutzerRollen
            .Where(r => r.Name == BenutzerRollenNamen.Admin)
            .Select(r => (Guid?)r.Id)
            .FirstOrDefaultAsync();

        var admin = await db.Users.FirstOrDefaultAsync(u => u.Email == adminEmail);
        if (admin is null)
        {
            if (!passwortKonfiguriert)
            {
                // Zufälliges Passwort generieren, falls nicht konfiguriert
                adminPassword = Guid.NewGuid().ToString("N")[..16];
                logger.LogWarning("⚠️  Kein DefaultAdminPassword konfiguriert – Zufälliges Passwort für Admin generiert: {Password}", adminPassword);
            }

            db.Users.Add(new User
            {
                Name = "Administrator",
                Email = adminEmail,
                Password = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                Role = BenutzerRollenNamen.Admin,
                RoleId = adminRoleId,
                Aktiv = true,
                // K81 führte Email-Verifizierung ein (ValidateCredentialsAsync lehnt
                // EmailVerified=false ab). Ohne dies kann sich der dokumentierte
                // Seed-Admin nie einloggen, da niemand seinen Verification-Link klickt.
                EmailVerified = true
            });
            logger.LogInformation("Admin-Benutzer {Email} wurde angelegt.", adminEmail);
        }
        else
        {
            // Vorhandenen Admin konsistent halten. RoleId wird IMMER
            // nachgezogen (auch ohne konfiguriertes Passwort), da Bestandsdaten
            // vor diesem Fix keine RoleId hatten.
            var geaendert = false;

            if (admin.RoleId != adminRoleId)
            {
                admin.RoleId = adminRoleId;
                geaendert = true;
            }

            if (passwortKonfiguriert)
            {
                if (!admin.Aktiv)
                {
                    admin.Aktiv = true;
                    geaendert = true;
                }

                if (!admin.EmailVerified)
                {
                    admin.EmailVerified = true;
                    geaendert = true;
                    logger.LogWarning("Admin-Konto war nicht als E-Mail-verifiziert markiert (K81) – korrigiert, sonst wäre kein Login möglich.");
                }

                if (admin.Role != BenutzerRollenNamen.Admin)
                {
                    admin.Role = BenutzerRollenNamen.Admin;
                    geaendert = true;
                }

                if (string.IsNullOrEmpty(admin.Password) || !BCrypt.Net.BCrypt.Verify(adminPassword, admin.Password))
                {
                    admin.Password = BCrypt.Net.BCrypt.HashPassword(adminPassword);
                    geaendert = true;
                    logger.LogWarning("Admin-Passwort wurde auf den in DefaultAdminPassword konfigurierten Wert (zurück-)gesetzt.");
                }
            }

            if (geaendert)
            {
                db.Users.Update(admin);
            }
        }

        // ── Beispiel-Stammdaten ────────────────────────────────────────────
        if (!await db.Stammdaten.AnyAsync())
        {
            db.Stammdaten.AddRange(
                new Stammdaten { Kategorie = "Prioritaet", Code = "NIEDRIG", Wert = "Niedrig", SortOrder = 1 },
                new Stammdaten { Kategorie = "Prioritaet", Code = "MITTEL", Wert = "Mittel", SortOrder = 2 },
                new Stammdaten { Kategorie = "Prioritaet", Code = "HOCH", Wert = "Hoch", SortOrder = 3 },
                new Stammdaten { Kategorie = "Prioritaet", Code = "DRINGEND", Wert = "Dringend", SortOrder = 4 }
            );
        }

        // ── Rollendefinitionen (Benutzerrollen-Katalog) ─────────────────────
        // Die Standard-Rollentypen der Organisation. Werden idempotent nach
        // Name angelegt, damit bestehende (evtl. bereits angepasste) Einträge
        // nicht überschrieben werden. "Lead Link" erhält IsLeadLink = true.
        var standardRollen = new (string Name, string Beschreibung, bool IsLeadLink, int SortOrder)[]
        {
            ("Lead Link",     "Führt den Kreis, vertritt den übergeordneten Kreis und priorisiert die Arbeit (max. 1 pro Kreis).", true,  1),
            ("Metriker",      "Erhebt, pflegt und berichtet die Kennzahlen (Metriken) des Kreises.",                                 false, 2),
            ("Dokumentator",  "Führt Protokolle, pflegt Beschlüsse und die Dokumentation des Kreises.",                              false, 3),
            ("Mitglied",      "Reguläres Kreismitglied mit Stimmrecht in Entscheidungen.",                                           false, 4),
        };

        var vorhandeneRollennamen = await db.S3RollenDefinitionen
            .Select(r => r.Name)
            .ToListAsync();

        foreach (var r in standardRollen)
        {
            if (!vorhandeneRollennamen.Contains(r.Name))
            {
                db.S3RollenDefinitionen.Add(new S3RollenDefinition
                {
                    Name = r.Name,
                    Beschreibung = r.Beschreibung,
                    IsLeadLink = r.IsLeadLink,
                    SortOrder = r.SortOrder,
                    Aktiv = true
                });
                logger.LogInformation("Rollendefinition '{Name}' wurde angelegt.", r.Name);
            }
        }

        // ── Bereinigung: "Administrator" ist KEINE soziokratische S3-Rolle ──
        // "Administrator" wurde früher fälschlich in den S3-Rollenkatalog
        // aufgenommen. Er gehört zu den Applikations-Benutzerrollen (siehe oben)
        // und wird hier aus S3RollenDefinitionen entfernt. Wird die Rolle noch von
        // einer S3Role referenziert, wird sie zur Wahrung der Datenintegrität nur
        // inaktiv gesetzt (Soft-Delete) statt hart gelöscht.
        var s3Admin = await db.S3RollenDefinitionen
            .FirstOrDefaultAsync(r => r.Name == "Administrator");
        if (s3Admin is not null)
        {
            var wirdReferenziert = await db.S3Roles.AnyAsync(sr => sr.RollenDefinitionId == s3Admin.Id);
            if (wirdReferenziert)
            {
                if (s3Admin.Aktiv)
                {
                    s3Admin.Aktiv = false;
                    db.S3RollenDefinitionen.Update(s3Admin);
                    logger.LogInformation("S3-Rollendefinition 'Administrator' wird referenziert und wurde inaktiv gesetzt (Soft-Delete).");
                }
            }
            else
            {
                db.S3RollenDefinitionen.Remove(s3Admin);
                logger.LogInformation("Fälschlich als S3-Rolle geführte 'Administrator'-Rollendefinition wurde entfernt.");
            }
        }

        // ── Lebenszyklus-Phasen (Stammdaten) ────────────────────────────────
        // Standard-Phasen aus der Aufzählung LebenszyklusPhaseTyp. Werden
        // idempotent nach Name angelegt, damit bereits angepasste Einträge nicht
        // überschrieben werden. Die Phasen sind anschließend in den Einstellungen
        // pflegbar.
        var standardPhasen = new (string Name, string Beschreibung, int SortOrder)[]
        {
            ("Entwurf",   "Der Kreis ist in Planung/Vorbereitung und noch nicht aktiv.", 1),
            ("Aktiv",     "Der Kreis arbeitet regulär.",                                 2),
            ("In Review", "Der Kreis wird überprüft / evaluiert.",                       3),
            ("Ruhend",    "Der Kreis ist vorübergehend pausiert.",                       4),
            ("Aufgelöst", "Der Kreis wurde aufgelöst und ist nicht mehr aktiv.",         5),
        };

        var vorhandenePhasen = await db.S3LebenszyklusPhasen
            .Select(p => p.Name)
            .ToListAsync();

        foreach (var p in standardPhasen)
        {
            if (!vorhandenePhasen.Contains(p.Name))
            {
                db.S3LebenszyklusPhasen.Add(new S3LebenszyklusPhase
                {
                    Name = p.Name,
                    Beschreibung = p.Beschreibung,
                    SortOrder = p.SortOrder,
                    Aktiv = true
                });
                logger.LogInformation("Lebenszyklus-Phase '{Name}' wurde angelegt.", p.Name);
            }
        }

        await db.SaveChangesAsync();
    }
}
