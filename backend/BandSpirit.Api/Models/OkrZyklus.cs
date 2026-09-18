namespace BandSpirit.Api.Models;

/// <summary>Ein OKR-Planungszyklus (z. B. Q1 2027, H1 2027).</summary>
public class OkrZyklus : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Bezeichnung des Zyklus (z. B. „Q1 2027").</summary>
    public string Titel { get; set; } = string.Empty;

    /// <summary>Startdatum des Zyklus.</summary>
    public DateTime StartDatum { get; set; }

    /// <summary>Enddatum des Zyklus.</summary>
    public DateTime EndDatum { get; set; }

    /// <summary>Gibt an, ob der Zyklus aktuell aktiv ist.</summary>
    public bool Aktiv { get; set; }
}
