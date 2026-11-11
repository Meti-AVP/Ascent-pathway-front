import type { CSSProperties } from 'react';
import './backdrop.css';

/** Deterministic pseudo-random so the flecks sit in the same place on every load. */
function rand(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const FLECKS = Array.from({ length: 30 }, (_, i) => ({
  left: 28 + rand(i, 1) * 66,
  top: 16 + rand(i, 2) * 80,
  size: 5 + rand(i, 3) * 13,
  delay: -rand(i, 4) * 14,
  dur: 9 + rand(i, 5) * 9,
  tone: rand(i, 6) > 0.82 ? 'y' : rand(i, 6) > 0.62 ? 'o' : 's',
  shard: rand(i, 7) > 0.68,
}));

/** Thin tapered darts that ride up the line of the stroke. */
const DARTS = [
  { left: 39, top: 78, w: 260, d: 0, dur: 7.5, tone: 's' },
  { left: 47, top: 60, w: 180, d: -2.6, dur: 6.8, tone: 'o' },
  { left: 56, top: 47, w: 320, d: -4.4, dur: 8.2, tone: 's' },
  { left: 63, top: 30, w: 150, d: -1.2, dur: 6.2, tone: 'y' },
  { left: 70, top: 22, w: 230, d: -5.6, dur: 7.8, tone: 's' },
  { left: 33, top: 92, w: 140, d: -3.4, dur: 6.6, tone: 'o' },
  { left: 76, top: 40, w: 120, d: -0.6, dur: 7.1, tone: 's' },
];

/** Out-of-focus paint chips on the nearest plane: they move most with the pointer. */
const CHIPS = [
  { left: 16, top: 90, s: 46, tone: 'o', dur: 8.5 },
  { left: 66, top: 7, s: 30, tone: 's', dur: 9.6 },
  { left: 96, top: 63, s: 38, tone: 's', dur: 7.8 },
  { left: 85, top: 96, s: 24, tone: 'y', dur: 8.9 },
];

/**
 * Everything behind the character, back to front:
 * the city (empty for now) · far planes and a ghosted word · a dial ring · the leaning slabs,
 * each drawn inside · the halftone field and a coarse print in heat · the rising burnt-orange
 * dry-brush stroke with its yellow and silver accents · darts · paint chips · flecks.
 * Each layer shifts by a different amount with the pointer (--px / --py, written onto every
 * .bg-layer and .bg-city by Home.tsx; a nested layer that should move gets .bg-layer too) and
 * breathes a little on its own, which is what gives the screen its depth.
 */
export function Backdrop() {
  return (
    <div className="bg" aria-hidden="true">
      <div className="bg-city" />

      <div className="bg-layer bg-far">
        <i className="k k-facets bg-far-facets" />
        <i className="k k-facets is-b bg-far-facets is-low" />
        <i className="bg-slab is-d" />
        <span className="bg-ghost">Ascent</span>
      </div>

      <div className="bg-layer bg-ring">
        <svg viewBox="0 0 1000 1000">
          <circle className="ring-line" cx="500" cy="500" r="470" />
          <circle className="ring-ticks" cx="500" cy="500" r="446" pathLength={1200} />
          <circle className="ring-major" cx="500" cy="500" r="446" pathLength={1200} />
          <circle className="ring-arc" cx="500" cy="500" r="470" pathLength={1000} />
          <circle className="ring-arc is-b" cx="500" cy="500" r="486" pathLength={1000} />
        </svg>
      </div>

      <div className="bg-layer bg-slabs">
        <i className="bg-slab is-a">
          <i className="k k-facets is-b" />
          <i className="k k-hatch is-fade" />
          <i className="k k-grain" />
        </i>
        <i className="bg-slab is-b">
          <i className="k k-halftone" />
        </i>
        <i className="bg-slab is-c" />
      </div>

      <div className="bg-layer bg-dots" />
      <div className="bg-layer bg-dots-heat" />

      <svg className="bg-layer bg-ink" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* bristle edges: noise stretched along the stroke, pushed through a displacement map */}
          <filter id="ink-rough" x="-4%" y="-30%" width="108%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.09" numOctaves="3" seed="11" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="74" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="ink-fine" x="-4%" y="-60%" width="108%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.01 0.16" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="30" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <linearGradient id="ink-orange" x1="0" x2="1" y1="0" y2="0">
            <stop className="ink-s0" offset="0" />
            <stop className="ink-s1" offset="0.28" />
            <stop className="ink-s2" offset="0.72" />
            <stop className="ink-s3" offset="1" />
          </linearGradient>
          {/* the strands a dry brush leaves: thin lines along the stroke, broken and uneven */}
          <pattern id="ink-streaks" width="420" height="22" patternUnits="userSpaceOnUse">
            <rect className="ink-dark" x="0" y="2" width="300" height="1.8" opacity="0.5" />
            <rect className="ink-lite" x="120" y="7" width="300" height="1.2" opacity="0.45" />
            <rect className="ink-dark" x="40" y="12" width="380" height="2.6" opacity="0.32" />
            <rect className="ink-lite" x="0" y="17.5" width="200" height="1" opacity="0.4" />
            <rect className="ink-dark" x="250" y="19.5" width="170" height="1.4" opacity="0.4" />
          </pattern>
          <clipPath id="ink-reveal">
            <rect className="bg-ink-reveal" x="-80" y="-420" width="1900" height="840" />
          </clipPath>
        </defs>

        {/* drawn flat, then turned to rise from lower-left to upper-right behind the character */}
        <g transform="translate(945 578) rotate(-52.5)">
          <g clipPath="url(#ink-reveal)">
            {/* a fine silver pass under the stroke */}
            <g filter="url(#ink-fine)">
              <path className="ink-silver" d="M-600 168C-240 196 200 194 660 132 220 182-240 188-600 168Z" />
            </g>
            <g filter="url(#ink-rough)">
              <path
                fill="url(#ink-orange)"
                d="M-760 30C-520-70-180-140 220-128 520-118 760-70 900-10 760 6 780 44 900 70 640 126 300 160-40 150-340 140-600 104-760 30Z"
              />
              <path
                fill="url(#ink-streaks)"
                d="M-760 30C-520-70-180-140 220-128 520-118 760-70 900-10 760 6 780 44 900 70 640 126 300 160-40 150-340 140-600 104-760 30Z"
              />
              {/* bristle marks: darker and lighter passes inside the stroke */}
              <path className="ink-dark" opacity="0.55" d="M-600 66C-300 110 60 126 420 96 180 136-260 140-600 66Z" />
              <path className="ink-dark" opacity="0.4" d="M-300-22C0-44 360-40 700-4 360-22 0-26-300-22Z" />
              <path className="ink-deep" opacity="0.35" d="M-120 34C200 22 520 30 800 52 520 44 200 40-120 34Z" />
              <path className="ink-lite" opacity="0.5" d="M-380-60C-80-112 300-116 640-66 300-92-60-88-380-60Z" />
              <path className="ink-pale" opacity="0.35" d="M-520 4C-220-22 120-28 420-10 120-14-220-8-520 4Z" />
              <path className="ink-lite" opacity="0.3" d="M-60 86C240 82 500 74 760 40 500 96 240 104-60 86Z" />
              {/* the brush runs dry at the tail: the page shows through between the strands */}
              <path className="ink-gap" opacity="0.75" d="M-770 12C-660-14-560-30-440-38-560-22-660-4-770 12Z" />
              <path className="ink-gap" opacity="0.6" d="M-760 58C-650 52-560 60-470 76-560 66-650 62-760 58Z" />
              <path className="ink-gap" opacity="0.5" d="M-720 88C-640 96-560 106-500 118-570 112-640 104-720 88Z" />
            </g>
            <g filter="url(#ink-fine)">
              <path className="ink-go" d="M-640-206C-280-226 120-228 560-204 120-212-280-208-640-206Z" />
              <path className="ink-go" opacity="0.7" d="M200-180C380-190 560-186 760-160 560-176 380-180 200-180Z" />
              {/* flicked paint off both ends */}
              <ellipse className="ink-hot" cx="-690" cy="-150" rx="26" ry="7" />
              <ellipse className="ink-hot" cx="-742" cy="150" rx="15" ry="5" />
              <ellipse className="ink-go" cx="640" cy="-250" rx="20" ry="5" />
              <ellipse className="ink-hot" cx="960" cy="-40" rx="18" ry="5" />
              <ellipse className="ink-hot" cx="1010" cy="40" rx="9" ry="3.5" />
              <ellipse className="ink-dark" cx="985" cy="96" rx="12" ry="4" />
              <ellipse className="ink-go" cx="1060" cy="-12" rx="7" ry="3" />
              <ellipse className="ink-hot" cx="-820" cy="80" rx="10" ry="4" />
              <ellipse className="ink-dark" cx="-850" cy="10" rx="7" ry="3" />
            </g>
          </g>
        </g>
      </svg>

      <div className="bg-layer bg-darts">
        {DARTS.map((d, i) => (
          <i
            key={i}
            className={`bg-dart is-${d.tone}`}
            style={
              {
                left: `${d.left}%`,
                top: `${d.top}%`,
                '--w': d.w,
                animationDelay: `${d.d}s`,
                animationDuration: `${d.dur}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="bg-layer bg-flecks">
        {FLECKS.map((f, i) => (
          <i
            key={i}
            className={`bg-fleck is-${f.tone}${f.shard ? ' is-shard' : ''}`}
            style={
              {
                left: `${f.left}%`,
                top: `${f.top}%`,
                '--s': f.size,
                animationDelay: `${f.delay}s`,
                animationDuration: `${f.dur}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="bg-layer bg-near">
        {CHIPS.map((c, i) => (
          <i
            key={i}
            className={`bg-chip is-${c.tone}`}
            style={{ left: `${c.left}%`, top: `${c.top}%`, '--s': c.s, animationDuration: `${c.dur}s` } as CSSProperties}
          />
        ))}
      </div>

      <div className="bg-vignette" />
      <i className="k k-grain bg-grain" />
    </div>
  );
}
