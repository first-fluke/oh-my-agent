---
title: Руководство по использованию
sidebar_label: Использование OMA
description: "Руководство по OMA: выбор задачи с учётом читателя, примеры одного навыка и нескольких доменов, рабочие процессы, автодетекция, все 33 пакета навыков, параллельное выполнение через CLI, дашборды, defaults и восстановление."
---

# Как использовать oh-my-agent

## Быстрый старт

1. Откройте проект в выбранной IDE или CLI с поддержкой AI (Claude Code, Codex CLI, Cursor, Antigravity, OpenCode, Kimi, Kiro, Qwen или другом поддерживаемом host)
2. Выбранный host загружает навыки из `.agents/skills/`; включённые hooks могут обнаруживать workflow по ключевым словам естественного языка
3. Опишите желаемый результат естественным языком. Host или выбранный workflow направит задачу в подходящий skill
4. Для работы нескольких агентов используйте `/work` или `/orchestrate`

Для задачи одного домена специальный синтаксис не нужен. Используйте [руководство выбора навыка и рабочего процесса](/docs/core-concepts/workflows#choosing-a-skill-or-workflow), чтобы выбрать один skill, `/work`, `/orchestrate`, `/ultrawork` или `/ralph`. Для установки см. [Быстрый старт](../getting-started/quick-start.md), а перед сменой провайдеров — [Важные defaults](../getting-started/important-defaults.md).

---

## Пример 1: простая задача одного домена

**Вы вводите:**
```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**Что происходит:**

1. Host направляет запрос в `oma-frontend` (ключевые слова вроде "form", "component" и "Tailwind CSS" служат routing signals)
2. Слой 1 (`SKILL.md`) уже загружен: identity агента, core rules и список библиотек
3. Ресурсы Слоя 2 загружаются по требованию:
   - `execution-protocol.md`: 4-шаговый workflow (Analyze, Plan, Implement, Verify)
   - `snippets.md`: паттерны формы и валидации Zod
   - существующие component patterns и `snippets.md`, если skill их предоставляет
4. Агент выводит **CHARTER_CHECK**:
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
<!-- oma-docs:ignore-start -->
5. Агент реализует:
   - React component с TypeScript в `src/features/auth/components/login-form.tsx`
   - Zod validation schema в `src/features/auth/utils/login-validation.ts`
   - Vitest tests в `src/features/auth/utils/__tests__/login-validation.test.ts`
   - Loading skeleton в `src/features/auth/components/skeleton/login-form-skeleton.tsx`
<!-- oma-docs:ignore-end -->
6. Агент запускает checklist: accessibility (ARIA labels, semantic HTML, keyboard nav), mobile viewport, performance (no CLS), error boundaries

**Ожидаемый результат:** scoped React component с TypeScript, валидацией, тестами и evidence доступности, если проект поддерживает такие проверки. Prompt и выбранный workflow определяют, какие файлы и проверки действительно выполняются.

---

## Пример 2: проект из нескольких доменов

**Вы вводите:**
```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**Что происходит:**

1. Запрос охватывает frontend, backend и mobile. Host agent может использовать этот scope, чтобы предложить способ координации.
2. При включённом keyword-detection hook фраза "Build a TODO app" совпадает с настроенным `/orchestrate` pattern и может активировать его. Hook сопоставляет текст, но не классифицирует запрос как multi-domain. Используйте явную command, чтобы выбрать workflow.

**Использование `/work` (пошагово, под контролем пользователя):**

```
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Шаг 1, PM Agent планирует:**
   - Определяет домены: backend (auth API, task CRUD), frontend (login, task list UI), mobile (Flutter app)
   - Определяет API contracts: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`
   - Создаёт приоритетный task breakdown:
     - P0: Backend auth API, Backend task CRUD API
     - P1: формы входа и регистрации во frontend, список задач во frontend, экраны авторизации в mobile, список задач в mobile
     - P2: QA review
   - Сохраняет результат в `.agents/results/plan-{sessionId}.json`

4. **Шаг 2, ревью плана:** агент показывает план и продолжает в пределах уже полученного разрешения, запрашивая только существенное недостающее решение или новое разрешение.

5. **Шаг 3, запуск агентов по приоритетам:**
   ```bash
   # P0 tier (parallel)
   oma agent spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 -w ./apps/api &
   oma agent spawn db "User and task schema design" session-todo-01 &
   wait

   # P1 tier (parallel, after P0 completes)
   oma agent spawn frontend "Login, register, task list UI" session-todo-01 -w ./apps/web &
   oma agent spawn mobile "Auth and task screens" session-todo-01 -w ./apps/mobile &
   wait
   ```

6. **Шаг 4, QA Agent выполняет ревью:**
   - Security: соответствие OWASP Top 10 (JWT validation, CSRF, SQL injection check)
   - Performance: проверка N+1 query и pagination
   - Accessibility: WCAG 2.1 AA для всех frontend components
   - Cross-domain: соответствие API contract между frontend, mobile и backend

7. **Шаг 5, итерация:** если QA находит CRITICAL issues, повторно запустите ответственного агента с QA report.

---

## Пример 3: исправление бага

**Вы вводите:**
```
There's a bug. Clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**Что происходит:**

1. `oma-debug` активируется автоматически (keywords: "bug", "error", "Cannot read property")
2. **Шаг 1, сбор:** сообщение об ошибке и контекст сохраняются
<!-- oma-docs:ignore-start -->
3. **Шаг 2, воспроизведение:** MCP `search_for_pattern` находит вызов `.map()` в `src/features/tasks/components/task-list.tsx`
<!-- oma-docs:ignore-end -->
4. **Шаг 3, диагностика:** MCP `find_referencing_symbols` отслеживает поток данных:
   - hook `useQuery` получает tasks из API
   - Component отображается до поступления данных
   - Во время loading state `tasks` имеет значение `undefined`
   - Корневая причина: перед `.map()` нет проверки loading state
5. **Шаг 4, предложение исправления:** показать минимальное изменение с loading state check и null guard
6. **Шаг 5, реализация:**
   - добавить loading skeleton во время получения данных
   - добавить null check: `tasks?.map()` или ранний возврат в loading state
   - написать regression test, проверяющий корректный рендер component при `tasks === undefined`
7. **Шаг 6, поиск похожих паттернов:** MCP `search_for_pattern` ищет другие вызовы `.map()` для потенциально undefined arrays
   - находит 3 похожих паттерна в `user-list.tsx`, `comment-list.tsx`, `notification-list.tsx`
   - применяет тот же fix pattern заранее
8. **Шаг 7, документирование:** bug report записывается в память с root cause, fix и prevention

---

## Пример 4: дизайн-система

**Вы вводите:**
```
Design a dark premium landing page for my B2B SaaS analytics product
```

**Что происходит:**

1. `oma-design` активируется (keywords: "design", "landing page", "dark", "premium")
2. **Phase 1, SETUP:** проверяет `.design-context.md`. Если файла нет, спрашивает:
   - Какие языки поддерживает сервис? (только en / + CJK)
   - Целевая аудитория? (B2B, technical users, 25-45)
   - Характер бренда? (professional / premium)
   - Эстетическое направление? (dark premium)
   - Reference sites? (пользователь приводит примеры)
   - Accessibility? (WCAG AA)
3. **Phase 3, ENHANCE:** если prompt расплывчат, преобразует его в спецификацию по разделам
4. **Phase 4, PROPOSE:** представляет 3 направления дизайна:
   - **Направление A: "Midnight Observatory"**: глубокий navy (#0f1729), бирюзовые акценты (#22d3ee), Inter + JetBrains Mono, bento-сетка, раскрытие элементов при прокрутке
   - **Направление B: "Carbon Interface"**: нейтральный серый (#18181b), янтарные акценты (#f59e0b), системные шрифты, шахматная раскладка, микроинтеракции при наведении
   - **Направление C: "Deep Space"**: чистый тёмный фон (#0a0a0a), изумрудные акценты (#10b981), Geist + Geist Mono, полноширинные секции, входные анимации
5. **Phase 5, GENERATE:** по выбранному направлению создаёт:
   - `DESIGN.md` с 6 разделами (typography, color, spacing, motion, components, accessibility)
   - CSS custom properties
   - Tailwind config extensions
   - shadcn/ui theme variables
6. **Phase 6, AUDIT:** запускает проверки responsive (минимум 320px), WCAG 2.2, Nielsen heuristics и AI slop detection
7. **Phase 7, HANDOFF:** "Design complete. Run `/orchestrate` to implement with oma-frontend."

---

## Пример 5: параллельное выполнение через CLI

```bash
# Single agent for a simple task
oma agent spawn frontend "Add dark mode toggle to the header" session-ui-01

# Three agents in parallel for a full-stack feature
oma agent spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# After editing .agents/agents/ or workflows, regenerate vendor-native files
oma link claude codex antigravity

# Monitor while agents work (separate terminal)
oma dashboard terminal        # Terminal UI with live table
oma dashboard web    # Web UI at http://localhost:9847

# After implementation, run QA
oma agent spawn qa "Review notification feature across all platforms" session-notif-01

# Check session statistics after completion
oma stats get
```

Если текущий runtime совпадает с target vendor в `.agents/oma-config.yaml`, workflow должен предпочесть native subagents:
- Claude Code -> `.claude/agents/*.md`
- Codex CLI -> `.codex/agents/*.toml`
- Qwen Code -> `.qwen/agents/*.md`, выбирается через `subagent_type` Agent tool
- Antigravity CLI/IDE -> `oma agent spawn` через `agy`

Для cross-vendor tasks и `model_preset: free` используется `oma agent spawn`. Native dispatch по-прежнему требует, чтобы [жизненный цикл результата](./agent-results-and-resume.md) фиксировал доказательства верификации.

---

## Пример 6: ultrawork для максимального качества

**Вы вводите:**
```
/ultrawork Build a payment processing module with Stripe integration
```

**Что происходит (5 phases, 17 steps, 12 изолированных review steps):**

**Phase 1, PLAN (Steps 1-4, PM Agent inline):**
- Step 1: создать план с task breakdown, API contracts и dependencies
- Step 2: Plan Review (проверка полноты; сопоставлены ли все требования?)
- Step 3: Meta Review (самопроверка достаточности ревью)
- Step 4: Over-Engineering Review (фокус MVP, без лишней сложности)
- PLAN_GATE: план задокументирован, допущения перечислены, scope разрешён

**Phase 2, IMPL (Step 5, Dev Agents spawned):**
- Backend agent реализует Stripe integration (webhooks, idempotency, error handling)
- Frontend agent создаёт checkout flow и payment status UI
- Step 5.2: записать baseline, только если нужно определённое сравнение измерений
- IMPL_GATE: применимые non-emitting checks и tests проходят, изменены только запланированные файлы; build checks запускаются только по явному запросу

**Phase 3, VERIFY (Steps 6-8, QA Agent spawned):**
- Step 6: Alignment Review (соответствует ли implementation плану?)
- Step 7: Security/Bug Review (OWASP, npm audit, Stripe security best practices)
- Step 8: Improvement/Regression Review (нет новых regressions)
- VERIFY_GATE: Zero CRITICAL, zero HIGH, применимые целевые показатели измерений проекта достигнуты

**Phase 4, REFINE (Steps 9-13, Refactor Agent spawned):**
- Step 9: разделить большие files (> 500 lines) и functions (> 50 lines)
- Step 10: Integration/Reuse Review (устранить duplicate logic)
- Step 11: Side Effect Review (проследить cascade impact через `find_referencing_symbols`)
- Step 12: Full Change Review (consistency имён, alignment стиля)
- Step 13: удалить dead code
- REFINE_GATE: нет нерешённой измеренной регрессии, код очищен

**Phase 5, SHIP (Steps 14-17, QA Agent spawned):**
- Step 14: Code Quality Review (lint, types, coverage)
- Step 15: UX Flow Verification (end-to-end payment user journey)
- Step 16: Related Issues Review (финальная проверка cascade impact)
- Step 17: Deployment Readiness (secrets management, migration scripts, rollback plan)
- SHIP_GATE: все проверки проходят; используется уже полученное разрешение. Публикация или deploy требуют разрешения на это действие.

---

## Все команды workflow

| Команда | Тип | Что делает | Когда использовать |
|---------|------|-------------|-------------|
| `/orchestrate` | Persistent | Загружает или создаёт план, затем делегирует параллельное выполнение с мониторингом и проверкой | Независимые задачи для автоматической параллельной координации |
| `/work` | Persistent | Пошаговое планирование, реализация и QA в нескольких доменах в пределах разрешённого scope | Фичи нескольких доменов, требующие координации |
| `/ultrawork` | Persistent | 5-фазный workflow качества, 17 шагов и 12 изолированных review checkpoints | Доставка максимального качества и production-critical code |
| `/plan` | Non-persistent | PM task breakdown, API contracts и tracked plan artifacts в `docs/plans/work/` (последовательные `NNN-name.md`, поле Status для lifecycle) | Перед сложной multi-agent работой и feature с журналом решений |
| `/brainstorm` | Non-persistent | Design-first ideation с 2–3 предложениями подходов | Перед выбором подхода реализации |
| `/deepinit` | Non-persistent | Инициализация проекта (AGENTS.md, ARCHITECTURE.md, docs/) | Настройка oh-my-agent в существующей кодовой базе |
| `/review` | Non-persistent | QA pipeline: OWASP security, performance, accessibility, code quality | Перед merge кода и pre-deployment review |
| `/debug` | Non-persistent | Structured debugging: reproduce, diagnose, fix, regression test, scan | Исследование bugs и errors |
| `/design` | Non-persistent | 7-фазный design workflow с DESIGN.md и tokens | Создание design systems, landing pages и UI redesign |
| `/scm` | Non-persistent | SCM workflow для Git (branch/merge/conflict/worktree/baseline) и Conventional Commit с автоопределением type/scope и splitting features | После code changes или при задачах repository configuration management |
| `/tools` | Non-persistent | Управление видимостью MCP tools (включение и отключение групп) | Контроль доступных MCP tools |
| `/stack-set` | Non-persistent | Автоопределение tech stack и генерация backend или mobile (Swift/Flutter/RN) references | Настройка language-specific coding conventions |
| `/architecture` | Non-persistent | Диагностика архитектуры, сравнение вариантов и decision records | Ревью границ или выбор архитектуры |
| `/convert` | Non-persistent | Направляет conversion документа в нужный skill | Конвертация HWP/HWPX или PDF |
| `/docs` | Non-persistent | Проверка документации и diff-targeted sync proposals | Сверка docs с текущей кодовой базой |
| `/explain` | Non-persistent | Генерирует и проверяет автономный HTML code-change explainer | Объяснение diff, PR, ветки или диапазона коммитов |
| `/recap` | Non-persistent | Суммирует работу по истории поддерживаемых AI tools | Daily или period retrospectives |
| `/schedule` | Non-persistent | Регистрирует recurring agent jobs | Nightly recap, scans или housekeeping |
| `/video` | Non-persistent | Создаёт воспроизводимое видео из script, narration и visuals | Shorts, explainers и demos |
| `/ralph` | Persistent | Повторяет ultrawork с независимым judge и loop safeguards | Явный запрос повторять выполнение до механически проверяемых критериев |

---

## Примеры автодетекции

oh-my-agent обнаруживает workflow keywords на 11 языках. Ниже примеры того, как естественный язык запускает workflow:

| Вы вводите | Обнаруженный workflow | Язык |
|----------|------------------|----------|
| "plan the authentication feature" | `/plan` | English |
| "do everything in parallel" | `/orchestrate` | English |
| "review the code for security" | `/review` | English |
| "brainstorm some ideas for the dashboard" | `/brainstorm` | English |
| "design a landing page for our product" | `/design` | English |
| "fix the login bug" | `/debug` | English |
| "계획 세워줘" | `/plan` | Korean |
| "버그 수정해줘" | `/debug` | Korean |
| "디자인 시스템 만들어줘" | `/design` | Korean |
| "자동으로 실행해" | `/orchestrate` | Korean |
| "コードレビューして" | `/review` | Japanese |
| "計画を立てて" | `/plan` | Japanese |
| "修复这个 bug" | `/debug` | Chinese |
| "设计一个着陆页" | `/design` | Chinese |
| "revisar código" | `/review` | Spanish |
| "diseña la página" | `/design` | Spanish |
| "debuggen" | `/debug` | German |
| "coordonner étape par étape" | `/work` | French |
| "don't stop until it's done" | `/ralph` | English |
| "끝까지 해" | `/ralph` | Korean |
| "最後までやって" | `/ralph` | Japanese |

**Информационные запросы фильтруются:**

| Вы вводите | Результат |
|----------|--------|
| "what is orchestrate?" | Workflow не запускается (informational pattern: "what is") |
| "explain how /plan works" | Workflow не запускается (informational pattern: "explain") |
| "어떻게 사용해?" | Workflow не запускается (informational pattern: "어떻게") |
| "レビューとは何ですか" | Workflow не запускается (informational pattern: "とは") |

---

## Все 33 навыка: краткий справочник

Preset installer `all` следует актуальному registry. Таблица группирует каждый текущий skill по основному назначению; на границах skill всё равно может координироваться с другим skill.

| Навык | Лучше всего подходит для | Основной результат |
|-------|---------|---------------|
| **oma-academic-writing** | Academic drafting, revision и anti-AI review | Publication-oriented prose и claim/evidence revisions |
| **oma-architecture** | System boundaries, tradeoffs, ADRs | Architecture recommendation или decision record |
| **oma-backend** | APIs, auth, server logic, migrations | Router/service/repository changes и verification |
| **oma-brainstorm** | Неоднозначные идеи и сравнение подходов | Design document в `docs/plans/designs/` |
| **oma-coordination** | Ручная координация нескольких агентов | Пошаговые task и handoff guidance |
| **oma-db** | Schema design, ERD, query tuning, capacity planning | Schema documentation, migrations и recovery plan |
| **oma-debug** | Bug reproduction и root cause analysis | Minimal fix, regression evidence и pattern scan |
| **oma-deepsec** | Agent-powered vulnerability scanning | Scan, triage, revalidation и gate reports |
| **oma-design** | Design systems, landing pages, tokens | `DESIGN.md`, tokens и component guidance |
| **oma-dev-workflow** | CI/CD, monorepos, migrations, release automation | Workflow configuration и release checks |
| **oma-docs** | Broken references и documentation drift | Verify report или diff-targeted sync candidates |
| **oma-explanation** | Diff, PR, branch или commit walkthroughs | Offline HTML explainer с Background, Intuition, Code и Quiz |
| **oma-frontend** | UI components, forms, pages, Angular или React styling | Frontend changes и relevant checks |
| **oma-hwp** | HWP/HWPX/HWPML conversion | Markdown с headings, tables, images и links |
| **oma-image** | Image generation и visual assets | Reproducible image run с manifest |
| **oma-market** | Pain points, trends, competitor и discovery research | LAW-compliant research brief с frameworks |
| **oma-mobile** | Flutter, React Native и Swift iOS работа | Mobile screens, state, platform integration и tests |
| **oma-observability** | Traces, metrics, logs, profiles, SLOs, incident forensics | Layered observability recommendation или implementation guidance |
| **oma-orchestration** | Automated parallel agent execution | Coordinated plans, memory updates и result collection |
| **oma-pdf** | PDF conversion и OCR-aware extraction | Markdown с reading order, tables, lists и images |
| **oma-pm** | Requirements, task breakdown, API contracts | `.agents/results/plan-{sessionId}.json` и task board |
| **oma-qa** | Security, performance, accessibility и quality review | Findings report с severity и remediation evidence |
| **oma-recap** | Cross-tool work retrospectives | Daily или period recap в `.agents/results/recap/` |
| **oma-refactor** | Behavior-preserving restructuring | Refactor changes с characterization и quality evidence |
| **oma-scholar** | Scholarly search и paper sidecars | Validated `.knows.yaml` sidecar operations |
| **oma-scm** | Git branching, worktrees, baselines и commit hygiene | SCM plan или Conventional Commit output |
| **oma-search** | Trust-scored docs, web, code и local search | Routed search results с trust labels |
| **oma-skill-creation** | Создание и аудит OMA skills | SSL-lite skill files и `oma skill audit` results |
| **oma-slide** | HTML presentation decks и exports | Validated bundled HTML, PDF, PNG или PPTX |
| **oma-tf-infra** | Terraform infrastructure, IAM и policy-as-code | Terraform modules, plans и controls |
| **oma-translation** | UI, documentation и marketing localization | Context-preserving translated content |
| **oma-video** | Shorts, explainers и demos | Reproducible video run с assets и manifest |
| **oma-voice** | Local TTS, STT и voiceovers | Audio или transcription artifacts с manifest |

---

## Настройка дашбордов

### Терминальный дашборд

```bash
oma dashboard terminal
```

Показывает обновляемую в реальном времени таблицу в терминале:
- ID сессии и общий статус (RUNNING / COMPLETED / FAILED)
- строки агентов: status, turn count, latest activity, elapsed time
- наблюдает за `.agents/state/memories/` для обновлений прогресса

### Веб-дашборд

```bash
oma dashboard web
# Opens http://localhost:9847
```

Возможности:
- обновления в реальном времени через WebSocket (без ручного refresh)
- auto-reconnect при потере соединения
- session status с цветными indicators (green=complete, yellow=running, red=failed)
- поток activity log из progress и result files
- исторические данные сессий

### Рекомендуемая раскладка

Используйте 3 терминала:
1. **Dashboard terminal:** `oma dashboard terminal` для непрерывного мониторинга
2. **Command terminal:** команды запуска агентов и workflow
3. **Build terminal:** test runs, build logs, git operations

---

## Ключевые понятия

### Progressive disclosure

Навыки загружаются в два слоя для экономии токенов. Слой 1 (`SKILL.md`, медиана около 2 631 токена в текущем дереве из 33 навыков) попадает в контекст, когда host маршрутизирует skill — injector передаёт путь, а не тело. Слой 2 (`resources/`) читается только по потребности задачи согласно уровням сложности. В сессии из 5 агентов Simple или Medium задача занимает примерно 18–19K токенов контекста навыков при потолке 73K, оставляя около 109K из 128K для работы; Complex занимает около 39K и оставляет примерно 89K. См. [математику экономии токенов](../core-concepts/skills.md#token-savings-math) и скрипт, который воспроизводит таблицу.

### Оптимизация токенов

Помимо progressive disclosure, oh-my-agent оптимизирует токены через:
- **Context budget management:** не читайте целые файлы; используйте `find_symbol` вместо `read_file`
- **Lazy resource loading:** загружайте error playbooks только при ошибках, а checklists — только на проверке
- **Difficulty-based branching:** Simple-задачи пропускают анализ и используют минимальные checklists
- **Progress tracking:** агенты записывают прочитанные файлы, чтобы не читать их снова

### Запуск через CLI

При вызове `oma agent spawn` CLI:
1. Разрешает vendor роли из явных options, agent overrides, model preset и настроенного fallback
2. Внедряет vendor-specific execution protocol из `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`
3. Собирает prompt агента из core rules SKILL.md, execution protocol и task-relevant resources
4. Запускает агента как независимый CLI process
5. Запуск записывает structured receipt в `.agents/state/agent-runs/` и внедряет claim path
6. Агент пишет structured claim; человекочитаемые progress и result Markdown-файлы являются дополнительными

### Хранилище памяти проекта

Агенты координируются через durable files в `.agents/state/memories/` (старые проекты используют legacy `.serena/memories/`). Orchestrator записывает run-scoped session и task-board files. Каждый запуск пишет `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` и `result-{agentId}-{taskId}-{runId}-{sessionId}.md`, когда включён Markdown progress или result output; structured receipts и claims в `.agents/state/agent-runs/` являются authoritative для CLI spawns. Агенты читают и записывают файлы нативными tools; mapping инструментов остаётся configurable в `.agents/mcp.json → memoryConfig.tools`.

### Рабочие пространства

<!-- oma-docs:ignore-start -->
Флаг `-w` в `agent spawn` изолирует агента в отдельном каталоге. Это критично для параллельного выполнения. Без workspace isolation два агента могут одновременно менять один файл, создавая конфликты. Стандартная раскладка: `./apps/api` (backend), `./apps/web` (frontend), `./apps/mobile` (mobile).
<!-- oma-docs:ignore-end -->

---

## Советы

1. **Будьте конкретны в prompt.** "Build a TODO app with JWT auth, React frontend, Express backend, PostgreSQL" даст лучший результат, чем "make an app."
2. **Используйте workspace для параллельных агентов.** Всегда передавайте `-w ./path`, чтобы предотвратить конфликты файлов.
3. **Зафиксируйте API contracts до запуска реализации.** Сначала выполните `/plan`, чтобы frontend и backend согласовали формы endpoint.
4. **Мониторьте активно.** Откройте dashboard terminal, чтобы быстро заметить сбои агентов.
5. **Итерируйте с re-spawn.** Если результат агента неверен, повторно запустите его с исходной задачей и контекстом исправления. Не начинайте с нуля.
6. **Согласуйте координацию с задачей.** Для одного домена начните с одного skill; используйте [руководство выбора](/docs/core-concepts/workflows#choosing-a-skill-or-workflow), когда нужна координация или явно запрошен quality process.
7. **Для неоднозначных идей используйте `/brainstorm` перед `/plan`.** Brainstorm уточняет intent и подход до декомпозиции PM agent.
8. **Запускайте `/deepinit` в новых codebases.** Он создаёт AGENTS.md и ARCHITECTURE.md, которые помогают агентам понять структуру проекта.
9. **Настройте `model_preset`.** Начните с `auto`, выберите фиксированный preset вроде `claude`, `antigravity`, `codex`, `qwen`, `cursor`, `kiro` или `mixed`, либо используйте `free` с локальным gateway. Добавьте overrides `agents:`. См. [Модели по агентам](./per-agent-models.md).
10. **Используйте `/ultrawork`, когда явно нужен полный процесс ревью.** 5-фазный workflow выполняет 12 изолированных review steps; одна загрузка skills не запускает эти проверки.

---

## Устранение неполадок

| Проблема | Причина | Исправление |
|---------|------|-----|
| Навыки не обнаруживаются в IDE | Отсутствует `.agents/skills/` или нет файлов `SKILL.md` | Запустите installer (`bunx oh-my-agent@latest`), проверьте symlinks в `.claude/skills/` и перезапустите IDE |
| CLI не найден при spawn | Выбранный AI CLI не установлен или отсутствует в `PATH` | Выполните `which <selected-cli>` (например, `claude`, `codex`, `agy`, `qwen` или `kiro`), откройте новый shell или установите его по руководству |
| Агенты создают конфликтующий код | Нет workspace isolation | Используйте отдельные workspaces: `-w ./apps/api`, `-w ./apps/web` |
| Dashboard показывает "No agents detected" | Агенты ещё не записали память | Подождите запуска агентов (первая запись на turn 1) или проверьте соответствие session ID |
| Web dashboard не запускается | Зависимости не установлены | Сначала выполните `bun install` в каталоге web/ |
| QA report содержит 50+ issues | Для первого review большой codebase это нормально | Сначала разберите CRITICAL и HIGH; MEDIUM/LOW задокументируйте для будущих sprint |
| Автодетекция запускает неправильный workflow | Неоднозначность keywords | Используйте явный `/command`, а не естественный язык. Сообщите о false trigger для улучшения |
| Persistent workflow не останавливается | Файл state всё ещё существует | Скажите в чате "workflow done" или вручную удалите state file из `.agents/state/` |
| Агент остановился на HIGH clarification | Требования слишком неоднозначны | Дайте запрошенные агентом ответы и запустите снова |
| MCP tools не работают | Serena не настроена или не запущена | Выполните `oma doctor` для проверки MCP config |
| Агент превышает execution budget | Задача слишком сложна для одного запуска | Разбейте задачу, используйте workflow с явными границами или повторите с более узким acceptance contract |
| Для агента выбран неправильный CLI | Не настроен `model_preset` или отсутствует agent override | Выполните `oma install` или задайте `model_preset` в `oma-config.yaml`. См. [Модели по агентам](./per-agent-models.md) |

Для паттернов задач одного домена см. [руководство одного навыка](./single-skill.md).
Для подробностей интеграции проекта см. [руководство интеграции](./integration.md).
