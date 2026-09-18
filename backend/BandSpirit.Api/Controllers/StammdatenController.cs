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

/// <summary>OData-Controller für Stammdaten (CRUD). Route: /odata/Stammdaten</summary>
[Authorize]
public class StammdatenController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public StammdatenController(BandSpiritDbContext db) => _db = db;

    [HttpGet]
    [EnableQuery(PageSize = 200)]
    [Authorize(Policy = Permissions.DocsRead)]
    public IQueryable<Stammdaten> Get() => _db.Stammdaten.AsQueryable();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.DocsRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.Stammdaten.FirstOrDefaultAsync(s => s.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Post([FromBody] Stammdaten eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        _db.Stammdaten.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<Stammdaten> delta)
    {
        var eintrag = await _db.Stammdaten.FirstOrDefaultAsync(s => s.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    [HttpDelete]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.Stammdaten.FirstOrDefaultAsync(s => s.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        _db.Stammdaten.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
