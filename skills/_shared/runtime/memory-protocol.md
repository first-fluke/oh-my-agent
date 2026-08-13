# Memory Protocol (CLI Mode)

> **Note**: This file documents the default (direct-file) memory protocol. Vendor-specific execution protocols are injected automatically by `oma agent:spawn` from `execution-protocols/{vendor}.md`.

When running as a CLI subagent, follow this protocol.

## Tool Reference

Coordination artifacts are read and written as plain files using your native file tools.
Tool names remain configurable via `mcp.json → memoryConfig.tools`:
- `[READ]` → default: `Read`
- `[WRITE]` → default: `Write`
- `[EDIT]` → default: `Edit`
- `[LIST]` → default: directory listing (e.g. `ls` / `list_dir`)
- `[DELETE]` → default: file delete (e.g. `rm`)

Memory base path is configurable via `memoryConfig.basePath` (default: `.agents/state/memories`). Create the directory if it does not yet exist.

---

## Path Resolution (CRITICAL)

All result, progress, and state files MUST be written to the **project root**, never to a subdirectory.

- **Session-scoped naming**: when running under an orchestration session, append session ID as suffix:
  - `result-{agent-id}-{sessionId}.md`
  - `progress-{agent-id}-{sessionId}.md`
- **Manual (non-orchestrated) runs**: no suffix, `result-{agent-id}.md`

## On Start

1. `[READ]("task-board.md")` to confirm your assigned task
2. `[WRITE]("progress-{agent-id}[-{sessionId}].md", initial progress entry)` with Turn 1 status

## During Execution

- Every 3-5 turns: `[EDIT]("progress-{agent-id}[-{sessionId}].md")` to append a new turn entry
- Include: action taken, current status, files created/modified

## On Completion

- `[WRITE]("result-{agent-id}[-{sessionId}].md")` with final result including:
  - Status: `completed` or `failed`
  - Summary of work done
  - Files created/modified
  - Acceptance criteria checklist

## On Failure

- Still create `result-{agent-id}[-{sessionId}].md` with Status: `failed`
- Include detailed error description and what remains incomplete

---

## Experiment Tracking (Optional Extension)

When a workflow activates Quality Score measurement (see `../conditional/quality-score.md`), agents record experiments using the same memory tools.

### Experiment Ledger Location

The ledger follows the same path convention as other memory files:
- **MCP mode**: `[WRITE]("experiment-ledger.md", ...)` → stored at `{memoryConfig.basePath}/experiment-ledger.md`
- **File-based mode** (Claude protocol): `.agents/results/experiment-ledger.md`

### Recording an Experiment

After each measurable change, append a row:

```
[EDIT]("experiment-ledger.md", append experiment row)
```

Row format: `| # | Phase | Agent | Hypothesis | Score Before | Score After | Delta | Decision |`

### Who Records

| Situation | Recorder |
|-----------|----------|
| IMPL baseline | Orchestrator (inline) |
| Post-VERIFY / Post-REFINE | QA or Debug agent (via memory tools) |
| Exploration experiments | Orchestrator (inline, after scoring) |
| Final summary | Orchestrator (at session end) |

See `../conditional/experiment-ledger.md` for full format and analysis protocol.

---

## Example with Default Tools (Direct File)

```
# On Start
Read(".agents/state/memories/task-board.md")
Write(".agents/state/memories/progress-backend-session-20260405-100835.md", initial_content)

# During Execution
Edit(".agents/state/memories/progress-backend-session-20260405-100835.md", turn_update)

# On Completion
Write(".agents/state/memories/result-backend-session-20260405-100835.md", final_result)
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
fs_read("task-board.md")
fs_write("progress-backend-session-20260405-100835.md", initial_content)
fs_patch("progress-backend-session-20260405-100835.md", turn_update)
fs_write("result-backend-session-20260405-100835.md", final_result)
```
