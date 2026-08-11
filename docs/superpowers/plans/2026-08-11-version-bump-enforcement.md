# Version-Bump Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the mechanism from `docs/superpowers/specs/2026-08-11-version-bump-enforcement-design.md`: a `bump_version.py` script that reads/bumps/checks the `VERSION` file, a CI check that runs it against every release PR into `master`, and a branch-protection update that makes that check required — so a release literally cannot merge without a real version increase.

**Architecture:** One new Python module (`bump_version.py`) with a shared parse/format/compare core, used both as a CLI bump tool and as the CI check's engine (no duplicate comparison logic). One new GitHub Actions workflow. One branch-protection API update (`master` only). Plus the one-time retroactive fix this round needs to pass its own new gate: `VERSION` moves `v1.7` → `v1.7.1`, with a `CHANGELOG.md` entry explaining why.

**Tech Stack:** Python 3.11+ (stdlib only — `argparse`, `pathlib`), pytest, GitHub Actions (`ubuntu-latest`), GitHub REST API via `gh api`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-11-version-bump-enforcement-design.md`.
- `VERSION` scheme: three-part `vMAJOR.MINOR.PATCH`. A two-part value like the current `v1.7` is treated as `v1.7.0` when parsed (needed to compare this round's new `v1.7.1` against `master`'s current two-part `v1.7`).
- `VERSION` file has **no trailing newline** today (verified: `v1.7` is exactly 4 bytes). Preserve that — write the new value with no trailing newline, matching the existing byte format exactly.
- Python style: house STANDARDS — `lowerCamelCase` for functions/variables, no `snake_case` outside test filenames/dunders, `ruff` line-length 100. Test functions use `testDescriptiveName` (see `tests/test_build.py` for the existing pattern in this repo).
- `bump_version.py` lives at the repo root (same level as `build.py`), not in a subdirectory — it's a sibling tool, not part of the data pipeline.
- The CI check (`.github/workflows/version-check.yml`) triggers **only** on `pull_request` targeting `master` — `develop` is not gated, matching the spec's non-goal (only the release PR that actually deploys is checked).
- `CHANGELOG.md` prose stays hand-written — this plan adds one new dated section by hand; `bump_version.py` never touches `CHANGELOG.md`.
- This round's own PR into `master` must carry a real `VERSION` bump (`v1.7` → `v1.7.1`) for the new CI check to pass on its own introduction — Task 1 includes that bump as part of the same commit that adds the tool, not a separate step.
- Git flow: feature branch off `develop`, PR-merge into `develop`, then a release PR `develop` → `master`. **As of today, both `develop` and `master` have GitHub branch protection: PR + 1 required approval, no direct push, no force-push, no branch deletion.** Self-approval is impossible on a solo repo, so every merge (this one included) goes through the repo-owner's admin-bypass merge option — get the human partner's **explicit chat confirmation before every merge**, into `develop` as well as `master` (not just the release PR), matching the practice established this session.
- Commit trailer: `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Any change to `index.html`/`style.css` would need a `python3 build.py` rebuild — not applicable to this round, nothing in this plan touches those files.

---

### Task 1: `bump_version.py` + tests, retroactive `VERSION`/`CHANGELOG.md` fix

**Files:**
- Create: `bump_version.py`
- Create: `tests/test_bump_version.py`
- Modify: `VERSION`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Produces: `parseVersion(text: str) -> tuple[int, int, int]` — raises `ValueError` on malformed input; pads a 2-part input to 3 parts with a trailing `0`.
- Produces: `formatVersion(parts: tuple[int, int, int]) -> str` — e.g. `(1, 7, 1)` → `"v1.7.1"`.
- Produces: `bumpVersion(current: tuple[int, int, int], size: str) -> tuple[int, int, int]` — `size` is `"patch"`, `"minor"`, or `"major"`; raises `ValueError` for anything else.
- Produces: `checkVersion(current: tuple[int, int, int], base: tuple[int, int, int]) -> None` — raises `ValueError` if `current <= base`.
- Consumes: nothing from earlier tasks (this is the first task).

- [ ] **Step 1: Write the failing tests**

Create `tests/test_bump_version.py`:

```python
import pytest

from bump_version import bumpVersion, checkVersion, formatVersion, parseVersion


def testParseVersionThreePart():
    assert parseVersion("v1.7.1") == (1, 7, 1)


def testParseVersionTwoPartPadsPatch():
    assert parseVersion("v1.7") == (1, 7, 0)


def testParseVersionStripsWhitespace():
    assert parseVersion("v1.7.1\n") == (1, 7, 1)


def testParseVersionRejectsMissingVPrefix():
    with pytest.raises(ValueError):
        parseVersion("1.7.1")


def testParseVersionRejectsNonNumericParts():
    with pytest.raises(ValueError):
        parseVersion("v1.x.1")


def testParseVersionRejectsWrongPartCount():
    with pytest.raises(ValueError):
        parseVersion("v1")
    with pytest.raises(ValueError):
        parseVersion("v1.2.3.4")


def testFormatVersionRoundTrips():
    assert formatVersion((1, 7, 1)) == "v1.7.1"


def testBumpPatch():
    assert bumpVersion((1, 7, 1), "patch") == (1, 7, 2)


def testBumpMinorResetsPatch():
    assert bumpVersion((1, 7, 9), "minor") == (1, 8, 0)


def testBumpMajorResetsMinorAndPatch():
    assert bumpVersion((1, 7, 9), "major") == (2, 0, 0)


def testBumpRejectsUnknownSize():
    with pytest.raises(ValueError):
        bumpVersion((1, 0, 0), "banana")


def testCheckVersionAcceptsIncrease():
    checkVersion((1, 7, 1), (1, 7, 0))  # must not raise


def testCheckVersionRejectsUnchanged():
    with pytest.raises(ValueError):
        checkVersion((1, 7, 0), (1, 7, 0))


def testCheckVersionRejectsDecrease():
    with pytest.raises(ValueError):
        checkVersion((1, 6, 9), (1, 7, 0))
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pytest tests/test_bump_version.py -v`
Expected: collection error or `ModuleNotFoundError: No module named 'bump_version'` — the module doesn't exist yet.

- [ ] **Step 3: Write `bump_version.py`**

Create `bump_version.py` at the repo root:

```python
"""Read, bump, or check the VERSION file's semver value."""

import argparse
import sys
from pathlib import Path

VERSION_FILE = Path("VERSION")


def parseVersion(text):
    text = text.strip()
    if not text.startswith("v"):
        raise ValueError(f"version must start with 'v': {text!r}")
    parts = text[1:].split(".")
    if len(parts) not in (2, 3):
        raise ValueError(f"version must have 2 or 3 numeric parts: {text!r}")
    if not all(p.isdigit() for p in parts):
        raise ValueError(f"version parts must be numeric: {text!r}")
    numbers = [int(p) for p in parts]
    while len(numbers) < 3:
        numbers.append(0)
    return tuple(numbers)


def formatVersion(parts):
    major, minor, patch = parts
    return f"v{major}.{minor}.{patch}"


def bumpVersion(current, size):
    major, minor, patch = current
    if size == "patch":
        return (major, minor, patch + 1)
    if size == "minor":
        return (major, minor + 1, 0)
    if size == "major":
        return (major + 1, 0, 0)
    raise ValueError(f"unknown bump size: {size!r}")


def checkVersion(current, base):
    if current <= base:
        raise ValueError(
            f"VERSION ({formatVersion(current)}) must be greater than "
            f"the base ({formatVersion(base)}) — bump it before releasing."
        )


def main():
    parser = argparse.ArgumentParser(description="Read, bump, or check the VERSION file.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("size", nargs="?", choices=["patch", "minor", "major"],
                        help="bump the VERSION file by this amount")
    group.add_argument("--check", metavar="BASE", help="check VERSION is greater than BASE")
    args = parser.parse_args()

    current = parseVersion(VERSION_FILE.read_text())

    if args.check is not None:
        base = parseVersion(args.check)
        checkVersion(current, base)
        print(f"OK: {formatVersion(current)} > {formatVersion(base)}")
        return

    newVersion = bumpVersion(current, args.size)
    VERSION_FILE.write_text(formatVersion(newVersion))
    print(formatVersion(newVersion))


if __name__ == "__main__":
    try:
        main()
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        sys.exit(1)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pytest tests/test_bump_version.py -v`
Expected: all 13 tests PASS.

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `pytest -q`
Expected: all tests pass (13 pre-existing + 13 new = 26).

- [ ] **Step 6: Run ruff**

Run: `ruff check bump_version.py tests/test_bump_version.py`
Expected: no errors. Line length is capped at 100 (`pyproject.toml`'s `[tool.ruff]`) — none of the lines above should exceed it, but double-check if ruff flags anything.

- [ ] **Step 7: Exercise the CLI directly (not just the unit tests)**

```bash
python3 bump_version.py --check v1.6.9
```

Expected: prints `OK: v1.7 ...` — wait, this reads current `VERSION` which is still `v1.7` at this point (not yet bumped) — expected output: `OK: v1.7.0 > v1.6.9` (exit 0).

```bash
python3 bump_version.py --check v1.7
```

Expected: fails — `VERSION` (`v1.7` → parsed as `v1.7.0`) is not greater than base (`v1.7` → also `v1.7.0`). Expected stderr: `error: VERSION (v1.7.0) must be greater than the base (v1.7.0) — bump it before releasing.`, exit code 1.

- [ ] **Step 8: Bump `VERSION` for real (the retroactive patch this round needs)**

```bash
python3 bump_version.py patch
cat VERSION
```

Expected: prints `v1.7.1`; `VERSION` file now contains exactly `v1.7.1` (no trailing newline — verify with `wc -c VERSION`, expect 6 bytes).

- [ ] **Step 9: Add the `CHANGELOG.md` entry**

In `CHANGELOG.md`, find:

```markdown
# Changelog

All notable changes to RafaDex by version. Dates are when each version shipped to
production (GitHub Pages). See `docs/diario-de-bordo.md` for the full story behind
each round.

## v1.7 — 2026-08-10
```

Replace with:

```markdown
# Changelog

All notable changes to RafaDex by version. Dates are when each version shipped to
production (GitHub Pages). See `docs/diario-de-bordo.md` for the full story behind
each round.

## v1.7.1 — 2026-08-11

### Changed
- Retroactively documents the RafaDex → Pokédex rebrand (name change, institutional
  color from blue-indigo to Pokémon red) that shipped under v1.7 without a version
  bump on 2026-08-10.
- Introduces `bump_version.py` and a CI check (`version-check.yml`) that blocks any
  release PR into `master` where `VERSION` hasn't increased — so this can't happen
  again.

## v1.7 — 2026-08-10
```

(Everything below the original `## v1.7 — 2026-08-10` heading, including its own bullets, stays exactly as it was — do not edit it.)

- [ ] **Step 10: Commit**

```bash
git checkout -b feat/version-bump-enforcement
git add bump_version.py tests/test_bump_version.py VERSION CHANGELOG.md
git commit -m "feat: add bump_version.py, bump VERSION to v1.7.1

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: CI check, branch-protection update, live verification, release

**Files:**
- Create: `.github/workflows/version-check.yml`

**Interfaces:**
- Consumes: `bump_version.py --check BASE` from Task 1 (must exit 0 on a valid increase, 1 otherwise — this task's CI step relies on exactly that exit-code contract).

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/version-check.yml`:

```yaml
name: version-check

on:
  pull_request:
    branches: [master]

jobs:
  check:
    name: version-check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Check VERSION was bumped
        run: |
          BASE_VERSION=$(git show origin/master:VERSION)
          python3 bump_version.py --check "$BASE_VERSION"
```

- [ ] **Step 2: Commit on the same feature branch**

```bash
git add .github/workflows/version-check.yml
git commit -m "ci: add version-check workflow for release PRs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Push the feature branch and open a PR into `develop`**

```bash
git push -u origin feat/version-bump-enforcement
gh pr create --base develop --head feat/version-bump-enforcement \
  --title "feat: version-bump enforcement mechanism" \
  --body "Adds bump_version.py (read/bump/check the VERSION file), a version-check CI workflow that will run on the next release PR into master, and the retroactive v1.7.1 bump + CHANGELOG entry for the undocumented RafaDex→Pokédex rebrand.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 4: Get the human partner's explicit go-ahead, then merge into `develop`**

Report the PR URL and wait for explicit confirmation before running `gh pr merge` — `develop` now has required-review branch protection, so this merge uses the repo-owner's admin-bypass option; per this session's established practice, that bypass is only ever used after an explicit chat confirmation.

```bash
gh pr merge --merge
```

- [ ] **Step 5: Prove the check catches a missing bump (the "red" case)**

From `develop` (now containing Task 1/2's commits), create a throwaway branch that does **not** touch `VERSION`, and open a **draft** PR against `master` to observe the check fail:

```bash
git checkout develop && git pull
git checkout -b tmp/version-check-red-test
git commit --allow-empty -m "test: verify version-check fails without a bump"
git push -u origin tmp/version-check-red-test
gh pr create --draft --base master --head tmp/version-check-red-test \
  --title "TEST: verify version-check red case (do not merge)" \
  --body "Throwaway PR to confirm the new version-check workflow fails when VERSION is unchanged. Will be closed immediately after."
gh pr checks --watch
```

Expected: the `version-check` check fails (VERSION on this branch is `v1.7.1`, same as `master` after Task 1/2 merge — no increase). Confirm the failure reason in the logs matches the `checkVersion` error message from Task 1.

- [ ] **Step 6: Close and clean up the throwaway PR**

```bash
gh pr close --delete-branch
```

- [ ] **Step 7: Open the real release PR (`develop` → `master`) — this is the "green" case**

```bash
git checkout develop && git pull
gh pr create --base master --head develop \
  --title "release: version-bump enforcement mechanism (v1.7.1)" \
  --body "Ships bump_version.py, the version-check CI gate on master, and the retroactive v1.7.1 correction for the undocumented RafaDex→Pokédex rebrand. See CHANGELOG.md.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
```

Expected: `version-check` passes (this PR's `VERSION` is `v1.7.1`, `master`'s is still `v1.7` at this point — a real increase).

- [ ] **Step 8: Get the human partner's explicit go-ahead, then merge**

Report the PR URL and the passing check, and wait for explicit confirmation before merging — this deploys to production (the footer will show `v1.7.1` after the next page load).

```bash
gh pr merge --merge
```

- [ ] **Step 9: Verify production and the branch-protection requirement**

```bash
curl -s https://amaix-dev.com/pokedex/version.js
```

Expected: `window.APP_VERSION = "v1.7.1";` — wait, `version.js` is only regenerated by `python3 build.py`, which this plan never runs (no `index.html`/`style.css` change in this round, so no rebuild was needed per the Global Constraints — but `VERSION` changed, and `version.js` is derived from it at build time, not at request time). **Before merging Step 8**, check whether `version.js` needs a manual `python3 build.py` re-run in this same PR to actually reflect `v1.7.1` in the shipped footer — if `git diff version.js` after running `python3 build.py` shows the version string changing (not just the date), add that regenerated `version.js` to Task 1's commit (`git add version.js`, amend or add as a follow-up commit on the same branch) before opening the release PR in Step 7. Confirm this locally first: `python3 build.py && cat version.js` and check both lines, not just the date.

- [ ] **Step 10: Register the CI check as required on `master`**

```bash
curl -s -H "Authorization: Bearer $(gh auth token)" \
  https://api.github.com/repos/atavaresm/rafadex/branches/master/protection \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['required_pull_request_reviews'])"
```

(Sanity-check the existing protection is still intact before modifying it.) Then update `required_status_checks` — reuse the same `required_pull_request_reviews`/`allow_force_pushes`/`allow_deletions`/`required_conversation_resolution` values already set on `master` today, only adding the check:

```bash
cat > /tmp/master-protection-with-check.json << 'EOF'
{
  "required_status_checks": {
    "strict": false,
    "checks": [{ "context": "version-check" }]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
EOF
gh api --method PUT repos/atavaresm/rafadex/branches/master/protection --input /tmp/master-protection-with-check.json
rm /tmp/master-protection-with-check.json
```

Expected: response JSON's `required_status_checks.checks` includes `{"context": "version-check", ...}`.

- [ ] **Step 11: Hand back to the human partner**

Report: the mechanism is live, `master` now requires `version-check` to pass before any future release PR can merge, and the current production version is `v1.7.1`. Add a diary entry to `docs/diario-de-bordo.md` summarizing this round (mirroring the pattern from the rebrand round's entry).

---

## Self-Review (done at writing time)

- **Spec coverage:** the scheme (3-part semver, Task 1 Step 3), the retroactive `v1.7.1` migration (Task 1 Steps 8-9), `bump_version.py`'s two modes sharing one parse/format/compare core (Task 1 Step 3), the CI workflow scoped to `pull_request → master` only (Task 2 Step 1), the branch-protection update adding the required check (Task 2 Step 10), and the live red/green verification (Task 2 Steps 5-8) are all covered. The non-goals (CHANGELOG stays hand-written, no gate on `develop`, no touch to the `sw.js` timestamp mechanism, no automatic patch/minor/major classification) are preserved by construction — nothing in either task's steps touches `sw.template.js`, `build.py`'s stamp logic, or adds changelog automation.
- **Placeholder scan:** no TBD/TODO; every step has exact code or exact commands. Step 9 of Task 2 is deliberately conditional ("check whether... if so, add it") because whether `version.js` needs regenerating depends on live inspection the plan can't pre-determine from a static read — this is flagged as an explicit decision point with a concrete command to resolve it, not a vague "handle appropriately."
- **Type consistency:** `parseVersion`/`formatVersion`/`bumpVersion`/`checkVersion` signatures are used identically in the test file (Task 1 Step 1) and the implementation (Task 1 Step 3) — both written in the same task by the same brief, checked against each other here: parameter shapes (`tuple[int,int,int]`) and function names match exactly.
- **Sequencing check:** Task 2 depends on Task 1's `bump_version.py` existing with the exact `--check` exit-code contract (0/1) — stated in Task 2's Interfaces block. Task 2's Steps 5-6 (throwaway red-case PR) must happen *before* Step 7's real release PR, and both must happen after Step 4's merge into `develop`, so that `develop` (and therefore both PR heads) actually contains `bump_version.py` — the steps are ordered accordingly.
- **Known risk flagged, not hidden:** Task 2 Step 9 surfaces a real question the plan author (this session) was not fully certain about — whether `version.js` needs a rebuild to reflect the new `VERSION` in production — rather than asserting an answer. Task 2 Step 10's `curl` sanity-check exists specifically so the branch-protection PUT (a shared/risky settings change) doesn't blindly overwrite `required_pull_request_reviews` etc. with stale values if they'd been changed between today and execution time.
