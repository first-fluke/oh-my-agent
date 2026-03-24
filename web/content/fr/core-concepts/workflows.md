---
title: Workflows
description: Référence complète des 14 workflows oh-my-agent — commandes slash, modes persistant vs non persistant, mots-clés de déclenchement en 11 langues, phases et étapes, fichiers lus et écrits, mécanique de détection automatique et gestion d'état du mode persistant.
---

# Workflows

Workflows are structured multi-step processes triggered by slash commands or natural language keywords. They define how agents collaborate on tasks — from single-phase utilities to complex 5-phase quality gates.

There are 14 workflows, 3 of which are persistent (they maintain state and cannot be accidentally interrupted).

---

## Persistent Workflows

Persistent workflows keep running until all tasks are done. They maintain state in `.agents/state/` and reinject `[OMA PERSISTENT MODE: ...]` context on each user message until explicitly deactivated.

### /orchestrate

**Description:** Automated CLI-based parallel agent execution. Spawns subagents via CLI, coordinates through MCP memory, monitors progress, and runs verification loops.

**Persistent:** Yes. State file: `.agents/state/orchestrate-state.json`.

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "orchestrate" |
| English | "parallel", "do everything", "run everything" |
| Korean | "자동 실행", "병렬 실행", "전부 실행", "전부 해" |
| Japanese | "オーケストレート", "並列実行", "自動実行" |
| Chinese | "编排", "并行执行", "自动执行" |
| Spanish | "orquestar", "paralelo", "ejecutar todo" |
| French | "orchestrer", "parallèle", "tout exécuter" |
| German | "orchestrieren", "parallel", "alles ausführen" |
| Portuguese | "orquestrar", "paralelo", "executar tudo" |
| Russian | "оркестровать", "параллельно", "выполнить всё" |
| Dutch | "orkestreren", "parallel", "alles uitvoeren" |
| Polish | "orkiestrować", "równolegle", "wykonaj wszystko" |

**Steps:**
1. **Step 0 — Preparation:** Read coordination skill, context-loading guide, memory protocol. Detect vendor.
2. **Step 1 — Load/Create Plan:** Check for `.agents/plan.json`. If missing, prompt user to run `/plan` first.
3. **Step 2 — Initialize Session:** Load `user-preferences.yaml`, display CLI mapping table, generate session ID (`session-YYYYMMDD-HHMMSS`), create `orchestrator-session.md` and `task-board.md` in memory.
4. **Step 3 — Spawn Agents:** For each priority tier (P0 first, then P1...), spawn agents using vendor-appropriate method (Agent tool for Claude Code, `oh-my-ag agent:spawn` for Gemini/Antigravity, model-mediated for Codex). Never exceed MAX_PARALLEL.
5. **Step 4 — Monitor:** Poll `progress-{agent}.md` files, update `task-board.md`. Watch for completions, failures, crashes.
6. **Step 5 — Verify:** Run `verify.sh {agent-type} {workspace}` per completed agent. On failure, re-spawn with error context (max 2 retries). After 2 retries, activate Exploration Loop: generate 2-3 hypotheses, spawn parallel experiments, score, keep best.
7. **Step 6 — Collect:** Read all `result-{agent}.md` files, compile summary.
8. **Step 7 — Final Report:** Present session summary. If Quality Score was measured, include Experiment Ledger summary and auto-generate lessons.

**Files read:** `.agents/plan.json`, `.agents/config/user-preferences.yaml`, `progress-{agent}.md`, `result-{agent}.md`.
**Files written:** `orchestrator-session.md`, `task-board.md` (memory), final report.

**When to use:** Large projects requiring maximum parallelism with automated coordination.

---

### /coordinate

**Description:** Step-by-step multi-domain coordination. PM plans first, then agents execute with user confirmation at each gate, followed by QA review and issue remediation.

**Persistent:** Yes. State file: `.agents/state/coordinate-state.json`.

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "coordinate", "step by step" |
| Korean | "코디네이트", "단계별" |
| Japanese | "コーディネート", "ステップバイステップ" |
| Chinese | "协调", "逐步" |
| Spanish | "coordinar", "paso a paso" |
| French | "coordonner", "étape par étape" |
| German | "koordinieren", "schritt für schritt" |

**Steps:**
1. **Step 0 — Preparation:** Read skills, context-loading, memory protocol. Record session start.
2. **Step 1 — Analyze Requirements:** Identify involved domains. If single domain, suggest direct agent use.
3. **Step 2 — PM Agent Planning:** PM decomposes requirements, defines API contracts, creates prioritized task breakdown, saves to `.agents/plan.json`.
4. **Step 3 — Review Plan:** Present plan to user. **Must get confirmation before proceeding.**
5. **Step 4 — Spawn Agents:** Spawn by priority tier, parallel within same tier, separate workspaces.
6. **Step 5 — Monitor:** Poll progress files, verify API contract alignment between agents.
7. **Step 6 — QA Review:** Spawn QA agent for security (OWASP), performance, accessibility, code quality.
8. **Step 6.1 — Quality Score** (conditional): Measure and record baseline.
9. **Step 7 — Iterate:** If CRITICAL/HIGH issues found, re-spawn responsible agents. If same issue persists after 2 attempts, activate Exploration Loop.

**When to use:** Features spanning multiple domains where you want step-by-step control and user approval at each gate.

---

### /ultrawork

**Description:** The quality-obsessed workflow. 5 phases, 17 total steps, 11 of which are review steps. Every phase has a gate that must pass before proceeding.

**Persistent:** Yes. State file: `.agents/state/ultrawork-state.json`.

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "ultrawork", "ulw" |

**Phases and steps:**

| Phase | Steps | Agent | Review Perspective |
|-------|-------|-------|-------------------|
| **PLAN** | 1-4 | PM Agent (inline) | Completeness, Meta-review, Over-engineering/Simplicity |
| **IMPL** | 5 | Dev Agents (spawned) | Implementation |
| **VERIFY** | 6-8 | QA Agent (spawned) | Alignment, Safety (OWASP), Regression Prevention |
| **REFINE** | 9-13 | Debug Agent (spawned) | File splitting, Reusability, Cascade Impact, Consistency, Dead Code |
| **SHIP** | 14-17 | QA Agent (spawned) | Code Quality (lint/coverage), UX Flow, Related Issues, Deployment Readiness |

**Gate definitions:**
- **PLAN_GATE:** Plan documented, assumptions listed, alternatives considered, over-engineering review done, user confirmation.
- **IMPL_GATE:** Build succeeds, tests pass, only planned files modified, baseline Quality Score recorded (if measured).
- **VERIFY_GATE:** Implementation matches requirements, zero CRITICAL, zero HIGH, no regressions, Quality Score >= 75 (if measured).
- **REFINE_GATE:** No large files/functions (> 500 lines / > 50 lines), integration opportunities captured, side effects verified, code cleaned, Quality Score non-regressed.
- **SHIP_GATE:** Quality checks pass, UX verified, related issues resolved, deployment checklist complete, final Quality Score >= 75 with non-negative delta, user final approval.

**Gate failure behavior:**
- First failure: return to the relevant step, fix, and retry.
- Second failure on the same issue: activate Exploration Loop (generate 2-3 hypotheses, experiment each, score, keep best).

**Conditional enhancements:** Quality Score measurement, Keep/Discard decisions, Experiment Ledger, Hypothesis Exploration, Auto-learning (lessons from discarded experiments).

**REFINE skip condition:** Simple tasks under 50 lines.

**When to use:** Maximum quality delivery. When code must be production-ready with comprehensive review.

---

## Non-Persistent Workflows

### /plan

**Description:** PM-driven task breakdown. Analyzes requirements, selects tech stack, decomposes into prioritized tasks with dependencies, defines API contracts.

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "task breakdown" |
| English | "plan" |
| Korean | "계획", "요구사항 분석", "스펙 분석" |
| Japanese | "計画", "要件分析", "タスク分解" |
| Chinese | "计划", "需求分析", "任务分解" |

**Steps:** Gather requirements -> Analyze technical feasibility (MCP code analysis) -> Define API contracts -> Decompose into tasks -> Review with user -> Save plan.

**Output:** `.agents/plan.json`, memory write, optionally `docs/exec-plans/active/` for complex plans.

**Execution:** Inline (no subagent spawning). Consumed by `/orchestrate` or `/coordinate`.

---

### /exec-plan

**Description:** Creates, manages, and tracks execution plans as first-class repository artifacts in `docs/exec-plans/`.

**Trigger keywords:** None (excluded from auto-detection, must be invoked explicitly).

**Steps:** Preparation -> Analyze scope (assess complexity: Simple/Medium/Complex) -> Create execution plan (markdown in `docs/exec-plans/active/`) -> Define API contracts (if cross-boundary) -> Review with user -> Execute (hand off to `/orchestrate` or `/coordinate`) -> Complete (move to `completed/`).

**Output:** `docs/exec-plans/active/{plan-name}.md` with task table, decision log, progress notes.

**When to use:** After `/plan` for complex features that need tracked execution with decision logging.

---

### /brainstorm

**Description:** Design-first ideation. Explores intent, clarifies constraints, proposes approaches, produces an approved design document before planning.

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "brainstorm" |
| English | "ideate", "explore design" |
| Korean | "브레인스토밍", "아이디어", "설계 탐색" |
| Japanese | "ブレインストーミング", "アイデア", "設計探索" |
| Chinese | "头脑风暴", "创意", "设计探索" |

**Steps:** Explore project context (MCP analysis) -> Ask clarifying questions (one at a time) -> Propose 2-3 approaches with trade-offs -> Present design section by section (with user approval each step) -> Save design document to `docs/plans/` -> Transition: suggest `/plan`.

**Rules:** No implementation or planning before design approval. No code output. YAGNI.

---

### /deepinit

**Description:** Full project initialization. Analyzes an existing codebase, generates AGENTS.md, ARCHITECTURE.md, and a structured `docs/` knowledge base.

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "deepinit" |
| Korean | "프로젝트 초기화" |
| Japanese | "プロジェクト初期化" |
| Chinese | "项目初始化" |

**Steps:** Preparation -> Analyze codebase (project type, architecture, implicit rules, domains, boundaries) -> Generate ARCHITECTURE.md (domain map, under 200 lines) -> Generate `docs/` knowledge base (design-docs/, exec-plans/, generated/, product-specs/, references/, domain docs) -> Generate root AGENTS.md (~100 lines, table of contents) -> Generate boundary AGENTS.md files (monorepo packages, under 50 lines each) -> Update existing harness (if re-running) -> Validate (no dead links, line limits).

**Output:** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/exec-plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md, and domain-specific docs as discovered.

---

### /review

**Description:** Full QA review pipeline. Security audit (OWASP Top 10), performance analysis, accessibility check (WCAG 2.1 AA), and code quality review.

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "code review", "security audit", "security review" |
| English | "review" |
| Korean | "리뷰", "코드 검토", "보안 검토" |
| Japanese | "レビュー", "コードレビュー", "セキュリティ監査" |
| Chinese | "审查", "代码审查", "安全审计" |

**Steps:** Identify review scope -> Automated security checks (npm audit, bandit) -> Manual security review (OWASP Top 10) -> Performance analysis -> Accessibility review (WCAG 2.1 AA) -> Code quality review -> Generate QA report.

**Optional fix-verify loop** (with `--fix`): After QA report, spawn domain agents to fix CRITICAL/HIGH issues, re-run QA, repeat up to 3 times.

**Delegation:** For large scopes, delegates Steps 2-7 to a spawned QA agent subagent.

---

### /debug

**Description:** Structured bug diagnosis and fixing with regression test writing and similar pattern scanning.

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "debug" |
| English | "fix bug", "fix error", "fix crash" |
| Korean | "디버그", "버그 수정", "에러 수정", "버그 찾아", "버그 고쳐" |
| Japanese | "デバッグ", "バグ修正", "エラー修正" |
| Chinese | "调试", "修复 bug", "修复错误" |

**Steps:** Collect error info -> Reproduce (MCP `search_for_pattern`, `find_symbol`) -> Diagnose root cause (MCP `find_referencing_symbols` to trace execution path) -> Propose minimal fix (user confirmation required) -> Apply fix + write regression test -> Scan for similar patterns (may spawn debug-investigator subagent if scope > 10 files) -> Document bug in memory.

**Subagent spawn criteria:** Error spans multiple domains, scan scope > 10 files, or deep dependency tracing needed.

---

### /design

**Description:** 7-phase design workflow producing DESIGN.md with tokens, component patterns, and accessibility rules.

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "design system", "DESIGN.md", "design token" |
| English | "design", "landing page", "ui design", "color palette", "typography", "dark theme", "responsive design", "glassmorphism" |
| Korean | "디자인", "랜딩페이지", "디자인 시스템", "UI 디자인" |
| Japanese | "デザイン", "ランディングページ", "デザインシステム" |
| Chinese | "设计", "着陆页", "设计系统" |

**Phases:** SETUP (context gathering, `.design-context.md`) -> EXTRACT (optional, from reference URLs/Stitch) -> ENHANCE (vague prompt augmentation) -> PROPOSE (2-3 design directions with color, typography, layout, motion, components) -> GENERATE (DESIGN.md + CSS/Tailwind/shadcn tokens) -> AUDIT (responsive, WCAG 2.2, Nielsen heuristics, AI slop check) -> HANDOFF (save, inform user).

**Mandatory:** All output responsive-first (mobile 320-639px, tablet 768px+, desktop 1024px+).

---

### /commit

**Description:** Generates Conventional Commits with automatic feature-based splitting.

**Trigger keywords:** None (excluded from auto-detection).

**Steps:** Analyze changes (git status, git diff) -> Separate features (if > 5 files spanning different scope/type) -> Determine type (feat/fix/refactor/docs/test/chore/style/perf) -> Determine scope (changed module) -> Write description (imperative, < 72 chars) -> Execute commit immediately (no confirmation prompt).

**Rules:** Never `git add -A`. Never commit secrets. HEREDOC for multi-line messages. Co-Author: `First Fluke <our.first.fluke@gmail.com>`.

---

### /setup

**Description:** Interactive project configuration.

**Trigger keywords:** None (excluded from auto-detection).

**Steps:** Language settings -> CLI installation status check -> MCP connection status (Serena in Command or SSE mode) -> Agent-CLI mapping -> Summary -> Ask about starring repository.

**Output:** `.agents/config/user-preferences.yaml`.

---

### /tools

**Description:** Manage MCP tool visibility and restrictions.

**Trigger keywords:** None (excluded from auto-detection).

**Features:** Show current MCP tool status, enable/disable tool groups (memory, code-analysis, code-edit, file-ops), permanent or temporary (`--temp`) changes, natural language parsing ("memory tools only", "disable code edit").

**Tool groups:**
- memory: read_memory, write_memory, edit_memory, list_memories, delete_memory
- code-analysis: get_symbols_overview, find_symbol, find_referencing_symbols, search_for_pattern
- code-edit: replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
- file-ops: list_dir, find_file

---

### /stack-set

**Description:** Auto-detect project tech stack and generate language-specific references for the backend skill.

**Trigger keywords:** None (excluded from auto-detection).

**Steps:** Detect (scan manifests: pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj) -> Confirm (display detected stack, get user confirmation) -> Generate (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` with 8 mandatory patterns, `stack/api-template.*`) -> Verify.

**Output:** Files in `.agents/skills/oma-backend/stack/`. Does not modify SKILL.md or `resources/`.

---

## Skills vs. Workflows

| Aspect | Skills | Workflows |
|--------|--------|-----------|
| **What they are** | Agent expertise (what an agent knows) | Orchestrated processes (how agents work together) |
| **Location** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **Activation** | Automatic via skill routing keywords | Slash commands or trigger keywords |
| **Scope** | Single-domain execution | Multi-step, often multi-agent |
| **Examples** | "Build a React component" | "Plan the feature -> build -> review -> commit" |

---

## Auto-Detection: How It Works

### The Hook System

oh-my-agent uses a `UserPromptSubmit` hook that runs before each user message is processed. The hook system consists of:

1. **`triggers.json`** (`.claude/hooks/triggers.json`): Defines keyword-to-workflow mappings for all 11 supported languages (English, Korean, Japanese, Chinese, Spanish, French, German, Portuguese, Russian, Dutch, Polish).

2. **`keyword-detector.ts`** (`.claude/hooks/keyword-detector.ts`): TypeScript logic that scans the user's input against the trigger keywords, respects language-specific matching, and injects workflow activation context.

3. **`persistent-mode.ts`** (`.claude/hooks/persistent-mode.ts`): Enforces persistent workflow execution by checking for active state files and reinjecting workflow context.

### Detection Flow

1. User types natural language input
2. Hook checks if explicit `/command` is present (if so, skip detection to avoid duplication)
3. Hook scans input against `triggers.json` keyword lists
4. If a match is found, check if the input matches informational patterns
5. If informational (e.g., "what is orchestrate?"), filter it out — no workflow triggers
6. If actionable, inject `[OMA WORKFLOW: {workflow-name}]` into the context
7. The agent reads the injected tag and loads the corresponding workflow file from `.agents/workflows/`

### Informational Pattern Filtering

The `informationalPatterns` section of `triggers.json` defines phrases that indicate questions rather than commands. These are checked before workflow activation:

| Language | Informational Patterns |
|----------|----------------------|
| English | "what is", "what are", "how to", "how does", "explain", "describe", "tell me about" |
| Korean | "뭐야", "무엇", "어떻게", "설명해", "알려줘" |
| Japanese | "とは", "って何", "どうやって", "説明して" |
| Chinese | "是什么", "什么是", "怎么", "解释" |

If the input matches both a workflow keyword and an informational pattern, the informational pattern takes priority and no workflow is triggered.

### Excluded Workflows

The following workflows are excluded from auto-detection and must be invoked with explicit `/command`:
- `/commit`
- `/setup`
- `/tools`
- `/stack-set`
- `/exec-plan`

---

## Persistent Mode Mechanics

### State Files

Persistent workflows (orchestrate, ultrawork, coordinate) create state files in `.agents/state/`:

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
└── coordinate-state.json
```

These files contain: workflow name, current phase/step, session ID, timestamp, and any pending state.

### Reinforcement

While a persistent workflow is active, the `persistent-mode.ts` hook injects `[OMA PERSISTENT MODE: {workflow-name}]` into every user message. This ensures the workflow continues executing even across conversation turns.

### Deactivation

To deactivate a persistent workflow, the user says "workflow done" (or equivalent in their configured language). This:
1. Deletes the state file from `.agents/state/`
2. Stops injecting the persistent mode context
3. Returns to normal operation

The workflow can also end naturally when all steps are completed and the final gate passes.

---

## Typical Workflow Sequences

### Quick Feature
```
/plan → review output → /exec-plan
```

### Complex Multi-Domain Project
```
/coordinate → PM plans → user confirms → agents spawn → QA reviews → fix issues → ship
```

### Maximum Quality Delivery
```
/ultrawork → PLAN (4 review steps) → IMPL → VERIFY (3 review steps) → REFINE (5 review steps) → SHIP (4 review steps)
```

### Bug Investigation
```
/debug → reproduce → root cause → minimal fix → regression test → similar pattern scan
```

### Design-to-Implementation Pipeline
```
/brainstorm → design document → /plan → task breakdown → /orchestrate → parallel implementation → /review → /commit
```

### New Codebase Setup
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/ → /setup → CLI and MCP configuration
```
