namespace BandSpirit.Api.Models;

/// <summary>Ein soziokratischer Kreis (S3 Circle).</summary>
public class S3Circle : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Name des Kreises.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Zweck des Kreises.</summary>
    public string? Zweck { get; set; }

    /// <summary>Verantwortlichkeit / "Verantwortlich für" des Kreises als Freitext (optional).</summary>
    public string? Verantwortlichkeit { get; set; }

    /// <summary>ID des übergeordneten Kreises (Selbstreferenz, optional).</summary>
    public Guid? ParentId { get; set; }

    /// <summary>Übergeordneter Kreis (Navigation).</summary>
    public S3Circle? Parent { get; set; }

    /// <summary>
    /// ID des obersten Kreises (Wurzel) der Hierarchie (Selbstreferenz).
    /// Ein Wurzelkreis verweist auf sich selbst; Subkreise verweisen stets auf
    /// den obersten Kreis ihres Baums. Zusammen mit <see cref="ParentId"/> lässt
    /// sich damit die gesamte Kreis-Hierarchie ermitteln.
    /// </summary>
    public Guid? RootId { get; set; }

    /// <summary>Gibt an, ob der Kreis aktiv ist.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Lebenszyklus-Phase des Kreises.</summary>
    public string? LifecyclePhase { get; set; }

    /// <summary>Datum des letzten Reviews.</summary>
    public DateTime? LastReviewDate { get; set; }

    /// <summary>Datum des nächsten Reviews.</summary>
    public DateTime? NextReviewDate { get; set; }
}
