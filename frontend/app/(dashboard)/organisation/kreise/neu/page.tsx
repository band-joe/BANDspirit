'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { ApiError } from '@/lib/errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface CircleOption {
  id: string;
  name: string;
}

interface PhaseOption {
  id: string;
  name: string;
}

/** Leeres Datumsfeld -> null, sonst als ISO-Datum (UTC-Mitternacht) senden. */
function fromDateInput(value: string): string | null {
  if (!value) return null;
  return new Date(value + 'T00:00:00Z').toISOString();
}

export default function NeuerKreisPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [circles, setCircles] = useState<CircleOption[]>([]);
  const [phasen, setPhasen] = useState<PhaseOption[]>([]);
  const [form, setForm] = useState({
    name: '',
    zweck: '',
    // Kreistyp: 'root' = oberster Kreis, 'sub' = Subkreis (übergeordneter Kreis Pflicht)
    kreistyp: 'root' as 'root' | 'sub',
    parentId: '',
    lebenszyklusPhaseId: '',
    startDatum: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (!session) return;
    // Kreise für die Auswahl des übergeordneten Kreises laden (OData)
    apiClient
      .get<ODataResponse<CircleOption>>('/odata/Circles?$select=Id,Name&$filter=IsActive eq true&$orderby=Name', session)
      .then(data => setCircles((data.value ?? []).map((c: CircleOption) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
    // Aktive Lebenszyklus-Phasen laden (aus Entität, in den Einstellungen gepflegt)
    apiClient
      .get<ODataResponse<PhaseOption>>('/odata/S3LebenszyklusPhasen?$select=Id,Name&$filter=Aktiv eq true&$orderby=SortOrder,Name', session)
      .then(data => setPhasen((data.value ?? []).map((p: PhaseOption) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
  }, [session]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }
    // Subkreis: übergeordneter Kreis ist Pflicht.
    if (form.kreistyp === 'sub' && !form.parentId) {
      toast.error('Für einen Subkreis muss ein übergeordneter Kreis angegeben werden');
      return;
    }
    // Lebenszyklus-Phase ist Pflicht (Auswahl aus Entität).
    if (!form.lebenszyklusPhaseId) {
      toast.error('Bitte eine Lebenszyklus-Phase auswählen');
      return;
    }
    // Startdatum ist Pflicht – jeder Lebenszyklus muss ein Startdatum haben.
    if (!form.startDatum) {
      toast.error('Startdatum ist erforderlich');
      return;
    }

    const parentId = form.kreistyp === 'sub' ? form.parentId : null;
    const phaseName = phasen.find(p => p.id === form.lebenszyklusPhaseId)?.name ?? null;

    setSaving(true);
    let circleId: string | undefined;
    try {
      // 1) Kreis über OData anlegen (camelCase – das OData-Backend nutzt
      //    EnableLowerCamelCase(), daher MÜSSEN die Property-Namen im JSON
      //    camelCase sein, sonst binden die Felder nicht.)
      //    Die RootId wird im Backend automatisch aus dem übergeordneten Kreis
      //    übernommen. lifecyclePhase wird als denormalisierte "aktuelle Phase"
      //    (Name) gesetzt.
      const payload = {
        name: form.name.trim(),
        zweck: form.zweck.trim() || null,
        parentId: parentId,
        lifecyclePhase: phaseName,
        isActive: true,
      };
      const circle = await apiClient.post<Record<string, unknown>>('/odata/Circles', payload, session);
      circleId = (circle?.Id ?? circle?.id) as string | undefined;
    } catch (error: unknown) {
      console.error('Fehler beim Anlegen des Kreises:', error);
      const msg = error instanceof ApiError ? (error.message || 'Fehler beim Erstellen') : 'Fehler beim Erstellen des Kreises';
      toast.error(msg);
      setSaving(false);
      return;
    }

    // 2) Ersten Lebenszyklus-Eintrag (Historie) mit Pflicht-Startdatum anlegen.
    try {
      if (circleId) {
        await apiClient.post('/odata/S3CircleLebenszyklen', {
          s3CircleId: circleId,
          lebenszyklusPhaseId: form.lebenszyklusPhaseId,
          startDatum: fromDateInput(form.startDatum),
        }, session);
      }
      toast.success('Kreis erstellt');
      router.push(circleId ? `/organisation/kreise/${circleId}` : '/organisation');
    } catch (error: unknown) {
      console.error('Fehler beim Anlegen des Lebenszyklus-Eintrags:', error);
      // Kreis wurde bereits angelegt – Nutzer informieren und trotzdem zur
      // Detailseite navigieren, wo die Historie ergänzt werden kann.
      toast.error('Kreis wurde erstellt, aber der Lebenszyklus-Eintrag konnte nicht gespeichert werden.');
      router.push(circleId ? `/organisation/kreise/${circleId}` : '/organisation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/organisation">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Neuer Kreis</h1>
          <p className="text-muted-foreground">Kreis im Organisationsmodell erstellen</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Grunddaten</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Organisationskreis" />
            </div>

            <div>
              <Label>Kreistyp *</Label>
              <Select
                value={form.kreistyp}
                onValueChange={v => setForm(f => ({ ...f, kreistyp: v as 'root' | 'sub', parentId: v === 'root' ? '' : f.parentId }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Root-Kreis (oberster Kreis)</SelectItem>
                  <SelectItem value="sub">Subkreis (untergeordnet)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Bei einem Subkreis muss ein übergeordneter Kreis angegeben werden. Die RootId wird automatisch vom übergeordneten Kreis übernommen.
              </p>
            </div>

            {form.kreistyp === 'sub' && (
              <div>
                <Label htmlFor="parentId">Übergeordneter Kreis *</Label>
                <Select value={form.parentId} onValueChange={v => setForm(f => ({ ...f, parentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Übergeordneten Kreis wählen" /></SelectTrigger>
                  <SelectContent>
                    {circles.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Lebenszyklus</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="lebenszyklusPhaseId">Lebenszyklus-Phase *</Label>
              <Select value={form.lebenszyklusPhaseId} onValueChange={v => setForm(f => ({ ...f, lebenszyklusPhaseId: v }))}>
                <SelectTrigger><SelectValue placeholder="Phase auswählen" /></SelectTrigger>
                <SelectContent>
                  {phasen.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {phasen.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Keine Phasen gepflegt. Bitte unter Einstellungen → Lebenszyklus anlegen.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="startDatum">Startdatum *</Label>
              <Input
                id="startDatum"
                type="date"
                value={form.startDatum}
                onChange={e => setForm(f => ({ ...f, startDatum: e.target.value }))}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Datum, ab dem sich der Kreis in dieser Phase befindet (Pflichtfeld).
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Zweck</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="zweck">Zweck des Kreises</Label>
              <Textarea id="zweck" value={form.zweck} onChange={e => setForm(f => ({ ...f, zweck: e.target.value }))} placeholder="Warum existiert dieser Kreis? Wofür ist er verantwortlich?" rows={5} />
              <p className="text-sm text-muted-foreground mt-2">
                Beschreibung des Zwecks, der Verantwortlichkeiten und der Domäne des Kreises.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/organisation"><Button variant="outline">Abbrechen</Button></Link>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />{saving ? 'Speichern...' : 'Kreis erstellen'}
        </Button>
      </div>
    </div>
  );
}
