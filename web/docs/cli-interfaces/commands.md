---
title: "CLI Commands"
description: Complete reference for every oh-my-agent CLI command, covering syntax, options, examples, organized by category.
---

# CLI Commands

After installing globally (`bun install --global oh-my-agent`), use `oma` or `oh-my-agent`. For one-time use without installing, run `npx oh-my-agent`.

The environment variable `OH_MY_AG_OUTPUT_FORMAT` can be set to `json` to force machine-readable output on commands that support it. This is equivalent to passing `--json` to each command.

---

## Setup & installation

### oma (install)

The default command with no arguments launches the interactive installer.

```
oma
```

**What it does:**
1. Checks for legacy `.agent/` directory and migrates to `.agents/` if found.
2. Detects and offers to remove competing tools.
3. Prompts for project type (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. If backend is selected, prompts for language variant (Python, Node.js, Rust, Other).
5. Asks about GitHub Copilot symlinks.
6. Downloads the latest tarball from the registry.
7. Installs shared resources, workflows, configs, and selected skills.
8. Installs vendor adaptations for selected vendors (project-local settings; no silent HOME-level vendor writes).
9. Creates CLI symlinks.
10. Offers recommended **global** git config (opt-in confirm):
    - `rerere.enabled=true` — multi-agent merge conflict reuse
    - `init.defaultBranch=main` — consistent default branch for new repos
    - Skipped entirely under `--yes` / CI (prints manual fix hints instead)
11. Offers to configure MCP where applicable.
12. Prompts for GitHub star if `gh` is authenticated.

**Example:**
```bash
cd /path/to/my-project
oma
# Follow the interactive prompts
```

### doctor

Health check for CLI installations, MCP configs, and skill status.

```
oma doctor [--json] [--output <format>] [--profile]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--json` | Output as JSON |
| `--output <format>` | Output format (`text` or `json`) |
| `--profile` | Show profile health matrix. Displays the resolved model slug, CLI, and auth status per agent from the active `model_preset` and `agents:` overrides. See [Per-Agent Models](../guide/per-agent-models.md). |

**What it checks:**
- CLI installations: agy, claude, codex, qwen (version and path).
- Authentication status for each CLI.
- MCP configuration: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Installed skills: which skills are present and their status.
- Memory store directory: `.agents/state/memories/` existence and file count (older projects fall back to the legacy `.serena/memories/` path).
- Dual install markers (project vs global) and related warnings.
- Recommended **global** git config (`gitRecommended` in JSON):
  - `rerere.enabled=true`
  - `init.defaultBranch=main`
  - Each mismatch counts toward `totalIssues`
- Project vendor context files (e.g. `CLAUDE.md` / `AGENTS.md` OMA blocks when the matching CLI is installed).
- AgentMemory, state/hooks health, Serena reaper diagnostics, and related issue counters.

**Auto-repair:** If missing skills are detected, `doctor` offers to install them interactively. If recommended git config is missing or wrong, it offers the same opt-in global fixes used by install/update.

**Examples:**
```bash
# Interactive text output
oma doctor

# JSON output for CI pipelines
oma doctor --json

# Pipe to jq for specific checks
oma doctor --json | jq '.clis[] | select(.installed == false)'

# Inspect the profile resolution matrix
oma doctor --profile
```

### update

Update skills to the latest version from the registry.

```
oma update [-f | --force] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `-f, --force` | Overwrite user-customized config files (`oma-config.yaml`, `mcp.json`, `stack/` directories) |
| `--ci` | Run in non-interactive CI mode (skip prompts, plain text output) |
| `-y, --yes` | Skip prompts. Vendor scope is unchanged: only existing vendor directories are updated unless `--all` or `--vendor` is provided. |
| `--all` | Create/update all supported project-scoped vendors. |
| `--vendor <vendors>` | Create/update specific vendors. Accepts a comma-separated list such as `claude,qwen`. |

**What it does:**
1. Fetches `prompt-manifest.json` from the registry to check the latest version.
2. Compares with the local version in `.agents/skills/_version.json`.
3. If already up to date, exits.
4. Downloads and extracts the latest tarball.
5. Preserves user-customized files (unless `--force`).
6. Copies new files over `.agents/`.
7. Restores preserved files.
8. Updates vendor adaptations and refreshes symlinks. By default this only touches vendor directories that already exist in the project.
9. Offers recommended **global** git config (same opt-in as install: `rerere.enabled`, `init.defaultBranch`). Skipped under `--yes` / `--ci`.

**Examples:**
```bash
# Standard update (preserves config)
oma update

# Force update (resets all config to defaults)
oma update --force

# CI mode (no prompts, no spinners)
oma update --ci

# CI mode with force
oma update --ci --force

# Update existing vendors without prompts
oma update --yes

# Create/update every supported project-scoped vendor
oma update --all

# Create/update only Claude and Qwen integrations
oma update --vendor claude,qwen
```

### link

Regenerate vendor-native files from the `.agents/` source of truth without reinstalling.

```
oma link [vendors...] [--global]
```

**Examples:**

```bash
# Regenerate all configured vendors
oma link

# Regenerate only Claude and Codex files
oma link claude codex

# Regenerate the HOME install (~/.agents/) from any directory
oma link opencode --global
```

Without `--global`, link targets `<cwd>/.agents/`; with it, `~/.agents/` (or `OMA_HOME`). See [Global install](../guide/global-install.md).

**What it does:**
1. Rebuilds vendor-native agent files from `.agents/agents/`
2. Refreshes hooks and local settings for the selected vendors
3. Regenerates `CLAUDE.md`, `GEMINI.md`, or `AGENTS.md` integration blocks
4. Refreshes Cursor MCP linkage and CLI skill symlinks when relevant

Use this after editing `.agents/agents/`, `.agents/workflows/`, `.agents/rules/`, or hook definitions.

**Model behavior:**
- Same-vendor native dispatch uses the model defined in the generated vendor agent file.
- External fallback dispatch uses each vendor's `default_model` from `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

**Dispatch behavior:**
- If the target vendor matches the current runtime and that runtime supports native role agents, OMA uses native dispatch.
- Otherwise OMA falls back to `oma agent:spawn`.

### setup (workflow)

The `/setup` workflow (invoked inside an agent session) provides interactive configuration of language, CLI installations, MCP connections, and agent-CLI mapping. This is different from `oma` (the installer): `/setup` configures an already-installed instance.
---

## Monitoring & metrics

### dashboard

Start the terminal dashboard for real-time agent monitoring.

```
oma dashboard
```

No options. Watches `.agents/state/memories/` in the current directory (older projects fall back to the legacy `.serena/memories/` path). Renders a box-drawing UI with session status, agent table, and activity feed. Updates on every file change. Press `Ctrl+C` to exit.

The memories directory can be overridden with the `MEMORIES_DIR` environment variable.

**Example:**
```bash
# Standard usage
oma dashboard

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard
```

### dashboard:web

Start the web dashboard.

```
oma dashboard:web
```

Starts an HTTP server on `http://localhost:9847` with a WebSocket connection for live updates. Open the URL in a browser to see the dashboard.

**Environment variables:**

| Variable | Default | Description |
|:---------|:--------|:-----------|
| `DASHBOARD_PORT` | `9847` | Port for the HTTP/WebSocket server |
| `MEMORIES_DIR` | `{cwd}/.agents/state/memories` | Path to the memories directory (falls back to the legacy `{cwd}/.serena/memories` for older projects) |

**Example:**
```bash
# Standard usage
oma dashboard:web

# Custom port
DASHBOARD_PORT=8080 oma dashboard:web
```

### stats

View productivity metrics.

```
oma stats [--json] [--output <format>] [--reset]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--json` | Output as JSON |
| `--output <format>` | Output format (`text` or `json`) |
| `--reset` | Reset all metrics data |

**Metrics tracked:**
- Session count
- Skills used (with frequency)
- Tasks completed
- Total session time
- Files changed, lines added, lines removed
- Last updated timestamp

**Cost telemetry** (aggregated across every `session-cost-*.md` file under `.agents/state/memories/`):
- Total input tokens (prompt character approximation, no output tokens yet)
- Total spawns
- Estimated USD using a conservative per-vendor input-token rate table (Claude $3/M, Codex $5/M, Gemini $0.3/M, Qwen $0/M, Cursor $5/M, Antigravity $0.3/M)
- Per-vendor breakdown (tokens · spawns · USD)

The estimate is a floor, not a billing-accurate amount. Configure `session.quota_cap` in `.agents/oma-config.yaml` to enforce hard budgets at spawn time; see the Why oh-my-agent page in Getting Started for the quality-first arsenal these caps belong to.

Metrics are stored in `.serena/metrics.json`. Data is collected from git stats and memory files.

**Examples:**
```bash
# View current metrics
oma stats

# JSON output
oma stats --json

# Reset all metrics
oma stats --reset
```

### recap

Recap AI tool conversation history across Claude, Codex, Qwen, and Cursor sessions.

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**Options:**

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--window <period>` | Time window: `1d`, `3d`, `7d`, `2w`, `30d` | `1d` |
| `--date <date>` | Specific date (`YYYY-MM-DD`); takes precedence over `--window` | |
| `--tool <tools>` | Comma-separated filter: `grok,claude,codex,qwen,cursor,antigravity` | all |
| `--top <n>` | Show top N projects/topics | |
| `--sort <metric>` | Sort by `count` or `duration` | `count` |
| `--mermaid` | Output as Mermaid Gantt chart | |
| `--graph` | Open interactive graph in the browser | |
| `--json` / `--output <format>` | Machine-readable output | `text` |

**Examples:**

```bash
oma recap                                     # Today (1d)
oma recap --window 7d                         # Last week
oma recap --date 2026-04-20 --tool grok,claude
oma recap --window 7d --mermaid > week.mmd
oma recap --window 30d --graph                # Interactive browser graph
```

### retro

Engineering retrospective with metrics and trends.

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**Arguments:**

| Argument | Description | Default |
|:---------|:-----------|:--------|
| `window` | Time window for analysis (e.g., `7d`, `2w`, `1m`) | Last 7 days |

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--json` | Output as JSON |
| `--output <format>` | Output format (`text` or `json`) |
| `--interactive` | Interactive mode with manual entry |
| `--compare` | Compare current window vs prior same-length window |

**What it shows:**
- Tweetable summary (one-line metrics)
- Summary table (commits, files changed, lines added/removed, contributors)
- Trends vs last retro (if previous snapshot exists)
- Contributor leaderboard
- Commit time distribution (hourly histogram)
- Work sessions
- Commit types breakdown (feat, fix, chore, etc.)
- Hotspots (most-changed files)

**Examples:**
```bash
# Last 7 days (default)
oma retro

# Last 30 days
oma retro 30d

# Last 2 weeks
oma retro 2w

# Compare with previous period
oma retro 7d --compare

# Interactive mode
oma retro --interactive

# JSON for automation
oma retro 7d --json
```

---

## Agent management

### agent:spawn

Spawn a subagent process.

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>] [--isolation <mode>]
```

**Arguments:**

| Argument | Required | Description |
|:---------|:---------|:-----------|
| `agent-id` | Yes | Agent type. One of: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Yes | Task description. Can be inline text or a path to a file. |
| `session-id` | Yes | Session identifier (format: `session-YYYYMMDD-HHMMSS`) |

**Options:**

| Flag | Description |
|:-----|:-----------|
| `-m, --model <vendor>` | CLI vendor override: `antigravity`, `claude`, `codex`, `cursor`, `qwen`, `grok`, `pi` |
| `-w, --workspace <path>` | Working directory for the agent. Auto-detected from monorepo config if omitted. |
| `--isolation <mode>` | Per-spawn isolation mode. Currently supports `worktree`: creates a fresh git worktree at `${tmpdir}/oma-worktrees/{sessionId}/{agentId}` on branch `oma/{sessionId}/{agentId}` and runs the agent there. The worktree is retained after exit; merge or discard commands are printed for manual review (no auto-merge). |
| `--read-only` | Restrict the spawned agent to non-destructive tools (suppresses auto-approve flags). Used internally by `oma skills eval --live` for both eval arms. |

**Vendor resolution order:** `--model` flag > `agents:` override in `oma-config.yaml` > active `model_preset` agent defaults.

**Prompt resolution:** If the prompt argument is a path to an existing file, the file contents are used as the prompt. Otherwise, the argument is used as inline text. Vendor-specific execution protocols are appended automatically.

**Exit codes:**

| Code | Meaning |
|:-----|:--------|
| `0` | Vendor process exited 0 and a session result artifact exists under the workspace. |
| `3` | Vendor process exited 0 but wrote **no session result artifact** under the workspace (e.g. agy writing into its own trusted root instead of `-w`). A `blocker.raised` event is appended to the session trail and `agent:status` reports `no-artifact`. Do not treat the spawn as completed. |
| other | The vendor process itself failed; its exit code is passed through. |

**Examples:**
```bash
# Inline prompt, auto-detect workspace
oma agent:spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# Prompt from file, explicit workspace
oma agent:spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# Override vendor to Claude
oma agent:spawn backend "Implement auth" session-20260324-143000 -m claude -w ./api

# Mobile agent with auto-detected workspace
oma agent:spawn mobile "Add biometric login" session-20260324-143000

# Run inside an isolated git worktree (useful for hypothesis spawns or
# when parallel agents would touch shared files)
oma agent:spawn backend "Try a Drizzle-based rewrite" session-20260324-143000 --isolation worktree
```

### agent:status

Check the status of one or more subagents.

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

**Arguments:**

| Argument | Required | Description |
|:---------|:---------|:-----------|
| `session-id` | Yes | The session ID to check |
| `agent-ids` | No | Space-separated list of agent IDs. If omitted, no output. |

**Options:**

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `-r, --root <path>` | Root path for memory checks | Current directory |

**Status values:**
- `completed`: Result file exists (with optional status header).
- `running`: PID file exists and process is alive.
- `crashed`: PID file exists but process is dead, or no PID/result file found.
- `no-artifact`: Vendor process exited 0 but wrote no session result artifact under the workspace (silent misdirected write — see `agent:spawn` exit code `3`). Treat as a failed spawn.

**Output format:** One line per agent: `{agent-id}:{status}`

**Examples:**
```bash
# Check specific agents
oma agent:status session-20260324-143000 backend frontend

# Output:
# backend:running
# frontend:completed

# Check with custom root
oma agent:status session-20260324-143000 qa -r /path/to/project
```

### agent:parallel

Run multiple subagents in parallel.

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

**Arguments:**

| Argument | Required | Description |
|:---------|:---------|:-----------|
| `tasks` | Yes | Either a YAML tasks file path, or (with `--inline`) inline task specs |

**Options:**

| Flag | Description |
|:-----|:-----------|
| `-m, --model <vendor>` | CLI vendor override for all agents |
| `-i, --inline` | Inline mode: specify tasks as `agent:task[:workspace]` arguments |
| `--no-wait` | Background mode (start agents and return immediately) |

**YAML tasks file format:**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional, auto-detected if omitted
- agent: frontend
task: "Build user dashboard"
workspace: ./web
```

**Inline task format:** `agent:task` or `agent:task:workspace` (workspace must start with `./` or `/`).

**Results directory:** `.agents/results/parallel-{timestamp}/` contains log files for each agent.

**Examples:**
```bash
# From YAML file
oma agent:parallel tasks.yaml

# Inline mode
oma agent:parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# Background mode (no wait)
oma agent:parallel tasks.yaml --no-wait

# Override vendor for all agents
oma agent:parallel tasks.yaml -m claude
```

### agent:review

Run a code review using an external AI CLI (codex, claude, or qwen).

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `-m, --model <vendor>` | CLI vendor to use: `codex`, `claude`, `gemini`, `qwen`, `grok`. Defaults to `codex` when the resolved config vendor is unsupported. |
| `-p, --prompt <prompt>` | Custom review prompt. If omitted, a default code review prompt is used. |
| `-w, --workspace <path>` | Path to review. Defaults to the current working directory. |
| `--no-uncommitted` | Skip uncommitted changes review. When set, only committed changes in the session are reviewed. |

**What it does:**
- Detects the current session ID automatically from the environment or recent git activity.
- For `codex`: uses the native `codex review` subcommand.
- For `claude`, `qwen`: constructs a prompt-based review request and invokes the CLI with the review prompt.
- By default, reviews uncommitted changes in the working directory.
- With `--no-uncommitted`, restricts review to changes committed within the current session.

**Examples:**
```bash
# Review uncommitted changes with default vendor
oma agent:review

# Review with codex (uses native codex review command)
oma agent:review -m codex

# Review with claude using a custom prompt
oma agent:review -m claude -p "Focus on security vulnerabilities and input validation"

# Review a specific path
oma agent:review -w ./apps/api

# Review only committed changes (skip working tree)
oma agent:review --no-uncommitted

# Review committed changes in a specific workspace with gemini
oma agent:review -m gemini -w ./apps/web --no-uncommitted
```

### goal:set

Attach a goal contract to an active persistent workflow (orchestrate, ultrawork, work, ralph). The contract is enforced mechanically by the persistent-mode Stop hook — completion stops being a model judgment call.

```
oma goal:set [--workflow <name>] [--session <id>] [--gate <keyword>] [--budget-minutes <n>] [--description <text>]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--gate <keyword>` | Deterministic stop gate: `typecheck`, `test`, or `lint`. Maps to the package.json script of the same name, run as an argv array with no shell. While set, the Stop hook allows the workflow to end **only when this script passes**; on failure it blocks with the output tail so the agent knows what to fix. Free-form commands are rejected — the gate value lives in an agent-writable state file, so executing arbitrary strings from it would bypass the permission layer. |
| `--budget-minutes <n>` | Wall-clock budget measured from workflow activation. When exceeded, the Stop hook deactivates the workflow and allows an honest partial stop (machine verdict, recorded as `gate.failed` with `gate: "budget"` on the session event trail). |
| `--description <text>` | Human description of the objective. Informational only. |
| `--workflow <name>` | Target workflow when several persistent workflows are active. |
| `--session <id>` | Target session id suffix of the state file. |

**Behavior notes:**
- Gate pass → workflow deactivates, `gate.passed` is emitted, the stop is allowed.
- Gate failure and timeout (60s hard cap) both count toward the reinforcement limit (5), so a permanently red gate cannot block stops forever; the 2-hour staleness expiry remains as the final backstop.
- Without a goal contract, persistent mode behaves exactly as before (reinforcement prompts only) — the contract is fully opt-in.

**Examples:**
```bash
# After starting /ultrawork: require typecheck to pass before the session may end
oma goal:set --gate typecheck

# Bound an autonomous run: stop honestly after 2 hours even if incomplete
oma goal:set --workflow ultrawork --gate test --budget-minutes 120
```

---

## Scheduled agents

### schedule:add

Register a scheduled agent job. Exactly one of `--cron` or `--every` is required.

```
oma schedule:add <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [-m <vendor>] [-w <path>] [--once] [--max-age-days <n>] [--env <KEY1,KEY2>]
```

**Arguments:**

| Argument | Required | Description |
|:---------|:---------|:-----------|
| `agent-id` | Yes | Agent type: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Yes | Task description passed to the agent at fire time |

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--cron "<expr>"` | 5-field cron expression (e.g. `"0 9 * * *"`). Mutually exclusive with `--every`. |
| `--every "<phrase>"` | Natural-language interval: `5m`, `2h`, `1d`, `every 20m`, `every 5 minutes`. Rounds to nearest cron-expressible step and prints a note. Mutually exclusive with `--cron`. |
| `-m, --model <vendor>` | CLI vendor override passed to `oma agent:spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Defaults to auto-detect. |
| `-w, --workspace <path>` | Working directory for the agent. Defaults to current directory at registration time. |
| `--once` | One-shot mode: fires once, then self-removes. |
| `--max-age-days <n>` | Auto-expire recurring job after N days (`0` = indefinite). |
| `--env <KEY1,KEY2>` | Capture named env vars into `~/.agents/schedule/env/<id>` (0600) for injection at run time. Only listed keys are captured; never a full env dump. |

**What it does:**
1. Parses and validates the cron expression (or converts the `--every` phrase to cron).
2. Writes the job to `~/.agents/schedule/schedules.json` (global manifest, permissions 0600).
3. Registers the job with the OS scheduler (launchd / systemd --user / schtasks). The OS job calls `oma schedule:run <id>` at the configured interval.

**Examples:**
```bash
# Exact cron: weekdays at 9 AM
oma schedule:add qa-reviewer "Run QA review on latest changes" --cron "0 9 * * 1-5"

# Natural language: every 2 hours
oma schedule:add backend "Check for slow queries" --every "2h"

# One-shot, pinned vendor and workspace
oma schedule:add pm "Generate sprint plan" --cron "0 9 * * 1" --once -m claude -w /path/to/project

# Capture specific env vars for the job
oma schedule:add backend "Sync external data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

See the [Scheduled Agents guide](../guide/scheduled-agents.md) for a full walkthrough.

### schedule:list

List all scheduled jobs across all projects, grouped by project, with OS drift state.

```
oma schedule:list [--json]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--json` | Output as JSON |

**Drift states:** `synced` (manifest + OS agree), `missing-in-os` (run `schedule:sync` to repair), `orphan-in-os` (OS has a job not in manifest; run `schedule:sync --prune` to remove).

**Examples:**
```bash
oma schedule:list
oma schedule:list --json | jq '.jobs[] | select(.drift != "synced")'
```

### schedule:remove

Remove a scheduled job from both the manifest and the OS scheduler.

```
oma schedule:remove <id>
```

**Arguments:**

| Argument | Required | Description |
|:---------|:---------|:-----------|
| `id` | Yes | Job ID from `schedule:list` (format: `sch_<base32-12>`) |

**Example:**
```bash
oma schedule:remove sch_abc123def456
```

### schedule:run

Execute a scheduled job by ID. This is the entry point called by the OS scheduler at fire time. Not normally invoked by hand, but can be used to debug a job.

```
oma schedule:run <id>
```

**What it does:**
1. Looks up `<id>` in the manifest (exits non-zero if not found).
2. Loads captured env vars from `~/.agents/schedule/env/<id>` and injects them.
3. Calls `oma agent:spawn <agentId> <prompt> <sessionId> -m <vendor> -w <workspace>`.
4. Writes the result to `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Updates `lastFiredAt` in the manifest; self-removes if job is `--once`.
6. Loud-fails on auth expiry: exits non-zero and prints `re-auth required: <vendor>` to stderr. Never silently succeeds.

**Example:**
```bash
# Invoke manually to debug a job
oma schedule:run sch_abc123def456
```

### schedule:sync

Re-synchronize the manifest to the OS scheduler. Repairs drift after system migrations or OS scheduler resets.

```
oma schedule:sync [--prune]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--prune` | Also remove OS jobs not present in the manifest (orphan-in-os). Without `--prune`, orphans are reported but not removed. |

**Examples:**
```bash
# Repair missing-in-os jobs
oma schedule:sync

# Repair missing-in-os AND remove orphans
oma schedule:sync --prune
```

---

## Memory management

### memory:init

Initialize the coordination memory store schema.

```
oma memory:init [--json] [--output <format>] [--force]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--json` | Output as JSON |
| `--output <format>` | Output format (`text` or `json`) |
| `--force` | Overwrite empty or existing schema files |

**What it does:** Creates the `.agents/state/memories/` directory structure with initial schema files that agents and workflows use for reading and writing coordination state.

**Examples:**
```bash
# Initialize memory
oma memory:init

# Force overwrite existing schema
oma memory:init --force
```

---

## Integration & utilities

### auth:status

Check authentication status of all supported CLIs.

```
oma auth:status [--json] [--output <format>]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--json` | Output as JSON |
| `--output <format>` | Output format (`text` or `json`) |

**Checks:** GitHub CLI (`gh`), Antigravity CLI (`agy`), Gemini CLI, Claude CLI, Codex CLI, Cursor CLI, Qwen CLI.

**Examples:**
```bash
oma auth:status
oma auth:status --json
```

### bridge

Proxy MCP stdio onto a shared per-project Serena server.

```
oma bridge [url] [--context <name>]
```

**Arguments:**

| Argument | Required | Description |
|:---------|:---------|:-----------|
| `url` | No | Connect to a caller-managed endpoint instead of resolving a shared daemon |
| `--context` | No | Serena context for the daemon (default `ide`); daemons are keyed by it |

**What it does:** This is what every vendor's serena MCP entry runs by default —
you do not invoke it by hand. Serena's stdio transport gives each agent session
its own Python process plus a full language-server stack, so the cost scales
with the number of open sessions. The bridge collapses that to one server per
project: it resolves the project root from the working directory, starts a
`--project`-pinned Serena HTTP server if none is running, and proxies the
session onto it.

Pinning `--project` matters — a server started without it exposes the
`activate_project` tool, letting any session swap the project out from under
every other one.

**Architecture:**
```
session A --stdio--> oma bridge --.
                                   >-- HTTP --> one Serena server (+ LSPs)
session B --stdio--> oma bridge --'
```

**Lifecycle:** the first session starts the server, later ones reuse it, and
each proxy registers itself as a client. When the last session detaches the
server is kept warm for 10 minutes — a restart re-attaches — and is otherwise
shut down by the next bridge to start. If the shared server cannot be reached,
the proxy falls back to a session-local stdio serena.

Opt out with `serena.mode: stdio` in `.agents/oma-config.yaml`.

**Example:**
```bash
# Connect to a server you manage yourself
oma bridge http://localhost:12341/mcp
```

### verify

Verify subagent output against expected criteria.

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

**Arguments:**

| Argument | Required | Description |
|:---------|:---------|:-----------|
| `agent-type` | Yes | One of: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**Options:**

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `-w, --workspace <path>` | Workspace path to verify | Current directory |
| `--json` | Output as JSON | |
| `--output <format>` | Output format (`text` or `json`) | |

**What it does:** Runs the verification script for the specified agent type, checking build success, test results, and scope compliance.

**Common checks (all agent types):**
- **Scope Check**: Reads `.agents/results/plan-{sessionId}.json` task scopes. Compares `git diff` changed files against defined scope patterns. Fails if files are modified outside the agent's assigned scope.
- **Charter Preflight**: Verifies `result-{agent}.md` contains a properly filled `CHARTER_CHECK:` block with no unfilled placeholders.
- **Hardcoded Secrets**: Scans `.py`, `.ts`, `.tsx`, `.js`, `.dart` files for patterns like `password = "..."`, `api_key = "..."` (excludes test/example files).
- **TODO/FIXME Comments**: Counts `TODO`, `FIXME`, `HACK`, `XXX` comments (warns if any found).

**Agent-specific checks:**

| Agent Type | Additional Checks |
|:-----------|:-----------------|
| `backend` | Python syntax validation (`py_compile`), SQL injection detection (f-string + SQL keywords), Python test execution (`pytest`) |
| `frontend` | TypeScript compilation (`tsc --noEmit`), inline style detection (`style={{`), `any` type usage (fails if > 3), frontend tests (`vitest`) |
| `mobile` | Flutter/Dart analysis (`flutter analyze` or `dart analyze`), Flutter tests (`flutter test`) |
| `qa` | Self-check verification |
| `debug` | Runs Python tests or frontend tests based on detected project type |
| `pm` | Validates `.agents/results/plan-{sessionId}.json` exists and is valid JSON |

**Output format:**
Each check reports `PASS`, `FAIL`, `WARN`, or `SKIP` with a detail message. Overall result is `ok: true` only if zero checks fail.

**Examples:**
```bash
# Verify backend output in default workspace
oma verify backend

# Verify frontend in specific workspace
oma verify frontend -w ./apps/web

# JSON output for CI
oma verify backend --json
```

### hook

Dispatch a vendor hook event through the centralised oma hook router (design 019). This is the canonical ABI invoked by every vendor's generated `oma-hook.sh` wrapper. It can also be used directly to debug or test handler chains in isolation.

```
oma hook --vendor <v> --event <nativeEvent> [--matcher <tool>]
```

**Options:**

| Flag | Required | Description |
|:-----|:---------|:-----------|
| `--vendor <v>` | Yes | Vendor identity. One of: `claude`, `codex`, `cursor`, `gemini`, `grok`, `kiro`, `qwen`, `antigravity`. (The `pi` vendor is **not** valid here — it uses the in-process `installPiExtension` bridge instead of `oma hook`.) |
| `--event <e>` | Yes | Native hook event name as registered in the vendor settings (e.g. `UserPromptSubmit`, `PreToolUse`, `Stop`) |
| `--matcher <m>` | No | Optional tool name / matcher forwarded from the hook registration (e.g. `Bash`) |

**Stdin / stdout contract:**
- **stdin**: vendor-native JSON payload (the same object the vendor passes to hook processes).
- **stdout**: vendor-dialect JSON (or plain text for kiro prompts) when a handler fires; empty when no handler produces output.
- **exit code**: always `0` (fail-open — errors are written to stderr and the agent is never blocked).

**Runtime data flow:**
```
vendor fires: oma-hook.sh --vendor claude --event UserPromptSubmit
  stdin: {"prompt":"...","cwd":"/project","sessionId":"..."}
  → oma hook resolves handler chain from .agents/hooks/variants/claude.json
  → runs: keyword-detector → state-boundary → skill-injector (in-process)
  → merges HandlerResult values (context: concat; pre_tool: last mutate wins; stop: any block)
  → emits vendor dialect to stdout
  → exit 0
```

**Debugging handler chains in isolation:**

```bash
# Test what keyword-detector injects for a given prompt (Claude)
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook --vendor claude --event UserPromptSubmit

# Test a Bash pre_tool block (Claude)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement (Codex)
echo '{"cwd":"/path/to/project"}' \
  | oma hook --vendor codex --event Stop

# Test a Gemini BeforeTool event
echo '{"tool_name":"run_shell_command","tool_input":{"command":"cat /etc/passwd"},"cwd":"/path/to/project"}' \
  | oma hook --vendor gemini --event BeforeTool
```

Empty stdout means the chain produced a no-op for that event. A JSON object on stdout is the vendor dialect the agent session would receive.

**Scope notes:**
- `statusLine`/hud entries are not routed through `oma hook` (hot-path display stays on a direct `bun` path).
- The pi vendor uses its in-process `installPiExtension` bridge, not `oma hook`.
- The daemon socket path (`SocketTransport`) is a future phase; the current transport is always in-process.

See `cli/commands/hook/command.ts` for the router implementation (internally referred to as "design 019") and `cli/commands/hook/probe/` for the per-vendor compatibility matrix.

**Examples:**
```bash
# Inspect Claude keyword-detection output for a real prompt
echo '{"prompt":"plan the new checkout feature","cwd":"'$(pwd)'"}' \
  | oma hook --vendor claude --event UserPromptSubmit

# Verify a Qwen Stop event fires the persistent-mode block
echo '{"cwd":"'$(pwd)'"}' | oma hook --vendor qwen --event Stop

# Check Gemini hook output format
echo '{"prompt":"brainstorm","cwd":"'$(pwd)'"}' \
  | oma hook --vendor gemini --event BeforeAgent
```

---

### hook:probe

Probe per-vendor hook compatibility and print a coverage matrix.

```
oma hook:probe [--vendor <list>] [--format <fmt>] [--hooks-dir <dir>]
```

**Options:**

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--vendor <list>` | Comma-separated vendors to probe | All supported vendors |
| `--format <fmt>` | Output format: `text`, `md`, or `json` | `text` |
| `--hooks-dir <dir>` | Override the `.agents/hooks/core` directory | Auto-detected |

**What it checks:** For each vendor, probes whether the core hook scripts (`keyword-detector`, `persistent-mode`, etc.) are present and whether the variant JSON maps events correctly to handler chains. Exit code `1` if any vendor reports `failed` status.

**Examples:**
```bash
# Text matrix for all vendors
oma hook:probe

# Markdown matrix (useful in CI PR comments)
oma hook:probe --format md

# JSON for programmatic consumption
oma hook:probe --format json | jq '.results[] | select(.status == "failed")'

# Probe a subset of vendors
oma hook:probe --vendor claude,codex,gemini
```

---

### vault

Manage API keys and other secrets in the OS keychain (macOS Keychain, Linux Secret Service, or Windows Credential Manager), backed by `@napi-rs/keyring`. Values never appear in shell history or environment files; only key names are tracked in `~/.config/oma/vault-index.json` so `oma vault list` can enumerate without exposing secret values.

```
oma vault store <name> [--value <value>]
oma vault get <name>
oma vault list [--json]
oma vault rm <name>
```

**Sub-commands:**

| Sub-command | Description |
|:------------|:-----------|
| `store <name>` | Prompts for a secret value (hidden input) and writes it under `name` in the OS keychain. `--value <value>` accepts the value inline for non-interactive use (visible in shell history; prefer the prompt). |
| `get <name>` | Prints the stored value to stdout with no decoration so it can be used inside shells: `export ANTHROPIC_API_KEY=$(oma vault get anthropic)`. Exits with code `2` when the key does not exist. |
| `list` | Lists stored key names with their `createdAt` timestamps. Values are never displayed. |
| `rm <name>` | Removes the secret from the keychain and the index. |

**Key name rules:** 1-64 characters from `[A-Za-z0-9._-]`. Examples: `anthropic`, `openai-prod`, `github_pat`, `sentry.dsn`.

**Native dependency:** The `@napi-rs/keyring` native module is loaded lazily; if it fails to load (for example, headless Linux without `libsecret` or `gnome-keyring`), the command surfaces an explicit error with an install hint instead of falling back silently.

**Examples:**
```bash
# Store with a hidden interactive prompt
oma vault store anthropic

# Non-interactive (note: value is visible in shell history)
oma vault store openai --value sk-test-...

# Use in a shell pipeline
export ANTHROPIC_API_KEY=$(oma vault get anthropic)
oma agent:spawn backend "Refactor /api/auth" session-20260517-150000

# List entries (names only)
oma vault list

# Remove
oma vault rm anthropic
```

### cleanup

Clean up orphaned subagent processes and temp files.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--dry-run` | Show what would be cleaned without making changes |
| `-y, --yes` | Skip confirmation prompts and clean everything |
| `--json` | Output as JSON |
| `--output <format>` | Output format (`text` or `json`) |

**What it cleans:**
- Orphaned PID files in the system temp directory (`/tmp/subagent-*.pid`).
- Orphaned log files (`/tmp/subagent-*.log`).
- **Orphaned Serena language servers** — when an MCP client (e.g. Claude) exits, its `serena start-mcp-server` reparents to init and its LSP children (`tsserver`, `pyright`, …, hundreds of MB) keep running with no client. These are reaped here. The *idle-but-still-attached* case is handled separately by [`serena reap`](#serena).
- Gemini Antigravity directories (brain, implicit, knowledge) under `.gemini/antigravity/`.

**Examples:**
```bash
# Preview what would be cleaned
oma cleanup --dry-run

# Clean with confirmation prompts
oma cleanup

# Clean everything without prompts
oma cleanup --yes

# JSON output for automation
oma cleanup --json
```

### serena

Reclaim memory from Serena's per-project language servers. Serena spawns an LSP
stack (`tsserver`, `pyright`, …, ~300 MB) per open project and keeps it warm for
the whole session — with several projects open this adds up. The reaper kills
idle LSP children; Serena self-heals and respawns them on the next tool call (no
restart needed).

```
oma serena reap [--dry-run] [--quiet]
oma serena reaper:enable [--dry-run]
oma serena reaper:disable [--dry-run]
```

**Subcommands:**

| Command | Description |
|:--------|:-----------|
| `serena reap` | Reap idle LSPs once now. Interactive runs always execute; `--quiet` (the scheduled path) honors the `enabled` opt-in. |
| `serena reap --dry-run` | Preview reap targets and projected freed memory — never kills. |
| `serena reaper:enable` | Install a background task that runs `serena reap --quiet` every 5 minutes (launchd / systemd timer / Windows Task Scheduler). |
| `serena reaper:disable` | Remove the background task. |

**Policy:** `lru` (default) keeps the `keepWarm` most-recently-active projects
warm and reaps the rest; `idle` reaps any project idle past `idleMinutes`. A
`graceSeconds` window protects in-flight tool calls.

**Configuration** (`.agents/oma-config.yaml`, opt-in — disabled by default):

```yaml
serena_reaper:
  enabled: false     # gates the scheduled (--quiet) path; interactive reap always runs
  policy: lru        # lru | idle
  keepWarm: 2        # LRU: keep this many most-recently-active projects warm
  idleMinutes: 10    # idle threshold / LRU secondary floor
  graceSeconds: 90   # in-flight protection; SIGTERM→SIGKILL window
```

Diagnostics (per-project KEEP/REAP state and the activity signal source) are
shown by [`oma doctor`](#doctor). Orphaned (dead-client) Serena LSPs are reaped
by [`oma cleanup`](#cleanup) regardless of this setting.

**Examples:**
```bash
# See what would be reclaimed across all open projects
oma serena reap --dry-run

# Reap idle LSPs once, right now
oma serena reap

# Turn on automatic 5-minute background reaping
#   (set serena_reaper.enabled: true in oma-config.yaml first)
oma serena reaper:enable

# Turn it back off
oma serena reaper:disable
```

### visualize

Visualize project structure as a dependency graph.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` is a built-in alias for `visualize`.

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--json` | Output as JSON |
| `--output <format>` | Output format (`text` or `json`) |

**What it does:** Analyzes the project structure and generates a dependency graph showing relationships between skills, agents, workflows, and shared resources.

**Examples:**
```bash
oma visualize
oma viz --json
```

### search

Mechanical search primitives covering fetch, metadata, RSS, media, code, and trust scoring. Aliased as `oma s`. All subcommands output JSON to stdout (one object per line, or pretty-printed with `--pretty`).

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**Subcommands:**

| Subcommand | Purpose |
|:-----------|:--------|
| `fetch <url>` | Fetch URL via auto-escalating strategy pipeline (api → probe → impersonate → browser → archive) |
| `api <url>` | Fetch via matched platform API handler (Phase 0) |
| `api:search <query>` | Fan-out keyword search across platforms that support it (`--platforms <list>`) |
| `meta <url>` | Extract OGP / JSON-LD / Schema.org metadata |
| `rss <url>` | Discover and parse RSS / Atom feed |
| `rss:google <query>` | Build a Google News RSS URL for a query |
| `media <url>` | Extract media metadata via `yt-dlp` (1858 sites) |
| `archive <url>` | Fetch via AMP / archive.today / Wayback fallback |
| `trust <domain>` | Resolve trust level / score for a domain |
| `code <query>` | Search code via `gh` (GitHub) or `glab` (GitLab) |
| `doctor` | Check dependencies (Chrome, `python3` + `curl_cffi`, `yt-dlp`, `gh`) |

**Common options on URL/query subcommands:**

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--timeout <seconds>` | Per-strategy timeout | `15` (`30` for `media`) |
| `--locale <value>` | `Accept-Language` header | `en-US,en;q=0.9` |
| `--pretty` | Pretty-print JSON output | `false` |

**`fetch` extras:**

| Flag | Description |
|:-----|:-----------|
| `--only <strategies>` | Comma-separated strategies to run (`api,probe,impersonate,browser,archive`) |
| `--skip <strategies>` | Comma-separated strategies to skip |
| `--include-archive` | Append archive strategy as a last fallback |

**`media` extras:**

| Flag | Description |
|:-----|:-----------|
| `--subs` | Write subtitles |
| `--sub-lang <list>` | Subtitle languages, comma-separated (default: `en`) |
| `--format <spec>` | yt-dlp format spec |

**`code` extras:**

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` | Host | `github` |
| `--language <lang>` | Language filter | |
| `--repo <owner/repo>` | Scope to a repo | |
| `--limit <n>` | Max results | `20` |

**Exit codes:** `0` ok, `1` error, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout.

**Examples:**

```bash
# Auto-escalating fetch
oma search fetch https://example.com/article --pretty

# Force a single strategy
oma search fetch https://example.com --only browser

# Cross-platform keyword search via API handlers
oma search api:search "RAG patterns" --platforms hackernews,reddit

# Find a repo's trust score
oma search trust github.com

# Code search (defaults to GitHub)
oma search code "useEffect cleanup" --language ts --limit 10

# Verify your local dependencies
oma search doctor
```

### image

Multi-vendor AI image generation with authentication-aware parallel dispatch. Aliased as `oma img`.

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**Subcommands:**

| Subcommand | Purpose |
|:-----------|:--------|
| `generate <prompt...>` | Generate images via `pollinations` (flux/zimage, free), `codex` (gpt-image-2 via ChatGPT OAuth), or `antigravity` (nano-banana via Gemini Code Assist subscription, keyless) |
| `doctor` | Check authentication and install status per vendor |
| `list-vendors` | List registered vendors and supported models |

**`image generate` options:**

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `gemini` \| `all` | `auto` |
| `--size <size>` | `1024x1024` \| `1024x1536` \| `1536x1024` \| `auto` | vendor default |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | vendor default |
| `-n, --count <n>` | Number of images (1..5) | `1` |
| `--out <dir>` | Output directory | `.agents/results/images/{timestamp}/` |
| `--allow-external-out` | Allow `--out` paths outside `$PWD` | `false` |
| `--model <name>` | Vendor-specific model override | |
| `--strategy <list>` | Gemini fallback order, comma-separated (`mcp,stream,api`) | |
| `--timeout <seconds>` | Per-image timeout | vendor default |
| `-r, --reference <path>` | Reference image(s); repeatable (`-r a.png -r b.png`) or comma-separated. Supported on `codex` and `gemini`; rejected on `pollinations`. Each ≤5MB PNG/JPEG/GIF/WebP (magic-byte validated), max 10. | |
| `-y, --yes` | Skip cost confirmation | `false` |
| `--no-prompt-in-manifest` | Store SHA256 of prompt instead of raw text | `false` |
| `--dry-run` | Print plan and cost estimate; do not execute | `false` |
| `--format <format>` | CLI output format: `text` \| `json` | `text` |

Each run writes a `manifest.json` next to the generated images recording vendor, model, prompt (or hash), size, quality, and cost.

**Examples:**

```bash
# Free, no-config generation
oma image generate "minimalist sunrise over mountains"

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# All vendors in parallel for comparison
oma image generate "cat astronaut" --vendor all

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Use a reference image to guide style / subject (codex or gemini)
oma image generate "same otter in dramatic lighting" --vendor codex -r ~/Downloads/otter.jpeg

# Multiple references (repeatable or comma-separated)
oma image generate "blend these styles" --vendor gemini -r a.png -r b.png
oma image generate "blend these styles" --vendor gemini -r a.png,b.png

# Per-vendor doctor check
oma image doctor --format json
```

### star

Star oh-my-agent on GitHub.

```
oma star
```

No options. Requires `gh` CLI to be installed and authenticated. Stars the `first-fluke/oh-my-agent` repository.

**Example:**
```bash
oma star
```

### describe

Describe CLI commands as JSON for runtime introspection.

```
oma describe [command-path]
```

**Arguments:**

| Argument | Required | Description |
|:---------|:---------|:-----------|
| `command-path` | No | The command to describe. If omitted, describes the root program. |

**What it does:** Outputs a JSON object with the command's name, description, arguments, options, and subcommands. Used by AI agents to understand available CLI capabilities.

**Examples:**
```bash
# Describe all commands
oma describe

# Describe a specific command
oma describe agent:spawn

# Describe a subcommand
oma describe "agent:parallel"
```

---

## Skill management

### skills audit

Check installed skills for overlapping descriptions, black-hole generalism, and library-size routing decay.

```
oma skills audit [--json] [--output <format>]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--json` | Output as JSON for CI/CD |
| `--output <format>` | Output format (`text` or `json`) |

**What it checks:**
- **Pairwise description similarity**: TF-IDF cosine similarity between every pair of installed skills. Warns at ≥ 60%, fails at ≥ 75%.
- **Black-hole detection**: flags any skill whose mean similarity to all others is a positive outlier (≥ mean + 1.5 × stddev), indicating an over-generic description that could hijack routing.
- **Library-size decay**: warns when more than 60 skills are installed (routing accuracy decays logarithmically as the library grows).
- **Focus check**: warns when a skill sprawls into a bundle — more than 20 reference docs (`.md` files besides `SKILL.md`, vendored trees excluded) or a `SKILL.md` body over 25,000 chars. Focused skills outperform bundles (SkillsBench, arXiv:2602.12670); the fix is splitting, not deleting.

**Exit codes:** `0` all findings in warn band or none; `1` at least one fail-band pair.

**Examples:**
```bash
oma skills audit
oma skills audit --json | jq '.findings'
```

### skills lint

Detect per-skill authoring smells: quality defects inside a single `SKILL.md`, as opposed to `skills audit` which checks relations *between* skills. Based on the skill-smell taxonomy of arXiv:2607.01456 (over 99% of in-the-wild SKILL.md files carry at least one smell).

```
oma skills lint [--skill <id>] [--json] [--output <format>]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--skill <id>` | Lint a single skill |
| `--json` | Output as JSON for CI/CD |
| `--output <format>` | Output format (`text` or `json`) |

**Generic smells (every skill):**

| Smell | Severity | Meaning |
|:------|:---------|:--------|
| `missing-name` | fail | frontmatter `name` absent or empty |
| `missing-description` | fail | frontmatter `description` absent or empty — routing depends on it |
| `weak-description` | warn | description under 40 chars — too thin to route on |
| `body-too-long` | warn | SKILL.md body over 500 lines — move detail into `resources/` behind progressive disclosure |
| `template-placeholder` | warn | leftover `{Placeholder}` text outside code spans |
| `broken-reference` | fail | references a `resources/`, `config/`, `scripts/`, or `assets/` file that does not exist |

**SSL-lite smells** (only for skills that opt into the format, i.e. have a `## Scheduling` heading — third-party skills are not held to it):

| Smell | Severity | Meaning |
|:------|:---------|:--------|
| `ssl-structure` | fail | top-level sections deviate from `Scheduling / Structural Flow / Logical Operations / References` |
| `canonical-path` | fail | not exactly one `### Canonical command path` or `### Canonical workflow path` |
| `missing-boundaries` | warn | no `### When NOT to use` — boundary-less skills hijack routing |
| `empty-failure-recovery` | warn | `### Failure and recovery` missing or empty (accepts bullets or table rows) — encode failure mechanisms per SkillLens |

**Exit codes:** `0` no fail-severity smells; `1` at least one fail smell.

**Examples:**
```bash
oma skills lint
oma skills lint --skill oma-scholar
oma skills lint --json | jq '.smells'
```

### skills eval

Measure per-skill utility: does loading a skill actually improve held-out task outcomes? This is the *utility* counterpart to `skills audit` (which measures description-boundary overlap). Where `audit` asks "are two skills redundant?", `eval` asks "does this skill help?"

```
oma skills eval [--skill <id>] [--mock | --live] [--record] [--yes]
                [--task-dir <path>] [--max-tasks <n>] [--require-coverage]
                [--json] [--output <format>]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--skill <id>` | Skill ID to evaluate (simple name, no path separators). Defaults to `_all`. |
| `--mock` | Replay recorded rollouts from `_rollouts/` (default; deterministic, no LLM dispatch). Safe for CI. |
| `--live` | Live agent dispatch — spawns two arms (baseline and treatment) per task via `oma agent:spawn --read-only`. Prints a cost preview and asks for confirmation unless `--yes`. |
| `--record` | Write captured live rollouts (including judge verdicts) to `_rollouts/` for future `--mock` replay. Only meaningful with `--live`. |
| `--yes` | Skip the cost-preview confirmation prompt. Only meaningful with `--live`. |
| `--task-dir <path>` | Override the task fixture directory (must be inside the workspace root). Default: `.agents/eval/<skill>/`. |
| `--max-tasks <n>` | Cap number of tasks evaluated (applied in deterministic sort order). |
| `--require-coverage` | Exit non-zero when fewer than 5 tasks are found (prevents silent green in CI). |
| `--json` | Output as JSON for CI/CD |
| `--output <format>` | Output format (`text` or `json`) |

**How it works:**

For each task fixture in `.agents/eval/<skill>/`:
1. **Baseline arm** — the task prompt is dispatched without the skill loaded.
2. **Treatment arm** — `SKILL.md` is prepended to the prompt, then dispatched.
3. Each arm is scored by its checker (judge by default; assert or regex for deterministic opt-ins).
4. `utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)`.

**Decisions:**

| Decision | Condition |
|:---------|:---------|
| `pass` | `utilityLift ≥ 5%` |
| `warn` | `0% < utilityLift < 5%` |
| `fail` | `utilityLift ≤ 0%` (exit code 1) |
| `insufficient` | Fewer than 5 scoreable tasks (exit code 1 only with `--require-coverage`) |

**Honesty note:** `--mock` without recorded judge verdicts is a *measurement substrate*, not a trustworthy utility score. A meaningful number requires `--live` with judge checkers (the judge calls the LLM to grade each arm output against a rubric, then records the verdict so `--mock` replay is fully deterministic and offline). This mirrors how the academic benchmarks behind this feature score utility (SkillOpt arXiv:2605.23904, SkillLens arXiv:2605.23899).

**Environment variable:** `OMA_SKILLEVAL_MOCK=1` forces mock mode regardless of flags.

**Exit codes:** `0` pass or warn; `1` fail or insufficient-with-`--require-coverage`.

**Examples:**
```bash
# Dry-run on recorded rollouts (CI-safe)
oma skills eval --skill oma-scholar

# Live run with cost preview
oma skills eval --skill oma-scholar --live

# Live run, record results for future mock replay, skip prompt
oma skills eval --skill oma-scholar --live --record --yes

# JSON output for CI
oma skills eval --skill oma-scholar --json

# Fail CI when no tasks exist
oma skills eval --skill oma-scholar --require-coverage

# Limit to 10 tasks
oma skills eval --skill oma-scholar --max-tasks 10
```

See the [Skill Utility Eval guide](../guide/skill-eval.md) for the `.agents/eval/` fixture format and checker types.

---

### skills opt

Optimize a skill's `SKILL.md` to maximize its measured held-out utility lift. An optimizer LLM proposes bounded add/delete/replace edits; each edit is applied to a candidate copy, re-scored by `skills eval` on the held-out validation split, and accepted only when the validation lift strictly improves. Research basis: SkillOpt (arXiv:2605.23904).

```
oma skills opt [--skill <id>] [--dry-run | --apply] [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes] [--json] [--output <format>]
```

**Options:**

| Flag | Default | Description |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | Skill ID to optimize (simple name, no path separators). |
| `--dry-run` | **yes (default)** | Propose edits and print the diff; write nothing. |
| `--apply` | — | Apply accepted edits; backs up the original as `SKILL.md.bak` and writes only a validated improvement. |
| `--mock` | **yes (default)** | Replay recorded optimizer edits and eval verdicts (deterministic, offline). Safe for CI. |
| `--live` | — | Live LLM optimizer dispatch — incurs real model calls per epoch. Prints a cost preview and prompts for confirmation unless `--yes`. |
| `--max-epochs <n>` | `8` | Maximum optimization epochs. |
| `--edits-per-epoch <k>` | `4` | Candidate edits proposed per epoch. |
| `--lr <chars>` | `600` | Textual learning-rate budget: maximum net character change per edit. |
| `--yes` | — | Skip cost-preview confirmation (only with `--live`). |
| `--json` | — | Output as JSON for CI/CD. |
| `--output <format>` | `text` | Output format (`text` or `json`). |

**Hard dependency:** Requires at least 5 task fixtures in `.agents/eval/<skill>/`. Errors with a clear message when fewer are found. See the [Skill Utility Eval guide](../guide/skill-eval.md) for authoring them.

**Train/val split:** The optimizer sees only the TRAIN tasks' findings when proposing edits; the accept gate scores on the held-out VALIDATION split (`OPT_TRAIN_VAL_SPLIT = 0.5`, 50/50 default). An edit that regresses on the validation split is always rejected.

**SSOT caveat:** Skills whose ID starts with `oma-` are overwritten by `oma update`. For those skills, `--apply` is discouraged — use the default `--dry-run` and upstream the proposed diff. User-authored skills apply freely.

**Exit codes:** `0` optimization completed; `1` insufficient fixtures or invalid argument.

**Examples:**
```bash
# Propose edits (dry-run, mock — writes nothing, fully offline)
oma skills opt --skill oma-scholar --mock --dry-run

# Apply accepted edits (backs up original first)
oma skills opt --skill oma-scholar --mock --apply

# Live optimizer with cost preview
oma skills opt --skill oma-scholar --live

# Live optimizer, skip confirmation, apply if improved
oma skills opt --skill oma-scholar --live --apply --yes

# JSON output for CI
oma skills opt --skill oma-scholar --json

# Tune epochs and edits budget
oma skills opt --skill oma-scholar --max-epochs 4 --edits-per-epoch 2 --lr 300
```

See the [Skill Optimization guide](../guide/skill-opt.md) for the full end-to-end walkthrough and SSOT / overfitting guard details.

---

### harness eval

Compare a candidate `.agents/` overlay with the current OMA harness on paired, isolated repository tasks. The target agent and vendor route stay fixed; deterministic checks score the files and output produced by each arm.

```
oma harness eval --suite <path> --candidate <path> [--mock | --live]
                 [--record] [--record-file <path>] [--yes]
                 [--timeout-minutes <n>] [--require-coverage]
                 [--json] [--output <format>]
```

| Flag | Description |
|:-----|:------------|
| `--suite <path>` | Required suite YAML. The suite and fixture workspaces must be inside the project root. |
| `--candidate <path>` | Required candidate root containing a scoped `.agents/` overlay. |
| `--mock` | Replay a hash-matching recorded run (default; deterministic and offline). |
| `--live` | Run baseline and candidate arms through the suite's target agent. |
| `--record` | Persist a live run for later mock replay. Requires `--live`. |
| `--record-file <path>` | Override the recording path; it must remain inside the project root. |
| `--yes` | Skip the live-run cost confirmation. |
| `--timeout-minutes <n>` | Per-arm timeout, identical for baseline and candidate. Default: `15`. |
| `--require-coverage` | Exit non-zero when fewer than five paired tasks are scoreable. |
| `--json` | Output the full evaluation as JSON. |
| `--output <format>` | Output format (`text` or `json`). |

**Decision gate:** pass requires at least 5 paired tasks, lift of at least 5 percentage points, and zero regressions. A regression always fails. Below-minimum coverage is `insufficient` and exits non-zero only with `--require-coverage`.

**Isolation:** candidate files can replace only `.agents/agents`, `.agents/rules`, `.agents/skills`, and `.agents/workflows` content in the temporary candidate arm. Hooks, config, state, eval fixtures, symlinks, vendor variants, protected agent execution frontmatter changes, and fixture-owned vendor harness files are rejected. An arm fails if it mutates protected definitions during execution. HOME-based vendor discovery is refused for live evaluation. The primary agent route is fixed; nested subagent model pinning is not yet enforced.

```bash
# Generate a live measurement and recording
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --live --record

# Replay the same measurement in CI
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --mock --require-coverage --json
```

See the [Harness Evaluation guide](../guide/harness-eval.md) for the suite schema, supported checks, isolation model, and current limitations.

---

### help

Show help information.

```
oma help
```

Displays the full help text with all available commands.

### version

Show the version number.

```
oma version
```

Outputs the current CLI version and exits.

---

## Environment variables

| Variable | Description | Used By |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Set to `json` to force JSON output on all commands that support it | All commands with `--json` flag |
| `DASHBOARD_PORT` | Port for the web dashboard | `dashboard:web` |
| `MEMORIES_DIR` | Override the memories directory path | `dashboard`, `dashboard:web` |
| `OMA_SKILLEVAL_MOCK` | Set to `1` to force mock mode in `oma skills eval` regardless of flags | `skills eval` |
| `OMA_HOOK_SOCKET` | Override the per-project daemon socket path probed by `selectTransport` (default: `<cwd>/.agents/.run/oma-hook.sock`). Currently always falls back to in-process transport; reserved for the future daemon phase. | `hook` |

---

## Aliases

| Alias | Full Command |
|:------|:------------|
| `viz` | `visualize` |
