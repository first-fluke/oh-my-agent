# Execution Protocol (opencode)

When running as a CLI subagent (`opencode` headless mode), follow this protocol for shared state coordination. The parent records the structured result described below.

## State Management

Use native file tools for coordination notes under `.agents/state/memories/` at the project root. Human-facing reports may live under `.agents/results/`. Completion follows [the shared result contract](../result-contract.md); neither location alone proves completion.

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

## Lifecycle and results

Follow [Execution Policy](../../core/execution-policy.md) and [Agent Result Contract](../result-contract.md). The task-specific injected run ID and result path are authoritative for this dispatch. Keep coordination notes in the project-root memory store; the structured receipt determines completion.

Read an existing task board when assigned one. Report progress for long tasks. Include unresolved work even on failure. For read-only dispatch, return the injected stdout JSON contract instead of writing files.
