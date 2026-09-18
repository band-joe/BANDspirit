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
/// OData-Controller für Lebenszyklus-Phasen (Stammdaten).
/// Route: /odata/S3LebenszyklusPhasen
/// </summary>
[Authorize]
public class S3LebenszyklusPhasenController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public S3LebenszyklusPhasenController(BandSpiritDbContext db) => _db = db;

    /// <summary>
    /// GET /odata/S3LebenszyklusPhasen – Liste. Lesen ist für alle
    /// authentifizierten Benutzer erlaubt, damit die Phasen z. B. im
    /// Kreis-Formular ausgewählt werden können.
    /// </summary>
    [HttpGet]
    [EnableQuery(PageSize = 200)]
    public IQueryable<S3LebenszyklusPhase> Get() => _db.S3LebenszyklusPhasen.AsQueryable();

    [HttpGet]
    [EnableQuery]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.S3LebenszyklusPhasen.FirstOrDefaultAsync(p => p.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Post([FromBody] S3LebenszyklusPhase eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        if (string.IsNullOrWhiteSpace(eintrag.Name))
        {
            return BadRequest(new { fehler = "Name ist erforderlich." });
        }
        var existiert = await _db.S3LebenszyklusPhasen
            .AnyAsync(p => p.Name.ToLower() == eintrag.Name.Trim().ToLower());
        if (existiert)
        {
            return BadRequest(new { fehler = $"Eine Lebenszyklus-Phase mit dem Namen '{eintrag.Name}' existiert bereits." });
        }
        _db.S3LebenszyklusPhasen.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<S3LebenszyklusPhase> delta)
    {
        var eintrag = await _db.S3LebenszyklusPhasen.FirstOrDefaultAsync(p => p.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    // HINWEIS: Phasen dürfen zur Wahrung der Datenintegrität NICHT gelöscht
    // werden (sie können in der Lebenszyklus-Historie referenziert sein). Statt
    // eines DELETE-Endpunkts wird eine Phase über PATCH { "aktiv": false } nur
    // inaktiv gesetzt (Soft-Delete). Ein HTTP-DELETE wird bewusst abgelehnt.
    [HttpDelete]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public IActionResult Delete([FromRoute] Guid key)
        => StatusCode(StatusCodes.Status405MethodNotAllowed,
            "Lebenszyklus-Phasen können nicht gelöscht, sondern nur inaktiv gesetzt werden (PATCH aktiv=false).");
}
