'use client';

/* ==========================================================================
 * Kreisdarstellung (Holarchie) – grafische Ansicht des Organigramms.
 *
 * Anordnung per Circle-Packing (circle-layout.ts): Kreisgrösse folgt dem
 * Inhalt, Abstände und Titelband über Padding, Lead-Links werden mitgepackt.
 * Beschriftungen erscheinen erst, wenn sie auf dem Bildschirm lesbar gross
 * sind (MIN_SCREEN_FONT_PX), sonst beim Hineinzoomen.
 *
 * Barrierefreiheit (WCAG 2.2 AA, siehe Dokumentation/Vorgehensplan-
 * Kreisansicht.md): Die Grafik ist ein ARIA-Tree (role="tree"/"treeitem"
 * mit aria-level/-setsize/-posinset) mit einem Tabstopp und Pfeiltasten-
 * Navigation (circle-nav.ts); der fokussierte Eintrag wird in den
 * sichtbaren Bereich gezoomt. Umrisse nutzen die --circle-stroke-*-Tokens
 * (>= 3:1), die Tiefe ist zusätzlich an der Strichstärke erkennbar, der
 * Lead-Link an einem Stern-Symbol. Pan per Pointer Events (Maus/Touch/
 * Stift), Mausrad-Zoom nur mit Ctrl. Die Baumansicht ist als Textalternative
 * verlinkt. Erhält die Daten als Props von ../page.tsx (kein eigener Fetch).
 * ========================================================================== */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut, Maximize2, Info, List } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { stripHtml } from '@/lib/utils';
import type { GraphCircle, GraphRole, TreeNode } from './types';
import { layoutCircles, fitText, LAYOUT_SIZE, type LayoutItem } from './circle-layout';
import { buildNavigation, navigate, type NavKey, type NavMap } from './circle-nav';

/**
 * "Meine Rollen hervorheben": Rollen, in denen der angemeldete Benutzer
 * besetzt ist, werden markiert (Rand + Häkchen). Andere Rollen bleiben voll
 * lesbar – kein Abdunkeln (WCAG 1.4.3).
 */
export type HighlightMode = 'none' | 'myRoles';

/* ------------------------------------------------------------------ */
/*  Farben – CSS-Design-Tokens (app/globals.css), keine Hex-Werte.     */
/*  Füllung: dezente Tönung der Chart-Tokens (nur Dekoration);         */
/*  Umriss: --circle-stroke-* mit >= 3:1 Kontrast (WCAG 1.4.11).       */
/* ------------------------------------------------------------------ */

const CIRCLE_COLORS = [1, 2, 3, 4, 5].map(i => ({
  fill: `hsl(var(--chart-${i}) / 0.10)`,
  stroke: `hsl(var(--circle-stroke-${i}))`,
}));
/** Tiefe zusätzlich über die Strichstärke (px) erkennbar, nicht nur über Farbe (WCAG 1.4.1). */
const STROKE_WIDTH_BY_DEPTH = [3.5, 2.75, 2.25, 1.75, 1.5];
// Beschriftungstext immer in --foreground, unabhängig von der Kreisfarbe –
// garantiert ausreichenden Kontrast in Light- und Dark-Mode.
const LABEL_COLOR = 'hsl(var(--foreground))';

const ROLE_BADGE_COLORS = {
  leadLink: { bg: 'hsl(var(--accent) / 0.15)', hoverBg: 'hsl(var(--accent) / 0.30)', border: 'hsl(var(--circle-stroke-1))' },
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

/**
 * Minimale Schriftgrösse auf dem Bildschirm (px), ab der Beschriftungen
 * angezeigt werden. Kleinere Texte wären unlesbar und würden nur überlagern;
 * sie erscheinen beim Hineinzoomen (der volle Name steht immer im <title>
 * und im aria-label).
 */
const MIN_SCREEN_FONT_PX = 9;

/** Mindest-Klickfläche auf dem Bildschirm (WCAG 2.5.8: 24×24 px). */
const MIN_TARGET_PX = 24;

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

/** Punkte eines fünfzackigen Sterns (Lead-Link-Symbol) als SVG-points-String. */
function starPoints(cx: number, cy: number, outer: number): string {
  const inner = outer * 0.45;
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  }).join(' ');
}

function personList(role: GraphRole): string {
  const names = role.assignments.map(a => a.user.name).filter(Boolean) as string[];
  return names.length > 0 ? `besetzt durch ${names.join(', ')}` : 'nicht besetzt';
}

/** Sprechende Beschriftung für Screenreader (aria-label) eines Layout-Eintrags. */
function itemLabel(item: LayoutItem, isMine: boolean, subCount: number): string {
  if (item.kind === 'circle') {
    const name = stripHtml(item.circle.name);
    const leadLink = item.circle.roles.find(r => r.isLeadLink);
    const parts = [
      `Kreis ${name}`,
      subCount > 0 ? `${subCount} ${subCount === 1 ? 'Subkreis' : 'Subkreise'}` : 'keine Subkreise',
      leadLink ? `Lead-Link ${personList(leadLink)}` : 'kein Lead-Link',
    ];
    return parts.join(', ');
  }
  return [
    `${stripHtml(item.role.name)} im Kreis ${stripHtml(item.circle.name)}`,
    personList(item.role),
    ...(isMine ? ['deine Rolle'] : []),
  ].join(', ');
}

/* ------------------------------------------------------------------ */
/*  SVG-Ebene: Kreise und Lead-Links gemäss Layout                     */
/* ------------------------------------------------------------------ */

export interface CircleLayerProps {
  layout: LayoutItem[];
  nav: NavMap;
  /** Bildschirm-Pixel pro SVG-Einheit (für Lesbarkeit und Klickflächen). */
  screenScale: number;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  highlightMode: HighlightMode;
  myRoleIds: Set<string>;
  /** Eintrag mit tabIndex 0 (roving tabindex). */
  focusedId: string | null;
  onItemFocus: (id: string) => void;
  registerItem: (id: string, el: SVGGElement | null) => void;
  handleCircleClick: (circleId: string) => void;
  handleRoleClick: (roleId: string, circleId: string) => void;
}

export function CircleLayer({
  layout, nav, screenScale, hoveredId, setHoveredId, highlightMode, myRoleIds,
  focusedId, onItemFocus, registerItem, handleCircleClick, handleRoleClick,
}: CircleLayerProps) {
  const isReadable = (fontSize: number) => fontSize * screenScale >= MIN_SCREEN_FONT_PX;
  // Radius in SVG-Einheiten, der auf dem Bildschirm px Pixeln entspricht.
  const unitsFor = (px: number) => (screenScale > 0 ? px / screenScale : 0);
  // Anzahl direkter Subkreise je Kreis (für das aria-label).
  const subcircleCounts = new Map<string, number>();
  for (const i of layout) {
    if (i.kind === 'circle' && i.parentId) subcircleCounts.set(i.parentId, (subcircleCounts.get(i.parentId) ?? 0) + 1);
  }

  return <>{layout.map(item => {
    const n = nav.get(item.id);
    const ariaTree = {
      role: 'treeitem',
      'aria-level': n?.level,
      'aria-setsize': n?.setSize,
      'aria-posinset': n?.posInSet,
      tabIndex: item.id === focusedId ? 0 : -1,
      ref: (el: SVGGElement | null) => registerItem(item.id, el),
      onFocus: () => onItemFocus(item.id),
    } as const;
    // Fokus-Markierung: dunkler Ring mit hellem Halo – auf jedem Hintergrund
    // sichtbar (WCAG 2.4.7/1.4.11); nur bei Tastatur-Fokus (:focus-visible).
    const focusRing = (r: number) => (
      <g className="kv-focus invisible group-focus-visible:visible" style={{ pointerEvents: 'none' }}>
        <circle cx={item.x} cy={item.y} r={r} fill="none" stroke="hsl(var(--background))" strokeWidth={8} vectorEffect="non-scaling-stroke" />
        <circle cx={item.x} cy={item.y} r={r} fill="none" stroke={LABEL_COLOR} strokeWidth={3.5} vectorEffect="non-scaling-stroke" />
      </g>
    );

    if (item.kind === 'circle') {
      const color = CIRCLE_COLORS[item.depth % CIRCLE_COLORS.length];
      const strokeWidth = STROKE_WIDTH_BY_DEPTH[Math.min(item.depth, STROKE_WIDTH_BY_DEPTH.length - 1)];
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
              <text fill={LABEL_COLOR} fontSize={fontSize} fontWeight="700" style={{ pointerEvents: 'none' }} aria-hidden="true">
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
            <text textAnchor="middle" fill={LABEL_COLOR} fontSize={fontSize} fontWeight="700" style={{ pointerEvents: 'none' }} aria-hidden="true">
              {lines.map((line, li) => (
                <tspan key={li} x={item.x} y={firstY + li * fontSize * 1.15}>{line}</tspan>
              ))}
            </text>
          );
        }
      }

      return (
        <g
          key={`circle-${item.id}`}
          {...ariaTree}
          aria-label={itemLabel(item, false, subcircleCounts.get(item.id) ?? 0)}
          aria-expanded={n && n.children.length > 0 ? true : undefined}
          className="group outline-none"
          onClick={(e) => { e.stopPropagation(); handleCircleClick(item.id); }}
          onPointerEnter={() => setHoveredId(`circle-${item.id}`)}
          onPointerLeave={() => setHoveredId(null)}
        >
          <circle
            className="kv-circle motion-safe:transition-colors"
            cx={item.x}
            cy={item.y}
            r={item.r}
            fill={color.fill}
            stroke={isHovered ? LABEL_COLOR : color.stroke}
            strokeWidth={isHovered ? strokeWidth + 1 : strokeWidth}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: 'pointer' }}
          >
            <title>{name}</title>
          </circle>
          {label}
          {focusRing(item.r)}
        </g>
      );
    }

    // Lead-Link
    const role = item.role;
    const badge = ROLE_BADGE_COLORS.leadLink;
    const isRoleHovered = hoveredId === `role-${role.id}`;
    const isMine = highlightMode === 'myRoles' && myRoleIds.has(role.id);
    const roleName = stripHtml(role.name);
    const roleFont = Math.min(11, item.r * 0.3);
    const showText = isReadable(roleFont);
    const roleText = showText ? fitText(roleName, roleFont, item.r * 1.7) : '';
    const starSize = showText ? roleFont * 0.75 : item.r * 0.5;
    const starY = showText ? item.y - roleFont * 0.9 : item.y;
    // Unsichtbare Klickfläche mit mind. 24 px Durchmesser (WCAG 2.5.8).
    const hitRadius = Math.max(item.r, unitsFor(MIN_TARGET_PX / 2));

    return (
      <g
        key={`role-${item.id}`}
        {...ariaTree}
        aria-label={itemLabel(item, isMine, 0)}
        className="group outline-none"
        onClick={(e) => { e.stopPropagation(); handleRoleClick(role.id, item.circle.id); }}
        onPointerEnter={() => setHoveredId(`role-${role.id}`)}
        onPointerLeave={() => setHoveredId(null)}
        style={{ cursor: 'pointer' }}
      >
        <circle cx={item.x} cy={item.y} r={hitRadius} fill="transparent" />
        <circle
          className="kv-circle motion-safe:transition-colors"
          cx={item.x}
          cy={item.y}
          r={item.r}
          fill={isRoleHovered ? badge.hoverBg : badge.bg}
          stroke={isMine ? LABEL_COLOR : badge.border}
          strokeWidth={isMine ? 4 : isRoleHovered ? 2.5 : 1.75}
          vectorEffect="non-scaling-stroke"
        >
          <title>{`${roleName} – ${stripHtml(item.circle.name)}`}</title>
        </circle>
        {/* Stern = Lead-Link (Symbol statt nur Farbe, WCAG 1.4.1) */}
        <polygon points={starPoints(item.x, starY, starSize)} fill={badge.border} style={{ pointerEvents: 'none' }} aria-hidden="true" />
        {roleText && (
          <text
            x={item.x}
            y={item.y + roleFont * 0.75}
            textAnchor="middle"
            fill={LABEL_COLOR}
            fontSize={roleFont}
            fontWeight="500"
            style={{ pointerEvents: 'none' }}
            aria-hidden="true"
          >
            {roleText}
          </text>
        )}
        {/* Häkchen = eigene Rolle (mind. 18 px gross, oben rechts auf dem Rand) */}
        {isMine && (() => {
          const br = Math.max(item.r * 0.35, unitsFor(9));
          const bx = item.x + item.r * 0.8;
          const by = item.y - item.r * 0.6;
          return (
            <g style={{ pointerEvents: 'none' }} aria-hidden="true">
              <circle cx={bx} cy={by} r={br} fill={LABEL_COLOR} stroke="hsl(var(--background))" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              <path
                d={`M ${bx - br * 0.45} ${by} l ${br * 0.3} ${br * 0.32} l ${br * 0.55} -${br * 0.6}`}
                fill="none"
                stroke="hsl(var(--background))"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })()}
        {focusRing(item.r)}
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
  /** Wechsel in die Baumansicht als Textalternative (WCAG 1.1.1). */
  onShowList?: () => void;
}

type ViewBox = { x: number; y: number; w: number; h: number };

const NAV_KEYS: NavKey[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

export function OrgCircleView({ circles, loading, error, onNavigateToTree, onShowList }: OrgCircleViewProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom state
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, w: 1600, h: 1200 });
  const [isPanning, setIsPanning] = useState(false);
  // Pan startet erst nach kurzer Bewegung, damit Klicks auf Kreise weiter funktionieren.
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number; pointerId: number; active: boolean } | null>(null);
  // Aktuelle Standard-Ansicht (für "Ansicht zurücksetzen").
  const defaultViewBoxRef = useRef<ViewBox>({ x: 0, y: 0, w: 1600, h: 1200 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Klick auf den Lead-Link öffnet die Detail-Sidebar (Purpose/Domain/
  // Accountabilities); Klick auf den Kreis selbst verzweigt stattdessen in
  // die Baumansicht (siehe onNavigateToTree).
  const [selectedRole, setSelectedRole] = useState<{ circle: GraphCircle; role: GraphRole } | null>(null);
  const [highlightMode, setHighlightMode] = useState<HighlightMode>('none');
  // Screenreader-Ansage (Zoomstand), siehe aria-live-Region.
  const [announcement, setAnnouncement] = useState('');

  // Hierarchie aufbauen und per Circle-Packing anordnen (siehe circle-layout.ts).
  const tree = useMemo(() => buildTree(circles), [circles]);
  const layout = useMemo(() => layoutCircles(tree), [tree]);
  const nav = useMemo(() => buildNavigation(layout), [layout]);
  const itemsById = useMemo(() => new Map(layout.map(i => [i.id, i])), [layout]);

  // Roving tabindex: genau ein Eintrag ist per Tab erreichbar.
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const activeFocusId = focusedId && nav.has(focusedId) ? focusedId : (layout[0]?.id ?? null);
  const itemRefs = useRef(new Map<string, SVGGElement>());
  const registerItem = useCallback((id: string, el: SVGGElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

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

  // Standard-Ansicht: rahmt die gesamte Packfläche mit etwas Rand.
  const hasLayout = layout.length > 0;
  const defaultViewBox = useMemo<ViewBox>(() => {
    const pad = LAYOUT_SIZE * 0.03;
    return { x: -pad, y: -pad, w: LAYOUT_SIZE + pad * 2, h: LAYOUT_SIZE + pad * 2 };
  }, []);

  const announceZoom = useCallback((w: number) => {
    setAnnouncement(`Zoom ${Math.round((defaultViewBoxRef.current.w / w) * 100)} %`);
  }, []);

  // Zoom um einen Punkt (SVG-Koordinaten); ohne Punkt um die Mitte.
  const zoom = useCallback((factor: number, at?: { x: number; y: number }) => {
    setViewBox(prev => {
      const cx = at?.x ?? prev.x + prev.w / 2;
      const cy = at?.y ?? prev.y + prev.h / 2;
      const next = {
        x: cx - (cx - prev.x) * factor,
        y: cy - (cy - prev.y) * factor,
        w: prev.w * factor,
        h: prev.h * factor,
      };
      announceZoom(next.w);
      return next;
    });
  }, [announceZoom]);

  const resetView = useCallback(() => {
    setViewBox(defaultViewBoxRef.current);
    announceZoom(defaultViewBoxRef.current.w);
  }, [announceZoom]);

  const pan = useCallback((dxRatio: number, dyRatio: number) => {
    setViewBox(prev => ({ ...prev, x: prev.x + prev.w * dxRatio, y: prev.y + prev.h * dyRatio }));
  }, []);

  // Fokussierten Eintrag in den sichtbaren Bereich zoomen (WCAG 2.4.11):
  // Kreise werden eingepasst, Lead-Links über ihren Kreis.
  const zoomToItem = useCallback((id: string) => {
    const item = itemsById.get(id);
    if (!item) return;
    const target = item.kind === 'role' ? itemsById.get(item.circle.id) ?? item : item;
    const size = target.r * 2 * 1.2;
    const aspect = containerSize.w > 0 && containerSize.h > 0 ? containerSize.w / containerSize.h : 1;
    const w = aspect >= 1 ? size * aspect : size;
    const h = aspect >= 1 ? size : size / aspect;
    setViewBox({ x: target.x - w / 2, y: target.y - h / 2, w, h });
    announceZoom(w);
  }, [itemsById, containerSize, announceZoom]);

  const focusItem = useCallback((id: string) => {
    setFocusedId(id);
    zoomToItem(id);
    itemRefs.current.get(id)?.focus({ preventScroll: true });
  }, [zoomToItem]);

  const handleTreeKeyDown = useCallback((e: React.KeyboardEvent) => {
    const current = activeFocusId;
    if (!current) return;
    const item = itemsById.get(current);

    if (e.shiftKey && e.key.startsWith('Arrow')) {
      const step = 0.1;
      if (e.key === 'ArrowLeft') pan(-step, 0);
      if (e.key === 'ArrowRight') pan(step, 0);
      if (e.key === 'ArrowUp') pan(0, -step);
      if (e.key === 'ArrowDown') pan(0, step);
      e.preventDefault();
      return;
    }
    if ((NAV_KEYS as string[]).includes(e.key)) {
      const next = navigate(nav, current, e.key as NavKey);
      if (next) focusItem(next);
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      if (item?.kind === 'circle') handleCircleClick(item.id);
      if (item?.kind === 'role') handleRoleClick(item.role.id, item.circle.id);
      e.preventDefault();
      return;
    }
    if (e.key === 'l' || e.key === 'L') {
      const circleId = item?.kind === 'role' ? item.circle.id : item?.id;
      const c = circles.find(cc => cc.id === circleId);
      const leadLink = c?.roles.find(r => r.isLeadLink);
      if (c && leadLink) setSelectedRole({ circle: c, role: leadLink });
      e.preventDefault();
      return;
    }
    if (e.key === '+' || e.key === '=') { zoom(0.8); e.preventDefault(); return; }
    if (e.key === '-') { zoom(1.25); e.preventDefault(); return; }
    if (e.key === '0') { resetView(); e.preventDefault(); }
  }, [activeFocusId, itemsById, nav, focusItem, pan, zoom, resetView, handleCircleClick, handleRoleClick, circles]);

  // Pan per Pointer Events (Maus, Touch, Stift). Erst ab 4 px Bewegung, damit
  // ein Klick auf einen Kreis kein Verschieben auslöst.
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    panStart.current = { x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y, pointerId: e.pointerId, active: false };
  }, [viewBox]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const start = panStart.current;
    if (!start || start.pointerId !== e.pointerId || !svgRef.current) return;
    if (!start.active) {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 4) return;
      start.active = true;
      setIsPanning(true);
      svgRef.current.setPointerCapture(e.pointerId);
    }
    const rect = svgRef.current.getBoundingClientRect();
    const unitsPerPx = Math.max(viewBox.w / rect.width, viewBox.h / rect.height);
    const dx = (e.clientX - start.x) * unitsPerPx;
    const dy = (e.clientY - start.y) * unitsPerPx;
    setViewBox(prev => ({ ...prev, x: start.vx - dx, y: start.vy - dy }));
  }, [viewBox.w, viewBox.h]);

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (panStart.current?.active && svgRef.current?.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    panStart.current = null;
    setIsPanning(false);
  }, []);

  // Mausrad zoomt nur mit Ctrl/Cmd (auch Trackpad-Pinch) – sonst scrollt die
  // Seite normal weiter. Nativer Listener, weil React onWheel passiv ist und
  // preventDefault dort nicht greift.
  const hasSvg = !loading && !error && circles.length > 0;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const point = svg.createSVGPoint();
      point.x = e.clientX;
      point.y = e.clientY;
      const ctm = svg.getScreenCTM();
      const at = ctm ? point.matrixTransform(ctm.inverse()) : undefined;
      zoom(e.deltaY > 0 ? 1.1 : 0.9, at ? { x: at.x, y: at.y } : undefined);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [hasSvg, zoom]);

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
      {/* Legende + Bedienelemente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-2.5">
          <span className="font-medium text-foreground">Legende:</span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <circle cx="7" cy="7" r="5.5" fill="hsl(var(--chart-1) / 0.10)" stroke="hsl(var(--circle-stroke-1))" strokeWidth="2" />
            </svg>
            Kreis (dickerer Rand = höhere Ebene)
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <circle cx="7" cy="7" r="6" fill="hsl(var(--accent) / 0.15)" stroke="hsl(var(--circle-stroke-1))" strokeWidth="1.5" />
              <polygon points={starPoints(7, 7, 3.6)} fill="hsl(var(--circle-stroke-1))" />
            </svg>
            Lead-Link
          </span>
          {highlightMode === 'myRoles' && (
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <circle cx="7" cy="7" r="6" fill="hsl(var(--foreground))" />
                <path d="M 4 7 l 2 2 l 4 -4" fill="none" stroke="hsl(var(--background))" strokeWidth="1.75" />
              </svg>
              Deine Rolle
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onShowList && (
            <Button variant="outline" size="sm" onClick={onShowList} className="gap-2">
              <List className="h-4 w-4" aria-hidden="true" />
              Als Liste anzeigen
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Switch
              id="only-my-roles"
              checked={highlightMode === 'myRoles'}
              disabled={!session?.user?.id}
              onCheckedChange={(checked) => setHighlightMode(checked ? 'myRoles' : 'none')}
            />
            <Label htmlFor="only-my-roles" className="text-sm text-muted-foreground cursor-pointer">
              Meine Rollen hervorheben
            </Label>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => zoom(0.8)} aria-label="Vergrössern">
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Vergrössern (+)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => zoom(1.25)} aria-label="Verkleinern">
                  <ZoomOut className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Verkleinern (−)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={resetView} aria-label="Ansicht zurücksetzen">
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ansicht zurücksetzen (0)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Bedienhinweis – sichtbar für alle, per aria-describedby mit der Grafik verknüpft. */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer w-fit">Bedienung mit Tastatur und Maus</summary>
        <p id="kreisansicht-hilfe" className="mt-1 max-w-3xl">
          Mit Tab in die Grafik wechseln. Pfeiltasten ↑/↓: nächster bzw. vorheriger Kreis derselben Ebene,
          →: in den Kreis hinein, ←: zum übergeordneten Kreis. Enter: Kreis in der Baumansicht öffnen bzw.
          Lead-Link-Details anzeigen. L: Lead-Link des Kreises anzeigen. + / − / 0: vergrössern, verkleinern,
          zurücksetzen. Umschalt + Pfeiltasten: Ansicht verschieben. Maus/Touch: ziehen zum Verschieben,
          Ctrl + Mausrad zum Zoomen.
        </p>
      </details>
      <div aria-live="polite" className="sr-only">{announcement}</div>

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

        {hasSvg && (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            style={{ cursor: isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-describedby="kreisansicht-hilfe"
          >
            {/* Windows-Kontrastmodus: Systemfarben statt Token-Farben. */}
            <style>{`
              @media (forced-colors: active) {
                .kv-circle { stroke: CanvasText; }
                .kv-focus circle:last-child { stroke: Highlight; }
              }
            `}</style>
            {/* Background grid */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.5" />
            </pattern>
            <rect x={viewBox.x - 2000} y={viewBox.y - 2000} width={viewBox.w + 4000} height={viewBox.h + 4000} fill="url(#grid)" aria-hidden="true" />
            <g role="tree" aria-label="Kreisstruktur" onKeyDown={handleTreeKeyDown}>
              <CircleLayer
                layout={layout}
                nav={nav}
                screenScale={screenScale}
                hoveredId={hoveredId}
                setHoveredId={setHoveredId}
                highlightMode={highlightMode}
                myRoleIds={myRoleIds}
                focusedId={activeFocusId}
                onItemFocus={setFocusedId}
                registerItem={registerItem}
                handleCircleClick={handleCircleClick}
                handleRoleClick={handleRoleClick}
              />
            </g>
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
