import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Avatar } from '../../data/cast';
import type { TabId } from '../../data/home';
import type { Framing } from '../../stage/HeroStage';
import type { Theme } from '../../ui/useTheme';
import './home.css';
import { AvatarTag } from './AvatarTag';
import { Backdrop } from './Backdrop';
import { LeftStack } from './LeftStack';
import { NextStage } from './NextStage';
import { Rail } from './Rail';

type Props = { onNavigate: (tab: TabId) => void; avatar: Avatar; theme: Theme };

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

/**
 * Eased pointer position (-1..1) written as --px / --py onto each backdrop layer (.bg-layer,
 * .bg-city), the only elements that read them. Both properties are registered as non-inheriting
 * (backdrop.css), so a pointer frame restyles a dozen layers and not the drawing inside them —
 * set on .home and inherited, they restyled the whole screen every frame (≈30 fps under parallax).
 */
function useParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let layers: HTMLElement[] = [];
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      const px = x.toFixed(4);
      const py = y.toFixed(4);
      for (const layer of layers) {
        layer.style.setProperty('--px', px);
        layer.style.setProperty('--py', py);
      }
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.0006 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) {
        layers = Array.from(root.querySelectorAll<HTMLElement>('.bg-layer, .bg-city'));
        raf = requestAnimationFrame(tick);
      }
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, []);
  return ref;
}

export function Home({ onNavigate, avatar, theme }: Props) {
  const tall = useIsTall();
  const root = useParallax<HTMLDivElement>();
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [flourish, setFlourish] = useState(0);

  const framing = useMemo(() => (tall ? TALL : WIDE), [tall]);

  return (
    <div ref={root} className={`home${ready ? ' is-ready' : ''}`}>
      <Backdrop />

      <div className="hero">
        <Suspense fallback={null}>
          <HeroCanvas
            url={avatar.model}
            framing={framing}
            yaw={-0.14}
            theme={theme}
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

      <Rail />
      <AvatarTag avatar={avatar} onNavigate={onNavigate} />
      <NextStage onNavigate={onNavigate} />
    </div>
  );
}
