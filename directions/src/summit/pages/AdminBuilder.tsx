import { Fragment, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Send, Save, Eye, Plus, X, ChevronLeft, ChevronRight, Copy, Trash2, Code, Map as MapIcon, CircleAlert, CircleCheck,
  TriangleAlert, Users, ChevronDown, Undo2, Lock, Check,
} from 'lucide-react';
import { Btn, Modal, STAGE_ICON, Seg, StateTag, Stepper, Toggle, useOutside, useToast } from '../ui';
import {
  ART, BUILD_STAGES, CLAUSE_META, PRODUCT_CHOICES, STAGE_DESC, STAGE_META, STAGE_ORDER, nextId,
  type BuildStage, type Clause, type ClauseType, type StageType,
} from '../data';

/* ───────── the journey check (lint): plain-language rules, each with a fix ───────── */

type Level = 'pass' | 'problem' | 'warn';
interface Issue { rule: string; level: Exclude<Level, 'pass'>; stageId?: string; title: string; detail: string; fix?: { label: string; run: () => void } }

const RULES: { id: string; name: string }[] = [
  { id: 'product', name: 'Every stage has a product' },
  { id: 'rule', name: 'Every stage after the first has an unlock rule' },
  { id: 'exit', name: 'Remedial branches lead back into the journey' },
  { id: 'loops', name: 'Remediation loops stop at 3, then a coach steps in' },
  { id: 'cup', name: 'Tournaments have an advancement rule' },
  { id: 'reward', name: 'The journey ends with a Reward' },
  { id: 'pass', name: 'Assessments have a pass mark' },
  { id: 'window', name: 'Time limits fit inside the 30-day journey window' },
  { id: 'approver', name: 'An approver other than the author is assigned' },
  { id: 'adaptive', name: 'High-stakes checks use adaptive difficulty' },
];

const IMPACT: Record<string, string> = {
  s1: 'Everyone in the cohort starts here: 214 learners.',
  s2: 'About 86% of learners meet this rule on the first try (184 of 214).',
  s3: 'About 68% of learners meet this rule on the first try (146 of 214).',
  s4: 'About 61% of learners meet this rule on the first try (131 of 214).',
  s5: 'Expected to catch about 18% of learners (39 of 214).',
  s6: 'About 57% of learners reach the certificate (122 of 214).',
};

const isCup = (s: BuildStage) => s.type === 'prove' && s.productKind.startsWith('Tournament');

function brief(s: BuildStage) {
  const c = s.clauses[0];
  if (!c) return 'No unlock rule yet';
  const hi = c.text.match(/^Score (\d+)% or higher in (.+)$/);
  const lo = c.text.match(/^Score below (\d+)% in (.+)$/);
  const base = hi ? `${hi[1]}% or more in ${hi[2]}` : lo ? `Below ${lo[1]}% in ${lo[2]}` : c.type === 'cohort' ? 'Product Managers and Owners' : c.text;
  return s.clauses.length > 1 ? `${base}, +${s.clauses.length - 1} more` : base;
}

function defaultClause(type: StageType, prev?: BuildStage): Clause {
  const p = prev?.title ?? 'the previous stage';
  const make = (t: ClauseType, text: string, code: string): Clause => ({ id: nextId('c'), type: t, text, code });
  switch (type) {
    case 'learn': case 'assess': return make('completion', `Complete ${p}`, 'stage.progress = 100%');
    case 'compete': return make('score', `Score 80% or higher in ${p}`, 'quiz.score >= 80');
    case 'prove': return make('battle', `Win 2 of 3 duels in ${p}`, 'duels.wins >= 2');
    case 'branch': return make('score', `Score below 70% in ${p}`, 'score < 70');
    default: return make('score', `Score 80% or higher in ${p}`, 'final.score >= 80');
  }
}

const ITEM_UNIT: Record<StageType, string> = { learn: 'modules', assess: 'questions', compete: 'scenarios', prove: 'questions', branch: 'lessons', reward: 'drop' };

export function AdminBuilder() {
  const toast = useToast();
  const [stages, setStages] = useState<BuildStage[]>(() => BUILD_STAGES.map((s) => ({ ...s, clauses: s.clauses.map((c) => ({ ...c })) })));
  const [selId, setSelId] = useState('s3');
  const [status, setStatus] = useState<'draft' | 'review'>('draft');
  const [saved, setSaved] = useState('saved 2 min ago');
  const [addAt, setAddAt] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [overview, setOverview] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [clauseOpen, setClauseOpen] = useState(false);
  const prodRef = useOutside(prodOpen, () => setProdOpen(false));
  const clauseRef = useOutside(clauseOpen, () => setClauseOpen(false));

  const idx = Math.max(0, stages.findIndex((s) => s.id === selId));
  const sel = stages[idx] ?? stages[0]!;

  // every edit goes through here: a journey in review goes back to draft when it changes
  const mutate = (fn: (list: BuildStage[]) => BuildStage[]) => {
    setStages((l) => fn(l));
    setSaved('unsaved changes');
    if (status === 'review') { setStatus('draft'); toast('Your change moved the journey back to draft. Submit it again when you are done.', 'orange'); }
  };
  const patch = (id: string, p: Partial<BuildStage>) => mutate((l) => l.map((s) => (s.id === id ? { ...s, ...p } : s)));

  /* journey check */
  const { issues, ruleState } = useMemo(() => {
    const out: Issue[] = [];
    stages.forEach((s, i) => {
      if (i > 0 && s.clauses.length === 0) {
        out.push({ rule: 'rule', level: 'problem', stageId: s.id, title: `${s.title} has no unlock rule`, detail: 'Learners would skip straight past it. Add a condition that says when it opens.',
          fix: { label: 'Add a rule', run: () => patch(s.id, { clauses: [defaultClause(s.type, stages[i - 1])] }) } });
      }
      if (s.type === 'branch' && !s.exit) {
        const back = [...stages.slice(0, i)].reverse().find((x) => x.type === 'prove' || x.type === 'assess');
        out.push({ rule: 'exit', level: 'problem', stageId: s.id, title: `${s.title} has no exit`, detail: `Learners who enter it have no way back. Send them back to ${back?.title ?? 'the stage before'} after the refresher.`,
          fix: { label: `Send back to ${back?.title ?? 'the stage before'}`, run: () => patch(s.id, { exit: back?.title ?? stages[Math.max(0, i - 1)]!.title }) } });
      }
      if (s.type === 'branch' && s.retries > 3) {
        out.push({ rule: 'loops', level: 'problem', stageId: s.id, title: `${s.title} allows ${s.retries} loops`, detail: 'Remediation stops at 3 loops; the third sends the learner to a coach.',
          fix: { label: 'Set to 3 loops', run: () => patch(s.id, { retries: 3 }) } });
      }
      if (isCup(s)) {
        const nx = stages[i + 1];
        if (!nx || !nx.clauses.some((c) => c.type === 'placement')) {
          out.push({ rule: 'cup', level: 'problem', stageId: s.id, title: `${s.title} has no advancement rule`, detail: 'Say who moves on from the cup, for example the top 4.',
            fix: nx ? { label: 'Top 4 advance', run: () => patch(nx.id, { clauses: [...nx.clauses, { id: nextId('c'), type: 'placement', text: `Place 4th or better in ${s.title}`, code: 'cup.place <= 4' }] }) } : undefined });
        }
      }
      if (s.type === 'prove' && !isCup(s) && s.difficulty === 'Fixed') {
        out.push({ rule: 'adaptive', level: 'warn', stageId: s.id, title: `${s.title} uses a fixed question set`, detail: 'Adaptive difficulty is recommended for high-stakes checks. It does not block submitting.',
          fix: { label: 'Make it adaptive', run: () => patch(s.id, { difficulty: 'Adaptive' }) } });
      }
    });
    if (stages[stages.length - 1]?.type !== 'reward') {
      out.push({ rule: 'reward', level: 'problem', title: 'The journey does not end with a Reward', detail: 'Add a Reward stage at the end so learners get their badge or certificate.' });
    }
    const rs: Record<string, Level> = {};
    RULES.forEach((r) => { rs[r.id] = 'pass'; });
    out.forEach((x) => { if (rs[x.rule] !== 'problem') rs[x.rule] = x.level; });
    return { issues: out, ruleState: rs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages]);

  const problems = issues.filter((x) => x.level === 'problem');
  const warns = issues.filter((x) => x.level === 'warn');
  const passed = RULES.filter((r) => ruleState[r.id] === 'pass');
  const stageLevel = (s: BuildStage): Level => (issues.some((x) => x.stageId === s.id && x.level === 'problem') ? 'problem' : issues.some((x) => x.stageId === s.id) ? 'warn' : 'pass');

  /* actions */
  const insert = (type: StageType) => {
    const at = addAt ?? stages.length;
    const choice = PRODUCT_CHOICES[type][0]!;
    const s: BuildStage = {
      id: nextId('s'), type, title: choice.name, product: choice.name, productKind: choice.kind, timeLimit: 'Off', items: type === 'reward' ? 1 : 10,
      itemUnit: ITEM_UNIT[type], difficulty: 'Fixed', retries: type === 'branch' ? 3 : 1, required: type !== 'branch', match: 'all', clauses: [defaultClause(type, stages[at - 1])],
    };
    const before = stages;
    mutate((l) => [...l.slice(0, at), s, ...l.slice(at)]);
    setSelId(s.id);
    setAddAt(null);
    toast(`${STAGE_META[type].label} stage added: ${s.title}.`, 'green', { label: 'Undo', run: () => { setStages(before); setSelId(sel.id); } });
  };
  const move = (dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= stages.length) return;
    mutate((l) => { const n = [...l]; const a = n[idx]!; n[idx] = n[j]!; n[j] = a; return n; });
  };
  const duplicate = () => {
    const copy = { ...sel, id: nextId('s'), title: `${sel.title} (copy)`, clauses: sel.clauses.map((c) => ({ ...c, id: nextId('c') })) };
    mutate((l) => [...l.slice(0, idx + 1), copy, ...l.slice(idx + 1)]);
    setSelId(copy.id);
    toast(`Duplicated ${sel.title}.`, 'green');
  };
  const remove = () => {
    if (stages.length <= 1) return;
    const before = stages; const was = sel;
    mutate((l) => l.filter((s) => s.id !== was.id));
    setSelId(stages[idx + 1]?.id ?? stages[idx - 1]?.id ?? stages[0]!.id);
    toast(`Deleted ${was.title}.`, 'orange', { label: 'Undo', run: () => { setStages(before); setSelId(was.id); } });
  };
  const submit = () => {
    setStatus('review');
    setSaved('saved just now');
    toast('Submitted for review. Another Org Admin approves it before learners see it.', 'green', { label: 'Withdraw', run: () => setStatus('draft') });
  };

  const SelIcon = STAGE_ICON[sel.type];
  const blocked = problems.length > 0;

  return (
    <div className="ab">
      {/* header: what this is, where it is in the approval flow, and the one primary action */}
      <section className="ab-head tk-dark" aria-labelledby="ab-title">
        <img className="ab-head__art" src={ART.builder} width={240} height={220} alt="" draggable={false} />
        <div className="ab-head__txt">
          <p className="eyebrow">Draft v7 · {saved}</p>
          <h1 id="ab-title" className="pg-title">Product Leadership Journey</h1>
          <p className="pg-sub">For Product Managers and Owners · {stages.length} stages · about 4 hours</p>
          <ol className="ab-flow" aria-label="Approval steps">
            {(['Draft', 'In review', 'Approved', 'Published'] as const).map((t, i) => {
              const at = status === 'draft' ? 0 : 1;
              return (
                <li key={t} className={i < at ? 'is-done' : i === at ? 'is-now' : ''} aria-current={i === at ? 'step' : undefined}>
                  <span aria-hidden>{i < at ? <Check size={13} strokeWidth={3} /> : i + 1}</span>{t}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="ab-head__acts">
          {status === 'draft' ? (
            <>
              <Btn variant="primary" size="lg" icon={Send} disabled={blocked} aria-describedby="ab-why" onClick={submit}>Submit for review</Btn>
              <p id="ab-why" className={`ab-why${blocked ? ' is-bad' : ''}`}>
                {blocked ? <><CircleAlert size={16} aria-hidden /> Fix {problems.length} {problems.length === 1 ? 'problem' : 'problems'} to submit</> : <><CircleCheck size={16} aria-hidden /> Ready. An approver signs off next.</>}
              </p>
            </>
          ) : (
            <>
              <Btn variant="primary" size="lg" icon={Send} disabled aria-describedby="ab-why">In review</Btn>
              <p id="ab-why" className="ab-why">Waiting for an approver. Publishing opens once it is approved.</p>
            </>
          )}
          <div className="ab-head__sec">
            <Btn variant="secondary" icon={Save} onClick={() => { setSaved('saved just now'); toast('Draft saved.', 'green'); }}>Save draft</Btn>
            <Btn variant="quiet" icon={Eye} onClick={() => setPreview(true)}>Preview as learner</Btn>
          </div>
        </div>
      </section>

      {/* the canvas: stages in order */}
      <section className="sm-card ab-canvas" aria-labelledby="ab-canvas-t">
        <div className="ab-canvas__head">
          <div className="ab-canvas__ttl">
            <h2 id="ab-canvas-t" className="sec-title">Stages</h2>
            <p className="sec-sub">Select a stage to edit it, or use + to insert one.</p>
          </div>
          <Btn variant="quiet" icon={MapIcon} aria-expanded={overview} onClick={() => setOverview((o) => !o)}>{overview ? 'Hide overview' : 'Journey overview'}</Btn>
        </div>
        <AnimatePresence initial={false}>
          {overview && (
            <motion.div className="ab-mini" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24 }}>
              <div className="ab-mini__in">
                <p><b>{stages.length} stages</b> · {stages.filter((s) => s.type === 'branch').length} branch · {stages.filter((s) => s.required).length} required · ends with {stages[stages.length - 1]?.type === 'reward' ? 'a Reward' : 'no Reward'}</p>
                <ol>
                  {stages.map((s, i) => {
                    const I = STAGE_ICON[s.type];
                    return (
                      <li key={s.id} className={`${s.type === 'branch' ? 'is-branch' : ''}${s.id === sel.id ? ' is-sel' : ''}`}>
                        <button type="button" onClick={() => setSelId(s.id)} aria-label={`Stage ${i + 1}, ${s.title}`}><I size={15} aria-hidden /></button>
                        <small>{i + 1} · {STAGE_META[s.type].label}{s.type === 'branch' ? ', only if needed' : ''}</small>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <ol className="ab-row">
          {stages.map((s, i) => {
            const I = STAGE_ICON[s.type];
            const lv = stageLevel(s);
            return (
              <Fragment key={s.id}>
                <li className="ab-cell">
                  <button type="button" className={`ab-stage is-${lv}${s.id === sel.id ? ' is-sel' : ''}${s.type === 'branch' ? ' is-branch' : ''}`} aria-pressed={s.id === sel.id} onClick={() => setSelId(s.id)}>
                    <span className="ab-stage__top">
                      <span className="ab-stage__ic" aria-hidden><I size={20} strokeWidth={1.9} /></span>
                      <span className="ab-stage__type">{i + 1} · {STAGE_META[s.type].label}</span>
                    </span>
                    <b className="ab-stage__t">{s.title}</b>
                    <span className="ab-stage__g">{brief(s)}</span>
                    {lv === 'problem' ? <StateTag kind="problem" label="Needs a fix" /> : lv === 'warn' ? <StateTag kind="warn" label="1 suggestion" /> : <StateTag kind="ready" />}
                  </button>
                </li>
                <li className="ab-join">
                  <button type="button" onClick={() => setAddAt(i + 1)} aria-label={i === stages.length - 1 ? 'Add a stage at the end' : `Insert a stage after ${s.title}`} title={i === stages.length - 1 ? 'Add a stage at the end' : 'Insert a stage here'}>
                    <Plus size={16} strokeWidth={2.4} aria-hidden />
                  </button>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </section>

      <div className="ab-work">
        {/* the selected stage */}
        <section className="sm-card ab-edit" aria-labelledby="ab-edit-t">
          <div className="ab-edit__head">
            <span className="ab-edit__ic" aria-hidden><SelIcon size={24} strokeWidth={1.9} /></span>
            <div className="ab-edit__ttl">
              <p className="eyebrow">Stage {idx + 1} of {stages.length} · {STAGE_META[sel.type].label} stage</p>
              <h2 id="ab-edit-t" className="sec-title sec-title--lg">{sel.title}</h2>
            </div>
            <div className="ab-tools" role="group" aria-label="Stage actions">
              <button type="button" className="sm-iconbtn" onClick={() => move(-1)} disabled={idx === 0} aria-label="Move earlier" title="Move earlier"><ChevronLeft size={18} /></button>
              <button type="button" className="sm-iconbtn" onClick={() => move(1)} disabled={idx === stages.length - 1} aria-label="Move later" title="Move later"><ChevronRight size={18} /></button>
              <button type="button" className="sm-iconbtn" onClick={duplicate} aria-label="Duplicate stage" title="Duplicate"><Copy size={17} /></button>
              <button type="button" className="sm-iconbtn is-danger" onClick={remove} disabled={stages.length <= 1} aria-label="Delete stage" title="Delete"><Trash2 size={17} /></button>
            </div>
          </div>

          <div className="ab-field">
            <div className="ab-field__row">
              <p className="ab-field__l">Unlock rule</p>
              {sel.clauses.length > 1 && (
                <Seg label="Learners must meet" size="sm" value={sel.match} onChange={(v) => patch(sel.id, { match: v })} options={[{ v: 'all', label: 'Meet all' }, { v: 'any', label: 'Meet any' }]} />
              )}
            </div>
            <p className="ab-field__help">
              {idx === 0 && sel.clauses.length === 0 ? 'The first stage opens for everyone in the audience.' : `Learners reach this stage when they meet ${sel.clauses.length > 1 ? (sel.match === 'all' ? 'all of these' : 'any of these') : 'this'}:`}
            </p>
            <ul className="ab-clauses">
              {sel.clauses.map((c) => (
                <li key={c.id}>
                  <span><b>{c.text}</b><small>{CLAUSE_META[c.type].label}{showCode && <code>{c.code}</code>}</small></span>
                  <button type="button" className="sm-iconbtn" aria-label={`Remove: ${c.text}`} title="Remove" onClick={() => patch(sel.id, { clauses: sel.clauses.filter((x) => x.id !== c.id) })}><X size={16} /></button>
                </li>
              ))}
              {sel.clauses.length === 0 && idx > 0 && <li className="is-empty"><CircleAlert size={17} aria-hidden /> No rule yet: learners would skip past this stage.</li>}
            </ul>
            <div className="ab-clause-acts" ref={clauseRef}>
              <Btn variant="quiet" icon={Plus} aria-expanded={clauseOpen} onClick={() => setClauseOpen((o) => !o)}>Add a condition</Btn>
              <Btn variant="quiet" icon={Code} aria-pressed={showCode} onClick={() => setShowCode((v) => !v)}>{showCode ? 'Hide code' : 'Show as code'}</Btn>
              <AnimatePresence>
                {clauseOpen && (
                  <motion.div className="sm-pop ab-menu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}>
                    <p className="sm-pop__h">Condition types</p>
                    {(Object.keys(CLAUSE_META) as ClauseType[]).map((t) => (
                      <button key={t} type="button" className="sm-pop__i" onClick={() => { const m = CLAUSE_META[t]; patch(sel.id, { clauses: [...sel.clauses, { id: nextId('c'), type: t, text: m.text, code: m.code }] }); setClauseOpen(false); }}>
                        <span><b>{CLAUSE_META[t].label}</b><small>{CLAUSE_META[t].text}</small></span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {sel.type === 'branch' && (
              <p className={`ab-exit${sel.exit ? '' : ' is-bad'}`}>
                {sel.exit ? <><CircleCheck size={17} aria-hidden /> Afterwards learners go back to <b>{sel.exit}</b>. On the third loop a coach steps in.</> : <><CircleAlert size={17} aria-hidden /> No exit yet: learners who enter this branch would be stuck.</>}
              </p>
            )}
            {IMPACT[sel.id] && <p className="ab-impact"><Users size={16} aria-hidden /> {IMPACT[sel.id]}</p>}
          </div>

          <div className="ab-field ab-field--prod">
            <p className="ab-field__l">Product</p>
            <div className="ab-prod" ref={prodRef}>
              <span><b>{sel.product}</b><small>{sel.productKind}</small></span>
              <Btn variant="secondary" size="sm" aria-expanded={prodOpen} onClick={() => setProdOpen((o) => !o)}>Change product</Btn>
              <AnimatePresence>
                {prodOpen && (
                  <motion.div className="sm-pop ab-menu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}>
                    <p className="sm-pop__h">{STAGE_META[sel.type].products}</p>
                    {PRODUCT_CHOICES[sel.type].map((p) => (
                      <button key={p.name} type="button" className={`sm-pop__i${p.name === sel.product ? ' is-hi' : ''}`} onClick={() => { patch(sel.id, { product: p.name, productKind: p.kind, title: sel.title === sel.product ? p.name : sel.title }); setProdOpen(false); toast(`Product changed to ${p.name}.`, 'green'); }}>
                        <span><b>{p.name}</b><small>{p.kind}</small></span>
                        {p.name === sel.product && <Check size={16} aria-hidden />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="ab-field">
            <p className="ab-field__l">Settings</p>
            <div className="ab-settings">
              <div className="ab-set"><span>Time limit</span>
                <Seg label="Time limit" size="sm" value={sel.timeLimit} onChange={(v) => patch(sel.id, { timeLimit: v })} options={(['Off', '24 h', '48 h', '7 days'] as const).map((v) => ({ v, label: v }))} />
              </div>
              {sel.type !== 'reward' && (
                <div className="ab-set"><span>Number of {sel.itemUnit}</span>
                  <Stepper label={`Number of ${sel.itemUnit}`} value={sel.items} min={1} max={60} onChange={(v) => patch(sel.id, { items: v })} />
                </div>
              )}
              {sel.type !== 'reward' && (
                <div className="ab-set"><span>Difficulty</span>
                  <Seg label="Difficulty" size="sm" value={sel.difficulty} onChange={(v) => patch(sel.id, { difficulty: v })} options={[{ v: 'Fixed', label: 'Fixed' }, { v: 'Adaptive', label: 'Adaptive' }]} />
                </div>
              )}
              <div className="ab-set"><span>{sel.type === 'branch' ? 'Loops before a coach' : 'Retries'}</span>
                <Stepper label={sel.type === 'branch' ? 'Loops before a coach' : 'Retries'} value={sel.retries} min={0} max={9} onChange={(v) => patch(sel.id, { retries: v })} />
              </div>
              <div className="ab-set"><span>Required to finish the journey</span>
                <Toggle label="Required to finish the journey" on={sel.required} onChange={(v) => patch(sel.id, { required: v })} />
              </div>
            </div>
          </div>
        </section>

        {/* the journey check: what blocks submitting, and how to fix it */}
        <aside className="sm-card ab-check" aria-labelledby="ab-check-t">
          <h2 id="ab-check-t" className="sec-title">Journey check</h2>
          <p className={`ab-check__sum${blocked ? ' is-bad' : ' is-ok'}`}>
            {blocked ? <><CircleAlert size={18} aria-hidden /> {problems.length} {problems.length === 1 ? 'problem blocks' : 'problems block'} submitting</> : <><CircleCheck size={18} aria-hidden /> Nothing blocks submitting</>}
          </p>
          <ul className="ab-issues">
            {[...problems, ...warns].map((x) => (
              <li key={`${x.rule}-${x.stageId ?? 'j'}`} className={`ab-issue is-${x.level}`}>
                <StateTag kind={x.level === 'problem' ? 'problem' : 'warn'} label={x.level === 'problem' ? 'Blocks submitting' : 'Suggestion'} />
                <b>{x.title}</b>
                <p>{x.detail}</p>
                <div className="ab-issue__acts">
                  {x.fix && <Btn variant="secondary" size="sm" onClick={() => { x.fix!.run(); toast(`Fixed. ${x.title} no longer applies.`, 'green'); }}>{x.fix.label}</Btn>}
                  {x.stageId && x.stageId !== sel.id && <Btn variant="quiet" size="sm" onClick={() => setSelId(x.stageId!)}>Show the stage</Btn>}
                </div>
              </li>
            ))}
          </ul>
          <details className="ab-passed">
            <summary><CircleCheck size={17} aria-hidden /> {passed.length} of {RULES.length} checks passed <ChevronDown size={17} className="ab-passed__chev" aria-hidden /></summary>
            <ul>
              {RULES.map((r) => (
                <li key={r.id} className={`is-${ruleState[r.id]}`}>
                  {ruleState[r.id] === 'pass' ? <CircleCheck size={16} aria-hidden /> : ruleState[r.id] === 'warn' ? <TriangleAlert size={16} aria-hidden /> : <CircleAlert size={16} aria-hidden />}
                  {r.name}
                </li>
              ))}
            </ul>
          </details>
        </aside>
      </div>

      {/* add a stage */}
      <Modal open={addAt !== null} onClose={() => setAddAt(null)} title={addAt !== null && addAt < stages.length ? `Insert a stage before ${stages[addAt]?.title}` : 'Add a stage at the end'}>
        <p className="sm-modal__sub">Pick the kind of stage. You can change its product and rule afterwards.</p>
        <div className="ab-types">
          {STAGE_ORDER.map((t) => {
            const I = STAGE_ICON[t];
            return (
              <button key={t} type="button" className="ab-type" onClick={() => insert(t)}>
                <span className="ab-type__ic" aria-hidden><I size={22} /></span>
                <span><b>{STAGE_META[t].label}</b><small>{STAGE_DESC[t]}</small></span>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* preview as a learner */}
      <Modal open={preview} onClose={() => setPreview(false)} title="Preview as a learner" width={560}>
        <p className="sm-modal__sub">What a Product Manager sees on day one. Stages open one at a time.</p>
        <ol className="ab-preview">
          {stages.map((s, i) => {
            const I = STAGE_ICON[s.type];
            return (
              <li key={s.id} className={i === 0 ? 'is-now' : ''}>
                <span className="ab-preview__ic" aria-hidden><I size={18} /></span>
                <span><b>{i + 1} · {s.title}</b><small>{i === 0 ? 'Open now' : s.type === 'branch' ? `Only if needed: ${brief(s).charAt(0).toLowerCase()}${brief(s).slice(1)}` : `Unlocks: ${brief(s)}`}</small></span>
                {i === 0 ? <StateTag kind="current" label="Open" /> : s.type === 'branch' ? <StateTag kind="conditional" /> : <StateTag kind="locked" />}
              </li>
            );
          })}
        </ol>
        <div className="sm-modal__foot">
          <Btn variant="secondary" icon={Undo2} onClick={() => setPreview(false)}>Back to editing</Btn>
          <span className="sm-modal__note"><Lock size={15} aria-hidden /> Learners see this only after approval.</span>
        </div>
      </Modal>
    </div>
  );
}
