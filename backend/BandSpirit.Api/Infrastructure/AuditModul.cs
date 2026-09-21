namespace BandSpirit.Api.Infrastructure;

/// <summary>
/// UI-19-Fix: Zentraler, stabiler Katalog der "Modul"-Werte für <see cref="Models.AppLog"/>.
/// Vorher leiteten zwei unabhängige Stellen unterschiedliche, inkonsistente Werte
/// ab (<c>BandSpiritDbContext.SaveChanges</c> per Switch auf C#-Typnamen -
/// teils mit Tippfehlern, die nie trafen -, <c>AuditMiddleware</c> per rohem
/// Request-Pfad), während das Frontend eine dritte, komplett unpassende
/// Werteliste (LOGIN/KLIENT/KONTAKT/BENUTZER) als Filter anbot. Beide
/// Schreibpfade nutzen jetzt diesen Katalog, damit der Filter im Frontend
/// tatsächlich zu den geschriebenen Werten passt.
/// </summary>
public static class AuditModul
{
    public const string Kreis = "Kreis";
    public const string S3Rolle = "S3Rolle";
    public const string Kpi = "KPI";
    public const string Okr = "OKR";
    public const string Benutzer = "Benutzer";
    public const string Stammdaten = "Stammdaten";
    public const string Meeting = "Meeting";
    public const string BiGuide = "BI-Guide";
    public const string Auth = "Auth";
    public const string System = "System";

    /// <summary>Alle bekannten Modul-Werte, z. B. für ein Filter-Dropdown im Frontend.</summary>
    public static readonly IReadOnlyList<string> Alle = new[]
    {
        Kreis, S3Rolle, Kpi, Okr, Benutzer, Stammdaten, Meeting, BiGuide, Auth, System,
    };

    /// <summary>
    /// Leitet das Modul aus dem C#-Entitätstyp-Namen ab (für Änderungen, die
    /// über <see cref="Infrastructure.Data.BandSpiritDbContext.SaveChangesAsync"/> geloggt werden).
    /// </summary>
    public static string VonEntityTypName(string typeName) => typeName switch
    {
        "S3Circle" => Kreis,
        "S3Role" or "S3PersonRoleAssignment" => S3Rolle,
        "KpiDefinition" or "KpiMeasurement" => Kpi,
        "OKR" or "KeyResult" or "OkrZyklus" => Okr,
        "User" => Benutzer,
        "S3RollenDefinition" or "Stammdaten" => Stammdaten,
        "S3Meeting" => Meeting,
        "BIGuideNews" or "BiGuideKategorie" => BiGuide,
        _ => System,
    };

    /// <summary>
    /// Leitet das Modul aus dem von <see cref="Middleware.AuditMiddleware.ExtrahiereEntitaet"/>
    /// ermittelten Ressourcen-/EntitySet-Namen ab (für Zugriffs-/Fehler-Events).
    /// Fällt auf <see cref="System"/> zurück, wenn nichts Passendes gefunden wird.
    /// </summary>
    public static string VonRessourcenName(string? ressource) => ressource?.ToLowerInvariant() switch
    {
        "circles" => Kreis,
        "roles" or "personroleassignments" => S3Rolle,
        "kpidefinitions" or "kpimeasurements" => Kpi,
        "okrs" or "keyresults" or "okrzyklen" => Okr,
        "users" => Benutzer,
        "s3rollendefinitionen" or "stammdaten" => Stammdaten,
        "meetings" => Meeting,
        "biguidenews" or "biguidekategorien" => BiGuide,
        "auth" => Auth,
        _ => System,
    };
}
