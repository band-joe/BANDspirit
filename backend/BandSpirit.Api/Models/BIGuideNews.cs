namespace BandSpirit.Api.Models;

/// <summary>Eine News-/Guide-Meldung.</summary>
public class BIGuideNews : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Titel der Meldung.</summary>
    public string Titel { get; set; } = string.Empty;

    /// <summary>Inhalt der Meldung.</summary>
    public string? Inhalt { get; set; }

    /// <summary>Kategorie der Meldung (z. B. Allgemein, Prozesse, Schulung).</summary>
    public string? Kategorie { get; set; }

    /// <summary>Gibt an, ob die Meldung wichtig ist.</summary>
    public bool Wichtig { get; set; }
}
