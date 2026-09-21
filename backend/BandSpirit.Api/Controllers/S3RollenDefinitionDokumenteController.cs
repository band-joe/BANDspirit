using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using BandSpirit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>
/// REST-Controller für Dokumente einer Rollendefinition (Upload/Download/Löschen via MinIO/S3).
/// Route: /api/rollendefinitionen/{definitionId}/dokumente
/// </summary>
[ApiController]
[Route("api/rollendefinitionen/{definitionId:guid}/dokumente")]
[Authorize]
public class S3RollenDefinitionDokumenteController : ControllerBase
{
    private readonly BandSpiritDbContext _db;
    private readonly S3StorageService _s3;
    private readonly ILogger<S3RollenDefinitionDokumenteController> _logger;

    public S3RollenDefinitionDokumenteController(BandSpiritDbContext db, S3StorageService s3, ILogger<S3RollenDefinitionDokumenteController> logger)
    {
        _db = db;
        _s3 = s3;
        _logger = logger;
    }

    /// <summary>GET – Liste aller Dokumente der Rollendefinition.</summary>
    [HttpGet("")]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Liste([FromRoute] Guid definitionId)
    {
        var dokumente = await _db.S3RolleDokumente
            .AsNoTracking()
            .Where(d => d.RollenDefinitionId == definitionId)
            .OrderByDescending(d => d.HochgeladenAm)
            .Select(d => new
            {
                id = d.Id,
                dateiname = d.Dateiname,
                mimeType = d.MimeType,
                dateigroesseBytes = d.DateigroesseBytes,
                hochgeladenAm = d.HochgeladenAm
            })
            .ToListAsync();
        return Ok(dokumente);
    }

    /// <summary>POST – Neues Dokument hochladen.</summary>
    [HttpPost("")]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Hochladen([FromRoute] Guid definitionId, IFormFile datei)
    {
        if (datei is null || datei.Length == 0)
        {
            return BadRequest(new { fehler = "Es wurde keine Datei übermittelt." });
        }

        // SEC-AUDIT-07: Content-Type-Allowlist statt blindem Vertrauen in den vom
        // Client gesendeten Wert. Downloads erzwingen ohnehin einen Dateinamen (kein
        // Inline-Rendering-Risiko wie beim Firmenlogo), daher genügt hier die
        // Allowlist-Prüfung ohne zusätzliche Magic-Byte-Analyse.
        if (!UploadValidierung.IstErlaubterDokumentTyp(datei.ContentType))
        {
            return BadRequest(new { fehler = "Dieser Dateityp ist nicht erlaubt." });
        }

        var definitionVorhanden = await _db.Set<S3RollenDefinition>().AnyAsync(r => r.Id == definitionId);
        if (!definitionVorhanden)
        {
            return NotFound(new { fehler = "Die Rollendefinition wurde nicht gefunden." });
        }

        string key;
        try
        {
            using var stream = datei.OpenReadStream();
            key = await _s3.UploadAsync(stream, datei.FileName, datei.ContentType!);
        }
        catch (Amazon.S3.AmazonS3Exception ex)
        {
            _logger.LogError(ex, "S3-Upload des Rollendefinitions-Dokuments fehlgeschlagen.");
            return StatusCode(502, new { fehler = "Das Dokument konnte nicht gespeichert werden." });
        }

        var dokument = new S3RolleDokument
        {
            RollenDefinitionId = definitionId,
            Dateiname = datei.FileName,
            StoragePfad = key,
            MimeType = datei.ContentType ?? "application/octet-stream",
            DateigroesseBytes = datei.Length
        };
        _db.S3RolleDokumente.Add(dokument);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            // APP-07-Fix: Ohne diese Kompensation bliebe das Objekt verwaist in S3,
            // wenn der DB-Insert fehlschlägt (S3 und DB liefen sonst auseinander).
            _logger.LogError(ex, "DB-Insert des Rollendefinitions-Dokuments fehlgeschlagen, räume S3-Objekt {Key} auf.", key);
            try { await _s3.DeleteAsync(key); }
            catch (Amazon.S3.AmazonS3Exception cleanupEx)
            {
                _logger.LogError(cleanupEx, "Aufräumen des verwaisten S3-Objekts {Key} fehlgeschlagen.", key);
            }
            return StatusCode(500, new { fehler = "Das Dokument konnte nicht gespeichert werden." });
        }

        return Ok(new
        {
            id = dokument.Id,
            dateiname = dokument.Dateiname,
            mimeType = dokument.MimeType,
            dateigroesseBytes = dokument.DateigroesseBytes,
            hochgeladenAm = dokument.HochgeladenAm
        });
    }

    /// <summary>GET – Dokument herunterladen.</summary>
    [HttpGet("{id:guid}/download")]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Herunterladen([FromRoute] Guid definitionId, [FromRoute] Guid id)
    {
        var dokument = await _db.S3RolleDokumente
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id && d.RollenDefinitionId == definitionId);
        if (dokument is null)
        {
            return NotFound();
        }

        try
        {
            var (inhalt, contentType) = await _s3.DownloadAsync(dokument.StoragePfad);
            return File(inhalt, string.IsNullOrEmpty(contentType) ? dokument.MimeType : contentType, dokument.Dateiname);
        }
        catch (Amazon.S3.AmazonS3Exception ex)
        {
            _logger.LogError(ex, "Rollendefinitions-Dokument konnte nicht aus S3 geladen werden.");
            return NotFound();
        }
    }

    /// <summary>DELETE – Dokument löschen.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.StammdatenManage)]
    public async Task<IActionResult> Loeschen([FromRoute] Guid definitionId, [FromRoute] Guid id)
    {
        var dokument = await _db.S3RolleDokumente.FirstOrDefaultAsync(d => d.Id == id && d.RollenDefinitionId == definitionId);
        if (dokument is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrEmpty(dokument.StoragePfad))
        {
            // APP-07-Fix: Schlägt das S3-Löschen fehl, wird der DB-Eintrag NICHT entfernt,
            // sonst bliebe die Datei unauffindbar in S3 zurück (kein Verweis mehr in der DB).
            try
            {
                await _s3.DeleteAsync(dokument.StoragePfad);
            }
            catch (Amazon.S3.AmazonS3Exception ex)
            {
                _logger.LogError(ex, "S3-Löschen des Rollendefinitions-Dokuments {Pfad} fehlgeschlagen.", dokument.StoragePfad);
                return StatusCode(502, new { fehler = "Das Dokument konnte nicht aus dem Objektspeicher entfernt werden." });
            }
        }

        _db.S3RolleDokumente.Remove(dokument);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
