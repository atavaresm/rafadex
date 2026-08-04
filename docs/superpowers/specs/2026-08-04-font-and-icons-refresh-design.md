# RafaDex Font + Icons Refresh — Design Spec

**Date:** 2026-08-04
**Status:** Approved design (brainstormed with visual mockups), pending implementation plan

## What

A follow-up refinement after Phase 2 (Home inverted cards) went live: with type labels and icons now sitting on plain white cards, two rough edges became much more visible than they were on the old colored tiles. (1) Fredoka, used for type labels and Pokémon names, reads as too thick/rounded — "clean" was the specific request. (2) Two of the 18 type icons (Ghost, Dragon) are still the system emoji, a leftover from the previous round where no acceptable Material Symbols match was found — on a white card next to 16 clean single-color outline icons, a full-color cartoon emoji stands out as visibly inconsistent.

This round: replace Fredoka with Quicksand everywhere it's used, and give Ghost and Dragon real outline icons matching the other 16.

## Non-goals

- **Rock's icon (`diamond`) is not addressed this round.** It's a known imperfect match (no literal rock/boulder glyph exists in the icon set), explicitly flagged in the previous round's spec appendix, and explicitly deferred again now — the user asked to solve Ghost and Dragon first.
- **No layout changes** (Home structure, grid columns, card layout, detail screen) — same deferred backlog as before, untouched by this round.
- **No change to the vivid color system, `VIVID_OVERRIDES`, or which surfaces show which colors** — this round only touches typography and two icon glyphs.
- **Baloo 2 is untouched.** It's still used for header, footer, screen titles, and buttons — only the surfaces that currently use Fredoka move to Quicksand, matching the exact scope Fredoka itself had.

## The changes

### 1. Typography: Fredoka → Quicksand

Quicksand (weight 700) replaces Fredoka at every site Fredoka is currently used — no scope change, same surfaces: Home type-tile labels, Pokémon names on the grid cards, and Pokémon names on the detail screen. Chosen after comparing three "cleaner" candidates (Quicksand, Nunito, Comfortaa) side by side against the current Fredoka at real size — Quicksand won for being visibly thinner/more geometric while staying friendly enough for a 3-6-year-old's app.

Self-hosted the same way every other font in this app is (offline-first PWA — see `feedback_pwa_precache_review` in memory and the existing pattern for Baloo 2 and the outgoing Fredoka): a single static weight-700 woff2, Latin subset (covers all pt-BR diacritics — verified by rendering "Água", "Dragão", "Não", "acentuação" and every accented vowel/ç directly in a browser before this spec was written). Fredoka's font file is removed from the repo entirely once nothing references it — it served exactly the surfaces Quicksand now takes over, so keeping both would just be dead weight in the PWA's precache.

### 2. Icons: Ghost and Dragon get real glyphs

Both found in the same Material Symbols Rounded family already used for the other 16 icons — same outline style, same rendering mechanism (`TYPE_ICONS` lookup, direct Unicode codepoint, no ligatures — see the visual-identity-v2 plan's appendix for why), same per-type vivid color already computed by `vividColor()`.

- **Ghost → `skull`** (codepoint `U+F89A`). A real, unambiguous icon match — no emoji-vs-icon style clash anymore.
- **Dragon → `castle`** (codepoint `U+EAB1`). No literal dragon/reptile glyph exists in the font (confirmed by searching the full glyph list again this round); castle was chosen over two other candidates shown side by side (crown, swords) for evoking the fantasy/mythical-realm association dragons carry, without colliding with any other type's icon concept.

After this round, **every one of the 18 types has a real outline icon** except none — Ghost and Dragon's `TYPE_ICONS` entries are added, removing them from the "no icon, falls back to emoji" exception list that existed since the visual-identity-v2 round. Rock alone keeps its imperfect `diamond` icon (see Non-goals) — not an emoji fallback, just not a literal rock.

**Font asset:** the existing self-hosted Material Symbols Rounded subset (currently 16 glyphs, 6.3KB) is regenerated to include these 2 additional codepoints (18 glyphs total, verified at 6.9KB — still a tiny asset). Same subsetting recipe as before (direct PUA codepoints via `pyftsubset --unicodes=`, not ligature text — the appendix in the visual-identity-v2 plan documents why ligature-based subsetting doesn't work for this font).

## Testing

- Frontend/asset-only change — no `pytest` additions.
- Live verification per house rule: confirm all 18 type tiles on Home show a real outline icon (no emoji) in the correct per-type vivid color, specifically Ghost (skull) and Dragon (castle); confirm the small circular type badges (detail screen back-button row, grid card corner) also show the new icons, since they consume the same `TYPE_ICONS` table; confirm Pokémon names throughout (grid cards, detail screen) and Home type labels all render in Quicksand, with correct accented characters (a Pokémon or type name with an accent, e.g. "Água" itself, is a real live check, not just an abstract font-coverage claim); confirm no remaining reference to Fredoka anywhere (CSS, precache list, or the removed font file).
- Per the established house rule: `python3 build.py` must run before merge so `sw.js`'s precache list drops `fredoka.woff2` and reflects the fresh `materialsymbolsrounded.woff2` byte content with a new version stamp.
