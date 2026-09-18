'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [redirectCount, setRedirectCount] = useState(5);

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

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setError('Kein Verification-Token vorhanden.');
      setLoading(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (res.ok) {
          setSuccess(true);
        } else {
          setError(data.fehler || 'Verification fehlgeschlagen');
        }
      } catch {
        setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#d4ede8] via-[#e0f2ee] to-[#c8e6df] p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">E-Mail wird bestätigt...</CardTitle>
            <CardDescription className="text-gray-600">Bitte warten Sie einen Moment.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#d4ede8] via-[#e0f2ee] to-[#c8e6df] p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-800">E-Mail erfolgreich bestätigt!</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Ihre E-Mail-Adresse wurde erfolgreich verifiziert. Sie können sich jetzt anmelden.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm text-green-700">
                Sie werden in <strong>{redirectCount}</strong> Sekunden zur Login-Seite weitergeleitet...
              </p>
            </div>
            <Button 
              asChild 
              className="w-full bg-[#00695c] hover:bg-[#004d40] text-white"
            >
              <Link href="/login">Jetzt anmelden</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#d4ede8] via-[#e0f2ee] to-[#c8e6df] p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-800">Verification fehlgeschlagen</CardTitle>
          <CardDescription className="text-gray-600 mt-2">{error}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              Der Verification-Link ist möglicherweise ungültig oder abgelaufen.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              asChild 
              variant="outline"
              className="w-full border-[#00695c] text-[#00695c] hover:bg-[#00695c] hover:text-white"
            >
              <Link href="/login">Zur Login-Seite</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmailVerificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#d4ede8] via-[#e0f2ee] to-[#c8e6df]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00695c]" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
