---
title: Параллельное выполнение
description: Параллельный запуск нескольких ролей dispatch OMA с актуальным синтаксисом CLI, файлами задач, инлайн-режимом, изоляцией рабочих пространств, определением модели и вендора, мониторингом, ID сессий и паттернами восстановления.
---

# Параллельное выполнение

Ключевое преимущество oh-my-agent — одновременная работа нескольких специализированных агентов. Пока бэкенд-агент реализует ваш API, фронтенд-агент создаёт UI, а мобильный агент строит экраны приложения — оркестратор координирует их через долговечное состояние запусков и квитанции.

---

## oma agent spawn: запуск одного агента {#agentspawn-single-agent-spawning}

### Базовый синтаксис {#basic-syntax}

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

## Параллельный запуск через фоновые процессы {#parallel-spawning-with-background-processes}

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

## oma agent parallel: инлайн-режим {#agentparallel-inline-parallel-mode}

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
  --session-id session-auth-01
```

Флаг `--inline` разбирает каждый аргумент `agent:task`. Если задаче нужен определённый workspace, добавьте третий путь через двоеточие: `agent:task:workspace`. Без `--inline` передайте YAML-файл задач с `{tasks: [{id?, agent, task, workspace?}]}`. Флаг `--session-id` привязывает результаты к существующей сессии и к ID задач из YAML-файла.

---

## Мульти-CLI конфигурация {#multi-cli-configuration}

oh-my-agent направляет каждого агента в подходящий CLI через `model_preset` в `.agents/oma-config.yaml`. Выберите встроенный пресет для своего вендора и при необходимости переопределите отдельных агентов.

### Пример конфигурации {#configuration-example}

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

### Определение вендора {#vendor-resolution}

Когда `oma agent spawn` определяет, какой CLI использовать:

| Приоритет | Источник | Пример |
|----------|--------|---------|
| 1 (высший) | флаг `--vendor` | `oma agent spawn backend "task" session-01 --vendor claude` |
| 2 | переопределение `agents:` в `oma-config.yaml` | `agents: { backend: { model: openai/gpt-5.5 } }` |
| 3 | значения агента из активного `model_preset` | поиск роли агента в пресете |

Флаг `--vendor` всегда побеждает. Если флага нет, система смотрит переопределения `agents:`, затем значения пресета, затем настроенный fallback CLI. При `model_preset: auto` модель определяется нативными настройками текущего runtime.

---

## Вендор-специфичные методы запуска {#vendor-specific-spawn-methods}

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

```text
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Несколько вызовов `Agent` в одном сообщении выполняются действительно параллельно, без последовательного ожидания.

То же правило dispatch применяется между вендорами:

1. Разрешите `target_vendor_for_agent` из `.agents/oma-config.yaml`
2. Если он совпадает с вендором текущего runtime, используйте нативный файл агента этого вендора
3. Если не совпадает, для этого агента используйте только `oma agent spawn`

---

## Мониторинг агентов {#monitoring-agents}

### Терминальный дашборд {#terminal-dashboard}

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

### Веб-дашборд {#web-dashboard}

```bash
oma dashboard web
# Serves the dashboard at http://127.0.0.1:9847
```

Возможности:
- обновления в реальном времени через WebSocket
- автоматическое переподключение при потере соединения
- цветные индикаторы статусов агентов
- поток журнала активности из progress и result-файлов
- история сессий

### Рекомендуемая раскладка терминалов {#recommended-terminal-layout}

Для наглядности используйте 3 терминала:

| Терминал | Что запускать | Назначение |
|----------|---------------|------------|
| 1 | `oma dashboard terminal` | Мониторинг в реальном времени |
| 2 | `oma agent spawn …` или `oma agent parallel …` | Команды запуска агентов |
| 3 | Тесты, логи сборки, git | Проверка и операции git |

### Проверка статуса отдельного агента {#checking-individual-agent-status}

```bash
oma agent status <session-id> <agent-id>
```

Возвращает текущий статус конкретного агента: running, completed или failed, а также количество ходов и последнюю активность.

---

## Стратегия ID сессий {#session-id-strategy}

ID сессий группируют агентов, работающих над одной фичей. Рекомендации:

- **Одна сессия на фичу:** Все агенты, работающие над «аутентификацией пользователей», делят `session-auth-01`
- **Формат:** Используйте описательные ID: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Автогенерация:** Оркестратор генерирует ID в формате `session-YYYYMMDD-HHMMSS`
- **Повторное использование при итерациях:** Используйте тот же ID сессии при повторном запуске агентов с уточнениями

ID сессии определяет:
- какие run-scoped файлы памяти агенты читают и записывают (`progress-{agentId}-{taskId}-{runId}-{sessionId}.md`, `result-{agentId}-{taskId}-{runId}-{sessionId}.md`)
- что отслеживает дашборд
- как группируются результаты в итоговом отчёте

---

## Советы по параллельному выполнению {#tips-for-parallel-execution}

### Делайте {#do}

1. **Сначала зафиксируйте API-контракты.** Запустите `/plan` до запуска агентов реализации, чтобы фронтенд- и бэкенд-агенты согласовали эндпоинты, схемы запросов и ответов и форматы ошибок.

2. **Используйте один ID сессии на фичу.** Так результаты агентов остаются сгруппированными, а мониторинг через дашборд — согласованным.

3. **Назначайте отдельные рабочие пространства.** Всегда используйте `-w` для изоляции агентов:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Активно отслеживайте работу.** Откройте терминал с дашбордом, чтобы рано замечать проблемы. Сбойный агент тратит ходы впустую, если его вовремя не заметить.

5. **Запускайте QA после реализации.** Запускайте QA-агента последовательно, после завершения всех агентов реализации:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent spawn qa "Review all changes" session-01
   ```

6. **Итерируйте через перезапуски.** Если результат агента нужно доработать, перезапустите его с исходной задачей и контекстом коррекции. Не начинайте новую сессию.

7. **Начинайте с `/work`, если сомневаетесь.** Рабочий процесс work проводит вас через процесс шаг за шагом с подтверждением пользователя на каждом шлюзе.

### Не делайте {#do-not}

1. **Не запускайте агентов в одном рабочем пространстве.** Два агента, пишущие в один каталог, создадут конфликты слияния и перезапишут работу друг друга.

2. **Не превышайте MAX_PARALLEL (по умолчанию 3).** Больше одновременных агентов не всегда означает более быстрый результат. Каждому агенту нужны память и ресурсы CPU. Значение по умолчанию 3 подобрано для большинства систем.

3. **Не пропускайте этап планирования.** Запуск агентов без плана приводит к несогласованным реализациям, когда фронтенд строится под одну форму API, а бэкенд — под другую.

4. **Не игнорируйте проваленных агентов.** Работа проваленного агента не завершена. Найдите причину сбоя в его структурированном claim или run-scoped файле результата, исправьте промпт и перезапустите агента.

5. **Не смешивайте ID сессий для связанной работы.** Если бэкенд- и фронтенд-агенты работают над одной фичей, у них должен быть общий ID сессии, чтобы оркестратор мог их координировать.

---

## Комплексный пример {#end-to-end-example}

Полный workflow параллельного выполнения для создания фичи аутентификации пользователей:

```bash
# Step 1: Plan the feature
# (In your AI IDE, run /plan or describe the feature)
# This creates .agents/results/plan-{sessionId}.json with task breakdown

# Step 2: Spawn implementation agents in parallel
oma agent spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use Argon2id for password hashing. Follow the API contract in .agents/results/api-contracts/" session-auth-01 -w ./apps/api &
oma agent spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: Wait for all implementation agents
# (monitor them from a second terminal; see the block below)
wait

# Step 4: Run QA review
oma agent spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 5: If QA finds issues, re-spawn specific agents with fixes
oma agent spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 6: Re-run QA to verify fixes
oma agent spawn qa "Re-review backend auth after fixes." session-auth-01
```

Запустите дашборд во втором терминале, пока агенты работают. Дашборд не завершается, пока вы не нажмёте Ctrl+C, поэтому не вставляйте эту команду в ту же оболочку, что и команды запуска агентов:

```bash
oma dashboard terminal
```

---

## См. также {#see-also}

- [Результаты агентов и возобновление](../guide/agent-results-and-resume.md): квитанции запусков, claims и `oma agent resume`
- [Мониторинг через дашборд](../guide/dashboard-monitoring.md)
- [Руководство по мультиагентному проекту](../guide/multi-agent-project.md)
- [Модели по агентам](../guide/per-agent-models.md)
- [Рабочий процесс /orchestrate](./workflows.md#orchestrate)
- [Справочник команд CLI](../cli-interfaces/commands.md)
