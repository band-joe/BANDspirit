// middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import {
  normalizeManagedRole,
  roleCanAccessKey,
  pathToAccessKey,
  ACCESS_REDIRECT_TARGET,
} from '@/lib/nav-access';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Admin-Bereich: nur für Role === 'Admin'
    if (pathname.startsWith('/admin') && token?.role !== 'Admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Rollenbasierte Zugriffssteuerung (V.2.0.7):
    // Für die vier verwalteten Rollen (Administrator/Mitglied/Lead-Link/BI-Guide)
    // wird der Seitenzugriff serverseitig anhand der Whitelist erzwungen.
    // Unbekannte/eigene Rollen bleiben unberührt (kein Redirect).
    const managedRole = normalizeManagedRole((token as any)?.role);
    if (managedRole) {
      const tab = req.nextUrl.searchParams.get('tab');
      const key = pathToAccessKey(pathname, tab);
      if (key && !roleCanAccessKey(managedRole, key)) {
        return NextResponse.redirect(new URL(ACCESS_REDIRECT_TARGET, req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    // Geschützte Routen (alle Dashboard-Seiten)
    '/dashboard/:path*',
    '/ma-profil/:path*',
    '/mail-verteiler/:path*',
    '/organisation/:path*',
    '/okr/:path*',
    '/kpi/:path*',
    '/bi-guide/:path*',
    '/bi-kompass/:path*',
    '/hilfe/:path*',
    '/dokumentation/:path*',
    '/benutzer/:path*',
    '/einstellungen/:path*',
    '/application-log/:path*',
    '/admin/:path*',
  ],
};
