'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Shield, Pencil, Save, X, UserCheck, UserX, Mail, Clock, AlertTriangle } from 'lucide-react';
import { hasPermission, getRoleLabel } from '@/lib/rbac';
import { apiClient } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  aktiv: boolean;
  abacusPersonalnummer: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BenutzerRolleOption {
  id: string;
  name: string;
  beschreibung: string | null;
}

const roleColors: Record<string, string> = {
  Admin: 'bg-red-100 text-red-800',
  User: 'bg-blue-100 text-blue-800',
};

function roleBadgeClass(role: string): string {
  return roleColors[role] ?? 'bg-gray-100 text-gray-800';
}

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0">
      {icon && <div className="text-muted-foreground mt-0.5">{icon}</div>}
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{value || '—'}</div>
      </div>
    </div>
  );
}

export default function BenutzerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession() || {};
  const currentRole = (session?.user as any)?.role;
  const currentUserId = (session?.user as any)?.id;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [rollen, setRollen] = useState<BenutzerRolleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formAktiv, setFormAktiv] = useState(true);
  const [formPassword, setFormPassword] = useState('');
  const [formAbacusPersonalnummer, setFormAbacusPersonalnummer] = useState('');

  useEffect(() => {
    if (id) { fetchUser(); }
  }, [id]);

  // Aktive Benutzerrollen dynamisch aus dem Katalog laden (Einstellungen → Benutzerrollen).
  useEffect(() => {
    if (!session) return;
    apiClient
      .get<ODataResponse<BenutzerRolleOption>>(
        '/odata/BenutzerRollen?$filter=aktiv eq true&$orderby=sortOrder,name',
        session,
      )
      .then(d => setRollen(d.value ?? []))
      .catch(() => { /* Auswahl bleibt leer; aktueller Wert bleibt wählbar */ });
  }, [session]);

  const fetchUser = async () => {
    try {
      // OData: einzelnen Benutzer laden
      const data = await apiClient.get<any>(`/odata/Users(${id})`, session);
      setUser(data);
      setFormName(data.name);
      setFormEmail(data.email);
      setFormRole(data.role);
      setFormAktiv(data.aktiv);
      setFormAbacusPersonalnummer(data.abacusPersonalnummer || '');
    } catch {
      toast({ title: 'Fehler', description: 'Benutzer nicht gefunden', variant: 'destructive' });
      router.push('/benutzer');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: any = { name: formName, email: formEmail, role: formRole, aktiv: formAktiv, abacusPersonalnummer: formAbacusPersonalnummer || null };
      if (formPassword) body.password = formPassword;

      // OData: Benutzer per PATCH aktualisieren
      await apiClient.patch(`/odata/Users(${id})`, body, session);
      toast({ title: 'Erfolg', description: 'Benutzer wurde aktualisiert' });
      setEditing(false);
      setFormPassword('');
      fetchUser();
    } catch {
      toast({ title: 'Fehler', description: 'Aktualisierung fehlgeschlagen', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      // UI-29-Fix: "Deaktivieren" muss reversibel sein (aktiv=false), nicht den
      // Account per DELETE endgültig löschen. Ein Admin, der "Benutzer
      // deaktivieren" bestätigt, erwartet laut Dialogtext eine Sperre, keine
      // Löschung samt abhängiger Datensätze/Historie.
      await apiClient.patch(`/odata/Users(${id})`, { aktiv: false }, session);
      toast({ title: 'Erfolg', description: 'Benutzer wurde deaktiviert' });
      fetchUser();
      setShowDeactivateConfirm(false);
    } catch {
      toast({ title: 'Fehler', description: 'Deaktivierung fehlgeschlagen', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!user) return null;

  const isSelf = currentUserId === user.id;
  const canEdit = hasPermission(currentRole, 'user:update');
  // UI-29-Fix: Deaktivieren ist jetzt ein PATCH (aktiv=false), keine Löschung
  // mehr -> Backend prüft dafür user:update (UsersController.cs), nicht mehr
  // user:delete.
  const canDeactivate = hasPermission(currentRole, 'user:update') && !isSelf;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/benutzer">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${user.aktiv ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {(user.name ?? '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={roleBadgeClass(user.role)} variant="secondary">
                  <Shield className="mr-1 h-3 w-3" />{getRoleLabel(user.role)}
                </Badge>
                {user.aktiv ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800"><UserCheck className="mr-1 h-3 w-3" />Aktiv</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-red-100 text-red-700"><UserX className="mr-1 h-3 w-3" />Inaktiv</Badge>
                )}
                {isSelf && <Badge variant="outline" className="text-xs">Sie selbst</Badge>}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && !editing && (
            <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />Bearbeiten</Button>
          )}
          {editing && (
            <>
              <Button variant="outline" onClick={() => { setEditing(false); setFormPassword(''); }}><X className="mr-2 h-4 w-4" />Abbrechen</Button>
              <Button onClick={handleSave} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Speichern...' : 'Speichern'}</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Kontodaten</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div><Label>Name</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
                <div><Label>E-Mail</Label><Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} /></div>
                <div><Label>Neues Passwort (leer lassen = unverändert)</Label><Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Neues Passwort eingeben..." /></div>
                <div><Label>ABACUS-Personalnummer</Label><Input value={formAbacusPersonalnummer} onChange={(e) => setFormAbacusPersonalnummer(e.target.value)} placeholder="ABACUS-Personalnummer eingeben..." /></div>
                <div>
                  <Label>Rolle</Label>
                  <Select value={formRole} onValueChange={setFormRole} disabled={isSelf}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {rollen.length === 0 ? (
                        formRole ? <SelectItem value={formRole}>{formRole}</SelectItem> : null
                      ) : (
                        rollen.map((r) => (
                          <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {isSelf && <p className="text-xs text-muted-foreground mt-1">Eigene Rolle kann nicht geändert werden</p>}
                </div>
                <div className="flex items-center justify-between">
                  <Label>Konto aktiv</Label>
                  <Switch checked={formAktiv} onCheckedChange={setFormAktiv} disabled={isSelf} />
                </div>
              </div>
            ) : (
              <div>
                <InfoRow label="Name" value={user.name} />
                <InfoRow label="E-Mail" value={user.email} icon={<Mail className="h-4 w-4" />} />
                <InfoRow label="ABACUS-Personalnr." value={user.abacusPersonalnummer || '—'} />
                <InfoRow label="Rolle" value={<Badge className={roleBadgeClass(user.role)} variant="secondary"><Shield className="mr-1 h-3 w-3" />{getRoleLabel(user.role)}</Badge>} />
                <InfoRow label="Erstellt am" value={formatDate(user.createdAt)} icon={<Clock className="h-4 w-4" />} />
                <InfoRow label="Letzte Änderung" value={formatDate(user.updatedAt)} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {canDeactivate && user.aktiv && (
            <Card className="border-red-200">
              <CardContent className="pt-6">
                {showDeactivateConfirm ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-5 w-5" />
                      <p className="font-medium">Benutzer wirklich deaktivieren?</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Der Benutzer kann sich danach nicht mehr anmelden.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" onClick={handleDeactivate}>Ja, deaktivieren</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowDeactivateConfirm(false)}>Abbrechen</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setShowDeactivateConfirm(true)}>
                    <UserX className="mr-2 h-4 w-4" />Benutzer deaktivieren
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
