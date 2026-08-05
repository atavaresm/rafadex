# RafaDex Merged Header — Design Spec

**Date:** 2026-08-04
**Status:** Approved design (brainstormed with a live in-app mockup), pending implementation plan

## What

On every screen except Home, RafaDex currently stacks two persistent bars at the
top: the fixed `.app-header` ("RafaDex" wordmark + Pokéball, always present) and,
right below it, a `position: sticky` `.topbar` (back button + context — a type name,
or a pill of Pokédex metadata on the detail screen). Together they permanently
occupy roughly 120-150px of vertical space (header height plus safe-area-inset-top,
plus the topbar's own padding and back-button height) on every screen that has
navigation context — which is most of the app, and specifically the type-world grid
screen the user was looking at when this came up, where that's a large fraction of
a phone screen eaten by chrome instead of Pokémon.

This spec merges the two bars into one, and makes that single bar hide while
scrolling down and reappear while scrolling up (or at the top), so a Pokémon grid
gets the full screen while actively browsing. It also replaces the back button's
icon — currently the emoji "⬅️", the last remaining emoji in the app's navigation
chrome — with a real icon from the same self-hosted Material Symbols Rounded font
already used everywhere else.

## Non-goals

- **No change to the footer** (`.app-footer`) — the user's complaint was specifically
  about the header eating space; the footer is a single thin line and wasn't raised.
- **No change to what each screen's header shows** — Home still shows the "RafaDex"
  wordmark; type-world still shows the type icon + name; detail still shows the
  `#num · Gen` pill on the right; the game screen still shows "❓". Only the
  structure (one bar instead of two) and behavior (hide-on-scroll) change, not the
  content per screen.
- **No change to any icon other than the back button.** This is not a broader icon
  audit — Rock and Bug's icons are intentionally staying as-is (decided in an
  earlier round), and this spec doesn't revisit that.
- **No new functional text.** The header still carries zero information the app
  doesn't already convey by icon/color — the type name text is decorative
  reinforcement, exactly as it is today.

## The merged bar

**Structure:** `.app-header` (already a fixed element present in `index.html` on
every screen) becomes the single, dynamic bar. Instead of `topbar()` creating and
returning a separate `.topbar` element for `renderType()`/`renderDetail()`/
`renderGame()` to append into `#app`, `topbar()` now directly rewrites
`.app-header`'s content: a back button, then either a title (type-world, game) or
right-aligned content (detail's pill), using the same `split`/non-split layout
distinction the old `.topbar` had. `renderHome()` calls a new `resetHeaderToBrand()`
that puts the "RafaDex" wordmark + Pokéball back, since Home has no back button or
context title.

**Sizing:** the merged bar keeps the existing `.app-header` height
(`48px + env(safe-area-inset-top)`) — it does not grow to accommodate the old
topbar's larger title (24px) or padding; the title shrinks to the header's existing
18px/800-weight styling (same as the "RafaDex" wordmark it replaces), and the back
button shrinks to a smaller icon-button matching the header's compactness (validated
in the mockup — still comfortably tappable). This is the entire space saving: one
~48-56px bar instead of two bars totaling ~120-150px.

**`#app`'s top padding is unchanged.** It already exists to clear the header height
plus a small gap on every screen (Home has always relied on it with no second bar);
removing the separate `.topbar` element means every screen now uses that same
existing padding uniformly — no new spacing value needed.

## Hide-on-scroll

A single scroll listener (registered once, module scope) tracks scroll direction:
scrolling down past a small threshold hides the bar (`transform: translateY(-100%)`,
animated), scrolling up — by any amount, immediately, not only at the very top —
reveals it again. This applies uniformly on every screen (same shared header
element), including Home, for one consistent mechanism rather than a per-screen
special case.

Validated live in the mockup on the type-world grid (the screen this was reported
against): scrolling down through Fogo's Pokémon list hides the bar and the cards
use the freed space; scrolling up brings it back immediately.

## Back button icon

Replaces the emoji "⬅️" with Material Symbols Rounded's `arrow_back` glyph,
codepoint **U+E5C4** — found by inspecting the same full variable font this app's
icon subset is already built from, and confirmed to render correctly in isolation
before this spec was written. Same rendering mechanism as every other icon in the
app (`TYPE_ICONS`, the type badges): a literal Unicode codepoint in a `<span>`
styled with `font-family: "Material Symbols Rounded"` and the app's standard
variation-settings (`"FILL" 0, "wght" 500, "GRAD" 0, "opsz" 40`), not ligature text.

**Font asset:** the existing self-hosted subset (18 glyphs, 6.7KB) is regenerated
to include this one additional codepoint (19 glyphs, 6.85KB — still tiny). The
regenerated file already exists on disk at `assets/fonts/materialsymbolsrounded.woff2`,
prepared and verified the same way every previous icon addition to this font was
(`pyftsubset --unicodes=<hex list>`, direct PUA codepoints, not
`--text=<ligature name>` — see the visual-identity-v2 plan's appendix for why
ligature-based subsetting doesn't work for this font). All 19 codepoints —
the 18 already in `TYPE_ICONS` plus `e5c4` — were verified present in the new
subset via `fontTools`, and `arrow_back` was rendered standalone in a real browser
tab to confirm it looks correct before being wired into the app.

## Where it applies (code, for the implementation plan)

- `index.html` — no change (the `.app-header` element already exists; its content
  is now dynamic instead of static, so its two child spans move from inline HTML
  into JS-generated content).
- `app.js`:
  - `topbar(title, backHash, tint, rightContent, tintKey)` — rewritten to mutate
    `.app-header` instead of creating a new `.topbar` element; its 3 existing call
    sites (`renderType`, `renderDetail`, `renderGame`) no longer wrap the call in
    `elApp.append(...)` since there's nothing to append.
  - New `resetHeaderToBrand()`, called from `renderHome()`.
  - New scroll listener (module scope, registered once).
  - Back button icon changes from the emoji string to the `arrow_back` codepoint.
- `style.css`:
  - `.app-header` gains the hide/show transition and `.hidden`/`.split` states,
    plus title/back-button styles sized for the merged bar (currently `.topbar`'s
    equivalent rules).
  - The now-orphaned `.topbar`, `.back-btn`, `.topbar .title`, `.topbar.split`
    rules are removed — nothing will create a `.topbar` element anymore, and
    leaving dead CSS behind would be misleading to the next person touching this
    file.
  - `#app`'s padding-top: unchanged (see above).
- `assets/fonts/materialsymbolsrounded.woff2` — replaced (already done, see above).

## Testing

- Frontend-only visual/behavioral change — no `pytest` additions.
- Live verification per house rule:
  - Home: still shows the "RafaDex" wordmark + Pokéball, no back button, no
    hide-on-scroll surprise (confirm scrolling Home's type grid still hides/shows
    the bar correctly, since the mechanism is now shared).
  - A type-world screen (e.g. Fogo): single compact bar (back + icon + name),
    hides scrolling down, reappears scrolling up, matches the mockup.
  - Detail screen: single bar with back button on the left and the `#num · Gen`
    pill on the right (the `split` layout), same hide/show behavior.
  - Game screen: single bar, back button + "❓".
  - Back button: renders as a real arrow icon everywhere, not emoji, not an empty
    box (the exact regression class every previous icon-codepoint round had to
    guard against — verify byte-for-byte if the codepoint is hand-edited anywhere
    during implementation, per the established house lesson).
  - Confirm tapping the back button still navigates correctly from every screen.
- Per house rule: `python3 build.py` before merge so `sw.js` gets a fresh precache
  version stamp (this round also changes a precached font file, so double-check
  production verification includes a hard reload of the font specifically, not
  just `app.js` — the exact pitfall two of the last three visual rounds hit).
