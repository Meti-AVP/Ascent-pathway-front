// Learner home: Ahmed's climb, his rank, quests, rival, squad and achievements.
import { ArrowRight, Award, BookOpen, Coins, Crown, Flame, Gem, Shield, Swords, Target, Zap } from 'lucide-react';
import { ACHIEVEMENTS, LEARNER, QUESTS, SALES_MASTERY, SQUAD, type Rarity } from '../data';
import { World, WX } from '../World';
import { PED, Stone, Tip } from '../stage';
import { go, useToast } from '../App';

const CAST = (n: string) => `${import.meta.env.BASE_URL}shared/cast/${n}-face.webp`;

export function LearnerHome() {
  const toast = useToast();
  const s = SALES_MASTERY;
  const tip = (i: number) => {
    const st = s[i]!;
    return (
      <Tip
        kicker={`Stage ${st.n} · ${st.state === 'done' ? 'Cleared' : st.state === 'current' ? 'Now' : 'Locked'}`}
        title={st.name}
        rows={[['Product', st.product], ['Gate', st.gate], ['Reward', st.reward]]}
      />
    );
  };
  return (
    <>
      {/* hero first in the DOM so Tab reaches the primary action before the canvas (paint order is z-index) */}
      <section className="em-hero" aria-labelledby="em-lh-title">
        <p className="em-eyebrow">Sales Mastery · Stage 4 of 9</p>
        <h1 id="em-lh-title" className="em-h1">
          Welcome Back, Ahmed.
          <br />
          Continue Your <em>Climb</em>
        </h1>
        <p className="em-sub">
          Objection Handling is live in the Fast Track arena.
          <br />
          Win one duel to light the next stone on your path.
        </p>
        <button type="button" className="em-btn em-btn--fire em-hero__cta em-lh-cta" onClick={() => go('/learner/journey')}>
          Continue Stage 4
          <span className="em-btn__disc"><ArrowRight size={14} strokeWidth={2.4} /></span>
        </button>
        <button type="button" className="em-btn em-btn--dark em-lh-battle" onClick={() => toast('Matching you in Fast Track… the arena itself is outside this mockup.')}>
          <Zap size={15} strokeWidth={2.2} className="em-y" />
          Quick Battle
          <span className="em-btn__meta">Fast Track · ~4 min</span>
        </button>
      </section>

      <World clean>
        {/* each pedestal opens the journey on the stage it stands for */}
        <Stone box={PED.learn} type="learn" state="done" tip={tip(1)} onClick={() => go('/learner/journey', 'stage=2')} />
        <Stone box={PED.assess} type="assess" state="done" tip={tip(2)} onClick={() => go('/learner/journey', 'stage=3')} />
        <Stone box={PED.compete} type="compete" state="current" tip={tip(3)} onClick={() => go('/learner/journey', 'stage=4')}>
          <span className="em-you" aria-hidden>
            <img src={CAST('strategist')} alt="" />
          </span>
        </Stone>
        <Stone box={PED.prove} type="prove" state="locked" tip={tip(7)} onClick={() => go('/learner/journey', 'stage=8')} />
        <Stone box={PED.reward} type="reward" state="locked" tip={tip(8)} onClick={() => go('/learner/journey', 'stage=9')} />
        <span className="em-caption" style={{ left: WX(1245), top: 338 }}>Stage 4 · Objection Handling</span>
      </World>

      {/* wallet in the top bar */}
      <div className="em-wallet" aria-label="Streak and currencies">
        <span className="em-chipbar is-streak" title="6-day streak — every reward earns ×1.5">
          <Flame size={15} strokeWidth={2.2} /> {LEARNER.streak}-day streak <b>×{LEARNER.multiplier}</b>
        </span>
        <span className="em-chipbar" title="SYN — the ASCENT currency"><Coins size={15} strokeWidth={2} /> {LEARNER.syn.toLocaleString()} <i>SYN</i></span>
        <span className="em-chipbar" title="Q-Shards — rarer currency"><Gem size={14} strokeWidth={2} /> {LEARNER.shards} <i>Q-Shards</i></span>
      </div>


      <div className="em-cards em-cards--4">
        {/* Skill rating */}
        <section className="em-card em-rank" aria-label="Skill rating">
          <header className="em-card__head">
            <Shield size={20} strokeWidth={2} color="#ef6f2e" />
            <h2>Skill Rating</h2>
            <span className="em-head-note">Season 4</span>
          </header>
          <div className="em-tier" aria-hidden>
            <i className="em-tier__gem"><b>II</b></i>
          </div>
          <div className="em-rank__sr">
            <b>{LEARNER.sr.toLocaleString()}</b>
            <span>SR</span>
          </div>
          <p className="em-rank__tier">{LEARNER.tier}</p>
          <div className="em-rank__next">
            <div className="em-bar is-gold"><i style={{ width: '41%' }} /></div>
            <span><b>{LEARNER.toNext} SR</b> to {LEARNER.nextTier}</span>
          </div>
          <div className="em-rank__rows">
            <div className="em-kv">
              <span>Level {LEARNER.level}</span>
              <div className="em-bar"><i style={{ width: `${(LEARNER.xp / LEARNER.xpNext) * 100}%` }} /></div>
              <b>{LEARNER.xp} / {LEARNER.xpNext.toLocaleString()} XP</b>
            </div>
            <div className="em-kv is-streak">
              <span><Flame size={14} strokeWidth={2.2} /> Streak</span>
              <div className="em-flames">
                {Array.from({ length: 7 }, (_, i) => <i key={i} className={i < LEARNER.streak ? 'is-on' : ''} />)}
              </div>
              <b className="em-y">×{LEARNER.multiplier} earn</b>
            </div>
          </div>
        </section>

        {/* Quests */}
        <section className="em-card em-quests" aria-label="Quests">
          <header className="em-card__head">
            <Target size={20} strokeWidth={2} color="#ef6f2e" />
            <h2>Quests</h2>
            <span className="em-head-note">3 open</span>
          </header>
          {QUESTS.map((q, i) => (
            <button key={q.scope} type="button" className="em-quest" style={{ top: 66 + i * 76 }} onClick={() => toast(`${q.scope} quest: ${q.title} — ${q.done}/${q.total}.`)}>
              <span className={`em-quest__scope is-${q.scope.toLowerCase()}`}>{q.scope}</span>
              <b>{q.title}</b>
              <span className="em-quest__meta">{q.resets}</span>
              <div className="em-bar"><i style={{ width: `${(q.done / q.total) * 100}%` }} /></div>
              <span className="em-quest__count">{q.done}/{q.total}</span>
              <span className="em-quest__reward">{q.reward}</span>
            </button>
          ))}
        </section>

        {/* Rival & squad */}
        <section className="em-card em-rival" aria-label="Rival and squad">
          <header className="em-card__head">
            <Swords size={20} strokeWidth={2} color="#ef6f2e" />
            <h2>Rival &amp; Squad</h2>
          </header>
          <div className="em-duel">
            <img src={CAST('strategist')} alt="Ahmed Hassan" />
            <div className="em-duel__score">
              <b>3 <i>–</i> 2</b>
              <span>You lead Omar H.</span>
            </div>
            <img src={CAST('clinician')} alt="Omar H." />
            <button type="button" className="em-mini-btn" onClick={() => toast('Rematch sent to Omar H. — Fast Track, best of one.')}>Rematch</button>
          </div>
          <div className="em-squad">
            <p><b>{LEARNER.squad}</b><span>{LEARNER.squadRank}rd of {LEARNER.squadSize}</span></p>
            <ol>
              {SQUAD.map((m) => (
                <li key={m.name} className={m.me ? 'is-me' : ''}>
                  <i>{m.rank}</i>
                  <span>{m.me ? 'You' : m.name}</span>
                  <b>{m.sr.toLocaleString()}</b>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Achievements */}
        <section className="em-card em-ach" aria-label="Achievements">
          <header className="em-card__head">
            <Award size={20} strokeWidth={2} color="#ef6f2e" />
            <h2>Achievements</h2>
            <span className="em-head-note">23 of 60</span>
          </header>
          <ul className="em-medals">
            {ACHIEVEMENTS.map((a) => (
              <li key={a.name} className={`r-${a.rarity.toLowerCase()}${a.when === 'Locked' ? ' is-locked' : ''}`} title={`${a.name} · ${a.rarity} · ${a.when}`}>
                <i><MedalIcon k={a.icon} /></i>
                <b>{a.name}</b>
                <span>{a.rarity}</span>
              </li>
            ))}
          </ul>
          <p className="em-ach__foot">
            Next: <b>Apex Climber</b> — reach Platinum before the Q4 Cup
          </p>
        </section>
      </div>
    </>
  );
}

function MedalIcon({ k }: { k: string }) {
  const p = { size: 18, strokeWidth: 2 };
  if (k === 'flame') return <Flame {...p} />;
  if (k === 'swords') return <Swords {...p} />;
  if (k === 'target') return <Target {...p} />;
  if (k === 'book') return <BookOpen {...p} />;
  return <Crown {...p} />;
}

export const RARITY_ORDER: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
