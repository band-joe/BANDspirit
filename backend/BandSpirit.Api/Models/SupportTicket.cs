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

    /// <summary>Optionale Kategorie zur Einordnung des Anliegens.</summary>
    public string? Kategorie { get; set; }

    /// <summary>Antwort des Supports an den Ersteller (optional).</summary>
    public string? Antwort { get; set; }

    /// <summary>
    /// ID des Erstellers. UI-11-Fix: War zuvor ein loser string ohne Fremdschlüssel
    /// (DB-01); jetzt Guid mit FK auf Users. SetNull beim Löschen des Benutzers,
    /// damit historische Tickets erhalten bleiben.
    /// </summary>
    public Guid? ErstellerId { get; set; }

    /// <summary>
    /// Navigation zum Ersteller - NUR für serverseitige Projektion auf
    /// SupportTicketDto.ErstellerName genutzt. Wird bewusst NICHT über OData
    /// exponiert (SupportTicketDto ist die registrierte EntitySet, nicht diese
    /// Entität), damit niemals die volle User-Entität (inkl. Passwort-Hash)
    /// über $expand an dieser Stelle mitgeliefert werden kann.
    /// </summary>
    public User? Ersteller { get; set; }
}
