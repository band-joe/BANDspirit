using System.Text;
using System.Text.RegularExpressions;
using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>OData-Controller für BI-Kompass-Versionen (GET + POST). Route: /odata/BiKompassVersions</summary>
[Authorize]
public class BiKompassVersionsController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public BiKompassVersionsController(BandSpiritDbContext db) => _db = db;

    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.BiGuideRead)]
    public IQueryable<BIKompassVersion> Get() => _db.BIKompassVersionen.AsQueryable();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.BiGuideRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.BIKompassVersionen.FirstOrDefaultAsync(v => v.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    /// <summary>
    /// POST /odata/BiKompassVersions – Neue Version veröffentlichen.
    /// </summary>
    /// <remarks>
    /// UI-26-Fix: Es gab zuvor keinerlei Mechanismus, der eine neu
    /// veröffentlichte Version aktiv setzt (IsAktiv wurde vom Client nie
    /// gesendet, defaultete auf false) - "Veröffentlichen" hatte dadurch nie
    /// sichtbare Wirkung. Neue Version wird jetzt atomar aktiv gesetzt, alle
    /// anderen deaktiviert (genau eine aktive Version zu jedem Zeitpunkt).
    /// </remarks>
    [HttpPost]
    [Authorize(Policy = Permissions.BiGuideManage)]
    public async Task<IActionResult> Post([FromBody] BIKompassVersion eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        eintrag.IsAktiv = true;

        await using var tx = await _db.Database.BeginTransactionAsync();
        await _db.BIKompassVersionen.Where(v => v.IsAktiv).ExecuteUpdateAsync(s => s.SetProperty(v => v.IsAktiv, false));
        _db.BIKompassVersionen.Add(eintrag);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        return Created(eintrag);
    }
}

/// <summary>
/// REST-Controller für den BI-Kompass-PDF-Upload.
/// Route: /api/bi-kompass
/// Nimmt eine hochgeladene PDF-Datei entgegen, extrahiert deren Text mit
/// UglyToad.PdfPig, bereitet ihn anhand der Kapitel-Nummerierung als Markdown
/// auf und liefert das Ergebnis als <c>{ markdown: "…" }</c> zurück. Das
/// Frontend zerlegt dieses Markdown anschließend in Kapitel.
/// </summary>
[ApiController]
[Route("api/bi-kompass")]
[Authorize]
public class BiKompassUploadController : ControllerBase
{
    /// <summary>Maximal zulässige Dateigröße für den Upload (20 MB).</summary>
    private const long MaxDateiGroesse = 20L * 1024 * 1024;

    /// <summary>
    /// Erkennt Zeilen, die mit einer Kapitel-Nummerierung beginnen, z. B.
    /// "1.", "1.1", "1.1.1." – optional gefolgt von einem Titel. Gruppe
    /// "nummer" enthält die Ziffernfolge (ohne abschließenden Punkt),
    /// Gruppe "titel" den restlichen Text der Zeile.
    /// </summary>
    private static readonly Regex KapitelMuster = new(
        @"^\s*(?<nummer>\d+(?:\.\d+)*)\.?\s+(?<titel>\S.*)$",
        RegexOptions.Compiled);

    /// <summary>
    /// POST /api/bi-kompass/upload – Nimmt eine PDF-Datei (Feld <c>file</c>,
    /// multipart/form-data) entgegen, extrahiert den Text und liefert ihn als
    /// Markdown mit erkannter Kapitelstruktur zurück.
    /// </summary>
    [HttpPost("upload")]
    [Authorize(Policy = Permissions.BiGuideManage)]
    [RequestSizeLimit(MaxDateiGroesse)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        // 1. Grundlegende Validierung: Datei vorhanden und nicht leer.
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { fehler = "Keine Datei übermittelt." });
        }

        // 2. Größenbegrenzung (zusätzlich zum RequestSizeLimit als klare Meldung).
        if (file.Length > MaxDateiGroesse)
        {
            return BadRequest(new { fehler = "Die Datei ist größer als 20 MB." });
        }

        // 3. Nur PDF zulassen (Content-Type oder Dateiendung).
        var istPdf = string.Equals(file.ContentType, "application/pdf", StringComparison.OrdinalIgnoreCase)
                     || file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase);
        if (!istPdf)
        {
            return BadRequest(new { fehler = "Es sind nur PDF-Dateien erlaubt." });
        }

        // 4. Datei in den Speicher lesen (PdfPig benötigt ein byte[] oder Stream).
        byte[] daten;
        using (var speicher = new MemoryStream())
        {
            await file.CopyToAsync(speicher);
            daten = speicher.ToArray();
        }

        // 5. Text seitenweise extrahieren und als Markdown aufbereiten.
        string markdown;
        try
        {
            markdown = PdfAlsMarkdown(daten);
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                fehler = "Die PDF-Datei konnte nicht verarbeitet werden. "
                       + "Bitte prüfen Sie, ob es sich um eine gültige, nicht "
                       + "geschützte PDF handelt.",
                detail = ex.Message
            });
        }

        return Ok(new { markdown });
    }

    /// <summary>
    /// Extrahiert den Text der PDF seitenweise mit UglyToad.PdfPig und bereitet
    /// ihn als Markdown auf. Zeilen, die mit einer Kapitel-Nummerierung beginnen
    /// (z. B. "1.", "1.1.", "1.1.1."), werden zu Überschriften der passenden
    /// Ebene (H1/H2/H3 …); alle übrigen Zeilen bleiben normaler Fließtext.
    /// Leerzeilen werden beibehalten.
    /// </summary>
    private static string PdfAlsMarkdown(byte[] daten)
    {
        var ausgabe = new StringBuilder();

        using var dokument = PdfDocument.Open(daten);
        foreach (var seite in dokument.GetPages())
        {
            // Der ContentOrderTextExtractor steht in diesem Paketstand nicht zur
            // Verfügung, daher werden die Zeilen aus den Wortpositionen
            // rekonstruiert: Wörter mit annähernd gleicher vertikaler Position
            // (Grundlinie) bilden eine Zeile, von oben nach unten sortiert.
            var zeilen = ZeilenAusWoertern(seite);
            foreach (var zeile in zeilen)
            {
                // Leerzeilen unverändert übernehmen (Absatztrennung).
                if (string.IsNullOrWhiteSpace(zeile))
                {
                    ausgabe.AppendLine();
                    continue;
                }

                var treffer = KapitelMuster.Match(zeile);
                if (treffer.Success)
                {
                    var nummer = treffer.Groups["nummer"].Value;
                    var titel = treffer.Groups["titel"].Value.Trim();

                    // Überschriftenebene aus der Anzahl der Nummernsegmente
                    // ableiten: "1" → H1, "1.1" → H2, "1.1.1" → H3 … (max. H6).
                    var ebene = Math.Min(nummer.Split('.').Length, 6);
                    var rauten = new string('#', ebene);
                    ausgabe.AppendLine($"{rauten} {nummer}. {titel}");
                }
                else
                {
                    ausgabe.AppendLine(zeile.Trim());
                }
            }

            // Nach jeder Seite eine Leerzeile als Trennung einfügen.
            ausgabe.AppendLine();
        }

        return ausgabe.ToString().Trim();
    }

    /// <summary>
    /// Rekonstruiert die Textzeilen einer PDF-Seite aus den einzelnen Wörtern.
    /// PdfPig liefert Wörter mit Positionsangabe (BoundingBox); Wörter mit
    /// annähernd gleicher vertikaler Grundlinie werden zu einer Zeile
    /// zusammengefasst. Die Zeilen werden von oben nach unten, die Wörter
    /// innerhalb einer Zeile von links nach rechts sortiert.
    /// </summary>
    private static List<string> ZeilenAusWoertern(Page seite)
    {
        // Toleranz in PDF-Punkten, innerhalb derer zwei Wörter derselben Zeile
        // zugeordnet werden (kompensiert leichte Grundlinien-Schwankungen).
        const double ZeilenToleranz = 3.0;

        var woerter = seite.GetWords()
            .Where(w => !string.IsNullOrWhiteSpace(w.Text))
            .ToList();
        if (woerter.Count == 0)
        {
            return new List<string>();
        }

        // Wörter nach fallender vertikaler Position (oben zuerst) gruppieren.
        var zeilenGruppen = new List<(double Oben, List<Word> Woerter)>();
        foreach (var wort in woerter.OrderByDescending(w => w.BoundingBox.Bottom))
        {
            var y = wort.BoundingBox.Bottom;
            var gruppe = zeilenGruppen
                .FirstOrDefault(g => Math.Abs(g.Oben - y) <= ZeilenToleranz);
            if (gruppe.Woerter is null)
            {
                zeilenGruppen.Add((y, new List<Word> { wort }));
            }
            else
            {
                gruppe.Woerter.Add(wort);
            }
        }

        var zeilen = new List<string>();
        foreach (var gruppe in zeilenGruppen.OrderByDescending(g => g.Oben))
        {
            var text = string.Join(
                " ",
                gruppe.Woerter
                    .OrderBy(w => w.BoundingBox.Left)
                    .Select(w => w.Text));
            zeilen.Add(text.Trim());
        }

        return zeilen;
    }
}
