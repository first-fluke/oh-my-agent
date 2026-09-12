---
name: ultrawork
description: Ultrawork - high-quality 5-phase development workflow with 12 review steps out of 17
disable-model-invocation: true
---

- **Response language follows `language` setting in `.agents/oma-config.yaml` if configured.**
- Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Execute required steps on the selected path in dependency order; apply documented branch and skip conditions.
- Follow `.agents/skills/_shared/core/code-intelligence.md`: discover configured tools and use native scoped search if the provider is unavailable or times out. Do not install or track repositories automatically.
- Persist coordination artifacts through the file-memory contract in `.agents/skills/_shared/runtime/memory-protocol.md`; it is independent of code-intelligence MCP tools.
- **Read the oma-coordination skill BEFORE starting.** Read `.agents/skills/oma-coordination/SKILL.md` and follow its Core Rules.
- **Follow the context-loading guide.** Read `.agents/skills/_shared/core/context-loading.md` and load only task-relevant resources.

---

## Agent execution evidence

Follow `.agents/skills/_shared/core/execution-policy.md` and `.agents/skills/_shared/runtime/result-contract.md`. Include QA and REFINE task IDs in the plan. For each native agent, begin a run, record checks, and finalize its structured result. For CLI dispatch, pass `--task-id` and use the injected run identity. Complete phase logs before finalizing the QA/REFINE artifacts; code changes after verification require fresh checks.


## Vendor Detection

Before starting, determine your runtime environment by following `.agents/skills/_shared/core/vendor-detection.md`.
The detected runtime vendor and each agent's target vendor determine how agents are spawned in Phase 2 (IMPL), Phase 3 (VERIFY), Phase 4 (REFINE), and Phase 5 (SHIP).

---

## Cross-Context Review (CCR) Dispatch

Every review step in this workflow (the 12 reviews in `multi-review-protocol.md`) runs as a **fresh, context-isolated reviewer subagent** — never inline in the main session, and never batched with implementation or with another review. This is mandatory; see the **Cross-Context Review (CCR) Mandate** in `multi-review-protocol.md` for the rationale and the two papers behind it.

**One review = one fresh reviewer subagent.** The main session is the coordinator: it dispatches each review, waits for its verdict, and aggregates verdicts into the phase's `result-*.md` and `session-ultrawork.md`. For each review:

1. **Resolve the reviewer's target vendor** per the Per-Agent Dispatch rules (`.agents/oma-config.yaml`). Use the native subagent path when `target_vendor === current_runtime_vendor`; otherwise use `oma agent spawn` for that reviewer.
2. **Build the reviewer prompt from the isolation contract only** (`multi-review-protocol.md` → CCR Mandate): the durable artifacts under review *referenced by path* (git diff, changed files, `.agents/results/plan-{sessionId}.json`, prior `result-*.md`, test/lint output) plus that single review's guide section. Do **NOT** paste this session's conversation history, the implementation agent's reasoning, or any prior review's verdict into the prompt.
3. **Dispatch one reviewer per review.**
   - Claude-native: `Agent(subagent_type="qa-reviewer", prompt="CCR <review name> ONLY. Inputs (read fresh, assume no prior context): <artifact paths>. Guide: <that review's section>. Write a structured verdict to memory.", run_in_background=true)` — multiple such calls in one message run in parallel, each in its own isolated context.
   - CLI fallback: `oma agent spawn qa-agent <review-prompt-file> {sessionId} --task-id {review_task.id} -w {workspace}`
4. **Collect** each reviewer's structured verdict from memory and fold it into the phase's `result-*.md` and `session-ultrawork.md`.

Reviewers are read-only evaluators. Implementation and refactor **actions** (Phase 2 IMPL, and the structural refactor steps in Phase 4) remain with their action agents and are dispatched as before — only the review passes are isolated.

---

## Phase 0: Initialization (DO NOT SKIP)

1. Read `.agents/skills/oma-coordination/SKILL.md` and confirm Core Rules.
2. Read `.agents/skills/_shared/core/context-loading.md` for resource loading strategy.
3. Read `.agents/skills/_shared/runtime/memory-protocol.md` for memory protocol.
4. Read `.agents/skills/_shared/runtime/event-spec.md` for L1 event protocol.
5. Emit required L1 decisions by calling `oma state emit` directly, as documented in `.agents/skills/_shared/runtime/event-spec.md`.
6. Read `.agents/workflows/ultrawork/resources/multi-review-protocol.md` (12 review guides)
7. Read `.agents/skills/_shared/core/quality-principles.md` (scope and verification guidance)
8. Read `.agents/workflows/ultrawork/resources/phase-gates.md` (gate definitions)
9. Resolve the session ID:
   - If a caller workflow (e.g. `/ralph`) delegated to ultrawork with an existing `sessionId`, **reuse it verbatim** — plan tasks, claims, and receipts must carry that session/task/run identity so artifact verification matches.
   - Otherwise generate one now (format: `YYYYMMDD-HHmmss`).
10. Record session start using memory write tool:
   - Create `session-ultrawork.md` in the memory base path
   - Include: session start time, session ID, user request summary, workflow version (ultrawork)
11. (Recommended) Attach a mechanical stop gate when the project has a cheap deterministic check:
   - `oma goal set --gate typecheck` (allowlist: `typecheck` | `test` | `lint`; maps to the package.json script)
   - While set, the Stop hook allows the session to end only when the gate passes; failures return the output tail. Add `--budget-minutes <n>` to bound unattended runs with an honest partial stop.

---

## Phase 1: PLAN (Steps 1-4)

### Step 1: Create Plan
Activate PM Agent to author the plan only (reviews are dispatched separately in Steps 2-4):

1. Analyze requirements.
2. Define API contracts.
3. Create a prioritized task breakdown.
4. Save plan to `.agents/results/plan-{sessionId}.json`.
5. Create `task-board-{sessionId}.md` in the memory path for dashboard compatibility.
6. Use memory write tool to record plan completion.

The PM Agent MUST NOT review its own plan inline — that is a same-context self-review, exactly the anchoring/sycophancy failure the CCR Mandate forbids. Steps 2-4 run in fresh isolated reviewers.

### Steps 2-4: Plan Reviews (Cross-Context)
Dispatch each of Steps 2, 3, 4 as a **separate fresh isolated reviewer subagent** per the **Cross-Context Review (CCR) Dispatch** section. Each reviewer receives ONLY the plan artifact (`.agents/results/plan-{sessionId}.json`) and the original requirements, plus its own review guide section — never the PM Agent's reasoning or this session's history. Collect the three verdicts into `session-ultrawork.md` before evaluating PLAN_GATE.

### Step 2: Plan Review (Completeness)
- **Executed by a fresh isolated reviewer subagent (CCR)**: Ensure requirements are fully mapped.

### Step 3: Review Verification (Meta Review)
- **Executed by a fresh isolated reviewer subagent (CCR)**: Verify the completeness review was sufficient. Chaining exception: this reviewer MAY receive the Step 2 verdict as input, since a meta-review's job is to audit the prior review.

### Step 4: Over-Engineering Review (Simplicity)
- **Executed by a fresh isolated reviewer subagent (CCR)**: Check for unnecessary complexity (MVP focus).

### PLAN_GATE

Evaluate [the canonical PLAN_GATE](ultrawork/resources/phase-gates.md#plan_gate).

**On gate pass**:
1. Use memory edit tool to record phase completion in `session-ultrawork.md`.
2. Emit the required L1 decision, replacing the rationale placeholder with the actual authorization and gate evidence:
   ```bash
   oma state emit "decision.made" '{"subject":"ultrawork.plan-approved","decision":"Proceed with the approved PLAN output.","rationale":"<scope authorization from the existing request or a newly resolved decision; PLAN_GATE evidence>"}'
   ```
3. Verify the required decision before Phase 2:
   ```bash
   oma state verify --workflow ultrawork --checkpoint plan-approved
   ```
4. Emit and verify the implementation scope lock before spawning implementation agents:
   ```bash
   oma state emit "decision.made" '{"subject":"ultrawork.impl-plan-locked","decision":"Use the approved task decomposition for IMPL.","rationale":"PLAN output is locked before implementation agents are spawned."}'
   oma state verify --workflow ultrawork --checkpoint impl-plan-locked
   ```

**Gate failure → Return to Step 1**

---

## Phase 2: IMPL (Step 5)

### Step 5: Implementation
Spawn Implementation Agents (Backend/Frontend/Mobile) in parallel.

#### Per-Agent Dispatch
Resolve the target vendor for each agent from `.agents/oma-config.yaml`.
Use native subagents only when `target_vendor === current_runtime_vendor` and that runtime supports the vendor's role-subagent path.
Otherwise use `oma agent spawn` for that agent.

#### If Claude Code and target vendor is Claude
Use the Agent tool to spawn subagents:
- `Agent(subagent_type="backend-engineer", prompt="Implement backend tasks per plan. IMPORTANT: Follow .agents/skills/_shared/core/context-loading.md rules.", run_in_background=true)`
- `Agent(subagent_type="frontend-engineer", prompt="Implement frontend tasks per plan. IMPORTANT: Follow .agents/skills/_shared/core/context-loading.md rules.", run_in_background=true)`
- Multiple Agent tool calls in the same message = true parallel execution

#### If Codex CLI and target vendor is Codex
Spawn native Codex custom agents using `.codex/agents/{agent}.toml` when available.
Pass each agent its task description, API contracts, and relevant context.
If native dispatch is not verified in the current runtime, fall back to `oma agent spawn`.

#### If Gemini CLI and target vendor is Gemini
Use native Gemini subagents when available, otherwise fall back to `oma agent spawn`.

#### If target vendor differs from current runtime, or native dispatch is unavailable
```bash
oma agent spawn backend backend-prompt.md {sessionId} --task-id {backend_task.id} -w ./backend &
oma agent spawn frontend frontend-prompt.md {sessionId} --task-id {frontend_task.id} -w ./frontend &
wait
```

---

### Step 5.1: Monitor & Wait for Completion

**Wait for all implementation agents to complete before proceeding.**

1. Poll `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` files
2. Use configured code intelligence or its native fallback to verify implementation alignment
3. Check the injected claim and `result-{agentId}-{taskId}-{runId}-{sessionId}.md` to confirm completion
4. Use memory edit tool to record monitoring results in `session-ultrawork.md`

**Continue polling until all agents report completion or failure.**

### Step 5.2: Measure Baseline (Conditional)

If the task needs a measured baseline or experiment comparison with defined metrics:

1. Load `.agents/skills/_shared/conditional/quality-score.md`.
2. Reuse still-current check artifacts or run the relevant measurement commands.
3. For an actual experiment, record baseline evidence in `experiment-ledger-{sessionId}.md` through the configured coordination store.

Tests or lint being available does not require a composite score or a ledger. Required gates below apply independently.

### IMPL_GATE

Evaluate [the canonical IMPL_GATE](ultrawork/resources/phase-gates.md#impl_gate).

**On gate pass**: Use memory edit tool to record phase completion in `session-ultrawork.md`

**Gate failure → Return to Step 5, re-spawn failed agents, and repeat monitoring until GATE passes.**

---

## Phase 3: VERIFY (Steps 6-8)

### Step 6-8: QA Verification (Cross-Context Review)
Dispatch each of Steps 6, 7, 8 as a **separate fresh isolated reviewer subagent** per the **Cross-Context Review (CCR) Dispatch** section. Do NOT run all three in one agent, and do NOT pass this session's history or the implementation agents' reasoning into any reviewer prompt. Each reviewer reads only the durable artifacts (git diff, changed files, `.agents/results/plan-{sessionId}.json`, `result-{agent}` files, test/lint output) plus its own review guide section from `multi-review-protocol.md`.

#### If Claude Code
Use three separate Agent tool calls (one message = parallel, isolated contexts):
- `Agent(subagent_type="qa-reviewer", prompt="CCR Step 6 Alignment Review ONLY. Inputs (read fresh, assume no prior context): <diff + changed files + plan-{sessionId}.json>. Guide: Alignment Review section. Write a structured verdict to memory.", run_in_background=true)`
- `Agent(subagent_type="qa-reviewer", prompt="CCR Step 7 Security/Bug Review ONLY (npm audit, OWASP). Inputs (read fresh, assume no prior context): <diff + changed files + audit output>. Guide: Safety Review section. Write a structured verdict to memory.", run_in_background=true)`
- `Agent(subagent_type="qa-reviewer", prompt="CCR Step 8 Improvement/Regression Review ONLY. Inputs (read fresh, assume no prior context): <diff + test output>. Guide: Regression Review section. Write a structured verdict to memory.", run_in_background=true)`

#### If Codex CLI
Spawn one native Codex custom agent (`.codex/agents/{agent}.toml`) **per review** when available, each with only its artifacts + guide section.
If native dispatch is not verified in the current runtime, fall back to `oma agent spawn`.

#### If Gemini CLI or Antigravity or CLI Fallback
```bash
oma agent spawn qa-agent step-6-prompt.md {sessionId} --task-id {qa_alignment_task.id} -w {workspace}
oma agent spawn qa-agent step-7-prompt.md {sessionId} --task-id {qa_safety_task.id} -w {workspace}
oma agent spawn qa-agent step-8-prompt.md {sessionId} --task-id {qa_regression_task.id} -w {workspace}
```

---

### Monitor Reviewers & Aggregate

**Wait for all three VERIFY reviewers to complete before proceeding.**

1. Use memory read tool to poll each reviewer's `progress-*` / verdict entry.
2. Confirm each reviewer wrote its structured verdict to memory.
   - **Claude-native path**: each `qa-reviewer` Agent call returns synchronously with its verdict.
3. **Aggregate** the three verdicts into `result-qa-{sessionId}.md` under `.agents/results/` (this satisfies the VERIFY artifact contract) and record the combined VERIFY result in `session-ultrawork.md`.

**Continue polling until all three reviewers report completion.**

### Step 6: Alignment Review
- **Executed by a fresh isolated reviewer subagent (CCR)**: Compare implementation vs plan.

### Step 7: Security/Bug Review (Safety)
- **Executed by a fresh isolated reviewer subagent (CCR)**: Check for vulnerabilities (Safety).

### Step 8: Improvement Review (Regression Prevention)
- **Executed by a fresh isolated reviewer subagent (CCR)**: Run regression tests.

### Step 8.1: Check Post-VERIFY Measurements (Conditional)

If a comparable baseline was recorded at Step 5.2 and subsequent changes affect it:
1. Refresh only measurements affected by changes since the baseline; preserve QA findings as independent evidence
2. Compare each applicable metric with the IMPL baseline using the same method
3. For an actual experiment, record the comparison and decision in the Experiment Ledger

### VERIFY_GATE

Evaluate [the canonical VERIFY_GATE](ultrawork/resources/phase-gates.md#verify_gate).

**On gate pass**: Use memory edit tool to record phase completion in `session-ultrawork.md`

**Gate failure (1st time)** → Before re-spawning for the next VERIFY cycle, check the session cost cap:

> **Review Loop termination conditions** (OR, whichever fires first wins):
> 1. Gate failure count has reached the configured maximum iterations (default: 5 total VERIFY + REFINE cycles). Do not start another cycle.
> 2. Session cost cap exceeded: if `loadQuotaCap()` from `cli/io/session-cost.ts` returns non-null, call `checkCap(sessionId, cap)` (no cap configured → skip this condition). If `exceeded === true`, print `formatPromptMessage(result)` to the user and stop the loop immediately. Save all current step results before stopping, then report to the user that the loop was terminated early due to quota.
>
> If neither condition is met, return to Step 5 and continue.

**Root-cause-first fix mandate:** when re-spawning implementation agents to address QA findings, the fix prompt MUST require root-cause remediation. Forbid tactical patches (try/catch swallowing the error, validation bypass, hardcoded values, feature flags hiding the bug, silencing the failing test) unless the agent explicitly justifies why a structural fix is out of scope (upstream library bug, deprecated path, hotfix window).

**Gate failure (2nd time on same issue, and termination conditions not yet met)** → Reassess the cause. If a different mechanism needs testing and the shared recovery budget can cover the round, use `.agents/skills/_shared/conditional/exploration-loop.md`:
1. Reserve the 2-3 distinct hypothesis attempts within the existing aggregate attempt and cost budget.
2. Preserve the baseline and isolate each experiment's owned changes.
3. Compare required checks and defined measurements; no composite score is required.
4. Record the evidence and decision, integrate a qualifying candidate, and re-run affected verification before resuming the gate.

If exploration cannot resolve the issue within budget, preserve partial results and report the unresolved criteria.

---

## Phase 4: REFINE (Steps 9-13)

### Step 9-13: Deep Refinement
REFINE mixes two kinds of work: **reviews** (Steps 10, 12), which are read-only evaluations, and **refactor actions** (Steps 9, 11, 13), which change code.

**First, dispatch the two reviews as fresh isolated reviewer subagents** per the **Cross-Context Review (CCR) Dispatch** section — one reviewer for Step 10 (Reusability), one for Step 12 (Consistency). Each reads only the durable artifacts (git diff, changed files) plus its guide section; do not pass this session's history or the implementation agents' reasoning. Collect their verdicts from memory.

**Then, spawn the Refactor Agent** to perform the refactor actions (Steps 9, 11, 13) and apply the isolated reviewers' findings, and to write `result-refactor-{sessionId}.md` (this satisfies the REFINE artifact contract).

#### If Claude Code
Reviews (two separate calls, isolated contexts):
- `Agent(subagent_type="qa-reviewer", prompt="CCR Step 10 Reusability Review ONLY. Inputs (read fresh, assume no prior context): <diff + changed files>. Guide: Reusability Review section. Write a structured verdict to memory.", run_in_background=true)`
- `Agent(subagent_type="qa-reviewer", prompt="CCR Step 12 Consistency Review ONLY. Inputs (read fresh, assume no prior context): <diff + changed files>. Guide: Consistency Review section. Write a structured verdict to memory.", run_in_background=true)`

Refactor actions (after the review verdicts are collected):
- `Agent(subagent_type="refactor-engineer", prompt="Execute Phase 4 refactor actions. Step 9: Split large files. Step 11: Side Effect analysis (find_referencing_symbols). Step 13: Cleanup dead code. Apply the collected Reusability/Consistency verdicts. Write result-refactor-{sessionId}.md. IMPORTANT: Follow .agents/skills/_shared/core/context-loading.md rules.", run_in_background=true)`

#### If Codex CLI
Spawn one native Codex reviewer per review (`.codex/agents/{agent}.toml`) with only its artifacts + guide section, then the native refactor agent (`.codex/agents/refactor-engineer.toml`) for Steps 9/11/13.
If native dispatch is not verified in the current runtime, fall back to `oma agent spawn`.

#### If Gemini CLI or Antigravity or CLI Fallback
```bash
oma agent spawn qa-agent step-10-prompt.md {sessionId} --task-id {qa_reuse_task.id} -w {workspace}
oma agent spawn qa-agent step-12-prompt.md {sessionId} --task-id {qa_consistency_task.id} -w {workspace}
oma agent spawn refactor-engineer refine-prompt.md {sessionId} --task-id {refine_task.id} -w {workspace}
```

---

### Monitor Reviewers & Refactor Agent Progress

**Wait for the two reviewers and the Refactor Agent to complete refinement before proceeding.**

1. Confirm both isolated reviewers wrote their structured verdicts to memory.
2. Use memory read tool to poll `progress-refactor*[-{sessionId}].md`
3. Check the `refine_task` claim and its run-scoped result report. The injected
   claim path, not an agent-derived filename, is the completion identity.
   - **Claude-native path**: use the native result and persist it against the same plan task ID/run ID.
4. Use memory edit tool to record refinement results (reviews + actions) in `session-ultrawork.md`

**Continue polling until the reviewers and Refactor Agent report completion.**

### Step 9: Split Large Files/Functions
- **Executed by Refactor Agent (action)**: Files > 500 lines, Functions > 50 lines.

### Step 10: Integration/Reuse Review (Reusability)
- **Executed by a fresh isolated reviewer subagent (CCR)**: Check for duplicate logic.

### Step 11: Side Effect Review (Cascade Impact)
- **Executed by Refactor Agent (action)**: Analyze impact scope.

### Step 12: Full Change Review (Consistency)
- **Executed by a fresh isolated reviewer subagent (CCR)**: Review naming and style.

### Step 13: Clean Up Unused Code
- **Executed by Refactor Agent (action)**: Remove newly created dead code.

### Step 13.1: Check Post-REFINE Measurements (Conditional)

If a comparable baseline was recorded at Step 5.2 and subsequent changes affect it:
1. Refresh measurements affected by refinement
2. Compare applicable metrics with Post-VERIFY evidence
3. Apply the measurement recovery rule in [REFINE_GATE](ultrawork/resources/phase-gates.md#refine_gate).
4. Record actual experiment decisions and evidence, including discarded or inconclusive attempts

### REFINE_GATE

Evaluate [the canonical REFINE_GATE](ultrawork/resources/phase-gates.md#refine_gate).

**On gate pass**:
1. Use memory edit tool to record phase completion in `session-ultrawork.md`.
2. Emit and verify the REFINE outcome decision:
   ```bash
   oma state emit "decision.made" '{"subject":"ultrawork.refine-outcome","decision":"Keep the REFINE changes or explicitly skip refinement.","rationale":"REFINE_GATE passed or the documented skip condition applies."}'
   oma state verify --workflow ultrawork --checkpoint refine-outcome
   ```

**Gate failure → Before re-spawning the Refactor Agent, apply the same termination check:**

> **Review Loop termination conditions** (OR, whichever fires first wins):
> 1. Total REFINE failure count has reached the configured maximum iterations (default: 5 cycles across all phases). Do not start another cycle.
> 2. Session cost cap exceeded: if `loadQuotaCap()` from `cli/io/session-cost.ts` returns non-null, call `checkCap(sessionId, cap)` (no cap configured → skip this condition). If `exceeded === true`, print `formatPromptMessage(result)` to the user and stop. Save current step results before stopping, then report early termination due to quota.
>
> If neither condition is met, re-spawn the Refactor Agent with specific issues and repeat until GATE passes.

**Skip handling**: Apply the canonical REFINE_GATE skip conditions and record the reason in `session-ultrawork.md`.

---

## Phase 5: SHIP (Steps 14-17)

### Step 14-17: Final QA & Deployment Readiness (Cross-Context Review)
Dispatch each of Steps 14, 15, 16, 17 as a **separate fresh isolated reviewer subagent** per the **Cross-Context Review (CCR) Dispatch** section. Do NOT run them in one agent, and do NOT pass this session's history or the implementation/refine agents' reasoning into any reviewer prompt. Each reviewer reads only the durable artifacts (git diff, changed files, lint/coverage output, prior `result-*.md`) plus its own review guide section.

#### If Claude Code
Use separate Agent tool calls (one message = parallel, isolated contexts):
- `Agent(subagent_type="qa-reviewer", prompt="CCR Step 14 Code Quality Review ONLY (lint/coverage). Inputs (read fresh, assume no prior context): <diff + lint/coverage output>. Guide: Quality Review section. Write a structured verdict to memory.", run_in_background=true)`
- `Agent(subagent_type="qa-reviewer", prompt="CCR Step 15 UX Flow Verification ONLY. Inputs (read fresh, assume no prior context): <diff + user journey/routes>. Guide: UX Flow Review section. Write a structured verdict to memory.", run_in_background=true)`
- `Agent(subagent_type="qa-reviewer", prompt="CCR Step 16 Related Issues / Cascade Impact Review ONLY. Inputs (read fresh, assume no prior context): <diff + find_referencing_symbols impact>. Guide: Cascade Impact Review section. Write a structured verdict to memory.", run_in_background=true)`
- `Agent(subagent_type="qa-reviewer", prompt="CCR Step 17 Deployment Readiness Review ONLY. Inputs (read fresh, assume no prior context): <diff + secrets/migrations checklist>. Guide: Final Review section. Write a structured verdict to memory.", run_in_background=true)`

#### If Codex CLI
Spawn one native Codex reviewer per review (`.codex/agents/{agent}.toml`) when available, each with only its artifacts + guide section.
If native dispatch is not verified in the current runtime, fall back to `oma agent spawn`.

#### If Gemini CLI or Antigravity or CLI Fallback
```bash
oma agent spawn qa-agent step-14-prompt.md {sessionId} --task-id {qa_quality_task.id} -w {workspace}
oma agent spawn qa-agent step-15-prompt.md {sessionId} --task-id {qa_ux_task.id} -w {workspace}
oma agent spawn qa-agent step-16-prompt.md {sessionId} --task-id {qa_cascade_task.id} -w {workspace}
oma agent spawn qa-agent step-17-prompt.md {sessionId} --task-id {qa_ship_task.id} -w {workspace}
```

---

### Monitor Reviewers & Aggregate

**Wait for all SHIP reviewers to complete final review before proceeding.**

1. Confirm each reviewer wrote its structured verdict to memory.
   - **Claude-native path**: each `qa-reviewer` Agent call returns synchronously with its verdict.
2. **Aggregate** the verdicts into `result-qa-{sessionId}.md` under `.agents/results/` (this satisfies the SHIP artifact contract) and record the combined final result in `session-ultrawork.md`.

**Continue polling until all SHIP reviewers report completion.**

### Step 14: Code Quality Review
- **Executed by a fresh isolated reviewer subagent (CCR)**: Lint, Types, Coverage.

### Step 15: UX Flow Verification
- **Executed by a fresh isolated reviewer subagent (CCR)**: User journey check.

### Step 16: Related Issues Review (Cascade Impact 2nd)
- **Executed by a fresh isolated reviewer subagent (CCR)**: Final impact check.

### Step 17: Deployment Readiness Review (Final)
- **Executed by a fresh isolated reviewer subagent (CCR)**: Secrets, Migrations, checklist.

### Step 17.1: Final Measurements & Session Summary (Conditional)

If a defined measurement comparison was active during this session:
1. Refresh affected final measurements only if existing evidence is stale
2. Summarize actual experiments, comparison evidence, and decisions if a ledger exists
3. Record a lesson in `lessons-{sessionId}.md` only when experiment evidence establishes a reusable cause and prevention action
4. Link measurement and experiment artifacts in the session result

When review findings expose a reusable success or failure pattern, link the finding and its adjudicating evidence in the existing result artifact. A disputed finding is unresolved until evidence settles it; do not classify every disagreement as a false positive. Use `.agents/skills/_shared/core/session-metrics.md` for a requested retrospective or separate session summary. No weighted evaluator score or rolling-session threshold is required.

### SHIP_GATE

Evaluate [the canonical SHIP_GATE](ultrawork/resources/phase-gates.md#ship_gate).

**On gate pass**: Use memory write tool to record final results in `session-ultrawork.md`

**Gate failure → Address issues, re-run affected steps, and repeat until GATE passes.**

---

## Step 18: Optional Doc Verify Hook (post-SHIP; outside the 17-step model)

If `oma-config.yaml` has `docs.auto_verify: true`:

1. Run `oma docs verify --json` from the repo root.
2. Capture the JSON output.
3. If `broken.length === 0`: print `docs verified clean (N docs)` summary to stdout and continue with workflow completion.
4. If `broken.length > 0`: print a 1-3 line summary identifying which docs have drift, and a hint `Run /oma-docs verify for the full report.` Continue with workflow completion (warn-only, never block).
5. If `oma-docs` is not available (CLI command missing): skip silently.

This hook is opt-in; the default `auto_verify: false` skips this step entirely.

---

## Review Steps Summary

| Phase  | Steps | Agent                        | Execution            | Perspective                       |
| ------ | ----- | ---------------------------- | -------------------- | --------------------------------- |
| PLAN   | 1-4   | PM (author) + CCR reviewers  | CCR isolated review  | Completeness, Meta, Simplicity    |
| IMPL   | 5     | Dev Agents                   | Spawn (action)       | Implementation                    |
| VERIFY | 6-8   | CCR reviewers                | CCR isolated review  | Alignment, Safety, Regression     |
| REFINE | 9-13  | Refactor Agent + CCR reviewers | Action + CCR review | Reusability, Cascade, Consistency |
| SHIP   | 14-17 | CCR reviewers                | CCR isolated review  | Quality, UX, Cascade 2nd, Deploy  |

The workflow retains 12 review steps with fresh isolated reviewers and conditional measurement checkpoints. Review count alone does not establish correctness.

Every review runs in its own fresh context (never inline, never batched) per the **Cross-Context Review (CCR) Dispatch** section and the CCR Mandate in `multi-review-protocol.md`.

---

## Autoresearch-Inspired Enhancements

This workflow conditionally incorporates patterns from autoresearch:

| Pattern | When Active | Reference |
|---------|-------------|-----------|
| **Continuous metrics** | When a defined metric comparison is needed | `quality-score.md` (loaded at VERIFY/SHIP) |
| **Keep/Discard** | When comparing actual experiments | `quality-score.md` acceptance and comparison criteria |
| **Experiment logging** | When an actual experiment is run | `experiment-ledger.md` (via memory protocol) |
| **Hypothesis exploration** | On repeated gate failures | `exploration-loop.md` (loaded on trigger) |
| **Runtime learning** | At session end, if experiments exist | `{sessionId}/lessons-{sessionId}.md` |

All protocols are loaded **conditionally** per `context-loading.md`, not at Phase 0.
