---
description: Coordinate multiple agents for a complex multi-domain project using PM planning, parallel agent spawning, and QA review
---

# MANDATORY RULES — VIOLATION IS FORBIDDEN

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- **NEVER skip steps.** Execute from Step 0 in order. Explicitly report completion of each step to the user before proceeding to the next.
- **You MUST use MCP tools throughout the entire workflow.** This is NOT optional.
  - Use code analysis tools (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`, `search_for_pattern`) for code exploration.
  - Use memory tools (read/write/edit) for progress tracking.
  - Memory path: configurable via `memoryConfig.basePath` (default: `.serena/memories`)
  - Tool names: configurable via `memoryConfig.tools` in `mcp.json`
  - Do NOT use raw file reads or grep as substitutes. MCP tools are the primary interface for code and memory operations.
- **Read the oma-coordination skill BEFORE starting.** Read `.agents/skills/oma-coordination/SKILL.md` and follow its Core Rules.
- **Follow the context-loading guide.** Read `.agents/skills/_shared/core/context-loading.md` and load only task-relevant resources.

---

## Vendor Detection

Before starting, determine your runtime environment by following `.agents/skills/_shared/core/vendor-detection.md`.
The detected vendor determines how agents are spawned (Step 4) and monitored (Step 5).

---

## Step 0: Preparation (DO NOT SKIP)

1. Read `.agents/skills/oma-coordination/SKILL.md` and confirm Core Rules.
2. Read `.agents/skills/_shared/core/context-loading.md` for resource loading strategy.
3. Read `.agents/skills/_shared/runtime/memory-protocol.md` for memory protocol.
4. Record session start using memory write tool:
   - Create `session-work.md` in the memory base path
   - Include: session start time, user request summary.

---

## Step 1: Analyze Requirements

Analyze the user's request and identify involved domains (frontend, backend, mobile, QA).

- Single domain: suggest using the specific agent directly.
- Multiple domains: proceed to Step 2.
- Use MCP code analysis tools (`get_symbols_overview` or `search_for_pattern`) to understand the existing codebase structure relevant to the request.
- Report analysis results to the user.

---

## Step 2: Run PM Agent for Task Decomposition

// turbo
Activate PM Agent to:

1. Analyze requirements.
2. Define API contracts.
3. Create a prioritized task breakdown.
4. Save plan to `.agents/plan.json`.
5. Use memory write tool to record plan completion.

---

## Step 3: Review Plan with User

Present the PM Agent's task breakdown to the user:

- Priorities (P0, P1, P2)
- Agent assignments
- Dependencies
- **You MUST get user confirmation before proceeding to Step 4.** Do NOT proceed without confirmation.

---

## Step 4: Spawn Agents by Priority Tier

// turbo
Spawn agents for each task by priority tier (P0 first, then P1, etc.).
Spawn all same-priority tasks in parallel. Assign separate workspaces to avoid file conflicts.

### If Claude Code
Use the Agent tool to spawn subagents:
- `Agent(subagent_type="backend-engineer", prompt="Implement backend tasks per plan.", run_in_background=true)`
- `Agent(subagent_type="frontend-engineer", prompt="Implement frontend tasks per plan.", run_in_background=true)`
- Multiple Agent tool calls in the same message = true parallel execution
- Agent definitions: `.claude/agents/{agent}.md`

### If Codex CLI
Request parallel subagent execution with the specific tasks.
Pass each agent its task description, API contracts, and relevant context.

### If Gemini CLI or Antigravity or CLI Fallback
```bash
oh-my-ag agent:spawn backend "task description" session-id -w ./backend &
oh-my-ag agent:spawn frontend "task description" session-id -w ./frontend &
wait
```

---

## Step 5: Monitor Agent Progress

- Use memory read tool to poll `progress-{agent}.md` files
- Use MCP code analysis tools (`find_symbol` and `search_for_pattern`) to verify API contract alignment between agents
- Use memory edit tool to record monitoring results

---

## Step 6: Run QA Agent Review

After all implementation agents complete, spawn QA Agent to review all deliverables:

- Security (OWASP Top 10)
- Performance
- Accessibility (WCAG 2.1 AA)
- Code quality

---

## Step 6.1: Measure Quality Score (Conditional)

If automated measurement is available:
1. Load `quality-score.md` (conditional, per `context-loading.md`)
2. Measure Quality Score based on QA findings
3. Record as baseline in Experiment Ledger via memory tools

---

## Step 7: Address Issues and Iterate

If QA finds CRITICAL or HIGH issues:

1. Re-spawn the responsible agent with QA findings.
2. If Quality Score is active: measure after fix, apply Keep/Discard rule, record in Experiment Ledger.
3. Repeat Steps 5-7.
4. **If same issue persists after 2 fix attempts**: Activate **Exploration Loop** (load `exploration-loop.md` per `context-loading.md`):
   - Generate 2-3 alternative approaches via Exploration Decision template
   - Re-spawn the same agent type with different hypothesis prompts (separate workspaces)
   - QA scores each result
   - Best result adopted, others discarded
   - All experiments recorded in Experiment Ledger
5. Continue until all critical issues are resolved.
6. Use memory write tool to record final results.
7. If Quality Score was measured: generate Experiment Ledger summary and auto-generate lessons from discarded experiments.
