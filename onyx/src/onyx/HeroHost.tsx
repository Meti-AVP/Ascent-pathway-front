import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { cx } from './ui';

// The living character is built separately in src/onyx/hero/. It is picked up through a glob,
// so nothing breaks while that file does not exist yet, and it appears as soon as it does.
type Character = 'ahmed' | 'sara';
type LivingHeroProps = { character: Character; className?: string; onReady?: () => void };
type HeroModule = {
  LivingHero?: ComponentType<LivingHeroProps>;
  supports?: readonly string[];
  characters?: readonly string[];
  SUPPORTED?: readonly string[];
};
const modules = import.meta.glob<HeroModule>('./hero/LivingHero.tsx');

function supported(m: HeroModule, c: Character) {
  if (c === 'ahmed') return true;
  const list = m.supports ?? m.characters ?? m.SUPPORTED;
  return Array.isArray(list) && list.includes(c);
}

/**
 * A positioned box where the character stands. Shows `fallback` (a still image, or nothing)
 * until the living character reports it is ready, then cross-fades to it.
 */
export function HeroHost({ character, fallback, className }: { character: Character; fallback?: ReactNode; className?: string }) {
  const [Living, setLiving] = useState<ComponentType<LivingHeroProps> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = Object.values(modules)[0];
    if (!load) return;
    let alive = true;
    load()
      .then((m) => { if (alive && m.LivingHero && supported(m, character)) setLiving(() => m.LivingHero!); })
      .catch(() => { /* keep the still image */ });
    return () => { alive = false; };
  }, [character]);

  return (
    <div className={cx('hero-host', ready && 'is-live', className)} data-character={character}>
      {Living && <Living character={character} className="hero-host__live" onReady={() => setReady(true)} />}
      {fallback && <div className="hero-host__still" aria-hidden>{fallback}</div>}
    </div>
  );
}
