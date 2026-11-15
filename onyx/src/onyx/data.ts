// Onyx — mock data. Same story as FLOW.md: Northwind Pharma, Ahmed Hassan (learner), Sara Mansour (Org Admin).

export type Role = 'learner' | 'admin';
export type StageType = 'learn' | 'assess' | 'compete' | 'prove' | 'branch' | 'reward';
export type StageState = 'done' | 'current' | 'locked' | 'optional';
export type ProductKind = 'course' | 'assessment' | 'arena' | 'tournament' | 'live' | 'reward';
export type PathKey = 'sales' | 'product' | 'lead';

export const ORG = 'Northwind Pharma';

export const STAGE_TYPES: Record<StageType, { label: string; what: string }> = {
  learn: { label: 'Learn', what: 'Study the material' },
  assess: { label: 'Assess', what: 'Prove what you know' },
  compete: { label: 'Compete', what: 'Play it as a game' },
  prove: { label: 'Prove', what: 'High-stakes check' },
  branch: { label: 'Branch', what: 'Routes learners by result' },
  reward: { label: 'Reward', what: 'The payoff' },
};

export const PRODUCT_KINDS: Record<ProductKind, { label: string; what: string; fits: StageType[] }> = {
  course: { label: 'Course', what: 'Lessons to study at your own pace', fits: ['learn', 'branch'] },
  assessment: { label: 'Assessment', what: 'A scored quiz with a pass mark', fits: ['assess', 'prove'] },
  arena: { label: 'Battle Arena', what: 'One of 36 skill games, played in duels', fits: ['compete'] },
  tournament: { label: 'Tournament', what: 'A cup with rounds and placements', fits: ['prove'] },
  live: { label: 'Live Session', what: 'A scheduled session with a coach', fits: ['learn', 'branch'] },
  reward: { label: 'Reward Drop', what: 'Badge, certificate or SYN on completion', fits: ['reward'] },
};

// ── Learner ────────────────────────────────────────────────────────────────
export const LEARNER = {
  name: 'Ahmed Hassan',
  first: 'Ahmed',
  role: 'Field Sales',
  squad: 'Field Ops North',
  squadPlace: 3,
  squadSize: 14,
  sr: 1612,
  tier: 'Gold II',
  toNextTier: 88,
  nextTier: 'Gold I',
  level: 24,
  xp: 620,
  xpNext: 1000,
  syn: 2480,
  shards: 36,
  streak: 6,
  multiplier: 1.5,
  rival: { name: 'Omar H.', me: 3, them: 2, sr: 1587, tier: 'Gold II' },
  quests: [
    { id: 'daily', label: 'Daily quests', done: 2, total: 6, resets: 'Resets in 7 h' },
    { id: 'weekly', label: 'Weekly quests', done: 3, total: 8, resets: 'Resets Monday' },
    { id: 'season', label: 'Season quests', done: 5, total: 12, resets: '41 days left' },
  ],
  achievements: [
    { name: 'Discovery Pro', rarity: 'Rare', when: 'Scored 86% in Discovery Check' },
    { name: 'Six-Day Fire', rarity: 'Uncommon', when: '6 days in a row' },
    { name: 'First Blood', rarity: 'Common', when: 'Won your first duel' },
    { name: 'Product Scholar', rarity: 'Epic', when: 'Finished Know Your Product with no misses' },
  ],
  squadBoard: [
    { name: 'Nour K.', sr: 1704, me: false },
    { name: 'Youssef R.', sr: 1655, me: false },
    { name: 'Ahmed Hassan', sr: 1612, me: true },
    { name: 'Omar H.', sr: 1587, me: false },
  ],
};

export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] as const;

export interface Stage {
  n: number;
  name: string;
  type: StageType;
  product: { kind: ProductKind; name: string; meta: string };
  state: StageState;
  asks: string; // what the stage asks, plainly
  pass: string; // what passes it (the gate to the next stage), plainly
  unlock?: string; // for locked / optional stages: how to unlock it
  result?: string; // for done stages
  rewards: string[];
  facts: { label: string; value: string }[];
}

export interface Pathway {
  key: PathKey;
  name: string;
  summary: string;
  assigned: string;
  stages: Stage[];
}

export const PATHWAYS: Pathway[] = [
  {
    key: 'sales',
    name: 'Sales Mastery',
    summary: 'From product knowledge to closing under pressure.',
    assigned: 'Assigned by Sara Mansour · Field Sales',
    stages: [
      {
        n: 1, name: 'Know Your Product', type: 'learn', state: 'done',
        product: { kind: 'course', name: 'Northwind Portfolio Essentials', meta: '8 lessons · 40 min' },
        asks: 'Study the Northwind portfolio: what each product does, who it is for and how it compares.',
        pass: 'Finish every lesson.', result: 'Finished on 2 November',
        rewards: ['+100 XP', '+40 SYN'],
        facts: [{ label: 'Lessons', value: '8 of 8' }, { label: 'Time spent', value: '43 min' }],
      },
      {
        n: 2, name: 'Reading the Buyer', type: 'learn', state: 'done',
        product: { kind: 'course', name: 'Buyer Signals', meta: '6 lessons · 35 min' },
        asks: 'Learn to read what a buyer cares about from what they say, and what they leave out.',
        pass: 'Finish every lesson.', result: 'Finished on 6 November',
        rewards: ['+100 XP', '+40 SYN'],
        facts: [{ label: 'Lessons', value: '6 of 6' }, { label: 'Time spent', value: '38 min' }],
      },
      {
        n: 3, name: 'Discovery Check', type: 'assess', state: 'done',
        product: { kind: 'assessment', name: 'Discovery Check', meta: '15 questions · 20 min' },
        asks: 'Answer 15 questions on running a discovery call.',
        pass: 'Score 80% or higher.', result: 'Scored 86% on the first attempt',
        rewards: ['+120 XP', '+60 SYN', 'Discovery Pro badge'],
        facts: [{ label: 'Your score', value: '86%' }, { label: 'Attempts', value: '1 of 2' }],
      },
      {
        n: 4, name: 'Objection Handling', type: 'compete', state: 'current',
        product: { kind: 'arena', name: 'Fast Track', meta: 'Battle Arena · endless runner' },
        asks: 'Buyer objections race toward you. Sort them by priority and answer the most urgent one first. Three rounds, about 12 minutes.',
        pass: 'Win at least 1 duel, in 2 attempts or fewer.',
        rewards: ['+150 XP', '+80 SYN', 'Objection Breaker badge'],
        facts: [{ label: 'Attempts used', value: '0 of 2' }, { label: 'Time', value: '≈ 12 min' }, { label: 'Opponents', value: 'Gold tier' }],
      },
      {
        n: 5, name: 'Pricing & Value', type: 'assess', state: 'locked',
        product: { kind: 'assessment', name: 'Pricing & Value Check', meta: '12 questions · 15 min' },
        asks: 'Answer 12 questions on pricing conversations and value framing.',
        pass: 'Score 80% or higher. Below 70% opens the Recovery Path first.',
        unlock: 'Win stage 4, Objection Handling.',
        rewards: ['+120 XP', '+60 SYN'],
        facts: [{ label: 'Questions', value: '12' }, { label: 'Attempts', value: '2 allowed' }],
      },
      {
        n: 6, name: 'Negotiation Lab', type: 'compete', state: 'locked',
        product: { kind: 'arena', name: 'Leverage', meta: 'Battle Arena · negotiation duels' },
        asks: 'Negotiate live against other players. Trade concessions without giving away the margin.',
        pass: 'Win 2 of 3 duels.',
        unlock: 'Score 80% or higher in stage 5, Pricing & Value.',
        rewards: ['+150 XP', '+80 SYN'],
        facts: [{ label: 'Format', value: 'Best of 3' }, { label: 'Time', value: '≈ 15 min' }],
      },
      {
        n: 7, name: 'Recovery Path', type: 'branch', state: 'optional',
        product: { kind: 'course', name: 'Value Selling Refresher', meta: '3 lessons · 20 min' },
        asks: 'A short refresher on value selling, then you retry Pricing & Value.',
        pass: 'Finish the refresher to retry. After the third loop a coach reviews your plan with you.',
        unlock: 'Opens only if you score below 70% in stage 5.',
        rewards: ['+40 XP'],
        facts: [{ label: 'Loops allowed', value: '3, then a coach' }],
      },
      {
        n: 8, name: 'Q4 Sales Cup', type: 'prove', state: 'locked',
        product: { kind: 'tournament', name: 'Q4 Sales Cup', meta: 'Tournament · 8 December' },
        asks: 'Compete in the Q4 cup against the whole sales organization.',
        pass: 'Place 4th or better in the cup.',
        unlock: 'Win stage 6, Negotiation Lab.',
        rewards: ['+300 XP', '+150 SYN', 'Cup finalist badge'],
        facts: [{ label: 'Date', value: '8 December' }, { label: 'Players', value: '64 registered' }],
      },
      {
        n: 9, name: 'Mastery Badge', type: 'reward', state: 'locked',
        product: { kind: 'reward', name: 'Sales Mastery', meta: 'Badge · certificate · 500 SYN' },
        asks: 'Collect the Sales Mastery badge and your certificate.',
        pass: 'Nothing more to do. This is the summit.',
        unlock: 'Place 4th or better in stage 8, the Q4 Sales Cup.',
        rewards: ['Sales Mastery badge (Epic)', 'Certificate', '+500 SYN'],
        facts: [{ label: 'Rarity', value: 'Epic' }],
      },
    ],
  },
  {
    key: 'product',
    name: 'Product Excellence',
    summary: 'Know the portfolio well enough to teach it.',
    assigned: 'Assigned by Sara Mansour · All Field Sales',
    stages: [
      {
        n: 1, name: 'Portfolio Foundations', type: 'learn', state: 'current',
        product: { kind: 'course', name: 'Portfolio Foundations', meta: '6 lessons · 30 min' },
        asks: 'The essentials of every product line, in six short lessons.',
        pass: 'Finish every lesson.',
        rewards: ['+100 XP', '+40 SYN'],
        facts: [{ label: 'Lessons', value: '0 of 6' }, { label: 'Time', value: '≈ 30 min' }],
      },
      {
        n: 2, name: 'Feature Fluency', type: 'assess', state: 'locked',
        product: { kind: 'assessment', name: 'Feature Fluency', meta: '12 questions · 15 min' },
        asks: 'Match features to the buyer problems they solve.',
        pass: 'Score 80% or higher.',
        unlock: 'Finish stage 1, Portfolio Foundations.',
        rewards: ['+120 XP', '+60 SYN'],
        facts: [{ label: 'Questions', value: '12' }],
      },
      {
        n: 3, name: 'Launch Sprint', type: 'compete', state: 'locked',
        product: { kind: 'arena', name: 'Pitch Perfect', meta: 'Battle Arena · pitch duels' },
        asks: 'Pitch a new product in 60 seconds. Players vote on the clearest pitch.',
        pass: 'Win at least 1 duel.',
        unlock: 'Score 80% or higher in stage 2, Feature Fluency.',
        rewards: ['+150 XP', '+80 SYN'],
        facts: [{ label: 'Attempts', value: '3 allowed' }, { label: 'Time', value: '≈ 10 min' }],
      },
      {
        n: 4, name: 'Product Expert Exam', type: 'prove', state: 'locked',
        product: { kind: 'assessment', name: 'Product Expert Exam', meta: '25 questions · 30 min' },
        asks: 'The final exam across the whole portfolio.',
        pass: 'Score 85% or higher.',
        unlock: 'Win stage 3, Launch Sprint.',
        rewards: ['+300 XP', '+150 SYN'],
        facts: [{ label: 'Questions', value: '25' }],
      },
      {
        n: 5, name: 'Second Look', type: 'branch', state: 'optional',
        product: { kind: 'course', name: 'Portfolio Refresher', meta: '3 lessons · 15 min' },
        asks: 'A focused refresher on the topics you missed, then a retry.',
        pass: 'Finish the refresher to retry the exam.',
        unlock: 'Opens only if you score below 70% in stage 4.',
        rewards: ['+40 XP'],
        facts: [{ label: 'Loops allowed', value: '3, then a coach' }],
      },
      {
        n: 6, name: 'Product Expert', type: 'reward', state: 'locked',
        product: { kind: 'reward', name: 'Product Expert', meta: 'Badge · 300 SYN' },
        asks: 'Collect the Product Expert badge.',
        pass: 'Nothing more to do. This is the summit.',
        unlock: 'Score 85% or higher in stage 4.',
        rewards: ['Product Expert badge (Rare)', '+300 SYN'],
        facts: [{ label: 'Rarity', value: 'Rare' }],
      },
    ],
  },
  {
    key: 'lead',
    name: 'Leadership Essentials',
    summary: 'Lead yourself first, then a team.',
    assigned: 'Assigned by Sara Mansour · Optional for Field Sales',
    stages: [
      {
        n: 1, name: 'Leading Yourself', type: 'learn', state: 'current',
        product: { kind: 'course', name: 'Leading Yourself', meta: '5 lessons · 30 min' },
        asks: 'Habits, focus and feedback: how good leaders run their own week.',
        pass: 'Finish every lesson.',
        rewards: ['+100 XP', '+40 SYN'],
        facts: [{ label: 'Lessons', value: '0 of 5' }, { label: 'Time', value: '≈ 30 min' }],
      },
      {
        n: 2, name: 'Coaching Conversations', type: 'learn', state: 'locked',
        product: { kind: 'live', name: 'Coaching Conversations', meta: 'Live Session · 26 November' },
        asks: 'A live session with coach Mona Adel on giving useful feedback.',
        pass: 'Attend the session.',
        unlock: 'Finish stage 1, Leading Yourself.',
        rewards: ['+100 XP'],
        facts: [{ label: 'When', value: '26 Nov · 14:00' }],
      },
      {
        n: 3, name: 'Leadership Check', type: 'assess', state: 'locked',
        product: { kind: 'assessment', name: 'Leadership Check', meta: '10 questions · 15 min' },
        asks: 'Ten scenario questions on leading a team through change.',
        pass: 'Score 80% or higher.',
        unlock: 'Attend stage 2, Coaching Conversations.',
        rewards: ['+120 XP', '+60 SYN'],
        facts: [{ label: 'Questions', value: '10' }],
      },
      {
        n: 4, name: 'Team Decisions', type: 'compete', state: 'locked',
        product: { kind: 'arena', name: 'Council', meta: 'Battle Arena · decision duels' },
        asks: 'Make the call under time pressure, then defend it against another player.',
        pass: 'Win at least 1 duel.',
        unlock: 'Score 80% or higher in stage 3.',
        rewards: ['+150 XP', '+80 SYN'],
        facts: [{ label: 'Time', value: '≈ 12 min' }],
      },
      {
        n: 5, name: 'Leadership Capstone', type: 'prove', state: 'locked',
        product: { kind: 'assessment', name: 'Capstone Case', meta: 'Final assessment · 40 min' },
        asks: 'Work through a full team case and submit your plan.',
        pass: 'Score 80% or higher.',
        unlock: 'Win stage 4, Team Decisions.',
        rewards: ['+300 XP', '+150 SYN'],
        facts: [{ label: 'Time', value: '≈ 40 min' }],
      },
      {
        n: 6, name: 'Leader Certificate', type: 'reward', state: 'locked',
        product: { kind: 'reward', name: 'Leader Certificate', meta: 'Certificate · 300 SYN' },
        asks: 'Collect your Leadership Essentials certificate.',
        pass: 'Nothing more to do. This is the summit.',
        unlock: 'Pass stage 5, the Leadership Capstone.',
        rewards: ['Certificate', '+300 SYN'],
        facts: [{ label: 'Rarity', value: 'Rare' }],
      },
    ],
  },
];

export const pathwayOf = (k: PathKey) => PATHWAYS.find((p) => p.key === k)!;
export const currentStageOf = (p: Pathway) => p.stages.find((s) => s.state === 'current') ?? p.stages[0]!;
export const doneCount = (p: Pathway) => p.stages.filter((s) => s.state === 'done').length;

// ── Admin ──────────────────────────────────────────────────────────────────
export const ADMIN = { name: 'Sara Mansour', first: 'Sara', initials: 'SM', role: 'Org Admin' };
export const APPROVER = { name: 'Karim Adel', role: 'Org Admin' };

export const KPIS = [
  { id: 'learners', label: 'Active learners', value: 1248, unit: '', delta: '+12% this month', up: true, spark: [930, 960, 1004, 990, 1050, 1083, 1110, 1131, 1150, 1189, 1214, 1248] },
  { id: 'completion', label: 'Completion rate', value: 92, unit: '%', delta: '+3 pts this month', up: true, spark: [84, 85, 85, 86, 88, 87, 89, 90, 89, 91, 91, 92] },
  { id: 'pathways', label: 'Active pathways', value: 48, unit: '', delta: '+4 this month', up: true, spark: [38, 39, 40, 40, 41, 43, 43, 44, 45, 46, 47, 48] },
  { id: 'mastery', label: 'Time to mastery', value: 31, unit: ' days', delta: '2 days faster', up: true, spark: [39, 38, 38, 37, 36, 35, 35, 34, 33, 33, 32, 31], note: 'Median' },
];

export type ReviewKind = 'journey' | 'items' | 'tournament' | 'arena' | 'live' | 'course' | 'reward';
export interface ReviewItem {
  id: string;
  kind: ReviewKind;
  title: string;
  what: string; // e.g. "Journey · 7 stages"
  author: string;
  mine?: boolean;
  age: string;
  change: string; // what changed, plainly
  audience: string;
  checks: string[];
  preview: { label: string; value: string }[];
  isNew?: boolean;
}

export const REVIEW_QUEUE: ReviewItem[] = [
  {
    id: 'r1', kind: 'journey', title: 'Customer Success Onboarding', what: 'Journey · 7 stages', author: 'Layla Ibrahim', age: '2 days ago',
    change: 'New journey for new Customer Success hires.', audience: '86 learners in Customer Success',
    checks: ['Journey check passed', 'Every stage has content', 'Remedial branch has an exit'],
    preview: [{ label: 'Stages', value: 'Learn · Learn · Assess · Compete · Branch · Prove · Reward' }, { label: 'Pass marks', value: '80% on both assessments' }],
  },
  {
    id: 'r2', kind: 'items', title: 'Pricing objections', what: 'Assessment · 12 questions', author: 'Omar Farouk', age: '1 day ago',
    change: 'Drafted with AI from “Pricing Guidelines.docx”, then edited by the author.', audience: 'Used in Sales Mastery, stage 5',
    checks: ['Every answer is cited to the source', '2 questions edited by the author'],
    preview: [{ label: 'Sample question', value: 'A buyer says the price is 20% above a competitor. What do you ask first?' }, { label: 'Difficulty', value: 'Mixed · 4 easy, 6 medium, 2 hard' }],
  },
  {
    id: 'r3', kind: 'tournament', title: 'Q4 Sales Cup', what: 'Tournament · rules change', author: 'Karim Adel', age: '20 hours ago',
    change: 'Top 4 advance to the final (was top 8).', audience: '64 registered players',
    checks: ['Advancement rule set', 'Prize pool funded: 6,000 SYN'],
    preview: [{ label: 'Date', value: '8 December · 3 rounds' }, { label: 'Advance', value: 'Place 4th or better' }],
  },
  {
    id: 'r4', kind: 'arena', title: 'Leverage', what: 'Battle Arena · settings', author: 'Omar Farouk', age: '9 hours ago',
    change: 'Difficulty changed from fixed to adaptive.', audience: 'Used in Sales Mastery, stage 6',
    checks: ['Tested in 40 practice duels'],
    preview: [{ label: 'Difficulty', value: 'Adaptive (was fixed: medium)' }, { label: 'Duel length', value: '≈ 5 min' }],
  },
  {
    id: 'r5', kind: 'live', title: 'Objection clinic', what: 'Live Session', author: 'Mona Adel', age: '5 hours ago',
    change: 'New live session with coach Mona Adel.', audience: '30 seats · Field Sales',
    checks: ['Coach confirmed', 'Calendar invite ready'],
    preview: [{ label: 'When', value: '26 November · 14:00 · 45 min' }, { label: 'Seats', value: '30' }],
  },
  {
    id: 'r6', kind: 'course', title: 'Value Selling Refresher', what: 'Course · 3 lessons', author: 'Layla Ibrahim', age: '3 hours ago',
    change: 'Remedial course for the Recovery Path in Sales Mastery.', audience: 'Learners who score below 70% in Pricing & Value',
    checks: ['Linked to Recovery Path', 'Captions on every video'],
    preview: [{ label: 'Lessons', value: 'Value vs. price · Framing ROI · Holding the line' }, { label: 'Length', value: '20 min' }],
  },
  {
    id: 'r7', kind: 'reward', title: 'Field Sales Q4 drop', what: 'Reward Drop', author: 'Karim Adel', age: '1 hour ago',
    change: 'New Epic badge “Closer” and 250 SYN for Q4 finishers.', audience: 'Everyone who finishes Sales Mastery in Q4',
    checks: ['Budget approved: 250 SYN × 140 learners'],
    preview: [{ label: 'Badge', value: 'Closer · Epic' }, { label: 'SYN', value: '250 each' }],
  },
];

export const TOP_PATHWAYS = [
  { name: 'Product Excellence', value: 92 },
  { name: 'Leadership Essentials', value: 87 },
  { name: 'Tech Fundamentals', value: 76 },
  { name: 'Sales Mastery', value: 71 },
];

export const SKILL_GAPS = [
  { skill: 'Negotiation', value: 52 },
  { skill: 'Objection handling', value: 58 },
  { skill: 'Pricing conversations', value: 64 },
  { skill: 'Discovery', value: 81 },
];

// 12 weeks, completion % and active learners
export const PERFORMANCE = {
  weeks: ['Aug 25', 'Sep 1', 'Sep 8', 'Sep 15', 'Sep 22', 'Sep 29', 'Oct 6', 'Oct 13', 'Oct 20', 'Oct 27', 'Nov 3', 'Nov 10'],
  completion: [81, 82, 84, 83, 85, 86, 86, 88, 89, 90, 91, 92],
};

export const ACTIVITY = [
  { who: 'Ahmed Hassan', what: 'passed Discovery Check with 86%', when: '12 min ago' },
  { who: 'Layla Ibrahim', what: 'submitted Customer Success Onboarding for review', when: '2 days ago' },
  { who: 'Nour Kamal', what: 'reached Platinum IV', when: '1 hour ago' },
  { who: 'Field Ops North', what: 'took 1st in the weekly squad ladder', when: 'Yesterday' },
];

export const TOURNAMENT = { name: 'Q4 Sales Cup', when: '8 December', players: 64, rule: 'Top 4 advance to the final', pool: '6,000 SYN' };

// ── Builder ────────────────────────────────────────────────────────────────
export type ClauseKind = 'score' | 'completion' | 'battle' | 'placement' | 'attempts' | 'time' | 'cohort';
export interface Clause { id: string; kind: ClauseKind; value: number | string }

export const CLAUSES: Record<ClauseKind, { label: string; hint: string; unit?: string; min: number; max: number; def: number | string }> = {
  score: { label: 'Score', hint: 'Minimum score in the assessment', unit: '%', min: 0, max: 100, def: 80 },
  completion: { label: 'Completion', hint: 'How much of the course to finish', unit: '%', min: 10, max: 100, def: 100 },
  battle: { label: 'Battle result', hint: 'Duels to win', min: 1, max: 10, def: 1 },
  placement: { label: 'Placement', hint: 'Highest place that advances', min: 1, max: 32, def: 4 },
  attempts: { label: 'Attempts', hint: 'Stops grinding: tries allowed', min: 1, max: 5, def: 2 },
  time: { label: 'Time', hint: 'Days in a row of activity', min: 1, max: 30, def: 3 },
  cohort: { label: 'Cohort or role', hint: 'Who takes this stage', min: 0, max: 0, def: 'Field Sales' },
};

const ord = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);
export function clauseText(c: Clause): string {
  const v = c.value;
  switch (c.kind) {
    case 'score': return `Score ${v}% or higher`;
    case 'completion': return v === 100 ? 'Finish the whole course' : `Finish ${v}% of the course`;
    case 'battle': return `Win at least ${v} duel${v === 1 ? '' : 's'}`;
    case 'placement': return `Place ${ord(Number(v))} or better`;
    case 'attempts': return `In ${v} attempt${v === 1 ? '' : 's'} or fewer`;
    case 'time': return `Keep a ${v}-day streak`;
    case 'cohort': return `Only learners in ${v}`;
  }
}

export interface QItem {
  id: string;
  q: string;
  options: string[];
  correct: number;
  why: string;
  page: number;
  level: 'Easy' | 'Medium' | 'Hard';
  flag?: string; // AI is unsure — needs a human look
  edited?: boolean;
}

export interface BProduct { id: string; kind: ProductKind; name: string; meta: string; status: 'ready' | 'empty' | 'review' }
export interface BStage {
  id: string;
  type: StageType;
  name: string;
  products: BProduct[];
  gate: Clause[];
  settings: { time: string; difficulty: 'Fixed' | 'Adaptive'; retries: number; required: boolean };
  /** the pedestal the stage stands on in the world (slot_1 … slot_9, or slot_branch) */
  slot: string;
  // branch only
  routeIn?: string;
  exitTo?: string | null;
  branchFrom?: string;
}

export const BUILDER_JOURNEY = {
  name: 'Product Leadership Journey',
  audience: 'Product Managers · 64 learners',
};

export const BUILDER_STAGES: BStage[] = [
  {
    id: 'b1', slot: 'slot_1', type: 'learn', name: 'Product Strategy 101',
    products: [{ id: 'p1', kind: 'course', name: 'Product Strategy 101', meta: '6 lessons · 45 min', status: 'ready' }],
    gate: [{ id: 'c1', kind: 'completion', value: 100 }],
    settings: { time: 'No limit', difficulty: 'Fixed', retries: 0, required: true },
  },
  {
    id: 'b2', slot: 'slot_3', type: 'assess', name: 'Knowledge Check',
    products: [{ id: 'p2', kind: 'assessment', name: 'Knowledge Check', meta: 'No questions yet', status: 'empty' }],
    gate: [{ id: 'c2', kind: 'score', value: 80 }, { id: 'c3', kind: 'attempts', value: 2 }],
    settings: { time: '20 min', difficulty: 'Fixed', retries: 2, required: true },
  },
  {
    id: 'b3', slot: 'slot_6', type: 'compete', name: 'Strategy Arena',
    products: [{ id: 'p3', kind: 'arena', name: 'Strategy Arena', meta: 'Roadmap trade-offs under a budget', status: 'ready' }],
    gate: [{ id: 'c4', kind: 'battle', value: 1 }],
    settings: { time: '≈ 12 min', difficulty: 'Adaptive', retries: 3, required: true },
  },
  {
    id: 'b4', slot: 'slot_8', type: 'prove', name: 'Final Challenge',
    products: [{ id: 'p4', kind: 'tournament', name: 'Final Challenge Cup', meta: '3 rounds · one day', status: 'ready' }],
    gate: [],
    settings: { time: 'One day window', difficulty: 'Fixed', retries: 1, required: true },
  },
  {
    id: 'b5', slot: 'slot_branch', branchFrom: 'b4', type: 'branch', name: 'Remedial Path',
    products: [{ id: 'p5', kind: 'course', name: 'Strategy Refresher', meta: '3 lessons · 20 min', status: 'ready' }],
    gate: [],
    settings: { time: 'No limit', difficulty: 'Fixed', retries: 3, required: false },
    routeIn: 'Learners who do not advance in Final Challenge',
    exitTo: null,
  },
  {
    id: 'b6', slot: 'slot_9', type: 'reward', name: 'Leadership Certificate',
    products: [{ id: 'p6', kind: 'reward', name: 'Leadership Certificate', meta: 'Certificate · Strategist badge · 300 SYN', status: 'ready' }],
    gate: [],
    settings: { time: 'No limit', difficulty: 'Fixed', retries: 0, required: true },
  },
];

export const ARENAS = [
  { name: 'Fast Track', what: 'Endless runner: sort tasks by priority before they hit you', skill: 'Prioritisation' },
  { name: 'Leverage', what: 'Negotiation duels: trade concessions, keep the margin', skill: 'Negotiation' },
  { name: 'Strategy Arena', what: 'Roadmap trade-offs under a shrinking budget', skill: 'Strategy' },
  { name: 'Pitch Perfect', what: '60-second pitches, voted on by other players', skill: 'Communication' },
  { name: 'Council', what: 'Make the call, then defend it against a rival', skill: 'Decision making' },
  { name: 'Quick Draw', what: 'Rapid-fire recall against the clock', skill: 'Product knowledge' },
  { name: 'Deadlock', what: 'Break a stalled deal before time runs out', skill: 'Problem solving' },
  { name: 'Market Day', what: 'Read buyer signals in a busy marketplace', skill: 'Discovery' },
  { name: 'Gauntlet', what: 'Five rounds, rising difficulty, no second chances', skill: 'Resilience' },
  { name: 'Crossfire', what: 'Two buyers, opposite needs, one proposal', skill: 'Stakeholders' },
  { name: 'Blueprint', what: 'Assemble the right solution from the portfolio', skill: 'Solution design' },
  { name: 'Ladder', what: 'Climb a ranked ladder of scenario duels', skill: 'Mixed' },
];

export const LIBRARY: Record<ProductKind, { name: string; meta: string }[]> = {
  course: [
    { name: 'Product Strategy 101', meta: '6 lessons · 45 min' },
    { name: 'Roadmapping in Practice', meta: '5 lessons · 40 min' },
    { name: 'Strategy Refresher', meta: '3 lessons · 20 min' },
    { name: 'Stakeholder Mapping', meta: '4 lessons · 25 min' },
  ],
  assessment: [
    { name: 'Strategy Fundamentals Quiz', meta: '15 questions · 80% to pass' },
    { name: 'Roadmap Scenarios', meta: '10 questions · 75% to pass' },
  ],
  arena: ARENAS.map((a) => ({ name: a.name, meta: a.what })),
  tournament: [
    { name: 'Final Challenge Cup', meta: '3 rounds · top 4 advance' },
    { name: 'Q4 Sales Cup', meta: '8 December · 64 players' },
  ],
  live: [
    { name: 'Roadmap Review with Karim Adel', meta: '2 December · 14:00 · 20 seats' },
    { name: 'Strategy Office Hours', meta: 'Every Thursday · 30 min' },
  ],
  reward: [
    { name: 'Strategist badge', meta: 'Epic badge' },
    { name: 'Leadership Certificate', meta: 'Certificate · 300 SYN' },
  ],
};

export const DOCUMENTS = [
  { id: 'd1', name: 'Product Strategy Playbook.pdf', pages: 24, size: '3.8 MB', updated: 'Updated 3 days ago' },
  { id: 'd2', name: 'Q3 Roadmap Review.pptx', pages: 31, size: '12.4 MB', updated: 'Updated 2 weeks ago' },
  { id: 'd3', name: 'Prioritisation Guidelines.docx', pages: 9, size: '640 KB', updated: 'Updated last month' },
];

// What the AI drafts from "Product Strategy Playbook.pdf"
export const DRAFT_ITEMS: QItem[] = [
  { id: 'q1', page: 3, level: 'Easy', q: 'What does the playbook say a product strategy must define first?', options: ['The target customer and the problem to solve', 'The feature list for the next release', 'The pricing for each market', 'The team structure'], correct: 0, why: 'Page 3: “Start with who you serve and the problem you solve; everything else follows.”' },
  { id: 'q2', page: 5, level: 'Medium', q: 'Which signal best shows a strategy is working?', options: ['More features shipped per quarter', 'Customers reach the outcome they bought the product for', 'A longer roadmap', 'Fewer support tickets in one week'], correct: 1, why: 'Page 5 defines success as customer outcomes, not output.' },
  { id: 'q3', page: 7, level: 'Medium', q: 'Two requests compete for one sprint. What decides first, per the playbook?', options: ['Which stakeholder is more senior', 'Which request is older', 'Which one moves the strategic goal most for its cost', 'Which one is easier to build'], correct: 2, why: 'Page 7: “Rank by impact on the goal per unit of effort.”' },
  { id: 'q4', page: 8, level: 'Easy', q: 'How often should the strategy be reviewed?', options: ['Once a year', 'Every quarter, or when the market shifts', 'Only when a launch fails', 'Every sprint'], correct: 1, why: 'Page 8 sets a quarterly review, plus a review on any major market change.' },
  { id: 'q5', page: 11, level: 'Hard', q: 'A competitor cuts prices by 15%. What does the playbook advise first?', options: ['Match the price within a week', 'Ignore it', 'Check which customer segment is at risk and why they buy from us', 'Launch a new feature'], correct: 2, why: 'Page 11: understand the segment at risk before reacting on price.' },
  { id: 'q6', page: 13, level: 'Medium', q: 'What belongs in a one-page strategy?', options: ['Goal, customer, problem, bets and the metrics that prove them', 'Every planned feature', 'Team org chart', 'Last year’s results'], correct: 0, why: 'Page 13 lists the five parts of the one-pager.', flag: 'Two answers are close; check the wording' },
  { id: 'q7', page: 15, level: 'Easy', q: 'Who owns the product strategy?', options: ['The sales lead', 'The product manager, with leadership sign-off', 'The engineering lead', 'The whole company by vote'], correct: 1, why: 'Page 15: the PM owns it; leadership signs it off.' },
  { id: 'q8', page: 18, level: 'Hard', q: 'A bet misses its metric two quarters in a row. What next?', options: ['Double the budget', 'Stop or reshape the bet and record what was learned', 'Keep going without changes', 'Hide the metric'], correct: 1, why: 'Page 18: two misses trigger a stop-or-reshape decision.' },
  { id: 'q9', page: 20, level: 'Medium', q: 'What is the purpose of a “not doing” list?', options: ['To track bugs', 'To make trade-offs visible and protect focus', 'To list hiring needs', 'To plan holidays'], correct: 1, why: 'Page 20 explains the “not doing” list as a focus tool.', flag: 'Source page is a diagram; confirm the answer' },
  { id: 'q10', page: 22, level: 'Medium', q: 'How should a roadmap relate to the strategy?', options: ['It replaces the strategy', 'Each roadmap item traces back to a strategic bet', 'They are unrelated', 'The roadmap is written first'], correct: 1, why: 'Page 22: every roadmap item must trace to a bet.' },
];
