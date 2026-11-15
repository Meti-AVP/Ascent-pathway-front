import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen, CircleCheck, CirclePlay, ClipboardCheck, Gift, GitBranch, GraduationCap, ListChecks, Lock,
  Radio, Swords, Trophy, Gamepad2, X, Minus, Plus, CircleAlert, Info, LoaderCircle, Check,
} from 'lucide-react';
import { gsap, useGSAP, dur, reduced, fmtInt } from './motion';
import { dismissToast, launch as setLaunch, useApp, type Toast } from './store';
import type { ProductKind, StageState, StageType } from './data';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

// ── Buttons ────────────────────────────────────────────────────────────────
type BtnProps = Omit<ComponentProps<'button'>, 'type'> & {
  kind?: 'primary' | 'glass' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconRight?: ReactNode;
  /** Disabled, but still focusable so its label (the reason) is read. */
  blocked?: boolean;
};
export function Btn({ kind = 'glass', size = 'md', icon, iconRight, blocked, className, children, onClick, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={cx('btn', `btn--${kind}`, `btn--${size}`, blocked && 'is-blocked', kind !== 'ghost' && 'g-lit', className)}
      aria-disabled={blocked || undefined}
      onClick={blocked ? undefined : onClick}
      {...rest}
    >
      {icon && <span className="btn__icon" aria-hidden>{icon}</span>}
      <span className="btn__label">{children}</span>
      {iconRight && <span className="btn__icon" aria-hidden>{iconRight}</span>}
    </button>
  );
}

// ── Chips and states ───────────────────────────────────────────────────────
export type Tone = 'done' | 'current' | 'locked' | 'optional' | 'ember' | 'neutral' | 'alert';
export function Chip({ tone = 'neutral', icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cx('chip', `chip--${tone}`, className)}>
      {icon && <span className="chip__icon" aria-hidden>{icon}</span>}
      {children}
    </span>
  );
}

export const STATE_META: Record<StageState, { text: string; tone: Tone; Icon: typeof Lock }> = {
  done: { text: 'Done', tone: 'done', Icon: CircleCheck },
  current: { text: 'Current', tone: 'current', Icon: CirclePlay },
  locked: { text: 'Locked', tone: 'locked', Icon: Lock },
  optional: { text: 'Only if needed', tone: 'optional', Icon: GitBranch },
};
export function StateTag({ state, text }: { state: StageState; text?: string }) {
  const m = STATE_META[state];
  return <Chip tone={m.tone} icon={<m.Icon size={14} strokeWidth={2.2} />}>{text ?? m.text}</Chip>;
}

export const TYPE_ICON: Record<StageType, typeof Lock> = {
  learn: BookOpen, assess: ClipboardCheck, compete: Swords, prove: Trophy, branch: GitBranch, reward: Gift,
};
export const KIND_ICON: Record<ProductKind, typeof Lock> = {
  course: GraduationCap, assessment: ListChecks, arena: Gamepad2, tournament: Trophy, live: Radio, reward: Gift,
};

// ── Glyphs ─────────────────────────────────────────────────────────────────
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="brandmark">
      <defs>
        <linearGradient id="bm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#c9ccd3" />
          <stop offset="1" stopColor="#ee6a2c" />
        </linearGradient>
      </defs>
      <path d="M4 26 L14.2 7.6 a2 2 0 0 1 3.6 0 L28 26" fill="none" stroke="url(#bm-g)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 26 L16 16.5 L21.5 26" fill="none" stroke="#ee6a2c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <circle cx="16" cy="4.2" r="1.9" fill="#ffc93f" />
    </svg>
  );
}

/** Tier gem: a faceted hexagon in the tier's metal. */
export function TierGem({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="gem">
      <defs>
        <linearGradient id="gem-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2c4" />
          <stop offset="0.5" stopColor="#f2b93b" />
          <stop offset="1" stopColor="#9a5d10" />
        </linearGradient>
        <linearGradient id="gem-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M20 2 L36 11 V29 L20 38 L4 29 V11 Z" fill="url(#gem-a)" />
      <path d="M20 2 L36 11 L20 20 L4 11 Z" fill="url(#gem-b)" opacity="0.55" />
      <path d="M20 20 L36 29 L20 38 Z" fill="#000" opacity="0.18" />
      <text x="20" y="25.5" textAnchor="middle" fontSize="11" fontWeight="800" fill="#3a2406" fontFamily="Unbounded Variable, sans-serif">II</text>
    </svg>
  );
}

// ── Avatars ────────────────────────────────────────────────────────────────
export function Avatar({ who, size = 32 }: { who: 'ahmed' | 'sara'; size?: number }) {
  if (who === 'ahmed') {
    return (
      <span className="avatar avatar--img" style={{ width: size, height: size }}>
        <img src="/onyx/img/ahmed-face.webp" alt="" width={size} height={size} />
      </span>
    );
  }
  return (
    <span className="avatar avatar--mono" style={{ width: size, height: size, fontSize: size * 0.34 }}>
      <span>SM</span>
    </span>
  );
}

// ── Numbers ────────────────────────────────────────────────────────────────
export function Num({ value, format = fmtInt, delay = 0, duration = 1.6, className }: { value: number; format?: (n: number) => string; delay?: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const o = useRef({ v: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced()) {
      o.current.v = value;
      el.textContent = format(value);
      return;
    }
    const t = gsap.to(o.current, {
      v: value, duration, delay, ease: 'expo.out',
      onUpdate: () => { el.textContent = format(o.current.v); },
    });
    return () => { t.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span ref={ref} className={cx('num', className)}>{format(0)}</span>;
}

// ── Progress ───────────────────────────────────────────────────────────────
export function Segments({ states, className }: { states: StageState[]; className?: string }) {
  return (
    <span className={cx('segs', className)} aria-hidden>
      {states.map((s, i) => <span key={i} className={cx('seg', `seg--${s}`)} />)}
    </span>
  );
}

export function Bar({ value, max, tone = 'silver' }: { value: number; max: number; tone?: 'silver' | 'go' | 'sun' | 'ember' }) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    gsap.fromTo(ref.current, { scaleX: 0 }, { scaleX: value / max, duration: dur(1.6), ease: 'expo.out', delay: 0.3 });
  }, { dependencies: [value, max] });
  return (
    <span className={cx('bar', `bar--${tone}`)} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <span ref={ref} className="bar__fill" />
    </span>
  );
}

// ── Inputs ─────────────────────────────────────────────────────────────────
export function Stepper({ value, min, max, step = 1, unit, format, onChange, label }: { value: number; min: number; max: number; step?: number; unit?: string; format?: (v: number) => string; onChange: (v: number) => void; label: string }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <span className="stepper" role="group" aria-label={label}>
      <button type="button" className="stepper__b" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))}><Minus size={14} /></button>
      <span className="stepper__v" aria-live="polite">{format ? format(value) : `${value}${unit ?? ''}`}</span>
      <button type="button" className="stepper__b" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))}><Plus size={14} /></button>
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={cx('toggle', checked && 'is-on')} onClick={() => onChange(!checked)}>
      <span className="toggle__knob" />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label, size = 'md' }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string; size?: 'sm' | 'md' }) {
  const wrap = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    const btn = wrap.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!btn || !thumb.current) return;
    const to = { x: btn.offsetLeft, width: btn.offsetWidth };
    if (first.current || reduced()) gsap.set(thumb.current, to);
    else gsap.to(thumb.current, { ...to, duration: 0.55, ease: 'onyx' });
    first.current = false;
  }, [value]);
  return (
    <div ref={wrap} className={cx('seg-ctl', `seg-ctl--${size}`)} role="radiogroup" aria-label={label}>
      <span ref={thumb} className="seg-ctl__thumb" aria-hidden />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className="seg-ctl__opt" onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Menu (popover) ─────────────────────────────────────────────────────────
export interface MenuItem { label: string; hint?: string; icon?: ReactNode; disabled?: boolean; tone?: 'alert'; onSelect: () => void }
export function Menu({ label, items, children, align = 'start', className, up }: { label: string; items: MenuItem[]; children: (p: { open: boolean; toggle: () => void; id: string }) => ReactNode; align?: 'start' | 'end'; className?: string; up?: boolean }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useRef(`menu-${Math.random().toString(36).slice(2, 8)}`).current;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); (wrap.current?.querySelector('[aria-haspopup]') as HTMLElement | null)?.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const f = [...(pop.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [])];
        const i = f.indexOf(document.activeElement as HTMLElement);
        f[(i + (e.key === 'ArrowDown' ? 1 : -1) + f.length) % f.length]?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    if (pop.current) {
      gsap.fromTo(pop.current, { opacity: 0, y: up ? 8 : -8, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: dur(0.4), ease: 'onyx' });
      pop.current.querySelector<HTMLElement>('button:not([disabled])')?.focus();
    }
    return () => { document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey, true); };
  }, [open, up]);
  return (
    <div ref={wrap} className={cx('menu', className)}>
      {children({ open, toggle: () => setOpen((o) => !o), id })}
      {open && (
        <div ref={pop} id={id} role="menu" aria-label={label} className={cx('menu__pop glass', `menu__pop--${align}`, up && 'menu__pop--up')}>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" className={cx('menu__item', it.tone === 'alert' && 'is-alert')} disabled={it.disabled} onClick={() => { setOpen(false); it.onSelect(); }}>
              {it.icon && <span className="menu__icon" aria-hidden>{it.icon}</span>}
              <span className="menu__text"><span>{it.label}</span>{it.hint && <small>{it.hint}</small>}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sheet (modal) ──────────────────────────────────────────────────────────
export function Sheet({ open, onClose, label, children, className, width = 1080 }: { open: boolean; onClose: () => void; label: string; children: ReactNode; className?: string; width?: number }) {
  const [mounted, setMounted] = useState(open);
  const panel = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => { if (open) setMounted(true); }, [open]);

  useLayoutEffect(() => {
    if (!mounted || !panel.current) return;
    if (open) {
      gsap.fromTo(back.current, { opacity: 0 }, { opacity: 1, duration: dur(0.5), ease: 'power2.out' });
      gsap.fromTo(panel.current, { opacity: 0, y: 34, scale: 0.965, filter: 'blur(12px)' }, { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: dur(0.85), ease: 'onyx', clearProps: 'filter' });
    } else {
      gsap.to(back.current, { opacity: 0, duration: dur(0.35) });
      gsap.to(panel.current, { opacity: 0, y: 18, scale: 0.98, duration: dur(0.32), ease: 'power2.in', onComplete: () => setMounted(false) });
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); }
      if (e.key === 'Tab' && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), input, textarea, select, [tabindex="0"]')];
        if (!f.length) return;
        const a = f[0]!, z = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    window.addEventListener('keydown', onKey, true);
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 60);
    return () => { window.removeEventListener('keydown', onKey, true); window.clearTimeout(t); prev?.focus?.(); };
  }, [open]);

  if (!mounted) return null;
  return createPortal(
    <div className="sheet-layer">
      <div ref={back} className="sheet-back" onClick={() => closeRef.current()} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label={label} className={cx('sheet glass', className)} style={{ width: `min(${width}px, calc(100vw - 48px))` }}>
        <button type="button" className="sheet__close" aria-label="Close" onClick={() => closeRef.current()}><X size={18} /></button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ── Toasts ─────────────────────────────────────────────────────────────────
export function Toaster() {
  const toasts = useApp((s) => s.toasts);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => <ToastView key={t.id} t={t} />)}
    </div>
  );
}

function ToastView({ t }: { t: Toast }) {
  const ref = useRef<HTMLDivElement>(null);
  const out = () => {
    gsap.to(ref.current, { opacity: 0, y: 12, scale: 0.97, filter: 'blur(6px)', duration: dur(0.35), ease: 'power2.in', onComplete: () => dismissToast(t.id) });
  };
  useGSAP(() => {
    gsap.from(ref.current, { opacity: 0, y: 28, scale: 0.94, filter: 'blur(12px)', duration: dur(0.8), ease: 'onyx', clearProps: 'filter' });
    const timer = gsap.delayedCall(6, out);
    return () => { timer.kill(); };
  });
  const Icon = t.tone === 'done' ? CircleCheck : t.tone === 'alert' ? CircleAlert : Info;
  return (
    <div ref={ref} className={cx('toast glass', `toast--${t.tone}`)}>
      <Icon size={18} className="toast__icon" aria-hidden />
      <div className="toast__text">
        <strong>{t.title}</strong>
        {t.body && <span>{t.body}</span>}
      </div>
      {t.action && (
        <button type="button" className="toast__action" onClick={() => { t.action!.run(); out(); }}>{t.action.label}</button>
      )}
      <button type="button" className="toast__x" aria-label="Dismiss" onClick={out}><X size={15} /></button>
    </div>
  );
}

// ── Launch overlay: the moment a stage or battle starts ────────────────────
export function LaunchOverlay() {
  const l = useApp((s) => s.launch);
  const [step, setStep] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!l) return;
    setStep(0);
    const ids = l.steps.map((_, i) => window.setTimeout(() => setStep(i + 1), reduced() ? 0 : 700 + i * 850));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLaunch(null); };
    window.addEventListener('keydown', onKey);
    return () => { ids.forEach(clearTimeout); window.removeEventListener('keydown', onKey); };
  }, [l]);
  useGSAP(() => {
    if (!l || !root.current) return;
    const q = gsap.utils.selector(root);
    gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: dur(0.5) });
    gsap.fromTo(q('.launch__ring'), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: dur(1.4), ease: 'onyx' });
    gsap.fromTo(q('.launch__copy > *'), { y: 24, opacity: 0, filter: 'blur(10px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', stagger: 0.08, duration: dur(1), ease: 'onyx', delay: 0.15 });
    if (!reduced()) gsap.to(q('.launch__spin'), { rotate: 360, duration: 6, repeat: -1, ease: 'none' });
  }, { dependencies: [l], scope: root });
  if (!l) return null;
  const done = step >= l.steps.length;
  return createPortal(
    <div ref={root} className="launch" role="dialog" aria-modal="true" aria-label={l.title}>
      <div className="launch__ring" aria-hidden><span className="launch__spin" /></div>
      <div className="launch__copy">
        <p className="eyebrow">{l.eyebrow}</p>
        <h2 className="launch__title">{l.title}</h2>
        <p className="launch__detail">{l.detail}</p>
        <ol className="launch__steps">
          {l.steps.map((s, i) => (
            <li key={s} className={cx(i < step && 'is-done', i === step && 'is-now')}>
              {i < step ? <Check size={16} /> : i === step ? <LoaderCircle size={16} className="spin" /> : <span className="dot" />}
              {s}
            </li>
          ))}
        </ol>
        <p className={cx('launch__note', done && 'is-on')}>
          The arena opens here in the full product. This preview ends at the starting line.
        </p>
        <Btn kind={done ? 'primary' : 'glass'} onClick={() => setLaunch(null)} data-autofocus>
          {done ? 'Back to ASCENT' : 'Cancel'}
        </Btn>
      </div>
    </div>,
    document.body,
  );
}
