'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { hasPermission } from '@/lib/rbac';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient, getToken } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { ApiError } from '@/lib/errors';
import { CircleListItem, DriverListItem, OrgUser, OrgUserProfile, DashboardCircleReview, DashboardApiResponse } from '@/lib/types';
import { sortCirclesByReview } from '@/lib/dashboard-helpers';
import { formatDate, stripHtml } from '@/lib/utils';
import { MemberAvatar } from '@/components/member-avatar';
import { CircleDot, Plus, Search, Users, Calendar, Zap, CheckCircle2, ChevronRight, ChevronDown, Network, AlertTriangle, UsersRound, Crown, Handshake, Gavel, UserCircle, Mail, Phone, Clock, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Basis-URL der API (für authentifizierten Bild-Abruf des Porträtfotos).
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/* ------------------------------------------------------------------ */
/*  Priority / Status helpers                                          */
/* ------------------------------------------------------------------ */

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  DRINGEND: { label: 'Dringend', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  HOCH: { label: 'Hoch', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  MITTEL: { label: 'Mittel', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  NIEDRIG: { label: 'Niedrig', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OFFEN: { label: 'Offen', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  IN_BEARBEITUNG: { label: 'In Bearbeitung', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  ERLEDIGT: { label: 'Erledigt', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function OrganisationPage() {
  const { data: session } = useSession() || {};
  const role = (session?.user as Record<string, unknown>)?.role as string ?? '';

  // DB-gestützte Berechtigungen: ein Lead-Link (Rolle "User" mit org:circle:create
  // in der DB) darf Kreise erfassen, ein normales S3-Mitglied nicht. Admins immer.
  const { permissions: dbPermissions, isLoading: permsLoading } = usePermissions();
  const canCreateCircle =
    role === 'Admin' ||
    (!permsLoading && dbPermissions.length > 0
      ? dbPermissions.includes('org:circle:create')
      : hasPermission(role, 'org:circle:create'));
  // Berechtigung zum Umhängen/Lösen von Kreisen (gleiche wie "Kreis bearbeiten").
  const canUpdateCircle =
    role === 'Admin' ||
    (!permsLoading && dbPermissions.length > 0
      ? dbPermissions.includes('org:circle:update')
      : hasPermission(role, 'org:circle:update'));

  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams?.get('tab') === 'drivers'
    ? 'drivers'
    : searchParams?.get('tab') === 'review'
    ? 'review'
    : 'circles';

  // Circles state
  const [circles, setCircles] = useState<CircleListItem[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(true);
  const [circleSearch, setCircleSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Such-Modus im Kreise-Tab: nach Kreisen oder nach Benutzern suchen.
  const [searchMode, setSearchMode] = useState<'circles' | 'users'>('circles');

  // Benutzer-Suche state
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Profil-Dialog (Profil des gefundenen Benutzers)
  const [profilUserId, setProfilUserId] = useState<string | null>(null);
  const [profil, setProfil] = useState<OrgUserProfile | null>(null);
  const [profilLoading, setProfilLoading] = useState(false);
  const [profilFotoUrl, setProfilFotoUrl] = useState<string | null>(null);

  // Drivers state
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversLoaded, setDriversLoaded] = useState(false);
  const [driverSearch, setDriverSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState('all');
  const [driverPriorityFilter, setDriverPriorityFilter] = useState('all');

  // Review state
  const [reviewCircles, setReviewCircles] = useState<DashboardCircleReview[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewLoaded, setReviewLoaded] = useState(false);

  // New driver dialog
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [driverForm, setDriverForm] = useState({ title: '', description: '', priority: 'MITTEL', circleId: '' });
  const [driverSaving, setDriverSaving] = useState(false);

  // Mitglieder-&-Rollen-Modal (pro Kreis)
  const [membersDialogCircle, setMembersDialogCircle] = useState<{ id: string; name: string } | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersRoles, setMembersRoles] = useState<Record<string, any>[]>([]);

  // Kreis-verschieben-Dialog (Kreis an anderen Kreis anhängen)
  const [moveCircle, setMoveCircle] = useState<{ id: string; name: string; hasParent: boolean } | null>(null);
  const [moveTargetId, setMoveTargetId] = useState('');
  const [moving, setMoving] = useState(false);

  // Öffnet das modale Fenster und lädt Rollen + Zuweisungen (inkl. Benutzer) des Kreises.
  const openMembers = useCallback(async (circle: { id: string; name: string }) => {
    setMembersDialogCircle({ id: circle.id, name: circle.name });
    setMembersLoading(true);
    setMembersRoles([]);
    try {
      const res = await apiClient.get<ODataResponse<Record<string, any>>>(
        `/odata/Roles?$filter=CircleId eq ${circle.id} and Aktiv eq true&$expand=RollenDefinition,Assignments($expand=User)`,
        session,
      );
      setMembersRoles(res.value ?? []);
    } catch (error: unknown) {
      console.error('Fehler beim Laden der Mitglieder:', error);
      toast.error('Mitglieder konnten nicht geladen werden');
    } finally {
      setMembersLoading(false);
    }
  }, [session]);

  // Neuer Issue (2026-09-21): Zuweisungen liessen sich aus diesem
  // "Mitglieder & Rollen"-Überblicksdialog nicht mehr lösen - der Dialog war
  // rein lesend, das Entfernen war nur über die einzelne Kreis-Detailseite
  // möglich. Nutzt dieselbe Backend-Aktion wie dort und lädt den Dialog
  // anschliessend neu.
  const handleUnassignFromDialog = useCallback(async (roleId: string, userId: string) => {
    if (!membersDialogCircle) return;
    try {
      await apiClient.post(`/odata/Roles(${roleId})/Unassign`, { userId }, session);
      toast.success('Zuweisung entfernt');
      await openMembers(membersDialogCircle);
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? (error.message || 'Zuweisung konnte nicht entfernt werden') : 'Zuweisung konnte nicht entfernt werden');
    }
  }, [membersDialogCircle, session, openMembers]);

  const loadCircles = useCallback(async () => {
    if (!session) return;
    try {
      // S3Circle besitzt als einzige Navigation nur "Parent".
      // Roles/Children/Drivers existieren nicht als Navigation → $expand nur auf Parent.
      // Die Baumstruktur wird client-seitig aus ParentId aufgebaut.
      const data = await apiClient.get<ODataResponse<Record<string, any>>>(
        "/odata/Circles?$filter=IsActive eq true&$expand=Parent&$orderby=Name",
        session,
      );
      const items: CircleListItem[] = (data.value ?? []).map((c: Record<string, any>) => ({
        id: c.id as string,
        name: (c.name ?? '') as string,
        verantwortlichkeit: (c.verantwortlichkeit ?? null) as string | null,
        purpose: (c.zweck ?? c.purpose ?? null) as string | null,
        isActive: (c.isActive ?? true) as boolean,
        parent: c.parent
          ? { id: c.parent.id as string, name: (c.parent.name ?? '') as string }
          : null,
        children: [],   // wird client-seitig über childrenByParent aufgebaut
        roles: [],      // Rollen nur in Detailseite geladen
        _count: { roles: 0, s3Meetings: 0, drivers: 0, decisions: 0 },
        creator: { id: (c.createdBy ?? '') as string, name: '' },
        createdAt: (c.createdAt ?? '') as string,
      }));
      setCircles(items);
    } catch (error: unknown) {
      console.error('Fehler beim Laden der Kreise:', error);
    } finally {
      setCirclesLoading(false);
    }
  }, [session]);

  const loadDrivers = useCallback(async () => {
    if (!session) return;
    setDriversLoading(true);
    try {
      // Spannungen inkl. Kreis und Arbeitspaketen über OData laden
      const data = await apiClient.get<ODataResponse<DriverListItem>>(
        '/odata/Drivers?$expand=Circle,WorkItems&$orderby=CreatedAt desc',
        session
      );
      setDrivers(data.value ?? []);
      setDriversLoaded(true);
    } catch (error: unknown) {
      console.error('Fehler beim Laden der Spannungen:', error);
    } finally {
      setDriversLoading(false);
    }
  }, [session]);

  const loadReview = useCallback(async () => {
    if (!session) return;
    setReviewLoading(true);
    try {
      const data = await apiClient.get<DashboardApiResponse>('/api/dashboard', session);
      setReviewCircles(sortCirclesByReview(data.circlesNeedingReview));
      setReviewLoaded(true);
    } catch (error) {
      console.error('Fehler beim Laden der Review-Kreise:', error);
    } finally {
      setReviewLoading(false);
    }
  }, [session]);

  // Load circles
  useEffect(() => {
    loadCircles();
  }, [loadCircles]);

  // Load drivers when tab switches to drivers
  useEffect(() => {
    if (activeTab === 'drivers' && !driversLoaded) {
      loadDrivers();
    }
  }, [activeTab, driversLoaded, loadDrivers]);

  // Load review circles when tab switches to review
  useEffect(() => {
    if (activeTab === 'review' && !reviewLoaded) {
      loadReview();
    }
  }, [activeTab, reviewLoaded, loadReview]);

  // Benutzerliste laden (für die Benutzer-Suche). Wird erst geladen, wenn der
  // Benutzer-Suchmodus zum ersten Mal aktiviert wird.
  const loadUsers = useCallback(async () => {
    if (!session) return;
    setUsersLoading(true);
    try {
      const data = await apiClient.get<ODataResponse<OrgUser>>(
        '/odata/Users?$orderby=Name',
        session,
      );
      setUsers(data.value ?? []);
      setUsersLoaded(true);
    } catch (error: unknown) {
      console.error('Fehler beim Laden der Benutzer:', error);
      toast.error('Benutzer konnten nicht geladen werden');
    } finally {
      setUsersLoading(false);
    }
  }, [session]);

  // Benutzer erst laden, wenn in den Benutzer-Suchmodus gewechselt wird.
  useEffect(() => {
    if (searchMode === 'users' && !usersLoaded) {
      loadUsers();
    }
  }, [searchMode, usersLoaded, loadUsers]);

  // Öffnet den Profil-Dialog und lädt das Profil des gewählten Benutzers.
  const openProfil = useCallback(async (userId: string) => {
    setProfilUserId(userId);
    setProfil(null);
    setProfilFotoUrl(null);
    setProfilLoading(true);
    try {
      const data = await apiClient.get<OrgUserProfile>(`/api/profil/benutzer/${userId}`, session);
      setProfil(data);
    } catch (error: unknown) {
      console.error('Fehler beim Laden des Profils:', error);
      toast.error('Profil konnte nicht geladen werden');
    } finally {
      setProfilLoading(false);
    }
  }, [session]);

  // Porträtfoto des gewählten Benutzers authentifiziert laden und als Blob-URL
  // anzeigen (der Browser kann den privaten Objektspeicher nicht direkt aufrufen).
  useEffect(() => {
    let abgebrochen = false;
    let erzeugteUrl: string | null = null;

    const ladeFoto = async () => {
      if (!session || !profilUserId || !profil?.portraetPfad) {
        setProfilFotoUrl(null);
        return;
      }
      try {
        const token = getToken(session);
        const res = await fetch(`${API_BASE}/api/profil/benutzer/${profilUserId}/foto`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!abgebrochen) setProfilFotoUrl(null);
          return;
        }
        const blob = await res.blob();
        if (abgebrochen) return;
        erzeugteUrl = URL.createObjectURL(blob);
        setProfilFotoUrl(erzeugteUrl);
      } catch {
        if (!abgebrochen) setProfilFotoUrl(null);
      }
    };

    ladeFoto();

    return () => {
      abgebrochen = true;
      if (erzeugteUrl) URL.revokeObjectURL(erzeugteUrl);
    };
  }, [session, profilUserId, profil?.portraetPfad]);

  const handleCreateDriver = async () => {
    if (!driverForm.title.trim() || !driverForm.circleId) {
      toast.error('Titel und Kreis sind erforderlich');
      return;
    }
    setDriverSaving(true);
    try {
      // Spannung über OData anlegen
      await apiClient.post('/odata/Drivers', driverForm, session);
      toast.success('Spannung erstellt');
      setDriverDialogOpen(false);
      setDriverForm({ title: '', description: '', priority: 'MITTEL', circleId: '' });
      loadDrivers();
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? (error.message || 'Fehler beim Erstellen') : 'Fehler beim Erstellen der Spannung';
      toast.error(msg);
    } finally {
      setDriverSaving(false);
    }
  };

  const handleStatusChange = async (driverId: string, newStatus: string) => {
    try {
      // Status der Spannung über OData aktualisieren
      await apiClient.patch(`/odata/Drivers(${driverId})`, { status: newStatus }, session);
      toast.success('Status aktualisiert');
      loadDrivers();
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? (error.message || 'Fehler beim Aktualisieren') : 'Fehler beim Aktualisieren';
      toast.error(msg);
    }
  };

  // Benutzer-Filterung (Name oder E-Mail)
  const filteredUsers = users.filter(u => {
    if (!userSearch) return true;
    const s = userSearch.toLowerCase();
    return (
      (u.name ?? '').toLowerCase().includes(s) ||
      (u.email ?? '').toLowerCase().includes(s)
    );
  });

  // Circle filtering & stats
  const filteredCircles = circles.filter(c => {
    if (!circleSearch) return true;
    const s = circleSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      (c.verantwortlichkeit && c.verantwortlichkeit.toLowerCase().includes(s)) ||
      (c.purpose && c.purpose.toLowerCase().includes(s))
    );
  });

  // ---- Baumstruktur (Kreise / Subkreise) ----
  const childrenByParent = useMemo(() => {
    const map = new Map<string, CircleListItem[]>();
    for (const c of circles) {
      const pid = c.parent?.id;
      if (pid) {
        const arr = map.get(pid);
        if (arr) arr.push(c);
        else map.set(pid, [c]);
      }
    }
    return map;
  }, [circles]);

  // Wurzelkreise: ohne Elternkreis oder dessen Elternkreis ist nicht (aktiv) vorhanden
  const rootCircles = useMemo(
    () => circles.filter(c => !c.parent?.id || !circles.some(x => x.id === c.parent!.id)),
    [circles]
  );

  // IDs aller Kreise mit Subkreisen (auf-/zuklappbar)
  const expandableIds = useMemo(
    () => circles.filter(c => (childrenByParent.get(c.id)?.length ?? 0) > 0).map(c => c.id),
    [circles, childrenByParent]
  );
  const allExpanded = expandableIds.length > 0 && expandableIds.every(id => expanded.has(id));

  const toggleNode = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setExpanded(allExpanded ? new Set() : new Set(expandableIds));

  // Sammelt (client-seitig) die IDs aller Nachfahren eines Kreises – wird
  // genutzt, um in der Ziel-Auswahl den Kreis selbst und seine Subkreise
  // auszuschliessen (verhindert Zyklen).
  const sammleNachfahren = useCallback((wurzelId: string): Set<string> => {
    const ergebnis = new Set<string>();
    const stapel = [wurzelId];
    while (stapel.length > 0) {
      const aktuell = stapel.pop()!;
      for (const kind of childrenByParent.get(aktuell) ?? []) {
        if (!ergebnis.has(kind.id)) {
          ergebnis.add(kind.id);
          stapel.push(kind.id);
        }
      }
    }
    return ergebnis;
  }, [childrenByParent]);

  // Öffnet den Verschieben-Dialog für einen Kreis.
  const openMove = (circle: CircleListItem) => {
    setMoveCircle({ id: circle.id, name: circle.name, hasParent: !!circle.parent?.id });
    setMoveTargetId('');
  };

  // Hängt den ausgewählten Kreis an den gewählten Ziel-Kreis an.
  const handleAttach = async () => {
    if (!moveCircle || !moveTargetId) {
      toast.error('Bitte einen Ziel-Kreis auswählen');
      return;
    }
    setMoving(true);
    try {
      await apiClient.post(`/api/circles/${moveCircle.id}/anhaengen`, { zielKreisId: moveTargetId }, session);
      toast.success('Kreis wurde angehängt');
      setMoveCircle(null);
      setMoveTargetId('');
      await loadCircles();
    } catch (error: unknown) {
      console.error('Fehler beim Anhängen des Kreises:', error);
      const msg = error instanceof ApiError ? (error.message || 'Fehler beim Anhängen') : 'Fehler beim Anhängen des Kreises';
      toast.error(msg);
    } finally {
      setMoving(false);
    }
  };

  // Löst einen Subkreis aus seiner Hierarchie und macht ihn zum Root-Kreis.
  const handleDetach = async (circle: { id: string; name: string }) => {
    if (!window.confirm(`"${circle.name}" aus der Hierarchie lösen und als eigenständigen Root-Kreis führen? Alle Subkreise bleiben unter diesem Kreis erhalten.`)) {
      return;
    }
    try {
      await apiClient.post(`/api/circles/${circle.id}/loesen`, {}, session);
      toast.success('Kreis wurde als Root-Kreis gelöst');
      await loadCircles();
    } catch (error: unknown) {
      console.error('Fehler beim Lösen des Kreises:', error);
      const msg = error instanceof ApiError ? (error.message || 'Fehler beim Lösen') : 'Fehler beim Lösen des Kreises';
      toast.error(msg);
    }
  };

  // Karteninhalt eines Kreises (wiederverwendet in Baum- und Suchansicht)
  const circleCardInner = (circle: CircleListItem, showParentBadge: boolean) => {
    // Anzahl Subkreise aus der client-seitig aufgebauten Map (circle.children ist immer [])
    const subCount = childrenByParent.get(circle.id)?.length ?? 0;
    return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <CircleDot className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold truncate">{circle.name}</h3>
                {showParentBadge && circle.parent && (
                  <Badge variant="outline" className="text-xs">↳ {circle.parent.name}</Badge>
                )}
                {subCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {subCount} Subkreis{subCount !== 1 ? 'e' : ''}
                  </Badge>
                )}
              </div>
              {circle.purpose && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">Zweck: {stripHtml(circle.purpose)}</p>
              )}
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {circle._count.roles} Rollen</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {circle._count.s3Meetings} Meetings</span>
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {circle._count.drivers} Spannungen</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {circle._count.decisions} Entscheid.</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 hover:text-blue-900 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800 dark:hover:bg-blue-900/50"
              title="Alle Mitglieder inkl. Rollen dieses Kreises anzeigen"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openMembers({ id: circle.id, name: circle.name }); }}
            >
              <UsersRound className="h-4 w-4 mr-2" />
              Mitglieder &amp; Rollen
            </Button>
            {canUpdateCircle && (
              <Button
                variant="outline"
                size="sm"
                title="Diesen Kreis an einen anderen Kreis anhängen (wird danach als Subkreis geführt)"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); openMove(circle); }}
              >
                <Network className="h-4 w-4 mr-2" />
                Anhängen
              </Button>
            )}
            {canUpdateCircle && circle.parent && (
              <Button
                variant="outline"
                size="sm"
                title="Diesen Subkreis aus der Hierarchie lösen und als eigenständigen Root-Kreis führen"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDetach({ id: circle.id, name: circle.name }); }}
              >
                Lösen
              </Button>
            )}
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
    );
  };

  // Rekursive Darstellung eines Kreises inkl. Subkreisen
  const renderCircleNode = (circle: CircleListItem, depth: number): JSX.Element => {
    const kids = childrenByParent.get(circle.id) ?? [];
    const hasKids = kids.length > 0;
    const isOpen = expanded.has(circle.id);
    return (
      <div key={circle.id} className="space-y-3">
        <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 1.5}rem` }}>
          {hasKids ? (
            <button
              type="button"
              onClick={() => toggleNode(circle.id)}
              className="p-1 rounded hover:bg-muted text-muted-foreground flex-shrink-0"
              aria-label={isOpen ? 'Subkreise einklappen' : 'Subkreise ausklappen'}
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-6 flex-shrink-0" />
          )}
          <Link href={`/organisation/kreise/${circle.id}`} className="flex-1 min-w-0">
            {circleCardInner(circle, false)}
          </Link>
        </div>
        {hasKids && isOpen && (
          <div className="space-y-3">
            {kids.map(k => renderCircleNode(k, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const totalMembers = new Set(
    circles.flatMap(c => c.roles.flatMap(r => r.assignments.map(a => a.user.id)))
  ).size;
  const totalMeetings = circles.reduce((sum, c) => sum + c._count.s3Meetings, 0);
  const totalDecisions = circles.reduce((sum, c) => sum + c._count.decisions, 0);

  // Driver filtering
  const filteredDrivers = drivers.filter(d => {
    if (driverStatusFilter !== 'all' && d.status !== driverStatusFilter) return false;
    if (driverPriorityFilter !== 'all' && d.priority !== driverPriorityFilter) return false;
    if (driverSearch) {
      const s = driverSearch.toLowerCase();
      return (
        d.title.toLowerCase().includes(s) ||
        (d.description && d.description.toLowerCase().includes(s)) ||
        d.circle.name.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const openDrivers = drivers.filter(d => d.status !== 'ERLEDIGT').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Organisation</h1>
          <p className="text-muted-foreground">Soziokratie 3.0 — Kreise, Rollen & Governance</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'circles' && canCreateCircle && (
            <Link href="/organisation/kreise/neu">
              <Button><Plus className="h-4 w-4 mr-2" />Neuer Kreis</Button>
            </Link>
          )}
          {activeTab === 'drivers' && hasPermission(role, 'org:driver:create') && (
            <Dialog open={driverDialogOpen} onOpenChange={setDriverDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Neue Spannung</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Neue Spannung erfassen</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Titel *</Label>
                    <Input
                      value={driverForm.title}
                      onChange={e => setDriverForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Was ist die Spannung?"
                    />
                  </div>
                  <div>
                    <Label>Beschreibung</Label>
                    <Textarea
                      value={driverForm.description}
                      onChange={e => setDriverForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Detaillierte Beschreibung…"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Kreis *</Label>
                    <Select value={driverForm.circleId} onValueChange={v => setDriverForm(f => ({ ...f, circleId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Kreis wählen" /></SelectTrigger>
                      <SelectContent>
                        {circles.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priorität</Label>
                    <Select value={driverForm.priority} onValueChange={v => setDriverForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NIEDRIG">Niedrig</SelectItem>
                        <SelectItem value="MITTEL">Mittel</SelectItem>
                        <SelectItem value="HOCH">Hoch</SelectItem>
                        <SelectItem value="DRINGEND">Dringend</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateDriver} disabled={driverSaving} className="w-full">
                    {driverSaving ? 'Erstelle…' : 'Spannung erstellen'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => router.push('/organisation')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'circles'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
          }`}
        >
          <span className="flex items-center gap-2">
            <CircleDot className="h-4 w-4" />
            Kreise
            <Badge variant="secondary" className="ml-1 text-xs">{circles.length}</Badge>
          </span>
        </button>
        <button
          onClick={() => router.push('/organisation?tab=drivers')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'drivers'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
          }`}
        >
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Spannungen
            {openDrivers > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{openDrivers} offen</Badge>
            )}
          </span>
        </button>
        <button
          onClick={() => router.push('/organisation?tab=review')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'review'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
          }`}
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Review-Bedarf
            {reviewLoaded && reviewCircles.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{reviewCircles.length}</Badge>
            )}
          </span>
        </button>
      </div>

      {/* ============================================================ */}
      {/*  TAB: Kreise                                                  */}
      {/* ============================================================ */}
      {activeTab === 'circles' && (
        <>
          {/* Statistik-Karten */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg"><CircleDot className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{circles.length}</p>
                    <p className="text-xs text-muted-foreground">Kreise</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg"><Users className="h-5 w-5 text-blue-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{totalMembers}</p>
                    <p className="text-xs text-muted-foreground">Mitglieder</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg"><Calendar className="h-5 w-5 text-orange-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{totalMeetings}</p>
                    <p className="text-xs text-muted-foreground">Meetings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{totalDecisions}</p>
                    <p className="text-xs text-muted-foreground">Entscheidungen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Such-Modus-Umschalter (Kreise / Benutzer) */}
          <div className="inline-flex rounded-lg border p-1 bg-muted/40 w-fit">
            <button
              type="button"
              onClick={() => setSearchMode('circles')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${
                searchMode === 'circles'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CircleDot className="h-4 w-4" />
              Kreise
            </button>
            <button
              type="button"
              onClick={() => setSearchMode('users')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-colors ${
                searchMode === 'users'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserCircle className="h-4 w-4" />
              Benutzer
            </button>
          </div>

          {/* Suchfeld + Organisation-Schalter */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              {searchMode === 'circles' ? (
                <Input
                  placeholder="Kreise suchen…"
                  value={circleSearch}
                  onChange={(e) => setCircleSearch(e.target.value)}
                  className="pl-10"
                />
              ) : (
                <Input
                  placeholder="Benutzer suchen (Name oder E-Mail)…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10"
                />
              )}
            </div>
            {searchMode === 'circles' && !circleSearch && expandableIds.length > 0 && (
              <Button
                variant="outline"
                onClick={toggleAll}
                title="Gesamte Organisationsstruktur auf- oder zuklappen"
                className="flex-shrink-0 bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 hover:text-blue-900 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800 dark:hover:bg-blue-900/50"
              >
                <Network className="h-4 w-4 mr-2" />
                Gesamte Organisationsstruktur
                {allExpanded ? <ChevronDown className="h-4 w-4 ml-2" /> : <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>
            )}
          </div>

          {searchMode === 'circles' && (circlesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredCircles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CircleDot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {circleSearch ? 'Keine Kreise gefunden' : 'Noch keine Kreise vorhanden'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {circleSearch ? 'Versuchen Sie einen anderen Suchbegriff.' : 'Erstellen Sie den ersten Kreis Ihrer Organisation.'}
                </p>
                {!circleSearch && canCreateCircle && (
                  <Link href="/organisation/kreise/neu">
                    <Button><Plus className="h-4 w-4 mr-2" />Kreis erstellen</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {circleSearch
                ? filteredCircles.map((circle, idx) => (
                    <motion.div
                      key={circle.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <Link href={`/organisation/kreise/${circle.id}`}>
                        {circleCardInner(circle, true)}
                      </Link>
                    </motion.div>
                  ))
                : rootCircles.map(circle => renderCircleNode(circle, 0))}
            </div>
          ))}

          {/* ---- Benutzer-Suchergebnisse ---- */}
          {searchMode === 'users' && (usersLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <UserCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {userSearch ? 'Keine Benutzer gefunden' : 'Keine Benutzer vorhanden'}
                </h3>
                <p className="text-muted-foreground">
                  {userSearch
                    ? 'Versuchen Sie einen anderen Suchbegriff (Name oder E-Mail).'
                    : 'Es sind noch keine Benutzer erfasst.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredUsers.map((u, idx) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <Card
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openProfil(u.id)}
                    title="Profil anzeigen"
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          u.aktiv ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {(u.name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold truncate ${!u.aktiv ? 'text-muted-foreground' : ''}`}>{u.name}</p>
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {u.email}
                          </p>
                        </div>
                        {!u.aktiv && (
                          <Badge variant="secondary" className="bg-red-100 text-red-700 flex-shrink-0">Inaktiv</Badge>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ))}
        </>
      )}

      {/* ============================================================ */}
      {/*  TAB: Spannungen (Drivers)                                    */}
      {/* ============================================================ */}
      {activeTab === 'drivers' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg"><Zap className="h-5 w-5 text-orange-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{drivers.length}</p>
                    <p className="text-xs text-muted-foreground">Total Spannungen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg"><AlertTriangle className="h-5 w-5 text-blue-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{drivers.filter(d => d.status === 'OFFEN').length}</p>
                    <p className="text-xs text-muted-foreground">Offen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg"><Zap className="h-5 w-5 text-amber-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{drivers.filter(d => d.status === 'IN_BEARBEITUNG').length}</p>
                    <p className="text-xs text-muted-foreground">In Bearbeitung</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{drivers.filter(d => d.status === 'ERLEDIGT').length}</p>
                    <p className="text-xs text-muted-foreground">Erledigt</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Spannungen suchen…"
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={driverStatusFilter} onValueChange={setDriverStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="OFFEN">Offen</SelectItem>
                <SelectItem value="IN_BEARBEITUNG">In Bearbeitung</SelectItem>
                <SelectItem value="ERLEDIGT">Erledigt</SelectItem>
              </SelectContent>
            </Select>
            <Select value={driverPriorityFilter} onValueChange={setDriverPriorityFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Priorität" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Prioritäten</SelectItem>
                <SelectItem value="DRINGEND">Dringend</SelectItem>
                <SelectItem value="HOCH">Hoch</SelectItem>
                <SelectItem value="MITTEL">Mittel</SelectItem>
                <SelectItem value="NIEDRIG">Niedrig</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Drivers list */}
          {driversLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredDrivers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {driverSearch || driverStatusFilter !== 'all' || driverPriorityFilter !== 'all'
                    ? 'Keine Spannungen gefunden'
                    : 'Noch keine Spannungen vorhanden'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {driverSearch || driverStatusFilter !== 'all' || driverPriorityFilter !== 'all'
                    ? 'Passen Sie die Filter an.'
                    : 'Spannungen werden in den Kreisen erfasst oder über den Button oben.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredDrivers.map((driver, idx) => {
                const prio = PRIORITY_CONFIG[driver.priority] || PRIORITY_CONFIG.MITTEL;
                const stat = STATUS_CONFIG[driver.status] || STATUS_CONFIG.OFFEN;
                return (
                  <motion.div
                    key={driver.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <Link href={`/organisation/spannungen/${driver.id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="p-2 rounded-lg bg-orange-500/10 mt-0.5">
                                <Zap className="h-4 w-4 text-orange-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold">{driver.title}</h3>
                                  <Badge className={`text-xs ${prio.color}`}>{prio.label}</Badge>
                                  <Badge className={`text-xs ${stat.color}`}>{stat.label}</Badge>
                                  {driver.workItems && driver.workItems.length > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {driver.workItems.filter(w => w.status === 'ERLEDIGT').length}/{driver.workItems.length} WI
                                    </Badge>
                                  )}
                                </div>
                                {driver.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{driver.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  <span
                                    className="flex items-center gap-1 hover:text-primary transition-colors"
                                    onClick={e => { e.preventDefault(); e.stopPropagation(); router.push(`/organisation/kreise/${driver.circle.id}?tab=drivers`); }}
                                  >
                                    <CircleDot className="h-3 w-3" /> {driver.circle.name}
                                  </span>
                                  <span>von {driver.creator.name}</span>
                                  <span>{new Date(driver.createdAt).toLocaleDateString('de-CH')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Status quick-actions */}
                              {hasPermission(role, 'org:driver:update') && driver.status !== 'ERLEDIGT' && (
                                <div className="flex gap-1" onClick={e => e.preventDefault()}>
                                  {driver.status === 'OFFEN' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={e => { e.stopPropagation(); handleStatusChange(driver.id, 'IN_BEARBEITUNG'); }}
                                      title="In Bearbeitung setzen"
                                    >
                                      Bearbeiten
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={e => { e.stopPropagation(); handleStatusChange(driver.id, 'ERLEDIGT'); }}
                                    title="Als erledigt markieren"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    Erledigt
                                  </Button>
                                </div>
                              )}
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/*  TAB: Review-Bedarf                                          */}
      {/* ============================================================ */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          {reviewLoading ? (
            <div className="text-center py-12 text-muted-foreground">Lade Review-Daten…</div>
          ) : reviewCircles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Kein Kreis hat aktuell Review-Bedarf.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {reviewCircles.map((circle) => (
                    <Link
                      key={circle.id}
                      href={`/organisation/kreise/${circle.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CircleDot className="h-4 w-4 text-[#3e8f88]" />
                        <div>
                          <p className="font-medium text-sm">{circle.name}</p>
                          <p className="text-xs text-muted-foreground">Phase: {circle.lifecyclePhase}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {circle.nextReviewDate ? (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(circle.nextReviewDate)}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">Kein Review-Datum</Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modales Fenster: Kreis an einen anderen Kreis anhängen */}
      <Dialog open={!!moveCircle} onOpenChange={(o) => { if (!o) { setMoveCircle(null); setMoveTargetId(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              Kreis anhängen{moveCircle ? ` – ${moveCircle.name}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Der Kreis <strong>{moveCircle?.name}</strong> wird an den ausgewählten Ziel-Kreis angehängt und danach
              als Subkreis geführt. Vorhandene Subkreise dieses Kreises bleiben erhalten und werden mit verschoben.
            </p>
            <div>
              <Label>Ziel-Kreis *</Label>
              <Select value={moveTargetId} onValueChange={setMoveTargetId}>
                <SelectTrigger><SelectValue placeholder="Ziel-Kreis wählen" /></SelectTrigger>
                <SelectContent>
                  {(() => {
                    if (!moveCircle) return null;
                    // Kreis selbst und alle seine Nachfahren als Ziel ausschliessen (verhindert Zyklen).
                    const ausgeschlossen = sammleNachfahren(moveCircle.id);
                    ausgeschlossen.add(moveCircle.id);
                    // Aktuellen Elternkreis ebenfalls ausschliessen (keine Änderung).
                    const aktuellerParent = circles.find(c => c.id === moveCircle.id)?.parent?.id;
                    const optionen = circles
                      .filter(c => !ausgeschlossen.has(c.id) && c.id !== aktuellerParent)
                      .sort((a, b) => {
                        // Root-Kreise zuerst, dann alphabetisch.
                        const aRoot = !a.parent?.id ? 0 : 1;
                        const bRoot = !b.parent?.id ? 0 : 1;
                        if (aRoot !== bRoot) return aRoot - bRoot;
                        return a.name.localeCompare(b.name);
                      });
                    if (optionen.length === 0) {
                      return <div className="px-2 py-1.5 text-sm text-muted-foreground">Kein gültiger Ziel-Kreis verfügbar</div>;
                    }
                    return optionen.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{!c.parent?.id ? ' (Root-Kreis)' : ''}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between gap-3">
              {moveCircle?.hasParent ? (
                <Button
                  variant="outline"
                  onClick={() => { const c = moveCircle; setMoveCircle(null); if (c) handleDetach({ id: c.id, name: c.name }); }}
                >
                  Als Root-Kreis lösen
                </Button>
              ) : <span />}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setMoveCircle(null); setMoveTargetId(''); }}>Abbrechen</Button>
                <Button onClick={handleAttach} disabled={moving || !moveTargetId}>
                  <Network className="h-4 w-4 mr-2" />{moving ? 'Anhängen…' : 'Anhängen'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modales Fenster: Alle Mitglieder inkl. Rollen eines Kreises */}
      <Dialog open={!!membersDialogCircle} onOpenChange={(o) => { if (!o) setMembersDialogCircle(null); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-blue-600" />
              Mitglieder &amp; Rollen{membersDialogCircle ? ` – ${membersDialogCircle.name}` : ''}
            </DialogTitle>
          </DialogHeader>

          {membersLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (() => {
            // Mitglieder aus den Rollen-Zuweisungen aufbauen (nach Benutzer gruppiert)
            const memberMap = new Map<string, { id: string; name: string; email?: string; telefon?: string; roles: { roleId: string; name: string; isCoordinator: boolean; isRepresentative: boolean; isFacilitator: boolean }[] }>();
            for (const r of membersRoles) {
              const roleName = (r.rollenDefinition?.name ?? 'Rolle') as string;
              const flags = { isCoordinator: !!r.isCoordinator, isRepresentative: !!r.isRepresentative, isFacilitator: !!r.isFacilitator };
              const assignments = Array.isArray(r.assignments) ? r.assignments : [];
              for (const a of assignments) {
                if (!a?.user) continue;
                const key = a.user.id as string;
                if (!memberMap.has(key)) {
                  memberMap.set(key, { id: key, name: (a.user.name ?? 'Unbenannt') as string, email: a.user.email as string | undefined, telefon: a.user.telefon as string | undefined, roles: [] });
                }
                memberMap.get(key)!.roles.push({ roleId: r.id as string, name: roleName, ...flags });
              }
            }
            const members = Array.from(memberMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            const roleCount = membersRoles.length;

            if (roleCount === 0) {
              return (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Für diesen Kreis wurden noch keine Rollen angelegt.
                </div>
              );
            }
            if (members.length === 0) {
              return (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Es sind noch keine Mitglieder zu den Rollen dieses Kreises zugewiesen.
                </div>
              );
            }
            return (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {members.length} Mitglied{members.length !== 1 ? 'er' : ''} · {roleCount} Rolle{roleCount !== 1 ? 'n' : ''}
                </p>
                {members.map((m, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <MemberAvatar userId={m.id} name={m.name} size={80} />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{m.name}</p>
                        {m.email && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            {m.email}
                          </p>
                        )}
                        {m.telefon && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            {m.telefon}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-11">
                      {m.roles.map((r, j) => (
                        <Badge key={j} variant="secondary" className="text-xs flex items-center gap-1 pr-1">
                          {r.isCoordinator && <Crown className="h-3 w-3" />}
                          {r.isRepresentative && <Handshake className="h-3 w-3" />}
                          {r.isFacilitator && <Gavel className="h-3 w-3" />}
                          {r.name}
                          {hasPermission(role, 'org:role:unassign') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  type="button"
                                  className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background/80 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                                  aria-label={`${m.name} von Rolle „${r.name}“ entfernen`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Zuweisung entfernen?</AlertDialogTitle>
                                  <AlertDialogDescription>{m.name} von Rolle &quot;{r.name}&quot; entfernen?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleUnassignFromDialog(r.roleId, m.id)}>Entfernen</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Modales Fenster: Profil des gefundenen Benutzers */}
      <Dialog open={!!profilUserId} onOpenChange={(o) => { if (!o) { setProfilUserId(null); setProfil(null); } }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-blue-600" />
              Profil
            </DialogTitle>
          </DialogHeader>

          {profilLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !profil ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Das Profil konnte nicht geladen werden.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Porträtfoto + Name + E-Mail */}
              <div className="flex flex-col items-center gap-3">
                <div className="h-32 w-32 rounded-full overflow-hidden border bg-muted flex items-center justify-center">
                  {profilFotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profilFotoUrl} alt={profil.name} className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle className="h-16 w-16 text-muted-foreground" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{profil.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {profil.email}
                  </p>
                </div>
              </div>

              {/* Kreis-Zugehörigkeit */}
              <div>
                <p className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" /> Kreis-Zugehörigkeit
                </p>
                {profil.kreise.length > 0 ? (
                  <ul className="divide-y rounded-lg border">
                    {profil.kreise.map((k, i) => (
                      <li key={i} className="flex flex-col gap-0.5 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-medium">{k.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Lead-Link: {k.leadLink || 'nicht zugewiesen'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Dieser Benutzer ist derzeit keinem Kreis zugeordnet.
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
