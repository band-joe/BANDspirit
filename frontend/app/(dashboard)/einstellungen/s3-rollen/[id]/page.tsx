'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Star, Plus, Pencil, Trash2, Save, Upload, Download, FileText,
  Target, ClipboardList,
} from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient, getToken } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { ApiError } from '@/lib/errors';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/** Dateigröße in lesbares Format umwandeln. */
function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/** Datum + Uhrzeit lesbar formatieren. */
function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '—';
  }
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

export default function RollenDefinitionDetailPage() {
  const { data: session } = useSession() || {};
  const { can } = usePermissions();
  const params = useParams();
  const router = useRouter();
  const definitionId = params.id as string;

  const canUpdate = can('stammdaten:manage');

  const [rDef, setRDef] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  /* ------------------- Rollendefinition laden ------------------- */
  const loadDefinition = useCallback(() => {
    if (!session) return;
    apiClient
      .get<Record<string, any>>(`/odata/S3RollenDefinitionen(${definitionId})`, session)
      .then(setRDef)
      .catch(() => toast.error('Fehler beim Laden der Rolle'))
      .finally(() => setLoading(false));
  }, [session, definitionId]);

  useEffect(() => { loadDefinition(); }, [loadDefinition]);

  const rolleName = String(rDef?.name ?? 'Rolle');

  if (loading) {
    return <div className="space-y-4"><div className="h-8 w-48 bg-muted animate-pulse rounded" /><Card><CardContent className="py-12"><div className="h-6 bg-muted animate-pulse rounded" /></CardContent></Card></div>;
  }

  if (!rDef) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        Rolle nicht gefunden.
        <div className="mt-4"><Button variant="outline" onClick={() => router.push('/einstellungen/s3-rollen')}>Zurück zu S3-Rollen</Button></div>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kopfbereich mit Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/einstellungen/s3-rollen" className="hover:underline">S3-Rollen</Link>
          <span>/</span>
          <span className="text-foreground">{rolleName}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/einstellungen/s3-rollen')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{rolleName}</h1>
            {rDef?.isLeadLink ? <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"><Star className="h-3 w-3 mr-1" />Lead Link</Badge> : null}
            {rDef?.aktiv === false ? <Badge variant="secondary">Inaktiv</Badge> : null}
          </div>
        </div>
        {rDef?.beschreibung ? (
          <p className="text-sm text-muted-foreground mt-3 pl-12 whitespace-pre-wrap">{String(rDef.beschreibung)}</p>
        ) : null}
      </div>

      <Tabs defaultValue="ueberblick" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="ueberblick"><ClipboardList className="h-4 w-4 mr-2" />Überblick</TabsTrigger>
          <TabsTrigger value="dokumente"><FileText className="h-4 w-4 mr-2" />Dokumente</TabsTrigger>
          <TabsTrigger value="kennzahlen"><Target className="h-4 w-4 mr-2" />Kennzahlen</TabsTrigger>
        </TabsList>

        <TabsContent value="ueberblick">
          <UeberblickTab rDef={rDef} definitionId={definitionId} canUpdate={canUpdate} session={session} onSaved={loadDefinition} />
        </TabsContent>
        <TabsContent value="dokumente">
          <DokumenteTab definitionId={definitionId} canUpdate={canUpdate} session={session} />
        </TabsContent>
        <TabsContent value="kennzahlen">
          <KennzahlenTab definitionId={definitionId} canUpdate={canUpdate} session={session} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ================================================================== */
/*  TAB: Überblick (Zweck, Domäne, Verantwortlichkeiten)              */
/* ================================================================== */
function UeberblickTab({ rDef, definitionId, canUpdate, session, onSaved }: {
  rDef: Record<string, any> | undefined; definitionId: string; canUpdate: boolean; session: any; onSaved: () => void;
}) {
  /* ------------------- Grunddaten der Rolle (bearbeitbar) ------------------- */
  const [grundForm, setGrundForm] = useState({
    name: '', beschreibung: '', zweck: '', domaene: '', verantwortlichkeit: '',
    isLeadLink: false, aktiv: true, sortOrder: 0, dateFrom: '', dateTo: '',
  });
  const [grundSaving, setGrundSaving] = useState(false);

  useEffect(() => {
    if (!rDef) return;
    setGrundForm({
      name: String(rDef.name ?? ''),
      beschreibung: String(rDef.beschreibung ?? ''),
      zweck: String(rDef.zweck ?? ''),
      domaene: String(rDef.domaene ?? ''),
      verantwortlichkeit: String(rDef.verantwortlichkeit ?? ''),
      isLeadLink: !!rDef.isLeadLink,
      aktiv: rDef.aktiv !== false,
      sortOrder: Number(rDef.sortOrder) || 0,
      dateFrom: toDateInput(rDef.dateFrom),
      dateTo: toDateInput(rDef.dateTo),
    });
  }, [rDef]);

  const handleGrundSave = async () => {
    if (!grundForm.name.trim()) { toast.error('Name ist erforderlich'); return; }
    setGrundSaving(true);
    const payload = {
      name: grundForm.name.trim(),
      beschreibung: grundForm.beschreibung.trim() ? grundForm.beschreibung.trim() : null,
      zweck: grundForm.zweck.trim() ? grundForm.zweck.trim() : null,
      domaene: grundForm.domaene.trim() ? grundForm.domaene.trim() : null,
      verantwortlichkeit: grundForm.verantwortlichkeit.trim() ? grundForm.verantwortlichkeit.trim() : null,
      isLeadLink: grundForm.isLeadLink,
      aktiv: grundForm.aktiv,
      sortOrder: grundForm.sortOrder,
      dateFrom: fromDateInput(grundForm.dateFrom),
      dateTo: fromDateInput(grundForm.dateTo),
    };
    try {
      await apiClient.patch(`/odata/S3RollenDefinitionen(${definitionId})`, payload, session);
      toast.success('Rolle gespeichert');
      onSaved();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : 'Fehler beim Speichern');
    } finally {
      setGrundSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Grunddaten der Rolle (bearbeitbar) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grunddaten</CardTitle>
          <CardDescription>Allgemeine Angaben, Zweck, Domäne und Verantwortlichkeit dieser Rolle.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Allgemeine Informationen (oberhalb von Zweck) */}
          <div>
            <Label>Name *</Label>
            <Input
              value={grundForm.name}
              onChange={e => setGrundForm(f => ({ ...f, name: e.target.value }))}
              placeholder="z.B. Facilitator, Koordinator"
              disabled={!canUpdate}
            />
          </div>
          <div>
            <Label>Beschreibung</Label>
            <Textarea
              value={grundForm.beschreibung}
              onChange={e => setGrundForm(f => ({ ...f, beschreibung: e.target.value }))}
              rows={3}
              placeholder="Aufgaben und Verantwortlichkeiten dieser Rolle"
              disabled={!canUpdate}
            />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Switch
                id="isLeadLink"
                checked={grundForm.isLeadLink}
                onCheckedChange={v => setGrundForm(f => ({ ...f, isLeadLink: v }))}
                disabled={!canUpdate}
              />
              <Label htmlFor="isLeadLink">Lead Link (max. 1 pro Kreis)</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="aktiv"
                checked={grundForm.aktiv}
                onCheckedChange={v => setGrundForm(f => ({ ...f, aktiv: v }))}
                disabled={!canUpdate}
              />
              <Label htmlFor="aktiv">Aktiv</Label>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Sortierreihenfolge</Label>
              <Input
                type="number"
                value={grundForm.sortOrder}
                onChange={e => setGrundForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                disabled={!canUpdate}
              />
            </div>
            <div>
              <Label>Gültig von</Label>
              <Input
                type="date"
                value={grundForm.dateFrom}
                onChange={e => setGrundForm(f => ({ ...f, dateFrom: e.target.value }))}
                disabled={!canUpdate}
              />
            </div>
            <div>
              <Label>Gültig bis</Label>
              <Input
                type="date"
                value={grundForm.dateTo}
                onChange={e => setGrundForm(f => ({ ...f, dateTo: e.target.value }))}
                disabled={!canUpdate}
              />
            </div>
          </div>

          {/* Zweck & Domäne */}
          <div>
            <Label>Zweck</Label>
            <Textarea
              value={grundForm.zweck}
              onChange={e => setGrundForm(f => ({ ...f, zweck: e.target.value }))}
              rows={2}
              placeholder="Zweck dieser Rolle"
              disabled={!canUpdate}
            />
          </div>
          <div>
            <Label>Domäne</Label>
            <Textarea
              value={grundForm.domaene}
              onChange={e => setGrundForm(f => ({ ...f, domaene: e.target.value }))}
              rows={2}
              placeholder="Domäne (Verantwortungsbereich) dieser Rolle"
              disabled={!canUpdate}
            />
          </div>

          {/* Verantwortlichkeit als Freitextfeld */}
          <div>
            <Label>Verantwortlichkeit</Label>
            <Textarea
              value={grundForm.verantwortlichkeit}
              onChange={e => setGrundForm(f => ({ ...f, verantwortlichkeit: e.target.value }))}
              rows={4}
              placeholder="Verantwortlichkeiten dieser Rolle als Freitext"
              disabled={!canUpdate}
            />
          </div>

          {canUpdate && (
            <div className="flex justify-end pt-2 border-t">
              <Button onClick={handleGrundSave} disabled={grundSaving}>
                <Save className="h-4 w-4 mr-2" />{grundSaving ? 'Speichern …' : 'Speichern'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  TAB: Dokumente                                                    */
/* ================================================================== */
function DokumenteTab({ definitionId, canUpdate, session }: { definitionId: string; canUpdate: boolean; session: any; }) {
  const [dokumente, setDokumente] = useState<Record<string, any>[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    apiClient
      .get<Record<string, any>[]>(`/api/rollendefinitionen/${definitionId}/dokumente`, session)
      .then(d => setDokumente(Array.isArray(d) ? d : []))
      .catch(() => toast.error('Fehler beim Laden der Dokumente'));
  }, [session, definitionId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('datei', file);
      const res = await fetch(`${API_BASE}/api/rollendefinitionen/${definitionId}/dokumente`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken(session)}` },
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Dokument hochgeladen');
      load();
    } catch {
      toast.error('Fehler beim Hochladen');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (dok: Record<string, any>) => {
    try {
      const res = await fetch(`${API_BASE}/api/rollendefinitionen/${definitionId}/dokumente/${dok.id}/download`, {
        headers: { Authorization: `Bearer ${getToken(session)}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = String(dok.dateiname);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Fehler beim Herunterladen');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/rollendefinitionen/${definitionId}/dokumente/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken(session)}` },
      });
      if (!res.ok) throw new Error();
      load();
    } catch {
      toast.error('Fehler beim Löschen');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Dokumente</CardTitle>
          <CardDescription>Hochgeladene Dokumente zu dieser Rolle.</CardDescription>
        </div>
        {canUpdate && (
          <Button asChild disabled={uploading}>
            <label className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />{uploading ? 'Lädt hoch …' : 'Hochladen'}
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {dokumente.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4">Noch keine Dokumente hochgeladen.</p>
        ) : (
          <ul className="divide-y">
            {dokumente.map(dok => (
              <li key={dok.id} className="flex items-center gap-3 py-3">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{String(dok.dateiname)}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(Number(dok.dateigroesseBytes))} · {formatDateTime(dok.hochgeladenAm)}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => handleDownload(dok)}><Download className="h-4 w-4" /></Button>
                {canUpdate && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-9 w-9 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
                        <AlertDialogDescription>„{String(dok.dateiname)}“ wird dauerhaft gelöscht.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(dok.id)}>Löschen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ================================================================== */
/*  TAB: Kennzahlen                                                   */
/* ================================================================== */
function KennzahlenTab({ definitionId, canUpdate, session }: { definitionId: string; canUpdate: boolean; session: any; }) {
  const [items, setItems] = useState<Record<string, any>[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({ bezeichnung: '', zielwert: '', einheit: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    apiClient
      .get<ODataResponse<Record<string, any>>>(
        `/odata/S3RolleKennzahlen?$filter=RollenDefinitionId eq ${definitionId}&$orderby=SortOrder`,
        session,
      )
      .then(d => setItems(d.value ?? []))
      .catch(() => toast.error('Fehler beim Laden der Kennzahlen'));
  }, [session, definitionId]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingItem(null); setForm({ bezeichnung: '', zielwert: '', einheit: '' }); setDialogOpen(true); };
  const openEdit = (item: Record<string, any>) => {
    setEditingItem(item);
    setForm({ bezeichnung: String(item.bezeichnung ?? ''), zielwert: String(item.zielwert ?? ''), einheit: String(item.einheit ?? '') });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.bezeichnung.trim()) { toast.error('Bezeichnung ist erforderlich'); return; }
    setSaving(true);
    const payload = {
      bezeichnung: form.bezeichnung.trim(),
      zielwert: form.zielwert.trim() ? form.zielwert.trim() : null,
      einheit: form.einheit.trim() ? form.einheit.trim() : null,
    };
    try {
      if (editingItem) {
        await apiClient.patch(`/odata/S3RolleKennzahlen(${editingItem.id})`, payload, session);
      } else {
        const sortOrder = items.length > 0 ? Math.max(...items.map(i => Number(i.sortOrder) || 0)) + 1 : 1;
        await apiClient.post('/odata/S3RolleKennzahlen', { rollenDefinitionId: definitionId, sortOrder, ...payload }, session);
      }
      setDialogOpen(false);
      load();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/odata/S3RolleKennzahlen(${id})`, session);
      load();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : 'Fehler beim Löschen');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Kennzahlen</CardTitle>
          <CardDescription>Messgrößen und Zielwerte dieser Rolle.</CardDescription>
        </div>
        {canUpdate && <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Kennzahl</Button>}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4">Noch keine Kennzahlen erfasst.</p>
        ) : (
          <ul className="divide-y">
            {items.map(item => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <Target className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{String(item.bezeichnung)}</p>
                  {(item.zielwert || item.einheit) && (
                    <p className="text-xs text-muted-foreground">
                      {item.zielwert ? `Ziel: ${String(item.zielwert)}` : ''}{item.zielwert && item.einheit ? ' ' : ''}{item.einheit ? String(item.einheit) : ''}
                    </p>
                  )}
                </div>
                {canUpdate && (
                  <>
                    <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="h-9 w-9 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Kennzahl löschen?</AlertDialogTitle>
                          <AlertDialogDescription>„{String(item.bezeichnung)}“ wird dauerhaft gelöscht.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item.id)}>Löschen</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Kennzahl bearbeiten' : 'Neue Kennzahl'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Bezeichnung *</Label><Input value={form.bezeichnung} onChange={e => setForm(f => ({ ...f, bezeichnung: e.target.value }))} placeholder="z.B. Bearbeitungszeit" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Zielwert</Label><Input value={form.zielwert} onChange={e => setForm(f => ({ ...f, zielwert: e.target.value }))} placeholder="z.B. 5" /></div>
              <div><Label>Einheit</Label><Input value={form.einheit} onChange={e => setForm(f => ({ ...f, einheit: e.target.value }))} placeholder="z.B. Tage" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Speichern …' : editingItem ? 'Aktualisieren' : 'Erstellen'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
