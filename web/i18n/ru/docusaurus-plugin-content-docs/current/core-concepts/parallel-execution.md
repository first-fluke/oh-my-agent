---
title: Параллельное выполнение
description: Параллельный запуск нескольких ролей dispatch OMA с актуальным синтаксисом CLI, файлами задач, инлайн-режимом, изоляцией рабочих пространств, определением модели и вендора, мониторингом, ID сессий и паттернами восстановления.
---

# Параллельное выполнение

Ключевое преимущество oh-my-agent — одновременная работа нескольких специализированных агентов. Пока бэкенд-агент реализует ваш API, фронтенд-агент создаёт UI, а мобильный агент строит экраны приложения — оркестратор координирует их через долговечное состояние запусков и квитанции.

---

## agent spawn — Запуск одного агента

### Базовый синтаксис

```bash
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

### Параметры

| Параметр | Обязательный | Описание |
|----------|--------|---------------|
| `agent-id` | Да | Каноническая роль dispatch: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` или `explore` |
| `prompt` | Да | Описание задачи (строка в кавычках или путь к файлу промпта) |
| `session-id` | Да | Группирует агентов, работающих над одной фичей. Формат: `session-YYYYMMDD-HHMMSS` или любая уникальная строка |
| `options` | Нет | См. таблицу опций ниже |

### Опции

| Флаг | Сокращение | Описание |
|------|-------|--------|
| `--workspace <path>` | `-w` | Рабочая директория агента. Агенты модифицируют файлы только в этой директории |
| `--vendor <vendor>` | | Переопределение CLI-вендора для этого запуска (`antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` или `pi`) |
| `--resumed-from <run-id>` | | Связывает повторный запуск с предыдущим запуском, подтверждённым evidence |
| `--fallback-vendors <vendors>` | | Упорядоченные fallback-вендоры через запятую, если основной запуск невозможен |
| `--task-id <id>` | | Привязывает запуск к ID задачи из плана сессии |
| `--isolation <mode>` | | `worktree` создаёт новый git worktree во временном каталоге OMA; он остаётся для review и merge/discard |
| `--read-only` | | Ограничивает запущенного агента неразрушающими инструментами |

### Примеры

```bash
# Spawn a backend agent with default vendor
oma agent spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawn with workspace isolation
oma agent spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Override the CLI vendor for this specific spawn
oma agent spawn frontend "Build login form" session-01 --vendor claude -w ./apps/web

# Retry a run while preserving its evidence chain
oma agent spawn backend "Fix the payment gateway issue" session-01 --resumed-from run-123

# Use a prompt file instead of inline text
oma agent spawn backend ./prompts/auth-api.md session-01 -w ./apps/api

# Run inside an isolated git worktree (hypothesis spawn pattern)
oma agent spawn backend "Try a Drizzle-based rewrite" session-01 --isolation worktree
```

---

## Параллельный запуск через фоновые процессы

Чтобы запустить нескольких агентов одновременно, используйте фоновые процессы shell:

```bash
# Spawn 3 agents in parallel
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Block until all agents complete
```

Символ `&` запускает каждый процесс в фоне, а `wait` блокирует shell до завершения всех фоновых процессов.

### Паттерн с рабочими пространствами {#workspace-aware-pattern}

Всегда назначайте отдельные рабочие пространства при параллельном запуске, чтобы избежать конфликтов файлов:

```bash
# Full-stack parallel execution
oma agent spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# After implementation, run QA (sequential; depends on implementation)
oma agent spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent parallel — Инлайн-режим

Для более краткого синтаксиса, который автоматически управляет фоновыми процессами:

### Синтаксис

```bash
oma agent parallel --inline "<agent1>:<prompt1>" "<agent2>:<prompt2>" [options]
```

### Примеры

```bash
# Basic parallel execution
oma agent parallel --inline \
  "backend:Implement auth API" \
  "frontend:Build login form" \
  "mobile:Auth screens"

# With no-wait (fire and forget)
oma agent parallel --inline "backend:Auth API" "frontend:Login form" --no-wait

# All agents share the same session automatically
oma agent parallel --inline \
  "backend:JWT auth with refresh tokens" \
  "frontend:Login form with email validation" \
  "db:User schema with soft delete and audit trail" \
  --session session-auth-01
```

Флаг `--inline` разбирает каждый аргумент `agent:task`. Если задаче нужен определённый workspace, добавьте третий путь через двоеточие: `agent:task:workspace`. Без `--inline` передайте YAML-файл задач с `{tasks: [{id?, agent, task, workspace?}]}`. Флаг `--session` связывает результаты параллельного запуска с существующей сессией.

---

## Мульти-CLI конфигурация

oh-my-agent направляет каждого агента в подходящий CLI через `model_preset` в `.agents/oma-config.yaml`. Выберите встроенный пресет для своего вендора и при необходимости переопределите отдельных агентов.

### Пример конфигурации

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed   # mixed: Claude for coordination, Codex for implementation/explore

# Override specific agents on top of the preset
agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }
  backend:  { model: openai/gpt-5.5, effort: high }
```

Встроенные пресеты: `auto`, `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` и `mixed`. Подробности — [Модели по агентам](../guide/per-agent-models.md).

### Определение вендора

Когда `oma agent spawn` определяет, какой CLI использовать:

| Приоритет | Источник | Пример |
|----------|--------|---------|
| 1 (высший) | флаг `--vendor` | `oma agent spawn backend "task" session-01 --vendor claude` |
| 2 | переопределение `agents:` в `oma-config.yaml` | `agents: { backend: { model: openai/gpt-5.5 } }` |
| 3 | значения агента из активного `model_preset` | поиск роли агента в пресете |

Флаг `--vendor` всегда побеждает. Если флага нет, система смотрит переопределения `agents:`, затем значения пресета, затем настроенный fallback CLI. При `model_preset: auto` модель определяется нативными настройками текущего runtime.

---

## Вендор-специфичные методы запуска

Механизм запуска зависит от IDE/CLI:

| Вендор | Как запускаются | Обработка результатов |
|--------|----------------|----------------------|
| **Claude Code** | Задачи того же вендора используют Agent tool с `.claude/agents/{name}.md`; межвендорные задачи переходят к `oma agent spawn` | Синхронный возврат |
| **Codex CLI** | Задачи того же вендора используют нативных custom agents из `.codex/agents/{name}.toml`; межвендорные задачи переходят к `oma agent spawn` | Вывод JSON |
| **Antigravity CLI/IDE** | `oma agent spawn` через runtime `agy`; нативные custom subagents не требуются | Надёжная квитанция и опрос файла результата |
| **Cursor** | Использует сгенерированную интеграцию Cursor, если доступна; иначе `oma agent spawn` | Опрос файла результата |
| **OpenCode / pi** | Использует встроенный extension bridge, когда выбран; межвендорная работа выполняется через `oma agent spawn` | Опрос файла результата |
| **CLI Fallback** | `oma agent spawn {agent} {prompt} {session} -w {workspace}` | Опрос результатов, подтверждённых evidence |

В Claude Code workflow напрямую использует инструмент `Agent`:
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Несколько вызовов `Agent` в одном сообщении выполняются действительно параллельно, без последовательного ожидания.

То же правило dispatch применяется между вендорами:

1. Разрешите `target_vendor_for_agent` из `.agents/oma-config.yaml`
2. Если он совпадает с вендором текущего runtime, используйте нативный файл агента этого вендора
3. Если не совпадает, для этого агента используйте только `oma agent spawn`

---

## Мониторинг агентов

### Терминальный дашборд

```bash
oma dashboard terminal
```

Показывает живую таблицу с:
- ID сессии и общим статусом
- статусом каждого агента (running, completed, failed)
- количеством ходов
- последней активностью из progress-файлов
- прошедшим временем

Дашборд наблюдает за `.agents/state/memories/` и обновляется по мере записи progress-файлов агентами.

### Веб-дашборд

```bash
oma dashboard web
# Opens http://localhost:9847
```

Возможности:
- обновления в реальном времени через WebSocket
- автоматическое переподключение при потере соединения
- цветные индикаторы статусов агентов
- поток журнала активности из progress и result-файлов
- история сессий

### Рекомендуемая раскладка

Для наглядности используйте 3 терминала:

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard terminal         │   Agent spawn        │
│   (live monitoring)     │   commands           │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Test/build logs, git operations              │
│                                                │
└────────────────────────────────────────────────┘
```

### Проверка статуса агента

```bash
oma agent status <session-id> <agent-id>
```

Возвращает текущий статус конкретного агента: running, completed или failed, а также количество ходов и последнюю активность.

---

## Стратегия ID сессий

ID сессий группируют агентов, работающих над одной фичей. Рекомендации:

- **Одна сессия на фичу:** Все агенты для «аутентификации» делят `session-auth-01`
- **Формат:** Описательные ID: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Автогенерация:** Оркестратор генерирует `session-YYYYMMDD-HHMMSS`
- **Повторное использование:** Тот же ID при итерациях

ID определяют файлы памяти, мониторинг дашборда и группировку результатов. Run-scoped memory-файлы включают `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` и `result-{agentId}-{taskId}-{runId}-{sessionId}.md`.

---

## Рекомендации

### Делайте

1. **Зафиксируйте API-контракты** через `/plan` до запуска агентов реализации.
2. **Один ID сессии на фичу** для когерентного мониторинга.
3. **Отдельные рабочие пространства** с `-w` для изоляции:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   ```
4. **Активно мониторьте** через дашборд для раннего обнаружения проблем.
5. **QA после реализации:**
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent spawn qa "Review all changes" session-01
   ```
6. **Итерируйте через перезапуски** с контекстом коррекции.
7. **Начинайте с `/work`** при сомнениях.

### Не делайте

1. **Не запускайте агентов в одном рабочем пространстве** — конфликты файлов.
2. **Не превышайте MAX_PARALLEL (по умолчанию 3)** — ресурсы ограничены.
3. **Не пропускайте планирование** — несогласованные реализации.
4. **Не игнорируйте проваленных агентов** — проверяйте их структурированный claim или run-scoped файл результата, исправьте промпт и перезапустите.
5. **Не смешивайте ID сессий** для связанной работы.

---

## Комплексный пример

Полный workflow параллельного выполнения для создания фичи аутентификации пользователей:

```bash
# Step 1: Plan the feature
# (In your AI IDE, run /plan or describe the feature)
# This creates .agents/results/plan-{sessionId}.json with task breakdown

# Step 2: Spawn implementation agents in parallel
oma agent spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use Argon2id for password hashing. Follow the API contract in .agents/results/api-contracts/" session-auth-01 -w ./apps/api &
oma agent spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: Monitor in a separate terminal
# Terminal 2:
oma dashboard terminal

# Step 4: Wait for all implementation agents
wait

# Step 5: Run QA review
oma agent spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 6: If QA finds issues, re-spawn specific agents with fixes
oma agent spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 7: Re-run QA to verify fixes
oma agent spawn qa "Re-review backend auth after fixes." session-auth-01
```
