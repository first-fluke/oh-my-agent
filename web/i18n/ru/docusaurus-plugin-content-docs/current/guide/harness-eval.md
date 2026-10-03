---
title: "Оценка harness"
sidebar_label: Оценка harness
description: Оценивайте полный overlay OMA harness с парными изолированными задачами репозитория и детерминированными проверками артефактов.
---

# Оценка harness

`oma harness eval` измеряет, улучшает ли candidate OMA harness фиксированного target agent без изменения модели этого агента. Команда адаптирует тестовый паттерн из [AI4AI at Test-Time: Strong-to-Weak Capability Transfer via Harnesses](https://arxiv.org/abs/2608.12307): зафиксируйте target model, измените harness и сравните результаты на одинаковых task.

Эта команда оценивает единицу крупнее, чем `oma skill eval`:

| Команда | Объект оценки | Цель оценки |
|:--------|:----------|:-------------|
| `oma skill eval` | Один body `SKILL.md` | Output агента |
| `oma harness eval` | Ограниченный overlay `.agents/` | Файлы и output в workspace репозитория |

Используйте skill eval, чтобы ответить на вопрос «помогает ли этот skill?». Используйте harness eval, чтобы выяснить, помогает ли сочетание skills, workflows, rules и инструкций агента надёжнее выполнять задачи репозитория на фиксированном агенте.

## Модель оценки

Live-запуск оценивает каждую задачу как парный эксперимент:

1. OMA захватывает начальную fixture задачи. Полный снимок служит исходным состоянием для обеих сторон: они стартуют с одних и тех же файлов, даже если исходная fixture изменится во время выполнения.
2. OMA копирует текущие определения `agents`, `config`, `rules`, `skills` и `workflows` в это workspace и проектирует их в формат выбранного вендора.
3. OMA повторяет настройку во втором новом workspace и применяет там candidate overlay.
4. Для обеих сторон используются один primary agent, маршрут вендора, prompt, права записи и timeout.
5. Детерминированные проверки изучают получившийся workspace и необязательный output агента. Доверенные проверки `command` затем выполняются в свежей копии артефактов задачи.

Настоящий проект никогда не используется как рабочий каталог arm. OMA захватывает сырой output и итоговые артефакты задачи до проверок и очистки временного workspace. Собственная песочница процесса выбранного вендора остаётся источником полномочий для доступа вне рабочего каталога.

## Структура candidate

Путь candidate — каталог с частичным деревом `.agents/`:

```text
candidate/
└── .agents/
    ├── agents/
    │   └── docs-curator.md
    ├── rules/
    │   └── documentation.md
    ├── skills/
    │   └── project-docs/
    │       └── SKILL.md
    └── workflows/
        └── docs-check.md
```

Принимаются только файлы под `.agents/agents`, `.agents/rules`, `.agents/skills` и `.agents/workflows`. Hooks, fixtures evaluator, state, results, файлы конфигурации, symlinks и варианты агентов вендора отклоняются. Защищённые поля frontmatter агента, такие как `model`, `tools`, `effort` и лимиты выполнения, должны совпадать с baseline. Arm также завершается ошибкой, если запущенный agent изменяет защищённые определения `.agents/` до оценки.

## Формат suite

Suite — это один YAML-файл и один каталог fixture для каждой задачи:

```text
harness-eval/
├── suite.yaml
└── fixtures/
    ├── stale-api-doc/
    │   ├── docs/api.md
    │   └── src/session.ts
    └── missing-guide/
        ├── docs/
        └── src/feature.ts
```

```yaml
schema_version: 2
id: docs-harness
agent: docs-curator
tasks:
  - id: stale-api-doc
    partition: validation
    prompt: Update the API documentation to match the implementation.
    workspace: fixtures/stale-api-doc
    weight: 1
    checks:
      - type: file_contains
        path: docs/api.md
        value: openSession
      - type: file_not_contains
        path: docs/api.md
        value: createSession
  - id: missing-guide
    partition: final-test
    prompt: Write the missing guide for the feature in this fixture.
    workspace: fixtures/missing-guide
    checks:
      - type: file_exists
        path: docs/feature.md
```

Версия 2 требует задач обоих разделов: `validation` и `final-test`. Каждая задача должна объявлять свой раздел (`partition`). По умолчанию выбирается `validation`; для отдельного финального запуска после выбора candidate используйте `--partition final-test`. Два раздела не могут использовать общие каталоги fixture или вкладывать их друг в друга. Храните файлы record вне каталогов fixture, candidate overlay и входных данных evaluator; такие расположения отклоняются, чтобы последующие запуски не видели финальные проверки. Suite версии 1 по-прежнему запускаются как `exploratory`; выбрать их как final-test нельзя.

ID task должны быть уникальными. Пути fixture и check должны оставаться внутри project и task workspace. Suite и fixture также должны находиться вне определений baseline, копируемых в каждую arm. Fixture не могут содержать symlink или control surface harness, например `.agents`, `.codex`, `.claude`, vendor skill directories или root agent-instruction files. Это не позволяет данным task затенить управляемый harness обеих сторон.

Созданные каталоги зависимостей, такие как `node_modules` и `.venv`, не копируются из baseline harness. Зафиксируйте deterministic helper source и dependency manifests в skill; runtime dependencies для проверки предоставляйте в fixture task.

### Типы check

| Тип | Поля | Условие успеха |
|:-----|:-------|:---------------|
| `file_exists` | `path` | Путь существует после завершения arm. |
| `file_not_exists` | `path` | Путь не существует. |
| `file_contains` | `path`, `value` | Файл существует и содержит value. |
| `file_not_contains` | `path`, `value` | Файл существует и не содержит value. |
| `output_contains` | `value` | Захваченный output агента содержит value. |
| `output_not_contains` | `value` | Захваченный output агента не содержит value. |
| `output_judge` | `rubric` | Оцениваемый контракт, содержащийся в инцидентах; механический evaluator сообщает о нём как о не оценённом (см. [Регрессионные кейсы инцидентов](./harness-incidents.md)). |
| `file_json_equals` | `path`, `value`, необязательный `pointer` | Разобранный JSON файла равен `value`, при необходимости по JSON Pointer. |
| `output_json_equals` | `value`, необязательный `pointer` | Захваченный output — корректный JSON и равен `value`, при необходимости по JSON Pointer. |
| `command` | `argv`, `checker`, `timeout_ms`, `expected_exit_code` | Доверенный подпроцесс завершается в пределах timeout и возвращает указанный код выхода. |

JSON-утверждения сравнивают разобранные значения, включая типы; текст об успехе не может удовлетворить утверждение о состоянии JSON. `pointer` использует синтаксис JSON Pointer, например `/result/count`, и по умолчанию указывает на значение целиком.

Проверки `command` пишет доверенный владелец suite:

```yaml
- type: command
  argv: [/absolute/path/to/node, "{checker}", state.json]
  checker: checkers/verify-state.mjs
  timeout_ms: 5000
  expected_exit_code: 0
```

`checker` разрешается относительно файла suite. Это должен быть самостоятельный обычный файл с исходным кодом, который хранится вне каждой fixture, candidate overlay и определений baseline `.agents`. `argv[0]` должен быть абсолютным путём к исполняемому файлу вне проекта; `{checker}` должен занимать аргумент целиком. OMA передаёт аргументы напрямую, без интерполяции shell. Timeout должен быть положительным целым числом не более 300 000 миллисекунд. Коды выхода — целые числа от 0 до 255.

Перед dispatch OMA делает снимок байтов исходного кода checker и вычисляет hash определений evaluator и исполняемого файла. После dispatch он копирует артефакты задачи в отдельное временное workspace, записывает checker из снимка вне этих артефактов и запускает его там. Каждая команда получает свежую копию; один checker не может изменить входные данные следующей проверки. Сгенерированные проекции harness исключаются, а symlink в артефактах отклоняются. Если исходный код checker изменяется во время работы arm, эта arm завершается ошибкой; изменённый исходный код никогда не подставляется вместо снимка. Checker должен использовать фиксированные утверждения об артефактах или поведении приложения и не должен делегировать вердикт тестам или package scripts, которые candidate может изменить.

Проверки и пути checker не добавляются в prompt агента или fixture. Входные данные выбранной задачи неизбежно видны во время её запуска. Это защищает целостность evaluator и разграничивает разделы; оно не мешает процессу того же пользователя читать другие файлы хоста.

## Запуск и запись

В live-режиме выполняются два dispatch на выбранную задачу, печатается предварительный просмотр dispatch и требуется подтверждение:

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --live --record \
  --record-file harness-eval/_runs/trial-1.json
```

Используйте `--yes` для неинтерактивного запуска и `--timeout-minutes`, чтобы задать одинаковый wall-clock limit для обеих сторон. Live execution требует vendor, который обнаруживает файлы harness относительно workspace проекта. OMA отказывается от discovery через HOME, поскольку baseline мог бы увидеть глобально установленный candidate content.

`--record` записывает неизменяемый JSON record версии 2. По умолчанию он создаётся в `_runs/` рядом с suite, а имя файла содержит hash baseline/candidate. Для другого live-запуска используйте новый `--record-file`; уже существующий файл назначения отклоняется до dispatch. Record сохраняет:

- идентификатор suite, раздел, provenance prompt и fixture, hash baseline/candidate, а также hash evaluator/checker/исполняемых файлов;
- исходный output и его hash, включая доступный диагностический stdout неудавшихся dispatch;
- начальный и итоговый манифесты артефактов с байтами файлов, hash каждого файла, режимами файлов/каталогов и дайджестом манифеста;
- ссылки на checker, результаты arm, идентификатор инцидента, если он указан, и hash исходного record для rerun.

Пределы снимков задач: 5 МиБ на файл, 32 МиБ в сумме и 2 000 элементов. Symlink, специальные файлы, пути с секретами, нечитаемые файлы и данные чрезмерного размера записываются как пропуски. Скопированные control surface harness исключаются из итоговых артефактов задачи. Неполные снимки остаются явными ограничениями evidence; они не могут служить основой для закреплённого rerun и не годятся для rescoring файлов. Сырой output по-прежнему может поддерживать проверки только по output, если исходный dispatch завершился успешно.

У record есть собственный hash целостности. Изменившийся hash record или артефакта отклоняется. Эти hash идентифицируют evidence; они не удостоверяют ограничение доступа процесса и не делают результат готовым к продвижению.

### Условия выполнения

Каждая live- или rerun-оценка до первого dispatch определяет манифест выполнения и сохраняет его в record как `manifest`. Он называет условия, которые описывает вердикт, чтобы сохранённый score никогда не приняли за evidence о другой модели, CLI или сборке OMA:

| Поле | Значение |
|---|---|
| `vendor`, `dispatchMode`, `runtimeVendor`, `command` | Определённый маршрут dispatch и имя исполняемого файла CLI. |
| `model`, `modelSource` | Модель, которую OMA определил из плана агента или значения vendor по умолчанию. `vendor-session` означает, что модель выбирает собственная конфигурация сессии vendor, а OMA не зафиксировал её. |
| `effort`, `thinking` | Настройки reasoning из плана агента, если они заданы. |
| `cliVersion`, `cliVersionStatus` | Первая строка вывода `<command> --version` (`probed`) или `unavailable`, если этот запрос не удался. |
| `omaVersion`, `platform`, `arch`, `node` | Хост и сборка OMA. |
| `environmentPolicy` | Имена переменных окружения, которые получили стороны, принудительные записи и число отброшенных. Значения никогда не записываются. |
| `memory`, `confinement` | `memory: disabled` для каждой arm; `confinement` указывает, что dispatch ограничивает, а что нет (временное workspace, неограниченная сеть, унаследованные credential, инструменты vendor по умолчанию). |
| `manifestHash` | Идентификатор перечисленных выше условий. |

Манифест — это описание, а не аттестация: он фиксирует то, что определил OMA, а поля confinement прямо указывают, что изоляция сети и credential не обеспечивается. `promotionReady` остаётся `false`.

### Политика окружения

Обе стороны получают одно и то же окружение из allowlist. Проходят базовые переменные (`PATH`, `HOME`, locale, temp, настройки proxy и сертификатов), все переменные `OMA_*`, а также префиксы credential и runtime-detection целевого vendor; записи, которые dispatch builder добавляет для вызова, сохраняются. Всё остальное отбрасывается, чтобы candidate не мог случайно добраться до deploy token или ключа другого провайдера. `OMA_NO_AGENTMEMORY=1` задаётся принудительно, чтобы память vendor не переносила контекст между сторонами baseline и candidate.

Задайте `OMA_HARNESS_ENV_PASSTHROUGH=NAME1,NAME2`, чтобы передать дополнительные переменные, которые задаче действительно нужны. Имена появляются в манифесте в `environmentPolicy.extra`. Для vendor без известного набора префиксов манифест сообщает `vendorKnown: false`, и до процесса доходят только базовые переменные, `OMA_*` и записи passthrough.

## Повторное использование записи

Команда разделяет четыре действия:

| Действие | Выполняемая работа | Вызовы agent/model |
|:-------|:---------------|:------------------|
| `inspect` | Агрегирует сохранённые вердикты arm после проверки provenance. Проверки не выполняются. | Нет |
| `rescore` | Применяет текущие проверки output/файлов к исходному сырому output и байтам артефактов. | Нет |
| `fixture-replay` | Сопоставляет переданный транскрипт запросов инструментов, воспроизводит его ответы fixture и изменения файлов, затем применяет поддерживаемые проверки. | Нет |
| `rerun` | Запускает настроенный agent в новых workspace, заполненных из записанных начальных снимков. | Два на выбранную задачу |

`--action inspect` используется по умолчанию. `--mock` — это псевдоним `inspect`; его нельзя сочетать с другим действием. Ни `inspect`, ни `fixture-replay` не перезапускают agent.

### Просмотр сохранённых вердиктов

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action inspect \
  --record-file harness-eval/_runs/trial-1.json
```

Просмотр требует совпадения исходных hash suite, раздела, evaluator, baseline и candidate. Он показывает записанные score, не вызывая checker и не переоценивая output. Record версии 1 остаются доступными для просмотра, если совпадает необходимый provenance. Более старые record без provenance раздела/evaluator не проходят текущую валидацию CLI. Legacy-вердикты нельзя выдать за новое сырое evidence: для rescoring, fixture replay или закреплённого rerun соберите новый live record.

### Повторная оценка исходного evidence

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rescore \
  --record-file harness-eval/_runs/trial-1.json
```

Rescoring использует текущие проверки и игнорирует исходные значения `passed` и вердикты проверок. Идентичность suite, идентичность task ID/prompt/инцидента, baseline, candidate и выбранный раздел по-прежнему должны совпадать. Определения checker могут измениться; новый результат описывает, как исходные байты проходят эти проверки. Изменения сегодняшних файлов fixture не заменяют записанные итоговые артефакты.

Проверки `command` недостаточны для offline rescoring, потому что record не закрепляет внешний runtime и окружение. Проверки, нацеленные на исключённые или неполные артефакты, тоже недостаточны. Неудавшийся исходный dispatch оставляет диагностический output, который не может стать достоверным измерением через rescoring. Если текущие критерии приёмки требуют выполнения команд, используйте live rerun.

### Воспроизведение fixture инструментов

Файл транскрипта содержит один объект или массив объектов с уникальными ID задач. Передайте по одному транскрипту на каждую выбранную задачу:

```json
{
  "schemaVersion": 1,
  "taskId": "stale-api-doc",
  "requests": [
    { "tool": "documentation", "request": { "path": "docs/api.md" } }
  ],
  "steps": [
    {
      "tool": "documentation",
      "request": { "path": "docs/api.md" },
      "response": { "body": "Use openSession." },
      "writes": [
        { "path": "docs/api.md", "content": "Use openSession.\n" }
      ],
      "removes": []
    }
  ],
  "output": "Fixture completed.",
  "dependencies": [
    { "name": "documentation", "repeatability": "fixture" }
  ]
}
```

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action fixture-replay \
  --record-file harness-eval/_runs/trial-1.json \
  --transcript harness-eval/tool-fixtures.json
```

Запросы должны точно совпадать с последовательностью шагов (`steps`) по имени инструмента и значению запроса. `writes` и `removes` — необязательные изменения файлов задачи по относительным путям; они не могут выйти за пределы workspace или изменить control surface harness. Имена инструментов — это данные, и никакая команда из транскрипта не выполняется. `output` — это данные fixture, обязательные, когда они нужны проверке output.

У каждой объявленной зависимости есть `name`, `repeatability` (`fixture`, `live` или `unavailable`) и необязательные `reason` и ссылка `fixture`. Fixture-зависимость требует соответствующего шага с этим именем инструмента. Live- или unavailable-зависимости делают replay недостаточным. Необязательное поле `fixture` носит описательный характер; replay использует переданные шаги, а не загружает этот путь. Replay транскрипта проверяет объявленные зависимости и не устанавливает, что была захвачена каждая историческая зависимость.

Обе записанные arm должны иметь один и тот же полный начальный снимок. OMA применяет один и тот же транскрипт к каждой arm и выполняет текущие проверки output/файлов. Проверки `command` требуют live rerun. Эти результаты показывают, что переданную последовательность fixture можно воспроизвести; они не могут установить поведенческое улучшение candidate или воспроизводимость модели.

### Повторный запуск agent из закреплённых начальных файлов

```bash
oma harness eval \
  --suite harness-eval/suite.yaml \
  --candidate candidate \
  --action rerun \
  --record-file harness-eval/_runs/trial-1.json
```

Rerun требует совпадающей идентичности suite/задачи и одинаковых полных начальных снимков для обеих исходных arm. Он запускает фактические вызовы agent с текущими baseline, candidate, настроенным маршрутом vendor/модели и текущими проверками. Исходные итоговые артефакты не используются как стартовое состояние. Поэтому более поздняя правка исходной fixture не может незаметно изменить записанное начальное состояние.

Rerun-запуски используют тот же предварительный просмотр dispatch, подтверждение и поведение timeout, что и live-запуски. Они могут использовать изменённый candidate; исходный record укажите явно через `--record-file`. Добавьте `--record`, чтобы сохранить новый соседний файл с именем, оканчивающимся на `-rerun-<timestamp>.json`, связанный с hash исходного record. Исходный record сохраняется.

Закреплённые файлы не воспроизводят состояние внешних сервисов, поведение часов или сэмплирование модели. Rerun — это свежее поведенческое evidence при заявленных условиях, а не утверждение, что исходная траектория agent была детерминированно воспроизведена.

### Записанные условия при воспроизведении

`inspect`, `rescore` и `fixture-replay` сообщают манифест, сохранённый в record, с `conditions: "recorded"` или `conditions: "unavailable"` для record, созданного до появления манифестов. OMA также определяет текущие условия и перечисляет каждое отличие в vendor, режиме dispatch, модели, effort, thinking, версии CLI, версии OMA или хосте как ограничение replay и причину блокировки продвижения:

```text
replay limitation: Recorded conditions differ from current: model: recorded "gpt-5.4", current "gpt-5.5"
```

Версия CLI запрашивается при replay только тогда, когда сам record содержит запрошенную (probed) версию; пара без запроса сообщается как несопоставимая, а не как равная. Записанные вердикты остаются доступными для просмотра при исходных условиях. Они не являются evidence для candidate при текущих условиях, пока live- или rerun-оценка не создаст record с совпадающим манифестом.

### Расход ресурсов

Каждая arm сохраняет `usage`, если vendor его сообщил: входные и выходные token, стоимость в USD, wall time и модель, создавшую большую часть output. Оценка суммирует их в `usage`, где `status` равен `actual`, `partial` (некоторые arm ничего не сообщили) или `unknown`. Конверты результатов vendor распаковываются до выполнения проверок и до записи output, поэтому `output_contains` и `output_json_equals` видят ответ агента, а не окружающие его служебные JSON-данные; это поле заполняется данными usage из конверта.

### Метки report

Report включает `executionMode`, `evidenceStatus` (`complete`, `insufficient` или `legacy`), `replayLimitations` и `sourceRecordHash`, когда он доступен. Report live- и rerun-запусков добавляет `manifest`, `conditions: "current"` и `traceSession`. Полнота evidence описывает то, что текущее действие может проверить или оценить. Унаследованные ограничения инцидента остаются видимыми, даже когда текущий захват файлов полон. `promotionReady` остаётся `false` в любом режиме.

## События trace

Каждая live- или rerun-оценка записывает связанные события в локальную сессию `oma-harness-<suite-id>`:

| Событие | Payload |
|---|---|
| `harness.eval.started` | Действие, hash suite/baseline/candidate/evaluator, раздел, hash манифеста, определённый vendor, модель, версия CLI и число задач. |
| `harness.arm.completed` | По одному на arm: задача, arm, статус прохождения, длительность, hash output, ошибка dispatch, код выхода, флаг timeout и trace arm. `parentEventId` указывает на событие started. |
| `harness.eval.completed` | Решение, lift, статус evidence, а также путь и hash record, если использовался `--record`. |

Все события одной оценки используют общий `causalityKey`. Если событие не удаётся записать, report перечисляет `Trace event <kind> was not recorded` как ограничение replay, а не пропускает его молча.

Каждый запуск arm также сохраняет в record `diagnostics` и `trace`:

- `diagnostics`: код выхода, сигнал, флаг timeout и последние 8 КиБ stderr вместе с `stderrStatus` (`captured`, `truncated` или `unavailable`).
- `trace`: то, что harness смог наблюдать. `output` равен `complete`, `partial` (завершившийся ошибкой процесс всё же вывел stdout) или `unavailable`; `artifacts` показывает, полон ли итоговый снимок; `changedPaths` перечисляет файлы, которые arm добавила, изменила или удалила относительно закреплённого начального workspace (не более 200, с `changedPathsTruncated`); `toolCalls` всегда `unsupported`, потому что CLI vendor не предоставляют harness наблюдений по отдельным инструментам.

Поэтому неудавшаяся arm сохраняет частичный output, хвост stderr, статус выхода и изменения файлов, и последнюю ошибку можно проследить до того, что arm изменила. Отсутствие наблюдения записывается как состояние; оно никогда не выглядит как чистый запуск.

## Метрики и gate решения

Каждая task проходит только после успешного прохождения всех check. Score — это взвешенное среднее по парным task:

```text
lift = candidateScore - baselineScore
```

OMA также сообщает:

- corrected tasks: baseline не прошёл, candidate прошёл;
- regressed tasks: baseline прошёл, candidate не прошёл;
- coverage: требуется не менее пяти парных оцениваемых task.

Решение по score — `pass`, когда lift не меньше 5 процентных пунктов и regression отсутствуют. Любая regression проваливает candidate. Нулевой или положительный lift ниже 5 пунктов выдаёт предупреждение, а менее пяти парных task даёт решение `insufficient`. Добавьте `--require-coverage`, чтобы в CI недостаточное coverage завершалось ненулевым кодом. Score не является evidence, если arm отсутствует, hash record устарел или детерминированная check не завершена. Ошибки live dispatch и целостности evaluator приводят к решению fail; они не могут засчитываться как успешный lift. Rescoring и fixture replay исключают arm с недостаточным evidence из оцениваемых пар и сообщают решение `insufficient`, а не считают отсутствующее evidence regression candidate.

Успешный score не устанавливает право на продвижение. Report содержит раздел, hash evaluator, `promotionReady: false` и явные причины блокировки. В legacy- и validation-запусках нет evidence final-test. Текущие маршруты dispatch не удостоверяют ограничение доступа к файловой системе, поэтому даже запуск final-test не может претендовать на защищённую финальную оценку или разрешить продвижение. Это поле остаётся false, пока провайдер выполнения не сможет установить эту границу.

## Текущая граница

Candidate overlay создаются внешними средствами; эта команда не реализует builder или автоматический цикл `harness opt`. Доступны захват артефактов, offline rescoring, воспроизведение fixture инструментов, rerun из закреплённых файлов, выбор раздела, снимки evaluator, манифесты выполнения, allowlist окружения и связанные события trace, но секретность отложенных (held-out) данных на уровне ОС, ограничение доступа к сети или credential, повторные стохастические испытания, учёт token и принудительная фиксация модели для вложенных вызовов subagent не обеспечены. Allowlist окружения ограничивает, какие переменные наследует процесс vendor; он не мешает CLI vendor читать собственное хранилище credential или обращаться к сети. Пока фиксация вложенных вызовов отсутствует, suite, предназначенные для измерения одной фиксированной модели, должны избегать candidate workflow, которые запускают другие настроенные роли agent.
