using System.Security.Claims;
using BandSpirit.Api.DTOs;
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
/// OData-Controller für Support-Tickets. Unterstützt Create, Read und Update
/// (kein Delete). Route: /odata/SupportTickets
/// </summary>
/// <remarks>
/// UI-11-Fix: Exponiert <see cref="SupportTicketDto"/> statt der rohen
/// <see cref="SupportTicket"/>-Entität, damit ErstellerName (per Join aus
/// Users) mitgeliefert werden kann, ohne die volle User-Entität (Passwort-
/// Hash!) über $expand zugänglich zu machen.
/// </remarks>
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

    private IQueryable<SupportTicketDto> Projektion() => _db.SupportTickets
        .Select(t => new SupportTicketDto
        {
            Id = t.Id,
            Titel = t.Titel,
            Beschreibung = t.Beschreibung,
            Status = t.Status,
            Prioritaet = t.Prioritaet,
            Kategorie = t.Kategorie,
            Antwort = t.Antwort,
            ErstellerId = t.ErstellerId,
            ErstellerName = t.Ersteller != null ? t.Ersteller.Name : null,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt,
        });

    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.TicketRead)]
    public IQueryable<SupportTicketDto> Get() => Projektion();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.TicketRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await Projektion().FirstOrDefaultAsync(t => t.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.TicketCreate)]
    public async Task<IActionResult> Post([FromBody] SupportTicketDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var eintrag = new SupportTicket
        {
            Titel = dto.Titel,
            Beschreibung = dto.Beschreibung,
            Status = string.IsNullOrEmpty(dto.Status) ? "OFFEN" : dto.Status,
            Prioritaet = string.IsNullOrEmpty(dto.Prioritaet) ? "MITTEL" : dto.Prioritaet,
            Kategorie = dto.Kategorie,
        };

        // Ersteller immer serverseitig aus dem Token setzen (nie aus dem Request-Body).
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        eintrag.ErstellerId = Guid.TryParse(currentUserId, out var uid) ? uid : null;

        _db.SupportTickets.Add(eintrag);
        await _db.SaveChangesAsync();
        await _notificationService.SendSupportTicketCreatedAsync(eintrag.Titel, eintrag.ErstellerId?.ToString() ?? "");

        var erstellerName = eintrag.ErstellerId.HasValue
            ? await _db.Users.AsNoTracking().Where(u => u.Id == eintrag.ErstellerId).Select(u => u.Name).FirstOrDefaultAsync()
            : null;

        return Created(new SupportTicketDto
        {
            Id = eintrag.Id,
            Titel = eintrag.Titel,
            Beschreibung = eintrag.Beschreibung,
            Status = eintrag.Status,
            Prioritaet = eintrag.Prioritaet,
            Kategorie = eintrag.Kategorie,
            Antwort = eintrag.Antwort,
            ErstellerId = eintrag.ErstellerId,
            ErstellerName = erstellerName,
            CreatedAt = eintrag.CreatedAt,
            UpdatedAt = eintrag.UpdatedAt,
        });
    }

    /// <summary>
    /// PATCH /odata/SupportTickets({id}) – Aktualisiert Titel/Beschreibung/Status/
    /// Priorität/Kategorie/Antwort. Id, ErstellerId/-Name und Audit-Felder sind
    /// über PATCH bewusst nicht änderbar.
    /// </summary>
    [HttpPatch]
    [Authorize(Policy = Permissions.TicketUpdate)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<SupportTicketDto> delta)
    {
        var eintrag = await _db.SupportTickets.FirstOrDefaultAsync(t => t.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }

        foreach (var propName in delta.GetChangedPropertyNames())
        {
            if (!delta.TryGetPropertyValue(propName, out var value))
            {
                continue;
            }

            switch (propName)
            {
                case nameof(SupportTicketDto.Titel):
                    eintrag.Titel = (string)value!;
                    break;
                case nameof(SupportTicketDto.Beschreibung):
                    eintrag.Beschreibung = (string?)value;
                    break;
                case nameof(SupportTicketDto.Status):
                    eintrag.Status = (string)value!;
                    break;
                case nameof(SupportTicketDto.Prioritaet):
                    eintrag.Prioritaet = (string)value!;
                    break;
                case nameof(SupportTicketDto.Kategorie):
                    eintrag.Kategorie = (string?)value;
                    break;
                case nameof(SupportTicketDto.Antwort):
                    eintrag.Antwort = (string?)value;
                    break;
                    // Id, ErstellerId, ErstellerName, CreatedAt, UpdatedAt: bewusst ignoriert.
            }
        }

        await _db.SaveChangesAsync();

        var erstellerName = eintrag.ErstellerId.HasValue
            ? await _db.Users.AsNoTracking().Where(u => u.Id == eintrag.ErstellerId).Select(u => u.Name).FirstOrDefaultAsync()
            : null;

        return Updated(new SupportTicketDto
        {
            Id = eintrag.Id,
            Titel = eintrag.Titel,
            Beschreibung = eintrag.Beschreibung,
            Status = eintrag.Status,
            Prioritaet = eintrag.Prioritaet,
            Kategorie = eintrag.Kategorie,
            Antwort = eintrag.Antwort,
            ErstellerId = eintrag.ErstellerId,
            ErstellerName = erstellerName,
            CreatedAt = eintrag.CreatedAt,
            UpdatedAt = eintrag.UpdatedAt,
        });
    }
}
