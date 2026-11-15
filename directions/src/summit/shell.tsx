import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  House, Route as RouteIcon, LayoutDashboard, Workflow, GraduationCap, ShieldCheck, Search, Bell, Sun, Moon,
  ChevronRight, CornerDownLeft, LogOut, ArrowLeftRight, ChevronsUpDown,
} from 'lucide-react';
import { Avatar, Logo, useOutside } from './ui';
import { AHMED, FACE, NOTIFICATIONS, SARA } from './data';

export type RouteKey = 'learner/home' | 'learner/journey' | 'admin/dashboard' | 'admin/builder';
export const ROUTES: RouteKey[] = ['learner/home', 'learner/journey', 'admin/dashboard', 'admin/builder'];

interface Nav {
  route: RouteKey;
  role: 'learner' | 'admin';
  go: (r: RouteKey, anchor?: string) => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
}
export const NavCtx = createContext<Nav>({ route: 'learner/home', role: 'learner', go: () => {}, theme: 'dark', setTheme: () => {} });
export const useNav = () => useContext(NavCtx);

export const PAGE_NAME: Record<RouteKey, string> = {
  'learner/home': 'Home',
  'learner/journey': 'My journey',
  'admin/dashboard': 'Dashboard',
  'admin/builder': 'Pathway builder',
};

/* ───────── sidebar: role switch on top, then only the pages that exist ───────── */

export function Sidebar({ queueCount }: { queueCount: number }) {
  const { route, role, go } = useNav();
  const items = role === 'learner'
    ? [
      { label: 'Home', sub: 'Your next stage', icon: House, to: 'learner/home' as RouteKey },
      { label: 'My journey', sub: 'Sales Mastery · 3 of 9', icon: RouteIcon, to: 'learner/journey' as RouteKey },
    ]
    : [
      { label: 'Dashboard', sub: 'Review queue', icon: LayoutDashboard, to: 'admin/dashboard' as RouteKey, badge: queueCount },
      { label: 'Pathway builder', sub: 'Product Leadership Journey', icon: Workflow, to: 'admin/builder' as RouteKey },
    ];
  return (
    <aside className="sm-side" aria-label="Sidebar">
      <button type="button" className="sm-side__logo" onClick={() => go(role === 'learner' ? 'learner/home' : 'admin/dashboard')} aria-label="ASCENT, go to the first page">
        <Logo />
      </button>
      <RoleSwitch />
      <nav className="sm-nav" aria-label="Pages">
        <p className="sm-nav__h">{role === 'learner' ? 'Learning' : 'Northwind Pharma'}</p>
        {items.map((it) => {
          const on = it.to === route;
          return (
            <button key={it.to} type="button" className={`sm-nav__i${on ? ' is-on' : ''}`} onClick={() => go(it.to)} aria-current={on ? 'page' : undefined}>
              {on && <motion.span layoutId={`navpill-${role}`} className="sm-nav__pill" transition={{ type: 'spring', stiffness: 480, damping: 40 }} />}
              <it.icon className="sm-nav__ic" size={20} strokeWidth={1.9} aria-hidden />
              <span className="sm-nav__t"><b>{it.label}</b><small>{it.sub}</small></span>
              {'badge' in it && it.badge ? <span className="sm-nav__b" aria-label={`${it.badge} waiting`}>{it.badge}</span> : null}
            </button>
          );
        })}
      </nav>
      <div className="sm-side__fill" />
      <Account />
    </aside>
  );
}

function RoleSwitch() {
  const { role, go } = useNav();
  return (
    <div className="sm-role">
      <p className="sm-role__l" id="sm-role-l">You are viewing as</p>
      <div className="sm-role__seg" role="radiogroup" aria-labelledby="sm-role-l">
        {([
          { k: 'learner', label: 'Learner', icon: GraduationCap, to: 'learner/home' },
          { k: 'admin', label: 'Admin', icon: ShieldCheck, to: 'admin/dashboard' },
        ] as const).map((o) => (
          <button key={o.k} type="button" role="radio" aria-checked={role === o.k} className={role === o.k ? 'is-on' : ''} onClick={() => go(o.to)}>
            {role === o.k && <motion.span layoutId="rolepill" className="sm-role__pill" transition={{ type: 'spring', stiffness: 460, damping: 38 }} />}
            <o.icon size={17} strokeWidth={2} aria-hidden />
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Account() {
  const { role, go } = useNav();
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const me = role === 'learner'
    ? { face: FACE.ahmed, name: AHMED.name, sub: `${AHMED.role} · ${AHMED.squad}` }
    : { face: FACE.sara, name: SARA.name, sub: `${SARA.role} · Northwind Pharma` };
  return (
    <div className="sm-acct" ref={ref}>
      <AnimatePresence>
        {open && (
          <motion.div className="sm-pop sm-pop--up" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.16 }}>
            <button type="button" className="sm-pop__i" onClick={() => { setOpen(false); go(role === 'learner' ? 'admin/dashboard' : 'learner/home'); }}>
              <ArrowLeftRight size={17} aria-hidden />
              <span><b>Switch to {role === 'learner' ? 'Sara, Org Admin' : 'Ahmed, Learner'}</b><small>See the {role === 'learner' ? 'admin' : 'learner'} side</small></span>
            </button>
            <button type="button" className="sm-pop__i" onClick={() => setOpen(false)}>
              <LogOut size={17} aria-hidden />
              <span><b>Sign out</b></span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button type="button" className="sm-acct__btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Account: ${me.name}`}>
        <Avatar src={me.face} size={40} alt="" />
        <span><b>{me.name}</b><small>{me.sub}</small></span>
        <ChevronsUpDown size={16} aria-hidden />
      </button>
    </div>
  );
}

/* ───────── top bar: where you are (breadcrumb), search, theme (home only), notifications ───────── */

const SEARCH: { t: string; s: string; route: RouteKey; anchor?: string; role: 'learner' | 'admin' }[] = [
  { t: 'Objection Handling', s: 'Stage 4 · your next stage', route: 'learner/home', role: 'learner' },
  { t: 'Sales Mastery', s: 'Your journey · 3 of 9 done', route: 'learner/journey', role: 'learner' },
  { t: 'Quests', s: 'Daily 2 of 6 · weekly 3 of 8', route: 'learner/home', anchor: 'progress', role: 'learner' },
  { t: 'Squad and rival', s: 'Field Ops North · 3rd of 14', route: 'learner/home', anchor: 'progress', role: 'learner' },
  { t: 'Review queue', s: '7 waiting for approval', route: 'admin/dashboard', anchor: 'queue', role: 'admin' },
  { t: 'Product Leadership Journey', s: 'Draft · 6 stages', route: 'admin/builder', role: 'admin' },
  { t: 'Learning journey performance', s: 'Completion over time', route: 'admin/dashboard', anchor: 'insights', role: 'admin' },
  { t: 'Q4 Sales Cup', s: 'Tournament · Dec 8–12', route: 'admin/dashboard', anchor: 'insights', role: 'admin' },
];

function SearchBox() {
  const { role, go } = useNav();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const ref = useOutside(open, () => setOpen(false));
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    return SEARCH.filter((x) => x.role === role && (!s || x.t.toLowerCase().includes(s) || x.s.toLowerCase().includes(s))).slice(0, 5);
  }, [q, role]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.current?.focus(); setOpen(true); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const pick = (i: number) => {
    const h = hits[i];
    if (!h) return;
    setOpen(false); setQ(''); input.current?.blur();
    go(h.route, h.anchor);
  };
  return (
    <div className={`sm-search${open ? ' is-open' : ''}`} ref={ref}>
      <Search className="sm-search__ic" size={18} strokeWidth={2} aria-hidden />
      <input
        ref={input} value={q} placeholder="Search" aria-label="Search ASCENT"
        onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setHi(0); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, hits.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          if (e.key === 'Enter') pick(hi);
        }}
      />
      <kbd className="sm-search__k">Ctrl K</kbd>
      <AnimatePresence>
        {open && (
          <motion.div className="sm-pop sm-search__pop" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
            <p className="sm-pop__h">{q ? 'Results' : 'Jump to'}</p>
            {hits.length === 0 && <p className="sm-pop__empty">Nothing matches “{q}”.</p>}
            {hits.map((h, i) => (
              <button key={h.t} type="button" className={`sm-pop__i${i === hi ? ' is-hi' : ''}`} onMouseEnter={() => setHi(i)} onClick={() => pick(i)}>
                <span><b>{h.t}</b><small>{h.s}</small></span>
                {i === hi && <CornerDownLeft size={15} aria-hidden />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Notifs() {
  const { role } = useNav();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<Record<string, boolean>>({});
  const ref = useOutside(open, () => setOpen(false));
  const list = NOTIFICATIONS[role];
  const unread = !read[role];
  return (
    <div className="sm-top__wrap" ref={ref}>
      <button type="button" className="sm-iconbtn" aria-label={unread ? `Notifications, ${list.length} new` : 'Notifications'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Bell size={19} strokeWidth={1.9} aria-hidden />
        {unread && <i className="sm-iconbtn__n">{list.length}</i>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="sm-pop sm-pop--right" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
            <div className="sm-pop__row">
              <p className="sm-pop__h">Notifications</p>
              <button type="button" className="sm-link" onClick={() => setRead((r) => ({ ...r, [role]: true }))} disabled={!unread}>{unread ? 'Mark all as read' : 'All caught up'}</button>
            </div>
            {list.map((n) => (
              <div key={n.t} className="sm-pop__n">
                <i className={`sm-dot sm-dot--${n.tone}${unread ? '' : ' is-read'}`} aria-hidden />
                <span>{n.t}<small>{n.when}</small></span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeSwitch() {
  const { theme, setTheme } = useNav();
  return (
    <div className="sm-theme" role="radiogroup" aria-label="Colour mode">
      {([['dark', 'Dark', Moon], ['light', 'Light', Sun]] as const).map(([t, label, I]) => (
        <button key={t} type="button" role="radio" aria-checked={theme === t} className={theme === t ? 'is-on' : ''} onClick={() => setTheme(t)}>
          <I size={15} strokeWidth={2} aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

export function TopBar() {
  const { route, role, go } = useNav();
  const crumbs: { label: string; to?: RouteKey }[] = [{ label: role === 'learner' ? 'Learner' : 'Admin' }];
  if (route === 'learner/journey') crumbs.push({ label: 'Home', to: 'learner/home' });
  if (route === 'admin/builder') crumbs.push({ label: 'Dashboard', to: 'admin/dashboard' });
  crumbs.push({ label: PAGE_NAME[route] });
  return (
    <header className="sm-top">
      <nav className="sm-crumbs" aria-label="You are here">
        {crumbs.map((c, i) => (
          <span key={c.label} className="sm-crumbs__i">
            {i > 0 && <ChevronRight size={15} aria-hidden />}
            {c.to ? <button type="button" onClick={() => go(c.to!)}>{c.label}</button>
              : <span aria-current={i === crumbs.length - 1 ? 'page' : undefined} className={i === crumbs.length - 1 ? 'is-here' : 'is-role'}>{c.label}</span>}
          </span>
        ))}
      </nav>
      <div className="sm-top__r">
        <SearchBox />
        {route === 'learner/home' && <ThemeSwitch />}
        <Notifs />
      </div>
    </header>
  );
}
