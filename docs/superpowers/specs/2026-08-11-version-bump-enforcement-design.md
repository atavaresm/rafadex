# Version-Bump Enforcement Mechanism — Design Spec

**Date:** 2026-08-11
**Status:** Approved design, pending implementation plan

## What

Every deploy to production must carry a version bump, and today nothing enforces that: `VERSION` is a hand-edited two-part string (`v1.7`) that gets bumped only when someone remembers to. The previous round (RafaDex → Pokédex rebrand, `docs/superpowers/plans/2026-08-10-rebrand-pokedex-vermelho.md`) shipped a real user-visible change — new name, new institutional color — and `VERSION` never moved; it's still `v1.7`, the same value that shipped the unrelated cry-audio-removal round on 2026-08-10. This spec introduces a real control mechanism, not just a documented habit: a script that computes the next version, and a CI check that blocks any release PR into `master` where `VERSION` didn't actually increase.

This pairs directly with the branch protection just added to `rafadex` (PR + 1 approval required on `develop`/`master`, no direct push, no force-push, no deletion — see the diary entry for 2026-08-11). That protection already added `required_status_checks: null`; this spec is what fills that in with a real required check.

## The scheme

`VERSION` moves from two-part (`v1.7`) to full semver three-part: `vMAJOR.MINOR.PATCH`.

- **Patch** — small, self-contained change (a color/copy/bugfix round, e.g. today's rebrand).
- **Minor** — a new feature (e.g. the favorites system, the "who's that Pokémon" game, when those were first added).
- **Major** — reserved for a breaking/foundational change (nothing in the project's history so far would have qualified; this is future-proofing, not a near-term expectation).

As part of this round, `VERSION` is migrated `v1.7` → `v1.7.1` — the patch bump the rebrand round should have carried, applied now, with a `CHANGELOG.md` entry that documents the correction (see "Retroactive correction" below). This isn't cosmetic: the new CI check compares the PR's `VERSION` against `master`'s current `VERSION` and fails if they're equal, so this round's own PR must carry a real bump to pass its own new gate — the mechanism validates itself on introduction.

## Components

### 1. `bump_version.py` (new, repo root)

Two modes, one shared parsing/comparison core (house Python style: lowerCamelCase functions, no snake_case, ruff line-length 100):

- **`python3 bump_version.py patch|minor|major`** — reads `VERSION`, computes the next value per standard semver bump rules (patch: `x.y.z+1`; minor: `x.(y+1).0`, patch resets to 0; major: `(x+1).0.0`, minor and patch reset to 0), writes it back to `VERSION`, and prints the new version string to stdout.
- **`python3 bump_version.py --check <base>`** — parses the current `VERSION` file and the `<base>` argument (both accepting either two-part like `v1.7` — padded to `v1.7.0` — or three-part `vX.Y.Z`), and exits 0 only if the current value is well-formed AND strictly greater than `<base>`. Exits 1 with a clear stderr message otherwise (malformed value, or not increased). This is the exact logic the CI workflow calls; there is no separate comparison implementation to drift out of sync.

Parsing/formatting is shared between both modes (one `parseVersion(s) -> (major, minor, patch)` function, one `formatVersion(tuple) -> str`), so bump math and check math can never disagree about what a version string means.

### 2. `.github/workflows/version-check.yml` (new)

Triggers on `pull_request` targeting `master` (release PRs only — feature branches merging into `develop` are not gated, since `develop` doesn't deploy). Steps: checkout with full history (`fetch-depth: 0`, needed to read `master`'s `VERSION` via `git show origin/master:VERSION`), then run `python3 bump_version.py --check "$(git show origin/master:VERSION)"` against the PR's checked-out `VERSION`. Non-zero exit fails the check.

### 3. Branch protection update (`master` only)

The `required_status_checks` field on `master`'s protection (currently `null`, set today alongside the required-review rule) gets populated with this workflow's check context, so a release PR cannot merge without both an approval AND a passing version-bump check. `develop`'s protection is untouched — no status check is added there, matching the "release PRs only" scope above.

### 4. Retroactive correction (`CHANGELOG.md`)

A new `### Changed` bullet is added under a new `## v1.7.1` heading (dated 2026-08-11), stating that the RafaDex → Pokédex rebrand (name + institutional color) shipped under `v1.7` without a version bump, and that this round both corrects the version number and introduces the enforcement mechanism itself. The existing `## v1.7` heading and its bullets are left exactly as-is — they accurately describe what the cry-audio-removal round shipped at the time.

## Non-goals

- **`CHANGELOG.md` prose stays hand-written.** `bump_version.py` owns the `VERSION` file only — it does not generate, template, or touch changelog text. Every future release still gets a manually-authored `## vX.Y.Z` entry, same as today.
- **No gate on `develop`.** Feature/fix PRs merging into `develop` are unaffected; only the release PR from `develop` into `master` is checked, since that's the PR that actually triggers `deploy.yml`.
- **No change to the existing `sw.js` cache-busting timestamp mechanism** (`build.py`'s `datetime.now(timezone.utc).strftime(...)` stamp, independent of `VERSION`) — that already works correctly on every build regardless of whether `VERSION` changed, and is out of scope here.
- **No automatic classification of patch vs. minor vs. major from commit history.** Per the brainstorming decision, sizing the bump stays a judgment call made (by Claude, going forward, per established process) when preparing each release PR — the CI check only verifies that *some* valid increase happened, not that the *right size* of increase happened.

## Testing

- `tests/test_bump_version.py` (new, TDD): unit tests for `parseVersion`/`formatVersion` round-tripping; each bump type's arithmetic (patch/minor/major, including the reset-lower-parts rule); `--check` accepting a valid increase; `--check` rejecting an unchanged value; `--check` rejecting a *decrease*; `--check` padding a two-part base (`v1.7` → treated as `v1.7.0`) correctly; `--check` rejecting malformed input (missing `v` prefix, non-numeric parts, too many/few parts) with a non-zero exit and a clear message.
- Live verification (per house rule — green tests alone aren't enough for anything that touches the deploy/release path): open a real draft PR into `master` with `VERSION` left unchanged, confirm the new check fails red on GitHub; bump `VERSION`, push, confirm it turns green. Confirm the branch-protection UI shows the check as required before closing this out.
