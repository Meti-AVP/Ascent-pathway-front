import { useEffect, useRef, type CSSProperties } from 'react';
import { gsap, reduced } from '../motion';
import type { ObjectEntry, ObjectFile } from './objects';

/**
 * One realistic stage object standing on a pedestal. The parent sets --rx (the pedestal's half-width in px);
 * the object is rx × fit wide and its anchor point stands on the pedestal's top centre.
 * `learner_spin` plays its sprite sheet forward and back, about 3 s per sweep.
 */
export function ObjectSprite({ entry, file, className }: { entry: ObjectEntry; file: ObjectFile; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const spin = file === 'learner_spin';
  const { cols, rows, frames } = entry.grid;

  useEffect(() => {
    const el = ref.current;
    if (!spin || !el) return;
    const show = (f: number) => {
      const c = f % cols, r = Math.floor(f / cols);
      el.style.backgroundPosition = `${cols > 1 ? (c / (cols - 1)) * 100 : 0}% ${rows > 1 ? (r / (rows - 1)) * 100 : 0}%`;
    };
    if (reduced()) { show(0); return; }
    const t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / 3000;
      const u = Math.floor(t) % 2 === 0 ? t % 1 : 1 - (t % 1);
      show(Math.min(frames - 1, Math.floor(u * frames)));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [spin, cols, rows, frames]);

  const style = {
    width: `calc(var(--rx) * ${entry.fit})`,
    aspectRatio: String(entry.aspect),
    transform: `translate(${-entry.anchor[0] * 100}%, ${(1 - entry.anchor[1]) * 100}%)`,
    backgroundImage: `url("${entry.src[file]}")`,
    backgroundSize: spin ? `${cols * 100}% ${rows * 100}%` : 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: spin ? '0% 0%' : 'center bottom',
  } as CSSProperties;
  return <span ref={ref} className={['obj3d', className].filter(Boolean).join(' ')} style={style} aria-hidden />;
}
