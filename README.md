# ASCENT — Pathway Builder · site mockup

Front-end mockup of the learner product, built one section at a time. No backend: every
number on screen comes from `src/data/`.

```bash
npm install
npm run dev        # http://localhost:5320
npm run build      # type-check + production bundle in dist/
```

## Deploy (Vercel)

Import this repository in Vercel; it is detected as a Vite project and `vercel.json` pins the
settings: `npm ci`, `npm run build`, output in `dist/`. Node 20.19 or newer. No environment
variables and no server: the build is a static site.

## What is here

| Path | What it holds |
| --- | --- |
| `src/styles/tokens.css` | The identity: black / white / silver, the four accents and what each one is for, the 12° lean, the `--u` scaling unit |
| `src/styles/ui.css` | Shared pieces: arrivals, progress meter, the leaning button |
| `src/shell/` | Top navigation, bottom key-hint bar, the screen-change wipe |
| `src/stage/` | The real-time 3D character (three.js): loading, lighting, the painterly material patch, cursor follow |
| `src/screens/home/` | Section 1 — the learner home |
| `src/screens/avatars/` | Review board for the adapted characters (the roster screen itself is a later section) |
| `src/screens/Pending.tsx` | Stand-in for sections that are not built yet |
| `public/models/` | Avatars exported from Blender as GLB (WebP textures, idle + flourish clips) |
| `tools/avatars/` | The Blender pipeline that produces them — see its README |

## Scaling

The interface is laid out on a 1920×1080 reference frame and every size is written in `--u`
(`min(100vw / 1920, 100vh / 1080)`), so the menu scales as one piece like a game HUD.
Below a 1:1 aspect ratio or 820px wide it switches to a single-column arrangement.

## Characters

The character models are third-party game assets used as placeholders for this mockup.
They must be replaced or licensed before anything is published.

## Design directions (`directions/`)

A second app with three alternative design directions for the same product, each with two learner
pages (home, my journey) and two admin pages (dashboard, pathway builder), all on the PRD flow:

| Direction | Entry | Idea |
| --- | --- | --- |
| Summit | `/summit.html` | dark glass interface with painted key art |
| Tapes | `/tapes.html` | camcorder and VHS tapes: the learner plays, the admin records |
| Ember | `/ember.html` | obsidian cliffs and a path of fire |

`/` is a hub that links to every page.

```bash
cd directions
npm install
npm run dev        # http://localhost:5340
```

**Deploy:** create a second Vercel project from this same repository and set its
**Root Directory** to `directions`. Vercel detects Vite and `directions/vercel.json` pins the
settings (`npm ci`, `npm run build`, output `dist/`). The site at the repository root keeps its own
project and link.

## Onyx (`onyx/`)

The fourth design direction, on its own link. It has the same four pages on the PRD flow:

- **Learner:** home, with a living real-time 3D Ahmed; my journey, the stages standing on a lit path of stone pedestals.
- **Admin:** dashboard, built around the review queue; pathway builder, where content is dragged onto the pedestals.

The world is rendered in Blender as layers, and the interface runs live on top.

```bash
cd onyx
npm install
npm run dev        # http://localhost:5350
```

Pages: `/#/learner/home`, `/#/learner/journey`, `/#/admin/dashboard`, `/#/admin/builder`.

**Deploy:** create a third Vercel project from this same repository and set its **Root Directory**
to `onyx`. `onyx/vercel.json` pins the settings (`npm ci`, `npm run build`, output `dist/`).

The character model is a placeholder for this mockup, like the ones above.
