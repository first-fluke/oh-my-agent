---
title: "Guide: Dashboard Monitoring"
sidebar_label: Dashboard Monitoring
description: Monitor OMA sessions from the terminal or a loopback web dashboard, choose the state directory, and recover common connection and discovery problems.
---

# Guide: Dashboard Monitoring

## Two dashboard commands

oh-my-agent provides two real-time dashboards for monitoring agent activity during multi-agent workflows.

| Command | Interface | URL | Technology |
|:--------|:---------|:----|:-----------|
| `oma dashboard terminal` | Terminal (TUI) | N/A (renders in your terminal) | chokidar file watcher, picocolors rendering |
| `oma dashboard web` | Browser | `http://127.0.0.1:9847/` (printed at startup) | HTTP server, WebSocket, chokidar file watcher |

Both dashboards watch `.agents/state/memories/` under the current directory by default. Pass `--project-root <path>` to watch another project, or set `MEMORIES_DIR` when the coordination files live elsewhere. The dashboard does not automatically fall back to `.serena/memories/`.

### Terminal dashboard

```bash
oma dashboard terminal
```

Renders a box-drawing UI directly in the terminal. Updates automatically when memory files change. Press `Ctrl+C` to exit. The screen has four regions, top to bottom:

| Region | Shows | Source |
|:-------|:------|:-------|
| Header | `OMA Memory Dashboard` and `Session: <id> [<status>]` | `orchestrator-session.md`, else the newest `session-*.md`; `N/A [UNKNOWN]` when neither exists |
| Agent table | Agent, Status, Turn, and Task (first 20 characters); `No agents detected yet` when empty | `task-board.md`, else agents discovered in memory files |
| Latest Activity | Up to five `[<name>] <message>` lines; `No activity yet` when empty | Last meaningful line of the five most recently modified `.md` files |
| Footer | `Updated: <time>  \|  Ctrl+C to exit` | Time of the last redraw |

**Status symbols:**
- `●` (green): running
- `✓` (cyan): completed
- `✗` (red): failed
- `○` (yellow): blocked
- `◌` (dim): pending

### Web dashboard

```bash
oma dashboard web
```

Starts a loopback-only web server on port 9847 (configurable via `DASHBOARD_PORT`). The command prints `http://127.0.0.1:9847/` and `Watching: <memories dir>`. Each start creates a new access token and embeds it in the page it serves, so open the printed URL; there is nothing to copy. The page sends the token with `/api/state`, `/api/recap`, and WebSocket requests; requests without it return `401`.

```bash
# Custom port
DASHBOARD_PORT=8080 oma dashboard web

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard web

# Recap view from the same process: http://127.0.0.1:9847/recap
```

The web dashboard shows the same information as the terminal dashboard but with a styled dark-theme UI featuring:
- Connection status badge (Connected / Disconnected / Connecting with auto-reconnect)
- Session ID and status bar
- Agent status table with animated status dots
- Latest activity feed
- Auto-updating timestamps

---

## Recommended 3-Terminal layout

For multi-agent workflows, the recommended setup uses three terminal panes:

| Pane | Run | Purpose |
|:-----|:----|:--------|
| 1. Main agent | Your host CLI (`claude`, `codex`, `agy`, `qwen`, and so on), then `/orchestrate` or `/work` | Drive the workflow |
| 2. Dashboard | `oma dashboard terminal` (or `oma dashboard web`) | Watch progress passively; it updates without interaction |
| 3. Ad-hoc commands | `oma agent status session-20260324-143052 backend frontend`, `oma stats get`, `oma verify agent backend -w ./api` | Check agent status, run verifications, view stats, or debug issues |

---

## Data sources in .agents/state/memories/

The dashboards read from the `.agents/state/memories/` directory. This directory is populated by agents and workflows writing coordination files during execution. Use `MEMORIES_DIR` for a project whose state is stored in another location.

### File types and their contents

| File Pattern | Created By | Contents |
|:-------------|:----------|:---------|
| `orchestrator-session.md` | `/orchestrate` Step 2 | Session ID, start time, status (RUNNING/COMPLETED/FAILED), workflow version |
| `session-{workflow}.md` | `/work`, `/ultrawork` | Session metadata, phase progress, user request summary |
| `task-board.md` | Orchestration workflows | Markdown table with agent assignments, statuses, and tasks |
| `progress-{agent}.md` | Each spawned agent | Current turn number, what the agent is working on, intermediate results |
| `result-{agent}.md` | Each completed agent | Final status (COMPLETED/FAILED), files changed, issues found, deliverables |
| `debug-{id}.md` | `/debug` workflow | Bug diagnosis, root cause, fix applied, regression test location |
| `experiment-ledger-{sessionId}.md` | Actual experiments | Comparable baseline/candidate evidence, required checks, and decisions |
| `lessons-{sessionId}.md` | When a reusable cause is supported by evidence | Session-scoped lessons; no score-triggered generation |

### How the dashboard reads them

The dashboard uses multiple strategies to extract information:

1. **Session detection**: Looks for `orchestrator-session.md` first, then falls back to the most recently modified `session-*.md` file. Parses status from keywords: `RUNNING`, `IN PROGRESS`, `COMPLETED`, `DONE`, `FAILED`, `ERROR`.

2. **Task board parsing**: Reads `task-board.md` as a Markdown table. Extracts agent name, status, and task description from columns.

3. **Agent discovery**: If no task board exists, discovers agents by scanning all `.md` files for `**Agent**: {name}` patterns, `Agent: {name}` lines, or filenames containing `_agent` or `-agent`.

4. **Turn counting**: For each discovered agent, reads `progress-{agent}.md` files and extracts the turn number from `turn: N` patterns.

5. **Activity feed**: Lists the 5 most recently modified `.md` files, extracts the last meaningful line (headers, status lines, action items) as the activity message. The web dashboard also exposes the recap view at `/recap`.

---

## What each dashboard shows

### Session status

The top section displays:
- **Session ID**: Extracted from session files (format: `session-YYYYMMDD-HHMMSS`).
- **Status**: Color-coded: green for RUNNING, cyan for COMPLETED, red for FAILED, yellow for UNKNOWN.

### Task board

The agent table shows every detected agent with:
- **Agent name**: The domain identifier (backend, frontend, mobile, qa, debug, pm).
- **Status**: Current state with visual indicator (running/completed/failed/blocked/pending).
- **Turn**: The agent's current turn number (how many iterations it has completed). Extracted from progress files.
- **Task**: Brief description of what the agent is working on (truncated to fit).

### Agent progress

Progress is tracked through `progress-{agent}.md` files. Each file is updated by the agent as it works. The dashboard polls these files for:
- Turn number (increments as the agent progresses).
- Current action (what the agent is doing right now).
- Intermediate results (partial completions).

### Results

When an agent completes, it writes `result-{agent}.md` with:
- Final status (COMPLETED or FAILED).
- List of files changed.
- Issues encountered.
- Deliverables produced.

The dashboard detects completion by the presence of this file and updates the agent's status accordingly.

---

## Troubleshooting runbook

### Signal 1: agent shows "running" but no turn progress

**Symptom:** The dashboard shows an agent as running, but the turn number has not changed for several minutes.

**Possible causes:**
- The agent is stuck on a long operation (large codebase scan, slow API call).
- The agent crashed but the PID file still exists.
- The agent is waiting for user input (should not happen in auto-approve mode).

**Actions:**
1. Check the agent's log file. `oma agent spawn` prints its path as `Log: ...`; it is in the OS temp directory: `cat "${TMPDIR:-/tmp}/subagent-{session-id}-{agent-id}.log"`
2. Check if the process is actually running: `oma agent status {session-id} {agent-id}`
3. If the process is not running but status shows "running", the agent crashed. Re-spawn with error context.

### Signal 2: agent shows "crashed"

**Symptom:** `oma agent status` returns `crashed` for an agent.

**Possible causes:**
- The CLI vendor process exited unexpectedly (out of memory, API quota exceeded, network timeout).
- The workspace directory was deleted or permissions changed.
- The vendor CLI is not installed or not authenticated.

**Actions:**
1. Check the log file for error details: `cat "${TMPDIR:-/tmp}/subagent-{session-id}-{agent-id}.log"` (the `Log:` path printed by `oma agent spawn`)
2. Verify CLI installation: `oma doctor`
3. Check authentication: `oma auth status`
4. Re-spawn the agent with the same task: `oma agent spawn {agent-id} "{task}" {session-id} -w {workspace}`

### Signal 3: dashboard shows "no agents detected yet"

**Symptom:** The dashboard is running but shows no agents.

**Possible causes:**
- The workflow has not reached the agent spawning step yet.
- The `.agents/state/memories/` directory is empty.
- The dashboard is watching the wrong directory.

**Actions:**
1. Verify the memories directory: `ls -la .agents/state/memories/`
2. Check if the workflow is still in the planning phase (agents have not been spawned yet).
3. Ensure the dashboard is watching the correct project directory: the dashboard resolves the memories path from the current working directory. Run from the project root, or pass `--project-root /path/to/project`. `oma dashboard web` prints the watched path as `Watching: <path>`.
4. If using a custom path: `MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal`

### Signal 4: web dashboard shows "disconnected"

**Symptom:** The web dashboard's connection badge shows "Disconnected" in red.

**Possible causes:**
- The `oma dashboard web` process was terminated.
- The `oma dashboard web` process was restarted, and the open tab still holds the previous process's token.

**Actions:**
1. Check if the dashboard process is running: `ps aux | grep dashboard`
2. If you restarted the dashboard, reload the page so it picks up the new token.
3. If the process stopped, start `oma dashboard web` again, then reload the page.
4. If startup fails with `Dashboard failed: port 9847 is already in use`, check the port (`lsof -i :9847`) and try another one: `DASHBOARD_PORT=8080 oma dashboard web`
5. The web dashboard auto-reconnects with exponential backoff (starting at 1s, max 10s). Wait a few seconds for reconnection.

---

## Pre-merge monitoring checklist

Before considering a multi-agent session complete, verify through the dashboard:

- [ ] **All agents show "completed"**: No agents stuck in "running" or "blocked" state.
- [ ] **No agents show "failed"**: If any failed, check logs and re-spawn.
- [ ] **QA agent has completed its review**: Look for `result-qa-agent.md` or `result-qa.md`.
- [ ] **Zero CRITICAL/HIGH findings**: Check the QA result file for severity counts.
- [ ] **Session status is COMPLETED**: The session file should show final status.
- [ ] **Activity feed shows final report**: The last activity should be the summary report.

---

## Done criteria

Dashboard monitoring is done when:
1. All spawned agents have reached a terminal state (completed or failed-and-handled).
2. The QA review cycle has concluded with no blocking issues.
3. The session status reflects the final outcome.
4. Results are recorded in memory for future reference.

---

## Technical details

### Terminal dashboard (oma dashboard terminal)

- **File watching:** Uses [chokidar](https://github.com/paulmillr/chokidar) with `awaitWriteFinish` (200ms stability threshold, 50ms poll interval) to avoid rendering partial file writes.
- **Rendering:** Clears and redraws the entire terminal on every file change event. Uses `picocolors` for ANSI color output and Unicode box-drawing characters for the border.
- **Memory directory:** `MEMORIES_DIR` when set; otherwise `<project>/.agents/state/memories`, where `<project>` is `--project-root <path>` or the current directory. A missing directory is created empty.
- **Graceful shutdown:** Catches `SIGINT` and `SIGTERM`, closes the chokidar watcher, and exits cleanly.

### Web dashboard (oma dashboard web)

- **HTTP server:** Node.js `createServer` serves the HTML page at `/`, the recap page at `/recap`, JSON state at `/api/state`, and recap data at `/api/recap`. The server binds to `127.0.0.1`.
- **WebSocket:** Uses the `ws` library. A loopback-origin connection must include the process token in its query string. On connection, the client receives the full state immediately. Subsequent updates are pushed as `{ type: "update", event, file, data }` messages.
- **File watching:** Same chokidar setup as the terminal dashboard. File changes trigger a `broadcast()` function that builds the current state and sends it to all connected WebSocket clients.
- **Debouncing:** Updates are debounced at 100ms to avoid flooding clients during rapid file writes (e.g., when multiple agents write progress simultaneously).
- **Auto-reconnect:** The browser client reconnects with exponential backoff (1s initial, 1.5x multiplier, 10s max) when the WebSocket connection drops.
- **Port:** Default 9847, configurable via `DASHBOARD_PORT` environment variable. API requests accept `X-OMA-Dashboard-Token` or `?token=...`; missing or invalid tokens return `401`.
- **State building:** The `buildFullState()` function aggregates session info, task board, agent status, turn counts, and activity feed into a single JSON object on every update.

---

## Next steps

- Audit or resume results after a run: [Results and Resume](./agent-results-and-resume.md)
- Dashboard and run failures by symptom: [Troubleshooting](./troubleshooting.md)
- Plan and run multi-agent work: [Multi-Agent Projects](./multi-agent-project.md)
