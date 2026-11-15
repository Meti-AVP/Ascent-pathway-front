import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, Reorder } from 'motion/react';
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, ChevronDown, Eye, GitBranch, ListChecks, LoaderCircle, Lock, Plus, Save, Send, Swords, Trash2, Trophy, Upload, X } from 'lucide-react';
import { Brush } from '../fx/Brush';
import { clunk } from '../fx/sound';
import { buildJourney, clauseTypes, TYPE_ABOUT, TYPE_LABEL, type BuildStage, type StageType } from '../data';
import { buildSpec, TapeCover } from '../covers/TapeCover';
import { clockNow, toast } from '../store';
import { Hint } from '../shell/Shell';
import { rise, StateTag } from '../shell/ui';

type Slot = BuildStage & { blank?: boolean };
type Flow = 'draft' | 'review' | 'approved' | 'published';
type FixKind = 'exit' | 'pick' | 'last' | 'order' | 'rule';
type Issue = { key: string; title: string; why: string; target: string; fix: { label: string; kind: FixKind } };
type CheckRow = { key: string; label: string; issues: Issue[] };

const pad = (n: number) => String(n).padStart(2, '0');
const TYPES: StageType[] = ['learn', 'assess', 'compete', 'prove', 'branch', 'reward'];
const TYPE_ICON: Record<StageType, typeof BookOpen> = { learn: BookOpen, assess: ListChecks, compete: Swords, prove: Trophy, branch: GitBranch, reward: Award };
const APPROVER = 'Rania Fouad';
const AUDIENCE = 64;

const DEFAULTS: Record<StageType, Pick<BuildStage, 'product' | 'productKind' | 'gates'>> = {
  learn: { product: 'Roadmapping Fundamentals', productKind: 'Course · 4 modules', gates: ['course.progress = 100%'] },
  assess: { product: 'Roadmap Quiz', productKind: 'Assessment · 15 items', gates: ['quiz.score >= 80'] },
  compete: { product: 'Strategy Arena', productKind: 'Battle Arena', gates: ['duels.wins >= 1'] },
  prove: { product: 'Leadership Cup', productKind: 'Tournament · 32 seats', gates: ['cup.place <= 4'] },
  branch: { product: 'Remedial Path', productKind: 'Branch · remedial', gates: ['score < 70', 'loops <= 3'] },
  reward: { product: 'Bonus Drop', productKind: 'Reward Drop · 100 SYN', gates: ['stage.complete'] },
};
const CLAUSE_TEMPLATE: Record<(typeof clauseTypes)[number], string> = {
  Score: 'quiz.score >= 70',
  Completion: 'course.progress = 100%',
  'Battle result': 'duels.wins >= 1',
  Placement: 'cup.place <= 4',
  Attempts: 'attempts <= 2',
  Time: 'streak.days >= 3',
  'Cohort / Role': "role = 'Product Lead'",
};
const CLAUSE_ABOUT: Record<(typeof clauseTypes)[number], string> = {
  Score: 'a minimum quiz score',
  Completion: 'finish all the material',
  'Battle result': 'win duels in an arena',
  Placement: 'finish in the top places',
  Attempts: 'a cap on tries',
  Time: 'a streak or a date window',
  'Cohort / Role': 'only some learners',
};

/** A condition, said in words. */
function clause(c: string): { kind: string; text: string } {
  let m: RegExpMatchArray | null;
  if ((m = c.match(/score\s*>=\s*(\d+)/))) return { kind: 'Score', text: `score ${m[1]}% or higher` };
  if ((m = c.match(/score\s*<\s*(\d+)/))) return { kind: 'Score', text: `score under ${m[1]}%` };
  if (/progress\s*=\s*100%/.test(c)) return { kind: 'Completion', text: 'finish every module' };
  if ((m = c.match(/wins\s*>=\s*(\d+)/))) return { kind: 'Battle result', text: `win ${m[1]} duel${m[1] === '1' ? '' : 's'}` };
  if ((m = c.match(/place\s*<=\s*(\d+)/))) return { kind: 'Placement', text: `finish in the top ${m[1]}` };
  if ((m = c.match(/attempts\s*<=\s*(\d+)/))) return { kind: 'Attempts', text: `within ${m[1]} attempts` };
  if ((m = c.match(/loops\s*<=\s*(\d+)/))) return { kind: 'Attempts', text: `loop at most ${m[1]} times` };
  if ((m = c.match(/time\s*<=\s*(\d+)/))) return { kind: 'Time', text: `finish inside ${m[1]} minutes` };
  if ((m = c.match(/streak\.days\s*>=\s*(\d+)/))) return { kind: 'Time', text: `keep a ${m[1]}-day streak` };
  if ((m = c.match(/role\s*=\s*'(.+)'/))) return { kind: 'Cohort / Role', text: `are a ${m[1]}` };
  if ((m = c.match(/stage\[(\d+)\]\.complete/))) return { kind: 'Completion', text: `clear stage ${Number(m[1])}` };
  if (/stage\.complete/.test(c)) return { kind: 'Completion', text: 'clear the stage before it' };
  return { kind: 'Custom', text: c };
}
const listText = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function runChecks(list: Slot[], exit: boolean): CheckRow[] {
  const products: Issue[] = [];
  const rules: Issue[] = [];
  const order: Issue[] = [];
  const exits: Issue[] = [];
  const last: Issue[] = [];
  list.forEach((s, i) => {
    if (s.blank)
      products.push({ key: `blank-${s.id}`, target: s.id, title: `Stage ${i + 1} has no product yet`, why: `Learners would open an empty ${TYPE_LABEL[s.type]} stage. Pick what they do here.`, fix: { label: 'Pick a product', kind: 'pick' } });
    else if (s.gates.length === 0 && s.type !== 'reward')
      rules.push({ key: `rule-${s.id}`, target: s.id, title: `${s.title} has no unlock rule`, why: 'Without one, the next stage opens for everyone straight away.', fix: { label: 'Add the usual rule', kind: 'rule' } });
    if (s.type === 'branch') {
      if (!list.slice(0, i).some((x) => (x.type === 'assess' || x.type === 'prove') && !x.blank))
        order.push({ key: `order-${s.id}`, target: s.id, title: `${s.title} comes before any scored stage`, why: 'It routes learners by their score, so a quiz or final test has to come first.', fix: { label: 'Move it after the last scored stage', kind: 'order' } });
      if (!exit)
        exits.push({ key: `exit-${s.id}`, target: s.id, title: `${s.title} (stage ${i + 1}) has no exit`, why: 'After 3 loops a learner would be stuck here. Send them to a coach checkpoint instead.', fix: { label: 'Add coach checkpoint', kind: 'exit' } });
    }
    if (s.type === 'reward' && i !== list.length - 1)
      last.push({ key: `last-${s.id}`, target: s.id, title: `${s.title} pays out too early`, why: 'The reward should come last, after everything else is cleared.', fix: { label: 'Move it to the end', kind: 'last' } });
  });
  return [
    { key: 'exit', label: 'The remedial branch has an exit', issues: exits },
    { key: 'products', label: 'Every stage has a product', issues: products },
    { key: 'rules', label: 'Every stage has an unlock rule', issues: rules },
    { key: 'order', label: 'A scored stage comes before the branch', issues: order },
    { key: 'last', label: 'The reward is the last stage', issues: last },
  ];
}

export function Builder() {
  const [list, setList] = useState<Slot[]>(buildJourney.stages);
  const [selId, setSelId] = useState('b2');
  const [exit, setExit] = useState(false);
  const [flow, setFlow] = useState<Flow>('draft');
  const [saved, setSaved] = useState(buildJourney.saved);
  const [addOpen, setAddOpen] = useState(false);
  const [condOpen, setCondOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [flash, setFlash] = useState(0);
  const checkRef = useRef<HTMLElement>(null);

  const checks = useMemo(() => runChecks(list, exit), [list, exit]);
  const issues = checks.flatMap((c) => c.issues);
  const ok = issues.length === 0;
  const sel = list.find((s) => s.id === selId) ?? list[0]!;
  const selIdx = list.findIndex((s) => s.id === sel.id);
  const totalMin = list.reduce((a, s) => a + (s.settings.timeLimit || (s.type === 'learn' ? 180 : s.type === 'reward' ? 0 : 30)), 0);

  // the approver signs in a few seconds (mock)
  useEffect(() => {
    if (flow !== 'review') return;
    const id = window.setTimeout(() => {
      setFlow('approved');
      clunk('rec');
      toast({ text: `Approved by ${APPROVER}`, detail: `You can publish it to the ${AUDIENCE} learners in Product Leads.` });
    }, 3200);
    return () => window.clearTimeout(id);
  }, [flow]);

  // any edit after submitting sends it back to draft: it needs a fresh sign-off
  const touch = () => {
    if (flow === 'draft') return;
    setFlow('draft');
    toast({ tone: 'warn', text: 'Back to draft', detail: 'You changed the journey after submitting it. Submit again when you are ready.' });
  };
  const update = (id: string, patch: Partial<Slot>) => {
    setList((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    touch();
  };
  const setting = <K extends keyof BuildStage['settings']>(k: K, v: BuildStage['settings'][K]) => {
    update(sel.id, { settings: { ...sel.settings, [k]: v } });
    clunk('tick');
  };
  const select = (id: string) => {
    if (id === selId) return;
    setSelId(id);
    setCondOpen(false);
    clunk('tick');
  };

  const pickProduct = (s: Slot) => {
    const d = DEFAULTS[s.type];
    update(s.id, { ...d, title: d.product, blank: false, art: { ...s.art, tagline: 'Fresh off the deck.', credits: `Product Leadership · ${d.productKind}`, product: d.productKind } });
  };

  const fix = (is: Issue) => {
    const s = list.find((x) => x.id === is.target);
    switch (is.fix.kind) {
      case 'exit':
        setExit(true);
        toast({ text: 'Coach checkpoint added', detail: 'After loop 3, learners on the Remedial Path now meet a coach.' });
        break;
      case 'pick':
        if (s) {
          pickProduct(s);
          toast({ text: `Product added: ${DEFAULTS[s.type].product}`, detail: 'You can change it in the stage editor.' });
        }
        break;
      case 'rule':
        if (s) {
          update(s.id, { gates: DEFAULTS[s.type].gates });
          toast({ text: 'Unlock rule added', detail: `${s.title}: learners ${listText(DEFAULTS[s.type].gates.map((g) => clause(g).text))}.` });
        }
        break;
      case 'order':
        setList((l) => {
          const b = l.find((x) => x.id === is.target)!;
          const rest = l.filter((x) => x.id !== is.target);
          let at = -1;
          rest.forEach((x, i) => (x.type === 'assess' || x.type === 'prove') && !x.blank && (at = i));
          rest.splice(at + 1, 0, b);
          return rest;
        });
        toast({ text: 'Branch moved', detail: 'It now comes right after the last scored stage.' });
        break;
      case 'last':
        setList((l) => {
          const r = l.find((x) => x.id === is.target)!;
          return [...l.filter((x) => x.id !== is.target), r];
        });
        toast({ text: 'Reward moved to the end' });
        break;
    }
    setSelId(is.target);
    touch();
    clunk('tick');
  };

  const addStage = (type: StageType) => {
    const id = `n${Date.now()}`;
    const s: Slot = {
      id,
      type,
      title: `New ${TYPE_LABEL[type]} stage`,
      product: '',
      productKind: 'No product yet',
      gates: [],
      blank: true,
      settings: { timeLimit: 0, window: 'Open', items: type === 'assess' || type === 'prove' ? 15 : 0, difficulty: 'fixed', retries: 0, required: 100 },
      art: { tagline: '', credits: '', product: '' },
    };
    const at = selIdx + 1;
    setList((l) => [...l.slice(0, at), s, ...l.slice(at)]);
    setSelId(id);
    setAddOpen(false);
    touch();
    clunk('rec');
    toast({ text: `${TYPE_LABEL[type]} stage added as stage ${at + 1}`, detail: 'Pick a product for it next.', tone: 'info' });
  };

  const remove = () => {
    if (list.length <= 2) return;
    const idx = selIdx;
    const gone = sel;
    const next = list.filter((s) => s.id !== gone.id);
    setList(next);
    setSelId(next[Math.min(idx, next.length - 1)]!.id);
    touch();
    clunk('rew');
    toast({
      text: `Removed stage ${idx + 1}, ${gone.title}`,
      action: {
        label: 'Undo',
        run: () => {
          setList((l) => [...l.slice(0, idx), gone, ...l.slice(idx)]);
          setSelId(gone.id);
        },
      },
    });
  };

  const move = (d: -1 | 1) => {
    const to = selIdx + d;
    if (to < 0 || to >= list.length) return;
    setList((l) => {
      const n = [...l];
      [n[selIdx], n[to]] = [n[to]!, n[selIdx]!];
      return n;
    });
    touch();
    clunk('tick');
  };

  const submit = () => {
    if (!ok) {
      setFlash((f) => f + 1);
      checkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      window.setTimeout(() => checkRef.current?.querySelector<HTMLButtonElement>('.tp-issue .tp-btn')?.focus(), 350);
      return;
    }
    setFlow('review');
    clunk('play');
    toast({ text: `Submitted to ${APPROVER} for review`, detail: 'You will see it here the moment it is approved.' });
  };
  const publish = () => {
    setFlow('published');
    clunk('rec');
    toast({ text: 'Published', detail: `${AUDIENCE} learners in Product Leads can start stage 1 now.` });
  };

  const selIssues = issues.filter((x) => x.target === sel.id);
  const firstIssue = issues[0];
  const canItems = sel.type === 'assess' || sel.type === 'prove';
  const canDifficulty = sel.type === 'assess' || sel.type === 'prove' || sel.type === 'compete';
  const ruleText =
    sel.type === 'branch'
      ? `Learners go to this remedial path when they ${listText(sel.gates.map((g) => clause(g).text))}.`
      : sel.type === 'reward'
        ? `Learners get this reward when they ${listText(sel.gates.map((g) => clause(g).text)) || 'reach it'}.`
        : sel.gates.length
          ? `Learners unlock the next stage when they ${listText(sel.gates.map((g) => clause(g).text))}.`
          : 'No rule yet: the next stage would open for everyone straight away.';

  const STEPS: { key: Flow; label: string }[] = [
    { key: 'draft', label: 'Draft' },
    { key: 'review', label: 'In review' },
    { key: 'approved', label: 'Approved' },
    { key: 'published', label: 'Published' },
  ];
  const at = STEPS.findIndex((s) => s.key === flow);

  return (
    <main className="tp-page tp-builder">
      <header className="tp-builder__head tp-rise" style={rise(0)}>
        <div className="tp-builder__titles">
          <p className="tp-kicker">
            Pathway builder · {buildJourney.version} · saved {saved}
          </p>
          <Brush as="h1" text={buildJourney.name} className="tp-builder__title" />
        </div>
        <div className="tp-ship">
          <ol className="tp-steps" aria-label="Approval steps">
            {STEPS.map((s, i) => (
              <li key={s.key} className={i < at ? 'is-done' : i === at ? 'is-on' : ''} aria-current={i === at ? 'step' : undefined}>
                <span className="tp-steps__dot" aria-hidden>
                  {i < at ? <Check size={11} strokeWidth={3.5} /> : i + 1}
                </span>
                {s.label}
              </li>
            ))}
          </ol>
          <div className="tp-ship__act">
            <button className="tp-btn tp-btn--quiet" onClick={() => setPreview(true)}>
              <Eye size={17} aria-hidden /> Preview as learner
            </button>
            <button
              className="tp-btn tp-btn--secondary"
              onClick={() => {
                setSaved(clockNow());
                clunk('tick');
                toast({ text: 'Draft saved', detail: `Saved at ${clockNow()}. Only you can see drafts.` });
              }}
            >
              <Save size={16} aria-hidden /> Save draft
            </button>
            {flow === 'draft' &&
              (ok ? (
                <button className="tp-btn tp-btn--primary tp-btn--lg" onClick={submit}>
                  <Send size={17} aria-hidden /> Submit for review
                </button>
              ) : (
                <button className="tp-btn tp-btn--blocked" aria-disabled="true" onClick={submit}>
                  <Lock size={16} aria-hidden />
                  <span className="tp-btn__two">
                    <b>Submit for review</b>
                    <small>
                      Fix {issues.length} problem{issues.length > 1 ? 's' : ''} first
                    </small>
                  </span>
                </button>
              ))}
            {flow === 'review' && (
              <button className="tp-btn tp-btn--blocked" aria-disabled="true">
                <LoaderCircle size={16} className="tp-spin" aria-hidden />
                <span className="tp-btn__two">
                  <b>In review</b>
                  <small>Waiting for {APPROVER}</small>
                </span>
              </button>
            )}
            {flow === 'approved' && (
              <button className="tp-btn tp-btn--primary tp-btn--lg" onClick={publish}>
                <Upload size={17} aria-hidden /> Publish to {AUDIENCE} learners
              </button>
            )}
            {flow === 'published' && <StateTag kind="done">Live for {AUDIENCE} learners</StateTag>}
          </div>
        </div>
      </header>

      <section className="tp-reel tp-rise" style={rise(1)} aria-label="Stages of this journey">
        <header className="tp-reel__h">
          <h2 className="tp-reel__title">
            Stages <span>{list.length} stages · about {Math.floor(totalMin / 60)} h {pad(totalMin % 60)} min</span>
          </h2>
          <Hint id="builder-drag" className="tp-reel__hint">
            Click a tape to edit it. Drag a tape sideways to change the order.
          </Hint>
          <div className="tp-reel__add">
            <button className="tp-btn tp-btn--secondary tp-btn--sm" onClick={() => setAddOpen((o) => !o)} aria-expanded={addOpen}>
              <Plus size={16} aria-hidden /> Add a stage after stage {selIdx + 1}
            </button>
            <AnimatePresence>
              {addOpen && (
                <motion.div className="tp-menu" role="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
                  {TYPES.map((t) => {
                    const Icon = TYPE_ICON[t];
                    return (
                      <button key={t} role="menuitem" onClick={() => addStage(t)}>
                        <Icon size={18} aria-hidden />
                        <span>
                          <b>{TYPE_LABEL[t]}</b>
                          <small>{TYPE_ABOUT[t]}</small>
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>
        <Reorder.Group
          axis="x"
          values={list}
          onReorder={(l) => {
            setList(l);
            touch();
          }}
          className="tp-reel__row"
        >
          {list.map((s, i) => {
            const err = issues.filter((x) => x.target === s.id);
            const on = s.id === sel.id;
            return (
              <Reorder.Item key={s.id} value={s} className={`tp-st ${on ? 'is-sel' : ''} ${err.length ? 'is-err' : ''}`} whileDrag={{ scale: 1.04, zIndex: 6 }}>
                <button className="tp-st__btn" onClick={() => select(s.id)} aria-pressed={on} aria-label={`Stage ${i + 1}, ${TYPE_LABEL[s.type]}: ${s.title}. ${err.length ? `${err.length} problem` : 'Ready'}.${on ? ' Editing.' : ''}`}>
                  <span className="tp-st__n">
                    {pad(i + 1)} · {TYPE_LABEL[s.type]}
                  </span>
                  <span className="tp-st__cover">
                    {s.blank ? (
                      <span className="tp-blank">
                        <b>No product yet</b>
                        <span className="tp-blank__reels" aria-hidden>
                          <i />
                          <i />
                        </span>
                      </span>
                    ) : (
                      <TapeCover spec={buildSpec(s, i, list.length)} label="" />
                    )}
                    {on && <span className="tp-st__editing">Editing</span>}
                  </span>
                  <span className="tp-st__t">{s.title}</span>
                  {err.length ? <StateTag kind="problem">{err.length} problem</StateTag> : <StateTag kind="ready">Ready</StateTag>}
                </button>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      </section>

      <section className="tp-builder__work tp-rise" style={rise(2)}>
        <div className="tp-vcrp" aria-label={`Edit stage ${selIdx + 1}`}>
          <div className="tp-vcrp__top">
            <h2 className="tp-vcrp__title">
              <span>Editing stage {selIdx + 1}</span> {sel.title}
            </h2>
            <span className="tp-vcrp__lcd" aria-hidden>
              <i className="tp-recdot" /> REC {pad(selIdx + 1)} · {TYPE_LABEL[sel.type].toUpperCase()}
            </span>
          </div>
          <div className="tp-vcrp__cols">
            <div className="tp-vcrp__set">
              <div className="tp-field">
                <span className="tp-field__k">Product</span>
                {sel.blank ? (
                  <div className="tp-field__row">
                    <span className="tp-field__val is-empty">No product yet</span>
                    <button className="tp-btn tp-btn--secondary tp-btn--sm" onClick={() => pickProduct(sel)}>
                      Pick a product
                    </button>
                  </div>
                ) : (
                  <div className="tp-field__row">
                    <span className="tp-field__val">
                      {sel.product} <small>{sel.productKind}</small>
                    </span>
                    <button className="tp-btn tp-btn--quiet tp-btn--sm" onClick={() => toast({ tone: 'info', text: 'Product library', detail: `Choose another ${TYPE_LABEL[sel.type].toLowerCase()} product. The library is not part of this mockup.` })}>
                      Change
                    </button>
                  </div>
                )}
              </div>
              <div className="tp-vcrp__grid">
                <Stepper label="Time limit" value={sel.settings.timeLimit ? `${sel.settings.timeLimit} min` : 'None'} onDown={() => setting('timeLimit', Math.max(0, sel.settings.timeLimit - 5))} onUp={() => setting('timeLimit', Math.min(120, sel.settings.timeLimit + 5))} />
                <Stepper
                  label={sel.type === 'branch' ? 'Loops allowed' : 'Retries'}
                  value={String(sel.settings.retries)}
                  onDown={() => setting('retries', Math.max(0, sel.settings.retries - 1))}
                  onUp={() => setting('retries', Math.min(sel.type === 'branch' ? 3 : 5, sel.settings.retries + 1))}
                />
                {canItems && <Stepper label="Questions" value={String(sel.settings.items)} onDown={() => setting('items', Math.max(5, sel.settings.items - 5))} onUp={() => setting('items', Math.min(60, sel.settings.items + 5))} />}
                {canDifficulty && (
                  <div className="tp-ctl">
                    <span className="tp-field__k">Difficulty</span>
                    <div className="tp-switch" role="radiogroup" aria-label="Difficulty">
                      {(['fixed', 'adaptive'] as const).map((d) => (
                        <button key={d} role="radio" aria-checked={sel.settings.difficulty === d} className={sel.settings.difficulty === d ? 'is-on' : ''} onClick={() => setting('difficulty', d)}>
                          {d === 'fixed' ? 'Fixed' : 'Adaptive'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {sel.type === 'branch' && (
                  <div className="tp-ctl tp-ctl--wide">
                    <span className="tp-field__k">After the last loop</span>
                    <button className={`tp-toggle ${exit ? 'is-on' : ''}`} role="switch" aria-checked={exit} onClick={() => (setExit(!exit), touch(), clunk('tick'))}>
                      <i aria-hidden />
                      {exit ? 'Learners meet a coach (checkpoint on)' : 'Nothing happens (no exit)'}
                    </button>
                  </div>
                )}
              </div>
              <button className="tp-more" onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}>
                <ChevronDown size={16} className={moreOpen ? 'is-open' : ''} aria-hidden /> More settings: date window, completion required
              </button>
              {moreOpen && (
                <div className="tp-vcrp__grid">
                  <div className="tp-ctl">
                    <span className="tp-field__k">Date window</span>
                    <span className="tp-ctl__field tp-num">{sel.settings.window === 'Open' ? 'Always open' : sel.settings.window}</span>
                  </div>
                  <Stepper label="Completion required" value={`${sel.settings.required}%`} onDown={() => setting('required', Math.max(50, sel.settings.required - 10))} onUp={() => setting('required', Math.min(100, sel.settings.required + 10))} />
                </div>
              )}
            </div>

            <div className="tp-vcrp__rule">
              <span className="tp-field__k">{sel.type === 'branch' ? 'Who goes here' : sel.type === 'reward' ? 'When it pays out' : 'Unlock rule'}</span>
              <p className="tp-rule__say">{ruleText}</p>
              <ul className="tp-rule__list">
                {sel.gates.map((g) => {
                  const c = clause(g);
                  return (
                    <li key={g} className="tp-clause">
                      <span className="tp-clause__k">{c.kind}</span>
                      <span className="tp-clause__t">{c.text}</span>
                      <button aria-label={`Remove the condition: ${c.text}`} onClick={() => (update(sel.id, { gates: sel.gates.filter((x) => x !== g) }), clunk('tick'))}>
                        <X size={15} aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="tp-rule__add">
                <button className="tp-btn tp-btn--quiet tp-btn--sm" onClick={() => setCondOpen((o) => !o)} aria-expanded={condOpen}>
                  <Plus size={15} aria-hidden /> Add a condition
                </button>
                <AnimatePresence>
                  {condOpen && (
                    <motion.div className="tp-menu tp-menu--up" role="menu" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.16 }}>
                      {clauseTypes.map((t) => (
                        <button
                          key={t}
                          role="menuitem"
                          onClick={() => {
                            const c = CLAUSE_TEMPLATE[t];
                            if (!sel.gates.includes(c)) update(sel.id, { gates: [...sel.gates, c] });
                            setCondOpen(false);
                            clunk('tick');
                          }}
                        >
                          <span>
                            <b>{t}</b>
                            <small>{CLAUSE_ABOUT[t]}</small>
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <footer className="tp-vcrp__foot">
            <button className="tp-btn tp-btn--quiet tp-btn--sm" onClick={() => move(-1)} disabled={selIdx === 0}>
              <ArrowLeft size={15} aria-hidden /> Move earlier
            </button>
            <button className="tp-btn tp-btn--quiet tp-btn--sm" onClick={() => move(1)} disabled={selIdx === list.length - 1}>
              Move later <ArrowRight size={15} aria-hidden />
            </button>
            {selIssues.length > 0 && <StateTag kind="problem">This stage has {selIssues.length} problem · see Journey check</StateTag>}
            <button className="tp-btn tp-btn--quiet tp-btn--sm tp-btn--danger" onClick={remove} disabled={list.length <= 2} title={list.length <= 2 ? 'A journey needs at least two stages' : undefined}>
              <Trash2 size={15} aria-hidden /> Remove this stage
            </button>
          </footer>
        </div>

        <aside ref={checkRef} key={flash} className={`tp-check ${ok ? 'is-ok' : 'is-err'} ${flash ? 'is-flash' : ''}`} aria-labelledby="check-h">
          <header className="tp-check__h">
            <h2 id="check-h">Journey check</h2>
            <span className="tp-check__trk" aria-hidden>
              TRACKING {ok ? 'OK' : 'ERROR'}
              <span className="tp-check__bars">
                {Array.from({ length: 8 }, (_, k) => (
                  <i key={k} style={{ animationDelay: `${(k * 53) % 300}ms` }} />
                ))}
              </span>
            </span>
          </header>
          <p className="tp-check__head" role="status">
            {ok ? (
              <>
                <Check size={20} strokeWidth={3} aria-hidden /> Ready to submit. All {checks.length} checks pass.
              </>
            ) : (
              <>
                {issues.length} problem{issues.length > 1 ? 's' : ''} {issues.length > 1 ? 'block' : 'blocks'} submitting
              </>
            )}
          </p>
          {issues.map((is) => (
            <div key={is.key} className="tp-issue">
              <b>{is.title}</b>
              <p>{is.why}</p>
              <button className={`tp-btn ${is === firstIssue && flow === 'draft' ? 'tp-btn--primary' : 'tp-btn--secondary'}`} onClick={() => fix(is)}>
                {is.fix.label}
              </button>
            </div>
          ))}
          <ul className="tp-check__list">
            {checks
              .filter((c) => !c.issues.length)
              .map((c) => (
                <li key={c.key}>
                  <StateTag kind="ready">{c.label}</StateTag>
                </li>
              ))}
          </ul>
          <p className="tp-check__note">
            {flow === 'draft' && `Submitting sends it to ${APPROVER} (Org Admin). You cannot approve your own journey.`}
            {flow === 'review' && `${APPROVER} is reviewing it. Editing now sends it back to draft.`}
            {flow === 'approved' && `Approved by ${APPROVER}. Publishing sends it to the ${AUDIENCE} learners in Product Leads.`}
            {flow === 'published' && `Live. ${AUDIENCE} learners in Product Leads can start stage 1.`}
          </p>
        </aside>
      </section>

      <AnimatePresence>{preview && <Preview list={list} onClose={() => setPreview(false)} />}</AnimatePresence>
    </main>
  );
}

function Stepper({ label, value, onDown, onUp }: { label: string; value: string; onDown: () => void; onUp: () => void }) {
  return (
    <div className="tp-ctl">
      <span className="tp-field__k">{label}</span>
      <div className="tp-step">
        <button className="tp-key" onClick={onDown} aria-label={`Less: ${label}`}>
          <ArrowLeft size={14} aria-hidden />
        </button>
        <span className="tp-ctl__field tp-num" aria-live="polite">
          {value}
        </span>
        <button className="tp-key" onClick={onUp} aria-label={`More: ${label}`}>
          <ArrowRight size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function Preview({ list, onClose }: { list: Slot[]; onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    btn.current?.focus();
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <motion.div className="tp-preview" role="dialog" aria-modal="true" aria-label="Preview as a learner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <p className="tp-preview__k">Preview · what a learner in Product Leads sees on day one</p>
      <div className="tp-preview__row" onClick={(e) => e.stopPropagation()}>
        {list.map((s, i) => (
          <motion.div key={s.id} className="tp-preview__t" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.04 * i, duration: 0.25 }}>
            {s.blank ? <div className="tp-blank" /> : <TapeCover spec={buildSpec(s, i, list.length)} locked={i > 0} label="" />}
            <b>
              {i + 1}. {s.title}
            </b>
            {i === 0 ? <StateTag kind="current">Ready to start</StateTag> : <StateTag kind="locked">Opens after stage {i}</StateTag>}
          </motion.div>
        ))}
      </div>
      <button ref={btn} className="tp-btn tp-btn--secondary" onClick={onClose}>
        <X size={16} aria-hidden /> Close preview
      </button>
    </motion.div>
  );
}
