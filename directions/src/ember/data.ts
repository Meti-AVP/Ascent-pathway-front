// Shared mock data for the Ember direction (see docs/FLOW.md).

export type StageType = 'learn' | 'assess' | 'compete' | 'prove' | 'branch' | 'reward';
export type StageState = 'done' | 'current' | 'locked' | 'open';

export const TYPE_LABEL: Record<StageType, string> = {
  learn: 'Learn',
  assess: 'Assess',
  compete: 'Compete',
  prove: 'Prove',
  branch: 'Branch',
  reward: 'Reward',
};

export const ORG = 'Northwind Pharma';

export const ADMIN = { name: 'Sara Mansour', role: 'Org Admin', initials: 'SM' };

export const LEARNER = {
  name: 'Ahmed Hassan',
  first: 'Ahmed',
  role: 'Field Sales',
  squad: 'Field Ops North',
  squadRank: 3,
  squadSize: 14,
  sr: 1612,
  tier: 'Gold II',
  toNext: 88,
  nextTier: 'Gold I',
  level: 24,
  xp: 620,
  xpNext: 1000,
  syn: 2480,
  shards: 36,
  streak: 6,
  multiplier: 1.5,
};

export interface ReviewItem {
  id: string;
  title: string;
  kind: string;
  author: string;
  age: string;
}

export const REVIEW_QUEUE: ReviewItem[] = [
  // (the Product Leadership Journey is still a draft in the builder, so it is not in this queue)
  { id: 'r1', title: 'Leadership Essentials — journey v2', kind: 'Journey', author: 'Rania Saleh', age: '42m' },
  { id: 'r2', title: 'Objection Handling — duel set', kind: 'Battle content', author: 'Layla Karim', age: '2h' },
  { id: 'r3', title: 'Pricing & Value — assessment v2', kind: 'Assessment', author: 'Omar Haddad', age: '5h' },
  { id: 'r4', title: 'Q4 Sales Cup — advancement rule', kind: 'Tournament', author: 'Yousef Nabil', age: '1d' },
  { id: 'r5', title: 'Negotiation Lab — Leverage arena', kind: 'Battle content', author: 'Layla Karim', age: '1d' },
  { id: 'r6', title: 'Reading the Buyer — lesson 3', kind: 'Course', author: 'Hana Fouad', age: '2d' },
  { id: 'r7', title: 'Mastery Badge — certificate', kind: 'Reward Drop', author: 'Tarek Aziz', age: '3d' },
];

/* ---------- Learner journey: Sales Mastery, 9 stages ---------- */

export interface JourneyStage {
  n: number;
  name: string;
  type: StageType;
  product: string;
  gate: string;
  state: StageState;
  result?: string;
  reward: string;
}

export const SALES_MASTERY: JourneyStage[] = [
  { n: 1, name: 'Know Your Product', type: 'learn', product: 'Course · 6 lessons', gate: 'Complete every lesson', state: 'done', result: '100%', reward: '+80 XP' },
  { n: 2, name: 'Reading the Buyer', type: 'learn', product: 'Live Session · 45 min', gate: 'Attend or watch the replay', state: 'done', result: 'Attended', reward: '+80 XP' },
  { n: 3, name: 'Discovery Check', type: 'assess', product: 'Assessment · 12 items', gate: 'Score 80% or higher', state: 'done', result: '86%', reward: '+120 XP · 40 SYN' },
  { n: 4, name: 'Objection Handling', type: 'compete', product: 'Fast Track arena', gate: 'Win 1 duel, 2 attempts max', state: 'current', reward: '+150 XP · 60 SYN' },
  { n: 5, name: 'Pricing & Value', type: 'assess', product: 'Assessment · 10 items', gate: 'Score 80% or higher', state: 'locked', reward: '+120 XP · 40 SYN' },
  { n: 6, name: 'Negotiation Lab', type: 'compete', product: 'Leverage arena', gate: 'Win 2 of 3 duels', state: 'locked', reward: '+150 XP · 60 SYN' },
  { n: 7, name: 'Recovery Path', type: 'branch', product: 'Remedial course + coach', gate: 'Only if a score falls below 70%', state: 'locked', reward: 'Back on the path' },
  { n: 8, name: 'Q4 Sales Cup', type: 'prove', product: 'Tournament · 32 players', gate: 'Finish in the top 4', state: 'locked', reward: 'Cup medal · 250 SYN' },
  { n: 9, name: 'Mastery Badge', type: 'reward', product: 'Reward Drop', gate: 'Clear every stage', state: 'locked', reward: 'Epic badge · certificate · 500 SYN' },
];

/* ---------- Admin builder: Product Leadership Journey ---------- */

export type Difficulty = 'Fixed' | 'Adaptive';

export interface BuilderStage {
  id: string;
  type: StageType;
  name: string;
  product: string;
  productKind: string;
  timeLimit: string;
  attempts: number;
  difficulty: Difficulty;
  items: number | null;
  requireCompletion: boolean;
  gate: string[];
}

export const LEADERSHIP_JOURNEY: BuilderStage[] = [
  { id: 's1', type: 'learn', name: 'Product Strategy 101', product: 'Product Strategy 101', productKind: 'Course', timeLimit: '7 days', attempts: 1, difficulty: 'Fixed', items: null, requireCompletion: true, gate: ['Completion = 100%'] },
  { id: 's2', type: 'assess', name: 'Knowledge Check', product: 'Strategy Knowledge Check', productKind: 'Assessment', timeLimit: '20 min', attempts: 2, difficulty: 'Adaptive', items: 12, requireCompletion: true, gate: ['Score ≥ 80%', 'Attempts ≤ 2'] },
  { id: 's3', type: 'compete', name: 'Strategy Arena', product: 'Strategy Arena', productKind: 'Battle Arena', timeLimit: '3 days', attempts: 3, difficulty: 'Adaptive', items: null, requireCompletion: true, gate: ['Duel wins ≥ 1'] },
  { id: 's4', type: 'prove', name: 'Final Challenge', product: 'Leadership Final', productKind: 'Final assessment', timeLimit: '45 min', attempts: 2, difficulty: 'Fixed', items: 20, requireCompletion: true, gate: ['Score ≥ 85%'] },
  { id: 's5', type: 'branch', name: 'Remedial Path', product: 'Strategy Refresher', productKind: 'Course', timeLimit: '5 days', attempts: 3, difficulty: 'Fixed', items: null, requireCompletion: true, gate: ['Score < 70%', 'Loops ≤ 3'] },
  { id: 's6', type: 'reward', name: 'Leadership Certificate', product: 'Leadership Certificate', productKind: 'Reward Drop', timeLimit: '—', attempts: 1, difficulty: 'Fixed', items: null, requireCompletion: false, gate: ['All stages cleared'] },
];

export const CLAUSE_LIBRARY = [
  'Score ≥ 80%',
  'Completion = 100%',
  'Duel wins ≥ 1',
  'Rank ≤ Gold I',
  'Placement ≤ 4',
  'Attempts ≤ 2',
  'Streak ≥ 3 days',
  "Role = 'Field Sales'",
];

export const QUESTS = [
  // each title names the target its counter counts toward (2/6 = 2 of 6 duels won)
  { scope: 'Daily', title: 'Win 6 duels in any arena', done: 2, total: 6, reward: '40 SYN', resets: 'Resets in 7h' },
  { scope: 'Weekly', title: 'Play 8 ranked duels', done: 3, total: 8, reward: '150 SYN', resets: '3 days left' },
  { scope: 'Season', title: 'Earn 12 badges', done: 5, total: 12, reward: 'Q-Shards ×10', resets: '41 days left' },
];

export const SQUAD = [
  { rank: 1, name: 'Mona Saad', sr: 1744 },
  { rank: 2, name: 'Omar Haddad', sr: 1650 },
  { rank: 3, name: 'Ahmed Hassan', sr: 1612, me: true },
  { rank: 4, name: 'Nour Adel', sr: 1588 },
];

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Uncommon';

export const ACHIEVEMENTS: { name: string; rarity: Rarity; when: string; icon: 'flame' | 'swords' | 'target' | 'book' | 'crown' }[] = [
  { name: 'Six-Day Fire', rarity: 'Rare', when: 'Today', icon: 'flame' },
  { name: 'Clean Sweep', rarity: 'Epic', when: 'Yesterday', icon: 'swords' },
  { name: 'Sharp Discovery', rarity: 'Uncommon', when: '3 days ago', icon: 'target' },
  { name: 'First Lesson', rarity: 'Common', when: 'Oct 28', icon: 'book' },
  { name: 'Apex Climber', rarity: 'Legendary', when: 'Locked', icon: 'crown' },
];
