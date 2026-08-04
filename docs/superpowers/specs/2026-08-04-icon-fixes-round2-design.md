# RafaDex Icon Fixes Round 2 — Design Spec

**Date:** 2026-08-04
**Status:** Approved design (brainstormed with visual mockups), pending implementation plan

## What

A second, smaller icon pass after the font+icons refresh went live. The user flagged 4 of the 18 type icons as not clearly representing their type; after comparing alternatives from the same Material Symbols family, 2 have real upgrades and 2 don't.

## Non-goals

- The first 9 types (Normal, Fire, Water, Electric, Grass, Ice, Fighting, Poison, Ground) are explicitly confirmed fine — not touched.
- **Bug's icon (`bug_report`) is unchanged.** No alternative insect glyph exists anywhere in the Material Symbols Rounded family (confirmed by searching the full glyph list again this round) — this is a real library limitation, not a missed search.
- **Rock's icon (`diamond`) is unchanged.** A `layers` alternative was shown and rejected — it didn't read as clearly "rock" either, so the known-imperfect `diamond` stays rather than trading one imperfect match for another.
- No other icons, fonts, colors, or layout touched.

## The changes

- **Flying: `air` (wind swirl) → `raven`** (codepoint `U+F555`). A bird silhouette reads unambiguously as "flying" in a way an abstract wind icon didn't.
- **Psychic: `psychology` (head + gear) → `visibility`** (codepoint `U+E8F4`, a simple eye outline). An eye evokes "psychic/third eye" more directly than the head-with-gear icon, which read as more like "thinking/mental health" than "psychic power."

**Font asset:** the existing self-hosted Material Symbols Rounded subset is regenerated once more — `air` and `psychology` are dropped (nothing uses them anymore), `raven` and `visibility` are added. Still 18 glyphs total (one per icon-bearing type), verified at 6.7KB.

## Testing

- Frontend/asset-only — no `pytest` additions.
- Live verification: confirm the Flying tile/badges show the raven icon and Psychic tile/badges show the eye icon, both in their type's own vivid color, on Home, the type-world grid, and the detail screen (all three consume the same `TYPE_ICONS` table). Confirm Rock and Bug are visually unchanged. Confirm no other icon changed.
