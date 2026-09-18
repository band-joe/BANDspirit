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
/// OData-Controller für die Lebenszyklus-Historie eines Kreises.
/// Route: /odata/S3CircleLebenszyklen
/// </summary>
[Authorize]
public class S3CircleLebenszyklenController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public S3CircleLebenszyklenController(BandSpiritDbContext db) => _db = db;

    /// <summary>GET – Historie (mit $filter=S3CircleId, $expand=LebenszyklusPhase).</summary>
    [HttpGet]
    [EnableQuery(PageSize = 200)]
    [Authorize(Policy = Permissions.CircleRead)]
    public IQueryable<S3CircleLebenszyklus> Get() => _db.S3CircleLebenszyklen.AsQueryable();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.CircleRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.S3CircleLebenszyklen.FirstOrDefaultAsync(l => l.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    /// <summary>POST – Neuen Lebenszyklus-Eintrag (Phasenwechsel) anlegen.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.CircleUpdate)]
    public async Task<IActionResult> Post([FromBody] S3CircleLebenszyklus eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        if (eintrag.S3CircleId == Guid.Empty)
        {
            return BadRequest(new { fehler = "Es muss ein Kreis (S3CircleId) angegeben werden." });
        }
        if (eintrag.LebenszyklusPhaseId == Guid.Empty)
        {
            return BadRequest(new { fehler = "Es muss eine Lebenszyklus-Phase angegeben werden." });
        }
        // Startdatum ist Pflicht: jeder Lebenszyklus-Eintrag muss ein Startdatum haben.
        if (eintrag.StartDatum == default)
        {
            return BadRequest(new { fehler = "Ein Startdatum ist erforderlich." });
        }
        // StartDatum ist als "timestamp with time zone" gemappt. Npgsql verlangt dafür
        // DateTimeKind.Utc, sonst wirft SaveChanges eine Exception. Eingehende Werte
        // (Unspecified/Local) daher explizit als UTC kennzeichnen.
        eintrag.StartDatum = NormalizeUtc(eintrag.StartDatum);

        var circle = await _db.S3Circles.FirstOrDefaultAsync(c => c.Id == eintrag.S3CircleId);
        if (circle is null)
        {
            return BadRequest(new { fehler = "Der angegebene Kreis existiert nicht." });
        }
        var phase = await _db.S3LebenszyklusPhasen.FirstOrDefaultAsync(p => p.Id == eintrag.LebenszyklusPhaseId);
        if (phase is null)
        {
            return BadRequest(new { fehler = "Die angegebene Lebenszyklus-Phase existiert nicht." });
        }

        _db.S3CircleLebenszyklen.Add(eintrag);

        // Denormalisierte "aktuelle Phase" am Kreis aktualisieren, sofern dieser
        // Eintrag der jüngste (nach Startdatum) für den Kreis ist.
        var neuestesStartdatum = await _db.S3CircleLebenszyklen
            .Where(l => l.S3CircleId == eintrag.S3CircleId)
            .Select(l => (DateTime?)l.StartDatum)
            .MaxAsync();
        if (neuestesStartdatum is null || eintrag.StartDatum >= neuestesStartdatum.Value)
        {
            circle.LifecyclePhase = phase.Name;
        }

        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.CircleUpdate)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<S3CircleLebenszyklus> delta)
    {
        var eintrag = await _db.S3CircleLebenszyklen.FirstOrDefaultAsync(l => l.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);
        if (eintrag.StartDatum == default)
        {
            return BadRequest(new { fehler = "Ein Startdatum ist erforderlich." });
        }
        eintrag.StartDatum = NormalizeUtc(eintrag.StartDatum);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    /// <summary>
    /// Stellt sicher, dass ein DateTime für eine "timestamp with time zone"-Spalte
    /// den Kind=Utc besitzt (Anforderung von Npgsql).
    /// </summary>
    private static DateTime NormalizeUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
    };

    [HttpDelete]
    [Authorize(Policy = Permissions.CircleUpdate)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.S3CircleLebenszyklen.FirstOrDefaultAsync(l => l.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        _db.S3CircleLebenszyklen.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
