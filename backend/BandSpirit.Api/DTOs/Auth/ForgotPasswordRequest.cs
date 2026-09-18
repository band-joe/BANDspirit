using System.ComponentModel.DataAnnotations;

namespace BandSpirit.Api.DTOs.Auth;

/// <summary>Anfrage zum Anfordern eines Passwort-Reset-Links.</summary>
public class ForgotPasswordRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
}
