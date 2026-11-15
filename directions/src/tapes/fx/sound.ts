// Tape-deck sound: a quiet hiss while unmuted, and mechanical clunks on transport actions.
// Everything is synthesised with Web Audio; nothing plays until the viewer unmutes.

let ctx: AudioContext | null = null;
let hiss: AudioBufferSourceNode | null = null;
let hissGain: GainNode | null = null;
let muted = true;
const subs = new Set<() => void>();

function noiseBuffer(c: AudioContext, seconds: number, brown = false) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w;
  }
  return buf;
}

export function isMuted() {
  return muted;
}
export function onMute(cb: () => void) {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

export function setMuted(next: boolean) {
  muted = next;
  if (!next) {
    ctx ??= new AudioContext();
    void ctx.resume();
    if (!hiss) {
      hissGain = ctx.createGain();
      hissGain.gain.value = 0;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2400;
      hiss = ctx.createBufferSource();
      hiss.buffer = noiseBuffer(ctx, 4);
      hiss.loop = true;
      hiss.connect(hp).connect(hissGain).connect(ctx.destination);
      hiss.start();
    }
    hissGain?.gain.setTargetAtTime(0.012, ctx.currentTime, 0.3);
    clunk('play');
  } else if (ctx && hissGain) {
    hissGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  }
  subs.forEach((f) => f());
}

/** A short mechanical transport sound. */
export function clunk(kind: 'play' | 'ff' | 'rew' | 'rec' | 'tick' = 'tick') {
  if (muted || !ctx) return;
  const c = ctx;
  const t = c.currentTime;
  // body thump
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(kind === 'tick' ? 900 : 140, t);
  o.frequency.exponentialRampToValueAtTime(kind === 'tick' ? 500 : 55, t + 0.09);
  g.gain.setValueAtTime(kind === 'tick' ? 0.04 : 0.22, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'tick' ? 0.05 : 0.16));
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.2);
  if (kind === 'tick') return;
  // the click of the mechanism
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, 0.25);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = kind === 'ff' || kind === 'rew' ? 3200 : 1800;
  bp.Q.value = 1.4;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'ff' || kind === 'rew' ? 0.24 : 0.08));
  n.connect(bp).connect(ng).connect(c.destination);
  n.start(t);
}
