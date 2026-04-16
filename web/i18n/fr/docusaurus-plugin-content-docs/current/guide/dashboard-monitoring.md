---
title: "Guide : Surveillance par Dashboard"
description: Guide complet des dashboards couvrant les dashboards terminal et web, sources de données, disposition à 3 terminaux, dépannage et détails techniques d'implémentation.
---

# Guide : Surveillance par Dashboard

## Deux commandes de tableau de bord

oh-my-agent fournit deux tableaux de bord en temps réel pour surveiller l'activité des agents pendant les workflows multi-agents.

| Command | Interface | URL | Technology |
|:--------|:---------|:----|:-----------|
| `oma dashboard` | Terminal (TUI) | N/A — renders in your terminal | chokidar file watcher, picocolors rendering |
| `oma dashboard:web` | Browser | `http://localhost:9847` | HTTP server, WebSocket, chokidar file watcher |

Les deux tableaux de bord surveillent la même source de données : le répertoire `.serena/memories/`.

### Tableau de bord terminal

```bash
oma dashboard
```

Renders a box-drawing UI directly in the terminal. Updates automatically when memory files change. Press `Ctrl+C` to exit.

```
╔════════════════════════════════════════════════════════╗
║  Serena Memory Dashboard                              ║
║  Session: session-20260324-143052  [RUNNING]          ║
╠════════════════════════════════════════════════════════╣
║  Agent        Status       Turn   Task                ║
║  ──────────── ──────────── ────── ──────────────────  ║
║  backend      ● running    3      Implement user API  ║
║  frontend     ● running    2      Build login page    ║
║  mobile       ✓ completed  5      Auth screens done   ║
║  qa           ○ blocked    -                          ║
╠════════════════════════════════════════════════════════╣
║  Latest Activity:                                     ║
║  [backend] Implementing JWT token validation          ║
║  [frontend] Creating login form components            ║
║  [mobile] Completed biometric auth integration        ║
╠════════════════════════════════════════════════════════╣
║  Updated: 03/24/2026, 02:31:15 PM  |  Ctrl+C to exit ║
╚════════════════════════════════════════════════════════╝
```

**Status symbols:**
- `●` (green) — running
- `✓` (cyan) — completed
- `✗` (red) — failed
- `○` (yellow) — blocked
- `◌` (dim) — pending

### Web Dashboard

```bash
oma dashboard:web
```

Opens a web server on port 9847 (configurable via `DASHBOARD_PORT` environment variable). The browser UI connects via WebSocket and receives live updates.

```bash
# Custom port
DASHBOARD_PORT=8080 oma dashboard:web

# Custom memories directory
MEMORIES_DIR=/path/to/.serena/memories oma dashboard:web
```

The web dashboard shows the same information as the terminal dashboard but with a styled dark-theme UI featuring:
- Connection status badge (Connected / Disconnected / Connecting with auto-reconnect)
- Session ID and status bar
- Agent status table with animated status dots
- Latest activity feed
- Auto-updating timestamps

---

## Disposition Recommandée à 3 Terminaux

For multi-agent workflows, the recommended setup uses three terminal panes:

```
┌────────────────────────────────┬────────────────────────────────┐
│                                │                                │
│   Terminal 1: Main Agent       │   Terminal 2: Dashboard        │
│                                │                                │
│   $ gemini                     │   $ oma dashboard              │
│   > /orchestrate               │                                │
│   ...                          │   ╔═══════════════════════╗    │
│                                │   ║ Serena Dashboard      ║    │
│                                │   ║ Session: ...          ║    │
│                                │   ╚═══════════════════════╝    │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│   Terminal 3: Ad-hoc commands                                   │
│                                                                 │
│   $ oma agent:status session-20260324-143052 backend frontend   │
│   $ oma stats                                                   │
│   $ oma verify backend -w ./api                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Terminal 1** runs your primary agent session (Gemini CLI, Claude Code, Codex, etc.) where you interact with workflows like `/orchestrate` or `/work`.

**Terminal 2** runs the dashboard for passive monitoring. It updates automatically — no interaction needed.

**Terminal 3** is for ad-hoc commands: checking agent status, running verifications, viewing stats, or debugging issues.

---

## Data Sources in .serena/memories/

The dashboards read from the `.serena/memories/` directory. This directory is populated by agents and workflows using MCP memory tools during execution.

### File Types and Their Contents

| File Pattern | Created By | Contents |
|:-------------|:----------|:---------|
| `orchestrator-session.md` | `/orchestrate` Step 2 | Session ID, start time, status (RUNNING/COMPLETED/FAILED), workflow version |
| `session-{workflow}.md` | `/work`, `/ultrawork` | Session metadata, phase progress, user request summary |
| `task-board.md` | Orchestration workflows | Markdown table with agent assignments, statuses, and tasks |
| `progress-{agent}.md` | Each spawned agent | Current turn number, what the agent is working on, intermediate results |
| `result-{agent}.md` | Each completed agent | Final status (COMPLETED/FAILED), files changed, issues found, deliverables |
| `debug-{id}.md` | `/debug` workflow | Bug diagnosis, root cause, fix applied, regression test location |
| `experiment-ledger.md` | Quality Score system | Experiment tracking: baseline scores, deltas, keep/discard decisions |
| `lessons-learned.md` | Auto-generated at session end | Lessons from discarded experiments (delta <= -5) |

### How the Dashboard Reads Them

The dashboard uses multiple strategies to extract information:

1. **Session detection** — Looks for `orchestrator-session.md` first, then falls back to the most recently modified `session-*.md` file. Parses status from keywords: `RUNNING`, `IN PROGRESS`, `COMPLETED`, `DONE`, `FAILED`, `ERROR`.

2. **Task board parsing** — Reads `task-board.md` as a Markdown table. Extracts agent name, status, and task description from columns.

3. **Agent discovery** — If no task board exists, discovers agents by scanning all `.md` files for `**Agent**: {name}` patterns, `Agent: {name}` lines, or filenames containing `_agent` or `-agent`.

4. **Turn counting** — For each discovered agent, reads `progress-{agent}.md` files and extracts the turn number from `turn: N` patterns.

5. **Activity feed** — Lists the 5 most recently modified `.md` files, extracts the last meaningful line (headers, status lines, action items) as the activity message.

---

## What Each Dashboard Shows

### Session Status

The top section displays:
- **Session ID** — Extracted from session files (format: `session-YYYYMMDD-HHMMSS`).
- **Status** — Color-coded: green for RUNNING, cyan for COMPLETED, red for FAILED, yellow for UNKNOWN.

### Task Board

The agent table shows every detected agent with:
- **Agent name** — The domain identifier (backend, frontend, mobile, qa, debug, pm).
- **Status** — Current state with visual indicator (running/completed/failed/blocked/pending).
- **Turn** — The agent's current turn number (how many iterations it has completed). Extracted from progress files.
- **Task** — Brief description of what the agent is working on (truncated to fit).

### Agent Progress

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

## Troubleshooting Runbook

### Signal 1: Agent Shows "running" but No Turn Progress

**Symptom:** The dashboard shows an agent as running, but the turn number has not changed for several minutes.

**Possible causes:**
- The agent is stuck on a long operation (large codebase scan, slow API call).
- The agent crashed but the PID file still exists.
- The agent is waiting for user input (should not happen in auto-approve mode).

**Actions:**
1. Check the agent's log file: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Check if the process is actually running: `oma agent:status {session-id} {agent-id}`
3. If the process is not running but status shows "running", the agent crashed. Re-spawn with error context.

### Signal 2: Agent Shows "crashed"

**Symptom:** `oma agent:status` returns `crashed` for an agent.

**Possible causes:**
- The CLI vendor process exited unexpectedly (out of memory, API quota exceeded, network timeout).
- The workspace directory was deleted or permissions changed.
- The vendor CLI is not installed or not authenticated.

**Actions:**
1. Check the log file for error details: `cat /tmp/subagent-{session-id}-{agent-id}.log`
2. Verify CLI installation: `oma doctor`
3. Check authentication: `oma auth:status`
4. Re-spawn the agent with the same task: `oma agent:spawn {agent-id} "{task}" {session-id} -w {workspace}`

### Signal 3: Dashboard Shows "No agents detected yet"

**Symptom:** The dashboard is running but shows no agents.

**Possible causes:**
- The workflow has not reached the agent spawning step yet.
- The `.serena/memories/` directory is empty.
- The dashboard is watching the wrong directory.

**Actions:**
1. Verify the memories directory: `ls -la .serena/memories/`
2. Check if the workflow is still in the planning phase (agents have not been spawned yet).
3. Ensure the dashboard is watching the correct project directory: the dashboard resolves the memories path from the current working directory.
4. If using a custom path: `MEMORIES_DIR=/path/to/.serena/memories oma dashboard`

### Signal 4: Web Dashboard Shows "Disconnected"

**Symptom:** The web dashboard's connection badge shows "Disconnected" in red.

**Possible causes:**
- The `oma dashboard:web` process was terminated.
- A network issue between the browser and localhost.
- The port is in use by another process.

**Actions:**
1. Check if the dashboard process is running: `ps aux | grep dashboard`
2. Try a different port: `DASHBOARD_PORT=8080 oma dashboard:web`
3. Check port availability: `lsof -i :9847`
4. The web dashboard auto-reconnects with exponential backoff (starting at 1s, max 10s). Wait a few seconds for reconnection.

---

## Pre-Merge Monitoring Checklist

Before considering a multi-agent session complete, verify through the dashboard:

- [ ] **All agents show "completed"** — No agents stuck in "running" or "blocked" state.
- [ ] **No agents show "failed"** — If any failed, check logs and re-spawn.
- [ ] **QA agent has completed its review** — Look for `result-qa-agent.md` or `result-qa.md`.
- [ ] **Zero CRITICAL/HIGH findings** — Check the QA result file for severity counts.
- [ ] **Session status is COMPLETED** — The session file should show final status.
- [ ] **Activity feed shows final report** — The last activity should be the summary report.

---

## Critères de Complétion

Dashboard monitoring is done when:
1. All spawned agents have reached a terminal state (completed or failed-and-handled).
2. The QA review cycle has concluded with no blocking issues.
3. The session status reflects the final outcome.
4. Results are recorded in memory for future reference.

---

## Détails Techniques

### Terminal Dashboard (oma dashboard)

- **File watching:** Uses [chokidar](https://github.com/paulmillr/chokidar) with `awaitWriteFinish` (200ms stability threshold, 50ms poll interval) to avoid rendering partial file writes.
- **Rendering:** Clears and redraws the entire terminal on every file change event. Uses `picocolors` for ANSI color output and Unicode box-drawing characters for the border.
- **Memory directory:** Resolved from `MEMORIES_DIR` env var, CLI argument, or `{cwd}/.serena/memories`.
- **Graceful shutdown:** Catches `SIGINT` and `SIGTERM`, closes the chokidar watcher, and exits cleanly.

### Web Dashboard (oma dashboard:web)

- **HTTP server:** Node.js `createServer` serves the HTML page at `/` and the JSON state at `/api/state`.
- **WebSocket:** Uses the `ws` library. A `WebSocketServer` is attached to the HTTP server. On connection, the client receives the full state immediately. Subsequent updates are pushed as `{ type: "update", event, file, data }` messages.
- **File watching:** Same chokidar setup as the terminal dashboard. File changes trigger a `broadcast()` function that builds the current state and sends it to all connected WebSocket clients.
- **Debouncing:** Updates are debounced at 100ms to avoid flooding clients during rapid file writes (e.g., when multiple agents write progress simultaneously).
- **Auto-reconnect:** The browser client reconnects with exponential backoff (1s initial, 1.5x multiplier, 10s max) when the WebSocket connection drops.
- **Port:** Default 9847, configurable via `DASHBOARD_PORT` environment variable.
- **State building:** The `buildFullState()` function aggregates session info, task board, agent status, turn counts, and activity feed into a single JSON object on every update.
