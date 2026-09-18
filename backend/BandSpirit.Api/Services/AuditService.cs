using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;

namespace BandSpirit.Api.Services;

/// <summary>
/// Schreibt gezielte Audit-Log-Einträge aus der Anwendungslogik heraus.
/// </summary>
public class AuditService
{
    private readonly BandSpiritDbContext _db;

    public AuditService(BandSpiritDbContext db) => _db = db;

    /// <summary>Protokolliert eine Aktion.</summary>
    public async Task LogAsync(string modul, string aktion, string? entityId = null,
        string? entityName = null, string? userId = null, string? userName = null,
        string? details = null, string? ip = null)
    {
        _db.AppLogs.Add(new AppLog
        {
            Modul = modul,
            Aktion = aktion,
            EntityId = entityId,
            EntityName = entityName,
            UserId = userId,
            UserName = userName,
            Details = details,
            Ip = ip
        });
        await _db.SaveChangesAsync();
    }
}
