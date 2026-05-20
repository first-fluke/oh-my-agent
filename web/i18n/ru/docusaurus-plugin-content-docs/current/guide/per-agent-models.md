---
title: "Руководство: Конфигурация моделей для каждого агента"
description: Настройте, какую модель ИИ использует каждый агент, через model_preset в oma-config.yaml. Описываются семь встроенных пресетов, переопределения для отдельных агентов, инлайн-определения моделей, пользовательские пресеты с extends, oma doctor --profile и миграция с устаревшего agent_cli_mapping.
---

# Руководство: Конфигурация моделей для каждого агента

## Обзор

`model_preset` — это единственное понятие, которое определяет, какую модель использует каждый агент. Выберите один из семи встроенных пресетов, и каждый агент (pm, backend, frontend, qa, …) будет привязан к подходящей модели для соответствующего стека вендора. При необходимости переопределите отдельных агентов. Если у вашей команды нестандартный набор, определите дополнительные пресеты.

Вся конфигурация находится в одном файле: `.agents/oma-config.yaml`.

На этой странице рассматриваются:

1. Семь встроенных пресетов
2. Переопределение отдельных агентов через карту `agents:`
3. Инлайн-добавление пользовательских слагов моделей через `models:`
4. Определение пользовательских пресетов через `custom_presets:` и `extends:`
5. Проверка итоговой конфигурации через `oma doctor --profile`
6. Миграция с устаревшего `agent_cli_mapping`

---

## Встроенные пресеты

Установите `model_preset` в один из семи встроенных ключей:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: gemini
```

| Ключ | Описание | Когда подходит |
|:----|:-----------|:---------|
| `antigravity` | Все агенты используют Antigravity CLI (`agy`): Gemini 3.1 Pro для реализации/архитектуры, Gemini 3.5 Flash для оркестрации и поиска. Выбор модели осуществляется конфигурационно внутри `agy` — флаги `--model` и `--thinking-budget` не поддерживаются. | Пользователи Antigravity CLI |
| `claude` | Все агенты используют Claude (Sonnet/Opus) | Для подписчиков Claude Max |
| `codex` | Все агенты используют OpenAI Codex (GPT-5.x) с уровнями effort | Для пользователей ChatGPT Plus/Pro |
| `gemini` | Все агенты используют Gemini CLI, для ролей реализации включён thinking | Для пользователей Google AI Pro |
| `qwen` | Все агенты направляются вовне через Qwen Code; бинарный thinking (без уровней effort) | Для локальных или self-hosted инференс-сред |
| `cursor` | Все агенты используют Cursor `composer-2.5` (`composer-2.5-fast` для orchestrator/qa/pm/docs/retrieval) | Подписчики Cursor Pro / Pro Student |
| `mixed` | Смешанный: роли реализации используют Codex, architecture/qa/pm — Claude, retrieval — Gemini | Когда нужны сильные стороны разных вендоров без управления конфигурацией для каждого агента |

Встроенные пресеты поставляются в составе пакета CLI и обновляются автоматически при обновлении `oh-my-agent`. Локальный файл поддерживать не нужно.

---

## Переопределение отдельных агентов

Используйте карту `agents:`, чтобы переопределить конкретных агентов поверх активного пресета. Затрагиваются только перечисленные вами агенты; остальные сохраняют значения по умолчанию из пресета.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: gemini

agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }
```

Каждая запись — это объект `AgentSpec`:

| Поле | Тип | Обязательное | Описание |
|:------|:-----|:---------|:-----------|
| `model` | string | Да | Слаг модели (встроенный или определённый пользователем) |
| `effort` | `low` \| `medium` \| `high` | Нет | Уровень рассуждений (игнорируется на моделях, которые его не поддерживают) |
| `thinking` | boolean | Нет | Включить расширенное мышление (зависит от модели) |
| `memory` | `user` \| `project` \| `local` | Нет | Область памяти агента |

Допустимые идентификаторы агентов: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `tf-infra`, `retrieval`.

Слияние поверхностное: каждое поле в вашем переопределении заменяет значение из пресета для того же поля. Пропущенные поля сохраняют значения из пресета.

---

## Инлайн-добавление слагов моделей

Регистрируйте слаги моделей, которых ещё нет во встроенном реестре, в разделе `models:`. После регистрации используйте слаг в любом месте `agents:` или `custom_presets:`.

```yaml
# .agents/oma-config.yaml
models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports:
      native_dispatch_from: [gemini]
      thinking: true
```

> Если пользовательский слаг конфликтует со встроенным, побеждает пользовательское определение и выводится предупреждение.

---

## Пользовательские пресеты

Определяйте дополнительные пресеты в `custom_presets:`. Используйте `extends:`, чтобы унаследовать все значения по умолчанию для агентов из встроенного пресета и переопределить только нужных агентов.

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

custom_presets:
  my-team:
    extends: claude              # базовый пресет — частичное слияние
    description: "Team A — sonnet base, codex for implementation"
    agent_defaults:
      backend: { model: openai/gpt-5.5, effort: high }
      db:      { model: openai/gpt-5.5, effort: high }
      # все остальные агенты унаследованы от claude
```

Без `extends:` необходимо указать `agent_defaults` для всех 11 ролей агентов. С `extends:` переопределяются только перечисленные записи; остальные наследуются от базового пресета.

---

## `oma doctor --profile`

Запустите `oma doctor --profile`, чтобы проверить полностью разрешённую матрицу моделей после слияния значений по умолчанию из пресета, `custom_presets` и переопределений из `agents:`.

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
│ retrieval    │ google/gemini-3.1-flash-lite │ gemini   │ ✗ not logged in  │ (preset) │
└──────────────┴──────────────────────────────┴──────────┴──────────────────┴──────────┘
```

В каждой строке показаны итоговый слаг модели и источник, который его применил (`(preset)` или `(override)`). Используйте эту команду каждый раз, когда подагент выбирает неожиданного вендора.

---

## Миграция с устаревшего `agent_cli_mapping`

Миграция 008 запускается автоматически при `oma install` и `oma update`. Она преобразует устаревшие проекты на месте:

| Устаревшая конфигурация | Результат после миграции 008 |
|:-------------|:--------------------------|
| Все записи указывают одного вендора (например, везде `gemini`) | `model_preset: gemini`, без `agents:` |
| Смешанные вендоры | Самый частый вендор → `model_preset`; остальные → переопределения в `agents:` |
| Значения-объекты `AgentSpec` | Перенесены в `agents:` без изменений |
| Содержимое `models.yaml` | Встроено в `oma-config.yaml.models` |
| Изменённый `defaults.yaml` | Сохранён как `custom_presets.user-customized` с предупреждением |

Перед любыми изменениями оригиналы сохраняются в резервную копию `.agents/.backup-pre-008-{timestamp}/`. Миграция идемпотентна: если `model_preset` уже задан, она пропускается.

После миграции `.agents/config/defaults.yaml`, `.agents/config/models.yaml` и сама директория `.agents/config/` удаляются.

---

## Лимит квоты сессии

`session.quota_cap` остаётся без изменений. Добавьте его в `oma-config.yaml`, чтобы ограничить неконтролируемое порождение подагентов:

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

При достижении лимита оркестратор отказывается порождать новых подагентов и возвращает статус `QUOTA_EXCEEDED`.

---

## Полный пример

```yaml
# .agents/oma-config.yaml
language: en
model_preset: my-team

agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }

models:
  my-fast-model:
    cli: gemini
    cli_model: gemini-3-flash
    supports: { native_dispatch_from: [gemini], thinking: true }

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

Запустите `oma doctor --profile`, чтобы убедиться в корректном разрешении конфигурации, а затем запускайте рабочий процесс как обычно.
