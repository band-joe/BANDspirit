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
/// OData-Controller für Kreise (S3Circle) – dient als Vorlage für alle weiteren
/// OData-Controller. Unterstützt $filter, $expand, $orderby, $select, $count.
/// Route: /odata/Circles
/// </summary>
[Authorize]
public class CirclesController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public CirclesController(BandSpiritDbContext db) => _db = db;

    /// <summary>GET /odata/Circles – Liste mit OData-Query-Optionen.</summary>
    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.CircleRead)]
    public IQueryable<S3Circle> Get()
    {
        return _db.S3Circles.AsQueryable();
    }

    /// <summary>GET /odata/Circles({id}) – Einzelnen Kreis abrufen.</summary>
    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.CircleRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.S3Circles.FirstOrDefaultAsync(c => c.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    /// <summary>POST /odata/Circles – Neuen Kreis anlegen.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.CircleCreate)]
    public async Task<IActionResult> Post([FromBody] S3Circle eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        // RootId (oberster Kreis der Hierarchie) automatisch ermitteln:
        //  - Wurzelkreis (ohne ParentId) verweist auf sich selbst
        //  - Subkreis übernimmt die RootId seines übergeordneten Kreises
        eintrag.RootId = await ResolveRootIdAsync(eintrag.ParentId, eintrag.Id);

        _db.S3Circles.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    /// <summary>PATCH /odata/Circles({id}) – Kreis teilweise aktualisieren.</summary>
    /// <remarks>
    /// APP-09-Fix: ParentId-Änderungen sind über dieses generische PATCH NICHT
    /// erlaubt. Der Zyklus-Check und die rekursive RootId-Aktualisierung aller
    /// Nachfahren leben ausschliesslich in <see cref="CircleHierarchyController"/>
    /// (Anhaengen/Loesen). Dieses PATCH aktualisierte zuvor nur die RootId des
    /// bearbeiteten Kreises selbst, liess Zyklen zu und liess Nachfahren mit
    /// einer veralteten RootId zurück.
    /// </remarks>
    [HttpPatch]
    [Authorize(Policy = Permissions.CircleUpdate)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<S3Circle> delta)
    {
        if (delta.GetChangedPropertyNames().Contains(nameof(S3Circle.ParentId)))
        {
            return BadRequest(new
            {
                fehler = "Die übergeordnete Zuordnung (ParentId) kann über dieses PATCH nicht geändert werden. " +
                         "Bitte POST /api/circles/{id}/anhaengen bzw. /api/circles/{id}/loesen verwenden."
            });
        }

        var eintrag = await _db.S3Circles.FirstOrDefaultAsync(c => c.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    /// <summary>
    /// DELETE /odata/Circles({id}) – bewusst deaktiviert.
    /// DB-15: Kreise dürfen nicht hart gelöscht werden - das würde stillschweigend
    /// über alle Rollen, Zuweisungen, Meetings, Anträge und Spannungen des Kreises
    /// kaskadieren und bestehende AppLog-Einträge ins Leere laufen lassen. Analog zu
    /// BenutzerRollenController.Delete: PATCH isActive=false verwenden.
    /// </summary>
    [HttpDelete]
    [Authorize(Policy = Permissions.CircleDelete)]
    public IActionResult Delete([FromRoute] Guid key)
        => StatusCode(StatusCodes.Status405MethodNotAllowed,
            "Kreise können nicht gelöscht, sondern nur inaktiv gesetzt werden (PATCH isActive=false).");

    /// <summary>
    /// Ermittelt die RootId (obersten Kreis der Hierarchie) für einen Kreis.
    /// Ein Wurzelkreis (ohne <paramref name="parentId"/>) verweist auf sich selbst
    /// (<paramref name="ownId"/>). Ein Subkreis übernimmt die RootId seines
    /// übergeordneten Kreises; besitzt dieser (noch) keine, wird dessen Id verwendet.
    /// </summary>
    private async Task<Guid> ResolveRootIdAsync(Guid? parentId, Guid ownId)
    {
        if (parentId is null || parentId.Value == Guid.Empty)
        {
            return ownId;
        }

        var parent = await _db.S3Circles
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == parentId.Value);

        // Fällt der Elternkreis weg, gilt der Kreis selbst als Wurzel.
        return parent?.RootId ?? parent?.Id ?? ownId;
    }
}
