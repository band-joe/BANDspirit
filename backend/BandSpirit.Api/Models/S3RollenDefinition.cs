namespace BandSpirit.Api.Models;

/// <summary>Definition einer Rolle innerhalb der soziokratischen Struktur.</summary>
public class S3RollenDefinition : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Name der Rollendefinition.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Beschreibung der Rolle.</summary>
    public string? Beschreibung { get; set; }

    /// <summary>Zweck der Rolle (optional).</summary>
    public string? Zweck { get; set; }

    /// <summary>Domäne der Rolle (optional).</summary>
    public string? Domaene { get; set; }

    /// <summary>Verantwortlichkeit der Rolle als Freitext (optional).</summary>
    public string? Verantwortlichkeit { get; set; }

    /// <summary>Gibt an, ob es sich um eine Lead-Link-Rolle handelt.</summary>
    public bool IsLeadLink { get; set; }

    /// <summary>
    /// APP-17-Fix: Gibt explizit an, ob dieser Rollendefinition mehrere Personen
    /// gleichzeitig zugewiesen sein dürfen (z. B. "Mitglied"). Vorher wurde dies
    /// implizit über einen Namensvergleich auf "Mitglied" in RolesController.Assign
    /// abgeleitet - eine Umbenennung dieser Definition hätte die Kardinalitäts-
    /// regel unbeabsichtigt geändert. Mit diesem Feld ist die Regel unabhängig
    /// vom (änderbaren) Anzeigenamen.
    /// </summary>
    public bool ErlaubtMehrfachbesetzung { get; set; }

    /// <summary>
    /// Gibt an, ob die Rollendefinition aktiv ist. Rollendefinitionen werden
    /// niemals gelöscht, sondern zur Wahrung der Datenintegrität nur inaktiv
    /// gesetzt (Soft-Delete).
    /// </summary>
    public bool Aktiv { get; set; } = true;

    /// <summary>Sortierreihenfolge für die Anzeige (aufsteigend).</summary>
    public int SortOrder { get; set; }
}
