---
title: "Команды CLI"
description: "Полный справочник всех команд CLI oh-my-agent: синтаксис, параметры и примеры, организованные по категориям."
---

# Команды CLI

После глобальной установки (`bun install --global oh-my-agent`) используйте `oma` или `oh-my-agent`. Для однократного запуска без установки выполните `npx oh-my-agent`.

Переменной окружения `OH_MY_AG_OUTPUT_FORMAT` можно задать значение `json`, чтобы включить машиночитаемый вывод в командах, которые его поддерживают. Это эквивалентно передаче `--json` каждой команде.

## Начните с задачи

Выбирайте минимальную команду, которая отвечает на ваш вопрос. Каждая команда ниже выводит путь или отчёт, который можно изучить, прежде чем переходить к следующему шагу.

| Задача | Начать здесь | Ожидаемый результат |
|:-----|:-----------|:----------------|
| Установить или восстановить проект | `oma install`, затем `oma doctor` | Установленные ресурсы и отчёт о состоянии; если вопрос в разрешении моделей, используйте `oma doctor --profile`. |
| Найти команду или параметр изнутри агента | `oma describe` или `oma describe "image generate"` | JSON с описанием аргументов, параметров и вложенных команд. |
| Сгенерировать изображение | `oma image generate "<prompt>" --output json` | Пути к изображениям и манифест в `.agents/results/images/`. |
| Спланировать или отрендерить видео | `oma video generate "<brief>" --dry-run` | Каталог запуска с артефактами планирования; запускайте compose и render только после того, как composition написана. |
| Создать интерактивное объяснение кода | `/explain` | Проверенный автономный HTML-артефакт в `.agents/results/explain/`. |
| Определить движок диаграмм | `oma diagram resolve --output json` | Выбранный движок Mermaid или archify и причина выбора. |
| Исследовать сигналы сообщества | `oma market detect-trap "<topic>"` | Результат предварительной проверки; переходите к `oma market resolve --output json` и запуску upstream, только если проверка пройдена. |
| Преобразовать или изучить статью | `oma scholar search "<query>"` | Результаты поиска из Knows, OpenAlex или Semantic Scholar; sidecar можно получить через `oma scholar get`. |
| Собрать презентацию | `oma slide create --output-dir <dir>` | Рабочий каталог, который можно наполнять, проверять, собирать в bundle и экспортировать. |
| Проверить расхождения документации | `oma docs verify --json` | Структурированный отчёт о битых ссылках и заново сгенерированный индекс ссылок. |

Реестр, хранящийся в репозитории, — источник этой карты команд. Канонические имена для обнаружения ниже берутся из `oma describe`; интерактивная справка может показывать алиасы совместимости, например `slide new`, `slide viewer`, `image list-vendors` или `video list-providers`.

## Текущий набор команд

Эта карта упрощает просмотр подробного справочника ниже и помогает найти редко используемые семейства команд. Точную грамматику аргументов смотрите в `--help` каждого семейства или в `oma describe <path>`; [Опции CLI](./options.md) содержит полную матрицу флагов реестра.

| Семейство | Зарегистрированные пути |
|:-------|:-----------------|
| `install` | `install` |
| `describe` | `describe` |
| `uninstall` | `uninstall` |
| `update` | `update`, `update mcp` |
| `link` | `link` |
| `intel` | `intel`, `intel suggest` |
| `market` | `market`, `market detect-trap`, `market resolve`, `market update`, `market run` |
| `doctor` | `doctor` |
| `profile` | `profile`, `profile list`, `profile show`, `profile create`, `profile use`, `profile run` |
| `retro` | `retro` |
| `recap` | `recap` |
| `docs` | `docs`, `docs verify`, `docs sync`, `docs i18n`, `docs lint` |
| `emit` | `emit` |
| `cleanup` | `cleanup` |
| `bridge` | `bridge` |
| `verify` | `verify`, `verify agent`, `verify triggers` |
| `vault` | `vault`, `vault store`, `vault get`, `vault list`, `vault delete` |
| `star` | `star` |
| `visualize` | `visualize` |
| `search` | `search`, `search providers`, `search web`, `search fetch`, `search meta`, `search media`, `search archive`, `search trust`, `search code`, `search doctor`, `search api`, `search api fetch`, `search api search`, `search rss`, `search rss fetch`, `search rss google` |
| `harness` | `harness`, `harness eval`, `harness incident`, `harness feedback`, `harness evolution enable`, `harness evolution status`, `harness evolution disable`, `harness evolution run` |
| `slide` | `slide`, `slide validate`, `slide bundle`, `slide edit`, `slide doctor`, `slide create`, `slide preview`, `slide export`, `slide export pdf`, `slide export png`, `slide export pptx`, `slide import`, `slide import pptx`, `slide asset`, `slide asset fetch-video`, `slide style`, `slide style list`, `slide style preview`, `slide style get` |
| `scholar` | `scholar`, `scholar search`, `scholar resolve`, `scholar get`, `scholar lint` |
| `image` | `image`, `image generate`, `image doctor`, `image vendor`, `image vendor list` |
| `video` | `video`, `video generate`, `video doctor`, `video compose`, `video render`, `video provider`, `video provider list` |
| `serena` | `serena`, `serena reap`, `serena reaper`, `serena reaper enable`, `serena reaper disable` |
| `explain` | `explain`, `explain validate` |
| `diagram` | `diagram`, `diagram resolve`, `diagram update`, `diagram archify` |
| `help` | `help` |
| `version` | `version` |
| `dashboard` | `dashboard`, `dashboard terminal`, `dashboard web` |
| `auth` | `auth`, `auth status` |
| `hook` | `hook`, `hook run`, `hook probe` |
| `state` | `state`, `state emit`, `state migrate`, `state get`, `state list`, `state repair`, `state verify`, `state decisions`, `state decisions list`, `state inject-log`, `state inject-log list`, `state inject-log get`, `state summary`, `state trajectory`, `state heal-check`, `state activate`, `state archive`, `state purge` |
| `ralph` | `ralph`, `ralph verify` |
| `goal` | `goal`, `goal set` |
| `stats` | `stats`, `stats get`, `stats reset` |
| `agent` | `agent`, `agent context`, `agent resume`, `agent begin`, `agent verify`, `agent finish`, `agent spawn`, `agent status`, `agent parallel`, `agent review` |
| `model` | `model`, `model check`, `model probe`, `model propose` |
| `memory` | `memory`, `memory keys`, `memory init`, `memory setup`, `memory daemon`, `memory daemon status`, `memory daemon start`, `memory daemon stop`, `memory daemon restart`, `memory service`, `memory service install`, `memory service uninstall`, `memory status`, `memory retry`, `memory retry drain`, `memory import`, `memory maintain`, `memory maintain backup`, `memory maintain prune`, `memory maintain vacuum`, `memory gc`, `memory upgrade` |
| `skill` | `skill`, `skill audit`, `skill lint`, `skill eval`, `skill optimize`, `skill meta-optimize`, `skill procedure`, `skill evolution-stats`, `skill promotions`, `skill rollback` |
| `schedule` | `schedule`, `schedule create`, `schedule list`, `schedule delete`, `schedule run`, `schedule sync` |

Когда команда передаёт оставшиеся аргументы другому инструменту, реестр намеренно оставляет её параметры открытыми. Это относится к `market run` и `diagram archify`; перед изменяющей или сетевой операцией прочитайте справку разрешённого upstream-инструмента.

---

## Настройка и установка

### install

`oma` без аргументов запускает интерактивный установщик. `oma install` — явная форма команды; она принимает параметры выбора провайдеров.

```
oma
oma install
oma install --web-search native --code-intelligence gortex --semantic-memory agent-memory
```

Если `--web-search`, `--code-intelligence` и `--semantic-memory` не указаны, сохраняется ранее выбранный провайдер. `--honcho-url` и `--honcho-workspace` настраивают новое подключение к Honcho, если выбран этот провайдер. Корневой флаг `-y, --yes` пропускает запросы и использует значения по умолчанию; `--global` выбирает установку в HOME.

**Что делает команда:**
1. Ищет устаревший каталог `.agent/` и, если он найден, переносит его в `.agents/`.
2. Обнаруживает конкурирующие инструменты и предлагает их удалить.
3. Запрашивает тип проекта (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. Если выбран backend, запрашивает вариант языка (Python, Node.js, Rust, Other).
5. Спрашивает, нужны ли символические ссылки для GitHub Copilot.
6. Загружает последний tarball из реестра.
7. Устанавливает общие ресурсы, рабочие процессы, конфигурации и выбранные навыки.
8. Устанавливает адаптации для выбранных вендоров (локальные настройки проекта; без скрытой записи файлов вендоров на уровне HOME).
9. Создаёт символические ссылки CLI.
10. Предлагает рекомендуемую **глобальную** конфигурацию git (применяется только после подтверждения):
    - `rerere.enabled=true` — повторное использование разрешений merge-конфликтов при работе нескольких агентов
    - `init.defaultBranch=main` — единая ветка по умолчанию для новых репозиториев
    - Полностью пропускается при `--yes` / в CI (вместо этого выводятся подсказки для ручного исправления)
11. Предлагает настроить MCP, где это применимо.
12. Предлагает поставить звезду на GitHub, если `gh` аутентифицирован.

**Пример:**
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
|:-----|:-----------|
| `--json` | Вывод в формате JSON |
| `--output <format>` | Формат вывода (`text` или `json`) |
| `--profile` | Показывает матрицу состояния профилей: для каждого агента — итоговый slug модели, CLI и статус аутентификации с учётом активного `model_preset` и переопределений `agents:`. См. [Модели по агентам](../guide/per-agent-models.md). |

**Что проверяется:**
- Установленные CLI: agy, claude, codex, qwen (версия и путь).
- Статус аутентификации каждого CLI.
- Конфигурация MCP: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Установленные навыки: какие навыки есть и в каком они состоянии.
- Каталог хранилища памяти: наличие `.agents/state/memories/` и число файлов (в старых проектах используется устаревший путь `.serena/memories/`).
- Маркеры двойной установки (проектной и глобальной) и связанные предупреждения.
- Рекомендуемая **глобальная** конфигурация git (`gitRecommended` в JSON):
  - `rerere.enabled=true`
  - `init.defaultBranch=main`
  - Каждое несоответствие учитывается в `totalIssues`
- Файл контекста вендора проекта (блок OMA в `AGENTS.md`, если установлен Codex, Qwen или Claude Code ≥ 2.1.277).
- Состояние AgentMemory и state/hooks, диагностика Serena reaper и связанные счётчики проблем.

**Автоисправление:** если обнаружены отсутствующие навыки, `doctor` предлагает интерактивно их установить. Если рекомендуемая конфигурация git отсутствует или неверна, он предлагает те же глобальные исправления с подтверждением, что и install/update.

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
|:-----|:-----------|
| `-f, --force` | Перезаписывает изменённые пользователем файлы конфигурации (`oma-config.yaml`, `mcp.json`, каталоги `stack/`) |
| `--with-new-skills` | Устанавливает навыки, появившиеся в этом релизе; без флага обновляются только уже установленные навыки. |
| `--ci` | Неинтерактивный режим CI (без запросов, вывод обычным текстом) |
| `-y, --yes` | Пропускает запросы. Набор вендоров не меняется: обновляются только существующие каталоги вендоров, если не указан `--all` или `--vendor`. |
| `--all` | Создаёт или обновляет всех поддерживаемых вендоров уровня проекта. |
| `--vendor <vendors>` | Создаёт или обновляет указанных вендоров. Принимает список через запятую, например `claude,qwen`. |

**Что делает команда:**
1. Загружает `prompt-manifest.json` из реестра, чтобы узнать последнюю версию.
2. Сравнивает её с локальной версией в `.agents/skills/_version.json`.
3. Если версия актуальна, завершает работу.
4. Загружает и распаковывает последний tarball.
5. Сохраняет изменённые пользователем файлы (если не указан `--force`).
6. Копирует новые файлы поверх `.agents/`.
7. Восстанавливает сохранённые файлы.
8. Обновляет адаптации вендоров и символические ссылки. По умолчанию затрагиваются только каталоги вендоров, которые уже есть в проекте.
9. Предлагает рекомендуемую **глобальную** конфигурацию git (с тем же подтверждением, что и install: `rerere.enabled`, `init.defaultBranch`). Пропускается при `--yes` / `--ci`.

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

У `oma update mcp` есть собственные параметры `--yes`, `--ci`, `--all` и `--vendor <vendors>`. Команда выбирает поддерживаемые браузерные MCP-серверы (Aside, Chrome DevTools или Firefox DevTools) для выбранных вендоров уровня проекта.

### uninstall

Предварительно просматривает или удаляет файлы OMA из выбранного корня установки:

```
oma uninstall --dry-run
oma uninstall --yes
```

`--dry-run` показывает, что будет удалено, не изменяя файлы. `--yes` пропускает запрос подтверждения. Согласно зарегистрированному описанию команды, она сохраняет `oma-config.yaml`, `mcp.json` и навыки, созданные пользователем. Если в предварительном просмотре есть файл, который вам ещё нужен, остановитесь и сохраните вывод dry-run для проверки.

### link

Заново генерирует нативные файлы вендоров из источника истины `.agents/` без переустановки.

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

Без `--global` link работает с `<cwd>/.agents/`, с ним — с `~/.agents/` (или `OMA_HOME`). См. [Глобальная установка](../guide/global-install.md).

**Что делает команда:**
1. Пересобирает нативные файлы агентов для вендоров из `.agents/agents/`
2. Обновляет хуки и локальные настройки выбранных вендоров
3. Заново генерирует блок интеграции `AGENTS.md` для каждого настроенного вендора, включая Claude Code. `CLAUDE.md` и `GEMINI.md` никогда не создаются и не получают блок OMA. Claude Code ≥ 2.1.277 читает `AGENTS.md` нативно, но игнорирует его всякий раз, когда существует `CLAUDE.md`, поэтому при наличии пользовательского `CLAUDE.md` link добавляет одну строку импорта `@AGENTS.md`; `oma update` также удаляет устаревший блок OMA из `CLAUDE.md`, как только обнаруживает эту версию
4. При необходимости обновляет привязку MCP для Cursor и символические ссылки навыков CLI

Используйте эту команду после изменения `.agents/agents/`, `.agents/workflows/`, `.agents/rules/` или определений хуков.

**Поведение моделей:**
- Нативная диспетчеризация в пределах того же вендора использует модель, заданную в сгенерированном файле агента этого вендора.
- Внешняя резервная диспетчеризация использует `default_model` каждого вендора из `.agents/skills/oma-orchestration/config/cli-config.yaml`.

**Поведение диспетчеризации:**
- Если целевой вендор совпадает с текущим runtime и этот runtime поддерживает нативных ролевых агентов, OMA использует нативную диспетчеризацию.
- В противном случае OMA переходит к `oma agent spawn`.

### setup (рабочий процесс)

Рабочий процесс `/setup` (вызывается внутри сессии агента) обеспечивает интерактивную настройку языка, установок CLI, подключений MCP и сопоставления агентов с CLI. Это не то же самое, что `oma` (установщик): `/setup` настраивает уже установленный экземпляр.

---

## Мониторинг и метрики

### dashboard

Запускает терминальный дашборд для мониторинга агентов в реальном времени.

```
oma dashboard terminal
```

Опций нет. Отслеживает `.agents/state/memories/` в текущем каталоге (в старых проектах используется устаревший путь `.serena/memories/`). Рисует псевдографический интерфейс со статусом сессии, таблицей агентов и лентой активности. Обновляется при каждом изменении файлов. Для выхода нажмите `Ctrl+C`.

Каталог memories можно переопределить переменной окружения `MEMORIES_DIR`.

**Пример:**
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

Запускает HTTP-сервер на `http://localhost:9847` с WebSocket-подключением для обновлений в реальном времени. Чтобы увидеть дашборд, откройте этот URL в браузере.

**Переменные окружения:**

| Переменная | По умолчанию | Описание |
|:---------|:--------|:-----------|
| `DASHBOARD_PORT` | `9847` | Порт HTTP/WebSocket-сервера |
| `MEMORIES_DIR` | `{cwd}/.agents/state/memories` | Путь к каталогу memories (в старых проектах используется устаревший `{cwd}/.serena/memories`) |

**Пример:**
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
|:-----|:-----------|
| `--json` | Вывод в формате JSON |
| `--output <format>` | Формат вывода (`text` или `json`) |

**Отслеживаемые метрики:**
- Количество сессий
- Использованные навыки (с частотой)
- Выполненные задачи
- Общее время сессий
- Изменённые файлы, добавленные и удалённые строки
- Время последнего обновления

**Телеметрия затрат** (агрегируется по всем файлам `session-cost-*.md` в `.agents/state/memories/`):
- Общее число входных токенов (приближённая оценка по символам промпта; выходные токены пока не учитываются)
- Общее число запусков (spawn)
- Оценка в USD по консервативной таблице ставок за входные токены для каждого вендора (Claude $3/M, Codex $5/M, Gemini $0.3/M, Qwen $0/M, Cursor $5/M, Antigravity $0.3/M)
- Разбивка по вендорам (токены · запуски · USD)

Эта оценка — нижняя граница, а не точная сумма для выставления счетов. Чтобы применять жёсткие бюджеты при запуске агентов, настройте `session.quota_cap` в `.agents/oma-config.yaml`; о наборе средств с приоритетом качества, к которому относятся эти лимиты, рассказывает страница «Зачем нужен oh-my-agent» в разделе «Начало работы».

Метрики хранятся в `.agents/state/metrics.json`; устаревший `.serena/metrics.json` тоже читается, если он есть. Данные собираются из статистики git и файлов памяти.

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
|:-----|:-----------|:--------|
| `--window <period>` | Временное окно: `1d`, `3d`, `7d`, `2w`, `30d` | `1d` |
| `--date <date>` | Конкретная дата (`YYYY-MM-DD`); имеет приоритет над `--window` | |
| `--tool <tools>` | Фильтр через запятую: `grok,claude,codex,qwen,cursor,antigravity` | все |
| `--top <n>` | Показать N самых активных проектов/тем | |
| `--sort <metric>` | Сортировка по `count` или `duration` | `count` |
| `--mermaid` | Вывод в виде диаграммы Ганта Mermaid | |
| `--graph` | Открыть интерактивный граф в браузере | |
| `--json` / `--output <format>` | Машиночитаемый вывод | `text` |

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
|:---------|:-----------|:--------|
| `window` | Временное окно анализа (например, `7d`, `2w`, `1m`) | Последние 7 дней |

**Параметры:**

| Флаг | Описание |
|:-----|:-----------|
| `--json` | Вывод в формате JSON |
| `--output <format>` | Формат вывода (`text` или `json`) |
| `--interactive` | Интерактивный режим с ручным вводом |
| `--compare` | Сравнить текущее окно с предыдущим окном той же длины |

**Что показывает:**
- Краткая сводка для публикации (метрики в одну строку)
- Сводная таблица (коммиты, изменённые файлы, добавленные/удалённые строки, участники)
- Тренды относительно прошлой ретроспективы (если есть предыдущий снимок)
- Рейтинг участников
- Распределение коммитов по времени (почасовая гистограмма)
- Рабочие сессии
- Разбивка коммитов по типам (feat, fix, chore и т. д.)
- Горячие точки (наиболее часто изменяемые файлы)

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

Выводит список сессий рабочих процессов OMA текущего проекта. Явный глобальный поиск
показывает сессии всех проектов в пределах выбранного локального профиля:

```bash
oma state list
oma state list --all-projects --json
oma state list --all-projects --project /path/to/project
oma state list --all-projects --search migration
```

`--all-projects` работает только на чтение. Его нельзя сочетать с активацией
или обслуживанием сессий. Обычные чтение и запись сессий остаются в пределах своего проекта.
Устаревшие сессии других репозиториев сначала нужно перенести в домашнее хранилище,
и только после этого они появятся в общем списке.

### profile

Управляет профилями локального хранилища в `~/.oma/u/<slot>/`. Слоты —
неотрицательные десятичные целые числа; они не связаны с пресетами моделей
и учётными записями входа у провайдеров.

```bash
oma profile list --json
oma profile create 1
oma profile show
eval "$(oma profile use 1 --shell zsh)"
oma profile show
oma profile run 1 -- oma state list --all-projects --json
```

`profile use` выводит команды активации для shell; их выполнение через eval задаёт `OMA_PROFILE` в
текущем shell. Запущенная сама по себе, команда не изменяет родительский shell, не влияет
на уже работающие приложения и не сохраняет отдельное значение по умолчанию только для CLI. Команды CLI
и хуки вендоров, запущенные из активированного shell, наследуют тот же профиль.
По умолчанию используется профиль `0`; `OMA_STATE_HOME` переопределяет корень хранилища.
`profile run <slot> -- <command> [args...]` выбирает профиль только для этой
команды и её дочерних процессов. Благодаря разделителю параметры вроде `--help`
и `--json` остаются за дочерней командой.

---

## Управление агентами

### agent spawn

Запускает процесс субагента.

```
oma agent spawn <agent-id> <prompt> <session-id> [--vendor <vendor>] [-w <workspace>] [--isolation <mode>]
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|:---------|:---------|:-----------|
| `agent-id` | Да | Тип агента. Одно из значений: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore` |
| `prompt` | Да | Описание задачи. Может быть текстом или путём к файлу. |
| `session-id` | Да | Идентификатор сессии (формат: `session-YYYYMMDD-HHMMSS`) |

**Параметры:**

| Флаг | Описание |
|:-----|:-----------|
| `--vendor <vendor>` | Переопределение CLI-вендора: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi` |
| `-w, --workspace <path>` | Рабочая директория агента. Если не указана, определяется автоматически по конфигурации монорепозитория. |
| `--resumed-from <run-id>` | Связывает повторный запуск с ID предыдущего запуска. |
| `--task-id <id>` | ID задачи из плана сессии. По умолчанию — ID агента. |
| `--isolation <mode>` | Режим изоляции для отдельного запуска. Сейчас поддерживается `worktree`: создаёт новый git worktree в `${tmpdir}/oma-worktrees/{sessionId}/{agentId}` на ветке `oma/{sessionId}/{agentId}` и запускает агента там. После завершения worktree сохраняется; команды merge или discard выводятся для ручной проверки (автоматического merge нет). |
| `--read-only` | Ограничивает запущенного агента неразрушающими инструментами (отключает флаги автоподтверждения). Используется внутри `oma skill eval --live` для обеих ветвей оценки. |
| `--fallback-vendors <vendors>` | Включает упорядоченную цепочку (через запятую) не более чем из трёх настроенных CLI-вендоров. Продолжение возможно только при распознанном сбое из-за квоты, rate limit или временной ошибки и при свежей контрольной точке safe-handoff. |

**Порядок определения вендора:** флаг `--vendor` > переопределение `agents:` в `oma-config.yaml` > значения агента по умолчанию из активного `model_preset`.

**Определение промпта:** если аргумент prompt — путь к существующему файлу, промптом становится содержимое файла. Иначе аргумент используется как текст. Протоколы выполнения для конкретного вендора добавляются автоматически.

**Коды выхода:**

| Код | Значение |
|:-----|:--------|
| `0` | Процесс вендора завершился с кодом 0, и в рабочем пространстве есть артефакт результата сессии. |
| `3` | Процесс вендора завершился с кодом 0, но **не записал артефакт результата сессии** в рабочем пространстве (например, agy пишет в собственный доверенный корень вместо `-w`). В журнал событий сессии добавляется событие `blocker.raised`, а `agent status` сообщает `no-artifact`. Не считайте такой запуск завершённым. |
| другие | Сбой самого процесса вендора; его код выхода передаётся без изменений. |

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

**Переключение вендора:** у fallback-кандидатов должна быть запись вендора в
установленной конфигурации CLI. Каждая попытка использует конфигурацию модели
своего целевого вендора и проходит существующие проверки квоты сессии. Прокси `pi`
для нескольких провайдеров исключён из этой первой версии fallback между вендорами.
Дополнительные учётные данные провайдеров или платные маршруты API не создаются.

Когда переключение включено, задача получает инструкции подготовить
запись safe-handoff для конкретного запуска в `.agents/results/`. Следующая попытка читает
эту запись и проверяет рабочее пространство, прежде чем продолжить оставшуюся работу.
Исчерпание квоты без пригодной контрольной точки завершается записью
needs-review. Отмена, обычные сбои задач и завершённые запуски не порождают
новую попытку. `--read-only` не отменяет требование контрольной точки.

События сессии фиксируют причину перехода и исходного/целевого вендора; у каждой
попытки свой идентификатор запуска, а следующая попытка ссылается на предыдущую.
Это относится к подпроцессам, запущенным через `oma agent spawn`; существующий
интерактивный диалог в приложении вендора автоматически не переключается.
Без `--fallback-vendors` сохраняется обычное выполнение с одним вендором.

### agent status

Проверяет состояние одного или нескольких субагентов.

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|:---------|:---------|:-----------|
| `session-id` | Да | ID проверяемой сессии |
| `agent-ids` | Нет | Список ID агентов через пробел. Если не указан, вывода нет. |

**Параметры:**

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `-r, --root <path>` | Корневой путь для проверки памяти | Текущий каталог |

**Значения состояния:**
- `completed`: файл результата существует (с необязательным заголовком статуса).
- `running`: PID-файл существует, и процесс работает.
- `crashed`: PID-файл существует, но процесс завершился, либо не найден ни PID-файл, ни файл результата.
- `no-artifact`: процесс вендора завершился с кодом 0, но не записал артефакт результата сессии в рабочем пространстве (тихая запись не в то место — см. код выхода `3` у `agent spawn`). Считайте такой запуск неудачным.

**Формат вывода:** одна строка на агента: `{agent-id}:{status}`

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
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|:---------|:---------|:-----------|
| `tasks` | Да | Путь к YAML-файлу задач или (с `--inline`) описания задач прямо в командной строке |

**Параметры:**

| Флаг | Описание |
|:-----|:-----------|
| `--vendor <vendor>` | Переопределение CLI-вендора для всех агентов |
| `-i, --inline` | Инлайн-режим: задачи передаются аргументами `agent:task[:workspace]` |
| `--no-wait` | Фоновый режим (запускает агентов и сразу возвращает управление) |

**Формат YAML-файла задач:**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional, auto-detected if omitted
- agent: frontend
task: "Build user dashboard"
workspace: ./web
```

**Формат инлайн-задачи:** `agent:task` или `agent:task:workspace` (workspace должен начинаться с `./` или `/`).

**Каталог результатов:** `.agents/results/parallel-{timestamp}/` содержит файлы журналов каждого агента.

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

Запускает ревью кода через внешний AI CLI (codex, claude, qwen или grok).

```
oma agent review [--vendor <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Параметры:**

| Флаг | Описание |
|:-----|:-----------|
| `--vendor <vendor>` | Используемый CLI-вендор: `codex`, `claude`, `qwen` или `grok`. Если вендор из конфигурации не поддерживается, используется `codex`. |
| `-p, --prompt <prompt>` | Собственный промпт для ревью. Если не указан, используется стандартный промпт ревью кода. |
| `-w, --workspace <path>` | Путь для ревью. По умолчанию — текущий рабочий каталог. |
| `--no-uncommitted` | Пропускает ревью незакоммиченных изменений. Если флаг задан, проверяются только изменения, закоммиченные в рамках сессии. |

**Что делает команда:**
- Автоматически определяет ID текущей сессии по окружению или недавней активности git.
- Для `codex`: использует нативную подкоманду `codex review`.
- Для `claude`, `qwen`: формирует запрос на ревью на основе промпта и вызывает CLI с этим промптом.
- По умолчанию проверяет незакоммиченные изменения в рабочем каталоге.
- С `--no-uncommitted` ограничивает ревью изменениями, закоммиченными в текущей сессии.

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

Прикрепляет контракт цели к активному постоянному рабочему процессу (orchestrate, ultrawork, work, ralph). Контракт механически обеспечивается хуком Stop режима persistent-mode — завершение перестаёт зависеть от суждения модели.

```
oma goal set [--workflow <name>] [--session-id <id>] [--gate <keyword>] [--budget-minutes <n>] [--description <text>]
```

**Параметры:**

| Флаг | Описание |
|:-----|:-----------|
| `--gate <keyword>` | Детерминированный гейт остановки: `typecheck`, `test` или `lint`. Соответствует одноимённому скрипту package.json, который запускается как массив argv без shell. Пока гейт задан, хук Stop позволяет завершить рабочий процесс **только после успешного выполнения этого скрипта**; при неудаче он блокирует остановку и показывает конец вывода, чтобы агент знал, что исправить. Произвольные команды отклоняются: значение гейта хранится в файле состояния, доступном агенту для записи, поэтому выполнение произвольных строк из него обходило бы уровень разрешений. |
| `--budget-minutes <n>` | Бюджет реального времени, отсчитываемый от активации рабочего процесса. При превышении хук Stop деактивирует рабочий процесс и разрешает честную частичную остановку (машинный вердикт, записывается как `gate.failed` с `gate: "budget"` в журнал событий сессии). |
| `--description <text>` | Описание цели для человека. Только для информации. |
| `--workflow <name>` | Целевой рабочий процесс, если активно несколько постоянных рабочих процессов. |
| `--session <id>` | Суффикс ID целевой сессии в имени файла состояния. |

**Примечания о поведении:**
- Гейт пройден → рабочий процесс деактивируется, генерируется `gate.passed`, остановка разрешается.
- Провал гейта и таймаут (жёсткий предел 60 с) учитываются в лимите повторных напоминаний (5), поэтому постоянно красный гейт не может блокировать остановку бесконечно; последней страховкой остаётся истечение срока устаревания через 2 часа.
- Без контракта цели постоянный режим работает как прежде (только напоминающие промпты) — контракт полностью опционален.

**Примеры:**
```bash
# After starting /ultrawork: require typecheck to pass before the session may end
oma goal set --gate typecheck

# Bound an autonomous run: stop honestly after 2 hours even if incomplete
oma goal set --workflow ultrawork --gate test --budget-minutes 120
```

---

## Агенты по расписанию

### schedule create

Регистрирует запланированную задачу агента. Требуется ровно один из флагов `--cron` или `--every`.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>]
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|:---------|:---------|:-----------|
| `agent-id` | Да | Тип агента: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Да | Описание задачи, передаваемое агенту в момент срабатывания |

**Параметры:**

| Флаг | Описание |
|:-----|:-----------|
| `--cron "<expr>"` | Cron-выражение из 5 полей (например, `"0 9 * * *"`). Несовместим с `--every`. |
| `--every "<phrase>"` | Интервал на естественном языке: `5m`, `2h`, `1d`, `every 20m`, `every 5 minutes`. Округляется до ближайшего шага, выразимого в cron, и выводит примечание. Несовместим с `--cron`. |
| `--vendor <vendor>` | Переопределение CLI-вендора, передаваемое в `oma agent spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. По умолчанию определяется автоматически. |
| `-w, --workspace <path>` | Рабочая директория агента. По умолчанию — текущий каталог на момент регистрации. |
| `--once` | Одноразовый режим: срабатывает один раз, затем удаляется. |
| `--expires-after <duration>` | Автоматически завершает повторяющуюся задачу через N дней (`0` — бессрочно). |
| `--env <KEY1,KEY2>` | Сохраняет указанные переменные окружения в `~/.agents/schedule/env/<id>` (0600) для подстановки при запуске. Сохраняются только перечисленные ключи, а не всё окружение целиком. |

**Что делает команда:**
1. Разбирает и проверяет cron-выражение (или преобразует фразу `--every` в cron).
2. Записывает задачу в `~/.agents/schedule/schedules.json` (глобальный манифест, права 0600).
3. Регистрирует задачу в планировщике ОС (launchd / systemd --user / schtasks). Задача ОС вызывает `oma schedule run <id>` с настроенным интервалом.

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

Полное пошаговое описание — в руководстве [Агенты по расписанию](../guide/scheduled-agents.md).

### schedule list

Перечисляет запланированные задачи всех проектов с группировкой по проектам и состоянием drift относительно ОС.

```
oma schedule list [--json]
```

**Параметры:**

| Флаг | Описание |
|:-----|:-----------|
| `--json` | Вывод в формате JSON |

**Состояния drift:** `synced` (манифест и ОС согласованы), `stale` (регистрация в ОС вызывает команду, которую текущий CLI больше не принимает; выполните `schedule sync`, чтобы перезаписать её, `oma update` делает это автоматически), `missing-in-os` (выполните `schedule sync` для исправления), `orphan-in-os` (в ОС есть задача, которой нет в манифесте; выполните `schedule sync --prune`, чтобы удалить её).

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
|:---------|:---------|:-----------|
| `id` | Да | ID задачи из `schedule list` (формат: `sch_<base32-12>`) |

**Пример:**
```bash
oma schedule delete sch_abc123def456
```

### schedule run

Выполняет запланированную задачу по идентификатору. Это точка входа, которую планировщик ОС вызывает в момент срабатывания. Обычно вручную не запускается, но подходит для отладки задачи.

```
oma schedule run <id>
```

**Что делает команда:**
1. Ищет `<id>` в манифесте (если не найден, завершается с ненулевым кодом).
2. Загружает сохранённые переменные окружения из `~/.agents/schedule/env/<id>` и подставляет их.
3. Вызывает `oma agent spawn <agentId> <prompt> <sessionId> --vendor <vendor> -w <workspace>`.
4. Записывает результат в `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Обновляет `lastFiredAt` в манифесте; если задача создана с `--once`, удаляет её.
6. При истечении аутентификации явно завершается ошибкой: выходит с ненулевым кодом и выводит `re-auth required: <vendor>` в stderr. Никогда не завершается молча успехом.

**Пример:**
```bash
# Invoke manually to debug a job
oma schedule run sch_abc123def456
```

### schedule sync

Повторно синхронизирует манифест с планировщиком ОС. Устраняет расхождения после миграции системы или сброса планировщика ОС.

```
oma schedule sync [--prune]
```

**Параметры:**

| Флаг | Описание |
|:-----|:-----------|
| `--prune` | Также удаляет задачи ОС, которых нет в манифесте (orphan-in-os). Без `--prune` такие задачи только перечисляются, но не удаляются. |

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
|:-----|:-----------|
| `--json` | Вывод в формате JSON |
| `--output <format>` | Формат вывода (`text` или `json`) |
| `--force` | Перезаписывает пустые или существующие файлы схемы |

**Что делает команда:** создаёт структуру каталога `.agents/state/memories/` с начальными файлами схемы, которые агенты и рабочие процессы используют для чтения и записи состояния координации.

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
|:-----|:-----------|
| `--json` | Вывод в формате JSON |
| `--output <format>` | Формат вывода (`text` или `json`) |

**Проверяет:** GitHub CLI (`gh`), Antigravity CLI (`agy`), Gemini CLI, Claude CLI, Codex CLI, Cursor CLI, Qwen CLI.

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
|:---------|:---------|:-----------|
| `url` | Нет | Подключиться к endpoint, управляемому вызывающей стороной, вместо поиска общего демона |
| `--context` | Нет | Контекст Serena для демона (по умолчанию `ide`); демоны различаются по этому ключу |

**Что делает команда:** именно её по умолчанию запускает запись serena MCP у каждого вендора —
вручную её вызывать не нужно. Транспорт stdio в Serena даёт каждой сессии агента
собственный процесс Python и полный стек языковых серверов, поэтому затраты растут
с числом открытых сессий. Команда bridge сводит это к одному серверу на
проект: определяет корень проекта по рабочему каталогу, запускает
HTTP-сервер Serena, закреплённый через `--project`, если он ещё не запущен, и проксирует
сессию на него.

Закрепление через `--project` важно: сервер, запущенный без него, открывает
инструмент `activate_project`, позволяя любой сессии подменить проект
для всех остальных.

**Архитектура:**
```
session A --stdio--> oma bridge --.
                                   >-- HTTP --> one Serena server (+ LSPs)
session B --stdio--> oma bridge --'
```

**Жизненный цикл:** первая сессия запускает сервер, последующие используют его повторно, и
каждый прокси регистрирует себя как клиента. Когда отключается последняя сессия,
сервер остаётся запущенным ещё 10 минут (перезапуск снова подключается к нему), а иначе
его останавливает следующий запущенный bridge. Если общий сервер недоступен,
прокси переключается на локальный для сессии stdio-процесс serena.

Отключить это поведение можно через `serena.mode: stdio` в `.agents/oma-config.yaml`.

**Пример:**
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

**Аргументы `verify agent`:**

| Аргумент | Обязателен | Описание |
|:---------|:---------|:-----------|
| `agent-type` | Да | Одно из значений: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**Параметры:**

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `-w, --workspace <path>` | Путь к проверяемому рабочему пространству | Текущий каталог |
| `--json` | Вывод в формате JSON | |
| `--output <format>` | Формат вывода (`text` или `json`) | |

**Что делает команда:** запускает скрипт проверки для указанного типа агента: проверяет успешность сборки, результаты тестов и соблюдение scope.

`verify triggers` измеряет точность keyword-detector на размеченном корпусе промптов. Процентные пороги работают как гейты. Зарегистрированный путь — `verify agent`; старое написание на верхнем уровне ещё может встречаться в справке совместимости.

**Общие проверки для всех типов агентов:**
- **Scope Check**: читает scope задач из `.agents/results/plan-{sessionId}.json`. Сравнивает файлы, изменённые по `git diff`, с заданными шаблонами scope. Завершается ошибкой, если изменены файлы вне scope, назначенного агенту.
- **Charter Preflight**: проверяет, что `result-{agent}.md` содержит корректно заполненный блок `CHARTER_CHECK:` без незаполненных заполнителей.
- **Hardcoded Secrets**: ищет в файлах `.py`, `.ts`, `.tsx`, `.js`, `.dart` шаблоны вроде `password = "..."`, `api_key = "..."` (тестовые и примерные файлы исключаются).
- **TODO/FIXME Comments**: подсчитывает комментарии `TODO`, `FIXME`, `HACK`, `XXX` (если они есть, выдаёт предупреждение).

**Проверки для конкретных агентов:**

| Тип агента | Дополнительные проверки |
|:-----------|:-----------------|
| `backend` | Проверка синтаксиса Python (`py_compile`), обнаружение SQL-инъекций (f-string + ключевые слова SQL), запуск тестов Python (`pytest`) |
| `frontend` | Компиляция TypeScript (`tsc --noEmit`), обнаружение inline-стилей (`style={{`), использование типа `any` (ошибка, если > 3), тесты фронтенда (`vitest`) |
| `mobile` | Анализ Flutter/Dart (`flutter analyze` или `dart analyze`), тесты Flutter (`flutter test`) |
| `qa` | Проверка выполнения self-check |
| `debug` | Запускает тесты Python или тесты фронтенда в зависимости от определённого типа проекта |
| `pm` | Проверяет, что `.agents/results/plan-{sessionId}.json` существует и содержит корректный JSON |

**Формат вывода:**
Каждая проверка сообщает `PASS`, `FAIL`, `WARN` или `SKIP` с подробным сообщением. Общий результат — `ok: true`, только если ни одна проверка не провалилась.

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

Передаёт событие хука вендора через централизованный маршрутизатор хуков oma (design 019). Это канонический ABI, который вызывает сгенерированная обёртка `oma-hook.sh` каждого вендора. Команду также можно вызывать напрямую, чтобы изолированно отлаживать или тестировать цепочки обработчиков.

```
oma hook run --vendor <v> --event <nativeEvent> [--matcher <tool>]
```

**Параметры:**

| Флаг | Обязателен | Описание |
|:-----|:---------|:-----------|
| `--vendor <v>` | Да | Идентификатор вендора. Одно из значений: `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`, `kiro` или `qwen`. (Вендор `pi` здесь **недопустим** — вместо `oma hook run` он использует внутрипроцессный мост `installPiExtension`.) |
| `--event <e>` | Да | Нативное имя события хука, как оно зарегистрировано в настройках вендора (например, `UserPromptSubmit`, `PreToolUse`, `Stop`) |
| `--matcher <m>` | Нет | Необязательное имя инструмента / matcher, передаваемое из регистрации хука (например, `Bash`) |

**Контракт stdin / stdout:**
- **stdin**: нативный JSON payload вендора (тот же объект, который вендор передаёт процессам хуков).
- **stdout**: JSON в диалекте вендора (или обычный текст для промптов kiro), когда срабатывает обработчик; пусто, если ни один обработчик ничего не вывел.
- **код выхода**: всегда `0` (fail-open — ошибки пишутся в stderr, и агент никогда не блокируется).

**Поток данных во время выполнения:**
```
vendor fires: oma-hook.sh --vendor claude --event UserPromptSubmit
  stdin: {"prompt":"...","cwd":"/project","sessionId":"..."}
  → oma hook resolves handler chain from .agents/hooks/variants/claude.json
  → runs: keyword-detector → state-boundary → skill-injector (in-process)
  → merges HandlerResult values (context: concat; pre_tool: last mutate wins; stop: any block)
  → emits vendor dialect to stdout
  → exit 0
```

**Изолированная отладка цепочек обработчиков:**

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

Пустой stdout означает, что для этого события цепочка ничего не сделала. JSON-объект в stdout — это диалект вендора, который получила бы сессия агента.

**Примечания об области:**
- Записи `statusLine`/hud не маршрутизируются через `oma hook run` (отображение на горячем пути по-прежнему идёт напрямую через `bun`).
- Вендор pi использует свой внутрипроцессный мост `installPiExtension`, а не `oma hook run`.
- Дублирующиеся доставки из-за двойной установки (проект + глобально) отбрасываются внутри `oma hook run` (идентичный payload, запущенный другим wrapper `oma-hook.sh`); различные события, включая параллельные вызовы инструментов, выполняются всегда.

Реализация маршрутизатора (внутреннее название «design 019») находится в `cli/commands/hook/command.ts`, а матрица совместимости по вендорам — в `cli/commands/hook/probe/`.

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

Проверяет совместимость хуков вендоров и выводит матрицу покрытия.

```
oma hook probe [--vendor <list>] [--output <fmt>] [--hooks-dir <dir>]
```

**Параметры:**

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--vendor <list>` | Проверяемые вендоры через запятую | Все поддерживаемые вендоры |
| `--output <fmt>` | Формат вывода: `text`, `md` или `json` | `text` |
| `--hooks-dir <dir>` | Переопределяет каталог `.agents/hooks/core` | Определяется автоматически |

**Что проверяется:** для каждого вендора проверяет, есть ли основные скрипты хуков (`keyword-detector`, `persistent-mode` и т. д.) и правильно ли JSON варианта сопоставляет события с цепочками обработчиков. Код выхода `1`, если хотя бы один вендор сообщает статус `failed`.

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

Управляет API-ключами и другими секретами в системном хранилище ключей (macOS Keychain, Linux Secret Service или Windows Credential Manager) на базе `@napi-rs/keyring`. Значения никогда не попадают в историю shell или файлы окружения; в `~/.config/oma/vault-index.json` отслеживаются только имена ключей, поэтому `oma vault list` может перечислить их, не раскрывая секретных значений.

```
oma vault store <name> [--value <value>]
oma vault get <name>
oma vault list [--json]
oma vault delete <name>
```

**Подкоманды:**

| Подкоманда | Описание |
|:------------|:-----------|
| `store <name>` | Запрашивает секретное значение (скрытый ввод) и записывает его под именем `name` в хранилище ключей ОС. `--value <value>` принимает значение прямо в команде для неинтерактивного использования (оно будет видно в истории shell; лучше использовать запрос). |
| `get <name>` | Выводит сохранённое значение в stdout без оформления, чтобы его можно было использовать в shell: `export ANTHROPIC_API_KEY=$(oma vault get anthropic)`. Если ключа нет, завершается с кодом `2`. |
| `list` | Перечисляет имена сохранённых ключей с отметками времени `createdAt`. Значения никогда не отображаются. |
| `rm <name>` | Удаляет секрет из хранилища ключей и индекса. |

**Правила имён ключей:** от 1 до 64 символов из `[A-Za-z0-9._-]`. Примеры: `anthropic`, `openai-prod`, `github_pat`, `sentry.dsn`.

**Нативная зависимость:** нативный модуль `@napi-rs/keyring` загружается лениво; если загрузить его не удаётся (например, в headless Linux без `libsecret` или `gnome-keyring`), команда выводит явную ошибку с подсказкой по установке, а не переключается молча на запасной вариант.

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
|:-----|:-----------|
| `--dry-run` | Показывает, что будет очищено, без внесения изменений |
| `-y, --yes` | Пропускает запросы подтверждения и очищает всё |
| `--json` | Вывод в формате JSON |
| `--output <format>` | Формат вывода (`text` или `json`) |

**Что очищается:**
- Осиротевшие PID-файлы во временном каталоге системы (`/tmp/subagent-*.pid`).
- Осиротевшие файлы журналов (`/tmp/subagent-*.log`).
- **Осиротевшие языковые серверы Serena** — когда MCP-клиент (например, Claude) завершается, его `serena start-mcp-server` переходит под init, а дочерние процессы LSP (`tsserver`, `pyright`, …, сотни МБ) продолжают работать без клиента. Здесь они завершаются. Случай *простаивающих, но ещё подключённых* серверов отдельно обрабатывает [`serena reap`](#serena).
- Каталоги Gemini Antigravity (brain, implicit, knowledge) в `.gemini/antigravity/`.

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

Освобождает память, занятую языковыми серверами Serena для каждого проекта. Serena запускает стек LSP
(`tsserver`, `pyright`, …, ~300 МБ) для каждого открытого проекта и держит его запущенным
всю сессию — при нескольких открытых проектах расход складывается. Reaper завершает
простаивающие дочерние процессы LSP; Serena сама восстанавливается и запускает их снова при следующем вызове инструмента
(перезапуск не требуется).

```
oma serena reap [--dry-run] [--quiet]
oma serena reaper enable [--dry-run]
oma serena reaper disable [--dry-run]
```

**Подкоманды:**

| Команда | Описание |
|:--------|:-----------|
| `serena reap` | Однократно завершает простаивающие LSP прямо сейчас. Интерактивные запуски выполняются всегда; `--quiet` (путь для запуска по расписанию) учитывает явное включение через `enabled`. |
| `serena reap --dry-run` | Показывает цели для завершения и ожидаемый объём освобождаемой памяти — ничего не завершает. |
| `serena reaper enable` | Устанавливает фоновую задачу, которая запускает `serena reap --quiet` каждые 5 минут (launchd / systemd timer / Windows Task Scheduler). |
| `serena reaper disable` | Удаляет фоновую задачу. |

**Политика:** `lru` (по умолчанию) держит запущенными LSP `keepWarm` последних активных проектов
и завершает остальные; `idle` завершает LSP любого проекта, простаивающего дольше `idleMinutes`. Окно
`graceSeconds` защищает выполняющиеся вызовы инструментов.

**Конфигурация** (`.agents/oma-config.yaml`, включается явно — по умолчанию отключено):

```yaml
serena_reaper:
  enabled: false     # gates the scheduled (--quiet) path; interactive reap always runs
  policy: lru        # lru | idle
  keepWarm: 2        # LRU: keep this many most-recently-active projects warm
  idleMinutes: 10    # idle threshold / LRU secondary floor
  graceSeconds: 90   # in-flight protection; SIGTERM→SIGKILL window
```

Диагностику (состояние KEEP/REAP для каждого проекта и источник сигнала активности)
показывает [`oma doctor`](#doctor). Осиротевшие LSP Serena (клиент которых завершился) завершает
[`oma cleanup`](#cleanup) независимо от этой настройки.

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

`viz` — встроенный алиас для `visualize`.

**Параметры:**

| Флаг | Описание |
|:-----|:-----------|
| `--json` | Вывод в формате JSON |
| `--output <format>` | Формат вывода (`text` или `json`) |

**Что делает команда:** анализирует структуру проекта и строит граф зависимостей, показывающий связи между навыками, агентами, рабочими процессами и общими ресурсами.

**Примеры:**
```bash
oma visualize
oma viz --json
```

### search

Механические примитивы поиска: fetch, метаданные, RSS, медиа, код и оценка доверия. Алиас — `oma s`. Все подкоманды выводят JSON в stdout (по одному объекту на строку или в отформатированном виде с `--pretty`).

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**Подкоманды:**

| Подкоманда | Назначение |
|:-----------|:--------|
| `fetch <url>` | Загружает URL через конвейер стратегий с автоматической эскалацией (api → probe → impersonate → browser → archive) |
| `api <url>` | Загружает через подходящий обработчик API платформы (Phase 0) |
| `api:search <query>` | Параллельный поиск по ключевым словам на платформах, которые его поддерживают (`--platforms <list>`) |
| `meta <url>` | Извлекает метаданные OGP / JSON-LD / Schema.org |
| `rss <url>` | Находит и разбирает ленту RSS / Atom |
| `rss:google <query>` | Строит URL ленты RSS Google News для запроса |
| `media <url>` | Извлекает метаданные медиа через `yt-dlp` (1858 сайтов) |
| `archive <url>` | Загружает через запасные варианты AMP / archive.today / Wayback |
| `trust <domain>` | Определяет уровень / оценку доверия для домена |
| `code <query>` | Ищет код через `gh` (GitHub) или `glab` (GitLab) |
| `doctor` | Проверяет зависимости (Chrome, `python3` + `curl_cffi`, `yt-dlp`, `gh`) |

**Общие параметры подкоманд с URL или запросом:**

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--timeout <seconds>` | Таймаут для каждой стратегии | `15` (`30` для `media`) |
| `--locale <value>` | Заголовок `Accept-Language` | `en-US,en;q=0.9` |
| `--pretty` | Форматированный вывод JSON | `false` |

**Дополнительно для `fetch`:**

| Флаг | Описание |
|:-----|:-----------|
| `--only <strategies>` | Запускаемые стратегии через запятую (`api,probe,impersonate,browser,archive`) |
| `--skip <strategies>` | Пропускаемые стратегии через запятую |
| `--include-archive` | Добавляет стратегию archive как последний запасной вариант |

**Дополнительно для `media`:**

| Флаг | Описание |
|:-----|:-----------|
| `--subs` | Записывает субтитры |
| `--sub-lang <list>` | Языки субтитров через запятую (по умолчанию: `en`) |
| `--format <spec>` | Спецификация формата yt-dlp |

**Дополнительно для `code`:**

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` | Хост | `github` |
| `--language <lang>` | Фильтр по языку | |
| `--repo <owner/repo>` | Ограничить поиск репозиторием | |
| `--limit <n>` | Максимум результатов | `20` |

**Коды выхода:** `0` — успех, `1` — ошибка, `2` — заблокировано, `3` — не найдено, `4` — неверный ввод, `5` — требуется аутентификация, `6` — таймаут.

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

Реестр также предоставляет эти явные вспомогательные команды для обнаружения:

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

`search` выводит JSON даже без `--json`. `--pretty` меняет только представление и не меняет схему результата. `search web` принимает `--provider`, `--limit`, `--timeout`, `--json` и `--pretty`. Если стратегия заблокирована или отсутствует зависимость, сверьтесь с кодами выхода выше и повторно запустите `oma search doctor`, прежде чем менять стратегии.

### image

Генерация изображений через AI нескольких вендоров с параллельной диспетчеризацией и учётом аутентификации. Алиас — `oma img`.

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**Подкоманды:**

| Подкоманда | Назначение |
|:-----------|:--------|
| `generate <prompt...>` | Генерирует изображения через `pollinations` (flux/zimage, бесплатно), `codex` (gpt-image-2 через ChatGPT OAuth) или `antigravity` (nano-banana по подписке Gemini Code Assist, без ключа) |
| `doctor` | Проверяет аутентификацию и состояние установки для каждого вендора |
| `vendor list` | Перечисляет зарегистрированных вендоров и поддерживаемые модели |

**Параметры `image generate`:**

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all` | `auto` |
| `--size <size>` | Любой `WxH` со сторонами, кратными 16, в диапазоне 16–3840 и с соотношением сторон от 1:3 до 3:1; также допускается `auto`. | значение вендора по умолчанию |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | значение вендора по умолчанию |
| `-n, --count <n>` | Количество изображений (1..5) | `1` |
| `--output-dir <path>` | Каталог вывода | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | Разрешает пути вывода вне `$PWD` | `false` |
| `--model <name>` | Переопределение модели для конкретного вендора; игнорируется `antigravity`, модель которого скрыта. | значение вендора по умолчанию |
| `--timeout <duration>` | Таймаут на одно изображение | значение вендора по умолчанию |
| `-r, --reference <path>` | Референсные изображения; флаг можно повторять или перечислять значения через запятую. Поддерживается в `codex` и `antigravity`; отклоняется в `pollinations`. Каждое — PNG/JPEG/GIF/WebP не более 5 МБ (проверка по magic bytes), максимум 10. | |
| `-y, --yes` | Пропускает подтверждение стоимости | `false` |
| `--no-prompt-in-manifest` | Сохраняет SHA256 промпта вместо исходного текста | `false` |
| `--dry-run` | Выводит план и оценку стоимости без выполнения | `false` |
| `--output <format>` | Формат вывода CLI: `text` \| `json` | `text` |

Каждый запуск записывает рядом со сгенерированными изображениями `manifest.json` с вендором, моделью, промптом (или его хешем), размером, качеством и стоимостью.

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

Планирует, создаёт и рендерит короткие, поясняющие и демонстрационные видео. `generate` создаёт brief, сценарий, спецификацию рендеринга и манифест запуска; чтобы отрендерить настоящий MP4, нужны composition и работающий compositor.

```
oma video generate "three ways to reduce build times" --mode shorts --dry-run --output json
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --output json
oma video doctor --output json
oma video provider list --output json
oma video compose <runDir> --output json
oma video render <runDir> --output json
```

`generate` принимает `--mode shorts|explainer|demo`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor hyperframes|mpt`, `--capture`, `--source file|web`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` и `--capture-stop duration:<seconds>|selector:<css>`. Для захвата из браузера используйте `--source web --url <url>`; по умолчанию действует `--source file`. `--output-dir` задаёт корневой каталог запуска, `--allow-external-output` разрешает путь вне `$PWD`, `--max-usd` задаёт потолок стоимости, `-y, --yes` пропускает подтверждение стоимости, `--seed` стабилизирует входные данные планирования, `--timeout` ограничивает каждый вызов провайдеров визуальных материалов и музыки, `--script` подставляет `script.json`, написанный агентом, а `--no-brief-in-manifest` сохраняет хеш brief вместо его текста. `--dry-run` останавливается после планирования. `--output text|json` управляет форматом конверта вывода CLI.

`doctor` проверяет закэшированную toolchain HyperFrames/MPT и принимает `--install`, `--upgrade`, `--install-mpt` и `--install-strudel`. `provider list` сообщает о доступности провайдеров и состоянии ключей. `compose` создаёт или обновляет composition запуска и выводит контракт авторинга; `render` выполняет lint, рендеринг и проверку результата. Отсутствие compositor, composition или зависимостей toolchain считается ошибкой. Путь `OMA_VIDEO_MOCK=1`, предназначенный только для тестов, — единственный режим с placeholder; обычный запуск никогда не подменяет MP4 текстом или крошечным файлом.

Успешный JSON-вывод содержит `runDir`, `manifestPath`, `scriptPath` и `renderSpecPath`; манифест фиксирует выбранных провайдеров, входные данные и сгенерированные ассеты. После `compose` напишите сгенерированную composition по её `AUTHORING.md`, затем снова запустите `render`. Если ключ провайдера недоступен, запустите `oma video doctor`; если захват не удался, проверьте URL, селектор, устройство и таймаут; если рендеринг не удался, исправьте ошибки composition по диагностике, прежде чем повторять попытку.

### star

Добавляет oh-my-agent в избранное GitHub.

```
oma star
```

Опций нет. Требуется установленный и аутентифицированный CLI `gh`. Ставит звезду репозиторию `first-fluke/oh-my-agent`.

**Пример:**
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
|:---------|:---------|:-----------|
| `command-path` | Нет | Описываемая команда. Если не указана, описывается корневая программа. |

**Что делает команда:** выводит JSON-объект с именем, описанием, аргументами, параметрами и подкомандами команды. AI-агенты используют его, чтобы узнать доступные возможности CLI.

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

Эти семейства полезны, когда результатом должен стать исследовательский артефакт, презентация или отчёт. Здесь они описаны намеренно кратко; рабочий процесс и варианты восстановления объясняются в связанных руководствах.

### intel suggest

Предлагает продуктовую работу на основе сигналов рынка и репозиториев:

```
oma intel suggest --topic "developer onboarding" --target ./my-product --dry-run
oma intel suggest --config .agents/intel.yaml --json
```

`--config` передаёт полную конфигурацию. Для разовых запусков входные данные выбираются через `--topic`, `--target`, `--repos`, `--since` и `--last-commits`. `--output-dir` управляет локальными отчётами, а `--fixture` передаёт локальную JSON-fixture для детерминированного просмотра. `--create-issue` создаёт issues в GitHub для принятых кандидатов и требует настроенной цели и подтверждения; используйте его вместе с `--base-repo <owner/name>`, чтобы выбрать репозиторий, а `--yes` — только в уже одобренном контексте автоматизации. `--dry-run` и `--json` — безопасные способы проверки.

### market

Семейство market делегирует работу разрешённому upstream-движку `last30days`. Начните с гейта и резолвера:

```
TOPIC="browser automation pain points"
oma market detect-trap "$TOPIC"
oma market resolve --output json
oma market run "$TOPIC" --days 30 --emit=compact
```

`market detect-trap` завершается с кодом 2 и предлагает переформулировку для тем-ловушек по ключевым словам и слишком широких тем; `--force` обходит этот гейт, только когда пользователь явно хочет продолжить. `market resolve` принимает `--refresh` и `--offline`, а `market update` обновляет кэш управляемого движка. `market run` передаёт оставшиеся аргументы разрешённому движку на Python и добавляет `--save-dir` из `market.save_dir`, если указана тема. Прежде чем выбирать флаги upstream, прочитайте [Исследование рынка](../guide/market-research.md); вывод `--help` принадлежит управляемому движку и меняется от релиза к релизу.

### docs

Семейство docs служит для проверки расхождений документации. Команды ориентированы на отчёты; `sync` перечисляет кандидатов для основного агента и сам файлы не редактирует.

```
oma docs verify --json
oma docs verify --no-urls --report-file .agents/results/docs-drift.md
oma docs sync HEAD~3..HEAD --json
oma docs i18n --json --min-severity HIGH
oma docs lint --json --locales ko,ja
```

`verify` проверяет локальные ссылки и заново генерирует `docs/generated/doc-refs.json`; `--urls-sync` дожидается необязательной проверки URL через `lychee`. `sync` по умолчанию берёт staged-изменения, затем `HEAD~1..HEAD`, и выводит кандидатов `{doc, changedFiles, matchedRefs}`. `i18n` сообщает о структурных расхождениях между английским оригиналом и переводами, а `lint` — о стилистических проблемах переведённых документов. Ни одна из этих подкоманд не редактирует документацию автоматически.

### slide

`oma slide` работает с рабочим каталогом HTML-фрагментов слайдов 1920×1080. Минимальный рабочий сценарий:

```
oma slide create --output-dir .agents/results/slides/demo
# author slide-01.html and meta.json in that directory
oma slide validate --workspace .agents/results/slides/demo --output json
oma slide preview --workspace .agents/results/slides/demo
oma slide bundle --workspace .agents/results/slides/demo
```

Гейт качества сообщает о переполнении, наложениях и проблемах с размером шрифта. Используйте `--slide <file>` для проверки одного слайда и `--report-file <path>` с JSON-выводом. Экспортируйте только после проверки:

```
oma slide export pdf --workspace <dir> --output-file <file> --mode capture
oma slide export png --workspace <dir> --output-dir <dir> --resolution 1080p
oma slide export pptx --workspace <dir> --output-file <file>
```

Экспорт в PPTX экспериментальный и основан на растре. `slide import pptx <file>`, `slide asset fetch-video <url>` и `slide style list|preview|get <slug>` отвечают за входные ассеты и поиск стилей. Решения по авторингу и ограничения фиксированной сцены описаны в [oma-slide](../guide/content-and-research.md#slides-and-presentations).

### scholar

Поиск статей и метаданных работ с последующей проверкой sidecar перед публикацией:

```
oma scholar search "vision language action" --limit 10
oma scholar resolve "Attention Is All You Need"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar lint paper.knows.yaml
```

`search` может ограничить результаты OpenAlex через `--year-min` и принудительно задействовать резервных провайдеров через `--always-fallback`. `get --section` принимает `statements`, `evidence`, `relations`, `artifacts` или `citation`. `lint --lenient` понижает висячие ссылки между записями до предупреждений; `--fail-on-warning` превращает предупреждения в ошибки для CI. CLI сначала ищет в Knows, затем в резервных OpenAlex и Semantic Scholar; sidecar в upstream он не отправляет.

### explain

`/explain` — рабочий процесс для создания объяснений. CLI проверяет уже созданные артефакты:

```
oma explain validate .agents/results/explain/2026-09-09-change.html
oma explain validate --input-dir .agents/results/explain --output json --report-file .agents/results/explain/report.json
```

Передайте файл или `--input-dir`, но не то и другое одновременно. Проверка охватывает контракт автономного HTML и сообщает об ошибках в машиночитаемом виде; точность самого объяснения она не оценивает. См. [Объяснение кода](../guide/code-explainer.md).

### diagram

Определите движок, прежде чем рабочий процесс сгенерирует структурную диаграмму:

```
oma diagram resolve --output json
oma diagram resolve --engine mermaid --offline
oma diagram update
oma diagram archify validate architecture <stem>.archify.json --quality showcase --json
oma diagram archify deliver architecture <stem>.archify.json <stem>.archify.html --quality showcase --json
```

`diagram resolve` принимает `--engine auto|archify|mermaid`, `--refresh` и `--offline`. `diagram update` обновляет управляемую копию archify. `diagram archify` передаёт оставшиеся аргументы разрешённому исполняемому файлу upstream и возвращает его код выхода. Mermaid остаётся источником истины в Markdown; HTML — производный артефакт. См. [Diagram Engine](../guide/diagram-engine.md).

## Просмотр состояния, моделей и памяти

Следующие семейства дают доступ к долговечному состоянию рабочих процессов и диагностике моделей и провайдеров. Для действий, связанных с очисткой, предпочитайте `--dry-run`, а если результат будет обрабатывать другая программа — `--json`.

### state

```
oma state list --json
oma state list --all-projects --project /path/to/project --search migration
oma state get <session-id> --json
oma state trajectory <session-id>
oma state trajectory <session-id> --open
oma state verify --workflow work --checkpoint complete --json
oma state archive --older-than 90d --dry-run --json
oma state purge --older-than 90d --dry-run --json
```

`state emit` записывает одно событие L1 с явной категорией и метаданными сессии. `state migrate` переносит устаревшие сессии в выбранный профиль. `state repair` исправляет повреждённые файлы состояния. `state decisions list` и `state inject-log list|get` показывают обязательные решения и записи аудита инъекций. `state trajectory` объединяет события L1 сессии с транскриптами сессий вендоров, в которых она выполнялась (Claude Code, Codex, Antigravity и Grok). Получается единый журнал по ходам: промпты, ответы модели, вызовы инструментов, длительность и расход токенов; `--open` открывает его в веб-дашборде по адресу `/trajectory`. Для остальных вендоров отображаются только события L1. Транскрипты читаются из `CLAUDE_CONFIG_DIR` или `~/.claude`, `CODEX_HOME` или `~/.codex`, `~/.gemini/antigravity-cli` и `~/.grok`. `state activate`, `state archive` и `state purge` — явные действия; старые булевы флаги действий отклоняются. Архивируйте или удаляйте данные только после просмотра результата dry-run, потому что эти команды изменяют локальное состояние.

### model

```
oma model check --json
oma model check --owner openai --fail-on-drift
oma model probe openai/gpt-5 --timeout 30s --json
oma model propose --owner anthropic --json
```

`model check` сравнивает реестр с актуальными списками вендоров и может проверить новых кандидатов. `model probe` проверяет один slug через CLI его вендора. `model propose` выводит патч `models:` для `oma-config`; используйте `--write`, только если действительно хотите изменить конфигурацию. Доступность вендора и квоты могут приводить к сбою проверок, даже если запись в реестре корректна.

### Команды агента с доказательствами

Нативные запуски агентов используют последовательность шагов, подкреплённую evidence:

```
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent context docs --difficulty Medium
oma agent begin docs docs "$SESSION_ID" --workspace .
# Use the runId and claimPath printed by begin.
oma agent verify "<run-id>" --required
oma agent finish "<run-id>" "<claim-path>"
```

`agent context` загружает контекст, выбранный по графу; `begin` начинает запуск и выводит сгенерированный ID запуска и путь к claim; `verify` получает этот ID запуска и выполняет закреплённые проверки (`--required`) или сужает их с помощью `--affected`; `finish` получает ID запуска и путь к файлу claim. `agent resume --dry-run` сообщает о готовых и повторно используемых задачах, а `agent resume --max-attempts <n>` повторяет только задачи, разрешённые планом. Структура плана и claim описана в [Результаты агентов и возобновление](../guide/agent-results-and-resume.md). Эти команды предназначены для контракта выполнения OMA; для обычной пользовательской работы вместо них можно использовать `agent spawn`, `agent parallel` или `agent review`.

### memory

```
oma memory status --json
oma memory keys --kind connection --dry-run --json
oma memory init --json
oma memory setup --endpoint http://127.0.0.1:8000 --dry-run --json
oma memory import --source claude --since 7d --dry-run --json
oma memory gc --scope project --keep 20 --dry-run --json
```

`memory keys` настраивает учётные данные для подключения к Honcho или для embeddings; `--dry-run` показывает места назначения, не читая и не записывая ключи. `memory setup` подготавливает endpoint AgentMemory и при необходимости может выполнить `--install` или `--start`. `memory daemon` и `memory service` управляют локальным процессом или интеграцией со службой ОС. `memory maintain backup|prune|vacuum`, `memory retry drain`, `memory upgrade` и `memory gc` — действия по обслуживанию; изучите их JSON-вывод или результат dry-run, прежде чем применять их.

## Управление навыками

### skills audit

Проверяет установленные навыки на пересекающиеся описания, чрезмерную общность («чёрные дыры») и деградацию маршрутизации из-за размера библиотеки.

```
oma skill audit [--json] [--output <format>]
```

**Параметры:**

| Флаг | Описание |
|:-----|:-----------|
| `--json` | Вывод в формате JSON для CI/CD |
| `--output <format>` | Формат вывода (`text` или `json`) |

**Что проверяется:**
- **Попарное сходство описаний**: косинусное сходство TF-IDF для каждой пары установленных навыков. Предупреждение при ≥ 60%, ошибка при ≥ 75%.
- **Обнаружение «чёрных дыр»**: отмечает навык, среднее сходство которого со всеми остальными — положительный выброс (≥ mean + 1.5 × stddev), что указывает на слишком общее описание, способное перехватывать маршрутизацию.
- **Деградация из-за размера библиотеки**: предупреждает, если установлено более 60 навыков (точность маршрутизации логарифмически снижается по мере роста библиотеки).
- **Проверка фокуса**: предупреждает, когда навык разрастается в набор — более 20 справочных документов (файлы `.md`, кроме `SKILL.md`, без учёта vendored-деревьев) или тело `SKILL.md` длиннее 25 000 символов. Сфокусированные навыки работают лучше наборов (SkillsBench, arXiv:2602.12670); решение — разделять, а не удалять.

**Коды выхода:** `0` — все находки в диапазоне предупреждений или находок нет; `1` — хотя бы одна пара в диапазоне ошибок.

**Примеры:**
```bash
oma skill audit
oma skill audit --json | jq '.findings'
```

### skills lint

Обнаруживает проблемы авторинга отдельных навыков: дефекты качества внутри одного `SKILL.md`, в отличие от `skills audit`, который проверяет связи *между* навыками. Основано на таксономии skill smells из arXiv:2607.01456 (более 99% реальных файлов SKILL.md содержат хотя бы одну такую проблему).

```
oma skill lint [--skill <id>] [--json] [--output <format>]
```

**Параметры:**

| Флаг | Описание |
|:-----|:-----------|
| `--skill <id>` | Проверить один навык |
| `--json` | Вывод в формате JSON для CI/CD |
| `--output <format>` | Формат вывода (`text` или `json`) |

**Общие проблемы (для каждого навыка):**

| Сигнал | Серьёзность | Значение |
|:------|:---------|:--------|
| `missing-name` | fail | поле frontmatter `name` отсутствует или пустое |
| `missing-description` | fail | поле frontmatter `description` отсутствует или пустое — от него зависит маршрутизация |
| `weak-description` | warn | описание короче 40 символов — слишком скудное для маршрутизации |
| `body-too-long` | warn | тело SKILL.md длиннее 500 строк — перенесите детали в `resources/` с постепенным раскрытием |
| `template-placeholder` | warn | оставшийся текст `{Placeholder}` вне фрагментов кода |
| `broken-reference` | fail | ссылка на несуществующий файл в `resources/`, `config/`, `scripts/` или `assets/` |

**Проблемы SSL-lite** (проверка SSL-lite обязательна, если объявленное имя навыка или имя его доступного каталога/псевдонима начинается с `oma-`, даже без `## Scheduling`; псевдоним без префикса не может обойти объявленное имя с `oma-`. Обычные навыки без префикса выбирают этот формат, добавляя `## Scheduling`):

| Сигнал | Серьёзность | Значение |
|:------|:---------|:--------|
| `ssl-structure` | fail | разделы верхнего уровня отличаются от `Scheduling / Structural Flow / Logical Operations / References` |
| `canonical-path` | fail | не ровно один раздел `### Canonical command path` или `### Canonical workflow path` |
| `missing-boundaries` | warn | нет раздела `### When NOT to use` — навыки без границ перехватывают маршрутизацию |
| `empty-failure-recovery` | warn | раздел `### Failure and recovery` отсутствует или пуст (допускаются пункты списка или строки таблицы) — описывайте механизмы сбоев по SkillLens |

**Коды выхода:** `0` — нет проблем уровня fail; `1` — есть хотя бы одна проблема уровня fail.

**Примеры:**
```bash
oma skill lint
oma skill lint --skill oma-scholar
oma skill lint --json | jq '.smells'
```

### skills eval

Измеряет полезность навыка: действительно ли загрузка навыка улучшает результаты на отложенных задачах? Это аналог `skills audit` с точки зрения *полезности* (тот измеряет пересечение границ описаний). Если `audit` спрашивает «не дублируют ли друг друга два навыка?», то `eval` спрашивает «помогает ли этот навык?»

```
oma skill eval [--skill <id>] [--mock | --live] [--record] [--yes]
                [--task-dir <path>] [--max-tasks <n>] [--require-coverage]
                [--json] [--output <format>]
```

**Параметры:**

| Флаг | Описание |
|:-----|:-----------|
| `--skill <id>` | ID оцениваемого навыка (простое имя без разделителей пути). По умолчанию — `_all`. |
| `--mock` | Воспроизводит записанные rollouts из `_rollouts/` (по умолчанию; детерминированно, без вызовов LLM). Безопасно для CI. |
| `--live` | Реальный запуск агентов — для каждой задачи запускает две ветви (baseline и treatment) через `oma agent spawn --read-only`. Показывает предварительную оценку стоимости и запрашивает подтверждение, если не указан `--yes`. |
| `--record` | Записывает полученные live rollouts (включая вердикты judge) в `_rollouts/` для последующего воспроизведения с `--mock`. Имеет смысл только с `--live`. |
| `--yes` | Пропускает запрос подтверждения после оценки стоимости. Имеет смысл только с `--live`. |
| `--task-dir <path>` | Переопределяет каталог fixture задач (должен находиться внутри корня рабочего пространства). По умолчанию: `.agents/eval/<skill>/`. |
| `--max-tasks <n>` | Ограничивает число оцениваемых задач (применяется в детерминированном порядке сортировки). |
| `--require-coverage` | Завершается с ненулевым кодом, если найдено меньше 5 задач (предотвращает ложно зелёный результат в CI). |
| `--json` | Вывод в формате JSON для CI/CD |
| `--output <format>` | Формат вывода (`text` или `json`) |

**Как это работает:**

Для каждой fixture задачи в `.agents/eval/<skill>/`:
1. **Ветвь baseline** — промпт задачи отправляется без загруженного навыка.
2. **Ветвь treatment** — `SKILL.md` добавляется в начало промпта, затем промпт отправляется.
3. Каждая ветвь оценивается своим чекером (по умолчанию judge; assert или regex — для детерминированных проверок по выбору).
4. `utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)`.

**Решения:**

| Решение | Условие |
|:---------|:---------|
| `pass` | `utilityLift ≥ 5%` |
| `warn` | `0% < utilityLift < 5%` |
| `fail` | `utilityLift ≤ 0%` (код выхода 1) |
| `insufficient` | Меньше 5 задач, пригодных для оценки (код выхода 1 только с `--require-coverage`) |

**Рекомендуемый режим:** используйте `--live` с judge-чекерами, чтобы измерить реальную полезность навыка. Используйте `--mock`, чтобы воспроизводить записанные вердикты judge офлайн или запускать детерминированные контрактные проверки `assert`/`regex`.

**Переменная окружения:** `OMA_SKILLEVAL_MOCK=1` принудительно включает режим mock независимо от флагов.

**Коды выхода:** `0` — pass или warn; `1` — fail или insufficient при `--require-coverage`.

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

Формат fixture в `.agents/eval/` и типы чекеров описаны в руководстве [Оценка полезности skill](../guide/skill-eval.md).

---

### skills opt

Оптимизирует `SKILL.md` навыка с помощью постоянной эволюции в стиле WikiSkill. Maintainer сводит наблюдаемые evidence из rollouts в знания с ограниченной областью, Proposer предлагает ограниченные правки добавления/удаления/замены, а отклонённые результаты сохраняются между запусками. Кандидаты должны строго улучшать результат на отложенной валидационной выборке; `--apply` дополнительно требует строгого улучшения на финальной тестовой выборке, которой владеет runner. Научная основа: WikiSkill (arXiv:2608.27454).

```
oma skill optimize [--skill <id>] [--dry-run | --apply] [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes] [--json] [--output <format>]
```

**Параметры:**

| Флаг | По умолчанию | Описание |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | ID оптимизируемого навыка (простое имя без разделителей пути). |
| `--dry-run` | **да (по умолчанию)** | Предлагает правки и выводит diff, не изменяя `SKILL.md`; сгенерированные evidence эволюции всё равно записываются. |
| `--apply` | — | Применяет принятые правки; перед атомарной записью создаёт резервную копию оригинала и записывает только проверенное улучшение. |
| `--mock` | **да (по умолчанию)** | Воспроизводит записанные правки оптимизатора и вердикты оценки (детерминированно, офлайн). Безопасно для CI. |
| `--live` | — | Реальный запуск LLM-оптимизатора — в каждой эпохе выполняются настоящие вызовы модели. Показывает оценку стоимости и запрашивает подтверждение, если не указан `--yes`. |
| `--max-epochs <n>` | `8` | Максимальное число эпох оптимизации. |
| `--edits-per-epoch <k>` | `4` | Число правок-кандидатов, предлагаемых за эпоху. |
| `--lr <chars>` | `600` | Текстовый бюджет скорости обучения: максимальное чистое изменение в символах на одну правку. |
| `--yes` | — | Пропускает подтверждение после оценки стоимости (только с `--live`). |
| `--json` | — | Вывод в формате JSON для CI/CD. |
| `--output <format>` | `text` | Формат вывода (`text` или `json`). |

**Жёсткая зависимость:** требуется не менее 5 fixture задач в `.agents/eval/<skill>/`. Если их меньше, команда завершается ошибкой с понятным сообщением. Как их создавать, описано в руководстве [Оценка полезности skill](../guide/skill-eval.md).

**Разбиение train/validation/test:** fixtures детерминированно делятся в пропорции 60/20/20. Maintainer и Proposer видят только evidence из TRAIN, отбор кандидатов использует отложенные задачи VALIDATION, а выборка TEST, которой владеет runner, остаётся скрытой до завершения эволюции. `--apply` записывает изменения, только если прирост строго улучшается и на валидационной, и на финальной тестовой выборке.

**Оговорка о SSOT:** навыки, ID которых начинается с `oma-`, перезаписываются командой `oma update`. Для них `--apply` не рекомендуется — используйте режим по умолчанию `--dry-run` и отправьте предложенный diff в upstream. К навыкам, созданным пользователем, правки применяются свободно.

**Коды выхода:** `0` — оптимизация завершена; `1` — недостаточно fixtures или неверный аргумент.

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

Полное пошаговое описание и подробности о защите SSOT и от переобучения — в руководстве [Оптимизация skill](../guide/skill-opt.md).

---

### harness eval

Сравнивает overlay-кандидат `.agents/` с текущим harness OMA на парных изолированных задачах в репозитории. Целевой агент и маршрут вендора остаются неизменными; детерминированные проверки оценивают файлы и вывод, созданные каждой ветвью.

```
oma harness eval --suite <path> --candidate <path> [--mock | --live]
                 [--record] [--record-file <path>] [--yes]
                 [--timeout-minutes <n>] [--require-coverage]
                 [--json] [--output <format>]
```

| Флаг | Описание |
|:-----|:------------|
| `--suite <path>` | Обязательный YAML-файл suite. Suite и рабочие пространства fixtures должны находиться внутри корня проекта. |
| `--candidate <path>` | Обязательный корень кандидата, содержащий overlay `.agents/` с ограниченной областью. |
| `--mock` | Воспроизводит записанный запуск с совпадающим хешем (по умолчанию; детерминированно и офлайн). |
| `--live` | Запускает ветви baseline и candidate через целевого агента suite. |
| `--record` | Сохраняет live-запуск для последующего воспроизведения в режиме mock. Требует `--live`. |
| `--record-file <path>` | Переопределяет путь записи; он должен оставаться внутри корня проекта. |
| `--yes` | Пропускает подтверждение стоимости live-запуска. |
| `--timeout-minutes <n>` | Таймаут для каждой ветви, одинаковый для baseline и candidate. По умолчанию: `15`. |
| `--require-coverage` | Завершается с ненулевым кодом, если пригодных для оценки парных задач меньше пяти. |
| `--json` | Выводит полную оценку в формате JSON. |
| `--output <format>` | Формат вывода (`text` или `json`). |

**Гейт решения:** для pass нужны не менее 5 парных задач, прирост не менее 5 процентных пунктов и ни одной регрессии. Регрессия всегда означает fail. Покрытие ниже минимума даёт `insufficient` и приводит к ненулевому коду выхода только с `--require-coverage`.

**Изоляция:** файлы кандидата могут заменять во временной ветви candidate только содержимое `.agents/agents`, `.agents/rules`, `.agents/skills` и `.agents/workflows`. Хуки, конфигурация, состояние, fixtures оценки, символические ссылки, варианты вендоров, изменения защищённого frontmatter выполнения агентов и файлы harness вендоров, принадлежащие fixtures, отклоняются. Ветвь завершается неудачей, если во время выполнения изменяет защищённые определения. Обнаружение вендоров через HOME при live-оценке запрещено. Основной маршрут агента фиксирован; закрепление моделей вложенных субагентов пока не обеспечивается.

```bash
# Generate a live measurement and recording
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --live --record

# Replay the same measurement in CI
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --mock --require-coverage --json
```

Схема suite, поддерживаемые проверки, модель изоляции и текущие ограничения описаны в руководстве [Оценка harness](../guide/harness-eval.md).

### harness incident promote

Превращает записанный инцидент в регрессионную fixture для навыка, который выполнял отказавший агент.

```
oma harness incident promote <id> [--skill <id>] [--draft] [--force] [--json]
```

### harness feedback

Продвигает каждый ещё не продвинутый инцидент и, с `--live` или `--apply`, оптимизирует каждый пострадавший навык против его увеличенной suite.

```
oma harness feedback [--scan-runs] [--live] [--apply] [--max-epochs <n>] [--incident <ids...>] [--json]
```

См. руководство [Регрессионные кейсы инцидентов](../guide/harness-incidents.md).

---

### help

Показывает справочную информацию.

```
oma help
```

Выводит полный текст справки со всеми доступными командами.

### version

Показывает номер версии.

```
oma version
```

Выводит текущую версию CLI и завершает работу.

---

## Переменные окружения

| Переменная | Описание | Используют |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Значение `json` включает вывод JSON во всех командах, которые его поддерживают | Все команды с флагом `--json` |
| `DASHBOARD_PORT` | Порт веб-дашборда | `dashboard web` |
| `MEMORIES_DIR` | Переопределяет путь к каталогу memories | `dashboard`, `dashboard web` |
| `OMA_SKILLEVAL_MOCK` | Значение `1` принудительно включает режим mock в `oma skill eval` независимо от флагов | `skills eval` |
| `OMA_HOOK_DEDUP` | Установите `0`, чтобы отключить подавление дублирующихся доставок в `oma hook run`. | `hook` |
| `OMA_HOOK_DEDUP_DIR` | Переопределяет приватный каталог claim, используемый для подавления дублирующихся доставок хуков (по умолчанию: `$XDG_RUNTIME_DIR/oma-hook-dedup`, иначе `<tmpdir>/oma-hook-dedup-<uid>`). | `hook` |

---

## Алиасы

| Алиас | Полная команда |
|:------|:------------|
| `viz` | `visualize` |
