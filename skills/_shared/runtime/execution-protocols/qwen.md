# Execution Protocol (Qwen)

When running as a CLI subagent, follow this protocol for shared state coordination.

## Memory Tools

Coordination artifacts are read and written as plain files with your native file tools.
Tool names remain configurable via `mcp.json → memoryConfig.tools`:
- `[READ]` → default: `Read`
- `[WRITE]` → default: `Write`
- `[EDIT]` → default: `Edit`

Memory base path is configurable via `memoryConfig.basePath` (default: `.agents/state/memories`). Create the directory if it does not yet exist.

### Path Resolution (CRITICAL)

All result, progress, and state files MUST be written to the **project root** memory path, never to a subdirectory's memory path.

- **Session-scoped naming**: when running under an orchestration session, append session ID as suffix:
  - `result-{agent-id}-{sessionId}.md` (e.g., `result-frontend-session-20260405-100835.md`)
  - `progress-{agent-id}-{sessionId}.md`
- **Manual (non-orchestrated) runs**: no suffix, `result-{agent-id}.md`

## Lifecycle and results

Follow [Execution Policy](../../core/execution-policy.md) and [Agent Result Contract](../result-contract.md). The task-specific injected run ID and result path are authoritative for this dispatch. Keep coordination notes in the project-root memory store; the structured receipt determines completion.

Read an existing task board when assigned one. Report progress for long tasks. Include unresolved work even on failure. For read-only dispatch, return the injected stdout JSON contract instead of writing files.
