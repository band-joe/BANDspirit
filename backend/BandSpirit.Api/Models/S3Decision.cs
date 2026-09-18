namespace BandSpirit.Api.Models;

/// <summary>Eine getroffene Entscheidung zu einem Antrag.</summary>
public class S3Decision : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugehörigen Antrags.</summary>
    public Guid ProposalId { get; set; }

    /// <summary>Zugehöriger Antrag (Navigation).</summary>
    public S3Proposal? Proposal { get; set; }

    /// <summary>Beschreibung der Entscheidung.</summary>
    public string? Beschreibung { get; set; }

    /// <summary>Datum der Entscheidung.</summary>
    public DateTime EntscheidDatum { get; set; }
}
