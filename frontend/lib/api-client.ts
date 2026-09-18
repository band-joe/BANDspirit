/**
 * lib/api-client.ts
 *
 * Zentraler HTTP-Client für alle Backend-Aufrufe.
 * Kapselt Token-Injektion, JSON-Serialisierung und einheitliches Fehlerhandling.
 * Alle Methoden werfen `ApiError` bei HTTP-Fehlerstatus ≥ 400.
 */
import { Session } from 'next-auth';
import { ApiError, parseODataError } from './errors';
import { ODataResponse } from './odata';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * Wandelt einen (ggf. absoluten) OData-`@odata.nextLink` in einen für
 * `apiFetch` nutzbaren Pfad relativ zu `API_BASE` um.
 */
function toRelativePath(link: string): string {
  if (link.startsWith('http://') || link.startsWith('https://')) {
    try {
      const u = new URL(link);
      return u.pathname + u.search;
    } catch {
      return link;
    }
  }
  if (API_BASE && link.startsWith(API_BASE)) return link.slice(API_BASE.length);
  return link.startsWith('/') ? link : `/${link}`;
}

/**
 * Gibt das Bearer-Token aus einer next-auth Session zurück.
 *
 * @param session - next-auth Session-Objekt oder null/undefined
 * @returns Access-Token als String, oder `undefined` wenn kein Token vorhanden
 */
export function getToken(session: Session | null | undefined): string | undefined {
  return (session?.user as { accessToken?: string })?.accessToken;
}

/**
 * Interner Basisaufruf mit automatischer Token-Injektion.
 *
 * @param path    - API-Pfad relativ zu NEXT_PUBLIC_API_URL (z. B. `/odata/Users`)
 * @param options - RequestInit-Optionen (method, body, headers, …)
 * @param session - next-auth Session für Bearer-Token-Injektion
 * @returns Deserialisiertes JSON-Ergebnis als Typ `T`
 * @throws {ApiError} Bei HTTP-Status ≥ 400
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  session?: Session | null
): Promise<T> {
  const token = getToken(session);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body, parseODataError(body));
  }

  // 204 No Content → undefined zurückgeben
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

/**
 * GET-Anfrage an einen API- oder OData-Endpunkt.
 *
 * @param path    - Endpunkt-Pfad (z. B. `/odata/Users?$orderby=Name`)
 * @param session - next-auth Session für Bearer-Token
 * @returns Deserialisiertes JSON-Ergebnis als Typ `T`
 * @throws {ApiError} Bei HTTP-Status ≥ 400
 */
async function get<T>(path: string, session?: Session | null): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' }, session);
}

/**
 * POST-Anfrage — erstellt eine neue Ressource.
 *
 * @param path    - Endpunkt-Pfad
 * @param body    - Request-Body (wird als JSON serialisiert)
 * @param session - next-auth Session für Bearer-Token
 * @returns Erstellte Ressource als Typ `T`
 * @throws {ApiError} Bei HTTP-Status ≥ 400
 */
async function post<T>(
  path: string,
  body: unknown,
  session?: Session | null
): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }, session);
}

/**
 * PATCH-Anfrage — aktualisiert eine bestehende Ressource partiell.
 *
 * @param path    - Endpunkt-Pfad inkl. Entity-ID (z. B. `/odata/Users(abc123)`)
 * @param body    - Zu ändernde Felder (wird als JSON-Merge-Patch gesendet)
 * @param session - next-auth Session für Bearer-Token
 * @returns Aktualisierte Ressource als Typ `T`
 * @throws {ApiError} Bei HTTP-Status ≥ 400
 */
async function patch<T>(
  path: string,
  body: unknown,
  session?: Session | null
): Promise<T> {
  return apiFetch<T>(
    path,
    { method: 'PATCH', body: JSON.stringify(body) },
    session
  );
}

/**
 * PUT-Anfrage — ersetzt eine Ressource vollständig.
 *
 * @param path    - Endpunkt-Pfad
 * @param body    - Vollständige Ressource (wird als JSON gesendet)
 * @param session - next-auth Session für Bearer-Token
 * @returns Aktualisierte Ressource als Typ `T`
 * @throws {ApiError} Bei HTTP-Status ≥ 400
 */
async function put<T>(
  path: string,
  body: unknown,
  session?: Session | null
): Promise<T> {
  return apiFetch<T>(
    path,
    { method: 'PUT', body: JSON.stringify(body) },
    session
  );
}

/**
 * DELETE-Anfrage — löscht eine Ressource.
 *
 * @param path    - Endpunkt-Pfad inkl. Entity-ID
 * @param session - next-auth Session für Bearer-Token
 * @throws {ApiError} Bei HTTP-Status ≥ 400
 */
async function del(path: string, session?: Session | null): Promise<void> {
  await apiFetch<void>(path, { method: 'DELETE' }, session);
}

/**
 * Lädt eine vollständige OData-Collection über ALLE Seiten hinweg.
 *
 * Bei server-seitiger Paginierung (z. B. `[EnableQuery(PageSize = 100)]`) liefert
 * der Server pro Antwort nur eine Teilmenge plus einen `@odata.nextLink`.
 * Diese Funktion folgt jedem `nextLink`, bis keiner mehr vorhanden ist, und
 * gibt die aggregierte Liste aller Datensätze zurück. Damit werden – anders als
 * beim reinen Auslesen von `response.value` – auch spätere Seiten berücksichtigt.
 *
 * @param path    - OData-Collection-Pfad (z. B. `/odata/Users?$orderby=Name`)
 * @param session - next-auth Session für Bearer-Token
 * @returns Aggregiertes Array aller Datensätze über sämtliche Seiten
 * @throws {ApiError} Bei HTTP-Status ≥ 400 auf einer beliebigen Seite
 */
async function getAllPages<T>(path: string, session?: Session | null): Promise<T[]> {
  const items: T[] = [];
  let next: string | undefined = path;
  // Schutz gegen fehlerhafte Endlos-nextLinks des Servers.
  let guard = 0;
  while (next && guard < 1000) {
    const page: ODataResponse<T> = await apiFetch<ODataResponse<T>>(next, { method: 'GET' }, session);
    if (Array.isArray(page?.value)) items.push(...page.value);
    const link: string | undefined = page?.['@odata.nextLink'];
    next = link ? toRelativePath(link) : undefined;
    guard++;
  }
  return items;
}

export const apiClient = { get, getAllPages, post, patch, put, delete: del };
