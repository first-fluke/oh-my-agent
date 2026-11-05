---
name: scm
description: SCM workflow for Git operations (branching/merge/conflict/worktree) plus Conventional Commit execution.
disable-model-invocation: true
---

- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization and completion.
- Read `.agents/skills/oma-scm/SKILL.md`; its canonical path, guardrails, and push rules own Git execution. This workflow adds an optional documentation hook.
- Execute inline with native Git tools. User-facing language follows project configuration; Git/PR text stays in English.

## Step 1: Determine intent
Classify the request as advisory/operations or commit execution. Use existing authorization; do not create commits for an advisory-only request.

## Step 2: Inspect and route
Inspect the repository using the SCM skill. For large merges, apply its `resources/merge-risk.md` criteria and preserve a rollback path. Ask only for a material missing decision or unapproved risky action; explicit user instructions override workflow defaults.

## Step 3A: SCM advisory/operations
Follow the skill's configuration-management resources for the requested operation. Report the selected approach, affected refs, conflicts, checks, and remaining risks. Large-merge reports also include change footprint, risk buckets, merge order, and recovery checkpoints.

## Step 3B: Commit execution
1. Select commit groups using the skill's Transitions rules.
2. Execute the skill's canonical commit path and, when requested, its Push and PR safety path.

## Step 3.5: Optional Doc Verify Hook
Only when `docs.auto_verify: true` in project configuration:
1. Run `oma docs verify --json` from the repository root.
2. Report a clean result or summarize broken references with their repair command. This hook is warn-only and does not block SCM completion.
3. If the command is unavailable, skip the optional hook; do not claim it passed.

## Step 4: Report result
Report the actual commit/branch/remote outcome, checks, and unresolved work. Use the skill's recovery rules for failures; do not report a rejected push or incomplete merge as completed.
