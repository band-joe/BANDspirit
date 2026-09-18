namespace BandSpirit.Api.Models;

/// <summary>Generische Stammdaten (Schlüsselwert-Listen nach Kategorie).</summary>
public class Stammdaten : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Kategorie der Stammdaten (z. B. "Prioritaet").</summary>
    public string Kategorie { get; set; } = string.Empty;

    /// <summary>Technischer Code innerhalb der Kategorie.</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Anzeigewert.</summary>
    public string Wert { get; set; } = string.Empty;

    /// <summary>Sortierreihenfolge.</summary>
    public int SortOrder { get; set; }

    /// <summary>Gibt an, ob der Eintrag aktiv ist.</summary>
    public bool IsActive { get; set; } = true;
}
