import { useState } from 'react';
import {
  ArrowRight, Clock, RotateCcw, Sparkles, Swords, LockOpen, Flame, Shield, Check, ArrowUp, ArrowDown, Minus,
  Coins, Gem, Star, CircleCheck, Circle, TrendingUp,
} from 'lucide-react';
import { useNav } from '../shell';
import { Avatar, Bar, Btn, Medal, Tabs, fmt, useToast } from '../ui';
import { ACHIEVEMENTS, AHMED, ART, ATTEMPTS_LEFT, BEST_RUN, CURRENT, FACE, QUESTS, RARITY_LABEL, SALES_MASTERY, SQUAD } from '../data';

type Tab = 'quests' | 'rival' | 'badges' | 'wallet';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function LearnerHome() {
  const { go } = useNav();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('quests');
  const s = CURRENT;
  const next = SALES_MASTERY[s.n]!;
  const toGo = 80 - BEST_RUN;

  return (
    <div className="lh">
      <header className="pg-head">
        <h1 className="pg-title">Welcome back, {AHMED.first}</h1>
        <p className="pg-sub">You are on stage {s.n} of {SALES_MASTERY.length} in Sales Mastery. One good run unlocks the next stage.</p>
      </header>

      {/* 1 · the one thing to do: continue the current stage */}
      <section className="lh-hero tk-dark" aria-labelledby="lh-next">
        <div className="lh-hero__body">
          <p className="lh-hero__eye"><Swords size={17} strokeWidth={2.1} aria-hidden /> Your next stage · Stage {s.n} of {SALES_MASTERY.length} · Compete</p>
          <h2 id="lh-next" className="lh-hero__t">{s.title}</h2>
          <p className="lh-hero__d">In the Fast Track arena, sort buyer objections about price, timing and authority before they reach you.</p>
          <div className="lh-gate">
            <p className="lh-gate__row">
              <span className="lh-gate__l"><LockOpen size={17} strokeWidth={2.1} aria-hidden /> Score 80% or higher to unlock stage {next.n}, {next.title}</span>
              <span className="lh-gate__v">Your best: <b>{BEST_RUN}%</b>, {toGo} points to go</span>
            </p>
            <Bar value={BEST_RUN} target={80} tone="orange" label={`Best run ${BEST_RUN}% of the 80% needed`} />
          </div>
          <div className="lh-hero__cta">
            <Btn variant="primary" size="lg" iconRight={ArrowRight} onClick={() => toast(`Opening Fast Track for stage ${s.n}, ${s.title}. Good luck.`, 'orange')}>
              Continue stage {s.n}
            </Btn>
            <Btn variant="quiet" onClick={() => go('learner/journey')}>See the whole journey</Btn>
          </div>
          <ul className="lh-hero__meta" aria-label="About this stage">
            <li><Clock size={16} aria-hidden /> About {s.minutes} min</li>
            <li><RotateCcw size={16} aria-hidden /> {ATTEMPTS_LEFT} of 2 tries left today</li>
            <li><Sparkles size={16} aria-hidden /> +{s.xp} XP and +{s.syn} SYN</li>
          </ul>
        </div>
        <img className="lh-hero__art" src={ART.crew} width={513} height={365} alt="" draggable={false} />
      </section>

      {/* 2 · at a glance: skill rating, streak, a quick battle */}
      <section className="lh-glance" aria-label="At a glance">
        <article className="sm-card lh-tile">
          <span className="lh-tile__ic is-yellow" aria-hidden><Shield size={24} strokeWidth={2} /></span>
          <div className="lh-tile__b">
            <p className="lh-tile__l">Skill rating</p>
            <p className="lh-tile__v">{fmt(AHMED.sr)} <small>SR</small></p>
            <p className="lh-tile__s">{AHMED.tier} {AHMED.division} · {AHMED.srToNext} SR to {AHMED.nextDivision}</p>
            <Bar value={AHMED.sr - AHMED.divisionFloor} max={AHMED.divisionCeil - AHMED.divisionFloor} tone="yellow" label={`${AHMED.sr - AHMED.divisionFloor} of 100 SR through ${AHMED.tier} ${AHMED.division}`} />
          </div>
        </article>

        <article className="sm-card lh-tile">
          <span className="lh-tile__ic is-orange" aria-hidden><Flame size={24} strokeWidth={2} /></span>
          <div className="lh-tile__b">
            <p className="lh-tile__l">Streak</p>
            <p className="lh-tile__v">{AHMED.streak} days <small>×{AHMED.multiplier} SYN</small></p>
            <p className="lh-tile__s">Play today to keep it going.</p>
            <ol className="lh-days" aria-label="This week">
              {DAYS.map((d, i) => {
                const done = i < AHMED.streak;
                return (
                  <li key={d} className={done ? 'is-done' : 'is-today'} aria-label={`${d}: ${done ? 'played' : 'today, not played yet'}`}>
                    <span>{done ? <Check size={14} strokeWidth={3} aria-hidden /> : null}</span>
                    <small>{done ? d.slice(0, 1) : 'Today'}</small>
                  </li>
                );
              })}
            </ol>
          </div>
        </article>

        <article className="sm-card lh-tile">
          <span className="lh-tile__ic is-silver" aria-hidden><Swords size={24} strokeWidth={2} /></span>
          <div className="lh-tile__b">
            <p className="lh-tile__l">Quick battle</p>
            <p className="lh-tile__t">A 3-minute ranked Fast Track run against a squadmate</p>
            <Btn variant="secondary" icon={Swords} onClick={() => toast('Finding a squadmate for a quick Fast Track battle.', 'orange')}>Start a quick battle</Btn>
          </div>
        </article>
      </section>

      {/* 3 · everything else, one tab at a time */}
      <section id="progress" className="sm-card lh-more" aria-labelledby="lh-more-t">
        <div className="lh-more__head">
          <h2 id="lh-more-t" className="sec-title">Your progress</h2>
          <Tabs
            label="Progress" value={tab} onChange={setTab}
            options={[
              { v: 'quests', label: 'Quests', count: '2 of 6 today' },
              { v: 'rival', label: 'Rival and squad' },
              { v: 'badges', label: 'Achievements', count: '3 earned' },
              { v: 'wallet', label: 'Level and wallet' },
            ]}
          />
        </div>

        {tab === 'quests' && (
          <div className="lh-quests">
            {QUESTS.map((g) => (
              <div key={g.key} className="lh-qcol">
                <p className="lh-qcol__h"><b>{g.label}</b><span>{g.done} of {g.total} done · {g.resets}</span></p>
                <ul>
                  {g.items.map((q) => {
                    const done = q.done || (q.p && q.p[0] >= q.p[1]);
                    return (
                      <li key={q.t} className={done ? 'is-done' : ''}>
                        {done ? <CircleCheck size={19} className="lh-q__ic is-done" aria-hidden /> : <Circle size={19} className="lh-q__ic" aria-hidden />}
                        <span className="lh-q__t">
                          <b>{q.t}</b>
                          <small>{done ? 'Done' : q.p ? `${fmt(q.p[0])} of ${fmt(q.p[1])}${q.unit ? ` ${q.unit}` : ''}` : 'Not started'} · {q.reward}</small>
                          {!done && q.p && <Bar value={q.p[0]} max={q.p[1]} tone="green" label={`${q.t}: ${q.p[0]} of ${q.p[1]}`} />}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        {tab === 'rival' && (
          <div className="lh-rival">
            <div className="lh-rv">
              <p className="lh-sub-h">Your rival this season</p>
              <div className="lh-rv__row">
                <div className="lh-rv__p"><Avatar src={FACE.ahmed} size={64} alt="" /><b>You</b><small>{fmt(AHMED.sr)} SR</small></div>
                <div className="lh-rv__score" aria-label={`You ${AHMED.rival.you}, ${AHMED.rival.name} ${AHMED.rival.them}`}>
                  <span>{AHMED.rival.you}</span><i>to</i><span>{AHMED.rival.them}</span>
                </div>
                <div className="lh-rv__p"><Avatar src={FACE.omar} size={64} alt="" /><b>{AHMED.rival.name}</b><small>{fmt(AHMED.rival.sr)} SR</small></div>
              </div>
              <p className="lh-rv__note"><TrendingUp size={16} aria-hidden /> You lead. {AHMED.rival.last}.</p>
              <Btn variant="secondary" icon={Swords} onClick={() => toast(`Rematch sent to ${AHMED.rival.name}. You will hear when he accepts.`, 'green')}>Challenge {AHMED.rival.name.split(' ')[0]} to a rematch</Btn>
            </div>
            <div className="lh-squad">
              <p className="lh-sub-h">Squad {AHMED.squad} · you are {AHMED.squadRank}rd of {AHMED.squadSize} this week</p>
              <ol>
                {SQUAD.map((m) => (
                  <li key={m.rank} className={m.you ? 'is-you' : ''}>
                    <span className="lh-squad__r">{m.rank}</span>
                    <Avatar src={m.face} size={36} alt="" />
                    <span className="lh-squad__n">{m.you ? 'You' : m.name}{m.rival && <em>Rival</em>}</span>
                    <span className="lh-squad__p">{fmt(m.pts)} pts</span>
                    <span className={`lh-squad__d ${m.delta > 0 ? 'up' : m.delta < 0 ? 'down' : ''}`}>
                      {m.delta > 0 ? <ArrowUp size={15} aria-hidden /> : m.delta < 0 ? <ArrowDown size={15} aria-hidden /> : <Minus size={15} aria-hidden />}
                      {m.delta > 0 ? `Up ${m.delta}` : m.delta < 0 ? `Down ${-m.delta}` : 'Same'}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {tab === 'badges' && (
          <ul className="lh-badges">
            {ACHIEVEMENTS.map((a) => (
              <li key={a.id} className={`is-${a.state}`}>
                <Medal rarity={a.rarity} icon={a.icon} state={a.state} size={72} />
                <b>{a.name}</b>
                <small className={`lh-rar lh-rar--${a.rarity}`}>{RARITY_LABEL[a.rarity]}</small>
                <span className="lh-badges__s">
                  {a.state === 'earned' && <><CircleCheck size={15} aria-hidden /> Earned</>}
                  {a.state === 'progress' && a.progress && <><Star size={15} aria-hidden /> {a.progress[0]} of {a.progress[1]} days</>}
                  {a.state === 'locked' && <>{a.note}</>}
                </span>
              </li>
            ))}
          </ul>
        )}

        {tab === 'wallet' && (
          <div className="lh-wallet">
            <div className="lh-wl">
              <span className="lh-wl__ic is-orange" aria-hidden><Star size={22} /></span>
              <p className="lh-tile__l">Level {AHMED.level}</p>
              <p className="lh-wl__v">{fmt(AHMED.xp)} <small>of {fmt(AHMED.xpNext)} XP</small></p>
              <Bar value={AHMED.xp} max={AHMED.xpNext} tone="orange" label="XP to the next level" />
              <p className="lh-wl__s">{fmt(AHMED.xpNext - AHMED.xp)} XP to level {AHMED.level + 1}</p>
            </div>
            <div className="lh-wl">
              <span className="lh-wl__ic is-yellow" aria-hidden><Coins size={22} /></span>
              <p className="lh-tile__l">SYN</p>
              <p className="lh-wl__v">{fmt(AHMED.syn)}</p>
              <p className="lh-wl__s">Earned from stages, quests and battles. Spend it in the store.</p>
            </div>
            <div className="lh-wl">
              <span className="lh-wl__ic is-silver" aria-hidden><Gem size={22} /></span>
              <p className="lh-tile__l">Q-Shards</p>
              <p className="lh-wl__v">{AHMED.shards}</p>
              <p className="lh-wl__s">The rarer currency, for season rewards.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
