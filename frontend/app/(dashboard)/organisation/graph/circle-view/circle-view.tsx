'use client';

/* ==========================================================================
 * Kreisdarstellung (Holarchie) – grafische Ansicht des Organigramms.
 *
 * Portiert aus dem Backup frontend/backup/organigramm/page.grafik.tsx.bak
 * (Pan/Zoom, buildTree, rekursive Platzierung). Farben referenzieren die
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

/**
 * "Meine Rollen"-Filter. Da pro Kreis nur noch der Lead-Link angezeigt wird,
 * sind rollentyp-basierte Hervorhebungen (Koordinator/Repräsentant/
 * Moderator) hier nicht mehr sinnvoll – alle sichtbaren Rollen sind bereits
 * Lead-Links.
 */
type HighlightMode = 'none' | 'myRoles';

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

/* ------------------------------------------------------------------ */
/*  Utility: get initials                                              */
/* ------------------------------------------------------------------ */

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

type RoleBadgeType = keyof typeof ROLE_BADGE_COLORS;

function getRoleBadgeType(role: GraphRole): RoleBadgeType {
  if (role.isLeadLink) return 'leadLink';
  if (role.isCoordinator) return 'coordinator';
  if (role.isRepresentative) return 'representative';
  if (role.isFacilitator) return 'facilitator';
  return 'normal';
}

/* ------------------------------------------------------------------ */
/*  SVG Rendering helpers                                              */
/* ------------------------------------------------------------------ */

interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

interface RenderContext {
  elements: React.ReactNode[];
  keyCounter: number;
  onCircleClick: (circleId: string) => void;
  onRoleClick: (roleId: string, circleId: string) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  bounds: Bounds;
  highlightMode: HighlightMode;
  myRoleIds: Set<string>;
}

function renderConcentricCircle(
  node: TreeNode,
  cx: number,
  cy: number,
  radius: number,
  ctx: RenderContext
) {
  const color = CIRCLE_COLORS[node.depth % CIRCLE_COLORS.length];
  const k = ctx.keyCounter++;
  const isHovered = ctx.hoveredId === `circle-${node.circle.id}`;

  // Inhaltsgrenzen mitführen, damit die Ansicht beim Aufruf passend gerahmt wird.
  ctx.bounds.minX = Math.min(ctx.bounds.minX, cx - radius);
  ctx.bounds.minY = Math.min(ctx.bounds.minY, cy - radius);
  ctx.bounds.maxX = Math.max(ctx.bounds.maxX, cx + radius);
  ctx.bounds.maxY = Math.max(ctx.bounds.maxY, cy + radius);

  // Main circle ring
  ctx.elements.push(
    <g key={`circle-group-${k}`}>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={color.fill}
        stroke={isHovered ? LABEL_COLOR : color.stroke}
        strokeWidth={isHovered ? 3 : 2}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
        onMouseEnter={() => ctx.setHoveredId(`circle-${node.circle.id}`)}
        onMouseLeave={() => ctx.setHoveredId(null)}
        onClick={() => ctx.onCircleClick(node.circle.id)}
      />
      {/* Circle name label at top (Titelband oben) */}
      <text
        x={cx}
        y={cy - radius + Math.max(24, radius * 0.11)}
        textAnchor="middle"
        fill={LABEL_COLOR}
        fontSize={Math.max(13, radius / 12)}
        fontWeight="700"
        style={{ pointerEvents: 'none' }}
      >
        {stripHtml(node.circle.name)}
      </text>
    </g>
  );

  // Pro Kreis nur den Lead-Link anzeigen (nicht alle Rollen) – hält die
  // Grafik auf einen Blick lesbar; weitere Rollen sind über die Baumansicht
  // bzw. die Kreis-Detailseite einsehbar.
  const roles = node.circle.roles.filter(r => r.isLeadLink);
  if (roles.length > 0) {
    const roleRadius = Math.max(26, Math.min(40, radius / 5));
    const placementRadius = radius - roleRadius - 8;
    const startAngle = Math.PI * 0.6;
    const endAngle = Math.PI * 2.4;
    const angleStep = roles.length > 1 ? (endAngle - startAngle) / roles.length : 0;

    roles.forEach((role, i) => {
      const rk = ctx.keyCounter++;
      const angle = roles.length === 1 ? Math.PI * 1.5 : startAngle + angleStep * i;
      const rx = cx + Math.cos(angle) * placementRadius;
      const ry = cy + Math.sin(angle) * placementRadius;

      const badge = ROLE_BADGE_COLORS[getRoleBadgeType(role)];
      const isRoleHovered = ctx.hoveredId === `role-${role.id}`;
      const isHighlightMatch = roleMatchesHighlight(role, ctx.highlightMode, ctx.myRoleIds);
      // Bei aktivem Filter/Highlight werden nicht-passende Rollen abgedunkelt
      // statt ausgeblendet (Struktur/Platzierung bleibt unverändert).
      const dimmed = ctx.highlightMode !== 'none' && !isHighlightMatch;

      ctx.elements.push(
        <g
          key={`role-${rk}`}
          onMouseEnter={() => ctx.setHoveredId(`role-${role.id}`)}
          onMouseLeave={() => ctx.setHoveredId(null)}
          onClick={() => ctx.onRoleClick(role.id, node.circle.id)}
          opacity={dimmed ? 0.25 : 1}
          style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
        >
          {/* Role node */}
          <circle
            cx={rx}
            cy={ry}
            r={roleRadius}
            fill={isRoleHovered ? badge.hoverBg : badge.bg}
            stroke={badge.border}
            strokeWidth={isRoleHovered || (!dimmed && ctx.highlightMode !== 'none') ? 2.5 : 1.5}
            style={{ transition: 'all 0.2s' }}
          />
          {/* Role name */}
          <text
            x={rx}
            y={ry - 2}
            textAnchor="middle"
            fill={LABEL_COLOR}
            fontSize={Math.max(8, Math.min(10, roleRadius / 3.5))}
            fontWeight="500"
            style={{ pointerEvents: 'none' }}
          >
            {(() => {
              const roleName = stripHtml(role.name);
              return roleName.length > 14 ? roleName.slice(0, 12) + '…' : roleName;
            })()}
          </text>
          {/* Member avatars */}
          {role.assignments.length > 0 && (
            <g>
              {role.assignments.slice(0, 3).map((a, ai) => {
                const ak = ctx.keyCounter++;
                const avatarR = 9;
                const totalAvatars = Math.min(role.assignments.length, 3);
                const avatarSpacing = avatarR * 2.2;
                const startX = rx - ((totalAvatars - 1) * avatarSpacing) / 2;
                const ax = startX + ai * avatarSpacing;
                const ay = ry + roleRadius / 2.5;
                return (
                  <g key={`avatar-${ak}`}>
                    <circle cx={ax} cy={ay} r={avatarR} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1.5} />
                    <text x={ax} y={ay + 3} textAnchor="middle" fill="hsl(var(--primary-foreground))" fontSize={7} fontWeight="600" style={{ pointerEvents: 'none' }}>
                      {getInitials(a.user.name)}
                    </text>
                  </g>
                );
              })}
              {role.assignments.length > 3 && (
                <text x={rx + 20} y={ry + roleRadius / 2.5 + 3} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={8}>
                  +{role.assignments.length - 3}
                </text>
              )}
            </g>
          )}
        </g>
      );
    });
  }

  // Subkreise rendern – das Titelband oben wird freigehalten, damit die
  // Subkreise den Titel des übergeordneten Kreises NICHT überlagern. Die
  // Subkreise werden auf einem Ring um die Mitte des nutzbaren Bereichs
  // verteilt (bei 3 Kindern ergibt das automatisch ein Dreieck, bei mehr
  // eine kreisförmige Anordnung) statt in einer Reihe – das nutzt die
  // verfügbare Fläche in zwei Dimensionen aus statt nur horizontal.
  const childCount = node.children.length;
  if (childCount > 0) {
    const titleBand = radius * 0.30;              // oben für den Titel reserviert
    const usableTop = cy - radius + titleBand;     // Oberkante des nutzbaren Bereichs
    const usableBottom = cy + radius * 0.82;       // Unterkante (etwas Rand lassen)
    const usableHeight = usableBottom - usableTop;
    const usableWidth = radius * 1.9;              // horizontal nutzbare Breite (nah am vollen Durchmesser)
    const ringCenterY = usableTop + usableHeight / 2;
    // Grösster Radius, den ein einzelner Kindkreis um die Ringmitte herum
    // einnehmen darf, ohne oben/unten bzw. links/rechts über den nutzbaren
    // Bereich hinauszuragen.
    const boundCap = Math.min(usableHeight / 2, usableWidth / 2);

    // packingFactor = Mindestabstand benachbarter Kreismitten relativ zum
    // Kindradius (2.0 = Kreise berühren sich gerade). Aus der Sehnenlänge
    // zwischen benachbarten Ringpunkten (2·ringRadius·sin(π/N)) ergibt sich
    // der grösstmögliche Kindradius, der weder überlappt noch über den
    // nutzbaren Bereich hinausragt.
    const packingFactor = 2.05;
    let childRadius: number;
    let ringRadius: number;
    if (childCount === 1) {
      childRadius = boundCap;
      ringRadius = 0;
    } else {
      const halfAngle = Math.PI / childCount;
      childRadius = boundCap / (1 + packingFactor / (2 * Math.sin(halfAngle)));
      ringRadius = (packingFactor * childRadius) / (2 * Math.sin(halfAngle));
    }
    childRadius = Math.max(childRadius, radius * 0.15);

    node.children.forEach((child, i) => {
      // Start oben (12-Uhr-Position), im Uhrzeigersinn verteilt – bei 3
      // Kindern entsteht so ein auf der Spitze stehendes Dreieck.
      const angle = childCount === 1 ? 0 : (2 * Math.PI * i) / childCount - Math.PI / 2;
      const childCx = cx + Math.cos(angle) * ringRadius;
      const childCy = ringCenterY + Math.sin(angle) * ringRadius;

      // Verbindungslinie: startet unterhalb des Titelbandes, nicht am Titel.
      ctx.elements.push(
        <line
          key={`link-${ctx.keyCounter++}`}
          x1={cx}
          y1={usableTop}
          x2={childCx}
          y2={childCy}
          stroke={CIRCLE_COLORS[node.depth % CIRCLE_COLORS.length].stroke}
          strokeWidth={1}
          strokeDasharray="6,4"
          opacity={0.4}
          style={{ pointerEvents: 'none' }}
        />
      );

      renderConcentricCircle(child, childCx, childCy, childRadius, ctx);
    });
  }
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

  // Build tree
  const tree = useMemo(() => buildTree(circles), [circles]);

  // Total roles for sizing
  const totalRoles = useMemo(() => circles.reduce((s, c) => s + c.roles.length, 0), [circles]);

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

  // Build SVG elements (inkl. Inhaltsgrenzen für die Rahmung beim Aufruf)
  const { elements: svgElements, bounds } = useMemo<{ elements: React.ReactNode[]; bounds: Bounds | null }>(() => {
    if (tree.length === 0) return { elements: [], bounds: null };

    const ctx: RenderContext = {
      elements: [],
      keyCounter: 0,
      onCircleClick: handleCircleClick,
      onRoleClick: handleRoleClick,
      hoveredId,
      setHoveredId,
      bounds: { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
      highlightMode,
      myRoleIds,
    };

    const centerX = 800;
    const centerY = 600;

    if (tree.length === 1) {
      const baseRadius = Math.max(600, Math.min(1500, 3 * (150 + totalRoles * 20)));
      renderConcentricCircle(tree[0], centerX, centerY, baseRadius, ctx);
    } else {
      const rootCount = tree.length;
      const baseRadius = Math.max(450, Math.min(1050, 3 * (100 + totalRoles * 10 / rootCount)));
      // Ring-Radius an die grösseren Kreise anpassen, damit sie sich nicht berühren.
      const ringRadius = Math.max(3 * 350, rootCount * baseRadius * 0.85);

      tree.forEach((root, i) => {
        const angle = (Math.PI * 2 * i) / rootCount - Math.PI / 2;
        const rx = centerX + Math.cos(angle) * ringRadius;
        const ry = centerY + Math.sin(angle) * ringRadius;
        renderConcentricCircle(root, rx, ry, baseRadius, ctx);
      });
    }

    return { elements: ctx.elements, bounds: ctx.bounds };
  }, [tree, handleCircleClick, handleRoleClick, hoveredId, totalRoles, highlightMode, myRoleIds]);

  // Standard-Ansicht: rahmt den gesamten Inhalt mit etwas Rand.
  const defaultViewBox = useMemo(() => {
    if (!bounds || !isFinite(bounds.minX)) return { x: 0, y: 0, w: 1600, h: 1200 };
    const pad = Math.max(80, (bounds.maxX - bounds.minX) * 0.06);
    return {
      x: bounds.minX - pad,
      y: bounds.minY - pad,
      w: (bounds.maxX - bounds.minX) + pad * 2,
      h: (bounds.maxY - bounds.minY) + pad * 2,
    };
  }, [bounds]);

  // Beim ersten Laden der Daten die Ansicht passend auf den Inhalt rahmen.
  const viewInitialized = useRef(false);
  useEffect(() => {
    defaultViewBoxRef.current = defaultViewBox;
    if (!viewInitialized.current && bounds && isFinite(bounds.minX)) {
      setViewBox(defaultViewBox);
      viewInitialized.current = true;
    }
  }, [bounds, defaultViewBox]);

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
            {svgElements}
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
