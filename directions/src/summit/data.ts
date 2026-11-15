// Summit — shared mock data. Every number follows docs/FLOW.md so all directions tell one story.
// Plain words only: no emoji, no arrow glyphs in copy (icons come from lucide-react in the UI).

export type StageType = 'learn' | 'assess' | 'compete' | 'prove' | 'branch' | 'reward';

export const STAGE_META: Record<StageType, { label: string; blurb: string; products: string }> = {
  learn: { label: 'Learn', blurb: 'Study the material', products: 'Course or live session' },
  assess: { label: 'Assess', blurb: 'Prove knowledge', products: 'Assessment (quiz)' },
  compete: { label: 'Compete', blurb: 'Play it as a game', products: 'One of the 36 Battle Arenas' },
  prove: { label: 'Prove', blurb: 'High-stakes check', products: 'Final assessment or tournament' },
  branch: { label: 'Branch', blurb: 'Decision or remediation', products: 'Routes by score, role or cohort' },
  reward: { label: 'Reward', blurb: 'The payoff', products: 'Reward Drop: badge, certificate, SYN' },
};

export const STAGE_ORDER: StageType[] = ['learn', 'assess', 'compete', 'prove', 'branch', 'reward'];

// Art: one placement per page, each cropped from the concept images to its slot (see UX-AUDIT.md).
export const ART = {
  crew: '/summit/art/crew.webp', // 513×365 · learner home hero
  arena: '/summit/art/arena.webp', // 310×188 · journey stage card
  pair: '/summit/art/pair.webp', // 444×252, shown at 377×214 · admin dashboard header
  builder: '/summit/art/builder.webp', // 360×330 · builder header
};

export const FACE = {
  ahmed: '/summit/art/face-ahmed.webp',
  sara: '/summit/art/face-sara.webp',
  omar: '/summit/art/face-omar.webp',
  layla: '/summit/art/face-layla.webp',
  nour: '/summit/art/face-nour.webp',
  karim: '/summit/art/face-karim.webp',
  lina: '/summit/art/face-lina.webp',
  youssef: '/summit/art/face-youssef.webp',
  hana: '/summit/art/face-hana.webp',
};

export const ORG = 'Northwind Pharma';

/* ───────────────────────── Learner ───────────────────────── */

export const AHMED = {
  name: 'Ahmed Hassan',
  first: 'Ahmed',
  role: 'Field Sales',
  squad: 'Field Ops North',
  squadRank: 3,
  squadSize: 14,
  sr: 1612,
  tier: 'Gold',
  division: 'II',
  nextDivision: 'Gold I',
  srToNext: 88,
  divisionFloor: 1600,
  divisionCeil: 1700,
  level: 24,
  xp: 620,
  xpNext: 1000,
  syn: 2480,
  shards: 36,
  streak: 6,
  multiplier: 1.5,
  rival: { name: 'Omar H.', you: 3, them: 2, sr: 1640, last: 'You won the last one: Fast Track, yesterday' },
};

export type StageState = 'done' | 'current' | 'locked' | 'conditional';

export interface PathStage {
  n: number;
  type: StageType;
  title: string;
  product: string;
  productKind: string;
  state: StageState;
  gate: string;
  clauses: string[];
  asks: string;
  minutes: number;
  xp: number;
  syn: number;
  badge?: string;
  result?: string;
  when?: string;
}

export const SALES_MASTERY: PathStage[] = [
  {
    n: 1, type: 'learn', title: 'Know Your Product', product: 'Northwind Portfolio Essentials', productKind: 'Course · 8 lessons',
    state: 'done', gate: 'Complete every lesson to unlock the next stage.', clauses: ['course.progress = 100%'],
    asks: 'Eight short lessons on the cardiology and respiratory portfolio: indications, dosing and the evidence behind each claim.',
    minutes: 95, xp: 120, syn: 60, result: 'Completed', when: 'Oct 21',
  },
  {
    n: 2, type: 'learn', title: 'Reading the Buyer', product: 'Buyer Signals Workshop', productKind: 'Live session · 45 min',
    state: 'done', gate: 'Attend the live session, or watch the full recording, to unlock the next stage.', clauses: ['session.attended = true'],
    asks: 'A live workshop on the five buyer personas you meet in hospital procurement, and the signals each one gives off.',
    minutes: 45, xp: 120, syn: 60, result: 'Attended', when: 'Oct 29',
  },
  {
    n: 3, type: 'assess', title: 'Discovery Check', product: 'Discovery Check', productKind: 'Assessment · 20 questions',
    state: 'done', gate: 'Score 80% or higher in the assessment to unlock the next stage.', clauses: ['quiz.score >= 80'],
    asks: 'Twenty scenario questions: pick the discovery question that uncovers the real need.',
    minutes: 20, xp: 200, syn: 100, badge: 'Buyer Whisperer', result: 'Passed with 86%', when: 'Nov 6',
  },
  {
    n: 4, type: 'compete', title: 'Objection Handling', product: 'Fast Track', productKind: 'Battle Arena · endless runner',
    state: 'current', gate: 'Score 80% or higher in a Fast Track run to unlock Pricing & Value.', clauses: ['fasttrack.score >= 80', 'attempts <= 2 per day'],
    asks: 'Buyer objections race down three lanes: price, timing and authority. Sort each one to the right answer before it reaches you.',
    minutes: 12, xp: 250, syn: 120, badge: 'Objection Crusher',
  },
  {
    n: 5, type: 'assess', title: 'Pricing & Value', product: 'Pricing & Value Check', productKind: 'Assessment · 24 questions · adaptive',
    state: 'locked', gate: 'Score 80% or higher in the assessment to unlock Negotiation Lab.', clauses: ['quiz.score >= 80'],
    asks: 'Adaptive questions on value framing, budget cycles and tender pricing.',
    minutes: 25, xp: 200, syn: 100,
  },
  {
    n: 6, type: 'compete', title: 'Negotiation Lab', product: 'Leverage', productKind: 'Battle Arena · negotiation duels',
    state: 'locked', gate: 'Win 2 of 3 duels in Leverage. A score under 70% sends you to the Recovery Path first.', clauses: ['duels.wins >= 2', 'score < 70 opens Recovery Path'],
    asks: 'Head-to-head negotiation duels against squadmates: trade concessions and hold your floor.',
    minutes: 18, xp: 250, syn: 150,
  },
  {
    n: 7, type: 'branch', title: 'Recovery Path', product: 'Value Framing Clinic', productKind: 'Remedial course and coach checkpoint',
    state: 'conditional', gate: 'Only if you score below 70% in Negotiation Lab. You then go back to Negotiation Lab; after a third try a coach steps in.', clauses: ['score < 70', 'loops <= 3, then coach'],
    asks: 'A short remedial clinic on value framing, then straight back into the Leverage duels.',
    minutes: 30, xp: 80, syn: 0,
  },
  {
    n: 8, type: 'prove', title: 'Q4 Sales Cup', product: 'Q4 Sales Cup', productKind: 'Tournament · Dec 8–12',
    state: 'locked', gate: 'Place 4th or better in the Q4 Sales Cup to earn mastery.', clauses: ['cup.place <= 4'],
    asks: 'The org-wide cup: Fast Track and Leverage rounds, 128 players, 14 squads.',
    minutes: 60, xp: 500, syn: 400, badge: 'Cup Contender',
  },
  {
    n: 9, type: 'reward', title: 'Mastery Badge', product: 'Sales Mastery', productKind: 'Reward Drop · Legendary',
    state: 'locked', gate: 'Unlocks when you clear the Q4 Sales Cup.', clauses: ['stage(8).passed = true'],
    asks: 'The Legendary Sales Legend badge, your Sales Mastery certificate, 1,000 SYN and 5 Q-Shards.',
    minutes: 0, xp: 1000, syn: 1000, badge: 'Sales Legend',
  },
];

export const CURRENT = SALES_MASTERY.find((s) => s.state === 'current')!;
export const BEST_RUN = 74; // Ahmed's best Fast Track score so far
export const ATTEMPTS_LEFT = 1; // of 2 today

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common', uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic', legendary: 'Legendary',
};

export type BadgeIcon = 'steps' | 'bolt' | 'eye' | 'flame' | 'crown' | 'shield' | 'trophy';

export interface Achievement {
  id: string;
  name: string;
  rarity: Rarity;
  icon: BadgeIcon;
  state: 'earned' | 'progress' | 'locked';
  note: string;
  progress?: [number, number];
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', name: 'First Steps', rarity: 'common', icon: 'steps', state: 'earned', note: 'Finished your first stage' },
  { id: 'a2', name: 'Quick Learner', rarity: 'uncommon', icon: 'bolt', state: 'earned', note: 'Three lessons in one day' },
  { id: 'a3', name: 'Buyer Whisperer', rarity: 'rare', icon: 'eye', state: 'earned', note: 'Discovery Check, 86%' },
  { id: 'a4', name: 'Hot Streak', rarity: 'epic', icon: 'flame', state: 'progress', note: 'Keep a 7-day streak', progress: [6, 7] },
  { id: 'a5', name: 'Sales Legend', rarity: 'legendary', icon: 'crown', state: 'locked', note: 'Finish Sales Mastery' },
];

export const PATH_BADGES: Achievement[] = [
  { id: 'p1', name: 'Buyer Whisperer', rarity: 'rare', icon: 'eye', state: 'earned', note: 'Stage 3 · earned Nov 6' },
  { id: 'p2', name: 'Objection Crusher', rarity: 'rare', icon: 'shield', state: 'progress', note: 'Stage 4 · best run 74 of 80', progress: [74, 80] },
  { id: 'p3', name: 'Cup Contender', rarity: 'epic', icon: 'trophy', state: 'locked', note: 'Stage 8 · place 4th or better' },
  { id: 'p4', name: 'Sales Legend', rarity: 'legendary', icon: 'crown', state: 'locked', note: 'Stage 9 · finish the pathway' },
];

export interface Quest { t: string; done?: boolean; p?: [number, number]; unit?: string; reward: string }
export const QUESTS: { key: 'daily' | 'weekly' | 'season'; label: string; done: number; total: number; resets: string; items: Quest[] }[] = [
  {
    key: 'daily', label: 'Daily', done: 2, total: 6, resets: 'Resets in 7 h 12 min',
    items: [
      { t: 'Complete a learning session', done: true, reward: '+25 SYN' },
      { t: 'Answer 20 practice questions', done: true, reward: '+30 SYN' },
      { t: 'Win a Fast Track run', p: [0, 1], reward: '+40 SYN' },
      { t: 'Spend 15 minutes in an arena', p: [6, 15], unit: 'min', reward: '+25 SYN' },
    ],
  },
  {
    key: 'weekly', label: 'Weekly', done: 3, total: 8, resets: 'Resets in 3 days',
    items: [
      { t: 'Keep a 5-day streak', done: true, reward: '+80 SYN' },
      { t: 'Win 5 duels', p: [3, 5], reward: '+120 SYN' },
      { t: 'Earn 1,000 XP', p: [640, 1000], unit: 'XP', reward: '+100 SYN' },
      { t: 'Beat your rival twice', p: [1, 2], reward: '+2 Q-Shards' },
    ],
  },
  {
    key: 'season', label: 'Season 4', done: 5, total: 12, resets: 'Ends Dec 31',
    items: [
      { t: 'Reach Gold I', p: [1612, 1700], unit: 'SR', reward: '+3 Q-Shards' },
      { t: 'Finish Sales Mastery', p: [3, 9], unit: 'stages', reward: '+5 Q-Shards' },
      { t: 'Place top 4 in a cup', p: [0, 1], reward: '+4 Q-Shards' },
      { t: 'Win 40 ranked duels', p: [27, 40], reward: '+250 SYN' },
    ],
  },
];

export const SQUAD = [
  { rank: 1, name: 'Layla K.', face: FACE.layla, pts: 2140, delta: 0 },
  { rank: 2, name: 'Omar H.', face: FACE.omar, pts: 1985, delta: 1, rival: true },
  { rank: 3, name: 'Ahmed H.', face: FACE.ahmed, pts: 1912, delta: 2, you: true },
  { rank: 4, name: 'Nour S.', face: FACE.nour, pts: 1860, delta: -2 },
];

/* ───────────────────────── Admin ───────────────────────── */

export const SARA = { name: 'Sara Mansour', first: 'Sara', role: 'Org Admin' };

export const KPIS = [
  { key: 'learners', v: '1,248', label: 'Active learners', delta: '+12%', up: true, good: true, note: 'this month' },
  { key: 'completion', v: '92%', label: 'Completion rate', delta: '+5 pts', up: true, good: true, note: 'this quarter' },
  { key: 'pathways', v: '48', label: 'Active pathways', delta: '+4', up: true, good: true, note: 'in November' },
  { key: 'mastery', v: '31 days', label: 'Median time to mastery', delta: '4 days faster', up: false, good: true, note: 'than in Q3' },
] as const;

export const PERFORMANCE: Record<'4W' | '12W' | '6M', { labels: string[]; values: number[]; target: number }> = {
  '4W': { labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], values: [84, 87, 90, 92], target: 85 },
  '12W': {
    labels: ['Aug 25', 'Sep 1', 'Sep 8', 'Sep 15', 'Sep 22', 'Sep 29', 'Oct 6', 'Oct 13', 'Oct 20', 'Oct 27', 'Nov 3', 'Nov 10'],
    values: [61, 66, 70, 72, 71, 76, 79, 81, 84, 87, 90, 92], target: 85,
  },
  '6M': { labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'], values: [48, 55, 61, 71, 84, 92], target: 85 },
};

export const TOP_PATHWAYS = [
  { name: 'Product Excellence', pct: 92, learners: 318 },
  { name: 'Leadership Essentials', pct: 87, learners: 204 },
  { name: 'Tech Fundamentals', pct: 76, learners: 276 },
  { name: 'Sales Mastery', pct: 71, learners: 142 },
];

export type ReviewKind = 'Course' | 'Assessment' | 'Journey' | 'Tournament' | 'Battle set' | 'Reward Drop' | 'Live Session';

export interface ReviewItem {
  id: string;
  kind: ReviewKind;
  title: string;
  meta: string;
  summary: string;
  author: string;
  face: string;
  age: string;
  lint: 'pass' | 'warn';
  lintNote?: string;
  own?: boolean;
}

export const REVIEW_QUEUE: ReviewItem[] = [
  {
    id: 'r1', kind: 'Course', title: 'Objection Handling Playbook', meta: '12 lessons · 1 h 40 min', author: 'Lina Farouk', face: FACE.lina, age: '2 h ago', lint: 'pass',
    summary: 'Twelve lessons on the six objection types reps meet in hospital procurement, with 40 practice prompts and a 10-question check at the end.',
  },
  {
    id: 'r2', kind: 'Assessment', title: 'Pricing & Value Check', meta: '24 questions · adaptive', author: 'Karim Adel', face: FACE.karim, age: '3 h ago', lint: 'pass',
    summary: 'Twenty-four adaptive questions on value framing, budget cycles and tender pricing. Pass mark 80%; two retries a day.',
  },
  {
    id: 'r3', kind: 'Tournament', title: 'Q4 Sales Cup rules', meta: '128 slots · top 4 advance', author: 'Youssef Ali', face: FACE.youssef, age: '5 h ago', lint: 'warn',
    lintNote: 'No tiebreak rule. Ties will be settled by the fastest time unless you add one.',
    summary: 'Org-wide cup on Dec 8–12: Fast Track and Leverage rounds for 128 players from 14 squads. The top 4 advance to mastery.',
  },
  {
    id: 'r4', kind: 'Journey', title: 'Clinical Basics Onboarding', meta: '7 stages · 1 branch', author: 'Hana Saleh', face: FACE.hana, age: 'Yesterday', lint: 'pass',
    summary: 'Seven stages for new clinical reps, from product basics to a final check, with a remedial branch for scores below 70%.',
  },
  {
    id: 'r5', kind: 'Battle set', title: 'Leverage negotiation duels', meta: '36 scenarios · hard', author: 'Nour Samir', face: FACE.nour, age: 'Yesterday', lint: 'pass',
    summary: 'Thirty-six hard negotiation scenarios for the Leverage arena, used by the Negotiation Lab stage of Sales Mastery.',
  },
  {
    id: 'r6', kind: 'Live Session', title: 'Negotiation Clinic', meta: 'Dec 3 · 60 min · 40 seats', author: 'Lina Farouk', face: FACE.lina, age: '2 days ago', lint: 'pass',
    summary: 'A 60-minute live clinic on Dec 3 for 40 seats. The recording counts as attendance for learners who miss it.',
  },
  {
    id: 'r7', kind: 'Reward Drop', title: 'Q4 Mastery Certificate', meta: 'Certificate · Epic badge · 500 SYN', author: 'Sara Mansour', face: FACE.sara, age: '2 days ago', lint: 'pass', own: true,
    summary: 'A certificate, an Epic badge and 500 SYN for every learner who finishes a Q4 mastery pathway.',
  },
];

export const SKILL_GAPS = [
  { skill: 'Product knowledge', v: 88, target: 85 },
  { skill: 'Discovery', v: 81, target: 80 },
  { skill: 'Pricing & value', v: 69, target: 80 },
  { skill: 'Objection handling', v: 64, target: 80 },
  { skill: 'Negotiation', v: 58, target: 75 },
];

export const ACTIVITY: { who: string; face?: string; what: string; when: string }[] = [
  { who: 'Ahmed Hassan', face: FACE.ahmed, what: 'passed Discovery Check with 86%', when: '9 min ago' },
  { who: 'Field Ops North', what: 'climbed to 2nd in the cup qualifiers', when: '1 h ago' },
  { who: 'Lina Farouk', face: FACE.lina, what: 'submitted Objection Handling Playbook for review', when: '2 h ago' },
  { who: '38 learners', what: 'finished Product Excellence this week', when: '4 h ago' },
];

export const TOURNAMENT = {
  name: 'Q4 Sales Cup', dates: 'Dec 8–12', players: 128, squads: 14, closes: 'Registration closes Dec 5', registered: 96,
};

/* ───────────────────────── Builder ───────────────────────── */

export type ClauseType = 'score' | 'completion' | 'battle' | 'placement' | 'attempts' | 'time' | 'cohort';

export const CLAUSE_META: Record<ClauseType, { label: string; code: string; text: string }> = {
  score: { label: 'Score', code: 'quiz.score >= 80', text: 'Score 80% or higher in the previous assessment' },
  completion: { label: 'Completion', code: 'course.progress = 100%', text: 'Complete the previous course' },
  battle: { label: 'Battle result', code: 'duels.wins >= 2', text: 'Win 2 of 3 duels in the arena' },
  placement: { label: 'Placement', code: 'cup.place <= 4', text: 'Place 4th or better in the cup' },
  attempts: { label: 'Attempts', code: 'attempts <= 3', text: 'No more than 3 attempts' },
  time: { label: 'Time', code: 'window = 14 days', text: 'Within 14 days of unlocking' },
  cohort: { label: 'Cohort or role', code: "role in ('PM', 'PO')", text: 'Product Managers and Product Owners only' },
};

export interface Clause { id: string; type: ClauseType; text: string; code: string }

export interface BuildStage {
  id: string;
  type: StageType;
  title: string;
  product: string;
  productKind: string;
  timeLimit: 'Off' | '24 h' | '48 h' | '7 days';
  items: number;
  itemUnit: string;
  difficulty: 'Fixed' | 'Adaptive';
  retries: number;
  required: boolean;
  match: 'all' | 'any';
  clauses: Clause[];
  exit?: string; // branch stages: where learners go after remediation
}

let uid = 100;
export const nextId = (p = 'id') => `${p}${++uid}`;

export const BUILD_STAGES: BuildStage[] = [
  {
    id: 's1', type: 'learn', title: 'Product Strategy 101', product: 'Product Strategy 101', productKind: 'Course · 6 modules',
    timeLimit: 'Off', items: 6, itemUnit: 'modules', difficulty: 'Fixed', retries: 0, required: true, match: 'all',
    clauses: [{ id: 'c1', type: 'cohort', text: 'Product Managers and Product Owners only', code: "role in ('PM', 'PO')" }],
  },
  {
    id: 's2', type: 'assess', title: 'Knowledge Check', product: 'Knowledge Check', productKind: 'Assessment · 80% to pass',
    timeLimit: '24 h', items: 20, itemUnit: 'questions', difficulty: 'Adaptive', retries: 2, required: true, match: 'all',
    clauses: [{ id: 'c2', type: 'completion', text: 'Complete Product Strategy 101', code: 'course.progress = 100%' }],
  },
  {
    id: 's3', type: 'compete', title: 'Strategy Arena', product: 'Strategy Arena', productKind: 'Battle Arena · ranked duels',
    timeLimit: '24 h', items: 12, itemUnit: 'scenarios', difficulty: 'Adaptive', retries: 2, required: true, match: 'all',
    clauses: [
      { id: 'c3', type: 'score', text: 'Score 80% or higher in Knowledge Check', code: 'quiz.score >= 80' },
      { id: 'c4', type: 'attempts', text: 'No more than 3 attempts', code: 'attempts <= 3' },
    ],
  },
  {
    id: 's4', type: 'prove', title: 'Final Challenge', product: 'Final Challenge', productKind: 'Final assessment · case study',
    timeLimit: '48 h', items: 30, itemUnit: 'questions', difficulty: 'Fixed', retries: 1, required: true, match: 'all',
    clauses: [{ id: 'c5', type: 'battle', text: 'Win 2 of 3 duels in Strategy Arena', code: 'duels.wins >= 2' }],
  },
  {
    id: 's5', type: 'branch', title: 'Remedial Path', product: 'Strategy Refresher', productKind: 'Remedial course · 3 lessons',
    timeLimit: '7 days', items: 3, itemUnit: 'lessons', difficulty: 'Fixed', retries: 3, required: false, match: 'all',
    clauses: [{ id: 'c6', type: 'score', text: 'Score below 70% in Final Challenge', code: 'final.score < 70' }],
  },
  {
    id: 's6', type: 'reward', title: 'Leadership Certificate', product: 'Leadership Certificate', productKind: 'Certificate · Epic badge · 500 SYN',
    timeLimit: 'Off', items: 1, itemUnit: 'drop', difficulty: 'Fixed', retries: 0, required: true, match: 'all',
    clauses: [{ id: 'c7', type: 'score', text: 'Score 80% or higher in Final Challenge', code: 'final.score >= 80' }],
  },
];

export const STAGE_DESC: Record<StageType, string> = {
  learn: 'Courses, live sessions, videos or articles.',
  assess: 'A scored assessment that checks knowledge.',
  compete: 'Put the skill into play in one of the 36 Battle Arenas.',
  prove: 'A high-stakes final check or a tournament cup.',
  branch: 'Route learners by score, role or cohort, or into remediation.',
  reward: 'The payoff: a badge, a certificate, SYN.',
};

export const PRODUCT_CHOICES: Record<StageType, { name: string; kind: string }[]> = {
  learn: [
    { name: 'Product Strategy 101', kind: 'Course · 6 modules' },
    { name: 'Roadmapping in Practice', kind: 'Course · 4 modules' },
    { name: 'Strategy Office Hours', kind: 'Live session · 60 min' },
  ],
  assess: [
    { name: 'Knowledge Check', kind: 'Assessment · 80% to pass' },
    { name: 'Strategy Fundamentals Quiz', kind: 'Assessment · 15 questions' },
    { name: 'Case Reading Check', kind: 'Assessment · 10 questions' },
  ],
  compete: [
    { name: 'Strategy Arena', kind: 'Battle Arena · ranked duels' },
    { name: 'Fast Track', kind: 'Battle Arena · endless runner' },
    { name: 'Leverage', kind: 'Battle Arena · negotiation duels' },
  ],
  prove: [
    { name: 'Final Challenge', kind: 'Final assessment · case study' },
    { name: 'Q1 Leadership Cup', kind: 'Tournament · 64 slots' },
    { name: 'Capstone Review', kind: 'Final assessment · panel' },
  ],
  branch: [
    { name: 'Strategy Refresher', kind: 'Remedial course · 3 lessons' },
    { name: 'Coach Checkpoint', kind: 'One-to-one with a coach' },
    { name: 'Role split: PM or PO', kind: 'Routes by role' },
  ],
  reward: [
    { name: 'Leadership Certificate', kind: 'Certificate · Epic badge · 500 SYN' },
    { name: 'Strategist Badge', kind: 'Badge · Rare' },
    { name: 'SYN Drop', kind: '500 SYN' },
  ],
};

export const NOTIFICATIONS = {
  learner: [
    { t: 'Omar H. challenged you to a Fast Track rematch', when: '12 min ago', tone: 'red' },
    { t: 'Your streak bonus is now ×1.5', when: '1 h ago', tone: 'orange' },
    { t: 'Q4 Sales Cup registration closes Dec 5', when: '3 h ago', tone: 'yellow' },
  ],
  admin: [
    { t: 'Lina Farouk submitted Objection Handling Playbook', when: '2 h ago', tone: 'orange' },
    { t: 'Q4 Sales Cup rules have 1 warning', when: '5 h ago', tone: 'yellow' },
    { t: '38 learners finished Product Excellence', when: '4 h ago', tone: 'green' },
  ],
} as const;
