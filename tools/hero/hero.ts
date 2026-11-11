/**
 * Hero still: one avatar from HOME's painterly rig, on a transparent canvas, for PATHWAYS.
 *
 * The rig (src/stage/HeroStage.ts) is imported as it is — HOME depends on it, so it is never
 * changed for this. The stage runs with reduced motion, which holds the idle at its first frame
 * and keeps the head still: every still of an avatar is the same pose, so the dark and the light
 * render share one silhouette (and one sticker outline).
 *
 * Query parameters (all optional):
 *   key     clinician | strategist | analyst
 *   theme   dark | light                       the rig's lighting row
 *   w, h    canvas size in CSS px              render at 2× of the displayed box
 *   top     head-top as a fraction of h        (HeroStage Framing)
 *   bottom  soles as a fraction of h           (> 1: cropped by the lower edge)
 *   x       the figure's centre, fraction of w
 *   yaw     resting turn, radians              (negative turns the figure toward screen-right)
 *   t       seconds into the idle clip         the pose the still is taken in
 *
 * When it is ready, `window.__ready` is true and `window.__grab('dark' | 'light')` returns the
 * canvas as a PNG data URL in that lighting, rendered in the same task so the drawing buffer is
 * still there.
 */
import { HeroStage, type StageTheme } from '../../src/stage/HeroStage';

const q = new URLSearchParams(location.search);
const num = (name: string, fallback: number) => {
  const v = Number(q.get(name));
  return q.has(name) && Number.isFinite(v) ? v : fallback;
};

const key = q.get('key') ?? 'clinician';
const theme: StageTheme = q.get('theme') === 'light' ? 'light' : 'dark';
const w = num('w', 1400);
const h = num('h', 2200);
const framing = { top: num('top', 0.06), bottom: num('bottom', 1.3), x: num('x', 0.42) };
const yaw = num('yaw', -0.14);

const canvas = document.getElementById('stage') as HTMLCanvasElement;
canvas.style.width = `${w}px`;
canvas.style.height = `${h}px`;

type Internals = { renderer: { render: (s: unknown, c: unknown) => void }; scene: unknown; camera: unknown };
type ToolWindow = Window & { __ready?: boolean; __error?: string; __grab?: (look?: StageTheme) => string; __stage?: HeroStage };
const win = window as ToolWindow;

const stage = new HeroStage(canvas, { url: `/models/${key}.glb`, theme, framing, yaw, reducedMotion: true });
win.__stage = stage;

/** the rig's private parts the tool reaches for: the still is posed at `t` seconds into the idle */
type Posable = { mixer?: { update: (dt: number) => void }; actions: { idle?: { time: number; paused: boolean } } };

stage
  .load()
  .then(() => {
    const s = stage as unknown as Posable;
    const idle = s.actions.idle;
    if (idle) {
      idle.paused = true;
      idle.time = num('t', 0);
      s.mixer?.update(0);
    }
  })
  // the camera's intro push settles in 1.6 s
  .then(() => new Promise((r) => setTimeout(r, 2200)))
  .then(() => {
    // one load serves both lighting rows: the theme is switched on the live stage
    win.__grab = (look?: StageTheme) => {
      if (look) stage.setTheme(look);
      const s = stage as unknown as Internals;
      s.renderer.render(s.scene, s.camera);
      return canvas.toDataURL('image/png');
    };
    win.__ready = true;
  })
  .catch((err: unknown) => {
    win.__error = String(err);
    console.error('hero still failed', err);
  });
