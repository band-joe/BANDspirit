using BandSpirit.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>REST-Controller (nur lesend) für die Aktivitäten (Aktivitätsprotokoll) eines Kreises.</summary>
[ApiController]
[Route("api/kreise/{circleId:guid}/aktivitaeten")]
[Authorize]
public class CircleAktivitaetenController : ControllerBase
{
    private readonly BandSpiritDbContext _db;

    public CircleAktivitaetenController(BandSpiritDbContext db) => _db = db;

    /// <summary>GET – Aktivitäten des Kreises aus dem App-Log (neueste zuerst).</summary>
    [HttpGet("")]
    [Authorize(Policy = Permissions.CircleRead)]
    public async Task<IActionResult> Liste([FromRoute] Guid circleId, [FromQuery] int top = 50, [FromQuery] int skip = 0)
    {
        if (top < 1) top = 1;
        if (top > 200) top = 200;
        if (skip < 0) skip = 0;

        var circleIdText = circleId.ToString();

        // Fix: Rollen-Zuweisungen (Modul "S3Rolle") werden von RolesController
        // mit der RollenINSTANZ-ID als EntityId protokolliert, nicht mit der
        // Kreis-ID - ein Vergleich l.EntityId == circleIdText konnte solche
        // Einträge daher nie treffen, obwohl genau das die Absicht war (siehe
        // vorheriger Kommentar hier). Stattdessen werden zuerst die Rollen-IDs
        // dieses Kreises aufgelöst und "S3Rolle"-Einträge darüber zugeordnet;
        // "Kreis"-Einträge bleiben weiterhin direkt über die Kreis-ID gematcht.
        var rollenIdsDesKreises = await _db.S3Roles
            .Where(r => r.CircleId == circleId)
            .Select(r => r.Id.ToString())
            .ToListAsync();

        var eintraege = await _db.AppLogs
            .AsNoTracking()
            .Where(l =>
                (l.Modul == "Kreis" && l.EntityId == circleIdText) ||
                (l.Modul == "S3Rolle" && l.EntityId != null && rollenIdsDesKreises.Contains(l.EntityId)))
            .OrderByDescending(l => l.CreatedAt)
            .Skip(skip)
            .Take(top)
            .Select(l => new
            {
                id = l.Id,
                modul = l.Modul,
                aktion = l.Aktion,
                entityName = l.EntityName,
                userName = l.UserName,
                userId = l.UserId,
                details = l.Details,
                ip = l.Ip,
                createdAt = l.CreatedAt
            })
            .ToListAsync();
        return Ok(eintraege);
    }
}
