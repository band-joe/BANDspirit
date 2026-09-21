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
/// OData-Controller für Applikations-Benutzerrollen (BenutzerRolle).
/// Route: /odata/BenutzerRollen. Pflege unter Einstellungen → Benutzerrollen.
///
/// Hinweis: Dies sind KEINE soziokratischen S3-Rollen (siehe
/// <see cref="S3RollenDefinitionenController"/>), sondern Rollen zur Bedienung
/// bzw. Administration der Applikation.
/// </summary>
[Authorize]
public class BenutzerRollenController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public BenutzerRollenController(BandSpiritDbContext db) => _db = db;

    /// <summary>GET /odata/BenutzerRollen – Liste aller Benutzerrollen.</summary>
    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.UserRead)]
    public IQueryable<BenutzerRolle> Get() => _db.BenutzerRollen.AsQueryable();

    /// <summary>GET /odata/BenutzerRollen({id}) – Einzelne Benutzerrolle abrufen.</summary>
    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.UserRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.BenutzerRollen.FirstOrDefaultAsync(r => r.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    /// <summary>POST /odata/BenutzerRollen – Neue Benutzerrolle anlegen.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.UserManage)]
    public async Task<IActionResult> Post([FromBody] BenutzerRolle eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        eintrag.Name = eintrag.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(eintrag.Name))
        {
            return BadRequest(new { fehler = "Der Name der Benutzerrolle darf nicht leer sein." });
        }

        // Duplikate (case-insensitive) verhindern.
        var existiert = await _db.BenutzerRollen
            .AnyAsync(r => r.Name.ToLower() == eintrag.Name.ToLower());
        if (existiert)
        {
            return Conflict(new { fehler = $"Eine Benutzerrolle mit dem Namen '{eintrag.Name}' existiert bereits." });
        }

        // Das IstSystemAdmin-Flag kann nicht über die API neu vergeben werden.
        eintrag.IstSystemAdmin = false;

        _db.BenutzerRollen.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    /// <summary>PATCH /odata/BenutzerRollen({id}) – Benutzerrolle aktualisieren.</summary>
    [HttpPatch]
    [Authorize(Policy = Permissions.UserManage)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<BenutzerRolle> delta)
    {
        var eintrag = await _db.BenutzerRollen.FirstOrDefaultAsync(r => r.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }

        var geaenderteFelder = delta.GetChangedPropertyNames().ToHashSet();

        // Die System-Admin-Rolle darf nicht umbenannt, deaktiviert oder ihres
        // Admin-Flags beraubt werden – sonst droht ein Aussperren aus der
        // Applikationsverwaltung.
        if (eintrag.IstSystemAdmin)
        {
            if (geaenderteFelder.Contains(nameof(BenutzerRolle.Name)))
            {
                return BadRequest(new { fehler = "Die System-Administrator-Rolle kann nicht umbenannt werden." });
            }
            if (geaenderteFelder.Contains(nameof(BenutzerRolle.Aktiv)))
            {
                return BadRequest(new { fehler = "Die System-Administrator-Rolle kann nicht deaktiviert werden." });
            }
            if (geaenderteFelder.Contains(nameof(BenutzerRolle.IstSystemAdmin)))
            {
                return BadRequest(new { fehler = "Das System-Administrator-Kennzeichen kann nicht geändert werden." });
            }
        }

        // Das IstSystemAdmin-Flag kann generell nicht per API gesetzt werden.
        if (geaenderteFelder.Contains(nameof(BenutzerRolle.IstSystemAdmin)) && !eintrag.IstSystemAdmin)
        {
            return BadRequest(new { fehler = "Das System-Administrator-Kennzeichen kann nicht über die API vergeben werden." });
        }

        var alterName = eintrag.Name;
        delta.Patch(eintrag);
        eintrag.Name = eintrag.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(eintrag.Name))
        {
            return BadRequest(new { fehler = "Der Name der Benutzerrolle darf nicht leer sein." });
        }

        // DB-02-Fix: Eine Umbenennung liess Users.Role und RolePermissions.Role
        // bisher unverändert stehen (beide referenzierten den Namen als reinen
        // String, ohne Verknüpfung zur Benutzerrolle) - Mitgliedschaft und
        // Berechtigungen liefen dadurch auf den alten, nicht mehr existierenden
        // Namen ins Leere. Beide Tabellen werden jetzt über die stabile RoleId
        // (nicht per Namensvergleich) gefunden und in derselben Transaktion
        // auf den neuen Namen nachgezogen - alles oder nichts, damit bei einem
        // Fehler nie ein inkonsistenter Zwischenzustand (Namen bereits
        // nachgezogen, Umbenennung selbst aber nicht gespeichert) entstehen kann.
        if (eintrag.Name != alterName)
        {
            await using var transaktion = await _db.Database.BeginTransactionAsync();
            await _db.Users
                .Where(u => u.RoleId == eintrag.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.Role, eintrag.Name));
            await _db.RolePermissions
                .Where(p => p.RoleId == eintrag.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.Role, eintrag.Name));
            await _db.SaveChangesAsync();
            await transaktion.CommitAsync();
            return Updated(eintrag);
        }

        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    // HINWEIS: Benutzerrollen werden zur Wahrung der Datenintegrität NICHT
    // gelöscht (sie können von Benutzern referenziert sein). Statt eines DELETE
    // wird eine Rolle über PATCH { "aktiv": false } inaktiv gesetzt (Soft-Delete).
    [HttpDelete]
    [Authorize(Policy = Permissions.UserManage)]
    public IActionResult Delete([FromRoute] Guid key)
        => StatusCode(StatusCodes.Status405MethodNotAllowed,
            "Benutzerrollen können nicht gelöscht, sondern nur inaktiv gesetzt werden (PATCH aktiv=false).");
}
