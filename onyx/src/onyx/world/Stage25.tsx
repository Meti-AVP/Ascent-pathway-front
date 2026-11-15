import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type ReactNode, type Ref } from 'react';
import { gsap } from '../motion';
import type { WorldView } from './scene';
import './stage25.css';

/** Camera: frame point (fx, fy) sits at (ax, ay) of the stage box, at zoom z. */
export interface Cam { fx: number; fy: number; z: number; ax: number; ay: number }
export interface Pulse { from: number; to: number } // polyline indices
export interface StageApi {
  toScreen(nx: number, ny: number, out?: { x: number; y: number }): { x: number; y: number };
  size(): { w: number; h: number };
  frameSize(): { w: number; h: number };
  glide(c: Partial<Cam>, opts?: { duration?: number; ease?: string; cover?: boolean }): void;
  fit(box: { x0: number; y0: number; x1: number; y1: number }, rect: { left: number; top: number; right: number; bottom: number }, opts?: { duration?: number; maxZ?: number; minZ?: number }): void;
  subscribe(fn: () => void): () => void;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Stage25({ view, pulse, apiRef, className, children, onReady }: {
  view: WorldView; pulse?: Pulse | null; apiRef: Ref<StageApi>; className?: string; children?: ReactNode; onReady?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const st = useRef({
    w: 1, h: 1, FW: 1, FH: 1,
    cam: { fx: 0.5, fy: 0.5, z: 1, ax: 0.5, ay: 0.5 } as Cam,
    par: { x: 0, y: 0 },
    dirty: true,
    subs: new Set<() => void>(),
    pulseT: { u: 0, a: 0 },
    pathDepth: view.layers.find((l) => l.name === 'path')?.depth ?? 0.6,
  });
  const pulseRef = useRef<Pulse | null | undefined>(pulse);
  pulseRef.current = pulse;

  const measure = () => {
    const s = st.current;
    const r = box.current!.getBoundingClientRect();
    s.w = Math.max(1, r.width);
    s.h = Math.max(1, r.height);
    s.FW = Math.max(s.w, s.h * view.aspect);
    s.FH = s.FW / view.aspect;
    s.dirty = true;
  };

  const toScreen = (nx: number, ny: number, out = { x: 0, y: 0 }, depth = st.current.pathDepth) => {
    const s = st.current, c = s.cam;
    out.x = c.ax * s.w + (nx - c.fx) * s.FW * c.z + s.par.x * depth;
    out.y = c.ay * s.h + (ny - c.fy) * s.FH * c.z + s.par.y * depth;
    return out;
  };

  const clampCover = (c: Cam) => {
    const s = st.current;
    const W = s.FW * c.z, H = s.FH * c.z;
    const fxMin = (c.ax * s.w) / W, fxMax = (c.ax * s.w + W - s.w) / W;
    const fyMin = (c.ay * s.h) / H, fyMax = (c.ay * s.h + H - s.h) / H;
    c.fx = Math.min(fxMax, Math.max(fxMin, c.fx));
    c.fy = Math.min(fyMax, Math.max(fyMin, c.fy));
    return c;
  };

  const apply = () => {
    const s = st.current, c = s.cam;
    const els = layersRef.current?.children;
    if (els) {
      for (let i = 0; i < els.length; i++) {
        const el = els[i] as HTMLElement;
        const d = Number(el.dataset.depth ?? 0.5);
        const x = c.ax * s.w - c.fx * s.FW * c.z + s.par.x * d;
        const y = c.ay * s.h - c.fy * s.FH * c.z + s.par.y * d;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${c.z.toFixed(4)})`;
        el.style.width = `${s.FW}px`;
        el.style.height = `${s.FH}px`;
      }
    }
    s.subs.forEach((f) => f());
  };

  // the light pulse that travels along the path, drawn additively
  const drawPulse = () => {
    const cv = canvas.current;
    const p = pulseRef.current;
    if (!cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    const s = st.current;
    const dpr = Math.min(devicePixelRatio, 1.5);
    if (cv.width !== Math.round(s.w * dpr) || cv.height !== Math.round(s.h * dpr)) { cv.width = Math.round(s.w * dpr); cv.height = Math.round(s.h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, s.w, s.h);
    if (!p || s.pulseT.a <= 0.001) return;
    const path = view.path;
    const from = Math.max(0, Math.min(path.length - 1, p.from));
    const to = Math.max(from + 1, Math.min(path.length - 1, p.to));
    const head = from + (to - from) * s.pulseT.u;
    const tail = 9;
    const pt = { x: 0, y: 0 };
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k <= tail * 3; k++) {
      const f = head - k / 3;
      if (f < from) break;
      const i = Math.floor(f), t = f - i;
      const a = path[i]!, b = path[Math.min(path.length - 1, i + 1)]!;
      toScreen(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, pt);
      const fade = (1 - k / (tail * 3)) ** 1.6 * s.pulseT.a;
      const r = (k === 0 ? 26 : 16) * (0.6 + 0.4 * fade) * Math.max(0.7, st.current.cam.z);
      const grd = g.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
      grd.addColorStop(0, `rgba(255, 226, 170, ${0.55 * fade})`);
      grd.addColorStop(0.35, `rgba(255, 170, 90, ${0.28 * fade})`);
      grd.addColorStop(1, 'rgba(238, 106, 44, 0)');
      g.fillStyle = grd;
      g.beginPath();
      g.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      g.fill();
    }
  };

  useImperativeHandle(apiRef, () => ({
    toScreen: (nx, ny, out) => toScreen(nx, ny, out),
    size: () => ({ w: st.current.w, h: st.current.h }),
    frameSize: () => ({ w: st.current.FW, h: st.current.FH }),
    glide: (c, opts = {}) => {
      const s = st.current;
      const to = { ...s.cam, ...c };
      if (opts.cover !== false) clampCover(to);
      gsap.killTweensOf(s.cam);
      gsap.to(s.cam, { ...to, duration: reducedMotion() ? 0 : opts.duration ?? 1.4, ease: opts.ease ?? 'onyxInOut', onUpdate: () => { s.dirty = true; } });
    },
    fit: (b, rect, opts = {}) => {
      const s = st.current;
      const bw = Math.max(0.001, b.x1 - b.x0) * s.FW, bh = Math.max(0.001, b.y1 - b.y0) * s.FH;
      const rw = rect.right - rect.left, rh = rect.bottom - rect.top;
      const z = Math.min(opts.maxZ ?? 2, Math.max(opts.minZ ?? 0.5, Math.min(rw / bw, rh / bh)));
      const to: Cam = { fx: (b.x0 + b.x1) / 2, fy: (b.y0 + b.y1) / 2, z, ax: (rect.left + rw / 2) / s.w, ay: (rect.top + rh / 2) / s.h };
      gsap.killTweensOf(s.cam);
      gsap.to(s.cam, { ...to, duration: reducedMotion() ? 0 : opts.duration ?? 1.4, ease: 'onyxInOut', onUpdate: () => { s.dirty = true; } });
    },
    subscribe: (fn) => { st.current.subs.add(fn); return () => st.current.subs.delete(fn); },
  }));

  useLayoutEffect(() => {
    measure();
    apply();
    const ro = new ResizeObserver(() => { measure(); });
    ro.observe(box.current!);
    // one ticker drives transforms, chips and the pulse
    const tick = () => {
      const s = st.current;
      if (s.dirty) { s.dirty = false; apply(); }
      drawPulse();
    };
    gsap.ticker.add(tick);
    return () => { ro.disconnect(); gsap.ticker.remove(tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // gentle pointer parallax
  useEffect(() => {
    if (reducedMotion()) return;
    const s = st.current;
    const qx = gsap.quickTo(s.par, 'x', { duration: 1.6, ease: 'power3', onUpdate: () => { s.dirty = true; } });
    const qy = gsap.quickTo(s.par, 'y', { duration: 1.6, ease: 'power3', onUpdate: () => { s.dirty = true; } });
    const on = (e: PointerEvent) => {
      qx(-(e.clientX / innerWidth - 0.5) * 30);
      qy(-(e.clientY / innerHeight - 0.5) * 16);
    };
    window.addEventListener('pointermove', on, { passive: true });
    return () => window.removeEventListener('pointermove', on);
  }, []);

  // the pulse loop: travel, linger, fade, rest
  useEffect(() => {
    const s = st.current;
    gsap.killTweensOf(s.pulseT);
    if (!pulse) { s.pulseT.a = 0; return; }
    if (reducedMotion()) { s.pulseT.u = 1; s.pulseT.a = 0.7; return; }
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2, delay: 0.8 });
    tl.set(s.pulseT, { u: 0, a: 0 })
      .to(s.pulseT, { a: 1, duration: 0.4, ease: 'power1.out' }, 0)
      .to(s.pulseT, { u: 1, duration: 2.8, ease: 'power1.inOut' }, 0)
      .to(s.pulseT, { a: 0, duration: 1, ease: 'power2.in' }, 2.6);
    return () => { tl.kill(); };
  }, [pulse?.from, pulse?.to]);

  useEffect(() => { onReady?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={box} className={['s25', view.art ? 'is-art' : 'is-map', className].filter(Boolean).join(' ')}>
      <div ref={layersRef} className="s25__layers" aria-hidden>
        {view.art ? (
          view.layers.map((l) => (
            <img key={l.name} className={`s25__layer s25__layer--${l.name}`} data-depth={l.depth} src={l.src} alt="" draggable={false} decoding="async" />
          ))
        ) : (
          <SchematicLayer view={view} />
        )}
      </div>
      <canvas ref={canvas} className="s25__pulse" aria-hidden />
      <div className="s25__overlay">{children}</div>
    </div>
  );
}

/** The flat map drawn when no render is available: a line and soft discs, nothing that imitates the art. */
function SchematicLayer({ view }: { view: WorldView }) {
  const d = view.path.map((p, i) => `${i ? 'L' : 'M'}${(p[0] * 1600).toFixed(1)},${(p[1] * 900).toFixed(1)}`).join(' ');
  return (
    <svg className="s25__layer s25__map" data-depth="0.6" viewBox="0 0 1600 900" preserveAspectRatio="none">
      <defs>
        <filter id="s25-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7" /></filter>
        <radialGradient id="s25-disc" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#3a3d45" />
          <stop offset="1" stopColor="#15161a" />
        </radialGradient>
      </defs>
      <path d={d} fill="none" stroke="#ee6a2c" strokeOpacity="0.35" strokeWidth="12" filter="url(#s25-blur)" />
      <path d={d} fill="none" stroke="#f0a060" strokeOpacity="0.75" strokeWidth="2.2" strokeLinecap="round" />
      {Object.values(view.slots).map((s) => (
        <ellipse key={s.id} cx={s.cx * 1600} cy={s.cy * 900} rx={s.rx * 1600} ry={s.ry * 900} fill="url(#s25-disc)" stroke="#ffffff" strokeOpacity="0.08" />
      ))}
    </svg>
  );
}
