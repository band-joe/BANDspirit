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

/// <summary>OData-Controller für Arbeitspakete einer Spannung (SpannungWorkItem). Route: /odata/SpannungWorkItems</summary>
[Authorize]
public class SpannungWorkItemsController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public SpannungWorkItemsController(BandSpiritDbContext db) => _db = db;

    [HttpGet]
    [EnableQuery(PageSize = 200)]
    [Authorize(Policy = Permissions.DriverRead)]
    public IQueryable<SpannungWorkItem> Get() => _db.SpannungWorkItems.AsQueryable();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.DriverRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.SpannungWorkItems.FirstOrDefaultAsync(w => w.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.DriverUpdate)]
    public async Task<IActionResult> Post([FromBody] SpannungWorkItem eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        _db.SpannungWorkItems.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.DriverUpdate)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<SpannungWorkItem> delta)
    {
        var eintrag = await _db.SpannungWorkItems.FirstOrDefaultAsync(w => w.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    [HttpDelete]
    [Authorize(Policy = Permissions.DriverUpdate)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.SpannungWorkItems.FirstOrDefaultAsync(w => w.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        _db.SpannungWorkItems.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
