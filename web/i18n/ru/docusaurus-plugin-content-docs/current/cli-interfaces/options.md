---
title: "Опции CLI"
description: "Исчерпывающий справочник всех опций CLI: глобальные флаги, управление выводом, параметры команд и практические сценарии использования."
---

# Опции CLI

Этот справочник описывает публичные опции oh-my-agent. Имена команд, флаги, пути и примеры сохранены точно; пояснения и практические сценарии переведены для русскоязычного читателя.


## Глобальные опции

Эти опции доступны on the root `oma` / `oh-my-agent` command:

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `-g, --global` | Operate on the HOME install (`~/.agents/`) instead of `<cwd>/.agents/`  <!-- Перевод на русский -->|
| `-y, --yes` | Skip prompts where the selected command supports confirmation; command-specific safety checks still apply  <!-- Перевод на русский -->|
| `-V, --version` | Output the version number and exit  <!-- Перевод на русский -->|
| `-h, --help` | Display help for the command  <!-- Перевод на русский -->|

Все подкоманды также поддерживают `-h, --help` to show their specific help text.

`--global` sets the install root for the whole process, so `install`, `update`, `link`, and `uninstall` all resolve to `~/.agents/` regardless of the directory you run them from. `OMA_HOME=<abs-path>` overrides it — see [Global install](../guide/global-install.md). <!-- Перевод на русский -->

---

## Опции вывода {#output-options}

Многие команды поддерживают machine-readable output for CI/CD pipelines and automation. Есть три способа to request JSON output, in priority order:

### 1. Флаг --json

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

The `--json` flag is available only on the individual paths that advertise it. Do not infer support from a command family: for example, `image`, `video`, and `slide` leaves expose `--output` where the registry lists it, while `search` has its own JSON stream. The registry matrix at the end of this page is the authoritative per-path list. <!-- Перевод на русский -->

### 2. Флаг --output

```bash
oma stats get --output json
oma doctor --output text
```

The `--output` flag accepts `text` or `json`. Она даёт ту же возможность as `--json` but also lets you explicitly request text output (useful when the environment variable is set to json but you want text for a specific command).

**Проверка:** При недопустимом формате, the CLI throws: `Invalid output format: {value}. Expected one of text, json`.

### 3. Переменная окружения OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Задайте эту переменную окружения to `json` to force JSON output on all commands that support it. Only `json` is recognized; any other value is ignored and defaults to text.

**Порядок разрешения:** `--json` flag > `--output` flag > `OH_MY_AG_OUTPUT_FORMAT` env var > `text` (default).

### Команды с поддержкой JSON-вывода

| Команда | `--json` | `--output` | Примечания |
|:--------|:---------|:----------|:------ <!-- Перевод на русский -->|
| `doctor` | Yes | Yes | Includes CLI checks, MCP status, skill status  <!-- Перевод на русский -->|
| `stats` | Yes | Yes | Full metrics object  <!-- Перевод на русский -->|
| `retro` | Yes | Yes | Snapshot with metrics, authors, commit types  <!-- Перевод на русский -->|
| `cleanup` | Yes | Yes | List of cleaned items  <!-- Перевод на русский -->|
| `auth status` | Yes | Yes | Authentication status per CLI  <!-- Перевод на русский -->|
| `memory init` | Yes | Yes | Initialization result  <!-- Перевод на русский -->|
| `verify agent` / `verify triggers` | Yes | Yes | Verification results per check  <!-- Перевод на русский -->|
| `visualize` | Yes | Yes | Dependency graph as JSON  <!-- Перевод на русский -->|
| `describe` | Always JSON | N/A | Always outputs JSON (introspection command)  <!-- Перевод на русский -->|
| `recap` | Yes | Yes | Conversation history per tool/session  <!-- Перевод на русский -->|
| `image generate` / `image doctor` / `image vendor list` | N/A | Yes | Use `--output json`; `vendor list` is the canonical discovery path  <!-- Перевод на русский -->|
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | N/A | Yes | Use `--output json` for the run envelope or readiness report  <!-- Перевод на русский -->|
| `explain validate` | Yes | Yes | Artifact validation report  <!-- Перевод на русский -->|
| `diagram resolve` / `diagram update` | Yes | Yes | Engine resolution or managed-cache result  <!-- Перевод на русский -->|
| `market resolve` / `market update` | Yes | Yes | Managed research-engine status  <!-- Перевод на русский -->|
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | Yes | N/A | Each docs path uses its own report options  <!-- Перевод на русский -->|
| `search ...` | Always JSON | N/A | All `search` subcommands stream JSON; use `--pretty` for human reading  <!-- Перевод на русский -->|

---

## Опции отдельных команд

### install

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

Интерактивный установщик записывает выбранные настройки поставщиков to `.agents/oma-config.yaml`. Флаги поставщиков выбирают the web-search, code-intelligence, and semantic-memory integrations; `--honcho-url` and `--honcho-workspace` configure the Honcho memory service when that provider is selected. The root `-y, --yes` flag applies when an install flow asks for confirmation.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:-------- <!-- Перевод на русский -->|
| `--json` | Emit JSON instead of formatted text. | `false`  <!-- Перевод на русский -->|
| `--output <format>` | Explicit output format (`text` or `json`). See [Output Опции](#output-options). | `text` |
| `--profile` | Show the profile health matrix (resolved model slug, CLI, and auth status per agent from the active `model_preset` and `agents:` overrides). See [Per-Agent Models](../guide/per-agent-models.md). | `false`  <!-- Перевод на русский -->|

### update

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:-------- <!-- Перевод на русский -->|
| `--force` | `-f` | Overwrite user-customized config files during update. Affects: `oma-config.yaml`, `mcp.json`, `stack/` directories. Without this flag, these files are backed up before the update and restored afterward. | `false`  <!-- Перевод на русский -->|
| `--with-new-skills` | | Install skills added to the registry since the current installation. | `false`  <!-- Перевод на русский -->|
| `--ci` | | Run in non-interactive CI mode. Skips all confirmation prompts, uses plain console output instead of spinners and animations. Обязателен for CI/CD pipelines where stdin is not available. | `false` |
| `--yes` | `-y` | Skip prompts. Does not create missing vendor directories unless paired with `--all` or `--vendor`. | `false`  <!-- Перевод на русский -->|
| `--all` | | Create/update all supported project-scoped vendors. | `false`  <!-- Перевод на русский -->|
| `--vendor <vendors>` | | Create/update a comma-separated vendor list, for example `claude,qwen`. | Existing vendor directories only  <!-- Перевод на русский -->|

`oma update mcp` использует те же `--yes`, `--ci`, `--all`, and `--vendor` параметры при выборе браузерных MCP-серверов. Он не использует `--force` or `--with-new-skills`.

**Поведение с --force:**
- `oma-config.yaml` is replaced with the registry default. <!-- Перевод на русский -->
- `mcp.json` is replaced with the registry default. <!-- Перевод на русский -->
- Backend `stack/` directory (language-specific resources) is replaced. <!-- Перевод на русский -->
- All other files are always updated regardless of this flag. <!-- Перевод на русский -->

**Поведение с --ci:**
- No `console.clear()` on start. <!-- Перевод на русский -->
- `@clack/prompts` is replaced with plain `console.log`. <!-- Перевод на русский -->
- Competitor detection prompts are skipped. <!-- Перевод на русский -->
- Errors throw instead of calling `process.exit(1)`. <!-- Перевод на русский -->

**Область поставщиков:**
- `oma update` updates only vendor directories that already exist. <!-- Перевод на русский -->
- `oma update --yes` использует те же vendor scope, without prompts.
- `oma update --all` creates/updates all supported project-scoped vendors. <!-- Перевод на русский -->
- `oma update --vendor claude,qwen` creates/updates only the listed vendors. <!-- Перевод на русский -->

### stats

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:-------- <!-- Перевод на русский -->|
| `--json` | Emit the reset result as JSON. | `false`  <!-- Перевод на русский -->|
| `--output <format>` | Emit `text` or `json`. | `text`  <!-- Перевод на русский -->|

`oma stats reset` is the reset command. Прежняя форма `oma stats get --reset` spelling не входит в текущую публичную поверхность.

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:-------- <!-- Перевод на русский -->|
| `--interactive` | Interactive mode with manual data entry. Prompts for additional context that cannot be gathered from git (e.g., mood, notable events). | `false`  <!-- Перевод на русский -->|
| `--compare` | Compare the current time window against the previous window of the same length. Shows delta metrics (e.g., commits +12, lines added -340). | `false`  <!-- Перевод на русский -->|

**Window argument format:** <!-- Перевод на русский -->
- `7d`: 7 days <!-- Перевод на русский -->
- `2w`: 2 weeks <!-- Перевод на русский -->
- `1m`: 1 month <!-- Перевод на русский -->
- Omit for default (7 days) <!-- Перевод на русский -->

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:-------- <!-- Перевод на русский -->|
| `--dry-run` | | Preview mode. Lists all items that would be cleaned but makes no changes. Exit code 0 regardless of findings. | `false`  <!-- Перевод на русский -->|
| `--yes` | `-y` | Skip all confirmation prompts. Cleans everything without asking. Useful in scripts and CI. | `false`  <!-- Перевод на русский -->|

**Что очищается:**
1. Orphaned PID files: `/tmp/subagent-*.pid` where the referenced process is no longer running. <!-- Перевод на русский -->
2. Orphaned log files: `/tmp/subagent-*.log` matching dead PIDs. <!-- Перевод на русский -->
3. Gemini Antigravity directories: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. These accumulate state over time and can grow large. <!-- Перевод на русский -->

### agent spawn

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:-------- <!-- Перевод на русский -->|
| `--resumed-from` | — | Link a retry to its preceding run ID. |  <!-- Перевод на русский -->|
| `--fallback-vendors` | — | Ordered, comma-separated explicit fallback vendor chain. |  <!-- Перевод на русский -->|
| `--task-id` | — | Task ID from the session plan. | Agent ID  <!-- Перевод на русский -->|
| `--vendor` | — | CLI vendor override. The runtime accepts `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, or `pi`. | Resolved from config  <!-- Перевод на русский -->|
| `--workspace` | `-w` | Working directory for the agent. If omitted or set to `.`, the CLI auto-detects the workspace from monorepo configuration files (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Auto-detected or `.`  <!-- Перевод на русский -->|
| `--isolation` | — | Isolation mode: `worktree` creates a git worktree per spawn; the default is `none`. | `none`  <!-- Перевод на русский -->|
| `--read-only` | — | Restrict the spawned agent to non-destructive tools and suppress auto-approve flags. | `false`  <!-- Перевод на русский -->|

**Проверка:**
- `agent-id` must be one of: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`. <!-- Перевод на русский -->
- `session-id` must not contain `..`, `?`, `#`, `%`, or control characters. <!-- Перевод на русский -->
- `vendor` must be one of: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. <!-- Перевод на русский -->

**Поведение для конкретных поставщиков:**

| Vendor | Команда | Auto-approve Флаг | Prompt Флаг |
|:-------|:--------|:-----------------|:----------- <!-- Перевод на русский -->|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p`  <!-- Перевод на русский -->|
| claude | `claude` | (none) | `-p`  <!-- Перевод на русский -->|
| codex | `codex` | `--sandbox workspace-write` | (none; prompt is positional)  <!-- Перевод на русский -->|
| cursor | `cursor-agent` | vendor-specific | `-p`  <!-- Перевод на русский -->|
| opencode | `opencode` | vendor-specific | `-p`  <!-- Перевод на русский -->|
| qwen | `qwen` | `--yolo` | `-p`  <!-- Перевод на русский -->|
| grok | `grok` | vendor-specific | `-p`  <!-- Перевод на русский -->|
| pi | `pi` | suppressed in `--read-only` mode | prompt is positional  <!-- Перевод на русский -->|

These defaults can be overridden in `.agents/skills/oma-orchestration/config/cli-config.yaml`. <!-- Перевод на русский -->

### agent status

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:-------- <!-- Перевод на русский -->|
| `--root` | `-r` | Root path for locating memory files (`.agents/state/memories/result-{agent}.md`) and PID files. | Current working directory  <!-- Перевод на русский -->|

**Логика определения состояния:**
1. If `.agents/state/memories/result-{agent}.md` exists: reads `## Status:` header. If no header, reports `completed`. <!-- Перевод на русский -->
2. If PID file exists at `/tmp/subagent-{session-id}-{agent}.pid`: checks if the PID is alive. Reports `running` if alive, `crashed` if dead. <!-- Перевод на русский -->
3. If neither file exists: reports `crashed`. <!-- Перевод на русский -->

### agent parallel

```
oma agent parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:-------- <!-- Перевод на русский -->|
| `--vendor` | — | CLI vendor override applied to all spawned agents. | Resolved per-agent from config  <!-- Перевод на русский -->|
| `--inline` | `-i` | Interpret task arguments as `agent:task[:workspace]` strings instead of a file path. | `false`  <!-- Перевод на русский -->|
| `--no-wait` | | Background mode. Starts all agents and returns immediately without waiting for completion. PID list and logs are saved to `.agents/results/parallel-{timestamp}/`. | `false` (waits for completion)  <!-- Перевод на русский -->|

**Формат встроенной задачи:** `agent:task` or `agent:task:workspace`
- Workspace is detected by checking if the last colon-separated segment starts with `./`, `/`, or equals `.`. <!-- Перевод на русский -->
- Example: `backend:Implement auth API:./api` -- agent=backend, task="Implement auth API", workspace=./api. <!-- Перевод на русский -->
- Example: `frontend:Build login page` -- agent=frontend, task="Build login page", workspace=auto-detected. <!-- Перевод на русский -->

**YAML tasks file format:** <!-- Перевод на русский -->
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

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:-------- <!-- Перевод на русский -->|
| `--window <period>` | Time window: `1d`, `3d`, `7d`, `2w`, `30d`. Ignored when `--date` is set. | `1d`  <!-- Перевод на русский -->|
| `--date <date>` | Specific date (`YYYY-MM-DD`). Takes precedence over `--window`. |  <!-- Перевод на русский -->|
| `--tool <tools>` | Filter sessions by tool. Comma-separated: `grok`, `claude`, `codex`, `qwen`, `cursor`, `antigravity`. | all tools  <!-- Перевод на русский -->|
| `--top <n>` | Show only top N projects/topics in the summary. | unlimited  <!-- Перевод на русский -->|
| `--sort <metric>` | Sort sessions by `count` or `duration`. | `count`  <!-- Перевод на русский -->|
| `--mermaid` | Output a Mermaid Gantt chart instead of the default summary. | `false`  <!-- Перевод на русский -->|
| `--graph` | Open an interactive graph in the browser. Mutually exclusive with `--mermaid`. | `false`  <!-- Перевод на русский -->|

> **Примечание:** Generating vendor rule files (e.g. `.cursor/rules`) from the installed skills is handled by [`oma link <vendor>`](./commands.md#link), not a separate `export` command.

### search

```
oma search <subcommand> [...]
```

The `search` group использует собственный JSON-вывод (no `--json` / `--output` flags). Use `--pretty` on URL/query subcommands to pretty-print results, and rely on subcommand-specific options below:

| Подкоманда | Основные опции |
|:-----------|:--------------- <!-- Перевод на русский -->|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty`  <!-- Перевод на русский -->|
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty`  <!-- Перевод на русский -->|
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty`  <!-- Перевод на русский -->|
| `rss:google <query>` | `--locale` (default `en-US`)  <!-- Перевод на русский -->|
| `media <url>` | `--subs`, `--sub-lang <list>` (default `en`), `--format <spec>`, `--timeout` (default `30`), `--pretty`  <!-- Перевод на русский -->|
| `code <query>` | `--host <github\|gitlab>` (default `github`), `--language`, `--repo`, `--limit` (default `20`), `--pretty`  <!-- Перевод на русский -->|
| `trust <domain>` | `--pretty`  <!-- Перевод на русский -->|
| `doctor` | none (runs binary checks for Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`)  <!-- Перевод на русский -->|

**Коды выхода:** `0` ok, `1` error, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout. Use these in scripts to differentiate transient blockers from invalid inputs.

### image

```
oma image <subcommand> [...]
```

Формат вывода задаётся per subcommand via `--output <text|json>`.

`image generate` accepts: <!-- Перевод на русский -->

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:-------- <!-- Перевод на русский -->|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` resolves from the active `image:` configuration and available auth. | `auto`  <!-- Перевод на русский -->|
| `--size <size>` | | `WxH` with both edges divisible by 16, 16–3840, aspect ratio 1:3–3:1, or `auto`. | vendor default  <!-- Перевод на русский -->|
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | vendor default  <!-- Перевод на русский -->|
| `--count <n>` | `-n` | Number of images, 1..5. | `1`  <!-- Перевод на русский -->|
| `--output-dir <dir>` | | Output directory. Must be inside `$PWD` unless `--allow-external-output` is set. | `.agents/results/images/{timestamp}/`  <!-- Перевод на русский -->|
| `--allow-external-output` | | Allow `--output-dir` paths outside `$PWD`. | `false`  <!-- Перевод на русский -->|
| `--model <name>` | | Vendor-specific model override. The antigravity model is selected by `agy`. | vendor default  <!-- Перевод на русский -->|
| `--timeout <duration>` | | Per-image timeout using a duration value. | vendor default  <!-- Перевод на русский -->|
| `--reference <path>` | `-r` | Reference image for style/subject transfer. Repeatable (`-r a.png -r b.png`) or comma-separated. Validated for size (≤5MB), format (PNG/JPEG/GIF/WebP via magic bytes), and count (≤10). Supported on `codex` and `antigravity`; rejected with exit 4 on `pollinations`. |  <!-- Перевод на русский -->|
| `--yes` | `-y` | Skip the cost confirmation prompt. | `false`  <!-- Перевод на русский -->|
| `--no-prompt-in-manifest` | | Store SHA256 of the prompt instead of the raw text in `manifest.json`. | `false`  <!-- Перевод на русский -->|
| `--dry-run` | | Print plan and cost estimate; do not execute. | `false`  <!-- Перевод на русский -->|
| `--output <format>` | | `text` \| `json`. | `text`  <!-- Перевод на русский -->|

`image doctor` and `image vendor list` accept `--output <text|json>`. `image list-vendors` remains a help alias; `vendor list` is the canonical discovery path. <!-- Перевод на русский -->

### video

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` принимает параметры планирования и захвата `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout`, and `--capture-stop`. Также поддерживаются `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output`, and `--no-brief-in-manifest`. Для захвата браузера используется `--source web --url <url>`; `file` is the default source. Обычный рендер требует an authored composition and a working compositor; placeholder-режим ограничен the `OMA_VIDEO_MOCK=1` test path.

`video doctor` сообщает о состоянии или устанавливает the Remotion/MPT/Strudel toolchain. `compose` prepares the run's composition contract, and `render` typechecks, renders, and probes the output. `provider list` reports provider and key status. См. [Генерация видео](../guide/video-generation.md) for the run manifest and recovery sequence.

### memory init

```
oma memory init [--json] [--output <format>] [--force]
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:-------- <!-- Перевод на русский -->|
| `--force` | Overwrite empty or existing schema files in `.agents/state/memories/`. Without this flag, existing files are not touched. | `false`  <!-- Перевод на русский -->|

### verify

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:-------- <!-- Перевод на русский -->|
| `--workspace` | `-w` | Path to the workspace directory to verify. | Current working directory  <!-- Перевод на русский -->|

**Agent types:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`. <!-- Перевод на русский -->

`verify triggers` измеряет точность keyword-detector against a labeled corpus. Процентные пороги являются воротами; use JSON output when a CI job needs to inspect individual findings. Старая форма `oma verify <agent-type>` spelling является совместимой формой справки; `verify agent` является зарегистрированным путём.

---

## Практические примеры

### CI-пайплайн: обновление и проверка

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Автоматический сбор метрик

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Пакетный запуск агентов с мониторингом состояния

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### Очистка в CI после тестов

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Проверка с учётом рабочего пространства

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Ретро со сравнением для обзора спринта

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Полный скрипт проверки состояния

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

### Describe для интроспекции агента

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```
## Полный реестр публичных опций

Следующая матрица сгенерирована из проверенного в репозитории публичного реестра команд. Это индекс покрытия этой страницы: строка с `—` не содержит параметров, специфичных для команды, а общие корневые флаги и алиасы справки описаны выше. Запустите `oma describe "<path>"`, чтобы просмотреть справку во время выполнения, если изменится грамматика значения.

| Путь команды | Публичные опции | Назначение |
|---|---|--- <!-- Перевод на русский -->|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | Install oh-my-agent skills and configurations  <!-- Перевод на русский -->|
| `describe` | `—` | Describe CLI commands as JSON for runtime introspection  <!-- Перевод на русский -->|
| `uninstall` | `--dry-run, -y, --yes` | Remove oh-my-agent's owned files (preserves oma-config.yaml, mcp.json, and user-authored skills)  <!-- Перевод на русский -->|
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | Update skills to latest version from registry  <!-- Перевод на русский -->|
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | Choose browser MCP servers (Aside, Chrome DevTools, Firefox DevTools)  <!-- Перевод на русский -->|
| `link` | `--dry-run` | Regenerate vendor files (.claude/, .cursor/, etc.) from .agents/ SSOT  <!-- Перевод на русский -->|
| `intel` | `—` | Product intelligence pipeline: research, gaps, PRD, issue proposal  <!-- Перевод на русский -->|
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | Suggest high-value product work from market/code intelligence  <!-- Перевод на русский -->|
| `market` | `—` | Community-signal market research via the always-latest last30days engine  <!-- Перевод на русский -->|
| `market detect-trap` | `--force` | Preflight check that refuses keyword-trap queries  <!-- Перевод на русский -->|
| `market resolve` | `--refresh, --offline, --json, --output <format>` | Report the last30days engine oma will run (managed latest, pin, or local copy) and the Python it uses  <!-- Перевод на русский -->|
| `market update` | `--json, --output <format>` | Download the latest last30days release into oma's managed cache (~/.cache/oma-market/last30days)  <!-- Перевод на русский -->|
| `market run` | `—` | Run the last30days engine (scripts/last30days.py) with the given arguments; --save-dir defaults to market.save_dir  <!-- Перевод на русский -->|
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | Check CLI installations, MCP configs, and skill status  <!-- Перевод на русский -->|
| `profile` | `—` | Manage local OMA execution profiles  <!-- Перевод на русский -->|
| `profile list` | `--json, --output <format>` | List local profiles  <!-- Перевод на русский -->|
| `profile show` | `--json, --output <format>` | Show a local profile  <!-- Перевод на русский -->|
| `profile create` | `--json, --output <format>` | Create a local profile  <!-- Перевод на русский -->|
| `profile use` | `--shell <shell>, --json, --output <format>` | Print shell code to activate an existing profile  <!-- Перевод на русский -->|
| `profile run` | `—` | Run one command with OMA_PROFILE set for the child process  <!-- Перевод на русский -->|
| `retro` | `--interactive, --compare, --json, --output <format>` | Engineering retrospective with metrics & trends  <!-- Перевод на русский -->|
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | Recap AI tool conversation history  <!-- Перевод на русский -->|
| `docs` | `—` | Documentation drift detection: verify references and propose updates for diff-affected docs  <!-- Перевод на русский -->|
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | Extract L2 references from docs and report broken targets. Regenerates docs/generated/doc-refs.json as a side effect. Exit code: 0 = clean, 1 = broken refs found. URL link checking is delegated to `lychee` (install: brew install lychee).  <!-- Перевод на русский -->|
| `docs sync` | `--json` | Given a git diff, list docs that reference changed files. The host LLM (skill runtime) is expected to read this list plus the diff and propose patches per the SKILL.md contract — the CLI never auto-edits docs. По умолчанию diff-range: --cached (staged changes), fallback to HEAD~1..HEAD. |
| `docs i18n` | `--json, --min-severity <level>` | Detect drift between English source docs (web/docs) and i18n translations (web/i18n/{lang}/...). Emits structural signals (line count, heading count, last-commit timestamp) per pair so the host LLM can decide which translations need a diff-sync patch. The CLI never edits translations.  <!-- Перевод на русский -->|
| `docs lint` | `--json, --locales <list>` | Lint translated docs for content-level anti-patterns (em-dashes in CJK targets, etc.). Complements `oma docs i18n` (structural drift) with style/anti-pattern checks per oma-translation SKILL.md § Stage 4. The CLI never auto-fixes — it only reports issues for the host LLM to restructure.  <!-- Перевод на русский -->|
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | Emit standards-conformant artifacts from the .agents/ SSOT (Agent Skills spec, Agent Plugins package, Claude Code plugin marketplace, AGENTS.md, cli/-scoped vendor docs)  <!-- Перевод на русский -->|
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | Clean up orphaned subagent processes and temp files  <!-- Перевод на русский -->|
| `bridge` | `--context <name>` | Proxy MCP stdio to a shared per-project Serena server (started on demand)  <!-- Перевод на русский -->|
| `verify` | `—` | Verify subagent output (backend/frontend/mobile/qa/debug/pm), or measure keyword-detector trigger accuracy  <!-- Перевод на русский -->|
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` |   <!-- Перевод на русский -->|
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | Measure keyword-detector trigger accuracy against a labeled prompt corpus  <!-- Перевод на русский -->|
| `vault` | `—` | Manage API keys + secrets in the OS keychain (macOS Keychain / Linux Secret Service / Windows Credential Manager)  <!-- Перевод на русский -->|
| `vault store` | `--value <value>` | Store a secret under <name> (interactive password prompt)  <!-- Перевод на русский -->|
| `vault get` | `—` | Print stored value to stdout (for: export KEY=$(oma vault get <name>))  <!-- Перевод на русский -->|
| `vault list` | `--json` | List stored secret names (values never displayed)  <!-- Перевод на русский -->|
| `vault delete` | `—` | Remove a secret from the keychain and the index  <!-- Перевод на русский -->|
| `star` | `—` | Star oh-my-agent on GitHub  <!-- Перевод на русский -->|
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | Visualize project structure as a dependency graph  <!-- Перевод на русский -->|
| `search` | `—` | Mechanical search primitives — fetch, meta, rss, media, trust, code  <!-- Перевод на русский -->|
| `search providers` | `--json, --pretty` | List registered search providers and inspect selection without network calls  <!-- Перевод на русский -->|
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | Search with the selected web provider (Brave has a CLI adapter)  <!-- Перевод на русский -->|
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | Fetch URL via auto-escalating strategy pipeline  <!-- Перевод на русский -->|
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | Extract OGP / JSON-LD / Schema.org from URL  <!-- Перевод на русский -->|
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | Extract media metadata via yt-dlp (1858 sites)  <!-- Перевод на русский -->|
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | Fetch via AMP / archive.today / Wayback  <!-- Перевод на русский -->|
| `search trust` | `--pretty` | Resolve trust level / score for a domain  <!-- Перевод на русский -->|
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | Search code via gh / glab  <!-- Перевод на русский -->|
| `search doctor` | `—` | Check dependencies (Chrome, python3 curl_cffi, yt-dlp, gh)  <!-- Перевод на русский -->|
| `search api` | `—` |   <!-- Перевод на русский -->|
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | Fetch via matched platform API (Phase 0)  <!-- Перевод на русский -->|
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | Fan-out keyword search across platforms that support it  <!-- Перевод на русский -->|
| `search rss` | `—` |   <!-- Перевод на русский -->|
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | Discover and parse RSS/Atom feed for a URL  <!-- Перевод на русский -->|
| `search rss google` | `--locale <value>` | Build Google News RSS URL for a query  <!-- Перевод на русский -->|
| `harness` | `—` | Evaluate OMA harness overlays against isolated repository tasks  <!-- Перевод на русский -->|
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | Compare a candidate .agents overlay with the current baseline  <!-- Перевод на русский -->|
| `slide` | `—` | HTML presentation toolkit — scaffold, validate, export, and edit 1920×1080 slide decks  <!-- Перевод на русский -->|
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | Geometric quality gate — renders slides via puppeteer-core and checks overflow/overlap/font-size  <!-- Перевод на русский -->|
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | Merge per-slide files into a single self-contained .html deliverable  <!-- Перевод на русский -->|
| `slide edit` | `--workspace <path>, --port <n>` | Open browser bbox editor (node:http server at 127.0.0.1, dispatches to oma agent runner)  <!-- Перевод на русский -->|
| `slide doctor` | `—` | Probe required deps (chrome, puppeteer-core) and optional deps (yt-dlp, pptxgenjs)  <!-- Перевод на русский -->|
| `slide create` | `--output-dir <path>, --force` | Scaffold a new slide working directory with starter HTML, assets/, and meta.json  <!-- Перевод на русский -->|
| `slide preview` | `--workspace <path>` | Build viewer.html (deck-stage web component + speaker-notes panel, toggle with `n`)  <!-- Перевод на русский -->|
| `slide export` | `—` |   <!-- Перевод на русский -->|
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | Export slides to PDF via puppeteer-core  <!-- Перевод на русский -->|
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | Export each slide as a PNG image via puppeteer-core  <!-- Перевод на русский -->|
| `slide export pptx` | `--workspace <path>, --output-file <path>` | [EXPERIMENTAL] Export to PPTX via pptxgenjs (raster-backed, gradients rasterized)  <!-- Перевод на русский -->|
| `slide import` | `—` |   <!-- Перевод на русский -->|
| `slide import pptx` | `--workspace <path>` | Import a .pptx file into slide fragments via officeparser (bunx, best-effort)  <!-- Перевод на русский -->|
| `slide asset` | `—` |   <!-- Перевод на русский -->|
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | Download video via yt-dlp into ./assets/ and print local ref  <!-- Перевод на русский -->|
| `slide style` | `—` | Browse and fetch design style presets  <!-- Перевод на русский -->|
| `slide style list` | `—` | List available style presets (vendored + bold-template index)  <!-- Перевод на русский -->|
| `slide style preview` | `—` | Preview a style preset in the terminal  <!-- Перевод на русский -->|
| `slide style get` | `--refresh` | Fetch a bold template design.md (always-latest main; cached for offline fallback)  <!-- Перевод на русский -->|
| `scholar` | `—` | Knows.academy paper sidecars (OpenAlex + Semantic Scholar fallbacks)  <!-- Перевод на русский -->|
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | Search papers (knows.academy → OpenAlex → Semantic Scholar)  <!-- Перевод на русский -->|
| `scholar resolve` | `—` | Find best paper match across knows.academy, OpenAlex, Semantic Scholar  <!-- Перевод на русский -->|
| `scholar get` | `--section <name>` | Fetch a sidecar (knows record_id) or work metadata (W-id, DOI, arXiv:<id>, CorpusId:<n>, S2 paperId)  <!-- Перевод на русский -->|
| `scholar lint` | `--lenient, --fail-on-warning` | Validate a .knows.yaml or .knows.json sidecar (v0.9.0)  <!-- Перевод на русский -->|
| `image` | `—` | Multi-vendor AI image generation — authentication-aware parallel dispatch  <!-- Перевод на русский -->|
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | Generate images via pollinations (flux/zimage, free), codex (gpt-image-2, ChatGPT OAuth), or antigravity (gemini nano-banana via `agy` CLI, free with Gemini Code Assist sign-in)  <!-- Перевод на русский -->|
| `image doctor` | `--output <format>` | Check authentication and install status per vendor  <!-- Перевод на русский -->|
| `image vendor` | `—` |   <!-- Перевод на русский -->|
| `image vendor list` | `--output <format>` | List registered vendors and supported models  <!-- Перевод на русский -->|
| `video` | `—` | Короткая форма-form, explainer, and demo video generation |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | Generate a video run directory from a brief  <!-- Перевод на русский -->|
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | Check video provider and compositor readiness  <!-- Перевод на русский -->|
| `video compose` | `--output <format>, --refresh, --offline` | Scaffold the run's Remotion project on the latest toolchain + remotion-dev/skills; prints the authoring contract  <!-- Перевод на русский -->|
| `video render` | `--output <format>` | Re-render a run directory from render-spec.json  <!-- Перевод на русский -->|
| `video provider` | `—` |   <!-- Перевод на русский -->|
| `video provider list` | `--output <format>` | List video providers and availability  <!-- Перевод на русский -->|
| `serena` | `—` | Serena MCP language-server lifecycle utilities  <!-- Перевод на русский -->|
| `serena reap` | `--dry-run, --quiet` | Kill idle Serena LSP children to reclaim memory (Serena self-heals on next tool call)  <!-- Перевод на русский -->|
| `serena reaper` | `—` |   <!-- Перевод на русский -->|
| `serena reaper enable` | `--dry-run` | Install the periodic Serena Reaper scheduled task (runs every 5 minutes)  <!-- Перевод на русский -->|
| `serena reaper disable` | `--dry-run` | Uninstall the periodic Serena Reaper scheduled task  <!-- Перевод на русский -->|
| `explain` | `—` | Explain artifact management and quality validation tools  <!-- Перевод на русский -->|
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | Validate self-contained explain HTML report artifacts  <!-- Перевод на русский -->|
| `diagram` | `—` | Diagram engine helpers (archify interactive HTML or Mermaid fallback)  <!-- Перевод на русский -->|
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | Report which diagram engine workflows should use, and where archify lives  <!-- Перевод на русский -->|
| `diagram update` | `--json, --output <format>` | Download the latest archify release into oma's managed cache (~/.cache/oma-diagram/archify)  <!-- Перевод на русский -->|
| `diagram archify` | `—` | Run the installed archify CLI (doctor \| guide \| validate \| deliver \| visual-check …) with update checks disabled  <!-- Перевод на русский -->|
| `help` | `—` | Show help information  <!-- Перевод на русский -->|
| `version` | `—` | Show version number  <!-- Перевод на русский -->|
| `dashboard` | `—` |   <!-- Перевод на русский -->|
| `dashboard terminal` | `—` | Start terminal dashboard (real-time agent monitoring)  <!-- Перевод на русский -->|
| `dashboard web` | `—` | Start web dashboard on http://127.0.0.1:9847  <!-- Перевод на русский -->|
| `auth` | `—` |   <!-- Перевод на русский -->|
| `auth status` | `--json, --output <format>` | Check authentication status of all supported CLIs  <!-- Перевод на русский -->|
| `hook` | `—` |   <!-- Перевод на русский -->|
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | Dispatch a vendor hook event through the centralised oma hook router (design 019)  <!-- Перевод на русский -->|
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | Probe per-vendor L1 hook compatibility and print a matrix (D63)  <!-- Перевод на русский -->|
| `state` | `—` |   <!-- Перевод на русский -->|
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | Append an OMA L1 workflow event  <!-- Перевод на русский -->|
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | Migrate legacy sessions to the home profile and remove verified originals  <!-- Перевод на русский -->|
| `state get` | `--json, --output <format>` | Inspect one OMA L1 session by ID  <!-- Перевод на русский -->|
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspect OMA L1 workflow state  <!-- Перевод на русский -->|
| `state repair` | `--dry-run, --json, --output <format>` | Repair OMA L1 workflow state files  <!-- Перевод на русский -->|
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | Verify required L1 events for a workflow checkpoint  <!-- Перевод на русский -->|
| `state decisions` | `—` |   <!-- Перевод на русский -->|
| `state decisions list` | `--json, --output <format>` | List required L1 decision.made checkpoints  <!-- Перевод на русский -->|
| `state inject-log` | `—` |   <!-- Перевод на русский -->|
| `state inject-log list` | `--entry <file>, --json, --output <format>` | List or view per-boundary inject audit logs (D52)  <!-- Перевод на русский -->|
| `state inject-log get` | `--json, --output <format>` | List or view per-boundary inject audit logs (D52)  <!-- Перевод на русский -->|
| `state summary` | `--category <category>, --json, --output <format>` | Export a session summary to the coordination store  <!-- Перевод на русский -->|
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | Check whether self-healing is allowed for an agent  <!-- Перевод на русский -->|
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspect OMA L1 workflow state  <!-- Перевод на русский -->|
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspect OMA L1 workflow state  <!-- Перевод на русский -->|
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Inspect OMA L1 workflow state  <!-- Перевод на русский -->|
| `ralph` | `—` |   <!-- Перевод на русский -->|
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | Verify ralph EXEC artifacts (anti-circumvention gate, ralph.md Step 1.3)  <!-- Перевод на русский -->|
| `goal` | `—` |   <!-- Перевод на русский -->|
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | Attach a goal contract (deterministic stop gate / wall-clock budget) to an active persistent workflow  <!-- Перевод на русский -->|
| `stats` | `—` |   <!-- Перевод на русский -->|
| `stats get` | `--json, --output <format>` | View productivity metrics  <!-- Перевод на русский -->|
| `stats reset` | `--json, --output <format>` | View productivity metrics  <!-- Перевод на русский -->|
| `agent` | `—` |   <!-- Перевод на русский -->|
| `agent context` | `--project-root <path>, --difficulty <level>` | Load graph-selected context for a native dispatch prompt  <!-- Перевод на русский -->|
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | Resume safe incomplete tasks, reusing current acceptance evidence  <!-- Перевод на русский -->|
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | Start an evidence-backed native agent run  <!-- Перевод на русский -->|
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | Execute verification argv after -- and record its real exit code  <!-- Перевод на русский -->|
| `agent finish` | `--project-root <path>` | Validate a native agent result against its verification receipts  <!-- Перевод на русский -->|
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | Spawn a subagent (prompt can be inline text or a file path)  <!-- Перевод на русский -->|
| `agent status` | `--project-root <path>` | Check status of subagents  <!-- Перевод на русский -->|
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | Run multiple sub-agents in parallel  <!-- Перевод на русский -->|
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | Run code review using external CLI (codex/claude/qwen/grok)  <!-- Перевод на русский -->|
| `model` | `—` |   <!-- Перевод на русский -->|
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | Check model registry against live vendor model lists  <!-- Перевод на русский -->|
| `model probe` | `--json, --timeout <duration>` | Probe a model slug against its vendor CLI to verify it is accepted  <!-- Перевод на русский -->|
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | Run model:check --probe internally and generate an oma-config `models:` patch for accepted candidates  <!-- Перевод на русский -->|
| `memory` | `—` |   <!-- Перевод на русский -->|
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Configure Honcho connection or local embedding credentials  <!-- Перевод на русский -->|
| `memory init` | `--force, --json, --output <format>` | Initialize the coordination store in .agents/state/memories  <!-- Перевод на русский -->|
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | Prepare AgentMemory endpoint configuration  <!-- Перевод на русский -->|
| `memory daemon` | `—` | Manage an OMA-owned AgentMemory daemon process  <!-- Перевод на русский -->|
| `memory daemon status` | `--json, --output <format>` | Show daemon status  <!-- Перевод на русский -->|
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | Start AgentMemory in the background  <!-- Перевод на русский -->|
| `memory daemon stop` | `--dry-run, --json, --output <format>` | Stop the OMA-owned AgentMemory daemon  <!-- Перевод на русский -->|
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | Restart the OMA-owned AgentMemory daemon  <!-- Перевод на русский -->|
| `memory service` | `—` | Manage AgentMemory OS service integration  <!-- Перевод на русский -->|
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | Install AgentMemory launchd/systemd service integration  <!-- Перевод на русский -->|
| `memory service uninstall` | `--dry-run, --json, --output <format>` | Uninstall AgentMemory launchd/systemd service integration  <!-- Перевод на русский -->|
| `memory status` | `--json, --output <format>` | Show selected semantic-memory provider health  <!-- Перевод на русский -->|
| `memory retry` | `—` |   <!-- Перевод на русский -->|
| `memory retry drain` | `--dry-run, --json, --output <format>` | Drain queued AgentMemory observe retries  <!-- Перевод на русский -->|
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | Import vendor conversation history into AgentMemory  <!-- Перевод на русский -->|
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum  <!-- Перевод на русский -->|
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum  <!-- Перевод на русский -->|
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum  <!-- Перевод на русский -->|
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum  <!-- Перевод на русский -->|
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | Garbage-collect project-local memory: prune old L1 sessions and ephemeral Serena files  <!-- Перевод на русский -->|
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | Stop, backup, upgrade, restart, and health-check AgentMemory  <!-- Перевод на русский -->|
| `skill` | `—` | Inspect and audit installed skills  <!-- Перевод на русский -->|
| `skill audit` | `--json, --output <format>` | Check frontmatter description similarity between installed skills  <!-- Перевод на русский -->|
| `skill lint` | `--skill <id>, --json, --output <format>` | Detect per-skill authoring smells (frontmatter, structure, broken refs)  <!-- Перевод на русский -->|
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --require-coverage, --neg-transfer, --json, --output <format>` | Measure per-skill utility lift (treatment vs baseline on held-out tasks)  <!-- Перевод на русский -->|
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --json, --output <format>` | Optimize a skill's SKILL.md to maximize measured held-out utility lift  <!-- Перевод на русский -->|
| `schedule` | `—` |   <!-- Перевод на русский -->|
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | Register a scheduled agent job  <!-- Перевод на русский -->|
| `schedule list` | `--json, --output <format>` | List scheduled jobs with OS drift state (synced/missing-in-os/orphan-in-os), grouped by project  <!-- Перевод на русский -->|
| `schedule delete` | `—` | Remove a scheduled job from manifest and OS scheduler  <!-- Перевод на русский -->|
| `schedule run` | `—` | Execute a scheduled job by id (invoked by OS scheduler; not normally called directly)  <!-- Перевод на русский -->|
| `schedule sync` | `--prune` | Re-sync manifest → OS scheduler. Use --prune to remove orphan OS jobs.  <!-- Перевод на русский -->|
