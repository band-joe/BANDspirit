using System.ComponentModel.DataAnnotations;

namespace BandSpirit.Api.Models;

/// <summary>
/// Refresh-Token für verlängerte Benutzer-Sessions (APP-02).
/// Ermöglicht das Erneuern eines abgelaufenen Access-Tokens ohne erneute Anmeldung.
/// </summary>
/// <remarks>
/// SEC (APP-02): Refresh-Tokens haben ein eigenes Ablaufdatum (z. B. 7 Tage) und werden
/// in der Datenbank gespeichert. Beim Logout oder bei Deaktivierung des Benutzers wird
/// der Token aus der Datenbank gelöscht → kann nicht mehr verwendet werden.
/// Verhindert unbegrenzte Sessions (CWE-613 Insufficient Session Expiration).
/// </remarks>
public class RefreshToken
{
    /// <summary>Eindeutige ID des Refresh-Tokens.</summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Der Token-Wert (kryptografisch sicherer Zufallsstring).</summary>
    [Required]
    public string Token { get; set; } = string.Empty;

    /// <summary>ID des Benutzers, dem dieser Token gehört.</summary>
    [Required]
    public Guid UserId { get; set; }

    /// <summary>Zeitpunkt der Token-Erstellung.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Ablaufzeitpunkt des Tokens (z. B. CreatedAt + 7 Tage).</summary>
    [Required]
    public DateTime ExpiresAt { get; set; }

    /// <summary>Zeitpunkt der Token-Verwendung (für Single-Use-Tokens).</summary>
    public DateTime? UsedAt { get; set; }

    /// <summary>Zeitpunkt der Token-Sperrung (bei Logout oder Sicherheitsvorfall).</summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>Navigation zum zugehörigen Benutzer.</summary>
    public User? User { get; set; }

    /// <summary>Prüft, ob der Token noch gültig ist.</summary>
    public bool IsValid => UsedAt is null && RevokedAt is null && ExpiresAt > DateTime.UtcNow;
}
