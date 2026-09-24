'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { ApiError } from '@/lib/errors';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft, Zap, Save, Plus, Trash2, CheckCircle2, Clock,
  CircleDot, User, Calendar, FileText, ListChecks, Gavel,
  Edit, Play, Check
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WorkItem {
  id: string;
  titel: string;
  beschreibung: string | null;
  status: string;
  // UI-12-Fix: kein "zugewiesenAn"-Navigationsobjekt vom Backend - Name wird
  // clientseitig aus der bereits geladenen users-Liste aufgelöst.
  zugewiesenAnId: string | null;
  createdAt: string;
}

interface DriverDetail {
  id: string;
  // UI-12-Fix: echte Backend-Feldnamen (Titel/Beschreibung/Prioritaet) statt
  // erfundener englischer Namen; kein "creator"-Navigationsobjekt - Name wird
  // clientseitig über createdById aus der users-Liste aufgelöst.
  titel: string;
  beschreibung: string | null;
  status: string;
  prioritaet: string;
  entscheid: string | null;
  entscheidDatum: string | null;
  circle: { id: string; name: string };
  createdById: string | null;
  workItems: WorkItem[];
  createdAt: string;
  updatedAt: string;
}

interface UserOption {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Config maps                                                        */
/* ------------------------------------------------------------------ */

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  DRINGEND: { label: 'Dringend', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  HOCH: { label: 'Hoch', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  MITTEL: { label: 'Mittel', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  NIEDRIG: { label: 'Niedrig', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  OFFEN: { label: 'Offen', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Clock },
  IN_BEARBEITUNG: { label: 'In Bearbeitung', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: Play },
  ERLEDIGT: { label: 'Erledigt', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle2 },
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function SpannungDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession() || {};
  const { can } = usePermissions();
  const canEdit = can('org:driver:update');

  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({
    titel: '',
    beschreibung: '',
    prioritaet: 'MITTEL',
    entscheid: '',
    entscheidDatum: '',
  });

  // New WorkItem dialog
  const [wiDialogOpen, setWiDialogOpen] = useState(false);
  const [wiForm, setWiForm] = useState({ titel: '', beschreibung: '', zugewiesenAnId: '' });
  const [wiSaving, setWiSaving] = useState(false);

  // Users for assignment
  const [users, setUsers] = useState<UserOption[]>([]);

  const loadDriver = useCallback(async () => {
    if (!session) return;
    try {
      // Spannung inkl. Arbeitspaketen und Kreis über OData laden
      // UI-12-Fix: kein "Creator"-Navigationsfeld auf S3Driver - $expand=Creator
      // liess die gesamte Abfrage zuvor mit einem OData-400-Fehler scheitern,
      // wodurch diese Seite nie eine Spannung laden konnte.
      const data = await apiClient.get<DriverDetail>(
        `/odata/Drivers(${params.id})?$expand=WorkItems,Circle`,
        session
      );
      setDriver(data);
      setEditForm({
        titel: data.titel,
        beschreibung: data.beschreibung || '',
        prioritaet: data.prioritaet,
        entscheid: data.entscheid || '',
        entscheidDatum: data.entscheidDatum ? data.entscheidDatum.split('T')[0] : '',
      });
    } catch {
      toast.error('Spannung konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [params.id, session]);

  useEffect(() => {
    if (!session) return;
    loadDriver();
    // Benutzer für Zuweisungen laden (OData)
    apiClient.get<ODataResponse<{ id: string; name: string; aktiv?: boolean }>>('/odata/Users?$orderby=Name', session)
      .then(data => {
        const activeUsers = (data.value ?? [])
          .filter(u => u.aktiv !== false)
          .map(u => ({ id: u.id, name: u.name }));
        setUsers(activeUsers);
      })
      .catch(() => {});
  }, [loadDriver, session]);

  const isEditable = driver && driver.status !== 'ERLEDIGT';

  /* ---- Save driver edits ---- */
  const handleSave = async () => {
    if (!driver) return;
    setSaving(true);
    try {
      // Spannung über OData aktualisieren
      await apiClient.patch(`/odata/Drivers(${driver.id})`, {
        titel: editForm.titel,
        beschreibung: editForm.beschreibung || null,
        prioritaet: editForm.prioritaet,
        entscheid: editForm.entscheid || null,
        entscheidDatum: editForm.entscheidDatum || null,
      }, session);
      setEditing(false);
      toast.success('Spannung gespeichert');
      loadDriver();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? (error.message || 'Fehler beim Speichern') : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  /* ---- Status change ---- */
  const handleStatusChange = async (newStatus: string) => {
    if (!driver) return;
    try {
      // Status der Spannung über OData aktualisieren
      await apiClient.patch(`/odata/Drivers(${driver.id})`, { status: newStatus }, session);
      toast.success(`Status geändert: ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      loadDriver();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? (error.message || 'Statuswechsel fehlgeschlagen') : 'Statuswechsel fehlgeschlagen');
    }
  };

  /* ---- Create WorkItem ---- */
  const handleCreateWorkItem = async () => {
    if (!wiForm.titel || !wiForm.zugewiesenAnId) {
      toast.error('Titel und Zuweisung sind erforderlich');
      return;
    }
    setWiSaving(true);
    try {
      // Arbeitsauftrag über OData anlegen
      await apiClient.post('/odata/SpannungWorkItems', { ...wiForm, driverId: params.id }, session);
      setWiDialogOpen(false);
      setWiForm({ titel: '', beschreibung: '', zugewiesenAnId: '' });
      toast.success('Arbeitsauftrag erstellt');
      loadDriver();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? (error.message || 'Fehler beim Erstellen') : 'Fehler beim Erstellen');
    } finally {
      setWiSaving(false);
    }
  };

  /* ---- Update WorkItem status ---- */
  const handleWorkItemStatus = async (wiId: string, newStatus: string) => {
    try {
      // Arbeitsauftrag-Status über OData aktualisieren
      await apiClient.patch(`/odata/SpannungWorkItems(${wiId})`, { status: newStatus }, session);
      toast.success('Status aktualisiert');
      loadDriver();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? (error.message || 'Fehler') : 'Fehler beim Aktualisieren');
    }
  };

  /* ---- Delete WorkItem ---- */
  const handleDeleteWorkItem = async (wiId: string) => {
    if (!confirm('Arbeitsauftrag wirklich löschen?')) return;
    try {
      // Arbeitsauftrag über OData löschen
      await apiClient.delete(`/odata/SpannungWorkItems(${wiId})`, session);
      toast.success('Arbeitsauftrag gelöscht');
      loadDriver();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? (error.message || 'Fehler') : 'Fehler beim Löschen');
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-20">
        <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold">Spannung nicht gefunden</h2>
        <Link href="/organisation?tab=drivers">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
        </Link>
      </div>
    );
  }

  const prio = PRIORITY_CONFIG[driver.prioritaet] || PRIORITY_CONFIG.MITTEL;
  const erstellerName = users.find(u => u.id === driver.createdById)?.name ?? 'Unbekannt';
  const stat = STATUS_CONFIG[driver.status] || STATUS_CONFIG.OFFEN;
  const openWI = driver.workItems.filter(wi => wi.status !== 'ERLEDIGT').length;
  const totalWI = driver.workItems.length;
  const allWIDone = totalWI > 0 && openWI === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/organisation?tab=drivers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="p-2 rounded-lg bg-orange-500/10">
            <Zap className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{driver.titel}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={stat.color}>{stat.label}</Badge>
              <Badge className={prio.color}>{prio.label}</Badge>
            </div>
          </div>
        </div>

        {canEdit && isEditable && (
          <div className="flex gap-2">
            {!editing && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Bearbeiten
              </Button>
            )}
            {driver.status === 'OFFEN' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('IN_BEARBEITUNG')}
                className="text-amber-600 hover:text-amber-700"
              >
                <Play className="h-4 w-4 mr-2" />
                In Bearbeitung
              </Button>
            )}
            {driver.status !== 'ERLEDIGT' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('ERLEDIGT')}
                className="text-green-600 hover:text-green-700"
                disabled={openWI > 0}
                title={openWI > 0 ? `${openWI} Arbeitsaufträge noch offen` : 'Als erledigt markieren'}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Erledigt
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Info hint when not completable */}
      {canEdit && isEditable && driver.status !== 'ERLEDIGT' && openWI > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
          <ListChecks className="h-4 w-4 flex-shrink-0" />
          <span>Es gibt noch {openWI} offene Arbeitsaufträge. Die Spannung kann erst auf «Erledigt» gesetzt werden, wenn alle Arbeitsaufträge erledigt sind.</span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ======== LEFT: Details ======== */}
        <div className="lg:col-span-2 space-y-6">
          {/* Spannung Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label>Titel</Label>
                    <Input
                      value={editForm.titel}
                      onChange={e => setEditForm(f => ({ ...f, titel: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Beschreibung</Label>
                    <Textarea
                      value={editForm.beschreibung}
                      onChange={e => setEditForm(f => ({ ...f, beschreibung: e.target.value }))}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priorität</Label>
                    <Select value={editForm.prioritaet} onValueChange={v => setEditForm(f => ({ ...f, prioritaet: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NIEDRIG">Niedrig</SelectItem>
                        <SelectItem value="MITTEL">Mittel</SelectItem>
                        <SelectItem value="HOCH">Hoch</SelectItem>
                        <SelectItem value="DRINGEND">Dringend</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSave} disabled={saving || !editForm.titel.trim()}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Speichern…' : 'Speichern'}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setEditing(false);
                      setEditForm({
                        titel: driver.titel,
                        beschreibung: driver.beschreibung || '',
                        prioritaet: driver.prioritaet,
                        entscheid: driver.entscheid || '',
                        entscheidDatum: driver.entscheidDatum ? driver.entscheidDatum.split('T')[0] : '',
                      });
                    }}>
                      Abbrechen
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {driver.beschreibung ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{driver.beschreibung}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Keine Beschreibung</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Entscheid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Entscheid
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Entscheid</Label>
                    <Textarea
                      value={editForm.entscheid}
                      onChange={e => setEditForm(f => ({ ...f, entscheid: e.target.value }))}
                      rows={4}
                      placeholder="Entscheid zur Spannung erfassen…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Entscheid-Datum</Label>
                    <Input
                      type="date"
                      value={editForm.entscheidDatum}
                      onChange={e => setEditForm(f => ({ ...f, entscheidDatum: e.target.value }))}
                    />
                  </div>
                </div>
              ) : driver.entscheid ? (
                <div className="space-y-2">
                  <p className="text-sm whitespace-pre-line">{driver.entscheid}</p>
                  {driver.entscheidDatum && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Entscheid vom {formatDate(driver.entscheidDatum)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Noch kein Entscheid erfasst</p>
              )}
            </CardContent>
          </Card>

          {/* WorkItems */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Arbeitsaufträge
                  <Badge variant="secondary">{totalWI}</Badge>
                  {openWI > 0 && (
                    <Badge variant="outline" className="text-amber-600">{openWI} offen</Badge>
                  )}
                </CardTitle>
                {canEdit && isEditable && (
                  <Dialog open={wiDialogOpen} onOpenChange={setWiDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Neuer Auftrag
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Neuer Arbeitsauftrag</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>Titel *</Label>
                          <Input
                            value={wiForm.titel}
                            onChange={e => setWiForm(f => ({ ...f, titel: e.target.value }))}
                            placeholder="Arbeitsauftrag Titel"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Beschreibung</Label>
                          <Textarea
                            value={wiForm.beschreibung}
                            onChange={e => setWiForm(f => ({ ...f, beschreibung: e.target.value }))}
                            rows={3}
                            placeholder="Optionale Beschreibung…"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Zugewiesen an *</Label>
                          <Select value={wiForm.zugewiesenAnId} onValueChange={v => setWiForm(f => ({ ...f, zugewiesenAnId: v }))}>
                            <SelectTrigger><SelectValue placeholder="Benutzer wählen" /></SelectTrigger>
                            <SelectContent>
                              {users.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={handleCreateWorkItem}
                          disabled={wiSaving || !wiForm.titel.trim() || !wiForm.zugewiesenAnId}
                          className="w-full"
                        >
                          {wiSaving ? 'Erstellen…' : 'Arbeitsauftrag erstellen'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {driver.workItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Noch keine Arbeitsaufträge vorhanden
                </p>
              ) : (
                <div className="space-y-3">
                  {driver.workItems.map((wi, idx) => {
                    const wiStat = STATUS_CONFIG[wi.status] || STATUS_CONFIG.OFFEN;
                    const StatusIcon = wiStat.icon;
                    return (
                      <motion.div
                        key={wi.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          wi.status === 'ERLEDIGT'
                            ? 'bg-green-50/50 dark:bg-green-950/10 border-green-200 dark:border-green-900'
                            : 'bg-muted/30 border-border'
                        }`}
                      >
                        <StatusIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                          wi.status === 'ERLEDIGT' ? 'text-green-500' :
                          wi.status === 'IN_BEARBEITUNG' ? 'text-amber-500' : 'text-blue-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium text-sm ${wi.status === 'ERLEDIGT' ? 'line-through text-muted-foreground' : ''}`}>
                              {wi.titel}
                            </span>
                            <Badge className={`text-xs ${wiStat.color}`}>{wiStat.label}</Badge>
                          </div>
                          {wi.beschreibung && (
                            <p className="text-xs text-muted-foreground mt-1">{wi.beschreibung}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {users.find(u => u.id === wi.zugewiesenAnId)?.name ?? 'Nicht zugewiesen'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(wi.createdAt).toLocaleDateString('de-CH')}
                            </span>
                          </div>
                        </div>
                        {canEdit && isEditable && (
                          <div className="flex gap-1 flex-shrink-0">
                            {wi.status === 'OFFEN' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-amber-600 hover:text-amber-700"
                                onClick={() => handleWorkItemStatus(wi.id, 'IN_BEARBEITUNG')}
                                title="In Bearbeitung setzen"
                              >
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {wi.status !== 'ERLEDIGT' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-green-600 hover:text-green-700"
                                onClick={() => handleWorkItemStatus(wi.id, 'ERLEDIGT')}
                                title="Als erledigt markieren"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {wi.status !== 'ERLEDIGT' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-600"
                                onClick={() => handleDeleteWorkItem(wi.id)}
                                title="Löschen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ======== RIGHT: Meta-Info ======== */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Kreis</p>
                <Link
                  href={`/organisation/kreise/${driver.circle.id}`}
                  className="flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  <CircleDot className="h-3.5 w-3.5" />
                  {driver.circle.name}
                </Link>
              </div>
              <div>
                <p className="text-muted-foreground">Erstellt von</p>
                <p className="font-medium flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {erstellerName}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Erstellt am</p>
                <p className="font-medium">{formatDate(driver.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Zuletzt geändert</p>
                <p className="font-medium">{formatDate(driver.updatedAt)}</p>
              </div>

              {/* WorkItem stats */}
              <div className="pt-2 border-t">
                <p className="text-muted-foreground mb-2">Arbeitsaufträge</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <Badge variant="secondary">{totalWI}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Offen</span>
                    <Badge variant="outline" className="text-blue-600">
                      {driver.workItems.filter(wi => wi.status === 'OFFEN').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>In Bearbeitung</span>
                    <Badge variant="outline" className="text-amber-600">
                      {driver.workItems.filter(wi => wi.status === 'IN_BEARBEITUNG').length}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Erledigt</span>
                    <Badge variant="outline" className="text-green-600">
                      {driver.workItems.filter(wi => wi.status === 'ERLEDIGT').length}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Can close hint */}
              {canEdit && isEditable && (
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground mb-1">Abschluss</p>
                  {allWIDone ? (
                    <p className="text-green-600 text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Alle Aufträge erledigt – Spannung kann geschlossen werden
                    </p>
                  ) : totalWI === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Keine Arbeitsaufträge – Spannung kann direkt geschlossen werden
                    </p>
                  ) : (
                    <p className="text-amber-600 text-xs flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {openWI} Auftrag/Aufträge noch offen
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
