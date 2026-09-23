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
/// OData-Controller für KPI-Messungen. Route: /odata/KpiMeasurements
/// Business-Entscheid: Zugriff richtet sich ausschliesslich nach der Benutzerrolle
/// (Permissions.KpiRead/KpiMeasure/KpiManage), nicht nach der Kreis-Zugehörigkeit
/// (S3-Rollenzuweisung) - eine frühere zusätzliche Kreis-Scoping-Prüfung
/// (CircleScope) wurde bewusst wieder entfernt.
/// </summary>
[Authorize]
public class KpiMeasurementsController : ODataController
{
    private readonly BandSpiritDbContext _db;
    private readonly Services.KpiService _kpiService;

    public KpiMeasurementsController(BandSpiritDbContext db, Services.KpiService kpiService)
    {
        _db = db;
        _kpiService = kpiService;
    }

    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.KpiRead)]
    public IQueryable<KpiMeasurement> Get() =>
        _db.KpiMeasurements
            .Include(m => m.KpiDefinition)
                .ThenInclude(k => k!.Circle);

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.KpiRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.KpiMeasurements
            .Include(m => m.KpiDefinition)
                .ThenInclude(k => k!.Circle)
            .FirstOrDefaultAsync(m => m.Id == key);

        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    /// <summary>Neue KPI-Messung erstellen. Status wird automatisch berechnet.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.KpiMeasure)]
    public async Task<IActionResult> Post([FromBody] KpiMeasurement eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // KPI-Definition laden für Statusberechnung
        var definition = await _db.KpiDefinitions
            .Include(k => k.Circle)
            .FirstOrDefaultAsync(d => d.Id == eintrag.KpiDefinitionId);

        if (definition is null)
        {
            return BadRequest(new { error = "KpiDefinitionId ungültig." });
        }

        // Status automatisch anhand der Schwellenwerte berechnen
        eintrag.Status = _kpiService.BerechneStatus(definition, eintrag.IstWert);

        // Trend automatisch aus den letzten 3 Messungen berechnen
        var letztMesswerte = await _db.KpiMeasurements
            .Where(m => m.KpiDefinitionId == eintrag.KpiDefinitionId)
            .OrderByDescending(m => m.Messdatum)
            .Take(3)
            .Select(m => m.IstWert)
            .ToListAsync();
        eintrag.Trend = _kpiService.BerechneTrend(eintrag.IstWert, letztMesswerte);

        _db.KpiMeasurements.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    /// <summary>KPI-Messung aktualisieren. Kreis-Schreibrecht erforderlich.</summary>
    [HttpPatch]
    [Authorize(Policy = Permissions.KpiManage)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<KpiMeasurement> delta)
    {
        var eintrag = await _db.KpiMeasurements
            .Include(m => m.KpiDefinition)
                .ThenInclude(k => k!.Circle)
            .FirstOrDefaultAsync(m => m.Id == key);

        if (eintrag is null)
        {
            return NotFound();
        }

        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    /// <summary>KPI-Messung löschen.</summary>
    [HttpDelete]
    [Authorize(Policy = Permissions.KpiManage)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.KpiMeasurements
            .Include(m => m.KpiDefinition)
                .ThenInclude(k => k!.Circle)
            .FirstOrDefaultAsync(m => m.Id == key);

        if (eintrag is null)
        {
            return NotFound();
        }

        _db.KpiMeasurements.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
