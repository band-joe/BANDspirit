'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, CircleDot, Zap, Ticket, Pin, ArrowRight, AlertTriangle, RefreshCw, Lock } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
import { ApiError } from '@/lib/errors';
import { DashboardApiResponse, DashboardNewsItem } from '@/lib/types';
import { buildStatCards, getTopNews } from '@/lib/dashboard-helpers';

// ─────────────────────────────── Sub-Komponenten ──────────────────────────────

/** Animierter Zähler der von 0 auf `value` hochzählt */
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!value) { setCount(0); return; }
    let current = 0;
    const step = Math.ceil(value / (duration / 30));
    const timer = setInterval(() => {
      current += step;
      if (current >= value) { setCount(value); clearInterval(timer); }
      else setCount(current);
    }, 30);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{count}</span>;
}

/** Icon-Mapping für Stat-Karten */
const STAT_ICONS: Record<string, React.ElementType> = {
  users: Users, circles: CircleDot, drivers: Zap, tickets: Ticket,
};

// ─────────────────────────────── Haupt-Seite ──────────────────────────────────

// UI-07-Fix: Ladezustände (loading/erfolgreich-leer/erfolgreich-befüllt/
// fehlgeschlagen) explizit unterscheiden, statt einen fehlgeschlagenen Abruf
// stillschweigend als Null-Kennzahlen darzustellen - Null ist ein gültiges
// Geschäftsergebnis und darf nicht mit "nicht verfügbar" verwechselt werden.
type LadeZustand = 'lädt' | 'erfolgreich' | 'fehler';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [zustand, setZustand] = useState<LadeZustand>('lädt');
  const [fehlerText, setFehlerText] = useState<string | null>(null);

  const laden = useCallback(async () => {
    if (!session) return;
    setZustand(prev => (prev === 'erfolgreich' ? prev : 'lädt'));
    try {
      const d = await apiClient.get<DashboardApiResponse>('/api/dashboard', session);
      setData(d);
      setZustand('erfolgreich');
      setFehlerText(null);
    } catch (err: unknown) {
      const text = err instanceof ApiError
        ? err.isUnauthorized || err.isForbidden
          ? 'Sie sind nicht berechtigt, das Dashboard zu sehen.'
          : err.isServerError
            ? 'Der Server ist derzeit nicht erreichbar.'
            : err.message || 'Das Dashboard konnte nicht geladen werden.'
        : 'Netzwerkfehler – bitte Verbindung prüfen.';
      setFehlerText(text);
      // Bereits geladene Daten (aus einem vorherigen erfolgreichen Abruf)
      // bleiben sichtbar ("stale"-Zustand); nur bei einem Erst-Fehlschlag
      // ohne vorhandene Daten wird der volle Fehlerzustand angezeigt.
      setZustand(prev => (prev === 'erfolgreich' && data ? 'erfolgreich' : 'fehler'));
    }
  }, [session, data]);

  useEffect(() => { laden(); }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  if (zustand === 'lädt') return <LoadingSkeleton />;

  if (zustand === 'fehler' && !data) {
    return <FehlerZustand text={fehlerText} onRetry={laden} />;
  }

  const statCards          = buildStatCards(data?.stats);
  const topNews            = getTopNews(data?.wichtigeNews);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Übersicht</h1>
        {zustand === 'fehler' && (
          <div role="status" className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Aktualisierung fehlgeschlagen – zeige zuletzt geladene Daten.</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-amber-800 hover:bg-amber-100" onClick={laden}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Erneut versuchen
            </Button>
          </div>
        )}
      </div>

      {/* Stat-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = STAT_ICONS[card.key] ?? CircleDot;
          return (
            <motion.div key={card.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.1 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="text-3xl font-bold"><AnimatedCounter value={card.value} /></p>
                      <p className="text-xs text-muted-foreground mt-1">{card.subtext}</p>
                    </div>
                    <div className={`h-12 w-12 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${card.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Wichtige BI-Guide-Informationen */}
      {topNews.length > 0 && <NewsSection news={topNews} />}
    </div>
  );
}

// ─────────────────────────────── Abschnitt-Komponenten ────────────────────────

function NewsSection({ news }: { news: DashboardNewsItem[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Pin className="h-4 w-4 text-amber-500" />
            Wichtige Informationen BI-Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {news.map((item) => (
              <Link key={item.id} href="/organisation/bi-guide" className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{item.titel}</p>
                    {item.kategorie && <Badge variant="outline" className="text-[10px] flex-shrink-0">{item.kategorie}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.inhalt}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">von {item.createdBy?.name} — {formatDate(item.createdAt)}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
        ))}
      </div>
    </div>
  );
}

/** UI-07-Fix: Expliziter Fehlerzustand mit Grund und Retry, statt Null-Kennzahlen. */
function FehlerZustand({ text, onRetry }: { text: string | null; onRetry: () => void }) {
  const istBerechtigung = text?.startsWith('Sie sind nicht berechtigt');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Übersicht</h1>
      <Card>
        <CardContent className="py-16 flex flex-col items-center text-center">
          {istBerechtigung ? (
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
          ) : (
            <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
          )}
          <h2 className="text-lg font-semibold mb-1">Dashboard konnte nicht geladen werden</h2>
          <p className="text-muted-foreground mb-4">{text ?? 'Unbekannter Fehler.'}</p>
          {!istBerechtigung && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" /> Erneut versuchen
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
