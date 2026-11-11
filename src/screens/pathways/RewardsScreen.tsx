import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import {
  castArt,
  finalRewardItem,
  nextReward,
  payTotals,
  REWARD_KIND_LABEL,
  rewardState,
  type Pathway,
  type RewardItem,
  type RewardState,
} from '../../data/pathways';
import { pressEscape, usePageHints } from '../../shell/pageHints';
import { RewardArt, rewardSilhouette } from './RewardArt';
import { CARD_H, CARD_QUAD, CARD_W, PLATE_H, PLATE_QUAD, PLATE_W, mapPoint, quadMatrix, toPx } from './rewardQuad';
import { Glyph, KIND_GLYPH } from './StageArt';
import './rewards.css';

/*
  COMPLETE FOR REWARDS (REWARDS_SCREEN.md). The heat L panel with the two-tone title, the
  selected reward large in its own form (a painted card lying back on the table, a badge, a
  title nameplate, a cup banner), its info, the progress bar, the track of thumbnails and GO.
  Every position is a pixel of the 1920 × 1080 frame (--u). Motion is stepped like the reference
  and moves only transform and opacity; each animated property sits on its own element.
*/

export type RewardsScreenProps = {
  pathway: Pathway;
  /** the learner's avatar key, for title nameplates */
  avatarKey: string;
  /** index into pathway.rewards to select first; default: the next unclaimed reward, else the final one */
  initial?: number;
  /**
   * Esc (when INSPECT is closed) or the bar's BACK: return to the map. The screen listens for its
   * own keys (←, →, Home, End, Enter, Z, Esc) on window in the capture phase and stops the ones
   * it handles, so the page and App never see them.
   */
  onBack: () => void;
  /** GO on a reward not yet claimed: open the detail screen of the stage that pays it (0-based index) */
  onGo: (stageIndex: number) => void;
};

const pad = (n: number) => String(n).padStart(2, '0');
/** 1160 → '1,160' (toLocaleString costs a dozen milliseconds per call here) */
const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const u = (n: number) => `calc(var(--u) * ${+n.toFixed(2)})`;
const FRAME = 1000 / 30;

/* the upright display cuts are this screen's own faces (rewards.css): fetch them before the title shows */
if (typeof document !== 'undefined' && document.fonts) {
  for (const w of [700, 800, 900]) document.fonts.load(`${w} 96px "Rw Display"`).catch(() => {});
}

/* ── layout ─────────────────────────────────────────────────────────────────────────────── */

type Cell = { x: number; w: number };

/** the track (§2.8): the reference's sizes; past x 1270 the sizes and the gap shrink together */
function trackLayout(n: number) {
  let w = 96;
  let fw = 137;
  let gap = 37;
  let h = 97;
  let top = 845;
  const natural = (n - 1) * (w + gap) + fw;
  if (n === 6) {
    w = 88;
    fw = 124;
    gap = 21;
    h = 89;
    top = 849;
  } else if (natural > 669) {
    const s = 669 / natural;
    w *= s;
    fw *= s;
    gap *= s;
    top += (h - h * s) / 2;
    h *= s;
  }
  const cells: Cell[] = [];
  let x = 601;
  for (let i = 0; i < n; i++) {
    const cw = i === n - 1 ? fw : w;
    cells.push({ x, w: cw });
    x += cw + gap;
  }
  return { cells, h, top };
}

/** the L panel's edge, offset by d u to the outside (d < 0: inside), as polyline points */
function edge(d: number, from = 60, to = 1500) {
  const k = 0.4067 * d;
  return `${531 + d},${from} ${531 + d},${112 + k} ${184 + d},${468 + k} ${184 + d},${to}`;
}

const EDGE_STRIP = `531,60 531,112 184,468 184,1500 198,1500 198,${(468 + 0.4067 * 14).toFixed(1)} 545,${(112 + 0.4067 * 14).toFixed(1)} 545,60`;

/** the boxes the preview objects sit in (u) */
const BADGE_BOX = { x: 1004 - 190.9, y: 330, w: 381.8, h: 420 };
const BANNER_BOX = { x: 854, y: 310, w: 300, h: 470 };
/** INSPECT boxes, centred at (960, 520) (§6) */
const INSPECT_BOX: Record<RewardItem['kind'], { w: number; h: number }> = {
  card: { w: 1120, h: 700 },
  badge: { w: 581.8, h: 640 },
  title: { w: 1100, h: 258 },
  banner: { w: 420, h: 660 },
};

const PLATE_FOOT = mapPoint(CARD_W, CARD_H, CARD_QUAD, CARD_W / 2, CARD_H / 2 + PLATE_H / 2);

/** frame px per u: the same rule as --u (tokens.css), read from the window so it never forces a layout */
const NARROW = '(max-aspect-ratio: 1/1), (max-width: 820px)';
const frameScale = () =>
  window.matchMedia(NARROW).matches ? window.innerWidth / 760 : Math.min(window.innerWidth / 1920, window.innerHeight / 1080);

function useFrameScale() {
  const [k, setK] = useState(frameScale);
  useEffect(() => {
    const on = () => setK(frameScale());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return k;
}

function defaultIndex(p: Pathway) {
  const next = nextReward(p) ?? finalRewardItem(p);
  return Math.max(0, p.rewards.indexOf(next));
}

const STATE_WORD: Record<RewardState, string> = { claimed: 'Claimed', next: 'Next', locked: 'Locked' };

/* ── the screen ─────────────────────────────────────────────────────────────────────────── */

type Change = { n: number; mode: 'first' | 'card' | 'gap' | 'fade'; from: number };
type Inspect = { phase: 'open' | 'closing'; index: number; n: number };

export function RewardsScreen({ pathway, avatarKey, initial, onBack, onGo }: RewardsScreenProps) {
  const items = pathway.rewards;
  const count = items.length;
  const [sel, setSel] = useState(() => Math.min(count - 1, Math.max(0, initial ?? defaultIndex(pathway))));
  const [change, setChange] = useState<Change>({ n: 0, mode: 'first', from: -1 });
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const [arriving, setArriving] = useState(true);
  const [inspect, setInspect] = useState<Inspect | null>(null);
  const [leaving, setLeaving] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const k = useFrameScale();
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const goRef = useRef<HTMLButtonElement>(null);
  const selFrame = useRef<SVGSVGElement>(null);
  const timers = useRef<number[]>([]);
  const busy = useRef(false);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const item = items[sel]!;
  const state = rewardState(pathway, item);
  const stage = pathway.stages[item.stage - 1]!;
  const totals = payTotals(pathway);
  const done = pathway.stages.filter((s) => s.state === 'done').length;
  const layout = trackLayout(count);

  // the arrival (§4) runs once, from the mount; then the idle motion takes over
  useEffect(() => {
    const t = window.setTimeout(() => setArriving(false), reduced() ? 200 : 900);
    return () => window.clearTimeout(t);
  }, []);

  // preload and decode the three paintings and the faces, so a card never shows half-drawn
  useEffect(() => {
    for (const key of ['strategist', 'analyst', 'clinician']) {
      for (const v of ['after', 'face'] as const) {
        const img = new Image();
        img.decoding = 'async';
        img.src = castArt(key, v);
        img.decode?.().catch(() => {});
      }
    }
  }, []);

  /* ── selection (§5) ── */
  const select = useCallback(
    (i: number, viaKeys = false) => {
      if (i === sel || i < 0 || i >= count || busy.current) return;
      const a = items[sel]!;
      const b = items[i]!;
      const ca = a.kind === 'card';
      const cb = b.kind === 'card';
      const mode: Change['mode'] = reduced() ? 'fade' : ca && cb ? 'card' : ca !== cb ? 'gap' : 'fade';
      setChange((c) => ({ n: c.n + 1, mode, from: sel }));
      setOutgoing(mode === 'fade' && !reduced() ? sel : null);
      setSel(i);
      setArriving(false);
      if (mode === 'fade') later(() => setOutgoing(null), 110);
      if (viaKeys) {
        const active = document.activeElement;
        if (!active || active === document.body || frameRef.current?.contains(active)) thumbs.current[i]?.focus({ preventScroll: true });
      }
    },
    [sel, count, items, later],
  );

  /** at either end the selection frame bumps 4 u toward the wall and comes back (120 ms) */
  const bump = useCallback((dir: number) => {
    const el = selFrame.current;
    if (!el || reduced()) return;
    el.animate([{ transform: 'translate(0, 0)' }, { transform: `translate(${dir * 4 * (k || 1)}px, 0)` }, { transform: 'translate(0, 0)' }], { duration: 120, easing: 'ease-out' });
  }, [k]);

  const step = useCallback(
    (dir: number) => {
      const n = sel + dir;
      if (n < 0 || n >= count) bump(dir);
      else select(n, true);
    },
    [sel, count, bump, select],
  );

  /* ── GO (§7) ── */
  const go = useCallback(() => {
    const btn = goRef.current;
    if (busy.current || leaving) return;
    if (state === 'claimed') {
      if (btn && !reduced())
        btn.animate([{ transform: 'translate(0, 0)' }, { transform: `translate(${-4 * k}px, 0)` }, { transform: `translate(${4 * k}px, 0)` }, { transform: 'translate(0, 0)' }], { duration: 120, easing: 'ease-out' });
      return;
    }
    busy.current = true;
    if (btn && !reduced()) {
      btn.animate([{ transform: `translate(0, ${2 * k}px)` }, { transform: `translate(0, ${2 * k}px)` }], { duration: 130 });
      btn.querySelector('.rw-go-flash')?.animate([{ opacity: 0.6 }, { opacity: 0.6, offset: 0.99 }, { opacity: 0 }], { duration: FRAME });
    }
    setLeaving(true);
    later(() => onGo(item.stage - 1), reduced() ? 0 : 133);
    // if the page could not take the jump (it was mid-transition), lift the dip and stay
    later(() => {
      busy.current = false;
      setLeaving(false);
    }, 700);
  }, [state, k, leaving, later, onGo, item.stage]);

  /* ── INSPECT (§6) ── */
  const insObj = useRef<HTMLDivElement>(null);
  const insTilt = useRef<HTMLDivElement>(null);
  const insGlare = useRef<HTMLElement>(null);
  const tilt = useRef({ x: 0, y: 0, tx: 0, ty: 0, gx: 0.5, gy: 0.35, lit: false, raf: 0, kick: () => {} });
  const inspectRef = useRef<Inspect | null>(null);
  inspectRef.current = inspect;
  const [insShine, setInsShine] = useState(0);

  const fromTransform = useCallback(
    (kind: RewardItem['kind']) => {
      const box = INSPECT_BOX[kind];
      const ox = 960 - box.w / 2;
      const oy = 520 - box.h / 2;
      if (kind === 'card') return quadMatrix(box.w * k, box.h * k, toPx(CARD_QUAD, k, ox, oy));
      if (kind === 'title') return quadMatrix(box.w * k, box.h * k, toPx(PLATE_QUAD, k, ox, oy));
      if (kind === 'badge') return `translate(${(BADGE_BOX.x - ox) * k}px, ${(BADGE_BOX.y - oy) * k}px) scale(${BADGE_BOX.h / box.h})`;
      const s = BANNER_BOX.h / box.h;
      return `translate(${(BANNER_BOX.x - ox) * k}px, ${(BANNER_BOX.y - oy) * k}px) scale(${s}) translate(${(box.w / 2) * k}px, ${(box.h / 2) * k}px) perspective(${1400 * k}px) rotateY(-12deg) translate(${(-box.w / 2) * k}px, ${(-box.h / 2) * k}px)`;
    },
    [k],
  );

  const openInspect = useCallback(() => {
    if (inspectRef.current || busy.current || leaving) return;
    setArriving(false);
    setInsShine(0);
    setInspect({ phase: 'open', index: sel, n: Date.now() });
  }, [sel, leaving]);

  const closeInspect = useCallback(() => {
    const cur = inspectRef.current;
    if (!cur || cur.phase === 'closing') return;
    const kind = items[cur.index]!.kind;
    const el = insObj.current;
    setInspect({ ...cur, phase: 'closing' });
    if (el && !reduced()) {
      el.style.willChange = 'transform';
      el.animate([{ transform: 'none' }, { transform: fromTransform(kind) }], { duration: 200, easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fill: 'forwards' });
      // the tilt eases back to flat on the way, so the object lands in the preview's own pose
      const tiltEl = insTilt.current;
      if (tiltEl?.style.transform) tiltEl.animate([{ transform: tiltEl.style.transform }, { transform: 'none' }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
      const g = insGlare.current;
      if (g) g.style.opacity = '0';
    }
    later(() => setInspect(null), reduced() ? 0 : 200);
  }, [items, fromTransform, later]);

  // the flight in: the preview un-tilts and flies to the centre (250 ms), then one foil shine
  useLayoutEffect(() => {
    if (!inspect || inspect.phase !== 'open') return;
    const el = insObj.current;
    const kind = items[inspect.index]!.kind;
    if (el && !reduced()) {
      el.style.willChange = 'transform';
      const a = el.animate([{ transform: fromTransform(kind) }, { transform: 'none' }], { duration: 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
      a.onfinish = () => {
        el.style.willChange = '';
        setInsShine((n) => n + 1);
      };
    }
  }, [inspect?.n]);

  // INSPECT idle: the object leans toward the pointer (±7°) and a specular glare follows it
  useEffect(() => {
    if (!inspect || inspect.phase !== 'open' || reduced()) return;
    const t = tilt.current;
    t.x = t.y = t.tx = t.ty = 0;
    t.lit = false;
    const frameTick = () => {
      t.x += (t.tx - t.x) * 0.12;
      t.y += (t.ty - t.y) * 0.12;
      const el = insTilt.current;
      if (el) el.style.transform = `perspective(${1600 * k}px) rotateX(${t.x.toFixed(3)}deg) rotateY(${t.y.toFixed(3)}deg)`;
      const g = insGlare.current;
      if (g) {
        g.style.transform = `translate(${((t.gx - 0.5) * 100).toFixed(2)}%, ${((t.gy - 0.5) * 100).toFixed(2)}%)`;
        g.style.opacity = t.lit ? '1' : '0';
      }
      if (Math.abs(t.tx - t.x) > 0.01 || Math.abs(t.ty - t.y) > 0.01) t.raf = requestAnimationFrame(frameTick);
      else t.raf = 0;
    };
    const kick = () => {
      if (!t.raf) t.raf = requestAnimationFrame(frameTick);
    };
    const onMove = (e: PointerEvent) => {
      const box = insObj.current?.getBoundingClientRect();
      if (!box) return;
      const rx = ((e.clientX - box.left) / box.width) * 2 - 1;
      const ry = ((e.clientY - box.top) / box.height) * 2 - 1;
      // the glare shows only while the pointer is over the object: never a veil over the paint at rest
      t.lit = Math.abs(rx) <= 1.05 && Math.abs(ry) <= 1.05;
      const px = Math.max(-1, Math.min(1, rx));
      const py = Math.max(-1, Math.min(1, ry));
      t.ty = px * 7;
      t.tx = -py * 7;
      t.gx = (px + 1) / 2;
      t.gy = (py + 1) / 2;
      kick();
    };
    window.addEventListener('pointermove', onMove);
    t.kick = kick;
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (t.raf) cancelAnimationFrame(t.raf);
      t.raf = 0;
      t.kick = () => {};
    };
  }, [inspect, k]);

  const tiltBy = useCallback((dx: number, dy: number) => {
    const t = tilt.current;
    t.tx = Math.max(-7, Math.min(7, t.tx + dx));
    t.ty = Math.max(-7, Math.min(7, t.ty + dy));
    t.gx = 0.5 + t.ty / 14;
    t.gy = 0.5 - t.tx / 14;
    t.lit = t.tx !== 0 || t.ty !== 0;
    t.kick();
    if (reduced()) {
      const el = insTilt.current;
      if (el) el.style.transform = `perspective(${1600 * k}px) rotateX(${t.tx}deg) rotateY(${t.ty}deg)`;
    }
  }, [k]);

  /* ── keys: captured on window while mounted; the ones handled here stop here ── */
  const keyState = useRef({ step, select, go, openInspect, closeInspect, tiltBy, onBack, count });
  keyState.current = { step, select, go, openInspect, closeInspect, tiltBy, onBack, count };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      const s = keyState.current;
      const key = e.key;
      const stop = () => {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
      };
      if (inspectRef.current) {
        if (key === 'Escape' || key === 'z' || key === 'Z') {
          stop();
          if (!e.repeat) s.closeInspect();
        } else if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
          stop();
          if (key === 'ArrowLeft') s.tiltBy(0, -3);
          else if (key === 'ArrowRight') s.tiltBy(0, 3);
          else if (key === 'ArrowUp') s.tiltBy(3, 0);
          else s.tiltBy(-3, 0);
        } else if (key === 'Enter' || key === 'Home' || key === 'End' || key === ' ') stop();
        return;
      }
      // a focused control outside this screen (a bar hint) keeps Enter and Space for itself
      const outside = el && el !== document.body && !frameRef.current?.contains(el);
      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        stop();
        s.step(key === 'ArrowRight' ? 1 : -1);
      } else if (key === 'Home' || key === 'End') {
        stop();
        s.select(key === 'Home' ? 0 : s.count - 1, true);
      } else if (key === 'Enter' && !outside) {
        stop();
        if (!e.repeat) s.go();
      } else if (key === 'z' || key === 'Z') {
        stop();
        if (!e.repeat) s.openInspect();
      } else if (key === 'Escape') {
        stop();
        s.onBack();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // keyboard focus starts on the selected reward
  useEffect(() => {
    const t = window.setTimeout(() => thumbs.current[sel]?.focus({ preventScroll: true }), 30);
    return () => window.clearTimeout(t);
  }, []);

  /* ── the bar (§2.10) ── */
  usePageHints(
    inspect
      ? [
          { keys: '←↑↓→', label: 'Tilt', onPress: () => tiltBy(0, 3) },
          { keys: 'Z / Esc', label: 'Close', onPress: closeInspect },
        ]
      : [
          { keys: '←→', label: 'Select', onPress: () => step(1) },
          { keys: 'Enter', label: 'Go', onPress: go },
          { keys: 'Z', label: 'Inspect', onPress: openInspect },
          { keys: 'Esc', label: 'Back', onPress: pressEscape },
        ],
  );

  /* ── what the screen says ── */
  const toGo = Math.max(0, item.stage - done);
  const stateLine =
    state === 'claimed' ? 'Claimed' : state === 'next' ? `Next · ${toGo} more stage${toGo === 1 ? '' : 's'}` : `Locked · Requires: ${stage.gate}`;
  const live = `${item.name}. ${item.rarity} ${REWARD_KIND_LABEL[item.kind].toLowerCase()}. Paid by stage ${item.stage}, ${stage.title}. ${
    state === 'claimed' ? 'Claimed.' : state === 'next' ? `Next: ${toGo} more stage${toGo === 1 ? '' : 's'}.` : `Locked. Requires: ${stage.gate}.`
  }`;

  /* ── the preview ── */
  const renderPreview = (index: number, role: 'in' | 'out') => {
    const it = items[index]!;
    const first = change.mode === 'first' && role === 'in';
    const cls = `rw-pv is-${it.kind} is-${role} m-${first ? 'first' : change.mode}`;
    const art = <RewardArt item={it} variant="preview" avatarKey={avatarKey} />;
    const open = () => openInspect();
    if (it.kind === 'card' || it.kind === 'title') {
      const card = it.kind === 'card';
      const w = card ? CARD_W : PLATE_W;
      const h = card ? CARD_H : PLATE_H;
      const m = k ? quadMatrix(w * k, h * k, toPx(card ? CARD_QUAD : PLATE_QUAD, k)) : 'scale(0)';
      return (
        <div key={`${role}-${index}-${change.n}`} className={cls}>
          <div className={card ? 'rw-card' : 'rw-plate'} style={{ transform: m }} onClick={role === 'in' ? open : undefined}>
            <div className="rw-pv-in">
              <div className="rw-float">
                <div className="rw-sway">
                  <div className={`rw-pose${card && role === 'in' ? ' is-shining' : ''}`}>{art}</div>
                </div>
              </div>
            </div>
          </div>
          {!card && (
            <p className="rw-plate-note" style={{ left: u(PLATE_FOOT[0] - 300), top: u(PLATE_FOOT[1] + 44) }}>
              Shown under your name in duels and on the leaderboard.
            </p>
          )}
        </div>
      );
    }
    const box = it.kind === 'badge' ? BADGE_BOX : BANNER_BOX;
    return (
      <div key={`${role}-${index}-${change.n}`} className={cls}>
        <div className={`rw-obj is-${it.kind}`} style={{ left: u(box.x), top: u(box.y), width: u(box.w), height: u(box.h) }} onClick={role === 'in' ? open : undefined}>
          <div className="rw-pv-in">
            <div className={it.kind === 'badge' ? 'rw-bob' : 'rw-swing'}>{art}</div>
          </div>
        </div>
      </div>
    );
  };

  const objectShown = item.kind !== 'card';
  const ins = inspect ? items[inspect.index]! : null;
  const insBox = ins ? INSPECT_BOX[ins.kind] : null;
  const insStage = ins ? pathway.stages[ins.stage - 1]! : null;
  const insMask = ins ? rewardSilhouette(ins) : null;

  return (
    <section
      className={`rw${arriving ? ' is-arriving' : ''}${inspect ? ' is-inspecting' : ''}${leaving ? ' is-leaving' : ''}`}
      aria-label={`Complete for rewards: ${pathway.name}`}
    >
      <div className="rw-frame" ref={frameRef}>
        {/* backdrop additions (§2.1): the ghost name and the floor glow, under the dip */}
        <div className="rw-bg" aria-hidden="true">
          <p className="rw-ghost">{pathway.name}</p>
          <i className="rw-floor" />
        </div>
        {arriving && <i className="rw-dip" aria-hidden="true" />}

        {/* the heat L panel and the right edge band (§2.2, §2.1) */}
        <div className="rw-l" aria-hidden="true">
          <div className="rw-l-shape">
            <i className="k k-hatch" />
            <i className="k k-halftone rw-l-dots" />
            <i className="k k-grain" />
          </div>
          <div className="rw-band">
            <i className="k k-hatch" />
            <i className="k k-grain" />
          </div>
          <div className="rw-streaks">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>

        {/* the title, twice: black inside the panel, heat outside (§2.4) */}
        <h1 className="sr-only">Complete for rewards</h1>
        <div className="rw-title" aria-hidden="true">
          <p className="rw-title-copy is-in">
            <span>
              Complete for
              <br />
              Rewards
            </span>
          </p>
          <p className="rw-title-copy is-out">
            <span>
              Complete for
              <br />
              Rewards
            </span>
          </p>
        </div>

        {/* drawn lines: the edge strip over the title, construction lines, the accent and the leader (§2.2, §2.3) */}
        <svg className="rw-lines" viewBox="0 0 1920 1080" aria-hidden="true">
          <polyline className="rw-construct" points={edge(-16, 76, 1500)} />
          <path className="rw-construct" d="M0 380H46L0 426" />
          <polygon className="rw-edge" points={EDGE_STRIP} />
          <polyline className="rw-edge-lit" points={edge(1)} />
          <polyline className="rw-edge-shade" points={edge(12.5)} />
          <rect className="rw-accent" x="124" y="519" width="61" height="7" rx="2" />
          <path className="rw-leader" d="M185 522H232L418 708H573" />
          <path className="rw-leader is-hot" d="M573 708L601 737" />
          <rect className="rw-dash" x="298" y="511" width="16" height="3" rx="1" />
        </svg>

        {/* the selected reward, large (§2.5) */}
        <div className={`rw-stage${objectShown ? ' is-object' : ''}`}>
          <i className="rw-glow" aria-hidden="true" />
          <EmblemRing />
          {outgoing !== null && renderPreview(outgoing, 'out')}
          {renderPreview(sel, 'in')}
        </div>

        {/* the info column (§2.6) */}
        <div className="rw-info" key={`info-${sel}`}>
          <h2 className="rw-name display">{item.name}</h2>
          <p className="rw-kind display">
            {REWARD_KIND_LABEL[item.kind]} · <span className={`rw-rarity is-${item.rarity.toLowerCase()}`}>{item.rarity}</span>
          </p>
          <i className="rw-rule" aria-hidden="true" />
          <p className="rw-series">
            {pathway.name} · <b>No. {pad(item.stage)}</b>
          </p>
          <p className="rw-source">
            <Glyph name={KIND_GLYPH[stage.kind]} />
            Clear stage {pad(item.stage)} · {stage.title}
          </p>
          <p className="rw-pay">
            <Glyph name="syn" className="rw-syn" />+{fmt(stage.reward.syn)} SYN{stage.reward.sr ? ` · +${stage.reward.sr} SR` : ''}
          </p>
          <p className={`rw-state is-${state}`}>
            {state === 'claimed' ? <Glyph name="check" /> : state === 'locked' ? <Glyph name="lock" /> : <i className="rw-state-pip" />}
            {stateLine}
          </p>
        </div>
        <p className="sr-only" aria-live="polite">
          {live}
        </p>

        {/* progress (§2.7) */}
        <div className="rw-progress">
          <span className="rw-progress-skin" aria-hidden="true">
            <i className="k k-hatch" />
          </span>
          <span className="rw-progress-label">Progress</span>
          <span className="rw-progress-count" aria-label={`${done} of ${pathway.stages.length} stages cleared`}>
            [<b>{done}</b>/{pathway.stages.length}]
          </span>
          <span className="rw-progress-paid">
            {fmt(totals.syn)} / {fmt(totals.allSyn)} SYN · {fmt(totals.sr)} / {fmt(totals.allSr)} SR
          </span>
        </div>

        {/* the track: a line, a diamond per reward, the thumbnails (§2.8) */}
        <div className="rw-track" role="group" aria-label="Rewards">
          <i
            className="rw-track-line"
            aria-hidden="true"
            style={{ left: u(layout.cells[0]!.x + layout.cells[0]!.w / 2), width: u(layout.cells[count - 1]!.x + layout.cells[count - 1]!.w / 2 - layout.cells[0]!.x - layout.cells[0]!.w / 2) }}
          />
          {items.map((it, i) => {
            const c = layout.cells[i]!;
            const st = rewardState(pathway, it);
            return (
              <i key={`d${i}`} className={`rw-dia is-${st}${i === sel ? ' is-on' : ''}`} style={{ left: u(c.x + c.w / 2) }} aria-hidden="true">
                <b>{it.stage}</b>
              </i>
            );
          })}
          {items.map((it, i) => {
            const c = layout.cells[i]!;
            const st = rewardState(pathway, it);
            const on = i === sel;
            return (
              <button
                key={`t${i}`}
                type="button"
                ref={(el) => {
                  thumbs.current[i] = el;
                }}
                className={`rw-thumb is-${st}${on ? ' is-on' : ''}${it.final ? ' is-final' : ''}`}
                style={{ left: u(c.x), top: u(layout.top), width: u(c.w), height: u(layout.h), '--i': i } as CSSProperties}
                aria-pressed={on}
                aria-label={`${it.name}, ${it.rarity} ${REWARD_KIND_LABEL[it.kind].toLowerCase()}, stage ${it.stage}, ${STATE_WORD[st].toLowerCase()}`}
                tabIndex={on ? 0 : -1}
                onClick={() => select(i)}
              >
                <span className="rw-thumb-in">
                  <span className="rw-thumb-land">
                    <span className="rw-thumb-lift">
                      <i className="rw-tick is-tl" />
                      <i className="rw-tick is-tr" />
                      <i className="rw-tick is-br" />
                      <i className="rw-tick is-bl" />
                      <span className="rw-thumb-frame">
                        <span className="rw-thumb-well">
                          <i className="k k-halftone" />
                          <span className={`rw-thumb-art is-${it.kind}`}>
                            <RewardArt item={it} variant="thumb" avatarKey={avatarKey} />
                          </span>
                          <i className={`rw-thumb-bar is-${it.rarity.toLowerCase()}`} />
                        </span>
                      </span>
                      {st === 'claimed' && (
                        <i className="rw-thumb-check">
                          <Glyph name="check" />
                        </i>
                      )}
                      {st === 'locked' && (
                        <i className="rw-thumb-lock">
                          <Glyph name="lock" />
                        </i>
                      )}
                      {on && (
                        <svg className="rw-thumb-sel" ref={selFrame} viewBox={`0 0 ${c.w + 10} ${layout.h + 10}`} style={{ width: u(c.w + 10), height: u(layout.h + 10) }}>
                          <path className="rw-sel-a" d={notchFrame(c.w + 10, layout.h + 10, 1.5)} />
                          <path className="rw-sel-b" d={notchFrame(c.w + 10, layout.h + 10, 4)} />
                        </svg>
                      )}
                      <i className="rw-thumb-focus" />
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* GO (§2.9) */}
        <div className="rw-go-wrap">
          <button
            type="button"
            ref={goRef}
            className={`rw-go${state === 'claimed' ? ' is-claimed' : ''}`}
            aria-disabled={state === 'claimed'}
            aria-label={state === 'claimed' ? `${item.name}: claimed` : `Go to stage ${item.stage}, ${stage.title}`}
            onClick={go}
          >
            <span className="rw-go-drop" aria-hidden="true">
              <svg viewBox="0 0 319 47" preserveAspectRatio="none">
                <path d={GO_SHAPE} />
              </svg>
            </span>
            <span className="rw-go-body" aria-hidden="true">
              <svg viewBox="0 0 319 47" preserveAspectRatio="none">
                <path className="rw-go-fill" d={GO_SHAPE} />
                <path className="rw-go-top" d="M12 1.2H316" />
              </svg>
              <span className="rw-go-chev">
                <i />
              </span>
            </span>
            <span className="rw-go-label">
              {state === 'claimed' ? (
                <>
                  <Glyph name="check" />
                  Claimed
                </>
              ) : (
                'Go'
              )}
            </span>
            <svg className="rw-go-flash" viewBox="0 0 319 47" preserveAspectRatio="none" aria-hidden="true">
              <path d={GO_SHAPE} />
            </svg>
          </button>
          <p className="rw-go-sub">
            Stage {pad(item.stage)} · {stage.title}
          </p>
        </div>

        {/* INSPECT */}
        {ins && insBox && insStage && inspect && (
          <div className={`rw-ins is-${inspect.phase}`} onClick={closeInspect}>
            <i className="rw-ins-veil" aria-hidden="true">
              <i className="k k-grain" />
            </i>
            <div
              className={`rw-ins-obj is-${ins.kind}`}
              ref={insObj}
              style={{ left: u(960 - insBox.w / 2), top: u(520 - insBox.h / 2), width: u(insBox.w), height: u(insBox.h) }}
              onClick={(e) => e.stopPropagation()}
              role="img"
              aria-label={`${ins.name}, ${ins.rarity} ${REWARD_KIND_LABEL[ins.kind].toLowerCase()}`}
            >
              <div className="rw-ins-tilt" ref={insTilt}>
                <div className={`rw-ins-art${insShine ? ' is-shining' : ''}`} key={`shine-${insShine}`}>
                  <RewardArt item={ins} variant="inspect" avatarKey={avatarKey} />
                </div>
                <span className={`rw-ins-glare-clip is-${ins.kind}`} style={insMask ? ({ WebkitMaskImage: insMask, maskImage: insMask } as CSSProperties) : undefined}>
                  <i className="rw-ins-glare" ref={insGlare} />
                </span>
              </div>
            </div>
            <div className="rw-ins-info" onClick={(e) => e.stopPropagation()}>
              <p className="rw-ins-kind display">
                {REWARD_KIND_LABEL[ins.kind]} · <span className={`rw-rarity is-${ins.rarity.toLowerCase()}`}>{ins.rarity}</span>
              </p>
              <h2 className="rw-ins-name display">{ins.name}</h2>
              <p className="rw-ins-line">
                Clear stage {pad(ins.stage)} · {insStage.title} · <Glyph name="syn" className="rw-syn" />+{fmt(insStage.reward.syn)} SYN
                {insStage.reward.sr ? ` +${insStage.reward.sr} SR` : ''}
              </p>
              {ins.serial && <p className="rw-ins-serial">{pathway.name} · No. {ins.serial}</p>}
            </div>
          </div>
        )}

        {leaving && <i className="rw-leave" aria-hidden="true" />}
      </div>
    </section>
  );
}

/* ── drawn pieces ───────────────────────────────────────────────────────────────────────── */

/** GO: a 10 u chamfer at the top left; the bottom steps down 4 u at 62% of the width; radius 3 u */
const GO_SHAPE = 'M11 1.5Q12.2 0 14 0H316Q319 0 319 3V44Q319 47 316 47H202.8Q200.5 47 199.6 45L198.9 43.6Q198.3 43 197.4 43H3Q0 43 0 40V13Q0 11.4 1.1 10.2Z';

/** the selection frame: a rectangle inset by o, its lower-left corner notched 10 u */
function notchFrame(w: number, h: number, o: number) {
  return `M${o} ${o}H${w - o}V${h - o}H${o + 10}L${o} ${h - o - 10}Z`;
}

/** the ghost emblem ring behind a badge, title or banner: the ASCENT mark in rings, 24 ticks */
function EmblemRing() {
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    const r0 = i % 2 ? 300 : 286;
    return `M${(340 + Math.cos(a) * r0).toFixed(1)} ${(340 + Math.sin(a) * r0).toFixed(1)}L${(340 + Math.cos(a) * 326).toFixed(1)} ${(340 + Math.sin(a) * 326).toFixed(1)}`;
  }).join('');
  return (
    <svg className="rw-ring" viewBox="0 0 680 680" aria-hidden="true">
      <circle cx="340" cy="340" r="336" />
      <circle cx="340" cy="340" r="262" strokeDasharray="4 10" />
      <circle cx="340" cy="340" r="214" />
      <circle cx="340" cy="340" r="150" />
      <path d={ticks} />
      <g transform="translate(232 262) scale(4.2)">
        <g transform="skewX(-12) translate(8 0)">
          <path className="rw-ring-mark" fillRule="evenodd" d="M2 34 15.5 2h9.5L38.5 34h-9.8l-2.3-6.5H14.2L11.8 34zm14.7-13h7.2l-3.6-10.3z" />
          <path className="rw-ring-mark" d="M30 27.5h12.5L45 34H32.3z" />
        </g>
      </g>
    </svg>
  );
}

