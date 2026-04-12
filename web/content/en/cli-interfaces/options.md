---
title: "CLI Options"
description: Exhaustive reference for all CLI options — global flags, output control, per-command options, and real-world usage patterns.
---

# CLI Options

## Global Options

These options are available on the root `oma` / `oh-my-agent` command:

| Flag | Description |
|:-----|:-----------|
| `-V, --version` | Output the version number and exit |
| `-h, --help` | Display help for the command |

All subcommands also support `-h, --help` to show their specific help text.

---

## Output Options

Many commands support machine-readable output for CI/CD pipelines and automation. There are three ways to request JSON output, in priority order:

### 1. --json Flag

```bash
oma stats --json
oma doctor --json
oma cleanup --json
```

The `--json` flag is the simplest way to get JSON output. Available on: `doctor`, `stats`, `retro`, `cleanup`, `auth:status`, `memory:init`, `verify`, `visualize`.

### 2. --output Flag

```bash
oma stats --output json
oma doctor --output text
```

The `--output` flag accepts `text` or `json`. It provides the same functionality as `--json` but also lets you explicitly request text output (useful when the environment variable is set to json but you want text for a specific command).

**Validation:** If an invalid format is provided, the CLI throws: `Invalid output format: {value}. Expected one of text, json`.

### 3. OH_MY_AG_OUTPUT_FORMAT Environment Variable

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats    # outputs JSON
oma doctor   # outputs JSON
oma retro    # outputs JSON
```

Set this environment variable to `json` to force JSON output on all commands that support it. Only `json` is recognized; any other value is ignored and defaults to text.

**Resolution order:** `--json` flag > `--output` flag > `OH_MY_AG_OUTPUT_FORMAT` env var > `text` (default).

### Commands Supporting JSON Output

| Command | `--json` | `--output` | Notes |
|:--------|:---------|:----------|:------|
| `doctor` | Yes | Yes | Includes CLI checks, MCP status, skill status |
| `stats` | Yes | Yes | Full metrics object |
| `retro` | Yes | Yes | Snapshot with metrics, authors, commit types |
| `cleanup` | Yes | Yes | List of cleaned items |
| `auth:status` | Yes | Yes | Authentication status per CLI |
| `memory:init` | Yes | Yes | Initialization result |
| `verify` | Yes | Yes | Verification results per check |
| `visualize` | Yes | Yes | Dependency graph as JSON |
| `describe` | Always JSON | N/A | Always outputs JSON (introspection command) |

---

## Per-Command Options

### update

```
oma update [-f | --force] [--ci]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Overwrite user-customized config files during update. Affects: `oma-config.yaml`, `mcp.json`, `stack/` directories. Without this flag, these files are backed up before the update and restored afterward. | `false` |
| `--ci` | | Run in non-interactive CI mode. Skips all confirmation prompts, uses plain console output instead of spinners and animations. Required for CI/CD pipelines where stdin is not available. | `false` |

**Behavior with --force:**
- `oma-config.yaml` is replaced with the registry default.
- `mcp.json` is replaced with the registry default.
- Backend `stack/` directory (language-specific resources) is replaced.
- All other files are always updated regardless of this flag.

**Behavior with --ci:**
- No `console.clear()` on start.
- `@clack/prompts` is replaced with plain `console.log`.
- Competitor detection prompts are skipped.
- Errors throw instead of calling `process.exit(1)`.

### stats

```
oma stats [--json] [--output <format>] [--reset]
```

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--reset` | Reset all metrics data. Deletes `.serena/metrics.json` and recreates it with empty values. | `false` |

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--interactive` | Interactive mode with manual data entry. Prompts for additional context that cannot be gathered from git (e.g., mood, notable events). | `false` |
| `--compare` | Compare the current time window against the previous window of the same length. Shows delta metrics (e.g., commits +12, lines added -340). | `false` |

**Window argument format:**
- `7d` — 7 days
- `2w` — 2 weeks
- `1m` — 1 month
- Omit for default (7 days)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Preview mode. Lists all items that would be cleaned but makes no changes. Exit code 0 regardless of findings. | `false` |
| `--yes` | `-y` | Skip all confirmation prompts. Cleans everything without asking. Useful in scripts and CI. | `false` |

**What gets cleaned:**
1. Orphaned PID files: `/tmp/subagent-*.pid` where the referenced process is no longer running.
2. Orphaned log files: `/tmp/subagent-*.log` matching dead PIDs.
3. Gemini Antigravity directories: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/` — these accumulate state over time and can grow large.


### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--model` | `-m` | CLI vendor override. Must be one of: `gemini`, `claude`, `codex`, `qwen`. Overrides all config-based vendor resolution. | Resolved from config |
| `--workspace` | `-w` | Working directory for the agent. If omitted or set to `.`, the CLI auto-detects the workspace from monorepo configuration files (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Auto-detected or `.` |

**Validation:**
- `agent-id` must be one of: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` must not contain `..`, `?`, `#`, `%`, or control characters.
- `vendor` must be one of: `gemini`, `claude`, `codex`, `qwen`.

**Vendor-specific behavior:**

| Vendor | Command | Auto-approve Flag | Prompt Flag |
|:-------|:--------|:-----------------|:-----------|
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | (none) | `-p` |
| codex | `codex` | `--full-auto` | (none — prompt is positional) |
| qwen | `qwen` | `--yolo` | `-p` |

These defaults can be overridden in `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Root path for locating memory files (`.serena/memories/result-{agent}.md`) and PID files. | Current working directory |

**Status determination logic:**
1. If `.serena/memories/result-{agent}.md` exists: reads `## Status:` header. If no header, reports `completed`.
2. If PID file exists at `/tmp/subagent-{session-id}-{agent}.pid`: checks if the PID is alive. Reports `running` if alive, `crashed` if dead.
3. If neither file exists: reports `crashed`.

### agent:parallel

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--model` | `-m` | CLI vendor override applied to all spawned agents. | Resolved per-agent from config |
| `--inline` | `-i` | Interpret task arguments as `agent:task[:workspace]` strings instead of a file path. | `false` |
| `--no-wait` | | Background mode. Starts all agents and returns immediately without waiting for completion. PID list and logs are saved to `.agents/results/parallel-{timestamp}/`. | `false` (waits for completion) |

**Inline task format:** `agent:task` or `agent:task:workspace`
- Workspace is detected by checking if the last colon-separated segment starts with `./`, `/`, or equals `.`.
- Example: `backend:Implement auth API:./api` -- agent=backend, task="Implement auth API", workspace=./api.
- Example: `frontend:Build login page` -- agent=frontend, task="Build login page", workspace=auto-detected.

**YAML tasks file format:**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # optional
  - agent: frontend
    task: "Build user dashboard"
```

### memory:init

```
oma memory:init [--json] [--output <format>] [--force]
```

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--force` | Overwrite empty or existing schema files in `.serena/memories/`. Without this flag, existing files are not touched. | `false` |

### verify

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Path to the workspace directory to verify. | Current working directory |

**Agent types:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

---

## Practical Examples

### CI Pipeline: Update and Verify

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Automated Metrics Collection

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Batch Agent Execution with Status Monitoring

```bash
# Start agents in background
oma agent:parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### Cleanup in CI After Tests

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Workspace-Aware Verification

```bash
# Verify each domain in its workspace
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### Retro with Comparison for Sprint Reviews

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Full Health Check Script

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# Check CLI installations
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# Check auth status
oma auth:status --json | jq -r '.[] | "\(.name): \(.status)"'

# Check metrics
oma stats --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### Describe for Agent Introspection

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
