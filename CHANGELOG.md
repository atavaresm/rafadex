# Changelog

All notable changes to RafaDex by version. Dates are when each version shipped to
production (GitHub Pages). See `docs/diario-de-bordo.md` for the full story behind
each round.

## v1.10.0 — 2026-08-20

### Changed
- Detail card's favorite button: heart emoji replaced with a CSS-drawn pokeball
  (grey when free, red/white/black when caught).

### Added
- Marking a Pokemon as favorite now speaks "Voce capturou <name>!" through the
  existing text-to-speech pipeline. Unfavoriting stays silent.

## v1.9.1 — 2026-08-11

### Fixed
- Rock's type icon was rendering clipped/off-canvas (a normalization bug fitted the
  scale to only one of its 3 subpaths). Fighting, Poison, Flying, Ground, and Psychic
  carried an extra background-disc shape that degraded badly at small badge/header
  sizes. Re-extracted all 6 from source and verified live.

## v1.9.0 — 2026-08-11

### Changed
- Replaced all 18 Pokémon-type icons (Home screen grid, per-Pokémon type badges,
  type-world header) with custom-extracted SVG pictograms, dropping the "Material
  Symbols Rounded" icon font for this purpose (the font itself stays, still used for
  the back-button glyph).

## v1.8.1 — 2026-08-11

### Fixed
- `version-check` CI gate now also verifies `version.js` matches `VERSION`, closing
  the blind spot that let a stale `version.js` ship silently in the v1.7.1 round.
- `CLAUDE.md` corrected: `build.py`'s real output list (`version.js`, `sw.js`) and
  `bump_version.py` are now documented.

## v1.8.0 — 2026-08-11

### Added
- Info page ("Sobre o Pokédex"): a new ℹ️ button on Home opens a page telling the
  app's origin story and linking to the public GitHub repo for browsing the code,
  filing bugs, or suggesting improvements.

## v1.7.1 — 2026-08-11

### Changed
- Retroactively documents the RafaDex → Pokédex rebrand (name change, institutional
  color from blue-indigo to Pokémon red) that shipped under v1.7 without a version
  bump on 2026-08-10.
- Introduces `bump_version.py` and a CI check (`version-check.yml`) that blocks any
  release PR into `master` where `VERSION` hasn't increased — so this can't happen
  again.

## v1.7 — 2026-08-10

### Removed
- Removed the cry-audio generation pipeline and the 1,025 committed `.m4a`
  cry files (~13MB) from the repo.
- Removed all remaining client-side references to cry audio; the
  per-generation download no longer includes cry audio.
- Added an active service-worker cache purge so devices that already
  downloaded cries before this round reclaim that space on the next update.

## v1.6 — 2026-08-05

### Changed
- Merged the fixed app header and the per-screen context bar into a single bar;
  it now hides on scroll to free up space, and the back control is a real back
  icon instead of an emoji.

### Removed
- Removed the Pokémon cry sound button (⚡) from the detail screen and the cry
  sound played at the start of each "Quem é esse Pokémon?" round. The `.m4a` cry
  pipeline and the per-generation download feature were left intact.

## v1.5 — 2026-08-04

### Changed
- Institutional color palette: header/footer moved from red/yellow to blue-indigo.
- Home screen inverted to a blue background with white type cards, icon tinted
  per type.
- Replaced the Fredoka display font with Quicksand; Ghost and Dragon types got
  real icons in place of placeholders.
- Flying got a raven icon, Psychic got an eye icon.
- Reserved `env(safe-area-inset-top)` on the fixed header so it clears the
  iPhone notch/Dynamic Island.
- Type-world screen title now uses the same per-type icon shown everywhere else.
- Grid cards ("mon-card") redesigned with a translucent glass background and a
  colored border.

### Fixed
- Restored 16 original `TYPE_ICONS` Unicode codepoints that had been lost in an
  earlier transcription.

## v1.4 — 2026-08-03

### Changed
- Visual identity v2 ("Vibrant Toy" direction): replaced per-type gradients with
  flat, vivid colors plus a shine highlight.
- Self-hosted the Fredoka display font and the Material Symbols Rounded icon
  font (no CDN dependency).
- Added a `vividColor` helper and a type-icon lookup; flat circular icon badges
  applied across Home, grid cards, and the detail screen topbar.
- Added a drop shadow under Pokémon sprites on grid cards and the detail screen.

### Fixed
- Tuned `vividColor` output for Grass, Bug, Steel, and Fairy, which were coming
  out too washed out or too dark.

## v1.3 — 2026-07-22

### Added
- Visual design system inspired by official Pokémon TCG cards: diagonal
  per-type gradients (channel-by-channel lighten/darken, not HSL), circular
  type badges, and white number/generation/type/power seals.
- Fixed header ("RafaDex") and fixed footer (company, app version, build date)
  present on every screen.
- `VERSION` file plus a `build.py`-generated `version.js`, powering the
  footer's version and build-date display.
- Automatic service-worker cache versioning on every build.

### Fixed
- Added `version.js` to the service worker precache list so the footer keeps
  working offline.

## v1.2 — 2026-07-22

### Added
- Sticky header.
- Search by name.
- First pass at automatic service-worker cache versioning (hardened further
  in v1.3).

### Fixed
- Evolution strip overflow bug on Eevee's 8-branch evolution tree.
- Grid scroll position now restored when navigating back from a detail card.

## v1.1 — 2026-07-21

### Added
- Swipe gesture on the detail card, in addition to the arrow buttons.
- Tapping the same 🔊/📖 button again now stops narration (play/pause toggle),
  applied consistently to the evolution strip and the game too.
- Hand-verified name pronunciation (`pronounce-dex.js`) covering all 807 Gen
  1–7 Pokémon.
- Grid cards enriched with number, generation, type(s), and total stat power.

## v1.0 — 2026-07-21

### Added
- Initial release: data and asset pipeline, PWA shell, type and detail screens.
- Offline service worker: Gen 1 precache, on-demand caching for the rest, and a
  "download generation" control.
- Audio: official cries, pt-BR text-to-speech, synthesized UI sounds.
- Favorites, evolution strip, and the "Quem é esse Pokémon?" game.
- Icons and the GitHub Pages deploy.
