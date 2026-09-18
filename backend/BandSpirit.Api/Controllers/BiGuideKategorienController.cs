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

/// <summary>OData-Controller für BI-Guide-Kategorien (CRUD). Route: /odata/BiGuideKategorien</summary>
[Authorize]
public class BiGuideKategorienController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public BiGuideKategorienController(BandSpiritDbContext db) => _db = db;

    [HttpGet]
    [EnableQuery(PageSize = 200)]
    [Authorize(Policy = Permissions.BiGuideRead)]
    public IQueryable<BiGuideKategorie> Get() => _db.BiGuideKategorien.AsQueryable();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.BiGuideRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.BiGuideKategorien.FirstOrDefaultAsync(k => k.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Post([FromBody] BiGuideKategorie eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        _db.BiGuideKategorien.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<BiGuideKategorie> delta)
    {
        var eintrag = await _db.BiGuideKategorien.FirstOrDefaultAsync(k => k.Id == key);
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
        var eintrag = await _db.BiGuideKategorien.FirstOrDefaultAsync(k => k.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        _db.BiGuideKategorien.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
