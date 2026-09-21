using System.ComponentModel.DataAnnotations;

namespace BandSpirit.Api.DTOs;

/// <summary>
/// DTO für Support-Tickets. UI-11-Fix: Flankiert <see cref="Models.SupportTicket"/>
/// um ein flaches <see cref="ErstellerName"/>-Feld (per serverseitigem Join),
/// damit das Frontend den Ersteller-Namen anzeigen kann, ohne die volle
/// User-Entität (inkl. Passwort-Hash) über $expand exponieren zu müssen.
/// </summary>
public class SupportTicketDto
{
    public Guid Id { get; set; }

    [Required(ErrorMessage = "Titel ist erforderlich.")]
    [MaxLength(200, ErrorMessage = "Titel darf maximal 200 Zeichen lang sein.")]
    public string Titel { get; set; } = string.Empty;

    public string? Beschreibung { get; set; }

    public string Status { get; set; } = "OFFEN";

    public string Prioritaet { get; set; } = "MITTEL";

    public string? Kategorie { get; set; }

    public string? Antwort { get; set; }

    public Guid? ErstellerId { get; set; }

    /// <summary>Anzeigename des Erstellers (nur lesend, serverseitig aus Users nachgeladen).</summary>
    public string? ErstellerName { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
