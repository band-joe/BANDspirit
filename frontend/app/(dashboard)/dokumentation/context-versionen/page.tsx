'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Calendar, ArrowRight } from 'lucide-react';

interface VersionEntry {
  version: string;
  datum: string;
  titel: string;
  beschreibung: string;
  aenderungen: {
    kategorie: string;
    items: string[];
  }[];
}
const versionen: VersionEntry[] = [
  {
    version: 'V.1.0.0.1',
    datum: '23.08.2026',
    titel: 'Frontend Clean Code — Typsicherheit, Refactoring & Dokumentation',
    beschreibung: 'Umsetzung der verbleibenden offenen Massnahmen aus dem Frontend-Clean-Code-Vorgehensplan (Phase 2–4). Alle Dashboard- und Organisations-Interfaces wurden aus «any» typisiert, die Dashboard-Seite in Teilkomponenten aufgeteilt und alle relevanten Hilfsfunktionen mit JSDoc dokumentiert.',
    aenderungen: [
      {
        kategorie: 'Clean Code — Typsicherheit',
        items: [
          'M-004: Dashboard-Interfaces (DashboardNewsItem, DashboardCircleReview, DashboardStats, DashboardApiResponse) in lib/types.ts zentralisiert; lokale Inline-Typen in dashboard/page.tsx entfernt',
          'M-005: Organisations-Interfaces (CircleListItem, DriverListItem, OrgUser, OrgUserProfile) in lib/types.ts zentralisiert; lokale Inline-Typen in organisation/page.tsx entfernt',
          'M-005: ODataResponse<any> in organisation/spannungen/[id]/page.tsx durch vollständig typisierte Generics ersetzt',
        ],
      },
      {
        kategorie: 'Clean Code — Code-Struktur',
        items: [
          'M-006: lib/dashboard-helpers.ts neu erstellt — Helper-Funktionen buildStatCards(), getTopNews(), sortCirclesByReview() mit vollständiger JSDoc-Dokumentation',
          'M-006: dashboard/page.tsx aufgeteilt: Haupt-Page-Komponente < 60 Zeilen; Teilkomponenten AnimatedCounter, NewsSection, ReviewSection, LoadingSkeleton ausgelagert',
          'M-006: Typisierter Cast (session?.user as { accessToken?: string }) in lib/api-client.ts statt any-Cast',
        ],
      },
      {
        kategorie: 'Clean Code — Dokumentation',
        items: [
          'M-011: lib/api-client.ts — Datei-Level-JSDoc + @param/@returns/@throws für alle 6 exportierten Funktionen (getToken, apiFetch, get, post, patch, put, del)',
          'M-011: lib/utils.ts — Datei-Level-JSDoc + @param/@returns/@example für cn(), formatDate(), formatDateISO()',
          'M-011: lib/errors.ts — Datei-Level-JSDoc + @example für ApiError-Klasse, @param/@returns für parseODataError()',
          'M-011: lib/dashboard-helpers.ts — vollständige JSDoc-Dokumentation aller Funktionen und des StatCardConfig-Interfaces',
          'M-012: Clean-Code-Prüfungsseite und Vorgehensplan als aktualisierte PDFs neu generiert',
        ],
      },
    ],
  },
  {
    version: 'V.1.0.0',
    datum: '23.08.2026',
    titel: 'Basisversion — Neustart der Context-Versionierung',
    beschreibung: 'Mit dieser Version wird die Context-Versionierung neu gestartet. Der bisherige Versionsverlauf wurde archiviert (als separate PDF-Dokumente im Verzeichnis «Dokumentation») und die Online-Dokumentation auf die drei Kernbereiche Fachliche Dokumentation, Technische Dokumentation und Context-Versionen reduziert. V.1.0.0 bildet den Ausgangspunkt für alle künftigen Änderungseinträge.',
    aenderungen: [
      { kategorie: 'Dokumentation', items: [
        'Neustart der Context-Versionierung ab V.1.0.0',
        'Bisheriger Versionsverlauf als separate PDF-Dateien archiviert (Verzeichnis «Dokumentation»)',
        'Online-Dokumentation auf Fachliche Dokumentation, Technische Dokumentation und Context-Versionen reduziert',
        'Sicherheitsprüfung, DSG-Prüfung, Clean-Code-Dokumente, API-Dokumentation, ERD/Datenmodell und Installationsanleitungen sind neu ausschliesslich als PDF verfügbar',
      ]},
    ],
  },
];

const KATEGORIE_COLORS: Record<string, string> = {
  'Application-Log (Audit-Trail)': 'bg-blue-100 text-blue-800',
  'Dokumentationsmodul': 'bg-emerald-100 text-emerald-800',
  'Dokumentation': 'bg-emerald-100 text-emerald-800',
  'Dashboard': 'bg-orange-100 text-orange-800',
  'API': 'bg-violet-100 text-violet-800',
  'Infrastruktur': 'bg-cyan-100 text-cyan-800',
  'RBAC & Navigation': 'bg-purple-100 text-purple-800',
  'Massnahmen': 'bg-amber-100 text-amber-800',
  'Bugfix': 'bg-red-100 text-red-800',
  'Hinweis': 'bg-slate-100 text-slate-800',
  'Authentifizierung': 'bg-indigo-100 text-indigo-800',
  'Organisation — Datenmodell': 'bg-teal-100 text-teal-800',
  'Organisation — API': 'bg-teal-100 text-teal-800',
  'Organisation — Frontend': 'bg-teal-100 text-teal-800',
  'Clean Code — Typsicherheit': 'bg-indigo-100 text-indigo-800',
  'Clean Code — Fehlerbehandlung': 'bg-indigo-100 text-indigo-800',
  'Code-Qualität': 'bg-cyan-100 text-cyan-800',
  'UI — Navigation & Titel': 'bg-sky-100 text-sky-800',
  'RBAC — Berechtigungs-Labels': 'bg-purple-100 text-purple-800',
  'API — Fehlermeldungen': 'bg-orange-100 text-orange-800',
  'Sonstiges': 'bg-gray-100 text-gray-800',
  'Datenbereinigung': 'bg-rose-100 text-rose-800',
};

export default function ContextVersionenPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-primary" />
          Context-Versionen
        </h1>
        <p className="text-muted-foreground">Änderungsprotokoll des BANDspirit-Systems ab Version V.1.0.0</p>
      </div>

      <div className="space-y-6">
        {versionen.map((v, idx) => (
          <Card key={v.version} className={idx === 0 ? 'border-l-4 border-l-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg flex items-center gap-3">
                  <Badge className="text-sm font-mono bg-primary text-primary-foreground">{v.version}</Badge>
                  {v.titel}
                </CardTitle>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {v.datum}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{v.beschreibung}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {v.aenderungen.map((kat) => (
                <div key={kat.kategorie}>
                  <div className="mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${KATEGORIE_COLORS[kat.kategorie] || 'bg-gray-100 text-gray-800'}`}>
                      {kat.kategorie}
                    </span>
                  </div>
                  <ul className="space-y-1.5 ml-1">
                    {kat.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground text-center">
            BANDspirit — Änderungsdokumentation ab V.1.0.0
          </p>
        </CardContent>
      </Card>
    </div>
  );
}