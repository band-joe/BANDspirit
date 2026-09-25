/* ==========================================================================
 * Prüfskript Kreisansicht (Layout + Tastatur-Navigation).
 *
 *   npm run check:kreisansicht
 *
 * Prüft für mehrere Kreisstrukturen:
 *  - keine Überlappung von Geschwistern, alle Kinder innerhalb des Elternkreises
 *  - Mindestabstand zwischen Geschwistern
 *  - Titel erreichen mind. 90 % der Sollgrösse
 *  - jeder Eintrag per Tastatur erreichbar, ←/→ konsistent, gültige aria-Werte
 * Die Struktur "Testumgebung" ist die anonymisierte Kreisstruktur der Test-VM
 * vom 25.09.2026 (nur Index, Elternindex, Namenslänge, Anzahl Lead-Links).
 * Beendet sich mit Exit-Code 1, wenn eine Prüfung fehlschlägt.
 * ========================================================================== */

import { layoutCircles, titleFontSize, type LayoutItem } from '../app/(dashboard)/organisation/graph/circle-view/circle-layout';
import { buildNavigation, navigate } from '../app/(dashboard)/organisation/graph/circle-view/circle-nav';
import type { GraphCircle, TreeNode } from '../app/(dashboard)/organisation/graph/circle-view/types';

/** [Index, Elternindex (0 = Wurzel), Namenslänge, Anzahl Lead-Links] */
type Zeile = [number, number, number, number];

const TESTUMGEBUNG: Zeile[] = [
  [1, 23, 7, 1], [2, 23, 9, 1], [3, 27, 8, 1], [4, 3, 6, 1], [5, 3, 3, 1], [6, 23, 16, 1],
  [7, 21, 7, 1], [8, 21, 17, 1], [9, 23, 8, 1], [10, 18, 8, 1], [11, 18, 25, 1], [12, 23, 20, 1],
  [13, 3, 28, 1], [14, 3, 2, 1], [15, 23, 8, 1], [16, 24, 5, 0], [17, 23, 10, 1], [18, 27, 11, 0],
  [19, 3, 6, 0], [20, 3, 6, 0], [21, 23, 7, 1], [22, 1, 10, 0], [23, 27, 7, 1], [24, 1, 8, 0],
  [25, 1, 12, 0], [26, 23, 10, 1], [27, 0, 2, 1],
];

function viele(anzahl: number): Zeile[] {
  return [[1, 0, 10, 1], ...Array.from({ length: anzahl }, (_, i): Zeile => [i + 2, 1, 12, 1])];
}

function tief(ebenen: number): Zeile[] {
  return Array.from({ length: ebenen }, (_, i): Zeile => [i + 1, i, 15, 1]);
}

function mehrereWurzeln(): Zeile[] {
  return [[1, 0, 8, 1], [2, 0, 8, 1], [3, 0, 8, 0], [4, 1, 30, 1], [5, 1, 5, 1], [6, 2, 12, 0]];
}

function baum(zeilen: Zeile[]): TreeNode[] {
  const circles: GraphCircle[] = zeilen.map(([n, p, len, ll]) => ({
    id: `k${n}`,
    name: 'Kreis Name Lang'.repeat(3).slice(0, len),
    purpose: null,
    parentId: p ? `k${p}` : null,
    roles: Array.from({ length: ll }, (_, i) => ({
      id: `r${n}-${i}`, name: 'Lead Link', isCoordinator: false, isRepresentative: false,
      isFacilitator: false, isLeadLink: true, assignments: [],
    })),
  }));
  const nodes = new Map<string, TreeNode>(circles.map(c => [c.id, { circle: c, children: [], depth: 0 }]));
  const roots: TreeNode[] = [];
  for (const c of circles) {
    const parent = c.parentId ? nodes.get(c.parentId) : undefined;
    (parent ? parent.children : roots).push(nodes.get(c.id)!);
  }
  const setDepth = (n: TreeNode, d: number) => { n.depth = d; n.children.forEach(ch => setDepth(ch, d + 1)); };
  roots.forEach(r => setDepth(r, 0));
  return roots;
}

const MIN_GESCHWISTER_ABSTAND = 6;
const MIN_TITEL_ANTEIL = 0.9;

function pruefe(name: string, zeilen: Zeile[]): string[] {
  const fehler: string[] = [];
  const layout = layoutCircles(baum(zeilen));
  const byId = new Map(layout.map(i => [i.id, i]));
  const elternVon = (i: LayoutItem) => (i.kind === 'circle' ? i.parentId : i.circle.id);

  // Layout
  const gruppen = new Map<string, LayoutItem[]>();
  for (const i of layout) gruppen.set(elternVon(i) ?? '-', [...(gruppen.get(elternVon(i) ?? '-') ?? []), i]);
  let minAbstand = Infinity;
  for (const [eltern, geschwister] of gruppen) {
    for (let a = 0; a < geschwister.length; a++) {
      for (let b = a + 1; b < geschwister.length; b++) {
        const s = geschwister[a], t = geschwister[b];
        const abstand = Math.hypot(s.x - t.x, s.y - t.y) - s.r - t.r;
        minAbstand = Math.min(minAbstand, abstand);
        if (abstand < MIN_GESCHWISTER_ABSTAND) fehler.push(`Abstand ${s.id}/${t.id} = ${abstand.toFixed(1)}`);
      }
    }
    const p = byId.get(eltern);
    if (p) {
      for (const s of geschwister) {
        const rest = p.r - (Math.hypot(s.x - p.x, s.y - p.y) + s.r);
        if (rest < -0.01) fehler.push(`${s.id} ragt aus ${eltern} (${rest.toFixed(1)})`);
      }
    }
  }
  for (const i of layout) {
    if (i.kind === 'circle' && i.hasSubcircles && i.titleSize < titleFontSize(i.depth) * MIN_TITEL_ANTEIL) {
      fehler.push(`Titel ${i.id} nur ${((i.titleSize / titleFontSize(i.depth)) * 100).toFixed(0)} % der Sollgrösse`);
    }
  }

  // Navigation
  const nav = buildNavigation(layout);
  if (nav.size !== layout.length) fehler.push(`Navigation ${nav.size}/${layout.length} Einträge`);
  const erreicht = new Set<string>();
  const besuche = (start: string | null) => {
    for (let id = start; id && !erreicht.has(id); id = navigate(nav, id, 'ArrowDown')) {
      erreicht.add(id);
      besuche(navigate(nav, id, 'ArrowRight'));
    }
  };
  besuche(layout[0]?.id ?? null);
  if (erreicht.size !== nav.size) fehler.push(`per Tastatur erreichbar: ${erreicht.size}/${nav.size}`);
  for (const n of nav.values()) {
    const kind = n.children[0];
    if (kind && navigate(nav, kind, 'ArrowLeft') !== n.id) fehler.push(`← von ${kind} führt nicht zu ${n.id}`);
    if (n.posInSet < 1 || n.posInSet > n.setSize) fehler.push(`aria-posinset ${n.id}`);
  }

  const kreise = layout.filter(i => i.kind === 'circle').length;
  console.log(`${fehler.length === 0 ? '✓' : '✗'} ${name}: ${kreise} Kreise, ${layout.length - kreise} Lead-Links, `
    + `min. Abstand ${minAbstand === Infinity ? '–' : minAbstand.toFixed(1)}, ${erreicht.size} per Tastatur erreichbar`);
  return fehler.map(f => `  ${name}: ${f}`);
}

const alleFehler = [
  ...pruefe('Testumgebung', TESTUMGEBUNG),
  ...pruefe('15 Subkreise', viele(15)),
  ...pruefe('7 Ebenen tief', tief(7)),
  ...pruefe('mehrere Wurzelkreise', mehrereWurzeln()),
];

if (alleFehler.length > 0) {
  console.error(`\n${alleFehler.length} Fehler:\n${alleFehler.join('\n')}`);
  process.exit(1);
}
console.log('\nAlle Prüfungen bestanden.');
