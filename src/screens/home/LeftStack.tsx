import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type CSSProperties } from 'react';
import { promos, quests, season, type Promo, type TabId } from '../../data/home';
import { Icon, type IconName } from '../../ui/Icon';

const SLIDE_MS = 6500;

const questIcon: Record<string, IconName> = { daily: 'daily', weekly: 'weekly', season: 'trophy' };

/** Leaning wipe between slides: the new slide is uncovered from the left along the house angle. */
const slide = {
  initial: { clipPath: 'polygon(-30% 0%, -30% 0%, -50% 100%, -50% 100%)', scale: 1.06 },
  animate: { clipPath: 'polygon(-30% 0%, 150% 0%, 130% 100%, -50% 100%)', scale: 1 },
  exit: { opacity: 0.4, scale: 0.98 },
};

function PromoArt({ promo }: { promo: Promo }) {
  if (promo.theme === 'avatar') {
    return (
      <div className="promo-art is-avatar">
        <img src="/img/cast/clinician-bust.webp" alt="" draggable={false} />
      </div>
    );
  }
  if (promo.theme === 'cup') {
    return (
      <div className="promo-art is-cup">
        <Icon name="trophy" />
      </div>
    );
  }
  return (
    <div className="promo-art is-arena">
      <i className="promo-reticle" />
    </div>
  );
}

export function LeftStack({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [open, setOpen] = useState(true);
  const promo = promos[index]!;

  useEffect(() => {
    if (held || !open) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % promos.length), SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [index, held, open]);

  const xpPct = Math.round((season.xp / season.xpGoal) * 100);

  return (
    <aside className={`stack${open ? '' : ' is-closed'}`} aria-label="News, season and quests">
      <div className="stack-items" inert={!open}>
        {/* ── promo carousel ─────────────────────────────────────── */}
        <div
          className="promo enter-l"
          style={{ '--i': 0 } as CSSProperties}
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
        >
          <AnimatePresence initial={false}>
            <motion.button
              key={promo.id}
              type="button"
              className={`promo-slide is-${promo.theme}`}
              onClick={() => onNavigate(promo.goto)}
              variants={slide}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1] }}
            >
              <PromoArt promo={promo} />
              <span className="promo-copy">
                <span className="promo-kicker">{promo.kicker}</span>
                <span className="promo-title display">{promo.title}</span>
                <span className="promo-line">{promo.line}</span>
              </span>
              {promo.flag && <span className="promo-flag">{promo.flag}</span>}
            </motion.button>
          </AnimatePresence>

          <div className="promo-pips" role="tablist" aria-label="Promotions">
            {promos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={p.title}
                className={`promo-pip${i === index ? ' is-on' : ''}${held ? ' is-held' : ''}`}
                style={{ '--slide': `${SLIDE_MS}ms` } as CSSProperties}
                onClick={() => setIndex(i)}
              >
                <i />
              </button>
            ))}
          </div>
        </div>

        {/* ── season pass ────────────────────────────────────────── */}
        <button
          type="button"
          className="season enter-l"
          style={{ '--i': 1 } as CSSProperties}
          onClick={() => onNavigate('season')}
        >
          <span className="season-level">
            <b>{season.passLevel}</b>
          </span>
          <span className="season-copy">
            <span className="season-title display">
              Season {String(season.number).padStart(2, '0')} {season.phase}
            </span>
            <span className="season-sub">
              Week {season.week} of {season.weeks}
            </span>
            <span className="meter" aria-label={`${season.xp} of ${season.xpGoal} XP to the next pass level`}>
              <i style={{ '--fill': `${xpPct}%` } as CSSProperties} />
            </span>
            <span className="season-xp">
              {season.xp} / {season.xpGoal} XP
            </span>
          </span>
          {season.unclaimed > 0 && (
            <span className="season-claim" aria-label={`${season.unclaimed} rewards ready to claim`}>
              {season.unclaimed}
            </span>
          )}
        </button>

        {/* ── quests ─────────────────────────────────────────────── */}
        <div className="quests enter-l" style={{ '--i': 2 } as CSSProperties}>
          {quests.map((q, i) => {
            const pct = q.done / q.total;
            return (
              <button
                key={q.id}
                type="button"
                className="quest"
                style={{ '--q': i } as CSSProperties}
                onClick={() => onNavigate('quests')}
                aria-label={`${q.label} quests, ${q.done} of ${q.total} done`}
              >
                <span className="quest-ring">
                  <svg viewBox="0 0 64 64" aria-hidden="true">
                    <circle className="quest-track" cx="32" cy="32" r="28" />
                    <circle
                      className="quest-fill"
                      cx="32"
                      cy="32"
                      r="28"
                      pathLength={100}
                      style={{ '--pct': pct * 100 } as CSSProperties}
                    />
                  </svg>
                  <Icon name={questIcon[q.id] ?? 'daily'} />
                </span>
                <span className="quest-count">
                  <b>{q.done}</b>/{q.total}
                </span>
                <span className="quest-label">{q.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="stack-toggle enter-l"
        style={{ '--i': 3 } as CSSProperties}
        aria-expanded={open}
        aria-label={open ? 'Hide the side panel' : 'Show the side panel'}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="left" />
      </button>
    </aside>
  );
}
