import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Check, ChevronLeft, ChevronRight, CircleCheck, CirclePlay, Flag, GitBranch, Lock, Play, RotateCcw, X } from 'lucide-react';
import { gsap, splitReveal, rise, reduced } from '../motion';
import { Btn, Chip, KIND_ICON, STATE_META, Segments, StateTag, TYPE_ICON, cx } from '../ui';
import { PATHWAYS, PRODUCT_KINDS, STAGE_TYPES, currentStageOf, doneCount, pathwayOf, type PathKey, type Pathway } from '../data';
import { launch, store } from '../store';
import { Stage25, type StageApi } from '../world/Stage25';
import { loadWorld, nearestIndex, slotsFor, type SlotId, type WorldView } from '../world/scene';
import { objectKeyFor, useObjects } from '../world/objects';
import { ObjectSprite } from '../world/ObjectSprite';
import './journey.css';

const isKey = (k: string | null): k is PathKey => k === 'sales' || k === 'product' || k === 'lead';
/** the slices that give each emblem its thickness */
const EDGE = [1, 2, 3, 4, 5, 6, 7, 8];

export default function Journey({ q }: { q: URLSearchParams }) {
  const initial: PathKey = isKey(q.get('path')) ? (q.get('path') as PathKey) : 'sales';
  const [view, setView] = useState<WorldView | null>(null);
  const [key, setKey] = useState<PathKey>(initial);
  const [stageN, setStageN] = useState<number>(() => Number(q.get('stage')) || currentStageOf(pathwayOf(initial)).n);
  const [panel, setPanel] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const api = useRef<StageApi>(null);
  const chips = useRef(new Map<SlotId, HTMLElement>());
  const arrived = useRef(false);
  // realistic 3D objects replace the medallions only once every one of them has loaded
  const objs = useObjects();

  const path = pathwayOf(key);
  // every stage stands on the one line, in order (the owner asked for a single line, no side branches)
  const slots = useMemo(() => slotsFor(path.stages.map((s) => s.type), false), [path]);
  const stage = path.stages[stageN - 1] ?? path.stages[0]!;

  useEffect(() => { let alive = true; loadWorld('learner').then((v) => { if (alive) setView(v); }); return () => { alive = false; }; }, []);

  // stand each emblem on its pedestal whenever the camera or the parallax moves
  const placeAll = () => {
    const a = api.current;
    if (!a || !view) return;
    const p = { x: 0, y: 0 }, qx = { x: 0, y: 0 }, qy = { x: 0, y: 0 };
    chips.current.forEach((el, id) => {
      const s = view.slots[id];
      if (!s) return;
      a.toScreen(s.cx, s.cy, p);
      a.toScreen(s.cx + s.rx, s.cy, qx);
      a.toScreen(s.cx, s.cy + s.ry, qy);
      const rx = Math.max(8, qx.x - p.x), ry = Math.max(3, qy.y - p.y);
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      el.style.setProperty('--rx', `${rx.toFixed(1)}px`);
      el.style.setProperty('--ry', `${ry.toFixed(1)}px`);
      // how far the camera looks down on this pedestal, for the emblem's lean
      el.style.setProperty('--tilt', `${(Math.asin(Math.min(0.9, ry / rx)) * 57.3 * 0.8).toFixed(1)}deg`);
      el.style.zIndex = String(Math.round(s.cy * 100));
    });
  };
  useEffect(() => {
    if (!view || !api.current) return;
    const off = api.current.subscribe(placeAll);
    placeAll();
    return () => { off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, key]);
  const reg = (id: SlotId) => (el: HTMLElement | null) => {
    if (el) { chips.current.set(id, el); placeAll(); } else chips.current.delete(id);
  };

  // soft pan-and-zoom along the line: the chosen stage sits left of centre in the space the panel leaves,
  // and the camera keeps the gate (the goal) in view whenever it fits
  const focus = (n: number, opts: { duration?: number; z?: number; open?: boolean; ease?: string } = {}) => {
    const a = api.current;
    if (!a || !view) return;
    const s = view.slots[slots[n - 1] ?? 'slot_1'] ?? view.slots.slot_1;
    const { w } = a.size();
    const isOpen = opts.open ?? panel;
    const panelW = isOpen ? Math.min(430, Math.max(360, w * 0.27)) + 64 : 0;
    const freeW = w - panelW;
    const z = opts.z ?? (isOpen ? 1.3 : 1.2);
    const toGate = (view.gate.x - s.cx) * a.frameSize().w * z;
    let at = freeW * 0.42;
    if (toGate > 0 && toGate < freeW * 0.62) at = Math.max(freeW * 0.24, freeW * 0.9 - toGate);
    a.glide({ fx: s.cx, fy: s.cy - 0.03, z, ax: at / w, ay: 0.6 }, { duration: opts.duration ?? 1.6, ease: opts.ease });
  };

  useLayoutEffect(() => {
    if (!view || arrived.current) return;
    arrived.current = true;
    const a = api.current;
    if (a) {
      // arrival: start at the first pedestal, then dolly slowly along the line to where Ahmed is
      focus(1, { duration: 0 });
      window.setTimeout(() => focus(stageN, { duration: reduced() ? 0 : 3.6, ease: 'power2.inOut' }), 120);
    }
    const q2 = gsap.utils.selector(root);
    splitReveal(q2('.jhead__title')[0] ?? null, { by: 'words', stagger: 0.08, delay: 0.4 });
    if (!reduced()) {
      rise(q2('.jhead .eyebrow, .jhead__prog, .jpaths'), { delay: 0.6, stagger: 0.08 });
      gsap.fromTo(q2('.c25'), { opacity: 0 }, { opacity: 1, duration: 0.9, stagger: 0.12, delay: 1.0 });
      gsap.fromTo(q2('.stagep'), { opacity: 0, x: 50, filter: 'blur(12px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 1.2, ease: 'onyx', delay: 1.4, clearProps: 'filter,transform' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const select = (n: number) => {
    const next = Math.min(path.stages.length, Math.max(1, n));
    setStageN(next);
    setPanel(true);
    focus(next, { open: true });
  };
  const closePanel = () => { setPanel(false); focus(stageN, { open: false, duration: 1.3 }); };

  // switching pathway: the chips cross-fade on the same path
  const switchTo = (k: PathKey) => {
    if (k === key) return;
    const p = pathwayOf(k);
    const n = currentStageOf(p).n;
    const go = () => {
      setKey(k);
      setStageN(n);
      setPanel(true);
    };
    const els = root.current?.querySelectorAll('.c25');
    if (els?.length && !reduced()) gsap.to(els, { opacity: 0, duration: 0.3, stagger: 0.02, onComplete: go });
    else go();
  };
  useLayoutEffect(() => {
    if (!view || !arrived.current) return;
    focus(stageN, { open: true, duration: 1.6 });
    if (!reduced()) {
      const q2 = gsap.utils.selector(root);
      gsap.fromTo(q2('.c25__in'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, delay: 0.2, ease: 'onyx', clearProps: 'transform' });
      splitReveal(q2('.jhead__title')[0] ?? null, { by: 'words', stagger: 0.08 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // panel contents slide softly on each new stage
  const panelBody = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!panelBody.current || reduced()) return;
    gsap.fromTo(panelBody.current.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.035, ease: 'onyx', clearProps: 'transform' });
  }, [key, stageN, panel]);

  // keyboard: arrows walk the path, Escape closes the panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (store.get().launch) return;
      const t = e.target instanceof Element ? e.target : null;
      if (t?.closest('input, textarea, [role="dialog"]')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); select(stageN + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); select(stageN - 1); }
      else if (e.key === 'Escape' && panel) { e.preventDefault(); closePanel(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // the pulse runs from the foot of the path to where Ahmed is
  const pulse = useMemo(() => {
    if (!view) return null;
    const c = currentStageOf(path);
    const s = view.slots[slots[c.n - 1] ?? 'slot_1'] ?? view.slots.slot_1;
    return { from: 0, to: nearestIndex(view.path, s.cx, s.cy) };
  }, [view, path, slots]);

  const startStage = () => launch({
    eyebrow: `Stage ${stage.n} of ${path.stages.length} · ${path.name}`,
    title: stage.name,
    detail: `${PRODUCT_KINDS[stage.product.kind].label}: ${stage.product.name}. ${stage.pass}`,
    steps: stage.product.kind === 'arena'
      ? [`Loading the ${stage.product.name} arena`, 'Matching you with a Gold-tier opponent', 'Round 1 is ready']
      : [`Opening ${stage.product.name}`, 'Restoring your place', 'Ready'],
  });
  const cur = currentStageOf(path);

  return (
    <div ref={root} className="page journey">
      {view ? (
        <Stage25 view={view} apiRef={api} pulse={pulse}>
          {path.stages.map((s, i) => {
            const id = slots[i]!;
            const SM = STATE_META[s.state];
            // one glyph per emblem: the state when it is settled, what you will do when it is yours
            const Glyph = s.state === 'done' ? Check : s.state === 'locked' ? Lock : s.state === 'optional' ? GitBranch : TYPE_ICON[s.type];
            const sel = s.n === stageN && panel;
            return (
              <div key={`${key}-${s.n}`} ref={reg(id)} className={cx('c25', `c25--${s.state}`, sel && 'is-sel')} style={{ '--n': i } as CSSProperties}>
                <div className="c25__in">
                  <span className="c25__pool" aria-hidden />
                  <button type="button" className="c25__btn" aria-pressed={sel} aria-label={`Stage ${s.n}, ${s.name}, ${s.state === 'current' ? 'you are here' : SM.text}`} onClick={() => select(s.n)}>
                    {objs ? (
                      <ObjectSprite
                        entry={objs[objectKeyFor(s.type, s.product.kind)]}
                        file={s.state === 'current' ? 'learner_spin' : s.state === 'done' ? 'learner_done' : s.state === 'locked' ? 'learner_stone' : 'learner_lit'}
                        className="c25__obj"
                      />
                    ) : (
                      <span className="c25__coin" aria-hidden>
                        <span className="c25__spin">
                          {EDGE.map((k) => <span key={k} className="c25__edge" style={{ '--k': k } as CSSProperties} />)}
                          <span className="c25__face"><Glyph strokeWidth={2.3} /></span>
                        </span>
                      </span>
                    )}
                    <span className="c25__name">{s.state === 'current' && <span className="c25__here"><CirclePlay /> You are here</span>}{s.name}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </Stage25>
      ) : (
        <div className="jload glass" role="status"><p className="jload__title">Lighting the path</p></div>
      )}
      <div className="jshade" aria-hidden />

      <section className="jhead" aria-labelledby="jtitle">
        <p className="eyebrow">My journey</p>
        <h1 id="jtitle" className="jhead__title">{path.name}</h1>
        <p className="jhead__prog"><Segments states={path.stages.map((s) => s.state)} /> {doneCount(path)} of {path.stages.length} stages done</p>
        <div className="jpaths" role="group" aria-label="Your pathways">
          <p className="jpaths__label">Your pathways</p>
          {PATHWAYS.map((p) => (
            <button key={p.key} type="button" className="jpath glass g-lit" aria-pressed={p.key === key} onClick={() => switchTo(p.key)}>
              <span className="jpath__top">
                {p.key === key && <Flag size={13} className="jpath__on" aria-label="Showing" />}
                <span className="jpath__name">{p.name}</span>
              </span>
              <span className="jpath__meta">{doneCount(p) > 0 ? `Stage ${currentStageOf(p).n} of ${p.stages.length}` : 'Not started'}</span>
            </button>
          ))}
        </div>
      </section>

      {panel && (
        <aside className="stagep glass" aria-label={`Stage ${stage.n}: ${stage.name}`} aria-live="polite">
          <div ref={panelBody} className="stagep__scroll">
            <div className="stagep__top">
              <span className="stagep__pos">Stage {stage.n} of {path.stages.length}</span>
              <StateTag state={stage.state} />
              <span className="stagep__nav">
                <button type="button" className="icon-btn" aria-label="Previous stage" disabled={stage.n <= 1} onClick={() => select(stage.n - 1)}><ChevronLeft size={18} /></button>
                <button type="button" className="icon-btn" aria-label="Next stage" disabled={stage.n >= path.stages.length} onClick={() => select(stage.n + 1)}><ChevronRight size={18} /></button>
                <button type="button" className="icon-btn" aria-label="Close and see the whole path" onClick={closePanel}><X size={17} /></button>
              </span>
            </div>
            <h2 className="stagep__title">{stage.name}</h2>
            <StageType stage={stage} />
            <p className="stagep__asks">{stage.asks}</p>
            <Gate path={path} n={stage.n} />
            <div>
              <h3 className="stagep__sec-title">{stage.state === 'done' ? 'You earned' : 'Rewards'}</h3>
              <div className="stagep__rewards">{stage.rewards.map((r) => <Chip key={r} tone={r.startsWith('+') ? 'neutral' : 'ember'}>{r}</Chip>)}</div>
            </div>
            <details>
              <summary>Stage details</summary>
              <dl className="facts">{stage.facts.map((f) => (<div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>))}</dl>
            </details>
          </div>
          <div className="stagep__cta">
            {stage.state === 'current' ? (
              <Btn kind="primary" size="lg" icon={<Play fill="currentColor" />} onClick={startStage}>{doneCount(path) > 0 ? 'Start' : 'Begin'} stage {stage.n}</Btn>
            ) : (
              <>
                {stage.state === 'done' && <Btn kind="glass" icon={<RotateCcw />} onClick={startStage}>Replay</Btn>}
                <Btn kind="primary" icon={<Flag />} onClick={() => select(cur.n)}>Go to stage {cur.n}, your next step</Btn>
              </>
            )}
          </div>
        </aside>
      )}

      <p className="jhint" aria-hidden><kbd>←</kbd><kbd>→</kbd> move along the path {panel && <><kbd>Esc</kbd> see the whole path</>}</p>
    </div>
  );
}

function StageType({ stage }: { stage: Pathway['stages'][number] }) {
  const TI = TYPE_ICON[stage.type];
  const KI = KIND_ICON[stage.product.kind];
  return (
    <p className="stagep__type">
      <TI size={16} /> {STAGE_TYPES[stage.type].label}
      <span className="sep" />
      <KI size={16} /> {stage.product.kind === 'arena' ? `${stage.product.name} arena` : `${PRODUCT_KINDS[stage.product.kind].label}: ${stage.product.name}`}
    </p>
  );
}

function Gate({ path, n }: { path: Pathway; n: number }) {
  const s = path.stages[n - 1]!;
  const next = path.stages[n];
  if (s.state === 'done') {
    return (
      <div className="stagep__gate is-done">
        <span className="stagep__gate-icon"><CircleCheck size={18} /></span>
        <div><h3>Passed</h3><p>{s.result}.</p></div>
      </div>
    );
  }
  if (s.state === 'locked') {
    return (
      <div className="stagep__gate is-locked">
        <span className="stagep__gate-icon"><Lock size={17} /></span>
        <div><h3>How to unlock it</h3><p>{s.unlock}</p><p>Then, to pass it: {s.pass.charAt(0).toLowerCase() + s.pass.slice(1)}</p></div>
      </div>
    );
  }
  if (s.state === 'optional') {
    return (
      <div className="stagep__gate is-optional">
        <span className="stagep__gate-icon"><GitBranch size={17} /></span>
        <div><h3>Only if needed</h3><p>{s.unlock}</p><p>{s.pass}</p></div>
      </div>
    );
  }
  return (
    <div className="stagep__gate">
      <span className="stagep__gate-icon"><Flag size={17} /></span>
      <div><h3>To pass</h3><p>{s.pass}</p>{next && <p>Passing unlocks stage {next.n}, {next.name}.</p>}</div>
    </div>
  );
}
