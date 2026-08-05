# RafaDex Type-Grid Cards — Glass Redesign — Design Spec

**Date:** 2026-08-04
**Status:** Approved design (brainstormed with live mockups), pending implementation plan

## What

Phase 4 of the "own identity, not generic Pokédex" brand round (after institutional
color, Home inversion, and the font/icon refresh — see the diary for the full phase
history). Replaces the type-world grid cards' (`.mon-card`, rendered in
`renderType()`) current look — the whole card filled solid with the vivid type color,
name in white text — with a translucent "glass" card: a neutral white-tinted,
blurred background that lets the screen's own color show softly through, a colored
border in the card's own Pokémon's primary-type color, and the name in dark ink text.

## Why this shape (two rejected variants first)

Three live mockups were built and screenshotted directly in the running app (not as
static comps) before landing on this one:

1. **White card, dark text, colored border** — clean, but the user wanted more of a
   "glass" feel than a flat white-and-line look gives.
2. **White card, name on a colored strip at the bottom** — same feedback: not the
   "efeito de vidro" (glass effect) the user was picturing.
3. **True glass**: card background = the Pokémon's own primary-type vivid color at
   ~40% opacity, plus `backdrop-filter: blur+saturate`, white text. This nailed the
   "glass" feel on single-type Pokémon, but broke down on dual-type Pokémon whose
   primary type color differs sharply from the type-world page's own color — e.g.
   Zekrom (Dragão/Elétrico, dragon-purple primary color) viewed on the Elétrico
   (yellow) page rendered as a muddy brown, because the translucent card blended its
   own tint with the yellow bleeding through from behind. This is inherent to real
   backdrop transparency, not a bug: two very different hues mixed at partial
   opacity produce a muddy third color.

The approved design keeps the true `backdrop-filter` glass texture from variant 3,
but makes the card's own fill color-neutral (white-tinted, not type-tinted) so there
is nothing to muddy — the type identity moves entirely to the border, which sits on
top of the blur rather than blending into it.

## Non-goals

- **No change to the detail screen** (`.detail`, `.mon-name`, hero image area) —
  that is Fase 5, not started.
- **No change to Home** — already inverted (white cards on blue) in Fase 2; not
  touched here.
- **No change to `.shine::before`** — the existing diagonal highlight overlay used
  on `.bounce.shine` elements is untouched; it layers on top of the new glass
  background without conflict (confirmed in the live mockups).
- **No change to `.mon-grid`'s column count.** `.mon-grid` (the Pokémon list on a
  type-world screen) has always been 2 columns and stays 2 columns. This is a
  different grid from the Home type-selector grid (`.type-grid`), which the user
  separately decided stays at 3 columns in an earlier round — the two decisions are
  unrelated and this spec touches neither column count.
- **No new color logic.** The per-card border color reuses `vividColor()` with the
  same inputs (`mon.types[0]`, that type's `color`) already used for type badges
  and the Home/type-world header icons — no new palette or formula.

## Visual spec (from the approved mockup)

`.mon-card`:
- `background: rgba(255,255,255,.55)`
- `backdrop-filter: blur(14px) saturate(160%)` (plus a `-webkit-backdrop-filter`
  duplicate for Safari/iOS, which needs the prefix)
- `border: 2px solid <per-card color>` — color is set inline per card (see below),
  not a fixed value in the CSS rule
- `box-shadow: 0 6px 20px rgba(0,0,0,.12)` — a soft, blurred, floating shadow. This
  is a **deliberate, scoped exception** to the app's shared `--shadow` token (the
  flat "gummy" `0 6px 0` offset shadow used everywhere else — buttons, panels,
  badges): a flat gummy shadow reads wrong under a blurred translucent surface,
  where a soft floating shadow reads right. No other component's shadow changes.

`.mon-card .name`:
- `color: var(--ink)` (was `#fff`)
- `text-shadow` removed (was `0 1px 2px rgba(0,0,0,.3)`) — no longer needed against
  a light, ink-readable background

`renderType()` in `app.js`:
- The line that currently sets `card.style.background = vividColor(...)` instead
  sets `card.style.borderColor = vividColor(window.TYPES[mon.types[0]].color,
  mon.types[0])` — same color computation, applied to the border instead of the
  fill.

## Where it applies

Exactly three touch points, all already identified by file and current line number:

1. `style.css` — `.mon-card` rule (currently `style.css:74`) — background, border,
   backdrop-filter, and box-shadow rewritten as above.
2. `style.css` — `.mon-card .name` rule (currently `style.css:80`) — color and
   text-shadow changed as above.
3. `app.js` — `renderType()` (currently `app.js:199`) — the inline background
   assignment becomes an inline border-color assignment.

No other rule or file changes. `.mon-meta`, `.mon-typepower`, `.pill`,
`.type-badge`, and `.shine::before` are unmodified and were confirmed in the live
mockups to keep working correctly layered on the new card.

## Testing

- Frontend-only visual change — no `pytest` additions.
- Live verification per house rule, specifically checking:
  - A strong, saturated type (e.g. Fogo) — border pops, text stays legible, glass
    tint of the page color is visible through the card.
  - A pale/light type (e.g. Elétrico) — card doesn't wash out against the page,
    dark text stays legible.
  - A dual-type Pokémon whose primary type differs sharply from the type-world
    page's own color (e.g. Zekrom on the Elétrico page) — confirm no muddy color
    blend. This is the exact defect that ruled out the tinted-glass variant, so
    it's the one regression this design must not reintroduce.
  - `backdrop-filter` unsupported fallback: on a browser/WebKit path without
    support, the card should degrade to a flat translucent white card (no blur) —
    still legible and on-brand, not visually broken.
- Per house rule: `python3 build.py` before merge so `sw.js` gets a fresh precache
  version stamp.
