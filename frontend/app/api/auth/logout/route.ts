// app/api/auth/logout/route.ts
// APP-03: Logout-Endpunkt, der
// 1. das Backend /api/auth/logout mit Bearer-Token aufruft (Token sperren)
// 2. die NextAuth-Session löscht
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.accessToken) {
      // Keine aktive Session – direkt abmelden
      return NextResponse.json({ message: 'Abgemeldet (keine Session)' }, { status: 200 });
    }

    const backendUrl = process.env.API_BASE_URL;
    if (!backendUrl) {
      console.error('API_BASE_URL nicht gesetzt');
      return NextResponse.json({ message: 'Konfigurationsfehler' }, { status: 500 });
    }

    // Schritt 1: Backend-Token sperren (POST /api/auth/logout)
    try {
      const revokeRes = await fetch(`${backendUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.user.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (revokeRes.ok) {
        console.log('Backend-Token erfolgreich gesperrt');
      } else {
        // Backend-Fehler → protokollieren, aber nicht abbrechen
        const errorBody = await revokeRes.text();
        console.error(`Backend-Logout fehlgeschlagen (${revokeRes.status}):`, errorBody);
        // Weiter mit Session-Löschung (fail-safe)
      }
    } catch (err) {
      // Netzwerkfehler → protokollieren, aber weiter
      console.error('Backend-Logout Netzwerkfehler:', err);
    }

    // Schritt 2: NextAuth-Session wird vom Client aus gelöscht (via signOut())
    return NextResponse.json({ message: 'Backend-Token gesperrt, Client kann Session löschen' }, { status: 200 });
  } catch (err) {
    console.error('Fehler in Logout-Endpunkt:', err);
    return NextResponse.json({ message: 'Logout fehlgeschlagen' }, { status: 500 });
  }
}
