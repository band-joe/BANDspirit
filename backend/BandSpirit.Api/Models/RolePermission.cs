namespace BandSpirit.Api.Models;

/// <summary>Verknüpfung einer Rolle mit einer Berechtigung (RBAC).</summary>
public class RolePermission : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Rolle (z. B. "Admin").</summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>Berechtigungs-String (z. B. "user:read").</summary>
    public string Permission { get; set; } = string.Empty;
}
