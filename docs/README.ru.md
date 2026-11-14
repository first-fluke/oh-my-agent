# oh-my-agent

**Выпускайте 400+ коммитов в день.**

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Nederlands](./README.nl.md) | [Polski](./README.pl.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md)

<a id="install"></a>
## Установка

### Для людей

Запустите это из корня проекта.

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

### Для AI-агентов

Вставьте это в своего агента для программирования:

```text
Install and configure oh-my-agent in this project by following this guide:
https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/docs/agent-install.md
```

[Руководство по установке для агента](./agent-install.md) описывает неинтерактивную настройку и проверку. Если вы и есть агент, прочитайте это руководство и выполните установку.

Затем откройте агента и наберите `/orchestrate build a TODO app with login`.

oh-my-agent (`oma`) превращает Claude Code, Codex CLI, Cursor и ещё 11 агентов для программирования в команду. Планировщик разбивает работу, инженеры ведут разработку параллельно, ревьюер проверяет результат, а отладчик устраняет корневую причину.

<a id="start-with-your-task"></a>
## Начните с задачи

Выберите задачу. Загрузите один навык в агента, которым уже пользуетесь, или установите всю команду.

| Ваша задача | С чего начать | Первый запрос |
|---|---|---|
| [Проверить код, написанный ИИ](../web/docs/tasks/review-ai-code.md) | `bunx skills use first-fluke/oh-my-agent@oma-qa` | "Review this diff for bugs and missing checks. Cite the affected lines." |
| [Спроектировать экран админки](../web/docs/tasks/design-admin-ui.md) | `bunx skills use first-fluke/oh-my-agent@oma-design` | "Review the hierarchy and table density of our admin page." |
| [Исправить падающий тест](../web/docs/tasks/debug-failing-tests.md) | `bunx skills use first-fluke/oh-my-agent@oma-debug` | "Reproduce this test failure, fix its cause, and run the affected checks." |
| Проверить границы системы | `bunx skills use first-fluke/oh-my-agent@oma-architecture` | "Review the boundary between our API and worker." |
| Запустить всю команду | [Установите oma](#install) | `/orchestrate add login to this app` |

Выполните команду `skills use` в терминале агента. Она загружает один этот навык. Для полной команды с рабочими процессами [установите oma](#install). Остальные варианты описаны в разделе [Выбор настройки](../web/docs/getting-started/choose-setup.md).

[![Oh-My-Agent: A 6+1-Layer Harness Architecture](./assets/architecture/oh-my-agent-architecture.png)](./assets/architecture/oh-my-agent-architecture.svg)

После установки выполните `oma doctor`. [Первые 5 минут](#your-first-5-minutes) начинаются с задачи только на чтение, до командных рабочих процессов.

## Что вы получаете

**Workflows** описывают то, что вы набираете (или просто говорите). Они вызывают **роли**, то есть специалистов. **Навыки (skills)** дают знания и приёмы: у каждой роли есть свои, а остальные ваш агент загружает, когда они нужны задаче.

| | Что это даёт | Попробуйте |
|---|---|---|
| **12 ролей-специалистов** | PM, архитектор, инженеры бэкенда, фронтенда, мобильной разработки, баз данных и инфраструктуры, QA-ревьюер, отладчик, рефакторщик, куратор документации, исследователь ([знакомьтесь](#meet-the-team)) | `/orchestrate build a TODO app with login` |
| **20 workflow** | Slash-команды от `/brainstorm` и `/plan` до `/review`, `/debug` и `/scm`. Четыре мультиагентных режима запускаются и тогда, когда обычная просьба называет их по имени | «ultrawork: add rate limiting» |
| **33 навыка** | Знания по областям, которые загружаются, только когда они нужны задаче: UI, API, схемы, Terraform, CI, безопасность, git, observability | загружаются сами, например «add a Terraform S3 bucket» |
| **Файлы, которые можно открыть** | Планы, дизайн-документы, API-контракты, ADR, заметки о багах, результаты по агентам, доказательства проверок безопасности, HTML-разборы, сводки | `ls .agents/results` |
| **Исследования и контент** | Поиск со ссылками на источники, исследование рынка, научные статьи, презентации, MP4-видео, изображения, локальный голос, PDF/HWP в Markdown | `/video`, `/convert` |
| **Одна папка, 14 runtime** | Одна портативная директория `.agents/`, которая записывается в собственные конфигурационные файлы каждого runtime | `oma link cursor` |

**[Установка](#install)** · **[Первые 5 минут](#your-first-5-minutes)** · **[Команда](#meet-the-team)** · **[Какой workflow?](#how-the-team-works-together)** · **[Всё, что в комплекте](#everything-in-the-box)** · **[Совместимость](#works-with)** · **[FAQ](#faq)** · **[Документация](https://firstfluke.com/oh-my-agent/)**

<a id="installation-details"></a>
## Подробности установки

Скрипт устанавливает [bun](https://bun.sh), если его нет, глобально устанавливает команду `oma` (`bun install --global oh-my-agent`; шаг пропускается, если `oma` уже есть в PATH), а затем запускает интерактивную настройку. Глобальная команда важна: hooks (распознавание ключевых слов, Stop-гейт) и несколько workflows вызывают `oma`, а hooks молча ничего не делают, если не могут её найти. Если вы не используете скрипт, установите её сами через `bun install --global oh-my-agent` (подойдут и `npm install --global oh-my-agent` или `brew install oh-my-agent`).

<details>
<summary>Windows или установка без скрипта</summary>

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

```bash
# Любая ОС с установленным bun: та же настройка плюс глобальная команда `oma`
bun install --global oh-my-agent
oma
```

В Windows установщик скрывает Antigravity, Hermes и Kimi, а обёртка hooks написана на bash. Browser MCP по умолчанию, Aside, устанавливается через `bash`, поэтому снимите с него выбор, если bash у вас нет.

</details>

Настройка сохраняет выбранный язык ответов или определяет его по системе. Она спрашивает, какие runtime агентов подключить, провайдеров возможностей, browser MCP, пресет моделей и пресет навыков. **Выберите `All`, чтобы получить ссылки на навыки, которые используются во всех рабочих процессах**: предметные пресеты часть этих навыков опускают. Доступность провайдеров и проверка задачи остаются отдельными проверками.

Выбирайте пресет явно, когда нужны навыки одной области:

```bash
oma install --preset frontend --yes
```

Так выбираются восемь навыков пресета frontend. Установщик всё равно настраивает runtime, провайдеров и общие файлы рабочих процессов и сохраняет ранее установленные навыки. Свой набор доступен в интерактивном установщике. См. [значения пресетов](../web/docs/getting-started/installation.md#presets) и [зависимости рабочих процессов](../web/docs/getting-started/installation.md#workflows-that-need-skills-outside-a-preset).

<details>
<summary>Что ещё установщик делает по умолчанию</summary>

- Устанавливает **bun** (обязательно). Пытается установить **uv**, **Serena** (`uv tool install`) и **CUE** (`brew install cue` или `winget`) и продолжает с предупреждением, если что-то из них не установилось.
- В интерактивной настройке заранее выбирает browser MCP **Aside** и устанавливает его через `curl -fsSL https://releases.aside.com/install.sh | bash`, только если вы оставите его выбранным. Снимите выбор на шаге browser MCP или поменяйте позже через `oma update mcp`.
- Использует **AgentMemory** для семантической памяти: выполняет `bun install -g @agentmemory/agentmemory` и регистрирует его как службу, запускаемую при входе в систему (launchd, пользовательский unit systemd или запланированная задача Windows). Чтобы пропустить это, выберите провайдер `none` или задайте `OMA_NO_AGENTMEMORY=1`.
- Спрашивает разрешения, прежде чем создавать ссылки на навыки в папках вендоров в домашней директории (Antigravity, Hermes, Kimi). В `$HOME` без `--global` запрашивает подтверждение.
- Без спроса записывает некоторые файлы вне проекта: `~/.claude.json` (помечает проект как доверенное рабочее пространство Claude Code), `~/.serena/` (контекст OMA, минимальный размер ответа, регистрация проекта), `~/.cursor/cli-config.json` (отключает атрибуцию коммитов в Cursor), `~/.grok/config.toml` (телеметрия) и `~/.gemini/antigravity-cli/` (HUD), каждый только для выбранного вами вендора.
- Записывает **отказ от телеметрии** в настройки вендоров (Claude `DISABLE_TELEMETRY=1`, что также отключает Claude Code Remote Control; статистика использования Gemini, Qwen, Codex и Grok). Задайте `telemetry: true`, чтобы оставить настройки вендоров по умолчанию.
- Отключает **автоматическое сохранение памяти Qwen Code**, добавляя `memory.enableManagedAutoMemory: false`, если этой настройки нет. Явные значения `true` или `false` и остальные настройки памяти сохраняются.
- Добавляет в `.claude/settings.json` незаданные настройки Claude Code, включая `skipDangerousModePermissionPrompt: true`, `effortLevel: high`, `cleanupPeriodDays: 180` и env-флаги, которые отключают auto memory, adaptive thinking, отправку отчётов об ошибках и встроенные инструкции git. Уже заданные вами значения сохраняются.
- Добавляет **co-author trailer**: атрибуция коммитов Claude Code становится `Co-Authored-By: First Fluke <our.first.fluke@gmail.com>`, а в PR добавляется строка "Generated with oh-my-agent". Задайте `scm.co_author.enabled: false`, чтобы это отключить.
- Устанавливает в `.githooks/` **commit-msg guard**, который отклоняет адреса `Co-authored-by`, отсутствующие в списке, и выполняет `git config --local core.hooksPath .githooks`, если другие hooks не активны. Чтобы отказаться, задайте `scm.co_author.enforce_hook: false`.
- `oma update` обновляет CLI `oma` в фоне (`auto_update_cli: false` или `OMA_SKIP_VERSION_CHECK=1`, чтобы это остановить) и запускает `uv tool upgrade serena-agent --prerelease=allow` (`serena.auto_update: false`).
- Когда Serena работает в режиме `bridge` по умолчанию, первая сессия агента, запустившая общий сервер Serena, регистрирует **таймер очистки**, который каждые 5 минут останавливает простаивающие общие серверы Serena (launchd `dev.oma.serena-daemon-gc`, пользовательский таймер systemd `oma-serena-daemon-gc.timer` или запланированная задача Windows `OMA Serena Daemon GC`). Задайте `serena.mode: stdio`, чтобы не запускать общий сервер и его таймер. `oma uninstall` не удаляет этот таймер.
- Неинтерактивные запуски (`-y`, `OMA_YES=1`, `CI=true`) используют пресет навыков `All`, если другой не выбран через `--preset`, плюс `model_preset: auto` и Python как язык бэкенда. Они не выбирают browser MCP (и пропускают скрипт установки Aside), если в `mcp.devtools_browsers` ещё нет ни одного.

</details>

<details>
<summary>Пресеты навыков</summary>

| Пресет | Навыки |
|--------|--------|
| **All** | **Все 33 навыка** (рекомендуется) |
| Fullstack | architecture, backend, brainstorm, db, debug, design, dev-workflow, frontend, mobile, pm, qa, scm, tf-infra |
| Fullstack Web | Fullstack без mobile и tf-infra |
| Fullstack Mobile | Fullstack без frontend и tf-infra |
| Frontend | architecture, brainstorm, debug, design, frontend, pm, qa, scm |
| Backend | architecture, backend, brainstorm, db, debug, dev-workflow, pm, qa, scm |
| Mobile | architecture, brainstorm, debug, mobile, pm, qa, scm |
| DevOps | architecture, brainstorm, debug, dev-workflow, observability, pm, qa, scm, tf-infra |
| Research | academic-writing, hwp, market, pdf, scholar, scm, search, translation |
| Content | academic-writing, design, image, scm, translation, voice |
| Custom | Выбор навыков по одному |

Из именованных пресетов только `All` включает coordination, orchestration, docs, security, refactor, explanation, recap, video, slide и skill-creation (или выберите их в `Custom`). В Research и Content нет навыков, на которых построены `/plan`, `/review`, `/debug`, `/architecture` и `/brainstorm`. См. [Workflows, которым нужны навыки вне пресета](../web/docs/getting-started/installation.md#workflows-that-need-skills-outside-a-preset).

</details>

<a id="your-first-5-minutes"></a>
## Первые 5 минут

1. **Выберите настройку.** Для задачи ниже загрузите `oma-scm` командой `bunx skills use first-fluke/oh-my-agent@oma-scm` или используйте команду установки runtime выше. [Выбор настройки](../web/docs/getting-started/choose-setup.md) объясняет оба пути.
2. **Для установки runtime проверьте установку:**

   ```bash
   oma doctor
   ```

   Отчёт показывает состояние CLI и файлов навыков. Число навыков отражает файлы, которые есть на диске, включая сохранённые навыки; оно может отличаться от набора текущего пресета. Если `oma` не находится, откройте новый терминал или выполните `bun install --global oh-my-agent`.
3. **Откройте существующий Git-репозиторий и выполните одну задачу только на чтение.** `oma-scm` входит в каждый именованный пресет; включите его и при выборе Custom.

   ```text
   Use oma-scm to inspect this repository's current branch and working tree. Do not edit, stage, commit, or contact remotes. Report staged, unstaged, and untracked changes, with the Git commands and exit statuses actually observed.
   ```

4. **Проверьте результат.** Сообщённые ветка и изменения должны совпасть с выводом Git. Загрузка инструкций или завершение установки сами по себе не доказывают, что эта задача выполнилась.

Для более крупной работы выберите рабочий процесс, чьи указанные навыки установлены. Начните с `/plan`, если навык планирования установлен, затем продолжите с `/work` или `/orchestrate`, когда их зависимости доступны.

<a id="meet-the-team"></a>
## Знакомьтесь с командой

Командой руководит ваш собственный агент. В `/work`, `/orchestrate` и `/ultrawork` он передаёт каждую задачу подходящему специалисту, который работает как отдельный субагент. `/plan`, `/architecture` и `/docs` выполняются в текущей сессии с навыком соответствующей роли, а `/review` и `/debug` подключают своего специалиста при большом объёме работы. Если роль назначена на CLI другого вендора, `oma agent spawn` запускает её там.

| Ваш специалист | Навыки | Как вызвать | Что оставляет |
|---|---|---|---|
| **Продакт-менеджер** (`pm-planner`) | oma-pm | `/plan` | JSON плана и трекер в `docs/plans/work/` для работы уровня Medium и Complex (запросы уровня Simple получают прямую рекомендацию) |
| **Архитектор** (`architecture-reviewer`) | oma-architecture | `/architecture` | ADR или рекомендация в `.agents/results/architecture/` |
| **Инженеры бэкенда, фронтенда, мобильной разработки, баз данных и инфраструктуры** | oma-backend, oma-frontend + oma-design, oma-mobile, oma-db, oma-tf-infra | `/work`, `/orchestrate` | Код, тесты и файл `result-<agent>` для каждой задачи |
| **QA-ревьюер** (`qa-reviewer`) | oma-qa | `/review` | Находки ранжируются от CRITICAL до LOW. У каждой есть file:line и код исправления |
| **Отладчик** (`debug-investigator`) | oma-debug | `/debug` | Минимальное исправление, регрессионный тест и заметка о баге в `.agents/results/bugs/`, когда она оправдана |

<details>
<summary>Остальные три роли и навыки без роли</summary>

| Ваш специалист | Навыки | Как вызвать | Что оставляет |
|---|---|---|---|
| **Рефакторщик** (`refactor-engineer`) | oma-refactor | фаза REFINE в `/ultrawork` | Коммиты `refactor:`, сохраняющие поведение, и отчёт `result-refactor-<session>.md` |
| **Куратор документации** (`docs-curator`) | oma-docs | `/docs` или «verify docs» | `docs/generated/doc-refs.json` и одобренные вами патчи документации |
| **Исследователь** (`research-explorer`) | oma-search, oma-market, oma-scholar | исследовательский запрос | Источники со ссылками и сведениями об их происхождении; рыночные обзоры в `.agents/results/market/` |

Инженеру инфраструктуры (`tf-infra-engineer`) предписано спрашивать разрешения перед любым `apply` или `destroy`, который что-то разрушает или затрагивает production. У остальных навыков (brainstorm, security, scm, dev-workflow, observability, explanation, recap, translation, coordination, orchestration, skill-creation, контент и медиа) нет отдельной роли. Ваш агент загружает их сам, а для большинства из них skill injector подсказывает нужный по вашему промпту.

</details>

<a id="how-the-team-works-together"></a>
## Как команда работает вместе

```text
 THINK   /brainstorm ......................... docs/decisions/<NNN>-<feature>.md
 PLAN    /plan · /architecture ............... plan JSON, API contracts, ADR
 DESIGN  /design ............................. DESIGN.md + tokens
 BUILD   /work · /orchestrate · /ultrawork ... code + result-<agent> files, engineers in parallel
 CHECK   /review · /security · /debug ........ findings, security evidence, regression test
 SHIP    /scm · /docs ........................ Conventional Commits, doc fixes
```

Каждый шаг передаёт файл следующему. `/brainstorm` сохраняет дизайн, который читает `/plan`, а `/plan` пишет план, в котором у каждой задачи есть агент, зависимости, критерии приёмки и команда проверки. `/orchestrate` выполняет этот план (загружает самый свежий `plan-*.json` или пишет новый). `/work` и `/ultrawork` начинают с того, что PM пишет для них собственный план. Пропускайте ненужные этапы: каждый этап работает и сам по себе.

**Какой workflow запустит команду?**

| Что нужно | Запуск | Чем заканчивается |
|---|---|---|
| Только план | `/plan` | Файл плана для работы в нескольких областях или прямая рекомендация для небольшой работы |
| Разработка под руководством PM, за которой вы следите шаг за шагом | `/work` | PM, затем инженеры уровень за уровнем, затем QA. Находки CRITICAL и HIGH уходят в цикл исправлений (до 5 циклов) |
| Параллельная разработка без вашего участия | `/orchestrate` | Готовыми считаются только задачи, чьи проверки прошли; у каждой задачи до 3 попыток, после чего она помечается как частично выполненная или проваленная |
| Рабочий процесс из пяти фаз | `/ultrawork` | Пять фаз с гейтами (PLAN, IMPL, VERIFY, REFINE, SHIP); каждое ревью проходит в свежей сессии ревьюера |
| «Не останавливайся, пока всё действительно не готово» | `/ralph` | Повторяет `/ultrawork` с отдельно запущенным судьёй со свежим контекстом, пока не пройдут все критерии; останавливается с частичным отчётом, если критерии заблокированы, или после 5 итераций |
| Команда по расписанию | `oma schedule create qa-reviewer "review open PRs" --every 2h` | Один Markdown-лог на каждый запуск в `~/.oma/schedule/runs/<id>/` |

Workflow запускает slash-команда. Обычная просьба его не запускает, но в runtime с prompt-хуком она всё равно получает подсказку о навыках: наборы ключевых слов, охватывающие до 11 языков, сопоставляются с промптом и направляют вашего агента к подходящим навыкам («run a security audit» подключает `oma-qa`). Подсказка носит рекомендательный характер, а ключевые слова внутри блоков кода игнорируются.

`/orchestrate`, `/work`, `/ultrawork` и `/ralph` становятся **persistent**, когда вы вызываете их по имени в виде slash-команды или обычным текстом («ultrawork: add rate limiting»). Тогда при попытке остановиться раньше времени агент возвращается к работе (до 5 раз или в течение 2 часов), пока вы не скажете **«workflow done»**. Только эти четыре workflow можно запустить обычной фразой, и только по имени.

**Измерено, с оговорками.** В [бенчмарке](../benchmarks/README.md) (один промпт, Claude Code с пятью разными наборами дополнений, включая вариант без них, `claude-opus-4-6`, по одному прогону на каждый) oma набрал 80.6 против 70.7 у обычного Claude Code при стоимости в 1.7 раза выше ($4.04 против $2.37) и времени в 1.8 раза больше.

<details>
<summary>Все 20 workflow</summary>

| Команда | Что делает |
|---------|--------------|
| `/architecture` | Взвешивает компромиссы дизайна и выдаёт рекомендацию, ревью или ADR |
| `/brainstorm` | Исследует идеи и ограничения и выдаёт утверждённый дизайн до планирования |
| `/convert` | Конвертирует PDF/HWP в Markdown или перекодирует изображения, видео и аудио через ffmpeg |
| `/debug` | Воспроизводит баг, устраняет корневую причину, пишет регрессионный тест и ищет похожие паттерны |
| `/deepinit` | Описывает существующую кодовую базу в AGENTS.md, ARCHITECTURE.md и базе знаний docs/ |
| `/design` | Определяет рамки дизайн-задачи и выдаёт находки, DESIGN.md или токены через oma-design |
| `/docs` | Находит битые ссылки в документации и предлагает патчи для документов, затронутых diff |
| `/explain` | Превращает diff, PR, ветку или тему в автономный интерактивный HTML-разбор |
| `/orchestrate` | Запускает агентов параллельно, координирует их через файловое состояние и проверяет результат (persistent) |
| `/plan` | Разбивает фичу на приоритизированные задачи с API-контрактами |
| `/ralph` | Повторяет `/ultrawork` с отдельно запущенным судьёй, до 5 итераций (persistent) |
| `/recap` | Подводит итог истории ваших диалогов с ИИ за день или период |
| `/review` | Проверяет безопасность (OWASP Top 10), производительность, доступность (WCAG 2.2 AA) и качество кода |
| `/schedule` | Регистрирует задание агента, которое запускается с повторяющимся интервалом |
| `/scm` | Работает с ветками, слияниями, конфликтами, worktree и Conventional Commits |
| `/security` | Сканирует исходный код, skills агентов и компоненты MCP, проверяет находки и настраивает гейты CI |
| `/stack-set` | Определяет ваш стек и генерирует под него справочные материалы для доменных навыков |
| `/ultrawork` | Пять фаз (PLAN, IMPL, VERIFY, REFINE, SHIP), каждое ревью проходит в свежей сессии ревьюера (persistent) |
| `/video` | Превращает бриф в готовый MP4 через пайплайн, которому ключи не обязательны |
| `/work` | Координирует нескольких агентов в многодоменном проекте с планированием PM и ревью QA (persistent) |

`oma verify triggers` оценивает детектор на размеченном корпусе из 212 промптов на английском и корейском. CI падает, если доля ложных срабатываний превышает 10% или пропусков превышает 20%. Последний замер: **0% missed-fire, 0% false-fire**. Полный справочник: [Workflows](https://first-fluke.github.io/oh-my-agent/docs/core-concepts/workflows/).

</details>

<a id="everything-in-the-box"></a>
## Всё, что в комплекте

<details>
<summary><strong>Планирование и дизайн</strong>: <code>/brainstorm</code>, <code>/plan</code>, <code>/architecture</code>, <code>/design</code></summary>

| Команда | Что делает | Что пишет |
|---|---|---|
| `/brainstorm` | Задаёт по одному уточняющему вопросу за раз и предлагает 2-3 подхода, которые работают по-разному, а затем передаёт работу `/plan`. Код не пишет | `docs/decisions/<NNN>-<feature>.md` |
| `/plan` | Оценивает работу как Simple, Medium или Complex; для Medium и Complex разбивает её на задачи, у каждой из которых есть агент, зависимости, критерии приёмки и команда проверки, а если работа пересекает границу, определяет API-контракты | `.agents/results/plan-<sid>.json`, `docs/plans/work/<NNN>-<name>.md`, контракты в `.agents/results/api-contracts/` при необходимости |
| `/architecture` | Сначала читает прежние решения, сравнивает не менее 2 вариантов и помечает заменённые ADR как superseded | ADR или рекомендация в `.agents/results/architecture/` |
| `/design` | Определяет рамки и контекст, выбирает дизайн-рекомендации под задачу, а затем выдаёт находки аудита, `DESIGN.md` или токены, сопоставленные с существующей системой токенов проекта | Находки, `DESIGN.md`, дизайн-токены |

</details>

<details>
<summary><strong>Разработка</strong>: 7 доменных навыков и <code>/stack-set</code>, чтобы подогнать их под ваш стек</summary>

| Навык | Что строит |
|---|---|
| oma-frontend | UI на React/Next.js или Angular, который следует вашим токенам, правилам i18n и доступности |
| oma-backend | API, аутентификация и доступ к данным, слои router → service → repository |
| oma-mobile | Приложения на Flutter, React Native или Swift |
| oma-db | Схемы, миграции, оптимизация запросов, планы векторного/RAG-поиска |
| oma-tf-infra | Terraform для любого облака с явным указанием рисков дрейфа, разрушительных изменений и стоимости |
| oma-dev-workflow | Задачи mise, lint/format/typecheck, commitlint, git hooks, CI/CD и релизы |
| oma-observability | OpenTelemetry, SLO, алертинг и форензика инцидентов |

`/stack-set` читает ваши манифесты и пишет справочные материалы под ваш стек для навыков бэкенда, фронтенда и мобильной разработки. В monorepo инженеры фронтенда, бэкенда и мобильной разработки направляются в свой workspace (pnpm, workspaces npm/yarn/bun, lerna, nx, turbo, `mise.toml`).

</details>

<details>
<summary><strong>Ревью, исправление и выпуск</strong>: <code>/review</code>, <code>/security</code>, <code>/debug</code>, refactor, <code>/scm</code></summary>

| Команда или навык | Что делает | Что пишет |
|---|---|---|
| `/review` | Аудит зависимостей, затем OWASP Top 10, производительность, WCAG 2.2 AA и качество кода. У каждой находки есть file:line и код исправления | Отчёт в чате плюс запись в памяти; файла отчёта нет |
| `/security` | Сканирует ваш исходный код, skills агентов и MCP-серверы (Deepsec, Cisco Skill and MCP Scanner) и проверяет находки. Пентесты запускаются только по явному запросу и только на платформе выполнения, которую вы предоставили и проверили. Workflow требует сообщать о движке, который не смог запуститься, как о сбое, а не как о чистом результате | `.agents/results/security/<run-id>/` |
| `/debug` | Воспроизводит сбой, устраняет корневую причину минимальным изменением, добавляет регрессионный тест и ищет тот же паттерн в других местах | Исправление и тест; заметка о баге в `.agents/results/bugs/`, когда она оправдана |
| oma-refactor | Меняет структуру, не меняя поведения: сначала характеризационные тесты, затем коммиты только с рефакторингом | `.agents/results/refactor/` |
| `/scm` | Conventional Commits, разделённые по логическим изменениям; ветки, слияния, rebase и worktree | Коммиты и ветки |

</details>

<details>
<summary><strong>Документация и знания</strong>: <code>/deepinit</code>, <code>/docs</code>, <code>/explain</code>, <code>/recap</code>, перевод</summary>

| Команда или навык | Что делает | Что пишет |
|---|---|---|
| `/deepinit` | Превращает существующий репозиторий в базу знаний, готовую для агентов | `AGENTS.md`, `ARCHITECTURE.md`, `docs/` |
| `/docs` | Находит битые ссылки, вносит патчи в документацию, затронутую diff (только одобренные вами), и находит устаревшие переводы | `docs/generated/doc-refs.json`, исправленные документы |
| `/explain` | Превращает PR, ветку или staged-изменения в HTML-разбор с квизом из 5 вопросов, а для темы создаёт одностраничный визуальный разбор | `.agents/results/explain/<date>-<slug>.html` |
| `/recap` | Подводит итог ваших диалогов с ИИ во всех инструментах за день или период | `.agents/results/recap/<date>.md` |
| oma-translation | Перевод, который читается как текст носителя языка; плейсхолдеры, код и ключи локалей остаются без изменений | Переведённый текст |

</details>

<details>
<summary><strong>Исследования</strong>: поиск, рынок, научные статьи, академическое письмо</summary>

| Навык | Что делает | Что пишет |
|---|---|---|
| oma-search | Поиск по документации, вебу и коду с пометкой, что было прочитано, а что известно только по выдержке | Результаты со ссылками на источники |
| oma-market | Боли, тренды и конкуренты по сигналам сообществ, разложенные по SWOT, пяти силам Портера и PESTEL | `.agents/results/market/<topic>-<date>.md` |
| oma-scholar | Поиск статей, который читает компактный файл утверждений (формат Knows, около 700 токенов) вместо полного PDF (около 10K токенов) | `<paper>.knows.yaml` |
| oma-academic-writing | Пишет и проверяет академические тексты по рубрике | Ваш файл |

</details>

<details>
<summary><strong>Контент и медиа</strong>: <code>/video</code>, <code>/convert</code>, презентации, изображения, голос</summary>

| Команда или навык | Что создаёт | Что пишет |
|---|---|---|
| `/video` | Короткие ролики, обучающие видео или демо в виде готового MP4; у провайдеров, которым нужен ключ, есть резервные варианты без ключа | `.agents/results/videos/<run>/` с манифестом |
| oma-slide | HTML-презентации 1920×1080 с экспортом в PDF, PNG или PPTX | `.agents/results/slides/<session>/` |
| oma-image | Изображения через CLI вендоров, в которые вы вошли, со сравнением бок о бок | `.agents/results/images/<run>/` |
| oma-voice | Локальный синтез речи и транскрипция через приложение Voicebox | `.agents/results/voice/<run>/` |
| `/convert` | PDF или HWP в Markdown; конвертация изображений, видео и аудио через ffmpeg | Рядом с входным файлом |

Эти пайплайны сообщают об отсутствующем источнике или ключе вендора, а не возвращают молча урезанный результат.

</details>

<details>
<summary><strong>Hooks, которые работают без запроса</strong></summary>

| Hook | Что делает | Как отключить / лимит |
|---|---|---|
| Запуск по ключевому слову | Запускает `/orchestrate`, `/work`, `/ultrawork` или `/ralph`, когда обычная просьба называет его по имени | Вопросы, вставленный текст и блоки кода пропускаются |
| Skill injector | Направляет агента к нужным для промпта навыкам | Приостанавливается, пока активен persistent workflow |
| Stop-гейт | Возвращает persistent workflow к работе; с `oma goal set --gate test` остановка разрешается, когда этот скрипт завершается с кодом 0 в пределах 25 с | Скажите «workflow done»; кроме того, он снимается после 5 блокировок или через 2 часа |
| Refactor guard | При остановке отмечает отредактированные файлы длиннее 500 строк для `refactor-engineer` | Включается явно: `refactor_guard.enabled` |
| Secret guard | Блокирует `git add` для `*.env`, `*.pem`, `id_rsa*`, `*.tfstate` и похожих файлов | Добавьте `OMA_SCM_ALLOW_SECRETS=1` перед этой одной командой |
| Code-search guard | Блокирует нативный рекурсивный поиск в проекте, чтобы агент пользовался Serena или Gortex | `providers.code_intelligence_guard: off` |
| Фильтр тестов | Оставляет из вывода тестов только падения и сводки, чтобы тратилось меньше токенов | `OMA_TEST_FILTER=0` |
| Память сессии | Когда вы переключаете или возобновляете сессию (или после compaction), заново внедряет недавние события активной сессии плюс recall из AgentMemory | Провайдер памяти `none` или `OMA_NO_AGENTMEMORY=1` отключает recall; локальный снимок событий остаётся |

`oma hook probe` проверяет, что prompt-хуки oma принимают входные данные hook от каждого runtime (сам runtime при этом не запускается). Какие hooks подключает каждый runtime, указано в разделе [Различия хостов](#host-differences).

</details>

<details>
<summary><strong>Параллельные агенты, сессии и дашборды</strong></summary>

- `oma agent spawn <role> "<task>" <sid>` запускает роль в Antigravity, Claude Code, Codex, Cursor, Grok, Kimi Code, Kiro, OpenCode, pi или Qwen Code с `--isolation worktree` и `--fallback-vendors`. `oma agent parallel` запускает несколько ролей сразу. Эти 10 целей dispatch входят в число 14 интеграций установщика.
- Добавьте `--read-only`, чтобы перед запуском требовалось ограничение вендора. Codex использует свою песочницу только для чтения, Claude использует plan mode, а Pi исключает `edit`, `write`, `bash` и `powershell`. Остальным CLI нужен явный `read_only_flag`; отсутствующий, пустой или заведомо конфликтующий флаг останавливает dispatch. Свои флаги объявляют поддержку в CLI или обёртке. Исключения инструментов Pi не ограничивают произвольные инструменты расширений или MCP; OMA не добавляет песочницу операционной системы.
- `oma state list --all-projects` и `oma state get <sid>`: сессии и все записанные события.
- `oma dashboard terminal` / `oma dashboard web`: статус агентов в реальном времени (веб-дашборд слушает только `127.0.0.1`). [Руководство по дашборду](../web/docs/guide/dashboard-monitoring.md).
- `oma stats get` (метрики продуктивности), `oma retro` (ретроспектива по git), `oma recap --window 7d` (что вы делали в разных ИИ-инструментах).
- `oma visualize --affected <paths>`: какие навыки, workflows, агенты и проверки зависят от изменённых вами файлов в `.agents/`.

</details>

<details>
<summary><strong>Code intelligence, память и MCP</strong></summary>

| Слот | По умолчанию | Альтернативы |
|---|---|---|
| Документация | Context7 | — |
| Веб-поиск | Нативный поиск runtime | Brave Search |
| Code intelligence | Serena, один общий сервер на проект | Gortex (экспериментально) |
| Семантическая память | AgentMemory | Honcho (экспериментально), none |
| Browser MCP | Aside | Chrome DevTools, Firefox DevTools |

Serena предоставляет навигацию по коду и диагностику на основе LSP, включая обратную связь после нативного редактирования, если она поддерживается. Выбор поставщика не зависит от среды выполнения агента; возможности различаются в зависимости от поставщика и хоста.

Агенты координируются через обычные файлы в `.agents/state/`, без внешнего сервиса. Подробнее: [Провайдеры возможностей](./capability-providers.md).

</details>

<details>
<summary><strong>Улучшение со временем</strong></summary>

- `oma skill eval` измеряет прирост от навыка относительно baseline на отложенных задачах. `oma skill optimize` предлагает правки, которые его повышают, а `--apply` сохраняет их ([гайд по skill-eval](../web/docs/guide/skill-eval.md)).
- `oma harness evolution enable --max-dispatches <n>` планирует ночной цикл, который превращает неудачные запуски в регрессионные фикстуры и применяет прошедшие оценку улучшения навыков как оверлеи проекта. Добавьте `--mode propose`, чтобы только записывать их.
- `oma emit` экспортирует исходники `.agents/` как пакет Agent Skills, пакет Agent Plugins, маркетплейс плагинов Claude Code или `AGENTS.md`.

</details>

<details>
<summary><strong>Конфигурация и защитные механизмы</strong></summary>

- Один принадлежащий пользователю `.agents/oma-config.yaml` сохраняется при обновлениях (сбрасывает его только `oma update --force`); поверх него можно положить приватные оверлеи `.local.yaml` или `.local.cue`. `language` задаёт язык ответов.
- 13 правил проекта (backend, commit, database, debug, design и другие) загружаются как нативные правила в Claude Code и Cursor и индексируются в управляемом блоке `AGENTS.md`, который пишется для Codex, Qwen Code и Pi.
- Обновления сохраняют резервные копии конфигурации и миграций в `.agents/backup/`; поставляемые навыки и workflows заменяются на месте, поэтому держите локальные изменения вне их. `oma uninstall --dry-run` показывает, что будет удалено. `first-fluke/oma-update-action@v1` запускает `oma update` в CI и открывает PR.

</details>

<details>
<summary><strong>Все 33 навыка</strong></summary>

| Навык | Что делает |
|---|---|
| **oma-academic-writing** | Пишет, редактирует и проверяет академические тексты |
| **oma-architecture** | Взвешивает архитектурные компромиссы и определяет границы модулей с анализом ADR/ATAM/CBAM |
| **oma-backend** | Строит API, аутентификацию и доступ к данным на Python, Node.js или Rust |
| **oma-brainstorm** | Вместе с вами исследует идеи до того, как вы возьмётесь за реализацию |
| **oma-coordination** | Пошагово направляет ручную координацию агентов PM, фронтенда, бэкенда, мобильной разработки и QA |
| **oma-db** | Проектирует схемы, миграции, индексы и векторные хранилища |
| **oma-debug** | Находит корневую причину, исправляет баг и пишет регрессионный тест |
| **oma-design** | Строит дизайн-системы с токенами, доступностью и адаптивными макетами |
| **oma-dev-workflow** | Автоматизирует CI/CD, релизы и задачи в monorepo |
| **oma-docs** | Проверяет документацию на битые ссылки, синхронизирует её с изменениями кода и отмечает расхождения переводов |
| **oma-explanation** | Превращает diff, PR, ветку или тему в автономный HTML-разбор, а для изменений кода добавляет квиз |
| **oma-frontend** | Строит интерфейс на React/Next.js или Angular |
| **oma-hwp** | Конвертирует файлы HWP, HWPX и HWPML в Markdown |
| **oma-image** | Генерирует изображения и вариации по референсам, а также может сравнить AI-провайдеров бок о бок |
| **oma-market** | Исследует ваш рынок по сигналам сообществ и структурирует результаты через SWOT, 5F и PESTEL |
| **oma-mobile** | Разрабатывает мобильные приложения на Flutter, React Native или нативном Swift |
| **oma-observability** | Маршрутизирует задачи наблюдаемости по метрикам, логам, трейсам, SLO и форензике инцидентов |
| **oma-orchestration** | Запускает несколько агентов параллельно через CLI |
| **oma-pdf** | Конвертирует PDF-файлы в Markdown |
| **oma-pm** | Планирует задачи, декомпозирует требования и определяет API-контракты |
| **oma-qa** | Проверяет изменения на корректность, безопасность по OWASP, производительность и доступность |
| **oma-recap** | Преобразует историю диалогов в тематические сводки о проделанной работе |
| **oma-refactor** | Рефакторит код без изменения поведения, используя выбор горячих точек, характеризационные тесты и отдельные refactor-коммиты |
| **oma-scholar** | Ищет академическую литературу и создаёт sidecar-файлы Knows для статей с утверждениями, доказательствами и рецензированием |
| **oma-scm** | Управляет ветками, слияниями, worktree и Conventional Commits |
| **oma-search** | Направляет каждый запрос к лучшему источнику и сообщает, откуда получен каждый результат и был ли он действительно прочитан |
| **oma-security** | Сканирует исходный код, навыки агентов и компоненты MCP и проверяет находки; пентесты запускаются только на платформе, предоставленной и проверенной пользователем |
| **oma-skill-creation** | Пишет и проверяет новые навыки OMA |
| **oma-slide** | Генерирует HTML-презентации и экспортирует их в PDF/PNG/PPTX |
| **oma-tf-infra** | Разворачивает мультиоблачную инфраструктуру с помощью Terraform |
| **oma-translation** | Переводит так, будто текст написал носитель языка |
| **oma-video** | Создаёт короткие, обучающие и демонстрационные видео через пайплайн HyperFrames, работающий и без ключей |
| **oma-voice** | Генерирует озвучку и транскрибирует аудио прямо на устройстве |

</details>

<a id="works-with"></a>
## Совместимость

14 целей установщика: Claude Code, Codex CLI, Cursor, Antigravity, Qwen Code, Grok, Kiro, Kimi, OpenCode, Pi, GitHub Copilot, Hermes, CommandCode и ZCode. Пропущенный runtime можно подключить через `oma link <vendor>`. Набор доступных hooks различается; полная матрица приведена в [Поддерживаемых агентах](./SUPPORTED_AGENTS.md).

- **Orca IDE:** [OMA для Orca](../integrations/orca/README.md) добавляет боковую панель и действия палитры команд (Orca 1.4.197+ с экспериментальными плагинами).
- **DeepSeek Harness:** [OMA для DeepSeek Harness](../integrations/dsh/README.md) подключает проверки OMA через плагин Cordis. Требуется `oma` в `PATH`.

<details>
<summary>Логотипы runtime (цели установщика плюс Amp и DeepSeek Harness)</summary>

нативный = oma записывает собственные конфигурационные файлы runtime; адаптер = oma дополнительно добавляет прослойки (shims) для hooks или агентов. Amp сам читает `.agents/skills/` и не является целью установщика.

<table>
<colgroup>
<col span="6" style="width:16.67%" />
</colgroup>
<tr>
<td align="center">
<a href="https://claude.com/product/claude-code"><img src="https://github.com/anthropics.png?size=120" alt="Claude Code" width="48" height="48" /></a><br/>
<strong>Claude Code</strong><br/>
<sub>нативный + адаптер</sub>
</td>
<td align="center">
<a href="https://github.com/openai/codex"><img src="https://github.com/openai.png?size=120" alt="Codex CLI" width="48" height="48" /></a><br/>
<strong>Codex CLI</strong><br/>
<sub>нативный + адаптер</sub>
</td>
<td align="center">
<a href="https://antigravity.google"><img src="./assets/agents/antigravity.png" alt="Antigravity" width="48" height="48" /></a><br/>
<strong>Antigravity</strong><br/>
<sub>нативный SSOT</sub>
</td>
<td align="center">
<a href="https://cursor.com"><img src="https://github.com/cursor.png?size=120" alt="Cursor" width="48" height="48" /></a><br/>
<strong>Cursor</strong><br/>
<sub>нативный + адаптер</sub>
</td>
<td align="center">
<a href="https://github.com/QwenLM/qwen-code"><img src="https://github.com/QwenLM.png?size=120" alt="Qwen Code" width="48" height="48" /></a><br/>
<strong>Qwen Code</strong><br/>
<sub>нативный dispatch</sub>
</td>
<td align="center">
<a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://github.com/deepseek-ai.png?size=120" alt="DeepSeek Harness" width="48" height="48" /></a><br/>
<strong>DeepSeek Harness</strong><br/>
<sub>Cordis plugin</sub>
</td>
</tr>
<tr>
<td align="center">
<a href="https://pi.dev/"><img src="./assets/agents/pi.svg" alt="Pi" width="48" height="48" /></a><br/>
<strong>Pi</strong><br/>
<sub>нативная совместимость</sub>
</td>
<td align="center">
<a href="https://github.com/anomalyco/opencode"><img src="./assets/agents/opencode.png" alt="OpenCode" width="48" height="48" /></a><br/>
<strong>OpenCode</strong><br/>
<sub>нативная совместимость</sub>
</td>
<td align="center">
<a href="https://ampcode.com"><img src="./assets/agents/amp.png" alt="Amp" width="48" height="48" /></a><br/>
<strong>Amp</strong><br/>
<sub>читает .agents/skills</sub>
</td>
<td align="center">
<a href="https://github.com/features/copilot"><img src="https://github.com/github.png?size=120" alt="GitHub Copilot" width="48" height="48" /></a><br/>
<strong>GitHub Copilot</strong><br/>
<sub>skills через symlink</sub>
</td>
<td align="center">
<a href="https://grok.x.ai"><img src="./assets/agents/grok.png" alt="Grok Build" width="48" height="48" /></a><br/>
<strong>Grok Build</strong><br/>
<sub>нативные hooks</sub>
</td>
<td align="center">
<a href="https://kiro.dev"><img src="./assets/agents/kiro.png" alt="Kiro CLI" width="48" height="48" /></a><br/>
<strong>Kiro CLI</strong><br/>
<sub>нативные hooks + agents</sub>
</td>
</tr>
</table>

<p align="center"><sub><a href="./SUPPORTED_AGENTS.md">& ещё</a></sub></p>

</details>

<a id="host-differences"></a>
<details>
<summary>Различия хостов: какие runtime получают распознавание ключевых слов и Stop-гейт</summary>

| Runtime | Распознавание ключевых слов | Stop-гейт |
|---|---|---|
| Claude Code, Codex CLI, Qwen Code, Grok, Kimi | да | да |
| Cursor | да | да (возвращается как follow-up сообщение) |
| Antigravity | да | да (запускает обработчики через bun, а не через обёртку `oma`) |
| OpenCode, Pi | да | best-effort (Pi нужна сборка с `agent_settled`) |
| Kiro | да | нет: Kiro игнорирует вывод Stop-хука |
| CommandCode | нет prompt-хука | да |
| GitHub Copilot, Hermes, ZCode | нет hooks | нет hooks |

</details>

<a id="per-agent-models"></a>
<details>
<summary>Модели по агентам</summary>

`model_preset` в `.agents/oma-config.yaml` определяет, какую модель использует каждая роль агента. Значение по умолчанию, `auto`, следует собственным настройкам агентов и моделей запущенного runtime.

```yaml
language: en
model_preset: auto   # auto | free | antigravity | claude | codex | cursor | kiro | mixed | qwen | <custom_presets key>

# Optional per-agent overrides; they win over the preset
agents:
  backend: { model: openai/gpt-6.1-terra, effort: high }
```

- `mixed` использует Claude для оркестратора, архитектуры, QA, PM и документации и Codex `gpt-6.1-terra` для ролей реализации, поэтому ему нужны и Claude Code, и Codex CLI.
- `free` работает через шлюз FreeLLMAPI, и ему нужны `FREELLM_API_KEY` и запущенный сервер.
- `kiro` нет в меню установщика; задайте его в конфигурационном файле.
- `oma doctor --profile` выводит итоговую модель для каждой роли.
- Полное руководство: [Модели по агентам](https://first-fluke.github.io/oh-my-agent/docs/guide/per-agent-models/)

</details>

<a id="faq"></a>
## Частые вопросы

<details>
<summary><strong>Нужны ли мне все навыки?</strong></summary>

Нет. См. [Пресеты навыков](#install); `All` является безопасным выбором по умолчанию.

</details>

<details>
<summary><strong>Как понять, что всё работает?</strong></summary>

`oma doctor` показывает установленные навыки и предупреждает, если hooks не могут найти `oma`. Во время persistent workflow `oma state list` показывает активную сессию, а `oma state get <sid>` выводит её события гейтов.

</details>

<details>
<summary><strong>Расходует ли это больше токенов?</strong></summary>

Обычно да. Навыки загружаются, только когда они нужны задаче, но мультиагентные workflows и ревью в свежем контексте расходуют больше. В [бенчмарке на одном промпте](../benchmarks/README.md) oma обошёлся в 1.7 раза дороже обычного Claude Code.

</details>

<details>
<summary><strong>Stop-хук всё время блокирует. Как выйти?</strong></summary>

Скажите «workflow done» (или «workflow complete» / «workflow finished», или эквивалент на другом поддерживаемом языке) либо удалите `.agents/state/<workflow>-state-<sid>.json`. Если не сделать ни того ни другого, блокировка снимется сама после 5 блокировок или через 2 часа.

</details>

<details>
<summary><strong>Как обновить или удалить?</strong></summary>

`oma update` обновляет навыки, workflows и hooks и сохраняет вашу конфигурацию (`--with-new-skills` добавляет навыки, появившиеся в релизе; `oma update mcp` позволяет заново выбрать browser MCP). `oma uninstall --dry-run` показывает, что будет удалено; `oma uninstall` удаляет это и сохраняет `oma-config.yaml`, `mcp.json` и написанные вами навыки. Другие решения проблем: [Troubleshooting](https://first-fluke.github.io/oh-my-agent/docs/guide/troubleshooting/).

</details>

<details>
<summary><strong>Что oh-my-agent оставляет модели?</strong></summary>

Планирование и выбор следующего шага остаются за моделью вашего агента, а у oma нет фиксированного графа workflow. Вне модели oma задаёт ограничения для инструментов (secret guard и search guard) и бюджеты. Оно также ограничивает повторные попытки и остановки, ведёт журнал событий, а при заданном гейте ждёт, пока пройдут ваши проверки.

</details>

## Узнать больше

- **[Сайт документации](https://first-fluke.github.io/oh-my-agent/)**: гайды, туториалы и справочник CLI. Начните с [Быстрого старта](https://first-fluke.github.io/oh-my-agent/docs/getting-started/quick-start/) и [Установки](https://first-fluke.github.io/oh-my-agent/docs/getting-started/installation/).
- **[Почему oh-my-agent](https://first-fluke.github.io/oh-my-agent/docs/getting-started/why-oh-my-agent/)**: когда его выбирать и чем приходится платить
- **[Отчёт о бенчмарках](../benchmarks/README.md)**: сравнение с superpowers, ECC и oh-my-claudecode на одном промпте, включая методику, оценки, скриншоты и оговорки
- **[Поддерживаемые агенты](./SUPPORTED_AGENTS.md)**: матрица поддержки по runtime
- **[Подробная документация](./AGENTS_SPEC.md)**: техническая спецификация и архитектура
- **[Провайдеры возможностей](./capability-providers.md)**: экспериментальная настройка Gortex и Honcho, маршрутизация и ограничения
- **[Матрица совместимости навыков](./skills-matrix.md)**: нативное содержимое навыков, справочные материалы и контракты ответов в Claude и Codex

> Добавьте проект в избранное на GitHub.
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Стартовый шаблон: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

## Star History

[![Star History Chart](https://star-history.dera.page/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://star-history.dera.page/#first-fluke/oh-my-agent&type=date&legend=bottom-right)

## Список литературы

<details>
<summary>Исследования, на которых это основано (7 статей)</summary>

- Li, X., Liu, Y., Chen, W., You, B., Di, Z., He, Y., Zheng, S., Choe, K. W., Sun, J., Wang, S., Tao, C., Li, B., Zhao, X., Geng, H., Wu, X., Zhou, J., Chen, X., Xing, H., Li, Y., … Song, D. (2026). *SkillsBench: Benchmarking how well agent skills work across diverse tasks* (Version 4) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2602.12670
- Yu, G., & Wang, X. (2026). *Knows: Agent-native structured research representations* (Version 1) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.17309
- Liang, Q., Wang, H., Liang, Z., & Liu, Y. (2026). *From skill text to skill structure: The scheduling-structural-logical representation for agent skills* (Version 4) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2604.24026
- Chen, C., Yu, Q., Gu, Y., Huang, Z., Li, H., Liu, H., Liu, S., Liu, J., Peng, D., Wang, J., Yan, Z., Meng, F., Qin, E., Che, C., & Hu, M. (2026). *The scaling laws of skills in LLM agent systems* (Version 1) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.16508
- Tang, L., Rashtchian, C., Ferng, C.-S., Tomkins, A., Juan, D.-C., & Vu, T. (2026). *WikiSkill: Compiling agent experience into persistent knowledge for skill evolution* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2608.27454
- Huang, Z., Xu, J., Yang, Y., Gong, Z., Yang, Q., Tian, M., Wang, X., Lv, C., Gao, X., Dai, Q., Liu, B., Qiu, K., Yang, X., Chen, D., Zheng, X., & Luo, C. (2026). *From raw experience to skill consumption: A systematic study of model-generated agent skills* [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2605.23899
- Hong, D. B., Imani, A., & Ahmed, I. (2026). *From anatomy to smells: An empirical study of SKILL.md in agent skills* (Version 2) [Preprint]. arXiv. https://doi.org/10.48550/arXiv.2607.01456

</details>

## Лицензия

MIT
