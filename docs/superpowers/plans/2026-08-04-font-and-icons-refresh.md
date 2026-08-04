# RafaDex Font + Icons Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the font+icon refinement from `docs/superpowers/specs/2026-08-04-font-and-icons-refresh-design.md`: Fredoka → Quicksand everywhere Fredoka is used, and Ghost/Dragon get real Material Symbols icons (skull, castle) instead of emoji.

**Architecture:** CSS font-face + 3 usage-site swap, plus a 2-entry addition to the existing `TYPE_ICONS` lookup table in `app.js`. Both new font assets are already prepared, self-hosted, and verified rendering correctly in a real browser before this plan was written — this plan wires them in, it doesn't create them from scratch.

**Tech Stack:** Vanilla JS/CSS (unchanged).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-04-font-and-icons-refresh-design.md` (approved via visual brainstorming).
- Font assets already exist on disk, prepared and verified before this plan was written: `assets/fonts/quicksand.woff2` (~14.8KB, weight 700, Latin subset — pt-BR diacritics confirmed rendering correctly) and a regenerated `assets/fonts/materialsymbolsrounded.woff2` (~6.9KB, now 18 glyphs — the 16 from the previous round plus `skull` U+F89A and `castle` U+EAB1). `assets/fonts/fredoka.woff2` has already been deleted from the repo (nothing will reference it after this plan).
- **Do not hand-retype the Unicode codepoints for `skull`/`castle`.** They are invisible Private-Use-Area characters, exactly like the 16 already in `TYPE_ICONS` — this exact class of edit silently corrupted to empty strings once already in this project (visual-identity-v2 Task 2, fixed in commit `96f7b7d`) when an implementer typed them by hand instead of copying the literal bytes. This plan's Step 1 code block below has the correct bytes; copy it verbatim (e.g. via your Edit tool's exact string match against the "Find" block, not by re-composing the object by hand), and verify with the codepoint-check command in Step 2 before moving on.
- Scope: only the surfaces Fredoka already covered (Home type labels, grid card names, detail screen names) move to Quicksand — no new surfaces gain a custom font, Baloo 2 stays everywhere else it already is.
- Rock's `diamond` icon is unchanged — out of scope this round (see spec Non-goals).
- Git flow: feature branch off `develop`, PR-merge into `develop`, then a release PR `develop` → `master`.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- No Python/pipeline changes — frontend/asset-only, no `pytest` additions; verification is live-browser only.
- Any change to `style.css`/font assets needs `python3 build.py` run before merge, so `sw.js`'s precache list drops the removed `fredoka.woff2` and picks up the regenerated `materialsymbolsrounded.woff2` under a fresh version stamp.

---

### Task 1: Swap Fredoka for Quicksand, add Ghost/Dragon icons, update precache list

**Files:**
- Modify: `app.js` (`TYPE_ICONS`)
- Modify: `style.css` (the Fredoka `@font-face` and its 3 usage sites)
- Modify: `sw.template.js` (`SHELL_CORE`)
- Regenerate: `sw.js`, `version.js` (via `build.py`)

**Interfaces:** None new — `TYPE_ICONS` keeps its existing shape (an object of type-key → icon-character-or-absent), just gains 2 entries. No function signatures change.

- [ ] **Step 1: Add Ghost and Dragon to `TYPE_ICONS`**

In `app.js`, find:

```javascript
const TYPE_ICONS = {
  normal: "", fire: "", water: "", electric: "",
  grass: "", ice: "", fighting: "", poison: "",
  ground: "", flying: "", psychic: "", bug: "",
  rock: "", dark: "", steel: "", fairy: "",
};
// Ghost and Dragon are deliberately absent — no good Material Symbols match
// was found for either; typeBadgeHtml() falls back to their emoji below.
```

Replace with:

```javascript
const TYPE_ICONS = {
  normal: "", fire: "", water: "", electric: "",
  grass: "", ice: "", fighting: "", poison: "",
  ground: "", flying: "", psychic: "", bug: "",
  rock: "", dark: "", steel: "", fairy: "",
  ghost: "", dragon: "",
};
// Rock keeps an imperfect "diamond" icon (no literal rock/boulder glyph exists
// in the font) — every other type, including Ghost and Dragon as of this round,
// has a real icon. The icon || info.emoji fallback in typeBadgeHtml() below stays
// in place as general-purpose defensive code, even though nothing currently uses it.
```

- [ ] **Step 2: Syntax check and byte-level verification**

```bash
node --check app.js
python3 -c "
import re
text = open('app.js', encoding='utf-8').read()
m = re.search(r'const TYPE_ICONS = \{(.*?)\};', text, re.S)
for part in re.findall(r'(\w+): \"(.)\"', m.group(1)):
    print(part[0], hex(ord(part[1])))
"
```

Expected: `node --check` produces no output. The Python check must print exactly 18 lines, and the two new ones must read `ghost 0xf89a` and `dragon 0xeab1` — if either is missing, or if `ghost`/`dragon` don't appear at all (meaning the regex didn't match a quoted single character, i.e. the value came out empty), stop and re-copy the Step 1 code block rather than retyping it by hand.

- [ ] **Step 3: Replace the Fredoka `@font-face` with Quicksand**

In `style.css`, find:

```css
@font-face {
  font-family: "Fredoka";
  src: url("assets/fonts/fredoka.woff2") format("woff2");
  font-weight: 700; font-display: swap;
}
```

Replace with:

```css
@font-face {
  font-family: "Quicksand";
  src: url("assets/fonts/quicksand.woff2") format("woff2");
  font-weight: 700; font-display: swap;
}
```

- [ ] **Step 4: Update the 3 usage sites**

In `style.css`, find:

```css
.type-btn .label { font-size: 15px; font-weight: 700; font-family: "Fredoka", sans-serif; }
```

Replace with:

```css
.type-btn .label { font-size: 15px; font-weight: 700; font-family: "Quicksand", sans-serif; }
```

In `style.css`, find:

```css
.mon-card .name { font-weight: 700; font-size: 15px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.3);
  font-family: "Fredoka", sans-serif; }
```

Replace with:

```css
.mon-card .name { font-weight: 700; font-size: 15px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.3);
  font-family: "Quicksand", sans-serif; }
```

In `style.css`, find:

```css
.detail .mon-name { font-size: 32px; font-weight: 800; margin: 4px 0 0; color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,.35); font-family: "Fredoka", sans-serif; }
```

Replace with:

```css
.detail .mon-name { font-size: 32px; font-weight: 800; margin: 4px 0 0; color: #fff;
  text-shadow: 0 2px 4px rgba(0,0,0,.35); font-family: "Quicksand", sans-serif; }
```

- [ ] **Step 5: Confirm no remaining Fredoka reference**

```bash
grep -rn "Fredoka\|fredoka" style.css app.js sw.template.js
```

Expected: no output. If anything matches, you missed a site.

- [ ] **Step 6: Update the service worker's precache list**

In `sw.template.js`, find:

```javascript
  "assets/fonts/fredoka.woff2", "assets/fonts/materialsymbolsrounded.woff2"];
```

Replace with:

```javascript
  "assets/fonts/quicksand.woff2", "assets/fonts/materialsymbolsrounded.woff2"];
```

- [ ] **Step 7: Regenerate `sw.js` and `version.js`**

```bash
python3 build.py
```

Expected: exits with no error; `git diff sw.js` shows only the `VERSION` timestamp changed (plus the `SHELL_CORE` line reflecting `quicksand.woff2` instead of `fredoka.woff2`, inherited from the template change in Step 6).

- [ ] **Step 8: Live verification**

Serve the app (`python3 -m http.server 8000`), open Home. Confirm: all 18 type labels render in Quicksand (visibly thinner/more geometric than the old Fredoka — compare against a memory of the previous look, or just confirm it's legible and clean), and the Ghost and Dragon tiles now show a skull icon and a castle icon respectively, in their type's own vivid color — not the old emoji. Open a type-world grid screen with a Ghost or Dragon Pokémon (e.g. `#type/ghost` or `#type/dragon`) and confirm the small corner badge on each card also shows the new icon, not the emoji, and the Pokémon name below the sprite is in Quicksand. Open that Pokémon's detail screen and confirm both the back-button-row badge and the Pokémon name are updated. Confirm a name with a pt-BR accent renders correctly (e.g. any Pokémon whose translated name has an accent, or just re-confirm "Água"/"Dragão" as type/label text render without mangled characters). Confirm Rock's icon is still the (unchanged) diamond.

- [ ] **Step 9: Commit**

```bash
git checkout -b feat/font-and-icons-refresh
git add app.js style.css sw.template.js sw.js version.js assets/fonts/quicksand.woff2 assets/fonts/materialsymbolsrounded.woff2
git rm assets/fonts/fredoka.woff2
git commit -m "feat: Quicksand replaces Fredoka; Ghost/Dragon get real icons

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

(`git rm` on `fredoka.woff2` is needed even though the file was already deleted from the working tree when this plan was written — it still needs to be staged as a deletion in this task's own commit. If `git status` shows it's already staged as deleted from an earlier commit on this branch's ancestry, `git add -u` alone is sufficient and the explicit `git rm` will simply report nothing to remove — either way, confirm with `git status` that the deletion is part of this commit.)

---

### Task 2: Deploy and verify

**Files:** none (deploy + verification only)

**Interfaces:**
- Consumes: the existing `.github/workflows/deploy.yml` (unchanged, triggers only on push to `master`).

- [ ] **Step 1: Merge to develop, push, open the release PR**

```bash
git checkout develop && git merge --no-ff feat/font-and-icons-refresh -m "merge: font+icons refresh (Quicksand, Ghost/Dragon icons)"
git checkout feat/font-and-icons-refresh && git push origin refs/heads/develop:refs/heads/develop
git checkout develop
gh pr create --base master --head develop --title "release: RafaDex font + icons refresh" \
  --body "Fredoka is replaced by Quicksand (cleaner, less rounded — same scope Fredoka had: type labels + Pokémon names). Ghost and Dragon get real outline icons (skull, castle) instead of the system emoji, matching the other 16 types. Rock's imperfect diamond icon is unchanged this round.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

(If the push is rejected by the pre-push hook, push the ref from `feat/font-and-icons-refresh` instead, as shown — the established workaround for this repo. Do not use `--no-verify`.)

- [ ] **Step 2: Get the user's explicit go-ahead before merging**

Report the PR URL and wait for explicit confirmation before running `gh pr merge` — this triggers a live deploy.

- [ ] **Step 3: Merge and watch the deploy**

```bash
gh pr merge --merge
gh run watch --exit-status
```

- [ ] **Step 4: Verify production**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://atavaresm.github.io/rafadex/
```

Expected: `200`. In a real browser against production: unregister any existing service worker and clear caches, then reload (may take one extra reload after the cache-clear to actually show the new shell — this has happened before in this project and is a browser-timing quirk, not a bug, per the previous round's diary entry). Repeat the Step 8 checks from Task 1 against production.

- [ ] **Step 5: Hand back to the user for the real-device pass**

Ask the user to check the same points on the real iPhone. Any failure: fix on a `fix/` branch off `develop` → PR → re-merge to `master` → re-verify. When all pass, update `docs/diario-de-bordo.md`.

---

## Self-Review (done at writing time)

- **Spec coverage:** font swap at all 4 sites (`@font-face` + 3 usages, Task 1 Steps 3-4), Ghost/Dragon icons (Task 1 Step 1), precache list update (Task 1 Step 6), Rock unchanged (no step touches it), Baloo 2 unchanged (no step touches header/footer/title CSS).
- **Placeholder scan:** no TBD/TODO; every step has exact code matched against the current file contents (verified by reading `app.js`, `style.css`, `sw.template.js` in full/relevant-part before writing this plan).
- **Type consistency:** `TYPE_ICONS` keeps its existing object shape; no function signature anywhere in this plan changes.
- **Sequencing check:** Task 1's "Find" blocks span 3 distinct files with no overlapping regions; the grep in Step 5 runs after all CSS edits and before the `sw.template.js` edit, catching any missed Fredoka reference early, mirroring the pattern used successfully in the visual-identity-v2 plan's Task 5.
- **Known deviation, explicit:** the plan does not ask the implementer to prepare or verify the font assets themselves (download, subset, browser-test) — that work is already done and verified, unlike a from-scratch font-integration task. This is called out explicitly in Global Constraints so no implementer re-does or second-guesses already-verified asset prep.
