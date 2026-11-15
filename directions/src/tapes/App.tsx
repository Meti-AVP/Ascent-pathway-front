import { useEffect, useRef, useState } from 'react';
import { PAGE_NAME, parseHash, ROUTE_ORDER, useHash } from './store';
import { FxDefs } from './fx/Brush';
import { Grain } from './fx/Grain';
import { clunk } from './fx/sound';
import { Atmosphere, Glitch, NowPlaying, OsdBand, Toasts, TopBar, type GlitchDir } from './shell/Shell';
import { Home } from './pages/Home';
import { Journey } from './pages/Journey';
import { Studio } from './pages/Studio';
import { Builder } from './pages/Builder';
import { queue } from './data';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Where the camcorder counter starts on each page (decoration only). */
const OSD_BASE = { 'learner/home': 2 * 3600 + 11 * 60, 'learner/journey': 0, 'admin/dashboard': 0, 'admin/builder': 0 } as const;

export function App() {
  const hash = useHash();
  const route = parseHash(hash);
  const [shown, setShown] = useState(route);
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [dir, setDir] = useState<GlitchDir>('ff');
  const [stamp, setStamp] = useState(0);
  const [queueCount, setQueueCount] = useState(queue.length);
  const prev = useRef(route);

  useEffect(() => {
    const from = prev.current;
    prev.current = route;
    if (route.key === from.key || reduced()) {
      setShown(route);
      if (route.key !== from.key) window.scrollTo(0, 0);
      return;
    }
    const d: GlitchDir = from.role !== route.role ? (route.role === 'admin' ? 'rec' : 'play') : ROUTE_ORDER.indexOf(route.key) > ROUTE_ORDER.indexOf(from.key) ? 'ff' : 'rew';
    setDir(d);
    setStamp((s) => s + 1);
    setPhase('out');
    clunk(d === 'ff' || d === 'rew' ? d : 'play');
    // short on purpose: the page must be readable within half a second
    const t1 = window.setTimeout(() => {
      setShown(route);
      window.scrollTo(0, 0);
      setPhase('in');
    }, 150);
    const t2 = window.setTimeout(() => setPhase('idle'), 430);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  useEffect(() => {
    document.documentElement.dataset.mode = shown.mode;
    document.title = `${PAGE_NAME[shown.key]} · ${shown.role === 'admin' ? 'Admin' : 'Learner'} · ASCENT Tapes`;
  }, [shown]);

  return (
    <div className={`tp-app tp-app--${shown.mode}`}>
      <FxDefs />
      <Atmosphere mode={shown.mode} />
      <TopBar route={shown} queueCount={queueCount} />
      <div className={`tp-stage tp-stage--${phase}`} key={shown.key}>
        {shown.key === 'learner/home' && <Home />}
        {shown.key === 'learner/journey' && <Journey params={shown.params} />}
        {shown.key === 'admin/dashboard' && <Studio onQueue={setQueueCount} />}
        {shown.key === 'admin/builder' && <Builder />}
      </div>
      <OsdBand key={`osd-${shown.key}`} mode={shown.mode} base={OSD_BASE[shown.key]} />
      <Toasts />
      <NowPlaying />
      <Grain />
      <Glitch phase={phase} dir={dir} stamp={stamp} />
    </div>
  );
}
