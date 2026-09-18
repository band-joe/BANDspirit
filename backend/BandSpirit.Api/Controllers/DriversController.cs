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

/// <summary>OData-Controller für Treiber (S3Driver). Route: /odata/Drivers</summary>
[Authorize]
public class DriversController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public DriversController(BandSpiritDbContext db) => _db = db;

    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.DriverRead)]
    public IQueryable<S3Driver> Get() => _db.S3Drivers.AsQueryable();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.DriverRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.S3Drivers.FirstOrDefaultAsync(d => d.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.DriverCreate)]
    public async Task<IActionResult> Post([FromBody] S3Driver eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        _db.S3Drivers.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.DriverUpdate)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<S3Driver> delta)
    {
        var eintrag = await _db.S3Drivers.FirstOrDefaultAsync(d => d.Id == key);
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
        var eintrag = await _db.S3Drivers.FirstOrDefaultAsync(d => d.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        _db.S3Drivers.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
