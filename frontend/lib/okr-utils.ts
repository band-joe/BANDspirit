// lib/okr-utils.ts
// Frontend-Hilfsfunktionen für OKR / Key Results (V1.0.2)
// Hinweis: recomputeOkrProgress() wurde entfernt — diese Berechnung erfolgt jetzt im C#-Backend.

/**
 * Berechnet den Fortschritt (%) eines Key Results aus Start-, Ziel- und Ist-Wert.
 * Ergebnis wird auf 0..100 begrenzt und gerundet.
 */
export function computeKeyResultProgress(
  startwert: number | null | undefined,
  zielwert: number | null | undefined,
  aktuellerWert: number | null | undefined,
): number {
  if (
    zielwert === null ||
    zielwert === undefined ||
    aktuellerWert === null ||
    aktuellerWert === undefined
  ) {
    return 0;
  }
  const start = startwert ?? 0;
  if (zielwert === start) {
    return aktuellerWert >= zielwert ? 100 : 0;
  }
  const pct = ((aktuellerWert - start) / (zielwert - start)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/**
 * Aggregiert den OKR-Fortschritt als Durchschnitt der Key-Result-Fortschritte.
 */
export function aggregateOkrProgress(keyResultProgress: number[]): number {
  if (!keyResultProgress.length) return 0;
  const sum = keyResultProgress.reduce((a, b) => a + b, 0);
  return Math.round(sum / keyResultProgress.length);
}
