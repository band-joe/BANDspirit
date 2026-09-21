namespace BandSpirit.Api.Models;

/// <summary>Review-Protokoll eines Kreises.</summary>
public class S3CircleReview : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des überprüften Kreises.</summary>
    public Guid CircleId { get; set; }

    /// <summary>Zugehöriger Kreis (Navigation).</summary>
    public S3Circle? Circle { get; set; }

    /// <summary>Datum des Reviews.</summary>
    public DateTime ReviewDatum { get; set; }

    /// <summary>Protokolltext.</summary>
    public string? Protokoll { get; set; }

    /// <summary>Ergebnis des Reviews: WEITERFUEHREN / KONSOLIDIEREN / ARCHIVIEREN.</summary>
    public string? Ergebnis { get; set; }

    /// <summary>
    /// UI-30-Fix: Notizen/Begründung zum Review. Dieses Modell existierte
    /// bereits, hatte aber weder Controller noch OData-Registrierung - war
    /// über die API komplett unerreichbar.
    /// </summary>
    public string? Notizen { get; set; }

    /// <summary>Vereinbarte Massnahmen aus dem Review (optional).</summary>
    public string? Massnahmen { get; set; }
}
