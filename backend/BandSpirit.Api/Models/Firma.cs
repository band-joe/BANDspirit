using System.ComponentModel.DataAnnotations.Schema;

namespace BandSpirit.Api.Models;

/// <summary>Firmen-Stammdaten (Singleton, Id = "singleton").</summary>
public class Firma : AuditableEntity
{
    /// <summary>Feste Singleton-ID.</summary>
    public string Id { get; set; } = "singleton";

    /// <summary>Name der Firma. (DB-Spalte bleibt "Name" für Rückwärtskompatibilität.)</summary>
    [Column("Name")]
    public string Firmenname { get; set; } = string.Empty;

    /// <summary>S3-Objekt-Schlüssel des Firmenlogos. (DB-Spalte bleibt "LogoUrl".)</summary>
    [Column("LogoUrl")]
    public string? LogoPath { get; set; }

    /// <summary>Strasse. (DB-Spalte bleibt "Adresse".)</summary>
    [Column("Adresse")]
    public string? Strasse { get; set; }

    /// <summary>Hausnummer.</summary>
    public string? Hausnummer { get; set; }

    /// <summary>Postleitzahl.</summary>
    public string? Plz { get; set; }

    /// <summary>Ort.</summary>
    public string? Ort { get; set; }

    /// <summary>Kontakt-E-Mail.</summary>
    public string? Email { get; set; }

    /// <summary>Telefonnummer.</summary>
    public string? Telefon { get; set; }

    /// <summary>Webseite.</summary>
    public string? Website { get; set; }

    /// <summary>Name der Anwendung (Branding).</summary>
    public string? AppName { get; set; }

    /// <summary>Versionsnummer der Anwendung (Anzeige).</summary>
    public string? Versionsnummer { get; set; }

    /// <summary>Ob das Logo öffentlich (ohne Authentifizierung) abrufbar ist.</summary>
    public bool LogoPublic { get; set; } = true;
}
