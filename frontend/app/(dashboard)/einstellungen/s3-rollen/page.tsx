'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Shield, Star, ArrowLeft, ChevronRight } from 'lucide-react';
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

interface RollenDefinition {
  id: string;
  name: string;
  beschreibung: string | null;
  zweck: string | null;
  domaene: string | null;
  verantwortlichkeit: string | null;
  isLeadLink: boolean;
  erlaubtMehrfachbesetzung: boolean;
  aktiv: boolean;
  sortOrder: number;
  dateFrom: string | null;
  dateTo: string | null;
  _count?: { roles: number };
  createdAt: string;
}

/** ISO-Datum (evtl. mit Zeitanteil) auf YYYY-MM-DD für <input type="date"> kürzen. */
function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

/** Leeres Datumsfeld -> null, sonst als ISO-Datum (UTC-Mitternacht) senden. */
function fromDateInput(value: string): string | null {
  if (!value) return null;
  return new Date(value + 'T00:00:00Z').toISOString();
}

/* ------------------------------------------------------------------ */
/*  Seite                                                              */
/* ------------------------------------------------------------------ */

export default function S3RollenPage() {
  const { data: session } = useSession() || {};
  const role = (session?.user as Record<string, unknown>)?.role as string ?? '';

  const [definitionen, setDefinitionen] = useState<RollenDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RollenDefinition | null>(null);
  const [form, setForm] = useState({
    name: '',
    beschreibung: '',
    zweck: '',
    domaene: '',
    verantwortlichkeit: '',
    isLeadLink: false,
    erlaubtMehrfachbesetzung: false,
    aktiv: true,
    sortOrder: 0,
    dateFrom: '',
    dateTo: '',
  });
  const [saving, setSaving] = useState(false);

  /* ---------- Daten laden ---------- */

  const loadData = useCallback(() => {
    if (!session) return;
    apiClient
      .get<ODataResponse<RollenDefinition>>('/odata/S3RollenDefinitionen?$orderby=SortOrder,Name', session)
      .then(d => setDefinitionen(d.value ?? []))
      .catch(() => toast.error('Fehler beim Laden'))
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ---------- Dialog-Helfer ---------- */

  const openCreate = () => {
    setEditingItem(null);
    setForm({ name: '', beschreibung: '', zweck: '', domaene: '', verantwortlichkeit: '', isLeadLink: false, erlaubtMehrfachbesetzung: false, aktiv: true, sortOrder: 0, dateFrom: '', dateTo: '' });
    setDialogOpen(true);
  };

  /* ---------- Speichern ---------- */

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      beschreibung: form.beschreibung.trim() ? form.beschreibung.trim() : null,
      zweck: form.zweck.trim() ? form.zweck.trim() : null,
      domaene: form.domaene.trim() ? form.domaene.trim() : null,
      verantwortlichkeit: form.verantwortlichkeit.trim() ? form.verantwortlichkeit.trim() : null,
      dateFrom: fromDateInput(form.dateFrom),
      dateTo: fromDateInput(form.dateTo),
    };
    try {
      if (editingItem) {
        await apiClient.patch(`/odata/S3RollenDefinitionen(${editingItem.id})`, payload, session);
      } else {
        await apiClient.post('/odata/S3RollenDefinitionen', payload, session);
      }
      toast.success(editingItem ? 'Rollendefinition aktualisiert' : 'Rollendefinition erstellt');
      setDialogOpen(false);
      loadData();
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? error.message : 'Fehler beim Speichern';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Render ---------- */

  const canManage = hasPermission(role, 'stammdaten:manage');

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
            <h1 className="text-2xl font-bold">S3-Rollen</h1>
            <p className="text-muted-foreground">Vordefinierte S3-Rollentypen für die Organisation</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />Neue S3-Rolle
          </Button>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="py-6"><div className="h-6 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : definitionen.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine S3-Rollen</h3>
            <p className="text-muted-foreground">Erstellen Sie vordefinierte S3-Rollentypen für die Organisation.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {definitionen.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Link href={`/einstellungen/s3-rollen/${item.id}`} className="block">
              <Card className={`cursor-pointer transition-colors hover:bg-accent/50 ${!item.aktiv ? 'opacity-60' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg ${item.isLeadLink ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                        {item.isLeadLink
                          ? <Star className="h-4 w-4 text-amber-500" />
                          : <Shield className="h-4 w-4 text-primary" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{item.name}</h3>
                          {item.isLeadLink && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs">
                              Lead Link
                            </Badge>
                          )}
                          {!item.aktiv && (
                            <Badge variant="secondary" className="text-xs">Inaktiv</Badge>
                          )}
                          {(item._count?.roles ?? 0) > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {item._count?.roles} Verwendung{(item._count?.roles ?? 0) > 1 ? 'en' : ''}
                            </Badge>
                          )}
                        </div>
                        {item.beschreibung && (
                          <p className="text-sm text-muted-foreground mt-1">{item.beschreibung}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 text-muted-foreground">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Dialog erstellen / bearbeiten */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'S3-Rolle bearbeiten' : 'Neue S3-Rolle'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="z.B. Facilitator, Koordinator"
              />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea
                value={form.beschreibung}
                onChange={e => setForm(f => ({ ...f, beschreibung: e.target.value }))}
                rows={3}
                placeholder="Aufgaben und Verantwortlichkeiten dieser Rolle"
              />
            </div>
            <div>
              <Label>Zweck</Label>
              <Textarea
                value={form.zweck}
                onChange={e => setForm(f => ({ ...f, zweck: e.target.value }))}
                rows={2}
                placeholder="Zweck dieser Rolle"
              />
            </div>
            <div>
              <Label>Domäne</Label>
              <Textarea
                value={form.domaene}
                onChange={e => setForm(f => ({ ...f, domaene: e.target.value }))}
                rows={2}
                placeholder="Domäne (Verantwortungsbereich) dieser Rolle"
              />
            </div>
            <div>
              <Label>Verantwortlichkeit</Label>
              <Textarea
                value={form.verantwortlichkeit}
                onChange={e => setForm(f => ({ ...f, verantwortlichkeit: e.target.value }))}
                rows={4}
                placeholder="Verantwortlichkeiten dieser Rolle als Freitext"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="isLeadLink"
                checked={form.isLeadLink}
                onCheckedChange={v => setForm(f => ({ ...f, isLeadLink: v }))}
              />
              <Label htmlFor="isLeadLink">Lead Link (max. 1 pro Kreis)</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="erlaubtMehrfachbesetzung"
                checked={form.erlaubtMehrfachbesetzung}
                onCheckedChange={v => setForm(f => ({ ...f, erlaubtMehrfachbesetzung: v }))}
              />
              <Label htmlFor="erlaubtMehrfachbesetzung">Mehrfachbesetzung erlaubt (mehrere Personen gleichzeitig)</Label>
            </div>
            <div>
              <Label>Sortierreihenfolge</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gültig von</Label>
                <Input
                  type="date"
                  value={form.dateFrom}
                  onChange={e => setForm(f => ({ ...f, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <Label>Gültig bis</Label>
                <Input
                  type="date"
                  value={form.dateTo}
                  onChange={e => setForm(f => ({ ...f, dateTo: e.target.value }))}
                />
              </div>
            </div>
            {editingItem && (
              <div className="flex items-center gap-3">
                <Switch
                  id="aktiv"
                  checked={form.aktiv}
                  onCheckedChange={v => setForm(f => ({ ...f, aktiv: v }))}
                />
                <Label htmlFor="aktiv">Aktiv</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Speichern…' : editingItem ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
