---
name: oma-scm
description: "Manage Git branches, merges, conflicts, commits, and release baselines. Use for repository history and change-management operations."
---

# Software Configuration Management

## Scheduling

### Goal
Perform Git operations with explicit scope, traceable commits, and recoverable history.

### Intent signature
- Commit, stage, push, branch, merge, rebase, resolve conflicts, manage worktrees, or inspect SCM governance.

### When to use
- Commit and push requests, including Conventional Commit messages and logical splitting.
- Branch/history operations, releases, baselines, CODEOWNERS, and configuration-management reviews.

### When NOT to use
- Implementing a feature or fixing application code -> use the owning specialist.
- General requirements planning -> use `oma-pm`; security/testing review -> use `oma-qa`.

### Expected inputs
Requested Git operation, repository state, and effective `scm` settings from project configuration.

### Expected outputs
Requested Git changes or an advisory plan, commit/branch identifiers, checks performed, and unresolved work.

### Dependencies
Git CLI; project configuration and hooks. Read the references below only for the selected operation.

## Structural Flow

### Entry
Inspect branch, upstream, staged/unstaged changes, and existing authorization. Select the commit path below or the configuration-management resource for broader operations.

### Transitions
- Commit-only request: finish after committing. Push or create a PR only when requested or required by the applicable workflow.
- Independent changes: split by feature. One logical change remains one commit even across code, tests, and docs; an explicit grouping instruction wins. File count is only a tiebreaker (at most five files lean single).
- Governance, worktrees, releases, or history operations: load `resources/cm-operations.md`.
- Large merges: load `resources/merge-risk.md` before selecting merge order or recovery steps.
- Default-branch push: apply the Push and PR safety section below.

### Failure and recovery
| Failure | Recovery |
|---|---|
| Unrelated dirty or staged files | Keep them outside the requested commit; never silently absorb them into an amend |
| Commit hook rejects a message | Fix the message or actual defect according to the hook; do not bypass it |
| Push is non-fast-forward | Fetch, inspect divergence, and integrate locally; do not retry with force |
| Conflicting changes | Preserve both intents, resolve, and run affected checks before completion |
| Likely secrets in the proposed diff | Stop before staging and identify the affected path without exposing the value |

### Exit
Report created commits/refs and verification. A failed commit, rejected push, or unresolved conflict is not completion.

## Logical Operations

### Canonical command path
1. Inspect the worktree and recent conventions:
   ```bash
   git status -sb
   git diff --staged
   git diff
   git log --oneline -5
   ```
2. Select logical commit groups under Transitions. Read `resources/conventional-commits.md` for message syntax, type, footer, and branch naming; apply repository hook/config limits.
3. Show the selected message. Stage explicit paths, inspect the staged diff, and commit using the prepared message file:
   ```bash
   git add -- <specific-files>
   git diff --cached --check
   git diff --cached
   git commit -F <message-file>
   ```
4. Inspect the resulting commit and remaining worktree. If push was requested, follow Push and PR safety, then report the remote result.

### Guardrails
1. Explicit, unambiguous user instructions take precedence over SCM defaults, including commit grouping and direct default-branch pushes. Existing authorization persists; do not ask for it again. Likely-secret material still requires stopping before staging.
2. Stage explicit paths. Do not use `git add -A` or `git add .` without explicit authorization, and never include credentials or secret files.
3. Do not rewrite shared history without explicit authorization. For an authorized rewrite, use `--force-with-lease`, never plain `--force`.
4. Read the staged diff before an amend. Unpushed commits may be amended or reorganized within the requested scope; pushed commits are shared history.
5. User-facing responses follow the configured language; commit messages, branch names, and PR titles/bodies stay in English.

### Push and PR safety (only when requested)
- Confirm the branch, upstream, and ahead/behind state before pushing.
- If `scm.require_pr_for_default_branch` is true, use a topic branch and PR for default-branch changes, unless the user explicitly requested a direct push.
- Keep the repository's required hooks/checks. A failure requires repair or an accurate partial result, not an assertion of success.
- Verify that the requested commits reached the intended remote branch.

### Amend, fixup, autosquash
Determine whether the target commit is shared using `git log --oneline @{u}..HEAD` when an upstream exists. If there is no upstream, inspect remote refs before assuming a commit is unshared. Keep unrelated staged changes out of the operation.

### Resource scope and effects
Git operations change the index, local commits/refs, worktrees, and possibly remote refs. Read only relevant project configuration; never copy credential values into messages or reports. Apply `.agents/skills/_shared/core/execution-policy.md` to authorization and verification.

## References
- Commit syntax, types, co-author policy, and branch naming: `resources/conventional-commits.md` (commit requests)
- Configuration-management operations: `resources/cm-operations.md` (governance/history/worktree tasks)
- Merge risk and rollback: `resources/merge-risk.md` (large merges)
- Ownership detail: `resources/codeowners-playbook.md` (CODEOWNERS work)
- Onboarding indicators: `resources/onboarding-risk-signals.md` (repository-risk assessment)
- Release observability: `../oma-observability/SKILL.md` §Integrations (release markers and baseline comparisons)