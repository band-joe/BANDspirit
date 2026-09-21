using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using BandSpirit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Deltas;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>
/// OData-Singleton-Controller für die Firma. Route: /odata/Firma
/// Unterstützt GET und PATCH.
/// </summary>
[Authorize]
public class FirmaController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public FirmaController(BandSpiritDbContext db) => _db = db;

    /// <summary>
    /// Liefert (bzw. erzeugt) den Firma-Singleton.
    /// DB-12-Fix: Bei gleichzeitigen Erst-Anfragen (Tabelle noch leer) können zwei
    /// Requests beide den Null-Check passieren und beide ein Insert versuchen - ohne
    /// diese Behandlung würde der zweite mit einer rohen 500-Unique-Violation
    /// fehlschlagen statt die inzwischen angelegte Zeile einfach zu lesen.
    /// </summary>
    private async Task<Firma> GetOrCreateAsync()
    {
        var firma = await _db.Firmas.FirstOrDefaultAsync(f => f.Id == "singleton");
        if (firma is not null)
        {
            return firma;
        }

        firma = new Firma { Id = "singleton", Firmenname = "BANDspirit AG" };
        _db.Firmas.Add(firma);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (IstEindeutigkeitsverletzung(ex))
        {
            _db.Entry(firma).State = EntityState.Detached;
            firma = await _db.Firmas.FirstAsync(f => f.Id == "singleton");
        }
        return firma;
    }

    /// <summary>Erkennt eine PostgreSQL-Unique-Constraint-Verletzung (SQLSTATE 23505).</summary>
    private static bool IstEindeutigkeitsverletzung(DbUpdateException ex)
        => ex.InnerException is Npgsql.PostgresException { SqlState: "23505" };

    /// <summary>GET /odata/Firma – Firmen-Stammdaten abrufen (öffentlich für Login-Branding).</summary>
    [HttpGet]
    [EnableQuery]
    [AllowAnonymous]  // Öffentlich, damit Login-Seite Firmen-Logo laden kann
    public async Task<IActionResult> Get()
    {
        var firma = await GetOrCreateAsync();
        return Ok(firma);
    }

    /// <summary>PATCH /odata/Firma – Firmen-Stammdaten aktualisieren.</summary>
    [HttpPatch]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Patch([FromBody] Delta<Firma> delta)
    {
        var firma = await GetOrCreateAsync();
        delta.Patch(firma);
        firma.Id = "singleton"; // Singleton-ID darf nicht überschrieben werden.
        await _db.SaveChangesAsync();
        return Updated(firma);
    }
}

/// <summary>
/// REST-Controller für das Firmenlogo (S3-Upload/Löschen). Route: /api/firma
/// </summary>
[ApiController]
[Route("api/firma")]
[Authorize]
public class FirmaLogoController : ControllerBase
{
    private readonly BandSpiritDbContext _db;
    private readonly S3StorageService _s3;
    private readonly ILogger<FirmaLogoController> _logger;

    public FirmaLogoController(BandSpiritDbContext db, S3StorageService s3, ILogger<FirmaLogoController> logger)
    {
        _db = db;
        _s3 = s3;
        _logger = logger;
    }

    /// <summary>Erkennt eine PostgreSQL-Unique-Constraint-Verletzung (SQLSTATE 23505).</summary>
    private static bool IstEindeutigkeitsverletzung(DbUpdateException ex)
        => ex.InnerException is Npgsql.PostgresException { SqlState: "23505" };

    /// <summary>
    /// POST /api/firma/logo – Firmenlogo hochladen (Multipart-Formulardaten, Feld "datei").
    /// Das Bild wird serverseitig in den Objektspeicher (MinIO) geladen, da der Browser
    /// den privaten, nur intern erreichbaren Speicher nicht direkt aufrufen kann.
    /// </summary>
    [HttpPost("logo")]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> UploadLogo(IFormFile datei)
    {
        if (datei is null || datei.Length == 0)
        {
            return BadRequest(new { fehler = "Keine Datei übermittelt." });
        }

        // SEC-AUDIT-02: Das Logo wird später ÖFFENTLICH (anonym) und OHNE
        // "Content-Disposition: attachment" ausgeliefert (LogoAbrufen unten) - der vom
        // Client gesendete Content-Type ist frei fälschbar und wurde bisher ungeprüft
        // übernommen. Ohne diese Prüfung liesse sich z. B. eine HTML/SVG-Datei mit
        // Skript-Inhalt als "Logo" einschleusen und würde für jeden Besucher der
        // Login-Seite inline im Browser ausgeführt (Stored-XSS). Allowlist + Magic-Bytes
        // statt reinem Vertrauen in den Client-Header.
        byte[] kopf;
        using (var pruefStream = datei.OpenReadStream())
        {
            var puffer = new byte[16];
            var gelesen = await pruefStream.ReadAsync(puffer.AsMemory(0, puffer.Length));
            kopf = puffer[..gelesen];
        }
        if (!UploadValidierung.IstErlaubtesBild(datei.ContentType, kopf))
        {
            return BadRequest(new { fehler = "Nur PNG-, JPEG- oder WebP-Bilder sind als Firmenlogo erlaubt." });
        }

        var firma = await _db.Firmas.FirstOrDefaultAsync(f => f.Id == "singleton");
        var neuAngelegt = firma is null;
        if (firma is null)
        {
            firma = new Firma { Id = "singleton", Firmenname = "BANDspirit AG" };
            _db.Firmas.Add(firma);
        }

        // Altes Logo aufräumen (optional – darf den Upload nicht verhindern).
        if (!string.IsNullOrEmpty(firma.LogoPath))
        {
            try { await _s3.DeleteAsync(firma.LogoPath); }
            catch { /* Bereinigung ist optional. */ }
        }

        string key;
        try
        {
            using var stream = datei.OpenReadStream();
            key = await _s3.UploadAsync(stream, datei.FileName, datei.ContentType!);
        }
        catch (Amazon.S3.AmazonS3Exception ex)
        {
            _logger.LogError(ex, "S3-Upload des Firmenlogos fehlgeschlagen.");
            return StatusCode(502, new
            {
                fehler = "Das Logo konnte nicht im Objektspeicher (MinIO) abgelegt werden. "
                       + "Bitte prüfen Sie, ob der MinIO-Dienst erreichbar und der Bucket verfügbar ist.",
                detail = ex.Message
            });
        }

        firma.LogoPath = key;

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (neuAngelegt && IstEindeutigkeitsverletzung(ex))
        {
            // DB-12-Fix: Race mit einer parallelen Erst-Initialisierung des Singletons -
            // die (inzwischen existierende) Zeile erneut laden und das Logo dort setzen,
            // statt die S3-Datei fälschlich als verwaist zu behandeln und aufzuräumen.
            _db.Entry(firma).State = EntityState.Detached;
            firma = await _db.Firmas.FirstAsync(f => f.Id == "singleton");
            firma.LogoPath = key;
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            // APP-07-Fix: Ohne diese Kompensation bliebe das Objekt verwaist in S3,
            // wenn der DB-Update fehlschlägt (S3 und DB liefen sonst auseinander).
            _logger.LogError(ex, "DB-Update des Firmenlogos fehlgeschlagen, räume S3-Objekt {Key} auf.", key);
            try { await _s3.DeleteAsync(key); }
            catch (Amazon.S3.AmazonS3Exception cleanupEx)
            {
                _logger.LogError(cleanupEx, "Aufräumen des verwaisten S3-Objekts {Key} fehlgeschlagen.", key);
            }
            return StatusCode(500, new { fehler = "Das Logo konnte nicht gespeichert werden." });
        }

        return Ok(new { logoPath = key });
    }

    /// <summary>
    /// GET /api/firma/logo – Liefert das Firmenlogo direkt als Bilddatei aus. Das Bild
    /// wird serverseitig aus dem Objektspeicher (MinIO) geladen, da der Browser den
    /// privaten Speicher nicht direkt erreichen kann. Öffentlich, damit die Login-Seite
    /// das Logo auch ohne Anmeldung anzeigen kann. Liefert 404, wenn kein Logo hinterlegt ist.
    /// </summary>
    [HttpGet("logo")]
    [AllowAnonymous]
    public async Task<IActionResult> LogoAbrufen()
    {
        var firma = await _db.Firmas.AsNoTracking().FirstOrDefaultAsync(f => f.Id == "singleton");
        if (firma is null || string.IsNullOrEmpty(firma.LogoPath))
        {
            return NotFound();
        }

        try
        {
            var (inhalt, contentType) = await _s3.DownloadAsync(firma.LogoPath);
            // SEC-AUDIT-02: Defense-in-Depth für vor diesem Fix hochgeladene Logos -
            // nur ein gültiger Bild-Content-Type wird inline ausgeliefert, alles andere
            // fällt auf einen Download-erzwingenden Typ zurück statt potenziell
            // gefährlichen Inhalt im Browser rendern zu lassen.
            var sicherheitsContentType = UploadValidierung.IstErlaubterBildContentType(contentType)
                ? contentType
                : "application/octet-stream";
            return File(inhalt, sicherheitsContentType);
        }
        catch (Amazon.S3.AmazonS3Exception ex)
        {
            _logger.LogError(ex, "Firmenlogo konnte nicht aus S3 geladen werden.");
            return NotFound();
        }
    }

    /// <summary>DELETE /api/firma/logo – Firmenlogo löschen.</summary>
    [HttpDelete("logo")]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> DeleteLogo()
    {
        var firma = await _db.Firmas.FirstOrDefaultAsync(f => f.Id == "singleton");
        if (firma?.LogoPath is not null)
        {
            // APP-07-Fix: Schlägt das S3-Löschen fehl, wird der DB-Verweis NICHT entfernt,
            // sonst bliebe die Datei unauffindbar in S3 zurück (kein Verweis mehr in der DB).
            try
            {
                await _s3.DeleteAsync(firma.LogoPath);
            }
            catch (Amazon.S3.AmazonS3Exception ex)
            {
                _logger.LogError(ex, "S3-Löschen des Firmenlogos {Pfad} fehlgeschlagen.", firma.LogoPath);
                return StatusCode(502, new { fehler = "Das Logo konnte nicht aus dem Objektspeicher entfernt werden." });
            }
            firma.LogoPath = null;
            await _db.SaveChangesAsync();
        }
        return NoContent();
    }
}
