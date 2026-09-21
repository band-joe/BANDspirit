using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Deltas;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Results;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>OData-Controller für Meetings (S3Meeting). Route: /odata/Meetings</summary>
[Authorize]
public class MeetingsController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public MeetingsController(BandSpiritDbContext db) => _db = db;

    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.MeetingRead)]
    public IQueryable<S3Meeting> Get() => _db.S3Meetings.AsQueryable();

    /// <summary>
    /// GET /odata/Meetings({id}) – Einzelnes Meeting abrufen.
    /// </summary>
    /// <remarks>
    /// UI-28/APP-21-Fix: SingleResult statt FirstOrDefaultAsync(), damit
    /// $expand=Proposals($expand=Objections,Decision),Circle vor der
    /// Materialisierung angewendet wird - FirstOrDefaultAsync() ignoriert
    /// $expand, wodurch die Meeting-Detailseite nie Anträge/Kreis geladen hätte.
    /// </remarks>
    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.MeetingRead)]
    public SingleResult<S3Meeting> Get([FromRoute] Guid key)
    {
        return SingleResult.Create(_db.S3Meetings.Where(m => m.Id == key));
    }

    [HttpPost]
    [Authorize(Policy = Permissions.MeetingCreate)]
    public async Task<IActionResult> Post([FromBody] S3Meeting eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        _db.S3Meetings.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.MeetingCreate)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<S3Meeting> delta)
    {
        var eintrag = await _db.S3Meetings.FirstOrDefaultAsync(m => m.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    [HttpDelete]
    [Authorize(Policy = Permissions.MeetingCreate)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.S3Meetings.FirstOrDefaultAsync(m => m.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        _db.S3Meetings.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
