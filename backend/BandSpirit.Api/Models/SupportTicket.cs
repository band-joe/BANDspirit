namespace BandSpirit.Api.Models;

/// <summary>Ein Support-Ticket.</summary>
public class SupportTicket : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Titel des Tickets.</summary>
    public string Titel { get; set; } = string.Empty;

    /// <summary>Beschreibung des Anliegens.</summary>
    public string? Beschreibung { get; set; }

    /// <summary>Status: OFFEN / IN_BEARBEITUNG / ERLEDIGT.</summary>
    public string Status { get; set; } = "OFFEN";

    /// <summary>Priorität: NIEDRIG / MITTEL / HOCH / DRINGEND.</summary>
    public string Prioritaet { get; set; } = "MITTEL";

    /// <summary>ID des Erstellers.</summary>
    public string? ErstellerId { get; set; }
}
