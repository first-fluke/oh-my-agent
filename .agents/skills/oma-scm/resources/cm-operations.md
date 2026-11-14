# SCM Operations

## 1) Planning

1. Read the effective `scm` configuration (`conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author`, `forbidden_patterns`, `allowed_exceptions`) and the repository's documented process (`CONTRIBUTING.md`, `README`, release docs).
2. If neither states the process, infer it from branch and tag history; state assumptions.
3. Confirm **branching model** and whether **force-push** on shared branches is allowed (default: not without explicit approval).

## 2) Identification

1. Canonical refs: default branch, release branches/tags, version sources (`package.json`, etc.).
2. `.gitattributes` / LFS for binaries and generated assets.
3. Branch names vs `scm.branching_strategy` and the repository's documented prefixes; without a documented scheme, use the prefixes in `conventional-commits.md`.

## 3) Control

1. Small, reviewable units; align commits with PR / issue intent.
2. **Conflicts:** `merge-base`, `git status`, resolve markers, tests; suggest `rerere` when conflicts repeat.
3. **Worktrees:** `git worktree add`; merge/rebase from the **target branch’s** checkout; all worktrees share one object database.
4. Do not rewrite **shared** history without maintainer approval; prefer `--force-with-lease` if force-push is unavoidable.

## 4) Status accounting

1. `git status -sb`: branch, remote tracking, ahead/behind, merge state.
2. Relate last tag / release branch to `CHANGELOG` or tooling (semantic-release, release-please, changesets) if present.

## 5) Verification & audit

1. Required CI and `merge_group` when merge queue applies.
2. Never stage/commit secrets (`.env`, keys, raw tokens). Filename patterns from the effective `scm` configuration `forbidden_patterns` are enforced mechanically by the `scm-guard` PreToolUse hook; for content-level leaks (tokens hardcoded in ordinary source files), run a scanner when available (`gitleaks protect --staged`, `trufflehog git`) before large or unfamiliar commits.
3. Call out signed-commit expectations when the org cares about verification badges.
4. CODEOWNERS: apply the checks in `codeowners-playbook.md`.

## 6) Onboarding risk scan (optional)

When joining or inheriting a repository, run the scans in `onboarding-risk-signals.md` before major changes. That file states the lookback window, heuristics, and caveats.
