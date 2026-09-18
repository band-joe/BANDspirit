namespace BandSpirit.Api.Models;

/// <summary>
/// Basisklasse für alle nachverfolgbaren (auditierbaren) Entitäten.
/// Enthält Audit-Felder, die automatisch beim Speichern gesetzt werden.
/// </summary>
public abstract class AuditableEntity
{
    /// <summary>Zeitpunkt der Erstellung (UTC).</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>Zeitpunkt der letzten Änderung (UTC).</summary>
    public DateTime UpdatedAt { get; set; }

    /// <summary>ID des erstellenden Benutzers.</summary>
    public string? CreatedById { get; set; }

    /// <summary>ID des zuletzt ändernden Benutzers.</summary>
    public string? ChangedById { get; set; }

    /// <summary>Gültig-von-Datum (fachliche Gültigkeit). Als DateTimeOffset, damit OData-PATCH mit Edm.DateTimeOffset korrekt gebunden wird.</summary>
    public DateTimeOffset? DateFrom { get; set; }

    /// <summary>Gültig-bis-Datum (fachliche Gültigkeit). Als DateTimeOffset, damit OData-PATCH mit Edm.DateTimeOffset korrekt gebunden wird.</summary>
    public DateTimeOffset? DateTo { get; set; }
}
