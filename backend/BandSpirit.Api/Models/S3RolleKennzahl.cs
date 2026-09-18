namespace BandSpirit.Api.Models;

/// <summary>Eine Kennzahl (Metrik), die einer Rolle zugeordnet ist.</summary>
public class S3RolleKennzahl : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID der zugehörigen Rolleninstanz (optional, historisch – neue Einträge hängen an der Rollendefinition).</summary>
    public Guid? RoleId { get; set; }

    /// <summary>Zugehörige Rolleninstanz (Navigation).</summary>
    public S3Role? Role { get; set; }

    /// <summary>ID der zugehörigen Rollendefinition (Einstellungen → Rollen).</summary>
    public Guid? RollenDefinitionId { get; set; }

    /// <summary>Zugehörige Rollendefinition (Navigation).</summary>
    public S3RollenDefinition? RollenDefinition { get; set; }

    /// <summary>Bezeichnung der Kennzahl.</summary>
    public string Bezeichnung { get; set; } = string.Empty;

    /// <summary>Zielwert der Kennzahl (optional).</summary>
    public string? Zielwert { get; set; }

    /// <summary>Einheit der Kennzahl (optional).</summary>
    public string? Einheit { get; set; }

    /// <summary>Sortierreihenfolge für die Anzeige (aufsteigend).</summary>
    public int SortOrder { get; set; }
}
