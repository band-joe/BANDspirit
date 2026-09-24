'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Tag, ArrowLeft, Edit2, Trash2 } from 'lucide-react';
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

interface BiGuideKategorie {
  id: string;
  name: string;
  farbe: string | null;
  sortOrder: number;
  aktiv: boolean;
  createdAt?: string;
}

const FARBE_FALLBACK = 'bg-gray-100 text-gray-600 border-gray-200';

/* ------------------------------------------------------------------ */
/*  Seite                                                              */
/* ------------------------------------------------------------------ */

export default function BiGuideKategorienPage() {
  const { data: session } = useSession() || {};
  const { can } = usePermissions();
  const canManage = can('stammdaten:manage');

  const [kategorien, setKategorien] = useState<BiGuideKategorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BiGuideKategorie | null>(null);
  const [form, setForm] = useState({ name: '', farbe: '', sortOrder: 0, aktiv: true });
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<BiGuideKategorie | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---------- Daten laden ---------- */

  const loadData = useCallback(() => {
    if (!session) return;
    apiClient
      .get<ODataResponse<BiGuideKategorie>>('/odata/BiGuideKategorien?$orderby=SortOrder,Name', session)
      .then(d => setKategorien(d.value ?? []))
      .catch(() => toast.error('Fehler beim Laden der Kategorien'))
      .finally(() => setLoading(false));
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ---------- Dialog-Helfer ---------- */

  const openCreate = () => {
    setEditingItem(null);
    setForm({ name: '', farbe: '', sortOrder: 0, aktiv: true });
    setDialogOpen(true);
  };

  const openEdit = (item: BiGuideKategorie) => {
    setEditingItem(item);
    setForm({
      name: item.name ?? '',
      farbe: item.farbe ?? '',
      sortOrder: item.sortOrder ?? 0,
      aktiv: item.aktiv,
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
    const payload = {
      name: form.name.trim(),
      farbe: form.farbe.trim() ? form.farbe.trim() : null,
      sortOrder: form.sortOrder,
      aktiv: form.aktiv,
    };
    try {
      if (editingItem) {
        await apiClient.patch(`/odata/BiGuideKategorien(${editingItem.id})`, payload, session);
      } else {
        await apiClient.post('/odata/BiGuideKategorien', payload, session);
      }
      toast.success(editingItem ? 'Kategorie aktualisiert' : 'Kategorie erstellt');
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
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/odata/BiGuideKategorien(${deleteItem.id})`, session);
      toast.success('Kategorie gelöscht');
      setDeleteItem(null);
      loadData();
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? error.message : 'Fehler beim Löschen';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- Berechtigungsschutz ---------- */

  if (!loading && !canManage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/einstellungen/firma">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">BI-Guide Kategorien</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine Berechtigung</h3>
            <p className="text-muted-foreground">Sie haben keine Berechtigung, BI-Guide-Kategorien zu verwalten.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- Render ---------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/einstellungen/firma">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">BI-Guide Kategorien</h1>
            <p className="text-muted-foreground">Kategorien für BI-Guide-Nachrichten verwalten</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />Neue Kategorie
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
      ) : kategorien.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Keine Kategorien</h3>
            <p className="text-muted-foreground">Erstellen Sie Kategorien für BI-Guide-Nachrichten.</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Vorschau</TableHead>
                    <TableHead className="w-[120px]">Sortierung</TableHead>
                    <TableHead className="w-[100px]">Aktiv</TableHead>
                    <TableHead className="w-[140px] text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kategorien.map((item) => (
                    <TableRow key={item.id} className={!item.aktiv ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={item.farbe ?? FARBE_FALLBACK}>
                          {item.name}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.sortOrder}</TableCell>
                      <TableCell>
                        {item.aktiv
                          ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Aktiv</Badge>
                          : <Badge variant="secondary">Inaktiv</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)} title="Bearbeiten">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteItem(item)}
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Dialog erstellen / bearbeiten */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="z.B. Allgemein, Prozesse"
              />
            </div>
            <div>
              <Label>Farbe (CSS-Klassen)</Label>
              <div className="flex items-center gap-3">
                <Input
                  value={form.farbe}
                  onChange={e => setForm(f => ({ ...f, farbe: e.target.value }))}
                  placeholder="z.B. bg-blue-50 text-blue-700 border-blue-200"
                  className="flex-1"
                />
                <Badge variant="outline" className={form.farbe.trim() ? form.farbe.trim() : FARBE_FALLBACK}>
                  {form.name.trim() || 'Vorschau'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tailwind-CSS-Klassen für den Badge (Hintergrund, Text, Rahmen).
              </p>
            </div>
            <div>
              <Label>Sortierreihenfolge</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="aktiv"
                checked={form.aktiv}
                onCheckedChange={v => setForm(f => ({ ...f, aktiv: v }))}
              />
              <Label htmlFor="aktiv">Aktiv</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Speichern…' : editingItem ? 'Aktualisieren' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lösch-Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Kategorie löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Die Kategorie <span className="font-medium">{deleteItem?.name}</span> wird gelöscht.
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)} disabled={deleting}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Löschen…' : 'Löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
