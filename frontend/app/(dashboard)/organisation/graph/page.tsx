'use client';

/* ==========================================================================
 * Organigramm (V2.0.6.2)
 * --------------------------------------------------------------------------
 * Die frühere grafische (SVG-)Darstellung wurde ersetzt. Das Organigramm zeigt
 * die Organisation als ausgeklappte Struktur – eine reine ANSICHT (ohne
 * Bearbeitungsmöglichkeit), im gleichen Stil wie die Kreise-Übersicht inkl.
 * Dashboard (Statistik-Karten).
 *
 * NEU (V2.0.6.2): Direkt unter dem Dashboard steht – wie in der Organisation –
 * eine Suche mit Umschalter "Kreise / Benutzer":
 *   - Kreise:  filtert die angezeigten Kreise nach Name/Zweck (nur Ansicht).
 *   - Benutzer: sucht nach Name/E-Mail; ein Klick öffnet das Profil (Foto,
 *               E-Mail, Kreis-Zugehörigkeit) – ebenfalls nur zur Ansicht.
 *
 * Die ursprüngliche grafische Darstellung ist als Backup gesichert unter:
 *   frontend/backup/organigramm/page.grafik.tsx.bak
 *
 * Datenquelle: GET /api/org/graph (Kreise inkl. Rollen und Zuweisungen sowie
 * parentId für die Hierarchie); Benutzerliste über /api/profil/benutzer; Profil über
 * /api/profil/benutzer/{id}. Es werden KEINE Bearbeitungs-Aktionen angeboten.
 * ========================================================================== */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiClient, getToken } from '@/lib/api-client';
import { MemberAvatar } from '@/components/member-avatar';
import {
  CircleDot, Users, Zap, ChevronRight, ChevronDown, UsersRound, Crown, Handshake, Gavel,
  Network, Loader2, Eye, Layers, Search, UserCircle, Mail, Phone,
} from 'lucide-react';
import { motion } from 'framer-motion';

// Basis-URL der API (für authentifizierten Bild-Abruf des Porträtfotos).
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

/* ------------------------------------------------------------------ */
/*  Types (Format des Endpunkts /api/org/graph)                        */
/* ------------------------------------------------------------------ */

interface RoleAssignment {
  user: { id: string; name: string | null; email?: string | null; telefon?: string | null };
}

interface GraphRole {
  id: string;
  name: string;
  isCoordinator: boolean;
  isRepresentative: boolean;
  isFacilitator: boolean;
  isLeadLink?: boolean;
  assignments: RoleAssignment[];
}

interface GraphCircle {
  id: string;
  name: string;
  purpose: string | null;
  parentId: string | null;
  roles: GraphRole[];
}

// Benutzer-Suche in der Organisation
interface OrgUser {
  id: string;
  name: string;
  email: string;
  aktiv: boolean;
}

// Profil eines gefundenen Benutzers (nur lesend), inkl. Kreis-Zugehörigkeit.
interface ProfilAnzeige {
  name: string;
  email: string;
  portraetPfad: string | null;
  kreise: { name: string; leadLink: string | null }[];
}

/* ------------------------------------------------------------------ */
/*  Hilfsfunktionen                                                    */
/* ------------------------------------------------------------------ */

// Anzahl unterschiedlicher Mitglieder (Benutzer) über die Rollen eines Kreises.
function memberCount(circle: GraphCircle): number {
  const ids = new Set<string>();
  for (const r of circle.roles) {
    for (const a of r.assignments) {
      if (a?.user?.id) ids.add(a.user.id);
    }
  }
  return ids.size;
}

/* ================================================================== */
/*  Seite                                                             */
/* ================================================================== */

export default function OrganigrammPage() {
  const { data: session } = useSession() || {};

  const [circles, setCircles] = useState<GraphCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal: Mitglieder & Rollen eines Kreises (nur Ansicht)
  const [membersDialogCircle, setMembersDialogCircle] = useState<GraphCircle | null>(null);

  // Such-Modus: nach Kreisen oder nach Benutzern suchen (wie in der Organisation).
  const [searchMode, setSearchMode] = useState<'circles' | 'users'>('circles');
  const [circleSearch, setCircleSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Benutzer-Suche state
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);

  // Auf-/Zuklappzustand: IDs der zugeklappten Kreise (leeres Set = alles aufgeklappt).
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Profil-Dialog (Profil des gefundenen Benutzers)
  const [profilUserId, setProfilUserId] = useState<string | null>(null);
  const [profil, setProfil] = useState<ProfilAnzeige | null>(null);
  const [profilLoading, setProfilLoading] = useState(false);
  const [profilFotoUrl, setProfilFotoUrl] = useState<string | null>(null);

  // Organigramm-Daten laden (Kreise inkl. Rollen/Zuweisungen).
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.get<{ circles?: GraphCircle[] }>('/api/org/graph', session);
        if (!cancelled) {
          setCircles(data.circles ?? []);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  // Benutzerliste laden (für die Benutzer-Suche). Wird erst geladen, wenn der
  // Benutzer-Suchmodus zum ersten Mal aktiviert wird.
  const loadUsers = useCallback(async () => {
    if (!session) return;
    setUsersLoading(true);
    try {
      // Benutzerliste über den schlanken Profil-Endpunkt laden. Dieser ist nur
      // mit [Authorize] geschützt und daher auch für S3-Mitglieder ohne die
      // Berechtigung "user:read" (Benutzerverwaltung) verfügbar. Der frühere
      // Weg über /odata/Users erforderte "user:read" und lieferte für Mitglieder
      // und Lead-Links deshalb keine Daten (leere Suche).
      const data = await apiClient.get<OrgUser[]>('/api/profil/benutzer', session);
      setUsers(Array.isArray(data) ? data : []);
      setUsersLoaded(true);
    } catch (e: unknown) {
      console.error('Fehler beim Laden der Benutzer:', e);
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
      const data = await apiClient.get<ProfilAnzeige>(`/api/profil/benutzer/${userId}`, session);
      setProfil(data);
    } catch (e: unknown) {
      console.error('Fehler beim Laden des Profils:', e);
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

  // ---- Baumstruktur (Kreise / Subkreise) über parentId ----
  const childrenByParent = useMemo(() => {
    const map = new Map<string, GraphCircle[]>();
    for (const c of circles) {
      const pid = c.parentId;
      if (pid) {
        const arr = map.get(pid);
        if (arr) arr.push(c);
        else map.set(pid, [c]);
      }
    }
    // Innerhalb einer Ebene alphabetisch sortieren.
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [circles]);

  // Wurzelkreise: ohne Elternkreis oder dessen Elternkreis ist nicht vorhanden.
  const rootCircles = useMemo(
    () =>
      circles
        .filter(c => !c.parentId || !circles.some(x => x.id === c.parentId))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [circles]
  );

  // Menge aller Kreis-IDs, die mindestens einen Subkreis haben (für „Alles zuklappen").
  const circlesWithChildren = useMemo(
    () => new Set(circles.filter(c => childrenByParent.has(c.id)).map(c => c.id)),
    [circles, childrenByParent]
  );

  // Alle Kreise mit Kindern sind aufgeklappt, wenn collapsedIds leer ist.
  const allExpanded = collapsedIds.size === 0;
  const toggleAll = useCallback(
    () => setCollapsedIds(allExpanded ? new Set(circlesWithChildren) : new Set()),
    [allExpanded, circlesWithChildren]
  );

  // Gefilterte Kreise (Name oder Zweck) – für die Kreis-Suche.
  const filteredCircles = useMemo(() => {
    if (!circleSearch) return [];
    const s = circleSearch.toLowerCase();
    return circles
      .filter(c => c.name.toLowerCase().includes(s) || (c.purpose ?? '').toLowerCase().includes(s))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [circles, circleSearch]);

  // Gefilterte Benutzer (Name oder E-Mail).
  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const s = userSearch.toLowerCase();
    return users.filter(u => (u.name ?? '').toLowerCase().includes(s) || (u.email ?? '').toLowerCase().includes(s));
  }, [users, userSearch]);

  // ---- Dashboard-Kennzahlen ----
  const totalCircles = circles.length;
  const totalSubcircles = useMemo(
    () => circles.filter(c => c.parentId && circles.some(x => x.id === c.parentId)).length,
    [circles]
  );
  const totalRoles = useMemo(() => circles.reduce((s, c) => s + c.roles.length, 0), [circles]);
  const totalMembers = useMemo(() => {
    const ids = new Set<string>();
    for (const c of circles) {
      for (const r of c.roles) {
        for (const a of r.assignments) {
          if (a?.user?.id) ids.add(a.user.id);
        }
      }
    }
    return ids.size;
  }, [circles]);

  // Karteninhalt eines Kreises (nur Ansicht – kein Link in die Bearbeitung).
  const circleCard = (circle: GraphCircle) => {
    const subCount = childrenByParent.get(circle.id)?.length ?? 0;
    const roleCount = circle.roles.length;
    const mCount = memberCount(circle);
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="py-4">
          {/* UI-03-Fix: Auf schmalen Viewports rutscht die Aktion unter die
              Kreis-Angaben statt das Layout horizontal zu sprengen (die feste
              Button-Breite kollidierte zuvor mit min-w-0 der Namensspalte). */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <CircleDot className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{circle.name}</h3>
                  {subCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {subCount} Subkreis{subCount !== 1 ? 'e' : ''}
                    </Badge>
                  )}
                </div>
                {circle.purpose && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">Zweck: {circle.purpose}</p>
                )}
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {roleCount} Rolle{roleCount !== 1 ? 'n' : ''}</span>
                  <span className="flex items-center gap-1"><UsersRound className="h-3 w-3" /> {mCount} Mitglied{mCount !== 1 ? 'er' : ''}</span>
                </div>
              </div>
            </div>
            {roleCount > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 hover:text-blue-900 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800 dark:hover:bg-blue-900/50"
                  title="Alle Mitglieder inkl. Rollen dieses Kreises anzeigen (nur Ansicht)"
                  onClick={() => setMembersDialogCircle(circle)}
                >
                  <UsersRound className="h-4 w-4 mr-2" />
                  Mitglieder &amp; Rollen
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Rekursive Darstellung eines Kreises inkl. Subkreisen mit Auf-/Zuklapp-Toggle.
  const renderCircleNode = (circle: GraphCircle, depth: number): JSX.Element => {
    const kids = childrenByParent.get(circle.id) ?? [];
    const hasKids = kids.length > 0;
    const isCollapsed = collapsedIds.has(circle.id);
    // UI-03-Fix: Einzug pro Ebene begrenzen (max. 5 Ebenen sichtbar versetzt,
    // tiefere Ebenen bleiben auf demselben Einzug) statt unbegrenzt mit der
    // Tiefe zu wachsen - bei sechs und mehr Ebenen sprengte allein der Einzug
    // auf Telefonbreite bereits einen Grossteil der verfügbaren Breite.
    const indentSteps = Math.min(depth, 5);
    return (
      <div key={circle.id} className="space-y-3 min-w-0">
        <div style={{ paddingLeft: `${indentSteps}rem` }} className="flex items-start gap-1 min-w-0">
          {/* Toggle-Button: nur anzeigen, wenn Kinder vorhanden */}
          {hasKids ? (
            <button
              type="button"
              title={isCollapsed ? 'Aufklappen' : 'Zuklappen'}
              onClick={() =>
                setCollapsedIds(prev => {
                  const next = new Set(prev);
                  if (isCollapsed) next.delete(circle.id);
                  else next.add(circle.id);
                  return next;
                })
              }
              className="mt-[1.1rem] flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
            >
              {isCollapsed
                ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </button>
          ) : (
            /* Platzhalter, damit Blatt-Knoten bündig mit Toggle-Knoten fluchten */
            <span className="mt-[1.1rem] flex-shrink-0 w-6 inline-block" />
          )}
          <div className="flex-1 min-w-0">
            {circleCard(circle)}
          </div>
        </div>
        {/* Kinder nur rendern, wenn nicht zugeklappt */}
        {hasKids && !isCollapsed && (
          <div className="space-y-3 min-w-0">
            {kids.map(k => renderCircleNode(k, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Kopf */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-7 w-7 text-primary" />
            Organigramm
          </h1>
          <p className="text-muted-foreground">
            Ausgeklappte Organisationsstruktur – Kreise, Subkreise, Rollen &amp; Mitglieder
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <Eye className="h-3.5 w-3.5" /> Nur Ansicht
        </Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Organigramm wird geladen …
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Organigramm konnte nicht geladen werden</h3>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Dashboard (Statistik-Karten) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg"><CircleDot className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{totalCircles}</p>
                    <p className="text-xs text-muted-foreground">Kreise</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg"><Layers className="h-5 w-5 text-purple-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{totalSubcircles}</p>
                    <p className="text-xs text-muted-foreground">Subkreise</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg"><Zap className="h-5 w-5 text-orange-500" /></div>
                  <div>
                    <p className="text-2xl font-bold">{totalRoles}</p>
                    <p className="text-xs text-muted-foreground">Rollen</p>
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

          {/* Suchfeld + Organisationsstruktur-Schalter */}
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
            {searchMode === 'circles' && !circleSearch && circlesWithChildren.size > 0 && (
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

          {/* ---- Kreis-Ansicht (ausgeklappt) bzw. Kreis-Suchergebnisse ---- */}
          {searchMode === 'circles' && (
            rootCircles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CircleDot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Noch keine Kreise vorhanden</h3>
                  <p className="text-muted-foreground">
                    Sobald Kreise angelegt sind, wird hier die Organisationsstruktur angezeigt.
                  </p>
                </CardContent>
              </Card>
            ) : circleSearch ? (
              filteredCircles.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CircleDot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Keine Kreise gefunden</h3>
                    <p className="text-muted-foreground">Versuchen Sie einen anderen Suchbegriff.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredCircles.map((circle, idx) => (
                    <motion.div
                      key={circle.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      {circleCard(circle)}
                    </motion.div>
                  ))}
                </div>
              )
            ) : (
              <div className="grid gap-4">
                {rootCircles.map(circle => renderCircleNode(circle, 0))}
              </div>
            )
          )}

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

      {/* Modales Fenster: Alle Mitglieder inkl. Rollen eines Kreises (nur Ansicht) */}
      <Dialog open={!!membersDialogCircle} onOpenChange={(o) => { if (!o) setMembersDialogCircle(null); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-blue-600" />
              Mitglieder &amp; Rollen{membersDialogCircle ? ` – ${membersDialogCircle.name}` : ''}
            </DialogTitle>
          </DialogHeader>

          {(() => {
            if (!membersDialogCircle) return null;
            const roles = membersDialogCircle.roles ?? [];

            // Mitglieder aus den Rollen-Zuweisungen aufbauen (nach Benutzer gruppiert).
            const memberMap = new Map<string, { id: string; name: string; email?: string; telefon?: string; roles: { name: string; isCoordinator: boolean; isRepresentative: boolean; isFacilitator: boolean }[] }>();
            for (const r of roles) {
              const flags = { isCoordinator: !!r.isCoordinator, isRepresentative: !!r.isRepresentative, isFacilitator: !!r.isFacilitator };
              for (const a of r.assignments ?? []) {
                if (!a?.user?.id) continue;
                const key = a.user.id;
                if (!memberMap.has(key)) {
                  memberMap.set(key, { id: key, name: a.user.name ?? 'Unbenannt', email: a.user.email ?? undefined, telefon: a.user.telefon ?? undefined, roles: [] });
                }
                memberMap.get(key)!.roles.push({ name: r.name, ...flags });
              }
            }
            const members = Array.from(memberMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            const roleCount = roles.length;

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
                      <MemberAvatar userId={m.id} name={m.name} size={40} />
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
                      {m.roles.map((role, j) => (
                        <Badge key={j} variant="secondary" className="text-xs flex items-center gap-1">
                          {role.isCoordinator && <Crown className="h-3 w-3" />}
                          {role.isRepresentative && <Handshake className="h-3 w-3" />}
                          {role.isFacilitator && <Gavel className="h-3 w-3" />}
                          {role.name}
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

      {/* Modales Fenster: Profil eines gefundenen Benutzers (nur Ansicht) */}
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
