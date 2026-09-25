'use client';

/* ==========================================================================
 * Kreisdarstellung (Holarchie) – grafische Ansicht des Organigramms.
 *
 * Anordnung per Circle-Packing (circle-layout.ts): Kreisgrösse folgt dem
 * Inhalt, Abstände und Titelband über Padding, Lead-Links werden mitgepackt.
 * Beschriftungen erscheinen erst, wenn sie auf dem Bildschirm lesbar gross
 * sind (MIN_SCREEN_FONT_PX), sonst beim Hineinzoomen. Farben referenzieren die
 * CSS-Design-Tokens aus app/globals.css (HSL-Tripel, z.B. --chart-1: "173
 * 38% 44%") statt hartkodierter Hex-Werte, damit Light/Dark-Mode automatisch
 * funktionieren. Detail-Sidebar nutzt die Sheet-Komponente (Purpose/Domain/
 * Accountabilities pro Kreis bzw. Rolle). Filter "Meine Rollen" und das
 * Highlight-Menü teilen sich einen gemeinsamen highlightMode-State und
 * dimmen nicht-passende Rollen per Opacity, statt sie auszublenden (damit
 * die rekursive Platzierungslogik unangetastet bleibt). Erhält die Daten
 * als Props von ../page.tsx (kein eigener Fetch), damit Baum- und
 * Kreisansicht dieselbe Datenquelle teilen.
 * ========================================================================== */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { stripHtml } from '@/lib/utils';
import type { GraphCircle, GraphRole, TreeNode } from './types';
import { layoutCircles, fitText, LAYOUT_SIZE, type LayoutItem } from './circle-layout';

/**
 * "Meine Rollen"-Filter. Da pro Kreis nur noch der Lead-Link angezeigt wird,
 * sind rollentyp-basierte Hervorhebungen (Koordinator/Repräsentant/
 * Moderator) hier nicht mehr sinnvoll – alle sichtbaren Rollen sind bereits
 * Lead-Links.
 */
export type HighlightMode = 'none' | 'myRoles';

function roleMatchesHighlight(role: GraphRole, mode: HighlightMode, myRoleIds: Set<string>): boolean {
  switch (mode) {
    case 'none': return true;
    case 'myRoles': return myRoleIds.has(role.id);
    default: return true;
  }
}

/* ------------------------------------------------------------------ */
/*  Color palette – CSS-Design-Tokens (app/globals.css), keine Hex-    */
/*  Werte. Kreistiefe rotiert über die 5 Chart-Tokens; die Rollen-     */
/*  Badges nutzen semantisch passende Tokens (Primary für "normal",    */
/*  da das bereits die historische Markenfarbe #3e8f88 ist).           */
/* ------------------------------------------------------------------ */

const CIRCLE_COLORS = [
  { fill: 'hsl(var(--chart-1) / 0.10)', stroke: 'hsl(var(--chart-1))' },
  { fill: 'hsl(var(--chart-2) / 0.10)', stroke: 'hsl(var(--chart-2))' },
  { fill: 'hsl(var(--chart-3) / 0.10)', stroke: 'hsl(var(--chart-3))' },
  { fill: 'hsl(var(--chart-4) / 0.10)', stroke: 'hsl(var(--chart-4))' },
  { fill: 'hsl(var(--chart-5) / 0.10)', stroke: 'hsl(var(--chart-5))' },
];
// Beschriftungstext immer in --foreground, unabhängig von der Kreisfarbe –
// garantiert ausreichenden Kontrast in Light- und Dark-Mode.
const LABEL_COLOR = 'hsl(var(--foreground))';

const ROLE_BADGE_COLORS = {
  leadLink: { bg: 'hsl(var(--accent) / 0.15)', hoverBg: 'hsl(var(--accent) / 0.30)', border: 'hsl(var(--accent))' },
  coordinator: { bg: 'hsl(var(--chart-3) / 0.15)', hoverBg: 'hsl(var(--chart-3) / 0.30)', border: 'hsl(var(--chart-3))' },
  representative: { bg: 'hsl(var(--chart-5) / 0.15)', hoverBg: 'hsl(var(--chart-5) / 0.30)', border: 'hsl(var(--chart-5))' },
  facilitator: { bg: 'hsl(var(--chart-2) / 0.15)', hoverBg: 'hsl(var(--chart-2) / 0.30)', border: 'hsl(var(--chart-2))' },
  normal: { bg: 'hsl(var(--primary) / 0.10)', hoverBg: 'hsl(var(--primary) / 0.25)', border: 'hsl(var(--primary))' },
};

/* ------------------------------------------------------------------ */
/*  Utility: build hierarchy tree                                      */
/* ------------------------------------------------------------------ */

function buildTree(circles: GraphCircle[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  circles.forEach(c => map.set(c.id, { circle: c, children: [], depth: 0 }));

  const roots: TreeNode[] = [];
  circles.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      const parent = map.get(c.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  function setDepth(node: TreeNode, d: number) {
    node.depth = d;
    node.children.forEach(ch => setDepth(ch, d + 1));
  }
  roots.forEach(r => setDepth(r, 0));

  return roots;
}

type RoleBadgeType = keyof typeof ROLE_BADGE_COLORS;

function getRoleBadgeType(role: GraphRole): RoleBadgeType {
  if (role.isLeadLink) return 'leadLink';
  if (role.isCoordinator) return 'coordinator';
  if (role.isRepresentative) return 'representative';
  if (role.isFacilitator) return 'facilitator';
  return 'normal';
}

/**
 * Minimale Schriftgrösse auf dem Bildschirm (px), ab der Beschriftungen
 * angezeigt werden. Kleinere Texte wären unlesbar und würden nur überlagern;
 * sie erscheinen beim Hineinzoomen (der volle Name steht immer im <title>).
 */
const MIN_SCREEN_FONT_PX = 9;

/** Bricht einen Text in höchstens `maxLines` Zeilen um, die in `maxWidth` passen. */
function wrapText(text: string, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (fitText(candidate, fontSize, maxWidth) === candidate) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === 0) return [];
  // Rest, der nicht mehr passt, mit Auslassungszeichen andeuten.
  const shown = lines.join(' ');
  const last = lines.length - 1;
  lines[last] = fitText(shown.length < text.length ? lines[last] + ' …' : lines[last], fontSize, maxWidth);
  return lines.filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  SVG-Ebene: Kreise und Lead-Links gemäss Layout                     */
/* ------------------------------------------------------------------ */

export interface CircleLayerProps {
  layout: LayoutItem[];
  /** Bildschirm-Pixel pro SVG-Einheit (für die Lesbarkeitsgrenze der Texte). */
  screenScale: number;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  highlightMode: HighlightMode;
  myRoleIds: Set<string>;
  handleCircleClick: (circleId: string) => void;
  handleRoleClick: (roleId: string, circleId: string) => void;
}

export function CircleLayer({
  layout, screenScale, hoveredId, setHoveredId, highlightMode, myRoleIds, handleCircleClick, handleRoleClick,
}: CircleLayerProps) {
  const isReadable = (fontSize: number) => fontSize * screenScale >= MIN_SCREEN_FONT_PX;

  return <>{layout.map(item => {
    if (item.kind === 'circle') {
      const color = CIRCLE_COLORS[item.depth % CIRCLE_COLORS.length];
      const isHovered = hoveredId === `circle-${item.id}`;
      const name = stripHtml(item.circle.name);
      const fontSize = item.titleSize;
      const hasLeadLinkInside = !item.hasSubcircles && item.circle.roles.some(r => r.isLeadLink);

      let label: React.ReactNode = null;
      if (isReadable(fontSize)) {
        if (item.hasSubcircles) {
          // Titel entlang des oberen Bogens im freigehaltenen Titelband.
          const arcRadius = item.r - fontSize * 1.18;
          const text = fitText(name, fontSize, Math.PI * arcRadius * 0.7);
          label = (
            <>
              <path
                id={`arc-${item.id}`}
                d={`M ${item.x - arcRadius} ${item.y} A ${arcRadius} ${arcRadius} 0 0 1 ${item.x + arcRadius} ${item.y}`}
                fill="none"
              />
              <text fill={LABEL_COLOR} fontSize={fontSize} fontWeight="700" style={{ pointerEvents: 'none' }}>
                <textPath href={`#arc-${item.id}`} startOffset="50%" textAnchor="middle">{text}</textPath>
              </text>
            </>
          );
        } else {
          // Kreis ohne Subkreise: Titel mittig (bei Lead-Link etwas nach oben), max. 2 Zeilen.
          const lines = wrapText(name, fontSize, item.r * 1.6, 2);
          const centerY = hasLeadLinkInside ? item.y - item.r * 0.18 : item.y;
          const firstY = centerY - ((lines.length - 1) * fontSize * 1.15) / 2 + fontSize * 0.35;
          label = (
            <text textAnchor="middle" fill={LABEL_COLOR} fontSize={fontSize} fontWeight="700" style={{ pointerEvents: 'none' }}>
              {lines.map((line, li) => (
                <tspan key={li} x={item.x} y={firstY + li * fontSize * 1.15}>{line}</tspan>
              ))}
            </text>
          );
        }
      }

      return (
        <g key={`circle-${item.id}`}>
          <circle
            cx={item.x}
            cy={item.y}
            r={item.r}
            fill={color.fill}
            stroke={isHovered ? LABEL_COLOR : color.stroke}
            strokeWidth={isHovered ? 3 : 2}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: 'pointer', transition: 'stroke 0.2s' }}
            onMouseEnter={() => setHoveredId(`circle-${item.id}`)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => handleCircleClick(item.id)}
          >
            <title>{name}</title>
          </circle>
          {label}
        </g>
      );
    }

    // Lead-Link
    const role = item.role;
    const badge = ROLE_BADGE_COLORS[getRoleBadgeType(role)];
    const isRoleHovered = hoveredId === `role-${role.id}`;
    const isHighlightMatch = roleMatchesHighlight(role, highlightMode, myRoleIds);
    // Bei aktivem Filter werden nicht-passende Rollen abgedunkelt statt
    // ausgeblendet (Platzierung bleibt unverändert).
    const dimmed = highlightMode !== 'none' && !isHighlightMatch;
    const roleName = stripHtml(role.name);
    const roleFont = Math.min(11, item.r * 0.3);
    const roleText = isReadable(roleFont) ? fitText(roleName, roleFont, item.r * 1.7) : '';

    return (
      <g
        key={`role-${item.id}`}
        onMouseEnter={() => setHoveredId(`role-${role.id}`)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => handleRoleClick(role.id, item.circle.id)}
        opacity={dimmed ? 0.25 : 1}
        style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
      >
        <circle
          cx={item.x}
          cy={item.y}
          r={item.r}
          fill={isRoleHovered ? badge.hoverBg : badge.bg}
          stroke={badge.border}
          strokeWidth={isRoleHovered || (!dimmed && highlightMode !== 'none') ? 2.5 : 1.5}
          vectorEffect="non-scaling-stroke"
          style={{ transition: 'fill 0.2s' }}
        >
          <title>{`${roleName} – ${stripHtml(item.circle.name)}`}</title>
        </circle>
        {roleText && (
          <text
            x={item.x}
            y={item.y + roleFont * 0.35}
            textAnchor="middle"
            fill={LABEL_COLOR}
            fontSize={roleFont}
            fontWeight="500"
            style={{ pointerEvents: 'none' }}
          >
            {roleText}
          </text>
        )}
      </g>
    );
  })}</>;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface OrgCircleViewProps {
  circles: GraphCircle[];
  loading: boolean;
  error: string | null;
  /** Klick auf einen Kreis (nicht auf den Lead-Link) verzweigt in die Baumansicht. */
  onNavigateToTree: (circleId: string) => void;
}

export function OrgCircleView({ circles, loading, error, onNavigateToTree }: OrgCircleViewProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1600, h: 1200 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  // Aktuelle Standard-Ansicht (für "Ansicht zurücksetzen").
  const defaultViewBoxRef = useRef({ x: 0, y: 0, w: 1600, h: 1200 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Klick auf den Lead-Link öffnet die Detail-Sidebar (Purpose/Domain/
  // Accountabilities); Klick auf den Kreis selbst verzweigt stattdessen in
  // die Baumansicht (siehe onNavigateToTree).
  const [selectedRole, setSelectedRole] = useState<{ circle: GraphCircle; role: GraphRole } | null>(null);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('none');

  // Hierarchie aufbauen und per Circle-Packing anordnen (siehe circle-layout.ts).
  const tree = useMemo(() => buildTree(circles), [circles]);
  const layout = useMemo(() => layoutCircles(tree), [tree]);

  // Bildschirm-Pixel pro SVG-Einheit – bestimmt, welche Beschriftungen gross
  // genug zum Lesen sind (siehe MIN_SCREEN_FONT_PX).
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Rollen-IDs, in denen der aktuelle Benutzer besetzt ist ("Meine Rollen"-Filter).
  const myRoleIds = useMemo(() => {
    const uid = session?.user?.id;
    const ids = new Set<string>();
    if (!uid) return ids;
    for (const c of circles) {
      for (const r of c.roles) {
        if (r.assignments.some(a => a.user.id === uid)) ids.add(r.id);
      }
    }
    return ids;
  }, [circles, session?.user?.id]);

  const handleCircleClick = useCallback((circleId: string) => {
    onNavigateToTree(circleId);
  }, [onNavigateToTree]);

  const handleRoleClick = useCallback((roleId: string, circleId: string) => {
    const c = circles.find(cc => cc.id === circleId);
    const r = c?.roles.find(rr => rr.id === roleId);
    if (c && r) setSelectedRole({ circle: c, role: r });
  }, [circles]);

  // Zoom
  const zoom = useCallback((factor: number) => {
    setViewBox(prev => {
      const centerX = prev.x + prev.w / 2;
      const centerY = prev.y + prev.h / 2;
      const newW = prev.w * factor;
      const newH = prev.h * factor;
      return { x: centerX - newW / 2, y: centerY - newH / 2, w: newW, h: newH };
    });
  }, []);

  const resetView = useCallback(() => {
    setViewBox(defaultViewBoxRef.current);
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y };
  }, [viewBox]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    const dx = (e.clientX - panStart.current.x) * scaleX;
    const dy = (e.clientY - panStart.current.y) * scaleY;
    setViewBox(prev => ({ ...prev, x: panStart.current.vx - dx, y: panStart.current.vy - dy }));
  }, [isPanning, viewBox.w, viewBox.h]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    zoom(factor);
  }, [zoom]);

  // Standard-Ansicht: rahmt die gesamte Packfläche mit etwas Rand.
  const hasLayout = layout.length > 0;
  const defaultViewBox = useMemo(() => {
    const pad = LAYOUT_SIZE * 0.03;
    return { x: -pad, y: -pad, w: LAYOUT_SIZE + pad * 2, h: LAYOUT_SIZE + pad * 2 };
  }, []);

  // SVG skaliert mit preserveAspectRatio "xMidYMid meet" -> der kleinere Faktor gilt.
  const screenScale = containerSize.w > 0 && containerSize.h > 0
    ? Math.min(containerSize.w / viewBox.w, containerSize.h / viewBox.h)
    : 0;
  // Beim ersten Laden der Daten die Ansicht passend auf den Inhalt rahmen.
  const viewInitialized = useRef(false);
  useEffect(() => {
    defaultViewBoxRef.current = defaultViewBox;
    if (!viewInitialized.current && hasLayout) {
      setViewBox(defaultViewBox);
      viewInitialized.current = true;
    }
  }, [hasLayout, defaultViewBox]);

  return (
    <div className="space-y-4">
      {/* Zoom controls + legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-2.5">
          <span className="font-medium text-foreground">Legende:</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-primary bg-primary/15" />
            Kreis
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-accent bg-accent/15" />
            Lead-Link
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="only-my-roles"
              checked={highlightMode === 'myRoles'}
              disabled={!session?.user?.id}
              onCheckedChange={(checked) => setHighlightMode(checked ? 'myRoles' : 'none')}
            />
            <Label htmlFor="only-my-roles" className="text-sm text-muted-foreground cursor-pointer">
              Nur meine Rollen
            </Label>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => zoom(0.8)}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Vergrössern</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => zoom(1.25)}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Verkleinern</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={resetView}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ansicht zurücksetzen</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Graph area */}
      <div
        ref={containerRef}
        className="relative w-full bg-card rounded-xl border border-border shadow-sm overflow-hidden"
        style={{ height: 'calc(100vh - 340px)', minHeight: 500 }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Lade Organigramm…</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && circles.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Info className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">Keine Kreise vorhanden</p>
              <p className="text-sm text-muted-foreground mt-1">Erstellen Sie zuerst Kreise unter Organisation → Kreise</p>
            </div>
          </div>
        )}

        {!loading && !error && circles.length > 0 && (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <defs>
              <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.08" />
              </filter>
            </defs>
            {/* Background grid */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.5" />
            </pattern>
            <rect x={viewBox.x - 2000} y={viewBox.y - 2000} width={viewBox.w + 4000} height={viewBox.h + 4000} fill="url(#grid)" />
            <CircleLayer
              layout={layout}
              screenScale={screenScale}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              highlightMode={highlightMode}
              myRoleIds={myRoleIds}
              handleCircleClick={handleCircleClick}
              handleRoleClick={handleRoleClick}
            />
          </svg>
        )}
      </div>

      {/* Detail-Sidebar: Purpose/Domain/Accountabilities des angeklickten Lead-Links. */}
      <Sheet open={selectedRole !== null} onOpenChange={(open) => { if (!open) setSelectedRole(null); }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selectedRole && (
            <RoleSheetContent
              circle={selectedRole.circle}
              role={selectedRole.role}
              onOpenDetails={() => router.push(`/organisation/kreise/${selectedRole.circle.id}`)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sheet-Inhalte: Kreis- bzw. Rollen-Details                          */
/*  (Kreis hat kein separates Domain-Feld – nur Zweck + Verantwort-    */
/*  lichkeiten; die Rolle hat Zweck, Domäne UND Verantwortlichkeiten   */
/*  getrennt, da diese aus der Rollendefinition stammen.)              */
/* ------------------------------------------------------------------ */

function RoleTypeBadges({ role }: { role: GraphRole }) {
  const badges: { label: string; symbol: string; type: RoleBadgeType }[] = [];
  if (role.isCoordinator) badges.push({ label: 'Koordinator', symbol: '★', type: 'coordinator' });
  if (role.isRepresentative) badges.push({ label: 'Repräsentant', symbol: '◆', type: 'representative' });
  if (role.isFacilitator) badges.push({ label: 'Moderator', symbol: '●', type: 'facilitator' });
  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map(b => {
        const colors = ROLE_BADGE_COLORS[b.type];
        return (
          <Badge
            key={b.type}
            variant="outline"
            style={{ backgroundColor: colors.bg, borderColor: colors.border }}
          >
            {b.symbol} {b.label}
          </Badge>
        );
      })}
      {role.isLeadLink && <Badge variant="secondary">Lead-Link</Badge>}
    </div>
  );
}

function RoleSheetContent({ circle, role, onOpenDetails }: { circle: GraphCircle; role: GraphRole; onOpenDetails: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>{stripHtml(role.name)}</SheetTitle>
        <SheetDescription>Rolle im Kreis „{stripHtml(circle.name)}"</SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-6 py-6">
        <RoleTypeBadges role={role} />

        {role.description && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Beschreibung</h3>
            <p className="text-sm text-foreground">{stripHtml(role.description)}</p>
          </div>
        )}

        {role.purpose && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Zweck</h3>
            <p className="text-sm text-foreground">{stripHtml(role.purpose)}</p>
          </div>
        )}

        {role.domain && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bereiche</h3>
            <p className="text-sm text-foreground">{stripHtml(role.domain)}</p>
          </div>
        )}

        {role.accountabilities && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Verantwortlichkeiten</h3>
            <p className="text-sm text-foreground">{stripHtml(role.accountabilities)}</p>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Besetzung ({role.assignments.length})</h3>
          <div className="space-y-1.5">
            {role.assignments.map(a => (
              <div key={a.user.id} className="text-sm text-foreground">
                {a.user.name || 'Unbekannt'}
                {a.user.email && <span className="text-muted-foreground"> · {a.user.email}</span>}
              </div>
            ))}
            {role.assignments.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Nicht besetzt</p>
            )}
          </div>
        </div>
      </div>

      <Button className="w-full" onClick={onOpenDetails}>Kreis-Details öffnen</Button>
    </div>
  );
}
