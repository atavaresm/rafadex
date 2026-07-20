# RafaDex — Design Spec

**Date:** 2026-07-19
**Status:** Approved design, pending implementation plan

## What

RafaDex is a Pokédex PWA for a 3–6 year old child who cannot read yet, installed on the
parent's iPhone via Safari "Add to Home Screen". It is a new standalone project derived
from the existing `~/project/pokedex` web dashboard: it reuses that project's PokéAPI
raw cache and hand-made pt-BR translations, but ships a brand-new child-first UI.

All navigation is image/color/sound based; text is decorative support only. All 1025
Pokémon (Gens 1–9) are included, with progressive offline caching.

## Non-goals

- No App Store / native / Capacitor build — PWA only.
- No changes to the original `pokedex` project (read-only dependency on its data).
- No text search, no stats/radar/compare screens, no scoring or fail states in the game.
- No online features beyond asset download: no links, no accounts, no notifications.

## Product & UX

Four screens, no reading required anywhere:

1. **Home** — 18 type "worlds" as giant colorful icon buttons; a favorites shelf at the
   top (only shown once at least one favorite exists); a prominent "Who's that Pokémon?"
   game button. No text search.
2. **Type world** — 2-column grid of large sprite cards, screen tinted with the type
   color. Tap card → detail.
3. **Detail** — giant sprite; three round obvious buttons: speak name (speechSynthesis
   pt-BR), play official cry, narrate the hand-translated pt-BR description. Favorite
   heart, ‹ › prev/next arrows (within the current type world, wrap-around), and the
   evolution chain as a tappable visual strip with animation + narration
   ("X evolui para Y").
4. **Game ("Who's that Pokémon?")** — black silhouette + cry plays; tap reveals the
   Pokémon with fanfare and confetti; big "next" button. No score, no losing.
   The game draws only from Pokémon whose assets are already cached (Gen 1 is always
   available), so it never stalls offline.

### Visual identity

Derived from the pokedex brand (Pokéball red, type-tinted cards) in a kid version:
rounded font **Baloo 2** embedded offline; very rounded corners; chunky buttons
(generous touch targets); springy/bouncy animations; a short CC0 sound effect on every
tap (pop, tap, fanfare), embedded locally. App icon: Pokéball with an "R". Standalone
display mode with splash screen.

### Child safety

No external links, no fetched remote text, fully offline after install. Loss of
connectivity never breaks the app.

## Architecture

New repo `~/project/rafadex`, standard git flow (master + develop, versioned
`.githooks/pre-push`), all repo artifacts in English, per `~/project/atm-system/STANDARDS.md`.
Frontend is vanilla JS/CSS/HTML (no framework, no bundler), same offline-first pattern
as pokedex: data loaded via `<script>` tags (`window.DEX`), not fetch, so the app also
works from `file://` during development.

### Data pipeline (Python, stdlib + ffmpeg)

RafaDex never calls the PokéAPI. `build.py` reads:

- `~/project/pokedex/data/raw/` (cached API JSON, ~181MB, 2620 files) and/or the
  already-normalized `~/project/pokedex/data/pokemon.json`;
- `~/project/pokedex/i18n-dex.js` (hand-made pt-BR category + flavor per Pokémon) and
  `i18n.js` (type names);
- `~/project/pokedex/data/sprites/{mini,official}/` (1025 + 1025 PNG) and
  `data/cries/` (1025 ogg).

and produces into `rafadex/`:

- `data/dex.js` — minimal `window.DEX`: id, ptName, types, evolution chain,
  pt-BR category + flavor; plus `window.TYPES` with pt-BR names and colors.
- `assets/sprites/thumb/{id}.webp` (128px, for grids) and
  `assets/sprites/full/{id}.webp` (512px, for detail) — converted with ffmpeg;
  target ~50–70MB total instead of 133MB PNG.
- `assets/cries/{id}.m4a` — converted with ffmpeg. **Critical: iOS Safari does not
  play .ogg**; without this conversion the app is mute on iPhone.

The pipeline source path to the pokedex project is configurable (constant at top of
`build.py`). Pipeline follows the house Python style (PascalCase classes,
lowerCamelCase functions/variables, ruff line-length 100).

Generated assets are committed to the repo (each file well under GitHub's 100MB limit;
total repo ~80–100MB — acceptable for GitHub Pages, no LFS).

### PWA layer

- `manifest.json` — name RafaDex, standalone, theme color Pokéball red, icons
  (including maskable) + `apple-touch-icon` and iOS splash meta tags.
- Hand-written `sw.js` (service worker), two-layer cache strategy:
  1. **Install precache:** app shell (HTML/CSS/JS/fonts/UI sounds/type icons),
     `data/dex.js`, and Gen 1 sprites+cries (~30MB) — first open is fast and Gen 1
     works offline immediately.
  2. **Runtime cache-on-demand:** sprites/cries of other generations cached on first
     view (cache-first, falling back to network).
  Plus a discreet parent-facing "download all" control per generation to pre-warm the
  cache before flights; and `navigator.storage.persist()` request so iOS does not
  evict the cache.
- Cache versioning: bump a version string in `sw.js` on deploy; old caches purged on
  activate.

### iOS-specific constraints (baked into the design)

- Audio requires a user gesture: first tap on Home unlocks audio playback.
- Cries as `.m4a` (AAC), see pipeline.
- `speechSynthesis` with best available pt-BR voice (e.g. "Luciana" on iOS/macOS),
  reusing the voice-selection approach from pokedex.
- Springy animations honor `prefers-reduced-motion`.

### Hosting & deploy

Public GitHub repo `rafadex`; GitHub Pages served from `master` via GitHub Actions
(push to master → deploy). `develop` is the working branch; features merge via PR per
the standard flow.

## Data flow

```
pokedex/data/raw + i18n-dex.js ──build.py──▶ data/dex.js + assets/ (committed)
index.html ──<script>──▶ window.DEX/TYPES ──app.js──▶ screens (hash-based routing)
sw.js ──precache/runtime cache──▶ offline
favorites ──localStorage──▶ home shelf
```

## Error handling

- Missing asset (sprite/cry not cached, offline): show placeholder silhouette / play a
  soft "pop" instead; never a broken image or JS error.
- speechSynthesis unavailable or no pt-BR voice: buttons still work with cry/sound
  fallback; narration button hidden if API absent.
- Pipeline: `build.py` fails loudly listing missing source ids; partial output is not
  written (build to temp dir, then swap).

## Testing

- **Pipeline:** pytest (`testXxx` naming) on normalization, evolution chain building,
  i18n merge, and asset manifest completeness (1025 thumbs, fulls, cries).
- **Frontend:** live smoke verification per the house rule (green tests are not
  enough for browser I/O): serve locally over LAN → open on the real iPhone →
  install to Home Screen → airplane mode → verify Gen 1 browsing, name TTS, cries,
  narration, game, favorites persistence.
- **PWA:** Lighthouse PWA audit passes; cache versioning verified on a second deploy.

## Implementation phases (for the plan)

1. Repo scaffold + data pipeline + asset conversion (with tests).
2. PWA shell: manifest, service worker, Home + Type world + Detail (visual, no sound).
3. Sound layer: TTS, cries, UI sounds, audio unlock.
4. Favorites + evolution strip.
5. "Who's that Pokémon?" game.
6. GitHub repo + Pages deploy + real-iPhone verification pass.
