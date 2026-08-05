# RafaDex Mon-Card Glass Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the type-world grid card restyle from `docs/superpowers/specs/2026-08-04-mon-card-glass-design.md`: `.mon-card` moves from a solid type-color fill to a neutral translucent "glass" background (`backdrop-filter` blur+saturate), with the card's own Pokémon's primary-type color moved to the border instead of the fill.

**Architecture:** Pure JS/CSS change to the existing vanilla app, scoped entirely to two CSS rules (`.mon-card`, `.mon-card .name`) and one inline-style assignment inside `renderType()`. Reuses the existing `vividColor()` machinery exactly as-is — just applies the already-computed per-card color to `borderColor` instead of `background`. No new helpers, no new files.

**Tech Stack:** Vanilla JS/CSS (unchanged).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-04-mon-card-glass-design.md` (approved via 3 rounds of live in-browser mockups).
- No change to the detail screen (`.detail`, `.mon-name`, hero image) — Fase 5, not started.
- No change to Home (`.game-btn`, `.type-grid`, `.type-btn`) — already inverted in Fase 2, untouched here.
- No change to the `.shine::before` rule itself — it's shared with other `.bounce.shine` elements and stays exactly as-is; confirmed in the live mockups that it layers correctly on top of the new glass background.
- `.mon-grid`'s column count stays at 2 (`grid-template-columns: 1fr 1fr`) — not touched. This is a different grid from Home's 3-column `.type-grid`, which was separately decided to stay at 3 columns in an earlier round; neither decision affects the other.
- No new color logic: the per-card border color is `vividColor(window.TYPES[mon.types[0]].color, mon.types[0])` — the exact same function and arguments already used at this call site today, only the assignment target changes.
- The `box-shadow` on `.mon-card` intentionally changes from the shared `var(--shadow)` token (the flat "gummy" `0 6px 0` offset used everywhere else in the app) to `0 6px 20px rgba(0,0,0,.12)` (a soft, blurred, floating shadow). This is a deliberate, scoped exception documented in the spec — a flat gummy shadow reads wrong under a blurred translucent surface. No other component's shadow changes.
- Git flow: feature branch off `develop`, PR-merge into `develop`, then a release PR `develop` → `master` (existing GitHub Actions workflow auto-deploys on push to `master`).
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- No Python/pipeline changes — frontend-only, so no `pytest` additions; verification is live-browser only, per house rule.
- Any change to `style.css`/`app.js` needs `python3 build.py` run before merge, so `sw.js` gets a fresh version stamp.

---

### Task 1: Glass `.mon-card` — translucent background, per-card colored border, dark ink name

**Files:**
- Modify: `style.css` (`.mon-card`, `.mon-card .name`)
- Modify: `app.js` (`renderType()`)

**Interfaces:** None new — consumes the existing `vividColor(hex, typeKey)` exactly as it already exists; no signature change.

- [ ] **Step 1: Restyle `.mon-card` and `.mon-card .name` in `style.css`**

Find:

```css
.mon-card { position: relative; overflow: hidden; border-radius: var(--radius); box-shadow: var(--shadow);
  padding: 10px; display: flex; flex-direction: column; align-items: center; }
.mon-meta { position: absolute; top: 8px; left: 8px; right: 8px; display: flex;
  justify-content: space-between; align-items: center; pointer-events: none; }
.mon-typepower { display: flex; align-items: center; gap: 3px; }
.mon-card img { width: 100%; aspect-ratio: 1; filter: drop-shadow(0 6px 5px rgba(0,0,0,.25)); }
.mon-card .name { font-weight: 700; font-size: 15px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.3);
  font-family: "Quicksand", sans-serif; }
```

Replace with:

```css
.mon-card { position: relative; overflow: hidden; border-radius: var(--radius);
  box-shadow: 0 6px 20px rgba(0,0,0,.12); padding: 10px; display: flex; flex-direction: column;
  align-items: center; background: rgba(255,255,255,.55); backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%); border: 2px solid rgba(255,255,255,.7); }
.mon-meta { position: absolute; top: 8px; left: 8px; right: 8px; display: flex;
  justify-content: space-between; align-items: center; pointer-events: none; }
.mon-typepower { display: flex; align-items: center; gap: 3px; }
.mon-card img { width: 100%; aspect-ratio: 1; filter: drop-shadow(0 6px 5px rgba(0,0,0,.25)); }
.mon-card .name { font-weight: 700; font-size: 15px; color: var(--ink);
  font-family: "Quicksand", sans-serif; }
```

(`.mon-meta`, `.mon-typepower`, and `.mon-card img` are unchanged — reproduced here only so the "find" block matches the file exactly. The `rgba(255,255,255,.7)` border is the card's idle/base color; Step 2 overrides it per-card with the type color via inline `style.borderColor`, the same pattern the old code used for `style.background`.)

- [ ] **Step 2: Move the per-card color from background to border in `app.js`**

In `renderType()`, find:

```javascript
    card.style.background = vividColor(window.TYPES[mon.types[0]].color, mon.types[0]);
```

Replace with:

```javascript
    card.style.borderColor = vividColor(window.TYPES[mon.types[0]].color, mon.types[0]);
```

- [ ] **Step 3: Syntax check**

Run: `node --check app.js` — Expected: no output (pass).

- [ ] **Step 4: Live verification**

Serve the app (`python3 -m http.server 8000`), open a type-world screen (`#type/fire`). Confirm: cards show a translucent, blurred "glass" background (the page's own orange color should be softly visible through the card, not a hard edge), each card has a 2px border in that Pokémon's own primary-type color (Charizard's border should be Fire's color, since `mon.types[0]` is `"fire"` even though Charizard is also Flying), and the Pokémon name renders in dark ink text, clearly legible.

Repeat on `#type/electric` (a pale/light type) — confirm the card doesn't wash out against the page and the dark text stays legible. Scroll to Zekrom (`#644`, Dragão/Elétrico) on this same Elétrico page — confirm its card shows **no muddy color blend**: the glass background should look the same neutral white-ish translucent as every other card on the page, with only its border colored (Dragon's vivid color), not a brownish/muddy fill. This is the exact regression the neutral-glass-plus-border design exists to avoid.

Confirm `.mon-meta` (the `#num · Gen` and type/power pills), the type badges, and the `.shine` diagonal highlight all still render correctly on top of the new card background. Confirm tapping a card still navigates to that Pokémon's detail screen. Confirm the Home screen and detail screen are visually unaffected (no code path there was touched).

- [ ] **Step 5: Regenerate `sw.js` and `version.js`**

```bash
python3 build.py
```

Expected: exits with no error; `git diff sw.js` shows only the `VERSION` timestamp changed; `git diff version.js` shows only the build date.

- [ ] **Step 6: Commit**

```bash
git checkout -b feat/mon-card-glass
git add app.js style.css sw.js version.js
git commit -m "feat: mon-card glass redesign — translucent background, colored border

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Deploy and verify

**Files:** none (deploy + verification only)

**Interfaces:**
- Consumes: the existing `.github/workflows/deploy.yml` (unchanged, triggers only on push to `master`).

- [ ] **Step 1: Merge to develop, push, open the release PR**

```bash
git checkout develop && git merge --no-ff feat/mon-card-glass -m "merge: mon-card glass redesign"
git checkout feat/mon-card-glass && git push origin refs/heads/develop:refs/heads/develop
git checkout develop
gh pr create --base master --head develop --title "release: RafaDex mon-card glass redesign" \
  --body "Phase 4 of the 'own identity' brand round: type-world grid cards move from a solid type-color fill to a translucent glass background, with the card's own type color moved to the border. Fixes a muddy-color-blend defect found in an earlier tinted-glass mockup on dual-type Pokémon (e.g. Zekrom viewed on the Elétrico page).

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

(If the push is rejected by the pre-push hook because it's a direct push to `develop`, push the ref from `feat/mon-card-glass` instead, as shown — the established workaround for this repo. Do not use `--no-verify`.)

- [ ] **Step 2: Get the user's explicit go-ahead before merging**

This triggers a live deploy. Report the PR URL and wait for explicit confirmation before running `gh pr merge`.

- [ ] **Step 3: Merge and watch the deploy**

```bash
gh pr merge --merge
gh run watch --exit-status
```

- [ ] **Step 4: Verify production**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://atavaresm.github.io/rafadex/
```

Expected: `200`. In a real browser against production, in a brand-new tab: confirm the same checks as Task 1 Step 4 (glass cards on Fogo and Elétrico, no muddy blend on Zekrom, badges/pills/shine intact, navigation works). This round changes no shell asset other than `app.js`/`style.css`, so no font/asset cache-warming beyond the usual `app.js` check is expected to be needed — but if anything looks stale, explicitly `fetch(url, {cache:'reload'})` every `SHELL_CORE` file before reload, per the established house pattern.

- [ ] **Step 5: Hand back to the user for the real-device pass**

Ask the user to check the same points on the real iPhone. Any failure: fix on a `fix/` branch off `develop` → PR → re-merge to `master` → re-verify. When all pass, update `docs/diario-de-bordo.md`.

---

## Self-Review (done at writing time)

- **Spec coverage:** translucent glass background + backdrop-filter (Task 1 Step 1), border color moved from fill (Task 1 Steps 1-2), dark ink name text with shadow removed (Task 1 Step 1), the deliberate box-shadow exception (Task 1 Step 1, called out in Global Constraints), the muddy-blend regression check on Zekrom (Task 1 Step 4), the `backdrop-filter` unsupported-fallback note (implicit — no vendor-prefix gap left, `-webkit-backdrop-filter` included in Step 1), non-goals preserved by construction (no lines touched in `renderHome`, `renderDetail`, `topbar`, or `.mon-grid`'s column rule).
- **Placeholder scan:** no TBD/TODO; both code blocks are exact, verified against the current file contents read in full before writing this plan (and matching exactly what was tested live in the approved mockup).
- **Type consistency:** `vividColor(window.TYPES[mon.types[0]].color, mon.types[0])` — identical two-argument call already used at this exact call site before this plan; only the assignment target changes from `card.style.background` to `card.style.borderColor`. No new function signatures introduced.
- **Sequencing check:** Task 1's two "find" blocks (one in `style.css`, one in `app.js`) are the complete, disjoint regions this plan touches — no other task or existing code shares these exact lines.
- **Known deviation, explicit:** the box-shadow change (Global Constraints, Task 1 Step 1) is the one place this plan intentionally diverges from the shared `--shadow` token used everywhere else in the app — flagged in both the spec and here so it doesn't read as an oversight during review.
