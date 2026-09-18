'use client';

import { useState, useEffect } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogIn, Mail, Lock, AlertCircle, Phone, Globe, Eye, EyeOff } from 'lucide-react';

interface FirmaPublic {
  exists: boolean;
  firmenname: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  telefon: string;
  website: string;
  appName: string;
  logoUrl: string | null;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [firma, setFirma] = useState<FirmaPublic | null>(null);
  const [azureEnabled, setAzureEnabled] = useState(false);
  const [azureLoading, setAzureLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Öffentliche Firmendaten für das Login-Branding laden (ohne Token).
    // Ist der Firma-Endpunkt nicht öffentlich erreichbar, bleibt das Standard-Branding aktiv.
    // OData ist auf lowerCamelCase konfiguriert – Feldnamen entsprechend wählen.
    fetch('/odata/Firma?$select=firmenname,logoPath,strasse,hausnummer,plz,ort,telefon,website,appName')
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => {
        if (d && d.firmenname) {
          // Das Logo wird über die API ausgeliefert (GET /api/firma/logo, öffentlich),
          // da der Browser den privaten Objektspeicher (MinIO) nicht direkt erreicht.
          const logoUrl = d.logoPath ? `/api/firma/logo?t=${Date.now()}` : null;
          setFirma({
            exists: true,
            firmenname: d.firmenname ?? '',
            strasse: d.strasse ?? '',
            hausnummer: d.hausnummer ?? '',
            plz: d.plz ?? '',
            ort: d.ort ?? '',
            telefon: d.telefon ?? '',
            website: d.website ?? '',
            appName: d.appName || 'BANDspirit',
            logoUrl,
          });
        }
      })
      .catch(() => {});

    // Prüfen, ob Microsoft Entra ID als Anmeldemethode verfügbar ist
    getProviders()
      .then(providers => { if (providers && (providers as any)['azure-ad']) setAzureEnabled(true); })
      .catch(() => {});

    // Fehlermeldungen aus dem Microsoft-Login-Rücklauf anzeigen
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err === 'EntraNotAllowed') {
        setError('Für diese Microsoft-Adresse ist kein aktives BANDspirit-Konto hinterlegt. Bitte wenden Sie sich an Ihre Administration.');
      } else if (err === 'EntraNoEmail') {
        setError('Vom Microsoft-Konto wurde keine E-Mail-Adresse übermittelt. Anmeldung nicht möglich.');
      } else if (err === 'EntraError') {
        setError('Bei der Microsoft-Anmeldung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
      } else if (err === 'AccessDenied') {
        setError('Zugriff verweigert. Bitte wenden Sie sich an Ihre Administration.');
      } else if (err) {
        setError('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
      }
    }
  }, []);

  const handleAzureLogin = () => {
    setError('');
    setAzureLoading(true);
    signIn('azure-ad', { callbackUrl: '/dashboard' }).catch(() => {
      setError('Microsoft-Anmeldung konnte nicht gestartet werden.');
      setAzureLoading(false);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError('Ungültige E-Mail oder Passwort');
      } else {
        router.replace('/dashboard');
      }
    } catch {
      setError('Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  // Determine logo and title from Firma data
  const hasLogo = firma?.logoUrl;
  const appTitle = firma?.appName || 'BANDspirit';
  const hasAddress = firma && (firma.firmenname || firma.strasse || firma.ort);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#d4ede8] via-[#e0f2ee] to-[#c8e6df] p-4">
      <Card className="w-full max-w-md shadow-lg border-[#3e8f88]/15">
        <CardHeader className="text-center pb-2">
          {/* Logo: Firmenlogo aus Einstellungen oder Fallback BAND-Logo */}
          <div className="mx-auto mb-4 relative w-48 h-16">
            <Image
              src={hasLogo ? firma.logoUrl! : '/band-logo.png'}
              alt={firma?.firmenname ? `${firma.firmenname} Logo` : 'BAND Genossenschaft Logo'}
              fill
              className="object-contain"
              priority
              unoptimized={!!hasLogo}
            />
          </div>
          <CardTitle className="text-[10px] font-normal font-display tracking-tight text-[#2a6b64]">
            {appTitle}
          </CardTitle>

          {/* Firmenangaben unter dem Logo */}
          {hasAddress && (
            <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
              {firma.firmenname && (
                <p className="font-medium text-sm text-foreground/70">{firma.firmenname}</p>
              )}
              {(firma.strasse || firma.ort) && (
                <p>
                  {firma.strasse}{firma.hausnummer ? ` ${firma.hausnummer}` : ''}
                  {(firma.strasse || firma.hausnummer) && firma.ort ? ', ' : ''}
                  {firma.plz ? `${firma.plz} ` : ''}{firma.ort}
                </p>
              )}
              {firma.telefon && (
                <p className="flex items-center justify-center gap-1">
                  <Phone className="h-3 w-3" />{firma.telefon}
                </p>
              )}
              {firma.website && (
                <p className="flex items-center justify-center gap-1">
                  <Globe className="h-3 w-3" />{firma.website}
                </p>
              )}
            </div>
          )}

          <CardDescription className="mt-3">Melden Sie sich an, um fortzufahren</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@beispiel.de"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Passwort</Label>
                <a href="/passwort-vergessen" className="text-xs text-[#3e8f88] hover:text-[#2a6b64] hover:underline">Passwort vergessen?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-[#3e8f88] hover:bg-[#357d77] text-white" disabled={loading}>
              <LogIn className="mr-2 h-4 w-4" />
              {loading ? 'Anmeldung...' : 'Anmelden'}
            </Button>
          </form>

          {azureEnabled && (
            <>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">oder</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAzureLogin}
                disabled={azureLoading}
                className="w-full border-[#3e8f88]/30 hover:bg-[#3e8f88]/5"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                {azureLoading ? 'Weiterleitung zu Microsoft...' : 'Mit Microsoft anmelden'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}