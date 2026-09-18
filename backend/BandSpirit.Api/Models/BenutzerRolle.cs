using System.ComponentModel.DataAnnotations;

namespace BandSpirit.Api.Models;

/// <summary>
/// Eine Applikations-Benutzerrolle (z. B. "Admin", "User").
///
/// Diese Entität ersetzt das frühere <c>UserRole</c>-Enum und wird unter
/// Einstellungen → Benutzerrollen gepflegt. <see cref="User.Role"/> referenziert
/// eine Benutzerrolle über deren <see cref="Name"/>. Die Verknüpfung von Rolle zu
/// Berechtigungen (RBAC, Tabelle RolePermission) erfolgt ebenfalls über den Namen.
///
/// WICHTIG: Dies ist KEINE soziokratische S3-Rolle (siehe
/// <see cref="S3RollenDefinition"/>), sondern eine reine Rolle zur Administration
/// bzw. Bedienung der Applikation.
/// </summary>
public class BenutzerRolle : AuditableEntity
{
    /// <summary>Eindeutige ID der Benutzerrolle.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Eindeutiger Name der Rolle (z. B. "Admin"). Dient als Referenzschlüssel.</summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>Beschreibung der Rolle.</summary>
    public string? Beschreibung { get; set; }

    /// <summary>
    /// Kennzeichnet die System-Administrator-Rolle. Rollen mit diesem Flag haben
    /// Vollzugriff auf die Applikationsverwaltung. Standardmäßig false.
    /// </summary>
    public bool IstSystemAdmin { get; set; }

    /// <summary>Gibt an, ob die Rolle aktiv (auswählbar) ist. Standard: true.</summary>
    public bool Aktiv { get; set; } = true;

    /// <summary>Sortierreihenfolge in Auswahllisten.</summary>
    public int SortOrder { get; set; }
}
