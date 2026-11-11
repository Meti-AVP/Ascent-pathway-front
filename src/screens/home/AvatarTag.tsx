import type { CSSProperties } from 'react';
import { CAST, type Avatar } from '../../data/cast';
import type { TabId } from '../../data/home';
import './tag.css';

const pad = (n: number) => String(n).padStart(2, '0');

/** Lower-left of HOME: the avatar's name, its track and the key that opens the avatar screen. */
export function AvatarTag({ avatar, onNavigate }: { avatar: Avatar; onNavigate: (tab: TabId) => void }) {
  const order = Math.max(0, CAST.findIndex((a) => a.key === avatar.key));
  return (
    <div className="tag enter-up" style={{ '--i': 4 } as CSSProperties}>
      <span className="k-serial tag-serial" aria-hidden="true">
        Avatar {pad(order + 1)} / {pad(CAST.length)}
      </span>
      <span className="tag-name display">
        <i className="k k-brush tag-swipe" aria-hidden="true" />
        <span className="tag-name-text">{avatar.name}</span>
      </span>
      <span className="tag-sub">{avatar.track}</span>
      <button type="button" className="tag-change" onClick={() => onNavigate('avatars')}>
        <kbd>F</kbd> Change avatar
      </button>
    </div>
  );
}
