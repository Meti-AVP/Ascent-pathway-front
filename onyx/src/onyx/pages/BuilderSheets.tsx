import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Check, CircleAlert, CircleCheck, CirclePlay, FileText, FileUp, Lock, PenLine, Search, Send, Sparkles, Square,
  SquareCheck, Upload, WandSparkles,
} from 'lucide-react';
import { gsap, useGSAP, reduced } from '../motion';
import { Btn, Chip, KIND_ICON, Segmented, Sheet, Stepper, TYPE_ICON, cx } from '../ui';
import {
  ARENAS, DOCUMENTS, DRAFT_ITEMS, LIBRARY, PRODUCT_KINDS, STAGE_TYPES, clauseText,
  type BProduct, type BStage, type ProductKind, type QItem,
} from '../data';

const uid = () => Math.random().toString(36).slice(2, 9);

// ── Pick or create a product for a stage ───────────────────────────────────
const CREATE_NOTE: Record<ProductKind, string> = {
  course: 'You add lessons next, or import a document and let AI draft them.',
  assessment: 'Next, import a document and let AI draft the questions, or write your own.',
  arena: 'Arenas are built by the ASCENT game team. Pick one from the library and tune it in More settings.',
  tournament: 'You set the date next. The advancement rule lives in this stage’s gate.',
  live: 'You pick a date and a coach next.',
  reward: 'You choose the badge, certificate or SYN amount next.',
};

export function ContentSheet({ open, stage, onClose, onAdd }: { open: boolean; stage: BStage; onClose: () => void; onAdd: (p: BProduct) => void }) {
  const kinds = Object.keys(PRODUCT_KINDS) as ProductKind[];
  const recommended = kinds.find((k) => PRODUCT_KINDS[k].fits.includes(stage.type)) ?? 'course';
  const [kind, setKind] = useState<ProductKind>(recommended);
  const [mode, setMode] = useState<'library' | 'new'>('library');
  const [pick, setPick] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const pane = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setKind(recommended); setMode('library'); setPick(null); setQuery(''); setName('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (!pane.current || reduced()) return;
    gsap.fromTo(pane.current.children, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'onyx', clearProps: 'transform' });
  }, [kind, mode]);

  const lib = useMemo(() => LIBRARY[kind].filter((x) => x.name.toLowerCase().includes(query.toLowerCase()) || x.meta.toLowerCase().includes(query.toLowerCase())), [kind, query]);
  const canCreate = kind !== 'arena';
  const ready = mode === 'library' ? !!pick : canCreate && name.trim().length > 1;
  const TI = TYPE_ICON[stage.type];

  const confirm = () => {
    if (!ready) return;
    if (mode === 'library') {
      const item = LIBRARY[kind].find((x) => x.name === pick)!;
      onAdd({ id: uid(), kind, name: item.name, meta: kind === 'arena' ? 'Battle Arena' : item.meta, status: 'ready' });
    } else {
      onAdd({ id: uid(), kind, name: name.trim(), meta: kind === 'assessment' ? 'No questions yet' : 'New · draft', status: kind === 'assessment' ? 'empty' : 'ready' });
    }
  };

  return (
    <Sheet open={open} onClose={onClose} label={`Add content to ${stage.name}`} width={1040} className="csheet">
      <div className="sh-head">
        <p className="eyebrow">Add content</p>
        <h2 className="sh-title">What should learners do in {stage.name}?</h2>
        <p className="sh-sub"><TI size={16} /> {STAGE_TYPES[stage.type].label} stage · {STAGE_TYPES[stage.type].what.toLowerCase()}</p>
      </div>
      <div className="sh-body">
        <div className="kinds" role="radiogroup" aria-label="Type of content">
          {kinds.map((k) => {
            const I = KIND_ICON[k];
            const fits = PRODUCT_KINDS[k].fits.includes(stage.type);
            return (
              <button key={k} type="button" role="radio" aria-checked={kind === k} className={cx('kind glass-in g-lit', kind === k && 'is-on')} onClick={() => { setKind(k); setPick(null); setMode('library'); }}>
                <span className="kind__icon"><I size={22} /></span>
                <span className="kind__name">{PRODUCT_KINDS[k].label}</span>
                <span className="kind__what">{PRODUCT_KINDS[k].what}</span>
                {fits && <span className="kind__fit"><Sparkles size={13} /> Fits {STAGE_TYPES[stage.type].label} stages</span>}
              </button>
            );
          })}
        </div>

        <div className="cpick">
          <div className="cpick__bar">
            <Segmented<'library' | 'new'> size="sm" label="Source" value={mode} onChange={(v) => setMode(v)}
              options={[{ value: 'library', label: 'From the library' }, { value: 'new', label: `Create a new ${PRODUCT_KINDS[kind].label.toLowerCase()}` }]} />
            {mode === 'library' && (
              <label className="search">
                <Search size={16} aria-hidden />
                <input className="input" placeholder={kind === 'arena' ? 'Search 36 arenas by name or skill' : `Search ${PRODUCT_KINDS[kind].label.toLowerCase()}s`} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the library" />
              </label>
            )}
          </div>
          <div ref={pane} className="cpick__pane">
            {mode === 'library' ? (
              kind === 'arena' ? (
                <>
                  <div className="arenas" role="radiogroup" aria-label="Battle arenas">
                    {ARENAS.filter((a) => (a.name + a.what + a.skill).toLowerCase().includes(query.toLowerCase())).map((a) => (
                      <button key={a.name} type="button" role="radio" aria-checked={pick === a.name} className={cx('arena', pick === a.name && 'is-on')} onClick={() => setPick(a.name)}>
                        <span className="arena__name">{a.name}</span>
                        <span className="arena__what">{a.what}</span>
                        <span className="arena__skill">{a.skill}</span>
                      </button>
                    ))}
                  </div>
                  <p className="faint small">Showing the 12 arenas that fit strategy and sales skills. Search to find any of the 36.</p>
                </>
              ) : (
                <ul className="libl" role="radiogroup" aria-label="Library">
                  {lib.map((x) => (
                    <li key={x.name}>
                      <button type="button" role="radio" aria-checked={pick === x.name} className={cx('libl__row', pick === x.name && 'is-on')} onClick={() => setPick(x.name)}>
                        <span className="libl__check">{pick === x.name ? <CircleCheck size={18} /> : <span className="ring" />}</span>
                        <span className="libl__name">{x.name}</span>
                        <span className="libl__meta">{x.meta}</span>
                      </button>
                    </li>
                  ))}
                  {lib.length === 0 && <li className="faint">Nothing matches “{query}”.</li>}
                </ul>
              )
            ) : (
              <div className="cnew">
                {canCreate ? (
                  <label className="field">
                    <span>Name</span>
                    <input className="input" data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'assessment' ? 'For example: Roadmap Trade-offs Quiz' : `Name your new ${PRODUCT_KINDS[kind].label.toLowerCase()}`} />
                  </label>
                ) : null}
                <p className="cnew__note"><CircleAlert size={16} /> {CREATE_NOTE[kind]}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="sh-foot">
        <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" blocked={!ready} onClick={confirm}>
          {ready ? (mode === 'library' ? `Add ${pick} to the stage` : `Create and add ${name.trim()}`) : mode === 'library' ? 'Choose one to add it' : canCreate ? 'Name it to create it' : 'Pick an arena from the library'}
        </Btn>
      </div>
    </Sheet>
  );
}

// ── Import a document and let AI draft questions ───────────────────────────
const IDEAS = ['Target customer first', 'Outcomes over output', 'Impact per unit of effort', 'Quarterly review', 'Segment at risk', 'One-page strategy', 'PM owns the strategy', 'Stop or reshape a bet', 'The not-doing list', 'Roadmap traces to bets', 'Market shifts', 'Bets and their metrics', 'Leadership sign-off', 'Protect focus'];
const STEPS = ['Read the document', 'Find the key ideas', 'Draft the questions', 'Check each answer against its page'];
type Phase = 'pick' | 'drafting' | 'review' | 'edit';

export function ImportSheet({ open, stage, onClose, onSent }: { open: boolean; stage: BStage; onClose: () => void; onSent: (items: QItem[], from: DOMRect | null) => void }) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [docId, setDocId] = useState<string>('d1');
  const [count, setCount] = useState(10);
  const [level, setLevel] = useState<'Mixed' | 'Easier' | 'Harder'>('Mixed');
  const [page, setPage] = useState(0);
  const [step, setStep] = useState(0);
  const [ideas, setIdeas] = useState(0);
  const [shown, setShown] = useState(0);
  const [checked, setChecked] = useState(0);
  const [items, setItems] = useState<QItem[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<QItem | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLUListElement>(null);
  const doc = DOCUMENTS.find((d) => d.id === docId)!;

  useEffect(() => {
    if (!open) return;
    setPhase('pick'); setDocId('d1'); setCount(10); setLevel('Mixed');
    setPage(0); setStep(0); setIdeas(0); setShown(0); setChecked(0); setItems([]); setSel(new Set()); setEditing(null);
  }, [open]);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clear, []);

  const finish = (all: QItem[]) => {
    clear();
    setPage(doc.pages); setStep(4); setIdeas(IDEAS.length); setShown(all.length); setChecked(all.length);
    setPhase('review');
  };

  const start = () => {
    const all = DRAFT_ITEMS.slice(0, count).map((q) => ({ ...q }));
    setItems(all);
    setSel(new Set(all.map((q) => q.id)));
    setPhase('drafting');
    if (reduced()) { finish(all); return; }
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    const per = 80;
    for (let p = 1; p <= doc.pages; p++) at(p * per, () => setPage(p));
    const readEnd = doc.pages * per + 250;
    at(readEnd, () => setStep(1));
    IDEAS.forEach((_, i) => at(readEnd + (i + 1) * 75, () => setIdeas(i + 1)));
    const ideasEnd = readEnd + IDEAS.length * 75 + 300;
    at(ideasEnd, () => setStep(2));
    const each = 640;
    all.forEach((_, i) => at(ideasEnd + i * each, () => setShown(i + 1)));
    const draftEnd = ideasEnd + all.length * each + 450;
    at(draftEnd, () => setStep(3));
    all.forEach((_, i) => at(draftEnd + (i + 1) * 100, () => setChecked(i + 1)));
    at(draftEnd + all.length * 100 + 600, () => { setStep(4); setPhase('review'); });
  };

  // keep the newest drafted item in view
  useEffect(() => {
    const el = listRef.current;
    if (el && phase === 'drafting') el.scrollTo({ top: el.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' });
  }, [shown, phase]);

  const flagged = items.filter((q) => q.flag).length;
  const nSel = items.filter((q) => sel.has(q.id)).length;

  const send = () => {
    const chosen = items.filter((q) => sel.has(q.id));
    const rect = reviewRef.current?.getBoundingClientRect() ?? null;
    const rows = reviewRef.current?.querySelectorAll('.rq.is-sel');
    if (rows?.length && !reduced()) {
      gsap.to(rows, { x: 80, y: -60, opacity: 0, scale: 0.9, filter: 'blur(6px)', duration: 0.5, stagger: 0.04, ease: 'power2.in', onComplete: () => onSent(chosen, rect) });
    } else onSent(chosen, rect);
  };

  const title = phase === 'pick' ? `Draft questions for ${stage.name}` : phase === 'drafting' ? 'Drafting your questions' : phase === 'review' ? `${items.length} questions drafted` : 'Edit question';
  const sub = phase === 'pick' ? 'Choose a document. AI reads it, drafts the questions and cites the page behind every answer. You review everything before it goes anywhere.'
    : phase === 'drafting' ? `From ${doc.name}. You can keep watching or skip ahead.`
    : phase === 'review' ? `From ${doc.name}. ${flagged ? `${flagged} need a closer look. ` : ''}Edit anything, then send them to the review queue.`
    : `Question ${items.findIndex((q) => q.id === editing?.id) + 1} of ${items.length} · cited from page ${editing?.page}`;

  return (
    <Sheet open={open} onClose={() => { clear(); onClose(); }} label="Draft questions from a document" width={1180} className="isheet">
      <div className="sh-head">
        <p className="eyebrow"><WandSparkles size={14} /> AI drafting · {stage.name}</p>
        <h2 className="sh-title">{title}</h2>
        <p className="sh-sub">{sub}</p>
      </div>

      {phase === 'pick' && (
        <div className="sh-body ipick">
          <div className="drop glass-in" role="note">
            <Upload size={26} />
            <p><strong>Drop a PDF, Word or PowerPoint file here</strong><span>or choose one from Northwind’s library</span></p>
          </div>
          <ul className="docs" role="radiogroup" aria-label="Documents">
            {DOCUMENTS.map((d) => (
              <li key={d.id}>
                <button type="button" role="radio" aria-checked={docId === d.id} className={cx('doc', docId === d.id && 'is-on')} onClick={() => setDocId(d.id)}>
                  <span className="doc__icon"><FileText size={22} /></span>
                  <span className="doc__text"><strong>{d.name}</strong><span>{d.pages} pages · {d.size} · {d.updated}</span></span>
                  <span className="doc__check">{docId === d.id ? <CircleCheck size={20} /> : <span className="ring" />}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="iopts">
            <div className="setting"><span>Questions to draft</span><Stepper label="Questions to draft" value={count} min={5} max={10} onChange={setCount} /></div>
            <div className="setting"><span>Difficulty</span>
              <Segmented<'Mixed' | 'Easier' | 'Harder'> size="sm" label="Difficulty" value={level} onChange={setLevel} options={[{ value: 'Mixed', label: 'Mixed' }, { value: 'Easier', label: 'Easier' }, { value: 'Harder', label: 'Harder' }]} />
            </div>
            <div className="setting"><span>Format</span><span className="muted">Multiple choice, 4 answers</span></div>
          </div>
        </div>
      )}

      {phase === 'drafting' && (
        <div className="sh-body idraft">
          <div className="pages" aria-label={`Reading page ${page} of ${doc.pages}`}>
            <p className="pages__label num">Page {Math.max(1, page)} of {doc.pages}</p>
            <div className="pages__grid">
              {Array.from({ length: doc.pages }, (_, i) => (
                <span key={i} className={cx('pg', i + 1 < page && 'is-read', i + 1 === page && step === 0 && 'is-now')}>
                  <i /><i /><i /><i />
                </span>
              ))}
            </div>
          </div>
          <div className="isteps">
            <ol>
              {STEPS.map((s, i) => (
                <li key={s} className={cx(i < step && 'is-done', i === step && 'is-now')}>
                  <span className="isteps__dot">{i < step ? <Check size={14} /> : i === step ? <span className="pulse" /> : null}</span>
                  <span>
                    {s}
                    <small>
                      {i === 0 && (step > 0 ? `${doc.pages} pages read` : `page ${page} of ${doc.pages}`)}
                      {i === 1 && (step >= 1 ? `${ideas} key ideas found` : 'waiting')}
                      {i === 2 && (step >= 2 ? `${shown} of ${items.length} drafted` : 'waiting')}
                      {i === 3 && (step >= 3 ? `${checked} of ${items.length} checked` : 'waiting')}
                    </small>
                  </span>
                </li>
              ))}
            </ol>
            <div className="ideas" aria-label="Key ideas found">
              {IDEAS.slice(0, ideas).map((t) => <span key={t} className="idea">{t}</span>)}
            </div>
          </div>
          <div ref={listRef} className="drafts" aria-live="polite">
            {items.slice(0, shown).map((q, i) => <DraftCard key={q.id} q={q} n={i + 1} checked={i < checked} />)}
            {shown < items.length && step >= 2 && <div className="dcard is-ghost"><span className="shimmer" /><span className="shimmer short" /></div>}
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className="sh-body ireview">
          <ul ref={reviewRef} className="rqs">
            {items.map((q, i) => (
              <ReviewRow key={q.id} q={q} n={i + 1} on={sel.has(q.id)} flash={flash === q.id}
                onToggle={() => setSel((s) => { const n = new Set(s); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })}
                onEdit={() => { setEditing({ ...q, options: [...q.options] }); setPhase('edit'); }}
              />
            ))}
          </ul>
        </div>
      )}

      {phase === 'edit' && editing && <ItemEditor q={editing} pages={doc.pages} onChange={setEditing} />}

      <div className="sh-foot">
        {phase === 'pick' && (<>
          <Btn kind="ghost" onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" icon={<WandSparkles />} onClick={start}>Draft {count} questions</Btn>
        </>)}
        {phase === 'drafting' && (<>
          <span className="foot-note"><Sparkles size={15} /> Drafts stay private until you send them for review.</span>
          <Btn kind="ghost" onClick={() => finish(items)}>Skip ahead</Btn>
          <Btn kind="primary" blocked icon={<Sparkles />}>Drafting {Math.min(shown, items.length)} of {items.length}</Btn>
        </>)}
        {phase === 'review' && (<>
          <button type="button" className="selall" onClick={() => setSel(nSel === items.length ? new Set() : new Set(items.map((q) => q.id)))}>
            {nSel === items.length ? <SquareCheck size={18} /> : <Square size={18} />} {nSel === items.length ? 'All selected' : `${nSel} of ${items.length} selected`}
          </button>
          <Btn kind="ghost" icon={<FileUp />} onClick={() => setPhase('pick')}>Use another document</Btn>
          <Btn kind="primary" icon={<Send />} blocked={nSel === 0} onClick={send}>{nSel ? `Send ${nSel} question${nSel === 1 ? '' : 's'} to review` : 'Select questions to send'}</Btn>
        </>)}
        {phase === 'edit' && editing && (<>
          <Btn kind="ghost" icon={<ArrowLeft />} onClick={() => setPhase('review')}>Back without saving</Btn>
          <Btn kind="primary" icon={<Check />} blocked={!editing.q.trim() || editing.options.some((o) => !o.trim())} onClick={() => {
            setItems((all) => all.map((x) => (x.id === editing.id ? { ...editing, edited: true, flag: undefined } : x)));
            setFlash(editing.id); window.setTimeout(() => setFlash(null), 1800);
            setPhase('review');
          }}>{!editing.q.trim() || editing.options.some((o) => !o.trim()) ? 'Fill in every answer to save' : 'Save question'}</Btn>
        </>)}
      </div>
    </Sheet>
  );
}

function DraftCard({ q, n, checked }: { q: QItem; n: number; checked: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current!;
    const qEl = el.querySelector('.dcard__q')!;
    if (reduced()) { qEl.textContent = q.q; return; }
    const tl = gsap.timeline();
    const o = { n: 0 };
    tl.fromTo(el, { opacity: 0, y: 18, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.45, ease: 'onyx', clearProps: 'filter' })
      .to(o, { n: q.q.length, duration: 0.5, ease: 'none', onUpdate: () => { qEl.textContent = q.q.slice(0, Math.round(o.n)); } }, 0.1)
      .fromTo(el.querySelectorAll('.dcard__opt'), { opacity: 0, x: -10 }, { opacity: 1, x: 0, stagger: 0.05, duration: 0.3 }, '-=0.05')
      .fromTo(el.querySelector('.dcard__foot'), { opacity: 0 }, { opacity: 1, duration: 0.3 });
    return () => { tl.kill(); };
  }, [q]);
  return (
    <div ref={ref} className="dcard glass-in">
      <p className="dcard__n num">Q{n}</p>
      <p className="dcard__q" />
      <ul className="dcard__opts">
        {q.options.map((o, i) => (
          <li key={o} className={cx('dcard__opt', i === q.correct && 'is-right')}>
            {i === q.correct ? <CircleCheck size={15} /> : <span className="ring sm" />} {o}
          </li>
        ))}
      </ul>
      <p className="dcard__foot">
        <Chip>{q.level}</Chip>
        <Chip icon={<FileText size={13} />}>Page {q.page}</Chip>
        {checked && (q.flag ? <Chip tone="alert" icon={<CircleAlert size={13} />}>Needs a look</Chip> : <Chip tone="done" icon={<Check size={13} />}>Checked</Chip>)}
      </p>
    </div>
  );
}

function ReviewRow({ q, n, on, flash, onToggle, onEdit }: { q: QItem; n: number; on: boolean; flash: boolean; onToggle: () => void; onEdit: () => void }) {
  const ref = useRef<HTMLLIElement>(null);
  useLayoutEffect(() => {
    if (!flash || reduced() || !ref.current) return;
    gsap.fromTo(ref.current, { backgroundColor: 'rgba(70,211,139,0.2)' }, { backgroundColor: 'rgba(255,255,255,0.04)', duration: 1.8, ease: 'power2.out' });
  }, [flash]);
  return (
    <li ref={ref} className={cx('rq', on && 'is-sel')}>
      <button type="button" className="rq__check" role="checkbox" aria-checked={on} aria-label={`Include question ${n}`} onClick={onToggle}>
        {on ? <SquareCheck size={20} /> : <Square size={20} />}
      </button>
      <div className="rq__main">
        <p className="rq__q"><span className="num faint">Q{n}</span> {q.q}</p>
        <p className="rq__a"><CircleCheck size={14} /> {q.options[q.correct]}</p>
        <p className="rq__chips">
          <Chip>{q.level}</Chip>
          <Chip icon={<FileText size={13} />}>Page {q.page}</Chip>
          {q.flag && <Chip tone="alert" icon={<CircleAlert size={13} />}>{q.flag}</Chip>}
          {q.edited && <Chip tone="done" icon={<PenLine size={13} />}>Edited by you</Chip>}
        </p>
      </div>
      <Btn kind="glass" size="sm" icon={<PenLine />} onClick={onEdit}>Edit</Btn>
    </li>
  );
}

function ItemEditor({ q, pages, onChange }: { q: QItem; pages: number; onChange: (q: QItem) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (reduced()) return;
    gsap.fromTo(ref.current!.children, { opacity: 0, y: 14 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.5, ease: 'onyx', clearProps: 'transform' });
  }, { scope: ref });
  return (
    <div ref={ref} className="sh-body iedit">
      <label className="field">
        <span>Question</span>
        <textarea className="textarea" data-autofocus value={q.q} rows={2} onChange={(e) => onChange({ ...q, q: e.target.value })} />
      </label>
      <fieldset className="iedit__opts">
        <legend>Answers <span className="faint">· select the correct one</span></legend>
        {q.options.map((o, i) => (
          <div key={i} className={cx('iedit__opt', i === q.correct && 'is-right')}>
            <button type="button" role="radio" aria-checked={i === q.correct} aria-label={`Mark answer ${i + 1} as correct`} className="iedit__radio" onClick={() => onChange({ ...q, correct: i })}>
              {i === q.correct ? <CircleCheck size={20} /> : <span className="ring" />}
            </button>
            <input className="input" value={o} aria-label={`Answer ${i + 1}`} onChange={(e) => onChange({ ...q, options: q.options.map((x, j) => (j === i ? e.target.value : x)) })} />
          </div>
        ))}
      </fieldset>
      <label className="field">
        <span>Why it’s right <span className="faint">· learners see this after answering</span></span>
        <textarea className="textarea" value={q.why} rows={2} onChange={(e) => onChange({ ...q, why: e.target.value })} />
      </label>
      <div className="iedit__row">
        <div className="setting"><span>Difficulty</span>
          <Segmented<QItem['level']> size="sm" label="Difficulty" value={q.level} onChange={(v) => onChange({ ...q, level: v })} options={[{ value: 'Easy', label: 'Easy' }, { value: 'Medium', label: 'Medium' }, { value: 'Hard', label: 'Hard' }]} />
        </div>
        <div className="setting"><span>Source page</span><Stepper label="Source page" value={q.page} min={1} max={pages} onChange={(v) => onChange({ ...q, page: v })} /></div>
      </div>
      {q.flag && <p className="iedit__flag"><CircleAlert size={16} /> AI flagged this: {q.flag.toLowerCase()}. Saving your edit clears the flag.</p>}
    </div>
  );
}

// ── Preview as a learner ───────────────────────────────────────────────────
export function PreviewSheet({ open, stages, onClose }: { open: boolean; stages: BStage[]; onClose: () => void }) {
  const first = stages[0];
  const route = stages.filter((s) => s.type !== 'branch');
  return (
    <Sheet open={open} onClose={onClose} label="Preview as a learner" width={980} className="psheet">
      <div className="sh-head">
        <p className="eyebrow">Preview · what a Product Manager sees on day one</p>
        <h2 className="sh-title">Product Leadership Journey</h2>
        <p className="sh-sub">Stage 1 is open. Every other stage stays locked until the one before it is passed.</p>
      </div>
      <div className="sh-body">
        <ol className="proute">
          {route.map((s, i) => {
            const I = TYPE_ICON[s.type];
            return (
              <li key={s.id} className={cx('proute__s', i === 0 && 'is-now')}>
                <span className="proute__icon"><I size={18} /></span>
                <span className="proute__name">{s.name}</span>
                <span className="proute__state">{i === 0 ? <><CirclePlay size={14} /> Current</> : <><Lock size={13} /> Locked</>}</span>
              </li>
            );
          })}
        </ol>
        {first && (
          <div className="pcard glass-in">
            <p className="eyebrow">Stage 1 of {stages.length} · {STAGE_TYPES[first.type].label}</p>
            <h3 className="pcard__title">{first.name}</h3>
            <p className="muted">{first.products.map((p) => `${PRODUCT_KINDS[p.kind].label}: ${p.name} (${p.meta})`).join(' · ') || 'No content yet'}</p>
            <div className="pcard__gate"><span className="label">To move on</span><p>{first.gate.length ? first.gate.map(clauseText).join(', and ') : 'Finish the stage.'}</p></div>
            <Btn kind="primary" blocked icon={<CirclePlay />}>Start stage 1 (preview only)</Btn>
          </div>
        )}
      </div>
    </Sheet>
  );
}
