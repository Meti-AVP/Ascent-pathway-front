// The painted world behind the UI: cliffs and pedestals, the monument, the rocks,
// a glow pulse running along the path of fire, drifting embers and a slow parallax.
import { useEffect, useRef, type ReactNode } from 'react';

export const ART = (name: string) => `${import.meta.env.BASE_URL}ember/art/${name}`;
export const STILL = typeof location !== 'undefined' && /[?&]still/.test(location.href);

/** World coordinates: the art layer starts at concept x = 228 and is anchored right. */
export const WX = (refX: number) => refX - 228;

export function World({ clean, children, dim }: { clean?: boolean; children?: ReactNode; dim?: boolean }) {
  return (
    <>
      <div className={'em-world' + (dim ? ' is-dim' : '')}>
        <img className="em-world__img" src={ART(clean ? 'world-clean.webp' : 'world.webp')} alt="" draggable={false} />
        <img className="em-world__fire" src={ART('fire.webp')} alt="" draggable={false} />
        {children}
      </div>
      <img className="em-monument" src={ART('monument.webp')} alt="" draggable={false} />
      <img className="em-rocks" src={ART('rocks.webp')} alt="" draggable={false} />
      <Embers />
    </>
  );
}

/** Slow parallax: pointer position eased into CSS variables on the stage. */
export function useParallax(stage: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = stage.current;
    if (!el || STILL || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, ta = 0, ca = 0, raf = 0;
    let wx = 0, wy = 0, wa = 0;
    const move = (e: PointerEvent) => {
      tx = (e.clientX / innerWidth) * 2 - 1;
      ty = (e.clientY / innerHeight) * 2 - 1;
      ta = 1;
    };
    const leave = () => { tx = 0; ty = 0; };
    const tick = () => {
      cx += (tx - cx) * 0.035;
      cy += (ty - cy) * 0.035;
      ca += (ta - ca) * 0.02;
      if (Math.abs(cx - wx) > 0.0008 || Math.abs(cy - wy) > 0.0008 || Math.abs(ca - wa) > 0.0008) {
        wx = cx; wy = cy; wa = ca;
        el.style.setProperty('--mx', cx.toFixed(4));
        el.style.setProperty('--my', cy.toFixed(4));
        el.style.setProperty('--ma', ca.toFixed(4));
      }
      raf = requestAnimationFrame(tick);
    };
    addEventListener('pointermove', move);
    document.addEventListener('pointerleave', leave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
    };
  }, [stage]);
}

interface Ember { x: number; y: number; vx: number; vy: number; life: number; age: number; r: number; hue: number; ph: number }

/** Drifting embers: a few dozen sparks rising from the rocks and the path of fire. */
function Embers() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || STILL || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const s = sprite.getContext('2d')!;
    const g = s.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,236,200,1)');
    g.addColorStop(0.18, 'rgba(255,170,80,.95)');
    g.addColorStop(0.45, 'rgba(240,100,30,.35)');
    g.addColorStop(1, 'rgba(200,60,10,0)');
    s.fillStyle = g;
    s.fillRect(0, 0, 32, 32);

    const spawn = (initial: boolean): Ember => {
      const fromPath = Math.random() < 0.45;
      return {
        x: fromPath ? 0.47 + Math.random() * 0.5 : 0.12 + Math.random() * 0.88,
        y: initial ? Math.random() : fromPath ? 0.3 + Math.random() * 0.25 : 0.86 + Math.random() * 0.16,
        vx: (Math.random() - 0.35) * 0.006,
        vy: -(0.012 + Math.random() * 0.03),
        life: 5 + Math.random() * 7,
        age: initial ? Math.random() * 6 : 0,
        r: 0.7 + Math.random() * 1.7,
        hue: Math.random(),
        ph: Math.random() * 6.28,
      };
    };
    const ps: Ember[] = Array.from({ length: 52 }, () => spawn(true));
    let raf = 0, last = performance.now(), w = 0, h = 0, k = 1;
    const fit = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.width = Math.round(r.width * dpr);
      h = cv.height = Math.round(r.height * dpr);
      k = w / 1672;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]!;
        p.age += dt;
        if (p.age > p.life || p.y < -0.05) { ps[i] = spawn(false); continue; }
        p.x += (p.vx + Math.sin(p.age * 1.3 + p.ph) * 0.004) * dt;
        p.y += p.vy * dt;
        const life = p.age / p.life;
        const a = Math.min(1, p.age * 1.5) * (1 - life) * (0.55 + 0.45 * Math.sin(p.age * 7 + p.ph));
        const size = p.r * 7 * k * (p.hue > 0.8 ? 1.25 : 1);
        ctx.globalAlpha = Math.max(0, a) * 0.85;
        ctx.drawImage(sprite, p.x * w - size / 2, p.y * h - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={ref} className="em-embers" aria-hidden />;
}
