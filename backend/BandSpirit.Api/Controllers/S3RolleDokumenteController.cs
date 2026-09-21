using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using BandSpirit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>REST-Controller für Dokumente einer Rolle (Upload/Download/Löschen via MinIO/S3).</summary>
[ApiController]
[Route("api/rollen/{roleId:guid}/dokumente")]
[Authorize]
public class S3RolleDokumenteController : ControllerBase
{
    private readonly BandSpiritDbContext _db;
    private readonly S3StorageService _s3;
    private readonly ILogger<S3RolleDokumenteController> _logger;

    public S3RolleDokumenteController(BandSpiritDbContext db, S3StorageService s3, ILogger<S3RolleDokumenteController> logger)
    {
        _db = db;
        _s3 = s3;
        _logger = logger;
    }

    /// <summary>GET – Liste aller Dokumente der Rolle.</summary>
    [HttpGet("")]
    [Authorize(Policy = Permissions.RoleRead)]
    public async Task<IActionResult> Liste([FromRoute] Guid roleId)
    {
        var dokumente = await _db.S3RolleDokumente
            .AsNoTracking()
            .Where(d => d.RoleId == roleId)
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
    [Authorize(Policy = Permissions.RoleUpdate)]
    public async Task<IActionResult> Hochladen([FromRoute] Guid roleId, IFormFile datei)
    {
        if (datei is null || datei.Length == 0)
        {
            return BadRequest(new { fehler = "Es wurde keine Datei übermittelt." });
        }

        var rolleVorhanden = await _db.S3Roles.AnyAsync(r => r.Id == roleId);
        if (!rolleVorhanden)
        {
            return NotFound(new { fehler = "Die Rolle wurde nicht gefunden." });
        }

        string key;
        try
        {
            using var stream = datei.OpenReadStream();
            key = await _s3.UploadAsync(stream, datei.FileName, datei.ContentType ?? "application/octet-stream");
        }
        catch (Amazon.S3.AmazonS3Exception ex)
        {
            _logger.LogError(ex, "S3-Upload des Rollendokuments fehlgeschlagen.");
            return StatusCode(502, new { fehler = "Das Dokument konnte nicht gespeichert werden." });
        }

        var dokument = new S3RolleDokument
        {
            RoleId = roleId,
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
            _logger.LogError(ex, "DB-Insert des Rollendokuments fehlgeschlagen, räume S3-Objekt {Key} auf.", key);
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
    [Authorize(Policy = Permissions.RoleRead)]
    public async Task<IActionResult> Herunterladen([FromRoute] Guid roleId, [FromRoute] Guid id)
    {
        var dokument = await _db.S3RolleDokumente
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id && d.RoleId == roleId);
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
            _logger.LogError(ex, "Rollendokument konnte nicht aus S3 geladen werden.");
            return NotFound();
        }
    }

    /// <summary>DELETE – Dokument löschen.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Permissions.RoleUpdate)]
    public async Task<IActionResult> Loeschen([FromRoute] Guid roleId, [FromRoute] Guid id)
    {
        var dokument = await _db.S3RolleDokumente.FirstOrDefaultAsync(d => d.Id == id && d.RoleId == roleId);
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
                _logger.LogError(ex, "S3-Löschen des Rollendokuments {Pfad} fehlgeschlagen.", dokument.StoragePfad);
                return StatusCode(502, new { fehler = "Das Dokument konnte nicht aus dem Objektspeicher entfernt werden." });
            }
        }

        _db.S3RolleDokumente.Remove(dokument);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
