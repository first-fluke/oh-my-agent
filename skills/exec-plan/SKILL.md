---
name: exec-plan
description: Execution plan generation and management — Plan lifecycle as repository artifact
disable-model-invocation: true
---

# /exec-plan

## Claude Code Adaptation

- Execute inline (no need to spawn subagents)
- Use Read, Write, Grep, Glob tools instead of MCP tools
- Plan lifecycle: `docs/exec-plans/active/` → `docs/exec-plans/completed/`
- Response language follows `language` setting in `.agents/config/user-preferences.yaml`

## Steps

### Step 1: Scope

Verify `docs/exec-plans/` exists, create `active/` and `completed/` subdirectories if needed. Check for related existing plans in `active/` and `completed/`. Assess complexity:
- **Simple** → execute directly, no plan needed
- **Medium** → lightweight plan (skip API contracts)
- **Complex** → full plan with all sections

Decompose the request using 4 elements: Goal, Context, Constraints, Done When.

Report scope assessment to the user. Get confirmation before proceeding.

### Step 2: Generate Plan

Create `docs/exec-plans/active/{plan-name}.md` using this template:

```markdown
# {Plan Title}

> {One-line goal}

**Status**: 🟡 Active
**Created**: {date}
**Owner**: {agent or human}

## Goal
{What this plan achieves — clear, testable outcome}

## Context
{Relevant background, related code, prior decisions}

## Constraints
{Rules, dependencies, compatibility requirements}

## Tasks

| # | Task | Agent | Priority | Status | Dependencies |
|---|------|-------|----------|--------|-------------|
| 1 | {task} | {agent} | P0 | ⬜ | — |
| 2 | {task} | {agent} | P0 | ⬜ | 1 |

## Done When
- [ ] {criterion 1}
- [ ] {criterion 2}

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| {date} | {what was decided} | {why} |

## Progress Notes

- [{date}] Plan created
```

**Naming**: kebab-case, e.g., `add-health-endpoint.md`. Optionally prefix with date for ordering.

**Task status emoji progression**: ⬜ → 🔵 → ✅ / ❌

### Step 3: API Contracts

If the plan involves cross-boundary work (frontend ↔ backend, service ↔ service): use template from `.agents/skills/_shared/api-contracts/template.md` if it exists. Save contract to `_shared/api-contracts/{contract-name}.md` and reference it from the plan.

### Step 4: User Review

Present the plan (task breakdown, agent assignments, completion criteria, dependency graph). **Get user confirmation before execution.**

### Step 5: Execution Handoff

- **Automated**: Pass plan to `/orchestrate`
- **Manual**: Pass to `/coordinate`

During execution, update task status inline and append timestamped progress notes.

### Step 6: Completion

When all Done When criteria are met:

1. Update status field: `🟡 Active` → `🟢 Completed`
2. Add completion date and summary to Progress Notes
3. Move file from `active/` to `completed/`
4. Update `docs/exec-plans/tech-debt-tracker.md` if any debt was introduced

$ARGUMENTS
