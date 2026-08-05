# RafaDex Merged Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the merged-header restyle from `docs/superpowers/specs/2026-08-04-merged-header-design.md`: the fixed `.app-header` and sticky `.topbar` collapse into one compact bar that hides while scrolling down and reappears while scrolling up, and the back button's emoji becomes a real icon.

**Architecture:** Pure JS/CSS change to the existing vanilla app. `topbar()` stops creating a separate `.topbar` element and instead mutates the existing `.app-header` element directly; a new `resetHeaderToBrand()` restores the "RafaDex" wordmark on Home; a single scroll listener toggles a `.hidden` class on the header. The back button's icon character is inserted via a small Python script (never typed or pasted as literal text), matching this project's established mitigation for Private-Use-Area Unicode codepoints.

**Tech Stack:** Vanilla JS/CSS (unchanged). Icon font asset already regenerated and committed on this branch (`assets/fonts/materialsymbolsrounded.woff2`, 19 glyphs including `arrow_back` at U+E5C4) — this plan only wires it up in code, it does not regenerate it.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-04-merged-header-design.md` (approved via a live in-app mockup).
- Home keeps the "RafaDex" wordmark + Pokéball, no back button, no title — unchanged in content, only reached via the new `resetHeaderToBrand()` instead of static HTML that's never touched again.
- Every other screen (type-world, detail, game) keeps showing exactly what it shows today (type icon + name; the `#num · Gen` pill on the right; "❓") — only the container (one bar instead of two) and the hide/show behavior change, not the content.
- `#app`'s CSS padding-top is **not** touched — it already clears the header on every screen including Home, and removing the second bar means every screen now relies on that one existing value uniformly.
- The back button's icon is Material Symbols Rounded's `arrow_back`, codepoint **U+E5C4**. **Do not hand-type or hand-copy this character anywhere.** It is an invisible Private-Use-Area Unicode character — this exact class of edit has corrupted to an empty string three times in this project's history (see `docs/diario-de-bordo.md`). Step 3 below inserts it via a Python script using `chr(0xe5c4)`, and Step 4 verifies it byte-for-byte. Do not deviate from that mechanism.
- The now-orphaned `.topbar`, `.back-btn`, `.topbar .title`, and `.topbar.split` CSS rules are removed, not left dead — nothing creates a `.topbar` element after this change.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- No pytest additions — frontend-only visual/behavioral change.
- Any change to `style.css`/`app.js` needs `python3 build.py` run before merge, so `sw.js` gets a fresh version stamp. This round also changes a precached font file (already committed on this branch) — production verification must hard-reload/re-check the font specifically, not just `app.js` (the exact pitfall two of the last three visual rounds hit).

---

### Task 1: Merge the header, add hide-on-scroll, fix the back icon

**Files:**
- Modify: `app.js` (`topbar()`, new `resetHeaderToBrand()`, new scroll listener, `renderHome()`, and the 3 existing `topbar()` call sites in `renderType()`, `renderDetail()`, `renderGame()`)
- Modify: `style.css` (`.app-header` and children, removal of `.topbar`/`.back-btn`/`.topbar .title`/`.topbar.split`)

**Interfaces:**
- Consumes: the existing `vividColor(hex, typeKey)`, `el(tag, cls, html)`, `pill(text)` exactly as they already exist — no signature changes.
- Produces: `resetHeaderToBrand()` — a new no-argument function, callable from `renderHome()`. `topbar()`'s signature is unchanged (`title, backHash, tint, rightContent, tintKey`), but it no longer returns a value — its 3 call sites must stop wrapping it in `elApp.append(...)`.

- [ ] **Step 1: Rewrite `topbar()`, add `resetHeaderToBrand()` and the scroll listener**

Find:

```javascript
function topbar(title, backHash, tint, rightContent, tintKey) {
  const bar = el("div", "topbar");
  const back = el("button", "back-btn bounce", "⬅️");
  back.onclick = () => go(backHash);
  bar.append(back);
  if (rightContent) {
    bar.classList.add("split");
    bar.append(rightContent);
  } else {
    bar.append(el("span", "title", title));
  }
  if (tint) document.body.style.background = vividColor(tint, tintKey);
  return bar;
}
```

Replace with:

```javascript
function topbar(title, backHash, tint, rightContent, tintKey) {
  const header = document.querySelector(".app-header");
  header.innerHTML = "";
  header.classList.toggle("split", !!rightContent);
  const back = el("button", "back-btn bounce", "BACK_ICON_PLACEHOLDER");
  back.onclick = () => go(backHash);
  header.append(back);
  if (rightContent) {
    header.append(rightContent);
  } else {
    header.append(el("span", "title", title));
  }
  if (tint) document.body.style.background = vividColor(tint, tintKey);
}
function resetHeaderToBrand() {
  const header = document.querySelector(".app-header");
  header.classList.remove("split");
  header.innerHTML = '<span class="ball"></span><span class="name">RafaDex</span>';
}
let lastHeaderScrollY = 0;
window.addEventListener("scroll", () => {
  const header = document.querySelector(".app-header");
  const y = window.scrollY;
  if (y > lastHeaderScrollY && y > 80) header.classList.add("hidden");
  else header.classList.remove("hidden");
  lastHeaderScrollY = y;
});
```

(`BACK_ICON_PLACEHOLDER` is a deliberate plain-ASCII placeholder — Step 3 replaces it with the real icon character by codepoint. Do not replace it by hand.)

- [ ] **Step 2: Update `renderHome()` and the 3 `topbar()` call sites**

In `renderHome()`, find:

```javascript
function renderHome() {
  elApp.innerHTML = "";
  document.body.style.background = "var(--brand)";
```

Replace with:

```javascript
function renderHome() {
  elApp.innerHTML = "";
  resetHeaderToBrand();
  document.body.style.background = "var(--brand)";
```

In `renderType()`, find:

```javascript
  elApp.append(topbar(`${titleIcon} ${info.name}`, "#home", info.color, undefined, key));
```

Replace with:

```javascript
  topbar(`${titleIcon} ${info.name}`, "#home", info.color, undefined, key);
```

In `renderDetail()`, find:

```javascript
  elApp.append(topbar("", `#type/${mon.types[0]}`, tint, pill(`#${numStr} · G${mon.gen}`), mon.types[0]));
```

Replace with:

```javascript
  topbar("", `#type/${mon.types[0]}`, tint, pill(`#${numStr} · G${mon.gen}`), mon.types[0]);
```

In `renderGame()`, find:

```javascript
  elApp.append(topbar("❓", "#home", "#ffcb05"));
```

Replace with:

```javascript
  topbar("❓", "#home", "#ffcb05");
```

- [ ] **Step 3: Insert the real back-icon codepoint via script — do not hand-edit**

Run this exact Python script from the repo root:

```python
import pathlib

path = pathlib.Path("app.js")
content = path.read_text(encoding="utf-8")
placeholder = "BACK_ICON_PLACEHOLDER"
assert content.count(placeholder) == 1, f"expected exactly 1 placeholder, found {content.count(placeholder)}"
new_content = content.replace(placeholder, chr(0xe5c4))
path.write_text(new_content, encoding="utf-8")
print("replaced 1 occurrence")
```

- [ ] **Step 4: Verify the codepoint byte-for-byte — mandatory, not optional**

```python
import pathlib

content = pathlib.Path("app.js").read_text(encoding="utf-8")
assert "BACK_ICON_PLACEHOLDER" not in content, "placeholder still present — Step 3 did not run"
idx = content.index('"back-btn bounce", "') + len('"back-btn bounce", "')
icon_char = content[idx]
assert hex(ord(icon_char)) == "0xe5c4", f"expected U+E5C4, got {hex(ord(icon_char))}"
print("OK — back button icon is U+E5C4")
```

Expected output: `OK — back button icon is U+E5C4`. If this fails, do not proceed — investigate before continuing (this is the exact corruption class that has silently broken this app three times before).

- [ ] **Step 5: Update `style.css`**

Find:

```css
/* App chrome (persistent header/footer) */
.app-header { position: fixed; top: 0; left: 0; right: 0; z-index: 20;
  height: calc(48px + env(safe-area-inset-top));
  display: flex; align-items: center; gap: 8px; padding: env(safe-area-inset-top) 16px 0;
  background: var(--bg); border-bottom: 1px solid rgba(0,0,0,.06); }
.app-header .ball { width: 26px; height: 26px; border-radius: 50%; border: 3px solid #222;
  background: linear-gradient(180deg, var(--brand) 46%, #222 46% 54%, #fff 54%); flex-shrink: 0; }
.app-header .name { font-size: 18px; font-weight: 800; color: var(--brand); }
```

Replace with:

```css
/* App chrome (persistent header/footer) */
.app-header { position: fixed; top: 0; left: 0; right: 0; z-index: 20;
  height: calc(48px + env(safe-area-inset-top));
  display: flex; align-items: center; gap: 8px; padding: env(safe-area-inset-top) 16px 0;
  background: var(--bg); border-bottom: 1px solid rgba(0,0,0,.06);
  transition: transform .25s ease; }
.app-header.hidden { transform: translateY(-100%); }
.app-header.split { justify-content: space-between; }
@media (prefers-reduced-motion: reduce) { .app-header { transition: none; } }
.app-header .ball { width: 26px; height: 26px; border-radius: 50%; border: 3px solid #222;
  background: linear-gradient(180deg, var(--brand) 46%, #222 46% 54%, #fff 54%); flex-shrink: 0; }
.app-header .name { font-size: 18px; font-weight: 800; color: var(--brand); }
.app-header .title { font-size: 18px; font-weight: 800; }
.app-header .back-btn { font-family: "Material Symbols Rounded", sans-serif;
  font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 40;
  font-size: 20px; padding: 6px 14px; border-radius: 18px;
  background: var(--card); box-shadow: var(--shadow); }
```

Then find:

```css
/* Type world + detail */
.topbar { position: sticky; top: calc(48px + env(safe-area-inset-top)); z-index: 10; display: flex; align-items: center; gap: 10px;
  padding: 14px 12px; margin: 0 -12px 14px; background: var(--bg); }
.back-btn { font-size: 26px; padding: 10px 18px; border-radius: 22px;
  background: var(--card); box-shadow: var(--shadow); }
.topbar .title { font-size: 24px; font-weight: 800; }
.type-icon-inline { font-family: "Material Symbols Rounded", sans-serif;
```

Replace with:

```css
/* Type world + detail */
.type-icon-inline { font-family: "Material Symbols Rounded", sans-serif;
```

Then find:

```css
.type-badge.icon { font-family: "Material Symbols Rounded", sans-serif; color: #fff;
  font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 40; line-height: 1; }
.topbar.split { justify-content: space-between; }
.heart { font-size: 34px; background: none; margin-top: 4px; }
```

Replace with:

```css
.type-badge.icon { font-family: "Material Symbols Rounded", sans-serif; color: #fff;
  font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 40; line-height: 1; }
.heart { font-size: 34px; background: none; margin-top: 4px; }
```

- [ ] **Step 6: Syntax check**

Run: `node --check app.js` — Expected: no output (pass).

- [ ] **Step 7: Live verification**

Serve the app (`python3 -m http.server 8000`). On Home: confirm the "RafaDex" wordmark + Pokéball still show, no back button. Navigate to a type-world screen (e.g. `#type/fire`): confirm a single compact bar (back icon + "🔥 Fogo"), and confirm the back icon is a real arrow glyph, not an emoji and not an empty box. Scroll down through the grid: confirm the bar hides. Scroll up: confirm it reappears immediately (not only at the very top). Navigate to a detail screen (`#dex/6`): confirm the single bar shows the back icon on the left and the `#006 · G1` pill on the right (the `split` layout). Navigate to the game (`#game`): confirm the single bar shows the back icon and "❓". On every screen, confirm tapping the back button still navigates correctly. Confirm cards/content are not clipped or overlapped by the header at any scroll position.

- [ ] **Step 8: Regenerate `sw.js` and `version.js`**

```bash
python3 build.py
```

Expected: exits with no error; `git diff sw.js` shows only the `VERSION` timestamp changed; `git diff version.js` shows only the build date. (`assets/fonts/materialsymbolsrounded.woff2` is already committed on this branch from the spec step — `build.py` does not touch it.)

- [ ] **Step 9: Commit**

```bash
git add app.js style.css sw.js version.js
git commit -m "feat: merge app-header and topbar, hide on scroll, real back icon

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Deploy and verify

**Files:** none (deploy + verification only)

**Interfaces:**
- Consumes: the existing `.github/workflows/deploy.yml` (unchanged, triggers only on push to `master`).

- [ ] **Step 1: Merge to develop, push, open the release PR**

```bash
git checkout develop && git merge --no-ff <feature-branch> -m "merge: merged header, hide on scroll, real back icon"
git checkout <feature-branch> && git push origin refs/heads/develop:refs/heads/develop
git checkout develop
gh pr create --base master --head develop --title "release: RafaDex merged header + back icon" \
  --body "The fixed app-header and sticky topbar collapse into one compact bar that hides while scrolling down and reappears while scrolling up, freeing most of the vertical space they used to occupy permanently on every non-Home screen. The back button's emoji is replaced with a real Material Symbols icon (arrow_back). Brainstormed with a live in-app mockup — see docs/superpowers/specs/2026-08-04-merged-header-design.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

(`<feature-branch>` is whatever branch Task 1's implementer created for the commit — check `git branch --show-current` if unsure. If the push is rejected by the pre-push hook because it's a direct push to `develop`, push the ref from the feature branch instead, as shown — the established workaround for this repo. Do not use `--no-verify`.)

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

Expected: `200`. In a real browser against production, in a brand-new tab: unregister any service worker and clear caches (`navigator.serviceWorker.getRegistrations()` → `.unregister()` each; `caches.keys()` → `.delete()` each), then **hard reload** (not just a plain reload — this round changes a precached font file, and two of the last three visual rounds were fooled by a stale cache that looked correct at a glance). Repeat every check from Task 1 Step 7 against production, including the font: confirm the back icon renders as a real glyph, not tofu/an empty box (that specific failure mode means the new font file didn't actually load).

- [ ] **Step 5: Hand back to the user for the real-device pass**

Ask the user to check the same points on the real iPhone. Any failure: fix on a `fix/` branch off `develop` → PR → re-merge to `master` → re-verify. When all pass, update `docs/diario-de-bordo.md`.

---

## Self-Review (done at writing time)

- **Spec coverage:** merged single bar (Task 1 Steps 1-2, 5), hide-on-scroll (Step 1's scroll listener + CSS `.hidden`/transition in Step 5), Home unaffected in content (Step 2's `resetHeaderToBrand()`), detail's `split`/pill layout preserved (Step 2's `renderDetail()` edit + CSS `.app-header.split`), game screen preserved (Step 2's `renderGame()` edit), real back icon via safe script-based insertion (Steps 1, 3, 4), orphaned CSS removed (Step 5's second and third find/replace), `#app` padding-top left untouched (no step touches it — confirmed absent from every find/replace block above).
- **Placeholder scan:** no TBD/TODO; every code block is exact, verified against the current file contents read in full before writing this plan. `BACK_ICON_PLACEHOLDER` is a deliberate, named mechanism (documented in Global Constraints and Step 1's note), not a plan placeholder.
- **Type consistency:** `topbar(title, backHash, tint, rightContent, tintKey)` keeps its exact 5-parameter signature at all 3 call sites; only the `elApp.append(...)` wrapper is dropped, matching its new `undefined`-return, side-effecting-only behavior. `resetHeaderToBrand()` is a new 0-argument function used only from `renderHome()` — no other task or file references it.
- **Sequencing check:** Step 3 depends on Step 1 having written exactly one `BACK_ICON_PLACEHOLDER` occurrence — Step 3's own `assert content.count(placeholder) == 1` fails loudly if Step 1 wasn't run first or was run twice; Step 4 depends on Step 3.
- **Known deviation, explicit:** the back button's CSS moves from a bare `.back-btn` rule (usable anywhere) to `.app-header .back-btn` (scoped) — deliberate, since after this change the only place a `.back-btn` ever appears is inside `.app-header`, and an unscoped rule left behind would be misleading.
