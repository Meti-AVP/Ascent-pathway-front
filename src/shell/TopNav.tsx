import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import { TABS, player, type TabId } from '../data/home';
import { Icon, Mark } from '../ui/Icon';
import { useCountUp } from '../ui/useCountUp';
import './topnav.css';

type Props = {
  active: TabId;
  onNavigate: (tab: TabId) => void;
  face: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
};

export function TopNav({ active, onNavigate, face, theme, onToggleTheme }: Props) {
  const syn = useCountUp(player.syn, 1100, 500);
  const shards = useCountUp(player.shards, 900, 620);

  return (
    <header className="nav">
      <nav className="nav-tabs" aria-label="Main">
        {TABS.map((tab, i) => {
          const isActive = tab.id === active;
          const cls = ['nav-tab', tab.id === 'home' && 'is-home', tab.id === 'pathways' && 'is-primary', isActive && 'is-active']
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={tab.id}
              type="button"
              className={cls}
              style={{ '--i': i } as CSSProperties}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate(tab.id)}
            >
              {tab.id === 'home' && <Mark className="nav-mark" />}
              <span className="nav-label">{tab.label}</span>
              {tab.alert && <i className="nav-flag" aria-label="new" />}
              {isActive && (
                <motion.span
                  layoutId="nav-underline"
                  className="nav-underline"
                  transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                >
                  <i />
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="nav-right">
        <div className="nav-coin" title="SYN — earned in battles, spent in the store">
          <Icon name="syn" className="nav-coin-ico is-syn" />
          <span>{syn.toLocaleString('en-US')}</span>
        </div>
        <div className="nav-coin" title="Q-Shards — rare, minted for cups and seasons">
          <Icon name="shard" className="nav-coin-ico is-shard" />
          <span>{shards}</span>
        </div>
        <span className="nav-gap" />
        <button
          type="button"
          className="nav-ico nav-theme"
          aria-label={theme === 'dark' ? 'Switch to the white theme' : 'Switch to the black theme'}
          aria-pressed={theme === 'light'}
          onClick={onToggleTheme}
        >
          <Icon name="theme" />
        </button>
        <button type="button" className="nav-ico" aria-label="Settings">
          <Icon name="gear" />
        </button>
        <button type="button" className="nav-ico" aria-label="Mail, 2 unread">
          <Icon name="mail" />
          <i className="nav-flag" />
        </button>
        <button type="button" className="nav-ico" aria-label="Squad">
          <Icon name="squad" />
        </button>
        <button type="button" className="nav-me" aria-label={`${player.handle}, level ${player.level}. Open career`}>
          <img src={face} alt="" draggable={false} />
          <span className="nav-me-level">{player.level}</span>
        </button>
      </div>
    </header>
  );
}
