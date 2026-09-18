using BandSpirit.Api.Infrastructure.Auth;
using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BandSpirit.Api.Infrastructure.Seeding;

/// <summary>
/// Befüllt die Tabelle RolePermission mit den Standard-Berechtigungen pro Rolle.
/// </summary>
public static class RolePermissionSeeder
{
    public static async Task SeedAsync(BandSpiritDbContext db)
    {
        if (await db.RolePermissions.AnyAsync())
        {
            return; // Bereits befüllt.
        }

        var zuordnungen = new List<(string Role, IEnumerable<string> Permissions)>
        {
            // Admin erhält alle Berechtigungen.
            ("Admin", Permissions.All),

            // User – lesende Grundrechte.
            ("User", new[]
            {
                Permissions.CircleRead, Permissions.RoleRead, Permissions.MeetingRead,
                Permissions.DriverRead, Permissions.DashboardRead, Permissions.BiGuideRead,
                Permissions.FaqRead, Permissions.TicketCreate, Permissions.DocsRead,
                Permissions.KpiRead, Permissions.OkrRead
            })
        };

        foreach (var (role, permissions) in zuordnungen)
        {
            foreach (var permission in permissions)
            {
                db.RolePermissions.Add(new RolePermission { Role = role, Permission = permission });
            }
        }

        await db.SaveChangesAsync();
    }
}
