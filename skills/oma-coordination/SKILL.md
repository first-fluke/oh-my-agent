---
name: oma-coordination
description: Coordinate assigned specialist tasks and handoffs manually. Use
  when supervising a multi-agent project step by step.
---

# Multi-Agent Workflow Guide

## Scheduling

### Goal
Guide manual multi-agent coordination for complex work that spans PM, frontend, backend, mobile, and QA responsibilities.

### Intent signature
- User wants step-by-step coordination, manual agent spawning, or multi-domain work planning without full automation.
- Task spans multiple specialist agents and requires contract alignment.

### When to use

- Complex feature spanning multiple domains (full-stack, mobile)
- Coordination needed between frontend, backend, mobile, and QA
- User wants step-by-step guidance for multi-agent coordination

### When NOT to use

- Simple single-domain task -> use the specific agent directly
- User wants automated execution -> use orchestrator
- Quick bug fixes or minor changes

### Expected inputs
- Complex feature or project goal
- Required domains and priority tiers
- Workspace/session constraints and API/data contract needs

### Expected outputs
- Manual coordination sequence
- PM task decomposition, agent spawn order, monitoring guidance, and QA review step
- API/data contract alignment checkpoints

### Dependencies
- PM, frontend, backend, mobile, QA, and orchestrator skills
- CLI `oma agent spawn` and progress/result memory conventions

### Control-flow features
- Branches by task complexity, priority tiers, dependency ordering, and whether automation is desired
- Spawns independent same-priority tasks in parallel when appropriate
- Monitors progress files and contract alignment

## Structural Flow

### Entry
1. Confirm the task is complex enough for multi-agent coordination.
2. Reuse a current plan and handoff state; use PM when task decomposition or contract changes are needed.
3. Identify priority tiers and shared contracts.

### Scenes
1. **PREPARE**: Define session, domains, and task decomposition needs.
2. **ACT**: Spawn agents by priority with separate workspaces.
3. **VERIFY**: Monitor progress and API/data contract alignment.
4. **FINALIZE**: Run QA review and coordinate remediation.

### Transitions
- If task is simple, route to one specialist.
- If user wants automated execution, use orchestrator.
- If QA reports a blocking defect or required verification gap, route the affected work to the responsible agent within the existing recovery budget.

### Failure and recovery
- If contracts diverge, pause downstream frontend/mobile work until backend/API contract is reconciled.
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

### Tools and instruments
- `oma agent spawn`, PM/frontend/backend/mobile/QA agents
- Memory/progress/result files
- Configured code intelligence, with native fallback per `../_shared/core/code-intelligence.md`

### Canonical command path
```bash
# If planning is required, dispatch the declared PM task first; otherwise reuse the current plan.
oma agent spawn pm <pm-prompt-file> <session-id> --task-id <plan.pm_task.id> -w ./pm
oma agent spawn backend <backend-prompt-file> <session-id> --task-id <plan.backend_task.id> -w ./backend &
oma agent spawn frontend <frontend-prompt-file> <session-id> --task-id <plan.frontend_task.id> -w ./frontend &
wait
```

When native runtime dispatch is available (per-agent target vendor equals the current runtime vendor), prefer the runtime's native subagent path and use `oma agent spawn` as the cross-vendor fallback — same resolution rule as oma-orchestration.

Useful `agent spawn` options: `--vendor <vendor>` (CLI vendor override), `--isolation worktree` (git worktree per spawn, prevents file conflicts), `--read-only` (non-destructive tools only, e.g. for review/QA passes).

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

1. Reuse a valid plan; call PM only when decomposition or contract changes are required
2. Spawn independent tasks in parallel (same priority tier)
3. Reuse or update contracts for changed API boundaries before dependent frontend/mobile work
4. QA review is always the final step
5. Assign separate workspaces to avoid file conflicts (or use `--isolation worktree` for a git worktree per spawn)
6. Follow `../_shared/core/code-intelligence.md`: discover configured tools, do not auto-install or track, and use native search only for paths outside this project or ignored paths when unavailable or timed out
7. Resume from the current handoff state and execute applicable steps in dependency order; record why a branch is not applicable

### Workflow

#### Step 1: Plan with PM Agent

Reuse an existing valid plan. Otherwise, PM analyzes requirements and creates the task breakdown, acceptance checks, contracts, and priorities. Preserve injected session/task/run IDs; do not regenerate a plan already frozen by dispatch.

#### Step 2: Spawn Agents by Priority

Resolve the dispatch path per agent, then spawn:

1. Resolve the per-agent target vendor from oma-config.yaml (`agents:` override, else `model_preset`)
2. If the target vendor equals the current runtime vendor and a native subagent path exists, use native dispatch
3. Otherwise use `oma agent spawn` for that agent
4. Spawn all same-priority tasks in parallel using background processes

```bash
# Example: spawn backend and frontend in parallel
oma agent spawn backend backend-prompt.md session-id --task-id plan.backend_task.id -w ./backend &
oma agent spawn frontend frontend-prompt.md session-id --task-id plan.frontend_task.id -w ./frontend &
wait
```

#### Step 3: Monitor & Coordinate

- Read injected run artifacts and receipts. Human-readable progress/results use `{memoryConfig.basePath}/progress-{agentId}-{taskId}-{runId}-{sessionId}.md` and the corresponding `result-` name; see `../_shared/runtime/memory-protocol.md`. Keep the structured claim path unchanged.
- Verify API contracts align between agents
- Ensure shared data models are consistent

#### Step 4: QA Review

Review the coordinated deliverables with QA. Resolve blocking defects and required verification gaps through the responsible agents; rerun affected checks before finalizing.

### Automated Alternative

For fully automated execution without manual spawning, use the **orchestrator** skill instead.

## References