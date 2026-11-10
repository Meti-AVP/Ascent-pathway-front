/**
 * Mock content for the learner home. Field names follow the product vocabulary
 * (pathway → stages, arenas, SR, SYN / Q-Shards, quests, rivalry, squad) so the
 * screen can be wired to the real API later without renaming anything.
 */

export type TabId = 'home' | 'pathways' | 'season' | 'quests' | 'avatars' | 'store' | 'cups' | 'arenas';

export const TABS: { id: TabId; label: string; alert?: boolean }[] = [
  { id: 'home', label: 'Home' },
  { id: 'pathways', label: 'Pathways' },
  { id: 'season', label: 'Season' },
  { id: 'quests', label: 'Quests', alert: true },
  { id: 'avatars', label: 'Avatars', alert: true },
  { id: 'store', label: 'Store' },
  { id: 'cups', label: 'Cups', alert: true },
  { id: 'arenas', label: 'Arenas' },
];

export const player = {
  handle: 'NOUR.K',
  level: 24,
  syn: 2480,
  shards: 36,
  tier: 'Gold',
  division: 'II',
  nextRank: 'Gold I',
  sr: 1612,
  srFloor: 1600, // Gold runs 1400–1799 in four divisions of 100; Gold II is 1600–1699
  srCeil: 1700,
  streakDays: 6,
  streakMultiplier: 1.5,
};

export const nextStage = {
  pathway: 'Sales Mastery',
  index: 4,
  total: 9,
  title: 'Objection Handling',
  kind: 'Battle',
  arena: 'Fast Track',
  competency: 'Prioritisation',
  reward: { syn: 120, sr: '+18' },
};

export const season = {
  number: 2,
  phase: 'The Grind',
  week: 6,
  weeks: 13,
  passLevel: 14,
  xp: 620,
  xpGoal: 1000,
  unclaimed: 2,
};

export const quests = [
  { id: 'daily', label: 'Daily', done: 2, total: 6 },
  { id: 'weekly', label: 'Weekly', done: 3, total: 8 },
  { id: 'season', label: 'Season', done: 5, total: 12 },
] as const;

export const rival = { name: 'Omar H.', record: 'You lead 3–2', online: true };

export const squad = { name: 'Field Ops North', place: 3, of: 14, online: 4 };

export type Promo = {
  id: string;
  kicker: string;
  title: string;
  line: string;
  theme: 'avatar' | 'cup' | 'arena';
  flag?: string;
  goto: TabId;
};

export const promos: Promo[] = [
  {
    id: 'cup',
    kicker: 'Weekly cup',
    title: 'Fast Track Open',
    line: 'Seeding locks in 2d 14h',
    theme: 'cup',
    flag: 'Live',
    goto: 'cups',
  },
  {
    id: 'arena',
    kicker: 'Featured arena',
    title: 'Zero Day',
    line: 'Cyber-security, played as an FPS',
    theme: 'arena',
    goto: 'arenas',
  },
  {
    id: 'avatar',
    kicker: 'New avatar',
    title: 'The Clinician',
    line: 'Unlocked with the Healthcare track',
    theme: 'avatar',
    flag: 'New',
    goto: 'avatars',
  },
];
