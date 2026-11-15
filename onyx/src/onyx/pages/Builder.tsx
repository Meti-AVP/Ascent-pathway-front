import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { CircleAlert, CircleCheck, Check, Eye, FileUp, GitBranch, Hand, LoaderCircle, PenLine, Plus, Rocket, Save, Search, Send, Sparkles } from 'lucide-react';
import { gsap, useGSAP, splitReveal, rise, reduced } from '../motion';
import { Btn, Chip, KIND_ICON, TYPE_ICON, cx } from '../ui';
import {
  ADMIN, APPROVER, BUILDER_JOURNEY, CLAUSES, LIBRARY, PRODUCT_KINDS, STAGE_TYPES,
  type BProduct, type BStage, type Clause, type ProductKind, type QItem, type StageType,
} from '../data';
import { addToQueue, lint, removeFromQueue, selectStage, store, toast, updateStage, useApp, type Problem } from '../store';
import { go } from '../router';
import { Stage25, type StageApi } from '../world/Stage25';
import { MAIN_SLOTS, loadWorld, type SlotId, type WorldView } from '../world/scene';
import { ContentSheet, ImportSheet, PreviewSheet } from './BuilderSheets';
import { Editor, uid, type SheetKind } from './BuilderEditor';
import './builder.css';

// ── rules of the board ─────────────────────────────────────────────────────
const TYPE_FOR: Record<ProductKind, StageType> = { course: 'learn', assessment: 'assess', arena: 'compete', tournament: 'prove', live: 'learn', reward: 'reward' };
const NEW_NAME: Record<ProductKind, string> = { course: 'New course', assessment: 'New assessment', arena: 'New arena stage', tournament: 'New tournament', live: 'New live session', reward: 'New reward' };
const slotNo = (s: string) => (s === 'slot_branch' ? 99 : Number(s.replace('slot_', '')));
const defaultGate = (type: StageType, kind: ProductKind): Clause[] => {
  if (type === 'learn') return [{ id: uid(), kind: 'completion', value: 100 }];
  if (type === 'assess') return [{ id: uid(), kind: 'score', value: 80 }];
  if (type === 'compete') return [{ id: uid(), kind: 'battle', value: 1 }];
  if (type === 'prove' && kind !== 'tournament') return [{ id: uid(), kind: 'score', value: 80 }];
  return [];
};
/** Journey order = the pedestals from the foot of the path to the gate; a branch follows its source. */
function ordered(list: BStage[]): BStage[] {
  const mains = list.filter((s) => s.type !== 'branch').sort((a, b) => slotNo(a.slot) - slotNo(b.slot));
  const branches = list.filter((s) => s.type === 'branch');
  const out: BStage[] = [];
  mains.forEach((m) => { out.push(m); branches.filter((b) => b.branchFrom === m.id).forEach((b) => out.push(b)); });
  branches.filter((b) => !out.includes(b)).forEach((b) => out.push(b));
  return out;
}

type DragItem =
  | { kind: 'new'; product: ProductKind }
  | { kind: 'lib'; product: ProductKind; name: string; meta: string }
  | { kind: 'stage'; stageId: string };

// The approval arrives a few seconds after submitting, wherever Sara is in the app.
let approvalTimer = 0;
const history: BStage[][] = [];

export function Builder() {
  const stages = useApp((s) => s.stages);
  const selected = useApp((s) => s.selected);
  const status = useApp((s) => s.status);
  const saved = useApp((s) => s.saved);
  const dirty = useApp((s) => s.dirty);
  const problems = useMemo(() => lint(stages), [stages]);
  const [view, setView] = useState<WorldView | null>(null);
  const [sheet, setSheet] = useState<{ kind: SheetKind; stageId: string } | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [checkOpen, setCheckOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const api = useRef<StageApi>(null);
  const markers = useRef(new Map<SlotId, HTMLElement>());
  const chipEls = useRef(new Map<string, HTMLElement>());
  const wires = useRef<SVGSVGElement>(null);
  const pop = useRef<{ id: string; from?: { x: number; y: number } } | null>(null);
  const sel = stages.find((s) => s.id === selected) ?? stages[0]!;
  const locked = status !== 'draft';
  const bySlot = useMemo(() => new Map(stages.map((s) => [s.slot as SlotId, s])), [stages]);

  useEffect(() => { let alive = true; loadWorld('admin').then((v) => { if (alive) setView(v); }); return () => { alive = false; }; }, []);

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    splitReveal(title.current, { by: 'words', stagger: 0.08, delay: 0.1 });
    if (reduced()) return;
    rise(q('.bh__eyebrow, .bh__status, .bh__actions'), { delay: 0.2, stagger: 0.07 });
    rise(q('.lib, .check, .editor'), { delay: 0.35, stagger: 0.1, y: 36 });
  }, { scope: root });

  // ── the camera frames the whole path in the space between the panels ──
  const fit = (duration = 1.4) => {
    const a = api.current;
    if (!a || !view) return;
    const { w, h } = a.size();
    const xs = Object.values(view.slots).flatMap((s) => [s.cx - s.rx * 2, s.cx + s.rx * 2]).concat(view.gate.x);
    const ys = Object.values(view.slots).flatMap((s) => [s.cy - s.ry * 6, s.cy + s.ry * 3]).concat(view.gate.y);
    const libRight = Math.min(320, Math.max(268, w * 0.2)) + Math.max(32, Math.min(88, w * 0.044)) + 36;
    const edLeft = w - (Math.min(430, Math.max(360, w * 0.26)) + Math.max(32, Math.min(88, w * 0.044)) + 36);
    a.fit({ x0: Math.min(...xs) - 0.03, y0: Math.min(...ys) - 0.04, x1: Math.max(...xs) + 0.03, y1: Math.max(...ys) + 0.03 }, { left: libRight, top: 200, right: edLeft, bottom: h - 70 }, { maxZ: 1.3, minZ: 0.5, duration });
  };
  useLayoutEffect(() => {
    if (!view) return;
    fit(0);
    const on = () => fit(0.6);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // ── place slots, chips and the branch wires on every camera/parallax change ──
  const placeAll = () => {
    const a = api.current;
    if (!a || !view) return;
    const { w: FW, h: FH } = a.frameSize();
    const p = { x: 0, y: 0 };
    // zoom is implied by the distance between two projected points
    const z = (a.toScreen(1, 0).x - a.toScreen(0, 0).x) / FW;
    markers.current.forEach((el, id) => {
      const s = view.slots[id];
      if (!s) return;
      a.toScreen(s.cx, s.cy, p);
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      const ring = el.firstElementChild as HTMLElement | null;
      if (ring) { ring.style.width = `${(s.rx * FW * z * 2.3).toFixed(1)}px`; ring.style.height = `${(s.ry * FH * z * 2.3).toFixed(1)}px`; }
    });
    chipEls.current.forEach((el, id) => {
      const st = store.get().stages.find((x) => x.id === id);
      if (!st) return;
      const s = view.slots[st.slot as SlotId];
      if (!s) return;
      a.toScreen(s.cx, s.cy, p);
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      el.style.zIndex = String(Math.round(s.cy * 100) + 10);
    });
    const svg = wires.current;
    if (svg) {
      const all = store.get().stages;
      const parts: string[] = [];
      all.filter((b) => b.type === 'branch').forEach((b) => {
        const src = all.find((x) => x.id === b.branchFrom);
        const ledge = view.slots.slot_branch;
        if (!ledge) return;
        const L = a.toScreen(ledge.cx, ledge.cy, { x: 0, y: 0 });
        const from = src && view.slots[src.slot as SlotId];
        if (from) {
          const S = a.toScreen(from.cx, from.cy, { x: 0, y: 0 });
          parts.push(`<path class="w-out" d="M${S.x},${S.y} Q${(S.x + L.x) / 2},${Math.min(S.y, L.y) - 50} ${L.x},${L.y}"/>`);
        }
        const ex = all.find((x) => x.id === b.exitTo);
        const to = ex && view.slots[ex.slot as SlotId];
        if (to) {
          const E = a.toScreen(to.cx, to.cy, { x: 0, y: 0 });
          parts.push(`<path class="w-back" d="M${L.x},${L.y + 6} Q${(E.x + L.x) / 2},${Math.max(E.y, L.y) + 50} ${E.x},${E.y + 6}"/>`);
        } else {
          parts.push(`<path class="w-missing" d="M${L.x},${L.y} l${-40},${30}"/>`);
        }
      });
      svg.innerHTML = parts.join('');
    }
  };
  useEffect(() => {
    if (!view || !api.current) return;
    const off = api.current.subscribe(placeAll);
    placeAll();
    return () => { off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);
  useLayoutEffect(() => {
    placeAll();
    // a chip that just landed pops into place
    const p = pop.current;
    if (p && !reduced()) {
      const el = chipEls.current.get(p.id)?.querySelector('.sc__fly');
      if (el) {
        if (p.from) {
          const host = chipEls.current.get(p.id)!.getBoundingClientRect();
          gsap.fromTo(el, { x: p.from.x - host.left, y: p.from.y - host.top }, { x: 0, y: 0, duration: 0.7, ease: 'onyx' });
        } else gsap.fromTo(el, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(2)' });
      }
    }
    pop.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages]);
  const regMarker = (id: SlotId) => (el: HTMLElement | null) => { if (el) { markers.current.set(id, el); } else markers.current.delete(id); };
  const regChip = (id: string) => (el: HTMLElement | null) => { if (el) { chipEls.current.set(id, el); } else chipEls.current.delete(id); };

  // ── changes, with undo ──
  const flash = (id: string) => { setFlashId(id); window.setTimeout(() => setFlashId(null), 1800); };
  const restore = (snap: BStage[]) => store.set((s) => ({ ...s, stages: snap, dirty: true }));
  const change = (label: string, body: string | undefined, fn: (all: BStage[]) => BStage[]) => {
    const prev = store.get().stages;
    history.push(prev);
    if (history.length > 40) history.shift();
    store.set((s) => ({ ...s, stages: ordered(fn(s.stages)), dirty: true }));
    toast({ tone: 'done', title: label, body, action: { label: 'Undo', run: () => restore(prev) } });
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !(e.target as HTMLElement).closest('input, textarea')) {
        const prev = history.pop();
        if (prev) { e.preventDefault(); restore(prev); toast({ tone: 'info', title: 'Undone' }); }
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const makeProduct = (it: Exclude<DragItem, { kind: 'stage' }>): BProduct => it.kind === 'lib'
    ? { id: uid(), kind: it.product, name: it.name, meta: it.product === 'arena' ? 'Battle Arena' : it.meta, status: 'ready' }
    : { id: uid(), kind: it.product, name: NEW_NAME[it.product].replace('New ', 'New '), meta: it.product === 'assessment' ? 'No questions yet' : 'New · add the details', status: it.product === 'assessment' ? 'empty' : 'ready' };

  const commit = (it: DragItem, target: SlotId, from?: { x: number; y: number }) => {
    const all = store.get().stages;
    const there = all.find((s) => s.slot === target);
    if (it.kind === 'stage') {
      const moving = all.find((s) => s.id === it.stageId);
      if (!moving || moving.slot === target) return;
      pop.current = { id: moving.id, from };
      if (there) {
        change(`Swapped ${moving.name} and ${there.name}`, 'The journey order follows the path.', (l) => l.map((s) => (s.id === moving.id ? { ...s, slot: target } : s.id === there.id ? { ...s, slot: moving.slot } : s)));
      } else {
        change(`Moved ${moving.name} to pedestal ${slotNo(target)}`, undefined, (l) => l.map((s) => (s.id === moving.id ? { ...s, slot: target } : s)));
      }
      selectStage(moving.id);
      return;
    }
    const product = makeProduct(it);
    if (there) {
      change(`Added ${product.name} to ${there.name}`, `${PRODUCT_KINDS[product.kind].label} · learners now do both.`, (l) => l.map((s) => (s.id === there.id ? { ...s, products: [...s.products, product] } : s)));
      selectStage(there.id);
      flash(product.id);
      return;
    }
    const isBranch = target === 'slot_branch';
    const type: StageType = isBranch ? 'branch' : TYPE_FOR[product.kind];
    const id = uid();
    const mains = all.filter((s) => s.type !== 'branch').sort((a, b) => slotNo(a.slot) - slotNo(b.slot));
    const source = [...mains].reverse().find((s) => slotNo(s.slot) <= 8 && s.type !== 'reward') ?? mains[0];
    const st: BStage = {
      id, slot: target, type, name: it.kind === 'lib' ? product.name : isBranch ? 'Remedial branch' : STAGE_TYPES[type].label + ' stage',
      products: [product], gate: isBranch ? [] : defaultGate(type, product.kind),
      settings: { time: 'No limit', difficulty: 'Fixed', retries: 2, required: !isBranch },
      ...(isBranch ? { branchFrom: source?.id, exitTo: null, routeIn: `Learners who do not pass ${source?.name ?? 'the stage before'}` } : {}),
    };
    pop.current = { id };
    change(isBranch ? 'Branch added on the side ledge' : `New ${STAGE_TYPES[type].label} stage on pedestal ${slotNo(target)}`, isBranch ? 'Choose where learners go after it, in the panel on the right.' : `${PRODUCT_KINDS[product.kind].label}: ${product.name}.`, (l) => [...l, st]);
    selectStage(id);
  };

  // ── drag and drop with snapping ──
  const dragRef = useRef<{ it: DragItem; sx: number; sy: number; on: boolean; ghost: HTMLElement | null; hot: SlotId | null; src: HTMLElement } | null>(null);
  const suppressClick = useRef(false);
  const targetsFor = (it: DragItem): SlotId[] => {
    if (locked) return [];
    if (it.kind === 'stage') {
      const st = store.get().stages.find((s) => s.id === it.stageId);
      if (!st || st.type === 'branch') return [];
      return MAIN_SLOTS.filter((id) => id !== st.slot);
    }
    return view?.slots.slot_branch ? [...MAIN_SLOTS, 'slot_branch'] : [...MAIN_SLOTS];
  };
  const startDrag = (e: RPointerEvent, it: DragItem) => {
    if (e.button !== 0 || locked) return;
    dragRef.current = { it, sx: e.clientX, sy: e.clientY, on: false, ghost: null, hot: null, src: e.currentTarget as HTMLElement };
    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || !view || !api.current) return;
      if (!d.on) {
        if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 6) return;
        d.on = true;
        root.current?.classList.add('dragging');
        const valid = targetsFor(d.it);
        markers.current.forEach((el, id) => el.classList.toggle('is-target', valid.includes(id)));
        chipEls.current.forEach((el, id) => { const st = store.get().stages.find((s) => s.id === id); el.classList.toggle('is-drop', !!st && valid.includes(st.slot as SlotId)); });
        if (d.it.kind === 'stage') chipEls.current.get(d.it.stageId)?.classList.add('is-lifted');
        const g = document.createElement('div');
        g.className = 'ghost';
        const label = d.it.kind === 'stage' ? store.get().stages.find((s) => s.id === (d.it as { stageId: string }).stageId)?.name ?? 'Stage' : d.it.kind === 'lib' ? d.it.name : `New ${PRODUCT_KINDS[d.it.product].label.toLowerCase()}`;
        const hint = d.it.kind === 'stage' ? 'Drop on another pedestal' : 'New stage, or add to a stage';
        g.innerHTML = `<span class="ghost__icon">${d.src.querySelector('svg')?.outerHTML ?? ''}</span><span>${label}<small>${hint}</small></span>`;
        document.body.appendChild(g);
        d.ghost = g;
        if (!reduced()) gsap.fromTo(g, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25 });
      }
      // nearest valid pedestal within reach snaps the ghost
      const valid = targetsFor(d.it);
      let best = null as SlotId | null;
      let bd = 95;
      const p = { x: 0, y: 0 };
      valid.forEach((id) => { const s = view.slots[id]; if (!s) return; api.current!.toScreen(s.cx, s.cy, p); const dd = Math.hypot(ev.clientX - p.x, ev.clientY - p.y); if (dd < bd) { bd = dd; best = id; } });
      if (best !== d.hot) {
        if (d.hot) { markers.current.get(d.hot)?.classList.remove('is-hot'); chipEls.current.forEach((el) => el.classList.remove('is-hot')); }
        d.hot = best;
        if (best) {
          markers.current.get(best)?.classList.add('is-hot');
          const occupant = store.get().stages.find((s) => s.slot === best);
          if (occupant) chipEls.current.get(occupant.id)?.classList.add('is-hot');
        }
      }
      let gx = ev.clientX + 14, gy = ev.clientY + 14;
      const hs = d.hot ? view.slots[d.hot] : undefined;
      if (hs) { const s = hs; api.current.toScreen(s.cx, s.cy, p); gx = gx + (p.x - gx) * 0.45; gy = gy + (p.y - gy) * 0.45; }
      if (d.ghost) d.ghost.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
    };
    const end = (ev: PointerEvent, cancel = false) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', esc);
      const d = dragRef.current;
      dragRef.current = null;
      if (!d || !d.on) return;
      suppressClick.current = true;
      window.setTimeout(() => { suppressClick.current = false; }, 60);
      root.current?.classList.remove('dragging');
      markers.current.forEach((el) => el.classList.remove('is-target', 'is-hot'));
      chipEls.current.forEach((el) => el.classList.remove('is-drop', 'is-hot', 'is-lifted'));
      const g = d.ghost;
      const target = cancel ? null : d.hot;
      if (g) {
        const r = d.src.getBoundingClientRect();
        const ts = target && view ? view.slots[target] : undefined;
        if (ts && api.current) {
          const s = ts;
          const p = api.current.toScreen(s.cx, s.cy, { x: 0, y: 0 });
          gsap.to(g, { x: p.x, y: p.y, scale: 0.4, opacity: 0, duration: reduced() ? 0 : 0.28, ease: 'power2.in', onComplete: () => g.remove() });
        } else {
          gsap.to(g, { x: r.left, y: r.top, scale: 0.6, opacity: 0, duration: reduced() ? 0 : 0.35, ease: 'power2.inOut', onComplete: () => g.remove() });
        }
      }
      if (target) commit(d.it, target, { x: ev.clientX, y: ev.clientY });
    };
    const up = (ev: PointerEvent) => end(ev);
    const esc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') end(new PointerEvent('pointerup'), true); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', esc);
  };

  // click instead of drag: add to the selected stage, or start a stage on the next free pedestal
  const quickAdd = (it: Exclude<DragItem, { kind: 'stage' }>) => {
    if (suppressClick.current || locked) return;
    commit(it, sel.slot as SlotId);
  };

  // ── journey check fixes ──
  const fix = (p: Problem) => {
    selectStage(p.stageId);
    const st = stages.find((s) => s.id === p.stageId);
    if (!st) return;
    switch (p.fix.kind) {
      case 'draft': setSheet({ kind: 'import', stageId: st.id }); break;
      case 'content': setSheet({ kind: 'content', stageId: st.id }); break;
      case 'placement': {
        const id = uid();
        change('Rule added: place 4th or better to move on', 'Everyone else goes to the Remedial Path.', (l) => l.map((s) => (s.id === st.id ? { ...s, gate: [...s.gate, { id, kind: 'placement', value: 4 }] } : s)));
        flash(id);
        break;
      }
      case 'exit': {
        const src = stages.find((x) => x.id === st.branchFrom) ?? stages[stages.indexOf(st) - 1];
        change(`${st.name} now returns to ${src?.name ?? 'the previous stage'}`, 'Loops are capped at 3; the third brings in a coach.', (l) => l.map((s) => (s.id === st.id ? { ...s, exitTo: src?.id ?? null } : s)));
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

  // ── draft → review → publish ──
  const save = () => {
    store.set((s) => ({ ...s, dirty: false, saved: 'Saved just now' }));
    toast({ tone: 'done', title: 'Draft saved', body: 'Only you and other admins can see drafts.' });
  };
  const publish = () => {
    store.set((s) => ({ ...s, status: 'published', dirty: false }));
    toast({ tone: 'done', title: `Published: ${BUILDER_JOURNEY.name}`, body: `Live now for ${BUILDER_JOURNEY.audience.split('·')[1]?.trim() ?? 'its learners'}.` });
    if (!reduced()) gsap.fromTo(root.current!.querySelectorAll('.sc__tile'), { boxShadow: '0 0 0 0 rgba(70,211,139,0)' }, { boxShadow: '0 0 0 4px rgba(70,211,139,0.75), 0 0 40px rgba(70,211,139,0.5)', duration: 0.45, stagger: 0.12, yoyo: true, repeat: 1, clearProps: 'boxShadow' });
  };
  const submit = () => {
    store.set((s) => ({ ...s, status: 'review', dirty: false, saved: 'Saved just now' }));
    addToQueue({
      id: 'mine-journey', kind: 'journey', title: BUILDER_JOURNEY.name, what: `Journey · ${stages.length} stages`, author: ADMIN.name, mine: true, isNew: true,
      age: 'Just now', change: 'New journey for Product Managers.', audience: BUILDER_JOURNEY.audience,
      checks: ['Journey check passed', 'Every stage has content', 'Remedial branch has an exit'],
      preview: [{ label: 'Stages', value: stages.map((s) => STAGE_TYPES[s.type].label).join(' · ') }],
    });
    toast({ tone: 'done', title: 'Submitted for review', body: `${APPROVER.name} will review it. Nobody approves their own work.`, action: { label: 'See the queue', run: () => go('admin/dashboard') } });
    window.clearTimeout(approvalTimer);
    approvalTimer = window.setTimeout(() => {
      if (store.get().status !== 'review') return;
      removeFromQueue('mine-journey');
      store.set((s) => ({ ...s, status: 'approved' }));
      toast({ tone: 'done', title: `${APPROVER.name} approved ${BUILDER_JOURNEY.name}`, body: 'Publish it to make it live for learners.', action: { label: 'Publish now', run: publish } });
    }, 6500);
  };
  const reopen = () => {
    store.set((s) => ({ ...s, status: 'draft', saved: 'Version 2 · draft' }));
    toast({ tone: 'info', title: 'New draft started', body: 'Learners keep the published version until this one is approved.' });
  };

  // editor actions on the selected stage
  const move = (id: string, d: -1 | 1) => {
    const mains = stages.filter((s) => s.type !== 'branch');
    const i = mains.findIndex((s) => s.id === id);
    const other = mains[i + d];
    const me = mains[i];
    if (!other || !me) return;
    commit({ kind: 'stage', stageId: me.id }, other.slot as SlotId);
  };
  const duplicate = (id: string) => {
    const src = stages.find((s) => s.id === id);
    const free = MAIN_SLOTS.find((sl) => !bySlot.has(sl) && slotNo(sl) > slotNo(src?.slot ?? 'slot_1')) ?? MAIN_SLOTS.find((sl) => !bySlot.has(sl));
    if (!src || !free || src.type === 'branch') { toast({ tone: 'alert', title: 'No free pedestal for a copy', body: 'Move or delete a stage first.' }); return; }
    const nid = uid();
    pop.current = { id: nid };
    change(`Duplicated ${src.name}`, `On pedestal ${slotNo(free)}.`, (l) => [...l, { ...src, id: nid, slot: free, name: `${src.name} (copy)`, gate: src.gate.map((c) => ({ ...c, id: uid() })), products: src.products.map((p) => ({ ...p, id: uid() })) }]);
    selectStage(nid);
  };
  const remove = (id: string) => {
    const st = stages.find((s) => s.id === id);
    if (!st) return;
    const next = stages[stages.indexOf(st) + 1] ?? stages[stages.indexOf(st) - 1];
    change(`Deleted ${st.name}`, 'Its pedestal is free again.', (l) => l.filter((s) => s.id !== id).map((s) => (s.exitTo === id ? { ...s, exitTo: null } : s)));
    if (next) selectStage(next.id);
  };

  // ── the one primary action ──
  let primary;
  if (status === 'draft') {
    primary = problems.length
      ? <button type="button" className="btn btn--primary btn--md is-blocked is-alert g-lit" aria-disabled="true" onClick={() => { setCheckOpen(true); gsap.fromTo('.check', { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }); }}>
          <span className="btn__icon" aria-hidden><CircleAlert /></span><span className="btn__label">Fix {problems.length} problem{problems.length === 1 ? '' : 's'} to submit</span>
        </button>
      : <Btn kind="primary" icon={<Send />} onClick={submit} className="is-ready">Submit for review</Btn>;
  } else if (status === 'review') {
    primary = <Btn kind="primary" blocked icon={<LoaderCircle className="spin" />}>Waiting for {APPROVER.name.split(' ')[0]}’s approval</Btn>;
  } else if (status === 'approved') {
    primary = <Btn kind="primary" icon={<Rocket />} onClick={publish}>Publish journey</Btn>;
  } else {
    primary = <Btn kind="glass" icon={<PenLine />} onClick={reopen}>Make changes</Btn>;
  }
  const statusChip = {
    draft: <Chip>Draft</Chip>,
    review: <Chip tone="current" icon={<LoaderCircle size={13} className="spin" />}>In review</Chip>,
    approved: <Chip tone="done" icon={<Check size={13} />}>Approved</Chip>,
    published: <Chip tone="done" icon={<CircleCheck size={13} />}>Published</Chip>,
  }[status];

  const libItems = useMemo(() => (Object.keys(LIBRARY) as ProductKind[])
    .flatMap((k) => LIBRARY[k].slice(0, k === 'arena' ? 6 : 4).map((x) => ({ ...x, kind: k })))
    .filter((x) => (x.name + x.meta + PRODUCT_KINDS[x.kind].label).toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <div ref={root} className="page builder">
      {view && (
        <Stage25 view={view} apiRef={api} className="is-admin">
          <svg ref={wires} className="bwires" aria-hidden />
          {[...MAIN_SLOTS, 'slot_branch' as SlotId].filter((id) => !!view.slots[id]).map((id) => (
            <div key={id} ref={regMarker(id)} className={cx('slot25', !bySlot.has(id) && 'is-empty')} aria-hidden>
              <span className="slot25__ring" />
              <span className="slot25__hint">{id === 'slot_branch' ? <><GitBranch size={13} /> Branch ledge</> : <><Plus size={13} /> New stage</>}</span>
            </div>
          ))}
          {stages.map((st) => {
            const TI = TYPE_ICON[st.type];
            const probs = problems.filter((p) => p.stageId === st.id);
            return (
              <div key={st.id} ref={regChip(st.id)} className={cx('sc', st.id === sel.id && 'is-sel', probs.length > 0 && 'has-prob')}>
                <div className="sc__in">
                  <span className="sc__fly">
                    <button
                      type="button" className="sc__btn" aria-pressed={st.id === sel.id}
                      aria-label={`Stage ${stages.indexOf(st) + 1}, ${st.name}, ${STAGE_TYPES[st.type].label}${probs.length ? `, ${probs.length} to fix` : ''}. Drag to move it.`}
                      onPointerDown={(e) => st.type !== 'branch' && startDrag(e, { kind: 'stage', stageId: st.id })}
                      onClick={() => { if (!suppressClick.current) selectStage(st.id); }}
                    >
                      <span className="sc__tile">
                        <TI />
                        <span className="sc__n num">{stages.indexOf(st) + 1}</span>
                        {probs.length > 0 && <span className="sc__warn"><CircleAlert /></span>}
                      </span>
                      <span className="sc__name">{st.name}</span>
                      <span className="sc__meta">{probs.length ? probs[0]!.short : `${STAGE_TYPES[st.type].label} · ${st.products.length} item${st.products.length === 1 ? '' : 's'}`}</span>
                    </button>
                  </span>
                </div>
              </div>
            );
          })}
        </Stage25>
      )}
      <div className="bshade" aria-hidden />

      <header className="bh">
        <div className="bh__copy">
          <p className="eyebrow bh__eyebrow">Pathway builder · {BUILDER_JOURNEY.audience}</p>
          <h1 ref={title} className="bh__title">{BUILDER_JOURNEY.name}</h1>
          <p className="bh__status">{statusChip}<span>{status === 'published' ? 'Live for learners' : dirty ? 'Unsaved changes' : saved}</span></p>
        </div>
        <div className="bh__actions">
          <Btn kind="ghost" icon={<Eye />} onClick={() => setSheet({ kind: 'preview', stageId: sel.id })}>Preview as learner</Btn>
          {status === 'draft' && <Btn kind="glass" icon={<Save />} onClick={save}>Save draft</Btn>}
          {primary}
        </div>
      </header>

      <div className="blib">
        <section className="lib glass g-lit" aria-labelledby="lib-title">
          <h2 id="lib-title" className="lib__title">Content library</h2>
          <p className="lib__sub">Drag onto an empty pedestal to start a stage, or onto a stage to add to it. Click to add to the selected stage.</p>
          <div className="lib__scroll">
            <div>
              <p className="lib__h">New</p>
              <div className="lib__kinds">
                {(Object.keys(PRODUCT_KINDS) as ProductKind[]).map((k) => {
                  const I = KIND_ICON[k];
                  return (
                    <button key={k} type="button" className="litem" disabled={locked} onPointerDown={(e) => startDrag(e, { kind: 'new', product: k })} onClick={() => quickAdd({ kind: 'new', product: k })} title={`Drag to a pedestal, or click to add to ${sel.name}`}>
                      <span className="litem__icon"><I /></span>
                      <span className="litem__text"><strong>{PRODUCT_KINDS[k].label}</strong></span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="lib__h">From Northwind’s library</p>
              <label className="lib__search">
                <Search size={15} aria-hidden />
                <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search courses, arenas, cups" aria-label="Search the library" />
              </label>
              <div className="lib__list">
                {libItems.map((x) => {
                  const I = KIND_ICON[x.kind];
                  return (
                    <button key={x.kind + x.name} type="button" className="litem" disabled={locked} onPointerDown={(e) => startDrag(e, { kind: 'lib', product: x.kind, name: x.name, meta: x.meta })} onClick={() => quickAdd({ kind: 'lib', product: x.kind, name: x.name, meta: x.meta })} title={`Drag to a pedestal, or click to add to ${sel.name}`}>
                      <span className="litem__icon"><I /></span>
                      <span className="litem__text"><strong>{x.name}</strong><small>{PRODUCT_KINDS[x.kind].label} · {x.meta}</small></span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="lib__doc">
            <Btn kind="glass" size="sm" icon={<Sparkles />} onClick={() => setSheet({ kind: 'import', stageId: sel.id })} disabled={locked}>Draft questions from a document</Btn>
          </div>
        </section>

        <aside className="check glass g-lit" aria-labelledby="check-title">
          <div className="check__head">
            <h2 id="check-title" className="check__title">Journey check</h2>
            {problems.length > 0
              ? <button type="button" className="check__toggle" aria-expanded={checkOpen} onClick={() => setCheckOpen((o) => !o)}>{checkOpen ? 'Hide' : `Show ${problems.length}`}</button>
              : null}
          </div>
          {problems.length === 0 ? (
            <p className="check__sum is-ok"><CircleCheck size={22} /><span>{status === 'draft' ? 'Ready to submit for review.' : 'Passed. Nothing blocks this journey.'}</span></p>
          ) : (
            <>
              <p className="check__sum"><span className="check__n num">{problems.length}</span><span>problem{problems.length === 1 ? '' : 's'} block submitting. Each one has a fix.</span></p>
              {checkOpen && (
                <ul className="check__list">
                  {problems.map((p) => (
                    <li key={p.id} className="prob" onMouseEnter={() => selectStage(p.stageId)}>
                      <span className="prob__icon"><CircleAlert size={17} /></span>
                      <div className="prob__text">
                        <strong>{p.title}</strong>
                        <Btn kind="glass" size="sm" onClick={() => fix(p)} icon={p.fix.kind === 'draft' ? <FileUp /> : p.fix.kind === 'content' ? <Plus /> : <Check />}>{p.fix.label}</Btn>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </aside>
      </div>

      <Editor
        key={sel.id}
        stage={sel}
        n={stages.indexOf(sel) + 1}
        total={stages.length}
        stages={stages}
        problems={problems.filter((p) => p.stageId === sel.id)}
        locked={locked}
        flashId={flashId}
        onSheet={(k) => setSheet({ kind: k, stageId: sel.id })}
        onFix={fix}
        onMove={(d) => move(sel.id, d)}
        onDuplicate={() => duplicate(sel.id)}
        onRemove={() => remove(sel.id)}
        onFlash={flash}
      />

      <p className="bhint glass"><Hand size={15} /> Drag from the library onto a pedestal · drag stages to reorder · Ctrl+Z to undo</p>

      <ContentSheet
        open={sheet?.kind === 'content'}
        stage={stages.find((s) => s.id === sheet?.stageId) ?? sel}
        onClose={() => setSheet(null)}
        onAdd={(p: BProduct) => {
          const sid = sheet?.stageId ?? sel.id;
          setSheet(null);
          change(`Added ${p.name}`, `${PRODUCT_KINDS[p.kind].label} in ${stages.find((s) => s.id === sid)?.name ?? 'this stage'}.`, (l) => l.map((s) => (s.id === sid ? { ...s, products: [...s.products, p] } : s)));
          flash(p.id);
        }}
      />
      <ImportSheet
        open={sheet?.kind === 'import'}
        stage={stages.find((s) => s.id === sheet?.stageId) ?? sel}
        onClose={() => setSheet(null)}
        onSent={(items: QItem[], from: DOMRect | null) => {
          const sid = sheet?.stageId ?? sel.id;
          const st = stages.find((s) => s.id === sid);
          setSheet(null);
          store.set((s) => ({ ...s, items, itemsStatus: 'review' }));
          updateStage(sid, (s) => {
            const has = s.products.some((p) => p.kind === 'assessment');
            const meta = `${items.length} questions in review`;
            return {
              ...s,
              products: has
                ? s.products.map((p) => (p.kind === 'assessment' ? { ...p, status: 'review', meta } : p))
                : [...s.products, { id: uid(), kind: 'assessment', name: `${s.name} check`, meta, status: 'review' }],
            };
          });
          addToQueue({
            id: `mine-items-${Date.now()}`, kind: 'items', title: st?.name ?? 'Knowledge Check', what: `Assessment · ${items.length} questions`, author: ADMIN.name, mine: true, isNew: true,
            age: 'Just now', change: `Drafted with AI from “Product Strategy Playbook.pdf”${items.some((i) => i.edited) ? ', then edited by you' : ''}.`,
            audience: `Used in ${BUILDER_JOURNEY.name}, stage ${stages.indexOf(st ?? sel) + 1}`,
            checks: ['Every answer is cited to a page of the source', `${items.filter((i) => i.edited).length} edited by you`],
            preview: [{ label: 'Sample question', value: items[0]?.q ?? '' }],
          });
          flyToQueue(from);
          toast({ tone: 'done', title: `${items.length} questions sent to the review queue`, body: `${APPROVER.name} approves them before any learner sees them.`, action: { label: 'See the queue', run: () => go('admin/dashboard') } });
        }}
      />
      <PreviewSheet open={sheet?.kind === 'preview'} stages={stages} onClose={() => setSheet(null)} />
    </div>
  );
}

/** A few sparks travel from where the items were to the Dashboard tab, which then counts up. */
function flyToQueue(from: DOMRect | null) {
  const tab = document.querySelector<HTMLElement>('.nav__tab[href="#/admin/dashboard"]');
  if (!tab || reduced()) return;
  const to = tab.getBoundingClientRect();
  const sx = from ? from.left + from.width / 2 : innerWidth / 2;
  const sy = from ? from.top + from.height / 2 : innerHeight / 2;
  for (let i = 0; i < 7; i++) {
    const d = document.createElement('span');
    d.className = 'spark-fly';
    document.body.appendChild(d);
    gsap.set(d, { x: sx + (Math.random() - 0.5) * 120, y: sy + (Math.random() - 0.5) * 60 });
    const tl = gsap.timeline({ delay: i * 0.05, onComplete: () => d.remove() });
    tl.to(d, { x: to.right - 16, duration: 0.95, ease: 'power2.in' }, 0)
      .to(d, { y: to.top + to.height / 2, duration: 0.95, ease: 'power3.out' }, 0)
      .to(d, { scale: 0.3, opacity: 0, duration: 0.25 }, 0.8);
  }
}
