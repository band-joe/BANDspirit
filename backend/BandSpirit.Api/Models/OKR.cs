namespace BandSpirit.Api.Models;

/// <summary>Ein Objective (OKR).</summary>
public class OKR : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Titel des Objectives.</summary>
    public string Titel { get; set; } = string.Empty;

    /// <summary>Beschreibung.</summary>
    public string? Beschreibung { get; set; }

    /// <summary>Status.</summary>
    public string Status { get; set; } = "AKTIV";

    /// <summary>Fortschritt in Prozent (0–100).</summary>
    public int Fortschritt { get; set; }

    /// <summary>Priorität.</summary>
    public string? Prioritaet { get; set; }

    /// <summary>Kategorie.</summary>
    public string? Kategorie { get; set; }

    /// <summary>Fälligkeitsdatum.</summary>
    public DateTime? Faelligkeit { get; set; }

    /// <summary>ID der verantwortlichen Person (User.Id).</summary>
    public Guid? VerantwortlicherUserId { get; set; }

    /// <summary>ID des OKR-Zyklus (optional).</summary>
    public Guid? ZyklusId { get; set; }

    /// <summary>Zugehöriger OKR-Zyklus (Navigation, optional).</summary>
    public OkrZyklus? Zyklus { get; set; }

    /// <summary>
    /// ID des zugehörigen Kreises (optional). Ist der Wert null, gilt das Objective
    /// organisationsweit und ist für alle Benutzer sichtbar.
    /// </summary>
    public Guid? CircleId { get; set; }

    /// <summary>Zugehöriger Kreis (Navigation, optional).</summary>
    public S3Circle? Circle { get; set; }

    /// <summary>Zugehörige Key Results (Navigation).</summary>
    public List<KeyResult> KeyResults { get; set; } = new();
}
