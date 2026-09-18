/**
 * lib/dashboard-helpers.ts
 * Dashboard-spezifische Hilfsfunktionen.
 *
 * Ziel (CC-M6): Aggregations- und Darstellungslogik aus der Dashboard-Seite
 * in eigenständige, testbare Funktionen auslagern (< 40 Zeilen pro Funktion).
 */

import { DashboardStats, DashboardNewsItem, DashboardCircleReview } from './types';

// ─────────────────────────────── Stat-Karten ──────────────────────────────────

/**
 * Konfiguration einer einzelnen Stat-Karte auf dem Dashboard.
 * Wird von `buildStatCards()` erzeugt und in der UI iteriert.
 */
export interface StatCardConfig {
  /** Anzeigebezeichnung der Kennzahl */
  label: string;
  /** Primärer (grosser) Wert */
  value: number;
  /** Sekundärer Zusatztext, z. B. "X gesamt" */
  subtext: string;
  /** Tailwind-Farbe für den Icon-Hintergrund, z. B. "bg-blue-50" */
  iconBg: string;
  /** Tailwind-Farbe für das Icon selbst, z. B. "text-blue-600" */
  iconColor: string;
  /** Unique key für React-Listen */
  key: string;
}

/**
 * Erzeugt die vier Stat-Karten-Konfigurationen aus den Dashboard-Statistiken.
 *
 * @param stats - Aggregierte Statistiken vom `/api/dashboard`-Endpunkt
 * @returns Array mit vier `StatCardConfig`-Objekten (Benutzer, Kreise, Spannungen, Tickets)
 *
 * @example
 * const cards = buildStatCards(data.stats);
 * cards.forEach(card => console.log(card.label, card.value));
 */
export function buildStatCards(stats: DashboardStats | undefined): StatCardConfig[] {
  return [
    {
      key:       'users',
      label:     'Benutzer',
      value:     stats?.activeUsers   ?? 0,
      subtext:   `${stats?.totalUsers   ?? 0} gesamt`,
      iconBg:    'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      key:       'circles',
      label:     'Kreise',
      value:     stats?.activeCircles  ?? 0,
      subtext:   `${stats?.totalCircles  ?? 0} gesamt`,
      iconBg:    'bg-teal-50',
      iconColor: 'text-teal-600',
    },
    {
      key:       'drivers',
      label:     'Offene Spannungen',
      value:     stats?.offeneDrivers  ?? 0,
      subtext:   `${stats?.totalDrivers  ?? 0} gesamt`,
      iconBg:    'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      key:       'tickets',
      label:     'Offene Tickets',
      value:     stats?.offeneTickets  ?? 0,
      subtext:   `${stats?.totalTickets  ?? 0} gesamt`,
      iconBg:    'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ];
}

// ─────────────────────────────── News-Filter ──────────────────────────────────

/**
 * Gibt die ersten `limit` wichtigen BI-Guide-News zurück.
 * Filtert keine Einträge heraus, da die API bereits gefilterte Daten liefert.
 *
 * @param news  - Liste der BI-Guide-News aus der Dashboard-API-Antwort
 * @param limit - Maximale Anzahl anzuzeigender Einträge (Standard: 5)
 * @returns Gefilterte und auf `limit` begrenzte Liste
 */
export function getTopNews(news: DashboardNewsItem[] | undefined, limit = 5): DashboardNewsItem[] {
  return (news ?? []).slice(0, limit);
}

// ─────────────────────────────── Review-Sortierung ────────────────────────────

/**
 * Sortiert Kreise mit Review-Bedarf aufsteigend nach `nextReviewDate`
 * (Kreise ohne Datum erscheinen zuletzt).
 *
 * @param circles - Liste der review-fälligen Kreise aus der Dashboard-API-Antwort
 * @returns Sortiertes Array; Original-Array wird nicht verändert
 */
export function sortCirclesByReview(circles: DashboardCircleReview[] | undefined): DashboardCircleReview[] {
  return [...(circles ?? [])].sort((a, b) => {
    if (!a.nextReviewDate) return 1;
    if (!b.nextReviewDate) return -1;
    return new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
  });
}
