using BandSpirit.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>
/// REST-Controller für Hierarchie-Operationen an Kreisen (S3Circle).
/// Ermöglicht das Anhängen eines (Root-)Kreises an einen anderen Kreis
/// (danach als Subkreis geführt) sowie das Loslösen zu einem eigenständigen
/// Root-Kreis. Route: /api/circles
///
/// Wichtig: Beim Umhängen wird die denormalisierte RootId des Kreises UND
/// aller darunterliegenden Subkreise rekursiv neu berechnet. Alle Änderungen
/// laufen in einer Transaktion (entweder ganz oder gar nicht).
/// </summary>
[ApiController]
[Route("api/circles")]
[Authorize]
public class CircleHierarchyController : ControllerBase
{
    private readonly BandSpiritDbContext _db;
    private readonly ILogger<CircleHierarchyController> _logger;

    public CircleHierarchyController(BandSpiritDbContext db, ILogger<CircleHierarchyController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>Eingabe für das Anhängen an einen Ziel-Kreis.</summary>
    public class AnhaengenRequest
    {
        /// <summary>ID des Ziel-Kreises, unter den der Kreis gehängt wird.</summary>
        public Guid ZielKreisId { get; set; }
    }

    /// <summary>
    /// POST /api/circles/{id}/anhaengen – Hängt den Kreis {id} unter den
    /// Ziel-Kreis. Der Kreis (und alle seine Subkreise) werden danach als
    /// Subkreise des Ziel-Kreises geführt; die RootId wird durchgängig auf die
    /// Wurzel des Ziel-Kreises gesetzt.
    /// </summary>
    [HttpPost("{id}/anhaengen")]
    [Authorize(Policy = Permissions.CircleUpdate)]
    public async Task<IActionResult> Anhaengen([FromRoute] Guid id, [FromBody] AnhaengenRequest anfrage)
    {
        if (anfrage is null || anfrage.ZielKreisId == Guid.Empty)
        {
            return BadRequest(new { fehler = "Es muss ein Ziel-Kreis angegeben werden." });
        }

        if (anfrage.ZielKreisId == id)
        {
            return BadRequest(new { fehler = "Ein Kreis kann nicht an sich selbst angehängt werden." });
        }

        // Alle Kreise flach laden – für Zyklus-Prüfung und rekursive RootId-Berechnung.
        var alle = await _db.S3Circles.ToListAsync();

        var kreis = alle.FirstOrDefault(c => c.Id == id);
        if (kreis is null)
        {
            return NotFound(new { fehler = "Der zu verschiebende Kreis wurde nicht gefunden." });
        }

        var ziel = alle.FirstOrDefault(c => c.Id == anfrage.ZielKreisId);
        if (ziel is null)
        {
            return NotFound(new { fehler = "Der Ziel-Kreis wurde nicht gefunden." });
        }

        if (!ziel.IsActive)
        {
            return BadRequest(new { fehler = "Der Ziel-Kreis ist nicht aktiv." });
        }

        // Zyklus verhindern: Der Ziel-Kreis darf kein Nachfahre des Kreises sein
        // (und auch nicht der Kreis selbst – oben bereits geprüft).
        var nachfahren = SammleNachfahren(alle, id);
        if (nachfahren.Contains(anfrage.ZielKreisId))
        {
            return BadRequest(new { fehler = "Der Kreis kann nicht an einen seiner eigenen Subkreise angehängt werden." });
        }

        // Neue Wurzel = Wurzel des Ziel-Kreises (oder der Ziel-Kreis selbst).
        var neueRootId = ziel.RootId ?? ziel.Id;

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            kreis.ParentId = ziel.Id;
            kreis.RootId = neueRootId;

            // RootId für den kompletten Teilbaum (alle Nachfahren) nachziehen.
            foreach (var nachfahreId in nachfahren)
            {
                var n = alle.First(c => c.Id == nachfahreId);
                n.RootId = neueRootId;
            }

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            _logger.LogInformation(
                "Kreis {KreisId} an Ziel-Kreis {ZielId} angehängt; {Anzahl} Subkreis(e) mit neuer RootId {RootId} aktualisiert.",
                id, ziel.Id, nachfahren.Count, neueRootId);

            return Ok(new
            {
                id = kreis.Id,
                parentId = kreis.ParentId,
                rootId = kreis.RootId,
                aktualisierteSubkreise = nachfahren.Count,
            });
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Fehler beim Anhängen von Kreis {KreisId} an {ZielId}.", id, anfrage.ZielKreisId);
            return StatusCode(500, new { fehler = "Der Kreis konnte nicht angehängt werden." });
        }
    }

    /// <summary>
    /// POST /api/circles/{id}/loesen – Löst den Kreis {id} aus seiner Hierarchie
    /// und führt ihn danach als eigenständigen Root-Kreis. Der Kreis (und alle
    /// seine Subkreise) erhalten den Kreis selbst als neue Wurzel.
    /// </summary>
    [HttpPost("{id}/loesen")]
    [Authorize(Policy = Permissions.CircleUpdate)]
    public async Task<IActionResult> Loesen([FromRoute] Guid id)
    {
        var alle = await _db.S3Circles.ToListAsync();

        var kreis = alle.FirstOrDefault(c => c.Id == id);
        if (kreis is null)
        {
            return NotFound(new { fehler = "Der Kreis wurde nicht gefunden." });
        }

        if (kreis.ParentId is null)
        {
            return BadRequest(new { fehler = "Der Kreis ist bereits ein Root-Kreis." });
        }

        var nachfahren = SammleNachfahren(alle, id);

        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            kreis.ParentId = null;
            kreis.RootId = kreis.Id; // Der Kreis wird selbst zur Wurzel.

            foreach (var nachfahreId in nachfahren)
            {
                var n = alle.First(c => c.Id == nachfahreId);
                n.RootId = kreis.Id;
            }

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            _logger.LogInformation(
                "Kreis {KreisId} als Root-Kreis gelöst; {Anzahl} Subkreis(e) mit neuer RootId {RootId} aktualisiert.",
                id, nachfahren.Count, kreis.Id);

            return Ok(new
            {
                id = kreis.Id,
                parentId = (Guid?)null,
                rootId = kreis.RootId,
                aktualisierteSubkreise = nachfahren.Count,
            });
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync();
            _logger.LogError(ex, "Fehler beim Lösen von Kreis {KreisId}.", id);
            return StatusCode(500, new { fehler = "Der Kreis konnte nicht gelöst werden." });
        }
    }

    /// <summary>
    /// Ermittelt (breadth-first) die IDs aller Nachfahren des angegebenen Kreises
    /// anhand der ParentId-Verkettung. Der Kreis selbst ist NICHT enthalten.
    /// </summary>
    private static HashSet<Guid> SammleNachfahren(IReadOnlyCollection<Models.S3Circle> alle, Guid wurzelId)
    {
        // Kinder je Elternkreis vorgruppieren.
        var kinderJeElter = alle
            .Where(c => c.ParentId.HasValue)
            .GroupBy(c => c.ParentId!.Value)
            .ToDictionary(g => g.Key, g => g.Select(c => c.Id).ToList());

        var ergebnis = new HashSet<Guid>();
        var queue = new Queue<Guid>();
        queue.Enqueue(wurzelId);

        while (queue.Count > 0)
        {
            var aktuell = queue.Dequeue();
            if (!kinderJeElter.TryGetValue(aktuell, out var kinder))
            {
                continue;
            }
            foreach (var kindId in kinder)
            {
                // Schutz vor evtl. vorhandenen Zyklen in Altdaten.
                if (ergebnis.Add(kindId))
                {
                    queue.Enqueue(kindId);
                }
            }
        }

        return ergebnis;
    }
}
