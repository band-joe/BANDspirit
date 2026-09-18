namespace BandSpirit.Api.Models;

/// <summary>Ein Antrag (Proposal) im Governance-Prozess.</summary>
public class S3Proposal : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugehörigen Kreises.</summary>
    public Guid CircleId { get; set; }

    /// <summary>Zugehöriger Kreis (Navigation).</summary>
    public S3Circle? Circle { get; set; }

    /// <summary>Optionale ID des zugehörigen Meetings.</summary>
    public Guid? MeetingId { get; set; }

    /// <summary>Titel des Antrags.</summary>
    public string Titel { get; set; } = string.Empty;

    /// <summary>Beschreibung des Antrags.</summary>
    public string? Beschreibung { get; set; }

    /// <summary>Status des Antrags.</summary>
    public string Status { get; set; } = "OFFEN";

    /// <summary>Gibt an, ob eine übergeordnete Genehmigung erforderlich ist.</summary>
    public bool RequiresParentApproval { get; set; }

    /// <summary>Einwände zu diesem Antrag (Navigation).</summary>
    public List<S3Objection> Objections { get; set; } = new();
}
