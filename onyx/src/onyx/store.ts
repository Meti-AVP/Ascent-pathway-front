import { useSyncExternalStore } from 'react';
import {
  BUILDER_STAGES, REVIEW_QUEUE,
  type BStage, type QItem, type ReviewItem,
} from './data';

// A tiny external store: one object, immutable updates, selector hooks.
function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(fn: (s: T) => T) {
      state = fn(state);
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export interface Toast {
  id: number;
  tone: 'done' | 'info' | 'alert';
  title: string;
  body?: string;
  action?: { label: string; run: () => void };
}

export interface Launch {
  eyebrow: string;
  title: string;
  detail: string;
  steps: string[];
}

export type JourneyStatus = 'draft' | 'review' | 'approved' | 'published';

export interface AppState {
  toasts: Toast[];
  queue: ReviewItem[];
  launch: Launch | null;
  // builder
  stages: BStage[];
  selected: string;
  items: QItem[];
  itemsStatus: 'none' | 'draft' | 'review';
  status: JourneyStatus;
  saved: string;
  dirty: boolean;
}

export const store = createStore<AppState>({
  toasts: [],
  queue: REVIEW_QUEUE,
  launch: null,
  stages: BUILDER_STAGES,
  selected: 'b2',
  items: [],
  itemsStatus: 'none',
  status: 'draft',
  saved: 'Saved 2 min ago',
  dirty: false,
});

export function useApp<U>(sel: (s: AppState) => U): U {
  return useSyncExternalStore(store.subscribe, () => sel(store.get()));
}

let toastId = 0;
/** Toasts dismiss themselves (with an exit animation) after a few seconds. */
export function toast(t: Omit<Toast, 'id'>) {
  const id = ++toastId;
  store.set((s) => ({ ...s, toasts: [...s.toasts.slice(-2), { ...t, id }] }));
  return id;
}
export function dismissToast(id: number) {
  store.set((s) => ({ ...s, toasts: s.toasts.filter((x) => x.id !== id) }));
}

export function launch(l: Launch | null) {
  store.set((s) => ({ ...s, launch: l }));
}

// ── Builder: the journey check (lint) ─────────────────────────────────────
export interface Problem {
  id: string;
  stageId: string;
  title: string;
  why: string;
  short: string;
  fix: { label: string; kind: 'draft' | 'placement' | 'exit' | 'content' | 'gate' };
}

export function lint(stages: BStage[]): Problem[] {
  const out: Problem[] = [];
  stages.forEach((st) => {
    if (st.products.length === 0) {
      out.push({ id: `content-${st.id}`, stageId: st.id, title: `${st.name} has no content`, short: 'No content yet', why: 'Learners would arrive at an empty stage.', fix: { label: 'Add content', kind: 'content' } });
    }
    const empty = st.products.find((p) => p.kind === 'assessment' && p.status === 'empty');
    if (empty) {
      out.push({ id: `items-${st.id}`, stageId: st.id, title: `${st.name} has no questions yet`, short: 'No questions yet', why: 'An assessment needs questions before anyone can take it.', fix: { label: 'Draft questions', kind: 'draft' } });
    }
    const isCup = st.products.some((p) => p.kind === 'tournament');
    if (isCup && !st.gate.some((c) => c.kind === 'placement')) {
      out.push({ id: `place-${st.id}`, stageId: st.id, title: `${st.name} has no advancement rule`, short: 'No advancement rule', why: 'A tournament must say which places move on.', fix: { label: 'Advance the top 4', kind: 'placement' } });
    } else if (!isCup && st.type !== 'reward' && st.type !== 'branch' && st.gate.length === 0 && st.products.length > 0) {
      out.push({ id: `gate-${st.id}`, stageId: st.id, title: `${st.name} has no rule to move on`, short: 'No rule to move on', why: 'Learners need a clear way to pass this stage.', fix: { label: 'Add a rule', kind: 'gate' } });
    }
    if (st.type === 'branch' && !st.exitTo) {
      out.push({ id: `exit-${st.id}`, stageId: st.id, title: `${st.name} has no exit`, short: 'No exit yet', why: 'Learners sent here would have no way back.', fix: { label: 'Return to Final Challenge', kind: 'exit' } });
    }
  });
  return out;
}

export function setStages(fn: (s: BStage[]) => BStage[]) {
  store.set((s) => ({ ...s, stages: fn(s.stages), dirty: true }));
}
export function updateStage(id: string, fn: (s: BStage) => BStage) {
  setStages((all) => all.map((st) => (st.id === id ? fn(st) : st)));
}
export function selectStage(id: string) {
  store.set((s) => ({ ...s, selected: id }));
}

export function addToQueue(item: ReviewItem) {
  store.set((s) => ({ ...s, queue: [...s.queue, item] }));
}
export function removeFromQueue(id: string) {
  store.set((s) => ({ ...s, queue: s.queue.filter((q) => q.id !== id) }));
}
export function restoreToQueue(item: ReviewItem, index: number) {
  store.set((s) => {
    const q = [...s.queue];
    q.splice(Math.min(index, q.length), 0, item);
    return { ...s, queue: q };
  });
}
