'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { ApiError } from '@/lib/errors';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft, Play, Square, CheckCircle2, Plus, AlertTriangle, MessageSquare, Clock,
  XCircle, CheckCircle, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

const MEETING_TYPE_LABELS: Record<string, string> = { GOVERNANCE: 'Governance', OPERATIONAL: 'Operativ', RETROSPECTIVE: 'Retrospektive' };
const STATUS_COLORS: Record<string, string> = { GEPLANT: 'bg-blue-100 text-blue-800', LAUFEND: 'bg-yellow-100 text-yellow-800', ABGESCHLOSSEN: 'bg-green-100 text-green-800', ABGESAGT: 'bg-gray-100 text-gray-800' };
const PROPOSAL_STATUS_COLORS: Record<string, string> = {
  ENTWURF: 'bg-gray-100 text-gray-800', VORGESTELLT: 'bg-blue-100 text-blue-800',
  EINWAND: 'bg-red-100 text-red-800', ANGENOMMEN: 'bg-green-100 text-green-800', ABGELEHNT: 'bg-red-200 text-red-900',
};
const OBJECTION_STATUS_COLORS: Record<string, string> = { OFFEN: 'bg-red-100 text-red-800', INTEGRIERT: 'bg-green-100 text-green-800', ZURUECKGEZOGEN: 'bg-gray-100 text-gray-800' };

export default function MeetingDetailPage() {
  const { data: session } = useSession() || {};
  const { can } = usePermissions();
  const params = useParams();
  const router = useRouter();
  const [meeting, setMeeting] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  // UI-28-Fix: Backend liefert keine verschachtelten creator/proposer/objector-
  // Objekte (die gab es nie) - Namen werden clientseitig über eine separat
  // geladene Users-Liste aufgelöst, mit Fallback für Betrachter ohne user:read.
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const benutzerName = (id: string | null | undefined) =>
    users.find((u) => u.id === id)?.name ?? 'Unbekannt';

  // Proposal dialog
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [proposalForm, setProposalForm] = useState({ title: '', description: '' });

  // Objection dialog
  const [objectionDialogOpen, setObjectionDialogOpen] = useState(false);
  const [objectionProposalId, setObjectionProposalId] = useState('');
  const [objectionForm, setObjectionForm] = useState({ observation: '', risk: '', domainReference: '' });

  const loadMeeting = useCallback(async () => {
    if (!session) return;
    try {
      // Meeting-Details inkl. Vorschläge/Einwände/Entscheidung über OData laden
      const data = await apiClient.get<Record<string, unknown>>(
        `/odata/Meetings(${params.id})?$expand=Proposals($expand=Objections,Decision),Circle`,
        session
      );
      setMeeting(data);
    } catch (error: unknown) {
      console.error('Fehler:', error);
      toast.error('Meeting nicht gefunden');
      router.push('/organisation');
    } finally {
      setLoading(false);
    }
  }, [params.id, router, session]);

  useEffect(() => { loadMeeting(); }, [loadMeeting]);

  useEffect(() => {
    if (!session) return;
    apiClient
      .get<ODataResponse<{ id: string; name: string }>>('/odata/Users?$select=id,name', session)
      .then((data) => setUsers(data.value ?? []))
      .catch(() => setUsers([]));
  }, [session]);

  const updateStatus = async (status: string) => {
    try {
      const data: Record<string, unknown> = { status };
      if (status === 'LAUFEND') data.startedAt = new Date().toISOString();
      if (status === 'ABGESCHLOSSEN') data.endedAt = new Date().toISOString();
      // Meeting-Status über OData aktualisieren
      await apiClient.patch(`/odata/Meetings(${params.id})`, data, session);
      toast.success(`Status: ${status}`);
      loadMeeting();
    } catch (error: unknown) { console.error('Fehler:', error); }
  };

  const handleCreateProposal = async () => {
    try {
      // UI-28-Fix: Backend-Feldnamen (titel/beschreibung) statt englischer
      // Namen; circleId ist auf S3Proposal ein Pflichtfeld (nicht nullable)
      // und muss vom Meeting übernommen werden - fehlte zuvor komplett.
      const circleId = (meeting?.circle as Record<string, unknown> | undefined)?.id as string | undefined;
      await apiClient.post('/odata/Proposals', {
        titel: proposalForm.title,
        beschreibung: proposalForm.description || null,
        meetingId: params.id,
        circleId,
      }, session);
      toast.success('Vorschlag erstellt');
      setProposalDialogOpen(false);
      setProposalForm({ title: '', description: '' });
      loadMeeting();
    } catch (error: unknown) {
      console.error('Fehler:', error);
      toast.error(error instanceof ApiError ? (error.message || 'Fehler') : 'Fehler');
    }
  };

  const updateProposalStatus = async (proposalId: string, status: string) => {
    try {
      // Vorschlag-Status über OData aktualisieren
      await apiClient.patch(`/odata/Proposals(${proposalId})`, { status }, session);
      toast.success(`Vorschlag: ${status}`);
      loadMeeting();
    } catch (error: unknown) { console.error('Fehler:', error); }
  };

  const handleCreateObjection = async () => {
    try {
      // Einwand über OData anlegen
      await apiClient.post('/odata/Objections', { ...objectionForm, proposalId: objectionProposalId }, session);
      toast.success('Einwand erhoben');
      setObjectionDialogOpen(false);
      setObjectionForm({ observation: '', risk: '', domainReference: '' });
      loadMeeting();
    } catch (error: unknown) {
      console.error('Fehler:', error);
      toast.error(error instanceof ApiError ? (error.message || 'Fehler') : 'Fehler');
    }
  };

  const resolveObjection = async (objectionId: string, status: string) => {
    try {
      // Einwand-Status über OData aktualisieren
      await apiClient.patch(`/odata/Objections(${objectionId})`, { status }, session);
      toast.success(`Einwand: ${status}`);
      loadMeeting();
    } catch (error: unknown) { console.error('Fehler:', error); }
  };

  const decideProposal = async (proposalId: string) => {
    try {
      // Consent-Entscheidung über OData-Aktion auslösen
      await apiClient.post(`/odata/Proposals(${proposalId})/Decide`, {}, session);
      toast.success('Consent-Entscheidung getroffen!');
      loadMeeting();
    } catch (error: unknown) {
      console.error('Fehler:', error);
      toast.error(error instanceof ApiError ? (error.message || 'Fehler') : 'Fehler');
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!meeting) return null;

  const m = meeting;
  const proposals = (m.proposals || []) as Record<string, unknown>[];
  const circle = m.circle as Record<string, unknown>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={circle ? `/organisation/kreise/${String(circle.id)}` : '/organisation'}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{String(m.title)}</h1>
            <Badge className={STATUS_COLORS[m.status as string] || ''}>{String(m.status)}</Badge>
            <Badge variant="outline">{MEETING_TYPE_LABELS[m.typ as string] || m.typ as string}</Badge>
            {circle && <Badge variant="secondary">{circle.name as string}</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span><Clock className="h-3 w-3 inline mr-1" />{formatDate(m.scheduledAt as string)}</span>
            <span>Erstellt von {benutzerName(m.createdById as string | null)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {String(m.status) === 'GEPLANT' ? (
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus('LAUFEND')}>
              <Play className="h-4 w-4 mr-1" />Starten
            </Button>
          ) : null}
          {String(m.status) === 'LAUFEND' ? (
            <Button size="sm" variant="secondary" onClick={() => updateStatus('ABGESCHLOSSEN')}>
              <Square className="h-4 w-4 mr-1" />Beenden
            </Button>
          ) : null}
        </div>
      </div>

      {m.notes ? (
        <Card><CardContent className="py-4"><p className="text-sm text-muted-foreground">{String(m.notes)}</p></CardContent></Card>
      ) : null}

      {/* Proposals / Consent-Prozess */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Vorschläge & Consent-Prozess</h2>
          {can('org:proposal:create') && (
            <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Vorschlag</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Neuer Vorschlag</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Titel *</Label><Input value={proposalForm.title} onChange={e => setProposalForm(f => ({ ...f, title: e.target.value }))} /></div>
                  <div><Label>Beschreibung</Label><Textarea value={proposalForm.description} onChange={e => setProposalForm(f => ({ ...f, description: e.target.value }))} rows={4} /></div>
                </div>
                <DialogFooter><Button onClick={handleCreateProposal}>Einbringen</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {proposals.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Noch keine Vorschläge</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {proposals.map((p) => {
              const objections = (p.objections || []) as Record<string, unknown>[];
              const openObjections = objections.filter(o => o.status === 'OFFEN');
              const decision = p.decision as Record<string, unknown> | null;

              return (
                <Card key={p.id as string} className="border-l-4" style={{ borderLeftColor: p.status === 'ANGENOMMEN' ? '#22c55e' : p.status === 'EINWAND' ? '#ef4444' : p.status === 'VORGESTELLT' ? '#3b82f6' : '#9ca3af' }}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{String(p.titel)}</h3>
                        <Badge className={PROPOSAL_STATUS_COLORS[p.status as string] || ''}>{String(p.status)}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        von {benutzerName(p.createdById as string | null)}
                      </span>
                    </div>
                    {p.beschreibung ? <p className="text-sm text-muted-foreground">{String(p.beschreibung)}</p> : null}

                    {/* Consent-Workflow Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      {p.status === 'ENTWURF' && (
                        <Button size="sm" variant="outline" onClick={() => updateProposalStatus(p.id as string, 'VORGESTELLT')}>
                          <MessageSquare className="h-3 w-3 mr-1" />Vorstellen
                        </Button>
                      )}
                      {p.status === 'VORGESTELLT' && can('org:objection:create') && (
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => { setObjectionProposalId(p.id as string); setObjectionDialogOpen(true); }}>
                          <AlertTriangle className="h-3 w-3 mr-1" />Einwand erheben
                        </Button>
                      )}
                      {p.status === 'VORGESTELLT' && openObjections.length === 0 && can('org:decision:create') && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => decideProposal(p.id as string)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Consent erteilen
                        </Button>
                      )}
                    </div>

                    {/* Objections */}
                    {objections.length > 0 && (
                      <div className="space-y-2 pt-2 border-t">
                        <h4 className="text-sm font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Einwände ({objections.length})</h4>
                        {objections.map(o => (
                          <Card key={o.id as string} className="bg-muted/50">
                            <CardContent className="py-3 text-sm space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className={OBJECTION_STATUS_COLORS[o.status as string] || ''} >{String(o.status)}</Badge>
                                  <span className="text-muted-foreground">von {benutzerName(o.userId as string | null)}</span>
                                </div>
                                {o.status === 'OFFEN' && can('org:objection:update') && (
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" className="h-7 text-green-600" onClick={() => resolveObjection(o.id as string, 'INTEGRIERT')}>
                                      <CheckCircle className="h-3 w-3 mr-1" />Integriert
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-gray-500" onClick={() => resolveObjection(o.id as string, 'ZURUECKGEZOGEN')}>
                                      <RotateCcw className="h-3 w-3 mr-1" />Zurückgezogen
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <p><strong>Beobachtung:</strong> {String(o.observation)}</p>
                              <p><strong>Risiko:</strong> {String(o.risk)}</p>
                              <p><strong>Domänen-Bezug:</strong> {String(o.domainReference)}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Decision */}
                    {decision && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-green-700">Consent-Entscheidung: {decision.beschreibung as string}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Objection Dialog */}
      <Dialog open={objectionDialogOpen} onOpenChange={setObjectionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Begründeter Einwand (Reasoned Objection)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Beobachtung * <span className="text-xs text-muted-foreground">(min. 10 Zeichen)</span></Label>
              <Textarea value={objectionForm.observation} onChange={e => setObjectionForm(f => ({ ...f, observation: e.target.value }))} rows={2} placeholder="Faktische Beobachtung" />
            </div>
            <div>
              <Label>Risiko * <span className="text-xs text-muted-foreground">(min. 10 Zeichen)</span></Label>
              <Textarea value={objectionForm.risk} onChange={e => setObjectionForm(f => ({ ...f, risk: e.target.value }))} rows={2} placeholder="Konkreter Schaden für Zweck/Organisation" />
            </div>
            <div>
              <Label>Domänen-Bezug * <span className="text-xs text-muted-foreground">(min. 5 Zeichen)</span></Label>
              <Textarea value={objectionForm.domainReference} onChange={e => setObjectionForm(f => ({ ...f, domainReference: e.target.value }))} rows={2} placeholder="Bezug zu Domäne/Vereinbarung/Zweck" />
            </div>
          </div>
          <DialogFooter><Button onClick={handleCreateObjection} variant="destructive">Einwand erheben</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
