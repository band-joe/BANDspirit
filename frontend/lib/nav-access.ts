// lib/nav-access.ts
// -----------------------------------------------------------------------------
// Rollenbasierte Menü- und Zugriffssteuerung (Feature V.2.0.7)
// -----------------------------------------------------------------------------
// Diese Datei enthält KEINE React-Abhängigkeiten, damit sie sowohl in der
// Middleware (Edge Runtime) als auch in Client-Komponenten verwendet werden kann.
//
// Fachliche Vorgabe (V.2.0.7):
//   - Administrator: hat alle Berechtigungen (sieht alles).
//   - Mitglied:      Dashboard, MA-Profil, Organigramm, Hilfe, Spannungen.
//   - Lead-Link:     Dashboard, MA-Profil, Organigramm, Kreise, Hilfe,
//                    Spannungen, Dokumentation.
//   - BI-Guide:      Dashboard, BI-Guide, Spannungen.
//
// Für die vier oben genannten, "verwalteten" Rollen ist diese Whitelist die
// alleinige Autorität für die Menü-Sichtbarkeit und den Seitenzugriff.
// Unbekannte/eigene Rollen fallen auf die bestehende, berechtigungsbasierte
// Filterung zurück (abwärtskompatibel).
// -----------------------------------------------------------------------------

/** Zugriffsschlüssel je Menüpunkt / Funktionsbereich. */
export type AccessKey =
  | 'dashboard'
  | 'ma-profil'
  | 'mail-verteiler'
  | 'bi-guide'
  | 'bi-kompass'
  | 'organigramm'
  | 'lifecycle'
  | 'kreise'
  | 'spannungen'
  | 'hilfe'
  | 'dokumentation'
  | 'benutzerverwaltung'
  | 'einstellungen'
  | 'application-log';

/** Kanonische Namen der verwalteten Rollen. */
export type ManagedRole = 'admin' | 'mitglied' | 'lead-link' | 'bi-guide';

/**
 * Whitelist: Welche Zugriffsschlüssel darf welche verwaltete Rolle sehen/öffnen.
 * 'all' = alle Bereiche (nur Administrator).
 */
export const ROLE_ACCESS: Record<ManagedRole, AccessKey[] | 'all'> = {
  admin: 'all',
  mitglied: ['dashboard', 'ma-profil', 'organigramm', 'hilfe', 'spannungen'],
  'lead-link': [
    'dashboard',
    'ma-profil',
    'organigramm',
    'kreise',
    'hilfe',
    'spannungen',
    'dokumentation',
  ],
  'bi-guide': ['dashboard', 'bi-guide', 'spannungen'],
};

/**
 * Normalisiert einen (frei eingegebenen) Rollennamen auf einen der vier
 * verwalteten kanonischen Namen. Gibt `null` zurück, wenn es sich um eine
 * unbekannte/eigene Rolle handelt (dann greift der bestehende Fallback).
 *
 * Vorgehen: trimmen -> Kleinschreibung -> Leer-, Unterstrich- und Bindestrich-
 * zeichen entfernen. So werden z. B. "Lead-Link", "lead_link" und "leadlink"
 * gleich behandelt. Bestehende "User"/"Benutzer"-Mitglieder werden automatisch
 * als "Mitglied" behandelt.
 */
export function normalizeManagedRole(role: string | undefined | null): ManagedRole | null {
  if (!role) return null;
  const key = role.trim().toLowerCase().replace(/[\s_-]/g, '');
  switch (key) {
    case 'admin':
    case 'administrator':
      return 'admin';
    case 'user':
    case 'benutzer':
    case 'mitglied':
    case 'member':
      return 'mitglied';
    case 'leadlink':
      return 'lead-link';
    case 'biguide':
      return 'bi-guide';
    default:
      return null;
  }
}

/**
 * Prüft, ob eine verwaltete Rolle Zugriff auf einen bestimmten
 * Zugriffsschlüssel hat. Der Administrator ('all') darf immer.
 */
export function roleCanAccessKey(role: ManagedRole, key: AccessKey): boolean {
  const access = ROLE_ACCESS[role];
  if (access === 'all') return true;
  return access.includes(key);
}

/**
 * Ordnet einen Pfad (+ optionalem ?tab=-Parameter) einem Zugriffsschlüssel zu.
 * Reihenfolge ist wichtig: spezifischste Pfade zuerst prüfen.
 * Unbekannte Pfade -> null (dann keine Einschränkung durch dieses Modul).
 */
export function pathToAccessKey(pathname: string, tab?: string | null): AccessKey | null {
  const p = (pathname || '').toLowerCase();

  // --- Spezifischste Organisations-Pfade zuerst ---------------------------
  // Life Cycle liegt unterhalb von bi-kompass -> muss VOR bi-kompass geprüft werden.
  if (p.startsWith('/organisation/bi-kompass/group-lifecycle')) return 'lifecycle';
  if (p.startsWith('/organisation/bi-guide')) return 'bi-guide';
  if (p.startsWith('/organisation/bi-kompass')) return 'bi-kompass';
  if (p.startsWith('/organisation/graph')) return 'organigramm';
  // Spannungs-Detailseiten (/organisation/spannungen/[id]) gehören zu "Spannungen".
  if (p.startsWith('/organisation/spannungen')) return 'spannungen';
  // Kreis-Detailseiten / Kreis-Erfassung gehören zum Bereich "Kreise".
  if (p.startsWith('/organisation/kreise')) return 'kreise';
  // Meeting-Detailseiten (/organisation/meetings/[id]) sind Teil der Kreisarbeit
  // und werden dem Bereich "Kreise" zugeordnet.
  if (p.startsWith('/organisation/meetings')) return 'kreise';

  // /organisation selbst dient sowohl "Kreise" (ohne Tab) als auch
  // "Spannungen" (?tab=drivers).
  if (p === '/organisation' || p.startsWith('/organisation?') || p.startsWith('/organisation/')) {
    if ((tab || '').toLowerCase() === 'drivers') return 'spannungen';
    return 'kreise';
  }

  // --- Übrige Bereiche -----------------------------------------------------
  if (p.startsWith('/dashboard')) return 'dashboard';
  if (p.startsWith('/ma-profil')) return 'ma-profil';
  if (p.startsWith('/mail-verteiler')) return 'mail-verteiler';
  if (p.startsWith('/hilfe')) return 'hilfe';
  // Fachliche Dokumentation ist unter Hilfe, daher 'hilfe' statt 'dokumentation'
  if (p.startsWith('/dokumentation/fachlich')) return 'hilfe';
  if (p.startsWith('/dokumentation')) return 'dokumentation';
  if (p.startsWith('/benutzer')) return 'benutzerverwaltung';
  if (p.startsWith('/einstellungen')) return 'einstellungen';
  if (p.startsWith('/application-log')) return 'application-log';

  return null;
}

/**
 * Ziel für Umleitungen, wenn eine Rolle keinen Zugriff auf die aufgerufene
 * Seite hat. Alle verwalteten Rollen haben Zugriff auf das Dashboard.
 */
export const ACCESS_REDIRECT_TARGET = '/dashboard';
