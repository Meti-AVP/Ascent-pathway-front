# UX standard for the ASCENT directions

The owner's verdict on the first round: the ideas are good, but the experience is **hard to a
suspicious degree** — "I feel cluttered and confused, I don't know what to do or where to go". Tapes
was called catastrophic, Summit hard. The bar now is the clarity of a senior product designer with
decades of experience: a first-time user knows within five seconds **where they are, what this page
is for, and what to press next** — without losing the direction's look.

## 1. Every page is built around its top task

| Page | Who | The one primary task | Secondary (visible, quieter) | Everything else (on demand) |
| --- | --- | --- | --- | --- |
| Learner home | Ahmed | **Continue the current stage** (stage 4, Objection Handling) | quick battle; streak + SR at a glance | quests, rival, squad, achievements, currencies |
| Learner journey | Ahmed | **See where I am and start the current stage** | what unlocks next and how (the gate, in plain words) | full stage details, history, branch rules |
| Admin dashboard | Sara | **Act on the review queue** (7 waiting) | health at a glance (4 KPIs) | charts, top pathways, activity, tournament |
| Admin builder | Sara | **Edit the selected stage and get the journey ready to submit** | the journey check (what blocks submitting and how to fix it) | settings detail, overview, preview |

Design each page in that order: the primary task is the biggest, highest-contrast thing in the
first screen; the secondary sits beside it, quieter; the rest sits lower or behind a click.

## 2. Rules

**Action**
- Exactly **one primary button per screen**, the same style everywhere, labelled with a verb and its
  object ("Continue stage 4", "Approve", "Submit for review"). Secondary actions look secondary.
- A disabled control says why ("Fix 1 problem to submit"), never just greys out.
- Every action gives visible feedback at once (state change, toast, undo where it is reversible).

**Wayfinding**
- Persistent navigation with **plain words** at a readable size; the current place is unmistakable;
  the page title says where you are. Switching learner / admin is visible and labelled, not hidden.
- No dead ends: from every page you can see how to go back and where to go next.

**Hierarchy and density**
- At most **5–7 distinct things in the first screen** at 1440×900. Group related data into one block;
  never show the same fact in two places on one page.
- Progressive disclosure: details, history, rules and power features open on demand.
- Generous spacing; align to a grid; one clear reading path (top-left → primary action → secondary).

**Legibility**
- Body text ≥ 15 px, labels ≥ 12 px, key numbers large; contrast ≥ 4.5:1 for text (WCAG AA).
- All-caps and monospace only for short labels, never for sentences. Decorative effects (grain,
  scanlines, glows, textures) never sit at full strength under text.
- Plain language: say what happens and what it means. A metaphor (tapes, stones) may decorate a
  label but never replace it — "Play tape 4 · Start Objection Handling", not just "PLAY ▶ 04".

**States**
- Done / current / locked / failed are shown with icon **and** text, not colour alone, and the same
  way on every page. Locked items say how to unlock them.

**Content**
- **No emoji anywhere**, in any direction — use icons from the set (lucide-react) or our own glyphs.
- Images are art-directed: complete heads and figures, nothing cut by a bar or an edge, crops fitted
  to their slot's exact aspect ratio with a deliberate focal point, edges blended with gradient
  masks, colour graded to the page, never upscaled more than ~1.3× (if a slot needs more, change
  the slot), no leftover baked-in text or smudges. Fewer, larger, well-composed images beat many
  small crops.

**Motion**
- Motion orients (where did this come from, what changed); it never delays reading or input.
  Respect `prefers-reduced-motion`.

## 3. How to check (do this, with screenshots, before you call a page done)

For each page at 1440×900 and 1920×1080, look at the screenshot cold and answer in writing:
1. **Five-second test** — what is this page, and what is the one thing to press? If the answer is
   not instant, the hierarchy is wrong.
2. **Task walkthrough** — do the page's top task and two secondary tasks; count the clicks; note
   every moment you had to search or guess.
3. **Clutter count** — how many distinct things are in the first screen? Over 7: cut, group, defer.
4. **Legibility sweep** — find the smallest text and the lowest-contrast text; fix both.
5. **States** — can you tell done / current / locked without colour?
6. **Content** — any emoji, cut-off face, blurry or badly fitted image, leftover baked text?
