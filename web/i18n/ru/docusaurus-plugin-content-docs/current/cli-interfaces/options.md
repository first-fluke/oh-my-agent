---
title: "Опции CLI"
description: Исчерпывающий справочник по всем опциям CLI — глобальные флаги, управление выводом, опции по командам и практические паттерны использования.
---

# Опции CLI

## Глобальные опции

| Флаг | Описание |
|------|---------|
| `-V, --version` | Показать номер версии и выйти |
| `-h, --help` | Показать справку по команде |

Все подкоманды также поддерживают `-h, --help`.

---

## Опции вывода

Три способа запросить JSON-вывод по приоритету:

### 1. Флаг --json

```bash
oma stats --json
oma doctor --json
```

Доступен для: `doctor`, `stats`, `retro`, `cleanup`, `auth:status`, `memory:init`, `verify`, `visualize`.

### 2. Флаг --output

```bash
oma stats --output json
oma doctor --output text
```

Принимает `text` или `json`. При невалидном значении: `Invalid output format: {value}. Expected one of text, json`.

### 3. Переменная OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats    # выдаёт JSON
oma doctor   # выдаёт JSON
```

**Приоритет:** `--json` > `--output` > `OH_MY_AG_OUTPUT_FORMAT` > `text` (по умолчанию).

### Команды с JSON-выводом

| Команда | `--json` | `--output` | Примечания |
|---------|---------|----------|-----------|
| `doctor` | Да | Да | CLI, MCP, навыки |
| `stats` | Да | Да | Полный объект метрик |
| `retro` | Да | Да | Снапшот с метриками, авторами |
| `cleanup` | Да | Да | Список очищенного |
| `auth:status` | Да | Да | Статус аутентификации |
| `memory:init` | Да | Да | Результат инициализации |
| `verify` | Да | Да | Результаты проверок |
| `visualize` | Да | Да | Граф зависимостей |
| `describe` | Всегда JSON | N/A | Команда интроспекции |

---

## Опции по командам

### update

```
oma update [-f | --force] [--ci]
```

| Флаг | Описание |
|------|---------|
| `--force` / `-f` | Перезаписать: `oma-config.yaml`, `mcp.json`, `stack/`. Без флага — бэкап и восстановление |
| `--ci` | Неинтерактивный режим: без промптов, без спиннеров, ошибки через throw |

### stats

```
oma stats [--json] [--output <format>] [--reset]
```

`--reset` — сброс всех метрик (удаляет и пересоздаёт `.serena/metrics.json`).

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Флаг | Описание |
|------|---------|
| `--interactive` | Интерактивный ввод дополнительного контекста |
| `--compare` | Сравнение с предыдущим периодом той же длины |

Формат window: `7d`, `2w`, `1m`. По умолчанию: 7 дней.

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json]
```

| Флаг | Описание |
|------|---------|
| `--dry-run` | Показать что будет очищено, без действий |
| `--yes` / `-y` | Без подтверждений — очистить всё |

Очищает: осиротевшие PID-файлы (`/tmp/subagent-*.pid`), логи (`/tmp/subagent-*.log`), директории Gemini Antigravity.

### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

| Флаг | Описание |
|------|---------|
| `--model` / `-m` | Переопределение вендора: `gemini`, `claude`, `codex`, `qwen` |
| `--workspace` / `-w` | Рабочая директория. Автоопределение из конфигов монорепозитория |

**Валидация:** `agent-id` из списка, `session-id` без `..`, `?`, `#`, `%`, управляющих символов.

**Вендор-специфичное поведение:**

| Вендор | Команда | Auto-approve | Промпт |
|--------|---------|-------------|--------|
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | (нет) | `-p` |
| codex | `codex` | `--full-auto` | позиционный |
| qwen | `qwen` | `--yolo` | `-p` |

### agent:status

`--root` / `-r` — корневой путь для файлов памяти и PID.

Логика определения статуса:
1. Файл `result-{agent}.md` существует -> `completed`
2. PID-файл существует, процесс жив -> `running`
3. PID-файл есть, процесс мёртв -> `crashed`
4. Ничего нет -> `crashed`

### agent:parallel

| Флаг | Описание |
|------|---------|
| `--model` / `-m` | Вендор для всех агентов |
| `--inline` / `-i` | Инлайн-формат `agent:task[:workspace]` |
| `--no-wait` | Фоновый режим — запуск без ожидания |

Инлайн-формат: рабочее пространство определяется если последний сегмент начинается с `./`, `/` или равен `.`.

### memory:init

`--force` — перезаписать существующие файлы схемы.

### verify

`--workspace` / `-w` — путь к рабочему пространству для верификации.

---

## Практические примеры

### CI: обновление и проверка

```bash
oma update --ci
oma doctor --json | jq '.healthy'
```

### Автоматический сбор метрик

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Пакетный запуск с мониторингом

```bash
oma agent:parallel tasks.yaml --no-wait
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### Очистка в CI

```bash
oma cleanup --yes --json
```

### Верификация по рабочим пространствам

```bash
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### Ретро для спринта

```bash
oma retro 2w --compare
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Полный скрипт проверки здоровья

```bash
#!/bin/bash
set -e
echo "=== oh-my-agent Health Check ==="
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'
oma auth:status --json | jq -r '.[] | "\(.name): \(.status)"'
oma stats --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'
echo "=== Done ==="
```

### Интроспекция для ИИ-агентов

```bash
oma describe | jq '.command.subcommands[] | {name, description}'
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
