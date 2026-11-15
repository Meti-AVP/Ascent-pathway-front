import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Clapperboard, Hand, House, Info, Play, Route as RouteIcon, Square, TriangleAlert, Volume2, VolumeX, Workflow, X } from 'lucide-react';
import { dismissToast, fmtTimecode, stopTape, useHint, usePlaying, useToasts, type Route, type RouteKey } from '../store';
import { isMuted, onMute, setMuted, clunk } from '../fx/sound';
import { noiseTile, Smoke } from '../fx/Grain';
import { Brush } from '../fx/Brush';
import { admin, learner } from '../data';
import { AVATAR } from '../covers/cast';

// ——— Top bar: where you are, where you can go, who you are ———
type NavItem = { key: RouteKey; label: string; icon: typeof House; badge?: number };

export function TopBar({ route, queueCount }: { route: Route; queueCount: number }) {
  const isLearner = route.role === 'learner';
  const pages: NavItem[] = isLearner
    ? [
        { key: 'learner/home', label: 'Home', icon: House },
        { key: 'learner/journey', label: 'My journey', icon: RouteIcon },
      ]
    : [
        { key: 'admin/dashboard', label: 'Dashboard', icon: Clapperboard, badge: queueCount },
        { key: 'admin/builder', label: 'Pathway builder', icon: Workflow },
      ];
  return (
    <header className="tp-top">
      <a className="tp-top__brand" href={isLearner ? '#/learner/home' : '#/admin/dashboard'} aria-label="ASCENT, go to the first page">
        <span className="tp-top__mark" aria-hidden>
          A
        </span>
        <span className="tp-top__word">ASCENT</span>
      </a>
      <nav className="tp-top__nav" aria-label={isLearner ? 'Learner pages' : 'Admin pages'}>
        {pages.map((p) => {
          const on = route.key === p.key;
          const Icon = p.icon;
          return (
            <a key={p.key} href={`#/${p.key}`} className={`tp-top__link ${on ? 'is-on' : ''}`} aria-current={on ? 'page' : undefined}>
              <Icon size={17} strokeWidth={2.2} aria-hidden />
              {p.label}
              {!on && p.badge ? (
                <span className="tp-top__badge" aria-label={`${p.badge} waiting for review`}>
                  {p.badge}
                </span>
              ) : null}
            </a>
          );
        })}
      </nav>
      <div className="tp-top__end">
        <div className="tp-role" role="group" aria-label="View the product as">
          <span className="tp-role__k">View as</span>
          <div className="tp-role__seg">
            <a href="#/learner/home" className={isLearner ? 'is-on' : ''} aria-current={isLearner ? 'true' : undefined}>
              <Play size={12} fill="currentColor" strokeWidth={0} aria-hidden /> Learner
            </a>
            <a href="#/admin/dashboard" className={!isLearner ? 'is-on' : ''} aria-current={!isLearner ? 'true' : undefined}>
              <i className="tp-role__dot" aria-hidden /> Admin
            </a>
          </div>
        </div>
        <div className="tp-me">
          {isLearner ? <img src={AVATAR.learner} alt="" className="tp-me__img" /> : <span className="tp-me__img tp-me__img--initials">SM</span>}
          <span className="tp-me__txt">
            <b>{isLearner ? learner.name : admin.name}</b>
            <small>{isLearner ? `${learner.role} · Level ${learner.level}` : `${admin.role} · ${admin.org}`}</small>
          </span>
        </div>
      </div>
    </header>
  );
}

// ——— Camcorder band: sound toggle and the running counter, quiet, carrying nothing you need ———
export function OsdBand({ mode, base }: { mode: 'play' | 'rec'; base: number }) {
  const [m, setM] = useState(isMuted());
  const [sec, setSec] = useState(0);
  useEffect(() => onMute(() => setM(isMuted())), []);
  useEffect(() => {
    const id = window.setInterval(() => setSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="tp-osdband">
      <button className="tp-sound" onClick={() => setMuted(!m)} aria-pressed={!m}>
        {m ? <VolumeX size={18} strokeWidth={2.2} aria-hidden /> : <Volume2 size={18} strokeWidth={2.2} aria-hidden />}
        <span>{m ? 'Tape sound off' : 'Tape sound on'}</span>
      </button>
      <span className={`tp-osdband__tc is-${mode}`} aria-hidden>
        {mode === 'rec' ? (
          <>
            <i className="tp-recdot" /> REC
          </>
        ) : (
          <>PLAY ▶</>
        )}
        <span>{fmtTimecode(base + sec)}</span>
      </span>
    </div>
  );
}

// ——— Toasts ———
export function Toasts() {
  const list = useToasts();
  return (
    <div className="tp-toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {list.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={`tp-toast is-${t.tone}`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.18 } }}
            transition={{ duration: 0.22 }}
          >
            <span className="tp-toast__ico" aria-hidden>
              {t.tone === 'ok' ? <Check size={16} strokeWidth={3} /> : t.tone === 'warn' ? <TriangleAlert size={16} /> : <Info size={16} />}
            </span>
            <span className="tp-toast__txt">
              <b>{t.text}</b>
              {t.detail && <small>{t.detail}</small>}
            </span>
            {t.action && (
              <button
                className="tp-toast__act"
                onClick={() => {
                  t.action!.run();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button className="tp-toast__x" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
              <X size={15} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ——— First-time hint for gestures you would otherwise have to discover ———
export function Hint({ id, children, className, style }: { id: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  const [show, dismiss] = useHint(id);
  if (!show) return null;
  return (
    <div className={`tp-hint ${className ?? ''}`} style={style} role="note">
      <Hand size={17} strokeWidth={2.2} aria-hidden />
      <span>{children}</span>
      <button onClick={dismiss}>Got it</button>
    </div>
  );
}

// ——— The screen a tape opens. In the product the course / arena starts here. ———
export function NowPlaying() {
  const p = usePlaying();
  const [t, setT] = useState(0);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!p) return;
    setT(0);
    const id = window.setInterval(() => setT((x) => x + 0.1), 100);
    const k = (e: KeyboardEvent) => e.key === 'Escape' && stopTape();
    window.addEventListener('keydown', k);
    const f = window.setTimeout(() => btn.current?.focus(), 60);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(f);
      window.removeEventListener('keydown', k);
    };
  }, [p]);
  const ready = t >= 2.4;
  return (
    <AnimatePresence>
      {p && (
        <motion.div className="tp-np" role="dialog" aria-modal="true" aria-label={`Tape ${p.n} playing: ${p.title}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="tp-np__screen">
            <span className="tp-np__osd tp-np__osd--tl">PLAY ▶</span>
            <span className="tp-np__osd tp-np__osd--tr">TAPE {String(p.n).padStart(2, '0')}</span>
            <span className="tp-np__osd tp-np__osd--br">{fmtTimecode(t)}</span>
            <p className="tp-kicker">
              Tape {p.n} · {p.kind}
            </p>
            <Brush as="h2" text={p.title} className="tp-np__title" />
            <p className="tp-np__line">{ready ? `${p.product} is ready. In the full product your run starts right here.` : `Loading ${p.product}…`}</p>
            <div className="tp-np__bar" aria-hidden>
              <i style={{ width: `${Math.min(100, (t / 2.4) * 100)}%` }} />
            </div>
            <button
              ref={btn}
              className="tp-btn tp-btn--secondary"
              onClick={() => {
                stopTape();
                clunk('rew');
              }}
            >
              <Square size={15} fill="currentColor" aria-hidden /> Stop the tape · back to {p.from}
            </button>
            <p className="tp-np__esc">or press Esc</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ——— Tape-tracking glitch between pages (short, never blurs text) ———
export type GlitchDir = 'ff' | 'rew' | 'rec' | 'play';
export function Glitch({ phase, dir, stamp }: { phase: 'idle' | 'out' | 'in'; dir: GlitchDir; stamp: number }) {
  const bands = useMemo(() => {
    const out: { top: number; h: number; dx: number; d: number }[] = [];
    let y = Math.random() * 8;
    while (y < 100) {
      const h = 1.5 + Math.random() * 8;
      if (Math.random() < 0.55) out.push({ top: y, h, dx: (Math.random() - 0.5) * 18, d: Math.random() * 0.08 });
      y += h + Math.random() * 14;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);
  if (phase === 'idle') return null;
  const label = dir === 'ff' ? '▶▶' : dir === 'rew' ? '◀◀' : dir === 'rec' ? '● REC' : '▶ PLAY';
  return (
    <div className={`tp-glitch is-${phase} tp-glitch--${dir}`} aria-hidden style={{ '--noise': `url(${noiseTile()})` } as CSSProperties}>
      <div className="tp-glitch__veil" />
      {bands.map((b, i) => (
        <i key={i} className="tp-glitch__band" style={{ top: `${b.top}%`, height: `${b.h}%`, '--dx': `${b.dx}%`, animationDelay: `${b.d}s` } as CSSProperties} />
      ))}
      <div className="tp-glitch__label">{label}</div>
    </div>
  );
}

// ——— Fixed atmosphere, all of it behind the content ———
const EMBER: [number, number, number] = [255, 106, 26];
const DEEP: [number, number, number] = [214, 72, 18];
export function Atmosphere({ mode }: { mode: 'play' | 'rec' }) {
  return (
    <div className={`tp-bg tp-bg--${mode}`} aria-hidden>
      <Smoke seed={7} className="tp-smoke--a" tint={EMBER} strength={0.9} />
      <Smoke seed={21} className="tp-smoke--b" tint={DEEP} strength={0.8} />
      <i className="tp-bg__scan" />
      <i className="tp-bg__roll" />
      <i className="tp-bg__vignette" />
    </div>
  );
}
