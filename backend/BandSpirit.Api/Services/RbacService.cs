using BandSpirit.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BandSpirit.Api.Services;

/// <summary>
/// Prüft rollenbasierte Berechtigungen.
/// Reihenfolge: IMemoryCache → DB-Tabelle RolePermission → hartkodierter Fallback.
/// CC-M3: Fallback dient nur als Notfall-Absicherung; das Seeding (RolePermissionSeeder)
/// ist die „Source of Truth" für Rollen-Berechtigungen.
/// </summary>
public class RbacService
{
    private readonly BandSpiritDbContext _db;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _config;
    private readonly ILogger<RbacService> _logger;
    private TimeSpan CacheDauer => TimeSpan.FromSeconds(_config.GetValue<int>("Rbac:CacheDurationSeconds", 60));

    public RbacService(BandSpiritDbContext db, IMemoryCache cache, IConfiguration config, ILogger<RbacService> logger)
    {
        _db = db;
        _cache = cache;
        _config = config;
        _logger = logger;
    }

    /// <summary>Prüft, ob eine Rolle die angegebene Berechtigung besitzt.</summary>
    public async Task<bool> HasPermissionAsync(string role, string permission)
    {
        var berechtigungen = await GetPermissionsForRoleAsync(role);
        return berechtigungen.Contains(permission);
    }

    /// <summary>
    /// Liefert alle Berechtigungen einer Rolle (gecacht).
    /// APP-05 (P005): Unterscheidet zwischen "unbekannter Rolle" (→ Fallback)
    /// und "bekannter Rolle ohne Permissions" (→ leer = fail-closed).
    /// </summary>
    public async Task<HashSet<string>> GetPermissionsForRoleAsync(string role)
    {
        var cacheKey = $"rbac:permissions:{role}";
        if (_cache.TryGetValue(cacheKey, out HashSet<string>? gecacht) && gecacht is not null)
        {
            return gecacht;
        }

        // APP-05: Erst prüfen, ob die Rolle in BenutzerRollen existiert (aktiv).
        var rolleExistiert = await _db.BenutzerRollen
            .AnyAsync(r => r.Name == role && r.Aktiv);

        // 1) Berechtigungen aus der Datenbank laden.
        var ausDb = await _db.RolePermissions
            .Where(r => r.Role == role)
            .Select(r => r.Permission)
            .ToListAsync();

        HashSet<string> ergebnis;
        if (rolleExistiert)
        {
            // Rolle ist bekannt und aktiv → ausDb.Count == 0 bedeutet "keine Rechte" (fail-closed).
            ergebnis = new HashSet<string>(ausDb);
            if (ausDb.Count == 0)
            {
                _logger.LogInformation(
                    "Rolle '{Role}' ist aktiv, hat aber keine Berechtigungen (explizit leer = fail-closed).",
                    role);
            }
        }
        else
        {
            // Rolle existiert nicht oder ist inaktiv → Fallback (Notfall-Absicherung).
            _logger.LogWarning(
                "Rolle '{Role}' nicht in BenutzerRollen gefunden oder inaktiv. Verwende Fallback. " +
                "Bitte sicherstellen, dass RolePermissionSeeder läuft.",
                role);
            ergebnis = new HashSet<string>(GetFallbackPermissions(role));
        }

        _cache.Set(cacheKey, ergebnis, CacheDauer);
        return ergebnis;
    }

    /// <summary>Entfernt die Cache-Einträge für eine Rolle, sodass sie beim nächsten Abruf neu geladen wird.</summary>
    public void ClearCacheForRole(string role)
    {
        var cacheKey = $"rbac:permissions:{role}";
        _cache.Remove(cacheKey);
    }

    /// <summary>
    /// Hartkodierter Fallback, falls keine DB-Einträge vorhanden sind.
    /// CC-M3: Admin erhält alle Berechtigungen; alle anderen Rollen erhalten
    /// NUR LESENDE Rechte (keine schreibenden Rechte im Fallback).
    /// Das Seeding (RolePermissionSeeder) ist die „Source of Truth" – dieser
    /// Fallback dient nur zur Notfall-Absicherung bei DB-Problemen.
    /// </summary>
    private static IEnumerable<string> GetFallbackPermissions(string role)
    {
        return role switch
        {
            "Admin" => Infrastructure.Auth.Permissions.All,
            _ => new[]
            {
                // Nur lesende Grundrechte (kein Create/Update/Delete)
                Infrastructure.Auth.Permissions.CircleRead,
                Infrastructure.Auth.Permissions.RoleRead,
                Infrastructure.Auth.Permissions.MeetingRead,
                Infrastructure.Auth.Permissions.DriverRead,
                Infrastructure.Auth.Permissions.DashboardRead,
                Infrastructure.Auth.Permissions.BiKompassRead,
                Infrastructure.Auth.Permissions.FaqRead,
                Infrastructure.Auth.Permissions.DocsRead
            }
        };
    }
}
