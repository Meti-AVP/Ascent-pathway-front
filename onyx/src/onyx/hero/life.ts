/**
 * Small, deterministic pieces of life: critically damped springs, blinks, micro-saccades, fire light,
 * the camera's arrival and drift. Everything is slow and small on purpose (UX.md: motion never distracts).
 */

/** Seeded PRNG (mulberry32) so the preview can be reproduced. */
export function rng(seed = 0x5eed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Critically damped spring (exact step): no overshoot, settles in about 4.7 / omega seconds. */
export class Spring {
  x: number;
  v = 0;
  constructor(public omega: number, x0 = 0) {
    this.x = x0;
  }
  step(target: number, dt: number) {
    const w = this.omega;
    const d = this.x - target;
    const e = Math.exp(-w * dt);
    const t = this.v + w * d;
    this.x = target + (d + t * dt) * e;
    this.v = (this.v - w * t * dt) * e;
    return this.x;
  }
  set(x: number) {
    this.x = x;
    this.v = 0;
  }
}

const easeIn = (u: number) => u * u;
const easeOut = (u: number) => 1 - (1 - u) ** 3;

/** Natural blinks: 2.2 - 6.8 s apart (sometimes a quick double), 70 ms close, 30 ms hold, 160 ms open. */
export class Blinker {
  private next: number;
  private start = -1;
  private pendingDouble = false;
  constructor(private rand: () => number, t0 = 0) {
    this.next = t0 + 1.4 + rand() * 2.2;
  }
  value(t: number) {
    if (this.start < 0 && t >= this.next) this.start = t;
    if (this.start < 0) return 0;
    const u = t - this.start;
    const CLOSE = 0.07, HOLD = 0.03, OPEN = 0.16;
    if (u >= CLOSE + HOLD + OPEN) {
      this.start = -1;
      if (!this.pendingDouble && this.rand() < 0.14) {
        this.pendingDouble = true;
        this.next = t + 0.12 + this.rand() * 0.08;
      } else {
        this.pendingDouble = false;
        // a skewed spread: mostly 3-4.5 s, now and then a long, calm look
        const r = this.rand();
        this.next = t + 2.2 + 2.6 * r + (this.rand() < 0.2 ? 2.0 * this.rand() : 0);
      }
      return 0;
    }
    if (u < CLOSE) return easeIn(u / CLOSE);
    if (u < CLOSE + HOLD) return 1;
    return 1 - easeOut((u - CLOSE - HOLD) / OPEN);
  }
}

/** Tiny fixational eye jumps (degrees), held for 0.8 - 3 s; the eye spring makes each jump quick but soft. */
export class Saccades {
  yaw = 0;
  pitch = 0;
  private next: number;
  constructor(private rand: () => number, t0 = 0) {
    this.next = t0 + 1 + rand() * 1.5;
  }
  update(t: number) {
    if (t < this.next) return;
    const back = this.rand() < 0.45; // often return close to centre
    this.yaw = back ? (this.rand() - 0.5) * 0.4 : (this.rand() - 0.5) * 1.6;
    this.pitch = back ? (this.rand() - 0.5) * 0.3 : (this.rand() - 0.5) * 0.9;
    this.next = t + 0.8 + this.rand() * 2.2;
  }
}

/** Light that breathes faintly, like a fire out of frame: slow, smooth, never a strobe. -1 .. 1 */
export function fire(t: number) {
  const s = Math.sin, P = Math.PI * 2;
  return (
    0.46 * s(P * 0.13 * t + 0.4) +
    0.27 * s(P * 0.31 * t + 1.7) +
    0.17 * s(P * 0.67 * t + 2.9) +
    0.1 * s(P * 1.13 * t + 0.6) * (0.6 + 0.4 * s(P * 0.07 * t))
  );
}

/** The camera's slow arrival (push-in) and its drift afterwards, as offsets for the framing. */
export function cameraMotion(t: number, sinceReady: number) {
  const s = Math.sin, P = Math.PI * 2;
  const u = Math.min(1, Math.max(0, sinceReady / 7.5));
  const arrive = 1 - (1 - u) ** 3; // ease-out cubic
  return {
    push: 1 + 0.085 * (1 - arrive), // distance factor: starts 8.5 % further away
    rise: -0.035 * (1 - arrive), // starts a little low and settles
    az: 0.55 * s((P * t) / 29) + 0.18 * s((P * t) / 13.7 + 1.2), // degrees
    el: 0.26 * s((P * t) / 37 + 0.5),
    bob: 0.0025 * s((P * t) / 21 + 2.0), // metres
  };
}
