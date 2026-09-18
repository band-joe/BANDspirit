using System.ComponentModel.DataAnnotations;

namespace BandSpirit.Api.DTOs.Auth;

/// <summary>Anfrage zum Zurücksetzen des Passworts mit einem gültigen Token.</summary>
public class ResetPasswordRequest
{
    [Required]
    public string Token { get; set; } = string.Empty;

    [Required, MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}
