'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Save, X, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StammdatenItem {
  id: string;
  kategorie: string;
  code: string;
  bezeichnung: string;
  beschreibung: string | null;
  sortierung: number;
  aktiv: boolean;
  farbe: string | null;
}

interface StammdatenVerwaltungProps {
  kategorie: string;
  titel: string;
  beschreibung: string;
  mitFarbe?: boolean;
  mitBeschreibung?: boolean;
  codeBearbeitbar?: boolean;
}

export function StammdatenVerwaltung({
  kategorie,
  titel,
  beschreibung,
  mitFarbe = false,
  mitBeschreibung = true,
  codeBearbeitbar = false,
}: StammdatenVerwaltungProps) {
  const { data: session } = useSession() || {};
  const [items, setItems] = useState<StammdatenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ code: '', bezeichnung: '', beschreibung: '', farbe: '', sortierung: 0 });
  const [saving, setSaving] = useState(false);
  const [footerMessage, setFooterMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const role = (session?.user as any)?.role ?? '';
  const canManage = hasPermission(role, 'stammdaten:manage');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/stammdaten/${kategorie}?nurAktive=false`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [kategorie]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ code: '', bezeichnung: '', beschreibung: '', farbe: '', sortierung: 0 });
    setEditId(null);
    setShowNew(false);
  };

  const startEdit = (item: StammdatenItem) => {
    setEditId(item.id);
    setShowNew(false);
    setFooterMessage(null);
    setForm({
      code: item.code,
      bezeichnung: item.bezeichnung,
      beschreibung: item.beschreibung || '',
      farbe: item.farbe || '',
      sortierung: item.sortierung,
    });
  };

  const startNew = () => {
    setEditId(null);
    setShowNew(true);
    setFooterMessage(null);
    const maxSort = items.reduce((max, i) => Math.max(max, i.sortierung), 0);
    setForm({ code: '', bezeichnung: '', beschreibung: '', farbe: '', sortierung: maxSort + 10 });
  };

  const handleSave = async () => {
    setFooterMessage(null);
    if (!form.bezeichnung.trim()) {
      setFooterMessage({ type: 'error', text: 'Bezeichnung ist erforderlich.' });
      return;
    }
    if (showNew && !form.code.trim()) {
      setFooterMessage({ type: 'error', text: 'Code ist erforderlich.' });
      return;
    }

    setSaving(true);
    try {
      const url = editId
        ? `/api/stammdaten/${kategorie}/${editId}`
        : `/api/stammdaten/${kategorie}`;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(!editId && { code: form.code.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }),
          bezeichnung: form.bezeichnung.trim(),
          beschreibung: form.beschreibung.trim() || null,
          farbe: form.farbe.trim() || null,
          sortierung: form.sortierung,
        }),
      });

      if (res.ok) {
        const savedItem = await res.json();
        setFooterMessage({ type: 'success', text: editId ? `«${savedItem.bezeichnung}» wurde aktualisiert.` : `«${savedItem.bezeichnung}» wurde erfolgreich erstellt.` });
        resetForm();
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        let errorText = 'Speichern fehlgeschlagen.';
        if (res.status === 400) {
          errorText = err.error || 'Ungültige Eingabe — bitte Code und Bezeichnung prüfen.';
        } else if (res.status === 409) {
          errorText = err.error || 'Ein Eintrag mit diesem Code existiert bereits.';
        } else if (res.status === 401 || res.status === 403) {
          errorText = 'Keine Berechtigung für diese Aktion.';
        } else if (res.status === 404) {
          errorText = err.error || 'Eintrag nicht gefunden.';
        } else if (res.status === 500) {
          errorText = err.error || 'Interner Serverfehler — bitte erneut versuchen.';
        } else {
          errorText = err.error || `Unerwarteter Fehler (HTTP ${res.status}) — bitte erneut versuchen.`;
        }
        setFooterMessage({ type: 'error', text: errorText });
      }
    } catch (error: unknown) {
      setFooterMessage({ type: 'error', text: 'Netzwerkfehler — Verbindung zum Server fehlgeschlagen.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAktiv = async (item: StammdatenItem) => {
    try {
      const res = await fetch(`/api/stammdaten/${kategorie}/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aktiv: !item.aktiv }),
      });
      if (res.ok) {
        toast.success(item.aktiv ? 'Deaktiviert' : 'Aktiviert');
        load();
      }
    } catch (e) {
      toast.error('Fehler');
    }
  };

  const moveItem = async (item: StammdatenItem, direction: 'up' | 'down') => {
    const idx = items.findIndex(i => i.id === item.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;

    const other = items[swapIdx];
    try {
      await Promise.all([
        fetch(`/api/stammdaten/${kategorie}/${item.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortierung: other.sortierung }),
        }),
        fetch(`/api/stammdaten/${kategorie}/${other.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortierung: item.sortierung }),
        }),
      ]);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">{titel}</h1>
          <p className="text-muted-foreground mt-1">{beschreibung}</p>
        </div>
        {canManage && (
          <Button onClick={startNew} disabled={showNew}>
            <Plus className="h-4 w-4 mr-2" /> Neuer Eintrag
          </Button>
        )}
      </div>

      {/* New item form */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card className="mb-6 border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Neuer Eintrag</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Code *</Label>
                    <Input
                      value={form.code}
                      onChange={e => setForm({ ...form, code: e.target.value })}
                      placeholder="z.B. MEIN_WERT"
                      className="uppercase"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Interner Schlüssel (Großbuchstaben, keine Leerzeichen)</p>
                  </div>
                  <div>
                    <Label>Bezeichnung *</Label>
                    <Input
                      value={form.bezeichnung}
                      onChange={e => setForm({ ...form, bezeichnung: e.target.value })}
                      placeholder="Anzeigename"
                    />
                  </div>
                  {mitBeschreibung && (
                    <div className="md:col-span-2">
                      <Label>Beschreibung</Label>
                      <Input
                        value={form.beschreibung}
                        onChange={e => setForm({ ...form, beschreibung: e.target.value })}
                        placeholder="Optionale Beschreibung"
                      />
                    </div>
                  )}
                  {mitFarbe && (
                    <div>
                      <Label>Farbe</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={form.farbe || '#6b7280'}
                          onChange={e => setForm({ ...form, farbe: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={form.farbe}
                          onChange={e => setForm({ ...form, farbe: e.target.value })}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <Label>Sortierung</Label>
                    <Input
                      type="number"
                      value={form.sortierung}
                      onChange={e => setForm({ ...form, sortierung: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <Button onClick={handleSave} disabled={saving} size="sm">
                    <Save className="h-4 w-4 mr-1" /> {saving ? 'Speichere...' : 'Speichern'}
                  </Button>
                  <Button variant="outline" onClick={() => { resetForm(); setFooterMessage(null); }} size="sm">
                    <X className="h-4 w-4 mr-1" /> Abbrechen
                  </Button>
                  {footerMessage && (
                    <p className={`text-sm font-medium ${footerMessage.type === 'error' ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                      {footerMessage.text}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{items.length} Einträge</CardTitle>
          <CardDescription>Aktive und inaktive Werte für «{titel}»</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Keine Einträge vorhanden</p>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <motion.div
                  key={item.id}
                  layout
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    !item.aktiv ? 'opacity-50 bg-muted/50' : 'bg-background hover:bg-muted/30'
                  } ${editId === item.id ? 'border-primary/50 ring-1 ring-primary/20' : ''}`}
                >
                  {/* Sort controls */}
                  {canManage && (
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveItem(item, 'up')}
                        disabled={idx === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveItem(item, 'down')}
                        disabled={idx === items.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Color dot */}
                  {mitFarbe && item.farbe && (
                    <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: item.farbe }} />
                  )}

                  {/* Content */}
                  {editId === item.id ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Bezeichnung</Label>
                        <Input
                          value={form.bezeichnung}
                          onChange={e => setForm({ ...form, bezeichnung: e.target.value })}
                          className="h-8"
                        />
                      </div>
                      {mitBeschreibung && (
                        <div>
                          <Label className="text-xs">Beschreibung</Label>
                          <Input
                            value={form.beschreibung}
                            onChange={e => setForm({ ...form, beschreibung: e.target.value })}
                            className="h-8"
                          />
                        </div>
                      )}
                      {mitFarbe && (
                        <div>
                          <Label className="text-xs">Farbe</Label>
                          <div className="flex gap-1">
                            <Input
                              type="color"
                              value={form.farbe || '#6b7280'}
                              onChange={e => setForm({ ...form, farbe: e.target.value })}
                              className="w-10 h-8 p-0.5"
                            />
                            <Input value={form.farbe} onChange={e => setForm({ ...form, farbe: e.target.value })} className="h-8 flex-1" />
                          </div>
                        </div>
                      )}
                      <div className="flex items-end gap-2 flex-wrap">
                        <Button size="sm" onClick={handleSave} disabled={saving} className="h-8">
                          <Save className="h-3 w-3 mr-1" /> Speichern
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { resetForm(); setFooterMessage(null); }} className="h-8">
                          <X className="h-3 w-3" />
                        </Button>
                        {footerMessage && (
                          <p className={`text-xs font-medium ${footerMessage.type === 'error' ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                            {footerMessage.text}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.bezeichnung}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{item.code}</Badge>
                        {!item.aktiv && <Badge variant="secondary" className="text-[10px]">Inaktiv</Badge>}
                      </div>
                      {item.beschreibung && (
                        <p className="text-sm text-muted-foreground truncate">{item.beschreibung}</p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {canManage && editId !== item.id && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(item)} className="h-7 w-7 p-0">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Switch
                        checked={item.aktiv}
                        onCheckedChange={() => toggleAktiv(item)}
                        className="scale-75"
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Globale Fusszeile für Erfolgs-/Fehlermeldungen */}
      {footerMessage && !showNew && !editId && (
        <div className={`mt-4 p-3 rounded-lg border ${
          footerMessage.type === 'error'
            ? 'bg-destructive/10 border-destructive/30'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }`}>
          <p className={`text-sm font-medium ${footerMessage.type === 'error' ? 'text-destructive' : 'text-green-700 dark:text-green-400'}`}>
            {footerMessage.text}
          </p>
        </div>
      )}
    </div>
  );
}
