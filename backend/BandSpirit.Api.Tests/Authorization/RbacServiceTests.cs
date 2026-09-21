using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using BandSpirit.Api.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace BandSpirit.Api.Tests.Authorization;

/// <summary>CC-M5: Tests für RBAC-Berechtigungsprüfung.</summary>
public class RbacServiceTests : IDisposable
{
    private readonly BandSpiritDbContext _db;
    private readonly RbacService _service;

    public RbacServiceTests()
    {
        var options = new DbContextOptionsBuilder<BandSpiritDbContext>()
            .UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}")
            .Options;

        _db = new BandSpiritDbContext(options, null!);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Rbac:CacheDurationSeconds"] = "5"
            })
            .Build();

        _service = new RbacService(_db, new MemoryCache(new MemoryCacheOptions()), config, NullLogger<RbacService>.Instance);
    }

    [Fact]
    public async Task HasPermissionAsync_UserWithPermission_ReturnsTrue()
    {
        // Arrange
        // APP-05-Fix (P005): GetPermissionsForRoleAsync liest DB-Berechtigungen nur
        // für eine bekannte, aktive BenutzerRolle - sonst greift der Fallback (fail-
        // closed für unbekannte Rollen). Ohne diesen Eintrag würde "Editor" als
        // unbekannt gelten und der schreibgeschützte Fallback (ohne "user:read")
        // zurückgegeben, wodurch der Test unabhängig vom geseedeten RolePermission
        // fehlschlägt.
        _db.BenutzerRollen.Add(new BenutzerRolle { Name = "Editor" });
        _db.RolePermissions.Add(new RolePermission
        {
            Role = "Editor",
            Permission = "user:read"
        });
        await _db.SaveChangesAsync();

        // Act
        var result = await _service.HasPermissionAsync("Editor", "user:read");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task HasPermissionAsync_UserWithoutPermission_ReturnsFalse()
    {
        // Arrange
        // Bekannte, aktive Rolle (siehe Kommentar im Test oben) - ohne diesen
        // Eintrag würde der Test zufällig über den Fallback-Pfad statt über die
        // eigentlich zu prüfende "bekannte Rolle ohne diese Berechtigung"-Logik
        // bestehen.
        _db.BenutzerRollen.Add(new BenutzerRolle { Name = "Viewer" });
        _db.RolePermissions.Add(new RolePermission
        {
            Role = "Viewer",
            Permission = "user:read"
        });
        await _db.SaveChangesAsync();

        // Act
        var result = await _service.HasPermissionAsync("Viewer", "user:delete");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task HasPermissionAsync_NoDbEntry_UsesFallback()
    {
        // Arrange: Admin ohne DB-Einträge

        // Act
        var result = await _service.HasPermissionAsync("Admin", "user:read");

        // Assert: Fallback gibt Admin alle Rechte
        result.Should().BeTrue();
    }

    public void Dispose()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
    }
}
