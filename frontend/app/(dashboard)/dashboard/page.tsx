'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CircleDot, Zap, Ticket, Pin, ArrowRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/api-client';
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

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    apiClient.get<DashboardApiResponse>('/api/dashboard', session)
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) return <LoadingSkeleton />;

  const statCards          = buildStatCards(data?.stats);
  const topNews            = getTopNews(data?.wichtigeNews);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Übersicht</h1>

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
