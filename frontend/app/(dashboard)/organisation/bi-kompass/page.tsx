'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { hasPermission } from '@/lib/rbac';
import { formatDate } from '@/lib/utils';
import { apiClient, getToken } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { ApiError } from '@/lib/errors';
import {
  Compass,
  Edit,
  History,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Clock,
  User,
  ArrowLeft,
  BookOpen,
  Check,
  RotateCcw,
  Hash,
  Upload,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────
interface BIKompassVersion {
  id: string;
  version: string;
  titel: string;
  inhalt?: string;
  aenderungen?: string | null;
  // UI-26-Fix: "gueltigAb" ist das bestehende, generische DateFrom-Feld
  // (fachliche Gültigkeit) - kein separates Backend-Feld nötig.
  dateFrom: string | null;
  isAktiv: boolean;
  createdAt: string;
  // UI-26-Fix: Backend liefert kein verschachteltes createdBy-Objekt (das gab
  // es nie) - nur die rohe ID. Name wird clientseitig über die Users-Liste
  // aufgelöst (siehe erstellerName-Helfer), mit gracefully-degradierendem
  // Fallback für Betrachter ohne user:read-Berechtigung.
  createdById: string | null;
}

interface Chapter {
  id: string; // slug
  number: string; // e.g. "1", "2.1", "TOC", "header"
  title: string;
  content: string; // raw markdown of this chapter (without ## heading)
  level: number; // 0=header, 1=main chapter
}

// ──────────────────────────────────────────
// Pastell-Farben je Kapitel
// ──────────────────────────────────────────
const CHAPTER_COLORS: Record<string, { bg: string; border: string; accent: string; icon: string }> = {
  header:  { bg: 'bg-slate-50',    border: 'border-slate-200',    accent: 'text-slate-600',    icon: 'text-slate-500' },
  toc:     { bg: 'bg-teal-50',     border: 'border-teal-200',     accent: 'text-teal-700',     icon: 'text-teal-500' },
  '1':     { bg: 'bg-sky-50',      border: 'border-sky-200',      accent: 'text-sky-700',      icon: 'text-sky-500' },
  '2':     { bg: 'bg-violet-50',   border: 'border-violet-200',   accent: 'text-violet-700',   icon: 'text-violet-500' },
  '3':     { bg: 'bg-amber-50',    border: 'border-amber-200',    accent: 'text-amber-700',    icon: 'text-amber-500' },
  '4':     { bg: 'bg-rose-50',     border: 'border-rose-200',     accent: 'text-rose-700',     icon: 'text-rose-500' },
  '5':     { bg: 'bg-emerald-50',  border: 'border-emerald-200',  accent: 'text-emerald-700',  icon: 'text-emerald-500' },
  '6':     { bg: 'bg-indigo-50',   border: 'border-indigo-200',   accent: 'text-indigo-700',   icon: 'text-indigo-500' },
  '7':     { bg: 'bg-pink-50',     border: 'border-pink-200',     accent: 'text-pink-700',     icon: 'text-pink-500' },
  '8':     { bg: 'bg-cyan-50',     border: 'border-cyan-200',     accent: 'text-cyan-700',     icon: 'text-cyan-500' },
  '9':     { bg: 'bg-orange-50',   border: 'border-orange-200',   accent: 'text-orange-700',   icon: 'text-orange-500' },
  '10':    { bg: 'bg-lime-50',     border: 'border-lime-200',     accent: 'text-lime-700',     icon: 'text-lime-500' },
  '11':    { bg: 'bg-fuchsia-50',  border: 'border-fuchsia-200',  accent: 'text-fuchsia-700',  icon: 'text-fuchsia-500' },
  '12':    { bg: 'bg-teal-50',     border: 'border-teal-200',     accent: 'text-teal-700',     icon: 'text-teal-500' },
};

function getChapterColor(chapter: Chapter) {
  return CHAPTER_COLORS[chapter.number] || CHAPTER_COLORS['1'];
}

// ──────────────────────────────────────────
// Markdown → Chapters parser
// ──────────────────────────────────────────
function parseChapters(markdown: string): Chapter[] {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const chapters: Chapter[] = [];
  let currentLines: string[] = [];
  let currentTitle = '';
  let currentNumber = 'header';

  const flush = () => {
    const content = currentLines.join('\n').trim();
    if (content || currentTitle) {
      const id = currentNumber === 'header'
        ? 'header'
        : currentNumber === 'toc'
          ? 'toc'
          : `kapitel-${currentNumber}`;
      chapters.push({
        id,
        number: currentNumber,
        title: currentTitle,
        content,
        level: currentNumber === 'header' ? 0 : 1,
      });
    }
  };

  for (const line of lines) {
    // Match ## headers (main chapters)
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      flush();
      currentLines = [];
      const heading = h2Match[1].trim();
      if (/inhaltsverzeichnis/i.test(heading)) {
        currentTitle = 'Inhaltsverzeichnis';
        currentNumber = 'toc';
      } else {
        const numMatch = heading.match(/^(\d+)\. (.+)$/);
        if (numMatch) {
          currentNumber = numMatch[1];
          currentTitle = numMatch[2];
        } else {
          currentNumber = String(chapters.length);
          currentTitle = heading;
        }
      }
      continue;
    }
    // Skip the main # title (it's in the header)
    if (line.startsWith('# ') && chapters.length === 0 && currentLines.length === 0) {
      currentTitle = line.replace(/^# /, '').trim();
      continue;
    }
    currentLines.push(line);
  }
  flush();
  return chapters;
}

function reassembleMarkdown(chapters: Chapter[]): string {
  return chapters.map((ch) => {
    if (ch.number === 'header') {
      return `# ${ch.title}\n\n${ch.content}`;
    }
    if (ch.number === 'toc') {
      return `## Inhaltsverzeichnis\n\n${ch.content}`;
    }
    return `## ${ch.number}. ${ch.title}\n\n${ch.content}`;
  }).join('\n\n---\n\n');
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────
export default function BIKompassPage() {
  const { data: session } = useSession() || {};
  const { toast } = useToast();

  // Data state
  const [aktiveVersion, setAktiveVersion] = useState<BIKompassVersion | null>(null);
  const [versionen, setVersionen] = useState<BIKompassVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVersionen, setShowVersionen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<BIKompassVersion | null>(null);

  // Edit state
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Full-document edit mode (when no chapters exist)
  const [fullEditMode, setFullEditMode] = useState(false);
  const [fullEditBuffer, setFullEditBuffer] = useState('');
  const [fullEditPreview, setFullEditPreview] = useState(false);

  // PDF upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Publish dialog
  const [publishing, setPublishing] = useState(false);
  const [publishVersion, setPublishVersion] = useState('');
  const [publishAenderungen, setPublishAenderungen] = useState('');
  const [publishGueltigAb, setPublishGueltigAb] = useState('');

  // Expanded chapters
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());

  // UI-26-Fix: Für die clientseitige Auflösung des Ersteller-Namens (kein
  // createdBy-Objekt vom Backend). Best effort - Betrachter ohne user:read
  // sehen dann einfach "Unbekannt" statt eines Absturzes.
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const erstellerName = (createdById: string | null) =>
    users.find((u) => u.id === createdById)?.name ?? 'Unbekannt';

  const userRole = (session?.user as { role?: string })?.role;
  const canManage = userRole ? hasPermission(userRole, 'biguide:manage') : false;

  // Parse chapters from active version
  const originalChapters = useMemo(() => {
    if (!aktiveVersion?.inhalt) return [];
    return parseChapters(aktiveVersion.inhalt);
  }, [aktiveVersion]);

  useEffect(() => {
    if (originalChapters.length > 0 && chapters.length === 0) {
      setChapters(originalChapters);
    }
  }, [originalChapters, chapters.length]);

  const loadAktiveVersion = useCallback(async () => {
    if (!session) return;
    try {
      // Aktive Version über OData-Filter laden (Collection → erstes Element)
      const data = await apiClient.get<ODataResponse<BIKompassVersion>>(
        '/odata/BiKompassVersions?$filter=IsAktiv eq true&$top=1',
        session
      );
      setAktiveVersion(data.value?.[0] ?? null);
    } catch (error: unknown) {
      console.error('Fehler beim Laden:', error);
    }
  }, [session]);

  const loadVersionen = useCallback(async () => {
    if (!session) return;
    try {
      const data = await apiClient.get<ODataResponse<BIKompassVersion>>(
        '/odata/BiKompassVersions?$orderby=CreatedAt desc',
        session
      );
      setVersionen(data.value ?? []);
    } catch (error: unknown) {
      console.error('Fehler:', error);
    }
  }, [session]);

  useEffect(() => {
    Promise.all([loadAktiveVersion(), loadVersionen()]).finally(() => setLoading(false));
  }, [loadAktiveVersion, loadVersionen]);

  useEffect(() => {
    if (!session) return;
    // Best effort - schlägt für Betrachter ohne user:read fehl, dann bleibt
    // erstellerName() beim Fallback "Unbekannt" statt abzustürzen.
    apiClient
      .get<ODataResponse<{ id: string; name: string }>>('/odata/Users?$select=id,name', session)
      .then((data) => setUsers(data.value ?? []))
      .catch(() => setUsers([]));
  }, [session]);

  // ── Chapter editing ──────────────────────
  const startChapterEdit = (chapterId: string) => {
    const ch = chapters.find((c) => c.id === chapterId);
    if (!ch) return;
    setEditingChapter(chapterId);
    setEditBuffer(ch.content);
    setShowPreview(false);
  };

  const saveChapterEdit = () => {
    if (editingChapter === null) return;
    setChapters((prev) =>
      prev.map((ch) =>
        ch.id === editingChapter ? { ...ch, content: editBuffer } : ch
      )
    );
    setEditingChapter(null);
    setHasChanges(true);
    toast({ title: 'Kapitel aktualisiert', description: 'Änderung vorgemerkt. Vergessen Sie nicht, die neue Version zu veröffentlichen.' });
  };

  const cancelChapterEdit = () => {
    setEditingChapter(null);
    setEditBuffer('');
    setShowPreview(false);
  };

  const discardAllChanges = () => {
    setChapters(originalChapters);
    setHasChanges(false);
    setEditingChapter(null);
    toast({ title: 'Änderungen verworfen', description: 'Alle Änderungen wurden zurückgesetzt.' });
  };

  // ── Full-document editing ─────────────────
  const startFullEdit = () => {
    const currentContent = aktiveVersion?.inhalt || '';
    setFullEditBuffer(currentContent);
    setFullEditPreview(false);
    setFullEditMode(true);
  };

  const saveFullEdit = () => {
    const newChapters = parseChapters(fullEditBuffer);
    setChapters(newChapters);
    setHasChanges(true);
    setFullEditMode(false);
    toast({
      title: 'Dokument aktualisiert',
      description: 'Änderungen vorgemerkt. Vergessen Sie nicht, die neue Version zu veröffentlichen.',
    });
  };

  const cancelFullEdit = () => {
    setFullEditMode(false);
    setFullEditBuffer('');
    setFullEditPreview(false);
  };

  // ── PDF upload ────────────────────────────
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset file input
    e.target.value = '';

    if (file.type !== 'application/pdf') {
      setUploadError('Nur PDF-Dateien werden unterstützt.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Die Datei darf maximal 20 MB gross sein.');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Multipart-Upload: apiClient erzwingt JSON, daher direktes fetch mit Bearer-Token
      const token = getToken(session);
      const res = await fetch('/api/bi-kompass/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Fehler beim Upload (Status ${res.status})`);
      }

      const data = await res.json();
      const newChapters = parseChapters(data.markdown);
      setChapters(newChapters);
      setHasChanges(true);
      toast({
        title: 'PDF erfolgreich verarbeitet',
        description: `${file.name} — ${newChapters.filter(c => c.number !== 'header' && c.number !== 'toc').length} Kapitel extrahiert. Bitte prüfen und als neue Version veröffentlichen.`,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Fehler bei der PDF-Verarbeitung.';
      setUploadError(msg);
      toast({ title: 'Upload fehlgeschlagen', description: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  // ── Publish ──────────────────────────────
  const openPublish = () => {
    let next = 'V1.0';
    if (aktiveVersion) {
      const match = aktiveVersion.version.match(/V(\d+)\.(\d+)/);
      if (match) {
        next = `V${match[1]}.${parseInt(match[2]) + 1}`;
      } else {
        next = 'V1.1';
      }
    }
    setPublishVersion(next);
    setPublishAenderungen('');
    setPublishGueltigAb(new Date().toISOString().split('T')[0]);
    setPublishing(true);
  };

  const doPublish = async () => {
    if (!publishVersion.trim()) {
      toast({ title: 'Fehler', description: 'Versionsnummer erforderlich.', variant: 'destructive' });
      return;
    }
    if (!publishAenderungen.trim()) {
      toast({ title: 'Fehler', description: 'Bitte beschreiben Sie die Änderungen.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const inhalt = reassembleMarkdown(chapters);
      await apiClient.post(
        '/odata/BiKompassVersions',
        {
          version: publishVersion,
          titel: aktiveVersion?.titel || 'BI-Kompass der Zusammenarbeit',
          inhalt,
          aenderungen: publishAenderungen,
          // UI-26-Fix: Backend-Feld heisst dateFrom (DateTimeOffset) - ein
          // reines Datum ("2026-09-21") ohne Zeit-/Zonenanteil lässt sich
          // nicht zuverlässig als DateTimeOffset binden.
          dateFrom: publishGueltigAb ? `${publishGueltigAb}T00:00:00Z` : null,
        },
        session
      );
      toast({ title: 'Veröffentlicht', description: `Version ${publishVersion} wurde erfolgreich veröffentlicht.` });
      setPublishing(false);
      setHasChanges(false);
      // Zuerst neue Daten laden, dann chapters zurücksetzen (vermeidet kurzes "Kein Inhalt")
      await Promise.all([loadAktiveVersion(), loadVersionen()]);
      setChapters([]);
    } catch (error: unknown) {
      const msg = error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Speichern fehlgeschlagen';
      toast({ title: 'Fehler', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Version preview ─────────────────────
  const loadFullVersion = async (versionId: string) => {
    if (aktiveVersion && aktiveVersion.id === versionId) {
      setPreviewVersion(aktiveVersion);
      return;
    }
    const found = versionen.find((v) => v.id === versionId);
    if (found) setPreviewVersion(found);
  };

  const toggleCollapse = (chapterId: string) => {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  // ── Loading ─────────────────────────────
  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-10 w-72 bg-muted rounded-lg" />
          <div className="h-40 bg-muted rounded-xl" />
          <div className="h-60 bg-muted rounded-xl" />
          <div className="h-60 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Version preview ─────────────────────
  if (previewVersion) {
    const previewChapters = previewVersion.inhalt ? parseChapters(previewVersion.inhalt) : [];
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setPreviewVersion(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
          </Button>
          <Badge variant={previewVersion.isAktiv ? 'default' : 'secondary'} className={previewVersion.isAktiv ? 'bg-[#3e8f88]' : ''}>
            {previewVersion.isAktiv ? 'Aktive Version' : 'Archiviert'}
          </Badge>
          <span className="text-sm text-muted-foreground">{previewVersion.version} – {previewVersion.dateFrom ? formatDate(previewVersion.dateFrom) : '–'}</span>
        </div>
        {previewVersion.aenderungen && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-medium text-amber-800">Änderungen:</p>
            <p className="text-sm text-amber-700 mt-1">{previewVersion.aenderungen}</p>
          </div>
        )}
        {previewChapters.length > 0 ? (
          previewChapters.filter(ch => ch.number !== 'header' && ch.number !== 'toc').map((ch) => {
            const color = getChapterColor(ch);
            return (
              <Card key={ch.id} className={`${color.bg} ${color.border} border shadow-sm`}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-lg ${color.accent} flex items-center gap-2`}>
                    <Hash className={`h-4 w-4 ${color.icon}`} />
                    {ch.number !== 'toc' ? `${ch.number}. ` : ''}{ch.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-800 [&>p]:whitespace-pre-line">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{ch.content}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <p className="text-muted-foreground italic">Vollständiger Inhalt ist nur für die aktive Version verfügbar.</p>
        )}
      </div>
    );
  }

  // ── Publish dialog ──────────────────────
  if (publishing) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Save className="h-5 w-5 text-[#3e8f88]" />
          Neue Version veröffentlichen
        </h2>
        <Card className="shadow-lg">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pub-version">Versionsnummer *</Label>
                <Input id="pub-version" value={publishVersion} onChange={(e) => setPublishVersion(e.target.value)} placeholder="z.B. V1.1" />
              </div>
              <div>
                <Label htmlFor="pub-date">Gültig ab</Label>
                <Input id="pub-date" type="date" value={publishGueltigAb} onChange={(e) => setPublishGueltigAb(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="pub-changes">Zusammenfassung der Änderungen *</Label>
              <Textarea
                id="pub-changes"
                value={publishAenderungen}
                onChange={(e) => setPublishAenderungen(e.target.value)}
                placeholder="Was wurde in dieser Version geändert?"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPublishing(false)}>
                <X className="h-4 w-4 mr-1" /> Abbrechen
              </Button>
              <Button onClick={doPublish} disabled={saving} className="bg-[#3e8f88] hover:bg-[#357d77] text-white">
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Speichern...' : 'Veröffentlichen'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── No content ──────────────────────────
  if (!aktiveVersion && chapters.length === 0 && !hasChanges) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        {uploading && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-teal-50 border border-teal-200 mb-6">
            <Loader2 className="h-5 w-5 text-[#3e8f88] animate-spin flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-teal-800">PDF wird analysiert...</p>
              <p className="text-xs text-teal-600 mt-0.5">Die Datei wird gelesen und in Kapitel aufgeteilt. Dies kann bis zu 30 Sekunden dauern.</p>
            </div>
          </div>
        )}
        {uploadError && !uploading && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-6">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 flex-1">{uploadError}</p>
            <button onClick={() => setUploadError('')} className="text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <Card className="text-center py-20 bg-gradient-to-br from-teal-50 to-sky-50 border-teal-200">
          <CardContent>
            <Compass className="h-16 w-16 text-teal-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-teal-800">Kein BI-Kompass vorhanden</h3>
            <p className="text-teal-600 mt-2">Der BI-Kompass wurde noch nicht erstellt.</p>
            {canManage && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <label>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handlePdfUpload}
                    disabled={uploading}
                  />
                  <Button className="bg-[#3e8f88] hover:bg-[#357d77] text-white shadow-md cursor-pointer" disabled={uploading} asChild>
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                      {uploading ? 'Verarbeite...' : 'PDF hochladen'}
                    </span>
                  </Button>
                </label>
                <Button variant="outline" onClick={startFullEdit} disabled={uploading}>
                  <Edit className="h-4 w-4 mr-1" /> Manuell erstellen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ══════════════════════════════════════════
  //  MAIN VIEW
  // ══════════════════════════════════════════
  const displayChapters = chapters.length > 0 ? chapters : originalChapters;
  const headerChapter = displayChapters.find((c) => c.number === 'header');
  const contentChapters = displayChapters.filter((c) => c.number !== 'header' && c.number !== 'toc');
  const tocChapter = displayChapters.find((c) => c.number === 'toc');
  const hasAktiveVersion = !!aktiveVersion;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ── Hero header ────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3e8f88]/10 via-teal-50 to-sky-50 border border-teal-200/60 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3e8f88]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-[#3e8f88]/15">
                  <Compass className="h-7 w-7 text-[#3e8f88]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">BI-Kompass</h1>
                  <p className="text-sm text-[#3e8f88] font-medium">{aktiveVersion?.titel || 'Neue Version'}</p>
                </div>
              </div>
              {hasAktiveVersion && (
              <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5 bg-white/70 px-3 py-1 rounded-full">
                  <FileText className="h-3.5 w-3.5 text-[#3e8f88]" /> {aktiveVersion!.version}
                </span>
                <span className="flex items-center gap-1.5 bg-white/70 px-3 py-1 rounded-full">
                  <Clock className="h-3.5 w-3.5 text-[#3e8f88]" /> Gültig ab {aktiveVersion!.dateFrom ? formatDate(aktiveVersion!.dateFrom) : '–'}
                </span>
                <span className="flex items-center gap-1.5 bg-white/70 px-3 py-1 rounded-full">
                  <User className="h-3.5 w-3.5 text-[#3e8f88]" /> {erstellerName(aktiveVersion!.createdById)}
                </span>
              </div>
              )}
              {/* Document metadata from header chapter */}
              {headerChapter && (
                <div className="mt-4 text-sm text-gray-600 prose prose-sm max-w-none prose-p:my-0.5 prose-strong:text-gray-700">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{headerChapter.content.split('---')[0].trim()}</ReactMarkdown>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {hasAktiveVersion && (
              <Button
                variant="outline"
                size="sm"
                className="bg-white/80 hover:bg-white"
                onClick={() => {
                  setShowVersionen(!showVersionen);
                  if (!showVersionen && versionen.length === 0) loadVersionen();
                }}
              >
                <History className="h-4 w-4 mr-1" />
                Versionen ({versionen.length})
                {showVersionen ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
              </Button>
              )}
              {canManage && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/80 hover:bg-white text-[#3e8f88] border-[#3e8f88]/30"
                    onClick={startFullEdit}
                    disabled={uploading}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Bearbeiten
                  </Button>
                  <label>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handlePdfUpload}
                      disabled={uploading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/80 hover:bg-white text-[#3e8f88] border-[#3e8f88]/30 cursor-pointer"
                      disabled={uploading}
                      asChild
                    >
                      <span>
                        {uploading ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-1" />
                        )}
                        {uploading ? 'Verarbeite...' : 'PDF hochladen'}
                      </span>
                    </Button>
                  </label>
                </div>
              )}
              {canManage && hasChanges && (
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={discardAllChanges} className="bg-white/80 text-orange-600 hover:text-orange-700 border-orange-200">
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Verwerfen
                  </Button>
                  <Button size="sm" onClick={openPublish} className="bg-[#3e8f88] hover:bg-[#357d77] text-white shadow-md">
                    <Save className="h-4 w-4 mr-1" /> Version veröffentlichen
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Pending changes banner ─────────── */}
      {hasChanges && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <div className="p-1.5 bg-amber-100 rounded-lg">
            <Edit className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-sm text-amber-800 flex-1">
            Sie haben Änderungen an Kapiteln vorgenommen. Klicken Sie auf <strong>"Version veröffentlichen"</strong>, um diese für alle sichtbar zu machen.
          </p>
        </div>
      )}

      {/* ── Upload processing banner ────────── */}
      {uploading && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-teal-50 border border-teal-200">
          <Loader2 className="h-5 w-5 text-[#3e8f88] animate-spin flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-teal-800">PDF wird analysiert...</p>
            <p className="text-xs text-teal-600 mt-0.5">Die Datei wird gelesen und in Kapitel aufgeteilt. Dies kann bis zu 30 Sekunden dauern.</p>
          </div>
        </div>
      )}

      {/* ── Upload error banner ──────────────── */}
      {uploadError && !uploading && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{uploadError}</p>
          </div>
          <button onClick={() => setUploadError('')} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Full-document editor ─────────────── */}
      {fullEditMode && (
        <Card className="shadow-lg border-[#3e8f88]/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-[#3e8f88]">
                <Edit className="h-4 w-4" /> Gesamtes Dokument bearbeiten
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFullEditPreview(!fullEditPreview)}
                >
                  <Eye className="h-3 w-3 mr-1" /> {fullEditPreview ? 'Editor' : 'Vorschau'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-red-500 hover:text-red-700"
                  onClick={cancelFullEdit}
                >
                  <X className="h-3 w-3 mr-1" /> Abbrechen
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-[#3e8f88] hover:bg-[#357d77] text-white"
                  onClick={saveFullEdit}
                >
                  <Check className="h-3 w-3 mr-1" /> Übernehmen
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Bearbeiten Sie den vollständigen Markdown-Inhalt des BI-Kompass. Verwenden Sie <code className="bg-gray-100 px-1 rounded">## Kapitelname</code> für Kapitelüberschriften.
            </p>
            {fullEditPreview ? (
              <div className="prose prose-sm max-w-none bg-white rounded-lg p-6 border min-h-[400px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullEditBuffer}</ReactMarkdown>
              </div>
            ) : (
              <Textarea
                value={fullEditBuffer}
                onChange={(e) => setFullEditBuffer(e.target.value)}
                rows={Math.max(20, fullEditBuffer.split('\n').length + 2)}
                className="font-mono text-sm bg-white border-gray-300 min-h-[400px]"
                placeholder={`# BI-Kompass der Zusammenarbeit\n\nEinführung...\n\n---\n\n## 1. Kapitelname\n\nInhalt des Kapitels...\n\n## 2. Weiteres Kapitel\n\n...`}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Versionsverlauf ────────────────── */}
      {showVersionen && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-[#3e8f88]" /> Versionsverlauf
            </CardTitle>
          </CardHeader>
          <CardContent>
            {versionen.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Versionen vorhanden.</p>
            ) : (
              <div className="space-y-2">
                {versionen.map((v) => (
                  <div
                    key={v.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      v.isAktiv
                        ? 'border-[#3e8f88]/40 bg-[#3e8f88]/5'
                        : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{v.version}</span>
                        {v.isAktiv && (
                          <Badge className="bg-[#3e8f88] text-white text-[10px] px-2 py-0">Aktiv</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {v.dateFrom ? formatDate(v.dateFrom) : '–'} · {erstellerName(v.createdById)}
                      </div>
                      {v.aenderungen && <p className="text-xs text-gray-500 mt-1 truncate">{v.aenderungen}</p>}
                    </div>
                    <Button variant="ghost" size="sm" className="text-[#3e8f88]" onClick={() => loadFullVersion(v.id)}>
                      <Eye className="h-4 w-4 mr-1" /> Ansehen
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Table of contents ──────────────── */}
      {tocChapter && (
        <Card className="bg-teal-50/50 border-teal-200/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-teal-800 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-teal-600" /> Inhaltsverzeichnis
              </CardTitle>
              {canManage && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-teal-600 hover:text-teal-800 hover:bg-teal-100" onClick={() => startChapterEdit('toc')}>
                  <Edit className="h-3 w-3 mr-1" /> Bearbeiten
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingChapter === 'toc' ? (
              <ChapterEditor
                content={editBuffer}
                onChange={setEditBuffer}
                onSave={saveChapterEdit}
                onCancel={cancelChapterEdit}
                showPreview={showPreview}
                onTogglePreview={() => setShowPreview(!showPreview)}
              />
            ) : (
              <div
                className="prose max-w-none prose-a:text-teal-700 prose-a:no-underline hover:prose-a:underline prose-li:text-teal-800 prose-headings:font-bold prose-headings:text-[16px] prose-p:text-[16px] prose-li:text-[16px] prose-a:text-[16px] [&>p]:whitespace-pre-line"
                style={{ fontFamily: "'Aptos', 'Calibri', sans-serif", fontSize: '16px' }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{tocChapter.content}</ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Empty state (no chapters) ────────── */}
      {contentChapters.length === 0 && !fullEditMode && !uploading && (
        <Card className="text-center py-16 bg-gradient-to-br from-teal-50/50 to-sky-50/50 border-teal-200/40 shadow-sm">
          <CardContent>
            <BookOpen className="h-12 w-12 text-teal-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-teal-800">Kein Inhalt vorhanden</h3>
            <p className="text-sm text-teal-600 mt-2 max-w-md mx-auto">
              Der BI-Kompass enthält noch keinen strukturierten Inhalt.
              {canManage
                ? ' Laden Sie eine PDF-Datei hoch oder bearbeiten Sie das Dokument manuell.'
                : ' Bitte wenden Sie sich an einen Administrator.'}
            </p>
            {canManage && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <label>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handlePdfUpload}
                  />
                  <Button className="bg-[#3e8f88] hover:bg-[#357d77] text-white shadow-md cursor-pointer" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-1" /> PDF hochladen
                    </span>
                  </Button>
                </label>
                <Button variant="outline" onClick={startFullEdit}>
                  <Edit className="h-4 w-4 mr-1" /> Manuell bearbeiten
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Chapters ───────────────────────── */}
      {contentChapters.map((ch) => {
        const color = getChapterColor(ch);
        const isCollapsed = collapsedChapters.has(ch.id);
        const isEditing = editingChapter === ch.id;

        return (
          <Card key={ch.id} className={`${color.bg} ${color.border} border shadow-sm transition-all duration-200 hover:shadow-md`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                  onClick={() => toggleCollapse(ch.id)}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${color.bg} border ${color.border}`}>
                    <span className={`text-sm font-bold ${color.accent}`}>{ch.number}</span>
                  </div>
                  <CardTitle className={`text-lg ${color.accent} flex-1 min-w-0 truncate`}>
                    {ch.title}
                  </CardTitle>
                  {isCollapsed ? (
                    <ChevronDown className={`h-4 w-4 ${color.icon} flex-shrink-0`} />
                  ) : (
                    <ChevronUp className={`h-4 w-4 ${color.icon} flex-shrink-0`} />
                  )}
                </button>
                {canManage && !isEditing && !isCollapsed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 text-xs ml-2 ${color.accent} hover:${color.bg}`}
                    onClick={() => startChapterEdit(ch.id)}
                  >
                    <Edit className="h-3 w-3 mr-1" /> Bearbeiten
                  </Button>
                )}
              </div>
            </CardHeader>

            {!isCollapsed && (
              <CardContent>
                {isEditing ? (
                  <ChapterEditor
                    content={editBuffer}
                    onChange={setEditBuffer}
                    onSave={saveChapterEdit}
                    onCancel={cancelChapterEdit}
                    showPreview={showPreview}
                    onTogglePreview={() => setShowPreview(!showPreview)}
                  />
                ) : (
                  <div
                    className="prose max-w-none prose-headings:text-gray-800 prose-headings:font-bold prose-h1:text-[18.67px] prose-h2:text-[16px] prose-h3:text-[14.67px] prose-h4:text-[14.67px] prose-p:text-[14.67px] prose-li:text-[14.67px] prose-td:text-[14.67px] prose-th:text-[14.67px] prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-800 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:bg-white/50 prose-blockquote:rounded-r-lg prose-blockquote:px-4 prose-blockquote:py-2 prose-table:border-collapse prose-th:bg-white/60 prose-th:border prose-th:border-gray-300 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-gray-300 prose-td:px-3 prose-td:py-2 [&>p]:whitespace-pre-line"
                    style={{ fontFamily: "'Aptos', 'Calibri', sans-serif", fontSize: '14.67px' }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{ch.content}</ReactMarkdown>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────
// Chapter Editor sub-component
// ──────────────────────────────────────────
function ChapterEditor({
  content,
  onChange,
  onSave,
  onCancel,
  showPreview,
  onTogglePreview,
}: {
  content: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {showPreview ? 'Vorschau' : 'Markdown-Editor'}
        </span>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onTogglePreview}>
            <Eye className="h-3 w-3 mr-1" /> {showPreview ? 'Editor' : 'Vorschau'}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-700" onClick={onCancel}>
            <X className="h-3 w-3 mr-1" /> Abbrechen
          </Button>
          <Button size="sm" className="h-7 text-xs bg-[#3e8f88] hover:bg-[#357d77] text-white" onClick={onSave}>
            <Check className="h-3 w-3 mr-1" /> Übernehmen
          </Button>
        </div>
      </div>
      {showPreview ? (
        <div className="prose max-w-none prose-headings:font-bold prose-h1:text-[18.67px] prose-h2:text-[16px] prose-h3:text-[14.67px] prose-h4:text-[14.67px] prose-p:text-[14.67px] prose-li:text-[14.67px] bg-white/70 rounded-lg p-4 border" style={{ fontFamily: "'Aptos', 'Calibri', sans-serif", fontSize: '14.67px' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      ) : (
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          rows={Math.max(10, content.split('\n').length + 2)}
          className="font-mono text-sm bg-white/70 border-gray-300"
        />
      )}
    </div>
  );
}
