// Onyx world, contract v2: pre-rendered Blender layers + world.json in /onyx/world/.
// Coordinates are normalised 0–1 in the 16:9 frame (x to the right, y down).

export type ViewName = 'learner' | 'admin';
export type SlotId = 'slot_1' | 'slot_2' | 'slot_3' | 'slot_4' | 'slot_5' | 'slot_6' | 'slot_7' | 'slot_8' | 'slot_9' | 'slot_branch';
export const MAIN_SLOTS: SlotId[] = ['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5', 'slot_6', 'slot_7', 'slot_8', 'slot_9'];

export interface Slot { id: SlotId; cx: number; cy: number; rx: number; ry: number; lx: number; ly: number }
export interface Layer { name: string; src: string; depth: number; additive: boolean }
export type MainSlotId = Exclude<SlotId, 'slot_branch'>;
export interface WorldView {
  /** true when the Blender renders are present; false = the flat schematic map */
  art: boolean;
  aspect: number;
  layers: Layer[];
  /** the nine pedestals on the line; the side ledge only when the world has one */
  slots: Record<MainSlotId, Slot> & { slot_branch?: Slot };
  path: [number, number][];
  gate: { x: number; y: number };
  /** the gate's bounding box, when the world gives one (it may reach past the frame) */
  gateBox?: { x0: number; y0: number; x1: number; y1: number };
}

// `?world=world-v4` previews another render set in public/onyx/ without changing the default
const BASE = (() => {
  const w = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('world');
  return w && /^world[a-z0-9-]*$/.test(w) ? `/onyx/${w}` : '/onyx/world-v5'; // v5: one straight line of nine pedestals, photoscanned rock
})();
const ORDER = ['bg', 'mid', 'path', 'glow', 'fg'];
const DEPTH: Record<string, number> = { bg: 0.15, mid: 0.4, path: 0.6, glow: 0.6, fg: 1 };

// ── tolerant readers for whatever exact shape world.json arrives in ─────────
type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
function pt(v: unknown): [number, number] | null {
  if (Array.isArray(v) && v.length >= 2) return [num(v[0]), num(v[1])];
  if (isObj(v)) {
    if ('x' in v || 'y' in v) return [num(v.x), num(v.y)];
    if ('cx' in v || 'cy' in v) return [num(v.cx), num(v.cy)];
  }
  return null;
}

function readSlot(id: SlotId, s: unknown): Slot | null {
  if (!isObj(s)) return null;
  const e = isObj(s.ellipse) ? s.ellipse : isObj(s.top) ? s.top : s;
  const cx = num(e.cx, num(e.x, NaN));
  const cy = num(e.cy, num(e.y, NaN));
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  const rx = num(e.rx, 0.03);
  const ry = num(e.ry, rx * 0.4);
  const label = pt(s.label ?? s.labelAnchor ?? s.label_anchor ?? s.anchor) ?? [cx, cy - ry * 2.2];
  return { id, cx, cy, rx, ry, lx: label[0], ly: label[1] };
}

function readView(raw: unknown, name: ViewName): WorldView | null {
  if (!isObj(raw)) return null;
  const slotsRaw = raw.slots;
  const slots = {} as WorldView['slots'];
  const ids: SlotId[] = [...MAIN_SLOTS, 'slot_branch'];
  for (const id of ids) {
    let s: unknown;
    if (Array.isArray(slotsRaw)) s = slotsRaw.find((x) => isObj(x) && (x.id === id || x.name === id));
    else if (isObj(slotsRaw)) s = slotsRaw[id] ?? slotsRaw[id.replace('slot_', '')];
    const slot = readSlot(id, s);
    if (!slot) {
      if (id === 'slot_branch') continue; // a single-line world has no side ledge
      return null;
    }
    slots[id] = slot;
  }
  const pathRaw = (raw.path ?? raw.polyline ?? raw.pathPolyline) as unknown;
  const pts = (Array.isArray(pathRaw) ? pathRaw : isObj(pathRaw) && Array.isArray(pathRaw.points) ? pathRaw.points : [])
    .map(pt).filter(Boolean) as [number, number][];
  const g = raw.gate;
  const gate = pt(isObj(g) ? (g.center ?? g.emblem ?? g) : g) ?? [slots.slot_9.cx, slots.slot_9.cy - 0.12];
  const gb = isObj(g) && Array.isArray(g.box) && g.box.length === 4 ? { x0: num(g.box[0]), y0: num(g.box[1]), x1: num(g.box[2]), y1: num(g.box[3]) } : undefined;
  const layersRaw = isObj(raw.layers) ? raw.layers : isObj(raw.parallax) ? raw.parallax : {};
  const layers = ORDER.map((n) => {
    const l = layersRaw[n];
    const depth = isObj(l) ? num(l.depth ?? l.parallax, DEPTH[n]) : num(l, DEPTH[n]!);
    const file = isObj(l) && typeof l.file === 'string' ? l.file.split('/').pop()! : `${n}.webp`;
    return { name: n, src: `${BASE}/${name}/${file}`, depth, additive: n === 'glow' };
  });
  const size = Array.isArray(raw.size) ? raw.size : null;
  const aspect = size ? num(size[0], 16) / num(size[1], 9) : 16 / 9;
  return { art: true, aspect, layers, slots, path: pts.length >= 2 ? pts : smoothThrough((MAIN_SLOTS as MainSlotId[]).map((i) => [slots[i].cx, slots[i].cy])), gate: { x: gate[0], y: gate[1] }, gateBox: gb };
}

/** Load the world for a view. Falls back to the flat schematic when the renders are absent. */
export async function loadWorld(name: ViewName): Promise<WorldView> {
  try {
    const res = await fetch(`${BASE}/world.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as Raw;
    const raw = json[name] ?? (isObj(json.views) ? json.views[name] : undefined);
    const view = readView(raw, name);
    if (!view) throw new Error('shape');
    // make sure the art is there before promising it
    await Promise.all(view.layers.map((l) => new Promise<void>((ok, bad) => { const i = new Image(); i.onload = () => ok(); i.onerror = () => bad(new Error(l.src)); i.src = l.src; })));
    return view;
  } catch {
    return schematic(name);
  }
}

// ── geometry helpers ────────────────────────────────────────────────────────
/** Centripetal-ish Catmull-Rom through points, sampled to ~80 points. */
export function smoothThrough(p: [number, number][], per = 10): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]!, p1 = p[i]!, p2 = p[i + 1]!, p3 = p[i + 2] ?? p2;
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(p[p.length - 1]!);
  return out;
}

/** Index of the polyline point nearest to a slot. */
export function nearestIndex(path: [number, number][], x: number, y: number) {
  let best = 0, bd = Infinity;
  path.forEach((p, i) => { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd) { bd = d; best = i; } });
  return best;
}

// ── the flat schematic map (no art): used until the renders land, or if they fail ──
function schematicSlots(view: ViewName): WorldView['slots'] {
  const [x0, y0, x1, y1] = view === 'learner' ? [0.08, 0.79, 0.81, 0.54] : [0.09, 0.87, 0.92, 0.12];
  const out = {} as WorldView['slots'];
  (MAIN_SLOTS as MainSlotId[]).forEach((id, i) => {
    const t = i / 8;
    const cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t;
    const rx = view === 'learner' ? 0.043 - 0.013 * t : 0.04;
    const ry = view === 'learner' ? rx * (0.6 - 0.24 * t) : 0.058;
    out[id] = { id, cx, cy, rx, ry, lx: cx, ly: cy - ry * 3.4 };
  });
  return out;
}

function schematic(view: ViewName): WorldView {
  const slots = schematicSlots(view);
  const pts = (MAIN_SLOTS as MainSlotId[]).map((id) => [slots[id].cx, slots[id].cy] as [number, number]);
  const gate = view === 'learner' ? { x: 0.87, y: 0.43 } : { x: 1.04, y: -0.24 };
  return { art: false, aspect: 16 / 9, layers: [], slots, path: smoothThrough(pts), gate };
}

// ── which stage sits on which pedestal ─────────────────────────────────────
/** Stage n stands on pedestal n: one consecutive line with no gaps (the owner's single line). The Branch
 *  takes its turn in the line like any other stage. The second argument is kept for older callers. */
export function slotsFor(types: string[], _hasLedge = false): MainSlotId[] {
  return types.map((_, i) => (MAIN_SLOTS as MainSlotId[])[Math.min(i, 8)]!);
}
