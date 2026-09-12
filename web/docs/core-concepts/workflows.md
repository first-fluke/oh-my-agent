---
title: Workflows
description: Complete reference for all 21 oh-my-agent workflows, covering slash commands, persistent vs non-persistent modes, trigger keywords in 11 languages, phases and steps, files read and written, auto-detection mechanics via triggers.json and keyword-detector.ts, informational pattern filtering, and persistent mode state management.
---

# Workflows

Workflows are structured multi-step processes triggered by slash commands or natural language keywords. They define how agents collaborate on tasks, from single-phase utilities to complex 5-phase quality gates.

There are 21 workflows, 4 of which are persistent (they maintain state and cannot be accidentally interrupted).

---

## Choosing a skill or workflow {#choosing-a-skill-or-workflow}

Choose by the coordination and verification the task needs. If you have already selected a workflow, follow it; continue an active workflow unless you explicitly cancel or change it. For a new task without a selected workflow, use this guide:

| Task needs | Choose | Example |
|---|---|---|
| One domain with no agent coordination | [Single skill](/docs/guide/single-skill) | Add an API endpoint and test its validation |
| Multiple domains with step-by-step planning, implementation, and QA | `/work` | Coordinate an API change with its web and mobile clients |
| Automated delegation of independent tasks in parallel | `/orchestrate` | Implement backend and frontend tasks in parallel after resolving dependencies |
| An explicitly requested comprehensive quality process | `/ultrawork` | Run the full planning, implementation, verification, refinement, and release-readiness reviews |
| An explicit request to repeat execution until mechanically verifiable criteria pass | `/ralph` | Repeat implementation and independent verification until the specified regression checks pass, within the loop safeguards |

`/orchestrate` loads a usable plan or creates one through `/plan` before spawning agents. You do not need to run `/plan` first. An existing plan is therefore not the distinction between `/work` and `/orchestrate`; choose based on how you want the work coordinated. Both can run independent tasks in parallel.

Acceptance criteria and tests belong in single-skill tasks too. Their presence alone does not call for `/ralph`: each Ralph iteration runs the full ultrawork process and an independent judge, so choose it when you want that repeated verification loop. It can stop with incomplete or blocked work when safeguards apply.

This table is selection advice, not an automatic workflow router. The host agent can recommend a suitable approach; recommending or explaining a workflow does not start it. A slash command explicitly selects one. Where the keyword-detection hook is enabled, matching configured keywords or patterns can also activate one, subject to its informational-query filters. The detector does not classify domain count, inspect plan readiness, or apply the table as a priority algorithm.

Plan review reuses authorization already given for the task. Agents ask only for a material missing decision or an action outside that scope. A release-readiness review does not itself authorize publishing or deployment.

---

## Persistent workflows

Persistent workflows keep running until all tasks are done. They maintain state in `.agents/state/` and reinject `[OMA PERSISTENT MODE: ...]` context on each user message until explicitly deactivated.

### /orchestrate

**Description:** Automated CLI-based parallel agent execution. Spawns subagents via CLI, coordinates through durable run state and receipts, monitors progress, and runs verification loops.

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

**Trigger regex patterns** (intent + noun whitelist, see [Auto-Detection: Pattern Field](#pattern-field-raw-regex)):
| Section | Pattern | Examples that trigger |
|---------|---------|----------------------|
| `*` (universal) | `(build\|create\|make\|develop\|implement\|scaffold) + (a\|an\|the) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication", "Create an awesome web service", "Develop a backend with PostgreSQL" |
| `*` (universal) | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘", "REST API 구현해", "백엔드를 개발해주세요" |

Noun whitelist (15): app, api, service, server, cli, tool, website, dashboard, system, feature, backend, frontend, prototype, mvp, bot.

**Steps:**
1. **Step 0, Preparation:** Read coordination skill, context-loading guide, memory protocol. Detect vendor.
2. **Step 1, Load/Create Plan:** Check for `.agents/results/plan-{sessionId}.json`, then the most recent `plan-*.json`. If none is found — or the plan is not execution-ready (a task missing its agent, priority tier, dependencies, or acceptance criteria) — delegate to `/plan` inline to create one, keeping the same session ID. Present the plan and reuse existing authorization; ask only for a material missing decision or new authorization before delegation.
3. **Step 2, Initialize Session:** Load `oma-config.yaml`, display the CLI mapping table, reuse the session ID from plan creation or generate one (`session-YYYYMMDD-HHMMSS`), and create `orchestrator-session-{sessionId}.md` and `task-board-{sessionId}.md` in the configured memory store.
4. **Step 3, Spawn Agents:** For each priority tier (P0 first, then P1...), spawn agents using the vendor-appropriate method (native subagents when the current runtime and target vendor match; `oma agent spawn` for external or cross-vendor work). Never exceed MAX_PARALLEL.
5. **Step 4, Monitor:** Poll run-scoped `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` files and structured receipts, then update the task board. Watch for completions, failures, and crashes.
6. **Step 5, Verify:** Run `verify.sh {agent-type} {workspace}` per completed agent. On failure, re-spawn with error context (max 2 retries). Repeated failures may justify alternative hypotheses, but all attempts consume the same aggregate recovery budget. Preserve unresolved evidence if the budget cannot cover a comparison round.
7. **Step 6, Collect:** Read run-scoped result files and structured claims, then compile the summary.
8. **Step 7, Final Report:** Present session summary. If experiments were run, summarize evidence and decisions; capture lessons only when a reusable cause is established.

**Files read:** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, run-scoped progress/result files, and structured run receipts.
**Files written:** run-scoped session/task-board state in the configured memory store, structured receipts and claims, and the final report.

**When to use:** Large projects requiring maximum parallelism with automated coordination.

---

### /work

**Description:** Step-by-step multi-domain coordination. PM plans first, then agents execute within the authorized scope, followed by QA review and issue remediation.

**Persistent:** Yes. State file: `.agents/state/work-state.json`.

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "work", "step by step" |
| Korean | "코디네이트", "단계별" |
| Japanese | "コーディネート", "ステップバイステップ" |
| Chinese | "协调", "逐步" |
| Spanish | "coordinar", "paso a paso" |
| French | "coordonner", "étape par étape" |
| German | "koordinieren", "schritt für schritt" |

**Steps:**
1. **Step 0, Preparation:** Read skills, context-loading, memory protocol. Record session start.
2. **Step 1, Analyze Requirements:** Identify involved domains. If single domain, suggest direct agent use.
3. **Step 2, PM Agent Planning:** PM decomposes requirements, defines API contracts, creates prioritized task breakdown, saves to `.agents/results/plan-{sessionId}.json`.
4. **Step 3, Review Plan:** Present the plan and proceed within existing authorization. Ask only for a material missing decision or new authorization.
5. **Step 4, Spawn Agents:** Spawn by priority tier, parallel within same tier, separate workspaces.
6. **Step 5, Monitor:** Poll progress files, verify API contract alignment between agents.
7. **Step 6, QA Review:** Spawn QA agent for security (OWASP), performance, accessibility, code quality.
8. **Step 6.1, Measurements** (conditional): Record a baseline when a defined comparison is needed.
9. **Step 7, Iterate:** If CRITICAL/HIGH issues found, re-spawn responsible agents. If same issue persists after 2 attempts, activate Exploration Loop.

**When to use:** Features spanning multiple domains where you want step-by-step coordination of planning, implementation, and QA.

---

### /ultrawork

**Description:** The quality-focused workflow. It has 5 phases, 17 total steps, and 12 isolated review steps. Every phase has a gate that must pass before proceeding.

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
| **REFINE** | 9-13 | Refactor Agent (spawned) | File splitting, Reusability, Cascade Impact, Consistency, Dead Code |
| **SHIP** | 14-17 | QA Agent (spawned) | Code Quality (lint/coverage), UX Flow, Related Issues, Deployment Readiness |

**Gate definitions:**
- **PLAN_GATE:** Plan documented, assumptions listed, alternatives considered, over-engineering review done, scope authorized.
- **IMPL_GATE:** Applicable non-emitting checks and tests pass, only planned files modified, baseline evidence recorded for actual experiments. Build checks run only when explicitly requested.
- **VERIFY_GATE:** Implementation matches requirements, zero CRITICAL, zero HIGH, no regressions, applicable project measurement targets met.
- **REFINE_GATE:** Project maintainability rules followed, integration opportunities captured, side effects verified, code cleaned, no unresolved regression.
- **SHIP_GATE:** Quality checks pass, UX verified, related issues resolved, deployment checklist complete, applicable project measurement targets met with current evidence. Reuse existing authorization; publishing or deployment requires authorization for that action.

**Gate failure behavior:**
- First failure: return to the relevant step, fix, and retry.
- Second failure on the same issue: reassess the cause; if alternatives merit testing within the remaining budget, compare isolated experiments against required behavior and defined metrics.

**Conditional enhancements:** Defined metric comparisons, experiment decisions and evidence, budgeted hypothesis exploration, and lessons supported by reusable causes.

**REFINE skip condition:** Simple tasks under 50 lines.

**When to use:** A full review process before you decide whether the result is ready for release. The workflow records checks and findings; it does not make a production-readiness decision for you.

---

### /ralph

**Description:** Persistent self-referential execution loop. Wraps ultrawork with an independent verifier that checks completion criteria after each iteration. Reports full completion when all criteria pass, partial completion when only passed and blocked criteria remain, or stops when safeguards trigger.

**Persistent:** Yes. State file: `.agents/state/ralph-state.json`.

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "ralph" |
| English | "don't stop", "until done", "keep going", "finish everything", "run to completion" |
| Korean | "랄프", "멈추지마", "끝까지", "완료될때까지", "끝장내" |
| Japanese | "止まるな", "完了まで", "最後まで", "全部終わらせて" |
| Chinese | "不要停", "直到完成", "全部完成", "做完为止" |
| Spanish | "no pares", "hasta completar", "termina todo" |
| French | "n'arrête pas", "jusqu'à complétion", "termine tout" |
| German | "hör nicht auf", "bis zur fertigstellung", "alles fertigstellen" |

**Phases:**
1. **Phase 0, INIT:** Load prerequisites (context-loading, memory protocol, judge protocol). Define and record mechanically verifiable completion criteria, such as test assertions, non-emitting type checks, exit codes, or file existence. Include build checks only when explicitly requested. Show the criteria and continue within the authorized scope. Initialize session with `max_iterations: 5`.
2. **Phase 1, WORK:** Execute ultrawork (PLAN → IMPL → VERIFY → REFINE → SHIP) as a single iteration.
3. **Phase 2, JUDGE:** Independent verifier checks each completion criterion against actual project state (run authorized checks and verify file existence). Record evidence and criterion status, including PASS, FAIL, REGRESSED, or BLOCKED.
4. **Phase 3, DECIDE:** If all criteria PASS → report full completion. If only PASS and BLOCKED remain → report partial completion. If any FAIL or REGRESSED → feed failure context back into the next iteration, subject to safeguards.
5. **Safeguards:** Loop stops if `current_iteration >= max_iterations` (default 5), or if the same criterion fails 3 consecutive times with the same root cause (stuck detection).

**Key difference from /ultrawork:** Ultrawork runs a 5-phase process with retries when a phase gate fails. Ralph wraps ultrawork in a retry loop with an independent judge that objectively verifies completion. The loop ends with a full completion report, a partial completion report for blocked work, or a safeguard report.

**Files read:** `.agents/workflows/ralph/resources/judge-protocol.md`, all ultrawork files.
**Files written:** `session-ralph.md` (memory), iteration logs, final report.

**When to use:** When you explicitly want repeated execution and independent verification against mechanical completion criteria. Tests alone do not require Ralph; account for the full ultrawork process in each iteration and its safeguards.

---

## Non-persistent workflows

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

**Steps:** Gather requirements -> Analyze technical feasibility (MCP code analysis) -> Assess complexity (Simple/Medium/Complex) -> Define API contracts (if cross-boundary) -> Decompose into tasks -> Review with user -> Save plan artifacts (machine-readable JSON + human-readable markdown tracker for Medium/Complex).

**Output:** `.agents/results/plan-{sessionId}.json`, memory write, and (Medium/Complex) `docs/plans/work/{NNN}-{name}.md` with task table, decision log, progress notes. Lifecycle is tracked via the `Status` field in the markdown header (`Active` -> `Completed`); plans are not moved between folders. Designs created via `/brainstorm` go to `docs/plans/designs/{NNN}-{name}.md`.

**Execution:** Inline (no subagent spawning). Consumed by `/orchestrate` or `/work`, which update task/status fields during execution.

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

**Steps:** Explore project context (MCP analysis) -> Ask clarifying questions (one at a time) -> Propose 2-3 approaches with trade-offs -> Present design section by section (with user approval each step) -> Save design document to `docs/plans/designs/{NNN}-{name}.md` -> Transition: suggest `/plan`.

**Rules:** No implementation or planning before design approval. No code output. YAGNI.

---

### /architecture

**Description:** Software architecture workflow that diagnoses architecture problems, selects the right analysis method (diagnostic routing / design-twice / ATAM / CBAM / ADR), compares options, synthesizes stakeholder input, and produces a recommendation, review, or ADR.

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "architecture", "ADR", "ATAM", "CBAM" |
| English | "architecture review", "architectural tradeoff" |
| Korean | "아키텍처", "설계 검토" |
| Japanese | "アーキテクチャ" |
| Chinese | "架构" |

**Steps:** Frame the decision (new architecture / review / tradeoff analysis / investment prioritization / ADR authoring) -> Select methodology via diagnostic routing -> Analyze current architecture via MCP code analysis (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`) -> Synthesize stakeholder input (only when cross-cutting enough to justify the cost) -> Produce recommendation with explicit assumptions, tradeoffs, risks, validation steps -> Hand off to `/plan` when implementation is required.

**Rules:** Do NOT write implementation code or task plans in this workflow. Hand off to `/plan` after the architecture decision. Use MCP tools throughout; do not substitute with raw file reads or grep.

**When to use:** System architecture choices, module/service/ownership boundary decisions, refactor prioritization, ADR authoring, investigating architectural pain (change amplification, hidden dependencies, awkward APIs).

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

**Steps:** Preparation -> Analyze codebase (project type, architecture, implicit rules, domains, boundaries) -> Generate ARCHITECTURE.md (domain map, under 200 lines) -> Generate `docs/` knowledge base (design-docs/, plans/, generated/, product-specs/, references/, domain docs) -> Generate root AGENTS.md (~100 lines, table of contents) -> Generate boundary AGENTS.md files (monorepo packages, under 50 lines each) -> Update existing harness (if re-running) -> Validate (no dead links, line limits).

**Output:** AGENTS.md, ARCHITECTURE.md, docs/design-docs/, docs/plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md, and domain-specific docs as discovered.

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

### /deepsec

**Description:** Drive the `oma-deepsec` skill end-to-end. Installs `.deepsec/`, calibrates cost, runs scan/process/triage/revalidate/export passes, gates PRs with `process --diff`, authors custom matchers, and routes findings to specialist agents. Executes inline (no subagent spawning).

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "/deepsec", "deepsec workflow" |
| English | "run deepsec", "deepsec scan this repo", "scan repo with deepsec", "deepsec pr review", "deepsec ci gate", "deepsec triage", "deepsec matchers" |
| Korean | "딥섹 워크플로우", "딥섹 실행", "딥섹 스캔", "딥섹으로 검사", "딥섹 PR 리뷰", "딥섹 CI 게이트" |
| Japanese | "ディープセック実行", "deepsecワークフロー", "deepsecでスキャン", "deepsec PRレビュー" |
| Chinese | "运行 deepsec", "deepsec 工作流", "用 deepsec 扫描", "deepsec PR 审查" |

**Steps:**
1. **Step 1, Load the skill:** Read `.agents/skills/oma-deepsec/SKILL.md`, then load only the resource files matching the resolved intent (`setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`). If `.deepsec/` already exists at the repo root, treat the run as incremental and never re-`init`.
2. **Step 2, Classify intent:** Resolve into exactly one of `setup`, `scan`, `pr-review`, `matchers`, `triage`, `config`, `troubleshoot`. Multi-intent prompts execute sequentially. Insert `setup` ahead of any AI-call intent if `.deepsec/` is missing.
3. **Step 3, Confirm agent choice:** Before any paid call, confirm `claude` (strongest reasoning, most expensive) vs `codex` (read-only sandbox, cheaper). Skip if the user named one, `deepsec.config.ts` pins `defaultAgent`, or the user delegated the choice.
4. **Step 4, Execute the resolved intent:**
   - **4A `setup`:** `bunx deepsec init`, `bun install`, edit `.env.local`, verify with `scan --limit 20` + `process --limit 5`, then author `data/<id>/INFO.md` (50-100 lines, project-specific). **Requires user confirmation on `INFO.md`.**
   - **4B `scan`:** Scan -> calibrate with `--limit 50 --concurrency 5` -> report cost extrapolation (explicit user go-ahead required) -> full `process` -> `triage --severity HIGH` + `revalidate --min-severity HIGH` -> `export --format md-dir` + `metrics`.
   - **4C `pr-review`:** Direct-mode `process --diff origin/${BASE_REF} --comment-out comment.md`. Emit the two-job CI pattern (`analyze` without `pull-requests: write`, `comment` consumes only the sanitized artifact). Exit `1` = at least one net-new finding.
   - **4D `matchers`:** Walk `data/<id>/files/` for entry-point gaps, write per-slug matchers to `.deepsec/matchers/<slug>.ts` at the right noise tier (`precise` / `normal` / `noisy`), wire via `.deepsec/deepsec.config.ts`, verify with `scan --matchers`.
   - **4E `triage`:** `triage --severity HIGH` -> `revalidate --min-severity HIGH` -> filter export to `true-positive` / `uncertain` only. Note recurring FP shapes for the next `INFO.md` revision.
   - **4F `config` / `troubleshoot`:** Apply the symptom table in `resources/config.md`.
5. **Step 5, Summarize and route:** Produce a run summary (project id, pass type, agent/model, files scanned, findings, TP after revalidate, cost, wall time, stop conditions). Route follow-ups by **layer of the vulnerable file** (backend -> `oma-backend`, frontend -> `oma-frontend`, mobile -> `oma-mobile`, IaC -> `oma-tf-infra`, DB -> `oma-db`, CI -> `oma-dev-workflow`, docs drift -> `oma-docs`, entry-point gap -> re-enter Step 4D). Ambiguous layer or `revalidation.verdict === "uncertain"` -> `oma-debug` first as a triage hop.
6. **Step 6, Stop conditions:** End on completed intent + Step 5 summary, blocking precondition (missing credential, refused `INFO.md`), or quota stop surfaced with safe-resume command.

**Files read:** `.agents/skills/oma-deepsec/SKILL.md`, `.agents/skills/oma-deepsec/resources/*.md` (intent-scoped), `data/<id>/INFO.md`, `data/<id>/files/`, `deepsec.config.ts`.
**Files written:** `.deepsec/` (on `setup`), `.env.local` (gitignored), `data/<id>/INFO.md`, `.deepsec/matchers/<slug>.ts`, `findings/` (on `export`), `comment.md` (on `pr-review`).

**Rules:** Do NOT modify product source code in this workflow (hand off to specialists). Do NOT echo or commit credentials (`vck_…`, `sk-ant-…`, OIDC tokens). Do NOT grant `pull-requests: write` to any CI job that runs PR-controlled code. Resume, do not reset: on interruption re-run the same command; never `rm -rf data/<id>/` without explicit user instruction.

**When to use:** Agent-powered vulnerability scanning of a repo, CI/PR security gating via `process --diff`, authoring project-specific matchers for entry-point coverage, triaging existing findings to cut FPs.

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

### /scm

**Description:** Generates Conventional Commits with automatic feature-based splitting.

**Trigger keywords:** None (excluded from auto-detection).

**Steps:** Analyze changes (git status, git diff) -> Separate features (if > 5 files spanning different scope/type) -> Determine type (feat/fix/refactor/docs/test/chore/style/perf) -> Determine scope (changed module) -> Write description (imperative, < 72 chars) -> Execute commit immediately (no confirmation prompt).

**Rules:** Never `git add -A`. Never commit secrets. Use a HEREDOC for multi-line messages. Add a co-author trailer only when effective `scm.co_author` configuration enables it and supplies both values.

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

### /convert

**Description:** Convert a file from one format to another, routed by media category. **Documents** (PDF via `opendataloader-pdf`/`oma-pdf`; HWP/HWPX/HWPML via `kordoc`/`oma-hwp`) extract to Markdown. **Image**, **video**, and **audio** files transcode to a target format via `ffmpeg` (already provisioned for `oma-video`).

**Trigger keywords:** None (invoked explicitly with an input file path).

**Steps:** Validate input & route by category (document `.pdf`/`.hwp*`; image `.jpg`/`.png`/`.webp`/…; video `.mp4`/`.mov`/…; audio `.mp3`/`.wav`/…) -> Resolve target format (document default = Markdown; media = explicit `--to`) -> Convert (PDF: `uvx opendataloader-pdf`, scanned PDFs use hybrid OCR; HWP: `bunx kordoc@latest`; media: `ffmpeg`) -> Normalize documents (PDF: `uvx mdformat`; HWP: `flatten-tables.ts`) -> Verify (read Markdown / `ffprobe` media) -> Report source→target format and any quality/codec choices.

**Rules:** Route by category — never run a document converter on a media file or vice versa. Default output location is the same directory as the input file. Report quality/codec choices for media (transcode is not lossless). Never skip steps. Response language follows `.agents/oma-config.yaml`.

**When to use:** Converting PDF or Korean HWP-family documents to Markdown for LLM/RAG ingestion, or transcoding images (jpg→webp/png), video (mov→mp4, mp4→gif), and audio (wav→mp3) between formats.

---

### /docs

**Description:** Documentation drift detection and sync via `oma-docs`. Verify mode finds broken refs across all repo markdown (default glob `**/*.md`); sync mode proposes per-doc patches for docs affected by a git diff. Executes inline (no subagent spawning); all vendors invoke `oma docs` directly.

**Trigger keywords:** Universal: "oma-docs", "docs verify", "docs sync". English: "verify docs", "check docs", "docs drift", "broken doc links", "stale docs", "sync docs", "patch docs". Korean: "문서 검증", "문서 드리프트", "문서 동기화". Japanese: "ドキュメント検証", "ドキュメント同期". Chinese: "文档校验", "文档同步".

**Steps:** Detect mode (`verify` default; `sync` when the prompt mentions sync or supplies a git diff range) -> Preflight (`command -v oma`; for sync confirm a usable diff, fall back to `HEAD~1..HEAD`) -> Verify: `oma docs verify --json` (exit `0` clean, `1` broken refs) or Sync: `oma docs sync --json` against the range -> Synthesize findings under the host-LLM contract (verify: group by CRITICAL/HIGH/MEDIUM/LOW with concrete fixes; sync: draft minimal unified-diff patches) -> Present each sync patch interactively (`[y] apply [n] skip [d] show diff [s] show full proposal`; never auto-apply) -> On apply, regenerate the index via `oma docs verify --json` -> Report mode, counts by kind, and pointers to `docs/generated/doc-refs.json` / `url-drift.json`.

**Rules:** Never auto-apply sync patches (per-doc `[y]` confirmation required). Never modify `.agents/` (SSOT). If `oma docs` is missing, print an install hint and exit — do not fall back to manual greps.

**Files read:** target markdown (`**/*.md` or requested glob), `git diff` for sync `changedFiles`.
**Files written:** `docs/generated/doc-refs.json` (always regenerated by verify), `docs/generated/url-drift.json` (when URL check runs), approved doc patches (on sync `[y]`).

**When to use:** Checking whether docs still match the codebase (broken file paths, CLI commands, config keys, env vars), or proposing doc patches after a code change.

---

### /recap

**Description:** Daily or period work recap via `oma-recap`. Resolves a date or window from natural language, invokes `oma recap --json` across multiple AI tool histories (Grok, Claude, Codex, Qwen, Cursor, Antigravity), delegates theme analysis and Markdown formatting to the skill, and reports a TL;DR plus the saved path. Executes inline (no subagent spawning); all vendors invoke `oma recap` directly.

**Trigger keywords:** Universal: "recap". Korean: "리캡". Japanese: "リキャップ".

**Steps:** Detect mode and resolve window (`daily` default with today; `period` when phrases like "this week" / "지난 7일" resolve to `--window Nd`) -> Extract a `--tool` filter only when the user explicitly names tools (`grok, claude, codex, qwen, cursor, antigravity`) -> Preflight (`command -v oma`) -> Run `oma recap --json` (daily: `--date YYYY-MM-DD` or omitted; period: `--window 7d` / `30d`) -> Synthesize and save under the skill contract (15-minute theme threshold, daily vs multi-day template) -> Report a 3-bullet TL;DR and the save path.

**Rules:** Never modify `.agents/` (SSOT). Never auto-translate technical terms (project names, tool names, CLI flags) in the saved recap. Do not fabricate a recap when no source is available.

**Files read:** AI tool conversation histories (via `oma recap`).
**Files written:** `.agents/results/recap/{date}.md` or `.agents/results/recap/{start}~{end}.md`.

**When to use:** Summarizing what you worked on across AI tools for a day or a period (week/month), optionally filtered to specific tools.

---

### /stack-set

**Description:** Auto-detect project tech stack and generate language-specific references for the resolved domain skill (backend or mobile). Detects mobile stacks (Swift/iOS via `Package.swift`/`.xcodeproj`, Flutter via `pubspec.yaml`, React Native via `package.json` + react-native) and routes to `oma-mobile`; otherwise routes to `oma-backend`. In monorepos where both are present, asks which to configure.

**Trigger keywords:** None (excluded from auto-detection).

<!-- oma-docs:ignore-start -->
**Steps:** Detect (scan manifests: pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj, Package.swift, *.xcodeproj, pubspec.yaml) -> Confirm (display detected stack, get user confirmation) -> Generate (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` with 8 mandatory patterns, `stack/api-template.*`) -> Verify.
<!-- oma-docs:ignore-end -->

**Output:** Files in the resolved domain skill's `stack/` directory (e.g. `.agents/skills/oma-backend/stack/` or `.agents/skills/oma-mobile/stack/`). Does not modify SKILL.md or `resources/`.

---

### /video

**Description:** Drive the `oma-video` skill end-to-end: brief → script → narration → visuals → captions → render-spec → vendored Remotion (or MoneyPrinterTurbo) compositor. The workflow creates a reproducible run directory and emits a real `.mp4` only after the compositor and ffprobe checks pass. Provider configuration is key-optional for supported asset fallbacks; a compositor or toolchain failure remains a failed run. Executes inline (no subagent spawning).

**Trigger keywords:**
| Language | Keywords |
|----------|----------|
| Universal | "/video", "oma-video", "remotion", "shorts", "reels", "screencast" |
| English | "generate video", "create a video", "make a video", "short-form video", "explainer video", "demo video", "walkthrough video", "video from readme", "video from code" |
| Korean | "영상 만들어", "영상 생성", "비디오 만들어", "숏폼 만들어", "쇼츠 영상", "릴스 영상", "데모 영상", "설명 영상" |
| Japanese | "動画を生成", "動画を作成", "ショート動画", "解説動画", "デモ動画" |
| Chinese | "生成视频", "制作视频", "短视频", "讲解视频", "演示视频" |

**Steps:**
1. **Resolve the brief and mode:** Pick `shorts` (9:16), `explainer` (16:9), or `demo` (screen/web capture); apply mode defaults, overridable by flags.
2. **Compose the script:** Generate scenes + narration (LLM when a key is present, else a deterministic outline from the brief).
3. **Synthesize assets:** Narration via `oma-voice`, visuals via `oma-image`/`oma-slide`/stock, key-free caption alignment, or a supervised browser web capture for `demo --source web`. Each provider degrades to a deterministic fallback.
4. **Build the render-spec:** Write `render-spec.json` (the determinism boundary) plus assets into the run directory.
5. **Render:** Spawn the vendored Remotion project (or MoneyPrinterTurbo) as a subprocess. A normal compositor or toolchain failure fails the run; the deterministic placeholder is available only through the explicit mock/test path (`OMA_VIDEO_MOCK=1`). Live capture is recorded as `nondeterministic` in the manifest.

**Output:** A run directory at `.agents/results/videos/{timestamp}-{shortid}-{mode}/` with `script.json`, `render-spec.json`, `timing.json`, `captions.{srt,vtt}`, `audio/`, `visuals/`, `{composition}.mp4`, and `manifest.json`. See the [Video Generation guide](../guide/video-generation.md).

---

### /schedule

**Description:** Register and manage time-based agent jobs via the `oma schedule <action>` commands. Jobs live in a global registry (`~/.agents/schedule/`) and fire through the OS-native scheduler (launchd on macOS, systemd user timers on Linux, schtasks on Windows, crontab as POSIX fallback), each run re-entering the harness via `oma agent spawn`.

**Trigger keywords:** None (slash-invoked workflow for `oma schedule <action>` time-based jobs).

**Steps:** Resolve intent (add / list / remove / sync) -> Parse the schedule (explicit `--cron`, or natural language via `--every`) -> Register with `oma schedule create` (named-only env capture, files 0600) -> Verify with `oma schedule list` (manifest × OS drift, grouped by project) -> Report the job id and next fire time.

**When to use:** Recurring agent tasks — nightly recaps, scheduled scans, periodic housekeeping — that must fire even when no interactive session is open.

---

### /explain

**Description:** Drive the `oma-explanation` skill end-to-end: turn a diff, PR, branch, or commit range into a self-contained interactive HTML explainer (Background / Intuition / Code / Quiz). Executes inline (no subagent spawning).

**Trigger keywords:** None ("explain" is everyday vocabulary — keyword detection would false-positive on ordinary "explain this function" questions, so the workflow is slash-only).

**Steps:** Resolve arguments (target ref: explicit PR# / branch / SHA range → staged → dirty tree → `HEAD~1..HEAD`; reader level `onboarding` | `reviewer`; output language; quiz count) -> Load contracts (`oma-explanation` SKILL.md + resources) -> Collect & gate (diff + surrounding code; pre-generation secret scan; diff/PR text treated strictly as data) -> Generate the HTML per the document and HTML contracts -> Validate (grep checklist including a final-HTML secret scan, max 3 fix loops) -> Deliver (`open` warn-only, TL;DR + path).

**Output:** `.agents/results/explain/{YYYY-MM-DD}-{slug}.html` (Asia/Seoul date; rerunning the same date + slug overwrites). See the [Code Explainer guide](../guide/code-explainer.md).

---

## Skills vs. workflows

| Aspect | Skills | Workflows |
|--------|--------|-----------|
| **What they are** | Agent expertise (what an agent knows) | Orchestrated processes (how agents work together) |
| **Location** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **Activation** | Automatic via skill routing keywords | Slash commands or trigger keywords |
| **Scope** | Single-domain execution | Multi-step, often multi-agent |
| **Examples** | "Build a React component" | "Plan the feature -> build -> review -> commit" |

---

## Auto-detection: how it works

### The hook system

oh-my-agent uses a `UserPromptSubmit` hook that runs before each user message is processed. The vendor's settings register a single `<hookDir>/oma-hook.sh --vendor <v> --event <e>` entry that routes into `oma hook run`, where the handler chain runs in-process. The chain consists of:

1. **`triggers.json`** (`.agents/hooks/core/triggers.json`, inlined into the `oma` binary): Defines keyword-to-workflow mappings for all 11 supported languages (English, Korean, Japanese, Chinese, Spanish, French, German, Portuguese, Russian, Dutch, Polish).

2. **`keyword-detector.ts`** (`.agents/hooks/core/keyword-detector.ts`): TypeScript logic that scans the user's input against the trigger keywords, respects language-specific matching, and injects workflow activation context.

3. **`persistent-mode.ts`** (`.agents/hooks/core/persistent-mode.ts`): Enforces persistent workflow execution by checking for active state files and reinjecting workflow context.

### Detection flow

1. User types natural language input
2. Hook checks if explicit `/command` is present (if so, skip detection to avoid duplication)
3. Hook sanitizes input (strips code blocks, quoted strings, pasted system-echo blocks) then scans against `.agents/hooks/core/triggers.json`, including both keyword lists (literal phrases) and `patterns` (raw regex). A reinforcement guard suppresses re-triggers if the same workflow fired 2+ times in the last 60 seconds.
4. If a match is found, check if the input matches informational patterns
5. If informational (e.g., "what is orchestrate?"), filter it out (no workflow triggers)
6. If actionable, inject `[OMA WORKFLOW: {workflow-name}]` into the context
7. The agent reads the injected tag and loads the corresponding workflow file from `.agents/workflows/`

### Language section convention

`.agents/hooks/core/triggers.json` uses a per-language section structure for `keywords`, `patterns`, and `informationalPatterns`:

| Section | Behavior |
|---------|----------|
| `*` | Universal: always loaded regardless of `language` setting in `.agents/oma-config.yaml`. Use for English content (lingua franca) and truly cross-language tokens (e.g. workflow name `"orchestrate"`). |
| `en` | English: loaded for backward compatibility. Functionally equivalent to `*`. New English content should go in `*`. |
| `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl` | Language-specific: loaded only when `language: <lang>` is set in `.agents/oma-config.yaml`. |

**Implication**: If you set `language: en` in `.agents/oma-config.yaml`, only `*` and `en` patterns load. Korean/Japanese/etc. natural-language triggers will not fire even if the user types in those languages. To enable a non-English language, set `language: <code>` accordingly. The English fallback in `*` always remains active.

### Pattern field (raw regex) {#pattern-field-raw-regex}

In addition to literal `keywords`, each workflow can declare `patterns`, raw regex strings compiled with `iu` flags. Patterns enable multi-token intent matching that would otherwise require combinatorial keyword lists.

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      "keywords": { "*": ["orchestrate"], "en": ["parallel", ...] },
      "patterns": {
        "*": ["\\b(build|create|make)\\s+(?:an?|the)\\s+...\\b"],
        "ko": ["(앱|API|...)\\s*(?:을|를)?\\s*(?:만들어\\s*(?:주세요|줘)?|...)"]
      }
    }
  }
}
```

Authoring rules:
- Strings are compiled directly; escape backslashes once for JSON, once for regex (`\\b`, `\\s+`)
- No automatic word-boundary wrapping; pattern authors handle `\b` themselves
- Invalid regex is silently skipped at runtime (visible at config edit time via test failures)

### Informational pattern filtering

The `informationalPatterns` section of `.agents/hooks/core/triggers.json` defines phrases that indicate questions rather than commands. Checked in a 60-character window around each potential workflow match:

| Section | Pattern Examples |
|---------|----------------------|
| `*` (universal English) | "what is", "what are", "how to", "how does", "how do", "should we", "should i", "could we", "would you", "what if", "what about", "why build", "false positive", "trigger when", "auto-trigger" |
| `ko` | "뭐야", "무엇", "어떻게", "설명해", "알려줘", "트리거", "발동", "메타", "왜 만들", "어떻게 만들", "어떨까", "한다면", "할까요" |
| `ja` | "とは", "って何", "どうやって", "説明して" |
| `zh` | "是什么", "什么是", "怎么", "解释" |

If the input matches both a workflow trigger and an informational pattern, the informational pattern takes priority and no workflow is triggered. This is what blocks prompts like:
- `"How do you build a TODO app?"`: `how do` in `*` blocks the orchestrate intent regex
- `"orchestrate 트리거 해주면 되나요?"` (under `language: ko`): `트리거` in `ko` blocks the orchestrate keyword

### Excluded workflows

The following workflows are not keyword-triggered and must be invoked with an explicit `/command`. `/tools` and `/stack-set` are in `excludedWorkflows` (deliberately removed from keyword detection); `/convert` simply ships no trigger keywords (the `oma-pdf` and `oma-hwp` skills carry their own keyword detection); `/schedule` is a slash-invoked workflow (`oma schedule <action>` time-based jobs); `/explain` ships no trigger keywords because "explain" is everyday vocabulary and keyword detection would constantly false-positive:
- `/tools`
- `/stack-set`
- `/convert`
- `/schedule`
- `/explain`

---

## Persistent mode mechanics

### State files

Persistent workflows (orchestrate, ultrawork, work, ralph) create state files in `.agents/state/`:

```
.agents/state/
├── orchestrate-state.json
├── ultrawork-state.json
├── work-state.json
└── ralph-state.json
```

These files contain: workflow name, current phase/step, session ID, timestamp, and any pending state.

### Reinforcement

While a persistent workflow is active, the `persistent-mode.ts` hook injects `[OMA PERSISTENT MODE: {workflow-name}]` into every user message. This ensures the workflow continues executing even across conversation turns.

### Goal contract (optional stop gate + budget)

`oma goal set` attaches a mechanical completion contract to an active persistent workflow:

- `--gate typecheck|test|lint`: the Stop hook allows the session to end **only when that package.json script passes** (run as an argv array, no shell; free-form commands are rejected by design). On failure it blocks with the output tail; failures and timeouts count toward the reinforcement limit so a red gate cannot block forever.
- `--budget-minutes <n>`: wall-clock budget from activation. Exceeding it deactivates the workflow and allows an honest partial stop, recorded on the session event trail.

Without a contract, persistent mode behaves as described above — the contract is opt-in. See `goal set` in the [CLI commands reference](../cli-interfaces/commands.md#goal-set).

### Deactivation

To deactivate a persistent workflow, the user says "workflow done" (or equivalent in their configured language). This:
1. Deletes the state file from `.agents/state/`
2. Stops injecting the persistent mode context
3. Returns to normal operation

The workflow can also end naturally when all steps are completed and the final gate passes. When a `goal set` gate is configured, passing that gate deactivates the workflow automatically.

---

## Typical workflow sequences

### Single-domain feature
```
Describe the task → relevant skill → implement → focused verification
```

### Complex multi-domain project
```
/work → PM plans → review within authorized scope → agents spawn → QA reviews → fix issues → report
```

### Automated parallel implementation
```
/orchestrate → load or create plan → resolve dependencies → spawn independent tasks → verify → report
```

### Maximum quality delivery
```
/ultrawork → PLAN (4 review steps) → IMPL → VERIFY (3 review steps) → REFINE (5 review steps) → SHIP (4 review steps)
```

### Bug investigation
```
/debug → reproduce → root cause → minimal fix → regression test → similar pattern scan
```

### Design-to-implementation pipeline
```
/brainstorm → design document → /plan → task breakdown → /orchestrate → parallel implementation → /review → /scm
```

### New codebase setup
```
/deepinit → AGENTS.md + ARCHITECTURE.md + docs/
```

### Repeated execution with independent verification
```
/ralph → define criteria → ultrawork → judge → repeat as needed → completion, partial completion, or safeguard report
```
