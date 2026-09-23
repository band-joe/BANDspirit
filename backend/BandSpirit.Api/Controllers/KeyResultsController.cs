using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Deltas;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>
/// OData-Controller für Key Results. Route: /odata/KeyResults
/// Business-Entscheid: Zugriff richtet sich ausschliesslich nach der Benutzerrolle
/// (Permissions.OkrRead/OkrManage), nicht nach der Kreis-Zugehörigkeit
/// (S3-Rollenzuweisung) - eine frühere zusätzliche Kreis-Scoping-Prüfung
/// (CircleScope) wurde bewusst wieder entfernt.
/// </summary>
[Authorize]
public class KeyResultsController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public KeyResultsController(BandSpiritDbContext db) => _db = db;

    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.OkrRead)]
    public IQueryable<KeyResult> Get() =>
        _db.KeyResults
            .Include(k => k.Okr)
                .ThenInclude(o => o!.Circle);

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.OkrRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.KeyResults
            .Include(k => k.Okr)
                .ThenInclude(o => o!.Circle)
            .FirstOrDefaultAsync(k => k.Id == key);

        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    /// <summary>Neues Key Result erstellen.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.OkrManage)]
    public async Task<IActionResult> Post([FromBody] KeyResult eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var okr = await _db.OKRs
            .Include(o => o.Circle)
            .FirstOrDefaultAsync(o => o.Id == eintrag.OkrId);

        if (okr is null)
        {
            return BadRequest(new { error = "OkrId ungültig." });
        }

        if (eintrag.StartWert == eintrag.ZielWert)
        {
            return BadRequest(new { error = "ZielWert darf nicht gleich StartWert sein (Fortschrittsberechnung nicht möglich)." });
        }

        _db.KeyResults.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    /// <summary>Key Result aktualisieren.</summary>
    [HttpPatch]
    [Authorize(Policy = Permissions.OkrManage)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<KeyResult> delta)
    {
        var eintrag = await _db.KeyResults
            .Include(k => k.Okr)
                .ThenInclude(o => o!.Circle)
            .FirstOrDefaultAsync(k => k.Id == key);

        if (eintrag is null)
        {
            return NotFound();
        }

        delta.Patch(eintrag);

        if (eintrag.StartWert == eintrag.ZielWert)
        {
            return BadRequest(new { error = "ZielWert darf nicht gleich StartWert sein (Fortschrittsberechnung nicht möglich)." });
        }

        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    /// <summary>Key Result löschen.</summary>
    [HttpDelete]
    [Authorize(Policy = Permissions.OkrManage)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.KeyResults
            .Include(k => k.Okr)
                .ThenInclude(o => o!.Circle)
            .FirstOrDefaultAsync(k => k.Id == key);

        if (eintrag is null)
        {
            return NotFound();
        }

        _db.KeyResults.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
