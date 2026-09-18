'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { UserCog, Plus, Search, Shield, Mail, UserCheck, UserX, Link2, Pencil, Trash2 } from 'lucide-react';
import { hasPermission, getRoleLabel } from '@/lib/rbac';
import { apiClient } from '@/lib/api-client';

interface UserEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  aktiv: boolean;
  createdAt: string;
}

interface BenutzerRolleOption {
  id: string;
  name: string;
}

// Farbpalette für Rollen-Badges. Für Rollen, die hier nicht gelistet sind,
// wird eine neutrale Standardfarbe verwendet (siehe roleBadgeClass).
const roleColors: Record<string, string> = {
  Admin: 'bg-red-100 text-red-800',
  User: 'bg-blue-100 text-blue-800',
};

function roleBadgeClass(role: string): string {
  return roleColors[role] ?? 'bg-gray-100 text-gray-800';
}

export default function BenutzerPage() {
  const { data: session } = useSession() || {};
  const role = (session?.user as any)?.role;
  const currentUserId = (session?.user as any)?.id;
  const { toast } = useToast();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [rollen, setRollen] = useState<BenutzerRolleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRolle, setFilterRolle] = useState('alle');
  const [filterAktiv, setFilterAktiv] = useState('alle');

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!session) return;
    // OData: Benutzerliste laden. Der Server paginiert (PageSize = 100), daher
    // MUSS über alle Seiten (@odata.nextLink) geladen werden – sonst fehlen ab
    // dem 101. Datensatz Benutzer in Liste, Suche und Auswahl (Finding UI-16).
    apiClient.getAllPages<UserEntry>('/odata/Users?$orderby=Name', session)
      .then(data => setUsers(data))
      .catch(() => {})
      .finally(() => setLoading(false));
    // Rollen für den Filter dynamisch aus dem Katalog laden – keine hartkodierten Rollen mehr.
    apiClient.getAllPages<BenutzerRolleOption>(
      '/odata/BenutzerRollen?$filter=aktiv eq true&$orderby=sortOrder,name', session)
      .then(data => setRollen(data))
      .catch(() => {});
  }, [session]);

  // UI-29 (P005): Deaktivierung als PATCH (aktiv=false) statt destruktivem DELETE.
  // Echtes Löschen bleibt als separate Admin-Funktion vorbehalten (Phase 4).
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // OData PATCH: Benutzer auf inaktiv setzen (Login nicht mehr möglich, Daten bleiben erhalten).
      await apiClient.patch(`/odata/Users(${deleteTarget.id})`, { aktiv: false }, session);
      // Liste aktualisieren: Benutzer als inaktiv markieren.
      setUsers(prev => prev.map(u => u.id === deleteTarget.id ? { ...u, aktiv: false } : u));
      toast({ title: 'Deaktiviert', description: 'Benutzer wurde deaktiviert und kann sich nicht mehr anmelden.' });
    } catch {
      toast({ title: 'Fehler', description: 'Benutzer konnte nicht deaktiviert werden.', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase());
    const matchRolle = filterRolle === 'alle' || u.role === filterRolle;
    const matchAktiv = filterAktiv === 'alle' ||
      (filterAktiv === 'aktiv' && u.aktiv) ||
      (filterAktiv === 'inaktiv' && !u.aktiv);
    return matchSearch && matchRolle && matchAktiv;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-7 w-7 text-primary" />
            Benutzerverwaltung
          </h1>
          <p className="text-muted-foreground mt-1">
            {users.length} Benutzer insgesamt · {users.filter(u => u.aktiv).length} aktiv
          </p>
        </div>
        {hasPermission(role, 'user:create') && (
          <Link href="/benutzer/neu">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neuer Benutzer
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Name oder E-Mail suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterRolle} onValueChange={setFilterRolle}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Rolle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Rollen</SelectItem>
                {rollen.map((r) => (
                  <SelectItem key={r.id} value={r.name}>{getRoleLabel(r.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAktiv} onValueChange={setFilterAktiv}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Status</SelectItem>
                <SelectItem value="aktiv">Aktiv</SelectItem>
                <SelectItem value="inaktiv">Inaktiv</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium text-sm">Benutzer</th>
                  <th className="text-left p-4 font-medium text-sm hidden md:table-cell">Rolle</th>
                  <th className="text-left p-4 font-medium text-sm hidden sm:table-cell">Status</th>
                  <th className="text-left p-4 font-medium text-sm hidden xl:table-cell">Erstellt</th>
                  <th className="text-left p-4 font-medium text-sm">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Keine Benutzer gefunden
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            u.aktiv ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {(u.name ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className={`font-medium ${!u.aktiv ? 'text-muted-foreground' : ''}`}>{u.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />{u.email}
                            </p>
                            <div className="md:hidden mt-1">
                              <Badge className={roleBadgeClass(u.role)} variant="secondary">
                                {getRoleLabel(u.role)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <Badge className={roleBadgeClass(u.role)} variant="secondary">
                          <Shield className="mr-1 h-3 w-3" />{getRoleLabel(u.role)}
                        </Badge>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        {u.aktiv ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">Aktiv</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-700">Inaktiv</Badge>
                        )}
                      </td>
                      <td className="p-4 hidden xl:table-cell">
                        <div className="text-xs text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString('de-CH')}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Link href={`/benutzer/${u.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Bearbeiten">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          {hasPermission(role, 'user:delete') && u.id !== currentUserId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Löschen"
                              onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer deaktivieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie <strong>{deleteTarget?.name}</strong> deaktivieren?
              Das Benutzerkonto bleibt erhalten, kann sich aber nicht mehr anmelden. Zugehörige Datensätze
              (Rollen, Historie) bleiben unverändert. Eine Reaktivierung ist durch Bearbeiten möglich.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Wird deaktiviert...' : 'Deaktivieren'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}