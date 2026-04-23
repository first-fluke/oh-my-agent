---
description: Automated CLI-based parallel agent execution — spawn subagents via Gemini CLI, coordinate through MCP Memory, monitor progress, and run verification
---

# MANDATORY RULES — VIOLATION IS FORBIDDEN

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- **NEVER skip steps.** Execute from Step 0 in order. Explicitly report completion of each step before proceeding.
- **You MUST use MCP tools throughout the entire workflow.** This is NOT optional.
  - Use code analysis tools (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`, `search_for_pattern`) for code exploration.
  - Use memory tools (read/write/edit) for progress tracking.
  - Memory path: configurable via `memoryConfig.basePath` (default: `.serena/memories`)
  - Tool names: configurable via `memoryConfig.tools` in `mcp.json`
  - Do NOT use raw file reads or grep as substitutes. MCP tools are the primary interface.
- **Read required documents BEFORE starting.**

---

## Vendor Detection

Before starting, determine your runtime environment by following `.agents/skills/_shared/core/vendor-detection.md`.
The detected runtime vendor and each agent's target vendor determine how agents are spawned (Step 3) and monitored (Step 4).

---

## Step 0: Preparation (DO NOT SKIP)

1. Read `.agents/skills/oma-coordination/SKILL.md` and confirm Core Rules.
2. Read `.agents/skills/_shared/core/context-loading.md` for resource loading strategy.
3. Read `.agents/skills/_shared/runtime/memory-protocol.md` for memory protocol.

---

## Step 1: Load or Create Plan

Look for a plan file:

1. Check `.agents/results/plan-{sessionId}.json` (current session's plan).
2. If not found: find the most recent `.agents/results/plan-*.json` file.
3. If none exist: ask the user to run `/plan` first, or ask them to describe the tasks to execute.
- **Do NOT proceed without a plan.**

---

## Step 2: Initialize Session

// turbo

1. 설정 파일 로드:
   - `.agents/oma-config.yaml` (언어, CLI 매핑)
2. CLI 매핑 현황 표시:

   ```
   📋 CLI 에이전트 매핑
   ┌──────────┬─────────┐
   │ Agent    │ CLI     │
   ├──────────┼─────────┤
   │ frontend │ gemini  │
   │ backend  │ gemini  │
   │ mobile   │ claude  │
   │ pm       │ claude  │
   └──────────┴─────────┘
   ```

3. Generate session ID (format: `session-YYYYMMDD-HHMMSS`).
4. Use memory write tool to create `orchestrator-session.md` and `task-board.md` in the memory base path.
5. Set session status to RUNNING.

---

## Step 3: Spawn Agents by Priority Tier

// turbo
For each priority tier (P0 first, then P1, etc.):

- Each agent gets: task description, API contracts, relevant context from `_shared/core/context-loading.md`.
- Use memory edit tool to update `task-board.md` with agent status.

### Per-Agent Dispatch

For each planned agent, first resolve the target vendor from `.agents/oma-config.yaml`.

- If `target_vendor === current_runtime_vendor` and that runtime has a verified native role-subagent path, use the native vendor variant agent definition.
- Otherwise, use `oma agent:spawn` for that agent only.

### If Claude Code and target vendor is Claude

Spawn agents via **Agent tool** using `.claude/agents/{agent}.md` definitions.

- **Multiple Agent tool calls in same message** = true parallel execution
- Agent mapping:

| Domain | Subagent File |
|:------|:---------------|
| backend | `.claude/agents/backend-engineer.md` |
| frontend | `.claude/agents/frontend-engineer.md` |
| mobile | `.claude/agents/mobile-engineer.md` |
| db | `.claude/agents/db-engineer.md` |
| qa | `.claude/agents/qa-reviewer.md` |
| debug | `.claude/agents/debug-investigator.md` |
| pm | `.claude/agents/pm-planner.md` |
| architecture | `.claude/agents/architecture-reviewer.md` |
| tf-infra | `.claude/agents/tf-infra-engineer.md` |

- Include API contracts from `.agents/skills/_shared/api-contracts/` if they exist
- Load only task-relevant context (check codebase structure around affected domains)

### If Codex CLI and target vendor is Codex

Spawn native Codex custom agents using `.codex/agents/{agent}.toml` when available.
Pass each agent its task description, API contracts, and relevant context.
If native dispatch is not verified in the current runtime, fall back to `oma agent:spawn {agent_id} {prompt_file} {session_id} -w {workspace}`.

### If Gemini CLI and target vendor is Gemini

Spawn native Gemini subagents using `.gemini/agents/{agent}.md` when available.
If native dispatch is not verified in the current runtime, fall back to `oma agent:spawn {agent_id} {prompt_file} {session_id} -w {workspace}`.

### If target vendor differs from current runtime, or native dispatch is unavailable

Spawn agents using `oma agent:spawn {agent_id} {prompt_file} {session_id} -w {workspace}` only (custom subagents not available).

---

## Step 4: Monitor Progress

Use `oma agent:status {session_id} {agent_id}` to check process health.
Also use memory read tool to poll `progress-{agent}.md` for logic updates.

- Use memory edit tool to update `task-board.md` with turn counts and status changes.
- Watch for: completion, failures, crashes.

### Context Anxiety Check (per polling cycle)

At each poll, evaluate for every in-progress agent:

1. **Turn budget ratio**: `turns_used / expected_turns` from difficulty guide
2. **Progress ratio**: `completed_criteria / total_criteria` from task-board

| Turn Budget | Progress | Action |
|-------------|----------|--------|
| < 80% | any | Continue monitoring |
| >= 80% | >= 50% | Continue — agent is on track to finish |
| >= 80% | < 50% | **Context Reset**: Checkpoint + re-spawn (see `_shared/core/context-budget.md`) |
| 100% (max turns) | < 100% | **Context Reset**: Force checkpoint + re-spawn with remaining items |

Record reset events in `task-board.md`:
```
| Agent | Status | Note |
| backend | reset-1 | Turn budget 80%, progress 40%, checkpoint saved |
```

> **Claude Code note**: Agent tool returns results synchronously — no polling needed. Check status, files changed, and issues directly in each agent's return value.

---

## Step 5: Verify Completed Agents

// turbo
For each completed agent, run automated verification:

```
bash .agents/skills/oma-orchestrator/scripts/verify.sh {agent-type} {workspace}
```

- PASS (exit 0): accept result. If Quality Score is active, measure and record in Experiment Ledger.
- FAIL (exit 1): Before re-spawning, apply the Review Loop termination check:

  > **Review Loop termination conditions (OR — whichever fires first wins)**
  > 1. Retry count for this agent has reached the configured maximum (default: 2 retries). Do not start another retry cycle.
  > 2. Session cost cap exceeded: call `checkCap(sessionId, loadQuotaCap())` from `cli/io/session-cost.ts`. If `exceeded === true`, print `formatPromptMessage(result)` to the user and stop the loop immediately — save the current agent's partial results before stopping, then report early termination due to quota. Do not spawn the next retry or any remaining agents in the tier.
  >
  > If neither condition is met, re-spawn the agent with error context and increment the retry counter.

- FAIL (after 2 retries, and cost cap not yet exceeded): Activate **Exploration Loop** (load `exploration-loop.md` per `context-loading.md`):
  1. Generate 2-3 alternative hypotheses for the failing task
  2. Spawn the **same agent type** with different hypothesis prompts (parallel, separate workspaces)
  3. Score each result with Quality Score (if available)
  4. Keep the highest-scoring approach, discard others
  5. Record all experiments in Experiment Ledger

---

## Step 6: Collect Results

// turbo
After all agents complete, use memory read tool to read all `result-{agent}-{sessionId}.md` files.
Compile summary: completed tasks, failed tasks, files changed, remaining issues.

---

## Step 7: Final Report

Present session summary to the user.

- If any tasks failed after retries, list them with error details.
- Suggest next steps: manual fix, re-run specific agents, or run `/review` for QA.
- Use memory write tool to record final results.
- If Quality Score was measured during this session:
  - Generate Experiment Ledger summary (total experiments, keep rate, net delta)
  - Auto-generate lessons from discarded experiments (delta <= -5) into `lessons-learned.md`
  - Include agent effectiveness ranking in the report
