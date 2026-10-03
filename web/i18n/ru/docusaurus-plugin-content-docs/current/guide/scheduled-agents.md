---
title: "Руководство: агенты по расписанию"
sidebar_label: Агенты по расписанию
description: Запускайте любого агента по повторяющемуся или однократному расписанию через планировщик ОС (macOS launchd, Linux systemd, Windows Task Scheduler), не оставляя runtime вендора открытым.
---

# Агенты по расписанию

`oma schedule` позволяет запускать любого агента по расписанию независимо от того, какой runtime AI-вендора (Claude Code, Codex, Antigravity, Cursor, Qwen, Grok, opencode или pi) сейчас открыт. Планировщик ОС запускает job, а job вызывает `oma agent spawn` в headless-режиме, используя уже сохранённые на диске учётные данные вендора.

---

## Как это работает

Когда вы выполняете `oma schedule create`, oma:

1. Записывает запись job в глобальный manifest `~/.agents/schedule/schedules.json`.
2. Регистрирует job в планировщике ОС (macOS launchd, Linux systemd --user или Windows Task Scheduler). OS job вызывает `oma schedule run <id>` с настроенным cron-интервалом.
3. В момент запуска `oma schedule run` ищет job, добавляет сохранённые переменные окружения, вызывает `oma agent spawn` и записывает журнал запуска в `~/.agents/schedule/runs/<id>/<timestamp>.md`.

Manifest — единственный источник истины (SSOT). Планировщик ОС — только исполнитель. Всё состояние — определения job, журналы запусков и время последнего запуска — находится в `~/.agents/schedule/`.

### Только глобальная область по замыслу

`oma schedule` намеренно глобален для пользователя, а не привязан к проекту. Планировщик ОС работает независимо от текущего рабочего каталога, поэтому один центральный реестр — единственный практичный SSOT. Каждая job записывает проект через `workspace` и `projectLabel`, поэтому `schedule list` может группировать job по проекту, хотя реестр общий.

Флага `--global` нет; команды schedule всегда читают и записывают `~/.agents/schedule/`.

### Backend ОС

| Платформа | Основной backend | Запасной вариант |
|---|---|---|
| macOS | launchd (plist + `launchctl`) | user `crontab` |
| Linux | systemd --user timer | user `crontab` |
| Windows | Task Scheduler (`schtasks`) | — |

oma автоматически выбирает доступный backend. Настраивать его вручную не нужно.

---

## Сравнение: schedule, ralph и Claude /loop

Эти три функции иногда путают, потому что все они запускают что-то «позже». Это разные концепции.

| Функция | Триггер | Область | Переживает перезапуск вендора? |
|---|---|---|---|
| `oma schedule` | По времени (cron) | Cross-vendor, уровень ОС | Да — планировщик ОС запускает job, даже если runtime vendor закрыт |
| `ralph` | По завершению (цикл Stop hook) | Cross-vendor | Только пока активна текущая session; ralph — цикл «продолжать до завершения», а не timer |
| Claude Code `/loop` | По времени (cron внутри процесса) | Только runtime Claude | Нет — срабатывает только пока работает Claude Code |

Используйте `schedule`, когда job должна выполняться в 9 утра каждый будний день. Используйте `ralph`, когда agent должен повторять работу до достижения требуемого уровня качества. Используйте `/loop`, только находясь в Claude Code и не нуждаясь в переносимости между вендорами.

---

## Быстрый старт

```bash
# Run the qa-reviewer agent every weekday at 9 AM
oma schedule create qa-reviewer "Run QA review on the latest changes" --cron "0 9 * * 1-5"

# Run a backend agent every 2 hours using natural-language syntax
oma schedule create backend "Check for slow queries in the API logs" --every "2h"

# One-shot: run once at 3 PM today (cron syntax) and self-remove
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abc123def456
```

---

## Команды

### schedule create

Зарегистрировать job агента по расписанию.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|---|---|---|
| `agent-id` | Да | Тип запускаемого агента: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Да | Описание task, передаваемое агенту в момент запуска |

**Параметры:**

| Флаг | Описание |
|---|---|
| `--cron "<expr>"` | 5-полевая cron expression (например, `"0 9 * * *"` для 9 утра ежедневно). Взаимоисключающа с `--every`. |
| `--every "<phrase>"` | Интервал на естественном языке (см. таблицу ниже). Взаимоисключающ с `--cron`. |
| `--vendor <vendor>` | Override CLI vendor, передаваемый `oma agent spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. По умолчанию определяется автоматически из `oma-config.yaml`. |
| `-w, --workspace <path>` | Рабочий каталог агента во время запуска. По умолчанию — текущий каталог в момент регистрации. |
| `--once` | One-shot mode: job запускается один раз и удаляется. По умолчанию запуск повторяющийся. |
| `--expires-after <duration>` | Автоматически истечь повторяющейся job через duration, например 30d. `0` означает без ограничения (по умолчанию). |
| `--env <KEY1,KEY2>` | Сохранить перечисленные переменные окружения (только их) в `~/.agents/schedule/env/<id>` (permissions 0600) для добавления во время запуска. Секреты не записываются в manifest. |
| `--dry-run` | Напечатать разрешённый cron и заметку об округлении без записи job планировщика, entry manifest или файла окружения. |
| `--accept-rounded` | Требуется для регистрации natural-language interval после округления OMA до шага, выражаемого cron. Сначала просмотрите результат с `--dry-run`. |

Требуется ровно один из `--cron` или `--every`.

#### --every: интервалы на естественном языке

`--every` принимает следующие формы. oma преобразует их в 5-полевую cron expression и печатает заметку, если запрошенный интервал округлён до ближайшего шага, выражаемого cron.

| Форма фразы | Пример | Примечания |
|---|---|---|
| Compact unit | `5m`, `2h`, `1d` | Минута, час, день |
| Every + compact | `every 20m`, `every 2h` | |
| Every + word | `every 5 minutes`, `every 2 hours` | Принимаются формы единицы во множественном числе |
| Seconds | `30s` | Округляется вверх до минимума в 1 минуту; cron не выражает интервалы меньше минуты |

Неделимые интервалы округляются до ближайшего чистого шага, после чего печатается заметка. Например, `--every 7m` округляется до `6m` (`*/6`), поскольку 7 не делит 60.

Перед регистрацией просмотрите округлённый интервал:

```bash
oma schedule create backend "Check logs" --every 7m --dry-run
# Preview: requested interval resolves to */6 * * * *
# Preview only: no OS job, manifest entry, or env file was written.
oma schedule create backend "Check logs" --every 7m --accept-rounded
```

Если предварительный просмотр пропущен, команда откажется регистрировать округлённый интервал. Расписания используют локальные правила времени выбранного планировщика ОС.

**Примеры:**

```bash
# Exact cron expression (full control)
oma schedule create backend "Optimize slow queries" --cron "0 */4 * * *"

# Natural language (oma converts to cron)
oma schedule create frontend "Run lighthouse audit" --every "every 6 hours"
# Converts to 0 */6 * * * (6 divides 24 cleanly, so no rounding note)

# Pin to a vendor and a workspace
oma schedule create qa "Run security scan" --cron "0 2 * * 0" --vendor claude -w /home/user/myproject

# One-shot job
oma schedule create pm "Generate sprint retrospective" --cron "0 17 * * 5" --once

# Capture specific env vars for the job
oma schedule create backend "Sync external API data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

---

### schedule list

Перечислить все запланированные job по всем проектам, сгруппированные по проекту, с состоянием расхождения с ОС.

```
oma schedule list [--json]
```

**Параметры:**

| Флаг | Описание |
|---|---|
| `--json` | Вывести машиночитаемый JSON |

**Состояния расхождения:**

| Состояние | Значение |
|---|---|
| `synced` | Job существует и в manifest, и в планировщике ОС |
| `stale` | Job зарегистрирован, но регистрация в ОС вызывает команду, которую текущий CLI больше не принимает (например, `schedule:run <id>`, записанную до стандартизации путей команд). Выполните `schedule sync`, чтобы перезаписать её; `oma update` делает это автоматически. |
| `missing-in-os` | Job есть в manifest, но отсутствует в планировщике ОС. Выполните `schedule sync` для восстановления. |
| `orphan-in-os` | Job есть в планировщике ОС, но отсутствует в manifest. Выполните `schedule sync --prune` для удаления. |

**Вывод (text):**

Job группируются по метке проекта. В каждой строке указаны: ID, cron expression, agent, vendor, backend ОС, повторяемость и состояние расхождения.

```
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abc123def456   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_xyz789ghi012   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

**Примеры:**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete

Удалить job из manifest и планировщика ОС.

```
oma schedule delete <id>
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|---|---|---|
| `id` | Да | ID job из `schedule list` (формат: `sch_<base32-12>`) |

Если удаление из планировщика ОС не удалось (например, backend временно недоступен), печатается предупреждение, но запись manifest всё равно удаляется.

**Пример:**

```bash
oma schedule delete sch_abc123def456
```

---

### schedule run

Выполнить job по ID. Планировщик ОС вызывает эту команду в момент запуска; обычно вручную её не вызывают.

```
oma schedule run <id>
```

Обёртка выполняет следующие действия:
1. Ищет ID job в manifest. Если ID не найден, завершается ненулевым кодом.
2. Загружает сохранённые переменные окружения из `~/.agents/schedule/env/<id>` (если файл есть) и добавляет их в запущенный process.
3. Вызывает `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>`.
4. Записывает результат run в `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Обновляет `lastFiredAt` в manifest.
6. Если задан `--once`, удаляет job (manifest + планировщик ОС).

**Ошибки authentication заметны:** если credentials vendor истекли, job завершается ненулевым кодом и печатает в stderr `re-auth required: <vendor>`. Успешное завершение молча не подделывается. Можно настроить необязательное уведомление `oma-voice`.

Для отладки можно вызвать `schedule run` вручную:

```bash
oma schedule run sch_abc123def456
```

---

### schedule sync

Повторно синхронизировать manifest с планировщиком ОС. Используйте после миграции системы, сброса планировщика ОС или для исправления drift.

```
oma schedule sync [--prune]
```

**Параметры:**

| Флаг | Описание |
|---|---|
| `--prune` | Также удалить job ОС, присутствующие в планировщике, но отсутствующие в manifest (состояние orphan-in-os). Без `--prune` orphan только сообщаются. |

**Примеры:**

```bash
# Repair missing-in-os jobs and rewrite stale registrations (does not remove orphans)
oma schedule sync

# Repair missing-in-os jobs AND remove orphans
oma schedule sync --prune
```

`oma update` выполняет ту же сверку (без `--prune`) после каждого обновления, поэтому релиз CLI, меняющий написание команды `oma schedule run`, не может оставить существующие регистрации ОС, указывающие на команду, которую новый бинарный файл отвергает. Регистрации, записанные старыми версиями с `oma schedule:run <id>`, тоже продолжают работать: это устаревшее написание по-прежнему принимается для задач, запускаемых ОС.

---

## Структура хранения

Всё состояние расписаний находится в `~/.agents/schedule/`:

```
~/.agents/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abc123def456    # Captured env vars for this job (permissions 0600)
└── runs/
    └── sch_abc123def456/
        └── 2026-06-16T090000Z.md   # Run log
```

Права доступа:
- каталог `~/.agents/schedule/`: `0700`
- файлы `schedules.json` и `env/<id>`: `0600`

**Секреты никогда не записываются в `schedules.json`.** Флаг `--env` пишет только указанные ключи в отдельный файл `0600` под `env/`. Сохраняются только явно перечисленные ключи; полный дамп окружения никогда не записывается.

---

## Примечания по безопасности

- `schedule create` — операция доверенного пути: job может зарегистрировать только аутентифицированный пользователь. Не предоставляйте `schedule create` внешнему или недоверенному вводу. Запланированный prompt — произвольный код, запускаемый в будущем.
- `schedule run` выполняет только job, ID которых есть в manifest. Произвольная инъекция argv невозможна.
- Сохранённые на диске учётные данные вендора (например, `~/.codex/auth.json`, `~/.grok/auth.json`) используются как есть для headless dispatch. Дополнительной проверки аутентификации нет. Если учётные данные истекли, job завершается с ошибкой.

---

## Советы и устранение неполадок

**Проверка run log:**

```bash
ls ~/.agents/schedule/runs/sch_abc123def456/
cat ~/.agents/schedule/runs/sch_abc123def456/2026-06-16T090000Z.md
```

**После перезапуска системы job показывает `missing-in-os`:**

Выполните `oma schedule sync`, чтобы заново зарегистрировать все job из manifest в планировщике ОС.

**Job сработала, но credentials vendor истекли:**

Проверьте в run log сообщение `re-auth required: <vendor>`. Выполните authentication через CLI vendor (например, `claude login`, `codex login`), а затем вручную запустите `oma schedule run <id>`, чтобы проверить его до следующего scheduled запуска.

**`--every` округлил мой интервал:**

При округлении oma печатает заметку с объяснением изменения. Если нужен точный интервал, который не делит 60 минут или 24 часа без остатка, используйте `--cron` с явной 5-полевой expression.

**Удаление всех job проекта:**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Поддержка Windows:**

В Windows oma использует `schtasks` для регистрации job. Проверка drift через `schedule list` и команда `schedule sync` работают одинаково на всех платформах.

Учтите, что `schtasks` не умеет выражать любую cron shape. Поддерживаются: `*/N * * * *` (каждые N минут), `M * * * *` (каждый час в :M), `M H * * *` (ежедневно), `M H * * D` (еженедельно; `D` может быть одним днём, диапазоном вроде `1-5` или списком вроде `1,3,5`) и `M H D * *` (ежемесячно). Другие выражения (например, список через запятую в поле минут) отклоняются на Windows во время `schedule create`.
