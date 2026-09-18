/**
 * lib/utils.ts
 * Allgemeine Utility-Funktionen (Styling, Datum, Statusanzeige, Währung).
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Kombiniert Tailwind-Klassen konfliktfrei (clsx + tailwind-merge).
 *
 * @param inputs - Beliebige Mischung aus Strings, Arrays und bedingten Klassen
 * @returns Einziger, zusammengeführter Klassen-String
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-blue-500', 'text-white')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatiert ein Datum als deutsches Kurzformat (DD.MM.YYYY).
 * Gibt '—' zurück, wenn kein Datum übergeben wird oder das Datum ungültig ist.
 *
 * @param date - ISO-String, Date-Objekt, null oder undefined
 * @returns Formatierter Datumsstring oder '—'
 *
 * @example
 * formatDate('2026-08-23T14:00:00Z') // '23.08.2026'
 * formatDate(null)                   // '—'
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
  } catch {
    return '—';
  }
}

/**
 * Formatiert ein Datum als ISO-Datum (YYYY-MM-DD) für `<input type="date">`.
 * Gibt einen Leerstring zurück bei fehlendem oder ungültigem Datum.
 *
 * @param date - ISO-String, Date-Objekt, null oder undefined
 * @returns ISO-Datumsstring (YYYY-MM-DD) oder ''
 *
 * @example
 * formatDateISO('2026-08-23T14:00:00Z') // '2026-08-23'
 */
export function formatDateISO(date: string | Date | null | undefined): string {
  if (!date) return '';
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function getStatusColor(status: string | undefined): string {
  const colors: Record<string, string> = {
    AKTIV: '!bg-green-100 !text-green-800 !border-transparent',
    INAKTIV: '!bg-yellow-100 !text-yellow-800 !border-transparent',
    ARCHIVIERT: '!bg-gray-100 !text-gray-600 !border-transparent',
    OFFEN: '!bg-blue-100 !text-blue-800 !border-transparent',
    IN_BEARBEITUNG: '!bg-amber-100 !text-amber-800 !border-transparent',
    ABGESCHLOSSEN: '!bg-green-100 !text-green-800 !border-transparent',
    ABGEBROCHEN: '!bg-red-100 !text-red-800 !border-transparent',
    GEPLANT: '!bg-blue-100 !text-blue-800 !border-transparent',
    PAUSIERT: '!bg-orange-100 !text-orange-800 !border-transparent',
    BEENDET: '!bg-gray-100 !text-gray-600 !border-transparent',
    // Bericht
    ENTWURF: '!bg-yellow-100 !text-yellow-800 !border-transparent',
    FERTIG: '!bg-green-100 !text-green-800 !border-transparent',
    // Abrechnung
    EINGEREICHT: '!bg-blue-100 !text-blue-800 !border-transparent',
    GEPRUEFT: '!bg-indigo-100 !text-indigo-800 !border-transparent',
    GENEHMIGT: '!bg-green-100 !text-green-800 !border-transparent',
    ABGELEHNT: '!bg-red-100 !text-red-800 !border-transparent',
    EXPORTIERT: '!bg-emerald-100 !text-emerald-800 !border-transparent',
    STORNIERT: '!bg-gray-200 !text-gray-600 !border-transparent',
  };
  return colors[status ?? ''] ?? '!bg-gray-100 !text-gray-600 !border-transparent';
}

export function getStatusLabel(status: string | undefined): string {
  const labels: Record<string, string> = {
    AKTIV: 'Aktiv',
    INAKTIV: 'Inaktiv',
    ARCHIVIERT: 'Archiviert',
    OFFEN: 'Offen',
    IN_BEARBEITUNG: 'In Bearbeitung',
    ABGESCHLOSSEN: 'Abgeschlossen',
    ABGEBROCHEN: 'Abgebrochen',
    GEPLANT: 'Geplant',
    PAUSIERT: 'Pausiert',
    BEENDET: 'Beendet',
    MAENNLICH: 'Männlich',
    WEIBLICH: 'Weiblich',
    DIVERS: 'Divers',
    // Bericht
    ENTWURF: 'Entwurf',
    FERTIG: 'Fertig',
    // Abrechnung
    EINGEREICHT: 'Eingereicht',
    GEPRUEFT: 'Geprüft',
    GENEHMIGT: 'Genehmigt',
    ABGELEHNT: 'Abgelehnt',
    EXPORTIERT: 'Exportiert',
    STORNIERT: 'Storniert',
    // Branchen
    HANDWERK: 'Handwerk',
    IT: 'IT',
    GASTRONOMIE: 'Gastronomie',
    BUERO: 'Büro',
    SOZIALES: 'Soziales',
    LOGISTIK: 'Logistik',
    REINIGUNG: 'Reinigung',
    SONSTIGES: 'Sonstiges',
    // Einheiten
    TAG: 'Tag',
    STUNDE: 'Stunde',
    MONAT: 'Monat',
    PAUSCHALE: 'Pauschale',
    // Kontakt-Typen
    BETREUER: 'Betreuer/in',
    ANGEHOERIGER: 'Angehörige/r',
    ARZT: 'Arzt/Ärztin',
    BEHOERDE: 'Behörde',
    ARBEITGEBER: 'Arbeitgeber',
    THERAPEUT: 'Therapeut/in',
    SOZIALARBEITER: 'Sozialarbeiter/in',
    // Kontaktart
    PERSON: 'Person',
    ORGANISATION: 'Organisation',
    // Kontakt-Funktionen
    SACHBEARBEITER: 'Sachbearbeiter:in',
    TEAMLEITUNG: 'Teamleitung',
    GESCHAEFTSFUEHRUNG: 'Geschäftsführung',
    BERATUNG: 'Beratung',
    PAEDAGOGIK: 'Pädagogische Fachkraft',
    VERWALTUNG: 'Verwaltung',
    JOBCOACH: 'Jobcoach',
    // WorkflowItem Typ
    MEETING_REMINDER: 'Gesprächs-Erinnerung',
    AUFGABE: 'Aufgabe',
    WIEDERVORLAGE: 'Wiedervorlage',
    // WorkflowItem Priorität
    NIEDRIG: 'Niedrig',
    MITTEL: 'Mittel',
    HOCH: 'Hoch',
    DRINGEND: 'Dringend',
    // Wochentage
    MO: 'Montag',
    DI: 'Dienstag',
    MI: 'Mittwoch',
    DO: 'Donnerstag',
    FR: 'Freitag',
    SA: 'Samstag',
    SO: 'Sonntag',
  };
  return labels[status ?? ''] ?? status ?? '—';
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value == null) return '0,00 €';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
}

export function generateAbrechnungNummer(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `ABR-${year}-${rand}`;
}
