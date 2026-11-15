import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ToastHost } from './ui';
import { NavCtx, ROUTES, Sidebar, TopBar, type RouteKey } from './shell';
import { REVIEW_QUEUE } from './data';
import { LearnerHome } from './pages/LearnerHome';
import { LearnerJourney } from './pages/LearnerJourney';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminBuilder } from './pages/AdminBuilder';

function readHash(): { route: RouteKey; anchor: string | null } {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?');
  const route = (ROUTES as string[]).includes(path) ? (path as RouteKey) : 'learner/home';
  return { route, anchor: new URLSearchParams(query).get('s') };
}

function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 88;
  window.scrollTo({ top: y, behavior: 'smooth' });
  el.classList.remove('sm-flash');
  void el.offsetWidth;
  el.classList.add('sm-flash');
}

export type Decision = 'approved' | 'changes';

export function App() {
  const [route, setRoute] = useState<RouteKey>(() => readHash().route);
  const pending = useRef<string | null>(readHash().anchor);
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    try { return window.localStorage.getItem('summit-theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  });
  const [decided, setDecided] = useState<Record<string, Decision>>({});
  const queueCount = REVIEW_QUEUE.length - Object.keys(decided).length;

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#/learner/home');
    const on = () => {
      const h = readHash();
      if (h.anchor) pending.current = h.anchor;
      setRoute(h.route);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  // after a page change: land on the requested section, or at the top
  useEffect(() => {
    const a = pending.current;
    if (!a) window.scrollTo({ top: 0 });
    const t = window.setTimeout(() => {
      if (a) { scrollToAnchor(a); pending.current = null; }
    }, 380);
    return () => window.clearTimeout(t);
  }, [route]);

  const go = useCallback((r: RouteKey, anchor?: string) => {
    if (r === route) {
      window.history.replaceState(null, '', `#/${r}${anchor ? `?s=${anchor}` : ''}`);
      if (anchor) scrollToAnchor(anchor);
      else window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    pending.current = anchor ?? null;
    window.location.hash = `/${r}${anchor ? `?s=${anchor}` : ''}`;
  }, [route]);

  const setTheme = useCallback((t: 'dark' | 'light') => {
    setThemeState(t);
    try { window.localStorage.setItem('summit-theme', t); } catch { /* storage may be blocked */ }
  }, []);

  const role = route.startsWith('admin') ? 'admin' : 'learner';
  // light mode is offered on the learner home only; every other page stays dark
  const effectiveTheme = route === 'learner/home' ? theme : 'dark';
  const nav = useMemo(() => ({ route, role, go, theme, setTheme }) as const, [route, role, go, theme, setTheme]);

  useEffect(() => {
    document.title = {
      'learner/home': 'Home · ASCENT',
      'learner/journey': 'My journey · Sales Mastery · ASCENT',
      'admin/dashboard': 'Dashboard · ASCENT',
      'admin/builder': 'Pathway builder · ASCENT',
    }[route];
    document.documentElement.style.background = effectiveTheme === 'light' ? '#ebe6e0' : '#0b0a09';
  }, [route, effectiveTheme]);

  return (
    <MotionConfig reducedMotion="user">
      <NavCtx.Provider value={nav}>
        <div className="sm" data-theme={effectiveTheme} data-route={route}>
          <ToastHost>
            <div className="sm-bd" aria-hidden />
            <div className="sm-app">
              <Sidebar queueCount={queueCount} />
              <div className="sm-main">
                <TopBar />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.main
                    key={route}
                    className="sm-page"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {route === 'learner/home' && <LearnerHome />}
                    {route === 'learner/journey' && <LearnerJourney />}
                    {route === 'admin/dashboard' && <AdminDashboard decided={decided} setDecided={setDecided} queueCount={queueCount} />}
                    {route === 'admin/builder' && <AdminBuilder />}
                  </motion.main>
                </AnimatePresence>
              </div>
            </div>
          </ToastHost>
        </div>
      </NavCtx.Provider>
    </MotionConfig>
  );
}
