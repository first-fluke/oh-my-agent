---
title: "Оптимизация skill"
sidebar_label: Оптимизация skill
description: Используйте oma skill optimize для постоянного развития skill на основе evidence с детерминированными gate train, validation и holdout, которым владеет runner.
---

# Оптимизация skill

`oma skill optimize` развивает `SKILL.md`, чтобы максимизировать измеренный `utilityLift`, который выдаёт `oma skill eval`. Команда разделяет evidence rollout, постоянные scoped knowledge и исполняемый skill. Wiki Maintainer объединяет наблюдаемые успехи и ошибки; Proposer создаёт ограниченные add/delete/replace edits на основе этих знаний. Candidate должен улучшить utility на training или validation без регрессии ни на одном из этих split, при полных измерениях task и negative-transfer. `--apply` также требует полностью измеренного final test, которым владеет runner, без регрессии и проверенной live isolation. При deployment дополнительного wiki lookup во время inference нет: результатом остаётся `SKILL.md`.

Основа исследования: Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C., & Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454

Оптимизация через CLI сейчас требует `--live` и расходует model calls. Путь по умолчанию (без live) и `--mock` не могут генерировать или воспроизводить proposal, потому что загрузчик записанных proposal не реализован; они останавливаются до оценки. Для offline replay используйте `oma skill eval --mock`. Внедряемые API optimizer/scorer остаются доступными для offline-тестов. Одновременная передача `--live` и `--mock` — ошибка.

---

## Жёсткая зависимость: fixture evaluation

`oma skill optimize` не работает без eval task fixtures. Требуется минимум **5 task fixture** (`MIN_TASKS = 5`) в `.agents/eval/<skill>/`. Если найдено меньше, команда немедленно завершится ошибкой:

```
[oma skill opt] no eval coverage for skill "oma-scholar": found 2 task fixture(s), need at least 5. Author tasks first — see web/docs/guide/skill-eval.md
```

См. [руководство Skill Utility Eval](/docs/guide/skill-eval): соглашение о каталоге `.agents/eval/<skill>/`, схему fixture, типы checker и подготовку rollout для mock replay.

Для продвижения также требуется непустой набор соседних task того же домена, принадлежащих другим skill. Каждый validation score candidate и финальный score candidate должны измерять соседей своего оцениваемого split с точным body candidate. Отсутствие соседей или неполные парные записи не позволяют установить отсутствие negative transfer. Offline-оценка может воспроизводить только подходящие записи candidate; для создания и оценки новых candidate используйте live-оптимизацию.

Replay и suite-scoped knowledge привязаны к полному контракту task/evaluator, включая эффективную default judge rubric и ревизию протокола scorer. После этого обновления provenance старые записи и прежние области knowledge требуют свежего evidence; присвоение старым score новых hash не даёт достоверного измерения.

---

## Как это работает

Fixture сортируются по ID задачи и детерминированно делятся на наборы **train**, **held-out validation** и **runner-owned final-test**. При наличии минимум пяти fixture целевые пропорции равны 60/20/20, при этом в каждом разделе есть хотя бы одна задача. Например, восемь fixture после округления дают четыре задачи train, одну validation и три final-test. Fixture с одинаковым `group` назначаются вместе, поэтому переформулированная родственная задача не может оказаться в train, пока оригинал находится в final test; если групп меньше трёх, разбиение возвращается к ID задач и выдаёт предупреждение. Задачи final-test берутся из этого локального набора fixture и скрыты от Maintainer и Proposer. Повторяющиеся ID задач final-test и пересечение с development split отклоняются.

Для каждой epoch (до `--max-epochs`, по умолчанию 8):

1. **Оценка текущего лучшего `SKILL.md` на TRAIN split** — `oma skill eval` возвращает наблюдаемые prompt по task, output и lift. Каждая task во внутреннем split должна иметь обе оценённые arm; неудавшиеся или отсутствующие сравнения не могут уменьшить знаменатель.
2. **Wiki Maintainer объединяет evidence** — до пяти ошибок и трёх успехов становятся evidence-linked pattern. Ошибки выбираются по ценности для обучения: сначала regression, затем самые глубокие общие ошибки; task, которые обе arm уже проходят, исключаются, поскольку ничего не говорят о следующем edit. Успехи ранжируются по lift. Scoped pattern и результаты предыдущих gate извлекаются из memory system OMA L1/L2/L3.
3. **Proposer создаёт K candidate edits** (до `--edits-per-epoch`, по умолчанию 4). Точные edits, уже находящиеся в persistent rejection history, пропускаются.
4. **Для каждого candidate edit:**
   - применить edit к находящейся в памяти копии `SKILL.md`;
   - проверить candidate (`name`/`description` frontmatter должны сохраниться; body должен разобрать parser);
   - применить textual learning-rate budget: отбросить edit, если чистое изменение символов превышает `--lr` (по умолчанию 600 символов);
   - повторно оценить каждую задачу в **held-out validation split** (с парными сравнениями baseline/candidate на соседних task) и каждую задачу в **held-in training split** (без сравнений на соседях).
5. **Принять лучший допустимый candidate** по правилу held-in/held-out: candidate ничего не теряет ни на одном split (`Δval ≥ 0` и `Δtrain ≥ 0`) и выигрывает хотя бы на одном из них. Ранжирование candidate выполняется по `Δval + Δtrain`. Строгий выигрыш на validation не требуется, потому что body, который уже проходит все задачи validation, всё же можно исправить по сбою на training, не теряя результат на held-out; а final test решает, обобщается ли это исправление. Покрытие task должно быть полным, непустая выборка negative-transfer должна быть измерена полностью, и ни один сосед не должен показывать подтверждённую regression на уровне `NEG_TRANSFER_FAIL = -0.1` или ниже. В live-запусках сосед, у которого regression проявилась при первом парном сравнении, измеряется повторно один раз; записанная delta — среднее по обоим сравнениям, и candidate отклоняется только при воспроизведённой regression (`confirmed: true`). Mock replay не может измерять повторно, поэтому regression по единственному trial остаётся в силе. Live report должен объявлять `isolation: "enforced"`. Результаты proposal gate записываются вместе с `deltaLift` (validation), `deltaTrainLift` и delta соседей, лежащими в основе вердикта.
6. **Остановиться досрочно** после 2 последовательных epoch без принятого edit (`OPT_EARLY_STOP_PATIENCE = 2`).
7. **Выполнить final test, которым владеет runner, после evolution.** Исходный body и validation winner должны покрывать каждую задачу final-test. Candidate не должен терять lift на final-test (`candidateLift >= baselineLift`; выигрыш, ради которого он был принят, уже показан на development split, а строгий выигрыш на небольшом зафиксированном тесте сделал бы большинство исправлений не подлежащими продвижению) и должен пройти ещё одну полную проверку negative-transfer для конкретного candidate. `finalTest.findings` перечисляет lift по каждой task для исходного body и candidate, чтобы неудачный тест можно было прочитать как реальную regression или как одну шумную task. Отсутствующий, неполный или проваленный final test запрещает продвижение. Измеренные неудачи final test остаются аудиторскими записями и не становятся rejection knowledge для последующей оптимизации.

Во время цикла optimizer работает с находящейся в памяти копией candidate.

Неизмеренные candidate записываются как `inconclusive` с причинами вроде `insufficient-coverage`, `negative-transfer-unmeasured` или `unverified-isolation`. Они исключаются из накопленной rejection history и остаются допустимыми для повторной попытки после устранения проблем с условиями оценки. Подтверждённая regression соседа, потеря на любом split (`split-regression`) или отсутствие выигрыша ни на одном split (`no-validation-lift`) — это отклонение. Диагностика, указывающая на неполную оценку или деградировавшую работу Maintainer, блокирует продвижение.

---

## Использование

```
oma skill optimize --skill <id> --live
               [--dry-run | --apply]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes]
               [--json] [--output <format>]
```

### Флаги

| Флаг | По умолчанию | Описание |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | ID skill для оптимизации (простое имя, без разделителей пути). |
| `--dry-run` | **yes (default)** | Предлагать edits и печатать diff без изменения `SKILL.md`; созданные evidence и evolution events всё равно сохраняются. |
| `--apply` | — | Записывать проверенный candidate после прохождения всех gate продвижения, включая полное evidence по final-test и negative-transfer; перед atomic write сохранять исходный файл. Для принадлежащего OMA skill также требуется `--yes`. |
| `--mock` | Режим по умолчанию без live | Replay proposal через CLI не реализован, поэтому этот путь останавливается до оценки. Для offline replay оценки используйте `oma skill eval --mock`. |
| `--live` | — | Обязателен для текущей оптимизации через CLI. Выполняет реальные model calls; печатает cost preview и запрашивает подтверждение, если нет `--yes`. |
| `--max-epochs <n>` | `8` | Максимальное число epoch оптимизации. |
| `--edits-per-epoch <k>` | `4` | Число candidate edit, предлагаемых LLM optimizer для epoch. |
| `--lr <chars>` | `600` | Textual learning-rate budget: максимальное чистое изменение символов для принятого edit. |
| `--yes` | — | Пропустить подтверждение live cost preview и подтвердить поведение перезаписи при применении к принадлежащему OMA skill. |
| `--json` | — | Выводить JSON для CI/CD. |
| `--output <format>` | `text` | Формат вывода (`text` или `json`). |

---

## Минимальный сквозной пример

```bash
# Evaluate one epoch and print a candidate diff without applying it
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1
```

Иллюстративный результат для восьми fixture и candidate, проходящего все gate продвижения:

```
[oma skill opt] skill: oma-scholar, tasks: 8 (train: 4, val: 1, test: 3), dry-run: true

Skill opt  (skill: oma-scholar)
  applied: false
  baselineLift: 0.0%  finalLift: 100.0%  (train 50.0% → 100.0%)
  epochs: 1  acceptedEdits: 1  rejected: 0
  budget: 42 model calls used (no limit)
  finalTest: pass baseline=0.0000 candidate=0.3333

  diff:
--- a/SKILL.md
+++ b/SKILL.md
@@ -12,6 +12,9 @@
 ### When to use
 - User asks to look up an academic paper or technical claim.
+- User asks for a summary of arxiv abstracts or DOI-linked documents.
 - User wants citations or sources for a factual statement.
```

Diff показывает, что optimizer записал бы. `SKILL.md` не меняется, а созданные evolution evidence и scoped gate outcomes сохраняются для будущих запусков.

---

## Применение проверенного улучшения

Когда предложенный diff вас устраивает, повторите запуск с `--apply`:

```bash
# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --live --apply --yes
```

### Процедура как артефакт

Prompt optimizer и maintainer — это и есть процедура улучшения. Они поставляются как встроенные значения по умолчанию и могут быть переопределены файлами в `.agents/evolution/` (принадлежат пользователю: install manifest их никогда не копирует, а `oma update` не удаляет, в отличие от `.agents/eval/`):

| Файл | Роль | Обязательные placeholder |
|---|---|---|
| `optimizer.md` | Предлагает edits `SKILL.md` на основе training evidence и постоянных знаний | `{{body}}`, `{{findings}}`, `{{editsPerEpoch}}` (а также `{{knowledge}}`) |
| `maintainer.md` | Объединяет evidence в переиспользуемые pattern | `{{evidence}}`, `{{priorFacts}}` (а также `{{skillId}}`, `{{suiteHash}}`, `{{epoch}}`) |
| `constitution.yaml` | Поверхности, в которые цикл никогда не должен писать, какие части процедуры может менять мета-оптимизация, `anchors` эталонных данных по умолчанию для meta-запусков и бюджет dispatch | должен перечислять сам себя в `immutable` |

`budget.max_dispatches_per_run` (по умолчанию `null`, без ограничения) применяется в live-запусках: каждый фактический model call (arm task, arm соседа, judge, optimizer, maintainer) расходует одну единицу, а вызов, который превысил бы лимит, отклоняется до его выполнения. Затем цикл останавливается с диагностикой `budget:exhausted`, final test пропускается, продвижение блокируется, а результат сообщает `budget: { limit, used }`. В любом случае расход записывается в сводку запуска, поэтому процедуры можно сравнивать как по стоимости, так и по выигрышу.

`oma skill procedure` печатает активные источники и hash; `--export` записывает значения по умолчанию для редактирования, не перезаписывая существующие файлы. Шаблон, в котором отсутствует обязательный placeholder, отклоняется, а не молча деградирует. Каждый запуск записывает `procedure` (hash каждой части и общий hash) и `memory` в свой результат, сводку запуска и цепочку продвижений, поэтому evidence, полученное при одной процедуре, никогда не путается с другой.

Ответ optimizer читается мягко только в части форматирования: code fence и пустые строки игнорируются, но любая содержательная строка, не являющаяся допустимой строкой `EDIT:` (или одиночным `NO_ACTION`), даёт `parse-error`, и теперь диагностика включает первую некорректную строку, чтобы сбой можно было проследить.

### Абляция memory и статистика по многим запускам

`--memory none` начинает запуск с пустыми знаниями (без извлечённых pattern и истории gate), но всё равно записывает его. Сравнение запусков с `--memory recall` (по умолчанию) и `--memory none` при одном и том же бюджете — это проверка того, помогают ли постоянные знания; утверждение, что цикл учится на опыте, требует такого сравнения, а не самого наличия memory.

`oma skill evolution-stats --skill <id>` агрегирует все записанные запуски skill из `.agents/results/skill-evolution/<id>/*.jsonl`: запуски по статусам, proposal по результату gate и долю принятых, подтверждённые улучшения (final test пройден и продвижение допустимо), применения и откаты, средний итоговый lift, model calls по запускам с учётом расхода и число вызовов на одно подтверждённое улучшение (стоимость процесса, а не запуска), а также те же показатели в разрезе режима memory и hash процедуры. Отчёт мета-оптимизации показывает среднее число вызовов на внутренний запуск для текущей процедуры и каждого candidate, чтобы процедура, выигрывающая по приросту за счёт больших затрат, была видна как таковая.

### Мета-оптимизация: процедура как candidate

`oma skill meta-optimize --target optimizer --skill <a> <b> ... --live` рассматривает prompt optimizer (или maintainer) как объект тестирования. Команда запускает внутренний цикл (`oma skill optimize --dry-run`) для каждого указанного held-out skill, `--repeats` раз, при текущей процедуре; просит proposer предложить до `--candidates` небольших правок шаблона; снова запускает внутренний цикл при каждом candidate с тем же бюджетом `--max-epochs` и `--edits-per-epoch`; и попарно сравнивает каждого candidate с текущей процедурой по (skill, repeat) по сумме приростов training-lift и validation-lift, достигнутых внутренним циклом.

Candidate продвигается только тогда, когда парный bootstrap 95%-й интервал разности его приростов лежит выше нуля (с фиксированным seed, 1000 ресэмплов), существует не менее трёх пар, и ни один skill, улучшившийся при текущей процедуре, не теряет при candidate более половины этого прироста. Внутренний запуск, оценка которого была заблокирована (недостаточное coverage, непроверенная isolation, исчерпанный бюджет), сообщается как неудавшийся и исключается из пар, поэтому сбой не может считаться нулевым приростом для одной из сторон. У held-out skill должен быть запас для улучшения: skill, на котором текущий body уже получает идеальный score, не может показать прироста ни при какой процедуре. `--anchor` называет skill, которые никогда не используются для отбора, но запускаются один раз при текущей и победившей процедуре, чтобы показать дрейф; без флага применяется список `anchors` из constitution, поэтому эталонный набор, объявленный один раз, проверяется при каждом meta-запуске. С `--apply` победивший шаблон записывается в `.agents/evolution/<target>.md` вместе с резервной копией с отметкой времени, патчем в формате unified diff и записью в `.agents/results/skill-evolution/_procedure/promotions.jsonl`, содержащей hash родителя и candidate, hash constitution и evidence (skill, повторы, бюджет, пары, интервал). Без `--apply` ничего не записывается.

Что остаётся неизменным: раздел final-test каждого skill никогда не читается при отборе (метрика — прирост training плюс validation), evaluator и код оптимизации объявлены неизменяемыми (immutable) в constitution, сама constitution не может быть целью, а цель должна присутствовать в `meta_targets`. Внутренние запуски по умолчанию используют `--memory none`, чтобы процедура оценивалась по правкам, которые она создаёт, а не по знаниям, извлечённым из прошлых запусков. Внутренние запуски одной стороны выполняются параллельно для разных skill (`OMA_META_CONCURRENCY`, по умолчанию до 4), а повторы одного skill идут последовательно, потому что evidence каждого skill записывается в собственный файл артефактов. Каждый внутренний запуск записывает общий hash процедуры, при которой он выполнялся, поэтому `oma skill evolution-stats` может отнести последующие результаты к процедуре, которая их создала.

Это форма уровня 5, описанная в обзоре самосовершенствующихся систем (продвижение held-in/held-out в Self-Harness, повторная оценка с bootstrap-интервалами в ADAS, замороженные evaluator как в AlphaEvolve): процедуру пересматривает сама система, но внешняя оценка остаётся вне досягаемости цикла. Стоимость растёт как skills × repeats × (1 + candidates) внутренних запусков; команда печатает верхнюю границу и запрашивает подтверждение, если нет `--yes`.

### Цепочка продвижений

Каждое применение через `--apply` добавляет запись в `.agents/results/skill-evolution/<skill>/promotions.jsonl` и сохраняет рядом с ней пригодный для проверки unified diff в `promotions/<candidate-hash>.patch`. Запись содержит hash body родителя и candidate, установленный путь, путь backup и evidence, лежащее в основе записи: lift на validation и final-test, решение о продвижении, hash suite fixture, ревизию протокола evaluator, а также runtime источника и цели. `oma skill promotions --skill <id>` выводит этот журнал.

`oma skill rollback --skill <id>` восстанавливает body, который заменило последнее применение. Команда отказывается работать, если установленный файл больше не совпадает с candidate этого применения (более поздняя ручная правка была бы потеряна), если backup не совпадает с записанным родителем или если это применение уже было откачено; успешный откат добавляется в тот же журнал с полем `reverses`, указывающим на применение. Для принадлежащего OMA skill патч — это артефакт, который нужно перенести в исходный репозиторий или пользовательский overlay, потому что `oma update` перезаписывает установленную копию; запись помечает `omaOwned: true`, чтобы последующее обновление не приняли за regression.

`--apply` требует как минимум один принятый edit без потери на validation, `finalTest.passed: true` и `promotion.eligible: true`. Эти gate требуют полного внутреннего покрытия task, непустой и полностью измеренной выборки negative-transfer для конкретного candidate и обеспеченной live isolation. Отсутствующий final test, неполные измерения или деградировавшая диагностика compiler блокируют запись. Перед atomic write создаётся backup исходного `SKILL.md`, а diff печатается для проверки.

Live-оценка может удовлетворить gate isolation через защищённый профиль Claude или нативный Codex. Claude сохраняет проверки HOME/target. Codex проверяет, что у эфемерного thread app-server нет источников инструкций и сред инструментов, прежде чем отправить prompt. Остальные runtime-профили остаются exploratory.

### Как увидеть, что эволюционировало

Цикл сообщает о себе в трёх местах, и везде данные читаются из журналов lineage, допускающих только добавление, а не из чьих-либо утверждений:

- `oma skill promotions --all` печатает по одному предложению на каждое изменение по всем skill и процедуре: что было изменено (anchor и замена принятого edit), lift held-in и held-out до и после, выдержал ли final test, а для продвижения процедуры — парную разность прироста, её интервал и skill, на которых она измерялась. `--skill <id>` сужает вывод до одного skill. Записи применения, созданные этой версией, содержат принятые edit и lift на training; более старые записи сводятся к hash.
- `oma doctor` показывает заметку **Evolution**: применённые и откаченные правки skill, последнее изменение по каждому skill, продвижения процедуры и то, что ожидает обратной связи (записанные инциденты без fixture, неудавшиеся запуски, ещё не записанные), вместе с командой, которая их обработает.
- В начале сессии hook снимка состояния вставляют блок `harness evolved since your last session` со списком продвижений, записанных после последней сессии, которая его показывала; каждое изменение объявляется один раз. Маркер хранится в `.agents/state/evolution-notice.json`.

Включите [эволюцию harness проекта](./harness-evolution.md), чтобы по расписанию запускать циклы обратной связи с ограниченным бюджетом:

```bash
oma harness evolution enable --max-dispatches 300
oma harness evolution status --json
```

Автоматические циклы применяют успешные изменения как project overlay, сохраняют незавершённую работу для повтора и делят один лимит dispatch на весь цикл. По умолчанию расписание — ежедневно в 03:00 по местному времени. Используйте `--mode propose` для оценки без применения и `oma harness evolution disable`, чтобы остановить расписание. Мета-оптимизация процедуры остаётся отдельной командой ручного запуска.

---

## Live mode

Live mode вызывает настоящие Maintainer и Proposer и повторно выполняет live eval arm для каждой epoch. Это дорого: каждая оцениваемая task требует baseline и treatment calls, judge fixture добавляют grading calls, а final test оценивает исходное и candidate body. Preview показывает верхнюю границу из фактического split, включая исходный baseline на validation, вызовы на training и compiler, вызовы validation для candidate, две оценки final-test и парные проверки соседей для каждого candidate и для финального candidate. Каждый call имеет timeout 120 секунд. Защищённые arm Claude и Codex отключают инструменты, автоматическое обнаружение инструкций, MCP и память оптимизации.

```bash
# Cost preview + confirm
oma skill optimize --skill oma-scholar --live

# Skip confirmation
oma skill optimize --skill oma-scholar --live --yes

# Live opt, then apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes
```

Cost preview перечисляет верхнюю границу model call до любого LLM call.

Maintainer, Proposer, arm оценки и judge используют общий защищённый текстовый transport в свежих временных каталогах. Claude использует свой ограниченный профиль CLI. Codex использует нативный `codex app-server` с существующим входом в CLI, выбранными моделью/провайдером и reasoning effort; он не подставляет клиент на API-ключе и не переключается на Claude. Профиль Codex рассчитан на CLI 0.154.x на macOS/Linux с нативным файловым хранилищем credential и существующим `auth.json`. Каждый вызов подготавливает приватный временный `CODEX_HOME`, который ссылается на исходные файлы config/auth без копирования содержимого credential. Нативное обновление token по-прежнему использует исходный файл auth. Общее bootstrap-состояние исключается, а временное состояние потом очищается. Хранилища credential keyring, auto и ephemeral сейчас не поддерживаются. Контракт thread проверяется до отправки входных данных модели; неподдерживаемые версии, режимы хранилища и сбои протокола прерывают dispatch. Инструменты, обнаружение инструкций при запуске, доступ к MCP и сохранение сессии отключены, чтобы процессы compiler не могли читать скрытые fixture через инструменты agent. Другие vendor compiler явно завершаются ошибкой, пока у них нет проверенного transport.

Optimizer сообщает `proposed` для допустимых edit и `no-action` только для явного ответа `NO_ACTION`. Сбои процесса/API становятся `dispatch-error`; искажённые ответы без допустимых edit становятся `parse-error`. Эти ошибки не могут превратиться в пустые списки edit. Если Maintainer не может предоставить проверенные pattern, он сообщает `degraded` с причиной dispatch или разбора; резервные pattern исключаются из постоянных знаний, а запуск не может продвинуть candidate. Сбои оценки отображаются в `diagnostics` и записях proposal gate, а не в накопленной rejection history.

---

## JSON output

```bash
oma skill optimize --skill oma-scholar --live --dry-run --max-epochs 1 --json
```

```json
{
  "ok": true,
  "skill": "oma-scholar",
  "baselineLift": 0.0,
  "finalLift": 1.0,
  "baselineTrainLift": 0.5,
  "finalTrainLift": 1.0,
  "epochCount": 1,
  "acceptedEdits": [
    { "op": "add", "anchor": "### When to use", "after": "\n- User asks for a summary of arxiv abstracts or DOI-linked documents." }
  ],
  "rejectedCount": 0,
  "applied": false,
  "diff": "--- a/SKILL.md\n+++ b/SKILL.md\n...",
  "_dryRun": true,
  "finalTest": {
    "baselineLift": 0.0,
    "candidateLift": 0.3333,
    "passed": true,
    "findings": [
      { "taskId": "oma-scholar-doi-summary", "original": 0, "candidate": 1 },
      { "taskId": "oma-scholar-citation-format", "original": 0, "candidate": 0 },
      { "taskId": "oma-scholar-claim-check", "original": 0, "candidate": 0 }
    ]
  },
  "promotion": { "eligible": true, "reasons": [] },
  "diagnostics": [],
  "budget": { "limit": null, "used": 42 },
  "_split": { "trainCount": 4, "valCount": 1, "testCount": 3 }
}
```

`ok` требует `(applied || (acceptedEdits.length > 0 && finalLift >= baselineLift))`, `finalTest.passed === true` и `promotion.eligible === true`. `baselineTrainLift` и `finalTrainLift` показывают held-in split рядом с lift на validation. То же условие ограничивает `--apply`: edit, принятый только ради исправления на training, записывается лишь при прохождении final test. Отсутствующий final test или объект promotion не могут дать `ok: true`. Счётчики `_split` показывают фактическое разбиение локальных fixture.

Например, неизмеренный candidate может дать такой фрагмент report:

```json
{
  "ok": false,
  "acceptedEdits": [],
  "rejectedCount": 0,
  "finalTest": { "baselineLift": 0.0, "candidateLift": 0.0, "passed": false },
  "promotion": {
    "eligible": false,
    "reasons": ["validation:inconclusive", "final-test-failed", "no-validated-candidate"]
  },
  "diagnostics": [
    {
      "stage": "validation",
      "status": "inconclusive",
      "message": "Candidate evaluation is incomplete; retry after repairing the evaluation conditions."
    }
  ]
}
```

Перед повтором изучите `diagnostics`, `promotion.reasons` и любой `finalTest.blocker`. `rejectedCount` не увеличивается для inconclusive proposal. Измеренный провал final-test может увеличить аудиторский счётчик отклонений запуска, оставаясь исключённым из постоянной rejection knowledge.

---

## SSOT caveat для `oma-*` skills

Skills с ID, начинающимся с `oma-`, принадлежат oh-my-agent и перезаписываются `oma update`. Для этих skill `--apply` не рекомендуется — используйте `--dry-run` (значение по умолчанию), проверьте предложенный diff и отправьте значимое изменение в registry. Для пользовательских skill `--apply` безопасен.

Команда печатает предупреждение, если target skill принадлежит OMA:

```
[oma skill opt] warning: "oma-scholar" is an oma-owned skill. --apply output will be overwritten by oma update. Consider using --dry-run and upstreaming the diff instead.
```

---

## Защита от переобучения

Maintainer и Proposer получают evidence rollout TRAIN. Выбор candidate использует отложенный VALIDATION split, а отдельным TEST split владеет runner. Выполнение compiler без инструментов не даёт получить через workspace доступ к этим скрытым fixture и evaluator.

Провал final-test запрещает применение. Его результат остаётся доступным для аудита, но ни результаты gate final-test, ни inconclusive proposal не попадают в постоянные знания оптимизации. Пути записи (recorder), перезагрузки истории и семантического извлечения также исключают legacy-результаты final-test, поэтому последующий запуск не может использовать прежний успех или провал final-test как обратную связь для обучения.

---

## Интеграция с CI

Для offline-проверки в CI существующих записей конкретного candidate используйте evaluation replay:

```bash
oma skill eval --skill oma-scholar --mock --neg-transfer --require-coverage --json
```

Сама оптимизация через CLI требует `--live`; адаптера replay записанных proposal пока нет. Прежнее указание, описывавшее `oma skill optimize --mock` как полноценный offline-optimizer, было неверным. Перенесите задания offline replay на `oma skill eval --mock` или явно включите live-оптимизацию и связанные с ней затраты на модель. Для запусков оптимизации проверяйте JSON `ok` и `promotion.eligible`: нулевой код выхода охватывает и завершённые запуски, в которых не нашлось candidate для продвижения.

Коды выхода оптимизации:
- `0` — optimization завершена (с улучшением или без него)
- `1` — недопустимые входные данные или сбой выполнения, включая оптимизацию через CLI без live, конфликтующие флаги `--live --mock`, недостаточное число fixture, неподдерживаемый vendor compiler, сбой dispatch optimizer или искажённый вывод optimizer

---

## См. также

- [Skill Utility Eval](/docs/guide/skill-eval) — создание task fixture, типы checker, mock/live mode и каталог `_rollouts/`.
- [CLI Commands](/docs/cli-interfaces/commands) — справочник flags всех команд управления skill.
