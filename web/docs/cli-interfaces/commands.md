---
title: "CLI Commands"
description: Complete reference for every oh-my-agent CLI command — syntax, options, examples, organized by category.
---

# CLI Commands

After installing globally (`bun install --global oh-my-agent`), use `oma` or `oh-my-agent`. For one-time use without installing, run `npx oh-my-agent`.

The environment variable `OH_MY_AG_OUTPUT_FORMAT` can be set to `json` to force machine-readable output on commands that support it. This is equivalent to passing `--json` to each command.

---

## Setup & Installation

### oma (install)

The default command with no arguments launches the interactive installer.

```
oma [--update-defaults]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--update-defaults` | Overwrite `.agents/config/defaults.yaml` with the bundled version when a version mismatch is detected. User files (`oma-config.yaml`, `.agents/config/models.yaml`) are never touched. Introduced in cli@5.16.0. |

**What it does:**
1. Checks for legacy `.agent/` directory and migrates to `.agents/` if found.
2. Detects and offers to remove competing tools.
3. Prompts for project type (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. If backend is selected, prompts for language variant (Python, Node.js, Rust, Other).
5. Asks about GitHub Copilot symlinks.
6. Downloads the latest tarball from the registry.
7. Installs shared resources, workflows, configs, and selected skills.
8. Installs vendor adaptations for all 4 vendors (Claude, Codex, Gemini, Qwen).
9. Applies recommended Claude Code settings (`~/.claude/settings.json`) when Claude Code is detected.
10. Creates CLI symlinks.
11. Offers to enable `git rerere`.
12. Offers to configure MCP for Antigravity IDE and Gemini CLI.
13. Prompts for GitHub star if `gh` is authenticated.

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
| `--profile` | Show profile health matrix — resolves `agent_cli_mapping` through `runtime_profiles`, displays the active slug, CLI, and auth status per agent. Introduced in cli@5.16.0. See [Per-Agent Models](../guide/per-agent-models.md). |

**What it checks:**
- CLI installations: gemini, claude, codex, qwen (version and path).
- Authentication status for each CLI.
- MCP configuration: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Installed skills: which skills are present and their status.
- Serena memory directory: `.serena/memories/` existence and file count.
- Global workflows: checks `~/.gemini/antigravity/global_workflows/` installation status.
- Git rerere: whether `rerere.enabled` is configured globally.
- Claude Code recommended settings: checks `~/.claude/settings.json` for optimal configuration:
- `cleanupPeriodDays >= 180` (preserve conversation history)
- `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS >= 100000`
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE >= 80`
- `DISABLE_TELEMETRY`, `DISABLE_ERROR_REPORTING`, `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` set to `"1"`
- Attribution strings for commits and PRs
- User-level CLAUDE.md: checks `~/.claude/CLAUDE.md` contains the OMA integration block (`<!-- OMA:START`).

**Auto-repair:** If missing skills or settings are detected, `doctor` offers to install them interactively. For Claude Code settings, it can apply recommended values automatically.

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
oma update [-f | --force] [--ci]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `-f, --force` | Overwrite user-customized config files (`oma-config.yaml`, `mcp.json`, `stack/` directories) |
| `--ci` | Run in non-interactive CI mode (skip prompts, plain text output) |

**What it does:**
1. Fetches `prompt-manifest.json` from the registry to check the latest version.
2. Compares with the local version in `.agents/skills/_version.json`.
3. If already up to date, exits.
4. Downloads and extracts the latest tarball.
5. Preserves user-customized files (unless `--force`).
6. Copies new files over `.agents/`.
7. Restores preserved files.
8. Updates vendor adaptations and refreshes symlinks.

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
```

### link

Regenerate vendor-native files from the `.agents/` source of truth without reinstalling.

```
oma link [vendors...]
```

**Examples:**

```bash
# Regenerate all configured vendors
oma link

# Regenerate only Claude and Codex files
oma link claude codex
```

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

The `/setup` workflow (invoked inside an agent session) provides interactive configuration of language, CLI installations, MCP connections, and agent-CLI mapping. This is different from `oma` (the installer) — `/setup` configures an already-installed instance.
---

## Monitoring & Metrics

### dashboard

Start the terminal dashboard for real-time agent monitoring.

```
oma dashboard
```

No options. Watches `.serena/memories/` in the current directory. Renders a box-drawing UI with session status, agent table, and activity feed. Updates on every file change. Press `Ctrl+C` to exit.

The memories directory can be overridden with the `MEMORIES_DIR` environment variable.

**Example:**
```bash
# Standard usage
oma dashboard

# Custom memories directory
MEMORIES_DIR=/path/to/.serena/memories oma dashboard
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
| `MEMORIES_DIR` | `{cwd}/.serena/memories` | Path to the memories directory |

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

## Agent Management

### agent:spawn

Spawn a subagent process.

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
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
| `-m, --model <vendor>` | CLI vendor override: `gemini`, `claude`, `codex`, `qwen` |
| `-w, --workspace <path>` | Working directory for the agent. Auto-detected from monorepo config if omitted. |

**Vendor resolution order:** `--model` flag > `agent_cli_mapping` in oma-config.yaml > `default_cli` > `active_vendor` in cli-config.yaml > `gemini`.

**Prompt resolution:** If the prompt argument is a path to an existing file, the file contents are used as the prompt. Otherwise, the argument is used as inline text. Vendor-specific execution protocols are appended automatically.

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
- `completed` — Result file exists (with optional status header).
- `running` — PID file exists and process is alive.
- `crashed` — PID file exists but process is dead, or no PID/result file found.

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
| `--no-wait` | Background mode — start agents and return immediately |

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

Run a code review using an external AI CLI (codex, claude, gemini, or qwen).

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `-m, --model <vendor>` | CLI vendor to use: `codex`, `claude`, `gemini`, `qwen`. Defaults to resolved vendor from config. |
| `-p, --prompt <prompt>` | Custom review prompt. If omitted, a default code review prompt is used. |
| `-w, --workspace <path>` | Path to review. Defaults to the current working directory. |
| `--no-uncommitted` | Skip uncommitted changes review. When set, only committed changes in the session are reviewed. |

**What it does:**
- Detects the current session ID automatically from the environment or recent git activity.
- For `codex`: uses the native `codex review` subcommand.
- For `claude`, `gemini`, `qwen`: constructs a prompt-based review request and invokes the CLI with the review prompt.
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

---

## Memory Management

### memory:init

Initialize the Serena memory schema.

```
oma memory:init [--json] [--output <format>] [--force]
```

**Options:**

| Flag | Description |
|:-----|:-----------|
| `--json` | Output as JSON |
| `--output <format>` | Output format (`text` or `json`) |
| `--force` | Overwrite empty or existing schema files |

**What it does:** Creates the `.serena/memories/` directory structure with initial schema files that the MCP memory tools use for reading and writing agent state.

**Examples:**
```bash
# Initialize memory
oma memory:init

# Force overwrite existing schema
oma memory:init --force
```

---

## Integration & Utilities

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

**Checks:** GitHub CLI (`gh`), Gemini CLI, Claude CLI, Codex CLI, Qwen CLI.

**Examples:**
```bash
oma auth:status
oma auth:status --json
```

### bridge

Bridge MCP stdio to Streamable HTTP transport.

```
oma bridge [url]
```

**Arguments:**

| Argument | Required | Description |
|:---------|:---------|:-----------|
| `url` | No | The Streamable HTTP endpoint URL (e.g., `http://localhost:12341/mcp`) |

**What it does:** Acts as a protocol bridge between MCP stdio transport (used by Antigravity IDE) and Streamable HTTP transport (used by Serena MCP server). This is required because Antigravity IDE does not support HTTP/SSE transports directly.

**Architecture:**
```
Antigravity IDE <-- stdio --> oma bridge <-- HTTP --> Serena Server
```

**Example:**
```bash
# Bridge to local Serena server
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

## Environment Variables

| Variable | Description | Used By |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Set to `json` to force JSON output on all commands that support it | All commands with `--json` flag |
| `DASHBOARD_PORT` | Port for the web dashboard | `dashboard:web` |
| `MEMORIES_DIR` | Override the memories directory path | `dashboard`, `dashboard:web` |

---

## Aliases

| Alias | Full Command |
|:------|:------------|
| `viz` | `visualize` |
