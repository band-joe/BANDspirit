namespace BandSpirit.Api.Models;

/// <summary>
/// Standard-Lebenszyklus-Phasen eines Kreises. Diese Aufzählung dient als
/// Quelle für die initiale Befüllung der Entität <see cref="S3LebenszyklusPhase"/>.
/// Die eigentlichen Phasen werden anschließend als eigene Entität in den
/// Einstellungen gepflegt.
/// </summary>
public enum LebenszyklusPhaseTyp
{
    Entwurf = 0,
    Aktiv = 1,
    InReview = 2,
    Ruhend = 3,
    Aufgeloest = 4
}

/// <summary>
/// Definition einer Lebenszyklus-Phase (Stammdaten). Wird aus der Aufzählung
/// <see cref="LebenszyklusPhaseTyp"/> vorbefüllt und in den Einstellungen
/// gepflegt. Kreise wählen ihre aktuelle Phase aus dieser Entität aus.
/// </summary>
public class S3LebenszyklusPhase : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Anzeigename der Phase, z. B. "Aktiv".</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Optionale Beschreibung der Phase.</summary>
    public string? Beschreibung { get; set; }

    /// <summary>Sortierreihenfolge für die Anzeige (aufsteigend).</summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Gibt an, ob die Phase aktiv/auswählbar ist. Phasen werden nicht gelöscht,
    /// sondern zur Wahrung der Datenintegrität nur inaktiv gesetzt (Soft-Delete).
    /// </summary>
    public bool Aktiv { get; set; } = true;
}
