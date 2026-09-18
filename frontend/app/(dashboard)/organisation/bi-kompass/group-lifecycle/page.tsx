'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { hasPermission } from '@/lib/rbac';
import { formatDate } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { ApiError } from '@/lib/errors';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Play,
  ClipboardCheck,
  Search,
  CircleDot,
  Users,
  Target,
  Shield,
  FileText,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Clock,
  Zap,
  Eye,
  Compass,
  AlertCircle,
} from 'lucide-react';

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────
interface CircleReview {
  id: string;
  reviewDatum: string;
  ergebnis: string;
  notizen: string | null;
  massnahmen: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
}

interface CircleLifecycle {
  id: string;
  name: string;
  purpose: string | null;
  domain: string | null;
  isActive: boolean;
  lifecyclePhase: string;
  lastReviewDate: string | null;
  nextReviewDate: string | null;
  reviewNotiz: string | null;
  archivierungsGrund: string | null;
  archivierungsDatum: string | null;
  createdAt: string;
  parentName: string | null;
  childrenCount: number;
  leadLink: { id: string; name: string } | null;
  hasPurpose: boolean;
  hasLeadLink: boolean;
  hasRecentReview: boolean;
  needsReview: boolean;
  _count: { roles: number; s3Meetings: number; drivers: number; decisions: number; circleReviews: number };
  recentReviews: CircleReview[];
  openDrivers: number;
}

interface KPIs {
  totalCircles: number;
  activeCircles: number;
  archivedCircles: number;
  circlesWithPurposeAndLeadPercent: number;
  circlesWithPurposeAndLeadCount: number;
  circlesWithRecentReviewPercent: number;
  circlesWithRecentReviewCount: number;
  archivedThisQuarterCount: number;
  circlesWithPurpose: number;
  circlesWithLeadLink: number;
}

// ──────────────────────────────────────────
// Phase Badge
// ──────────────────────────────────────────
const PHASE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ANLAGE: { label: 'Anlage', color: '!bg-blue-100 !text-blue-800 !border-transparent', icon: <Play className="h-3 w-3" /> },
  BETRIEB: { label: 'Betrieb', color: '!bg-green-100 !text-green-800 !border-transparent', icon: <CheckCircle2 className="h-3 w-3" /> },
  REVIEW: { label: 'Review', color: '!bg-amber-100 !text-amber-800 !border-transparent', icon: <RefreshCw className="h-3 w-3" /> },
  ARCHIVIERT: { label: 'Archiviert', color: '!bg-gray-100 !text-gray-600 !border-transparent', icon: <Archive className="h-3 w-3" /> },
};

const REVIEW_ERGEBNIS_LABELS: Record<string, string> = {
  WEITERFUEHREN: 'Weiterführen',
  KONSOLIDIEREN: 'Konsolidieren',
  ARCHIVIEREN: 'Archivieren',
};

function PhaseBadge({ phase }: { phase: string }) {
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.BETRIEB;
  return (
    <Badge className={`gap-1 ${config.color}`}>
      {config.icon} {config.label}
    </Badge>
  );
}

// ──────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────
function KPICard({ title, value, subtitle, target, icon, color }: {
  title: string; value: number | string; subtitle?: string; target?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {target && <p className="text-xs text-muted-foreground mt-0.5">Ziel: {target}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────
// Process Phase Visualization
// ──────────────────────────────────────────
function ProcessPhases() {
  const phases = [
    { id: 'A', title: 'Phase A: Anlage', steps: ['Spannung/Treiber erfassen', 'Treiber prüfen', 'Consent-Entscheidung', 'Anlage umsetzen'], color: 'bg-blue-500' },
    { id: 'B', title: 'Phase B: Betrieb', steps: ['Betriebsregeln veröffentlichen', 'Inhalte & Zusammenarbeit steuern'], color: 'bg-green-500' },
    { id: 'C', title: 'Phase C: Review', steps: ['Review durchführen (quartalsweise)', 'Review-Entscheidung (Consent)'], color: 'bg-amber-500' },
    { id: 'D', title: 'Phase D: Archivierung', steps: ['Wissenssicherung', 'Archivieren', 'Abschlussdokumentation'], color: 'bg-gray-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {phases.map((phase, idx) => (
        <motion.div
          key={phase.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Card className="h-full relative">
            <div className={`h-1.5 ${phase.color} rounded-t-lg`} />
            <CardContent className="p-4 pt-3">
              <p className="font-semibold text-sm mb-2">{phase.title}</p>
              <ul className="space-y-1">
                {phase.steps.map((step, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    {step}
                  </li>
                ))}
              </ul>
            </CardContent>
            {idx < 3 && (
              <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                <ArrowRight className="h-5 w-5 text-muted-foreground/40" />
              </div>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────
// RACI Matrix
// ──────────────────────────────────────────
function RACIMatrix() {
  const [expanded, setExpanded] = useState(false);
  const raci = [
    { activity: 'Spannung/Treiber melden', initiator: 'R', processOwner: '—', leadLink: 'A', admin: '—', biGuide: '—' },
    { activity: 'Treiber prüfen, Zweck & Domäne klären', initiator: 'I', processOwner: 'R', leadLink: 'A', admin: '—', biGuide: '—' },
    { activity: 'Consent-Entscheid melden', initiator: '—', processOwner: '—', leadLink: 'A', admin: '—', biGuide: '—' },
    { activity: 'Consent-Entscheid bewilligen', initiator: '—', processOwner: '—', leadLink: 'I', admin: 'R', biGuide: 'A' },
    { activity: 'Consent-Entscheid umsetzen', initiator: '—', processOwner: '—', leadLink: 'A', admin: 'R', biGuide: '' },
    { activity: 'Review durchführen (quartalsweise)', initiator: '—', processOwner: 'R', leadLink: 'A', admin: '—', biGuide: '' },
    { activity: 'Archivierung durchführen', initiator: '—', processOwner: '—', leadLink: 'A', admin: 'R', biGuide: '' },
  ];

  const cellColor = (val: string) => {
    if (val === 'R') return 'bg-blue-50 text-blue-700 font-semibold';
    if (val === 'A') return 'bg-green-50 text-green-700 font-semibold';
    if (val === 'C') return 'bg-amber-50 text-amber-700 font-semibold';
    if (val === 'I') return 'bg-purple-50 text-purple-700 font-semibold';
    return 'text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">RACI-Matrix — Rollen & Verantwortlichkeiten</CardTitle>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        <div className="flex gap-3 mt-2">
          <Badge variant="outline" className="text-xs gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> R = Responsible</Badge>
          <Badge variant="outline" className="text-xs gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> A = Accountable</Badge>
          <Badge variant="outline" className="text-xs gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> C = Consulted</Badge>
          <Badge variant="outline" className="text-xs gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> I = Informed</Badge>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-3 font-medium">Aktivität</th>
                  <th className="text-center py-2 px-2 font-medium">Initiator</th>
                  <th className="text-center py-2 px-2 font-medium">Process Owner</th>
                  <th className="text-center py-2 px-2 font-medium">Lead Link</th>
                  <th className="text-center py-2 px-2 font-medium">Administrator</th>
                  <th className="text-center py-2 px-2 font-medium">BI-Guide</th>
                </tr>
              </thead>
              <tbody>
                {raci.map((row, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 px-3 text-xs">{row.activity}</td>
                    <td className={`text-center py-2 px-2 text-xs ${cellColor(row.initiator)}`}>{row.initiator}</td>
                    <td className={`text-center py-2 px-2 text-xs ${cellColor(row.processOwner)}`}>{row.processOwner}</td>
                    <td className={`text-center py-2 px-2 text-xs ${cellColor(row.leadLink)}`}>{row.leadLink}</td>
                    <td className={`text-center py-2 px-2 text-xs ${cellColor(row.admin)}`}>{row.admin}</td>
                    <td className={`text-center py-2 px-2 text-xs ${cellColor(row.biGuide)}`}>{row.biGuide}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────
// Risks Table
// ──────────────────────────────────────────
function RisksTable() {
  const [expanded, setExpanded] = useState(false);
  const risks = [
    { risk: 'Kreis-Wildwuchs / Redundanz', control: 'Reviewpflicht + Naming-Konvention + Treiber-Klarheit', responsible: 'Process Owner / Administratoren' },
    { risk: 'Wissensverlust bei Archivierung', control: 'Wissenssicherung vor Archivierung (Pflicht)', responsible: 'Process Owner' },
    { risk: 'Unklare Domäne / Entscheidungsrechte', control: 'Domäne in Betriebsregeln dokumentieren; Consent bei Änderungen', responsible: 'BI-Guide / Lead Link' },
    { risk: 'Falsche Sichtbarkeit / Datenschutz', control: 'Sichtbarkeitsprüfung bei Anlage', responsible: 'BI-Guide / Lead Link' },
    { risk: 'Verwaiste Kreise ohne Lead Link', control: 'Review mit Prüfung Lead-Link; Rolle nachbesetzen', responsible: 'BI-Guide / Lead Link' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Risiken & Kontrollen</CardTitle>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2 px-3 font-medium">Risiko</th>
                  <th className="text-left py-2 px-3 font-medium">Kontrolle / Massnahme</th>
                  <th className="text-left py-2 px-3 font-medium">Verantwortlich</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 px-3 text-xs font-medium">{r.risk}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{r.control}</td>
                    <td className="py-2 px-3 text-xs">{r.responsible}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────
export default function GroupLifecyclePage() {
  const { data: session } = useSession() || {};
  const role = (session?.user as any)?.role;
  const canEdit = hasPermission(role, 'org:circle:update');

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [circles, setCircles] = useState<CircleLifecycle[]>([]);
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'prozess' | 'kreise'>('dashboard');

  // Review Dialog
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewCircle, setReviewCircle] = useState<CircleLifecycle | null>(null);
  const [reviewErgebnis, setReviewErgebnis] = useState('WEITERFUEHREN');
  const [reviewNotizen, setReviewNotizen] = useState('');
  const [reviewMassnahmen, setReviewMassnahmen] = useState('');
  const [saving, setSaving] = useState(false);

  // Expanded reviews per circle
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    if (!session) return;
    try {
      // Aggregiertes REST-Endpoint (KPIs + berechnete Flags), kein OData-Äquivalent
      const data = await apiClient.get<{ kpis: KPIs; circles: CircleLifecycle[] }>(
        '/api/org/circle-lifecycle',
        session
      );
      setKpis(data.kpis);
      setCircles(data.circles);
    } catch (error: unknown) {
      console.error('Fehler beim Laden:', error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredCircles = circles.filter(c => {
    if (search) {
      const s = search.toLowerCase();
      if (!c.name.toLowerCase().includes(s) && !(c.purpose || '').toLowerCase().includes(s)) return false;
    }
    if (phaseFilter !== 'all' && c.lifecyclePhase !== phaseFilter) return false;
    if (reviewFilter === 'needs_review' && !c.needsReview) return false;
    if (reviewFilter === 'reviewed' && c.needsReview) return false;
    return true;
  });

  const handleReview = async () => {
    if (!reviewCircle) return;
    setSaving(true);
    try {
      await apiClient.post(
        '/api/org/circle-lifecycle',
        {
          action: 'review',
          circleId: reviewCircle.id,
          ergebnis: reviewErgebnis,
          notizen: reviewNotizen || null,
          massnahmen: reviewMassnahmen || null,
        },
        session
      );
      toast.success(`Review für «${reviewCircle.name}» gespeichert`);
      setReviewDialogOpen(false);
      setReviewNotizen('');
      setReviewMassnahmen('');
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : 'Netzwerkfehler');
    } finally {
      setSaving(false);
    }
  };

  const handlePhaseChange = async (circleId: string, phase: string, name: string) => {
    try {
      await apiClient.post(
        '/api/org/circle-lifecycle',
        { action: 'phase', circleId, phase },
        session
      );
      toast.success(`Phase von «${name}» auf ${PHASE_CONFIG[phase]?.label || phase} geändert`);
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof ApiError ? error.message : 'Netzwerkfehler');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/organisation/bi-kompass" className="hover:text-primary transition-colors flex items-center gap-1">
              <Compass className="h-4 w-4" /> BI-Kompass
            </Link>
            <span>/</span>
            <span>Life Cycle Prozess</span>
          </div>
          <h1 className="text-2xl font-bold">Life Cycle Prozess</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kreise strukturiert anlegen, nutzen, reviewen und archivieren (KVP)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Version 1.0</Badge>
          <Badge variant="outline" className="text-xs">ISO 9001: Kap. 4.4, 6.1, 8.1, 9.1, 10.3</Badge>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        {[
          { id: 'dashboard' as const, label: 'Dashboard & KPIs', icon: <TrendingUp className="h-4 w-4" /> },
          { id: 'kreise' as const, label: 'Kreis-Übersicht', icon: <CircleDot className="h-4 w-4" /> },
          { id: 'prozess' as const, label: 'Prozessbeschreibung', icon: <FileText className="h-4 w-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Dashboard & KPIs */}
      {activeTab === 'dashboard' && kpis && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Aktive Kreise"
              value={kpis.activeCircles}
              subtitle={`${kpis.archivedCircles} archiviert, ${kpis.totalCircles} total`}
              icon={<CircleDot className="h-5 w-5 text-primary" />}
              color="text-primary"
            />
            <KPICard
              title="Zweck + Lead Link"
              value={`${kpis.circlesWithPurposeAndLeadPercent}%`}
              subtitle={`${kpis.circlesWithPurposeAndLeadCount} von ${kpis.activeCircles} Kreisen`}
              target="≥ 90%"
              icon={<Target className="h-5 w-5 text-blue-600" />}
              color={kpis.circlesWithPurposeAndLeadPercent >= 90 ? 'text-green-600' : kpis.circlesWithPurposeAndLeadPercent >= 70 ? 'text-amber-600' : 'text-red-600'}
            />
            <KPICard
              title="Review (90 Tage)"
              value={`${kpis.circlesWithRecentReviewPercent}%`}
              subtitle={`${kpis.circlesWithRecentReviewCount} von ${kpis.activeCircles} Kreisen`}
              target="≥ 80%"
              icon={<RefreshCw className="h-5 w-5 text-amber-600" />}
              color={kpis.circlesWithRecentReviewPercent >= 80 ? 'text-green-600' : kpis.circlesWithRecentReviewPercent >= 60 ? 'text-amber-600' : 'text-red-600'}
            />
            <KPICard
              title="Archiviert (Quartal)"
              value={kpis.archivedThisQuarterCount}
              subtitle="Trend: steigend (Bereinigung)"
              icon={<Archive className="h-5 w-5 text-gray-500" />}
              color="text-gray-700"
            />
          </div>

          {/* Detail KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Kreise mit Zweck</p>
                    <p className="text-xl font-bold">{kpis.circlesWithPurpose} <span className="text-sm font-normal text-muted-foreground">/ {kpis.activeCircles}</span></p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-primary flex items-center justify-center">
                    <span className="text-xs font-bold">{kpis.activeCircles > 0 ? Math.round((kpis.circlesWithPurpose / kpis.activeCircles) * 100) : 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Kreise mit Lead Link</p>
                    <p className="text-xl font-bold">{kpis.circlesWithLeadLink} <span className="text-sm font-normal text-muted-foreground">/ {kpis.activeCircles}</span></p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-4 border-blue-500 flex items-center justify-center">
                    <span className="text-xs font-bold">{kpis.activeCircles > 0 ? Math.round((kpis.circlesWithLeadLink / kpis.activeCircles) * 100) : 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Review benötigt</p>
                    <p className="text-xl font-bold text-amber-600">{circles.filter(c => c.needsReview).length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Circles needing review */}
          {circles.some(c => c.needsReview) && (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-base text-amber-800">Kreise mit ausstehenden Reviews</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {circles.filter(c => c.needsReview).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center gap-3">
                        <CircleDot className="h-4 w-4 text-primary" />
                        <div>
                          <Link href={`/organisation/kreise/${c.id}`} className="font-medium text-sm hover:text-primary">{c.name}</Link>
                          <p className="text-xs text-muted-foreground">
                            {c.lastReviewDate ? `Letzter Review: ${formatDate(c.lastReviewDate)}` : 'Noch kein Review durchgeführt'}
                            {c.leadLink ? ` · Lead Link: ${c.leadLink.name}` : ' · Kein Lead Link'}
                          </p>
                        </div>
                      </div>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => {
                            setReviewCircle(c);
                            setReviewErgebnis('WEITERFUEHREN');
                            setReviewNotizen('');
                            setReviewMassnahmen('');
                            setReviewDialogOpen(true);
                          }}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Review
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* RACI + Risks */}
          <RACIMatrix />
          <RisksTable />
        </div>
      )}

      {/* TAB: Kreis-Übersicht */}
      {activeTab === 'kreise' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kreis suchen..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Phasen</SelectItem>
                <SelectItem value="ANLAGE">Anlage</SelectItem>
                <SelectItem value="BETRIEB">Betrieb</SelectItem>
                <SelectItem value="REVIEW">Review</SelectItem>
                <SelectItem value="ARCHIVIERT">Archiviert</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reviewFilter} onValueChange={setReviewFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Review-Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="needs_review">Review benötigt</SelectItem>
                <SelectItem value="reviewed">Review aktuell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Circle Cards */}
          <div className="space-y-3">
            {filteredCircles.length === 0 && (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Keine Kreise gefunden</CardContent></Card>
            )}
            {filteredCircles.map((c, idx) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className={`${c.needsReview ? 'border-amber-200' : ''} ${c.lifecyclePhase === 'ARCHIVIERT' ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/organisation/kreise/${c.id}`} className="font-semibold text-sm hover:text-primary">{c.name}</Link>
                          <PhaseBadge phase={c.lifecyclePhase} />
                          {c.needsReview && (
                            <Badge className="!bg-amber-100 !text-amber-800 !border-transparent text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" /> Review fällig
                            </Badge>
                          )}
                          {!c.hasPurpose && c.lifecyclePhase !== 'ARCHIVIERT' && (
                            <Badge className="!bg-red-100 !text-red-700 !border-transparent text-xs">Kein Zweck</Badge>
                          )}
                          {!c.hasLeadLink && c.lifecyclePhase !== 'ARCHIVIERT' && (
                            <Badge className="!bg-red-100 !text-red-700 !border-transparent text-xs">Kein Lead Link</Badge>
                          )}
                        </div>
                        {c.purpose && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.purpose}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {c.leadLink && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.leadLink.name}</span>}
                          {c.parentName && <span>↳ {c.parentName}</span>}
                          <span>{c._count.roles} Rollen</span>
                          {c.openDrivers > 0 && <span className="flex items-center gap-1 text-amber-600"><Zap className="h-3 w-3" /> {c.openDrivers} offene Spannungen</span>}
                          {c.lastReviewDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Review: {formatDate(c.lastReviewDate)}</span>}
                        </div>

                        {/* Recent Reviews expandable */}
                        {c.recentReviews.length > 0 && (
                          <div className="mt-2">
                            <button
                              onClick={() => setExpandedReviews(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              {c._count.circleReviews} Review{c._count.circleReviews !== 1 ? 's' : ''}
                              {expandedReviews[c.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                            {expandedReviews[c.id] && (
                              <div className="mt-2 space-y-2">
                                {c.recentReviews.map(r => (
                                  <div key={r.id} className="p-2 bg-muted/50 rounded text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{formatDate(r.reviewDatum)} — {REVIEW_ERGEBNIS_LABELS[r.ergebnis] || r.ergebnis}</span>
                                      <span className="text-muted-foreground">{r.createdBy.name}</span>
                                    </div>
                                    {r.notizen && <p className="text-muted-foreground mt-1">{r.notizen}</p>}
                                    {r.massnahmen && <p className="text-primary mt-1">Massnahmen: {r.massnahmen}</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {canEdit && c.lifecyclePhase !== 'ARCHIVIERT' && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-8"
                            onClick={() => {
                              setReviewCircle(c);
                              setReviewErgebnis('WEITERFUEHREN');
                              setReviewNotizen('');
                              setReviewMassnahmen('');
                              setReviewDialogOpen(true);
                            }}
                          >
                            <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Review
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Prozessbeschreibung */}
      {activeTab === 'prozess' && (
        <div className="space-y-6">
          {/* Meta */}
          <Card>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                
                <div><p className="text-xs text-muted-foreground">Version</p><p className="font-medium">1.0</p></div>
                <div><p className="text-xs text-muted-foreground">Gültig ab</p><p className="font-medium">30.06.2026</p></div>
                <div><p className="text-xs text-muted-foreground">ISO 9001 Bezug</p><p className="font-medium">Kap. 4.4, 6.1, 7.4, 7.5, 8.1, 9.1, 10.2, 10.3</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Process Phases Visualization */}
          <ProcessPhases />

          {/* Zweck */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">1. Zweck</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Diese Verfahrensanweisung stellt sicher, dass Kreise und Rollen strukturiert angelegt, zielgerichtet genutzt,
                regelmässig überprüft und bei Bedarf angepasst bzw. archiviert werden (KVP). Sie unterstützt dabei die Soziokratie-Prinzipien
                von Transparenz, kontinuierlichem Lernen und klaren Verantwortlichkeiten und Kompetenzen durch explizite Zwecke (Purpose)
                und Domänen sowie Richtlinien (BI-Kompass und Prozesse).
              </p>
            </CardContent>
          </Card>

          {/* Begriffe */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">3. Begriffe & Definitionen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-2 px-3 font-medium w-1/4">Begriff</th>
                      <th className="text-left py-2 px-3 font-medium">Definition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Kreis-Ziele', 'Konkrete, überprüfbare Ergebnisse (z.B. OKRs/KPIs) im Einklang mit Zweck, Domäne und Verantwortlichkeit'],
                      ['Process-Owner', 'Verantwortung für die Gesamtstruktur und Prozesse'],
                      ['Lead Link', 'Rolle, die die Priorisierung des Kreises sicherstellt und die Aktualität der Inhalte verantwortet (Consent-basiert)'],
                      ['Zweck', 'Sinn und Daseinszweck eines Kreises: Warum existiert er?'],
                      ['Domäne', 'Abgegrenzter Verantwortungsbereich, über den eine Rolle/ein Kreis autonom Entscheidungen treffen kann'],
                      ['Spannung/Treiber', 'Bedarf/Anlass (z.B. neue Initiative), der die Anlage, Anpassung oder Archivierung eines Kreises erforderlich macht'],
                      ['Consent', 'Entscheidung gilt als angenommen, wenn keine schwerwiegenden Einwände bestehen («good enough for now, safe enough to try»)'],
                      ['KVP', 'Kontinuierlicher Verbesserungsprozess'],
                      ['Soziokratie 3.0', 'Organisatorisches Rahmenwerk für partizipative Entscheidungsfindung und Selbstorganisation'],
                      ['BI-Kompass', 'Regelt wie Entscheidungen getroffen, Verantwortung übernommen und die Organisation weiterentwickelt wird'],
                      ['BI-Guide', 'Steuerungsgremium, entscheidet über Anlage, Änderung und Archivierung. Besteht aus den Lead Links aller Kreise.'],
                    ].map(([term, def], i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-3 font-medium text-xs">{term}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{def}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Detaillierte Phasen */}
          {[
            {
              title: 'Phase A: Anlage',
              color: 'border-blue-200',
              steps: [
                { step: 'Schritt 1: Spannung/Treiber erfassen', items: ['Spannung/Treiber (Auslöser): Organisations- und Personalentwicklung, Consent-Entscheide', 'Dokumentation: Antrag erstellen mit Zweck (1–2 Sätze), erwartete Laufzeit, History', 'Zielgruppe/Mitglieder definieren'] },
                { step: 'Schritt 2: Treiber prüfen', items: ['Existiert bereits ein Kreis mit passendem Zweck?', 'Ist Zweck klar und nicht redundant?', 'Ist die Domäne geklärt (wer darf was entscheiden)?', 'Konform zu Transparenz-/Datenschutzanforderungen?'] },
                { step: 'Schritt 3: Consent-Entscheidung & Mandat', items: ['BI-Guide initiiert Anlage/Änderung/Archivierung inkl. kurzer Begründung', 'Bei Einwand: Anpassung/Alternative integrieren, erneuter Consent', 'Dokumentation des Entscheids (Datum, Ergebnis, ggf. Einwände)'] },
                { step: 'Schritt 4: Anlage', items: ['Benennung gemäss Namenskonvention', 'Lead Link / Moderator / Dokumentator festlegen', 'Basis-Struktur anlegen (Richtlinien, Dokumente, Verlinkungen)'] },
              ],
            },
            {
              title: 'Phase B: Betrieb',
              color: 'border-green-200',
              steps: [
                { step: 'Schritt 5: Betriebsregeln veröffentlichen', items: ['Wird durch den BI-Compass geregelt (siehe PDMS)'] },
                { step: 'Schritt 6: Inhalte und Zusammenarbeit steuern', items: ['Lead Link stellt sicher: relevante Informationen sind auffindbar', 'Entscheidungen/Ergebnisse sind dokumentiert (mind. Kurzprotokoll)', 'Alte/irrelevante Inhalte werden bereinigt oder strukturiert'] },
              ],
            },
            {
              title: 'Phase C: Review (mind. quartalsweise)',
              color: 'border-amber-200',
              steps: [
                { step: 'Schritt 7: Review durchführen', items: ['Aktivität prüfen (Beiträge/Kommentare/Datei-Updates)', 'Relevanz zum Zweck/Treiber prüfen', 'Mitgliedschaft aktuell? Rollen/Verantwortungen korrekt?', 'Schnittstellen zu anderen Kreisen klar?'] },
                { step: 'Schritt 8: Review-Entscheidung (Consent)', items: ['Weiterführen (ggf. mit Massnahmen)', 'Konsolidieren (z.B. Zusammenlegen)', 'Archivieren (wenn Zweck erfüllt oder dauerhaft inaktiv)'] },
              ],
            },
            {
              title: 'Phase D: Archivierung',
              color: 'border-gray-300',
              steps: [
                { step: 'Schritt 9: Wissenssicherung', items: ['Ergebnisse, Lessons Learned, finale Dokumente/Links sichern', 'Ablageort definieren und dokumentieren'] },
                { step: 'Schritt 10: Archivieren', items: ['Kreis als «archiviert» kennzeichnen', 'Schreibrechte entziehen (wenn passend)'] },
                { step: 'Schritt 11: Abschlussdokumentation', items: ['Abschlussvermerk: Datum, Grund (Treiber), Verweis auf Wissensablage, Verantwortliche'] },
              ],
            },
          ].map((phase, pi) => (
            <Card key={pi} className={phase.color}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{phase.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {phase.steps.map((step, si) => (
                    <div key={si}>
                      <p className="font-medium text-sm mb-1">{step.step}</p>
                      <ul className="space-y-1 ml-4">
                        {step.items.map((item, ii) => (
                          <li key={ii} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Eingaben / Ausgaben */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">5. Eingaben & Ausgaben</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50/50 rounded-lg">
                  <p className="font-medium text-sm text-blue-800 mb-2">INPUT</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• Spannung/Treiber (1–2 Sätze)</li>
                    <li>• Gewünschte Benennung, Mitglieder & Sichtbarkeit</li>
                    <li>• Namensvorschlag nach Konvention</li>
                    <li>• Erwartete Laufzeit</li>
                  </ul>
                </div>
                <div className="p-3 bg-green-50/50 rounded-lg">
                  <p className="font-medium text-sm text-green-800 mb-2">OUTPUT</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• Kreis, Zweck, Domäne, Verantwortlichkeiten</li>
                    <li>• Strukturierte Inhalte & dokumentierte Ergebnisse</li>
                    <li>• Review-Protokoll (Kurzform)</li>
                    <li>• Archivierungsvermerk + Wissensablage</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dokumentierte Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">7. Dokumentierte Information / Nachweise</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Kreis-Anlage-Entscheid (Consent-Protokoll / Genehmigung durch BI-Guide)</li>
                <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Review-Protokoll (Kurzform, mind. quartalsweise)</li>
                <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Archivierungsvermerk inkl. Wissenslink</li>
              </ul>
            </CardContent>
          </Card>

          {/* RACI + Risks */}
          <RACIMatrix />
          <RisksTable />
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Review durchführen</DialogTitle>
            <DialogDescription>
              Kreis: <strong>{reviewCircle?.name}</strong>
              {reviewCircle?.lastReviewDate && (
                <> · Letzter Review: {formatDate(reviewCircle.lastReviewDate)}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Review-Ergebnis *</Label>
              <Select value={reviewErgebnis} onValueChange={setReviewErgebnis}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEITERFUEHREN">✅ Weiterführen</SelectItem>
                  <SelectItem value="KONSOLIDIEREN">🔄 Konsolidieren (Zusammenlegen)</SelectItem>
                  <SelectItem value="ARCHIVIEREN">📦 Archivieren</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Notizen / Begründung</Label>
              <Textarea
                className="mt-1"
                value={reviewNotizen}
                onChange={e => setReviewNotizen(e.target.value)}
                placeholder="Aktivität, Relevanz, Mitgliedschaft, Schnittstellen..."
                rows={3}
              />
            </div>
            <div>
              <Label className="text-sm">Massnahmen</Label>
              <Textarea
                className="mt-1"
                value={reviewMassnahmen}
                onChange={e => setReviewMassnahmen(e.target.value)}
                placeholder="Vereinbarte Massnahmen (falls zutreffend)..."
                rows={2}
              />
            </div>
            {reviewErgebnis === 'ARCHIVIEREN' && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Bei «Archivieren» wird der Kreis deaktiviert und als archiviert markiert.
                    Die Wissenssicherung (Ergebnisse, Lessons Learned) sollte vorgängig erfolgt sein.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleReview} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <ClipboardCheck className="h-4 w-4 mr-1" />}
              Review speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
