namespace BandSpirit.Api.Models;

/// <summary>Eine Messung zu einer Kennzahl (KPI).</summary>
public class KpiMeasurement : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID der zugehörigen KPI-Definition.</summary>
    public Guid KpiDefinitionId { get; set; }

    /// <summary>Zugehörige KPI-Definition (Navigation).</summary>
    public KpiDefinition? KpiDefinition { get; set; }

    /// <summary>Gemessener Istwert.</summary>
    public double IstWert { get; set; }

    /// <summary>Datum der Messung.</summary>
    public DateTime Messdatum { get; set; }

    /// <summary>Trend (z. B. "STEIGEND").</summary>
    public string? Trend { get; set; }

    /// <summary>Status: GRUEN / GELB / ROT.</summary>
    public string Status { get; set; } = "GRUEN";

    /// <summary>Kommentar zur Messung.</summary>
    public string? Kommentar { get; set; }

    /// <summary>Geplante Massnahme bei Abweichung.</summary>
    public string? Massnahme { get; set; }
}
