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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { hasPermission } from '@/lib/rbac';
import { apiClient } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { ApiError } from '@/lib/errors';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft, Save, CircleDot, Users, Calendar, Zap, CheckCircle2, Plus,
  Pencil, UserPlus, UserMinus, Star, MessageSquare, AlertTriangle, Clock, ChevronRight, Network, Trash2,
  Gauge, Target, LineChart, TrendingUp, TrendingDown, Minus, Edit, CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface UserOption { id: string; name: string; email?: string }
interface RollenDefinitionOption { id: string; name: string; beschreibung: string | null; isLeadLink: boolean }

interface HistorieEntry {
  id: string;
  modul: string;
  aktion: string;
  entityName: string | null;
  userName: string;
  details: string | null;
  createdAt: string;
}

function HistorieTab({ circleId, session }: { circleId: string; session: any }) {
  const [historie, setHistorie] = useState<HistorieEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    apiClient.get<HistorieEntry[]>(`/api/kreise/${circleId}/aktivitaeten?top=50`, session)
      .then(data => setHistorie(data))
      .catch(() => setHistorie([]))
      .finally(() => setLoading(false));
  }, [circleId, session]);

  const AKTION_COLORS: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    UPDATE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    ZUWEISUNG: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    ENTZUG: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  const AKTION_LABELS: Record<string, string> = {
    CREATE: 'Erstellt',
    UPDATE: 'Geändert',
    DELETE: 'Gelöscht',
    ZUWEISUNG: 'Zuweisung',
    ENTZUG: 'Entzug',
  };

  if (loading) return <p className="text-center py-8 text-muted-foreground">Lädt Historie...</p>;
  if (historie.length === 0) return (
    <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Änderungen vorhanden</CardContent></Card>
  );

  return (
    <div className="space-y-3">
      {historie.map((entry) => {
        let detailsObj: any[] = [];
        try {
          if (entry.details) detailsObj = JSON.parse(entry.details);
        } catch {}
        return (
          <Card key={entry.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className="text-xs">{entry.modul}</Badge>
                    <Badge className={`text-xs ${AKTION_COLORS[entry.aktion] || 'bg-gray-100 text-gray-800'}`}>
                      {AKTION_LABELS[entry.aktion] || entry.aktion}
                    </Badge>
                    <span className="text-sm font-medium">{entry.entityName || '–'}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(entry.createdAt)} • {entry.userName}
                  </div>
                  {detailsObj.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {detailsObj.map((chg: any, idx: number) => (
                        <div key={idx} className="text-xs">
                          <span className="font-medium">{chg.Feld}:</span>{' '}
                          <span className="text-muted-foreground line-through">{chg.Alt || '(leer)'}</span>
                          {' → '}
                          <span className="text-foreground">{chg.Neu || '(leer)'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function KreisDetailPage() {
  const { data: session } = useSession() || {};
  const role = (session?.user as Record<string, unknown>)?.role as string ?? '';
  const params = useParams();
  const router = useRouter();
  const [circle, setCircle] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', verantwortlichkeit: '', purpose: '', purposeDetails: '', dateFrom: '', dateTo: '' });
  const [saving, setSaving] = useState(false);

  // Hierarchie (Umhängen): alle Kreise für die Ziel-Auswahl + Zustand.
  const [allCircles, setAllCircles] = useState<{ id: string; name: string; parentId: string | null }[]>([]);
  const [hierTargetId, setHierTargetId] = useState('');
  const [hierBusy, setHierBusy] = useState(false);

  // Role dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  // Eine Rolle wird ausschliesslich aus einer Vorlage (Rollendefinition) erstellt.
  // Das Backend-Modell S3Role speichert nur CircleId + RollenDefinitionId.
  const [roleForm, setRoleForm] = useState({ rollenDefinitionId: '' });
  const [rollenDefinitionen, setRollenDefinitionen] = useState<RollenDefinitionOption[]>([]);

  // Assign dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignRoleId, setAssignRoleId] = useState('');
  const [assignUserId, setAssignUserId] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);

  // Meeting dialog
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  // UI-28-Fix: Backend-Feldname ist "typ" (S3Meeting.Typ), nicht "meetingType".
  const [meetingForm, setMeetingForm] = useState({ title: '', typ: 'GOVERNANCE', scheduledAt: '', notes: '' });

  // Driver dialog
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  // UI-12-Fix: Backend-Feldnamen (Titel/Beschreibung/Prioritaet) statt
  // erfundener englischer Namen, die nie zum S3Driver-Modell passten.
  const [driverForm, setDriverForm] = useState({ titel: '', beschreibung: '', prioritaet: 'MITTEL' });

  // Lebenszyklus-Historie
  const [lebenszyklus, setLebenszyklus] = useState<Record<string, any>[]>([]);
  const loadLebenszyklus = useCallback(() => {
    if (!session || !params.id) return;
    apiClient.get<ODataResponse<Record<string, any>>>(
      `/odata/S3CircleLebenszyklen?$filter=S3CircleId eq ${params.id}&$expand=LebenszyklusPhase&$orderby=StartDatum desc`,
      session,
    ).then(data => setLebenszyklus(data.value ?? [])).catch(() => {});
  }, [params.id, session]);

  const loadCircle = useCallback(async () => {
    if (!session || !params.id) return;
    try {
      // Kreis-Grunddaten laden. S3Circle besitzt nur die Navigation "Parent";
      // Rollen/Spannungen/Subkreise sind eigene Entitäten und werden separat geladen.
      let data: Record<string, any>;
      try {
        data = await apiClient.get<Record<string, any>>(
          `/odata/Circles(${params.id})?$expand=Parent`,
          session,
        );
      } catch {
        // Fallback ohne Expand, falls die Navigation nicht verfügbar ist
        data = await apiClient.get<Record<string, any>>(
          `/odata/Circles(${params.id})`,
          session,
        );
      }

      // Zugehörige Datensätze separat und fehlertolerant laden
      const [rolesRes, driversRes, childrenRes] = await Promise.all([
        apiClient.get<ODataResponse<Record<string, any>>>(
          `/odata/Roles?$filter=CircleId eq ${params.id}&$expand=RollenDefinition,Assignments($expand=User)`,
          session,
        ).catch(() => ({ value: [] as Record<string, any>[] })),
        apiClient.get<ODataResponse<Record<string, any>>>(
          `/odata/Drivers?$filter=CircleId eq ${params.id}`,
          session,
        ).catch(() => ({ value: [] as Record<string, any>[] })),
        apiClient.get<ODataResponse<Record<string, any>>>(
          `/odata/Circles?$filter=ParentId eq ${params.id}`,
          session,
        ).catch(() => ({ value: [] as Record<string, any>[] })),
      ]);

      // Zuweisungen normalisieren: nur Einträge mit expandiertem Benutzer übernehmen.
      const roles = (rolesRes.value ?? []).map(r => {
        const rawAssignments = Array.isArray(r.assignments) ? r.assignments : [];
        const assignments = rawAssignments
          .filter((a: Record<string, any>) => a && a.user)
          .map((a: Record<string, any>) => ({
            id: a.id,
            user: { id: a.user.id, name: a.user.name, email: a.user.email },
          }));
        return { ...r, assignments };
      });
      const drivers = driversRes.value ?? [];
      const children = childrenRes.value ?? [];

      setCircle({
        ...data,
        purpose: data.zweck ?? data.purpose ?? '',
        roles,
        drivers,
        children,
        s3Meetings: [],
        decisions: [],
        _count: {
          roles: roles.length,
          drivers: drivers.length,
          children: children.length,
          s3Meetings: 0,
          decisions: 0,
        },
      });
      setEditForm({
        name: data.name || '',
        verantwortlichkeit: data.verantwortlichkeit || '',
        purpose: data.zweck || data.purpose || '',
        purposeDetails: data.purposeDetails || '',
        dateFrom: data.dateFrom ? String(data.dateFrom).slice(0, 10) : '',
        dateTo: data.dateTo ? String(data.dateTo).slice(0, 10) : '',
      });
    } catch (error: unknown) {
      console.error('Fehler:', error);
      toast.error('Kreis nicht gefunden');
      router.push('/organisation');
    } finally {
      setLoading(false);
    }
  }, [params.id, router, session]);

  useEffect(() => { loadCircle(); }, [loadCircle]);
  useEffect(() => { loadLebenszyklus(); }, [loadLebenszyklus]);

  useEffect(() => {
    if (!session) return;
    // Benutzer für Zuweisungen laden (OData)
    apiClient.get<ODataResponse<Record<string, unknown>>>('/odata/Users?$orderby=Name', session).then(data => {
      setUsers((data.value ?? []).filter((u: Record<string, unknown>) => u.aktiv !== false).map((u: Record<string, unknown>) => ({ id: u.id as string, name: u.name as string, email: u.email as string })));
    }).catch(() => {});

    // Aktive Rollen-Definitionen (Vorlagen) über OData laden
    apiClient.get<ODataResponse<RollenDefinitionOption>>('/odata/S3RollenDefinitionen?$filter=Aktiv eq true&$orderby=SortOrder,Name', session).then(data => {
      setRollenDefinitionen(data.value ?? []);
    }).catch(() => {});
  }, [session]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Kreis über OData aktualisieren.
      // WICHTIG: OData lehnt undeklarierte Eigenschaften mit 400 Bad Request ab.
      // Daher nur im S3Circle-EDM deklarierte Felder senden. Das Modell-Feld
      // heisst "Zweck" (nicht "purpose"); "purposeDetails" existiert nicht.
      const payload: Record<string, unknown> = {
        name: editForm.name,
        zweck: editForm.purpose,
        verantwortlichkeit: editForm.verantwortlichkeit,
        dateFrom: editForm.dateFrom ? new Date(editForm.dateFrom).toISOString() : null,
        dateTo: editForm.dateTo ? new Date(editForm.dateTo).toISOString() : null,
      };
      await apiClient.patch(`/odata/Circles(${params.id})`, payload, session);
      toast.success('Kreis aktualisiert');
      setEditing(false);
      loadCircle();
    } catch (error: unknown) {
      console.error('Fehler:', error);
      const msg = error instanceof ApiError ? (error.message || 'Fehler beim Speichern') : 'Fehler beim Speichern';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Alle aktiven Kreise für die Ziel-Auswahl der Hierarchie laden (beim Bearbeiten).
  const loadAllCircles = useCallback(async () => {
    if (!session) return;
    try {
      const data = await apiClient.get<ODataResponse<Record<string, any>>>(
        '/odata/Circles?$select=Id,Name,ParentId&$filter=IsActive eq true&$orderby=Name',
        session,
      );
      setAllCircles((data.value ?? []).map(c => ({
        id: c.id as string,
        name: (c.name ?? '') as string,
        parentId: (c.parentId ?? null) as string | null,
      })));
    } catch { /* fehlertolerant */ }
  }, [session]);

  useEffect(() => {
    if (editing) loadAllCircles();
  }, [editing, loadAllCircles]);

  // IDs des Kreises + aller Nachfahren (client-seitig) – als Ziel ausgeschlossen.
  const ausgeschlosseneZiele = useCallback((): Set<string> => {
    const eigeneId = String(params.id);
    const kinderJeElter = new Map<string, string[]>();
    for (const c of allCircles) {
      if (c.parentId) {
        const arr = kinderJeElter.get(c.parentId);
        if (arr) arr.push(c.id); else kinderJeElter.set(c.parentId, [c.id]);
      }
    }
    const ergebnis = new Set<string>([eigeneId]);
    const stapel = [eigeneId];
    while (stapel.length > 0) {
      const aktuell = stapel.pop()!;
      for (const kind of kinderJeElter.get(aktuell) ?? []) {
        if (!ergebnis.has(kind)) { ergebnis.add(kind); stapel.push(kind); }
      }
    }
    return ergebnis;
  }, [allCircles, params.id]);

  // Kreis an den gewählten Ziel-Kreis anhängen (rekursives RootId-Update im Backend).
  const handleAttachHier = async () => {
    if (!hierTargetId) { toast.error('Bitte einen Ziel-Kreis auswählen'); return; }
    setHierBusy(true);
    try {
      await apiClient.post(`/api/circles/${params.id}/anhaengen`, { zielKreisId: hierTargetId }, session);
      toast.success('Kreis wurde angehängt');
      setHierTargetId('');
      loadCircle();
      loadAllCircles();
    } catch (error: unknown) {
      console.error('Fehler beim Anhängen:', error);
      const msg = error instanceof ApiError ? (error.message || 'Fehler beim Anhängen') : 'Fehler beim Anhängen';
      toast.error(msg);
    } finally {
      setHierBusy(false);
    }
  };

  // Kreis aus der Hierarchie lösen und als Root-Kreis führen.
  const handleDetachHier = async () => {
    if (!window.confirm('Diesen Kreis aus der Hierarchie lösen und als eigenständigen Root-Kreis führen? Alle Subkreise bleiben erhalten.')) return;
    setHierBusy(true);
    try {
      await apiClient.post(`/api/circles/${params.id}/loesen`, {}, session);
      toast.success('Kreis wurde als Root-Kreis gelöst');
      loadCircle();
      loadAllCircles();
    } catch (error: unknown) {
      console.error('Fehler beim Lösen:', error);
      const msg = error instanceof ApiError ? (error.message || 'Fehler beim Lösen') : 'Fehler beim Lösen';
      toast.error(msg);
    } finally {
      setHierBusy(false);
    }
  };

  const handleCreateRole = async () => {
    // Eine Vorlage (Rollendefinition) ist Pflicht – ohne sie kann keine gültige
    // Rolle angelegt werden (RollenDefinitionId ist im Backend erforderlich).
    if (!roleForm.rollenDefinitionId) {
      toast.error('Bitte einen Rollentyp (Vorlage) wählen');
      return;
    }
    // Eine Rollen-Vorlage darf pro Kreis nur einmal angelegt werden.
    const vorhandeneRollen = ((circle?.roles as Record<string, any>[]) || []);
    if (vorhandeneRollen.some(r => r.rollenDefinitionId === roleForm.rollenDefinitionId)) {
      toast.error('Diese Rolle ist in diesem Kreis bereits vorhanden. Eine Rollen-Vorlage kann pro Kreis nur einmal zugeordnet werden.');
      return;
    }
    try {
      // Rolle über OData anlegen – nur die im Modell vorhandenen Felder senden.
      await apiClient.post('/odata/Roles', {
        circleId: params.id,
        rollenDefinitionId: roleForm.rollenDefinitionId,
      }, session);
      toast.success('Rolle erstellt');
      setRoleDialogOpen(false);
      setRoleForm({ rollenDefinitionId: '' });
      loadCircle();
    } catch (error: unknown) {
      console.error('Fehler:', error);
      toast.error(error instanceof ApiError ? (error.message || 'Fehler beim Erstellen der Rolle') : 'Fehler beim Erstellen der Rolle');
    }
  };

  const handleAssign = async () => {
    if (!assignRoleId || !assignUserId) { toast.error('Bitte Rolle und Benutzer auswählen'); return; }
    // Nur der Rolle "Mitglied" duerfen mehrere Benutzer zugewiesen werden.
    const selectedRole = ((circle?.roles as Record<string, any>[]) || []).find(r => r.id === assignRoleId);
    const roleName = (selectedRole?.rollenDefinition as { name?: string } | null)?.name;
    const istMitglied = roleName === 'Mitglied';
    const bestehendeZuweisungen = (selectedRole?.assignments as unknown[]) || [];
    if (!istMitglied && bestehendeZuweisungen.length > 0) {
      toast.error('Dieser Rolle ist bereits ein Benutzer zugeordnet. Nur der Rolle „Mitglied" können mehrere Benutzer zugewiesen werden.');
      return;
    }
    try {
      // Zuweisung über OData-Aktion
      await apiClient.post(`/odata/Roles(${assignRoleId})/Assign`, { userId: assignUserId }, session);
      toast.success('Zuweisung erfolgreich');
      setAssignDialogOpen(false);
      setAssignRoleId('');
      setAssignUserId('');
      loadCircle();
    } catch (error: unknown) {
      console.error('Fehler:', error);
      toast.error(error instanceof ApiError ? (error.message || 'Fehler') : 'Fehler');
    }
  };

  const handleUnassign = async (roleId: string, userId: string) => {
    try {
      // Zuweisung über OData-Aktion entfernen
      await apiClient.post(`/odata/Roles(${roleId})/Unassign`, { userId }, session);
      toast.success('Zuweisung entfernt');
      loadCircle();
    } catch (error: unknown) {
      console.error('Fehler:', error);
      toast.error(error instanceof ApiError ? (error.message || 'Fehler') : 'Fehler');
    }
  };

  // Rolle aus dem Kreis löschen – nur möglich, wenn keine Zuweisungen bestehen.
  // Die eigentliche Prüfung erfolgt zusätzlich serverseitig (HTTP 409 bei Zuweisungen).
  const handleDeleteRole = async (roleId: string) => {
    try {
      await apiClient.delete(`/odata/Roles(${roleId})`, session);
      toast.success('Rolle gelöscht');
      loadCircle();
    } catch (error: unknown) {
      console.error('Fehler:', error);
      toast.error(error instanceof ApiError ? (error.message || 'Fehler beim Löschen der Rolle') : 'Fehler beim Löschen der Rolle');
    }
  };

  const handleCreateMeeting = async () => {
    try {
      // Meeting über OData anlegen
      await apiClient.post('/odata/Meetings', { ...meetingForm, circleId: params.id }, session);
      toast.success('Meeting erstellt');
      setMeetingDialogOpen(false);
      setMeetingForm({ title: '', typ: 'GOVERNANCE', scheduledAt: '', notes: '' });
      loadCircle();
    } catch (error: unknown) {
      console.error('Fehler:', error);
      toast.error(error instanceof ApiError ? (error.message || 'Fehler') : 'Fehler');
    }
  };

  const handleCreateDriver = async () => {
    try {
      // Spannung über OData anlegen
      await apiClient.post('/odata/Drivers', { ...driverForm, circleId: params.id }, session);
      toast.success('Spannung erstellt');
      setDriverDialogOpen(false);
      setDriverForm({ titel: '', beschreibung: '', prioritaet: 'MITTEL' });
      loadCircle();
    } catch (error: unknown) {
      console.error('Fehler:', error);
      toast.error(error instanceof ApiError ? (error.message || 'Fehler') : 'Fehler');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!circle) return null;

  const c = circle as Record<string, unknown>;
  const selectedRollenDef = rollenDefinitionen.find(d => d.id === roleForm.rollenDefinitionId) ?? null;
  const roles = (c.roles || []) as Record<string, unknown>[];
  // Bereits im Kreis vergebene Vorlagen ausblenden – eine Vorlage darf pro Kreis nur einmal existieren.
  const vergebeneRollenDefIds = new Set(roles.map(r => (r as Record<string, unknown>).rollenDefinitionId as string));
  const verfuegbareRollenDefinitionen = rollenDefinitionen.filter(d => !vergebeneRollenDefIds.has(d.id));
  const meetings = (c.s3Meetings || []) as Record<string, unknown>[];
  const drivers = (c.drivers || []) as Record<string, unknown>[];
  const decisions = (c.decisions || []) as Record<string, unknown>[];
  const children = (c.children || []) as Record<string, unknown>[];
  const counts = (c._count || {}) as Record<string, number>;

  const MEETING_TYPE_LABELS: Record<string, string> = { GOVERNANCE: 'Governance', OPERATIONAL: 'Operativ', RETROSPECTIVE: 'Retrospektive' };
  const MEETING_STATUS_COLORS: Record<string, string> = { GEPLANT: 'bg-blue-100 text-blue-800', LAUFEND: 'bg-yellow-100 text-yellow-800', ABGESCHLOSSEN: 'bg-green-100 text-green-800', ABGESAGT: 'bg-gray-100 text-gray-800' };
  const DRIVER_STATUS_COLORS: Record<string, string> = { OFFEN: 'bg-red-100 text-red-800', IN_BEARBEITUNG: 'bg-yellow-100 text-yellow-800', ERLEDIGT: 'bg-green-100 text-green-800' };
  const PRIORITY_COLORS: Record<string, string> = { NIEDRIG: 'bg-gray-100 text-gray-800', MITTEL: 'bg-blue-100 text-blue-800', HOCH: 'bg-orange-100 text-orange-800', DRINGEND: 'bg-red-100 text-red-800' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/organisation">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <CircleDot className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{String(c.name)}</h1>
            {(c.parent as Record<string, unknown> | null) && (
              <Badge variant="outline">↳ {((c.parent as Record<string, unknown>)?.name as string) || ''}</Badge>
            )}
          </div>
          {c.purpose ? <p className="text-muted-foreground mt-1">Zweck: {String(c.purpose)}</p> : null}
          {c.verantwortlichkeit ? <p className="text-muted-foreground mt-1">Verantwortlich für: {String(c.verantwortlichkeit)}</p> : null}
        </div>
        {hasPermission(role, 'org:circle:update') && (
          <Button variant="outline" onClick={() => setEditing(!editing)}>
            <Pencil className="h-4 w-4 mr-2" />{editing ? 'Abbrechen' : 'Bearbeiten'}
          </Button>
        )}
      </div>

      {/* Edit form */}
      {editing && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2"><Label>Name</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Gültig ab</Label><Input type="date" value={editForm.dateFrom} onChange={e => setEditForm(f => ({ ...f, dateFrom: e.target.value }))} /></div>
              <div><Label>Gültig bis</Label><Input type="date" value={editForm.dateTo} onChange={e => setEditForm(f => ({ ...f, dateTo: e.target.value }))} /></div>
              <div className="md:col-span-2"><Label>Zweck</Label><Textarea value={editForm.purpose} onChange={e => setEditForm(f => ({ ...f, purpose: e.target.value }))} rows={4} /></div>
              <div className="md:col-span-2"><Label>Verantwortlich für</Label><Textarea value={editForm.verantwortlichkeit} onChange={e => setEditForm(f => ({ ...f, verantwortlichkeit: e.target.value }))} rows={2} /></div>
            </div>
            <div className="flex justify-end"><Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Speichern...' : 'Speichern'}</Button></div>

            {/* Hierarchie: Kreis an einen anderen Kreis anhängen bzw. lösen */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Hierarchie</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {(c.parent as Record<string, unknown> | null)
                  ? <>Übergeordneter Kreis: <strong>{((c.parent as Record<string, unknown>)?.name as string) || ''}</strong>. Dieser Kreis kann an einen anderen Kreis umgehängt oder als eigenständiger Root-Kreis gelöst werden.</>
                  : <>Dieser Kreis ist aktuell ein <strong>Root-Kreis</strong>. Er kann an einen anderen Kreis angehängt und danach als Subkreis geführt werden.</>}
                {' '}Vorhandene Subkreise werden dabei mit verschoben.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <Label>Ziel-Kreis</Label>
                  <Select value={hierTargetId} onValueChange={setHierTargetId}>
                    <SelectTrigger><SelectValue placeholder="Ziel-Kreis wählen" /></SelectTrigger>
                    <SelectContent>
                      {(() => {
                        const ausgeschlossen = ausgeschlosseneZiele();
                        const aktuellerParent = (c.parent as Record<string, unknown> | null)?.id as string | undefined;
                        const optionen = allCircles
                          .filter(o => !ausgeschlossen.has(o.id) && o.id !== aktuellerParent)
                          .sort((a, b) => {
                            const aRoot = !a.parentId ? 0 : 1;
                            const bRoot = !b.parentId ? 0 : 1;
                            if (aRoot !== bRoot) return aRoot - bRoot;
                            return a.name.localeCompare(b.name);
                          });
                        if (optionen.length === 0) {
                          return <div className="px-2 py-1.5 text-sm text-muted-foreground">Kein gültiger Ziel-Kreis verfügbar</div>;
                        }
                        return optionen.map(o => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}{!o.parentId ? ' (Root-Kreis)' : ''}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAttachHier} disabled={hierBusy || !hierTargetId}>
                  <Network className="h-4 w-4 mr-2" />{hierBusy ? 'Anhängen…' : 'Anhängen'}
                </Button>
                {(c.parent as Record<string, unknown> | null) && (
                  <Button variant="outline" onClick={handleDetachHier} disabled={hierBusy}>
                    Als Root-Kreis lösen
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[{ label: 'Rollen', value: counts.roles || 0, icon: Users, color: 'text-primary' },
          { label: 'Meetings', value: counts.s3Meetings || 0, icon: Calendar, color: 'text-blue-500' },
          { label: 'Spannungen', value: counts.drivers || 0, icon: Zap, color: 'text-orange-500' },
          { label: 'Entscheid.', value: counts.decisions || 0, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Subkreise', value: counts.children || 0, icon: CircleDot, color: 'text-purple-500' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-lg font-bold">{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="roles">Rollen</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="drivers">Spannungen</TabsTrigger>
          <TabsTrigger value="decisions">Entscheidungen</TabsTrigger>
          <TabsTrigger value="subcircles">Subkreise</TabsTrigger>
          <TabsTrigger value="lebenszyklus">Lebenszyklus</TabsTrigger>
          <TabsTrigger value="kennzahlen">Kennzahlen &amp; Ziele</TabsTrigger>
          <TabsTrigger value="historie">Historie</TabsTrigger>
        </TabsList>

        {/* TAB: Rollen */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Rollen im Kreis</h3>
            <div className="flex gap-2">
              {hasPermission(role, 'org:role:assign') && (
                <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                  <DialogTrigger asChild><Button variant="outline" size="sm"><UserPlus className="h-4 w-4 mr-2" />Zuweisen</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Person zuweisen</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Rolle</Label>
                        <Select value={assignRoleId} onValueChange={setAssignRoleId}>
                          <SelectTrigger><SelectValue placeholder="Rolle wählen" /></SelectTrigger>
                          <SelectContent>{roles.map(r => <SelectItem key={r.id as string} value={r.id as string}>{String((r.rollenDefinition as { name?: string } | null)?.name ?? r.name ?? 'Rolle')}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Benutzer</Label>
                        <Select value={assignUserId} onValueChange={setAssignUserId}>
                          <SelectTrigger><SelectValue placeholder="Benutzer wählen" /></SelectTrigger>
                          <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter><Button onClick={handleAssign}>Zuweisen</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {hasPermission(role, 'org:role:create') && (
                <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Neue Rolle</Button></DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Neue Rolle erstellen</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      {rollenDefinitionen.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Es sind keine Rollen-Vorlagen vorhanden. Bitte zuerst unter{' '}
                          <Link href="/einstellungen/s3-rollen" className="text-primary underline">Einstellungen → S3-Rollen</Link>{' '}
                          Rollentypen anlegen.
                        </p>
                      ) : verfuegbareRollenDefinitionen.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Alle verfügbaren Rollen-Vorlagen sind in diesem Kreis bereits angelegt.
                          Eine Rollen-Vorlage kann pro Kreis nur einmal zugeordnet werden.
                        </p>
                      ) : (
                        <>
                          <div>
                            <Label>Rollentyp (aus Vorlage) *</Label>
                            <Select
                              value={roleForm.rollenDefinitionId}
                              onValueChange={v => setRoleForm({ rollenDefinitionId: v })}
                            >
                              <SelectTrigger><SelectValue placeholder="Rollentyp wählen" /></SelectTrigger>
                              <SelectContent>
                                {verfuegbareRollenDefinitionen.map(d => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.name}{d.isLeadLink ? ' ★' : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {selectedRollenDef?.beschreibung ? (
                            <p className="text-sm text-muted-foreground">{selectedRollenDef.beschreibung}</p>
                          ) : null}
                          <p className="text-xs text-muted-foreground">
                            Rollentypen werden unter{' '}
                            <Link href="/einstellungen/s3-rollen" className="text-primary underline">Einstellungen → S3-Rollen</Link>{' '}
                            gepflegt.
                          </p>
                        </>
                      )}
                    </div>
                    <DialogFooter><Button onClick={handleCreateRole} disabled={!roleForm.rollenDefinitionId}>Erstellen</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          {roles.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Noch keine Rollen definiert</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {roles.map((r, idx) => {
                const assignments = (r.assignments || []) as { user: UserOption }[];
                const rDef = r.rollenDefinition as { id: string; name: string; isLeadLink: boolean } | null;
                return (
                  <motion.div key={r.id as string} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold">{String(rDef?.name ?? 'Rolle')}</h4>
                              {rDef?.isLeadLink ? <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs"><Star className="h-3 w-3 mr-1" />Lead Link</Badge> : null}
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {assignments.length === 0 ? (
                                <span className="text-xs text-muted-foreground italic">Keine Zuweisungen</span>
                              ) : assignments.map(a => (
                                <div key={a.user.id} className="flex items-center gap-1">
                                  <Badge variant="secondary" className="text-xs">{a.user.name}</Badge>
                                  {hasPermission(role, 'org:role:unassign') && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-5 w-5"><UserMinus className="h-3 w-3" /></Button></AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Zuweisung entfernen?</AlertDialogTitle>
                                          <AlertDialogDescription>{a.user.name} von Rolle &quot;{String(rDef?.name ?? 'Rolle')}&quot; entfernen?</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleUnassign(r.id as string, a.user.id)}>Entfernen</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Rolle löschen – nur wenn keine Zuweisungen bestehen */}
                          {assignments.length === 0 && hasPermission(role, 'org:role:update') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Rolle löschen">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Rolle löschen?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Die Rolle &quot;{String(rDef?.name ?? 'Rolle')}&quot; wird aus diesem Kreis entfernt. Dies ist nur möglich, weil ihr aktuell kein Benutzer zugewiesen ist.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteRole(r.id as string)}>Löschen</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

        </TabsContent>

        {/* TAB: Meetings */}
        <TabsContent value="meetings" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Meetings</h3>
            {hasPermission(role, 'org:meeting:create') && (
              <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Neues Meeting</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Neues Meeting</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Titel *</Label><Input value={meetingForm.title} onChange={e => setMeetingForm(f => ({ ...f, title: e.target.value }))} /></div>
                    <div>
                      <Label>Typ</Label>
                      <Select value={meetingForm.typ} onValueChange={v => setMeetingForm(f => ({ ...f, typ: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GOVERNANCE">Governance</SelectItem>
                          <SelectItem value="OPERATIONAL">Operativ</SelectItem>
                          <SelectItem value="RETROSPECTIVE">Retrospektive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Datum & Zeit *</Label><Input type="datetime-local" value={meetingForm.scheduledAt} onChange={e => setMeetingForm(f => ({ ...f, scheduledAt: e.target.value }))} /></div>
                    <div><Label>Notizen</Label><Textarea value={meetingForm.notes} onChange={e => setMeetingForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
                  </div>
                  <DialogFooter><Button onClick={handleCreateMeeting}>Erstellen</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {meetings.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Noch keine Meetings</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {meetings.map((m) => (
                <Link key={m.id as string} href={`/organisation/meetings/${m.id as string}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{String(m.title)}</h4>
                            <Badge className={MEETING_TYPE_LABELS[m.typ as string] ? 'bg-primary/10 text-primary' : ''}>
                              {MEETING_TYPE_LABELS[m.typ as string] || String(m.typ)}
                            </Badge>
                            <Badge className={MEETING_STATUS_COLORS[m.status as string] || ''}>{String(m.status)}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span><Clock className="h-3 w-3 inline mr-1" />{formatDate(m.scheduledAt as string)}</span>
                            <span>{((m._count as Record<string, number>)?.proposals || 0)} Vorschläge</span>
                            <span>{((m._count as Record<string, number>)?.decisions || 0)} Entscheid.</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: Spannungen (Drivers) */}
        <TabsContent value="drivers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Governance Backlog (Spannungen)</h3>
            {hasPermission(role, 'org:driver:create') && (
              <Dialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Neue Spannung</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Neue Spannung erfassen</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Titel *</Label><Input value={driverForm.titel} onChange={e => setDriverForm(f => ({ ...f, titel: e.target.value }))} /></div>
                    <div><Label>Beschreibung</Label><Textarea value={driverForm.beschreibung} onChange={e => setDriverForm(f => ({ ...f, beschreibung: e.target.value }))} rows={3} /></div>
                    <div>
                      <Label>Priorität</Label>
                      <Select value={driverForm.prioritaet} onValueChange={v => setDriverForm(f => ({ ...f, prioritaet: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NIEDRIG">Niedrig</SelectItem>
                          <SelectItem value="MITTEL">Mittel</SelectItem>
                          <SelectItem value="HOCH">Hoch</SelectItem>
                          <SelectItem value="DRINGEND">Dringend</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={handleCreateDriver}>Erstellen</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          {drivers.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Spannungen vorhanden</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {drivers.map(d => (
                <Link key={d.id as string} href={`/organisation/spannungen/${d.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Zap className="h-4 w-4 text-orange-500" />
                            <h4 className="font-semibold">{String(d.titel)}</h4>
                            <Badge className={DRIVER_STATUS_COLORS[d.status as string] || ''}>{String(d.status)}</Badge>
                            <Badge className={PRIORITY_COLORS[d.prioritaet as string] || ''}>{String(d.prioritaet)}</Badge>
                          </div>
                          {d.beschreibung ? <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{String(d.beschreibung)}</p> : null}
                          <p className="text-xs text-muted-foreground mt-1">
                            Erstellt von {((d.creator as Record<string, unknown>)?.name as string) || ''} am {formatDate(d.createdAt as string)}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: Entscheidungen */}
        <TabsContent value="decisions" className="space-y-4">
          <h3 className="text-lg font-semibold">Consent-Entscheidungen</h3>
          {decisions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Noch keine Entscheidungen</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {decisions.map(d => (
                <Card key={d.id as string}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <h4 className="font-semibold">{String(d.title)}</h4>
                      <Badge className="bg-green-100 text-green-800">{String(d.status)}</Badge>
                    </div>
                    {d.description ? <p className="text-sm text-muted-foreground mt-1">{String(d.description)}</p> : null}
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(d.createdAt as string)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: Subkreise */}
        <TabsContent value="subcircles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Subkreise</h3>
            {hasPermission(role, 'org:circle:create') && (
              <Link href={`/organisation/kreise/neu?parentId=${params.id}`}>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Subkreis erstellen</Button>
              </Link>
            )}
          </div>
          {children.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Subkreise vorhanden</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {children.map(ch => (
                <Link key={ch.id as string} href={`/organisation/kreise/${ch.id as string}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CircleDot className="h-5 w-5 text-primary" />
                          <div>
                            <h4 className="font-semibold">{String(ch.name)}</h4>
                            {ch.verantwortlichkeit ? <p className="text-sm text-muted-foreground">{String(ch.verantwortlichkeit)}</p> : null}
                          </div>
                        </div>
                        <Badge variant="secondary">{((ch._count as Record<string, number>)?.roles || 0)} Rollen</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: Lebenszyklus-Historie */}
        <TabsContent value="lebenszyklus" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Lebenszyklus-Historie</h3>
          </div>
          {lebenszyklus.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Keine Lebenszyklus-Einträge vorhanden</CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {lebenszyklus.map((entry, idx) => {
                const phase = (entry.lebenszyklusPhase ?? entry.LebenszyklusPhase) as Record<string, unknown> | undefined;
                const phaseName = (phase?.name ?? phase?.Name) as string | undefined;
                const startDatum = (entry.startDatum ?? entry.StartDatum) as string | undefined;
                const bemerkung = (entry.bemerkung ?? entry.Bemerkung) as string | undefined;
                return (
                  <Card key={(entry.id ?? entry.Id ?? idx) as string} className={idx === 0 ? 'border-primary/50' : undefined}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold">{phaseName ?? 'Unbekannte Phase'}</h4>
                              {idx === 0 && <Badge className="text-xs">Aktuell</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              seit {startDatum ? formatDate(startDatum) : '—'}
                            </p>
                            {bemerkung ? <p className="text-sm mt-1">{bemerkung}</p> : null}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB: Kennzahlen & Ziele (M7) */}
        <TabsContent value="kennzahlen" className="space-y-4">
          <KennzahlenZieleTab circleId={String(params.id)} role={role} session={session} />
        </TabsContent>

        {/* TAB: Historie (M2.4) */}
        <TabsContent value="historie" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Änderungshistorie</h3>
          </div>
          <HistorieTab circleId={params.id as string} session={session} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


/* ================================================================== */
/*  M7: Tab „Kennzahlen & Ziele" (KPIs und OKRs des Kreises)           */
/* ================================================================== */

interface KpiMeasurementLite {
  id: string;
  messdatum: string;
  istWert: number | null;
  status: string;
  trend: string;
}
interface KpiCircleItem {
  id: string;
  name: string;
  einheit: string | null;
  zielwert: number | null;
  warnschwelle: number | null;
  kritischeSchwelle: number | null;
  richtung: string | null;
  kategorie: string | null;
  datenquelle: string | null;
  messintervall: string | null;
  measurements?: KpiMeasurementLite[];
}
interface KeyResultLite {
  id: string;
  startWert: number | null;
  zielWert: number | null;
  istWert: number | null;
  status: string;
}
interface OkrCircleItem {
  id: string;
  titel: string;
  status: string;
  faelligkeit: string | null;
  keyResults?: KeyResultLite[];
}

const KZ_RICHTUNG_OPTIONS = [
  { value: 'HOEHER_BESSER', label: 'Höher ist besser (z.B. Umsatz, NPS)' },
  { value: 'NIEDRIGER_BESSER', label: 'Niedriger ist besser (z.B. Fehlerrate, Kosten)' },
  { value: 'ZIELBAND', label: 'Zielband (Warnschwelle=Untergrenze, Kritische=Obergrenze)' },
];
const KZ_INTERVALL_OPTIONS = [
  { value: 'TAEGLICH', label: 'Täglich' },
  { value: 'WOECHENTLICH', label: 'Wöchentlich' },
  { value: 'MONATLICH', label: 'Monatlich' },
  { value: 'QUARTALSWEISE', label: 'Quartalsweise' },
  { value: 'JAEHRLICH', label: 'Jährlich' },
];
const KZ_KATEGORIE_OPTIONS = ['Finanzen', 'Qualität', 'Prozesse', 'Kunden', 'Personal'];

const kzNumOrNull = (s: string): number | null => (s.trim() === '' ? null : Number(s));

function kzFmtNum(n: number | null | undefined, einheit?: string | null): string {
  if (n === null || n === undefined) return '–';
  const s = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 2 }).format(n);
  return einheit ? `${s} ${einheit}` : s;
}

function kzFmtDate(d: string | null | undefined): string {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Zurich' });
}

/** Prüft die Schwellen-Reihenfolge (spiegelt die serverseitige Validierung wider). */
function kzPruefeSchwellenFehler(warn: number | null, kritisch: number | null, richtung: string): string | null {
  if (warn === null || kritisch === null) return null;
  if (richtung === 'HOEHER_BESSER') {
    if (kritisch >= warn) return 'Bei „Höher ist besser“ muss die kritische Schwelle kleiner als die Warnschwelle sein.';
  } else if (warn >= kritisch) {
    return 'Die Warnschwelle muss kleiner als die kritische Schwelle sein.';
  }
  return null;
}

function KzKpiStatusBadge({ status }: { status?: string }) {
  switch (status) {
    case 'GRUEN':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Grün</Badge>;
    case 'GELB':
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs">Gelb</Badge>;
    case 'ROT':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs">Rot</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">Kein Messwert</Badge>;
  }
}

function KzTrendIcon({ trend }: { trend?: string }) {
  if (trend === 'STEIGEND') return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend === 'FALLEND') return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

/** Fortschritt eines Key Results (0–100 %) aus Start-, Ziel- und Istwert. */
function kzKrFortschritt(kr: KeyResultLite): number {
  const start = kr.startWert ?? 0;
  const ziel = kr.zielWert;
  const ist = kr.istWert ?? 0;
  if (ziel == null) return 0;
  const spanne = ziel - start;
  if (spanne === 0) return ist >= ziel ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round(((ist - start) / spanne) * 100)));
}

/** Ø-Fortschritt eines OKR aus seinen Key Results. */
function kzOkrFortschritt(okr: OkrCircleItem): number {
  const krs = okr.keyResults ?? [];
  if (krs.length === 0) return 0;
  const sum = krs.reduce((acc, kr) => acc + kzKrFortschritt(kr), 0);
  return Math.round(sum / krs.length);
}

const KZ_EMPTY_KPI = {
  name: '',
  einheit: '',
  richtung: 'HOEHER_BESSER',
  zielwert: '',
  warnschwelle: '',
  kritischeSchwelle: '',
  messintervall: 'MONATLICH',
  kategorie: '',
  datenquelle: '',
};
const KZ_EMPTY_MEAS = {
  messdatum: new Date().toISOString().slice(0, 10),
  istWert: '',
  kommentar: '',
  massnahme: '',
};
const KZ_EMPTY_OKR = {
  titel: '',
  beschreibung: '',
  faelligkeit: '',
};

function KennzahlenZieleTab({
  circleId,
  role,
  session,
}: {
  circleId: string;
  role: string;
  session: ReturnType<typeof useSession>['data'];
}) {
  const canKpiManage = hasPermission(role, 'kpi:manage');
  const canKpiMeasure = hasPermission(role, 'kpi:measure');
  const canOkrManage = hasPermission(role, 'okr:manage');

  const [kpis, setKpis] = useState<KpiCircleItem[]>([]);
  const [okrs, setOkrs] = useState<OkrCircleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // KPI-Definition anlegen
  const [kpiOpen, setKpiOpen] = useState(false);
  const [kpiForm, setKpiForm] = useState({ ...KZ_EMPTY_KPI });
  const [savingKpi, setSavingKpi] = useState(false);
  const [kpiDeleteTarget, setKpiDeleteTarget] = useState<KpiCircleItem | null>(null);

  // Messwert erfassen
  const [measOpen, setMeasOpen] = useState(false);
  const [measKpi, setMeasKpi] = useState<KpiCircleItem | null>(null);
  const [measForm, setMeasForm] = useState({ ...KZ_EMPTY_MEAS });
  const [savingMeas, setSavingMeas] = useState(false);

  // OKR anlegen
  const [okrOpen, setOkrOpen] = useState(false);
  const [okrForm, setOkrForm] = useState({ ...KZ_EMPTY_OKR });
  const [savingOkr, setSavingOkr] = useState(false);
  const [okrDeleteTarget, setOkrDeleteTarget] = useState<OkrCircleItem | null>(null);

  // Lazy-Load: erst beim Aktivieren des Tabs (Komponente wird dann gemountet).
  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [kpiRes, okrRes] = await Promise.all([
        apiClient.get<ODataResponse<KpiCircleItem>>(
          `/odata/KpiDefinitions?$filter=CircleId eq ${circleId}&$expand=Measurements($orderby=Messdatum desc)&$orderby=Name`,
          session,
        ).catch(() => ({ value: [] as KpiCircleItem[] })),
        apiClient.get<ODataResponse<OkrCircleItem>>(
          `/odata/OKRs?$filter=CircleId eq ${circleId}&$expand=KeyResults&$orderby=Titel`,
          session,
        ).catch(() => ({ value: [] as OkrCircleItem[] })),
      ]);
      setKpis(kpiRes.value ?? []);
      setOkrs(okrRes.value ?? []);
    } finally {
      setLoading(false);
    }
  }, [circleId, session]);

  useEffect(() => { load(); }, [load]);

  const kzSchwellenFehler = kzPruefeSchwellenFehler(
    kzNumOrNull(kpiForm.warnschwelle),
    kzNumOrNull(kpiForm.kritischeSchwelle),
    kpiForm.richtung,
  );

  const openCreateKpi = () => {
    setKpiForm({ ...KZ_EMPTY_KPI });
    setKpiOpen(true);
  };

  const saveKpi = async () => {
    if (!kpiForm.name.trim()) { toast.error('Name ist erforderlich'); return; }
    const fehler = kzPruefeSchwellenFehler(
      kzNumOrNull(kpiForm.warnschwelle),
      kzNumOrNull(kpiForm.kritischeSchwelle),
      kpiForm.richtung,
    );
    if (fehler) { toast.error(fehler); return; }
    setSavingKpi(true);
    try {
      await apiClient.post('/odata/KpiDefinitions', {
        name: kpiForm.name.trim(),
        einheit: kpiForm.einheit || null,
        richtung: kpiForm.richtung || null,
        zielwert: kzNumOrNull(kpiForm.zielwert),
        warnschwelle: kzNumOrNull(kpiForm.warnschwelle),
        kritischeSchwelle: kzNumOrNull(kpiForm.kritischeSchwelle),
        messintervall: kpiForm.messintervall || null,
        kategorie: kpiForm.kategorie || null,
        datenquelle: kpiForm.datenquelle || null,
        circleId,
      }, session);
      toast.success('KPI erstellt');
      setKpiOpen(false);
      load();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : 'Speichern fehlgeschlagen');
    } finally {
      setSavingKpi(false);
    }
  };

  const confirmDeleteKpi = async () => {
    if (!kpiDeleteTarget) return;
    try {
      await apiClient.delete(`/odata/KpiDefinitions(${kpiDeleteTarget.id})`, session);
      toast.success('KPI gelöscht');
      setKpiDeleteTarget(null);
      load();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : 'Löschen fehlgeschlagen');
    }
  };

  const openMeas = (k: KpiCircleItem) => {
    setMeasKpi(k);
    setMeasForm({ ...KZ_EMPTY_MEAS });
    setMeasOpen(true);
  };

  const saveMeas = async () => {
    if (!measKpi) return;
    if (measForm.istWert.trim() === '') { toast.error('Ist-Wert ist erforderlich'); return; }
    setSavingMeas(true);
    try {
      await apiClient.post('/odata/KpiMeasurements', {
        kpiDefinitionId: measKpi.id,
        messdatum: measForm.messdatum,
        istWert: Number(measForm.istWert),
        kommentar: measForm.kommentar || null,
        massnahme: measForm.massnahme || null,
      }, session);
      toast.success('Messwert erfasst');
      setMeasOpen(false);
      load();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : 'Speichern fehlgeschlagen');
    } finally {
      setSavingMeas(false);
    }
  };

  const openCreateOkr = () => {
    setOkrForm({ ...KZ_EMPTY_OKR });
    setOkrOpen(true);
  };

  const saveOkr = async () => {
    if (!okrForm.titel.trim()) { toast.error('Titel ist erforderlich'); return; }
    setSavingOkr(true);
    try {
      await apiClient.post('/odata/OKRs', {
        titel: okrForm.titel.trim(),
        beschreibung: okrForm.beschreibung || null,
        faelligkeit: okrForm.faelligkeit || null,
        circleId,
      }, session);
      toast.success('OKR erstellt');
      setOkrOpen(false);
      load();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : 'Speichern fehlgeschlagen');
    } finally {
      setSavingOkr(false);
    }
  };

  const confirmDeleteOkr = async () => {
    if (!okrDeleteTarget) return;
    try {
      await apiClient.delete(`/odata/OKRs(${okrDeleteTarget.id})`, session);
      toast.success('OKR gelöscht');
      setOkrDeleteTarget(null);
      load();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : 'Löschen fehlgeschlagen');
    }
  };

  const setKF = (k: keyof typeof KZ_EMPTY_KPI, v: string) => setKpiForm((p) => ({ ...p, [k]: v }));

  if (loading) {
    return <p className="text-sm text-muted-foreground">Wird geladen …</p>;
  }

  return (
    <div className="space-y-8">
      {/* ---------------- KPI-Sektion ---------------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Kennzahlen (KPIs)</h3>
          </div>
          {canKpiManage && (
            <Button size="sm" onClick={openCreateKpi} className="gap-1">
              <Plus className="h-4 w-4" /> KPI anlegen
            </Button>
          )}
        </div>

        {kpis.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Noch keine KPIs für diesen Kreis.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {kpis.map((k) => {
              const latest = k.measurements?.[0];
              return (
                <Card key={k.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold">{k.name}</h4>
                          {k.kategorie && <Badge variant="secondary" className="text-xs">{k.kategorie}</Badge>}
                          <KzKpiStatusBadge status={latest?.status} />
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                          <span>Ist: <span className="font-medium text-foreground">{kzFmtNum(latest?.istWert, k.einheit)}</span></span>
                          <span>Ziel: {kzFmtNum(k.zielwert, k.einheit)}</span>
                          {latest && (
                            <span className="inline-flex items-center gap-1"><KzTrendIcon trend={latest.trend} /></span>
                          )}
                        </div>
                        {latest && (
                          <p className="mt-1 text-xs text-muted-foreground">Letzte Messung: {kzFmtDate(latest.messdatum)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 border-t pt-2">
                      {canKpiMeasure && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => openMeas(k)}>
                          <LineChart className="h-4 w-4" /> Messung erfassen
                        </Button>
                      )}
                      {canKpiManage && (
                        <Button size="sm" variant="ghost" className="gap-1 text-red-600 hover:text-red-700" onClick={() => setKpiDeleteTarget(k)}>
                          <Trash2 className="h-4 w-4" /> Löschen
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------- OKR-Sektion ---------------- */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Ziele (OKRs)</h3>
          </div>
          {canOkrManage && (
            <Button size="sm" onClick={openCreateOkr} className="gap-1">
              <Plus className="h-4 w-4" /> OKR anlegen
            </Button>
          )}
        </div>

        {okrs.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Noch keine OKRs für diesen Kreis.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {okrs.map((o) => {
              const fortschritt = kzOkrFortschritt(o);
              const anzahlKr = o.keyResults?.length ?? 0;
              return (
                <Card key={o.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href="/einstellungen/okr" className="font-semibold hover:text-primary hover:underline">
                          {o.titel}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">{o.status}</Badge>
                          <span>{anzahlKr} Key Result(s)</span>
                          {o.faelligkeit && (
                            <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> fällig {kzFmtDate(o.faelligkeit)}</span>
                          )}
                        </div>
                      </div>
                      {canOkrManage && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700" onClick={() => setOkrDeleteTarget(o)} title="Löschen">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Fortschritt</span>
                        <span className="font-medium">{fortschritt}%</span>
                      </div>
                      <Progress value={fortschritt} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------- Dialog: KPI anlegen ---------------- */}
      <Dialog open={kpiOpen} onOpenChange={setKpiOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Neue KPI</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={kpiForm.name} onChange={(e) => setKF('name', e.target.value)} placeholder="z. B. Durchschnittliche Zufriedenheitsbewertung" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Zielwert</Label>
                <Input type="number" value={kpiForm.zielwert} onChange={(e) => setKF('zielwert', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Einheit</Label>
                <Input value={kpiForm.einheit} onChange={(e) => setKF('einheit', e.target.value)} placeholder="%, CHF, Anzahl …" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Richtung</Label>
              <Select value={kpiForm.richtung} onValueChange={(v) => setKF('richtung', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KZ_RICHTUNG_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Warnschwelle (gelb)</Label>
                <Input type="number" value={kpiForm.warnschwelle} onChange={(e) => setKF('warnschwelle', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Kritische Schwelle (rot)</Label>
                <Input type="number" value={kpiForm.kritischeSchwelle} onChange={(e) => setKF('kritischeSchwelle', e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Messintervall</Label>
                <Select value={kpiForm.messintervall} onValueChange={(v) => setKF('messintervall', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KZ_INTERVALL_OPTIONS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {kzSchwellenFehler && (
              <p className="text-xs text-red-600 dark:text-red-400">{kzSchwellenFehler}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Kategorie</Label>
                <Select value={kpiForm.kategorie || 'NONE'} onValueChange={(v) => setKF('kategorie', v === 'NONE' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Kategorie" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">– keine –</SelectItem>
                    {KZ_KATEGORIE_OPTIONS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Datenquelle</Label>
                <Input value={kpiForm.datenquelle} onChange={(e) => setKF('datenquelle', e.target.value)} placeholder="ERP, CRM, Datenbank, API …" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKpiOpen(false)}>Abbrechen</Button>
            <Button onClick={saveKpi} disabled={savingKpi || !!kzSchwellenFehler}>{savingKpi ? 'Speichern …' : 'Speichern'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Dialog: Messwert erfassen ---------------- */}
      <Dialog open={measOpen} onOpenChange={setMeasOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" /> Messwert erfassen · {measKpi?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Messdatum *</Label>
                <Input type="date" value={measForm.messdatum} onChange={(e) => setMeasForm((p) => ({ ...p, messdatum: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Ist-Wert *{measKpi?.einheit ? ` (${measKpi.einheit})` : ''}</Label>
                <Input type="number" value={measForm.istWert} onChange={(e) => setMeasForm((p) => ({ ...p, istWert: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Kommentar</Label>
              <Input value={measForm.kommentar} onChange={(e) => setMeasForm((p) => ({ ...p, kommentar: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Massnahme</Label>
              <Input value={measForm.massnahme} onChange={(e) => setMeasForm((p) => ({ ...p, massnahme: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">Status und Trend werden automatisch aus den Schwellen bzw. den letzten Messwerten berechnet.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMeasOpen(false)}>Abbrechen</Button>
            <Button onClick={saveMeas} disabled={savingMeas}>{savingMeas ? 'Speichern …' : 'Erfassen'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Dialog: OKR anlegen ---------------- */}
      <Dialog open={okrOpen} onOpenChange={setOkrOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Neues OKR</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Titel *</Label>
              <Input value={okrForm.titel} onChange={(e) => setOkrForm((p) => ({ ...p, titel: e.target.value }))} placeholder="z. B. Kundenzufriedenheit steigern" />
            </div>
            <div className="grid gap-2">
              <Label>Beschreibung</Label>
              <Textarea value={okrForm.beschreibung} onChange={(e) => setOkrForm((p) => ({ ...p, beschreibung: e.target.value }))} rows={3} />
            </div>
            <div className="grid gap-2">
              <Label>Fälligkeit</Label>
              <Input type="date" value={okrForm.faelligkeit} onChange={(e) => setOkrForm((p) => ({ ...p, faelligkeit: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">Key Results werden anschliessend unter Einstellungen → Key Results erfasst.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOkrOpen(false)}>Abbrechen</Button>
            <Button onClick={saveOkr} disabled={savingOkr}>{savingOkr ? 'Speichern …' : 'Speichern'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Löschen: KPI ---------------- */}
      <AlertDialog open={!!kpiDeleteTarget} onOpenChange={(o) => !o && setKpiDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>KPI löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die KPI «{kpiDeleteTarget?.name}» und alle zugehörigen Messwerte werden unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteKpi} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---------------- Löschen: OKR ---------------- */}
      <AlertDialog open={!!okrDeleteTarget} onOpenChange={(o) => !o && setOkrDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>OKR löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Das OKR «{okrDeleteTarget?.titel}» und alle zugehörigen Key Results werden unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteOkr} className="bg-red-600 hover:bg-red-700">Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
