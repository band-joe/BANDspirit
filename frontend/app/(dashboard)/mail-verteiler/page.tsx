'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiClient, getToken } from '@/lib/api-client';
import { Mails, Plus, Pencil, Trash2, Download, Loader2, Users } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

type Typ = 'Kreis' | 'Rolle' | 'Individuell';

interface VerteilerListe {
  id: string;
  name: string;
  beschreibung: string | null;
  typ: Typ;
  s3CircleId: string | null;
  s3RollenDefinitionId: string | null;
  empfaengerAnzahl: number;
}

interface Empfaenger { id: string; name: string; email: string; }

interface VerteilerDetail extends VerteilerListe {
  benutzerIds: string[];
  empfaenger: Empfaenger[];
}

interface AuswahlOption { id: string; name: string; }
interface BenutzerOption { id: string; name: string; email: string; }
interface Auswahl { kreise: AuswahlOption[]; rollen: AuswahlOption[]; benutzer: BenutzerOption[]; }

const TYP_LABEL: Record<Typ, string> = {
  Kreis: 'Kreis (alle Mitglieder eines Kreises)',
  Rolle: 'Rolle (eine Rolle über alle Kreise, z. B. alle Lead-Links)',
  Individuell: 'Individuell (frei zusammengestellt)',
};

export default function MailVerteilerPage() {
  const { data: session } = useSession() || {};
  const { toast } = useToast();

  const [liste, setListe] = useState<VerteilerListe[]>([]);
  const [auswahl, setAuswahl] = useState<Auswahl>({ kreise: [], rollen: [], benutzer: [] });
  const [laedt, setLaedt] = useState(true);
  const [speichert, setSpeichert] = useState(false);
  const [exportiert, setExportiert] = useState<string | null>(null);

  // Dialog-Zustand
  const [dialogOffen, setDialogOffen] = useState(false);
  const [bearbeitungsId, setBearbeitungsId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [typ, setTyp] = useState<Typ>('Kreis');
  const [kreisId, setKreisId] = useState<string>('');
  const [rolleId, setRolleId] = useState<string>('');
  const [benutzerIds, setBenutzerIds] = useState<string[]>([]);

  // Lösch-Dialog
  const [loeschId, setLoeschId] = useState<string | null>(null);

  const ladeDaten = useCallback(async () => {
    if (!session) return;
    try {
      setLaedt(true);
      const [l, a] = await Promise.all([
        apiClient.get<VerteilerListe[]>('/api/mailverteiler', session),
        apiClient.get<Auswahl>('/api/mailverteiler/auswahl', session),
      ]);
      setListe(l);
      setAuswahl(a);
    } catch {
      toast({ title: 'Fehler', description: 'Die Verteiler konnten nicht geladen werden.', variant: 'destructive' });
    } finally {
      setLaedt(false);
    }
  }, [session, toast]);

  useEffect(() => { ladeDaten(); }, [ladeDaten]);

  const formularZuruecksetzen = () => {
    setBearbeitungsId(null);
    setName('');
    setBeschreibung('');
    setTyp('Kreis');
    setKreisId('');
    setRolleId('');
    setBenutzerIds([]);
  };

  const dialogOeffnenNeu = () => {
    formularZuruecksetzen();
    setDialogOffen(true);
  };

  const dialogOeffnenBearbeiten = async (id: string) => {
    if (!session) return;
    try {
      const d = await apiClient.get<VerteilerDetail>(`/api/mailverteiler/${id}`, session);
      setBearbeitungsId(d.id);
      setName(d.name);
      setBeschreibung(d.beschreibung ?? '');
      setTyp(d.typ);
      setKreisId(d.s3CircleId ?? '');
      setRolleId(d.s3RollenDefinitionId ?? '');
      setBenutzerIds(d.benutzerIds ?? []);
      setDialogOffen(true);
    } catch {
      toast({ title: 'Fehler', description: 'Der Verteiler konnte nicht geladen werden.', variant: 'destructive' });
    }
  };

  const benutzerUmschalten = (id: string) => {
    setBenutzerIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const speichern = async () => {
    if (!session) return;
    if (!name.trim()) {
      toast({ title: 'Hinweis', description: 'Bitte einen Namen eingeben.', variant: 'destructive' });
      return;
    }
    if (typ === 'Kreis' && !kreisId) {
      toast({ title: 'Hinweis', description: 'Bitte einen Kreis wählen.', variant: 'destructive' });
      return;
    }
    if (typ === 'Rolle' && !rolleId) {
      toast({ title: 'Hinweis', description: 'Bitte eine Rolle wählen.', variant: 'destructive' });
      return;
    }
    if (typ === 'Individuell' && benutzerIds.length === 0) {
      toast({ title: 'Hinweis', description: 'Bitte mindestens einen Benutzer wählen.', variant: 'destructive' });
      return;
    }

    const body = {
      name: name.trim(),
      beschreibung: beschreibung.trim() || null,
      typ,
      s3CircleId: typ === 'Kreis' ? kreisId : null,
      s3RollenDefinitionId: typ === 'Rolle' ? rolleId : null,
      benutzerIds: typ === 'Individuell' ? benutzerIds : [],
    };

    try {
      setSpeichert(true);
      if (bearbeitungsId) {
        await apiClient.put(`/api/mailverteiler/${bearbeitungsId}`, body, session);
        toast({ title: 'Gespeichert', description: 'Der Verteiler wurde aktualisiert.' });
      } else {
        await apiClient.post('/api/mailverteiler', body, session);
        toast({ title: 'Erstellt', description: 'Der Verteiler wurde angelegt.' });
      }
      setDialogOffen(false);
      formularZuruecksetzen();
      await ladeDaten();
    } catch (e: any) {
      const msg = e?.status === 409
        ? 'Es existiert bereits ein Verteiler mit diesem Namen.'
        : 'Der Verteiler konnte nicht gespeichert werden.';
      toast({ title: 'Fehler', description: msg, variant: 'destructive' });
    } finally {
      setSpeichert(false);
    }
  };

  const loeschen = async () => {
    if (!session || !loeschId) return;
    try {
      await apiClient.delete(`/api/mailverteiler/${loeschId}`, session);
      toast({ title: 'Gelöscht', description: 'Der Verteiler wurde entfernt.' });
      setLoeschId(null);
      await ladeDaten();
    } catch {
      toast({ title: 'Fehler', description: 'Der Verteiler konnte nicht gelöscht werden.', variant: 'destructive' });
    }
  };

  // Outlook-Export: benötigt Bearer-Token, daher fetch → Blob → Download.
  const exportieren = async (v: VerteilerListe) => {
    if (!session) return;
    try {
      setExportiert(v.id);
      const token = getToken(session);
      const res = await fetch(`${API_BASE}/api/mailverteiler/${v.id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Export fehlgeschlagen');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${v.name}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Export', description: 'Die Outlook-CSV-Datei wurde heruntergeladen.' });
    } catch {
      toast({ title: 'Fehler', description: 'Der Export ist fehlgeschlagen.', variant: 'destructive' });
    } finally {
      setExportiert(null);
    }
  };

  const typBeschreibung = (v: VerteilerListe): string => {
    if (v.typ === 'Kreis') {
      const k = auswahl.kreise.find(x => x.id === v.s3CircleId);
      return `Kreis: ${k?.name ?? '—'}`;
    }
    if (v.typ === 'Rolle') {
      const r = auswahl.rollen.find(x => x.id === v.s3RollenDefinitionId);
      return `Rolle: ${r?.name ?? '—'}`;
    }
    return 'Individuell';
  };

  const gewaehlteBenutzerAnzahl = useMemo(() => benutzerIds.length, [benutzerIds]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Mails className="h-6 w-6" /> Mail-Verteiler
          </h1>
          <p className="text-sm text-muted-foreground">
            Verteilerlisten für den E-Mail-Versand. Die E-Mail-Adressen stammen aus dem
            Benutzerstamm und werden stets aktuell aufgelöst. Verteiler lassen sich als
            Outlook-kompatible CSV-Datei exportieren.
          </p>
        </div>
        <Button onClick={dialogOeffnenNeu}>
          <Plus className="mr-2 h-4 w-4" /> Neuer Verteiler
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verteiler</CardTitle>
          <CardDescription>Übersicht aller Mail-Verteiler.</CardDescription>
        </CardHeader>
        <CardContent>
          {laedt ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Wird geladen …
            </div>
          ) : liste.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Noch keine Verteiler vorhanden. Legen Sie den ersten Verteiler an.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Variante</TableHead>
                  <TableHead className="text-center">Empfänger</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liste.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium">{v.name}</div>
                      {v.beschreibung && (
                        <div className="text-xs text-muted-foreground">{v.beschreibung}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{typBeschreibung(v)}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" /> {v.empfaengerAnzahl}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => exportieren(v)} disabled={exportiert === v.id} title="Für Outlook exportieren (CSV)">
                          {exportiert === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => dialogOeffnenBearbeiten(v.id)} title="Bearbeiten">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setLoeschId(v.id)} title="Löschen">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Erstellen / Bearbeiten */}
      <Dialog open={dialogOffen} onOpenChange={(o) => { setDialogOffen(o); if (!o) formularZuruecksetzen(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{bearbeitungsId ? 'Verteiler bearbeiten' : 'Neuer Verteiler'}</DialogTitle>
            <DialogDescription>
              Wählen Sie eine Variante und stellen Sie die Empfänger zusammen. Der Name muss eindeutig sein.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="z. B. Alle Lead-Links" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="beschreibung">Beschreibung</Label>
              <Textarea id="beschreibung" value={beschreibung} onChange={e => setBeschreibung(e.target.value)} rows={2} placeholder="Optional" />
            </div>

            <div className="space-y-2">
              <Label>Variante *</Label>
              <RadioGroup value={typ} onValueChange={(val) => setTyp(val as Typ)} className="space-y-1">
                {(['Kreis', 'Rolle', 'Individuell'] as Typ[]).map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <RadioGroupItem value={t} id={`typ-${t}`} />
                    <Label htmlFor={`typ-${t}`} className="font-normal">{TYP_LABEL[t]}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {typ === 'Kreis' && (
              <div className="space-y-1">
                <Label>Kreis *</Label>
                <Select value={kreisId} onValueChange={setKreisId}>
                  <SelectTrigger><SelectValue placeholder="Kreis wählen" /></SelectTrigger>
                  <SelectContent>
                    {auswahl.kreise.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {typ === 'Rolle' && (
              <div className="space-y-1">
                <Label>Rolle *</Label>
                <Select value={rolleId} onValueChange={setRolleId}>
                  <SelectTrigger><SelectValue placeholder="Rolle wählen" /></SelectTrigger>
                  <SelectContent>
                    {auswahl.rollen.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Es werden alle Personen einbezogen, die diese Rolle in irgendeinem Kreis innehaben.
                </p>
              </div>
            )}

            {typ === 'Individuell' && (
              <div className="space-y-2">
                <Label>Benutzer * ({gewaehlteBenutzerAnzahl} gewählt)</Label>
                <div className="max-h-64 overflow-y-auto rounded-md border p-2">
                  {auswahl.benutzer.length === 0 ? (
                    <p className="p-2 text-sm text-muted-foreground">Keine Benutzer verfügbar.</p>
                  ) : auswahl.benutzer.map(b => (
                    <label key={b.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                      <Checkbox checked={benutzerIds.includes(b.id)} onCheckedChange={() => benutzerUmschalten(b.id)} />
                      <span className="text-sm">{b.name}</span>
                      <span className="text-xs text-muted-foreground">{b.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOffen(false); formularZuruecksetzen(); }} disabled={speichert}>
              Abbrechen
            </Button>
            <Button onClick={speichern} disabled={speichert}>
              {speichert && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Löschen bestätigen */}
      <Dialog open={loeschId !== null} onOpenChange={(o) => { if (!o) setLoeschId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verteiler löschen</DialogTitle>
            <DialogDescription>
              Soll dieser Verteiler wirklich gelöscht werden? Dies kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoeschId(null)}>Abbrechen</Button>
            <Button variant="destructive" onClick={loeschen}>Löschen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
