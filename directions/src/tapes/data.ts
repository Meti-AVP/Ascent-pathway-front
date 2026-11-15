// Mock data for the Tapes direction — the shared ASCENT story (docs/FLOW.md), told as VHS tapes.

export type StageType = 'learn' | 'assess' | 'compete' | 'prove' | 'branch' | 'reward';
export type StageStatus = 'done' | 'current' | 'locked' | 'draft';
export type Cast = 'analyst' | 'clinician' | 'strategist';

export const TYPE_LABEL: Record<StageType, string> = {
  learn: 'Learn',
  assess: 'Assess',
  compete: 'Compete',
  prove: 'Prove',
  branch: 'Branch',
  reward: 'Reward',
};

/** One plain line per stage type, used wherever an admin picks or reads a type. */
export const TYPE_ABOUT: Record<StageType, string> = {
  learn: 'A course or a live session to study',
  assess: 'A quiz that checks what they know',
  compete: 'A battle arena game against other learners',
  prove: 'A final test or a tournament',
  branch: 'Routes learners by score, role or cohort',
  reward: 'A badge, certificate or SYN payout',
};

/** What the cover artwork needs (drawn on canvas, shared by the DOM covers and the 3D shelf). */
export type CoverArt = {
  lines?: string[]; // stacked title words for the paper covers
  big?: string; // the big motif: pass mark, arena name
  cast?: Cast;
  /** realistic cover photography (public/tapes/cast): a poster behind the title, or a portrait in the photo panel */
  photo?: { src: string; mode: 'poster' | 'panel' };
  tagline: string;
  credits: string;
  product: string; // short product line printed on the cover
};

export type Stage = {
  n: number;
  id: string;
  title: string;
  type: StageType;
  productKind: string;
  product: string;
  minutes: number;
  synopsis: string;
  gate: { clause: string; text: string };
  progress?: string; // what has happened on the current stage
  lockNote?: string; // locked stages: how to unlock, in plain words
  reward: string;
  status: StageStatus;
  date: string; // the day the tape was played (OSD date)
  result?: string;
  art: CoverArt;
};

export const learner = {
  name: 'Ahmed Hassan',
  short: 'Ahmed H.',
  role: 'Field Sales',
  org: 'Northwind Pharma',
  squad: 'Field Ops North',
  squadRank: 3,
  squadSize: 14,
  sr: 1612,
  tier: 'Gold II',
  nextTier: 'Gold I',
  toNext: 88,
  tierFloor: 1600,
  tierCeil: 1700,
  level: 24,
  xp: 620,
  xpNext: 1000,
  syn: 2480,
  shards: 36,
  streak: 6,
  multiplier: 1.5,
  quests: [
    { key: 'Daily', done: 2, total: 6, next: 'Win a duel in Fast Track', reward: '+40 SYN', resets: 'Resets in 9h' },
    { key: 'Weekly', done: 3, total: 8, next: 'Clear two assessments at 80%+', reward: '+150 XP', resets: 'Resets Mon' },
    { key: 'Season', done: 5, total: 12, next: 'Reach Gold I before the Q4 Cup', reward: 'Season banner', resets: '46 days left' },
  ],
  rival: { name: 'Omar H.', you: 3, them: 2, last: ['W', 'L', 'W', 'W', 'L'] as const, sr: 1648, tier: 'Gold II' },
  squadTable: [
    { rank: 1, name: 'Layla K.', pts: 3240 },
    { rank: 2, name: 'Omar H.', pts: 2960 },
    { rank: 3, name: 'Ahmed H.', pts: 2830, you: true },
    { rank: 4, name: 'Yusuf R.', pts: 2615 },
  ],
  badges: [
    { name: 'Discovery Ace', rarity: 'Rare', note: '86% on the first try', date: 'NOV 10', shape: 'round' },
    { name: 'Squad Top 3', rarity: 'Epic', note: 'Field Ops North', date: 'NOV 12', shape: 'burst' },
    { name: 'Buyer Reader', rarity: 'Uncommon', note: 'Reading the Buyer', date: 'NOV 03', shape: 'tag' },
    { name: 'First Run', rarity: 'Common', note: 'Fast Track', date: 'NOV 14', shape: 'oval' },
  ] as const,
  badgeCount: 18,
};

export const pathway = { name: 'Sales Mastery', tapes: 9, current: 4, done: 3 };

export const stages: Stage[] = [
  {
    n: 1,
    id: 'sm-1',
    title: 'Know Your Product',
    type: 'learn',
    productKind: 'Course',
    product: 'Northwind Portfolio Essentials',
    minutes: 42,
    synopsis:
      'Six short modules on the Northwind portfolio: what each product treats, who it is for, the evidence behind it, and the claims you are allowed to make in the field.',
    gate: { clause: 'course.progress = 100%', text: 'Finish all six modules to unlock Reading the Buyer.' },
    reward: '+80 XP · +40 SYN',
    status: 'done',
    date: 'OCT 28',
    result: '100%',
    art: {
      lines: ['Know', 'Your', 'Product'],
      tagline: 'Every molecule. Every claim. Six modules.',
      credits: 'Northwind Pharma presents an Ascent pathway · Sales Mastery · Tape one · Course: Northwind Portfolio Essentials · six modules · 42 minutes',
      product: 'Course · 6 modules',
    },
  },
  {
    n: 2,
    id: 'sm-2',
    title: 'Reading the Buyer',
    type: 'learn',
    productKind: 'Course + Live Session',
    product: 'Buyer Personas in Primary Care · Live: Ask a Key Account Manager',
    minutes: 55,
    synopsis:
      'How GPs, cardiologists and hospital pharmacists really decide. Personas, buying signals and the questions that open a real conversation, then a live Q&A with a key account manager.',
    gate: { clause: 'course.progress = 100%', text: 'Finish the course and the live session to unlock Discovery Check.' },
    reward: '+80 XP · +40 SYN · Buyer Reader badge',
    status: 'done',
    date: 'NOV 03',
    result: '100%',
    art: {
      lines: ['Reading', 'the', 'Buyer'],
      cast: 'clinician',
      tagline: 'He has nine minutes between patients.',
      credits: 'Northwind Pharma presents an Ascent pathway · Sales Mastery · Tape two · Course and live session · buyer personas in primary care · 55 minutes',
      product: 'Course + Live Session',
    },
  },
  {
    n: 3,
    id: 'sm-3',
    title: 'Discovery Check',
    type: 'assess',
    productKind: 'Assessment',
    product: 'Discovery Check · 20 items',
    minutes: 20,
    synopsis:
      'Twenty questions on discovery: which question to ask first, how to read a hesitation, when to stop pitching and listen. Two attempts, best score counts.',
    gate: { clause: 'quiz.score >= 80  ·  attempts <= 2', text: 'Score 80% or higher in the assessment to unlock the next stage.' },
    reward: '+150 XP · +60 SYN · Discovery Ace badge',
    status: 'done',
    date: 'NOV 10',
    result: '86%',
    art: {
      big: '80',
      tagline: 'Twenty questions. Two attempts.',
      credits: 'Ascent assessment engine · Discovery Check · 20 items · fixed difficulty · pass mark 80 percent · two attempts · Sales Mastery tape three',
      product: 'Assessment · 20 items',
    },
  },
  {
    n: 4,
    id: 'sm-4',
    title: 'Objection Handling',
    type: 'compete',
    productKind: 'Battle Arena',
    product: 'Fast Track',
    minutes: 25,
    synopsis:
      'Objections come at you at speed. Fast Track is an endless runner where every lane is a customer objection: pick the right response, keep the run alive and outlast your opponent.',
    gate: { clause: 'duels.wins >= 1', text: 'Win one duel in Fast Track to unlock Pricing & Value.' },
    progress: '0 of 1 wins · 2 runs · best run 8,420',
    reward: '+120 XP · +60 SYN',
    status: 'current',
    date: 'NOV 15',
    art: {
      big: 'Fast Track',
      photo: { src: '/tapes/cast/survivor-a-portrait.webp', mode: 'poster' },
      tagline: 'Every lane is an objection.',
      credits: 'Ascent battle arenas present · Fast Track · an endless runner for prioritisation · duel format best of three · Sales Mastery tape four',
      product: 'Battle Arena',
    },
  },
  {
    n: 5,
    id: 'sm-5',
    lockNote: 'Unlocks when you clear stage 4: win one duel in Fast Track.',
    title: 'Pricing & Value',
    type: 'assess',
    productKind: 'Assessment',
    product: 'Pricing & Value · 24 items, adaptive',
    minutes: 25,
    synopsis:
      'An adaptive assessment on value stories, tender pricing and discount discipline. It gets harder as you get it right. Your best score decides your route at the Recovery Path.',
    gate: { clause: 'attempts <= 2', text: 'Take the assessment, two attempts. A best score under 70% routes you through the Recovery Path.' },
    reward: '+150 XP · +60 SYN',
    status: 'locked',
    date: '',
    art: {
      big: '70',
      tagline: 'It gets harder as you get it right.',
      credits: 'Ascent assessment engine · Pricing and Value · 24 items · adaptive difficulty · routes below 70 percent · Sales Mastery tape five',
      product: 'Assessment · adaptive',
    },
  },
  {
    n: 6,
    id: 'sm-6',
    lockNote: 'Unlocks when you finish stage 5, Pricing & Value.',
    title: 'Negotiation Lab',
    type: 'compete',
    productKind: 'Battle Arena',
    product: 'Leverage',
    minutes: 30,
    synopsis:
      'Leverage puts you across the table from a hospital procurement lead. Trade, concede and anchor in timed rounds; the arena scores the deal you leave on the table.',
    gate: { clause: 'duels.wins >= 2', text: 'Win two duels in the Leverage arena.' },
    reward: '+120 XP · +80 SYN',
    status: 'locked',
    date: '',
    art: {
      big: 'Leverage',
      cast: 'analyst',
      tagline: 'Every concession has a price.',
      credits: 'Ascent battle arenas present · Leverage · timed negotiation rounds · hospital tender scenarios · Sales Mastery tape six',
      product: 'Battle Arena',
    },
  },
  {
    n: 7,
    id: 'sm-7',
    lockNote: 'Only plays if your best Pricing & Value score is under 70%. Score 70% or more and you skip it.',
    title: 'Recovery Path',
    type: 'branch',
    productKind: 'Branch · remedial',
    product: 'Routes by Pricing & Value score',
    minutes: 35,
    synopsis:
      'The remedial tape. It only plays if your Pricing & Value score is under 70%: a short refresher and a retake. Three loops at most, then a coach sits down with you.',
    gate: { clause: 'IF pricing.score < 70  →  remedial  ·  loops <= 3', text: 'Score 70% or more in Pricing & Value and this tape is skipped.' },
    reward: 'Route back to the Q4 Sales Cup',
    status: 'locked',
    date: '',
    art: {
      tagline: 'Plays only if you need it.',
      credits: 'Ascent condition engine · branch on score · remedial loop capped at three · third loop routes to a coach checkpoint · Sales Mastery tape seven',
      product: 'Branch · remedial',
    },
  },
  {
    n: 8,
    id: 'sm-8',
    lockNote: 'Unlocks when you clear stage 6, Negotiation Lab. The cup runs December 8 to 12.',
    title: 'Q4 Sales Cup',
    type: 'prove',
    productKind: 'Tournament',
    product: 'Q4 Sales Cup · Dec 08–12',
    minutes: 90,
    synopsis:
      'The cup. Five days, 64 seats, Fast Track and Leverage rounds against the whole Northwind field force. Finish in the top four to prove it.',
    gate: { clause: 'cup.place <= 4', text: 'Finish in the top four of the Q4 Sales Cup.' },
    reward: '+400 XP · +250 SYN · 10 Q-Shards',
    status: 'locked',
    date: '',
    art: {
      tagline: 'Sixty-four seats. Four make it.',
      credits: 'Ascent tournaments present · the Q4 Sales Cup · December 8 to 12 · 64 seats · Swiss rounds then knockout · top four advance',
      product: 'Tournament · 64 seats',
    },
  },
  {
    n: 9,
    id: 'sm-9',
    lockNote: 'Unlocks when you finish in the top four of the Q4 Sales Cup.',
    title: 'Mastery Badge',
    type: 'reward',
    productKind: 'Reward Drop',
    product: 'Mastery Badge (Epic) · certificate · 500 SYN',
    minutes: 5,
    synopsis:
      'The payoff. The Sales Mastery badge, an Epic drop, your certificate signed by Northwind Pharma, and 500 SYN in your wallet.',
    gate: { clause: 'stage[8].complete', text: 'Unlocks the moment the Cup is cleared.' },
    reward: 'Epic badge · certificate · 500 SYN',
    status: 'locked',
    date: '',
    art: {
      tagline: 'The last tape plays itself.',
      credits: 'Ascent reward drops · Sales Mastery badge · Epic rarity · certificate of mastery · 500 SYN · Northwind Pharma',
      product: 'Reward Drop · Epic',
    },
  },
];

// ——— Admin ———

export const admin = {
  name: 'Sara Mansour',
  role: 'Org Admin',
  org: 'Northwind Pharma',
  kpis: [
    { key: 'active', label: 'Active learners', value: '1,248', unit: '', note: '+12% this month', trend: 'up' as const },
    { key: 'completion', label: 'Completion rate', value: '92', unit: '%', note: 'across live pathways' },
    { key: 'pathways', label: 'Active pathways', value: '48', unit: '', note: '6 published this quarter' },
    { key: 'mastery', label: 'Time to mastery', value: '31', unit: ' days', note: 'median, last 90 days' },
  ],
};

export type QueueItem = {
  id: string;
  title: string;
  kind: string;
  type: StageType;
  detail: string;
  author: string;
  authorRole: string;
  age: string;
  checks: string;
  flag?: string;
};

export const queue: QueueItem[] = [
  { id: 'q1', title: 'Objection Handling Quiz v2', kind: 'Assessment', type: 'assess', detail: '24 items · adaptive · pass 80%', author: 'Nour Saleh', authorRole: 'Author', age: '2h', checks: 'Lint clean · 24/24 items keyed' },
  { id: 'q2', title: 'Cardio Portfolio Refresh 2027', kind: 'Course', type: 'learn', detail: '8 modules · 1h 50m', author: 'Hana Ibrahim', authorRole: 'Author', age: '5h', checks: 'Lint clean', flag: '2 claims flagged for medical-legal wording' },
  { id: 'q3', title: 'Q4 Sales Cup — bracket rules', kind: 'Tournament', type: 'prove', detail: '64 seats · Swiss → top 8 · place ≤ 4', author: 'Tarek Fahmy', authorRole: 'Author', age: '1d', checks: 'Advancement rule set' },
  { id: 'q4', title: 'Hospital Tender Pack', kind: 'Battle Arena · Leverage', type: 'compete', detail: '40 scenarios · timed rounds', author: 'Karim Adel', authorRole: 'Author', age: '1d', checks: 'Lint clean' },
  { id: 'q5', title: 'Key Account Onboarding', kind: 'Journey', type: 'branch', detail: '7 stages · 1 remedial branch', author: 'Rania Fouad', authorRole: 'Org Admin', age: '2d', checks: 'Tracking OK · branch has exit' },
  { id: 'q6', title: 'Promotional Claims Basics', kind: 'Course', type: 'learn', detail: '4 modules · compliance', author: 'Hana Ibrahim', authorRole: 'Author', age: '2d', checks: 'Lint clean' },
  { id: 'q7', title: 'Mastery Badge drop', kind: 'Reward Drop', type: 'reward', detail: 'Epic badge · certificate · 500 SYN', author: 'Tarek Fahmy', authorRole: 'Author', age: '3d', checks: 'Budget within cap' },
];

export const topPathways = [
  { name: 'Product Excellence', pct: 92, learners: 412, stages: 8 },
  { name: 'Leadership Essentials', pct: 87, learners: 268, stages: 6 },
  { name: 'Tech Fundamentals', pct: 76, learners: 301, stages: 7 },
  { name: 'Sales Mastery', pct: 71, learners: 187, stages: 9 },
];

/** Weekly stage completions and average score, weeks 35–46. */
export const signal = {
  weeks: ['W35', 'W36', 'W37', 'W38', 'W39', 'W40', 'W41', 'W42', 'W43', 'W44', 'W45', 'W46'],
  completions: [612, 655, 701, 688, 745, 802, 784, 861, 912, 948, 1003, 1084],
  score: [71, 72, 72, 74, 73, 75, 76, 76, 78, 79, 79, 81],
};

export const skillGaps = [
  { name: 'Product knowledge', pct: 88 },
  { name: 'Discovery', pct: 81 },
  { name: 'Pricing & value', pct: 63 },
  { name: 'Negotiation', pct: 61 },
  { name: 'Objection handling', pct: 58 },
];

export const tournament = {
  name: 'Q4 Sales Cup',
  dates: 'DEC 08 – 12',
  start: '2026-12-08T09:00:00',
  seats: 64,
  registered: 52,
  arenas: 'Fast Track · Leverage',
  format: 'Swiss rounds → top 8 knockout',
  advance: 'Top 4 advance · place ≤ 4',
  prize: '1,000 SYN pool · 40 Q-Shards',
  rulesPending: true,
};

export const activity = [
  { t: '14:46', text: 'Layla K. won a Fast Track duel and cleared Objection Handling' },
  { t: '14:31', text: 'Nour Saleh submitted Objection Handling Quiz v2 for review' },
  { t: '14:12', text: 'Yusuf R. scored 64% in Pricing & Value → Recovery Path, loop 1 of 3' },
  { t: '13:58', text: 'Field Ops North moved up to 2nd in the squad league' },
  { t: '13:40', text: 'Mona A. earned the Product Excellence mastery badge' },
  { t: '13:22', text: 'Omar H. reached Gold II' },
  { t: '12:55', text: 'Rania Fouad published Key Account Onboarding v4' },
];

// ——— Builder: the journey being recorded ———

export type BuildStage = {
  id: string;
  type: StageType;
  title: string;
  product: string;
  productKind: string;
  gates: string[]; // clause labels stuck on the tape
  settings: {
    timeLimit: number; // minutes, 0 = none
    window: string;
    items: number; // 0 = n/a
    difficulty: 'fixed' | 'adaptive';
    retries: number;
    required: number; // % completion required
  };
  art: CoverArt;
};

export const buildJourney: { name: string; version: string; saved: string; stages: BuildStage[] } = {
  name: 'Product Leadership Journey',
  version: 'v3',
  saved: '14:48',
  stages: [
    {
      id: 'b1',
      type: 'learn',
      title: 'Product Strategy 101',
      product: 'Product Strategy 101',
      productKind: 'Course · 5 modules',
      gates: ['course.progress = 100%'],
      settings: { timeLimit: 0, window: 'Open', items: 0, difficulty: 'fixed', retries: 0, required: 100 },
      art: { lines: ['Product', 'Strategy', '101'], photo: { src: '/tapes/cast/survivor-b-portrait.webp', mode: 'panel' }, tagline: 'Strategy is what you say no to.', credits: 'Northwind Pharma presents an Ascent journey · Product Leadership · Tape one · Course: Product Strategy 101 · five modules', product: 'Course · 5 modules' },
    },
    {
      id: 'b2',
      type: 'assess',
      title: 'Knowledge Check',
      product: 'Knowledge Check',
      productKind: 'Assessment · 20 items',
      gates: ['quiz.score >= 80', 'attempts <= 2'],
      settings: { timeLimit: 25, window: 'Open', items: 20, difficulty: 'fixed', retries: 2, required: 100 },
      art: { big: '80', tagline: 'Twenty questions. Two attempts.', credits: 'Ascent assessment engine · Knowledge Check · 20 items · pass mark 80 percent · Product Leadership tape two', product: 'Assessment · 20 items' },
    },
    {
      id: 'b3',
      type: 'compete',
      title: 'Strategy Arena',
      product: 'Strategy Arena',
      productKind: 'Battle Arena',
      gates: ['duels.wins >= 1'],
      settings: { timeLimit: 15, window: 'Open', items: 0, difficulty: 'adaptive', retries: 3, required: 100 },
      art: { big: 'Strategy', cast: 'analyst', tagline: 'Read the board. Make the call.', credits: 'Ascent battle arenas present · Strategy Arena · duel format best of three · Product Leadership tape three', product: 'Battle Arena' },
    },
    {
      id: 'b4',
      type: 'prove',
      title: 'Final Challenge',
      product: 'Final Challenge',
      productKind: 'Final assessment · 30 items',
      gates: ['final.score >= 85', 'time <= 45 min'],
      settings: { timeLimit: 45, window: 'DEC 01 – DEC 19', items: 30, difficulty: 'adaptive', retries: 1, required: 100 },
      art: { tagline: 'Thirty questions. One sitting.', credits: 'Ascent assessment engine · Final Challenge · 30 items · adaptive · 45 minutes · Product Leadership tape four', product: 'Final assessment' },
    },
    {
      id: 'b5',
      type: 'branch',
      title: 'Remedial Path',
      product: 'Remedial Path',
      productKind: 'Branch · remedial',
      gates: ['final.score < 70', 'loops <= 3'],
      settings: { timeLimit: 0, window: 'Open', items: 0, difficulty: 'fixed', retries: 3, required: 100 },
      art: { tagline: 'Plays only if you need it.', credits: 'Ascent condition engine · branch on final score · remedial loop capped at three · Product Leadership tape five', product: 'Branch · remedial' },
    },
    {
      id: 'b6',
      type: 'reward',
      title: 'Leadership Certificate',
      product: 'Leadership Certificate',
      productKind: 'Reward Drop',
      gates: ['stage[4].complete'],
      settings: { timeLimit: 0, window: 'Open', items: 0, difficulty: 'fixed', retries: 0, required: 100 },
      art: { tagline: 'Signed, sealed, delivered.', credits: 'Ascent reward drops · Leadership Certificate · Epic badge · 300 SYN · Northwind Pharma', product: 'Reward Drop · certificate' },
    },
  ],
};

export const clauseTypes = ['Score', 'Completion', 'Battle result', 'Placement', 'Attempts', 'Time', 'Cohort / Role'] as const;
