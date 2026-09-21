using System.Security.Claims;
using System.Text.RegularExpressions;
using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;

namespace BandSpirit.Api.Infrastructure.Middleware;

/// <summary>
/// CC-M2: Protokolliert NUR Zugriffs-/Sicherheitsereignisse (401/403/Fehler).
/// Erfolgreiche Datenänderungen (2xx/3xx) werden NICHT geloggt – diese werden
/// vom DbContext.SaveChanges-Override erfasst (fachliche Änderungen mit vorher/nachher).
///
/// Verhindert Doppel-Einträge und etabliert eine klare Trennung:
///   • DbContext → fachliche Datenänderungen (CREATE/UPDATE/DELETE)
///   • Middleware → Zugriffsprobleme/Fehler (401/403/>=400)
/// </summary>
public class AuditMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditMiddleware> _logger;

    public AuditMiddleware(RequestDelegate next, ILogger<AuditMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, BandSpiritDbContext db)
    {
        await _next(context);

        var methode = context.Request.Method;
        var statusCode = context.Response.StatusCode;

        // CC-M2: NUR fehlgeschlagene/abgelehnte Requests loggen.
        // Erfolgreiche Aktionen (2xx/3xx) werden vom DbContext geloggt → keine Doppel-Einträge.
        if (statusCode < 400)
        {
            return;
        }

        // Ereignistyp bestimmen:
        //  - 401/403: abgelehnter (unbefugter) Zugriff – sicherheitsrelevant
        //  - sonstige >= 400: fehlgeschlagene Aktion
        string ergebnis = statusCode is 401 or 403 ? "ABGELEHNT" : "FEHLGESCHLAGEN";

        try
        {
            var pfad = context.Request.Path.Value ?? "unbekannt";
            var (entityName, entityId) = ExtrahiereEntitaet(pfad);

            // UI-19-Fix: Modul war zuvor der rohe Request-Pfad (inkl. GUIDs),
            // wodurch praktisch jeder Eintrag einen eigenen, faktisch
            // ungefilterbaren "Modul"-Wert hatte. Jetzt derselbe Katalog wie im
            // DbContext-Änderungslog, damit Frontend-Filter beide Quellen erfassen.
            var log = new AppLog
            {
                Modul = AuditModul.VonRessourcenName(entityName),
                Aktion = methode,
                EntityName = entityName,
                EntityId = entityId,
                UserId = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? context.User.FindFirstValue("sub"),
                UserName = context.User.FindFirstValue(ClaimTypes.Name)
                           ?? context.User.FindFirstValue("name"),
                Ip = context.Connection.RemoteIpAddress?.ToString(),
                Details = $"Ergebnis={ergebnis}; StatusCode={statusCode}"
            };
            db.AppLogs.Add(log);
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Audit-Fehler dürfen die eigentliche Anfrage nicht beeinträchtigen.
            _logger.LogWarning(ex, "Audit-Log konnte nicht geschrieben werden.");
        }
    }

    // GUID-Erkennung (z. B. "3d0ef45a-...").
    private static readonly Regex GuidRegex = new(
        @"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        RegexOptions.Compiled);

    // OData-Schlüssel im Pfad, z. B. "S3RollenDefinitionen(3d0ef45a-...)" oder "Firmas('singleton')".
    private static readonly Regex ODataKeyRegex = new(
        @"^(?<set>[A-Za-z0-9_]+)\((?<key>[^)]*)\)$",
        RegexOptions.Compiled);

    /// <summary>
    /// Leitet aus dem Anfrage-Pfad die betroffene Entität (Name) und deren
    /// Datensatz-ID ab. Unterstützt OData-Pfade (…/odata/EntitySet(Key)) und
    /// REST-Pfade (…/api/ressource/{id}/…). Liefert (null, null), wenn nichts
    /// sicher ableitbar ist.
    /// </summary>
    internal static (string? EntityName, string? EntityId) ExtrahiereEntitaet(string pfad)
    {
        if (string.IsNullOrWhiteSpace(pfad))
        {
            return (null, null);
        }

        var segmente = pfad.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segmente.Length == 0)
        {
            return (null, null);
        }

        // 1) OData-Muster: EntitySet(Key)
        foreach (var segment in segmente)
        {
            var m = ODataKeyRegex.Match(segment);
            if (m.Success)
            {
                var key = m.Groups["key"].Value.Trim('\'', '"');
                return (m.Groups["set"].Value, string.IsNullOrEmpty(key) ? null : key);
            }
        }

        // 2) REST-Muster: letzten GUID-Wert als ID nehmen, das vorangehende
        //    aussagekräftige Segment als Entitätsname.
        string? entityId = null;
        string? entityName = null;
        for (var i = segmente.Length - 1; i >= 0; i--)
        {
            if (GuidRegex.IsMatch(segmente[i]))
            {
                entityId = segmente[i];
                // Vorheriges nicht-technisches Segment als Name verwenden.
                for (var j = i - 1; j >= 0; j--)
                {
                    if (!string.Equals(segmente[j], "api", StringComparison.OrdinalIgnoreCase)
                        && !string.Equals(segmente[j], "odata", StringComparison.OrdinalIgnoreCase))
                    {
                        entityName = segmente[j];
                        break;
                    }
                }
                break;
            }
        }

        // 3) Fallback: Entitätsname = erstes fachliches Segment nach api/odata.
        if (entityName is null)
        {
            foreach (var segment in segmente)
            {
                if (!string.Equals(segment, "api", StringComparison.OrdinalIgnoreCase)
                    && !string.Equals(segment, "odata", StringComparison.OrdinalIgnoreCase))
                {
                    entityName = segment;
                    break;
                }
            }
        }

        return (entityName, entityId);
    }
}
