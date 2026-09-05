# Execution Protocol (Grok)

When running as a Grok subagent or custom agent, follow this protocol for shared state coordination with oh-my-agent.

## State Management

Use native file tools for coordination notes under `.agents/state/memories/` at the project root. Human-facing reports may live under `.agents/results/`. Completion follows [the shared result contract](../result-contract.md); neither location alone proves completion.

Grok has good native support for project files and can use terminal commands for coordination.

### Path Resolution (CRITICAL)

All result, progress, and state files MUST be written to the **project root** `.agents/state/memories/` directory.

- **Project root** = the git repository root (where `.git` exists)
- **Session-scoped naming**: when running under an orchestration session, append session ID as suffix:
  - `result-{agent-id}-{sessionId}.md`
- **Manual runs**: `result-{agent-id}.md`

## Lifecycle and results

Follow [Execution Policy](../../core/execution-policy.md) and [Agent Result Contract](../result-contract.md). The task-specific injected run ID and result path are authoritative for this dispatch. Keep coordination notes in the project-root memory store; the structured receipt determines completion.

Read an existing task board when assigned one. Report progress for long tasks. Include unresolved work even on failure. For read-only dispatch, return the injected stdout JSON contract instead of writing files.

## Grok-Specific Notes

- Leverage Grok's strong code understanding and search capabilities.
- Use `run_terminal_cmd` for shell operations.
- Subagent spawning via the `task` tool when appropriate.
- Follow any `agents_md` or project instructions loaded in the agent definition.
