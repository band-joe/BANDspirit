'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { apiClient, getToken } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Save, RotateCcw, ChevronDown, ChevronRight, Lock, Search, Info, ArrowLeft } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Typen                                                              */
/* ------------------------------------------------------------------ */

interface BenutzerRolle {
  id: string;
  name: string;
  beschreibung: string | null;
  istSystemAdmin: boolean;
  aktiv: boolean;
  sortOrder: number;
}

interface PermissionGroup {
  label: string;
  permissions: string[];
}

interface PermissionMetadata {
  allPermissions: string[];
  permissionGroups: PermissionGroup[];
  permissionLabels: Record<string, string>;
}

interface RolePermissions {
  role: string;
  permissions: string[];
  istSystemAdmin: boolean;
}

/* ------------------------------------------------------------------ */
/*  Seite                                                              */
/* ------------------------------------------------------------------ */

export default function BerechtigungenPage() {
  const { data: session } = useSession() || {};

  const [rollen, setRollen] = useState<BenutzerRolle[]>([]);
  const [metadata, setMetadata] = useState<PermissionMetadata | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
  const [istSystemAdmin, setIstSystemAdmin] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  /* ---------- Daten laden ---------- */

  const loadRollen = useCallback(() => {
    if (!session) return;
    apiClient
      .get<ODataResponse<BenutzerRolle>>('/odata/BenutzerRollen?$orderby=SortOrder,Name&$filter=Aktiv eq true', session)
      .then(d => {
        const aktivRollen = d.value ?? [];
        setRollen(aktivRollen);
        if (aktivRollen.length > 0 && !selectedRole) {
          setSelectedRole(aktivRollen[0].name);
        }
      })
      .catch(() => toast.error('Fehler beim Laden der Rollen'))
      .finally(() => setLoading(false));
  }, [session, selectedRole]);

  const loadMetadata = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/role-permissions', {
        headers: { Authorization: `Bearer ${getToken(session)}` },
      });
      if (!res.ok) throw new Error('Fehler beim Laden der Metadaten');
      const data: PermissionMetadata = await res.json();
      setMetadata(data);
    } catch {
      toast.error('Fehler beim Laden der Berechtigungen');
    }
  }, [session]);

  const loadRolePermissions = useCallback(async (roleName: string) => {
    if (!session) return;
    try {
      const res = await fetch(`/api/role-permissions/${encodeURIComponent(roleName)}`, {
        headers: { Authorization: `Bearer ${getToken(session)}` },
      });
      if (!res.ok) throw new Error('Fehler beim Laden der Berechtigungen');
      const data: RolePermissions = await res.json();
      setCurrentPermissions(data.permissions);
      setEditedPermissions(data.permissions);
      setIstSystemAdmin(data.istSystemAdmin);
      setHasChanges(false);
    } catch {
      toast.error('Fehler beim Laden der Berechtigungen');
    }
  }, [session]);

  useEffect(() => { loadRollen(); }, [loadRollen]);
  useEffect(() => { loadMetadata(); }, [loadMetadata]);
  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole);
    }
  }, [selectedRole, loadRolePermissions]);

  useEffect(() => {
    if (metadata && Object.keys(expandedGroups).length === 0) {
      const expanded: Record<string, boolean> = {};
      metadata.permissionGroups.forEach(g => { expanded[g.label] = true; });
      setExpandedGroups(expanded);
    }
  }, [metadata, expandedGroups]);

  /* ---------- Berechtigungen bearbeiten ---------- */

  const togglePermission = (permission: string) => {
    if (istSystemAdmin) return; // System-Admin nicht bearbeitbar
    setEditedPermissions(prev => {
      const updated = prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission];
      setHasChanges(JSON.stringify(updated.sort()) !== JSON.stringify(currentPermissions.sort()));
      return updated;
    });
  };

  const toggleGroupAll = (group: PermissionGroup) => {
    if (istSystemAdmin) return;
    setEditedPermissions(prev => {
      const allSet = group.permissions.every(p => prev.includes(p));
      const updated = allSet
        ? prev.filter(p => !group.permissions.includes(p))
        : [...new Set([...prev, ...group.permissions])];
      setHasChanges(JSON.stringify(updated.sort()) !== JSON.stringify(currentPermissions.sort()));
      return updated;
    });
  };

  const savePermissions = async () => {
    if (!session || !selectedRole) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/role-permissions/${encodeURIComponent(selectedRole)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken(session)}`,
        },
        body: JSON.stringify({ permissions: editedPermissions }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Speichern');
      }
      toast.success(`Berechtigungen für ${selectedRole} wurden aktualisiert.`);
      setCurrentPermissions(editedPermissions);
      setHasChanges(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const resetPermissions = () => {
    setEditedPermissions(currentPermissions);
    setHasChanges(false);
  };

  /* ---------- Render ---------- */

  if (loading || !metadata) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Berechtigungen</h1>
            <p className="text-muted-foreground text-sm">Berechtigungen pro Rolle verwalten</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const filteredGroups = metadata.permissionGroups.map(group => ({
    ...group,
    permissions: search
      ? group.permissions.filter(p =>
          p.toLowerCase().includes(search.toLowerCase()) ||
          (metadata.permissionLabels[p] || '').toLowerCase().includes(search.toLowerCase())
        )
      : group.permissions,
  })).filter(g => g.permissions.length > 0);

  const selectedRolle = rollen.find(r => r.name === selectedRole);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/einstellungen/firma">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Berechtigungen</h1>
            <p className="text-muted-foreground">Berechtigungen je Benutzerrolle zuweisen und verwalten</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {metadata.allPermissions.length} Berechtigungen · {rollen.length} Rollen
        </Badge>
      </div>

      {/* Info-Banner */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            Änderungen wirken sich sofort auf alle Benutzer mit der jeweiligen Rolle aus.
            Die System-Administrator-Rolle behält immer alle Rechte und kann nicht bearbeitet werden.
          </div>
        </div>
      </motion.div>

      {/* Rollen-Auswahl */}
      <div className="flex flex-wrap gap-2">
        {rollen.map((r) => (
          <button
            key={r.name}
            onClick={() => setSelectedRole(r.name)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
              selectedRole === r.name
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
            }`}
          >
            <Shield className="h-4 w-4" />
            {r.name}
            {r.istSystemAdmin && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-5">Admin</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Suche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Berechtigung suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Permission-Matrix */}
      {selectedRolle && (
        <motion.div
          key={selectedRole}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {selectedRolle.name}
                    {istSystemAdmin && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        System-Administrator
                      </Badge>
                    )}
                  </CardTitle>
                  <Badge variant="outline">
                    {editedPermissions.length} / {metadata.allPermissions.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {hasChanges && !istSystemAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetPermissions}
                        className="text-muted-foreground"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Zurücksetzen
                      </Button>
                      <Button
                        size="sm"
                        onClick={savePermissions}
                        disabled={saving}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {saving ? 'Speichern...' : 'Speichern'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {istSystemAdmin && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    Diese Rolle hat automatisch alle Berechtigungen und kann nicht bearbeitet werden.
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {filteredGroups.map((group) => {
                  const isExpanded = expandedGroups[group.label] !== false;
                  const groupCount = group.permissions.filter(p => editedPermissions.includes(p)).length;
                  const allInGroup = group.permissions.every(p => editedPermissions.includes(p));
                  const someInGroup = group.permissions.some(p => editedPermissions.includes(p)) && !allInGroup;

                  return (
                    <div key={group.label} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedGroups(prev => ({ ...prev, [group.label]: !isExpanded }))}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="font-medium text-sm">{group.label}</span>
                          <Badge variant="secondary" className="text-[10px] h-5">
                            {groupCount} / {group.permissions.length}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground mr-2">
                            {allInGroup ? 'Alle' : someInGroup ? 'Teilweise' : 'Keine'}
                          </span>
                          <Switch
                            checked={allInGroup}
                            onCheckedChange={() => toggleGroupAll(group)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={istSystemAdmin}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="divide-y">
                          {group.permissions.map((perm) => (
                            <div
                              key={perm}
                              className="flex items-center justify-between px-4 py-2 hover:bg-muted/20 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                <div>
                                  <div className="text-sm">{metadata.permissionLabels[perm] || perm}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono">{perm}</div>
                                </div>
                              </div>
                              <Switch
                                checked={editedPermissions.includes(perm)}
                                onCheckedChange={() => togglePermission(perm)}
                                disabled={istSystemAdmin}
                                className="data-[state=checked]:bg-primary"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredGroups.length === 0 && search && (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine Berechtigungen für «{search}» gefunden
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
