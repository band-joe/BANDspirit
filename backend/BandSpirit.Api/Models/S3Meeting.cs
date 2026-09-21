namespace BandSpirit.Api.Models;

/// <summary>Ein Meeting eines Kreises.</summary>
public class S3Meeting : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugehörigen Kreises.</summary>
    public Guid CircleId { get; set; }

    /// <summary>Zugehöriger Kreis (Navigation).</summary>
    public S3Circle? Circle { get; set; }

    /// <summary>Meeting-Typ: GOVERNANCE oder OPERATIONAL.</summary>
    public string Typ { get; set; } = "GOVERNANCE";

    /// <summary>Status des Meetings.</summary>
    public string Status { get; set; } = "GEPLANT";

    /// <summary>Geplanter Zeitpunkt (UTC).</summary>
    public DateTime? ScheduledAt { get; set; }

    /// <summary>Titel des Meetings.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// UI-28-Fix: Notizen zum Meeting. Frontend sammelte diesen Wert im
    /// Erstellen-Formular bereits, das Modell kannte ihn nicht.
    /// </summary>
    public string? Notes { get; set; }

    /// <summary>UI-28-Fix: Tatsächlicher Start (gesetzt beim Statuswechsel auf LAUFEND).</summary>
    public DateTime? StartedAt { get; set; }

    /// <summary>UI-28-Fix: Tatsächliches Ende (gesetzt beim Statuswechsel auf ABGESCHLOSSEN).</summary>
    public DateTime? EndedAt { get; set; }

    /// <summary>Tagesordnungspunkte (Navigation).</summary>
    public List<S3MeetingAgendaItem> AgendaItems { get; set; } = new();

    /// <summary>
    /// UI-28-Fix: Anträge dieses Meetings (Navigation). Fehlte komplett -
    /// $expand=Proposals auf ein Meeting scheiterte dadurch immer mit einem
    /// OData-400-Fehler und liess die gesamte Meeting-Detailseite nie laden.
    /// </summary>
    public List<S3Proposal> Proposals { get; set; } = new();
}
