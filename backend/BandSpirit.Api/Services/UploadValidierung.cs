namespace BandSpirit.Api.Services;

/// <summary>
/// SEC-AUDIT-02/07: Zentrale Allowlist-Prüfung für Datei-Uploads. Der vom Client
/// gesendete <c>IFormFile.ContentType</c> ist frei fälschbar und wurde bisher
/// ungeprüft übernommen und gespeichert - für öffentlich (anonym) ausgelieferte
/// Uploads wie das Firmenlogo genügt eine gefälschte Content-Type-Angabe
/// (z. B. "image/png" für eine tatsächliche HTML/SVG-Datei mit Skript-Inhalt),
/// um beim Abruf potenziell inline im Browser ausgeführt zu werden (Stored-XSS).
/// </summary>
public static class UploadValidierung
{
    private static readonly HashSet<string> ErlaubteBildTypen = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png", "image/jpeg", "image/webp"
    };

    private static readonly HashSet<string> ErlaubteDokumentTypen = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/png", "image/jpeg", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain"
    };

    /// <summary>
    /// Prüft ein Bild gegen die Allowlist UND die tatsächlichen Magic Bytes (nicht nur
    /// den angegebenen Content-Type). Für Uploads, die anschliessend ohne
    /// "Content-Disposition: attachment" (also potenziell inline) ausgeliefert werden.
    /// </summary>
    public static bool IstErlaubtesBild(string? angegebenerContentType, ReadOnlySpan<byte> kopf)
        => IstErlaubterBildContentType(angegebenerContentType) && ErkanntesBildformat(kopf) is not null;

    /// <summary>Prüft nur den Content-Type-String gegen die Bild-Allowlist (ohne Dateiinhalt) - für Defense-in-Depth beim Ausliefern bereits gespeicherter Dateien.</summary>
    public static bool IstErlaubterBildContentType(string? angegebenerContentType)
        => !string.IsNullOrWhiteSpace(angegebenerContentType) && ErlaubteBildTypen.Contains(angegebenerContentType);

    private static string? ErkanntesBildformat(ReadOnlySpan<byte> kopf)
    {
        if (kopf.Length >= 8 && kopf[0] == 0x89 && kopf[1] == 0x50 && kopf[2] == 0x4E && kopf[3] == 0x47)
        {
            return "image/png";
        }
        if (kopf.Length >= 3 && kopf[0] == 0xFF && kopf[1] == 0xD8 && kopf[2] == 0xFF)
        {
            return "image/jpeg";
        }
        if (kopf.Length >= 12 && kopf[0] == (byte)'R' && kopf[1] == (byte)'I' && kopf[2] == (byte)'F' && kopf[3] == (byte)'F'
            && kopf[8] == (byte)'W' && kopf[9] == (byte)'E' && kopf[10] == (byte)'B' && kopf[11] == (byte)'P')
        {
            return "image/webp";
        }
        return null;
    }

    /// <summary>
    /// Prüft ein allgemeines Dokument (Rollendefinitions-Anhänge) gegen eine breitere
    /// Allowlist. Diese Uploads werden mit explizitem Dateinamen (erzwungener Download,
    /// kein Inline-Rendering) ausgeliefert, daher genügt hier - anders als beim Logo -
    /// die Content-Type-Allowlist ohne zusätzliche Magic-Byte-Prüfung.
    /// </summary>
    public static bool IstErlaubterDokumentTyp(string? angegebenerContentType)
        => !string.IsNullOrWhiteSpace(angegebenerContentType) && ErlaubteDokumentTypen.Contains(angegebenerContentType);

    /// <summary>
    /// Bereinigt einen clientseitigen Dateinamen auf ein sicheres Zeichen-Set, bevor er
    /// (nach einem GUID-Präfix) Teil des S3-Objektschlüssels wird. Klassisches
    /// Path-Traversal greift bei S3s flachem Key-Namespace zwar nicht, aber ohne
    /// Allowlist könnten beliebige Steuerzeichen/Sonderzeichen im Schlüssel landen.
    /// </summary>
    public static string BereinigeDateiname(string dateiname)
    {
        var bereinigt = new string(dateiname
            .Select(c => char.IsLetterOrDigit(c) || c is '.' or '-' or '_' ? c : '_')
            .ToArray());
        return string.IsNullOrWhiteSpace(bereinigt) ? "datei" : bereinigt;
    }
}
