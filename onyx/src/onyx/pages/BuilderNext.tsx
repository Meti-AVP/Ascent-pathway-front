import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { ChevronRight, CircleAlert, Eye, FileUp, GitBranch, Library, LoaderCircle, PenLine, Plus, Rocket, Search, Send, Sparkles, X } from 'lucide-react';
import { gsap, splitReveal, reduced } from '../motion';
import { Btn, KIND_ICON, Menu, Sheet, TYPE_ICON, cx } from '../ui';
import {
  ADMIN, APPROVER, BUILDER_JOURNEY, CLAUSES, LIBRARY, PRODUCT_KINDS, STAGE_TYPES,
  type BProduct, type BStage, type Clause, type ProductKind, type QItem, type StageType,
} from '../data';
import { addToQueue, lint, removeFromQueue, store, toast, updateStage, useApp, type Problem } from '../store';
import { go } from '../router';
import { Stage25, type StageApi } from '../world/Stage25';
import { MAIN_SLOTS, loadWorld, nearestIndex, type MainSlotId, type WorldView } from '../world/scene';
import { objectKeyFor, useObjects, type ObjectSet } from '../world/objects';
import { ObjectSprite } from '../world/ObjectSprite';
import { ContentSheet, ImportSheet, PreviewSheet } from './BuilderSheets';
import { Editor, uid, type SheetKind } from './BuilderEditor';
import './builder.css';
import './builderNext.css';

// ── the rules of the line ─────────────────────────────────────────────────
const SLOTS = MAIN_SLOTS as MainSlotId[];
const KINDS = Object.keys(PRODUCT_KINDS) as ProductKind[];
const TYPE_FOR: Record<ProductKind, StageType> = { course: 'learn', assessment: 'assess', arena: 'compete', tournament: 'prove', live: 'learn', reward: 'reward' };
const STAGE_NAME: Record<ProductKind, string> = { course: 'New lesson', assessment: 'New check', arena: 'New arena', tournament: 'New cup', live: 'New live session', reward: 'New reward' };
const defaultGate = (type: StageType, kind: ProductKind): Clause[] => {
  if (type === 'learn') return [{ id: uid(), kind: 'completion', value: 100 }];
  if (type === 'assess') return [{ id: uid(), kind: 'score', value: 80 }];
  if (type === 'compete') return [{ id: uid(), kind: 'battle', value: 1 }];
  if (type === 'prove' && kind !== 'tournament') return [{ id: uid(), kind: 'score', value: 80 }];
  return [];
};
/** stage n stands on pedestal n */
const lined = (list: BStage[]) => list.map((s, i) => (s.slot === SLOTS[i] ? s : { ...s, slot: SLOTS[Math.min(i, 8)]! }));

type Drag =
  | { kind: 'content'; product: ProductKind }
  | { kind: 'stage'; stageId: string };
type Target = { slot: MainSlotId; index: number; act: 'add' | 'new' | 'move' };

let approvalTimer = 0;
const history: BStage[][] = [];

export function BuilderNext() {
  const stages = useApp((s) => s.stages);
  const selected = useApp((s) => s.selected);
  const status = useApp((s) => s.status);
  const saved = useApp((s) => s.saved);
  const problems = useMemo(() => lint(stages), [stages]);
  const objs = useObjects();
  const [view, setView] = useState<WorldView | null>(null);
  const [insp, setInsp] = useState(false);
  const [probsOpen, setProbsOpen] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [sheet, setSheet] = useState<{ kind: SheetKind; stageId: string } | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const api = useRef<StageApi>(null);
  const slotEls = useRef(new Map<MainSlotId, HTMLElement>());
  const stageEls = useRef(new Map<string, HTMLElement>());
  const reveal = useRef({ t: 0 });
  const prevPos = useRef<Map<string, { x: number; y: number }> | null>(null);
  const landed = useRef<string | null>(null);
  const suppressClick = useRef(false);
  const entered = useRef(false);
  const locked = status !== 'draft';
  const sel = stages.find((s) => s.id === selected) ?? stages[0];
  const n = stages.length;

  useEffect(() => { let alive = true; loadWorld('admin').then((v) => { if (alive) setView(v); }); return () => { alive = false; }; }, []);
  // the line model: keep every stage on its own pedestal, in order
  useEffect(() => { if (stages.some((s, i) => s.slot !== SLOTS[i])) store.set((s) => ({ ...s, stages: lined(s.stages) })); }, [stages]);

  // ── light along the line: the glow layer is revealed up to the last stage ──
  const geo = useMemo(() => {
    if (!view) return null;
    const a = view.slots.slot_1, b = view.slots.slot_9;
    const W = 16, H = 9;
    const ang = Math.atan2((b.cx - a.cx) * W, -(b.cy - a.cy) * H);
    const ux = Math.sin(ang), uy = -Math.cos(ang);
    const L = Math.abs(W * ux) + Math.abs(H * uy);
    const tOf = (x: number, y: number) => ((x * W - W / 2) * ux + (y * H - H / 2) * uy) / L + 0.5;
    return { deg: (ang * 180) / Math.PI, tOf };
  }, [view]);
  const applyReveal = () => {
    const el = api.current?.layer('glow');
    if (!el || !geo) return;
    const p = Math.max(0, reveal.current.t) * 100;
    const m = `linear-gradient(${geo.deg.toFixed(2)}deg, #000 0%, #000 ${p.toFixed(2)}%, transparent ${(p + 3.5).toFixed(2)}%)`;
    el.style.webkitMaskImage = m;
    el.style.maskImage = m;
  };
  const revealTo = (t: number, duration = 1.2) => {
    gsap.killTweensOf(reveal.current);
    gsap.to(reveal.current, { t, duration: reduced() ? 0 : duration, ease: 'power2.inOut', onUpdate: applyReveal, onComplete: applyReveal });
  };
  const lastT = () => {
    if (!view || !geo) return 0;
    if (status !== 'draft') return 1.06;
    if (!n) return geo.tOf(view.slots.slot_1.cx, view.slots.slot_1.cy) - 0.06;
    const s = view.slots[SLOTS[Math.min(n, 9) - 1]!];
    return geo.tOf(s.cx, s.cy) + 0.035;
  };

  // ── camera: the whole line between the header and the dock; beside the inspector when it is open ──
  const zoomNow = () => { const a = api.current!; return (a.toScreen(1, 0).x - a.toScreen(0, 0).x) / a.frameSize().w; };
  const freeRect = (open: boolean) => {
    const { w, h } = api.current!.size();
    const insW = open ? Math.min(440, Math.max(380, w * 0.27)) + Math.max(32, Math.min(88, w * 0.044)) + 20 : 0;
    return { left: 24, right: w - insW - 24, top: 168, bottom: h - 150 };
  };
  const frame = (duration = 1.3, open = insp) => {
    const a = api.current;
    if (!a || !view) return;
    const s1 = view.slots.slot_1, s9 = view.slots.slot_9;
    a.fit({ x0: s1.cx - s1.rx * 1.3, y0: s9.cy - s9.ry * 2.6, x1: s9.cx + s9.rx * 3.2, y1: s1.cy + s1.ry * 1.8 }, freeRect(open), { maxZ: 1.4, minZ: 0.45, duration });
  };
  // ── place pedestals and stages whenever the camera or the parallax moves ──
  const placeAll = () => {
    const a = api.current;
    if (!a || !view) return;
    const { w: FW, h: FH } = a.frameSize();
    const z = zoomNow();
    const p = { x: 0, y: 0 };
    const vars = (el: HTMLElement, id: MainSlotId) => {
      const s = view.slots[id];
      a.toScreen(s.cx, s.cy, p);
      const rx = s.rx * FW * z, ry = s.ry * FH * z;
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      el.style.setProperty('--rx', `${rx.toFixed(1)}px`);
      el.style.setProperty('--ry', `${ry.toFixed(1)}px`);
      el.style.setProperty('--obj', `${Math.max(46, Math.min(88, rx * 1.2)).toFixed(1)}px`);
      el.style.zIndex = String(Math.round(s.cy * 100));
    };
    slotEls.current.forEach((el, id) => vars(el, id));
    const list = store.get().stages;
    stageEls.current.forEach((el, id) => { const i = list.findIndex((s) => s.id === id); if (i >= 0 && i < 9) vars(el, SLOTS[i]!); });
  };
  useEffect(() => {
    if (!view || !api.current) return;
    const off = api.current.subscribe(placeAll);
    placeAll();
    return () => { off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // entrance: the camera cranes down onto the line, the ember light runs to the last stage, the objects rise
  useLayoutEffect(() => {
    if (!view || entered.current || !api.current) return;
    entered.current = true;
    const a = api.current;
    reveal.current.t = geo ? geo.tOf(view.slots.slot_1.cx, view.slots.slot_1.cy) - 0.08 : 0;
    applyReveal();
    if (reduced()) { frame(0); reveal.current.t = lastT(); applyReveal(); return; }
    a.glide({ fx: 0.55, fy: 0.62, z: 0.5, ax: 0.5, ay: 0.22 }, { duration: 0, cover: false });
    window.setTimeout(() => frame(1.5), 30);
    window.setTimeout(() => revealTo(lastT(), 1.3), 500);
    const q = gsap.utils.selector(root);
    splitReveal(title.current, { by: 'words', stagger: 0.07, delay: 0.1 });
    gsap.fromTo(q('.bn-stage__fly'), { y: -46, opacity: 0, scale: 0.85 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.6)', stagger: 0.11, delay: 0.75, clearProps: 'transform' });
    gsap.fromTo(q('.bn-dock, .bn-status, .bn-actions'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'onyx', stagger: 0.08, delay: 0.4, clearProps: 'transform' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  useEffect(() => {
    if (!view) return;
    const on = () => frame(0.6);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, insp]);

  // after every change: stages slide to their new pedestals (FLIP), a new arrival bounces in with sparks
  const order = stages.map((s) => s.id).join();
  useLayoutEffect(() => {
    placeAll();
    const a = api.current;
    const before = prevPos.current;
    prevPos.current = null;
    if (!a || !view || reduced()) { if (entered.current) { reveal.current.t = lastT(); applyReveal(); } return; }
    if (before) {
      stages.forEach((st, i) => {
        const was = before.get(st.id);
        const fly = stageEls.current.get(st.id)?.querySelector('.bn-stage__fly');
        if (!was || !fly || i >= 9) return;
        const now = a.toScreen(view.slots[SLOTS[i]!].cx, view.slots[SLOTS[i]!].cy, { x: 0, y: 0 });
        if (Math.hypot(was.x - now.x, was.y - now.y) > 2) gsap.fromTo(fly, { x: was.x - now.x, y: was.y - now.y }, { x: 0, y: 0, duration: 0.75, ease: 'onyx', clearProps: 'transform' });
      });
    }
    const id = landed.current;
    landed.current = null;
    if (id) {
      const fly = stageEls.current.get(id)?.querySelector('.bn-stage__fly');
      if (fly) gsap.fromTo(fly, { y: -60, scale: 1.18, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.85, ease: 'bounce.out', clearProps: 'transform' });
      const i = stages.findIndex((s) => s.id === id);
      if (i >= 0 && i < 9) { const s = view.slots[SLOTS[i]!]; const p = a.toScreen(s.cx, s.cy, { x: 0, y: 0 }); window.setTimeout(() => sparks(p.x, p.y), 380); }
    }
    if (entered.current) revealTo(lastT(), 0.9);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, status]);

  // ── changes: autosave, undo, a toast ──
  const capture = () => {
    const a = api.current;
    if (!a || !view) return;
    const m = new Map<string, { x: number; y: number }>();
    store.get().stages.forEach((st, i) => { if (i < 9) m.set(st.id, a.toScreen(view.slots[SLOTS[i]!].cx, view.slots[SLOTS[i]!].cy, { x: 0, y: 0 })); });
    prevPos.current = m;
  };
  const restore = (snap: BStage[]) => { capture(); store.set((s) => ({ ...s, stages: snap })); autosave(); };
  const autosave = () => {
    store.set((s) => ({ ...s, saved: 'Saving…', dirty: true }));
    window.clearTimeout((autosave as unknown as { t?: number }).t);
    (autosave as unknown as { t?: number }).t = window.setTimeout(() => store.set((s) => ({ ...s, saved: 'Saved just now', dirty: false })), 700);
  };
  const change = (label: string, body: string | undefined, fn: (all: BStage[]) => BStage[]) => {
    const prev = store.get().stages;
    history.push(prev);
    if (history.length > 40) history.shift();
    capture();
    store.set((s) => ({ ...s, stages: lined(fn(s.stages)) }));
    autosave();
    toast({ tone: 'done', title: label, body, action: { label: 'Undo', run: () => restore(prev) } });
  };

  const openStage = (id: string, opts: { fly?: boolean } = {}) => {
    store.set((s) => ({ ...s, selected: id }));
    setProbsOpen(false);
    if (!insp) setInsp(true);
    // the whole line re-frames into the space beside the panel, so the stage (and every other) stays in view
    window.setTimeout(() => frame(opts.fly ? 1.4 : 1.1, true), 20);
  };
  const closeInspector = () => {
    const el = root.current?.querySelector('.bn-editor');
    const done = () => { setInsp(false); frame(1.2, false); };
    if (el && !reduced()) gsap.to(el, { x: 70, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: done });
    else done();
  };
  useLayoutEffect(() => {
    const el = root.current?.querySelector('.bn-editor');
    if (insp && el && !reduced()) gsap.fromTo(el, { x: 80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'onyx', clearProps: 'transform' });
  }, [insp]);

  const flash = (id: string) => { setFlashId(id); window.setTimeout(() => setFlashId(null), 1800); };
  const makeProduct = (kind: ProductKind, lib?: { name: string; meta: string }): BProduct => lib
    ? { id: uid(), kind, name: lib.name, meta: kind === 'arena' ? 'Battle Arena' : lib.meta, status: 'ready' }
    : { id: uid(), kind, name: `New ${PRODUCT_KINDS[kind].label.toLowerCase()}`, meta: kind === 'assessment' ? 'No questions yet' : 'New · add the details', status: kind === 'assessment' ? 'empty' : 'ready' };

  /** a new stage at the end of the line (before the reward, which keeps the last place) */
  const addStage = (kind: ProductKind | 'branch', lib?: { name: string; meta: string }) => {
    const all = store.get().stages;
    if (all.length >= 9) { toast({ tone: 'alert', title: 'The line is full', body: 'Nine stages fit on the path. Add content to a stage instead.' }); return; }
    const isBranch = kind === 'branch';
    const product = makeProduct(isBranch ? 'course' : kind, isBranch ? { name: 'Refresher course', meta: '3 lessons · 20 min' } : lib);
    const type: StageType = isBranch ? 'branch' : TYPE_FOR[kind];
    const id = uid();
    const at = all[all.length - 1]?.type === 'reward' && type !== 'reward' ? all.length - 1 : all.length;
    const src = [...all.slice(0, at)].reverse().find((s) => s.type !== 'branch');
    const st: BStage = {
      id, slot: SLOTS[at]!, type, name: isBranch ? 'Remedial branch' : lib ? lib.name : STAGE_NAME[kind as ProductKind],
      products: [product], gate: isBranch ? [] : defaultGate(type, kind as ProductKind),
      settings: { time: 'No limit', difficulty: 'Fixed', retries: 2, required: !isBranch },
      ...(isBranch ? { routeIn: `Learners who do not pass ${src?.name ?? 'the stage before'}`, exitTo: null, branchFrom: src?.id } : {}),
    };
    landed.current = id;
    const moved = at < all.length;
    change(isBranch ? `Remedial branch added on pedestal ${at + 1}` : `New ${STAGE_TYPES[type].label} stage on pedestal ${at + 1}`,
      moved ? 'Placed before the reward, which moves to the end of the line.' : `${PRODUCT_KINDS[product.kind].label}: ${product.name}.`,
      (l) => { const next = [...l]; next.splice(at, 0, st); return next; });
    store.set((s) => ({ ...s, selected: id }));
  };
  const addTo = (stageId: string, kind: ProductKind, lib?: { name: string; meta: string }) => {
    const st = store.get().stages.find((s) => s.id === stageId);
    if (!st) return;
    const p = makeProduct(kind, lib);
    change(`Added to ${st.name}`, `${PRODUCT_KINDS[kind].label}: ${p.name}. Learners now do both.`, (l) => l.map((s) => (s.id === stageId ? { ...s, products: [...s.products, p] } : s)));
    flash(p.id);
    const el = stageEls.current.get(stageId);
    if (el && !reduced()) {
      const r = el.getBoundingClientRect();
      sparks(r.left, r.top);
      const b = document.createElement('span');
      b.className = 'bn-added';
      b.textContent = 'Added';
      b.style.left = `${r.left}px`;
      b.style.top = `${r.top - 70}px`;
      b.style.position = 'fixed';
      b.style.zIndex = '110';
      document.body.appendChild(b);
      gsap.fromTo(b, { y: 10, opacity: 0 }, { y: -18, opacity: 1, duration: 0.5, ease: 'back.out(2)', onComplete: () => gsap.to(b, { opacity: 0, y: -30, duration: 0.5, delay: 0.7, onComplete: () => b.remove() }) });
    }
  };
  const moveTo = (stageId: string, index: number) => {
    const all = store.get().stages;
    const from = all.findIndex((s) => s.id === stageId);
    if (from < 0 || from === index) return;
    const st = all[from]!;
    change(`Moved ${st.name} to pedestal ${index + 1}`, 'The others slid along the line.', (l) => { const next = [...l]; next.splice(from, 1); next.splice(index, 0, st); return next; });
  };
  const remove = (id: string) => {
    const st = stages.find((s) => s.id === id);
    if (!st) return;
    closeInspector();
    change(`Deleted ${st.name}`, 'The stages after it moved down the line.', (l) => l.filter((s) => s.id !== id).map((s) => (s.exitTo === id ? { ...s, exitTo: null } : s)));
  };
  const duplicate = (id: string) => {
    const all = store.get().stages;
    const i = all.findIndex((s) => s.id === id);
    const src = all[i];
    if (!src) return;
    if (all.length >= 9) { toast({ tone: 'alert', title: 'The line is full', body: 'Nine stages fit on the path.' }); return; }
    const copy: BStage = { ...src, id: uid(), name: `${src.name} (copy)`, gate: src.gate.map((c) => ({ ...c, id: uid() })), products: src.products.map((p) => ({ ...p, id: uid() })) };
    landed.current = copy.id;
    change(`Duplicated ${src.name}`, `On pedestal ${i + 2}.`, (l) => { const next = [...l]; next.splice(i + 1, 0, copy); return next; });
    store.set((s) => ({ ...s, selected: copy.id }));
  };

  // ── drag and drop: lift the object, light the valid pedestals, ring the nearest, drop with a bounce ──
  const targetsFor = (d: Drag): Target[] => {
    const all = store.get().stages;
    if (locked) return [];
    if (d.kind === 'content') return [...all.slice(0, 9).map((_, i) => ({ slot: SLOTS[i]!, index: i, act: 'add' as const })), ...(all.length < 9 ? [{ slot: SLOTS[all.length]!, index: all.length, act: 'new' as const }] : [])];
    const from = all.findIndex((s) => s.id === d.stageId);
    return all.slice(0, 9).map((_, i) => ({ slot: SLOTS[i]!, index: i, act: 'move' as const })).filter((t) => t.index !== from);
  };
  const startDrag = (e: RPointerEvent, d: Drag) => {
    if (e.button !== 0 || locked || !view) return;
    const src = e.currentTarget as HTMLElement;
    const st = { on: false, hot: null as Target | null, ghost: null as HTMLElement | null, sx: e.clientX, sy: e.clientY };
    const valid = targetsFor(d);
    const move = (ev: PointerEvent) => {
      const a = api.current;
      if (!a) return;
      if (!st.on) {
        if (Math.hypot(ev.clientX - st.sx, ev.clientY - st.sy) < 6) return;
        st.on = true;
        root.current?.classList.add('bn-dragging');
        valid.forEach((t) => { slotEls.current.get(t.slot)?.classList.add('is-target'); const s = store.get().stages[t.index]; if (s && t.act === 'add') stageEls.current.get(s.id)?.classList.add('is-drop'); });
        if (d.kind === 'stage') stageEls.current.get(d.stageId)?.classList.add('is-lifted');
        const g = document.createElement('div');
        g.className = 'bn-ghost';
        const obj = src.querySelector('.bn-obj')?.cloneNode(true) as HTMLElement | null;
        if (obj) g.appendChild(obj);
        const label = document.createElement('span');
        label.className = 'bn-ghost__label';
        label.textContent = d.kind === 'stage' ? `Move ${store.get().stages.find((s) => s.id === d.stageId)?.name ?? 'stage'}` : PRODUCT_KINDS[d.product].label;
        g.appendChild(label);
        document.body.appendChild(g);
        st.ghost = g;
        if (!reduced()) gsap.fromTo(g, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2)' });
      }
      let best: Target | null = null;
      let bd = 105;
      const p = { x: 0, y: 0 };
      valid.forEach((t) => { const s = view.slots[t.slot]; a.toScreen(s.cx, s.cy, p); const dd = Math.hypot(ev.clientX - p.x, ev.clientY - p.y); if (dd < bd) { bd = dd; best = t; } });
      const hot = best as Target | null;
      if (hot?.slot !== st.hot?.slot) {
        if (st.hot) { slotEls.current.get(st.hot.slot)?.classList.remove('is-hot'); stageEls.current.forEach((el) => el.classList.remove('is-hot')); }
        st.hot = hot;
        if (hot) {
          slotEls.current.get(hot.slot)?.classList.add('is-hot');
          const occ = store.get().stages[hot.index];
          if (occ && hot.act === 'add') stageEls.current.get(occ.id)?.classList.add('is-hot');
        }
      }
      let gx = ev.clientX, gy = ev.clientY - 30;
      if (hot) { const s = view.slots[hot.slot]; a.toScreen(s.cx, s.cy, p); gx += (p.x - gx) * 0.5; gy += (p.y - 40 - gy) * 0.5; }
      if (st.ghost) st.ghost.style.transform = `translate3d(${gx}px, ${gy}px, 0) translate(-50%, -50%)`;
    };
    const finish = (cancel: boolean) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', esc, true);
      if (!st.on) return;
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 80);
      root.current?.classList.remove('bn-dragging');
      slotEls.current.forEach((el) => el.classList.remove('is-target', 'is-hot'));
      stageEls.current.forEach((el) => el.classList.remove('is-drop', 'is-hot', 'is-lifted'));
      const hot = cancel ? null : st.hot;
      const g = st.ghost;
      if (g) {
        if (hot && api.current) {
          const s = view.slots[hot.slot];
          const p = api.current.toScreen(s.cx, s.cy, { x: 0, y: 0 });
          gsap.to(g, { x: 0, y: 0, opacity: 0, scale: 0.6, duration: reduced() ? 0 : 0.22, ease: 'power2.in', onComplete: () => g.remove() });
          g.style.transform = `translate3d(${p.x}px, ${p.y - 40}px, 0) translate(-50%, -50%)`;
        } else {
          const r = src.getBoundingClientRect();
          g.style.transition = 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s';
          g.style.transform = `translate3d(${r.left + r.width / 2}px, ${r.top + r.height / 2}px, 0) translate(-50%, -50%) scale(0.7)`;
          g.style.opacity = '0';
          window.setTimeout(() => g.remove(), 380);
        }
      }
      if (!hot) return;
      if (d.kind === 'stage') moveTo(d.stageId, hot.index);
      else if (hot.act === 'new') addStage(d.product);
      else { const occ = store.get().stages[hot.index]; if (occ) addTo(occ.id, d.product); }
    };
    const up = () => finish(false);
    const esc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { ev.stopPropagation(); finish(true); } };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', esc, true);
  };

  // a click on a dock item adds it to the open stage, or starts a new stage at the end of the line
  const dockAdd = (kind: ProductKind) => {
    if (suppressClick.current || locked) return;
    if (insp && sel) addTo(sel.id, kind);
    else addStage(kind);
  };

  // ── problems and their fixes ──
  const fix = (p: Problem) => {
    const st = stages.find((s) => s.id === p.stageId);
    if (!st) return;
    switch (p.fix.kind) {
      case 'draft': setSheet({ kind: 'import', stageId: st.id }); break;
      case 'content': setSheet({ kind: 'content', stageId: st.id }); break;
      case 'placement': {
        const id = uid();
        change('Rule added: place 4th or better to move on', 'Everyone else goes to the remedial branch.', (l) => l.map((s) => (s.id === st.id ? { ...s, gate: [...s.gate, { id, kind: 'placement', value: 4 }] } : s)));
        flash(id);
        break;
      }
      case 'exit': {
        const i = stages.indexOf(st);
        const src = [...stages.slice(0, i)].reverse().find((s) => s.type !== 'branch');
        change(`${st.name} now returns to ${src?.name ?? 'the stage before'}`, 'At most 3 loops; on the third, a coach checks in.', (l) => l.map((s) => (s.id === st.id ? { ...s, exitTo: src?.id ?? null } : s)));
        break;
      }
      case 'gate': {
        const kind = st.type === 'assess' ? 'score' : st.type === 'compete' ? 'battle' : st.type === 'learn' ? 'completion' : 'score';
        const id = uid();
        change('Rule added', undefined, (l) => l.map((s) => (s.id === st.id ? { ...s, gate: [...s.gate, { id, kind, value: CLAUSES[kind].def }] } : s)));
        flash(id);
        break;
      }
    }
  };

  // ── the one primary action walks the flow ──
  const submit = () => {
    setProbsOpen(false);
    store.set((s) => ({ ...s, status: 'review', dirty: false, saved: 'Saved just now' }));
    revealTo(1.06, 1.3);
    pulseGate(1.25);
    addToQueue({
      id: 'mine-journey', kind: 'journey', title: BUILDER_JOURNEY.name, what: `Journey · ${stages.length} stages`, author: ADMIN.name, mine: true, isNew: true,
      age: 'Just now', change: 'New journey for Product Managers.', audience: BUILDER_JOURNEY.audience,
      checks: ['Journey check passed', 'Every stage has content', 'The remedial branch has an exit'],
      preview: [{ label: 'Stages', value: stages.map((s) => STAGE_TYPES[s.type].label).join(' · ') }],
    });
    window.setTimeout(() => toast({ tone: 'done', title: 'Sent to the review queue', body: `${APPROVER.name} approves it. Nobody approves their own work.`, action: { label: 'See the queue', run: () => go('admin/dashboard') } }), reduced() ? 0 : 1300);
    window.clearTimeout(approvalTimer);
    approvalTimer = window.setTimeout(() => {
      if (store.get().status !== 'review') return;
      removeFromQueue('mine-journey');
      store.set((s) => ({ ...s, status: 'approved' }));
      toast({ tone: 'done', title: `${APPROVER.name} approved ${BUILDER_JOURNEY.name}`, body: 'Publish it to make it live for learners.' });
    }, 7000);
  };
  const publish = () => {
    store.set((s) => ({ ...s, status: 'published', dirty: false }));
    pulseGate(0);
    toast({ tone: 'done', title: `Published: ${BUILDER_JOURNEY.name}`, body: 'Live now for 64 Product Managers.' });
    if (!reduced()) gsap.fromTo(root.current!.querySelectorAll('.bn-obj'), { boxShadow: '0 0 0 0 rgba(70,211,139,0)' }, { boxShadow: '0 0 0 4px rgba(70,211,139,0.75), 0 0 40px rgba(70,211,139,0.5)', duration: 0.4, stagger: 0.08, yoyo: true, repeat: 1, clearProps: 'boxShadow', delay: 0.4 });
  };
  const reopen = () => {
    store.set((s) => ({ ...s, status: 'draft', saved: 'Version 2 · draft' }));
    toast({ tone: 'info', title: 'New draft started', body: 'Learners keep the published version until this one is approved.' });
  };
  /** the gate (just past the top-right corner of this view) ignites */
  const pulseGate = (delay: number) => {
    const a = api.current;
    if (!a || !view || reduced()) return;
    const g = a.toScreen(view.gate.x, view.gate.y, { x: 0, y: 0 });
    const { w } = a.size();
    const f = document.createElement('span');
    f.className = 'bn-flare';
    f.style.left = `${Math.min(w - 90, Math.max(90, g.x))}px`;
    f.style.top = `${Math.max(90, g.y)}px`;
    root.current?.appendChild(f);
    gsap.timeline({ delay, onComplete: () => f.remove() })
      .fromTo(f, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' })
      .to(f, { scale: 1.5, opacity: 0, duration: 0.9, ease: 'power2.in' });
  };

  // keyboard: Esc closes, arrows walk the line, Ctrl+Z undoes
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest('input, textarea, [role="dialog"], [role="menu"]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const prev = history.pop();
        if (prev) { e.preventDefault(); restore(prev); toast({ tone: 'info', title: 'Undone' }); }
        return;
      }
      if (e.key === 'Escape') { if (probsOpen) setProbsOpen(false); else if (insp) closeInspector(); return; }
      if (insp && sel && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const i = stages.indexOf(sel) + (e.key === 'ArrowRight' ? 1 : -1);
        const nx = stages[i];
        if (nx) { e.preventDefault(); openStage(nx.id); }
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const statusWord = { draft: 'Draft', review: 'In review', approved: 'Approved', published: 'Live for learners' }[status];
  const savedText = saved.charAt(0).toLowerCase() + saved.slice(1);
  let primary;
  if (status === 'draft') {
    primary = problems.length
      ? <Btn kind="primary" icon={<CircleAlert />} onClick={() => setProbsOpen((o) => !o)} aria-expanded={probsOpen} aria-haspopup="true">Fix {problems.length} problem{problems.length === 1 ? '' : 's'}</Btn>
      : <Btn kind="primary" icon={<Send />} onClick={submit} className="is-ready">Submit for review</Btn>;
  } else if (status === 'review') {
    primary = <Btn kind="primary" blocked className="is-wait" icon={<LoaderCircle className="spin" />}>Waiting for {APPROVER.name.split(' ')[0]}’s approval</Btn>;
  } else if (status === 'approved') {
    primary = <Btn kind="primary" icon={<Rocket />} onClick={publish}>Publish</Btn>;
  } else {
    primary = <Btn kind="glass" icon={<PenLine />} onClick={reopen}>Make changes</Btn>;
  }

  const pulse = useMemo(() => {
    if (!view || !n) return null;
    const s = view.slots[SLOTS[Math.min(n, 9) - 1]!];
    return { from: 0, to: status === 'draft' ? nearestIndex(view.path, s.cx, s.cy) : view.path.length - 1 };
  }, [view, n, status]);
  const selProbs = sel ? problems.filter((p) => p.stageId === sel.id) : [];

  return (
    <div ref={root} className={cx('page bn', insp && 'has-insp')}>
      <div onClick={(e) => { if (suppressClick.current || (e.target as HTMLElement).closest('button')) return; if (insp) closeInspector(); }}>
        {view && (
          <Stage25 view={view} apiRef={api} pulse={pulse} className="is-admin">
            {SLOTS.map((id, i) => (
              <div key={id} ref={(el) => { if (el) slotEls.current.set(id, el); else slotEls.current.delete(id); }} className="bn-slot" aria-hidden={i !== n}>
                <span className="bn-slot__ring" />
                {i === n && !locked && (
                  <div className="bn-invite">
                    <Menu label="Add a stage" items={[
                      ...KINDS.map((k) => { const I = KIND_ICON[k]; return { label: PRODUCT_KINDS[k].label, hint: `${STAGE_TYPES[TYPE_FOR[k]].label} stage · ${PRODUCT_KINDS[k].what.toLowerCase()}`, icon: <I />, onSelect: () => addStage(k) }; }),
                      { label: 'Remedial branch', hint: 'Only if needed: a refresher, then a retry (max 3 loops)', icon: <GitBranch />, onSelect: () => addStage('branch') },
                    ]}>
                      {({ toggle, open, id: mid }) => (
                        <button type="button" className="bn-invite__btn" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? mid : undefined} onClick={toggle}>
                          <span className="bn-invite__plus"><Plus size={15} /></span> Add stage {i + 1}
                        </button>
                      )}
                    </Menu>
                  </div>
                )}
              </div>
            ))}
            {stages.slice(0, 9).map((st, i) => {
              const probs = problems.filter((p) => p.stageId === st.id);
              const isSel = insp && sel?.id === st.id;
              return (
                <div key={st.id} ref={(el) => { if (el) stageEls.current.set(st.id, el); else stageEls.current.delete(st.id); }} className={cx('bn-stage', isSel && 'is-sel', st.type === 'branch' && 'is-branch')}>
                  <div className="bn-stage__fly">
                    <button
                      type="button" className="bn-stage__btn" aria-pressed={isSel}
                      aria-label={`Stage ${i + 1}, ${st.name}, ${STAGE_TYPES[st.type].label}${st.type === 'branch' ? ', only if needed' : ''}${probs.length ? `, ${probs.length} problem${probs.length === 1 ? '' : 's'}: ${probs.map((p) => p.short).join(', ')}` : ''}. Drag to move it along the line.`}
                      title={probs.length ? probs.map((p) => p.title).join('\n') : undefined}
                      onPointerDown={(e) => startDrag(e, { kind: 'stage', stageId: st.id })}
                      onClick={() => { if (!suppressClick.current) openStage(st.id); }}
                    >
                      <StageObject type={st.type} kind={st.products[0]?.kind} objs={objs} dot={probs.length > 0} />
                    </button>
                    <span className="bn-name">{st.name}{st.type === 'branch' && <small>only if needed</small>}</span>
                  </div>
                </div>
              );
            })}
          </Stage25>
        )}
      </div>
      <div className="bn-shade" aria-hidden />

      <header className="bn-head">
        <div>
          <p className="eyebrow">Pathway builder</p>
          <h1 ref={title} className="bn-title">{BUILDER_JOURNEY.name}</h1>
          <p className={cx('bn-status', status === 'review' && 'is-review', status === 'published' && 'is-live')}><span className="bn-status__dot" />{statusWord} · {savedText}</p>
        </div>
        <div className="bn-actions">
          <Btn kind="ghost" icon={<Eye />} onClick={() => setSheet({ kind: 'preview', stageId: sel?.id ?? '' })}>Preview as learner</Btn>
          {primary}
          {probsOpen && problems.length > 0 && (
            <div className="bn-probs glass" role="dialog" aria-label="Problems to fix">
              <p className="bn-probs__title">Fix these to submit. Pick one to go to it.</p>
              {problems.map((p) => (
                <button key={p.id} type="button" className="bn-prob" onClick={() => openStage(p.stageId, { fly: true })}>
                  <span className="bn-prob__dot" />
                  <span className="bn-prob__text"><strong>{p.title}</strong><span>{p.why}</span></span>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <nav className="bn-dock glass" aria-label="Content to add">
        <div className="bn-dock__cap"><strong>Add content</strong><span>Drag onto the line, or click to add.</span></div>
        {KINDS.map((k) => (
          <button key={k} type="button" className="bn-item" disabled={locked}
            onPointerDown={(e) => startDrag(e, { kind: 'content', product: k })}
            onClick={() => dockAdd(k)}
            aria-label={`${PRODUCT_KINDS[k].label}: ${insp && sel ? `add to ${sel.name}` : 'add as a new stage'}, or drag onto the line`}>
            <StageObject type={TYPE_FOR[k]} kind={k} objs={objs} />
            <span className="bn-item__label">{PRODUCT_KINDS[k].label}</span>
          </button>
        ))}
        <span className="bn-dock__sep" aria-hidden />
        <button type="button" className="bn-lib" onClick={() => setLibOpen(true)}>
          <span className="bn-lib__icon"><Library size={24} /></span>
          <span className="bn-item__label">Library</span>
        </button>
      </nav>

      {insp && sel && (
        <Editor
          key={sel.id}
          className="bn-editor"
          stage={sel}
          n={stages.indexOf(sel) + 1}
          total={stages.length}
          stages={stages}
          problems={selProbs}
          locked={locked}
          flashId={flashId}
          onSheet={(k) => setSheet({ kind: k, stageId: sel.id })}
          onFix={fix}
          onMove={(d) => moveTo(sel.id, Math.max(0, Math.min(stages.length - 1, stages.indexOf(sel) + d)))}
          onDuplicate={() => duplicate(sel.id)}
          onRemove={() => remove(sel.id)}
          onFlash={flash}
          head={<button type="button" className="icon-btn bn-close" aria-label="Close the stage panel" onClick={closeInspector}><X size={17} /></button>}
          top={selProbs.length > 0 && (
            <div className="bn-fixes">
              {selProbs.map((p) => (
                <div key={p.id} className="bn-fix">
                  <span className="bn-prob__dot" aria-hidden />
                  <div className="bn-fix__text">
                    <strong>{p.title}</strong>
                    <span>{p.why}</span>
                    {!locked && <Btn kind="glass" size="sm" icon={p.fix.kind === 'draft' ? <FileUp /> : <Sparkles />} onClick={() => fix(p)}>{p.fix.label}</Btn>}
                  </div>
                </div>
              ))}
            </div>
          )}
        />
      )}

      <LibrarySheet
        open={libOpen}
        target={insp && sel ? sel : null}
        locked={locked}
        onClose={() => setLibOpen(false)}
        onAdd={(kind, item, asNew) => { setLibOpen(false); if (asNew || !(insp && sel)) addStage(kind, item); else addTo(sel.id, kind, item); }}
        onDraft={() => {
          setLibOpen(false);
          const target = (insp && sel) ? sel : stages.find((s) => s.products.some((p) => p.kind === 'assessment' && p.status === 'empty')) ?? stages.find((s) => s.type === 'assess');
          if (target) setSheet({ kind: 'import', stageId: target.id });
        }}
      />
      <ContentSheet
        open={sheet?.kind === 'content'}
        stage={stages.find((s) => s.id === sheet?.stageId) ?? stages[0]!}
        onClose={() => setSheet(null)}
        onAdd={(p: BProduct) => {
          const sid = sheet?.stageId ?? '';
          setSheet(null);
          change(`Added ${p.name}`, `${PRODUCT_KINDS[p.kind].label} in ${stages.find((s) => s.id === sid)?.name ?? 'this stage'}.`, (l) => l.map((s) => (s.id === sid ? { ...s, products: [...s.products, p] } : s)));
          flash(p.id);
        }}
      />
      <ImportSheet
        open={sheet?.kind === 'import'}
        stage={stages.find((s) => s.id === sheet?.stageId) ?? stages[0]!}
        onClose={() => setSheet(null)}
        onSent={(items: QItem[]) => {
          const sid = sheet?.stageId ?? '';
          const st = stages.find((s) => s.id === sid);
          setSheet(null);
          store.set((s) => ({ ...s, items, itemsStatus: 'review' }));
          updateStage(sid, (s) => {
            const has = s.products.some((p) => p.kind === 'assessment');
            const meta = `${items.length} questions in review`;
            return { ...s, products: has ? s.products.map((p) => (p.kind === 'assessment' ? { ...p, status: 'review', meta } : p)) : [...s.products, { id: uid(), kind: 'assessment', name: `${s.name} check`, meta, status: 'review' }] };
          });
          autosave();
          addToQueue({
            id: `mine-items-${Date.now()}`, kind: 'items', title: st?.name ?? 'Knowledge Check', what: `Assessment · ${items.length} questions`, author: ADMIN.name, mine: true, isNew: true,
            age: 'Just now', change: `Drafted with AI from “Product Strategy Playbook.pdf”${items.some((i) => i.edited) ? ', then edited by you' : ''}.`,
            audience: `Used in ${BUILDER_JOURNEY.name}, stage ${st ? stages.indexOf(st) + 1 : 2}`,
            checks: ['Every answer is cited to a page of the source', `${items.filter((i) => i.edited).length} edited by you`],
            preview: [{ label: 'Sample question', value: items[0]?.q ?? '' }],
          });
          toast({ tone: 'done', title: `${items.length} questions sent to the review queue`, body: `${APPROVER.name} approves them before any learner sees them.`, action: { label: 'See the queue', run: () => go('admin/dashboard') } });
        }}
      />
      <PreviewSheet open={sheet?.kind === 'preview'} stages={stages} onClose={() => setSheet(null)} />
    </div>
  );
}

/** The thing that stands on a pedestal: the realistic object when the set has landed, else a carved tile. */
function StageObject({ type, kind, objs, dot }: { type: StageType; kind?: ProductKind; objs: ObjectSet | null; dot?: boolean }) {
  if (objs) {
    return (
      <span className="bn-obj has-3d" style={{ '--rx': 'calc(var(--obj) * 0.8)' } as CSSProperties}>
        <ObjectSprite entry={objs[objectKeyFor(type, kind)]} file="admin_lit" />
        {dot && <span className="bn-dot" aria-hidden />}
      </span>
    );
  }
  const I = kind && (kind === 'tournament' || kind === 'live') ? KIND_ICON[kind] : TYPE_ICON[type];
  return <span className="bn-obj"><I strokeWidth={2} />{dot && <span className="bn-dot" aria-hidden />}</span>;
}

/** A few sparks burst from where something landed. */
function sparks(x: number, y: number) {
  if (reduced()) return;
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('span');
    s.className = 'bn-spark';
    document.body.appendChild(s);
    const a = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
    const d = 30 + Math.random() * 46;
    gsap.fromTo(s, { x, y, scale: 1, opacity: 1 }, { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7 - 18, scale: 0.2, opacity: 0, duration: 0.7 + Math.random() * 0.3, ease: 'power2.out', onComplete: () => s.remove() });
  }
}

// ── Northwind's library, and drafting from a document ──────────────────────
function LibrarySheet({ open, target, locked, onClose, onAdd, onDraft }: {
  open: boolean; target: BStage | null; locked: boolean; onClose: () => void;
  onAdd: (kind: ProductKind, item: { name: string; meta: string }, asNew: boolean) => void; onDraft: () => void;
}) {
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);
  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());
  return (
    <Sheet open={open} onClose={onClose} label="Northwind’s library" width={860}>
      <div className="sh-head">
        <p className="eyebrow">Library</p>
        <h2 className="sh-title">Northwind’s library</h2>
        <p className="sh-sub">{target ? `Add to ${target.name}, or start a new stage with it.` : 'Pick something to start a new stage with it.'}</p>
      </div>
      <div className="sh-body">
        <div className="bnlib__doc">
          <FileUp size={26} />
          <p><strong>Draft questions from a document</strong><span>Upload a PDF, Word or PowerPoint file. AI drafts the questions, you review and edit them, then send them for approval.</span></p>
          <Btn kind="glass" icon={<Sparkles />} onClick={onDraft} disabled={locked}>Draft from a document</Btn>
        </div>
        <label className="search" style={{ maxWidth: 'none' }}>
          <Search size={16} aria-hidden />
          <input className="input" data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses, assessments, arenas, cups" aria-label="Search the library" />
        </label>
        {KINDS.map((k) => {
          const items = LIBRARY[k].filter((x) => match(x.name) || match(x.meta) || match(PRODUCT_KINDS[k].label));
          if (!items.length) return null;
          const I = KIND_ICON[k];
          return (
            <div key={k} className="bnlib__group">
              <p className="bnlib__h">{PRODUCT_KINDS[k].label}</p>
              {items.slice(0, 6).map((x) => (
                <div key={x.name} className="bnlib__row">
                  <span className="bnlib__icon"><I size={19} /></span>
                  <span className="bnlib__text"><strong>{x.name}</strong><span>{x.meta}</span></span>
                  <span className="bnlib__acts">
                    {target && <Btn kind="glass" size="sm" disabled={locked} onClick={() => onAdd(k, x, false)}>Add to {target.name}</Btn>}
                    <Btn kind={target ? 'ghost' : 'glass'} size="sm" disabled={locked} onClick={() => onAdd(k, x, true)}>New stage</Btn>
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
