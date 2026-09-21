using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>
/// REST-Controller für die Kreis-Lebenszyklus-Übersicht (UI-30, P005).
/// Route: /api/org/circle-lifecycle
/// </summary>
/// <remarks>
/// Reduzierter Funktionsumfang: liefert die Kreisliste mit den fürs Frontend
/// tatsächlich benötigten Feldern/Zählern und erlaubt das Erfassen eines
/// Reviews bzw. das direkte Setzen der Lifecycle-Phase. Die im ursprünglichen
/// Frontend-Entwurf vorgesehenen aggregierten Prozent-KPIs (Zweck+LeadLink-
/// Quote, Review-Quote etc.) werden bewusst NICHT serverseitig berechnet -
/// das Frontend leitet die paar angezeigten Kennzahlen direkt aus der
/// Kreisliste ab.
/// </remarks>
[ApiController]
[Route("api/org/circle-lifecycle")]
[Authorize]
public class CircleLifecycleController : ControllerBase
{
    private static readonly TimeSpan ReviewIntervall = TimeSpan.FromDays(90);

    private readonly BandSpiritDbContext _db;

    public CircleLifecycleController(BandSpiritDbContext db) => _db = db;

    public class CircleLifecycleDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Purpose { get; set; }
        public bool IsActive { get; set; }
        public string LifecyclePhase { get; set; } = "BETRIEB";
        public DateTime? LastReviewDate { get; set; }
        public DateTime? NextReviewDate { get; set; }
        public string? ParentName { get; set; }
        public bool HasPurpose { get; set; }
        public bool HasLeadLink { get; set; }
        public bool NeedsReview { get; set; }
        public int OpenDrivers { get; set; }
        public LeadLinkDto? LeadLink { get; set; }
        public CircleCountsDto Count { get; set; } = new();
        public List<CircleReviewDto> RecentReviews { get; set; } = new();
    }

    public class LeadLinkDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class CircleCountsDto
    {
        public int Roles { get; set; }
        public int CircleReviews { get; set; }
    }

    public class CircleReviewDto
    {
        public Guid Id { get; set; }
        public DateTime ReviewDatum { get; set; }
        public string? Ergebnis { get; set; }
        public string? Notizen { get; set; }
        public string? Massnahmen { get; set; }
        public string? CreatedByName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>GET /api/org/circle-lifecycle – Liste aller Kreise mit Lifecycle-Infos.</summary>
    [HttpGet]
    [Authorize(Policy = Permissions.CircleRead)]
    public async Task<IActionResult> Get()
    {
        var jetzt = DateTime.UtcNow;

        var kreise = await _db.S3Circles.AsNoTracking().ToListAsync();
        var kreisById = kreise.ToDictionary(c => c.Id);
        var kreisIds = kreise.Select(c => c.Id).ToList();

        var rollenProKreis = await _db.S3Roles.AsNoTracking()
            .Include(r => r.RollenDefinition)
            .Where(r => kreisIds.Contains(r.CircleId))
            .ToListAsync();

        var offeneSpannungenProKreis = await _db.S3Drivers.AsNoTracking()
            .Where(d => d.Status != "ERLEDIGT")
            .GroupBy(d => d.CircleId)
            .Select(g => new { CircleId = g.Key, Anzahl = g.Count() })
            .ToDictionaryAsync(g => g.CircleId, g => g.Anzahl);

        var reviewsProKreis = await _db.S3CircleReviews.AsNoTracking()
            .Where(r => kreisIds.Contains(r.CircleId))
            .OrderByDescending(r => r.ReviewDatum)
            .ToListAsync();

        // In-Memory-Abgleich statt Guid<->string-Vergleich in der SQL-Übersetzung
        // (CreatedById ist ein string, User.Id ein Guid - EF/Npgsql übersetzt
        // .ToString()-Vergleiche in LINQ-Queries nicht zuverlässig).
        var erstellerIdSet = reviewsProKreis
            .Select(r => r.CreatedById)
            .Where(id => !string.IsNullOrEmpty(id))
            .ToHashSet();
        var alleBenutzer = await _db.Users.AsNoTracking()
            .Select(u => new { u.Id, u.Name })
            .ToListAsync();
        var erstellerNamen = alleBenutzer
            .Where(u => erstellerIdSet.Contains(u.Id.ToString()))
            .ToDictionary(u => u.Id.ToString(), u => u.Name);

        var leadLinkRoleIds = rollenProKreis
            .Where(r => r.RollenDefinition?.IsLeadLink == true)
            .Select(r => r.Id)
            .ToList();
        var leadLinkZuweisungen = await _db.S3PersonRoleAssignments.AsNoTracking()
            .Where(a => leadLinkRoleIds.Contains(a.RoleId))
            .Include(a => a.User)
            .ToListAsync();

        var ergebnis = kreise.Select(c =>
        {
            var eigeneRollen = rollenProKreis.Where(r => r.CircleId == c.Id).ToList();
            var leadLinkRolleIds = eigeneRollen.Where(r => r.RollenDefinition?.IsLeadLink == true).Select(r => r.Id).ToHashSet();
            var leadLinkZuweisung = leadLinkZuweisungen.FirstOrDefault(a => leadLinkRolleIds.Contains(a.RoleId));
            var eigeneReviews = reviewsProKreis.Where(r => r.CircleId == c.Id).ToList();
            var parentName = c.ParentId.HasValue && kreisById.TryGetValue(c.ParentId.Value, out var parent) ? parent.Name : null;

            return new CircleLifecycleDto
            {
                Id = c.Id,
                Name = c.Name,
                Purpose = c.Zweck,
                IsActive = c.IsActive,
                LifecyclePhase = c.LifecyclePhase ?? "BETRIEB",
                LastReviewDate = c.LastReviewDate,
                NextReviewDate = c.NextReviewDate,
                ParentName = parentName,
                HasPurpose = !string.IsNullOrWhiteSpace(c.Zweck),
                HasLeadLink = leadLinkZuweisung is not null,
                NeedsReview = c.IsActive && (c.LastReviewDate is null || jetzt - c.LastReviewDate.Value > ReviewIntervall),
                OpenDrivers = offeneSpannungenProKreis.GetValueOrDefault(c.Id, 0),
                LeadLink = leadLinkZuweisung is not null
                    ? new LeadLinkDto { Id = leadLinkZuweisung.UserId, Name = leadLinkZuweisung.User?.Name ?? "" }
                    : null,
                Count = new CircleCountsDto
                {
                    Roles = eigeneRollen.Count,
                    CircleReviews = eigeneReviews.Count,
                },
                RecentReviews = eigeneReviews.Take(5).Select(r => new CircleReviewDto
                {
                    Id = r.Id,
                    ReviewDatum = r.ReviewDatum,
                    Ergebnis = r.Ergebnis,
                    Notizen = r.Notizen,
                    Massnahmen = r.Massnahmen,
                    CreatedByName = r.CreatedById is not null ? erstellerNamen.GetValueOrDefault(r.CreatedById) : null,
                    CreatedAt = r.CreatedAt,
                }).ToList(),
            };
        }).ToList();

        return Ok(new { circles = ergebnis });
    }

    public class AktionRequest
    {
        public string Action { get; set; } = string.Empty;
        public Guid CircleId { get; set; }
        public string? Ergebnis { get; set; }
        public string? Notizen { get; set; }
        public string? Massnahmen { get; set; }
        public string? Phase { get; set; }
    }

    private static readonly HashSet<string> GueltigeErgebnisse = new(StringComparer.OrdinalIgnoreCase)
    {
        "WEITERFUEHREN", "KONSOLIDIEREN", "ARCHIVIEREN",
    };

    private static readonly HashSet<string> GueltigePhasen = new(StringComparer.OrdinalIgnoreCase)
    {
        "ANLAGE", "BETRIEB", "REVIEW", "ARCHIVIERT",
    };

    /// <summary>
    /// POST /api/org/circle-lifecycle – Review erfassen ("action":"review")
    /// oder Lifecycle-Phase direkt setzen ("action":"phase").
    /// </summary>
    [HttpPost]
    [Authorize(Policy = Permissions.CircleUpdate)]
    public async Task<IActionResult> Post([FromBody] AktionRequest anfrage)
    {
        var kreis = await _db.S3Circles.FirstOrDefaultAsync(c => c.Id == anfrage.CircleId);
        if (kreis is null)
        {
            return NotFound(new { fehler = "Kreis wurde nicht gefunden." });
        }

        switch (anfrage.Action?.ToLowerInvariant())
        {
            case "review":
                if (string.IsNullOrEmpty(anfrage.Ergebnis) || !GueltigeErgebnisse.Contains(anfrage.Ergebnis))
                {
                    return BadRequest(new { fehler = "Ungültiges oder fehlendes Review-Ergebnis." });
                }

                var jetzt = DateTime.UtcNow;
                _db.S3CircleReviews.Add(new S3CircleReview
                {
                    CircleId = kreis.Id,
                    ReviewDatum = jetzt,
                    Ergebnis = anfrage.Ergebnis,
                    Notizen = anfrage.Notizen,
                    Massnahmen = anfrage.Massnahmen,
                });
                kreis.LastReviewDate = jetzt;

                if (string.Equals(anfrage.Ergebnis, "ARCHIVIEREN", StringComparison.OrdinalIgnoreCase))
                {
                    kreis.LifecyclePhase = "ARCHIVIERT";
                    kreis.IsActive = false;
                }

                await _db.SaveChangesAsync();
                return Ok(new { nachricht = "Review gespeichert." });

            case "phase":
                if (string.IsNullOrEmpty(anfrage.Phase) || !GueltigePhasen.Contains(anfrage.Phase))
                {
                    return BadRequest(new { fehler = "Ungültige Lifecycle-Phase." });
                }
                kreis.LifecyclePhase = anfrage.Phase;
                await _db.SaveChangesAsync();
                return Ok(new { nachricht = "Phase aktualisiert." });

            default:
                return BadRequest(new { fehler = "Unbekannte Aktion. Erlaubt: 'review', 'phase'." });
        }
    }
}
