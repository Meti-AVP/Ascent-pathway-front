# Tapes: UX audit and redesign

Owner's verdict on round one: "the idea is nice, the UX is catastrophic". This file records the cold
audit of the four pages (run against `docs/UX.md` as a first-time learner, Ahmed, and a first-time Org
Admin, Sara), the redesign that answers it, and the re-run of the same checks after the rebuild.

Before shots: `scratchpad/agents/tapes2/before/*.jpg` (1440x900 and 1920x1080).
After shots: `scratchpad/agents/tapes2/after/*.jpg`.

---

## 1. Audit (before)

### 1.1 Problems, ranked by how badly they stop a first-time user

| # | Problem | Where | Why it hurts |
| --- | --- | --- | --- |
| 1 | **The top task is missing or a dead end.** "Play tape 04" on Home jumps to the journey; the "Play · Fast Track" button there only makes a sound. On the journey the current stage is four screens down ("Scroll to press play"). | Home, Journey | The one thing a learner came to do gives no result. |
| 2 | **The builder has no clear next step.** "Submit for review" is greyed to 42% with the reason only in a hover tooltip; the fix sits in a small "FIX" chip in the bottom-right panel under the headline "TRACKING ERROR". | Builder | A novice sees a dead yellow button and an alarm, and cannot connect them. |
| 3 | **Navigation is a VCR, not navigation.** Mode words "▶ PLAY" and "● REC" look like buttons and mean nothing; links are 14px uppercase monospace with brackets ("JOURNEY [4/9]", "STUDIO [7]"). The bar **collapses to a lone "A" tile after 140px of scroll**, so on most of the journey there is no visible way to move. | All | Users cannot tell where they are or where to go. |
| 4 | **The learner/admin switch is hidden.** The only cue that Studio and Builder belong to a different person is PLAY vs REC. No name, no role, no "view as". | All | Users do not know whose view they are in. |
| 5 | **Cryptic jargon replaces labels.** STBY, SP, SET, EJECT, TRACKING ERROR, TRACKING (quest panel header), "Now in the deck", "Sealed", "pull", "Standby", "31D", "3RD/14", raw clauses shown to learners (`duels.wins >= 1`). | All | The metaphor replaces the meaning instead of decorating it. |
| 6 | **Far too much in the first screen.** Counted distinct things at 1440x900: Home 22, Dashboard 16, Builder 15. The same fact appears up to five times (the queue count: nav "[7]", KPI "07", panel "07 awaiting", lede "7 tapes", OSD "7 TO SIGN"). | Home, Dashboard, Builder | Nothing stands out because everything is shouting. |
| 7 | **Two or three equal primary actions.** Home has "Play tape 04", "Duel Omar H." and the clickable tape, all doing the same thing; the builder header shows Save, Submit and Publish side by side. | Home, Builder | Users hesitate between look-alike choices. |
| 8 | **Small monospace text.** Labels are 11px Space Mono, uppercase, 0.2em tracking; the VCR keys 9-10px; the journey spines 10px rotated 90 degrees and truncated ("KNOW YOUR ..."); queue titles truncated at ~15 characters ("OBJECTION HANDL..."). | All | Below the 12px floor, and slow to read even when large enough. |
| 9 | **Low contrast under grain and scanlines.** Scanlines (z 60) and an overlay grain at 26% (z 61) sit on top of all text; grey labels (#6a6762) reach about 3.5:1; disabled buttons drop to about 3:1. | All | Small text shimmers and blurs; AA fails in places. |
| 10 | **Colour-only states.** Journey spines (green / yellow / red dots), the index rail, the builder mini-map and the flagged queue item (a red dot) have no icon or word. | Journey, Builder, Dashboard | Unreadable for colour-blind users and for anyone at a glance. |
| 11 | **Motion delays reading.** Every page change runs an 820ms tracking glitch, then content blurs in with staggered delays up to ~1.9s. The first capture at 2.5s was still blurred. A marquee ticker scrolls forever on the dashboard. | All | The page is not readable when it arrives. |
| 12 | **Interactions you have to discover.** Drag to reorder (builder) is announced in an 11px header label; the shelf says "Click or press Enter to pull" in a hint at the bottom; the minimap squares and the "+" between tapes have no labels. | Builder, Journey | The user only finds them by accident. |
| 13 | **Fake controls.** The VCR on Home shows transport keys (eject, rewind, play, forward, stop) that are not buttons; "Mark complete" is a disabled button that can never be pressed. | Home, Journey | Look clickable, do nothing. |
| 14 | **Actions without plain feedback or undo.** "Request changes" returns an item instantly with no note for the author and no undo; approving cannot be undone. | Dashboard | Irreversible actions with no safety net. |

### 1.2 Five-second test, before (cold, 1440x900)

| Page | What is this page? | What is the one thing to press? | Pass? |
| --- | --- | --- | --- |
| Learner home | "Something called Sales Mastery, with a tape." | "PLAY TAPE 04", but I cannot say what it does; "DUEL OMAR H." looks just as important. | Partial |
| Learner journey | "Nine tapes to mastery, a collection of some kind." | Nothing to press. "Scroll to press play." | Fail |
| Admin dashboard | "The Studio? Lots of panels; 7 waiting for sign-off." | "APPROVE" on the first item. | Partial |
| Admin builder | "A builder for Product Leadership Journey. Red TRACKING ERROR." | Nothing obvious; Submit is greyed with no reason. | Fail |

### 1.3 Task walkthroughs, before (clicks)

| Task | Clicks | Moments of search or guessing |
| --- | --- | --- |
| Learner: start the current stage from Home | 2, then nothing happens | Lands on the journey section; second Play only clicks a sound. |
| Learner: see where I am in the path | 0 to 1 | Must decode coloured dots on rotated, truncated spines. |
| Learner: find how to unlock the next stage | 1 to 4 screens of scroll | Gate shown as code (`duels.wins >= 1`) first. |
| Admin: approve the top item | 1 | Fine, but no undo. |
| Admin: send an item back with a reason | 1 | No reason can be given. |
| Admin: get the journey ready and submit | 2 | Must find the small "FIX" chip in the bottom-right panel first. |
| Anyone: switch learner / admin | 1 | Must guess that "Studio" is the admin side; the bar is gone once you scroll. |

### 1.4 Legibility and states, before

- Smallest text: 9px (VCR keys), 10px (spines, VCR panel labels), 11px (every `.tp-label`).
- Lowest contrast: inactive nav mode words and the VCR brand at about 3.5:1; disabled Submit / Publish at 42% opacity, about 3:1.
- States without colour: not possible on the journey spines, the index rail or the builder mini-map.
- Content: no emoji; character crops are complete on the covers.

---

## 2. Redesign

The tape metaphor stays as the look, the delight and the second word of every label. The first word is
always plain: "Play tape 4 · Start Objection Handling", "Journey check: TRACKING", "Studio".

### 2.1 Information architecture and navigation

- One **persistent top bar** that never collapses: the ASCENT mark; the pages of the current role in
  plain words (**Home**, **My journey** for the learner; **Studio**, **Pathway builder** for the admin)
  at 16px, the current page filled and marked with `aria-current`; a labelled switch
  **"View as: Learner | Admin"**; and the person you are (Ahmed Hassan, Field Sales; or Sara Mansour,
  Org Admin) with an avatar.
- The camcorder overlay stays, but quiet and out of the way: a bottom band with the sound toggle
  (icon **and** "Sound off") and the PLAY / REC timecode at 60% strength. It carries no information you
  need, so it never repeats a fact from the page.
- Scanlines, the roll bar and the vignette move **behind** the content; the film grain stays on top at a
  whisper (8%). Panels behind text are near-opaque.
- Page changes keep the FF / REW tracking glitch but run in about 0.4s, never blur text, and switch off
  with `prefers-reduced-motion`. Content fades in within 0.35s.

### 2.2 Action hierarchy

- One yellow button per screen, always a verb plus its object, sentence case, 16-19px. Secondary
  actions are dark-filled; tertiary are text buttons.
- A blocked action says why inside the button ("Submit for review · Fix 1 problem first") and pressing it
  takes you to the fix.
- Every action answers at once: a toast with **Undo** where it is reversible (approve, send back,
  remove a stage), a state change, or the "now playing" screen.

### 2.3 States

The same three-part state everywhere: **icon + word + detail**. Done (check, "Done · 86%"), current
(play, "You are here"), locked (lock, "Locked · unlocks when you win one duel in Fast Track"),
only-if-needed (branch, "Only if needed"), problem (warning, "1 problem"). Colour only reinforces.

### 2.4 Page by page

**Learner home: "Continue stage 4".** Left: kicker "Sales Mastery · Stage 4 of 9" with a nine-segment
meter; the stage title in glowing brush ("Objection Handling"); one sentence of what clearing it takes
and unlocks; progress so far; the yellow **"Play tape 4 · Start Objection Handling"** with the arena and
time under it; a quiet **Quick battle**. Right: the tape itself, half inside the VCR, whose display reads
"TAPE 04 · READY" (no fake keys). Under both, the glance strip: skill rating and streak. Quests, rival,
squad, badges, level and wallet sit below the fold in three calm cards. First screen: 7 things.

**Learner journey: "See where I am and start".** Header: brush "Sales Mastery" with the plain summary
"3 of 9 stages done · you are on stage 4" and two browse links (Shelf, Every sleeve). Then the **whole
path at a glance**: nine covers in order on one line, each with number, type, title and state, a track
that is green up to the current tape, "You are here" over stage 4, a dashed note on the remedial branch.
Clicking any tape opens its sleeve in the panel below (selected by default: the current stage): what it
is, what clearing it takes in plain words, what it unlocks, the reward, and the one action (Play for the
current stage, Replay for done ones, the unlock rule for locked ones). The 3D shelf (with a first-time
hint) and the one-tape-per-screen sleeves remain below as ways to browse.

**Admin Studio: "Act on the review queue".** Header: brush "Review queue", one sentence ("7 items wait for
your sign-off…") and the four health KPIs, quiet, on the right. Then the queue as a list of readable
tape labels (full titles, kind, author, age, check state with icon and word) next to the review card of
the selected item: cover, what it is, who sent it, the automatic checks, any flag in plain words, and
**Approve** (yellow), **Request changes** (asks for a note first), **Preview**. Approve and send back both
toast with Undo. Charts, top pathways, the tournament and recent activity (now a still list, not a
ticker) live below the fold.

**Admin builder: "Edit the stage, fix what blocks, submit".** Header: brush journey name, the approval
steps (Draft · In review · Approved · Published) and the one submit action, which is yellow only when
the journey is ready and otherwise reads "Fix 1 problem first". The stages strip shows every stage as a
tape with number, type, title and a state ("Ready" or "1 problem"); the selected one is lifted and tagged
"Editing"; "+ Add stage" says what each type is; a first-time hint explains click to edit and drag to
reorder. Below, the VCR panel edits the selected stage with plain labels on every control (Product, Time
limit, Questions, Retries, Difficulty, More settings) and the unlock rule as a sentence plus removable
conditions. Beside it, **Journey check** lists what blocks submitting in plain words with the fix button
right next to it (the only yellow button while something is blocking), followed by the checks that pass.

### 2.5 Novel interactions

Drag to reorder (builder) and drag / click on the shelf get a short visible hint the first time, with
"Got it" (remembered per browser). Both also work without the gesture: the builder's check panel moves
stages for you, the shelf works with arrow keys and buttons.

---

## 3. After (re-run of the checks)

Run cold on the rebuilt pages at 1440x900 and 1920x1080 (and a 1280x800 sanity pass). Final shots:
`scratchpad/agents/tapes2/after/final-*-1440.jpg` and `final-*-1920.jpg`; states in `s-*.jpg`.

### 3.1 Five-second test, before and after

| Page | Before | After | Pass? |
| --- | --- | --- | --- |
| Learner home | "Something called Sales Mastery; PLAY TAPE 04 or DUEL OMAR? Not sure what either does." | "My home. I'm on stage 4 of 9 of Sales Mastery, Objection Handling. Press **Play tape 4 · Start Objection Handling**." | Yes |
| Learner journey | "Nine tapes to mastery. Nothing to press; scroll." | "My journey: 3 of 9 done, I'm at stage 4 (You are here). Press **Play tape 4 · Start Objection Handling**; stage 5 opens after one win." | Yes |
| Admin Studio | "The Studio? Lots of panels, 7 waiting somewhere." | "The admin Studio, review queue: 7 items wait for my sign-off. Press **Approve** on the selected one, or Request changes." | Yes |
| Admin builder | "A builder with a red TRACKING ERROR and a greyed Submit." | "The builder for Product Leadership Journey, in Draft. One problem blocks submitting: Remedial Path has no exit. Press **Add coach checkpoint**, then **Submit for review**." | Yes |

### 3.2 Task walkthroughs, after (clicks)

| Task | Before | After | Search or guessing left |
| --- | --- | --- | --- |
| Learner: start the current stage from Home | 2, then nothing | **1**: the tape slides into the deck and the "now playing" screen opens | None |
| Learner: quick battle | (same button as Play) | **1**: toast "Finding you a quick battle…" with Cancel | None |
| Learner: skill rating and streak | 0 | **0** (glance strip) | None |
| Learner: start the current stage from My journey | 2, then nothing | **1** (the sleeve panel opens on stage 4) | None |
| Learner: what unlocks next and how | read code, up to 4 screens of scroll | **0** ("To clear this stage" + "Then: stage 5"); any locked stage's rule in **1** | None |
| Learner: quests, rival, squad, badges | 0 (all shouting at once) | **1** link or a scroll | None |
| Learner: browse on the shelf | 4+ screens of scroll | **1** link, then drag or the arrow buttons (first-time hint) | None |
| Admin: approve the selected item | 1, no undo | **1**, toast with Undo | None |
| Admin: send an item back with a reason | 1, no reason possible | **2** + typing (Request changes, Send back to the author), Undo | None |
| Admin: org health | 0 (5 KPIs, one duplicated) | **0** (4 KPIs) | None |
| Admin: fix what blocks and submit | 2, after finding a small chip | **2** (Add coach checkpoint, Submit for review); Publish is **1** more after approval | None: pressing the blocked Submit flashes the check and focuses the fix |
| Admin: edit a stage setting | 1 + 1 | **1** to select the tape + **1** per change | None |
| Admin: add a stage | 2 (unlabelled "+") | **2** (Add a stage after stage N, choose a described type) + **1** to pick a product, which the check asks for | None |
| Anyone: switch learner / admin | 1, if you guessed | **1**, "View as: Learner / Admin", always visible | None |

### 3.3 Clutter count, first screen at 1440x900

| Page | Before | After |
| --- | --- | --- |
| Learner home | 22 | **7**: top bar, where-line with path meter, stage title, one sentence + progress, Play + Quick battle, the tape in the deck, glance strip |
| Learner journey | 8 at the top, but the task 4 screens away | **4**: top bar, header (title, summary, browse hint), the nine-tape path, the selected sleeve with its action |
| Admin Studio | 16 | **5**: top bar, header, four KPIs, queue, review card |
| Admin builder | 15 | **5**: top bar, header (steps + actions), stages strip, stage editor, journey check |

No fact repeats on a page any more (the queue count shows in the Studio lede only; the nav badge appears only when you are elsewhere).

### 3.4 Legibility sweep, after

- Smallest text: 12px, only for short uppercase labels ("04 · COMPETE", "SCORE", "Editing", rarity). Body copy 15-18px, buttons 16-19px, numbers 22-58px.
- Lowest-contrast text: secondary grey #aaa69f on the panel, about 7.7:1. Others: #cfcbc4 11.5:1, orange #ff8a3d 7.9:1, problem red #ff9d93 9.3:1, done green #9ef2c0 14:1, button text on yellow 11.7:1. The camcorder counter is decorative (about 6:1).
- Effects: scanlines, roll bar, vignette and smoke now sit behind the content; film grain is the only layer on top, at 8%; panels behind text are 95% opaque.

### 3.5 States, after

Done, in progress, locked, only-if-needed and problem each carry an icon and a word, the same on the path, the shelf card, the sleeves, the index rail, the builder strip, the queue rows and the skills list. Every locked stage says how to unlock it ("Unlocks when you clear stage 4: win one duel in Fast Track").

### 3.6 Content, after

- No emoji. Glyphs are lucide icons or typographic marks in the camcorder text.
- Cover photography: the realistic character (survival renders) now plays the cover star where a person appears on Ahmed's current tape: tape 4, Objection Handling, as a poster (face up top, the arena name across the chest, the photo's cut edge dissolved with a gradient mask, the same sticker, footer and grade as the set). It shows on Home, the journey path, the shelf and the sleeve. The builder's Product Strategy 101 uses pose B (looking up) in the learn cover's photo panel, the head breaking out of the frame. Ahmed's avatar is a face crop of pose A. All assets are downscaled, never upscaled: `public/tapes/cast/survivor-a-portrait.webp` (800x1000, 110 KB), `survivor-b-portrait.webp` (800x1000), `ahmed-avatar.webp` (160x160, 5 KB).

### 3.7 Left as is, on purpose

- The camcorder overlay, the tracking glitch, the brush titles, the shelf and the sleeves remain; they are now decoration and browse modes, never the only way to do something.
- "Studio" is kept as the nav word for the admin dashboard (the brief's word); its page heading says what it is for ("Review queue").
