# Custom Type Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the feature from `docs/superpowers/specs/2026-08-11-type-icons-design.md`: wire the already-extracted `data/type-icons.js` (18 verified SVG icon defs, already committed) into the 3 places `app.js` renders a type icon, replacing the old "Material Symbols Rounded" font-glyph lookup (`TYPE_ICONS`) entirely.

**Architecture:** One new shared helper, `typeIconSvg(typeKey, sizePx, color)`, that reads `window.TYPE_ICON_SVGS` (loaded via a new `<script>` tag, same pattern as `window.DEX`) and returns an inline `<svg>` string. The 3 existing call sites (`renderHome()`'s type-grid, `typeBadgeHtml()`, `renderType()`'s header) switch from emitting a font-glyph `<span>` to calling this helper. Dead CSS (font-based icon styling) is removed; container styling (card shape, badge circle, colors) is untouched.

**Tech Stack:** Vanilla HTML/CSS/JS (unchanged), no framework/bundler.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-11-type-icons-design.md`.
- `data/type-icons.js` already exists on this branch (committed alongside the spec) — do **not** regenerate or hand-edit its icon data; it's a verified, hand-curated static asset. Only add the `<script>` tag that loads it and the `SHELL_CORE` entry that precaches it.
- **`TYPE_ICONS` (the old font-glyph object, `app.js:85-91`) contains invisible Unicode Private-Use-Area characters** that don't display in a normal editor/terminal — do not try to match its object body character-by-character. Delete the whole block by structure/line-anchor as instructed in Task 1 Step 1, not by literal content match.
- Do **not** touch the `"Material Symbols Rounded"` `@font-face` declaration (`style.css:14-17`) or `.app-header .back-btn` (`style.css:47-49`) — that font/glyph is for the unrelated back-button icon and stays exactly as-is.
- Do **not** change any container styling: `.type-btn`'s card shape/shadow, `.type-badge`'s circle shape/shadow, colors, spacing. Only the icon-rendering rules (font-based) are removed/replaced.
- The old `icon || info.emoji` fallback is deleted, not preserved — per the spec's Non-goals, `TYPE_ICON_SVGS` is complete for all 18 types, so the fallback path is dead code by construction.
- Git flow: feature branch off `develop` (already checked out: `feat/type-icons`), PR-merge into `develop`, then a release PR `develop` → `master`. `develop`/`master` both have GitHub branch protection (PR + 1 required approval, no direct push/force-push/deletion) — self-approval is impossible on this solo repo, every merge uses the repo-owner's admin-bypass option, and **every merge needs the human partner's explicit chat confirmation first**.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- This is a real user-visible feature — its release PR needs a **minor** version bump (`python3 bump_version.py minor`), and per the version-bump-enforcement mechanism, `python3 build.py` **must** be re-run after the bump so `version.js` matches (the CI gate on `master` now checks this specifically).

---

### Task 1: Wire `TYPE_ICON_SVGS` into all 3 render sites, clean up dead CSS

**Files:**
- Modify: `app.js` (3 sites: delete `TYPE_ICONS` + add `typeIconSvg()` + rewrite `typeBadgeHtml()`; `renderHome()`'s type-grid loop; `renderType()`'s header)
- Modify: `style.css` (3 sites: remove dead `.type-btn .emoji`/`.emoji.icon` rules, replace `.type-icon-inline` with a plain `.type-icon`, remove dead `.type-badge.icon`)
- Modify: `index.html` (1 new `<script>` tag)
- Modify: `sw.template.js` (1 new `SHELL_CORE` entry)
- Regenerate: `sw.js`, `version.js` (via `build.py` — do not hand-edit)

**Interfaces:**
- Consumes: `window.TYPE_ICON_SVGS` (from `data/type-icons.js`, already committed) — an object keyed by type name, each value `{tx: number, ty: number, scale: number, d: string}`.
- Consumes: `vividColor(hex, typeKey)` (existing helper, `app.js:77-83`) — unchanged, still used to compute icon color for the grid and header.
- Produces: `typeIconSvg(typeKey, sizePx, color)` — returns an HTML string (one `<svg>` element). Used by all 3 call sites in this same task; no other task in this plan depends on it.

- [ ] **Step 1: Delete `TYPE_ICONS` and its comment block, add `typeIconSvg()`, rewrite `typeBadgeHtml()`**

In `app.js`, find the constant declaration that starts with `const TYPE_ICONS = {` (currently line 85) and ends with the `};` that closes it (currently line 91), followed immediately by a 4-line comment (currently lines 92-95) that begins `// Rock keeps an imperfect "diamond" icon...` and ends `...even though nothing currently uses it.`. **The object body between `{` and `}` contains invisible PUA glyph characters — do not try to match them; delete by locating the start (`const TYPE_ICONS = {`) and end (`};` immediately before the comment block) and removing everything from the start line through the end of the comment block.**

Immediately after that deleted block comes the existing `typeBadgeHtml` function:

```javascript
function typeBadgeHtml(typeKey, sizePx) {
  const info = window.TYPES[typeKey];
  const icon = TYPE_ICONS[typeKey];
  const glyph = icon || info.emoji;
  const cls = icon ? "type-badge icon" : "type-badge";
  return `<span class="${cls}" style="width:${sizePx}px;height:${sizePx}px;` +
    `font-size:${Math.round(sizePx * (icon ? 0.62 : 0.55))}px;background:${vividColor(info.color, typeKey)}">${glyph}</span>`;
}
```

Replace the entire deleted block (the `TYPE_ICONS` const, its comment, and this `typeBadgeHtml` function) with:

```javascript
function typeIconSvg(typeKey, sizePx, color) {
  const icon = window.TYPE_ICON_SVGS[typeKey];
  return `<svg class="type-icon" width="${sizePx}" height="${sizePx}" viewBox="0 0 100 100">` +
    `<g transform="scale(${icon.scale}) translate(${icon.tx},${icon.ty})">` +
    `<path d="${icon.d}" fill="${color}"/></g></svg>`;
}

function typeBadgeHtml(typeKey, sizePx) {
  const info = window.TYPES[typeKey];
  const iconSize = Math.round(sizePx * 0.62);
  return `<span class="type-badge" style="width:${sizePx}px;height:${sizePx}px;` +
    `background:${vividColor(info.color, typeKey)}">${typeIconSvg(typeKey, iconSize, "#fff")}</span>`;
}
```

(Net effect: `typeBadgeHtml`'s signature and CSS class usage on the outer `<span>` are unchanged — it's still `class="type-badge"` sized via inline `width`/`height`/`background` — only the inner glyph source changes from a font character to an SVG, and the old icon-vs-emoji branching disappears since every type now has an icon.)

- [ ] **Step 2: Update `renderHome()`'s type-grid loop**

In `app.js`, find:

```javascript
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
```

Replace with:

```javascript
  const grid = el("div", "type-grid");
  for (const [key, info] of Object.entries(window.TYPES)) {
    const iconHtml = typeIconSvg(key, 56, vividColor(info.color, key));
    const btn = el("button", "type-btn bounce", `${iconHtml}<span class="label">${info.name}</span>`);
    btn.onclick = () => go(`#type/${key}`);
    grid.append(btn);
  }
```

- [ ] **Step 3: Update `renderType()`'s header title icon**

In `app.js`, find:

```javascript
function renderType(key) {
  const info = window.TYPES[key];
  contextIds = window.DEX.filter(m => m.types.includes(key)).map(m => m.id);
  elApp.innerHTML = "";
  const titleIconKey = TYPE_ICONS[key];
  const titleIcon = titleIconKey
    ? `<span class="type-icon-inline" style="color:${vividColor(info.color, key)}">${titleIconKey}</span>`
    : info.emoji;
  topbar(`${titleIcon} ${info.name}`, "#home", info.color, undefined, key);
```

Replace with:

```javascript
function renderType(key) {
  const info = window.TYPES[key];
  contextIds = window.DEX.filter(m => m.types.includes(key)).map(m => m.id);
  elApp.innerHTML = "";
  const titleIcon = typeIconSvg(key, 22, vividColor(info.color, key));
  topbar(`${titleIcon} ${info.name}`, "#home", info.color, undefined, key);
```

- [ ] **Step 4: Confirm no reference to `TYPE_ICONS` (the old object) remains**

```bash
grep -n "TYPE_ICONS\b" app.js
```

Expected: no output (the new `window.TYPE_ICON_SVGS` and the `typeIconSvg` function name both contain the substring `TYPE_ICON`, so this exact word-boundary grep for `TYPE_ICONS` — without an `S` following a boundary — should confirm the old name is gone; if it matches anything, the old object wasn't fully removed).

- [ ] **Step 5: Remove the dead `.type-btn` icon-font rules**

In `style.css`, find:

```css
.type-btn .emoji { font-size: 56px; }
.type-btn .emoji.icon { font-family: "Material Symbols Rounded", sans-serif;
  font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 40; }
.type-btn .label { font-size: 15px; font-weight: 700; font-family: "Quicksand", sans-serif; }
```

Replace with:

```css
.type-btn .label { font-size: 15px; font-weight: 700; font-family: "Quicksand", sans-serif; }
```

- [ ] **Step 6: Replace `.type-icon-inline` with a plain `.type-icon` class**

In `style.css`, find:

```css
.type-icon-inline { font-family: "Material Symbols Rounded", sans-serif;
  font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 40;
  font-size: 22px; vertical-align: -3px; display: inline-block; }
```

Replace with:

```css
.type-icon { vertical-align: -3px; }
```

(This class is shared by all 3 call sites now — `vertical-align` only affects inline-flow layout, which is a no-op for the flex-centered `.type-btn`/`.type-badge` contexts, so one shared rule is safe. The old name `.type-icon-inline` is gone because `typeIconSvg()`'s output always uses `class="type-icon"`, set in Step 1.)

- [ ] **Step 7: Remove the dead `.type-badge.icon` rule**

In `style.css`, find:

```css
.type-badge { border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 0 rgba(0,0,0,.15); flex-shrink: 0; }
.type-badge.icon { font-family: "Material Symbols Rounded", sans-serif; color: #fff;
  font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 40; line-height: 1; }
.heart { font-size: 34px; background: none; margin-top: 4px; }
```

Replace with:

```css
.type-badge { border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 0 rgba(0,0,0,.15); flex-shrink: 0; }
.heart { font-size: 34px; background: none; margin-top: 4px; }
```

- [ ] **Step 8: Load the new data file in `index.html`**

In `index.html`, find:

```html
<script src="data/dex.js"></script>
<script src="version.js"></script>
```

Replace with:

```html
<script src="data/dex.js"></script>
<script src="data/type-icons.js"></script>
<script src="version.js"></script>
```

- [ ] **Step 9: Precache the new data file**

In `sw.template.js`, find:

```javascript
const SHELL_CORE = ["./", "index.html", "style.css", "app.js", "version.js", "audio.js",
  "data/dex.js", "manifest.json", "assets/fonts/baloo2.woff2",
  "assets/fonts/quicksand.woff2", "assets/fonts/materialsymbolsrounded.woff2"];
```

Replace with:

```javascript
const SHELL_CORE = ["./", "index.html", "style.css", "app.js", "version.js", "audio.js",
  "data/dex.js", "data/type-icons.js", "manifest.json", "assets/fonts/baloo2.woff2",
  "assets/fonts/quicksand.woff2", "assets/fonts/materialsymbolsrounded.woff2"];
```

- [ ] **Step 10: Regenerate `sw.js` and `version.js`**

```bash
python3 build.py
```

Expected: exits with no error; `git diff sw.js` shows the `VERSION` timestamp constant changed AND the new `"data/type-icons.js"` entry in `SHELL_CORE` (carried through from Step 9's template edit — `build.py` copies `sw.template.js` into `sw.js` with only the version placeholder substituted, so this new entry should appear verbatim); `git diff version.js` shows no change (no version bump in this task — that's a separate later task).

- [ ] **Step 11: Run the existing suite as a regression check**

```bash
pytest -q
```

Expected: all pre-existing tests still pass (no Python code touched by this task).

- [ ] **Step 12: Local verification**

Serve the app:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/` in Chrome and confirm, in order:
- Home screen: all 18 type tiles show a crisp SVG icon (not a missing-glyph box or blank), each colored to match its type, on the white rounded-square card — compare a few against the approved set: Fire should be a flame, Water a droplet, Fighting a fist, Rock a faceted gem, Psychic a hexagon
- Tap a type (e.g. Fire) to open its world screen: the header shows a small colored flame icon inline next to "Fogo", and the back button (unrelated Material Symbols glyph) still works and renders correctly
- On that type screen, each Pokémon card's type badge(s) show as colored circle(s) with a **white** icon inside, sized proportionally to the badge
- Open a detail screen (e.g. `#dex/1`): confirm the type badge(s) near the top render the same way (colored circle, white icon)
- Confirm no layout shift/overflow — icons should fit their containers exactly like the old font glyphs did

- [ ] **Step 13: Commit**

```bash
git add app.js style.css index.html sw.template.js sw.js
git commit -m "feat: replace type icon font glyphs with custom extracted SVGs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Release (minor version bump, PR, deploy, verify)

**Files:** none besides what `bump_version.py` writes (`VERSION`) and a hand-written `CHANGELOG.md` entry.

**Interfaces:**
- Consumes: `bump_version.py minor` (already on `develop`, shipped by the version-bump-enforcement round).

- [ ] **Step 1: Merge Task 1 into `develop`**

```bash
git checkout develop && git pull
git merge --no-ff feat/type-icons -m "merge: custom type icons"
```

- [ ] **Step 2: Get the human partner's explicit go-ahead, then push**

Push `develop` per the established ref-push workaround for this repo's branch protection (push from a non-protected branch checkout, never `--no-verify`).

- [ ] **Step 3: Bump the version and write the changelog entry**

```bash
git checkout -b chore/type-icons-release
python3 bump_version.py minor
cat VERSION
```

Expected: prints the new version (minor-bumped from whatever `develop`'s current `VERSION` is — use the actual printed value below, not a hardcoded guess).

```bash
python3 build.py
```

Expected: `version.js` now reflects the new version string (confirm both lines, not just the date — this is exactly the check the version-bump-enforcement round added, and exactly the mistake that round caught).

- [ ] **Step 4: Add the `CHANGELOG.md` entry**

Add a new heading at the top of `CHANGELOG.md`, above the current topmost entry, using the exact version string `bump_version.py` printed in Step 3 and today's date:

```markdown
## v<VERSION> — 2026-08-11

### Changed
- Replaced all 18 Pokémon-type icons (Home screen grid, per-Pokémon type badges, type-world
  header) with custom-extracted SVG pictograms, dropping the "Material Symbols Rounded" icon
  font for this purpose (the font itself stays, still used for the back-button glyph).
```

(Replace `<VERSION>` with the real printed value.)

- [ ] **Step 5: Commit, push, and open the release PR into `develop`**

```bash
git add VERSION CHANGELOG.md version.js sw.js
git commit -m "chore: bump version for the type icons release

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git push -u origin chore/type-icons-release
gh pr create --base develop --head chore/type-icons-release \
  --title "chore: bump version for type icons release" \
  --body "Minor bump for the custom type icons feature. See CHANGELOG.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Report the PR URL, wait for explicit confirmation, then:

```bash
gh pr merge --merge
```

- [ ] **Step 6: Open the release PR into `master`**

```bash
git checkout develop && git pull
gh pr create --base master --head develop \
  --title "release: custom type icons" \
  --body "Replaces the 18 Material-Symbols type-icon glyphs with custom extracted SVGs. See CHANGELOG.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
```

Expected: the `version-check` CI check passes (both the VERSION-increased check and the version.js-matches-VERSION check added in the previous round).

- [ ] **Step 7: Get the human partner's explicit go-ahead, then merge**

Report the PR URL and wait for explicit confirmation before merging — this deploys to production.

```bash
gh pr merge --merge
```

- [ ] **Step 8: Verify production**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://amaix-dev.com/pokedex/
```

Expected: `200`. Then in a real browser against `https://amaix-dev.com/pokedex/`: hard-reload (Cmd+Shift+R, not just a normal navigate — the static assets have a long `Cache-Control: max-age`, and a plain reload can silently serve a stale cached copy even after unregistering the service worker, as happened during the info-page round's verification) and/or unregister any existing service worker + clear caches first, then repeat the Task 1 Step 12 visual checks against production.

- [ ] **Step 9: Hand back to the human partner**

Report: the new type icons are live at `amaix-dev.com/pokedex`. Add a diary entry to `docs/diario-de-bordo.md` summarizing this round (the multi-file extraction journey is worth capturing).

---

## Self-Review (done at writing time)

- **Spec coverage:** all 3 call sites (`renderHome()`'s grid, `typeBadgeHtml()`, `renderType()`'s header) are covered in Task 1 Steps 1-3. The data file's already-committed status is stated as a constraint, not re-specified. The "no PUA character matching" hazard for `TYPE_ICONS`'s deletion is explicitly called out with a structural (start-line/end-line) deletion instruction instead of a literal-content find/replace, since the object body can't be reliably transcribed into this plan document. Dead CSS removal (3 sites) and the shared `.type-icon` class replacing `.type-icon-inline` are covered in Steps 5-7. The `@font-face`/back-button non-goal is stated explicitly in Global Constraints and untouched by any step.
- **Placeholder scan:** no TBD/TODO; every step has exact code matched against the current file contents (verified by reading `app.js`, `style.css`, `index.html`, `sw.template.js` in full/relevant-part before writing this plan). Task 2 Step 3's "use the actual printed value" is a genuine runtime dependency (same pattern as the version-bump-enforcement and info-page plans), not a vague placeholder.
- **Type consistency:** `typeIconSvg(typeKey, sizePx, color)` is defined once (Task 1 Step 1) and called identically at all 3 sites (Steps 1, 2, 3) with matching argument order/types (`string, number, string`). `window.TYPE_ICON_SVGS`'s shape (`{tx, ty, scale, d}` per key) is used consistently in the one place that reads it.
- **Sequencing check:** Steps 1-3 edit three non-overlapping regions of `app.js` (verified against the current file: the `TYPE_ICONS`/`typeBadgeHtml` block at the top, the `renderHome()` grid loop, and `renderType()`'s header are in different functions). Step 4's grep runs after all `app.js` edits, catching any missed reference. Steps 5-7 edit three non-overlapping regions of `style.css`. Step 9 (SHELL_CORE) must happen before Step 10 (`build.py` run) so the regenerated `sw.js` picks up the new precache entry in the same commit — ordered accordingly.
- **Known constraint, called out rather than hidden:** the invisible-PUA-character problem in `TYPE_ICONS`'s deletion (Step 1) is a real transcription hazard this plan can't route around with a normal find/replace block — flagged explicitly in both Global Constraints and Step 1's instructions, with a structural fallback (line-anchor deletion) instead of guessing at literal content.
