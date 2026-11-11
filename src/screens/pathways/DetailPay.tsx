import { useId } from 'react';

/*
  What one requirement pays, drawn for its card's thumbnail (the reference's item picture):
  a stack of SYN coins in HOME's coin look (the yellow hex with the black bolt — a product icon,
  not decoration) or a run of SR rank chevrons in silver. Drawn in a 100 × 100 field.
*/

const HEX = 'M12 1.6 21 6.8v10.4L12 22.4 3 17.2V6.8z';
const BOLT = 'M13.9 6.2 8.6 12.7h3.1l-1.5 5.1 5.3-6.6h-3.1z';

function Coin({ x, y, s, dim }: { x: number; y: number; s: number; dim?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* the coin's edge, then its face, a lit rim and the bolt */}
      <path d={HEX} transform="translate(0 2.2)" fill="#9c7a00" />
      <path d={HEX} transform="translate(0 1.1)" fill="#e6b400" />
      <path d={HEX} fill={dim ? '#f0c51a' : '#ffd21f'} />
      <path d="M12 1.6 21 6.8v4.2L12 6 3 11V6.8z" fill="#fff" opacity=".28" />
      <path d={BOLT} fill="#000" />
    </g>
  );
}

export function CoinStack() {
  const g = `dp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg className="pd-pay-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${g}-glow`}>
          <stop offset="0" stopColor="#ffd21f" stopOpacity=".42" />
          <stop offset="1" stopColor="#ffd21f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="46" fill={`url(#${g}-glow)`} />
      <Coin x={14} y={20} s={1.75} dim />
      <Coin x={44} y={16} s={1.75} dim />
      <Coin x={27} y={40} s={2} />
    </svg>
  );
}

export function SrChevrons() {
  const g = `dp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const one = (y: number) => `M16 ${y + 14}L50 ${y - 8}L84 ${y + 14}L84 ${y + 28}L50 ${y + 6}L16 ${y + 28}Z`;
  const rows = [22, 42, 62];
  return (
    <svg className="pd-pay-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${g}-sil`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".45" stopColor="#d9dde3" />
          <stop offset="1" stopColor="#8f96a1" />
        </linearGradient>
        <radialGradient id={`${g}-glow`}>
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${g}-glow)`} />
      {rows.map((y, i) => (
        <g key={y} opacity={1 - i * 0.16}>
          <path d={one(y)} transform="translate(2.5 3.5)" fill="#000" opacity=".6" />
          <path d={one(y)} fill={`url(#${g}-sil)`} />
          <path d={`M16 ${y + 14}L50 ${y - 8}L84 ${y + 14}`} fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        </g>
      ))}
    </svg>
  );
}
