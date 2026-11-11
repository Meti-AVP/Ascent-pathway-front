import { memo, type ReactNode } from 'react';
import { castArt, type Rarity, type RewardItem } from '../../data/pathways';
import './reward-art.css';

/**
 * One component draws any reward in its own form, as game reward art: a gallery card is a cast
 * painting on a white card (a heat sunburst, halftone and streaks behind the figure, a leaning
 * name plate, the serial and a rarity gem); a badge, a title nameplate and a cup banner are drawn
 * in SVG — bevelled graphite, a heat inlay, silver-sheen emblems, rim light, specular highlights,
 * inner shadows and halftone, tinted by rarity; a Legendary reward has silver shards behind it.
 * The same component serves every place a reward appears:
 *   - 'preview' — the big picture on the COMPLETE FOR REWARDS screen
 *   - 'inspect' — the same, enlarged and untilted, under INSPECT (Z)
 *   - 'thumb'   — the small picture in a thumbnail of the rewards track (a lighter drawing)
 *   - 'block'   — the picture in the map's bottom-left rewards block
 * The caller places and sizes it; the art fills its box. The paintings are never filtered and
 * never drawn above 1× of their 720 × 1040 source at 1920 × 1080.
 *
 * Every gradient, print, clip and emblem the drawings share lives once in the document (see
 * `paintDefs`), so an instance only draws its own shapes.
 */
export type RewardArtVariant = 'preview' | 'inspect' | 'thumb' | 'block';

export type RewardArtProps = {
  item: RewardItem;
  variant: RewardArtVariant;
  /** the learner's avatar key: a title nameplate shows the learner's face */
  avatarKey?: string;
  className?: string;
};

export const RewardArt = memo(function RewardArt({ item, variant, avatarKey, className }: RewardArtProps) {
  const cls = `reward-art is-${item.kind} is-${variant}${className ? ` ${className}` : ''}`;
  const lean = variant === 'thumb';
  let art: ReactNode;
  if (item.kind === 'card') art = <CardArt item={item} variant={variant} />;
  else if (item.kind === 'badge') art = lean ? <BadgeThumb item={item} /> : <BadgeArt item={item} />;
  else if (item.kind === 'title') art = <TitleArt item={item} variant={variant} face={avatarKey ? castArt(avatarKey, 'face') : undefined} />;
  else art = lean ? <BannerThumb item={item} /> : <BannerArt item={item} />;
  return (
    <div className={cls} data-rarity={item.rarity} aria-hidden="true">
      {art}
    </div>
  );
});

/* ── geometry ───────────────────────────────────────────────────────────────────────────── */

type P = readonly [number, number];
const r1 = (n: number) => Math.round(n * 10) / 10;

/** a polygon with its corners rounded by r (quadratic corners) */
function rounded(pts: readonly P[], r: number) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const l1 = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]);
    const l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const a: P = [p1[0] + ((p0[0] - p1[0]) / l1) * r, p1[1] + ((p0[1] - p1[1]) / l1) * r];
    const b: P = [p1[0] + ((p2[0] - p1[0]) / l2) * r, p1[1] + ((p2[1] - p1[1]) / l2) * r];
    d += `${i === 0 ? 'M' : 'L'}${r1(a[0])} ${r1(a[1])}Q${r1(p1[0])} ${r1(p1[1])} ${r1(b[0])} ${r1(b[1])}`;
  }
  return d + 'Z';
}

/** a pointy-top hexagon's corners */
function hexPts(cx: number, cy: number, R: number): P[] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return [cx + Math.cos(a) * R, cy + Math.sin(a) * R] as const;
  });
}

/** the badge's heater shield, scaled by s about (200, 210) */
function shieldPath(s: number) {
  const p = (x: number, y: number) => `${r1(200 + (x - 200) * s)} ${r1(210 + (y - 210) * s)}`;
  return `M${p(56, 70)}Q${p(200, 20)} ${p(344, 70)}L${p(344, 196)}Q${p(338, 318)} ${p(200, 404)}Q${p(62, 318)} ${p(56, 196)}Z`;
}

/** a leaning plate: x0..x1 along the top, y0..y1, leaning 12° */
function leanRect(x0: number, x1: number, y0: number, y1: number): P[] {
  const dx = (y1 - y0) * Math.tan((12 * Math.PI) / 180);
  return [
    [x0 + dx, y0],
    [x1, y0],
    [x1 - dx, y1],
    [x0, y1],
  ];
}

/** a four-point sparkle */
function sparkle(x: number, y: number, r: number) {
  const k = r * 0.2;
  return `M${x} ${y - r}L${x + k} ${y - k}L${x + r} ${y}L${x + k} ${y + k}L${x} ${y + r}L${x - k} ${y + k}L${x - r} ${y}L${x - k} ${y - k}Z`;
}

/** a five-point star */
function star(x: number, y: number, r: number) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = ((-90 + i * 36) * Math.PI) / 180;
    const rr = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'}${r1(x + Math.cos(a) * rr)} ${r1(y + Math.sin(a) * rr)}`;
  }
  return d + 'Z';
}

/** silver blades radiating from (cx, cy): the lit halves and the shaded halves, each as one path */
function shardPaths(cx: number, cy: number, long: number, short: number, w: number, sx = 1, sy = 1) {
  let lit = '';
  let shade = '';
  for (let i = 0; i < 8; i++) {
    const a = ((i * 45 - 90 + 22.5) * Math.PI) / 180;
    const L = i % 2 ? short : long;
    const ux = Math.cos(a) * sx;
    const uy = Math.sin(a) * sy;
    const px = -Math.sin(a);
    const py = Math.cos(a);
    const r0 = L * 0.22;
    const tip = `${r1(cx + ux * L)} ${r1(cy + uy * L)}`;
    const base = `${r1(cx + ux * r0)} ${r1(cy + uy * r0)}`;
    const left = `${r1(cx + ux * r0 * 1.4 + px * w)} ${r1(cy + uy * r0 * 1.4 + py * w)}`;
    const right = `${r1(cx + ux * r0 * 1.4 - px * w)} ${r1(cy + uy * r0 * 1.4 - py * w)}`;
    lit += `M${base}L${left}L${tip}Z`;
    shade += `M${base}L${right}L${tip}Z`;
  }
  return { lit, shade };
}

/** rough advance of Barlow Condensed black italic capitals, in em */
function textWidth(s: string, size: number) {
  let w = 0;
  for (const ch of s.toUpperCase()) w += ch === ' ' ? 0.21 : 'MW'.includes(ch) ? 0.66 : 'IJ1'.includes(ch) ? 0.27 : "'.,".includes(ch) ? 0.2 : 0.48;
  return w * size;
}

/** the largest size from `size` down to `min` at which the name sets in at most `lines` lines of `max` */
function fit(name: string, max: number, size: number, min: number, lines = 1) {
  const words = name.toUpperCase().split(' ');
  for (let s = size; s >= min; s -= 1) {
    const out: string[] = [];
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (textWidth(next, s) <= max || !line) line = next;
      else {
        out.push(line);
        line = w;
      }
    }
    out.push(line);
    if (out.length <= lines && out.every((l) => textWidth(l, s) <= max)) return { lines: out, size: s };
  }
  return { lines: [name.toUpperCase()], size: min };
}

/* ── the shapes ─────────────────────────────────────────────────────────────────────────── */

const HEX_BODY = rounded(hexPts(200, 210, 176), 22);
const HEX_INNER = rounded(hexPts(200, 210, 157), 17);
const HEX_LINE = rounded(hexPts(200, 210, 167), 20);
const SHIELD_BODY = shieldPath(1);
const SHIELD_INNER = shieldPath(0.9);
const SHIELD_LINE = shieldPath(0.955);
const RIBBON_BAND = 'M40 332Q200 356 360 332V384Q200 408 40 384Z';
const CLOTH = 'M30 26H270V444Q270 453 262 449L150 397 38 449Q30 453 30 444Z';
const TRIM = 'M44 62H256V425L150 377 44 425Z';
const RING_CY = 196;
const RING = `M200 ${RING_CY - 121}a121 121 0 1 1 0 242a121 121 0 1 1 0-242ZM200 ${RING_CY - 99}a99 99 0 1 0 0 198a99 99 0 1 0 0-198Z`;
const RING_TICKS = Array.from({ length: 24 }, (_, i) => {
  const a = (i * 15 * Math.PI) / 180;
  return `M${r1(200 + Math.cos(a) * 102)} ${r1(RING_CY + Math.sin(a) * 102)}L${r1(200 + Math.cos(a) * 112)} ${r1(RING_CY + Math.sin(a) * 112)}`;
}).join('');
const BADGE_SHARDS = shardPaths(200, 200, 240, 204, 30);

type PlateLayout = {
  key: 'plate' | 'block' | 'thumb';
  vw: number;
  vh: number;
  plate: P[];
  hex: { x: number; y: number; R: number; ring: number; face: number };
  text: { x: number; y: number; max: number; size: number; min: number; lines: number; gap: number };
  tag?: { x: number; y: number };
  bar: P[];
  shards?: { lit: string; shade: string; cx: number; cy: number; r: number; sx: number; sy?: number };
};

const PLATES: Record<PlateLayout['key'], PlateLayout> = {
  thumb: {
    key: 'thumb',
    vw: 120,
    vh: 84,
    plate: leanRect(26, 118, 26, 62),
    hex: { x: 34, y: 44, R: 32, ring: 5, face: 50 },
    text: { x: 0, y: 0, max: 0, size: 0, min: 0, lines: 0, gap: 0 },
    bar: leanRect(52, 112, 55, 59),
  },
  block: {
    key: 'block',
    vw: 340,
    vh: 230,
    plate: leanRect(84, 338, 64, 178),
    hex: { x: 96, y: 118, R: 86, ring: 11, face: 140 },
    tag: { x: 190, y: 98 },
    text: { x: 188, y: 146, max: 128, size: 46, min: 26, lines: 2, gap: 34 },
    bar: leanRect(182, 318, 166, 171),
    shards: { ...shardPaths(200, 118, 150, 120, 12, 1.3), cx: 200, cy: 118, r: 93, sx: 1.3 },
  },
  plate: {
    key: 'plate',
    vw: 640,
    vh: 150,
    plate: leanRect(64, 634, 18, 132),
    hex: { x: 90, y: 75, R: 66, ring: 9, face: 110 },
    tag: { x: 186, y: 48 },
    text: { x: 184, y: 104, max: 420, size: 56, min: 34, lines: 1, gap: 0 },
    bar: leanRect(176, 612, 119, 124),
    // flattened: the tips stay clear of the line of copy under the plate
    shards: { ...shardPaths(380, 75, 150, 118, 14, 2.1, 0.6), cx: 380, cy: 75, r: 93, sx: 2.1, sy: 0.6 },
  },
};

const plateFor = (variant: RewardArtVariant) => (variant === 'thumb' ? PLATES.thumb : variant === 'block' ? PLATES.block : PLATES.plate);
const plateShape = (L: PlateLayout) => rounded(L.plate, L.key === 'thumb' ? 4 : 10);
const hexOuter = (L: PlateLayout) => rounded(hexPts(L.hex.x, L.hex.y, L.hex.R), L.hex.R * 0.14);
const hexInner = (L: PlateLayout) => rounded(hexPts(L.hex.x, L.hex.y, L.hex.R - L.hex.ring), (L.hex.R - L.hex.ring) * 0.12);

/**
 * The outline of a drawn reward (badge, nameplate, banner) as an SVG data URI in the art's own
 * viewBox, for masking an overlay to the object (INSPECT's glare). Cards are rectangles: null.
 */
export function rewardSilhouette(item: RewardItem): string | null {
  let vb = '';
  let d = '';
  if (item.kind === 'badge') {
    vb = '0 0 400 440';
    d = (item.rarity === 'Epic' ? SHIELD_BODY : HEX_BODY) + RIBBON_BAND;
  } else if (item.kind === 'title') {
    const L = PLATES.plate;
    vb = `0 0 ${L.vw} ${L.vh}`;
    d = plateShape(L) + hexOuter(L);
  } else if (item.kind === 'banner') {
    vb = '0 0 300 470';
    d = CLOTH;
  } else return null;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${vb}' preserveAspectRatio='none'><path fill='black' d='${d}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/* ── the shared paint: written once into the document ─────────────────────────────────── */

type EmblemName = NonNullable<RewardItem['emblem']>;

/** the emblems' silver parts, in a 100 × 100 field; a <use> gives them their paint */
const EMBLEM_MAIN: Record<EmblemName, string> = {
  slice:
    '<path d="M30 36C30 21 40 12 52 12C64 12 73 20 73 31C73 41 66 46 60 50C55 53 53 57 53 63" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><circle cx="53" cy="81" r="8" stroke="none"/>',
  trophy:
    '<path d="M29 14H71V33C71 50 62 60 50 62C38 60 29 50 29 33Z" stroke="none"/><path d="M29 21H17C17 35 23 41 31 43M71 21H83C83 35 77 41 69 43" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M44 61H56L58 74H42ZM31 74H69L73 86H27ZM23 87H77V93H23Z" stroke="none"/>',
  'shield-bolt':
    '<path fill-rule="evenodd" stroke="none" d="M50 7 85 19V46C85 70 69 86 50 94 31 86 15 70 15 46V19ZM50 18 76 27V46C76 63 64 75 50 82 36 75 24 63 24 46V27Z"/><path stroke="none" d="M57 21 35 53H48L42 79 66 44H53Z"/>',
  'speech-check':
    '<path fill-rule="evenodd" stroke="none" d="M20 16H80Q90 16 90 26V60Q90 70 80 70H46L28 87 31 70H20Q10 70 10 60V26Q10 16 20 16ZM26 42 41 56 70 27 78 35 41 70 18 50Z"/>',
  summit: '<path d="M3 87 36 33 48 49 62 24 97 87Z" stroke="none"/><path d="M62 25V5" fill="none" stroke-width="3.4" stroke-linecap="round"/>',
  sentinel:
    '<path fill-rule="evenodd" stroke="none" d="M4 53C20 27 80 27 96 53 80 79 20 79 4 53ZM17 53C30 38 70 38 83 53 70 68 30 68 17 53Z"/><path d="M50 5V17M24 11l6 10M76 11l-6 10" fill="none" stroke-width="5" stroke-linecap="round"/>',
};

const SHEEN_STOPS =
  '<stop offset="0" stop-color="#f7f8f9"/><stop offset=".28" stop-color="#cfd3d8"/><stop offset=".47" stop-color="#f1f2f4"/><stop offset=".72" stop-color="#a9aeb6"/><stop offset="1" stop-color="#dfe2e6"/>';
const HEAT_STOPS = (mid: number) => `<stop offset="0" class="ra-stop-hot"/><stop offset="${mid}" class="ra-stop-heat"/><stop offset="1" class="ra-stop-deep"/>`;
const fade = (id: string, x1: number, y1: number, x2: number, y2: number, from: number) =>
  `<linearGradient id="${id}g" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="${from}" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>` +
  `<mask id="${id}" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#${id}g)"/></mask>`;

function paintDefs() {
  const clips: [string, string][] = [
    ['ra-cb-hex', HEX_BODY],
    ['ra-ci-hex', HEX_INNER],
    ['ra-cb-shield', SHIELD_BODY],
    ['ra-ci-shield', SHIELD_INNER],
    ['ra-cc-cloth', CLOTH],
  ];
  for (const L of Object.values(PLATES)) {
    clips.push([`ra-cp-${L.key}`, plateShape(L)], [`ra-co-${L.key}`, hexOuter(L)], [`ra-ci-${L.key}`, hexInner(L)]);
  }
  return (
    `<linearGradient id="ra-sh" x1="0" y1="0" x2="1" y2=".45">${SHEEN_STOPS}</linearGradient>` +
    `<linearGradient id="ra-se" gradientUnits="userSpaceOnUse" x1="4" y1="6" x2="96" y2="48">${SHEEN_STOPS}</linearGradient>` +
    '<linearGradient id="ra-sh2" x1="0" y1="0" x2="1" y2=".4"><stop offset="0" stop-color="#f7f8f9"/><stop offset=".3" stop-color="#c9cdd3"/><stop offset=".5" stop-color="#fbfbfc"/><stop offset=".74" stop-color="#a3a8b0"/><stop offset="1" stop-color="#e4e6e9"/></linearGradient>' +
    '<linearGradient id="ra-gl" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="56"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".55" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="ra-sp"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
    `<linearGradient id="ra-ht" x1="0" y1="0" x2="0" y2="1">${HEAT_STOPS(0.55)}</linearGradient>` +
    `<linearGradient id="ra-rb-epic" x1="0" y1="0" x2="0" y2="1">${HEAT_STOPS(0.6)}</linearGradient>` +
    '<linearGradient id="ra-rt-epic" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ra-stop-heat"/><stop offset="1" class="ra-stop-deep"/></linearGradient>' +
    '<linearGradient id="ra-rb-rare" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4d7dc"/><stop offset=".5" stop-color="#a6abb3"/><stop offset="1" stop-color="#6f747d"/></linearGradient>' +
    '<linearGradient id="ra-rt-rare" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d828b"/><stop offset="1" stop-color="#474b52"/></linearGradient>' +
    '<linearGradient id="ra-o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#55565d"/><stop offset=".42" stop-color="#25262a"/><stop offset="1" stop-color="#0a0a0b"/></linearGradient>' +
    '<radialGradient id="ra-f" cx=".38" cy=".28" r=".85"><stop offset="0" stop-color="#2e2f34"/><stop offset=".55" stop-color="#151517"/><stop offset="1" stop-color="#060607"/></radialGradient>' +
    '<linearGradient id="ra-rl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="ra-rd" x1="0" y1="0" x2="1" y2="1"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></linearGradient>' +
    '<radialGradient id="ra-m" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#3a3b41"/><stop offset=".6" stop-color="#141416"/><stop offset="1" stop-color="#050506"/></radialGradient>' +
    '<linearGradient id="ra-sw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".5" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="ra-p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a2f"/><stop offset=".5" stop-color="#0d0d0f"/><stop offset="1" stop-color="#000"/></linearGradient>' +
    '<radialGradient id="ra-bk" cx=".5" cy=".85" r=".75"><stop offset="0" class="ra-stop-heat" stop-opacity=".75"/><stop offset=".55" stop-color="#1a1a1d"/><stop offset="1" stop-color="#0b0b0c"/></radialGradient>' +
    '<linearGradient id="ra-fo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".26"/><stop offset=".1" stop-color="#fff" stop-opacity=".1"/><stop offset=".26" stop-color="#000" stop-opacity=".14"/><stop offset=".44" stop-color="#fff" stop-opacity=".14"/><stop offset=".6" stop-color="#000" stop-opacity=".1"/><stop offset=".78" stop-color="#fff" stop-opacity=".12"/><stop offset=".92" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></linearGradient>' +
    '<linearGradient id="ra-ro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f7f8"/><stop offset=".45" stop-color="#c2c6cc"/><stop offset="1" stop-color="#4f535a"/></linearGradient>' +
    '<radialGradient id="ra-cap" cx=".36" cy=".32" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#c9cdd3"/><stop offset="1" stop-color="#555a62"/></radialGradient>' +
    '<linearGradient id="ra-un" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
    '<pattern id="ra-dt" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.25" fill="#fff"/></pattern>' +
    '<pattern id="ra-dk" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.4" fill="#000"/></pattern>' +
    '<pattern id="ra-hx" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(12)"><rect width="1.4" height="7" fill="#fff"/></pattern>' +
    fade('ra-mk-diag', 0, 0, 1, 1, 0.25) +
    fade('ra-mk-x', 0, 0, 1, 0, 0.55) +
    fade('ra-mk-y', 0, 0, 0, 1, 0.65) +
    clips.map(([id, d]) => `<clipPath id="${id}"><path d="${d}"/></clipPath>`).join('') +
    Object.entries(EMBLEM_MAIN)
      .map(([k, v]) => `<g id="ra-em-${k}">${v}</g>`)
      .join('') +
    '<path id="ra-tp" d="M40 372Q200 396 360 372"/>'
  );
}

/* written into the document once per load of this module (and again when it hot-reloads) */
if (typeof document !== 'undefined') {
  document.getElementById('ra-defs')?.remove();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'ra-defs';
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
  svg.innerHTML = `<defs>${paintDefs()}</defs>`;
  document.body.appendChild(svg);
}

/* ── shared pieces ──────────────────────────────────────────────────────────────────────── */

function Sparkles({ at }: { at: readonly (readonly [number, number, number])[] }) {
  return (
    <g className="ra-sparkles">
      {at.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r * 1.5} fill="url(#ra-sp)" opacity=".7" />
          <path d={sparkle(x, y, r)} fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Shards({ lit, shade, cx, cy, r, sx = 1, sy = 1 }: { lit: string; shade: string; cx: number; cy: number; r: number; sx?: number; sy?: number }) {
  return (
    <g className="ra-shards">
      <ellipse cx={cx} cy={cy} rx={r * sx} ry={r * sy} fill="url(#ra-sp)" opacity=".22" />
      <path d={lit} fill="url(#ra-sh)" />
      <path d={shade} fill="#666b74" />
    </g>
  );
}

/** an emblem's accents in their own paint: under and over its silver parts */
function emblemAccents(name: EmblemName): { under?: ReactNode; over?: ReactNode } {
  switch (name) {
    case 'slice':
      return {
        over: (
          <>
            <path d="M7 87 84 9l10 9-78 78z" fill="#111113" />
            <path d="M11 87 87 13l4 4-76 74z" fill="url(#ra-ht)" />
            <path d="M11 87 87 13" stroke="#fff" strokeOpacity=".75" strokeWidth="1.2" />
          </>
        ),
      };
    case 'trophy':
      return {
        over: (
          <>
            <path d={star(50, 32, 10.5)} fill="url(#ra-ht)" />
            <path d="M34 78H66L67.5 82.5H32.5Z" fill="url(#ra-ht)" />
          </>
        ),
      };
    case 'shield-bolt':
      return { under: <path d="M50 18 76 27V46C76 63 64 75 50 82 36 75 24 63 24 46V27Z" fill="url(#ra-ht)" /> };
    case 'speech-check':
      return { over: <path d="M28.5 43.5 41 55.5 70 30 75 35 41 66.5 21 50Z" fill="url(#ra-ht)" /> };
    case 'summit':
      return {
        over: (
          <>
            <path d="M62 24 97 87H76ZM36 33 48 49 43 56Z" fill="#000" opacity=".21" />
            <path d="M18 84 33 71 27 63 45 55 41 47 57 33" fill="none" className="ra-s-heat" strokeWidth="3" strokeDasharray="5 3.5" strokeLinecap="round" />
            <path d="M63.5 5 84 10.5 63.5 16.5Z" fill="url(#ra-ht)" />
          </>
        ),
      };
    case 'sentinel':
      return {
        over: (
          <>
            <circle cx="50" cy="53" r="13.5" fill="url(#ra-ht)" />
            <path d="M50 45.4a4.6 4.6 0 0 1 2.3 8.6l1.5 6.5h-7.6l1.5-6.5a4.6 4.6 0 0 1 2.3-8.6z" fill="#111113" />
            <circle cx="55" cy="47.5" r="2.2" fill="#fff" />
          </>
        ),
      };
  }
}

/** an emblem in silver: a hard drop, the sheen, then the gloss over its top half (`lean`: no gloss) */
function EmblemPaint({ name, x, y, s, lean }: { name: EmblemName; x: number; y: number; s: number; lean?: boolean }) {
  const e = emblemAccents(name);
  const href = `#ra-em-${name}`;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="ra-emblem">
      <use href={href} fill="#000" stroke="#000" opacity=".6" transform="translate(2.5 4)" />
      {e.under}
      <use href={href} fill="url(#ra-se)" stroke="url(#ra-se)" />
      {!lean && <use href={href} fill="url(#ra-gl)" stroke="url(#ra-gl)" opacity=".7" />}
      {e.over}
    </g>
  );
}

type Tone = { band: string; tail: string; ink: string; drop: boolean };

function ribbonTone(r: Rarity): Tone {
  if (r === 'Epic') return { band: 'url(#ra-rb-epic)', tail: 'url(#ra-rt-epic)', ink: '#fff', drop: true };
  if (r === 'Legendary') return { band: 'url(#ra-sh2)', tail: '#26272b', ink: '#0b0b0c', drop: false };
  return { band: 'url(#ra-rb-rare)', tail: 'url(#ra-rt-rare)', ink: '#0b0b0c', drop: false };
}

/** the rarity's tint as a flat paint, for the thin lines and bars */
const rarityInk = (r: Rarity) => (r === 'Epic' ? 'url(#ra-ht)' : r === 'Legendary' ? 'url(#ra-sh2)' : '#c2c6cc');

/* ── badge ──────────────────────────────────────────────────────────────────────────────── */

function BadgeArt({ item }: { item: RewardItem }) {
  const legendary = item.rarity === 'Legendary';
  const shield = item.rarity === 'Epic';
  const body = shield ? SHIELD_BODY : HEX_BODY;
  const inner = shield ? SHIELD_INNER : HEX_INNER;
  const line = shield ? SHIELD_LINE : HEX_LINE;
  const cb = shield ? 'url(#ra-cb-shield)' : 'url(#ra-cb-hex)';
  const ci = shield ? 'url(#ra-ci-shield)' : 'url(#ra-ci-hex)';
  const tone = ribbonTone(item.rarity);
  const name = fit(item.name, 262, 34, 20);
  const rivets = shield ? ([[64, 79], [336, 79], [200, 53]] as const) : hexPts(200, 210, 166).filter((_, i) => i !== 3);
  return (
    <svg className="ra-svg" viewBox="0 0 400 440" focusable="false">
      {legendary && <Shards {...BADGE_SHARDS} cx={200} cy={200} r={150} />}

      {/* the body: a comic drop, bevelled graphite with a lit top-left and a shaded bottom-right */}
      <path d={body} className="ra-drop" transform="translate(8 12)" />
      <path d={body} fill="url(#ra-o)" />
      <g clipPath={cb}>
        <path d={body} fill="none" stroke="url(#ra-rl)" strokeWidth="7" />
        <path d={body} fill="none" stroke="url(#ra-rd)" strokeWidth="8" />
        <path d={line} fill="none" stroke={rarityInk(item.rarity)} strokeWidth="2.2" opacity=".75" />
      </g>

      {/* the inset face: an engraved step, then halftone gathering at the lower right */}
      <path d={inner} fill="url(#ra-f)" />
      <g clipPath={ci}>
        <rect width="400" height="440" fill="url(#ra-dt)" opacity=".07" mask="url(#ra-mk-diag)" />
        <path d={inner} fill="none" stroke="#000" strokeOpacity=".75" strokeWidth="9" />
        <path d={inner} fill="none" stroke="url(#ra-rl)" strokeWidth="2" transform="translate(-1.5 -1.5)" opacity=".5" />
      </g>
      <path d={inner} fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="1.4" transform="translate(1.4 1.8)" />

      <path d={rivets.map(([x, y]) => `M${x + 1} ${y + 1.6}m-5.5 0a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0`).join('')} fill="#000" opacity=".55" />
      {rivets.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5.2" fill="url(#ra-sh)" />
      ))}
      <path d={rivets.map(([x, y]) => `M${x - 1.6} ${y - 1.8}m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0`).join('')} fill="#fff" />

      {/* the heat inlay ring: engraved ticks, a lit outer lip, a shaded inner edge, four studs */}
      <circle cx="200" cy={RING_CY} r="126" fill="#000" opacity=".5" />
      <path fillRule="evenodd" fill="url(#ra-ht)" d={RING} />
      <path d={RING_TICKS} stroke="#000" strokeOpacity=".38" strokeWidth="3" strokeLinecap="round" />
      <circle cx="200" cy={RING_CY} r="119.5" fill="none" stroke="url(#ra-rl)" strokeWidth="3" />
      <circle cx="200" cy={RING_CY} r="121.5" fill="none" stroke="#000" strokeOpacity=".55" strokeWidth="2" />
      <circle cx="200" cy={RING_CY} r="100.5" fill="none" stroke="#000" strokeOpacity=".6" strokeWidth="4" />
      {[45, 135, 225, 315].map((deg) => {
        const a = (deg * Math.PI) / 180;
        const x = r1(200 + Math.cos(a) * 110);
        const y = r1(RING_CY + Math.sin(a) * 110);
        return <circle key={deg} cx={x} cy={y} r="5" fill="url(#ra-sh)" stroke="#000" strokeOpacity=".5" strokeWidth="1.2" />;
      })}

      {/* the medallion: deep graphite, a halftone field, a fine engraved ring and a lit arc */}
      <circle cx="200" cy={RING_CY} r="98" fill="url(#ra-m)" />
      <circle cx="200" cy={RING_CY} r="98" fill="url(#ra-dt)" opacity=".08" />
      <circle cx="200" cy={RING_CY} r="86" fill="none" stroke="#fff" strokeOpacity=".08" strokeWidth="1.2" />
      <path d={`M130 ${RING_CY - 50}A86 86 0 0 1 230 ${RING_CY - 81}`} fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="2" strokeLinecap="round" />

      <EmblemPaint name={item.emblem ?? 'trophy'} x={137} y={RING_CY - 64} s={1.26} />

      {/* the specular sweep across the upper left of the body */}
      <path d="M0 0H286L36 330H0Z" fill="url(#ra-sw)" clipPath={cb} />

      {/* the ribbon: tails behind, folds, the band tinted by rarity, stitching and the name */}
      <path d="M54 344H6l16 26-16 26h48zM346 344h48l-16 26 16 26h-48z" fill={tone.tail} />
      <path d="M54 344H6l16 26-16 26h48zM346 344h48l-16 26 16 26h-48z" fill="url(#ra-dk)" opacity=".22" />
      <path d="M40 384 54 396V384ZM360 384 346 396V384Z" fill="#000" opacity=".65" />
      <path d={RIBBON_BAND} className="ra-drop" transform="translate(0 6)" />
      <path d={RIBBON_BAND} fill={tone.band} />
      {legendary && <path d="M40 338Q200 362 360 338M40 378Q200 402 360 378" fill="none" className="ra-s-heat" strokeWidth="2.6" />}
      <path d="M40 333.5Q200 357.5 360 333.5" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="2" />
      <path d="M40 382Q200 406 360 382" fill="none" stroke="#000" strokeOpacity=".32" strokeWidth="4" />
      <path d="M48 342Q200 366 352 342M48 375Q200 399 352 375" fill="none" stroke={tone.ink} strokeOpacity=".28" strokeWidth="1.2" strokeDasharray="5 4" />
      <path d="M58 361l6-6 6 6-6 6zM330 361l6-6 6 6-6 6z" fill={tone.ink} opacity=".55" />
      {tone.drop && (
        <text className="ra-type" fontSize={name.size} fill="#000" fillOpacity=".45" transform="translate(1.5 2.5)">
          <textPath href="#ra-tp" startOffset="50%" textAnchor="middle">
            {name.lines[0]}
          </textPath>
        </text>
      )}
      <text className="ra-type" fontSize={name.size} fill={tone.ink}>
        <textPath href="#ra-tp" startOffset="50%" textAnchor="middle">
          {name.lines[0]}
        </textPath>
      </text>

      <Sparkles at={legendary ? [[104, 104, 15], [318, 300, 10], [236, 40, 8]] : [[110, 110, 11]]} />
    </svg>
  );
}

/** the badge at thumbnail size: the same object, drawn in its main planes only */
function BadgeThumb({ item }: { item: RewardItem }) {
  const shield = item.rarity === 'Epic';
  const body = shield ? SHIELD_BODY : HEX_BODY;
  const tone = ribbonTone(item.rarity);
  return (
    <svg className="ra-svg" viewBox="0 0 400 440" focusable="false">
      {item.rarity === 'Legendary' && <path d={BADGE_SHARDS.lit} fill="url(#ra-sh)" />}
      <path d={body} className="ra-drop" transform="translate(10 14)" />
      <path d={body} fill="url(#ra-o)" />
      <path d={shield ? SHIELD_INNER : HEX_INNER} fill="url(#ra-f)" />
      <path fillRule="evenodd" fill="url(#ra-ht)" d={RING} />
      <circle cx="200" cy={RING_CY} r="99" fill="url(#ra-m)" />
      <EmblemPaint name={item.emblem ?? 'trophy'} x={137} y={RING_CY - 64} s={1.26} lean />
      <path d="M54 344H6l16 26-16 26h48zM346 344h48l-16 26 16 26h-48z" fill={tone.tail} />
      <path d={RIBBON_BAND} fill={tone.band} />
    </svg>
  );
}

/* ── title nameplate ────────────────────────────────────────────────────────────────────── */

function TitleArt({ item, variant, face }: { item: RewardItem; variant: RewardArtVariant; face?: string }) {
  const L = plateFor(variant);
  const thumb = L.key === 'thumb';
  const legendary = item.rarity === 'Legendary';
  const plate = plateShape(L);
  const { x: hx, y: hy, ring, face: fs } = L.hex;
  const outer = hexOuter(L);
  const inner = hexInner(L);
  const name = L.text.max ? fit(item.name, L.text.max, L.text.size, L.text.min, L.text.lines) : null;
  const [p0, p1] = L.plate;
  const top = `M${r1(p0![0] + 10)} ${p0![1] + 1.5}H${r1(p1![0] - 10)}`;
  const firstY = name && name.lines.length > 1 ? L.text.y - L.text.gap * (name.lines.length - 1) * 0.5 : L.text.y;
  const drop = thumb ? 'translate(2 3)' : 'translate(6 9)';
  return (
    <svg className="ra-svg" viewBox={`0 0 ${L.vw} ${L.vh}`} focusable="false">
      {legendary && L.shards && <Shards {...L.shards} />}

      {/* the black leaning plate: a drop, a lit top edge, hatch, halftone, two heat slashes */}
      <path d={plate} className="ra-drop" transform={drop} />
      <path d={plate} fill="url(#ra-p)" />
      <g clipPath={`url(#ra-cp-${L.key})`}>
        {!thumb && (
          <>
            <rect width={L.vw} height={L.vh} fill="url(#ra-hx)" opacity=".05" />
            <rect width={L.vw} height={L.vh} fill="url(#ra-dt)" opacity=".13" mask="url(#ra-mk-x)" />
            <path
              d={rounded(leanRect(L.vw * 0.8, L.vw * 0.8 + L.vh * 0.1, -10, L.vh + 10), 2) + rounded(leanRect(L.vw * 0.8 + L.vh * 0.16, L.vw * 0.8 + L.vh * 0.19, -10, L.vh + 10), 1)}
              fill="url(#ra-ht)"
              opacity=".8"
            />
            <path d={top} stroke="#fff" strokeOpacity=".45" strokeWidth="2" />
            <path d={plate} fill="none" stroke="url(#ra-rd)" strokeWidth="8" />
          </>
        )}
        <path d={rounded(L.bar, 1)} fill={rarityInk(item.rarity)} />
      </g>

      {name && L.tag && (
        <g className="ra-plate-tag">
          <path d={rounded(leanRect(L.tag.x, L.tag.x + 6, L.tag.y - 11, L.tag.y + 1), 1)} fill="url(#ra-ht)" />
          <text x={L.tag.x + 13} y={L.tag.y} className="ra-tag" fill="#c2c6cc">
            Title
          </text>
        </g>
      )}
      {name &&
        name.lines.map((line, i) => (
          <g key={i} className="ra-type" fontSize={name.size}>
            <text x={L.text.x + 1.5} y={firstY + i * L.text.gap + 3} fill="#000" fillOpacity=".7">
              {line}
            </text>
            <text x={L.text.x} y={firstY + i * L.text.gap} fill="#fff">
              {line}
            </text>
          </g>
        ))}

      {/* the learner's face in a bevelled heat hexagon */}
      <path d={outer} className="ra-drop" transform={thumb ? 'translate(2 3)' : 'translate(5 8)'} />
      <path d={outer} fill="url(#ra-ht)" />
      {!thumb && (
        <g clipPath={`url(#ra-co-${L.key})`}>
          <path d={outer} fill="none" stroke="url(#ra-rl)" strokeWidth={ring * 0.7} />
          <path d={outer} fill="none" stroke="url(#ra-rd)" strokeWidth={ring} />
        </g>
      )}
      <path d={inner} fill="url(#ra-bk)" />
      {face ? (
        <image href={face} x={hx - fs / 2} y={hy - fs * 0.56} width={fs} height={fs} preserveAspectRatio="xMidYMid slice" clipPath={`url(#ra-ci-${L.key})`} />
      ) : (
        <path
          d={`M${hx} ${hy - fs * 0.32}a${fs * 0.17} ${fs * 0.17} 0 1 1 0 ${fs * 0.34}a${fs * 0.17} ${fs * 0.17} 0 1 1 0-${fs * 0.34}ZM${hx - fs * 0.3} ${hy + fs * 0.42}c0-${fs * 0.2} ${fs * 0.6}-${fs * 0.2} ${fs * 0.6} 0z`}
          fill="#6d727b"
          clipPath={`url(#ra-ci-${L.key})`}
        />
      )}
      {!thumb && (
        <>
          <g clipPath={`url(#ra-ci-${L.key})`}>
            <path d={inner} fill="none" stroke="#000" strokeOpacity=".7" strokeWidth={ring * 0.8} />
          </g>
          <path d={inner} fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="1.2" transform="translate(.8 1.2)" />
        </>
      )}
      {legendary && !thumb && <Sparkles at={L.key === 'block' ? [[60, 52, 12], [326, 72, 9]] : [[44, 18, 12], [622, 30, 9], [520, 140, 7]]} />}
    </svg>
  );
}

/* ── cup banner ─────────────────────────────────────────────────────────────────────────── */

/** leaves along a quadratic stem: ellipses turned along the stem */
function laurel(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number) {
  const leaves: { x: number; y: number; a: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const t = 0.1 + i * 0.16;
    const x = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * cx + t * t * x1;
    const y = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * cy + t * t * y1;
    const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    leaves.push({ x: r1(x), y: r1(y), a: r1((Math.atan2(dy, dx) * 180) / Math.PI + (i % 2 ? 38 : -38)) });
  }
  return { stem: `M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}`, leaves };
}

const LAUREL = laurel(118, 236, 66, 182, 104, 104);

function BannerArt({ item }: { item: RewardItem }) {
  const name = fit(item.name, 214, 40, 26, 2);
  const nameY = name.lines.length > 1 ? 286 : 304;
  return (
    <svg className="ra-svg" viewBox="0 0 300 470" focusable="false">
      {/* the hanging cord and hook */}
      <path d="M150 7 26 25M150 7 274 25" fill="none" stroke="#9a9fa8" strokeWidth="2" />
      <circle cx="150" cy="7" r="4.6" fill="none" stroke="url(#ra-sh)" strokeWidth="2.6" />

      {/* the pennant: heat cloth with folds, hatch, a hem under the rod, silver piping, halftone */}
      <path d={CLOTH} className="ra-drop" transform="translate(8 10)" />
      <path d={CLOTH} fill="url(#ra-ht)" />
      <g clipPath="url(#ra-cc-cloth)">
        <rect width="300" height="470" fill="url(#ra-fo)" />
        <rect width="300" height="470" fill="url(#ra-hx)" opacity=".07" />
        <rect width="300" height="470" fill="url(#ra-dk)" opacity=".2" mask="url(#ra-mk-y)" />
        <rect x="0" y="26" width="300" height="28" fill="#000" opacity=".22" />
        <rect x="0" y="30" width="300" height="26" fill="url(#ra-un)" />
        <path d="M30 52H270" stroke="#fff" strokeOpacity=".4" strokeWidth="1.4" strokeDasharray="6 4" />
        <path d={TRIM} fill="none" stroke="#000" strokeOpacity=".3" strokeWidth="5" transform="translate(1.5 2)" />
        <path d={TRIM} fill="none" stroke="url(#ra-sh)" strokeWidth="2.6" />
        <path d="M30 26V452" stroke="#000" strokeOpacity=".28" strokeWidth="10" />
        <path d="M270 26V452" stroke="#fff" strokeOpacity=".16" strokeWidth="6" />
      </g>

      {/* three stars, the laurel and the silver trophy */}
      <path d={star(124, 96, 6) + star(150, 86, 8) + star(176, 96, 6)} fill="url(#ra-sh)" />
      {[1, -1].map((s) => (
        <g key={s} transform={s < 0 ? 'translate(300 0) scale(-1 1)' : undefined}>
          <path d={LAUREL.stem} fill="none" stroke="#000" strokeOpacity=".4" strokeWidth="3.5" transform="translate(1.5 2.5)" />
          <path d={LAUREL.stem} fill="none" stroke="url(#ra-sh)" strokeWidth="3" strokeLinecap="round" />
          {LAUREL.leaves.map((l, i) => (
            <ellipse key={i} cx={l.x} cy={l.y} rx="11" ry="4.6" transform={`rotate(${l.a} ${l.x} ${l.y})`} fill="url(#ra-sh)" stroke="#000" strokeOpacity=".3" strokeWidth=".8" />
          ))}
        </g>
      ))}
      <EmblemPaint name={item.emblem ?? 'trophy'} x={92} y={112} s={1.16} />

      {/* the cup's name, and the stage that pays it */}
      {name.lines.map((line, i) => (
        <g key={i} className="ra-type" fontSize={name.size} textAnchor="middle">
          <text x="151.5" y={nameY + i * 38 + 3} fill="#000" fillOpacity=".5">
            {line}
          </text>
          <text x="150" y={nameY + i * 38} fill="#fff">
            {line}
          </text>
        </g>
      ))}
      <path d={rounded(leanRect(96, 102, 349, 361), 1) + rounded(leanRect(198, 204, 349, 361), 1)} fill="#fff" opacity=".85" />
      <text x="150" y="360" className="ra-tag" fill="#fff" fillOpacity=".9" textAnchor="middle">
        {`Stage ${String(item.stage).padStart(2, '0')}`}
      </text>

      {/* the rod with its two silver caps, and a tassel at each end */}
      <path d="M40 30V64M260 30V64" stroke="#c2c6cc" strokeWidth="2" />
      <path d="M34 66h12l4 26c-6 4-14 4-20 0zM254 66h12l4 26c-6 4-14 4-20 0z" className="ra-f-deep" />
      <path d="M34 66h12l1 5h-14zM254 66h12l1 5h-14z" fill="#c9cdd3" />
      <rect x="14" y="17" width="272" height="14" rx="7" fill="url(#ra-ro)" />
      <path d="M22 20.5H278" stroke="#fff" strokeOpacity=".8" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M1.5 24-6 24M298.5 24 306 24" stroke="#c9cdd3" strokeWidth="4" strokeLinecap="round" />
      <circle cx="12" cy="24" r="11" fill="url(#ra-cap)" />
      <circle cx="288" cy="24" r="11" fill="url(#ra-cap)" />
      <path d="M8.5 20m-2.6 0a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0M284.5 20m-2.6 0a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0-5.2 0" fill="#fff" />
    </svg>
  );
}

/** the banner at thumbnail size */
function BannerThumb({ item }: { item: RewardItem }) {
  return (
    <svg className="ra-svg" viewBox="0 0 300 470" focusable="false">
      <path d={CLOTH} className="ra-drop" transform="translate(10 12)" />
      <path d={CLOTH} fill="url(#ra-ht)" />
      <path d={TRIM} fill="none" stroke="url(#ra-sh)" strokeWidth="6" />
      <EmblemPaint name={item.emblem ?? 'trophy'} x={70} y={120} s={1.6} lean />
      <rect x="14" y="15" width="272" height="18" rx="9" fill="url(#ra-ro)" />
    </svg>
  );
}

/* ── gallery card ───────────────────────────────────────────────────────────────────────── */

/** the rarity gem: Rare silver, Epic heat on black, Legendary the silver sheen on black */
function Gem({ rarity }: { rarity: Rarity }) {
  return (
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M12 .8 21.7 6.4v11.2L12 23.2 2.3 17.6V6.4z" fill="#0b0b0c" />
      <path d="M12 2.6 20 7.2" stroke="#fff" strokeOpacity=".28" strokeWidth=".9" />
      <path d="M12 4.6 18.4 9.4 12 19.6 5.6 9.4z" className={`ra-gem is-${rarity.toLowerCase()}`} fill={rarity === 'Legendary' ? 'url(#ra-sh)' : undefined} />
      <path d="M12 4.6 14.6 9.4 12 19.6 9.4 9.4z" fill="#000" opacity=".2" />
      <path d="M5.6 9.4h12.8L12 4.6z" fill="#fff" opacity=".4" />
      <path d="M8.2 8.2 12 5.6" stroke="#fff" strokeWidth=".9" strokeLinecap="round" />
    </svg>
  );
}

function CardArt({ item, variant }: { item: RewardItem; variant: RewardArtVariant }) {
  const key = item.art ?? 'strategist';
  if (variant === 'thumb')
    return (
      <span className="ra-mini">
        <span className="ra-mini-face">
          <i className="ra-card-bg" />
          <i className="ra-card-rays" />
          <img className="ra-mini-paint" src={castArt(key, 'face')} alt="" decoding="async" draggable={false} />
          <i className="ra-mini-gloss" />
        </span>
      </span>
    );
  // INSPECT always shows the figure; the paintings stay at or below 1× of their source
  const crop = variant === 'inspect' ? 'figure' : (item.crop ?? 'figure');
  const src = castArt(key);
  return (
    <span className={`ra-paper is-${crop}`}>
      <span className="ra-face">
        <i className="ra-card-bg" />
        <i className="ra-card-rays" />
        <i className="ra-card-dots" />
        <i className="ra-card-floor" />
        <i className="ra-card-streak is-a" />
        <i className="ra-card-streak is-b" />
        <i className="ra-card-streak is-c" />
        <i className="ra-paint-cast" style={{ WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }} />
        {/* decoded with the frame: a new card is never shown for a frame without its painting (the
            three paintings are preloaded and decoded when the rewards screen mounts) */}
        <img className="ra-paint" src={src} alt="" decoding="sync" draggable={false} />
        <span className="ra-plate">
          <i className="ra-plate-brush" />
          <b className="ra-name">{item.name}</b>
        </span>
        {item.serial && variant !== 'block' && <span className="ra-serial">No. {item.serial}</span>}
        <i className="ra-gem-chip">
          <Gem rarity={item.rarity} />
        </i>
        {/* the foil shine and the arrival's over-exposure: overlays above the paint, never on it */}
        <i className="ra-shine">
          <i className="ra-shine-run is-lit">
            <i className="ra-shine-band" />
            <i className="ra-shine-wash" />
          </i>
          <i className="ra-shine-run is-dark">
            <i className="ra-shine-dark" />
          </i>
        </i>
        <i className="ra-flash" />
      </span>
    </span>
  );
}
