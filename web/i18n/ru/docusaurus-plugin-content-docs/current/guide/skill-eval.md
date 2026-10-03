---
title: "Оценка полезности skill"
sidebar_label: Оценка skill
description: Как создавать fixture задач evaluation для oma skill eval, использовать соглашение каталога .agents/eval/, типы checker и режимы mock/live.
---

# Оценка полезности skill

`oma skill eval` измеряет, действительно ли загрузка skill улучшает результаты задач агента. Он отвечает на другой вопрос, чем `oma skill audit` (там спрашивается «не дублируют ли друг друга два skill?»): здесь вопрос такой — «помогает ли этот skill?».

Дизайн опирается на два результата исследований: WikiSkill (arXiv:2608.27454) разделяет raw experience, persistent knowledge и executable skills, сохраняя held-out gate для evolution; SkillLens (arXiv:2605.23899) показывает, что utility skill независима от distinctiveness описания — distinct skill может оказаться бесполезным, а пересекающийся skill может помогать.

---

## Как это работает

Для каждой fixture задачи команда запускает две стороны:

1. **Baseline arm** — prompt задачи передаётся агенту без target skill.
2. **Treatment arm** — `SKILL.md` добавляется в начало prompt, затем передаётся та же задача.

Каждая сторона получает оценку (0 = fail, 1 = pass) через checker задачи. Главная метрика:

```
utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)
```

Skill проходит, когда `utilityLift ≥ 5%`. Ниже этого порога появляется warning (marginal lift) или fail (нет lift). Для verdict требуется как минимум 5 оцениваемых task.

---

## Соглашение `.agents/eval/<skill>/`

Размещайте task fixture в `.agents/eval/<skill>/`. Этот путь находится внутри `.agents/`, но за пределами каталога skill, поэтому `oma update` не перезапишет созданные пользователем eval.

```
.agents/eval/
└── oma-scholar/
    ├── claims-only.yaml        ← task fixture
    ├── entity-lookup.yaml
    ├── partial-fetch.yaml
    ├── structured-output.yaml
    ├── edge-empty-response.yaml
    └── _rollouts/
        └── a3f1b2c4d5e6f7a8.json   ← recorded arm outputs + judge verdicts
```

Файлы, начинающиеся с `_`, пропускаются при загрузке fixture task. Подкаталог `_rollouts/` хранит записанные output предыдущих запусков `--live --record`.

---

## Схема task fixture

Каждая fixture — YAML-файл со следующими полями:

```yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
checker:
  type: judge
  rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

| Поле | Обязательно | Описание |
|:------|:-----------|:---------|
| `id` | Да | Уникальный идентификатор task (используется в именах rollout и отчётах). |
| `skill` | Да | Оцениваемый skill (совпадает с именем родительского каталога). |
| `domain` | Да | Метка домена для группировки и выбора соседних task для проверки negative transfer. |
| `prompt` | Да | Prompt task, dispatchимый обеим сторонам. |
| `checker` | Нет | Способ оценить output arm. Если отсутствует, используется `{ type: judge }`. |
| `weight` | Да | Относительный вес для взвешенного среднего score (используйте `1`, если task одинаково важны). |
| `group` | Нет | Метка семейства. `oma skill optimize` оставляет fixture с общим group в одном разделе train/validation/final-test, чтобы почти дубликат не мог просочиться через границу split. |

### Типы checker

#### judge (по умолчанию)

LLM оценивает output arm по rubric и возвращает PASS или FAIL. Это default, когда `checker` отсутствует или `checker.type` не задан.

```yaml
checker:
  type: judge
  rubric: "Does the answer correctly cite the source and avoid hallucination?"
```

Поле `rubric` необязательно; если его нет, используется default rubric: «Does the answer correctly and completely satisfy the task prompt?»

Для краткости rubric можно задать на верхнем уровне:

```yaml
id: minimal-fixture
skill: oma-scholar
domain: research
prompt: "What are the main claims in paper X?"
rubric: "Does the answer enumerate the main claims without adding fabricated ones?"
weight: 1
```

**Важно:** в режиме `--mock` проверка judge требует заранее записанный verdict в `_rollouts/`. Если записанного verdict для задачи нет, она исключается из report с предупреждением. Сначала выполните `--live --record`, чтобы заполнить rollout.

То же относится к любому типу checker, если arm полностью отсутствует: задача исключается, а не получает score 0. Отсутствующие данные не означают плохой ответ — оценка обеих сторон как 0 дала бы `decision: "fail"` при нулевом lift. Исключения, из-за которых число оценённых задач становится меньше `MIN_TASKS`, приводят к `coverage: "insufficient"`.

#### assert (опционально)

Детерминированная проверка подстрок. Используйте её для проверки contract / format / tool-call, где output должен быть точным.

```yaml
checker:
  type: assert
  expect_contains:
    - "section=statements"
    - "partial_fetch=true"
```

Проверка проходит, когда каждая строка из `expect_contains` присутствует в output arm.

#### regex (опционально)

Детерминированное совпадение regex. Используйте, когда нужна pattern, а не точная строка.

```yaml
checker:
  type: regex
  pattern: "section=\\w+"
```

Pattern длиннее 200 символов получает score 0 (защита от ReDoS). Перед сопоставлением output обрезается до 10 000 символов.

---

## Режимы выполнения

### --mock (по умолчанию)

Воспроизводит записанные rollout из `_rollouts/`. Полностью детерминирован и offline — LLM не вызывается.

- Для checker `assert`/`regex`: score вычисляется из записанных строк output.
- Для checker `judge`: воспроизводится поле `score`, записанное через `--live --record`.

Если для task judge в `_rollouts/` нет записанного score, task исключается из report (с предупреждением в консоли). Так mock mode остаётся строго offline.

Перед использованием записи также проверяются на устаревание. Изменения body skill, prompt, контрактов task/checker, эффективных rubric judge и ревизий протокола evaluator делают соответствующие entry недействительными. Отсутствующий provenance также отбрасывается с предупреждением, где указаны файл и количество. Если после этого остаётся меньше `MIN_TASKS` оцениваемых task, запуск сообщает `coverage: "insufficient"`, а не verdict.

:::note `oma skill optimize --mock`
Optimizer оценивает candidate body SKILL.md. Поскольку запись действительна только для body, с которым она создана, для candidate body подходящих rollout нет и они считаются uncovered. Для оценки candidate используйте `--live`.
:::

Безопасно для CI. Задайте `OMA_SKILLEVAL_MOCK=1`, чтобы принудительно включить этот mode.

```bash
oma skill eval --skill oma-scholar
```

### --live

Запускает реальные arm агентов через `oma agent spawn --read-only`. Каждая arm задачи работает в собственном временном workspace, поэтому файлы, созданные одной arm, не влияют на другую. Сбои процесса, конверты ошибок API и сбои judge исключают всё парное сравнение из оценки и записи; частичный output — это диагностические данные.

Перед dispatch команда печатает предварительную оценку стоимости: количество задач, dispatch arm, dispatch judge и разрешённый вендор. Подтвердите `y` или пропустите с `--yes`.

Другие control полезны для CI и исследования coverage:

| Параметр | Действие |
| --- | --- |
| `--task-dir <path>` | Оценивает fixture из каталога, отличного от `.agents/eval/<skill>`. |
| `--max-tasks <n>` | Ограничивает число fixture для bounded live run. |
| `--trials <n>` | Повторяет каждую arm `n` раз (1-10). Arm, запущенная первой, чередуется между trial, оценки по task усредняются, а report получает внутризадачную дисперсию. Соседние task из `--neg-transfer` выполняются один раз. |
| `--neg-transfer` | Измеряет candidate skill на task того же домена, принадлежащих другим skill; по умолчанию выключено. |
| `--routing` | Измеряет активацию: для каждой task спрашивает, какой установленный skill был бы загружен с учётом `description` каждого skill. Live-режим выполняет измерение (один дополнительный dispatch на task); mock воспроизводит запись маршрутизации, сделанную при том же каталоге. |
| `--require-coverage` | Завершает процесс ненулевым кодом, если осталось меньше пяти оцениваемых парных task или запрошенная проверка negative transfer неполна. |

```bash
# Preview and confirm
oma skill eval --skill oma-scholar --live

# Skip confirmation
oma skill eval --skill oma-scholar --live --yes
```

#### Измерение negative transfer

С `--neg-transfer` каждая выбранная соседняя task выполняется дважды: сначала свежий baseline без candidate, затем treatment с внедрённым точным body candidate. Соседние task — это task других skill в том же `domain`. Если ни один другой skill не использует этот домен, вместо этого берётся ограниченная междоменная выборка (до шести task, распределённых по другим skill), а `negativeTransferCoverage.scope` сообщает `cross-domain`; влияние внедрённого body не ограничено его собственным доменом, и уникальный домен не должен делать проверку невозможной. Обе arm используют один и тот же evaluator и отдельные пустые workspace. Delta — это score treatment минус score baseline; отрицательное значение означает, что candidate навредил этой соседней task. Предварительная оценка стоимости в live-режиме учитывает эти дополнительные dispatch arm и judge. `--max-tasks` также ограничивает выборку соседей, с предупреждением, если task пропущены.

Используйте `--live --neg-transfer --record`, чтобы сохранить сравнения для конкретного candidate в `.agents/eval/<candidate>/_negative-transfer/<neighbor>/<body-hash>/_rollouts/`. Mock replay требует совпадения идентичности candidate, hash body, полного hash task/checker и общего ID сравнения для обеих arm. Обычные записи оценки соседа не могут заменить это измерение.

Каждая запись `negativeTransfer` содержит `trials` (парные сравнения, на которых основана `delta`). Оптимизация повторно измеряет регрессировавшего соседа один раз, прежде чем отклонить candidate, и добавляет `confirmed` (`true`, если повтор тоже показал регрессию, `false` — если нет); `oma skill eval --neg-transfer` сообщает единичное сравнение. Report включает `negativeTransferCoverage` с полями `status`, `expected` и `scored`. Status равен `not-requested`, когда флага нет, `measured`, когда у каждого выбранного соседа есть корректный парный результат и выборка непуста, и `insufficient` при нуле соседей или любом отсутствующем сравнении. Поэтому пустой массив `negativeTransfer` не доказывает отсутствие регрессий. JSON `ok` равен false, если для запрошенной проверки negative transfer coverage недостаточно.

#### Изоляция skill (чтобы baseline оставался честным) {#skill-isolation-keeping-the-baseline-honest}

`utilityLift` имеет смысл только если **baseline arm запускается без target skill**. Проблема в том, что dispatchированный agent автоматически загружает все skill, установленные в его runtime, поэтому наивный baseline всё равно подхватил бы skill, который должен измеряться без него — сравнение загрязняется (baseline ≈ treatment, lift ≈ 0).

Чтобы этого не произошло, `--live` запускает **обе стороны в отдельных временных workspace**. Защищённые профили Claude и Codex отключают автоматическое обнаружение skill/инструкций и инструменты агента. Treatment получает target **только** через внедрённый `SKILL.md`. Exploratory-профили используют отфильтрованный каталог skill без target, но одно это не доказывает изоляцию.

Чистый рабочий каталог скрывает локальное для проекта обнаружение skill, но изоляция runtime зависит и от профиля vendor. Report показывает проверенный уровень в поле `isolation`:

| Статус | Значение |
|---|---|
| `enforced` | Защищённый Claude с допустимым ID target и без копии в HOME либо нативный Codex с подавлением discovery/инструментов и проверками thread в runtime. Сбой runtime-контракта прерывает dispatch. |
| `best-effort` | Runtime без защищённого текстового профиля, недопустимый ID target либо копия Claude в HOME; изоляция не проверена. |
| `unavailable` | Vendor использует HOME (например, **antigravity**, который читает `~/.gemini/antigravity-cli/skills`); чистый cwd не может скрыть skill. Печатается warning, результат имеет низкую уверенность. |
| n/a | Mock mode — live dispatch отсутствует. |

Другие runtime-профили остаются доступными для exploratory-оценки, но результаты `best-effort` и `unavailable` блокируют продвижение live-оптимизации. Eval vendor следует конфигурации моделей проекта. Codex использует собственный вход в CLI и настроенные модель/провайдер через `app-server`; он не переключается молча на Claude или клиент с API-ключом. Защищённый контракт Codex рассчитан на CLI 0.154.x на macOS/Linux с нативным файловым хранилищем credential и существующим `auth.json`. Приватный временный config home ссылается на исходные файлы config/auth и исключает общее bootstrap-состояние; credential не копируются, а нативное обновление использует исходный файл auth. Хранилища credential keyring, auto и ephemeral сейчас не поддерживаются. Неподдерживаемые версии, режимы хранилища и сбои контракта становятся ошибками dispatch.

Judge запускаются в свежих временных каталогах с отключённой памятью оптимизации. Judge Claude и Codex используют тот же защищённый текстовый transport, что и arm оценки. Конфигурация vendor judge фиксируется на время запуска.

### --live --record

Запускает live arm и записывает захваченные output (включая judge verdict для task с judge-checker) в `_rollouts/<hash>.json`. Имя файла — детерминированный SHA-256 hash набора ID task, а не дата или случайное значение.

Используйте это для подготовки `--mock` запусков на своей машине, чтобы повторные запуски оставались offline.

Каждая entry содержит provenance, поэтому последующий replay может определить, применима ли она:

| Поле | Записывается для | Сравнивается с |
|---|---|---|
| `skillBodyHash` | только `treatment` | body SKILL.md, который оценивается |
| `promptHash` | обе arm | текущий `prompt` fixture |
| `taskHash` | обе arm | полная task, эффективный checker/default judge rubric и `SKILL_EVAL_PROTOCOL_REVISION` |
| `trial` | обе arm (`--trials` > 1) | связывает baseline и treatment одного повтора; отсутствует при одном trial |
| `judgeResponse` | task с judge | распакованный из конверта текст verdict judge (ограниченного размера), сохраняемый, чтобы сохранённый `score` можно было проверить |

Output arm записываются как текст ответа. Когда CLI vendor возвращает JSON-конверт результата, сохраняется и оценивается поле `result`; служебные данные конверта никогда не сопоставляются checker `assert`/`regex` и не читаются парсером judge.

Baseline arm скрывает skill, поэтому одно лишь редактирование SKILL.md не делает её запись недействительной. Изменения контракта task или evaluator делают недействительными обе arm. Live recording снова запускает обе arm.

Записи, созданные до введения полного provenance task/evaluator, необходимо пересоздать через `--live --record` (и `--neg-transfer` для сравнений соседей); добавление новых hash к старым score не позволяет их проверить. Тот же контракт входит в идентичность suite оптимизации, поэтому прежние знания в рамках suite не используются повторно при обновлённом контракте. Поддерживайте `SKILL_EVAL_PROTOCOL_REVISION`, увеличивая значение при изменении поведения scorer, prompt judge/разбора verdict или другого неявного поведения evaluator.

:::caution `_rollouts/` — только локальный каталог, не коммитьте его
Recording воспроизводится только для точного body SKILL.md, с которым создан. После изменения skill treatment recording отбрасывается при следующем `--mock`, поэтому закоммиченный recording устареет при следующем изменении SKILL.md и выдаст warning всем, кто его получит. Каталог игнорируется Git; записывайте его локально.
:::

```bash
oma skill eval --skill oma-scholar --live --record --yes
```

После успешного live run report содержит оценки baseline и treatment, `utilityLift`, `coverage: "ok"`, статус isolation и решение pass/warn/fail. Последующий mock run использует только записи, у которых prompt задачи и body treatment skill по-прежнему совпадают.

---

### Параллелизм и timeout dispatch

Live arm, arm соседей, вызовы judge и зондирующие запросы маршрутизации выполняются через ограниченный пул из `OMA_SKILL_EVAL_CONCURRENCY` подпроцессов (по умолчанию 4, не более 16). Две arm одного trial всегда выполняются вместе в отдельных пустых каталогах, причём arm, запущенная первой, чередуется между trial, а результаты сохраняют порядок task, поэтому записи и score такие же, как при последовательном запуске. Задайте для переменной значение 1, чтобы выполнять последовательно.

Каждая live arm и каждый вызов judge принудительно завершаются по истечении `OMA_SKILL_EVAL_TIMEOUT_MS` (по умолчанию 180000). Dispatch, завершившийся по timeout, повторяется один раз, прежде чем task исключается из report, потому что один медленный ответ — это сбой transport, а не ответ; второй timeout исключает task (а при оптимизации нарушает coverage split). Увеличьте лимит для fixture, которым действительно нужны длинные ответы.

## Маршрутизация: выбирается ли skill?

Utility lift измеряет, что делает body после загрузки. Vendor решают, загружать ли skill, по `description` из его frontmatter, поэтому лучший body, который никогда не выбирается, улучшением не является. `--routing` отправляет prompt каждой task вместе с именем и описанием каждого установленного skill той же защищённой модели и просит назвать единственный skill, который она загрузила бы (или `NONE`). Выбор target — активация; выбор другого skill — ошибочная маршрутизация; `NONE` — промах.

```text
  routing: measured  activated 5/6 (83%)  misrouted 1 [oma-docs×1]  none 0  unparsed 0  catalog 33
```

JSON-report содержит `routing` с полями `status`, счётчиками, `activationRate`, `misroutedTo` и `catalogSize`; каждый finding содержит `routing: target | other | none | unparsed`. С `--record` выбор сохраняется в `_rollouts/<hash>.routing.json` вместе с hash каталога. Последующий `--mock --routing` воспроизводит его, только пока каждое описание и каждая task не изменились; иначе `status` равен `stale`, и ничего не засчитывается.

Так измеряется описание относительно каталога через защищённый transport. Это не задействует собственный механизм discovery vendor, который защищённый профиль намеренно отключает, и не измеряет, соблюдается ли процедура загруженного skill; это остаётся предметом измерения utility.

## Минимальный рабочий набор fixture

Для verdict требуется пять fixture (`MIN_TASKS = 5`). Вот минимальный набор для условного skill `oma-scholar`:

```yaml
# .agents/eval/oma-scholar/claims-only.yaml
id: claims-only
skill: oma-scholar
domain: research
prompt: "Fetch claims-only for knows:generated/reconvla/1.0.0"
rubric: "Does the answer fetch ONLY the claims via the section=statements partial fetch?"
weight: 1
```

```yaml
# .agents/eval/oma-scholar/entity-lookup.yaml
id: entity-lookup
skill: oma-scholar
domain: research
prompt: "Look up the entity knows:concept/attention-mechanism"
rubric: "Does the answer return the entity name, description, and at least one related concept?"
weight: 1
```

Повторите для ещё минимум трёх task. Затем запустите:

```bash
# Seed rollouts (local only — re-run after any SKILL.md edit)
oma skill eval --skill oma-scholar --live --record --yes

# Offline replay
oma skill eval --skill oma-scholar --json
```

---

## Чтение report

**Текстовый вывод:**

```
Skill utility eval  (skill: oma-scholar)
  tasks: 7
  isolation: enforced [claude]

  baseline: 42.9%  treatment: 71.4%
  utilityLift: 28.6%  (stddev: 14.3%)
  [PASS]
  Skill shows positive utility lift >= 5%.

  Per-task findings:
    claims-only: baseline=0 treatment=1 lift=+1.000
    entity-lookup: baseline=1 treatment=1 lift=+0.000
    ...

  Thresholds: fail <= 0%, warn < 5%
```

**JSON output** (через `--json`):

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "taskCount": 7,
  "coverage": "ok",
  "decision": "pass",
  "baselineScore": 0.4286,
  "treatmentScore": 0.7143,
  "utilityLift": 0.2857,
  "utilityStdDev": 0.1429,
  "repeatability": {
    "trials": 1,
    "liftCi95": { "lower": 0.0918, "upper": 0.4796 },
    "withinTaskStdDev": null,
    "status": "single-trial"
  },
  "findings": [
    { "taskId": "claims-only", "baseline": 0, "treatment": 1, "lift": 1.0, "trials": 1, "liftStdDev": 0, "routing": "target" }
  ],
  "usage": { "status": "actual", "dispatches": 14, "inputTokens": 61234, "outputTokens": 9876, "costUsd": 0.8123, "judge": { "status": "actual", "dispatches": 6, "inputTokens": 12000, "outputTokens": 30, "costUsd": 0.1401 } },
  "routing": { "status": "measured", "measured": 7, "activated": 6, "misrouted": 1, "none": 0, "unparsed": 0, "activationRate": 0.8571, "misroutedTo": { "oma-search": 1 }, "catalogSize": 33 },
  "negativeTransfer": [],
  "negativeTransferCoverage": { "status": "not-requested", "expected": 0, "scored": 0 },
  "isolation": "enforced",
  "isolationVendor": "claude"
}
```

`usage` суммирует то, что vendor сообщил для оцениваемых arm и, отдельно, для их вызовов judge: число dispatch, входные и выходные token (включая чтение и запись кэша) и стоимость в USD. `status` равен `actual`, когда usage сообщил каждый dispatch, `partial` — когда не все, и `unknown` — когда ни один (текстовый transport вроде моста Codex ничего не сообщает). Записанные rollout содержат `usage` и `judgeUsage` для каждой entry, поэтому mock replay сообщает стоимость записи, которую использует повторно, а не ноль.

`repeatability` отделяет вариативность между task от вариативности между повторными запусками. `liftCi95` — парный 95%-й t-интервал по lift отдельных task (null при менее чем двух оценённых task). При `--trials` не менее двух `withinTaskStdDev` — это среднее по task стандартное отклонение lift по trial, а `status` равен `stable` только когда интервал исключает ноль со стороны lift; иначе он равен `unstable`, и `pass` понижается до `warn`. Запуск с одним trial сообщает `single-trial`: он может показать lift, но не может показать, что lift воспроизводится.

`ok` равно `true` только при `coverage === "ok"`, `decision === "pass"` и достаточном coverage для любой запрошенной проверки negative transfer. Поле `isolation` показывает, действительно ли baseline arm работал без target skill (см. [изоляцию skill](#skill-isolation-keeping-the-baseline-honest)); `isolation` в режиме `--mock` равно `"n/a"`.

---

## Интеграция с CI

```bash
# Fail the build if the skill regresses or has insufficient coverage
oma skill eval --skill oma-scholar --json --require-coverage
```

Коды выхода:
- `0` — pass или warn
- `1` — fail или недостаточное coverage task/negative-transfer с `--require-coverage`

---

## Выбор live или mock

Используйте `--live` с judge checker, чтобы измерить реальную полезность на открытых задачах. Используйте `--mock`, чтобы offline воспроизвести ранее записанные judge verdict или выполнить детерминированные contract check `assert`/`regex`.

Mock determinism сохраняется так: во время `--live --record` бинарный verdict judge (PASS/FAIL) записывается в rollout entry, а в последующих `--mock` запусках используется записанный score — LLM повторно не вызывается.

**Data egress:** во время `--live` judge dispatch передаёт output candidate arm настроенному vendor для оценки. В начале каждого live run печатается однократное предупреждение.

Если mock run сообщает недостаточное coverage, изучите warning об отброшенных или отсутствующих entry `_rollouts`, затем после исправления fixture или skill выполните live recording. Live-продвижение требует работающего защищённого профиля Claude или Codex с `isolation: "enforced"`; остальные профили остаются exploratory.

---

## Поставка eval task вместе со skill

Skill может содержать набор eval task, если fixture размещены в `.agents/eval/<skill>/`. Это созданные пользователем файлы за пределами каталога skill, поэтому они сохраняются после `oma update`. Создавая новый skill с `oma-skill-creation`, добавьте соответствующий набор fixture в `eval/`, чтобы будущие авторы могли проверить эффект skill. Workflow авторинга описан в `.agents/skills/oma-skill-creation/SKILL.md`.
