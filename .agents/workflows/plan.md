---
description: PM planning workflow — analyze requirements, select tech stack, decompose into prioritized tasks with dependencies, and define API contracts
---

# MANDATORY RULES — VIOLATION IS FORBIDDEN

- **Response language follows `language` setting in `.agents/config/user-preferences.yaml` if configured.**
- **NEVER skip steps.** Execute from Step 1 in order.
- **You MUST use MCP tools throughout the workflow.**
  - Use code analysis tools (`get_symbols_overview`, `find_symbol`, `search_for_pattern`) to analyze the existing codebase.
  - Use memory tools (write/edit) to record planning results.
  - Memory path: configurable via `memoryConfig.basePath` (default: `.serena/memories`)
  - Tool names: configurable via `memoryConfig.tools` in `mcp.json`
  - Do NOT use raw file reads or grep as substitutes.

---

## Step 1: Gather Requirements

Ask the user to describe what they want to build. Clarify:
- Target users
- Core features (must-have vs nice-to-have)
- Constraints (tech stack, existing codebase)
- Deployment target (web, mobile, both)

---

## Step 2: Analyze Technical Feasibility

// turbo
If an existing codebase exists, use MCP code analysis tools to scan:
- `get_symbols_overview` for project structure and architecture patterns.
- `find_symbol` and `search_for_pattern` to identify reusable code and what needs to be built.

---

## Step 3: Define API Contracts

// turbo
Design API contracts between frontend/mobile and backend. Per endpoint:
- Method, path, request/response schemas
- Auth requirements, error responses
- Save to `.agents/skills/_shared/core/api-contracts/`.

---

## Step 4: Decompose into Tasks

// turbo
Break down the project into actionable tasks. Each task must have:
- Assigned agent (frontend/backend/mobile/qa/debug)
- Title, acceptance criteria
- Priority (P0-P3), dependencies

---

## Step 5: Review Plan with User

Present the full plan: task list, priority tiers, dependency graph, agent assignments.
**You MUST get user confirmation before proceeding to Step 6.**

---

## Step 6: Save Plan

// turbo
Save the approved plan:
1. `.agents/plan.json`
2. Use memory write tool to record plan summary.
3. For complex plans (Medium/Complex per `_shared/core/difficulty-guide.md`), also create an execution plan artifact in `docs/exec-plans/active/` — see `/exec-plan` workflow for the template and lifecycle.

The plan is now ready for `/coordinate` or `/orchestrate` to execute.
