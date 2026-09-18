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
/// OData-Controller für Einwände (S3Objection). Unterstützt Auflisten, Erstellen,
/// Aktualisieren und Löschen. Route: /odata/Objections
/// </summary>
[Authorize]
public class ObjectionsController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public ObjectionsController(BandSpiritDbContext db) => _db = db;

    [HttpGet]
    [EnableQuery(PageSize = 200)]
    [Authorize(Policy = Permissions.MeetingRead)]
    public IQueryable<S3Objection> Get() => _db.S3Objections.AsQueryable();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.MeetingRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.S3Objections.FirstOrDefaultAsync(o => o.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.ObjectionCreate)]
    public async Task<IActionResult> Post([FromBody] S3Objection eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        _db.S3Objections.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.ObjectionUpdate)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<S3Objection> delta)
    {
        var eintrag = await _db.S3Objections.FirstOrDefaultAsync(o => o.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    [HttpDelete]
    [Authorize(Policy = Permissions.ObjectionUpdate)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.S3Objections.FirstOrDefaultAsync(o => o.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        _db.S3Objections.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
