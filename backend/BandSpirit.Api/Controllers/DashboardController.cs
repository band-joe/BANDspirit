using System.Security.Claims;
using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>REST-Controller für aggregierte Dashboard-Kennzahlen. Route: /api/dashboard</summary>
[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly BandSpiritDbContext _db;

    public DashboardController(BandSpiritDbContext db) => _db = db;

    /// <summary>
    /// GET /api/dashboard – Liefert aggregierte Kennzahlen sowie die für das
    /// Dashboard benötigten wichtigen BI-Guide-Nachrichten und die Kreise mit
    /// Review-Bedarf. Das Antwortformat entspricht exakt der vom Frontend
    /// erwarteten Struktur:
    /// { stats: { totalUsers, activeUsers, totalCircles, activeCircles,
    ///            totalDrivers, offeneDrivers, totalTickets, offeneTickets },
    ///   wichtigeNews: [ { id, titel, inhalt, kategorie, wichtig, createdAt,
    ///                     createdBy: { name } } ],
    ///   circlesNeedingReview: [ { id, name, lifecyclePhase, nextReviewDate } ] }.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = Permissions.DashboardRead)]
    public async Task<IActionResult> Get()
    {
        // Kennzahlen (Struktur "stats" wie vom Frontend erwartet).
        var stats = new
        {
            totalUsers = await _db.Users.CountAsync(),
            activeUsers = await _db.Users.CountAsync(u => u.Aktiv),
            totalCircles = await _db.S3Circles.CountAsync(),
            activeCircles = await _db.S3Circles.CountAsync(c => c.IsActive),
            totalDrivers = await _db.S3Drivers.CountAsync(),
            offeneDrivers = await _db.S3Drivers.CountAsync(d => d.Entscheid == null || d.Entscheid == ""),
            totalTickets = await _db.SupportTickets.CountAsync(),
            offeneTickets = await _db.SupportTickets.CountAsync(t => t.Status == "OFFEN")
        };

        // Benutzer-Namen zur Auflösung von CreatedById (Audit-Feld ist ein
        // string, es gibt keine Navigation zum Benutzer).
        var benutzerNamen = (await _db.Users
                .Select(u => new { u.Id, u.Name })
                .ToListAsync())
            .ToDictionary(u => u.Id.ToString(), u => u.Name);

        string? NameFuer(string? id) =>
            id != null && benutzerNamen.TryGetValue(id, out var n) ? n : null;

        object MapNews(BandSpirit.Api.Models.BIGuideNews n) => new
        {
            id = n.Id,
            titel = n.Titel,
            inhalt = n.Inhalt,
            kategorie = n.Kategorie,
            wichtig = n.Wichtig,
            createdAt = n.CreatedAt,
            createdBy = new { name = NameFuer(n.CreatedById) }
        };

        // Als "wichtig" markierte BI-Guide-Informationen (max. 5).
        var wichtigeNews = (await _db.BIGuideNews
                .Where(n => n.Wichtig)
                .OrderByDescending(n => n.CreatedAt)
                .Take(5)
                .ToListAsync())
            .Select(MapNews)
            .ToList();

        // Aktive Kreise mit fälligem oder fehlendem Review-Datum.
        var now = DateTime.UtcNow;
        var circlesNeedingReview = (await _db.S3Circles
                .Where(c => c.IsActive && (c.NextReviewDate == null || c.NextReviewDate <= now))
                .OrderBy(c => c.NextReviewDate)
                .Take(10)
                .ToListAsync())
            .Select(c => new
            {
                id = c.Id,
                name = c.Name,
                lifecyclePhase = c.LifecyclePhase,
                nextReviewDate = c.NextReviewDate
            })
            .ToList();

        return Ok(new { stats, wichtigeNews, circlesNeedingReview });
    }
}

/// <summary>REST-Controller für die Organisations-Hierarchie. Route: /api/org</summary>
[ApiController]
[Route("api/org")]
[Authorize]
public class OrgGraphController : ControllerBase
{
    private readonly BandSpiritDbContext _db;

    public OrgGraphController(BandSpiritDbContext db) => _db = db;

    /// <summary>
    /// GET /api/org/graph – Liefert die Kreis-Hierarchie inkl. Rollen und
    /// Besetzungen im Format, das das Frontend-Organigramm erwartet
    /// (Kreismodell nach Vorbild von talkspirit: verschachtelte Kreise mit
    /// Rollen). Antwort: { circles: [ { id, name, purpose, parentId,
    /// roles: [ { id, name, isCoordinator, isRepresentative, isFacilitator,
    /// isLeadLink, assignments: [ { user: { id, name } } ] } ] } ] }.
    /// </summary>
    [HttpGet("graph")]
    [Authorize(Policy = Permissions.CircleRead)]
    public async Task<IActionResult> Graph()
    {
        // Nur Kreise anzeigen, die kein Enddatum haben oder deren Enddatum >= heute ist
        var heuteUtc = new DateTimeOffset(DateTime.UtcNow.Date, TimeSpan.Zero);
        
        // Kreise laden (flache Liste – die Hierarchie ergibt sich im Frontend
        // über parentId). Kreise mit DateTo < heute werden ausgeschlossen.
        var kreise = await _db.S3Circles
            .Where(c => !c.DateTo.HasValue || c.DateTo.Value >= heuteUtc)
            .Select(c => new { c.Id, c.Name, c.Zweck, c.ParentId })
            .ToListAsync();

        // Rollen inkl. Definition (für Name/Lead-Link) und Besetzungen laden.
        var rollen = await _db.S3Roles
            .Include(r => r.RollenDefinition)
            .Include(r => r.Assignments)
                .ThenInclude(a => a.User)
            .ToListAsync();

        // Kreise mit ihren Rollen zusammenführen.
        var circles = kreise.Select(c => new
        {
            id = c.Id,
            name = c.Name,
            purpose = c.Zweck,
            parentId = c.ParentId,
            roles = rollen
                .Where(r => r.CircleId == c.Id)
                .OrderBy(r => r.RollenDefinition != null ? r.RollenDefinition.SortOrder : 0)
                .ThenBy(r => r.RollenDefinition != null ? r.RollenDefinition.Name : string.Empty)
                .Select(r => new
                {
                    id = r.Id,
                    name = r.RollenDefinition != null ? r.RollenDefinition.Name : "Rolle",
                    isCoordinator = r.IsCoordinator,
                    isRepresentative = r.IsRepresentative,
                    isFacilitator = r.IsFacilitator,
                    isLeadLink = r.RollenDefinition != null && r.RollenDefinition.IsLeadLink,
                    assignments = r.Assignments
                        .Where(a => a.User != null)
                        .Select(a => new { user = new { id = a.UserId, name = a.User!.Name, email = a.User!.Email, telefon = a.User!.Telefon } })
                        .ToList()
                })
                .ToList(),
            // Für die Baumdarstellung nicht zwingend nötig; leere Listen halten
            // das erwartete Antwortformat stabil.
            parentLinks = new List<object>(),
            childLinks = new List<object>()
        }).ToList();

        return Ok(new { circles });
    }
}

/// <summary>REST-Controller für die eigenen Berechtigungen. Route: /api/rollen</summary>
[ApiController]
[Route("api/rollen")]
[Authorize]
public class MeineRollenController : ControllerBase
{
    private readonly RbacService _rbacService;

    public MeineRollenController(RbacService rbacService) => _rbacService = rbacService;

    /// <summary>GET /api/rollen/meine – Liefert die Berechtigungen des aktuellen Benutzers.</summary>
    [HttpGet("meine")]
    public async Task<IActionResult> Meine()
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role");
        if (string.IsNullOrEmpty(role))
        {
            return Ok(new { role = (string?)null, permissions = Array.Empty<string>() });
        }
        var permissions = await _rbacService.GetPermissionsForRoleAsync(role);
        return Ok(new { role, permissions });
    }
}
