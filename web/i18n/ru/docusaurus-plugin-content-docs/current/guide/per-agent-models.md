---
title: "Руководство: настройка модели для каждого агента"
description: Настройте отдельного CLI-провайдера, модель и уровень рассуждений для каждого агента через oma-config.yaml и models.yaml. Рассматриваются agent_cli_mapping, runtime-профили, oma doctor --profile, models.yaml и лимит квоты сессии.
---

# Руководство: настройка модели для каждого агента

## Обзор

 вводит **поагентный выбор модели** через `agent_cli_mapping`. Каждый агент (pm, backend, frontend, qa…) теперь может независимо указывать провайдера, модель и уровень рассуждений — вместо того чтобы делить один глобальный провайдер.

На этой странице:

1. Трёхфайловая иерархия конфигурации
2. Двойной формат `agent_cli_mapping`
3. Пресеты runtime-профилей
4. Команда `oma doctor --profile`
5. Пользовательские slug'и в `models.yaml`
6. Лимит квоты сессии

---

## Иерархия конфигурационных файлов

 читает три файла в порядке убывания приоритета:

| Файл | Назначение | Редактировать? |
|:-----|:-----------|:---------------|
| `.agents/oma-config.yaml` | Пользовательские переопределения — маппинг агент→CLI, активный профиль, квота сессии | Да |
| `.agents/config/models.yaml` | Пользовательские slug'и моделей (дополнение ко встроенному реестру) | Да |
| `.agents/config/defaults.yaml` | Встроенный базовый Profile B (4 `runtime_profiles`, безопасные fallback'и) | Нет — SSOT |

> `defaults.yaml` — часть SSOT и не редактируется напрямую. Вся кастомизация идёт через `user-preferences.yaml` и `models.yaml`.

---

## Двойной формат `agent_cli_mapping`

`agent_cli_mapping` принимает две формы значения, что позволяет мигрировать постепенно:

```yaml
# .agents/oma-config.yaml
agent_cli_mapping:
  pm: "claude"                        # устаревший — только провайдер (дефолтная модель)
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

**Устаревшая строковая форма**: `agent: "vendor"` — продолжает работать, использует дефолтную модель и effort провайдера.

**Форма объекта AgentSpec**: `agent: { model, effort }` — фиксирует конкретный slug модели и уровень рассуждений (`low`, `medium`, `high`).

Формы можно свободно смешивать. Необъявленные агенты отваливаются к активному `runtime_profile`.

---

## Runtime-профили

`defaults.yaml` поставляется с Profile B и четырьмя готовыми `runtime_profiles`. Выберите один в `user-preferences.yaml`:

```yaml
# .agents/oma-config.yaml
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
 — Active Profile: antigravity

Agent         Vendor    Model                       Effort   Source
------------  --------  --------------------------  -------  ------------------
pm            claude    claude-sonnet-4-6           medium   user-preferences
backend       openai    gpt-5.3-codex               high     user-preferences
frontend      openai    gpt-5.3-codex               medium   profile:antigravity
qa            google    gemini-3.1-pro-preview              low      profile:antigravity
architecture  claude    claude-opus-4-7             high     defaults
docs          claude    claude-sonnet-4-6           low      defaults

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
# .agents/oma-config.yaml
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

Проверьте результат через `oma doctor --profile` и запускайте воркфлоу как обычно.


## Config file ownership

| File | Owner | Safe to edit? |
|------|-------|---------------|
| `.agents/config/defaults.yaml` | **SSOT shipped with oh-my-agent** | ❌ Treat as read-only |
| `.agents/oma-config.yaml` | You | ✅ Customize here |
| `.agents/config/models.yaml` | You | ✅ Add new slugs here |

`defaults.yaml` carries a `version:` field so new OMA releases can add runtime_profiles, new Profile B slugs, or adjust the effort matrix. Editing it directly means you will not receive those upgrades automatically.

## Upgrading defaults.yaml

When you pull a newer oh-my-agent release, run `oma install` — the installer compares your local `defaults.yaml` version against the bundled one:

- **Match** → no change, silent.
- **Mismatch** → warning:
  ```
  [install] .agents/config/defaults.yaml is 2.1.0; bundled is 2.2.0.
            Run 'oma install --update-defaults' to upgrade.
  ```
- **Mismatch + `--update-defaults`** → the bundled version overwrites yours:
  ```
  oma install --update-defaults
  # [install] Updated .agents/config/defaults.yaml (2.1.0 → 2.2.0)
  ```

Your `user-preferences.yaml` and `models.yaml` are never touched by the installer.

## Upgrading from a pre-5.16.0 install

If your project predates the per-agent model/effort feature:

1. Run `oma install` from your project root. The installer drops a fresh `defaults.yaml` into `.agents/config/` and preserves your existing `oma-config.yaml`.
2. Run `oma doctor --profile`. Your legacy `agent_cli_mapping: { backend: "gemini" }` values are now resolved through `runtime_profiles.gemini-only.agent_defaults.backend`, so the matrix shows the correct slug and CLI automatically.
3. (Optional) Move custom agent settings from `oma-config.yaml` into the new `user-preferences.yaml` using the AgentSpec form if you want per-agent `model`, `effort`, `thinking`, or `memory` overrides:
   ```yaml
   agent_cli_mapping:
     backend:
       model: "openai/gpt-5.3-codex"
       effort: "high"
   ```
4. If you ever customized `defaults.yaml`, `oma install` will warn about the version mismatch instead of overwriting. Move your customizations into `user-preferences.yaml` / `models.yaml`, then run `oma install --update-defaults` to accept the new SSOT.

No breaking changes to `agent:spawn` — legacy configs keep working through graceful fallback while you migrate at your own pace.
