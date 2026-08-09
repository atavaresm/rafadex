# Changelog

All notable changes to RafaDex by version. Dates are when each version shipped to
production (GitHub Pages). See `docs/diario-de-bordo.md` for the full story behind
each round.

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
