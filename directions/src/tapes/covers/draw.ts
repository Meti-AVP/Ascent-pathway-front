// VHS cover artwork, drawn on canvas. One renderer feeds the DOM covers and the three.js shelf,
// so a tape looks the same everywhere. Characters are drawn untouched (painterly renders), only lit.
import type { Cast, CoverArt, StageStatus, StageType } from '../data';
import { rng } from '../fx/Brush';

export type CoverSpec = {
  key: string;
  n: number;
  total: number;
  type: StageType;
  title: string;
  art: CoverArt;
  status: StageStatus;
  result?: string;
  pathway: string;
};

export const COVER_W = 600;
export const COVER_H = 960;

const ORANGE = '#e8621a';
const ORANGE_HI = '#ff8a3d';
const YELLOW = '#ffc933';
const GREEN = '#4fe08a';
const RED = '#ff3d2e';
const INK = '#0b0b0c';

type G = CanvasRenderingContext2D;

// ——— assets ———
const castCache = new Map<Cast, Promise<HTMLImageElement>>();
export function loadCast(c: Cast) {
  let p = castCache.get(c);
  if (!p) {
    p = new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = `/shared/cast/${c}-after.webp`;
    });
    castCache.set(c, p);
  }
  return p;
}

const imgCache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string) {
  let p = imgCache.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((res, rej) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });
    imgCache.set(src, p);
  }
  return p;
}

let fonts: Promise<unknown> | null = null;
export function ensureFonts() {
  fonts ??= Promise.all([
    document.fonts.load('80px "Permanent Marker"'),
    document.fonts.load('bold 20px "Space Mono"'),
    document.fonts.load('20px "Space Mono"'),
    document.fonts.load('30px "VT323"'),
    document.fonts.load('900 80px "Hanken Grotesk Variable"'),
    document.fonts.load('italic 900 80px "Hanken Grotesk Variable"'),
    document.fonts.load('italic 500 20px "Hanken Grotesk Variable"'),
  ]);
  return fonts;
}

let noise: HTMLCanvasElement | null = null;
function noiseTile() {
  if (noise) return noise;
  noise = document.createElement('canvas');
  noise.width = noise.height = 256;
  const g = noise.getContext('2d')!;
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return noise;
}

// ——— helpers ———
function texture(g: G, mode: GlobalCompositeOperation, alpha: number) {
  const p = g.createPattern(noiseTile(), 'repeat');
  if (!p) return;
  g.save();
  g.globalCompositeOperation = mode;
  g.globalAlpha = alpha;
  g.fillStyle = p;
  g.fillRect(0, 0, COVER_W, COVER_H);
  g.restore();
}

function font(size: number, family: 'marker' | 'mono' | 'monob' | 'vt' | 'black' | 'blacki' | 'body' | 'bodyi') {
  switch (family) {
    case 'marker':
      return `${size}px "Permanent Marker"`;
    case 'mono':
      return `${size}px "Space Mono"`;
    case 'monob':
      return `bold ${size}px "Space Mono"`;
    case 'vt':
      return `${size}px "VT323"`;
    case 'black':
      return `900 ${size}px "Hanken Grotesk Variable"`;
    case 'blacki':
      return `italic 900 ${size}px "Hanken Grotesk Variable"`;
    case 'body':
      return `600 ${size}px "Hanken Grotesk Variable"`;
    case 'bodyi':
      return `italic 500 ${size}px "Hanken Grotesk Variable"`;
  }
}

function fit(g: G, text: string, f: (s: number) => string, maxW: number, maxS: number) {
  g.font = f(maxS);
  const w = g.measureText(text).width;
  return w > maxW ? Math.floor((maxS * maxW) / w) : maxS;
}

function spaced(g: G, text: string, x: number, y: number, spacing: number, align: 'left' | 'right' | 'center' = 'left') {
  g.letterSpacing = `${spacing}px`;
  g.textAlign = align;
  g.fillText(text, x, y);
  g.letterSpacing = '0px';
  g.textAlign = 'left';
}

function wrap(g: G, text: string, maxW: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (g.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Permanent Marker with rough edges and dry-brush streaks bitten out, optionally glowing. */
function brush(
  g: G,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  o: { glow?: string; blur?: number; align?: 'left' | 'center'; seed?: number; rot?: number; dry?: number } = {},
) {
  const rnd = rng(o.seed ?? text.length * 7 + size);
  g.font = font(size, 'marker');
  const tw = g.measureText(text).width;
  const pad = Math.ceil(size * 0.5);
  const oc = document.createElement('canvas');
  oc.width = Math.ceil(tw + pad * 2);
  oc.height = Math.ceil(size * 1.7);
  const c = oc.getContext('2d')!;
  c.font = font(size, 'marker');
  c.fillStyle = color;
  const by = size * 1.2;
  c.fillText(text, pad, by);
  c.globalAlpha = 0.6;
  c.fillText(text, pad + (rnd() - 0.5) * size * 0.035, by + (rnd() - 0.5) * size * 0.03);
  c.globalAlpha = 1;
  // dry-brush: streaks run along the stroke direction, thicker toward the end of the word
  c.globalCompositeOperation = 'destination-out';
  const n = Math.floor(tw * (o.dry ?? 0.5));
  for (let i = 0; i < n; i++) {
    const sx = pad + Math.pow(rnd(), 0.55) * tw;
    const sy = by - size * 0.95 + rnd() * size * 1.15;
    c.globalAlpha = 0.25 + rnd() * 0.7;
    c.fillRect(sx, sy, size * (0.15 + rnd() * 0.9), Math.max(0.6, (0.5 + rnd() * 1.4) * (size / 90)));
  }
  for (let i = 0; i < n * 0.6; i++) {
    c.globalAlpha = 0.5 + rnd() * 0.5;
    c.beginPath();
    c.arc(pad + rnd() * tw, by - size * 0.9 + rnd() * size, 0.5 + rnd() * 1.6 * (size / 90), 0, Math.PI * 2);
    c.fill();
  }
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  const dx = o.align === 'center' ? x - oc.width / 2 : x - pad;
  g.save();
  if (o.rot) {
    g.translate(x, y);
    g.rotate(o.rot);
    g.translate(-x, -y);
  }
  if (o.glow) {
    g.shadowColor = o.glow;
    g.shadowBlur = o.blur ?? size * 0.45;
    g.drawImage(oc, dx, y - by);
    g.shadowBlur = (o.blur ?? size * 0.45) * 0.25;
  }
  g.drawImage(oc, dx, y - by);
  g.restore();
  return tw;
}

/** Camcorder-style label with a warm chroma split. */
function osd(g: G, text: string, x: number, y: number, size: number, color: string, align: 'left' | 'right' = 'left') {
  g.font = font(size, 'monob');
  g.textAlign = align;
  g.letterSpacing = '1px';
  g.globalAlpha = 0.55;
  g.fillStyle = '#ff3b1f';
  g.fillText(text, x + 2, y);
  g.globalAlpha = 0.35;
  g.fillStyle = '#ffd27a';
  g.fillText(text, x - 2, y);
  g.globalAlpha = 1;
  g.fillStyle = color;
  g.fillText(text, x, y);
  g.letterSpacing = '0px';
  g.textAlign = 'left';
}

function pill(g: G, text: string, x: number, y: number, bg: string, fg: string, size = 14) {
  g.font = font(size, 'monob');
  g.letterSpacing = '2px';
  const w = g.measureText(text).width + 22;
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(x, y, w, size + 14, (size + 14) / 2);
  g.fill();
  g.fillStyle = fg;
  g.fillText(text, x + 11, y + size + 3);
  g.letterSpacing = '0px';
  return w;
}

function sticker(g: G, x: number, y: number, r: number, rot: number, bg: string, fg: string, top: string, main: string) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.shadowColor = 'rgba(0,0,0,.45)';
  g.shadowBlur = 14;
  g.shadowOffsetY = 5;
  g.fillStyle = bg;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  g.shadowColor = 'transparent';
  // printed inner ring and gloss
  g.strokeStyle = 'rgba(0,0,0,.18)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, r - 7, 0, Math.PI * 2);
  g.stroke();
  const gl = g.createLinearGradient(-r, -r, r, r);
  gl.addColorStop(0, 'rgba(255,255,255,.45)');
  gl.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.fillStyle = gl;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.font = font(Math.round(r * 0.25), 'monob');
  g.letterSpacing = '2px';
  g.fillText(top, 0, -r * 0.18);
  g.letterSpacing = '0px';
  g.font = font(Math.round(r * 0.62), 'vt');
  g.fillText(main, 0, r * 0.42);
  g.textAlign = 'left';
  g.restore();
}

async function drawCast(g: G, c: Cast, cx: number, bottom: number, h: number, glow?: string, clip?: [number, number, number, number]) {
  drawFigure(g, await loadCast(c), cx, bottom, h, glow, clip);
}

function drawFigure(g: G, img: HTMLImageElement, cx: number, bottom: number, h: number, glow?: string, clip?: [number, number, number, number]) {
  const w = (img.width / img.height) * h;
  g.save();
  if (clip) {
    g.beginPath();
    g.roundRect(clip[0], clip[1], clip[2], clip[3], 16);
    g.clip();
  }
  g.imageSmoothingQuality = 'high';
  if (glow) {
    g.shadowColor = glow;
    g.shadowBlur = 46;
    g.drawImage(img, cx - w / 2, bottom - h, w, h);
    g.shadowBlur = 0;
    g.shadowColor = 'transparent';
  }
  g.drawImage(img, cx - w / 2, bottom - h, w, h);
  g.restore();
}

/** Realistic cover photography: drawn whole, its cut bottom edge blended into the cover with a gradient mask. */
async function drawPhoto(g: G, src: string, x: number, y: number, w: number, h: number, fadeFrom: number, glow?: string) {
  const img = await loadImage(src);
  const off = document.createElement('canvas');
  off.width = Math.round(w);
  off.height = Math.round(h);
  const o = off.getContext('2d')!;
  o.imageSmoothingQuality = 'high';
  o.drawImage(img, 0, 0, off.width, off.height);
  o.globalCompositeOperation = 'destination-in';
  const m = o.createLinearGradient(0, 0, 0, off.height);
  m.addColorStop(0, '#000');
  m.addColorStop(fadeFrom, '#000');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  o.fillStyle = m;
  o.fillRect(0, 0, off.width, off.height);
  g.save();
  if (glow) {
    g.shadowColor = glow;
    g.shadowBlur = 42;
    g.drawImage(off, x, y);
    g.shadowBlur = 0;
    g.shadowColor = 'transparent';
  }
  g.drawImage(off, x, y);
  g.restore();
}

// ——— common furniture ———
function header(g: G, ink: string) {
  osd(g, 'PLAY ▶', 28, 52, 24, ink);
  osd(g, 'SP', COVER_W - 28, 52, 24, ink, 'right');
}

function footer(g: G, s: CoverSpec, ink: string, dim: string, opts: { title?: boolean; titleColor?: string; glow?: string } = {}) {
  const W = COVER_W;
  const H = COVER_H;
  let y = H - 196;
  if (opts.title !== false) {
    const size = Math.min(84, fit(g, s.title, (z) => font(z, 'marker'), W - 70, 84));
    brush(g, s.title, 32, y, size, opts.titleColor ?? '#fff6ec', { glow: opts.glow, blur: 26, seed: s.n * 13 });
  }
  y += 40;
  g.fillStyle = ink;
  g.font = font(15, 'monob');
  spaced(g, `${String(s.n).padStart(2, '0')}/${String(s.total).padStart(2, '0')}  ·  ${s.art.product.toUpperCase()}`, 34, y, 2.5);
  y += 32;
  g.font = font(21, 'bodyi');
  g.fillStyle = ink;
  g.fillText(s.art.tagline, 34, y);
  // billing block
  y += 28;
  g.fillStyle = dim;
  g.font = font(10.5, 'body');
  g.letterSpacing = '1.2px';
  const lines = wrap(g, s.art.credits.toUpperCase(), W - 68);
  lines.slice(0, 3).forEach((l, i) => g.fillText(l, 34, y + i * 14));
  g.letterSpacing = '0px';
  // bottom bar: wordmark + format mark
  const by = H - 26;
  g.fillStyle = ink;
  g.font = font(17, 'black');
  spaced(g, 'ASCENT', 34, by, 5);
  g.font = font(11, 'monob');
  g.fillStyle = dim;
  spaced(g, s.pathway.toUpperCase(), 136, by - 1, 2);
  g.strokeStyle = ink;
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(W - 128, by - 19, 94, 26, 8);
  g.stroke();
  g.fillStyle = ink;
  g.font = font(12, 'monob');
  spaced(g, 'SP · HI-FI', W - 81, by - 1, 1.5, 'center');
}

function statusSticker(g: G, s: CoverSpec) {
  if (s.status === 'done') sticker(g, COVER_W - 92, 128, 60, 0.16, GREEN, INK, 'PLAYED', `✓ ${s.result ?? ''}`.trim());
  if (s.status === 'current') sticker(g, COVER_W - 92, 128, 60, -0.12, YELLOW, INK, 'IN DECK', 'PLAY ▶');
}

function wear(g: G, seed: number) {
  const rnd = rng(seed);
  g.save();
  // scuffs
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.12)';
    g.lineWidth = 0.6 + rnd();
    const x = rnd() * COVER_W;
    const y = rnd() * COVER_H;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rnd() - 0.5) * 120, y + (rnd() - 0.5) * 40);
    g.stroke();
  }
  // edge wear and sleeve gloss
  const v = g.createRadialGradient(COVER_W / 2, COVER_H / 2, COVER_H * 0.35, COVER_W / 2, COVER_H / 2, COVER_H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,.38)');
  g.fillStyle = v;
  g.fillRect(0, 0, COVER_W, COVER_H);
  const sh = g.createLinearGradient(0, 0, COVER_W, COVER_H * 0.6);
  sh.addColorStop(0.25, 'rgba(255,255,255,0)');
  sh.addColorStop(0.4, 'rgba(255,255,255,.06)');
  sh.addColorStop(0.47, 'rgba(255,255,255,0)');
  g.fillStyle = sh;
  g.fillRect(0, 0, COVER_W, COVER_H);
  g.restore();
}

// ——— per stage type ———

async function learn(g: G, s: CoverSpec) {
  const W = COVER_W;
  const bg = g.createLinearGradient(0, 0, 0, COVER_H);
  bg.addColorStop(0, '#f2ede5');
  bg.addColorStop(1, '#e0d9cd');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, COVER_H);
  texture(g, 'multiply', 0.1);
  // photo panel
  const px = 262;
  const py = 120;
  const pw = 308;
  const ph = 540;
  const pg = g.createLinearGradient(0, py, 0, py + ph);
  pg.addColorStop(0, '#160c07');
  pg.addColorStop(0.55, '#5a230b');
  pg.addColorStop(1, ORANGE);
  g.fillStyle = pg;
  g.beginPath();
  g.roundRect(px, py, pw, ph, 16);
  g.fill();
  g.save();
  g.beginPath();
  g.roundRect(px, py, pw, ph, 16);
  g.clip();
  const sun = g.createRadialGradient(px + pw / 2, py + ph * 0.62, 10, px + pw / 2, py + ph * 0.62, 190);
  sun.addColorStop(0, 'rgba(255,190,120,.95)');
  sun.addColorStop(0.5, 'rgba(255,120,40,.35)');
  sun.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = sun;
  g.fillRect(px, py, pw, ph);
  g.fillStyle = 'rgba(0,0,0,.16)';
  for (let y = py; y < py + ph; y += 4) g.fillRect(px, y, pw, 1.5);
  g.restore();
  if (s.art.photo?.mode === 'panel') {
    // a waist-up portrait: the head breaks out of the panel top, the cut edge sits on the panel's bottom
    drawFigure(g, await loadImage(s.art.photo.src), px + pw / 2 - 4, py + ph, 640, undefined, [px, 24, pw, ph + py - 24]);
  } else if (s.art.cast) {
    await drawCast(g, s.art.cast, px + pw / 2 + 6, py + ph, 610, undefined, [px, 24, pw, ph + py - 24]);
  } else {
    capsule(g, px + pw / 2, py + ph * 0.5);
  }
  // stacked title words
  const lines = s.art.lines ?? s.title.split(' ');
  let y = 168;
  lines.forEach((ln, i) => {
    const last = i === lines.length - 1;
    const size = Math.min(last ? 98 : 84, fit(g, ln.toUpperCase(), (z) => font(z, 'marker'), 214, last ? 98 : 84));
    y += i === 0 ? 0 : size * 0.98;
    brush(g, ln.toUpperCase(), 30, y, size, last ? '#d4501a' : '#121212', { seed: s.n * 31 + i, dry: 0.35 });
  });
  g.fillStyle = '#121212';
  pill(g, s.type.toUpperCase(), 30, 76, '#121212', '#f2ede5', 13);
  footer(g, s, '#141414', 'rgba(20,20,20,.55)', { title: false });
}

function capsule(g: G, cx: number, cy: number) {
  g.save();
  g.translate(cx, cy);
  g.rotate(-0.62);
  const L = 300;
  const R = 62;
  g.shadowColor = 'rgba(0,0,0,.55)';
  g.shadowBlur = 40;
  g.shadowOffsetY = 18;
  const a = g.createLinearGradient(0, -R, 0, R);
  a.addColorStop(0, '#ffffff');
  a.addColorStop(0.55, '#e6e1d8');
  a.addColorStop(1, '#b9b3a9');
  g.fillStyle = a;
  g.beginPath();
  g.roundRect(-L / 2, -R, L / 2 + 2, R * 2, [R, 0, 0, R]);
  g.fill();
  const b = g.createLinearGradient(0, -R, 0, R);
  b.addColorStop(0, ORANGE_HI);
  b.addColorStop(0.55, ORANGE);
  b.addColorStop(1, '#8a3108');
  g.fillStyle = b;
  g.beginPath();
  g.roundRect(0, -R, L / 2, R * 2, [0, R, R, 0]);
  g.fill();
  g.shadowColor = 'transparent';
  g.fillStyle = 'rgba(255,255,255,.55)';
  g.beginPath();
  g.roundRect(-L / 2 + 26, -R + 14, L - 52, 14, 7);
  g.fill();
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fillRect(-1, -R, 3, R * 2);
  g.restore();
}

function assess(g: G, s: CoverSpec) {
  const W = COVER_W;
  const H = COVER_H;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#141416');
  bg.addColorStop(1, '#070708');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.045)';
  g.lineWidth = 1;
  for (let x = 0; x < W; x += 24) {
    g.beginPath();
    g.moveTo(x + 0.5, 0);
    g.lineTo(x + 0.5, H);
    g.stroke();
  }
  for (let y = 0; y < H; y += 24) {
    g.beginPath();
    g.moveTo(0, y + 0.5);
    g.lineTo(W, y + 0.5);
    g.stroke();
  }
  texture(g, 'overlay', 0.08);
  const glow = g.createRadialGradient(380, 330, 10, 380, 330, 330);
  glow.addColorStop(0, 'rgba(232,98,26,.32)');
  glow.addColorStop(1, 'rgba(232,98,26,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  // answer sheet column
  const rnd = rng(s.n * 17);
  for (let r = 0; r < 12; r++) {
    const y = 150 + r * 36;
    g.fillStyle = 'rgba(196,193,187,.5)';
    g.font = font(12, 'mono');
    g.fillText(String(r + 1).padStart(2, '0'), 32, y + 5);
    const pick = Math.floor(rnd() * 4);
    for (let c = 0; c < 4; c++) {
      const cx = 74 + c * 22;
      g.beginPath();
      g.arc(cx, y, 7.5, 0, Math.PI * 2);
      if (c === pick) {
        g.fillStyle = r === 7 ? 'rgba(196,193,187,.35)' : ORANGE;
        g.fill();
      } else {
        g.strokeStyle = 'rgba(196,193,187,.32)';
        g.lineWidth = 1.5;
        g.stroke();
      }
    }
  }
  // the pass mark
  g.fillStyle = 'rgba(196,193,187,.8)';
  g.font = font(15, 'monob');
  spaced(g, 'PASS MARK', 200, 196, 5);
  const big = s.art.big ?? '80';
  g.save();
  g.shadowColor = 'rgba(255,110,30,.55)';
  g.shadowBlur = 40;
  g.fillStyle = '#fff6ec';
  g.font = font(250, 'black');
  g.fillText(big, 188, 410);
  const bw = g.measureText(big).width;
  g.font = font(110, 'black');
  g.fillText('%', 188 + bw + 6, 410);
  g.restore();
  // hand-drawn ring around it
  g.save();
  g.strokeStyle = ORANGE_HI;
  g.lineCap = 'round';
  g.shadowColor = 'rgba(255,110,30,.6)';
  g.shadowBlur = 16;
  for (let k = 0; k < 3; k++) {
    g.lineWidth = 7 - k * 2;
    g.globalAlpha = 0.9 - k * 0.25;
    g.beginPath();
    for (let a = -0.3; a <= Math.PI * 2 + 0.25; a += 0.05) {
      const rx = 205 + Math.sin(a * 3 + k) * 5 + k * 4;
      const ry = 118 + Math.cos(a * 2 + k) * 4;
      const x = 372 + Math.cos(a) * rx;
      const y = 330 + Math.sin(a) * ry + a * 3;
      if (a === -0.3) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.restore();
  // red-pencil ticks down the margin
  g.strokeStyle = ORANGE_HI;
  g.lineWidth = 3;
  g.lineCap = 'round';
  [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11].forEach((r) => {
    const y = 150 + r * 36;
    g.beginPath();
    g.moveTo(170, y);
    g.lineTo(176, y + 6);
    g.lineTo(188, y - 8);
    g.stroke();
  });
  pill(g, s.type.toUpperCase(), 30, 76, '#f2ede5', INK, 13);
  footer(g, s, '#f2ede5', 'rgba(242,237,229,.42)', { glow: 'rgba(255,106,26,.85)' });
}

async function compete(g: G, s: CoverSpec) {
  const W = COVER_W;
  const H = COVER_H;
  g.fillStyle = '#050505';
  g.fillRect(0, 0, W, H);
  const cx = 300;
  const cy = 400;
  const burst = g.createRadialGradient(cx, cy, 0, cx, cy, 560);
  burst.addColorStop(0, '#ffb070');
  burst.addColorStop(0.18, ORANGE);
  burst.addColorStop(0.5, '#3a1405');
  burst.addColorStop(1, '#050505');
  g.fillStyle = burst;
  g.fillRect(0, 0, W, H);
  // speed rays
  const rnd = rng(s.n * 5);
  for (let i = 0; i < 40; i++) {
    const a0 = (i / 40) * Math.PI * 2 + rnd() * 0.05;
    const a1 = a0 + 0.02 + rnd() * 0.05;
    g.fillStyle = i % 2 ? 'rgba(255,201,51,.14)' : 'rgba(0,0,0,.28)';
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a0) * 900, cy + Math.sin(a0) * 900);
    g.lineTo(cx + Math.cos(a1) * 900, cy + Math.sin(a1) * 900);
    g.closePath();
    g.fill();
  }
  texture(g, 'overlay', 0.12);
  const photo = s.art.photo?.mode === 'poster' ? s.art.photo : null;
  const fadeDown = () => {
    const fade = g.createLinearGradient(0, H - 380, 0, H);
    fade.addColorStop(0, 'rgba(5,5,5,0)');
    fade.addColorStop(0.55, 'rgba(5,5,5,.88)');
    fade.addColorStop(1, 'rgba(5,5,5,.97)');
    g.fillStyle = fade;
    g.fillRect(0, H - 380, W, 380);
  };
  if (photo) {
    await drawPhoto(g, photo.src, -10, -20, 620, 775, 0.66, 'rgba(255,110,30,.8)');
    texture(g, 'overlay', 0.06);
    fadeDown();
  }
  // arena name, comic-poster style
  const words = (s.art.big ?? s.title).toUpperCase().split(' ');
  let y = photo ? 572 : 200;
  const maxSize = photo ? 118 : 150;
  words.forEach((w, i) => {
    const size = Math.min(maxSize, fit(g, w, (z) => font(z, 'blacki'), 520, maxSize));
    if (i > 0) y += size * 0.86;
    g.font = font(size, 'blacki');
    g.textAlign = 'center';
    g.lineJoin = 'round';
    g.fillStyle = '#5a1e04';
    g.fillText(w, W / 2 + 7, y + 7);
    g.strokeStyle = INK;
    g.lineWidth = 9;
    g.strokeText(w, W / 2, y);
    const fill = g.createLinearGradient(0, y - size, 0, y);
    fill.addColorStop(0, '#fff3c2');
    fill.addColorStop(0.5, YELLOW);
    fill.addColorStop(1, '#ff9a1a');
    g.fillStyle = fill;
    g.fillText(w, W / 2, y);
    g.textAlign = 'left';
  });
  if (!photo) {
    if (s.art.cast) await drawCast(g, s.art.cast, W / 2 + 10, H - 120, 690, 'rgba(255,110,30,.95)');
    fadeDown();
  }
  pill(g, s.type.toUpperCase(), 30, 76, '#f2ede5', INK, 13);
  footer(g, s, '#f2ede5', 'rgba(242,237,229,.42)', { glow: 'rgba(255,106,26,.9)' });
}

function prove(g: G, s: CoverSpec) {
  const W = COVER_W;
  const H = COVER_H;
  const bg = g.createRadialGradient(300, 330, 20, 300, 330, 620);
  bg.addColorStop(0, '#3b2707');
  bg.addColorStop(0.6, '#0e0a05');
  bg.addColorStop(1, '#050404');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // spotlight
  const sp = g.createLinearGradient(0, 0, 0, 640);
  sp.addColorStop(0, 'rgba(255,226,150,.28)');
  sp.addColorStop(1, 'rgba(255,226,150,0)');
  g.fillStyle = sp;
  g.beginPath();
  g.moveTo(250, -10);
  g.lineTo(350, -10);
  g.lineTo(560, 660);
  g.lineTo(40, 660);
  g.closePath();
  g.fill();
  texture(g, 'overlay', 0.1);
  const rnd = rng(s.n * 3);
  for (let i = 0; i < 16; i++) spark(g, 40 + rnd() * 520, 90 + rnd() * 520, 3 + rnd() * 9, `rgba(255,240,200,${0.4 + rnd() * 0.5})`);
  g.fillStyle = YELLOW;
  g.font = font(20, 'monob');
  spaced(g, 'THE  CUP', W / 2, 140, 10, 'center');
  cup(g, 300, 200);
  sticker(g, 488, 640, 58, -0.2, RED, '#fff6ec', 'LIVE', 'DEC 08');
  pill(g, s.type.toUpperCase(), 30, 76, '#f2ede5', INK, 13);
  footer(g, s, '#f2ede5', 'rgba(242,237,229,.42)', { glow: 'rgba(255,190,40,.8)' });
}

function spark(g: G, x: number, y: number, r: number, c: string) {
  g.fillStyle = c;
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y);
  g.quadraticCurveTo(x, y, x, y - r);
  g.fill();
}

function cup(g: G, cx: number, top: number) {
  const gold = g.createLinearGradient(cx - 160, 0, cx + 160, 0);
  gold.addColorStop(0, '#6e2f05');
  gold.addColorStop(0.28, '#ffb21f');
  gold.addColorStop(0.42, '#fff2bf');
  gold.addColorStop(0.55, YELLOW);
  gold.addColorStop(0.8, '#d9701a');
  gold.addColorStop(1, '#5a2404');
  g.save();
  g.shadowColor = 'rgba(255,170,40,.55)';
  g.shadowBlur = 60;
  g.fillStyle = gold;
  // handles
  g.strokeStyle = gold;
  g.lineWidth = 20;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - 140, top + 40);
  g.bezierCurveTo(cx - 230, top + 30, cx - 230, top + 170, cx - 110, top + 190);
  g.stroke();
  g.beginPath();
  g.moveTo(cx + 140, top + 40);
  g.bezierCurveTo(cx + 230, top + 30, cx + 230, top + 170, cx + 110, top + 190);
  g.stroke();
  // bowl
  g.beginPath();
  g.moveTo(cx - 155, top + 10);
  g.lineTo(cx + 155, top + 10);
  g.bezierCurveTo(cx + 155, top + 180, cx + 90, top + 260, cx, top + 262);
  g.bezierCurveTo(cx - 90, top + 260, cx - 155, top + 180, cx - 155, top + 10);
  g.fill();
  g.shadowBlur = 0;
  // rim
  g.fillStyle = '#fff2bf';
  g.beginPath();
  g.ellipse(cx, top + 10, 155, 14, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#7a3406';
  g.beginPath();
  g.ellipse(cx, top + 12, 140, 9, 0, 0, Math.PI * 2);
  g.fill();
  // stem, knot, base
  g.fillStyle = gold;
  g.fillRect(cx - 16, top + 255, 32, 60);
  g.beginPath();
  g.ellipse(cx, top + 292, 30, 13, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.roundRect(cx - 82, top + 312, 164, 34, 10);
  g.fill();
  g.beginPath();
  g.roundRect(cx - 108, top + 342, 216, 44, 12);
  g.fill();
  g.fillStyle = '#1a0f05';
  g.beginPath();
  g.roundRect(cx - 44, top + 351, 88, 26, 7);
  g.fill();
  g.fillStyle = YELLOW;
  g.font = font(16, 'monob');
  spaced(g, 'Q4 · 26', cx, top + 370, 2, 'center');
  // gloss
  g.fillStyle = 'rgba(255,255,255,.4)';
  g.beginPath();
  g.ellipse(cx - 78, top + 100, 14, 70, 0.18, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function branch(g: G, s: CoverSpec) {
  const W = COVER_W;
  const H = COVER_H;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#b9b5ad');
  bg.addColorStop(1, '#85817a');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  texture(g, 'multiply', 0.16);
  // the stamp, inked on its own sheet so the worn holes show the card underneath
  const st = document.createElement('canvas');
  st.width = 520;
  st.height = 180;
  const k = st.getContext('2d')!;
  k.translate(260, 90);
  k.strokeStyle = RED;
  k.fillStyle = RED;
  k.lineWidth = 8;
  k.beginPath();
  k.roundRect(-232, -70, 464, 140, 22);
  k.stroke();
  k.font = font(98, 'black');
  k.textAlign = 'center';
  k.letterSpacing = '2px';
  k.fillText('REMEDIAL', 0, 34);
  k.globalCompositeOperation = 'destination-out';
  const rnd = rng(s.n * 41);
  for (let i = 0; i < 460; i++) {
    k.globalAlpha = 0.4 + rnd() * 0.6;
    k.beginPath();
    k.arc(-240 + rnd() * 480, -76 + rnd() * 152, 0.6 + rnd() * 2.2, 0, Math.PI * 2);
    k.fill();
  }
  g.save();
  g.translate(300, 236);
  g.rotate(-0.13);
  g.globalAlpha = 0.92;
  g.drawImage(st, -260, -90);
  g.restore();
  // the fork
  g.strokeStyle = '#141414';
  g.fillStyle = '#141414';
  g.lineWidth = 9;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(300, 370);
  g.lineTo(300, 420);
  g.bezierCurveTo(300, 470, 170, 450, 170, 510);
  g.lineTo(170, 600);
  g.moveTo(300, 420);
  g.bezierCurveTo(300, 470, 430, 450, 430, 510);
  g.stroke();
  g.beginPath();
  g.arc(430, 556, 40, -Math.PI / 2, Math.PI * 1.3);
  g.stroke();
  // arrow heads
  arrow(g, 170, 612, Math.PI / 2);
  arrow(g, 404, 586, -0.6);
  g.beginPath();
  g.arc(300, 366, 13, 0, Math.PI * 2);
  g.fill();
  g.font = font(15, 'monob');
  g.letterSpacing = '1.5px';
  g.textAlign = 'center';
  g.fillText('SCORE', 300, 346);
  g.fillText('≥ 70%', 170, 640);
  g.fillText('NEXT TAPE', 170, 660);
  g.fillText('< 70%', 430, 640);
  g.fillText('LOOP ×3', 430, 660);
  g.fillText('→ COACH', 430, 680);
  g.textAlign = 'left';
  g.letterSpacing = '0px';
  // rental sticker
  g.save();
  g.translate(500, 140);
  g.rotate(0.22);
  g.shadowColor = 'rgba(0,0,0,.3)';
  g.shadowBlur = 10;
  g.shadowOffsetY = 4;
  g.fillStyle = '#f4f0e8';
  g.beginPath();
  g.arc(0, 0, 50, 0, Math.PI * 2);
  g.fill();
  g.shadowColor = 'transparent';
  g.fillStyle = INK;
  g.textAlign = 'center';
  g.font = font(13, 'monob');
  g.fillText('BE KIND', 0, -4);
  g.fillText('REWIND', 0, 14);
  g.textAlign = 'left';
  g.restore();
  pill(g, s.type.toUpperCase(), 30, 76, INK, '#f2ede5', 13);
  footer(g, s, '#141414', 'rgba(20,20,20,.55)', { titleColor: '#141414' });
}

function arrow(g: G, x: number, y: number, ang: number) {
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.beginPath();
  g.moveTo(10, 0);
  g.lineTo(-8, -10);
  g.lineTo(-8, 10);
  g.closePath();
  g.fill();
  g.restore();
}

function reward(g: G, s: CoverSpec) {
  const W = COVER_W;
  const H = COVER_H;
  g.fillStyle = '#080706';
  g.fillRect(0, 0, W, H);
  const cx = 300;
  const cy = 380;
  for (let i = 0; i < 32; i++) {
    const a0 = (i / 32) * Math.PI * 2;
    const a1 = a0 + Math.PI / 32;
    g.fillStyle = 'rgba(255,255,255,.035)';
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a0) * 900, cy + Math.sin(a0) * 900);
    g.lineTo(cx + Math.cos(a1) * 900, cy + Math.sin(a1) * 900);
    g.closePath();
    g.fill();
  }
  const glow = g.createRadialGradient(cx, cy, 20, cx, cy, 380);
  glow.addColorStop(0, 'rgba(255,138,61,.5)');
  glow.addColorStop(1, 'rgba(255,138,61,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  texture(g, 'overlay', 0.1);
  // ribbon tails
  g.fillStyle = '#b8450f';
  g.beginPath();
  g.moveTo(cx - 70, cy + 90);
  g.lineTo(cx - 128, cy + 290);
  g.lineTo(cx - 92, cy + 262);
  g.lineTo(cx - 64, cy + 302);
  g.lineTo(cx - 10, cy + 110);
  g.fill();
  g.fillStyle = ORANGE;
  g.beginPath();
  g.moveTo(cx + 70, cy + 90);
  g.lineTo(cx + 128, cy + 290);
  g.lineTo(cx + 92, cy + 262);
  g.lineTo(cx + 64, cy + 302);
  g.lineTo(cx + 10, cy + 110);
  g.fill();
  // medal
  g.save();
  g.shadowColor = 'rgba(255,150,80,.5)';
  g.shadowBlur = 50;
  const foil = g.createLinearGradient(cx - 150, cy - 150, cx + 150, cy + 150);
  foil.addColorStop(0, '#fffaf0');
  foil.addColorStop(0.3, '#b9b3aa');
  foil.addColorStop(0.46, '#ffffff');
  foil.addColorStop(0.62, '#8f897f');
  foil.addColorStop(0.82, '#ffd2a6');
  foil.addColorStop(1, ORANGE);
  g.fillStyle = foil;
  g.beginPath();
  g.arc(cx, cy, 150, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,.28)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cy, 122, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.7)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, 127, 0, Math.PI * 2);
  g.stroke();
  // star
  const star = g.createLinearGradient(cx, cy - 80, cx, cy + 70);
  star.addColorStop(0, ORANGE_HI);
  star.addColorStop(1, '#8a3108');
  g.fillStyle = star;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 34 : 82;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy - 12 + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.beginPath();
  g.moveTo(cx, cy - 94);
  g.lineTo(cx + 12, cy - 40);
  g.lineTo(cx - 6, cy - 40);
  g.closePath();
  g.fill();
  // banner
  g.fillStyle = INK;
  g.beginPath();
  g.roundRect(cx - 132, cy + 62, 264, 44, 12);
  g.fill();
  g.fillStyle = '#fff6ec';
  g.font = font(19, 'monob');
  const word = s.title.split(' ')[0]!.toUpperCase();
  spaced(g, word, cx, cy + 91, 6, 'center');
  const rnd = rng(s.n * 9);
  for (let i = 0; i < 14; i++) spark(g, 40 + rnd() * 520, 80 + rnd() * 560, 3 + rnd() * 9, `rgba(255,236,210,${0.35 + rnd() * 0.55})`);
  pill(g, s.type.toUpperCase(), 30, 76, '#f2ede5', INK, 13);
  footer(g, s, '#f2ede5', 'rgba(242,237,229,.42)', { glow: 'rgba(255,106,26,.85)' });
}

// ——— entry points ———

const cache = new Map<string, Promise<HTMLCanvasElement>>();

export function renderCover(s: CoverSpec): Promise<HTMLCanvasElement> {
  const hit = cache.get(s.key);
  if (hit) return hit;
  const p = (async () => {
    await ensureFonts();
    const cv = document.createElement('canvas');
    cv.width = COVER_W;
    cv.height = COVER_H;
    const g = cv.getContext('2d')!;
    g.textBaseline = 'alphabetic';
    switch (s.type) {
      case 'learn':
        await learn(g, s);
        break;
      case 'assess':
        assess(g, s);
        break;
      case 'compete':
        await compete(g, s);
        break;
      case 'prove':
        prove(g, s);
        break;
      case 'branch':
        branch(g, s);
        break;
      case 'reward':
        reward(g, s);
        break;
    }
    header(g, s.type === 'learn' || s.type === 'branch' ? '#141414' : '#fff6ec');
    statusSticker(g, s);
    wear(g, s.n * 77 + s.title.length);
    return cv;
  })();
  cache.set(s.key, p);
  return p;
}

const urlCache = new Map<string, Promise<string>>();
export function coverUrl(s: CoverSpec): Promise<string> {
  let p = urlCache.get(s.key);
  if (!p) {
    p = renderCover(s).then(
      (cv) => new Promise<string>((res) => cv.toBlob((b) => res(b ? URL.createObjectURL(b) : cv.toDataURL()), 'image/webp', 0.92)),
    );
    urlCache.set(s.key, p);
  }
  return p;
}

/** The spine label of a tape, for the shelf. */
export async function renderSpine(s: CoverSpec) {
  await ensureFonts();
  const W = 128;
  const H = 960;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, W, 0);
  bg.addColorStop(0, '#0c0c0d');
  bg.addColorStop(0.5, '#1b1b1d');
  bg.addColorStop(1, '#0c0c0d');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const paper = s.type === 'branch' ? '#b5b1a9' : s.type === 'learn' ? '#efe9e0' : '#e6e2db';
  g.fillStyle = paper;
  g.beginPath();
  g.roundRect(16, 36, W - 32, H - 72, 10);
  g.fill();
  g.fillStyle = INK;
  g.font = font(64, 'vt');
  g.textAlign = 'center';
  g.fillText(String(s.n).padStart(2, '0'), W / 2, 104);
  g.save();
  g.translate(W / 2 + 12, 150);
  g.rotate(Math.PI / 2);
  g.font = font(fit(g, s.title.toUpperCase(), (z) => font(z, 'monob'), 560, 36), 'monob');
  g.textAlign = 'left';
  g.fillText(s.title.toUpperCase(), 0, 0);
  g.restore();
  const dot = s.status === 'done' ? GREEN : s.status === 'current' ? YELLOW : s.status === 'locked' ? RED : '#8e8b85';
  g.fillStyle = dot;
  g.beginPath();
  g.arc(W / 2, H - 150, 15, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = INK;
  g.font = font(16, 'monob');
  g.save();
  g.translate(W / 2 + 6, H - 190);
  g.rotate(-Math.PI / 2);
  g.textAlign = 'left';
  g.fillText(s.type.toUpperCase(), 0, 0);
  g.restore();
  g.font = font(15, 'monob');
  g.fillText('SP', W / 2, H - 92);
  g.textAlign = 'left';
  texture(g, 'overlay', 0.1);
  return cv;
}

/** Shrink-wrap: glossy streaks and crinkles on a transparent sheet (locked tapes). */
export function renderWrap() {
  const W = 300;
  const H = 480;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  const rnd = rng(99);
  g.fillStyle = 'rgba(220,220,225,.07)';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 22; i++) {
    const x = rnd() * W * 1.4 - W * 0.2;
    const w = 6 + rnd() * 40;
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, `rgba(255,255,255,${0.08 + rnd() * 0.22})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.save();
    g.translate(x, 0);
    g.rotate(0.35 + rnd() * 0.12);
    g.fillStyle = gr;
    g.fillRect(-x, -100, w + x, H * 1.6);
    g.restore();
  }
  g.strokeStyle = 'rgba(255,255,255,.18)';
  for (let i = 0; i < 40; i++) {
    g.lineWidth = 0.6 + rnd();
    const x = rnd() < 0.5 ? rnd() * 30 : W - rnd() * 30;
    const y = rnd() * H;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rnd() - 0.5) * 50, y + (rnd() - 0.5) * 30);
    g.stroke();
  }
  return cv;
}
