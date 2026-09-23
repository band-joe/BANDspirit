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

/// <summary>OData-Controller für KPI-Definitionen. Route: /odata/KpiDefinitions</summary>
[Authorize]
public class KpiDefinitionsController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public KpiDefinitionsController(BandSpiritDbContext db) => _db = db;

    /// <summary>
    /// Business-Entscheid: Sichtbarkeit/Schreibrecht von KPI-Definitionen richtet
    /// sich ausschliesslich nach der Benutzerrolle (Permissions.KpiRead/KpiManage),
    /// nicht nach der Kreis-Zugehörigkeit (S3-Rollenzuweisung) des Benutzers - eine
    /// frühere zusätzliche Kreis-Scoping-Prüfung (CircleScope) wurde bewusst wieder
    /// entfernt.
    /// </summary>
    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.KpiRead)]
    public IQueryable<KpiDefinition> Get() => _db.KpiDefinitions.AsQueryable();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.KpiRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.KpiDefinitions.FirstOrDefaultAsync(d => d.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.KpiManage)]
    public async Task<IActionResult> Post([FromBody] KpiDefinition eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        var fehler = PruefeSchwellen(eintrag);
        if (fehler is not null)
        {
            return BadRequest(new { error = fehler });
        }
        _db.KpiDefinitions.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.KpiManage)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<KpiDefinition> delta)
    {
        var eintrag = await _db.KpiDefinitions.FirstOrDefaultAsync(d => d.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);
        var fehler = PruefeSchwellen(eintrag);
        if (fehler is not null)
        {
            return BadRequest(new { error = fehler });
        }
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    [HttpDelete]
    [Authorize(Policy = Permissions.KpiManage)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.KpiDefinitions.FirstOrDefaultAsync(d => d.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        _db.KpiDefinitions.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Prüft die logische Reihenfolge von Warn- und kritischer Schwelle abhängig von der Richtung.
    /// Gibt eine deutsche Fehlermeldung zurück, wenn die Reihenfolge verletzt ist, sonst null.
    /// </summary>
    private static string? PruefeSchwellen(KpiDefinition eintrag)
    {
        // Nur prüfen, wenn beide Schwellen gesetzt sind.
        if (!eintrag.Warnschwelle.HasValue || !eintrag.KritischeSchwelle.HasValue)
        {
            return null;
        }

        var warn = eintrag.Warnschwelle.Value;
        var kritisch = eintrag.KritischeSchwelle.Value;
        var richtung = eintrag.Richtung ?? "HOEHER_BESSER";

        return richtung switch
        {
            "NIEDRIGER_BESSER" =>
                warn < kritisch
                    ? null
                    : "Bei Richtung „Niedriger ist besser“ muss die Warnschwelle kleiner als die kritische Schwelle sein.",

            "ZIELBAND" =>
                warn < kritisch
                    ? null
                    : "Beim Zielband muss die Warnschwelle (Untergrenze) kleiner als die kritische Schwelle (Obergrenze) sein.",

            _ => // HOEHER_BESSER (Standard)
                kritisch < warn
                    ? null
                    : "Bei Richtung „Höher ist besser“ muss die kritische Schwelle kleiner als die Warnschwelle sein.",
        };
    }
}
