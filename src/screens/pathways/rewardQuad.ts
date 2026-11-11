/*
  The COMPLETE FOR REWARDS screen lays its big picture back on the table, as the reference does:
  the gallery card's outline on the 1920 × 1080 frame is a quad, not a rectangle (measured on
  f_62.0, REWARDS_SCREEN.md §2.5). A CSS matrix3d built from four corners puts a flat element
  exactly onto that quad; anything else that shares the card's pose (the title nameplate) is a
  rectangle in the card's own plane, mapped through the same projection.
*/

export type Pt = readonly [number, number];
/** corners in the order top-left, top-right, bottom-right, bottom-left */
export type Quad = readonly [Pt, Pt, Pt, Pt];

/** the gallery card before the transform, in u */
export const CARD_W = 560;
export const CARD_H = 350;

/** where its corners land on the frame (u), measured on f_62.0 */
export const CARD_QUAD: Quad = [
  [676, 362],
  [1226, 355],
  [1332, 712],
  [684, 725],
];

/** the title nameplate, laid in the card's plane and centred on it (u) */
export const PLATE_W = 640;
export const PLATE_H = 150;

/** Heckbert's square-to-quad: the projective map of the unit square onto q */
function unitToQuad(q: Quad) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  return {
    a: x1 - x0 + g * x1,
    b: x3 - x0 + h * x3,
    d: y1 - y0 + g * y1,
    e: y3 - y0 + h * y3,
    g,
    h,
    x0,
    y0,
  };
}

/**
 * The CSS matrix3d that maps an element of w × h (px) onto q (px, in the coordinates of the
 * element's containing block), with `transform-origin: 0 0` and the element at left 0, top 0.
 */
export function quadMatrix(w: number, h: number, q: Quad) {
  const m = unitToQuad(q);
  const r = (n: number) => +n.toFixed(9);
  return `matrix3d(${r(m.a / w)},${r(m.d / w)},0,${r(m.g / w)},${r(m.b / h)},${r(m.e / h)},0,${r(m.h / h)},0,0,1,0,${r(m.x0)},${r(m.y0)},0,1)`;
}

/** where a point (x, y) of a w × h element lands once the element is mapped onto q */
export function mapPoint(w: number, h: number, q: Quad, x: number, y: number): Pt {
  const m = unitToQuad(q);
  const u = x / w;
  const v = y / h;
  const den = m.g * u + m.h * v + 1;
  return [(m.a * u + m.b * v + m.x0) / den, (m.d * u + m.e * v + m.y0) / den];
}

/** a rectangle of the card's own plane (card units), as a quad on the frame */
export function cardRect(x: number, y: number, w: number, h: number): Quad {
  return [
    mapPoint(CARD_W, CARD_H, CARD_QUAD, x, y),
    mapPoint(CARD_W, CARD_H, CARD_QUAD, x + w, y),
    mapPoint(CARD_W, CARD_H, CARD_QUAD, x + w, y + h),
    mapPoint(CARD_W, CARD_H, CARD_QUAD, x, y + h),
  ];
}

/** the nameplate's quad: PLATE_W × PLATE_H, centred on the card, in the card's pose */
export const PLATE_QUAD: Quad = cardRect(CARD_W / 2 - PLATE_W / 2, CARD_H / 2 - PLATE_H / 2, PLATE_W, PLATE_H);

/** every corner of q, scaled by k (u → px) and moved by (-ox, -oy) u first */
export function toPx(q: Quad, k: number, ox = 0, oy = 0): Quad {
  return q.map(([x, y]) => [(x - ox) * k, (y - oy) * k] as const) as unknown as Quad;
}
