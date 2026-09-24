'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Plus, Edit, Trash2, ArrowLeft, Search, Target, ChevronDown, ChevronRight, User, CalendarRange,
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

interface Owner { id: string; name: string; email?: string; }
interface OkrZyklus { id: string; titel: string; aktiv: boolean; }
interface KeyResultLite {
  id: string;
  titel: string;
  startWert: number | null;
  zielWert: number | null;
  istWert: number | null;
  einheit: string | null;
  status: string;
  fortschritt: number;
}
interface OKRItem {
  id: string;
  titel: string;
  beschreibung: string | null;
  status: string;
  prioritaet: string;
  kategorie: string | null;
  fortschritt: number;
  verantwortlicherUserId: string | null;
  zyklusId: string | null;
  zyklus?: { id: string; titel: string } | null;
  keyResults: KeyResultLite[];
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: 'ENTWURF', label: 'Entwurf' },
  { value: 'AKTIV', label: 'Aktiv' },
  { value: 'ERREICHT', label: 'Erreicht' },
  { value: 'NICHT_ERREICHT', label: 'Nicht erreicht' },
];
const PRIO_OPTIONS = [
  { value: 'HOCH', label: 'Hoch' },
  { value: 'MITTEL', label: 'Mittel' },
  { value: 'TIEF', label: 'Tief' },
];
const KATEGORIE_OPTIONS = [
  'Strategie', 'Produkt', 'Qualität', 'Ausbildung', 'Finanzen', 'Organisation', 'Sonstiges',
];
const KR_STATUS_LABEL: Record<string, string> = {
  NICHT_GESTARTET: 'Nicht gestartet',
  IN_ARBEIT: 'In Arbeit',
  ERFUELLT: 'Erfüllt',
};

/** Berechnet den Fortschritt eines Key Results aus Start-, Ziel- und Istwert (0–100). */
function berechneKrFortschritt(kr: KeyResultLite): number {
  const { startWert, zielWert, istWert } = kr;
  if (startWert == null || zielWert == null || istWert == null) return 0;
  const range = zielWert - startWert;
  if (range === 0) return istWert >= zielWert ? 100 : 0;
  const progress = ((istWert - startWert) / range) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function statusBadge(status: string) {
  switch (status) {
    case 'AKTIV':
      return <Badge className="bg-primary/10 text-primary text-xs">Aktiv</Badge>;
    case 'ERREICHT':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Erreicht</Badge>;
    case 'NICHT_ERREICHT':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs">Nicht erreicht</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">Entwurf</Badge>;
  }
}
function prioBadge(prio: string) {
  switch (prio) {
    case 'HOCH':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs">Priorität: Hoch</Badge>;
    case 'TIEF':
      return <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs">Priorität: Tief</Badge>;
    default:
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs">Priorität: Mittel</Badge>;
  }
}

const EMPTY_FORM = {
  titel: '',
  beschreibung: '',
  verantwortlicherUserId: '',
  zyklusId: '',
  status: 'ENTWURF',
  prioritaet: 'MITTEL',
  kategorie: '',
};

/* ------------------------------------------------------------------ */
/*  Seite                                                              */
/* ------------------------------------------------------------------ */

export default function OkrPage() {
  const { data: session } = useSession() || {};
  const { can } = usePermissions();
  const canManage = can('okr:manage');

  const [items, setItems] = useState<OKRItem[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [zyklen, setZyklen] = useState<OkrZyklus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [zyklusFilter, setZyklusFilter] = useState('ALL');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OKRItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OKRItem | null>(null);

  const ownerName = useCallback(
    (id: string | null) => (id ? owners.find((o) => o.id === id)?.name ?? 'Unbekannt' : null),
    [owners],
  );

  /* ---------- Daten laden ---------- */

  const loadData = useCallback(() => {
    if (!session) return;
    setLoading(true);
    const filters: string[] = [];
    if (search.trim()) {
      const q = search.trim().toLowerCase().replace(/'/g, "''");
      filters.push(`contains(tolower(Titel),'${q}')`);
    }
    if (statusFilter !== 'ALL') filters.push(`Status eq '${statusFilter}'`);
    if (zyklusFilter !== 'ALL') filters.push(`ZyklusId eq ${zyklusFilter}`);
    const parts: string[] = ['$expand=Zyklus($select=Id,Titel),KeyResults'];
    if (filters.length) parts.push(`$filter=${encodeURIComponent(filters.join(' and '))}`);
    parts.push('$orderby=CreatedAt desc');
    apiClient
      .get<ODataResponse<OKRItem>>(`/odata/OKRs?${parts.join('&')}`, session)
      .then(d => setItems(d.value ?? []))
      .catch(() => toast.error('Fehler beim Laden der OKRs'))
      .finally(() => setLoading(false));
  }, [search, statusFilter, zyklusFilter, session]);

  useEffect(() => {
    const t = setTimeout(loadData, 250);
    return () => clearTimeout(t);
  }, [loadData]);

  useEffect(() => {
    if (!session) return;
    apiClient
      .get<ODataResponse<Owner>>('/odata/Users?$orderby=Name', session)
      .then(d => setOwners(d.value ?? []))
      .catch(() => {});
    apiClient
      .get<ODataResponse<OkrZyklus>>('/odata/OkrZyklen?$orderby=StartDatum desc', session)
      .then(d => setZyklen(d.value ?? []))
      .catch(() => {});
  }, [session]);

  /* ---------- Dialog-Helfer ---------- */

  const openCreate = () => {
    setEditingItem(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (item: OKRItem) => {
    setEditingItem(item);
    setForm({
      titel: item.titel,
      beschreibung: item.beschreibung || '',
      verantwortlicherUserId: item.verantwortlicherUserId || '',
      zyklusId: item.zyklusId || '',
      status: item.status,
      prioritaet: item.prioritaet,
      kategorie: item.kategorie || '',
    });
    setDialogOpen(true);
  };

  /* ---------- Speichern ---------- */

  const handleSave = async () => {
    if (!form.titel.trim()) {
      toast.error('Titel / Objective ist erforderlich');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        titel: form.titel,
        beschreibung: form.beschreibung || null,
        verantwortlicherUserId: form.verantwortlicherUserId || null,
        zyklusId: form.zyklusId || null,
        status: form.status,
        prioritaet: form.prioritaet,
        kategorie: form.kategorie || null,
      };
      if (editingItem) {
        await apiClient.patch(`/odata/OKRs(${editingItem.id})`, payload, session);
      } else {
        await apiClient.post('/odata/OKRs', payload, session);
      }
      toast.success(editingItem ? 'OKR aktualisiert' : 'OKR erstellt');
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
      await apiClient.delete(`/odata/OKRs(${deleteTarget.id})`, session);
      toast.success('OKR gelöscht');
      loadData();
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? error.message : 'Fehler beim Löschen';
      toast.error(msg);
    } finally {
      setDeleteTarget(null);
    }
  };

  /* ---------- Render ---------- */

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
            <h1 className="text-2xl font-bold">OKR</h1>
            <p className="text-muted-foreground">Objectives &amp; Key Results der Organisation</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />Neues Objective
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Suche nach Titel ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Status</SelectItem>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={zyklusFilter} onValueChange={setZyklusFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Zyklus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Zyklen</SelectItem>
            {zyklen.map(z => (
              <SelectItem key={z.id} value={z.id}>{z.titel}</SelectItem>
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
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine OKRs vorhanden</h3>
            <p className="text-muted-foreground">Erstellen Sie ein Objective mit messbaren Key Results.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item, idx) => {
            const isOpen = !!expanded[item.id];
            const oname = ownerName(item.verantwortlicherUserId);
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
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{item.titel}</h3>
                            {statusBadge(item.status)}
                            {prioBadge(item.prioritaet)}
                            {item.kategorie && (
                              <Badge variant="outline" className="text-xs">{item.kategorie}</Badge>
                            )}
                            {item.zyklus && (
                              <Badge variant="outline" className="text-xs">{item.zyklus.titel}</Badge>
                            )}
                          </div>
                          {item.beschreibung && (
                            <p className="text-sm text-muted-foreground mt-1">{item.beschreibung}</p>
                          )}
                          <div className="flex items-center gap-4 flex-wrap mt-2 text-xs text-muted-foreground">
                            {oname && (
                              <span className="flex items-center gap-1"><User className="h-3 w-3" />{oname}</span>
                            )}
                            {item.zyklus && (
                              <span className="flex items-center gap-1"><CalendarRange className="h-3 w-3" />{item.zyklus.titel}</span>
                            )}
                          </div>
                          {/* Fortschritt (aggregiert) */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Fortschritt (Durchschnitt der Key Results)</span>
                              <span className="font-medium">{item.fortschritt}%</span>
                            </div>
                            <Progress value={item.fortschritt} className="h-2" />
                          </div>
                          {/* Key Results Toggle */}
                          <button
                            type="button"
                            onClick={() => setExpanded(e => ({ ...e, [item.id]: !e[item.id] }))}
                            className="flex items-center gap-1 mt-3 text-sm text-primary hover:underline"
                          >
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {(item.keyResults?.length ?? 0)} Key Result{(item.keyResults?.length ?? 0) === 1 ? '' : 's'}
                          </button>
                          {isOpen && (
                            <div className="mt-3 space-y-3 border-l-2 border-muted pl-4">
                              {(item.keyResults?.length ?? 0) === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  Noch keine Key Results. Diese werden im Menüpunkt „Key Results&#34; erfasst.
                                </p>
                              ) : item.keyResults.map(kr => {
                                const fortschritt = berechneKrFortschritt(kr);
                                return (
                                  <div key={kr.id}>
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <span className="text-sm font-medium">{kr.titel}</span>
                                      <Badge variant="secondary" className="text-xs">{KR_STATUS_LABEL[kr.status] || kr.status}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Progress value={fortschritt} className="h-1.5 flex-1" />
                                      <span className="text-xs font-medium w-10 text-right">{fortschritt}%</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {kr.istWert ?? '–'} / {kr.zielWert ?? '–'} {kr.einheit || ''}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
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
            <DialogTitle>{editingItem ? 'Objective bearbeiten' : 'Neues Objective'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titel / Objective *</Label>
              <Input
                value={form.titel}
                onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
                placeholder="z.B. Kundenzufriedenheit deutlich steigern"
              />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea
                value={form.beschreibung}
                onChange={e => setForm(f => ({ ...f, beschreibung: e.target.value }))}
                rows={3}
                placeholder="Worum geht es bei diesem Ziel?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Verantwortliche Person</Label>
                <Select value={form.verantwortlicherUserId || 'NONE'} onValueChange={v => setForm(f => ({ ...f, verantwortlicherUserId: v === 'NONE' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Person wählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">– Keine –</SelectItem>
                    {owners.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>OKR-Zyklus</Label>
                <Select value={form.zyklusId || 'NONE'} onValueChange={v => setForm(f => ({ ...f, zyklusId: v === 'NONE' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Zyklus wählen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">– Kein Zyklus –</SelectItem>
                    {zyklen.map(z => (
                      <SelectItem key={z.id} value={z.id}>{z.titel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kategorie</Label>
                <Select value={form.kategorie || 'NONE'} onValueChange={v => setForm(f => ({ ...f, kategorie: v === 'NONE' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Kategorie" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">– Keine –</SelectItem>
                    {KATEGORIE_OPTIONS.map(k => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priorität</Label>
                <Select value={form.prioritaet} onValueChange={v => setForm(f => ({ ...f, prioritaet: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIO_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editingItem && (
              <p className="text-xs text-muted-foreground">
                Der Fortschritt wird automatisch aus den zugehörigen Key Results berechnet.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Speichern...' : editingItem ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Löschen bestätigen */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>OKR löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das Objective „{deleteTarget?.titel}&#34; und alle zugehörigen Key Results werden unwiderruflich gelöscht.
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
