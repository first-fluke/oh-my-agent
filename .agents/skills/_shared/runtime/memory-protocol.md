# Memory Protocol (CLI Mode)

> **Note**: This file documents the default (direct-file) memory protocol. Vendor-specific execution protocols are injected automatically by `oma agent spawn` from `execution-protocols/{vendor}.md`.

When running as a CLI subagent, follow this protocol.

## Tool Reference

Coordination artifacts are read and written as plain files using your native file tools.
Tool names remain configurable via `mcp.json → memoryConfig.tools`; this file
memory contract is independent of any code-intelligence provider.
- `[READ]` → default: `Read`
- `[WRITE]` → default: `Write`
- `[EDIT]` → default: `Edit`
- `[LIST]` → default: directory listing (e.g. `ls` / `list_dir`)
- `[DELETE]` → default: file delete (e.g. `rm`)

Memory base path is configurable via `memoryConfig.basePath` (default: `.agents/state/memories`). Create the directory if it does not yet exist.

> **CRITICAL**: Do NOT use Serena's MCP `write_memory` / `read_memory` for workflow session/progress/result state. Verification gates (e.g. `oma ralph verify`, CCR reviewers) check durable files on disk under `.agents/state/memories/`. Use file tools (`Read`/`Write`/`Edit`) to persist them directly to `{memoryConfig.basePath}/`.

---

## Path Resolution (CRITICAL)

Use the injected `claimPath` for structured result claims and do not rename or
move it. Keep existing flat session artifacts for consumer compatibility. Add
task and run identity to human-readable reports:

```
{memoryConfig.basePath}/
  orchestrator-session-{sessionId}.md
  task-board-{sessionId}.md
  progress-{agentId}-{taskId}-{runId}-{sessionId}.md
  result-{agentId}-{taskId}-{runId}-{sessionId}.md
  lessons-{sessionId}.md
  experiment-ledger-{sessionId}.md
```

`taskId` and `runId` are required for plan-based work. A manual run may use a
generated local run ID. Never use workspace or agent ID alone as artifact
identity. Receipts remain in `.agents/state/agent-runs/` and retain their
existing structured schema.

## On Start

1. `[READ]("task-board-{sessionId}.md")` to confirm your assigned task
2. `[WRITE]("progress-{agentId}-{taskId}-{runId}-{sessionId}.md", initial progress entry)` with Turn 1 status

## During Execution

- Every 3-5 turns: `[EDIT]("progress-{agentId}-{taskId}-{runId}-{sessionId}.md")` to append a new turn entry
- Include: action taken, current status, files created/modified

## On Completion

- `[WRITE]("result-{agentId}-{taskId}-{runId}-{sessionId}.md")` with final result including:
  - Status: `completed`, `partial`, `blocked`, or `failed`
  - Summary of work done
  - Files created/modified
  - Acceptance criteria checklist

## On Failure

- Still create the run-scoped result with an accurate status.
- Include detailed error description and what remains incomplete

---

## Experiment Tracking (Optional Extension)

When a task compares an actual experiment, use `../conditional/experiment-ledger.md` for recording and `../conditional/quality-score.md` for comparable measurements. Routine verification does not require a ledger.

Use `experiment-ledger-{sessionId}.md` under the configured coordination store. The coordinator merges task/run-scoped agent results into this shared artifact; parallel workers do not append concurrently. Link baseline and candidate evidence, required check results, the decision and reason, and owned paths. No composite score, fixed row layout, or agent ranking is required.

---

## Example with Default Tools (Direct File)

```
# On Start
Read(".agents/state/memories/task-board-session-20260405-100835.md")
Write(".agents/state/memories/progress-backend-task-api-run-01-session-20260405-100835.md", initial_content)

# During Execution
Edit(".agents/state/memories/progress-backend-task-api-run-01-session-20260405-100835.md", turn_update)

# On Completion
Write(".agents/state/memories/result-backend-task-api-run-01-session-20260405-100835.md", final_result)
```

## Example with Custom Tools

If `memoryConfig.tools` is configured differently:

```json
{
  "memoryConfig": {
    "tools": {
      "read": "fs_read",
      "write": "fs_write",
      "edit": "fs_patch"
    }
  }
}
```

Then use:
```python
fs_read("task-board-session-20260405-100835.md")
fs_write("progress-backend-task-api-run-01-session-20260405-100835.md", initial_content)
fs_patch("progress-backend-task-api-run-01-session-20260405-100835.md", turn_update)
fs_write("result-backend-task-api-run-01-session-20260405-100835.md", final_result)
```
