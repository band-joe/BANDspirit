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

/// <summary>OData-Controller für BI-Guide-News (CRUD). Route: /odata/BiGuideNews</summary>
[Authorize]
public class BiGuideNewsController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public BiGuideNewsController(BandSpiritDbContext db) => _db = db;

    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.BiGuideRead)]
    public IQueryable<BIGuideNews> Get() => _db.BIGuideNews.AsQueryable();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.BiGuideRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.BIGuideNews.FirstOrDefaultAsync(n => n.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.BiGuideManage)]
    public async Task<IActionResult> Post([FromBody] BIGuideNews eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        _db.BIGuideNews.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.BiGuideManage)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<BIGuideNews> delta)
    {
        var eintrag = await _db.BIGuideNews.FirstOrDefaultAsync(n => n.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }

        // Alle Rollen mit biguide:manage (BiGuideAdmin, Admin) dürfen jeden Beitrag
        // bewirtschaften - keine Einschränkung auf eigene Beiträge.

        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    [HttpDelete]
    [Authorize(Policy = Permissions.BiGuideManage)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.BIGuideNews.FirstOrDefaultAsync(n => n.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }

        // Alle Rollen mit biguide:manage (BiGuideAdmin, Admin) dürfen jeden Beitrag
        // bewirtschaften - keine Einschränkung auf eigene Beiträge.

        _db.BIGuideNews.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
