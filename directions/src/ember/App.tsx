// Ember: stage scaling, hash routes and the shell (sidebar + top bar).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeftRight, Bell, ChartColumnIncreasing, Gift, Route, Search, Settings, Swords, Target, Trophy } from 'lucide-react';
import { EmberDefs, HomeFill, LogoMark, NodesIcon, StudioIcon, UsersFill } from './icons';
import { ADMIN, LEARNER, ORG, QUESTS, REVIEW_QUEUE } from './data';
import { ART, STILL, useParallax } from './World';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminBuilder } from './pages/AdminBuilder';
import { LearnerHome } from './pages/LearnerHome';
import { LearnerJourney } from './pages/LearnerJourney';

export type Route = '/admin/dashboard' | '/admin/builder' | '/learner/home' | '/learner/journey';
const ROUTES: Route[] = ['/admin/dashboard', '/admin/builder', '/learner/home', '/learner/journey'];

function readRoute(): Route {
  const h = location.hash.replace(/^#/, '').split('?')[0] as Route;
  return ROUTES.includes(h) ? h : '/admin/dashboard';
}

/** Navigate; `q` adds a query to the hash (e.g. `stage=8` focuses a stage on the journey). */
export const go = (r: Route, q?: string) => { location.hash = q ? `${r}?${q}` : r; };

/** Read a query value from the hash route, e.g. `#/learner/journey?stage=8`. */
export const hashParam = (k: string) => new URLSearchParams(location.hash.split('?')[1] ?? '').get(k);

/** A short glow on an element after a jump to it, so the click visibly lands somewhere. */
export function flash(selector: string) {
  setTimeout(() => {
    document.querySelector<HTMLElement>(selector)?.animate(
      [
        { boxShadow: 'inset 0 0 0 1.5px rgba(246, 196, 69, 0.95), 0 0 28px rgba(246, 196, 69, 0.4)' },
        { boxShadow: 'inset 0 0 0 1.5px rgba(246, 196, 69, 0), 0 0 28px rgba(246, 196, 69, 0)' },
      ],
      { duration: 1700, easing: 'ease-out' },
    );
  }, 80);
}

/* ---------- stage width in concept px: narrow stages (16:10 screens) get a few fitted details ---------- */
const StageCtx = createContext(1672);
export const useStageW = () => useContext(StageCtx);

/* ---------- toast ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/* ---------- stage: the concept is 1672 x 941; it scales to the viewport ---------- */
function measure() {
  const vw = innerWidth, vh = innerHeight;
  let z = vh / 941;
  let W = vw / z;
  if (W < 1400) { z = vw / 1400; W = 1400; }
  else if (W > 1900) { z = vw / 1900; W = 1900; }
  return { z, W, H: Math.max(941, vh / z) };
}

export function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [dims, setDims] = useState(measure);
  const [toast, setToast] = useState<{ msg: string; k: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  useParallax(stage);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    const onResize = () => setDims(measure());
    addEventListener('hashchange', onHash);
    addEventListener('resize', onResize);
    return () => { removeEventListener('hashchange', onHash); removeEventListener('resize', onResize); };
  }, []);

  useEffect(() => {
    const titles: Record<Route, string> = {
      '/admin/dashboard': 'Home',
      '/admin/builder': 'Pathway Builder',
      '/learner/home': 'Home',
      '/learner/journey': 'My Journey',
    };
    document.title = `ASCENT — ${titles[route]} · Ember`;
  }, [route]);

  const show = useCallback((msg: string) => setToast({ msg, k: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const role = route.startsWith('/admin') ? 'admin' : 'learner';
  const narrow = dims.W < 1600;

  // Sidebar and top bar come first in the DOM so Tab reaches navigation before page content;
  // paint order is unchanged (both sit on z-index 6, above the page).
  return (
    <ToastCtx.Provider value={show}>
      <StageCtx.Provider value={dims.W}>
      <div className="em-viewport">
        <div ref={stage} className={`em em--${role}${STILL ? ' em-still' : ''}${narrow ? ' is-narrow' : ''}`} style={{ zoom: dims.z, width: dims.W, height: dims.H, ['--sw' as string]: dims.W.toFixed(2) }}>
          <EmberDefs />
          <Sidebar route={route} />
          <TopBar role={role} route={route} />
          <div className="em-page" key={route}>
            {route === '/admin/dashboard' && <AdminDashboard />}
            {route === '/admin/builder' && <AdminBuilder />}
            {route === '/learner/home' && <LearnerHome />}
            {route === '/learner/journey' && <LearnerJourney />}
          </div>
          {toast && (
            <div className="em-toast" key={toast.k} role="status">
              {toast.msg}
            </div>
          )}
        </div>
      </div>
      </StageCtx.Provider>
    </ToastCtx.Provider>
  );
}

/* ---------- sidebar ---------- */

interface NavItem { label: string; icon: ReactNode; to?: Route; y: number }

const ADMIN_NAV: NavItem[] = [
  { label: 'Home', icon: <HomeFill />, to: '/admin/dashboard', y: 173 },
  { label: 'Pathway Builder', icon: <NodesIcon />, to: '/admin/builder', y: 228 },
  { label: 'Content Studio', icon: <StudioIcon />, y: 279 },
  { label: 'Analytics', icon: <ChartColumnIncreasing size={22} strokeWidth={1.9} />, y: 328 },
  { label: 'Users', icon: <UsersFill />, y: 374 },
  { label: 'Settings', icon: <Settings size={22} strokeWidth={1.9} />, y: 420 },
];

const LEARNER_NAV: NavItem[] = [
  { label: 'Home', icon: <HomeFill />, to: '/learner/home', y: 173 },
  { label: 'My Journey', icon: <Route size={22} strokeWidth={1.9} />, to: '/learner/journey', y: 228 },
  { label: 'Arena', icon: <Swords size={22} strokeWidth={1.9} />, y: 279 },
  { label: 'Quests', icon: <Target size={22} strokeWidth={1.9} />, y: 328 },
  { label: 'Leaderboard', icon: <Trophy size={22} strokeWidth={1.9} />, y: 374 },
  { label: 'Rewards', icon: <Gift size={22} strokeWidth={1.9} />, y: 420 },
];

function Sidebar({ route }: { route: Route }) {
  const toast = useToast();
  const admin = route.startsWith('/admin');
  const items = admin ? ADMIN_NAV : LEARNER_NAV;
  return (
    <aside className="em-side" aria-label="Main navigation">
      <a className="em-logo" href={admin ? '#/admin/dashboard' : '#/learner/home'} aria-label="ASCENT home">
        <LogoMark className="em-logo__mark" />
        <span className="em-logo__word">ASCENT</span>
      </a>
      <nav className="em-nav">
        {items.map((it) => {
          const active = it.to === route;
          return (
            <button
              key={it.label}
              type="button"
              className={'em-nav__item' + (active ? ' is-active' : '') + (it.to ? '' : ' is-soon')}
              style={{ top: it.y - 6 - 25 }}
              aria-current={active ? 'page' : undefined}
              title={it.to ? undefined : `${it.label} — coming soon`}
              onClick={() => (it.to ? go(it.to) : toast(`${it.label} is coming soon — this mockup builds Home and ${admin ? 'Pathway Builder' : 'My Journey'} for the ${admin ? 'admin' : 'learner'}.`))}
            >
              <span className="em-nav__icon">{active && it.label === 'Home' ? it.icon : it.label === 'Home' ? <HomeOutline /> : it.icon}</span>
              <span className="em-nav__label">{it.label}</span>
              {admin && it.label === 'Pathway Builder' && (
                <span className="em-nav__count" title={`${REVIEW_QUEUE.length} items waiting for approval`}>{REVIEW_QUEUE.length}</span>
              )}
              {!admin && it.label === 'Quests' && <span className="em-nav__count is-quiet">3</span>}
            </button>
          );
        })}
      </nav>
      <button
        type="button"
        className="em-mon"
        onClick={() => go(admin ? '/learner/home' : '/admin/dashboard')}
        aria-label={admin ? 'Switch to the learner view' : 'Switch to the admin view'}
      >
        <span className="em-mon__rest">Learn. Grow. Ascent.</span>
        <span className="em-mon__bar">
          <span style={{ width: admin ? '51.5%' : '33.3%' }} />
        </span>
        {/* always visible under the monument, so the role switch is found without hovering */}
        <span className="em-mon__swap">
          <ArrowLeftRight size={12} strokeWidth={2.2} /> {admin ? 'Switch to Learner' : 'Switch to Admin'}
        </span>
      </button>
    </aside>
  );
}

function HomeOutline() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M2.6 9.4 L10 3 L17.4 9.4 V17 Q17.4 17.8 16.6 17.8 H12.4 V12.8 H7.6 V17.8 H3.4 Q2.6 17.8 2.6 17 Z" />
    </svg>
  );
}

/* ---------- top bar ---------- */

function TopBar({ role, route }: { role: 'admin' | 'learner'; route: Route }) {
  const [open, setOpen] = useState<null | 'bell' | 'me'>(null);
  const toast = useToast();
  useEffect(() => setOpen(null), [route]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.em-pop, .em-bell, .em-avatar')) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    addEventListener('mousedown', close);
    addEventListener('keydown', esc);
    return () => { removeEventListener('mousedown', close); removeEventListener('keydown', esc); };
  }, [open]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.em-search input')?.focus();
      }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, []);

  return (
    <>
      <label className="em-search">
        <Search size={19} strokeWidth={1.9} className="em-search__icon" />
        <input
          placeholder="Search anything..."
          aria-label="Search"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              toast(`Search is not wired in this mockup — “${e.currentTarget.value.trim()}”`);
              e.currentTarget.value = '';
            }
          }}
        />
        <kbd>⌘ K</kbd>
      </label>
      <button type="button" className={'em-bell' + (open === 'bell' ? ' is-open' : '')} aria-label="Notifications" onClick={() => setOpen(open === 'bell' ? null : 'bell')}>
        <Bell size={22} strokeWidth={1.9} />
        <i className="em-bell__dot" />
      </button>
      <button type="button" className={'em-avatar' + (open === 'me' ? ' is-open' : '')} aria-label="Account" onClick={() => setOpen(open === 'me' ? null : 'me')}>
        <img src={role === 'admin' ? ART('admin.webp') : `${import.meta.env.BASE_URL}shared/cast/strategist-face.webp`} alt="" />
      </button>

      {open === 'bell' && role === 'admin' && (
        <div className="em-pop em-pop--bell" role="dialog" aria-label="Review queue">
          <div className="em-pop__head">
            <strong>Review queue</strong>
            <span className="em-pill em-pill--red">{REVIEW_QUEUE.length} waiting</span>
          </div>
          <p className="em-pop__note">Nothing reaches learners until another Org Admin signs it off.</p>
          <ul className="em-queue">
            {REVIEW_QUEUE.map((r) => (
              <li key={r.id}>
                <div>
                  <b>{r.title}</b>
                  <span>{r.kind} · by {r.author} · {r.age}</span>
                </div>
                <button type="button" onClick={() => { setOpen(null); toast(`Reviewing “${r.title}” — the review screen is coming soon in this mockup.`); }}>
                  Review
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open === 'bell' && role === 'learner' && (
        <div className="em-pop em-pop--bell" role="dialog" aria-label="Notifications">
          <div className="em-pop__head"><strong>Notifications</strong><span className="em-pill em-pill--red">3 new</span></div>
          <ul className="em-queue">
            <li><div><b>Omar H. challenged you</b><span>Fast Track · rematch · 12m</span></div><button type="button" onClick={() => toast('Duel accepted — the Fast Track arena is outside this mockup.')}>Accept</button></li>
            <li><div><b>Daily quest: {QUESTS[0]!.done} of {QUESTS[0]!.total} duels won</b><span>Win {QUESTS[0]!.total - QUESTS[0]!.done} more for {QUESTS[0]!.reward} · 1h</span></div><button type="button" onClick={() => { setOpen(null); go('/learner/home'); flash('.em-quest'); }}>View</button></li>
            <li><div><b>Q4 Sales Cup opens in 9 days</b><span>Stage 8 · top 4 advance · 3h</span></div><button type="button" onClick={() => { setOpen(null); go('/learner/journey', 'stage=8'); }}>Path</button></li>
          </ul>
        </div>
      )}
      {open === 'me' && (
        <div className="em-pop em-pop--me" role="dialog" aria-label="Account">
          <div className="em-me">
            <img src={role === 'admin' ? ART('admin.webp') : `${import.meta.env.BASE_URL}shared/cast/strategist-face.webp`} alt="" />
            <div>
              <b>{role === 'admin' ? ADMIN.name : LEARNER.name}</b>
              <span>{role === 'admin' ? `${ADMIN.role} · ${ORG}` : `${LEARNER.role} · ${ORG}`}</span>
            </div>
          </div>
          <button type="button" className="em-me__switch" onClick={() => { setOpen(null); go(role === 'admin' ? '/learner/home' : '/admin/dashboard'); }}>
            <ArrowLeftRight size={15} /> {role === 'admin' ? `View as learner — ${LEARNER.name}` : 'Back to Org Admin'}
          </button>
        </div>
      )}
    </>
  );
}
