import { useLayoutEffect, useRef, type ReactNode } from 'react';
import {
  ArrowDown, ArrowUp, BookOpen, Check, CircleAlert, Copy, Ellipsis, FileUp, Flame, LoaderCircle, Lock, Plus, RotateCcw,
  Swords, Target, Trash2, Trophy, Users, X,
} from 'lucide-react';
import { gsap, useGSAP, reduced } from '../motion';
import { Btn, Chip, KIND_ICON, Menu, Segmented, Stepper, Toggle, TYPE_ICON } from '../ui';
import { CLAUSES, PRODUCT_KINDS, STAGE_TYPES, type BProduct, type BStage, type Clause, type ClauseKind } from '../data';
import { updateStage, type Problem } from '../store';

export type SheetKind = 'content' | 'import' | 'preview';
export const uid = () => Math.random().toString(36).slice(2, 9);
export const ord = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
export const CLAUSE_ICON: Record<ClauseKind, typeof Target> = {
  score: Target, completion: BookOpen, battle: Swords, placement: Trophy, attempts: RotateCcw, time: Flame, cohort: Users,
};

// ── Stage editor ───────────────────────────────────────────────────────────
export function Editor({ stage, n, total, stages, problems, locked, flashId, onSheet, onFix, onMove, onDuplicate, onRemove, onFlash }: {
  stage: BStage; n: number; total: number; stages: BStage[]; problems: Problem[]; locked: boolean; flashId: string | null;
  onSheet: (k: SheetKind) => void; onFix: (p: Problem) => void; onMove: (d: -1 | 1) => void; onDuplicate: () => void; onRemove: () => void; onFlash: (id: string) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const I = TYPE_ICON[stage.type];
  useGSAP(() => {
    if (reduced()) return;
    gsap.fromTo(root.current!.querySelectorAll('.ed-anim'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.05, ease: 'onyx', clearProps: 'transform' });
  }, { scope: root });

  const setGate = (fn: (g: Clause[]) => Clause[]) => updateStage(stage.id, (s) => ({ ...s, gate: fn(s.gate) }));
  const addClause = (kind: ClauseKind) => {
    const id = uid();
    setGate((g) => [...g, { id, kind, value: CLAUSES[kind].def }]);
    onFlash(id);
  };
  const emptyAssessment = stage.products.find((p) => p.kind === 'assessment' && p.status === 'empty');
  const source = (() => { for (let i = n - 2; i >= 0; i--) if (stages[i]!.type !== 'branch') return stages[i]!; return undefined; })();
  const next = stages.slice(n).find((s) => s.type !== 'branch');

  return (
    <aside ref={root} className="editor glass g-lit" aria-label={`Stage ${n}: ${stage.name}`}>
      <div className="editor__head ed-anim">
        <Chip icon={<I size={14} />}>{STAGE_TYPES[stage.type].label}</Chip>
        <span className="editor__pos">Stage {n} of {total}</span>
        {!locked && (
          <Menu label="Stage actions" align="end" items={[
            { label: 'Move up', icon: <ArrowUp />, disabled: n === 1, onSelect: () => onMove(-1) },
            { label: 'Move down', icon: <ArrowDown />, disabled: n === total, onSelect: () => onMove(1) },
            { label: 'Duplicate', icon: <Copy />, onSelect: onDuplicate },
            { label: 'Delete stage', icon: <Trash2 />, tone: 'alert', disabled: total <= 1, onSelect: onRemove },
          ]}>
            {({ toggle, open, id }) => (
              <button type="button" className="icon-btn" aria-label="Stage actions" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={toggle}><Ellipsis size={18} /></button>
            )}
          </Menu>
        )}
      </div>
      <input
        className="editor__name ed-anim" value={stage.name} aria-label="Stage name" disabled={locked}
        onChange={(e) => updateStage(stage.id, (s) => ({ ...s, name: e.target.value }))}
      />
      <p className="editor__what ed-anim">{STAGE_TYPES[stage.type].what}.</p>
      {locked && <p className="editor__lock ed-anim"><Lock size={15} /> Editing is paused while the journey is in review or live.</p>}

      <section className="ed-sec ed-anim">
        <h3 className="ed-sec__title">Content</h3>
        <ul className="prods">
          {stage.products.map((p) => <ProductRow key={p.id} p={p} flash={flashId === p.id} onOpen={() => onSheet(p.kind === 'assessment' ? 'import' : 'content')} />)}
        </ul>
        {emptyAssessment && !locked && (
          <div className="callout">
            <p><strong>No questions yet.</strong> Import a document and let AI draft them, then edit and send them for review.</p>
            <div className="callout__row">
              <Btn kind="glass" size="sm" icon={<FileUp />} onClick={() => { const p = problems.find((x) => x.fix.kind === 'draft'); if (p) onFix(p); else onSheet('import'); }}>Import a document</Btn>
            </div>
          </div>
        )}
        {stage.products.length === 0 && <p className="ed-empty"><CircleAlert size={15} /> Learners would arrive at an empty stage.</p>}
        {!locked && <Btn kind="ghost" size="sm" icon={<Plus />} onClick={() => onSheet('content')}>{stage.products.length ? 'Add more content' : 'Add content'}</Btn>}
      </section>

      {stage.type === 'branch' ? (
        <section className="ed-sec ed-anim">
          <h3 className="ed-sec__title">Who goes here</h3>
          <p className="route">{source ? `Learners who don’t pass ${source.name}` : 'Learners who don’t pass the stage before'}{source?.gate.some((c) => c.kind === 'placement') ? ` (place ${ord(Number(source.gate.find((c) => c.kind === 'placement')!.value))} or better)` : ''}</p>
          <h3 className="ed-sec__title">Where they go next</h3>
          <Segmented<string>
            size="sm" label="Where learners go after the branch" value={stage.exitTo ?? 'none'}
            onChange={(v) => { if (locked) return; updateStage(stage.id, (s) => ({ ...s, exitTo: v })); onFlash(`exit-${stage.id}`); }}
            options={[
              ...(source ? [{ value: source.id, label: <>Back to {source.name}</> }] : []),
              ...(next ? [{ value: next.id, label: <>On to {next.name}</> }] : []),
            ]}
          />
          {!stage.exitTo && <p className="ed-empty"><CircleAlert size={15} /> Not set: learners sent here would be stuck.</p>}
          <p className="faint small">Loops are capped at 3. On the third, a coach checks in with the learner.</p>
        </section>
      ) : stage.type === 'reward' ? (
        <section className="ed-sec ed-anim">
          <h3 className="ed-sec__title">When learners get it</h3>
          <p className="route">As soon as they pass {source?.name ?? 'the stage before'}. Nothing else to set.</p>
        </section>
      ) : (
        <section className="ed-sec ed-anim">
          <h3 className="ed-sec__title">To move on, learners must</h3>
          {stage.gate.length === 0 && <p className="ed-empty"><CircleAlert size={15} /> No rule yet. Add one so learners know how to pass.</p>}
          <ul className="clauses">
            {stage.gate.map((c, i) => (
              <ClauseRow key={c.id} c={c} joiner={i > 0} locked={locked} flash={flashId === c.id}
                onChange={(v) => setGate((g) => g.map((x) => (x.id === c.id ? { ...x, value: v } : x)))}
                onRemove={() => setGate((g) => g.filter((x) => x.id !== c.id))}
              />
            ))}
          </ul>
          {!locked && (
            <Menu label="Add a condition" items={(Object.keys(CLAUSES) as ClauseKind[]).map((k) => {
              const CI = CLAUSE_ICON[k];
              return { label: CLAUSES[k].label, hint: CLAUSES[k].hint, icon: <CI />, disabled: stage.gate.some((c) => c.kind === k), onSelect: () => addClause(k) };
            })}>
              {({ toggle, open, id }) => (
                <Btn kind="ghost" size="sm" icon={<Plus />} onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}>Add a condition</Btn>
              )}
            </Menu>
          )}
        </section>
      )}

      <details className="ed-more ed-anim">
        <summary>More settings <span className="faint">time limit, difficulty, retries</span></summary>
        <div className="ed-more__body">
          <div className="setting"><span>Time limit</span>
            <Segmented<string> size="sm" label="Time limit" value={stage.settings.time} onChange={(v) => updateStage(stage.id, (s) => ({ ...s, settings: { ...s.settings, time: v } }))}
              options={[{ value: 'No limit', label: 'None' }, { value: '20 min', label: '20 min' }, { value: '45 min', label: '45 min' }]} />
          </div>
          <div className="setting"><span>Difficulty</span>
            <Segmented<'Fixed' | 'Adaptive'> size="sm" label="Difficulty" value={stage.settings.difficulty} onChange={(v) => updateStage(stage.id, (s) => ({ ...s, settings: { ...s.settings, difficulty: v } }))}
              options={[{ value: 'Fixed', label: 'Fixed' }, { value: 'Adaptive', label: 'Adaptive' }]} />
          </div>
          <div className="setting"><span>Retries allowed</span>
            <Stepper label="Retries" value={stage.settings.retries} min={0} max={5} onChange={(v) => updateStage(stage.id, (s) => ({ ...s, settings: { ...s.settings, retries: v } }))} />
          </div>
          <div className="setting"><span>Required to finish the journey</span>
            <Toggle label="Required" checked={stage.settings.required} onChange={(v) => updateStage(stage.id, (s) => ({ ...s, settings: { ...s.settings, required: v } }))} />
          </div>
        </div>
      </details>
    </aside>
  );
}

function ProductRow({ p, flash, onOpen }: { p: BProduct; flash: boolean; onOpen: () => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const I = KIND_ICON[p.kind];
  useLayoutEffect(() => {
    if (!flash || reduced() || !ref.current) return;
    gsap.fromTo(ref.current, { backgroundColor: 'rgba(255,201,63,0.2)', scale: 0.97 }, { backgroundColor: 'rgba(255,255,255,0.045)', scale: 1, duration: 1.6, ease: 'onyx' });
  }, [flash]);
  const chip = p.status === 'empty' ? <Chip tone="alert" icon={<CircleAlert size={13} />}>Empty</Chip>
    : p.status === 'review' ? <Chip tone="current" icon={<LoaderCircle size={13} />}>In review</Chip>
    : <Chip tone="done" icon={<Check size={13} />}>Ready</Chip>;
  return (
    <li ref={ref} className="prod">
      <button type="button" className="prod__btn" onClick={onOpen} aria-label={`${p.name}, ${PRODUCT_KINDS[p.kind].label}. Open`}>
        <span className="prod__icon"><I size={18} /></span>
        <span className="prod__text"><strong>{p.name}</strong><span>{PRODUCT_KINDS[p.kind].label} · {p.meta}</span></span>
        {chip}
      </button>
    </li>
  );
}

function ClauseRow({ c, joiner, locked, flash, onChange, onRemove }: { c: Clause; joiner: boolean; locked: boolean; flash: boolean; onChange: (v: number | string) => void; onRemove: () => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const I = CLAUSE_ICON[c.kind];
  useLayoutEffect(() => {
    if (!flash || reduced() || !ref.current) return;
    gsap.fromTo(ref.current, { backgroundColor: 'rgba(255,201,63,0.22)', y: 8, opacity: 0 }, { backgroundColor: 'rgba(255,255,255,0.045)', y: 0, opacity: 1, duration: 1.4, ease: 'onyx' });
  }, [flash]);
  const v = Number(c.value);
  const step = (min: number, max: number, s = 1, unit?: string, format?: (n: number) => string) =>
    locked ? <strong className="clause__v">{format ? format(v) : `${v}${unit ?? ''}`}</strong> : <Stepper label={CLAUSES[c.kind].label} value={v} min={min} max={max} step={s} unit={unit} format={format} onChange={onChange} />;
  let body: ReactNode;
  switch (c.kind) {
    case 'score': body = <>Score {step(50, 100, 5, '%')} or higher</>; break;
    case 'completion': body = <>Finish {step(10, 100, 10, '%')} of the course</>; break;
    case 'battle': body = <>Win at least {step(1, 10)} duel{v === 1 ? '' : 's'}</>; break;
    case 'placement': body = <>Place {step(1, 32, 1, undefined, ord)} or better</>; break;
    case 'attempts': body = <>In {step(1, 5)} attempt{v === 1 ? '' : 's'} or fewer</>; break;
    case 'time': body = <>Keep a {step(1, 30)} day streak</>; break;
    case 'cohort': body = <>Only learners in <strong className="clause__v">{String(c.value)}</strong></>; break;
  }
  return (
    <li ref={ref} className="clause">
      {joiner && <span className="clause__and">and</span>}
      <span className="clause__icon"><I size={16} /></span>
      <span className="clause__body">{body}</span>
      {!locked && <button type="button" className="icon-btn clause__x" aria-label={`Remove: ${CLAUSES[c.kind].label}`} onClick={onRemove}><X size={15} /></button>}
    </li>
  );
}
