# RafaDex Home — Inverted Cards Design Spec

**Date:** 2026-08-04
**Status:** Approved design (brainstormed with visual mockups), pending implementation plan

## What

Phase 2 of the "own identity" brand round (Phase 1 — institutional color — is already live). This phase restyles the **Home screen only**: the page background becomes the institutional blue (`#4b63d3`), and the game button + the 18 type tiles invert from "flat saturated color fill + white icon" to "white card + icon colored in the type's own vivid color." Brainstormed visually: first a grid-only comparison against the current style, then the full Home screen once a contrast problem surfaced with the game button (see below).

## Non-goals

- **No change to the type-world grid screen or the detail screen.** Both keep their current per-type flat vivid background (the "you're inside the Fire world" effect from the previous round) — explicitly decided during brainstorming rather than assumed, specifically to preserve that immersion. Only Home's background and its own tiles change.
- **No change to the header or footer** — both are already institutional blue for their text (Phase 1), sit on their own fixed cream bars, and are unaffected by the Home page background change.
- **No change to the favorites shelf** (the row of favorited-Pokémon thumbnails above the type grid) — it's already white/card-styled and needs no adjustment against the new blue backdrop.
- **No change to the "❓" game-mode screen itself** (the silhouette guessing game) — only the Home button that launches it.
- **No reorganization of Home's structure** (no greeting text, no "Explorar"/"Continue explorando" sections) — that was part of the original bigger proposal and stays out of scope for this phase too, same as Phase 1.

## The design

**Home page background:** solid `#4b63d3` (the same institutional blue from Phase 1 — no new color introduced).

**Game button** ("❓ Quem é esse Pokémon?"): white card instead of a filled institutional-blue button (a filled blue button would nearly disappear against the new blue page background — this was caught and fixed during brainstorming, see the mockup history). The "❓" keeps its native emoji rendering (unaffected by CSS color, same as today); the label text becomes dark ink (matching the type tiles below) instead of white-on-blue.

**Type tiles (18):** white card instead of the flat vivid per-type fill. The icon (the existing Material Symbols outline glyphs from the previous round, or the emoji fallback for Ghost/Dragon) is now colored using that type's own vivid color — the exact same `vividColor()`/`VIVID_OVERRIDES` value already computed for the flat-fill background, just applied to `color` instead of `background`. The label text becomes dark ink (`var(--ink)`, matching the app's existing body text color) instead of white with a drop-shadow — no shadow needed since it's no longer sitting on a saturated color.

**Plastic shine highlight:** dropped on both the game button and the type tiles. The radial white-highlight overlay from the previous round existed specifically to make flat saturated color read as glossy plastic; a plain white card doesn't need it and looked clean without it in the mockups. (The shine treatment is unaffected everywhere else it's used — grid cards, which aren't touched by this phase.)

## Testing

- Frontend-only — no `pytest` additions.
- Live verification per house rule: confirm all 18 tiles render with a white background and their icon in the correct, already-established vivid color (including the 4 `VIVID_OVERRIDES` types — grass, bug, steel, fairy — and the 2 emoji-fallback types, Ghost and Dragon, which should still render their emoji at normal size/color, not recolored). Confirm the game button is legible and clearly tappable against the blue background. Confirm the favorites shelf, header, and footer are visually unaffected. Confirm the gear/search icon row at the bottom of Home still reads clearly against the new blue backdrop (not a decided design change, just worth a live look since its low-opacity styling was tuned against the old cream background). Confirm tapping a tile still navigates correctly (card style change is visual-only). Spot-check that the type-world grid and detail screens are completely unaffected by this phase (they should show zero diff).
