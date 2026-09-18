namespace BandSpirit.Api.Models;

/// <summary>
/// Historien-Eintrag zum Lebenszyklus eines Kreises. Jeder Wechsel der
/// Lebenszyklus-Phase eines Kreises wird als eigener Eintrag mit
/// <see cref="StartDatum"/> festgehalten. Die aktuelle Phase eines Kreises ist
/// der Eintrag mit dem jüngsten <see cref="StartDatum"/>. Aus diesen Einträgen
/// ergibt sich die auf der Kreis-Seite angezeigte Historie.
/// </summary>
public class S3CircleLebenszyklus : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugehörigen Kreises.</summary>
    public Guid S3CircleId { get; set; }

    /// <summary>Kreis (Navigation).</summary>
    public S3Circle? S3Circle { get; set; }

    /// <summary>ID der Lebenszyklus-Phase (Stammdaten).</summary>
    public Guid LebenszyklusPhaseId { get; set; }

    /// <summary>Lebenszyklus-Phase (Navigation).</summary>
    public S3LebenszyklusPhase? LebenszyklusPhase { get; set; }

    /// <summary>
    /// Startdatum, ab dem der Kreis sich in dieser Phase befindet. Pflichtfeld –
    /// jeder Lebenszyklus-Eintrag muss ein Startdatum besitzen.
    /// </summary>
    public DateTime StartDatum { get; set; }

    /// <summary>Optionale Bemerkung zum Phasenwechsel.</summary>
    public string? Bemerkung { get; set; }
}
