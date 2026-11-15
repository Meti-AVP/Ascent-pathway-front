import { useMemo, type CSSProperties, type ReactNode } from 'react';

// SVG filters used across the direction. Rendered once by the App.
export function FxDefs() {
  return (
    <svg className="tp-defs" aria-hidden width="0" height="0">
      <defs>
        {/* dry brush: rough edges, then horizontal bristle streaks bitten out of the ink */}
        <filter id="tp-dry" x="-6%" y="-25%" width="112%" height="150%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.045 0.075" numOctaves="2" seed="4" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="6" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.55" numOctaves="2" seed="11" result="fib" />
          <feColorMatrix in="fib" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -16 0 0 0 11.6" result="streak" />
          <feComposite in="rough" in2="streak" operator="in" result="dry" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="2" result="grit" />
          <feColorMatrix in="grit" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -12 0 0 0 9.4" result="gritA" />
          <feComposite in="dry" in2="gritA" operator="in" />
        </filter>
        {/* rough edges only (splatter, swooshes) */}
        <filter id="tp-rough" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* warm VHS chroma split: a red ghost to the right, no cyan */}
        <filter id="tp-chroma" x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0.25 0 0 0  0 0 0.1 0 0  0 0 0 0.75 0" result="r" />
          <feOffset in="r" dx="2.5" dy="0" result="rs" />
          <feBlend in="SourceGraphic" in2="rs" mode="screen" result="split" />
          <feTurbulence type="fractalNoise" baseFrequency="0 0.6" numOctaves="1" seed="3" result="lines" />
          <feDisplacementMap in="split" in2="lines" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

// ——— seeded randomness ———
export function rng(seed: number) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function blobPath(cx: number, cy: number, r: number, rnd: () => number, n = 13) {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.74 + rnd() * 0.5);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  const mid = (a: [number, number], b: [number, number]) => `${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`;
  const last = pts[n - 1]!;
  let d = `M ${mid(last, pts[0]!)}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % n]!;
    d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${mid(p, q)}`;
  }
  return d + ' Z';
}

function dropPath(cx: number, cy: number, len: number, w: number, ang: number) {
  // a teardrop pointing along ang
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const tip = [cx + c * len, cy + s * len];
  const l = [cx - s * w, cy + c * w];
  const r = [cx + s * w, cy - c * w];
  const back = [cx - c * w * 1.2, cy - s * w * 1.2];
  return `M ${tip[0]} ${tip[1]} Q ${l[0]} ${l[1]} ${back[0]} ${back[1]} Q ${r[0]} ${r[1]} ${tip[0]} ${tip[1]} Z`;
}

/** A cluster of ink splatter, deterministic per seed. */
export function Splatter({ seed = 1, className, style, size = 1 }: { seed?: number; className?: string; style?: CSSProperties; size?: number }) {
  const paths = useMemo(() => {
    const rnd = rng(seed);
    const out: string[] = [];
    const main = 9 + rnd() * 9 * size;
    out.push(blobPath(60, 60, main, rnd, 15));
    const dir = rnd() * Math.PI * 2;
    const sats = 4 + Math.floor(rnd() * 4);
    for (let i = 0; i < sats; i++) {
      const a = dir + (rnd() - 0.5) * 2.4;
      const d = main * (1.3 + rnd() * 1.9);
      out.push(blobPath(60 + Math.cos(a) * d, 60 + Math.sin(a) * d, 1.6 + rnd() * 5, rnd, 9));
    }
    for (let i = 0; i < 7; i++) {
      const a = rnd() * Math.PI * 2;
      const d = main * (2.2 + rnd() * 2.6);
      out.push(blobPath(60 + Math.cos(a) * d, 60 + Math.sin(a) * d, 0.7 + rnd() * 1.6, rnd, 7));
    }
    for (let i = 0; i < 2; i++) {
      const a = dir + Math.PI + (rnd() - 0.5) * 1.2;
      out.push(dropPath(60 + Math.cos(a) * main * 0.8, 60 + Math.sin(a) * main * 0.8, main * (1.4 + rnd()), 1.5 + rnd() * 2, a));
    }
    return out;
  }, [seed, size]);
  return (
    <svg className={`tp-splat ${className ?? ''}`} style={style} viewBox="0 0 120 120" aria-hidden>
      <g filter="url(#tp-rough)">
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** A tapered dry-brush stroke (underline / swoosh). */
export function Swoosh({ className, style, seed = 3 }: { className?: string; style?: CSSProperties; seed?: number }) {
  const d = useMemo(() => {
    const rnd = rng(seed);
    const N = 48;
    const top: string[] = [];
    const bot: string[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      // quadratic from (6,18) via (150,30) to (296,8)
      const x = (1 - t) * (1 - t) * 6 + 2 * (1 - t) * t * 150 + t * t * 296;
      const y = (1 - t) * (1 - t) * 18 + 2 * (1 - t) * t * 27 + t * t * 8;
      const w = 7.5 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.45) * (1 - 0.45 * t) + (rnd() - 0.5) * 0.9;
      top.push(`${x.toFixed(1)} ${(y - w).toFixed(1)}`);
      bot.unshift(`${x.toFixed(1)} ${(y + w * 0.8).toFixed(1)}`);
    }
    return `M ${top.join(' L ')} L ${bot.join(' L ')} Z`;
  }, [seed]);
  return (
    <svg className={`tp-swoosh ${className ?? ''}`} style={style} viewBox="0 0 300 34" preserveAspectRatio="none" aria-hidden>
      <path d={d} filter="url(#tp-dry)" />
    </svg>
  );
}

type BrushProps = {
  text: string; // '\n' breaks lines
  as?: 'h1' | 'h2' | 'h3' | 'div' | 'span';
  className?: string;
  style?: CSSProperties;
  glow?: 'orange' | 'yellow' | 'green' | 'red' | 'none';
  children?: ReactNode;
};

/** Huge glowing dry-brush lettering. First letter of each word is set larger, like the reference. */
export function Brush({ text, as: Tag = 'h2', className, style, glow = 'orange', children }: BrushProps) {
  const lines = text.split('\n');
  return (
    <Tag className={`tp-brush tp-brush--${glow} ${className ?? ''}`} style={style} aria-label={text.replace(/\n/g, ' ')}>
      <span className="tp-brush__ink" aria-hidden>
        {lines.map((line, li) => (
          <span className="tp-brush__line" key={li}>
            {line.split(' ').map((w, wi) => (
              <span key={wi}>
                {wi > 0 && ' '}
                <span className="tp-brush__w">
                  <span className="tp-brush__cap">{w.slice(0, 1)}</span>
                  {w.slice(1)}
                </span>
              </span>
            ))}
          </span>
        ))}
      </span>
      {children}
    </Tag>
  );
}
