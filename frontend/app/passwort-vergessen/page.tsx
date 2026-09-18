'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

export default function PasswortVergessenPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSent(true);
      } else {
        setError(data.error || 'Ein Fehler ist aufgetreten');
      }
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#d4ede8] via-[#e0f2ee] to-[#c8e6df] p-4">
      <Card className="w-full max-w-md shadow-lg border-[#3e8f88]/15">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 rounded-xl bg-[#3e8f88] flex items-center justify-center">
            <span className="text-white font-bold text-xl font-display">BA</span>
          </div>
          <CardTitle className="text-2xl font-display tracking-tight">Passwort vergessen</CardTitle>
          <CardDescription>
            {sent
              ? 'Überprüfen Sie Ihren Posteingang'
              : 'Geben Sie Ihre E-Mail-Adresse ein, um einen Link zum Zurücksetzen zu erhalten'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Falls ein Konto mit der E-Mail <strong>{email}</strong> existiert, haben wir Ihnen einen Link zum Zurücksetzen des Passworts gesendet.
                </p>
                <p className="text-xs text-muted-foreground">
                  Der Link ist 1 Stunde gültig. Prüfen Sie auch Ihren Spam-Ordner.
                </p>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zurück zur Anmeldung
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
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
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird gesendet...</>
                ) : (
                  <><Mail className="mr-2 h-4 w-4" /> Link senden</>
                )}
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full text-muted-foreground">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Zurück zur Anmeldung
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
