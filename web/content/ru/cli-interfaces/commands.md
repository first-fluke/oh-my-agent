---
title: "Команды CLI"
description: Полный справочник по всем командам CLI oh-my-agent — синтаксис, опции, примеры, организованные по категориям.
---

# Команды CLI

После глобальной установки (`bun install --global oh-my-agent`) используйте `oma` или `oh-my-agent`. Для одноразового использования: `npx oh-my-agent`.

Переменная окружения `OH_MY_AG_OUTPUT_FORMAT` со значением `json` принудительно включает машиночитаемый вывод для поддерживающих команд. Эквивалентно `--json`.

---

## Настройка и установка

### oma (install)

Команда по умолчанию без аргументов запускает интерактивный установщик.

```bash
cd /path/to/my-project
oma
```

Выполняет: проверку миграции с `.agent/`, обнаружение конкурентов, выбор пресета, загрузку тарбола, установку навыков/рабочих процессов/конфигов, создание символических ссылок, настройку git rerere и MCP.

### doctor

Проверка здоровья: CLI, MCP, навыки.

```bash
oma doctor [--json] [--output <format>]
```

Проверяет: установку CLI (gemini, claude, codex, qwen), аутентификацию, конфигурацию MCP, установленные навыки.

### update

Обновление навыков до последней версии.

```bash
oma update [-f | --force] [--ci]
```

`--force` — перезаписать конфиги. `--ci` — неинтерактивный режим для CI.

---

## Мониторинг и метрики

### dashboard

```bash
oma dashboard
MEMORIES_DIR=/path/to/.serena/memories oma dashboard
```

Box-drawing TUI. Наблюдает за `.serena/memories/`. `Ctrl+C` для выхода.

### dashboard:web

```bash
oma dashboard:web
DASHBOARD_PORT=8080 oma dashboard:web
```

HTTP + WebSocket на `http://localhost:9847`.

### stats

```bash
oma stats [--json] [--output <format>] [--reset]
```

Метрики: сессии, использованные навыки, задачи, время, файлы, строки. Данные в `.serena/metrics.json`.

### retro

```bash
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

Ретроспектива: `7d`, `2w`, `1m`. С `--compare` — сравнение с предыдущим периодом. Показывает: коммиты, авторов, типы коммитов, горячие файлы.

---

## Управление агентами

### agent:spawn

```bash
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

`agent-id`: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

Определение вендора: `--model` > `agent_cli_mapping` > `default_cli` > `active_vendor` > `gemini`.

Промпт: инлайн-текст или путь к файлу. Вендор-протоколы добавляются автоматически.

### agent:status

```bash
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

Вывод: `{agent-id}:{status}` (completed/running/crashed).

### agent:parallel

```bash
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

YAML-файл задач или инлайн `agent:task[:workspace]`. Результаты: `.agents/results/parallel-{timestamp}/`.

### agent:review

Запуск код-ревью с помощью внешнего AI CLI (codex, claude, gemini или qwen).

```bash
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Опции:**

| Флаг | Описание |
|:-----|:---------|
| `-m, --model <vendor>` | CLI-вендор: `codex`, `claude`, `gemini`, `qwen`. По умолчанию — из конфигурации. |
| `-p, --prompt <prompt>` | Пользовательский промпт ревью. Если не указан, используется промпт по умолчанию. |
| `-w, --workspace <path>` | Путь для ревью. По умолчанию — текущая директория. |
| `--no-uncommitted` | Пропустить незакоммиченные изменения. Ревью только закоммиченных изменений в рамках сессии. |

**Что делает:**
- Автоматически определяет ID текущей сессии из окружения или недавней git-активности.
- Для `codex`: использует встроенную подкоманду `codex review`.
- Для `claude`, `gemini`, `qwen`: формирует промпт ревью и вызывает CLI с ним.
- По умолчанию ревьюит незакоммиченные изменения в рабочей директории.
- С `--no-uncommitted` ревьюит только изменения, закоммиченные в рамках текущей сессии.

**Примеры:**
```bash
# Ревью незакоммиченных изменений с вендором по умолчанию
oma agent:review

# Ревью через codex (встроенная команда codex review)
oma agent:review -m codex

# Ревью через claude с пользовательским промптом
oma agent:review -m claude -p "Фокус на уязвимостях безопасности и валидации входных данных"

# Ревью определённого пути
oma agent:review -w ./apps/api

# Ревью только закоммиченных изменений
oma agent:review --no-uncommitted

# Ревью закоммиченных изменений в определённом рабочем пространстве через gemini
oma agent:review -m gemini -w ./apps/web --no-uncommitted
```

---

## Управление памятью

### memory:init

```bash
oma memory:init [--json] [--output <format>] [--force]
```

Создаёт структуру `.serena/memories/` с начальными файлами схемы.

---

## Интеграция и утилиты

### auth:status

```bash
oma auth:status [--json]
```

Проверяет: Gemini (API key), Claude (API key/OAuth), Codex (API key), Qwen (API key).

### usage:anti

```bash
oma usage:anti [--json] [--raw]
```

Квоты использования моделей из локального Antigravity IDE.

### bridge

```bash
oma bridge [url]
```

Мост: Antigravity IDE (stdio) <-> Serena Server (HTTP).

### verify

```bash
oma verify <agent-type> [-w <workspace>] [--json]
```

Верификация вывода агента: сборка, тесты, соответствие объёму.

### cleanup

```bash
oma cleanup [--dry-run] [-y | --yes] [--json]
```

Очистка: осиротевшие PID-файлы, логи, директории Gemini Antigravity.

### visualize

```bash
oma visualize [--json]
oma viz [--json]   # Алиас
```

Граф зависимостей: навыки, агенты, рабочие процессы, общие ресурсы.

### star

```bash
oma star
```

Поставить звезду `first-fluke/oh-my-agent` на GitHub. Требуется `gh` CLI.

### describe

```bash
oma describe [command-path]
```

JSON-описание команд для интроспекции ИИ-агентами.

### help / version

```bash
oma help
oma version
```

---

## Переменные окружения

| Переменная | Описание | Используется |
|-----------|---------|-------------|
| `OH_MY_AG_OUTPUT_FORMAT` | `json` — принудительный JSON | Все с `--json` |
| `DASHBOARD_PORT` | Порт веб-дашборда | `dashboard:web` |
| `MEMORIES_DIR` | Путь к директории памяти | `dashboard`, `dashboard:web` |

---

## Алиасы

| Алиас | Полная команда |
|-------|---------------|
| `viz` | `visualize` |
