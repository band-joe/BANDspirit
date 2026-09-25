/* ==========================================================================
 * Tastatur-Navigation der Kreisansicht (WAI-ARIA Tree-Pattern).
 *
 * Leitet aus dem Layout die Baumstruktur für die Pfeiltasten-Navigation ab:
 * Kinder eines Kreises sind sein Lead-Link und seine Subkreise – in
 * derselben Reihenfolge wie im Layout (Lead-Link zuerst, Subkreise nach
 * Name). Liefert zusätzlich die ARIA-Werte aria-level / aria-setsize /
 * aria-posinset. Reine Funktionen ohne React/DOM.
 * ========================================================================== */

import type { LayoutItem } from './circle-layout';

export interface NavNode {
  id: string;
  parentId: string | null;
  children: string[];
  /** aria-level (1 = Wurzelkreis). */
  level: number;
  /** aria-posinset (1-basiert) und aria-setsize unter den Geschwistern. */
  posInSet: number;
  setSize: number;
}

export type NavMap = Map<string, NavNode>;

export function buildNavigation(layout: LayoutItem[]): NavMap {
  const nav: NavMap = new Map();
  const rootIds: string[] = [];

  for (const item of layout) {
    const parentId = item.kind === 'circle' ? item.parentId : item.circle.id;
    nav.set(item.id, { id: item.id, parentId, children: [], level: 1, posInSet: 1, setSize: 1 });
    if (parentId === null) rootIds.push(item.id);
    else nav.get(parentId)?.children.push(item.id);
  }

  const assign = (ids: string[], level: number) => {
    ids.forEach((id, i) => {
      const node = nav.get(id)!;
      node.level = level;
      node.posInSet = i + 1;
      node.setSize = ids.length;
      assign(node.children, level + 1);
    });
  };
  assign(rootIds, 1);
  return nav;
}

function siblings(nav: NavMap, id: string): string[] {
  const node = nav.get(id);
  if (!node) return [];
  if (node.parentId === null) {
    return [...nav.values()].filter(n => n.parentId === null).map(n => n.id);
  }
  return nav.get(node.parentId)?.children ?? [];
}

export type NavKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

/**
 * Ziel der Pfeiltasten-Navigation ausgehend von `id`; null = keine Bewegung
 * (z. B. ← auf einem Wurzelkreis). ↑/↓ = Geschwister, → = erstes Kind,
 * ← = Elternkreis, Home/End = erster/letzter Eintrag in Baumreihenfolge.
 */
export function navigate(nav: NavMap, id: string, key: NavKey): string | null {
  const node = nav.get(id);
  if (!node) return null;
  switch (key) {
    case 'ArrowDown':
    case 'ArrowUp': {
      const sibs = siblings(nav, id);
      const i = sibs.indexOf(id) + (key === 'ArrowDown' ? 1 : -1);
      return i >= 0 && i < sibs.length ? sibs[i] : null;
    }
    case 'ArrowRight':
      return node.children[0] ?? null;
    case 'ArrowLeft':
      return node.parentId;
    case 'Home':
      return [...nav.keys()][0] ?? null;
    case 'End': {
      const keys = [...nav.keys()];
      return keys[keys.length - 1] ?? null;
    }
  }
}
