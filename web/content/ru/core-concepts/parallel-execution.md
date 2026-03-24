---
title: Параллельное выполнение
description: Полное руководство по одновременному запуску нескольких агентов oh-my-agent — синтаксис agent:spawn со всеми опциями, инлайн-режим agent:parallel, паттерны с рабочими пространствами, мульти-CLI конфигурация, приоритет определения вендора, мониторинг через дашборды, стратегия ID сессий и анти-паттерны.
---

# Параллельное выполнение

Ключевое преимущество oh-my-agent — одновременная работа нескольких специализированных агентов. Пока бэкенд-агент реализует ваш API, фронтенд-агент создаёт UI, а мобильный агент строит экраны приложения — всё координируется через общую память.

---

## agent:spawn — Запуск одного агента

### Базовый синтаксис

```bash
oma agent:spawn <agent-id> <prompt> <session-id> [options]
```

### Параметры

| Параметр | Обязательный | Описание |
|----------|-------------|---------|
| `agent-id` | Да | Идентификатор агента: `backend`, `frontend`, `mobile`, `db`, `pm`, `qa`, `debug`, `design`, `tf-infra`, `dev-workflow`, `translator`, `orchestrator`, `commit` |
| `prompt` | Да | Описание задачи (строка в кавычках или путь к файлу промпта) |
| `session-id` | Да | Группирует агентов, работающих над одной фичей. Формат: `session-YYYYMMDD-HHMMSS` или любая уникальная строка |
| `options` | Нет | См. таблицу опций ниже |

### Опции

| Флаг | Сокращение | Описание |
|------|-----------|---------|
| `--workspace <path>` | `-w` | Рабочая директория агента. Агенты модифицируют файлы только в этой директории |
| `--vendor <name>` | `-v` | Переопределение CLI-вендора: `gemini`, `claude`, `codex`, `qwen` |
| `--max-turns <n>` | `-t` | Переопределение лимита ходов по умолчанию |
| `--json` | | Вывод результата в JSON |
| `--no-wait` | | Запустить и забыть — вернуться немедленно |

### Примеры

```bash
# Запуск бэкенд-агента с вендором по умолчанию
oma agent:spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Запуск с изоляцией рабочего пространства
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Переопределение вендора
oma agent:spawn frontend "Build login form" session-01 -v claude -w ./apps/web

# Увеличенный лимит ходов
oma agent:spawn backend "Implement payment gateway integration" session-01 -t 30

# Файл промпта
oma agent:spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## Параллельный запуск через фоновые процессы

```bash
# Запуск 3 агентов параллельно
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Блокировать до завершения всех
```

### Паттерн с рабочими пространствами

Всегда назначайте отдельные рабочие пространства при параллельном запуске:

```bash
oma agent:spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent:spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent:spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# После реализации — QA (последовательно)
oma agent:spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel — Инлайн-режим

```bash
oma agent:parallel -i <agent1>:<prompt1> <agent2>:<prompt2> [options]
```

### Примеры

```bash
# Базовое параллельное выполнение
oma agent:parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# С no-wait
oma agent:parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# Все агенты автоматически в одной сессии
oma agent:parallel -i \
  backend:"JWT auth with refresh tokens" \
  frontend:"Login form with email validation" \
  db:"User schema with soft delete and audit trail"
```

---

## Мульти-CLI конфигурация

### Полный пример

```yaml
# .agents/config/user-preferences.yaml
language: en
date_format: "YYYY-MM-DD"
timezone: "Asia/Seoul"
default_cli: gemini

agent_cli_mapping:
  frontend: claude       # Сложные UI-рассуждения
  backend: gemini        # Быстрая генерация API
  mobile: gemini         # Быстрая генерация Flutter
  db: gemini             # Быстрое проектирование схем
  pm: gemini             # Быстрая декомпозиция
  qa: claude             # Тщательный аудит безопасности
  debug: claude          # Глубокий анализ корневых причин
  design: claude         # Нюансированные дизайн-решения
  tf-infra: gemini       # Генерация HCL
  dev-workflow: gemini   # Конфигурация таск-раннера
  translator: claude     # Нюансированный перевод
  orchestrator: gemini   # Быстрая координация
  commit: gemini         # Генерация сообщений коммитов
```

### Приоритет определения вендора

| Приоритет | Источник | Пример |
|-----------|---------|--------|
| 1 (высший) | Флаг `--vendor` | `oma agent:spawn backend "task" session-01 -v claude` |
| 2 | `agent_cli_mapping` | `agent_cli_mapping.backend: gemini` |
| 3 | `default_cli` | `default_cli: gemini` |
| 4 | `active_vendor` | Устаревшая `cli-config.yaml` |
| 5 (низший) | Жёстко закодированный | `gemini` |

---

## Вендор-специфичные методы запуска

| Вендор | Как запускаются | Обработка результатов |
|--------|----------------|----------------------|
| **Claude Code** | `Agent` tool с `.claude/agents/{name}.md`. Несколько вызовов = истинный параллелизм | Синхронный возврат |
| **Codex CLI** | Параллельный субагентный запрос через модель | Вывод JSON |
| **Gemini CLI** | `oh-my-ag agent:spawn` | Опрос MCP-памяти |
| **Antigravity IDE** | Только `oh-my-ag agent:spawn` | Опрос MCP-памяти |
| **CLI Fallback** | `oh-my-ag agent:spawn {agent} {prompt} {session} -w {workspace}` | Опрос файла результатов |

В Claude Code рабочий процесс использует `Agent` tool:
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Несколько вызовов в одном сообщении = истинный параллелизм.

---

## Мониторинг агентов

### Терминальный дашборд

```bash
oma dashboard
```

Живая таблица: ID сессии, статус агентов, количество ходов, последняя активность, прошедшее время. Наблюдает за `.serena/memories/`.

### Веб-дашборд

```bash
oma dashboard:web
# http://localhost:9847
```

Обновления через WebSocket, автопереподключение, цветные индикаторы, потоковый журнал, история сессий.

### Рекомендуемая раскладка

```
┌─────────────────────────┬──────────────────────┐
│ Терминал 1:             │ Терминал 2:          │
│ oma dashboard           │ Команды запуска      │
│ (живой мониторинг)      │ агентов              │
├─────────────────────────┴──────────────────────┤
│ Терминал 3:                                    │
│ Логи тестов/сборки, git-операции               │
└────────────────────────────────────────────────┘
```

### Проверка статуса агента

```bash
oma agent:status <session-id> <agent-id>
```

---

## Стратегия ID сессий

- **Одна сессия на фичу:** Все агенты для «аутентификации» делят `session-auth-01`
- **Формат:** Описательные ID: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Автогенерация:** Оркестратор генерирует `session-YYYYMMDD-HHMMSS`
- **Повторное использование:** Тот же ID при итерациях

ID определяют: файлы памяти, мониторинг дашборда, группировку результатов.

---

## Рекомендации

### Делайте

1. **Зафиксируйте API-контракты** через `/plan` до запуска агентов реализации.
2. **Один ID сессии на фичу** для когерентного мониторинга.
3. **Отдельные рабочие пространства** с `-w` для изоляции.
4. **Активно мониторьте** через дашборд для раннего обнаружения проблем.
5. **QA после реализации:**
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent:spawn qa "Review all changes" session-01
   ```
6. **Итерируйте через перезапуски** с контекстом коррекции.
7. **Начинайте с `/coordinate`** при сомнениях.

### Не делайте

1. **Не запускайте агентов в одном рабочем пространстве** — конфликты файлов.
2. **Не превышайте MAX_PARALLEL (по умолчанию 3)** — ресурсы ограничены.
3. **Не пропускайте планирование** — несогласованные реализации.
4. **Не игнорируйте проваленных агентов** — проверяйте `result-{agent}.md`.
5. **Не смешивайте ID сессий** для связанной работы.

---

## Комплексный пример

```bash
# Шаг 1: Спланировать фичу (через /plan в IDE)

# Шаг 2: Параллельный запуск
oma agent:spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints." session-auth-01 -w ./apps/api &
oma agent:spawn frontend "Build login and registration forms with email validation." session-auth-01 -w ./apps/web &
oma agent:spawn mobile "Create auth screens with biometric login support." session-auth-01 -w ./apps/mobile &

# Шаг 3: Мониторинг (отдельный терминал)
oma dashboard

# Шаг 4: Ожидание
wait

# Шаг 5: QA-ревью
oma agent:spawn qa "Review all auth implementations for OWASP Top 10." session-auth-01

# Шаг 6: Исправления
oma agent:spawn backend "Fix: QA found missing rate limiting on login endpoint." session-auth-01 -w ./apps/api

# Шаг 7: Повторный QA
oma agent:spawn qa "Re-review backend auth after fixes." session-auth-01
```
