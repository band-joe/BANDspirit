namespace BandSpirit.Api.Models;

/// <summary>Ein Tagesordnungspunkt eines Meetings.</summary>
public class S3MeetingAgendaItem : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugehörigen Meetings.</summary>
    public Guid MeetingId { get; set; }

    /// <summary>Zugehöriges Meeting (Navigation).</summary>
    public S3Meeting? Meeting { get; set; }

    /// <summary>Titel des Tagesordnungspunkts.</summary>
    public string Titel { get; set; } = string.Empty;

    /// <summary>Beschreibung.</summary>
    public string? Beschreibung { get; set; }

    /// <summary>Sortierreihenfolge.</summary>
    public int SortOrder { get; set; }
}
