namespace BandSpirit.Api.Models;

/// <summary>Token zum Zurücksetzen des Passworts.</summary>
public class PasswordResetToken : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Eindeutiger Token-Wert.</summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>ID des zugehörigen Benutzers.</summary>
    public Guid UserId { get; set; }

    /// <summary>Ablaufzeitpunkt des Tokens (UTC).</summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>Zeitpunkt, zu dem der Token verwendet wurde (null = ungenutzt).</summary>
    public DateTime? UsedAt { get; set; }
}
