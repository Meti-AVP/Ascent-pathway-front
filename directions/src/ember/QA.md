# Ember: QA log

Bug pass on direction 3. No redesign: the fixes change only what each bug needs.

## How it was checked

- Five sizes: 1280×800, 1440×900, 1672×941, 1920×1080 and 2560×1440, on all four pages, with `?still`.
- The stage scales to fit the screen, so there are really two layouts:
  - **narrow**: stage width 1506 at 16:10 (1280 and 1440);
  - **concept**: stage width about 1672 at 16:9 (1672, 1920 and 2560).
- Checks at every size:
  - a DOM audit: elements off-screen, clipped text, children overflowing their card, scrollbars;
  - a sweep of every stone tooltip, forced visible: on-screen, and not under the hero or the cards;
  - console and network logs.
- Real key input over CDP: Tab order, `:focus-visible` on every stop, Escape.
- Reduced motion checked with `prefers-reduced-motion: reduce` emulated.
- The dashboard at 1672×941 was diffed against `public/ember/ref/ref-1.png` and against the pre-fix render.
  - The only regions that changed are the progress bar and the new switch label.
  - Mean difference from the reference went from 6.08 to 6.15, all from those two regions.

## Fixed

Each entry gives where it was, the cause, the fix, and where it was verified. "Narrow" means 1280×800 and 1440×900.

### Shell and all pages

1. **Learner/admin switch was hidden until hover.**
   - Where: `App.tsx` Sidebar; `ember.css` `.em-mon`.
   - Cause: the label only faded in on `:hover`.
   - Fix: a "⇄ Switch to Learner / Switch to Admin" pill that is always visible, in the empty strip under the monument bar. Hovering or focusing it turns it yellow; the reference area is untouched.
   - Verified: all five sizes; diff against the reference at 1672.
2. **Tab reached the nav last, and the primary button came after the canvas stones.**
   - Where: `App.tsx`; the three page files.
   - Cause: DOM order.
   - Fix: the sidebar and top bar now come first in the DOM, and each hero comes before its `<World>`. Paint order is set by z-index, so nothing moves on screen.
   - Verified: real Tab at 1440.
3. **The Time limit `<select>` had no visible keyboard focus.**
   - Where: `ember.css`.
   - Cause: `outline: 0` was set, and `select` was missing from the focus-visible rule.
   - Fix: added `select` to the rule.
   - Verified: real Tab at 1440.
4. **Stone tooltips appeared only on mouse hover.**
   - Where: `pages.css`.
   - Fix: they also open on `:focus-visible`.
   - Verified: real Tab (tooltip opacity 1).
5. **Tooltips of right-edge stones were cut off by the viewport** (the Reward pedestal, journey stone 7, the builder's branch stone).
   - Where: `stage.tsx`; `pages.css`.
   - Cause: tooltips were always centred on the stone.
   - Fix: stones right of concept x 1460 get `tip-end` and open leftwards.
   - Verified: tooltip sweep at all sizes.
6. **The Learn pedestal's tooltip was hidden under the hero headline** (z-index). The same applied to journey stone 1 and the builder's left-hand slot.
   - Cause: tooltips live in the world layer (z 0), which sits below the hero (z 4).
   - Fix: stones left of concept x 960 get `tip-side` and open to the right, clear of the copy.
   - Verified: screenshot at 1440; sweep at all sizes.
7. **The Reward pedestal sat 1px from the right edge on narrow stages**, with its badge touching the edge.
   - Where: `ember.css` `--art-r`.
   - Cause: the art crop put the whole deficit on the right.
   - Fix: the crop split went from 0.5 to 0.44. On narrow stages the builder's stepper connectors are 8px shorter, so the Learn pedestal still clears the copy.
   - Result: Reward is 14px from the edge, and Learn is 37px from the stepper. 1672 and wider are unchanged.
   - Verified: 1280, 1440, 1672.
8. **`/favicon.ico` returned 404 on every load.**
   - Where: `ember.html`.
   - Fix: added `public/ember/favicon.svg` (the ASCENT mark) and linked it.
   - Verified: the request returns 200.
9. **Text reflowed by about 2px after the first paint on a cold load** (font swap).
   - Where: `main.tsx`.
   - Fix: the first render waits for Plus Jakarta Sans, capped at 800ms.
   - Verified: font status and text widths polled during a cold load.
10. **`prefers-reduced-motion` did not stop the CSS loops**: fire pulse, breathing glow, bobbing avatar, trail dashes, blinking segment and fades. The JS parallax and embers already stopped.
    - Where: `ember.css`.
    - Fix: a reduced-motion block.
    - Verified: with emulation, every loop is reduced to 0.01ms once, the fire is hidden, `--mx` stays 0, the embers canvas stays empty and toasts stay visible.
11. **The account menu showed "Org Admin" as the admin's name.**
    - Where: `App.tsx`.
    - Fix: it now shows "Sara Mansour" and "Org Admin · Northwind Pharma".
12. **The "coming soon" message for nav items was wrong for the learner** ("Home and Pathway Builder for each role").
    - Where: `App.tsx`.
    - Fix: new copy, "X is coming soon — this mockup builds Home and Y for the learner/admin", plus a `title`.
13. **Bell items did nothing, or pointed at the wrong place.**
    - Learner "View" did nothing while on Home. It now opens Home and flashes the daily quest.
    - "Path" opened the journey on stage 4. It now opens stage 8 (`#/learner/journey?stage=8`).
    - Admin "Review" on the Product Leadership Journey opened the builder, where that journey is an unsubmitted draft. See #31.
    - Verified: eval at 1440.

### Admin dashboard

14. **The pathway bar was at 84.5% under a "92% Complete" label.**
    - Cause: the width was copied from the concept.
    - Fix: the width is 92%, and the bar has `role="progressbar"`.
    - Verified: 1440, and the diff at 1672.
15. **The area chart's rise was cropped away on narrow stages.**
    - Where: `ember.css` `.em-area`.
    - Cause: a fixed 442px SVG anchored left inside a 388px card.
    - Fix: anchored right. At 1672 the card is exactly 442px, so nothing changes there.
    - Verified: 1280, 1440, 1672.
16. **"View All" said 48 pathways while the card says 12 Active Pathways.**
    - Fix: it now says 12.
17. **The Product Excellence card opened the builder on a different journey** (Product Leadership).
    - Fix: a coming-soon toast that names the card's own journey.

### Admin builder

18. **Gate pills selected the wrong stage.** "100% done", which is Learn's gate, selected Knowledge Check, so the highlighted pill never matched the Gate Conditions card. Pill labels also stayed fixed when clauses were removed.
    - Cause: pills were mapped to the next stage.
    - Fix: each pill selects the stage whose gate it shows. Labels come from the live gate ("No gate" when it is empty).
    - Verified: every pill walked at 1440.
19. **"Fix" during review left the journey "In review", and the pending approval still went through.**
    - Cause: the memoised lint captured a stale `approval`, and edits never cleared the review timer.
    - Fix: lint is computed on every render. Any edit clears the timer and reopens the draft.
    - Verified: the full Submit, approve, Publish flow at 1440.
20. **After publishing v3, edits still showed "Draft v3"**, and Save said "version 3".
    - Fix: the version bumps after publishing ("Draft v4").
21. **A click that changed nothing still reopened the draft** (the stepper at its limit, or the option already chosen). Under review, that withdrew the submission.
    - Fix: no-op edits are ignored, and the stepper is disabled at 1 and 5 with a reason.
22. **The wrong unlock target in the gate sentence**: "Final Challenge … unlock Remedial Path", and "New Learn Stage … unlock Product Strategy 101".
    - Cause: `next` was taken from the fixed stage array (it included the branch, and was −1 for added stages).
    - Fix: the next stage on the main path.
23. **The add toast said "added after <selected stage>"**, but stages are appended at the end.
    - Fix: "added as stage N".
24. **The first added stage landed off-screen on narrow stages** (concept x 1572), and the 4th added stage stacked onto the 1st.
    - Fix: a new on-screen slot, and the canvas caps at 3 added stages with a clear toast.
    - Verified: 1440 and 1920 with three stages added.
25. **The mini-map was clipped on narrow stages** (the Reward node and its label were cut off). With added stages, labels collided and nodes climbed into the card header.
    - Fix:
      - the span follows the stage width (250 or 276);
      - the total rise is constant;
      - with more than 7 stages, only the selected stage keeps its label (each node has a `<title>`).
    - Verified: 1440, 1672.
26. **The Add stage and Add condition menus ignored Escape and outside clicks.**
    - Fix: both now close on either.
    - Verified: eval at 1440.
27. **The Add condition menu was clipped by its card**, so the last option ("Loops ≤ 3") could not be clicked.
    - Fix: `.em-card.em-gate { overflow: visible }`, so the menu can hang below the card.
    - Verified: hit test at 1440.
28. **Text overflowed on narrow stages.**
    - The "Require completion" hint wrapped out of its 40px row. The row now has a minimum height.
    - The lint row "… has no exit — cap its loops" wrapped in a 24px row. It is now "… has no loop cap", and several ungated stages are counted together.
29. **Submit was greyed out with no reason.**
    - Fix: while errors remain, the label reads "Fix N error(s) first".
30. **Smaller builder fixes:**
    - Items said "adaptive pool of 40" for Fixed difficulty. It now says "fixed set".
    - The Product picker was a `<span>` with no keyboard access. It is now a button.
    - The Require-completion switch had no accessible name.
    - Preview gave no sign of the selected stage. It now shows the yellow ring.
    - The "Learners see" sentence named Remedial Path or Leadership Certificate for added stages. It now uses the stage's own name.

### Data, learner home and journey

31. **The review queue listed the Product Leadership Journey as waiting**, while the builder shows it as an unsubmitted draft.
    - Where: `data.ts`.
    - Fix: the item is now "Leadership Essentials — journey v2". The count stays at 7.
32. **Quest titles contradicted their counters and were truncated** ("Win 2 duels" at 2/6; "Clear 3 stages on a…"; "Reach Gold I…").
    - Fix: each title names what its counter counts:
      - "Win 6 duels in any arena", 2/6;
      - "Play 8 ranked duels", 3/8;
      - "Earn 12 badges", 5/12.
    - The bell now reads "2 of 6 duels won · Win 4 more".
    - Verified: all sizes.
33. **The Level and Streak rows overflowed the Skill Rating card by 7px on narrow stages.**
    - Cause: grid min-content with seven fixed-width flames.
    - Fix: a `minmax(0, 1fr)` column and flames that can shrink.
34. **Rarity labels collided on narrow stages** ("UNCOMMONCOMMON").
    - Fix: on narrow stages the columns are sized to the labels.
    - Verified: measured 5px gaps at 1440.
35. **Home pedestals always opened stage 4.**
    - Fix: each opens the journey on the stage it stands for (`?stage=N`).
36. **"1 of 2 attempts left" wrapped to three lines on narrow stages.**
    - Fix: tighter stat tiles on narrow stages only.
37. **"If you miss" always said "Below 70% sends you to Recovery Path"**, including on Recovery Path itself, the cup and the badge.
    - Fix: text for each stage.
    - Verified: all 9 stages fit their card at 1440 and 1920.

## Left as is

- **Art is upscaled at 2560×1440.**
  - The world, monument, thumbnail and avatars are crops of the 1672×941 concept, so the stage shows them at 1.53× (1.15× at 1920).
  - A sharper picture needs higher-resolution art, not a code change.
- **"Create New Journey" and "Build a New Journey" open the builder on the existing Product Leadership draft.** The mockup has one builder, and the owner used that path.
- **Mini-map nodes are mouse-only.** The same stages are reachable by keyboard as canvas stones.
- **The mini-map's SVG box is wider than the card on narrow stages.** Its contents fit; the box itself is invisible.
- **Some labels are 9–11px, below the 12px label rule, and 1280×800 renders at 0.85 zoom.** This comes from the scale-to-fit design, not a bug.
- **Coming-soon nav items carry no visible tag until clicked.** There is no room in the nav item without changing its look, so they get a toast and a `title`.
- **The builder's "If not met: Remedial Path" line also shows for the Reward stage.** This is a content nuance, not a defect.

Final 1440×900 screenshots are kept outside the repo, in the QA scratchpad.
