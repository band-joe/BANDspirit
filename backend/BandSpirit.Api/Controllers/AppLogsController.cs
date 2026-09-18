using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>OData-Controller für Audit-Logs (nur lesend). Route: /odata/AppLogs</summary>
[Authorize]
public class AppLogsController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public AppLogsController(BandSpiritDbContext db) => _db = db;

    /// <summary>GET /odata/AppLogs – Liste der Audit-Logs (absteigend nach Zeit).</summary>
    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.AppLogRead)]
    public IQueryable<AppLog> Get() => _db.AppLogs.OrderByDescending(a => a.CreatedAt).AsQueryable();

    /// <summary>GET /odata/AppLogs({id}) – Einzelnen Log-Eintrag abrufen.</summary>
    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.AppLogRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.AppLogs.FirstOrDefaultAsync(a => a.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }
}
