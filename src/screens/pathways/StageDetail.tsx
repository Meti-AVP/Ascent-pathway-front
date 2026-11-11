import { useId, type CSSProperties } from 'react';
import { ARENAS, KIND_LABEL, requirementPay, type Pathway, type Requirement, type Stage } from '../../data/pathways';
import { DetailArt } from './DetailArt';
import { CoinStack, SrChevrons } from './DetailPay';
import { CARD_BAND_D, CARD_BAND_LINE, CARD_D, CARD_H, CARD_NOTCH_D, CARD_SW, PIP_D } from './DetailShape';
import { Glyph, KIND_GLYPH, type GlyphName } from './StageArt';
import './detail-type.css';
import './detail.css';

const pad = (n: number) => String(n).padStart(2, '0');
/** "Score 80+ in stage 4" → "score 80+ in stage 4", for "Requires …" */
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const REQ_GLYPH: Record<Requirement['kind'], GlyphName> = {
  duel: 'duel',
  score: 'target',
  attempts: 'retry',
  lessons: 'book',
  quiz: 'list',
  cup: 'trophy',
  flags: 'flag',
};

type ReqState = 'met' | 'open' | 'locked';

function reqState(stage: Stage, r: Requirement): ReqState {
  if (stage.state === 'done') return 'met';
  if (stage.state === 'locked') return 'locked';
  return !r.limit && r.done >= r.goal ? 'met' : 'open';
}

/** a threshold ("Score 75+") reads as the score against the mark, not as a fraction */
const isThreshold = (r: Requirement) => !r.limit && r.text[1].trim().endsWith('+');

/** the card's count: "6/6", "92 · 70+", or for a ceiling what remains, "1 LEFT" */
function Count({ r, state }: { r: Requirement; state: ReqState }) {
  const lit = state !== 'locked' && (state === 'met' || r.done > 0);
  if (r.limit) {
    const left = Math.max(0, r.goal - r.done);
    return (
      <p className="pd-count" aria-label={`${left} of ${r.goal} left`}>
        <b className={state === 'met' ? 'is-lit' : undefined}>{left}</b>
        <small>Left</small>
      </p>
    );
  }
  if (isThreshold(r)) {
    return (
      <p className="pd-count" aria-label={`${r.done}, needs ${r.text[1].trim()}`}>
        <b className={lit ? 'is-lit' : undefined}>{r.done}</b>
        <span className="pd-count-sep">·</span>
        {r.text[1].trim()}
      </p>
    );
  }
  return (
    <p className="pd-count" aria-label={`${r.done} of ${r.goal}`}>
      <b className={lit ? 'is-lit' : undefined}>{r.done}</b>/{r.goal}
    </p>
  );
}

/** what meeting the requirement pays: a thumbnail on the band line, like the reference's item */
function Pay({ stage, k, r, met }: { stage: Stage; k: number; r: Requirement; met: boolean }) {
  const pay = requirementPay(stage, k);
  const amount = pay.syn ?? pay.sr;
  return (
    <span className={`pd-pay${met ? ' is-met' : ''}`} aria-label={amount ? `Pays ${amount} ${pay.syn ? 'SYN' : 'SR'}` : undefined}>
      <i className="pd-pay-tile" aria-hidden="true">
        <i className="k k-halftone" />
      </i>
      {pay.syn ? <CoinStack /> : pay.sr ? <SrChevrons /> : <Glyph name={REQ_GLYPH[r.kind]} className="pd-pay-art" />}
      {amount !== undefined && (
        <b className="pd-pay-amount" aria-hidden="true">
          +{amount}
        </b>
      )}
      {met && (
        <i className="pd-pay-check" aria-hidden="true">
          <Glyph name="check" />
        </i>
      )}
    </span>
  );
}

/** the card's outline, filled flat, for one frame of the arrival flicker */
function Flick({ tone }: { tone: 'own' | 'heat' | 'rose' | 'silver' }) {
  return (
    <i className={`pd-flick is-${tone}`} aria-hidden="true">
      <svg viewBox={`0 0 ${CARD_SW.toFixed(1)} ${CARD_H}`} preserveAspectRatio="none" focusable="false">
        <path d={CARD_D} />
      </svg>
    </i>
  );
}

/**
 * One requirement: a light leaning card with a dark comic plate behind it, the status notch,
 * the title with the requirement's glyph, the line with its number lit, the count and a green
 * meter, what it pays on the band line, and its action (GO, DONE, or a chip on a ceiling).
 */
function ReqCard({ stage, r, k, primary }: { stage: Stage; r: Requirement; k: number; primary: boolean }) {
  const state = reqState(stage, r);
  const met = state === 'met';
  const fill = met ? 100 : r.limit ? (Math.max(0, r.goal - r.done) / r.goal) * 100 : Math.min(100, (r.done / r.goal) * 100);
  const g = `pdc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <article className={`pd-card is-${state}${r.limit ? ' is-limit' : ''}`} style={{ '--k': k } as CSSProperties}>
      <svg className="pd-card-skin" viewBox={`0 0 ${CARD_SW.toFixed(1)} ${CARD_H}`} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${g}-face`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="pd-stop-face0" />
            <stop offset="1" className="pd-stop-face1" />
          </linearGradient>
          <pattern id={`${g}-hatch`} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="skewX(-12)">
            <rect width="1.5" height="9" className="pd-card-hatch" />
          </pattern>
          <clipPath id={`${g}-clip`}>
            <path d={CARD_D} />
          </clipPath>
        </defs>
        <path className="pd-card-drop" d={CARD_D} transform="translate(11 11)" />
        <path className="pd-card-face" d={CARD_D} fill={`url(#${g}-face)`} />
        <g clipPath={`url(#${g}-clip)`}>
          <path className="pd-card-plane" d={`M${CARD_SW * 0.62} 0H${CARD_SW}V${CARD_H}H${CARD_SW * 0.38}Z`} />
          <rect width={CARD_SW} height="150" fill={`url(#${g}-hatch)`} className="pd-card-print" />
        </g>
        <path className="pd-card-band" d={CARD_BAND_D} />
        <path className="pd-card-bandline" d={CARD_BAND_LINE} />
        <path className="pd-card-notch" d={CARD_NOTCH_D} />
      </svg>

      <span className="pd-card-dots" aria-hidden="true">
        <i />
        <i />
        <i />
        <b />
      </span>

      <h3 className="pd-row pd-card-title" style={{ '--y': 97 } as CSSProperties}>
        <span className="pd-card-glyph" aria-hidden="true">
          <Glyph name={REQ_GLYPH[r.kind]} />
        </span>
        Requirement {k + 1}
      </h3>
      <p className="pd-row pd-card-line" style={{ '--y': 222 } as CSSProperties}>
        <span>
          {r.text[0]}
          <b>{r.text[1]}</b>
          {r.text[2]}
        </span>
      </p>
      <div className="pd-row pd-card-count" style={{ '--y': 306 } as CSSProperties}>
        <Count r={r} state={state} />
      </div>
      <div className="pd-row pd-card-meter" style={{ '--y': 350 } as CSSProperties} aria-hidden="true">
        <span className={`meter is-slim${state === 'locked' ? ' is-off' : ''}`}>
          <i style={{ '--fill': `${fill}%` } as CSSProperties} />
        </span>
      </div>
      <div className="pd-row pd-card-pay" style={{ '--y': 447 } as CSSProperties}>
        <Pay stage={stage} k={k} r={r} met={met} />
      </div>
      <div className="pd-row pd-card-act" style={{ '--y': 575 } as CSSProperties}>
        {met ? (
          <span className="pd-act is-done">
            <span className="pd-act-clamps" aria-hidden="true" />
            <span className="pd-act-label">
              <Glyph name="check" />
              Done
            </span>
          </span>
        ) : r.limit ? (
          <span className="pd-cap">
            <Glyph name="retry" />
            Max {r.goal}
          </span>
        ) : (
          <button type="button" className={`pd-act pd-go${state === 'locked' ? ' is-off' : primary ? ' is-go' : ' is-alt'}`} disabled={state === 'locked'}>
            <span className="pd-act-fx" aria-hidden="true">
              <i className="k k-halftone" />
              <i className="k k-chevrons" />
            </span>
            <span className="pd-act-clamps" aria-hidden="true" />
            <span className="pd-act-label">Go</span>
            <i className="pd-act-focus" aria-hidden="true" />
          </button>
        )}
      </div>

      <Flick tone="own" />
      <Flick tone="heat" />
      <Flick tone="rose" />
      <Flick tone="silver" />
    </article>
  );
}

type Props = {
  pathway: Pathway;
  index: number;
  onPick: (index: number) => void;
};

/**
 * The stage detail: the panel has grown into its own screen. The stage's object large on a hot
 * band at the left, crossing its leaning edge; the title over three requirement cards; the
 * stage's reward, its brief and its numbers in the aside; the stages as pips along the foot; a
 * heat band down the right edge. A locked stage (reached from the rewards screen) shows what
 * it will ask for, with a strip saying what opens it.
 */
export function StageDetail({ pathway, index, onPick }: Props) {
  const stage = pathway.stages[index]!;
  const arena = stage.arena ? ARENAS[stage.arena] : null;
  const next = pathway.stages[index + 1];
  const locked = stage.state === 'locked';
  const done = stage.state === 'done';
  const primary = stage.requirements.findIndex((r) => !r.limit && reqState(stage, r) === 'open');
  const best = stage.kind === 'cup' ? stage.place ?? '—' : stage.score !== undefined ? `${stage.score}%` : '—';
  return (
    <div className={`pd is-${stage.state}`} data-kind={stage.kind} key={index}>
      <div className="pd-band" aria-hidden="true">
        <i className="pd-band-fill">
          <i className="k k-facets is-b" />
          <i className="k k-halftone" />
          <i className="k k-grain" />
        </i>
        <i className="pd-band-edge" />
        <i className="pd-band-scan" />
        <DetailArt className="pd-art" kind={stage.kind} arena={stage.arena} />
        <span className="pd-num">{index + 1}</span>
        <span className="pd-band-kind">
          <Glyph name={KIND_GLYPH[stage.kind]} />
          {arena ? `${arena.name} · Arena ${pad(arena.no)}` : KIND_LABEL[stage.kind]}
        </span>
      </div>

      {locked && (
        <p className="pd-locked" role="status">
          <span className="pd-locked-skin" aria-hidden="true">
            <i className="k k-hatch is-hazard" />
          </span>
          <Glyph name="lock" />
          <b>Locked</b>
          <span className="pd-locked-dot" aria-hidden="true">
            ·
          </span>
          Requires {lower(stage.gate)}
        </p>
      )}

      <h2 className="pd-title">{stage.title}</h2>

      <div className="pd-cards">
        {stage.requirements.map((r, k) => (
          <ReqCard key={k} stage={stage} r={r} k={k} primary={k === primary} />
        ))}
      </div>

      <aside className="pd-reward" aria-label="Stage reward">
        <span className="pd-reward-skin" aria-hidden="true">
          <i className="k k-facets" />
          <i className="k k-hatch is-fade" />
          <i className="k k-grain" />
        </span>
        <div className="pd-reward-body">
          <p className="pd-label">{done ? 'Earned' : 'Clear to earn'}</p>
          <p className="pd-reward-pay">
            <span className="pd-unit is-syn">
              <Glyph name="syn" />
              <b>+{stage.reward.syn}</b>
              <i>SYN</i>
            </span>
            {stage.reward.sr !== undefined && (
              <span className="pd-unit is-sr">
                <b>+{stage.reward.sr}</b>
                <i>SR</i>
              </span>
            )}
          </p>
          {stage.reward.item && (
            <p className="pd-reward-item">
              <Glyph name="gem" />
              <span>{stage.reward.item}</span>
            </p>
          )}
          <i className="pd-reward-rule" aria-hidden="true" />
          {next ? (
            <>
              <p className="pd-label">
                {next.state === 'locked' ? 'Opens' : 'Next'} · Stage {pad(index + 2)}
              </p>
              <p className="pd-reward-next">{next.title}</p>
              <p className="pd-reward-gate">
                <Glyph name={next.state === 'locked' ? 'lock' : 'check'} />
                <span>{next.state === 'locked' ? `Requires ${lower(next.gate)}` : next.state === 'done' ? 'Cleared' : 'Open now'}</span>
              </p>
            </>
          ) : (
            <>
              <p className="pd-label">Then</p>
              <p className="pd-reward-next">{pathway.finalReward.name}</p>
              <p className="pd-reward-gate">
                <Glyph name="gem" />
                <span>
                  {pathway.finalReward.rarity} {pathway.finalReward.kind.toLowerCase()}
                </span>
              </p>
            </>
          )}
          <i className="pd-reward-rule" aria-hidden="true" />
          <p className="pd-reward-brief">{stage.brief}</p>
          <dl className="pd-stats">
            <div>
              <dt>Skill</dt>
              <dd>{stage.skill}</dd>
            </div>
            <div>
              <dt>{stage.kind === 'cup' ? 'Placed' : 'Best'}</dt>
              <dd>{best}</dd>
            </div>
            <div>
              <dt>Attempts</dt>
              <dd>
                {stage.attempts.used} / {stage.attempts.max}
              </dd>
            </div>
          </dl>
        </div>
      </aside>

      <nav className="pd-pips" aria-label="Stages" style={{ '--n': pathway.stages.length } as CSSProperties}>
        {pathway.stages.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`pd-pip is-${s.state}${i === index ? ' is-here' : ''}`}
            style={{ '--p': i } as CSSProperties}
            aria-label={`Stage ${i + 1}, ${s.title}${s.state === 'locked' ? ', locked' : s.state === 'done' ? ', cleared' : ''}`}
            aria-current={i === index ? 'step' : undefined}
            onClick={() => onPick(i)}
          >
            <i className="pd-pip-glow" aria-hidden="true" />
            <svg className="pd-pip-hex" viewBox="0 0 84 74" aria-hidden="true" focusable="false">
              <path className="pd-pip-focus" d={PIP_D} transform="translate(6 7)" />
              <path className="pd-pip-base" d={PIP_D} transform="translate(0 4)" />
              <path className="pd-pip-face" d={PIP_D} />
              <path className="pd-pip-lit" d="M22 2.5H62" />
            </svg>
            <b>{i + 1}</b>
            {s.state === 'locked' && <Glyph name="lock" className="pd-pip-lock" />}
          </button>
        ))}
      </nav>

      <i className="pd-edge" aria-hidden="true" />
    </div>
  );
}
