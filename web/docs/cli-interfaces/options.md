---
title: "CLI Options"
description: Exhaustive reference for all CLI options, covering global flags, output control, per-command options, and real-world usage patterns.
---

# CLI Options

## Global options

These options are available on the root `oma` / `oh-my-agent` command:

| Flag | Description |
|:-----|:-----------|
| `-g, --global` | Operate on the HOME install (`~/.agents/`) instead of `<cwd>/.agents/` |
| `-y, --yes` | Skip prompts where the selected command supports confirmation; command-specific safety checks still apply |
| `-V, --version` | Output the version number and exit |
| `-h, --help` | Display help for the command |

All subcommands also support `-h, --help` to show their specific help text.

`--global` sets the install root for the whole process, so `install`, `update`, `link`, and `uninstall` all resolve to `~/.agents/` regardless of the directory you run them from. `OMA_HOME=<abs-path>` overrides it — see [Global install](../guide/global-install.md).

---

## Output options

Many commands support machine-readable output for CI/CD pipelines and automation. There are three ways to request JSON output, in priority order:

### 1. --json flag

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

The `--json` flag is available only on the individual paths that advertise it. Do not infer support from a command family: for example, `image`, `video`, and `slide` leaves expose `--output` where the registry lists it, while `search` has its own JSON stream. The registry matrix at the end of this page is the authoritative per-path list.

### 2. --output flag

```bash
oma stats get --output json
oma doctor --output text
```

The `--output` flag accepts `text` or `json`. It provides the same functionality as `--json` but also lets you explicitly request text output (useful when the environment variable is set to json but you want text for a specific command).

**Validation:** If an invalid format is provided, the CLI throws: `Invalid output format: {value}. Expected one of text, json`.

### 3. OH_MY_AG_OUTPUT_FORMAT environment variable

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Set this environment variable to `json` to force JSON output on all commands that support it. Only `json` is recognized; any other value is ignored and defaults to text.

**Resolution order:** `--json` flag > `--output` flag > `OH_MY_AG_OUTPUT_FORMAT` env var > `text` (default).

### Commands supporting JSON output

| Command | `--json` | `--output` | Notes |
|:--------|:---------|:----------|:------|
| `doctor` | Yes | Yes | Includes CLI checks, MCP status, skill status |
| `stats` | Yes | Yes | Full metrics object |
| `retro` | Yes | Yes | Snapshot with metrics, authors, commit types |
| `cleanup` | Yes | Yes | List of cleaned items |
| `auth status` | Yes | Yes | Authentication status per CLI |
| `memory init` | Yes | Yes | Initialization result |
| `verify agent` / `verify triggers` | Yes | Yes | Verification results per check |
| `visualize` | Yes | Yes | Dependency graph as JSON |
| `describe` | Always JSON | N/A | Always outputs JSON (introspection command) |
| `recap` | Yes | Yes | Conversation history per tool/session |
| `image generate` / `image doctor` / `image vendor list` | N/A | Yes | Use `--output json`; `vendor list` is the canonical discovery path |
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | N/A | Yes | Use `--output json` for the run envelope or readiness report |
| `explain validate` | Yes | Yes | Artifact validation report |
| `diagram resolve` / `diagram update` | Yes | Yes | Engine resolution or managed-cache result |
| `market resolve` / `market update` | Yes | Yes | Managed research-engine status |
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | Yes | N/A | Each docs path uses its own report options |
| `search ...` | Always JSON | N/A | All `search` subcommands stream JSON; use `--pretty` for human reading |

---

## Per-command options

### install

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

The interactive installer writes the selected provider settings to `.agents/oma-config.yaml`. The provider flags select the web-search, code-intelligence, and semantic-memory integrations; `--honcho-url` and `--honcho-workspace` configure the Honcho memory service when that provider is selected. The root `-y, --yes` flag applies when an install flow asks for confirmation.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--json` | Emit JSON instead of formatted text. | `false` |
| `--output <format>` | Explicit output format (`text` or `json`). See [Output Options](#output-options). | `text` |
| `--profile` | Show the profile health matrix (resolved model slug, CLI, and auth status per agent from the active `model_preset` and `agents:` overrides). See [Per-Agent Models](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Overwrite user-customized config files during update. Affects: `oma-config.yaml`, `mcp.json`, `stack/` directories. Without this flag, these files are backed up before the update and restored afterward. | `false` |
| `--with-new-skills` | | Install skills added to the registry since the current installation. | `false` |
| `--ci` | | Run in non-interactive CI mode. Skips all confirmation prompts, uses plain console output instead of spinners and animations. Required for CI/CD pipelines where stdin is not available. | `false` |
| `--yes` | `-y` | Skip prompts. Does not create missing vendor directories unless paired with `--all` or `--vendor`. | `false` |
| `--all` | | Create/update all supported project-scoped vendors. | `false` |
| `--vendor <vendors>` | | Create/update a comma-separated vendor list, for example `claude,qwen`. | Existing vendor directories only |

`oma update mcp` uses the same `--yes`, `--ci`, `--all`, and `--vendor` controls while choosing browser MCP servers. It does not use `--force` or `--with-new-skills`.

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

**Vendor scope:**
- `oma update` updates only vendor directories that already exist.
- `oma update --yes` uses the same vendor scope, without prompts.
- `oma update --all` creates/updates all supported project-scoped vendors.
- `oma update --vendor claude,qwen` creates/updates only the listed vendors.

### stats

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--json` | Emit the reset result as JSON. | `false` |
| `--output <format>` | Emit `text` or `json`. | `text` |

`oma stats reset` is the reset command. The former `oma stats get --reset` spelling is not part of the current public surface.

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--interactive` | Interactive mode with manual data entry. Prompts for additional context that cannot be gathered from git (e.g., mood, notable events). | `false` |
| `--compare` | Compare the current time window against the previous window of the same length. Shows delta metrics (e.g., commits +12, lines added -340). | `false` |

**Window argument format:**
- `7d`: 7 days
- `2w`: 2 weeks
- `1m`: 1 month
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
3. Gemini Antigravity directories: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. These accumulate state over time and can grow large.

### agent spawn

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | — | Link a retry to its preceding run ID. | |
| `--fallback-vendors` | — | Ordered, comma-separated explicit fallback vendor chain. | |
| `--task-id` | — | Task ID from the session plan. | Agent ID |
| `--vendor` | — | CLI vendor override. The runtime accepts `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, or `pi`. | Resolved from config |
| `--workspace` | `-w` | Working directory for the agent. If omitted or set to `.`, the CLI auto-detects the workspace from monorepo configuration files (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Auto-detected or `.` |
| `--isolation` | — | Isolation mode: `worktree` creates a git worktree per spawn; the default is `none`. | `none` |
| `--read-only` | — | Restrict the spawned agent to non-destructive tools and suppress auto-approve flags. | `false` |

**Validation:**
- `agent-id` must be one of: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` must not contain `..`, `?`, `#`, `%`, or control characters.
- `vendor` must be one of: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`.

**Vendor-specific behavior:**

| Vendor | Command | Auto-approve Flag | Prompt Flag |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | (none) | `-p` |
| codex | `codex` | `--dangerously-bypass-approvals-and-sandbox` | (none; prompt is positional) |
| cursor | `cursor-agent` | vendor-specific | `-p` |
| opencode | `opencode` | vendor-specific | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | vendor-specific | `-p` |
| pi | `pi` | suppressed in `--read-only` mode | prompt is positional |

These defaults can be overridden in `.agents/skills/oma-orchestration/config/cli-config.yaml`.

### agent status

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Root path for locating memory files (`.agents/state/memories/result-{agent}.md`) and PID files. | Current working directory |

**Status determination logic:**
1. If `.agents/state/memories/result-{agent}.md` exists: reads `## Status:` header. If no header, reports `completed`.
2. If PID file exists at `/tmp/subagent-{session-id}-{agent}.pid`: checks if the PID is alive. Reports `running` if alive, `crashed` if dead.
3. If neither file exists: reports `crashed`.

### agent parallel

```
oma agent parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--vendor` | — | CLI vendor override applied to all spawned agents. | Resolved per-agent from config |
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
| `--tool <tools>` | Filter sessions by tool. Comma-separated: `grok`, `claude`, `codex`, `qwen`, `cursor`, `antigravity`. | all tools |
| `--top <n>` | Show only top N projects/topics in the summary. | unlimited |
| `--sort <metric>` | Sort sessions by `count` or `duration`. | `count` |
| `--mermaid` | Output a Mermaid Gantt chart instead of the default summary. | `false` |
| `--graph` | Open an interactive graph in the browser. Mutually exclusive with `--mermaid`. | `false` |

> **Note:** Generating vendor rule files (e.g. `.cursor/rules`) from the installed skills is handled by [`oma link <vendor>`](./commands.md#link), not a separate `export` command.

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
| `doctor` | none (runs binary checks for Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

**Exit codes:** `0` ok, `1` error, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout. Use these in scripts to differentiate transient blockers from invalid inputs.

### image

```
oma image <subcommand> [...]
```

Output format is controlled per subcommand via `--output <text|json>`.

`image generate` accepts:

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` resolves from the active `image:` configuration and available auth. | `auto` |
| `--size <size>` | | `WxH` with both edges divisible by 16, 16–3840, aspect ratio 1:3–3:1, or `auto`. | vendor default |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | vendor default |
| `--count <n>` | `-n` | Number of images, 1..5. | `1` |
| `--output-dir <dir>` | | Output directory. Must be inside `$PWD` unless `--allow-external-output` is set. | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | Allow `--output-dir` paths outside `$PWD`. | `false` |
| `--model <name>` | | Vendor-specific model override. The antigravity model is selected by `agy`. | vendor default |
| `--timeout <duration>` | | Per-image timeout using a duration value. | vendor default |
| `--reference <path>` | `-r` | Reference image for style/subject transfer. Repeatable (`-r a.png -r b.png`) or comma-separated. Validated for size (≤5MB), format (PNG/JPEG/GIF/WebP via magic bytes), and count (≤10). Supported on `codex` and `antigravity`; rejected with exit 4 on `pollinations`. | |
| `--yes` | `-y` | Skip the cost confirmation prompt. | `false` |
| `--no-prompt-in-manifest` | | Store SHA256 of the prompt instead of the raw text in `manifest.json`. | `false` |
| `--dry-run` | | Print plan and cost estimate; do not execute. | `false` |
| `--output <format>` | | `text` \| `json`. | `text` |

`image doctor` and `image vendor list` accept `--output <text|json>`. `image list-vendors` remains a help alias; `vendor list` is the canonical discovery path.

### video

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` accepts the planning and capture controls `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout`, and `--capture-stop`. It also accepts `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output`, and `--no-brief-in-manifest`. Browser capture uses `--source web --url <url>`; `file` is the default source. A normal render requires an authored composition and a working compositor; placeholders are limited to the `OMA_VIDEO_MOCK=1` test path.

`video doctor` reports or provisions the Remotion/MPT/Strudel toolchain. `compose` prepares the run's composition contract, and `render` typechecks, renders, and probes the output. `provider list` reports provider and key status. Read [Video Generation](../guide/video-generation.md) for the run manifest and recovery sequence.

### memory init

```
oma memory init [--json] [--output <format>] [--force]
```

| Flag | Description | Default |
|:-----|:-----------|:--------|
| `--force` | Overwrite empty or existing schema files in `.agents/state/memories/`. Without this flag, existing files are not touched. | `false` |

### verify

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Flag | Short | Description | Default |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Path to the workspace directory to verify. | Current working directory |

**Agent types:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers` measures keyword-detector accuracy against a labeled corpus. The percentage thresholds are gates; use JSON output when a CI job needs to inspect individual findings. The old `oma verify <agent-type>` spelling is a compatibility help form; `verify agent` is the registered path.

---

## Practical examples

### CI pipeline: update and verify

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Automated metrics collection

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Batch agent execution with status monitoring

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### Cleanup in CI after tests

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Workspace-aware verification

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Retro with comparison for sprint reviews

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Full health check script

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# Check CLI installations
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# Check auth status
oma auth status --json | jq -r '.[] | "\(.name): \(.status)"'

# Check metrics
oma stats get --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### Describe for agent introspection

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```
## Complete public option registry

The following matrix is generated from the checked-in public command registry. It is the coverage index for this page: a row with `—` has no command-specific options, while shared root flags and help aliases are described above. Run `oma describe "<path>"` to inspect runtime help when a value grammar changes.

| Command path | Public options | Purpose |
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | Install oh-my-agent skills and configurations |
| `describe` | `—` | Describe CLI commands as JSON for runtime introspection |
| `uninstall` | `--dry-run, -y, --yes` | Remove oh-my-agent's owned files (preserves oma-config.yaml, mcp.json, and user-authored skills) |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | Update skills to latest version from registry |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | Choose browser MCP servers (Aside, Chrome DevTools, Firefox DevTools) |
| `link` | `--dry-run` | Regenerate vendor files (.claude/, .cursor/, etc.) from .agents/ SSOT |
| `intel` | `—` | Product intelligence pipeline: research, gaps, PRD, issue proposal |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | Suggest high-value product work from market/code intelligence |
| `market` | `—` | Community-signal market research via the always-latest last30days engine |
| `market detect-trap` | `--force` | Preflight check that refuses keyword-trap queries |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | Report the last30days engine oma will run (managed latest, pin, or local copy) and the Python it uses |
| `market update` | `--json, --output <format>` | Download the latest last30days release into oma's managed cache (~/.cache/oma-market/last30days) |
| `market run` | `—` | Run the last30days engine (scripts/last30days.py) with the given arguments; --save-dir defaults to market.save_dir |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | Check CLI installations, MCP configs, and skill status |
| `profile` | `—` | Manage local OMA execution profiles |
| `profile list` | `--json, --output <format>` | List local profiles |
| `profile show` | `--json, --output <format>` | Show a local profile |
| `profile create` | `--json, --output <format>` | Create a local profile |
| `profile use` | `--shell <shell>, --json, --output <format>` | Print shell code to activate an existing profile |
| `profile run` | `—` | Run one command with OMA_PROFILE set for the child process |
| `retro` | `--interactive, --compare, --json, --output <format>` | Engineering retrospective with metrics & trends |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | Recap AI tool conversation history |
| `docs` | `—` | Documentation drift detection: verify references and propose updates for diff-affected docs |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | Extract L2 references from docs and report broken targets. Regenerates docs/generated/doc-refs.json as a side effect. Exit code: 0 = clean, 1 = broken refs found. URL link checking is delegated to `lychee` (install: brew install lychee). |
| `docs sync` | `--json` | Given a git diff, list docs that reference changed files. The host LLM (skill runtime) is expected to read this list plus the diff and propose patches per the SKILL.md contract — the CLI never auto-edits docs. Default diff-range: --cached (staged changes), fallback to HEAD~1..HEAD. |
| `docs i18n` | `--json, --min-severity <level>` | Detect drift between English source docs (web/docs) and i18n translations (web/i18n/{lang}/...). Emits structural signals (line count, heading count, last-commit timestamp) per pair so the host LLM can decide which translations need a diff-sync patch. The CLI never edits translations. |
| `docs lint` | `--json, --locales <list>` | Lint translated docs for content-level anti-patterns (em-dashes in CJK targets, etc.). Complements `oma docs i18n` (structural drift) with style/anti-pattern checks per oma-translation SKILL.md § Stage 4. The CLI never auto-fixes — it only reports issues for the host LLM to restructure. |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | Emit standards-conformant artifacts from the .agents/ SSOT (Agent Skills spec, Agent Plugins package, Claude Code plugin marketplace, AGENTS.md, cli/-scoped vendor docs) |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | Clean up orphaned subagent processes and temp files |
| `bridge` | `--context <name>` | Proxy MCP stdio to a shared per-project Serena server (started on demand) |
| `verify` | `—` | Verify subagent output (backend/frontend/mobile/qa/debug/pm), or measure keyword-detector trigger accuracy |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` |  |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | Measure keyword-detector trigger accuracy against a labeled prompt corpus |
| `vault` | `—` | Manage API keys + secrets in the OS keychain (macOS Keychain / Linux Secret Service / Windows Credential Manager) |
| `vault store` | `--value <value>` | Store a secret under <name> (interactive password prompt) |
| `vault get` | `—` | Print stored value to stdout (for: export KEY=$(oma vault get <name>)) |
| `vault list` | `--json` | List stored secret names (values never displayed) |
| `vault delete` | `—` | Remove a secret from the keychain and the index |
| `star` | `—` | Star oh-my-agent on GitHub |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | Visualize project structure as a dependency graph |
| `search` | `—` | Mechanical search primitives — fetch, meta, rss, media, trust, code |
| `search providers` | `--json, --pretty` | List registered search providers and inspect selection without network calls |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | Search with the selected web provider (Brave has a CLI adapter) |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | Fetch URL via auto-escalating strategy pipeline |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | Extract OGP / JSON-LD / Schema.org from URL |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | Extract media metadata via yt-dlp (1858 sites) |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | Fetch via AMP / archive.today / Wayback |
| `search trust` | `--pretty` | Resolve trust level / score for a domain |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | Search code via gh / glab |
| `search doctor` | `—` | Check dependencies (Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search api` | `—` |  |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | Fetch via matched platform API (Phase 0) |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | Fan-out keyword search across platforms that support it |
| `search rss` | `—` |  |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | Discover and parse RSS/Atom feed for a URL |
| `search rss google` | `--locale <value>` | Build Google News RSS URL for a query |
| `harness` | `—` | Evaluate OMA harness overlays against isolated repository tasks |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | Compare a candidate .agents overlay with the current baseline |
| `harness incident promote` | `--skill <id>, --draft, --force, --json, --output <format>` | Derive a skill regression fixture from a captured incident |
| `harness feedback` | `--live, --apply, --max-epochs <n>, --incident <ids...>, --scan-runs, --json, --output <format>` | Promote incidents and optimize the affected skills |
| `slide` | `—` | HTML presentation toolkit — scaffold, validate, export, and edit 1920×1080 slide decks |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | Geometric quality gate — renders slides via puppeteer-core and checks overflow/overlap/font-size |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | Merge per-slide files into a single self-contained .html deliverable |
| `slide edit` | `--workspace <path>, --port <n>` | Open browser bbox editor (node:http server at 127.0.0.1, dispatches to oma agent runner) |
| `slide doctor` | `—` | Probe required deps (chrome, puppeteer-core) and optional deps (yt-dlp, pptxgenjs) |
| `slide create` | `--output-dir <path>, --force` | Scaffold a new slide working directory with starter HTML, assets/, and meta.json |
| `slide preview` | `--workspace <path>` | Build viewer.html (deck-stage web component + speaker-notes panel, toggle with `n`) |
| `slide export` | `—` |  |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | Export slides to PDF via puppeteer-core |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | Export each slide as a PNG image via puppeteer-core |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | [EXPERIMENTAL] Export to PPTX via pptxgenjs (raster-backed, gradients rasterized) |
| `slide import` | `—` |  |
| `slide import pptx` | `--workspace <path>` | Import a .pptx file into slide fragments via officeparser (bunx, best-effort) |
| `slide asset` | `—` |  |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | Download video via yt-dlp into ./assets/ and print local ref |
| `slide style` | `—` | Browse and fetch design style presets |
| `slide style list` | `—` | List available style presets (vendored + bold-template index) |
| `slide style preview` | `—` | Preview a style preset in the terminal |
| `slide style get` | `--refresh` | Fetch a bold template design.md (always-latest main; cached for offline fallback) |
| `scholar` | `—` | Knows.academy paper sidecars (OpenAlex + Semantic Scholar fallbacks) |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | Search papers (knows.academy → OpenAlex → Semantic Scholar) |
| `scholar resolve` | `—` | Find best paper match across knows.academy, OpenAlex, Semantic Scholar |
| `scholar get` | `--section <name>` | Fetch a sidecar (knows record_id) or work metadata (W-id, DOI, arXiv:<id>, CorpusId:<n>, S2 paperId) |
| `scholar lint` | `--lenient, --fail-on-warning` | Validate a .knows.yaml or .knows.json sidecar (v0.9.0) |
| `image` | `—` | Multi-vendor AI image generation — authentication-aware parallel dispatch |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | Generate images via pollinations (flux/zimage, free), codex (gpt-image-2, ChatGPT OAuth), or antigravity (gemini nano-banana via `agy` CLI, free with Gemini Code Assist sign-in) |
| `image doctor` | `--output <format>` | Check authentication and install status per vendor |
| `image vendor` | `—` |  |
| `image vendor list` | `--output <format>` | List registered vendors and supported models |
| `video` | `—` | Short-form, explainer, and demo video generation |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | Generate a video run directory from a brief |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | Check video provider and compositor readiness |
| `video compose` | `--output <format>, --refresh, --offline` | Scaffold the run's Remotion project on the latest toolchain + remotion-dev/skills; prints the authoring contract |
| `video render` | `--output <format>` | Re-render a run directory from render-spec.json |
| `video provider` | `—` |  |
| `video provider list` | `--output <format>` | List video providers and availability |
| `serena` | `—` | Serena MCP language-server lifecycle utilities |
| `serena reap` | `--dry-run, --quiet` | Kill idle Serena LSP children to reclaim memory (Serena self-heals on next tool call) |
| `serena reaper` | `—` |  |
| `serena reaper enable` | `--dry-run` | Install the periodic Serena Reaper scheduled task (runs every 5 minutes) |
| `serena reaper disable` | `--dry-run` | Uninstall the periodic Serena Reaper scheduled task |
| `explain` | `—` | Explain artifact management and quality validation tools |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | Validate self-contained explain HTML report artifacts |
| `diagram` | `—` | Diagram engine helpers (archify interactive HTML or Mermaid fallback) |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | Report which diagram engine workflows should use, and where archify lives |
| `diagram update` | `--json, --output <format>` | Download the latest archify release into oma's managed cache (~/.cache/oma-diagram/archify) |
| `diagram archify` | `—` | Run the installed archify CLI (doctor \| guide \| validate \| deliver \| visual-check …) with update checks disabled |
| `help` | `—` | Show help information |
| `version` | `—` | Show version number |
| `dashboard` | `—` |  |
| `dashboard terminal` | `—` | Start terminal dashboard (real-time agent monitoring) |
| `dashboard web` | `—` | Start web dashboard on http://127.0.0.1:9847 |
| `auth` | `—` |  |
| `auth status` | `--json, --output <format>` | Check authentication status of all supported CLIs |
| `hook` | `—` |  |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | Dispatch a vendor hook event through the centralised oma hook router (design 019) |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | Probe per-vendor L1 hook compatibility and print a matrix (D63) |
| `state` | `—` |  |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | Append an OMA L1 workflow event |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | Migrate legacy sessions to the home profile and remove verified originals |
| `state get` | `--json, --output <format>` | Inspect one OMA L1 session by ID |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspect OMA L1 workflow state |
| `state repair` | `--dry-run, --json, --output <format>` | Repair OMA L1 workflow state files |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | Verify required L1 events for a workflow checkpoint |
| `state decisions` | `—` |  |
| `state decisions list` | `--json, --output <format>` | List required L1 decision.made checkpoints |
| `state inject-log` | `—` |  |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | List or view per-boundary inject audit logs (D52) |
| `state inject-log get` | `--json, --output <format>` | List or view per-boundary inject audit logs (D52) |
| `state summary` | `--category <category>, --json, --output <format>` | Export a session summary to the coordination store |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | Check whether self-healing is allowed for an agent |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspect OMA L1 workflow state |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspect OMA L1 workflow state |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspect OMA L1 workflow state |
| `ralph` | `—` |  |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | Verify ralph EXEC artifacts (anti-circumvention gate, ralph.md Step 1.3) |
| `goal` | `—` |  |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | Attach a goal contract (deterministic stop gate / wall-clock budget) to an active persistent workflow |
| `stats` | `—` |  |
| `stats get` | `--json, --output <format>` | View productivity metrics |
| `stats reset` | `--json, --output <format>` | View productivity metrics |
| `agent` | `—` |  |
| `agent context` | `--project-root <path>, --difficulty <level>` | Load graph-selected context for a native dispatch prompt |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | Resume safe incomplete tasks, reusing current acceptance evidence |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | Start an evidence-backed native agent run |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | Execute verification argv after -- and record its real exit code |
| `agent finish` | `--project-root <path>` | Validate a native agent result against its verification receipts |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | Spawn a subagent (prompt can be inline text or a file path) |
| `agent status` | `--project-root <path>` | Check status of subagents |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | Run multiple sub-agents in parallel |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | Run code review using external CLI (codex/claude/qwen/grok) |
| `model` | `—` |  |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | Check model registry against live vendor model lists |
| `model probe` | `--json, --timeout <duration>` | Probe a model slug against its vendor CLI to verify it is accepted |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | Run model:check --probe internally and generate an oma-config `models:` patch for accepted candidates |
| `memory` | `—` |  |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Configure Honcho connection or local embedding credentials |
| `memory init` | `--force, --json, --output <format>` | Initialize the coordination store in .agents/state/memories |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | Prepare AgentMemory endpoint configuration |
| `memory daemon` | `—` | Manage an OMA-owned AgentMemory daemon process |
| `memory daemon status` | `--json, --output <format>` | Show daemon status |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | Start AgentMemory in the background |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | Stop the OMA-owned AgentMemory daemon |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | Restart the OMA-owned AgentMemory daemon |
| `memory service` | `—` | Manage AgentMemory OS service integration |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | Install AgentMemory launchd/systemd service integration |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | Uninstall AgentMemory launchd/systemd service integration |
| `memory status` | `--json, --output <format>` | Show selected semantic-memory provider health |
| `memory retry` | `—` |  |
| `memory retry drain` | `--dry-run, --json, --output <format>` | Drain queued AgentMemory observe retries |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | Import vendor conversation history into AgentMemory |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | Garbage-collect project-local memory: prune old L1 sessions and ephemeral Serena files |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | Stop, backup, upgrade, restart, and health-check AgentMemory |
| `skill` | `—` | Inspect and audit installed skills |
| `skill audit` | `--json, --output <format>` | Check frontmatter description similarity between installed skills |
| `skill lint` | `--skill <id>, --json, --output <format>` | Detect per-skill authoring smells (frontmatter, structure, broken refs) |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --trials <n>, --require-coverage, --neg-transfer, --routing, --json, --output <format>` | Measure per-skill utility lift (treatment vs baseline on held-out tasks) |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --memory <mode>, --json, --output <format>` | Optimize a skill's SKILL.md to maximize measured held-out utility lift |
| `skill meta-optimize` | `--target <part>, --skill <ids...>, --anchor <ids...>, --repeats <n>, --candidates <n>, --max-epochs <n>, --edits-per-epoch <k>, --live, --apply, --memory <mode>, --yes, --json, --output <format>` | Propose and score changes to the evolution procedure on held-out skills |
| `skill procedure` | `--export, --json, --output <format>` | Show the evolution procedure (optimizer/maintainer prompts, constitution) and its hashes |
| `skill evolution-stats` | `--skill <id>, --json, --output <format>` | Aggregate recorded optimization runs by outcome, memory mode, and procedure |
| `skill promotions` | `--skill <id>, --json, --output <format>` | List recorded SKILL.md promotions and rollbacks for a skill |
| `skill rollback` | `--skill <id>, --json, --output <format>` | Restore the SKILL.md body replaced by the most recent recorded promotion |
| `schedule` | `—` |  |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | Register a scheduled agent job |
| `schedule list` | `--json, --output <format>` | List scheduled jobs with OS drift state (synced/missing-in-os/orphan-in-os), grouped by project |
| `schedule delete` | `—` | Remove a scheduled job from manifest and OS scheduler |
| `schedule run` | `—` | Execute a scheduled job by id (invoked by OS scheduler; not normally called directly) |
| `schedule sync` | `--prune` | Re-sync manifest → OS scheduler. Use --prune to remove orphan OS jobs. |
