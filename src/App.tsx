import { useCallback, useEffect, useRef, useState } from 'react';
import { avatarByKey } from './data/cast';
import { TABS, type TabId } from './data/home';
import { CastReview } from './screens/avatars/CastReview';
import { Home } from './screens/home/Home';
import { Pathways } from './screens/pathways/Pathways';
import { Pending } from './screens/Pending';
import { BottomBar, type KeyHint } from './shell/BottomBar';
import { PageHintsContext, pressEscape } from './shell/pageHints';
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
  /** hints a screen asked the bottom bar to show instead of App's own (see shell/pageHints) */
  const [pageHints, setPageHints] = useState<KeyHint[] | null>(null);
  const busy = useRef(false);
  /** every wipe gets a new number, so a wipe that starts as another ends still mounts afresh */
  const wipes = useRef(0);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  /** Run something behind the wipe: cover the screen, change it, uncover. */
  const behindWipe = useCallback((change: () => void) => {
    if (busy.current) return;
    busy.current = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setWipe(++wipes.current);
    window.setTimeout(change, reduced ? 0 : WIPE_COVER_MS);
    window.setTimeout(() => {
      busy.current = false;
      setWipe(0);
    }, reduced ? 0 : WIPE_TOTAL_MS);
  }, []);

  /**
   * The address is the truth: show the screen it names, behind the wipe. A tab press, Back,
   * Forward and an edited hash all come through here; the screen is read at the moment of cover.
   */
  const followAddress = useCallback(() => {
    if (tabFromHash() !== tabRef.current) behindWipe(() => setTab(tabFromHash()));
  }, [behindWipe]);

  const navigate = useCallback(
    (next: TabId) => {
      if (next === tabRef.current || busy.current) return;
      // a history entry per screen, so Back and Forward step through them; HOME keeps a clean address
      history.pushState(null, '', next === 'home' ? location.pathname + location.search : `#/${next}`);
      followAddress();
    },
    [followAddress],
  );

  // Back or Forward pressed while a wipe was already running: catch up once it has gone.
  useEffect(() => {
    if (wipe === 0) followAddress();
  }, [wipe, followAddress]);

  /**
   * Flip the theme behind the wipe. The nav and the bar stay in view above the wipe, so their new
   * colours are worked out on the spot with their transitions held (html[data-swap], wipe.css):
   * nothing eases across from the old theme or is left showing a stale colour.
   */
  const toggleTheme = () =>
    behindWipe(() => {
      const root = document.documentElement;
      root.dataset.swap = '';
      setTheme(theme === 'dark' ? 'light' : 'dark');
      void getComputedStyle(root).color; // style the new theme now, while the transitions are held
      delete root.dataset.swap;
    });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.key === 'Escape') navigate('home');
      else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) navigate('avatars');
    };
    window.addEventListener('keydown', onKey);
    // a traversal fires popstate and, when the hash differs, hashchange too: following twice is harmless
    window.addEventListener('popstate', followAddress);
    window.addEventListener('hashchange', followAddress);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', followAddress);
      window.removeEventListener('hashchange', followAddress);
    };
  }, [navigate, followAddress]);

  const hints: KeyHint[] =
    tab === 'home'
      ? [{ keys: 'F', label: 'Avatar', onPress: () => navigate('avatars') }]
      : // the hint does what the key does, so a screen that handles Esc itself still wins
        [{ keys: 'Esc', label: 'Back', onPress: pressEscape }];

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
      <PageHintsContext.Provider value={setPageHints}>
        <main className="screen" key={tab}>
          {tab === 'home' ? (
            <Home onNavigate={navigate} avatar={avatar} theme={theme} />
          ) : tab === 'avatars' ? (
            <CastReview current={avatar.key} onUse={pickAvatar} />
          ) : tab === 'pathways' ? (
            <Pathways avatar={avatar} />
          ) : (
            <Pending tab={tab} label={label} onHome={() => navigate('home')} />
          )}
        </main>
      </PageHintsContext.Provider>
      <BottomBar hints={pageHints ?? hints} />
      {wipe > 0 && <Wipe key={wipe} />}
    </>
  );
}
