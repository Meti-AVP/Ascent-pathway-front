import type { CSSProperties } from 'react';

/*
  PATHWAYS background, back to front: graphite · a faint silver blueprint of the ASCENT citadel
  and its stairway (an elevation: nine flights climbing from the lower left to the keep, a rose
  window that is a gear, construction and dimension lines, a title block) · the dark leaning
  slabs · halftone · vignette and grain · a dense cluster of soft light streaks in the lower
  right, as in the reference. The blueprint is static (painted once); only the streaks move, small
  and on top of everything static, so nothing else is promoted around them. The blueprint's
  figures are hidden behind the detail and rewards screens.
*/

const FLIGHTS = 9;
const X0 = 640;
const Y0 = 1010;
const RUN = 96;
const RISE = 64;
const TOP_X = X0 + FLIGHTS * RUN;
const TOP_Y = Y0 - FLIGHTS * RISE;

function stairPath() {
  let d = `M${X0} ${Y0}`;
  for (let i = 1; i <= FLIGHTS; i++) d += `V${Y0 - i * RISE}H${X0 + i * RUN}`;
  return d;
}

/** gear teeth as one path */
function gear(cx: number, cy: number, r: number, teeth: number, depth: number) {
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = a0 + Math.PI / teeth;
    const p = (a: number, rr: number) => `${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
    d += `${i === 0 ? 'M' : 'L'}${p(a0, r)}L${p(a0 + 0.035, r + depth)}L${p(a1 - 0.035, r + depth)}L${p(a1, r)}`;
  }
  return d + 'Z';
}

/** the keep and its towers, standing on the top landing */
const KEEP = [
  `M1460 ${TOP_Y}V250h18v-14h16v14h18v-14h16v14h18V${TOP_Y}`,
  `M1556 ${TOP_Y}V150h22v-18h22v18h22v-18h22v18h22v-18h22v18h22V${TOP_Y}`,
  `M1640 132V92l20-46 20 46v40`,
  `M1660 46V18l26 9-26 9`,
  `M1808 ${TOP_Y}V276h16v-14h16v14h16v-14h16v14h12V${TOP_Y}`,
  `M1590 ${TOP_Y}v-62a24 24 0 0 1 48 0v62`,
  `M1682 ${TOP_Y}v-62a24 24 0 0 1 48 0v62`,
].join('');

/**
 * The streak cluster, in frame units: y is the streak's centre line (the cluster spans y 860–1010
 * and x 1460–1920 of the 1920 × 1080 frame), w its length, h its thickness, a its strength. The
 * heads sit on the right edge; the tails fade to the left. Tones: w white, s silver, h heat.
 */
const STREAKS = [
  { y: 866, w: 300, h: 3, a: 0.8, tone: 'w', dur: 3.1, d: -0.4 },
  { y: 874, w: 420, h: 8, a: 0.5, tone: 's', dur: 4.2, d: -2.3 },
  { y: 884, w: 220, h: 2, a: 1, tone: 'w', dur: 2.6, d: -1.1 },
  { y: 893, w: 460, h: 10, a: 0.42, tone: 'w', dur: 4.6, d: -3.4 },
  { y: 905, w: 340, h: 4, a: 0.95, tone: 'h', dur: 3.4, d: -0.9 },
  { y: 914, w: 180, h: 2, a: 1, tone: 'w', dur: 2.4, d: -1.8 },
  { y: 923, w: 380, h: 7, a: 0.6, tone: 's', dur: 3.9, d: -2.9 },
  { y: 934, w: 260, h: 3, a: 0.9, tone: 'w', dur: 2.9, d: -0.2 },
  { y: 945, w: 440, h: 9, a: 0.46, tone: 'w', dur: 4.4, d: -1.5 },
  { y: 956, w: 300, h: 2, a: 1, tone: 'h', dur: 2.7, d: -2.1 },
  { y: 966, w: 360, h: 5, a: 0.72, tone: 's', dur: 3.6, d: -0.6 },
  { y: 978, w: 230, h: 3, a: 0.92, tone: 'w', dur: 2.5, d: -1.3 },
  { y: 989, w: 400, h: 8, a: 0.55, tone: 'h', dur: 4.1, d: -3.0 },
  { y: 1001, w: 280, h: 2, a: 0.9, tone: 'w', dur: 3.0, d: -1.9 },
];

export function PathBackdrop() {
  return (
    <div className="pb" aria-hidden="true">
      <svg className="pb-print" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        {/* construction grid with registration crosses */}
        <g className="pb-grid">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={`v${i}`} d={`M${700 + i * 110} 76V1080`} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <path key={`h${i}`} d={`M600 ${140 + i * 110}H1920`} />
          ))}
        </g>
        <g className="pb-cross">
          {Array.from({ length: 20 }, (_, i) => {
            const x = 810 + (i % 5) * 220;
            const y = 250 + Math.floor(i / 5) * 220;
            return <path key={i} d={`M${x - 7} ${y}H${x + 7}M${x} ${y - 7}V${y + 7}`} />;
          })}
        </g>

        {/* the dial behind the keep: rings, ticks and a gear for a rose window */}
        <g className="pb-faint">
          <circle cx="1660" cy="250" r="300" strokeDasharray="3 9" />
          <circle cx="1660" cy="250" r="262" />
          <path d="M1300 250H1920M1660 -60V560" strokeDasharray="24 8 4 8" />
          <path d="M1660 250 1885 80" />
          <text x="1790" y="152" className="pb-label" transform="rotate(-37 1790 152)">
            R 262
          </text>
        </g>
        <g className="pb-line">
          <path d={gear(1660, 250, 104, 28, 13)} />
          <circle cx="1660" cy="250" r="90" />
          <circle cx="1660" cy="250" r="36" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2 + 0.2;
            return <path key={i} d={`M${1660 + Math.cos(a) * 36} ${250 + Math.sin(a) * 36}L${1660 + Math.cos(a) * 90} ${250 + Math.sin(a) * 90}`} />;
          })}
        </g>

        {/* the stairway: nine flights from the lower left to the keep, a rail above it */}
        <g className="pb-line">
          <path d={stairPath()} />
          <path d={`M${X0} ${Y0}H${TOP_X}`} />
          <path d={`M${X0 + 20} ${Y0 - 60}L${TOP_X + 20} ${TOP_Y - 60}`} />
          {Array.from({ length: FLIGHTS }, (_, i) => (
            <path key={i} d={`M${X0 + 20 + i * RUN} ${Y0 - 60 - i * RISE}V${Y0 - (i + 1) * RISE}`} />
          ))}
          <path d={KEEP} />
        </g>
        <g className="pb-labels">
          {Array.from({ length: FLIGHTS }, (_, i) => (
            <text key={i} x={X0 + i * RUN + 48} y={Y0 - (i + 1) * RISE + 22} className="pb-label">
              {String(i + 1).padStart(2, '0')}
            </text>
          ))}
        </g>
        {/* dimension lines with arrows and figures */}
        <g className="pb-faint">
          <path d={`M${X0} ${Y0 + 26}H${TOP_X}`} />
          <path d={`M${X0} ${Y0 + 16}v20M${TOP_X} ${Y0 + 16}v20`} />
          <path d={`M${X0 + 12} ${Y0 + 20}l-12 6 12 6M${TOP_X - 12} ${Y0 + 20}l12 6-12 6`} />
          <path d={`M1900 ${Y0}V${TOP_Y}`} />
          <path d={`M1890 ${Y0}h20M1890 ${TOP_Y}h20`} />
        </g>
        <g className="pb-labels">
          <text x={(X0 + TOP_X) / 2} y={Y0 + 20} className="pb-label" textAnchor="middle">
            9 flights · 864
          </text>
          <text x="1892" y="760" className="pb-label" transform="rotate(-90 1892 760)">
            Elev. +576
          </text>
        </g>
        {/* the draughtsman's heat marks */}
        <g className="pb-heat">
          <path d={`M${TOP_X - 20} ${TOP_Y}h40M${TOP_X} ${TOP_Y - 20}v40`} />
          <path d={`M${X0 - 26} ${Y0}h26`} />
          <circle cx="1660" cy="250" r="5" />
        </g>
      </svg>

      <div className="pb-slabs">
        <i className="pb-slab is-a">
          <i className="k k-facets is-b" />
          <i className="k k-hatch is-fade" />
        </i>
        <i className="pb-slab is-b">
          <i className="k k-halftone" />
        </i>
        <i className="pb-slab is-c" />
      </div>

      <div className="pb-dots" />
      <div className="pb-vignette" />
      <i className="k k-grain pb-grain" />

      {/* the moving layers last: nothing static sits above them */}
      <i className="pb-glow" />
      <div className="pb-streaks">
        {STREAKS.map((s, i) => (
          <i
            key={i}
            className={`pb-streak is-${s.tone}`}
            style={
              {
                '--y': s.y,
                '--w': s.w,
                '--h': s.h,
                '--a': s.a,
                animationDelay: `${s.d}s`,
                animationDuration: `${s.dur}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
