using System.Security.Claims;
using BandSpirit.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BandSpirit.Api.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>
/// REST-Controller für das Mitarbeiter-Profil (MA-Profil). Route: /api/profil
/// Der angemeldete Benutzer sieht seine eigenen Stammdaten (nur lesend) aus der
/// Benutzerverwaltung sowie seine Kreis-Zugehörigkeit inkl. Lead-Link des Kreises.
/// Zusätzlich kann er ein Porträtfoto hoch- bzw. wieder herunterladen/löschen.
/// Jeder angemeldete Benutzer darf ausschliesslich sein EIGENES Profil abrufen.
/// </summary>
[ApiController]
[Route("api/profil")]
[Authorize]
public class ProfilController : ControllerBase
{
    private readonly BandSpiritDbContext _db;
    private readonly S3StorageService _s3;
    private readonly ILogger<ProfilController> _logger;

    /// <summary>Kantenlänge des quadratischen Porträt-Thumbnails in Pixeln.</summary>
    private const int ThumbnailGroesse = 300;

    public ProfilController(BandSpiritDbContext db, S3StorageService s3, ILogger<ProfilController> logger)
    {
        _db = db;
        _s3 = s3;
        _logger = logger;
    }

    /// <summary>Ermittelt die ID des aktuell angemeldeten Benutzers aus den Claims.</summary>
    private Guid? AktuelleBenutzerId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? User.FindFirstValue("sub");
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    /// <summary>
    /// GET /api/profil/meins – Liefert das eigene Profil (nur lesend):
    /// Name, E-Mail, Porträtpfad sowie alle Kreise, denen der Benutzer angehört,
    /// jeweils mit dem Lead-Link dieses Kreises. Die Kreis-ID wird bewusst NICHT
    /// nach aussen gegeben (Anforderung: "id ist hidden").
    /// </summary>
    [HttpGet("meins")]
    public async Task<IActionResult> Meins()
    {
        var userId = AktuelleBenutzerId();
        if (userId is null)
        {
            return Unauthorized(new { fehler = "Kein gültiger Benutzer im Token." });
        }

        var profil = await ProfilDatenAsync(userId.Value);
        if (profil is null)
        {
            return NotFound(new { fehler = "Benutzer nicht gefunden." });
        }

        return Ok(profil);
    }

    /// <summary>
    /// GET /api/profil/meins/lead-links-ueber-mir – Liefert alle Lead-Links, die
    /// hierarchisch ÜBER dem angemeldeten Benutzer stehen: die Lead-Links seiner
    /// eigenen Kreise sowie die Lead-Links sämtlicher Elternkreise bis zur Wurzel.
    /// Ist der Benutzer selbst Lead-Link eines Kreises, wird dieser Eintrag NICHT
    /// aufgeführt. Kreise ohne (fremden) Lead-Link werden übersprungen. Die Liste
    /// ist nach Tiefe sortiert (eigene/flachste Kreise zuerst, dann aufsteigend
    /// zur Wurzel). Jeder angemeldete Benutzer darf dies für sein eigenes Profil
    /// abrufen.
    /// </summary>
    [HttpGet("meins/lead-links-ueber-mir")]
    public async Task<IActionResult> LeadLinksUeberMir()
    {
        var userId = AktuelleBenutzerId();
        if (userId is null)
        {
            return Unauthorized(new { fehler = "Kein gültiger Benutzer im Token." });
        }

        var ergebnis = await LeadLinksUeberMirAsync(userId.Value);
        return Ok(ergebnis);
    }

    /// <summary>
    /// Ermittelt alle Lead-Links, die hierarchisch ÜBER dem Benutzer stehen:
    /// zunächst die Lead-Links seiner direkten Kreise, danach – ebenenweise
    /// aufsteigend – die Lead-Links sämtlicher Elternkreise bis zur Wurzel.
    /// Der Benutzer selbst wird nie als Lead-Link aufgeführt; Kreise ohne
    /// (fremden) Lead-Link werden übersprungen. Kreise, die über mehrere
    /// Elternketten mehrfach erreichbar sind, erscheinen nur einmal. Jeder
    /// Eintrag enthält <c>kreisId</c>, <c>kreisName</c> und <c>leadLinkName</c>;
    /// die Kreis-ID wird hier – anders als in der Profilanzeige – bewusst
    /// mitgegeben, damit nachgelagerte Workflows sie verarbeiten können.
    /// </summary>
    private async Task<List<object>> LeadLinksUeberMirAsync(Guid userId)
    {
        // 1. Direkte Kreise des Benutzers (über seine Rollenzuweisungen).
        var direkteKreisIds = await _db.S3PersonRoleAssignments
            .AsNoTracking()
            .Where(pra => pra.UserId == userId && pra.Role != null)
            .Select(pra => pra.Role!.CircleId)
            .Distinct()
            .ToListAsync();

        // 2. Kreis-Hierarchie einmalig laden (Id -> ParentId, Name).
        var kreisMap = await _db.S3Circles
            .AsNoTracking()
            .Select(c => new { c.Id, c.ParentId, c.Name })
            .ToDictionaryAsync(c => c.Id);

        // 3. Kreise ebenenweise sammeln: direkte Kreise zuerst, danach
        //    aufsteigend zur Wurzel. Deduplizierung über ein HashSet, sodass
        //    ein von mehreren Ketten geteilter Elternkreis nur einmal erscheint.
        var reihenfolge = new List<Guid>();
        var gesehen = new HashSet<Guid>();
        var aktuelleEbene = direkteKreisIds.Where(kreisMap.ContainsKey).ToList();
        while (aktuelleEbene.Count > 0)
        {
            var naechsteEbene = new List<Guid>();
            foreach (var kreisId in aktuelleEbene)
            {
                if (!gesehen.Add(kreisId))
                {
                    continue;
                }
                reihenfolge.Add(kreisId);

                var parentId = kreisMap[kreisId].ParentId;
                // Selbstreferenz (Wurzel verweist auf sich) beendet die Kette.
                if (parentId is not null
                    && parentId.Value != kreisId
                    && kreisMap.ContainsKey(parentId.Value))
                {
                    naechsteEbene.Add(parentId.Value);
                }
            }
            aktuelleEbene = naechsteEbene;
        }

        // 4. Lead-Link je Kreis bestimmen – ohne den Benutzer selbst. Kreise
        //    ohne (fremden) Lead-Link werden übersprungen.
        // APP-14-Fix: Ein gemeinsamer Roundtrip für ALLE Kreise der Kette statt
        // eines Einzel-Roundtrips pro Ebene/Kreis.
        var leadLinkProKreis = await LeadLinkNamenProKreisAsync(reihenfolge, benutzerAusschliessen: userId);

        var ergebnis = new List<object>();
        foreach (var kreisId in reihenfolge)
        {
            if (!leadLinkProKreis.TryGetValue(kreisId, out var leadLinkName))
            {
                continue;
            }

            ergebnis.Add(new
            {
                kreisId,
                kreisName = kreisMap[kreisId].Name,
                leadLinkName
            });
        }

        return ergebnis;
    }

    /// <summary>
    /// APP-14-Fix: Ermittelt den (deterministisch nach Name sortierten, nur
    /// aktive Benutzer und gültige Zuweisungszeiträume berücksichtigenden)
    /// Lead-Link-Namen für JEDEN der angegebenen Kreise in einem einzigen
    /// Roundtrip, statt pro Kreis einzeln nachzufragen. Kreise ohne (ggf. ohne
    /// den ausgeschlossenen Benutzer verbleibenden) Lead-Link fehlen im
    /// Ergebnis-Dictionary.
    /// </summary>
    private async Task<Dictionary<Guid, string>> LeadLinkNamenProKreisAsync(
        IReadOnlyCollection<Guid> kreisIds, Guid? benutzerAusschliessen)
    {
        if (kreisIds.Count == 0)
        {
            return new Dictionary<Guid, string>();
        }

        var jetzt = DateTime.UtcNow;
        var kandidaten = await _db.S3PersonRoleAssignments
            .AsNoTracking()
            .Where(pra => pra.Role != null
                          && kreisIds.Contains(pra.Role.CircleId)
                          && pra.Role.RollenDefinition != null
                          && pra.Role.RollenDefinition.IsLeadLink
                          && (benutzerAusschliessen == null || pra.UserId != benutzerAusschliessen)
                          && pra.User != null
                          && pra.User.Aktiv
                          && (pra.DateFrom == null || pra.DateFrom <= jetzt)
                          && (pra.DateTo == null || pra.DateTo >= jetzt))
            // In der Datenbank nach Kreis und Name sortieren, damit der erste
            // Treffer je Kreis beim Zusammenführen unten deterministisch der
            // alphabetisch erste ist (gleiches Verhalten wie zuvor pro Kreis
            // einzeln mit OrderBy(Name).FirstOrDefault()).
            .OrderBy(pra => pra.Role!.CircleId)
            .ThenBy(pra => pra.User!.Name)
            .Select(pra => new { CircleId = pra.Role!.CircleId, Name = pra.User!.Name })
            .ToListAsync();

        var ergebnis = new Dictionary<Guid, string>();
        foreach (var kandidat in kandidaten)
        {
            if (!ergebnis.ContainsKey(kandidat.CircleId))
            {
                ergebnis[kandidat.CircleId] = kandidat.Name;
            }
        }
        return ergebnis;
    }

    /// <summary>
    /// GET /api/profil/benutzer – Liefert eine schlanke Liste aller Benutzer
    /// (Id, Name, E-Mail, Aktiv-Status) für die Benutzer-Suche im Organigramm
    /// bzw. in der Organisation. Bewusst nur mit <c>[Authorize]</c> geschützt,
    /// damit auch S3-Mitglieder ohne die Berechtigung "user:read"
    /// (Benutzerverwaltung) ihre Kolleginnen und Kollegen finden können. Es
    /// werden ausschliesslich unkritische, öffentliche Profilfelder ausgegeben
    /// (kein Passwort, keine Rolle, keine Audit-Daten).
    /// </summary>
    [HttpGet("benutzer")]
    public async Task<IActionResult> BenutzerListe()
    {
        var benutzer = await _db.Users
            .AsNoTracking()
            .OrderBy(u => u.Name)
            .Select(u => new
            {
                id = u.Id,
                name = u.Name,
                email = u.Email,
                aktiv = u.Aktiv
            })
            .ToListAsync();

        return Ok(benutzer);
    }

    /// <summary>
    /// GET /api/profil/benutzer/{id} – Liefert das Profil eines beliebigen Benutzers
    /// (nur lesend): Name, E-Mail, Porträtpfad sowie alle Kreise, denen der Benutzer
    /// angehört, jeweils mit dem Lead-Link dieses Kreises. Wird für die
    /// Benutzer-Suche in der Organisation verwendet. Jeder angemeldete Benutzer
    /// darf die (öffentlichen) Profildaten seiner Kolleginnen und Kollegen sehen.
    /// </summary>
    [HttpGet("benutzer/{id:guid}")]
    public async Task<IActionResult> Benutzer(Guid id)
    {
        var profil = await ProfilDatenAsync(id);
        if (profil is null)
        {
            return NotFound(new { fehler = "Benutzer nicht gefunden." });
        }

        return Ok(profil);
    }

    /// <summary>
    /// Baut das (nur lesende) Profil-Objekt für einen Benutzer auf: Name, E-Mail,
    /// Porträtpfad und die Kreis-Zugehörigkeit inkl. Lead-Link je Kreis. Liefert
    /// null, wenn der Benutzer nicht existiert. Die Kreis-ID wird bewusst NICHT
    /// nach aussen gegeben (Anforderung: "id ist hidden").
    /// </summary>
    private async Task<object?> ProfilDatenAsync(Guid userId)
    {
        var benutzer = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (benutzer is null)
        {
            return null;
        }

        // Alle Kreise, denen der Benutzer über eine Rollenzuweisung angehört.
        var kreisIds = await _db.S3PersonRoleAssignments
            .AsNoTracking()
            .Where(pra => pra.UserId == userId && pra.Role != null)
            .Select(pra => pra.Role!.CircleId)
            .Distinct()
            .ToListAsync();

        // APP-14-Fix: Statt pro Kreis zwei Einzel-Roundtrips (Kreis laden,
        // Lead-Link laden) je EINEN Roundtrip für ALLE Kreise gemeinsam - die
        // Antwortzeit wuchs zuvor linear mit der Anzahl Kreise pro Person.
        var kreisNamen = await _db.S3Circles
            .AsNoTracking()
            .Where(c => kreisIds.Contains(c.Id))
            .Select(c => new { c.Id, c.Name })
            .ToListAsync();

        var leadLinkProKreis = await LeadLinkNamenProKreisAsync(kreisIds, benutzerAusschliessen: null);

        // Kreis-ID wird bewusst NICHT ausgegeben (Anforderung: id ist hidden).
        var kreise = kreisNamen
            .Select(k => new
            {
                name = k.Name,
                leadLink = leadLinkProKreis.TryGetValue(k.Id, out var name) ? name : null
            })
            .ToList<object>();

        return new
        {
            name = benutzer.Name,
            email = benutzer.Email,
            portraetPfad = benutzer.PortraetPfad,
            kreise
        };
    }

    /// <summary>
    /// POST /api/profil/foto – Porträtfoto des eigenen Profils hochladen (multipart).
    /// Ein zuvor vorhandenes Foto wird aus S3 gelöscht. Liefert den neuen Schlüssel.
    /// </summary>
    [HttpPost("foto")]
    public async Task<IActionResult> FotoHochladen(IFormFile datei)
    {
        var userId = AktuelleBenutzerId();
        if (userId is null)
        {
            return Unauthorized(new { fehler = "Kein gültiger Benutzer im Token." });
        }

        if (datei is null || datei.Length == 0)
        {
            return BadRequest(new { fehler = "Keine Datei übermittelt." });
        }

        if (!datei.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { fehler = "Es sind nur Bilddateien erlaubt." });
        }

        var benutzer = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);
        if (benutzer is null)
        {
            return NotFound(new { fehler = "Benutzer nicht gefunden." });
        }

        // APP-06-Fix: Reihenfolge war Löschen -> Dekodieren -> Upload -> Speichern.
        // Schlug die Dekodierung/der Upload danach fehl, war das alte Foto bereits
        // weg und die DB zeigte weiterhin auf einen gelöschten Schlüssel. Jetzt:
        // erst validieren/hochladen/speichern, das alte Foto erst danach (best
        // effort) entfernen.
        var altesPortraetPfad = benutzer.PortraetPfad;

        // Bild auf ein quadratisches Thumbnail (300 x 300) verkleinern. Dadurch
        // bleiben die abgelegten Dateien klein und werden im Profil in genau der
        // Größe angezeigt, in der sie gespeichert wurden.
        byte[] thumbnail;
        try
        {
            using var eingang = datei.OpenReadStream();
            using var bild = await Image.LoadAsync(eingang);
            bild.Mutate(x => x.Resize(new ResizeOptions
            {
                Size = new Size(ThumbnailGroesse, ThumbnailGroesse),
                Mode = ResizeMode.Crop, // quadratisch zuschneiden (Mitte)
                Position = AnchorPositionMode.Center
            }));
            using var ausgang = new MemoryStream();
            await bild.SaveAsPngAsync(ausgang);
            thumbnail = ausgang.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Das hochgeladene Bild konnte nicht verarbeitet werden.");
            return BadRequest(new { fehler = "Die Datei konnte nicht als Bild verarbeitet werden. Bitte eine gültige Bilddatei (JPG oder PNG) wählen." });
        }

        string key;
        try
        {
            using var stream = new MemoryStream(thumbnail);
            key = await _s3.UploadAsync(stream, "portrait.png", "image/png");
        }
        catch (Amazon.S3.AmazonS3Exception ex)
        {
            _logger.LogError(ex, "S3-Upload des Porträtfotos fehlgeschlagen.");
            return StatusCode(502, new
            {
                fehler = "Das Foto konnte nicht im Objektspeicher (MinIO) abgelegt werden. "
                       + "Bitte prüfen Sie, ob der MinIO-Dienst erreichbar und der Bucket verfügbar ist.",
                detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unerwarteter Fehler beim Foto-Upload.");
            return StatusCode(500, new
            {
                fehler = "Unerwarteter Fehler beim Hochladen des Fotos.",
                detail = ex.Message
            });
        }

        benutzer.PortraetPfad = key;
        await _db.SaveChangesAsync();

        // Erst jetzt, nachdem Upload und DB-Update erfolgreich waren, das alte
        // Foto aufräumen (best effort - ein Fehler hier soll die Antwort nicht
        // mehr verhindern, da der Benutzer bereits sein neues Foto hat).
        if (!string.IsNullOrEmpty(altesPortraetPfad))
        {
            try { await _s3.DeleteAsync(altesPortraetPfad); }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Altes Porträtfoto ({Pfad}) konnte nach erfolgreichem Ersatz nicht gelöscht werden.", altesPortraetPfad);
            }
        }

        return Ok(new { portraetPfad = key });
    }

    /// <summary>
    /// GET /api/profil/foto – Liefert das Porträtfoto des eigenen Profils direkt
    /// als Bilddatei aus. Das Bild wird serverseitig aus dem Objektspeicher
    /// (MinIO) geladen und ausgeliefert, da der Browser den privaten, nur intern
    /// erreichbaren Speicher nicht direkt aufrufen kann.
    /// </summary>
    [HttpGet("foto")]
    public async Task<IActionResult> FotoAbrufen()
    {
        var userId = AktuelleBenutzerId();
        if (userId is null)
        {
            return Unauthorized(new { fehler = "Kein gültiger Benutzer im Token." });
        }

        return await FotoAusliefern(userId.Value);
    }

    /// <summary>
    /// GET /api/profil/benutzer/{id}/foto – Liefert das Porträtfoto eines beliebigen
    /// Benutzers direkt als Bilddatei aus. Wird für die Benutzer-Suche in der
    /// Organisation (Profilanzeige) verwendet.
    /// </summary>
    [HttpGet("benutzer/{id:guid}/foto")]
    public async Task<IActionResult> BenutzerFoto(Guid id)
    {
        return await FotoAusliefern(id);
    }

    /// <summary>
    /// Lädt das Porträtfoto des angegebenen Benutzers aus dem Objektspeicher
    /// (MinIO) und liefert es als Bilddatei aus. Der Browser kann den privaten,
    /// nur intern erreichbaren Speicher nicht direkt aufrufen, daher erfolgt die
    /// Auslieferung serverseitig. Liefert 404, wenn kein Foto hinterlegt ist.
    /// </summary>
    private async Task<IActionResult> FotoAusliefern(Guid userId)
    {
        var benutzer = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (benutzer is null || string.IsNullOrEmpty(benutzer.PortraetPfad))
        {
            return NotFound();
        }

        try
        {
            var (inhalt, contentType) = await _s3.DownloadAsync(benutzer.PortraetPfad);
            return File(inhalt, contentType);
        }
        catch (Amazon.S3.AmazonS3Exception ex)
        {
            _logger.LogError(ex, "Porträtfoto konnte nicht aus S3 geladen werden.");
            return NotFound();
        }
    }

    /// <summary>
    /// DELETE /api/profil/foto – Porträtfoto des eigenen Profils entfernen.
    /// </summary>
    [HttpDelete("foto")]
    public async Task<IActionResult> FotoLoeschen()
    {
        var userId = AktuelleBenutzerId();
        if (userId is null)
        {
            return Unauthorized(new { fehler = "Kein gültiger Benutzer im Token." });
        }

        var benutzer = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value);
        if (benutzer is null)
        {
            return NotFound(new { fehler = "Benutzer nicht gefunden." });
        }

        if (!string.IsNullOrEmpty(benutzer.PortraetPfad))
        {
            try { await _s3.DeleteAsync(benutzer.PortraetPfad); }
            catch { /* Bereinigung ist optional. */ }
            benutzer.PortraetPfad = null;
            await _db.SaveChangesAsync();
        }

        return NoContent();
    }
}
