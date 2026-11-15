import type { Role } from './data';

export type RouteKey = 'learner/home' | 'learner/journey' | 'admin/dashboard' | 'admin/builder';

export const ROUTES: Record<RouteKey, { role: Role; label: string }> = {
  'learner/home': { role: 'learner', label: 'Home' },
  'learner/journey': { role: 'learner', label: 'My journey' },
  'admin/dashboard': { role: 'admin', label: 'Dashboard' },
  'admin/builder': { role: 'admin', label: 'Pathway builder' },
};

export const TABS: Record<Role, RouteKey[]> = {
  learner: ['learner/home', 'learner/journey'],
  admin: ['admin/dashboard', 'admin/builder'],
};

export interface Route { key: RouteKey; q: URLSearchParams }

export function parse(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  const key = (Object.keys(ROUTES) as RouteKey[]).find((k) => k === path) ?? 'learner/home';
  return { key, q: new URLSearchParams(qs ?? '') };
}

export function go(key: RouteKey, q?: Record<string, string>) {
  const next = `#/${key}${q ? `?${new URLSearchParams(q)}` : ''}`;
  if (location.hash === next) return;
  location.hash = next;
}
