'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface LogEntry {
  id: string;
  modul: string;
  aktion: string;
  entityId: string | null;
  entityName: string | null;
  userId: string;
  userName: string;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

const MODUL_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  KLIENT: 'Klient',
  KONTAKT: 'Kontakt',
  BENUTZER: 'Benutzer',
};

const AKTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-800',
  LOGIN_FAILED: 'bg-red-100 text-red-800',
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-amber-100 text-amber-800',
  DELETE: 'bg-red-100 text-red-800',
  DEACTIVATE: 'bg-gray-100 text-gray-800',
};

const AKTION_LABELS: Record<string, string> = {
  LOGIN: 'Anmeldung',
  LOGIN_FAILED: 'Fehlgeschlagen',
  CREATE: 'Erstellt',
  UPDATE: 'Geändert',
  DELETE: 'Gelöscht',
  DEACTIVATE: 'Deaktiviert',
};

export default function ApplicationLogPage() {
  const { data: session } = useSession() || {};
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [modul, setModul] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const PAGE_SIZE = 50;

  const loadLogs = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // Filter als OData $filter zusammensetzen
      const filters: string[] = [];
      if (modul) filters.push(`Modul eq '${modul}'`);
      if (search) {
        const q = search.toLowerCase().replace(/'/g, "''");
        filters.push(
          `(contains(tolower(UserName),'${q}') or contains(tolower(EntityName),'${q}') or contains(tolower(Details),'${q}'))`
        );
      }
      if (dateFrom) filters.push(`CreatedAt ge ${dateFrom}T00:00:00Z`);
      if (dateTo) filters.push(`CreatedAt le ${dateTo}T23:59:59Z`);

      const parts = [
        '$count=true',
        `$top=${PAGE_SIZE}`,
        `$skip=${(page - 1) * PAGE_SIZE}`,
        '$orderby=CreatedAt desc',
      ];
      if (filters.length > 0) parts.push(`$filter=${encodeURIComponent(filters.join(' and '))}`);

      const data = await apiClient.get<ODataResponse<LogEntry>>(
        `/odata/AppLogs?${parts.join('&')}`,
        session
      );
      setLogs(data.value ?? []);
      const total = data['@odata.count'] ?? 0;
      setTotalItems(total);
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, modul, search, dateFrom, dateTo, session]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-primary" />
          Application-Log
        </h1>
        <p className="text-muted-foreground">Protokollierung aller System-Aktivitäten</p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Suche</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Benutzer, Objekt, Details..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="w-[180px]">
              <label className="text-xs text-muted-foreground mb-1 block">Modul</label>
              <Select value={modul || '_all'} onValueChange={(v) => { setModul(v === '_all' ? '' : v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Alle Module</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="KLIENT">Klient</SelectItem>
                  <SelectItem value="KONTAKT">Kontakt</SelectItem>
                  <SelectItem value="BENUTZER">Benutzer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[160px]">
              <label className="text-xs text-muted-foreground mb-1 block">Von</label>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div className="w-[160px]">
              <label className="text-xs text-muted-foreground mb-1 block">Bis</label>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Log-Einträge</CardTitle>
            <span className="text-sm text-muted-foreground">{totalItems} Einträge</span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Laden...</p>
          ) : logs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Keine Log-Einträge gefunden</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Zeitpunkt</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Modul</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Aktion</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Benutzer</th>
                    <th className="pb-2 pr-3 font-medium text-muted-foreground">Objekt</th>
                    <th className="pb-2 font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/50">
                      <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                      <td className="py-2.5 pr-3">
                        <Badge variant="outline" className="text-xs">{MODUL_LABELS[log.modul] || log.modul}</Badge>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${AKTION_COLORS[log.aktion] || 'bg-gray-100 text-gray-800'}`}>
                          {AKTION_LABELS[log.aktion] || log.aktion}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">{log.userName}</td>
                      <td className="py-2.5 pr-3">{log.entityName || '–'}</td>
                      <td className="py-2.5 text-muted-foreground max-w-xs truncate">{log.details || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Seite {page} von {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
