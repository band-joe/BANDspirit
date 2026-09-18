using BandSpirit.Api.Models;

namespace BandSpirit.Api.Services;

/// <summary>
/// Hilfsfunktionen rund um Kennzahlen (KPI), z. B. Statusberechnung.
/// </summary>
public class KpiService
{
    /// <summary>
    /// Berechnet den Ampelstatus (GRUEN/GELB/ROT) anhand der Schwellenwerte und der Richtung.
    /// </summary>
    public string BerechneStatus(KpiDefinition definition, double istWert)
    {
        var richtung = definition.Richtung ?? "HOEHER_BESSER";

        return richtung switch
        {
            "NIEDRIGER_BESSER" =>
                // Niedrigere Werte sind besser → Schwellen als Obergrenzen
                definition.KritischeSchwelle.HasValue && istWert >= definition.KritischeSchwelle.Value ? "ROT" :
                definition.Warnschwelle.HasValue && istWert >= definition.Warnschwelle.Value ? "GELB" :
                "GRUEN",

            "ZIELBAND" =>
                // Warnschwelle = Untergrenze des Bands, KritischeSchwelle = Obergrenze des Bands
                (definition.Warnschwelle.HasValue && istWert < definition.Warnschwelle.Value) ||
                (definition.KritischeSchwelle.HasValue && istWert > definition.KritischeSchwelle.Value) ? "ROT" :
                "GRUEN",

            _ => // HOEHER_BESSER (Standard, rückwärtskompatibel)
                // Höhere Werte sind besser → Schwellen als Untergrenzen
                definition.KritischeSchwelle.HasValue && istWert <= definition.KritischeSchwelle.Value ? "ROT" :
                definition.Warnschwelle.HasValue && istWert <= definition.Warnschwelle.Value ? "GELB" :
                "GRUEN",
        };
    }

    /// <summary>
    /// Berechnet den Trend einer neuen Messung anhand der letzten vorhandenen Messwerte.
    /// Gibt STEIGEND / FALLEND / STABIL zurück.
    /// </summary>
    /// <param name="neuerWert">Der neu erfasste Istwert.</param>
    /// <param name="vorherigeWerte">Vorherige Istwerte, absteigend nach Datum sortiert (jüngster zuerst).</param>
    public string BerechneTrend(double neuerWert, IEnumerable<double> vorherigeWerte)
    {
        var werte = vorherigeWerte as IList<double> ?? vorherigeWerte.ToList();
        if (werte.Count == 0) return "STABIL";
        var letzte = werte[0]; // bereits absteigend sortiert → jüngster zuerst
        if (neuerWert > letzte) return "STEIGEND";
        if (neuerWert < letzte) return "FALLEND";
        return "STABIL";
    }
}
