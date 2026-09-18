namespace BandSpirit.Api.DTOs.Auth;

/// <summary>Antwort nach erfolgreicher Anmeldung.</summary>
public class LoginResponse
{
    /// <summary>Das ausgestellte JWT (Bearer-Token).</summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// APP-02: Refresh-Token für verlängerte Sessions (gültig 7 Tage).
    /// Kann verwendet werden, um ein abgelaufenes Access-Token zu erneuern.
    /// </summary>
    public string RefreshToken { get; set; } = string.Empty;

    /// <summary>Benutzer-ID.</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>Voller Name des Benutzers.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>E-Mail-Adresse.</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Rolle des Benutzers.</summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>Ablaufzeitpunkt des Access-Tokens (UTC, ISO-8601).</summary>
    public DateTime ExpiresAt { get; set; }
}
