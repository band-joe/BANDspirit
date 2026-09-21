'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, ArrowLeft, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Check, X } from 'lucide-react';

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [redirectCount, setRedirectCount] = useState(5);

  // Password validation rules
  const rules = useMemo(() => [
    { label: 'Mindestens 8 Zeichen', test: (pw: string) => pw.length >= 8 },
    { label: 'Grossbuchstabe (A-Z)', test: (pw: string) => /[A-Z]/.test(pw) },
    { label: 'Kleinbuchstabe (a-z)', test: (pw: string) => /[a-z]/.test(pw) },
    { label: 'Zahl (0-9)', test: (pw: string) => /[0-9]/.test(pw) },
    { label: 'Sonderzeichen (!@#$...)', test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
  ], []);

  const allValid = password.length > 0 && rules.every(r => r.test(password));
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = allValid && passwordsMatch && !loading;

  // Redirect countdown after success
  useEffect(() => {
    if (!success) return;
    if (redirectCount <= 0) {
      window.location.href = '/login';
      return;
    }
    const timer = setTimeout(() => setRedirectCount(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [success, redirectCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // UI-31-Fix: Backend erwartet "newPassword" (ResetPasswordRequest.cs),
        // nicht "password" - der Reset schlug bislang immer mit einer generischen
        // Fehlermeldung fehl (ModelState-Validierung: NewPassword blieb leer).
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.fehler || 'Ein Fehler ist aufgetreten');
      }
    } catch {
      setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#d4ede8] via-[#e0f2ee] to-[#c8e6df] p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">Ungültiger Link</CardTitle>
            <CardDescription>Kein Token gefunden. Bitte fordern Sie einen neuen Link an.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/passwort-vergessen">
              <Button className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Neuen Link anfordern
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#d4ede8] via-[#e0f2ee] to-[#c8e6df] p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 rounded-xl bg-[#3e8f88] flex items-center justify-center">
            <span className="text-white font-bold text-xl font-display">BA</span>
          </div>
          <CardTitle className="text-2xl font-display tracking-tight">
            {success ? 'Passwort geändert' : 'Neues Passwort festlegen'}
          </CardTitle>
          <CardDescription>
            {success
              ? 'Ihr Passwort wurde erfolgreich zurückgesetzt'
              : 'Wählen Sie ein sicheres Passwort für Ihr Konto'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Sie werden in {redirectCount} Sekunden zur Anmeldung weitergeleitet...
                </p>
              </div>
              <Link href="/login">
                <Button className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Jetzt anmelden
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">Neues Passwort</Label>
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
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Password rules */}
              {password.length > 0 && (
                <div className="space-y-1 text-xs">
                  {rules.map((rule, i) => (
                    <div key={i} className={`flex items-center gap-1.5 ${rule.test(password) ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {rule.test(password) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {rule.label}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-500">Passwörter stimmen nicht überein</p>
                )}
                {passwordsMatch && (
                  <p className="text-xs text-green-600 flex items-center gap-1"><Check className="h-3 w-3" /> Passwörter stimmen überein</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={!canSubmit}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird gespeichert...</>
                ) : (
                  <><Lock className="mr-2 h-4 w-4" /> Passwort speichern</>
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

export default function PasswortZuruecksetzenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#d4ede8] via-[#e0f2ee] to-[#c8e6df] p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    }>
      <ResetForm />
    </Suspense>
  );
}
