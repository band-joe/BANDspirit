namespace BandSpirit.Api.Models;

/// <summary>Ein Treiber/Spannung (Driver) innerhalb eines Kreises.</summary>
public class S3Driver : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugehörigen Kreises.</summary>
    public Guid CircleId { get; set; }

    /// <summary>Zugehöriger Kreis (Navigation).</summary>
    public S3Circle? Circle { get; set; }

    /// <summary>Titel des Treibers.</summary>
    public string Titel { get; set; } = string.Empty;

    /// <summary>Beschreibung.</summary>
    public string? Beschreibung { get; set; }

    /// <summary>Getroffener Entscheid.</summary>
    public string? Entscheid { get; set; }

    /// <summary>Datum des Entscheids.</summary>
    public DateTime? EntscheidDatum { get; set; }

    /// <summary>Zugehörige Arbeitspakete (Navigation).</summary>
    public List<SpannungWorkItem> WorkItems { get; set; } = new();
}
