# Rebrand RafaDex → Pokédex (vermelho) — Design Spec

**Date:** 2026-08-10
**Status:** Approved design, pending implementation plan

## What

The app just went live on a public custom domain (`amaix-dev.com/pokedex`), and the
user wants the branding to read as a generic "Pokédex" rather than "RafaDex" now that
the link isn't only shared with family. This is a two-part, purely cosmetic change:

1. **Rename** every user-visible occurrence of "RafaDex" to "Pokédex" (with the accent,
   matching the original `~/project/pokedex` project's title).
2. **Recolor** the app's institutional brand color (`--brand`, currently blue-indigo
   `#4b63d3`) to Pokémon red `#e3350d` — already used elsewhere in the codebase
   (`app.js`'s game-hit particle palette), so this doesn't introduce a new color to the
   project, it reuses one that's already there.

No functional change. No layout change. No new/removed UI text beyond the rename.

## Non-goals

- **`--bg` (cream `#fdf6ee`) and `--card` (white `#ffffff`) are untouched.** The user
  was explicit: only recolor what's currently blue; don't touch what's currently white
  or cream.
- **Per-type dynamic tinting is untouched.** `vividColor(tint, tintKey)` (used by
  `topbar()` on type/detail screens) is a separate color system from `--brand` and is
  not part of this change — world/detail screens keep their own type color (fire =
  orange, grass = green, etc.) exactly as today.
- **App icons** (`assets/icons/icon-192.png`, `icon-512.png`) are image assets, not
  CSS — recoloring them would mean regenerating artwork, out of scope here. If wanted
  later, that's a separate round.
- **No version bump / CHANGELOG entry** beyond what `build.py` does automatically for
  the precache stamp — this is a cosmetic patch, not a feature.

## Where "RafaDex" appears (all 4 sites)

1. `index.html` — `<title>RafaDex</title>` → `<title>Pokédex</title>`
2. `index.html` — `<meta name="apple-mobile-web-app-title" content="RafaDex">` →
   `content="Pokédex"` (this is the name iOS shows under the Home Screen icon)
3. `index.html` / rendered by `app.js`'s `resetHeaderToBrand()` — the header's
   `<span class="name">RafaDex</span>` → `"Pokédex"` (visible on-screen text)
4. `manifest.json` — `"name"` and `"short_name"` (both currently `"RafaDex"`) →
   `"Pokédex"`

## Where `--brand` (blue → red) applies (all 9 real usage sites)

The color is centered on one CSS custom property, `--brand: #4b63d3` (`style.css:2`),
consumed via `var(--brand)` at 6 CSS sites and 1 JS site, plus 2 sites hardcoded
outside the CSS variable entirely (theme metadata, must be updated by hand in
lockstep):

1. `style.css:2` — `--brand` definition → `#e3350d`
2. `style.css:44` — `.app-header .ball`'s gradient top half (the logo bolinha's top
   color)
3. `style.css:45` — `.app-header .name` (the "Pokédex" header text color)
4. `style.css:54` — `.app-footer` text color (the small `amaix.com · versão · data`
   line)
5. `style.css:101` — `.sound-row button.speaking` background (active/speaking state
   of the detail screen's sound buttons)
6. `style.css:103` — `.pill` text color (number/generation and power badges)
7. `style.css:114` — `.evo-strip img.current` outline (ring around the Pokémon
   currently viewed, in the evolution strip)
8. `app.js:143` — `renderHome()`'s `document.body.style.background = "var(--brand)"`
   (the Home screen's solid background — the only screen with a fixed, non-type
   background; picks up the new red automatically since it reads the same CSS
   variable)
9. `index.html:7` — `<meta name="theme-color" content="#4b63d3">` → `#e3350d`
   (iOS/Android browser-chrome tint)
10. `manifest.json:8` — `"theme_color": "#4b63d3"` → `#e3350d` (PWA install
    splash-screen/task-switcher tint)

Sites 2–8 update automatically once the `--brand` variable (site 1) changes — only
sites 9 and 10 need a manual hex edit since they live outside the CSS file.

## Implementation approach

- Straight find-and-replace, no new abstractions: 4 text edits for the rename, 1
  variable-value edit for the color, 2 hand-edits for the hardcoded hex in
  `index.html`/`manifest.json`.
- Per house rule (`CLAUDE.md`), any `index.html`/`style.css` change needs a
  `python3 build.py` run before merge so `sw.js` gets a fresh precache version stamp.

## Testing

- No pipeline logic touched — no `pytest` changes needed.
- Local verification before anything is sent: `python3 -m http.server 8000`, open in
  Chrome, confirm:
  - Browser tab title reads "Pokédex"
  - Home screen background is red, header text/logo-ball top half is red
  - A sound button turns red while "speaking" on a detail screen
  - Evolution-strip ring around the current Pokémon is red
  - `.pill` badges (number, power) show red text
  - A type screen (e.g. fire) still shows its own type tint, unaffected by the brand
    color change
  - Cream (`--bg`) and white (`--card`) areas are visually unchanged
- `manifest.json`'s `theme_color`/`name` changes only fully show up on a fresh Add to
  Home Screen install — note as a known limitation for live-device verification, same
  caveat as prior color rounds.
- Nothing gets pushed/deployed until the user explicitly approves the local test pass.
