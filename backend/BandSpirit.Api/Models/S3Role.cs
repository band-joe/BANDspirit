namespace BandSpirit.Api.Models;

/// <summary>Eine konkrete Rolle innerhalb eines Kreises.</summary>
public class S3Role : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugehörigen Kreises.</summary>
    public Guid CircleId { get; set; }

    /// <summary>Zugehöriger Kreis (Navigation).</summary>
    public S3Circle? Circle { get; set; }

    /// <summary>ID der Rollendefinition.</summary>
    public Guid RollenDefinitionId { get; set; }

    /// <summary>Rollendefinition (Navigation).</summary>
    public S3RollenDefinition? RollenDefinition { get; set; }

    /// <summary>Gibt an, ob die Rolle Koordinator ist.</summary>
    public bool IsCoordinator { get; set; }

    /// <summary>Gibt an, ob die Rolle Repräsentant ist.</summary>
    public bool IsRepresentative { get; set; }

    /// <summary>Gibt an, ob die Rolle Facilitator ist.</summary>
    public bool IsFacilitator { get; set; }

    /// <summary>Zuweisungen von Personen zu dieser Rolle (Navigation).</summary>
    public ICollection<S3PersonRoleAssignment> Assignments { get; set; } = new List<S3PersonRoleAssignment>();

    /// <summary>Kennzahlen der Rolle (Navigation).</summary>
    public ICollection<S3RolleKennzahl> Kennzahlen { get; set; } = new List<S3RolleKennzahl>();

    /// <summary>Dokumente der Rolle (Navigation).</summary>
    public ICollection<S3RolleDokument> Dokumente { get; set; } = new List<S3RolleDokument>();
}
