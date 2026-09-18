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
        
        // Modul IN ("Kreis", "S3Rolle") AND EntityId = circleId
        // (damit werden auch Rollen-Zuweisungen im Kreis erfasst)
        var eintraege = await _db.AppLogs
            .AsNoTracking()
            .Where(l => (l.Modul == "Kreis" || l.Modul == "S3Rolle") && l.EntityId == circleIdText)
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
