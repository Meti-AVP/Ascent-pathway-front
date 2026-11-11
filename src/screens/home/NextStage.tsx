import type { CSSProperties } from 'react';
import { nextStage, type TabId } from '../../data/home';
import { Icon } from '../../ui/Icon';
import './next.css';

/** Lower-right of HOME: where the learner is on their pathway, and the two ways to go on. */
export function NextStage({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  return (
    <section className="next" aria-label="Continue your pathway">
      <div className="next-chip enter-r" style={{ '--i': 4 } as CSSProperties}>
        <span className="plate-skin" aria-hidden="true">
          <i className="k k-facets" />
          <i className="k k-hatch is-fade" />
          <i className="k k-ghost" data-k={String(nextStage.index).padStart(2, '0')} />
          <i className="k k-grain" />
          <i className="k k-bevel" />
          <i className="k k-ticks" />
        </span>
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
          <span className="btn-fx" aria-hidden="true">
            <i className="k k-hatch is-fade" />
            <i className="k k-halftone" />
          </span>
          <span className="btn-label">
            <Icon name="bolt" />
            Next battle
          </span>
        </button>
        <button type="button" className="btn is-go enter-r" style={{ '--i': 6 } as CSSProperties} onClick={() => onNavigate('pathways')}>
          <span className="btn-fx k-shine" aria-hidden="true">
            <i className="k k-halftone" />
            <i className="k k-chevrons" />
            <i className="k k-grain" />
          </span>
          <span className="btn-label">
            Continue
            <Icon name="go" />
          </span>
        </button>
      </div>
    </section>
  );
}
