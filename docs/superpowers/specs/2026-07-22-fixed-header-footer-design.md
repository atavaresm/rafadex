# Fixed Header/Footer + App Version — Design Spec

**Date:** 2026-07-22
**Status:** Approved design, pending implementation plan

## What

A persistent brand header ("RafaDex" name + icon) and a new footer (company + app
version + build date), both fixed on screen across every route (Home, type-world,
detail, game) — never scrolling away, never re-rendered by route changes.

## Non-goals

- No change to the existing per-screen sticky bar (`topbar()` — type-world's type
  name, detail's back button + number/gen pill, game's "❓"). It keeps its current
  content and behavior; it only moves down to sit directly below the new header.
- No change to any Rafael-facing interaction: touch, swipe, audio, favorites,
  evolution strip, the game, search. Visual/layout-only change.
- No change to `data/dex.js`'s shape or the media pipeline.
- No automatic semantic-version bumping — the version string is a human-edited value
  (see below), not derived from git tags or commit counts.

## 1. Architecture

Today the "RafaDex" brand block only exists inside `renderHome()`, and every route
change does `elApp.innerHTML = ""` before rebuilding the screen — so nothing inside
`#app` can persist across routes. The header and footer move **outside** `#app`
entirely: they become static siblings of `<main id="app">` in `index.html`, written
once at page load, and are never touched by `renderRoute()`.

`renderHome()` drops its own `.brand` block (the persistent header replaces it
everywhere, including Home — no duplication).

## 2. Version source

A new plain-text file `VERSION` at the repo root (single line, e.g. `v1.3`) is the
human-edited source of truth — bump it by hand when cutting a release, the same way
`docs/superpowers/plans/` file names already mark rounds informally, but now visible
in the app itself.

`build.py` reads `VERSION`, combines it with the current UTC build date (same moment
already used for the service-worker version stamp), and writes a small generated file
`version.js`:

```javascript
window.APP_VERSION = "v1.3";
window.APP_BUILD_DATE = "22/07/2026";
```

`index.html` loads it via `<script src="version.js">`, same pattern as `data/dex.js`.
A one-time script (in `app.js`, run once at startup — not inside any render function)
fills the footer's text node from these two globals plus the fixed string `amaix.com`.
If `VERSION` is missing, `build.py` fails loudly (matches the pipeline's existing
"fail-loud missing-output" convention) rather than silently emitting a blank version.

## 3. Header

New fixed bar, `.app-header`, replacing today's scrolling `.brand`:

- `position: fixed; top: 0; left: 0; right: 0; z-index: 20; height: 48px;`
- `display: flex; align-items: center; gap: 8px; padding: 0 16px;`
- `background: var(--bg); border-bottom: 1px solid rgba(0,0,0,.06);`
- Icon: 26px-diameter ball (same red/black/white gradient as today's, scaled down
  from 40px, border 3px instead of 4px).
- Name: `RafaDex`, 18px, weight 800, `var(--red)` — down from today's 30px `h1`,
  per your "pode ser fonte menor" note.

The existing `.topbar` (type-world/detail/game screens) keeps every current rule
except one: `top: 0` becomes `top: 48px`, so it sits flush under the new header
instead of the viewport's very top. Its own `z-index: 10` is unchanged — lower than
the header's 20, so the header always paints on top during scroll.

## 4. Footer

New fixed bar, `.app-footer`, present on every screen (Home included):

- `position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;`
- `padding: 6px 16px calc(6px + env(safe-area-inset-bottom));`
- `background: var(--bg); border-top: 1px solid rgba(0,0,0,.06);`
- `text-align: center; font-size: 11px; color: #999;`
- Content: `amaix.com · v1.3 · 22/07/2026` (em dash-separated, filled at startup from
  `window.APP_VERSION`/`window.APP_BUILD_DATE` as described above).

This is parent-facing information (company/version/build date mean nothing to a
non-reading 3–6 year old) — same audience as the existing gear/search panel — but it
sits in the footer directly per your request, not tucked behind a panel.

## 5. Content reflow

`#app`'s padding changes from `padding: 12px 12px calc(20px + env(safe-area-inset-bottom));`
to `padding: 60px 12px calc(46px + env(safe-area-inset-bottom));` — top padding grows
by exactly the header's 48px height (plus the original 12px breathing room); bottom
padding grows to clear the footer's own rendered height with room to spare. No screen
needs its own per-screen adjustment; this one shared rule covers Home, type-world,
detail, and game uniformly, the same way `#app`'s padding already does today.

## Testing

- No new pytest for the version-string logic beyond what already covers
  `renderServiceWorker`'s timestamp generation — this adds one more build.py step
  (reading `VERSION`, writing `version.js`) that gets the same kind of unit coverage
  (file exists, contains the expected two `window.` assignments, fails loudly if
  `VERSION` is missing).
- Live verification per house rule, across all four screens: header and footer stay
  visible and correctly positioned while scrolling a long type-world grid and a tall
  detail screen; no content is ever hidden behind either fixed bar (check the Water
  type-world's last row of cards and the game screen's silhouette); the existing
  per-screen topbar still renders its correct content, just shifted down 48px; the
  footer shows the real `VERSION` file content and today's build date, not a
  placeholder.
