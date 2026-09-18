// hooks/use-session-token.ts
import { useSession } from 'next-auth/react';

/** Gibt den C#-JWT-Token des aktuellen Users zurück */
export function useSessionToken(): string | undefined {
  const { data: session } = useSession();
  return (session?.user as any)?.accessToken;
}

/** Gibt die gesamte Session zurück (für apiClient-Aufrufe) */
export function useCurrentSession() {
  return useSession();
}
