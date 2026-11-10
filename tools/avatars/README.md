# Avatar pipeline (Blender, headless)

Turns a source character (FBX + textures) into an ASCENT avatar: removes costume and weapon
pieces, covers bare skin, moves colours onto the brand palette, retargets the lobby
animations, and exports a web-ready GLB. Every texture edit keeps the original hand-painted
strokes — hue and value are moved, nothing is flat-filled.

Tested with Blender 5.1 (`D:\blender\blender.exe`). Run from this folder.

## 1. Unpack the sources

Each archive in `all assets and inispairation/3d/<name>/source/*.zip` is unpacked next to its
textures into `<raw>/<name>/source/_x/` (one FBX plus `T_<id>_<Part>_<Kind>.png` files).

## 2. Look at a character before editing it

```bash
blender -b --python slots.py -- <raw> <out> [name filter]   # one tile per material slot
py slots_sheet.py <out> [name filter]                       # labelled sheet per character
blender -b --python probe.py -- <raw> <folder> "<bone regex>" "<slot,slot>"   # bones + loose mesh islands
```

## 3. Describe the edit

Add an entry to `chars.py`:

| key | what it does |
| --- | --- |
| `delete` | material slots removed outright (capes, weapons, FX shells) |
| `delete_islands` | loose pieces of one slot picked by size and position (chains, brooches) |
| `soften` | pulls the vertices that follow some bones toward a pivot — a small sculpt on the rest mesh |
| `fabric` | turns a painted skin sheet into painted cloth (value structure kept) |
| `recolor` | HSV moves on a sheet (select by hue/saturation/value, then shift) |
| `tex_map` | a slot that borrows another slot's texture sheet |
| `anims` | which White Fox lobby clips to retarget (`idle`, `flourish`, …) |

## 4. Build

```bash
blender -b --python build_char.py -- <raw> <key> <work> --still --glb <work>/glb/<key>.glb
blender -b --python build_char.py -- <raw> <key> <work> --still --quick --raw   # unedited, same pose and framing
```

`--still` renders front / three-quarter stills, `--strip` a filmstrip of each clip, `--quick`
poses only the first frame (stills without the full bake), `--raw` skips every edit so a
before/after pair lines up exactly.

Copy the GLB to `site/public/models/` and add the avatar to `site/src/data/cast.ts`.

## Animation

All characters share the Unreal mannequin bone names. `retarget.py` copies each shared bone's
world rotation from White Fox (the only source that ships animations), scales the pelvis
travel by leg length, keeps the feet on the floor, and bakes plain keyframes.
