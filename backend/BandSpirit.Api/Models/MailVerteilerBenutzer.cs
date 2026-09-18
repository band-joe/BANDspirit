namespace BandSpirit.Api.Models;

/// <summary>
/// Zuordnung eines Benutzers zu einem Mail-Verteiler der Variante "Individuell".
/// Der Empfänger wird ausschliesslich über die Benutzer-ID (<see cref="UserId"/>)
/// geführt; Name und E-Mail-Adresse stammen live aus dem Benutzerstamm.
/// </summary>
public class MailVerteilerBenutzer : AuditableEntity
{
    /// <summary>Eindeutige ID der Zuordnung.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Verteiler, zu dem diese Zuordnung gehört.</summary>
    public Guid MailVerteilerId { get; set; }

    /// <summary>Navigationsproperty zum Verteiler.</summary>
    public MailVerteiler? MailVerteiler { get; set; }

    /// <summary>Benutzer aus der Benutzerverwaltung.</summary>
    public Guid UserId { get; set; }

    /// <summary>Navigationsproperty zum Benutzer.</summary>
    public User? User { get; set; }
}
