# Drawn-detail kit (`src/styles/kit.css`)

The reference menu never leaves a surface as a flat colour. These primitives are that craft in the
house rules: everything leans 12°, nothing is a stroke around a container, every colour is a
semantic token (`--grain` for tone textures, `--hi` / `--lo` for lit and shaded edges, the accents
for their own jobs), so each piece works in the black and the white theme.

Each primitive is a class for an empty decorative element that fills its positioned parent:
`<i className="k k-…" aria-hidden />` (put them in a wrapper with `overflow: hidden` and the
parent's radius/lean — see `.card-skin`, `.plate-skin`, `.btn-fx`). Tune them with the `--k-…`
custom properties. The SVG textures (noise, facets, brush, chevron) are written into the classes
themselves: never pass a `url()` through a custom property — it is re-resolved and re-rasterised on
every restyle. A pseudo-element that needs one copies the `url()` (as `.nav::before` and
`.lockup-tag::before` do).

Performance rule for HOME: the pointer parallax writes `--px` / `--py` onto each `.bg-layer` /
`.bg-city` (registered non-inheriting in `backdrop.css`), so the drawing inside a layer is never
restyled per frame. Don't set them on `.home` again — with the kit inside every card that halves
the frame rate.

| Class | Purpose | Usage |
| --- | --- | --- |
| `.k` | base: absolute, fills the parent, inherits its radius, no pointer events | always with one of the below |
| `.k-halftone` | dot field that fades out (`--k-ink`, `--k-step`, `--k-dot`, `--k-fade`, `--k-reach`); `.is-heat`, `.is-lo`, `.is-hi` tones | `<i className="k k-halftone" />` at the end of a plate |
| `.k-hatch` | fine stripes at the 12° lean (`--k-ink`, `--k-w`, `--k-step`); `.is-hazard` wide bands; `.is-fade` fades along `--k-fade` | `<i className="k k-hatch is-fade" />` |
| `.k-grain` | paper tooth (noise through a mask), `--k-o` strength; lighter on the white theme | last layer of a surface |
| `.k-facets` | low-poly planes in the theme tone (`--k-o`); `.is-b` second cut, `.is-hi` / `.is-lo` on a coloured fill | `<i className="k k-facets is-b" />` |
| `.k-ghost` | giant faint glyph inside a surface, text from `data-k` (`--k-size`, `--k-x`, `--k-y`, `--k-ink`) | `<i className="k k-ghost" data-k="04" />` |
| `.k-ticks` | registration marks in two opposite corners (`--k-in`, `--k-len`, `--k-ink`) | plates and chips |
| `.k-serial` | micro-label: the small print, led by a leaning block in `--k-ink` (heat by default) | `<span className="k-serial">Avatar 01 / 03</span>` |
| `.k-chevrons` | a run of chevrons travelling right (`--k-size`, `--k-ink`, `--k-dur`) | inside `.btn-fx` of the primary action |
| `.k-bevel` | lit top edge, shaded underside and one lit plane (`--k-hi`, `--k-lo`, `--k-plane`) | inside a card skin |
| `.k-drop` | hard comic offset that follows the shape (`--k-dx`, `--k-dy`, `--k-ink`) | on a real element, not a layer |
| `.k-speed` | thin tapered darts drifting along `--k-angle` (`--k-ink`, `--k-dur`) | promo art |
| `.k-brush` | dry-brush swipe of paint (`--k-ink`, heat by default) | under a name or a tag |
| `.k-rays` | slow burst behind an emblem (`--k-ink`, `--k-dur`) | behind the tier emblem, the cup trophy |
| `.k-shine` | a strip of light that crosses the surface now and then (`--k-a`, `--k-dur`, `--k-delay`) | `<span className="btn-fx k-shine">` |

Buttons (`ui.css`): `.btn` draws its slab with a lit top edge, a darker thickness, a folded corner,
a lit facet and a plane split (`--btn-edge`, `--btn-base`, `--btn-fold`, `--btn-lit`, `--btn-plane`);
an optional `<span className="btn-fx">` child takes kit layers in `--btn-ink`.
