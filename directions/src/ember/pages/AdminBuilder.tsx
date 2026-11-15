// Admin · Pathway Builder: the pedestal path is the editing canvas.
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, Check, ChevronDown, CircleCheck, Eye, GitBranch, Info, Lock, Map as MapIcon, Minus, Plus, Save, ShieldCheck, SlidersHorizontal, X,
} from 'lucide-react';
import { StageGlyph } from '../icons';
import { CLAUSE_LIBRARY, LEADERSHIP_JOURNEY, TYPE_LABEL, type BuilderStage, type StageState, type StageType } from '../data';
import { World, WX } from '../World';
import { PED, Socket, Stone, Tip, Trail, type Box } from '../stage';
import { useStageW, useToast } from '../App';

type Approval = 'draft' | 'review' | 'approved' | 'published';

const BRANCH_BOX: Box = { x: 1452, y: 356, w: 72, h: 72 };
/** Rock spots for added stages; all stay inside the visible art on narrow (16:10) stages too. */
const FREE_SLOTS: Box[] = [
  { x: 1296, y: 420, w: 58, h: 58 },
  { x: 1188, y: 438, w: 54, h: 54 },
  { x: 770, y: 440, w: 54, h: 54 },
];

/** Gate pills on the path: each sits after the stage whose gate it shows. */
const PILLS: { id: string; x: number; y: number; tone?: 'red' }[] = [
  { id: 's1', x: 985, y: 440 },
  { id: 's2', x: 1163, y: 384 },
  { id: 's3', x: 1338, y: 338 },
  { id: 's4', x: 1500, y: 300 },
  { id: 's5', x: 1528, y: 339, tone: 'red' },
];
const SHORT: Record<string, string> = { 'Completion = 100%': '100% done', 'Duel wins ≥ 1': '1 duel win', 'Score < 70%': '< 70%', 'Loops ≤ 3': 'loop ≤ 3' };
const pillLabel = (s: BuilderStage) =>
  !s.gate.length ? 'No gate' : s.type === 'branch' ? s.gate.map((g) => SHORT[g] ?? g).join(' · ') : SHORT[s.gate[0]!] ?? s.gate[0]!;

function boxFor(s: BuilderStage, extras: BuilderStage[]): Box {
  const order = ['s1', 's2', 's3', 's4', 's5', 's6'];
  if (order.includes(s.id)) {
    return [PED.learn, PED.assess, PED.compete, PED.prove, BRANCH_BOX, PED.reward][order.indexOf(s.id)]!;
  }
  return FREE_SLOTS[extras.indexOf(s) % FREE_SLOTS.length] ?? FREE_SLOTS[0]!;
}

const PHRASE: Record<string, string> = {
  'Score ≥ 80%': 'score 80% or higher',
  'Score ≥ 85%': 'score 85% or higher',
  'Completion = 100%': 'finish every lesson',
  'Duel wins ≥ 1': 'win at least one duel',
  'Rank ≤ Gold I': 'reach Gold I or better',
  'Placement ≤ 4': 'finish in the top 4',
  'Attempts ≤ 2': 'within 2 attempts',
  'Streak ≥ 3 days': 'keep a 3-day streak',
  "Role = 'Field Sales'": 'be in Field Sales',
  'Score < 70%': 'score below 70% on the Final Challenge',
  'Loops ≤ 3': 'at most 3 loops, then a coach checkpoint',
  'All stages cleared': 'clear every stage',
};

export function AdminBuilder() {
  const toast = useToast();
  const [stages, setStages] = useState<BuilderStage[]>(() =>
    LEADERSHIP_JOURNEY.map((s) => (s.id === 's3' ? { ...s, timeLimit: 'No window' } : { ...s, gate: [...s.gate] })),
  );
  const [extras, setExtras] = useState<BuilderStage[]>([]);
  const [sel, setSel] = useState('s2');
  const [approval, setApproval] = useState<Approval>('draft');
  const [preview, setPreview] = useState(false);
  const [adding, setAdding] = useState<null | 'stage' | 'branch'>(null);
  const [clauseOpen, setClauseOpen] = useState(false);
  const [saved, setSaved] = useState('saved 2 min ago');
  const [ver, setVer] = useState(3);
  const timer = useRef<number | undefined>(undefined);

  const all = [...stages, ...extras];
  const stage = all.find((s) => s.id === sel) ?? stages[1]!;
  const idx = all.indexOf(stage);
  // the stage a gate unlocks is the next one on the main path (branches sit off it)
  const mainPath = all.filter((s) => s.type !== 'branch');
  const next = stage.type === 'branch' ? undefined : mainPath[mainPath.indexOf(stage) + 1];
  const full = extras.length >= FREE_SLOTS.length;

  // computed every render (not memoised) so each Fix calls the current `update`, never a stale one
  const lint = (() => {
    const out: { level: 'ok' | 'warn' | 'error'; text: string; fix?: () => void }[] = [];
    const ungated = all.filter((s) => s.gate.length === 0);
    out.push(ungated.length ? { level: 'error', text: ungated.length > 1 ? `${ungated.length} stages have no gate` : `${ungated[0]!.name} has no gate` } : { level: 'ok', text: 'Every stage has a gate' });
    const branches = all.filter((s) => s.type === 'branch');
    const noExit = branches.filter((b) => !b.gate.some((g) => g.startsWith('Loops')));
    out.push(noExit.length ? { level: 'error', text: `${noExit[0]!.name} has no loop cap`, fix: () => update(noExit[0]!.id, { gate: [...noExit[0]!.gate, 'Loops ≤ 3'] }) } : { level: 'ok', text: 'Remedial branch exits after 3 loops' });
    const arena = all.find((s) => s.id === 's3');
    out.push(arena && arena.timeLimit === 'No window'
      ? { level: 'warn', text: 'Strategy Arena has no time window', fix: () => update('s3', { timeLimit: '3 days' }) }
      : { level: 'ok', text: 'Every arena has a time window' });
    out.push({ level: 'ok', text: 'Reward stage is reachable' });
    return out;
  })();
  const errors = lint.filter((l) => l.level === 'error').length;
  const warns = lint.filter((l) => l.level === 'warn').length;

  /** Any edit withdraws a pending review (and its approval timer); after publishing it starts the next version. */
  function reopenDraft() {
    window.clearTimeout(timer.current);
    if (approval === 'published') setVer((v) => v + 1);
    if (approval !== 'draft') setApproval('draft');
  }

  function update(id: string, patch: Partial<BuilderStage>) {
    // a click that changes nothing (a stepper at its limit, the option already chosen) must not reopen the draft
    const cur = all.find((s) => s.id === id);
    if (cur && Object.entries(patch).every(([k, v]) => JSON.stringify(cur[k as keyof BuilderStage]) === JSON.stringify(v))) return;
    setStages((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setExtras((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setSaved('unsaved changes');
    reopenDraft();
  }

  function pick(id: string) {
    setSel(id);
    setClauseOpen(false);
    setAdding(null);
  }

  function addStage(type: StageType) {
    if (full) {
      setAdding(null);
      toast(`This mockup's canvas holds ${all.length} stages — there is no free spot for another.`);
      return;
    }
    const id = `x${Date.now()}`;
    const s: BuilderStage = {
      id, type, name: type === 'branch' ? 'New Branch' : `New ${TYPE_LABEL[type]} Stage`, product: 'Choose a product', productKind: '—',
      timeLimit: '7 days', attempts: 1, difficulty: 'Fixed', items: null, requireCompletion: true,
      gate: type === 'branch' ? ['Score < 70%'] : [],
    };
    setExtras((e) => [...e, s]);
    setSel(id);
    setAdding(null);
    setClauseOpen(false);
    setSaved('unsaved changes');
    reopenDraft();
    toast(type === 'branch' ? `Branch added as stage ${all.length + 1} — give it an exit before you submit.` : `${TYPE_LABEL[type]} stage added as stage ${all.length + 1} — give it a gate.`);
  }

  function submit() {
    setApproval('review');
    setSaved('saved just now');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setApproval('approved'), 3600);
  }
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // the Add-stage and Add-condition menus close on Escape or a click elsewhere
  useEffect(() => {
    if (!adding && !clauseOpen) return;
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.em-typepick, [data-toggle="stage"]')) setAdding(null);
      if (!t.closest('.em-clause-menu, .em-clause--add')) setClauseOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setAdding(null); setClauseOpen(false); }
    };
    addEventListener('mousedown', close);
    addEventListener('keydown', esc);
    return () => { removeEventListener('mousedown', close); removeEventListener('keydown', esc); };
  }, [adding, clauseOpen]);

  const learnerState = (i: number): StageState => (i === 0 ? 'current' : 'locked');

  return (
    <>
      {/* hero first in the DOM so Tab reaches the primary action before the canvas (paint order is z-index) */}
      {/* hero copy: the journey and its approval gate */}
      <section className="em-hero" aria-labelledby="em-b-title">
        <p className="em-eyebrow">Pathway Builder</p>
        <span className={`em-status is-${approval}`}>{statusText(approval, saved, ver)}</span>
        <h1 id="em-b-title" className="em-h1 em-h1--md">
          Product Leadership
          <br />
          <em>Journey</em>
        </h1>
        <p className="em-meta">
          {all.length} stages · Product Managers cohort · 214 learners · authored by Rania Saleh
        </p>
        <Stepper approval={approval} />
        {approval === 'draft' && (
          <button type="button" className="em-btn em-btn--fire em-b-cta" disabled={errors > 0} onClick={submit} title={errors ? 'Fix the errors in the Journey Overview first' : undefined}>
            {errors ? `Fix ${errors} error${errors > 1 ? 's' : ''} first` : 'Submit for Review'}
            <span className="em-btn__disc"><ArrowRight size={14} strokeWidth={2.4} /></span>
          </button>
        )}
        {approval === 'review' && (
          <button type="button" className="em-btn em-btn--fire em-b-cta is-wait" disabled>
            Awaiting Approval
            <span className="em-btn__disc"><i className="em-spin" /></span>
          </button>
        )}
        {approval === 'approved' && (
          <button type="button" className="em-btn em-btn--yellow em-b-cta" onClick={() => { setApproval('published'); toast('Published — live for 214 learners in the Product Managers cohort.'); }}>
            Publish Journey <ArrowRight size={16} strokeWidth={2.4} />
          </button>
        )}
        {approval === 'published' && (
          <span className="em-btn em-btn--done em-b-cta"><CircleCheck size={17} /> Published</span>
        )}
        <button type="button" className="em-btn em-btn--dark em-b-save" onClick={() => { setSaved('saved just now'); toast(`Draft saved — version ${ver}.`); }}>
          <Save size={15} strokeWidth={2} /> Save Draft
        </button>
      </section>

      <World clean dim={preview}>
        {/* branch loop: Final Challenge → Remedial Path → back */}
        <Trail kind="branch" d="M1442 300 C1466 316 1474 332 1482 356" />
        <Trail kind="cold" d="M1454 404 C1422 404 1402 372 1398 306" />

        {all.map((s, i) => {
          const box = boxFor(s, extras);
          const isPed = !s.id.startsWith('x') && s.id !== 's5';
          const order = all.indexOf(s) + 1;
          return (
            <Stone
              key={s.id}
              box={box}
              type={s.type}
              small={!isPed}
              n={order}
              state={preview ? learnerState(i) : s.id === sel ? 'current' : 'open'}
              selected={preview && s.id === sel}
              onClick={() => pick(s.id)}
              className={s.id.startsWith('x') ? 'is-new' : ''}
              tip={
                <Tip
                  kicker={`Stage ${order} · ${TYPE_LABEL[s.type]}`}
                  title={s.name}
                  rows={[
                    ['Product', `${s.product}`],
                    ['Gate', s.gate.length ? s.gate.join(' · ') : 'None yet'],
                  ]}
                />
              }
            />
          );
        })}
        {[BRANCH_BOX, ...extras.map((e) => boxFor(e, extras))].map((b, i) => (
          <Socket key={i} x={b.x + b.w / 2} y={b.y + b.h + 2} w={b.w * 1.15} state="open" />
        ))}

        {!preview &&
          PILLS.map((p) => {
            const owner = stages.find((s) => s.id === p.id)!;
            return <GatePill key={p.id} x={p.x} y={p.y} label={pillLabel(owner)} title={`Gate of ${owner.name}`} tone={p.tone} onClick={() => pick(p.id)} active={sel === p.id} />;
          })}
        {/* canvas toolbar */}
        <div className="em-tools" role="toolbar" aria-label="Canvas">
          {preview ? (
            <>
              <span className="em-tools__label"><Eye size={14} /> Learner preview · Product Managers</span>
              <button type="button" className="em-tools__btn is-on" onClick={() => setPreview(false)}><X size={14} /> Exit preview</button>
            </>
          ) : (
            <>
              <span className="em-tools__label"><MapIcon size={14} /> Canvas · {all.length} stages</span>
              <button type="button" data-toggle="stage" aria-haspopup="menu" aria-expanded={adding === 'stage'} className={'em-tools__btn' + (adding === 'stage' ? ' is-on' : '')} onClick={() => (full ? addStage('learn') : setAdding(adding === 'stage' ? null : 'stage'))}><Plus size={14} strokeWidth={2.4} /> Add stage</button>
              <button type="button" className="em-tools__btn" onClick={() => addStage('branch')}><GitBranch size={14} /> Add branch</button>
              <button type="button" className="em-tools__btn is-ghost" onClick={() => { setPreview(true); setAdding(null); setClauseOpen(false); }}><Eye size={14} /> Preview as learner</button>
            </>
          )}
          {adding === 'stage' && (
            <div className="em-typepick" role="menu">
              {(['learn', 'assess', 'compete', 'prove', 'reward'] as StageType[]).map((t) => (
                <button key={t} type="button" role="menuitem" onClick={() => addStage(t)}>
                  <StageGlyph type={t} size={18} tone={t === 'compete' || t === 'prove' ? 'fire' : 'silver'} />
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          )}
        </div>
      </World>


      <div className="em-cards">
        {/* Stage settings */}
        <section className="em-card em-set" aria-label="Stage settings">
          <header className="em-card__head">
            <SlidersHorizontal size={20} strokeWidth={2} color="#ef6f2e" />
            <h2>Stage Settings</h2>
            <span className="em-pill em-pill--orange em-head-pill">
              <StageGlyph type={stage.type} size={13} tone="fire" /> {TYPE_LABEL[stage.type]} · Stage {idx + 1}
            </span>
          </header>
          <div className="em-form">
            <div className="em-field em-field--wide">
              <span>Product</span>
              <button type="button" className="em-ctl em-ctl--select" onClick={() => toast('Product picker: Courses, Assessments, the 36 Battle Arenas, Tournaments, Live Sessions, Reward Drops.')}>
                <b>{stage.product}</b>
                <i>{stage.productKind}</i>
                <ChevronDown size={15} />
              </button>
            </div>
            <label className="em-field">
              <span>Time limit</span>
              <span className={'em-ctl em-ctl--select' + (stage.timeLimit === 'No window' ? ' is-warn' : '')}>
                <select
                  value={stage.timeLimit}
                  onChange={(e) => update(stage.id, { timeLimit: e.target.value })}
                  aria-label="Time limit"
                >
                  {['No window', '20 min', '45 min', '3 days', '5 days', '7 days', '—'].map((o) => <option key={o}>{o}</option>)}
                </select>
                <ChevronDown size={15} />
              </span>
            </label>
            <div className="em-field">
              <span>Attempts</span>
              <span className="em-ctl em-ctl--step">
                <button type="button" aria-label="Fewer attempts" disabled={stage.attempts <= 1} title={stage.attempts <= 1 ? 'At least 1 attempt' : undefined} onClick={() => update(stage.id, { attempts: Math.max(1, stage.attempts - 1) })}><Minus size={14} /></button>
                <b>{stage.attempts}</b>
                <button type="button" aria-label="More attempts" disabled={stage.attempts >= 5} title={stage.attempts >= 5 ? 'At most 5 attempts' : undefined} onClick={() => update(stage.id, { attempts: Math.min(5, stage.attempts + 1) })}><Plus size={14} /></button>
              </span>
            </div>
            <div className="em-field">
              <span>Difficulty</span>
              <span className="em-ctl em-seg" role="radiogroup">
                {(['Fixed', 'Adaptive'] as const).map((d) => (
                  <button key={d} type="button" role="radio" aria-checked={stage.difficulty === d} className={stage.difficulty === d ? 'is-on' : ''} onClick={() => update(stage.id, { difficulty: d })}>{d}</button>
                ))}
              </span>
            </div>
            <div className="em-field">
              <span>Items</span>
              <span className="em-ctl em-ctl--plain"><b>{stage.items ?? '—'}</b><i>{stage.items ? (stage.difficulty === 'Adaptive' ? 'adaptive pool of 40' : 'fixed set') : 'not item-based'}</i></span>
            </div>
            <div className="em-field em-field--wide em-field--row">
              <span>Require completion<small>Learners must finish this stage before the gate is checked</small></span>
              <button
                type="button"
                role="switch"
                aria-label="Require completion"
                aria-checked={stage.requireCompletion}
                className={'em-switch' + (stage.requireCompletion ? ' is-on' : '')}
                onClick={() => update(stage.id, { requireCompletion: !stage.requireCompletion })}
              ><i /></button>
            </div>
          </div>
        </section>

        {/* Gate conditions */}
        <section className="em-card em-gate" aria-label="Gate conditions">
          <header className="em-card__head">
            <Lock size={19} strokeWidth={2} color="#ef6f2e" />
            <h2>Gate Conditions</h2>
            <span className="em-head-note">Condition Engine</span>
          </header>
          <p className="em-gate__lead">
            {stage.type === 'branch' ? (
              <>Learners are routed to <b>{stage.name}</b> when:</>
            ) : (
              <>Learners clear <b>{stage.name}</b>{next ? <> and unlock <b>{next.name}</b></> : null} when <b>all</b> of these are true:</>
            )}
          </p>
          <div className="em-clauses">
            {stage.gate.map((g) => (
              <span key={g} className="em-clause">
                {g}
                <button type="button" aria-label={`Remove ${g}`} onClick={() => update(stage.id, { gate: stage.gate.filter((x) => x !== g) })}><X size={12} strokeWidth={2.6} /></button>
              </span>
            ))}
            <button type="button" className="em-clause em-clause--add" aria-haspopup="menu" aria-expanded={clauseOpen} onClick={() => setClauseOpen(!clauseOpen)}>
              <Plus size={13} strokeWidth={2.6} /> Add condition
            </button>
            {clauseOpen && (
              <div className="em-clause-menu" role="menu">
                {[...CLAUSE_LIBRARY, 'Loops ≤ 3'].filter((c) => !stage.gate.includes(c)).map((c) => (
                  <button key={c} type="button" role="menuitem" onClick={() => { update(stage.id, { gate: [...stage.gate, c] }); setClauseOpen(false); }}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="em-gate__fail">
            <GitBranch size={16} />
            <span>
              {stage.type === 'branch'
                ? <>Loops back to <b>Final Challenge</b> · the 3rd loop routes to a human coach checkpoint</>
                : <>If not met: <b>Remedial Path</b> · up to 3 loops, then a coach checkpoint</>}
            </span>
          </div>
          <div className="em-gate__say">
            <span><Info size={13} /> Learners see</span>
            <q>{sentence(stage)}</q>
          </div>
        </section>

        {/* Journey overview */}
        <section className="em-card em-over" aria-label="Journey overview">
          <header className="em-card__head">
            <MapIcon size={20} strokeWidth={2} color="#ef6f2e" />
            <h2>Journey Overview</h2>
            <span className={`em-pill em-head-pill ${errors ? 'em-pill--red' : warns ? 'em-pill--yellow' : 'em-pill--green'}`}>
              {errors ? `${errors} error${errors > 1 ? 's' : ''}` : warns ? `${warns} warning` : 'Lint clean'}
            </span>
          </header>
          <MiniMap stages={all} sel={sel} onSel={pick} />
          <p className="em-over__facts">{all.length} stages · ~3 weeks · 214 learners</p>
          <ul className="em-lint">
            {lint.map((l) => (
              <li key={l.text} className={`is-${l.level}`}>
                {l.level === 'ok' ? <Check size={13} strokeWidth={3} /> : <ShieldCheck size={13} strokeWidth={2.4} />}
                <span>{l.text}</span>
                {l.fix && <button type="button" onClick={l.fix}>Fix</button>}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function statusText(a: Approval, saved: string, ver: number) {
  if (a === 'draft') return `Draft v${ver} · ${saved}`;
  if (a === 'review') return 'In review · Karim Adel';
  if (a === 'approved') return 'Approved by Karim Adel';
  return `Live · v${ver}`;
}

function sentence(s: BuilderStage) {
  if (!s.gate.length) return 'No gate yet — learners would pass straight through. Add a condition.';
  const parts = s.gate.map((g) => PHRASE[g] ?? g.toLowerCase());
  const body = parts.join(', ').replace(/, ([^,]*)$/, ' and $1');
  if (s.type === 'branch') return `If you ${body}, you are routed to ${s.name} before trying again.`;
  if (s.type === 'reward') return `${s.name} unlocks when you ${body}.`;
  return `${body.charAt(0).toUpperCase()}${body.slice(1)} in ${s.name} to unlock the next stage.`;
}

function GatePill({ x, y, label, title, onClick, active, tone }: { x: number; y: number; label: string; title: string; onClick: () => void; active?: boolean; tone?: 'red' }) {
  return (
    <button type="button" className={'em-gatepill' + (active ? ' is-on' : '') + (tone ? ` is-${tone}` : '')} style={{ left: WX(x), top: y }} onClick={onClick} title={title} aria-pressed={active}>
      {tone === 'red' ? <GitBranch size={11} strokeWidth={2.4} /> : <Lock size={10} strokeWidth={2.6} />}
      {label}
    </button>
  );
}

const STEPS: { k: Approval; label: string }[] = [
  { k: 'draft', label: 'Draft' },
  { k: 'review', label: 'In review' },
  { k: 'approved', label: 'Approved' },
  { k: 'published', label: 'Published' },
];

function Stepper({ approval }: { approval: Approval }) {
  const at = STEPS.findIndex((s) => s.k === approval);
  return (
    <ol className="em-stepper" aria-label="Approval">
      {STEPS.map((s, i) => (
        <li key={s.k} className={i < at || approval === 'published' ? 'is-done' : i === at ? 'is-now' : ''}>
          <i>{i < at || approval === 'published' ? <Check size={10} strokeWidth={3.4} /> : null}</i>
          <span>{s.label}</span>
        </li>
      ))}
      <li className="em-stepper__note">
        {approval === 'draft' && 'An Org Admin other than the author must approve.'}
        {approval === 'review' && 'Karim Adel (Org Admin) is reviewing your changes…'}
        {approval === 'approved' && 'Signed off — ready to publish.'}
        {approval === 'published' && 'Live — learners see it on their path now.'}
      </li>
    </ol>
  );
}

function MiniMap({ stages, sel, onSel }: { stages: BuilderStage[]; sel: string; onSel: (id: string) => void }) {
  // the overview card is ~330 px wide on narrow stages, 376 px at the concept width
  const span = useStageW() < 1600 ? 250 : 276;
  const main = stages.filter((s) => s.type !== 'branch');
  const branch = stages.filter((s) => s.type === 'branch');
  const steps = Math.max(1, main.length - 1);
  // the climb keeps the same total rise however many stages there are, so nodes never reach the card header
  const pts = main.map((_, i) => ({ x: 26 + (i * span) / steps, y: 58 - (i * 28) / steps }));
  // with more than seven stages the labels would collide: only the selected one is labelled
  const crowded = main.length > 7;
  const proveIdx = main.findIndex((s) => s.type === 'prove');
  return (
    <svg className="em-mini" width="330" height="92" viewBox="0 0 330 92" role="img" aria-label="Journey mini-map">
      <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} className="em-mini__line" />
      {branch.map((b, j) => {
        const from = pts[Math.max(0, proveIdx)] ?? pts[0]!;
        const bx = Math.min(from.x + 30 + j * 40, 26 + span), by = 84;
        return (
          <g key={b.id} onClick={() => onSel(b.id)} className={'em-mini__node is-branch' + (sel === b.id ? ' is-sel' : '')}>
            <path d={`M${from.x} ${from.y} Q ${from.x + 6} ${by} ${bx} ${by}`} className="em-mini__dash" />
            <circle cx={bx} cy={by} r="7" />
          </g>
        );
      })}
      {main.map((s, i) => (
        <g key={s.id} onClick={() => onSel(s.id)} className={'em-mini__node' + (sel === s.id ? ' is-sel' : '')}>
          <title>{`Stage ${stages.indexOf(s) + 1} · ${s.name}`}</title>
          <circle cx={pts[i]!.x} cy={pts[i]!.y} r={sel === s.id ? 10 : 8} />
          {(!crowded || sel === s.id) && <text x={pts[i]!.x} y={pts[i]!.y - 15} textAnchor="middle">{TYPE_LABEL[s.type]}</text>}
        </g>
      ))}
    </svg>
  );
}
