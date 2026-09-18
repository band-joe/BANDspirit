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

/// <summary>OData-Controller für KPI-Messungen mit kreis-basierter Filterung. Route: /odata/KpiMeasurements</summary>
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

    /// <summary>Alle KPI-Messungen abrufen, gefiltert nach Kreis-Zugehörigkeit der KPI-Definition.</summary>
    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.KpiRead)]
    public IQueryable<KpiMeasurement> Get()
    {
        var userId = CircleScope.GetUserId(User);
        var isAdmin = CircleScope.IsAdmin(User);
        var userCircles = userId.HasValue ? CircleScope.UserCircleIds(_db, userId.Value) : Enumerable.Empty<Guid>().AsQueryable();

        // Messungen filtern nach CircleId der zugehörigen KPI-Definition
        return _db.KpiMeasurements
            .Include(m => m.KpiDefinition)
                .ThenInclude(k => k!.Circle)
            .Where(m => isAdmin || m.KpiDefinition!.CircleId == null || userCircles.Contains(m.KpiDefinition.CircleId.Value));
    }

    /// <summary>Eine einzelne KPI-Messung abrufen, kreis-gefiltert.</summary>
    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.KpiRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var userId = CircleScope.GetUserId(User);
        var isAdmin = CircleScope.IsAdmin(User);
        var userCirclesList = userId.HasValue ? await CircleScope.UserCircleIds(_db, userId.Value).ToListAsync() : new List<Guid>();

        var eintrag = await _db.KpiMeasurements
            .Include(m => m.KpiDefinition)
                .ThenInclude(k => k!.Circle)
            .FirstOrDefaultAsync(m => m.Id == key);

        if (eintrag is null) return NotFound();

        // Prüfen, ob User Zugriff auf den Kreis der KPI-Definition hat
        var circleId = eintrag.KpiDefinition?.CircleId;
        if (!isAdmin && circleId.HasValue && !userCirclesList.Contains(circleId.Value))
        {
            return Forbid();
        }

        return Ok(eintrag);
    }

    /// <summary>Neue KPI-Messung erstellen. Status wird automatisch berechnet. Kreis-Schreibrecht erforderlich.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.KpiMeasure)]
    public async Task<IActionResult> Post([FromBody] KpiMeasurement eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // KPI-Definition laden für Statusberechnung UND Berechtigungsprüfung
        var definition = await _db.KpiDefinitions
            .Include(k => k.Circle)
            .FirstOrDefaultAsync(d => d.Id == eintrag.KpiDefinitionId);

        if (definition is null)
        {
            return BadRequest(new { error = "KpiDefinitionId ungültig." });
        }

        // Schreibrecht prüfen (Messung darf nur in Kreisen erfolgen, in denen User ist)
        if (!CircleScope.CanWrite(_db, User, definition.CircleId))
        {
            return Forbid();
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

        // Schreibrecht prüfen
        if (!CircleScope.CanWrite(_db, User, eintrag.KpiDefinition?.CircleId))
        {
            return Forbid();
        }

        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    /// <summary>KPI-Messung löschen. Kreis-Schreibrecht erforderlich.</summary>
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

        // Schreibrecht prüfen
        if (!CircleScope.CanWrite(_db, User, eintrag.KpiDefinition?.CircleId))
        {
            return Forbid();
        }

        _db.KpiMeasurements.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
