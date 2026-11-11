import type { ReactNode, SVGProps } from 'react';
import { ARENAS, type ArenaId, type StageKind } from '../../data/pathways';

/*
  Drawn art for the stage panels, made with SVG only. Every piece is drawn in a 300 × 180 field
  and coloured through classes (.a-*) whose colours the panel's state sets in map.css: full colour
  when cleared, a faint ghost when locked, a heat hologram on the current stage. The principal
  shapes of each drawing sit in <g className="a-main"> groups: the map keeps copy clear of them
  (and its overlap check measures them). Lettering (chapter numbers, arena names, marks) is drawn
  only where `lettering` is on: the detail band keeps it, the map never shows it. Patterns and
  gradients come from the page's shared <defs> (ArtDefs, rendered once by Pathways.tsx).
*/

/** the arenas' emblems, 24 × 24 */
const ARENA_GLYPH: Record<ArenaId, ReactNode> = {
  slice: (
    <>
      <path d="M3.200 19.600C8.600 18.500 14.400 13.400 19.200 3.300l2.300 1.100C17.200 14.700 10.300 20.400 3.700 21.700z" />
      <path d="M14.600 16.400l5.300.4-4 3.500z" opacity=".7" />
      <path d="M2.300 13.200l4.400-.9-2.600 3.300z" opacity=".55" />
    </>
  ),
  'fast-track': (
    <>
      <path d="M2 19.500 7.800 4.500h3L9.500 9h3L11 14h3l-1.800 5.500z" />
      <path d="M14.500 19.500 16.300 14h-3l1.500-5h-3l1.300-4.500h3L22 19.500z" opacity=".55" />
    </>
  ),
  leverage: (
    <>
      <path d="M8.600 21.500h6.800L12 14.600z" />
      <path d="M1.600 13.300 21.300 7.600l.6 2.100L2.200 15.400z" />
      <path d="M16.200 2.400h5v5h-5z" opacity=".6" />
      <circle cx="4.300" cy="11.200" r="2.100" opacity=".6" />
    </>
  ),
  blackout: (
    <>
      <path fillRule="evenodd" d="M12 2.500a9.500 9.500 0 1 1 0 19 9.500 9.500 0 0 1 0-19zm2.200 2.800a7 7 0 0 1-6.900 11.600A7 7 0 1 0 14.200 5.300z" />
      <path d="M20 2l1.400 2.600L24 6l-2.600 1.400L20 10l-1.400-2.600L16 6l2.600-1.400z" opacity=".55" />
    </>
  ),
  'zero-day': (
    <>
      <path fillRule="evenodd" d="M12 3.200a8.800 8.800 0 1 1 0 17.600 8.800 8.800 0 0 1 0-17.600zm0 2.600a6.200 6.200 0 1 0 0 12.400 6.200 6.200 0 0 0 0-12.400z" />
      <path d="M10.900 0h2.200v6.300h-2.200zM10.900 17.700h2.200V24h-2.200zM0 10.900h6.300v2.200H0zM17.700 10.900H24v2.200h-6.300z" />
      <circle cx="12" cy="12" r="2.200" />
    </>
  ),
  'red-flag': (
    <>
      <path d="M4.600 1.800h2.300v20.700H4.600z" />
      <path d="M7.400 3.100c4.100-2.100 7.300 2.300 13.300-.2v9.600c-6 2.500-9.200-1.900-13.300.2z" />
      <path d="M11 6.200c2.300.6 4.300.8 6.800-.2v2.400c-2.500 1-4.500.8-6.800.2z" fill="rgb(var(--lo))" opacity=".25" />
    </>
  ),
};

export function ArenaGlyph({ arena, ...rest }: { arena: ArenaId } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...rest}>
      {ARENA_GLYPH[arena]}
    </svg>
  );
}

/** small glyphs of this page, 24 × 24, same drawing language as ui/Icon */
const GLYPHS = {
  lock: (
    <path
      fillRule="evenodd"
      d="M12 1.800a5.600 5.600 0 0 1 5.600 5.600v2.400h.9A2 2 0 0 1 20.500 11.800v8.700a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-8.700a2 2 0 0 1 2-2h.9V7.400A5.600 5.600 0 0 1 12 1.800zm0 2.700a2.900 2.900 0 0 0-2.900 2.900v2.400h5.800V7.400A2.900 2.900 0 0 0 12 4.500zm0 8.400a1.900 1.900 0 0 0-1.100 3.500v2.300h2.200v-2.300A1.900 1.900 0 0 0 12 12.900z"
    />
  ),
  check: <path d="M9.300 20.100 1.800 12.700l2.800-2.900 4.700 4.700L19.700 3.900l2.800 2.800z" />,
  clock: (
    <path
      fillRule="evenodd"
      d="M12 1.800a10.200 10.200 0 1 1 0 20.400 10.200 10.200 0 0 1 0-20.400zm0 2.600a7.600 7.600 0 1 0 0 15.200 7.600 7.600 0 0 0 0-15.200zm-1.200 2.300h2.400v4.800l3.400 2.300-1.300 2-4.500-3z"
    />
  ),
  info: (
    <path
      fillRule="evenodd"
      d="M12 1.800a10.200 10.200 0 1 1 0 20.400 10.200 10.200 0 0 1 0-20.400zm0 2.600a7.600 7.600 0 1 0 0 15.200 7.600 7.600 0 0 0 0-15.200zM10.700 6.800h2.600l-.4 7.200h-1.800zm1.300 8.700a1.500 1.500 0 1 1 0 3 1.500 1.500 0 0 1 0-3z"
    />
  ),
  search: (
    <path
      fillRule="evenodd"
      d="M10.300 2.300a8 8 0 0 1 6.500 12.700l5 5-1.900 1.900-5-5A8 8 0 1 1 10.300 2.300zm0 2.600a5.400 5.400 0 1 0 0 10.800 5.400 5.400 0 0 0 0-10.800z"
    />
  ),
  gem: (
    <>
      <path d="M12 2 21.500 9.500 12 22 2.500 9.500z" />
      <path d="M12 2 15.600 9.500 12 22 8.400 9.500z" fill="rgb(var(--lo))" opacity=".22" />
      <path d="M2.500 9.500h19L12 22z" fill="rgb(var(--hi))" opacity=".18" />
    </>
  ),
  duel: (
    <>
      <g transform="rotate(45 12 12)">
        <rect x="10.500" y="0.500" width="3" height="15.500" rx="1.400" />
        <rect x="7.200" y="15.200" width="9.600" height="2.600" rx="1.200" />
        <rect x="10.700" y="17.400" width="2.600" height="5.400" rx="1.200" />
      </g>
      <g transform="rotate(-45 12 12)">
        <rect x="10.500" y="0.500" width="3" height="15.500" rx="1.400" />
        <rect x="7.200" y="15.200" width="9.600" height="2.600" rx="1.200" />
        <rect x="10.700" y="17.400" width="2.600" height="5.400" rx="1.200" />
      </g>
    </>
  ),
  target: (
    <path
      fillRule="evenodd"
      d="M12 1.800a10.200 10.200 0 1 1 0 20.400 10.200 10.200 0 0 1 0-20.400zm0 2.700a7.500 7.500 0 1 0 0 15 7.500 7.500 0 0 0 0-15zm0 3.300a4.200 4.200 0 1 1 0 8.400 4.200 4.200 0 0 1 0-8.400zm0 2.500a1.700 1.700 0 1 0 0 3.400 1.700 1.700 0 0 0 0-3.400z"
    />
  ),
  retry: (
    <path d="M12 3.500c3 0 5.600 1.500 7.100 3.800L21 5.500V12h-6.500l2.500-2.500C16 7.900 14.100 7 12 7c-3.300 0-6 2.700-6 6H2.500c0-5.200 4.300-9.500 9.500-9.500zm9.500 9.500c0 5.200-4.300 9.500-9.500 9.500-3 0-5.600-1.500-7.100-3.800L3 20.500V14h6.500L7 16.500c1 1.600 2.900 2.500 5 2.500 3.300 0 6-2.700 6-6z" />
  ),
  book: (
    <path
      fillRule="evenodd"
      d="M3 4.500C5.800 3.300 8.800 3.300 11.200 4.800v15.700C8.800 19.100 5.800 19.100 3 20.200zm18 0v15.700c-2.800-1.100-5.800-1.100-8.200.3V4.800C15.200 3.300 18.200 3.300 21 4.500z"
    />
  ),
  list: (
    <path d="M3 3.500h4v4H3zM9.500 4.300H21v2.400H9.500zM3 10h4v4H3zM9.500 10.800H21v2.400H9.500zM3 16.500h4v4H3zM9.500 17.300H17v2.400H9.500z" />
  ),
  trophy: (
    <path
      fillRule="evenodd"
      d="M6.500 2h11v1.800H22v2.700c0 2.700-1.900 4.800-4.800 5.200-.8 1.700-2.200 2.900-3.900 3.400v2.400h3.200V20h-9v-2.500h3.200v-2.400c-1.700-.5-3.100-1.700-3.900-3.400C3.900 11.300 2 9.200 2 6.500V3.800h4.500zm11 3.800v3.300c1.300-.5 2-1.500 2-2.800v-.5zm-11 0h-2v.5c0 1.300.7 2.300 2 2.800z"
    />
  ),
  flag: (
    <>
      <path d="M4.600 1.800h2.300v20.700H4.600z" />
      <path d="M7.400 3.100c4.100-2.100 7.300 2.300 13.300-.2v9.600c-6 2.500-9.200-1.900-13.300.2z" />
    </>
  ),
  syn: (
    <>
      <path d="M12 1.600 21 6.800v10.400L12 22.400 3 17.200V6.800z" />
      <path d="M13.900 6.200 8.600 12.700h3.100l-1.500 5.100 5.300-6.600h-3.100z" fill="var(--on-go)" />
    </>
  ),
} as const;

export type GlyphName = keyof typeof GLYPHS;

export function Glyph({ name, ...rest }: { name: GlyphName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...rest}>
      {GLYPHS[name]}
    </svg>
  );
}

export const KIND_GLYPH: Record<StageKind, GlyphName> = {
  course: 'book',
  battle: 'duel',
  assessment: 'list',
  cup: 'trophy',
};

/* ── the four drawings ─────────────────────────────────────────── */

/** a book open in three-quarter view: page stack, curled pages set with lines, a ribbon, a page flying off */
function Book({ no, lettering }: { no: number; lettering: boolean }) {
  const left = Array.from({ length: 7 }, (_, i) => 62 + i * 10.5);
  return (
    <g className="art-book">
      <rect className="a-pattern" x="0" y="0" width="300" height="180" fill="url(#pw-grid)" />
      <path className="a-glow" d="M60 150C110 120 200 118 262 140 230 170 100 176 60 150Z" />
      <g className="a-main">
      {/* the page block, seen from the front: three edges of paper */}
      <path className="a-shade" d="M52 138C92 132 128 138 156 156 186 138 224 130 262 134L262 146C224 142 188 150 156 168 128 150 92 144 52 150Z" />
      <path className="a-line" d="M54 142C92 136 128 142 156 160 186 142 224 134 260 138M54 146C92 140 128 146 156 164 186 146 224 138 260 142" />
      {/* left page, lit */}
      <path className="a-lit" d="M156 58C126 42 88 38 56 46L52 138C88 130 126 136 156 156Z" />
      {/* right page, in shade */}
      <path className="a-fill" d="M156 58C186 40 226 34 258 40L262 134C226 128 188 136 156 156Z" />
      <path className="a-shade" opacity=".35" d="M156 58C170 50 186 44 204 40L206 132C188 134 170 142 156 156Z" />
      {/* the gutter */}
      <path className="a-ink-line" d="M156 58V156" />
      {/* set lines, curling into the gutter */}
      {left.map((y, i) => (
        <path key={i} className="a-text" d={`M66 ${y}C${94} ${y - 5} ${124} ${y - 1} ${146} ${y + 8}`} strokeDasharray={i === 3 ? '30 6 40 8' : undefined} />
      ))}
      <path className="a-hot" d="M168 62h40v9h-40z" transform="skewX(-8)" />
      {Array.from({ length: 5 }, (_, i) => (
        <path key={i} className="a-text" d={`M170 ${84 + i * 10}C${196} ${80 + i * 10} ${222} ${78 + i * 10} ${246} ${80 + i * 10}`} />
      ))}
      {/* a little chart on the right page */}
      <path className="a-go-line" d="M206 132l10-14 9 6 12-18 9 8" />
      {/* the ribbon */}
      <path className="a-hot" d="M222 37l10-2 2 66-7-6-6 7z" />
      </g>
      {/* the chapter number */}
      {lettering && (
        <text className="a-num" x="70" y="58">
          {String(no).padStart(2, '0')}
        </text>
      )}
      {/* a page flying off with its motion lines */}
      <g className="a-main" transform="rotate(-16 266 24)">
        <path className="a-lit" d="M244 10h42l-3 30h-42z" />
        <path className="a-text" d="M250 18h26M249 24h28M248 30h20" />
      </g>
      <path className="a-line" d="M206 22h26M214 30h18M198 14h18" />
    </g>
  );
}

/** the arena's emblem on a shield, crossing blades behind, rays, an arena floor and the arena's name */
function Arena({ arena, lettering }: { arena: ArenaId; lettering: boolean }) {
  const a = ARENAS[arena];
  return (
    <g className="art-arena">
      {/* the arena floor in perspective */}
      <g className="a-floor">
        {Array.from({ length: 9 }, (_, i) => (
          <path key={`v${i}`} className="a-line" d={`M${190 + (i - 4) * 14} 112L${190 + (i - 4) * 46} 182`} />
        ))}
        {[118, 128, 142, 160].map((y) => (
          <path key={y} className="a-line" d={`M${40} ${y}H300`} />
        ))}
      </g>
      {/* rays */}
      <g className="a-rays">
        {Array.from({ length: 14 }, (_, i) => {
          const t = (i / 14) * Math.PI * 2;
          return <path key={i} className="a-ray" d={`M${190 + Math.cos(t) * 52} ${88 + Math.sin(t) * 52}L${190 + Math.cos(t + 0.09) * 150} ${88 + Math.sin(t + 0.09) * 150}L${190 + Math.cos(t - 0.06) * 150} ${88 + Math.sin(t - 0.06) * 150}Z`} />;
        })}
      </g>
      {/* the arena's name, set big behind everything */}
      {lettering && (
        <text className="a-word" x="300" y="166" textAnchor="end">
          {a.name}
        </text>
      )}
      {/* two blades crossing behind the shield */}
      <g className="a-main a-blades">
        <path className="a-hot" d="M96 150 268 20l8 10L104 160z" />
        <path className="a-lit" d="M112 24l170 128-8 9L104 33z" opacity=".75" />
      </g>
      {/* the shield: a leaning hexagon, a lit plane, a rim and the glyph */}
      <g className="a-main a-shield" transform="translate(190 88) skewX(-12)">
        <path className="a-shade" d="M4 -54 50 -28 50 30 4 58 -44 30 -44 -28Z" transform="translate(6 7)" />
        <path className="a-fill" d="M0 -58 48 -30 48 30 0 58 -48 30 -48 -30Z" />
        <path className="a-lit" opacity=".5" d="M0 -58 48 -30 48 -4 -48 22 -48 -30Z" />
        <path className="a-ink-line" d="M0 -48 39 -25 39 25 0 48 -39 25 -39 -25Z" />
      </g>
      <g className="a-glyph" transform="translate(162 60) scale(2.35)">
        {ARENA_GLYPH[arena]}
      </g>
      {lettering && (
        <text className="a-tag" x="122" y="168">
          Arena {String(a.no).padStart(2, '0')}
        </text>
      )}
    </g>
  );
}

/** a clipboard with a checklist, a column chart and a gauge */
function Sheet({ lettering }: { lettering: boolean }) {
  return (
    <g className="art-sheet">
      <rect className="a-pattern" x="0" y="0" width="300" height="180" fill="url(#pw-grid)" />
      {/* the board */}
      <g className="a-main" transform="rotate(-6 150 96)">
        <path className="a-shade" d="M104 34h112l-4 146H100z" transform="translate(8 6)" />
        <path className="a-fill" d="M104 30h112l-4 146H100z" />
        <path className="a-lit" d="M112 42h96l-3 124h-96z" />
        <path className="a-ink" d="M136 22h48v18h-48z" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(0 ${i * 28})`}>
            <rect className={i < 2 ? 'a-good' : 'a-box'} x="120" y="54" width="16" height="16" rx="3" />
            {i < 2 && <path className="a-tick" d="M123 62l4 4 7-9" />}
            <path className="a-text" d="M144 58h52M144 66h34" />
          </g>
        ))}
      </g>
      {/* columns */}
      <g className="a-main a-bars">
        {[38, 58, 46, 74, 90].map((hgt, i) => (
          <rect key={i} className={i === 4 ? 'a-go' : 'a-fill'} x={226 + i * 13} y={150 - hgt} width="9" height={hgt} />
        ))}
        <path className="a-line" d="M222 151h70" />
      </g>
      {/* a gauge with its needle */}
      <g className="a-main" transform="translate(58 112)">
        <path className="a-track" d="M-38 0A38 38 0 0 1 38 0" />
        <path className="a-good-line" d="M-38 0A38 38 0 0 1 20 -32" />
        <path className="a-ink-line" d="M0 0 22 -26" />
        <circle className="a-ink" r="5" />
        {lettering && (
          <text className="a-tag" x="0" y="22" textAnchor="middle">
            80+
          </text>
        )}
      </g>
      {lettering && (
        <text className="a-num" x="22" y="40">
          Q·20
        </text>
      )}
    </g>
  );
}

/** a bracket that narrows to a trophy */
function Cup({ lettering }: { lettering: boolean }) {
  const rows = [26, 52, 78, 104, 130, 156];
  return (
    <g className="art-cup">
      <rect className="a-pattern" x="0" y="0" width="300" height="180" fill="url(#pw-grid)" />
      <g className="a-main a-bracket">
        {rows.map((y, i) => (
          <rect key={i} className={i === 1 ? 'a-hot' : 'a-fill'} x="22" y={y - 8} width="52" height="14" rx="3" />
        ))}
        {[0, 2, 4].map((i) => (
          <path key={i} className="a-ink-line" d={`M74 ${rows[i]!}H96V${rows[i + 1]!}H74M96 ${(rows[i]! + rows[i + 1]!) / 2}H118`} />
        ))}
        {[39, 91, 143].map((y, i) => (
          <rect key={i} className={i === 0 ? 'a-hot' : 'a-fill'} x="118" y={y - 7} width="40" height="13" rx="3" />
        ))}
        <path className="a-ink-line" d="M158 39H176V91H158M176 65H194M158 143H194" />
      </g>
      {/* the trophy on its rays */}
      <g className="a-rays">
        {Array.from({ length: 12 }, (_, i) => {
          const t = (i / 12) * Math.PI * 2;
          return <path key={i} className="a-ray" d={`M${236 + Math.cos(t) * 30} ${84 + Math.sin(t) * 30}L${236 + Math.cos(t + 0.12) * 110} ${84 + Math.sin(t + 0.12) * 110}L${236 + Math.cos(t - 0.06) * 110} ${84 + Math.sin(t - 0.06) * 110}Z`} />;
        })}
      </g>
      <g className="a-main a-trophy">
        <g transform="translate(200 40) scale(3)">
          <path className="a-shade" transform="translate(1.6 1.6)" d={TROPHY} />
          <path className="a-fill" d={TROPHY} />
          <path className="a-lit" opacity=".55" d="M6.500 2h5.500v11.300c-1.300-.2-2.500-.8-3.400-1.700C7.300 10.200 6.500 8 6.500 5.800z" />
        </g>
        <path className="a-hot" d="M206 128h62l-4 10h-62z" />
      </g>
      {lettering && (
        <text className="a-tag" x="236" y="156" textAnchor="middle">
          Top 4
        </text>
      )}
    </g>
  );
}

const TROPHY =
  'M6.500 2h11v1.800H22v2.700c0 2.700-1.900 4.800-4.800 5.200-.8 1.700-2.200 2.900-3.900 3.400v2.400h3.200V20h-9v-2.500h3.200v-2.400c-1.700-.5-3.100-1.700-3.900-3.400C3.900 11.300 2 9.200 2 6.500V3.800h4.500zm11 3.800v3.300c1.300-.5 2-1.500 2-2.800v-.5zm-11 0h-2v.5c0 1.300.7 2.300 2 2.800z';

/**
 * A stage's drawing in its 300 × 180 field. `lettering` draws the chapter number, the arena's
 * name and the marks; the map turns it off (no lettering inside map art), the detail band keeps it.
 */
export function KindArt({ kind, arena, no, lettering = true }: { kind: StageKind; arena?: ArenaId; no: number; lettering?: boolean }) {
  if (kind === 'battle' && arena) return <Arena arena={arena} lettering={lettering} />;
  if (kind === 'course') return <Book no={no} lettering={lettering} />;
  if (kind === 'cup') return <Cup lettering={lettering} />;
  return <Sheet lettering={lettering} />;
}

/**
 * The hologram deck under a drawing on the current stage (and the lit summit): a platform of
 * rings in perspective with its spokes, light rising from it and a bright arc on its rim. Drawn
 * in the 300 × 180 field, under the drawing, which the map raises and shrinks onto it.
 */
export function HoloDeck({ cx = 150, cy = 160, rx = 128 }: { cx?: number; cy?: number; rx?: number }) {
  const ry = rx * 0.14;
  const k = rx / 128;
  return (
    <g className="h-deck">
      <path className="h-beam" d={`M${cx - 80 * k} ${cy}L${cx - 46 * k} 0h${92 * k}L${cx + 80 * k} ${cy}z`} />
      <path className="h-beam is-b" d={`M${cx - 38 * k} ${cy}L${cx - 22 * k} 0h${44 * k}L${cx + 38 * k} ${cy}z`} />
      <g className="a-main h-platform">
        <ellipse className="h-disc" cx={cx} cy={cy} rx={rx} ry={ry} />
        <ellipse className="h-ring" cx={cx} cy={cy} rx={rx} ry={ry} />
        <ellipse className="h-ring is-b" cx={cx} cy={cy} rx={rx * 0.72} ry={ry * 0.7} />
        <ellipse className="h-ring is-c" cx={cx} cy={cy} rx={rx * 0.4} ry={ry * 0.4} />
        {Array.from({ length: 12 }, (_, i) => {
          const t = (i / 12) * Math.PI * 2;
          return <path key={i} className="h-spoke" d={`M${cx + Math.cos(t) * rx * 0.4} ${cy + Math.sin(t) * ry * 0.4}L${cx + Math.cos(t) * rx} ${cy + Math.sin(t) * ry}`} />;
        })}
        <path className="h-arc" d={`M${cx - rx * 0.95} ${cy + ry * 0.33}A${rx} ${ry} 0 0 0 ${cx + rx * 0.55} ${cy + ry * 0.85}`} />
      </g>
    </g>
  );
}

/** the shared patterns every drawing uses — rendered once by the page */
export function ArtDefs() {
  return (
    <svg className="pw-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="pw-dots" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3.500" cy="3.500" r="1.250" className="pd-dot" />
        </pattern>
        <pattern id="pw-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="skewX(-12)">
          <rect width="1.500" height="9" className="pd-hatch" />
        </pattern>
        <pattern id="pw-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" className="pd-grid" />
        </pattern>
        <pattern id="pw-scan" width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="1.300" className="pd-scan" />
        </pattern>
        <linearGradient id="pw-scrim" x1="0" x2="0" y1="0" y2="1">
          <stop offset=".34" className="pd-scrim0" />
          <stop offset="1" className="pd-scrim1" />
        </linearGradient>
        <linearGradient id="pw-light" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" className="pd-light0" />
          <stop offset=".55" className="pd-light1" />
        </linearGradient>
        <linearGradient id="pw-rim" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" className="pd-rim0" />
          <stop offset=".22" className="pd-rim1" />
          <stop offset=".8" className="pd-rim1" />
          <stop offset="1" className="pd-rim2" />
        </linearGradient>
        {/* the hologram on the current stage: its hot ground, glow, the copy's scrim, streaks, scan lines */}
        <linearGradient id="pw-holo-ground" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0" className="hd-ground0" />
          <stop offset=".55" className="hd-ground1" />
          <stop offset="1" className="hd-ground2" />
        </linearGradient>
        <radialGradient id="pw-holo-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" className="hd-glow0" />
          <stop offset="1" className="hd-glow1" />
        </radialGradient>
        <linearGradient id="pw-holo-scrim" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0" className="hd-scrim0" />
          <stop offset=".42" className="hd-scrim1" />
          <stop offset="1" className="hd-scrim2" />
        </linearGradient>
        <linearGradient id="pw-holo-streak" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" className="hd-streak0" />
          <stop offset=".5" className="hd-streak1" />
          <stop offset="1" className="hd-streak0" />
        </linearGradient>
        <pattern id="pw-scanlines" width="8" height="4" patternUnits="userSpaceOnUse">
          <rect width="8" height="1.500" className="hd-scan" />
        </pattern>
        {/* the hover wash's second frame (heat into mauve) and its scan-lined settle */}
        <linearGradient id="pw-wash-grad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" className="wd-grad0" />
          <stop offset="1" className="wd-grad1" />
        </linearGradient>
        <pattern id="pw-wash-scan" width="8" height="5" patternUnits="userSpaceOnUse">
          <rect width="8" height="2" className="wd-scan" />
        </pattern>
      </defs>
    </svg>
  );
}
