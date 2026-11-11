import type { CSSProperties } from 'react';
import { player, rival, season } from '../../data/home';
import { Icon } from '../../ui/Icon';
import { useCountUp } from '../../ui/useCountUp';
import './rail.css';

function TierEmblem({ pips }: { pips: number }) {
  return (
    <svg className="rank-emblem" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="tier-gold" x1="0" y1="0" x2="1" y2="1">
          <stop className="tier-s0" offset="0" />
          <stop className="tier-s1" offset="0.45" />
          <stop className="tier-s2" offset="1" />
        </linearGradient>
      </defs>
      <path fill="url(#tier-gold)" d="M32 3 56 14v20c0 13-9.500 21.500-24 27C17.500 55.500 8 47 8 34V14z" />
      <path className="tier-well" d="M32 10.500 49.500 18.500V34c0 9.500-6.500 15.800-17.500 20.200C21 49.800 14.500 43.500 14.500 34V18.500z" />
      {/* a lit facet across the upper left of the shield, like a cut gem */}
      <path className="tier-facet" d="M32 3 8 14v8l24-11.500z" />
      <path fill="url(#tier-gold)" d="m32 17 11 13.500h-6.200L32 24.600 27.200 30.500H21z" />
      {Array.from({ length: pips }, (_, i) => (
        <rect key={i} fill="url(#tier-gold)" x={32 - (pips * 9 - 3) / 2 + i * 9} y="35.500" width="6" height="10" rx="2" transform="skewX(-12) translate(8.500 0)" />
      ))}
    </svg>
  );
}

/** The drawn inside of a plate: it leans with the plate and carries planes, print and a ghost glyph. */
function PlateSkin({ ghost }: { ghost: string }) {
  return (
    <span className="plate-skin" aria-hidden="true">
      <i className="k k-facets is-b" />
      <i className="k k-hatch is-fade" />
      <i className="k k-ghost" data-k={ghost} />
      <i className="k k-grain" />
      <i className="k k-bevel" />
      <i className="k k-ticks" />
    </span>
  );
}

/** The right column of HOME: the brand lockup, the season line and the standing plates. */
export function Rail() {
  const sr = useCountUp(player.sr, 1300, 700);
  const srPct = ((player.sr - player.srFloor) / (player.srCeil - player.srFloor)) * 100;
  const toNext = player.srCeil - player.sr;

  return (
    <>
      {/* ── brand lockup ─────────────────────────────────────────── */}
      <div className="lockup enter-r" style={{ '--i': 0 } as CSSProperties}>
        <span className="lockup-tag">Pathway Builder</span>
        <h1 className="lockup-word display">Ascent</h1>
      </div>

      {/* ── standing ─────────────────────────────────────────────── */}
      <div className="rail">
        <button type="button" className="plate rank enter-r" style={{ '--i': 1 } as CSSProperties} aria-label={`${player.tier} ${player.division}, ${player.sr} skill rating. Open rankings`}>
          <PlateSkin ghost={player.division} />
          <span className="rank-mark">
            <i className="k k-rays" />
            <i className="rank-ring" />
            <TierEmblem pips={2} />
          </span>
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
          <PlateSkin ghost={String(player.streakDays)} />
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
          <PlateSkin ghost="VS" />
          <span className="plate-copy">
            <span className="plate-head display">
              {rival.online && <i className="rival-dot" aria-label="online" />}
              {rival.name}
            </span>
            <span className="plate-note">Rival. {rival.record}</span>
          </span>
          <button type="button" className="btn is-white is-small">
            <span className="btn-fx" aria-hidden="true">
              <i className="k k-hatch is-fade" />
            </span>
            <span className="btn-label">
              <Icon name="rematch" />
              Rematch
            </span>
          </button>
        </div>
      </div>

      <p
        className="season-line enter-r"
        style={{ '--i': 0.6, '--wk': season.week, '--wks': season.weeks } as CSSProperties}
      >
        Season {String(season.number).padStart(2, '0')}
        <b>{season.phase}</b>
        Week {season.week} of {season.weeks}
      </p>
    </>
  );
}
