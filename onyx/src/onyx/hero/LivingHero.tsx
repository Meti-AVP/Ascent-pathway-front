import { useEffect, useRef } from 'react';
import { CHARACTERS, CHARACTER_IDS } from './characters';
import { mountHero } from './stage';

/** Characters that have a living model; the page host only shows a live box for these. */
export const SUPPORTED: ReadonlyArray<'ahmed' | 'sara'> = CHARACTER_IDS.filter((id) => CHARACTERS[id] !== null);

/**
 * A real-time, softly alive character on a transparent canvas that fills its parent (the parent must be
 * positioned). Calls `onReady` once the first lit frame is on screen; a character without a model
 * renders nothing and never calls it. Honours prefers-reduced-motion with a still, lit pose.
 */
export function LivingHero(props: { character: 'ahmed' | 'sara'; className?: string; onReady?: () => void }) {
  const { character, className, onReady } = props;
  const host = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady);
  ready.current = onReady;
  const has = CHARACTERS[character] !== null;

  useEffect(() => {
    if (!has || !host.current) return;
    const hero = mountHero(host.current, { character, onReady: () => ready.current?.() });
    return () => hero.dispose();
  }, [character, has]);

  if (!has) return null;
  return (
    <div
      ref={host}
      className={className}
      aria-hidden
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
    />
  );
}
