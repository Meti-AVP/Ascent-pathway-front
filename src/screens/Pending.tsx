import type { TabId } from '../data/home';
import { Icon } from '../ui/Icon';
import './pending.css';

type PendingTab = Exclude<TabId, 'home' | 'avatars'>;

const LINES: Record<PendingTab, string> = {
  pathways: 'Your assigned journeys, stage by stage.',
  season: 'The 13-week season and its reward track.',
  quests: 'Daily, weekly and season quests.',
  store: 'Cosmetics for SYN and Q-Shards.',
  cups: 'Brackets, weekly cups and the finals.',
  arenas: 'All 36 arenas and the skill each one measures.',
};

/** Stand-in for a section that has not been built yet — the site is being made one section at a time. */
export function Pending({ tab, label, onHome }: { tab: PendingTab; label: string; onHome: () => void }) {
  return (
    <div className="pending">
      <div className="pending-skin" aria-hidden="true">
        <i className="k k-facets" />
        <i className="k k-halftone" />
        <i className="k k-grain" />
      </div>
      <div className="pending-slab" aria-hidden="true">
        <i className="k k-facets is-b" />
        <i className="k k-hatch is-fade" />
      </div>
      <div className="pending-body">
        <span className="k-serial" aria-hidden="true">
          Section · in the build
        </span>
        <h1 className="pending-title display">{label}</h1>
        <p className="pending-line">{LINES[tab]}</p>
        <p className="pending-note">This section is next in the build. Home is ready to review.</p>
        <button type="button" className="btn is-go pending-back" onClick={onHome}>
          <span className="btn-fx k-shine" aria-hidden="true">
            <i className="k k-halftone" />
            <i className="k k-grain" />
          </span>
          <span className="btn-label">
            <Icon name="left" />
            Back to home
          </span>
        </button>
      </div>
    </div>
  );
}
