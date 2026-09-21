using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Deltas;
using Microsoft.AspNetCore.OData.Formatter;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Results;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;
using Npgsql;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>OData-Controller für Rollen (S3Role) inkl. Assign/Unassign-Actions. Route: /odata/Roles</summary>
[Authorize]
public class RolesController : ODataController
{
    private readonly BandSpiritDbContext _db;
    private readonly Services.AuditService _auditService;

    public RolesController(BandSpiritDbContext db, Services.AuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    /// <summary>GET /odata/Roles – Liste aller Rollen.</summary>
    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.RoleRead)]
    public IQueryable<S3Role> Get() => _db.S3Roles.AsQueryable();

    /// <summary>GET /odata/Roles({id}) – Einzelne Rolle abrufen.</summary>
    /// <remarks>
    /// APP-21 (P005): Gibt eine IQueryable-kompatible SingleResult-Antwort zurück,
    /// damit OData $expand=assignments dieselben Daten liefert wie der gefilterte
    /// Collection-Endpoint. FirstOrDefaultAsync() ignoriert $expand-Parameter.
    /// </remarks>
    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.RoleRead)]
    public SingleResult<S3Role> Get([FromRoute] Guid key)
    {
        return SingleResult.Create(_db.S3Roles.Where(r => r.Id == key));
    }

    /// <summary>POST /odata/Roles – Neue Rolle anlegen.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.RoleCreate)]
    public async Task<IActionResult> Post([FromBody] S3Role eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Eine Rolle (Vorlage) darf pro Kreis nur EINMAL zugeordnet werden.
        // DB-03: Dieser Check allein schützt nicht vor zwei gleichzeitigen
        // Requests (TOCTOU) - der Composite-Unique-Index (BandSpiritDbContext)
        // ist die tatsächliche Absicherung, dieser Check liefert nur die
        // freundliche Fehlermeldung im Normalfall.
        var bereitsVorhanden = await _db.S3Roles.AnyAsync(
            r => r.CircleId == eintrag.CircleId && r.RollenDefinitionId == eintrag.RollenDefinitionId);
        if (bereitsVorhanden)
        {
            return Conflict(new { fehler = "Diese Rolle ist in diesem Kreis bereits vorhanden. Eine Rollen-Vorlage kann pro Kreis nur einmal zugeordnet werden." });
        }

        _db.S3Roles.Add(eintrag);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IstEindeutigkeitsverletzung(ex))
        {
            return Conflict(new { fehler = "Diese Rolle ist in diesem Kreis bereits vorhanden. Eine Rollen-Vorlage kann pro Kreis nur einmal zugeordnet werden." });
        }
        return Created(eintrag);
    }

    /// <summary>PATCH /odata/Roles({id}) – Rolle aktualisieren.</summary>
    /// <remarks>
    /// DB-03-Fix: Prüft jetzt VOR dem Speichern, ob die (ggf. neue) Kombination
    /// aus CircleId/RollenDefinitionId bereits bei einer anderen Rolle existiert
    /// - zuvor liess PATCH beliebige Duplikate zu, da nur der Create-Pfad
    /// geprüft wurde.
    /// </remarks>
    [HttpPatch]
    [Authorize(Policy = Permissions.RoleUpdate)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<S3Role> delta)
    {
        var eintrag = await _db.S3Roles.FirstOrDefaultAsync(r => r.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);

        var kollidiertMitAnderer = await _db.S3Roles.AnyAsync(
            r => r.Id != key && r.CircleId == eintrag.CircleId && r.RollenDefinitionId == eintrag.RollenDefinitionId);
        if (kollidiertMitAnderer)
        {
            return Conflict(new { fehler = "Diese Rolle ist in diesem Kreis bereits vorhanden. Eine Rollen-Vorlage kann pro Kreis nur einmal zugeordnet werden." });
        }

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IstEindeutigkeitsverletzung(ex))
        {
            return Conflict(new { fehler = "Diese Rolle ist in diesem Kreis bereits vorhanden. Eine Rollen-Vorlage kann pro Kreis nur einmal zugeordnet werden." });
        }
        return Updated(eintrag);
    }

    /// <summary>Erkennt eine PostgreSQL-Unique-Constraint-Verletzung (SQLSTATE 23505).</summary>
    private static bool IstEindeutigkeitsverletzung(DbUpdateException ex)
        => ex.InnerException is PostgresException { SqlState: "23505" };

    /// <summary>
    /// DELETE /odata/Roles({id}) – Rolle aus dem Kreis löschen.
    /// Eine Rolle darf nur gelöscht werden, wenn ihr kein Benutzer mehr
    /// zugewiesen ist. Bestehen noch Zuweisungen, wird die Löschung mit
    /// HTTP 409 (Conflict) abgelehnt.
    /// </summary>
    [HttpDelete]
    [Authorize(Policy = Permissions.RoleUpdate)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.S3Roles.FirstOrDefaultAsync(r => r.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }

        // Löschen nur erlaubt, wenn keine Benutzer-Zuweisung mehr besteht.
        var hatZuweisungen = await _db.S3PersonRoleAssignments.AnyAsync(p => p.RoleId == key);
        if (hatZuweisungen)
        {
            return Conflict(new { fehler = "Die Rolle kann nicht gelöscht werden, solange ihr noch Benutzer zugewiesen sind. Bitte zuerst alle Zuweisungen entfernen." });
        }

        _db.S3Roles.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>POST /odata/Roles({id})/Assign – Benutzer einer Rolle zuweisen.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.RoleAssign)]
    public async Task<IActionResult> Assign([FromRoute] Guid key, [FromBody] ODataActionParameters parameters)
    {
        if (parameters is null || !parameters.TryGetValue("userId", out var userIdObj)
            || !Guid.TryParse(userIdObj?.ToString(), out var userId))
        {
            return BadRequest(new { fehler = "Parameter 'userId' fehlt oder ist ungültig." });
        }

        var rolle = await _db.S3Roles
            .Include(r => r.RollenDefinition)
            .FirstOrDefaultAsync(r => r.Id == key);
        if (rolle is null)
        {
            return NotFound();
        }

        var bereitsZugewiesen = await _db.S3PersonRoleAssignments
            .AnyAsync(p => p.RoleId == key && p.UserId == userId);
        if (bereitsZugewiesen)
        {
            // Idempotent: bereits zugewiesen -> nichts zu tun.
            return Ok(new { nachricht = "Benutzer wurde der Rolle zugewiesen." });
        }

        // APP-17-Fix: Kardinalität kommt jetzt aus dem expliziten Feld
        // ErlaubtMehrfachbesetzung statt aus einem Namensvergleich auf
        // "Mitglied" - eine Umbenennung der Rollendefinition ändert die Regel
        // dadurch nicht mehr unbeabsichtigt.
        var erlaubtMehrfachbesetzung = rolle.RollenDefinition?.ErlaubtMehrfachbesetzung ?? false;
        if (!erlaubtMehrfachbesetzung)
        {
            var hatBereitsBenutzer = await _db.S3PersonRoleAssignments.AnyAsync(p => p.RoleId == key);
            if (hatBereitsBenutzer)
            {
                return Conflict(new { fehler = "Dieser Rolle ist bereits ein Benutzer zugeordnet. Diese Rollendefinition erlaubt keine Mehrfachbesetzung." });
            }
        }

        _db.S3PersonRoleAssignments.Add(new S3PersonRoleAssignment { RoleId = key, UserId = userId });
        await _db.SaveChangesAsync();

        // M2.5: Log der Zuweisung
        var benutzer = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        await _auditService.LogAsync(
            modul: "S3Rolle",
            aktion: "ZUWEISUNG",
            entityId: key.ToString(),
            entityName: rolle.RollenDefinition?.Name ?? "Rolle",
            userId: userId.ToString(),
            userName: benutzer?.Name,
            details: $"Benutzer {benutzer?.Name} ({userId}) zugewiesen"
        );

        return Ok(new { nachricht = "Benutzer wurde der Rolle zugewiesen." });
    }

    /// <summary>POST /odata/Roles({id})/Unassign – Zuweisung eines Benutzers entfernen.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.RoleUnassign)]
    public async Task<IActionResult> Unassign([FromRoute] Guid key, [FromBody] ODataActionParameters parameters)
    {
        if (parameters is null || !parameters.TryGetValue("userId", out var userIdObj)
            || !Guid.TryParse(userIdObj?.ToString(), out var userId))
        {
            return BadRequest(new { fehler = "Parameter 'userId' fehlt oder ist ungültig." });
        }

        var zuweisung = await _db.S3PersonRoleAssignments
            .FirstOrDefaultAsync(p => p.RoleId == key && p.UserId == userId);
        if (zuweisung is not null)
        {
            // M2.5: Rolle und Benutzer vor dem Remove laden, damit Infos für Log verfügbar sind
            var rolle = await _db.S3Roles
                .Include(r => r.RollenDefinition)
                .FirstOrDefaultAsync(r => r.Id == key);
            var benutzer = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);

            _db.S3PersonRoleAssignments.Remove(zuweisung);
            await _db.SaveChangesAsync();

            // M2.5: Log des Entzugs
            await _auditService.LogAsync(
                modul: "S3Rolle",
                aktion: "ENTZUG",
                entityId: key.ToString(),
                entityName: rolle?.RollenDefinition?.Name ?? "Rolle",
                userId: userId.ToString(),
                userName: benutzer?.Name,
                details: $"Benutzer {benutzer?.Name} ({userId}) entzogen"
            );
        }
        return Ok(new { nachricht = "Zuweisung wurde entfernt." });
    }
}
