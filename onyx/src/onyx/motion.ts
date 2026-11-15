import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(useGSAP, SplitText, Flip, CustomEase, ScrollTrigger, DrawSVGPlugin);

// The Onyx curves: a long, luxurious settle, and a cinematic in-out for camera-like moves.
CustomEase.create('onyx', 'M0,0 C0.12,0.82 0.22,1 1,1');
CustomEase.create('onyxInOut', 'M0,0 C0.7,0 0.18,1 1,1');
CustomEase.create('onyxSoft', 'M0,0 C0.33,0.6 0.24,1 1,1');

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
export const reduced = () => !!mq?.matches;
/** A duration that collapses to 0 when the viewer prefers reduced motion. */
export const dur = (s: number) => (reduced() ? 0 : s);

gsap.defaults({ ease: 'onyx', duration: 0.9 });

/** Headline reveal: characters rise out of a soft blur, one after another. */
export function splitReveal(el: Element | null, opts: { delay?: number; stagger?: number; by?: 'chars' | 'words' } = {}) {
  if (!el) return;
  if (reduced()) {
    gsap.set(el, { opacity: 1 });
    return;
  }
  const by = opts.by ?? 'chars';
  gsap.set(el, { opacity: 1 });
  SplitText.create(el, {
    type: by === 'chars' ? 'words,chars' : 'words',
    autoSplit: true,
    onSplit(self) {
      const parts = by === 'chars' ? self.chars : self.words;
      return gsap.from(parts, {
        yPercent: 55,
        opacity: 0,
        filter: 'blur(14px)',
        duration: 1.25,
        ease: 'onyx',
        stagger: opts.stagger ?? (by === 'chars' ? 0.024 : 0.06),
        delay: opts.delay ?? 0,
        clearProps: 'filter',
      });
    },
  });
}

/** Staged rise for blocks: opacity, lift, de-blur. */
export function rise(targets: gsap.TweenTarget, opts: { delay?: number; stagger?: number; y?: number } = {}) {
  if (reduced()) return gsap.set(targets, { opacity: 1, y: 0 });
  return gsap.fromTo(
    targets,
    { opacity: 0, y: opts.y ?? 26, filter: 'blur(8px)' },
    { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'onyx', stagger: opts.stagger ?? 0.08, delay: opts.delay ?? 0, clearProps: 'filter,transform' },
  );
}

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

/** Smoothly count a number from its previous value to the next. */
export function tweenNumber(el: HTMLElement | null, from: number, to: number, opts: { duration?: number; delay?: number; format?: (n: number) => string } = {}) {
  if (!el) return;
  const format = opts.format ?? fmtInt;
  if (reduced()) {
    el.textContent = format(to);
    return;
  }
  const o = { v: from };
  return gsap.to(o, {
    v: to,
    duration: opts.duration ?? 1.6,
    delay: opts.delay ?? 0,
    ease: 'expo.out',
    onUpdate: () => {
      el.textContent = format(o.v);
    },
  });
}

export { gsap, useGSAP, SplitText, Flip, ScrollTrigger };
