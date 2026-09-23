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
/// OData-Controller für OKRs. Route: /odata/OKRs
/// Business-Entscheid: Zugriff richtet sich ausschliesslich nach der Benutzerrolle
/// (Permissions.OkrRead/OkrManage), nicht nach der Kreis-Zugehörigkeit
/// (S3-Rollenzuweisung) - eine frühere zusätzliche Kreis-Scoping-Prüfung
/// (CircleScope) wurde bewusst wieder entfernt.
/// </summary>
[Authorize]
public class OKRsController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public OKRsController(BandSpiritDbContext db) => _db = db;

    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.OkrRead)]
    public IQueryable<OKR> Get() => _db.OKRs.Include(o => o.Circle);

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.OkrRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.OKRs
            .Include(o => o.Circle)
            .FirstOrDefaultAsync(o => o.Id == key);

        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    /// <summary>Neues OKR erstellen.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.OkrManage)]
    public async Task<IActionResult> Post([FromBody] OKR eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        _db.OKRs.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    /// <summary>OKR aktualisieren.</summary>
    [HttpPatch]
    [Authorize(Policy = Permissions.OkrManage)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<OKR> delta)
    {
        var eintrag = await _db.OKRs
            .Include(o => o.Circle)
            .FirstOrDefaultAsync(o => o.Id == key);

        if (eintrag is null)
        {
            return NotFound();
        }

        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    /// <summary>OKR löschen.</summary>
    [HttpDelete]
    [Authorize(Policy = Permissions.OkrManage)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.OKRs
            .Include(o => o.Circle)
            .FirstOrDefaultAsync(o => o.Id == key);

        if (eintrag is null)
        {
            return NotFound();
        }

        _db.OKRs.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
