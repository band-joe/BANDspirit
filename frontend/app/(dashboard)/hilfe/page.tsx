'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { hasPermission, Permission } from '@/lib/rbac';
import { apiClient } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { ApiError } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus, Ticket, HelpCircle, Search, Filter, ChevronDown, ChevronRight,
  AlertCircle, Clock, CheckCircle2, MessageSquare, Send, Loader2, Pencil, Trash2,
  SearchIcon, ExternalLink, Newspaper,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// ---- Types ----
interface SupportTicket {
  id: string;
  titel: string;
  beschreibung: string;
  status: 'OFFEN' | 'IN_BEARBEITUNG' | 'ERLEDIGT';
  prioritaet: 'NIEDRIG' | 'MITTEL' | 'HOCH' | 'DRINGEND';
  kategorie: string | null;
  antwort: string | null;
  // UI-11-Fix: Backend liefert ein flaches erstellerName-Feld (Server-Join),
  // keine verschachtelte createdBy/assignedTo-Objekte - die es serverseitig
  // nie gab (SupportTicket kennt keine "assignedTo"-Zuweisung).
  erstellerId: string | null;
  erstellerName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FAQ {
  id: string;
  frage: string;
  antwort: string;
  kategorie: string | null;
  sortOrder: number;
  isActive: boolean;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  OFFEN: { label: 'Offen', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: <AlertCircle className="h-3.5 w-3.5" /> },
  IN_BEARBEITUNG: { label: 'In Bearbeitung', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Clock className="h-3.5 w-3.5" /> },
  ERLEDIGT: { label: 'Erledigt', color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
};

const PRIORITAET_CONFIG: Record<string, { label: string; color: string }> = {
  NIEDRIG: { label: 'Niedrig', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  MITTEL: { label: 'Mittel', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  HOCH: { label: 'Hoch', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  DRINGEND: { label: 'Dringend', color: 'bg-red-100 text-red-700 border-red-200' },
};

const KATEGORIEN = ['Technisches Problem', 'Funktionsanfrage', 'Datenproblem', 'Benutzerzugang', 'Sonstiges'];

// ---- Main Component ----
export default function HilfePage() {
  const { data: session } = useSession() || {};
  const role = (session?.user as any)?.role ?? '';
  const userId = (session?.user as any)?.id ?? '';
  const canManageTickets = hasPermission(role, 'ticket:update' as Permission);
  const canManageFaq = hasPermission(role, 'faq:manage' as Permission);
  const searchParams = useSearchParams();
  const router = useRouter();

  // UI-01-Fix: Die URL ist die alleinige Quelle für den aktiven Tab, statt nur
  // beim ersten Rendern in einen lokalen State übernommen zu werden. Ein
  // späterer Sidebar-Klick (gleiche Route, geänderter ?tab=-Parameter) hat
  // zuvor keinen Re-Render von activeTab ausgelöst, wodurch URL, Sidebar-
  // Auswahl und sichtbarer Inhalt auseinanderliefen. Ein In-Page-Tab-Wechsel
  // schreibt umgekehrt den Parameter zurück in die URL, damit Sidebar,
  // Back/Forward und Reload konsistent bleiben.
  const tabParam = searchParams?.get('tab');
  const activeTab = tabParam === 'faq' ? 'faq' : tabParam === 'suche' ? 'suche' : 'tickets';

  const handleTabChange = (value: string) => {
    router.push(`/hilfe?tab=${value}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hilfe & Support</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Support-Tickets, FAQ oder durchsuchen Sie alle Informationen in BANDspirit.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="suche" className="flex items-center gap-2">
            <SearchIcon className="h-4 w-4" />
            Suche
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suche" className="mt-6">
          <SucheTab />
        </TabsContent>

        <TabsContent value="tickets" className="mt-6">
          <TicketsTab canManage={canManageTickets} userId={userId} role={role} />
        </TabsContent>

        <TabsContent value="faq" className="mt-6">
          <FAQTab canManage={canManageFaq} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// TICKETS TAB
// ============================================================
function TicketsTab({ canManage, userId, role }: { canManage: boolean; userId: string; role: string }) {
  const { data: session } = useSession() || {};
  const searchParams = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('alle');
  const [filterPrioritaet, setFilterPrioritaet] = useState<string>('alle');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // UI-10-Fix: Aus der globalen Suche verlinkte Tickets (?ticketId=...) direkt
  // öffnen und dorthin scrollen, statt nur auf die Tickets-Liste zu verweisen.
  useEffect(() => {
    const ticketId = searchParams?.get('ticketId');
    if (!ticketId || tickets.length === 0) return;
    const treffer = tickets.find(t => t.id === ticketId);
    if (!treffer) return;
    setSelectedTicket(treffer);
    document.getElementById('ticket-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [searchParams, tickets]);

  const loadTickets = useCallback(async () => {
    if (!session) return;
    try {
      // Status-/Prioritätsfilter als OData $filter zusammensetzen
      const filters: string[] = [];
      if (filterStatus !== 'alle') filters.push(`Status eq '${filterStatus}'`);
      if (filterPrioritaet !== 'alle') filters.push(`Prioritaet eq '${filterPrioritaet}'`);
      const query = filters.length > 0
        ? `?$filter=${encodeURIComponent(filters.join(' and '))}&$orderby=CreatedAt desc`
        : '?$orderby=CreatedAt desc';
      const data = await apiClient.get<ODataResponse<SupportTicket>>(`/odata/SupportTickets${query}`, session);
      setTickets(data.value ?? []);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPrioritaet, session]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const filteredTickets = tickets.filter(t =>
    !searchQuery || t.titel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.beschreibung.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-1 gap-2 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tickets durchsuchen..."
              aria-label="Tickets durchsuchen"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]" aria-label="Nach Status filtern">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Status</SelectItem>
              <SelectItem value="OFFEN">Offen</SelectItem>
              <SelectItem value="IN_BEARBEITUNG">In Bearbeitung</SelectItem>
              <SelectItem value="ERLEDIGT">Erledigt</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPrioritaet} onValueChange={setFilterPrioritaet}>
            <SelectTrigger className="w-[160px]" aria-label="Nach Priorität filtern">
              <SelectValue placeholder="Priorität" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Prioritäten</SelectItem>
              <SelectItem value="NIEDRIG">Niedrig</SelectItem>
              <SelectItem value="MITTEL">Mittel</SelectItem>
              <SelectItem value="HOCH">Hoch</SelectItem>
              <SelectItem value="DRINGEND">Dringend</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#3e8f88] hover:bg-[#2a6b64]">
              <Plus className="h-4 w-4 mr-2" />
              Neues Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <CreateTicketForm
              onSuccess={() => { setShowCreateDialog(false); loadTickets(); }}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {(['OFFEN', 'IN_BEARBEITUNG', 'ERLEDIGT'] as const).map((st) => {
          const cfg = STATUS_CONFIG[st];
          const count = tickets.filter(t => t.status === st).length;
          return (
            <Card key={st} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterStatus(filterStatus === st ? 'alle' : st)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${cfg.color}`}>{cfg.icon}</div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#3e8f88]" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ticket className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Keine Tickets gefunden</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Ticket erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTickets.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              canManage={canManage}
              isSelected={selectedTicket?.id === ticket.id}
              onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
              onUpdated={loadTickets}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedTicket && (
        <div id="ticket-detail">
          <TicketDetail
            ticket={selectedTicket}
            canManage={canManage}
            onClose={() => setSelectedTicket(null)}
            onUpdated={() => { loadTickets(); setSelectedTicket(null); }}
          />
        </div>
      )}
    </div>
  );
}

// ---- Ticket Row ----
function TicketRow({ ticket, canManage, isSelected, onClick, onUpdated }: {
  ticket: SupportTicket; canManage: boolean; isSelected: boolean; onClick: () => void; onUpdated: () => void;
}) {
  const st = STATUS_CONFIG[ticket.status];
  const pr = PRIORITAET_CONFIG[ticket.prioritaet];
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-[#3e8f88] shadow-md' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">#{ticket.id.slice(-6).toUpperCase()}</span>
              <Badge variant="outline" className={`text-xs ${st.color} border`}>
                {st.icon}
                <span className="ml-1">{st.label}</span>
              </Badge>
              <Badge variant="outline" className={`text-xs ${pr.color} border`}>
                {pr.label}
              </Badge>
              {ticket.kategorie && (
                <Badge variant="secondary" className="text-xs">{ticket.kategorie}</Badge>
              )}
            </div>
            <h3 className="font-semibold text-sm truncate">{ticket.titel}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ticket.beschreibung}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">
              {new Date(ticket.createdAt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{ticket.erstellerName ?? 'Unbekannt'}</p>
            {ticket.antwort && (
              <MessageSquare className="h-3.5 w-3.5 text-[#3e8f88] mt-1 ml-auto" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Ticket Detail ----
function TicketDetail({ ticket, canManage, onClose, onUpdated }: {
  ticket: SupportTicket; canManage: boolean; onClose: () => void; onUpdated: () => void;
}) {
  const { data: session } = useSession() || {};
  const [status, setStatus] = useState(ticket.status);
  const [antwort, setAntwort] = useState(ticket.antwort || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    setSaveError('');
    setSaving(true);
    try {
      await apiClient.patch(`/odata/SupportTickets(${ticket.id})`, { status, antwort: antwort || null }, session);
      toast.success('Ticket aktualisiert');
      onUpdated();
    } catch (err: unknown) {
      setSaveError(err instanceof ApiError ? err.message : 'Netzwerkfehler – bitte versuchen Sie es erneut.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-[#3e8f88]/30">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">#{ticket.id.slice(-6).toUpperCase()} – {ticket.titel}</CardTitle>
            <CardDescription>
              Erstellt von {ticket.erstellerName ?? 'Unbekannt'} am{' '}
              {new Date(ticket.createdAt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Schliessen</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm whitespace-pre-wrap">{ticket.beschreibung}</p>
        </div>

        {ticket.antwort && !canManage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs font-medium text-green-800 mb-1">Antwort vom Support:</p>
            <p className="text-sm whitespace-pre-wrap">{ticket.antwort}</p>
          </div>
        )}

        {canManage && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="ticket-status" className="text-sm font-medium mb-1 block">Status</label>
                <Select value={status} onValueChange={(v: any) => { setStatus(v); setSaveError(''); }}>
                  <SelectTrigger id="ticket-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFFEN">Offen</SelectItem>
                    <SelectItem value="IN_BEARBEITUNG">In Bearbeitung</SelectItem>
                    <SelectItem value="ERLEDIGT">Erledigt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label htmlFor="ticket-antwort" className="text-sm font-medium mb-1 block">Antwort</label>
              <Textarea
                id="ticket-antwort"
                value={antwort}
                onChange={(e) => { setAntwort(e.target.value); setSaveError(''); }}
                placeholder="Antwort an den Ersteller..."
                rows={3}
              />
            </div>
            {saveError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-[#3e8f88] hover:bg-[#2a6b64]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Speichern
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Create Ticket Form ----
function CreateTicketForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { data: session } = useSession() || {};
  const [titel, setTitel] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [prioritaet, setPrioritaet] = useState('MITTEL');
  const [kategorie, setKategorie] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [footerError, setFooterError] = useState('');

  const handleSubmit = async () => {
    setFooterError('');
    if (!titel.trim() || !beschreibung.trim()) {
      setFooterError('Bitte Titel und Beschreibung ausfüllen.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(
        '/odata/SupportTickets',
        { titel: titel.trim(), beschreibung: beschreibung.trim(), prioritaet, kategorie: kategorie || null },
        session
      );
      toast.success('Ihr Support-Ticket wurde erfolgreich erstellt.');
      onSuccess();
    } catch (err: unknown) {
      setFooterError(err instanceof ApiError ? err.message : 'Netzwerkfehler – bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Neues Support-Ticket erstellen</DialogTitle>
        <DialogDescription>Beschreiben Sie Ihr Anliegen möglichst genau.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <label htmlFor="ticket-titel" className="text-sm font-medium mb-1 block">Titel *</label>
          <Input id="ticket-titel" value={titel} onChange={(e) => { setTitel(e.target.value); setFooterError(''); }} placeholder="Kurze Zusammenfassung des Problems" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ticket-prioritaet" className="text-sm font-medium mb-1 block">Priorität</label>
            <Select value={prioritaet} onValueChange={setPrioritaet}>
              <SelectTrigger id="ticket-prioritaet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NIEDRIG">Niedrig</SelectItem>
                <SelectItem value="MITTEL">Mittel</SelectItem>
                <SelectItem value="HOCH">Hoch</SelectItem>
                <SelectItem value="DRINGEND">Dringend</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="ticket-kategorie" className="text-sm font-medium mb-1 block">Kategorie</label>
            <Select value={kategorie} onValueChange={setKategorie}>
              <SelectTrigger id="ticket-kategorie">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {KATEGORIEN.map(k => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label htmlFor="ticket-beschreibung" className="text-sm font-medium mb-1 block">Beschreibung *</label>
          <Textarea
            id="ticket-beschreibung"
            value={beschreibung}
            onChange={(e) => { setBeschreibung(e.target.value); setFooterError(''); }}
            placeholder="Beschreiben Sie das Problem oder Anliegen im Detail...\n\nBitte geben Sie an:\n- Was genau passiert ist\n- Welche Schritte Sie durchgeführt haben\n- Was Sie erwartet hätten"
            rows={6}
          />
        </div>
      </div>
      <DialogFooter className="flex-col gap-2">
        {footerError && (
          <div className="w-full flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{footerError}</span>
          </div>
        )}
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-[#3e8f88] hover:bg-[#2a6b64]">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Ticket erstellen
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

// ============================================================
// FAQ TAB
// ============================================================
function FAQTab({ canManage }: { canManage: boolean }) {
  const { data: session } = useSession() || {};
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  const loadFaqs = useCallback(async () => {
    if (!session) return;
    try {
      const data = await apiClient.get<ODataResponse<FAQ>>('/odata/FAQs?$orderby=SortOrder', session);
      setFaqs(data.value ?? []);
    } catch (err) {
      console.error('Fehler beim Laden der FAQs:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { loadFaqs(); }, [loadFaqs]);

  const handleDelete = async (id: string) => {
    if (!confirm('FAQ wirklich löschen?')) return;
    try {
      await apiClient.delete(`/odata/FAQs(${id})`, session);
      toast.success('FAQ gelöscht');
      loadFaqs();
    } catch {
      toast.error('Fehler');
    }
  };

  const filteredFaqs = faqs.filter(f =>
    !searchQuery ||
    f.frage.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.antwort.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by category
  const grouped = filteredFaqs.reduce<Record<string, FAQ[]>>((acc, faq) => {
    const cat = faq.kategorie || 'Allgemein';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(faq);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="FAQ durchsuchen..."
            aria-label="FAQ durchsuchen"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {canManage && (
          <Dialog open={showCreateDialog || !!editingFaq} onOpenChange={(open) => {
            if (!open) { setShowCreateDialog(false); setEditingFaq(null); }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#3e8f88] hover:bg-[#2a6b64]" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Neue FAQ
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <FAQForm
                faq={editingFaq}
                onSuccess={() => { setShowCreateDialog(false); setEditingFaq(null); loadFaqs(); }}
                onCancel={() => { setShowCreateDialog(false); setEditingFaq(null); }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#3e8f88]" />
        </div>
      ) : filteredFaqs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HelpCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Keine FAQ-Einträge gefunden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{cat}</h3>
              <div className="space-y-2">
                {items.map((faq) => (
                  <Card key={faq.id} className="overflow-hidden">
                    {/* UI-21-Fix: Vorher war die gesamte Kopfzeile ein <button>
                        (Auf-/Zuklapp-Trigger), der die Bearbeiten-/Löschen-Buttons
                        verschachtelt enthielt - ungültiges HTML (Button-in-Button),
                        dessen Fokus-/Aktivierungssemantik uneinheitlich ist. Jetzt
                        eine nicht-interaktive Kopfzeile mit einem eigenen,
                        auf Titel+Chevron begrenzten Trigger-Button und den
                        Aktions-Buttons als echten Geschwistern - kein stopPropagation
                        mehr nötig, da nichts mehr verschachtelt ist. */}
                    <div className="w-full flex items-center gap-1">
                      <button
                        type="button"
                        className="flex-1 min-w-0 flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                        aria-expanded={expandedId === faq.id}
                      >
                        <HelpCircle className="h-5 w-5 text-[#3e8f88] shrink-0" />
                        <span className="font-medium text-sm truncate">{faq.frage}</span>
                      </button>
                      <div className="flex items-center gap-2 shrink-0 pr-4">
                        {canManage && (
                          <>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              aria-label={`FAQ bearbeiten: ${faq.frage}`}
                              onClick={() => setEditingFaq(faq)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              aria-label={`FAQ löschen: ${faq.frage}`}
                              onClick={() => handleDelete(faq.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted transition-colors"
                          onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                          aria-label={expandedId === faq.id ? 'Antwort einklappen' : 'Antwort anzeigen'}
                          aria-expanded={expandedId === faq.id}
                        >
                          {expandedId === faq.id ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                    {expandedId === faq.id && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="pl-8 border-l-2 border-[#3e8f88]/20 ml-2.5">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{faq.antwort}</p>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- FAQ Form ----
function FAQForm({ faq, onSuccess, onCancel }: { faq: FAQ | null; onSuccess: () => void; onCancel: () => void }) {
  const { data: session } = useSession() || {};
  const [frage, setFrage] = useState(faq?.frage || '');
  const [antwort, setAntwort] = useState(faq?.antwort || '');
  const [kategorie, setKategorie] = useState(faq?.kategorie || '');
  const [sortOrder, setSortOrder] = useState(faq?.sortOrder ?? 0);
  const [submitting, setSubmitting] = useState(false);

  const FAQ_KATEGORIEN = ['Allgemein', 'Klienten', 'Einsätze', 'Abrechnungen', 'Berichte', 'System', 'Organisation'];

  const handleSubmit = async () => {
    if (!frage.trim() || !antwort.trim()) {
      toast.error('Bitte Frage und Antwort ausfüllen');
      return;
    }
    setSubmitting(true);
    try {
      const body = { frage: frage.trim(), antwort: antwort.trim(), kategorie: kategorie || null, sortOrder };
      if (faq) {
        await apiClient.patch(`/odata/FAQs(${faq.id})`, body, session);
      } else {
        await apiClient.post('/odata/FAQs', body, session);
      }
      toast.success(faq ? 'FAQ aktualisiert' : 'FAQ erstellt');
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : 'Netzwerkfehler');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{faq ? 'FAQ bearbeiten' : 'Neue FAQ erstellen'}</DialogTitle>
        <DialogDescription>Häufig gestellte Frage mit Antwort.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div>
          <label htmlFor="faq-frage" className="text-sm font-medium mb-1 block">Frage *</label>
          <Input id="faq-frage" value={frage} onChange={(e) => setFrage(e.target.value)} placeholder="Wie kann ich...?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="faq-kategorie" className="text-sm font-medium mb-1 block">Kategorie</label>
            <Select value={kategorie} onValueChange={setKategorie}>
              <SelectTrigger id="faq-kategorie">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {FAQ_KATEGORIEN.map(k => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="faq-sortierung" className="text-sm font-medium mb-1 block">Sortierung</label>
            <Input id="faq-sortierung" type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <div>
          <label htmlFor="faq-antwort" className="text-sm font-medium mb-1 block">Antwort *</label>
          <Textarea
            id="faq-antwort"
            value={antwort}
            onChange={(e) => setAntwort(e.target.value)}
            placeholder="Detaillierte Antwort..."
            rows={5}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Abbrechen</Button>
        <Button onClick={handleSubmit} disabled={submitting} className="bg-[#3e8f88] hover:bg-[#2a6b64]">
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {faq ? 'Speichern' : 'Erstellen'}
        </Button>
      </DialogFooter>
    </>
  );
}

// ============================================================
// SUCHE TAB — Globale Suche über alle BANDspirit-Daten
// ============================================================

// UI-09-Fix: Nur noch Typen, die die Suche tatsächlich liefern kann. Die
// übrigen Einträge (Klient, Kontakt, Intake, Arbeitsplatz, Berufsbild,
// Bericht, Massnahme, Gespräch, Einsatzplan, Abrechnung, Benutzer, Kreis)
// stammten aus einer anderen Produktvorlage (Klientenmanagement) und
// bezeichnen Entitäten, die es in BANDspirit gar nicht gibt bzw. die diese
// Suche nie durchsucht hat - ihr blosses Vorhandensein täuschte einen
// breiteren Suchumfang vor, als tatsächlich implementiert ist.
const TYP_ICONS: Record<string, React.ReactNode> = {
  'BI-Guide': <Newspaper className="h-4 w-4 text-primary" />,
  'Ticket': <Ticket className="h-4 w-4 text-amber-600" />,
};

const TYP_BADGES: Record<string, string> = {
  'BI-Guide': 'bg-primary/10 text-primary border-primary/20',
  'Ticket': 'bg-amber-50 text-amber-700 border-amber-200',
};

interface SucheResult {
  typ: string;
  titel: string;
  beschreibung: string;
  href: string;
  zusatzinfo?: string;
}

function SucheTab() {
  const { data: session } = useSession() || {};
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SucheResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filterTyp, setFilterTyp] = useState<string>('alle');
  // UI-07-Fix: "Suche fehlgeschlagen" muss von "keine Treffer" unterscheidbar
  // bleiben - beides ist sonst dieselbe leere Ergebnisliste.
  const [searchError, setSearchError] = useState(false);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      toast.warning('Bitte mindestens 2 Zeichen eingeben.');
      return;
    }
    if (!session) return;
    setLoading(true);
    setSearched(true);
    setSearchError(false);
    setFilterTyp('alle');
    try {
      // Globale Suche als parallele OData-Abfragen (BI-Guide-News + Support-Tickets).
      // Hinweis: Der frühere REST-Endpunkt durchsuchte weitere Domänen, für die es
      // (noch) keine OData-EntitySets gibt – siehe Migrations-Caveat.
      const escaped = q.toLowerCase().replace(/'/g, "''");
      const [news, tickets] = await Promise.all([
        apiClient.get<ODataResponse<{ id: string; titel: string; inhalt?: string }>>(
          `/odata/BiGuideNews?$filter=${encodeURIComponent(`contains(tolower(Titel),'${escaped}')`)}&$orderby=CreatedAt desc`,
          session
        ),
        apiClient.get<ODataResponse<{ id: string; titel: string; beschreibung?: string }>>(
          `/odata/SupportTickets?$filter=${encodeURIComponent(`contains(tolower(Titel),'${escaped}')`)}&$orderby=CreatedAt desc`,
          session
        ),
      ]);
      // UI-10-Fix: Statt jeden Treffer auf dieselbe unspezifische Liste zu
      // verweisen, verlinkt jedes Ergebnis über eine validierte Datensatz-ID
      // als Query-Parameter direkt auf den passenden Eintrag - die
      // Zielseite klappt/markiert ihn dann automatisch auf.
      const mapped: SucheResult[] = [
        ...(news.value ?? []).map((n) => ({
          typ: 'BI-Guide',
          titel: n.titel,
          beschreibung: n.inhalt ?? '',
          href: `/organisation/bi-guide?newsId=${encodeURIComponent(n.id)}`,
        })),
        ...(tickets.value ?? []).map((t) => ({
          typ: 'Ticket',
          titel: t.titel,
          beschreibung: t.beschreibung ?? '',
          href: `/hilfe?tab=tickets&ticketId=${encodeURIComponent(t.id)}`,
        })),
      ];
      setResults(mapped);
    } catch (e) {
      console.error(e);
      toast.error('Suche konnte nicht durchgeführt werden.');
      setSearchError(true);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, session]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  // Available types from results
  const availableTypes = Array.from(new Set(results.map((r) => r.typ))).sort();
  const filtered = filterTyp === 'alle' ? results : results.filter((r) => r.typ === filterTyp);

  // Group by type
  const grouped = filtered.reduce<Record<string, SucheResult[]>>((acc, r) => {
    if (!acc[r.typ]) acc[r.typ] = [];
    acc[r.typ].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Search prompt */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {/* UI-09-Fix: Beschreibung entsprach nicht der tatsächlichen Suche (durchsuchte
                  zuvor u. a. "Klienten, Kontakte, Intakes" - Begriffe aus einem anderen
                  Produkt, die es in BANDspirit gar nicht gibt). Jetzt wird nur beworben,
                  was tatsächlich durchsucht wird. */}
              Durchsucht die Titel der BI-Guide-Neuigkeiten und der Support-Tickets.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Titel-Stichwort eingeben (News oder Ticket)…"
                  aria-label="Globale Suche: Titel-Stichwort eingeben"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <Button onClick={handleSearch} disabled={loading} className="gap-2 min-w-[100px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
                Suchen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {searched && !loading && (
        <>
          {searchError ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-amber-500 mb-3" />
                <p className="text-muted-foreground font-medium">Suche konnte nicht durchgeführt werden</p>
                <p className="text-sm text-muted-foreground mt-1">Die Daten sind derzeit nicht verfügbar oder es besteht keine Verbindung.</p>
                <Button variant="outline" className="mt-4" onClick={handleSearch}>
                  <SearchIcon className="h-4 w-4 mr-2" /> Erneut versuchen
                </Button>
              </CardContent>
            </Card>
          ) : results.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <SearchIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">Keine Ergebnisse gefunden</p>
                <p className="text-sm text-muted-foreground mt-1">Versuchen Sie einen anderen Suchbegriff.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Results header with filter */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{results.length}</span> Ergebnis{results.length !== 1 ? 'se' : ''} gefunden
                </p>
                {availableTypes.length > 1 && (
                  <Select value={filterTyp} onValueChange={setFilterTyp}>
                    <SelectTrigger className="w-[200px]" aria-label="Suchergebnisse nach Bereich filtern">
                      <SelectValue placeholder="Alle Bereiche" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alle">Alle Bereiche ({results.length})</SelectItem>
                      {availableTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t} ({results.filter((r) => r.typ === t).length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Grouped results */}
              <div className="space-y-4">
                {Object.entries(grouped).map(([typ, items]) => (
                  <div key={typ}>
                    <div className="flex items-center gap-2 mb-2">
                      {TYP_ICONS[typ] ?? <SearchIcon className="h-4 w-4 text-muted-foreground" />}
                      <h3 className="font-semibold text-sm">{typ}</h3>
                      <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((r, idx) => (
                        <Link
                          key={`${r.typ}-${idx}`}
                          href={r.href}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/60 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className={`text-[10px] ${TYP_BADGES[r.typ] ?? ''}`}>
                                {r.typ}
                              </Badge>
                              <p className="font-medium text-sm truncate">{r.titel}</p>
                            </div>
                            {r.beschreibung && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.beschreibung}</p>
                            )}
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Durchsuche alle BANDspirit-Daten...</span>
        </div>
      )}
    </div>
  );
}