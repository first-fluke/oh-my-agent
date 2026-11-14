---
title: Агенты
description: "Справочник по каталогу навыков OMA (генерируется из SKILL.md), ролям dispatch, определениям агентов и их нативным проекциям, правилам отдельных навыков, авторизации и уточнению, правилам области действия, стратегии рабочих пространств, циклу ревью в оркестрации и памяти runtime."
---

# Агенты

OMA разделяет [навыки](../getting-started/glossary.md#skill), роли dispatch и [определения агентов](../getting-started/glossary.md#agent-definition). Навык маршрутизирует и загружает доменные инструкции; каноническая роль задаёт runtime-идентичность для dispatch; сохранённое в репозитории определение даёт субагенту persona, нативную для вендора. Эти уровни намеренно пересекаются, поэтому решайте, достаточно ли одного навыка, исходя из границ задачи и критериев приёмки.

---

## Каталог навыков {#skill-catalog}

Эта таблица — авторитетный список установленных навыков. Она генерируется из frontmatter каждого `.agents/skills/<name>/SKILL.md` скриптом `cli/scripts/generate-skill-catalog.mjs`; чтобы обнаружить расхождения, запустите скрипт с `--check`. Раздел `## References` в SKILL.md каждого навыка перечисляет его файлы ресурсов и указывает, когда их читать.

<!-- oma:generated skill-catalog:start -->
<!-- Generated from SKILL.md frontmatter under .agents/skills by cli/scripts/generate-skill-catalog.mjs. Do not edit this block by hand. -->

| Skill | Use it for |
|---|---|
| [`oma-academic-writing`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-academic-writing/SKILL.md) | Draft and revise academic prose against a rubric, evidence, and citation requirements. Use for essays, reports, literature reviews, or academic style audits. |
| [`oma-architecture`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-architecture/SKILL.md) | Evaluate system boundaries and architectural tradeoffs. Use for architecture decisions, design reviews, and ADRs. |
| [`oma-backend`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-backend/SKILL.md) | Implement server APIs, authentication, and application data access. Schema modeling and query tuning use oma-db. |
| [`oma-brainstorm`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-brainstorm/SKILL.md) | Explore goals, constraints, and alternative approaches before choosing a design. Use when the user requests ideation or design exploration. |
| [`oma-coordination`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-coordination/SKILL.md) | Shared coordination rules for multi-agent work: plan reuse, contract alignment, workspace ownership, and QA handoff. Loaded by the /work, /orchestrate, and /ultrawork workflows; also use for manual step-by-step coordination. |
| [`oma-db`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-db/SKILL.md) | Design schemas and migrations, tune queries, or plan vector retrieval and database operations. Application API implementation uses oma-backend. |
| [`oma-debug`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-debug/SKILL.md) | Diagnose a reproducible failure, fix its cause, and verify the regression. Use for crashes, incorrect behavior, and failing tests. |
| [`oma-design`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-design/SKILL.md) | Define or review a visual system, DESIGN.md, or redesign direction. Use for typography, layout, color, motion, and interaction design decisions. |
| [`oma-dev-workflow`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-dev-workflow/SKILL.md) | Configure development tasks, git hooks, CI/CD, or release automation. Use when creating or fixing a repository development workflow. |
| [`oma-docs`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-docs/SKILL.md) | Check documentation references, sync docs to code changes, and detect translation drift. Use for documentation maintenance in a repository. |
| [`oma-explanation`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-explanation/SKILL.md) | Create an offline HTML explanation of a code change (diff, PR, branch) or of a topic, system, or question. Use when a visual walkthrough document is requested. |
| [`oma-frontend`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-frontend/SKILL.md) | Implement or modify web UI in React, Next.js, or Angular. Use for components, pages, styles, forms, and frontend state or data flows. |
| [`oma-hwp`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-hwp/SKILL.md) | Convert Hangul HWP, HWPX, or HWPML documents to Markdown with kordoc. Use for text, table, and image extraction from these formats. |
| [`oma-image`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-image/SKILL.md) | Generate raster images or reference-guided variations through the OMA image CLI. Use for image assets or explicit vendor comparisons; pixel editing uses an editor. |
| [`oma-market`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-market/SKILL.md) | Research customer pain points, trends, and competitors through the OMA market engine. Use for market discovery or voice-of-customer analysis. |
| [`oma-mobile`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-mobile/SKILL.md) | Implement Flutter, React Native, native Swift, or native Kotlin Android apps. Use for mobile screens, widgets, platform integrations, and application data flows. |
| [`oma-observability`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-observability/SKILL.md) | Design or troubleshoot telemetry, SLOs, and incident diagnostics. Route to the relevant signal, system boundary, or vendor guide. |
| [`oma-orchestration`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-orchestration/SKILL.md) | Dispatch and supervise parallel specialist agents with durable task state. Use when automated multi-agent execution is requested. |
| [`oma-pdf`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-pdf/SKILL.md) | Extract PDF text, headings, tables, and images into Markdown using opendataloader-pdf. Use for PDF parsing, not PDF layout creation. |
| [`oma-pm`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-pm/SKILL.md) | Turn product requirements into scoped tasks with dependencies and acceptance criteria. Use for implementation planning and prioritization. |
| [`oma-qa`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-qa/SKILL.md) | Review changes for correctness, security, accessibility, and performance. Use for scoped quality reviews or verification plans; bug fixes use oma-debug. |
| [`oma-recap`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-recap/SKILL.md) | Summarize AI conversation histories for a specified date or period. Use for daily work recaps and cross-tool activity summaries. |
| [`oma-refactor`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-refactor/SKILL.md) | Restructure existing code while preserving observable behavior. Use for targeted technical debt or hotspot work with characterization tests. |
| [`oma-scholar`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-scholar/SKILL.md) | Search academic literature and generate, validate, or compare Knows paper sidecars. Use for claim/evidence analysis and literature synthesis. |
| [`oma-scm`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-scm/SKILL.md) | Manage Git branches, merges, conflicts, commits, and release baselines. Use for repository history and change-management operations. |
| [`oma-search`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-search/SKILL.md) | Find external documentation, web sources, or remote code with citations. Local code navigation uses the configured code tools. |
| [`oma-security`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-security/SKILL.md) | Scan application source, agent skills, and MCP components, validate findings, and configure scan gates. Penetration tests of a scoped web test deployment run only on a user-supplied, reviewed runtime platform. Use oma-qa for broad quality reviews and domain skills for remediation. |
| [`oma-skill-creation`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-skill-creation/SKILL.md) | Create or revise OMA skills and their references. Use for skill routing, execution contracts, conditional loading, and authoring validation. |
| [`oma-slide`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-slide/SKILL.md) | Create, import, revise, or export presentation decks through the OMA slide CLI or the ppt-master route. Use for HTML slides, editable PPTX, and PDF, PNG, or PPTX deck delivery. |
| [`oma-tf-infra`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-tf-infra/SKILL.md) | Create or review Terraform infrastructure and plans. Use for cloud resources, IAM, networking, state management, and infrastructure changes. |
| [`oma-translation`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-translation/SKILL.md) | Translate or revise localized UI strings and prose while preserving meaning, terminology, placeholders, and structure. |
| [`oma-video`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-video/SKILL.md) | Create videos through the OMA video CLI, or analyze and edit existing clips with media tools. Use for frame extraction, visual analysis, silence cuts, dubbing assembly, sound effects, scripts, and composition; audio-only work uses oma-voice. |
| [`oma-voice`](https://github.com/first-fluke/oh-my-agent/blob/main/.agents/skills/oma-voice/SKILL.md) | Generate or transcribe speech with Voicebox or VoiceStudio, or process existing audio locally. Use for narration, transcripts, timed speech, and loudness conversion; video editing uses oma-video. |
<!-- oma:generated skill-catalog:end -->

---

## Роли dispatch {#dispatch-roles}

Runtime выполняет dispatch по канонической роли. У каждой роли, кроме `orchestrator`, есть одно сохранённое в репозитории определение в `.agents/agents/`, чей frontmatter `skills:` перечисляет загружаемые навыки. Первый указанный навык владеет задачей.

| Роль | Файл определения | Также принимается | Навыки |
|------|-----------------|---------------|--------|
| `orchestrator` | нет (runtime-роль координации) | | |
| `pm` | `pm-planner.md` | `pm-planner` | oma-pm |
| `architecture` | `architecture-reviewer.md` | `architecture-reviewer` | oma-architecture |
| `qa` | `qa-reviewer.md` | `qa-reviewer` | oma-qa |
| `backend` | `backend-engineer.md` | `backend-engineer` | oma-backend |
| `frontend` | `frontend-engineer.md` | `frontend-engineer` | oma-frontend, oma-design |
| `mobile` | `mobile-engineer.md` | `mobile-engineer` | oma-mobile |
| `db` | `db-engineer.md` | `db-engineer` | oma-db |
| `debug` | `debug-investigator.md` | `debug-investigator` | oma-debug |
| `refactor` | `refactor-engineer.md` | `refactor-engineer` | oma-refactor |
| `docs` | `docs-curator.md` | `docs-curator` | oma-docs |
| `tf-infra` | `tf-infra-engineer.md` | `tf-infra-engineer` | oma-tf-infra |
| `explore` | `research-explorer.md` | `research-explorer`, `explorer` | oma-search, oma-market, oma-scholar |

Также принимается суффикс `-agent` в конце (`qa-agent` разрешается в `qa`).

### Нативные файлы агентов {#native-agent-files}

Определения агентов в `.agents/agents/` — источник истины. OMA проецирует их в нативные файлы вендоров для runtime, поддерживающих пользовательские субагенты:

| Runtime | Нативные файлы агентов |
|---------|--------------------|
| Claude Code | `.claude/agents/<name>.md` |
| Codex CLI | `.codex/agents/<name>.toml` |
| Cursor | `.cursor/agents/` |
| OpenCode | `.opencode/agents/` |
| Kiro | `.kiro/agents/` |
| Grok | `.grok/agents/` |
| CommandCode | `.commandcode/agents/` |
| Qwen Code | `.qwen/agents/` |

У pi нет системы файлов агентов, поэтому `oma agent spawn` встраивает persona из определения прямо в prompt. Сгенерированные файлы обновляются командами `oma link`, `oma install` и `oma update`.

### Как выполняется dispatch роли

Когда рабочий процесс сопоставляет агенту того же вендора, что и текущий runtime, сначала используется нативный файл агента этого runtime. Для задач между вендорами применяется запасной путь `oma agent spawn`.

```mermaid
flowchart TD
    task["Agent task"] --> resolve["Resolve the target vendor from oma-config"]
    resolve --> free{"model_preset: free?"}
    free -->|yes| spawn["oma agent spawn"]
    free -->|no| same{"Target vendor is the current runtime and a native path is verified?"}
    same -->|yes| native["Native subagent file"]
    same -->|no| spawn
```

> **Dispatch модели для агента:** вендор, модель и effort каждой роли берутся из `.agents/oma-config.yaml` (или `.agents/oma-config.cue` с необязательным overlay `.local`). При `model_preset: auto` — значении по умолчанию для новых установок — роли без переопределения в `agents:` следуют нативным настройкам агента и модели текущего runtime; `model_preset: free` всегда выполняет dispatch через `oma agent spawn`. Подробности конфигурации — в [Моделях по агентам](../guide/per-agent-models.md); для просмотра активной матрицы используйте [`oma doctor --profile`](../cli-interfaces/commands.md#doctor).

---

## Категории навыков {#agent-categories}

| Категория | Навыки | Ответственность |
|----------|--------|---------------|
| **Идеация** | oma-brainstorm | Исследование идей, предложение подходов, создание документов проектирования |
| **Архитектура** | oma-architecture | Границы системы, модулей и сервисов, анализ в стиле ADR/ATAM/CBAM, записи компромиссов |
| **Планирование** | oma-pm | Декомпозиция требований, разбиение задач, API-контракты, назначение приоритетов |
| **Реализация** | oma-frontend, oma-backend, oma-mobile, oma-db | Написание кода в соответствующих доменах |
| **Дизайн** | oma-design | Дизайн-системы, DESIGN.md, токены, типографика, цвет, motion, доступность |
| **Инфраструктура** | oma-tf-infra | Мультиоблачное развёртывание Terraform, IAM, оптимизация затрат, policy-as-code |
| **DevOps** | oma-dev-workflow | mise task runner, CI/CD, миграции, координация релизов, автоматизация монорепозитория |
| **Наблюдаемость** | oma-observability | Конвейеры наблюдаемости, маршрутизация трассировки, сигналы MELT+P (metrics/logs/traces/profiles/cost/audit/privacy), управление SLO, криминалистика инцидентов, настройка транспорта |
| **Качество** | oma-qa | Аудит безопасности (OWASP), производительность, доступность (WCAG), ревью качества кода |
| **Отладка** | oma-debug | Воспроизведение ошибок, анализ корневых причин, минимальные исправления, регрессионные тесты |
| **Локализация** | oma-translation | Контекстно-зависимый перевод с сохранением тона, регистра и доменных терминов |
| **Координация** | oma-orchestration, oma-coordination | Автоматизированная мультиагентная оркестрация; общие правила координации и ручная пошаговая координация |
| **Git** | oma-scm | Генерация Conventional Commits, разбиение коммитов по фичам |
| **Поиск и извлечение** | oma-search | Маршрутизатор поиска по внешним источникам со ссылками на источники (документы Context7, веб-провайдеры, удалённый код `gh`/`glab`, загрузка по известному URL) |
| **Ретроспектива** | oma-recap | Анализ истории бесед между инструментами и тематические сводки работы |
| **Обработка документов** | oma-hwp, oma-pdf | Конвертация HWP/HWPX/HWPML и PDF в Markdown для LLM/RAG |
| **Документация** | oma-docs | Сопровождение документации: сломанные ссылки, документы, затронутые diff, дрейф переводов и lint переведённых документов |
| **Объяснение** | oma-explanation | Автономные HTML-объяснения изменения кода (diff, PR, ветка, диапазон коммитов) либо темы, системы или вопроса |
| **Академическое письмо** | oma-academic-writing, oma-scholar | Подготовка и аудит академической прозы уровня публикации, научные исследования, поиск и peer review через Knows sidecar |
| **Безопасность** | oma-security | Сканирование исходного кода приложений, пакетов навыков агентов и компонентов MCP (Deepsec, сканеры Cisco) с независимой проверкой находок и шлюзами CI; тесты на проникновение для ограниченного по scope тестового веб-развёртывания выполняются только на предоставленной и проверенной пользователем платформе ARTEX |
| **Рефакторинг** | oma-refactor | Поэтапная реструктуризация с сохранением поведения, поиск hotspots, characterization safety net и коммиты только рефакторинга |
| **Исследование рынка** | oma-market | Исследование болевых точек, трендов, конкурентов и discovery по сигналам сообществ с framework SWOT/Porter's 5F/PESTEL по намерению |
| **Авторинг навыков** | oma-skill-creation | Создание и проверка навыков OMA в формате SSL-lite |
| **Генерация медиа** | oma-image, oma-slide, oma-video, oma-voice | Генерация изображений с помощью AI, HTML-презентации и редактируемые PPTX, короткие/explainer/demo-видео и локальное TTS/STT |

---

## Подробный справочник по агентам

Эти сводки описывают домен и ключевые правила каждого навыка. Источник истины — SKILL.md самого навыка: его раздел `## References` перечисляет файлы ресурсов и условие чтения каждого из них, поэтому эта страница не копирует эти списки.

### oma-brainstorm

**Домен:** Идеация по принципу «сначала дизайн» перед планированием или реализацией.

**Когда использовать:** Исследование новой идеи фичи, понимание намерения пользователя, сравнение подходов. Используйте перед `/plan` для сложных или неоднозначных запросов.

**Когда НЕ использовать:** Чёткие требования (переходите к oma-pm), реализация (переходите к доменным агентам), ревью кода (переходите к oma-qa).

**Основные правила:**
- Никакой реализации или планирования до утверждения дизайна
- Один уточняющий вопрос за раз (не пакетами)
- Сравнивать два-три жизнеспособных подхода, когда альтернативы помогают принять решение; если ограничения оставляют меньше вариантов, объяснить почему, а не выдумывать варианты
- Представлять дизайн по разделам, решая только открытые существенные вопросы
- YAGNI: проектируйте только то, что нужно

**Рабочий процесс:** Рабочий процесс `/brainstorm` состоит из 7 шагов: Контекст, Вопросы, Подходы (по желанию с отправной точкой из TRIZ-lite), Дизайн, Слепое ревью, Документация (сохранение в `docs/decisions/`), Переход к `/plan`.

---

### oma-architecture

**Домен:** Архитектура ПО/систем, включая границы модулей и сервисов, анализ компромиссов, синтез мнений заинтересованных сторон и протоколы решений.

**Когда использовать:** Выбор или ревью системной архитектуры, определение границ модуля/сервиса/ответственности, сравнение архитектурных вариантов с явными компромиссами, исследование архитектурных болей (амплификация изменений, скрытые зависимости, неудобные API), приоритизация архитектурных инвестиций или рефакторингов, написание архитектурных рекомендаций или ADR.

**Когда НЕ использовать:** Визуальные/дизайн-системы (используйте oma-design), планирование фич и декомпозиция задач (используйте oma-pm), реализация Terraform (используйте oma-tf-infra), диагностика багов (используйте oma-debug), ревью безопасности/производительности/доступности (используйте oma-qa).

**Методологии:** Диагностическая маршрутизация, сравнение design-twice, анализ рисков в стиле ATAM, приоритизация в стиле CBAM, протоколы решений в стиле ADR.

**Основные правила:**
- Диагностируйте архитектурную проблему до выбора метода
- Используйте самую лёгкую достаточную методологию для текущего решения
- Отделяйте архитектурный дизайн от UI/визуального дизайна и от поставки через Terraform
- Консультируйтесь с агентами-стейкхолдерами только когда решение достаточно сквозное, чтобы оправдать затраты
- Качество рекомендации важнее театра консенсуса: консультируйтесь широко, решайте явно
- Каждая рекомендация должна указывать предположения, компромиссы, риски и шаги валидации
- По умолчанию учитывайте стоимость: стоимость внедрения, эксплуатационную стоимость, сложность для команды, стоимость будущих изменений

---

### oma-pm

**Домен:** Управление продуктом, включая анализ требований, декомпозицию задач и API-контракты.

**Когда использовать:** Разбиение сложных фич, определение целесообразности, приоритизация работ, определение API-контрактов.

**Основные правила:**
- API-first дизайн: определить контракты до задач реализации
- Каждая задача имеет: агент, название, критерии приёмки, приоритет, зависимости
- Минимизировать зависимости для максимального параллельного выполнения
- Безопасность и тестирование — часть каждой задачи (не отдельные фазы)
- Задачи должны быть выполнимы одним агентом
- Выводить JSON-план как передачу оркестратору; task board создаёт и ведёт оркестратор

**Вывод:** `.agents/results/plan-{sessionId}.json` с числовыми уровнями приоритета (`1` = независимые задачи, уровни с меньшим номером выполняются первыми), а также отчёт в рамках запуска `result-{agentId}-{taskId}-{runId}-{sessionId}.md` в настроенном хранилище памяти.

---

### oma-frontend

**Домен:** Веб-UI на React/Next.js или Angular с TypeScript. Проекты React используют FSD-lite; проекты Angular следуют `resources/angular-rules.md`.

**Когда использовать:** Создание пользовательских интерфейсов, компонентов, клиентской логики, стилизации, валидации форм, интеграции с API.

**Технологический стек:**
- React + Next.js (Server Components по умолчанию, Client Components для интерактивности)
- TypeScript (strict)
- TailwindCSS v4 + shadcn/ui (только чтение примитивов, расширение через cva/обёртки)
- FSD-lite: корень `src/` + фича `src/features/*/` (без кросс-фичевых импортов)

**Библиотеки (проекты React/Next.js):**
| Назначение | Библиотека |
|---------|---------|
| Даты | luxon |
| Стили | TailwindCSS v4 + shadcn/ui |
| Хуки | ahooks или @mantine/hooks |
| Утилиты | es-toolkit |
| Типы | type-fest |
| URL-состояние | nuqs |
| Серверное состояние | TanStack Query (хуки, сгенерированные orval, если существует OpenAPI-спецификация) |
| Клиентское состояние | Jotai или Zustand — выбор по назначению, без варианта по умолчанию (минимизировать использование) |
| Формы | @tanstack/react-form + Zod |
| Аутентификация | better-auth |
| Анимация | motion (`motion/react`) для новых проектов |

**Основные правила:**
- shadcn/ui в первую очередь, расширение через cva, никогда не модифицировать `components/ui/*` напрямую
- Маппинг дизайн-токенов 1:1 (никогда не хардкодить цвета)
- Request proxy: сохранять существующее соглашение Next.js 16+ `proxy.ts`; прежде чем предлагать переименование в `middleware.ts`, проверить установленную версию и маршрутизацию
- Без prop drilling более 3 уровней; используйте библиотеку клиентского состояния проекта (атомы Jotai или store Zustand)
- Абсолютные импорты с `@/` обязательны
- Цель FCP < 1 сек
- Адаптивные брейкпоинты: 320px, 768px, 1024px, 1440px

**Чек-лист шлюза качества:**
- Доступность: ARIA-лейблы, семантические заголовки, навигация с клавиатуры
- Мобильные устройства: проверено на мобильных вьюпортах
- Производительность: без CLS, быстрая загрузка
- Отказоустойчивость: Error Boundaries и Loading Skeletons
- Тесты: логика покрыта Vitest
- Качество: проходят typecheck и lint

---

### oma-backend

**Домен:** API, серверная логика, аутентификация, операции с базами данных.

**Когда использовать:** REST/GraphQL API, код доступа к данным и миграции, которых требует изменение API, аутентификация, серверная бизнес-логика, фоновые задачи.

**Когда НЕ использовать:** Моделирование схемы, проектирование индексов и настройка запросов (используйте oma-db), фронтенд-UI (используйте oma-frontend), мобильный код (используйте oma-mobile).

**Архитектура:** Router (HTTP) -> Service (бизнес-логика) -> Repository (доступ к данным) -> Models.

**Определение стека:** Сначала читает манифесты проекта (pyproject.toml, package.json, Cargo.toml, go.mod и т.д.) и существующий код, чтобы определить язык и фреймворк. Справочник по стеку играет вспомогательную роль: `stack/`, если он есть, иначе подходящий `variants/<language>/`. В установленном проекте с выбранным пресетом есть `stack/` и нет `variants/`; в раскладках плагина и исходников есть `variants/` и нет `stack/`. Если не подходит ни то ни другое, агент спрашивает пользователя или предлагает `/stack-set`.

**Поставляемые пресеты:** Python (Litestar с SQLAlchemy 2 (async) через Advanced Alchemy, модели msgspec, встроенная JWT-аутентификация), Node.js (NestJS + Prisma, тесты на Vitest) и Rust (Axum + SQLx). Проект, установленный с прежним пресетом FastAPI, сохраняет FastAPI. Эти значения по умолчанию применяются, только если в целевом проекте нет устоявшегося выбора; ограниченная по scope правка не даёт права на миграцию стека.

**Основные правила:**
- Чистая архитектура: никакой бизнес-логики в обработчиках маршрутов
- Все входные данные валидируются библиотекой валидации проекта
- Только параметризованные запросы (никакой строковой интерполяции в SQL)
- JWT + Argon2id для аутентификации (bcrypt допустим для совместимости с legacy); ограничение частоты запросов на эндпоинтах аутентификации
- Асинхронность где поддерживается; аннотации типов на всех сигнатурах
- Пользовательские исключения через централизованный модуль ошибок
- Явная стратегия загрузки ORM, границы транзакций, безопасный жизненный цикл
- Команды верификации выбираются из проекта (предпочтительно из блока `verify:` в `stack/stack.yaml`) и запускаются, только когда этого требует пользователь или активный рабочий процесс; о незапущенных проверках сообщается

<!-- oma-docs:ignore-start -->
Справочник по стеку содержит `stack.yaml` (структурированное объявление и контракт `verify:`, который выполняет `oma verify agent backend`), `tech-stack.md`, `snippets.md` и `api-template.*`. `/stack-set` генерирует специфичный для проекта `stack/` по обнаруженной кодовой базе.
<!-- oma-docs:ignore-end -->

---

### oma-mobile

**Домен:** Кроссплатформенные и нативные мобильные приложения (Flutter, React Native, Swift native iOS и Kotlin native Android).

**Когда использовать:** Нативные мобильные приложения (iOS + Android), мобильные UI-паттерны, платформенные функции (камера, GPS, push-уведомления), offline-first архитектура; нативные iOS-приложения на Swift с использованием SwiftUI и `swift-openapi-generator`.

**Архитектура:** Clean Architecture: domain -> data -> presentation. Для Swift iOS: структура проекта `App/Core/Features/Shared`. Для Kotlin Android: `app/{ui,data,di}` + `api-client`. Бизнес-логика никогда не размещается в виджетах, view или composable.

**Технологические стеки:**
- Flutter/Dart: Riverpod/Bloc (управление состоянием), Dio с интерсепторами (API), GoRouter (навигация), Material Design 3 (Android) + iOS HIG.
- React Native: Zustand + TanStack Query (состояние), axios за хуками TanStack Query (API).
- Swift native iOS (iOS 17+): SwiftUI + `@Observable` (Observation framework), Apple `swift-openapi-generator` для API-клиентов, структура `App/Core/Features/Shared`.
- Kotlin native Android (API 26+): Jetpack Compose + Material 3, `@HiltViewModel` + `StateFlow`, клиенты OpenAPI Generator (`kotlin` / `jvm-ktor`) поверх Ktor с внедряемым движком OkHttp, структура `app/{ui,data,di}` + `api-client`.

**Основные правила:**
- Управление состоянием — решение, принятое в варианте (Flutter: Riverpod/Bloc; React Native: Zustand + TanStack Query; Swift: `@MainActor @Observable`; Kotlin: `@HiltViewModel` + `StateFlow`); без raw setState и ситуативного состояния для сложной логики
- Освобождать ресурсы по жизненному циклу платформы: контроллеры Flutter в `dispose()`, очистка эффектов в React Native, структурированный `.task {}` в Swift, `viewModelScope` в Kotlin
- Использовать транспорт платформы с перехватом для аутентификации, повторов и логирования; корректная обработка offline
- Цель 60fps; охватывать каждую платформу, на которой выпускается приложение
- Секреты хранятся только в защищённом хранилище (flutter_secure_storage, Keychain, react-native-keychain, хранилище на базе Android Keystore)
- E2E для критичных пользовательских сценариев: Maestro (Flutter, React Native, Kotlin) или XCUITest (Swift native)
- Тесты и E2E-проверки запускаются, только когда этого требует пользователь или активный рабочий процесс; сборки запускаются только по явному запросу
- Swift: использовать `@Observable` вместо `ObservableObject` на iOS 17+; генерировать API-клиенты из OpenAPI-спецификаций через `swift-openapi-generator`
- Kotlin: вызывать сгенерированный `*Api` для эндпоинтов, покрытых спецификацией; Ktor — слой, не зависящий от движка, поэтому движок OkHttp внедряется там, где создаётся клиент, а в тестах его заменяет `MockEngine`

**Платформенные варианты:** `variants/` поставляет `flutter/`, `react-native/`, `swift-ios/` и `kotlin-android/`, каждый со `stack.yaml`, `tech-stack.md` и `snippets.md` (паттерны слоя данных, состояния, экранов и тестов, включая сниппет API-сервиса или репозитория), а также общий `stack.schema.json`. Агент использует `stack/`, если он существует, а иначе читает подходящий `variants/<platform>/` напрямую; `/stack-set` записывает `stack/` по обнаруженному проекту, взяв вариант за основу. Навык, установленный без варианта, сохраняет свой каталог `variants/`.

---

### oma-db

**Домен:** Архитектура баз данных для SQL, NoSQL и векторных баз данных.

**Когда использовать:** Проектирование схем, ER-диаграммы, нормализация, индексация, транзакции, планирование ёмкости, стратегия резервного копирования, проектирование миграций, архитектура векторных БД/RAG, обзор анти-паттернов, проектирование с учётом требований (ISO 27001/27002/22301).

**Рабочий процесс по умолчанию:** Исследование (определение сущностей, паттернов доступа, объёмов) -> Проектирование (схема, ограничения, транзакции) -> Оптимизация (индексы, секционирование, архивация, анти-паттерны).

**Основные правила:**
- Сначала выбрать модель, потом движок
- 3НФ по умолчанию для реляционных; документировать компромиссы BASE для распределённых
- Документировать все три слоя схемы: внешний, концептуальный, внутренний
- Целостность — первоклассная сущность: entity, domain, referential, business-rule
- Конкурентность никогда не бывает неявной: определить границы транзакций и уровни изоляции
- Векторные БД — инфраструктура поиска, а не источник истины
- Никогда не считать векторный поиск заменой лексического поиска

**Обязательные артефакты:** Резюме внешней схемы, концептуальная схема, внутренняя схема, таблица стандартов данных, глоссарий, оценка ёмкости, стратегия резервного копирования/восстановления. Для векторных/RAG: политика версий эмбеддингов, политика чанкинга, стратегия гибридного поиска.

---

### oma-design

**Домен:** Визуальные системы, `DESIGN.md` и направление редизайна: решения по типографике, макету, цвету, motion и дизайну взаимодействия.

**Когда использовать:** Определение или пересмотр визуальной системы либо существенного дизайн-направления, ревью существующего UI или доработка выбранного направления, извлечение дизайн-решений из существующего UI, скриншотов или предоставленных референсов.

**Когда НЕ использовать:** Реализация UI приложения или экспорт токенов под конкретный фреймворк (используйте oma-frontend или oma-mobile), планирование объёма продукта (используйте oma-pm), генерация изображения (используйте oma-image), общее ревью корректности или безопасности (используйте oma-qa или oma-security).

**Выбор поставщика:** Навык определяет дизайн-намерение проекта и загружает по одному внешнему дизайн-навыку на операцию через `resources/external-design-skills.md`:

| Операция | Поставщик |
|-----------|----------|
| Визуальное направление для дашбордов, админ-панелей, UI SaaS-продуктов или внутренних инструментов | Interface Design |
| Ревью иерархии, плотности, согласованности или качества исполнения интерфейса продукта после реализации | Interface Design `design-review` |
| Прочая критика существующего UI, аудит доступности или технический аудит, полировка либо извлечение системы | Impeccable |
| Прочая новая арт-дирекция для веба или авторизованная визуальная переработка | Taste |
| Задача только по документации или контракту токенов без нового визуального суждения | Остаётся локальной |

**Рабочий процесс:** Изучить UI, дизайн-артефакты и бриф и установить рамки, платформу, действующий стек, языки, сохранение бренда и способ верификации -> выбрать и загрузить поставщика -> применить результат к запрошенному решению или артефакту -> проверить затронутый результат по `resources/checklist.md` и передать реализацию специалисту по frontend или mobile.

**Основные правила:**
- Повторно использовать `.design-context.md` и `DESIGN.md`, если они есть; обновлять `DESIGN.md`, только когда меняется визуальная система, а `.design-context.md` создавать, только когда решение опирается на содержательный исследовательский проход
- Ограниченная по scope правка повторно использует затронутый UI и токены; исследовательский документ ей не нужен
- Для существующего сайта или приложения следовать `resources/redesign-protocol.md` и до предложения вариантов классифицировать работу как Preserve или Overhaul
- Сохранять существующие бренд, контент, URL, навигацию, контракты форм, аналитику и юридические тексты в пределах разрешённых рамок
- Сохранять действующие шрифты, если они подходят; для ko/ja/zh проверять покрытие глифов, fallback, переносы строк и читаемые метрики
- WCAG AA — целевой уровень доступности по умолчанию либо более строгий уровень проекта; требования к адаптивности, reduced-motion и платформе передаются выбранному поставщику
- Использовать реальные ассеты и утверждения проекта; концепты и заглушки помечать
- Сохранять существующий стек реализации; CSS, Tailwind, синтаксис библиотеки компонентов и зависимости находятся в ведении специалиста по реализации
- Операции только для ревью остаются read-only
- Спрашивать только о существенном нерешённом выборе; если явно запрошенный поставщик недоступен, об этом сообщается, и он не заменяется другим

**Результат:** Запрошенное дизайн-решение, находки или передача на реализацию с наблюдаемыми доказательствами, выбранным поставщиком и операцией, а также ограничениями возможностей или верификации. `DESIGN.md` и `.design-context.md` записываются, только когда выполняются условия выше. Stitch и getdesign — необязательные входные данные.

---

### oma-tf-infra

**Домен:** Инфраструктура как код с Terraform, мульти-облако.

**Когда использовать:** Развёртывание на AWS/GCP/Azure/Oracle Cloud, конфигурация Terraform, аутентификация CI/CD (OIDC), CDN/балансировщики нагрузки/хранилище/сети, управление состоянием, инфраструктура соответствия ISO.

**Определение облака:** Читает провайдеры и префиксы ресурсов Terraform (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). Включает полную таблицу маппинга ресурсов мульти-облака.

**Основные правила:**
- Провайдер-агностичный: определять облако из контекста проекта
- Удалённое состояние с версионированием и блокировкой
- OIDC-first для аутентификации CI/CD
- Всегда plan перед apply
- IAM с минимальными привилегиями
- Тегировать всё (Environment, Project, Owner, CostCenter)
- Никаких секретов в коде
- Пинить версии всех провайдеров и модулей
- Без auto-approve в продакшене

---

### oma-dev-workflow

**Домен:** Автоматизация задач в монорепозитории и CI/CD.

**Когда использовать:** Запуск dev-серверов, выполнение lint/format/typecheck по приложениям, миграции баз данных, генерация API, i18n-сборки, продакшн-сборки, оптимизация CI/CD, валидация pre-commit, а также настройка инструментов lint, format и typecheck для конкретных языков, lint для Dockerfile и commitlint.

**Основные правила:**
- Использовать задачи `mise run` вместо прямых команд пакетного менеджера; находить их через `mise tasks --all` и читать определение незнакомой задачи перед запуском
- Запускать lint и test для изменённой области; CI должен пропускать неизменённые приложения
- Валидировать сообщения коммитов с помощью commitlint через локально установленный hook `commit-msg`; никогда не загружать пакеты из Git hook
- Задачи проверки ничего не изменяют: предоставлять `lint`, `format:check` и `typecheck`, а изменяющий файлы `format` держать отдельно
- Пропущенный прогон валидации не считается пройденным; о проверке, которую не удалось запустить, сообщается как о незавершённой, и она не заменяется заглушкой или сборкой
- Предпочитать герметичные тесты; тесты, которым нужен Docker или внешние сервисы, выносятся в отдельную opt-in задачу интеграции вне hooks по умолчанию и обязательных шлюзов CI
- Никогда не хардкодить секреты в `mise.toml`; никогда не запускать разрушительные задачи без подтверждения

**Ресурсы:** `mise-basics.md`, `tooling-profiles.md`, `validation-pipeline.md`, `example-task-wiring.md` (миграции, необязательная локальная инфраструктура Docker, генерация API-клиента, i18n-сборки), `release-coordination.md` и `troubleshooting.md`; каждый загружается по своему заявленному trigger.

---

### oma-observability

**Домен:** Роутер наблюдаемости и трассировки на основе намерения, охватывающий уровни, границы и сигналы.

**Когда использовать:**
- Настройка конвейера: OTel SDK + Collector + бэкенд вендора
- Трассировка через границы сервисов и доменов: W3C-пропагаторы, baggage, мультитенантность, мульти-облако
- Настройка транспорта: пороги UDP/MTU, OTLP gRPC vs HTTP, топология Collector DaemonSet vs sidecar, рецепты сэмплирования
- Криминалистика инцидентов: 6-мерная локализация (code / service / layer / host / region / infra)
- Выбор категории вендора: OSS full-stack vs коммерческий SaaS vs специалист по высокой кардинальности vs специалист по профилированию
- Observability-as-code: дашборды Grafana Jsonnet, CRD PrometheusRule, YAML OpenSLO, алерты SLO burn-rate
- Мета-наблюдаемость: самочувствие конвейера, расхождение часов, ограждения кардинальности, матрица хранения
- Покрытие сигналов MELT+P: metrics, logs, traces, profiles, cost, audit, privacy
- Миграции лог-конвейеров, оцениваемые с учётом текущей поддержки upstream и требований проекта

**Когда НЕ использовать:** Наблюдаемость LLM ops / gen_ai (использовать Langfuse, Arize Phoenix, LangSmith, Braintrust), происхождение данных в data-конвейерах (OpenLineage + Marquez, dbt test, Airflow lineage), телеметрия физического уровня IoT / дата-центра (Nlyte, Sunbird, Device42), оркестрация chaos engineering (Chaos Mesh, Litmus, Gremlin, ChaosToolkit), GPU- / TPU-инфраструктура (NVIDIA DCGM Exporter), цепочка поставки ПО (sigstore, in-toto, SLSA), рабочий процесс реагирования на инциденты / пейджинг (PagerDuty, Jira Service Management, Grafana Cloud IRM), полная инспекция TLS-пакетов, сканирование безопасности или тесты на проникновение (используйте oma-security; этот навык охватывает только телеметрию безопасности), настройка одного вендора, уже покрываемая его собственным навыком.

**Основные правила:**
- Классифицировать намерение до маршрутизации: setup | migrate | investigate | alert | trace | tune | route
- Загружать ресурсы по их trigger: протокол выполнения, одно руководство, выбранное маршрутом намерения, а затем руководство по уровню, границе, сигналу или транспорту, только когда присутствует его trigger. Ни один справочный файл не подлежит обязательной предварительной загрузке
- Использовать `resources/vendor-categories.md`, только когда нужен выбор категории или делегирование вендору; делегировать навыкам, принадлежащим вендорам, а не дублировать документацию вендора
- Загружать одно руководство по транспорту, которое соответствует наблюдаемой проблеме: UDP/MTU, протокол OTLP, топология Collector или сэмплирование
- Прежде чем объявлять настройку завершённой, проверить состояние конвейера, синхронизацию часов, лимиты кардинальности и хранение по требованиям проекта и записать проверки, которые не удалось запустить
- Проверять текущую поддержку upstream, стабильность атрибутов и рекомендации по миграции по официальной документации и статусу CNCF, когда они влияют на рекомендацию. Файлы ресурсов не закрепляют версии спецификаций по отдельности; единственное утверждение об актуальности спецификаций и semconv содержится в `resources/standards.md`
- W3C Trace Context как пропагатор по умолчанию, с облачными трансляциями из `resources/boundaries/cross-application.md` там, где это требуется
- Применять редактирование PII и средства контроля baggage с учётом сэмплирования на этапе сбора; проверять требования к хранению, удалению и аудиту для целевой системы
- Поставлять работающую конфигурацию или явно помеченные предложения; заготовки и непроверенные проверки не считаются завершённой настройкой

Матрица покрытия включает четыре уровня (L3, L4, mesh, L7), четыре границы (multi-tenant, cross-application, SLO, release) и семь сигналов (metrics, logs, traces, profiles, cost, audit, privacy).

---

### oma-qa

**Домен:** Обеспечение качества, охватывающее безопасность, производительность, доступность и качество кода.

**Когда использовать:** Финальное ревью перед деплоем, аудиты безопасности, анализ производительности, проверка доступности, анализ покрытия тестами.

**Когда НЕ использовать:** Сканирование с помощью сканеров, тесты на проникновение, проверка находок или шлюзы безопасности CI (используйте oma-security), первичная реализация и новые фичи (используйте доменных агентов).

**Приоритет ревью:** Безопасность > Производительность > Доступность > Качество кода.

**Уровни серьёзности:**
- **CRITICAL**: Нарушение безопасности, риск потери данных
- **HIGH**: Блокирует запуск
- **MEDIUM**: Исправить в этом спринте
- **LOW**: Бэклог

**Основные правила:**
- Каждое замечание должно содержать файл:строка, описание и исправление
- Выбирать автоматические проверки, которые соответствуют обнаруженному стеку и объёму ревью (например, аудит зависимостей, статический анализ безопасности или аудит производительности в runtime); проводить ревью статически, если инструмент или цель недоступны
- Запускать команды lint, test и coverage проекта, когда эти доказательства требуются запросом на ревью или активным рабочим процессом; иначе сообщать о них как о незапущенных
- Каждое замечание о дефекте должно быть воспроизводимым; гипотезы и недоступные проверки записываются как пробелы в верификации, и PASS не выдаётся, пока обязательные проверки остаются непроверенными
- Замечания по безопасности здесь — это замечания ревью кода; кандидаты от сканеров, доказательство эксплуатации и статусы `confirmed` / `needs_validation` относятся к oma-security
- Предоставлять код исправления, а не только описания

---

### oma-debug

**Домен:** Диагностика и исправление ошибок.

**Когда использовать:** Ошибки, о которых сообщают пользователи, падения, проблемы производительности, перемежающиеся сбои, состояния гонки, регрессионные ошибки.

**Методология:** Сначала воспроизведи, потом диагностируй. Никогда не угадывай исправления.

**Основные правила:**
- Определить корневую причину, а не просто симптом
- Минимальное исправление: менять только необходимое
- Каждое исправление сопровождается регрессионным тестом; перезапускать его вместе с исходной упавшей проверкой (красный до исправления, зелёный после)
- Запускать более широкие наборы тестов, только когда этого требует пользователь или активный рабочий процесс; иначе сообщать о них как о незапущенных
- Искать похожие паттерны в других местах
- Документировать баг в `.agents/results/bugs/`: сжатый отчёт из `resources/debugging-checklist.md` либо полный `resources/bug-report-template.md` для багов уровня Complex или CRITICAL/HIGH

**Используемые инструменты code intelligence (Gortex или Serena):**
- `find_symbol("functionName")` или навигация по символам Gortex: найти функцию
- `find_referencing_symbols("Component")` или анализ влияния Gortex: найти все использования
- `search_for_pattern("error pattern")` или поиск Gortex: найти похожие проблемы

---

### oma-translation

**Домен:** Контекстно-зависимый мультиязычный перевод.

**Когда использовать:** Перевод UI-строк, документации, маркетинговых текстов, ревью существующих переводов, создание глоссариев.

**Метод перевода:** Четыре шага: прочитать смысл и защищённый синтаксис, выбрать регистр, реконструировать текст на целевом языке и сохранить авторский стиль там, где он уместен. Верификация соразмерна риску содержимого: защищённый синтаксис и структура проверяются всегда; для содержательного контента и режима ревью дополнительно применяется рубрика (естественность, точность, регистр, терминология, техническая целостность).

**Основные правила:**
- Сначала просканировать существующие файлы локализации для соответствия соглашениям
- Переводить смысл, а не слова
- Сохранять эмоциональные коннотации
- Никогда не создавать пословный перевод
- Никогда не смешивать регистры внутри текста
- Сохранять доменную терминологию как есть

---

### oma-orchestration

**Домен:** Автоматизированная координация мультиагентной системы через запуск CLI.

**Когда использовать:** Сложные фичи, требующие нескольких агентов параллельно, автоматизированное выполнение, fullstack-реализация.

**Настройки по умолчанию:**

| Настройка | По умолчанию | Описание |
|-----------|-------------|---------|
| MAX_PARALLEL | 3 | Максимум параллельных субагентов |
| MAX_RECOVERY_ATTEMPTS | 3 | Общее число повторных попыток и гипотез исследования на задачу, включая исходную попытку |
| POLL_INTERVAL | ограниченный backoff | Запасной вариант, только когда уведомления о завершении недоступны (нативные субагенты Claude Code возвращают результат синхронно) |

Это значения по умолчанию для рабочего процесса; настройки модели, вендора, параллелизма и бюджета определяются конфигурацией проекта.

**Фазы рабочего процесса:** Планирование → Ссылки (выбор ссылок для каждой задачи) → Настройка (артефакты сессии и task board) → Выполнение (dispatch готовых задач в пределах MAX_PARALLEL) → Мониторинг → Верификация (цикл ревью) → Сбор (claims и отчёты в рамках запуска).

**Ссылки для задач:** Каждая задача сопоставляется с сигнатурами намерений установленных навыков, и координатор выбирает нужные ей ссылки. Достаточно одного уверенно сопоставленного навыка; набор расширяется, только когда классификация неоднозначна или зависимость требует другого домена. Выбор и его причина записываются в task board как заметки координатора; launcher не обеспечивает их соблюдение.

**Цикл ревью агент-агент:** диаграмма и ограничения цикла приведены в разделе [Поток оркестрации](#orchestration-flow).

**Доказательства сессии:** Когда это полезно, записывает существенные коррекции и замечания ревью, по которым вынесено решение, с указанием причины, влияния и верификации. Ни штрафной балл, ни приостановка, вызванная баллом, не применяются.

---

### oma-scm

**Домен:** Управление конфигурацией ПО (SCM) и Git: ветвление, слияния, worktrees, базовые линии (baselines), готовность к аудиту и Conventional Commits.

**Когда использовать:** После изменений кода (`/scm`), при конфликтах слияния, выборе стратегии ветвления, релизах/тегах или любом вопросе CM по репозиторию.

**Типы коммитов:** feat, fix, docs, style, refactor, perf, test, chore, build, ci, revert.

**Рабочий процесс (коммиты):** Анализ изменений → Разбиение по фичам при необходимости → тип → область → описание (императив, до 72 символов, строчные буквы, без точки в конце) → коммит с явными путями.

**Правила:**
- Не использовать `git add -A` или `git add .` без явного разрешения
- Никогда не коммитить файлы с секретами
- Всегда указывать файлы при индексации
- Записывать сообщение в файл и коммитить через `git commit -F <message-file>`
- Не переписывать общую историю без явного разрешения; использовать `--force-with-lease`, никогда не простой `--force`
- Трейлеры соавторства добавляются, только если действующая конфигурация `scm.co_author` их включает и задаёт имя и email.

---

### oma-coordination

**Домен:** Общие правила координации для мультиагентной работы: повторное использование плана, согласование контрактов, владение рабочими пространствами и передача в QA.

**Когда использовать:** Любой рабочий процесс, который делает dispatch более чем одному агенту-специалисту. `/work`, `/orchestrate` и `/ultrawork` загружают этот навык и применяют его ограничения. Используйте его также для ручной пошаговой координации, где каждым dispatch управляете вы, и когда агенты разделяют общий API или контракт данных.

**Когда НЕ использовать:** Задачи в пределах одного домена (использовать доменного агента напрямую). Автоматизированные dispatch, мониторинг и верификация относятся к oma-orchestration; этот навык лишь предоставляет правила, которые тот применяет.

**Основные правила:**
- Повторно использовать действующий план; вызывать oma-pm, только если нужно изменить декомпозицию или контракты
- Запускать независимые задачи одного приоритетного уровня параллельно, каждую в своём рабочем пространстве или с `--isolation worktree`
- Обновлять контракты для изменённых границ API до зависимой работы frontend или mobile
- QA-ревью всегда идёт последним шагом
- Возвращать блокирующие дефекты QA и обязательные пробелы в проверке ответственному агенту, затем повторно запускать затронутые проверки

**Рабочий процесс:** План (повторное использование или PM) → Запуск по приоритетному уровню → Мониторинг → QA-ревью → Исправление проблем → Поставка.

**Отличие от oma-orchestration:** Coordination предоставляет правила и направляет ручной прогон, в котором темп контролирует пользователь; orchestrator отвечает за автоматизированное выполнение (разрешение dispatch, лимит параллелизма, бюджет восстановления и цикл ревью).

---

### oma-search

**Домен:** Маршрутизатор поиска по внешним источникам. Он выбирает канал, который нужен запросу, и возвращает источники с подтверждающими доказательствами и ограничениями извлечения.

**Маршруты:**

| Маршрут | Выполнение | Область |
|-------|-----------|-------|
| `docs` | Определение библиотеки и запросы через Context7; при необходимости поиск официального сайта | Официальная документация в пределах запрошенных ограничений по версии |
| `web` | Настроенный `providers.web`: инструменты runtime для `native`, CLI-адаптер для `brave` или `exa` | Поиск URL, релевантных запросу |
| `code` | `oma search code` через выбранный хост кода (`gh` или `glab`) | Удалённые совпадения с реализацией в пределах ограничений по хосту и репозиторию |
| `fetch` | Доступный инструмент чтения URL или `oma search fetch <url>` | Чтение URL, который уже предоставлен или найден |

**Когда использовать:** Документация библиотек, веб-исследование, поиск по удалённому коду, чтение известного URL, а также запросы, для которых нужно выбрать канал внешних источников. Другие навыки используют его для получения внешних источников.

**Когда НЕ использовать:** Исследование только локального кода (используйте настроенный code intelligence напрямую), анализ истории Git или blame (используйте oma-scm), архитектурный анализ (используйте oma-architecture).

**Основные правила:**
- Явный `--docs`, `--code` или `--web` выбирает маршрут; иначе навык выбирает один основной маршрут и обращается к `resources/intent-rules.md`, только когда выбор неясен
- Другой маршрут добавляется, только когда этого требует оставшийся пробел в доказательствах; по умолчанию навык не расходится по нескольким маршрутам
- `--strict` требует подходящих первичных или официальных источников с проверенным подтверждающим содержимым; `--wide` включает более широкие результаты с их ограничениями; `--gitlab` выбирает GitLab как хост кода
- Результаты содержат URL источника или ссылку на файл, маршрут, фактического провайдера, тип источника, статус прочтения содержимого, подтверждающие доказательства и существенные ограничения
- Сниппеты поиска и выдержки — ограниченное доказательство; непрочитанные источники указываются явно
- Никаких искусственных оценок доверия: имя провайдера или метка домена не подтверждает отдельное утверждение. `oma search trust <domain>` — необязательная диагностика домена, а `resources/source-provenance.md` применяется, когда происхождение источника требует интерпретации
- О недоступном, неаутентифицированном или упёршемся в лимит запросов веб-провайдере сообщается; явно выбранный провайдер не заменяется молча нативным поиском
- Поиск без URL-кандидатов уточняется в пределах исходных ограничений либо о нём сообщается как об отсутствии результата; загрузка URL не заменяет отсутствующие результаты поиска
- Когда ни один источник не удовлетворяет `--strict`, сообщается о пробеле; более широкий набор результатов не удовлетворяет строгому запросу
- Ничего не устанавливается автоматически: ни провайдер, ни браузер, ни зависимость

---

### oma-recap

**Домен:** Анализ истории бесед из нескольких AI-инструментов (Claude, Codex, Gemini, Antigravity, Qwen, Cursor, Grok) с тематическими дневными/периодическими сводками работы.

**Когда использовать:** Суммирование дня или периода рабочей активности, понимание потока работы между несколькими AI-инструментами, анализ паттернов переключения инструментов между сессиями, подготовка ежедневных стендапов / еженедельных ретро / рабочих логов.

**Когда НЕ использовать:** Ретроспектива изменений кода на основе Git-коммитов (используйте `oma retro`), мониторинг агентов в реальном времени (используйте `oma dashboard terminal`), метрики продуктивности (используйте `oma stats get`).

**Процесс:**
1. Разрешить дату или временной диапазон из ввода на естественном языке (today, yesterday, last Monday, явная дата)
2. Получить данные беседы через `oma recap --date YYYY-MM-DD --json` для календарного дня или `oma recap --window 7d --json` для скользящего окна (`1d`, `3d`, `7d`, `2w`, `30d`); сузить выборку через `--tool`
3. Сгруппировать по содержанию (проекты и темы), а не по инструменту; окно от 3 дней и больше группируется по проекту, а не по дню
4. Извлечь темы (над чем работали, какие баги исправлены, какие инструменты изучены)
5. Отрендерить тематическую дневную/периодическую сводку

---

### oma-hwp

**Домен:** Конвертация HWP / HWPX / HWPML (корейский текстовый процессор) в Markdown с использованием `kordoc`.

**Когда использовать:** Преобразование корейских HWP-документов (`.hwp`, `.hwpx`, `.hwpml`) в Markdown, подготовка корейских государственных/корпоративных документов для контекста LLM или RAG, извлечение структурированного контента (таблицы, заголовки, списки, изображения, сноски, гиперссылки) из HWP.

**Когда НЕ использовать:** PDF-файлы (используйте oma-pdf), XLSX/DOCX (вне области), генерация/редактирование HWP (вне области), уже текстовые файлы (используйте инструмент Read напрямую).

**Основные правила:**
- Используйте `bunx kordoc@latest` для запуска (установка не требуется); всегда передавайте `@latest` или закреплённую версию
- Формат вывода по умолчанию — Markdown
- Если каталог вывода не указан, вывод идёт в тот же каталог, что и вход
- kordoc обеспечивает сохранение структуры (заголовки, таблицы, вложенные таблицы, сноски, гиперссылки, изображения)
- Защиты безопасности (ZIP-бомба, XXE, SSRF, XSS) обеспечиваются kordoc; не добавляйте свои
- Для зашифрованных или защищённых DRM HWP чётко сообщите пользователю об ограничении
- Выполните постобработку через `resources/flatten-tables.ts`, чтобы преобразовать HTML-блоки `<table>` в GFM pipe-таблицы и удалить символы Private Use Area шрифта Hancom

---

### oma-pdf

**Домен:** Конвертация PDF в Markdown с использованием `opendataloader-pdf`.

**Когда использовать:** Преобразование PDF-документов в Markdown для контекста LLM или RAG, извлечение структурированного контента (таблицы, заголовки, списки) из PDF, подготовка PDF-данных для потребления AI.

**Когда НЕ использовать:** Генерация/создание PDF (используйте соответствующие инструменты документирования), редактирование существующих PDF (вне области), простое чтение уже текстовых файлов (используйте инструмент Read напрямую).

**Основные правила:**
- Используйте `uvx opendataloader-pdf` для запуска (установка не требуется)
- Формат вывода по умолчанию — Markdown
- Если каталог вывода не указан, вывод идёт в тот же каталог, что и входной PDF
- Сохраняйте структуру документа (заголовки, таблицы, списки, изображения)
- Для сканированных PDF используйте гибридный режим с OCR
- Всегда запускайте `uvx mdformat` на выходе, чтобы нормализовать форматирование Markdown
- Валидируйте, что выходной Markdown читаем и хорошо структурирован
- Сообщайте пользователю о любых проблемах конвертации (отсутствующие таблицы, искажённый текст)

---

### oma-academic-writing

**Область:** академическая проза на английском уровня публикации: написание, редактирование и аудит эссе, отчётов, аналитических разделов, резюме для руководства, выводов и обзоров литературы.

**Когда использовать:** для подготовки или редактирования академических отчётов, эссе и аналитических разделов, написания резюме, выводов или обзоров литературы, переписывания текста с искусственным звучанием в естественный академический английский, доведения черновика до верхней категории оценивания (HD, A, top-band), а также проверки разнообразия предложений, качества глаголов, хеджирования и соответствия требованиям anti-AI.

**Когда НЕ использовать:** для перевода (используйте oma-translation), поиска источников, цитат или литературы (используйте oma-scholar), документации кода, README или справочных текстов API (используйте соответствующий доменный навык), неформального или маркетингового текста, а также академического письма не на английском языке (сначала подготовьте текст на английском, затем передайте его oma-translation).

**Режимы:** `draft` (заголовок + проза + Writing Notes + Claim-Evidence Map), `revise` (исходный текст + исправленный текст + список изменений), `review` (отчёт PASS/FAIL по структуре предложений, качеству глаголов, anti-AI, конкретности, хеджированию, ясности абзацев, ритму и соответствию утверждений доказательствам).

**Основные правила:**
- Цитируйте предоставленные ограничения рубрики, прежде чем судить о соответствии; если рубрики нет, объясняйте замечания относительно запрошенного объёма, а не выдумывайте критерии
- Каждое предложение должно быть проверяемым; не выдумывайте данные, статистику или цитаты
- Выбирайте глаголы по их точному значению и обоснованности (`resources/academic-verb-guide.md`); оставляйте распространённый глагол, если он точен и естественен
- Оценивайте повторяющуюся структуру и длину предложений в контексте (`resources/sentence-structure-reference.md`); меняйте ритм там, где это улучшает ясность, без квот на типы предложений
- Согласуйте силу хеджирования с силой доказательств по `resources/hedging-guide.md`, включая его ограничения на усилители и маркеры мнения от первого лица
- Каждое утверждение должно быть связано с доказательством в Claim-Evidence Map; неподтверждённые утверждения ослабляйте или удаляйте

**Рабочий процесс:** 6 шагов — READ (прочитать рубрику/черновик и процитировать ограничения), PLAN (спланировать абзацы по схеме Topic-Support-Conclude), DRAFT (написать текст по рекомендациям о предложениях, глаголах и хеджировании), AUDIT (проверить anti-AI checklist), REVERSE-OUTLINE + построить Claim-Evidence Map, POLISH (проверить связность, конкретность, объём, ритм и разнообразие длины абзацев).

---

### oma-security

**Область:** сканирование и проверка безопасности исходного кода приложений, пакетов навыков агентов и компонентов MCP. Тесты на проникновение для ограниченного по scope тестового веб-развёртывания выполняются только на платформе выполнения, которую предоставил и проверил пользователь.

**Когда использовать:** при сканировании репозитория или diff исходного кода; проверке пакета навыка, MCP-сервера или его конфигурации; ограниченном runtime-тесте на проникновение против конкретного авторизованного тестового развёртывания на платформе выполнения, которую вы предоставили и проверили; проверке кандидатов, найденных сканером; настройке шлюза CI для конкретного движка; диагностике учётных данных, покрытия, matchers, квоты или возобновляемого состояния сканера.

**Когда НЕ использовать:** для широкого ревью корректности, производительности, доступности или качества (используйте oma-qa), сравнения инструментов или исследования без запуска (используйте oma-search), решений по архитектуре безопасности (используйте oma-architecture), исправлений в продуктовом коде (используйте oma-debug или навык-владелец backend/frontend/mobile/инфраструктуры).

**Движок по умолчанию для каждой цели:**

| Цель | Движок по умолчанию |
|--------|----------------|
| Исходный код приложения или diff исходного кода | Deepsec (Cisco AI Deep SAST при явном выборе) |
| Каталог или пакет навыка агента | Cisco Skill Scanner |
| Исходный код, конфигурация или сервер MCP | Cisco MCP Scanner |
| Тестовое веб-развёртывание (`web_runtime`, `pentest`) | По умолчанию нет. ARTEX только по явному запросу, на платформе, предоставленной и проверенной пользователем |
| Ограниченное локальное воспроизведение | Метод проверки Cloudflare (без внешней сети) |

**Основные правила:**
- Общее сканирование репозитория выбирает только исходный код; сканирование навыков, MCP и runtime не добавляется неявно
- У runtime-тестирования нет встроенного движка или движка по умолчанию. Запрос на runtime или на исходный код вместе с runtime не выбирает ARTEX неявно, а навык не устанавливает, не собирает и не развёртывает платформу ARTEX. Без явного запроса ARTEX, конкретного тестового веб-развёртывания и проверенной платформы этап runtime записывается как `skipped`, а остальные выбранные операции продолжаются
- Сбой или пустой результат никогда автоматически не выбирает другой движок, модель или платный анализатор
- Сохраняйте и возобновляйте существующее состояние `.deepsec/`; никогда не переинициализируйте его, чтобы стереть неудачный или шумный запуск
- Установленный ключ или инструмент не разрешает платные вызовы или расширение области; повторно используйте уже имеющееся разрешение согласно общей политике выполнения
- Каждый уникальный кандидат передаётся новому верификатору, который его не обнаруживал; статус `confirmed` требует независимого наблюдаемого доказательства
- Ни один результат не доказывает, что цель безопасна; шлюз не может пройти, пока обязательные проверки не завершены

**Результат:** по одному каталогу `.agents/results/security/<run-id>/` на вызов с `run.json`, `findings.json` и `report.md` (а также `runtime.json` для веб-runtime и `gate.json` для CI).

---

### oma-docs

**Область:** сопровождение документации в четырёх режимах: `verify` (сломанные ссылки; заново генерирует `docs/generated/doc-refs.json`), `sync` (документы, ссылающиеся на файлы, изменённые в diff), `i18n` (дрейф переводов) и `lint` (стилевые проблемы в переведённых документах).

**Когда использовать:** после рефакторинга, переименования или удаления файла для поиска устаревших ссылок в документации; перед релизом, чтобы убедиться, что CLI-команды, пути файлов и ключи конфигурации всё ещё существуют; после существенного git diff, чтобы найти документы, ссылающиеся на изменённые файлы; для регулярной проверки дрейфа переводов.

**Когда НЕ использовать:** для общего исследования исходного кода (используйте oma-search), реализации приложения (используйте профильного специалиста-владельца), перевода известного текста (используйте oma-translation).

**Основные правила:**
- Запросы только на ревью дают предложения; уже имеющийся запрос на ограниченную правку разрешает применить эти исправления без отдельного одобрения для каждого файла
- CLI выдаёт структурированные данные; host LLM выполняет синтез и готовит патчи. Не выдумывайте находки CLI и не вызывайте API LLM вендора из docs CLI
- Файлы с секретами (`.env*`, приватные ключи, учётные данные) никогда не попадают в отчёты diff или патчи
- Соблюдайте блоки игнорирования, `oma-docs: skip` и настроенные исключения
- Проверка URL делегируется `lychee` (необязательно); hook рабочего процесса запускается только при включённом `docs.auto_verify` и лишь выдаёт предупреждения

**Рабочий процесс:** `oma docs verify --json`, `oma docs sync <range> --json`, `oma docs i18n --json` или `oma docs lint --json` → изучить структурированные результаты → сверить каждое исправление с текущим кодом → применить разрешённые исправления → повторно запустить затронутые проверки. `verify` завершается с кодом 0 при чистом результате и 1, если находит сломанные ссылки.

---

### oma-explanation

**Область:** автономные самодостаточные HTML-объяснения в двух режимах: режим изменения (diff, PR, ветка или диапазон коммитов — с контекстом, интуитивным объяснением, разбором кода и тестом из пяти вопросов) и режим темы (концепция, система или вопрос в виде одностраничного визуального листа).

**Когда использовать:** для объяснения diff, pull request, ветки или диапазона коммитов либо темы, системы или вопроса в виде одной HTML-страницы, работающей офлайн.

**Рабочий процесс:** модель пишет черновик в Markdown; `oma explain render` превращает его в один HTML-файл `.agents/results/explain/{YYYY-MM-DD}-{slug}.html`, а `oma explain validate` проверяет его (исправление и повторная проверка не более 3 раз). Страница открывается через `oma explain render --open`; неудачное открытие не считается сбоем. Навык активируется только через `/explain`, явное упоминание навыка или делегирование; он исключён из подсказок по ключевым словам.

**Когда НЕ использовать:** для обычной страницы документации, реализации рабочей функции или слайдовой презентации (для презентаций используйте `oma-slide`).

---

### oma-image

**Область:** генерация изображений несколькими AI-вендорами с dispatch с учётом аутентификации (Codex `gpt-image-2`, модели семейства Gemini “nano-banana” в Antigravity через `agy` с внутренним выбором точной модели, Pollinations flux/zimage).

**Когда использовать:** для генерации изображений, визуальных материалов, иллюстраций, предметных фотографий, концепт-арта или mockup, сравнения результата нескольких моделей по одному prompt, а также генерации изображений по prompt внутри рабочего процесса редактора.

**Когда НЕ использовать:** для редактирования существующего изображения или обработки фотографий, генерации видео или аудио (используйте oma-video / oma-voice), создания встроенной векторной/SVG-композиции из структурированных данных, простого изменения размера или преобразования формата.

**Основные правила:**
- Определяйте brief: используйте предоставленные детали и разумные творческие значения по умолчанию и спрашивайте, только когда недостающий выбор существенно меняет результат. Расширенный prompt не требует отдельного одобрения, если генерация уже разрешена
- Dispatch с учётом аутентификации: запускайте только аутентифицированных вендоров; при `--vendor all` все запрошенные вендоры должны быть доступны
- Контроль стоимости: подтвердите запуск с оценкой стоимости ≥ $0.20 (`--yes`/`OMA_IMAGE_YES=1` отключает запрос); `pollinations` и `antigravity` по умолчанию бесплатны
- Безопасность пути: для вывода за пределами `$PWD` требуется `--allow-external-output`; максимальное `n` = 5
- Записанные результаты: каждый запуск создаёт рядом с изображениями `manifest.json` с prompt, вендором/моделью, входами и метаданными артефакта. Он фиксирует данные воспроизводимости, но не обещает пиксельно идентичные изображения.
- Прикреплённые изображения-образцы автоматически передаются через `--reference <path>` (codex/antigravity)
- Настройки проекта находятся в разделе `image:` файла `.agents/oma-config.yaml`; поставляемые значения по умолчанию находятся в CLI

**Рабочий процесс:** PREPARE (определить brief, выбрать вендора) → ACQUIRE (проверить auth, references и путь вывода) → ACT (`oma image generate`) → VERIFY (manifest, файлы, код выхода) → FINALIZE (пути к результатам и предупреждения).

---

### oma-market

**Область:** исследование рынка по сигналам сообществ: извлечение болевых точек, обнаружение трендов, позиционирование конкурентов и открытый поиск. Исследование выполняется через upstream-движок [`last30days`](https://github.com/mvanhorn/last30days-skill) (Reddit, X, YouTube, TikTok, Instagram, HN, Polymarket, GitHub, arXiv, Techmeme, Digg, LinkedIn, StockTwits, Bluesky, web и другие источники), который устанавливается как навык через skills CLI.

**Когда использовать:** для извлечения реальных болевых точек из постов сообществ, обнаружения трендов в категории за период 7/30/90/180 дней, анализа настроений и SWOT / позиционирования Porter's 5F, открытого поиска (`--discover`), исследования человека, компании или тикера, анализа сигналов найма и последующих углублённых запросов.

**Когда НЕ использовать:** для общего веб-исследования без рыночной рамки (используйте oma-search), академической литературы (используйте oma-scholar), живых дашбордов или планового мониторинга (оберните этот навык в `oma schedule <action>`).

**Основные правила:**
- Сначала detect-trap: никогда не запускайте движок без preflight (`--force` только после явного повторного подтверждения пользователя)
- Один движок, установленный как навык: `oma market resolve` читает установку через skills CLI (или закреплённую версию); `oma market update` устанавливает его, если он отсутствует, и обновляет в остальных случаях, после согласия пользователя
- Дословно следуйте `SKILL.md` разрешённого движка; единственная замена — `oma market run <args>` вместо необработанного вызова `python3 scripts/last30days.py`
- Никогда не ограничивайтесь WebSearch: отсутствие движка, Python 3.12+ или ненулевой код выхода означает остановку и отчёт
- Источники с ключами включаются только через upstream setup wizard с согласием пользователя; пропущенные источники остаются видимыми в footer
- Frameworks ссылаются только на кластеры движка. Badge движка идёт первой строкой; сначала записывается черновой brief, затем upstream LAWs 1–8 и self-check по `resources/output-laws.md` должны пройти на записанном файле, прежде чем он будет выдан
- Один brief на запуск в `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`; framework автоматически выбирается по намерению (pain/trend → SWOT, competitor → SWOT + Porter's 5F, discovery → SWOT + PESTEL)

**Рабочий процесс:** detect-trap → `oma market resolve` → прочитать upstream SKILL.md → upstream pre-research (setup wizard, разрешение handle/subreddit, план запросов) → `oma market run … --emit=compact` → синтез по upstream OUTPUT CONTRACT → добавить разделы framework между телом движка и footer движка → записать → выполнить self-check записанного файла, исправить и проверить повторно.

---

### oma-refactor

**Область:** рефакторинг с сохранением поведения: безопасная поэтапная реструктуризация с прицелом на code smell, SATD и hotspots, страховочной сеткой из characterization-тестов и коммитами только для рефакторинга.

**Когда использовать:** для рефакторинга конкретных файлов или модулей (extract, move, rename, decompose, выравнивание идиом), подготовительного рефакторинга перед feature, спасения legacy/brownfield-кода (поиск seam + characterization-тесты), выбора цели по hotspot (churn × complexity) и аудита готовности к безопасному рефакторингу.

**Когда НЕ использовать:** для исправления заявленного бага или сломанного поведения (используйте oma-debug; рефакторинг не должен менять поведение), аудита безопасности, производительности или доступности (используйте oma-qa), проектирования системы, границ модулей или ADR (используйте oma-architecture), проектирования схемы БД или механики миграций (используйте oma-db), разделения коммитов или staging (используйте oma-scm), оптимизации производительности как цели.

**Основные правила:**
- Сохраняйте поведение: контракт потребителя (с учётом Hyrum) неприкосновенен; настройка — побочный эффект, а не цель
- Проверяйте: не реструктурируйте без safety net; если он отсутствует или слаб, сначала напишите characterization (golden-master) тесты отдельными коммитами
- Работайте постепенно: одна именованная трансформация на коммит; при повторном сбое используйте Mikado (запишите предпосылку, полностью откатите и углубляйтесь рекурсивно)
- Разделяйте две роли: не смешивайте изменения поведения с коммитами рефакторинга (только тип `refactor:`)
- Учитывайте экономику: читаемость — главная цель; не рефакторьте код, который планируется удалить, или холодный код с низкой изменчивостью
- Отклонение от соглашений направляйте через ADR oma-architecture, а не локальным изменением; все метрики — proxy (Goodhart)

**Рабочий процесс:** PREPARE (классифицировать green/brownfield, учесть существующий в проекте size gate, если он есть, ранжировать hotspots) → ACQUIRE (прочитать код через symbol tools, собрать метрики и git-сигналы) → REASON (спланировать последовательность атомарных преобразований / expand-contract) → ACT (одно преобразование, сначала engine) → VERIFY (повторно запустить неизменённые тесты → commit или откат Mikado; если запуск тестов исключён, остановиться перед следующим преобразованием и сообщить о применённом как о непроверенном) → FINALIZE (изменение метрик и вердикт читаемости).

---

### oma-scholar

**Область:** помощник по научным исследованиям, использующий спецификацию sidecar Knows `.knows.yaml`: генерация, проверка, рецензирование, запросы и сравнение структурированных sidecar статей, а также получение данных с knows.academy.

**Когда использовать:** для чтения статьи с экономией токенов через sidecar (примерно 700 токенов только на claims против ~10K полного PDF), генерации `.knows.yaml` из черновиков/LaTeX/заметок, проверки структуры sidecar перед публикацией, подготовки peer review как sidecar, запросов или сводок существующих sidecar, структурного сравнения двух статей и поиска или получения данных с knows.academy.

**Когда НЕ использовать:** для общего веб-поиска или неакадемического контента (используйте oma-search), перевода статей (используйте oma-translation), только разбора PDF без sidecar (используйте oma-pdf), полного peer-review рабочего процесса с редакторской системой.

**Режимы:** Generate, Validate, Review, Analyze, Compare, Remote (search/fetch).

**Основные правила:**
- Целевая спецификация — v0.9.0 / профиль `paper@1`; host LLM создаёт sidecar (никогда не запускайте внешний LLM SDK из shell)
- Защита от выдумок: если DOI, venue или year не видны в источнике, полностью пропустите ключ; никогда не пишите `doi: TODO` и не угадывайте
- Формы полей в точности следуют `resources/sidecar-spec.md`: имена полей, один объект `provenance.actor`, закрытые enum, числа без кавычек и ID в kebab-case с префиксом
- Локальные правила генерации и lint отслеживают совместимость с production, а не полную каноническую схему v0.9; `resources/canonical-delta.md` описывает разницу при импорте или lint сторонней записи
- Claims с доказательствами используют `supported_by`; определения и открытые вопросы могут оставаться привязанными к источнику. `oma scholar lint` предупреждает, если связей меньше 1.5 на statement, но это соотношение — диагностика, а не квота
- Проверяйте перед публикацией (`oma scholar lint`); для сторонних sidecar используйте `--lenient`
- knows.academy → запасной OpenAlex для старых или не-2026 статей; публичный proxy API не требует auth

**Рабочий процесс:** PREPARE (режим и источник) → ACQUIRE (метаданные, разделы или локальный текст) → REASON (извлечь claims, evidence и relations) → ACT (generate/lint/review/analyze/compare/fetch) → VERIFY (схема, enum, ID, relations) → FINALIZE (sidecar, отчёт или сводка с оговорками).

---

### oma-skill-creation

**Область:** создание и проверка навыков OMA в Markdown-формате SSL-lite (Scheduling / Structural Flow / Logical Operations / References).

**Когда использовать:** при создании нового навыка в `.agents/skills/{name}/SKILL.md`, обновлении существующего навыка до формата SSL-lite, добавлении канонического пути команды или рабочего процесса в навык с большим количеством операций, аудите достаточности описания маршрутизации, выполнения, проверки и восстановления, решении, какие примеры держать inline, а какие перенести в `resources/`.

**Когда НЕ использовать:** для установки сторонних навыков в `$CODEX_HOME/skills` (внешний контур), создания пакета плагина Codex (внешний контур), написания общего плана проекта без авторинга навыка (используйте oma-pm), редактирования кода продукта, инфраструктуры, frontend, backend или mobile (используйте соответствующий специализированный навык).

**Основные правила:**
- Сохраняйте ровно четыре верхнеуровневых раздела: Scheduling, Structural Flow, Logical Operations, References
- Сохраняйте YAML frontmatter с понятными `name` и `description`; после редактирования description запускайте `oma skill audit` (предупреждение при ≥ 60%, ошибка при ≥ 75% коллизии по косинусной близости TF-IDF)
- Добавляйте чёткие границы `When NOT to use` с маршрутами к соседним навыкам
- Добавляйте ровно один inline canonical path (`Canonical command path` для хрупких/повторяемых команд, `Canonical workflow path` для потока, требующего суждения или исследования)
- Длинные варианты с деталями переносите в `resources/`, а не в основной текст; не создавайте внутри навыка README, changelog или install docs

**Рабочий процесс:** PREPARE (назначение, triggers, границы, I/O, зависимости) → ACQUIRE (прочитать 1–3 аналогичных навыка и соглашения) → REASON (решить inline против `resources/`) → ACT (подготовить по шаблону SSL-lite) → VERIFY (структура, маршрутизация, выполнение, форматирование) → FINALIZE (изменённые файлы и отчёт проверки).

---

### oma-slide

**Область:** генерация анимационных HTML-презентаций на фиксированной сцене 1920×1080 с детерминированной проверкой, сборкой и экспортом в PDF/PNG/PPTX через CLI `oma slide`, а также маршрут `native-pptx`, который создаёт редактируемые файлы PowerPoint через upstream-навык [ppt-master](https://github.com/hugohe3/ppt-master).

**Когда использовать:** при создании презентации по теме или плану, улучшении или переформатировании существующей колоды, генерации HTML для каждого слайда с анимациями и эстетикой design-doctrine, экспорте колоды в PDF/PNG/PPTX, применении именованного style preset, экспорте в Canva или импорте из Canva. Маршрут `native-pptx` используйте для редактируемого PPTX, заполнения или правки существующего PPTX с сохранением его дизайна, превращения документа в колоду PPTX, переиспользуемых шаблонов или PPTX/MP4 с озвучкой.

**Когда НЕ использовать:** для обычного документа без слайдов, одной генерации изображения (напрямую используйте oma-image), определения brand/design system (используйте oma-design), детерминированных операций CLI (validate/bundle/export) без генерации (вызывайте CLI `oma slide` напрямую).

**Основные правила:**
- Навык создаёт HTML; CLI выполняет всё остальное (scaffold, validate, bundle, export)
- Только локальные assets: в `<img src>`/`<video src>` запрещены удалённые URL, разрешены только `./assets/<file>`
- Для CJK на любом корейском, японском или китайском слайде обязателен шрифт Pretendard
- Обёртка `prefers-reduced-motion`, видимые состояния focus и каноническая структура слайда обязательны на каждом слайде: `oma slide validate` измеряет каждый `.slide` внутри `.deck-stage` как кадр 1920×1080, без исключений для отдельных слайдов или элементов
- Максимум 3 автоисправления при валидации; затем покажите пользователю diff
- Генерацию изображений передавайте oma-image; Canva MCP необязателен и автоматически подключается только с явного согласия пользователя
- `native-pptx`: загружает ppt-master из каталога навыков runtime или через `bunx skills use hugohe3/ppt-master@ppt-master`, никогда его не изменяет, устанавливает его Python-пакеты только с согласия и следует его собственным шлюзам

**CLI:** `oma slide create` (scaffold рабочего каталога), `oma slide style get` (получение файла стиля), `oma slide asset fetch-video` (загрузка видео), `oma slide import pptx`, `oma slide validate`, `oma slide bundle`, `oma slide export pdf|png|pptx`, `oma slide edit` и `oma slide doctor`.

**Рабочий процесс:** 7 фаз — DETECT (маршрут + режим), DISCOVER (использовать предоставленные цель, аудиторию, число слайдов и assets; один объединённый вопрос только о недостающих решениях, которые существенно влияют на колоду), STYLE (предоставленный стиль, соглашения существующей колоды или подходящий preset; 3 live preview только когда запрошено исследование стиля или направление остаётся существенным открытым выбором), GENERATE (`slide-NN.html` при 1920×1080), VALIDATE (`oma slide validate`, не более 3 циклов автоисправления), REVIEW (viewer + необязательный bbox editor), DELIVER (`bundle` + необязательный экспорт PDF/PNG/PPTX).

---

### oma-video

**Область:** создание видео через CLI `oma video`, а также анализ и монтаж существующих клипов локальными медиаинструментами.

**Когда использовать:** при генерации коротких видео и explainer, создании demo из файла `--capture`, записанного человеком, повторном рендеринге существующего запуска, извлечении кадров, анализе видимых объектов, удалении пауз и сборке дублированных клипов.

**Когда НЕ использовать:** для одного неподвижного изображения (oma-image), слайдовой колоды (oma-slide), обработки только аудио либо генерации или транскрипции речи (oma-voice), перевода устной речи (oma-translation) или live streaming.

**Основные правила:**
- Работу с существующими клипами направляйте в справочник по обработке медиа до выбора режима создания и провайдера; эти операции используют установленные инструменты, а не новый режим генерации CLI
- Для поддерживаемых fallback assets ключи провайдеров необязательны. Провайдеры stock и AIGC (Pexels, Pixelle) используются только с `--visual stock` или `--visual aigc` и их env key; в остальных случаях визуальные материалы представляют собой кадры `oma-image`, которым ключ не нужен. Сбой compositor никогда не заменяется fallback-видео
- Кадр `oma-slide` используется только для сцены, у которой `visual.ref` указывает на существующий каталог колоды; провайдер не генерирует колоду, а сцена-слайд без такого каталога рендерит placeholder
- При создании действует контроль стоимости при ≥ `$0.20` (`--yes`/`OMA_VIDEO_YES=1` для уже разрешённой платной работы) и лимиты 180 секунд и 40 сцен; эти настройки находятся в разделе `video:` файла `.agents/oma-config.yaml`
- Входы рендера записываются в `render-spec.json`, assets, seed и встроенный Pretendard; `OMA_VIDEO_MOCK=1` — test harness для golden fixtures, не пользовательский результат
- Захват demo выполняет человек; `--source web --url` передаёт контекст и не запускает запись и не автоматизирует вход. Маскируйте токены URL в logs/manifest
- Для demo нужен `--polish`, чтобы направить захват через composition `Demo`, где маскируются персональные данные. Без `--polish` итоговый MP4 остаётся исходным, немаскированным захватом, который можно выдавать только после того, как проверка персональных данных не нашла ничего для маскирования
- Безопасность пути (`--allow-external-output` для вывода за пределами `$PWD`)

**Рабочий процесс:** PREPARE (режим/aspect/locale; озвучить выведенные значения по умолчанию и спрашивать, только когда ответ меняет результат) → ACQUIRE (проверить доступность провайдера, путь capture и стоимость) → ACT (script → voice ∥ visuals ∥ captions → render-spec → render) → VERIFY (schema, hashes manifest, код выхода, mp4) → FINALIZE (каталог запуска, путь mp4 и предупреждения о покрытии).

Для существующих клипов используются проверка исходных потоков и PTS, явные критерии выбора кадров или склеек и общая timeline монтажа аудио и видео. Детекторы речи и амплитуды могут расходиться; спорные интервалы разрешайте по запрошенному содержимому, а не увеличивайте число склеек. При дубляже можно скопировать исходное закодированное изображение, заменив его аудио.

---

### oma-voice

**Область:** локальная генерация и транскрипция речи через Voicebox, а также конвертация существующего аудио, подгонка длительности и обработка громкости с помощью FFmpeg.

**Когда использовать:** для коротких звуков уведомлений о завершении задачи агента или блокировках, записи voiceover/narration/audio assets (mp3 или wav), транскрипции локальных аудиофайлов (mp3, wav, m4a, webm, flac) в Markdown, сравнения профилей голоса повторным запуском одного текста с разными profile id.

Используйте также для подгонки существующей речи под запрошенное окно, передискретизации, преобразования каналов и запрошенных профилей громкости. Размещение в видео остаётся за oma-video.

**Когда НЕ использовать:** для облачного TTS или высокоточных многоязычных облачных голосов, диктовки в реальном времени с терминального микрофона (используйте hotkey dictation Voicebox), загрузки образца для клонирования голоса или создания profile (это выполняется в UI настольного приложения Voicebox), видео, музыки или sound design.

**Основные правила:**
- Voicebox требуется для генерации и транскрипции; обработка существующего аудио обходит его проверки health, profile и модели
- Profile требуется только для TTS; транскрипция и локальная обработка файлов его не требуют
- Лимиты длины: TTS ограничен 5000 символами за вызов, STT — 30 минутами; v1 не разбивает ввод автоматически
- Прозрачность auto-invocation: уведомления запускаются только если задача дольше `auto_notify_after_sec` (по умолчанию 60 секунд); всегда объявляйте намерение одной строкой
- Явно запрошенный путь вывода разрешает запись по этому назначению; уточняйте неоднозначную замену посторонних файлов. Прерванный вызов не записывает частичный вывод
- Сохранённые аудио и транскрипты включают manifest; обработка записывает реальные данные об источнике и операции без выдуманных generation id

**Рабочий процесс:** PREPARE (проверить текст/аудио/язык/путь/profile) → ACQUIRE (однократно уточнить, если сигнал отсутствует) → ACT (MCP `voicebox_speak` или `voicebox_transcribe`) → VERIFY (наличие audio/transcript и поля manifest) → FINALIZE (записать `manifest.json`, сообщить путь).

Запросы по существующим файлам направляются на локальную обработку до этой последовательности Voicebox. Сохраняйте исходное аудио, выводите целевые темп и громкость из запрошенного результата и держите технические измерения отдельно от неоценённой естественности речи.

---

## Авторизация и уточнение {#charter-preflight-charter_check}

Агенты не выводят фиксированный блок предполётной проверки. Каждое определение в `.agents/agents/` ссылается на `.agents/skills/_shared/core/execution-policy.md`, который `oma agent spawn` внедряет в prompt каждого субагента вместе с `.agents/skills/_shared/runtime/result-contract.md`.

| Ситуация | Что делает агент |
|-----------|---------------------|
| Цель и разрешение ясны; остаются рутинные детали | Использует соглашения репозитория, озвучивает существенные допущения и продолжает работу |
| Предпочтение пользователя может улучшить результат | Задаёт один краткий необязательный вопрос и продолжает независимую работу |
| Недостающая информация существенно влияет на корректность или объём работы | Задаёт конкретный вопрос и приостанавливает только зависимую работу |
| Действию нужно разрешение, которое ещё не дано | Готовит результат для проверки, объясняет действие, затем спрашивает |

Запущенный субагент не может напрямую спросить пользователя. Он сообщает точный недостающий факт и уже выполненную независимую работу в структурированном результате `blocked` или `partial`, а координатор отвечает на основе имеющегося контекста или спрашивает пользователя. См. `.agents/skills/_shared/core/clarification-protocol.md`.

---

## Загрузка навыков {#two-layer-skill-loading}

Агент полностью читает SKILL.md навыка-владельца и читает файлы `resources/` по одному, только когда задача удовлетворяет заявленному trigger каждого файла: разделы чек-листа — для нерешённой проверки, error playbook — только после наблюдаемого сбоя, `common-checklist.md` — только для широкого междоменного ревью. Сложность задаёт мягкий бюджет размера; она никогда не добавляет навыки или полные чек-листы. Модель загрузки описана на странице [Навыки](./skills.md), см. также [Загрузка ресурсов по задаче](./skills.md#resource-loading-by-task).

---

## Ограниченное выполнение

Агенты работают в строгих доменных границах:

- Фронтенд-агент не будет модифицировать бэкенд-код
- Бэкенд-агент не будет трогать UI-компоненты
- БД-агент не будет реализовывать API-эндпоинты
- Агенты документируют внедоменные зависимости для других агентов

Когда в процессе выполнения обнаруживается задача из другого домена, агент документирует её в файле результатов как элемент эскалации, вместо того чтобы пытаться обработать самостоятельно.

---

## Стратегия рабочих пространств

Для мультиагентных проектов отдельные рабочие пространства предотвращают конфликты файлов:

```text
./apps/api → backend agent workspace
./apps/web → frontend agent workspace
./apps/mobile → mobile agent workspace
```

Рабочие пространства указываются флагом `-w` при запуске агентов:

```bash
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent spawn frontend "Build login form" session-01 -w ./apps/web
```

`-w` необязателен; если он опущен, рабочее пространство определяется автоматически. Используйте `--task-id`, чтобы каждый запуск соответствовал своей задаче плана, `--isolation worktree`, чтобы выделить каждому запуску собственный git worktree, и `--read-only`, чтобы ограничить проход ревью неразрушающими инструментами:

```bash
oma agent spawn backend prompts/auth-api.md session-01 --task-id task-2 --isolation worktree
oma agent spawn qa prompts/review.md session-01 --task-id task-5 --read-only
```

---

## Поток оркестрации {#orchestration-flow}

При запуске мультиагентного рабочего процесса (`/orchestrate` или `/work`):

1. **PM-агент** декомпозирует запрос в задачи с числовыми уровнями приоритета (`1` = без зависимостей; уровни с меньшим номером выполняются первыми), зависимостями и критериями приёмки. Действующий план используется повторно
2. **Инициализация сессии**: генерируется ID сессии, для каждой задачи выбираются ссылки, а в настроенном хранилище памяти создаются `orchestrator-session-{sessionId}.md` и `task-board-{sessionId}.md`
3. **Задачи уровня 1** запускаются параллельно (до MAX_PARALLEL параллельных агентов)
4. **Мониторинг прогресса**: оркестратор предпочитает уведомления хоста о завершении; для запусков `oma agent spawn` без них один координатор опрашивает изменившиеся файлы `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` в рамках запуска с ограниченным backoff. Нативные субагенты Claude Code возвращают результат синхронно
5. **Следующие уровни** запускаются после завершения их зависимостей
6. **Цикл ревью** запускается для каждого завершённого агента (см. ниже)
7. **Сбор результатов** из файлов результатов в рамках запуска и структурированных claims
8. **Финальный отчёт** с резюме сессии, изменёнными файлами, оставшимися проблемами

### Цикл ревью агент-агент

Источник: `.agents/skills/oma-orchestration/SKILL.md` (PHASE 4.5).

```mermaid
flowchart TD
    done["Agent completes work"] --> self["1. Mechanical self-check: lint, type-check, tests, diff scope"]
    self --> supported{"Automated verify supported for this agent type?"}
    supported -->|"backend, frontend, mobile, qa, debug, pm"| verify["2. oma verify agent"]
    supported -->|"db, refactor, architecture, tf-infra, docs"| skip["Record SKIP"]
    verify -->|PASS| review["3. QA cross-review"]
    skip --> review
    verify -->|FAIL| fix["Agent fixes from the feedback"]
    review -->|FAIL| fix
    fix --> self
    review -->|PASS| accept["Accept result"]
```

Самопроверка только механическая. Качество дизайна и критерии приёмки оцениваются в кросс-ревью QA, потому что агенты склонны переоценивать собственный результат.

| Счётчик | Максимум | При превышении |
|---------|-----|-------------|
| Циклы самопроверки и исправления | 3 | Всё равно перейти к кросс-ревью |
| Отклонения на кросс-ревью | 2 | Сообщить пользователю с историей ревью |
| Всего итераций цикла | 5 | Прекратить восстановление; сохранить непройденные проверки и вернуть `partial` или `failed` |

---

## Определения агентов {#agent-definitions}

`.agents/agents/` содержит 12 сохранённых в репозитории определений субагентов, являющихся источником истины, — по одному на каждую роль из таблицы [Роли dispatch](#dispatch-roles). Каждый файл задаёт идентичность агента и `skills:`, раздел протокола выполнения, указывающий на общую политику выполнения и контракт результата, а также доменные правила; некоторые добавляют резюме архитектуры или процесса. Они используются при запуске субагентов через Task/Agent tool (Claude Code) или CLI, и OMA проецирует их в [нативные файлы агентов](#native-agent-files) для каждого runtime.

---

## Оперативное состояние (хранилище памяти проекта)

Во время сессий оркестрации агенты координируются через общие файлы памяти в `.agents/state/memories/` (старые проекты используют запасной legacy-путь `.serena/memories/`). Путь или имена инструментов меняются через `memoryConfig` в `.agents/mcp.json`, а не в `.mcp.json` в корне репозитория — это список MCP-серверов Claude Code:

| Файл | Владелец | Назначение | Для остальных |
|------|-------|---------|--------|
| `orchestrator-session-{sessionId}.md` | Оркестратор | ID сессии, статус, время начала, отслеживание фаз | Только чтение |
| `task-board-{sessionId}.md` | Оркестратор | Назначения задач, приоритеты, обновления статуса | Только чтение |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Этот запуск | Пошаговый прогресс: выполненные действия, прочитанные/изменённые файлы, текущий статус | Читает оркестратор |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Этот запуск | Итоговый вывод: статус (completed/failed), резюме, изменённые файлы, чек-лист критериев приёмки | Читает оркестратор |
| `session-metrics-{sessionId}.md` | Оркестратор | Необязательные доказательства сессии: существенные корректировки, переделки, рассмотренные находки ревью | Читает QA |
| `lessons-{sessionId}.md` | Оркестратор | Подкреплённые доказательствами уроки сессии | Читают все |
| `experiment-ledger-{sessionId}.md` | Оркестратор/QA | Доказательства для фактических экспериментов | Читают все |

Инструменты памяти настраиваются. По умолчанию агенты напрямую читают и записывают эти coordination-файлы нативными инструментами (`Read`, `Write`, `Edit`), но в `.agents/mcp.json` можно настроить пользовательские инструменты и базовый путь:

```json
{
  "memoryConfig": {
    "provider": "file",
    "basePath": ".agents/state/memories",
    "tools": {
      "read": "Read",
      "write": "Write",
      "edit": "Edit"
    }
  }
}
```

Дашборды (`oma dashboard terminal` и `oma dashboard web`) наблюдают за этими файлами памяти для мониторинга в реальном времени.

---

## Связанные материалы

- [Навыки](./skills.md): как выбирается навык и как загружаются его ресурсы
- [Рабочие процессы](./workflows.md): рабочие процессы со слеш-командами, которые читают навыки
- [Параллельное выполнение](./parallel-execution.md)
- [Результаты агентов и возобновление](../guide/agent-results-and-resume.md): жизненный цикл `oma agent begin` → `oma agent verify` → `oma agent finish`
- [Модели по агентам](../guide/per-agent-models.md)
- [Мониторинг через дашборд](../guide/dashboard-monitoring.md)
