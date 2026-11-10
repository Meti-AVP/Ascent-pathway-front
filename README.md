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
