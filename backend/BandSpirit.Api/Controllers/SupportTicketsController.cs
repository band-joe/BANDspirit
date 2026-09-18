using System.Security.Claims;
using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using BandSpirit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Deltas;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>
/// OData-Controller für Support-Tickets (SupportTicket).
/// Unterstützt Create, Read und Update (kein Delete). Route: /odata/SupportTickets
/// </summary>
[Authorize]
public class SupportTicketsController : ODataController
{
    private readonly BandSpiritDbContext _db;
    private readonly NotificationService _notificationService;

    public SupportTicketsController(BandSpiritDbContext db, NotificationService notificationService)
    {
        _db = db;
        _notificationService = notificationService;
    }

    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.TicketRead)]
    public IQueryable<SupportTicket> Get() => _db.SupportTickets.AsQueryable();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.TicketRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.SupportTickets.FirstOrDefaultAsync(t => t.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.TicketCreate)]
    public async Task<IActionResult> Post([FromBody] SupportTicket eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        eintrag.ErstellerId ??= User.FindFirstValue(ClaimTypes.NameIdentifier);
        _db.SupportTickets.Add(eintrag);
        await _db.SaveChangesAsync();
        await _notificationService.SendSupportTicketCreatedAsync(eintrag.Titel, eintrag.ErstellerId ?? "");
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.TicketUpdate)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<SupportTicket> delta)
    {
        var eintrag = await _db.SupportTickets.FirstOrDefaultAsync(t => t.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }
}
