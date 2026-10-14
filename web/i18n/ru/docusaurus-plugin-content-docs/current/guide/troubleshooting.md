---
title: "Руководство: устранение неполадок"
sidebar_label: Устранение неполадок
description: Диагностируйте сбои установки, конфигурации, вендоров, hooks, dashboard, расписаний, evaluation и результатов агентов по симптому или точному тексту ошибки, с проверками и исправлениями, опирающимися на исходный код.
---

# Устранение неполадок

Начните с машиночитаемой диагностики из корня проекта или установки:

```bash
oma doctor --json
```

Команда должна завершиться JSON, описывающим найденные проблемы установки, вендора, конфигурации и интеграций. Добавьте `--profile`, если проблема связана с разрешением модели или агента. Сохраните JSON при сообщении о проблеме: он содержит выбранные пути и проверки, поэтому не нужно заменять факты предположениями.

## Найдите свой симптом {#find-your-symptom}

| Симптом | Куда перейти |
|---------|-------|
| OMA читает не тот config, или обновление заменило ваши настройки | [CLI или установка используют не те файлы](#the-cli-or-install-is-using-the-wrong-files) |
| `oma install` или `oma update` не может скачать релиз | [Установка или обновление не может скачать релиз](#an-install-or-update-cannot-download-the-release) |
| CLI вендора или модель не запускается | [Вендор не запускается](#a-vendor-does-not-start) |
| Hooks установлены, но ничего не происходит | [Hooks установлены, но не работают](#hooks-are-installed-but-do-not-run) |
| Dashboard пуст, отключён или не запускается | [Dashboard пуст или отключён](#the-dashboard-is-empty-or-disconnected) |
| Запланированное задание отсутствует или завершилось сбоем | [Расписание отсутствует или не запускается](#a-schedule-is-missing-or-did-not-run) |
| Skill eval или optimization сообщает об отсутствии покрытия | [В отчёте evaluation или optimization нет покрытия](#evaluation-or-optimization-reports-no-coverage) |
| Run агента не проходит verify, не завершается или не возобновляется | [Результат нельзя завершить или возобновить](#a-result-cannot-finish-or-resume) |
| CLI напечатал сообщение об ошибке | [Найдите свою ошибку](#find-your-error) |

## Найдите свою ошибку {#find-your-error}

Каждое сообщение ниже печатает CLI. Сопоставляйте начало сообщения.

| Сообщение | Причина | Исправление |
|---------|-------|-----|
| `Unknown plan task: <id>` | ID задачи (из `--task-id` или, по умолчанию, ID агента) не является `id` задачи в `.agents/results/plan-<session>.json` | Передайте `--task-id` с ID задачи из plan |
| `Plan is immutable after dispatch; ...` | Plan сессии изменился после первого dispatch | Восстановите plan или сохраните изменённый plan под новым ID сессии (и с новым `lineage_id`, если вы его задаёте) |
| `Task acceptance contract changed before dispatch` или `Plan changed before dispatch` | Plan редактировали во время запуска run | Повторите попытку, когда plan стабилизируется |
| `Attempt limit reached for workflow lineage and logical goal` | Исчерпан `max_attempts` из plan (по умолчанию 3, включая первую попытку) | Изучите неудачные попытки, прежде чем планировать ещё одну |
| `Cannot verify a finished run; start a new run` | `oma agent verify` запущен после завершения run | Начните новый run через `oma agent begin` |
| `Choose a command, --required, or --affected` | `oma agent verify` не получил режим проверки или получил больше одного | Используйте ровно один из вариантов: `--required`, `--affected PATH...` или `-- <argv>` |
| `No complete test selection for affected paths: ...` | В графе нет полного набора тестов для этих путей | Используйте `--required` |
| `The spawning parent finalizes managed runs; write the claim file instead` | `oma agent finish` вызван для run, запущенного через `oma agent spawn` или `parallel` | Запишите claim во внедрённый путь; parent завершит run сам |
| `Resume requires a session plan with task contracts` | У сессии нет файла plan | Resume работает только для сессий на основе plan; вместо этого запустите задачу заново через spawn |
| `A resume coordinator already owns this session` | Для этой сессии уже выполняется другой `oma agent resume`, или его lease получен с другого хоста | Дождитесь завершения другого resume; lease, оставленный завершившимся процессом на том же хосте, освобождается автоматически |
| `No graph-backed context found for <agent>` | Для этого агента нет контекста графа | Исправьте определение задачи или продолжайте через задокументированный в проекте путь native search |
| `Dashboard failed: port 9847 is already in use. ...` | Порт dashboard занят другим процессом | `DASHBOARD_PORT=8080 oma dashboard web` или остановите другой процесс |
| `Invalid DASHBOARD_PORT: ...` | `DASHBOARD_PORT` не является целым числом от 1 до 65535 | Задайте допустимый порт или удалите переменную, чтобы использовать 9847 |
| `Removed option <old>. Use <new>.` | Команда использовала удалённое написание флага | Используйте флаг, указанный в сообщении |
| `Unknown command: ... Use oma --help.` | Путь команды удалён или переименован | Выполните `oma --help` или `oma describe`, чтобы увидеть актуальные пути |
| `oma agent spawn` завершается с кодом 3 | Процесс вендора завершился с кодом 0, но run не закончился в состоянии `completed` | Прочитайте `unresolved` в run record; см. [Результаты агентов и возобновление](./agent-results-and-resume.md) |

## CLI или установка используют не те файлы {#the-cli-or-install-is-using-the-wrong-files}

Явно проверьте контекст:

```bash
oma doctor --json
oma doctor --profile
```

| Симптом | Причина | Исправление |
|---------|-------|-----|
| Настройка игнорируется, или побеждает глобальное значение по умолчанию | Команды читают глобальные значения по умолчанию из `$OMA_HOME/.agents/` (по умолчанию `~/.oma/.agents/`), затем ближайший общий config проекта и один local overlay. Разные корни проектов-предков не объединяются | Проверьте, какие пути config выбрал `oma doctor --json`, и редактируйте файл, который действительно читается |
| OMA останавливается при загрузке config | Одновременно существуют локальные файлы CUE и YAML, или локальный файл повреждён. OMA останавливается, а не молча игнорирует override | Удалите один из двух локальных файлов или исправьте повреждённый |
| Пользовательская конфигурация заменена после обновления | Обновление запускалось с `--force`. Обычные обновления сохраняют пользовательский config, тогда как force mode может его заменить | Обновляйтесь без `--force`, затем проверьте конфигурацию и созданные пути |

Порядок файлов описан в [Справочнике конфигурации](/docs/guide/configuration-reference). После обновления проверьте конфигурацию и созданные пути:

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` сохраняет неинтерактивный режим.

## Установка или обновление не может скачать релиз {#an-install-or-update-cannot-download-the-release}

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` и исправление через `oma doctor` скачивают релиз, который называет `prompt-manifest.json` в ветке `main`. Сначала они пробуют ресурс `agent-skills.tar.gz` GitHub-релиза `cli-v<version>` с проверкой по его файлу `.sha256`, затем архив исходников этого тега, затем shallow clone тега. Несовпадение контрольной суммы или payload, у которого `.agents/skills/_version.json` называет другую версию, останавливает запуск, а не приводит к попытке другого источника.
<!-- oma-docs:ignore-end -->

| Симптом | Причина | Исправление |
|---------|-------|-----|
| Скачивание не удаётся сразу после выпуска релиза | Манифест называет версию, ресурсы которой ещё публикуются | Подождите несколько минут и повторите попытку |
| Нужно невыпущенное содержимое из `main` | Релизы устанавливают только тегированное содержимое | Включите это для одного запуска: `OMA_UPDATE_CHANNEL=main oma update` |

```bash
OMA_UPDATE_CHANNEL=main oma update
```

Запуск печатает предупреждение: содержимое ветки main не является ни тегированным релизом, ни проверенным по контрольной сумме.

## Вендор не запускается {#a-vendor-does-not-start}

Выполните собственную проверку аутентификации вендора, затем изучите разрешённый профиль OMA:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

| Симптом | Причина | Исправление |
|---------|-------|-----|
| CLI вендора не аутентифицирован | Сессия вендора истекла или никогда не настраивалась | Повторите аутентификацию точной командой вендора, которую показывает `oma doctor` |
| Override модели отклоняется | Override не имеет формы `owner/model`, допустимой схемой, или его вендор не поддерживает выбранный CLI transport | Используйте форму `owner/model` с вендором, поддерживающим этот transport |
| `model_preset: free` не может достучаться до gateway | Разрешённый URL gateway или модель неверны, или настроенная переменная окружения API key пуста | Проверьте URL gateway и модель через `oma doctor --profile`, затем задайте ключ в переменной окружения |
| Child завершается без result artifact | Child не записал claim во внедрённый путь | Проверьте каталог run и статус parent (см. ниже) |

Если карту `free` не задавать, используются `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` и модель `auto`; никогда не помещайте сам API key в YAML.

Запущенный child получает identity run и инструкции результата, записывает claim во внедрённый путь и сообщает свои artifacts; parent завершает managed receipt после получения exit code. Read-only child возвращает `OMA_RESULT_JSON: ...`; эта строка записывается как inspection и не заменяет исполняемую проверку.

## Hooks установлены, но не работают {#hooks-are-installed-but-do-not-run}

| Симптом | Причина | Исправление |
|---------|-------|-----|
| Codex не запускает hooks OMA | Hooks ещё не получили доверие: это первая установка, или обновление изменило строку команды hook | Проверьте `.codex/hooks.json`, затем выполните `/hooks` внутри Codex |

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Дочерние Codex-процессы, запущенные OMA, передают bypass flag для собственного managed-вызова; это не означает доверие hook в сессии Codex, которую вы запускаете сами. См. [Доверие к Codex hooks](/docs/guide/codex-hook-trust).

## Dashboard пуст или отключён {#the-dashboard-is-empty-or-disconnected}

Запустите terminal dashboard из проекта, содержащего файлы сессий:

```bash
oma dashboard terminal
```

| Симптом | Причина | Исправление |
|---------|-------|-----|
| `No agents detected yet` | Workflow ещё не записал файлы session, task или progress в отслеживаемый каталог memory, или dashboard следит за другим каталогом | Дождитесь первого файла progress; запускайте из корня проекта, передайте `--project-root <path>` или задайте `MEMORIES_DIR` |
| Файлы в устаревшем каталоге `.serena/memories/` не отображаются | Dashboard читает `.agents/state/memories/` и не ищет в устаревшем каталоге | Задайте `MEMORIES_DIR` равным каталогу, где лежат файлы |
| `oma dashboard web` завершается с `port 9847 is already in use` | Порт занят другим процессом | Используйте другой `DASHBOARD_PORT` |
| Web-страница остаётся в состоянии Disconnected после перезапуска dashboard | Каждый запуск создаёт новый access token, а открытая вкладка хранит старый | Перезагрузите страницу |

Web dashboard привязывается к loopback и печатает свой URL. Откройте его; страница сама передаёт свой token для web API и WebSocket.

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Другие сигналы dashboard описаны в [Мониторинге dashboard](./dashboard-monitoring.md#troubleshooting-runbook).

## Расписание отсутствует или не запускается {#a-schedule-is-missing-or-did-not-run}

Проверьте manifest и состояние scheduler. Первые две команды только читают; последние две изменяют состояние:

```bash
oma schedule list                 # read-only: synced, stale, missing-in-os, orphan-in-os
oma schedule inspect SCHEDULE_ID  # read-only: one manifest entry
oma schedule sync                 # writes: registers missing jobs and rewrites stale ones
oma schedule run SCHEDULE_ID      # executes the job now (normally invoked by the OS scheduler)
```

| Симптом | Причина | Исправление |
|---------|-------|-----|
| `schedule list` показывает `missing-in-os` или `stale` | Регистрация в ОС отсутствует или устарела | `oma schedule sync` |
| Журнал запуска показывает `Unknown command: schedule:run` | Регистрация создана до переименования команды | `oma update` синхронизирует её автоматически; `oma schedule sync` тоже её перезаписывает |
| `schedule list` показывает `orphan-in-os` | У задания ОС нет записи в manifest | `oma schedule sync --prune`, только когда осиротевшие задания нужно удалить |
| Созданное расписание так и не зарегистрировалось | Оно создано с `--dry-run`, который только показывает preview | Создайте его заново без `--dry-run` |
| Повторяющийся интервал не зарегистрирован | Интервал требует округления | Просмотрите preview, затем примите округление с помощью `--accept-rounded` |
| Задание запустилось, но завершилось сбоем | Процесс вендора завершился с ненулевым кодом, или журнал сообщает `re-auth required` | Проверьте журнал запуска в `~/.oma/schedule/runs/<id>/` и повторите аутентификацию вендора |

## В отчёте evaluation или optimization нет покрытия {#evaluation-or-optimization-reports-no-coverage}

| Симптом | Причина | Исправление |
|---------|-------|-----|
| Skill eval или optimization сообщает об отсутствии покрытия | В `.agents/eval/<skill>/` меньше пяти fixture | Добавляйте fixture, пока их не станет не меньше пяти |
| Mock mode отклоняет записанные rollout | Происхождение записанного rollout не соответствует текущим hash skill и fixture | Перезапишите данные в live mode; не копируйте старый файл `_rollouts` в новый каталог skill и не выдавайте его за актуальное evidence |
| `--apply` отказывается записывать | `--apply` требует строгого положительного результата validation и успешно пройденного test split, принадлежащего runner | Сохраняйте стандартный `--dry-run`, пока просматриваете предлагаемый diff, и сначала исправьте непрошедшую validation |

Принадлежащий OMA skill, изменённый через `--apply`, может быть перезаписан последующим `oma update`.

## Результат нельзя завершить или возобновить {#a-result-cannot-finish-or-resume}

Проверьте файлы run и plan:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

| Симптом | Причина | Исправление |
|---------|-------|-----|
| Завершённый claim отклоняется или понижается | Неудачный receipt, изменившиеся input, отсутствующие artifact, нерешённые пункты или изменившийся task contract | Перед завершением выполните `oma agent verify RUN_ID --required` и исправьте то, о чём сообщает receipt |
| Resume оставляет задачу в состоянии `blocked` | Автоматическому resume нужны `retry_policy: "safe"`, воспроизводимый prompt и оставшиеся попытки | Прочитайте причину в отчёте dry-run. После первого dispatch plan заморожен, поэтому задайте `retry_policy` в plan новой сессии или перезапустите задачу вручную |
| Resume не повторяет задачу | Живой процесс или прерванная native-попытка без ясного partial или failed результата оставляется без изменений, чтобы избежать дублирования работы | Дождитесь живого процесса или сначала завершите native-попытку |

Полный жизненный цикл описан в [Результатах агентов и возобновлении](./agent-results-and-resume.md).

## Как попросить о помощи {#ask-for-help}

Запрашивая помощь, приложите соответствующий результат `oma doctor --json`, команду, ID session/run и нерешённое сообщение. Не включайте credential или содержимое файлов с секретами. Создайте issue на [github.com/first-fluke/oh-my-agent/issues](https://github.com/first-fluke/oh-my-agent/issues).

## См. также {#see-also}

- [Использование OMA](./usage.md#troubleshooting): проблемы настройки, например отсутствующие skills, CLI и конфликты workspace
- [Мониторинг dashboard](./dashboard-monitoring.md#troubleshooting-runbook): сигналы зависшего, упавшего и отключённого dashboard
- [Результаты агентов и возобновление](./agent-results-and-resume.md): run records, claims и восстановление
- [Глоссарий](../getting-started/glossary.md): такие термины, как [запись запуска и claim](../getting-started/glossary.md#run-record-and-claim)
