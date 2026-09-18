'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiClient, getToken } from '@/lib/api-client';
import { Building2, Save, Upload, Trash2, Globe, Mail, Phone, MapPin, ImageIcon } from 'lucide-react';
import Image from 'next/image';

// Das Firmenlogo wird über die API ausgeliefert (GET /api/firma/logo), da der
// Browser den privaten Objektspeicher (MinIO) nicht direkt erreichen kann.
const LOGO_ENDPOINT = '/api/firma/logo';

interface FirmaData {
  id: string;
  firmenname: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  telefon: string;
  website: string;
  email: string;
  appName: string;
  versionsnummer: string;
  logoPath: string | null;
  logoPublic: boolean;
}

export default function FirmaPage() {
  const { data: session } = useSession() || {};
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firma, setFirma] = useState<FirmaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    firmenname: '',
    strasse: '',
    hausnummer: '',
    plz: '',
    ort: '',
    telefon: '',
    website: '',
    email: '',
    appName: '',
    versionsnummer: '',
  });

  useEffect(() => {
    if (!session) return;
    // Firma ist ein OData-Singleton: GET liefert das Objekt direkt (keine Collection)
    apiClient.get<FirmaData>('/odata/Firma', session)
      .then(async (data) => {
        if (data) {
          setFirma(data);
          setForm({
            firmenname: data.firmenname || '',
            strasse: data.strasse || '',
            hausnummer: data.hausnummer || '',
            plz: data.plz || '',
            ort: data.ort || '',
            telefon: data.telefon || '',
            website: data.website || '',
            email: data.email || '',
            appName: data.appName || '',
            versionsnummer: data.versionsnummer || '',
          });
          if (data.logoPath) {
            // Anzeige über den API-Endpunkt; Cache-Buster erzwingt Neuladen nach Änderung.
            setLogoUrl(`${LOGO_ENDPOINT}?t=${Date.now()}`);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // OData-Singleton-PATCH (ohne Key)
      const data = await apiClient.patch<FirmaData>('/odata/Firma', form, session);
      if (data) setFirma(data);
      toast({ title: 'Gespeichert', description: 'Firmendaten wurden aktualisiert.' });
      router.push('/dashboard');
    } catch {
      toast({ title: 'Fehler', description: 'Firmendaten konnten nicht gespeichert werden.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      toast({ title: 'Fehler', description: 'Nur Bilddateien (PNG, JPEG, GIF, WebP, SVG) sind erlaubt.', variant: 'destructive' });
      return;
    }
    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Fehler', description: 'Maximale Dateigrösse: 5 MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // Multipart-Upload über die API. Die API legt das Bild serverseitig im
      // Objektspeicher (MinIO) ab – der Browser erreicht MinIO nicht direkt.
      const token = getToken(session);
      const formData = new FormData();
      formData.append('datei', file);
      const res = await fetch(LOGO_ENDPOINT, {
        method: 'POST',
        headers: {
          // KEIN Content-Type setzen – der Browser setzt die Multipart-Boundary selbst.
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload fehlgeschlagen');

      // Anzeige über den API-Endpunkt aktualisieren (Cache-Buster erzwingt Neuladen).
      setLogoUrl(`${LOGO_ENDPOINT}?t=${Date.now()}`);
      toast({ title: 'Logo hochgeladen', description: 'Das Firmenlogo wurde aktualisiert.' });
    } catch {
      toast({ title: 'Fehler', description: 'Logo konnte nicht hochgeladen werden.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogoRemove = async () => {
    try {
      const token = getToken(session);
      const res = await fetch(LOGO_ENDPOINT, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error('Löschen fehlgeschlagen');
      setLogoUrl(null);
      toast({ title: 'Logo entfernt', description: 'Das Firmenlogo wurde entfernt.' });
    } catch {
      toast({ title: 'Fehler', description: 'Logo konnte nicht entfernt werden.', variant: 'destructive' });
    }
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-7 w-7 text-primary" />
          Firmeneinstellungen
        </h1>
        <p className="text-muted-foreground mt-1">
          Firmendaten und Branding verwalten
        </p>
      </div>

      {/* Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Firmenlogo
          </CardTitle>
          <CardDescription>PNG, JPEG, GIF, WebP oder SVG (max. 5 MB)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/30 overflow-hidden">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Firmenlogo"
                  fill
                  className="object-contain p-2"
                  unoptimized
                />
              ) : (
                <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? 'Wird hochgeladen...' : 'Logo hochladen'}
              </Button>
              {logoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleLogoRemove}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Logo entfernen
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Firmenangaben */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Firmenangaben
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="firmenname">Firmenname</Label>
            <Input id="firmenname" value={form.firmenname} onChange={e => updateField('firmenname', e.target.value)} placeholder="z.B. BANDspirit" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="strasse">Strasse</Label>
              <Input id="strasse" value={form.strasse} onChange={e => updateField('strasse', e.target.value)} placeholder="Musterstrasse" />
            </div>
            <div>
              <Label htmlFor="hausnummer">Hausnummer</Label>
              <Input id="hausnummer" value={form.hausnummer} onChange={e => updateField('hausnummer', e.target.value)} placeholder="12a" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="plz">Postleitzahl</Label>
              <Input id="plz" value={form.plz} onChange={e => updateField('plz', e.target.value)} placeholder="8000" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ort">Ort</Label>
              <Input id="ort" value={form.ort} onChange={e => updateField('ort', e.target.value)} placeholder="Zürich" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kontaktdaten */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Kontaktdaten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="telefon" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Telefonnummer
            </Label>
            <Input id="telefon" value={form.telefon} onChange={e => updateField('telefon', e.target.value)} placeholder="+41 44 123 45 67" />
          </div>
          <div>
            <Label htmlFor="website" className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Website
            </Label>
            <Input id="website" value={form.website} onChange={e => updateField('website', e.target.value)} placeholder="www.beispiel.ch" />
          </div>
          <div>
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> E-Mail-Adresse
            </Label>
            <Input id="email" type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="info@beispiel.ch" />
          </div>
        </CardContent>
      </Card>

      {/* App-Einstellungen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">App-Einstellungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="appName">Name der App</Label>
            <Input id="appName" value={form.appName} onChange={e => updateField('appName', e.target.value)} placeholder="z.B. BANDspirit KMS" />
          </div>
          <div className="mt-4">
            <Label htmlFor="versionsnummer">Versionsnummer</Label>
            <Input id="versionsnummer" value={form.versionsnummer} onChange={e => updateField('versionsnummer', e.target.value)} placeholder="z.B. V.1.3.18" className="font-mono" />
          </div>
        </CardContent>
      </Card>

      {/* Speichern */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-[160px]">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
        </Button>
      </div>
    </div>
  );
}
