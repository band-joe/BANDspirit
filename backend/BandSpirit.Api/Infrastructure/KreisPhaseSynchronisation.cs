using BandSpirit.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BandSpirit.Api.Infrastructure;

/// <summary>
/// APP-11-Fix: Zentrale Ableitung der denormalisierten "aktuellen Phase"
/// (<see cref="Models.S3Circle.LifecyclePhase"/>) aus der Lebenszyklus-Historie
/// (<see cref="Models.S3CircleLebenszyklus"/>). Muss nach JEDER Änderung an der
/// Historie eines Kreises aufgerufen werden (Anlegen, Bearbeiten, Löschen,
/// Verschieben auf einen anderen Kreis) sowie nach einer Umbenennung einer
/// Lebenszyklus-Phase, sonst kann die angezeigte Phase von der Historie abweichen.
///
/// Semantik: "jüngster Eintrag gewinnt" (nach StartDatum), nicht "zum aktuellen
/// Zeitpunkt gültiger Eintrag" - ein Eintrag mit zukünftigem Startdatum gilt
/// bereits als aktuelle Phase. Das entspricht dem bisherigen Verhalten beim
/// Anlegen. Bei gleichem Startdatum entscheidet zuerst CreatedAt, danach Id
/// als deterministische letzte Instanz.
/// </summary>
internal static class KreisPhaseSynchronisation
{
    /// <summary>
    /// Setzt Circle.LifecyclePhase auf den Namen der Phase des jüngsten
    /// Lebenszyklus-Eintrags des Kreises, oder auf null, wenn keine Historie
    /// (mehr) existiert. Ruft KEIN SaveChangesAsync auf - das obliegt dem Aufrufer.
    /// </summary>
    public static async Task AktualisierePhaseAsync(BandSpiritDbContext db, Guid circleId)
    {
        var circle = await db.S3Circles.FirstOrDefaultAsync(c => c.Id == circleId);
        if (circle is null)
        {
            return;
        }

        var juengsterEintrag = await db.S3CircleLebenszyklen
            .Where(l => l.S3CircleId == circleId)
            .OrderByDescending(l => l.StartDatum)
            .ThenByDescending(l => l.CreatedAt)
            .ThenByDescending(l => l.Id)
            .Select(l => new { l.LebenszyklusPhaseId })
            .FirstOrDefaultAsync();

        if (juengsterEintrag is null)
        {
            circle.LifecyclePhase = null;
            return;
        }

        circle.LifecyclePhase = await db.S3LebenszyklusPhasen
            .Where(p => p.Id == juengsterEintrag.LebenszyklusPhaseId)
            .Select(p => p.Name)
            .FirstOrDefaultAsync();
    }
}
