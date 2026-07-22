# RafaDex Visual Design System — Design Spec

**Date:** 2026-07-22
**Status:** Approved design (via visual brainstorming companion), pending implementation plan

## What

A visual refresh inspired by the official Pokémon TCG card design
(`pokemon.com/br/pokemon-estampas-ilustradas/cartas-de-pokemon`), applied consistently
across the three places RafaDex already uses a Pokémon's type color: the Home screen's
type-world buttons, the type-world grid cards, and the detail screen. The goal is a
richer, more "collectible card"-like feel without adopting a literal card frame/border —
keeping RafaDex's existing open, playful layout.

This was brainstormed visually (mockups + iteration) rather than from a text
description; the approved result is captured below in enough detail to implement
without re-deriving the visual decisions.

## Non-goals

- **No hard card-frame border.** The reference's gold border + fully boxed card layout
  was shown as an option ("C") and explicitly rejected in favor of the lighter,
  gradient-background treatment ("B") that preserves today's open/spacious feel.
- **No custom-drawn icon set.** A fully custom SVG icon per type (18 icons, matching
  the reference's illustrated energy symbols) was shown as an option and rejected.
  Type icons remain the existing emoji (`window.TYPES[t].emoji`); only their
  presentation changes (see "Type badges" below).
- **No change to Rafael-facing interaction**: arrows, swipe, favorites, evolution
  strip navigation, the game, and audio are all unaffected — this is a visual-only
  pass over color/background/typography treatment.
- **No change to the 18 type base colors** already defined in `build.py`'s `TYPES`
  dict / `window.TYPES` — the gradient and badge treatments are derived from those
  existing hex values, not a new palette.

## 1. Gradient backgrounds (replacing flat color/tint)

Every place that currently uses a type's flat base color or a flat translucent tint
gets a diagonal gradient instead: light → base → dark, in that type's own hue.

**Formula:** given a type's base hex color `C` (from `window.TYPES[key].color`),
derive `light`/`dark` by interpolating each RGB channel toward white/black — not an
HSL-lightness shift (a percentage-point HSL adjustment on an already-mid-lightness
color like fire's `#f08030` washes out too fast; channel interpolation toward the
white/black endpoint is gentler and matches what was approved in the mockups):

```
lighten(channel, pct) = channel + (255 - channel) * pct   // pct = 0.35 for `light`
darken(channel, pct)  = channel * (1 - pct)                // pct = 0.25 for `dark`
```

Applied per R/G/B channel, then re-encoded to hex. Example for fire (`#f08030` =
`240,128,48`): `light` ≈ `#f5ac78`, `dark` ≈ `#b46024`.

- Rectangular surfaces (Home type buttons, grid cards, the detail/type-world tinted
  background): `linear-gradient(160deg, light 0%, C 55%, dark 100%)`
- Circular type badges (see section 2): `radial-gradient(circle at 30% 30%, light, C 60%, dark)`

Lightening/darkening is computed at render time from the single stored hex — no new
color values are hand-authored per type, keeping `window.TYPES` as the single source
of truth for type color.

**Applies to:**
- Home screen type-world buttons (`.type-btn`) — gradient fills the whole tile.
- Type-world grid cards (`.mon-card`) — gradient fills the whole card (replacing the
  current flat white background).
- The shared tinted background mechanism used by `topbar(title, backHash, tint)` —
  currently sets `document.body.style.background = tint + "33"` (a flat 20%-alpha
  tint). This becomes the same gradient formula, applied as the page background.
  This mechanism is shared by the type-world screen, the detail screen, and the game
  screen (`topbar("❓", "#home", "#ffcb05")`) — the change applies uniformly
  everywhere `topbar` is called with a tint, since it's one shared code path, not a
  per-screen special case.

## 2. Type badges (replacing bare inline emoji)

Anywhere a type's emoji appears **small and inline** (not as a big Home tile, which
is already its own "badge" by virtue of being a whole gradient tile), it now renders
inside a small circular badge using that type's own radial gradient (section 1),
instead of a bare emoji floating with no visual container.

**Applies to:**
- The detail screen's type indicator (today: bare emoji next to the back button,
  e.g. "🔥 🪽" for Charizard) — becomes one circular badge per type.
- The grid card's corner type indicator (today: bare emoji in `.mon-meta`) — becomes
  one circular badge per type, same treatment at a smaller scale.

**Does not apply to:** the Home screen's type-world buttons — the whole tile is
already the gradient "badge" for that type; nesting another circular badge inside it
would be redundant. Home tile icons instead get **larger**: the emoji grows from the
current 44px to approximately 56px so it visually dominates the tile (this was the
one direct sizing correction from the mockup review — the icon read as too small
relative to the square).

## 3. Corner info pills (number/generation, power)

Both the detail screen and the grid card show, in their top corners: Pokédex
number+generation on the **left**, and type badge(s) + power total on the **right**
— but as a single compact **row**, not a vertical stack. This was a direct
correction from the mockup review: a vertical stack of number/gen, then type
badge(s), then power grows taller with each additional type badge (a dual-type
Pokémon) and can creep down far enough to overlap the sprite artwork below it. A
single horizontal row stays the same height regardless of how many type badges a
Pokémon has.

Both the number/generation text and the power number render inside a **white/cream
pill** (`rgba(255,255,255,.92)` background, rounded, subtle drop shadow) with text
in the app's existing brand red (`var(--red)`, `#e3350d`) — not a per-type shade.
Using the one fixed brand color for pill text (rather than a new per-type "darker
shade" convention) keeps this legible against any of the 18 gradients and matches
the existing pattern already used for `.mon-power` in the current codebase.

**Layout, left to right, in the right-side row:** type badge circle(s) first, then
the power pill last.

**Detail screen specifically:** the back button (top-left) and the number/generation
pill sit on the same row; the type badge(s) + power row sits directly below,
right-aligned, before the hero sprite.

**Grid card specifically:** both rows sit inside the existing `.mon-meta` corner
overlay, unchanged in that it must never intercept the card's tap (still
`pointer-events: none` on the container).

## 4. Typography

Pokémon names (on both the detail screen and, implicitly, wherever else a name is
shown over a gradient) keep the existing Baloo 2 font but gain a subtle drop text
shadow (`0 2px 4px rgba(0,0,0,.35)` on the detail screen's larger name; a lighter
`0 1px 2px rgba(0,0,0,.3)` at smaller sizes like the grid card name and type labels)
so bold light-colored text stays legible against a busier gradient background
instead of a flat tint. No font-size or weight changes beyond what's already
described above (Home tile icon size) — Baloo 2's existing boldness was judged
sufficient once the shadow and gradient are in place.

## 5. What stays exactly as it is

- Sound-row buttons, heart button, and nav-arrow buttons: unchanged white circles.
- Evolution strip: unchanged (current-stage outline, thumbnails, scroll behavior).
- The parent-facing gear/search panels: unchanged.
- All Rafael-facing interaction, audio, favorites, swipe, and game logic: unchanged.

## Implementation notes (for the plan)

- A single JS color-shading helper (lighten/darken a hex by a percentage) is needed
  once and reused everywhere a gradient or badge is rendered — this avoids
  hand-authoring 36 extra color values across 18 types.
- This is a CSS/markup-level visual change layered onto existing render functions
  (`renderHome`'s type buttons, `renderType`'s grid cards, `renderDetail`'s topbar
  and corner meta, `topbar()`'s tint mechanism) — no new screens, no new data, no
  change to `data/dex.js`'s shape.

## Testing

- No new pipeline/Python behavior — this is frontend-only, so no `pytest` additions.
- Live verification per house rule, across the three surfaces: Home buttons (icon
  size, gradient), grid cards (corner row layout with a dual-type Pokémon like
  Charizard to confirm the single-row fix holds), and the detail screen (same
  dual-type check, text legibility against the gradient, back-button row).
- Spot-check at least one type on each end of the lightness spectrum (e.g. a light
  base color like Fada `#ee99ac` and a dark one like Sombrio `#705848`) to confirm
  the lighten/darken formula doesn't wash out or over-darken either extreme.
