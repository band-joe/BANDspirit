using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BandSpirit.Api.Infrastructure.Config;
using BandSpirit.Api.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace BandSpirit.Api.Services;

/// <summary>
/// Erstellt signierte JWTs für authentifizierte Benutzer.
/// CC-M4: Nutzt typisierte IOptions&lt;JwtOptions&gt; statt direktem IConfiguration-Zugriff.
/// Payload: sub, email, name, role, jti, exp.
/// </summary>
public class JwtTokenService
{
    private readonly JwtOptions _jwtOptions;

    public JwtTokenService(IOptions<JwtOptions> jwtOptions)
    {
        _jwtOptions = jwtOptions.Value;
    }

    /// <summary>Erstellt ein JWT für den angegebenen Benutzer.</summary>
    public string CreateToken(User user)
    {
        if (string.IsNullOrEmpty(_jwtOptions.Secret))
        {
            throw new InvalidOperationException("Jwt:Secret ist nicht konfiguriert.");
        }

        var schluessel = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.Secret));
        var credentials = new SigningCredentials(schluessel, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            // SEC-M6: Eindeutige Token-ID (jti) – Grundlage für die Sperrliste (Revocation).
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("name", user.Name),
            new(ClaimTypes.Name, user.Name),
            new("role", user.Role),
            new(ClaimTypes.Role, user.Role),
            new(ClaimTypes.NameIdentifier, user.Id.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwtOptions.ExpiresInMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
