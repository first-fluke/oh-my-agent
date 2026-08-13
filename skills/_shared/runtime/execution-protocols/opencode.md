# Execution Protocol (opencode)

When running as a CLI subagent (`opencode` headless mode), follow this protocol for shared state coordination. **In headless mode your stdout is captured in the spawner log, but the orchestrator reads only the result artifact below.** If you do not write it, the orchestrator reports your run as `crashed` even on success.

## State Management

Use file-based I/O for coordination. Coordination/state files (task-board, progress,
result hand-offs) MUST be written to the **project-root memory store** `.agents/state/memories/`
— that is the only location the orchestrator (`oma agent:status`), `oma verify`, and the
memory/retro tooling read. Writing them anywhere else (e.g. `.agents/results/`) leaves them
orphaned and your run is reported as `crashed`. Human-facing deliverables (plans, bug
reports, design docs) belong under `.agents/results/` instead.

Write and read these files directly at `.agents/state/memories/` using opencode's native
file tools; create the directory if it does not yet exist.

### Serena MCP Timeout Recovery (OpenCode Desktop)

OpenCode Desktop runs one long-lived sidecar server; new sessions reuse its MCP clients,
so a stuck Serena MCP stays stuck until the Desktop app is fully relaunched (the TUI is
rarely affected). When a Serena MCP call times out or the MCP queue is clearly stuck, do
not keep retrying MCP — fall back narrowly:

1. **Memory ops** — coordination artifacts are already plain files under
   `.agents/state/memories/` written with your native file tools, so a stuck MCP does not
   block them.
2. **Code analysis** — fall back to native search/read tools. The Serena CLI cannot
   execute analysis tools (`serena tools` only lists/describes them).
3. **Diagnostics** — `serena project health-check` and `serena project index` work
   without MCP.

Keep the fallback scoped to the blocked call: this is a recovery path, not a license to
abandon Serena-first. A full Desktop relaunch is what actually resets the stale MCP client.

### Path Resolution (CRITICAL)

All result, progress, and state files MUST be written to the **project root** `.agents/state/memories/` directory, never to a subdirectory's `.agents/state/memories/`.

- **Project root** = the git repository root (where `.git` exists)
- **Session-scoped naming**: when running under an orchestration session, append session ID as suffix:
  - `result-{agent-id}-{sessionId}.md` (e.g., `result-frontend-session-20260405-100835.md`)
  - `progress-{agent-id}-{sessionId}.md`
- **Manual (non-orchestrated) runs**: no suffix, `result-{agent-id}.md`

## On Start

1. Read `.agents/state/memories/task-board.md` to confirm your assigned task when it exists.
2. Create `.agents/state/memories/progress-{agent-id}[-{sessionId}].md` with initial status.

## During Execution

- Periodically update `progress-{agent-id}[-{sessionId}].md` with current state.
- Include: action taken, current status, files created/modified.

## On Completion

- Create `.agents/state/memories/result-{agent-id}[-{sessionId}].md` with final result including:
  - A status line — see **Status line format** below (REQUIRED)
  - Summary of work done
  - Files created/modified
  - Acceptance criteria checklist

## On Failure

- Still create `result-{agent-id}[-{sessionId}].md` with the status line set to `failed`.
- Include detailed error description and what remains incomplete.

## Status line format (REQUIRED)

The orchestrator parses the status with the regex `^## Status:\s*(\S+)`. The result file
MUST contain a single line in exactly this shape — heading marker, colon on the same line,
plain word, no backticks, no quotes:

```
## Status: completed
```

Use `## Status: failed` on failure. Do NOT split it across lines or render it as a
sub-bullet (e.g. `- Status: completed`) — that fails to parse and a failed run would be
silently misreported as completed.
