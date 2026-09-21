'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { ApiError } from '@/lib/errors';

interface BenutzerRolleOption {
  id: string;
  name: string;
  beschreibung: string | null;
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, UserPlus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NeuerBenutzerPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [footerError, setFooterError] = useState<string | null>(null);
  const [rollen, setRollen] = useState<BenutzerRolleOption[]>([]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    aktiv: true,
    abacusPersonalnummer: '',
  });

  // Aktive Benutzerrollen dynamisch aus dem Katalog laden (Einstellungen → Benutzerrollen).
  // Die Vorauswahl wird auf die erste Rolle des Katalogs gesetzt – es gibt keine
  // hartkodierten Rollennamen mehr.
  useEffect(() => {
    if (!session) return;
    apiClient
      .get<ODataResponse<BenutzerRolleOption>>(
        '/odata/BenutzerRollen?$filter=aktiv eq true&$orderby=sortOrder,name',
        session,
      )
      .then(d => {
        const geladen = d.value ?? [];
        setRollen(geladen);
        // Erste Rolle des Katalogs vorauswählen, falls noch keine gesetzt ist.
        setForm(f => (f.role === '' && geladen.length > 0 ? { ...f, role: geladen[0].name } : f));
      })
      .catch(() => { /* Auswahl bleibt leer; Nutzer muss Rolle manuell wählen */ });
  }, [session]);

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return 'Passwort muss mindestens 8 Zeichen lang sein';
    if (pw.length > 128) return 'Passwort darf maximal 128 Zeichen lang sein';
    if (!/[A-Z]/.test(pw)) return 'Mindestens 1 Großbuchstabe erforderlich';
    if (!/[a-z]/.test(pw)) return 'Mindestens 1 Kleinbuchstabe erforderlich';
    if (!/[0-9]/.test(pw)) return 'Mindestens 1 Zahl erforderlich';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Mindestens 1 Sonderzeichen erforderlich (z.B. !@#$%&*)';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFooterError(null);

    if (!form.name.trim()) {
      setFooterError('Name ist erforderlich');
      return;
    }
    if (!form.email.trim()) {
      setFooterError('E-Mail ist erforderlich');
      return;
    }
    if (!form.password) {
      setFooterError('Passwort ist erforderlich');
      return;
    }
    const pwError = validatePassword(form.password);
    if (pwError) {
      setFooterError(pwError);
      return;
    }

    setSaving(true);
    try {
      // OData: neuen Benutzer anlegen; POST liefert das erstellte Objekt zurück
      const data = await apiClient.post<any>('/odata/Users', form, session);
      toast.success('Benutzer wurde erfolgreich erstellt');
      router.push(`/benutzer/${data.Id ?? data.id}`);
    } catch (e) {
      if (e instanceof ApiError) {
        setFooterError(e.message || 'Benutzer konnte nicht erstellt werden');
      } else {
        setFooterError('Netzwerkfehler – bitte Verbindung prüfen und erneut versuchen');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/benutzer">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserPlus className="h-7 w-7 text-primary" />
            Neuen Benutzer anlegen
          </h1>
          <p className="text-muted-foreground mt-1">Erstellen Sie ein neues Benutzerkonto</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kontodaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Vor- und Nachname" />
              </div>
              <div>
                <Label htmlFor="email">E-Mail *</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="benutzer@example.de" />
              </div>
              <div>
                <Label htmlFor="password">Passwort *</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => { setForm({ ...form, password: e.target.value }); setFooterError(null); }} placeholder="Mind. 8 Zeichen, Gross-/Kleinbuchstabe, Zahl, Sonderzeichen" />
                <p className="text-xs text-muted-foreground mt-1">Mind. 8 Zeichen, 1 Grossbuchstabe, 1 Kleinbuchstabe, 1 Zahl, 1 Sonderzeichen</p>
              </div>
              <div>
                <Label htmlFor="abacusPersonalnummer">ABACUS-Personalnummer</Label>
                <Input id="abacusPersonalnummer" value={form.abacusPersonalnummer} onChange={(e) => setForm({ ...form, abacusPersonalnummer: e.target.value })} placeholder="z.B. 10042" className="font-mono" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rolle & Einstellungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Rolle *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue placeholder="Rolle auswählen" /></SelectTrigger>
                  <SelectContent>
                    {rollen.map((r) => (
                      <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="aktiv">Konto aktiv</Label>
                <Switch id="aktiv" checked={form.aktiv} onCheckedChange={(v) => setForm({ ...form, aktiv: v })} />
              </div>

            </CardContent>
          </Card>
        </div>

        {footerError && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="font-medium">{footerError}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <Link href="/benutzer"><Button variant="outline" type="button">Abbrechen</Button></Link>
          <Button type="submit" disabled={saving}>{saving ? 'Wird erstellt...' : 'Benutzer erstellen'}</Button>
        </div>
      </form>
    </div>
  );
}
