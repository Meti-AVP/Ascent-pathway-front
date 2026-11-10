import { squad } from '../data/home';
import { Icon } from '../ui/Icon';
import './bottombar.css';

export type KeyHint = { keys: string; label: string; onPress?: () => void };

export function BottomBar({ hints }: { hints: KeyHint[] }) {
  return (
    <footer className="bar">
      <div className="bar-left">
        <Icon name="chat" className="bar-chat" />
        <span>
          Press <kbd>Enter</kbd> to message your squad
        </span>
        <span className="bar-online">
          <i aria-hidden="true" />
          {squad.online} online
        </span>
      </div>
      <div className="bar-right">
        {hints.map((hint) => (
          <button key={hint.keys} type="button" className="bar-hint" onClick={hint.onPress}>
            <kbd>{hint.keys}</kbd>
            {hint.label}
          </button>
        ))}
      </div>
    </footer>
  );
}
