---
name: scm
description: SCM workflow for Git operations (branching/merge/conflict/worktree) plus Conventional Commit execution.
disable-model-invocation: true
---

# MANDATORY RULES: VIOLATION IS FORBIDDEN

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- **NEVER skip steps.** Execute from Step 1 in order.

---

> **Vendor note:** This workflow executes inline (no subagent spawning). All vendors use native git tooling available in their environment.

---

## L1 Decision Events

Emit required L1 decisions by calling `oma state:emit` directly, as documented in `.agents/skills/_shared/runtime/event-spec.md`.

---

## Scope

Use this workflow for:
- SCM policy and operations (branch strategy, merge/rebase/conflict resolution, worktree usage, release/baseline handling)
- Conventional Commit message generation and safe commit execution

## Commit Types

| Type | Description |
|:-----|:-----------|
| feat | New feature |
| fix | Bug fix |
| refactor | Refactoring |
| docs | Documentation changes |
| test | Test additions/modifications |
| chore | Build/configuration |
| style | Code style |
| perf | Performance improvements |
| build | Build system / external dependencies |
| ci | CI configuration and scripts |
| revert | Revert a previous commit |

## Commit Format

```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: First Fluke <our.first.fluke@gmail.com>
```

## Workflow

### Step 1: Determine intent

Classify the request:
- **SCM advisory/operations:** no immediate commit requested
- **Commit execution:** commit requested now

### Step 2: Analyze repository state

Run `git status` and staged/unstaged diff checks.

For SCM operations, additionally summarize branch/ahead-behind/conflict state as needed.

### Step 2.5: Conflict-risk triage (required for large-scope merges)

Trigger this step when merge scope is large by change footprint, not PR count.
Read thresholds from `.agents/oma-config.yaml` `large_merge_thresholds.*` first.
If config values are missing, use these defaults:
- combined changed files >= 150
- combined additions+deletions >= 3000 lines
- touching >= 3 high-churn/hotspot paths
- any candidate has `risk_score >= 60`

Use these signals:
- file overlap across PRs (same files)
- line-range overlap when available
- branch age and divergence from base
- hotspot files (high churn/recent edits)
- ownership spread (many authors/teams touching same area)
- semantic flags (API contract/interface/schema changes)

Risk score formula (0-100):

`risk_score = overlap(0-40) + divergence(0-20) + hotspot(0-15) + ownership(0-15) + semantic(0-10)`

Bucket thresholds:
- **LOW** (0-29): no overlap, low divergence, no semantic flags
- **MEDIUM** (30-59): partial overlap or moderate divergence
- **HIGH** (60-100): line overlap, repeated hotspot collisions, or semantic flags

Scoring guidance:
- `overlap`: 0 (none), 20 (same file only), 40 (same file + overlapping lines)
- `divergence`: 0 (<24h and <=10 commits behind), 10 (1-3 days or <=50 behind), 20 (>3 days or >50 behind)
- `hotspot`: 0 (stable), 8 (moderate churn), 15 (top churn paths touched)
- `ownership`: 0 (single owner/team), 8 (2-3 owners), 15 (cross-team and unclear ownership)
- `semantic`: 0 (none), 5 (minor contract touch), 10 (API/schema/interface breaking risk)

Data sources (preferred order):
1. PR metadata/diff from GitHub CLI or API
2. Line-overlap detection — compare diff hunk ranges across candidate branches (no dedicated tool required):
   ```bash
   # Changed line ranges per file for one branch vs its merge-base
   git diff -U0 "$(git merge-base <base> <branch>)"..<branch> -- <file> | grep '^@@'
   # Repeat per candidate branch; two branches overlap on <file> when their
   # "+start,count" ranges from the @@ headers intersect.
   ```
3. Merge simulation (GitHub mergeability/queue simulation when available)
4. Local git history for churn/hotspot and ownership hints

For large-scope merges, propose merge order as:
1. LOW in small batches
2. MEDIUM in smaller batches
3. HIGH one-by-one with explicit checkpoints

### Step 2.6: Ask Gate (must ask before risky operations)

**Precedence:** an explicit, unambiguous user instruction overrides this gate (same as `oma-scm` SKILL.md Guardrail 0) — if the user already told you exactly what to do, state what you are doing and proceed without re-confirming. The single exception that always warrants a heads-up is likely-secret material. The gate below applies when the risky condition was NOT explicitly requested by the user.

Stop and ask user confirmation if any of these are true:
- merge conflicts are already present
- history rewrite is required (`--force`, `reset --hard`, destructive restore/clean)
- required checks, required reviews, or CODEOWNERS conditions are not satisfied
- protected/main branch policy could be violated
- release-critical paths are involved and rollback plan is unclear

Additional Ask Gate triggers:
- `risk_score >= 60`
- batch failure repeated 2+ times
- merge queue is unavailable and manual direct-merge is requested

### Step 3A: SCM advisory/operations path

Provide concrete, safe Git steps for the requested task:
- branch strategy (gitflow/github flow/trunk-based)
- merge conflict resolution
- rebase/cherry-pick/worktree operations
- release tags/baseline handling
- merge queue or staging-branch flow for high PR volume (batch + bisect on fail)

For large-scope merges, always include:
- risk-bucket table (LOW/MEDIUM/HIGH)
- proposed batch size and sequence
- rollback checkpoints and stop conditions

Do not create commits unless explicitly requested.

### Step 3B: Commit execution path

1. Separate features if needed — one commit per logical change. Tiebreaker when unclear: ≤5 files lean single commit; >5 files spanning multiple scopes/types lean split (see `oma-scm` SKILL.md Step 1.5 precedence).
   After deciding the commit grouping, emit and verify the required split decision:
   ```bash
   oma state:emit "decision.made" '{"subject":"scm.commit-split","decision":"Use the selected commit grouping for the current repository changes.","rationale":"The working tree was inspected and changes were grouped by scope/type before committing."}'
   oma state:verify --workflow scm --checkpoint commit-split
   ```
2. Determine type.
3. Determine scope.
4. Write description (imperative, lowercase, <=72 chars, no trailing period).
5. Execute commit with explicit file paths.
6. Push only when explicitly requested; follow `oma-scm` SKILL.md "Push and PR safety".

### Step 3.5: Optional Doc Verify Hook

If `oma-config.yaml` has `docs.auto_verify: true`:

1. Run `oma docs verify --json` from the repo root.
2. Capture the JSON output.
3. If `broken.length === 0`: print `docs verified clean (N docs)` summary to stdout and continue with workflow completion.
4. If `broken.length > 0`: print a 1-3 line summary identifying which docs have drift, and a hint `Run /oma-docs verify for the full report.` Continue with workflow completion (warn-only, never block).
5. If `oma-docs` is not available (CLI command missing): skip silently.

This hook is opt-in; the default `auto_verify: false` skips this step entirely.

### Step 4: Report result

Return what was done and any remaining risks/checks.

Use this reporting template for large-merge operations:

```markdown
## Merge Operation Report
- Target branch:
- PRs analyzed:
- Inputs:
  - changed_files:
  - changed_lines:
  - hotspot_paths_touched:
  - overlap_pairs:
  - line_overlap_pairs:
  - semantic_flags:
- Risk summary: LOW {n} / MEDIUM {n} / HIGH {n}
- Batch plan:
  - Batch 1:
  - Batch 2:
- Ask-Gate decisions taken:
- Conflicts encountered:
- CI/check status:
- Rollback actions (if any):
- Remaining risks:
```

Failure handling and rollback:
- On batch failure, bisect once and retry with smaller batch.
- If the second attempt fails, stop and escalate with Ask Gate.
- Never continue high-risk merges after repeated failures without explicit approval.
- For protected/main branches, prefer revert-based rollback over history rewrite.

## Absolute Rules

- Do NOT use `git add -A` / `git add .`; always specify files
- Do NOT commit secrets files (.env, credentials)
- For multi-line commit messages, use HEREDOC by default; if unstable or very long, use `git commit -F <message-file>`
- Co-Author: `First Fluke <our.first.fluke@gmail.com>`
