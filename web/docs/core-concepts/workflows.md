---
title: Workflows
description: Complete reference for all 17 oh-my-agent workflows, covering slash commands, persistent vs non-persistent modes, trigger keywords in 11 languages, phases and steps, files read and written, auto-detection mechanics via triggers.json and keyword-detector.ts, informational pattern filtering, and persistent mode state management.
---

# Workflows

Workflows are structured multi-step processes triggered by slash commands or natural language keywords. They define how agents collaborate on tasks, from single-phase utilities to complex 5-phase quality gates.

There are 17 workflows, 4 of which are persistent (they maintain state and cannot be accidentally interrupted).

---

## Persistent workflows

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

**Trigger regex patterns** (intent + noun whitelist, see [Auto-Detection: Pattern Field](#pattern-field-raw-regex)):
| Section | Pattern | Examples that trigger |
|---------|---------|----------------------|
| `*` (universal) | `(build\|create\|make\|develop\|implement\|scaffold) + (a\|an\|the) + [modifier]{0,3} + <noun>` | "Build a TODO app with user authentication", "Create an awesome web service", "Develop a backend with PostgreSQL" |
| `*` (universal) | `i want a/an + <noun>` | "I want a CLI for parsing logs" |
| `ko` | `<noun> + (을\|를\|이\|가)? + (만들어\|구현해\|개발해 + 변형)` | "TODO 앱 만들어줘", "REST API 구현해", "백엔드를 개발해주세요" |

Noun whitelist (15): app, api, service, server, cli, tool, website, dashboard, system, feature, backend, frontend, prototype, mvp, bot.

**Steps:**
1. **Step 0, Preparation:** Read coordination skill, context-loading guide, memory protocol. Detect vendor.
2. **Step 1, Load/Create Plan:** Check for `.agents/results/plan-{sessionId}.json`. If missing, prompt user to run `/plan` first.
3. **Step 2, Initialize Session:** Load `oma-config.yaml`, display CLI mapping table, generate session ID (`session-YYYYMMDD-HHMMSS`), create `orchestrator-session.md` and `task-board.md` in memory.
4. **Step 3, Spawn Agents:** For each priority tier (P0 first, then P1...), spawn agents using vendor-appropriate method (Agent tool for Claude Code, `oma agent:spawn` for Gemini/Antigravity, model-mediated for Codex). Never exceed MAX_PARALLEL.
5. **Step 4, Monitor:** Poll `progress-{agent}.md` files, update `task-board.md`. Watch for completions, failures, crashes.
6. **Step 5, Verify:** Run `verify.sh {agent-type} {workspace}` per completed agent. On failure, re-spawn with error context (max 2 retries). After 2 retries, activate Exploration Loop: generate 2-3 hypotheses, spawn parallel experiments, score, keep best.
7. **Step 6, Collect:** Read all `result-{agent}.md` files, compile summary.
8. **Step 7, Final Report:** Present session summary. If Quality Score was measured, include Experiment Ledger summary and auto-generate lessons.

**Files read:** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, `progress-{agent}.md`, `result-{agent}.md`.
**Files written:** `orchestrator-session.md`, `task-board.md` (memory), final report.

**When to use:** Large projects requiring maximum parallelism with automated coordination.

---

### /work

**Description:** Step-by-step multi-domain coordination. PM plans first, then agents execute with user confirmation at each gate, followed by QA review and issue remediation.

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
4. **Step 3, Review Plan:** Present plan to user. **Must get confirmation before proceeding.**
5. **Step 4, Spawn Agents:** Spawn by priority tier, parallel within same tier, separate workspaces.
6. **Step 5, Monitor:** Poll progress files, verify API contract alignment between agents.
7. **Step 6, QA Review:** Spawn QA agent for security (OWASP), performance, accessibility, code quality.
8. **Step 6.1, Quality Score** (conditional): Measure and record baseline.
9. **Step 7, Iterate:** If CRITICAL/HIGH issues found, re-spawn responsible agents. If same issue persists after 2 attempts, activate Exploration Loop.

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

### /ralph

**Description:** Persistent self-referential execution loop. Wraps ultrawork with an independent verifier that checks completion criteria after each iteration. Keeps looping until all criteria pass or safeguards trigger.

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
1. **Phase 0, INIT:** Load prerequisites (context-loading, memory protocol, judge protocol). Define verifiable completion criteria (each must be mechanically verifiable, such as test pass, build success, or file exists). Present criteria for user confirmation. Initialize session with `max_iterations: 5`.
2. **Phase 1, WORK:** Execute ultrawork (PLAN → IMPL → VERIFY → REFINE → SHIP) as a single iteration.
3. **Phase 2, JUDGE:** Independent verifier checks each completion criterion against actual project state (run tests, check builds, verify file existence). Score each criterion as PASS/FAIL with evidence.
4. **Phase 3, DECIDE:** If all criteria PASS → end loop, generate final report. If any FAIL → increment iteration counter, feed failure context back, return to Phase 1.
5. **Safeguards:** Loop stops if `current_iteration >= max_iterations` (default 5), or if the same criterion fails 3 consecutive times with the same root cause (stuck detection).

**Key difference from /ultrawork:** Ultrawork is a single-pass 5-phase workflow. Ralph wraps ultrawork in a retry loop with an independent judge that objectively verifies completion. It keeps going until the work is actually done, not just "reviewed."

**Files read:** `.agents/workflows/ralph/resources/judge-protocol.md`, all ultrawork files.
**Files written:** `session-ralph.md` (memory), iteration logs, final report.

**When to use:** When you need guaranteed completion. The agent must keep working until verifiable criteria pass, not just do one pass and report.

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

**Rules:** Never `git add -A`. Never commit secrets. HEREDOC for multi-line messages. Co-Author: `First Fluke <our.first.fluke@gmail.com>`.

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

### /pdf

**Description:** Convert PDF to Markdown using `opendataloader-pdf`. Extracts text, tables, headings, and images with correct reading order.

**Trigger keywords:** None (invoked explicitly with an input file path).

**Steps:** Validate input (confirm file exists) -> Determine output location (user-specified or same directory as input) -> Run `uvx opendataloader-pdf` (no install required) -> For scanned PDFs use hybrid mode with OCR -> Normalize output with `uvx mdformat` -> Validate readability and structure -> Report any conversion issues (missing tables, garbled text).

**Rules:** Default output location is the same directory as the input PDF. Never skip steps. Response language follows `.agents/oma-config.yaml`.

**When to use:** Converting PDF documents to Markdown for LLM context or RAG ingestion, extracting structured content (tables, headings, lists) from PDFs.

---

### /stack-set

**Description:** Auto-detect project tech stack and generate language-specific references for the resolved domain skill (backend or mobile). Detects mobile stacks (Swift/iOS via `Package.swift`/`.xcodeproj`, Flutter via `pubspec.yaml`, React Native via `package.json` + react-native) and routes to `oma-mobile`; otherwise routes to `oma-backend`. In monorepos where both are present, asks which to configure.

**Trigger keywords:** None (excluded from auto-detection).

**Steps:** Detect (scan manifests: pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj, Package.swift, *.xcodeproj, pubspec.yaml) -> Confirm (display detected stack, get user confirmation) -> Generate (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` with 8 mandatory patterns, `stack/api-template.*`) -> Verify.

**Output:** Files in the resolved domain skill's `stack/` directory (e.g. `.agents/skills/oma-backend/stack/` or `.agents/skills/oma-mobile/stack/`). Does not modify SKILL.md or `resources/`.

---

### /video

**Description:** Drive the `oma-video` skill end-to-end: brief → script → narration → visuals → captions → render-spec → vendored Remotion (or MoneyPrinterTurbo) compositor, producing a reproducible run directory with a real `.mp4`. Key-optional — every stage falls back to a deterministic branch, so a run completes with no API keys. Executes inline (no subagent spawning).

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
3. **Synthesize assets:** Narration via `oma-voice`, visuals via `oma-image`/`oma-slide`/stock, key-free caption alignment, or a supervised Playwright web capture for `demo --source web`. Each provider degrades to a deterministic fallback.
4. **Build the render-spec:** Write `render-spec.json` (the determinism boundary) plus assets into the run directory.
5. **Render:** Spawn the vendored Remotion project (or MoneyPrinterTurbo) as a subprocess; on any failure, emit a deterministic placeholder so the run still completes. Live capture is recorded as `nondeterministic` in the manifest.

**Output:** A run directory at `.agents/results/videos/{timestamp}-{shortid}-{mode}/` with `script.json`, `render-spec.json`, `timing.json`, `captions.{srt,vtt}`, `audio/`, `visuals/`, `{composition}.mp4`, and `manifest.json`. See the [Video Generation guide](../guide/video-generation.md).

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

oh-my-agent uses a `UserPromptSubmit` hook that runs before each user message is processed. The hook system consists of:

1. **`triggers.json`** (`.claude/hooks/triggers.json`): Defines keyword-to-workflow mappings for all 11 supported languages (English, Korean, Japanese, Chinese, Spanish, French, German, Portuguese, Russian, Dutch, Polish).

2. **`keyword-detector.ts`** (`.claude/hooks/keyword-detector.ts`): TypeScript logic that scans the user's input against the trigger keywords, respects language-specific matching, and injects workflow activation context.

3. **`persistent-mode.ts`** (`.claude/hooks/persistent-mode.ts`): Enforces persistent workflow execution by checking for active state files and reinjecting workflow context.

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

### Pattern field (raw regex)

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

The following workflows are excluded from auto-detection and must be invoked with explicit `/command`:
- `/scm`
- `/tools`
- `/stack-set`
- `/pdf`

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

### Deactivation

To deactivate a persistent workflow, the user says "workflow done" (or equivalent in their configured language). This:
1. Deletes the state file from `.agents/state/`
2. Stops injecting the persistent mode context
3. Returns to normal operation

The workflow can also end naturally when all steps are completed and the final gate passes.

---

## Typical workflow sequences

### Quick feature
```
/plan → review output → /work
```

### Complex multi-domain project
```
/work → PM plans → user confirms → agents spawn → QA reviews → fix issues → ship
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

### Guaranteed completion
```
/ralph → define criteria → ultrawork loop → judge verifies → re-iterate if needed → all criteria pass → done
```
