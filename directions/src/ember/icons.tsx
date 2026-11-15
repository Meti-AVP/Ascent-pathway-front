// Ember icon set: the brand mark and the custom glyphs the concept uses.
import type { SVGProps } from 'react';
import { BookOpen, ClipboardCheck, Gift, Split, Swords, Trophy } from 'lucide-react';
import type { StageType } from './data';

type P = SVGProps<SVGSVGElement> & { size?: number };

/** Shared gradients, mounted once. */
export function EmberDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <linearGradient id="em-silver" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9b6b4" />
        </linearGradient>
        <linearGradient id="em-fire" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd0a8" />
          <stop offset=".45" stopColor="#f59048" />
          <stop offset="1" stopColor="#d8561d" />
        </linearGradient>
        <linearGradient id="em-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd9a0" />
          <stop offset="1" stopColor="#e07a2e" />
        </linearGradient>
        <linearGradient id="em-home" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd2b0" />
          <stop offset="1" stopColor="#f07a3a" />
        </linearGradient>
        <linearGradient id="em-logo-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb27a" />
          <stop offset="1" stopColor="#e2672b" />
        </linearGradient>
        <linearGradient id="em-logo-r" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9813f" />
          <stop offset="1" stopColor="#9c3f16" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** The ASCENT "A": a peak with an inner chevron. */
export function LogoMark({ size = 53, ...p }: P) {
  return (
    <svg width={size} height={46} viewBox="0 0 62 48" preserveAspectRatio="none" fill="none" {...p}>
      <path d="M1 47.5 L28.6 1.2 Q30.2 -0.6 31.8 1.2 L33.4 3.9 L9.4 47.5 Z" fill="url(#em-logo-l)" />
      <path d="M33.4 3.9 L61 47.5 L55.4 47.5 L30.6 8.8 Z" fill="url(#em-logo-r)" />
      <path d="M8.6 46.6 L30.4 9.7" stroke="#ffe4cc" strokeOpacity=".55" strokeWidth="1.1" />
      <path d="M21 47.5 L31.6 31.2 L42.3 47.5 L37.4 47.5 L31.6 38.6 L25.9 47.5 Z" fill="url(#em-logo-r)" opacity=".9" />
    </svg>
  );
}

export function HomeFill({ size = 21 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <path d="M10 1.6 L19 9.2 Q19.6 9.8 18.9 10.4 L17.4 10.4 L17.4 17.6 Q17.4 18.6 16.4 18.6 L12.3 18.6 L12.3 13.1 L7.7 13.1 L7.7 18.6 L3.6 18.6 Q2.6 18.6 2.6 17.6 L2.6 10.4 L1.1 10.4 Q.4 9.8 1 9.2 Z" fill="url(#em-home)" />
    </svg>
  );
}

export function NodesIcon({ size = 20 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="4.2" cy="4.2" r="2.4" />
      <circle cx="15.8" cy="4.2" r="2.4" />
      <circle cx="4.2" cy="15.8" r="2.4" />
      <circle cx="15.8" cy="15.8" r="2.4" />
      <path d="M6 6 L14 14 M14 6 L6 14" />
    </svg>
  );
}

export function StudioIcon({ size = 20 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="3" width="15" height="14.5" rx="2.2" />
      <path d="M2.5 6.6 H17.5" />
      <path d="M6 13.6 L8.6 10.8 L10.6 12.6 L14 8.8" />
    </svg>
  );
}

export function UsersFill({ size = 20 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <circle cx="7.4" cy="6.2" r="3.4" />
      <path d="M1 16.6 Q1 11.2 7.4 11.2 Q13.8 11.2 13.8 16.6 Q13.8 17.6 12.8 17.6 L2 17.6 Q1 17.6 1 16.6 Z" />
      <circle cx="14.2" cy="6.9" r="2.7" opacity=".9" />
      <path d="M14.6 11.3 Q19.2 11.6 19.2 15.8 Q19.2 16.6 18.4 16.6 L15.3 16.6 Q15.4 13.4 13.3 11.6 Q13.9 11.3 14.6 11.3 Z" opacity=".9" />
    </svg>
  );
}

export function ImpactIcon({ size = 22 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <g fill="#ef6f2e">
        <rect x="2" y="13.5" width="3" height="6.5" rx=".8" />
        <rect x="7" y="11" width="3" height="9" rx=".8" />
        <rect x="12" y="12.5" width="3" height="7.5" rx=".8" />
        <rect x="17" y="9" width="3" height="11" rx=".8" />
      </g>
      <path d="M2.2 10.2 L7.4 5.6 L11.4 8.6 L19.4 2.4" stroke="#ef6f2e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.6 2.1 L19.7 2.1 L19.7 6.1" stroke="#ef6f2e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GridIcon({ size = 22, filled = true }: P & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" stroke="#ef6f2e" strokeWidth="1.7">
      <rect x="2" y="2" width="7.6" height="7.6" rx="1.8" />
      <rect x="12.4" y="2" width="7.6" height="7.6" rx="1.8" />
      <rect x="2" y="12.4" width="7.6" height="7.6" rx="1.8" />
      <rect x="12.4" y="12.4" width="7.6" height="7.6" rx="1.8" fill={filled ? '#ef6f2e' : 'none'} />
    </svg>
  );
}

export function TemplatesIcon({ size = 20 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.2" y="2.2" width="6.4" height="6.4" rx="1.4" />
      <rect x="11.4" y="2.2" width="6.4" height="6.4" rx="1.4" />
      <rect x="2.2" y="11.4" width="6.4" height="6.4" rx="1.4" />
      <path d="M14.6 11.6 V17.6 M11.6 14.6 H17.6" strokeLinecap="round" />
    </svg>
  );
}

export function BookFill({ size = 20 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M1.5 4 Q5.5 2.6 9.4 4.6 L9.4 17 Q5.6 15.2 1.5 16.4 Z" fill="currentColor" opacity=".9" />
      <path d="M18.5 4 Q14.5 2.6 10.6 4.6 L10.6 17 Q14.4 15.2 18.5 16.4 Z" fill="currentColor" opacity=".9" />
      <path d="M3.6 7.2 Q5.6 6.6 7.4 7.4 M3.6 10 Q5.6 9.4 7.4 10.2 M12.6 7.4 Q14.4 6.6 16.4 7.2 M12.6 10.2 Q14.4 9.4 16.4 10" stroke="#151313" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

/** Stage-type glyph, shared by chips, lists and the builder. */
export function StageGlyph({ type, size = 30, tone = 'silver' }: { type: StageType; size?: number; tone?: 'silver' | 'fire' | 'gold' | 'dim' }) {
  const color = tone === 'fire' ? 'url(#em-fire)' : tone === 'gold' ? 'url(#em-gold)' : tone === 'dim' ? '#8d8a88' : 'url(#em-silver)';
  const sw = size > 26 ? 1.9 : 1.8;
  switch (type) {
    case 'learn':
      return <BookOpen size={size} color={color} strokeWidth={sw} />;
    case 'assess':
      return <ClipboardCheck size={size} color={color} strokeWidth={sw} />;
    case 'compete':
      return <Swords size={size} color={color} strokeWidth={sw} />;
    case 'prove':
      return <Trophy size={size} color={color} strokeWidth={sw} />;
    case 'branch':
      return <Split size={size} color={color} strokeWidth={sw} />;
    case 'reward':
      return <Gift size={size} color={color} strokeWidth={sw} />;
  }
}
