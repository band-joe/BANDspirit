using System.Text;
using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>
/// REST-Controller für Mail-Verteiler (Verteilerlisten). Route: /api/mailverteiler
///
/// Es gibt drei Varianten:
///   • Kreis        – alle Mitglieder eines Kreises.
///   • Rolle        – eine Rollendefinition über alle Kreise (z. B. alle Lead-Links).
///   • Individuell  – frei gewählte Benutzer aus der Benutzerverwaltung.
///
/// Empfänger werden über die Benutzer-ID geführt; Name und E-Mail-Adresse stammen
/// immer live aus dem Benutzerstamm. Verteiler können als Outlook-kompatible
/// CSV-Datei exportiert werden.
/// </summary>
[ApiController]
[Route("api/mailverteiler")]
[Authorize]
public class MailVerteilerController : ControllerBase
{
    private readonly BandSpiritDbContext _db;
    private readonly ILogger<MailVerteilerController> _logger;

    public MailVerteilerController(BandSpiritDbContext db, ILogger<MailVerteilerController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────

    /// <summary>Eingabe zum Erstellen/Aktualisieren eines Verteilers.</summary>
    public class MailVerteilerEingabe
    {
        public string Name { get; set; } = string.Empty;
        public string? Beschreibung { get; set; }
        public string Typ { get; set; } = MailVerteilerTypen.Individuell;
        public Guid? S3CircleId { get; set; }
        public Guid? S3RollenDefinitionId { get; set; }
        /// <summary>Bei Variante "Individuell": Liste der Benutzer-IDs.</summary>
        public List<Guid>? BenutzerIds { get; set; }
    }

    // ── Liste ────────────────────────────────────────────────────────────────

    /// <summary>GET /api/mailverteiler – Alle Verteiler (Übersicht).</summary>
    [HttpGet]
    public async Task<IActionResult> Liste()
    {
        var verteiler = await _db.MailVerteiler
            .AsNoTracking()
            .OrderBy(v => v.Name)
            .Select(v => new
            {
                id = v.Id,
                name = v.Name,
                beschreibung = v.Beschreibung,
                typ = v.Typ,
                s3CircleId = v.S3CircleId,
                s3RollenDefinitionId = v.S3RollenDefinitionId,
                anzahlIndividuell = v.Mitglieder.Count
            })
            .ToListAsync();

        // Empfängeranzahl je Verteiler auflösen (Kreis/Rolle dynamisch).
        var ergebnis = new List<object>();
        foreach (var v in verteiler)
        {
            var empfaenger = await EmpfaengerAufloesenAsync(v.typ, v.s3CircleId, v.s3RollenDefinitionId, v.id);
            ergebnis.Add(new
            {
                v.id,
                v.name,
                v.beschreibung,
                v.typ,
                v.s3CircleId,
                v.s3RollenDefinitionId,
                empfaengerAnzahl = empfaenger.Count
            });
        }

        return Ok(ergebnis);
    }

    // ── Einzeln ──────────────────────────────────────────────────────────────

    /// <summary>GET /api/mailverteiler/{id} – Ein Verteiler inkl. aufgelöster Empfänger.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Einzeln(Guid id)
    {
        var v = await _db.MailVerteiler
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);
        if (v is null)
        {
            return NotFound(new { fehler = "Verteiler nicht gefunden." });
        }

        var benutzerIds = await _db.MailVerteilerBenutzer
            .AsNoTracking()
            .Where(m => m.MailVerteilerId == id)
            .Select(m => m.UserId)
            .ToListAsync();

        var empfaenger = await EmpfaengerAufloesenAsync(v.Typ, v.S3CircleId, v.S3RollenDefinitionId, id);

        return Ok(new
        {
            id = v.Id,
            name = v.Name,
            beschreibung = v.Beschreibung,
            typ = v.Typ,
            s3CircleId = v.S3CircleId,
            s3RollenDefinitionId = v.S3RollenDefinitionId,
            benutzerIds,
            empfaenger = empfaenger.Select(e => new { id = e.Id, name = e.Name, email = e.Email })
        });
    }

    // ── Erstellen ──────────────────────────────────────────────────────────────

    /// <summary>POST /api/mailverteiler – Neuen Verteiler anlegen.</summary>
    [HttpPost]
    public async Task<IActionResult> Erstellen([FromBody] MailVerteilerEingabe eingabe)
    {
        var validierung = await ValidiereAsync(eingabe, null);
        if (validierung is not null)
        {
            return validierung;
        }

        var v = new MailVerteiler
        {
            Name = eingabe.Name.Trim(),
            Beschreibung = string.IsNullOrWhiteSpace(eingabe.Beschreibung) ? null : eingabe.Beschreibung.Trim(),
            Typ = eingabe.Typ,
            S3CircleId = eingabe.Typ == MailVerteilerTypen.Kreis ? eingabe.S3CircleId : null,
            S3RollenDefinitionId = eingabe.Typ == MailVerteilerTypen.Rolle ? eingabe.S3RollenDefinitionId : null
        };

        if (eingabe.Typ == MailVerteilerTypen.Individuell && eingabe.BenutzerIds is not null)
        {
            foreach (var uid in eingabe.BenutzerIds.Distinct())
            {
                v.Mitglieder.Add(new MailVerteilerBenutzer { UserId = uid });
            }
        }

        _db.MailVerteiler.Add(v);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Einzeln), new { id = v.Id }, new { id = v.Id });
    }

    // ── Aktualisieren ────────────────────────────────────────────────────────

    /// <summary>PUT /api/mailverteiler/{id} – Verteiler aktualisieren.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Aktualisieren(Guid id, [FromBody] MailVerteilerEingabe eingabe)
    {
        var v = await _db.MailVerteiler
            .Include(x => x.Mitglieder)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (v is null)
        {
            return NotFound(new { fehler = "Verteiler nicht gefunden." });
        }

        var validierung = await ValidiereAsync(eingabe, id);
        if (validierung is not null)
        {
            return validierung;
        }

        v.Name = eingabe.Name.Trim();
        v.Beschreibung = string.IsNullOrWhiteSpace(eingabe.Beschreibung) ? null : eingabe.Beschreibung.Trim();
        v.Typ = eingabe.Typ;
        v.S3CircleId = eingabe.Typ == MailVerteilerTypen.Kreis ? eingabe.S3CircleId : null;
        v.S3RollenDefinitionId = eingabe.Typ == MailVerteilerTypen.Rolle ? eingabe.S3RollenDefinitionId : null;

        // APP-20 (P005): Individuelle Mitglieder per Set-Differenz aktualisieren.
        // RemoveRange + Clear + neue Instanzen erzeugen DbUpdateConcurrencyException,
        // weil EF Core die neuen Einträge als "Added" markiert, während die alten
        // bereits auf "Deleted" stehen. Stattdessen: nur departurierte Zeilen entfernen,
        // nur neue Zeilen hinzufügen – bestehende unverändert lassen (kein Konflikt).
        var gewuenschteIds = (eingabe.Typ == MailVerteilerTypen.Individuell && eingabe.BenutzerIds is not null)
            ? eingabe.BenutzerIds.Distinct().ToHashSet()
            : new HashSet<Guid>();

        var vorhandeneIds = v.Mitglieder.Select(m => m.UserId).ToHashSet();

        // Entfernen: in DB vorhanden, aber nicht mehr gewünscht.
        var zuEntfernen = v.Mitglieder.Where(m => !gewuenschteIds.Contains(m.UserId)).ToList();
        _db.MailVerteilerBenutzer.RemoveRange(zuEntfernen);

        // Hinzufügen: gewünscht, aber noch nicht vorhanden.
        foreach (var uid in gewuenschteIds.Where(id => !vorhandeneIds.Contains(id)))
        {
            _db.MailVerteilerBenutzer.Add(new MailVerteilerBenutzer { UserId = uid, MailVerteilerId = v.Id });
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Löschen ────────────────────────────────────────────────────────────────

    /// <summary>DELETE /api/mailverteiler/{id} – Verteiler löschen.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Loeschen(Guid id)
    {
        var v = await _db.MailVerteiler.FirstOrDefaultAsync(x => x.Id == id);
        if (v is null)
        {
            return NotFound(new { fehler = "Verteiler nicht gefunden." });
        }

        _db.MailVerteiler.Remove(v);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ── Auswahl-Optionen (Dropdowns) ───────────────────────────────────────────

    /// <summary>
    /// GET /api/mailverteiler/auswahl – Optionen für die Formulare:
    /// Kreise, Rollendefinitionen (aktiv) und Benutzer (aktiv).
    /// </summary>
    [HttpGet("auswahl")]
    public async Task<IActionResult> Auswahl()
    {
        var kreise = await _db.S3Circles
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new { id = c.Id, name = c.Name })
            .ToListAsync();

        var rollen = await _db.S3RollenDefinitionen
            .AsNoTracking()
            .Where(r => r.Aktiv)
            .OrderBy(r => r.SortOrder).ThenBy(r => r.Name)
            .Select(r => new { id = r.Id, name = r.Name })
            .ToListAsync();

        var benutzer = await _db.Users
            .AsNoTracking()
            .Where(u => u.Aktiv)
            .OrderBy(u => u.Name)
            .Select(u => new { id = u.Id, name = u.Name, email = u.Email })
            .ToListAsync();

        return Ok(new { kreise, rollen, benutzer });
    }

    // ── Outlook-Export ─────────────────────────────────────────────────────────

    /// <summary>
    /// GET /api/mailverteiler/{id}/export – Exportiert die Empfänger als
    /// Outlook-kompatible CSV-Datei (Spalten "Name" und "E-mail Address").
    /// Diese Kopfzeilen entsprechen dem Import-Format der Outlook-Kontakte.
    /// </summary>
    [HttpGet("{id:guid}/export")]
    public async Task<IActionResult> Export(Guid id)
    {
        var v = await _db.MailVerteiler.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (v is null)
        {
            return NotFound(new { fehler = "Verteiler nicht gefunden." });
        }

        var empfaenger = await EmpfaengerAufloesenAsync(v.Typ, v.S3CircleId, v.S3RollenDefinitionId, id);

        var sb = new StringBuilder();
        // Outlook-Import-Kopfzeile (englische Feldnamen sind für den Import erforderlich).
        sb.AppendLine("Name,E-mail Address");
        foreach (var e in empfaenger)
        {
            sb.Append(CsvFeld(e.Name)).Append(',').Append(CsvFeld(e.Email)).Append("\r\n");
        }

        // UTF-8 mit BOM, damit Outlook/Excel Umlaute korrekt darstellen.
        var bytes = new UTF8Encoding(true).GetBytes(sb.ToString());
        var dateiname = DateinameBereinigen(v.Name) + ".csv";
        return File(bytes, "text/csv; charset=utf-8", dateiname);
    }

    // ── Hilfsfunktionen ────────────────────────────────────────────────────────

    /// <summary>
    /// Löst die Empfänger eines Verteilers anhand seiner Variante auf.
    /// Die E-Mail-Adresse stammt immer aus dem Benutzerstamm.
    /// </summary>
    private async Task<List<User>> EmpfaengerAufloesenAsync(
        string typ, Guid? s3CircleId, Guid? s3RollenDefinitionId, Guid verteilerId)
    {
        IQueryable<User> query;

        switch (typ)
        {
            case MailVerteilerTypen.Kreis when s3CircleId is not null:
                query = _db.S3PersonRoleAssignments
                    .AsNoTracking()
                    .Where(pra => pra.Role != null && pra.Role.CircleId == s3CircleId.Value && pra.User != null)
                    .Select(pra => pra.User!);
                break;

            case MailVerteilerTypen.Rolle when s3RollenDefinitionId is not null:
                query = _db.S3PersonRoleAssignments
                    .AsNoTracking()
                    .Where(pra => pra.Role != null
                                  && pra.Role.RollenDefinitionId == s3RollenDefinitionId.Value
                                  && pra.User != null)
                    .Select(pra => pra.User!);
                break;

            case MailVerteilerTypen.Individuell:
                query = _db.MailVerteilerBenutzer
                    .AsNoTracking()
                    .Where(m => m.MailVerteilerId == verteilerId && m.User != null)
                    .Select(m => m.User!);
                break;

            default:
                return new List<User>();
        }

        // Nur aktive Benutzer, eindeutig, alphabetisch.
        return await query
            .Where(u => u.Aktiv)
            .Distinct()
            .OrderBy(u => u.Name)
            .ToListAsync();
    }

    /// <summary>Validiert die Eingabe (eindeutiger Name, variantenspezifische Referenzen).</summary>
    private async Task<IActionResult?> ValidiereAsync(MailVerteilerEingabe eingabe, Guid? eigeneId)
    {
        if (string.IsNullOrWhiteSpace(eingabe.Name))
        {
            return BadRequest(new { fehler = "Der Name darf nicht leer sein." });
        }

        var name = eingabe.Name.Trim();
        var nameExistiert = await _db.MailVerteiler
            .AnyAsync(v => v.Name.ToLower() == name.ToLower() && (eigeneId == null || v.Id != eigeneId.Value));
        if (nameExistiert)
        {
            return Conflict(new { fehler = "Es existiert bereits ein Verteiler mit diesem Namen." });
        }

        switch (eingabe.Typ)
        {
            case MailVerteilerTypen.Kreis:
                if (eingabe.S3CircleId is null)
                {
                    return BadRequest(new { fehler = "Für die Variante \"Kreis\" muss ein Kreis gewählt werden." });
                }
                if (!await _db.S3Circles.AnyAsync(c => c.Id == eingabe.S3CircleId.Value))
                {
                    return BadRequest(new { fehler = "Der gewählte Kreis wurde nicht gefunden." });
                }
                break;

            case MailVerteilerTypen.Rolle:
                if (eingabe.S3RollenDefinitionId is null)
                {
                    return BadRequest(new { fehler = "Für die Variante \"Rolle\" muss eine Rolle gewählt werden." });
                }
                if (!await _db.S3RollenDefinitionen.AnyAsync(r => r.Id == eingabe.S3RollenDefinitionId.Value))
                {
                    return BadRequest(new { fehler = "Die gewählte Rolle wurde nicht gefunden." });
                }
                break;

            case MailVerteilerTypen.Individuell:
                if (eingabe.BenutzerIds is null || eingabe.BenutzerIds.Count == 0)
                {
                    return BadRequest(new { fehler = "Für die Variante \"Individuell\" muss mindestens ein Benutzer gewählt werden." });
                }
                break;

            default:
                return BadRequest(new { fehler = "Unbekannte Verteiler-Variante." });
        }

        return null;
    }

    /// <summary>Maskiert ein CSV-Feld gemäss RFC 4180 (Anführungszeichen bei Sonderzeichen).</summary>
    private static string CsvFeld(string? wert)
    {
        var w = wert ?? string.Empty;
        if (w.Contains('"') || w.Contains(',') || w.Contains('\n') || w.Contains('\r'))
        {
            return "\"" + w.Replace("\"", "\"\"") + "\"";
        }
        return w;
    }

    /// <summary>Erzeugt einen dateisystemtauglichen Dateinamen aus dem Verteilernamen.</summary>
    private static string DateinameBereinigen(string name)
    {
        var ungueltig = Path.GetInvalidFileNameChars();
        var bereinigt = new string(name.Select(c => ungueltig.Contains(c) ? '_' : c).ToArray());
        return string.IsNullOrWhiteSpace(bereinigt) ? "verteiler" : bereinigt;
    }
}
