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
oma stats # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
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
| `recap` | Yes | Yes | Conversation history per tool/session |
| `export` | Yes | Yes | Export status and target paths |
| `image generate` / `image doctor` / `image list-vendors` | `--format json` | N/A | Use `--format json` instead of `--json` |
| `search ...` | Always JSON | N/A | All `search` subcommands stream JSON; use `--pretty` for human reading |

---

## Per-Command Options

### oma (install)

```
oma [--update-defaults]
```

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--update-defaults` | Overwrite `.agents/config/defaults.yaml` with the bundled version when a version mismatch is detected. User files (`oma-config.yaml`, `.agents/config/models.yaml`) are preserved. Introduced in cli@5.16.0. | `false` |

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--json` | Emit JSON instead of formatted text. | `false` |
| `--output <format>` | Explicit output format (`text` or `json`). See [Output Options](#output-options). | `text` |
| `--profile` | Show the profile health matrix — resolved model slug, CLI, and auth status per agent through `runtime_profiles`. Introduced in cli@5.16.0. See [Per-Agent Models](../guide/per-agent-models.md). | `false` |

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
workspace: ./api # optional
- agent: frontend
task: "Build user dashboard"
```

### recap

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--window <period>` | Time window: `1d`, `3d`, `7d`, `2w`, `30d`. Ignored when `--date` is set. | `1d` |
| `--date <date>` | Specific date (`YYYY-MM-DD`). Takes precedence over `--window`. | |
| `--tool <tools>` | Filter sessions by tool. Comma-separated: `claude`, `codex`, `gemini`, `qwen`, `cursor`. | all tools |
| `--top <n>` | Show only top N projects/topics in the summary. | unlimited |
| `--sort <metric>` | Sort sessions by `count` or `duration`. | `count` |
| `--mermaid` | Output a Mermaid Gantt chart instead of the default summary. | `false` |
| `--graph` | Open an interactive graph in the browser. Mutually exclusive with `--mermaid`. | `false` |

### export

```
oma export <format> [-d <path>] [--json] [--output <format>]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--dir <path>` | `-d` | Target directory to write the exported rules into. | `process.cwd()` |

**Supported formats:** `cursor` (writes `.cursor/rules` files derived from the installed skills).

### search

```
oma search <subcommand> [...]
```

The `search` group ships its own JSON output (no `--json` / `--output` flags). Use `--pretty` on URL/query subcommands to pretty-print results, and rely on subcommand-specific options below:

| Subcommand | Notable Options |
|:-----------|:---------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (default `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (default `en`), `--format <spec>`, `--timeout` (default `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (default `github`), `--language`, `--repo`, `--limit` (default `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | none — runs binary checks for Chrome / `python3 curl_cffi` / `yt-dlp` / `gh` |

**Exit codes:** `0` ok, `1` error, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout. Use these in scripts to differentiate transient blockers from invalid inputs.

### image

```
oma image <subcommand> [...]
```

Output format is controlled per subcommand via `--format <text|json>` (not the shared `--json` flag).

`image generate` accepts:

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `gemini` \| `all`. `auto` resolves from `image-config.yaml` and available auth. | `auto` |
| `--size <size>` | | `1024x1024` \| `1024x1536` \| `1536x1024` \| `auto`. | vendor default |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | vendor default |
| `--count <n>` | `-n` | Number of images, 1..5. | `1` |
| `--out <dir>` | | Output directory. Must be inside `$PWD` unless `--allow-external-out` is set. | `.agents/results/images/{timestamp}/` |
| `--allow-external-out` | | Allow `--out` paths outside `$PWD`. | `false` |
| `--model <name>` | | Vendor-specific model override (e.g. `gpt-image-2`, `flux`, `imagen-4`). | vendor default |
| `--strategy <list>` | | Gemini fallback order, comma-separated of `mcp`, `stream`, `api`. | vendor default |
| `--timeout <seconds>` | | Per-image timeout. | vendor default |
| `--yes` | `-y` | Skip the cost confirmation prompt. | `false` |
| `--no-prompt-in-manifest` | | Store SHA256 of the prompt instead of the raw text in `manifest.json`. | `false` |
| `--dry-run` | | Print plan and cost estimate; do not execute. | `false` |
| `--format <format>` | | `text` \| `json`. | `text` |

`image doctor` and `image list-vendors` only accept `--format <text|json>`.

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
