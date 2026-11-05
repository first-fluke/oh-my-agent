# SCM Operations

## 1) Planning

1. Read the effective `scm` configuration and files listed under `documented_process`.
2. If missing, infer from `CONTRIBUTING.md` / `README`; state assumptions.
3. Confirm **branching model** and whether **force-push** on shared branches is allowed (default: not without explicit approval).

## 2) Identification

1. Canonical refs: default branch, release branches/tags, version sources (`package.json`, etc.).
2. `.gitattributes` / LFS for binaries and generated assets.
3. Branch names vs the effective `scm` configuration `branch_prefixes` when the project uses them.

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

### CODEOWNERS maintenance checklist

1. Validate CODEOWNERS file exists (prefer `.github/CODEOWNERS`).
2. Ensure critical paths are explicitly owned (not only fallback `*`).
3. Ensure owners are active and mapped to current teams.
4. Confirm branch protection requires CODEOWNERS review where needed.
5. Flag overlapping/ambiguous rules that can hide intended owners.

Read `change_governance.require_codeowners` and `ownership.*` in the effective `scm` configuration when present.

## 6) Onboarding risk scan (optional)

Use this quick scan when joining or inheriting a repository to identify risky areas before major changes.

1. High churn files in `lookback` window.
2. Ownership concentration / bus-factor signals.
3. Bug hotspot files from fix-related history.
4. Velocity trend by month.
5. Revert/hotfix/emergency frequency.

Read thresholds from the effective `scm` configuration `onboarding_metrics` when present and cite caveats:
- squash merge teams can distort ownership metrics,
- weak commit labeling reduces hotspot accuracy,
- monorepo commit counts can bias subsystem interpretation.
