import type { CSSProperties } from 'react';

/** Deterministic pseudo-random so the flecks sit in the same place on every load. */
function rand(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const FLECKS = Array.from({ length: 22 }, (_, i) => ({
  left: 30 + rand(i, 1) * 62,
  top: 18 + rand(i, 2) * 78,
  size: 5 + rand(i, 3) * 13,
  delay: -rand(i, 4) * 14,
  dur: 9 + rand(i, 5) * 9,
  tone: rand(i, 6) > 0.82 ? 'y' : rand(i, 6) > 0.66 ? 'o' : 's',
}));

/**
 * Everything behind the character. The page is black; the picture is made of two things:
 * leaning graphite slabs for depth and one rising stroke of burnt-orange paint — the "ascent".
 * Each layer shifts by a different amount with the pointer (see --px / --py on .home), which
 * is what gives the screen its depth.
 */
export function Backdrop() {
  return (
    <div className="bg" aria-hidden="true">
      <div className="bg-layer bg-slabs">
        <i className="bg-slab is-a" />
        <i className="bg-slab is-b" />
        <i className="bg-slab is-c" />
      </div>

      <div className="bg-layer bg-dots" />

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
            <stop offset="0" stopColor="#7d2c0e" />
            <stop offset="0.28" stopColor="#cf5220" />
            <stop offset="0.72" stopColor="#ee6a2c" />
            <stop offset="1" stopColor="#ff8a45" />
          </linearGradient>
          <clipPath id="ink-reveal">
            <rect className="bg-ink-reveal" x="-80" y="-420" width="1900" height="840" />
          </clipPath>
        </defs>

        {/* drawn flat, then turned to rise from lower-left to upper-right behind the character */}
        <g transform="translate(945 578) rotate(-52.5)">
          <g clipPath="url(#ink-reveal)">
            <g filter="url(#ink-rough)">
              <path
                fill="url(#ink-orange)"
                d="M-760 30C-520-70-180-140 220-128 520-118 760-70 900-10 760 6 780 44 900 70 640 126 300 160-40 150-340 140-600 104-760 30Z"
              />
              {/* bristle marks: darker and lighter passes inside the stroke */}
              <path fill="#8f3411" opacity="0.55" d="M-600 66C-300 110 60 126 420 96 180 136-260 140-600 66Z" />
              <path fill="#8f3411" opacity="0.4" d="M-300-22C0-44 360-40 700-4 360-22 0-26-300-22Z" />
              <path fill="#7d2c0e" opacity="0.35" d="M-120 34C200 22 520 30 800 52 520 44 200 40-120 34Z" />
              <path fill="#ffb277" opacity="0.5" d="M-380-60C-80-112 300-116 640-66 300-92-60-88-380-60Z" />
              <path fill="#ffc79a" opacity="0.35" d="M-520 4C-220-22 120-28 420-10 120-14-220-8-520 4Z" />
              <path fill="#ffb277" opacity="0.3" d="M-60 86C240 82 500 74 760 40 500 96 240 104-60 86Z" />
            </g>
            <g filter="url(#ink-fine)">
              <path fill="#ffd21f" d="M-640-206C-280-226 120-228 560-204 120-212-280-208-640-206Z" />
              {/* flicked paint off the upper end */}
              <ellipse fill="#ee6a2c" cx="-690" cy="-150" rx="26" ry="7" />
              <ellipse fill="#ee6a2c" cx="-742" cy="150" rx="15" ry="5" />
              <ellipse fill="#ffd21f" cx="640" cy="-250" rx="20" ry="5" />
            </g>
          </g>
        </g>
      </svg>

      <div className="bg-layer bg-flecks">
        {FLECKS.map((f, i) => (
          <i
            key={i}
            className={`bg-fleck is-${f.tone}`}
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

      <div className="bg-vignette" />
    </div>
  );
}
