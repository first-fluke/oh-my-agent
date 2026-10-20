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

1. Записывает запись job в глобальный manifest `~/.oma/schedule/schedules.json`.
2. Регистрирует job в планировщике ОС (macOS launchd, Linux systemd --user или Windows Task Scheduler). OS job вызывает `oma schedule run <id>` с настроенным cron-интервалом.
3. В момент запуска `oma schedule run` ищет job, добавляет сохранённые переменные окружения, вызывает `oma agent spawn` и записывает журнал запуска в `~/.oma/schedule/runs/<id>/<timestamp>.md`.

Manifest — единственный источник истины (SSOT). Планировщик ОС — только исполнитель. Всё состояние — определения job, журналы запусков и время последнего запуска — находится в `~/.oma/schedule/`.

### Только глобальная область по замыслу

`oma schedule` намеренно глобален для пользователя, а не привязан к проекту. Планировщик ОС работает независимо от текущего рабочего каталога, поэтому один центральный реестр — единственный практичный SSOT. Каждая job записывает проект через `workspace` и `projectLabel`, поэтому `schedule list` может группировать job по проекту, хотя реестр общий.

Флага `--global` нет; команды schedule используют `$OMA_HOME/schedule/`, по умолчанию `~/.oma/schedule/`. Зарегистрированные job ОС явно получают разрешённый home-каталог, поэтому открывают тот же реестр без login shell. После переноса home-каталога выполните `oma schedule sync`, чтобы обновить команды job и пути журналов.

### Backend ОС

| Платформа | Основной backend | Запасной вариант | stderr команды `oma schedule run` |
|---|---|---|---|
| macOS | launchd (plist + `launchctl`) | — | `runs/<id>/stderr.log` |
| Linux | systemd --user timer | user `crontab`, если `systemctl --user` недоступен | `runs/<id>/stderr.log` (systemd); не сохраняется (crontab) |
| Windows | Task Scheduler (`schtasks`) | — | Не сохраняется |

oma автоматически выбирает доступный backend. Настраивать его вручную не нужно.

---

## Сравнение: schedule, ralph и Claude /loop


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

# One-shot: run at the next 15:00 and remove the job after a successful run
oma schedule create pm "Generate weekly plan" --cron "0 15 * * *" --once

# Check what is scheduled
oma schedule list

# Remove a job
oma schedule delete sch_abcdefgh2345
```

`schedule create` печатает ID job, который нужен для `run` и `delete`:

```text
Scheduled job registered: sch_abcdefgh2345
  Agent:   qa-reviewer
  Cron:    0 9 * * 1-5
  Vendor:  auto
  Project: my-project
  Once:    false
```

Запустите новую job один раз вручную, чтобы проверить prompt и учётные данные вендора до первого запуска по расписанию:

```bash
oma schedule run sch_abcdefgh2345
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
```

---

## Команды

### schedule create

Зарегистрировать job агента по расписанию.

```bash
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [--vendor <vendor>] [-w <path>] [--once] [--expires-after <Nd>] [--env <KEY1,KEY2>] [--dry-run] [--accept-rounded]
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|---|---|---|
| `agent-id` | Да | Агент, передаваемый в `oma agent spawn`: канонический ID (`orchestrator`, `architecture`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `qa`, `docs`, `tf-infra`, `explore`) или имя определения, например `qa-reviewer` или `backend-engineer`. При регистрации он не проверяется, поэтому после создания job один раз выполните `oma schedule run <id>`. |
| `prompt` | Да | Описание task, передаваемое агенту в момент запуска |

**Параметры:**

| Флаг | Описание |
|---|---|
| `--cron "<expr>"` | 5-полевая cron expression (например, `"0 9 * * *"` для 9 утра ежедневно). Взаимоисключающа с `--every`. |
| `--every "<phrase>"` | Интервал на естественном языке (см. таблицу ниже). Взаимоисключающ с `--cron`. |
| `--vendor <vendor>` | Override CLI vendor, передаваемый `oma agent spawn`: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. По умолчанию определяется автоматически из `oma-config.yaml`. |
| `-w, --workspace <path>` | Рабочий каталог агента во время запуска. По умолчанию — текущий каталог в момент регистрации. |
| `--once` | One-shot mode: job удаляет себя после первого запуска, завершившегося с кодом 0. Неудачный запуск сохраняет job, и она снова сработает при следующем совпадении cron. По умолчанию запуск повторяющийся. |
| `--expires-after <duration>` | Удалить повторяющуюся job при первом срабатывании после достижения этого возраста. Указывайте целое число дней с единицей, например `30d`; число без единицы (`30`) отклоняется. `0` означает без ограничения (по умолчанию). |
| `--env <KEY1,KEY2>` | Сохранить перечисленные переменные окружения (только их) в `~/.oma/schedule/env/<id>` (permissions 0600) для добавления во время запуска. Секреты не записываются в manifest. |
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
# Note: Requested every 7m -- 7 is not a divisor of 60; rounded to every 6m (*/6 * * * *).
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

```bash
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

У внутренних сервисов, таких как `dev.oma.agentmemory`, `dev.oma.serena-daemon-gc` и `dev.oma.serena-reaper`, есть собственные менеджеры сервисов. `schedule list` исключает их из обнаружения orphan, а `schedule sync --prune` их сохраняет.

**Вывод (text):**

Job группируются по метке проекта. В каждой строке указаны: ID, cron expression, agent, vendor, backend ОС, повторяемость и состояние расхождения.

```text
[my-project]
ID                 CRON           AGENT              VENDOR   BACKEND  RECUR  STATE
------------------------------------------------------------------------------------------
sch_abcdefgh2345   0 9 * * 1-5    qa-reviewer        auto     launchd  true   synced
sch_mnopqrst4567   */30 * * * *   backend            claude   launchd  true   missing-in-os

[orphan-in-os]
  dev.oma.sch_old (in OS scheduler but not in manifest)
```

Job, созданные командой `oma harness evolution enable`, отображаются с агентом `__builtin__`; они запускают `oma harness evolution run --scheduled` в соответствующем проекте. Управляйте ими через `oma harness evolution enable` и `disable` (см. [Эволюцию harness проекта](./harness-evolution.md)), а не через `oma schedule delete`. `oma schedule builtin-evolution-add` и `oma schedule inspect`, которые видны в `oma schedule --help`, — внутренние вспомогательные команды для этой функции.

**Примеры:**

```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

---

### schedule delete

Удалить job из manifest и планировщика ОС.

```bash
oma schedule delete <id>
```

**Аргументы:**

| Аргумент | Обязателен | Описание |
|---|---|---|
| `id` | Да | ID job из `schedule list` (формат: `sch_<base32-12>`) |

Если удаление из планировщика ОС не удалось (например, backend временно недоступен), печатается предупреждение, но запись manifest всё равно удаляется.

**Пример:**

```bash
oma schedule delete sch_abcdefgh2345
```

---

### schedule run

Выполнить job по ID. Планировщик ОС вызывает эту команду в момент запуска; обычно вручную её не вызывают.

```bash
oma schedule run <id>
```

Обёртка выполняет следующие действия:
1. Ищет ID job в manifest. Если ID не найден, завершается ненулевым кодом. Если срок `--expires-after` истёк, удаляет job вместо запуска.
2. Загружает сохранённые переменные окружения из `~/.oma/schedule/env/<id>` (если файл есть) и добавляет их в запущенный process.
3. Вызывает `oma agent spawn <agentId> <prompt> <generatedSessionId> --vendor <vendor> -w <workspace>`.
4. Записывает результат run в `~/.oma/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Обновляет `lastFiredAt` в manifest.
6. Если задан `--once` и агент завершился с кодом 0, удаляет job (manifest + планировщик ОС).

**Ошибки authentication заметны:** если credentials vendor истекли, job завершается ненулевым кодом и печатает в stderr `re-auth required: <vendor>` (в launchd и systemd он сохраняется в `runs/<id>/stderr.log`). Если job создана без `--vendor`, vendor отображается как `unknown`. Успешное завершение молча не подделывается.

Для отладки можно вызвать `schedule run` вручную:

```bash
oma schedule run sch_abcdefgh2345
```

---

### schedule sync

Повторно синхронизировать manifest с планировщиком ОС. Используйте после миграции системы, сброса планировщика ОС или для исправления drift.

```bash
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

Всё состояние расписаний находится в `~/.oma/schedule/`:

```text
~/.oma/schedule/
├── schedules.json          # SSOT manifest (permissions 0600)
├── env/
│   └── sch_abcdefgh2345    # Captured env vars for this job (permissions 0600)
├── running/                # Lease files while a job runs
└── runs/
    └── sch_abcdefgh2345/
        ├── 2026-06-16T09-00-00-000Z.md   # One log per fire: session, exit code, agent output
        ├── stdout.log                    # launchd and systemd only: stdout of oma schedule run
        └── stderr.log                    # launchd and systemd only: stderr, e.g. re-auth required
```

Права доступа:
- каталог `~/.oma/schedule/`: `0700`
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
ls ~/.oma/schedule/runs/sch_abcdefgh2345/
cat ~/.oma/schedule/runs/sch_abcdefgh2345/2026-06-16T09-00-00-000Z.md
```

**После перезапуска системы job показывает `missing-in-os`:**

Выполните `oma schedule sync`, чтобы заново зарегистрировать все job из manifest в планировщике ОС.

**Job сработала, но credentials vendor истекли:**

В macOS (launchd) и Linux (systemd) найдите сообщение `re-auth required: <vendor>` в `~/.oma/schedule/runs/<id>/stderr.log`. Run log `<timestamp>.md` содержит собственный вывод агента и код завершения. Backend crontab и Task Scheduler этот stderr не сохраняют; чтобы его увидеть, запустите `oma schedule run <id>` в терминале. Выполните authentication через CLI vendor (например, `claude login`, `codex login`), а затем вручную запустите `oma schedule run <id>`, чтобы проверить его до следующего scheduled запуска.

**Изменение job:**

Команды `schedule update` нет. Сначала создайте замену, затем удалите старый ID командой `oma schedule delete <old-id>`. `--env` копирует значения переменных в момент создания job, поэтому после ротации секрета пересоздайте job, экспортировав новое значение в shell.

**`--every` округлил мой интервал:**

При округлении oma печатает заметку с объяснением изменения. Если нужен точный интервал, который не делит 60 минут или 24 часа без остатка, используйте `--cron` с явной 5-полевой expression.

**Удаление всех job проекта:**

```bash
# List jobs for a specific project, then remove each
oma schedule list --json | jq -r '.jobs[] | select(.projectLabel == "my-project") | .id' \
  | xargs -I{} oma schedule delete {}
```

**Поддержка Windows:**

В Windows oma использует `schtasks` для регистрации job. Регистрации Task Scheduler нельзя прочитать обратно, поэтому `schedule list` показывает каждую зарегистрированную job как `stale`, а `schedule sync` (его также запускает `oma update`) заново регистрирует их все. В Windows состояние `stale` ожидаемо; `missing-in-os` и `orphan-in-os` по-прежнему означают drift.

Учтите, что `schtasks` не умеет выражать любую cron shape. Поддерживаются: `*/N * * * *` (каждые N минут), `M * * * *` (каждый час в :M), `M H * * *` (ежедневно), `M H * * D` (еженедельно; `D` может быть одним днём, диапазоном вроде `1-5` или списком вроде `1,3,5`) и `M H D * *` (ежемесячно). Другие выражения (например, список через запятую в поле минут) отклоняются на Windows во время `schedule create`.

`--every` даёт поддерживаемую форму только для интервалов в минутах, на которые делится 60 (например, `--every 5m` или `--every 30m`). Интервалы в часах и днях (`--every 2h`, `--every "every 6 hours"`, `--every 1d`) и шаги по часам вроде `--cron "0 */4 * * *"` дают `0 */N * * *` или `0 0 */N * *`, которые Task Scheduler отклоняет при `schedule create`. В Windows используйте фиксированное время, например `--cron "0 9 * * 1-5"`.

---

## См. также

- [Эволюция harness проекта](./harness-evolution.md) — встроенная job `__builtin__`, которая выполняет улучшение навыков в рамках бюджета.
- [Оценка harness](./harness-eval.md) — как сочетаются команды оценки.
