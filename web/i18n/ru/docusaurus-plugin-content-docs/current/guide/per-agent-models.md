---
title: "Руководство: Настройка модели для каждого агента"
description: Настройка различных CLI-вендоров, моделей и уровней reasoning effort для каждого агента через oma-config.yaml и models.yaml. Охватывает agent_cli_mapping, runtime profiles, oma doctor --profile, models.yaml и лимиты сессионных квот.
---

# Руководство: Настройка модели для каждого агента

## Обзор

oh-my-agent поддерживает **выбор модели для каждого агента** через `agent_cli_mapping`. Каждый агент (pm, backend, frontend, qa, …) может независимо использовать конкретного вендора, модель и уровень reasoning effort — вместо того чтобы разделять единый глобальный вендор.

На этой странице рассматривается:

1. Иерархия из трёх конфигурационных файлов
2. Двойной формат `agent_cli_mapping`
3. Пресеты runtime profiles
4. Команда `oma doctor --profile`
5. Пользовательские slugs моделей в `models.yaml`
6. Лимиты сессионных квот

---

## Иерархия конфигурационных файлов

oh-my-agent читает конфигурацию из трёх файлов в порядке приоритета (наивысший — первый):

| Файл | Назначение | Редактировать? |
|:-----|:--------|:------|
| `.agents/oma-config.yaml` | Пользовательские переопределения — привязка агентов к CLI, активный профиль, квота сессии | Да |
| `.agents/config/models.yaml` | Пользовательские slugs моделей (дополнения к встроенному реестру) | Да |
| `.agents/config/defaults.yaml` | Базовые настройки Profile B (5 `runtime_profiles`, безопасные fallback-значения) | Нет — SSOT |

> `defaults.yaml` является частью SSOT и не должен изменяться напрямую. Все настройки выполняются в `oma-config.yaml` и `models.yaml`.

---

## Двойной формат `agent_cli_mapping`

`agent_cli_mapping` принимает два варианта значений, что позволяет постепенно переходить на новый формат:

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # legacy — только вендор (использует модель по умолчанию)
  backend:                            # новый объект AgentSpec
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low
```

**Устаревший строковый формат**: `agent: "vendor"` — продолжает работать; использует модель вендора по умолчанию с дефолтным effort через соответствующий runtime profile.

**Объектный формат AgentSpec**: `agent: { model, effort }` — фиксирует конкретный slug модели и уровень reasoning effort (`low`, `medium`, `high`).

Форматы можно свободно смешивать. Агенты, для которых ничего не указано, используют активный `runtime_profile`, затем — `agent_defaults` верхнего уровня из `defaults.yaml`.

---

## Runtime Profiles

`defaults.yaml` поставляется с Profile B и пятью готовыми `runtime_profiles`. Выбор профиля осуществляется в `oma-config.yaml`:

```yaml
# .agents/oma-config.yaml
active_profile: claude-only   # см. варианты ниже
```

| Профиль | Все агенты направляются в | Использовать когда |
|:--------|:--------------------|:---------|
| `claude-only` | Claude Code (Sonnet/Opus) | Единый стек Anthropic |
| `codex-only` | OpenAI Codex (GPT-5.x) | Чистый стек OpenAI |
| `gemini-only` | Gemini CLI | Рабочие процессы на Google |
| `antigravity` | Смешанный: impl→codex, architecture/qa/pm→claude, retrieval→gemini | Сильные стороны разных вендоров |
| `qwen-only` | Qwen Code | Локальный / self-hosted инференс |

Профили — это быстрый способ перестроить всю связку агентов без редактирования каждой строки.

---

## `oma doctor --profile`

Флаг `--profile` выводит матричное представление с разрешёнными вендором, моделью и effort для каждого агента — после слияния `oma-config.yaml`, `models.yaml` и `defaults.yaml`.

```bash
oma doctor --profile
```

**Пример вывода:**

```
oh-my-agent — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4-6           medium   oma-config
backend       openai    gpt-5.3-codex               high     oma-config
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3.1-pro-preview      low      profile:antigravity
architecture  claude    claude-opus-4-7             high     defaults
retrieval     google    gemini-3.1-flash-lite       —        defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

Используйте эту команду каждый раз, когда subagent выбирает неожиданного вендора — столбец `Source` покажет, какой уровень конфигурации имел приоритет.

---

## Добавление slugs в `models.yaml`

`models.yaml` — необязательный файл, позволяющий регистрировать slugs моделей, которых ещё нет во встроенном реестре. Это удобно для новых выпущенных моделей.

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — GPT-5.5 Spud release candidate"
```

После регистрации slug становится доступным в `agent_cli_mapping`:

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Slugs — это идентификаторы; сохраняйте их на английском языке точно в том виде, в котором они опубликованы вендором.

---

## Лимиты сессионных квот

Добавьте `session.quota_cap` в `oma-config.yaml`, чтобы ограничить неконтролируемый запуск subagent-ов:

```yaml
# .agents/oma-config.yaml
session:
  quota_cap:
    tokens: 2_000_000        # общий потолок токенов сессии
    spawn_count: 40          # максимальное число параллельных и последовательных subagent-ов
    per_vendor:              # подлимиты токенов по вендорам
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

При достижении лимита orchestrator отказывает в дальнейшем запуске и выставляет статус `QUOTA_EXCEEDED`. Оставьте поле незаполненным (или полностью опустите `quota_cap`), чтобы отключить ограничение по этому параметру.

---

## Итоговый пример

Реалистичный `oma-config.yaml`:

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4-6"
    effort: medium
  qa:
    model: "google/gemini-3.1-pro-preview"
    effort: low

session:
  quota_cap:
    tokens: 2_000_000
    spawn_count: 40
    per_vendor:
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

Выполните `oma doctor --profile` для проверки разрешённых значений, затем запустите рабочий процесс в обычном режиме.


## Владение конфигурационными файлами

| Файл | Владелец | Безопасно редактировать? |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | SSOT, поставляется вместе с oh-my-agent | Нет — относитесь как к read-only |
| `.agents/oma-config.yaml` | Вы | Да — вносите настройки здесь |
| `.agents/config/models.yaml` | Вы | Да — добавляйте новые slugs здесь |

`defaults.yaml` содержит поле `version:`, чтобы новые релизы oh-my-agent могли добавлять runtime_profiles, новые slugs Profile B или корректировать матрицу effort. Прямое редактирование этого файла означает, что вы не будете получать такие обновления автоматически.

## Обновление defaults.yaml

При получении нового релиза oh-my-agent выполните `oma install` — установщик сравнивает версию вашего локального `defaults.yaml` с версией, поставляемой в комплекте:

- **Совпадение** → без изменений, тихо.
- **Несовпадение** → предупреждение:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Несовпадение + `--update-defaults`** → поставляемая версия перезаписывает вашу:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Файлы `oma-config.yaml` и `models.yaml` установщик никогда не затрагивает.

## Обновление с установки до версии 5.16.0

Если ваш проект создан до появления функции настройки модели/effort для каждого агента:

1. Выполните `oma install` (или `oma update`) из корня проекта. Установщик добавит свежий `defaults.yaml` в `.agents/config/` и запустит миграцию `003-oma-config`, которая автоматически перенесёт устаревший `.agents/config/user-preferences.yaml` в `.agents/oma-config.yaml`.
2. Выполните `oma doctor --profile`. Существующие значения `agent_cli_mapping: { backend: "gemini" }` разрешаются через `runtime_profiles.gemini-only.agent_defaults.backend`, поэтому матрица автоматически отобразит правильный slug и CLI.
3. (Необязательно) Переведите устаревшие строковые записи на новый формат AgentSpec в `oma-config.yaml`, когда потребуются переопределения `model`, `effort`, `thinking` или `memory` для конкретных агентов:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. Если вы вносили изменения в `defaults.yaml`, `oma install` предупредит о несовпадении версий вместо того, чтобы перезаписать файл. Перенесите свои настройки в `oma-config.yaml` / `models.yaml`, затем выполните `oma install --update-defaults`, чтобы принять новый SSOT.

Критических изменений для `agent:spawn` нет — устаревшие конфигурации продолжают работать через graceful fallback, пока вы переходите на новый формат в удобном темпе.
