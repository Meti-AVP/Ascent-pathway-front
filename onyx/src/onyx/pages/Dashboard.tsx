import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronRight, CircleAlert, Gamepad2, Gift, Layers,
  ListChecks, Radio, ShieldCheck, Trophy, TrendingUp, Undo2, Users,
} from 'lucide-react';
import { gsap, useGSAP, Flip, splitReveal, rise, reduced, dur } from '../motion';
import { Avatar, Btn, Chip, Num, Segmented, Sheet, cx } from '../ui';
import {
  ACTIVITY, ADMIN, APPROVER, KPIS, PERFORMANCE, SKILL_GAPS, TOP_PATHWAYS, TOURNAMENT,
  type ReviewItem, type ReviewKind,
} from '../data';
import { removeFromQueue, restoreToQueue, toast, useApp } from '../store';
import { HeroHost } from '../HeroHost';
import './dashboard.css';

const KIND: Record<ReviewKind, { label: string; Icon: typeof Layers; group: 'journeys' | 'content' | 'events' }> = {
  journey: { label: 'Journey', Icon: Layers, group: 'journeys' },
  items: { label: 'Questions', Icon: ListChecks, group: 'content' },
  course: { label: 'Course', Icon: BookOpen, group: 'content' },
  arena: { label: 'Battle Arena', Icon: Gamepad2, group: 'content' },
  reward: { label: 'Reward Drop', Icon: Gift, group: 'content' },
  tournament: { label: 'Tournament', Icon: Trophy, group: 'events' },
  live: { label: 'Live Session', Icon: Radio, group: 'events' },
};
type Filter = 'all' | 'journeys' | 'content' | 'events';

export function Dashboard() {
  const queue = useApp((s) => s.queue);
  const root = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const shown = useMemo(() => queue.filter((r) => filter === 'all' || KIND[r.kind].group === filter), [queue, filter]);
  const count = queue.length;
  const counts = useMemo(() => {
    const c = { all: queue.length, journeys: 0, content: 0, events: 0 };
    queue.forEach((r) => { c[KIND[r.kind].group] += 1; });
    return c;
  }, [queue]);

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    splitReveal(title.current, { by: 'words', stagger: 0.07, delay: 0.15 });
    if (reduced()) return;
    gsap.fromTo(q('.dash__numeral'), { opacity: 0, scale: 0.8, filter: 'blur(20px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.6, ease: 'onyx', clearProps: 'filter' });
    gsap.fromTo(q('.dash__numeral'), { '--shine': '-40%' }, { '--shine': '140%', duration: 2.2, ease: 'power2.inOut', delay: 0.5 });
    rise(q('.dash__greet, .dash__sub, .dash__cta'), { delay: 0.35, stagger: 0.08 });
    rise(q('.queue'), { delay: 0.5, y: 40 });
    gsap.fromTo(q('.qrow'), { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.9, stagger: 0.06, delay: 0.75, ease: 'onyx', clearProps: 'transform' });
    rise(q('.kpi'), { delay: 0.65, stagger: 0.09, y: 34 });
    q('.insights .reveal').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 40, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, clearProps: 'filter', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });
  }, { scope: root });

  // Flip the queue whenever rows leave or come back.
  useLayoutEffect(() => {
    if (!flipState.current || reduced()) { flipState.current = null; return; }
    Flip.from(flipState.current, {
      targets: listRef.current?.querySelectorAll('.qrow'),
      duration: 0.75, ease: 'onyx', absolute: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.7 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, x: 60, filter: 'blur(6px)', duration: 0.5, ease: 'power2.in' }),
    });
    flipState.current = null;
  }, [shown]);

  const capture = () => {
    const rows = listRef.current?.querySelectorAll('.qrow');
    if (rows?.length) flipState.current = Flip.getState(rows);
  };

  const act = (item: ReviewItem, verb: 'approved' | 'returned', note?: string) => {
    const index = queue.findIndex((r) => r.id === item.id);
    const nextOpen = queue[index + 1]?.id ?? queue[index - 1]?.id ?? null;
    capture();
    removeFromQueue(item.id);
    setOpenId(queue.length > 1 ? nextOpen : null);
    toast({
      tone: 'done',
      title: verb === 'approved' ? `Approved: ${item.title}` : `Sent back to ${item.author}`,
      body: verb === 'approved' ? `Live for ${item.audience.toLowerCase().startsWith('used in') ? 'learners on that stage' : item.audience}.` : note ? `“${note}”` : 'They will see your note in their drafts.',
      action: { label: 'Undo', run: () => { capture(); restoreToQueue(item, index); } },
    });
  };

  const open = queue.find((r) => r.id === openId) ?? null;
  const openIndex = open ? queue.indexOf(open) : -1;

  return (
    <div ref={root} className="page dash">
      <div className="dash__stand" aria-hidden><HeroHost character="sara" /></div>
      <header className="dash__head">
        <div className="dash__copy">
        <p className="dash__greet"><Avatar who="sara" size={34} /><span>Good morning, {ADMIN.first}</span><span className="sep" /><span>Admin dashboard</span></p>
        <h1 className="dash__title">
          {count > 0 ? (
            <>
              <span className="dash__numeral num" aria-hidden><Num value={count} duration={1.1} /></span>
              <span ref={title} className="dash__words">{count === 1 ? 'item is' : 'items are'} waiting for your review</span>
            </>
          ) : (
            <span ref={title} className="dash__words">You’re all caught up</span>
          )}
        </h1>
        <p className="dash__sub">
          {count > 0 ? 'Nothing reaches learners until an approver signs it off. Oldest first.' : 'New submissions will appear here the moment an author sends them.'}
        </p>
        </div>
        {count > 0 && (
          <Btn kind="primary" size="lg" className="dash__cta" iconRight={<ArrowRight />} onClick={() => setOpenId(queue[0]!.id)}>
            Review the oldest item
          </Btn>
        )}
      </header>

      <div className="dash__grid">
        <section className="queue glass g-lit" aria-labelledby="queue-title">
          <div className="queue__head">
            <h2 id="queue-title" className="panel__title">Review queue</h2>
            <Segmented<Filter>
              size="sm" label="Filter the queue" value={filter} onChange={(v) => setFilter(v)}
              options={[
                { value: 'all', label: <>All <b className="cnt">{counts.all}</b></> },
                { value: 'journeys', label: <>Journeys <b className="cnt">{counts.journeys}</b></> },
                { value: 'content', label: <>Content <b className="cnt">{counts.content}</b></> },
                { value: 'events', label: <>Events <b className="cnt">{counts.events}</b></> },
              ]}
            />
          </div>
          <ul ref={listRef} className="queue__list">
            {shown.map((r) => {
              const K = KIND[r.kind];
              return (
                <li key={r.id} className="qrow" data-flip-id={r.id}>
                  <button type="button" className="qrow__btn" onClick={() => setOpenId(r.id)}>
                    <span className={cx('qrow__icon', r.mine && 'is-mine')}><K.Icon size={19} /></span>
                    <span className="qrow__main">
                      <span className="qrow__title">{r.title}{r.isNew && <Chip tone="current">New</Chip>}</span>
                      <span className="qrow__meta">{r.what} · {r.mine ? 'Submitted by you' : r.author} · {r.age}</span>
                    </span>
                    <span className="qrow__change">{r.change}</span>
                    <span className="qrow__go">Review <ChevronRight size={16} /></span>
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && (
              <li className="queue__empty"><ShieldCheck size={22} /> Nothing waiting here.</li>
            )}
          </ul>
        </section>

        <section className="health" aria-labelledby="health-title">
          <h2 id="health-title" className="sr-only">Health at a glance</h2>
          {KPIS.map((k, i) => (
            <article key={k.id} className="kpi glass g-lit">
              <span className="kpi__label">{k.note ? `${k.label} · ${k.note.toLowerCase()}` : k.label}</span>
              <span className="kpi__value"><Num value={k.value} delay={0.4 + i * 0.1} /><span className="kpi__unit">{k.unit.trim()}</span></span>
              <span className="kpi__delta"><TrendingUp size={15} aria-hidden /> {k.delta}</span>
              <Spark id={k.id} values={k.spark} label={k.label} unit={k.unit} />
            </article>
          ))}
        </section>
      </div>

      <section className="insights" aria-labelledby="ins-title">
        <header className="insights__head reveal">
          <p className="eyebrow">Insights</p>
          <h2 id="ins-title" className="insights__title">How learning is going</h2>
        </header>
        <div className="insights__grid">
          <article className="ins ins--wide glass g-lit reveal">
            <h3 className="ins__title">Completion rate, last 12 weeks</h3>
            <p className="ins__sub">Share of assigned stages finished on time, all pathways.</p>
            <AreaChart weeks={PERFORMANCE.weeks} values={PERFORMANCE.completion} />
          </article>
          <article className="ins glass g-lit reveal">
            <h3 className="ins__title">Top pathways</h3>
            <p className="ins__sub">Completion rate</p>
            <Bars rows={TOP_PATHWAYS.map((p) => ({ label: p.name, value: p.value }))} />
          </article>
          <article className="ins glass g-lit reveal">
            <h3 className="ins__title">Skill gaps</h3>
            <p className="ins__sub">Learners at mastery, by skill</p>
            <Bars rows={SKILL_GAPS.map((s) => ({ label: s.skill, value: s.value, flag: s.value < 55 }))} />
          </article>
          <article className="ins glass g-lit reveal">
            <h3 className="ins__title">Recent activity</h3>
            <ul className="activity">
              {ACTIVITY.map((a) => (
                <li key={a.who + a.when}><Users size={16} aria-hidden /><span><strong>{a.who}</strong> {a.what}</span><time>{a.when}</time></li>
              ))}
            </ul>
          </article>
          <article className="ins glass g-lit reveal">
            <h3 className="ins__title">Next tournament</h3>
            <div className="cup">
              <span className="cup__icon"><Trophy size={26} /></span>
              <div>
                <p className="cup__name">{TOURNAMENT.name}</p>
                <p className="cup__meta"><CalendarDays size={15} /> {TOURNAMENT.when} · {TOURNAMENT.players} players</p>
              </div>
            </div>
            <ul className="cup__facts">
              <li><span>Advancement</span><strong>{TOURNAMENT.rule}</strong></li>
              <li><span>Prize pool</span><strong>{TOURNAMENT.pool}</strong></li>
            </ul>
          </article>
        </div>
      </section>

      <ReviewSheet
        item={open}
        index={openIndex}
        total={count}
        onClose={() => setOpenId(null)}
        onMove={(d) => { const n = queue[openIndex + d]; if (n) setOpenId(n.id); }}
        onApprove={(it) => act(it, 'approved')}
        onReturn={(it, note) => act(it, 'returned', note)}
      />
    </div>
  );
}

// ── Review sheet ───────────────────────────────────────────────────────────
function ReviewSheet({ item, index, total, onClose, onMove, onApprove, onReturn }: {
  item: ReviewItem | null; index: number; total: number; onClose: () => void; onMove: (d: number) => void;
  onApprove: (i: ReviewItem) => void; onReturn: (i: ReviewItem, note: string) => void;
}) {
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState('');
  const body = useRef<HTMLDivElement>(null);
  const last = useRef<ReviewItem | null>(null);
  if (item) last.current = item;
  const it = item ?? last.current;

  useLayoutEffect(() => {
    setReturning(false);
    setNote('');
    if (!body.current || reduced()) return;
    gsap.fromTo(body.current.children, { opacity: 0, y: 14, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.05, duration: 0.6, ease: 'onyx', clearProps: 'filter,transform' });
  }, [item?.id]);

  if (!it) return null;
  const K = KIND[it.kind];
  return (
    <Sheet open={!!item} onClose={onClose} label={`Review ${it.title}`} width={880} className="review">
      <div ref={body} className="review__body">
        <div className="review__top">
          <Chip icon={<K.Icon size={14} />}>{K.label}</Chip>
          <span className="review__pos">Item {index + 1} of {total}</span>
          <span className="review__nav">
            <button type="button" className="icon-btn" aria-label="Previous item" disabled={index <= 0} onClick={() => onMove(-1)}><ArrowLeft size={17} /></button>
            <button type="button" className="icon-btn" aria-label="Next item" disabled={index >= total - 1} onClick={() => onMove(1)}><ArrowRight size={17} /></button>
          </span>
        </div>
        <h2 className="review__title">{it.title}</h2>
        <p className="review__by"><span className="review__mono">{it.author.split(' ').map((w) => w[0]).join('')}</span>{it.mine ? 'Submitted by you' : `Submitted by ${it.author}`} · {it.age} · {it.what}</p>

        <div className="review__cols">
          <div className="review__main">
            <h3 className="label">What changed</h3>
            <p className="review__change">{it.change}</p>
            <h3 className="label">Who it reaches</h3>
            <p className="review__aud"><Users size={16} /> {it.audience}</p>
            <dl className="review__preview">
              {it.preview.map((p) => (<div key={p.label}><dt>{p.label}</dt><dd>{p.value}</dd></div>))}
            </dl>
          </div>
          <div className="review__checks glass-in">
            <h3 className="label">Checks</h3>
            <ul>
              {it.checks.map((c) => (<li key={c}><Check size={16} aria-hidden /> {c}</li>))}
            </ul>
          </div>
        </div>

        {returning && (
          <label className="field review__note">
            <span>What should {it.author.split(' ')[0]} change?</span>
            <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Be specific, for example: the third question has two correct answers." autoFocus />
          </label>
        )}

        <div className="review__foot">
          {it.mine ? (
            <p className="review__own"><CircleAlert size={17} /> You submitted this, so another approver signs it off: {APPROVER.name}, {APPROVER.role}.</p>
          ) : returning ? (
            <>
              <Btn kind="ghost" onClick={() => setReturning(false)} icon={<Undo2 />}>Keep reviewing</Btn>
              <Btn kind="primary" blocked={!note.trim()} onClick={() => onReturn(it, note.trim())}>
                {note.trim() ? `Send back to ${it.author.split(' ')[0]}` : 'Write a note to send it back'}
              </Btn>
            </>
          ) : (
            <>
              <Btn kind="glass" onClick={() => setReturning(true)}>Request changes</Btn>
              <Btn kind="primary" icon={<Check />} onClick={() => onApprove(it)} data-autofocus>Approve and publish</Btn>
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// ── Charts ─────────────────────────────────────────────────────────────────
function Spark({ id, values, label, unit }: { id: string; values: number[]; label: string; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 220, H = 46, P = 4;
  const min = Math.min(...values), max = Math.max(...values);
  const x = (i: number) => P + (i / (values.length - 1)) * (W - P * 2);
  const y = (v: number) => H - P - ((v - min) / (max - min || 1)) * (H - P * 2);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const hi = hover ?? values.length - 1;
  const hv = values[hi]!;
  return (
    <div className="spark" onPointerLeave={() => setHover(null)} onPointerMove={(e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const i = Math.round(((e.clientX - r.left) / r.width) * (values.length - 1));
      setHover(Math.max(0, Math.min(values.length - 1, i)));
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${label}, last 12 weeks: from ${values[0]} to ${values[values.length - 1]}`}>
        <defs>
          <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ee6a2c" stopOpacity="0.22" />
            <stop offset="1" stopColor="#ee6a2c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L${x(values.length - 1)},${H} L${x(0)},${H} Z`} fill={`url(#sp-${id})`} />
        <path className="spark__line" d={d} fill="none" stroke="#e9eaee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="spark__dot" style={{ left: `${(x(hi) / W) * 100}%`, top: `${(y(hv) / H) * 100}%` }} />
      {hover !== null && <span className="spark__tip" style={{ left: `${(x(hi) / W) * 100}%` }}>{hv.toLocaleString('en-US')}{unit} · {12 - hi === 1 ? 'this week' : `${12 - hi - 1} wk ago`}</span>}
    </div>
  );
}

function AreaChart({ weeks, values }: { weeks: string[]; values: number[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 760, H = 230, L = 44, R = 16, T = 14, B = 30;
  const lo = 78, hi = 94;
  const x = (i: number) => L + (i / (values.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  useGSAP(() => {
    if (reduced()) return;
    gsap.fromTo(ref.current!.querySelector('.area__line'), { drawSVG: '0%' }, { drawSVG: '100%', duration: dur(2), ease: 'power2.inOut', scrollTrigger: { trigger: ref.current, start: 'top 85%' } });
    gsap.fromTo(ref.current!.querySelector('.area__fill'), { opacity: 0 }, { opacity: 1, duration: 1.6, delay: 0.6, scrollTrigger: { trigger: ref.current, start: 'top 85%' } });
  }, { scope: ref });
  const hv = hover !== null ? values[hover]! : null;
  return (
    <div className="area" onPointerLeave={() => setHover(null)} onPointerMove={(e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * W;
      const i = Math.round(((px - L) / (W - L - R)) * (values.length - 1));
      setHover(Math.max(0, Math.min(values.length - 1, i)));
    }}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Completion rate rose from ${values[0]}% to ${values[values.length - 1]}% over 12 weeks`}>
        <defs>
          <linearGradient id="area-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ee6a2c" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ee6a2c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[80, 85, 90].map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,0.07)" />
            <text x={L - 10} y={y(g) + 4} textAnchor="end" className="area__axis">{g}%</text>
          </g>
        ))}
        {weeks.map((w, i) => (i % 3 === 0 || i === weeks.length - 1) && (
          <text key={w} x={x(i)} y={H - 8} textAnchor={i === weeks.length - 1 ? 'end' : 'middle'} className="area__axis">{w}</text>
        ))}
        <path className="area__fill" d={`${d} L${x(values.length - 1)},${y(lo)} L${x(0)},${y(lo)} Z`} fill="url(#area-g)" />
        <path className="area__line" d={d} fill="none" stroke="#eceef2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {hover !== null && hv !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={y(lo)} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 4" />
            <circle cx={x(hover)} cy={y(hv)} r="5" fill="#0b0c0f" stroke="#fff" strokeWidth="2" />
          </g>
        )}
        <circle cx={x(values.length - 1)} cy={y(values[values.length - 1]!)} r="4.5" fill="#ffc93f" />
      </svg>
      {hover !== null && hv !== null && (
        <span className="area__tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(hv) / H) * 100}%` }}>
          <strong>{hv}%</strong> week of {weeks[hover]}
        </span>
      )}
    </div>
  );
}

function Bars({ rows }: { rows: { label: string; value: number; flag?: boolean }[] }) {
  const ref = useRef<HTMLUListElement>(null);
  useGSAP(() => {
    if (reduced()) return;
    gsap.fromTo(ref.current!.querySelectorAll('.hbar__fill'), { scaleX: 0 }, { scaleX: 1, duration: 1.4, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: ref.current, start: 'top 88%' } });
  }, { scope: ref });
  return (
    <ul ref={ref} className="hbars">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${r.value}%`}>
          <span className="hbars__label">{r.label}{r.flag && <Chip tone="alert" icon={<CircleAlert size={13} />}>Needs attention</Chip>}</span>
          <span className="hbars__value num">{r.value}%</span>
          <span className="hbar"><span className="hbar__fill" style={{ width: `${r.value}%` }} /></span>
        </li>
      ))}
    </ul>
  );
}
