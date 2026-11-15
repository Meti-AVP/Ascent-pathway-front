import { useState } from 'react';
import { ArrowDown, Coins, Eye, Flame, Footprints, Gem, Play, Swords, Target, Trophy, Users } from 'lucide-react';
import { Brush, Splatter, Swoosh } from '../fx/Brush';
import { clunk } from '../fx/sound';
import { learner, pathway, stages } from '../data';
import { stageSpec, TapeCover } from '../covers/TapeCover';
import { fmt, startTape, toast } from '../store';
import { rise } from '../shell/ui';

const cur = stages.find((s) => s.status === 'current')!;
const nextStage = stages[cur.n]!; // the stage this one unlocks
const RARITY = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];

export function Home() {
  const [inserting, setInserting] = useState(false);

  const play = () => {
    if (inserting) return;
    setInserting(true);
    clunk('play');
    window.setTimeout(() => {
      startTape({ n: cur.n, title: cur.title, product: `The ${cur.product} arena`, kind: 'Compete · Battle arena', from: 'Home' });
      setInserting(false);
    }, 620);
  };

  const quickBattle = () => {
    clunk('tick');
    toast({
      tone: 'info',
      text: 'Finding you a quick battle…',
      detail: 'A ranked Fast Track duel, usually under 30 seconds. It counts toward your skill rating.',
      action: { label: 'Cancel', run: () => toast({ tone: 'info', text: 'Quick battle cancelled.', ms: 3000 }) },
    });
  };

  const srPct = ((learner.sr - learner.tierFloor) / (learner.tierCeil - learner.tierFloor)) * 100;

  return (
    <main className="tp-page tp-home">
      <div className="tp-home__fold">
      <section className="tp-home__hero">
        <div className="tp-home__copy">
          <div className="tp-home__where tp-rise" style={rise(0)}>
            <span className="tp-kicker">
              {pathway.name} · Stage {cur.n} of {pathway.tapes}
            </span>
            <span className="tp-pathmeter" role="img" aria-label={`${pathway.done} stages done, stage ${cur.n} in progress, ${pathway.tapes - cur.n} to go`}>
              {stages.map((s) => (
                <i key={s.id} className={`is-${s.status}`} />
              ))}
            </span>
          </div>
          <div className="tp-home__titlewrap tp-rise" style={rise(1)}>
            <Brush as="h1" text={cur.title.replace(' ', '\n')} className="tp-home__title" />
            <Splatter seed={5} className="tp-home__splat" />
            <Swoosh seed={9} className="tp-home__swoosh" />
          </div>
          <p className="tp-lede tp-home__lede tp-rise" style={rise(2)}>
            Win one duel in the <b>{cur.product}</b> arena to clear this stage and unlock <b>{nextStage.title}</b>.
          </p>
          <p className="tp-home__sofar tp-rise" style={rise(2)}>
            <Target size={16} aria-hidden /> So far: 0 of 1 wins · 2 runs · best run 8,420
          </p>
          <div className="tp-home__ctas tp-rise" style={rise(3)}>
            <button className="tp-btn tp-btn--primary tp-btn--hero" onClick={play}>
              <span className="tp-btn__disc" aria-hidden>
                <Play size={20} fill="currentColor" strokeWidth={0} />
              </span>
              <span className="tp-btn__two">
                <b>
                  Play tape {cur.n} · Start {cur.title}
                </b>
                <small>
                  {cur.product} arena · about {cur.minutes} min
                </small>
              </span>
            </button>
            <button className="tp-btn tp-btn--secondary" onClick={quickBattle}>
              <Swords size={18} strokeWidth={2.2} aria-hidden /> Quick battle
            </button>
          </div>
        </div>

        <div className="tp-home__art tp-rise" style={rise(1)}>
          <div className={`tp-home__slot ${inserting ? 'is-inserting' : ''}`}>
            <div className="tp-home__tapeclip">
              <div className="tp-home__tape">
                <TapeCover spec={stageSpec(cur)} label={`Tape ${cur.n} cover: ${cur.title}, ${cur.product} arena`} />
              </div>
            </div>
            <div className="tp-vcr" aria-hidden>
              <div className="tp-vcr__mouth" />
              <div className="tp-vcr__face">
                <span className="tp-vcr__brand">ASCENT · HQ</span>
                <span className="tp-vcr__lcd">{inserting ? <b>PLAY ▶ 04</b> : 'TAPE 04 · READY'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="tp-home__glance tp-rise" style={rise(4)} aria-label="At a glance">
        <div className="tp-glance">
          <span className="tp-glance__k">
            <Trophy size={15} aria-hidden /> Skill rating
          </span>
          <span className="tp-glance__v">
            <b className="tp-num">{fmt(learner.sr)}</b>
            <em>{learner.tier}</em>
          </span>
          <span className="tp-bar" role="img" aria-label={`${Math.round(srPct)}% of the way to ${learner.nextTier}`}>
            <i style={{ width: `${srPct}%` }} />
          </span>
          <span className="tp-glance__s">
            {learner.toNext} SR to reach {learner.nextTier}
          </span>
        </div>
        <div className="tp-glance">
          <span className="tp-glance__k">
            <Flame size={15} aria-hidden /> Streak
          </span>
          <span className="tp-glance__v">
            <b className="tp-num">{learner.streak} days</b>
            <em>×{learner.multiplier} XP and SYN</em>
          </span>
          <span className="tp-days" role="img" aria-label={`${learner.streak} of the last 7 days played`}>
            {Array.from({ length: 7 }, (_, i) => (
              <i key={i} className={i < learner.streak ? 'is-on' : ''} />
            ))}
          </span>
          <span className="tp-glance__s">Play today to keep the multiplier</span>
        </div>
        <a
          className="tp-home__more"
          href="#season"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('season')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          Quests, rival, squad and badges <ArrowDown size={16} aria-hidden />
        </a>
      </section>
      </div>

      <section id="season" className="tp-home__season" aria-labelledby="season-h">
        <h2 id="season-h" className="tp-h2">
          This week
        </h2>
        <div className="tp-home__cards">
          <article className="tp-card">
            <header className="tp-card__h">
              <h3>Quests</h3>
              <span>Small goals that pay XP and SYN</span>
            </header>
            {learner.quests.map((q) => (
              <div className="tp-quest" key={q.key}>
                <div className="tp-quest__top">
                  <b>{q.key}</b>
                  <span className="tp-quest__n">
                    {q.done} of {q.total} done
                  </span>
                </div>
                <div className="tp-meter" role="img" aria-label={`${q.done} of ${q.total} ${q.key.toLowerCase()} quests done`}>
                  {Array.from({ length: q.total }, (_, i) => (
                    <i key={i} className={i < q.done ? 'is-on' : ''} />
                  ))}
                </div>
                <p className="tp-quest__next">
                  Next: {q.next} <em>{q.reward}</em>
                </p>
                <p className="tp-quest__reset">{q.resets}</p>
              </div>
            ))}
          </article>

          <article className="tp-card">
            <header className="tp-card__h">
              <h3>Rival and squad</h3>
              <span>
                {learner.squad} · you are {learner.squadRank}rd of {learner.squadSize}
              </span>
            </header>
            <div className="tp-rival">
              <div className="tp-rival__who">
                <span>You</span>
                <b className="tp-num">{learner.rival.you}</b>
              </div>
              <span className="tp-rival__vs">vs</span>
              <div className="tp-rival__who">
                <span>{learner.rival.name}</span>
                <b className="tp-num is-them">{learner.rival.them}</b>
              </div>
              <p className="tp-rival__note">You lead the head-to-head. Last five duels:</p>
              <div className="tp-rival__last">
                {learner.rival.last.map((r, i) => (
                  <span key={i} className={r === 'W' ? 'is-w' : 'is-l'}>
                    {r === 'W' ? 'Win' : 'Loss'}
                  </span>
                ))}
              </div>
            </div>
            <ol className="tp-squad">
              {learner.squadTable.map((r) => (
                <li key={r.rank} className={r.you ? 'is-you' : ''}>
                  <span className="tp-num">{r.rank}</span>
                  <b>{r.you ? `${r.name} (you)` : r.name}</b>
                  <span className="tp-num">{fmt(r.pts)}</span>
                </li>
              ))}
            </ol>
            <p className="tp-card__foot">130 points to pass Omar H. for 2nd place</p>
          </article>

          <article className="tp-card">
            <header className="tp-card__h">
              <h3>Badges and wallet</h3>
              <span>{learner.badgeCount} badges earned so far</span>
            </header>
            <div className="tp-badges">
              {learner.badges.map((b, i) => (
                <div key={b.name} className={`tp-sticker tp-sticker--${b.rarity.toLowerCase()} tp-sticker--${b.shape}`} style={{ rotate: `${[-5, 4, -2, 6][i]}deg` }}>
                  <span className="tp-sticker__ico" aria-hidden>
                    {b.name === 'Discovery Ace' ? <Target size={18} /> : b.name === 'Squad Top 3' ? <Users size={18} /> : b.name === 'Buyer Reader' ? <Eye size={18} /> : <Footprints size={18} />}
                  </span>
                  <b>{b.name}</b>
                  <span className="tp-sticker__r">{b.rarity}</span>
                  <span className="tp-sticker__pips" aria-hidden>
                    {RARITY.map((r, k) => (
                      <i key={r} className={k <= RARITY.indexOf(b.rarity) ? 'is-on' : ''} />
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <dl className="tp-wallet">
              <div>
                <dt>
                  <Coins size={15} aria-hidden /> SYN
                </dt>
                <dd className="tp-num">{fmt(learner.syn)}</dd>
              </div>
              <div>
                <dt>
                  <Gem size={15} aria-hidden /> Q-Shards
                </dt>
                <dd className="tp-num">{learner.shards}</dd>
              </div>
              <div>
                <dt>Level {learner.level}</dt>
                <dd className="tp-num">
                  {fmt(learner.xp)}
                  <small> XP</small>
                </dd>
                <dd className="tp-wallet__s">{fmt(learner.xpNext - learner.xp)} XP to level {learner.level + 1}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>
    </main>
  );
}
