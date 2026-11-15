import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ButtonHTMLAttributes, type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookOpen, ClipboardCheck, Swords, Award, GitBranch, Gift, CircleCheck, CirclePlay, Lock, Split, CircleX,
  TriangleAlert, CircleAlert, X, Footprints, Zap, Eye, Flame, Crown, Shield, Trophy, Info, type LucideIcon,
} from 'lucide-react';
import type { BadgeIcon, Rarity, StageType } from './data';
import { RARITY_LABEL } from './data';

/* ───────── brand ───────── */

export function Logo() {
  return (
    <span className="sm-logo">
      <svg className="sm-logo__mark" viewBox="0 0 48 44" aria-hidden>
        <defs>
          <linearGradient id="sml-l" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#ffb466" /><stop offset="0.55" stopColor="#f37d2f" /><stop offset="1" stopColor="#d65a1c" />
          </linearGradient>
          <linearGradient id="sml-r" x1="1" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="#e86a24" /><stop offset="1" stopColor="#8f3610" />
          </linearGradient>
          <linearGradient id="sml-p" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#bdb5ae" />
          </linearGradient>
        </defs>
        <path d="M24 2.5 L3.5 41 H13 L24 19.5 Z" fill="url(#sml-l)" stroke="url(#sml-l)" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M24 2.5 L44.5 41 H35 L24 19.5 Z" fill="url(#sml-r)" stroke="url(#sml-r)" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M24 27.5 L30.2 39 H17.8 Z" fill="url(#sml-p)" stroke="url(#sml-p)" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <span className="sm-logo__word">ASCENT</span>
    </span>
  );
}

/* ───────── stage types and states: one icon + one word, the same on every page ───────── */

export const STAGE_ICON: Record<StageType, LucideIcon> = {
  learn: BookOpen, assess: ClipboardCheck, compete: Swords, prove: Award, branch: GitBranch, reward: Gift,
};

export type StateKind = 'done' | 'current' | 'locked' | 'conditional' | 'failed' | 'ready' | 'problem' | 'warn';
const STATE: Record<StateKind, { icon: LucideIcon; label: string; tone: string }> = {
  done: { icon: CircleCheck, label: 'Done', tone: 'green' },
  current: { icon: CirclePlay, label: 'You are here', tone: 'orange' },
  locked: { icon: Lock, label: 'Locked', tone: 'mute' },
  conditional: { icon: Split, label: 'If needed', tone: 'mute' },
  failed: { icon: CircleX, label: 'Not passed', tone: 'red' },
  ready: { icon: CircleCheck, label: 'Ready', tone: 'green' },
  problem: { icon: CircleAlert, label: 'Problem', tone: 'red' },
  warn: { icon: TriangleAlert, label: 'Suggestion', tone: 'yellow' },
};

export function StateTag({ kind, label, className = '' }: { kind: StateKind; label?: string; className?: string }) {
  const s = STATE[kind];
  return (
    <span className={`sm-state sm-state--${s.tone} ${className}`}>
      <s.icon size={16} strokeWidth={2.1} aria-hidden />
      <span>{label ?? s.label}</span>
    </span>
  );
}
export const stateIcon = (k: StateKind) => STATE[k].icon;

/* ───────── buttons ───────── */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconRight?: LucideIcon;
};
export function Btn({ variant = 'secondary', size = 'md', icon: I, iconRight: IR, className = '', children, type = 'button', ...rest }: BtnProps) {
  return (
    <button type={type} className={`sm-btn sm-btn--${variant} sm-btn--${size} ${className}`} {...rest}>
      {I && <I size={size === 'lg' ? 20 : 17} strokeWidth={2.1} aria-hidden />}
      <span>{children}</span>
      {IR && <IR size={size === 'lg' ? 20 : 17} strokeWidth={2.1} aria-hidden />}
    </button>
  );
}

/* ───────── small pieces ───────── */

export function Avatar({ src, size = 36, alt = '' }: { src?: string; size?: number; alt?: string }) {
  if (!src) {
    const ini = alt.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    return <span className="sm-av sm-av--ini" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden={!alt} title={alt}>{ini}</span>;
  }
  return <img className="sm-av" src={src} width={size} height={size} alt={alt} draggable={false} />;
}

export function Bar({ value, max = 100, target, tone = 'green', label }: { value: number; max?: number; target?: number; tone?: 'green' | 'orange' | 'yellow' | 'silver' | 'red'; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <span className={`sm-bar sm-bar--${tone}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <i style={{ width: `${pct}%` }} />
      {target != null && <b style={{ left: `${(target / max) * 100}%` }} aria-hidden />}
    </span>
  );
}

export function Seg<T extends string>({ value, options, onChange, label, size = 'md' }: {
  value: T; options: readonly { v: T; label: string; icon?: LucideIcon }[]; onChange: (v: T) => void; label: string; size?: 'sm' | 'md';
}) {
  return (
    <div className={`sm-seg sm-seg--${size}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={value === o.v ? 'is-on' : ''} onClick={() => onChange(o.v)}>
          {o.icon && <o.icon size={15} strokeWidth={2.1} aria-hidden />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`sm-toggle${on ? ' is-on' : ''}`} onClick={() => onChange(!on)}>
      <i />
      <span>{on ? 'On' : 'Off'}</span>
    </button>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, unit, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string; label: string }) {
  return (
    <div className="sm-step" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${unit ?? ''}`}>−</button>
      <output>{value}{unit ? ` ${unit}` : ''}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${unit ?? ''}`}>+</button>
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange, label }: {
  value: T; options: readonly { v: T; label: string; count?: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="sm-tabs" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} type="button" role="tab" aria-selected={value === o.v} className={value === o.v ? 'is-on' : ''} onClick={() => onChange(o.v)}>
          {o.label}
          {o.count && <small>{o.count}</small>}
          {value === o.v && <motion.i layoutId={`tab-${label}`} className="sm-tabs__line" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
        </button>
      ))}
    </div>
  );
}

/* ───────── achievement medal: rounded hexagon, rarity said in words ───────── */

const BADGE_ICON: Record<BadgeIcon, LucideIcon> = { steps: Footprints, bolt: Zap, eye: Eye, flame: Flame, crown: Crown, shield: Shield, trophy: Trophy };

export function Medal({ rarity, icon, state, size = 64 }: { rarity: Rarity; icon: BadgeIcon; state: 'earned' | 'progress' | 'locked'; size?: number }) {
  const I = state === 'locked' ? Lock : BADGE_ICON[icon];
  return (
    <span className={`sm-medal sm-medal--${rarity} is-${state}`} style={{ width: size, height: size }} aria-label={`${RARITY_LABEL[rarity]} badge, ${state === 'earned' ? 'earned' : state === 'progress' ? 'in progress' : 'locked'}`} role="img">
      <svg viewBox="0 0 64 64" aria-hidden>
        <polygon className="sm-medal__rim" points="32,5 55.4,18.5 55.4,45.5 32,59 8.6,45.5 8.6,18.5" />
        <polygon className="sm-medal__core" points="32,12 49.3,22 49.3,42 32,52 14.7,42 14.7,22" />
      </svg>
      <I size={Math.round(size * 0.34)} strokeWidth={2} aria-hidden />
    </span>
  );
}

/* ───────── modal ───────── */

export function Modal({ open, onClose, title, children, width = 640 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sm-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div
            className="sm-modal__card" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: width }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="sm-modal__head">
              <h2>{title}</h2>
              <button type="button" className="sm-iconbtn" onClick={onClose} aria-label="Close"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────── hooks and helpers ───────── */

export function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const on = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', on);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', on); document.removeEventListener('keydown', key); };
  }, [open, close]);
  return ref;
}

export const fmt = (n: number) => n.toLocaleString('en-US');

/* ───────── toasts: every action answers at once; reversible ones offer Undo ───────── */

type ToastT = { id: number; text: string; tone: 'green' | 'orange' | 'red' | 'yellow'; action?: { label: string; run: () => void } };
const ToastCtx = createContext<(text: string, tone?: ToastT['tone'], action?: ToastT['action']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

const TOAST_ICON: Record<ToastT['tone'], LucideIcon> = { green: CircleCheck, orange: Info, red: CircleAlert, yellow: TriangleAlert };

export function ToastHost({ children }: { children: ReactNode }) {
  const [list, setList] = useState<ToastT[]>([]);
  const n = useRef(0);
  const push = useCallback((text: string, tone: ToastT['tone'] = 'green', action?: ToastT['action']) => {
    const id = ++n.current;
    setList((l) => [...l.slice(-2), { id, text, tone, action }]);
    window.setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 5200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="sm-toasts" aria-live="polite">
        <AnimatePresence initial={false}>
          {list.map((t) => {
            const I = TOAST_ICON[t.tone];
            return (
              <motion.div
                key={t.id} className={`sm-toast sm-toast--${t.tone}`} layout
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              >
                <I size={18} strokeWidth={2.1} aria-hidden />
                <span>{t.text}</span>
                {t.action && (
                  <button type="button" className="sm-toast__act" onClick={() => { t.action!.run(); setList((l) => l.filter((x) => x.id !== t.id)); }}>{t.action.label}</button>
                )}
                <button type="button" className="sm-toast__x" aria-label="Dismiss" onClick={() => setList((l) => l.filter((x) => x.id !== t.id))}><X size={15} /></button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const rise = (i = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] as const },
});
