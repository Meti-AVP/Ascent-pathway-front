# ASCENT Pathway Builder site mockup: progress report

*11 November 2026.* This is a snapshot of work in progress. It was taken during the first round of fixes on the PATHWAYS
page, so some fixes are only part done and the page has not yet been reviewed again (see "What is in this snapshot").

## Where things stand

| Section | State | Where to see it |
|---|---|---|
| **HOME** | Approved. It has a detail pass and a white mode. | https://ascent-pathway-front.vercel.app · branch `main` |
| **PATHWAYS** (map, stage detail, rewards) | Built; review round 1 done, fix round 1 under way | https://ascent-pathway-preview.vercel.app/#/pathways · branch `pathways-wip` |
| **COMPLETE FOR REWARDS** (part of PATHWAYS) | New screen. Spec written, being built in this round. | Same test link, via **ALL REWARDS >>>** |
| **LANDING** (key-art scene before HOME) | Parked. The Blender scene needs the RTX machine. | — |
| SEASON, QUESTS, AVATARS, STORE, CUPS, ARENAS | Specs written. Each will be built in this order after PATHWAYS is approved. | — |

The main link and `main` hold only work the owner has approved. Work in progress goes to the separate test link and to the
`pathways-wip` branch until the owner approves it.

## PATHWAYS: what the page is

PATHWAYS is the heart of the product. A learner's assigned pathways each climb through a series of stages, and each stage is
one of four kinds:
- a course;
- a battle, played in one of the arenas;
- an assessment;
- a cup.

A gate opens each stage, clearing it pays SYN and SR, and some stages also pay an item. Items are gallery cards, badges,
titles and cup banners. Each pathway ends in a final reward.

The page follows the event-progression screens of the reference game's menu. It is built in our own identity: black, white and
silver, with four accents that each do one job (green for progress, burnt orange for brand heat, yellow for actions, red for
alerts), and leaning, rounded shapes with no stroke borders. Both themes are supported.

It has three screens:
- **The map.** The pathway's stages are numbered, interlocking panels that climb from bottom-left to top-right. Cleared,
  current and locked stages each have their own treatment, and a locked stage shows the gate that opens it. The page also has:
  - the learner's painted avatar on the left;
  - the rewards block ("COMPLETE ALL TO GET [3/9]");
  - a sub-tab for each pathway;
  - RULES and the due-date countdown.
- **The stage detail.** It shows the stage's object, its three requirements (each with its progress, its pay and a GO), the
  stage's reward and the stage pips.
- **COMPLETE FOR REWARDS.** It shows every item the pathway pays on a track, with:
  - the selected reward shown large in its own form: a painted card, a badge, a title nameplate or a banner;
  - INSPECT (Z), to look at it closely;
  - GO, which jumps to the stage that pays it.

**Sample data:** three pathways.
- **Sales Mastery:** 9 stages, currently on stage 4, "Objection Handling". HOME's next-stage chip points at the same stage.
- **Cyber Safety:** 7 stages, currently on stage 2.
- **Leadership Foundations:** 6 stages, all cleared.

**Keyboard:**
- the arrows move between stages;
- Enter opens a stage;
- Esc goes back one layer: detail → map → HOME.

## How the work is checked

All work happens on a staging copy. The owner's local site and the main link change only when a piece of work has passed
review and been approved. Each section goes through independent reviews, each looking at the page from one angle, followed by
fix rounds:

| Review angle | Round 1 score | Main findings |
|---|---|---|
| Match to the reference | 5 / 10 | The COMPLETE FOR REWARDS screen was missing. Motion ran 1.6–3× slower than the reference, and its flicker frames were too loud. Hover didn't "go hot". Panels were busy. The detail's left object was flat. |
| Layout and finish | 5 / 10 | Text collided with text and with art on several panels. Some labels were cut off with "…". The countdown went blank for a moment every second. The Esc Back hint went to HOME. The rules list was cut off. |
| Identity and white mode | 7 / 10 | Yellow was used for decoration. The requirement cards had a frame that read as a border. The avatar painting was drawn about 1.15× larger than its source, so it looked soft. A pale veil covered the figure in white mode. |
| Motion and performance | 6 / 10 | The page dropped frames on the target laptop GPU (Intel HD 530): 17 fps when opening a stage and 20 fps during the arrival. HOME was confirmed unchanged. |

The decisions taken from the reviews (binding for the fixes):
- Every accent does only its own job.
- No borders around containers.
- Screen titles are upright and flat, as in the reference.
- Motion follows the reference's fast, stepped tempo, and only `transform`/`opacity` animate.
- Painted art is never upscaled or filtered.
- Text never overlaps art or other text, and nothing is ever cut off with "…".

## Fix round 1 (in progress)

The fixes are split by area, so no two people edit the same files.

- **Map:**
  - Calm panels: the header strip, the picture and one title line. A cleared stage's score moves into its strip.
  - The current stage gets the largest panel.
  - Even, thin gaps between panels.
  - Zero text overlaps, checked by a script.
  - The reference's tempo for the arrival and hover.
  - Cheaper effects: chevrons, sweeps and wipes moved to compositor-only animation.
- **Stage detail:**
  - A rich, lit illustration for each kind of stage.
  - Leaning requirement cards without a frame, each showing what it pays.
  - Green progress meters. They also had a bug that kept them from filling.
  - One primary GO per screen.
  - New stage pips.
  - A locked state, reached from the rewards screen.
- **Page:**
  - Sharp avatar art. New high-resolution stills, in both theme lightings, are rendered from the same painterly 3D model HOME
    uses.
  - An upright title with the accent bar and a leader line to the current stage.
  - A quieter countdown that never blanks.
  - The rewards block redone.
  - Faster transitions.
  - A light RULES panel in white mode.
  - The frame centred on non-16:9 screens.
- **COMPLETE FOR REWARDS:** the new screen, built to a measured spec of the reference (layout, arrival frame by frame,
  selection, INSPECT, GO), with reward art drawn for every kind.
- **Shared shell** (all pages; HOME must stay pixel-identical):
  - The browser's back and forward buttons now move between sections.
  - HOME's 3D model (7.9 MB) is no longer downloaded when a page other than HOME is opened.
  - No colour jump when switching theme.
  - Cheaper top and bottom bars.

Already done before the round:
- The Esc Back hint now does exactly what the Esc key does: detail → map → HOME. Tested.
- The data was reworked so that rewards have a single source: which stage pays which item, the final reward and the next
  milestone.
- The gates that contradicted their stages were corrected.

**Performance:** the fixes were measured on the target GPU before they were applied:
- the idle map from 33.5 to 42 fps, with render passes down from 17 to 8 and layers from 121 to 77;
- the stage detail from 27 to 37.5 fps.

## What is in this snapshot

The code was copied from staging in the middle of fix round 1. The copy passes the type check and the production build, but
some areas show changes that are only part done. Nothing here has been through the second review yet. The test link shows
exactly this snapshot.

## Next steps

1. Finish fix round 1.
2. Run review round 2 from the same four angles, and repeat fixing and reviewing until each angle scores at least 9/10.
3. The owner reviews PATHWAYS. Once approved, it moves to the main link and to `main`.
4. Build SEASON next, then QUESTS, AVATARS, STORE, CUPS and ARENAS, each from its spec, through the same review process.
5. The LANDING scene, when the RTX machine is available.
