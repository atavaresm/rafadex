# RafaDex Home Inverted Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Home screen restyle from `docs/superpowers/specs/2026-08-04-home-inverted-cards-design.md`: blue page background, white game button and type tiles, icons colored per-type instead of white-on-color.

**Architecture:** Pure JS/CSS change to the existing vanilla app, scoped entirely to `renderHome()` and its two CSS rule blocks (`.game-btn`, `.type-btn` and children). Reuses the existing `vividColor()`/`TYPE_ICONS`/`VIVID_OVERRIDES` machinery exactly as-is — just applies the already-computed per-type color to the icon's `color` instead of the tile's `background`. No new helpers, no new files.

**Tech Stack:** Vanilla JS/CSS (unchanged).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-04-home-inverted-cards-design.md` (approved via visual brainstorming).
- Scope is Home only. Non-goals from the spec: the type-world grid screen and detail screen keep their current per-type flat vivid background — completely untouched by this plan; header/footer/favorites-shelf untouched; no Home restructuring (no greeting, no sections).
- No new color introduced — the Home background reuses the existing `--brand` token (`#4b63d3`) from the institutional-color round, referenced via `var(--brand)`, not a new hardcoded hex.
- Icon color per type reuses the existing `vividColor(hex, typeKey)` call exactly as already used for the tile background today — same function, same arguments, just assigned to a different CSS property.
- The favorites shelf, header, and footer need no code changes — confirm via live verification that they still look correct against the new blue Home background, but no plan step modifies them.
- Git flow: feature branch off `develop`, PR-merge into `develop`, then a release PR `develop` → `master` (existing GitHub Actions workflow auto-deploys on push to `master`).
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- No Python/pipeline changes — frontend-only, so no `pytest` additions; verification is live-browser only, per house rule.
- Any change to `style.css`/`app.js` needs `python3 build.py` run before merge, so `sw.js` gets a fresh version stamp.

---

### Task 1: Blue Home background, white game button and type tiles, per-type icon color

**Files:**
- Modify: `app.js` (`renderHome`)
- Modify: `style.css` (`.game-btn`, `.type-btn` and its children)

**Interfaces:** None new — consumes the existing `vividColor(hex, typeKey)`, `TYPE_ICONS`, `el()` exactly as they already exist.

- [ ] **Step 1: Set the Home page background and restyle the tile loop**

In `app.js`, find:

```javascript
function renderHome() {
  elApp.innerHTML = "";
  const gameBtn = el("button", "game-btn bounce", "❓ Quem é esse Pokémon?");
  gameBtn.onclick = () => go("#game");
  elApp.append(gameBtn);
  renderShelf();                       // no-op until Task 8
  const grid = el("div", "type-grid");
  for (const [key, info] of Object.entries(window.TYPES)) {
    const icon = TYPE_ICONS[key];
    const iconHtml = icon ? `<span class="emoji icon">${icon}</span>` : `<span class="emoji">${info.emoji}</span>`;
    const btn = el("button", "type-btn bounce shine", `${iconHtml}<span class="label">${info.name}</span>`);
    btn.style.background = vividColor(info.color, key);
    btn.onclick = () => go(`#type/${key}`);
    grid.append(btn);
  }
  elApp.append(grid);
```

Replace with:

```javascript
function renderHome() {
  elApp.innerHTML = "";
  document.body.style.background = "var(--brand)";
  const gameBtn = el("button", "game-btn bounce", "❓ Quem é esse Pokémon?");
  gameBtn.onclick = () => go("#game");
  elApp.append(gameBtn);
  renderShelf();                       // no-op until Task 8
  const grid = el("div", "type-grid");
  for (const [key, info] of Object.entries(window.TYPES)) {
    const icon = TYPE_ICONS[key];
    const iconHtml = icon
      ? `<span class="emoji icon" style="color:${vividColor(info.color, key)}">${icon}</span>`
      : `<span class="emoji">${info.emoji}</span>`;
    const btn = el("button", "type-btn bounce", `${iconHtml}<span class="label">${info.name}</span>`);
    btn.onclick = () => go(`#type/${key}`);
    grid.append(btn);
  }
  elApp.append(grid);
```

(Two changes bundled here: the new `document.body.style.background` line, and the tile loop losing the `shine` class + the `btn.style.background = ...` line + gaining an inline `color` on the icon span. `renderRoute()`'s existing `document.body.style.background = "";` reset at the top of every route change — unmodified, elsewhere in the file — is what clears this blue background again when navigating away from Home, exactly the same mechanism already used for the type-world/detail/game tint.)

- [ ] **Step 2: Restyle the game button and type tiles in CSS**

In `style.css`, find:

```css
.game-btn { width: 100%; padding: 18px; margin-bottom: 14px; border-radius: var(--radius);
  background: var(--brand); box-shadow: var(--shadow); font-size: 24px; font-weight: 800; }
.type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.type-btn { position: relative; overflow: hidden; aspect-ratio: 1; border-radius: var(--radius);
  box-shadow: var(--shadow); display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 4px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.35); }
.type-btn .emoji { font-size: 56px; }
.type-btn .emoji.icon { font-family: "Material Symbols Rounded", sans-serif;
  font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 40; }
.type-btn .label { font-size: 15px; font-weight: 700; font-family: "Fredoka", sans-serif; }
```

Replace with:

```css
.game-btn { width: 100%; padding: 18px; margin-bottom: 14px; border-radius: var(--radius);
  background: #fff; box-shadow: var(--shadow); font-size: 24px; font-weight: 800; }
.type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.type-btn { position: relative; overflow: hidden; aspect-ratio: 1; border-radius: var(--radius);
  box-shadow: var(--shadow); background: #fff; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 4px; color: var(--ink); }
.type-btn .emoji { font-size: 56px; }
.type-btn .emoji.icon { font-family: "Material Symbols Rounded", sans-serif;
  font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 40; }
.type-btn .label { font-size: 15px; font-weight: 700; font-family: "Fredoka", sans-serif; }
```

(`.game-btn`'s text color is intentionally left unset — it already inherits `var(--ink)` from `body`, unchanged from before; only its background moves from blue to white. The `.shine::before` rule elsewhere in the file is untouched — it's still used by `.mon-card` on the grid screen, only the `type-btn` *usage* of the `shine` class was dropped in Step 1.)

- [ ] **Step 3: Syntax check**

Run: `node --check app.js` — Expected: no output (pass).

- [ ] **Step 4: Live verification**

Serve the app (`python3 -m http.server 8000`), open Home. Confirm: the page background is now blue (`#4b63d3`), the game button is a white card with a black/dark "Quem é esse Pokémon?" label (the "❓" keeps its native red/white emoji look, unaffected by CSS color), and all 18 type tiles are white cards with the icon rendered in that type's own vivid color (spot-check Fire = orange icon, Water = blue icon, and the 4 `VIVID_OVERRIDES` types — Grass, Bug, Steel, Fairy — to confirm they use the tuned override color, not the raw formula color). Confirm Ghost and Dragon still show their emoji at normal size, uncolored (unaffected by the `color` styling since emoji ignore it). Confirm no tile shows a shine highlight anymore. Confirm tapping any tile still navigates to that type's grid, and tapping the game button still opens the game. Confirm the favorites shelf (if any Pokémon is favorited), header, and footer all still look correct against the new blue backdrop. Navigate to `#type/fire`, then back to Home (`#home`): confirm the type-world screen still shows its own flat orange background (untouched), and confirm Home's blue background reappears correctly after navigating back (proving `renderRoute()`'s existing reset-then-render sequence still works with the new `document.body.style.background` line added in Step 1).

- [ ] **Step 5: Regenerate `sw.js` and `version.js`**

```bash
python3 build.py
```

Expected: exits with no error; `git diff sw.js` shows only the `VERSION` timestamp changed; `git diff version.js` shows only the build date.

- [ ] **Step 6: Commit**

```bash
git checkout -b feat/home-inverted-cards
git add app.js style.css sw.js version.js
git commit -m "feat: Home blue background, white cards, per-type icon color

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Deploy and verify

**Files:** none (deploy + verification only)

**Interfaces:**
- Consumes: the existing `.github/workflows/deploy.yml` (unchanged, triggers only on push to `master`).

- [ ] **Step 1: Merge to develop, push, open the release PR**

```bash
git checkout develop && git merge --no-ff feat/home-inverted-cards -m "merge: Home inverted cards (blue background, white tiles)"
git checkout feat/home-inverted-cards && git push origin refs/heads/develop:refs/heads/develop
git checkout develop
gh pr create --base master --head develop --title "release: RafaDex Home inverted cards" \
  --body "Phase 2 of the 'own identity' brand round: Home's background becomes the institutional blue, and the game button + 18 type tiles invert from flat-color-fill to white-card-with-colored-icon. The type-world grid and detail screens are untouched — they keep their per-type backgrounds.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

(If the push is rejected by the pre-push hook because it's a direct push to `develop`, push the ref from `feat/home-inverted-cards` instead, as shown — the established workaround for this repo. Do not use `--no-verify`.)

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

Expected: `200`. In a real browser against production: unregister any existing service worker and clear caches first, then reload. Repeat the Step 4 checks from Task 1 against production, including the light/dark icon-color spot checks and the navigate-away-and-back check.

- [ ] **Step 5: Hand back to the user for the real-device pass**

Ask the user to check the same points on the real iPhone. Any failure: fix on a `fix/` branch off `develop` → PR → re-merge to `master` → re-verify. When all pass, update `docs/diario-de-bordo.md`.

---

## Self-Review (done at writing time)

- **Spec coverage:** blue Home background (Task 1 Step 1), white game button + white type tiles + per-type icon color (Task 1 Steps 1-2), shine dropped on Home tiles only — not the shared `.shine::before` rule itself (Task 1 Steps 1-2, explicitly called out), non-goals preserved by construction (no lines touched in `renderType`, `renderDetail`, `topbar`, or the favorites-shelf/header/footer code).
- **Placeholder scan:** no TBD/TODO; both code blocks are exact, verified against the current file contents read in full before writing this plan.
- **Type consistency:** `vividColor(info.color, key)` — same two-argument call already used identically at this exact call site before this plan (only the assignment target changes, from `btn.style.background` to an inline `style="color:...""` on the icon span). No new function signatures introduced.
- **Sequencing check:** Task 1's two "Find" blocks (one in `app.js`, one in `style.css`) are the complete, disjoint regions this plan touches — no other task or existing code shares these exact lines.
- **Known deviation, explicit:** the spec flagged the gear/search icon row's contrast against the new blue background as "worth a live look" but not a decided change — this plan does not touch that CSS; Task 1 Step 4 calls it out as a verification point, not a code change, so if it turns out to need adjustment, that's a follow-up, not a miss in this plan.
