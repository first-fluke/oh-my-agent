---
name: oma-orchestration
description: Dispatch and supervise parallel specialist agents with durable task
  state. Use for automated multi-agent execution, to coordinate agents step by
  step, or to hand a task to a named vendor or model.
---

# Orchestration - Automated Multi-Agent Coordination

## Scheduling

### Goal
Automatically orchestrate multi-agent execution with task decomposition, native/fallback dispatch, memory coordination, progress monitoring, verification, QA cross-review, retry, and result collection.

### Intent signature
- User asks to orchestrate, run in parallel, automate multi-agent execution, or coordinate full-stack work end to end.
- Task requires multiple specialist agents and a persistent review/remediation loop.
- User names the agent, vendor, or model that should do a task.

### When to use
- Complex feature requires multiple specialized agents working in parallel
- User wants automated execution without manually spawning agents
- Full-stack implementation spanning backend, frontend, mobile, and QA
- User says "run it automatically", "run in parallel", or similar automation requests
- User wants to coordinate the agents manually, approving each dispatch
- User hands a task, or a worklist of same-shaped items, to another vendor's agent

### When NOT to use
- Simple single-domain task -> use the specific agent directly
- Quick bug fixes or minor changes

### Expected inputs
- Complex feature or workflow request
- Project config, model/vendor routing, agent types, task constraints, and workspace/session needs
- Acceptance criteria and verification expectations

### Expected outputs
- Orchestrator session state, task board, progress files, result files, and final summary
- Specialist agent outputs after mechanical checks, automated verify, and QA cross-review
- Review history and retry/remediation status when loops fail

### Dependencies
- `.agents/oma-config.yaml`, the runtime's native agent definitions (for example `.claude/agents/*.md`, `.codex/agents/*.toml`), or fallback `oma agent spawn`
- Memory provider config, subagent prompt template, scripts, verify script, and the session evidence guide
- Memory tools named in `memoryConfig`, and the QA agent for cross-review

## Structural Flow

### Transitions
- If the user wants step-by-step control, run the canonical path one dispatch at a time: present the next ready task, spawn it when the user says go, and report its result before the next.
- If the user names a vendor or model for one task, or hands over a worklist of same-shaped items, follow Delegating to a named vendor instead of the phase sequence.
- If native dispatch is available for current runtime/vendor, use it.
- If vendors differ or native path is unavailable, use fallback spawn.
- Record the dispatch path per target vendor with subject `orchestration.route-selection` per `references/_shared/runtime/route-selection.md` (native or `oma agent spawn`, and the vendor match or unavailability that decided it).
- If verify or QA fails, feed feedback back to the implementation agent.
- If recovery limits are exceeded, preserve review history and return `partial` or `failed`; never force completion.
- If recovery shows that a required domain reference was missing, update the task's reference selection without changing its frozen acceptance contract, and supply it through the supported context mechanism.

### Failure and recovery
- Retry failed agents up to configured limits.
- Re-spawn with review history when review loop is exhausted.
- Continue independent work after recording material corrections; ask only for a material missing decision.

### Exit
- Success: all tasks complete, verify/review pass, and results are summarized.
- Partial success: failed agents, exhausted review loops, or missing verification are explicit.

## Logical Operations

### Canonical command path
Phase names refer to Workflow Phases below.

1. Read the project configuration and the request. Confirm the request decomposes into specialist-agent tasks, then resolve agent vendor routing and the dispatch path for each agent, native or fallback (Guardrails 1–3).
2. Run PHASE 1 and PHASE 1.5: reuse the valid plan or decompose the request into priority-tiered tasks, then select and record each task's references.
3. Apply the shared collaboration policy before dispatch: its coordination rules, edit ownership, peer contact paths, and a collection owner.
4. Run PHASE 2: set the session ID and initialize the task board and memory files.
5. Run PHASE 3: spawn agents by priority tier within the parallelism limit, through the exposed native role-subagent tool or the fallback. When native runtime dispatch is available, prefer the runtime-specific native path listed in this skill before falling back to `oma agent spawn`.
   ```bash
   oma agent spawn <agent-type> <prompt-file> <session-id> --task-id <task.id> -w <workspace>
   ```
   Spawn options: `--vendor <vendor>` (CLI vendor override), `--model-id <id>` (model for this spawn), `--isolation worktree` (git worktree per spawn), `--read-only` (non-destructive tools only, for review and QA passes), `--edit-only` (file edits approved, nothing else).
6. Run PHASE 4: monitor each run through completion notifications, or through its progress and result files when polling is the fallback.
7. Run PHASE 4.5 for every completed agent: mechanical self-check, automated verify, then QA cross-review (Agent-to-Agent Review Loop).
   ```bash
   oma verify agent <agent-type> --workspace <workspace> --json
   ```
8. When an agent fails or the review loop is exhausted, update the loop counters and the recovery budget, then retry with review history while the limits allow (Loop Limits, Recovery Budget).
9. Run PHASE 5: collect verified claims, compile the summary, and preserve progress artifacts.

### Resource scope and effects
Reads project configuration and writes the session, task-board, progress, and result files through the configured memory provider (under the `basePath` in `memoryConfig`), including session state and unresolved decisions. Starts agent processes (native subagents or `oma agent spawn`) and verify scripts. Spawned agents change code in the workspaces they own. A failed verify or review starts further agent runs, each consuming the recovery budget.

### Guardrails
1. Orchestrate per-agent dispatch from the project configuration before spawning any agent.
2. If `target_vendor === current_runtime_vendor` and the runtime has a verified native path, use native dispatch.
3. Otherwise fall back to `oma agent spawn`.
4. Never exceed configured parallelism or the aggregate recovery budget. Ordinary retries and exploration hypotheses both consume it.
5. Keep session state, task-board state, progress files, claims, and receipts aligned. Use the plan task ID on every spawn and native begin/finish path.
6. Select references by task needs and confidence. Do not expand to all skills solely because one skill matches, or assume task-board metadata enforces runtime exposure.

### Delegating to a named vendor
When the user names who should do a task, dispatch it with `oma agent spawn`; do not write a launcher by hand. The delegate knows only the brief, so put the goal, the files, the constraints, and the check that proves the work into a prompt file.

```bash
oma agent spawn <agent-type> <prompt-file> <session-id> --vendor <vendor> --model-id <model> --edit-only
```

- **Permission**: use the narrowest mode the task allows. `--read-only` for inspection and review. `--edit-only` for edits: file edits are approved and nothing else, so the delegate runs no commands and the parent runs the checks. Omit both only when the task needs commands and the user accepted the vendor's auto-approve mode. A vendor without an edit-only mode refuses the flag; report that and ask before widening.
- **Model**: `--model-id` takes the name the vendor CLI uses (`grok models`, `agy models`, `cursor-agent models`). It replaces the configured plan for that spawn.
- **Worklist**: for many items of one shape (files to translate, modules to migrate), run one bounded session per item and let a command decide what is done:
  ```bash
  oma agent batch <agent-type> <prompt-template> --items <file> --check "<command with {item}>" --vendor <vendor> --fallback-vendors <v1,v2> --edit-only
  ```
  Items whose check already passes are skipped, the parent re-runs the check after each session, and a rerun resumes from what still fails. After two vendor failures in a row the batch moves to the next fallback vendor, or stops when none is left.
- **Commits**: do not commit while delegates or subagents are editing the working tree. A pre-commit hook that stashes unstaged changes can discard their edits; the SCM guard refuses the commit while a subagent of the session is open.

Current native executor paths:
- Claude Code: Agent tool with `.claude/agents/{agent}.md` definitions (multiple Agent tool calls in one message run in parallel; results return synchronously — no polling)
- OpenCode / Kilo Code: native `task` tool with `subagent_type: {agent-id}`; do not use `oma agent spawn` for same-session OpenCode or Kilo work because it will not appear as a native child task
- Codex: use the current session's exposed native subagent tool with the resolved custom role from `.codex/agents/*.toml` when supported; otherwise use `oma agent spawn`. Model tiering follows `references/_shared/core/vendor-detection.md`.
- Antigravity and other runtimes: use `oma agent spawn` unless a native role-subagent path is verified for the target vendor (`references/_shared/core/vendor-detection.md`).

`codex exec` and `agy -p` start external CLI sessions. An `@agent` string in a prompt does not establish native dispatch or apply a custom-role contract.

### Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | Max concurrent subagents |
| MAX_RECOVERY_ATTEMPTS | 3 | Total retries and exploration hypotheses per task, including the original attempt |
| POLL_INTERVAL | bounded backoff | Fallback only when completion notifications are unavailable |
| Turn guidance | role-specific | Checkpoint/resume signal, not a hard stop or approval boundary |

These are workflow defaults. Resolve model/vendor, parallelism, and budget settings from project configuration. `config/cli-config.yaml` supplies the vendor transport registry; it does not select the active vendor or override runtime execution settings.

### Memory Configuration

Memory provider and tool names are configurable via `.agents/mcp.json` (not the repo-root `.mcp.json`, which is the Claude Code MCP server config):
```json
{
  "memoryConfig": {
    "provider": "file",
    "basePath": ".agents/state/memories",
    "tools": {
      "read": "Read",
      "write": "Write",
      "edit": "Edit"
    }
  }
}
```

### Workflow Phases

**PHASE 1 - Plan**: Reuse the current valid plan or decompose the request; preserve injected session/task/run IDs.
**PHASE 1.5 - References**: For each task, classify into one or more `domain_tags` by matching against the `Intent signature` block of each installed `.agents/skills/oma-*/SKILL.md`. Tasks that match no domain confidently inherit the union of their parent feature's tags. Select the references needed by each task. One confidently matched skill is sufficient; expand the set when classification is uncertain or a dependency requires another domain. Record selected domains, references, and any fallback reason in the task board; record uncertainty and expansion reasons without assuming runtime enforcement. These are coordinator notes, not launcher-enforced exposure fields; use only reference/context controls supported by the active dispatch path.
**PHASE 2 - Setup**: Create session/task-board artifacts with the current IDs and selected references.
**PHASE 3 - Execute**: Dispatch ready tasks within MAX_PARALLEL using supported native or fallback context controls.
**PHASE 4 - Monitor**: Prefer completion notifications; otherwise use one coordinator with bounded polling backoff. Follow `references/_shared/core/execution-policy.md` for the shared deadline, cancellation, resource ownership, and shutdown rules. Cancellation or deadline exhaustion stops dispatch and recovery before verification.
**PHASE 4.5 - Verify**: Run mechanical checks for every completed agent; run `oma verify agent {agent-type}` only for `backend`, `frontend`, `mobile`, `qa`, `debug`, and `pm`; then run QA cross-review for every completed implementation
**PHASE 5 - Collect**: Read claims and run-scoped reports for plan tasks whose checks passed; compile summary without deleting evidence.

### Memory File Ownership

| File | Owner | Others |
|------|-------|--------|
| `orchestrator-session-{sessionId}.md` | orchestrator | read-only |
| `task-board-{sessionId}.md` | orchestrator | read-only |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | that run | orchestrator reads |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | that run | orchestrator reads |

### Agent-to-Agent Review Loop (PHASE 4.5)

After each agent completes, enter an iterative review loop, not a single-pass verification.

### Loop Flow

```
Agent completes work
    ↓
[1] Mechanical Self-Check: lint, type-check, tests, diff scope
    ↓
[2] Verify: For supported types, run `oma verify agent {agent-type} --workspace {workspace}`
    Unsupported (`db`, `refactor`, `architecture`, `tf-infra`, `docs`) → record SKIP and continue
    ↓ FAIL → Agent receives feedback, fixes, back to [1]
    ↓ PASS
[3] Cross-Review: QA agent reviews the changes
    ↓ FAIL → Agent receives review feedback, fixes, back to [1]
    ↓ PASS
Accept result
```

### Step Details

**[1] Mechanical Self-Check**:
Before requesting external review, the implementation agent must:
- Run lint, type-check, and tests in the workspace
- Verify only planned files were modified (diff scope check)
- Fix any mechanical failures (compile errors, test failures)

**Quality judgment is NOT performed in this step.**
Design quality, architecture alignment, and acceptance criteria satisfaction
are evaluated exclusively in [3] Cross-Review by the QA agent.
Reason: Self-evaluation bias causes agents to consistently overrate their own output
(ref: Anthropic harness design research).

**[2] Automated Verify**:
```bash
oma verify agent {agent-type} --workspace {workspace} --json
```
- Run only for `backend`, `frontend`, `mobile`, `qa`, `debug`, and `pm`.
- For `db`, `refactor`, `architecture`, `tf-infra`, and `docs`, record that automated verify is unsupported and continue to QA cross-review after the mechanical checks.
- **PASS (exit 0)**: Proceed to cross-review
- **FAIL (exit 1)**: Feed verify output back to the agent as correction context

**[3] Cross-Review**: Spawn QA agent to review the changes:
- QA agent reads the diff, runs checks, evaluates against acceptance criteria
<!-- oma-docs:ignore-start -->
- If `docs/CODE-REVIEW.md` exists, QA agent uses it as the review checklist
<!-- oma-docs:ignore-end -->
- QA agent outputs: PASS (with optional nits) or FAIL (with specific issues)
- On FAIL: issues are fed back to the implementation agent for fixing

### Loop Limits

| Counter | Max | On Exceeded |
|---------|-----|-------------|
| Self-check + fix cycles | 3 | Escalate to cross-review regardless |
| Cross-review rejections | 2 | Report to user with review history |
| Total loop iterations | 5 | Stop recovery; preserve failed checks and return `partial` or `failed` |

### Review Feedback Format

When feeding review results back to the implementation agent:
```
## Review Feedback (iteration {n}/{max})
**Reviewer**: {self / verify / qa-agent}
**Verdict**: FAIL
**Issues**:
1. {specific issue with file and line reference}
2. {specific issue}
**Fix instruction**: {what to change}
```

This replaces single-pass verification. Most "nitpicking" should happen agent-to-agent.
Resolve relevant automated checks before handoff. Ask for approval only when the next action is outside existing authorization.

### Recovery Budget (after review loop exhaustion)

Maintain one budget per workflow lineage and logical goal: `attempts_used`, `attempts_remaining`, and any
configured cost cap. The original attempt, each ordinary retry, and each
exploration hypothesis consume one attempt. Before starting recovery, reserve
the complete next action; do not exceed the budget or start an incomplete
exploration round.

Use the plan's stable `lineage_id` and task `goal_id` from `references/_shared/runtime/result-contract.md`. New task/run/session IDs do not reset that budget. Freeze the full JSON plan at first dispatch; reject recursive planning/review tasks and post-dispatch plan revisions. A contract change requires an explicitly separated new session and lineage.

Classify failures before retrying: `PRODUCT_FAILURE` follows the remaining product recovery budget; `WORKFLOW_EVIDENCE_FAILURE` means current product checks passed but completion claims or bindings failed. Automatic resume stops evidence-only replay. Allow at most one metadata-only repair under the existing task and frozen plan, consuming the same budget, then stop with a partial handoff if unresolved. Do not create PM tasks, rerun product planning, or import another workflow's plan-review loop for evidence failures.

- First remaining attempt: re-spawn with review history.
- Later attempts: choose either one different retry or a 2–3 hypothesis round
  only if enough attempts and cost remain.
- On cap exhaustion, preserve all checks, review findings, and unresolved work.
  The task is `partial` or `failed`, never `completed`.

### Session evidence

For material corrections or review findings, retain the cause, impact, and evidence in existing task artifacts. Use `references/_shared/core/session-metrics.md` when a retrospective or separate session summary is useful. Do not score clarification questions or require an RCA based on counters. Resolve the affected work and ask only for a material missing decision.

## References
- Parallel worker collaboration: `references/_shared/core/collaboration-policy.md` (before assigning parallel work or coordinating peer issues, ownership handoffs, and result collection)
- Prompt template: `resources/subagent-prompt-template.md`
- Memory schema: `resources/memory-schema.md`
- Scripts: `scripts/spawn-agent.sh`, `scripts/parallel-run.sh`, `scripts/verify.sh`
- Skill-to-agent mapping: `references/_shared/core/skill-routing.md`
- Verification: `scripts/verify.sh <agent-type>`
- Session evidence: `references/_shared/core/session-metrics.md` (requested retrospective or separate session summary)
- API contract template (SSOT): `references/_shared/core/api-contracts/template.md`; read generated contracts from `.agents/results/api-contracts/` (run artifact) or `docs/plans/contracts/` (durable spec)
- Context loading: `references/_shared/core/context-loading.md`
- Task decomposition: `references/_shared/core/difficulty-guide.md` (unresolved scope or dependencies)
- Clarification protocol: `references/_shared/core/clarification-protocol.md`
- Context budget: `references/_shared/core/context-budget.md`
- Code intelligence: `references/_shared/core/code-intelligence.md`
- Runtime lessons: `references/_shared/core/lessons-learned.md` (recurring failure or requested retrospective)