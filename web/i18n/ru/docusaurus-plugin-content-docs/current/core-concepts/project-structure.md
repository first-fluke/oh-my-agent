---
title: Структура проекта
description: Исчерпывающее дерево директорий установки oh-my-agent с описанием каждого файла — .agents/ (config, skills, workflows, agents, state, results, mcp.json), .claude/ (settings, hooks, symlinks навыков, agents), .serena/memories/ и структура исходного репозитория.
---

# Структура проекта

После установки oh-my-agent ваш проект получает три дерева директорий: `.agents/` (единый источник истины), `.claude/` (слой интеграции с IDE) и `.serena/` (оперативное состояние). На этой странице описывается каждый файл и его назначение.

---

## Полное дерево директорий

```
your-project/
├── .agents/                          <- Единый источник истины (SSOT)
│   ├── config/
│   │   └── oma-config.yaml    <- Язык, часовой пояс, маппинг CLI
│   ├── skills/
│   │   ├── _shared/                  <- Ресурсы для ВСЕХ агентов
│   │   │   ├── core/                 <- skill-routing, context-loading, prompt-structure,
│   │   │   │                            clarification-protocol, context-budget,
│   │   │   │                            difficulty-guide, reasoning-templates,
│   │   │   │                            quality-principles, vendor-detection,
│   │   │   │                            session-metrics, common-checklist,
│   │   │   │                            lessons-learned, api-contracts/
│   │   │   ├── runtime/              <- memory-protocol, execution-protocols/
│   │   │   │                            (claude, codex, qwen)
│   │   │   └── conditional/          <- quality-score, experiment-ledger, exploration-loop
│   │   ├── oma-frontend/             <- SKILL.md + resources/ (execution-protocol,
│   │   │                                tech-stack, tailwind-rules, component-template,
│   │   │                                snippets, error-playbook, checklist, examples)
│   │   ├── oma-backend/              <- SKILL.md + resources/ + stack/ (от /stack-set)
│   │   ├── oma-mobile/               <- SKILL.md + resources/
│   │   ├── oma-db/                   <- SKILL.md + resources/
│   │   ├── oma-design/               <- SKILL.md + resources/ + reference/ + examples/
│   │   ├── oma-pm/                   <- SKILL.md + resources/
│   │   ├── oma-qa/                   <- SKILL.md + resources/
│   │   ├── oma-debug/                <- SKILL.md + resources/
│   │   ├── oma-tf-infra/             <- SKILL.md + resources/
│   │   ├── oma-dev-workflow/         <- SKILL.md + resources/
│   │   ├── oma-translator/           <- SKILL.md + resources/
│   │   ├── oma-orchestrator/         <- SKILL.md + resources/ + scripts/ + config/
│   │   ├── oma-brainstorm/           <- SKILL.md
│   │   ├── oma-coordination/         <- SKILL.md + resources/
│   │   └── oma-scm/               <- SKILL.md + config/ + resources/
│   ├── workflows/                    <- 16 определений (orchestrate, work,
│   │                                    ultrawork, plan, exec-plan, brainstorm,
│   │                                    deepinit, review, debug, design, commit,
│   │                                    setup, tools, stack-set)
│   ├── agents/                       <- 7 определений субагентов (backend-engineer,
│   │                                    frontend-engineer, mobile-engineer, db-engineer,
│   │                                    qa-reviewer, debug-investigator, pm-planner)
│   ├── results/plan-{sessionId}.json                     <- Сгенерированный план (от /plan)
│   ├── state/                        <- Файлы состояния постоянных рабочих процессов
│   ├── results/                      <- Файлы результатов агентов
│   └── mcp.json                      <- Конфигурация MCP-сервера
│
├── .claude/                          <- Слой интеграции с IDE
│   ├── settings.json                 <- Регистрация хуков и разрешения
│   ├── hooks/
│   │   ├── triggers.json             <- Маппинг ключевых слов (11 языков)
│   │   ├── keyword-detector.ts       <- Логика автодетекции
│   │   ├── persistent-mode.ts        <- Постоянный режим
│   │   └── hud.ts                    <- Индикатор [OMA]
│   ├── skills/                       <- Символические ссылки -> .agents/skills/
│   └── agents/                       <- Определения субагентов для Claude Code
│
└── .serena/                          <- Оперативное состояние (Serena MCP)
    └── memories/
        ├── orchestrator-session.md   <- ID сессии, статус, фазы
        ├── task-board.md             <- Назначения задач и статус
        ├── progress-{agent}.md       <- Прогресс каждого агента
        ├── result-{agent}.md         <- Финальные результаты
        ├── session-metrics.md        <- Clarification Debt и Quality Score
        ├── experiment-ledger.md      <- Отслеживание экспериментов
        ├── session-work.md     <- Состояние work
        ├── session-ultrawork.md      <- Состояние ultrawork
        ├── tool-overrides.md         <- Временные ограничения инструментов
        └── archive/
            └── metrics-{date}.md     <- Архивированные метрики (30 дней)
```

---

## .agents/ — Источник истины

Основная директория. Всё для работы агентов — здесь. Единственная директория, определяющая поведение.

### config/

**`oma-config.yaml`** — Центральный файл конфигурации:
- `language`: Код языка (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: Формат временных меток (по умолчанию: `YYYY-MM-DD`)
- `timezone`: Часовой пояс (по умолчанию: `UTC`)
- `default_cli`: Резервный CLI-вендор
- `model_preset (per-agent overrides via `agents:`)`: Переопределения CLI по агентам

### skills/

22 директории: 21 навык агентов + 1 общая (`_shared/`).

**`_shared/`** содержит:
- `core/` — Маршрутизация, загрузка контекста, структура промптов, качество, вендоры, метрики, API-контракты
- `runtime/` — Протокол памяти, вендор-специфичные протоколы выполнения
- `conditional/` — Quality score, experiment ledger, exploration loop

**`oma-{agent}/`** содержит:
- `SKILL.md` (~800 байт) — Уровень 1: всегда загружен
- `resources/` — Уровень 2: по требованию
- Дополнительно: `stack/` (oma-backend), `reference/` (oma-design), `scripts/` (oma-orchestrator), `config/` (oma-orchestrator, oma-scm)

### workflows/

16 Markdown-файлов. Постоянные: `orchestrate.md`, `work.md`, `ultrawork.md`. Непостоянные: `plan.md`, `exec-plan.md`, `brainstorm.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`.

### agents/

7 файлов определений субагентов с идентичностью, протоколом выполнения, CHARTER_CHECK, архитектурой и правилами.

### plan-\{sessionId\}.json

Структурированная разбивка задач от `/plan`. Потребляется `/orchestrate`, `/work`, `/exec-plan`.

### state/

JSON-файлы состояния постоянных рабочих процессов. Существуют только при активном рабочем процессе.

### results/

Файлы результатов завершённых агентов.

### mcp.json

Конфигурация MCP-сервера и памяти.

---

## .claude/ — Интеграция с IDE

### settings.json

Регистрация хуков и разрешений для Claude Code.

### hooks/

**`triggers.json`** — Маппинг ключевых слов к рабочим процессам. Определяет:
- `workflows`: Маппинг имени рабочего процесса в `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] } }`. `keywords` — литеральные фразы; `patterns` — сырые regex-строки (компилируются с флагами `iu`).
- `informationalPatterns`: Фразы, обозначающие вопросы (отфильтровываются из автодетекции)
- `excludedWorkflows`: Рабочие процессы, требующие явного вызова `/command`
- `cjkScripts`: Коды языков, использующих CJK-письменности (ko, ja, zh)

Языковые секции в `keywords`, `patterns` и `informationalPatterns` следуют такому соглашению:
- `*` — Универсальные/английские. Загружаются всегда, независимо от настройки `language` в `.agents/oma-config.yaml`.
- `en` — Загружаются для обратной совместимости. Функционально эквивалентны `*`. Новый английский контент должен добавляться в `*`.
- `ko`/`ja`/`zh`/и т. д. — Языко-специфичные. Загружаются только когда в `.agents/oma-config.yaml` задано `language: <code>`.

**`keyword-detector.ts`** — TypeScript-хук, который:
1. Санирует ввод (убирает блоки кода, кавычные строки, вставленные блоки системного эха)
2. Сканирует очищенный ввод против триггерных `keywords` (литеральных) и `patterns` (regex)
3. Проверяет информационные паттерны в окне 60 символов вокруг каждого совпадения
4. Применяет защиту от повторов (подавляет, если тот же рабочий процесс срабатывал 2+ раза за 60 секунд)
5. Внедряет в контекст `[OMA WORKFLOW: ...]` или `[OMA PERSISTENT MODE: ...]`

**`persistent-mode.ts`** — Проверяет активные файлы состояния в `.agents/state/` и подкрепляет выполнение постоянных рабочих процессов.

**`hud.ts`** — Индикатор `[OMA]`: модель, контекст (зелёный/жёлтый/красный), рабочий процесс

### skills/

Символические ссылки на `.agents/skills/` для видимости в IDE.

### agents/

Определения субагентов для Agent tool Claude Code.

---

## .serena/memories/ — Оперативное состояние

| Файл | Владелец | Назначение |
|------|---------|-----------|
| `orchestrator-session.md` | Оркестратор | Метаданные сессии |
| `task-board.md` | Оркестратор | Назначения задач |
| `progress-{agent}.md` | Агент | Обновления по ходам |
| `result-{agent}.md` | Агент | Финальный вывод |
| `session-metrics.md` | Оркестратор | Clarification Debt, Quality Score |
| `experiment-ledger.md` | Оркестратор/QA | Эксперименты |
| `session-work.md` | Work | Состояние work |
| `session-ultrawork.md` | Ultrawork | Отслеживание фаз |
| `tool-overrides.md` | /tools | Временные ограничения |
| `archive/metrics-{date}.md` | Система | Архив (30 дней) |

Пути и инструменты настраиваются в `.agents/mcp.json` через `memoryConfig`.

---

## Структура исходного репозитория

```
oh-my-agent/
├── cli/                  <- Исходный код CLI (TypeScript, bun)
├── web/                  <- Сайт документации (Next.js)
├── action/               <- GitHub Action для обновлений
├── docs/                 <- Переведённые README
├── .agents/              <- РЕДАКТИРУЕМЫЙ (это исходный репо)
├── .claude/              <- Интеграция с IDE
├── .serena/              <- Оперативное состояние разработки
├── CLAUDE.md             <- Инструкции для Claude Code
└── package.json          <- Корневая конфигурация
```

В исходном репозитории `.agents/` разрешено модифицировать. Это исключение из правил SSOT.

Команды разработки:
- `bun run test` — Тесты CLI (vitest)
- `bun run lint` — Линтинг
- `bun run build` — Сборка CLI
- Коммиты: conventional commit формат (commitlint)
