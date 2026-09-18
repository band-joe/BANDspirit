using System.ComponentModel.DataAnnotations;

namespace BandSpirit.Api.Models;

/// <summary>
/// Bekannte Typen (Varianten) eines Mail-Verteilers.
/// </summary>
public static class MailVerteilerTypen
{
    /// <summary>Alle Mitglieder eines bestimmten Kreises.</summary>
    public const string Kreis = "Kreis";

    /// <summary>Eine bestimmte Rolle über ALLE Kreise hinweg (z. B. alle Lead-Links).</summary>
    public const string Rolle = "Rolle";

    /// <summary>Frei zusammengestellte Empfänger aus der Benutzerverwaltung.</summary>
    public const string Individuell = "Individuell";
}

/// <summary>
/// Ein Mail-Verteiler (Verteilerliste). Es gibt drei Varianten (siehe <see cref="Typ"/>):
/// <list type="bullet">
///   <item>Kreis – alle Mitglieder eines Kreises (<see cref="S3CircleId"/>).</item>
///   <item>Rolle – eine Rollendefinition über alle Kreise hinweg (<see cref="S3RollenDefinitionId"/>).</item>
///   <item>Individuell – frei gewählte Benutzer (<see cref="Mitglieder"/>).</item>
/// </list>
/// Die E-Mail-Adressen der Empfänger stammen immer aus dem Benutzerstamm
/// (<see cref="User.Email"/>) und werden bei Anzeige/Export live aufgelöst.
/// Empfänger werden über die Benutzer-ID (<see cref="User.Id"/>) geführt.
/// </summary>
public class MailVerteiler : AuditableEntity
{
    /// <summary>Eindeutige ID des Verteilers.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Eindeutiger Name des Verteilers.</summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    /// <summary>Optionale Beschreibung.</summary>
    public string? Beschreibung { get; set; }

    /// <summary>
    /// Variante des Verteilers: "Kreis", "Rolle" oder "Individuell"
    /// (siehe <see cref="MailVerteilerTypen"/>).
    /// </summary>
    [Required]
    public string Typ { get; set; } = MailVerteilerTypen.Individuell;

    /// <summary>Bei Variante "Kreis": der gewählte Kreis.</summary>
    public Guid? S3CircleId { get; set; }

    /// <summary>Bei Variante "Rolle": die gewählte Rollendefinition (über alle Kreise).</summary>
    public Guid? S3RollenDefinitionId { get; set; }

    /// <summary>Bei Variante "Individuell": die zugeordneten Benutzer.</summary>
    public ICollection<MailVerteilerBenutzer> Mitglieder { get; set; } = new List<MailVerteilerBenutzer>();
}
