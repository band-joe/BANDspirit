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

/// <summary>OData-Controller für Rollendefinitionen (S3RollenDefinition). Route: /odata/S3RollenDefinitionen</summary>
[Authorize]
public class S3RollenDefinitionenController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public S3RollenDefinitionenController(BandSpiritDbContext db) => _db = db;

    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public IQueryable<S3RollenDefinition> Get() => _db.S3RollenDefinitionen.AsQueryable();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.S3RollenDefinitionen.FirstOrDefaultAsync(r => r.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    // Namen, die zu den Applikations-Benutzerrollen gehören und daher NICHT als
    // soziokratische S3-Rolle angelegt werden dürfen.
    private static readonly string[] ReservierteNamen = { "Administrator", "Admin" };

    private static bool IstReserviert(string? name) =>
        name is not null && ReservierteNamen.Any(r => string.Equals(r, name.Trim(), StringComparison.OrdinalIgnoreCase));

    [HttpPost]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Post([FromBody] S3RollenDefinition eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        if (IstReserviert(eintrag.Name))
        {
            return BadRequest(new { fehler = "'Administrator'/'Admin' ist eine Applikations-Benutzerrolle und kann nicht als S3-Rolle angelegt werden. Bitte unter Einstellungen → Benutzerrollen pflegen." });
        }
        _db.S3RollenDefinitionen.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<S3RollenDefinition> delta)
    {
        var eintrag = await _db.S3RollenDefinitionen.FirstOrDefaultAsync(r => r.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);
        if (IstReserviert(eintrag.Name))
        {
            return BadRequest(new { fehler = "'Administrator'/'Admin' ist eine Applikations-Benutzerrolle und kann nicht als S3-Rolle geführt werden. Bitte unter Einstellungen → Benutzerrollen pflegen." });
        }
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    // HINWEIS: Rollendefinitionen dürfen zur Wahrung der Datenintegrität NICHT
    // gelöscht werden (sie können in S3Role/Zuweisungen referenziert sein).
    // Statt eines DELETE-Endpunkts wird eine Rolle über PATCH { "aktiv": false }
    // nur inaktiv gesetzt (Soft-Delete). Ein HTTP-DELETE wird bewusst mit
    // 405 Method Not Allowed abgelehnt.
    [HttpDelete]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public IActionResult Delete([FromRoute] Guid key)
        => StatusCode(StatusCodes.Status405MethodNotAllowed,
            "Rollendefinitionen können nicht gelöscht, sondern nur inaktiv gesetzt werden (PATCH aktiv=false).");
}
