import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Avatar } from '../../data/cast';
import { nextStage, player, rival, season, type TabId } from '../../data/home';
import type { Framing } from '../../stage/HeroStage';
import { Icon } from '../../ui/Icon';
import { useCountUp } from '../../ui/useCountUp';
import { Backdrop } from './Backdrop';
import { LeftStack } from './LeftStack';
import './home.css';

type Props = { onNavigate: (tab: TabId) => void; avatar: Avatar };

// three.js is most of the bundle: it is fetched on its own so the menu paints first
const HeroCanvas = lazy(() => import('../../stage/HeroCanvas').then((m) => ({ default: m.HeroCanvas })));

/** Landscape: the character stands right of centre, cropped above the knee like key art. */
const WIDE: Framing = { top: 0.118, bottom: 1.34, x: 0.548 };
/** Portrait / narrow: centred and a little smaller so the interface fits around it. */
const TALL: Framing = { top: 0.17, bottom: 0.98, x: 0.5 };

function useIsTall() {
  const query = '(max-aspect-ratio: 1/1), (max-width: 820px)';
  const [tall, setTall] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setTall(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return tall;
}

/** Eased pointer position written to --px / --py (-1..1) for the layered backdrop. */
function useParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      el.style.setProperty('--px', x.toFixed(4));
      el.style.setProperty('--py', y.toFixed(4));
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.0006 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

function TierEmblem({ pips }: { pips: number }) {
  return (
    <svg className="rank-emblem" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="tier-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.45" stopColor="#ffd21f" />
          <stop offset="1" stopColor="#b98a00" />
        </linearGradient>
      </defs>
      <path fill="url(#tier-gold)" d="M32 3 56 14v20c0 13-9.500 21.500-24 27C17.500 55.500 8 47 8 34V14z" />
      <path fill="#000" opacity="0.82" d="M32 10.500 49.500 18.500V34c0 9.500-6.500 15.800-17.500 20.200C21 49.800 14.500 43.500 14.500 34V18.500z" />
      <path fill="url(#tier-gold)" d="m32 17 11 13.500h-6.200L32 24.600 27.200 30.500H21z" />
      {Array.from({ length: pips }, (_, i) => (
        <rect key={i} fill="url(#tier-gold)" x={32 - (pips * 9 - 3) / 2 + i * 9} y="35.500" width="6" height="10" rx="2" transform="skewX(-12) translate(8.500 0)" />
      ))}
    </svg>
  );
}

export function Home({ onNavigate, avatar }: Props) {
  const tall = useIsTall();
  const root = useParallax<HTMLDivElement>();
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [flourish, setFlourish] = useState(0);
  const sr = useCountUp(player.sr, 1300, 700);

  const framing = useMemo(() => (tall ? TALL : WIDE), [tall]);
  const srPct = ((player.sr - player.srFloor) / (player.srCeil - player.srFloor)) * 100;
  const toNext = player.srCeil - player.sr;

  return (
    <div ref={root} className={`home${ready ? ' is-ready' : ''}`}>
      <Backdrop />

      <div className="hero">
        <Suspense fallback={null}>
          <HeroCanvas
            url={avatar.model}
            framing={framing}
            yaw={-0.14}
            className="hero-canvas"
            onProgress={setProgress}
            onReady={() => setReady(true)}
            flourishKey={flourish}
          />
        </Suspense>
        <i className="hero-flash" aria-hidden="true" />
      </div>
      <button
        type="button"
        className="hero-hit"
        aria-label={`${avatar.name}: play a move`}
        onClick={() => setFlourish((n) => n + 1)}
      />

      {!ready && (
        <div className="loader" role="status">
          <span className="loader-label display">Loading avatar</span>
          <span className="meter is-loader">
            <i style={{ '--fill': `${Math.round(progress * 100)}%` } as CSSProperties} />
          </span>
        </div>
      )}

      <LeftStack onNavigate={onNavigate} />

      {/* ── brand lockup ─────────────────────────────────────────── */}
      <div className="lockup enter-r" style={{ '--i': 0 } as CSSProperties}>
        <span className="lockup-tag">Pathway Builder</span>
        <h1 className="lockup-word display">Ascent</h1>
      </div>

      {/* ── standing ─────────────────────────────────────────────── */}
      <div className="rail">
        <button type="button" className="plate rank enter-r" style={{ '--i': 1 } as CSSProperties} aria-label={`${player.tier} ${player.division}, ${player.sr} skill rating. Open rankings`}>
          <TierEmblem pips={2} />
          <span className="plate-copy">
            <span className="rank-tier display">
              {player.tier} {player.division}
            </span>
            <span className="rank-sr">
              <b>{sr.toLocaleString('en-US')}</b> SR
            </span>
            <span className="meter is-slim">
              <i style={{ '--fill': `${srPct}%` } as CSSProperties} />
            </span>
            <span className="plate-note">
              {toNext} SR to {player.nextRank}
            </span>
          </span>
        </button>

        <div className="plate streak enter-r" style={{ '--i': 2 } as CSSProperties}>
          <span className="streak-flame">
            <Icon name="flame" />
          </span>
          <span className="plate-copy">
            <span className="plate-head display">{player.streakDays}-day streak</span>
            <span className="plate-note">
              SYN earn <b className="streak-x">×{player.streakMultiplier}</b>
            </span>
          </span>
        </div>

        <div className="plate rival enter-r" style={{ '--i': 3 } as CSSProperties}>
          <span className="plate-copy">
            <span className="plate-head display">
              {rival.online && <i className="rival-dot" aria-label="online" />}
              {rival.name}
            </span>
            <span className="plate-note">Rival. {rival.record}</span>
          </span>
          <button type="button" className="btn is-white is-small">
            <span className="btn-label">
              <Icon name="rematch" />
              Rematch
            </span>
          </button>
        </div>
      </div>

      {/* ── avatar tag ───────────────────────────────────────────── */}
      <div className="tag enter-up" style={{ '--i': 4 } as CSSProperties}>
        <span className="tag-name display">{avatar.name}</span>
        <span className="tag-sub">{avatar.track}</span>
        <button type="button" className="tag-change" onClick={() => onNavigate('avatars')}>
          <kbd>F</kbd> Change avatar
        </button>
      </div>

      {/* ── next stage ───────────────────────────────────────────── */}
      <section className="next" aria-label="Continue your pathway">
        <div className="next-chip enter-r" style={{ '--i': 4 } as CSSProperties}>
          <span className="next-arena">
            <Icon name="track" />
          </span>
          <span className="next-copy">
            <span className="next-path">
              {nextStage.pathway}
              <i>
                Stage {nextStage.index} of {nextStage.total}
              </i>
            </span>
            <span className="next-title display">{nextStage.title}</span>
            <span className="next-meta">
              {nextStage.kind} in {nextStage.arena}
              <b>
                <Icon name="syn" />+{nextStage.reward.syn}
              </b>
            </span>
          </span>
          <ol className="next-pips" aria-label={`Stage ${nextStage.index} of ${nextStage.total}`}>
            {Array.from({ length: nextStage.total }, (_, i) => (
              <li
                key={i}
                className={i + 1 < nextStage.index ? 'is-done' : i + 1 === nextStage.index ? 'is-now' : ''}
                style={{ '--p': i } as CSSProperties}
              />
            ))}
          </ol>
        </div>

        <div className="next-actions">
          <button type="button" className="btn is-white enter-r" style={{ '--i': 5 } as CSSProperties} onClick={() => onNavigate('arenas')}>
            <span className="btn-label">
              <Icon name="bolt" />
              Next battle
            </span>
          </button>
          <button type="button" className="btn is-go enter-r" style={{ '--i': 6 } as CSSProperties} onClick={() => onNavigate('pathways')}>
            <span className="btn-label">
              Continue
              <Icon name="go" />
            </span>
          </button>
        </div>
      </section>

      <p className="season-line enter-r" style={{ '--i': 0.6 } as CSSProperties}>
        Season {String(season.number).padStart(2, '0')}
        <b>{season.phase}</b>
        Week {season.week} of {season.weeks}
      </p>
    </div>
  );
}
