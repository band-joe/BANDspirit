using BandSpirit.Api.Infrastructure;
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
        await _db.SaveChangesAsync();

        // APP-11-Fix: Denormalisierte "aktuelle Phase" am Kreis zentral aus der
        // (jetzt gespeicherten) Historie neu ableiten, statt sie hier lokal zu
        // berechnen - dieselbe Ableitung wird bei Patch/Delete/Umzug verwendet.
        await KreisPhaseSynchronisation.AktualisierePhaseAsync(_db, eintrag.S3CircleId);
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
        var alteCircleId = eintrag.S3CircleId;
        delta.Patch(eintrag);
        if (eintrag.StartDatum == default)
        {
            return BadRequest(new { fehler = "Ein Startdatum ist erforderlich." });
        }
        eintrag.StartDatum = NormalizeUtc(eintrag.StartDatum);
        await _db.SaveChangesAsync();

        // APP-11-Fix: Nach Bearbeitung (Startdatum, Phase oder Umzug auf einen
        // anderen Kreis) die angezeigte Phase auf beiden ggf. betroffenen
        // Kreisen neu ableiten, sonst bleibt sie gegenüber der Historie stehen.
        await KreisPhaseSynchronisation.AktualisierePhaseAsync(_db, eintrag.S3CircleId);
        if (eintrag.S3CircleId != alteCircleId)
        {
            await KreisPhaseSynchronisation.AktualisierePhaseAsync(_db, alteCircleId);
        }
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
        var circleId = eintrag.S3CircleId;
        _db.S3CircleLebenszyklen.Remove(eintrag);
        await _db.SaveChangesAsync();

        // APP-11-Fix: Nach Löschen die angezeigte Phase neu ableiten - auch wenn
        // dies der letzte verbleibende Eintrag war (Phase wird dann zurückgesetzt).
        await KreisPhaseSynchronisation.AktualisierePhaseAsync(_db, circleId);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
