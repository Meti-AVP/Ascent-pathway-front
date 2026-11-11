import { startTransition, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { Avatar } from '../../data/cast';
import {
  ARENAS,
  cleared,
  currentIndex,
  finalRewardItem,
  KIND_LABEL,
  nextReward,
  PATHWAYS,
  REWARD_KIND_LABEL,
  type Pathway,
  type RewardItem,
} from '../../data/pathways';
import { layoutFor, type PanelGeo } from './layout';
import { PathBackdrop } from './PathBackdrop';
import { PathMap } from './PathMap';
import { RewardArt } from './RewardArt';
import { RewardsScreen } from './RewardsScreen';
import { ArtDefs, Glyph } from './StageArt';
import { StageDetail } from './StageDetail';
import './pathways.css';
import './backdrop.css';

const pad = (n: number) => String(n).padStart(2, '0');
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NARROW = '(max-aspect-ratio: 1/1), (max-width: 820px)';
/** a phone: the climb is shown as a list of stages, not a map scaled down past reading */
const PHONE = '(max-width: 600px)';

function useMedia(query: string) {
  const [on, setOn] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const change = () => setOn(mq.matches);
    mq.addEventListener('change', change);
    return () => mq.removeEventListener('change', change);
  }, [query]);
  return on;
}

/** where the map's box sits on the 1920 × 1080 frame */
const MAP_X = 560;
const MAP_Y = 300;
/**
 * The title block's corner, and the accent bar under the title's start (frame units). They follow
 * pathways.css: an 84 u title line, then the 26 u assignment row 6 u under it, the 7 u bar centred in it.
 */
const TITLE_X = 470;
const TITLE_Y = 160;
const ACCENT = { x: TITLE_X, y: TITLE_Y + 84 + 6 + 9.5, w: 60, h: 7 };

/** one frame of the reference video (30 fps): the page's transitions are counted in these */
const F = 33;
const STEP = 'steps(1, end)';
/** the reference's bands of light at a screen change: 'cut' holds two frames, 'scan' three */
const STRIP_FRAMES: Record<'cut' | 'scan', Keyframe[]> = {
  cut: [
    { opacity: 1, transform: 'none', easing: STEP },
    { opacity: 0.45, transform: 'translate3d(9%, 0, 0) scaleY(0.45)', offset: 0.5, easing: STEP },
    { opacity: 0, transform: 'translate3d(9%, 0, 0) scaleY(0.45)' },
  ],
  scan: [
    { opacity: 0.85, transform: 'translate3d(-7%, 0, 0) scaleY(0.6)', easing: STEP },
    { opacity: 1, transform: 'none', offset: 1 / 3, easing: STEP },
    { opacity: 0.5, transform: 'translate3d(9%, 0, 0) scaleY(0.4)', offset: 2 / 3, easing: STEP },
    { opacity: 0, transform: 'translate3d(9%, 0, 0) scaleY(0.4)' },
  ],
};
/** the map under the page colour in four frames (spec §4: the map at .88 / .46 / .15 / 0) */
const DIP_FRAMES: Keyframe[] = [
  { opacity: 0, easing: STEP },
  { opacity: 0.12, offset: 0.25, easing: STEP },
  { opacity: 0.54, offset: 0.5, easing: STEP },
  { opacity: 0.85, offset: 0.75, easing: STEP },
  { opacity: 1 },
];

/* ── the frame: the 1920 × 1080 design centred on wide screens, grounded on tall ones ─────── */
/**
 * Extra room around the 1920 × 1080 frame, in frame units: `fx` on each side when the viewport
 * is wider than 16:9 (the frame is centred), `fy` below it when the viewport is taller (the map
 * and the rewards block sit on the bottom bar). Both are 0 on the portrait / narrow layout.
 */
function useFrameSlack() {
  const read = () => {
    if (window.matchMedia(NARROW).matches) return { fx: 0, fy: 0 };
    const u = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    return { fx: Math.max(0, Math.round((window.innerWidth / u - 1920) / 2)), fy: Math.max(0, Math.round(window.innerHeight / u - 1080)) };
  };
  const [slack, setSlack] = useState(read);
  useEffect(() => {
    const on = () => setSlack((s) => {
      const n = read();
      return n.fx === s.fx && n.fy === s.fy ? s : n;
    });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return slack;
}

/** the theme as <html data-theme> says it (App switches it behind the wipe) */
function useDocTheme(): 'dark' | 'light' {
  const read = (): 'dark' | 'light' => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setTheme(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

/* ── the hero: a still of the learner's avatar from HOME's painterly rig ──────────────────── */
/** avatars with rig stills (tools/hero/): 700 × 1100 u, at 1× and 2×, per theme, plus the sticker rim */
const HERO_STILLS = new Set(['clinician', 'strategist', 'analyst']);
const heroFile = (key: string, look: 'dark' | 'light' | 'rim', x: 1 | 2) => `/img/cast/${key}-hero-${look}${x === 1 ? '-1x' : ''}.webp`;
/** 700 u of a frame unit that is min(100vw / 1920, 100vh / 1080); the portrait layout spreads it wide */
const HERO_SIZES = '((max-aspect-ratio: 1/1) or (max-width: 820px)) 92vw, min(36.46vw, 64.82vh)';

/** decode the hero ahead of time, so the first frame under the wipe does not wait for it */
function predecode(urls: string[]) {
  for (const url of urls) {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    img.decode().catch(() => undefined);
  }
}

// Warm the learner's hero once the app is idle (HOME is up first), so PATHWAYS' first frame under
// the shell's wipe does not wait on a download or a decode.
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  window.requestIdleCallback(
    () => {
      try {
        const key = localStorage.getItem('ascent.avatar') ?? 'clinician';
        const look = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
        if (HERO_STILLS.has(key)) predecode([heroFile(key, look, window.devicePixelRatio > 1 ? 2 : 1)]);
      } catch {
        /* storage blocked: the page simply loads it on arrival */
      }
    },
    { timeout: 8000 },
  );
}

function Hero({ avatar, theme, flash }: { avatar: Avatar; theme: 'dark' | 'light'; flash: number }) {
  const still = HERO_STILLS.has(avatar.key);
  // the sticker rim waits for the painting: on a cold load the small rim file arrives first and
  // would otherwise show alone, as a flat heat silhouette
  const [painted, setPainted] = useState(false);
  const artRef = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    const img = artRef.current;
    setPainted(!!img && img.complete && img.naturalWidth > 0);
  }, [avatar.key, theme]);
  useEffect(() => {
    if (!still) return;
    // the other theme's still, for the day the theme is switched behind the wipe
    const other = theme === 'dark' ? 'light' : 'dark';
    const dpr = window.devicePixelRatio > 1 ? 2 : 1;
    const t = window.setTimeout(() => predecode([heroFile(avatar.key, other, dpr)]), 1200);
    return () => window.clearTimeout(t);
  }, [avatar.key, theme, still]);

  const masks = still
    ? ({
        '--hero-art': `image-set(url(${heroFile(avatar.key, theme, 1)}) 1x, url(${heroFile(avatar.key, theme, 2)}) 2x)`,
        '--hero-rim': `image-set(url(${heroFile(avatar.key, 'rim', 1)}) 1x, url(${heroFile(avatar.key, 'rim', 2)}) 2x)`,
      } as CSSProperties)
    : undefined;

  return (
    <div className="pw-hero-figure" style={masks}>
      {still && painted && <i className="pw-hero-rim" />}
      {still ? (
        <img
          ref={artRef}
          onLoad={() => setPainted(true)}
          className="pw-hero-art"
          src={heroFile(avatar.key, theme, 1)}
          srcSet={`${heroFile(avatar.key, theme, 1)} 700w, ${heroFile(avatar.key, theme, 2)} 1400w`}
          sizes={HERO_SIZES}
          width={700}
          height={1100}
          alt=""
          decoding="async"
          fetchPriority="high"
          draggable={false}
        />
      ) : (
        <img className="pw-hero-art is-painting" src={avatar.after} alt="" decoding="async" draggable={false} />
      )}
      {/* the arrival's over-exposure: a white light on the figure only, never a filter on the paint */}
      {still && flash > 0 && <i className="pw-hero-flash" key={flash} />}
    </div>
  );
}

/* ── countdown: days, hours, minutes; the minutes roll in their slot ─────────────────────── */
function useMinutesLeft(ms: number) {
  const [due] = useState(() => Date.now() + ms);
  const read = useCallback(() => Math.max(0, Math.floor((due - Date.now()) / 60_000)), [due]);
  const [mins, setMins] = useState(read);
  useEffect(() => {
    if (ms <= 0) return;
    const t = window.setInterval(() => setMins(read()), 1000);
    return () => window.clearInterval(t);
  }, [ms, read]);
  return mins;
}

/** a value that rolls when it changes: the old one slides out as the new one slides in, so a digit always shows */
function Roll({ value }: { value: string }) {
  const [pair, setPair] = useState({ cur: value, old: value, n: 0 });
  if (pair.cur !== value) setPair({ cur: value, old: pair.cur, n: pair.n + 1 });
  return (
    <span className="pw-roll">
      <span className={`pw-roll-col${pair.n ? ' is-rolling' : ''}`} key={pair.n}>
        <span>{pair.cur}</span>
        {pair.n > 0 && <span aria-hidden="true">{pair.old}</span>}
      </span>
    </span>
  );
}

function Countdown({ ms }: { ms: number }) {
  const mins = useMinutesLeft(ms);
  if (ms <= 0)
    return (
      <span className="pw-meta is-done">
        <Glyph name="check" />
        Completed
      </span>
    );
  const d = Math.floor(mins / 1440);
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return (
    <span className="pw-meta is-clock" role="timer" aria-label={`Due in ${d} days ${h} hours ${m} minutes`}>
      <Glyph name="clock" />
      <span className="pw-clock" aria-hidden="true">
        {pad(d)}
        <i>D</i>
        {pad(h)}
        <i>H</i>
        <Roll value={pad(m)} />
        <i>M</i>
      </span>
    </span>
  );
}

/* ── the line from the title to where the learner stands ─────────────────────────────────── */
type Pt = [number, number];
type GeoWithRoute = PanelGeo & { gapRoute?: Pt[] };

/** a panel's outline as a quad in frame units: its flat top edge and its bottom corners */
function quadOf(g: PanelGeo, ox: number, oy: number): Pt[] {
  return [
    [ox + g.x + g.head.x, oy + g.y + g.head.y],
    [ox + g.x + g.head.x + g.head.w, oy + g.y + g.head.y],
    [ox + g.x + g.br[0], oy + g.y + g.br[1]],
    [ox + g.x + g.bl[0], oy + g.y + g.bl[1]],
  ];
}

/** is p within `pad` of the convex quad q (or inside it)? */
function near(p: Pt, q: Pt[], padding: number) {
  let sign = 0;
  for (let i = 0; i < q.length; i++) {
    const [ax, ay] = q[i]!;
    const [bx, by] = q[(i + 1) % q.length]!;
    sign += (bx - ax) * (by + ay);
  }
  const inward = sign > 0 ? 1 : -1;
  for (let i = 0; i < q.length; i++) {
    const [ax, ay] = q[i]!;
    const [bx, by] = q[(i + 1) % q.length]!;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const d = (((bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax)) / len) * inward;
    if (d < -padding) return false;
  }
  return true;
}

function crosses(a: Pt, b: Pt, quads: Pt[][]) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
  for (let i = 0; i <= n; i++) {
    const p: Pt = [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n];
    if (quads.some((q) => near(p, q, 6))) return true;
  }
  return false;
}

/**
 * The lead: from the accent bar's right end, down past the assignment line, then along the gaps
 * to the current panel's tile, never across a panel. The map's own `gapRoute` wins when the map
 * provides one; otherwise the shortest clear elbow-and-45° route is chosen.
 */
function leadRoute(geos: PanelGeo[], target: number, oy: number): Pt[] {
  const g = geos[target] as GeoWithRoute | undefined;
  const s: Pt = [ACCENT.x + ACCENT.w, ACCENT.y + ACCENT.h / 2];
  if (!g) return [s];
  const ox = MAP_X;
  const my = MAP_Y + oy;
  const tile: Pt = [ox + g.x + g.head.x + 14, my + g.y + g.head.y + 16];
  if (g.gapRoute?.length) {
    const pts = g.gapRoute.map(([x, y]) => [ox + x, my + y] as Pt);
    return [s, [s[0], pts[0]![1]], ...pts];
  }
  const quads = geos.map((q) => quadOf(q, ox, my));
  const others = quads.filter((_, i) => i !== target);
  const end: Pt = [tile[0] - 6, tile[1]];
  const options: Pt[][] = [];
  for (let y = s[1] + 46; y <= tile[1]; y += 6) {
    const run = tile[1] - y;
    const x1 = tile[0] - 34 - run;
    if (x1 < s[0]) continue;
    options.push(run > 0 ? [s, [s[0], y], [x1, y], [x1 + run, tile[1]], end] : [s, [s[0], y], end]);
  }
  options.push([s, [s[0], tile[1]], end]);
  const clear = options.find((pts) =>
    pts.every((p, i) => {
      if (i === 0) return true;
      const last = i === pts.length - 1;
      return !crosses(pts[i - 1]!, last ? ([p[0] - 30, p[1]] as Pt) : p, last ? others : quads);
    }),
  );
  return clear ?? options[options.length - 1]!;
}

/* ── the climb on a phone: one readable card per stage, in order ─────────────────────────── */
type StageListProps = { pathway: Pathway; onOpen: (i: number) => void; setRef: (i: number, el: HTMLButtonElement | null) => void };

function StageList({ pathway, onOpen, setRef }: StageListProps) {
  return (
    <ol className="pw-list" aria-label={`${pathway.name}: stages`}>
      {pathway.stages.map((s, i) => (
        <li key={i} className={`pw-list-item is-${s.state}`}>
          <button type="button" className="pw-list-btn" ref={(el) => setRef(i, el)} onClick={() => onOpen(i)}>
            <b className="display">{pad(i + 1)}</b>
            <span className="pw-list-copy">
              <i className="display">{s.arena ? `${KIND_LABEL[s.kind]} · ${ARENAS[s.arena].name}` : KIND_LABEL[s.kind]}</i>
              <strong className="display">{s.title}</strong>
              <em>
                {s.state === 'locked' ? <Glyph name="lock" /> : s.state === 'done' ? <Glyph name="check" /> : null}
                {s.state === 'done' ? 'Cleared' : s.state === 'current' ? 'Continue' : `Requires: ${s.gate}`}
              </em>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/* ── the rules: a panel from the right ───────────────────────────────────────────────────── */
function RulesPanel({ pathway, onClose }: { pathway: Pathway; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const total = pathway.stages.length;
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="pw-side-wrap" onClick={onClose}>
      <div
        className={`pw-side${total > 7 ? ' is-compact' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pw-side-title"
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="pw-side-shadow" aria-hidden="true">
          <span className="pw-side-skin">
            <i className="k k-facets" />
            <i className="k k-hatch is-fade" />
            <i className="k k-grain" />
          </span>
        </span>
        <header className="pw-side-head">
          <p className="pw-side-kicker display">{pathway.name}</p>
          <h2 className="pw-side-title display" id="pw-side-title">
            Rules
          </h2>
          <button type="button" className="pw-side-close display" onClick={onClose} aria-label="Close the rules">
            <kbd>Esc</kbd>
            Close
          </button>
        </header>
        <ul className="pw-side-rules">
          <li>Stages open one at a time, in order. Each one has a gate: the result that opens it.</li>
          <li>A stage clears when all three of its requirements are met. Your best score counts.</li>
          <li>Battles count only in their own arena. Attempts are limited per stage.</li>
          <li>Clear every stage before the due date to earn the final reward.</li>
        </ul>
        <p className="pw-side-sub display">Gates · {total} stages</p>
        <ol className="pw-side-gates">
          {pathway.stages.map((s, i) => (
            <li key={i} className={`is-${s.state}`}>
              <b className="display">{pad(i + 1)}</b>
              <span>
                {s.title}
                <i>
                  {s.state === 'locked' ? <Glyph name="lock" /> : <Glyph name="check" />}
                  {i === 0 ? s.gate : `Requires: ${s.gate}`}
                </i>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ── the rewards block, bottom-left ──────────────────────────────────────────────────────── */
type RewardsBlockProps = {
  pathway: Pathway;
  avatarKey: string;
  linkRef: (el: HTMLButtonElement | null) => void;
  onAll: () => void;
};

function RewardsBlock({ pathway, avatarKey, linkRef, onAll }: RewardsBlockProps) {
  const done = cleared(pathway);
  const total = pathway.stages.length;
  const fin = finalRewardItem(pathway);
  const next = nextReward(pathway);
  const complete = done === total;
  const shown: RewardItem = next ?? fin;
  const toGo = next ? Math.max(1, next.stage - done) : 0;
  const kind = (r: RewardItem) => `${r.rarity} ${REWARD_KIND_LABEL[r.kind].toLowerCase()}`;
  return (
    <section className={`pw-rewards${complete ? ' is-complete' : ''}`} aria-label="Pathway rewards">
      <div className="pw-reward-all">
        <span className="pw-reward-shadow" aria-hidden="true">
          <span className="pw-reward-all-skin">
            <i className="k k-hatch is-hazard" />
            <i className="k k-halftone" />
            <i className="k k-grain" />
          </span>
        </span>
        <p className="pw-reward-all-line display">
          {complete ? 'Pathway complete' : 'Complete all to get'}
          <b>
            [<em>{done}</em>/{total}]
          </b>
        </p>
        <p className="pw-reward-all-name display">
          <Glyph name="gem" />
          {complete ? `${fin.name} earned` : fin.name}
          <i>— {kind(fin)}</i>
        </p>
      </div>
      <div className="pw-reward-next">
        <span className="pw-reward-shadow" aria-hidden="true">
          <span className="pw-reward-next-skin">
            <i className="k k-facets" />
            <i className="k k-grain" />
          </span>
        </span>
        <p className="pw-reward-more display">
          {next ? (
            <>
              Complete <b>{toGo}</b> more to get
            </>
          ) : (
            <>
              <Glyph name="check" />
              All {pathway.rewards.length} rewards claimed
            </>
          )}
        </p>
        <p className="pw-reward-kind display">{next ? kind(shown) : `Final reward · ${kind(shown)}`}</p>
        <p className="pw-reward-item display">{shown.name}</p>
        <button
          type="button"
          className="pw-reward-link display"
          ref={linkRef}
          onClick={onAll}
          aria-label={`All rewards: ${pathway.name}`}
        >
          <Glyph name="search" />
          All rewards
          <span className="pw-reward-link-chev" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
        <span className="pw-reward-pic" aria-hidden="true">
          <span className="pw-reward-pic-float">
            <RewardArt item={shown} variant="block" avatarKey={avatarKey} className="pw-reward-art" />
          </span>
        </span>
      </div>
    </section>
  );
}

/* ── the page ────────────────────────────────────────────────────────────────────────────── */
/**
 * The page's views form a stack: the map; the COMPLETE FOR REWARDS screen over it; a stage's
 * detail over either. `back` on a detail is the reward that was selected on the rewards screen
 * when GO opened it, so Esc returns there with the selection kept.
 */
type View = { mode: 'map' } | { mode: 'rewards'; initial?: number } | { mode: 'detail'; index: number; back?: number };
/** a screen change in flight: the flash strips ('cut' 2 frames, 'scan' 3) and the --page dip into the rewards screen */

export function Pathways({ avatar }: { avatar: Avatar }) {
  const [pid, setPid] = useState<Pathway['id']>('sales');
  const pathway = PATHWAYS.find((p) => p.id === pid)!;
  const [view, setView] = useState<View>({ mode: 'map' });
  const [run, setRun] = useState(0);
  const [launch, setLaunch] = useState<number | null>(null);
  const [rules, setRules] = useState(false);
  const [flash, setFlash] = useState(1);
  /** the map mounts a frame after the page, so the first frame under the shell's wipe stays light */
  const [mapReady, setMapReady] = useState(false);
  const theme = useDocTheme();
  const phone = useMedia(PHONE);
  const { fx, fy } = useFrameSlack();
  const busy = useRef(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const focus = useRef(Math.max(0, currentIndex(pathway)));
  const rulesBtn = useRef<HTMLButtonElement | null>(null);
  const allBtn = useRef<HTMLButtonElement | null>(null);
  /** what gets keyboard focus once the next view has mounted */
  const refocus = useRef<'panel' | 'all' | null>(null);
  const timers = useRef<number[]>([]);
  const stripsRef = useRef<HTMLDivElement>(null);
  const dipRef = useRef<HTMLElement>(null);
  const dipAnim = useRef<Animation | null>(null);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // the map's panels (the heavy part) mount a frame after the rest of the view, on the first
  // arrival, on the way back and on a switch: the cut to the hero and title is immediate, and the
  // panels arrive from the next frame (+33 ms), as in the reference
  useEffect(() => {
    if (mapReady || view.mode !== 'map') return;
    const r = requestAnimationFrame(() => startTransition(() => setMapReady(true)));
    return () => cancelAnimationFrame(r);
  }, [mapReady, view.mode]);

  const total = pathway.stages.length;
  const words = pathway.name.split(' ');
  const cur = currentIndex(pathway);
  const geos = layoutFor(total, cur);

  // focus lands where the learner left off once the map is back
  useLayoutEffect(() => {
    if (view.mode !== 'map' || !refocus.current) return;
    const el = refocus.current === 'all' ? allBtn.current : buttons.current[focus.current];
    if (!el) return; // the panels mount a frame later: try again then
    refocus.current = null;
    el.focus({ preventScroll: true });
  }, [view, mapReady]);

  /** a locked panel or pip was pressed: the panel (or pip) shakes and the lock rattles */
  const shake = useCallback((el: Element | null | undefined) => {
    const face = el?.closest('.pw-face, .pd-pip, .pw-list-btn') as HTMLElement | null;
    if (!face || reduced()) return;
    face.animate(
      [
        { transform: 'translate3d(0,0,0)' },
        { transform: 'translate3d(calc(var(--u) * -9),0,0)' },
        { transform: 'translate3d(calc(var(--u) * 8),0,0)' },
        { transform: 'translate3d(calc(var(--u) * -6),0,0)' },
        { transform: 'translate3d(calc(var(--u) * 4),0,0)' },
        { transform: 'translate3d(0,0,0)' },
      ],
      { duration: 420, easing: 'ease-out' },
    );
    face.querySelectorAll('.pw-lock, .pd-pip-lock').forEach((lock) =>
      (lock as HTMLElement).animate(
        [{ rotate: '0deg' }, { rotate: '-22deg' }, { rotate: '18deg' }, { rotate: '-12deg' }, { rotate: '6deg' }, { rotate: '0deg' }],
        { duration: 520, easing: 'ease-out' },
      ),
    );
    face.querySelectorAll('.pw-head').forEach((head) => (head as HTMLElement).animate([{ color: 'var(--alert)' }, { color: 'var(--alert)', offset: 0.6 }, {}], { duration: 900 }));
  }, []);

  /*
   * The flash strips and the dip are played straight on their elements (WAAPI), not through React
   * state, and the screen change that follows is a transition: the browser commits the flash to the
   * compositor first, so it runs on time even while the next screen takes its time to mount.
   */
  const flashStrips = useCallback((kind: 'cut' | 'scan') => {
    const box = stripsRef.current;
    if (!box || reduced()) return;
    for (const strip of Array.from(box.children) as HTMLElement[]) {
      strip.getAnimations().forEach((a) => a.cancel());
      strip.animate(STRIP_FRAMES[kind], { duration: kind === 'scan' ? 3 * F : 2 * F });
    }
  }, []);

  /** back onto the map: the strip flash, the hero over-exposed for three frames, the map's own arrival */
  const toMap = useCallback(
    (focusOn: 'panel' | 'all') => {
      refocus.current = focusOn;
      flashStrips('cut');
      setMapReady(false);
      setView({ mode: 'map' });
      setRun((n) => n + 1);
      setFlash((n) => n + 1);
    },
    [flashStrips],
  );

  /**
   * A dip to the page colour over four frames; at full cover `change` mounts the next screen and the
   * cover goes in the commit that mounts it (the rewards screen lifts its own cover from there, §4).
   */
  const dipInto = useCallback((change: () => void) => {
    const el = dipRef.current;
    busy.current = true;
    dipAnim.current?.cancel();
    dipAnim.current = el ? el.animate(DIP_FRAMES, { duration: 4 * F, fill: 'forwards' }) : null;
    later(() => startTransition(change), 4 * F);
    later(() => {
      busy.current = false;
      dipAnim.current?.cancel();
    }, 12 * F);
  }, []);

  // the cover hands over to the new screen in the commit that mounts it, never a frame early
  useLayoutEffect(() => {
    if (view.mode !== 'map') dipAnim.current?.cancel();
  }, [view]);

  /** a panel opens into its detail: a white/heat scan flash of three frames, then a hard cut */
  const openStage = useCallback(
    (i: number) => {
      const stage = pathway.stages[i];
      if (!stage || busy.current) return;
      if (stage.state === 'locked') {
        shake(buttons.current[i]);
        return;
      }
      focus.current = i;
      if (reduced()) {
        setView({ mode: 'detail', index: i });
        return;
      }
      busy.current = true;
      flashStrips('scan');
      startTransition(() => setLaunch(i));
      later(
        () =>
          startTransition(() => {
            setLaunch(null);
            setView({ mode: 'detail', index: i });
          }),
        4 * F,
      );
      later(() => {
        busy.current = false;
      }, 15 * F);
    },
    [pathway, shake, flashStrips],
  );

  const openRewards = useCallback(() => {
    if (busy.current) return;
    if (reduced()) {
      setView({ mode: 'rewards' });
      return;
    }
    // the press: the link's chevrons light for one frame, then the map dips under the page colour
    const link = allBtn.current;
    link?.classList.add('is-press');
    later(() => link?.classList.remove('is-press'), F);
    dipInto(() => setView({ mode: 'rewards' }));
  }, [dipInto]);

  /**
   * GO on the rewards screen: the paying stage's detail, even a locked one (DETAIL shows its locked
   * state). The rewards screen has already pressed GO and dipped to the page colour (§7, frames
   * 0–3), so the detail mounts at once, in a hard cut.
   */
  const goFromRewards = useCallback(
    (stageIndex: number) => {
      if (busy.current || !pathway.stages[stageIndex]) return;
      const back = Math.max(0, pathway.rewards.findIndex((r) => r.stage === stageIndex + 1));
      focus.current = stageIndex;
      setView({ mode: 'detail', index: stageIndex, back });
    },
    [pathway],
  );

  const closeRewards = useCallback(() => {
    if (busy.current) return;
    toMap('all');
  }, [toMap]);

  const closeDetail = useCallback(() => {
    if (view.mode !== 'detail') return;
    if (view.back !== undefined) {
      // the stack: back to the rewards screen, the reward still selected
      const initial = view.back;
      flashStrips('cut');
      startTransition(() => setView({ mode: 'rewards', initial }));
      return;
    }
    toMap('panel');
  }, [view, toMap, flashStrips]);

  const closeRules = useCallback(() => {
    setRules(false);
    window.requestAnimationFrame(() => rulesBtn.current?.focus({ preventScroll: true }));
  }, []);

  const pickStage = useCallback(
    (i: number) => {
      const s = pathway.stages[i];
      if (!s) return;
      if (s.state === 'locked') {
        shake(document.querySelectorAll('.pd-pip')[i]);
        return;
      }
      focus.current = i;
      setView((v) => (v.mode === 'detail' ? { ...v, index: i } : { mode: 'detail', index: i }));
    },
    [pathway, shake],
  );

  const switchPathway = (id: Pathway['id']) => {
    if (id === pid || busy.current) return;
    const p = PATHWAYS.find((x) => x.id === id)!;
    focus.current = Math.max(0, currentIndex(p));
    flashStrips('cut');
    setMapReady(false);
    setPid(id);
    setView({ mode: 'map' });
    setRun((n) => n + 1);
  };

  // keyboard: arrows move between panels (or stages in the detail), Enter opens, Esc backs out.
  // Registered in the capture phase so Esc can be kept from the shell when it only closes something
  // here. The rewards screen handles every key of its own, so the page stands aside while it is up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view.mode === 'rewards') return;
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === 'Escape') {
        if (rules || view.mode === 'detail') {
          // only this page's layer closes: the shell must not also take Esc as "go home"
          e.stopImmediatePropagation();
          e.stopPropagation();
          if (rules) closeRules();
          else if (!busy.current) closeDetail();
        }
        return;
      }
      if (rules || busy.current) return;
      const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
      if (view.mode === 'detail') {
        if (step) {
          e.preventDefault();
          const n = view.index + step;
          if (n >= 0 && n < total) pickStage(n);
        }
        return;
      }
      if (step) {
        e.preventDefault();
        const active = buttons.current.indexOf(document.activeElement as HTMLButtonElement);
        const from = active >= 0 ? active : focus.current - step;
        const n = Math.min(total - 1, Math.max(0, from + step));
        focus.current = n;
        buttons.current[n]?.focus();
      } else if (e.key === 'Enter') {
        // Enter belongs to whatever has focus; with nothing focused it opens the stage in hand
        const a = document.activeElement;
        if (!a || a === document.body) {
          e.preventDefault();
          openStage(focus.current);
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [rules, view, total, closeDetail, closeRules, pickStage, openStage]);

  const lead = leadRoute(geos, cur >= 0 ? cur : total - 1, fy);
  const lx = Math.min(...lead.map((p) => p[0])) - 6;
  const ly = Math.min(...lead.map((p) => p[1])) - 6;
  const lw = Math.max(...lead.map((p) => p[0])) - lx + 6;
  const lh = Math.max(...lead.map((p) => p[1])) - ly + 6;
  const leadEnd = lead[lead.length - 1]!;

  const away = view.mode !== 'map';
  const frame = { '--fx': fx, '--fy': fy } as CSSProperties;

  return (
    <div className={`pw is-${view.mode}${run === 0 ? ' is-first' : ''}`} data-view={view.mode} style={frame}>
      <ArtDefs />
      <PathBackdrop />

      {/* the avatar, cropped by a leaning edge, with the burnt-orange band behind it; it stays put
          across sub-tab switches (keyed on the avatar only) and is hidden, not unmounted, away from the map */}
      <div className={`pw-hero${away ? ' is-away' : ''}`} key={`hero-${avatar.key}`} aria-hidden="true">
        <div className="pw-hero-clip">
          <i className="pw-hero-light">
            <i className="k k-facets" />
            <i className="k k-halftone" />
          </i>
          <i className="pw-hero-band">
            <i className="k k-hatch" />
          </i>
          <i className="pw-hero-band is-thin" />
          <Hero avatar={avatar} theme={theme} flash={flash} />
          <i className="pw-hero-shade" />
        </div>
        <i className="pw-hero-edge" />
      </div>

      {view.mode === 'map' && (
        <>
          <nav className="pw-tabs" aria-label="Your pathways">
            {PATHWAYS.map((p, i) => {
              const c = cleared(p);
              const n = p.stages.length;
              const all = c === n;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`pw-tab${p.id === pid ? ' is-on' : ''}${all ? ' is-all' : ''}`}
                  style={{ '--i': i } as CSSProperties}
                  aria-pressed={p.id === pid}
                  onClick={() => switchPathway(p.id)}
                >
                  <span className="pw-tab-name display">{p.name.split(' ')[0]}</span>
                  {p.name.includes(' ') && <span className="pw-tab-rest display">{p.name.split(' ').slice(1).join(' ')}</span>}
                  {all ? (
                    <b className="pw-tab-done display">
                      <Glyph name="check" />
                      Done
                    </b>
                  ) : (
                    <b className="pw-tab-count display" aria-label={`stage ${Math.max(1, currentIndex(p) + 1)} of ${n}`}>
                      {Math.max(1, currentIndex(p) + 1)}
                      <i>/{n}</i>
                    </b>
                  )}
                  <span className="pw-tab-pips" aria-hidden="true">
                    {p.stages.map((s, k) => (
                      <i key={k} className={`is-${s.state}`} />
                    ))}
                  </span>
                </button>
              );
            })}
          </nav>

          <header className="pw-title-block" key={`title-${pid}-${run}`}>
            <div className="pw-title-row">
              <h1 className={`pw-title display${pathway.name.length > 16 ? ' is-long' : ''}`}>
                <span className="pw-title-a">{words[0]}</span> <span className="pw-title-b">{words.slice(1).join(' ')}</span>
              </h1>
              <div className="pw-metas">
                <button type="button" className="pw-meta is-rules display" ref={rulesBtn} onClick={() => setRules(true)}>
                  <Glyph name="info" />
                  Rules
                </button>
                <Countdown key={pid} ms={pathway.dueIn} />
              </div>
            </div>
            <p className="pw-assigned">
              <i className="pw-accent" aria-hidden="true" />
              Assigned by <b>{pathway.assignedBy}</b>
              <span className="pw-dot" aria-hidden="true" />
              Team <b>{pathway.team}</b>
            </p>
          </header>

          {lead.length > 1 && (
            <span
              className="pw-lead"
              key={`lead-${pid}-${run}`}
              style={{ '--lx': lx, '--ly': ly, '--lw': lw, '--lh': lh } as CSSProperties}
              aria-hidden="true"
            >
              <span className="pw-lead-reveal">
                <svg viewBox={`${lx} ${ly} ${lw} ${lh}`} preserveAspectRatio="none">
                  <polyline className="pw-lead-line" points={lead.map((p) => p.join(',')).join(' ')} />
                  <rect className="pw-lead-node" x={ACCENT.x + ACCENT.w - 3} y={ACCENT.y} width="6" height="7" />
                  <g className="pw-lead-end">
                    <rect className="pw-lead-node is-end" x={leadEnd[0] - 4} y={leadEnd[1] - 4} width="8" height="8" />
                  </g>
                </svg>
              </span>
            </span>
          )}

          <div className="pw-map-wrap" key={`map-${pid}-${run}`}>
            {mapReady &&
              (phone ? (
                <StageList
                  pathway={pathway}
                  onOpen={openStage}
                  setRef={(i, el) => {
                    buttons.current[i] = el;
                  }}
                />
              ) : (
                <PathMap
                  pathway={pathway}
                  launch={launch}
                  onOpen={openStage}
                  onFocusPanel={(i) => (focus.current = i)}
                  setRef={(i, el) => {
                    buttons.current[i] = el;
                  }}
                />
              ))}
          </div>

          <RewardsBlock
            key={`rewards-${pid}-${run}`}
            pathway={pathway}
            avatarKey={avatar.key}
            linkRef={(el) => {
              allBtn.current = el;
            }}
            onAll={openRewards}
          />
        </>
      )}

      {view.mode === 'rewards' && (
        <div className="pw-rw-host">
          <RewardsScreen
            key={`rw-${pid}`}
            pathway={pathway}
            avatarKey={avatar.key}
            initial={view.initial}
            onBack={closeRewards}
            onGo={goFromRewards}
          />
        </div>
      )}

      {view.mode === 'detail' && (
        <>
          <span className="pw-details-chip display">Details</span>
          <StageDetail pathway={pathway} index={view.index} onPick={pickStage} />
        </>
      )}

      <i className="pw-dip" ref={dipRef} aria-hidden="true" />

      <div className="pw-strips" ref={stripsRef} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      {rules && view.mode === 'map' && <RulesPanel pathway={pathway} onClose={closeRules} />}
    </div>
  );
}
