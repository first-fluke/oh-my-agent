---
title: Установка
description: Установите oh-my-agent, выберите навыки и провайдеров, разберитесь в создаваемых файлах проекта, настройте модели и параметры runtime и проверьте установку с помощью oma doctor.
---

# Установка

Для одной задачи начните с [одного навыка](./choose-setup.md#load-one-skill). Для хуков проекта и командных рабочих процессов используйте установку runtime ниже. [Руководство по настройке](./choose-setup.md) разделяет загрузку инструкций, пресеты навыков и установку из marketplace Claude Code.

Для Grok Bot используйте [страницу установки Grok Bot](/grok-bot/). Нативная ссылка **Add to Grok Bot** требует одобренного листинга в Cursor Marketplace; пока регистрация не завершена, она недоступна. Отдельное [руководство по ручной установке](https://github.com/first-fluke/oh-my-agent/blob/main/integrations/grok-bot/README.md) объясняет `oma install --target grok-bot` для компьютера Bot. Интеграция runtime Grok Build ниже — это другая цель установки.

## Установка с помощью AI-агента

Вставьте это в своего coding agent:

```text
Install and configure oh-my-agent in this project by following this guide:
https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/docs/agent-install.md
```

[Руководство по установке для агента](https://github.com/first-fluke/oh-my-agent/blob/main/docs/agent-install.md) описывает подготовку CLI, неинтерактивную настройку проекта и проверку с помощью `oma doctor`.

## Предварительные требования

- **IDE или CLI с поддержкой AI**: хотя бы один поддерживаемый хост, например Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot или Hermes
- **bun**: среда выполнения JavaScript и менеджер пакетов (если его нет, скрипт установки установит его автоматически)
- **uv**: менеджер пакетов Python (bootstrap-скрипт предложит установить его, если он отсутствует)
- **Провайдер code intelligence**: провайдером по умолчанию является Serena. Также поддерживается Gortex, если он выбран в конфигурации провайдеров. Установщик может подготовить Serena через `uv tool install`; если необязательная зависимость недоступна, он продолжит работу с предупреждением. Если выбран Gortex, в режиме проекта `oma install` и `oma update` регистрируют проект в демоне Gortex (`gortex track`), если он ещё не отслеживается, и добавляют сгенерированные OMA каталоги в список исключений этого проекта через Gortex CLI; в дерево проекта ничего не записывается. Сам Gortex необходимо устанавливать отдельно.

Установщик группирует интеграции по возможностям. К hook-поставщикам относятся Antigravity, Claude, Codex, CommandCode, Copilot, Cursor, Grok, Kimi, Kiro и Qwen; OpenCode и pi используют extension bridges; Hermes получает ссылки на навыки, а ZCode — команды рабочих процессов. Можно выбрать несколько поставщиков, но для первой задачи достаточно хоста, которым вы планируете пользоваться.

---

## Способ 1: установка одной строкой

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Оба bootstrap-скрипта работают одинаково:
1. Определяют вашу платформу (macOS, Linux или Windows)
2. Проверяют наличие bun и uv (а также serena, если он выбран) и устанавливают отсутствующие компоненты
3. Глобально устанавливают команду `oma` через `bun install --global oh-my-agent`, если `oma` ещё нет в PATH (её вызывают хуки и workflows)
4. Запускают интерактивный установщик с выбором пресета и провайдеров
5. Создают `.agents/` с выбранными навыками и конфигурацией
6. Настраивают слои интеграции runtime (хуки, символические ссылки, настройки обнаруженных поставщиков)
7. Настраивают MCP-серверы code intelligence и памяти

Bootstrap продолжает работу после сбоев необязательных зависимостей и выводит команды для дальнейших действий. AgentMemory является провайдером семантической памяти по умолчанию: `oma install` и `oma update` завершаются ошибкой, если не удаётся его установка, запуск или проверка работоспособности. Выбор `providers.semantic_memory: none` или `honcho` либо задание `OMA_NO_AGENTMEMORY=1` отключает автоматическую подготовку AgentMemory. После завершения установщика запустите `oma doctor`.

### Что ещё установщик делает по умолчанию {#what-the-installer-also-does-by-default}

- **Browser MCP Aside**: заранее выбран в интерактивной настройке и, если отсутствует, устанавливается через `curl -fsSL https://releases.aside.com/install.sh | bash`, но только если вы оставите его выбранным. Снимите выбор на шаге browser MCP или позже через `oma update mcp`.
- **Служба AgentMemory**: `bun install -g @agentmemory/agentmemory`, регистрируется как служба, запускаемая при входе в систему (launchd, пользовательский unit systemd или запланированная задача Windows).
- **CUE**: устанавливается bootstrap-скриптом через `brew install cue` (macOS/Linux) или `winget` (Windows) и повторно через `oma install`, если провайдером code intelligence выбран Serena.
- **Запись вне проекта**: `~/.claude.json` (помечает проект как доверенное рабочее пространство Claude Code), `~/.serena/` (контекст OMA, минимальный размер ответа, регистрация проекта), `~/.cursor/cli-config.json` (отключает атрибуцию коммитов в Cursor), `~/.grok/config.toml` (телеметрия) и `~/.gemini/antigravity-cli/` (HUD), каждый только для выбранного поставщика. Перед созданием ссылок на навыки в папках поставщиков в домашней директории (Antigravity, Hermes, Kimi) установщик спрашивает разрешения.
- **Отказ от телеметрии**: Claude `DISABLE_TELEMETRY=1` (это также отключает Claude Code Remote Control) и статистика использования Gemini, Qwen, Codex и Grok. Задайте `telemetry: true`, чтобы оставить настройки поставщиков по умолчанию.
- **Настройки Claude Code**: незаданные ключи в `.claude/settings.json` заполняются, включая `skipDangerousModePermissionPrompt: true`, `effortLevel: high`, `cleanupPeriodDays: 180` и env-флаги, которые отключают auto memory, adaptive thinking, отправку отчётов об ошибках и встроенные инструкции git. Уже заданные вами значения сохраняются.
- **Co-author trailer**: атрибуция коммитов Claude Code становится `Co-Authored-By: First Fluke <our.first.fluke@gmail.com>`, а в PR добавляется строка "Generated with oh-my-agent". Задайте `scm.co_author.enabled: false`, чтобы это отключить.
- **Commit-msg guard**: `.githooks/commit-msg` отклоняет адреса `Co-authored-by`, которых нет ни в `.githooks/co-authors.allow`, ни в `scm.co_author.email`. `git config --local core.hooksPath .githooks` задаётся только тогда, когда другие хуки не активны; иначе oma выводит, как подключить guard в цепочку. Чтобы отказаться, задайте `scm.co_author.enforce_hook: false`.
- **Фоновые обновления**: `oma update` обновляет CLI `oma` в фоне (`auto_update_cli: false` или `OMA_SKIP_VERSION_CHECK=1`, чтобы это остановить) и запускает `uv tool upgrade serena-agent --prerelease=allow` (`serena.auto_update: false`, чтобы это остановить).
- **Таймер очистки Serena**: когда Serena работает в режиме `bridge` по умолчанию, первая сессия агента, запустившая общий сервер Serena, регистрирует таймер, который каждые 5 минут останавливает простаивающие общие серверы Serena (launchd `dev.oma.serena-daemon-gc`, пользовательский таймер systemd `oma-serena-daemon-gc.timer` или запланированная задача Windows `OMA Serena Daemon GC`). Задайте `serena.mode: stdio`, чтобы не запускать общий сервер и его таймер. `oma uninstall` не удаляет этот таймер.
- **Неинтерактивные запуски** (`-y`, `OMA_YES=1`, `CI=true`) используют пресет навыков `All`, если `--preset` не выбирает другой, плюс `model_preset: auto` и Python как язык бэкенда. Они не выбирают browser MCP (и пропускают скрипт установки Aside), если в `mcp.devtools_browsers` ещё нет ни одного.

---

## Способ 2: ручная установка через bunx

```bash
bunx oh-my-agent@latest
```

Эта команда запускает интерактивный установщик без bootstrap зависимостей. bun уже должен быть установлен.

Установщик предложит выбрать [пресет навыков](./glossary.md#skill-preset). Текущие пресеты определены в `PRESETS` в файле `cli/constants/skill-data.ts`:

### Пресеты {#presets}

Выберите пресет, соответствующий работе, которая нужна репозиторию. В названиях навыков ниже опущен префикс `oma-`.

| Пресет | Выбирайте, если проект — это | Включённые навыки | Количество |
|--------|-------------------------------|-----------------|-------|
| **all** | Любой проект, или вы хотите, чтобы все рабочие процессы работали сразу | Все навыки из реестра | 33 |
| **fullstack** | Веб- и мобильные клиенты с backend и инфраструктурой Terraform | architecture, brainstorm, design, frontend, backend, mobile, db, pm, qa, debug, scm, tf-infra, dev-workflow | 13 |
| **fullstack-web** | Веб-frontend с backend и базой данных | architecture, brainstorm, design, frontend, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **fullstack-mobile** | Мобильное приложение с backend и базой данных | architecture, brainstorm, design, mobile, backend, db, pm, qa, debug, scm, dev-workflow | 11 |
| **frontend** | Только веб-интерфейс | architecture, brainstorm, design, frontend, pm, qa, debug, scm | 8 |
| **backend** | API или сервис с базой данных | architecture, brainstorm, backend, db, pm, qa, debug, scm, dev-workflow | 9 |
| **mobile** | Только мобильное приложение | architecture, brainstorm, mobile, pm, qa, debug, scm | 7 |
| **devops** | Работа с инфраструктурой, CI/CD и observability | architecture, brainstorm, tf-infra, dev-workflow, observability, pm, qa, debug, scm | 9 |
| **security** | Сканирование безопасности, ревью кода и исправления | security, architecture, qa, debug, refactor, scm | 6 |
| **research** | Научные статьи, исследование рынка и конвертация PDF/HWP | scholar, market, pdf, hwp, academic-writing, search, translation, scm | 8 |
| **content** | Дизайн-ассеты, изображения, голос и текстовый контент | design, image, voice, academic-writing, translation, scm | 6 |

Пресеты — это наборы навыков; они не создают отдельное определение субагента для каждого навыка. Пресет `all` строится из актуального реестра навыков, поэтому список может расти вместе с репозиторием. Предметные пресеты включают только навыки для соответствующего фокуса.

Выберите пресет из командной строки:

```bash
oma install --preset frontend --yes
```

`--preset` использует имена из таблицы и имеет приоритет над интерактивным запросом навыков и неинтерактивным значением по умолчанию `all`. Неизвестное имя отклоняется до начала установки. Если опцию опустить, сохраняется существующий поток выбора. Опция выбирает навыки; общие файлы, агенты, рабочие процессы, хуки и настройка провайдеров по-прежнему следуют установщику runtime. Повторная установка с меньшим пресетом сохраняет ранее установленные навыки. Пользовательский выбор доступен только через интерактивное меню; `custom` и пустые значения `--preset` не принимает.

После установки прочитайте список выбранных навыков и отчёт о доступности рабочих процессов. Рабочий процесс открывается, только если манифесты требуемых навыков имеют корректные имена и описания. Уже сохранённые навыки могут удовлетворять этим требованиям. Условные ссылки сообщаются отдельно и не расширяют выбранный пресет. Эта проверка охватывает манифесты; инструменты, провайдеры, учётные данные и выполнение всё ещё нуждаются в собственных проверках.

### Рабочие процессы, которым нужны навыки вне пресета {#workflows-that-need-skills-outside-a-preset}

Каждый пресет копирует определения рабочих процессов и агентов. Команды и prompt открываются только для рабочих процессов, чьи требуемые навыки доступны. Например, свежая установка frontend оставляет `/work` недоступным, потому что в ней нет `oma-coordination`; уже имеющиеся навыки PM и QA удовлетворяют остальным требованиям входа. Установщик сообщает об этом недостающем навыке и не переключается на `all`.

| Рабочий процесс | Навыки, обязательные для входа | Пресеты, которые их включают |
|----------|-------------|-------------------------|
| `/work`, `/ultrawork`, `/ralph` | oma-coordination, oma-pm, oma-qa | all |
| `/orchestrate` | oma-coordination, oma-orchestration, oma-qa | all |
| `/docs` | oma-docs | all |
| `/explain` | oma-explanation | all |
| `/security` | oma-security | all, security |
| `/recap` | oma-recap | all |
| `/video` | oma-video | all |
| `/design` | oma-design | all, fullstack, fullstack-web, fullstack-mobile, frontend, content |
| `/architecture` | oma-architecture | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops, security |
| `/plan` | oma-pm | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops |
| `/review` | oma-qa | all, fullstack, fullstack-web, fullstack-mobile, frontend, backend, mobile, devops, security |
| `/scm` | oma-scm | все пресеты |

Ссылки, зависящие от ветки, остаются рекомендательными. Например, `/convert` выбирает инструменты PDF, HWP или video после проверки входных данных; `/ralph` и `/ultrawork` могут потребовать `oma-refactor` для ветки рефакторинга. Эти ссылки не являются безусловными требованиями входа.

Запустите `oma doctor`, чтобы диагностировать отсутствующие или недействительные манифесты. Чтобы добавить недостающий навык, выполните `oma install` и выберите **Select individually**. После исправления манифеста выполните `oma link`, чтобы обновить доступность рабочих процессов; повторная установка тоже её обновляет. Для глобальной установки OMA используйте соответствующую область `--global`. Существующие пользовательские команды сохраняются, когда недоступные команды OMA удаляются.

### Предметные плагины

Пользователи marketplace Claude Code могут выбрать предметную точку входа после добавления marketplace `oh-my-agent`:

```bash
claude plugin install oma-frontend@oh-my-agent
# Alternatives: oma-security@oh-my-agent, oma-research@oh-my-agent
```

Предметные точки входа содержат 8 навыков frontend, 6 навыков security или 8 навыков research и соответствующий набор нативных агентов. Их session bootstrap передаёт этот пресет установщику runtime. Общая настройка runtime и уже установленные навыки следуют поведению установщика, описанному выше. Запись `oma` сохраняет полный плагин. Те же предметные корни объявлены в сгенерированном каталоге marketplace Codex и в каталогах Grok Build и ZCode. Antigravity CLI (`agy plugin install ./antigravity-plugin` на сгенерированном дереве или архив релиза `oma-antigravity-plugin.tar.gz`), Grok Build CLI, ZCode и Kimi Code (`/plugins install`) читают каждый свой сгенерированный манифест; точные шаги для каждого хоста см. в разделе [Хосты плагинов, совместимые с Claude](../guide/vendor-capabilities.md#claude-compatible-plugin-hosts).

Закреплённые CI-задания хостов регистрируют локальный marketplace на чистых runner, устанавливают предметные точки входа и проверяют получившийся инвентарь. Эти проверки выполняются без вызовов модели. Учётные данные runtime, внешние провайдеры и успешная первая задача всё ещё нуждаются в собственной проверке. Проверки релиза также требуют, чтобы оба манифеста в каждом предметном корне совпадали с версией CLI и имели updater версии Release Please.

Общие ресурсы (`_shared/`) устанавливаются при любом пресете. В них входят базовая маршрутизация, загрузка контекста, структура prompt, обнаружение поставщиков, протоколы выполнения и протокол памяти.

### Что создаётся

После установки проект будет содержать:

```text
.agents/
├── oma-config.yaml          # Your preferences
├── oma-config.cue           # Optional schema-backed configuration
├── mcp.json                 # MCP server configuration
├── skills/
│   ├── _shared/             # Shared resources (always installed)
│   │   ├── core/            # skill-routing, context-loading, etc.
│   │   ├── runtime/         # memory-protocol, execution-protocols/
│   │   └── conditional/     # quality-score, experiment-ledger, etc.
│   ├── oma-frontend/        # Per preset
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                  # Other selected skills
├── workflows/               # Workflow definitions (all 20, every preset)
├── agents/                  # Subagent definitions (all 12, every preset)
├── hooks/                   # Hook sources (core/, variants/)
├── rules/                   # Project rules
├── results/                 # Plans and agent results (populated by workflows)
└── state/                   # Persistent workflow and coordination state
    └── memories/            # Runtime coordination state

.claude/
├── settings.json            # Vendor settings, when Claude Code is selected
├── hooks/
│   ├── oma-hook.sh          # Generated wrapper for the in-process hook chain
│   └── hud.ts               # Optional [OMA] statusline indicator
├── skills/                  # Symlinks → .agents/skills/
└── agents/                  # Generated native subagent files, when supported
```

Установщик создаёт каталоги поставщиков только для выбранных хостов. Исходный код хуков остаётся в `.agents/hooks/core/`; создаваемые файлы поставщиков являются результатами интеграции. В старых проектах Serena также может использовать устаревший каталог `.serena/memories/`.

---

## Способ 3: глобальная установка {#method-3-global-install}

Для использования CLI на уровне системы (дашборды, запуск агентов, диагностика) установите oh-my-agent глобально:

:::note
Этот раздел устанавливает команду `oma`. Это не то же самое, что `oma install --global`, которая устанавливает навыки, рабочие процессы и правила в глобальный home OMA (`~/.oma/.agents/`) для всех проектов. См. [Глобальная установка](../guide/global-install.md).
:::

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### Глобальная установка через npm / bun

```bash
bun install --global oh-my-agent
# or
npm install --global oh-my-agent
```

Так устанавливается команда `oma`, доступная из любого каталога и предоставляющая доступ ко всем командам CLI:

```bash
oma doctor # Health check
oma doctor --profile # Show resolved model/CLI per dispatch role
oma dashboard terminal # Terminal monitoring
oma dashboard web # Web dashboard at http://127.0.0.1:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update installed skills from the registry
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # Proxy MCP stdio to a shared per-project Serena server
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives
oma image # Multi-vendor AI image generation
oma video # Video generation and capture
oma slide # Presentation generation and export
```

`oma` — сокращение от `oh-my-agent`. Обе команды можно использовать как CLI-команды.

---

## Установка AI CLI-инструмента

Должен быть установлен хотя бы один AI CLI-инструмент. oh-my-agent поддерживает несколько поставщиков, и их можно смешивать, назначая разные CLI разным агентам через сопоставление агент–CLI.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

Аутентификация выполняется автоматически при первом запуске. Claude Code использует `.claude/` для хуков и настроек, а навыки подключает символическими ссылками из `.agents/skills/`.

### Codex CLI

```bash
bun install --global @openai/codex
# or
npm install --global @openai/codex
```

После установки выполните `codex login` для аутентификации.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

После установки выполните `/auth` внутри CLI для аутентификации.

### Antigravity CLI (`agy`)

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

Аутентификация через `agy` выполняется при первом запуске. Бинарный файл называется `agy`. В headless-средах вместо этого задайте переменную окружения `ANTIGRAVITY_API_KEY`. `oma doctor` сообщает состояние аутентификации через `~/.gemini/antigravity-cli/cache/onboarding.json`.

---

## oma-config.yaml

Команда `oma install` создаёт `.agents/oma-config.yaml`. Это центральный файл конфигурации всего поведения oh-my-agent:

```yaml
# Required
language: en
model_preset: auto          # follows the current runtime's native model settings

# Optional — date/time preferences
date_format: ISO
timezone: Australia/Sydney  # omit to use the system timezone

# Optional — auto-update the CLI in background
auto_update_cli: true
telemetry: false

# Optional — capability providers (defaults are context7/native/serena/agentmemory)
# providers:
#   docs: context7
#   web: native
#   code_intelligence: serena
#   code_intelligence_guard: block   # deny native Grep/Glob/rg while serena is configured (off to disable)
#   semantic_memory: agentmemory

# Optional — browser DevTools MCP. Omit to preserve the current setup.
# mcp:
#   devtools_browsers: [aside]

# Optional — partial override per agent (object-only, shallow merge)
agents:
  backend: { model: openai/gpt-6.1-terra, effort: high }
  qa:      { model: anthropic/claude-sonnet-5-5 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.8 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-6.1-terra, effort: high }
```

### Справочник полей

| Поле | Тип | Обязательно | Описание |
|-------|------|----------|-------------|
| `language` | string | Да | Код языка ответов. Поддерживаются en, ko, ja, zh, es, fr, de, pt, ru, nl, pl. |
| `model_preset` | string | Да | Ключ активного [пресета моделей](./glossary.md#model-preset). `auto` следует текущему runtime; фиксированные ключи включают `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` и `mixed`. Допустимы и пользовательские ключи пресетов. См. [модели для агентов](../guide/per-agent-models.md). |
| `agents` | map | Нет | Переопределения модели для роли; `agents.default` хранит `cli` (запасной CLI для `oma agent spawn`, когда явные настройки агента и выбранный пресет не определяют поставщика), а также `effort`, `thinking` и `memory` по умолчанию. |
| `providers` | map | Нет | Провайдеры возможностей: `code_intelligence` (`serena` или `gortex`), `code_intelligence_guard` (`block` или `off`), `docs` (`context7`), `web` (`native` или `brave`) и `semantic_memory` (`agentmemory`, `honcho` или `none`); их разделы учётных данных (`brave`, `exa`, `honcho`); и именованные LLM-провайдеры, такие как `free` (шлюз FreeLLMAPI, который использует `model_preset: free`). API-ключи храните в переменных окружения. |
| `date_format` | string | Нет | Формат временных меток (`ISO`, `US`, `EU`). По умолчанию: `ISO`. |
| `timezone` | string | Нет | Идентификатор часового пояса (например, `Asia/Seoul`). Если значение не задано, используется часовой пояс системы хоста. |
| `auto_update_cli` | boolean | Нет | Могут ли обычные проверки CLI обновляться в фоне. По умолчанию: `true` (отключите значением `false`). |
| `telemetry` | boolean | Нет | Согласие на телеметрию поставщика. По умолчанию: `false`. |
| `agents` | map | Нет | Частичные переопределения для отдельных агентов (объектный `AgentSpec`). Поверх значений пресета выполняется неглубокое слияние. |
| `models` | map | Нет | Пользовательские slug моделей, ранее хранившиеся в `models.yaml`. |
| `custom_presets` | map | Нет | Пользовательские пресеты. Поддерживают `extends:` для частичного наследования встроенного пресета. |
| `mcp.devtools_browsers` | list | Нет | Браузеры для DevTools MCP: `aside`, `chrome` или `firefox`. Если поле не задано, текущая настройка сохраняется; `[]` явно отключает сервер браузера. |
| `serena.mode` | string | Нет | `bridge` использует общий сервер Serena проекта и является режимом по умолчанию; `stdio` выбирает отдельный процесс для каждой сессии. |
| `serena.auto_update` | boolean | Нет | Обновляет ли `oma update` Serena. По умолчанию: `true`. |

> **Формат конфигурации:** корректный `.agents/oma-config.cue` вычисляется как общая конфигурация. Если вычисление общей CUE-конфигурации завершается ошибкой, загрузчик может перейти к `.agents/oma-config.yaml`; локальный overlay (`oma-config.local.cue` или `.yaml`) необязателен, а некорректное локальное намерение считается фатальной ошибкой. `OMA_MODEL_PRESET` переопределяет значение файла для текущего процесса.

### Разрешение поставщика

При запуске агента CLI разрешает настройки в таком порядке: `agents.<id>`, выбранный `model_preset`, резервный orchestrator пресета, затем `agents.default.cli`. При `model_preset: auto` модель предоставляет нативная конфигурация текущего runtime; неизвестный runtime переходит к `agents.default.cli`. Полную матрицу см. в [моделях для агентов](../guide/per-agent-models.md).

---

## Проверка: `oma doctor`

После установки и настройки проверьте, что всё работает:

```bash
oma doctor
```

Эта команда проверяет:
- установлен ли выбранный CLI хоста и доступен ли он; необязательные инструменты выводятся отдельно
- корректны ли настроенные записи MCP-серверов (например, Serena, Gortex, Context7 или DevTools)
- существуют ли файлы навыков и содержат ли они корректный frontmatter SKILL.md
- указывают ли символические ссылки и скрипты хуков на действительные цели
- правильно ли хуки настроены в файлах настроек поставщиков
- доступны ли выбранные провайдеры code intelligence и памяти (для Gortex также проверяется, входит ли текущий проект в набор, отслеживаемый демоном)
- корректен ли `oma-config.cue` / `oma-config.yaml` и содержит ли обязательные поля

Если что-то не так, `oma doctor` указывает отсутствующий или некорректный элемент и отделяет блокеры первой задачи от необязательных предупреждений интеграции.

Чтобы посмотреть разрешённые модель и CLI для каждого агента, выполните:

```bash
oma doctor --profile
```

Полную матрицу и сведения о миграции см. в [моделях для агентов](../guide/per-agent-models.md).

---

## Обновление

### Обновление CLI

```bash
oma update
```

Команда обновляет глобальный CLI oh-my-agent до последней версии.

### Обновление навыков проекта

Навыки и рабочие процессы проекта можно обновлять через GitHub Action (`action/`) автоматически или вручную, повторно запустив установщик:

```bash
bunx oh-my-agent@latest
```

Установщик обнаружит существующую установку и предложит обновление, сохранив `oma-config.yaml` и пользовательскую конфигурацию.

---

## Что дальше

Откройте проект в выбранной AI IDE или CLI и начните пользоваться oh-my-agent. Маршрутизация навыков зависит от хоста; включённые хуки могут обнаруживать рабочие процессы. Попробуйте:

```text
"Build a login form with email validation using Tailwind CSS"
```

Или используйте команду рабочего процесса:

```text
/plan authentication feature with JWT and refresh tokens
```

Подробные примеры приведены в [руководстве по использованию](/docs/guide/usage), а описание каждой специализации — в разделе [агенты](/docs/core-concepts/agents). Если установка или хук ведут себя не так, как ожидалось, см. [Устранение неполадок](../guide/troubleshooting.md).
