# RafaDex Remove Cry Audio Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the removal described in `docs/superpowers/specs/2026-08-09-remove-cry-audio-design.md`: delete the Pokémon cry-audio generation pipeline, the 1025 committed `.m4a` files, every runtime reference to them, and purge already-downloaded cries from installed devices (e.g. Rafael's iPhone) on next update.

**Architecture:** Pure removal across three independent surfaces — the Python build pipeline (`build.py`, generates/ships the files), the client (`app.js`'s per-generation download control), and the service worker (`sw.template.js`, which gains an active-cache-purge step so the ~13MB already on-device gets reclaimed). No new files, no new data, no new dependencies.

**Tech Stack:** Python (pipeline, pytest), vanilla JS (client + service worker), no framework/bundler.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-09-remove-cry-audio-design.md`.
- The `.ogg` source files in `~/project/pokedex/data/cries/` are untouched — read-only sibling project, out of scope.
- No change to pronunciation (🔊) or full-card narration (📖) — both are `speechSynthesis`, unrelated to recorded cry audio.
- Git flow: feature branch `chore/remove-cry-audio` off `develop`, PR-merge into `develop`, then a release PR `develop` → `master` (existing GitHub Actions workflow auto-deploys on push to `master`).
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Any change to `build.py` or `sw.template.js` needs `python3 build.py` run before merge so `sw.js`/`precache.js`/`version.js` get regenerated — do not hand-edit those three generated files.
- No JS test harness in this repo (pytest only covers `build.py`) — the `app.js` and `sw.template.js` changes are verified live only, per house rule "green tests are not enough" (`CLAUDE.md`).
- The `rafadex-runtime` cache is never versioned/cleared automatically today — only the `rafadex-shell-<VERSION>` cache is. The purge step this plan adds is the only mechanism that will ever remove the already-downloaded cry files from a device that installed the app before this change.

---

### Task 1: Pipeline — drop cry generation from `build.py`, update `tests/test_build.py`

**Files:**
- Create branch: `chore/remove-cry-audio` off `develop`
- Modify: `build.py:123-124` (delete `convertCry`), `build.py:131-149` (`buildAssets`), `build.py:152-157` (`renderPrecacheJs`), `build.py:183-186` (`main`'s missing-outputs check)
- Modify: `tests/test_build.py:89-95`, `tests/test_build.py:98-111`, `tests/test_build.py:119-133`

**Interfaces:**
- Consumes: nothing new.
- Produces: `buildAssets(ids, root=POKEDEX_ROOT, force=False)` no longer touches `assets/cries/` or `jobs["cry"]`. `renderPrecacheJs(ids)` returns a string with only `assets/sprites/thumb/{id}.webp` and `assets/sprites/full/{id}.webp` per id — later tasks (and `main()`) rely on this shape.

- [ ] **Step 1: Create the feature branch**

```bash
git checkout develop && git pull --quiet
git checkout -b chore/remove-cry-audio
```

- [ ] **Step 2: Update the three affected tests to the desired end state**

In `tests/test_build.py`, replace:

```python
def testRenderPrecacheJsListsGen1AssetUrls():
    out = build.renderPrecacheJs([1, 25])
    assert out.startswith("const RAFADEX_PRECACHE=")
    for url in ("assets/sprites/thumb/1.webp", "assets/sprites/full/25.webp",
                "assets/cries/25.m4a"):
        assert f'"{url}"' in out
    assert "/rafadex/" not in out  # relative URLs only
```

with:

```python
def testRenderPrecacheJsListsGen1AssetUrls():
    out = build.renderPrecacheJs([1, 25])
    assert out.startswith("const RAFADEX_PRECACHE=")
    for url in ("assets/sprites/thumb/1.webp", "assets/sprites/full/25.webp"):
        assert f'"{url}"' in out
    assert ".m4a" not in out  # cry audio no longer shipped
    assert "/rafadex/" not in out  # relative URLs only
```

Replace:

```python
def testConvertSpriteAndCryProduceFiles(tmp_path):
    srcPng = tmp_path / "in.png"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i",
                    "color=red:size=64x64", "-frames:v", "1", str(srcPng)], check=True)
    dstWebp = tmp_path / "out.webp"
    build.convertSprite(srcPng, dstWebp, 32)
    assert dstWebp.exists() and dstWebp.stat().st_size > 0

    srcOgg = tmp_path / "in.ogg"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i",
                    "sine=frequency=440:duration=0.2", str(srcOgg)], check=True)
    dstM4a = tmp_path / "out.m4a"
    build.convertCry(srcOgg, dstM4a)
    assert dstM4a.exists() and dstM4a.stat().st_size > 0
```

with:

```python
def testConvertSpriteProducesFile(tmp_path):
    srcPng = tmp_path / "in.png"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i",
                    "color=red:size=64x64", "-frames:v", "1", str(srcPng)], check=True)
    dstWebp = tmp_path / "out.webp"
    build.convertSprite(srcPng, dstWebp, 32)
    assert dstWebp.exists() and dstWebp.stat().st_size > 0
```

Replace:

```python
def testBuildAssetsSkipsUpToDateOutputs(tmp_path, monkeypatch):
    calls = []
    monkeypatch.setattr(build, "convertSprite", lambda s, d, w: calls.append(d) or d.write_bytes(b"x"))
    monkeypatch.setattr(build, "convertCry", lambda s, d: calls.append(d) or d.write_bytes(b"x"))
    root = tmp_path / "pokedex"
    for rel in ("data/sprites/official", "data/cries"):
        (root / rel).mkdir(parents=True)
    (root / "data/sprites/official/1.png").write_bytes(b"png")
    (root / "data/cries/1.ogg").write_bytes(b"ogg")
    monkeypatch.chdir(tmp_path)
    build.buildAssets([1], root)
    assert len(calls) == 3  # thumb + full + cry
    calls.clear()
    build.buildAssets([1], root)
    assert calls == []  # second run skips everything
```

with:

```python
def testBuildAssetsSkipsUpToDateOutputs(tmp_path, monkeypatch):
    calls = []
    monkeypatch.setattr(build, "convertSprite", lambda s, d, w: calls.append(d) or d.write_bytes(b"x"))
    root = tmp_path / "pokedex"
    (root / "data/sprites/official").mkdir(parents=True)
    (root / "data/sprites/official/1.png").write_bytes(b"png")
    monkeypatch.chdir(tmp_path)
    build.buildAssets([1], root)
    assert len(calls) == 2  # thumb + full
    calls.clear()
    build.buildAssets([1], root)
    assert calls == []  # second run skips everything
```

- [ ] **Step 3: Run the tests and confirm the expected failure**

Run: `pytest -q tests/test_build.py -v`
Expected: 1 failure — `testRenderPrecacheJsListsGen1AssetUrls` (fails the new `.m4a not in out` assertion, since `build.py` still emits cry entries). `testConvertSpriteProducesFile` and `testBuildAssetsSkipsUpToDateOutputs` already pass — the removed `.ogg` fixtures mean the still-present cry branch in `build.py` has nothing to act on, so those two don't exercise it either way.

- [ ] **Step 4: Remove `convertCry`**

In `build.py`, delete:

```python
def convertCry(src, dst):
    runFfmpeg(["-i", str(src), "-c:a", "aac", "-b:a", "64k", str(dst)])


```

(the function and the blank line that follows it, keeping one blank line before `def isUpToDate`).

- [ ] **Step 5: Drop the cry branch from `buildAssets`**

Replace:

```python
def buildAssets(ids, root=POKEDEX_ROOT, force=False):
    jobs = {"thumb": 0, "full": 0, "cry": 0}
    for kind in ("thumb", "full"):
        Path(f"assets/sprites/{kind}").mkdir(parents=True, exist_ok=True)
    Path("assets/cries").mkdir(parents=True, exist_ok=True)
    for monId in ids:
        srcPng = root / "data" / "sprites" / "official" / f"{monId}.png"
        srcOgg = root / "data" / "cries" / f"{monId}.ogg"
        targets = [(srcPng, Path(f"assets/sprites/thumb/{monId}.webp"), "thumb", 128),
                   (srcPng, Path(f"assets/sprites/full/{monId}.webp"), "full", 512)]
        for src, dst, kind, width in targets:
            if src.exists() and (force or not isUpToDate(src, dst)):
                convertSprite(src, dst, width)
                jobs[kind] += 1
        dstM4a = Path(f"assets/cries/{monId}.m4a")
        if srcOgg.exists() and (force or not isUpToDate(srcOgg, dstM4a)):
            convertCry(srcOgg, dstM4a)
            jobs["cry"] += 1
    print(f"assets: converted {jobs}")
```

with:

```python
def buildAssets(ids, root=POKEDEX_ROOT, force=False):
    jobs = {"thumb": 0, "full": 0}
    for kind in ("thumb", "full"):
        Path(f"assets/sprites/{kind}").mkdir(parents=True, exist_ok=True)
    for monId in ids:
        srcPng = root / "data" / "sprites" / "official" / f"{monId}.png"
        targets = [(srcPng, Path(f"assets/sprites/thumb/{monId}.webp"), "thumb", 128),
                   (srcPng, Path(f"assets/sprites/full/{monId}.webp"), "full", 512)]
        for src, dst, kind, width in targets:
            if src.exists() and (force or not isUpToDate(src, dst)):
                convertSprite(src, dst, width)
                jobs[kind] += 1
    print(f"assets: converted {jobs}")
```

- [ ] **Step 6: Drop the cry entry from `renderPrecacheJs`**

Replace:

```python
def renderPrecacheJs(ids):
    urls = []
    for monId in ids:
        urls += [f"assets/sprites/thumb/{monId}.webp", f"assets/sprites/full/{monId}.webp",
                 f"assets/cries/{monId}.m4a"]
    return f"const RAFADEX_PRECACHE={json.dumps(urls)};\n"
```

with:

```python
def renderPrecacheJs(ids):
    urls = []
    for monId in ids:
        urls += [f"assets/sprites/thumb/{monId}.webp", f"assets/sprites/full/{monId}.webp"]
    return f"const RAFADEX_PRECACHE={json.dumps(urls)};\n"
```

- [ ] **Step 7: Drop the `.m4a` check from `main`'s missing-outputs guard**

Replace:

```python
    missing = [i for i in allIds
               if not (Path(f"assets/sprites/thumb/{i}.webp").exists()
                       and Path(f"assets/sprites/full/{i}.webp").exists()
                       and Path(f"assets/cries/{i}.m4a").exists())]
```

with:

```python
    missing = [i for i in allIds
               if not (Path(f"assets/sprites/thumb/{i}.webp").exists()
                       and Path(f"assets/sprites/full/{i}.webp").exists())]
```

- [ ] **Step 8: Run the tests and confirm they all pass**

Run: `pytest -q`
Expected: all tests pass (same count as before minus zero — one test renamed, none removed).

- [ ] **Step 9: Lint**

Run: `ruff check .`
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add build.py tests/test_build.py
git commit -m "chore: drop cry-audio generation from the build pipeline

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Client — stop downloading cry URLs, purge already-cached ones

**Files:**
- Modify: `app.js:413-416` (`genAssets`)
- Modify: `sw.template.js:24-30` (`activate` handler)

**Interfaces:**
- Consumes: `RUNTIME` (`const RUNTIME = "rafadex-runtime";`, already defined in `sw.template.js:4`).
- Produces: `genAssets(gen)` returns only sprite URLs (2 per Pokémon instead of 3) — the parent "download generation" control (`cacheGen`, `app.js:418-429`) needs no change since it just fetches whatever `genAssets` returns.

- [ ] **Step 1: Drop the cry URL from `genAssets`**

In `app.js`, replace:

```javascript
function genAssets(gen) {
  return window.DEX.filter(m => m.gen === gen).flatMap(m =>
    [sprite(m.id, "thumb"), sprite(m.id, "full"), `assets/cries/${m.id}.m4a`]);
}
```

with:

```javascript
function genAssets(gen) {
  return window.DEX.filter(m => m.gen === gen).flatMap(m =>
    [sprite(m.id, "thumb"), sprite(m.id, "full")]);
}
```

- [ ] **Step 2: Purge stale cry entries from the runtime cache on activate**

In `sw.template.js`, replace:

```javascript
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys())
      if (key.startsWith("rafadex-shell-") && key !== SHELL) await caches.delete(key);
    await self.clients.claim();
  })());
});
```

with:

```javascript
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys())
      if (key.startsWith("rafadex-shell-") && key !== SHELL) await caches.delete(key);
    const runtime = await caches.open(RUNTIME);
    for (const request of await runtime.keys())
      if (request.url.includes("/assets/cries/")) await runtime.delete(request);
    await self.clients.claim();
  })());
});
```

- [ ] **Step 3: Commit**

```bash
git add app.js sw.template.js
git commit -m "chore: stop downloading cry audio, purge cached entries on update

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

(Live verification of both changes happens together in Task 3, Step 5, after the build artifacts are regenerated — testing `app.js`/`sw.template.js` in isolation before `sw.js` is regenerated would exercise stale generated output, not this change.)

---

### Task 3: Regenerate artifacts, delete committed cry files, update docs, verify

**Files:**
- Regenerate: `precache.js`, `sw.js`, `version.js` (via `build.py` — do not hand-edit)
- Delete: `assets/cries/*.m4a` (1025 files)
- Modify: `CLAUDE.md:8` (drop `assets/cries/*` from the `build.py` command description), `CLAUDE.md:19` (delete the now-false "Cries are `.m4a`..." line)

**Interfaces:** none — this task only runs the pipeline built in Task 1 and cleans up its former output.

- [ ] **Step 1: Regenerate the pipeline outputs**

```bash
python3 build.py
```

Expected: exits with no error. `git diff precache.js` shows the `.m4a` entries gone (452 → 302 entries — Gen 1 is 151 Pokémon × 2 assets instead of × 3). `git diff sw.js` shows only the `VERSION` timestamp constant changed plus the `activate` handler's new purge block (from Task 2). `git diff version.js` shows only the build date.

- [ ] **Step 2: Remove the committed cry files**

```bash
git rm -r assets/cries
```

Expected: 1025 files staged for deletion (~13MB).

- [ ] **Step 3: Update `CLAUDE.md`**

Replace:

```markdown
- `python3 build.py` — full pipeline: reads `/Users/amais/project/pokedex` (read-only),
  writes `data/dex.js`, `precache.js`, `assets/sprites/*`, `assets/cries/*` (all committed).
```

with:

```markdown
- `python3 build.py` — full pipeline: reads `/Users/amais/project/pokedex` (read-only),
  writes `data/dex.js`, `precache.js`, `assets/sprites/*` (all committed).
```

Delete the line (in the Architecture section):

```markdown
- Cries are `.m4a` because iOS Safari does not play `.ogg`.
```

- [ ] **Step 4: Full pipeline verification**

Run: `pytest -q`
Expected: all pass.

Run: `ruff check .`
Expected: clean.

- [ ] **Step 5: Live verification — cache purge and download control**

```bash
python3 -m http.server 8000
```

In a browser (not `file://`): open `http://localhost:8000`, open DevTools → Application → Service Workers, confirm the new worker is active. Open Application → Cache Storage → `rafadex-runtime`: before this session it may already hold cry entries from earlier local testing — if so, note their presence, then hard-reload once (forces `activate` to re-run) and confirm every `assets/cries/*.m4a` entry is gone. Open the ⚙️ settings panel, trigger "Baixar para usar sem internet" for a generation, watch the progress counter, then re-check Cache Storage → `rafadex-runtime` and confirm only `assets/sprites/thumb/*` and `assets/sprites/full/*` entries were added — no `.m4a`. Confirm the app still browses normally end-to-end: Home → a type → a Pokémon detail screen → 🔊 pronunciation → 📖 full-card narration → back → the "Quem é esse Pokémon?" game for one round. No console errors.

- [ ] **Step 6: Commit**

```bash
git add precache.js sw.js version.js CLAUDE.md
git commit -m "chore: remove committed cry-audio files and regenerate build artifacts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Merge, release, deploy, verify production

**Files:** none (git flow + deploy + verification only)

**Interfaces:**
- Consumes: the existing `.github/workflows/deploy.yml` (unchanged, triggers only on push to `master`).

- [ ] **Step 1: Push the branch and open the PR into `develop`**

```bash
git push -u origin chore/remove-cry-audio
gh pr create --base develop --head chore/remove-cry-audio \
  --title "chore: remove unused cry-audio pipeline" \
  --body "Removes cry (roar) audio generation, the 1025 committed .m4a files (~13MB), and every runtime reference — dead weight since the 05/08 round removed the last UI surface that played them. Adds an active-cache purge on service-worker activate so already-installed devices (Rafael's iPhone) reclaim the space on next update, without any user action.

Spec: docs/superpowers/specs/2026-08-09-remove-cry-audio-design.md
Plan: docs/superpowers/plans/2026-08-09-remove-cry-audio.md

## Test plan
- [x] pytest -q
- [x] ruff check .
- [x] Live: cache purge confirmed via DevTools, download-generation control confirmed cry-free, full app walkthrough clean

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 2: Merge into `develop`**

```bash
gh pr merge --merge
```

- [ ] **Step 3: Open the release PR `develop` → `master`**

```bash
git checkout develop && git pull --quiet
gh pr create --base master --head develop --title "release: remove cry audio" \
  --body "Promotes the cry-audio removal to production.

## Test plan
- [x] pytest -q / ruff — passed on develop
- [ ] Confirm cache purge and clean app walkthrough in production"
```

- [ ] **Step 4: Get the user's explicit go-ahead before merging**

This triggers a live deploy to the app Rafael actually uses. Report the PR URL and wait for explicit confirmation before running `gh pr merge`, per this project's established practice for every release PR.

- [ ] **Step 5: Merge and watch the deploy**

```bash
gh pr merge --merge
gh run watch --exit-status
```

- [ ] **Step 6: Verify production**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://atavaresm.github.io/rafadex/
```

Expected: `200`. Then in a real browser against the production URL: unregister any existing service worker and clear caches first (`navigator.serviceWorker.getRegistrations()` → `.unregister()` each, `caches.keys()` → `.delete()` each, then reload) so the new files are actually loaded, not a previous deploy's cached shell. Repeat the Task 3 Step 5 checks against production: Cache Storage has no `.m4a` entries, download-generation control stays cry-free, full app walkthrough clean.

- [ ] **Step 7: Hand back to the user for the real-device pass**

Ask the user to open the app on the real iPhone, let it update (may need to fully close and reopen, or wait for the background update check), then check on-device storage usage for the app dropped (Settings → General → iPhone Storage → RafaDex) and that browsing/sounds still work. Any failure: fix on a `fix/` branch off `develop` → PR → re-merge to `master` → re-verify. When confirmed, update `docs/diario-de-bordo.md`.

---

## Self-Review (done at writing time)

- **Spec coverage:** every file listed in the spec's "The changes" section has a task and exact before/after code — `build.py` (Task 1), `app.js` + `sw.template.js` (Task 2), `assets/cries/` + `precache.js`/regeneration + `CLAUDE.md` (Task 3), `tests/test_build.py` (Task 1). The spec's "Testing" section maps to Task 3 Step 5 (local live verification) and Task 4 Steps 6-7 (production + real-device verification).
- **Placeholder scan:** no TBD/TODO; every step shows exact before/after code matched against the files as read while writing this plan (`build.py`, `tests/test_build.py`, `app.js`, `sw.template.js`, `CLAUDE.md` all read in full or in the relevant range).
- **Type consistency:** N/A for JS (no new functions/interfaces introduced — `genAssets` keeps its signature, `activate`'s handler keeps its shape). Python: `buildAssets`, `renderPrecacheJs`, `main` all keep their existing signatures; only `convertCry` is removed, and nothing outside `build.py` calls it (confirmed via `grep -rn convertCry` returning only `build.py` and the test being edited in the same task).
- **Sequencing check:** Task 1 must land before Task 3 Step 1 (`python3 build.py` needs the updated `renderPrecacheJs`/`buildAssets` to not touch `assets/cries/`). Task 2 must land before Task 3 Step 1 too (the regenerated `sw.js` needs to bake in the new `activate` purge block from the current `sw.template.js`). Task 3 Step 2 (`git rm -r assets/cries`) is safe only after Step 1, since nothing in the pipeline reads from that directory once Task 1 is merged — confirmed no read path remains.
- **Known scope note:** Task 2's `app.js`/`sw.template.js` edits are committed before being live-verified (verification happens in Task 3 Step 5, after `build.py` regenerates `sw.js` from the edited template) — called out explicitly in Task 2 so whoever executes it doesn't stop to hand-test against the stale generated `sw.js`.
