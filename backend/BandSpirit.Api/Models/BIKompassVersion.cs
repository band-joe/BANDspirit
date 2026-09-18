namespace BandSpirit.Api.Models;

/// <summary>Eine Version des BI-Kompass-Dokuments.</summary>
public class BIKompassVersion : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Titel der Version.</summary>
    public string Titel { get; set; } = string.Empty;

    /// <summary>Inhalt (Markdown/HTML).</summary>
    public string? Inhalt { get; set; }

    /// <summary>Versionsnummer.</summary>
    public int Version { get; set; } = 1;

    /// <summary>Gibt an, ob diese Version aktiv ist.</summary>
    public bool IsAktiv { get; set; }
}
