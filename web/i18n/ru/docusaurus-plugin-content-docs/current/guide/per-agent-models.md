---
title: "Руководство: настройка моделей для каждого агента"
sidebar_label: Модели агентов
description: Настройте модель ИИ для каждого агента через `model_preset` в `oma-config.yaml`. Описаны встроенные пресеты, переопределения отдельных агентов, встроенные определения моделей, пользовательские пресеты с `extends`, `oma doctor --profile` и миграция с устаревшего `agent_cli_mapping`.
---

# Руководство: настройка моделей для каждого агента

## Обзор

`model_preset: auto` — значение по умолчанию для новых установок. Ненастроенные агенты используют нативные определения агентов и параметры модели текущего поставщика. Выберите фиксированный пресет, чтобы закрепить модели, или переопределите отдельных агентов, когда нужна другая модель либо поставщик. Явно заданные пресеты сохраняются при повторной установке и обновлении.

Общая конфигурация хранится в `.agents/oma-config.cue` или `.agents/oma-config.yaml`. Необязательный локальный файл, игнорируемый Git, переопределяет параметры на вашей машине.

Полный список ключей верхнего уровня и правила приоритета приведены в [справочнике конфигурации](/docs/guide/configuration-reference).

На этой странице рассматриваются:

1. встроенные пресеты;
2. переопределение отдельных агентов через карту `agents:`;
3. добавление пользовательских слагов моделей через `models:`;
4. определение пользовательских пресетов через `custom_presets:` и `extends:`;
5. просмотр разрешённой конфигурации через `oma doctor --profile`;
6. миграция с устаревшего `agent_cli_mapping`.

---

## Встроенные пресеты

Задайте `model_preset` одним из встроенных ключей:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto
```

| Ключ | Описание | Для чего подходит |
|:----|:-----------|:------------------|
| `auto` | Использует параметры агента и модели текущего runtime без добавления флага модели или уровня effort | Значение по умолчанию для новых установок |
| `free` | Специальный режим шлюза для процессов Codex, Claude или Qwen, запущенных OMA; разрешается отдельно от реестра встроенных пресетов | Локальный шлюз FreeLLMAPI |
| `antigravity` | Все агенты используют Antigravity CLI (`agy`): Gemini 3.1 Pro для реализации и архитектуры, Gemini 3.6 Flash для оркестрации, документации и исследования. Выбор модели задаётся внутри `agy`; флаги `--model` и `--thinking-budget` не предоставляются | Пользователи Antigravity CLI |
| `claude` | Все агенты используют Claude (Sonnet/Opus) | Владельцы подписки Claude Max |
| `codex` | Все агенты используют OpenAI Codex (GPT-5.5 для большинства ролей, GPT-5.4-mini для explore) с уровнями effort | Пользователи ChatGPT Plus/Pro |
| `qwen` | Все агенты используют Qwen Code; соответствующие сессии Qwen могут использовать сгенерированные нативные агенты, а другие runtime используют CLI-диспетчеризацию | Локальный или самостоятельно размещённый inference |
| `kiro` | Все агенты используют Kiro CLI; Sonnet обслуживает реализацию и архитектуру, а Haiku — оркестрацию и explore | Пользователи Kiro |
| `cursor` | Все агенты используют Cursor `composer-2.5` (`composer-2.5-fast` для orchestrator/qa/pm/docs/explore) | Подписчики Cursor Pro / Pro Student |
| `mixed` | Смешанный режим: роли реализации используют Codex, architecture/qa/pm — Claude, explore — Gemini | Сочетание сильных сторон поставщиков без настройки каждого агента |

Встроенные пресеты входят в пакет CLI и автоматически обновляются при обновлении `oh-my-agent`. `gemini` — алиас совместимости, перенаправляющий на `antigravity`; отдельным актуальным пресетом он не является. Локальный файл пресета не нужен.

---

## Автоматическая диспетчеризация

В режиме `auto` явные переопределения моделей `agents.<id>` имеют приоритет. В остальных случаях OMA определяет текущий runtime и использует его нативный путь субагента, если он доступен. Для агентов других поставщиков и runtime без нативной диспетчеризации используется `oma agent spawn`. `auto` не превращается в фиксированный пресет поставщика.

Для диспетчеризации CLI параметр `--vendor` явно выбирает цель. Без него OMA использует обнаруженный runtime, а при неудаче обнаружения — `default_cli` (`claude`, если он не задан). Унаследованные планы не добавляют флаги модели или effort от OMA; их предоставляет собственная конфигурация агента или сессии поставщика. Внешний процесс CLI использует сохранённые значения по умолчанию этого CLI, которые могут отличаться от модели, выбранной только в родительской сессии.

`oma doctor --profile` показывает `(vendor agent default)` для унаследованных агентов и разрешённую модель для явных переопределений. Нативные файлы агентов сохраняют определения поставщика; переопределения того же поставщика в режиме `auto` применяются при создании этих файлов командами install/update.

## Локальная конфигурация

Создайте **один** из файлов `.agents/oma-config.local.cue` или `.agents/oma-config.local.yaml` рядом с общей конфигурацией. Install, link и update добавляют оба пути в `.gitignore`; update сохраняет существующие локальные файлы даже при `--force`.

OMA выбирает ближайший каталог конфигурации проекта. Внутри него общий CUE имеет приоритет над общим YAML, а локальный файл переопределяет общие значения. Файлы CUE вычисляются независимо до объединения, поэтому общий `model_preset: "auto"` можно заменить локальным значением `"free"`. Объекты объединяются рекурсивно; массивы, скаляры и `null` заменяют общее значение. Некорректный локальный файл, отсутствие исполняемого файла CUE для локального CUE или наличие обоих локальных форматов — это ошибка, а не разрешение использовать общие значения по умолчанию.

Параметры команды и поддерживаемые переопределения окружения имеют приоритет над эффективной конфигурацией файлов. `oma doctor --profile` показывает, какие файлы использовались. Локальные файлы не переносятся при клонировании Git или создании новых worktree. Подпроцессы режима free наследуют `OMA_MODEL_PRESET=free` и разрешённое окружение шлюза, поэтому вложенные запуски OMA сохраняют маршрут; независимо запущенным сессиям нужны собственная локальная конфигурация или окружение. Параметры, сохранённые командами install/setup, по-прежнему записываются в общую конфигурацию; локальное переопределение продолжает иметь приоритет во время выполнения.

## Пресет FreeLLMAPI {#freellmapi-preset}

Оставьте `model_preset: auto` в общей конфигурации и включите free локально:

```cue
// .agents/oma-config.local.cue
model_preset: "free"
free: {
    base_url:    "http://127.0.0.1:31415/v1"
    api_key_env: "FREELLM_API_KEY"
    model:       "auto"
}
```

Эквивалентный YAML-файл:

```yaml
# .agents/oma-config.local.yaml
model_preset: free
free:
  base_url: http://127.0.0.1:31415/v1
  api_key_env: FREELLM_API_KEY
  model: auto
```

Запустите FreeLLMAPI отдельно и экспортируйте единый ключ как `FREELLM_API_KEY`. OMA также принимает `FREELLMAPI_API_KEY` от upstream, когда выбрана переменная ключа по умолчанию; если заданы обе, приоритет имеет каноническая переменная. Пользовательский `api_key_env` читает только указанную переменную. Сам ключ нельзя помещать в конфигурацию. `OMA_MODEL_PRESET` переопределяет пресет. `FREELLM_BASE_URL` и `FREELLM_MODEL` переопределяют соответствующие параметры файла. Значения в примере являются значениями по умолчанию, поэтому после запуска сервера и подготовки ключа достаточно одного `model_preset: free`.

```bash
oma doctor --profile
oma agent spawn backend "Review the API error handling" free-review --vendor codex --read-only
```

Режим free использует `free.model` для каждой роли, которую запускает OMA, включая роли с уже заданными `agents.*.model`. Эти привязки не разрешаются в платные подписки. Выберите `auto`, идентификатор модели шлюза или именованную цепочку шлюза, например `auto:coding` (сначала создайте эту цепочку в FreeLLMAPI).

Транспорт выбирается в порядке `--vendor`, затем `OMA_RUNTIME_VENDOR`, затем обнаруженный поддерживаемый runtime, затем `default_cli`, затем `codex`. Поддерживаются только транспорты Codex, Claude и Qwen. Явно выбранный неподдерживаемый транспорт вызывает ошибку.

| Транспорт | Конечная точка шлюза | Базовый URL CLI |
|:--|:--|:--|
| Codex | `/v1/responses` | Содержит `/v1` |
| Claude | `/v1/messages` | Корень сервера; OMA удаляет суффикс `/v1` |
| Qwen | `/v1/chat/completions` | Содержит `/v1` |

Используйте `oma agent spawn`, даже если родитель работает с тем же поставщиком. OMA передаёт подключение к шлюзу и учётные данные только этому подпроцессу; смена пресета не меняет модель уже открытой host-сессии или нативного инструмента субагента хоста. Codex получает пользовательский Responses-провайдер через аргументы запуска, а ключ остаётся в окружении дочернего процесса. Claude и Qwen получают совместимые параметры конечной точки. Конфликтующие настройки Claude/Qwen, которые переопределили бы маршрут или ключ, сообщаются до запуска; OMA не переписывает эти файлы.

Перед запуском агента spawn и review проверяют аутентифицированный `GET /v1/models`. Отсутствующий ключ, ошибка подключения или HTTP-ошибка аутентификации останавливают выполнение. `oma doctor --profile` показывает эффективные URL и модель, переопределения окружения, наличие ключа и готовность сервера, не выводя сам ключ. Готовность не гарантирует, что квоты модели хватит для завершения задачи.

FreeLLMAPI отвечает за отказоустойчивое переключение провайдеров на уровне запросов. Явное переключение поставщика на основе контрольных точек OMA остаётся отдельным механизмом восстановления процесса; каждый преемник в режиме free всё равно должен использовать поддерживаемый транспорт FreeLLMAPI. Автоматического возврата к платной конфигурации поставщика нет.

Free-пресет настраивает inference агентов. Он не меняет конфигурацию embeddings существующих сервисов памяти. FreeLLMAPI также предоставляет `/v1/embeddings`; при отдельной настройке векторного хранилища закрепите семейство моделей, чтобы существующие векторы оставались в совместимом пространстве.

Ссылки upstream: [настройка клиентов](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/clients/01-agent-clients.md), [API и семейства embeddings](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md).

---

## Переопределение отдельных агентов

Используйте карту `agents:`, чтобы переопределить отдельных агентов поверх активного пресета. Изменяются только перечисленные агенты; остальные следуют настройкам поставщика в режиме auto или значениям выбранного фиксированного пресета.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: auto

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Каждая запись — объект `AgentSpec`:

| Поле | Тип | Обязательно | Описание |
|:------|:-----|:------------|:---------|
| `model` | string | Да | Слаг модели (встроенный или пользовательский) |
| `effort` | `none` \| `low` \| `medium` \| `high` \| `xhigh` | Нет | Уровень рассуждений (игнорируется моделями, которые его не поддерживают) |
| `thinking` | boolean | Нет | Включить расширенное мышление (зависит от модели) |
| `memory` | `user` \| `project` \| `local` | Нет | Область памяти агента |

Допустимые идентификаторы агентов: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra`, `explore`.

Слияние поверхностное: каждое поле переопределения заменяет значение пресета для этого поля. Пропущенные поля сохраняют значение пресета.

---

## Встроенные слаги моделей {#inlining-model-slugs}

Зарегистрируйте слаги моделей, которых ещё нет во встроенном реестре, в разделе `models:`. После регистрации ссылайтесь на слаг из `agents:` или `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  google/gemini-3-flash-fast:
    cli: gemini
    cli_model: gemini-3-flash
    auth_hint: "Google AI Pro"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [gemini]
      api_only: false
```

Для зарегистрированного слага, на который есть ссылка из `agents:`, действуют два правила:

1. **Ключ должен иметь форму `owner/model`.** `agents.<id>.model` проверяется по шаблону `owner/model`, поэтому голый ключ вроде `my-fast-model` отклоняется — используйте ключ со слэшем, например `google/gemini-3-flash-fast` (или слаг `provider/model` самого поставщика).
2. **Спецификация должна быть полной.** На этапе разрешения обязательны `cli`, `cli_model`, `auth_hint` и каждый булев флаг в `supports`. Неполная спецификация принимается парсером конфигурации, но не проходит проверку реестра моделей и незаметно заменяется реестром ядра.

> Если пользовательский слаг совпадает со встроенным, побеждает пользовательское определение и выводится предупреждение.

---

## Пользовательские пресеты

Определяйте дополнительные пресеты в `custom_presets:`. Используйте `extends:`, чтобы унаследовать значения по умолчанию для всех агентов из встроенного пресета и переопределить только нужных агентов.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # base preset — partial merge
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # all other agents inherited from claude
```

Без `extends:` укажите значения по умолчанию для канонических ролей агентов, используемых пресетом. С `extends:` переопределяются только перечисленные записи, а остальные наследуются от базового пресета.

---

## `oma doctor --profile`

Запустите `oma doctor --profile`, чтобы просмотреть полностью разрешённую матрицу моделей после объединения значений по умолчанию пресета, `custom_presets` и переопределений `agents:`.

```bash
oma doctor --profile
```

**Пример вывода:**

```
oh-my-agent — Profile Health (preset=mixed)

┌──────────────┬──────────────────────────────┬──────────┬──────────────────┬──────────┐
│ Role         │ Model                        │ CLI      │ Auth Status      │ Source   │
├──────────────┼──────────────────────────────┼──────────┼──────────────────┼──────────┤
│ orchestrator │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ architecture │ anthropic/claude-opus-4-7    │ claude   │ ✓ logged in      │ (preset) │
│ qa           │ anthropic/claude-sonnet-4-6  │ claude   │ ✓ logged in      │ (preset) │
│ backend      │ openai/gpt-5.5         │ codex    │ ✗ not logged in  │ (override)│
│ explore    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

Каждая строка показывает разрешённый слаг модели и источник, который его применил (`(preset)` или `(override)`). Используйте команду всякий раз, когда субагент выбирает неожиданного поставщика.

---

## Миграция с устаревшего `agent_cli_mapping`

Миграция 008 автоматически запускается при `oma install` и `oma update`. Она преобразует старые проекты на месте:

| Устаревшая конфигурация | Результат после миграции 008 |
|:------------------------|:-----------------------------|
| Все записи используют одного поставщика (например, везде `gemini`) | `model_preset: gemini`, без `agents:` |
| Смешанные поставщики | Самый частый поставщик → `model_preset`, остальные → переопределения в `agents:` |
| Объектные значения `AgentSpec` | Перенесены в `agents:` без изменений |
| Содержимое `models.yaml` | Встроено в `oma-config.yaml.models` |
| Изменённый `defaults.yaml` | Сохранён как `custom_presets.user-customized` с предупреждением |

До любых изменений оригиналы сохраняются в резервной копии `.agents/.backup-pre-008-{timestamp}/`. Миграция идемпотентна: если `model_preset` уже задан, она пропускается.

<!-- oma-docs:ignore-start -->
После миграции удаляются `.agents/config/defaults.yaml`, `.agents/config/models.yaml` и каталог `.agents/config/`.
<!-- oma-docs:ignore-end -->

---

## Лимит квоты сессии

`session.quota_cap` остаётся без изменений. Добавьте его в `oma-config.yaml`, чтобы ограничить неконтролируемое порождение субагентов:

```yaml
session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

При достижении лимита оркестратор отказывается создавать новые процессы и сообщает статус `QUOTA_EXCEEDED`.

---

## Полный пример

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  google/gemini-3-flash-fast:
    cli: gemini
    cli_model: gemini-3-flash
    auth_hint: "Google AI Pro"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [gemini]
      api_only: false

custom_presets:
  my-team:
    extends: claude
    description: "Sonnet base, Codex for backend/db"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
```

Запустите `oma doctor --profile`, чтобы подтвердить разрешение, а затем запускайте рабочий процесс как обычно.

---

## Диспетчеризация через pi (транспортный runtime)

[pi](https://github.com/earendil-works/pi) (Earendil) — это прокси-runtime для нескольких провайдеров, а не владелец моделей: через один CLI он может запускать модели реальных провайдеров (Anthropic, OpenAI, Google). OMA рассматривает pi как **транспортный слой**: `model_preset` и переопределения `agents:` остаются без изменений, а pi становится CLI, выполняющим конкретного агента.

Направьте любого агента через pi, указав `--vendor pi`:

```bash
oma agent spawn backend "Implement the export endpoint" <session> --vendor pi
```

Что происходит:

- модель агента, разрешённая пресетом или переопределениями (например, `openai/gpt-5.5`), преобразуется в форму pi `--model <provider/id>`, а `effort` — в уровень pi `--thinking`. **Модели отдельных субагентов в pi работают так же, как нативные модели**: разные агенты могут запускать разные модели;
- персона агента (системный промпт) встраивается из `.agents/agents/<id>.md`, поскольку у pi нет файла агента на стороне поставщика;
- аутентификация берётся из конфигурации самого pi (`~/.pi/agent/auth.json` или ключ провайдера в окружении). `oma doctor` сообщает состояние установки и аутентификации pi вместе с остальными CLI.

**Ограничение:** pi запускает только модели реальных провайдеров. Пресеты, принадлежащие CLI (`cursor`, `kiro`, `qwen`, `antigravity`), называют модели, существующие только внутри собственных CLI, поэтому их диспетчеризация через pi отклоняется с понятной ошибкой. Для маршрутизации через pi используйте пресет реального провайдера (`claude`, `codex`, `gemini` или `mixed`).

> Каталог моделей pi отслеживается по версиям и требует аутентификации. Если разрешённый слаг не соответствует доступному в вашей установке pi, проверьте `pi --list-models` — сопоставление `--model` в pi нечёткое, поэтому большинство слагов провайдеров разрешается без изменений.

### Модели вне встроенного реестра pi (например, Z.ai GLM)

pi разрешает `--model` по **встроенному реестру моделей**, а параметр `defaultProvider` учитывается только когда модель вообще не передана. Для Z.ai pi поставляет лишь часть идентификаторов GLM (`glm-4.7`, `glm-4.5-air`, `glm-5-turbo`, `glm-5.1`, `glm-5v-turbo` в pi 0.80.x) — пресет с любым другим идентификатором GLM не разрешится.

Есть два способа решить это:

1. **Идентификаторы реестра** — ограничьте пресет идентификаторами моделей из реестра. Используйте форму `provider/id` (например, `zai/glm-4.7`), чтобы явно закрепить провайдера; OMA передаёт её в pi как есть через `--model`.
2. **Незарегистрированные идентификаторы** — зарегистрируйте их расширением pi. Поле `api` должно содержать один из **идентификаторов адаптера API** pi (`openai-completions`, `anthropic-messages`, …), а не имя провайдера. Имена провайдеров вроде `"zai"` или сокращения вроде `"openai"` не являются идентификаторами адаптеров и при диспетчеризации завершаются ошибкой `No API provider registered for api: …`.

```typescript
// ~/.pi/agent/extensions/zai-glm-models/index.ts  (or <project>/.pi/extensions/)
export default function (pi: ExtensionAPI) {
  pi.registerProvider("zai", {
    baseUrl: "https://api.z.ai/api/coding/paas/v4",
    api: "openai-completions", // adapter id, NOT "zai"
    apiKey: "$ZAI_API_KEY",
    models: [
      { id: "glm-4.7-flash", api: "openai-completions", /* … */ },
      // NOTE: `models` replaces ALL existing models for the provider —
      // re-declare the built-in ids here if you still want them.
    ],
  });
}
```

Перед добавлением идентификаторов в пресет проверьте их через `pi --list-models`.

---

## Диспетчеризация через OpenCode

[OpenCode](https://opencode.ai) — поставщик класса расширений: как и pi, он не владеет моделями, а запускает модели из собственного каталога — бесплатного провайдера `opencode`, недорогого плана подписки `opencode-go` и шлюза `opencode-zen`. OMA интегрирует его как **внутрипроцессный plugin-поставщик**: opencode автоматически загружает `.opencode/plugins/oma/`, вместо регистрации хуков в файле настроек, и разрешает персонажей агентов из созданных файлов `.opencode/agents/<id>.md`.

### Явная диспетчеризация

Направьте любого агента через opencode, указав `--vendor opencode`:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor opencode
```

Это запускает `opencode run --agent pm --dir <workspace> "<prompt>"`. Промпт передаётся как **последний позиционный аргумент** — флаг `-p` в opencode означает `--password`, а не промпт.

### Модели OpenCode для отдельных агентов

Чтобы направить отдельных агентов на модель opencode, зарегистрируйте модель в `models:` и укажите её в `agents:`. Действуют два требования (см. [Встроенные слаги моделей](#inlining-model-slugs)):

1. **Слаг должен иметь форму `owner/model`.** Используйте слаг opencode `provider/model` как ключ реестра — голые имена схема `agents.<id>.model` отклоняет.
2. **Спецификация должна быть полной** — `cli`, `cli_model`, `auth_hint` и каждый булев флаг `supports`. Неполная спецификация не проходит проверку и незаметно заменяется реестром ядра, поэтому агент не будет направлен в opencode.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: claude          # heavier impl roles stay on Claude

models:
  opencode-go/deepseek-v4-flash:
    cli: opencode
    cli_model: opencode-go/deepseek-v4-flash
    auth_hint: "OpenCode Go subscription — run: opencode auth login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: [opencode]
      api_only: false

agents:
  pm:      { model: opencode-go/deepseek-v4-flash }
  qa:      { model: opencode-go/deepseek-v4-flash }
  docs:    { model: opencode-go/deepseek-v4-flash }
  explore: { model: opencode-go/deepseek-v4-flash }
```

Каждый направленный агент запускается как `opencode run -m opencode-go/deepseek-v4-flash --agent <id> --dir <workspace> "<prompt>"`. Это подходит лёгким и быстрым ролям (pm, qa, docs, explore), а более тяжёлые агенты реализации остаются на Codex/Claude и т. д.

### Проверка слага модели

Каталог opencode зависит от подписки и входа в систему, поэтому oma **не** фиксирует слаги моделей opencode заранее. Проверьте слаг по установленному каталогу:

```bash
oma model probe opencode-go/deepseek-v4-flash --json   # accepted | rejected | auth_required
opencode models opencode-go                            # list everything your plan exposes
```

`oma model probe` сообщает `accepted`, если слаг есть в списке `opencode models`, `rejected`, если его нет, и `auth_required`, если провайдер требует входа или подписки.

### Аутентификация и созданные файлы

- **Аутентификация:** `opencode auth login` сохраняет учётные данные в `~/.local/share/opencode/auth.json`, по одной записи на провайдера. `oma auth status` / `oma doctor` сообщают, что opencode аутентифицирован, если есть учётные данные *любого* провайдера. `oma doctor --profile`, напротив, учитывает провайдера: каждая строка проверяется по префиксу провайдера из зарегистрированного `cli_model`, поэтому модель с `cli_model: zai-coding-plan/glm-5.3` проверяется по учётным данным `zai-coding-plan`. Для модели без зарегистрированного `cli_model` вида `provider/model` выводится `? unknown`, а не однозначная ошибка аутентификации.
- **Созданные файлы:** `oma link` (или `oma link opencode`) записывает для каждого агента файл персонажа `.opencode/agents/<id>.md` и мост `.opencode/plugins/oma/`. Они создаются из SSOT `.agents/` — не редактируйте их напрямую; для повторной генерации снова запустите `oma link`.

> **Примечание о постоянных рабочих процессах:** событие `session.idle` в opencode (ближайший аналог хука Claude `Stop`) предназначено только для уведомлений и не может не дать сессии завершиться. Поэтому постоянные рабочие процессы (orchestrate / work / ultrawork) в opencode работают с **ослабленной семантикой Stop**: подкрепление рабочего процесса происходит при следующем сообщении, а не за счёт удержания сессии открытой.

---

## Диспетчеризация через Kimi Code CLI

[Kimi Code CLI](https://www.kimi.com/code) читает **хуки** только из глобальной конфигурации (`~/.kimi-code/config.toml`, `KIMI_CODE_HOME`), поэтому `oma install`/`oma link` с явного согласия записывают цепочку хуков Kimi и символические ссылки навыков в HOME (как для Antigravity). Kimi также напрямую сканирует SSOT OMA `.agents/skills/`, поэтому навыки доступны во всём проекте. **MCP** не требует записи в HOME и имеет область проекта: конфигурация записывается с учётом режима в `<cwd>/.kimi-code/mcp.json` (проект) или `~/.kimi-code/mcp.json` (глобальный режим).

### Явная диспетчеризация

Направьте любого агента через Kimi с помощью `--vendor kimi`:

```bash
oma agent spawn pm "Draft the rollout plan" <session> --vendor kimi
```

Это запускает `kimi -p "<prompt>"`. Неинтерактивный режим Kimi `-p` автоматически подтверждает обычные вызовы инструментов при политике разрешений `auto`, поэтому oma **не** добавляет `--yolo` или `--auto` (они несовместимы с `-p`).

### Модели Kimi для отдельных агентов

Как и в случае с opencode, oma **не** фиксирует каталог моделей Kimi (линейка зависит от провайдера и подписки). Чтобы направить отдельных агентов на модель Kimi, зарегистрируйте полную спецификацию в `models:` с `cli: kimi` и укажите её в `agents:`.

Ключ реестра должен иметь форму `owner/model` (голые имена отклоняются схемой `agents.<id>.model`), а `cli_model` — это точный алиас, передаваемый в `kimi --model`; документированный кодинговый алиас Kimi — `kimi-code/kimi-for-coding`. Перед фиксацией конфигурации подтвердите алиас, доступный вашей подписке, командой `kimi --model <alias>`.

```yaml
# .agents/oma-config.yaml
models:
  kimi-code/kimi-for-coding:
    cli: kimi
    cli_model: kimi-code/kimi-for-coding
    auth_hint: "Kimi subscription — run: kimi login"
    supports:
      effort: null
      apply_patch: false
      task_budget: false
      prompt_cache: false
      computer_use: false
      native_dispatch_from: []
      api_only: false

agents:
  pm:   { model: kimi-code/kimi-for-coding }
  docs: { model: kimi-code/kimi-for-coding }
```

Каждый направленный агент запускается как `kimi --model kimi-code/kimi-for-coding -p "<prompt>"`.

> **Примечание о постоянных рабочих процессах:** документированный путь блокировки Stop в Kimi использует код выхода 2 / stderr, но маршрутизатор `oma hook run` всегда завершается с кодом 0 и выдаёт диалект stdout. Поэтому oma выдаёт best-effort `permissionDecision: "deny"` (а также совместимое с Claude `decision: "block"`), чтобы постоянные рабочие процессы корректно работали в ограниченном режиме Kimi.
