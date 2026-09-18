namespace BandSpirit.Api.Models;

/// <summary>Ein Einwand (Objection) gegen einen Antrag.</summary>
public class S3Objection : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugehörigen Antrags.</summary>
    public Guid ProposalId { get; set; }

    /// <summary>Zugehöriger Antrag (Navigation).</summary>
    public S3Proposal? Proposal { get; set; }

    /// <summary>ID des einwendenden Benutzers.</summary>
    public Guid UserId { get; set; }

    /// <summary>Beschreibung des Einwands.</summary>
    public string? Beschreibung { get; set; }

    /// <summary>Status des Einwands.</summary>
    public string Status { get; set; } = "OFFEN";
}
