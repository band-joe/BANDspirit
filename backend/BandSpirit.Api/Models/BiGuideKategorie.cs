namespace BandSpirit.Api.Models;

/// <summary>Eine Kategorie für BI-Guide-Nachrichten.</summary>
public class BiGuideKategorie : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Anzeigename (z. B. Allgemein, Prozesse).</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>CSS-Klassen für den Badge (z. B. "bg-slate-100 text-slate-700 border-slate-200").</summary>
    public string? Farbe { get; set; }

    /// <summary>Sortierreihenfolge (aufsteigend).</summary>
    public int SortOrder { get; set; }

    /// <summary>Ob die Kategorie aktiv (sichtbar) ist.</summary>
    public bool Aktiv { get; set; } = true;
}
