---
title: "Опции CLI"
description: "Справочник опций CLI oma: глобальные флаги, управление выводом, переименованные формы записи, опции отдельных команд, коды выхода и реестр, сгенерированный из oma describe."
---

# Опции CLI

## Краткая справка {#quick-reference}

| Мне нужно... | Что использовать |
|:-------------|:----|
| Запускать без интерактивных запросов | `-y` / `--yes` (также учитываются `OMA_YES=1` и `CI=true`); `oma update --ci` — для простого неинтерактивного вывода |
| Получить JSON | `--json`, `--output json` или `OH_MY_AG_OUTPUT_FORMAT=json`. Исключения см. в разделе [Опции вывода](#output-options) |
| Работать с глобальной установкой | `-g` / `--global` или `OMA_INSTALL_GLOBAL=1`; `OMA_HOME` переносит корень глобального хранилища |
| Посмотреть результат до внесения изменений | `--dry-run`, если команда его перечисляет. См. [Какие команды поддерживают JSON](#commands-supporting-json-output) |
| Узнать флаги команды | `oma <command> --help`, `oma describe "<command>"` или [реестр](#complete-public-option-registry) в конце этой страницы |
| Исправить скрипт, сломавшийся после обновления | [Переименованные команды и опции](#renamed-commands-and-options) |
| Обрабатывать ошибки в скрипте по-разному | [Коды выхода](#exit-codes) |

---

## Глобальные опции {#global-options}

Эти опции доступны в корневой команде `oma` / `oh-my-agent`:

| Флаг | Описание |
|:-----|:-----------|
| `-g, --global` | Работает с глобальной установкой OMA (`~/.oma/.agents/` или `$OMA_HOME/.agents/`) вместо `<cwd>/.agents/` |
| `-y, --yes` | Пропускает интерактивные запросы, если выбранная команда поддерживает подтверждение; проверки безопасности, специфичные для команды, по-прежнему выполняются. Также учитывает `OMA_YES=1` и `CI=true` |
| `-V, --version` | Выводит номер версии и завершает работу |
| `-h, --help` | Показывает справку по команде |

Все подкоманды также поддерживают `-h, --help` для вывода собственной справки.

`--global` задаёт корень установки для всего процесса, поэтому `install`, `update`, `link` и `uninstall` работают с глобальной установкой независимо от текущего каталога:

| Режим | Как выбрать | Расположение `.agents/` |
|:-----|:-----------------|:--------------------|
| Проектный (по умолчанию) | ничего не указывать | `<cwd>/.agents/` |
| Глобальный | `--global` или `OMA_INSTALL_GLOBAL=1` | `$OMA_HOME/.agents/` (по умолчанию `~/.oma/.agents/`) |

`OMA_HOME=<abs-path>` меняет корень глобального хранилища; путь должен быть абсолютным. Проектные установки по-прежнему используют cwd. Запустите `oma home --json`, чтобы увидеть разрешённые расположения, и `oma home migrate --dry-run`, чтобы заранее просмотреть миграцию устаревших данных. См. [Глобальная установка](../guide/global-install.md).

---

## Переименованные команды и опции {#renamed-commands-and-options}

Пути команд разделяются пробелами, а не двоеточиями, и ряд команд и опций переименован. Старые формы записи отклоняются, а не работают как алиасы:

- Старая команда завершается ошибкой `Unknown command: ... Use oma --help.` или `Unexpected argument for oma <group>. Use oma <replacement>.`
- Голые имена групп `dashboard`, `state` и `stats` теперь выводят справку группы, а не выполняют действие.
- Старая опция завершается ошибкой `Removed option <old>. Use <new>.`; удалённые флаги действий `state` и `stats` завершаются ошибкой `Removed option <old>. Use an explicit action; see oma --help.`

Разрешаются только `schedule:run` и `serena daemon:gc`, чтобы записи планировщика ОС, созданные старыми версиями, продолжали работать.

| Старая команда | Что использовать теперь |
|:------------|:--------|
| любой путь с двоеточием `a:b` (`agent:spawn`, `state:emit`, ...) | путь через пробел (`agent spawn`, `state emit`) |
| `dashboard`, `dashboard:web` | `dashboard terminal`, `dashboard web` |
| `hook --vendor ...` | `hook run --vendor ...` |
| `intel run` | `intel suggest` |
| `state`, `state:get <id>` | `state list`, `state get <id>` |
| `state --activate` / `--archive` / `--purge` | `state activate` / `state archive` / `state purge` |
| `state:required-decisions` | `state decisions list` |
| `state:inject-log ... --entry <file>` | `state inject-log list`, `state inject-log get <session-id> <file>` |
| `stats`, `stats --reset` | `stats get`, `stats reset` |
| `memory:retry-drain` | `memory retry drain` |
| `vault rm` | `vault delete` |
| `search api <url>`, `search rss <url>` | `search api fetch <url>`, `search rss fetch <url>` |
| `search api:search`, `search rss:google` | `search api search`, `search rss google` |
| `skills audit` / `lint` / `eval` / `promotions` / `rollback` / `procedure` / `meta-optimize` / `evolution-stats` / `matrix` | `skill ...` (в единственном числе) |
| `skills opt` | `skill optimize` |
| `slide new`, `slide viewer` | `slide create`, `slide preview` |
| `slide pdf` / `png` / `pptx` | `slide export pdf` / `png` / `pptx` |
| `slide import-pptx`, `slide fetch-video`, `slide styles ...` | `slide import pptx`, `slide asset fetch-video`, `slide style ...` |
| `image list-vendors`, `video list-providers` | `image vendor list`, `video provider list` |
| `schedule:add`, `schedule:remove` | `schedule create`, `schedule delete` |
| `verify <agent-type>` | `verify agent <agent-type>` |

| Старая опция | Что использовать теперь |
|:-----------|:--------|
| `-m, --model <vendor>` | `--vendor <vendor>` |
| `-r, --root <path>` | `--project-root <path>` |
| `--sid`, `--session` | `--session-id <id>` |
| `--format <fmt>` | `--output <format>` (`search media --format` не изменился) |
| `--out <dir>`, `--out-dir` | `--output-dir <path>` |
| `--out <file>`, `--out-file` | `--output-file <path>`; `--report-file <path>` в `slide validate` и `explain validate` |
| `--dir` | `--workspace <path>` в командах `slide`, `--output-dir <path>` в `slide create`, `--input-dir <path>` в `explain validate` |
| `--max` | `--limit <n>` в `scholar search` |
| `--allow-external-out` | `--allow-external-output` |
| `--timeout <seconds>`, `--timeout <ms>`, `--timeout-minutes` | `--timeout <duration>` (`30s`, `2m`). Единица измерения обязательна там, где старое значение задавалось в миллисекундах или минутах |
| `--max-age-days` | `--max-age <duration>`; `--expires-after <duration>` в `schedule create` |

---

## Опции вывода {#output-options}

Многие команды поддерживают машиночитаемый вывод для CI/CD-пайплайнов и автоматизации. Запросить JSON-вывод можно тремя способами.

### 1. Флаг --json {#1---json-flag}

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

Флаг `--json` доступен только в тех путях команд, где он явно указан. Не делайте выводов о поддержке по семейству команд: например, конечные подкоманды `image`, `video` и `slide` предоставляют `--output` там, где это указано в реестре, а `search` всегда выводит JSON.

### 2. Флаг --output {#2---output-flag}

```bash
oma stats get --output json
oma doctor --output text
```

В большинстве команд `--output` принимает `text` или `json`. Он работает так же, как `--json`, но также позволяет явно запросить текстовый вывод, что полезно, когда переменная окружения задана как `json`.

**Проверка:** При недопустимом формате CLI выбрасывает ошибку: `Invalid output format: {value}. Expected one of text, json`.

### 3. Переменная окружения OH_MY_AG_OUTPUT_FORMAT {#3-oh_my_ag_output_format-environment-variable}

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Задайте этой переменной окружения значение `json`, чтобы JSON стал форматом по умолчанию в командах, которые его поддерживают. Распознаётся только `json`; любое другое значение игнорируется, и вывод остаётся текстовым.

### Как выбирается формат {#how-the-format-is-chosen}

Флаг в командной строке имеет приоритет над переменной окружения. Одновременная передача `--json` и `--output` с форматом, отличным от JSON, — это ошибка, а не правило приоритета.

| Что вы передаёте | Переменная не задана | `OH_MY_AG_OUTPUT_FORMAT=json` |
|:---------|:---------------|:------------------------------|
| ничего | text | JSON |
| `--json` или `--output json` | JSON | JSON |
| `--output text` | text | text |
| `--json --output text` | ошибка: `--json conflicts with --output. Choose one output format.` | та же ошибка |

Некоторые команды используют собственные значения формата:

| Команды | Управление форматом |
|:---------|:---------------|
| `search ...` | Всегда JSON; `--pretty` только добавляет отступы. `search providers` и `search web` также принимают `--json` |
| `describe` | Всегда JSON |
| `image ...`, `video ...` | `--output text\|json` (по умолчанию `text`) |
| `slide validate` | `--output json\|concise` (по умолчанию `concise`) |
| `explain validate` | `--output concise\|json` (по умолчанию `concise`) или `--json` |
| `hook probe` | `--output text\|md\|json` |

### Какие команды поддерживают JSON {#commands-supporting-json-output}

Каждая команда, принимающая `--json` или `--output`, сообщает `supportsJsonOutput: true` в `oma describe`, а [реестр](#complete-public-option-registry) в конце этой страницы перечисляет флаги для каждого пути. Команды, которые всегда выводят JSON без флага (`describe` и большинство подкоманд `search`), не отмечены. Чтобы получить список путей из CLI:

```bash
oma describe | jq -r '.. | objects | select(.supportsJsonOutput? == true) | .path'
```

Аналогично используйте `select(.supportsDryRun? == true)`, чтобы найти команды с `--dry-run`.

---

## Опции отдельных команд {#per-command-options}

### install

```text
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

Интерактивный установщик записывает выбранные настройки провайдеров в `.agents/oma-config.yaml`. Если существует `.agents/oma-config.cue`, он имеет приоритет над этим файлом, поэтому значения, которых ещё нет в CUE-конфигурации, записываются в игнорируемый git локальный оверлей `.agents/oma-config.local.yaml`. Тому же правилу следуют выбор браузерных DevTools и ссылка на хранилище из `oma memory keys`, а выбор CLI-вендоров и `oma model propose --write` — когда `oma-config.yaml` отсутствует. Флаги провайдеров выбирают интеграции веб-поиска, code intelligence и семантической памяти; `--honcho-url` и `--honcho-workspace` настраивают сервис памяти Honcho, если выбран этот провайдер. Корневой флаг `-y, --yes` действует, когда процесс установки запрашивает подтверждение.

### doctor

```text
oma doctor [--json] [--output <format>] [--profile] [--heal-check <agentType>]
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--json` | Выводит JSON вместо форматированного текста. | `false` |
| `--output <format>` | Явный формат вывода (`text` или `json`). См. [Опции вывода](#output-options). | `text` |
| `--profile` | Показывает матрицу состояния профилей (разрешённый slug модели, CLI и статус аутентификации для каждого агента с учётом активного `model_preset` и переопределений `agents:`). См. [Модели по агентам](../guide/per-agent-models.md). | `false` |
| `--heal-check <agentType>` | Добавляет проверку шлюза самовосстановления для агента. | |

С `--json` отчёт содержит поля верхнего уровня `ok` и `issues`, а `doctor` завершается с кодом `1`, если `issues` больше нуля.

### update

```text
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

```text
oma stats get [--json | --output <format>]
oma stats reset [--json | --output <format>]
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--json` | Выводит JSON. `stats get` печатает объект метрик; `stats reset` печатает `{"reset":true}`. | `false` |
| `--output <format>` | Выводит `text` или `json`. | `text` |

Сброс выполняет команда `oma stats reset`; `oma stats get --reset` завершается ошибкой `Removed option --reset`.

:::note
`stats get` не только читает данные. Каждый вызов засчитывается как сессия и добавляет diff последних 10 коммитов к накопительным счётчикам файлов и строк в `.agents/state/metrics.json`, поэтому не опрашивайте её периодически.
:::

### retro

```text
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--interactive` | Устаревший пошаговый ввод: спрашивает, что вы сделали, ключевые выводы и следующие шаги. Игнорирует окно, `--compare` и `--json`. | `false` |
| `--compare` | Сравнивает текущее временное окно с предыдущим окном той же длины. Показывает изменения метрик (например, коммиты +12, добавленные строки -340). | `false` |

**Формат аргумента окна:** число, за которым следует `h`, `d` или `w`.
- `24h`: 24 часа
- `7d`: 7 дней
- `2w`: 2 недели
- Не указывайте, чтобы использовать значение по умолчанию (7 дней)

Месяцы не поддерживаются: `oma retro 1m` завершается ошибкой `Invalid window: 1m. Use: 24h, 7d, 14d, 30d, 2w`.

### cleanup

```text
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

```text
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | — | Связывает повторную попытку с ID предшествующего запуска. | |
| `--fallback-vendors` | — | Явная упорядоченная цепочка fallback-вендоров через запятую. | |
| `--task-id` | — | ID задачи из плана сессии. | ID агента |
| `--vendor` | — | Переопределение CLI-вендора. `--help` перечисляет `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` и `pi`. | Определяется из конфигурации |
| `--workspace` | `-w` | Рабочий каталог агента. Если не указан или равен `.`, CLI автоматически определяет рабочее пространство по конфигурационным файлам монорепозитория (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Определяется автоматически или `.` |
| `--isolation` | — | Режим изоляции: `worktree` создаёт отдельный git worktree для каждого запуска; по умолчанию — `none`. | `none` |
| `--read-only` | — | Ограничивает запущенного агента неразрушающими инструментами и отключает флаги автоподтверждения. | `false` |

**Проверка:**
- `agent-id` и `session-id` не должны содержать `..`, `?`, `#`, `%` или управляющие символы. У `agent spawn` нет фиксированного списка ID агентов; маршрутизация моделей и вендоров распознаёт `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` и `explore`, а также алиасы, например `backend-engineer`, `qa-reviewer` и `research-explorer`.
- `--vendor` должен быть ID вендора oma: `antigravity`, `claude`, `codex`, `commandcode`, `copilot`, `cursor`, `grok`, `hermes`, `kimi`, `kiro`, `opencode`, `pi`, `qwen` или `zcode`. Таблица ниже охватывает восемь вендоров, которые называет `--help`.

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

```text
oma agent status <session-id> [agent-ids...] [--project-root <path>]
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--project-root <path>` | Проект, из которого читаются реестр запусков агентов и файлы `.agents/state/memories/result-{agent}.md`. `-r` и `--root` удалены и завершаются ошибкой `Removed option -r. Use --project-root.` | Текущий рабочий каталог |

Команда печатает по одной строке `{agent-id}:{status}` для каждого запрошенного агента. Для каждого агента используется первый существующий источник:

```mermaid
flowchart TD
  start["agent status SESSION AGENT"] --> reg{"Run for this session and agent in the agent-run registry?"}
  reg -->|yes| regStatus["Registry status, downgraded to failed or stale"]
  reg -->|no| result{"result-AGENT.md exists?"}
  result -->|yes| legacy["legacy-STATUS, or unverified without a header"]
  result -->|no| statusFile{"subagent-SESSION-AGENT.status in the OS temp dir?"}
  statusFile -->|yes| exited["legacy-completed, or the status in the file"]
  statusFile -->|no| pidFile{"subagent-SESSION-AGENT.pid alive?"}
  pidFile -->|yes| running["running"]
  pidFile -->|"no, or no PID file"| crashed["crashed"]
```

| Статус | Значение |
|:-------|:--------|
| `running`, `completed`, `partial`, `blocked`, `failed` | Статус, записанный в реестре запусков агентов |
| `failed` | Также сообщается, если зарегистрированный запуск находится в состоянии `running`, но его процесс-исполнитель уже завершён |
| `stale` | Зарегистрированный запуск в состоянии `completed`, но evidence его результата больше не проходит проверку |
| `legacy-<status>` | Зарегистрированного запуска нет; `result-{agent}.md` содержит заголовок `## Status: <status>` |
| `unverified` | Зарегистрированного запуска нет; в `result-{agent}.md` нет заголовка статуса |
| `legacy-completed` | Нет ни запуска, ни файла результата; файл `.status` сессии содержит `completed` (любое другое значение печатается как есть) |
| `crashed` | Ничего не найдено, либо устаревший PID-файл указывает на завершившийся процесс |

О том, как записываются запуски, см. [Результаты агентов и возобновление](../guide/agent-results-and-resume.md).

### agent parallel

```text
oma agent parallel [tasks...] [--session-id <id>] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:--------|
| `--session-id <id>` | — | ID сессии для всех запускаемых агентов. Передайте тот же ID в `oma agent status`. | Имя каталога запуска, `parallel-<timestamp>-<suffix>` |
| `--vendor` | — | Переопределение CLI-вендора для всех запускаемых агентов. | Определяется для каждого агента из конфигурации |
| `--inline` | `-i` | Интерпретирует аргументы задач как строки `agent:task[:workspace]`, а не как путь к файлу. | `false` |
| `--no-wait` | | Фоновый режим. Запускает всех агентов и сразу возвращает управление, не дожидаясь завершения. Список PID и журналы сохраняются в `.agents/results/parallel-<timestamp>-<suffix>/`. | `false` (ожидает завершения) |

**Формат инлайн-задачи:** `agent:task` или `agent:task:workspace`
- Рабочее пространство определяется проверкой: начинается ли последний сегмент, отделённый двоеточием, с `./` или `/` либо равен ли он `.`.
- Пример: `backend:Implement auth API:./api` -- agent=backend, task="Implement auth API", workspace=./api.
- Пример: `frontend:Build login page` -- agent=frontend, task="Build login page", workspace определяется автоматически.

**Формат YAML-файла задач:**

```yaml
tasks:
  - id: api            # optional; default <agent>-<index>
    agent: backend
    task: "Implement user API"
    workspace: ./api   # optional; auto-detected when omitted
  - agent: frontend
    task: "Build user dashboard"
```

### recap

```text
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--window <period>` | Временное окно в виде `<n>h`, `<n>d` или `<n>w` (например, `1d`, `3d`, `7d`, `2w`, `30d`). Значения больше 30 дней ограничиваются 30 днями с предупреждением. Игнорируется, если задан `--date`. | `1d` |
| `--date <date>` | Конкретная дата (`YYYY-MM-DD`). Имеет приоритет над `--window`. | |
| `--tool <tools>` | Фильтрует сессии по инструменту. Значения через запятую: `antigravity`, `claude`, `codex`, `cursor`, `gemini`, `grok`, `qwen`. | все инструменты |
| `--top <n>` | Показывает в сводке только топ-N проектов/тем. | без ограничений |
| `--sort <metric>` | Сортирует сессии по `count` или `duration`. | `count` |
| `--mermaid` | Выводит диаграмму Ганта Mermaid вместо стандартной сводки. `--json` имеет приоритет. | `false` |
| `--graph` | Открывает интерактивный граф в веб-дашборде (`/recap`). Имеет приоритет над `--mermaid` и `--json`. | `false` |

### search

```text
oma search <subcommand> [...]
```

Каждая подкоманда `search` пишет JSON в stdout без каких-либо флагов; `providers` и `web` также принимают `--json`. Ни одна из них не принимает `--output`. `--pretty` меняет только отступы.

| Подкоманда | Основные опции |
|:-----------|:---------------|
| `providers` | `--json`, `--pretty` |
| `web <query>` | `--provider <id>`, `--limit <n>` (по умолчанию `10`), `--timeout <duration>` (по умолчанию `15s`), `--json`, `--pretty` |
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout <duration>` (по умолчанию `15s`), `--locale`, `--pretty` |
| `meta <url>` / `archive <url>` / `api fetch <url>` / `rss fetch <url>` | `--timeout <duration>` (по умолчанию `15s`), `--locale` (по умолчанию `en-US,en;q=0.9`), `--pretty` |
| `api search <query>` | `--platforms <list>`, `--timeout <duration>`, `--locale`, `--pretty` |
| `rss google <query>` | `--locale` (по умолчанию `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (по умолчанию `en`), `--format <spec>`, `--timeout <duration>` (по умолчанию `30s`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (по умолчанию `github`), `--language`, `--repo`, `--limit` (по умолчанию `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | нет (выполняет проверку бинарных файлов Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

`search` использует общую шкалу кодов выхода; см. [Коды выхода](#exit-codes).

### image

```text
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

`image doctor` и `image vendor list` принимают `--output <text|json>`. Для обнаружения вендоров используйте `image vendor list`; старая форма записи `image list-vendors` завершается ошибкой.

### video

```text
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` принимает параметры планирования и захвата `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` и `--capture-stop`. Также поддерживаются `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output` и `--no-brief-in-manifest`. Для захвата из браузера используется `--source web --url <url>`; источник по умолчанию — `file`. Обычный рендер требует созданной composition и работающего compositor; placeholder допускается только в тестовом пути `OMA_VIDEO_MOCK=1`.

`video doctor` сообщает о состоянии toolchain HyperFrames/MPT/Strudel или подготавливает её. `compose` готовит контракт composition для запуска, а `render` выполняет lint, рендер и probe результата. `provider list` сообщает статус провайдеров и ключей. Manifest запуска и последовательность восстановления описаны в руководстве [Генерация видео](../guide/video-generation.md).

### memory init

```text
oma memory init [--json] [--output <format>] [--force]
```

| Флаг | Описание | По умолчанию |
|:-----|:-----------|:--------|
| `--force` | Перезаписывает пустые или существующие файлы схемы в `.agents/state/memories/`. Без этого флага существующие файлы не затрагиваются. | `false` |

### verify

```text
oma verify agent <agent-type> [-w <workspace>] [--session-id <id>] [--task-id <id>] [--run-id <id>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Флаг | Короткая форма | Описание | По умолчанию |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Путь к каталогу рабочего пространства для проверки. | Текущий рабочий каталог |
| `--session-id <id>` | | Выбирает план сессии и отчёты. Обязателен, если существует несколько планов, кроме случая, когда сессию определяет квитанция запуска. | |
| `--task-id <id>` | | Выбирает область и отчёт одной задачи. Требует `--session-id` или `--run-id`. | |
| `--run-id <id>` | | Выбирает отчёт конкретного запуска. Сессия и задача определяются по локальной квитанции; если её нет, укажите оба ID явно. | |

**Типы агентов:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers` измеряет точность keyword-detector на размеченном корпусе. Процентные пороги работают как шлюзы; если CI-задаче нужно разобрать отдельные находки, используйте JSON-вывод. Старая форма записи `oma verify <agent-type>` завершается ошибкой; используйте `verify agent <agent-type>`.

---

## Коды выхода {#exit-codes}

**Общая шкала (`image`, `video`, `search`):**

| Код | Значение |
|:-----|:--------|
| `0` | успех |
| `1` | общая ошибка |
| `2` | заблокировано или отказ провайдера по соображениям безопасности |
| `3` | не найдено |
| `4` | недопустимые входные данные |
| `5` | требуется аутентификация или бинарный файл провайдера не установлен |
| `6` | тайм-аут |

**Коды отдельных команд:**

| Команда | Коды |
|:--------|:------|
| `doctor --json` | `0` проблем нет, `1` найдена одна или несколько проблем |
| `verify agent` | `0` все проверки пройдены, `1` проверка не пройдена или тип агента недопустим, `2` рабочее пространство не найдено |
| `verify triggers` | `0` в пределах порогов, `1` порог превышен |
| `docs verify` | `1` найдены сломанные ссылки |
| `vault get` | `1` недопустимое имя ключа, `2` такой записи нет |

---

## Практические примеры {#practical-examples}

### CI-пайплайн: обновление и проверка {#ci-pipeline-update-and-verify}

```bash
# Update in CI mode, then fail the job when doctor reports any issue
oma update --ci
oma doctor --json | jq -e '.ok' > /dev/null
```

### Пакетный запуск агентов с мониторингом состояния {#batch-agent-execution-with-status-monitoring}

```bash
# Choose the session ID first and pass it to both commands
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent parallel tasks.yaml --session-id "$SESSION_ID" --no-wait

# Check status every 5 seconds
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
# Without `watch` (stock macOS), loop instead:
# while sleep 5; do oma agent status "$SESSION_ID" backend frontend mobile; done
```

### Очистка в CI после тестов {#cleanup-in-ci-after-tests}

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Проверка с учётом рабочего пространства {#workspace-aware-verification}

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Ретро со сравнением для обзора спринта {#retro-with-comparison-for-sprint-reviews}

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare
```

### Полный скрипт проверки состояния {#full-health-check-script}

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== oh-my-agent Health Check ==="

report="$(mktemp)"
# doctor exits 1 when it finds issues; keep the report and continue
oma doctor --json > "$report" || true

# Check CLI installations
jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version // "unknown"))" else "MISSING" end)"' "$report"
jq -r '"Issues: \(.issues)"' "$report"

# Check auth status (an object of booleans keyed by github and each vendor ID)
oma auth status --json | jq -r 'to_entries[] | "\(.key): \(if .value then "authenticated" else "not authenticated" end)"'

echo "=== Done ==="
```

### Describe для интроспекции агента {#describe-for-agent-introspection}

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```

---

## Полный реестр публичных опций {#complete-public-option-registry}

Каждая строка — это путь команды, который выполняется самостоятельно; группы, которые только выводят справку, опущены, а общие корневые флаги описаны в разделе [Глобальные опции](#global-options). Значения по умолчанию указаны рядом с опцией. Запустите `oma describe "<path>"`, чтобы получить полный JSON для одного пути.

:::note
Эта таблица сгенерирована из `oma describe`. Не редактируйте её вручную: запустите `node cli/scripts/generate-cli-reference.mjs`, чтобы пересоздать её, или добавьте `--check`, чтобы получить ошибку, если она устарела.
:::

<!-- oma:generated cli-registry:start -->

| Command | Arguments | Options | Description |
|:--|:--|:--|:--|
| `agent begin` | `<agent-id> <task-id> <session-id>` | `--project-root <path>`, `-w, --workspace <path>` | Start an evidence-backed native agent run |
| `agent context` | `<agent-id>` | `--project-root <path>`, `--difficulty <level>` (default: `Medium`) | Load graph-selected context for a native dispatch prompt |
| `agent finish` | `<run-id> <result-file>` | `--project-root <path>` | Validate a native agent result against its verification receipts |
| `agent parallel` | `[tasks...]` | `--session-id <id>`, `--vendor <vendor>`, `-i, --inline`, `--no-wait` | Run multiple sub-agents in parallel |
| `agent resume` | `<session-id>` | `--project-root <path>`, `--dry-run`, `--max-attempts <count>` (default: `3`) | Resume safe incomplete tasks, reusing current acceptance evidence |
| `agent review` | — | `--vendor <vendor>`, `-p, --prompt <prompt>`, `-w, --workspace <path>`, `--no-uncommitted` | Run code review using external CLI (codex/claude/qwen/grok) |
| `agent spawn` | `<agent-id> <prompt> <session-id>` | `--resumed-from <run-id>`, `--fallback-vendors <vendors>`, `--task-id <id>`, `--vendor <vendor>`, `-w, --workspace <path>`, `--isolation <mode>`, `--read-only` | Spawn a subagent (prompt can be inline text or a file path) |
| `agent status` | `<session-id> [agent-ids...]` | `--project-root <path>` (default: current directory) | Check status of subagents |
| `agent verify` | `<run-id> [command...]` | `--project-root <path>`, `--required`, `--affected <paths...>` | Execute verification argv after -- and record its real exit code |
| `auth status` | — | `--json`, `--output <format>` | Check authentication status of all supported CLIs |
| `bridge` | `[url]` | `--context <name>` (default: `ide`), `--oma-home <path>`, `--oma-state-home <path>` | Proxy MCP stdio to a shared per-project Serena server (started on demand) |
| `cleanup` | — | `--dry-run`, `-y, --yes`, `--json`, `--output <format>` | Clean up orphaned subagent processes and temp files |
| `dashboard terminal` | — | `--project-root <path>` | Start terminal dashboard (real-time agent monitoring) |
| `dashboard web` | — | `--project-root <path>` | Start web dashboard on http://127.0.0.1:9847 |
| `describe` | `[command-path]` | — | Describe CLI commands as JSON for runtime introspection |
| `diagram archify` | `[args...]` | — | Run the installed archify CLI (doctor \| guide \| validate \| deliver \| visual-check …) with update checks disabled |
| `diagram resolve` | — | `--engine <engine>`, `--refresh`, `--offline`, `--json`, `--output <format>` | Report which diagram engine workflows should use, and where archify lives |
| `diagram update` | — | `--json`, `--output <format>` | Download the latest archify release into oma's managed cache (~/.cache/oma-diagram/archify) |
| `docs i18n` | — | `--json`, `--min-severity <level>` (default: `MEDIUM`) | Detect drift between English source docs (web/docs) and i18n translations (web/i18n/{lang}/...). Emits structural signals (line count, heading count, last-commit timestamp) per pair so the host LLM can decide which translations need a diff-sync patch. The CLI never edits translations. |
| `docs lint` | — | `--json`, `--locales <list>` | Lint translated docs for content-level anti-patterns (em-dashes in CJK targets, etc.). Complements `oma docs i18n` (structural drift) with style/anti-pattern checks per oma-translation SKILL.md § Stage 4. The CLI never auto-fixes — it only reports issues for the host LLM to restructure. |
| `docs sync` | `[diff-range]` | `--json` | Given a git diff, list docs that reference changed files. The host LLM (skill runtime) is expected to read this list plus the diff and propose patches per the SKILL.md contract — the CLI never auto-edits docs. Default diff-range: --cached (staged changes), fallback to HEAD~1..HEAD. |
| `docs verify` | `[path]` | `--json`, `--report-file <path>`, `--no-urls`, `--urls-sync` | Extract file, link, and script references from docs and report broken targets. Regenerates docs/generated/doc-refs.json as a side effect. Exit code: 0 = clean, 1 = broken refs found. URL link checking is delegated to `lychee` (install: brew install lychee). |
| `doctor` | — | `--profile`, `--heal-check <agentType>`, `--json`, `--output <format>` | Check CLI installations, MCP configs, and skill status |
| `emit` | — | `--target <target>` (default: `all`), `--output-dir <path>` (default: `.`), `--json`, `--output <format>` | Emit standards-conformant artifacts from the .agents/ SSOT (Agent Skills spec, Agent Plugins package, Claude Code plugin marketplace, AGENTS.md, cli/AGENTS.md) |
| `explain components` | `[name]` | `--json`, `--output <format>` | List the components a draft can use, or print one component's syntax |
| `explain lint` | `[file]` | `--style <level>`, `--lang <code>`, `--json`, `--output <format>` | Check the prose of a draft (file or stdin) without rendering |
| `explain patch` | `<html> [file]` | `--panel <id>`, `--open`, `--json`, `--output <format>` | Replace one panel of a rendered page from its embedded draft (new panel from file or stdin) |
| `explain render` | `[file]` | `--output-file <path>`, `--template <name>`, `--theme <name>`, `--mode <mode>`, `--style <level>`, `--lang <code>`, `--archify`, `--no-archify`, `--open`, `--json`, `--output <format>` | Render a Markdown draft (file or stdin) into one self-contained HTML explanation |
| `explain validate` | `[file]` | `--input-dir <path>`, `--output <format>` (default: `concise`), `--report-file <path>`, `--json` | Validate self-contained explain HTML report artifacts |
| `goal set` | — | `--workflow <name>`, `--session-id <id>`, `--gate <keyword>`, `--budget-minutes <n>`, `--description <text>`, `--json`, `--output <format>` | Attach a goal contract (deterministic stop gate / wall-clock budget) to an active persistent workflow |
| `harness eval` | — | `--suite <path>`, `--candidate <path>`, `--partition <name>` (default: `validation`), `--mock`, `--action <mode>`, `--transcript <path>`, `--live`, `--record`, `--record-file <path>`, `--yes`, `--timeout <duration>` (default: `15m`), `--require-coverage`, `--json`, `--output <format>` | Compare a candidate .agents overlay with the current baseline |
| `harness evolution disable` | — | `--json`, `--output <format>` | Disable harness evolution and remove its scheduled job |
| `harness evolution enable` | — | `--max-dispatches <n>`, `--cron <expr>` (default: `0 3 * * *`), `--mode <mode>` (default: `apply`), `--json`, `--output <format>` | Enable scheduled harness evolution with a dispatch budget |
| `harness evolution run` | — | `--scheduled`, `--json`, `--output <format>` | Run one harness evolution tick now |
| `harness evolution status` | — | `--json`, `--output <format>` | Show the evolution config, schedule, pending retries, and overlay conflicts |
| `harness feedback` | — | `--live`, `--apply`, `--max-epochs <n>` (default: `1`), `--incident <ids...>`, `--scan-runs`, `--json`, `--output <format>` | Promote captured incidents to skill fixtures and optimize the affected skills |
| `harness incident capture` | — | `--spec <path>`, `--run <id>`, `--json`, `--output <format>` | Record a failure from an incident spec as a captured incident |
| `harness incident export` | `<id>` | `--json`, `--output <format>` | Export a captured incident as a one-task eval suite |
| `harness incident promote` | `<id>` | `--skill <id>`, `--draft`, `--force`, `--json`, `--output <format>` | Turn a captured incident into a regression fixture for a skill |
| `harness incident reproduce` | `<id>` | `--candidate <path>`, `--action <mode>`, `--record-file <path>`, `--transcript <path>`, `--record`, `--yes`, `--timeout <duration>` (default: `15m`), `--json`, `--output <format>` | Inspect, rescore, replay, or rerun a captured incident against a candidate |
| `harness incident scan` | — | `--limit <n>`, `--skeleton <run-id>`, `--json`, `--output <format>` | List failed, blocked, or partial agent runs that no captured incident references yet |
| `harness incident show` | `<id>` | `--json`, `--output <format>` | Show a captured incident and its provenance |
| `help` | — | — | Show help information |
| `home` | — | `--json`, `--output <format>` | Inspect and migrate OMA global storage |
| `home migrate` | — | `--dry-run`, `--json`, `--output <format>` | Copy legacy OMA global files; preserve originals |
| `hook probe` | — | `--vendor <list>`, `--output <format>` (default: `text`), `--hooks-dir <dir>` | Probe per-vendor L1 hook compatibility and print a matrix |
| `hook run` | — | `--vendor <v>`, `--event <e>`, `--matcher <m>` | Dispatch a vendor hook event through the centralised oma hook router |
| `image doctor` | — | `--output <format>` (default: `text`) | Check authentication and install status per vendor |
| `image generate` | `<prompt...>` | `--vendor <name>` (default: `auto`), `--size <size>`, `--quality <level>`, `-n, --count <n>`, `--output-dir <path>`, `--allow-external-output`, `--model <name>`, `--timeout <duration>`, `-r, --reference <path>`, `-y, --yes`, `--no-prompt-in-manifest`, `--dry-run`, `--output <format>` (default: `text`) | Generate images via pollinations (flux/zimage, free), codex (gpt-image-2, ChatGPT OAuth), or antigravity (gemini nano-banana via `agy` CLI, free with Gemini Code Assist sign-in) |
| `image vendor list` | — | `--output <format>` (default: `text`) | List registered vendors and supported models |
| `install` | — | `--web-search <provider>`, `--code-intelligence <provider>`, `--semantic-memory <provider>`, `--honcho-url <url>`, `--honcho-workspace <id>` | Install oh-my-agent skills and configurations |
| `intel suggest` | — | `--config <path>`, `--topic <topic>`, `--target <target>`, `--repos <repos>`, `--since <window>`, `--last-commits <n>`, `--output-dir <path>`, `--dry-run`, `--fixture <path>`, `--create-issue`, `--base-repo <owner/name>`, `--yes`, `--json`, `--output <format>` | Suggest high-value product work from market/code intelligence |
| `link` | `[vendors...]` | `--dry-run` | Regenerate vendor files (.claude/, .cursor/, etc.) from .agents/ SSOT |
| `market detect-trap` | `<topic>` | `--force` | Preflight check that refuses keyword-trap queries |
| `market resolve` | — | `--refresh`, `--offline`, `--json`, `--output <format>` | Report the last30days engine oma will run (managed latest, pin, or local copy) and the Python it uses |
| `market run` | `[args...]` | — | Run the last30days engine (scripts/last30days.py) with the given arguments; --save-dir defaults to market.save_dir |
| `market update` | — | `--json`, `--output <format>` | Download the latest last30days release into oma's managed cache (~/.cache/oma-market/last30days) |
| `memory daemon restart` | — | `--port <port>` (default: `3111`), `--dry-run`, `--json`, `--output <format>` | Restart the OMA-owned AgentMemory daemon |
| `memory daemon start` | — | `--port <port>` (default: `3111`), `--dry-run`, `--json`, `--output <format>` | Start AgentMemory in the background |
| `memory daemon status` | — | `--json`, `--output <format>` | Show daemon status |
| `memory daemon stop` | — | `--dry-run`, `--json`, `--output <format>` | Stop the OMA-owned AgentMemory daemon |
| `memory gc` | — | `--scope <scope>` (default: `all`), `--keep <count>`, `--max-age <duration>`, `--dry-run`, `--json`, `--output <format>` | Garbage-collect project-local memory: prune old L1 sessions and ephemeral Serena files |
| `memory import` | — | `--source <source>` (default: `all`), `--since <since>` (default: `30d`), `--dry-run`, `--force-partial`, `--json`, `--output <format>` | Import vendor conversation history into AgentMemory |
| `memory init` | — | `--force`, `--json`, `--output <format>` | Initialize the coordination store in .agents/state/memories |
| `memory keys` | — | `--kind <kind>` (default: `connection`), `--profile <name>` (default: `oma`), `--key-env <name>` (default: `LLM_OPENAI_API_KEY`), `--from-env <name>`, `--dry-run`, `--json`, `--output <format>` | Configure Honcho connection or local embedding credentials |
| `memory maintain` | `<action>` | `--keep <count>` (default: `5`), `--dry-run`, `--json`, `--output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum |
| `memory maintain backup` | — | `--keep <count>` (default: `5`), `--dry-run`, `--json`, `--output <format>` | Back up AgentMemory local storage |
| `memory maintain prune` | — | `--keep <count>` (default: `5`), `--dry-run`, `--json`, `--output <format>` | Delete AgentMemory backups beyond --keep |
| `memory maintain vacuum` | — | `--keep <count>` (default: `5`), `--dry-run`, `--json`, `--output <format>` | Run SQLite VACUUM on AgentMemory storage |
| `memory retry drain` | — | `--dry-run`, `--json`, `--output <format>` | Drain queued semantic-memory deliveries |
| `memory service install` | — | `--port <port>` (default: `3111`), `--dry-run`, `--json`, `--output <format>` | Install AgentMemory launchd/systemd service integration |
| `memory service uninstall` | — | `--dry-run`, `--json`, `--output <format>` | Uninstall AgentMemory launchd/systemd service integration |
| `memory setup` | — | `--endpoint <url>`, `--port <port>`, `--install`, `--start`, `--dry-run`, `--json`, `--output <format>` | Prepare AgentMemory endpoint configuration |
| `memory status` | — | `--json`, `--output <format>` | Show selected semantic-memory provider health |
| `memory upgrade` | — | `--port <port>`, `--dry-run`, `--json`, `--output <format>` | Stop, backup, upgrade, restart, and health-check AgentMemory |
| `model check` | — | `--json`, `--fail-on-drift`, `--owner <name>`, `--probe` | Check model registry against live vendor model lists |
| `model probe` | `<slug>` | `--json`, `--timeout <duration>` | Probe a model slug against its vendor CLI to verify it is accepted |
| `model propose` | — | `--json`, `--owner <name>`, `--write`, `--timeout <duration>` | Run model:check --probe internally and generate an oma-config `models:` patch for accepted candidates |
| `profile create` | `<slot>` | `--json`, `--output <format>` | Create a local profile |
| `profile list` | — | `--json`, `--output <format>` | List local profiles |
| `profile run` | `<slot> <command> [args...]` | — | Run one command with OMA_PROFILE set for the child process |
| `profile show` | `[slot]` | `--json`, `--output <format>` | Show a local profile |
| `profile use` | `<slot>` | `--shell <shell>`, `--json`, `--output <format>` | Print shell code to activate an existing profile |
| `ralph verify` | — | `--session-id <id>`, `--newer-than <iso>`, `--no-emit`, `--json`, `--output <format>` | Verify ralph EXEC artifacts (anti-circumvention gate, ralph.md Step 1.3) |
| `recap` | — | `--window <period>` (default: `1d`), `--date <date>`, `--tool <tools>`, `--top <n>`, `--sort <metric>` (default: `count`), `--mermaid`, `--graph`, `--json`, `--output <format>` | Recap AI tool conversation history |
| `retro` | `[window]` | `--interactive`, `--compare`, `--json`, `--output <format>` | Engineering retrospective with metrics & trends |
| `schedule create` | `<agent-id> <prompt>` | `--cron <expr>`, `--every <phrase>`, `--vendor <vendor>`, `-w, --workspace <path>`, `--once`, `--expires-after <duration>`, `--env <keys>`, `--dry-run`, `--accept-rounded` | Register a scheduled agent job |
| `schedule delete` | `<id>` | — | Remove a scheduled job from manifest and OS scheduler |
| `schedule list` | — | `--json`, `--output <format>` | List scheduled jobs with OS drift state (synced/stale/missing-in-os/orphan-in-os), grouped by project |
| `schedule run` | `<id>` | `--oma-home <path>`, `--oma-state-home <path>`, `--registration <identity>` | Execute a scheduled job by id (invoked by OS scheduler; not normally called directly) |
| `schedule sync` | — | `--prune` | Re-sync manifest → OS scheduler (registers missing jobs, rewrites stale commands). Use --prune to remove orphan OS jobs. |
| `scholar get` | `<id>` | `--section <name>` | Fetch a sidecar (knows record_id) or work metadata (W-id, DOI, arXiv:&lt;id&gt;, CorpusId:&lt;n&gt;, S2 paperId) |
| `scholar lint` | `<file>` | `--lenient`, `--fail-on-warning` | Validate a .knows.yaml or .knows.json sidecar (v0.9.0) |
| `scholar resolve` | `<query...>` | — | Find best paper match across knows.academy, OpenAlex, Semantic Scholar |
| `scholar search` | `<query...>` | `--limit <n>` (default: `10`), `--year-min <year>`, `--always-fallback` | Search papers (knows.academy → OpenAlex → Semantic Scholar) |
| `search api fetch` | `<url>` | `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Fetch a URL through its matched platform API |
| `search api search` | `<query>` | `--platforms <list>`, `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Fan-out keyword search across platforms that support it |
| `search archive` | `<url>` | `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Fetch via AMP / archive.today / Wayback |
| `search code` | `<query>` | `--host <github\|gitlab>` (default: `github`), `--language <lang>`, `--repo <owner/repo>`, `--limit <n>` (default: `20`), `--pretty` | Search code via gh / glab |
| `search doctor` | — | — | Check dependencies (Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search fetch` | `<url>` | `--only <strategies>`, `--skip <strategies>`, `--include-archive`, `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Fetch URL via auto-escalating strategy pipeline |
| `search media` | `<url>` | `--subs`, `--sub-lang <list>` (default: `en`), `--format <spec>`, `--timeout <duration>` (default: `30s`), `--pretty` | Extract media metadata via yt-dlp (1858 sites) |
| `search meta` | `<url>` | `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Extract OGP / JSON-LD / Schema.org from URL |
| `search providers` | — | `--json`, `--pretty` | List registered search providers and inspect selection without network calls |
| `search rss fetch` | `<url>` | `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Discover and parse RSS/Atom feed for a URL |
| `search rss google` | `<query>` | `--locale <value>` (default: `en-US`) | Build Google News RSS URL for a query |
| `search trust` | `<domain>` | `--pretty` | Resolve trust level / score for a domain |
| `search web` | `<query>` | `--provider <id>`, `--limit <n>` (default: `10`), `--timeout <duration>` (default: `15s`), `--json`, `--pretty` | Search with the selected web provider (Brave has a CLI adapter) |
| `serena check` | — | `--project <path>` (default: `apps/mobile`), `--dart-sdk <path>`, `--timeout <duration>` (default: `60s`), `--staged` | Analyze a Dart package using the managed shared Serena LSP |
| `serena daemon gc` | — | `--quiet` | Stop shared Serena daemons with no clients after the idle grace period |
| `serena reap` | — | `--dry-run`, `--quiet` | Kill idle Serena LSP children to reclaim memory (Serena self-heals on next tool call) |
| `serena reaper disable` | — | `--dry-run` | Uninstall the periodic Serena Reaper scheduled task |
| `serena reaper enable` | — | `--dry-run` | Install the periodic Serena Reaper scheduled task (runs every 5 minutes) |
| `serena setup` | — | — | Repair the managed adapter and install the oma-dart-check compatibility launcher |
| `skill audit` | — | `--json`, `--output <format>` | Check frontmatter description similarity between installed skills |
| `skill eval` | — | `--skill <id>`, `--mock`, `--live`, `--record`, `--yes`, `--task-dir <path>`, `--max-tasks <n>`, `--trials <n>`, `--require-coverage`, `--neg-transfer`, `--routing`, `--json`, `--output <format>` | Measure per-skill utility lift (treatment vs baseline on held-out tasks) |
| `skill evolution-stats` | — | `--skill <id>`, `--json`, `--output <format>` | Aggregate recorded optimization runs: proposals, acceptance, verified improvements, rollbacks, by memory mode and procedure |
| `skill lint` | — | `--skill <id>`, `--json`, `--output <format>` | Detect per-skill authoring smells (frontmatter, structure, broken refs) |
| `skill matrix` | — | `--suite <path>`, `--project-root <path>`, `--skills <names>`, `--delivery <mode>` (default: `native`), `--vendors <ids>` (default: `claude,codex`), `--cases <ids>`, `--live`, `--yes`, `--timeout-seconds <n>` (default: `120`), `--claude-model <model>`, `--codex-model <model>`, `--report <path>`, `--json`, `--output <format>` | Test native skill discovery, references and output contracts across CLI vendors |
| `skill meta-optimize` | — | `--target <part>` (default: `optimizer`), `--skill <ids...>`, `--anchor <ids...>`, `--repeats <n>` (default: `3`), `--candidates <n>` (default: `2`), `--max-epochs <n>` (default: `1`), `--edits-per-epoch <k>` (default: `4`), `--live`, `--apply`, `--memory <mode>` (default: `none`), `--yes`, `--json`, `--output <format>` | Propose and score changes to the evolution procedure itself on held-out skills; promote only with a paired bootstrap interval above zero |
| `skill optimize` | — | `--skill <id>`, `--dry-run`, `--apply`, `--mock`, `--live`, `--max-epochs <n>` (default: `8`), `--edits-per-epoch <k>` (default: `4`), `--lr <chars>` (default: `600`), `--yes`, `--memory <mode>` (default: `recall`), `--json`, `--output <format>` | Optimize a skill's SKILL.md to maximize measured held-out utility lift |
| `skill procedure` | — | `--export`, `--json`, `--output <format>` | Show the evolution procedure (optimizer/maintainer prompts, constitution) and its hashes; --export writes editable defaults |
| `skill promotions` | — | `--skill <id>`, `--all`, `--json`, `--output <format>` | List recorded SKILL.md promotions and rollbacks for a skill, or every skill and the procedure with --all |
| `skill rollback` | — | `--skill <id>`, `--json`, `--output <format>` | Restore the SKILL.md body replaced by the most recent recorded promotion |
| `slide asset fetch-video` | `<url>` | `--workspace <path>`, `--output-name <name>` | Download video via yt-dlp into ./assets/ and print local ref |
| `slide bundle` | — | `--workspace <path>`, `--output-file <path>`, `--inline-fonts` | Merge per-slide files into a single self-contained .html deliverable |
| `slide create` | — | `--output-dir <path>` (default: `my-deck`), `--force` | Scaffold a new slide working directory with starter HTML, assets/, and meta.json |
| `slide doctor` | — | — | Probe required deps (chrome, puppeteer-core) and optional deps (yt-dlp, pptxgenjs) |
| `slide edit` | — | `--workspace <path>`, `--port <n>` (default: `0`) | Open browser bbox editor (node:http server at 127.0.0.1, dispatches to oma agent runner) |
| `slide export pdf` | — | `--workspace <path>`, `--output-file <path>`, `--mode <mode>` (default: `capture`) | Export slides to PDF via puppeteer-core |
| `slide export png` | — | `--workspace <path>`, `--output-dir <path>`, `--resolution <res>` (default: `1080p`) | Export each slide as a PNG image via puppeteer-core |
| `slide export pptx` | — | `--workspace <path>`, `--output-file <path>` | [EXPERIMENTAL] Export to PPTX via pptxgenjs (raster-backed, gradients rasterized) |
| `slide import pptx` | `<file>` | `--workspace <path>` | Import a .pptx file into slide fragments via officeparser (bunx, best-effort) |
| `slide preview` | — | `--workspace <path>` | Build viewer.html (deck-stage web component + speaker-notes panel, toggle with `n`) |
| `slide style get` | `<slug>` | `--refresh` | Fetch a bold template design.md (always-latest main; cached for offline fallback) |
| `slide style list` | — | — | List available style presets (vendored + bold-template index) |
| `slide style preview` | `<slug>` | — | Preview a style preset in the terminal |
| `slide validate` | — | `--workspace <path>`, `--output <format>` (default: `concise`), `--slide <file>`, `--report-file <path>` | Geometric quality gate — renders slides via puppeteer-core and checks overflow/overlap/font-size |
| `star` | — | — | Star oh-my-agent on GitHub |
| `state activate` | `<session-id>` | `--category <category>` (default: `main`), `--archived`, `--all-projects`, `--project <project>`, `--search <text>`, `--older-than <duration>` (default: `90d`), `--dry-run`, `--json`, `--output <format>` | Set the active session for a category |
| `state archive` | — | `--category <category>` (default: `main`), `--archived`, `--all-projects`, `--project <project>`, `--search <text>`, `--older-than <duration>` (default: `90d`), `--dry-run`, `--json`, `--output <format>` | Move inactive terminal sessions to the state archive |
| `state decisions list` | `[workflow]` | `--agent <id>`, `--json`, `--output <format>` | List workflow checkpoints or available agent decision subjects |
| `state emit` | `<kind> [payload]` | `--session-id <id>`, `--category <category>` (default: `main`), `--vendor <vendor>`, `--vendor-sid <vendorSid>`, `--parent-event-id <eventId>`, `--causality-key <key>`, `--ts <iso>`, `--no-mirror`, `--json`, `--output <format>` | Append an OMA L1 workflow event |
| `state get` | `<sid>` | `--json`, `--output <format>` | Inspect one OMA L1 session by ID |
| `state heal-check` | — | `--agent <agentType>`, `--json`, `--output <format>` | Check whether self-healing is allowed for an agent |
| `state inject-log get` | `<session-id> <file>` | `--json`, `--output <format>` | Print one inject audit log entry for a session |
| `state inject-log list` | `<sid>` | `--entry <file>`, `--json`, `--output <format>` | List or view per-boundary inject audit logs |
| `state list` | — | `--category <category>` (default: `main`), `--archived`, `--all-projects`, `--project <project>`, `--search <text>`, `--older-than <duration>` (default: `90d`), `--dry-run`, `--json`, `--output <format>` | Inspect OMA L1 workflow state |
| `state migrate` | — | `--runtime`, `--include-active`, `--dry-run`, `--json`, `--output <format>` | Migrate project state to the home profile |
| `state purge` | — | `--category <category>` (default: `main`), `--archived`, `--all-projects`, `--project <project>`, `--search <text>`, `--older-than <duration>` (default: `90d`), `--dry-run`, `--json`, `--output <format>` | Delete inactive sessions older than --older-than |
| `state repair` | — | `--dry-run`, `--json`, `--output <format>` | Repair OMA L1 workflow state files |
| `state summary` | `[sid]` | `--category <category>` (default: `main`), `--json`, `--output <format>` | Export a session summary to the coordination store |
| `state trajectory` | `[sid]` | `--category <category>` (default: `main`), `--open`, `--width <columns>`, `--sequence`, `--ascii`, `--json`, `--output <format>` | Show a session trajectory: L1 events joined with vendor transcripts |
| `state verify` | — | `--workflow <workflow>`, `--checkpoint <checkpoint>`, `--instance <id>`, `--session-id <id>`, `--category <category>` (default: `main`), `--no-emit-missing`, `--json`, `--output <format>` | Verify required L1 events for a workflow checkpoint |
| `stats get` | — | `--json`, `--output <format>` | View productivity metrics |
| `stats reset` | — | `--json`, `--output <format>` | Reset productivity metrics data |
| `uninstall` | — | `--dry-run`, `-y, --yes` | Remove oh-my-agent's owned files (preserves oma-config.yaml, mcp.json, and user-authored skills) |
| `update` | — | `-f, --force`, `--with-new-skills`, `--ci`, `-y, --yes`, `--all`, `--vendor <vendors>` | Update skills to latest version from registry |
| `update mcp` | — | `-y, --yes`, `--ci`, `--all`, `--vendor <vendors>` | Choose browser MCP servers (Aside, Chrome DevTools, Firefox DevTools) |
| `vault delete` | `<name>` | — | Remove a secret from the keychain and the index |
| `vault get` | `<name>` | — | Print stored value to stdout (for: export KEY=$(oma vault get &lt;name&gt;)) |
| `vault list` | — | `--json` | List stored secret names (values never displayed) |
| `vault store` | `<name>` | `--value <value>` | Store a secret under &lt;name&gt; (interactive password prompt) |
| `verify agent` | `<agent-type>` | `-w, --workspace <path>` (default: current directory), `--session-id <id>`, `--task-id <id>`, `--run-id <id>`, `--json`, `--output <format>` | Run the check battery on one agent's output (backend, frontend, mobile, qa, debug, pm) |
| `verify triggers` | — | `--corpus <path>`, `--max-false-fire <pct>`, `--max-missed-fire <pct>`, `--json`, `--output <format>` | Measure keyword-detector trigger accuracy against a labeled prompt corpus |
| `version` | — | — | Show version number |
| `video compose` | `<runDir>` | `--output <format>` (default: `text`), `--refresh`, `--offline` | Scaffold the run's Hyperframes project on the latest toolchain + heygen-com/hyperframes; prints the authoring contract |
| `video doctor` | — | `--output <format>` (default: `text`), `--install`, `--upgrade`, `--install-mpt`, `--install-strudel` | Check video provider and compositor readiness |
| `video generate` | `<brief...>` | `--mode <mode>`, `--aspect <aspect>`, `--locale <lang>`, `--captions <style>`, `--visual <mode>`, `--voice <profile>`, `--music <mode>`, `--duration <sec>`, `--compositor <name>`, `--capture <path>`, `--source <kind>` (default: `file`), `--url <url>`, `--device <name>`, `--ready-selector <css>`, `--show-cursor`, `--polish`, `--capture-timeout <sec>`, `--capture-stop <mode>`, `--output-dir <path>`, `--allow-external-output`, `--max-usd <n>`, `--seed <n>`, `--timeout <duration>`, `-y, --yes`, `--dry-run`, `--script <path>`, `--output <format>` (default: `text`), `--no-brief-in-manifest` | Generate a video run directory from a brief |
| `video provider list` | — | `--output <format>` (default: `text`) | List video providers and availability |
| `video render` | `<runDir>` | `--output <format>` (default: `text`) | Re-render a run directory from render-spec.json |
| `visualize` | — | `--focus <node-or-path>`, `--affected <paths...>`, `--json`, `--output <format>` | Visualize project structure as a dependency graph |

<!-- oma:generated cli-registry:end -->

---

## См. также {#see-also}

- [Команды CLI](./commands.md): поведение и примеры для каждой команды.
- Файлы правил вендоров (`.cursor/rules`, ...) пересоздаёт [`oma link <vendor>`](./commands.md#link), а не отдельная команда `export`.
- [Справочник по конфигурации](../guide/configuration-reference.md): ключи конфигурации, которые переопределяют эти флаги.
- [Автоматические обновления](../guide/automated-updates.md): запуск `oma update` из GitHub Action.
- [Мониторинг через дашборды](../guide/dashboard-monitoring.md): `agent status` и дашборды.
- [Глобальная установка](../guide/global-install.md): корни проектной и глобальной установки.
- [Устранение неполадок](../guide/troubleshooting.md)
