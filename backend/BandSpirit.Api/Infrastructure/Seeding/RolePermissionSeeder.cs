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

        // DB-02-Fix: Stabile RoleId je Rollenname auflösen (DataSeeder legt den
        // BenutzerRollen-Katalog inzwischen VOR diesem Seeder an, siehe
        // Program.cs). Bleibt null, falls die Katalogzeile ausnahmsweise fehlt -
        // RbacService liest weiterhin den Namen, das ist also kein Hard-Fail.
        var roleIdsByName = await db.BenutzerRollen
            .ToDictionaryAsync(r => r.Name, r => r.Id);

        foreach (var (role, permissions) in zuordnungen)
        {
            Guid? roleId = roleIdsByName.TryGetValue(role, out var gefundeneId) ? gefundeneId : null;
            foreach (var permission in permissions)
            {
                db.RolePermissions.Add(new RolePermission { Role = role, RoleId = roleId, Permission = permission });
            }
        }

        await db.SaveChangesAsync();
    }
}
