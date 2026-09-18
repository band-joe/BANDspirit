using BandSpirit.Api.Infrastructure.Config;
using BandSpirit.Api.Models;
using BandSpirit.Api.Services;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Xunit;

namespace BandSpirit.Api.Tests.Auth;

/// <summary>CC-M5: Tests für JWT-Token-Erstellung.</summary>
public class JwtTokenServiceTests
{
    private readonly JwtTokenService _service;

    public JwtTokenServiceTests()
    {
        var options = Options.Create(new JwtOptions
        {
            Secret = "TestSecretMinimum32CharactersLongForHmacSha256Signature",
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            ExpiresInMinutes = 60
        });
        _service = new JwtTokenService(options);
    }

    [Fact]
    public void CreateToken_ValidUser_ReturnsNonEmptyToken()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = "Test User",
            Email = "test@example.com",
            Role = "User"
        };

        // Act
        var token = _service.CreateToken(user);

        // Assert
        token.Should().NotBeNullOrEmpty();
        token.Split('.').Should().HaveCount(3); // JWT hat 3 Teile (Header.Payload.Signature)
    }

    [Fact]
    public void CreateToken_WithoutSecret_ThrowsException()
    {
        // Arrange
        var optionsWithoutSecret = Options.Create(new JwtOptions
        {
            Secret = string.Empty,
            Issuer = "Test",
            Audience = "Test"
        });
        var service = new JwtTokenService(optionsWithoutSecret);
        var user = new User { Id = Guid.NewGuid(), Email = "test@test.com", Name = "Test", Role = "User" };

        // Act & Assert
        var act = () => service.CreateToken(user);
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Secret*");
    }
}
