using System.ComponentModel.DataAnnotations;

namespace BandSpirit.Api.DTOs.Auth;

/// <summary>K81: Anfrage zur Email-Verification mit einem gültigen Token.</summary>
public class VerifyEmailRequest
{
    [Required]
    public string Token { get; set; } = string.Empty;
}
