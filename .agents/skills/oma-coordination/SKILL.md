---
name: oma-coordination
description: "Shared coordination rules for multi-agent work: plan reuse, contract alignment, workspace ownership, and QA handoff. Loaded by the /work, /orchestrate, and /ultrawork workflows; also use for manual step-by-step coordination."
---

# Multi-Agent Coordination Rules

## Scheduling

### Goal
Supply the coordination rules every multi-agent run shares (plan reuse, contract alignment, workspace ownership, QA handoff), and guide manual step-by-step coordination when the user drives each dispatch.

### Intent signature
- A workflow (`/work`, `/orchestrate`, `/ultrawork`) loads this skill and applies its Guardrails.
- User wants step-by-step coordination, manual agent spawning, or multi-domain work planning without full automation.
- Task spans multiple specialist agents and requires contract alignment.

### When to use

- Any workflow that dispatches more than one specialist agent
- Complex feature spanning multiple domains where the user wants to drive each step
- Coordination needed between agents that share an API or data contract

### When NOT to use

- Simple single-domain task -> use the specific agent directly
- Automated dispatch, monitoring, and verification -> `oma-orchestration` owns execution; this skill supplies only the rules it applies
- Quick bug fixes or minor changes

### Expected inputs
- Complex feature or project goal
- Current plan: task ownership, acceptance checks, dependencies, and priority tiers
- Workspace/session constraints and API/data contract needs

### Expected outputs
- Coordination sequence: plan reuse or PM decomposition, spawn order, monitoring guidance, and QA review
- API/data contract alignment checkpoints

### Dependencies
- `oma-pm` for decomposition, `oma-qa` for review, and `oma-orchestration` for dispatch resolution, the parallelism limit, the recovery budget, and the review loop
- CLI `oma agent spawn` and the progress/result conventions in `../_shared/runtime/memory-protocol.md`

## Structural Flow

### Entry
1. Confirm the task needs more than one specialist agent.
2. Identify priority tiers and shared contracts from the current plan.
3. Apply the shared collaboration policy before assigning parallel work or coordinating ownership handoffs and result collection.

### Transitions
- If task is simple, route to one specialist.
- If the user wants automated execution, hand execution to `oma-orchestration`; the Guardrails below still apply.
- If QA reports a blocking defect or required verification gap, route the affected work to the responsible agent within the existing recovery budget.

### Failure and recovery
- If contracts diverge, pause dependent work until the owning task's API/data contract is reconciled.
- If agent workspaces conflict, split ownership boundaries.
- If progress stalls, inspect progress files and reissue focused instructions.

### Exit
- Success: specialist outputs are coordinated and QA-reviewed.
- Partial success: blocked agents, contract conflicts, or QA failures are explicit.

## Logical Operations

### Actions
| Action | SSL primitive | Evidence |
|--------|---------------|----------|
| Read request and domains | `READ` | User prompt and project context |
| Select agent plan | `SELECT` | PM decomposition and priority tiers |
| Spawn agents | `CALL_TOOL` | `oma agent spawn` |
| Monitor progress | `READ` | injected task/run-scoped progress, claims, and receipts |
| Validate contracts | `VALIDATE` | API/data model alignment |
| Notify coordination status | `NOTIFY` | Final coordination summary |

### Canonical command path
```bash
# One spawn per ready task; agent, task ID, and workspace come from the current plan.
oma agent spawn <agent-id> <prompt-file> <session-id> --task-id <task.id> -w <workspace>
```

Resolve the dispatch path per agent as `oma-orchestration` defines: the runtime's native subagent path when the agent's target vendor equals the current runtime vendor, otherwise `oma agent spawn`.

Useful `agent spawn` options: `--vendor <vendor>` (CLI vendor override), `--isolation worktree` (git worktree per spawn, prevents file conflicts), `--read-only` (non-destructive tools only, e.g. for review/QA passes).

While agents run, apply `../_shared/core/execution-policy.md` for the execution deadline, resource ownership, and cancellation. Read injected run artifacts and receipts; progress and result file names are defined in `../_shared/runtime/memory-protocol.md`.

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `LOCAL_FS` | Progress/result files and workspaces |
| `PROCESS` | Agent spawn commands |
| `MEMORY` | Session state and task board |
| `CODEBASE` | Shared contracts and implementation areas |

### Preconditions
- Task requires multiple domains.
- A current plan identifies task ownership, acceptance checks, dependencies, and priority tiers.

### Effects and side effects
- Spawns or guides multiple agents.
- Coordinates workspace ownership and QA feedback.

### Guardrails

1. Reuse a valid plan; call PM only when decomposition or contract changes are required. Preserve injected session/task/run IDs and do not regenerate a plan already frozen by dispatch.
2. Run independent tasks of the same priority tier in parallel, within the parallelism limit `oma-orchestration` resolves from project configuration.
3. Reuse or update contracts for changed API boundaries before dependent work starts.
4. Accept an implementation only after QA review. Review follows the iterative loop `oma-orchestration` defines (verify, QA cross-review, fix, review again within the recovery budget), not a single final pass.
5. Assign separate workspaces to avoid file conflicts (or use `--isolation worktree` for a git worktree per spawn).
6. Resume from the current handoff state and execute applicable steps in dependency order; record why a branch is not applicable.

## References
- Parallel worker collaboration: `../_shared/core/collaboration-policy.md` (before assigning parallel work or coordinating peer issues, ownership handoffs, and result collection)
- Deadline, resource ownership, and cancellation: `../_shared/core/execution-policy.md` (while agents run)
- Progress and result file naming: `../_shared/runtime/memory-protocol.md` (when reading run artifacts)
- Dispatch resolution, parallelism limit, recovery budget, and review loop: `../oma-orchestration/SKILL.md` (when dispatching or reviewing)
