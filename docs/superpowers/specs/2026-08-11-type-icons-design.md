# Custom Type Icons — Design Spec

**Date:** 2026-08-11
**Status:** Approved design (via visual-companion brainstorming session), pending implementation plan

## What

Replace the app's 18 Pokémon-type icons — currently glyphs from the "Material Symbols Rounded" icon font — with custom-drawn SVG icons, extracted and hand-verified from reference artwork the user provided. This touches every place a type icon renders: the Home screen's type-selection grid, the small circular type badges shown on cards/detail screens, and the inline icon next to the type name in a type-world screen's header.

The user's explicit constraint, given during brainstorming: keep the existing container shapes (white square card on Home, colored circle badge elsewhere) and the existing per-type colors (`window.TYPES[key].color`, boosted via the existing `vividColor()` function) — only the icon *pictograms themselves* change.

## Where the icons came from

Produced through an iterative visual-companion session (mockups shown in-browser, user reacted to each round):

1. First attempt: hand-drawn SVG approximations — rejected ("não gostei").
2. User supplied a downloaded SVG trace of their reference image (`reference-image.svg`) — a multi-color auto-trace. Extracted 10 of 18 icons cleanly by isolating the white icon-shaped "hole" inside each colored circle subpath; the rest were contaminated by the tracer merging similar colors across multiple badges into one path.
3. A second, differently-quantized trace (`reference-image (1).svg`) didn't help (even more color-merging).
4. User pointed to a specific file by name, `pokemon-go-type-charts-v0-kupfs3jbfjfg1` — a *different* reference chart (English labels, different icon style) with a same-named `.svg` that turned out to be a clean **single-color** trace (no cross-badge color merging). Extracted Fighting, Poison, Flying, Ground, and Psychic from it, each individually verified by zooming into the live rendered chart and comparing shapes.
5. Rock's true icon (a circular refresh/recycle-arrow glyph in that file) has a bounding box nearly as large as its background circle, so the area-based extraction filter couldn't isolate it from the background — a hand-drawn fallback was tried.
6. User supplied one more file, `reference-image (2).svg` — a 2-color re-trace of the *original* reference image family. Rock extracted cleanly from it (a faceted gem/crystal chunk), so the final set has **zero hand-drawn icons — all 18 are extracted, verified vector shapes**.

Final approved result: `docs/superpowers/brainstorm/` session screenshots (not committed — ephemeral); the actual data is `data/type-icons.js` (see below), committed alongside this spec.

## The data format

`data/type-icons.js` (new file, committed with this spec) defines:

```js
window.TYPE_ICON_SVGS = {
  "normal": {"tx": ..., "ty": ..., "scale": ..., "d": "..."},
  "fire": {...},
  ... all 18 type keys (same keys as window.TYPES) ...
};
```

Each entry is one SVG `<path>` (`d`, in absolute-coordinate cubic-Bezier form, straight from the source trace) plus the `translate`/`scale` needed to normalize it into a shared `0 0 100 100` viewBox: `transform="scale(SCALE) translate(TX,TY)"` applied to a `<g>` wrapping the `<path>`. This mirrors the exact technique used during extraction (verified working in the brainstorming session).

## Where it's consumed (3 call sites in `app.js`)

1. **`renderHome()`'s type-grid** (`.type-btn` — white rounded-square card): icon rendered at 56px, colored via `vividColor(info.color, key)` — same color treatment as today, only the glyph source changes.
2. **`typeBadgeHtml(typeKey, sizePx)`** (`.type-badge` — colored circle, used for the small per-Pokémon type tags on grid cards and the detail screen): icon rendered in **white** (`#fff`) at roughly 62% of the badge's own size — matching today's icon-mode sizing ratio, dropping the old emoji-fallback sizing ratio (55%) since it's now unreachable (see Non-goals).
3. **`renderType()`'s header title** (`.type-icon-inline` — inline next to the type name in the topbar): icon rendered at 22px, colored via `vividColor(info.color, key)`, same as the grid.

All three currently read from `TYPE_ICONS` (the old font-glyph lookup object, `app.js:85-91`) and emit a `<span>` styled with either a CSS `color` (for the font glyph) or a `font-size`. They switch to reading `window.TYPE_ICON_SVGS` and emitting an inline `<svg>` sized via `width`/`height` attributes, with the path's `fill` set directly to the desired color (no more relying on CSS `color`/`font-family` for icon rendering).

## Non-goals

- **No change to container shapes, colors, or layout** — `.type-btn`, `.type-badge`, `.type-icon-inline`'s *positioning* (not its font-based styling, which goes away) are unaffected.
- **No change to the "Material Symbols Rounded" font itself or its `@font-face`** — it's still used for the header back-button glyph (`.app-header .back-btn`, unrelated to type icons) and stays exactly as-is, including its file.
- **The now-dead emoji fallback is removed, not preserved.** `TYPE_ICONS`'s old `icon || info.emoji` fallback path in `typeBadgeHtml()` (and the equivalent in `renderHome()`'s grid loop) was already documented as unreachable dead code before this change (a comment at `app.js:94-95` says so explicitly — every type already had a font glyph). Since `TYPE_ICON_SVGS` is complete-by-construction (all 18 keys, verified), there's no longer a data shape that could trigger the fallback, so it's deleted rather than carried forward as speculative defensive code.
- **No pipeline/`build.py` involvement.** `data/type-icons.js` is a hand-curated static asset (like the font files), not a `pokedex`-project-derived artifact — `build.py` doesn't touch it, and it isn't regenerated by any pipeline step.
- **No visual redesign of the icon *containers*** (no new border-radius, shadow, spacing) — purely a glyph swap.

## Testing

- No Python/pipeline changes — no `pytest` additions.
- Any `index.html`/`style.css` change (both happen here) needs a `python3 build.py` run before merge, per house rule, so `sw.js` gets a fresh precache stamp. `data/type-icons.js` must also be added to `sw.template.js`'s `SHELL_CORE` list (alongside `data/dex.js`) so it's precached for offline use, same as the rest of the core data.
- Live verification (house rule — green tests aren't enough for anything visual): serve locally, confirm all three call sites render the new SVG icons correctly — the Home type-grid (18 tiles), a detail screen's type badges (colored circle + white icon), and a type-world screen's header (small inline icon next to the type name). Spot-check a handful of specific icons against what was approved in the brainstorming session (Fire, Water, Fighting, Rock, Psychic at minimum, since those had the most back-and-forth). Confirm the back button (unrelated font glyph) still renders correctly, proving the shared font file wasn't broken.
- This is a real user-visible feature — needs its own **minor** version bump (new/changed pictogram set across the whole app) as part of its release PR into `master`, via `bump_version.py minor`.
