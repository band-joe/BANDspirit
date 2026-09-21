namespace BandSpirit.Api.Models;

/// <summary>Verknüpfung einer Rolle mit einer Berechtigung (RBAC).</summary>
public class RolePermission : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Rolle (z. B. "Admin"). Bleibt die von RbacService gelesene Quelle -
    /// DB-02-Fix: Referenzstabilität kommt von <see cref="RoleId"/> (feste FK
    /// zu <see cref="BenutzerRolle"/>); eine Umbenennung aktualisiert diesen
    /// String transaktional über RoleId nach.
    /// </summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>
    /// DB-02-Fix: Feste, umbenennungssichere Referenz auf die Benutzerrolle.
    /// Kann bei Altdaten vorübergehend null sein, bis die Backfill-Migration
    /// bzw. ein erneutes Speichern sie auflöst.
    /// </summary>
    public Guid? RoleId { get; set; }

    /// <summary>Berechtigungs-String (z. B. "user:read").</summary>
    public string Permission { get; set; } = string.Empty;
}
