import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check, BookOpen, ClipboardCheck, Route as RouteIcon, Trophy, Swords, Gift, Video, TrendingUp, TrendingDown, Info,
  CornerUpLeft, Eye, Inbox, CalendarDays, Users, TriangleAlert, Workflow, ArrowRight, type LucideIcon,
} from 'lucide-react';
import { useNav } from '../shell';
import { Avatar, Bar, Btn, Seg, StateTag, useToast } from '../ui';
import { ACTIVITY, ART, KPIS, PERFORMANCE, REVIEW_QUEUE, SKILL_GAPS, TOP_PATHWAYS, TOURNAMENT, type ReviewItem, type ReviewKind } from '../data';
import type { Decision } from '../App';

const KIND_ICON: Record<ReviewKind, LucideIcon> = {
  Course: BookOpen, Assessment: ClipboardCheck, Journey: RouteIcon, Tournament: Trophy, 'Battle set': Swords, 'Reward Drop': Gift, 'Live Session': Video,
};

export function AdminDashboard({ decided, setDecided, queueCount }: { decided: Record<string, Decision>; setDecided: Dispatch<SetStateAction<Record<string, Decision>>>; queueCount: number }) {
  const toast = useToast();
  const { go } = useNav();
  const [filter, setFilter] = useState<'all' | 'look'>('all');
  const pending = REVIEW_QUEUE.filter((r) => !decided[r.id]);
  const look = pending.filter((r) => r.lint === 'warn' || r.own);
  const list = filter === 'look' ? look : pending;
  const [selId, setSelId] = useState<string | undefined>(pending[0]?.id);
  const sel = list.find((r) => r.id === selId) ?? list[0];
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState('');

  const decide = (r: ReviewItem, d: Decision) => {
    const idx = list.findIndex((p) => p.id === r.id);
    const after = list[idx + 1] ?? list[idx - 1];
    setDecided((x) => ({ ...x, [r.id]: d }));
    setSelId(after?.id);
    setAsking(false);
    const first = r.author.split(' ')[0];
    toast(
      d === 'approved' ? `Approved: ${r.title}. ${first} can publish it to learners now.` : `Sent back to ${first} with your note.`,
      d === 'approved' ? 'green' : 'orange',
      { label: 'Undo', run: () => { setDecided((x) => { const n = { ...x }; delete n[r.id]; return n; }); setSelId(r.id); } },
    );
  };

  return (
    <div className="ad">
      {/* header: who and what, plus health at a glance */}
      <section className="ad-head tk-dark" aria-labelledby="ad-hi">
        <div className="ad-head__txt">
          <p className="eyebrow">Northwind Pharma · Org Admin</p>
          <h1 id="ad-hi" className="pg-title">Good afternoon, Sara</h1>
          <p className="pg-sub">
            {queueCount > 0 ? `${queueCount} ${queueCount === 1 ? 'item is' : 'items are'} waiting for your approval.` : 'The review queue is clear.'} Nothing reaches learners until an approver signs off.
          </p>
        </div>
        <img className="ad-head__art" src={ART.pair} width={352} height={200} alt="" draggable={false} />
      </section>

      <dl className="ad-kpis" aria-label="Health at a glance">
        {KPIS.map((k) => (
          <div key={k.key} className="ad-kpi">
            <dt>{k.label}</dt>
            <dd className="ad-kpi__v">{k.v}</dd>
            <dd className={`ad-kpi__d${k.good ? ' is-good' : ''}`}>
              {k.up ? <TrendingUp size={15} aria-hidden /> : <TrendingDown size={15} aria-hidden />} {k.delta} {k.note}
            </dd>
          </div>
        ))}
      </dl>

      {/* the one job on this page: work through the review queue */}
      <section id="queue" className="sm-card ad-queue" aria-labelledby="ad-q-t">
        <div className="ad-queue__head">
          <div>
            <h2 id="ad-q-t" className="sec-title sec-title--lg">Review queue</h2>
            <p className="sec-sub">Approve each item, or send it back to its author with a note.</p>
          </div>
          <Seg
            label="Filter the queue" value={filter} onChange={(v) => { setFilter(v); setAsking(false); }}
            options={[{ v: 'all', label: `All ${pending.length}` }, { v: 'look', label: `Needs a closer look ${look.length}` }]}
          />
        </div>

        {list.length === 0 ? (
          <div className="ad-empty">
            <Inbox size={28} aria-hidden />
            <b>{pending.length === 0 ? 'All caught up' : 'Nothing needs a closer look'}</b>
            <p>{pending.length === 0 ? 'New submissions will appear here. Learners already see everything you approved.' : 'Every waiting item passed its checks.'}</p>
            {pending.length === 0 && <Btn variant="secondary" icon={Workflow} onClick={() => go('admin/builder')}>Open the pathway builder</Btn>}
          </div>
        ) : (
          <div className="ad-queue__body">
            <ul className="ad-list" aria-label="Items waiting for approval">
              {list.map((r) => {
                const I = KIND_ICON[r.kind];
                const on = sel?.id === r.id;
                return (
                  <li key={r.id}>
                    <button type="button" className={`ad-item${on ? ' is-sel' : ''}`} aria-pressed={on} onClick={() => { setSelId(r.id); setAsking(false); }}>
                      <span className="ad-item__ic" aria-hidden><I size={19} /></span>
                      <span className="ad-item__t"><b>{r.title}</b><small>{r.kind} · {r.author} · {r.age}</small></span>
                      {r.own ? <StateTag kind="locked" label="Yours" /> : r.lint === 'warn' ? <StateTag kind="warn" label="1 warning" /> : <StateTag kind="ready" label="Checks passed" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            {sel && (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={sel.id} className="ad-detail" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <p className="eyebrow">{(() => { const I = KIND_ICON[sel.kind]; return <I size={16} aria-hidden />; })()} {sel.kind} · {sel.meta}</p>
                  <h3 className="ad-detail__t">{sel.title}</h3>
                  <p className="ad-detail__d">{sel.summary}</p>
                  <div className="ad-author">
                    <Avatar src={sel.face} size={40} alt="" />
                    <span><b>{sel.author}</b><small>Submitted {sel.age}</small></span>
                  </div>
                  <div className={`ad-check is-${sel.lint}`}>
                    {sel.lint === 'pass'
                      ? <StateTag kind="ready" label="All checks passed" />
                      : <><StateTag kind="warn" label="1 warning, does not block approval" /><p>{sel.lintNote}</p></>}
                  </div>
                  {sel.own && <p className="ad-own" id="ad-own"><Info size={17} aria-hidden /> You submitted this, so another Org Admin has to approve it. Authors never approve their own work.</p>}

                  {!asking ? (
                    <div className="ad-acts">
                      <Btn variant="primary" size="lg" icon={Check} disabled={sel.own} aria-describedby={sel.own ? 'ad-own' : undefined} onClick={() => decide(sel, 'approved')}>
                        {sel.own ? 'Waiting for another approver' : 'Approve'}
                      </Btn>
                      {!sel.own && <Btn variant="secondary" icon={CornerUpLeft} onClick={() => { setAsking(true); setNote(sel.lint === 'warn' ? 'Please add a tiebreak rule before this goes live.' : ''); }}>Request changes</Btn>}
                      <Btn variant="quiet" icon={Eye} onClick={() => toast(`Opening a full preview of ${sel.title}.`, 'orange')}>Preview</Btn>
                    </div>
                  ) : (
                    <div className="ad-ask">
                      <label htmlFor="ad-note">Note to {sel.author.split(' ')[0]}</label>
                      <textarea id="ad-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Say what to change and why." autoFocus />
                      <div className="ad-acts">
                        <Btn variant="secondary" icon={CornerUpLeft} disabled={!note.trim()} onClick={() => decide(sel, 'changes')}>{note.trim() ? `Send back to ${sel.author.split(' ')[0]}` : 'Write a note to send it back'}</Btn>
                        <Btn variant="quiet" onClick={() => setAsking(false)}>Cancel</Btn>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}
      </section>

      {/* everything else: below the fold */}
      <div id="insights" className="ad-grid">
        <Performance />
        <section className="sm-card ad-top" aria-labelledby="ad-top-t">
          <h2 id="ad-top-t" className="sec-title">Top pathways</h2>
          <p className="sec-sub">By completion rate</p>
          <ul>
            {TOP_PATHWAYS.map((p) => (
              <li key={p.name}>
                <span className="ad-top__n"><b>{p.name}</b><small>{p.learners} learners</small></span>
                <Bar value={p.pct} tone={p.pct >= 85 ? 'green' : 'orange'} label={`${p.name} ${p.pct}% complete`} />
                <span className="ad-top__v">{p.pct}%</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="ad-grid ad-grid--3">
        <section className="sm-card ad-skills" aria-labelledby="ad-sk-t">
          <h2 id="ad-sk-t" className="sec-title">Skill gaps</h2>
          <p className="sec-sub">Average score against the target line</p>
          <ul>
            {SKILL_GAPS.map((s) => {
              const gap = s.target - s.v;
              return (
                <li key={s.skill}>
                  <span className="ad-skills__n">{s.skill}</span>
                  <Bar value={s.v} target={s.target} tone={gap > 0 ? 'orange' : 'green'} label={`${s.skill}: ${s.v} against a target of ${s.target}`} />
                  <span className={`ad-skills__v${gap > 0 ? ' is-gap' : ''}`}>
                    {gap > 0 ? <><TriangleAlert size={15} aria-hidden /> {gap} below</> : <><Check size={15} aria-hidden /> On target</>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="sm-card ad-act" aria-labelledby="ad-act-t">
          <h2 id="ad-act-t" className="sec-title">Recent activity</h2>
          <ul>
            {ACTIVITY.map((a) => (
              <li key={a.what}>
                {a.face ? <Avatar src={a.face} size={36} alt="" /> : <span className="ad-act__grp" aria-hidden><Users size={18} /></span>}
                <span><b>{a.who}</b> {a.what}<small>{a.when}</small></span>
              </li>
            ))}
          </ul>
        </section>

        <section className="sm-card ad-cup" aria-labelledby="ad-cup-t">
          <h2 id="ad-cup-t" className="sec-title">Upcoming tournament</h2>
          <p className="ad-cup__n"><Trophy size={20} aria-hidden /> {TOURNAMENT.name}</p>
          <ul className="ad-cup__facts">
            <li><CalendarDays size={16} aria-hidden /> {TOURNAMENT.dates}</li>
            <li><Users size={16} aria-hidden /> {TOURNAMENT.players} players from {TOURNAMENT.squads} squads</li>
          </ul>
          <p className="ad-cup__l">{TOURNAMENT.registered} of {TOURNAMENT.players} places taken · {TOURNAMENT.closes}</p>
          <Bar value={TOURNAMENT.registered} max={TOURNAMENT.players} tone="green" label="Places taken" />
          <Btn variant="secondary" iconRight={ArrowRight} onClick={() => toast('The Q4 Sales Cup rules are in your review queue.', 'orange')}>See the cup rules</Btn>
        </section>
      </div>
    </div>
  );
}

function Performance() {
  const [range, setRange] = useState<'4W' | '12W' | '6M'>('12W');
  const d = PERFORMANCE[range];
  const W = 660, H = 236, L = 44, R = 20, T = 20, B = 34;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, d.values.length - 1);
  const y = (v: number) => T + ((100 - v) / 60) * (H - T - B); // 40..100
  const pts = useMemo(() => d.values.map((v, i) => [x(i), y(v)] as const), [d]);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const area = `${line} L${x(d.values.length - 1)} ${H - B} L${L} ${H - B} Z`;
  const last = pts[pts.length - 1] ?? [0, 0];
  const every = d.labels.length > 8 ? 3 : 1;
  return (
    <section className="sm-card ad-perf" aria-labelledby="ad-perf-t">
      <div className="ad-perf__head">
        <div>
          <h2 id="ad-perf-t" className="sec-title">Learning journey performance</h2>
          <p className="sec-sub">Completion rate across all active pathways · now {d.values[d.values.length - 1]}%, target {d.target}%</p>
        </div>
        <Seg label="Time range" size="sm" value={range} onChange={setRange} options={[{ v: '4W', label: '4 weeks' }, { v: '12W', label: '12 weeks' }, { v: '6M', label: '6 months' }]} />
      </div>
      <svg className="ad-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Completion rate rose from ${d.values[0]}% to ${d.values[d.values.length - 1]}%`}>
        <defs>
          <linearGradient id="ad-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ef7a32" stopOpacity="0.32" /><stop offset="1" stopColor="#ef7a32" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[40, 60, 80, 100].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="ad-chart__grid" />
            <text x={L - 10} y={y(v) + 4} className="ad-chart__ax" textAnchor="end">{v}%</text>
          </g>
        ))}
        <line x1={L} x2={W - R} y1={y(d.target)} y2={y(d.target)} className="ad-chart__target" />
        <text x={L + 6} y={y(d.target) - 7} className="ad-chart__tl">Target {d.target}%</text>
        <path d={area} fill="url(#ad-area)" />
        <path d={line} className="ad-chart__line" />
        {pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={i === pts.length - 1 ? 5 : 3} className={i === pts.length - 1 ? 'ad-chart__last' : 'ad-chart__pt'} />)}
        <text x={last[0] - 8} y={last[1] - 12} className="ad-chart__lv" textAnchor="end">{d.values[d.values.length - 1]}%</text>
        {d.labels.map((l, i) => (i % every === 0 || i === d.labels.length - 1) && (
          <text key={l} x={x(i)} y={H - 10} className="ad-chart__ax" textAnchor="middle">{l}</text>
        ))}
      </svg>
    </section>
  );
}
