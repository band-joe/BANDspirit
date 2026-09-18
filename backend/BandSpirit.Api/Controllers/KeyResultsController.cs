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

/// <summary>OData-Controller für Key Results mit kreis-basierter Filterung über OKR. Route: /odata/KeyResults</summary>
[Authorize]
public class KeyResultsController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public KeyResultsController(BandSpiritDbContext db) => _db = db;

    /// <summary>Alle Key Results abrufen, gefiltert nach Kreis-Zugehörigkeit des übergeordneten OKR.</summary>
    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.OkrRead)]
    public IQueryable<KeyResult> Get()
    {
        var userId = CircleScope.GetUserId(User);
        var isAdmin = CircleScope.IsAdmin(User);
        var userCircles = userId.HasValue ? CircleScope.UserCircleIds(_db, userId.Value) : Enumerable.Empty<Guid>().AsQueryable();

        // KeyResults filtern nach CircleId des zugehörigen OKR
        return _db.KeyResults
            .Include(k => k.Okr)
                .ThenInclude(o => o!.Circle)
            .Where(k => isAdmin || k.Okr!.CircleId == null || userCircles.Contains(k.Okr.CircleId.Value));
    }

    /// <summary>Ein einzelnes Key Result abrufen, kreis-gefiltert.</summary>
    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.OkrRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var userId = CircleScope.GetUserId(User);
        var isAdmin = CircleScope.IsAdmin(User);
        var userCirclesList = userId.HasValue ? await CircleScope.UserCircleIds(_db, userId.Value).ToListAsync() : new List<Guid>();

        var eintrag = await _db.KeyResults
            .Include(k => k.Okr)
                .ThenInclude(o => o!.Circle)
            .FirstOrDefaultAsync(k => k.Id == key);

        if (eintrag is null) return NotFound();

        // Prüfen, ob User Zugriff auf den Kreis des OKR hat
        var circleId = eintrag.Okr?.CircleId;
        if (!isAdmin && circleId.HasValue && !userCirclesList.Contains(circleId.Value))
        {
            return Forbid();
        }

        return Ok(eintrag);
    }

    /// <summary>Neues Key Result erstellen. Kreis-Schreibrecht auf das übergeordnete OKR erforderlich.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.OkrManage)]
    public async Task<IActionResult> Post([FromBody] KeyResult eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // OKR laden für Berechtigungsprüfung
        var okr = await _db.OKRs
            .Include(o => o.Circle)
            .FirstOrDefaultAsync(o => o.Id == eintrag.OkrId);

        if (okr is null)
        {
            return BadRequest(new { error = "OkrId ungültig." });
        }

        // Schreibrecht prüfen
        if (!CircleScope.CanWrite(_db, User, okr.CircleId))
        {
            return Forbid();
        }

        if (eintrag.StartWert == eintrag.ZielWert)
        {
            return BadRequest(new { error = "ZielWert darf nicht gleich StartWert sein (Fortschrittsberechnung nicht möglich)." });
        }

        _db.KeyResults.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    /// <summary>Key Result aktualisieren. Kreis-Schreibrecht erforderlich.</summary>
    [HttpPatch]
    [Authorize(Policy = Permissions.OkrManage)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<KeyResult> delta)
    {
        var eintrag = await _db.KeyResults
            .Include(k => k.Okr)
                .ThenInclude(o => o!.Circle)
            .FirstOrDefaultAsync(k => k.Id == key);

        if (eintrag is null)
        {
            return NotFound();
        }

        // Schreibrecht prüfen
        if (!CircleScope.CanWrite(_db, User, eintrag.Okr?.CircleId))
        {
            return Forbid();
        }

        delta.Patch(eintrag);

        if (eintrag.StartWert == eintrag.ZielWert)
        {
            return BadRequest(new { error = "ZielWert darf nicht gleich StartWert sein (Fortschrittsberechnung nicht möglich)." });
        }

        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    /// <summary>Key Result löschen. Kreis-Schreibrecht erforderlich.</summary>
    [HttpDelete]
    [Authorize(Policy = Permissions.OkrManage)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.KeyResults
            .Include(k => k.Okr)
                .ThenInclude(o => o!.Circle)
            .FirstOrDefaultAsync(k => k.Id == key);

        if (eintrag is null)
        {
            return NotFound();
        }

        // Schreibrecht prüfen
        if (!CircleScope.CanWrite(_db, User, eintrag.Okr?.CircleId))
        {
            return Forbid();
        }

        _db.KeyResults.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
