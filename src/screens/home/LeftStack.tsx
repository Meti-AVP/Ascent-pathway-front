import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type CSSProperties } from 'react';
import { promos, quests, season, type Promo, type TabId } from '../../data/home';
import { Icon, type IconName } from '../../ui/Icon';
import './leftstack.css';

const SLIDE_MS = 6500;

const questIcon: Record<string, IconName> = { daily: 'daily', weekly: 'weekly', season: 'trophy' };

/** Leaning wipe between slides: the new slide is uncovered from the left along the house angle. */
const slide = {
  initial: { clipPath: 'polygon(-30% 0%, -30% 0%, -50% 100%, -50% 100%)', scale: 1.06 },
  animate: { clipPath: 'polygon(-30% 0%, 150% 0%, 130% 100%, -50% 100%)', scale: 1 },
  exit: { opacity: 0.4, scale: 0.98 },
};

const pad = (n: number) => String(n).padStart(2, '0');

/** The drawn art of each promotion: planes, print and a few marks behind the copy. */
function PromoArt({ promo, order }: { promo: Promo; order: number }) {
  const serial = `${promo.goto} · ${pad(order + 1)} / ${pad(promos.length)}`;
  if (promo.theme === 'avatar') {
    return (
      <div className="promo-art is-avatar">
        <i className="k k-halftone promo-print" />
        <i className="k k-ghost promo-ghost" data-k={pad(order + 1)} />
        <img src="/img/cast/clinician-bust.webp" alt="" draggable={false} />
        <i className="k k-grain" />
        <span className="k-serial promo-serial">{serial}</span>
      </div>
    );
  }
  if (promo.theme === 'cup') {
    return (
      <div className="promo-art is-cup">
        <i className="k k-facets is-hi promo-facets" />
        <i className="k k-rays promo-rays" />
        <Icon name="trophy" />
        <i className="k k-halftone promo-print" />
        <i className="k k-speed promo-speed" />
        <i className="k k-grain" />
        <span className="k-serial promo-serial">{serial}</span>
      </div>
    );
  }
  return (
    <div className="promo-art is-arena">
      <i className="k k-facets promo-facets" />
      <i className="promo-sweep" />
      <i className="promo-reticle" />
      <i className="k k-grain" />
      <span className="k-serial promo-serial">{serial}</span>
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
              <PromoArt promo={promo} order={index} />
              <span className="promo-copy">
                <span className="promo-kicker">{promo.kicker}</span>
                <span className="promo-title display">{promo.title}</span>
                <span className="promo-line">{promo.line}</span>
              </span>
              {promo.flag && <span className={`promo-flag${promo.flag === 'Live' ? ' is-live' : ''}`}>{promo.flag}</span>}
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
          <span className="card-skin" aria-hidden="true">
            <i className="k k-facets" />
            <i className="k k-hatch is-fade" />
            <i className="k k-ghost" data-k={`S${pad(season.number)}`} />
            <i className="k k-grain" />
            <i className="k k-bevel" />
          </span>
          <span className="season-level">
            <span className="season-lv" aria-hidden="true">
              Lv
            </span>
            <b>{season.passLevel}</b>
          </span>
          <span className="season-copy">
            <span className="season-title display">
              Season {pad(season.number)} {season.phase}
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
          <span className="card-skin" aria-hidden="true">
            <i className="k k-facets is-b" />
            <i className="k k-hatch is-fade" />
            <i className="k k-grain" />
            <i className="k k-bevel" />
          </span>
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
                    <circle className="quest-dash" cx="32" cy="32" r="21" pathLength={60} />
                    <circle
                      className="quest-fill"
                      cx="32"
                      cy="32"
                      r="28"
                      pathLength={100}
                      style={{ '--pct': pct * 100 } as CSSProperties}
                    />
                    <circle className="quest-cap" cx="60" cy="32" r="3" transform={`rotate(${pct * 360} 32 32)`} />
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
