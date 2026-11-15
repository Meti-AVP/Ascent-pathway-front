# Summit — UX audit, fix plan and results

Checked against `docs/UX.md` §3, cold, from screenshots at 1440×900 and 1920×1080 (plus 1280×800).
Owner's verdict: the images were badly cropped and fitted, the pages used emoji, and the UX was
"hard, really very hard".
Screenshots: `D:\Temp\claude\81ff8a6005a11926\d7dc097c-f44e-447e-b6f6-22fa79317723\scratchpad\agents\summit2\`
(`before-*` = start, `final-*` = result).

## 1. Before — findings

### Whole shell
- **The role switch was hard to find**: it sat in the bottom-left corner, with 12 px names under an 11 px "VIEWING AS" caps label.
- **The navigation hid where you were**: 3 of the 5 learner items (Quests, Leaderboard, Achievements) and 3 of the 5
  admin items (Review Queue, Analytics, Tournaments) were not pages. They scrolled Home, and the
  active state never moved.
- **Facts appeared twice**: the sidebar card repeated the ×1.5 streak (learner) and "7 awaiting
  approval" (admin), which the page already showed.
- The theme switch was a **yellow** circle. Yellow is the "press this" colour, so it read as an action.
- Painted backdrop and grain sat under all the text. At 1920 the layout stretched and the art was upscaled.

### Learner home
- 5-second test **failed**: "Welcome back, Ahmed!" plus a waving-hand emoji, then four competing
  actions: two yellow "Continue" buttons, "Next battle" and "Rematch".
- **Emoji** in the H1.
- Clutter: about **11 things** in the first screen.
- Facts appeared twice: the streak (sidebar and card), stage 4 (subtitle, card and strip), and SR 1,612 (stat and rivalry).
- Art: the two figures sat under the top-bar controls, the stat cards cut their bodies, the viewport
  edge cut one figure, and the art was upscaled at 1920. "Best run 74%" was printed over the arena thumbnail.
- Legibility: the day chips were 11 px and the captions 12 px grey on grey (about 3.4:1).

### Learner journey
- 5-second test **failed** on the action: there was no start button in the first screen.
- The 9-tile map used 10–11 px caps labels and chips. The Recovery Path tile hung below the row with
  dashed red arrows and code-like chips ("score < 70%", "retry · max 3").
- "If needed" was shown only as a dashed red ring, and the legend used colour dots only.

### Admin dashboard
- 5-second test **failed**: the page read as a marketing hero ("Build Learning Journeys that Inspire
  Growth") with the yellow button "Start building". The review queue, which is the top task, was not in the first screen.
- It showed invented metrics that are not in the brief ("Mastery growth +24%", "Weekly engagement 88%").
- Art: the cast was cropped through the top bar, so hair ran under the search field, and the side cards covered the figures.

### Admin builder
- 5-second test **failed**: there were three header buttons. Two were greyed out without saying why, and the brightest
  button on screen was "Add exit" in a 260 px side column.
- About **13 things** in the first screen. The journey check was squeezed into 12 px text, the overview labels were about 8 px, and every
  condition showed raw code in 11 px monospace.
- The woman's hair touched the top edge of the slot, and the portrait took up a third of the first screen.

## 2. Fix plan (what was built)

| Page | One primary (yellow) | Secondary, visible but quieter | On demand |
| --- | --- | --- | --- |
| Shell | — | **Learner / Admin** switch at the top of the sidebar, labelled "You are viewing as". Navigation shows only the real pages, with a plain sub-line. | search (Ctrl K), notifications, account menu |
| Learner home | **Continue stage 4**, in one hero card that states the gate in plain words | SR · streak · quick battle (3 tiles) | Quests / Rival and squad / Achievements / Level and wallet tabs |
| Learner journey | **Start stage 4**, in the selected-stage card | "What unlocks next" | any stage's details (click a node), all 9 stages with history, Recovery Path rules, pathway badges |
| Admin dashboard | **Approve** the selected item (queue list + detail) | 4 KPIs in their own row | Request changes (asks for a note), performance chart, top pathways, skill gaps, activity, tournament |
| Admin builder | **Submit for review**. While blocked it is disabled and says "Fix 1 problem to submit". | journey check, with a one-click fix per problem | Show as code, journey overview, preview as learner, add-stage dialog |

**Art: one placement per page.** Each crop matches its slot's aspect, keeps every head complete,
has its edges masked into the surface, and is graded warm (ref-2's lavender sky is pulled to warm
grey, so no purple). Nothing is shown above 1.0×.

| File | Source | Native | Shown at |
| --- | --- | --- | --- |
| `crew.webp` | ref-2 (602,20)–(1115,385): four heroes; the search bar and text are excluded | 513×365 | 513×365, home hero, left + bottom fade |
| `arena.webp` | ref-1 (578,712)–(888,900): Fast Track arena island | 310×188 | 310×188, journey stage card, bleeds into the corner |
| `pair.webp` | ref-1 (1228,168)–(1672,420): two learners and the citadel ring; full hair | 444×252 | 352×200, dashboard header |
| `builder.webp` | ref-3 (200,0)–(560,330): the architect portrait; sidebar and card edge excluded | 360×330 | 240×220, builder header, 10 px headroom with a top blend |
| `face-*.webp` ×9 | centred face crops, eyes at about 44%, the same framing for everyone | 112×112 | ≤ 64 px |

All 6 old art files were removed. No crop contains baked-in UI text or smudges; each was checked at 100%.

## 3. After — results of the UX.md checks (cold, at 1440×900; 1920×1080 also checked)

### Five-second test

| Page | Before | After |
| --- | --- | --- |
| Learner home | "A welcome page with an emoji. Continue? Continue? Next battle? Rematch?" | "Home. My next stage is Objection Handling. Press **Continue stage 4**." |
| Learner journey | "The Sales Mastery map, but where do I start?" (no button in view) | "My journey. I'm on stage 4 of 9 (You are here). Press **Start stage 4**. Stage 5 opens at 80%." |
| Admin dashboard | "A marketing page. Press Start building?" | "Admin dashboard. 7 items wait for me. Press **Approve** on the selected one, or open another." |
| Admin builder | "Two greyed buttons, no reason given. Is Add exit the main thing?" | "Draft of Product Leadership Journey. **Submit for review** is blocked by 1 problem, and the fix is one click away in Journey check." |

### Task walkthrough: clicks from a cold page load

| Task | Before | After |
| --- | --- | --- |
| Learner: continue the current stage | 1, but there were 2 identical yellow buttons to choose from | **1** (the hero's only primary button) |
| Learner: quick battle / check streak and SR | 1 / 0 | **1 / 0** |
| Learner: see quests, rival, achievements | scroll / scroll / nav item that silently scrolls | **0** (quests, below the fold) / **1** tab / **1** tab |
| Learner: start the current stage from the journey page | scroll + 1 | **1** (in the first screen) |
| Learner: how does the next stage unlock? | read the 11 px chips | **0** ("What unlocks next" card) |
| Learner: details of any stage / Recovery Path rules | hover the tiles / read the dashed arrows | **1** (click a node) / **1** (disclosure) |
| Admin: approve the top item | 2 + scroll (find the queue first) | **1** |
| Admin: approve a specific item / request changes | 3+ / not available | **2 / 3** (select, Request changes, Send back with a note) |
| Admin: fix the blocking problem and submit | 2, with the reason not shown | **2** ("Send back to Final Challenge", then "Submit for review") |
| Admin: edit a setting on the selected stage | 1 | **1** (the stage is selected by default) |
| Anyone: switch learner/admin | 1, hard to find | **1**, labelled, at the top of the sidebar |

Nothing needed searching or guessing. Every action answers at once with a toast, and the reversible
ones (approve, send back, insert or delete a stage, submit) offer **Undo** or **Withdraw**.

### Clutter count: distinct things in the first screen (persistent sidebar and top bar not counted)

| Page | Before | After |
| --- | --- | --- |
| Learner home | ~11 | **6**: greeting · hero (gate + primary) · SR · streak · quick battle · "Your progress" header |
| Learner journey | ~9 | **4**: title + progress · path map · stage card (primary) · what unlocks next |
| Admin dashboard | ~9 | **4**: greeting + art · KPI row · queue list · item detail (primary) |
| Admin builder | ~13 | **4**: header (status, approval steps, actions) · stage row · stage editor · journey check |

No fact is shown twice on the same screen. The sidebar cards that repeated the streak and queue count are gone.
The "You are here" tag sits on the map only, not again in the stage card. The unlock rule for stage 5
appears only in "What unlocks next".

### Legibility sweep
- Smallest text: **12 px**. These are labels only: weekday initials, notification count, Ctrl K hint and the "Rival" tag.
  Chart axes, approval-step numbers and overview labels are 12.5 px.
- Body and descriptions are 15–16.5 px. Item titles are 15–15.5 px. Key numbers are 26–46 px.
- Lowest contrast (WCAG, computed): tertiary text is **5.2:1** on the light page and **5.5:1** on the
  darkest dark well. Count badges went from 3.2:1 to **5.2:1** (white on #c63a30). The primary button text is **10.6:1**.
  All text tokens in both themes pass AA.
- No all-caps sentences, no monospace except the optional "Show as code" view, and no grain or
  scanlines under text.

### States without colour
The same icon and word are used on every page:

| Meaning | Icon and word |
| --- | --- |
| done | check-circle "Done" |
| current | play-circle "You are here" |
| locked | lock "Locked" |
| conditional | split "If needed" |
| problem | alert-circle "Needs a fix" or "Blocks submitting" |
| suggestion | triangle "1 suggestion" or "1 warning" |
| ready | check-circle "Ready" or "Checks passed" |
| own item | lock "Yours" |

Locked stages state how to unlock them. Disabled buttons state why they are disabled:
- "Fix 1 problem to submit"
- "Waiting for another approver. Authors never approve their own work."
- "Write a note to send it back"

### Content
- **No emoji** anywhere in `src/summit/**`, `summit.html` or the data. Arrow and triangle glyphs were
  replaced by lucide icons or words. The sweep over U+1F000–1FAFF, U+2190–27BF and U+2B00–2BFF returns 0 matches.
- The art was checked at 100% at 1440 and 1920. Heads are complete with headroom, no image sits under a bar or
  panel, and none is upscaled.
- Light mode on the learner home works. The painted hero stays dark, like the Next Up card in the
  concept, and every other surface switches.

## 4. Residual notes
- The "Fast Track", "Preview" and "Review this stage" buttons open nothing real in this mock. They
  answer with a toast that says what would happen.
- At 1280×800 nothing breaks. On the journey page the primary sits at the fold, and the builder title
  drops to 27 px.
