'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getToken } from '@/lib/api-client';

// Basis-URL der API (für den authentifizierten Abruf des Porträtfotos).
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

interface MemberAvatarProps {
  userId: string;
  name: string;
  size?: number; // Durchmesser in px, Standard: 40
}

/** Ermittelt die Initialen aus einem Namen (max. zwei Buchstaben). */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// Farbpalette für den Initialen-Fallback (deterministisch nach Name).
const FARBEN = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500',
];

/** Wählt anhand des Namens reproduzierbar eine Fallback-Farbe. */
function farbeNachName(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return FARBEN[Math.abs(hash) % FARBEN.length];
}

/**
 * Zeigt das Profilbild eines Mitglieds an. Das Foto wird authentifiziert vom
 * API-Endpunkt geladen; bei fehlendem Foto oder Fehler wird ein farbiger
 * Initialen-Avatar als Fallback dargestellt.
 */
export function MemberAvatar({ userId, name, size = 40 }: MemberAvatarProps) {
  const { data: session } = useSession();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !userId) return;
    let abgebrochen = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const token = getToken(session);
        const res = await fetch(`${API_BASE}/api/profil/benutzer/${userId}/foto`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (!res.ok || abgebrochen) return;
        const blob = await res.blob();
        if (abgebrochen) return;
        objectUrl = URL.createObjectURL(blob);
        setPhotoUrl(objectUrl);
      } catch {
        // kein Foto → Initialen-Fallback wird angezeigt
      }
    })();

    return () => {
      abgebrochen = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [session, userId]);

  const initialen = getInitials(name);
  const farbe = farbeNachName(name);

  return (
    <div
      className="flex-shrink-0 rounded-full overflow-hidden"
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className={`w-full h-full ${farbe} flex items-center justify-center`}>
          <span className="text-white font-semibold select-none" style={{ fontSize: Math.round(size * 0.38) }}>
            {initialen}
          </span>
        </div>
      )}
    </div>
  );
}
