'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
import { ODataResponse } from '@/lib/odata';
import { ApiError } from '@/lib/errors';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Plus, Search, Pin, Edit2, Trash2, Newspaper, ChevronDown, ChevronUp, Loader2, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface BIGuideNews {
  id: string;
  titel: string;
  inhalt: string;
  kategorie: string | null;
  wichtig: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
  createdBy?: { id: string; name: string | null } | null;
}

interface BiGuideKategorie {
  id: string;
  name: string;
  farbe: string | null;
  sortOrder: number;
  aktiv: boolean;
}

const KATEGORIE_FALLBACK_FARBE = 'bg-gray-100 text-gray-600 border-gray-200';

export default function BIGuidePage() {
  const { data: session } = useSession() || {};
  const searchParams = useSearchParams();
  const role = (session?.user as any)?.role ?? '';
  const { can } = usePermissions();
  const userId = (session?.user as any)?.id ?? '';
  const canManage = can('biguide:manage');

  const [news, setNews] = useState<BIGuideNews[]>([]);
  const [kategorien, setKategorien] = useState<BiGuideKategorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterKategorie, setFilterKategorie] = useState<string>('alle');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BIGuideNews | null>(null);
  const [formData, setFormData] = useState({ titel: '', inhalt: '', kategorie: '', wichtig: false });
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [footerError, setFooterError] = useState('');

  const fetchNews = useCallback(async () => {
    if (!session) return;
    try {
      // News über OData laden
      const data = await apiClient.get<ODataResponse<BIGuideNews>>('/odata/BiGuideNews?$orderby=CreatedAt desc', session);
      setNews(data.value ?? []);
    } catch (e) {
      console.error(e);
      toast.error('News konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  const fetchKategorien = useCallback(async () => {
    if (!session) return;
    try {
      const data = await apiClient.get<ODataResponse<BiGuideKategorie>>(
        '/odata/BiGuideKategorien?$filter=Aktiv eq true&$orderby=SortOrder', session);
      setKategorien(data.value ?? []);
    } catch (e) {
      console.error(e);
      toast.error('Kategorien konnten nicht geladen werden.');
    }
  }, [session]);

  useEffect(() => { fetchNews(); fetchKategorien(); }, [fetchNews, fetchKategorien]);

  // UI-10-Fix: Aus der globalen Suche verlinkte News (?newsId=...) direkt
  // aufklappen und dorthin scrollen, statt nur auf die Gesamtliste zu verweisen.
  useEffect(() => {
    const newsId = searchParams?.get('newsId');
    if (!newsId || news.length === 0) return;
    if (!news.some(n => n.id === newsId)) return;
    setExpandedId(newsId);
    document.getElementById(`news-${newsId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [searchParams, news]);

  const openCreate = () => {
    setEditingItem(null);
    setFormData({ titel: '', inhalt: '', kategorie: kategorien[0]?.name ?? '', wichtig: false });
    setFooterError('');
    setDialogOpen(true);
  };

  const openEdit = (item: BIGuideNews) => {
    setEditingItem(item);
    setFormData({
      titel: item.titel ?? '',
      inhalt: item.inhalt ?? '',
      kategorie: item.kategorie || kategorien[0]?.name || '',
      wichtig: item.wichtig,
    });
    setFooterError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setFooterError('');
    if (!formData.titel.trim()) {
      setFooterError('Titel ist ein Pflichtfeld.');
      return;
    }
    if (!formData.inhalt.trim()) {
      setFooterError('Inhalt ist ein Pflichtfeld.');
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingItem;
      if (isEdit) {
        // Nachricht über OData aktualisieren
        await apiClient.patch(`/odata/BiGuideNews(${editingItem!.id})`, formData, session);
      } else {
        // Nachricht über OData erstellen
        await apiClient.post('/odata/BiGuideNews', formData, session);
      }
      toast.success(isEdit ? 'Nachricht aktualisiert.' : 'Nachricht erstellt.');
      setDialogOpen(false);
      fetchNews();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        const msg = error.status === 403 ? 'Keine Berechtigung zum Speichern.' : error.status === 401 ? 'Sitzung abgelaufen. Bitte erneut anmelden.' : (error.message || `Fehler beim Speichern (Status ${error.status})`);
        setFooterError(msg);
      } else {
        setFooterError(error instanceof Error ? error.message : 'Netzwerkfehler beim Speichern.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      // Nachricht über OData löschen
      await apiClient.delete(`/odata/BiGuideNews(${deleteId})`, session);
      toast.success('News gelöscht.');
      setDeleteDialogOpen(false);
      setDeleteId(null);
      fetchNews();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  // Filter + Search
  const filtered = news.filter((n) => {
    const matchSearch = search.trim() === '' ||
      (n.titel ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (n.inhalt ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (n.createdBy?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchKat = filterKategorie === 'alle' || n.kategorie === filterKategorie;
    return matchSearch && matchKat;
  });

  const isNew = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    return diff <= 5 * 24 * 60 * 60 * 1000;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold tracking-tight">Informationen BI-Guide</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Informationen BI-Guide</h1>
          <p className="text-sm text-foreground/60 mt-1">Neuigkeiten, Prozessänderungen und Tipps für das Team</p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Neue Nachricht
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterKategorie} onValueChange={setFilterKategorie}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Kategorien</SelectItem>
            {kategorien.map((k) => (
              <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* News list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Newspaper className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Keine Nachrichten gefunden.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            const katColor = kategorien.find((k) => k.name === item.kategorie)?.farbe ?? KATEGORIE_FALLBACK_FARBE;
            const canManageItem = canManage && (item.createdById === userId || role === 'Admin');
            return (
              <motion.div
                key={item.id}
                id={`news-${item.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className={`transition-shadow hover:shadow-md ${
                  item.wichtig ? 'border-l-4 border-l-primary ring-1 ring-primary/10' : ''
                }`}>
                  <CardContent className="p-0">
                    {/* Clickable header row */}
                    <button
                      className="w-full text-left p-4 sm:p-5 flex items-start gap-3"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {item.wichtig && (
                            <Pin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          )}
                          <h3 className="font-semibold text-sm sm:text-base truncate">{item.titel}</h3>
                          {isNew(item.createdAt) && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">NEU</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                          {item.kategorie && (
                            <Badge variant="outline" className={`text-[10px] ${katColor}`}>
                              {item.kategorie}
                            </Badge>
                          )}
                          <span>{item.createdBy?.name ?? 'Unbekannt'}</span>
                          <span>·</span>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expandable content */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t">
                        <div className="pt-4 prose prose-sm max-w-none text-foreground/80 whitespace-pre-wrap">
                          {item.inhalt}
                        </div>
                        {canManageItem && (
                          <div className="flex gap-2 mt-4 pt-3 border-t">
                            <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(item)}>
                              <Edit2 className="h-3 w-3" /> Bearbeiten
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-destructive hover:text-destructive"
                              onClick={() => { setDeleteId(item.id); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="h-3 w-3" /> Löschen
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Nachricht bearbeiten' : 'Neue Nachricht erstellen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="titel">Titel *</Label>
              <Input
                id="titel"
                value={formData.titel}
                onChange={(e) => { setFormData((p) => ({ ...p, titel: e.target.value })); setFooterError(''); }}
                placeholder="Titel der Nachricht"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inhalt">Inhalt *</Label>
              <Textarea
                id="inhalt"
                value={formData.inhalt}
                onChange={(e) => { setFormData((p) => ({ ...p, inhalt: e.target.value })); setFooterError(''); }}
                placeholder="Nachrichteninhalt..."
                rows={8}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select value={formData.kategorie} onValueChange={(v) => setFormData((p) => ({ ...p, kategorie: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {kategorien.map((k) => (
                      <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2">
                  <Switch
                    id="wichtig"
                    checked={formData.wichtig}
                    onCheckedChange={(v) => setFormData((p) => ({ ...p, wichtig: v }))}
                  />
                  <Label htmlFor="wichtig" className="flex items-center gap-1.5">
                    <Pin className="h-3.5 w-3.5" /> Wichtig (Angepinnt)
                  </Label>
                </div>
              </div>
            </div>
          </div>
          {footerError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{footerError}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Nachricht löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Diese Aktion kann nicht rückgängig gemacht werden.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
