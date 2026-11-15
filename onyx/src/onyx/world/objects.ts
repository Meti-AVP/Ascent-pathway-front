// Realistic 3D stage objects, pre-rendered by the Blender builder into /onyx/objects/<key>/.
// The pages use them only when every file of every object loads: never a half-integrated state.
import { useEffect, useState } from 'react';

export const OBJECT_KEYS = ['learn', 'assess', 'compete', 'prove', 'branch', 'reward', 'tournament', 'live'] as const;
export type ObjectKey = (typeof OBJECT_KEYS)[number];
export type ObjectFile = 'learner_lit' | 'learner_done' | 'learner_stone' | 'learner_spin' | 'admin_lit';
const FILES: ObjectFile[] = ['learner_lit', 'learner_done', 'learner_stone', 'learner_spin', 'admin_lit'];

export interface ObjectEntry {
  key: ObjectKey;
  src: Record<ObjectFile, string>;
  /** the point of the image (0–1) that stands on the pedestal's top centre */
  anchor: [number, number];
  /** object width = pedestal rx × fit */
  fit: number;
  /** the spin sheet's grid */
  grid: { cols: number; rows: number; frames: number };
  /** width / height of one image (or one frame of the sheet) */
  aspect: number;
}
export type ObjectSet = Record<ObjectKey, ObjectEntry>;

const BASE = '/onyx/objects';
type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

function readEntry(key: ObjectKey, raw: unknown, root: Raw): Omit<ObjectEntry, 'aspect'> | null {
  if (!isObj(raw)) return null;
  const files = isObj(raw.files) ? raw.files : raw;
  const src = {} as Record<ObjectFile, string>;
  for (const f of FILES) {
    const v = files[f] ?? files[f.replace('learner_', '').replace('admin_', 'admin-')];
    const name = typeof v === 'string' ? v : isObj(v) && typeof v.file === 'string' ? v.file : `${f}.webp`;
    src[f] = name.startsWith('/') ? name : name.includes('/') ? `${BASE}/${name}` : `${BASE}/${key}/${name}`;
  }
  const a = raw.anchor ?? root.anchor;
  const anchor: [number, number] = Array.isArray(a) && a.length >= 2 ? [num(a[0], 0.5), num(a[1], 1)] : isObj(a) ? [num(a.x, 0.5), num(a.y, 1)] : [0.5, 1];
  const g = (raw.grid ?? raw.sheet ?? raw.sprite ?? raw.spin ?? root.grid ?? root.sheet ?? root.sprite) as unknown;
  const cols = isObj(g) ? num(g.cols ?? g.columns, 8) : 8;
  const rows = isObj(g) ? num(g.rows, 5) : 5;
  const frames = isObj(g) ? num(g.frames ?? g.count, cols * rows) : cols * rows;
  // the manifest's fit is a fraction of the pedestal-top width (2·rx); the pages size by rx × fit
  return { key, src, anchor, fit: num(raw.fit ?? root.fit, 0.55) * 2, grid: { cols, rows, frames } };
}

const size = (src: string) => new Promise<{ w: number; h: number }>((ok, bad) => {
  const i = new Image();
  i.onload = () => ok({ w: i.naturalWidth, h: i.naturalHeight });
  i.onerror = () => bad(new Error(src));
  i.src = src;
});

let cache: Promise<ObjectSet | null> | null = null;
export function loadObjects(): Promise<ObjectSet | null> {
  cache ??= (async () => {
    try {
      const res = await fetch(`${BASE}/objects.json`, { cache: 'no-cache' });
      if (!res.ok) return null;
      const json = (await res.json()) as Raw;
      const list = isObj(json.objects) ? json.objects : json;
      const out = {} as ObjectSet;
      for (const key of OBJECT_KEYS) {
        const e = readEntry(key, list[key], json);
        if (!e) return null;
        const dims = await Promise.all(FILES.map((f) => size(e.src[f])));
        const lit = dims[0]!;
        out[key] = { ...e, aspect: lit.w / lit.h };
      }
      return out;
    } catch {
      return null;
    }
  })();
  return cache;
}

/** The objects, once every file is verified; null until then (keep the icons). */
export function useObjects(): ObjectSet | null {
  const [set, setSet] = useState<ObjectSet | null>(null);
  useEffect(() => { let alive = true; loadObjects().then((s) => { if (alive) setSet(s); }); return () => { alive = false; }; }, []);
  return set;
}

/** Which object a stage shows: its product when that has its own object, else its stage type. */
export function objectKeyFor(type: string, productKind?: string): ObjectKey {
  if (productKind === 'tournament') return 'tournament';
  if (productKind === 'live') return 'live';
  return (OBJECT_KEYS as readonly string[]).includes(type) ? (type as ObjectKey) : 'learn';
}
