// lib/auth-options.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import AzureADProvider from 'next-auth/providers/azure-ad';

const API_BASE = process.env.API_BASE_URL!;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'E-Mail',    type: 'email'    },
        password: { label: 'Passwort', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        try {
          const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email:    credentials.email,
              password: credentials.password,
            }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          // Das C#-Backend liefert eine FLACHE Struktur (kein verschachteltes user-Objekt):
          // { token, userId, name, email, role, expiresAt }
          if (!data?.token || !data?.userId) return null;
          return {
            id:             data.userId,
            name:           data.name,
            email:          data.email,
            role:           data.role,
            accessToken:    data.token,
            tokenExpiresAt: data.expiresAt,
          };
        } catch {
          return null;
        }
      },
    }),

    // Optionaler Entra ID Provider
    ...(process.env.AZURE_AD_CLIENT_ID ? [
      AzureADProvider({
        clientId:     process.env.AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        tenantId:     process.env.AZURE_AD_TENANT_ID!,
        // Nur die Standard-Claims anfordern (kein Microsoft-Graph-Zugriff nötig).
        authorization: { params: { scope: 'openid profile email' } },
        // WICHTIG: Die Standard-profile()-Funktion des AzureADProviders ruft
        // synchron das Porträtfoto über Microsoft Graph ab
        // (graph.microsoft.com/v1.0/me/photos/...). Ist Graph vom
        // On-Premise-Server aus nicht erreichbar (Firewall/kein ausgehender
        // Zugriff), wirft dieser fetch – und NextAuth bricht den gesamten
        // Callback mit "error=OAuthCallback" ab, obwohl Token-Tausch und Login
        // korrekt sind. Das Foto wird hier ohnehin nicht verwendet (die
        // Benutzerdaten werden im signIn-Callback über /api/auth/entra-callback
        // gegen ein C#-JWT getauscht). Deshalb überschreiben wir profile() und
        // lesen die Angaben ausschliesslich aus den ID-Token-Claims – ganz ohne
        // externen Netzwerkaufruf.
        profile(profile) {
          const claims = profile as Record<string, unknown>;
          return {
            id: (claims.oid as string) ?? (claims.sub as string) ?? '',
            name:
              (claims.name as string) ??
              (claims.preferred_username as string) ??
              null,
            email:
              (claims.email as string) ??
              (claims.preferred_username as string) ??
              (claims.upn as string) ??
              null,
            image: null,
          };
        },
      }),
    ] : []),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Entra-ID-Callback: Entra-Token gegen C#-JWT tauschen
      if (account?.provider === 'azure-ad') {
        try {
          const res = await fetch(`${API_BASE}/api/auth/entra-callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: account.id_token }),
          });
          if (!res.ok) return false;
          const data = await res.json();
          // Flache Backend-Struktur: { token, userId, name, email, role, expiresAt }
          user.accessToken     = data.token;
          user.tokenExpiresAt  = data.expiresAt;
          user.id              = data.userId;
          user.name            = data.name;
          user.email           = data.email;
          (user as any).role   = data.role;
        } catch {
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      // Beim ersten Login: User-Daten in JWT schreiben
      if (user) {
        token.accessToken    = (user as any).accessToken;
        token.tokenExpiresAt = (user as any).tokenExpiresAt;
        token.role           = (user as any).role;
        token.userId         = user.id;
      }
      // APP-16 (P005): Backend-Token-Ablauf prüfen.
      // Wenn das API-Token abgelaufen ist, Session als ungültig markieren.
      if (token.tokenExpiresAt) {
        const expiresMs = new Date(token.tokenExpiresAt as string).getTime();
        if (Date.now() > expiresMs) {
          return { ...token, error: 'BackendTokenExpired' };
        }
      }
      return token;
    },

    async session({ session, token }) {
      // JWT-Daten in Session-Objekt übertragen (für useSession())
      session.user = {
        ...session.user,
        id:              token.userId as string,
        role:            token.role   as string,
        accessToken:     token.accessToken as string,
        tokenExpiresAt:  token.tokenExpiresAt as string,
      };
      // APP-16 (P005): Token-Ablauf-Fehler in Session weitergeben.
      if ((token as any).error) {
        (session as any).error = (token as any).error;
      }
      return session;
    },
  },

  // APP-03: signOut-Event → Backend-Token vor Session-Löschung sperren
  events: {
    async signOut({ token }) {
      // token enthält accessToken aus dem jwt-Callback
      const accessToken = token?.accessToken as string | undefined;
      if (!accessToken) return;
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
      } catch (err) {
        // Netzwerkfehler → protokollieren, Session trotzdem beenden
        console.error('Backend-Logout-Event fehlgeschlagen:', err);
      }
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge:   8 * 60 * 60, // 8 Stunden (identisch zu C#-JWT TTL)
  },

  secret: process.env.NEXTAUTH_SECRET,
};
