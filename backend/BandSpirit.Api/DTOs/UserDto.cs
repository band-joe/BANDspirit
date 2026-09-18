using System.ComponentModel.DataAnnotations;

namespace BandSpirit.Api.DTOs;

/// <summary>
/// DTO für Benutzer-Daten (OHNE Passwort-Hash).
/// SEC-M4: Verwendet in UsersController, um sicherzustellen, dass
/// der BCrypt-Hash niemals über die API ausgeliefert wird, selbst
/// wenn ein Angreifer $select=Password in OData-Queries nutzt.
/// </summary>
/// <remarks>
/// APP-22 (P005): Validierungsattribute ergänzt (Required, EmailAddress, MaxLength),
/// um ungültige Eingaben an der API-Grenze abzulehnen.
/// </remarks>
public class UserDto
{
    public Guid Id { get; set; }
    
    [Required(ErrorMessage = "Name ist erforderlich.")]
    [MaxLength(100, ErrorMessage = "Name darf maximal 100 Zeichen lang sein.")]
    public string Name { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "E-Mail ist erforderlich.")]
    [EmailAddress(ErrorMessage = "Ungültige E-Mail-Adresse.")]
    [MaxLength(150, ErrorMessage = "E-Mail darf maximal 150 Zeichen lang sein.")]
    public string Email { get; set; } = string.Empty;
    
    [Required(ErrorMessage = "Rolle ist erforderlich.")]
    public string Role { get; set; } = string.Empty;
    
    public bool Aktiv { get; set; }
    public string? AbacusPersonalnummer { get; set; }
    public string? PortraetPfad { get; set; }
    public string? Telefon { get; set; }

    /// <summary>
    /// Klartext-Passwort – NUR beim Anlegen (POST) bzw. Ändern (PATCH) als Eingabe.
    /// SEC-M4: Wird in den GET-Handlern NIEMALS befüllt (die Projektion setzt dieses
    /// Feld nicht), daher ist es in allen Lese-Responses immer null. Ein Abruf via
    /// $select=Password liefert somit ebenfalls nur null – der BCrypt-Hash bleibt
    /// geheim. Das Feld existiert im EDM-Modell nur, damit OData den beim Anlegen/
    /// Ändern gesendeten Passwort-Wert nicht als "undeklarierte Eigenschaft" mit
    /// 400 Bad Request ablehnt.
    /// </summary>
    public string? Password { get; set; }
    
    // Audit-Felder (von AuditableEntity)
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? CreatedById { get; set; }
    public string? ChangedById { get; set; }

    /// <summary>
    /// UI-31: Optimistic-Locking-Token (RowVersion).
    /// Wird vom Frontend beim PATCH mitgeschickt, um Lost-Update-Konflikte zu erkennen.
    /// </summary>
    public byte[]? RowVersion { get; set; }
}
