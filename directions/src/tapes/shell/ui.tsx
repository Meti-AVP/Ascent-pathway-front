import type { CSSProperties, ReactNode } from 'react';
import { Check, CircleDot, GitBranch, Lock, Play, TriangleAlert } from 'lucide-react';
import type { Stage } from '../data';

export type StateKind = 'done' | 'current' | 'locked' | 'branch' | 'problem' | 'ready' | 'draft';

const ICON = { done: Check, ready: Check, current: Play, locked: Lock, branch: GitBranch, problem: TriangleAlert, draft: CircleDot };

/** One way to show a state everywhere: icon + word (+ detail). Colour only reinforces. */
export function StateTag({ kind, children, className }: { kind: StateKind; children: ReactNode; className?: string }) {
  const Icon = ICON[kind];
  return (
    <span className={`tp-state tp-state--${kind} ${className ?? ''}`}>
      <span className="tp-state__ico" aria-hidden>
        <Icon size={12} strokeWidth={kind === 'current' ? 0 : 2.8} fill={kind === 'current' ? 'currentColor' : 'none'} />
      </span>
      <span>{children}</span>
    </span>
  );
}

/** The learner-facing state of a stage, in words. */
export function stageState(s: Stage): { kind: StateKind; word: string } {
  if (s.status === 'done') return { kind: 'done', word: `Done · ${s.result ?? '100%'}` };
  if (s.status === 'current') return { kind: 'current', word: 'In progress' };
  if (s.type === 'branch') return { kind: 'branch', word: 'Only if needed' };
  return { kind: 'locked', word: 'Locked' };
}

/** Staggered entry: a short fade, never a blur, never longer than ~0.35s. */
export const rise = (i: number) => ({ '--i': i }) as CSSProperties;
