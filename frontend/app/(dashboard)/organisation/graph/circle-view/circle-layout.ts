/* ==========================================================================
 * Layout der Kreisansicht (Holarchie) per Circle-Packing (d3-hierarchy).
 *
 * Ersetzt die frühere Ring-Anordnung, bei der alle Subkreise eines Kreises
 * gleich gross auf einem Ring lagen, pro Ebene stark schrumpften und vom
 * Lead-Link sowie den Titeln überlagert wurden. Hier gilt:
 *  - Kreisgrösse folgt dem Inhalt (Anzahl Subkreise im Teilbaum).
 *  - Abstand zwischen Geschwistern und zum Elternrand über `padding`; bei
 *    Kreisen mit Subkreisen breit genug für den Titel auf dem oberen Bogen.
 *  - Der Lead-Link eines Kreises mit Subkreisen wird wie ein kleiner
 *    Subkreis mitgepackt und kann dadurch nichts mehr überlagern; bei
 *    Kreisen ohne Subkreise sitzt er unten im Kreis (unter dem Titel).
 *  - Geschwister sind stabil nach Name sortiert.
 * Reine Funktion ohne React/DOM, damit sie separat geprüft werden kann.
 * ========================================================================== */

import { hierarchy, pack, type HierarchyCircularNode } from 'd3-hierarchy';
import { stripHtml } from '@/lib/utils';
import type { GraphCircle, GraphRole, TreeNode } from './types';

/** Durchmesser der gesamten Packfläche in SVG-Einheiten. */
export const LAYOUT_SIZE = 1000;

/** Relative Fläche eines mitgepackten Lead-Links (Subkreis ohne Kinder = 1). */
const ROLE_WEIGHT = 0.3;

/** Abstand zwischen mehreren Wurzelkreisen. */
const ROOT_GAP = 40;

/** Mindestabstand zwischen Geschwistern bzw. zum Elternrand. */
const MIN_GAP = 8;

/**
 * Schriftgrösse der Kreistitel je Ebene (SVG-Einheiten). Die Titel von
 * Kreisen mit Subkreisen laufen im Padding-Band entlang des oberen Bogens,
 * deshalb bestimmt die Schriftgrösse auch die Breite dieses Bandes.
 */
const TITLE_FONT_BY_DEPTH = [26, 18, 13, 10, 8, 7];

export function titleFontSize(depth: number): number {
  return TITLE_FONT_BY_DEPTH[Math.min(depth, TITLE_FONT_BY_DEPTH.length - 1)];
}

/** Breite des Titelbandes (= Padding) eines Kreises mit Subkreisen. */
function titleBand(depth: number): number {
  return Math.max(MIN_GAP, titleFontSize(depth) * 1.9);
}

export interface CircleItem {
  kind: 'circle';
  id: string;
  circle: GraphCircle;
  parentId: string | null;
  depth: number;
  x: number;
  y: number;
  r: number;
  /** true = Kreis enthält Subkreise (Titel auf dem Bogen), sonst Titel mittig. */
  hasSubcircles: boolean;
  /**
   * Schriftgrösse des Titels. Bei Kreisen mit Subkreisen begrenzt durch den
   * tatsächlich freien Rand (d3 hält das Padding nur näherungsweise ein).
   */
  titleSize: number;
}

export interface RoleItem {
  kind: 'role';
  id: string;
  role: GraphRole;
  circle: GraphCircle;
  depth: number;
  x: number;
  y: number;
  r: number;
}

export type LayoutItem = CircleItem | RoleItem;

type Datum =
  | { type: 'root'; roots: TreeNode[] }
  | { type: 'circle'; node: TreeNode }
  | { type: 'role'; role: GraphRole; circle: GraphCircle };

function sortByName(nodes: TreeNode[]): TreeNode[] {
  return [...nodes].sort((a, b) =>
    stripHtml(a.circle.name).localeCompare(stripHtml(b.circle.name), 'de', { sensitivity: 'base' }));
}

function leadLinks(circle: GraphCircle): GraphRole[] {
  return circle.roles.filter(r => r.isLeadLink);
}

function childrenOf(d: Datum): Datum[] | undefined {
  if (d.type === 'root') {
    return sortByName(d.roots).map(node => ({ type: 'circle', node }));
  }
  if (d.type === 'circle' && d.node.children.length > 0) {
    // Lead-Link zuerst, damit er beim Packen innen nahe der Mitte landet.
    return [
      ...leadLinks(d.node.circle).map(role => ({ type: 'role' as const, role, circle: d.node.circle })),
      ...sortByName(d.node.children).map(node => ({ type: 'circle' as const, node })),
    ];
  }
  return undefined;
}

/**
 * Berechnet Position und Radius aller Kreise und Lead-Links. Die Reihenfolge
 * der Rückgabe ist Eltern vor Kindern, damit innere Kreise beim Rendern
 * über den äusseren liegen.
 */
export function layoutCircles(roots: TreeNode[]): LayoutItem[] {
  if (roots.length === 0) return [];

  const root = hierarchy<Datum>({ type: 'root', roots }, childrenOf)
    .sum(d => (d.type === 'role' ? ROLE_WEIGHT : d.type === 'circle' ? 1 : 0))
    .sort(() => 0); // Reihenfolge aus childrenOf beibehalten (bereits sortiert)

  const packed = pack<Datum>()
    .size([LAYOUT_SIZE, LAYOUT_SIZE])
    .padding(n => {
      const d = n.data;
      if (d.type === 'root') return ROOT_GAP;
      // n.depth ist um 1 verschoben (virtuelle Wurzel), die Kreisebene ist n.depth - 1.
      if (d.type === 'circle' && d.node.children.length > 0) return titleBand(n.depth - 1);
      return MIN_GAP;
    })(root);

  // Bei genau einem Wurzelkreis ist die virtuelle Wurzel nur ein Rand – der
  // echte Wurzelkreis füllt die Fläche trotzdem fast vollständig aus.
  const items: LayoutItem[] = [];
  for (const n of packed.descendants() as HierarchyCircularNode<Datum>[]) {
    const d = n.data;
    if (d.type === 'circle') {
      const circleDepth = n.depth - 1;
      const parent = n.parent?.data;
      // Freier Rand oberhalb der Kinder = Platz für den Titel auf dem Bogen.
      const clearance = (n.children ?? []).reduce(
        (min, c) => Math.min(min, n.r - (Math.hypot(c.x - n.x, c.y - n.y) + c.r)),
        Infinity,
      );
      const hasSubcircles = d.node.children.length > 0;
      const titleSize = hasSubcircles
        ? Math.min(titleFontSize(circleDepth), clearance / 1.9)
        : Math.min(titleFontSize(circleDepth), n.r * 0.3);
      items.push({
        kind: 'circle',
        id: d.node.circle.id,
        circle: d.node.circle,
        parentId: parent?.type === 'circle' ? parent.node.circle.id : null,
        depth: circleDepth,
        x: n.x,
        y: n.y,
        r: n.r,
        hasSubcircles,
        titleSize,
      });
      // Kreis ohne Subkreise: Lead-Link unten im Kreis, unter dem Titel.
      if (!hasSubcircles) {
        leadLinks(d.node.circle).slice(0, 1).forEach(role => {
          items.push({
            kind: 'role',
            id: role.id,
            role,
            circle: d.node.circle,
            depth: circleDepth + 1,
            x: n.x,
            y: n.y + n.r * 0.42,
            r: n.r * 0.3,
          });
        });
      }
    } else if (d.type === 'role') {
      items.push({
        kind: 'role',
        id: d.role.id,
        role: d.role,
        circle: d.circle,
        depth: n.depth - 1,
        x: n.x,
        y: n.y,
        r: n.r,
      });
    }
  }
  return items;
}

/**
 * Kürzt einen Text so, dass er bei gegebener Schriftgrösse ungefähr in die
 * verfügbare Breite passt (Durchschnittsbreite ~0.55 em pro Zeichen).
 */
export function fitText(text: string, fontSize: number, maxWidth: number): string {
  const maxChars = Math.floor(maxWidth / (fontSize * 0.55));
  if (maxChars <= 1) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(1, maxChars - 1)).trimEnd() + '…';
}
