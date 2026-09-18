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

/// <summary>OData-Controller für OKRs mit kreis-basierter Filterung. Route: /odata/OKRs</summary>
[Authorize]
public class OKRsController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public OKRsController(BandSpiritDbContext db) => _db = db;

    /// <summary>Alle OKRs abrufen, gefiltert nach Kreis-Zugehörigkeit.</summary>
    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.OkrRead)]
    public IQueryable<OKR> Get()
    {
        var userId = CircleScope.GetUserId(User);
        var isAdmin = CircleScope.IsAdmin(User);
        var userCircles = userId.HasValue ? CircleScope.UserCircleIds(_db, userId.Value) : Enumerable.Empty<Guid>().AsQueryable();

        return _db.OKRs
            .Include(o => o.Circle)
            .Where(o => isAdmin || o.CircleId == null || userCircles.Contains(o.CircleId.Value));
    }

    /// <summary>Ein einzelnes OKR abrufen, kreis-gefiltert.</summary>
    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.OkrRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var userId = CircleScope.GetUserId(User);
        var isAdmin = CircleScope.IsAdmin(User);
        var userCirclesList = userId.HasValue ? await CircleScope.UserCircleIds(_db, userId.Value).ToListAsync() : new List<Guid>();

        var eintrag = await _db.OKRs
            .Include(o => o.Circle)
            .FirstOrDefaultAsync(o => o.Id == key);

        if (eintrag is null) return NotFound();

        // Prüfen, ob User Zugriff auf diesen Kreis hat
        if (!isAdmin && eintrag.CircleId.HasValue && !userCirclesList.Contains(eintrag.CircleId.Value))
        {
            return Forbid();
        }

        return Ok(eintrag);
    }

    /// <summary>Neues OKR erstellen. Kreis-Schreibrecht erforderlich.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.OkrManage)]
    public async Task<IActionResult> Post([FromBody] OKR eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Schreibrecht prüfen
        if (!CircleScope.CanWrite(_db, User, eintrag.CircleId))
        {
            return Forbid();
        }

        _db.OKRs.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    /// <summary>OKR aktualisieren. Kreis-Schreibrecht erforderlich.</summary>
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

        // Schreibrecht prüfen
        if (!CircleScope.CanWrite(_db, User, eintrag.CircleId))
        {
            return Forbid();
        }

        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    /// <summary>OKR löschen. Kreis-Schreibrecht erforderlich.</summary>
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

        // Schreibrecht prüfen
        if (!CircleScope.CanWrite(_db, User, eintrag.CircleId))
        {
            return Forbid();
        }

        _db.OKRs.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
