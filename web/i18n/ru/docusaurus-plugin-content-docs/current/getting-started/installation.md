---
title: Установка
description: Установите oh-my-agent, выберите навыки и провайдеров, разберитесь в создаваемых файлах проекта, настройте модели и параметры runtime и проверьте установку с помощью oma doctor.
---

# Установка

## Предварительные требования

- **IDE или CLI с поддержкой AI**: хотя бы один поддерживаемый хост, например Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot или Hermes
- **bun**: среда выполнения JavaScript и менеджер пакетов (если его нет, скрипт установки установит его автоматически)
- **uv**: менеджер пакетов Python (bootstrap-скрипт предложит установить его, если он отсутствует)
- **Провайдер code intelligence**: провайдером по умолчанию является Serena. Также поддерживается Gortex, если он выбран в конфигурации провайдеров. Установщик может подготовить Serena через `uv tool install`; если необязательная зависимость недоступна, он продолжит работу с предупреждением. Если выбран Gortex, в режиме проекта `oma install` и `oma update` регистрируют проект в демоне Gortex (`gortex track`), если он ещё не отслеживается, и добавляют сгенерированные OMA каталоги в список исключений этого проекта через Gortex CLI; в дерево проекта ничего не записывается. Сам Gortex необходимо устанавливать отдельно.

Установщик группирует интеграции по возможностям. К hook-провайдерам относятся Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro и Qwen; OpenCode и pi используют extension bridge; GitHub Copilot и Hermes получают ссылки на навыки, а ZCode — команды рабочих процессов. Можно выбрать несколько поставщиков, но для первой задачи достаточно хоста, которым вы планируете пользоваться.

---

## Способ 0: skills CLI (самый быстрый, если нужны только навыки)

Установите пакет навыков OMA в обнаруженные runtime агентов:

```bash
npx skills add first-fluke/oh-my-agent
```

Это самая лёгкая точка входа, если нужны навыки без полного harness. Для рабочих процессов, правил, хуков, шлюзов и `oma agent spawn` используйте способ 1 или 2 ниже.

## Способ 1: установка одной строкой (полный harness)

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
3. Запускают интерактивный установщик с выбором пресета и провайдеров
4. Создают `.agents/` с выбранными навыками и конфигурацией
5. Настраивают слои интеграции runtime (хуки, символические ссылки, настройки обнаруженных поставщиков)
6. Настраивают MCP-серверы code intelligence и памяти

Bootstrap продолжает работу после сбоев необязательных зависимостей и выводит команды для дальнейших действий. После завершения установщика запустите `oma doctor`.

---

## Способ 2: ручная установка через bunx

```bash
bunx oh-my-agent@latest
```

Эта команда запускает интерактивный установщик без bootstrap зависимостей. bun уже должен быть установлен.

Установщик предложит выбрать пресет навыков. Текущие пресеты определены в `cli/constants/skill-data.ts`:

### Пресеты

| Пресет | Включённые навыки |
|--------|------------------|
| **all** | Все 33 текущих пакета навыков |
| **fullstack** | Архитектура, мозговой штурм, дизайн, frontend, backend, mobile, базы данных, PM, QA, отладка, SCM, Terraform и рабочий процесс разработки |
| **fullstack-web** | Полная веб-разработка, архитектура, дизайн, PM, QA, отладка, SCM и рабочий процесс разработки |
| **fullstack-mobile** | Fullstack-разработка с фокусом на mobile, архитектура, дизайн, PM, QA, отладка, SCM и рабочий процесс разработки |
| **frontend** | Архитектура, мозговой штурм, дизайн, frontend, PM, QA, отладка и SCM |
| **backend** | Архитектура, мозговой штурм, backend, базы данных, PM, QA, отладка, SCM и рабочий процесс разработки |
| **mobile** | Архитектура, мозговой штурм, mobile, PM, QA, отладка и SCM |
| **devops** | Архитектура, мозговой штурм, Terraform, рабочий процесс разработки, observability, PM, QA, отладка и SCM |
| **research** | Scholar, market, PDF, HWP, academic writing, search, translation и SCM |
| **content** | Design, image, voice, academic writing, translation и SCM |

Пресеты — это наборы навыков; они не создают отдельное определение субагента для каждого навыка. Пресет `all` строится из актуального реестра навыков, поэтому список может расти вместе с репозиторием. Предметные пресеты включают только навыки, нужные для соответствующего фокуса.

Общие ресурсы (`_shared/`) устанавливаются при любом пресете. В них входят базовая маршрутизация, загрузка контекста, структура prompt, обнаружение поставщиков, протоколы выполнения и протокол памяти.

### Что создаётся

После установки проект будет содержать:

```
.agents/
├── oma-config.yaml # Your preferences
├── oma-config.cue # Optional schema-backed configuration
├── skills/
│ ├── _shared/ # Shared resources (always installed)
│ │ ├── core/ # skill-routing, context-loading, etc.
│ │ ├── runtime/ # memory-protocol, execution-protocols/
│ │ └── conditional/ # quality-score, experiment-ledger, etc.
│ ├── oma-frontend/ # Per preset
│ │ ├── SKILL.md
│ │ └── resources/
│ └── ... # Other selected skills
├── workflows/ # Current workflow definitions (21 in this checkout)
├── agents/ # Subagent definitions
├── mcp.json # MCP server configuration
├── results/ # Plans and agent results (populated by workflows)
└── state/ # Persistent workflow and coordination state

.claude/
├── settings.json # Vendor settings, when Claude Code is selected
├── hooks/oma-hook.sh # Generated wrapper for the in-process hook chain
├── hooks/hud.ts # Optional [OMA] statusline indicator
├── skills/ # Symlinks → .agents/skills/
└── agents/ # Generated native subagent files, when supported

.agents/state/memories/
└── ... # Runtime coordination state
```

Установщик создаёт каталоги поставщиков только для выбранных хостов. Исходный код хуков остаётся в `.agents/hooks/core/`; создаваемые файлы поставщиков являются результатами интеграции. В старых проектах Serena также может использовать устаревший каталог `.serena/memories/`.

---

## Способ 3: глобальная установка

Для использования CLI на уровне системы (дашборды, запуск агентов, диагностика) установите oh-my-agent глобально:

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
oma dashboard web # Web dashboard at http://localhost:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update oh-my-agent
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # MCP stdio ↔ Streamable HTTP bridge
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives (alias: `oma s`)
oma image # Multi-vendor AI image generation (alias: `oma img`)
oma video # Video generation and capture
oma slide # Presentation generation and export
oma export # Export skills for external IDEs (e.g. cursor)
oma star # Star the repository
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
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.6 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### Справочник полей

| Поле | Тип | Обязательно | Описание |
|-------|------|----------|-------------|
| `language` | string | Да | Код языка ответов. Поддерживаются en, ko, ja, zh, es, fr, de, pt, ru, nl, pl. |
| `model_preset` | string | Да | Ключ активного пресета. `auto` следует настройкам модели текущего runtime; фиксированные ключи включают `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` и `mixed`. Допустимы и пользовательские ключи пресетов. См. [модели для агентов](../guide/per-agent-models.md). |
| `default_cli` | string | Нет | Резервный CLI для `oma agent spawn`, если явные настройки агента и выбранный пресет не определяют поставщика. |
| `free` | map | Нет | Настройки шлюза FreeLLMAPI, используемые при `model_preset: free`; API-ключи следует хранить в переменных окружения. |
| `providers` | map | Нет | Провайдеры возможностей: `code_intelligence` (`serena` или `gortex`), `code_intelligence_guard` (`block` или `off`), `docs` (`context7`), `web` (`native` или `brave`) и `semantic_memory` (`agentmemory`, `honcho` или `none`). |
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

При запуске агента CLI разрешает настройки в таком порядке: `agents.<id>`, выбранный `model_preset`, резервный orchestrator пресета, затем `default_cli`. При `model_preset: auto` модель предоставляет нативная конфигурация текущего runtime; неизвестный runtime переключается на `default_cli`. Полную матрицу см. в [моделях для агентов](../guide/per-agent-models.md).

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

```
"Build a login form with email validation using Tailwind CSS"
```

Или используйте команду рабочего процесса:

```
/plan authentication feature with JWT and refresh tokens
```

Подробные примеры приведены в [руководстве по использованию](/docs/guide/usage), а описание каждой специализации — в разделе [агенты](/docs/core-concepts/agents).
