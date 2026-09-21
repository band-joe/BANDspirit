import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const response = NextResponse.next();
    // SEC-005: Security-HTTP-Header
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Allow auth routes and public routes
        if (
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/signup') ||
          pathname === '/api/firma/public' ||
          pathname === '/login' ||
          pathname === '/signup' ||
          pathname === '/passwort-vergessen' ||
          pathname === '/passwort-zuruecksetzen' ||
          pathname.startsWith('/_next') ||
          pathname.startsWith('/favicon') ||
          pathname.startsWith('/og-image')
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.svg|favicon\\.ico|og-image\\.png).*)'],
};
