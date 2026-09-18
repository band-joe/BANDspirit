/**
 * lib/errors.ts
 * Typisiertes Fehlerhandling für API-Aufrufe.
 */

/**
 * Typisierter Fehler für HTTP-Antworten mit Status ≥ 400.
 * Enthält Statuscode und rohen Response-Body für detailliertes Logging.
 *
 * @example
 * try {
 *   await apiClient.get('/odata/Users', session);
 * } catch (err) {
 *   if (err instanceof ApiError && err.isUnauthorized) {
 *     // Weiterleitung zum Login
 *   }
 * }
 */
export class ApiError extends Error {
  constructor(
    /** HTTP-Statuscode (z. B. 401, 403, 404, 500) */
    public readonly status: number,
    /** Roher Response-Body als String */
    public readonly body:   string,
    message?: string
  ) {
    super(message ?? `API-Fehler ${status}: ${body}`);
    this.name = 'ApiError';
  }

  /** `true` wenn der Status 401 Unauthorized ist */
  get isUnauthorized()  { return this.status === 401; }
  /** `true` wenn der Status 403 Forbidden ist */
  get isForbidden()     { return this.status === 403; }
  /** `true` wenn der Status 404 Not Found ist */
  get isNotFound()      { return this.status === 404; }
  /** `true` wenn der Status ≥ 500 (Server-Fehler) ist */
  get isServerError()   { return this.status >= 500;  }
}

/**
 * Parst eine OData-Fehlerantwort und gibt die lesbare Fehlermeldung zurück.
 * Unterstützt sowohl OData-Standardformat (`error.message`) als auch einfache
 * JSON-Antworten mit `message`-Feld. Bei Parse-Fehlern wird der rohe Body zurückgegeben.
 *
 * @param body - HTTP-Response-Body als String (JSON oder Freitext)
 * @returns Lesbare Fehlermeldung
 */
export function parseODataError(body: string): string {
  try {
    const obj = JSON.parse(body);
    return obj?.error?.message ?? obj?.message ?? body;
  } catch {
    return body;
  }
}
