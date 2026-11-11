import { useCallback, useEffect, useRef, useState } from 'react';
import { avatarByKey } from './data/cast';
import { TABS, type TabId } from './data/home';
import { CastReview } from './screens/avatars/CastReview';
import { Home } from './screens/home/Home';
import { Pending } from './screens/Pending';
import { BottomBar, type KeyHint } from './shell/BottomBar';
import { TopNav } from './shell/TopNav';
import { Wipe, WIPE_COVER_MS, WIPE_TOTAL_MS } from './shell/Wipe';
import { useTheme } from './ui/useTheme';

function tabFromHash(): TabId {
  const id = location.hash.replace(/^#\/?/, '');
  return TABS.some((t) => t.id === id) ? (id as TabId) : 'home';
}

const AVATAR_KEY = 'ascent.avatar';

function storedAvatar(): string {
  try {
    return avatarByKey(localStorage.getItem(AVATAR_KEY)).key;
  } catch {
    return avatarByKey(null).key;
  }
}

export function App() {
  const [tab, setTab] = useState<TabId>(tabFromHash);
  const [avatarKey, setAvatarKey] = useState(storedAvatar);
  const avatar = avatarByKey(avatarKey);
  const [theme, setTheme] = useTheme();
  const [wipe, setWipe] = useState(0);
  const busy = useRef(false);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  /** Run something behind the wipe: cover the screen, change it, uncover. */
  const behindWipe = useCallback((change: () => void) => {
    if (busy.current) return;
    busy.current = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setWipe((n) => n + 1);
    window.setTimeout(change, reduced ? 0 : WIPE_COVER_MS);
    window.setTimeout(() => {
      busy.current = false;
      setWipe(0);
    }, reduced ? 0 : WIPE_TOTAL_MS);
  }, []);

  const navigate = useCallback(
    (next: TabId) => {
      if (next === tabRef.current) return;
      behindWipe(() => {
        setTab(next);
        history.replaceState(null, '', next === 'home' ? location.pathname : `#/${next}`);
      });
    },
    [behindWipe],
  );

  const toggleTheme = () => behindWipe(() => setTheme(theme === 'dark' ? 'light' : 'dark'));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === 'Escape') navigate('home');
      else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) navigate('avatars');
    };
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
    };
  }, [navigate]);

  const hints: KeyHint[] =
    tab === 'home'
      ? [{ keys: 'F', label: 'Avatar', onPress: () => navigate('avatars') }]
      : [{ keys: 'Esc', label: 'Back', onPress: () => navigate('home') }];

  const label = TABS.find((t) => t.id === tab)?.label ?? '';

  /** Pick an avatar on the review board and go and see it on the home screen. */
  const pickAvatar = (key: string) => {
    setAvatarKey(key);
    try {
      localStorage.setItem(AVATAR_KEY, key);
    } catch {
      /* private mode: the choice simply lasts for this visit */
    }
    navigate('home');
  };

  return (
    <>
      <TopNav active={tab} onNavigate={navigate} face={avatar.face} theme={theme} onToggleTheme={toggleTheme} />
      <main className="screen" key={tab}>
        {tab === 'home' ? (
          <Home onNavigate={navigate} avatar={avatar} theme={theme} />
        ) : tab === 'avatars' ? (
          <CastReview current={avatar.key} onUse={pickAvatar} />
        ) : (
          <Pending tab={tab} label={label} onHome={() => navigate('home')} />
        )}
      </main>
      <BottomBar hints={hints} />
      {wipe > 0 && <Wipe key={wipe} />}
    </>
  );
}
