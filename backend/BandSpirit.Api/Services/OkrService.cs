using BandSpirit.Api.Models;

namespace BandSpirit.Api.Services;

/// <summary>
/// Hilfsfunktionen rund um OKRs, z. B. Fortschrittsberechnung aus Key Results.
/// </summary>
public class OkrService
{
    /// <summary>
    /// Berechnet den durchschnittlichen Fortschritt eines OKR (0–100)
    /// anhand der zugehörigen Key Results.
    /// </summary>
    public int BerechneFortschritt(IEnumerable<KeyResult> keyResults)
    {
        var liste = keyResults.ToList();
        if (liste.Count == 0)
        {
            return 0;
        }

        double summe = 0;
        foreach (var kr in liste)
        {
            var spanne = kr.ZielWert - kr.StartWert;
            var fortschritt = Math.Abs(spanne) < 0.0001
                ? 100
                : (kr.IstWert - kr.StartWert) / spanne * 100;
            summe += Math.Clamp(fortschritt, 0, 100);
        }
        return (int)Math.Round(summe / liste.Count);
    }
}
