namespace BandSpirit.Api.Models;

/// <summary>Ein Arbeitspaket, das aus einer Spannung/einem Treiber entsteht.</summary>
public class SpannungWorkItem : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugehörigen Treibers.</summary>
    public Guid DriverId { get; set; }

    /// <summary>Zugehöriger Treiber (Navigation).</summary>
    public S3Driver? Driver { get; set; }

    /// <summary>Titel des Arbeitspakets.</summary>
    public string Titel { get; set; } = string.Empty;

    /// <summary>Status des Arbeitspakets.</summary>
    public string Status { get; set; } = "OFFEN";
}
