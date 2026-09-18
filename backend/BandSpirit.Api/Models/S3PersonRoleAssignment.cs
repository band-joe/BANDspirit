namespace BandSpirit.Api.Models;

/// <summary>Zuweisung einer Person zu einer Rolle.</summary>
public class S3PersonRoleAssignment : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugewiesenen Benutzers.</summary>
    public Guid UserId { get; set; }

    /// <summary>Zugewiesener Benutzer (Navigation).</summary>
    public User? User { get; set; }

    /// <summary>ID der zugewiesenen Rolle.</summary>
    public Guid RoleId { get; set; }

    /// <summary>Zugewiesene Rolle (Navigation).</summary>
    public S3Role? Role { get; set; }
}
