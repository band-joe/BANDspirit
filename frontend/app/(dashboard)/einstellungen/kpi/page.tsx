'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Plus, Edit, Trash2, ArrowLeft, Search, Gauge, User, CalendarClock,
  TrendingUp, TrendingDown, Minus, LineChart,
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

interface Measurement {
  id: string;
  messdatum: string;
  istWert: number | null;
  trend: string;
  status: string;
  kommentar: string | null;
  massnahme: string | null;
}

interface KpiItem {
  id: string;
  name: string;
  beschreibung: string | null;
  kategorie: string | null;
  einheit: string | null;
  zielwert: number | null;
  warnschwelle: number | null;
  kritischeSchwelle: number | null;
  messintervall: string | null;
  datenquelle: string | null;
  richtung: string | null;
  verantwortlicherUserId: string | null;
  measurements?: Measurement[];
  createdAt: string;
}

const KATEGORIE_OPTIONS = ['Finanzen', 'Qualität', 'Prozesse', 'Kunden', 'Personal'];
const INTERVALL_OPTIONS = [
  { value: 'TAEGLICH', label: 'Täglich' },
  { value: 'WOECHENTLICH', label: 'Wöchentlich' },
  { value: 'MONATLICH', label: 'Monatlich' },
  { value: 'QUARTALSWEISE', label: 'Quartalsweise' },
  { value: 'JAEHRLICH', label: 'Jährlich' },
];
const RICHTUNG_OPTIONS = [
  { value: 'HOEHER_BESSER', label: 'Höher ist besser (z.B. Umsatz, NPS)' },
  { value: 'NIEDRIGER_BESSER', label: 'Niedriger ist besser (z.B. Fehlerrate, Kosten)' },
  { value: 'ZIELBAND', label: 'Zielband (Warnschwelle=Untergrenze, Kritische=Obergrenze)' },
];
const STATUS_OPTIONS = [
  { value: 'GRUEN', label: 'Grün' },
  { value: 'GELB', label: 'Gelb' },
  { value: 'ROT', label: 'Rot' },
];
const TREND_OPTIONS = [
  { value: 'STEIGEND', label: 'Steigend' },
  { value: 'FALLEND', label: 'Fallend' },
  { value: 'STABIL', label: 'Stabil' },
];

function statusBadge(status: string) {
  switch (status) {
    case 'GRUEN':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Grün</Badge>;
    case 'GELB':
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs">Gelb</Badge>;
    case 'ROT':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs">Rot</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">–</Badge>;
  }
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'STEIGEND') return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend === 'FALLEND') return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}
function trendLabel(trend: string) {
  return TREND_OPTIONS.find((t) => t.value === trend)?.label ?? 'Stabil';
}
function intervallLabel(v: string | null) {
  if (!v) return '–';
  return INTERVALL_OPTIONS.find((i) => i.value === v)?.label ?? v;
}
function richtungLabel(v: string | null) {
  if (!v) return 'Höher ist besser';
  return RICHTUNG_OPTIONS.find((r) => r.value === v)?.label ?? v;
}

function fmtDate(d: string | null) {
  if (!d) return '–';
  const date = new Date(d);
  return date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Zurich' });
}
function fmtNum(n: number | null | undefined, einheit?: string | null) {
  if (n === null || n === undefined) return '–';
  const s = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 2 }).format(n);
  return einheit ? `${s} ${einheit}` : s;
}
function fmtDateInput(d: string | null) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}
const numOrNull = (s: string): number | null => (s.trim() === '' ? null : Number(s));

/** Berechnet Abweichung (absolut/prozentual) zwischen Ist- und Zielwert client-seitig. */
function berechneAbweichung(zielwert: number | null, istWert: number | null | undefined) {
  if (zielwert === null || istWert === null || istWert === undefined) {
    return { abs: null as number | null, prozent: null as number | null };
  }
  const abs = istWert - zielwert;
  const prozent = zielwert !== 0 ? (abs / zielwert) * 100 : null;
  return { abs, prozent };
}

const EMPTY_DEF_FORM = {
  name: '',
  beschreibung: '',
  kategorie: '',
  verantwortlicherUserId: '',
  zielwert: '',
  einheit: '',
  warnschwelle: '',
  kritischeSchwelle: '',
  messintervall: 'MONATLICH',
  richtung: 'HOEHER_BESSER',
  datenquelle: '',
};

const EMPTY_MEAS_FORM = {
  messdatum: new Date().toISOString().slice(0, 10),
  istWert: '',
  status: 'GRUEN',
  kommentar: '',
  massnahme: '',
};

/**
 * Prüft die Reihenfolge von Warn- und kritischer Schwelle je nach Richtung
 * (spiegelt die serverseitige Validierung in KpiDefinitionsController wider).
 * Gibt eine deutsche Fehlermeldung zurück oder null, wenn alles korrekt ist.
 */
function pruefeSchwellenFehler(
  warn: number | null,
  kritisch: number | null,
  richtung: string,
): string | null {
  if (warn === null || kritisch === null) return null;
  if (richtung === 'HOEHER_BESSER') {
    if (kritisch >= warn) {
      return 'Bei „Höher ist besser“ muss die kritische Schwelle kleiner als die Warnschwelle sein.';
    }
  } else {
    // NIEDRIGER_BESSER und ZIELBAND
    if (warn >= kritisch) {
      return 'Die Warnschwelle muss kleiner als die kritische Schwelle sein.';
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Seite                                                              */
/* ------------------------------------------------------------------ */

export default function KpiPage() {
  const { data: session } = useSession() || {};
  const { can } = usePermissions();
  const canManage = can('kpi:manage');
  const canMeasure = can('kpi:measure');

  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [kategorieFilter, setKategorieFilter] = useState('ALL');

  // Definition-Dialog
  const [defOpen, setDefOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<KpiItem | null>(null);
  const [defForm, setDefForm] = useState({ ...EMPTY_DEF_FORM });
  const [savingDef, setSavingDef] = useState(false);

  // Delete-Dialog
  const [deleteTarget, setDeleteTarget] = useState<KpiItem | null>(null);

  // Messwerte-Dialog
  const [measOpen, setMeasOpen] = useState(false);
  const [measKpi, setMeasKpi] = useState<KpiItem | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [measForm, setMeasForm] = useState({ ...EMPTY_MEAS_FORM });
  const [editingMeas, setEditingMeas] = useState<Measurement | null>(null);
  const [savingMeas, setSavingMeas] = useState(false);
  const [measDeleteTarget, setMeasDeleteTarget] = useState<Measurement | null>(null);

  const ownerName = useCallback(
    (id: string | null) => (id ? owners.find((o) => o.id === id)?.name ?? 'Unbekannt' : 'Kein Owner'),
    [owners],
  );

  const loadKpis = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const filters: string[] = [];
      if (search.trim()) {
        const q = search.trim().toLowerCase().replace(/'/g, "''");
        filters.push(`contains(tolower(Name),'${q}')`);
      }
      if (kategorieFilter !== 'ALL') {
        filters.push(`Kategorie eq '${kategorieFilter.replace(/'/g, "''")}'`);
      }
      const parts: string[] = ['$expand=Measurements($orderby=Messdatum desc)'];
      if (filters.length) parts.push(`$filter=${encodeURIComponent(filters.join(' and '))}`);
      parts.push('$orderby=CreatedAt desc');
      const data = await apiClient.get<ODataResponse<KpiItem>>(`/odata/KpiDefinitions?${parts.join('&')}`, session);
      setKpis(data.value ?? []);
    } catch {
      toast.error('KPIs konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [search, kategorieFilter, session]);

  useEffect(() => { loadKpis(); }, [loadKpis]);

  useEffect(() => {
    if (!session) return;
    apiClient.get<ODataResponse<Owner>>('/odata/Users?$orderby=Name', session)
      .then((d) => setOwners(d.value ?? [])).catch(() => {});
  }, [session]);

  /* ---------------- Definition ---------------- */
  const openCreateDef = () => {
    setEditingDef(null);
    setDefForm({ ...EMPTY_DEF_FORM });
    setDefOpen(true);
  };
  const openEditDef = (k: KpiItem) => {
    setEditingDef(k);
    setDefForm({
      name: k.name ?? '',
      beschreibung: k.beschreibung ?? '',
      kategorie: k.kategorie ?? '',
      verantwortlicherUserId: k.verantwortlicherUserId ?? '',
      zielwert: k.zielwert?.toString() ?? '',
      einheit: k.einheit ?? '',
      warnschwelle: k.warnschwelle?.toString() ?? '',
      kritischeSchwelle: k.kritischeSchwelle?.toString() ?? '',
      messintervall: k.messintervall ?? 'MONATLICH',
      richtung: k.richtung ?? 'HOEHER_BESSER',
      datenquelle: k.datenquelle ?? '',
    });
    setDefOpen(true);
  };

  const saveDef = async () => {
    if (!defForm.name.trim()) { toast.error('Name ist erforderlich'); return; }
    const schwFehler = pruefeSchwellenFehler(
      numOrNull(defForm.warnschwelle),
      numOrNull(defForm.kritischeSchwelle),
      defForm.richtung,
    );
    if (schwFehler) { toast.error(schwFehler); return; }
    setSavingDef(true);
    try {
      const payload = {
        name: defForm.name,
        beschreibung: defForm.beschreibung || null,
        kategorie: defForm.kategorie || null,
        datenquelle: defForm.datenquelle || null,
        verantwortlicherUserId: defForm.verantwortlicherUserId || null,
        einheit: defForm.einheit || null,
        zielwert: numOrNull(defForm.zielwert),
        warnschwelle: numOrNull(defForm.warnschwelle),
        kritischeSchwelle: numOrNull(defForm.kritischeSchwelle),
        messintervall: defForm.messintervall || null,
        richtung: defForm.richtung || null,
      };
      if (editingDef) {
        await apiClient.patch(`/odata/KpiDefinitions(${editingDef.id})`, payload, session);
      } else {
        await apiClient.post('/odata/KpiDefinitions', payload, session);
      }
      toast.success(editingDef ? 'KPI aktualisiert' : 'KPI erstellt');
      setDefOpen(false);
      loadKpis();
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? error.message : 'Speichern fehlgeschlagen';
      toast.error(msg);
    } finally {
      setSavingDef(false);
    }
  };

  const confirmDeleteDef = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/odata/KpiDefinitions(${deleteTarget.id})`, session);
      toast.success('KPI gelöscht');
      setDeleteTarget(null);
      loadKpis();
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? error.message : 'Löschen fehlgeschlagen';
      toast.error(msg);
    }
  };

  /* ---------------- Messwerte ---------------- */
  const fetchMeasurements = useCallback(async (kpiId: string): Promise<Measurement[]> => {
    try {
      const d = await apiClient.get<ODataResponse<Measurement>>(
        `/odata/KpiMeasurements?$filter=KpiDefinitionId eq ${kpiId}&$orderby=Messdatum desc`,
        session,
      );
      return d.value ?? [];
    } catch {
      return [];
    }
  }, [session]);

  const openMeasurements = async (k: KpiItem) => {
    setMeasKpi(k);
    setMeasForm({ ...EMPTY_MEAS_FORM });
    setEditingMeas(null);
    setMeasOpen(true);
    setMeasurements(await fetchMeasurements(k.id));
  };

  const startEditMeas = (m: Measurement) => {
    setEditingMeas(m);
    setMeasForm({
      messdatum: fmtDateInput(m.messdatum) || new Date().toISOString().slice(0, 10),
      istWert: m.istWert?.toString() ?? '',
      status: m.status ?? 'GRUEN',
      kommentar: m.kommentar ?? '',
      massnahme: m.massnahme ?? '',
    });
  };

  const resetMeasForm = () => {
    setEditingMeas(null);
    setMeasForm({ ...EMPTY_MEAS_FORM });
  };

  const saveMeas = async () => {
    if (!measKpi) return;
    if (measForm.istWert === '') { toast.error('Ist-Wert ist erforderlich'); return; }
    setSavingMeas(true);
    try {
      const payload = {
        messdatum: measForm.messdatum,
        istWert: Number(measForm.istWert),
        status: measForm.status,
        kommentar: measForm.kommentar || null,
        massnahme: measForm.massnahme || null,
      };
      if (editingMeas) {
        await apiClient.patch(`/odata/KpiMeasurements(${editingMeas.id})`, payload, session);
      } else {
        await apiClient.post('/odata/KpiMeasurements', { ...payload, kpiDefinitionId: measKpi.id }, session);
      }
      toast.success(editingMeas ? 'Messwert aktualisiert' : 'Messwert erfasst');
      resetMeasForm();
      setMeasurements(await fetchMeasurements(measKpi.id));
      loadKpis();
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? error.message : 'Speichern fehlgeschlagen';
      toast.error(msg);
    } finally {
      setSavingMeas(false);
    }
  };

  const confirmDeleteMeas = async () => {
    if (!measDeleteTarget || !measKpi) return;
    try {
      await apiClient.delete(`/odata/KpiMeasurements(${measDeleteTarget.id})`, session);
      toast.success('Messwert gelöscht');
      setMeasDeleteTarget(null);
      setMeasurements(await fetchMeasurements(measKpi.id));
      loadKpis();
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? error.message : 'Löschen fehlgeschlagen';
      toast.error(msg);
    }
  };

  const setDF = (k: keyof typeof EMPTY_DEF_FORM, v: string) => setDefForm((p) => ({ ...p, [k]: v }));
  const setMF = (k: keyof typeof EMPTY_MEAS_FORM, v: string) => setMeasForm((p) => ({ ...p, [k]: v }));

  const schwellenFehler = pruefeSchwellenFehler(
    numOrNull(defForm.warnschwelle),
    numOrNull(defForm.kritischeSchwelle),
    defForm.richtung,
  );

  /* ------------------------------------------------------------------ */
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/einstellungen/firma" className="inline-flex items-center gap-1 hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Einstellungen
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Gauge className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">KPIs</h1>
            <p className="text-sm text-muted-foreground">Kennzahlen definieren und Messwerte im Zeitverlauf erfassen</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openCreateDef} className="gap-2">
            <Plus className="h-4 w-4" /> Neue KPI
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Suche nach Name …"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={kategorieFilter} onValueChange={setKategorieFilter}>
          <SelectTrigger className="sm:w-56"><SelectValue placeholder="Kategorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Kategorien</SelectItem>
            {KATEGORIE_OPTIONS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Liste */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Wird geladen …</p>
      ) : kpis.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Noch keine KPIs erfasst.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {kpis.map((k) => {
            const latest = k.measurements?.[0];
            const abw = berechneAbweichung(k.zielwert, latest?.istWert);
            return (
              <motion.div key={k.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">{k.name}</h3>
                          {k.kategorie && <Badge variant="secondary" className="text-xs">{k.kategorie}</Badge>}
                          {latest ? statusBadge(latest.status) : <Badge variant="outline" className="text-xs">Kein Messwert</Badge>}
                          {latest && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <TrendIcon trend={latest.trend} /> {trendLabel(latest.trend)}
                            </span>
                          )}
                        </div>
                        {k.beschreibung && <p className="text-sm text-muted-foreground">{k.beschreibung}</p>}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> {ownerName(k.verantwortlicherUserId)}</span>
                          <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {intervallLabel(k.messintervall)}</span>
                          <span>Richtung: {richtungLabel(k.richtung)}</span>
                          {k.datenquelle && <span>Quelle: {k.datenquelle}</span>}
                          <span>{k.measurements?.length ?? 0} Messwert(e)</span>
                        </div>
                      </div>

                      {/* Kennzahlen */}
                      <div className="flex flex-wrap gap-4 rounded-lg bg-muted/40 p-3 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground">Ist (aktuell)</div>
                          <div className="font-semibold">{fmtNum(latest?.istWert, k.einheit)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Ziel</div>
                          <div className="font-semibold">{fmtNum(k.zielwert, k.einheit)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Abweichung</div>
                          <div className="font-semibold">
                            {abw.abs === null
                              ? '–'
                              : `${fmtNum(abw.abs, k.einheit)}${abw.prozent !== null ? ` (${fmtNum(abw.prozent)} %)` : ''}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => openMeasurements(k)}>
                        <LineChart className="h-4 w-4" /> Messwerte
                      </Button>
                      {canManage && (
                        <>
                          <Button size="sm" variant="ghost" className="gap-1" onClick={() => openEditDef(k)}>
                            <Edit className="h-4 w-4" /> Bearbeiten
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1 text-red-600 hover:text-red-700" onClick={() => setDeleteTarget(k)}>
                            <Trash2 className="h-4 w-4" /> Löschen
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ---------------- Definition-Dialog ---------------- */}
      <Dialog open={defOpen} onOpenChange={setDefOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDef ? 'KPI bearbeiten' : 'Neue KPI'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={defForm.name} onChange={(e) => setDF('name', e.target.value)} placeholder="z. B. Durchschnittliche Zufriedenheitsbewertung" />
            </div>
            <div className="grid gap-2">
              <Label>Beschreibung</Label>
              <Textarea value={defForm.beschreibung} onChange={(e) => setDF('beschreibung', e.target.value)} rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Kategorie</Label>
                <Select value={defForm.kategorie || 'NONE'} onValueChange={(v) => setDF('kategorie', v === 'NONE' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Kategorie" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">– keine –</SelectItem>
                    {KATEGORIE_OPTIONS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Verantwortliche Person</Label>
                <Select value={defForm.verantwortlicherUserId || 'NONE'} onValueChange={(v) => setDF('verantwortlicherUserId', v === 'NONE' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Verantwortliche Person" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">– keine –</SelectItem>
                    {owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Zielwert</Label>
                <Input type="number" value={defForm.zielwert} onChange={(e) => setDF('zielwert', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Einheit</Label>
                <Input value={defForm.einheit} onChange={(e) => setDF('einheit', e.target.value)} placeholder="%, CHF, Anzahl …" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Richtung</Label>
              <Select value={defForm.richtung} onValueChange={(v) => setDF('richtung', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RICHTUNG_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Warnschwelle (gelb)</Label>
                <Input type="number" value={defForm.warnschwelle} onChange={(e) => setDF('warnschwelle', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Kritische Schwelle (rot)</Label>
                <Input type="number" value={defForm.kritischeSchwelle} onChange={(e) => setDF('kritischeSchwelle', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Messintervall</Label>
                <Select value={defForm.messintervall} onValueChange={(v) => setDF('messintervall', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INTERVALL_OPTIONS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {schwellenFehler && (
              <p className="text-xs text-red-600 dark:text-red-400">{schwellenFehler}</p>
            )}
            <div className="grid gap-2">
              <Label>Datenquelle</Label>
              <Input value={defForm.datenquelle} onChange={(e) => setDF('datenquelle', e.target.value)} placeholder="ERP, CRM, Datenbank, API …" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDefOpen(false)}>Abbrechen</Button>
            <Button onClick={saveDef} disabled={savingDef || !!schwellenFehler}>{savingDef ? 'Speichern …' : 'Speichern'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Messwerte-Dialog ---------------- */}
      <Dialog open={measOpen} onOpenChange={setMeasOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" /> Messwerte · {measKpi?.name}
            </DialogTitle>
          </DialogHeader>

          {measKpi && (
            <div className="space-y-5">
              {/* Erfassungsformular */}
              {canMeasure && (
                <div className="rounded-lg border p-4">
                  <div className="mb-3 text-sm font-medium">{editingMeas ? 'Messwert bearbeiten' : 'Neuen Messwert erfassen'}</div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Messdatum</Label>
                      <Input type="date" value={measForm.messdatum} onChange={(e) => setMF('messdatum', e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Ist-Wert *{measKpi.einheit ? ` (${measKpi.einheit})` : ''}</Label>
                      <Input type="number" value={measForm.istWert} onChange={(e) => setMF('istWert', e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select value={measForm.status} onValueChange={(v) => setMF('status', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5 sm:col-span-2">
                      <Label className="text-xs">Kommentar</Label>
                      <Input value={measForm.kommentar} onChange={(e) => setMF('kommentar', e.target.value)} />
                    </div>
                    <div className="grid gap-1.5 sm:col-span-2 lg:col-span-4">
                      <Label className="text-xs">Massnahme</Label>
                      <Input value={measForm.massnahme} onChange={(e) => setMF('massnahme', e.target.value)} />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={saveMeas} disabled={savingMeas}>
                      {savingMeas ? 'Speichern …' : editingMeas ? 'Aktualisieren' : 'Erfassen'}
                    </Button>
                    {editingMeas && <Button size="sm" variant="outline" onClick={resetMeasForm}>Abbrechen</Button>}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Der Trend wird automatisch aus den letzten Messwerten berechnet.
                  </p>
                </div>
              )}

              {/* Historie */}
              <div>
                <div className="mb-2 text-sm font-medium">Verlauf ({measurements.length})</div>
                {measurements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Noch keine Messwerte erfasst.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">Datum</th>
                          <th className="px-3 py-2 text-right">Ist</th>
                          <th className="px-3 py-2 text-right">Abweichung</th>
                          <th className="px-3 py-2 text-center">Status</th>
                          <th className="px-3 py-2 text-center">Trend</th>
                          <th className="px-3 py-2 text-left">Kommentar</th>
                          {canMeasure && <th className="px-3 py-2"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {measurements.map((m) => {
                          const mAbw = berechneAbweichung(measKpi.zielwert, m.istWert);
                          return (
                            <tr key={m.id} className="border-t">
                              <td className="px-3 py-2">{fmtDate(m.messdatum)}</td>
                              <td className="px-3 py-2 text-right font-medium">{fmtNum(m.istWert, measKpi.einheit)}</td>
                              <td className="px-3 py-2 text-right">
                                {mAbw.abs === null
                                  ? '–'
                                  : `${fmtNum(mAbw.abs)}${mAbw.prozent !== null ? ` (${fmtNum(mAbw.prozent)} %)` : ''}`}
                              </td>
                              <td className="px-3 py-2 text-center">{statusBadge(m.status)}</td>
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center justify-center gap-1"><TrendIcon trend={m.trend} /></span>
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{m.kommentar || '–'}</td>
                              {canMeasure && (
                                <td className="px-3 py-2">
                                  <div className="flex justify-end gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditMeas(m)}>
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => setMeasDeleteTarget(m)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMeasOpen(false)}>Schliessen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Definition */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>KPI löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die KPI «{deleteTarget?.name}» und alle zugehörigen Messwerte werden unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDef} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Measurement */}
      <AlertDialog open={!!measDeleteTarget} onOpenChange={(o) => !o && setMeasDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Messwert löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Messwert vom {fmtDate(measDeleteTarget?.messdatum ?? null)} wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMeas} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
