import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap, useGSAP, reduced, dur } from './motion';
import { Avatar, BrandMark, LaunchOverlay, Toaster, cx } from './ui';
import { useApp } from './store';
import { ROUTES, TABS, parse, go, type Route, type RouteKey } from './router';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Builder } from './pages/Builder';

const Journey = lazy(() => import('./pages/Journey'));

// The light rig: three soft lights (warm key, orange rim, silver fill) that re-arrange per page.
type Light = { x: number; y: number; s: number; o: number };
const RIG: Record<RouteKey, { key: Light; rim: Light; fill: Light }> = {
  'learner/home': { key: { x: 22, y: 6, s: 1.25, o: 0.95 }, rim: { x: 80, y: 52, s: 1.1, o: 0.9 }, fill: { x: 6, y: 96, s: 1, o: 0.5 } },
  'learner/journey': { key: { x: 50, y: -30, s: 1, o: 0 }, rim: { x: 50, y: 130, s: 1, o: 0 }, fill: { x: 0, y: 50, s: 1, o: 0 } },
  'admin/dashboard': { key: { x: 84, y: 2, s: 1.2, o: 0.8 }, rim: { x: 8, y: 92, s: 1.15, o: 0.75 }, fill: { x: 46, y: -8, s: 1, o: 0.45 } },
  'admin/builder': { key: { x: 50, y: -22, s: 1.3, o: 0.55 }, rim: { x: 104, y: 70, s: 1, o: 0.55 }, fill: { x: -6, y: 40, s: 1, o: 0.4 } },
};

function makeGrain(): string {
  const c = document.createElement('canvas');
  c.width = c.height = 180;
  const g = c.getContext('2d');
  if (!g) return '';
  const img = g.createImageData(180, 180);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

export function App() {
  const [route, setRoute] = useState<Route>(parse);
  const [shown, setShown] = useState<Route>(route);
  const pageRef = useRef<HTMLDivElement>(null);
  const flareRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);

  // a soft dark scrim fades in behind the floating navigation once the page scrolls
  useEffect(() => {
    const on = () => scrimRef.current?.classList.toggle('is-on', window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [shown.key]);

  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    document.title = `${ROUTES[route.key].label} · ASCENT`;
  }, [route.key]);

  // Page transition: the old page sinks into the dark, an anamorphic flare crosses, the new page rises.
  useEffect(() => {
    if (route.key === shown.key) {
      if (route.q.toString() !== shown.q.toString()) setShown(route);
      return;
    }
    if (reduced() || !pageRef.current) {
      setShown(route);
      window.scrollTo(0, 0);
      return;
    }
    const tl = gsap.timeline();
    tl.to(pageRef.current, { opacity: 0, y: -16, scale: 0.992, duration: 0.34, ease: 'power2.in' }, 0);
    tl.fromTo(flareRef.current, { scaleX: 0.05, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.34, ease: 'power2.in' }, 0);
    tl.call(() => {
      window.scrollTo(0, 0);
      setShown(route);
    }, [], 0.34);
    tl.set(pageRef.current, { opacity: 1, y: 0, scale: 1, clearProps: 'transform' }, 0.36);
    tl.to(flareRef.current, { scaleX: 1.6, opacity: 0, duration: 0.8, ease: 'power2.out' }, 0.36);
    return () => { tl.progress(1).kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  // Rig lights follow the page.
  useGSAP(() => {
    const L = RIG[shown.key];
    const q = gsap.utils.selector(rigRef);
    (['key', 'rim', 'fill'] as const).forEach((n) => {
      const l = L[n];
      gsap.to(q(`.rig__${n}`), { x: `${l.x}vw`, y: `${l.y}vh`, scale: l.s, opacity: l.o, duration: dur(1.8), ease: 'onyxInOut' });
    });
    gsap.to(cursorRef.current, { opacity: shown.key === 'learner/journey' ? 0 : 1, duration: dur(0.8) });
  }, { dependencies: [shown.key], scope: rigRef });

  // Cursor light + cursor-reactive glass edges.
  useEffect(() => {
    if (grainRef.current) grainRef.current.style.backgroundImage = `url(${makeGrain()})`;
    const qx = gsap.quickTo(cursorRef.current, 'x', { duration: 0.9, ease: 'power3' });
    const qy = gsap.quickTo(cursorRef.current, 'y', { duration: 0.9, ease: 'power3' });
    let lit: HTMLElement[] = [];
    const onMove = (e: PointerEvent) => {
      if (!reduced()) { qx(e.clientX); qy(e.clientY); }
      const t = e.target as Element | null;
      const next: HTMLElement[] = [];
      let el = t?.closest?.('.g-lit') as HTMLElement | null;
      while (el && next.length < 2) {
        next.push(el);
        el = el.parentElement?.closest('.g-lit') as HTMLElement | null;
      }
      lit.forEach((x) => { if (!next.includes(x)) x.style.setProperty('--lit', '0'); });
      next.forEach((x) => {
        const r = x.getBoundingClientRect();
        x.style.setProperty('--lx', `${e.clientX - r.left}px`);
        x.style.setProperty('--ly', `${e.clientY - r.top}px`);
        x.style.setProperty('--lit', '1');
      });
      lit = next;
    };
    const onLeave = () => { lit.forEach((x) => x.style.setProperty('--lit', '0')); lit = []; };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  const page = (() => {
    switch (shown.key) {
      case 'learner/home': return <Home />;
      case 'learner/journey': return <Suspense fallback={null}><Journey q={shown.q} /></Suspense>;
      case 'admin/dashboard': return <Dashboard />;
      case 'admin/builder': return <Builder />;
    }
  })();

  return (
    <div className={cx('onyx', `on-${shown.key.replace('/', '-')}`)}>
      <div ref={rigRef} className="rig" aria-hidden>
        <span className="rig__key" />
        <span className="rig__rim" />
        <span className="rig__fill" />
      </div>
      <div ref={cursorRef} className="cursor-light" aria-hidden />
      <div ref={scrimRef} className="nav-scrim" aria-hidden />
      <Nav current={route.key} />
      <main ref={pageRef} className="stage-root" key={shown.key}>
        {page}
      </main>
      <div ref={flareRef} className="flare" aria-hidden />
      <div ref={grainRef} className="grain" aria-hidden />
      <Toaster />
      <LaunchOverlay />
    </div>
  );
}

// ── Navigation ─────────────────────────────────────────────────────────────
function Nav({ current }: { current: RouteKey }) {
  const role = ROUTES[current].role;
  const queue = useApp((s) => s.queue.length);
  const tabsRef = useRef<HTMLElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const roleThumb = useRef<HTMLSpanElement>(null);
  const prevRole = useRef(role);

  useLayoutEffect(() => {
    const tab = tabsRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const ind = indRef.current;
    if (!tab || !ind) return;
    const to = { x: tab.offsetLeft, width: tab.offsetWidth };
    const roleChanged = prevRole.current !== role;
    if (reduced() || roleChanged || !ind.dataset.ready) gsap.set(ind, to);
    else gsap.to(ind, { ...to, duration: 0.7, ease: 'onyx' });
    ind.dataset.ready = '1';
    if (roleChanged && !reduced() && tabsRef.current) {
      gsap.fromTo(tabsRef.current.querySelectorAll('.nav__tab'), { opacity: 0, y: 8, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.06, duration: 0.7, ease: 'onyx', clearProps: 'filter' });
    }
    const rb = roleRef.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (rb && roleThumb.current) {
      const rt = { x: rb.offsetLeft, width: rb.offsetWidth };
      if (reduced() || !roleThumb.current.dataset.ready) gsap.set(roleThumb.current, rt);
      else gsap.to(roleThumb.current, { ...rt, duration: 0.7, ease: 'onyx' });
      roleThumb.current.dataset.ready = '1';
    }
    prevRole.current = role;
  }, [current, role]);

  return (
    <header className="nav">
      <a className="nav__brand" href="#/learner/home" aria-label="ASCENT, learner home">
        <BrandMark />
        <span className="nav__word">ASCENT</span>
        <span className="nav__org">Northwind Pharma</span>
      </a>
      <nav ref={tabsRef} className="nav__tabs glass" aria-label={role === 'learner' ? 'Learner pages' : 'Admin pages'}>
        <span ref={indRef} className="nav__ind" aria-hidden />
        {TABS[role].map((k) => (
          <a key={k} href={`#/${k}`} className={cx('nav__tab', k === current && 'is-on')} aria-current={k === current ? 'page' : undefined}>
            {ROUTES[k].label}
            {k === 'admin/dashboard' && current !== k && <span className="nav__count" aria-label={`${queue} to review`}>{queue}</span>}
          </a>
        ))}
      </nav>
      <div className="nav__who">
        <span className="nav__who-label" id="viewas">View as</span>
        <div ref={roleRef} className="role glass" role="radiogroup" aria-labelledby="viewas">
          <span ref={roleThumb} className="role__thumb" aria-hidden />
          <button type="button" role="radio" aria-checked={role === 'learner'} className="role__opt" onClick={() => go('learner/home')} title="Ahmed Hassan · Field Sales">
            <Avatar who="ahmed" size={28} />
            <span>Learner</span>
          </button>
          <button type="button" role="radio" aria-checked={role === 'admin'} className="role__opt" onClick={() => go('admin/dashboard')} title="Sara Mansour · Org Admin">
            <Avatar who="sara" size={28} />
            <span>Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
}
