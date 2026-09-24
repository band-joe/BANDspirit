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
import { Plus, Edit, Shield, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { ApiError } from '@/lib/errors';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Typen                                                              */
/* ------------------------------------------------------------------ */

interface BenutzerRolle {
  id: string;
  name: string;
  beschreibung: string | null;
  istSystemAdmin: boolean;
  aktiv: boolean;
  sortOrder: number;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Seite                                                              */
/* ------------------------------------------------------------------ */

export default function BenutzerRollenPage() {
  const { data: session } = useSession() || {};
  const { can } = usePermissions();

  const [rollen, setRollen] = useState<BenutzerRolle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BenutzerRolle | null>(null);
  const [form, setForm] = useState({
    name: '',
    beschreibung: '',
    aktiv: true,
    sortOrder: 0,
  });
  const [saving, setSaving] = useState(false);

  /* ---------- Daten laden ---------- */

  const loadData = useCallback(() => {
    if (!session) return;
    apiClient
      .get<ODataResponse<BenutzerRolle>>('/odata/BenutzerRollen?$orderby=SortOrder,Name', session)
      .then(d => setRollen(d.value ?? []))
      .catch(() => toast.error('Fehler beim Laden'))
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ---------- Dialog-Helfer ---------- */

  const openCreate = () => {
    setEditingItem(null);
    setForm({ name: '', beschreibung: '', aktiv: true, sortOrder: 0 });
    setDialogOpen(true);
  };

  const openEdit = (item: BenutzerRolle) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      beschreibung: item.beschreibung || '',
      aktiv: item.aktiv,
      sortOrder: item.sortOrder,
    });
    setDialogOpen(true);
  };

  /* ---------- Speichern ---------- */

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }
    setSaving(true);
    // Beim Bearbeiten der System-Admin-Rolle Name/Aktiv nicht mitsenden
    // (das Backend würde diese Änderungen ohnehin ablehnen).
    const istSystemAdmin = editingItem?.istSystemAdmin ?? false;
    const payload: Record<string, unknown> = istSystemAdmin
      ? { beschreibung: form.beschreibung, sortOrder: form.sortOrder }
      : { name: form.name.trim(), beschreibung: form.beschreibung, aktiv: form.aktiv, sortOrder: form.sortOrder };
    try {
      if (editingItem) {
        await apiClient.patch(`/odata/BenutzerRollen(${editingItem.id})`, payload, session);
      } else {
        await apiClient.post('/odata/BenutzerRollen', payload, session);
      }
      toast.success(editingItem ? 'Benutzerrolle aktualisiert' : 'Benutzerrolle erstellt');
      setDialogOpen(false);
      loadData();
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? error.message : 'Fehler beim Speichern';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Aktiv umschalten ---------- */

  const toggleAktiv = async (item: BenutzerRolle) => {
    if (item.istSystemAdmin) {
      toast.error('Die System-Administrator-Rolle kann nicht deaktiviert werden.');
      return;
    }
    try {
      await apiClient.patch(`/odata/BenutzerRollen(${item.id})`, { aktiv: !item.aktiv }, session);
      toast.success(item.aktiv ? 'Deaktiviert' : 'Aktiviert');
      loadData();
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? error.message : 'Fehler beim Aktualisieren';
      toast.error(msg);
    }
  };

  /* ---------- Render ---------- */

  const canManage = can('user:manage');

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
            <h1 className="text-2xl font-bold">Benutzerrollen</h1>
            <p className="text-muted-foreground">
              Applikationsrollen für die Benutzerverwaltung (nicht zu verwechseln mit den soziokratischen S3-Rollen unter „Rollen“).
            </p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />Neue Benutzerrolle
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
      ) : rollen.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine Benutzerrollen</h3>
            <p className="text-muted-foreground">Erstellen Sie Applikationsrollen für die Benutzerverwaltung.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rollen.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card className={!item.aktiv ? 'opacity-60' : undefined}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-2 rounded-lg ${item.istSystemAdmin ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
                        {item.istSystemAdmin
                          ? <ShieldCheck className="h-4 w-4 text-amber-500" />
                          : <Shield className="h-4 w-4 text-primary" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{item.name}</h3>
                          {item.istSystemAdmin && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs">
                              System-Administrator
                            </Badge>
                          )}
                          {!item.aktiv && (
                            <Badge variant="secondary" className="text-xs">Inaktiv</Badge>
                          )}
                        </div>
                        {item.beschreibung && (
                          <p className="text-sm text-muted-foreground mt-1">{item.beschreibung}</p>
                        )}
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch
                          checked={item.aktiv}
                          disabled={item.istSystemAdmin}
                          onCheckedChange={() => toggleAktiv(item)}
                          title={item.istSystemAdmin ? 'System-Administrator kann nicht deaktiviert werden' : (item.aktiv ? 'Deaktivieren' : 'Aktivieren')}
                        />
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Bearbeiten">
                          <Edit className="h-4 w-4" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Benutzerrolle bearbeiten' : 'Neue Benutzerrolle'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="z.B. Sachbearbeiter, Koordinator"
                disabled={editingItem?.istSystemAdmin}
              />
              {editingItem?.istSystemAdmin && (
                <p className="text-xs text-muted-foreground mt-1">
                  Der Name der System-Administrator-Rolle kann nicht geändert werden.
                </p>
              )}
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
              <Label>Sortierreihenfolge</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
              />
            </div>
            {editingItem && !editingItem.istSystemAdmin && (
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
