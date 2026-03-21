# Execution Protocol (Claude Code)

When running as a CLI subagent, follow this protocol for shared state coordination.

## State Management

Use file-based I/O for coordination. Write results to `.agents/results/`.

If Serena MCP is available, you may also use `read_memory`/`write_memory`/`edit_memory`.

## On Start

1. Read `.agents/results/task-board.md` (or `read_memory("task-board.md")`) to confirm your assigned task
2. Create `.agents/results/progress-{agent-id}.md` with initial status

## During Execution

- Periodically update `progress-{agent-id}.md` with current state
- Include: action taken, current status, files created/modified

## On Completion

- Create `.agents/results/result-{agent-id}.md` with final result including:
  - Status: `completed` or `failed`
  - Summary of work done
  - Files created/modified
  - Acceptance criteria checklist

## On Failure

- Still create `result-{agent-id}.md` with Status: `failed`
- Include detailed error description and what remains incomplete
