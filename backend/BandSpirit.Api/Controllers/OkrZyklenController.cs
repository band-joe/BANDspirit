using BandSpirit.Api.Infrastructure.Auth;
using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Deltas;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;

namespace BandSpirit.Api.Controllers;

/// <summary>OData-Controller für OKR-Zyklen. Route: /odata/OkrZyklen</summary>
[Authorize]
public class OkrZyklenController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public OkrZyklenController(BandSpiritDbContext db) => _db = db;

    /// <summary>Alle OKR-Zyklen abrufen (für alle Benutzer mit okr:read).</summary>
    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.OkrRead)]
    public IQueryable<OkrZyklus> Get() => _db.OkrZyklen.OrderBy(z => z.StartDatum);

    /// <summary>Einen einzelnen Zyklus abrufen.</summary>
    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.OkrRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.OkrZyklen.FirstOrDefaultAsync(z => z.Id == key);
        if (eintrag is null) return NotFound();
        return Ok(eintrag);
    }

    /// <summary>Neuen Zyklus erstellen (okr:manage erforderlich).</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.OkrManage)]
    public async Task<IActionResult> Post([FromBody] OkrZyklus eintrag)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        _db.OkrZyklen.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    /// <summary>Zyklus aktualisieren (okr:manage erforderlich).</summary>
    [HttpPatch]
    [Authorize(Policy = Permissions.OkrManage)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<OkrZyklus> delta)
    {
        var eintrag = await _db.OkrZyklen.FirstOrDefaultAsync(z => z.Id == key);
        if (eintrag is null) return NotFound();
        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    /// <summary>Zyklus löschen (okr:manage erforderlich).</summary>
    [HttpDelete]
    [Authorize(Policy = Permissions.OkrManage)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.OkrZyklen.FirstOrDefaultAsync(z => z.Id == key);
        if (eintrag is null) return NotFound();
        _db.OkrZyklen.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
