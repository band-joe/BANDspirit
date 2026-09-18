namespace BandSpirit.Api.Models;

/// <summary>Ein FAQ-Eintrag.</summary>
public class FAQ : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Frage.</summary>
    public string Frage { get; set; } = string.Empty;

    /// <summary>Antwort.</summary>
    public string Antwort { get; set; } = string.Empty;

    /// <summary>Kategorie.</summary>
    public string? Kategorie { get; set; }

    /// <summary>Sortierreihenfolge.</summary>
    public int SortOrder { get; set; }

    /// <summary>Gibt an, ob der Eintrag aktiv ist.</summary>
    public bool IsActive { get; set; } = true;
}
