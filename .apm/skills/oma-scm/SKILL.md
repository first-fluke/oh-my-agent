---
name: oma-scm
description: SCM (software configuration management) and Git — branching, merges, conflicts, worktrees, baselines, audit readiness, plus Conventional Commits and safe staging.
---

# Software configuration management — SCM (`oma-scm`)

This skill is the **single** place for **configuration management (CM)** on a software repo and for **Conventional Commits** / safe staging.

## When to use

- **Commits:** “commit this”, `/scm`, message type/scope, splitting staged changes into multiple commits.
- **CM / Git:** branching (gitflow, GitHub Flow, GitLab Flow, trunk-based), protected branches, merge queue, merge conflicts, rebase, cherry-pick, worktrees, submodules/subtrees, tags and releases.
- **Governance:** issue/ADR links, breaking-change footers, changelog or release-tool alignment.
- **Audit posture:** signed commits, CI before merge, secret-sensitive paths.

## Configuration

| File | Role |
|------|------|
| `config/commit-config.yaml` | Conventional Commit types, branch prefixes, message rules |
| `config/cm-config.yaml` | CM pointers — documented process, branching model, baselines, changelog |

## Operating mode (choose first)

### Quick Path (commit-focused, default)

Use this when the user intent is mainly "commit this safely."

1. Follow **Conventional Commits** section only
2. Stage explicit files only
3. Validate message type/scope/length from `commit-config.yaml`
4. Stop after safe commit unless user asks CM/governance operations

### Full CM Path (repo governance / risky history operations)

Use this when the user asks about branching strategy, merges, rebase/cherry-pick, worktrees, release refs, CODEOWNERS, or audit posture.

1. Run CM workflows in order (Planning -> Identification -> Control -> Status accounting -> Verification)
2. Add onboarding risk scan when inheriting or auditing a repository
3. Include commit governance from Conventional Commits when creating commits
4. For large-scope merge operations, use risk scoring and Ask Gate criteria from `../../workflows/scm.md`

## CM process map (software)

| CM function | Intent | Typical artefacts / actions |
|-------------|--------|------------------------------|
| **Management & planning** | Agreed rules | `CONTRIBUTING.md`, `SECURITY.md`, `cm-config.yaml` |
| **Configuration identification** | What is managed, naming | Branch/tag rules, version files, `.gitattributes`, LFS |
| **Configuration control** | Reviewed change | PRs, checks, issue links, `BREAKING CHANGE` footers |
| **Status accounting** | As-built truth | `main` / release refs, `CHANGELOG`, tags, CI status |
| **Verification & audit** | Evidence | CI logs, signed commits, lockfiles / SBOM policy |

## CM workflows (use before risky history operations)

### 1) Planning

1. Read `cm-config.yaml` and files listed under `documented_process`.
2. If missing, infer from `CONTRIBUTING.md` / `README`; state assumptions.
3. Confirm **branching model** and whether **force-push** on shared branches is allowed (default: not without explicit approval).

### 2) Identification

1. Canonical refs: default branch, release branches/tags, version sources (`package.json`, etc.).
2. `.gitattributes` / LFS for binaries and generated assets.
3. Branch names vs `commit-config.yaml` `branch_prefixes` when the project uses them.

### 3) Control

1. Small, reviewable units; align commits with PR / issue intent.
2. **Conflicts:** `merge-base`, `git status`, resolve markers, tests; suggest `rerere` when conflicts repeat.
3. **Worktrees:** `git worktree add`; merge/rebase from the **target branch’s** checkout; all worktrees share one object database.
4. Do not rewrite **shared** history without maintainer approval; prefer `--force-with-lease` if force-push is unavoidable.

### 4) Status accounting

1. `git status -sb`: branch, remote tracking, ahead/behind, merge state.
2. Relate last tag / release branch to `CHANGELOG` or tooling (semantic-release, release-please, changesets) if present.

### 5) Verification & audit

1. Required CI and `merge_group` when merge queue applies.
2. Never stage/commit secrets (`.env`, keys, raw tokens).
3. Call out signed-commit expectations when the org cares about verification badges.

#### CODEOWNERS maintenance checklist

1. Validate CODEOWNERS file exists (prefer `.github/CODEOWNERS`).
2. Ensure critical paths are explicitly owned (not only fallback `*`).
3. Ensure owners are active and mapped to current teams.
4. Confirm branch protection requires CODEOWNERS review where needed.
5. Flag overlapping/ambiguous rules that can hide intended owners.

Read `change_governance.require_codeowners` and `ownership.*` in `cm-config.yaml` when present.

### 6) Onboarding risk scan (optional, recommended)

Use this quick scan when joining or inheriting a repository to identify risky areas before major changes.

1. High churn files in `lookback` window.
2. Ownership concentration / bus-factor signals.
3. Bug hotspot files from fix-related history.
4. Velocity trend by month.
5. Revert/hotfix/emergency frequency.

Read thresholds from `cm-config.yaml` `onboarding_metrics` when present and cite caveats:
- squash merge teams can distort ownership metrics,
- weak commit labeling reduces hotspot accuracy,
- monorepo commit counts can bias subsystem interpretation.

---

## Conventional Commits

### Commit types

| Type | Description | Branch Prefix |
|------|-------------|---------------|
| feat | New feature | feature/ |
| fix | Bug fix | fix/ |
| refactor | Code improvement | refactor/ |
| docs | Documentation changes | docs/ |
| test | Test additions/modifications | test/ |
| chore | Build, configuration, etc. | chore/ |
| style | Code style changes | style/ |
| perf | Performance improvements | perf/ |

### Commit format

```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: First Fluke <our.first.fluke@gmail.com>
```

### Commit workflow

#### Step 1: Analyze changes

```bash
git status
git diff --staged
git log --oneline -5
```

#### Step 1.5: Split by feature (if needed)

If changes span multiple features/domains, **split commits by feature**.

**Split when:** different scopes, different types, logically independent work.

**Do not split when:** one feature, few files (≤5), or user asked for a single commit.

#### Step 2: Determine type

- New capability → `feat` · Bug fix → `fix` · Structure-only → `refactor` · Docs only → `docs` · Tests → `test` · Build/config → `chore`

#### Step 3: Scope

Use module/component: `feat(auth):`, `fix(api):`, or omit: `chore: update dependencies`

#### Step 4: Description

≤72 chars (per `commit-config.yaml`), imperative mood, lowercase start, no trailing period.

#### Step 5: Execute commit

Show the message, then commit with explicit paths:

```bash
git add <specific-files>
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

[optional body]
EOF
)"
```

If HEREDOC is unstable in your shell (or body is long), use file-based commit input:

```bash
git add <specific-files>
cat > /tmp/oma-commit-msg.txt <<'EOF'
<type>(<scope>): <description>

[optional body]
EOF
git commit -F /tmp/oma-commit-msg.txt
```

Use HEREDOC by default, and switch to `-F` for long or flaky terminal sessions.

## References

- `config/commit-config.yaml`
- `config/cm-config.yaml`
- `resources/conventional-commits.md`
- `resources/onboarding-risk-signals.md`
- `resources/codeowners-playbook.md`

## Important notes

- **NEVER** `git add -A` or `git add .` without explicit user permission.
- **NEVER** commit likely-secret material.
- **ALWAYS** stage by explicit paths; tie non-trivial CM work to the five CM rows above, even briefly.
