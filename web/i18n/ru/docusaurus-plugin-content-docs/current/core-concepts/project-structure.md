---
title: Структура проекта
description: "Ориентированная на читателя карта установки oh-my-agent: SSOT в .agents/, типовые ресурсы навыков, рабочие процессы, определения агентов в репозитории, состояние runtime, слои интеграции поставщиков и структура исходного репозитория."
---

# Структура проекта

После установки oh-my-agent проект получает два основных дерева каталогов: `.agents/` (единый источник истины, включая хранилище координации `.agents/state/memories/`) и слои интеграции runtime (например, `.claude/`, `.cursor/`, `.codex/`). Если в качестве провайдера code intelligence выбрана Serena, дополнительно может появиться необязательный каталог `.serena/` с onboarding-памятью Serena. На этой странице описаны общие файлы и необязательные или создаваемые пути, важные при устранении неполадок.

---

## Типовое дерево каталогов

Ниже подробно показаны общие ресурсы и типовые навыки предметных областей. В текущем каталоге 33 каталога навыков; пропущенные навыки имеют ту же схему `SKILL.md` с необязательными `resources/`, `variants/` или каталогами, специфичными для навыка. Если создаваемый или необязательный файл отсутствует, считайте актуальное дерево `.agents/` авторитетным источником.

```
your-project/
├── .agents/                          ← Single Source of Truth (SSOT)
│   ├── oma-config.cue / .yaml    ← Language, model_preset, providers, agent overrides
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Resources used by ALL agents
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── antigravity.md
│   │   │   │       ├── codex.md
│   │   │   │       ├── commandcode.md / kimi.md / kiro.md
│   │   │   │       ├── opencode.md / pi.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/              ← execution, stack, Angular, snippets, checks
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, ORM, checklist, recovery
│   │   │   └── variants/               ← node, python, rust seeds / generated refs
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, tech stack, screen templates, checks
│   │   │   └── variants/               ← stack schema and generated platform refs
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── migration-playbook.md
│   │   │       ├── query-tuning.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   └── reference/
│   │   │       ├── typography.md
│   │   │       ├── color-and-contrast.md
│   │   │       ├── spatial-design.md
│   │   │       ├── motion-design.md
│   │   │       ├── responsive-design.md
│   │   │       ├── component-patterns.md
│   │   │       ├── accessibility.md
│   │   │       └── shader-and-3d.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── plan-phase-protocol.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── verify-ship-protocol.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── ...
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translation/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       ├── anti-ai-patterns.md
│   │   │       └── lang/
│   │   │           ├── _template.md
│   │   │           ├── en.md
│   │   │           ├── ja.md
│   │   │           ├── ko.md
│   │   │           └── zh.md
│   │   │
│   │   ├── oma-orchestration/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/                    ← 21 process definitions
│   │   ├── orchestrate.md             ← Persistent: automated parallel execution
│   │   ├── work.md                    ← Persistent: step-by-step coordination
│   │   ├── ultrawork.md               ← Persistent: 5-phase quality workflow
│   │   ├── ralph.md                   ← Persistent: repeated execution + judge
│   │   ├── plan.md / brainstorm.md / architecture.md
│   │   ├── deepinit.md / review.md / debug.md / design.md
│   │   ├── scm.md / tools.md / stack-set.md / convert.md
│   │   ├── docs.md / explain.md / recap.md / schedule.md / video.md
│   │   └── ...                         ← Keep this list aligned with `.agents/workflows/`
│   │
│   ├── agents/                        ← 12 checked-in subagent definitions
│   │   ├── architecture-reviewer.md / backend-engineer.md
│   │   ├── db-engineer.md / debug-investigator.md / docs-curator.md
│   │   ├── frontend-engineer.md / mobile-engineer.md / pm-planner.md
│   │   ├── qa-reviewer.md / refactor-engineer.md
│   │   ├── research-explorer.md / tf-infra-engineer.md
│   │
│   ├── results/                       ← Plans, claims, reports, and generated artifacts
│   ├── state/                         ← Active workflow state files
│   │   ├── orchestrate-state.json     ← (exists only when workflow is active)
│   │   ├── ultrawork-state.json
│   │   ├── work-state.json
│   │   └── memories/                  ← Coordination memory store (canonical path)
│   │       ├── orchestrator-session-{sessionId}.md ← Session ID, status, phase tracking
│   │       ├── task-board-{sessionId}.md          ← Task assignments and status
│   │       ├── progress-{agentId}-{taskId}-{runId}-{sessionId}.md ← Run-scoped progress updates
│   │       ├── result-{agentId}-{taskId}-{runId}-{sessionId}.md   ← Run-scoped final outputs
│   │       ├── session-metrics.md         ← Session evidence and experiment results
│   │       ├── experiment-ledger.md       ← Experiment tracking (conditional)
│   │       ├── session-work.md            ← Work workflow session state
│   │       ├── session-ultrawork.md       ← Ultrawork workflow session state
│   │       ├── session-cost-{sessionId}.md ← Per-session spawn cost telemetry
│   │       └── archive/
│   │           └── metrics-{date}.md      ← Archived session metrics
│   └── mcp.json                       ← MCP server configuration
│
├── .claude/                           ← IDE Integration Layer
│   ├── settings.json                  ← Hooks registration and permissions
│   ├── hooks/                         ← Only the variant's runtime-required files (see below)
│   │   ├── oma-hook.sh                ← Generated wrapper: resolves oma binary, exec oma hook "$@"
│   │   ├── hud.ts                     ← [OMA] statusline indicator (bun path, not routed via oma hook)
│   │   └── filter-test-output.sh      ← Test-output filter; in-process test-filter pipes Bash test commands through it
│   ├── skills/                        ← Symlinks → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Subagent definitions for Claude Code
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← Optional: Serena MCP (only created if Serena is used)
    └── memories/                       ← Serena's own onboarding knowledge (code_style.md,
        │                                 project_purpose.md, ...); legacy coordination
        │                                 fallback for older projects
        └── ...
```

---

## .agents/: источник истины

Это основной каталог. Здесь находится всё необходимое агентам. Для поведения агентов важен именно он; все остальные каталоги производны от него.

### oma-config.cue и oma-config.yaml

**`oma-config.yaml`**: центральный файл конфигурации, содержащий:
- `language`: код языка ответов (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: строка формата временных меток (`ISO`, `US` или `EU`; по умолчанию `ISO`)
- `timezone`: идентификатор часового пояса IANA; если не указан, используется часовой пояс системы
- `model_preset`: ключ активного пресета модели (`auto` по умолчанию или фиксированный/пользовательский пресет)
- `providers`: провайдеры возможностей для docs, web, code intelligence и семантической памяти
- `auto_update_cli`: фоновая проверка обновлений (по умолчанию `true`, отключение значением `false`)
- `telemetry`: согласие на телеметрию поставщика (по умолчанию `false`)
- `mcp.devtools_browsers`: необязательный список браузеров; отсутствие значения сохраняет существующие записи
- `agents`: необязательные переопределения отдельных агентов (только объект `AgentSpec`)
- `models`: необязательные пользовательские slug моделей
- `custom_presets`: необязательные пользовательские пресеты с необязательным `extends:`

### skills/

Здесь хранится экспертиза навыков. В текущем каталоге 33 каталога навыков и ресурсы `_shared`; пресет `all` строится по этому актуальному дереву.

**`_shared/`**: ресурсы, используемые всеми агентами:
- `core/`: маршрутизация, загрузка контекста, структура prompt, протокол уточнения, бюджет контекста, оценка сложности, шаблоны рассуждений, принципы качества, обнаружение поставщика, метрики сессии, общий чек-лист, извлечённые уроки и шаблоны API-контрактов
- `runtime/`: протокол памяти, спецификация событий, контракт результата и протоколы выполнения для поставщиков
- `conditional/`: измерение Quality Score, ведение experiment ledger и протокол цикла исследования (загружается только при срабатывании)

**`oma-{skill}/`**: каталоги отдельных навыков. Каждый содержит:
- `SKILL.md`: слой 1, загружаемый при маршрутизации навыка. Идентичность, маршрутизация и основные правила.
- `resources/`: слой 2, загружаемый по требованию. Протоколы выполнения, примеры, чек-листы, playbook ошибок, технологические стеки, фрагменты и шаблоны.
- У некоторых навыков есть дополнительные подкаталоги: `variants/` (заготовки backend/mobile), созданные ссылки `stack/` из `/stack-set`, `reference/` (oma-design) и скрипты или конфигурация, специфичные для навыка.

### workflows/

21 Markdown-файл, определяющий поведение slash-команд. Каждый файл содержит:
- YAML frontmatter с `description`
- обязательный раздел правил (язык ответа, порядок шагов, требования к MCP-инструментам)
- инструкции по обнаружению поставщика
- пошаговый протокол выполнения
- определения шлюзов (для постоянных рабочих процессов)

Постоянные рабочие процессы: `orchestrate.md`, `work.md`, `ultrawork.md` и `ralph.md`.
Непостоянные рабочие процессы включают `plan.md`, `brainstorm.md`, `architecture.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`, `convert.md`, `docs.md`, `explain.md`, `recap.md`, `schedule.md` и `video.md`.

### agents/

12 файлов определений субагентов, используемых при запуске агентов через Task tool (Claude Code) или CLI. Каждый файл определяет:
- frontmatter: `name`, `description`, `skills` (какой навык загрузить)
- ссылку на протокол выполнения
- шаблон charter preflight (CHARTER_CHECK)
- сводку архитектуры
- 10 предметных правил
- утверждение: «Never modify `.agents/` files»

### plan-\{sessionId\}.json

Создаётся рабочим процессом `/plan`. Содержит структурированную декомпозицию задач с назначениями агентов, приоритетами, зависимостями и критериями приёмки. Используется `/orchestrate` и `/work`. Сопутствующий читаемый человеком трекер находится в `docs/plans/work/{NNN}-{name}.md` (жизненный цикл задаётся полем `Status`). Постоянные ссылки на дизайн хранятся рядом в `docs/plans/designs/{NNN}-{name}.md`.

### state/

Файлы активного состояния рабочих процессов для постоянных процессов. Эти JSON-файлы существуют только во время работы постоянного процесса. Их удаление (или фраза «workflow done») отключает рабочий процесс.

Подкаталог `state/memories/` — каноническое хранилище памяти координации: состояние сессии оркестратора, доска задач, файлы прогресса и результатов агентов, метрики сессии и телеметрия стоимости. Дашборды наблюдают за этим путём, а CLI разрешает его первым (старые проекты используют резервный устаревший путь `.serena/memories/`). См. ниже раздел [.agents/state/memories/: состояние runtime](#agentsstatememories-runtime-state).

### results/

Файлы результатов агентов. Завершившие работу агенты создают их со статусом (completed/failed), сводкой, списком изменённых файлов и чек-листом критериев приёмки. Оркестратор читает их при сборе, а дашборды — для мониторинга.

### mcp.json

Конфигурация MCP-серверов, включающая:
- определения серверов (Serena и другие)
- настройки памяти: `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (имена инструментов read/write/edit)
- определения групп инструментов для управления через `/tools`

---

## .claude/: интеграция с IDE

Этот каталог связывает oh-my-agent с Claude Code и другими IDE.

### settings.json

Регистрирует хуки и разрешения для Claude Code. Теперь каждая запись хука события использует канонический ABI `oma hook run`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{
          "name": "oma-hook-UserPromptSubmit",
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh --vendor claude --event UserPromptSubmit",
          "timeout": 25
        }]
      }
    ]
  }
}
```

Запись `statusLine` остаётся на прямом пути `bun` (быстрый путь отображения, не маршрутизируется через `oma hook run`).

### hooks/

Каталог `hooks/` поставщика содержит **только файлы, которые что-либо выполняет или читает из этого каталога во время runtime**. Сама цепочка обработчиков (обнаружение ключевых слов, постоянный режим, внедрение навыков и т. д.) работает внутри процесса бинарного файла `oma` через `oma hook run`; файлы обработчиков `.ts` собираются в CLI во время сборки и НЕ материализуются в каталогах поставщиков.

**`oma-hook.sh`**: создаваемый wrapper-скрипт, записываемый `oma link`/`oma install`/`oma update`. Через этот файл проходит каждое событие хука поставщика. Порядок разрешения во время runtime: `$OMA_BIN` (явное переопределение) → `command -v oma` (PATH) → известные каталоги установки, например `$HOME/.bun/bin` и `$HOME/.local/share/mise/shims` (агенты, запущенные из GUI, получают минимальный PATH) → `exit 0` (fail-open, агент никогда не блокируется). В скрипт не записываются сведения, специфичные для машины, поэтому файл побитово одинаков для каждого разработчика и безопасен для коммита. Он передаёт `"$@"` без изменений, поэтому аргументы `--vendor`, `--event` и `--matcher` доходят до `oma hook run` неизменными. Включает пролог self-dedup, подавляющий двойное срабатывание, когда одно событие зарегистрировано и проектной, и глобальной установкой.

**`hud.ts`**: рисует индикатор `[OMA]` в статусной строке с названием модели, использованием контекста (цвета: зелёный/жёлтый/красный) и состоянием активного рабочего процесса. Регистрируется непосредственно под `statusLine` (не проходит через `oma hook run`), чтобы сохранить задержку отрисовки быстрого пути. Материализуется только для поставщиков, чья версия регистрирует `statusLine` или событие только для HUD (например, claude, antigravity и qwen). Определяет диалект поставщика по собственному установленному пути, поэтому копия для поставщика необходима для работы.

**`filter-test-output.sh`**: shell-фильтр, удаляющий шумный вывод test runner. Встроенный обработчик test-filter переписывает обнаруженные команды тестов Bash так, чтобы они проходили через `<hookDir>/filter-test-output.sh`; поэтому этот файл материализуется для каждого поставщика, чья версия регистрирует `test-filter.ts` (кроме cursor).

#### Где на самом деле находится логика обработчиков

Исходники обработчиков — это SSOT в `.agents/hooks/core/`; они работают внутри процесса через `oma hook run`:

**`keyword-detector.ts`**: чистый обработчик (`run(input, ctx): HandlerResult | null`) для обнаружения ключевых слов. Логика:
1. Очищает ввод (удаляет блоки кода, строки в кавычках и вставленные блоки системного эха)
2. Сопоставляет очищенный ввод с триггерами `keywords` (литералы) и `patterns` (regex)
3. Проверяет информационные паттерны в окне из 60 символов вокруг каждого совпадения
4. Применяет защиту от повторного усиления (подавляет срабатывание, если тот же рабочий процесс запустился 2 и более раз за 60 секунд)
5. Возвращает результат `context`, внедряющий `[OMA WORKFLOW: ...]` или `[OMA PERSISTENT MODE: ...]`

**`persistent-mode.ts`**: чистый обработчик (`run()`), который проверяет активные файлы состояния в `.agents/state/` и поддерживает выполнение постоянного рабочего процесса. Вызывается внутри процесса через `oma hook run` для событий `Stop`.

**`scm-guard.ts`**: чистый обработчик (`run()`) события `PreToolUse` (инструменты Bash/shell), который запрещает `git add` для файлов, похожих на содержащие секреты. Применяет `forbidden_patterns` за вычетом `allowed_exceptions` из `.agents/skills/oma-scm/config/commit-config.yaml` (при отсутствии конфигурации используются встроенные значения по умолчанию). В цепочке для claude, codex, cursor, grok, kimi, kiro и qwen запускается перед `test-filter`, а в bridge opencode (`tool.execute.before` выбрасывает исключение для блокировки) и bridge pi (`tool_call` возвращает `{ block: true, reason }`); команда с префиксом `OMA_SCM_ALLOW_SECRETS=1` обходит защиту после явного одобрения пользователя. Широкая индексация (`git add -A` / `git add .`) намеренно не блокируется: это правило зависит от согласия пользователя, которое хук не может наблюдать.

**`code-intelligence-guard.ts`**: чистый обработчик (`run()`) события `PreToolUse`, механически обеспечивающий правило «Code Search». Пока `providers.code_intelligence` разрешается в `serena` (или `gortex`), а `providers.code_intelligence_guard` не равен `off`, он запрещает нативные инструменты поиска (`Grep`, `Glob` в Claude Code) и shell-команды, начинающиеся с утилиты рекурсивного поиска по коду (`rg`, `ag`, `ack`, `fd`, `grep -r`, `find -name`/`-path`, `git grep`); причина отказа называет инструмент провайдера, который следует использовать вместо них (`search_for_pattern`, `find_file`, `find_symbol`). Нерекурсивный `grep` (фильтры в конвейерах, отдельные файлы), `find` без предиката по имени и операции чтения никогда не затрагиваются. Регистрируется сразу после `scm-guard` для claude, codex, cursor, grok, kimi, kiro и qwen; установщик объединяет matchers цепочки, поэтому запись `PreToolUse` для Claude становится `Bash|Grep|Glob`. Shell-команда, содержащая `OMA_CI_ALLOW_NATIVE=1`, по-прежнему обходит защиту, но лишь как служебный обходной путь для оператора при поиске по ресурсам вне проекта или игнорируемым путям, которые защита не распознала. Причина отказа не называет этот префикс, и он не является запасным вариантом для исходного кода проекта.

**`triggers.json`**: сопоставление ключевых слов с рабочими процессами, статически встроенное в бинарный файл `oma` во время сборки (источник: `.agents/hooks/core/triggers.json`). Определяет:
- `workflows`: соответствие имени процесса объекту `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] }, explicit?: [...] }`. `keywords` — буквальные фразы, а `patterns` — необработанные строки regex (компилируемые с флагами `iu`). `explicit` (только для постоянных рабочих процессов) перечисляет ключевые слова, считающиеся явным вызовом: только они включают постоянный режим; любое другое совпадение внедряется как подсказка.
- `informationalPatterns`: фразы, указывающие на вопрос (исключаются из автоматического обнаружения)
- `excludedWorkflows`: рабочие процессы, требующие явного вызова `/command`

Разделы языков в `keywords`, `patterns` и `informationalPatterns` следуют такому соглашению:
- `*`: универсальный/английский.
- `en`: функционально эквивалентен `*`.
- `ko`/`ja`/`zh`/и т. д.: языкоспецифичные формулировки.

Все разделы загружаются всегда; настройка `language` в `.agents/oma-config.yaml` управляет только языком ответов. Границы слов зависят от самого ключевого слова: ASCII-ключевые слова совпадают только как целые слова, а ключевые слова с не-ASCII текстом совпадают как подстроки.

#### Материализация для поставщиков: до → после

Старые установки копировали **весь** набор `.agents/hooks/core/` (около 20 файлов) в каталог хуков каждого поставщика, хотя встроенная диспетчеризация делала большинство из них неиспользуемыми файлами:

```
# BEFORE — every vendor hookDir (.claude/hooks, .codex/hooks, .cursor/hooks, …)
hooks/
├── oma-hook.sh            ← executed (event dispatch)
├── hud.ts                 ← executed (statusLine)
├── filter-test-output.sh  ← read (test-filter pipe target)
├── keyword-detector.ts    ← dead copy (runs in-process via oma hook)
├── persistent-mode.ts     ← dead copy
├── skill-injector.ts      ← dead copy
├── state-boundary.ts      ← dead copy
├── test-filter.ts         ← dead copy
├── code-intelligence-primer.ts ← dead copy
├── triggers.json          ← dead copy (inlined into the oma binary)
├── types.ts, constants.ts, fs-utils.ts, hook-output.ts,
│   agentmemory-client.ts, agy-input.ts,
│   inject-log.ts, state-emit.ts, state-marker.ts,
│   vendor-renderer.ts     ← dead copies (handler-chain internals)
└── …
```

Теперь установщик выводит белый список из JSON-версии поставщика (`requiredVariantScripts` в `cli/platform/hooks-composer.ts`) и материализует только то, что этот поставщик выполняет или читает:

```
# AFTER
.claude/hooks/              .codex/hooks/  .grok/hooks/  .kiro/hooks/
├── oma-hook.sh             ├── oma-hook.sh
├── hud.ts                  └── filter-test-output.sh
└── filter-test-output.sh
                            .cursor/hooks/  .commandcode/hooks/
.qwen/hooks/  .kiro/hooks/  └── oma-hook.sh
(same as .claude where the variant needs it)
```

| Поставщик | Материализуемые файлы | Причина |
|---|---|---|
| claude, qwen | `oma-hook.sh`, `hud.ts`, `filter-test-output.sh` | statusLine + test-filter |
| codex, grok, kiro | `oma-hook.sh`, `filter-test-output.sh` | test-filter, без statusLine |
| cursor | `oma-hook.sh` | без statusLine и test-filter |
| commandcode | `oma-hook.sh` | только Stop — у Command Code нет события prompt, а PreToolUse не может переписать ввод ([справочник хуков](https://commandcode.ai/docs/hooks/reference)) |
| antigravity | нет (в проекте) — `hud.ts` + основные хуки копируются в `~/.gemini/antigravity-cli/hooks/` | agy читает настройки только из HOME, а workspace-хуки из `.agents/hooks.json` запускают обработчики прямо из `.agents/hooks/core/`; проектный `.gemini/antigravity-cli/` никогда не загружается (флаг версии `homeOnly`) |
| pi | полный набор `.agents/hooks/core/` в `.pi/extensions/oma/` | bridge pi запускает обработчики как подпроцессы, а не через хуки настроек |

Перед копированием каталог назначения очищается, поэтому повторный запуск `oma install`/`oma update`/`oma link` в старой установке автоматически удаляет устаревшие файлы полного копирования.

#### Отладка цепочки обработчиков изолированно

Любую цепочку обработчиков можно запустить на настоящем payload, не запуская живую сессию агента:

```bash
# Inspect what keyword-detector injects for a given prompt
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a pre_tool block (Bash tool)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event Stop
```

`oma hook run` всегда завершается с кодом 0 (fail-open). Пустой stdout означает, что цепочка ничего не сделала для этого события. Когда обработчик срабатывает, в stdout записывается JSON диалекта поставщика (или обычный текст для prompt Kiro).

#### Миграция установок до 019

Существующие установки со старыми записями `bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"` автоматически мигрируют при следующем запуске `oma install`, `oma update` или `oma link`. Установщик заменяет группы по маркерам: заменяются только группы хуков, управляемые OMA (определяемые по шаблонам `name`/`command`); добавленные вами группы сохраняются в исходном порядке. Путь `statusLine`/hud не меняется. Встроенный bridge pi не затрагивается. Реализацию маршрутизатора см. в `cli/commands/hook/command.ts` (внутреннее название — «design 019»), а логику материализации для поставщиков — в `cli/platform/hooks-composer/`.

### skills/

Символические ссылки на `.agents/skills/`. Благодаря им навыки видны IDE, читающим `.claude/skills/`, а `.agents/` остаётся единым источником истины.

### agents/

Определения субагентов в формате инструмента Agent для Claude Code. Они ссылаются на файлы навыков и включают шаблон CHARTER_CHECK.

---

## .agents/state/memories/: состояние runtime {#agentsstatememories-runtime-state}

Здесь агенты записывают прогресс во время сессий оркестрации. Это каноническое хранилище памяти координации: CLI разрешает его первым и использует устаревший путь `.serena/memories/` для проектов, созданных до переноса. Файлы сессии и доски задач содержат ID сессии; файлы прогресса и результатов — ID агента, задачи, запуска и сессии. Дашборды наблюдают за этим каталогом и обновляют данные в реальном времени.

| Файл | Владелец | Назначение |
|------|-------|---------|
| `orchestrator-session-{sessionId}.md` | Orchestrator | Метаданные сессии: ID, статус, время начала, текущая фаза |
| `task-board-{sessionId}.md` | Orchestrator | Назначения задач: агент, задача, приоритет, статус, зависимости |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Этот запуск | Пошаговые обновления: выполненные действия, прочитанные/изменённые файлы, текущий статус |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Этот запуск | Итог: статус завершения, сводка, изменённые файлы, критерии приёмки |
| `session-metrics.md` | Orchestrator | Существенные коррекции и доказательства экспериментов |
| `experiment-ledger.md` | Orchestrator/QA | Строки доказательств для фактических экспериментов |
| `session-work.md` | Work workflow | Состояние рабочей сессии |
| `session-ultrawork.md` | Ultrawork workflow | Отслеживание фаз Ultrawork |
| `session-cost-{sessionId}.md` | System | Телеметрия стоимости каждого запуска |
| `archive/metrics-{date}.md` | System | Архивные метрики сессий (хранятся 30 дней) |

Пути файлов памяти и имена инструментов настраиваются в `.agents/mcp.json` через `memoryConfig`.

Собственные onboarding-памяти Serena (`code_style.md`, `project_purpose.md` и похожие файлы знаний) остаются в `.serena/memories/` и отделены от этих артефактов координации.

---

## Структура исходного репозитория oh-my-agent

Если вы разрабатываете сам oh-my-agent, а не только используете его, репозиторий является монорепозиторием:

```
oh-my-agent/
├── cli/                  ← CLI tool source (TypeScript, run with bun)
│   ├── cli.ts / bin/     ← CLI entry points
│   ├── commands/         ← User-facing command families
│   ├── platform/         ← Agent, vendor, skill, and hook adapters
│   ├── vendors/ / utils/ / types/
│   ├── package.json
│   └── install.sh        ← Bootstrap installer
├── web/                  ← Documentation site (Docusaurus)
│   ├── docs/             ← English documentation pages (base locale)
│   └── i18n/             ← Translated documentation pages
├── action/               ← GitHub Action for automated skill updates
├── docs/                 ← Translated READMEs and specifications
├── .agents/              ← EDITABLE in source repo (this IS the source)
├── .claude/              ← IDE integration
├── CLAUDE.md             ← Project instructions for Claude Code
└── package.json          ← Root workspace config
```

В исходном репозитории изменения `.agents/` разрешены (это исключение SSOT для самого исходного репозитория). Правила `.agents/` о запрете изменения этого каталога относятся к проектам-потребителям, а не к репозиторию oh-my-agent.

Команды разработки (запускаются из корня репозитория):
- `bun run test`: тесты CLI (vitest)
- `bun run lint`: lint рабочих пространств CLI и web
- `bun run build`: сборка CLI
- `bun run typecheck`: проверка типов CLI и web
- Коммиты должны соответствовать формату conventional commit (проверяется commitlint)
