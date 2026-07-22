# Fixed Header/Footer + App Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the persistent header/footer + app-version feature from `docs/superpowers/specs/2026-07-22-fixed-header-footer-design.md`: a fixed "RafaDex" brand bar and a new fixed footer (`amaix.com` + version + build date), both visible on every screen and never re-rendered by route changes.

**Architecture:** The header and footer move out of the per-route render cycle (`elApp.innerHTML = ""`) into `index.html` as static siblings of `<main id="app">`, written once at page load. A new `build.py` step reads a human-edited `VERSION` file and writes a small generated `version.js` (same pattern as the existing `sw.template.js` → `sw.js` generation), which a one-time startup script in `app.js` reads to fill the footer's text.

**Tech Stack:** Vanilla JS/CSS (unchanged), Python build pipeline (unchanged tooling, one new generated artifact).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-22-fixed-header-footer-design.md` (approved).
- Header: fixed, `top: 0`, height `48px`, `z-index: 20`, background `var(--bg)`, 26px ball icon + "RafaDex" at 18px/800/`var(--red)`. Visible on every screen (Home, type-world, detail, game) — it lives outside `#app`, so no per-screen code is needed for it to appear everywhere.
- Existing `.topbar` (type-world/detail/game screens) is unchanged except `top: 0` → `top: 48px`, so it sits directly under the new header. Its content, `z-index: 10`, and all other rules stay exactly as they are.
- Footer: fixed, `bottom: 0`, `z-index: 20`, background `var(--bg)`, single line, 11px, color `#999`, content `amaix.com · {VERSION} · {build date DD/MM/YYYY}`, bottom padding includes `env(safe-area-inset-bottom)`.
- Version source: a plain-text `VERSION` file at the repo root (human-edited, e.g. `v1.3`), combined by `build.py` with the current UTC date into a generated `version.js` (`window.APP_VERSION`, `window.APP_BUILD_DATE`) — same generated-artifact pattern as `sw.js`. `version.js` is committed to git, same as `data/dex.js`/`precache.js`/`sw.js` (see `CLAUDE.md`: these are pipeline outputs but are committed, not gitignored).
- No change to any Rafael-facing interaction (touch, swipe, audio, favorites, evolution strip, game, search) — visual/layout-only.
- No change to `data/dex.js`'s shape or the media pipeline.
- Git flow: feature branch off `develop`, PR-merge into `develop`, then a final PR `develop` → `master` (existing GitHub Actions workflow auto-deploys).
- Commit trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Python style: house STANDARDS (`lowerCamelCase` functions, no snake_case) — `renderVersionJs` matches the existing `renderServiceWorker`/`renderPrecacheJs` naming.

---

### Task 1: Version file + build.py generation

**Files:**
- Create: `VERSION`
- Modify: `build.py` (add `renderVersionJs`, wire into `main()`)
- Test: `tests/test_build.py`

**Interfaces:**
- Produces: `renderVersionJs(version, buildDate) -> str` — returns the exact two-line `window.APP_VERSION`/`window.APP_BUILD_DATE` assignment text. `main()` reads `VERSION` (stripped) and the current UTC date (`%d/%m/%Y`) and writes `version.js` via this function. Task 3's `app.js` change consumes the two `window.` globals this produces.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b feat/fixed-header-footer
```

- [ ] **Step 2: Create the VERSION file**

Create `VERSION` at the repo root with exactly this content (a single line, no leading/trailing whitespace beyond the newline):

```
v1.3
```

- [ ] **Step 3: Write the failing test**

In `tests/test_build.py`, find:

```python
def testRenderServiceWorkerInjectsTimestamp():
    template = 'const VERSION = "__SW_BUILD__";\nconsole.log(VERSION);\n'
    out = build.renderServiceWorker(template, "20260722040414")
    assert out == 'const VERSION = "20260722040414";\nconsole.log(VERSION);\n'
    assert "__SW_BUILD__" not in out
```

Add immediately after it:

```python


def testRenderVersionJsEmitsWindowGlobals():
    out = build.renderVersionJs("v1.3", "22/07/2026")
    assert out == 'window.APP_VERSION = "v1.3";\nwindow.APP_BUILD_DATE = "22/07/2026";\n'
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pytest tests/test_build.py::testRenderVersionJsEmitsWindowGlobals -v`
Expected: FAIL with `AttributeError: module 'build' has no attribute 'renderVersionJs'`

- [ ] **Step 5: Implement `renderVersionJs` and wire it into `main()`**

In `build.py`, find:

```python
def renderServiceWorker(template, stamp):
    return template.replace("__SW_BUILD__", stamp)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="re-convert all media")
    args = parser.parse_args()
    entries = buildDataset()
    allIds = [entry["id"] for entry in entries]
    buildAssets(allIds, force=args.force)
    gen1Ids = [entry["id"] for entry in entries if entry["gen"] == 1]
    Path("precache.js").write_text(renderPrecacheJs(gen1Ids))
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    swTemplate = Path("sw.template.js").read_text()
    Path("sw.js").write_text(renderServiceWorker(swTemplate, stamp))
    missing = [i for i in allIds
               if not (Path(f"assets/sprites/thumb/{i}.webp").exists()
                       and Path(f"assets/sprites/full/{i}.webp").exists()
                       and Path(f"assets/cries/{i}.m4a").exists())]
    if missing:
        raise SystemExit(f"missing outputs for ids: {missing[:20]}...")
```

Replace with:

```python
def renderServiceWorker(template, stamp):
    return template.replace("__SW_BUILD__", stamp)


def renderVersionJs(version, buildDate):
    return f'window.APP_VERSION = "{version}";\nwindow.APP_BUILD_DATE = "{buildDate}";\n'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="re-convert all media")
    args = parser.parse_args()
    entries = buildDataset()
    allIds = [entry["id"] for entry in entries]
    buildAssets(allIds, force=args.force)
    gen1Ids = [entry["id"] for entry in entries if entry["gen"] == 1]
    Path("precache.js").write_text(renderPrecacheJs(gen1Ids))
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    swTemplate = Path("sw.template.js").read_text()
    Path("sw.js").write_text(renderServiceWorker(swTemplate, stamp))
    version = Path("VERSION").read_text().strip()
    buildDate = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    Path("version.js").write_text(renderVersionJs(version, buildDate))
    missing = [i for i in allIds
               if not (Path(f"assets/sprites/thumb/{i}.webp").exists()
                       and Path(f"assets/sprites/full/{i}.webp").exists()
                       and Path(f"assets/cries/{i}.m4a").exists())]
    if missing:
        raise SystemExit(f"missing outputs for ids: {missing[:20]}...")
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pytest tests/test_build.py::testRenderVersionJsEmitsWindowGlobals -v`
Expected: PASS

- [ ] **Step 7: Run the full pipeline for real and inspect the generated file**

Run: `python3 build.py`
Expected: exits 0 (no `missing outputs` error), and `version.js` now exists.

Run: `cat version.js`
Expected output (the date will be today's real UTC date, not necessarily `22/07/2026`):

```
window.APP_VERSION = "v1.3";
window.APP_BUILD_DATE = "22/07/2026";
```

- [ ] **Step 8: Run the full test suite**

Run: `pytest -q`
Expected: all tests pass (12 pre-existing + 1 new = 13 passed).

- [ ] **Step 9: Commit**

```bash
git add VERSION build.py tests/test_build.py version.js
git commit -m "feat: generate app version.js from a VERSION file

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Persistent fixed header

**Files:**
- Modify: `index.html` (add the header element)
- Modify: `style.css` (`.app-header` rules, `#app` top padding, `.topbar` offset, remove dead `.brand` rules)
- Modify: `app.js` (`renderHome`, remove the per-route brand block)

**Interfaces:**
- Produces: a persistent `.app-header` element, always present, never re-rendered — every later task and every existing screen can assume it is already on screen without any code of their own.

- [ ] **Step 1: Add the header element to index.html**

In `index.html`, find:

```html
<body>
<main id="app"></main>
<script src="data/dex.js"></script>
```

Replace with:

```html
<body>
<header class="app-header"><span class="ball"></span><span class="name">RafaDex</span></header>
<main id="app"></main>
<script src="data/dex.js"></script>
```

- [ ] **Step 2: Add the `.app-header` CSS and reserve space for it**

In `style.css`, find:

```css
@media (prefers-reduced-motion: reduce) {
  .bounce, .bounce:active { transition: none; transform: none; }
}

/* Home */
```

Replace with:

```css
@media (prefers-reduced-motion: reduce) {
  .bounce, .bounce:active { transition: none; transform: none; }
}

/* App chrome (persistent header/footer) */
.app-header { position: fixed; top: 0; left: 0; right: 0; z-index: 20; height: 48px;
  display: flex; align-items: center; gap: 8px; padding: 0 16px;
  background: var(--bg); border-bottom: 1px solid rgba(0,0,0,.06); }
.app-header .ball { width: 26px; height: 26px; border-radius: 50%; border: 3px solid #222;
  background: linear-gradient(180deg, var(--red) 46%, #222 46% 54%, #fff 54%); flex-shrink: 0; }
.app-header .name { font-size: 18px; font-weight: 800; color: var(--red); }

/* Home */
```

- [ ] **Step 3: Reserve top space in `#app` so content doesn't hide behind the fixed header**

In `style.css`, find:

```css
#app { max-width: 520px; margin: 0 auto; padding: 12px 12px calc(20px + env(safe-area-inset-bottom)); }
```

Replace with:

```css
#app { max-width: 520px; margin: 0 auto; padding: 60px 12px calc(20px + env(safe-area-inset-bottom)); }
```

- [ ] **Step 4: Shift the existing per-screen topbar down to sit under the new header**

In `style.css`, find:

```css
.topbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 10px;
  padding: 14px 12px; margin: 0 -12px 14px; background: var(--bg); }
```

Replace with:

```css
.topbar { position: sticky; top: 48px; z-index: 10; display: flex; align-items: center; gap: 10px;
  padding: 14px 12px; margin: 0 -12px 14px; background: var(--bg); }
```

- [ ] **Step 5: Remove the now-dead `.brand` CSS rules**

In `style.css`, find:

```css
/* Home */
.brand { display: flex; align-items: center; gap: 10px; padding: 8px 4px 14px; }
.brand .ball { width: 40px; height: 40px; border-radius: 50%; border: 4px solid #222;
  background: linear-gradient(180deg, var(--red) 46%, #222 46% 54%, #fff 54%); }
.brand h1 { margin: 0; font-size: 30px; font-weight: 800; color: var(--red); }
.game-btn { width: 100%; padding: 18px; margin-bottom: 14px; border-radius: var(--radius);
```

Replace with:

```css
/* Home */
.game-btn { width: 100%; padding: 18px; margin-bottom: 14px; border-radius: var(--radius);
```

- [ ] **Step 6: Remove the per-route brand block from `renderHome`**

In `app.js`, find:

```javascript
function renderHome() {
  elApp.innerHTML = "";
  const brand = el("div", "brand", `<div class="ball"></div><h1>RafaDex</h1>`);
  elApp.append(brand);
  const gameBtn = el("button", "game-btn bounce", "❓ Quem é esse Pokémon?");
```

Replace with:

```javascript
function renderHome() {
  elApp.innerHTML = "";
  const gameBtn = el("button", "game-btn bounce", "❓ Quem é esse Pokémon?");
```

- [ ] **Step 7: Syntax check**

Run: `node --check app.js` — Expected: no output (pass).

- [ ] **Step 8: Live verification**

Serve the app (`python3 -m http.server 8000`). Open `#home`: confirm a compact "RafaDex" bar (small ball + smaller name than before) is pinned at the very top and stays pinned while scrolling the type grid — it must never scroll away. Open `#type/fire`: confirm the RafaDex bar is still pinned at the top, and the existing "🔥 Fogo" bar (with its back button) is pinned directly beneath it — two bars stacked, both fixed while scrolling the card grid, the type bar's own content and back-button behavior unchanged. Open `#dex/6` and `#game` briefly and confirm the same stacked-bars layout with no code changes needed on those screens. Confirm no leftover `.brand` element or dead space appears anywhere.

- [ ] **Step 9: Commit**

```bash
git add index.html style.css app.js
git commit -m "feat: persistent fixed header across all screens

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Persistent fixed footer (version + company)

**Files:**
- Modify: `index.html` (add the footer element and the `version.js` script tag)
- Modify: `style.css` (`.app-footer` rules, `#app` bottom padding)
- Modify: `app.js` (fill the footer text once at startup)

**Interfaces:**
- Consumes: `window.APP_VERSION` / `window.APP_BUILD_DATE` (Task 1's generated `version.js`); the `.app-header` bar and `#app` top-padding reservation (Task 2 — unaffected by this task).
- Produces: a persistent `.app-footer` element, always present, showing `amaix.com · {version} · {build date}`.

- [ ] **Step 1: Add the footer element and version.js script tag**

In `index.html`, find:

```html
<main id="app"></main>
<script src="data/dex.js"></script>
<script src="audio.js"></script>
<script src="app.js"></script>
```

Replace with:

```html
<main id="app"></main>
<footer class="app-footer"><span id="footerText"></span></footer>
<script src="data/dex.js"></script>
<script src="version.js"></script>
<script src="audio.js"></script>
<script src="app.js"></script>
```

- [ ] **Step 2: Add the `.app-footer` CSS**

In `style.css`, find:

```css
.app-header .name { font-size: 18px; font-weight: 800; color: var(--red); }

/* Home */
```

Replace with:

```css
.app-header .name { font-size: 18px; font-weight: 800; color: var(--red); }
.app-footer { position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  padding: 6px 16px calc(6px + env(safe-area-inset-bottom));
  background: var(--bg); border-top: 1px solid rgba(0,0,0,.06);
  text-align: center; font-size: 11px; color: #999; }

/* Home */
```

- [ ] **Step 3: Reserve bottom space in `#app` so content doesn't hide behind the fixed footer**

In `style.css`, find:

```css
#app { max-width: 520px; margin: 0 auto; padding: 60px 12px calc(20px + env(safe-area-inset-bottom)); }
```

Replace with:

```css
#app { max-width: 520px; margin: 0 auto; padding: 60px 12px calc(46px + env(safe-area-inset-bottom)); }
```

- [ ] **Step 4: Fill the footer text once at startup**

In `app.js`, find:

```javascript
window.addEventListener("hashchange", renderRoute);
renderRoute();
```

Replace with:

```javascript
document.getElementById("footerText").textContent =
  `amaix.com · ${window.APP_VERSION} · ${window.APP_BUILD_DATE}`;

window.addEventListener("hashchange", renderRoute);
renderRoute();
```

- [ ] **Step 5: Syntax check**

Run: `node --check app.js` — Expected: no output (pass).

- [ ] **Step 6: Live verification**

Serve the app. Open `#home` and confirm the footer shows the real values from `version.js` (e.g. `amaix.com · v1.3 · <today's UTC date in DD/MM/YYYY>` — not placeholder text), pinned at the very bottom, in small gray text, and that it never overlaps the type grid or the "❓" game button even when scrolled all the way down. Open `#type/water` (the largest type world) and scroll to the last row of cards: confirm the footer stays pinned and the last card is never hidden behind it. Open `#dex/133` (Eevee, tallest detail screen with its 8-branch evolution strip) and scroll to the bottom: confirm the evolution strip's last thumbnail is never hidden behind the footer. Open `#game` and confirm the footer renders correctly there too.

- [ ] **Step 7: Commit and merge phase**

```bash
git add index.html style.css app.js
git commit -m "feat: persistent fixed footer with company, version, and build date

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git checkout develop && git merge --no-ff feat/fixed-header-footer -m "merge: fixed header/footer + app version"
```

---

### Task 4: Deploy and verify

**Files:** none (deploy + verification only)

**Interfaces:**
- Consumes: the existing `.github/workflows/deploy.yml` (unchanged) and the merged `develop` branch.

- [ ] **Step 1: Open and merge the release PR**

```bash
git push origin develop
gh pr create --base master --head develop --title "release: fixed header/footer + app version" \
  --body "Persistent RafaDex header and a new footer (amaix.com + app version + build date), both fixed on every screen. Version is read from a human-edited VERSION file at the repo root.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr merge --merge
gh run watch   # confirm the deploy workflow succeeds
```

(If `git push origin develop` is blocked by the pre-push hook because you're on `develop`, push the ref from the feature branch instead: `git checkout feat/fixed-header-footer && git push origin refs/heads/develop:refs/heads/develop`.)

- [ ] **Step 2: Smoke-check the live site**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://atavaresm.github.io/rafadex/
curl -s https://atavaresm.github.io/rafadex/version.js
```

Expected: `200`, and `version.js` contains real `window.APP_VERSION`/`window.APP_BUILD_DATE` values (not the pre-feature 404, since the file didn't exist in production before this round).

- [ ] **Step 3: Full visual pass on production**

In a real browser against `https://atavaresm.github.io/rafadex/` (clear the service worker cache first — `navigator.serviceWorker.getRegistrations()` then `.unregister()` each, and `caches.keys()` then `.delete()` each, then reload — so the new files are actually loaded, not a previous deploy's cached shell):

- Home: header pinned at top while scrolling the type grid; footer pinned at bottom showing the real version/date; neither ever overlapped by content.
- A type world (Water, the largest): both header and the existing type-bar stay pinned while scrolling; footer stays pinned and never hides the last row of cards.
- Detail screen for a Pokémon with a long evolution strip (Eevee, `#dex/133`): footer never hides the strip's last thumbnail.
- Game screen: header/footer present and correctly positioned there too.
- Confirm nothing from the spec's non-goals regressed: swipe, sticky per-screen topbar content/back-button, scroll-position restore, search, favorites, evolution strip, and audio all still work exactly as before.

- [ ] **Step 4: Hand back to the user for the real-device pass**

Ask the user to check the same points on the real iPhone (the service worker's auto-update mechanism, confirmed working in the prior visual-design-system round, should deliver this update automatically on a fresh reload — no manual cache clear expected). Any failure: fix on a `fix/` branch off `develop` → PR → re-merge to `master` → re-verify. When all pass, update `docs/diario-de-bordo.md` and the `project_rafadex` memory file.

---

## Self-Review (done at writing time)

- **Spec coverage:** architecture (header/footer moved out of the render cycle — Tasks 2/3), version source (`VERSION` file + generated `version.js` — Task 1), header visual spec (Task 2), footer visual spec (Task 3), content reflow (`#app` top/bottom padding — Tasks 2/3 respectively), non-goals (no change to per-screen topbar content, no change to Rafael-facing interaction, no `data/dex.js` change — none of the tasks touch any of those).
- **Placeholder scan:** no TBD/TODO; every step has complete, exact code matched against the current file contents (verified via direct reads of `index.html`, `style.css`, `app.js`, `build.py`, `tests/test_build.py` before writing this plan).
- **Type consistency:** `renderVersionJs(version, buildDate) -> str` matches its one call site in `main()` and its one test. `window.APP_VERSION`/`window.APP_BUILD_DATE` names match exactly between Task 1's generated file and Task 3's consuming script. `.app-header`/`.app-footer`/`.name`/`.ball` class names are consistent between the `index.html` markup (Tasks 2/3) and the `style.css` rules that target them (same tasks).
- **Sequencing check:** Task 2's and Task 3's `index.html` edits touch overlapping lines (`<main id="app">` block) but in the correct order — Task 2's Find block matches the pre-feature file, and Task 3's Find block matches exactly what Task 2 leaves behind (verified by tracing Task 2's replacement text forward). The three `style.css` edits within Task 2 (`#app` padding, `.topbar` offset, `.brand` removal) target three non-overlapping regions of the file, so their order doesn't matter. Task 3's two `style.css` edits (`.app-footer` insertion after `.app-header .name`, and the `#app` padding change) each anchor on text that only exists after Task 2 has already run — correct, since Task 3 depends on Task 2.
- **Known deviation, accepted:** the footer's `env(safe-area-inset-bottom)` is only applied once (in the footer's own padding) and `#app`'s bottom-padding reservation (`46px + env(safe-area-inset-bottom)`) references the same environment value independently rather than compounding it — this is intentional (see the spec's section 5): `#app`'s padding only needs to clear the footer's rendered box, not double-count the safe area.
