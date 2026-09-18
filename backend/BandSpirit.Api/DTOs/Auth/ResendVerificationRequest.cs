using System.ComponentModel.DataAnnotations;

namespace BandSpirit.Api.DTOs.Auth;

/// <summary>K81: Anfrage zum erneuten Senden eines Verification-Links.</summary>
public class ResendVerificationRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
}
