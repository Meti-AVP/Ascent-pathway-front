/*
  Geometry for the stage detail's drawn shapes: rounded polygons, arcs and glints, and the
  leaning requirement card. Pure functions only, so the components that draw with them keep
  their hot reload.
*/

export type P = readonly [number, number];

export const r1 = (n: number) => Math.round(n * 10) / 10;

/** a closed polygon with every corner rounded (quadratic corners, r clamped to half an edge) */
export function rounded(pts: readonly P[], r: number | readonly number[]): string {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const ri = typeof r === 'number' ? r : r[i]!;
    const l0 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]);
    const l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const k0 = Math.min(ri, l0 / 2) / l0;
    const k2 = Math.min(ri, l2 / 2) / l2;
    const a = [p1[0] + (p0[0] - p1[0]) * k0, p1[1] + (p0[1] - p1[1]) * k0];
    const b = [p1[0] + (p2[0] - p1[0]) * k2, p1[1] + (p2[1] - p1[1]) * k2];
    d += `${i ? 'L' : 'M'}${r1(a[0]!)} ${r1(a[1]!)}Q${r1(p1[0])} ${r1(p1[1])} ${r1(b[0]!)} ${r1(b[1]!)}`;
  }
  return d + 'Z';
}

export const cubic = (p0: P, p1: P, p2: P, p3: P, t: number): P => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

export const quad = (p0: P, p1: P, p2: P, t: number): P => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
};

/** a point on a circle, angle in degrees counter-clockwise from 3 o'clock (y down) */
export const polar = (r: number, deg: number): P => [r * Math.cos((deg * Math.PI) / 180), -r * Math.sin((deg * Math.PI) / 180)];

/** an annular sector from a0 to a1 (degrees, a0 > a1: drawn clockwise) between radii ri and ro */
export function sector(ri: number, ro: number, a0: number, a1: number) {
  const [x0, y0] = polar(ro, a0);
  const [x1, y1] = polar(ro, a1);
  const [x2, y2] = polar(ri, a1);
  const [x3, y3] = polar(ri, a0);
  const large = a0 - a1 > 180 ? 1 : 0;
  return `M${r1(x0)} ${r1(y0)}A${ro} ${ro} 0 ${large} 1 ${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}A${ri} ${ri} 0 ${large} 0 ${r1(x3)} ${r1(y3)}Z`;
}

/** a four-point glint */
export function starPath(x: number, y: number, s: number, w = 0.13) {
  const t = s * w;
  return `M${r1(x)} ${r1(y - s)}L${r1(x + t)} ${r1(y - t)}L${r1(x + s)} ${r1(y)}L${r1(x + t)} ${r1(y + t)}L${r1(x)} ${r1(y + s)}L${r1(x - t)} ${r1(y + t)}L${r1(x - s)} ${r1(y)}L${r1(x - t)} ${r1(y - t)}Z`;
}

/* ── the requirement card ──────────────────────────────────────── */

/** the card, in u: W × H upright, leaning 12° (the top to the right) */
export const CARD_W = 314;
export const CARD_H = 575;
export const TAN12 = Math.tan((12 * Math.PI) / 180);
/** how far the leaning card reaches past its upright box on each side */
export const CARD_OVER = (CARD_H / 2) * TAN12;
/** the leaning footprint's width: the skin is drawn in a CARD_SW × CARD_H field */
export const CARD_SW = CARD_W + CARD_H * TAN12;
/** the line of the card's lower band (the reference's item band), from the top */
export const CARD_BAND = 422;

/** a point of the upright card, leaned into the skin's field */
const lean = ([x, y]: P): P => [x + (CARD_H - y) * TAN12, y];

const W = CARD_W;
const H = CARD_H;

/** the card: a chamfer at the top left and the bottom right, every corner rounded */
export const CARD_D = rounded(
  (
    [
      [0, 38],
      [38, 0],
      [W, 0],
      [W, H - 28],
      [W - 28, H],
      [0, H],
    ] as P[]
  ).map(lean),
  [9, 9, 16, 9, 9, 16],
);

/** the lower band, from its line to the foot */
export const CARD_BAND_D = rounded(
  (
    [
      [0, CARD_BAND],
      [W, CARD_BAND],
      [W, H - 28],
      [W - 28, H],
      [0, H],
    ] as P[]
  ).map(lean),
  [0, 0, 9, 9, 16],
);

/** the band's line: a lit edge across the card */
export const CARD_BAND_LINE = (() => {
  const [x0, y0] = lean([0, CARD_BAND]);
  const [x1, y1] = lean([W, CARD_BAND]);
  return `M${r1(x0)} ${r1(y0)}L${r1(x1)} ${r1(y1)}`;
})();

/** the notch at the top right that holds the status dots */
export const CARD_NOTCH_D = rounded(
  (
    [
      [W - 140, -2],
      [W - 22, -2],
      [W - 22, 21],
      [W - 140, 21],
    ] as P[]
  ).map(lean),
  [0, 0, 8, 8],
);

/** the hexagon of a stage pip, 84 × 74, flat top, corners rounded */
export const PIP_D = rounded(
  [
    [21, 0],
    [63, 0],
    [84, 37],
    [63, 74],
    [21, 74],
    [0, 37],
  ],
  9,
);

/* ── detail helpers for the drawn objects ──────────────────────── */

/** two paths with the same commands, blended: t = 0 is a, t = 1 is b (an inset outline) */
export function lerpPath(a: string, b: string, t: number) {
  const nb = b.match(/-?\d*\.?\d+/g)!.map(Number);
  let i = 0;
  return a.replace(/-?\d*\.?\d+/g, (m) => {
    const v = Number(m) + (nb[i]! - Number(m)) * t;
    i++;
    return String(r1(v));
  });
}

/** a small deterministic random source, so the wear marks are the same on every render */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** a regular hexagon of radius r around (x, y), pointy side up when rot = 30 */
export function hexagon(x: number, y: number, r: number, rot = 30) {
  let d = '';
  for (let i = 0; i < 6; i++) {
    const a = ((rot + i * 60) * Math.PI) / 180;
    d += `${i ? 'L' : 'M'}${r1(x + r * Math.cos(a))} ${r1(y + r * Math.sin(a))}`;
  }
  return d + 'Z';
}

/** the point and outward normal of a cubic at t (the outward side is to the left of travel when ccw) */
export function cubicAt(p0: P, p1: P, p2: P, p3: P, t: number, outward: 1 | -1 = 1): { p: P; n: P } {
  const p = cubic(p0, p1, p2, p3, t);
  const u = 1 - t;
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  const l = Math.hypot(dx, dy) || 1;
  return { p, n: [(dy / l) * outward, (-dx / l) * outward] };
}
