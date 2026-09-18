using BandSpirit.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>REST-Controller (nur lesend) für die Aktivitäten (Aktivitätsprotokoll) einer Rolle.</summary>
[ApiController]
[Route("api/rollen/{roleId:guid}/aktivitaeten")]
[Authorize]
public class S3RolleAktivitaetenController : ControllerBase
{
    private readonly BandSpiritDbContext _db;

    public S3RolleAktivitaetenController(BandSpiritDbContext db) => _db = db;

    /// <summary>GET – Aktivitäten der Rolle aus dem App-Log (neueste zuerst).</summary>
    [HttpGet("")]
    [Authorize(Policy = Permissions.RoleRead)]
    public async Task<IActionResult> Liste([FromRoute] Guid roleId, [FromQuery] int top = 50, [FromQuery] int skip = 0)
    {
        if (top < 1) top = 1;
        if (top > 200) top = 200;
        if (skip < 0) skip = 0;

        var roleIdText = roleId.ToString();
        var eintraege = await _db.AppLogs
            .AsNoTracking()
            .Where(l => l.Modul == "S3Rolle" && l.EntityId == roleIdText)
            .OrderByDescending(l => l.CreatedAt)
            .Skip(skip)
            .Take(top)
            .Select(l => new
            {
                id = l.Id,
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
