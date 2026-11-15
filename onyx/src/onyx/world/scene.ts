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
}

// `?world=world-v4` previews another render set in public/onyx/ without changing the default
const BASE = (() => {
  const w = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('world');
  return w && /^world[a-z0-9-]*$/.test(w) ? `/onyx/${w}` : '/onyx/world';
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
  const gate = pt(isObj(raw.gate) && 'center' in raw.gate ? raw.gate.center : raw.gate) ?? [slots.slot_9.cx, slots.slot_9.cy - 0.12];
  const layersRaw = isObj(raw.layers) ? raw.layers : isObj(raw.parallax) ? raw.parallax : {};
  const layers = ORDER.map((n) => {
    const l = layersRaw[n];
    const depth = isObj(l) ? num(l.depth ?? l.parallax, DEPTH[n]) : num(l, DEPTH[n]!);
    const file = isObj(l) && typeof l.file === 'string' ? l.file.split('/').pop()! : `${n}.webp`;
    return { name: n, src: `${BASE}/${name}/${file}`, depth, additive: n === 'glow' };
  });
  const size = Array.isArray(raw.size) ? raw.size : null;
  const aspect = size ? num(size[0], 16) / num(size[1], 9) : 16 / 9;
  return { art: true, aspect, layers, slots, path: pts.length >= 2 ? pts : smoothThrough((MAIN_SLOTS as MainSlotId[]).map((i) => [slots[i].cx, slots[i].cy])), gate: { x: gate[0], y: gate[1] } };
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
  const L: [number, number][] = view === 'learner'
    ? [[0.17, 0.82], [0.26, 0.74], [0.34, 0.66], [0.42, 0.6], [0.5, 0.54], [0.57, 0.48], [0.63, 0.42], [0.69, 0.36], [0.74, 0.3]]
    : [[0.3, 0.9], [0.5, 0.86], [0.68, 0.76], [0.56, 0.64], [0.36, 0.58], [0.28, 0.44], [0.46, 0.36], [0.66, 0.3], [0.52, 0.16]];
  const br: [number, number] = view === 'learner' ? [0.5, 0.36] : [0.14, 0.32];
  const rx = view === 'learner' ? 0.036 : 0.034;
  const ry = view === 'learner' ? 0.016 : 0.026;
  const out = {} as WorldView['slots'];
  (MAIN_SLOTS as MainSlotId[]).forEach((id, i) => {
    const [cx, cy] = L[i]!;
    const k = view === 'learner' ? 1 - i * 0.035 : 1;
    out[id] = { id, cx, cy, rx: rx * k, ry: ry * k, lx: cx, ly: cy - ry * k * 1.2 };
  });
  out.slot_branch = { id: 'slot_branch', cx: br[0], cy: br[1], rx: rx * 0.8, ry: ry * 0.8, lx: br[0], ly: br[1] - ry };
  return out;
}

function schematic(view: ViewName): WorldView {
  const slots = schematicSlots(view);
  const pts = (MAIN_SLOTS as MainSlotId[]).map((id) => [slots[id].cx, slots[id].cy] as [number, number]);
  const gate = view === 'learner' ? { x: 0.79, y: 0.22 } : { x: 0.5, y: 0.07 };
  return { art: false, aspect: 16 / 9, layers: [], slots, path: smoothThrough([[pts[0]![0] - 0.06, pts[0]![1] + 0.08], ...pts, [gate.x, gate.y + 0.02]]), gate };
}

// ── which stage sits on which pedestal ─────────────────────────────────────
/** N stages onto nine pedestals: Reward on slot_9 at the gate, the rest spread evenly along the line.
 *  A Branch goes on the side ledge when the world has one; on a single-line world it takes its place in the line. */
export function slotsFor(types: string[], hasLedge = true): SlotId[] {
  const out: SlotId[] = new Array(types.length);
  const main: number[] = [];
  types.forEach((t, i) => {
    if (t === 'branch' && hasLedge) out[i] = 'slot_branch';
    else if (t === 'reward' && i === types.length - 1) out[i] = 'slot_9';
    else main.push(i);
  });
  const k = main.length;
  const hasReward = types[types.length - 1] === 'reward';
  const top = hasReward ? 8 : 9;
  main.forEach((idx, j) => {
    const n = k === 1 ? 1 : 1 + Math.round((j * (top - 1)) / (k - 1));
    out[idx] = `slot_${Math.min(top, n)}` as SlotId;
  });
  return out;
}
