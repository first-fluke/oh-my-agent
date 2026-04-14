---
name: oma-orchestrator
description: Automated multi-agent orchestrator that spawns CLI subagents in parallel, coordinates via MCP Memory, and monitors progress. Use for orchestration, parallel execution, and automated multi-agent workflows.
---

# Orchestrator - Automated Multi-Agent Coordinator

## When to use
- Complex feature requires multiple specialized agents working in parallel
- User wants automated execution without manually spawning agents
- Full-stack implementation spanning backend, frontend, mobile, and QA
- User says "run it automatically", "run in parallel", or similar automation requests

## When NOT to use
- Simple single-domain task -> use the specific agent directly
- User wants step-by-step manual control -> use oma-coordination
- Quick bug fixes or minor changes

## Important
This skill orchestrates agents per target vendor. Resolve each agent's target vendor from `.agents/oma-config.yaml`, then:
- use the runtime's native role-subagent path when `target_vendor === current_runtime_vendor` and that runtime supports it
- otherwise fall back to `oma agent:spawn`

Vendor-specific execution protocols are injected automatically for external CLI spawn paths. Generated native agent files come from `.agents/agents/` plus vendor variants.

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | Max concurrent subagents |
| MAX_RETRIES | 2 | Retry attempts per failed task |
| POLL_INTERVAL | 30s | Status check interval |
| MAX_TURNS (impl) | 20 | Turn limit for backend/frontend/mobile |
| MAX_TURNS (review) | 15 | Turn limit for qa/debug |
| MAX_TURNS (plan) | 10 | Turn limit for pm |

## Memory Configuration

Memory provider and tool names are configurable via `mcp.json`:
```json
{
  "memoryConfig": {
    "provider": "serena",
    "basePath": ".serena/memories",
    "tools": {
      "read": "read_memory",
      "write": "write_memory",
      "edit": "edit_memory"
    }
  }
}
```

## Workflow Phases

**PHASE 1 - Plan**: Analyze request -> decompose tasks -> generate session ID
**PHASE 2 - Setup**: Use memory write tool to create `orchestrator-session.md` + `task-board.md`
**PHASE 3 - Execute**: Spawn agents by priority tier (never exceed MAX_PARALLEL)
**PHASE 4 - Monitor**: Poll every POLL_INTERVAL; handle completed/failed/crashed agents
**PHASE 4.5 - Verify**: Run `oma verify {agent-type}` per completed agent
**PHASE 5 - Collect**: Read all `result-{agent}-{sessionId}.md`, compile summary, cleanup progress files

See `resources/subagent-prompt-template.md` for prompt construction.
See `resources/memory-schema.md` for memory file formats.

## Memory File Ownership

| File | Owner | Others |
|------|-------|--------|
| `orchestrator-session.md` | orchestrator | read-only |
| `task-board.md` | orchestrator | read-only |
| `progress-{agent}[-{sessionId}].md` | that agent | orchestrator reads |
| `result-{agent}[-{sessionId}].md` | that agent | orchestrator reads |

## Agent-to-Agent Review Loop (PHASE 4.5)

After each agent completes, enter an iterative review loop — not a single-pass verification.

### Loop Flow

```
Agent completes work
    ↓
[1] Mechanical Self-Check: lint, type-check, tests, diff scope
    ↓
[2] Verify: Run `oma verify {agent-type} --workspace {workspace}`
    ↓ FAIL → Agent receives feedback, fixes, back to [1]
    ↓ PASS
[3] Cross-Review: QA agent reviews the changes
    ↓ FAIL → Agent receives review feedback, fixes, back to [1]
    ↓ PASS
Accept result ✓
```

### Step Details

**[1] Mechanical Self-Check** (formerly "Self-Review"):
Before requesting external review, the implementation agent must:
- Run lint, type-check, and tests in the workspace
- Verify only planned files were modified (diff scope check)
- Fix any mechanical failures (compile errors, test failures)

⚠️ **Quality judgment is NOT performed in this step.**
Design quality, architecture alignment, and acceptance criteria satisfaction
are evaluated exclusively in [3] Cross-Review by the QA agent.
Reason: Self-evaluation bias — agents consistently overrate their own output
(ref: Anthropic harness design research).

**[2] Automated Verify**:
```bash
oma verify {agent-type} --workspace {workspace} --json
```
- **PASS (exit 0)**: Proceed to cross-review
- **FAIL (exit 1)**: Feed verify output back to the agent as correction context

**[3] Cross-Review**: Spawn QA agent to review the changes:
- QA agent reads the diff, runs checks, evaluates against acceptance criteria
- If `docs/CODE-REVIEW.md` exists, QA agent uses it as the review checklist
- QA agent outputs: PASS (with optional nits) or FAIL (with specific issues)
- On FAIL: issues are fed back to the implementation agent for fixing

### Loop Limits

| Counter | Max | On Exceeded |
|---------|-----|-------------|
| Self-check + fix cycles | 3 | Escalate to cross-review regardless |
| Cross-review rejections | 2 | Report to user with review history |
| Total loop iterations | 5 | Force-complete with quality warning |

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
Human review is reserved for final approval, not catching lint errors.

## Retry Logic (after review loop exhaustion)
- 1st retry: Re-spawn agent with full review history as context
- 2nd retry: Re-spawn with "Try a different approach" + review history
- Final failure: Report to user with complete review trail, ask whether to continue or abort

## Clarification Debt (CD) Monitoring

Track user corrections during session execution. See `../_shared/core/session-metrics.md` for full protocol.

### Event Classification
When user sends feedback during session:
- **clarify** (+10): User answering agent's question
- **correct** (+25): User correcting agent's misunderstanding
- **redo** (+40): User rejecting work, requesting restart

### Threshold Actions
| CD Score | Action |
|----------|--------|
| CD >= 50 | **RCA Required**: QA agent must add entry to `lessons-learned.md` |
| CD >= 80 | **Session Pause**: Request user to re-specify requirements |
| `redo` >= 2 | **Scope Lock**: Request explicit allowlist confirmation before continuing |

### Recording
After each user correction event:
```
[EDIT]("session-metrics.md", append event to Events table)
```

At session end, if CD >= 50:
1. Include CD summary in final report
2. Trigger QA agent RCA generation
3. Update `lessons-learned.md` with prevention measures



## References
- Prompt template: `resources/subagent-prompt-template.md`
- Memory schema: `resources/memory-schema.md`
- Config: `config/cli-config.yaml`
- Scripts: `scripts/spawn-agent.sh`, `scripts/parallel-run.sh`, `scripts/verify.sh`
- Task templates: `templates/`
- Skill-to-agent mapping: `../_shared/core/skill-routing.md`
- Verification: `scripts/verify.sh <agent-type>`
- Session metrics: `../_shared/core/session-metrics.md`
- API contracts: `../_shared/core/api-contracts/`
- Context loading: `../_shared/core/context-loading.md`
- Difficulty guide: `../_shared/core/difficulty-guide.md`
- Reasoning templates: `../_shared/core/reasoning-templates.md`
- Clarification protocol: `../_shared/core/clarification-protocol.md`
- Context budget: `../_shared/core/context-budget.md`
- Lessons learned: `../_shared/core/lessons-learned.md`
