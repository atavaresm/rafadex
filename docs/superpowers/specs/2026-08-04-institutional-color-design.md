# RafaDex Institutional Color — Design Spec

**Date:** 2026-08-04
**Status:** Approved design (brainstormed with visual mockups), pending implementation plan

## What

Phase 1 of a broader "own identity, not generic Pokédex" brand round (the user's diagnosis after using the deployed visual identity v2: it works well but still reads as an official-Pokémon-brand product rather than something authored specifically for Rafael). This phase replaces the institutional brand color — currently red `#e3350d` (borrowed directly from the official Pokémon brand) plus a secondary yellow `#ffcb05` — with a single new institutional color, a blue-indigo `#4b63d3`, applied everywhere that color currently signals "this is the app's own chrome" as opposed to a Pokémon type color.

This is a narrow, mechanical color-token swap. It does **not** touch the header's Pokéball-shaped mark (kept as-is, decided during brainstorming after several rounds of exploring replacement symbols — see "Non-goals"), the 18 type colors, or any layout/component structure. Later phases (home page restructure, type grid columns, card layout, detail screen layout) are separate, deliberately out of scope here — see the diary/session history for the full phase breakdown.

## Non-goals

- **No change to the header mark.** Explored replacing the small Pokéball icon with an original symbol (abstract marks, a mascot character, a generic explorer cap) across several brainstorming rounds; none landed, and the user explicitly asked to stop and keep the current Pokéball. Its color changes as part of this spec (see below) but its shape does not.
- **No change to the 18 type colors** (`window.TYPES`) or the `vividColor()`/`VIVID_OVERRIDES` system from the previous round — type colors are a separate system from institutional/brand color and are not touched.
- **No layout or component restructuring** (Home sections, type grid columns, card layout, detail screen layout) — explicitly deferred to later phases.
- **No new functional text.** A separate discussion during brainstorming confirmed the app keeps its zero-reading-dependency principle (established since v1: Rafael is 3-6 and doesn't read yet) — no text labels added to icon-only buttons, no functional copy added anywhere. This phase doesn't add any UI text at all, so it's not really at risk here, but it's a standing constraint for the later phases and worth restating.

## The color

**New institutional color:** `#4b63d3` (blue-indigo). Validated visually during brainstorming — first approved in isolation while exploring header mark concepts, then confirmed applied across the header text, game button, and footer together (compared side-by-side against a coral and a turquoise alternative; indigo won).

## Where it applies (all 8 real usage sites, enumerated from the current codebase)

The current code centers this color on a single CSS custom property, `--red: #e3350d` (`style.css:2`), consumed via `var(--red)` at 6 of the 8 sites below, plus 2 sites where the color is hardcoded outside `style.css` entirely (theme metadata) and 1 site where the *secondary* yellow is hardcoded directly (not tied to any variable).

1. `style.css:28` — `.app-header .ball`'s gradient top half (the Pokéball icon's red cap) — becomes indigo.
2. `style.css:29` — `.app-header .name` (the "RafaDex" header text color) — becomes indigo.
3. `style.css:37` — `.game-btn` background, currently hardcoded `#ffcb05` (yellow, not the red variable) — becomes indigo. This collapses the old two-color red/yellow institutional scheme into one institutional color; yellow is not kept as a secondary brand color anywhere in this phase.
4. `style.css:75` — `.sound-row button.speaking` background (the active/speaking state of the detail screen's sound buttons) — becomes indigo.
5. `style.css:77` — `.pill` text color (used everywhere a white pill renders: number/generation, power, and — since the visual identity v2 round — nowhere else new) — becomes indigo.
6. `style.css:87` — `.evo-strip img.current` outline (the ring around the currently-viewed Pokémon in the evolution strip) — becomes indigo.
7. `index.html:7` — `<meta name="theme-color" content="#e3350d">` (iOS/Android browser chrome tint) — becomes indigo. Hardcoded independently of the CSS variable; must be updated by hand in lockstep.
8. `manifest.json:8` — `"theme_color": "#e3350d"` (PWA install splash-screen/task-switcher tint) — becomes indigo. Same as above, a separate hardcoded value.

**Footer text** (`style.css:33`, `.app-footer`, currently `color: #999`, a neutral gray, *not* tied to the red variable today) — the brainstorming mockup showed this recolored to the new institutional indigo alongside everything else, and the user approved that mockup as-is. This is a deliberate small scope addition beyond "replace red/yellow": the footer's small `amaix.com · version · date` line goes from neutral gray to indigo.

## Implementation approach

- Rename the CSS custom property from `--red` to `--brand` and set its value to `#4b63d3` — keeping a variable named `--red` holding a blue value would be actively misleading to whoever touches this file next. There's no secondary institutional color in this phase (yellow is absorbed into the single indigo, not kept as a `--brand-secondary`), so the plain `--brand` name is sufficient. Update all existing `var(--red)` references (sites 1, 2, 4, 5, 6 above) to the renamed variable.
- Site 3 (`.game-btn`)'s hardcoded `#ffcb05` becomes `var(--brand)` — moving it onto the shared token instead of leaving it as a separate hardcoded value, so a future color change doesn't require hunting for a second hardcoded spot.
- Site 7 and 8 (`index.html`, `manifest.json`) are updated by hand to the literal new hex — they're outside the CSS build entirely, no variable mechanism reaches them.
- Footer text color (`style.css:33`) changes from `#999` to `var(--brand)`.

## Testing

- Frontend/metadata-only change — no `pytest` additions.
- Live verification per house rule: confirm the header text, header ball's top half, game button, sound-button active state, pill text, evolution-strip ring, and footer all render the new indigo consistently; confirm the type-color tiles/cards/detail backgrounds are completely unaffected (they don't reference `--brand`/`--red` at all, but worth a visual sanity pass given how many rounds of type-color tuning preceded this).
- Confirm `manifest.json`'s `theme_color` change is picked up — this typically requires a fresh install (Add to Home Screen) to see the splash-screen/status-bar tint update on a real device; note this as a known limitation for the live-device verification step, same caveat as always for anything that only shows up on reinstall.
- Per the established house rule for this project: any change to `index.html`/`style.css` needs a `python3 build.py` run before merge so `sw.js` gets a fresh precache version stamp.
