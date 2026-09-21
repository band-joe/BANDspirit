namespace BandSpirit.Api.Models;

/// <summary>Eine Version des BI-Kompass-Dokuments.</summary>
public class BIKompassVersion : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Titel der Version.</summary>
    public string Titel { get; set; } = string.Empty;

    /// <summary>Inhalt (Markdown/HTML).</summary>
    public string? Inhalt { get; set; }

    /// <summary>
    /// UI-26-Fix: Versionsnummer im Anzeigeformat "V1.2" (string). War zuvor
    /// int, während das Frontend beim Veröffentlichen immer schon einen
    /// String im Format "V{Major}.{Minor}" sendete (Model-Binding-Fehler bei
    /// jedem Veröffentlichen-Versuch) und diesen zur Ermittlung der nächsten
    /// Version auch per Regex parst.
    /// </summary>
    public string Version { get; set; } = "V1.0";

    /// <summary>
    /// UI-26-Fix: Änderungsnotiz zu dieser Version. Frontend sammelte diesen
    /// Pflichtwert im Veröffentlichen-Dialog bereits, das Modell kannte ihn
    /// nicht - ging beim Anlegen stillschweigend verloren.
    /// </summary>
    public string? Aenderungen { get; set; }

    /// <summary>Gibt an, ob diese Version aktiv ist.</summary>
    public bool IsAktiv { get; set; }
}
