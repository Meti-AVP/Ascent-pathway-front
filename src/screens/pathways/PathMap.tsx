import type { CSSProperties } from 'react';
import { ARENAS, KIND_LABEL, type Pathway, type Stage, type StageKind } from '../../data/pathways';
import { HEAD, layoutFor, MAP_H, MAP_W, safeSpan, tileBox, type PanelGeo } from './layout';
import { Glyph, HoloDeck, KindArt } from './StageArt';
import './map.css';

const u = (n: number) => `calc(var(--u) * ${Math.round(n * 100) / 100})`;
const pad = (n: number) => String(n).padStart(2, '0');

type Props = {
  pathway: Pathway;
  /** the panel that is opening into the detail screen */
  launch: number | null;
  onOpen: (index: number) => void;
  onFocusPanel: (index: number) => void;
  setRef: (index: number, el: HTMLButtonElement | null) => void;
};

/* ── copy metrics ─────────────────────────────────────────────────────────────────────────────
   The display face is a condensed italic; these per-character widths (in em) are a little over
   the widest strings measured in it, so a box sized from them always holds the real line. */
const EM_TITLE = 0.47;
const EM_KIND = 0.6;
const estW = (text: string, size: number, em: number) => text.length * size * em + 4;

type Box = { x: number; y: number; w: number; h: number };

/** each drawing's principal shapes in its 300 × 180 field: the union of its a-main groups */
const MAIN: Record<StageKind, Box> = {
  battle: { x: 96, y: 20, w: 180, h: 141 },
  course: { x: 50, y: 8, w: 240, h: 162 },
  assessment: { x: 18, y: 16, w: 274, h: 166 },
  cup: { x: 20, y: 16, w: 252, h: 149 },
};

/** the hologram's deck, under each drawing's focal object (field units) */
const DECK: Record<StageKind, { cx: number; rx: number }> = {
  battle: { cx: 190, rx: 100 },
  course: { cx: 158, rx: 112 },
  assessment: { cx: 158, rx: 112 },
  cup: { cx: 236, rx: 58 },
};

/** the hologram's composition: the drawing standing on its deck, and the box that holds both */
function holoFrame(kind: StageKind) {
  const m = MAIN[kind];
  const d = DECK[kind];
  const cy = m.y + m.h + 6;
  const ry = d.rx * 0.14;
  const x0 = Math.min(m.x, d.cx - d.rx);
  const x1 = Math.max(m.x + m.w, d.cx + d.rx);
  return { deck: { cx: d.cx, cy, rx: d.rx }, region: { x: x0, y: m.y, w: x1 - x0, h: cy + ry - m.y } };
}

function kindLine(stage: Stage) {
  return stage.kind === 'battle' && stage.arena ? `${KIND_LABEL.battle} · ${ARENAS[stage.arena].name}` : KIND_LABEL[stage.kind];
}

/** the result a cleared stage carries in its strip: the best score, or the place in a cup */
function result(stage: Stage) {
  if (stage.score !== undefined) return `${stage.score}%`;
  return stage.place ?? '';
}

/**
 * Where a panel's copy and picture go. The copy sits at the bottom-left on clean ground; the
 * picture's principal shapes take whichever is bigger of the band above the copy and the column
 * beside it, so they never run under the copy.
 */
function compose(geo: PanelGeo, stage: Stage, holo: boolean) {
  const bodyTop = geo.head.y + HEAD;
  const kindSize = 14;
  const kind = holo ? kindLine(stage) : '';
  let titleSize = holo ? 26 : stage.state === 'locked' ? 17 : 19;
  const gapKT = 7;
  const padB = holo ? 20 : 15;
  const padL = holo ? 22 : 18;
  const blockH = (s: number) => (holo ? kindSize + gapKT : 0) + s;
  const kindW = kind ? estW(kind, kindSize, EM_KIND) : 0;
  const need = Math.max(estW(stage.title, titleSize, EM_TITLE), kindW) + padL + 14;
  // the copy sits in the bottom-left corner; where a notch makes that corner narrow, it sits on
  // the level bottom that runs under the full width instead
  const band = (bottom: number) => safeSpan(geo, bottom - blockH(titleSize) - 3, bottom + 3);
  let bottom = geo.bl[1] - padB;
  let span = band(bottom);
  if (!span || span[1] - span[0] < need) {
    bottom = Math.min(geo.floor, geo.bl[1]) - padB;
    span = band(bottom) ?? [geo.bl[0], geo.bl[0] + 240];
  }
  const left = span[0] + padL;
  const room = span[1] - 14 - left;
  let titleW = estW(stage.title, titleSize, EM_TITLE);
  if (titleW > room) {
    // one line, always: the type steps down rather than wrapping or being cut
    titleSize = Math.max(15, Math.floor((titleSize * room) / titleW));
    titleW = estW(stage.title, titleSize, EM_TITLE);
  }
  const copy: Box = { x: left, y: bottom - blockH(titleSize), w: Math.max(titleW, kindW), h: blockH(titleSize) };

  // the picture: its principal shapes (on the current stage, the drawing on its deck) are fitted
  // above the copy (a band) or beside it (a column), whichever holds them bigger
  const frame = holo ? holoFrame(stage.kind) : null;
  const region = frame ? frame.region : MAIN[stage.kind];
  const top = bodyTop + (holo ? 8 : 10);
  const fit = (b: Box | null) => (b && b.w > 40 && b.h > 40 ? Math.min(b.w / region.w, b.h / region.h) : 0);
  const bandBottom = copy.y - (holo ? 12 : 12);
  const sa = safeSpan(geo, top, bandBottom, 12);
  const A: Box | null = sa ? { x: sa[0], y: top, w: sa[1] - sa[0], h: bandBottom - top } : null;
  const colBottom = Math.min(geo.floor, geo.bl[1]) - (holo ? 10 : 12);
  const sb = safeSpan(geo, top, colBottom, 12);
  const colLeft = sb ? Math.max(sb[0], copy.x + copy.w + 22) : 0;
  const B: Box | null = sb ? { x: colLeft, y: top, w: sb[1] - colLeft, h: colBottom - top } : null;
  const useB = fit(B) >= fit(A);
  const box = (useB ? B : A) ?? { x: geo.w * 0.4, y: top, w: geo.w * 0.5, h: 80 };
  const s = Math.max(0.2, fit(box));
  // in the column the picture is centred; in the band it keeps to the right, clear of the tile
  const rx = useB ? box.x + (box.w - region.w * s) / 2 : box.x + box.w - region.w * s;
  const ry = box.y + (box.h - region.h * s) / 2;
  const art = { x: rx - region.x * s, y: ry - region.y * s, s, main: { x: rx, y: ry, w: region.w * s, h: region.h * s } };
  return { copy, titleSize, kindSize, gapKT, kind, art, box, deck: frame?.deck };
}

type PanelProps = {
  stage: Stage;
  index: number;
  geo: PanelGeo;
  pid: string;
  launching: boolean;
  onOpen: () => void;
  onFocus: () => void;
  btnRef: (el: HTMLButtonElement | null) => void;
};

/** a stack of flat silhouettes of the panel, one per colour frame (opacity-stepped in map.css) */
function Frames({ geo, kinds, className }: { geo: PanelGeo; kinds: string[]; className: string }) {
  return (
    <>
      {kinds.map((k) => (
        <svg key={k} className={`${className} is-${k}`} viewBox={`0 0 ${geo.w} ${geo.h}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={geo.d} />
        </svg>
      ))}
    </>
  );
}

function Panel({ stage, index, geo, pid, launching, onOpen, onFocus, btnRef }: PanelProps) {
  const id = `pw-${pid}-${index}`;
  const no = index + 1;
  const state = stage.state;
  const holo = geo.hero && state !== 'locked';
  const lit = geo.hero && state === 'done';
  const { copy, titleSize, kindSize, gapKT, kind, art, box, deck } = compose(geo, stage, holo);
  const tile = tileBox(geo);
  const bodyTop = geo.head.y + HEAD;
  const res = state === 'done' ? result(stage) : '';
  const artT = `translate(${art.x.toFixed(1)} ${art.y.toFixed(1)}) scale(${art.s.toFixed(3)})`;
  // the copy zone, kept clear of every drawn shape (the hologram's ground still runs under it)
  const cz = { x: copy.x - 10, y: copy.y - 10, w: copy.w + 22, h: copy.h + 18 };
  const label =
    state === 'locked'
      ? `Stage ${no}, ${stage.title}, locked. Requires: ${stage.gate}.`
      : state === 'done'
        ? `Stage ${no}, ${stage.title}, cleared${stage.score !== undefined ? ` with ${stage.score}%` : stage.place ? `, placed ${stage.place}` : ''}. Open details.`
        : `Stage ${no}, ${stage.title}, your current stage${stage.score !== undefined ? `, best ${stage.score}%` : ''}. Continue.`;

  return (
    <div
      className={`pw-panel v${index % 3} is-${state}${holo ? ' is-hero' : ''}${lit ? ' is-lit' : ''}${launching ? ' is-launch' : ''}`}
      style={{ left: u(geo.x), top: u(geo.y), width: u(geo.w), height: u(geo.h), '--i': index } as CSSProperties}
    >
      {/* the drop: heat under the current stage; under any panel while it has keyboard focus */}
      <svg className="pw-drop" viewBox={`0 0 ${geo.w} ${geo.h}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={geo.d} />
      </svg>

      {/* the landing: a counter-translated pair wipes the panel in from the left on the compositor */}
      <div className="pw-land">
        <div className="pw-land-in">
          <div className="pw-face">
            <button
              ref={btnRef}
              type="button"
              className="pw-hit"
              aria-label={label}
              aria-disabled={state === 'locked' || undefined}
              onClick={onOpen}
              onFocus={onFocus}
            >
              <svg className="pw-svg" viewBox={`0 0 ${geo.w} ${geo.h}`} preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <clipPath id={id}>
                    <path d={geo.d} />
                  </clipPath>
                  <clipPath id={`${id}-a`}>
                    {holo ? (
                      <path clipRule="evenodd" d={`M0 0H${geo.w}V${geo.h}H0ZM${cz.x} ${cz.y}h${cz.w}v${cz.h}h${-cz.w}Z`} />
                    ) : (
                      <rect x={box.x - 4} y={box.y - 4} width={box.w + 8} height={box.h + 8} />
                    )}
                  </clipPath>
                </defs>
                {/* the outline is the hit area: the panel answers the pointer only inside its shape */}
                <path className="pw-body" d={geo.d} />
                <g clipPath={`url(#${id})`}>
                  {holo ? (
                    <>
                      <ellipse className="pw-holo-glow" cx={art.main.x + art.main.w / 2} cy={art.main.y + art.main.h * 0.5} rx={art.main.w * 0.85} ry={art.main.h * 0.8} fill="url(#pw-holo-glow)" />
                      <g className="pw-holo-streaks">
                        {[0.16, 0.44, 0.68, 0.86].map((t, k) => {
                          const x0 = geo.w * t;
                          const wd = [64, 22, 96, 14][k]!;
                          return <path key={k} className={`is-${k}`} d={`M${x0} 0h${wd}l${-geo.h * 0.62} ${geo.h}h${-wd}z`} fill="url(#pw-holo-streak)" />;
                        })}
                      </g>
                      <g clipPath={`url(#${id}-a)`}>
                        <g className="pw-art pw-holo" transform={artT}>
                          {deck && <HoloDeck cx={deck.cx} cy={deck.cy} rx={deck.rx} />}
                          <KindArt kind={stage.kind} arena={stage.arena} no={no} lettering={false} />
                        </g>
                      </g>
                      <rect className="pw-holo-scan" width={geo.w} height={geo.h} fill="url(#pw-scanlines)" />
                      <rect className="pw-holo-scrim" width={geo.w} height={geo.h} fill="url(#pw-holo-scrim)" />
                    </>
                  ) : (
                    <>
                      <rect className="pw-light" width={geo.w} height={geo.h} fill="url(#pw-light)" />
                      <rect className="pw-hatch" width={geo.w} height={geo.h} fill="url(#pw-hatch)" />
                      <g clipPath={`url(#${id}-a)`}>
                        <g className="pw-art" transform={artT}>
                          <KindArt kind={stage.kind} arena={stage.arena} no={no} lettering={false} />
                        </g>
                      </g>
                    </>
                  )}
                  {geo.h > geo.floor + 60 && (
                    /* the leg of an L: a blueprint of the stair the climb is drawn on */
                    <g className="pw-leg">
                      <rect y={geo.floor + 8} width={geo.w} height={geo.h - geo.floor} fill="url(#pw-grid)" />
                      <path d={`M${geo.br[0] - 150} ${geo.h - 30}h30v-30h30v-30h30v-30h30`} />
                    </g>
                  )}
                  <rect className="pw-band" x="0" y={geo.head.y} width={geo.w} height={HEAD} />
                  <rect className="pw-band-lit" x="0" y={geo.head.y} width={geo.w} height="2" />
                  <rect className="pw-band-base" x="0" y={bodyTop - 1.5} width={geo.w} height="1.5" />
                  <path className="pw-rim" d={geo.d} />
                  <path className="pw-focus-rim" d={geo.d} />
                </g>
              </svg>

              {/* the strip: what stands between the learner and the stage, or what they made of it */}
              <span className="pw-head" style={{ left: u(tile.x + tile.w + 10), top: u(geo.head.y), width: u(geo.head.x + geo.head.w - 12 - (tile.x + tile.w + 10)), height: u(HEAD) }}>
                {state === 'locked' && <Glyph name="lock" className="pw-lock" />}
                {state === 'done' && <Glyph name="check" className="pw-check" />}
                <span className="pw-head-text">{state === 'locked' ? stage.gate : state === 'done' ? 'Cleared' : 'Continue'}</span>
                {state === 'current' && (
                  <span className="pw-chevs" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
                {state === 'current' && stage.score !== undefined && <b className="pw-head-end">{`Best ${stage.score}%`}</b>}
                {state === 'done' && res && <b className="pw-head-end">{res}</b>}
              </span>

              <span className="pw-copy" style={{ left: u(copy.x), top: u(copy.y), width: u(copy.w + 8) }}>
                {kind && (
                  <span className="pw-kind" style={{ fontSize: u(kindSize), marginBottom: u(gapKT) }}>
                    {kind}
                  </span>
                )}
                <span className="pw-stage display" style={{ fontSize: u(titleSize) }}>
                  {stage.title}
                </span>
              </span>
            </button>

            {/* the number tile: upright, flush with the strip, its state in the pip at the corner */}
            <span className="pw-num" style={{ left: u(tile.x), top: u(tile.y), width: u(tile.w), height: u(tile.h) }} aria-hidden="true">
              <b className="display">{no}</b>
            </span>


            {state === 'current' && (
              <span className="pw-fx" style={{ left: u(box.x), top: u(box.y), width: u(box.w), height: u(box.h) }} aria-hidden="true">
                <i className="pw-glitch">
                  <i />
                  <i />
                  <i />
                </i>
                {/* the one yellow cue on the map: press here */}
                <i className="pw-down" style={{ left: u(-40), top: u(Math.max(10, art.main.y - box.y + art.main.h * 0.18)) }}>
                  <i />
                  <i />
                </i>
              </span>
            )}

            {/* hovering (or focusing) an open stage: the reference's stepped hot wash */}
            {state !== 'locked' && <Frames geo={geo} kinds={['w1', 'w2', 'w3', 'w4']} className="pw-wash" />}
            {state !== 'locked' && (
              /* the reference's 2 × 2 marks: they arrive with the hot strip and blink while the panel is hovered or focused */
              <span className="pw-marks" style={{ left: u(tile.x + 2), top: u(tile.y + tile.h + 14) }} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* the arrival: flat colour silhouettes flicker in over the landing */}
      <Frames geo={geo} kinds={['f1', 'f2', 'f3', 'f4']} className="pw-flash" />
    </div>
  );
}

/** the stamp over a finished pathway's map */
function CompletePlate({ total, x, y }: { total: number; x: number; y: number }) {
  return (
    <div className="pw-complete" style={{ left: u(x), top: u(y) }} role="img" aria-label={`Pathway complete: all ${total} stages cleared`}>
      <span className="pw-complete-stamp">
        <span className="pw-complete-plate">
          <i className="pw-complete-band">
            <Glyph name="check" />
          </i>
          <i className="k k-hatch" />
          <i className="pw-complete-inner" />
          <span className="pw-complete-copy">
            <b className="pw-complete-top">Pathway</b>
            <b className="pw-complete-word display">Complete</b>
            <span className="pw-complete-sub">{`All ${total} stages cleared`}</span>
          </span>
        </span>
        <i className="pw-complete-flash" />
      </span>
    </div>
  );
}

/**
 * The map: the panels as one cut sheet, the elevation ruler beside it and, once every stage is
 * cleared, the PATHWAY COMPLETE stamp. The arrival plays every time it mounts (the page keys it
 * on the pathway and on each return from a detail screen).
 */
export function PathMap({ pathway, launch, onOpen, onFocusPanel, setRef }: Props) {
  const cur = pathway.stages.findIndex((s) => s.state === 'current');
  const geos = layoutFor(pathway.stages.length, cur);
  const total = pathway.stages.length;
  const complete = pathway.stages.every((s) => s.state === 'done');
  const tiers = [...new Set(geos.map((g) => g.tier))];
  // the stamp sits on the open ground of the sheet, under the line and left of the summit
  const summit = geos[total - 1];
  const plate = summit ? { x: Math.max(30, (summit.x - 470) / 2 + 20), y: 92 } : { x: 60, y: 92 };

  return (
    <div
      className={`pw-map${launch !== null ? ' is-launching' : ''}${complete ? ' is-complete' : ''}`}
      style={{ width: u(MAP_W), height: u(MAP_H), '--n': total } as CSSProperties}
    >
      <div className="pw-ruler" aria-hidden="true">
        {tiers.map((t) => {
          const g = geos.find((p) => p.tier === t)!;
          return (
            <span key={t} style={{ top: u(g.y) }}>
              <b>{`T${t}`}</b>
              <i>{`+${pad((t - 1) * 3)}`}</i>
            </span>
          );
        })}
      </div>

      {pathway.stages.map((stage, i) => {
        const geo = geos[i];
        if (!geo) return null;
        return (
          <Panel
            key={`${pathway.id}-${i}`}
            btnRef={(el) => setRef(i, el)}
            stage={stage}
            index={i}
            geo={geo}
            pid={pathway.id}
            launching={launch === i}
            onOpen={() => onOpen(i)}
            onFocus={() => onFocusPanel(i)}
          />
        );
      })}

      {complete && <CompletePlate total={total} x={plate.x} y={plate.y} />}
    </div>
  );
}
