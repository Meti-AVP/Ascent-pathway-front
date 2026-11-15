import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight, Clock, RotateCcw, Sparkles, LockOpen, Lock, Split, ChevronDown, Award, UserRound, CornerDownRight,
} from 'lucide-react';
import { useNav } from '../shell';
import { Bar, Btn, Medal, STAGE_ICON, StateTag, useToast, type StateKind } from '../ui';
import { ART, ATTEMPTS_LEFT, BEST_RUN, CURRENT, PATH_BADGES, RARITY_LABEL, SALES_MASTERY, STAGE_META, type PathStage } from '../data';

const KIND: Record<PathStage['state'], StateKind> = { done: 'done', current: 'current', locked: 'locked', conditional: 'conditional' };

// What a locked stage needs, in plain words (stage 7 is a detour, so stage 8 follows stage 6).
const UNLOCK: Record<number, string> = {
  5: 'Score 80% or higher in a Fast Track run in stage 4, Objection Handling.',
  6: 'Score 80% or higher in stage 5, the Pricing & Value assessment.',
  8: 'Win 2 of 3 duels in stage 6, Negotiation Lab.',
  9: 'Place 4th or better in stage 8, the Q4 Sales Cup.',
};
const unlockRule = (st: PathStage) => (st.state === 'conditional' ? st.gate : UNLOCK[st.n] ?? '');

function stateLabel(st: PathStage) {
  if (st.state === 'done') return st.result ?? 'Done';
  if (st.state === 'current') return 'You are here';
  if (st.state === 'conditional') return 'Only if needed';
  return 'Locked';
}

export function LearnerJourney() {
  const { go } = useNav();
  const toast = useToast();
  const [sel, setSel] = useState(CURRENT.n);
  const [showAll, setShowAll] = useState(false);
  const st = SALES_MASTERY[sel - 1] ?? CURRENT;
  const done = SALES_MASTERY.filter((s) => s.state === 'done').length;
  const Icon = STAGE_ICON[st.type];
  const next = SALES_MASTERY[CURRENT.n]!;
  const after = SALES_MASTERY[CURRENT.n + 1]!;

  return (
    <div className="lj">
      <header className="pg-head pg-head--row">
        <div>
          <h1 className="pg-title">Sales Mastery</h1>
          <p className="pg-sub">Assigned by Sara Mansour to the Field Sales cohort · due Dec 19</p>
        </div>
        <div className="lj-prog">
          <p><b>{done} of {SALES_MASTERY.length}</b> stages done</p>
          <Bar value={done} max={SALES_MASTERY.length} tone="green" label={`${done} of ${SALES_MASTERY.length} stages done`} />
        </div>
      </header>

      {/* the map: where I am, at a glance; every stage can be opened */}
      <section className="sm-card lj-map" aria-labelledby="lj-map-t">
        <div className="lj-map__head">
          <h2 id="lj-map-t" className="sec-title">Your path</h2>
          <p className="lj-map__hint">Select a stage to see what it asks and how it unlocks.</p>
        </div>
        <ol className="lj-track">
          {SALES_MASTERY.map((s, i) => {
            const I = STAGE_ICON[s.type];
            const seg = i < SALES_MASTERY.length - 1 ? (s.state === 'done' ? 'done' : 'todo') : null;
            return (
              <li key={s.n} className={`lj-node is-${s.state}${sel === s.n ? ' is-sel' : ''}`}>
                {seg && <i className={`lj-seg is-${seg}`} aria-hidden />}
                <button type="button" onClick={() => setSel(s.n)} aria-pressed={sel === s.n} aria-label={`Stage ${s.n}, ${s.title}, ${stateLabel(s)}`}>
                  <span className="lj-node__dot"><I size={22} strokeWidth={1.9} aria-hidden /></span>
                  <span className="lj-node__n">Stage {s.n}</span>
                  <b className="lj-node__t">{s.title}</b>
                  <StateTag kind={KIND[s.state]} label={s.state === 'done' ? 'Done' : undefined} className="lj-node__s" />
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="lj-row">
        {/* the selected stage — by default the current one, with the one primary action */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={st.n} className="sm-card lj-stage" aria-labelledby="lj-stage-t"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
          >
            <div className={`lj-stage__top${st.type === 'compete' ? ' has-art' : ''}`}>
              <div className="lj-stage__txt">
                <p className="lj-eye"><Icon size={17} strokeWidth={2.1} aria-hidden /> Stage {st.n} of {SALES_MASTERY.length} · {STAGE_META[st.type].label} · {st.product}{st.type === 'compete' ? ' arena' : ''}</p>
                <h2 id="lj-stage-t" className="lj-stage__t">{st.title}</h2>
                <p className="lj-stage__d">{st.asks}</p>
                {st.state === 'done' && <StateTag kind="done" label={`${st.result} on ${st.when}`} />}
              </div>
              {st.type === 'compete' && <img className="lj-stage__art" src={ART.arena} width={310} height={188} alt={`The ${st.product} arena`} draggable={false} />}
            </div>

            {st.state === 'current' && (
              <div className="lj-gate">
                <p className="lj-gate__row">
                  <span className="lj-gate__l"><LockOpen size={17} strokeWidth={2.1} aria-hidden /> Score 80% or higher in a run to pass</span>
                  <span className="lj-gate__v">Your best: <b>{BEST_RUN}%</b>, {80 - BEST_RUN} points to go</span>
                </p>
                <Bar value={BEST_RUN} target={80} tone="orange" label={`Best run ${BEST_RUN}% of the 80% needed`} />
              </div>
            )}
            {(st.state === 'locked' || st.state === 'conditional') && (
              <div className="lj-gate is-locked">
                <p className="lj-gate__l">{st.state === 'conditional' ? <Split size={17} aria-hidden /> : <Lock size={17} aria-hidden />} {st.state === 'conditional' ? 'When it opens' : 'How to unlock'}: {unlockRule(st)}</p>
              </div>
            )}

            <div className="lj-stage__foot">
              {st.state === 'current' && (
                <Btn variant="primary" size="lg" iconRight={ArrowRight} onClick={() => toast(`Opening Fast Track for stage ${st.n}, ${st.title}. Good luck.`, 'orange')}>Start stage {st.n}</Btn>
              )}
              <ul className="lj-meta" aria-label="Stage facts">
                {st.minutes > 0 && <li><Clock size={16} aria-hidden /> About {st.minutes} min</li>}
                {st.state === 'current' && <li><RotateCcw size={16} aria-hidden /> {ATTEMPTS_LEFT} of 2 tries left today</li>}
                <li><Sparkles size={16} aria-hidden /> {st.state === 'done' ? 'Earned' : 'Earn'} +{st.xp} XP{st.syn ? ` and +${st.syn} SYN` : ''}</li>
                {st.badge && <li><Award size={16} aria-hidden /> Badge: {st.badge}</li>}
              </ul>
              {st.state === 'done' && (
                <div className="lj-foot-acts">
                  <Btn variant="quiet" onClick={() => setSel(CURRENT.n)}>Back to stage {CURRENT.n}</Btn>
                  <Btn variant="secondary" onClick={() => toast(`${st.product} is open for review. Replays do not change your result.`, 'orange')}>Review this stage</Btn>
                </div>
              )}
              {(st.state === 'locked' || st.state === 'conditional') && (
                <Btn variant="secondary" onClick={() => setSel(CURRENT.n)}>Back to stage {CURRENT.n}, your current stage</Btn>
              )}
            </div>
          </motion.section>
        </AnimatePresence>

        {/* what unlocks next, in plain words */}
        <aside className="sm-card lj-next" aria-labelledby="lj-next-t">
          <h2 id="lj-next-t" className="sec-title">What unlocks next</h2>
          <div className="lj-next__item">
            <span className="lj-next__ic" aria-hidden>{(() => { const I = STAGE_ICON[next.type]; return <I size={20} />; })()}</span>
            <div>
              <b>Stage {next.n} · {next.title}</b>
              <p>Opens when you score 80% or higher in Fast Track. An adaptive assessment: 24 questions, about {next.minutes} min.</p>
            </div>
          </div>
          <div className="lj-next__item is-later">
            <span className="lj-next__ic" aria-hidden>{(() => { const I = STAGE_ICON[after.type]; return <I size={20} />; })()}</span>
            <div>
              <b>Then stage {after.n} · {after.title}</b>
              <p>Opens when you score 80% or higher in {next.title}.</p>
            </div>
          </div>
          <details className="lj-branch">
            <summary><Split size={17} aria-hidden /> What if a score is too low? <ChevronDown size={17} className="lj-branch__chev" aria-hidden /></summary>
            <div className="lj-branch__body">
              <p><CornerDownRight size={16} aria-hidden /> A score under 70% in Negotiation Lab opens the <b>Recovery Path</b>: a short clinic on value framing, then back to the duels.</p>
              <p><UserRound size={16} aria-hidden /> The loop runs at most 3 times. On the third, a coach checks in with you one to one.</p>
            </div>
          </details>
        </aside>
      </div>

      {/* on demand: every stage with its rule and history, plus the pathway badges */}
      <section className="lj-more">
        <button type="button" className="lj-more__btn" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
          <span><b>All 9 stages in detail</b><small>Products, unlock rules, results and dates</small></span>
          <ChevronDown size={20} className={showAll ? 'is-open' : ''} aria-hidden />
        </button>
        <AnimatePresence initial={false}>
          {showAll && (
            <motion.div className="lj-all" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <table className="lj-table">
                <thead><tr><th scope="col">Stage</th><th scope="col">Product</th><th scope="col">Rule to move on</th><th scope="col">Status</th></tr></thead>
                <tbody>
                  {SALES_MASTERY.map((s) => {
                    const I = STAGE_ICON[s.type];
                    return (
                      <tr key={s.n} className={sel === s.n ? 'is-sel' : ''} onClick={() => { setSel(s.n); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        <td><span className="lj-table__st"><I size={18} aria-hidden /><span><b>{s.n} · {s.title}</b><small>{STAGE_META[s.type].label}</small></span></span></td>
                        <td>{s.product}<small>{s.productKind}</small></td>
                        <td>{s.gate}</td>
                        <td><StateTag kind={KIND[s.state]} label={s.state === 'done' ? `${s.result}, ${s.when}` : undefined} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="sm-card lj-badges">
          <h2 className="sec-title">Badges on this pathway</h2>
          <ul>
            {PATH_BADGES.map((b) => (
              <li key={b.id}>
                <Medal rarity={b.rarity} icon={b.icon} state={b.state} size={60} />
                <span><b>{b.name}</b><small>{RARITY_LABEL[b.rarity]} · {b.note}</small>
                  <StateTag kind={b.state === 'earned' ? 'done' : b.state === 'progress' ? 'current' : 'locked'} label={b.state === 'earned' ? 'Earned' : b.state === 'progress' ? 'In progress' : 'Locked'} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="lj-foot">
        <Btn variant="quiet" iconRight={ArrowRight} onClick={() => go('learner/home')}>Back to Home</Btn>
      </p>
    </div>
  );
}
