---
title: "Руководство: справочник конфигурации"
sidebar_label: Справочник конфигурации
description: Поддерживаемые расположения конфигурации OMA, приоритеты, типизированные ключи, значения по умолчанию и правила владения при обновлении.
---

# Справочник конфигурации

OMA читает конфигурацию из `.agents/oma-config.cue` или `.agents/oma-config.yaml`. Локальный overlay — `.agents/oma-config.local.cue` или `.agents/oma-config.local.yaml` — предназначен для настроек конкретной машины, которые не должны попадать в общий файл.

Запустите эту команду в проекте, конфигурацию которого хотите проверить:

```bash
oma doctor --profile
```

Ожидаемый результат — вычисленный профиль с выбранным preset и планом моделей по агентам. Если команда сообщает об ошибке разбора, сначала исправьте ближайший слой конфигурации, затем меняйте настройки моделей.

## Какой файл имеет приоритет

Загрузчик поднимается от текущего каталога вверх и останавливается на ближайшем каталоге `.agents/`, содержащем общую или локальную конфигурацию. В этом каталоге:

1. Сначала вычисляется `oma-config.cue`.
2. `oma-config.yaml` используется, если общего файла CUE нет или его нельзя вычислить.
3. Один локальный файл (`oma-config.local.cue` или `.local.yaml`) сливается поверх общего файла.
4. Установленный `OMA_MODEL_PRESET` переопределяет `model_preset` для этого процесса.

Карты сливаются рекурсивно. Массивы, скаляры и `null` заменяют общее значение. Одновременное наличие обоих локальных форматов является ошибкой. Ошибка в локальном файле завершает загрузку, чтобы частное переопределение не было молча проигнорировано.

Это правило ближайшего слоя, а не общее слияние проекта и HOME. Глобальная установка читает `~/.agents/oma-config.*`, потому что HOME является её корнем установки. Команда проекта читает ближайший слой проекта. Исключение — проверка `auto_update_cli`: она проверяет проект, затем HOME, а затем использует включённое значение по умолчанию.

## Ключи верхнего уровня

Следующие ключи читаются текущей runtime-схемой или поставляемыми потребителями OMA. Ключ с пометкой sparse намеренно частичный: пропустите вложенное значение, чтобы сохранить значение по умолчанию в коде.

| Ключ | Тип или допустимые значения | По умолчанию при отсутствии | Назначение |
| --- | --- | --- | --- |
| `language` | string | `en` | Язык ответов, используемый workflow и skills. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` в поставляемом шаблоне | Выбор голоса для `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` в поставляемом шаблоне; отсутствие ключа не задаёт явное переопределение | Предпочтительный формат даты. |
| `timezone` | имя IANA | системный часовой пояс | Даты, используемые расписаниями и отчётами. |
| `auto_update_cli` | boolean | `true` | Фоновые проверки версии CLI; для отказа задайте `false`. |
| `telemetry` | boolean | `false` | Включение телеметрии вендора, используемое при install, update и синхронизации link. |
| `model_preset` | непустой string | `auto` в новых шаблонах | Встроенный или пользовательский preset моделей. `OMA_MODEL_PRESET` переопределяет его для одного процесса. |
| `free` | `base_url`, `api_key_env`, `model` | `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, `auto` | Настройки FreeLLMAPI при preset `free`; `FREELLM_BASE_URL` и `FREELLM_MODEL` переопределяют значения файла, а имя ключа никогда не содержит секрет. См. [конфигурацию моделей по агентам](/docs/guide/per-agent-models#freellmapi-preset). |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory` | `context7`, `native`, `serena`, `block`, `agentmemory` | Выбор провайдеров документации, поиска, интеллектуального поиска по коду и семантической памяти. Для code intelligence допустимы `serena` и `gortex`, для semantic memory — `agentmemory`, `honcho` и `none`. `code_intelligence_guard` (`block` или `off`) управляет защитой поиска PreToolUse. Нативный поиск, ограниченный подтверждёнными исключениями провайдера или путями вне проекта, разрешён без обхода. Защита читает исключения Serena и включённые правила gitignore либо список исключений Gortex; она не определяет зависимости по именам каталогов. Хук не называет `OMA_CI_ALLOW_NATIVE`. Shell-поиск с префиксом `OMA_CI_ALLOW_NATIVE=1` обходит защиту только для ресурсов вне проекта или игнорируемых путей, которые защита не распознала, но не для исходного кода проекта. |
| `brave` | `api_key_env` или `api_key_vault` | не задано | Ссылка на credential поиска Brave. |
| `honcho` | `base_url`, `workspace_id`, `project_id`, `api_key_env`, `api_key_vault`, `timeout_ms`, `max_results`, `max_tokens`, `recall_mode` | См. [сведения о Honcho](#honcho-semantic-memory) | Настройки подключения semantic memory Honcho. |
| `agents` | ID агента → `model`, необязательные `effort`, `thinking`, `memory` | разрешение preset | Переопределения по агентам поверх выбранного preset. effort — `none`, `low`, `medium`, `high` или `xhigh`; memory — `user`, `project` или `local`. |
| `models` | slug модели → отображение CLI | не задано | Встроенные определения моделей для поддерживаемых CLI-вендоров. |
| `custom_presets` | preset → description, необязательные `extends`, `agent_defaults` | не задано | Пользовательские preset; `extends` может наследовать встроенный preset. |
| `vendors` | YAML: `string[]` выбранных ID vendor; шаблон CUE: необязательная fallback-карта `vendors.pi` | все vendor, доступные для link в YAML-списке | Выбор интеграций vendor, которые `oma install` и `oma update` проектируют в YAML. Карта capabilities dispatch находится в управляемой конфигурации orchestration; см. [выбор vendor и метаданные dispatch](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | string | fallback consumer | Устаревший fallback только по vendor, если план модели не разрешён. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | каждый пропущенный размер не ограничен | Жёсткие лимиты token и spawn, проверяемые перед следующим spawn агента; см. [лимиты квоты сессии](#session-quota-caps). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | Поведение `oma docs verify` и исключения сканирования. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Transport MCP Serena и поведение обновления. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` или `[]` | не задано = оставить существующую настройку | Выбор Browser DevTools MCP при reconciliation. Явный пустой список удаляет выбранные записи browser. |
| `video` | sparse-карта, принадлежащая skill | default skill; см. [Генерация видео](/docs/guide/video-generation) | Маршрутизация видео, порядок provider, output, стоимость, лимиты и настройки обновления HyperFrames. |
| `image` | sparse-карта, принадлежащая skill | default skill; см. [Генерация изображений](/docs/guide/image-generation) | Vendor изображений, размер, качество, output, сравнение и настройки стоимости. |
| `voice` | `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | default skill; см. [workflow контента и исследований](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Профиль Voicebox, output и ограничения длины. |
| `hwp` | `format`, `version.*`, `output.*` | default skill; см. [workflow контента и исследований](/docs/guide/content-and-research#extract-hwp-family-documents) | Формат Kordoc, канал версии и расположение output. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | default skill; см. [workflow контента и исследований](/docs/guide/content-and-research#extract-pdf-content) | Извлечение PDF, OCR, изображения и параметры перезаписи. |
| `scholar` | `base_url` | default skill; см. [workflow контента и исследований](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Host endpoint Knows; форма протокола принадлежит skill. |
| `diagram` | `engine`, `explain_sidecar`, `archify.*` | default skill; см. [Diagram Engine](/docs/guide/diagram-engine) | Выбор Mermaid/archify и настройки управляемого engine. |
| `market` | `managed`, `channel`, `check_interval_min`, `path`, `python`, `save_dir` | default skill; см. [Исследование рынка](/docs/guide/market-research) | Разрешение управляемого engine last30days и расположение результатов. |

Поставляемый шаблон также содержит блоки, принадлежащие consumer. Их текущие ключи и значения по умолчанию:

| Блок | Ключи, читаемые consumer | По умолчанию | Эффект |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | хранить 100 сессий; удалять артефакты Serena старше 50 дней; `0` отключает удаление по возрасту | Значения по умолчанию для `oma memory gc`; flags команды их переопределяют. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Управляет плановым путём очистки LSP Serena. Интерактивная `oma serena reap` остаётся явной; тихие scheduled-запуски включаются отдельно. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Включает stop-hook guard бюджета строк и задаёт бюджет кода для файла. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | поставляемый шаблон включает conventional commits и защиту PR, используя заданные в шаблоне co-author и списки имён файлов | Управляет SCM skill, commit hook и guard паттернов секретов. Перед включением co-author trailers замените значения identity из шаблона своими. |

Эти блоки принимаются через passthrough конфигурации и интерпретируются соответствующей функцией или workflow. Parser `serena_reaper` читает показанные выше ключи snake_case, хотя в старых комментариях шаблона использовались имена camelCase. Перед добавлением вложенных ключей изучите руководство соответствующей функции; эта страница не добавляет ключи вне перечисленных consumer.

## Точные вложенные объекты

### Semantic memory Honcho {#honcho-semantic-memory}

Карта `honcho` проверяется через `HonchoConfigSchema`. Имена ключей и фактическое поведение runtime:

| Ключ | Форма | Фактическое значение по умолчанию или ограничение |
| --- | --- | --- |
| `base_url` | URL string | `https://api.honcho.dev`; HTTPS обязателен, кроме loopback HTTP. Credentials, query string и fragment отклоняются. |
| `workspace_id` | 1–128 букв, цифр, `_` или `-` | Требуется при запуске provider. Интерактивный installer задаёт `oma`, если сохранённого значения нет. |
| `project_id` | обрезанный string длиной 1–128 символов | При пропуске используется текущий корень проекта OMA. |
| `api_key_env` | имя переменной окружения | `HONCHO_API_KEY`. Endpoint вне loopback требует эту переменную или `api_key_vault`. |
| `api_key_vault` | имя vault key (`A-Z`, `a-z`, цифры, `.`, `_`, `-`; 1–64 символа) | При пропуске поиск в vault не выполняется. Если присутствуют обе ссылки credential, сначала используется значение окружения. |
| `timeout_ms` | integer `100`–`30000` | `5000` миллисекунд. Тот же deadline применяется к запросу status или memory. |
| `max_results` | integer `1`–`50` | `8` результатов recall. |
| `max_tokens` | integer `128`–`16000` | `2000` байт UTF-8 для извлечённого содержимого и выведенного контекста. |
| `recall_mode` | `messages` или `hybrid` | Installer записывает `messages` для нового выбора. Пропуск включает запрос representation provider вместе с recall сообщений. |

Например, удалённый workspace может использовать ссылку на секрет, не помещая сам секрет в YAML:

```yaml
providers:
  semantic_memory: honcho
honcho:
  base_url: https://honcho.example.com
  workspace_id: team
  project_id: product-docs
  api_key_vault: honcho-team
  timeout_ms: 5000
  max_results: 8
  max_tokens: 2000
  recall_mode: messages
```

При интерактивной или неинтерактивной настройке Honcho без сохранённого URL installer использует `http://127.0.0.1:8000` как начальный URL. Это начальное значение installer отдельно от runtime fallback provider, описанного выше. После выбора provider используйте `oma memory status`; отсутствие workspace или credential сообщается как недоступность, а не приводит к молчаливому переключению на другой memory provider.

### Лимиты квоты сессии {#session-quota-caps}

`session.quota_cap` — частичная карта. Каждое поле необязательно; пропущенное поле оставляет соответствующее измерение без лимита. Значения должны быть неотрицательными integer, а `per_vendor` отображает имена vendor на бюджеты token:

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

Loader лимитов проверяет пользовательский слой CUE, затем пользовательский слой YAML, затем fallback поставляемого шаблона. Перед spawn OMA в таком порядке проверяет `spawn_count`, общий `tokens` и `per_vendor`. Лимит считается достигнутым, когда usage больше или равен ему; OMA блокирует следующий spawn и сообщает сработавшее измерение. Usage — это учёт token, а не оценка счёта.

### Выбор vendor и метаданные dispatch {#vendor-selection-and-dispatch-metadata}

В принадлежащем пользователю `.agents/oma-config.yaml` `vendors` — это список выбранных ID интеграций:

```yaml
vendors:
  - claude
  - codex
  - pi
```

Отсутствующий или пустой список выбирает все ID из реестра linkable vendor OMA. Список управляет проекциями install/update; это не карта возможностей команд по vendor.

Поставляемая схема `.agents/oma-config.cue` также допускает объект `vendors.pi` с полями `command`, `prompt_flag`, `model_flag`, `default_model` и `thinking_flag`. Этот блок — типизированная fallback-форма в шаблоне CUE; текущий dispatch агентов разрешает поля capabilities из расположенного ниже управляемого реестра orchestration, поэтому не используйте `vendors.pi` вместо списка YAML.

Управляемый `.agents/skills/oma-orchestration/config/cli-config.yaml` содержит эту карту capabilities. Каждая запись `vendors.<id>` поддерживает поля:

| Поле | Форма | Назначение |
| --- | --- | --- |
| `command` | string executable | Запускаемый binary. |
| `subcommand` | string | Подкоманда, вставляемая перед options, например `codex exec`. |
| `prompt_flag` | string или `none`/`null` для отключения | Flag, связанный с prompt; при отключении используется positional prompt. |
| `auto_approve_flag` | string | Flag vendor для обхода запроса разрешения в writable run. В read-only mode подавляется. |
| `read_only_flag` | string | Flag vendor для read-only. Если отсутствует, builder использует vendor-specific fallback или выдаёт предупреждение. |
| `output_format_flag` | string | Flag для выбора machine-readable output. |
| `output_format` | string | Значение, передаваемое вместе с `output_format_flag`. |
| `model_flag` | string | Flag, передаваемый вместе с `default_model`. |
| `default_model` | string | Значение model, используемое, если resolved plan его не задаёт. |
| `isolation_env` | string `NAME=value` | Необязательное назначение окружения; небезопасные ключи loader/interpreter отклоняются, а `$$` раскрывается в ID текущего процесса. |
| `isolation_flags` | строка аргументов shell-style | Дополнительные аргументы isolation, разделённые на argv tokens. |

Управляемый файл capabilities пересоздаётся обновлениями OMA. Для выбора моделей редактируйте принадлежащие пользователю ключи `agents`, `models` и `custom_presets`; карту capabilities используйте только для сопровождения управляемых данных orchestration или отладки адаптера vendor. Закомментированный объект `vendors.pi` из старых шаблонов — fallback metadata и не заменяет список выбранных vendor или управляемый dispatch registry.

## Типовые изменения

Выберите фиксированный preset для проекта, сохранив личное переопределение локально:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed

# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-5.4
    effort: high
```

Явно выберите provider code intelligence и memory:

```yaml
providers:
  code_intelligence: serena
  code_intelligence_guard: block   # off → advisory primer only, no tool denial
  semantic_memory: none
```

Оставьте конфигурацию browser неизменной при обновлениях или удалите её намеренно:

```yaml
# Omit mcp.devtools_browsers to leave existing browser entries unchanged.
mcp:
  devtools_browsers: []
```

## Правила обновления и владения

`.agents/oma-config.yaml` принадлежит пользователю. `oma update` сохраняет существующее содержимое и может добавить новые ключи верхнего уровня поставляемого шаблона под маркером `# Added by oma update`. `oma update --force` может заменить пользовательскую конфигурацию, конфигурацию MCP и каталоги stack; используйте его только при намеренном сбросе этих настроек. Локальные overlay-файлы остаются приватным местом для значений конкретной машины.

Не помещайте API keys в этот файл. Используйте поля `api_key_env` или `api_key_vault`, а фактическое credential храните в указанном secret store или окружении.

Подробности разрешения моделей описаны в [конфигурации моделей по агентам](/docs/guide/per-agent-models). Семантика слоёв и поведение при ошибках описаны в [семантике конфигурации OMA](/docs/guide/oma-config-semantics).
