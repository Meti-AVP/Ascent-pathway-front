import { useEffect, useRef, type CSSProperties } from 'react';
import { rng } from './Brush';

let noiseUrl = '';
/** A static noise tile (data URL): film grain and the tracking bands. */
export function noiseTile() {
  if (noiseUrl) return noiseUrl;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (!g) return '';
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = v;
    img.data[i + 1] = v * 0.97;
    img.data[i + 2] = v * 0.93;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noiseUrl = c.toDataURL('image/png');
  return noiseUrl;
}

/** Film grain: a noise tile jumped around in steps, so it shimmers like film without a per-frame canvas. */
export function Grain() {
  return <div className="tp-grain" aria-hidden style={{ '--noise': `url(${noiseTile()})` } as CSSProperties} />;
}

// ——— Smoke: value-noise clouds tinted burnt orange, the CRT glow behind everything ———
function smoke(w: number, h: number, seed: number) {
  const rnd = rng(seed);
  const octaves = [
    { g: 4, a: 0.5 },
    { g: 8, a: 0.27 },
    { g: 16, a: 0.15 },
    { g: 32, a: 0.08 },
  ].map((o) => {
    const gw = o.g + 2;
    const gh = Math.ceil((o.g * h) / w) + 2;
    const arr = new Float32Array(gw * gh);
    for (let i = 0; i < arr.length; i++) arr[i] = rnd();
    return { ...o, gw, gh, arr };
  });
  const sm = (t: number) => t * t * (3 - 2 * t);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (const o of octaves) {
        const fx = (x / w) * o.g;
        const fy = (y / w) * o.g;
        const ix = Math.floor(fx);
        const iy = Math.floor(fy);
        const tx = sm(fx - ix);
        const ty = sm(fy - iy);
        const a = o.arr[iy * o.gw + ix]!;
        const b = o.arr[iy * o.gw + ix + 1]!;
        const c = o.arr[(iy + 1) * o.gw + ix]!;
        const d = o.arr[(iy + 1) * o.gw + ix + 1]!;
        v += (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty) * o.a;
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

export function Smoke({ seed, className, tint = [255, 106, 26], strength = 1 }: { seed: number; className?: string; tint?: [number, number, number]; strength?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const W = 320;
    const H = 180;
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d');
    if (!g) return;
    const v = smoke(W, H, seed);
    const img = g.createImageData(W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const n = v[i]!;
        // soft falloff toward the frame edges, stronger in the middle band
        const dx = (x / W - 0.5) * 1.6;
        const dy = (y / H - 0.52) * 1.9;
        const fall = Math.max(0, 1 - (dx * dx + dy * dy) * 0.55);
        const a = Math.max(0, Math.min(1, (n - 0.38) * 1.5)) * fall * strength;
        img.data[i * 4] = tint[0];
        img.data[i * 4 + 1] = tint[1];
        img.data[i * 4 + 2] = tint[2];
        img.data[i * 4 + 3] = a * 255;
      }
    }
    g.putImageData(img, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, strength, tint.join(',')]);
  return <canvas ref={ref} className={`tp-smoke ${className ?? ''}`} aria-hidden />;
}
