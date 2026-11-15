import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react';
import { ArrowUp, ChevronLeft, ChevronRight, Gift, Play, RotateCcw } from 'lucide-react';
import { Brush, Splatter } from '../fx/Brush';
import { clunk } from '../fx/sound';
import { pathway, stages, TYPE_LABEL, type Stage } from '../data';
import { stageSpec, TapeCover } from '../covers/TapeCover';
import { startTape } from '../store';
import { Shelf } from '../shelf/Shelf';
import { Hint } from '../shell/Shell';
import { rise, StateTag, stageState } from '../shell/ui';

const pad = (n: number) => String(n).padStart(2, '0');
const cur = stages.find((s) => s.status === 'current')!;
const CUR = cur.n - 1;

function playStage(s: Stage, from: string) {
  clunk('play');
  startTape({ n: s.n, title: s.title, product: s.type === 'compete' ? `The ${s.product} arena` : s.product, kind: `${TYPE_LABEL[s.type]} · ${s.productKind}`, from });
}

export function Journey({ params }: { params: URLSearchParams }) {
  const t = params.get('t') || '';
  const [sel, setSel] = useState(() => {
    const n = Number(t);
    return n >= 1 && n <= stages.length ? n - 1 : CUR;
  });

  useEffect(() => {
    const n = Number(t);
    if (n >= 1 && n <= stages.length) setSel(n - 1);
    if (t === 'shelf' || t === 'sleeves') {
      const id = window.setTimeout(() => document.getElementById(t)?.scrollIntoView({ block: 'start' }), 80);
      return () => window.clearTimeout(id);
    }
  }, [t]);

  const pick = (i: number) => {
    setSel(i);
    clunk('tick');
  };
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main className="tp-page tp-jr">
      <header className="tp-jr__head tp-rise" style={rise(0)}>
        <div className="tp-jr__titles">
          <p className="tp-kicker">My journey · assigned by Northwind Pharma</p>
          <div className="tp-jr__titlewrap">
            <Brush as="h1" text={pathway.name} className="tp-jr__title" />
            <Splatter seed={3} size={0.7} className="tp-jr__splat" />
          </div>
        </div>
        <div className="tp-jr__sum">
          <p className="tp-jr__count">
            <b>
              {pathway.done} of {pathway.tapes} stages done.
            </b>{' '}
            You are on stage {cur.n}, {cur.title}.
          </p>
          <p className="tp-jr__browse">
            Pick any tape to see what it takes, or browse them{' '}
            <a
              href="#shelf"
              onClick={(e) => {
                e.preventDefault();
                jump('shelf');
              }}
            >
              on the shelf
            </a>{' '}
            or{' '}
            <a
              href="#sleeves"
              onClick={(e) => {
                e.preventDefault();
                jump('sleeves');
              }}
            >
              one sleeve at a time
            </a>
          </p>
        </div>
      </header>

      <section className="tp-path tp-rise" style={rise(1)} aria-label="Your path, stage by stage. Choose a stage to see its details.">
        <ol className="tp-path__row">
          {stages.map((s, i) => {
            const ss = stageState(s);
            return (
              <li key={s.id} className={`tp-path__i is-${s.status} ${s.type === 'branch' ? 'is-branch' : ''} ${i === sel ? 'is-sel' : ''}`}>
                {s.status === 'current' && (
                  <span className="tp-path__here" aria-hidden>
                    You are here
                  </span>
                )}
                <button className="tp-path__btn" onClick={() => pick(i)} aria-pressed={i === sel} aria-label={`Stage ${s.n}, ${s.title}. ${ss.word}.`}>
                  <span className="tp-path__cover">
                    <TapeCover spec={stageSpec(s)} locked={s.status === 'locked'} label="" />
                  </span>
                  <span className="tp-path__n">
                    {pad(s.n)} · {TYPE_LABEL[s.type]}
                  </span>
                  <span className="tp-path__t">{s.title}</span>
                  <StateTag kind={ss.kind}>{s.status === 'done' ? `Done · ${s.result}` : ss.word}</StateTag>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <AnimatePresence mode="wait" initial={false}>
        <SleevePanel key={sel} s={stages[sel]!} onCurrent={() => pick(CUR)} />
      </AnimatePresence>

      <ShelfSection
        onShow={(i) => {
          setSel(i);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <section id="sleeves" className="tp-sleeves" aria-labelledby="sleeves-h">
        <header className="tp-sleeves__head">
          <h2 id="sleeves-h" className="tp-h2">
            Every sleeve
          </h2>
          <p>The full story of each tape, one per screen, in the order you play them.</p>
        </header>
        {stages.map((s, i) => (
          <TapeSection key={s.id} s={s} i={i} />
        ))}
        <div className="tp-sleeves__end">
          <button className="tp-btn tp-btn--secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp size={16} aria-hidden /> Back to the path
          </button>
        </div>
      </section>
      <Rail />
    </main>
  );
}

/** The back of the selected tape's sleeve: what it is, what clearing it takes, and the one action. */
function SleevePanel({ s, onCurrent }: { s: Stage; onCurrent: () => void }) {
  const next = stages[s.n];
  const locked = s.status === 'locked';
  const heading = s.status === 'done' ? 'How you cleared it' : s.status === 'current' ? 'To clear this stage' : s.type === 'branch' ? 'When it plays' : 'How to unlock it';
  return (
    <motion.section
      className={`tp-sp is-${s.status}`}
      aria-label={`Stage ${s.n} details`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
    >
      <div className="tp-sp__main">
        <p className="tp-sp__k">
          Stage {s.n} of {stages.length} · {TYPE_LABEL[s.type]} · {s.productKind} · about {s.minutes} min
        </p>
        <Brush as="h2" text={s.title} className="tp-sp__title" glow={locked ? 'none' : 'orange'} />
        <p className="tp-sp__syn">{s.synopsis}</p>
      </div>
      <div className="tp-sp__gate">
        <h3 className="tp-sp__h">{heading}</h3>
        <p className="tp-sp__rule">{locked ? s.lockNote : s.gate.text}</p>
        {s.status === 'current' && (
          <div className="tp-sp__prog">
            <span className="tp-meter tp-meter--one" role="img" aria-label="0 of 1 wins">
              <i className="is-next" />
            </span>
            <span>{s.progress}</span>
          </div>
        )}
        {locked && s.type !== 'branch' && <p className="tp-sp__once">Once it opens: {s.gate.text}</p>}
        {next && s.status !== 'locked' && (
          <p className="tp-sp__next">
            Then: stage {next.n}, {next.title}
          </p>
        )}
        <p className="tp-sp__reward">
          <Gift size={16} aria-hidden /> {s.status === 'done' ? 'You earned' : 'Reward'}: {s.reward}
        </p>
      </div>
      <div className="tp-sp__act">
        {s.status === 'current' && (
          <button className="tp-btn tp-btn--primary tp-btn--hero tp-btn--block" onClick={() => playStage(s, 'My journey')}>
            <span className="tp-btn__disc" aria-hidden>
              <Play size={20} fill="currentColor" strokeWidth={0} />
            </span>
            <span className="tp-btn__two">
              <b>
                Play tape {s.n} · Start {s.title}
              </b>
              <small>
                {s.product} arena · about {s.minutes} min
              </small>
            </span>
          </button>
        )}
        {s.status === 'done' && (
          <>
            <p className="tp-sp__when">
              <b>Done on {s.date.charAt(0) + s.date.slice(1).toLowerCase()}, scored {s.result}.</b> Replaying does not change your score.
            </p>
            <button className="tp-btn tp-btn--secondary" onClick={() => playStage(s, 'My journey')}>
              <RotateCcw size={16} aria-hidden /> Replay tape {s.n}
            </button>
          </>
        )}
        {locked && (
          <>
            <p className="tp-sp__when">
              <b>{s.type === 'branch' ? 'Only if needed.' : 'Locked.'}</b> {s.type === 'branch' ? 'Most learners never need this tape.' : 'Still in its wrapper: it opens on its own when the rule is met.'}
            </p>
            <button className="tp-btn tp-btn--quiet" onClick={onCurrent}>
              Back to your current stage ({cur.n})
            </button>
          </>
        )}
      </div>
    </motion.section>
  );
}

function ShelfSection({ onShow }: { onShow: (i: number) => void }) {
  const specs = useMemo(() => stages.map(stageSpec), []);
  const locked = useMemo(() => stages.map((s) => s.status === 'locked'), []);
  const [focus, setFocus] = useState(CUR);
  const [pulled, setPulled] = useState<number | null>(CUR);
  const ref = useRef<HTMLElement>(null);

  const step = (d: number) => {
    const f = Math.max(0, Math.min(stages.length - 1, (pulled ?? focus) + d));
    setFocus(f);
    setPulled(f);
    clunk('tick');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.5 || r.bottom < window.innerHeight * 0.5) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      } else if (e.key === 'Escape') setPulled(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const sel = pulled !== null ? stages[pulled]! : null;
  const ss = sel ? stageState(sel) : null;
  return (
    <section ref={ref} className="tp-shelf" id="shelf" aria-labelledby="shelf-h">
      <div className="tp-shelf__title">
        <Brush as="h2" text={'The\nShelf'} className="tp-shelf__brush" />
        <Splatter seed={8} className="tp-shelf__sp" />
        <p className="tp-shelf__sub" id="shelf-h">
          All {stages.length} tapes of {pathway.name}, in order.
        </p>
      </div>
      <Shelf specs={specs} locked={locked} focus={focus} pulled={pulled} onFocus={setFocus} onPull={setPulled} />
      <AnimatePresence>
        {sel && ss && (
          <motion.aside key={sel.id} className="tp-shelf__card" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.22 }} aria-live="polite">
            <p className="tp-sp__k">
              Stage {sel.n} of {stages.length} · {TYPE_LABEL[sel.type]}
            </p>
            <Brush text={sel.title} className="tp-shelf__cardtitle" glow={sel.status === 'locked' ? 'none' : 'orange'} />
            <StateTag kind={ss.kind}>{sel.status === 'done' ? `Done · scored ${sel.result}` : ss.word}</StateTag>
            <p className="tp-shelf__cardrule">{sel.status === 'locked' ? sel.lockNote : sel.gate.text}</p>
            <div className="tp-shelf__cardact">
              {sel.status === 'current' && (
                <button className="tp-btn tp-btn--primary" onClick={() => playStage(sel, 'My journey')}>
                  <Play size={16} fill="currentColor" strokeWidth={0} aria-hidden /> Play tape {sel.n} · Start {sel.title}
                </button>
              )}
              <button className="tp-btn tp-btn--quiet" onClick={() => onShow(sel.n - 1)}>
                Show it on the path
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <div className="tp-shelf__controls">
        <button className="tp-shelf__arrow" onClick={() => step(-1)} aria-label="Previous tape" disabled={(pulled ?? focus) === 0}>
          <ChevronLeft size={20} />
        </button>
        <Hint id="shelf-drag" className="tp-shelf__hint">
          Drag the shelf sideways to browse. Click a tape to take it out.
        </Hint>
        <button className="tp-shelf__arrow" onClick={() => step(1)} aria-label="Next tape" disabled={(pulled ?? focus) === stages.length - 1}>
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}

function TapeSection({ s, i }: { s: Stage; i: number }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [70, -70]);
  const rot = useTransform(scrollYProgress, [0, 0.5, 1], [i % 2 ? 3 : -3, 0, i % 2 ? -1.5 : 1.5]);
  const spec = useMemo(() => stageSpec(s), [s]);
  const locked = s.status === 'locked';
  const flip = i % 2 === 1;
  const ss = stageState(s);
  return (
    <section ref={ref} id={`tape-${s.n}`} data-tape={i} className={`tp-tape is-${s.status} ${flip ? 'is-flip' : ''}`}>
      <motion.div className="tp-tape__media" style={{ y, rotate: rot }}>
        <div className="tp-tape__coverwrap">
          <TapeCover spec={spec} locked={locked} />
        </div>
        <div className="tp-tape__osd" aria-hidden>
          <span>{s.status === 'current' ? 'PLAY ▶' : s.status === 'done' ? 'PLAYED' : 'SEALED'}</span>
          <span>{s.date || '-- ---'}</span>
        </div>
      </motion.div>
      <div className="tp-tape__info">
        <p className="tp-sp__k">
          Stage {s.n} of {stages.length} · {TYPE_LABEL[s.type]} · about {s.minutes} min
        </p>
        <Brush text={s.title} className="tp-tape__title" glow={locked ? 'none' : 'orange'} />
        <p className="tp-tape__product">
          {s.productKind}: {s.product}
        </p>
        <p className="tp-tape__syn">{s.synopsis}</p>
        <div className="tp-gate">
          <h3 className="tp-sp__h">{locked ? (s.type === 'branch' ? 'When it plays' : 'How to unlock it') : s.status === 'done' ? 'How you cleared it' : 'To clear this stage'}</h3>
          <p>{locked ? s.lockNote : s.gate.text}</p>
        </div>
        <p className="tp-sp__reward">
          <Gift size={16} aria-hidden /> Reward: {s.reward}
        </p>
        <div className="tp-tape__actions">
          <StateTag kind={ss.kind}>{s.status === 'done' ? `Done · scored ${s.result}` : ss.word}</StateTag>
          {s.status === 'current' && (
            <button className="tp-btn tp-btn--primary" onClick={() => playStage(s, 'My journey')}>
              <Play size={16} fill="currentColor" strokeWidth={0} aria-hidden /> Play tape {s.n} · Start {s.title}
            </button>
          )}
          {s.status === 'done' && (
            <button className="tp-btn tp-btn--secondary" onClick={() => playStage(s, 'My journey')}>
              <RotateCcw size={16} aria-hidden /> Replay tape {s.n}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/** Index of the sleeves; shown only while you read them. Number + state icon, never colour alone. */
function Rail() {
  const [active, setActive] = useState(-1);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const box = document.getElementById('sleeves')?.getBoundingClientRect();
      const mid = window.innerHeight * 0.5;
      setShow(!!box && box.top < mid && box.bottom > mid);
      let idx = -1;
      document.querySelectorAll<HTMLElement>('[data-tape]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) idx = Number(el.dataset.tape);
      });
      setActive(idx);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className={`tp-rail ${show ? '' : 'is-hidden'}`} aria-label="Jump to a sleeve">
      {stages.map((s, i) => {
        const ss = stageState(s);
        return (
          <button key={s.id} className={`tp-rail__t is-${s.status} ${active === i ? 'is-on' : ''}`} onClick={() => document.getElementById(`tape-${s.n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} aria-label={`Stage ${s.n}: ${s.title}, ${ss.word}`} title={`${s.n}. ${s.title}`}>
            <span className="tp-rail__n">{pad(s.n)}</span>
            <StateTag kind={ss.kind} className="tp-rail__st">
              {''}
            </StateTag>
          </button>
        );
      })}
    </nav>
  );
}
