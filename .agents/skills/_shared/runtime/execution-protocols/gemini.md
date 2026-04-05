# Execution Protocol (Gemini)

When running as a CLI subagent, follow this protocol for shared state coordination.

## MCP Memory Tools

Tool names are configurable via `mcp.json → memoryConfig.tools`:
- `[READ]` → default: `read_memory`
- `[WRITE]` → default: `write_memory`
- `[EDIT]` → default: `edit_memory`
- `[LIST]` → default: `list_memories`
- `[DELETE]` → default: `delete_memory`

Memory base path is configurable via `memoryConfig.basePath` (default: `.serena/memories`).

### Path Resolution (CRITICAL)

All result, progress, and state files MUST be written to the **project root** memory path — never to a subdirectory's memory path.

- **Session-scoped naming**: when running under an orchestration session, append session ID as suffix:
  - `result-{agent-id}-{sessionId}.md` (e.g., `result-frontend-session-20260405-100835.md`)
  - `progress-{agent-id}-{sessionId}.md`
- **Manual (non-orchestrated) runs**: no suffix — `result-{agent-id}.md`

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
