// V1.0.4 / V1.0.4.1 — Hilfsfunktionen für KPI

/**
 * Berechnet die Abweichung (absolut und in Prozent) eines KPI
 * aus Ziel- und Ist-Wert. Gibt null zurück, wenn Werte fehlen.
 */
export function computeKpiDeviation(
  zielwert: number | null | undefined,
  istWert: number | null | undefined,
): { abweichungAbsolut: number | null; abweichungProzent: number | null } {
  if (zielwert === null || zielwert === undefined || istWert === null || istWert === undefined) {
    return { abweichungAbsolut: null, abweichungProzent: null };
  }
  const abweichungAbsolut = Math.round((istWert - zielwert) * 100) / 100;
  let abweichungProzent: number | null = null;
  if (zielwert !== 0) {
    abweichungProzent = Math.round(((istWert - zielwert) / zielwert) * 100 * 100) / 100;
  }
  return { abweichungAbsolut, abweichungProzent };
}

/**
 * Leitet den Trend aus dem vorherigen und dem aktuellen Ist-Wert ab.
 */
export function computeTrend(
  prevIst: number | null | undefined,
  currIst: number | null | undefined,
): 'STEIGEND' | 'FALLEND' | 'STABIL' {
  if (prevIst === null || prevIst === undefined || currIst === null || currIst === undefined) {
    return 'STABIL';
  }
  if (currIst > prevIst) return 'STEIGEND';
  if (currIst < prevIst) return 'FALLEND';
  return 'STABIL';
}
