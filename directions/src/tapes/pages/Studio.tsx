import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, CalendarDays, Check, CornerUpLeft, Eye, TrendingUp, Trophy, Users } from 'lucide-react';
import { Brush, Splatter } from '../fx/Brush';
import { clunk } from '../fx/sound';
import { activity, admin, queue as seedQueue, signal, skillGaps, stages, topPathways, tournament, type QueueItem } from '../data';
import { stageSpec, TapeCover } from '../covers/TapeCover';
import type { CoverSpec } from '../covers/draw';
import { clockNow, toast } from '../store';
import { rise, StateTag } from '../shell/ui';

const pad = (n: number) => String(n).padStart(2, '0');

function queueSpec(q: QueueItem): CoverSpec {
  const words = q.title.replace(/—.*$/, '').trim().split(' ');
  return {
    key: `queue-${q.id}`,
    n: seedQueue.findIndex((x) => x.id === q.id) + 1,
    total: seedQueue.length,
    type: q.type,
    title: q.title.replace(/ —.*$/, ''),
    status: 'draft',
    pathway: 'Review queue',
    art: {
      lines: words.slice(0, 3),
      big: q.type === 'assess' ? '80' : q.type === 'compete' ? 'Leverage' : undefined,
      tagline: q.detail,
      credits: `Submitted for review by ${q.author} · ${q.kind} · ${q.detail} · awaiting sign-off from an org admin`,
      product: q.kind,
    },
  };
}

type Signed = { t: string; title: string; kind: 'approved' | 'returned' };

export function Studio({ onQueue }: { onQueue: (n: number) => void }) {
  const [items, setItems] = useState(seedQueue);
  const [sel, setSel] = useState(seedQueue[0]!.id);
  const [stamp, setStamp] = useState<null | 'approved' | 'returned'>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [signed, setSigned] = useState<Signed[]>([
    { t: '11:05', title: 'Field Coaching Basics', kind: 'approved' },
    { t: '09:12', title: 'Cardiology Launch Quiz', kind: 'returned' },
  ]);
  const top = useRef<HTMLElement>(null);
  useEffect(() => onQueue(items.length), [items.length, onQueue]);

  const current = items.find((q) => q.id === sel) ?? items[0];
  const curIdx = current ? items.indexOf(current) : -1;

  const decide = (kind: 'approved' | 'returned') => {
    if (!current || stamp) return;
    const item = current;
    const idx = items.indexOf(item);
    const rest = items.filter((q) => q.id !== item.id);
    const said = note.trim();
    setStamp(kind);
    clunk(kind === 'approved' ? 'rec' : 'rew');
    window.setTimeout(() => {
      setItems(rest);
      setSel(rest[Math.min(idx, rest.length - 1)]?.id ?? '');
      setStamp(null);
      setNoteOpen(false);
      setNote('');
      const entry: Signed = { t: clockNow(), title: item.title, kind };
      setSigned((l) => [entry, ...l]);
      toast({
        tone: 'ok',
        text: kind === 'approved' ? `Approved: ${item.title}` : `Sent back to ${item.author}`,
        detail: kind === 'approved' ? 'It is signed and can now be published to learners.' : said ? `Your note: “${said}”` : 'It is back in their drafts with your request.',
        action: {
          label: 'Undo',
          run: () => {
            setItems((l) => {
              const next = l.filter((q) => q.id !== item.id);
              next.splice(Math.min(idx, next.length), 0, item);
              return next;
            });
            setSel(item.id);
            setSigned((l) => l.filter((x) => x !== entry));
            clunk('rew');
          },
        },
      });
    }, 650);
  };

  const pick = (id: string) => {
    setSel(id);
    setNoteOpen(false);
    setNote('');
    clunk('tick');
  };

  return (
    <main className="tp-page tp-studio" ref={top}>
      <header className="tp-studio__head tp-rise" style={rise(0)}>
        <div className="tp-studio__intro">
          <p className="tp-kicker">Dashboard · {admin.org}</p>
          <div className="tp-studio__titlewrap">
            <Brush as="h1" text="Review queue" className="tp-studio__title" />
            <Splatter seed={44} size={0.7} className="tp-studio__splat" />
          </div>
          <p className="tp-lede tp-studio__lede">
            {items.length ? (
              <>
                <b>
                  {items.length} {items.length === 1 ? 'item waits' : 'items wait'} for your sign-off.
                </b>{' '}
              </>
            ) : (
              <b>Nothing is waiting. </b>
            )}
            Nothing reaches learners until an approver signs it, and nobody approves their own work.
          </p>
        </div>
        <dl className="tp-kpis" aria-label="Organization health at a glance">
          {admin.kpis.map((k) => (
            <div key={k.key} className="tp-kpi">
              <dt>{k.label}</dt>
              <dd className="tp-kpi__v">
                <b className="tp-num">{k.value}</b>
                {k.unit && <span>{k.unit}</span>}
              </dd>
              <dd className={`tp-kpi__n ${k.trend === 'up' ? 'is-up' : ''}`}>
                {k.trend === 'up' && <TrendingUp size={14} aria-hidden />} {k.note}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="tp-queue tp-rise" style={rise(1)} aria-label="Review queue">
        <div className="tp-queue__side">
          <p className="tp-queue__cap">
            <span>Waiting for sign-off</span>
            <span>Newest first</span>
          </p>
          <ol className="tp-queue__list" role="listbox" aria-label="Items waiting for sign-off">
            <AnimatePresence initial={false}>
              {items.map((q, i) => {
                const on = q.id === current?.id;
                return (
                  <motion.li key={q.id} layout initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60, transition: { duration: 0.25 } }} transition={{ duration: 0.22 }}>
                    <button role="option" aria-selected={on} className={`tp-qrow ${on ? 'is-on' : ''}`} onClick={() => pick(q.id)}>
                      <span className="tp-qrow__n tp-num">{pad(i + 1)}</span>
                      <span className="tp-qrow__main">
                        <b>{q.title}</b>
                        <small>
                          {q.kind} · {q.author} · {q.age} ago
                        </small>
                      </span>
                      {q.flag ? <StateTag kind="problem">Needs a look</StateTag> : <StateTag kind="ready">Checks passed</StateTag>}
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
          {!items.length && <p className="tp-queue__empty">Queue clear. Every item is signed.</p>}
        </div>

        <AnimatePresence mode="wait">
          {current ? (
            <motion.article key={current.id} className="tp-review" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} aria-label={`Review: ${current.title}`}>
              <div className="tp-review__cover">
                <TapeCover spec={queueSpec(current)} label={`Cover of ${current.title}`} />
                <AnimatePresence>
                  {stamp && (
                    <motion.div className={`tp-stamp is-${stamp}`} initial={{ scale: 1.7, opacity: 0, rotate: -18 }} animate={{ scale: 1, opacity: 1, rotate: -10 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>
                      {stamp === 'approved' ? 'Approved' : 'Sent back'}
                      <small>{stamp === 'approved' ? 'Signed · S. Mansour' : 'To the author'}</small>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="tp-review__info">
                <p className="tp-sp__k">
                  {current.kind} · item {curIdx + 1} of {items.length}
                </p>
                <Brush as="h2" text={current.title} className="tp-review__title" />
                <p className="tp-review__detail">{current.detail}</p>
                <p className="tp-review__by">
                  Sent by <b>{current.author}</b> ({current.authorRole}) {current.age} ago
                </p>
                <ul className="tp-review__checks">
                  <li>
                    <StateTag kind="ready">Automatic checks passed</StateTag>
                    <span>{current.checks}</span>
                  </li>
                  {current.flag && (
                    <li className="is-flag">
                      <StateTag kind="problem">Needs a look</StateTag>
                      <span>{current.flag}. Read them before you approve.</span>
                    </li>
                  )}
                </ul>
                {noteOpen ? (
                  <div className="tp-review__note">
                    <label htmlFor="tp-note">What should {current.author.split(' ')[0]} change?</label>
                    <textarea id="tp-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: reword the two flagged claims in module 3." autoFocus />
                    <div className="tp-review__act">
                      <button className="tp-btn tp-btn--primary" onClick={() => decide('returned')}>
                        <CornerUpLeft size={17} aria-hidden /> Send back to {current.author}
                      </button>
                      <button className="tp-btn tp-btn--quiet" onClick={() => setNoteOpen(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="tp-review__act">
                    <button className="tp-btn tp-btn--primary tp-btn--lg" onClick={() => decide('approved')}>
                      <Check size={19} strokeWidth={3} aria-hidden /> Approve
                    </button>
                    <button className="tp-btn tp-btn--secondary" onClick={() => setNoteOpen(true)}>
                      <CornerUpLeft size={17} aria-hidden /> Request changes
                    </button>
                    <button
                      className="tp-btn tp-btn--quiet"
                      onClick={() => toast({ tone: 'info', text: `Preview of ${current.title}`, detail: 'Opens the item exactly as learners will see it. Not part of this mockup.' })}
                    >
                      <Eye size={17} aria-hidden /> Preview
                    </button>
                  </div>
                )}
              </div>
            </motion.article>
          ) : (
            <motion.article key="empty" className="tp-review tp-review--empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Brush as="h2" text="All signed" className="tp-review__title" glow="green" />
              <p className="tp-review__detail">You have cleared the queue. New items appear here the moment an author submits them.</p>
            </motion.article>
          )}
        </AnimatePresence>
      </section>

      <section className="tp-studio__more" aria-labelledby="health-h">
        <header className="tp-studio__morehead">
          <h2 id="health-h" className="tp-h2">
            Pathway health
          </h2>
          <p>Northwind Pharma, last twelve weeks.</p>
        </header>
        <div className="tp-studio__grid">
          <article className="tp-card tp-card--chart">
            <header className="tp-card__h">
              <h3>Stage completions per week</h3>
              <span className="tp-legend">
                <i className="is-a" /> Completions <i className="is-b" /> Average score
              </span>
            </header>
            <Signal />
          </article>
          <article className="tp-card">
            <header className="tp-card__h">
              <h3>Weakest skills</h3>
              <span>Average mastery across the org</span>
            </header>
            <ul className="tp-gaps">
              {skillGaps.map((g) => (
                <li key={g.name} className={g.pct < 65 ? 'is-low' : ''}>
                  <span className="tp-gaps__name">{g.name}</span>
                  <span className="tp-bar">
                    <i style={{ width: `${g.pct}%` }} />
                  </span>
                  <b className="tp-num">{g.pct}%</b>
                  {g.pct < 65 && <StateTag kind="problem">Low</StateTag>}
                </li>
              ))}
            </ul>
          </article>
          <article className="tp-card">
            <header className="tp-card__h">
              <h3>Top pathways</h3>
              <span>By completion rate</span>
            </header>
            <ol className="tp-toplist">
              {topPathways.map((p, i) => (
                <li key={p.name}>
                  <span className="tp-num">{i + 1}</span>
                  <span className="tp-toplist__main">
                    <b>{p.name}</b>
                    <small>
                      {p.learners} learners · {p.stages} stages
                    </small>
                    <span className="tp-bar">
                      <i style={{ width: `${p.pct}%` }} />
                    </span>
                  </span>
                  <b className="tp-num tp-toplist__pct">{p.pct}%</b>
                </li>
              ))}
            </ol>
          </article>
          <Tournament
            pending={items.some((q) => q.id === 'q3')}
            onReview={() => {
              pick('q3');
              top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          <article className="tp-card">
            <header className="tp-card__h">
              <h3>Recent activity</h3>
              <span>Today</span>
            </header>
            <ul className="tp-activity">
              {signed.slice(0, 3).map((s) => (
                <li key={s.t + s.title}>
                  <span className="tp-num">{s.t}</span>
                  <span>
                    You {s.kind === 'approved' ? 'approved' : 'sent back'} <b>{s.title}</b>
                  </span>
                </li>
              ))}
              {activity.slice(0, 5).map((a) => (
                <li key={a.t + a.text}>
                  <span className="tp-num">{a.t}</span>
                  <span>{a.text}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
        <div className="tp-studio__end">
          <button className="tp-btn tp-btn--secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp size={16} aria-hidden /> Back to the review queue
          </button>
        </div>
      </section>
    </main>
  );
}

function Tournament({ onReview, pending }: { onReview: () => void; pending: boolean }) {
  const cup = useMemo(() => stageSpec(stages.find((x) => x.type === 'prove')!), []);
  // the story's "today" is 15 November; the cup starts on 8 December
  const days = 23;
  return (
    <article className="tp-card tp-cup">
      <header className="tp-card__h">
        <h3>Upcoming tournament</h3>
        <span>
          <CalendarDays size={14} aria-hidden /> Starts in {days} days
        </span>
      </header>
      <div className="tp-cup__body">
        <TapeCover spec={{ ...cup, key: 'cup-admin', status: 'draft' }} className="tp-cup__cover" label="" />
        <div className="tp-cup__info">
          <b className="tp-cup__name">
            <Trophy size={18} aria-hidden /> {tournament.name}
          </b>
          <span>December 8 to 12 · {tournament.arenas}</span>
          <span className="tp-cup__seats">
            <Users size={15} aria-hidden /> {tournament.registered} of {tournament.seats} seats taken
          </span>
          <span className="tp-bar">
            <i style={{ width: `${(tournament.registered / tournament.seats) * 100}%` }} />
          </span>
          <span>{tournament.format}. Top 4 advance.</span>
          {pending ? (
            <div className="tp-cup__pending">
              <StateTag kind="problem">Waiting on you</StateTag>
              <span>Its bracket rules are in your review queue.</span>
              <button className="tp-btn tp-btn--quiet" onClick={onReview}>
                Review the bracket rules
              </button>
            </div>
          ) : (
            <StateTag kind="ready">Rules signed · registration open</StateTag>
          )}
        </div>
      </div>
    </article>
  );
}

/** Weekly completions drawn as a VHS tracking signal: a glowing trace with a warm chroma ghost. */
function Signal() {
  const W = 900;
  const H = 320;
  const L = 64;
  const R = 20;
  const T = 24;
  const B = 44;
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const n = signal.completions.length;
  const xs = signal.completions.map((_, i) => L + (i * (W - L - R)) / (n - 1));
  const yC = (v: number) => T + (1 - (v - 500) / (1150 - 500)) * (H - T - B);
  const yS = (v: number) => T + (1 - (v - 60) / (90 - 60)) * (H - T - B);
  const trace = useMemo(() => {
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;
    const pts: string[] = [];
    for (let i = 0; i < n - 1; i++) {
      for (let k = 0; k < 10; k++) {
        const t = k / 10;
        const e = t * t * (3 - 2 * t);
        const x = xs[i]! + (xs[i + 1]! - xs[i]!) * t;
        const v = signal.completions[i]! + (signal.completions[i + 1]! - signal.completions[i]!) * e;
        pts.push(`${x.toFixed(1)},${(yC(v) + r() * 1.6).toFixed(1)}`);
      }
    }
    pts.push(`${xs[n - 1]!.toFixed(1)},${yC(signal.completions[n - 1]!).toFixed(1)}`);
    return 'M' + pts.join(' L');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const score = signal.score.map((v, i) => `${i ? 'L' : 'M'}${xs[i]!.toFixed(1)},${yS(v).toFixed(1)}`).join(' ');
  const area = `${trace} L${xs[n - 1]},${H - B} L${xs[0]},${H - B} Z`;
  const onMove = (e: RPointerEvent) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    xs.forEach((v, i) => {
      if (Math.abs(v - x) < Math.abs(xs[best]! - x)) best = i;
    });
    setHover(best);
  };
  const hi = hover ?? n - 1;
  const last = signal.completions[n - 1]!;
  const prev = signal.completions[n - 2]!;
  return (
    <div className="tp-sig">
      <p className="tp-sig__readout">
        <b className="tp-num">{signal.completions[hi]!.toLocaleString('en-US')}</b>
        <span>
          completions in week {signal.weeks[hi]!.slice(1)} · average score {signal.score[hi]}%
          {hover === null ? ` · up ${Math.round(((last - prev) / prev) * 100)}% on the week before` : ''}
        </span>
      </p>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="tp-sig__svg" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Stage completions per week, weeks 35 to 46, rising from 612 to 1,084; average score rising from 71% to 81%">
        <defs>
          <linearGradient id="tp-sig-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgb(255,106,26)" stopOpacity="0.26" />
            <stop offset="1" stopColor="rgb(255,106,26)" stopOpacity="0" />
          </linearGradient>
          <filter id="tp-sig-glow" x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        {[600, 800, 1000].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={yC(v)} y2={yC(v)} className="tp-sig__grid" />
            <text x={L - 12} y={yC(v) + 6} className="tp-sig__ax" textAnchor="end">
              {v.toLocaleString('en-US')}
            </text>
          </g>
        ))}
        {signal.weeks.map((w, i) =>
          i % 2 === 1 || i === n - 1 ? (
            <text key={w} x={xs[i]} y={H - 12} className="tp-sig__ax" textAnchor="middle">
              {w}
            </text>
          ) : null,
        )}
        <path d={area} fill="url(#tp-sig-fill)" />
        <path d={score} className="tp-sig__score" />
        <path d={trace} className="tp-sig__ghost" transform="translate(3 0)" />
        <path d={trace} className="tp-sig__glow" filter="url(#tp-sig-glow)" />
        <path d={trace} className="tp-sig__line" />
        <line x1={xs[hi]} x2={xs[hi]} y1={T - 6} y2={H - B} className="tp-sig__cursor" />
        <circle cx={xs[hi]} cy={yC(signal.completions[hi]!)} r="7" className="tp-sig__dot" />
      </svg>
    </div>
  );
}
