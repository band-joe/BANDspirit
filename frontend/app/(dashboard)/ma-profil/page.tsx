'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiClient, getToken } from '@/lib/api-client';
import { UserCircle, Upload, Trash2, Mail, Users, Loader2, Network, CornerDownRight } from 'lucide-react';

interface KreisZugehoerigkeit {
  name: string;
  leadLink: string | null;
}

interface ProfilData {
  name: string;
  email: string;
  portraetPfad: string | null;
  kreise: KreisZugehoerigkeit[];
}

/**
 * Ein Lead-Link, der hierarchisch über dem angemeldeten Benutzer steht.
 * Die Reihenfolge der Liste ist "direkte Kreise zuerst, dann aufsteigend zur
 * Wurzel" – dadurch kann sie als eingerückter Baum dargestellt werden.
 */
interface LeadLinkUeberMir {
  kreisId: string;
  kreisName: string;
  leadLinkName: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function MaProfilPage() {
  const { data: session } = useSession() || {};
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profil, setProfil] = useState<ProfilData | null>(null);
  const [leadLinks, setLeadLinks] = useState<LeadLinkUeberMir[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [laedtHoch, setLaedtHoch] = useState(false);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  const ladeProfil = useCallback(async () => {
    if (!session) return;
    try {
      setLaedt(true);
      const daten = await apiClient.get<ProfilData>('/api/profil/meins', session);
      setProfil(daten);
    } catch (e) {
      toast({
        title: 'Fehler',
        description: 'Das Profil konnte nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLaedt(false);
    }
  }, [session, toast]);

  const ladeLeadLinks = useCallback(async () => {
    if (!session) return;
    try {
      const daten = await apiClient.get<LeadLinkUeberMir[]>(
        '/api/profil/meins/lead-links-ueber-mir',
        session,
      );
      setLeadLinks(daten);
    } catch (e) {
      // Die Lead-Link-Übersicht ist rein informativ; ein Fehler soll das
      // restliche Profil nicht blockieren – daher leere Liste beibehalten.
      setLeadLinks([]);
    }
  }, [session]);

  useEffect(() => {
    ladeProfil();
    ladeLeadLinks();
  }, [ladeProfil, ladeLeadLinks]);

  // Porträtfoto über die API laden (authentifiziert) und als Blob-URL anzeigen.
  // Der Browser kann den privaten Objektspeicher (MinIO) nicht direkt aufrufen,
  // daher wird das Bild serverseitig ausgeliefert und hier mit Bearer-Token
  // abgerufen.
  useEffect(() => {
    let abgebrochen = false;
    let erzeugteUrl: string | null = null;

    const ladeFoto = async () => {
      if (!session || !profil?.portraetPfad) {
        setFotoUrl(null);
        return;
      }
      try {
        const token = getToken(session);
        const res = await fetch(`${API_BASE}/api/profil/foto`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!abgebrochen) setFotoUrl(null);
          return;
        }
        const blob = await res.blob();
        if (abgebrochen) return;
        erzeugteUrl = URL.createObjectURL(blob);
        setFotoUrl(erzeugteUrl);
      } catch {
        if (!abgebrochen) setFotoUrl(null);
      }
    };

    ladeFoto();

    return () => {
      abgebrochen = true;
      if (erzeugteUrl) URL.revokeObjectURL(erzeugteUrl);
    };
  }, [session, profil?.portraetPfad]);

  const handleDateiAuswahl = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const datei = e.target.files?.[0];
    if (!datei) return;

    if (!datei.type.startsWith('image/')) {
      toast({
        title: 'Ungültige Datei',
        description: 'Bitte wählen Sie eine Bilddatei (z. B. JPG oder PNG).',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLaedtHoch(true);
      const formData = new FormData();
      formData.append('datei', datei);

      const token = getToken(session);
      const res = await fetch(`${API_BASE}/api/profil/foto`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        throw new Error('Upload fehlgeschlagen');
      }
      toast({ title: 'Erfolg', description: 'Porträtfoto wurde hochgeladen.' });
      await ladeProfil();
    } catch (err) {
      toast({
        title: 'Fehler',
        description: 'Das Foto konnte nicht hochgeladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLaedtHoch(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFotoLoeschen = async () => {
    try {
      setLaedtHoch(true);
      await apiClient.delete('/api/profil/foto', session);
      toast({ title: 'Erfolg', description: 'Porträtfoto wurde entfernt.' });
      await ladeProfil();
    } catch (err) {
      toast({
        title: 'Fehler',
        description: 'Das Foto konnte nicht entfernt werden.',
        variant: 'destructive',
      });
    } finally {
      setLaedtHoch(false);
    }
  };

  if (laedt) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Profil wird geladen …
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">MA-Profil</h1>
        <p className="text-sm text-muted-foreground">
          Ihre persönlichen Daten aus der Benutzerverwaltung (nur lesend). Sie
          können ein Porträtfoto hochladen.
        </p>
      </div>

      {/* Porträtfoto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" /> Porträtfoto
          </CardTitle>
          <CardDescription>
            Das Foto wird auf dem Objektspeicher (MinIO) abgelegt und ist im
            Benutzerstamm hinterlegt.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="flex h-[300px] w-[300px] shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoUrl} alt="Porträtfoto" className="h-full w-full object-cover" />
            ) : (
              <UserCircle className="h-32 w-32 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleDateiAuswahl}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={laedtHoch}
              >
                {laedtHoch ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Foto hochladen
              </Button>
              {profil?.portraetPfad && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFotoLoeschen}
                  disabled={laedtHoch}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Entfernen
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Empfohlen: quadratisches Bild (JPG oder PNG).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stammdaten */}
      <Card>
        <CardHeader>
          <CardTitle>Stammdaten</CardTitle>
          <CardDescription>Diese Angaben werden zentral in der Benutzerverwaltung gepflegt.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <UserCircle className="h-4 w-4" /> Name
            </Label>
            <p className="text-sm font-medium">{profil?.name || '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" /> E-Mail
            </Label>
            <p className="text-sm font-medium">{profil?.email || '—'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Kreis-Zugehörigkeit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Kreis-Zugehörigkeit
          </CardTitle>
          <CardDescription>Kreise, denen Sie angehören, inkl. Lead-Link des Kreises.</CardDescription>
        </CardHeader>
        <CardContent>
          {profil?.kreise && profil.kreise.length > 0 ? (
            <ul className="divide-y">
              {profil.kreise.map((k, idx) => (
                <li key={idx} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium">{k.name}</span>
                  <span className="text-sm text-muted-foreground">
                    Lead-Link: {k.leadLink || 'nicht zugewiesen'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sie sind derzeit keinem Kreis zugeordnet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lead-Links über mir */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" /> Lead-Links über mir
          </CardTitle>
          <CardDescription>
            Alle Lead-Links, die hierarchisch über Ihnen stehen – von Ihren
            direkten Kreisen aufsteigend bis zum obersten Kreis. Sind Sie selbst
            Lead-Link eines Kreises, erscheinen Sie hier nicht.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leadLinks.length > 0 ? (
            <ul className="space-y-1">
              {leadLinks.map((ll, idx) => (
                <li
                  key={ll.kreisId}
                  className="flex items-center gap-2 py-1.5 text-sm"
                  style={{ paddingLeft: `${idx * 1.5}rem` }}
                >
                  {idx > 0 && (
                    <CornerDownRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-medium">{ll.leadLinkName}</span>
                  <span className="text-muted-foreground">— {ll.kreisName}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Es stehen keine Lead-Links über Ihnen.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
