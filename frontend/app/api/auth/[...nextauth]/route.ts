// app/api/auth/[...nextauth]/route.ts
// NextAuth Route-Handler (App Router) — stellt die NextAuth-Endpunkte bereit:
//   /api/auth/csrf, /api/auth/callback/*, /api/auth/session,
//   /api/auth/providers, /api/auth/signin, /api/auth/signout, /api/auth/error
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
