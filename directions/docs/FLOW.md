# ASCENT — Pathway Builder · new design directions · shared brief

The manager wants several very different visual directions for the product. This app holds three
of them, each shown as **four pages: two for the learner and two for the admin**, all following the
product flow in the PRD exactly. It is a front-end mockup: no backend, realistic mock data.

- **Summit** (`summit.html`, `src/summit/`) — from three concept images (`public/summit/ref/ref-1.png`,
  `ref-2.png`, `ref-3.png`): a dark, glassy, cinematic product UI with painted fantasy key art.
- **Tapes** (`tapes.html`, `src/tapes/`) — in the spirit of https://www.31-for-31.com/ (an Awwwards
  nominee): the camcorder / VHS-tape experience translated to learning.
- **Ember** (`ember.html`, `src/ember/`) — from one concept image (`public/ember/ref/ref-1.png`),
  to be matched exactly in all its details: obsidian cliffs, stage pedestals on a glowing path of fire.

## Identity — fixed by the manager, applies to both

- **Main colours: black, white, silver.** Accents, each with one job: **burnt orange** (brand heat,
  the signature accent), **yellow** (the action you press / highlights), **green** (progress,
  success, done), **red** (alerts, live, locked/failed). No other hues — no teal, no purple, no blue.
- **No harsh edges**: soft, rounded corners everywhere; no hard, sharp-cornered boxes. Avoid thin
  outline borders on containers — separate surfaces with fill, depth, glow and shadow. (A hairline
  inner highlight on glass is acceptable in Summit.)
- **World-class, precise, professional.** Every number, label and state must make sense for this
  product. No lorem ipsum, no "Feature 1", no emoji except where the concept images use one.

## The product flow (from the PRD — follow it exactly)

**Roles.** Learner (plays, progresses, earns), Coach (team-scope read), Author (writes content),
Org Admin (builds journeys, approves, runs tournaments, scoped to one organization), Super Admin
(platform). The admin pages here are for the **Org Admin**.

**Journey / pathway.** An admin composes a *Journey* from ordered *Stages*. Each stage holds one or
more *products*: a Course, an Assessment, one of the 36 Battle Arenas, a Tournament, a Live Session,
or a Reward Drop. Stages come in **six types**:

| Stage type | What it is | Typical product |
| --- | --- | --- |
| **Learn** | study the material | Course, Live Session |
| **Assess** | prove knowledge | Assessment (quiz) |
| **Compete** | play it as a game | Battle Arena (e.g. *Fast Track*, an endless-runner for prioritisation) |
| **Prove** | high-stakes check | Final assessment or a Tournament (cup) |
| **Branch** | decision / remediation | routes learners by score, role or cohort; remedial path |
| **Reward** | payoff | Reward Drop: badge, certificate, SYN |

**Gates (the Condition Engine).** Every stage is guarded by conditions built from clause types:
Score (`quiz.score >= 80`), Completion (`course.progress = 100%`), Battle result (`duels.wins >= 1`,
or an SR/rank), Placement (`cup.place <= 4`), Attempts (`attempts <= 2`, anti-grinding), Time
(`streak.days >= 3`, or a date window), Cohort/Role (`role = 'Field Sales'`) for branching.
Remediation loops are capped at 3; the third routes the learner to a human coach checkpoint.

**Builder rules.** The canvas is lint-checked so a broken journey cannot ship (e.g. a Tournament
stage with no advancement rule, a remedial branch with no exit). **Mandatory human approval**:
content and journeys go to a **Review Queue** and only reach learners after an approver (an Org
Admin, never the author approving their own work) signs off — Save draft → Submit for review →
Approved → Publish. Stage settings include: products, time limit / window, item count, difficulty
(fixed / adaptive), retries, required completion.

**Learner home (dashboard).** It surfaces the assigned pathway(s) and the **next stage**, a one-tap
**next battle**, the current **Skill Rating (SR)** with tier (Bronze, Silver, Gold, Platinum,
Diamond, Apex — four divisions each), the active **streak** and its earn **multiplier** (e.g. 6 days
→ ×1.5), open **daily / weekly / season quests**, **rivalries** (a named rival and the head-to-head),
**squad** standing, XP / account level, the **SYN** currency (and rarer **Q-Shards**), and
achievements / badges (five rarities, Common → Legendary).

**Learner journey page.** The pathway as a map of its stages: done / current / locked, each stage's
product and its gate ("Score 80% or higher in the assessment to unlock the next stage"), progress,
what the current stage asks, rewards on completion, the branch for remediation if they fail.

**Admin dashboard.** Org-level read: active learners, completion rate, active pathways, time to
mastery, learning-journey performance over time, top pathways, the **review queue** waiting for
approval, competency / skill-gap view, recent activity, upcoming tournaments.

**Admin pathway builder.** The journey canvas: stages in order with their type, product and gate,
add / reorder / branch, a stage settings panel, the conditions editor, the lint status, the
journey overview mini-map, preview as a learner, and Save draft / Submit for review / Publish.

## Mock data — use these so both directions tell the same story

- Organization: **Northwind Pharma**; learner **Ahmed Hassan** (Field Sales, Squad *Field Ops North*,
  3rd of 14 in the squad), Org Admin **Sara Mansour**.
- Learner pathway: **Sales Mastery**, 9 stages; Ahmed is on stage 4 (*Objection Handling*, a Compete
  stage in the *Fast Track* arena), 3 done. Stages: 1 Know Your Product (Learn) · 2 Reading the
  Buyer (Learn) · 3 Discovery Check (Assess, 80% to pass) · 4 Objection Handling (Compete, Fast
  Track) · 5 Pricing & Value (Assess) · 6 Negotiation Lab (Compete, *Leverage* arena) · 7 Recovery
  Path (Branch, remedial, for scores below 70%) · 8 Q4 Sales Cup (Prove, tournament, place ≤ 4) ·
  9 Mastery Badge (Reward).
- Ahmed: SR 1,612, Gold II (88 SR to Gold I), level 24, 2,480 SYN, 36 Q-Shards, 6-day streak
  (×1.5), XP 620 / 1,000 to the next level, quests daily 2/6 · weekly 3/8 · season 5/12, rival
  Omar H. (Ahmed leads 3–2).
- Admin: 1,248 active learners (+12% this month), 92% completion, 48 active pathways, median time to
  mastery 31 days, 7 items in the review queue, top pathways *Product Excellence* 92%, *Leadership
  Essentials* 87%, *Tech Fundamentals* 76%, *Sales Mastery* 71%; the journey being built is
  *Product Leadership Journey* (Learn: Product Strategy 101 → Assess: Knowledge Check, 80% →
  Compete: Strategy Arena → Prove: Final Challenge → Branch: Remedial Path → Reward: Leadership
  Certificate).

## Technical

- App root: `D:\Ascent-Pathway-builder\directions\` (Vite + React 19 + TypeScript + three.js +
  motion + lucide-react; fonts from @fontsource are installed — see package.json). Dev server:
  `http://localhost:5340/` (`/summit.html`, `/tapes.html`), hot reload.
- Each direction is self-contained: its own entry, its own styles, its own components, its own
  fonts. Pages inside a direction are hash routes: `#/learner/home`, `#/learner/journey`,
  `#/admin/dashboard`, `#/admin/builder`, with a clear, designed way to switch between learner and
  admin and between the two pages of each.
- Desktop first (1440–1920 wide), must not break at 1280; no backend calls.
- Art you may use: `public/ember/ref/ref-1.png` (Ember's concept image, 1672×941), `public/summit/ref/*.png` (the concept images — crop the painted art from them
  with Pillow; they are 1672×941, so use crops at sizes they can carry), `public/shared/cast/*.webp`
  (our three hand-painted 3D characters, rendered on transparent backgrounds: clinician, strategist,
  analyst, plus face crops).
