// Learner · My Journey: the nine-stage Sales Mastery path across the cliffs.
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Coins, GitBranch, Lock, Play, Sparkles, Star, Timer, Trophy } from 'lucide-react';
import { StageGlyph } from '../icons';
import { SALES_MASTERY, TYPE_LABEL, type JourneyStage } from '../data';
import { World, WX } from '../World';
import { PED, Socket, Stone, Tip, Trail, type Box } from '../stage';
import { hashParam, useToast } from '../App';

const BOX: Box[] = [
  { x: 764, y: 424, w: 56, h: 56 },
  PED.learn,
  PED.assess,
  PED.compete,
  { x: 1308, y: 275, w: 50, h: 50 },
  { x: 1390, y: 370, w: 56, h: 56 },
  { x: 1510, y: 394, w: 52, h: 52 },
  PED.prove,
  PED.reward,
];
const SMALL = [true, false, false, false, true, true, true, false, false];

/** `#/learner/journey?stage=8` opens on stage 8; without it, on the stage Ahmed is on (4). */
const focusFromHash = () => {
  const n = Number(hashParam('stage'));
  return n >= 1 && n <= SALES_MASTERY.length ? n - 1 : 3;
};

export function LearnerJourney() {
  const toast = useToast();
  const [focus, setFocus] = useState(focusFromHash);
  useEffect(() => {
    const on = () => setFocus(focusFromHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  const st = SALES_MASTERY[focus]!;
  const done = SALES_MASTERY.filter((s) => s.state === 'done').length;

  return (
    <>
      {/* hero first in the DOM so Tab reaches the primary action before the canvas (paint order is z-index) */}
      <section className="em-hero" aria-labelledby="em-lj-title">
        <p className="em-eyebrow">My Journey · Sales Mastery</p>
        <h1 id="em-lj-title" className="em-h1">
          Nine Stones to
          <br />
          Sales <em>Mastery</em>
        </h1>
        <div className="em-progress">
          <div className="em-progress__top">
            <b>{done} of 9 stages lit</b>
            <span>33% · about 18 days to the badge</span>
          </div>
          <div className="em-segs">
            {SALES_MASTERY.map((s) => <i key={s.n} className={`is-${s.state}${s.type === 'branch' ? ' is-branch' : ''}`} title={`${s.n} · ${s.name}`} />)}
          </div>
        </div>
        <button type="button" className="em-btn em-btn--fire em-hero__cta em-lj-cta" onClick={() => toast('Entering the Fast Track arena — the game itself is outside this mockup.')}>
          Enter Fast Track
          <span className="em-btn__disc"><ArrowRight size={14} strokeWidth={2.4} /></span>
        </button>
        <button type="button" className="em-btn em-btn--dark em-lj-prac" onClick={() => toast('Practice runs never count toward the gate.')}>
          <Play size={14} fill="currentColor" strokeWidth={0} />
          Practice Run
        </button>
      </section>

      <World clean>
        <Trail kind="lit" d="M816 446 C828 438 834 430 842 422" />
        <Trail kind="live" d="M1293 306 C1299 304 1303 302 1309 300" />
        <Trail kind="cold" d="M1342 324 C1358 348 1380 362 1398 372" />
        <Trail kind="cold" d="M1424 370 C1430 346 1422 322 1412 304" />
        <Trail kind="branch" d="M1446 404 C1472 410 1492 414 1510 418" />
        <Trail kind="branch" d="M1536 394 C1530 352 1478 322 1450 300" />
        <Trail kind="cold" d="M1452 262 C1476 252 1494 246 1508 238" />
        {SALES_MASTERY.map((s, i) => (SMALL[i] ? <Socket key={`k${i}`} x={BOX[i]!.x + BOX[i]!.w / 2} y={BOX[i]!.y + BOX[i]!.h + 3} w={BOX[i]!.w * 1.25} state={s.state} /> : null))}
        {SALES_MASTERY.map((s, i) => (
          <Stone
            key={s.n}
            box={BOX[i]!}
            type={s.type}
            state={s.state}
            small={SMALL[i]}
            n={s.n}
            selected={focus === i && s.state !== 'current'}
            onClick={() => setFocus(i)}
            className={s.type === 'branch' ? 'is-branchstone' : ''}
            tip={<Tip kicker={`Stage ${s.n} · ${TYPE_LABEL[s.type]}`} title={s.name} rows={[['Product', s.product], ['Gate', s.gate]]} />}
          >
            {i === 3 && <span className="em-you"><img src={`${import.meta.env.BASE_URL}shared/cast/strategist-face.webp`} alt="" /></span>}
          </Stone>
        ))}
        <span className="em-caption is-dim" style={{ left: WX(1497), top: 452 }}>7 · Recovery Path · below 70%</span>
        <span className="em-caption is-gold" style={{ left: WX(1409), top: 314 }}>8 · Q4 Sales Cup</span>
      </World>


      <div className="em-cards em-cards--journey">
        {/* the focused stage */}
        <section className="em-card em-now" aria-label="Stage detail">
          <header className="em-card__head">
            <StageGlyph type={st.type} size={20} tone="fire" />
            <h2>{st.state === 'current' ? 'Now Playing' : `Stage ${st.n}`}</h2>
            <span className={`em-pill em-head-pill ${st.state === 'done' ? 'em-pill--green' : st.state === 'current' ? 'em-pill--orange' : 'em-pill--dim'}`}>
              {st.state === 'done' ? <><Check size={12} strokeWidth={3} /> Cleared {st.result}</> : st.state === 'current' ? 'Live now' : <><Lock size={11} strokeWidth={2.6} /> Locked</>}
            </span>
          </header>
          <p className="em-now__kicker">Stage {st.n} of 9 · {TYPE_LABEL[st.type]} · {st.product}</p>
          <h3 className="em-now__title">{st.name}</h3>
          <p className="em-now__ask">{ASKS[st.n]}</p>
          {st.state === 'current' ? (
            <div className="em-now__stats">
              <div><Timer size={15} /><b>1 of 2</b><span>attempts left</span></div>
              <div><Star size={15} /><b>1,940</b><span>best run</span></div>
              <div><Trophy size={15} /><b>0 / 1</b><span>duel wins</span></div>
            </div>
          ) : (
            <button type="button" className="em-link em-now__back" onClick={() => setFocus(3)}>Back to the stage you are on <ArrowRight size={14} /></button>
          )}
        </section>

        {/* gate and rewards */}
        <section className="em-card em-rules" aria-label="Gate and rewards">
          <header className="em-card__head">
            <Lock size={19} strokeWidth={2} color="#ef6f2e" />
            <h2>Gate &amp; Rewards</h2>
          </header>
          <div className="em-rules__gate">
            <span className="em-rules__k">To clear this stage</span>
            <q>{GATE_SENTENCE[st.n]}</q>
            <div className="em-clauses is-static">
              {GATE_CLAUSES[st.n]!.map((c) => <span key={c} className="em-clause">{c}</span>)}
            </div>
          </div>
          <div className="em-rules__cols">
            <div>
              <span className="em-rules__k">You earn</span>
              <ul className="em-earn">
                {REWARDS[st.n]!.map((r) => (
                  <li key={r.t}>{r.i === 'xp' ? <Sparkles size={14} /> : r.i === 'syn' ? <Coins size={14} /> : <Trophy size={14} />}<b>{r.t}</b>{r.x && <i>{r.x}</i>}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="em-rules__k">If you miss</span>
              <p className="em-rules__miss">
                <GitBranch size={14} />
                <span>{MISS[st.n]}</span>
              </p>
            </div>
          </div>
        </section>

        {/* the path, and what unlocks next */}
        <section className="em-card em-path" aria-label="The path">
          <header className="em-card__head">
            <StageGlyph type="reward" size={19} tone="fire" />
            <h2>The Path</h2>
            <span className="em-head-note">Next unlock: Stage 5</span>
          </header>
          <ol className="em-route">
            {SALES_MASTERY.map((s, i) => (
              <li key={s.n} className={`is-${s.state}${focus === i ? ' is-focus' : ''}${s.n === 5 ? ' is-next' : ''}`}>
                <button type="button" onClick={() => setFocus(i)}>
                  <i>{s.state === 'done' ? <Check size={10} strokeWidth={3.4} /> : s.n}</i>
                  <b>{s.name}</b>
                  <span>{s.n === 5 ? 'Unlocks next' : s.state === 'done' ? s.result : s.state === 'current' ? 'Now' : TYPE_LABEL[s.type]}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}

const ASKS: Record<number, string> = {
  1: 'Six short lessons on the Northwind portfolio — indications, positioning and the questions buyers ask first.',
  2: 'A live session with the field team on reading buyer signals: urgency, authority and hidden objections.',
  3: 'Twelve scenario questions on discovery. You scored 86% — the gate asked for 80%.',
  4: 'Fast Track throws objections at you on a clock. Prioritise the ones that matter and answer before the lane closes — win one duel to clear it.',
  5: 'Ten items on pricing conversations: anchoring on value, handling discount pressure, and total cost of care.',
  6: 'The Leverage arena: negotiate against live opponents. Win two of three duels to move on.',
  7: 'Only opens if a score falls below 70% — a focused refresher on what you missed, then you rejoin the path.',
  8: 'The Q4 Sales Cup: a 32-player tournament. Finish in the top four to prove mastery.',
  9: 'The Sales Mastery badge, your certificate and 500 SYN — the gate at the top of the cliffs.',
};

const RECOVERY = <>Below 70% sends you to <b>Recovery Path</b> — a short refresher, then back on the path. After 3 loops a coach steps in.</>;

/** What happens if the gate is missed, per stage (the Recovery Path only follows scored stages). */
const MISS: Record<number, React.ReactNode> = {
  1: <>Nothing to fail — the lessons stay open until you finish them. Your progress is saved.</>,
  2: <>Missed it live? The <b>replay</b> counts — watch it in full to clear the stage.</>,
  3: RECOVERY,
  4: <>Lose both attempts and you go to <b>Recovery Path</b> — a short refresher, then a fresh pair of attempts.</>,
  5: RECOVERY,
  6: <>Lose two of three and you go to <b>Recovery Path</b>, then play the Leverage arena again.</>,
  7: <>Below 70% again sends you round once more. After the <b>3rd loop</b> a coach checks in with you in person.</>,
  8: <>Outside the top 4? You keep your place on the path and enter the <b>next cup</b> — no Recovery Path.</>,
  9: <>Nothing to miss — the badge unlocks as soon as every stage before it is cleared.</>,
};

const GATE_SENTENCE: Record<number, string> = {
  1: 'Complete every lesson in the course.',
  2: 'Attend the session or watch the full replay.',
  3: 'Score 80% or higher in the assessment to unlock the next stage.',
  4: 'Win 1 duel in Fast Track, within 2 attempts, to unlock Pricing & Value.',
  5: 'Score 80% or higher in the assessment to unlock the next stage.',
  6: 'Win 2 of 3 duels in the Leverage arena.',
  7: 'Finish the refresher and pass its check at 70% or higher.',
  8: 'Finish in the top 4 of the Q4 Sales Cup.',
  9: 'Clear every stage on the path.',
};

const GATE_CLAUSES: Record<number, string[]> = {
  1: ['Completion = 100%'],
  2: ['Attendance = true'],
  3: ['Score ≥ 80%'],
  4: ['Duel wins ≥ 1', 'Attempts ≤ 2'],
  5: ['Score ≥ 80%'],
  6: ['Duel wins ≥ 2 of 3'],
  7: ['Score < 70% routes here', 'Loops ≤ 3'],
  8: ['Placement ≤ 4'],
  9: ['All stages cleared'],
};

const REWARDS: Record<number, { t: string; i: 'xp' | 'syn' | 'badge'; x?: string }[]> = {
  1: [{ t: '+80 XP', i: 'xp' }],
  2: [{ t: '+80 XP', i: 'xp' }],
  3: [{ t: '+120 XP', i: 'xp' }, { t: '40 SYN', i: 'syn', x: '×1.5 streak' }],
  4: [{ t: '+150 XP', i: 'xp' }, { t: '60 SYN', i: 'syn', x: '×1.5 → 90' }, { t: 'Objection Slayer', i: 'badge', x: 'Rare badge' }],
  5: [{ t: '+120 XP', i: 'xp' }, { t: '40 SYN', i: 'syn' }],
  6: [{ t: '+150 XP', i: 'xp' }, { t: '60 SYN', i: 'syn' }],
  7: [{ t: 'Back on the path', i: 'xp' }],
  8: [{ t: 'Cup medal', i: 'badge', x: 'Epic' }, { t: '250 SYN', i: 'syn' }],
  9: [{ t: 'Mastery badge', i: 'badge', x: 'Epic' }, { t: '500 SYN', i: 'syn' }, { t: 'Certificate', i: 'badge' }],
};

export type { JourneyStage };
