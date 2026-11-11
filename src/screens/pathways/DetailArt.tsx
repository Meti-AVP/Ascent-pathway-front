import { createContext, useContext, useId, useSyncExternalStore, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { ArenaId, StageKind } from '../../data/pathways';
import { cubic, cubicAt, hexagon, lerpPath, polar, quad, r1, rng, rounded, sector, starPath, type P } from './DetailShape';
import { ArenaGlyph } from './StageArt';

/*
  The stage detail's hero object, one per stage kind, drawn as a lit 3D object in SVG:
    battle      the arena's crest on a spiked, riveted steel shield, two blades crossed behind
    course      a leather tome: a ridged spine, tooled cover, steel corners, strap, lock, ribbons
    assessment  a clipboard: papers with a checklist and a chart, the clip, a pencil, a gauge
    cup         a polished trophy: fluted bowl, beaded lip, scrolled handles, two-step plinth

  Every object is drawn in a 560 × 780 field, one unit per --u, under the same light: a key from
  the upper left, a cool rim where it crosses onto the page, a warm bounce from the heat band
  behind it. Each has five tones and more per material, panel seams, bolts, glowing heat lights,
  wear, a brushed-ink texture, specular glints, a cast shadow and a 6 u heat "sticker" outline
  with a fine dark keyline. The colours are the object's own, the same in both themes; only the
  cast shadow follows the theme (--pd-art-shadow). No lettering: the chips say what the stage is.
*/

const pt = (p: P) => `${r1(p[0])} ${r1(p[1])}`;
const mixP = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/* ── shared pieces ─────────────────────────────────────────────── */

function Glint({ p, x, y, s }: { p: string; x: number; y: number; s: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={s * 0.95} fill={`url(#${p}-glow)`} />
      <path d={starPath(x, y, s)} fill="#fff" />
      <path d={starPath(x, y, s * 0.5, 0.22)} fill="#fff" transform={`rotate(45 ${x} ${y})`} opacity=".8" />
    </g>
  );
}

function Rivet({ p, x, y, r = 6 }: { p: string; x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x + r * 0.3} cy={y + r * 0.4} r={r * 1.1} fill="#000" opacity=".55" />
      <circle cx={x} cy={y} r={r} fill={`url(#${p}-rivet)`} />
      <circle cx={x - r * 0.32} cy={y - r * 0.36} r={r * 0.26} fill="#fff" opacity=".9" />
    </g>
  );
}

/** a hex bolt head */
function Bolt({ p, x, y, r = 7, rot = 12 }: { p: string; x: number; y: number; r?: number; rot?: number }) {
  return (
    <g>
      <path d={hexagon(x + r * 0.3, y + r * 0.42, r * 1.08, rot)} fill="#000" opacity=".55" />
      <path d={hexagon(x, y, r, rot)} fill={`url(#${p}-rivet)`} />
      <path d={hexagon(x, y, r * 0.52, rot)} fill="none" stroke="#000" strokeOpacity=".35" strokeWidth="1" />
      <circle cx={x - r * 0.3} cy={y - r * 0.34} r={r * 0.22} fill="#fff" opacity=".85" />
    </g>
  );
}

/** a small heat light, glowing: the reference's lit indicators, in our heat */
function Light({ p, x, y, r = 4.5 }: { p: string; x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 3.6} fill={`url(#${p}-heatGlow)`} />
      <circle cx={x} cy={y} r={r + 1.6} fill="#2a0e04" />
      <circle cx={x} cy={y} r={r} fill="#ff9a5a" />
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.42} fill="#fff" opacity=".95" />
    </g>
  );
}

/** an engraved line: a dark cut with a lit lip under it */
function Seam({ d, w = 2.4, o = 0.6 }: { d: string; w?: number; o?: number }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke="#000" strokeOpacity={o} strokeWidth={w} />
      <path d={d} stroke="#fff" strokeOpacity={r1(o * 0.38)} strokeWidth={w * 0.5} transform="translate(.9 1.3)" />
    </g>
  );
}

/** the ASCENT mark: three chevrons climbing, the emblem of the tome and the trophy */
function Chevrons({ p, s = 1 }: { p: string; s?: number }) {
  const one = (dy: number) => `M${-40 * s} ${(dy + 14) * s}L0 ${(dy - 16) * s}L${40 * s} ${(dy + 14) * s}L${40 * s} ${(dy + 30) * s}L0 ${dy * s}L${-40 * s} ${(dy + 30) * s}Z`;
  const rows = [-26, 2, 30];
  return (
    <g>
      {rows.map((dy) => (
        <path key={`s${dy}`} d={one(dy)} fill="#000" opacity=".5" transform={`translate(${3 * s} ${4 * s})`} />
      ))}
      {rows.map((dy) => (
        <path key={`h${dy}`} d={one(dy)} fill="#fff" opacity=".85" transform={`translate(${-1.4 * s} ${-1.6 * s})`} />
      ))}
      {rows.map((dy, i) => (
        <path key={dy} d={one(dy)} fill={`url(#${p}-emblem)`} opacity={1 - i * 0.1} />
      ))}
    </g>
  );
}

/** pale wear along an outline: tiny chips where the edge has been knocked */
function Wear({ pts, seed, o = 0.4 }: { pts: P[]; seed: number; o?: number }) {
  const r = rng(seed);
  return (
    <g fill="#fff">
      {pts.map(([x, y], i) => {
        const a = r();
        return <ellipse key={i} cx={r1(x)} cy={r1(y)} rx={r1(0.8 + a * 2.2)} ry={r1(0.5 + r() * 1.1)} opacity={r1(o * (0.45 + a * 0.55))} transform={`rotate(${Math.round(r() * 180)} ${r1(x)} ${r1(y)})`} />;
      })}
    </g>
  );
}

type Stop = [number, string, number?];

/** the gradients and textures every drawing shares; ids are prefixed per screen */
function Defs({ p }: { p: string }) {
  const lin = (id: string, stops: Stop[], x2 = 1, y2 = 1, x1 = 0, y1 = 0) => (
    <linearGradient id={`${p}-${id}`} x1={x1} y1={y1} x2={x2} y2={y2}>
      {stops.map(([o, c, a], i) => (
        <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />
      ))}
    </linearGradient>
  );
  return (
    <defs>
      {lin('steel', [
        [0, '#b4bbc5'],
        [0.26, '#6a7280'],
        [0.52, '#3a4049'],
        [0.78, '#20242a'],
        [1, '#101215'],
      ])}
      {lin('rim', [
        [0, '#f2f4f7'],
        [0.18, '#b2b9c3'],
        [0.4, '#69717d'],
        [0.62, '#363b44'],
        [0.82, '#1d2026'],
        [1, '#121417'],
      ])}
      {lin('frame', [
        [0, '#4e5560'],
        [0.5, '#24282e'],
        [1, '#0d0f12'],
      ])}
      {lin('back', [
        [0, '#07080a'],
        [0.55, '#171a1f'],
        [0.88, '#323843'],
        [1, '#98a2b0'],
      ], 1, 0)}
      {lin('hi', [
        [0, '#fff', 0.95],
        [0.3, '#fff', 0.42],
        [0.55, '#fff', 0],
      ])}
      {lin('lo', [
        [0.42, '#000', 0],
        [1, '#000', 0.8],
      ])}
      {lin('lotl', [
        [0, '#000', 0.88],
        [0.42, '#000', 0.28],
        [0.68, '#000', 0],
      ])}
      {lin('hibr', [
        [0.45, '#fff', 0],
        [1, '#fff', 0.5],
      ])}
      {lin('heat', [
        [0, '#ff9555'],
        [0.42, '#e2601f'],
        [1, '#952f0c'],
      ], 0, 1)}
      {lin('spikeL', [
        [0, '#e3e7ec'],
        [1, '#7d8592'],
      ], 1, 0)}
      {lin('spikeD', [
        [0, '#454b55'],
        [1, '#15171b'],
      ], 1, 0)}
      {lin('chromeH', [
        [0, '#202329'],
        [0.07, '#59616d'],
        [0.18, '#d8dce2'],
        [0.25, '#ffffff'],
        [0.33, '#a8afb9'],
        [0.47, '#3c424c'],
        [0.56, '#252930'],
        [0.68, '#6f7783'],
        [0.8, '#cdd2d9'],
        [0.9, '#4a515c'],
        [1, '#17191d'],
      ], 1, 0)}
      {lin('chromeV', [
        [0, '#f7f8fa'],
        [0.28, '#b6bdc7'],
        [0.52, '#5f6672'],
        [0.78, '#2c3038'],
        [1, '#17191d'],
      ], 0, 1)}
      {lin('barrel', [
        [0, '#4d545f'],
        [0.3, '#f2f4f6'],
        [0.5, '#a1a8b2'],
        [0.78, '#3c424b'],
        [1, '#1b1e23'],
      ], 0, 1)}
      {lin('bladeL', [
        [0, '#f6f7f9'],
        [0.5, '#cdd2d9'],
        [1, '#98a0ab'],
      ], 1, 0)}
      {lin('bladeR', [
        [0, '#5f6774'],
        [0.5, '#3f454f'],
        [1, '#262a31'],
      ], 1, 0)}
      {lin('emblem', [
        [0, '#ffffff'],
        [0.34, '#e0e4e9'],
        [0.58, '#8c939e'],
        [0.8, '#cbd0d6'],
        [1, '#6a717c'],
      ], 0, 1)}
      {lin('leather', [
        [0, '#5f4f43'],
        [0.22, '#3e342c'],
        [0.5, '#28211c'],
        [0.78, '#18140f'],
        [1, '#0d0b08'],
      ])}
      {lin('spine', [
        [0, '#0b0907'],
        [0.35, '#4a3d33'],
        [0.55, '#6e5b4c'],
        [0.8, '#2a231d'],
        [1, '#100d0a'],
      ], 1, 0)}
      {lin('strap', [
        [0, '#6e5c4d'],
        [0.35, '#4b4036'],
        [1, '#221c17'],
      ], 0, 1)}
      {lin('pages', [
        [0, '#8a8171'],
        [0.12, '#d6cfbf'],
        [0.42, '#f4efe5'],
        [0.8, '#ddd5c6'],
        [1, '#9b9281'],
      ], 1, 0)}
      {lin('pagesTop', [
        [0, '#fbf8f1'],
        [1, '#d2cbbb'],
      ], 0, 0, 0, 1)}
      {lin('paper', [
        [0, '#ffffff'],
        [0.5, '#f2f2ef'],
        [0.85, '#dededa'],
        [1, '#cacac4'],
      ])}
      {lin('board', [
        [0, '#4b515b'],
        [0.3, '#30343b'],
        [0.65, '#1c1f24'],
        [1, '#0d0f12'],
      ])}
      {lin('bezel', [
        [0, '#f7f8fa'],
        [0.22, '#b0b7c1'],
        [0.46, '#4b525d'],
        [0.68, '#c3c9d1'],
        [1, '#23272d'],
      ])}
      {lin('needle', [
        [0, '#c2c8d0'],
        [1, '#ffffff'],
      ], 1, 0)}
      {lin('interior', [
        [0, '#6f7783'],
        [0.35, '#2a2e35'],
        [1, '#07080a'],
      ], 0, 1)}
      {lin('shadeDown', [
        [0.3, '#000', 0],
        [1, '#000', 0.48],
      ], 0, 1)}
      {lin('plinthTop', [
        [0, '#a1a8b2'],
        [0.6, '#5d646f'],
        [1, '#383d45'],
      ], 1, 0)}
      {lin('plinth', [
        [0, '#3e434c'],
        [0.4, '#24272d'],
        [1, '#0c0d10'],
      ])}
      {lin('coolRim', [
        [0, '#dfe8f5', 0],
        [1, '#eef4ff', 0.9],
      ], 1, 0)}
      {lin('pencil', [
        [0, '#ffa166'],
        [0.33, '#ff8a45'],
        [0.34, '#e2601f'],
        [0.66, '#c85219'],
        [0.67, '#8f300c'],
        [1, '#6e240a'],
      ], 0, 1)}
      {lin('wood', [
        [0, '#f1d6b2'],
        [1, '#b88f62'],
      ], 0, 1)}
      <radialGradient id={`${p}-field`} cx=".3" cy=".2" r=".95">
        <stop offset="0" stopColor="#626a77" />
        <stop offset=".3" stopColor="#3d434d" />
        <stop offset=".62" stopColor="#23272e" />
        <stop offset="1" stopColor="#0e1013" />
      </radialGradient>
      <radialGradient id={`${p}-heatR`} cx=".36" cy=".3" r=".85">
        <stop offset="0" stopColor="#ffc49a" />
        <stop offset=".26" stopColor="#f57b3e" />
        <stop offset=".6" stopColor="#c44d1a" />
        <stop offset="1" stopColor="#561c07" />
      </radialGradient>
      <radialGradient id={`${p}-face`} cx=".42" cy=".36" r=".7">
        <stop offset="0" stopColor="#2c3038" />
        <stop offset=".6" stopColor="#15171b" />
        <stop offset="1" stopColor="#060708" />
      </radialGradient>
      <radialGradient id={`${p}-rivet`} cx=".36" cy=".32" r=".7">
        <stop offset="0" stopColor="#f5f7f9" />
        <stop offset=".3" stopColor="#a7aeb9" />
        <stop offset=".7" stopColor="#464c56" />
        <stop offset="1" stopColor="#16181c" />
      </radialGradient>
      <radialGradient id={`${p}-glow`}>
        <stop offset="0" stopColor="#fff" stopOpacity=".9" />
        <stop offset=".22" stopColor="#fff" stopOpacity=".35" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${p}-heatGlow`}>
        <stop offset="0" stopColor="#ff9a5a" stopOpacity=".85" />
        <stop offset=".35" stopColor="#ff7a3a" stopOpacity=".35" />
        <stop offset="1" stopColor="#ff7a3a" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${p}-sheen`} cx=".3" cy=".25" r=".7">
        <stop offset="0" stopColor="#fff" stopOpacity=".22" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${p}-pool`}>
        <stop offset="0" stopColor="#000" stopOpacity=".78" />
        <stop offset=".6" stopColor="#000" stopOpacity=".36" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
      {/* brushed metal, leather grain, carbon weave, hex mesh, and a brushed-ink stroke texture */}
      <pattern id={`${p}-brush`} width="7" height="3.2" patternUnits="userSpaceOnUse">
        <rect width="7" height=".7" fill="#fff" opacity=".06" />
      </pattern>
      <pattern id={`${p}-grain`} width="9" height="9" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2.5" r=".9" fill="#fff" opacity=".08" />
        <circle cx="6.5" cy="6" r="1.2" fill="#000" opacity=".26" />
        <circle cx="7" cy="1.5" r=".6" fill="#fff" opacity=".06" />
        <circle cx="3.5" cy="7.5" r=".8" fill="#000" opacity=".2" />
      </pattern>
      <pattern id={`${p}-weave`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="10" fill="#fff" opacity=".045" />
        <rect width="10" height="1.2" fill="#000" opacity=".3" />
        <rect x="5" y="5" width="5" height="1.2" fill="#000" opacity=".22" />
      </pattern>
      <pattern id={`${p}-hex`} width="18" height="31.2" patternUnits="userSpaceOnUse">
        <path d="M9 0L18 5.2V15.6L9 20.8L0 15.6V5.2ZM9 20.8V31.2" fill="none" stroke="#fff" strokeOpacity=".07" strokeWidth="1.1" />
      </pattern>
      <pattern id={`${p}-ink`} width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">
        <path d="M2 6h14M22 3h9M35 9h8M5 17h7M16 21h18M38 24h6M2 31h11M19 35h8M30 38h13M8 43h9" stroke="#000" strokeOpacity=".2" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M9 12h8M27 15h10M3 26h6M24 29h9M14 40h6" stroke="#fff" strokeOpacity=".08" strokeWidth="1" strokeLinecap="round" />
      </pattern>
      <filter id={`${p}-blur`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="13" />
      </filter>
    </defs>
  );
}

/** the cast shadow's colour: the page's own shade, so it sits right on either theme */
const Shade = createContext('rgba(0, 0, 0, 0.62)');

/**
 * The silhouette of an object, drawn three times: the cast shadow (blurred, offset), the dark
 * keyline and the heat sticker. `s` is the drawing's own scale, so the outline stays 6 u.
 */
function Sticker({ p, s = 1, children }: { p: string; s?: number; children: ReactNode }) {
  return (
    <>
      <g className="da-cast" fill={useContext(Shade)} filter={`url(#${p}-blur)`} transform={`translate(${r1(26 / s)} ${r1(32 / s)})`}>
        {children}
      </g>
      <g fill="#120805" stroke="#120805" strokeWidth={r1(17 / s)} strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
      <g fill="#ee6a2c" stroke="#ee6a2c" strokeWidth={r1(12 / s)} strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
    </>
  );
}

/* ── battle: the arena's crest on a steel shield ───────────────── */

const S_FACE = 'M-174 -252Q0 -282 174 -252Q194 -248 195 -228L198 -80C195 72 123 182 0 272C-123 182 -195 72 -198 -80L-195 -228Q-194 -248 -174 -252Z';
const S_FIELD = 'M-152 -221Q0 -247 152 -221Q166 -218 166 -205L168 -80C165 50 105 142 0 224C-105 142 -165 50 -168 -80L-166 -205Q-166 -218 -152 -221Z';
const S_MID = lerpPath(S_FACE, S_FIELD, 0.62);
const S_LINE = lerpPath(S_FACE, S_FIELD, 0.82);
const BLADE = 'M0 -470L17 -414L20 170L-20 170L-17 -414Z';
const GUARD = 'M-74 174Q-84 160 -92 146Q-76 148 -64 158L64 158Q76 148 92 146Q84 160 74 174L74 190Q0 199 -74 190Z';

const F_TOP: [P, P, P] = [[-174, -252], [0, -282], [174, -252]];
const F_CUB: [P, P, P, P] = [[198, -80], [195, 72], [123, 182], [0, 272]];
const D_TOP: [P, P, P] = [[-152, -221], [0, -247], [152, -221]];
const D_CUB: [P, P, P, P] = [[168, -80], [165, 50], [105, 142], [0, 224]];

type Spike = { lit: P; dark: P; mid: P; tip: P };

const SPIKES: Spike[] = (() => {
  const out: Spike[] = [];
  const add = (p: P, nRaw: P, L: number, w: number) => {
    const l = Math.hypot(nRaw[0], nRaw[1]);
    const n: P = [nRaw[0] / l, nRaw[1] / l];
    const t: P = [-n[1], n[0]];
    const base: P = [p[0] - n[0] * 7, p[1] - n[1] * 7];
    const a: P = [base[0] + t[0] * w, base[1] + t[1] * w];
    const b: P = [base[0] - t[0] * w, base[1] - t[1] * w];
    const tip: P = [p[0] + n[0] * L, p[1] + n[1] * L];
    const aLit = a[0] + a[1] < b[0] + b[1];
    out.push({ lit: aLit ? a : b, dark: aLit ? b : a, mid: base, tip });
  };
  for (const side of [1, -1] as const) {
    const m = (q: P): P => [q[0] * side, q[1]];
    add(m([189, -246]), m([0.62, -0.78]), 54, 15);
    add(m([196.7, -150]), m([1, 0.03]), 34, 11);
    for (const [t, L, w] of [
      [0.3, 36, 11],
      [0.62, 32, 10],
    ] as const) {
      const { p, n } = cubicAt(F_CUB[0], F_CUB[1], F_CUB[2], F_CUB[3], t, 1);
      add(m(p), m(n), L, w);
    }
  }
  add([0, 268], [0, 1], 42, 13);
  return out;
})();

const S_RIVETS: P[] = (() => {
  const out: P[] = [];
  const top: [P, P, P] = [mixP(F_TOP[0], D_TOP[0], 0.3), mixP(F_TOP[1], D_TOP[1], 0.3), mixP(F_TOP[2], D_TOP[2], 0.3)];
  for (const t of [0.12, 0.31, 0.5, 0.69, 0.88]) out.push(quad(top[0], top[1], top[2], t));
  for (const side of [1, -1]) {
    for (const y of [-200, -104]) out.push([188 * side, y]);
    for (const t of [0.22, 0.46, 0.7]) {
      const f = cubic(F_CUB[0], F_CUB[1], F_CUB[2], F_CUB[3], t);
      const d = cubic(D_CUB[0], D_CUB[1], D_CUB[2], D_CUB[3], t);
      const q = mixP(f, d, 0.3);
      out.push([q[0] * side, q[1]]);
    }
  }
  return out;
})();

/** seams across the rim: from the outer edge to the frame, between the rivets */
const S_SEAMS: string[] = (() => {
  const out: string[] = [];
  for (const t of [0.215, 0.785]) {
    const f = quad(F_TOP[0], F_TOP[1], F_TOP[2], t);
    const d = quad(D_TOP[0], D_TOP[1], D_TOP[2], t);
    out.push(`M${pt(f)}L${pt(mixP(f, d, 0.6))}`);
  }
  for (const side of [1, -1]) {
    out.push(`M${pt([196.8 * side, -152])}L${pt([178.6 * side, -152])}`);
    for (const t of [0.34, 0.58]) {
      const f = cubic(F_CUB[0], F_CUB[1], F_CUB[2], F_CUB[3], t);
      const d = cubic(D_CUB[0], D_CUB[1], D_CUB[2], D_CUB[3], t);
      const a = mixP(f, d, 0.6);
      out.push(`M${pt([f[0] * side, f[1]])}L${pt([a[0] * side, a[1]])}`);
    }
  }
  return out;
})();

/** points along the shield's outer edge, a hair inside, for the wear marks */
const S_EDGE: P[] = (() => {
  const out: P[] = [];
  const r = rng(7);
  for (let i = 0; i < 34; i++) {
    const q = quad(F_TOP[0], F_TOP[1], F_TOP[2], r());
    out.push([q[0], q[1] + 3 + r() * 3]);
  }
  for (let i = 0; i < 46; i++) {
    const f = cubic(F_CUB[0], F_CUB[1], F_CUB[2], F_CUB[3], r());
    const side = r() < 0.5 ? 1 : -1;
    out.push([(f[0] - 3 - r() * 3) * side, f[1] - 2]);
  }
  for (let i = 0; i < 14; i++) out.push([(193 + r() * 2) * (r() < 0.5 ? 1 : -1), -226 + r() * 140]);
  return out;
})();

function Sword({ p, rot, flip }: { p: string; rot: number; flip?: boolean }) {
  return (
    <g transform={`rotate(${rot}) ${flip ? 'scale(-1 1)' : ''}`}>
      {/* blade: a lit half and a shaded half either side of the ridge, an engraved fuller */}
      <path d="M0 -470L-17 -414L-20 170L0 170Z" fill={`url(#${p}-bladeL)`} />
      <path d="M0 -470L17 -414L20 170L0 170Z" fill={`url(#${p}-bladeR)`} />
      <path d="M0 -470L-17 -414L-20 170" fill="none" stroke="#fff" strokeOpacity=".95" strokeWidth="1.6" />
      <path d="M0 -470L17 -414L20 170" fill="none" stroke="#000" strokeOpacity=".55" strokeWidth="1.6" />
      <path d="M-4 -370V150M4 -370V150" stroke="#000" strokeOpacity=".3" strokeWidth="1.2" />
      <path d="M0 -380V150" stroke="#000" strokeOpacity=".5" strokeWidth="3.4" />
      <path d="M-2.2 -380V150" stroke="#fff" strokeOpacity=".6" strokeWidth="1.1" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x="-1.6" y={60 + i * 15} width="3.2" height="8" rx="1" fill="#ff8a45" opacity=".75" />
      ))}
      <path d="M-9 -404L-11 -320" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9" />
      <path d="M-14 120L-16 166" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".5" />
      {/* guard: a dark base, a lit front plate, end caps, a heat stone */}
      <path d={GUARD} fill={`url(#${p}-frame)`} />
      <path d="M-62 162H62L56 184Q0 190 -56 184Z" fill={`url(#${p}-steel)`} />
      <path d="M-62 162.5H62" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" />
      <path d="M-74 190Q0 199 74 190" fill="none" stroke="#000" strokeOpacity=".6" strokeWidth="2" />
      <circle cx="-88" cy="148" r="6.5" fill={`url(#${p}-rivet)`} />
      <circle cx="88" cy="148" r="6.5" fill={`url(#${p}-rivet)`} />
      <circle cy="174" r="15" fill={`url(#${p}-heatGlow)`} />
      <path d="M0 162L12 174L0 186L-12 174Z" fill={`url(#${p}-heatR)`} />
      <path d="M0 162L12 174L0 174Z" fill="#fff" opacity=".4" />
      {/* grip wrapped in leather, a collar, the pommel */}
      <rect x="-12" y="194" width="24" height="76" rx="4" fill="#1d1916" />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M-12 ${203 + i * 9}L12 ${197 + i * 9}`} stroke="#5d4f43" strokeWidth="3.2" strokeLinecap="round" />
      ))}
      <path d="M-8 197V268" stroke="#fff" strokeOpacity=".16" strokeWidth="2" />
      <rect x="-15" y="268" width="30" height="9" rx="2" fill={`url(#${p}-steel)`} />
      <path d="M-15 269H15" stroke="#fff" strokeOpacity=".5" strokeWidth="1" />
      <circle cy="294" r="17" fill={`url(#${p}-rivet)`} />
      <circle cy="294" r="17" fill="none" stroke="#000" strokeOpacity=".55" strokeWidth="1.5" />
      <circle cy="296" r="5" fill="#ff8a45" />
      <circle cx="-1.5" cy="294.5" r="1.8" fill="#fff" opacity=".9" />
    </g>
  );
}

function SwordShape({ rot, flip }: { rot: number; flip?: boolean }) {
  return (
    <g transform={`rotate(${rot}) ${flip ? 'scale(-1 1)' : ''}`}>
      <path d={BLADE} />
      <path d={GUARD} />
      <circle cx="-88" cy="148" r="6.5" />
      <circle cx="88" cy="148" r="6.5" />
      <rect x="-15" y="190" width="30" height="88" rx="4" />
      <circle cy="294" r="17" />
    </g>
  );
}

function Shield({ p, arena }: { p: string; arena: ArenaId }) {
  const swords = [
    { rot: 31, flip: false },
    { rot: -31, flip: true },
  ];
  const spike = (s: Spike) => `M${pt(s.lit)}L${pt(s.tip)}L${pt(s.dark)}Z`;
  return (
    <g transform="translate(256 410) rotate(7)">
      <Sticker p={p}>
        <g transform="translate(0 -22)">
          {swords.map((s) => (
            <SwordShape key={s.rot} {...s} />
          ))}
        </g>
        {SPIKES.map((s, i) => (
          <path key={i} d={spike(s)} />
        ))}
        <path d={S_FACE} transform="translate(15 11)" />
        <path d={S_FACE} />
      </Sticker>

      <g transform="translate(0 -22)">
        {swords.map((s) => (
          <Sword key={s.rot} p={p} {...s} />
        ))}
      </g>

      {/* spikes round the rim: a lit face, a shaded face, a bright edge */}
      {SPIKES.map((s, i) => (
        <g key={i}>
          <path d={`M${pt(s.lit)}L${pt(s.tip)}L${pt(s.mid)}Z`} fill={`url(#${p}-spikeL)`} />
          <path d={`M${pt(s.dark)}L${pt(s.tip)}L${pt(s.mid)}Z`} fill={`url(#${p}-spikeD)`} />
          <path d={`M${pt(s.lit)}L${pt(s.tip)}`} stroke="#fff" strokeOpacity=".85" strokeWidth="1.4" />
          <path d={`M${pt(s.mid)}L${pt(s.tip)}`} stroke="#000" strokeOpacity=".35" strokeWidth="1.1" />
        </g>
      ))}

      {/* the shield's thickness, with the cool rim where it meets the page */}
      <path d={S_FACE} transform="translate(15 11)" fill={`url(#${p}-back)`} />
      <path d={S_FACE} transform="translate(15 11)" fill="none" stroke={`url(#${p}-coolRim)`} strokeWidth="3" />
      <path d={S_FACE} transform="translate(7.5 5.5)" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="1.5" />

      {/* the rim: bevelled steel plates, seamed, chipped */}
      <path d={S_FACE} fill={`url(#${p}-rim)`} />
      <path d={S_FACE} fill={`url(#${p}-brush)`} />
      <path d={S_FACE} fill={`url(#${p}-ink)`} />
      {S_SEAMS.map((d, i) => (
        <Seam key={i} d={d} w={3} o={0.62} />
      ))}
      <Wear pts={S_EDGE} seed={11} o={0.55} />
      <path d={S_FACE} fill="none" stroke={`url(#${p}-hi)`} strokeWidth="3.5" />
      <path d={S_FACE} fill="none" stroke={`url(#${p}-lo)`} strokeWidth="3" />

      {/* a raised inner frame, engraved */}
      <path d={S_MID} fill={`url(#${p}-frame)`} />
      <path d={S_MID} fill="none" stroke="#000" strokeOpacity=".7" strokeWidth="2.4" />
      <path d={S_LINE} fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="1.6" />
      <path d={S_LINE} fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="1" transform="translate(.8 1.2)" />

      {/* the field: recessed, brushed, a hex mesh in its shade, a chief plate, a heat chevron */}
      <path d={S_FIELD} fill={`url(#${p}-field)`} />
      <path d={S_FIELD} fill={`url(#${p}-brush)`} />
      <clipPath id={`${p}-fieldClip`}>
        <path d={S_FIELD} />
      </clipPath>
      <g clipPath={`url(#${p}-fieldClip)`}>
        <rect x="-170" y="-40" width="340" height="270" fill={`url(#${p}-hex)`} />
        <path d="M-168 -221H50L-168 130Z" fill={`url(#${p}-sheen)`} />
        <path d={S_FIELD} fill={`url(#${p}-ink)`} />
        {/* the chief: a raised plate across the top with vents */}
        <rect x="-170" y="-252" width="340" height="80" fill={`url(#${p}-steel)`} />
        <rect x="-170" y="-252" width="340" height="80" fill={`url(#${p}-brush)`} />
        <rect x="-170" y="-172" width="340" height="16" fill="#000" opacity=".38" />
        <path d="M-170 -172.5H170" stroke="#000" strokeOpacity=".75" strokeWidth="3" />
        <path d="M-170 -175H170" stroke="#fff" strokeOpacity=".3" strokeWidth="1.2" />
        <Seam d="M-150 -222H150" w={1.8} o={0.5} />
        {[-20, -10, 0, 10, 20].map((x) => (
          <rect key={x} x={x - 2.2} y="-208" width="4.4" height="22" rx="2" fill="#0a0b0d" />
        ))}
        {[-20, -10, 0, 10, 20].map((x) => (
          <path key={`l${x}`} d={`M${x + 2.6} -207V-187`} stroke="#fff" strokeOpacity=".22" strokeWidth="1" />
        ))}
        {/* the chevron, painted, worn */}
        <path d="M-160 70L0 172L160 70" fill="none" stroke={`url(#${p}-heat)`} strokeWidth="30" strokeLinejoin="miter" />
        <path d="M-160 51.5L0 153.5L160 51.5" fill="none" stroke="#fff" strokeOpacity=".42" strokeWidth="2" />
        <path d="M-160 88.5L0 190.5L160 88.5" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="2.5" />
        <path d="M-112 112L-72 136M64 100L96 80M-30 158L-12 168" stroke="#2a0d03" strokeOpacity=".55" strokeWidth="2" />
        {/* scratches */}
        <path d="M-128 -130L-64 -150M44 120L116 92M-40 200L10 176M96 -150L132 -128M-150 -40L-120 -30" stroke="#fff" strokeOpacity=".18" strokeWidth="1.2" />
        <path d="M-127 -128.5L-63 -148.5M45 121.5L117 93.5M-149 -38.5L-119 -28.5" stroke="#000" strokeOpacity=".4" strokeWidth="1" />
      </g>
      <path d={S_FIELD} fill="none" stroke={`url(#${p}-lotl)`} strokeWidth="9" />
      <path d={S_FIELD} fill="none" stroke={`url(#${p}-hibr)`} strokeWidth="2" />
      {[-120, -40, 40, 120].map((x) => (
        <Rivet key={x} p={p} x={x} y={-236} r={4.4} />
      ))}
      <Light p={p} x={-80} y={-198} />
      <Light p={p} x={80} y={-198} />

      <Light p={p} x={0} y={206} r={3.6} />

      {/* rivets on the rim, highlights along its lit edge, the band's warm bounce */}
      {S_RIVETS.map(([x, y], i) => (
        <Rivet key={i} p={p} x={r1(x)} y={r1(y)} r={6.4} />
      ))}
      <path d="M-150 -261Q-104 -270 -56 -273" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="3" strokeLinecap="round" />
      <path d="M-192 -206L-194 -120" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M-188 40C-170 120 -110 196 -40 246" fill="none" stroke="#ff8a4a" strokeOpacity=".55" strokeWidth="2.4" strokeLinecap="round" />

      {/* the boss: a bolted flange, a machined dome, heat enamel, the arena's emblem in relief */}
      <g transform="translate(0 -60)">
        <circle cx="12" cy="15" r="116" fill={`url(#${p}-pool)`} />
        <circle r="104" fill={`url(#${p}-frame)`} />
        <circle r="104" fill="none" stroke={`url(#${p}-hi)`} strokeWidth="2.4" />
        <circle r="104" fill="none" stroke={`url(#${p}-lo)`} strokeWidth="2.4" />
        {Array.from({ length: 8 }, (_, i) => {
          const [x, y] = polar(96, 22.5 + i * 45);
          return <Bolt key={i} p={p} x={r1(x)} y={r1(y)} r={5.6} rot={i * 9} />;
        })}
        <circle cx="5" cy="7" r="88" fill="#000" opacity=".5" />
        <circle r="86" fill={`url(#${p}-rim)`} />
        {Array.from({ length: 48 }, (_, i) => {
          const [x0, y0] = polar(77, i * 7.5);
          const [x1, y1] = polar(85, i * 7.5);
          return <path key={i} d={`M${r1(x0)} ${r1(y0)}L${r1(x1)} ${r1(y1)}`} stroke={i % 2 ? '#fff' : '#000'} strokeOpacity={i % 2 ? 0.24 : 0.48} strokeWidth="2" />;
        })}
        <circle r="86" fill="none" stroke={`url(#${p}-hi)`} strokeWidth="3" />
        <circle r="74" fill="none" stroke="#000" strokeOpacity=".75" strokeWidth="3.5" />
        <circle r="72" fill="none" stroke="#fff" strokeOpacity=".2" strokeWidth="1.2" />
        <circle r="70" fill={`url(#${p}-heatR)`} />
        <circle r="70" fill={`url(#${p}-ink)`} />
        <circle r="58" fill={`url(#${p}-heatGlow)`} opacity=".7" />
        <circle r="70" fill="none" stroke={`url(#${p}-lotl)`} strokeWidth="10" />
        <ArenaGlyph arena={arena} x={-52 + 4.5} y={-52 + 5.5} width={104} height={104} fill="#000" opacity=".6" />
        <ArenaGlyph arena={arena} x={-52 - 1.8} y={-52 - 1.8} width={104} height={104} fill="#fff" opacity=".95" />
        <ArenaGlyph arena={arena} x={-52} y={-52} width={104} height={104} fill={`url(#${p}-emblem)`} />
        <path d="M-58 -30A66 66 0 0 1 -6 -66A72 72 0 0 0 -64 -16Z" fill="#fff" opacity=".34" />
      </g>

      <Glint p={p} x={-52} y={-130} s={26} />
      <Glint p={p} x={150} y={-246} s={13} />
      <Glint p={p} x={-186} y={-232} s={10} />
    </g>
  );
}

/* ── course: a tome ────────────────────────────────────────────── */

const box = (x0: number, y0: number, x1: number, y1: number, r: number) =>
  rounded(
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ],
    r,
  );

const COVER = box(-170, -250, 170, 250, 12);
const BACK_COVER = box(-104, -292, 236, 208, 12);
const FORE_EDGE = 'M163 -240L229 -282L229 198L163 240Z';
const PAGE_TOP = 'M-160 -240L163 -240L229 -282L-94 -282Z';
const SPINE = 'M-168 -247Q-192 -247 -192 -228L-192 228Q-192 247 -168 247Z';
const CORNER = 'M172 -252L94 -252Q110 -238 118 -220Q146 -204 172 -174Z';
const RIBBON_A = 'M176 226L198 220L206 326L194 312L184 332Z';
const RIBBON_B = 'M200 216L216 210L222 300L213 290L206 306Z';
const DIAMOND = (r: number, c = 12) =>
  rounded(
    [
      [0, -r],
      [r, 0],
      [0, r],
      [-r, 0],
    ],
    c,
  );

const T_EDGE: P[] = (() => {
  const r = rng(23);
  const out: P[] = [];
  for (let i = 0; i < 60; i++) {
    const s = Math.floor(r() * 4);
    const t = r();
    out.push(s === 0 ? [-166 + t * 332, -246] : s === 1 ? [-166 + t * 332, 246] : s === 2 ? [166, -246 + t * 492] : [-166, -246 + t * 492]);
  }
  return out;
})();

function Curl({ x, y, sx, sy }: { x: number; y: number; sx: 1 | -1; sy: 1 | -1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
      <Seam d="M0 34Q0 0 34 0M8 34Q8 8 34 8M9 14a5 5 0 1 0 10 0a5 5 0 1 0 -10 0" w={2} o={0.55} />
    </g>
  );
}

function Tome({ p }: { p: string }) {
  const s = 1.07;
  const studs: P[] = [
    [0, -99],
    [99, 0],
    [0, 99],
    [-99, 0],
  ];
  return (
    <g transform={`translate(228 388) rotate(9) scale(${s})`}>
      <Sticker p={p} s={s}>
        <path d={BACK_COVER} />
        <path d={FORE_EDGE} />
        <path d={COVER} />
        <path d={SPINE} />
        <path d={RIBBON_A} />
        <path d={RIBBON_B} />
      </Sticker>

      {/* back cover, the page block (deckled, warmed by the band), the strap round the fore-edge */}
      <path d={BACK_COVER} fill="#191512" />
      <path d={BACK_COVER} fill={`url(#${p}-grain)`} />
      <path d={BACK_COVER} fill="none" stroke={`url(#${p}-coolRim)`} strokeWidth="2.4" />
      <path d={FORE_EDGE} fill={`url(#${p}-pages)`} />
      {Array.from({ length: 40 }, (_, i) => {
        const t = (i + 0.5) / 40;
        const x = 163 + 66 * t;
        const y = -42 * t;
        const k = (i * 7) % 5;
        return <path key={i} d={`M${r1(x)} ${r1(-238 + y + k)}V${r1(238 + y - k * 0.6)}`} stroke={k === 4 ? '#fff' : '#5d5345'} strokeOpacity={k === 4 ? 0.5 : r1(0.1 + k * 0.06)} strokeWidth=".9" />;
      })}
      <path d={FORE_EDGE} fill="#ff8a4a" opacity=".1" />
      <path d={FORE_EDGE} fill={`url(#${p}-shadeDown)`} opacity=".7" />
      <path d="M163 -240L229 -282" stroke="#fff" strokeOpacity=".6" strokeWidth="1.2" />
      <path d={PAGE_TOP} fill={`url(#${p}-pagesTop)`} />
      {Array.from({ length: 10 }, (_, i) => {
        const t = 0.28 + (i / 10) * 0.7;
        return <path key={i} d={`M${r1(-160 + 66 * t)} ${r1(-240 - 42 * t)}H${r1(163 + 66 * t)}`} stroke="#6b604f" strokeOpacity=".24" strokeWidth=".8" />;
      })}
      <path d="M163 -4L229 -46L229 14L163 56Z" fill={`url(#${p}-strap)`} />
      <path d="M163 -4L229 -46M163 56L229 14" stroke="#000" strokeOpacity=".5" strokeWidth="1.5" />
      <path d="M167 3L227 -35M167 49L227 11" stroke="#e3cdb5" strokeOpacity=".28" strokeWidth="1.1" strokeDasharray="5 4" />

      {/* the spine's rounded edge with raised bands */}
      <path d={SPINE} fill={`url(#${p}-spine)`} />
      {[-178, -92, 0, 92, 178].map((y) => (
        <g key={y}>
          <rect x="-193" y={y - 6} width="26" height="12" rx="5" fill="#000" opacity=".5" transform="translate(1.5 2.5)" />
          <rect x="-193" y={y - 6} width="26" height="12" rx="5" fill={`url(#${p}-spine)`} />
          <path d={`M-189 ${y - 4.5}H-170`} stroke="#d9c2a8" strokeOpacity=".5" strokeWidth="1.2" />
        </g>
      ))}

      {/* the front board's thickness, then the cover: grained, creased, worn at the edges */}
      <path d={COVER} transform="translate(7 -4.5)" fill="#0c0a08" />
      <path d={COVER} fill={`url(#${p}-leather)`} />
      <path d={COVER} fill={`url(#${p}-grain)`} />
      <path d={COVER} fill={`url(#${p}-ink)`} />
      <ellipse cx="-70" cy="-120" rx="170" ry="210" fill={`url(#${p}-sheen)`} />
      <Seam d="M-150 136C-112 118 -74 150 -34 128M-150 176C-124 168 -96 184 -66 172M64 -206C92 -196 122 -214 150 -200M96 160C116 150 136 168 152 158" w={1.3} o={0.4} />
      <Wear pts={T_EDGE} seed={31} o={0.32} />
      <path d={COVER} fill="none" stroke="#9a8573" strokeOpacity=".5" strokeWidth="2.5" />
      <path d={COVER} fill="none" stroke={`url(#${p}-hi)`} strokeWidth="2.5" opacity=".7" />
      <path d={COVER} fill="none" stroke={`url(#${p}-lo)`} strokeWidth="3" />
      <Seam d="M-146 -248V248" w={3.2} o={0.7} />
      {/* the tooled frames, with curls in the corners and diamonds at the sides */}
      <Seam d={box(-126, -222, 146, 222, 6)} w={2.4} o={0.55} />
      <Seam d={box(-112, -208, 132, 208, 4)} w={1.5} o={0.4} />
      <Curl x={-104} y={-200} sx={1} sy={1} />
      <Curl x={124} y={-200} sx={-1} sy={1} />
      <Curl x={-104} y={200} sx={1} sy={-1} />
      <Curl x={124} y={200} sx={-1} sy={-1} />
      {[
        [10, -222],
        [10, 222],
        [-126, 0],
      ].map(([x, y], i) => (
        <Seam key={i} d={`M${x} ${y! - 9}L${x! + 9} ${y}L${x} ${y! + 9}L${x! - 9} ${y}Z`} w={1.8} o={0.55} />
      ))}

      {/* steel corners, engraved, riveted */}
      {(
        [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ] as const
      ).map(([sx, sy]) => (
        <g key={`${sx}${sy}`} transform={`scale(${sx} ${sy})`}>
          <path d={CORNER} transform="translate(3 4)" fill="#000" opacity=".55" />
          <path d={CORNER} fill={`url(#${p}-steel)`} />
          <path d={CORNER} fill={`url(#${p}-brush)`} />
          <path d="M162 -244L110 -244Q122 -232 128 -220Q150 -206 162 -190" fill="none" stroke="#000" strokeOpacity=".45" strokeWidth="1.6" />
          <path d={CORNER} fill="none" stroke={sy > 0 && sx > 0 ? `url(#${p}-hi)` : '#fff'} strokeOpacity={sy > 0 && sx > 0 ? 1 : 0.22} strokeWidth="2" />
          <Rivet p={p} x={150} y={-232} r={5.4} />
        </g>
      ))}

      {/* the strap across the front; the lock plate with its keyhole */}
      <path d="M86 -4H171V56H86Z" fill={`url(#${p}-strap)`} />
      <path d="M86 -4H171V56H86Z" fill={`url(#${p}-grain)`} />
      <path d="M90 2.5H170M90 49.5H170" stroke="#e3cdb5" strokeOpacity=".32" strokeWidth="1.3" strokeDasharray="6 5" />
      <path d="M86 56H171" stroke="#000" strokeOpacity=".55" strokeWidth="2" />
      <rect x="44" y="2" width="16" height="52" rx="7" fill={`url(#${p}-barrel)`} />
      <path d={box(52, -18, 116, 68, 9)} transform="translate(4 5)" fill="#000" opacity=".55" />
      <path d={box(52, -18, 116, 68, 9)} fill={`url(#${p}-rim)`} />
      <path d={box(52, -18, 116, 68, 9)} fill="none" stroke={`url(#${p}-hi)`} strokeWidth="2" />
      <path d={box(64, -5, 104, 55, 6)} fill={`url(#${p}-heatR)`} />
      <path d={box(64, -5, 104, 55, 6)} fill="none" stroke={`url(#${p}-lotl)`} strokeWidth="5" />
      <circle cx="84" cy="18" r="7" fill="#1a0a03" />
      <path d="M80 20L88 20L91 40L77 40Z" fill="#1a0a03" />
      <path d="M78 15A7 7 0 0 1 89 13" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.3" />
      <path d="M68 -1L98 -1L68 26Z" fill="#fff" opacity=".22" />
      {[
        [59, -11],
        [109, -11],
        [59, 61],
        [109, 61],
      ].map(([x, y], i) => (
        <Rivet key={i} p={p} x={x!} y={y!} r={3.6} />
      ))}

      {/* the medallion: a studded steel diamond, heat enamel, the ASCENT mark in relief */}
      <g transform="translate(-8 -32)">
        <path d={DIAMOND(106)} transform="translate(8 10)" fill="#000" opacity=".6" />
        <path d={DIAMOND(106)} fill={`url(#${p}-rim)`} />
        <path d={DIAMOND(106)} fill={`url(#${p}-brush)`} />
        <path d={DIAMOND(106)} fill="none" stroke={`url(#${p}-hi)`} strokeWidth="3" />
        <Seam d={DIAMOND(92, 9)} w={1.6} o={0.55} />
        {studs.map((c, i) => {
          const q = mixP(c, studs[(i + 1) % 4]!, 0.5);
          return <Rivet key={i} p={p} x={r1(q[0])} y={r1(q[1])} r={3.6} />;
        })}
        <path d={DIAMOND(80, 8)} fill={`url(#${p}-heatR)`} />
        <circle r="60" fill={`url(#${p}-heatGlow)`} opacity=".7" />
        <path d={DIAMOND(80, 8)} fill="none" stroke={`url(#${p}-lotl)`} strokeWidth="9" />
        <Chevrons p={p} s={0.95} />
        <path d="M-50 -24L-4 -70L10 -56L-36 -10Z" fill="#fff" opacity=".2" />
      </g>

      {/* the ribbons */}
      <path d={RIBBON_B} fill="#2b2f36" />
      <path d="M203 216L208 300" stroke="#fff" strokeOpacity=".22" strokeWidth="1.4" />
      <path d={RIBBON_A} fill={`url(#${p}-heat)`} />
      <path d="M180 226L184 328" stroke="#fff" strokeOpacity=".38" strokeWidth="1.6" />
      <path d="M176 226L198 220L199 240L178 246Z" fill="#000" opacity=".35" />

      {/* rims: warm bounce on the spine side, cool where it meets the page */}
      <path d="M-192 -226V226" stroke="#ff8a4a" strokeOpacity=".6" strokeWidth="2.5" />
      <path d="M229 -280V196" stroke="#eef4ff" strokeOpacity=".72" strokeWidth="2" />
      <Glint p={p} x={-36} y={-106} s={22} />
      <Glint p={p} x={150} y={-232} s={12} />
      <Glint p={p} x={60} y={-12} s={10} />
      <Glint p={p} x={-184} y={-178} s={8} />
    </g>
  );
}

/* ── assessment: a clipboard with a gauge ──────────────────────── */

const BOARD = box(-165, -235, 165, 235, 24);
const BOARD_IN = box(-157, -227, 157, 227, 17);
const CLIP_PLATE = box(-94, -264, 94, -212, 12);
const CLIP_ARCH = 'M-66 -262C-66 -302 -40 -316 0 -316C40 -316 66 -302 66 -262L50 -262C50 -290 30 -298 0 -298C-30 -298 -50 -290 -50 -262Z';
const PENCIL = 'M0 -9L214 -9L248 0L214 9L0 9Q-5 9 -5 4L-5 -4Q-5 -9 0 -9Z';
const CLIP_WIRE = 'M-122 -214V-150Q-122 -140 -130 -140Q-138 -140 -138 -150V-206Q-138 -220 -126 -220Q-114 -220 -114 -206V-158';

function Gauge({ p }: { p: string }) {
  const start = 225;
  const sweep = 270;
  const ang = (v: number) => start - v * sweep;
  const needle = ang(0.86);
  const mark = (() => {
    const [x0, y0] = polar(100, ang(0.8));
    const [x1, y1] = polar(87, ang(0.8) + 5);
    const [x2, y2] = polar(87, ang(0.8) - 5);
    return `M${r1(x0)} ${r1(y0)}L${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}Z`;
  })();
  return (
    <g>
      <circle cx="12" cy="16" r="124" fill={`url(#${p}-pool)`} />
      <circle r="118" fill={`url(#${p}-bezel)`} />
      {Array.from({ length: 72 }, (_, i) => {
        const [x0, y0] = polar(109, i * 5);
        const [x1, y1] = polar(117, i * 5);
        return <path key={i} d={`M${r1(x0)} ${r1(y0)}L${r1(x1)} ${r1(y1)}`} stroke={i % 2 ? '#fff' : '#000'} strokeOpacity={i % 2 ? 0.3 : 0.42} strokeWidth="2.2" />;
      })}
      <circle r="118" fill="none" stroke={`url(#${p}-hi)`} strokeWidth="3" />
      <circle r="104" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.2" />
      <circle r="102" fill="none" stroke="#000" strokeOpacity=".78" strokeWidth="4" />
      <circle r="100" fill={`url(#${p}-face)`} />
      <circle r="100" fill={`url(#${p}-ink)`} />
      <circle r="56" fill="none" stroke="#fff" strokeOpacity=".07" strokeWidth="1" />
      <circle r="44" fill="none" stroke="#fff" strokeOpacity=".05" strokeWidth="8" />
      {/* the reading so far, the pass mark, the scale */}
      <path d={sector(50, 82, start, ang(0.8))} fill={`url(#${p}-heatGlow)`} />
      <path d={sector(60, 70, start, ang(0.8))} fill={`url(#${p}-heat)`} />
      <path d={sector(60, 70, ang(0.8), ang(1))} fill="#fff" opacity=".12" />
      <path d={mark} fill="#ee6a2c" />
      {Array.from({ length: 51 }, (_, i) => {
        const major = i % 5 === 0;
        const a = ang(i / 50);
        const [x0, y0] = polar(90, a);
        const [x1, y1] = polar(major ? 74 : 82, a);
        return <path key={i} d={`M${r1(x0)} ${r1(y0)}L${r1(x1)} ${r1(y1)}`} stroke="#fff" strokeOpacity={major ? 0.9 : 0.42} strokeWidth={major ? 3.2 : 1.4} strokeLinecap="round" />;
      })}
      {Array.from({ length: 11 }, (_, i) => {
        const [x, y] = polar(52, ang(i / 10));
        return <circle key={i} cx={r1(x)} cy={r1(y)} r={i % 5 === 0 ? 2.6 : 1.5} fill="#fff" opacity=".5" />;
      })}
      {/* the needle, its shadow, its heat tip */}
      <g transform={`rotate(${r1(-needle)})`}>
        <path d="M-18 0L0 -6L86 0L0 6Z" fill="#000" opacity=".55" transform="translate(4 6)" />
        <path d="M-18 0L0 -6L86 0L0 6Z" fill={`url(#${p}-needle)`} />
        <path d="M62 -1.7L86 0L62 1.7Z" fill="#ee6a2c" />
        <path d="M-18 0L0 -6L86 0Z" fill="#fff" opacity=".5" />
      </g>
      <circle r="17" fill={`url(#${p}-rivet)`} />
      <circle r="17" fill="none" stroke="#000" strokeOpacity=".55" strokeWidth="1.6" />
      <circle r="5" fill="#2a2e35" />
      {/* the glass */}
      <ellipse cx="-34" cy="-50" rx="64" ry="24" transform="rotate(-38 -34 -50)" fill="#fff" opacity=".13" />
      <path d="M-74 -26Q-64 -62 -28 -80" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2.2" strokeLinecap="round" />
      <path d={`M${pt(polar(117, 40))}A117 117 0 0 1 ${pt(polar(117, -50))}`} fill="none" stroke="#eef4ff" strokeOpacity=".72" strokeWidth="2.6" />
      <Light p={p} x={0} y={-109} r={4} />
      <Glint p={p} x={-58} y={-86} s={16} />
    </g>
  );
}

function Clipboard({ p }: { p: string }) {
  const s = 1.21;
  return (
    <g transform={`translate(212 388) rotate(4) scale(${s})`}>
      <Sticker p={p} s={s}>
        <path d={BOARD} transform="translate(11 9)" />
        <path d={BOARD} />
        <path d={CLIP_ARCH} />
        <rect x="-38" y="-324" width="76" height="20" rx="7" />
        <path d={CLIP_PLATE} />
        <circle cx="92" cy="128" r="118" />
        <g transform="translate(-146 236) rotate(-13)">
          <path d={PENCIL} />
        </g>
        <rect x="128" y="-126" width="34" height="26" rx="5" />
        <rect x="128" y="-66" width="34" height="26" rx="5" />
      </Sticker>

      {/* the board: a metal edge round a carbon panel, screwed at the corners */}
      <path d={BOARD} transform="translate(11 9)" fill="#08090b" />
      <path d={BOARD} transform="translate(11 9)" fill="none" stroke={`url(#${p}-coolRim)`} strokeWidth="2.4" />
      <path d={BOARD} fill={`url(#${p}-chromeV)`} />
      <path d={BOARD} fill="none" stroke={`url(#${p}-hi)`} strokeWidth="3" />
      <path d={BOARD} fill="none" stroke={`url(#${p}-lo)`} strokeWidth="2.6" />
      <path d={BOARD_IN} fill={`url(#${p}-board)`} />
      <path d={BOARD_IN} fill={`url(#${p}-weave)`} />
      <path d={BOARD_IN} fill={`url(#${p}-ink)`} />
      <path d={BOARD_IN} fill="none" stroke="#000" strokeOpacity=".7" strokeWidth="2" />
      {[
        [-146, -216],
        [146, -216],
        [-146, 216],
      ].map(([x, y], i) => (
        <Bolt key={i} p={p} x={x!} y={y!} r={6} rot={i * 17} />
      ))}

      {/* the sheets, fanned; tabs; the top one a checklist with a chart and a signature */}
      <g transform="rotate(5)">
        <rect x="-130" y="-190" width="268" height="402" fill="#000" opacity=".4" transform="translate(5 6)" />
        <rect x="-130" y="-190" width="268" height="402" fill="#aeb3b9" />
      </g>
      <rect x="128" y="-126" width="34" height="26" rx="5" fill={`url(#${p}-heat)`} />
      <rect x="128" y="-66" width="34" height="26" rx="5" fill="#d9dce0" />
      <path d="M150 -124V-102M150 -64V-42" stroke="#000" strokeOpacity=".25" strokeWidth="1.4" />
      <g transform="rotate(2.4)">
        <rect x="-134" y="-194" width="272" height="404" fill="#000" opacity=".35" transform="translate(4 5)" />
        <rect x="-134" y="-194" width="272" height="404" fill="#d6d9dd" />
        <path d="M-110 -170H40M-110 -160H10" stroke="#8d929b" strokeOpacity=".6" strokeWidth="3" />
      </g>
      <g transform="rotate(-1.5)">
        <path d="M-138 -200H138V168L100 206H-138Z" fill="#000" opacity=".35" transform="translate(4 6)" />
        <path d="M-138 -200H138V168L100 206H-138Z" fill={`url(#${p}-paper)`} />
        <path d="M138 168L100 206Q110 180 138 168Z" fill="#cfcfc8" />
        <path d="M138 168L100 206" stroke="#000" strokeOpacity=".2" strokeWidth="1" />
        <rect x="-112" y="-166" width="104" height="16" rx="3" fill={`url(#${p}-heat)`} />
        <rect x="4" y="-164" width="56" height="12" rx="3" fill="#9aa0a8" opacity=".55" />
        <path d={box(74, -180, 118, -128, 4)} fill="#e6e8eb" stroke="#7d828b" strokeOpacity=".7" strokeWidth="2" />
        <circle cx="96" cy="-160" r="9" fill="#9aa0a8" />
        <path d="M80 -129C80 -146 112 -146 112 -129Z" fill="#9aa0a8" />
        <path d="M-112 -124H112" stroke="#8d929b" strokeOpacity=".6" strokeWidth="1.5" />
        {[-96, -42, 12, 66].map((y, i) => (
          <g key={y}>
            <rect x="-112" y={y - 15} width="30" height="30" rx="6" fill="#fff" stroke="#2a2c30" strokeWidth="3" />
            {i < 3 && <path d={`M-107 ${y + 1}L-98 ${y + 10}L-79 ${y - 14}`} fill="none" stroke="#1b1c1f" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />}
            <rect x="-66" y={y - 11} width={i % 2 ? 150 : 172} height="7" rx="3" fill="#8d929b" opacity=".6" />
            <rect x="-66" y={y + 4} width={i % 2 ? 96 : 120} height="6" rx="3" fill="#8d929b" opacity=".38" />
          </g>
        ))}
        {[22, 34, 28, 44, 56].map((h, i) => (
          <rect key={i} x={-112 + i * 15} y={150 - h} width="10" height={h} rx="1.5" fill={i === 4 ? '#e2601f' : '#8d929b'} opacity={i === 4 ? 1 : 0.65} />
        ))}
        <path d="M-116 151H-30" stroke="#2a2c30" strokeOpacity=".55" strokeWidth="1.5" />
        <path d="M-108 186C-96 166 -86 202 -70 176S-46 194 -32 178S-10 188 2 176" fill="none" stroke="#2b2d31" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M-114 196H10" stroke="#8d929b" strokeOpacity=".5" strokeWidth="1.2" />
        {/* a paper clip on the top corner */}
        <path d={CLIP_WIRE} fill="none" stroke="#000" strokeOpacity=".35" strokeWidth="3.4" transform="translate(2 3)" />
        <path d={CLIP_WIRE} fill="none" stroke="#c9ced5" strokeWidth="3" strokeLinecap="round" />
        <path d="M-137 -205Q-137 -218 -126 -219" fill="none" stroke="#fff" strokeWidth="1.2" />
      </g>

      {/* the clip: a plate, a sprung barrel, a lever with a heat grip */}
      <path d={CLIP_PLATE} transform="translate(5 7)" fill="#000" opacity=".45" />
      <path d={CLIP_PLATE} fill={`url(#${p}-chromeV)`} />
      <path d={CLIP_PLATE} fill={`url(#${p}-brush)`} />
      <path d={CLIP_PLATE} fill="none" stroke={`url(#${p}-hi)`} strokeWidth="2.4" />
      <Seam d="M-82 -224H82" w={1.6} o={0.45} />
      <rect x="-80" y="-272" width="160" height="20" rx="10" fill={`url(#${p}-barrel)`} />
      {[-72, -64, -56, 56, 64, 72].map((x) => (
        <ellipse key={x} cx={x} cy="-262" rx="3.2" ry="10" fill="none" stroke="#2a2e35" strokeOpacity=".7" strokeWidth="1.4" />
      ))}
      <path d={CLIP_ARCH} fill={`url(#${p}-chromeV)`} />
      <path d="M-60 -270C-58 -298 -34 -310 0 -311" fill="none" stroke="#fff" strokeOpacity=".88" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M50 -262C50 -290 30 -298 0 -298" fill="none" stroke="#000" strokeOpacity=".4" strokeWidth="1.6" />
      <rect x="-38" y="-324" width="76" height="20" rx="7" fill={`url(#${p}-heat)`} />
      {[-24, -12, 0, 12, 24].map((x) => (
        <path key={x} d={`M${x} -320V-308`} stroke="#000" strokeOpacity=".38" strokeWidth="2.6" strokeLinecap="round" />
      ))}
      <path d="M-34 -322H34" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" />
      <Rivet p={p} x={-74} y={-232} r={6} />
      <Rivet p={p} x={74} y={-232} r={6} />

      {/* a pencil lying across the foot */}
      <g transform="translate(-146 236) rotate(-13)">
        <path d={PENCIL} transform="translate(4 7)" fill="#000" opacity=".45" />
        <path d="M44 -9H214V9H44Z" fill={`url(#${p}-pencil)`} />
        <path d="M44 -3H214M44 3H214" stroke="#000" strokeOpacity=".18" strokeWidth="1" />
        <path d="M214 -9L248 0L214 9Z" fill={`url(#${p}-wood)`} />
        <path d="M238 -2.8L248 0L238 2.8Z" fill="#2a2c30" />
        <path d="M22 -9H44V9H22Z" fill={`url(#${p}-barrel)`} />
        <path d="M27 -9V9M33 -9V9M39 -9V9" stroke="#000" strokeOpacity=".3" strokeWidth="1.2" />
        <path d="M0 -9H22V9H0Q-5 9 -5 4V-4Q-5 -9 0 -9Z" fill="#43474e" />
        <path d="M-3 -6H20" stroke="#fff" strokeOpacity=".3" strokeWidth="1.4" />
        <path d="M46 -7H212" stroke="#fff" strokeOpacity=".45" strokeWidth="1.3" />
      </g>

      {/* rims */}
      <path d="M-165 -200V200" stroke="#ff8a4a" strokeOpacity=".58" strokeWidth="2.4" />

      <g transform="translate(92 128)">
        <Gauge p={p} />
      </g>
      <Glint p={p} x={-50} y={-302} s={16} />
      <Glint p={p} x={-140} y={-222} s={11} />
      <Glint p={p} x={-150} y={-170} s={8} />
    </g>
  );
}

/* ── cup: a trophy ─────────────────────────────────────────────── */

const BOWL = 'M-150 -296A150 26 0 0 0 150 -296C150 -170 112 -66 32 -14L-32 -14C-112 -66 -150 -170 -150 -296Z';
const HANDLE = 'M-146 -262C-200 -280 -238 -236 -228 -184C-220 -136 -182 -114 -124 -108L-128 -132C-170 -138 -198 -152 -204 -186C-212 -222 -188 -248 -148 -238Z';
const FOOT = 'M-20 100C-26 130 -84 142 -108 160L108 160C84 142 26 130 20 100Z';
const T1_FRONT = 'M-128 182H128V252H-128Z';
const T1_TOP = 'M-128 182L128 182L152 168L-104 168Z';
const T1_SIDE = 'M128 182L152 168L152 238L128 252Z';
const T2_FRONT = 'M-156 252H156V322H-156Z';
const T2_TOP = 'M-156 252L156 252L180 238L-132 238Z';
const T2_SIDE = 'M156 252L180 238L180 308L156 322Z';
const BOWL_R: [P, P, P, P] = [[150, -296], [150, -170], [112, -66], [32, -14]];

/** the bowl's half-width at height y (from its outline), for fitting bands and flutes */
function bowlHalf(y: number) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const m = (lo + hi) / 2;
    if (cubic(BOWL_R[0], BOWL_R[1], BOWL_R[2], BOWL_R[3], m)[1] < y) lo = m;
    else hi = m;
  }
  return r1(cubic(BOWL_R[0], BOWL_R[1], BOWL_R[2], BOWL_R[3], lo)[0]);
}

/** the fluted lower bowl: lobes that narrow into the stem */
const FLUTES: string[] = (() => {
  const out: string[] = [];
  const y0 = -112;
  const y1 = -22;
  const w0 = bowlHalf(y0) - 4;
  const w1 = bowlHalf(y1) - 2;
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const u = -1 + (2 * i) / n;
    const a: P = [u * w0, y0 + 10 * (1 - u * u)];
    const b: P = [u * w1, y1];
    out.push(`M${pt(a)}Q${pt([a[0] * 0.8, (a[1] + b[1]) / 2 + 6])} ${pt(b)}`);
  }
  return out;
})();

const LAUREL: { stem: string; leaves: [number, number, number][] } = (() => {
  const leaves: [number, number, number][] = [];
  for (let i = 0; i < 7; i++) {
    const q = cubic([-14, -84], [-50, -92], [-74, -128], [-70, -176], 0.12 + i * 0.13);
    leaves.push([r1(q[0]), r1(q[1]), -40 - i * 14]);
  }
  return { stem: 'M-14 -84C-50 -92 -74 -128 -70 -176', leaves };
})();

const BAND_T = bowlHalf(-214);
const BAND_B = bowlHalf(-188);

function Trophy({ p }: { p: string }) {
  const s = 1.1;
  const plaque = rounded(
    [
      [-74, 196],
      [82, 196],
      [74, 236],
      [-82, 236],
    ],
    6,
  );
  const lipBeads = Array.from({ length: 23 }, (_, i) => {
    const a = Math.PI * (0.06 + (0.88 * i) / 22);
    return [r1(-Math.cos(a) * 142), r1(-279 + Math.sin(a) * 22)] as P;
  });
  const knotBeads = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI * (0.12 + (0.76 * i) / 8);
    return [r1(-Math.cos(a) * 40), r1(44 + Math.sin(a) * 9)] as P;
  });
  return (
    <g transform={`translate(258 402) rotate(1.5) scale(${s})`}>
      <Sticker p={p} s={s}>
        <path d={BOWL} />
        <ellipse cy="-296" rx="152" ry="28" />
        <path d={HANDLE} />
        <path d={HANDLE} transform="scale(-1 1)" />
        <circle cx="-231" cy="-198" r="11" />
        <circle cx="231" cy="-198" r="11" />
        <path d="M-32 -14C-20 4 -16 16 -16 28L16 28C16 16 20 4 32 -14Z" />
        <ellipse cy="44" rx="42" ry="20" />
        <path d="M-16 58L-22 104L22 104L16 58Z" />
        <path d={FOOT} />
        <ellipse cy="166" rx="112" ry="16" />
        <path d={T1_TOP} />
        <path d={T1_FRONT} />
        <path d={T1_SIDE} />
        <path d={T2_TOP} />
        <path d={T2_FRONT} />
        <path d={T2_SIDE} />
        <rect x="-160" y="318" width="40" height="14" rx="3" />
        <rect x="120" y="318" width="40" height="14" rx="3" />
      </Sticker>

      {/* plinth: two steps of dark steel on feet, a heat inlay, a riveted heat plaque */}
      <rect x="-160" y="318" width="40" height="14" rx="3" fill="#0b0c0e" />
      <rect x="120" y="318" width="40" height="14" rx="3" fill="#0b0c0e" />
      <path d={T2_TOP} fill={`url(#${p}-plinthTop)`} />
      <path d={T2_FRONT} fill={`url(#${p}-plinth)`} />
      <path d={T2_FRONT} fill={`url(#${p}-brush)`} />
      <path d={T2_SIDE} fill="#0b0c0e" />
      <path d={T2_SIDE} fill="none" stroke="#eef4ff" strokeOpacity=".58" strokeWidth="2" />
      <path d="M-156 252H156M156 252L180 238" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" />
      <path d="M-148 270H148" stroke="#ee6a2c" strokeOpacity=".9" strokeWidth="3" />
      <path d="M-148 272.5H148" stroke="#000" strokeOpacity=".5" strokeWidth="1.2" />
      <g transform="translate(0 296)">
        <path d={DIAMOND(14, 3)} fill={`url(#${p}-heatR)`} />
        <Seam d="M-120 0H-28M28 0H120" w={1.4} o={0.45} />
      </g>
      <path d={T1_TOP} fill={`url(#${p}-plinthTop)`} />
      <path d={T1_FRONT} fill={`url(#${p}-plinth)`} />
      <path d={T1_FRONT} fill={`url(#${p}-brush)`} />
      <path d={T1_SIDE} fill="#101215" />
      <path d={T1_SIDE} fill="none" stroke="#eef4ff" strokeOpacity=".52" strokeWidth="2" />
      <path d="M-128 182H128M128 182L152 168" stroke="#fff" strokeOpacity=".5" strokeWidth="1.6" />
      <path d="M-128 252H128" stroke="#000" strokeOpacity=".6" strokeWidth="2" />
      <path d={plaque} transform="translate(3 4)" fill="#000" opacity=".5" />
      <path d={plaque} fill={`url(#${p}-heat)`} />
      <path d="M-70 198.5H80" stroke="#fff" strokeOpacity=".55" strokeWidth="1.4" />
      <path d="M-44 212H52M-30 222H38" stroke="#4a1606" strokeOpacity=".55" strokeWidth="2.4" strokeLinecap="round" />
      <Rivet p={p} x={-66} y={216} r={3.6} />
      <Rivet p={p} x={68} y={216} r={3.6} />

      {/* foot and stem, ringed and beaded */}
      <path d={FOOT} fill={`url(#${p}-chromeH)`} />
      <path d={FOOT} fill={`url(#${p}-shadeDown)`} />
      <Seam d="M-70 146C-30 154 30 154 70 146" w={1.4} o={0.4} />
      <path d="M-110 166A112 16 0 0 0 110 166L110 176A112 16 0 0 1 -110 176Z" fill={`url(#${p}-plinth)`} />
      <ellipse cy="164" rx="110" ry="14" fill={`url(#${p}-chromeH)`} />
      <path d="M-104 168A108 12 0 0 0 60 176" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" />
      <path d="M-16 58L-22 104L22 104L16 58Z" fill={`url(#${p}-chromeH)`} />
      <ellipse cy="68" rx="18" ry="4" fill="none" stroke="#000" strokeOpacity=".45" strokeWidth="2" />
      <ellipse cy="94" rx="21" ry="4.5" fill="none" stroke="#000" strokeOpacity=".45" strokeWidth="2" />
      <ellipse cy="44" rx="42" ry="20" fill={`url(#${p}-chromeH)`} />
      <ellipse cy="44" rx="42" ry="20" fill={`url(#${p}-shadeDown)`} />
      <path d="M-42 44A42 8 0 0 0 42 44" fill="none" stroke="#ee6a2c" strokeWidth="4" />
      {knotBeads.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={`url(#${p}-rivet)`} />
      ))}
      <ellipse cx="-14" cy="34" rx="13" ry="5" fill="#fff" opacity=".65" />
      <path d="M-32 -14C-20 4 -16 16 -16 28L16 28C16 16 20 4 32 -14Z" fill={`url(#${p}-chromeH)`} />

      {/* handles, with scroll ends */}
      {[1, -1].map((sx) => (
        <g key={sx} transform={`scale(${sx} 1)`}>
          <path d={HANDLE} fill={`url(#${p}-chromeV)`} />
          <path d="M-146 -262C-200 -280 -238 -236 -228 -184" fill="none" stroke={sx > 0 ? '#fff' : '#eef4ff'} strokeOpacity={sx > 0 ? 0.82 : 0.58} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M-128 -132C-170 -138 -198 -152 -204 -186C-212 -222 -188 -248 -148 -238" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="2.2" />
          <path d="M-140 -252C-186 -262 -218 -232 -216 -190C-214 -150 -180 -128 -130 -120" fill="none" stroke="#000" strokeOpacity=".22" strokeWidth="1.4" />
          <circle cx="-231" cy="-198" r="11" fill={`url(#${p}-rivet)`} />
          <circle cx="-231" cy="-198" r="5" fill="none" stroke="#000" strokeOpacity=".4" strokeWidth="1.4" />
        </g>
      ))}

      {/* the bowl: polished, fluted below, the heat band caught in the chrome */}
      <path d={BOWL} fill={`url(#${p}-chromeH)`} />
      <path d={BOWL} fill={`url(#${p}-shadeDown)`} />
      <path d="M-150 -296C-150 -170 -112 -66 -32 -14L-60 -14C-126 -76 -142 -170 -142 -290Z" fill="#ff7a3a" opacity=".24" />
      <path d="M36 -270C40 -170 32 -90 14 -30L40 -40C60 -100 66 -180 62 -272Z" fill="#000" opacity=".22" />
      <clipPath id={`${p}-bowlClip`}>
        <path d={BOWL} />
      </clipPath>
      <g clipPath={`url(#${p}-bowlClip)`}>
        {FLUTES.map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke="#000" strokeOpacity=".4" strokeWidth="1.8" />
            <path d={d} fill="none" stroke="#fff" strokeOpacity=".32" strokeWidth="1.1" transform="translate(-3 0)" />
          </g>
        ))}
        <path d="M-160 -150C-60 -138 60 -138 160 -150" fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="10" />
        <path d={BOWL} fill={`url(#${p}-ink)`} opacity=".45" />
      </g>
      <path d={`M${-BAND_T} -214A${BAND_T} 14 0 0 0 ${BAND_T} -214L${BAND_B} -188A${BAND_B} 14 0 0 1 ${-BAND_B} -188Z`} fill={`url(#${p}-heat)`} />
      <path d={`M${-BAND_T} -214A${BAND_T} 14 0 0 0 ${BAND_T} -214`} fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.6" />
      <path d={`M${-BAND_B} -188A${BAND_B} 14 0 0 0 ${BAND_B} -188`} fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="2" />
      {/* laurels round the emblem */}
      {[1, -1].map((sx) => (
        <g key={sx} transform={`scale(${sx} 1)`}>
          <Seam d={LAUREL.stem} w={1.6} o={0.45} />
          {LAUREL.leaves.map(([x, y, a], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
              <ellipse cx="9" rx="10" ry="3.8" fill="#000" opacity=".3" />
              <ellipse cx="8" cy="-1" rx="10" ry="3.6" fill="#fff" opacity=".22" />
            </g>
          ))}
        </g>
      ))}
      <g transform="translate(0 -128)">
        <path d={DIAMOND(50, 7)} transform="translate(4 5)" fill="#000" opacity=".45" />
        <path d={DIAMOND(50, 7)} fill={`url(#${p}-rim)`} />
        <path d={DIAMOND(38, 5)} fill={`url(#${p}-heatR)`} />
        <circle r="28" fill={`url(#${p}-heatGlow)`} opacity=".7" />
        <Chevrons p={p} s={0.48} />
      </g>
      <path d="M-30 -270C-26 -170 -14 -90 4 -40" fill="none" stroke="#fff" strokeOpacity=".72" strokeWidth="5" strokeLinecap="round" />
      <path d="M-56 -268C-54 -230 -50 -206 -46 -190" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M150 -292C150 -170 112 -66 32 -14" fill="none" stroke="#eef4ff" strokeOpacity=".72" strokeWidth="2.6" />

      {/* the mouth: the far inner wall lit, a beaded lip */}
      <ellipse cy="-297" rx="141" ry="21" fill={`url(#${p}-interior)`} />
      <ellipse cy="-296" rx="150" ry="26" fill="none" stroke={`url(#${p}-chromeH)`} strokeWidth="8" />
      <path d="M-128 -283A150 26 0 0 0 40 -270" fill="none" stroke="#fff" strokeOpacity=".88" strokeWidth="2" />
      {lipBeads.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.4" fill={`url(#${p}-rivet)`} />
      ))}

      <Glint p={p} x={-96} y={-312} s={24} />
      <Glint p={p} x={-16} y={36} s={12} />
      <Glint p={p} x={-212} y={-226} s={11} />
      <Glint p={p} x={152} y={168} s={9} />
      <Glint p={p} x={-40} y={-150} s={9} />
    </g>
  );
}

/* ── the component ─────────────────────────────────────────────── */

type Theme = 'dark' | 'light';
const SHADE: Record<Theme, string> = { dark: 'rgba(0, 0, 0, 0.62)', light: 'rgba(34, 40, 52, 0.42)' };

function ArtSvg({ kind, arena, theme, className }: { kind: StageKind; arena?: ArenaId; theme: Theme; className?: string }) {
  const p = `da${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Shade.Provider value={SHADE[theme]}>
      <svg xmlns="http://www.w3.org/2000/svg" className={className} data-kind={kind} viewBox="0 0 560 780" width="560" height="780" aria-hidden="true" focusable="false">
        <Defs p={p} />
        {kind === 'battle' ? <Shield p={p} arena={arena ?? 'slice'} /> : kind === 'course' ? <Tome p={p} /> : kind === 'assessment' ? <Clipboard p={p} /> : <Trophy p={p} />}
      </svg>
    </Shade.Provider>
  );
}

/*
  The drawings are rich: up to 800 SVG nodes each. Mounting that many nodes in the cut from the
  map would cost the transition its frames, so each drawing is rendered once, in idle time, to
  a static SVG image and cached; the screen then mounts a single <img>. Until a drawing is
  ready (the first seconds after load) it is drawn inline, as before.
*/
const urls = new Map<string, string>();
const keyOf = (kind: StageKind, arena: ArenaId | undefined, theme: Theme) => `${kind}|${kind === 'battle' ? arena ?? 'slice' : ''}|${theme}`;

function bake(kind: StageKind, arena: ArenaId | undefined, theme: Theme) {
  const key = keyOf(kind, arena, theme);
  if (urls.has(key)) return;
  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() => root.render(<ArtSvg kind={kind} arena={arena} theme={theme} />));
  const svg = host.firstElementChild;
  if (svg) {
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
    urls.set(key, url);
    // let the browser parse and draw it once, off the critical path
    const img = new Image();
    img.src = url;
    img.decode().catch(() => {});
  }
  root.unmount();
}

const ALL: [StageKind, ArenaId?][] = [
  ['course'],
  ['assessment'],
  ['cup'],
  ['battle', 'slice'],
  ['battle', 'fast-track'],
  ['battle', 'leverage'],
  ['battle', 'blackout'],
  ['battle', 'zero-day'],
  ['battle', 'red-flag'],
];

function docTheme(): Theme {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** bake a theme's drawings in idle slices, one drawing per slice */
const warmed = new Set<Theme>();
function warm(theme: Theme) {
  if (warmed.has(theme)) return;
  warmed.add(theme);
  const queue = ALL.map(([k, a]) => [k, a, theme] as const);
  const idle = (cb: () => void) => (typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 250));
  const step = () => {
    const next = queue.shift();
    if (!next) return;
    bake(next[0], next[1], next[2]);
    idle(step);
  };
  idle(step);
}

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}

if (typeof window !== 'undefined') {
  warm(docTheme());
  // a viewer who switches theme gets that theme's drawings baked too
  subscribe(() => warm(docTheme()));
}

export function DetailArt({ kind, arena, className }: { kind: StageKind; arena?: ArenaId; className?: string }) {
  const theme = useSyncExternalStore(subscribe, docTheme, () => 'dark' as Theme);
  const url = urls.get(keyOf(kind, arena, theme));
  if (url) return <img className={className} src={url} alt="" draggable={false} aria-hidden="true" decoding="sync" />;
  return <ArtSvg kind={kind} arena={arena} theme={theme} className={className} />;
}
