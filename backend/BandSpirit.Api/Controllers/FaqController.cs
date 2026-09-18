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

/// <summary>OData-Controller für FAQ-Einträge. Route: /odata/FAQs</summary>
[Authorize]
public class FAQsController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public FAQsController(BandSpiritDbContext db) => _db = db;

    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.FaqRead)]
    public IQueryable<FAQ> Get() => _db.FAQs.AsQueryable();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.FaqRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.FAQs.FirstOrDefaultAsync(f => f.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.FaqManage)]
    public async Task<IActionResult> Post([FromBody] FAQ eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        _db.FAQs.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.FaqManage)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<FAQ> delta)
    {
        var eintrag = await _db.FAQs.FirstOrDefaultAsync(f => f.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    [HttpDelete]
    [Authorize(Policy = Permissions.FaqManage)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.FAQs.FirstOrDefaultAsync(f => f.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        _db.FAQs.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
