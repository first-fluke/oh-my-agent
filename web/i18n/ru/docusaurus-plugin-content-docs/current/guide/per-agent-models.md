---
title: "Руководство: настройка модели для каждого агента"
description: Настройте отдельного CLI-провайдера, модель и уровень рассуждений для каждого агента через RARDO v2.1. Рассматриваются agent_cli_mapping, runtime-профили, oma doctor --profile, models.yaml и лимит квоты сессии.
---

# Руководство: настройка модели для каждого агента

## Обзор

RARDO v2.1 вводит **поагентный выбор модели** через `agent_cli_mapping`. Каждый агент (pm, backend, frontend, qa…) теперь может независимо указывать провайдера, модель и уровень рассуждений — вместо того чтобы делить один глобальный провайдер.

На этой странице:

1. Трёхфайловая иерархия конфигурации
2. Двойной формат `agent_cli_mapping`
3. Пресеты runtime-профилей
4. Команда `oma doctor --profile`
5. Пользовательские slug'и в `models.yaml`
6. Лимит квоты сессии

---

## Иерархия конфигурационных файлов

RARDO v2.1 читает три файла в порядке убывания приоритета:

| Файл | Назначение | Редактировать? |
|:-----|:-----------|:---------------|
| `.agents/config/user-preferences.yaml` | Пользовательские переопределения — маппинг агент→CLI, активный профиль, квота сессии | Да |
| `.agents/config/models.yaml` | Пользовательские slug'и моделей (дополнение ко встроенному реестру) | Да |
| `.agents/config/defaults.yaml` | Встроенный базовый Profile B (4 `runtime_profiles`, безопасные fallback'и) | Нет — SSOT |

> `defaults.yaml` — часть SSOT и не редактируется напрямую. Вся кастомизация идёт через `user-preferences.yaml` и `models.yaml`.

---

## Двойной формат `agent_cli_mapping`

`agent_cli_mapping` принимает две формы значения, что позволяет мигрировать постепенно:

```yaml
# .agents/config/user-preferences.yaml
agent_cli_mapping:
  pm: "claude"                        # устаревший — только провайдер (дефолтная модель)
  backend:                            # новый объект AgentSpec
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
    effort: low
```

**Устаревшая строковая форма**: `agent: "vendor"` — продолжает работать, использует дефолтную модель и effort провайдера.

**Форма объекта AgentSpec**: `agent: { model, effort }` — фиксирует конкретный slug модели и уровень рассуждений (`low`, `medium`, `high`).

Формы можно свободно смешивать. Необъявленные агенты отваливаются к активному `runtime_profile`.

---

## Runtime-профили

`defaults.yaml` поставляется с Profile B и четырьмя готовыми `runtime_profiles`. Выберите один в `user-preferences.yaml`:

```yaml
# .agents/config/user-preferences.yaml
active_profile: claude-only   # см. опции ниже
```

| Профиль | Все агенты идут в | Когда использовать |
|:--------|:------------------|:-------------------|
| `claude-only` | Claude Code (Sonnet/Opus) | Единый стек Anthropic |
| `codex-only` | OpenAI Codex (GPT-5.x) | Чистый стек OpenAI |
| `gemini-only` | Gemini CLI | Воркфлоу на Google |
| `antigravity` | Микс: pm→claude, backend→codex, qa→gemini | Комбинировать сильные стороны провайдеров |
| `qwen-only` | Qwen CLI | Локальный / self-hosted инференс |

Профили — быстрый способ переназначить всю армию агентов, не редактируя каждую строку.

---

## `oma doctor --profile`

Новый флаг `--profile` печатает матрицу разрешённых провайдера, модели и effort для каждого агента **после** слияния всех трёх файлов конфигурации.

```bash
oma doctor --profile
```

**Пример вывода:**

```
RARDO v2.1 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4.7           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3-pro                low      profile:antigravity
architecture  claude    claude-opus-4.7             high     defaults
docs          claude    claude-sonnet-4.7           low      defaults

Session quota cap:
  tokens:       2,000,000
  spawn_count:  40
  per_vendor:   { claude: 1.2M, openai: 600K, google: 200K }
```

Когда субагент неожиданно выбрал другого провайдера — запускайте это первым. Колонка `Source` подскажет, какой слой конфигурации победил.

---

## Добавление slug'ов в `models.yaml`

`models.yaml` — опциональный файл, в котором можно зарегистрировать slug'и моделей, ещё отсутствующих во встроенном реестре (удобно для только что выпущенных моделей).

```yaml
# .agents/config/models.yaml
models:
  - slug: "openai/gpt-5.5-spud"
    vendor: openai
    context_window: 1_000_000
    supports_effort: true
    default_effort: medium
    notes: "Preview — release-кандидат GPT-5.5 Spud"
```

После регистрации slug становится доступен в `agent_cli_mapping`:

```yaml
agent_cli_mapping:
  backend:
    model: "openai/gpt-5.5-spud"
    effort: high
```

Slug'и — это идентификаторы. Сохраняйте точное английское написание, опубликованное провайдером.

---

## Лимит квоты сессии

Добавьте `session.quota_cap` в `user-preferences.yaml`, чтобы ограничить неконтролируемый спаун субагентов:

```yaml
# .agents/config/user-preferences.yaml
session:
  quota_cap:
    tokens: 2_000_000        # общий потолок токенов на сессию
    spawn_count: 40          # макс. субагентов параллельно + последовательно
    per_vendor:              # подлимиты токенов по провайдерам
      claude: 1_200_000
      openai: 600_000
      google: 200_000
```

При достижении лимита оркестратор отказывает в новых спаунах и возвращает статус `QUOTA_EXCEEDED`. Оставьте поле пустым (или пропустите `quota_cap` целиком) — соответствующее измерение отключится.

---

## Всё вместе

Реалистичный `user-preferences.yaml`:

```yaml
active_profile: antigravity

agent_cli_mapping:
  pm: "claude"
  backend:
    model: "openai/gpt-5.3-codex"
    effort: high
  frontend:
    model: "anthropic/claude-sonnet-4.7"
    effort: medium
  qa:
    model: "google/gemini-3-pro"
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

Проверьте результат через `oma doctor --profile` и запускайте воркфлоу как обычно.
