using System.Security.Claims;
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

    /// <summary>
    /// GET /odata/Drivers({id}) – Einzelnen Treiber abrufen.
    /// </summary>
    /// <remarks>
    /// UI-12/APP-21-Fix: SingleResult-Antwort statt FirstOrDefaultAsync(), damit
    /// $expand=WorkItems,Circle vor der Materialisierung angewendet wird -
    /// FirstOrDefaultAsync() ignoriert $expand, wodurch Circle/WorkItems zuvor
    /// immer null/leer zurückkamen (Frontend griff ohne Optional-Chaining auf
    /// driver.circle.name zu -> Absturz).
    /// </remarks>
    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.DriverRead)]
    public SingleResult<S3Driver> Get([FromRoute] Guid key)
    {
        return SingleResult.Create(_db.S3Drivers.Where(d => d.Id == key));
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

    /// <summary>
    /// PATCH /odata/Drivers({id}) – Treiber/Spannung aktualisieren.
    /// </summary>
    /// <remarks>
    /// Business-Entscheid: Das Abschliessen einer Spannung (Statuswechsel auf
    /// ERLEDIGT) ist zusätzlich zur allgemeinen "org:driver:update"-Berechtigung
    /// nur dem/der Lead-Link des betroffenen Kreises (oder Admin) erlaubt - unabhängig
    /// davon, welche Rolle sonst noch org:driver:update besitzt (z. B. CircleAdmin
    /// über mehrere Kreise hinweg). Andere Feldänderungen bleiben unverändert nur
    /// an die allgemeine Berechtigung geknüpft.
    /// </remarks>
    [HttpPatch]
    [Authorize(Policy = Permissions.DriverUpdate)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<S3Driver> delta)
    {
        var eintrag = await _db.S3Drivers.FirstOrDefaultAsync(d => d.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }

        var schliesstAb = delta.GetChangedPropertyNames().Contains(nameof(S3Driver.Status))
            && delta.TryGetPropertyValue(nameof(S3Driver.Status), out var neuerStatusWert)
            && neuerStatusWert is string neuerStatus
            && neuerStatus == "ERLEDIGT"
            && eintrag.Status != "ERLEDIGT";

        if (schliesstAb && !await DarfSpannungAbschliessenAsync(eintrag.CircleId))
        {
            return Forbid();
        }

        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    /// <summary>
    /// Prüft, ob der angemeldete Benutzer eine Spannung des angegebenen Kreises
    /// abschliessen darf: Admin, oder Lead-Link (RollenDefinition.IsLeadLink)
    /// dieses konkreten Kreises über eine aktive, gültige Rollenzuweisung.
    /// </summary>
    private async Task<bool> DarfSpannungAbschliessenAsync(Guid circleId)
    {
        var rolle = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role");
        if (rolle == BenutzerRollenNamen.Admin)
        {
            return true;
        }

        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var userId))
        {
            return false;
        }

        var jetzt = DateTime.UtcNow;
        return await _db.S3PersonRoleAssignments
            .AsNoTracking()
            .AnyAsync(pra => pra.UserId == userId
                && pra.Role != null
                && pra.Role.CircleId == circleId
                && pra.Role.RollenDefinition != null
                && pra.Role.RollenDefinition.IsLeadLink
                && (pra.DateFrom == null || pra.DateFrom <= jetzt)
                && (pra.DateTo == null || pra.DateTo >= jetzt));
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
