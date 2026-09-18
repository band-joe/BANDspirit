namespace BandSpirit.Api.Models;

/// <summary>Ein Key Result zu einem OKR.</summary>
public class KeyResult : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugehörigen OKR.</summary>
    public Guid OkrId { get; set; }

    /// <summary>Zugehöriges OKR (Navigation).</summary>
    public OKR? Okr { get; set; }

    /// <summary>Titel des Key Results.</summary>
    public string Titel { get; set; } = string.Empty;

    /// <summary>Startwert.</summary>
    public double StartWert { get; set; }

    /// <summary>Zielwert.</summary>
    public double ZielWert { get; set; }

    /// <summary>Aktueller Istwert.</summary>
    public double IstWert { get; set; }

    /// <summary>Einheit der Messung.</summary>
    public string? Einheit { get; set; }

    /// <summary>Fälligkeitsdatum.</summary>
    public DateTime? Faelligkeit { get; set; }

    /// <summary>Status des Key Results: NICHT_GESTARTET / IN_ARBEIT / ERFUELLT.</summary>
    public string Status { get; set; } = "NICHT_GESTARTET";
}
