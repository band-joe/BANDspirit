namespace BandSpirit.Api.Models;

/// <summary>Ein Einwand (Objection) gegen einen Antrag.</summary>
public class S3Objection : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugehörigen Antrags.</summary>
    public Guid ProposalId { get; set; }

    /// <summary>Zugehöriger Antrag (Navigation).</summary>
    public S3Proposal? Proposal { get; set; }

    /// <summary>ID des einwendenden Benutzers.</summary>
    public Guid UserId { get; set; }

    /// <summary>Beschreibung des Einwands (Freitext, optional).</summary>
    public string? Beschreibung { get; set; }

    /// <summary>
    /// UI-28-Fix: Strukturierte "Reasoned Objection" nach S3 - das Formular
    /// erfasste diese drei Felder bereits (mit Mindestlängen-Hinweisen), das
    /// Modell hatte dafür nur ein einzelnes generisches Beschreibungsfeld.
    /// Beobachtung: die faktische Beobachtung, die zum Einwand führt.
    /// </summary>
    public string Observation { get; set; } = string.Empty;

    /// <summary>Konkretes Risiko/Schaden für Zweck oder Organisation.</summary>
    public string Risk { get; set; } = string.Empty;

    /// <summary>Bezug zu Domäne/Vereinbarung/Zweck.</summary>
    public string? DomainReference { get; set; }

    /// <summary>Status des Einwands.</summary>
    public string Status { get; set; } = "OFFEN";
}
