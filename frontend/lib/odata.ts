// lib/odata.ts

/** OData-Antwort-Hülle (Collection) */
export interface ODataResponse<T> {
  '@odata.context': string;
  '@odata.count'?:  number;
  /**
   * Server-seitiger Folge-Link bei aktivierter OData-Paginierung (PageSize).
   * Ist dieser Wert gesetzt, existieren weitere Datensätze auf Folgeseiten,
   * die über diesen Link nachgeladen werden müssen (siehe apiClient.getAllPages).
   */
  '@odata.nextLink'?: string;
  value: T[];
}

/** OData-Antwort-Hülle (Singleton / Einzelobjekt) */
export interface ODataSingleResponse<T> extends Omit<ODataResponse<T>, 'value'> {
  // Singleton-Antworten enthalten die Felder direkt (kein 'value'-Wrapper)
  [key: string]: unknown;
}

/** Fluent Query Builder für OData v4 */
export class ODataQuery {
  private params: Record<string, string> = {};

  filter(expr: string): this {
    this.params['$filter'] = expr;
    return this;
  }

  select(...fields: string[]): this {
    this.params['$select'] = fields.join(',');
    return this;
  }

  expand(...expansions: string[]): this {
    this.params['$expand'] = expansions.join(',');
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
    this.params['$orderby'] = `${field} ${direction}`;
    return this;
  }

  top(n: number): this {
    this.params['$top'] = String(n);
    return this;
  }

  skip(n: number): this {
    this.params['$skip'] = String(n);
    return this;
  }

  count(): this {
    this.params['$count'] = 'true';
    return this;
  }

  search(term: string): this {
    this.params['$search'] = `"${term}"`;
    return this;
  }

  /** Baut den vollständigen OData-Pfad */
  build(entitySet: string): string {
    const qs = new URLSearchParams(this.params).toString();
    return `/odata/${entitySet}${qs ? `?${qs}` : ''}`;
  }

  /** Gibt nur den Query-String zurück (ohne Pfad) */
  toQueryString(): string {
    return new URLSearchParams(this.params).toString();
  }
}

// ─────────────── Vordefinierte Standard-Abfragen ───────────────

export const odataQueries = {
  circles: {
    list:   () => new ODataQuery().filter('IsActive eq true').orderBy('Name'),
    detail: (id: string) =>
      `/odata/Circles(${id})?$expand=Roles($expand=Assignments($expand=User)),Children,Drivers`,
  },
  meetings: {
    byCircle: (circleId: string) =>
      new ODataQuery()
        .filter(`CircleId eq '${circleId}'`)
        .orderBy('ScheduledAt', 'desc'),
    detail: (id: string) =>
      `/odata/Meetings(${id})?$expand=AgendaItems,Proposals($expand=Objections,Decision)`,
  },
  okr: {
    list:   () => new ODataQuery().expand('KeyResults').orderBy('CreatedAt', 'desc'),
    detail: (id: string) => `/odata/OKRs(${id})?$expand=KeyResults`,
  },
  kpi: {
    dashboard: () =>
      new ODataQuery().expand(
        'Measurements($orderby=Messdatum desc;$top=1)'
      ),
    detail: (id: string) =>
      `/odata/KpiDefinitions(${id})?$expand=Measurements($orderby=Messdatum desc)`,
  },
  users: {
    list: () => new ODataQuery().orderBy('Name').select('Id', 'Name', 'Email', 'Role', 'Aktiv'),
  },
  tickets: {
    list: () => new ODataQuery().orderBy('CreatedAt', 'desc'),
    open: () => new ODataQuery().filter("Status eq 'OFFEN'").orderBy('CreatedAt', 'desc'),
  },
  faq: {
    active: () =>
      new ODataQuery().filter('IsActive eq true').orderBy('SortOrder'),
  },
  news: {
    feed: (top = 20) => new ODataQuery().orderBy('CreatedAt', 'desc').top(top),
  },
  stammdaten: {
    byKategorie: (kategorie: string) =>
      new ODataQuery().filter(`Kategorie eq '${kategorie}'`).orderBy('SortOrder'),
  },
  appLogs: {
    recent: (top = 100) =>
      new ODataQuery().orderBy('CreatedAt', 'desc').top(top),
    byUser: (userId: string, top = 50) =>
      new ODataQuery()
        .filter(`UserId eq '${userId}'`)
        .orderBy('CreatedAt', 'desc')
        .top(top),
  },
};
