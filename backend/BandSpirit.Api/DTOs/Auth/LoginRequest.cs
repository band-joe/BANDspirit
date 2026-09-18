using System.ComponentModel.DataAnnotations;

namespace BandSpirit.Api.DTOs.Auth;

/// <summary>Anfrage zur Anmeldung mit E-Mail und Passwort.</summary>
public class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

/// <summary>Anfrage zum Austausch eines Entra-ID-Tokens gegen ein C#-JWT.</summary>
public class EntraCallbackRequest
{
    [Required]
    public string IdToken { get; set; } = string.Empty;
}

/// <summary>Anfrage zur Registrierung eines neuen Benutzers.</summary>
public class SignupRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string Password { get; set; } = string.Empty;

    /// <summary>Rolle (optional, Standard: User).</summary>
    public string? Role { get; set; }
}
