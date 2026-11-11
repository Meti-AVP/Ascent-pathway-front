/**
 * The map's geometry: a pathway's stages as interlocking panels that together make one large
 * shape that climbs — stage 1 low on the left, the last stage high on the right — cut like one
 * blueprint sheet with even 8 u gaps.
 *
 * Each plan is a few tiers of cells drawn upright (u = across, y = down). A cell has a flat top;
 * its bottom follows the tops of the cells under it, so a cell that spans a step below is notched,
 * and a cell with nothing under it drops to the floor (an L). The polygons are inset for the
 * gaps, sheared to the house lean (12°, the top to the right), given their 45° cuts and rounded.
 *
 * The plan depends on where the learner stands: the current stage (or, once every stage is
 * cleared, the summit) gets the biggest cell. All numbers are map units = u (1 px of the
 * 1920 × 1080 frame).
 */

export const MAP_W = 1320;
export const MAP_H = 700;
export const GAP = 8;
/** the header strip along a panel's top edge */
export const HEAD = 30;
/** the number tile: upright, flush with the strip's top, TILE_IN in from the panel's corner */
export const TILE = 40;
export const TILE_IN = 4;
const LEAN = Math.tan((12 * Math.PI) / 180);
const R = 9;

export type Pt = [number, number];
type Cut = Partial<Record<'tr' | 'br' | 'bl', number>>;
/** `floor`: where the cell's bottom stops when nothing stands under it (the map's floor if unset) */
type Cell = { tier: number; u0: number; u1: number; top: number; cut?: Cut; floor?: number };

/**
 * Hand-cut plans, keyed `${stages}:${hero}` where hero is the index of the biggest cell: the
 * current stage, or the summit when every stage is cleared. Inside a tier the tops rise to the
 * right; the hero may stand proud of its neighbours. Locked cells are wide enough for their gate
 * on one 17 u line; tier boundaries are offset so the cells interlock with real notches. The
 * floor tier stops short of the right edge and the cell above it overhangs, so the lower right
 * corner stays open ground (where the backdrop's light streaks run, as in the reference).
 */
const PLANS: Record<string, Cell[]> = {
  // Sales Mastery: stage 4 is current — the big cell at the left of the middle tier
  '9:3': [
    { tier: 1, u0: 0, u1: 360, top: 524, cut: { bl: 40 } },
    { tier: 1, u0: 360, u1: 780, top: 506 },
    { tier: 1, u0: 780, u1: 1010, top: 488, cut: { br: 36 } },
    { tier: 2, u0: 110, u1: 700, top: 268 },
    { tier: 2, u0: 700, u1: 960, top: 252 },
    { tier: 2, u0: 960, u1: 1220, top: 234, floor: 488, cut: { tr: 24, br: 40 } },
    { tier: 3, u0: 330, u1: 620, top: 40 },
    { tier: 3, u0: 620, u1: 900, top: 20 },
    { tier: 3, u0: 900, u1: 1171, top: 0, cut: { tr: 26 } },
  ],
  // Cyber Safety: stage 2 is current — the big cell in the floor tier, standing proud
  '7:1': [
    { tier: 1, u0: 0, u1: 318, top: 496, cut: { bl: 40 } },
    { tier: 1, u0: 318, u1: 838, top: 448 },
    { tier: 1, u0: 838, u1: 1090, top: 466, cut: { br: 36 } },
    { tier: 2, u0: 420, u1: 760, top: 234 },
    { tier: 2, u0: 760, u1: 1220, top: 214, floor: 466, cut: { tr: 28, br: 40 } },
    { tier: 3, u0: 584, u1: 900, top: 22 },
    { tier: 3, u0: 900, u1: 1171, top: 0, cut: { tr: 30 } },
  ],
  // Leadership Foundations: every stage cleared — the summit crowns the climb in the biggest cell
  '6:5': [
    { tier: 1, u0: 0, u1: 410, top: 524, cut: { bl: 40 } },
    { tier: 1, u0: 410, u1: 840, top: 506 },
    { tier: 1, u0: 840, u1: 1100, top: 488, cut: { br: 36 } },
    { tier: 2, u0: 214, u1: 700, top: 292 },
    { tier: 2, u0: 700, u1: 1220, top: 272, floor: 488, cut: { tr: 28, br: 40 } },
    { tier: 3, u0: 474, u1: 1171, top: 0, cut: { tr: 34 } },
  ],
};

/**
 * A plan for any other count: three tiers, the bottom one fullest, the hero cell weighted wide.
 * The pathways in the data all have a hand-cut plan; this keeps any other shape from breaking.
 */
function autoPlan(n: number, hero: number): Cell[] {
  const t1 = Math.ceil(n / 3);
  const t2 = Math.ceil((n - t1) / 2);
  const t3 = n - t1 - t2;
  const tiers: [number, number, number, number, number][] = [
    // tier, count, u from, u to, base top
    [1, t1, 0, 1268, 524],
    [2, t2, 180, 1220, 268],
    [3, t3, 380, 1171, 40],
  ];
  const cells: Cell[] = [];
  let k = 0;
  for (const [tier, count, a, b, top] of tiers) {
    if (count <= 0) continue;
    const weights = Array.from({ length: count }, (_, i) => (k + i === hero ? 1.7 : 1));
    const sum = weights.reduce((s, w) => s + w, 0);
    let u = a;
    weights.forEach((w, i) => {
      const u1 = i === count - 1 ? b : Math.round(u + ((b - a) * w) / sum);
      const last = i === count - 1;
      const cut: Cut = {};
      if (tier === 1 && i === 0) cut.bl = 40;
      if (last) cut.tr = tier === 3 ? 30 : 28;
      if (last && tier === 1) cut.br = 40;
      cells.push({ tier, u0: u, u1, top: top - i * 18, cut });
      u = u1;
    });
    k += count;
  }
  return cells;
}

export type PanelGeo = {
  /** bounding box in map units */
  x: number;
  y: number;
  w: number;
  h: number;
  /** the rounded outline, relative to the box */
  d: string;
  /** the same outline in 0..1 of the box, for clipPathUnits="objectBoundingBox" */
  norm: string;
  /** the outline's corners after the cuts, before rounding (relative to the box) */
  pts: Pt[];
  /** the flat top edge (relative to the box): the header strip runs along it */
  head: { x: number; y: number; w: number };
  /** the bottom-left and bottom-right corners before the cuts (relative to the box) */
  bl: [number, number];
  br: [number, number];
  /** the highest point of the bottom edge (relative): above it the panel is full width */
  floor: number;
  tier: number;
  /** the biggest cell of the plan: the current stage, or the summit when all are cleared */
  hero: boolean;
  /**
   * The line from the map's top-left entry to this panel's number tile, routed through open
   * ground and the 8 u gaps so it never crosses another panel: polyline points in map
   * coordinates (the map box's top-left is 0,0). The last point touches the tile.
   */
  gapRoute: Pt[];
};

/** the outline of a cell before the gap: flat top, a bottom that follows the cells below */
function outline(cell: Cell, cells: Cell[]): Pt[] {
  const below = cells.filter((c) => c.tier < cell.tier);
  const cuts = new Set<number>([cell.u0, cell.u1]);
  for (const c of below) {
    if (c.u0 > cell.u0 && c.u0 < cell.u1) cuts.add(c.u0);
    if (c.u1 > cell.u0 && c.u1 < cell.u1) cuts.add(c.u1);
  }
  const xs = [...cuts].sort((a, b) => a - b);
  const spans: { a: number; b: number; y: number }[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i]!;
    const b = xs[i + 1]!;
    spans.push({ a, b, y: floorAt(cell, cells, (a + b) / 2) });
  }
  const pts: Pt[] = [
    [cell.u0, cell.top],
    [cell.u1, cell.top],
  ];
  for (let i = spans.length - 1; i >= 0; i--) {
    const s = spans[i]!;
    pts.push([s.b, s.y], [s.a, s.y]);
  }
  return tidy(pts);
}

/** the top of whatever stands under a cell at u (the floor of the map if nothing does) */
function floorAt(cell: Cell, cells: Cell[], u: number) {
  let best: Cell | undefined;
  for (const c of cells) if (c.tier < cell.tier && u > c.u0 && u < c.u1 && (!best || c.tier > best.tier)) best = c;
  return best ? best.top : (cell.floor ?? MAP_H);
}

/** drop repeated and collinear points so edges alternate across and down */
function tidy(pts: Pt[]): Pt[] {
  let out = pts.filter((p, i) => {
    const q = pts[(i + pts.length - 1) % pts.length]!;
    return p[0] !== q[0] || p[1] !== q[1];
  });
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const a = out[(i + out.length - 1) % out.length]!;
      const b = out[i]!;
      const c = out[(i + 1) % out.length]!;
      if ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1])) {
        out = out.filter((_, j) => j !== i);
        changed = true;
        break;
      }
    }
  }
  return out;
}

/** inset an upright, clockwise outline by d: every edge moves toward the inside */
function inset(pts: Pt[], d: number): Pt[] {
  const n = pts.length;
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % n]!;
    if (p[1] === q[1]) return { across: true, v: p[1] + d * Math.sign(q[0] - p[0]) };
    return { across: false, v: p[0] - d * Math.sign(q[1] - p[1]) };
  });
  return pts.map((_, i) => {
    const prev = lines[(i + n - 1) % n]!;
    const cur = lines[i]!;
    const x = prev.across ? cur.v : prev.v;
    const y = prev.across ? prev.v : cur.v;
    return [x, y] as Pt;
  });
}

const shear = ([u, y]: Pt): Pt => [u + LEAN * (MAP_H - y), y];

/** replace a corner with a 45°-ish cut of length c along both edges */
function cut(pts: Pt[], i: number, c: number): Pt[] {
  const n = pts.length;
  const p = pts[i]!;
  const a = pts[(i + n - 1) % n]!;
  const b = pts[(i + 1) % n]!;
  const toward = (q: Pt): Pt => {
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const l = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / l) * c, p[1] + (dy / l) * c];
  };
  return [...pts.slice(0, i), toward(a), toward(b), ...pts.slice(i + 1)];
}

const f = (v: number) => Math.round(v * 100) / 100;

/** a closed path with every corner rounded */
function rounded(pts: Pt[], r: number): string {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const a = pts[(i + n - 1) % n]!;
    const b = pts[(i + 1) % n]!;
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const k = Math.min(r, la * 0.45, lb * 0.45);
    const s: Pt = [p[0] + ((a[0] - p[0]) / la) * k, p[1] + ((a[1] - p[1]) / la) * k];
    const e: Pt = [p[0] + ((b[0] - p[0]) / lb) * k, p[1] + ((b[1] - p[1]) / lb) * k];
    d += `${i === 0 ? 'M' : 'L'}${f(s[0])} ${f(s[1])}Q${f(p[0])} ${f(p[1])} ${f(e[0])} ${f(e[1])}`;
  }
  return d + 'Z';
}

/* ── geometry helpers the panels use to lay out their copy and art ─────────────────────────── */

/** where a polygon is crossed by the horizontal line y: the outermost left and right x */
function crossAt(pts: Pt[], y: number): [number, number] | null {
  const xs: number[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
  }
  if (xs.length < 2) return null;
  xs.sort((p, q) => p - q);
  // the run that holds the left edge: a panel is one piece at any height, an L only below its notch
  return [xs[0]!, xs[1]!];
}

/**
 * The x range that is inside the panel for the whole band y1..y2 (relative to the box), less a
 * margin for the rounded corners. Null when the band leaves the panel.
 */
export function safeSpan(geo: PanelGeo, y1: number, y2: number, margin = 0): [number, number] | null {
  const ys = [y1, y2, ...geo.pts.map((p) => p[1]).filter((y) => y > y1 && y < y2)];
  let l = -Infinity;
  let r = Infinity;
  for (const y of ys) {
    const c = crossAt(geo.pts, Math.min(Math.max(y, y1 + 0.01), y2 - 0.01));
    if (!c) return null;
    l = Math.max(l, c[0]);
    r = Math.min(r, c[1]);
  }
  return r - l > margin * 2 ? [l + margin, r - margin] : null;
}

/** the number tile's box (relative to the panel's box) */
export function tileBox(geo: Pick<PanelGeo, 'head'>) {
  return { x: geo.head.x + TILE_IN, y: geo.head.y, w: TILE, h: TILE };
}

/* ── the lead line's route ─────────────────────────────────────────────────────────────────── */

type Box = { x: number; y: number; pts: Pt[] };

/** does the segment p→q pass through any panel (other than `skip`), with a clearance? */
function blocked(p: Pt, q: Pt, panels: Box[], skip: number, clear: number) {
  const steps = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 3);
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const x = p[0] + (q[0] - p[0]) * t;
    const y = p[1] + (q[1] - p[1]) * t;
    for (let i = 0; i < panels.length; i++) {
      if (i === skip) continue;
      const b = panels[i]!;
      for (const dy of [-clear, 0, clear]) {
        const c = crossAt(b.pts, y + dy - b.y);
        if (c && x - b.x > c[0] - clear && x - b.x < c[1] + clear) return true;
      }
    }
  }
  return false;
}

/**
 * Route from the entry (0,0) to cell k's tile. When the ground beside the tile is open the line
 * comes in level with the strip; otherwise it drops into the gap above the cell's tier and runs
 * along it, stepping up at each cell boundary, to stop on the tile's top edge.
 */
function route(cells: Cell[], k: number, geos: Omit<PanelGeo, 'gapRoute'>[]): Pt[] {
  const E: Pt = [0, 0];
  const g = geos[k]!;
  const panels: Box[] = geos.map((p) => ({ x: p.x, y: p.y, pts: p.pts }));
  const tile = tileBox(g);
  const tx = g.x + tile.x;
  const ty = g.y + tile.y + 12;
  const T: Pt = [tx, ty];
  const Q: Pt = [tx - 34, ty];
  // open ground beside the tile: straight in, or down the lean and then in
  if (!blocked(Q, [tx - 6, ty], panels, k, 3)) {
    if (!blocked(E, Q, panels, -1, 6)) return [E, Q, T];
    const top: Pt = [Q[0] + LEAN * Q[1], 0];
    if (top[0] > 0 && !blocked(E, top, panels, -1, 6) && !blocked(top, Q, panels, -1, 6)) return [E, top, Q, T];
  }
  // through the gap above the tier: from its open left end, stepping up at each boundary
  const cell = cells[k]!;
  const tier = cells.filter((c) => c.tier === cell.tier && c.u0 <= cell.u0).sort((a, b) => a.u0 - b.u0);
  const first = tier[0]!;
  const up: Pt[] = [[first.u0 - 24, first.top]];
  for (let i = 1; i < tier.length; i++) {
    up.push([tier[i]!.u0, tier[i - 1]!.top], [tier[i]!.u0, tier[i]!.top]);
  }
  up.push([cell.u0 + GAP / 2 + TILE_IN + 8, cell.top]);
  const pts = up.map(shear);
  const end = pts[pts.length - 1]!;
  return [E, ...pts.slice(0, -1), [end[0], end[1]], [end[0], g.y + tile.y]];
}

function build(cells: Cell[], hero: number): PanelGeo[] {
  const geos = cells.map((cell, i) => {
    const base = inset(outline(cell, cells), GAP / 2).map(shear);
    let pts = base;
    // the cuts, by role: 1 = top right, 2 = the first corner down the right side, last = bottom left
    const roles: [keyof Cut, number][] = [
      ['bl', pts.length - 1],
      ['br', 2],
      ['tr', 1],
    ];
    for (const [role, j] of roles) {
      const c = cell.cut?.[role];
      if (c) pts = cut(pts, j, c);
    }
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const w = Math.max(...xs) - x;
    const h = Math.max(...ys) - y;
    const rel = pts.map(([px, py]) => [px - x, py - y] as Pt);
    const norm = rounded(
      rel.map(([px, py]) => [px / w, py / h] as Pt),
      0,
    );
    const p0 = rel[0]!;
    const p1 = rel[1]!;
    const bl = base[base.length - 1]!;
    const br = base[2]!;
    // the bottom edges are the level runs below the top: the highest of them is the floor
    const floor = Math.min(...base.slice(2).map((p) => p[1])) - y;
    return {
      x,
      y,
      w,
      h,
      d: rounded(rel, R),
      norm,
      pts: rel,
      head: { x: p0[0], y: p0[1], w: p1[0] - p0[0] },
      bl: [bl[0] - x, bl[1] - y] as [number, number],
      br: [br[0] - x, br[1] - y] as [number, number],
      floor,
      tier: cell.tier,
      hero: i === hero,
    };
  });
  return geos.map((g, i) => ({ ...g, gapRoute: route(cells, i, geos).map(([px, py]) => [f(px), f(py)] as Pt) }));
}

const CACHE = new Map<string, PanelGeo[]>();

/**
 * The panels for a pathway of n stages whose current stage is `current` (0-based; -1 when every
 * stage is cleared, and then the summit is the hero). Hand-cut plans exist for the pathways in
 * the data; any other shape gets an automatic plan with the same rules.
 */
export function layoutFor(n: number, current: number): PanelGeo[] {
  const hero = current >= 0 && current < n ? current : n - 1;
  const id = `${n}:${hero}`;
  let geo = CACHE.get(id);
  if (!geo) {
    geo = build(PLANS[id] ?? autoPlan(n, hero), hero);
    CACHE.set(id, geo);
  }
  return geo;
}

export const lean = LEAN;
