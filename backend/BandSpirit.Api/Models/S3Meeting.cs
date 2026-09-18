namespace BandSpirit.Api.Models;

/// <summary>Ein Meeting eines Kreises.</summary>
public class S3Meeting : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugehörigen Kreises.</summary>
    public Guid CircleId { get; set; }

    /// <summary>Zugehöriger Kreis (Navigation).</summary>
    public S3Circle? Circle { get; set; }

    /// <summary>Meeting-Typ: GOVERNANCE oder OPERATIONAL.</summary>
    public string Typ { get; set; } = "GOVERNANCE";

    /// <summary>Status des Meetings.</summary>
    public string Status { get; set; } = "GEPLANT";

    /// <summary>Geplanter Zeitpunkt (UTC).</summary>
    public DateTime? ScheduledAt { get; set; }

    /// <summary>Titel des Meetings.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Tagesordnungspunkte (Navigation).</summary>
    public List<S3MeetingAgendaItem> AgendaItems { get; set; } = new();
}
