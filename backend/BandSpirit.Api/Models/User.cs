using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace BandSpirit.Api.Models;

/// <summary>
/// Namen der Standard-Benutzerrollen. Ersetzt das frühere <c>UserRole</c>-Enum.
/// Benutzerrollen werden jetzt als eigene Entität (<see cref="BenutzerRolle"/>)
/// geführt und unter Einstellungen → Benutzerrollen gepflegt. Diese Konstanten
/// dienen nur noch als bekannte Standardwerte (Seeding, Fallbacks).
/// </summary>
public static class BenutzerRollenNamen
{
    public const string Admin = "Admin";
    public const string User = "User";
}

/// <summary>Ein Systembenutzer.</summary>
public class User : AuditableEntity
{
    /// <summary>Eindeutige Benutzer-ID.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Voller Name des Benutzers.</summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>E-Mail-Adresse (eindeutig, dient als Login).</summary>
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    /// <summary>BCrypt-Hash des Passworts. Wird niemals ausgegeben.</summary>
    /// <remarks>SEC-M4: [JsonIgnore] verhindert Serialisierung in JSON-Responses.</remarks>
    [JsonIgnore]
    public string? Password { get; set; }

    /// <summary>
    /// Rolle des Benutzers (Name einer <see cref="BenutzerRolle"/>, z. B. "User").
    /// Wird weiterhin als String gespeichert und ist die von Autorisierung
    /// (JWT-Claim, RbacService, Policy-Checks, Frontend) gelesene Quelle -
    /// DB-02-Fix: Referenzstabilität kommt jetzt aber von <see cref="RoleId"/>
    /// (feste FK zu <see cref="BenutzerRolle"/>). Eine Umbenennung der
    /// Benutzerrolle aktualisiert diesen String transaktional über RoleId
    /// nach (siehe BenutzerRollenController.Patch), statt ihn stillschweigend
    /// veralten zu lassen.
    /// </summary>
    [Required]
    public string Role { get; set; } = BenutzerRollenNamen.User;

    /// <summary>
    /// DB-02-Fix: Feste, umbenennungssichere Referenz auf die Benutzerrolle.
    /// Kann bei Altdaten vorübergehend null sein, bis die Backfill-Migration
    /// bzw. ein erneutes Speichern sie auflöst; neue/aktualisierte Datensätze
    /// setzen sie serverseitig aus dem angegebenen Rollennamen.
    /// </summary>
    public Guid? RoleId { get; set; }

    /// <summary>Gibt an, ob der Benutzer aktiv ist.</summary>
    public bool Aktiv { get; set; } = true;

    /// <summary>Optionale Abacus-Personalnummer.</summary>
    public string? AbacusPersonalnummer { get; set; }

    /// <summary>
    /// S3-Schlüssel des Porträtfotos des Benutzers (optional). Wird im
    /// MA-Profil angezeigt und kann vom Benutzer selbst hochgeladen werden.
    /// </summary>
    public string? PortraetPfad { get; set; }

    /// <summary>Optionale Telefonnummer des Benutzers.</summary>
    public string? Telefon { get; set; }

    /// <summary>
    /// Normalisierte E-Mail-Adresse (DB-13: Trim + ToLowerInvariant).
    /// Wird automatisch beim Speichern aus <see cref="Email"/> berechnet.
    /// Dient zur eindeutigen Identifikation unabhängig von Groß-/Kleinschreibung.
    /// </summary>
    [Required]
    public string EmailCanonical { get; set; } = string.Empty;

    /// <summary>
    /// Optimistic-Locking-Token (UI-31: verhindert Lost-Update bei gleichzeitiger Bearbeitung).
    /// Wird automatisch von EF Core bei jedem UPDATE inkrementiert.
    /// </summary>
    /// <remarks>
    /// Bei einem PATCH-Request wird die aktuelle RowVersion mitgesendet. Wenn ein anderer
    /// Benutzer den Datensatz zwischenzeitlich geändert hat, schlägt SaveChanges mit
    /// DbUpdateConcurrencyException fehl → Frontend erhält 409 Conflict und kann reagieren.
    /// </remarks>
    [System.ComponentModel.DataAnnotations.Timestamp]
    public byte[]? RowVersion { get; set; }

    /// <summary>
    /// K81: Gibt an, ob die E-Mail-Adresse verifiziert wurde.
    /// Bei Signup wird EmailVerified = false gesetzt; erst nach Klick auf Bestätigungslink
    /// wird es auf true gesetzt. Login ist nur für verifizierte Benutzer möglich.
    /// </summary>
    public bool EmailVerified { get; set; } = false;

    /// <summary>
    /// K81: SHA256-Hash des E-Mail-Verification-Tokens (analog zu PasswordResetToken).
    /// Der Klartext-Token wird per E-Mail versendet, hier liegt nur der Hash.
    /// Null = keine offene Verification.
    /// </summary>
    [JsonIgnore]
    public string? VerificationToken { get; set; }

    /// <summary>
    /// K81: Ablaufzeitpunkt des Verification-Tokens (UTC).
    /// Standard: 24 Stunden nach Erstellung. Null = Token unbegrenzt gültig (nicht empfohlen).
    /// </summary>
    public DateTime? VerificationTokenExpiry { get; set; }
}
