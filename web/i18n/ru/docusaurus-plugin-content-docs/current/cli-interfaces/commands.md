---
title: "Команды CLI"
description: "Полный справочник всех команд CLI oh-my-agent: синтаксис, параметры и примеры, организованные по категориям."
---

# Команды CLI

Этот справочник перечисляет публичную поверхность CLI oh-my-agent. Имена команд, флаги, пути и примеры команд сохранены точно; описания и рекомендации приведены для русскоязычного читателя.


После глобальной установки (`bun install --global oh-my-agent`), use `oma` or `oh-my-agent`. Для однократного запуска без установки, run `npx oh-my-agent`.

Переменная окружения `OH_MY_AG_OUTPUT_FORMAT` можно задать как `json` чтобы включить машиночитаемый вывод on commands that support it. Это эквивалентно передаче `--json` to each command.

## Начните с задачи

Выбирайте минимальную команду that answers the question you have. Каждая команда ниже выводит путь или отчёт that you can inspect before moving to the next step.

| Задача | Начать здесь | Ожидаемый результат |
|:-----|:-----------|:---------------- <!-- Перевод на русский -->|
| Install or repair a project | `oma install` then `oma doctor` | Installed resources and a health report; use `oma doctor --profile` when model resolution is the question.  <!-- Перевод на русский -->|
| Find a command or option from an agent | `oma describe` or `oma describe "image generate"` | JSON describing arguments, options, and nested commands.  <!-- Перевод на русский -->|
| Generate an image | `oma image generate "<prompt>" --output json` | Image paths and a manifest under `.agents/results/images/`.  <!-- Перевод на русский -->|
| Plan or render video | `oma video generate "<brief>" --dry-run` | A run directory with planning artifacts; compose and render only after the composition is authored.  <!-- Перевод на русский -->|
| Make an interactive code explainer | `/explain` | A validated self-contained HTML artifact under `.agents/results/explain/`.  <!-- Перевод на русский -->|
| Resolve a diagram engine | `oma diagram resolve --output json` | The selected Mermaid or archify engine and its reason.  <!-- Перевод на русский -->|
| Research community signals | `oma market detect-trap "<topic>"` | A preflight result; continue with `oma market resolve --output json` and the upstream run only when it passes.  <!-- Перевод на русский -->|
| Convert or inspect a paper | `oma scholar search "<query>"` | Search results from Knows, OpenAlex, or Semantic Scholar; fetch a sidecar with `oma scholar get`.  <!-- Перевод на русский -->|
| Build a slide deck | `oma slide create --output-dir <dir>` | A working directory that can be authored, validated, bundled, and exported.  <!-- Перевод на русский -->|
| Review documentation drift | `oma docs verify --json` | A structured broken-reference report and regenerated reference index.  <!-- Перевод на русский -->|

Проверенный в репозитории реестр — источник этой карты команд. Канонические имена для обнаружения ниже поступают из `oma describe`; интерактивная справка может показывать алиасы совместимости, например `slide new`, `slide viewer`, `image list-vendors` или `video list-providers`.

## Текущий набор команд

Эта карта упрощает просмотр подробного справочника ниже and и помогает найти редко используемые семейства. Для точной грамматики используйте `--help` or `oma describe <path>` for the exact argument grammar; [CLI Опции](./options.md) содержит полную матрицу флагов реестра.

| Семейство | Зарегистрированные пути |
|:-------|:----------------- <!-- Перевод на русский -->|
| `install` | `install`  <!-- Перевод на русский -->|
| `describe` | `describe`  <!-- Перевод на русский -->|
| `uninstall` | `uninstall`  <!-- Перевод на русский -->|
| `update` | `update`, `update mcp`  <!-- Перевод на русский -->|
| `link` | `link`  <!-- Перевод на русский -->|
| `intel` | `intel`, `intel suggest`  <!-- Перевод на русский -->|
| `market` | `market`, `market detect-trap`, `market resolve`, `market update`, `market run`  <!-- Перевод на русский -->|
| `doctor` | `doctor`  <!-- Перевод на русский -->|
| `profile` | `profile`, `profile list`, `profile show`, `profile create`, `profile use`, `profile run`  <!-- Перевод на русский -->|
| `retro` | `retro`  <!-- Перевод на русский -->|
| `recap` | `recap`  <!-- Перевод на русский -->|
| `docs` | `docs`, `docs verify`, `docs sync`, `docs i18n`, `docs lint`  <!-- Перевод на русский -->|
| `emit` | `emit`  <!-- Перевод на русский -->|
| `cleanup` | `cleanup`  <!-- Перевод на русский -->|
| `bridge` | `bridge`  <!-- Перевод на русский -->|
| `verify` | `verify`, `verify agent`, `verify triggers`  <!-- Перевод на русский -->|
| `vault` | `vault`, `vault store`, `vault get`, `vault list`, `vault delete`  <!-- Перевод на русский -->|
| `star` | `star`  <!-- Перевод на русский -->|
| `visualize` | `visualize`  <!-- Перевод на русский -->|
| `search` | `search`, `search providers`, `search web`, `search fetch`, `search meta`, `search media`, `search archive`, `search trust`, `search code`, `search doctor`, `search api`, `search api fetch`, `search api search`, `search rss`, `search rss fetch`, `search rss google`  <!-- Перевод на русский -->|
| `harness` | `harness`, `harness eval`  <!-- Перевод на русский -->|
| `slide` | `slide`, `slide validate`, `slide bundle`, `slide edit`, `slide doctor`, `slide create`, `slide preview`, `slide export`, `slide export pdf`, `slide export png`, `slide export pptx`, `slide import`, `slide import pptx`, `slide asset`, `slide asset fetch-video`, `slide style`, `slide style list`, `slide style preview`, `slide style get`  <!-- Перевод на русский -->|
| `scholar` | `scholar`, `scholar search`, `scholar resolve`, `scholar get`, `scholar lint`  <!-- Перевод на русский -->|
| `image` | `image`, `image generate`, `image doctor`, `image vendor`, `image vendor list`  <!-- Перевод на русский -->|
| `video` | `video`, `video generate`, `video doctor`, `video compose`, `video render`, `video provider`, `video provider list`  <!-- Перевод на русский -->|
| `serena` | `serena`, `serena reap`, `serena reaper`, `serena reaper enable`, `serena reaper disable`  <!-- Перевод на русский -->|
| `explain` | `explain`, `explain validate`  <!-- Перевод на русский -->|
| `diagram` | `diagram`, `diagram resolve`, `diagram update`, `diagram archify`  <!-- Перевод на русский -->|
| `help` | `help`  <!-- Перевод на русский -->|
| `version` | `version`  <!-- Перевод на русский -->|
| `dashboard` | `dashboard`, `dashboard terminal`, `dashboard web`  <!-- Перевод на русский -->|
| `auth` | `auth`, `auth status`  <!-- Перевод на русский -->|
| `hook` | `hook`, `hook run`, `hook probe`  <!-- Перевод на русский -->|
| `state` | `state`, `state emit`, `state migrate`, `state get`, `state list`, `state repair`, `state verify`, `state decisions`, `state decisions list`, `state inject-log`, `state inject-log list`, `state inject-log get`, `state summary`, `state heal-check`, `state activate`, `state archive`, `state purge`  <!-- Перевод на русский -->|
| `ralph` | `ralph`, `ralph verify`  <!-- Перевод на русский -->|
| `goal` | `goal`, `goal set`  <!-- Перевод на русский -->|
| `stats` | `stats`, `stats get`, `stats reset`  <!-- Перевод на русский -->|
| `agent` | `agent`, `agent context`, `agent resume`, `agent begin`, `agent verify`, `agent finish`, `agent spawn`, `agent status`, `agent parallel`, `agent review`  <!-- Перевод на русский -->|
| `model` | `model`, `model check`, `model probe`, `model propose`  <!-- Перевод на русский -->|
| `memory` | `memory`, `memory keys`, `memory init`, `memory setup`, `memory daemon`, `memory daemon status`, `memory daemon start`, `memory daemon stop`, `memory daemon restart`, `memory service`, `memory service install`, `memory service uninstall`, `memory status`, `memory retry`, `memory retry drain`, `memory import`, `memory maintain`, `memory maintain backup`, `memory maintain prune`, `memory maintain vacuum`, `memory gc`, `memory upgrade`  <!-- Перевод на русский -->|
| `skill` | `skill`, `skill audit`, `skill lint`, `skill eval`, `skill optimize`  <!-- Перевод на русский -->|
| `schedule` | `schedule`, `schedule create`, `schedule list`, `schedule delete`, `schedule run`, `schedule sync`  <!-- Перевод на русский -->|

Когда команда передаёт оставшиеся аргументы другому инструменту, реестр намеренно оставляет её параметры открытыми. This applies to `market run` and `diagram archify`; перед изменяющей состояние или сетевой операцией прочитайте справку upstream.

---

## Настройка и установка

### install

`oma` with no arguments launches the interactive installer. `oma install` is the explicit form and accepts provider-selection options. <!-- Перевод на русский -->

```
oma
oma install
oma install --web-search native --code-intelligence gortex --semantic-memory agent-memory
```

`--web-search`, `--code-intelligence`, and `--semantic-memory` retain the saved provider choice when omitted. `--honcho-url` and `--honcho-workspace` configure a new Honcho connection when that provider is selected. The root `-y, --yes` flag skips prompts and uses defaults; `--global` targets the HOME install. <!-- Перевод на русский -->

**Что делает команда:**
1. Checks for legacy `.agent/` directory and migrates to `.agents/` if found. <!-- Перевод на русский -->
2. Detects and offers to remove competing tools. <!-- Перевод на русский -->
3. Prompts for project type (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom). <!-- Перевод на русский -->
4. If backend is selected, prompts for language variant (Python, Node.js, Rust, Other). <!-- Перевод на русский -->
5. Asks about GitHub Copilot symlinks. <!-- Перевод на русский -->
6. Downloads the latest tarball from the registry. <!-- Перевод на русский -->
7. Installs shared resources, workflows, configs, and selected skills. <!-- Перевод на русский -->
8. Installs vendor adaptations for selected vendors (project-local settings; no silent HOME-level vendor writes). <!-- Перевод на русский -->
9. Creates CLI symlinks. <!-- Перевод на русский -->
10. Offers recommended **global** git config (opt-in confirm): <!-- Перевод на русский -->
    - `rerere.enabled=true` — multi-agent merge conflict reuse <!-- Перевод на русский -->
    - `init.defaultBranch=main` — consistent default branch for new repos <!-- Перевод на русский -->
    - Skipped entirely under `--yes` / CI (prints manual fix hints instead) <!-- Перевод на русский -->
11. Offers to configure MCP where applicable. <!-- Перевод на русский -->
12. Prompts for GitHub star if `gh` is authenticated. <!-- Перевод на русский -->

**Example:** <!-- Перевод на русский -->
```bash
cd /path/to/my-project
oma
# Follow the interactive prompts
```

### doctor

Проверка установок CLI, конфигураций MCP и состояния навыков.

```
oma doctor [--json] [--output <format>] [--profile]
```

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--json` | Output as JSON  <!-- Перевод на русский -->|
| `--output <format>` | Output format (`text` or `json`)  <!-- Перевод на русский -->|
| `--profile` | Show profile health matrix. Displays the resolved model slug, CLI, and auth status per agent from the active `model_preset` and `agents:` overrides. See [Per-Agent Models](../guide/per-agent-models.md).  <!-- Перевод на русский -->|

**Что проверяется:**
- CLI installations: agy, claude, codex, qwen (version and path). <!-- Перевод на русский -->
- Authentication status for each CLI. <!-- Перевод на русский -->
- MCP configuration: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`. <!-- Перевод на русский -->
- Installed skills: which skills are present and their status. <!-- Перевод на русский -->
- Memory store directory: `.agents/state/memories/` existence and file count (older projects fall back to the legacy `.serena/memories/` path). <!-- Перевод на русский -->
- Dual install markers (project vs global) and related warnings. <!-- Перевод на русский -->
- Recommended **global** git config (`gitRecommended` in JSON): <!-- Перевод на русский -->
  - `rerere.enabled=true` <!-- Перевод на русский -->
  - `init.defaultBranch=main` <!-- Перевод на русский -->
  - Each mismatch counts toward `totalIssues` <!-- Перевод на русский -->
- Project vendor context files (e.g. `CLAUDE.md` / `AGENTS.md` OMA blocks when the matching CLI is installed). <!-- Перевод на русский -->
- AgentMemory, state/hooks health, Serena reaper diagnostics, and related issue counters. <!-- Перевод на русский -->

**Auto-repair:** If missing skills are detected, `doctor` offers to install them interactively. If recommended git config is missing or wrong, it offers the same opt-in global fixes used by install/update. <!-- Перевод на русский -->

**Примеры:**
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

Обновляет навыки до последней версии из реестра.

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
```

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `-f, --force` | Overwrite user-customized config files (`oma-config.yaml`, `mcp.json`, `stack/` directories)  <!-- Перевод на русский -->|
| `--with-new-skills` | Install skills that are new in this release; without it, refresh only skills already installed.  <!-- Перевод на русский -->|
| `--ci` | Run in non-interactive CI mode (skip prompts, plain text output)  <!-- Перевод на русский -->|
| `-y, --yes` | Skip prompts. Vendor scope is unchanged: only existing vendor directories are updated unless `--all` or `--vendor` is provided.  <!-- Перевод на русский -->|
| `--all` | Create/update all supported project-scoped vendors.  <!-- Перевод на русский -->|
| `--vendor <vendors>` | Create/update specific vendors. Accepts a comma-separated list such as `claude,qwen`.  <!-- Перевод на русский -->|

**Что делает команда:**
1. Fetches `prompt-manifest.json` from the registry to check the latest version. <!-- Перевод на русский -->
2. Compares with the local version in `.agents/skills/_version.json`. <!-- Перевод на русский -->
3. If already up to date, exits. <!-- Перевод на русский -->
4. Downloads and extracts the latest tarball. <!-- Перевод на русский -->
5. Preserves user-customized files (unless `--force`). <!-- Перевод на русский -->
6. Copies new files over `.agents/`. <!-- Перевод на русский -->
7. Restores preserved files. <!-- Перевод на русский -->
8. Updates vendor adaptations and refreshes symlinks. By default this only touches vendor directories that already exist in the project. <!-- Перевод на русский -->
9. Offers recommended **global** git config (same opt-in as install: `rerere.enabled`, `init.defaultBranch`). Skipped under `--yes` / `--ci`. <!-- Перевод на русский -->

**Примеры:**
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

# Also refresh browser MCP selections
oma update mcp --ci
```

`oma update mcp` has its own `--yes`, `--ci`, `--all`, and `--vendor <vendors>` options. It selects supported browser MCP servers (Aside, Chrome DevTools, or Firefox DevTools) for the chosen project-scoped vendors. <!-- Перевод на русский -->

### uninstall

Предварительно просматривает или удаляет файлы OMA из выбранного корня установки:

```
oma uninstall --dry-run
oma uninstall --yes
```

`--dry-run` lists removals without changing files. `--yes` skips the confirmation prompt. The command preserves `oma-config.yaml`, `mcp.json`, and user-authored skills according to the registered command description. If the preview includes a file you still need, stop and keep the dry-run output for review. <!-- Перевод на русский -->

### link

Regenerate vendor-native files from the `.agents/` source of truth without reinstalling. <!-- Перевод на русский -->

```
oma link [vendors...] [--global]
```

**Примеры:**

```bash
# Regenerate all configured vendors
oma link

# Regenerate only Claude and Codex files
oma link claude codex

# Regenerate the HOME install (~/.agents/) from any directory
oma link opencode --global
```

Without `--global`, link targets `<cwd>/.agents/`; with it, `~/.agents/` (or `OMA_HOME`). See [Global install](../guide/global-install.md). <!-- Перевод на русский -->

**Что делает команда:**
1. Rebuilds vendor-native agent files from `.agents/agents/` <!-- Перевод на русский -->
2. Refreshes hooks and local settings for the selected vendors <!-- Перевод на русский -->
3. Regenerates `CLAUDE.md`, `GEMINI.md`, or `AGENTS.md` integration blocks <!-- Перевод на русский -->
4. Refreshes Cursor MCP linkage and CLI skill symlinks when relevant <!-- Перевод на русский -->

Use this after editing `.agents/agents/`, `.agents/workflows/`, `.agents/rules/`, or hook definitions. <!-- Перевод на русский -->

**Model behavior:** <!-- Перевод на русский -->
- Same-vendor native dispatch uses the model defined in the generated vendor agent file. <!-- Перевод на русский -->
- External fallback dispatch uses each vendor's `default_model` from `.agents/skills/oma-orchestration/config/cli-config.yaml`. <!-- Перевод на русский -->

**Dispatch behavior:** <!-- Перевод на русский -->
- If the target vendor matches the current runtime and that runtime supports native role agents, OMA uses native dispatch. <!-- Перевод на русский -->
- Otherwise OMA falls back to `oma agent spawn`. <!-- Перевод на русский -->

### setup (рабочий процесс)

The `/setup` workflow (invoked inside an agent session) provides interactive configuration of language, CLI installations, MCP connections, and agent-CLI mapping. This is different from `oma` (the installer): `/setup` configures an already-installed instance. <!-- Перевод на русский -->
---

## Мониторинг и метрики

### dashboard

Запускает терминальный дашборд для мониторинга агентов в реальном времени.

```
oma dashboard terminal
```

Опций нет. Watches `.agents/state/memories/` in the current directory (older projects fall back to the legacy `.serena/memories/` path). Renders a box-drawing UI with session status, agent table, and activity feed. Updates on every file change. Press `Ctrl+C` to exit.

The memories directory can be overridden with the `MEMORIES_DIR` environment variable. <!-- Перевод на русский -->

**Example:** <!-- Перевод на русский -->
```bash
# Standard usage
oma dashboard terminal

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal
```

### dashboard web

Запускает веб-дашборд.

```
oma dashboard web
```

Starts an HTTP server on `http://localhost:9847` with a WebSocket connection for live updates. Open the URL in a browser to see the dashboard. <!-- Перевод на русский -->

**Переменные окружения:**

| Переменная | По умолчанию | Описание |
|:---------|:--------|:----------- <!-- Перевод на русский -->|
| `DASHBOARD_PORT` | `9847` | Port for the HTTP/WebSocket server  <!-- Перевод на русский -->|
| `MEMORIES_DIR` | `{cwd}/.agents/state/memories` | Path to the memories directory (falls back to the legacy `{cwd}/.serena/memories` for older projects)  <!-- Перевод на русский -->|

**Example:** <!-- Перевод на русский -->
```bash
# Standard usage
oma dashboard web

# Custom port
DASHBOARD_PORT=8080 oma dashboard web
```

### stats

Показывает метрики продуктивности.

```
oma stats get [--json] [--output <format>]
oma stats reset [--json] [--output <format>]
```

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--json` | Output as JSON  <!-- Перевод на русский -->|
| `--output <format>` | Output format (`text` or `json`)  <!-- Перевод на русский -->|

**Отслеживаемые метрики:**
- Session count <!-- Перевод на русский -->
- Skills used (with frequency) <!-- Перевод на русский -->
- Задачаs completed
- Total session time <!-- Перевод на русский -->
- Files changed, lines added, lines removed <!-- Перевод на русский -->
- Last updated timestamp <!-- Перевод на русский -->

**Cost telemetry** (aggregated across every `session-cost-*.md` file under `.agents/state/memories/`): <!-- Перевод на русский -->
- Total input tokens (prompt character approximation, no output tokens yet) <!-- Перевод на русский -->
- Total spawns <!-- Перевод на русский -->
- Estimated USD using a conservative per-vendor input-token rate table (Claude $3/M, Codex $5/M, Gemini $0.3/M, Qwen $0/M, Cursor $5/M, Antigravity $0.3/M) <!-- Перевод на русский -->
- Per-vendor breakdown (tokens · spawns · USD) <!-- Перевод на русский -->

The estimate is a floor, not a billing-accurate amount. Configure `session.quota_cap` in `.agents/oma-config.yaml` to enforce hard budgets at spawn time; see the Why oh-my-agent page in Getting Started for the quality-first arsenal these caps belong to. <!-- Перевод на русский -->

Metrics are stored in `.agents/state/metrics.json`; a legacy `.serena/metrics.json` is read when present. Data is collected from git stats and memory files. <!-- Перевод на русский -->

**Примеры:**
```bash
# View current metrics
oma stats get

# JSON output
oma stats get --json

# Reset all metrics
oma stats reset
```

### recap

Сводит историю разговоров AI-инструментов в сессиях Claude, Codex, Qwen и Cursor.

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**Параметры:**

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:-------- <!-- Перевод на русский -->|
| `--window <period>` | Time window: `1d`, `3d`, `7d`, `2w`, `30d` | `1d`  <!-- Перевод на русский -->|
| `--date <date>` | Specific date (`YYYY-MM-DD`); takes precedence over `--window` |  <!-- Перевод на русский -->|
| `--tool <tools>` | Comma-separated filter: `grok,claude,codex,qwen,cursor,antigravity` | all  <!-- Перевод на русский -->|
| `--top <n>` | Show top N projects/topics |  <!-- Перевод на русский -->|
| `--sort <metric>` | Sort by `count` or `duration` | `count`  <!-- Перевод на русский -->|
| `--mermaid` | Output as Mermaid Gantt chart |  <!-- Перевод на русский -->|
| `--graph` | Open interactive graph in the browser |  <!-- Перевод на русский -->|
| `--json` / `--output <format>` | Machine-readable output | `text`  <!-- Перевод на русский -->|

**Примеры:**

```bash
oma recap                                     # Today (1d)
oma recap --window 7d                         # Last week
oma recap --date 2026-04-20 --tool grok,claude
oma recap --window 7d --mermaid > week.mmd
oma recap --window 30d --graph                # Interactive browser graph
```

### retro

Инженерная ретроспектива с метриками и трендами.

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**Аргументы:**

| Аргумент | Описание | По умолчанию |
|:---------|:-----------|:-------- <!-- Перевод на русский -->|
| `window` | Time window for analysis (e.g., `7d`, `2w`, `1m`) | Last 7 days  <!-- Перевод на русский -->|

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--json` | Output as JSON  <!-- Перевод на русский -->|
| `--output <format>` | Output format (`text` or `json`)  <!-- Перевод на русский -->|
| `--interactive` | Interactive mode with manual entry  <!-- Перевод на русский -->|
| `--compare` | Compare current window vs prior same-length window  <!-- Перевод на русский -->|

**Что показывает:**
- Tweetable summary (one-line metrics) <!-- Перевод на русский -->
- Summary table (commits, files changed, lines added/removed, contributors) <!-- Перевод на русский -->
- Trends vs last retro (if previous snapshot exists) <!-- Перевод на русский -->
- Contributor leaderboard <!-- Перевод на русский -->
- Commit time distribution (hourly histogram) <!-- Перевод на русский -->
- Work sessions <!-- Перевод на русский -->
- Commit types breakdown (feat, fix, chore, etc.) <!-- Перевод на русский -->
- Hotspots (most-changed files) <!-- Перевод на русский -->

**Примеры:**
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

## Сессии и локальные профили

### state list

List the current project's OMA workflow sessions. Explicit global discovery <!-- Перевод на русский -->
lists sessions across projects within the selected local profile: <!-- Перевод на русский -->

```bash
oma state list
oma state list --all-projects --json
oma state list --all-projects --project /path/to/project
oma state list --all-projects --search migration
```

`--all-projects` is read-only. It cannot be combined with session activation or <!-- Перевод на русский -->
maintenance. Normal session reads and writes retain their project scope. <!-- Перевод на русский -->
Other repositories' legacy sessions must first migrate to home storage before <!-- Перевод на русский -->
they appear in the aggregate listing. <!-- Перевод на русский -->

### profile

Управляет профилями локального хранилища under `~/.oma/u/<slot>/`. Slots are
non-negative decimal integers; they are separate from model presets and <!-- Перевод на русский -->
provider login accounts. <!-- Перевод на русский -->

```bash
oma profile list --json
oma profile create 1
oma profile show
eval "$(oma profile use 1 --shell zsh)"
oma profile show
oma profile run 1 -- oma state list --all-projects --json
```

`profile use` prints shell activation; evaluating it sets `OMA_PROFILE` in the <!-- Перевод на русский -->
current shell. It does not modify the parent shell when run on its own, change <!-- Перевод на русский -->
already-running applications, or save a separate CLI-only default. CLI commands <!-- Перевод на русский -->
and vendor hooks started from the activated shell inherit the same profile. <!-- Перевод на русский -->
The default is profile `0`; `OMA_STATE_HOME` overrides the storage root. <!-- Перевод на русский -->
`profile run <slot> -- <command> [args...]` selects the profile for only that <!-- Перевод на русский -->
command and its children. The separator keeps child options such as `--help` <!-- Перевод на русский -->
and `--json` attached to the child command. <!-- Перевод на русский -->

---

## Управление агентами

### agent spawn

Запускает процесс субагента.

```
oma agent spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>] [--isolation <mode>]
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|:---------|:---------|:----------- <!-- Перевод на русский -->|
| `agent-id` | Yes | Agent type. One of: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`  <!-- Перевод на русский -->|
| `prompt` | Yes | Задача description. Can be inline text or a path to a file. |
| `session-id` | Yes | Session identifier (format: `session-YYYYMMDD-HHMMSS`)  <!-- Перевод на русский -->|

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--vendor <vendor>` | CLI vendor override: `antigravity`, `claude`, `codex`, `cursor`, `qwen`, `grok`, `pi`  <!-- Перевод на русский -->|
| `-w, --workspace <path>` | Working directory for the agent. Auto-detected from monorepo config if omitted.  <!-- Перевод на русский -->|
| `--isolation <mode>` | Per-spawn isolation mode. Currently supports `worktree`: creates a fresh git worktree at `${tmpdir}/oma-worktrees/{sessionId}/{agentId}` on branch `oma/{sessionId}/{agentId}` and runs the agent there. The worktree is retained after exit; merge or discard commands are printed for manual review (no auto-merge).  <!-- Перевод на русский -->|
| `--read-only` | Restrict the spawned agent to non-destructive tools (suppresses auto-approve flags). Used internally by `oma skill eval --live` for both eval arms.  <!-- Перевод на русский -->|
| `--fallback-vendors <vendors>` | Opt in to an ordered, comma-separated chain of up to three configured CLI vendors. Continuation requires a recognized quota/rate-limit/transient failure and a fresh safe-handoff checkpoint.  <!-- Перевод на русский -->|

**Vendor resolution order:** `--vendor` flag > `agents:` override in `oma-config.yaml` > active `model_preset` agent defaults. <!-- Перевод на русский -->

**Prompt resolution:** If the prompt argument is a path to an existing file, the file contents are used as the prompt. Otherwise, the argument is used as inline text. Vendor-specific execution protocols are appended automatically. <!-- Перевод на русский -->

**Exit codes:** <!-- Перевод на русский -->

| Code | Значение |
|:-----|:-------- <!-- Перевод на русский -->|
| `0` | Vendor process exited 0 and a session result artifact exists under the workspace.  <!-- Перевод на русский -->|
| `3` | Vendor process exited 0 but wrote **no session result artifact** under the workspace (e.g. agy writing into its own trusted root instead of `-w`). A `blocker.raised` event is appended to the session trail and `agent status` reports `no-artifact`. Do not treat the spawn as completed.  <!-- Перевод на русский -->|
| other | The vendor process itself failed; its exit code is passed through.  <!-- Перевод на русский -->|

**Примеры:**
```bash
# Inline prompt, auto-detect workspace
oma agent spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# Prompt from file, explicit workspace
oma agent spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# Override vendor to Claude
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude -w ./api

# Allow a prepared task handoff to another configured vendor
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude --fallback-vendors codex,qwen -w ./api

# Mobile agent with auto-detected workspace
oma agent spawn mobile "Add biometric login" session-20260324-143000

# Run inside an isolated git worktree (useful for hypothesis spawns or
# when parallel agents would touch shared files)
oma agent spawn backend "Try a Drizzle-based rewrite" session-20260324-143000 --isolation worktree
```

**Переключение поставщика:** fallback candidates must have a vendor entry in the
installed CLI configuration. Each attempt uses its target vendor's model <!-- Перевод на русский -->
configuration and passes through the existing session quota checks. The `pi` <!-- Перевод на русский -->
multi-provider proxy is excluded from this initial vendor fallback feature. <!-- Перевод на русский -->
No additional provider credentials or paid API route are created. <!-- Перевод на русский -->

When failover is enabled, the task receives instructions to prepare a <!-- Перевод на русский -->
run-specific safe-handoff record under `.agents/results/`. A successor reads <!-- Перевод на русский -->
that record and checks the workspace before continuing the remaining work. <!-- Перевод на русский -->
Quota exhaustion without a usable checkpoint stops with a needs-review <!-- Перевод на русский -->
record. Cancellation, ordinary task failures, and completed runs do not start <!-- Перевод на русский -->
another attempt. `--read-only` does not waive the checkpoint requirement. <!-- Перевод на русский -->

Session events record the transition reason and source/target vendors; each <!-- Перевод на русский -->
attempt has its own run identity and the successor links to its predecessor. <!-- Перевод на русский -->
This applies to subprocesses launched by `oma agent spawn`; it does not <!-- Перевод на русский -->
automatically switch an existing interactive conversation in a vendor app. <!-- Перевод на русский -->
Omitting `--fallback-vendors` preserves the usual single-vendor execution. <!-- Перевод на русский -->

### agent status

Проверяет состояние одного или нескольких субагентов.

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|:---------|:---------|:----------- <!-- Перевод на русский -->|
| `session-id` | Yes | The session ID to check  <!-- Перевод на русский -->|
| `agent-ids` | No | Space-separated list of agent IDs. If omitted, no output.  <!-- Перевод на русский -->|

**Параметры:**

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:-------- <!-- Перевод на русский -->|
| `-r, --root <path>` | Root path for memory checks | Current directory  <!-- Перевод на русский -->|

**Значения состояния:**
- `completed`: Result file exists (with optional status header). <!-- Перевод на русский -->
- `running`: PID file exists and process is alive. <!-- Перевод на русский -->
- `crashed`: PID file exists but process is dead, or no PID/result file found. <!-- Перевод на русский -->
- `no-artifact`: Vendor process exited 0 but wrote no session result artifact under the workspace (silent misdirected write — see `agent spawn` exit code `3`). Treat as a failed spawn. <!-- Перевод на русский -->

**Формат вывода:** One line per agent: `{agent-id}:{status}`

**Примеры:**
```bash
# Check specific agents
oma agent status session-20260324-143000 backend frontend

# Output:
# backend:running
# frontend:completed

# Check with custom root
oma agent status session-20260324-143000 qa -r /path/to/project
```

### agent parallel

Запускает несколько субагентов параллельно.

```
oma agent parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|:---------|:---------|:----------- <!-- Перевод на русский -->|
| `tasks` | Yes | Either a YAML tasks file path, or (with `--inline`) inline task specs  <!-- Перевод на русский -->|

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--vendor <vendor>` | CLI vendor override for all agents  <!-- Перевод на русский -->|
| `-i, --inline` | Inline mode: specify tasks as `agent:task[:workspace]` arguments  <!-- Перевод на русский -->|
| `--no-wait` | Background mode (start agents and return immediately)  <!-- Перевод на русский -->|

**YAML tasks file format:** <!-- Перевод на русский -->
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional, auto-detected if omitted
- agent: frontend
task: "Build user dashboard"
workspace: ./web
```

**Inline task format:** `agent:task` or `agent:task:workspace` (workspace must start with `./` or `/`). <!-- Перевод на русский -->

**Results directory:** `.agents/results/parallel-{timestamp}/` contains log files for each agent. <!-- Перевод на русский -->

**Примеры:**
```bash
# From YAML file
oma agent parallel tasks.yaml

# Inline mode
oma agent parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# Background mode (no wait)
oma agent parallel tasks.yaml --no-wait

# Override vendor for all agents
oma agent parallel tasks.yaml --vendor claude
```

### agent review

Запускает ревью кода через внешний AI CLI (codex, claude, qwen, or grok).

```
oma agent review [--vendor <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--vendor <vendor>` | CLI vendor to use: `codex`, `claude`, `qwen`, or `grok`. По умолчаниюs to `codex` when the resolved config vendor is unsupported. |
| `-p, --prompt <prompt>` | Custom review prompt. If omitted, a default code review prompt is used.  <!-- Перевод на русский -->|
| `-w, --workspace <path>` | Path to review. По умолчаниюs to the current working directory. |
| `--no-uncommitted` | Skip uncommitted changes review. When set, only committed changes in the session are reviewed.  <!-- Перевод на русский -->|

**Что делает команда:**
- Detects the current session ID automatically from the environment or recent git activity. <!-- Перевод на русский -->
- For `codex`: uses the native `codex review` subcommand. <!-- Перевод на русский -->
- For `claude`, `qwen`: constructs a prompt-based review request and invokes the CLI with the review prompt. <!-- Перевод на русский -->
- By default, reviews uncommitted changes in the working directory. <!-- Перевод на русский -->
- With `--no-uncommitted`, restricts review to changes committed within the current session. <!-- Перевод на русский -->

**Примеры:**
```bash
# Review uncommitted changes with default vendor
oma agent review

# Review with codex (uses native codex review command)
oma agent review --vendor codex

# Review with claude using a custom prompt
oma agent review --vendor claude -p "Focus on security vulnerabilities and input validation"

# Review a specific path
oma agent review -w ./apps/api

# Review only committed changes (skip working tree)
oma agent review --no-uncommitted

# Review committed changes in a specific workspace with qwen
oma agent review --vendor qwen -w ./apps/web --no-uncommitted
```

### goal set

Прикрепляет контракт цели к активному постоянному рабочему процессу (orchestrate, ultrawork, work, ralph). The contract is enforced mechanically by the persistent-mode Stop hook — completion stops being a model judgment call.

```
oma goal set [--workflow <name>] [--session-id <id>] [--gate <keyword>] [--budget-minutes <n>] [--description <text>]
```

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--gate <keyword>` | Deterministic stop gate: `typecheck`, `test`, or `lint`. Maps to the package.json script of the same name, run as an argv array with no shell. While set, the Stop hook allows the workflow to end **only when this script passes**; on failure it blocks with the output tail so the agent knows what to fix. Free-form commands are rejected — the gate value lives in an agent-writable state file, so executing arbitrary strings from it would bypass the permission layer.  <!-- Перевод на русский -->|
| `--budget-minutes <n>` | Wall-clock budget measured from workflow activation. When exceeded, the Stop hook deactivates the workflow and allows an honest partial stop (machine verdict, recorded as `gate.failed` with `gate: "budget"` on the session event trail).  <!-- Перевод на русский -->|
| `--description <text>` | Human description of the objective. Informational only.  <!-- Перевод на русский -->|
| `--workflow <name>` | Target workflow when several persistent workflows are active.  <!-- Перевод на русский -->|
| `--session <id>` | Target session id suffix of the state file.  <!-- Перевод на русский -->|

**Примечания о поведении:**
- Gate pass → workflow deactivates, `gate.passed` is emitted, the stop is allowed. <!-- Перевод на русский -->
- Gate failure and timeout (60s hard cap) both count toward the reinforcement limit (5), so a permanently red gate cannot block stops forever; the 2-hour staleness expiry remains as the final backstop. <!-- Перевод на русский -->
- Without a goal contract, persistent mode behaves exactly as before (reinforcement prompts only) — the contract is fully opt-in. <!-- Перевод на русский -->

**Примеры:**
```bash
# After starting /ultrawork: require typecheck to pass before the session may end
oma goal set --gate typecheck

# Bound an autonomous run: stop honestly after 2 hours even if incomplete
oma goal set --workflow ultrawork --gate test --budget-minutes 120
```

---

## Планируемые агенты

### schedule create

Регистрирует запланированную задачу агента. Exactly one of `--cron` or `--every` is required.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [-m <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>]
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|:---------|:---------|:----------- <!-- Перевод на русский -->|
| `agent-id` | Yes | Agent type: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`  <!-- Перевод на русский -->|
| `prompt` | Yes | Задача description passed to the agent at fire time |

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--cron "<expr>"` | 5-field cron expression (e.g. `"0 9 * * *"`). Mutually exclusive with `--every`.  <!-- Перевод на русский -->|
| `--every "<phrase>"` | Natural-language interval: `5m`, `2h`, `1d`, `every 20m`, `every 5 minutes`. Rounds to nearest cron-expressible step and prints a note. Mutually exclusive with `--cron`.  <!-- Перевод на русский -->|
| `--vendor <vendor>` | CLI vendor override passed to `oma agent spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. По умолчаниюs to auto-detect. |
| `-w, --workspace <path>` | Working directory for the agent. По умолчаниюs to current directory at registration time. |
| `--once` | One-shot mode: fires once, then self-removes.  <!-- Перевод на русский -->|
| `--expires-after <duration>` | Auto-expire recurring job after N days (`0` = indefinite).  <!-- Перевод на русский -->|
| `--env <KEY1,KEY2>` | Capture named env vars into `~/.agents/schedule/env/<id>` (0600) for injection at run time. Only listed keys are captured; never a full env dump.  <!-- Перевод на русский -->|

**Что делает команда:**
1. Parses and validates the cron expression (or converts the `--every` phrase to cron). <!-- Перевод на русский -->
2. Writes the job to `~/.agents/schedule/schedules.json` (global manifest, permissions 0600). <!-- Перевод на русский -->
3. Registers the job with the OS scheduler (launchd / systemd --user / schtasks). The OS job calls `oma schedule run <id>` at the configured interval. <!-- Перевод на русский -->

**Примеры:**
```bash
# Exact cron: weekdays at 9 AM
oma schedule create qa-reviewer "Run QA review on latest changes" --cron "0 9 * * 1-5"

# Natural language: every 2 hours
oma schedule create backend "Check for slow queries" --every "2h"

# One-shot, pinned vendor and workspace
oma schedule create pm "Generate sprint plan" --cron "0 9 * * 1" --once --vendor claude -w /path/to/project

# Capture specific env vars for the job
oma schedule create backend "Sync external data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

See the [Scheduled Agents guide](../guide/scheduled-agents.md) for a full walkthrough. <!-- Перевод на русский -->

### schedule list

Перечисляет запланированные задачи всех проектов, grouped by project, with OS drift state.

```
oma schedule list [--json]
```

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--json` | Output as JSON  <!-- Перевод на русский -->|

**Drift states:** `synced` (manifest + OS agree), `missing-in-os` (run `schedule sync` to repair), `orphan-in-os` (OS has a job not in manifest; run `schedule sync --prune` to remove). <!-- Перевод на русский -->

**Примеры:**
```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

### schedule delete

Удаляет запланированную задачу из манифеста и планировщика ОС.

```
oma schedule delete <id>
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|:---------|:---------|:----------- <!-- Перевод на русский -->|
| `id` | Yes | Job ID from `schedule list` (format: `sch_<base32-12>`)  <!-- Перевод на русский -->|

**Example:** <!-- Перевод на русский -->
```bash
oma schedule delete sch_abc123def456
```

### schedule run

Выполняет запланированную задачу по идентификатору. This is the entry point called by the OS scheduler at fire time. Not normally invoked by hand, but can be used to debug a job.

```
oma schedule run <id>
```

**Что делает команда:**
1. Looks up `<id>` in the manifest (exits non-zero if not found). <!-- Перевод на русский -->
2. Loads captured env vars from `~/.agents/schedule/env/<id>` and injects them. <!-- Перевод на русский -->
3. Calls `oma agent spawn <agentId> <prompt> <sessionId> --vendor <vendor> -w <workspace>`. <!-- Перевод на русский -->
4. Writes the result to `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`. <!-- Перевод на русский -->
5. Updates `lastFiredAt` in the manifest; self-removes if job is `--once`. <!-- Перевод на русский -->
6. Loud-fails on auth expiry: exits non-zero and prints `re-auth required: <vendor>` to stderr. Never silently succeeds. <!-- Перевод на русский -->

**Example:** <!-- Перевод на русский -->
```bash
# Invoke manually to debug a job
oma schedule run sch_abc123def456
```

### schedule sync

Повторно синхронизирует манифест с планировщиком ОС. Repairs drift after system migrations or OS scheduler resets.

```
oma schedule sync [--prune]
```

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--prune` | Also remove OS jobs not present in the manifest (orphan-in-os). Without `--prune`, orphans are reported but not removed.  <!-- Перевод на русский -->|

**Примеры:**
```bash
# Repair missing-in-os jobs
oma schedule sync

# Repair missing-in-os AND remove orphans
oma schedule sync --prune
```

---

## Управление памятью

### memory init

Инициализирует схему хранилища памяти координации.

```
oma memory init [--json] [--output <format>] [--force]
```

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--json` | Output as JSON  <!-- Перевод на русский -->|
| `--output <format>` | Output format (`text` or `json`)  <!-- Перевод на русский -->|
| `--force` | Overwrite empty or existing schema files  <!-- Перевод на русский -->|

**Что делает команда:** Creates the `.agents/state/memories/` directory structure with initial schema files that agents and workflows use for reading and writing coordination state.

**Примеры:**
```bash
# Initialize memory
oma memory init

# Force overwrite existing schema
oma memory init --force
```

---

## Интеграция и утилиты

### auth status

Проверяет состояние аутентификации всех поддерживаемых CLI.

```
oma auth status [--json] [--output <format>]
```

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--json` | Output as JSON  <!-- Перевод на русский -->|
| `--output <format>` | Output format (`text` or `json`)  <!-- Перевод на русский -->|

**Checks:** GitHub CLI (`gh`), Antigravity CLI (`agy`), Gemini CLI, Claude CLI, Codex CLI, Cursor CLI, Qwen CLI. <!-- Перевод на русский -->

**Примеры:**
```bash
oma auth status
oma auth status --json
```

### bridge

Проксирует MCP stdio к общему серверу Serena проекта.

```
oma bridge [url] [--context <name>]
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|:---------|:---------|:----------- <!-- Перевод на русский -->|
| `url` | No | Connect to a caller-managed endpoint instead of resolving a shared daemon  <!-- Перевод на русский -->|
| `--context` | No | Serena context for the daemon (default `ide`); daemons are keyed by it  <!-- Перевод на русский -->|

**Что делает команда:** This is what every vendor's serena MCP entry runs by default —
you do not invoke it by hand. Serena's stdio transport gives each agent session <!-- Перевод на русский -->
its own Python process plus a full language-server stack, so the cost scales <!-- Перевод на русский -->
with the number of open sessions. The bridge collapses that to one server per <!-- Перевод на русский -->
project: it resolves the project root from the working directory, starts a <!-- Перевод на русский -->
`--project`-pinned Serena HTTP server if none is running, and proxies the <!-- Перевод на русский -->
session onto it. <!-- Перевод на русский -->

Pinning `--project` matters — a server started without it exposes the <!-- Перевод на русский -->
`activate_project` tool, letting any session swap the project out from under <!-- Перевод на русский -->
every other one. <!-- Перевод на русский -->

**Architecture:** <!-- Перевод на русский -->
```
session A --stdio--> oma bridge --.
                                   >-- HTTP --> one Serena server (+ LSPs)
session B --stdio--> oma bridge --'
```

**Lifecycle:** the first session starts the server, later ones reuse it, and <!-- Перевод на русский -->
each proxy registers itself as a client. When the last session detaches the <!-- Перевод на русский -->
server is kept warm for 10 minutes — a restart re-attaches — and is otherwise <!-- Перевод на русский -->
shut down by the next bridge to start. If the shared server cannot be reached, <!-- Перевод на русский -->
the proxy falls back to a session-local stdio serena. <!-- Перевод на русский -->

Opt out with `serena.mode: stdio` in `.agents/oma-config.yaml`. <!-- Перевод на русский -->

**Example:** <!-- Перевод на русский -->
```bash
# Connect to a server you manage yourself
oma bridge http://localhost:12341/mcp
```

### verify

Проверяет результат субагента по ожидаемым критериям.

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

**`verify agent` arguments:** <!-- Перевод на русский -->

| Аргумент | Обязателен | Описание |
|:---------|:---------|:----------- <!-- Перевод на русский -->|
| `agent-type` | Yes | One of: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`  <!-- Перевод на русский -->|

**Параметры:**

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:-------- <!-- Перевод на русский -->|
| `-w, --workspace <path>` | Workspace path to verify | Current directory  <!-- Перевод на русский -->|
| `--json` | Output as JSON |  <!-- Перевод на русский -->|
| `--output <format>` | Output format (`text` or `json`) |  <!-- Перевод на русский -->|

**Что делает команда:** Runs the verification script for the specified agent type, checking build success, test results, and scope compliance.

`verify triggers` measures keyword-detector accuracy against a labeled prompt corpus. The percentage thresholds are gates. The registered path is `verify agent`; the old top-level spelling may still appear in compatibility help. <!-- Перевод на русский -->

**Общие проверки для всех типов агентов:**
- **Scope Check**: Reads `.agents/results/plan-{sessionId}.json` task scopes. Compares `git diff` changed files against defined scope patterns. Fails if files are modified outside the agent's assigned scope. <!-- Перевод на русский -->
- **Charter Preflight**: Verifies `result-{agent}.md` contains a properly filled `CHARTER_CHECK:` block with no unfilled placeholders. <!-- Перевод на русский -->
- **Hardcoded Secrets**: Scans `.py`, `.ts`, `.tsx`, `.js`, `.dart` files for patterns like `password = "..."`, `api_key = "..."` (excludes test/example files). <!-- Перевод на русский -->
- **TODO/FIXME Comments**: Counts `TODO`, `FIXME`, `HACK`, `XXX` comments (warns if any found). <!-- Перевод на русский -->

**Проверки для конкретных агентов:**

| Agent Тип | Additional Checks |
|:-----------|:----------------- <!-- Перевод на русский -->|
| `backend` | Python syntax validation (`py_compile`), SQL injection detection (f-string + SQL keywords), Python test execution (`pytest`)  <!-- Перевод на русский -->|
| `frontend` | ТипScript compilation (`tsc --noEmit`), inline style detection (`style={{`), `any` type usage (fails if > 3), frontend tests (`vitest`) |
| `mobile` | Flutter/Dart analysis (`flutter analyze` or `dart analyze`), Flutter tests (`flutter test`)  <!-- Перевод на русский -->|
| `qa` | Self-check verification  <!-- Перевод на русский -->|
| `debug` | Runs Python tests or frontend tests based on detected project type  <!-- Перевод на русский -->|
| `pm` | Validates `.agents/results/plan-{sessionId}.json` exists and is valid JSON  <!-- Перевод на русский -->|

**Формат вывода:**
Each check reports `PASS`, `FAIL`, `WARN`, or `SKIP` with a detail message. Overall result is `ok: true` only if zero checks fail. <!-- Перевод на русский -->

**Примеры:**
```bash
# Verify backend output in default workspace
oma verify agent backend

# Verify frontend in specific workspace
oma verify agent frontend -w ./apps/web

# JSON output for CI
oma verify agent backend --json
```

### hook

Передаёт событие хука поставщика через централизованный маршрутизатор oma (design 019). This is the canonical ABI invoked by every vendor's generated `oma-hook.sh` wrapper. It can also be used directly to debug or test handler chains in isolation.

```
oma hook run --vendor <v> --event <nativeEvent> [--matcher <tool>]
```

**Параметры:**

| Флаг | Обязателен | Описание |
|:-----|:---------|:----------- <!-- Перевод на русский -->|
| `--vendor <v>` | Yes | Vendor identity. One of: `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`, `kiro`, or `qwen`. (The `pi` vendor is **not** valid here — it uses the in-process `installPiExtension` bridge instead of `oma hook run`.)  <!-- Перевод на русский -->|
| `--event <e>` | Yes | Native hook event name as registered in the vendor settings (e.g. `UserPromptSubmit`, `PreToolUse`, `Stop`)  <!-- Перевод на русский -->|
| `--matcher <m>` | No | Опцияal tool name / matcher forwarded from the hook registration (e.g. `Bash`) |

**Stdin / stdout contract:** <!-- Перевод на русский -->
- **stdin**: vendor-native JSON payload (the same object the vendor passes to hook processes). <!-- Перевод на русский -->
- **stdout**: vendor-dialect JSON (or plain text for kiro prompts) when a handler fires; empty when no handler produces output. <!-- Перевод на русский -->
- **exit code**: always `0` (fail-open — errors are written to stderr and the agent is never blocked). <!-- Перевод на русский -->

**Runtime data flow:** <!-- Перевод на русский -->
```
vendor fires: oma-hook.sh --vendor claude --event UserPromptSubmit
  stdin: {"prompt":"...","cwd":"/project","sessionId":"..."}
  → oma hook resolves handler chain from .agents/hooks/variants/claude.json
  → runs: keyword-detector → state-boundary → skill-injector (in-process)
  → merges HandlerResult values (context: concat; pre_tool: last mutate wins; stop: any block)
  → emits vendor dialect to stdout
  → exit 0
```

**Debugging handler chains in isolation:** <!-- Перевод на русский -->

```bash
# Test what keyword-detector injects for a given prompt (Claude)
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a Bash pre_tool block (Claude)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement (Codex)
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor codex --event Stop

# Test an Antigravity BeforeTool event
echo '{"tool_name":"run_shell_command","tool_input":{"command":"cat /etc/passwd"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor antigravity --event BeforeTool
```

Empty stdout means the chain produced a no-op for that event. A JSON object on stdout is the vendor dialect the agent session would receive. <!-- Перевод на русский -->

**Примечания об области:**
- `statusLine`/hud entries are not routed through `oma hook run` (hot-path display stays on a direct `bun` path). <!-- Перевод на русский -->
- The pi vendor uses its in-process `installPiExtension` bridge, not `oma hook run`. <!-- Перевод на русский -->

See `cli/commands/hook/command.ts` for the router implementation (internally referred to as "design 019") and `cli/commands/hook/probe/` for the per-vendor compatibility matrix. <!-- Перевод на русский -->

**Примеры:**
```bash
# Inspect Claude keyword-detection output for a real prompt
echo '{"prompt":"plan the new checkout feature","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Verify a Qwen Stop event fires the persistent-mode block
echo '{"cwd":"'$(pwd)'"}' | oma hook run --vendor qwen --event Stop

# Check Antigravity hook output format
echo '{"prompt":"brainstorm","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor antigravity --event BeforeAgent
```

---

### hook probe

Проверяет совместимость хуков поставщиков и выводит матрицу покрытия.

```
oma hook probe [--vendor <list>] [--output <fmt>] [--hooks-dir <dir>]
```

**Параметры:**

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:-------- <!-- Перевод на русский -->|
| `--vendor <list>` | Comma-separated vendors to probe | All supported vendors  <!-- Перевод на русский -->|
| `--output <fmt>` | Output format: `text`, `md`, or `json` | `text`  <!-- Перевод на русский -->|
| `--hooks-dir <dir>` | Override the `.agents/hooks/core` directory | Auto-detected  <!-- Перевод на русский -->|

**Что проверяется:** For each vendor, probes whether the core hook scripts (`keyword-detector`, `persistent-mode`, etc.) are present and whether the variant JSON maps events correctly to handler chains. Exit code `1` if any vendor reports `failed` status.

**Примеры:**
```bash
# Text matrix for all vendors
oma hook probe

# Markdown matrix (useful in CI PR comments)
oma hook probe --output md

# JSON for programmatic consumption
oma hook probe --output json | jq '.results[] | select(.status == "failed")'

# Probe a subset of vendors
oma hook probe --vendor claude,codex,antigravity
```

---

### vault

Управляет API-ключами и другими секретами в системном хранилище ключей (macOS Keychain, Linux Secret Service, or Windows Credential Manager), backed by `@napi-rs/keyring`. Values never appear in shell history or environment files; only key names are tracked in `~/.config/oma/vault-index.json` so `oma vault list` can enumerate without exposing secret values.

```
oma vault store <name> [--value <value>]
oma vault get <name>
oma vault list [--json]
oma vault delete <name>
```

**Подкоманды:**

| Sub-command | Описание |
|:------------|:----------- <!-- Перевод на русский -->|
| `store <name>` | Prompts for a secret value (hidden input) and writes it under `name` in the OS keychain. `--value <value>` accepts the value inline for non-interactive use (visible in shell history; prefer the prompt).  <!-- Перевод на русский -->|
| `get <name>` | Prints the stored value to stdout with no decoration so it can be used inside shells: `export ANTHROPIC_API_KEY=$(oma vault get anthropic)`. Exits with code `2` when the key does not exist.  <!-- Перевод на русский -->|
| `list` | Lists stored key names with their `createdAt` timestamps. Values are never displayed.  <!-- Перевод на русский -->|
| `rm <name>` | Removes the secret from the keychain and the index.  <!-- Перевод на русский -->|

**Key name rules:** 1-64 characters from `[A-Za-z0-9._-]`. Examples: `anthropic`, `openai-prod`, `github_pat`, `sentry.dsn`. <!-- Перевод на русский -->

**Native dependency:** The `@napi-rs/keyring` native module is loaded lazily; if it fails to load (for example, headless Linux without `libsecret` or `gnome-keyring`), the command surfaces an explicit error with an install hint instead of falling back silently. <!-- Перевод на русский -->

**Примеры:**
```bash
# Store with a hidden interactive prompt
oma vault store anthropic

# Non-interactive (note: value is visible in shell history)
oma vault store openai --value sk-test-...

# Use in a shell pipeline
export ANTHROPIC_API_KEY=$(oma vault get anthropic)
oma agent spawn backend "Refactor /api/auth" session-20260517-150000

# List entries (names only)
oma vault list

# Remove
oma vault delete anthropic
```

### cleanup

Удаляет осиротевшие процессы субагентов и временные файлы.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--dry-run` | Show what would be cleaned without making changes  <!-- Перевод на русский -->|
| `-y, --yes` | Skip confirmation prompts and clean everything  <!-- Перевод на русский -->|
| `--json` | Output as JSON  <!-- Перевод на русский -->|
| `--output <format>` | Output format (`text` or `json`)  <!-- Перевод на русский -->|

**What it cleans:** <!-- Перевод на русский -->
- Orphaned PID files in the system temp directory (`/tmp/subagent-*.pid`). <!-- Перевод на русский -->
- Orphaned log files (`/tmp/subagent-*.log`). <!-- Перевод на русский -->
- **Orphaned Serena language servers** — when an MCP client (e.g. Claude) exits, its `serena start-mcp-server` reparents to init and its LSP children (`tsserver`, `pyright`, …, hundreds of MB) keep running with no client. These are reaped here. The *idle-but-still-attached* case is handled separately by [`serena reap`](#serena). <!-- Перевод на русский -->
- Gemini Antigravity directories (brain, implicit, knowledge) under `.gemini/antigravity/`. <!-- Перевод на русский -->

**Примеры:**
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

Reclaim memory from Serena's per-project language servers. Serena spawns an LSP <!-- Перевод на русский -->
stack (`tsserver`, `pyright`, …, ~300 MB) per open project and keeps it warm for <!-- Перевод на русский -->
the whole session — with several projects open this adds up. The reaper kills <!-- Перевод на русский -->
idle LSP children; Serena self-heals and respawns them on the next tool call (no <!-- Перевод на русский -->
restart needed). <!-- Перевод на русский -->

```
oma serena reap [--dry-run] [--quiet]
oma serena reaper enable [--dry-run]
oma serena reaper disable [--dry-run]
```

**Subcommands:** <!-- Перевод на русский -->

| Command | Описание |
|:--------|:----------- <!-- Перевод на русский -->|
| `serena reap` | Reap idle LSPs once now. Interactive runs always execute; `--quiet` (the scheduled path) honors the `enabled` opt-in.  <!-- Перевод на русский -->|
| `serena reap --dry-run` | Preview reap targets and projected freed memory — never kills.  <!-- Перевод на русский -->|
| `serena reaper enable` | Install a background task that runs `serena reap --quiet` every 5 minutes (launchd / systemd timer / Windows Задача Scheduler). |
| `serena reaper disable` | Remove the background task.  <!-- Перевод на русский -->|

**Policy:** `lru` (default) keeps the `keepWarm` most-recently-active projects <!-- Перевод на русский -->
warm and reaps the rest; `idle` reaps any project idle past `idleMinutes`. A <!-- Перевод на русский -->
`graceSeconds` window protects in-flight tool calls. <!-- Перевод на русский -->

**Configuration** (`.agents/oma-config.yaml`, opt-in — disabled by default): <!-- Перевод на русский -->

```yaml
serena_reaper:
  enabled: false     # gates the scheduled (--quiet) path; interactive reap always runs
  policy: lru        # lru | idle
  keepWarm: 2        # LRU: keep this many most-recently-active projects warm
  idleMinutes: 10    # idle threshold / LRU secondary floor
  graceSeconds: 90   # in-flight protection; SIGTERM→SIGKILL window
```

Diagnostics (per-project KEEP/REAP state and the activity signal source) are <!-- Перевод на русский -->
shown by [`oma doctor`](#doctor). Orphaned (dead-client) Serena LSPs are reaped <!-- Перевод на русский -->
by [`oma cleanup`](#cleanup) regardless of this setting. <!-- Перевод на русский -->

**Примеры:**
```bash
# See what would be reclaimed across all open projects
oma serena reap --dry-run

# Reap idle LSPs once, right now
oma serena reap

# Turn on automatic 5-minute background reaping
#   (set serena_reaper.enabled: true in oma-config.yaml first)
oma serena reaper enable

# Turn it back off
oma serena reaper disable
```

### visualize

Показывает структуру проекта как граф зависимостей.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` is a built-in alias for `visualize`. <!-- Перевод на русский -->

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--json` | Output as JSON  <!-- Перевод на русский -->|
| `--output <format>` | Output format (`text` or `json`)  <!-- Перевод на русский -->|

**Что делает команда:** Analyzes the project structure and generates a dependency graph showing relationships between skills, agents, workflows, and shared resources.

**Примеры:**
```bash
oma visualize
oma viz --json
```

### search

Механические примитивы поиска: fetch, метаданные, RSS, медиа, код и оценка доверия. Алиасed as `oma s`. All subcommands output JSON to stdout (one object per line, or pretty-printed with `--pretty`).

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**Subcommands:** <!-- Перевод на русский -->

| Subcommand | Назначение |
|:-----------|:-------- <!-- Перевод на русский -->|
| `fetch <url>` | Fetch URL via auto-escalating strategy pipeline (api → probe → impersonate → browser → archive)  <!-- Перевод на русский -->|
| `api <url>` | Fetch via matched platform API handler (Phase 0)  <!-- Перевод на русский -->|
| `api:search <query>` | Fan-out keyword search across platforms that support it (`--platforms <list>`)  <!-- Перевод на русский -->|
| `meta <url>` | Extract OGP / JSON-LD / Schema.org metadata  <!-- Перевод на русский -->|
| `rss <url>` | Discover and parse RSS / Atom feed  <!-- Перевод на русский -->|
| `rss:google <query>` | Build a Google News RSS URL for a query  <!-- Перевод на русский -->|
| `media <url>` | Extract media metadata via `yt-dlp` (1858 sites)  <!-- Перевод на русский -->|
| `archive <url>` | Fetch via AMP / archive.today / Wayback fallback  <!-- Перевод на русский -->|
| `trust <domain>` | Resolve trust level / score for a domain  <!-- Перевод на русский -->|
| `code <query>` | Search code via `gh` (GitHub) or `glab` (GitLab)  <!-- Перевод на русский -->|
| `doctor` | Check dependencies (Chrome, `python3` + `curl_cffi`, `yt-dlp`, `gh`)  <!-- Перевод на русский -->|

**Common options on URL/query subcommands:** <!-- Перевод на русский -->

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:-------- <!-- Перевод на русский -->|
| `--timeout <seconds>` | Per-strategy timeout | `15` (`30` for `media`)  <!-- Перевод на русский -->|
| `--locale <value>` | `Accept-Language` header | `en-US,en;q=0.9`  <!-- Перевод на русский -->|
| `--pretty` | Pretty-print JSON output | `false`  <!-- Перевод на русский -->|

**`fetch` extras:** <!-- Перевод на русский -->

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--only <strategies>` | Comma-separated strategies to run (`api,probe,impersonate,browser,archive`)  <!-- Перевод на русский -->|
| `--skip <strategies>` | Comma-separated strategies to skip  <!-- Перевод на русский -->|
| `--include-archive` | Append archive strategy as a last fallback  <!-- Перевод на русский -->|

**`media` extras:** <!-- Перевод на русский -->

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--subs` | Write subtitles  <!-- Перевод на русский -->|
| `--sub-lang <list>` | Subtitle languages, comma-separated (default: `en`)  <!-- Перевод на русский -->|
| `--format <spec>` | yt-dlp format spec  <!-- Перевод на русский -->|

**`code` extras:** <!-- Перевод на русский -->

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:-------- <!-- Перевод на русский -->|
| `--host <github\|gitlab>` | Host | `github`  <!-- Перевод на русский -->|
| `--language <lang>` | Language filter |  <!-- Перевод на русский -->|
| `--repo <owner/repo>` | Scope to a repo |  <!-- Перевод на русский -->|
| `--limit <n>` | Max results | `20`  <!-- Перевод на русский -->|

**Exit codes:** `0` ok, `1` error, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout. <!-- Перевод на русский -->

**Примеры:**

```bash
# Auto-escalating fetch
oma search fetch https://example.com/article --pretty

# Force a single strategy
oma search fetch https://example.com --only browser

# Cross-platform keyword search via API handlers
oma search api search "RAG patterns" --platforms hackernews,reddit

# Find a repo's trust score
oma search trust github.com

# Code search (defaults to GitHub)
oma search code "useEffect cleanup" --language ts --limit 10

# Verify your local dependencies
oma search doctor
```

The registry also exposes these explicit discovery helpers: <!-- Перевод на русский -->

```bash
# Inspect which providers are registered without making a network request
oma search providers --json

# Use the selected web provider with bounded output
oma search web "latest browser automation" --limit 10 --timeout 30s --pretty

# Fetch metadata and feeds directly
oma search meta https://example.com/article --pretty
oma search media https://example.com/video --subs --sub-lang en --pretty
oma search archive https://example.com/article --pretty

# Platform API and RSS routes
oma search api fetch https://example.com/article --pretty
oma search api search "RAG patterns" --platforms hackernews,reddit --pretty
oma search rss fetch https://example.com/feed.xml --pretty
oma search rss google "browser automation"
```

`search` emits JSON even without `--json`. `--pretty` changes presentation only; it does not change the result schema. `search web` accepts `--provider`, `--limit`, `--timeout`, `--json`, and `--pretty`. If a strategy is blocked or a dependency is missing, use the exit code table above and rerun `oma search doctor` before changing strategies. <!-- Перевод на русский -->

### image

Генерация изображений несколькими поставщиками с параллельной диспетчеризацией и учётом аутентификации. Алиасed as `oma img`.

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**Subcommands:** <!-- Перевод на русский -->

| Subcommand | Назначение |
|:-----------|:-------- <!-- Перевод на русский -->|
| `generate <prompt...>` | Generate images via `pollinations` (flux/zimage, free), `codex` (gpt-image-2 via ChatGPT OAuth), or `antigravity` (nano-banana via Gemini Code Assist subscription, keyless)  <!-- Перевод на русский -->|
| `doctor` | Check authentication and install status per vendor  <!-- Перевод на русский -->|
| `vendor list` | List registered vendors and supported models  <!-- Перевод на русский -->|

**`image generate` options:** <!-- Перевод на русский -->

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:-------- <!-- Перевод на русский -->|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all` | `auto`  <!-- Перевод на русский -->|
| `--size <size>` | Any `WxH` with edges divisible by 16, 16–3840, and aspect ratio 1:3–3:1; `auto` is also accepted. | vendor default  <!-- Перевод на русский -->|
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | vendor default  <!-- Перевод на русский -->|
| `-n, --count <n>` | Number of images (1..5) | `1`  <!-- Перевод на русский -->|
| `--output-dir <path>` | Output directory | `.agents/results/images/{timestamp}/`  <!-- Перевод на русский -->|
| `--allow-external-output` | Allow output paths outside `$PWD` | `false`  <!-- Перевод на русский -->|
| `--model <name>` | Vendor-specific model override; ignored by `antigravity`, whose model is opaque. | vendor default  <!-- Перевод на русский -->|
| `--timeout <duration>` | Per-image timeout | vendor default  <!-- Перевод на русский -->|
| `-r, --reference <path>` | Reference image(s); repeatable or comma-separated. Supported on `codex` and `antigravity`; rejected on `pollinations`. Each ≤5MB PNG/JPEG/GIF/WebP (magic-byte validated), max 10. |  <!-- Перевод на русский -->|
| `-y, --yes` | Skip cost confirmation | `false`  <!-- Перевод на русский -->|
| `--no-prompt-in-manifest` | Store SHA256 of prompt instead of raw text | `false`  <!-- Перевод на русский -->|
| `--dry-run` | Print plan and cost estimate; do not execute | `false`  <!-- Перевод на русский -->|
| `--output <format>` | CLI output format: `text` \| `json` | `text`  <!-- Перевод на русский -->|

Each run writes a `manifest.json` next to the generated images recording vendor, model, prompt (or hash), size, quality, and cost. <!-- Перевод на русский -->

**Примеры:**

```bash
# Free, no-config generation
oma image generate "minimalist sunrise over mountains"

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# All vendors in parallel for comparison
oma image generate "cat astronaut" --vendor all

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Use a reference image to guide style / subject (codex or antigravity)
oma image generate "same otter in dramatic lighting" --vendor codex -r ~/Downloads/otter.jpeg

# Multiple references (repeatable or comma-separated)
oma image generate "blend these styles" --vendor antigravity -r a.png -r b.png
oma image generate "blend these styles" --vendor antigravity -r a.png,b.png

# Per-vendor doctor check
oma image doctor --output json
```

### video

Планирует, создаёт и рендерит короткие, поясняющие и демонстрационные видео. `generate` creates the brief, script, render specification, and run manifest; a composition and a working compositor are required before a real MP4 can be rendered.

```
oma video generate "three ways to reduce build times" --mode shorts --dry-run --output json
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --output json
oma video doctor --output json
oma video provider list --output json
oma video compose <runDir> --output json
oma video render <runDir> --output json
```

`generate` accepts `--mode shorts|explainer|demo`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor remotion|mpt`, `--capture`, `--source file|web`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout`, and `--capture-stop duration:<seconds>|selector:<css>`. Use `--source web --url <url>` for a browser capture; `--source file` is the default. `--output-dir` selects the run root, `--allow-external-output` permits a path outside `$PWD`, `--max-usd` sets a cost ceiling, `--seed` stabilizes planning inputs, and `--no-brief-in-manifest` stores a brief hash instead of its text. `--dry-run` stops after planning. `--output text|json` controls the CLI envelope. <!-- Перевод на русский -->

`doctor` checks the cached Remotion/MPT toolchain and accepts `--install`, `--upgrade`, `--install-mpt`, and `--install-strudel`. `provider list` reports provider availability and key status. `compose` scaffolds or refreshes the run composition and reports the authoring contract; `render` typechecks, renders, and probes the output. Missing compositor, composition, or toolchain dependencies are errors. The test-only `OMA_VIDEO_MOCK=1` path is the sole placeholder mode; a normal run never substitutes a text or tiny-file MP4. <!-- Перевод на русский -->

Successful JSON output contains `runDir`, `manifestPath`, `scriptPath`, and `renderSpecPath`; the manifest records selected providers, inputs, and generated assets. After `compose`, author the generated composition according to its `AUTHORING.md`, then rerun `render`. If a provider key is unavailable, run `oma video doctor`; if capture fails, check the URL, selector, device, and timeout; if rendering fails, fix the composition diagnostics before retrying. <!-- Перевод на русский -->

### star

Добавляет oh-my-agent в избранное GitHub.

```
oma star
```

Опций нет. Requires `gh` CLI to be installed and authenticated. Stars the `first-fluke/oh-my-agent` repository.

**Example:** <!-- Перевод на русский -->
```bash
oma star
```

### describe

Описывает команды CLI в JSON для интроспекции runtime.

```
oma describe [command-path]
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|:---------|:---------|:----------- <!-- Перевод на русский -->|
| `command-path` | No | The command to describe. If omitted, describes the root program.  <!-- Перевод на русский -->|

**Что делает команда:** Outputs a JSON object with the command's name, description, arguments, options, and subcommands. Used by AI agents to understand available CLI capabilities.

**Примеры:**
```bash
# Describe all commands
oma describe

# Describe a specific command
oma describe "agent spawn"

# Describe a subcommand
oma describe "agent:parallel"
```

---

## Команды для исследований и артефактов

These families are useful when the output is a research artifact, a presentation, or a report. They are intentionally short here; the linked guides explain the workflow and recovery choices. <!-- Перевод на русский -->

### intel suggest

Suggest product work from market and repository signals: <!-- Перевод на русский -->

```
oma intel suggest --topic "developer onboarding" --target ./my-product --dry-run
oma intel suggest --config .agents/intel.yaml --json
```

`--config` supplies the full configuration. For one-off runs, `--topic`, `--target`, `--repos`, `--since`, and `--last-commits` select inputs. `--output-dir` controls local reports, and `--fixture` supplies a local JSON fixture for deterministic review. `--create-issue` files the accepted candidates in GitHub and requires a configured target plus confirmation; pair it with `--base-repo <owner/name>` to select the repository and `--yes` only in an already-approved automation context. `--dry-run` and `--json` are safe inspection paths. <!-- Перевод на русский -->

### market

The market family delegates to the resolved upstream `last30days` engine. Start with the gate and resolver: <!-- Перевод на русский -->

```
TOPIC="browser automation pain points"
oma market detect-trap "$TOPIC"
oma market resolve --output json
oma market run "$TOPIC" --days 30 --emit=compact
```

`market detect-trap` returns exit 2 with a reframe for keyword-trap or overly broad topics; `--force` bypasses that gate only when the user explicitly wants to continue. `market resolve` accepts `--refresh` and `--offline`, and `market update` refreshes the managed engine cache. `market run` passes its remaining arguments to the resolved Python engine and adds `--save-dir` from `market.save_dir` when a topic is supplied. Read [Market Research](../guide/market-research.md) before selecting upstream flags; its `--help` output belongs to the managed engine and changes with the release. <!-- Перевод на русский -->

### docs

Use the docs family to inspect documentation drift. The commands are report-oriented; `sync` lists candidates for the host agent and does not edit files itself. <!-- Перевод на русский -->

```
oma docs verify --json
oma docs verify --no-urls --report-file .agents/results/docs-drift.md
oma docs sync HEAD~3..HEAD --json
oma docs i18n --json --min-severity HIGH
oma docs lint --json --locales ko,ja
```

`verify` checks local references and regenerates `docs/generated/doc-refs.json`; `--urls-sync` waits for the optional `lychee` URL pass. `sync` defaults to staged changes, then `HEAD~1..HEAD`, and emits `{doc, changedFiles, matchedRefs}` candidates. `i18n` reports structural English/translation drift, while `lint` reports translated-document style issues. None of these subcommands auto-edits the docs. <!-- Перевод на русский -->

### slide

`oma slide` operates on a working directory of 1920×1080 HTML slide fragments. A smallest working path is: <!-- Перевод на русский -->

```
oma slide create --output-dir .agents/results/slides/demo
# author slide-01.html and meta.json in that directory
oma slide validate --workspace .agents/results/slides/demo --output json
oma slide preview --workspace .agents/results/slides/demo
oma slide bundle --workspace .agents/results/slides/demo
```

The quality gate reports overflow, overlap, and font-size findings. Use `--slide <file>` for a single-slide check and `--report-file <path>` with JSON output. Export only after validation: <!-- Перевод на русский -->

```
oma slide export pdf --workspace <dir> --output-file <file> --mode capture
oma slide export png --workspace <dir> --output-dir <dir> --resolution 1080p
oma slide export pptx --workspace <dir> --output-file <file>
```

PPTX export is experimental and raster-backed. `slide import pptx <file>`, `slide asset fetch-video <url>`, and `slide style list|preview|get <slug>` cover input assets and style discovery. Use [oma-slide](../guide/content-and-research.md#slides-and-presentations) for authoring decisions and the fixed-stage constraints. <!-- Перевод на русский -->

### scholar

Search papers and work metadata, then validate sidecars before sharing: <!-- Перевод на русский -->

```
oma scholar search "vision language action" --limit 10
oma scholar resolve "Attention Is All You Need"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar lint paper.knows.yaml
```

`search` can limit OpenAlex results with `--year-min` and force fallback providers with `--always-fallback`. `get --section` accepts `statements`, `evidence`, `relations`, `artifacts`, or `citation`. `lint --lenient` demotes dangling cross-record references to warnings; `--fail-on-warning` makes warnings fail for CI. The CLI searches Knows first, then OpenAlex and Semantic Scholar fallbacks; it does not submit sidecars upstream. <!-- Перевод на русский -->

### explain

`/explain` is the authoring workflow. The CLI validates already-created artifacts: <!-- Перевод на русский -->

```
oma explain validate .agents/results/explain/2026-09-09-change.html
oma explain validate --input-dir .agents/results/explain --output json --report-file .agents/results/explain/report.json
```

Pass a file or `--input-dir`, not both. Validation covers the self-contained HTML contract and reports machine-readable failures; it does not judge the accuracy of the explanation. See [Code Explainer](../guide/code-explainer.md). <!-- Перевод на русский -->

### diagram

Resolve the engine before a workflow emits a structural diagram: <!-- Перевод на русский -->

```
oma diagram resolve --output json
oma diagram resolve --engine mermaid --offline
oma diagram update
oma diagram archify validate architecture <stem>.archify.json --quality showcase --json
oma diagram archify deliver architecture <stem>.archify.json <stem>.archify.html --quality showcase --json
```

`diagram resolve` accepts `--engine auto|archify|mermaid`, `--refresh`, and `--offline`. `diagram update` refreshes the managed archify copy. `diagram archify` forwards the remaining arguments to the resolved upstream executable and propagates its exit code. Mermaid remains the Markdown source of truth; the HTML is a derived artifact. See [Diagram Engine](../guide/diagram-engine.md). <!-- Перевод на русский -->

## Просмотр состояния, моделей и памяти

The following families expose durable workflow state and model/provider diagnostics. Prefer `--dry-run` on cleanup-style actions and `--json` when another program will consume the result. <!-- Перевод на русский -->

### state

```
oma state list --json
oma state list --all-projects --project /path/to/project --search migration
oma state get <session-id> --json
oma state verify --workflow work --checkpoint complete --json
oma state archive --older-than 90d --dry-run --json
oma state purge --older-than 90d --dry-run --json
```

`state emit` records one L1 event with explicit category and session metadata. `state migrate` moves legacy sessions to the selected profile. `state repair` repairs malformed state files. `state decisions list` and `state inject-log list|get` inspect required decisions and injection audit entries. `state activate`, `state archive`, and `state purge` are explicit actions; the old boolean action flags are rejected. Archive or purge only after reviewing a dry-run, because these commands change local state. <!-- Перевод на русский -->

### model

```
oma model check --json
oma model check --owner openai --fail-on-drift
oma model probe openai/gpt-5 --timeout 30s --json
oma model propose --owner anthropic --json
```

`model check` compares the registry with live vendor lists and can probe new candidates. `model probe` tests one slug against its vendor CLI. `model propose` emits an `oma-config` `models:` patch; use `--write` only when you intend to change configuration. Vendor availability and quota can make probes fail even when a registry entry is valid. <!-- Перевод на русский -->

### Команды агента с доказательствами

Native agent runs use an evidence-backed sequence: <!-- Перевод на русский -->

```
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent context docs --difficulty Medium
oma agent begin docs docs "$SESSION_ID" --workspace .
# Use the runId and claimPath printed by begin.
oma agent verify "<run-id>" --required
oma agent finish "<run-id>" "<claim-path>"
```

`agent context` loads graph-selected context; `begin` starts a run and prints a generated run ID plus claim path; `verify` receives that run ID and executes the pinned checks (`--required`) or narrows them with `--affected`; `finish` receives the run ID and the claim file path. `agent resume --dry-run` reports ready and reusable tasks, and `agent resume --max-attempts <n>` retries only tasks allowed by the plan. See [Agent results and resume](../guide/agent-results-and-resume.md) for the plan and claim shape. These commands are for the OMA execution contract; ordinary user work can use `agent spawn`, `agent parallel`, or `agent review` instead. <!-- Перевод на русский -->

### memory

```
oma memory status --json
oma memory keys --kind connection --dry-run --json
oma memory init --json
oma memory setup --endpoint http://127.0.0.1:8000 --dry-run --json
oma memory import --source claude --since 7d --dry-run --json
oma memory gc --scope project --keep 20 --dry-run --json
```

`memory keys` configures Honcho connection or embedding credentials; `--dry-run` previews destinations without reading or writing keys. `memory setup` prepares an AgentMemory endpoint and can optionally `--install` or `--start` it. `memory daemon` and `memory service` manage local process or OS-service integration. `memory maintain backup|prune|vacuum`, `memory retry drain`, `memory upgrade`, and `memory gc` are maintenance actions; inspect their JSON or dry-run output before applying them. <!-- Перевод на русский -->

## Управление навыками

### skills audit

Проверяет установленные навыки на пересекающиеся описания, black-hole generalism, and library-size routing decay.

```
oma skill audit [--json] [--output <format>]
```

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--json` | Output as JSON for CI/CD  <!-- Перевод на русский -->|
| `--output <format>` | Output format (`text` or `json`)  <!-- Перевод на русский -->|

**Что проверяется:**
- **Pairwise description similarity**: TF-IDF cosine similarity between every pair of installed skills. Warns at ≥ 60%, fails at ≥ 75%. <!-- Перевод на русский -->
- **Black-hole detection**: flags any skill whose mean similarity to all others is a positive outlier (≥ mean + 1.5 × stddev), indicating an over-generic description that could hijack routing. <!-- Перевод на русский -->
- **Library-size decay**: warns when more than 60 skills are installed (routing accuracy decays logarithmically as the library grows). <!-- Перевод на русский -->
- **Focus check**: warns when a skill sprawls into a bundle — more than 20 reference docs (`.md` files besides `SKILL.md`, vendored trees excluded) or a `SKILL.md` body over 25,000 chars. Focused skills outperform bundles (SkillsBench, arXiv:2602.12670); the fix is splitting, not deleting. <!-- Перевод на русский -->

**Exit codes:** `0` all findings in warn band or none; `1` at least one fail-band pair. <!-- Перевод на русский -->

**Примеры:**
```bash
oma skill audit
oma skill audit --json | jq '.findings'
```

### skills lint

Обнаруживает дефекты авторства отдельных навыков: quality defects inside a single `SKILL.md`, as opposed to `skills audit` which checks relations *between* skills. Based on the skill-smell taxonomy of arXiv:2607.01456 (over 99% of in-the-wild SKILL.md files carry at least one smell).

```
oma skill lint [--skill <id>] [--json] [--output <format>]
```

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--skill <id>` | Lint a single skill  <!-- Перевод на русский -->|
| `--json` | Output as JSON for CI/CD  <!-- Перевод на русский -->|
| `--output <format>` | Output format (`text` or `json`)  <!-- Перевод на русский -->|

**Generic smells (every skill):** <!-- Перевод на русский -->

| Сигнал | Серьёзность | Значение |
|:------|:---------|:-------- <!-- Перевод на русский -->|
| `missing-name` | fail | frontmatter `name` absent or empty  <!-- Перевод на русский -->|
| `missing-description` | fail | frontmatter `description` absent or empty — routing depends on it  <!-- Перевод на русский -->|
| `weak-description` | warn | description under 40 chars — too thin to route on  <!-- Перевод на русский -->|
| `body-too-long` | warn | SKILL.md body over 500 lines — move detail into `resources/` behind progressive disclosure  <!-- Перевод на русский -->|
| `template-placeholder` | warn | leftover `{Placeholder}` text outside code spans  <!-- Перевод на русский -->|
| `broken-reference` | fail | references a `resources/`, `config/`, `scripts/`, or `assets/` file that does not exist  <!-- Перевод на русский -->|

**Проблемы SSL-lite** (проверка SSL-lite обязательна, если объявленное имя навыка или имя его доступного каталога/псевдонима начинается с `oma-`, даже без `## Scheduling`; псевдоним без префикса не может обойти объявленное имя с `oma-`. Обычные навыки без префикса выбирают этот формат, добавляя `## Scheduling`): <!-- Перевод на русский -->

| Сигнал | Серьёзность | Значение |
|:------|:---------|:-------- <!-- Перевод на русский -->|
| `ssl-structure` | fail | top-level sections deviate from `Scheduling / Structural Flow / Logical Operations / References`  <!-- Перевод на русский -->|
| `canonical-path` | fail | not exactly one `### Canonical command path` or `### Canonical workflow path`  <!-- Перевод на русский -->|
| `missing-boundaries` | warn | no `### When NOT to use` — boundary-less skills hijack routing  <!-- Перевод на русский -->|
| `empty-failure-recovery` | warn | `### Failure and recovery` missing or empty (accepts bullets or table rows) — encode failure mechanisms per SkillLens  <!-- Перевод на русский -->|

**Exit codes:** `0` no fail-severity smells; `1` at least one fail smell. <!-- Перевод на русский -->

**Примеры:**
```bash
oma skill lint
oma skill lint --skill oma-scholar
oma skill lint --json | jq '.smells'
```

### skills eval

Измеряет полезность навыка: does loading a skill actually improve held-out task outcomes? This is the *utility* counterpart to `skills audit` (which measures description-boundary overlap). Where `audit` asks "are two skills redundant?", `eval` asks "does this skill help?"

```
oma skill eval [--skill <id>] [--mock | --live] [--record] [--yes]
                [--task-dir <path>] [--max-tasks <n>] [--require-coverage]
                [--json] [--output <format>]
```

**Параметры:**

| Флаг | Описание |
|:-----|:----------- <!-- Перевод на русский -->|
| `--skill <id>` | Skill ID to evaluate (simple name, no path separators). По умолчаниюs to `_all`. |
| `--mock` | Replay recorded rollouts from `_rollouts/` (default; deterministic, no LLM dispatch). Safe for CI.  <!-- Перевод на русский -->|
| `--live` | Live agent dispatch — spawns two arms (baseline and treatment) per task via `oma agent spawn --read-only`. Prints a cost preview and asks for confirmation unless `--yes`.  <!-- Перевод на русский -->|
| `--record` | Write captured live rollouts (including judge verdicts) to `_rollouts/` for future `--mock` replay. Only meaningful with `--live`.  <!-- Перевод на русский -->|
| `--yes` | Skip the cost-preview confirmation prompt. Only meaningful with `--live`.  <!-- Перевод на русский -->|
| `--task-dir <path>` | Override the task fixture directory (must be inside the workspace root). По умолчанию: `.agents/eval/<skill>/`. |
| `--max-tasks <n>` | Cap number of tasks evaluated (applied in deterministic sort order).  <!-- Перевод на русский -->|
| `--require-coverage` | Exit non-zero when fewer than 5 tasks are found (prevents silent green in CI).  <!-- Перевод на русский -->|
| `--json` | Output as JSON for CI/CD  <!-- Перевод на русский -->|
| `--output <format>` | Output format (`text` or `json`)  <!-- Перевод на русский -->|

**How it works:** <!-- Перевод на русский -->

For each task fixture in `.agents/eval/<skill>/`: <!-- Перевод на русский -->
1. **Baseline arm** — the task prompt is dispatched without the skill loaded. <!-- Перевод на русский -->
2. **Treatment arm** — `SKILL.md` is prepended to the prompt, then dispatched. <!-- Перевод на русский -->
3. Each arm is scored by its checker (judge by default; assert or regex for deterministic opt-ins). <!-- Перевод на русский -->
4. `utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)`. <!-- Перевод на русский -->

**Решениеs:**

| Решение | Условие |
|:---------|:--------- <!-- Перевод на русский -->|
| `pass` | `utilityLift ≥ 5%`  <!-- Перевод на русский -->|
| `warn` | `0% < utilityLift < 5%`  <!-- Перевод на русский -->|
| `fail` | `utilityLift ≤ 0%` (exit code 1)  <!-- Перевод на русский -->|
| `insufficient` | Fewer than 5 scoreable tasks (exit code 1 only with `--require-coverage`)  <!-- Перевод на русский -->|

**Recommended mode:** Use `--live` with judge checkers to measure actual skill utility. Use `--mock` to replay recorded judge verdicts offline or to run deterministic `assert`/`regex` contract checks. <!-- Перевод на русский -->

**Environment variable:** `OMA_SKILLEVAL_MOCK=1` forces mock mode regardless of flags. <!-- Перевод на русский -->

**Exit codes:** `0` pass or warn; `1` fail or insufficient-with-`--require-coverage`. <!-- Перевод на русский -->

**Примеры:**
```bash
# Dry-run on recorded rollouts (CI-safe)
oma skill eval --skill oma-scholar

# Live run with cost preview
oma skill eval --skill oma-scholar --live

# Live run, record results for future mock replay, skip prompt
oma skill eval --skill oma-scholar --live --record --yes

# JSON output for CI
oma skill eval --skill oma-scholar --json

# Fail CI when no tasks exist
oma skill eval --skill oma-scholar --require-coverage

# Limit to 10 tasks
oma skill eval --skill oma-scholar --max-tasks 10
```

See the [Skill Utility Eval guide](../guide/skill-eval.md) for the `.agents/eval/` fixture format and checker types. <!-- Перевод на русский -->

---

### skills opt

Optimize a skill's `SKILL.md` with WikiSkill-style persistent evolution. A Maintainer consolidates observable rollout evidence into scoped knowledge, a Proposer emits bounded add/delete/replace edits, and rejected outcomes persist across runs. Candidates must strictly improve the held-out validation split; `--apply` additionally requires strict improvement on a runner-owned final-test split. Research basis: WikiSkill (arXiv:2608.27454). <!-- Перевод на русский -->

```
oma skill optimize [--skill <id>] [--dry-run | --apply] [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes] [--json] [--output <format>]
```

**Параметры:**

| Флаг | По умолчанию | Описание |
|:-----|:--------|:----------- <!-- Перевод на русский -->|
| `--skill <id>` | `_all` | Skill ID to optimize (simple name, no path separators).  <!-- Перевод на русский -->|
| `--dry-run` | **yes (default)** | Propose edits and print the diff without changing `SKILL.md`; generated evolution evidence is still recorded.  <!-- Перевод на русский -->|
| `--apply` | — | Apply accepted edits; backs up the original before an atomic write and writes only a validated improvement.  <!-- Перевод на русский -->|
| `--mock` | **yes (default)** | Replay recorded optimizer edits and eval verdicts (deterministic, offline). Safe for CI.  <!-- Перевод на русский -->|
| `--live` | — | Live LLM optimizer dispatch — incurs real model calls per epoch. Prints a cost preview and prompts for confirmation unless `--yes`.  <!-- Перевод на русский -->|
| `--max-epochs <n>` | `8` | Maximum optimization epochs.  <!-- Перевод на русский -->|
| `--edits-per-epoch <k>` | `4` | Candidate edits proposed per epoch.  <!-- Перевод на русский -->|
| `--lr <chars>` | `600` | Textual learning-rate budget: maximum net character change per edit.  <!-- Перевод на русский -->|
| `--yes` | — | Skip cost-preview confirmation (only with `--live`).  <!-- Перевод на русский -->|
| `--json` | — | Output as JSON for CI/CD.  <!-- Перевод на русский -->|
| `--output <format>` | `text` | Output format (`text` or `json`).  <!-- Перевод на русский -->|

**Hard dependency:** Requires at least 5 task fixtures in `.agents/eval/<skill>/`. Errors with a clear message when fewer are found. See the [Skill Utility Eval guide](../guide/skill-eval.md) for authoring them. <!-- Перевод на русский -->

**Train/validation/test split:** Fixtures are partitioned deterministically 60/20/20. The Maintainer and Proposer see only TRAIN evidence, candidate selection uses held-out VALIDATION tasks, and the runner-owned TEST split stays hidden until evolution finishes. `--apply` writes only when both validation and final-test lift strictly improve. <!-- Перевод на русский -->

**SSOT caveat:** Skills whose ID starts with `oma-` are overwritten by `oma update`. For those skills, `--apply` is discouraged — use the default `--dry-run` and upstream the proposed diff. User-authored skills apply freely. <!-- Перевод на русский -->

**Exit codes:** `0` optimization completed; `1` insufficient fixtures or invalid argument. <!-- Перевод на русский -->

**Примеры:**
```bash
# Propose edits (dry-run, mock — does not change SKILL.md, fully offline)
oma skill optimize --skill oma-scholar --mock --dry-run

# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --mock --apply

# Live optimizer with cost preview
oma skill optimize --skill oma-scholar --live

# Live optimizer, skip confirmation, apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes

# JSON output for CI
oma skill optimize --skill oma-scholar --json

# Tune epochs and edits budget
oma skill optimize --skill oma-scholar --max-epochs 4 --edits-per-epoch 2 --lr 300
```

See the [Skill Optimization guide](../guide/skill-opt.md) for the full end-to-end walkthrough and SSOT / overfitting guard details. <!-- Перевод на русский -->

---

### harness eval

Compare a candidate `.agents/` overlay with the current OMA harness on paired, isolated repository tasks. The target agent and vendor route stay fixed; deterministic checks score the files and output produced by each arm. <!-- Перевод на русский -->

```
oma harness eval --suite <path> --candidate <path> [--mock | --live]
                 [--record] [--record-file <path>] [--yes]
                 [--timeout-minutes <n>] [--require-coverage]
                 [--json] [--output <format>]
```

| Флаг | Описание |
|:-----|:------------ <!-- Перевод на русский -->|
| `--suite <path>` | Обязателен suite YAML. The suite and fixture workspaces must be inside the project root. |
| `--candidate <path>` | Обязателен candidate root containing a scoped `.agents/` overlay. |
| `--mock` | Replay a hash-matching recorded run (default; deterministic and offline).  <!-- Перевод на русский -->|
| `--live` | Run baseline and candidate arms through the suite's target agent.  <!-- Перевод на русский -->|
| `--record` | Persist a live run for later mock replay. Requires `--live`.  <!-- Перевод на русский -->|
| `--record-file <path>` | Override the recording path; it must remain inside the project root.  <!-- Перевод на русский -->|
| `--yes` | Skip the live-run cost confirmation.  <!-- Перевод на русский -->|
| `--timeout-minutes <n>` | Per-arm timeout, identical for baseline and candidate. По умолчанию: `15`. |
| `--require-coverage` | Exit non-zero when fewer than five paired tasks are scoreable.  <!-- Перевод на русский -->|
| `--json` | Output the full evaluation as JSON.  <!-- Перевод на русский -->|
| `--output <format>` | Output format (`text` or `json`).  <!-- Перевод на русский -->|

**Решение gate:** pass requires at least 5 paired tasks, lift of at least 5 percentage points, and zero regressions. A regression always fails. Below-minimum coverage is `insufficient` and exits non-zero only with `--require-coverage`.

**Isolation:** candidate files can replace only `.agents/agents`, `.agents/rules`, `.agents/skills`, and `.agents/workflows` content in the temporary candidate arm. Hooks, config, state, eval fixtures, symlinks, vendor variants, protected agent execution frontmatter changes, and fixture-owned vendor harness files are rejected. An arm fails if it mutates protected definitions during execution. HOME-based vendor discovery is refused for live evaluation. The primary agent route is fixed; nested subagent model pinning is not yet enforced. <!-- Перевод на русский -->

```bash
# Generate a live measurement and recording
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --live --record

# Replay the same measurement in CI
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --mock --require-coverage --json
```

See the [Harness Evaluation guide](../guide/harness-eval.md) for the suite schema, supported checks, isolation model, and current limitations. <!-- Перевод на русский -->

---

### help

Показывает справочную информацию.

```
oma help
```

Displays the full help text with all available commands. <!-- Перевод на русский -->

### version

Показывает номер версии.

```
oma version
```

Outputs the current CLI version and exits. <!-- Перевод на русский -->

---

## Переменные окружения

| Переменная | Описание | Используют |
|:---------|:-----------|:-------- <!-- Перевод на русский -->|
| `OH_MY_AG_OUTPUT_FORMAT` | Set to `json` to force JSON output on all commands that support it | All commands with `--json` flag  <!-- Перевод на русский -->|
| `DASHBOARD_PORT` | Port for the web dashboard | `dashboard web`  <!-- Перевод на русский -->|
| `MEMORIES_DIR` | Override the memories directory path | `dashboard`, `dashboard web`  <!-- Перевод на русский -->|
| `OMA_SKILLEVAL_MOCK` | Set to `1` to force mock mode in `oma skill eval` regardless of flags | `skills eval`  <!-- Перевод на русский -->|

---

## Алиасы

| Алиас | Полная команда |
|:------|:------------ <!-- Перевод на русский -->|
| `viz` | `visualize`  <!-- Перевод на русский -->|
