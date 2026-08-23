# Pokémon Capture Game — Design Spec

**Date:** 2026-08-23
**Status:** Approved design, pending implementation plan

## What

A new game mode inside RafaDex: catching Pokémon is the core loop, battling is a small
secondary loop. Simplified, no-reading version of *Pokémon Let's Go, Pikachu!* — no
GPS, no real-world walking. Rafael taps a "grass" map to trigger encounters, drags a
Pokéball onto the Pokémon to attempt a catch, and can battle a captured Pokémon against
a random opponent for fun (and a bonus catch on a win).

## Non-goals

- No GPS / real-world walking mechanic (explicitly rejected by the parent).
- No permanent loss: a Pokémon that resists capture never "runs away for good"; a lost
  battle has no penalty. Both can be retried immediately, indefinitely.
- No type advantages/weaknesses in battle, no levels, no stat growth.
- Pool is Generation 1 (Kanto, #1–151) only — not all 1025.
- Not merged with the existing Pokédex "favorite" collection (`Favs`) — this game keeps
  its own separate "caught" collection, by design decision (two distinct notions of
  "captured": manual dex favorite vs. in-game catch).
- No changes to the existing "Who's that Pokémon?" silhouette game — it stays as is,
  this is an additional, separate mode.

## Product & UX

Three new screens, reachable from a new Home button, all image/color/sound only (no
text required to play), consistent with RafaDex's kid-first constraint (3–6yo,
non-reader):

1. **Home** — new button "🎣 Capturar Pokémon" next to the existing
   "❓ Quem é esse Pokémon?" button. Both coexist.
2. **Grass map (`#capture`)** — a row/grid of tappable grass patches. Tapping one rolls
   for an encounter (~40% chance):
   - **Miss:** the patch shakes/rustles and settles, no Pokémon, no penalty — tap
     another (or the same) patch again.
   - **Hit:** a random Gen 1 Pokémon appears center-screen, bouncing, with a draggable
     Pokéball at the bottom of the screen.
3. **Capture interaction** — Rafael drags the Pokéball toward the Pokémon and releases.
   Any drag-and-release toward the Pokémon's area counts as a throw attempt (no
   precision aiming required — motor skills of a 5yo). Each throw has a fixed capture
   chance (~60%):
   - **Success:** ball closes with a sparkle + catch sound, TTS says "Você capturou
     `<nome>`!", the Pokémon is added to the game's caught collection, screen returns to
     the grass map to keep exploring.
   - **Failure:** ball bounces off, the Pokémon stays on screen, Rafael can drag and
     throw again immediately — no limit on attempts, no fleeing.
4. **Collection** — a grid of caught Pokémon (same card visual language as the existing
   Pokédex grid), reachable from the capture screen. Tapping a card opens the existing
   Pokédex detail screen for that Pokémon (reused as-is).
5. **Battle (`#battle`)** — reachable only once at least one Pokémon has been caught in
   the game (button disabled/hidden otherwise, nudging Rafael to catch first):
   - Select screen: grid of his caught Pokémon, tap one to use.
   - A random Gen 1 Pokémon (any of the 151, caught or not) is rolled as the opponent.
   - Battle screen: both sprites with HP bars, one big "⚔️ Atacar!" button. Each tap
     drops the opponent's HP by a fixed amount; after a short delay the opponent
     auto-counterattacks, dropping Rafael's Pokémon's HP by a fixed amount. First to 0
     HP ends the battle.
   - **Win:** celebration animation + TTS; if the opponent isn't already in the caught
     collection, it's added ("winning a battle can also net a new catch").
   - **Loss:** neutral, non-punishing feedback ("Não foi dessa vez!"); no state change,
     free to retry immediately — same no-frustration principle as capture failure.

### Visual identity

Matches the existing RafaDex visual system: Baloo 2 font, rounded chunky touch targets,
springy animations, short CC0 sound effects, type-tinted where relevant. No new visual
language introduced.

## Architecture

Two new vanilla JS modules, loaded via `<script>` tag like the existing `audio.js` and
`pronounce-dex.js` (no framework, no bundler, no `fetch()` for data — same pattern as
the rest of RafaDex):

- **`capture.js`** — grass map render + encounter roll, drag-to-throw capture minigame
  (pointer events: `pointerdown`/`pointermove`/`pointerup`, no `<canvas>`), collection
  grid render.
- **`battle.js`** — Pokémon-select render, opponent roll, battle screen render and
  tap-to-attack loop.

New hash routes wired into the existing router in `app.js`: `#capture`, `#collection`,
`#battle`.

### State

```js
GameCaught = {
  key: "rafadex.game.caught",
  list() { ... },   // ids caught in the game, Gen 1 only
  has(id) { ... },
  add(id) { ... },
};
```

Same shape and localStorage pattern as the existing `Favs` module in `app.js`, but a
distinct key and a distinct module — intentionally not shared with `Favs`.

### Reuse

- `byId` (Pokémon data lookup) and `sprite()` (sprite path helper) from `app.js`.
- The existing text-to-speech pipeline (`pronounce-dex.js`) for capture/battle voice
  feedback, same pipeline already used for "Você capturou `<nome>`!" on the dex
  favorite toggle.
- The existing Pokédex detail screen, opened from the collection grid — no new detail
  UI is built.
- `Sound.unlock()` global audio-unlock-on-first-tap pattern already in `audio.js`.

## Error handling / edge cases

- Battle entry point disabled until `GameCaught.list()` has at least one entry.
- Re-catching an already-caught Pokémon (via map or battle win) is a no-op on the
  collection (no duplicates) but still plays the full success feedback — recapturing
  is allowed and fun, not blocked.
- All game state persists in `localStorage` across sessions, same durability guarantee
  as `Favs` and offline caching elsewhere in the app.
- No network calls; works fully offline once Gen 1 assets are cached (already
  guaranteed — Gen 1 is precached per `CLAUDE.md`).

## Testing

No JS unit test suite exists in this repo (`pytest` covers only the Python build
pipeline) — consistent with current practice, this feature is verified manually per
RafaDex's existing "Verification" standard: serve over LAN, install and test on the
real iPhone — drag-to-throw via touch, TTS voice feedback, collection persisting after
reload/reinstall, tap-to-attack responsiveness in battle, offline (airplane mode)
behavior.
