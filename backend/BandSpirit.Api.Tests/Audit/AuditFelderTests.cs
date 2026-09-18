using System.Security.Claims;
using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace BandSpirit.Api.Tests.Audit;

/// <summary>
/// Tests für die automatische Versorgung und den Manipulationsschutz der
/// Audit-Felder (CreatedAt/UpdatedAt/CreatedById/ChangedById) im DbContext.
/// Diese Logik greift für ALLE Entitäten, die von <see cref="AuditableEntity"/>
/// erben, unabhängig vom aufrufenden (OData-)Controller.
/// </summary>
public class AuditFelderTests : IDisposable
{
    private const string AngemeldeteBenutzerId = "11111111-1111-1111-1111-111111111111";
    private readonly BandSpiritDbContext _db;

    public AuditFelderTests()
    {
        var options = new DbContextOptionsBuilder<BandSpiritDbContext>()
            .UseInMemoryDatabase($"AuditTestDb_{Guid.NewGuid()}")
            .Options;

        // IHttpContextAccessor mit angemeldetem Benutzer simulieren (= API-Aufruf).
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, AngemeldeteBenutzerId) };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        var httpContext = new DefaultHttpContext { User = principal };
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns(httpContext);

        _db = new BandSpiritDbContext(options, accessor.Object);
    }

    [Fact]
    public async Task Anlegen_SetztAuditFelderAutomatischAufAngemeldetenBenutzer()
    {
        // Arrange
        var kreis = new S3Circle { Name = "Testkreis" };

        // Act
        _db.S3Circles.Add(kreis);
        await _db.SaveChangesAsync();

        // Assert
        kreis.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(30));
        kreis.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(30));
        kreis.CreatedById.Should().Be(AngemeldeteBenutzerId);
        kreis.ChangedById.Should().Be(AngemeldeteBenutzerId);
    }

    [Fact]
    public async Task Anlegen_IgnoriertVomClientMitgeschicktenCreatedById()
    {
        // Arrange – ein Client versucht, den Ersteller zu fälschen.
        var kreis = new S3Circle { Name = "Manipuliert", CreatedById = "gefälschter-benutzer" };

        // Act
        _db.S3Circles.Add(kreis);
        await _db.SaveChangesAsync();

        // Assert – der serverseitig ermittelte Benutzer gewinnt.
        kreis.CreatedById.Should().Be(AngemeldeteBenutzerId);
    }

    [Fact]
    public async Task Aendern_SetztUpdatedFelder_BewahrtCreatedFelder()
    {
        // Arrange – Datensatz anlegen und ursprüngliche Audit-Werte merken.
        var kreis = new S3Circle { Name = "Original" };
        _db.S3Circles.Add(kreis);
        await _db.SaveChangesAsync();
        var ursprungCreatedAt = kreis.CreatedAt;
        var ursprungCreatedById = kreis.CreatedById;

        // Act – Datensatz ändern und dabei die Created-Felder zu fälschen versuchen.
        kreis.Name = "Geändert";
        kreis.CreatedAt = DateTime.UtcNow.AddYears(-5);
        kreis.CreatedById = "gefälschter-benutzer";
        await _db.SaveChangesAsync();

        // Assert – Created-Felder unverändert, Updated-Felder neu gesetzt.
        kreis.CreatedAt.Should().Be(ursprungCreatedAt);
        kreis.CreatedById.Should().Be(ursprungCreatedById);
        kreis.ChangedById.Should().Be(AngemeldeteBenutzerId);
        kreis.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(30));
    }

    public void Dispose()
    {
        _db.Dispose();
        GC.SuppressFinalize(this);
    }
}
