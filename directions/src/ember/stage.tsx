// Live stage chips that sit on the painted pedestals, plus sockets, trails and tooltips.
import type { CSSProperties, ReactNode } from 'react';
import { Check, Lock } from 'lucide-react';
import { StageGlyph } from './icons';
import { TYPE_LABEL, type StageState, type StageType } from './data';
import { WX } from './World';

export interface Box { x: number; y: number; w: number; h: number }

/** The five painted pedestals: chip boxes in concept pixels (they cover the retouched spots). */
export const PED: Record<'learn' | 'assess' | 'compete' | 'prove' | 'reward', Box> = {
  learn: { x: 831, y: 322, w: 108, h: 102 },
  assess: { x: 1033, y: 270, w: 102, h: 101 },
  compete: { x: 1198, y: 234, w: 94, h: 92 },
  prove: { x: 1367, y: 220, w: 84, h: 81 },
  reward: { x: 1508, y: 186, w: 76, h: 82 },
};

export const center = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

export function Stone({
  box,
  type,
  state,
  label,
  n,
  selected,
  small,
  onClick,
  tip,
  children,
  className = '',
}: {
  box: Box;
  type: StageType;
  state: StageState;
  label?: string;
  n?: number;
  selected?: boolean;
  small?: boolean;
  onClick?: () => void;
  tip?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const tone = state === 'current' ? 'fire' : type === 'compete' || type === 'prove' ? (state === 'locked' ? 'gold' : 'fire') : 'silver';
  const glyph = Math.round(box.w * (small ? 0.42 : 0.4));
  const style: CSSProperties = { left: WX(box.x), top: box.y, width: box.w, height: box.h, ['--fs' as string]: `${Math.max(10, box.w * 0.138)}px` };
  return (
    <div className={`em-stone is-${state} t-${type}${selected ? ' is-selected' : ''}${small ? ' is-small' : ''}${box.y < 250 ? ' tip-below' : ''}${box.x + box.w / 2 > 1460 ? ' tip-end' : ''}${box.x + box.w / 2 < 960 ? ' tip-side' : ''} ${className}`} style={style}>
      <button type="button" className="em-stone__body" onClick={onClick} aria-label={`${label ?? TYPE_LABEL[type]} — ${state}`}>
        <span className="em-stone__ic">
          <StageGlyph type={type} size={glyph} tone={tone} />
        </span>
        {!small && <span className="em-stone__label">{label ?? TYPE_LABEL[type]}</span>}
        {small && n != null && <span className="em-stone__num">{n}</span>}
      </button>
      {state === 'done' && (
        <i className="em-stone__badge is-done" aria-hidden>
          <Check size={small ? 10 : 12} strokeWidth={3.2} />
        </i>
      )}
      {state === 'locked' && (
        <i className="em-stone__badge is-locked" aria-hidden>
          <Lock size={small ? 9 : 10} strokeWidth={2.6} />
        </i>
      )}
      {!small && n != null && <i className="em-stone__n">{n}</i>}
      {tip && <div className="em-tip">{tip}</div>}
      {children}
    </div>
  );
}

/** A glowing socket on the rock, for stones that stand where the painting has no pedestal. */
export function Socket({ x, y, w = 74, state = 'locked' }: { x: number; y: number; w?: number; state?: StageState }) {
  return <i className={`em-socket is-${state}`} style={{ left: WX(x) - w / 2, top: y - w * 0.13, width: w, height: w * 0.26 }} aria-hidden />;
}

/** A path drawn over the world: lit (done), live (current → next), cold (locked) or branch (dashed). */
export function Trail({ d, kind }: { d: string; kind: 'lit' | 'live' | 'cold' | 'branch' }) {
  return (
    <svg className={`em-trail is-${kind}`} width="1444" height="941" viewBox="0 0 1444 941" aria-hidden>
      <path d={d} transform="translate(-228 0)" />
    </svg>
  );
}

export function Tip({ title, kicker, rows }: { title: string; kicker: string; rows: [string, string][] }) {
  return (
    <>
      <span className="em-tip__k">{kicker}</span>
      <b className="em-tip__t">{title}</b>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
