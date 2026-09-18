'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
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
  SearchIcon, ExternalLink, Users, ClipboardList, Building2, FileText, Receipt, Contact, Calendar, Target, LifeBuoy, Newspaper, CircleDot, BookOpen, UserCog, Briefcase,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
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
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  assignedTo: { id: string; name: string; email: string } | null;
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

  const tabParam = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'faq' ? 'faq' : tabParam === 'suche' ? 'suche' : 'tickets');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hilfe & Support</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Support-Tickets, FAQ oder durchsuchen Sie alle Informationen in BANDspirit.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('alle');
  const [filterPrioritaet, setFilterPrioritaet] = useState<string>('alle');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px]">
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
            <SelectTrigger className="w-[160px]">
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
        <TicketDetail
          ticket={selectedTicket}
          canManage={canManage}
          onClose={() => setSelectedTicket(null)}
          onUpdated={() => { loadTickets(); setSelectedTicket(null); }}
        />
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
            <p className="text-xs text-muted-foreground mt-0.5">{ticket.createdBy.name}</p>
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
      toast({ title: 'Ticket aktualisiert' });
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
              Erstellt von {ticket.createdBy.name} am{' '}
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
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={status} onValueChange={(v: any) => { setStatus(v); setSaveError(''); }}>
                  <SelectTrigger>
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
              <label className="text-sm font-medium mb-1 block">Antwort</label>
              <Textarea
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
      toast({ title: 'Ticket erstellt', description: 'Ihr Support-Ticket wurde erfolgreich erstellt.' });
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
          <label className="text-sm font-medium mb-1 block">Titel *</label>
          <Input value={titel} onChange={(e) => { setTitel(e.target.value); setFooterError(''); }} placeholder="Kurze Zusammenfassung des Problems" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Priorität</label>
            <Select value={prioritaet} onValueChange={setPrioritaet}>
              <SelectTrigger>
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
            <label className="text-sm font-medium mb-1 block">Kategorie</label>
            <Select value={kategorie} onValueChange={setKategorie}>
              <SelectTrigger>
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
          <label className="text-sm font-medium mb-1 block">Beschreibung *</label>
          <Textarea
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
      toast({ title: 'FAQ gelöscht' });
      loadFaqs();
    } catch {
      toast({ title: 'Fehler', variant: 'destructive' });
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
                    <button
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <HelpCircle className="h-5 w-5 text-[#3e8f88] shrink-0" />
                        <span className="font-medium text-sm">{faq.frage}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {canManage && (
                          <>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); setEditingFaq(faq); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDelete(faq.id); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {expandedId === faq.id ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
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
      toast({ title: 'Bitte Frage und Antwort ausfüllen', variant: 'destructive' });
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
      toast({ title: faq ? 'FAQ aktualisiert' : 'FAQ erstellt' });
      onSuccess();
    } catch (err: unknown) {
      toast({ title: 'Fehler', description: err instanceof ApiError ? err.message : 'Netzwerkfehler', variant: 'destructive' });
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
          <label className="text-sm font-medium mb-1 block">Frage *</label>
          <Input value={frage} onChange={(e) => setFrage(e.target.value)} placeholder="Wie kann ich...?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Kategorie</label>
            <Select value={kategorie} onValueChange={setKategorie}>
              <SelectTrigger>
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
            <label className="text-sm font-medium mb-1 block">Sortierung</label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Antwort *</label>
          <Textarea
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

const TYP_ICONS: Record<string, React.ReactNode> = {
  'Klient': <Users className="h-4 w-4 text-blue-600" />,
  'Kontakt': <Contact className="h-4 w-4 text-indigo-600" />,
  'Intake': <ClipboardList className="h-4 w-4 text-amber-600" />,
  'Arbeitsplatz': <Building2 className="h-4 w-4 text-purple-600" />,
  'Berufsbild': <Briefcase className="h-4 w-4 text-teal-600" />,
  'Bericht': <FileText className="h-4 w-4 text-green-600" />,
  'Massnahme': <Target className="h-4 w-4 text-rose-600" />,
  'Gespräch': <Calendar className="h-4 w-4 text-sky-600" />,
  'Einsatzplan': <Calendar className="h-4 w-4 text-emerald-600" />,
  'Abrechnung': <Receipt className="h-4 w-4 text-orange-600" />,
  'Benutzer': <UserCog className="h-4 w-4 text-gray-600" />,
  'BI-Guide': <Newspaper className="h-4 w-4 text-primary" />,
  'FAQ': <HelpCircle className="h-4 w-4 text-violet-600" />,
  'Ticket': <Ticket className="h-4 w-4 text-amber-600" />,
  'Kreis': <CircleDot className="h-4 w-4 text-primary" />,
};

const TYP_BADGES: Record<string, string> = {
  'Klient': 'bg-blue-50 text-blue-700 border-blue-200',
  'Kontakt': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Intake': 'bg-amber-50 text-amber-700 border-amber-200',
  'Arbeitsplatz': 'bg-purple-50 text-purple-700 border-purple-200',
  'Berufsbild': 'bg-teal-50 text-teal-700 border-teal-200',
  'Bericht': 'bg-green-50 text-green-700 border-green-200',
  'Massnahme': 'bg-rose-50 text-rose-700 border-rose-200',
  'Gespräch': 'bg-sky-50 text-sky-700 border-sky-200',
  'Einsatzplan': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Abrechnung': 'bg-orange-50 text-orange-700 border-orange-200',
  'Benutzer': 'bg-gray-50 text-gray-700 border-gray-200',
  'BI-Guide': 'bg-primary/10 text-primary border-primary/20',
  'FAQ': 'bg-violet-50 text-violet-700 border-violet-200',
  'Ticket': 'bg-amber-50 text-amber-700 border-amber-200',
  'Kreis': 'bg-primary/10 text-primary border-primary/20',
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

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      toast({ title: 'Hinweis', description: 'Bitte mindestens 2 Zeichen eingeben.', variant: 'destructive' });
      return;
    }
    if (!session) return;
    setLoading(true);
    setSearched(true);
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
      const mapped: SucheResult[] = [
        ...(news.value ?? []).map((n) => ({
          typ: 'BI-Guide',
          titel: n.titel,
          beschreibung: n.inhalt ?? '',
          href: '/organisation/bi-guide',
        })),
        ...(tickets.value ?? []).map((t) => ({
          typ: 'Ticket',
          titel: t.titel,
          beschreibung: t.beschreibung ?? '',
          href: '/hilfe?tab=tickets',
        })),
      ];
      setResults(mapped);
    } catch (e) {
      console.error(e);
      toast({ title: 'Fehler', description: 'Suche konnte nicht durchgeführt werden.', variant: 'destructive' });
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
              Durchsuchen Sie alle Informationen in BANDspirit — Klienten, Kontakte, Intakes, Berichte, Gespräche, Einsätze und mehr.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suchbegriff eingeben... (z.B. Name, Firma, Standort, Stichwort)"
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
          {results.length === 0 ? (
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
                    <SelectTrigger className="w-[200px]">
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