'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Edit, Trash2, ArrowLeft, Search, CalendarRange,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';
import { apiClient } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { ApiError } from '@/lib/errors';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Typen                                                              */
/* ------------------------------------------------------------------ */

interface ZyklusItem {
  id: string;
  titel: string;
  startDatum: string | null;
  endDatum: string | null;
  aktiv: boolean;
  createdAt: string;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

const EMPTY_FORM = {
  titel: '',
  startDatum: '',
  endDatum: '',
  aktiv: false,
};

/* ------------------------------------------------------------------ */
/*  Seite                                                              */
/* ------------------------------------------------------------------ */

export default function OkrZyklenPage() {
  const { data: session } = useSession() || {};
  const role = (session?.user as Record<string, unknown>)?.role as string ?? '';
  const canManage = hasPermission(role, 'okr:manage');

  const [items, setItems] = useState<ZyklusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ZyklusItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ZyklusItem | null>(null);

  /* ---------- Daten laden ---------- */

  const loadData = useCallback(() => {
    if (!session) return;
    setLoading(true);
    const filters: string[] = [];
    if (search.trim()) {
      const q = search.trim().toLowerCase().replace(/'/g, "''");
      filters.push(`contains(tolower(Titel),'${q}')`);
    }
    const parts: string[] = [];
    if (filters.length) parts.push(`$filter=${encodeURIComponent(filters.join(' and '))}`);
    parts.push('$orderby=StartDatum desc');
    apiClient
      .get<ODataResponse<ZyklusItem>>(`/odata/OkrZyklen?${parts.join('&')}`, session)
      .then(d => setItems(d.value ?? []))
      .catch(() => toast.error('Fehler beim Laden der OKR-Zyklen'))
      .finally(() => setLoading(false));
  }, [search, session]);

  useEffect(() => {
    const t = setTimeout(loadData, 250);
    return () => clearTimeout(t);
  }, [loadData]);

  /* ---------- Dialog-Helfer ---------- */

  const openCreate = () => {
    setEditingItem(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (item: ZyklusItem) => {
    setEditingItem(item);
    setForm({
      titel: item.titel,
      startDatum: item.startDatum ? item.startDatum.slice(0, 10) : '',
      endDatum: item.endDatum ? item.endDatum.slice(0, 10) : '',
      aktiv: item.aktiv,
    });
    setDialogOpen(true);
  };

  /* ---------- Speichern ---------- */

  const handleSave = async () => {
    if (!form.titel.trim()) {
      toast.error('Titel ist erforderlich');
      return;
    }
    if (!form.startDatum || !form.endDatum) {
      toast.error('Start- und Enddatum sind erforderlich');
      return;
    }
    if (form.endDatum < form.startDatum) {
      toast.error('Das Enddatum darf nicht vor dem Startdatum liegen');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        titel: form.titel.trim(),
        startDatum: form.startDatum,
        endDatum: form.endDatum,
        aktiv: form.aktiv,
      };
      if (editingItem) {
        await apiClient.patch(`/odata/OkrZyklen(${editingItem.id})`, payload, session);
      } else {
        await apiClient.post('/odata/OkrZyklen', payload, session);
      }
      toast.success(editingItem ? 'Zyklus aktualisiert' : 'Zyklus erstellt');
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
      await apiClient.delete(`/odata/OkrZyklen(${deleteTarget.id})`, session);
      toast.success('Zyklus gelöscht');
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
            <h1 className="text-2xl font-bold">OKR-Zyklen</h1>
            <p className="text-muted-foreground">Planungszeiträume für Objectives &amp; Key Results</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />Neuer Zyklus
          </Button>
        )}
      </div>

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
            <CalendarRange className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine OKR-Zyklen vorhanden</h3>
            <p className="text-muted-foreground">Legen Sie Planungszeiträume (z. B. Q1 2027) an.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((item, idx) => (
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
                        <CalendarRange className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{item.titel}</h3>
                          {item.aktiv ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Aktiv</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Inaktiv</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {fmtDate(item.startDatum)} – {fmtDate(item.endDatum)}
                        </p>
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
          ))}
        </div>
      )}

      {/* Dialog erstellen / bearbeiten */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Zyklus bearbeiten' : 'Neuer Zyklus'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titel *</Label>
              <Input
                value={form.titel}
                onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
                placeholder="z.B. Q1 2027"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Startdatum *</Label>
                <Input
                  type="date"
                  value={form.startDatum}
                  onChange={e => setForm(f => ({ ...f, startDatum: e.target.value }))}
                />
              </div>
              <div>
                <Label>Enddatum *</Label>
                <Input
                  type="date"
                  value={form.endDatum}
                  onChange={e => setForm(f => ({ ...f, endDatum: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Aktiv</Label>
                <p className="text-xs text-muted-foreground">Kennzeichnet den aktuell laufenden Zyklus.</p>
              </div>
              <Switch
                checked={form.aktiv}
                onCheckedChange={v => setForm(f => ({ ...f, aktiv: v }))}
              />
            </div>
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
            <AlertDialogTitle>Zyklus löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Zyklus „{deleteTarget?.titel}&#34; wird unwiderruflich gelöscht. Zugeordnete OKRs verlieren ihre Zyklus-Zuordnung.
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
