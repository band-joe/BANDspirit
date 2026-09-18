namespace BandSpirit.Api.Models;

/// <summary>Audit-Log-Eintrag für Systemaktionen.</summary>
public class AppLog : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Modul, in dem die Aktion stattfand.</summary>
    public string Modul { get; set; } = string.Empty;

    /// <summary>Ausgeführte Aktion (z. B. "CREATE").</summary>
    public string Aktion { get; set; } = string.Empty;

    /// <summary>ID der betroffenen Entität.</summary>
    public string? EntityId { get; set; }

    /// <summary>Name/Bezeichnung der betroffenen Entität.</summary>
    public string? EntityName { get; set; }

    /// <summary>ID des ausführenden Benutzers.</summary>
    public string? UserId { get; set; }

    /// <summary>Name des ausführenden Benutzers.</summary>
    public string? UserName { get; set; }

    /// <summary>Zusätzliche Details (JSON oder Text).</summary>
    public string? Details { get; set; }

    /// <summary>IP-Adresse des Aufrufers.</summary>
    public string? Ip { get; set; }
}
