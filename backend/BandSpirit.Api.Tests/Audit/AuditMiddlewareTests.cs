using BandSpirit.Api.Infrastructure.Middleware;
using FluentAssertions;
using Xunit;

namespace BandSpirit.Api.Tests.Audit;

/// <summary>CC-M5: Tests für Audit-Middleware (Entitätserkennung).</summary>
public class AuditMiddlewareTests
{
    [Theory]
    [InlineData("/odata/Users(3d0ef45a-1234-1234-1234-123456789abc)", "Users", "3d0ef45a-1234-1234-1234-123456789abc")]
    [InlineData("/odata/Circles(abc123)", "Circles", "abc123")]
    [InlineData("/api/profil/3d0ef45a-1234-1234-1234-123456789abc", "profil", "3d0ef45a-1234-1234-1234-123456789abc")]
    [InlineData("/api/circles/3d0ef45a-1234-1234-1234-123456789abc/members", "circles", "3d0ef45a-1234-1234-1234-123456789abc")]
    [InlineData("/api/health", "health", null)]
    public void ExtrahiereEntitaet_VariousPaths_ExtractsCorrectly(string pfad, string? expectedName, string? expectedId)
    {
        // Act
        var (actualName, actualId) = AuditMiddleware.ExtrahiereEntitaet(pfad);

        // Assert
        actualName.Should().Be(expectedName);
        actualId.Should().Be(expectedId);
    }
}
