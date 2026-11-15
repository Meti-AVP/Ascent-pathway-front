import { useCallback, useState, useSyncExternalStore } from 'react';

// ——— Hash router: #/learner/home, #/learner/journey?t=4, #/admin/dashboard, #/admin/builder ———

export type RouteKey = 'learner/home' | 'learner/journey' | 'admin/dashboard' | 'admin/builder';
export type Role = 'learner' | 'admin';
export type Route = { key: RouteKey; role: Role; mode: 'play' | 'rec'; params: URLSearchParams };

const ROUTES: RouteKey[] = ['learner/home', 'learner/journey', 'admin/dashboard', 'admin/builder'];
export const ROUTE_ORDER = ROUTES;

export const PAGE_NAME: Record<RouteKey, string> = {
  'learner/home': 'Home',
  'learner/journey': 'My journey',
  'admin/dashboard': 'Dashboard',
  'admin/builder': 'Pathway builder',
};

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?');
  const key = (ROUTES as string[]).includes(path) ? (path as RouteKey) : 'learner/home';
  const role: Role = key.startsWith('admin') ? 'admin' : 'learner';
  return { key, role, mode: role === 'admin' ? 'rec' : 'play', params: new URLSearchParams(query) };
}

const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
export function useHash() {
  return useSyncExternalStore(subscribeHash, () => window.location.hash);
}
export function go(to: string) {
  if (window.location.hash !== to) window.location.hash = to;
}

// ——— a tiny external store helper ———
function createStore<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set: (next: T) => {
      value = next;
      subs.forEach((f) => f());
    },
    use: () =>
      useSyncExternalStore(
        (cb) => {
          subs.add(cb);
          return () => subs.delete(cb);
        },
        () => value,
      ),
  };
}

// ——— Toasts: every action answers at once, with Undo where it can be undone ———
export type Toast = { id: number; text: string; detail?: string; tone: 'ok' | 'info' | 'warn'; action?: { label: string; run: () => void } };
const toasts = createStore<Toast[]>([]);
let toastId = 0;
export function toast(t: Omit<Toast, 'id' | 'tone'> & { tone?: Toast['tone']; ms?: number }) {
  const id = ++toastId;
  const { ms = 6000, tone = 'ok', ...rest } = t;
  toasts.set([...toasts.get().slice(-2), { id, tone, ...rest }]);
  window.setTimeout(() => dismissToast(id), ms);
  return id;
}
export function dismissToast(id: number) {
  toasts.set(toasts.get().filter((t) => t.id !== id));
}
export const useToasts = toasts.use;

// ——— "Now playing": the screen a tape opens (the arena / course would start here) ———
export type Playing = { n: number; title: string; product: string; kind: string; from: string } | null;
const playing = createStore<Playing>(null);
export const startTape = (p: NonNullable<Playing>) => playing.set(p);
export const stopTape = () => playing.set(null);
export const usePlaying = playing.use;

// ——— First-time hints, remembered per browser (storage may be unavailable: fail open) ———
const HINT_KEY = 'tapes.hints.v2';
function readHints(): Record<string, true> {
  try {
    return JSON.parse(window.localStorage.getItem(HINT_KEY) || '{}') as Record<string, true>;
  } catch {
    return {};
  }
}
export function useHint(id: string): [boolean, () => void] {
  const [seen, setSeen] = useState(() => !!readHints()[id]);
  const dismiss = useCallback(() => {
    setSeen(true);
    try {
      window.localStorage.setItem(HINT_KEY, JSON.stringify({ ...readHints(), [id]: true }));
    } catch {
      /* private mode: the hint simply shows again next time */
    }
  }, [id]);
  return [!seen, dismiss];
}

export function fmtTimecode(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
export const fmt = (n: number) => n.toLocaleString('en-US');
export function clockNow() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
