namespace BandSpirit.Api.Models;

/// <summary>Definition einer Kennzahl (KPI).</summary>
public class KpiDefinition : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Name der Kennzahl.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Beschreibung.</summary>
    public string? Beschreibung { get; set; }

    /// <summary>Einheit.</summary>
    public string? Einheit { get; set; }

    /// <summary>Warnschwelle.</summary>
    public double? Warnschwelle { get; set; }

    /// <summary>Kritische Schwelle.</summary>
    public double? KritischeSchwelle { get; set; }

    /// <summary>Messintervall (z. B. "MONATLICH").</summary>
    public string? Messintervall { get; set; }

    /// <summary>Kategorie der Kennzahl (z.B. Finanzen, Qualität, Prozesse, Kunden, Personal).</summary>
    public string? Kategorie { get; set; }

    /// <summary>Datenquelle (z.B. ERP, CRM, API, manuell).</summary>
    public string? Datenquelle { get; set; }

    /// <summary>ID der verantwortlichen Person (User.Id).</summary>
    public Guid? VerantwortlicherUserId { get; set; }

    /// <summary>Zielwert der Kennzahl.</summary>
    public double? Zielwert { get; set; }

    /// <summary>Richtung der Kennzahl: HOEHER_BESSER / NIEDRIGER_BESSER / ZIELBAND.</summary>
    public string? Richtung { get; set; }

    /// <summary>
    /// ID des zugehörigen Kreises (optional). Ist der Wert null, gilt die Kennzahl
    /// organisationsweit und ist für alle Benutzer sichtbar.
    /// </summary>
    public Guid? CircleId { get; set; }

    /// <summary>Zugehöriger Kreis (Navigation, optional).</summary>
    public S3Circle? Circle { get; set; }

    /// <summary>Zugehörige Messungen (Navigation).</summary>
    public List<KpiMeasurement> Measurements { get; set; } = new();
}
