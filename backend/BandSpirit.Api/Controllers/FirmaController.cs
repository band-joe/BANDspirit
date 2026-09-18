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

    /// <summary>Liefert (bzw. erzeugt) den Firma-Singleton.</summary>
    private async Task<Firma> GetOrCreateAsync()
    {
        var firma = await _db.Firmas.FirstOrDefaultAsync(f => f.Id == "singleton");
        if (firma is null)
        {
            firma = new Firma { Id = "singleton", Firmenname = "BANDspirit AG" };
            _db.Firmas.Add(firma);
            await _db.SaveChangesAsync();
        }
        return firma;
    }

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

        var firma = await _db.Firmas.FirstOrDefaultAsync(f => f.Id == "singleton");
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
            var contentType = string.IsNullOrWhiteSpace(datei.ContentType)
                ? "application/octet-stream"
                : datei.ContentType;
            key = await _s3.UploadAsync(stream, datei.FileName, contentType);
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
        await _db.SaveChangesAsync();
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
            return File(inhalt, contentType);
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
            try { await _s3.DeleteAsync(firma.LogoPath); }
            catch { /* Bereinigung ist optional. */ }
            firma.LogoPath = null;
            await _db.SaveChangesAsync();
        }
        return NoContent();
    }
}
