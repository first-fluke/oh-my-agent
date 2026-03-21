---
description: Create, manage, and track execution plans as first-class repository artifacts in docs/exec-plans/
---

# MANDATORY RULES — VIOLATION IS FORBIDDEN

- **Response language follows `language` setting in `.agents/config/user-preferences.yaml` if configured.**
- **NEVER skip steps.** Execute from Step 0 in order. Explicitly report completion of each step before proceeding.
- **You MUST use MCP tools throughout the entire workflow.** This is NOT optional.

---

## Core Philosophy

**Execution plans are first-class artifacts, checked into the repository.**

Complex work is captured in plans with progress and decision logs. Plans live in `docs/exec-plans/` and move through a lifecycle: `active → completed`.

---

## Step 0: Preparation

1. Read `.agents/skills/oma-coordination/SKILL.md` and confirm Core Rules.
2. Verify `docs/exec-plans/` directory exists. If not, create it with `active/` and `completed/` subdirectories.
3. Check `docs/exec-plans/active/` for existing plans that may relate to the current request.

---

## Step 1: Analyze Scope

1. **Decompose the request** using the prompt structure (Goal, Context, Constraints, Done When).
   - See `_shared/prompt-structure.md` for the four-element framework.
2. **Assess complexity** using `_shared/difficulty-guide.md`:
   - Simple → no exec-plan needed, execute directly
   - Medium → lightweight plan (skip Step 3)
   - Complex → full exec-plan with all sections
3. **Search for related plans** in `docs/exec-plans/completed/` — reuse patterns from similar past work.

Report scope assessment to the user. Get confirmation before proceeding.

---

## Step 2: Create Execution Plan

Generate `docs/exec-plans/active/{plan-name}.md` using this template:

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
| 3 | {task} | {agent} | P1 | ⬜ | 1, 2 |

## Done When
{Testable completion criteria}
- [ ] {criterion 1}
- [ ] {criterion 2}

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| {date} | {what was decided} | {why} |

## Progress Notes
{Append-only log of progress updates}

- [{date}] Plan created
```

### Naming Convention

- Use kebab-case: `add-user-authentication.md`, `migrate-payment-gateway.md`
- Prefix with date for ordering if needed: `2026-03-13-add-user-auth.md`

---

## Step 3: Define API Contracts (If Applicable)

If the plan involves cross-boundary work (frontend ↔ backend, service ↔ service):

1. Define API contracts using `_shared/api-contracts/template.md`.
2. Save to `_shared/api-contracts/{contract-name}.md`.
3. Reference from the exec-plan.

---

## Step 4: Review with User

Present the plan:
1. Task breakdown with priorities and dependencies
2. Agent assignments
3. Completion criteria
4. Estimated dependency graph

**Get user confirmation before execution.**

---

## Step 5: Execute

Hand off to orchestrator or coordinate workflow:

- **Automated**: Pass plan to `/orchestrate` — orchestrator reads the exec-plan and executes tasks
- **Manual**: Pass to `/coordinate` — oma-coordination follows the plan step by step

During execution, update the plan:
- Mark task status: ⬜ → 🔄 → ✅ or ❌
- Append progress notes with timestamps
- Record decisions in the decision log

---

## Step 6: Complete

When all "Done When" criteria are met:

1. Update plan status: `🟡 Active` → `🟢 Completed`
2. Add completion date and summary to progress notes
3. Move file: `docs/exec-plans/active/{name}.md` → `docs/exec-plans/completed/{name}.md`
4. Update `docs/exec-plans/tech-debt-tracker.md` if any debt was introduced

---

## Tech Debt Tracker

`docs/exec-plans/tech-debt-tracker.md` tracks known debt across all plans:

```markdown
# Tech Debt Tracker

| # | Debt | Source Plan | Priority | Proposed Resolution |
|---|------|------------|----------|-------------------|
| 1 | {description} | {plan-name} | P1 | {how to fix} |
```

- Add entries when shortcuts are taken during plan execution
- Remove entries when debt is resolved
- Review periodically — debt items can become exec-plans themselves
