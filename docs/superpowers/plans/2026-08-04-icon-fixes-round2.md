# RafaDex Icon Fixes Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the icon changes from `docs/superpowers/specs/2026-08-04-icon-fixes-round2-design.md`: Flying's icon becomes a raven (was a wind swirl), Psychic's icon becomes an eye (was a head-with-gear). Rock and Bug are confirmed unchanged — no code touches them.

**Architecture:** A 2-value change inside the existing `TYPE_ICONS` lookup table in `app.js`, plus the already-prepared, already-verified regenerated icon font asset. Nothing else in the app changes.

**Tech Stack:** Vanilla JS/CSS (unchanged).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-04-icon-fixes-round2-design.md`.
- The regenerated `assets/fonts/materialsymbolsrounded.woff2` (still 18 glyphs, ~6.7KB) already exists on disk and is already committed — this plan wires in 2 codepoint changes in `app.js`, it doesn't touch any font file.
- **The two new codepoints (`raven` U+F555, `visibility` U+E8F4) are invisible Private-Use-Area characters — the exact class of edit that has now corrupted to empty strings THREE times in this project's history**, most recently in the immediately preceding round (see `docs/diario-de-bordo.md`, 2026-08-04 02:35 entry, and commit `1971226`). Step 1 below does not embed these characters directly in this plan document — instead it gives you a Python script that inserts them programmatically by codepoint, so no invisible character ever has to be typed, copied, or pass through anyone's generated text. Run the script exactly as given; do not attempt to hand-edit the two values afterward. The verification in Step 2 is mandatory, not optional.
- Git flow: feature branch off `develop`, PR-merge into `develop`, then a release PR `develop` → `master`.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- No Python/pipeline changes — frontend/asset-only, no `pytest` additions.
- Any change to `app.js`/font assets needs `python3 build.py` run before merge, so `sw.js` gets a fresh version stamp.

---

### Task 1: Swap Flying and Psychic to their new icons

**Files:**
- Modify: `app.js` (`TYPE_ICONS`)
- Regenerate: `sw.js`, `version.js` (via `build.py`)

**Interfaces:** None new — `TYPE_ICONS` keeps its existing shape, only 2 of its 18 values change.

- [ ] **Step 1: Run this script to update `TYPE_ICONS` — do not hand-edit the codepoints**

```bash
python3 - <<'PYEOF'
import re

path = "app.js"
text = open(path, encoding="utf-8").read()

raven = chr(0xf555)       # Flying's new icon
visibility = chr(0xe8f4)  # Psychic's new icon

# Replace exactly the two target entries by key, leaving every other
# character in the TYPE_ICONS block (all 16 other entries) completely
# untouched, byte for byte.
m = re.search(r"(const TYPE_ICONS = \{.*?\};)", text, re.S)
assert m, "TYPE_ICONS block not found"
block = m.group(1)

new_block = re.sub(r'flying: "."', f'flying: "{raven}"', block)
new_block = re.sub(r'psychic: "."', f'psychic: "{visibility}"', new_block)

assert new_block != block, "no substitution happened — flying/psychic pattern not found"
assert new_block.count('flying: "') == 1 and new_block.count('psychic: "') == 1

text2 = text.replace(block, new_block)
open(path, "w", encoding="utf-8").write(text2)
print("TYPE_ICONS updated.")
PYEOF
```

- [ ] **Step 2: Byte-level verification — confirm ALL 18 entries, not just the 2 you changed**

This is the exact check that would have caught the previous round's regression immediately instead of after a production deploy — run it and read every line, not just the two you expect to have changed.

```bash
node --check app.js
python3 -c "
import re
text = open('app.js', encoding='utf-8').read()
m = re.search(r'const TYPE_ICONS = \{(.*?)\};', text, re.S)
pairs = re.findall(r'(\w+): \"(.*?)\"', m.group(1))
print('total entries:', len(pairs))
for k, v in pairs:
    print(k, hex(ord(v)) if len(v) == 1 else ('EMPTY' if len(v) == 0 else 'MULTI-CHAR'))
"
```

Expected: `node --check` prints nothing. The Python check prints `total entries: 18`, followed by 18 lines, none reading `EMPTY` or `MULTI-CHAR`. Specifically: `flying 0xf555`, `psychic 0xe8f4`, and the other 16 must show their unchanged values from before this task — `normal 0xe838, fire 0xea05, water 0xe798, electric 0xea0b, grass 0xf205, ice 0xeb3b, fighting 0xeae9, poison 0xea4b, ground 0xe3df, bug 0xe868, rock 0xead5, dark 0xe51c, steel 0xe8b8, fairy 0xe65f, ghost 0xf89a, dragon 0xeab1`. If even one entry is `EMPTY` or missing, stop — do not proceed, do not attempt a manual fix, report back instead.

- [ ] **Step 3: Live verification**

Serve the app (`python3 -m http.server 8000`), open Home. Confirm the Flying tile shows a raven/bird icon (not the old wind swirl) and the Psychic tile shows a simple eye icon (not the old head-with-gear), both in their type's own vivid color. Confirm Rock (diamond) and Bug (the beetle icon) are visually unchanged. Open a type-world grid screen for Flying or Psychic (e.g. `#type/flying`) and confirm the small corner badge on each card also shows the new icon. Open one of those Pokémon's detail screens and confirm the back-button-row badge matches too.

- [ ] **Step 4: Regenerate `sw.js` and `version.js`**

```bash
python3 build.py
```

Expected: exits with no error; `git diff sw.js` shows only the `VERSION` timestamp changed.

- [ ] **Step 5: Commit**

```bash
git checkout -b feat/icon-fixes-round2
git add app.js sw.js version.js
git commit -m "feat: Flying gets a raven icon, Psychic gets an eye icon

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Deploy and verify

**Files:** none (deploy + verification only)

**Interfaces:**
- Consumes: the existing `.github/workflows/deploy.yml` (unchanged, triggers only on push to `master`).

- [ ] **Step 1: Merge to develop, push, open the release PR**

```bash
git checkout develop && git merge --no-ff feat/icon-fixes-round2 -m "merge: icon fixes round 2 (Flying, Psychic)"
git checkout feat/icon-fixes-round2 && git push origin refs/heads/develop:refs/heads/develop
git checkout develop
gh pr create --base master --head develop --title "release: RafaDex icon fixes round 2" \
  --body "Flying's icon changes from a wind swirl to a raven; Psychic's changes from a head-with-gear to a simple eye. Rock and Bug are confirmed unchanged — no better icon exists in the library for either.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

(If the push is rejected by the pre-push hook, push the ref from `feat/icon-fixes-round2` instead, as shown. Do not use `--no-verify`.)

- [ ] **Step 2: Get the user's explicit go-ahead before merging**

Report the PR URL and wait for explicit confirmation before running `gh pr merge`.

- [ ] **Step 3: Merge and watch the deploy**

```bash
gh pr merge --merge
gh run watch --exit-status
```

- [ ] **Step 4: Verify production**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://atavaresm.github.io/rafadex/
```

Expected: `200`. **Open a brand-new browser tab for this check — do not reuse a tab that already had RafaDex open in this session.** The previous round's verification was repeatedly confused by Chrome's back/forward cache (bfcache) silently restoring a stale, already-executed JS state in an existing tab across multiple `reload()`/navigate() calls, making a fixed deploy look broken for several minutes; a fresh tab sidesteps this entirely. In that fresh tab: unregister any service worker and clear caches, reload, and repeat the Step 3 checks from Task 1 against production. Also directly confirm via the runtime, not just visually: run `Object.entries(TYPE_ICONS).map(([k,v])=>k+':'+(v.length?v.codePointAt(0).toString(16):'EMPTY'))` in the console and confirm all 18 are present and non-empty, matching Task 1 Step 2's expected values.

- [ ] **Step 5: Hand back to the user for the real-device pass**

Ask the user to check the same points on the real iPhone. Any failure: fix on a `fix/` branch off `develop` → PR → re-merge to `master` → re-verify. When all pass, update `docs/diario-de-bordo.md`.

---

## Self-Review (done at writing time)

- **Spec coverage:** Flying → raven and Psychic → eye (Task 1), Rock/Bug explicitly unchanged (no step touches them, called out in Global Constraints and the PR description).
- **Placeholder scan:** no TBD/TODO. The one thing this plan deliberately does NOT embed directly is the two raw PUA characters themselves — by design, per the Global Constraints explanation, given this exact class of content has broken three times when embedded as literal text in a planning document or hand-edited. This is the opposite of a placeholder: it's a more reliable mechanism for the same content.
- **Type consistency:** `TYPE_ICONS` keeps its existing shape; no function signature anywhere changes.
- **Known deviation from the plan-writing convention used elsewhere in this project:** every other task in this project's plan history embeds exact "Find/Replace" code blocks directly in the plan text. This task deliberately breaks that convention for the 2 PUA-character values specifically, given the proven, repeated failure mode — Step 1 is a script, not a Find/Replace block, and Step 2's verification is intentionally stricter (checks all 18 entries, not just the 2 changed ones) than any prior round's equivalent check.
