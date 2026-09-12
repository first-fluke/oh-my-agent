---
name: orchestrate
description: Automated parallel agent execution that spawns CLI subagents via native dispatch or `oma agent spawn`, coordinates through durable file state, monitors progress, and runs verification
disable-model-invocation: true
---

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Execute required steps on the selected path in dependency order; apply documented branch and skip conditions.
- Follow `.agents/skills/_shared/core/code-intelligence.md`: discover the configured provider's tools; do not install or track a repository; use native scoped search if unavailable or timed out, and record that limit.
- Persist coordination artifacts through the file-memory contract in `.agents/skills/_shared/runtime/memory-protocol.md`. That path is independent of code-intelligence MCP tools.
- **Read required documents BEFORE starting.**

---

## Agent execution evidence

Follow `.agents/skills/_shared/core/execution-policy.md` and `.agents/skills/_shared/runtime/result-contract.md`. Include QA and REFINE task IDs in the plan. For each native agent, begin a run, record checks, and finalize its structured result. For CLI dispatch, pass `--task-id` and use the injected run identity. Complete phase logs before finalizing the QA/REFINE artifacts; code changes after verification require fresh checks.


## Vendor Detection

Before starting, determine your runtime environment by following `.agents/skills/_shared/core/vendor-detection.md`.
The detected runtime vendor and each agent's target vendor determine how agents are spawned (Step 3) and monitored (Step 4).

---

## Step 0: Preparation (DO NOT SKIP)

1. Read `.agents/skills/oma-coordination/SKILL.md` and confirm Core Rules.
2. Read `.agents/skills/_shared/core/context-loading.md` for resource loading strategy.
3. Read `.agents/skills/_shared/runtime/memory-protocol.md` for memory protocol.
4. Read `.agents/skills/_shared/runtime/event-spec.md` for L1 event protocol.
5. Emit required L1 decisions by calling `oma state emit` directly, as documented in `.agents/skills/_shared/runtime/event-spec.md`.

---

## Step 1: Load or Create Plan

### 1a. Load

Look for a plan file:

1. Check `.agents/results/plan-{sessionId}.json` (current session's plan).
2. If not found: find the most recent `.agents/results/plan-*.json` file.
3. A plan is **usable** only when every task carries an agent assignment, a priority tier, its dependencies, and acceptance criteria. A plan missing any of these is not execution-ready — fall through to 1b rather than fanning out against it.

### 1b. Create (no usable plan)

A missing plan is not a stop condition. `/orchestrate` creates the plan itself instead of handing the request back to the user:

1. Generate the session ID now (format: `session-YYYYMMDD-HHMMSS`). Step 2 reuses this id verbatim — do not generate a second one.
2. Read and follow `.agents/workflows/plan.md`, passing this session ID as its `{sessionId}` and requiring an executable JSON plan even for Simple tasks. The artifact lands at `.agents/results/plan-{sessionId}.json`.
3. Present the plan under `plan.md` Step 6 and reuse existing authorization. Ask only for a material missing decision or new authorization; delegation does not authorize work outside the request.
4. Once the plan is saved and authorized, load it and continue to Step 2 with the same session ID.

Stop and report only when the plan cannot be produced: the user declines to plan, or `plan.md` blocks because the request is too underspecified to decompose.

- **Do NOT spawn agents without a usable plan.**

---

## Step 2: Initialize Session

1. Load configuration:
   - `.agents/oma-config.yaml` (`language`, `model_preset`, and per-agent `agents:` overrides)
2. Display the resolved agent-to-model mapping:

   ```
   Resolved agent models (model_preset + overrides)
   ┌──────────┬───────────────────┐
   │ Agent    │ Vendor / Model    │
   ├──────────┼───────────────────┤
   │ frontend │ (resolved value)  │
   │ backend  │ (resolved value)  │
   │ mobile   │ (resolved value)  │
   │ pm       │ (resolved value)  │
   └──────────┴───────────────────┘
   ```

3. Session ID: reuse the id generated in Step 1b when the plan was created in this run; otherwise generate one now (format: `session-YYYYMMDD-HHMMSS`).
4. **Domain gate**: for each planned task, classify it into `domain_tags` by matching against the `Intent signature` block of each installed `.agents/skills/oma-*/SKILL.md`, and derive `exposed_skill_set` (skills whose name is in `domain_tags`). If fewer than 2 skills match confidently, fall back to the full installed set and mark `exposure_fallback: true`. See `.agents/skills/oma-orchestration/SKILL.md` (PHASE 1.5) for the full rules.
5. Create `orchestrator-session-{sessionId}.md` and `task-board-{sessionId}.md` in the memory base. Record `Exposed Skills` and `Exposure Fallback` per task.
6. Set session status to RUNNING.

---

## Step 3: Spawn Agents by Priority Tier

Before spawning agents, emit and verify the required fan-out decision:

```bash
oma state emit "decision.made" '{"subject":"orchestrate.fanout-strategy","decision":"Spawn agents by priority tier using the loaded plan.","rationale":"The plan is available and determines which agents run in parallel."}'
oma state verify --workflow orchestrate --checkpoint fanout-strategy
```

For each priority tier (lowest first: tier 1, then tier 2, etc.):

- Each agent gets: task description, API contracts, relevant context from `_shared/core/context-loading.md`, and only its task's `exposed_skill_set` as the available specialist list (see `.agents/skills/oma-orchestration/resources/subagent-prompt-template.md` `{EXPOSED_SKILL_SET}`).
- Update `task-board-{sessionId}.md` with agent status.
- If a failed task's review history indicates a specialist outside its `exposed_skill_set` was needed, re-classify the task and re-dispatch with the expanded set instead of retrying against the original narrow set.

### Per-Agent Dispatch

For each planned agent, first resolve the target vendor from `.agents/oma-config.yaml`.

- If `target_vendor === current_runtime_vendor` and that runtime has a verified native role-subagent path, use the native vendor variant agent definition.
- Otherwise, use `oma agent spawn` for that agent only.

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
| refactor | `.claude/agents/refactor-engineer.md` |
| pm | `.claude/agents/pm-planner.md` |
| architecture | `.claude/agents/architecture-reviewer.md` |
| tf-infra | `.claude/agents/tf-infra-engineer.md` |
| docs | `.claude/agents/docs-curator.md` |

- Include API contracts from `.agents/results/api-contracts/` (run artifacts) or `docs/plans/contracts/` (durable specs) if they exist
- Load only task-relevant context (check codebase structure around affected domains)

### If OpenCode and target vendor is OpenCode

Spawn same-session subagents with the native `task` tool and `subagent_type: {agent-id}`. Do not use `oma agent spawn` for same-session OpenCode tasks; that external fallback does not appear as a native child task in the active UI/TUI.

### If Codex CLI and target vendor is Codex

Spawn native Codex custom agents using `.codex/agents/{agent}.toml` when available.
Pass each agent its task description, API contracts, and relevant context.
If native dispatch is not verified in the current runtime, fall back to `oma agent spawn {agent_id} {prompt_file} {session_id} --task-id {task.id} -w {workspace}`.

### If Gemini CLI and target vendor is Gemini

Spawn native Gemini subagents using `.gemini/agents/{agent}.md` when available.
If native dispatch is not verified in the current runtime, fall back to `oma agent spawn {agent_id} {prompt_file} {session_id} --task-id {task.id} -w {workspace}`.

### If target vendor differs from current runtime, or native dispatch is unavailable

Spawn agents using `oma agent spawn {agent_id} {prompt_file} {session_id} --task-id {task.id} -w {workspace}` only (custom subagents not available).

---

## Step 4: Monitor Progress

Use `oma agent status {session_id} {agent_id}` to check process health.
Also poll `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` for logic updates.

- Update `task-board-{sessionId}.md` with turn counts and status changes.
- Watch for: completion, failures, crashes.
- A `no-artifact` status (or `oma agent spawn` exit code 3) means the vendor exited 0 but wrote no result artifact under the workspace — a silent misdirected write. Treat it as a failed spawn: do NOT collect it as completed; re-dispatch (natively if the external vendor is unreliable) and check the session trail for the `blocker.raised` event.

### Check stalled progress

Use observed failures, missing artifacts, and unmet acceptance criteria to diagnose a stalled agent. Progress-file updates are not reliable turn counts. Do not restart from a fixed turn/progress ratio.

If useful context is lost or progress remains stalled, save completed work, remaining criteria, verification, and artifact paths before resuming or re-dispatching. Preserve partial results and avoid duplicating a live attempt. Follow `.agents/skills/_shared/core/context-budget.md` and the existing retry/cost limits.

> **Claude Code note**: Agent tool returns results synchronously, so no polling is needed. Check status, files changed, and issues directly in each agent's return value.

---

## Step 5: Verify Completed Agents

For each completed agent, execute the complete review loop:

1. **Mechanical self-check**: require the implementation agent to run applicable lint, typecheck, tests, and diff-scope checks. Feed failures back for correction, up to 3 cycles.
2. **Automated verify**: run the command below only for `backend`, `frontend`, `mobile`, `qa`, `debug`, and `pm`. For `db`, `refactor`, `architecture`, `tf-infra`, and `docs`, record `SKIP (unsupported agent type)` and continue.

```
bash .agents/skills/oma-orchestration/scripts/verify.sh {agent-type} {workspace}
```

- PASS (exit 0) or documented unsupported-type SKIP: continue to cross-review.
- FAIL (exit 1): use the shared aggregate recovery budget. The original attempt,
  each retry, and each exploration hypothesis consume one attempt. Respect the
  configured cost cap and reserve a complete 2–3 attempt round before
  exploration. When a bound is reached, preserve partial evidence and stop
  recovery; do not report the task as completed.

3. **QA cross-review**: spawn a QA agent with the completed agent's diff, acceptance criteria, mechanical-check evidence, and automated-verify result/SKIP reason. The QA agent returns PASS or FAIL with file-and-line findings. On FAIL, send the findings back to the implementation agent and restart at mechanical self-check. After the documented review limit, preserve failed checks and unresolved work, then report `partial` or `failed`; never force-complete.

---

## Step 6: Collect Results

After all agents finish, read their claims and run-scoped reports. Collect as
`completed` only plan tasks with successful required checks; summarize partial,
blocked, and failed tasks with their remaining issues.

Emit and verify the required QA verdict decision before the final report:

```bash
oma state emit "decision.made" '{"subject":"orchestrate.qa-verdict","decision":"Accept completed agents or record change requests.","rationale":"Agent verification results have been collected and classified."}'
oma state verify --workflow orchestrate --checkpoint qa-verdict
```

---

## Step 7: Final Report

Present session summary to the user.

- If any tasks failed after retries, list them with error details.
- Suggest next steps: manual fix, re-run specific agents, or run `/review` for QA.
- Use memory write tool to record final results.
- If actual experiments were run during this session:
  - Summarize experiment decisions and comparable measurement evidence
  - Record lessons in `lessons-{sessionId}.md` when experiment evidence supports a reusable cause and prevention action
  - Include the selected approach, comparison evidence, and remaining limits
