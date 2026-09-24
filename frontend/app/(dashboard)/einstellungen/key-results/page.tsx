'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Edit, Trash2, ArrowLeft, Search, ListChecks, Target, CalendarClock,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { ApiError } from '@/lib/errors';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Typen & Optionen                                                   */
/* ------------------------------------------------------------------ */

interface OKRLite { id: string; titel: string; }
interface KeyResultItem {
  id: string;
  okrId: string;
  titel: string;
  startWert: number | null;
  zielWert: number | null;
  istWert: number | null;
  einheit: string | null;
  faelligkeit: string | null;
  status: string;
  okr?: { id: string; titel: string } | null;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'NICHT_GESTARTET', label: 'Nicht gestartet' },
  { value: 'IN_ARBEIT', label: 'In Arbeit' },
  { value: 'ERFUELLT', label: 'Erfüllt' },
];

function statusBadge(status: string) {
  switch (status) {
    case 'IN_ARBEIT':
      return <Badge className="bg-primary/10 text-primary text-xs">In Arbeit</Badge>;
    case 'ERFUELLT':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Erfüllt</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">Nicht gestartet</Badge>;
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

/** Fortschritt aus Start-, Ziel- und Istwert berechnen (0–100 %). */
function berechneKrFortschritt(kr: KeyResultItem): number {
  const start = kr.startWert ?? 0;
  const ziel = kr.zielWert;
  const ist = kr.istWert ?? 0;
  if (ziel == null) return 0;
  const spanne = ziel - start;
  if (spanne === 0) return ist >= ziel ? 100 : 0;
  const pct = ((ist - start) / spanne) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** Leerer String → null, sonst Number(). */
function numOrNull(v: string): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

const EMPTY_FORM = {
  okrId: '',
  titel: '',
  startWert: '',
  zielWert: '',
  istWert: '',
  einheit: '',
  status: 'NICHT_GESTARTET',
  faelligkeit: '',
};

/* ------------------------------------------------------------------ */
/*  Seite                                                              */
/* ------------------------------------------------------------------ */

export default function KeyResultsPage() {
  const { data: session } = useSession() || {};
  const { can } = usePermissions();
  const canManage = can('okr:manage');

  const [items, setItems] = useState<KeyResultItem[]>([]);
  const [okrs, setOkrs] = useState<OKRLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [objectiveFilter, setObjectiveFilter] = useState('ALL');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KeyResultItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KeyResultItem | null>(null);

  /* ---------- Daten laden ---------- */

  const loadData = useCallback(() => {
    if (!session) return;
    setLoading(true);
    const filters: string[] = [];
    if (search.trim()) {
      const q = search.trim().toLowerCase().replace(/'/g, "''");
      filters.push(`contains(tolower(Titel),'${q}')`);
    }
    if (objectiveFilter !== 'ALL') filters.push(`OkrId eq ${objectiveFilter}`);
    if (statusFilter !== 'ALL') filters.push(`Status eq '${statusFilter}'`);
    const parts: string[] = ['$expand=Okr($select=Id,Titel)'];
    if (filters.length) parts.push(`$filter=${encodeURIComponent(filters.join(' and '))}`);
    parts.push('$orderby=CreatedAt desc');
    apiClient
      .get<ODataResponse<KeyResultItem>>(`/odata/KeyResults?${parts.join('&')}`, session)
      .then(d => setItems(d.value ?? []))
      .catch(() => toast.error('Fehler beim Laden der Key Results'))
      .finally(() => setLoading(false));
  }, [search, statusFilter, objectiveFilter, session]);

  useEffect(() => {
    const t = setTimeout(loadData, 250);
    return () => clearTimeout(t);
  }, [loadData]);

  useEffect(() => {
    if (!session) return;
    apiClient
      .get<ODataResponse<OKRLite>>('/odata/OKRs?$select=Id,Titel', session)
      .then(d => setOkrs(d.value ?? []))
      .catch(() => {});
  }, [session]);

  /* ---------- Dialog-Helfer ---------- */

  const openCreate = () => {
    setEditingItem(null);
    setForm({ ...EMPTY_FORM, okrId: objectiveFilter !== 'ALL' ? objectiveFilter : '' });
    setDialogOpen(true);
  };

  const openEdit = (item: KeyResultItem) => {
    setEditingItem(item);
    setForm({
      okrId: item.okrId,
      titel: item.titel,
      startWert: item.startWert != null ? String(item.startWert) : '',
      zielWert: item.zielWert != null ? String(item.zielWert) : '',
      istWert: item.istWert != null ? String(item.istWert) : '',
      einheit: item.einheit || '',
      status: item.status,
      faelligkeit: item.faelligkeit ? item.faelligkeit.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  /* ---------- Speichern ---------- */

  const handleSave = async () => {
    if (!form.okrId) {
      toast.error('Zugehöriges Objective ist erforderlich');
      return;
    }
    if (!form.titel.trim()) {
      toast.error('Titel ist erforderlich');
      return;
    }
    const startNum = numOrNull(form.startWert);
    const zielNum = numOrNull(form.zielWert);
    if (startNum != null && zielNum != null && startNum === zielNum) {
      toast.error('Zielwert darf nicht gleich Startwert sein (Fortschrittsberechnung nicht möglich).');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        okrId: form.okrId,
        titel: form.titel.trim(),
        startWert: numOrNull(form.startWert) ?? 0,
        zielWert: numOrNull(form.zielWert) ?? 0,
        istWert: numOrNull(form.istWert) ?? 0,
        einheit: form.einheit.trim() || null,
        status: form.status,
        faelligkeit: form.faelligkeit || null,
      };
      if (editingItem) {
        await apiClient.patch(`/odata/KeyResults(${editingItem.id})`, payload, session);
      } else {
        await apiClient.post('/odata/KeyResults', payload, session);
      }
      toast.success(editingItem ? 'Key Result aktualisiert' : 'Key Result erstellt');
      setDialogOpen(false);
      loadData();
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? error.message : 'Fehler beim Speichern';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Löschen ---------- */

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/odata/KeyResults(${deleteTarget.id})`, session);
      toast.success('Key Result gelöscht');
      loadData();
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? error.message : 'Fehler beim Löschen';
      toast.error(msg);
    } finally {
      setDeleteTarget(null);
    }
  };

  /* ---------- Render ---------- */

  const startNumForm = numOrNull(form.startWert);
  const zielNumForm = numOrNull(form.zielWert);
  const wertFehler = startNumForm != null && zielNumForm != null && startNumForm === zielNumForm
    ? 'Zielwert darf nicht gleich Startwert sein (Fortschrittsberechnung nicht möglich).'
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/einstellungen/firma">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Key Results</h1>
            <p className="text-muted-foreground">Messbare Ergebnisse zu den Objectives</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openCreate} disabled={okrs.length === 0}>
            <Plus className="h-4 w-4 mr-2" />Neues Key Result
          </Button>
        )}
      </div>

      {okrs.length === 0 && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Es sind noch keine Objectives vorhanden. Erstellen Sie zuerst ein OKR, um Key Results zuordnen zu können.
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Suche nach Titel ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={objectiveFilter} onValueChange={setObjectiveFilter}>
          <SelectTrigger className="w-full lg:w-64">
            <SelectValue placeholder="Objective" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Objectives</SelectItem>
            {okrs.map(o => (
              <SelectItem key={o.id} value={o.id}>{o.titel}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Status</SelectItem>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="py-6"><div className="h-6 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine Key Results vorhanden</h3>
            <p className="text-muted-foreground">Erfassen Sie messbare Ergebnisse zu Ihren Objectives.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item, idx) => {
            const fortschritt = berechneKrFortschritt(item);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
                          <ListChecks className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{item.titel}</h3>
                            {statusBadge(item.status)}
                          </div>
                          {item.okr && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Target className="h-3 w-3" />
                              <span>Objective: {item.okr.titel}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-4 flex-wrap mt-2 text-xs text-muted-foreground">
                            {item.faelligkeit && (
                              <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />fällig {fmtDate(item.faelligkeit)}</span>
                            )}
                          </div>
                          {/* Fortschritt (berechnet) */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">
                                {item.istWert ?? '–'} / {item.zielWert ?? '–'} {item.einheit || ''}
                                <span className="ml-1">(Start {item.startWert ?? '–'})</span>
                              </span>
                              <span className="font-medium">{fortschritt}%</span>
                            </div>
                            <Progress value={fortschritt} className="h-2" />
                            <p className="text-[11px] text-muted-foreground mt-1">Fortschritt wird automatisch berechnet.</p>
                          </div>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Bearbeiten">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)} title="Löschen">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Dialog erstellen / bearbeiten */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Key Result bearbeiten' : 'Neues Key Result'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Zugehöriges Objective *</Label>
              <Select value={form.okrId} onValueChange={v => setForm(f => ({ ...f, okrId: v }))}>
                <SelectTrigger><SelectValue placeholder="Objective wählen" /></SelectTrigger>
                <SelectContent>
                  {okrs.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.titel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Titel *</Label>
              <Input
                value={form.titel}
                onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
                placeholder="z.B. NPS von 30 auf 50 steigern"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Startwert</Label>
                <Input
                  type="number"
                  value={form.startWert}
                  onChange={e => setForm(f => ({ ...f, startWert: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Zielwert</Label>
                <Input
                  type="number"
                  value={form.zielWert}
                  onChange={e => setForm(f => ({ ...f, zielWert: e.target.value }))}
                  placeholder="100"
                />
              </div>
              <div>
                <Label>Aktueller Wert</Label>
                <Input
                  type="number"
                  value={form.istWert}
                  onChange={e => setForm(f => ({ ...f, istWert: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            {wertFehler && (
              <p className="text-xs text-red-600 dark:text-red-400">{wertFehler}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Einheit</Label>
                <Input
                  value={form.einheit}
                  onChange={e => setForm(f => ({ ...f, einheit: e.target.value }))}
                  placeholder="%, CHF, Punkte, Anzahl"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Fälligkeitsdatum</Label>
              <Input
                type="date"
                value={form.faelligkeit}
                onChange={e => setForm(f => ({ ...f, faelligkeit: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Der Fortschritt wird automatisch aus Start-, Ziel- und aktuellem Wert berechnet.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving || !!wertFehler}>
              {saving ? 'Speichern...' : editingItem ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Löschen bestätigen */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Key Result löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Key Result „{deleteTarget?.titel}&#34; wird unwiderruflich gelöscht. Der Fortschritt des Objectives wird neu berechnet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
