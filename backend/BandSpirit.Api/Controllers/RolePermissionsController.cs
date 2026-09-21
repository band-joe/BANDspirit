using BandSpirit.Api.Infrastructure.Auth;
using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using BandSpirit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BandSpirit.Api.Controllers;

/// <summary>
/// REST-Controller für die Berechtigungsverwaltung.
/// Route: /api/role-permissions
/// Ermöglicht das Abrufen und Speichern der Berechtigungen je Benutzerrolle.
/// Zugriff: Nur für System-Administratoren (IstSystemAdmin=true).
/// </summary>
[ApiController]
[Route("api/role-permissions")]
[Authorize]
public class RolePermissionsController : ControllerBase
{
    private readonly BandSpiritDbContext _db;
    private readonly RbacService _rbac;

    public RolePermissionsController(BandSpiritDbContext db, RbacService rbac)
    {
        _db = db;
        _rbac = rbac;
    }

    /// <summary>
    /// GET /api/role-permissions
    /// Liefert die Metadaten: alle verfügbaren Berechtigungen, Gruppen, Labels.
    /// </summary>
    [HttpGet]
    public IActionResult GetMetadata()
    {
        // Prüfen: Nur System-Admin darf Berechtigungen verwalten
        if (!IstSystemAdmin())
        {
            return Forbid();
        }

        return Ok(new
        {
            allPermissions = Permissions.All,
            permissionGroups = Permissions.Groups,
            permissionLabels = Permissions.Labels
        });
    }

    /// <summary>
    /// GET /api/role-permissions/{roleName}
    /// Liefert die aktuell zugewiesenen Berechtigungen für eine bestimmte Rolle.
    /// </summary>
    [HttpGet("{roleName}")]
    public async Task<IActionResult> GetRolePermissions(string roleName)
    {
        if (!IstSystemAdmin())
        {
            return Forbid();
        }

        // Prüfen, ob die Rolle existiert
        var rolle = await _db.BenutzerRollen.FirstOrDefaultAsync(r => r.Name == roleName);
        if (rolle == null)
        {
            return NotFound(new { error = $"Rolle '{roleName}' nicht gefunden." });
        }

        var permissions = await _db.RolePermissions
            .Where(rp => rp.Role == roleName)
            .Select(rp => rp.Permission)
            .ToListAsync();

        return Ok(new
        {
            role = roleName,
            permissions,
            istSystemAdmin = rolle.IstSystemAdmin
        });
    }

    /// <summary>
    /// PUT /api/role-permissions/{roleName}
    /// Speichert die Berechtigungen für eine bestimmte Rolle.
    /// Body: { "permissions": ["user:read", "user:create", ...] }
    /// </summary>
    [HttpPut("{roleName}")]
    public async Task<IActionResult> UpdateRolePermissions(string roleName, [FromBody] UpdateRolePermissionsRequest request)
    {
        if (!IstSystemAdmin())
        {
            return Forbid();
        }

        // Prüfen, ob die Rolle existiert
        var rolle = await _db.BenutzerRollen.FirstOrDefaultAsync(r => r.Name == roleName);
        if (rolle == null)
        {
            return NotFound(new { error = $"Rolle '{roleName}' nicht gefunden." });
        }

        // System-Admin-Rolle darf nicht bearbeitet werden
        if (rolle.IstSystemAdmin)
        {
            return BadRequest(new { error = "Die System-Administrator-Rolle kann nicht bearbeitet werden." });
        }

        // Prüfen, dass alle übergebenen Berechtigungen gültig sind
        var ungueltig = request.Permissions.Where(p => !Permissions.All.Contains(p)).ToList();
        if (ungueltig.Any())
        {
            return BadRequest(new { error = $"Ungültige Berechtigungen: {string.Join(", ", ungueltig)}" });
        }

        // Alle vorhandenen Einträge für diese Rolle löschen
        var vorhandene = await _db.RolePermissions.Where(rp => rp.Role == roleName).ToListAsync();
        _db.RolePermissions.RemoveRange(vorhandene);

        // Neue Einträge erstellen
        // DB-02-Fix: RoleId (stabile Referenz auf die bereits oben geladene
        // und validierte Benutzerrolle) zusätzlich zum Namen setzen.
        foreach (var permission in request.Permissions.Distinct())
        {
            _db.RolePermissions.Add(new RolePermission
            {
                Role = roleName,
                RoleId = rolle.Id,
                Permission = permission
            });
        }

        await _db.SaveChangesAsync();

        // Cache für diese Rolle leeren, damit die neue Berechtigung sofort greift
        _rbac.ClearCacheForRole(roleName);

        return Ok(new
        {
            role = roleName,
            permissions = request.Permissions.Distinct().ToList(),
            message = "Berechtigungen aktualisiert."
        });
    }

    /// <summary>Prüft, ob der aktuelle Benutzer System-Administrator ist.</summary>
    private bool IstSystemAdmin()
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId)) return false;

        // Benutzer laden und IstSystemAdmin-Flag der Rolle prüfen
        var user = _db.Users.FirstOrDefault(u => u.Id == userId);
        if (user == null) return false;

        var rolle = _db.BenutzerRollen.FirstOrDefault(r => r.Name == user.Role);
        return rolle?.IstSystemAdmin ?? false;
    }
}

/// <summary>Request-Body für PUT /api/role-permissions/{roleName}</summary>
public class UpdateRolePermissionsRequest
{
    public List<string> Permissions { get; set; } = new();
}
