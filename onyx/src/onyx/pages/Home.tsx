import { useEffect, useRef } from 'react';
import { ArrowRight, ChevronDown, Flame, Gem, Hexagon, Play, Swords } from 'lucide-react';
import { gsap, useGSAP, splitReveal, rise, reduced } from '../motion';
import { Avatar, Bar, Btn, Chip, Num, Segments, StateTag, TierGem, cx } from '../ui';
import { LEARNER, RARITIES, currentStageOf, doneCount, pathwayOf } from '../data';
import { launch } from '../store';
import { HeroHost } from '../HeroHost';
import { go } from '../router';
import './home.css';

const L = LEARNER;
const path = pathwayOf('sales');
const stage = currentStageOf(path);
const done = doneCount(path);

export function Home() {
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const dust = useRef<HTMLCanvasElement>(null);

  // Entrance: the light comes up on Ahmed, a rim sweep crosses him, then the words arrive.
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    if (reduced()) {
      gsap.set(q('.hero__dark'), { opacity: 0 });
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: 'onyx' } });
    tl.fromTo(q('.hero__dark'), { opacity: 1 }, { opacity: 0, duration: 1.6, ease: 'power2.out' }, 0)
      .fromTo(q('.hero__char'), { filter: 'brightness(0.15) blur(8px)', scale: 1.05 }, { filter: 'brightness(1) blur(0px)', scale: 1, duration: 2, clearProps: 'filter' }, 0)
      .fromTo(q('.hero__ember'), { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 2.2 }, 0.1)
      .fromTo(q('.hero__rays'), { opacity: 0 }, { opacity: 1, duration: 2.4, ease: 'power1.out' }, 0.2)
      .fromTo(q('.hero__sweep'), { '--sweep': '-60%' }, { '--sweep': '160%', duration: 2, ease: 'power2.inOut' }, 0.4)
      .add(() => splitReveal(title.current, { stagger: 0.026 }), 0.15)
      .fromTo(q('.hero__eyebrow'), { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.9 }, 0.1)
      .add(rise(q('.hero__meta, .hero__lede, .hero__actions, .hero__more'), { stagger: 0.07 }), 0.4)
      .fromTo(q('.seg'), { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, stagger: 0.04, duration: 0.7, transformOrigin: '0 50%' }, 0.6)
      .add(rise(q('.readouts'), { y: 30 }), 0.6)
      .fromTo(q('.scroll-cue'), { opacity: 0 }, { opacity: 1, duration: 1 }, 1.2);

    // the week section reveals on scroll
    q('.week .reveal').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 40, filter: 'blur(8px)' }, {
        opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, clearProps: 'filter',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    });
    // depth on scroll: Ahmed drifts slower than the page, the copy recedes
    gsap.to(q('.hero__char-wrap'), { yPercent: 9, ease: 'none', scrollTrigger: { trigger: hero.current, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to(q('.hero__copy'), { opacity: 0.15, y: -40, ease: 'none', scrollTrigger: { trigger: hero.current, start: '20% top', end: '85% top', scrub: true } });
  }, { scope: root });

  // Cursor parallax: each layer of the scene moves by its depth.
  useEffect(() => {
    if (reduced() || !hero.current) return;
    const layers = [...hero.current.querySelectorAll<HTMLElement>('[data-depth]')].map((el) => ({
      d: Number(el.dataset.depth),
      x: gsap.quickTo(el, 'x', { duration: 1.4, ease: 'power3' }),
      y: gsap.quickTo(el, 'y', { duration: 1.4, ease: 'power3' }),
    }));
    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / innerWidth - 0.5;
      const ny = e.clientY / innerHeight - 0.5;
      layers.forEach((l) => { l.x(-nx * 46 * l.d); l.y(-ny * 22 * l.d); });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // Dust in the key light: slow motes, brighter near the light.
  useEffect(() => {
    const c = dust.current;
    if (!c || reduced()) return;
    const g = c.getContext('2d');
    if (!g) return;
    const dpr = Math.min(devicePixelRatio, 1.5);
    let w = 0, h = 0;
    const size = () => { w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 32;
    const sg = sprite.getContext('2d')!;
    const grd = sg.createRadialGradient(16, 16, 0, 16, 16, 16);
    grd.addColorStop(0, 'rgba(255,226,196,1)'); grd.addColorStop(0.35, 'rgba(255,200,150,0.35)'); grd.addColorStop(1, 'rgba(255,190,140,0)');
    sg.fillStyle = grd; sg.fillRect(0, 0, 32, 32);
    const motes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: 2 + Math.random() * 7, vx: (Math.random() - 0.3) * 0.00012, vy: -0.00004 - Math.random() * 0.00012, p: Math.random() * Math.PI * 2 }));
    let raf = 0, last = performance.now(), visible = true;
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; });
    io.observe(c);
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(50, t - last); last = t;
      if (!visible) return;
      g.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.x += m.vx * dt; m.y += m.vy * dt; m.p += dt * 0.0012;
        if (m.y < -0.05) { m.y = 1.05; m.x = Math.random(); }
        if (m.x > 1.05) m.x = -0.05; if (m.x < -0.05) m.x = 1.05;
        // light pool: upper left, where Ahmed is looking
        const lx = m.x - 0.32, ly = m.y - 0.12;
        const lightness = Math.max(0, 1 - Math.sqrt(lx * lx * 1.4 + ly * ly) * 1.25);
        const a = (0.12 + lightness * 0.75) * (0.55 + 0.45 * Math.sin(m.p));
        if (a < 0.03) continue;
        g.globalAlpha = a;
        g.drawImage(sprite, m.x * w - m.r, m.y * h - m.r, m.r * 2, m.r * 2);
      }
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener('resize', size);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('resize', size); };
  }, []);

  const startStage = () => launch({
    eyebrow: `Stage ${stage.n} of ${path.stages.length} · ${path.name}`,
    title: stage.name,
    detail: `Fast Track arena, round 1 of 3. ${stage.pass}`,
    steps: ['Loading the Fast Track arena', 'Matching you with a Gold-tier opponent', 'Round 1 is ready'],
  });
  const quickBattle = () => launch({
    eyebrow: 'Quick battle · Fast Track',
    title: 'Finding your opponent',
    detail: 'A 3-minute duel against a player near your 1,612 SR. Wins earn SR and SYN, ×1.5 while your streak lasts.',
    steps: ['Searching near 1,612 SR', 'Opponent found: Layla M., Gold II', 'The duel is ready'],
  });

  return (
    <div ref={root} className="page home">
      <section ref={hero} className="hero" aria-labelledby="hero-title">
        <div className="hero__scene" aria-hidden>
          <div className="hero__sky" data-depth="0.12" />
          <div className="hero__rays" data-depth="0.2"><span /><span /><span /></div>
          <canvas ref={dust} className="hero__dust" />
          <div className="hero__ember" data-depth="0.45" />
          <div className="hero__char-wrap">
            <div className="hero__stand" data-depth="0.85">
              <HeroHost
                character="ahmed"
                fallback={
                  <div className="hero__char">
                    <img src="/onyx/img/ahmed-up.webp" alt="" width={525} height={1671} />
                    <span className="hero__sweep" />
                  </div>
                }
              />
            </div>
          </div>
          <div className="hero__floor" />
          <div className="hero__dark" />
        </div>

        <div className="hero__copy">
          <p className="eyebrow hero__eyebrow">Welcome back, {L.first} · your next stage</p>
          <h1 id="hero-title" ref={title} className="hero__title display">{stage.name}</h1>
          <div className="hero__meta">
            <StateTag state="current" text={`Stage ${stage.n} of ${path.stages.length}`} />
            <span className="hero__where">{path.name} <span className="sep" /> Compete in the {stage.product.name} arena</span>
          </div>
          <p className="hero__lede">{stage.asks}</p>
          <div className="hero__actions">
            <Btn kind="primary" size="lg" icon={<Play fill="currentColor" />} onClick={startStage}>Continue stage {stage.n}</Btn>
            <Btn kind="glass" size="lg" icon={<Swords />} onClick={quickBattle}>Quick battle</Btn>
          </div>
          <div className="hero__more">
            <Segments states={path.stages.map((s) => s.state)} />
            <span className="hero__done" aria-label={`${done} of ${path.stages.length} stages done`}>{done} of {path.stages.length} done</span>
            <button type="button" className="link" onClick={() => go('learner/journey', { path: 'sales' })}>
              See the whole journey <ArrowRight />
            </button>
          </div>
        </div>

        <div className="readouts glass g-lit" role="group" aria-label="Your standing">
          <div className="ro">
            <span className="label">Streak</span>
            <div className="ro__v"><Flame className="ro__flame" /><Num value={L.streak} /><span className="ro__unit">days</span></div>
            <span className="ro__sub">×{L.multiplier} earnings while it lasts</span>
          </div>
          <div className="ro">
            <span className="label">Skill rating</span>
            <div className="ro__v"><TierGem size={30} /><Num value={L.sr} delay={0.15} /></div>
            <span className="ro__sub">{L.tier} · {L.toNextTier} SR to {L.nextTier}</span>
          </div>
          <div className="ro">
            <span className="label">Level</span>
            <div className="ro__v"><Num value={L.level} delay={0.3} /><span className="ro__xp"><Bar value={L.xp} max={L.xpNext} tone="sun" /></span></div>
            <span className="ro__sub">{L.xp} / {L.xpNext.toLocaleString('en-US')} XP to level {L.level + 1}</span>
          </div>
        </div>

        <a className="scroll-cue" href="#week" onClick={(e) => { e.preventDefault(); document.getElementById('week')?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); }}>
          Quests, rival and squad <ChevronDown size={16} />
        </a>
      </section>

      <section id="week" className="week" aria-labelledby="week-title">
        <header className="week__head reveal">
          <div>
            <p className="eyebrow">This week</p>
            <h2 id="week-title" className="week__title">Quests, rival and squad</h2>
          </div>
          <div className="wallet" aria-label="Wallet">
            <span className="wallet__item"><Gem size={18} /> <strong>{L.syn.toLocaleString('en-US')}</strong> SYN</span>
            <span className="wallet__item"><Hexagon size={18} /> <strong>{L.shards}</strong> Q-Shards</span>
          </div>
        </header>

        <div className="week__grid">
          <article className="card glass g-lit reveal">
            <h3 className="card__title">Quests</h3>
            <ul className="quests">
              {L.quests.map((qq) => (
                <li key={qq.id}>
                  <div className="quests__row"><span>{qq.label}</span><span className="num"><strong>{qq.done}</strong> of {qq.total}</span></div>
                  <Bar value={qq.done} max={qq.total} tone="silver" />
                  <span className="quests__reset">{qq.resets}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="card glass g-lit reveal">
            <h3 className="card__title">Your rival</h3>
            <div className="rival">
              <div className="rival__side"><Avatar who="ahmed" size={56} /><span>You</span></div>
              <div className="rival__score num" aria-label={`You lead ${L.rival.me} to ${L.rival.them}`}><span className="is-lead">{L.rival.me}</span><span className="rival__dash">–</span><span>{L.rival.them}</span></div>
              <div className="rival__side"><span className="rival__mono">OH</span><span>{L.rival.name}</span></div>
            </div>
            <p className="card__note">You lead the head-to-head. Omar is {L.sr - L.rival.sr} SR behind you.</p>
            <Btn kind="glass" size="sm" icon={<Swords />} onClick={() => launch({ eyebrow: 'Rival duel · Fast Track', title: `Challenge ${L.rival.name}`, detail: 'A best-of-three rival duel. The winner takes the head-to-head point.', steps: ['Sending the challenge to Omar', 'Omar accepted', 'The duel is ready'] })}>Challenge Omar</Btn>
          </article>

          <article className="card glass g-lit reveal">
            <h3 className="card__title">{L.squad}</h3>
            <p className="squad__place"><span className="num">{L.squadPlace}rd</span> of {L.squadSize} in your squad</p>
            <ol className="squad">
              {L.squadBoard.map((m, i) => (
                <li key={m.name} className={cx(m.me && 'is-me')}>
                  <span className="squad__rank num">{i + 1}</span>
                  <span className="squad__name">{m.me ? 'You' : m.name}</span>
                  <span className="squad__sr num">{m.sr.toLocaleString('en-US')} SR</span>
                </li>
              ))}
            </ol>
          </article>

          <article className="card glass g-lit reveal">
            <h3 className="card__title">Recent badges</h3>
            <ul className="badges">
              {L.achievements.map((a) => {
                const lvl = RARITIES.indexOf(a.rarity as (typeof RARITIES)[number]) + 1;
                return (
                  <li key={a.name}>
                    <span className={cx('badge-glyph', lvl >= 4 && 'is-high')} aria-hidden><Hexagon size={22} /></span>
                    <span className="badges__text"><strong>{a.name}</strong><span>{a.when}</span></span>
                    <span className="rarity" aria-label={`${a.rarity}, rarity ${lvl} of 5`}>
                      <span className="rarity__pips" aria-hidden>{[1, 2, 3, 4, 5].map((p) => <i key={p} className={cx(p <= lvl && 'on')} />)}</span>
                      <span>{a.rarity}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>
        </div>
        <p className="week__foot reveal">
          <Chip tone="ember" icon={<Flame size={14} />}>Day {L.streak} of your streak</Chip>
          <span>Play one stage or battle today to keep the ×{L.multiplier} multiplier.</span>
        </p>
      </section>
    </div>
  );
}

