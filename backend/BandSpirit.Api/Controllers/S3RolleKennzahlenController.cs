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

/// <summary>OData-Controller für Kennzahlen einer Rolle. Route: /odata/S3RolleKennzahlen</summary>
[Authorize]
public class S3RolleKennzahlenController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public S3RolleKennzahlenController(BandSpiritDbContext db) => _db = db;

    /// <summary>GET – Liste aller Kennzahlen.</summary>
    [HttpGet]
    [EnableQuery(PageSize = 200)]
    [Authorize(Policy = Permissions.RoleUpdate)]
    public IQueryable<S3RolleKennzahl> Get() => _db.S3RolleKennzahlen.AsQueryable();

    /// <summary>GET({id}) – Einzelne Kennzahl abrufen.</summary>
    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.RoleUpdate)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.S3RolleKennzahlen.FirstOrDefaultAsync(k => k.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    /// <summary>POST – Neue Kennzahl anlegen.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.RoleUpdate)]
    public async Task<IActionResult> Post([FromBody] S3RolleKennzahl eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        if (eintrag.RollenDefinitionId == Guid.Empty)
        {
            return BadRequest(new { fehler = "Eine Kennzahl muss einer Rollendefinition (RollenDefinitionId) zugeordnet sein." });
        }
        _db.S3RolleKennzahlen.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    /// <summary>PATCH({id}) – Kennzahl aktualisieren.</summary>
    [HttpPatch]
    [Authorize(Policy = Permissions.RoleUpdate)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<S3RolleKennzahl> delta)
    {
        var eintrag = await _db.S3RolleKennzahlen.FirstOrDefaultAsync(k => k.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);
        if (eintrag.RollenDefinitionId == Guid.Empty)
        {
            return BadRequest(new { fehler = "Eine Kennzahl muss einer Rollendefinition (RollenDefinitionId) zugeordnet sein." });
        }
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    /// <summary>DELETE({id}) – Kennzahl löschen.</summary>
    [HttpDelete]
    [Authorize(Policy = Permissions.RoleUpdate)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.S3RolleKennzahlen.FirstOrDefaultAsync(k => k.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        _db.S3RolleKennzahlen.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
