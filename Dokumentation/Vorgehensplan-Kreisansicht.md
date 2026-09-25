# Vorgehensplan: Grafische Kreisansicht (barrierefrei, übersichtlich)

Stand: 25.09.2026 · Komponente: `frontend/app/(dashboard)/organisation/graph/circle-view/`

## Ziel

- Die Kreisansicht ist barrierefrei nach **WCAG 2.2 AA** (schliesst WCAG 2.1 AA / eCH-0059 ein).
- Kreise haben sichtbaren Abstand zueinander.
- Subkreise sind geordnet im Elternkreis platziert und überlagern weder Titel noch Lead-Link.

## Entscheide

| Frage | Entscheid |
|---|---|
| Layout-Bibliothek | `d3-hierarchy` (Circle-Packing), gerendert weiterhin mit React/SVG |
| Klick auf Kreis | bleibt: verzweigt in die Baumansicht |
| Initialen-Avatare | entfallen; Personen stehen in der Detail-Sidebar |
| Zielstandard | WCAG 2.2 AA |

## Ist-Analyse (vorher)

### Layout

| Problem | Ursache |
|---|---|
| Subkreise ab Ebene 3–4 winzig, Namen laufen über den Rand | Alle Kinder gleich gross auf einem Ring; Radius pro Ebene × 0.2–0.35; Namen ungekürzt |
| Lead-Link überlagert Titel und Subkreise | Lead-Link oben (12 Uhr) im Titelband bzw. auf der ersten Subkreis-Position |
| Kreise fast berührend | `packingFactor = 2.05`; Untergrenze `radius * 0.15` erzwang Überlappung |
| Linien stören | Gestrichelte Linien vom Titel zu jedem Kind kreuzen Geschwister |
| Zufällige Reihenfolge | API-Reihenfolge, nicht sortiert |

### Barrierefreiheit

| WCAG | Befund |
|---|---|
| 2.1.1 Tastatur | Kreise/Lead-Links nur per Maus; Pan/Zoom nur Maus-Drag/Mausrad |
| 4.1.2 Name, Rolle, Wert | SVG ohne `role`/Labels; Zoom-Buttons nur Icon (Tooltip ist kein Name) |
| 1.1.1 Textalternative | Baumansicht nicht als Alternative verknüpft |
| 1.4.11 Nicht-Text-Kontrast | Light-Mode: Umriss `chart-2` 2.76:1, `chart-3` 2.28:1 (< 3:1) |
| 1.4.3 Kontrast | „Nur meine Rollen“ dimmt andere Rollen auf 25 % Opacity |
| 1.4.4 Textgrösse | Initialen 7, Rollennamen 8–10 SVG-Einheiten, auf dem Bildschirm deutlich < 12 px |
| 1.4.1 Farbe | Lead-Link vs. Kreis in Legende nur über Farbe |
| 2.4.7 Fokus sichtbar | keine Fokus-Markierung |
| 2.5.8 Zielgrösse | Avatare ~18 Einheiten; kein Touch (nur Maus-Events) |
| 2.3.3 Bewegung | `transition: all` ohne `prefers-reduced-motion` |

## Phase 1 – Layout (Branch `kreisansicht-layout`)

1. Circle-Packing mit `d3-hierarchy` in `circle-layout.ts` (reine Funktion, ohne React/DOM):
   Kreisgrösse folgt dem Inhalt, Abstände per `padding` (Titelband bei Kreisen mit Subkreisen,
   Mindestabstand sonst), Geschwister stabil nach Name sortiert.
2. Titel von Kreisen mit Subkreisen entlang des oberen Bogens im Titelband; Schriftgrösse durch den
   tatsächlich freien Rand begrenzt (d3 hält das Padding nur näherungsweise ein).
   Kreise ohne Subkreise: Titel mittig, max. 2 Zeilen, gekürzt; voller Name im `<title>`.
3. Lead-Link bei Kreisen mit Subkreisen mitgepackt (kann nichts überlagern), sonst unten im Kreis.
4. Keine Verbindungslinien mehr.
5. Semantischer Zoom: Beschriftungen erst ab 9 px Bildschirm-Schriftgrösse, sonst beim Hineinzoomen.

Geprüft mit der Kreisstruktur der Testumgebung (27 Kreise, 5 Ebenen, bis 9 Subkreise):
0 Überlappungen, alle Kinder innerhalb des Elternkreises, min. Geschwisterabstand 14.7 Einheiten,
Kreise ohne Subkreise auf allen Ebenen gleich gross.

## Phase 2 – Barrierefreiheit (Branch `kreisansicht-barrierefreiheit`)

1. Semantik: `role="tree"`, pro Kreis `role="treeitem"` mit `aria-level`/`aria-setsize`/`aria-posinset`
   und sprechendem `aria-label` („Kreis X, Ebene 2, 3 Subkreise, Lead-Link besetzt“).
2. Tastatur (ein Tabstopp, roving tabindex): `↑/↓` Geschwister, `→` erster Subkreis, `←` Elternkreis,
   `Enter` Baumansicht, `L` Lead-Link-Details, `+`/`-`/`0` Zoom, `Shift+Pfeile` Pan;
   fokussierter Kreis wird in den sichtbaren Bereich geschoben.
3. Sichtbarer Fokus-Ring (`--ring`, ≥ 3:1).
4. Farben: Light-Mode-Umrisse auf ≥ 3:1; Tiefe zusätzlich über Strichstärke/-muster;
   Lead-Link mit eigenem Symbol in Legende und Grafik.
5. „Nur meine Rollen“ hebt hervor (Rand + Symbol) statt andere abzudunkeln.
6. Textalternative: Link „Als Liste anzeigen (Baumansicht)“ + Kurzbeschreibung per `aria-describedby`.
7. `aria-label` für Zoom-Buttons; Live-Region für Zoomstand.
8. Pointer Events (Touch/Stift); Mausrad-Zoom nur mit `Ctrl`, Scrollen der Seite bleibt möglich.
9. Animationen nur ohne `prefers-reduced-motion`.
10. Klickziele ≥ 24×24 px auf dem Bildschirm.

## Phase 3 – Prüfung

1. Automatisch: axe-core im Browser (0 schwere Verstösse); Layout-Prüfung auf Überlappung und
   Mindestabstand mit der realen Kreisstruktur.
2. Manuell: nur Tastatur; NVDA + Firefox, JAWS + Chrome, VoiceOver; Zoom 200 %/400 %;
   Light/Dark; „Bewegung reduzieren“; Touch/Tablet.
3. Live auf der Test-VM mit Konten Mitglied, Lead-Link, Admin.
4. Neue Testfälle im Testkonzept (Abschnitt Barrierefreiheit).

## Phase 4 – Auslieferung

MR je Branch → Merge → `scripts/deploy.sh --backup --build` auf der Test-VM → Test → GitHub-Push.
