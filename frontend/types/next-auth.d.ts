// types/next-auth.d.ts
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  /**
   * Erweiterung des User-Objekts, wie es im `signIn`-Callback aus dem Backend
   * befüllt wird. Die Felder sind optional, weil das User-Objekt beim Entra-ID-
   * Login zunächst nur aus den ID-Token-Claims (profile()) entsteht und erst im
   * `signIn`-Callback über /api/auth/entra-callback vervollständigt wird.
   */
  interface User {
    accessToken?:    string;
    tokenExpiresAt?: string;
    role?:           string;
  }

  interface Session {
    user: {
      id:             string;
      role:           string;
      accessToken:    string;
      tokenExpiresAt: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId:          string;
    role:            string;
    accessToken:     string;
    tokenExpiresAt:  string;
  }
}
