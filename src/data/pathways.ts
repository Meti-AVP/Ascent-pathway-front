/**
 * Mock content for PATHWAYS. Product vocabulary: a pathway is an ordered climb of stages; each
 * stage is a course, a battle (played in one of the arenas), an assessment or a cup. A stage is
 * opened by a gate and cleared by meeting its requirements; clearing pays its reward, and the
 * whole pathway pays a final reward. HOME's next-stage chip (data/home.ts) is Sales Mastery
 * stage 4 — keep the two in step.
 *
 * Rewards have one source of truth: each pathway's `rewards` list says which stage pays which
 * item. The final reward, the map's next milestone and each stage's `reward.item` line are all
 * derived from it (see `derive` at the bottom), so they cannot drift apart.
 */

export type StageKind = 'course' | 'battle' | 'assessment' | 'cup';
export type StageState = 'done' | 'current' | 'locked';
export type ArenaId = 'slice' | 'fast-track' | 'leverage' | 'blackout' | 'zero-day' | 'red-flag';
export type RequirementKind = 'duel' | 'score' | 'attempts' | 'lessons' | 'quiz' | 'cup' | 'flags';

export type Arena = { id: ArenaId; name: string; skill: string; no: number };

export const ARENAS: Record<ArenaId, Arena> = {
  slice: { id: 'slice', name: 'Slice', skill: 'Questioning', no: 4 },
  'fast-track': { id: 'fast-track', name: 'Fast Track', skill: 'Prioritisation', no: 7 },
  leverage: { id: 'leverage', name: 'Leverage', skill: 'Negotiation', no: 12 },
  blackout: { id: 'blackout', name: 'Blackout', skill: 'Composure', no: 19 },
  'zero-day': { id: 'zero-day', name: 'Zero Day', skill: 'Threat response', no: 23 },
  'red-flag': { id: 'red-flag', name: 'Red Flag', skill: 'Risk spotting', no: 26 },
};

export type Requirement = {
  kind: RequirementKind;
  /** the line, split around the number that matters so the card can light it */
  text: [string, string, string];
  done: number;
  goal: number;
  /** a ceiling rather than a target (attempts): met while done ≤ goal */
  limit?: boolean;
};

/** what clearing a stage pays; `item` is derived from the pathway's rewards list */
export type Reward = { syn: number; sr?: number; item?: string };

export type Stage = {
  title: string;
  kind: StageKind;
  arena?: ArenaId;
  skill: string;
  state: StageState;
  /** best score in %, once played */
  score?: number;
  /** a cup is placed, not scored */
  place?: string;
  attempts: { used: number; max: number };
  /**
   * the gate that opens this stage: the previous stage's key requirement, short enough to sit on
   * one line of a locked panel's strip ("Score 80+ in stage 4", "Win 1 duel in Leverage")
   */
  gate: string;
  /** one line of what the stage is */
  brief: string;
  requirements: [Requirement, Requirement, Requirement];
  reward: Reward;
};

/* ── rewards ─────────────────────────────────────────────────────────────────────────────── */

export type RewardKind = 'card' | 'badge' | 'title' | 'banner';
export type Rarity = 'Rare' | 'Epic' | 'Legendary';
/** where a reward stands for the learner: earned, the next one on the way, or further up */
export type RewardState = 'claimed' | 'next' | 'locked';

export type RewardItem = {
  /** 1-based: clearing this stage pays the item */
  stage: number;
  kind: RewardKind;
  name: string;
  rarity: Rarity;
  /** card: the cast painting it shows — a cast key, see `castArt` */
  art?: string;
  /** card: how the painting is framed on the card (INSPECT always shows the figure) */
  crop?: 'figure' | 'bust';
  /** badge / banner: which drawn emblem it carries */
  emblem?: 'slice' | 'trophy' | 'shield-bolt' | 'speech-check' | 'summit' | 'sentinel';
  /** card: its number in the pathway's set, e.g. '05 / 09' */
  serial?: string;
  /** the pathway's final reward ("complete all to get") */
  final?: true;
};

export const REWARD_KIND_LABEL: Record<RewardKind, string> = {
  card: 'Gallery card',
  badge: 'Badge',
  title: 'Title',
  banner: 'Cup banner',
};

export type Pathway = {
  id: 'sales' | 'cyber' | 'leadership';
  name: string;
  assignedBy: string;
  team: string;
  /** due in this many ms from the moment the page opens — a mockup has no clock to agree with */
  dueIn: number;
  /** every item the pathway pays, in stage order; the last one is `final` */
  rewards: RewardItem[];
  /** derived from `rewards`: the final reward, as the map's hot band names it */
  finalReward: { name: string; kind: string; rarity: Rarity };
  /** derived from `rewards`: the next item on the way, unless that is the final reward */
  milestone?: { at: number; name: string; kind: string; serial?: string };
  stages: Stage[];
};

const D = 86_400_000;
const H = 3_600_000;
const M = 60_000;

const req = (kind: RequirementKind, a: string, n: string, b: string, done: number, goal: number, limit?: boolean): Requirement => ({
  kind,
  text: [a, n, b],
  done,
  goal,
  limit,
});

type StageSeed = Omit<Stage, 'reward'> & { reward: { syn: number; sr?: number } };
type PathwaySeed = Omit<Pathway, 'finalReward' | 'milestone' | 'stages'> & { stages: StageSeed[] };

const SEEDS: PathwaySeed[] = [
  {
    id: 'sales',
    name: 'Sales Mastery',
    assignedBy: 'Coach Mona',
    team: 'Field Ops North',
    dueIn: 12 * D + 6 * H + 41 * M + 15_000,
    rewards: [
      { stage: 2, kind: 'card', name: 'Read the Room', rarity: 'Rare', art: 'clinician', crop: 'bust', serial: '02 / 09' },
      { stage: 3, kind: 'badge', name: 'Sharp Questions', rarity: 'Rare', emblem: 'slice' },
      { stage: 5, kind: 'card', name: 'The Closer', rarity: 'Epic', art: 'strategist', crop: 'figure', serial: '05 / 09' },
      { stage: 7, kind: 'title', name: 'Cool Under Fire', rarity: 'Epic' },
      { stage: 8, kind: 'banner', name: 'Team Cup Qualifier', rarity: 'Epic', emblem: 'trophy' },
      { stage: 9, kind: 'badge', name: 'Sales Master', rarity: 'Legendary', emblem: 'summit', final: true },
    ],
    stages: [
      {
        title: 'Know Your Product',
        kind: 'course',
        skill: 'Product knowledge',
        state: 'done',
        score: 92,
        attempts: { used: 1, max: 3 },
        gate: 'Start here',
        brief: 'Six short lessons on the range, the pricing tiers and the demo.',
        requirements: [
          req('lessons', 'Finish all ', '6', ' lessons', 6, 6),
          req('quiz', 'Score ', '70+', ' on the product quiz', 92, 70),
          req('attempts', 'Use at most ', '3', ' attempts', 1, 3, true),
        ],
        reward: { syn: 60, sr: 8 },
      },
      {
        title: 'Reading the Buyer',
        kind: 'course',
        skill: 'Customer insight',
        state: 'done',
        score: 88,
        attempts: { used: 1, max: 3 },
        gate: 'Complete the course',
        brief: 'Buyer types, buying signals and the questions each one answers.',
        requirements: [
          req('lessons', 'Finish all ', '5', ' lessons', 5, 5),
          req('quiz', 'Score ', '70+', ' on the buyer quiz', 88, 70),
          req('attempts', 'Use at most ', '3', ' attempts', 1, 3, true),
        ],
        reward: { syn: 60, sr: 8 },
      },
      {
        title: 'Discovery Questions',
        kind: 'battle',
        arena: 'slice',
        skill: 'Questioning',
        state: 'done',
        score: 81,
        attempts: { used: 2, max: 3 },
        gate: 'Score 70+ in stage 2',
        brief: 'Ask your way to the real need before the other side does.',
        requirements: [
          req('duel', 'Win ', '1', ' duel in Slice', 1, 1),
          req('score', 'Score ', '75+', ' on the stage', 81, 75),
          req('attempts', 'Use at most ', '3', ' attempts', 2, 3, true),
        ],
        reward: { syn: 120, sr: 18 },
      },
      {
        title: 'Objection Handling',
        kind: 'battle',
        arena: 'fast-track',
        skill: 'Prioritisation',
        state: 'current',
        score: 72,
        attempts: { used: 1, max: 2 },
        gate: 'Win 1 duel in Slice',
        brief: 'Field the hardest objections first, under the clock.',
        requirements: [
          req('duel', 'Win ', '1', ' duel in Fast Track', 0, 1),
          req('score', 'Score ', '80+', ' on the stage', 72, 80),
          req('attempts', 'Use at most ', '2', ' attempts', 1, 2, true),
        ],
        reward: { syn: 120, sr: 18 },
      },
      {
        title: 'Pricing and Value',
        kind: 'assessment',
        skill: 'Value framing',
        state: 'locked',
        attempts: { used: 0, max: 2 },
        gate: 'Score 80+ in stage 4',
        brief: 'Twenty questions on price, value and the cost of doing nothing.',
        requirements: [
          req('quiz', 'Answer all ', '20', ' questions', 0, 20),
          req('score', 'Score ', '75+', ' on the assessment', 0, 75),
          req('attempts', 'Use at most ', '2', ' attempts', 0, 2, true),
        ],
        reward: { syn: 90, sr: 12 },
      },
      {
        title: 'Negotiation',
        kind: 'battle',
        arena: 'leverage',
        skill: 'Negotiation',
        state: 'locked',
        attempts: { used: 0, max: 3 },
        gate: 'Score 75+ in stage 5',
        brief: 'Trade, never give: hold the line on value.',
        requirements: [
          req('duel', 'Win ', '1', ' duel in Leverage', 0, 1),
          req('score', 'Score ', '80+', ' on the stage', 0, 80),
          req('attempts', 'Use at most ', '3', ' attempts', 0, 3, true),
        ],
        reward: { syn: 120, sr: 18 },
      },
      {
        title: 'Closing Under Pressure',
        kind: 'battle',
        arena: 'blackout',
        skill: 'Composure',
        state: 'locked',
        attempts: { used: 0, max: 3 },
        gate: 'Win 1 duel in Leverage',
        brief: 'Close with the lights out and the clock running.',
        requirements: [
          req('duel', 'Win ', '2', ' duels in Blackout', 0, 2),
          req('score', 'Score ', '80+', ' on the stage', 0, 80),
          req('attempts', 'Use at most ', '3', ' attempts', 0, 3, true),
        ],
        reward: { syn: 140, sr: 22 },
      },
      {
        title: 'Team Cup Qualifier',
        kind: 'cup',
        skill: 'Live selling',
        state: 'locked',
        attempts: { used: 0, max: 1 },
        gate: 'Win 2 duels in Blackout',
        brief: 'Sixteen learners, one bracket, four places in the final.',
        requirements: [
          req('cup', 'Finish ', 'top 4', ' in the cup', 0, 1),
          req('duel', 'Win ', '3', ' bracket duels', 0, 3),
          req('attempts', 'Play ', '1', ' entry', 0, 1, true),
        ],
        reward: { syn: 200, sr: 30 },
      },
      {
        title: 'Mastery Summit',
        kind: 'assessment',
        skill: 'End-to-end sales',
        state: 'locked',
        attempts: { used: 0, max: 1 },
        gate: 'Top 4 in the cup',
        brief: 'The final review, marked by your coach.',
        requirements: [
          req('quiz', 'Answer all ', '30', ' questions', 0, 30),
          req('score', 'Score ', '85+', ' on the summit', 0, 85),
          req('attempts', 'Use at most ', '1', ' attempt', 0, 1, true),
        ],
        reward: { syn: 250, sr: 40 },
      },
    ],
  },
  {
    id: 'cyber',
    name: 'Cyber Safety',
    assignedBy: 'Coach Mona',
    team: 'Field Ops North',
    dueIn: 4 * D + 19 * H + 8 * M + 42_000,
    rewards: [
      { stage: 3, kind: 'card', name: 'Zero Day', rarity: 'Epic', art: 'analyst', crop: 'figure', serial: '03 / 07' },
      { stage: 4, kind: 'badge', name: 'First Responder', rarity: 'Rare', emblem: 'shield-bolt' },
      { stage: 5, kind: 'title', name: 'Breach Breaker', rarity: 'Epic' },
      { stage: 6, kind: 'banner', name: 'Red Team Cup', rarity: 'Epic', emblem: 'trophy' },
      { stage: 7, kind: 'badge', name: 'Cyber Sentinel', rarity: 'Epic', emblem: 'sentinel', final: true },
    ],
    stages: [
      {
        title: 'Threat Basics',
        kind: 'course',
        skill: 'Threat awareness',
        state: 'done',
        score: 95,
        attempts: { used: 1, max: 3 },
        gate: 'Start here',
        brief: 'What attackers want, and the five ways they usually get in.',
        requirements: [
          req('lessons', 'Finish all ', '4', ' lessons', 4, 4),
          req('quiz', 'Score ', '70+', ' on the quiz', 95, 70),
          req('attempts', 'Use at most ', '3', ' attempts', 1, 3, true),
        ],
        reward: { syn: 60, sr: 8 },
      },
      {
        title: 'Spot the Phish',
        kind: 'battle',
        arena: 'red-flag',
        skill: 'Risk spotting',
        state: 'current',
        score: 64,
        attempts: { used: 1, max: 3 },
        gate: 'Complete the course',
        brief: 'Flag the fakes in a live inbox before your rival does.',
        requirements: [
          req('duel', 'Win ', '1', ' duel in Red Flag', 0, 1),
          req('flags', 'Flag ', '8', ' phishing mails', 6, 8),
          req('score', 'Score ', '75+', ' on the stage', 64, 75),
        ],
        reward: { syn: 120, sr: 18 },
      },
      {
        title: 'Safe Passwords',
        kind: 'course',
        skill: 'Account hygiene',
        state: 'locked',
        attempts: { used: 0, max: 3 },
        gate: 'Win 1 duel in Red Flag',
        brief: 'Passphrases, managers and the second factor.',
        requirements: [
          req('lessons', 'Finish all ', '3', ' lessons', 0, 3),
          req('quiz', 'Score ', '70+', ' on the quiz', 0, 70),
          req('attempts', 'Use at most ', '3', ' attempts', 0, 3, true),
        ],
        reward: { syn: 60, sr: 8 },
      },
      {
        title: 'Incident Response',
        kind: 'assessment',
        skill: 'Escalation',
        state: 'locked',
        attempts: { used: 0, max: 2 },
        gate: 'Complete the course',
        brief: 'Who to call, in what order, in the first ten minutes.',
        requirements: [
          req('quiz', 'Answer all ', '15', ' questions', 0, 15),
          req('score', 'Score ', '80+', ' on the assessment', 0, 80),
          req('attempts', 'Use at most ', '2', ' attempts', 0, 2, true),
        ],
        reward: { syn: 90, sr: 12 },
      },
      {
        title: 'Zero Day Drill',
        kind: 'battle',
        arena: 'zero-day',
        skill: 'Threat response',
        state: 'locked',
        attempts: { used: 0, max: 3 },
        gate: 'Score 80+ in stage 4',
        brief: 'Contain a live breach, played as an FPS.',
        requirements: [
          req('duel', 'Win ', '1', ' duel in Zero Day', 0, 1),
          req('score', 'Score ', '80+', ' on the stage', 0, 80),
          req('attempts', 'Use at most ', '3', ' attempts', 0, 3, true),
        ],
        reward: { syn: 140, sr: 22 },
      },
      {
        title: 'Red Team Cup',
        kind: 'cup',
        skill: 'Attack and defence',
        state: 'locked',
        attempts: { used: 0, max: 1 },
        gate: 'Win 1 duel in Zero Day',
        brief: 'Eight squads, one bracket, attack and defend.',
        requirements: [
          req('cup', 'Finish ', 'top 4', ' in the cup', 0, 1),
          req('duel', 'Win ', '2', ' bracket duels', 0, 2),
          req('attempts', 'Play ', '1', ' entry', 0, 1, true),
        ],
        reward: { syn: 200, sr: 30 },
      },
      {
        title: 'Sentinel Exam',
        kind: 'assessment',
        skill: 'End-to-end security',
        state: 'locked',
        attempts: { used: 0, max: 1 },
        gate: 'Top 4 in the cup',
        brief: 'The certification paper.',
        requirements: [
          req('quiz', 'Answer all ', '25', ' questions', 0, 25),
          req('score', 'Score ', '85+', ' on the exam', 0, 85),
          req('attempts', 'Use at most ', '1', ' attempt', 0, 1, true),
        ],
        reward: { syn: 220, sr: 36 },
      },
    ],
  },
  {
    id: 'leadership',
    name: 'Leadership Foundations',
    assignedBy: 'Coach Mona',
    team: 'Field Ops North',
    dueIn: 0,
    rewards: [
      { stage: 2, kind: 'badge', name: 'Good Coach', rarity: 'Rare', emblem: 'speech-check' },
      { stage: 3, kind: 'card', name: 'Straight Talk', rarity: 'Epic', art: 'clinician', crop: 'figure', serial: '03 / 06' },
      { stage: 4, kind: 'card', name: 'Hand It On', rarity: 'Rare', art: 'strategist', crop: 'bust', serial: '04 / 06' },
      { stage: 6, kind: 'title', name: 'Captain', rarity: 'Legendary', final: true },
    ],
    stages: [
      {
        title: 'Leading Yourself',
        kind: 'course',
        skill: 'Self-management',
        state: 'done',
        score: 94,
        attempts: { used: 1, max: 3 },
        gate: 'Start here',
        brief: 'Energy, focus and the week you plan on Monday.',
        requirements: [
          req('lessons', 'Finish all ', '5', ' lessons', 5, 5),
          req('quiz', 'Score ', '70+', ' on the quiz', 94, 70),
          req('attempts', 'Use at most ', '3', ' attempts', 1, 3, true),
        ],
        reward: { syn: 60, sr: 8 },
      },
      {
        title: 'Coaching Talks',
        kind: 'course',
        skill: 'Coaching',
        state: 'done',
        score: 90,
        attempts: { used: 1, max: 3 },
        gate: 'Complete the course',
        brief: 'Ask, listen, agree the next step.',
        requirements: [
          req('lessons', 'Finish all ', '4', ' lessons', 4, 4),
          req('quiz', 'Score ', '70+', ' on the quiz', 90, 70),
          req('attempts', 'Use at most ', '3', ' attempts', 1, 3, true),
        ],
        reward: { syn: 60, sr: 8 },
      },
      {
        title: 'Giving Feedback',
        kind: 'battle',
        arena: 'slice',
        skill: 'Candour',
        state: 'done',
        score: 86,
        attempts: { used: 2, max: 3 },
        gate: 'Score 70+ in stage 2',
        brief: 'Say the hard thing kindly, in under a minute.',
        requirements: [
          req('duel', 'Win ', '1', ' duel in Slice', 1, 1),
          req('score', 'Score ', '75+', ' on the stage', 86, 75),
          req('attempts', 'Use at most ', '3', ' attempts', 2, 3, true),
        ],
        reward: { syn: 120, sr: 18 },
      },
      {
        title: 'Delegation',
        kind: 'battle',
        arena: 'fast-track',
        skill: 'Prioritisation',
        state: 'done',
        score: 83,
        attempts: { used: 1, max: 3 },
        gate: 'Win 1 duel in Slice',
        brief: 'Hand off the right work to the right person.',
        requirements: [
          req('duel', 'Win ', '1', ' duel in Fast Track', 1, 1),
          req('score', 'Score ', '80+', ' on the stage', 83, 80),
          req('attempts', 'Use at most ', '3', ' attempts', 1, 3, true),
        ],
        reward: { syn: 120, sr: 18 },
      },
      {
        title: 'Leadership Check',
        kind: 'assessment',
        skill: 'Judgement',
        state: 'done',
        score: 91,
        attempts: { used: 1, max: 2 },
        gate: 'Score 80+ in stage 4',
        brief: 'Twelve scenarios, marked by your coach.',
        requirements: [
          req('quiz', 'Answer all ', '12', ' scenarios', 12, 12),
          req('score', 'Score ', '80+', ' on the check', 91, 80),
          req('attempts', 'Use at most ', '2', ' attempts', 1, 2, true),
        ],
        reward: { syn: 90, sr: 12 },
      },
      {
        title: "Captains' Cup",
        kind: 'cup',
        skill: 'Leading under fire',
        state: 'done',
        place: '2nd',
        attempts: { used: 1, max: 1 },
        gate: 'Score 80+ in stage 5',
        brief: 'Squad captains, one bracket.',
        requirements: [
          req('cup', 'Finish ', 'top 4', ' in the cup', 1, 1),
          req('duel', 'Win ', '3', ' bracket duels', 3, 3),
          req('attempts', 'Play ', '1', ' entry', 1, 1, true),
        ],
        reward: { syn: 200, sr: 30 },
      },
    ],
  },
];

export const KIND_LABEL: Record<StageKind, string> = {
  course: 'Course',
  battle: 'Battle',
  assessment: 'Assessment',
  cup: 'Cup',
};

export function cleared(p: Pathway) {
  return p.stages.filter((s) => s.state === 'done').length;
}

export function currentIndex(p: Pathway) {
  return p.stages.findIndex((s) => s.state === 'current');
}

export function requirementMet(r: Requirement) {
  return r.limit ? r.done <= r.goal && r.done > 0 : r.done >= r.goal;
}

/* ── reward helpers: every screen asks these instead of keeping its own copy ─────────────── */

/** the first reward the learner has not earned yet (the map's "complete n more to get") */
export function nextReward(p: Pathway): RewardItem | undefined {
  return p.rewards.find((r) => p.stages[r.stage - 1]?.state !== 'done');
}

/** the pathway's final reward */
export function finalRewardItem(p: Pathway): RewardItem {
  const fin = p.rewards.find((r) => r.final) ?? p.rewards[p.rewards.length - 1];
  if (!fin) throw new Error(`${p.name} pays no rewards`);
  return fin;
}

/** the item a stage pays, if it pays one (1-based stage number) */
export function rewardForStage(p: Pathway, stageNo: number): RewardItem | undefined {
  return p.rewards.find((r) => r.stage === stageNo);
}

export function rewardState(p: Pathway, r: RewardItem): RewardState {
  if (p.stages[r.stage - 1]?.state === 'done') return 'claimed';
  return nextReward(p) === r ? 'next' : 'locked';
}

/** a cast painting: the full adapted painting ('after') or the 192 px face crop ('face') */
export function castArt(key: string, variant: 'after' | 'face' = 'after') {
  return `/img/cast/${key}-${variant}.webp`;
}

/**
 * What meeting one requirement pays, as its card shows it: the first two requirements split the
 * stage's SYN, the third pays its SR. The three add up to the stage's own reward.
 */
export function requirementPay(stage: Stage, i: number): { syn?: number; sr?: number } {
  const first = Math.round(stage.reward.syn / 20) * 10;
  if (i === 0) return { syn: first };
  if (i === 1) return { syn: stage.reward.syn - first };
  return stage.reward.sr ? { sr: stage.reward.sr } : {};
}

/** SYN and SR paid so far by cleared stages, against what the whole pathway pays */
export function payTotals(p: Pathway) {
  let syn = 0;
  let sr = 0;
  let allSyn = 0;
  let allSr = 0;
  for (const s of p.stages) {
    allSyn += s.reward.syn;
    allSr += s.reward.sr ?? 0;
    if (s.state === 'done') {
      syn += s.reward.syn;
      sr += s.reward.sr ?? 0;
    }
  }
  return { syn, sr, allSyn, allSr };
}

function derive(seed: PathwaySeed): Pathway {
  const stages: Stage[] = seed.stages.map((s, i) => {
    const item = seed.rewards.find((r) => r.stage === i + 1);
    return { ...s, reward: item ? { ...s.reward, item: `${REWARD_KIND_LABEL[item.kind]}: ${item.name}` } : { ...s.reward } };
  });
  const p: Pathway = {
    ...seed,
    stages,
    finalReward: { name: '', kind: '', rarity: 'Rare' },
  };
  const fin = finalRewardItem(p);
  p.finalReward = { name: fin.name, kind: REWARD_KIND_LABEL[fin.kind], rarity: fin.rarity };
  const next = nextReward(p);
  p.milestone = next && !next.final ? { at: next.stage, name: next.name, kind: REWARD_KIND_LABEL[next.kind], serial: next.serial } : undefined;
  return p;
}

export const PATHWAYS: Pathway[] = SEEDS.map(derive);
