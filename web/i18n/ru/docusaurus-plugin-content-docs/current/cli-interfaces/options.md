---
title: "Опции CLI"
description: "Исчерпывающий справочник всех опций CLI: глобальные флаги, управление выводом, параметры команд и практические сценарии использования."
---

# Опции CLI

## Глобальные опции

Эти опции доступны в корневой команде `oma` / `oh-my-agent`:

| Флаг | Описание |
|:-----|:-----------|
| `-g, --global` | Работает с установкой в HOME (`~/.agents/`) вместо `<cwd>/.agents/` |
| `-y, --yes` | Пропускает интерактивные запросы, если выбранная команда поддерживает подтверждение; проверки безопасности, специфичные для команды, по-прежнему выполняются |
| `-V, --version` | Выводит номер версии и завершает работу |
| `-h, --help` | Показывает справку по команде |

Все подкоманды также поддерживают `-h, --help` для вывода собственной справки.

`--global` задаёт корень установки для всего процесса, поэтому `install`, `update`, `link` и `uninstall` работают с `~/.agents/` независимо от каталога, из которого их запускают. `OMA_HOME=<abs-path>` переопределяет его — см. [Глобальная установка](../guide/global-install.md).

---

## Опции вывода {#output-options}

Многие команды поддерживают машиночитаемый вывод для CI/CD-пайплайнов и автоматизации. Запросить JSON-вывод можно тремя способами; ниже они перечислены в порядке приоритета:

### 1. Флаг --json

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

Флаг `--json` доступен только в тех путях команд, где он явно заявлен. Не делайте выводов о поддержке по семейству команд: например, конечные подкоманды `image`, `video` и `slide` предоставляют `--output` там, где это указано в реестре, а у `search` собственный поток JSON. Матрица реестра в конце этой страницы — авторитетный список для каждого пути.

### 2. Флаг --output

```bash
oma stats get --output json
oma doctor --output text
```

Флаг `--output` принимает `text` или `json`. Он работает так же, как `--json`, но также позволяет явно запросить текстовый вывод (полезно, когда переменная окружения задаёт json, а для конкретной команды нужен текст).

**Проверка:** При недопустимом формате CLI выбрасывает ошибку: `Invalid output format: {value}. Expected one of text, json`.

### 3. Переменная окружения OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Задайте этой переменной окружения значение `json`, чтобы принудительно включить JSON-вывод во всех командах, которые его поддерживают. Распознаётся только `json`; любое другое значение игнорируется, и по умолчанию используется текстовый вывод.

**Порядок разрешения:** флаг `--json` > флаг `--output` > переменная окружения `OH_MY_AG_OUTPUT_FORMAT` > `text` (по умолчанию).

### Команды с поддержкой JSON-вывода

| Команда | `--json` | `--output` | Примечания |
|:--------|:---------|:----------|:------|
| `doctor` | Да | Да | Включает проверки CLI, статус MCP и статус навыков |
| `stats` | Да | Да | Полный объект метрик |
| `retro` | Да | Да | Снимок с метриками, авторами и типами коммитов |
| `cleanup` | Да | Да | Список очищенных элементов |
| `auth status` | Да | Да | Статус аутентификации для каждого CLI |
| `memory init` | Да | Да | Результат инициализации |
| `verify agent` / `verify triggers` | Да | Да | Результаты по каждой проверке |
| `visualize` | Да | Да | Граф зависимостей в формате JSON |
| `describe` | Всегда JSON | Н/Д | Всегда выводит JSON (команда интроспекции) |
| `recap` | Да | Да | История диалогов по инструментам и сессиям |
| `image generate` / `image doctor` / `image vendor list` | Н/Д | Да | Используйте `--output json`; `vendor list` — канонический путь обнаружения вендоров |
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | Н/Д | Да | Используйте `--output json`, чтобы получить JSON envelope запуска или отчёт о готовности |
| `explain validate` | Да | Да | Отчёт о проверке артефактов |
| `diagram resolve` / `diagram update` | Да | Да | Результат определения движка или обновления управляемого кэша |
| `market resolve` / `market update` | Да | Да | Статус управляемого исследовательского движка |
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | Да | Н/Д | Каждый путь docs использует собственные опции отчётов |
| `search ...` | Всегда JSON | Н/Д | Все подкоманды `search` выводят поток JSON; для удобного чтения используйте `--pretty` |

---

## Опции отдельных команд

### install

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

Интерактивный установщик записывает выбранные настройки провайдеров в `.agents/oma-config.yaml`. Флаги провайдеров выбирают интеграции веб-поиска, code intelligence и семантической памяти; `--honcho-url` и `--honcho-workspace` настраивают сервис памяти Honcho, если выбран этот провайдер. Корневой флаг `-y, --yes` действует, когда процесс установки запрашивает подтверждение.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--json` | Выводит JSON вместо форматированного текста. | `false` |
| `--output <format>` | Явный формат вывода (`text` или `json`). См. [Опции вывода](#output-options). | `text` |
| `--profile` | Показывает матрицу состояния профилей (разрешённый slug модели, CLI и статус аутентификации для каждого агента с учётом активного `model_preset` и переопределений `agents:`). См. [Модели по агентам](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Перезаписывает изменённые пользователем файлы конфигурации при обновлении. Затрагивает: `oma-config.yaml`, `mcp.json`, каталоги `stack/`. Без этого флага эти файлы перед обновлением сохраняются в резервную копию, а после него восстанавливаются. | `false` |
| `--with-new-skills` | | Устанавливает навыки, добавленные в реестр после текущей установки. | `false` |
| `--ci` | | Запускает обновление в неинтерактивном режиме CI. Пропускает все запросы подтверждения и использует простой консольный вывод вместо спиннеров и анимаций. Обязателен для CI/CD-пайплайнов, где stdin недоступен. | `false` |
| `--yes` | `-y` | Пропускает интерактивные запросы. Не создаёт отсутствующие каталоги вендоров, если не используется вместе с `--all` или `--vendor`. | `false` |
| `--all` | | Создаёт или обновляет все поддерживаемые вендоры уровня проекта. | `false` |
| `--vendor <vendors>` | | Создаёт или обновляет вендоры из списка через запятую, например `claude,qwen`. | Только существующие каталоги вендоров |

`oma update mcp` использует те же параметры `--yes`, `--ci`, `--all` и `--vendor` при выборе браузерных MCP-серверов. Команда не использует `--force` и `--with-new-skills`.

**Поведение с --force:**
- `oma-config.yaml` заменяется версией по умолчанию из реестра.
- `mcp.json` заменяется версией по умолчанию из реестра.
- Каталог `stack/` бэкенда (ресурсы для конкретного языка) заменяется.
- Все остальные файлы обновляются всегда, независимо от этого флага.

**Поведение с --ci:**
- При запуске не вызывается `console.clear()`.
- `@clack/prompts` заменяется простым `console.log`.
- Запросы при обнаружении конкурирующих инструментов пропускаются.
- Ошибки выбрасываются как исключения, а не через вызов `process.exit(1)`.

**Область вендоров:**
- `oma update` обновляет только уже существующие каталоги вендоров.
- `oma update --yes` использует ту же область вендоров, но без интерактивных запросов.
- `oma update --all` создаёт или обновляет все поддерживаемые вендоры уровня проекта.
- `oma update --vendor claude,qwen` создаёт или обновляет только перечисленные вендоры.

### stats

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--json` | Выводит результат сброса в формате JSON. | `false` |
| `--output <format>` | Выводит `text` или `json`. | `text` |

`oma stats reset` — команда сброса. Прежняя форма записи `oma stats get --reset` не входит в текущий публичный интерфейс.

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--interactive` | Интерактивный режим с ручным вводом данных. Запрашивает дополнительный контекст, который нельзя получить из git (например, настроение, заметные события). | `false` |
| `--compare` | Сравнивает текущее временное окно с предыдущим окном той же длины. Показывает изменения метрик (например, коммиты +12, добавленные строки -340). | `false` |

**Формат аргумента окна:**
- `7d`: 7 дней
- `2w`: 2 недели
- `1m`: 1 месяц
- Не указывайте, чтобы использовать значение по умолчанию (7 дней)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Режим предварительного просмотра. Перечисляет все элементы, которые были бы очищены, но не вносит изменений. Код выхода 0 независимо от результатов. | `false` |
| `--yes` | `-y` | Пропускает все запросы подтверждения. Очищает всё без вопросов. Полезно в скриптах и CI. | `false` |

**Что очищается:**
1. Осиротевшие PID-файлы: `/tmp/subagent-*.pid`, процесс которых уже не выполняется.
2. Осиротевшие лог-файлы: `/tmp/subagent-*.log`, соответствующие PID завершившихся процессов.
3. Каталоги Gemini Antigravity: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. Со временем в них накапливается состояние, и они могут сильно разрастаться.

### agent spawn

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | — | Связывает повторную попытку с ID предшествующего запуска. | |
| `--fallback-vendors` | — | Явная упорядоченная цепочка fallback-вендоров через запятую. | |
| `--task-id` | — | ID задачи из плана сессии. | ID агента |
| `--vendor` | — | Переопределение CLI-вендора. Runtime принимает `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` или `pi`. | Определяется из конфигурации |
| `--workspace` | `-w` | Рабочий каталог агента. Если не указан или равен `.`, CLI автоматически определяет рабочее пространство по конфигурационным файлам монорепозитория (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Определяется автоматически или `.` |
| `--isolation` | — | Режим изоляции: `worktree` создаёт отдельный git worktree для каждого запуска; по умолчанию — `none`. | `none` |
| `--read-only` | — | Ограничивает запущенного агента неразрушающими инструментами и отключает флаги автоподтверждения. | `false` |

**Проверка:**
- `agent-id` должен быть одним из: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` не должен содержать `..`, `?`, `#`, `%` или управляющие символы.
- `vendor` должен быть одним из: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`.

**Поведение для конкретных вендоров:**

| Вендор | Команда | Флаг автоподтверждения | Флаг промпта |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | (нет) | `-p` |
| codex | `codex` | `--sandbox workspace-write` | (нет; промпт передаётся позиционно) |
| cursor | `cursor-agent` | зависит от вендора | `-p` |
| opencode | `opencode` | зависит от вендора | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | зависит от вендора | `-p` |
| pi | `pi` | подавляется в режиме `--read-only` | промпт передаётся позиционно |

Эти значения по умолчанию можно переопределить в `.agents/skills/oma-orchestration/config/cli-config.yaml`.

Codex сохраняет свою песочницу workspace-write. oma включает доступ к сети и добавляет корень проекта, домашний каталог состояния OMA (`~/.oma`) и существующие кэши менеджеров пакетов как каталоги, доступные для записи. `oma update` заменяет `cli-config.yaml`, поэтому для постоянного режима задайте `OMA_CODEX_SANDBOX`: `read-only`, `workspace-write` (по умолчанию) или `danger-full-access` (без песочницы и без подтверждений).

### agent status

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Корневой путь для поиска файлов памяти (`.agents/state/memories/result-{agent}.md`) и PID-файлов. | Текущий рабочий каталог |

**Логика определения состояния:**
1. Если существует `.agents/state/memories/result-{agent}.md`: читает заголовок `## Status:`. Если заголовка нет, сообщает `completed`.
2. Если существует PID-файл `/tmp/subagent-{session-id}-{agent}.pid`: проверяет, жив ли процесс с этим PID. Сообщает `running`, если он жив, и `crashed`, если нет.
3. Если нет ни одного из этих файлов: сообщает `crashed`.

### agent parallel

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:--------|
| `--vendor` | — | Переопределение CLI-вендора для всех запускаемых агентов. | Определяется для каждого агента из конфигурации |
| `--inline` | `-i` | Интерпретирует аргументы задач как строки `agent:task[:workspace]`, а не как путь к файлу. | `false` |
| `--no-wait` | | Фоновый режим. Запускает всех агентов и сразу возвращает управление, не дожидаясь завершения. Список PID и журналы сохраняются в `.agents/results/parallel-{timestamp}/`. | `false` (ожидает завершения) |

**Формат инлайн-задачи:** `agent:task` или `agent:task:workspace`
- Рабочее пространство определяется проверкой: начинается ли последний сегмент, отделённый двоеточием, с `./` или `/` либо равен ли он `.`.
- Пример: `backend:Implement auth API:./api` -- agent=backend, task="Implement auth API", workspace=./api.
- Пример: `frontend:Build login page` -- agent=frontend, task="Build login page", workspace определяется автоматически.

**Формат YAML-файла задач:**
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
|:-----|:-----------|:--------|
| `--window <period>` | Временное окно: `1d`, `3d`, `7d`, `2w`, `30d`. Игнорируется, если задан `--date`. | `1d` |
| `--date <date>` | Конкретная дата (`YYYY-MM-DD`). Имеет приоритет над `--window`. | |
| `--tool <tools>` | Фильтрует сессии по инструменту. Значения через запятую: `grok`, `claude`, `codex`, `qwen`, `cursor`, `antigravity`. | все инструменты |
| `--top <n>` | Показывает в сводке только топ-N проектов/тем. | без ограничений |
| `--sort <metric>` | Сортирует сессии по `count` или `duration`. | `count` |
| `--mermaid` | Выводит диаграмму Ганта Mermaid вместо стандартной сводки. | `false` |
| `--graph` | Открывает интерактивный граф в браузере. Несовместим с `--mermaid`. | `false` |

> **Примечание:** Генерацией файлов правил вендоров (например, `.cursor/rules`) из установленных навыков занимается [`oma link <vendor>`](./commands.md#link), а не отдельная команда `export`.

### search

```
oma search <subcommand> [...]
```

Группа `search` выдаёт собственный JSON-вывод (без флагов `--json` / `--output`). Используйте `--pretty` в подкомандах для URL и запросов, чтобы получить форматированный вывод, и опирайтесь на опции конкретных подкоманд ниже:

| Подкоманда | Основные опции |
|:-----------|:---------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (по умолчанию `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (по умолчанию `en`), `--format <spec>`, `--timeout` (по умолчанию `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (по умолчанию `github`), `--language`, `--repo`, `--limit` (по умолчанию `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | нет (выполняет проверку бинарных файлов Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

**Коды выхода:** `0` ok, `1` error, `2` blocked, `3` not-found, `4` invalid-input, `5` auth-required, `6` timeout. Используйте их в скриптах, чтобы отличать временные блокировки от некорректных входных данных.

### image

```
oma image <subcommand> [...]
```

Формат вывода задаётся для каждой подкоманды через `--output <text|json>`.

`image generate` принимает:

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` определяется по активной конфигурации `image:` и доступной аутентификации. | `auto` |
| `--size <size>` | | `WxH`, где обе стороны кратны 16 и лежат в диапазоне 16–3840, соотношение сторон 1:3–3:1; либо `auto`. | значение вендора по умолчанию |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | значение вендора по умолчанию |
| `--count <n>` | `-n` | Количество изображений, 1..5. | `1` |
| `--output-dir <dir>` | | Каталог вывода. Должен находиться внутри `$PWD`, если не задан `--allow-external-output`. | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | Разрешает пути `--output-dir` за пределами `$PWD`. | `false` |
| `--model <name>` | | Переопределение модели для конкретного вендора. Модель antigravity выбирает `agy`. | значение вендора по умолчанию |
| `--timeout <duration>` | | Тайм-аут для каждого изображения, задаётся значением длительности. | значение вендора по умолчанию |
| `--reference <path>` | `-r` | Эталонное изображение для переноса стиля или объекта. Флаг можно повторять (`-r a.png -r b.png`) или передавать пути через запятую. Проверяются размер (≤5 МБ), формат (PNG/JPEG/GIF/WebP по magic bytes) и количество (≤10). Поддерживается в `codex` и `antigravity`; в `pollinations` отклоняется с кодом выхода 4. | |
| `--yes` | `-y` | Пропускает запрос подтверждения стоимости. | `false` |
| `--no-prompt-in-manifest` | | Сохраняет в `manifest.json` SHA256 промпта вместо исходного текста. | `false` |
| `--dry-run` | | Печатает план и оценку стоимости, ничего не выполняя. | `false` |
| `--output <format>` | | `text` \| `json`. | `text` |

`image doctor` и `image vendor list` принимают `--output <text|json>`. `image list-vendors` остаётся алиасом справки; `vendor list` — канонический путь обнаружения вендоров.

### video

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` принимает параметры планирования и захвата `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` и `--capture-stop`. Также поддерживаются `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output` и `--no-brief-in-manifest`. Для захвата из браузера используется `--source web --url <url>`; источник по умолчанию — `file`. Обычный рендер требует созданной composition и работающего compositor; placeholder допускается только в тестовом пути `OMA_VIDEO_MOCK=1`.

`video doctor` сообщает о состоянии toolchain HyperFrames/MPT/Strudel или подготавливает её. `compose` готовит контракт composition для запуска, а `render` выполняет lint, рендер и probe результата. `provider list` сообщает статус провайдеров и ключей. Manifest запуска и последовательность восстановления описаны в руководстве [Генерация видео](../guide/video-generation.md).

### memory init

```
oma memory init [--json] [--output <format>] [--force]
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--force` | Перезаписывает пустые или существующие файлы схемы в `.agents/state/memories/`. Без этого флага существующие файлы не затрагиваются. | `false` |

### verify

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Путь к каталогу рабочего пространства для проверки. | Текущий рабочий каталог |

**Типы агентов:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers` измеряет точность keyword-detector на размеченном корпусе. Процентные пороги работают как шлюзы; если CI-задаче нужно разобрать отдельные находки, используйте JSON-вывод. Старая форма записи `oma verify <agent-type>` сохранена как форма справки для совместимости; зарегистрированный путь — `verify agent`.

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

Следующая матрица сгенерирована из публичного реестра команд, хранящегося в репозитории. Это индекс покрытия этой страницы: строка с `—` не содержит параметров, специфичных для команды, а общие корневые флаги и алиасы справки описаны выше. Запустите `oma describe "<path>"`, чтобы просмотреть справку во время выполнения, если изменится грамматика значения.

| Путь команды | Публичные опции | Назначение |
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | Устанавливает навыки и конфигурации oh-my-agent |
| `describe` | `—` | Описывает команды CLI в формате JSON для интроспекции во время выполнения |
| `uninstall` | `--dry-run, -y, --yes` | Удаляет файлы, принадлежащие oh-my-agent (сохраняет oma-config.yaml, mcp.json и навыки, созданные пользователем) |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | Обновляет навыки до последней версии из реестра |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | Выбирает браузерные MCP-серверы (Aside, Chrome DevTools, Firefox DevTools) |
| `link` | `--dry-run` | Повторно генерирует файлы вендоров (.claude/, .cursor/ и т. д.) из SSOT .agents/ |
| `intel` | `—` | Пайплайн продуктовой аналитики: исследование, пробелы, PRD, предложение issue |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | Предлагает наиболее ценную продуктовую работу на основе рыночной аналитики и анализа кода |
| `market` | `—` | Исследование рынка по сигналам сообществ через всегда актуальный движок last30days |
| `market detect-trap` | `--force` | Предварительная проверка, отклоняющая запросы-ловушки по ключевым словам |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | Сообщает, какой движок last30days запустит oma (управляемая последняя версия, закреплённая версия или локальная копия) и какой Python он использует |
| `market update` | `--json, --output <format>` | Загружает последний релиз last30days в управляемый кэш oma (~/.cache/oma-market/last30days) |
| `market run` | `—` | Запускает движок last30days (scripts/last30days.py) с переданными аргументами; --save-dir по умолчанию равен market.save_dir |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | Проверяет установку CLI, конфигурации MCP и состояние навыков |
| `profile` | `—` | Управляет локальными профилями выполнения OMA |
| `profile list` | `--json, --output <format>` | Выводит список локальных профилей |
| `profile show` | `--json, --output <format>` | Показывает локальный профиль |
| `profile create` | `--json, --output <format>` | Создаёт локальный профиль |
| `profile use` | `--shell <shell>, --json, --output <format>` | Печатает shell-код для активации существующего профиля |
| `profile run` | `—` | Запускает одну команду с OMA_PROFILE, заданным для дочернего процесса |
| `retro` | `--interactive, --compare, --json, --output <format>` | Инженерная ретроспектива с метриками и трендами |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | Подводит итоги по истории диалогов в AI-инструментах |
| `docs` | `—` | Обнаружение дрейфа документации: проверка ссылок и предложение обновлений для документов, затронутых diff |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | Извлекает ссылки L2 из документации и сообщает о сломанных целях. Попутно пересоздаёт docs/generated/doc-refs.json. Код выхода: 0 = ошибок нет, 1 = найдены сломанные ссылки. Проверка URL-ссылок делегируется `lychee` (установка: brew install lychee). |
| `docs sync` | `--json` | По заданному git diff выводит список документов, ссылающихся на изменённые файлы. Ожидается, что host LLM (runtime навыка) прочитает этот список вместе с diff и предложит патчи согласно контракту SKILL.md — CLI никогда не редактирует документацию автоматически. Диапазон diff по умолчанию: --cached (проиндексированные изменения), с fallback на HEAD~1..HEAD. |
| `docs i18n` | `--json, --min-severity <level>` | Обнаруживает дрейф между английскими исходными документами (web/docs) и переводами i18n (web/i18n/{lang}/...). Для каждой пары выдаёт структурные сигналы (число строк, число заголовков, время последнего коммита), чтобы host LLM мог решить, каким переводам нужен патч diff-sync. CLI никогда не редактирует переводы. |
| `docs lint` | `--json, --locales <list>` | Проверяет переведённые документы на антипаттерны на уровне содержания (длинные тире в CJK-переводах и т. п.). Дополняет `oma docs i18n` (структурный дрейф) проверками стиля и антипаттернов по oma-translation SKILL.md § Stage 4. CLI никогда не исправляет автоматически — он только сообщает о проблемах, чтобы host LLM их переработал. |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | Генерирует соответствующие стандартам артефакты из SSOT .agents/ (спецификация Agent Skills, пакет Agent Plugins, маркетплейс плагинов Claude Code, AGENTS.md, документация вендоров в области cli/) |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | Очищает осиротевшие процессы субагентов и временные файлы |
| `bridge` | `--context <name>` | Проксирует MCP stdio к общему для проекта серверу Serena (запускается по требованию) |
| `verify` | `—` | Проверяет результат субагента (backend/frontend/mobile/qa/debug/pm) или измеряет точность срабатывания keyword-detector |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` |  |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | Измеряет точность срабатывания keyword-detector на размеченном корпусе промптов |
| `vault` | `—` | Управляет API-ключами и секретами в хранилище ключей ОС (macOS Keychain / Linux Secret Service / Windows Credential Manager) |
| `vault store` | `--value <value>` | Сохраняет секрет под именем <name> (интерактивный ввод пароля) |
| `vault get` | `—` | Печатает сохранённое значение в stdout (для: export KEY=$(oma vault get <name>)) |
| `vault list` | `--json` | Выводит список имён сохранённых секретов (значения никогда не отображаются) |
| `vault delete` | `—` | Удаляет секрет из хранилища ключей и индекса |
| `star` | `—` | Ставит звезду oh-my-agent на GitHub |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | Визуализирует структуру проекта в виде графа зависимостей |
| `search` | `—` | Механические примитивы поиска — fetch, meta, rss, media, trust, code |
| `search providers` | `--json, --pretty` | Выводит список зарегистрированных провайдеров поиска и показывает их выбор без сетевых запросов |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | Выполняет поиск через выбранного веб-провайдера (для Brave есть CLI-адаптер) |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | Загружает URL через пайплайн стратегий с автоматической эскалацией |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | Извлекает OGP / JSON-LD / Schema.org из URL |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | Извлекает метаданные медиа через yt-dlp (1858 сайтов) |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | Загружает через AMP / archive.today / Wayback |
| `search trust` | `--pretty` | Определяет уровень / оценку доверия для домена |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | Ищет код через gh / glab |
| `search doctor` | `—` | Проверяет зависимости (Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search api` | `—` |  |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | Загружает данные через API подходящей платформы (фаза 0) |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | Веерный поиск по ключевым словам на платформах, которые его поддерживают |
| `search rss` | `—` |  |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | Находит и разбирает RSS/Atom-ленту для URL |
| `search rss google` | `--locale <value>` | Формирует RSS-URL Google News для запроса |
| `harness` | `—` | Оценивает overlay harness OMA на изолированных задачах репозитория |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | Сравнивает candidate overlay .agents с текущим baseline |
| `harness incident promote` | `--skill <id>, --draft, --force, --json, --output <format>` | Выводит регрессионную fixture навыка из записанного инцидента |
| `harness feedback` | `--live, --apply, --max-epochs <n>, --incident <ids...>, --scan-runs, --json, --output <format>` | Продвигает инциденты и оптимизирует пострадавшие навыки |
| `harness evolution enable` | `--max-dispatches <n>, --cron <expr>, --mode <mode>, --json, --output <format>` | Включает запланированный цикл обратной связи проекта в рамках бюджета; режим — apply или propose |
| `harness evolution status` | `--json, --output <format>` | Показывает конфигурацию, расписание, ожидающую работу, конфликты и последний цикл |
| `harness evolution disable` | `--json, --output <format>` | Отключает запланированный цикл обратной связи проекта |
| `harness evolution run` | `--json, --output <format>` | Запускает один цикл в сохранённом режиме и с сохранённым бюджетом включённого проекта |
| `slide` | `—` | Инструментарий для HTML-презентаций — создание каркаса, проверка, экспорт и редактирование слайд-деков 1920×1080 |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | Геометрический шлюз качества — рендерит слайды через puppeteer-core и проверяет переполнение, перекрытия и размер шрифта |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | Объединяет файлы отдельных слайдов в один самодостаточный .html-файл для передачи |
| `slide edit` | `--workspace <path>, --port <n>` | Открывает браузерный bbox-редактор (сервер node:http на 127.0.0.1, передаёт задачи oma agent runner) |
| `slide doctor` | `—` | Проверяет обязательные зависимости (chrome, puppeteer-core) и необязательные (yt-dlp, pptxgenjs) |
| `slide create` | `--output-dir <path>, --force` | Создаёт новый рабочий каталог слайдов со стартовым HTML, assets/ и meta.json |
| `slide preview` | `--workspace <path>` | Собирает viewer.html (веб-компонент deck-stage + панель заметок докладчика, переключается клавишей `n`) |
| `slide export` | `—` |  |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | Экспортирует слайды в PDF через puppeteer-core |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | Экспортирует каждый слайд в PNG-изображение через puppeteer-core |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | [ЭКСПЕРИМЕНТАЛЬНО] Экспортирует в PPTX через pptxgenjs (на основе растра, градиенты растеризуются) |
| `slide import` | `—` |  |
| `slide import pptx` | `--workspace <path>` | Импортирует файл .pptx во фрагменты слайдов через officeparser (bunx, по возможности) |
| `slide asset` | `—` |  |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | Загружает видео через yt-dlp в ./assets/ и печатает локальную ссылку |
| `slide style` | `—` | Просматривает и загружает пресеты стилей оформления |
| `slide style list` | `—` | Выводит список доступных пресетов стилей (встроенные + индекс bold-template) |
| `slide style preview` | `—` | Показывает предварительный просмотр пресета стиля в терминале |
| `slide style get` | `--refresh` | Загружает design.md из bold-шаблона (всегда актуальный main; кэшируется для офлайн-fallback) |
| `scholar` | `—` | Sidecar-файлы статей Knows.academy (с fallback на OpenAlex и Semantic Scholar) |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | Ищет статьи (knows.academy → OpenAlex → Semantic Scholar) |
| `scholar resolve` | `—` | Находит наиболее подходящую статью в knows.academy, OpenAlex и Semantic Scholar |
| `scholar get` | `--section <name>` | Загружает sidecar (knows record_id) или метаданные работы (W-id, DOI, arXiv:<id>, CorpusId:<n>, S2 paperId) |
| `scholar lint` | `--lenient, --fail-on-warning` | Проверяет sidecar .knows.yaml или .knows.json (v0.9.0) |
| `image` | `—` | Мультивендорная генерация изображений с помощью AI — параллельная диспетчеризация с учётом аутентификации |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | Генерирует изображения через pollinations (flux/zimage, бесплатно), codex (gpt-image-2, ChatGPT OAuth) или antigravity (gemini nano-banana через CLI `agy`, бесплатно при входе в Gemini Code Assist) |
| `image doctor` | `--output <format>` | Проверяет статус аутентификации и установки для каждого вендора |
| `image vendor` | `—` |  |
| `image vendor list` | `--output <format>` | Выводит список зарегистрированных вендоров и поддерживаемых моделей |
| `video` | `—` | Генерация коротких, объясняющих и демонстрационных видео |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | Создаёт каталог запуска видео по брифу |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | Проверяет готовность видеопровайдеров и compositor |
| `video compose` | `--output <format>, --refresh, --offline` | Создаёт каркас проекта HyperFrames для запуска на последней toolchain + heygen-com/hyperframes; печатает контракт authoring |
| `video render` | `--output <format>` | Повторно рендерит каталог запуска по render-spec.json |
| `video provider` | `—` |  |
| `video provider list` | `--output <format>` | Выводит список видеопровайдеров и их доступность |
| `serena` | `—` | Утилиты управления жизненным циклом языкового сервера Serena MCP |
| `serena reap` | `--dry-run, --quiet` | Завершает простаивающие дочерние процессы LSP Serena, чтобы освободить память (Serena самовосстанавливается при следующем вызове инструмента) |
| `serena reaper` | `—` |  |
| `serena reaper enable` | `--dry-run` | Устанавливает периодическую задачу Serena Reaper по расписанию (запускается каждые 5 минут) |
| `serena reaper disable` | `--dry-run` | Удаляет периодическую задачу Serena Reaper по расписанию |
| `explain` | `—` | Инструменты управления артефактами explain и проверки их качества |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | Проверяет самодостаточные HTML-артефакты отчётов explain |
| `diagram` | `—` | Вспомогательные команды движка диаграмм (интерактивный HTML archify или fallback на Mermaid) |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | Сообщает, какой движок диаграмм должны использовать рабочие процессы и где находится archify |
| `diagram update` | `--json, --output <format>` | Загружает последний релиз archify в управляемый кэш oma (~/.cache/oma-diagram/archify) |
| `diagram archify` | `—` | Запускает установленный CLI archify (doctor \| guide \| validate \| deliver \| visual-check …) с отключёнными проверками обновлений |
| `help` | `—` | Показывает справку |
| `version` | `—` | Показывает номер версии |
| `dashboard` | `—` |  |
| `dashboard terminal` | `—` | Запускает терминальный дашборд (мониторинг агентов в реальном времени) |
| `dashboard web` | `—` | Запускает веб-дашборд на http://127.0.0.1:9847 |
| `auth` | `—` |  |
| `auth status` | `--json, --output <format>` | Проверяет статус аутентификации всех поддерживаемых CLI |
| `hook` | `—` |  |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | Передаёт событие хука вендора через централизованный маршрутизатор хуков oma (design 019) |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | Проверяет совместимость хуков L1 для каждого вендора и печатает матрицу (D63) |
| `state` | `—` |  |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | Добавляет событие рабочего процесса OMA L1 |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | Переносит устаревшие сессии в домашний профиль и удаляет проверенные оригиналы |
| `state get` | `--json, --output <format>` | Показывает одну сессию OMA L1 по ID |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Показывает состояние рабочих процессов OMA L1 |
| `state repair` | `--dry-run, --json, --output <format>` | Восстанавливает файлы состояния рабочих процессов OMA L1 |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | Проверяет обязательные события L1 для контрольной точки рабочего процесса |
| `state decisions` | `—` |  |
| `state decisions list` | `--json, --output <format>` | Выводит список обязательных контрольных точек L1 decision.made |
| `state inject-log` | `—` |  |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | Выводит список журналов аудита inject для каждой границы или показывает их (D52) |
| `state inject-log get` | `--json, --output <format>` | Выводит список журналов аудита inject для каждой границы или показывает их (D52) |
| `state summary` | `--category <category>, --json, --output <format>` | Экспортирует сводку сессии в хранилище координации |
| `state trajectory` | `--category <category>, --open, --json, --output <format>` | Показывает траекторию сессии: события L1, объединённые с транскриптами вендоров |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | Проверяет, разрешено ли самовосстановление для агента |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Показывает состояние рабочих процессов OMA L1 |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Показывает состояние рабочих процессов OMA L1 |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Показывает состояние рабочих процессов OMA L1 |
| `ralph` | `—` |  |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | Проверяет артефакты EXEC ralph (шлюз против обхода проверок, ralph.md Step 1.3) |
| `goal` | `—` |  |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | Привязывает контракт цели (детерминированный шлюз остановки / бюджет по реальному времени) к активному постоянному рабочему процессу |
| `stats` | `—` |  |
| `stats get` | `--json, --output <format>` | Показывает метрики продуктивности |
| `stats reset` | `--json, --output <format>` | Показывает метрики продуктивности |
| `agent` | `—` |  |
| `agent context` | `--project-root <path>, --difficulty <level>` | Загружает контекст, выбранный по графу, для промпта нативного dispatch |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | Возобновляет безопасные незавершённые задачи, повторно используя текущие evidence приёмки |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | Начинает нативный запуск агента, подтверждённый evidence |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | Выполняет argv проверки, переданный после --, и записывает его фактический код выхода |
| `agent finish` | `--project-root <path>` | Проверяет результат нативного агента по его квитанциям проверки |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | Запускает субагента (промпт может быть текстом или путём к файлу) |
| `agent status` | `--project-root <path>` | Проверяет статус субагентов |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | Запускает несколько субагентов параллельно |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | Выполняет code review с помощью внешнего CLI (codex/claude/qwen/grok) |
| `model` | `—` |  |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | Сверяет реестр моделей с актуальными списками моделей вендоров |
| `model probe` | `--json, --timeout <duration>` | Проверяет slug модели через CLI её вендора, чтобы убедиться, что он принимается |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | Выполняет внутри model:check --probe и генерирует патч `models:` для oma-config с принятыми кандидатами |
| `memory` | `—` |  |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Настраивает подключение к Honcho или учётные данные для локальных эмбеддингов |
| `memory init` | `--force, --json, --output <format>` | Инициализирует хранилище координации в .agents/state/memories |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | Подготавливает конфигурацию endpoint AgentMemory |
| `memory daemon` | `—` | Управляет процессом демона AgentMemory, принадлежащим OMA |
| `memory daemon status` | `--json, --output <format>` | Показывает статус демона |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | Запускает AgentMemory в фоновом режиме |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | Останавливает демон AgentMemory, принадлежащий OMA |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | Перезапускает демон AgentMemory, принадлежащий OMA |
| `memory service` | `—` | Управляет интеграцией AgentMemory со службами ОС |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | Устанавливает интеграцию AgentMemory со службами launchd/systemd |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | Удаляет интеграцию AgentMemory со службами launchd/systemd |
| `memory status` | `--json, --output <format>` | Показывает состояние выбранного провайдера семантической памяти |
| `memory retry` | `—` |  |
| `memory retry drain` | `--dry-run, --json, --output <format>` | Обрабатывает очередь повторных попыток observe AgentMemory |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | Импортирует историю диалогов вендоров в AgentMemory |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | Обслуживает локальное хранилище AgentMemory: резервное копирование, очистка, vacuum |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | Обслуживает локальное хранилище AgentMemory: резервное копирование, очистка, vacuum |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | Обслуживает локальное хранилище AgentMemory: резервное копирование, очистка, vacuum |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | Обслуживает локальное хранилище AgentMemory: резервное копирование, очистка, vacuum |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | Выполняет сборку мусора в локальной памяти проекта: удаляет старые сессии L1 и временные файлы Serena |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | Останавливает AgentMemory, создаёт резервную копию, обновляет, перезапускает и проверяет работоспособность |
| `skill` | `—` | Просматривает и проверяет установленные навыки |
| `skill audit` | `--json, --output <format>` | Проверяет сходство описаний во frontmatter установленных навыков |
| `skill lint` | `--skill <id>, --json, --output <format>` | Выявляет признаки проблем в написании каждого навыка (frontmatter, структура, сломанные ссылки) |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --trials <n>, --require-coverage, --neg-transfer, --routing, --json, --output <format>` | Измеряет прирост полезности каждого навыка (treatment против baseline на отложенных задачах) |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --memory <mode>, --json, --output <format>` | Оптимизирует SKILL.md навыка, чтобы максимизировать измеренный прирост полезности на отложенных задачах |
| `skill meta-optimize` | `--target <part>, --skill <ids...>, --anchor <ids...>, --repeats <n>, --candidates <n>, --max-epochs <n>, --edits-per-epoch <k>, --live, --apply, --memory <mode>, --yes, --json, --output <format>` | Предлагает и оценивает изменения процедуры эволюции на отложенных навыках |
| `skill procedure` | `--export, --json, --output <format>` | Показывает процедуру эволюции (prompts optimizer/maintainer, constitution) и её hash-значения |
| `skill evolution-stats` | `--skill <id>, --json, --output <format>` | Агрегирует записанные запуски оптимизации по результату, режиму памяти и процедуре |
| `skill promotions` | `--skill <id>, --all, --json, --output <format>` | Описывает записанные продвижения и откаты SKILL.md для навыка либо для каждого навыка и процедуры с `--all` |
| `skill rollback` | `--skill <id>, --json, --output <format>` | Восстанавливает тело SKILL.md, заменённое самым последним записанным продвижением |
| `schedule` | `—` |  |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | Регистрирует задание агента по расписанию |
| `schedule list` | `--json, --output <format>` | Выводит список заданий по расписанию с состоянием дрейфа относительно ОС (synced/missing-in-os/orphan-in-os), сгруппированный по проектам |
| `schedule delete` | `—` | Удаляет задание по расписанию из manifest и планировщика ОС |
| `schedule run` | `—` | Выполняет задание по расписанию по id (вызывается планировщиком ОС; обычно не вызывается напрямую) |
| `schedule sync` | `--prune` | Повторно синхронизирует manifest → планировщик ОС. Используйте --prune, чтобы удалить осиротевшие задания ОС. |
