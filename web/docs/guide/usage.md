---
title: Usage Guide
sidebar_label: Using OMA
description: Usage guide for OMA, covering reader-first task selection, single-skill and multi-domain examples, workflows, auto-detection, all 33 skill packages, parallel CLI execution, dashboards, defaults, and recovery.
---

# How to Use oh-my-agent

## Quick start

1. Open your project in a selected AI-powered IDE or CLI (Claude Code, Codex CLI, Cursor, Antigravity, OpenCode, Kimi, Kiro, Qwen, or another supported host)
2. The selected host can load [skills](../getting-started/glossary.md#skill) from `.agents/skills/`; enabled hooks can detect [workflows](../getting-started/glossary.md#workflow) from natural-language keywords
3. Describe what you want in natural language. The host or selected workflow routes the task to the relevant skill
4. For multi-agent work, use `/work` or `/orchestrate`

Single-domain tasks need no special syntax. Use the [skill and workflow selection guide](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) to choose between a single skill, `/work`, `/orchestrate`, `/ultrawork`, and `/ralph`. See [Quick Start](../getting-started/quick-start.md) for setup and [Important Defaults](../getting-started/important-defaults.md) before changing providers.

## Pick a guide

| Your task | Start with | Guide |
|-----------|------------|-------|
| One change in one domain | A plain prompt (skill routing) | [Single Skill](./single-skill.md) |
| A feature across API, UI, mobile, or database | `/work` (step-by-step) or `/orchestrate` (automated) | [Multi-Agent Projects](./multi-agent-project.md) |
| A bug with an error message | `/debug` plus the error and reproduction steps | [Bug Fixing](./bug-fixing.md) |
| Watching agents while they run | `oma dashboard terminal` | [Dashboard Monitoring](./dashboard-monitoring.md) |
| Auditing or resuming agent results | `oma agent resume SESSION_ID --dry-run` | [Results and Resume](./agent-results-and-resume.md) |
| Finding or migrating OMA documents | `oma docs migrate --dry-run` | [Artifact Layout](./artifact-layout.md) |
| Something failed | `oma doctor --json` | [Troubleshooting](./troubleshooting.md) |

---

## Example 1: simple single task

**You type:**
```text
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**What happens:**

1. The host routes the request to `oma-frontend` (keywords such as "form", "component", and "Tailwind CSS" are routing signals)
2. Layer 1 (SKILL.md) is already loaded with agent identity, core rules, and library list
3. Layer 2 resources load on-demand:
   - `execution-protocol.md`: the 4-step workflow (Analyze, Plan, Implement, Verify)
   - `snippets.md`: form and Zod validation patterns, plus existing component patterns when the skill supplies them
4. Agent outputs a **CHARTER_CHECK**:
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
<!-- oma-docs:ignore-start -->
5. Agent implements:
   - React component with TypeScript in `src/features/auth/components/login-form.tsx`
   - Zod validation schema in `src/features/auth/utils/login-validation.ts`
   - Vitest tests in `src/features/auth/utils/__tests__/login-validation.test.ts`
   - Loading skeleton in `src/features/auth/components/skeleton/login-form-skeleton.tsx`
<!-- oma-docs:ignore-end -->
6. Agent runs the checklist: accessibility (ARIA labels, semantic HTML, keyboard nav), mobile viewport, performance (no CLS), error boundaries

**Expected result:** A scoped React component with TypeScript, validation, tests, and accessibility evidence when the project supports those checks. The prompt and selected workflow determine which files and checks actually run.

---

## Example 2: multi-domain project

**You type:**
```text
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**What happens:**

1. This request spans frontend, backend, and mobile work. The host agent can use that scope to recommend a coordination approach.
2. With the keyword-detection hook enabled, "Build a TODO app" matches a configured `/orchestrate` pattern and can activate it. The hook matches text; it does not classify the request as multi-domain. Use an explicit command to select the workflow you want.

**Using `/work` (step-by-step with user control):**

```text
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Step 1, PM Agent plans:**
   - Identifies domains: backend (auth API, task CRUD), frontend (login, task list UI), mobile (Flutter app)
   - Defines API contracts: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`
   - Creates a task breakdown by priority tier (lower tiers run first):
     - Tier 1: Backend auth API, Backend task CRUD API
     - Tier 2: Frontend login/register, Frontend task list, Mobile auth screens, Mobile task list
     - Tier 3: QA review
   - Saves to `.agents/results/plan-{sessionId}.json`

4. **Step 2, Review the plan:** The agent presents the plan and continues within existing authorization, asking only for a material missing decision or new authorization.

5. **Step 3, Agents spawn by priority tier:**
   ```bash
   # Tier 1 (parallel). Task IDs come from .agents/results/plan-session-todo-01.json
   oma agent spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 --task-id api-auth -w ./apps/api &
   oma agent spawn db "User and task schema design" session-todo-01 --task-id db-schema &
   wait

   # Tier 2 (parallel, after tier 1 completes)
   oma agent spawn frontend "Login, register, task list UI" session-todo-01 --task-id web-ui -w ./apps/web &
   oma agent spawn mobile "Auth and task screens" session-todo-01 --task-id mobile-ui -w ./apps/mobile &
   wait
   ```

   `--task-id` must match a task `id` in the session plan; without it the task ID defaults to the agent ID, and a planned session rejects an ID it does not contain (`Unknown plan task`). Ad-hoc sessions without a plan can omit it.

6. **Step 4, QA Agent reviews:**
   - Security: OWASP Top 10 compliance (JWT validation, CSRF, SQL injection check)
   - Performance: N+1 query check, pagination verification
   - Accessibility: WCAG 2.2 AA on all frontend components
   - Cross-domain: API contract alignment between frontend, mobile, and backend

7. **Step 5, Iterate:** If QA finds CRITICAL issues, re-spawn the responsible agent with the QA report.

---

## Example 3: bug fixing

**You type:**
```text
There's a bug. Clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**What happens:**

1. `oma-debug` activates automatically (keywords: "bug", "error", "Cannot read property")
2. **Step 1, Collect:** The error message and context are captured
<!-- oma-docs:ignore-start -->
3. **Step 2, Reproduce:** MCP `search_for_pattern` finds the `.map()` call in `src/features/tasks/components/task-list.tsx`
<!-- oma-docs:ignore-end -->
4. **Step 3, Diagnose:** MCP `find_referencing_symbols` traces the data flow:
   - `useQuery` hook fetches tasks from API
   - Component renders before data arrives
   - `tasks` is `undefined` during loading state
   - Root cause: missing loading state check before `.map()`
5. **Step 4, Propose fix:** Present minimal change by adding loading state check and null guard
6. **Step 5, Implement:**
   - Add loading skeleton while data fetches
   - Add null check: `tasks?.map()` or early return for loading state
   - Write regression test that verifies component renders correctly when `tasks` is undefined
7. **Step 6, Similar pattern scan:** MCP `search_for_pattern` searches for other `.map()` calls on potentially undefined arrays
   - Finds 3 similar patterns in `user-list.tsx`, `comment-list.tsx`, `notification-list.tsx`
   - Proactively applies the same fix pattern
8. **Step 7, Document:** Bug report written to `.agents/results/bugs/` with root cause, fix, and prevention

---

## Example 4: design system

**You type:**
```text
Design a dark premium landing page for my B2B SaaS analytics product
```

**What happens:**

1. `oma-design` activates (keywords: "design", "landing page", "dark", "premium")
2. **Phase 1, SETUP:** Checks for `.design-context.md`. If missing, asks:
   - What languages does the service support? (en only / + CJK)
   - Target audience? (B2B, technical users, 25-45)
   - Brand personality? (professional / premium)
   - Aesthetic direction? (dark premium)
   - Reference sites? (user provides examples)
   - Accessibility? (WCAG AA)
3. **Phase 3, ENHANCE:** If the prompt is vague, transforms it into section-by-section specification
4. **Phase 4, PROPOSE:** Presents 3 design directions:
   - **Direction A: "Midnight Observatory"**: Deep navy (#0f1729), cyan accents (#22d3ee), Inter + JetBrains Mono, bento grid layout, scroll-driven reveals
   - **Direction B: "Carbon Interface"**: Neutral gray (#18181b), amber accents (#f59e0b), system fonts, chess layout, hover-driven micro-interactions
   - **Direction C: "Deep Space"**: Pure dark (#0a0a0a), emerald accents (#10b981), Geist + Geist Mono, full-bleed sections, entrance animations
5. **Phase 5, GENERATE:** Based on chosen direction, generates:
   - `DESIGN.md` with 6 sections (typography, color, spacing, motion, components, accessibility)
   - CSS custom properties
   - Tailwind config extensions
   - shadcn/ui theme variables
6. **Phase 6, AUDIT:** Runs checks for responsive (320px minimum), WCAG 2.2, Nielsen heuristics, AI slop detection
7. **Phase 7, HANDOFF:** "Design complete. Run `/orchestrate` to implement with oma-frontend."

---

## Example 5: CLI parallel execution

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
oma dashboard web             # Web UI; prints http://127.0.0.1:9847/

# After implementation, run QA
oma agent spawn qa "Review notification feature across all platforms" session-notif-01

# Check session statistics after completion
oma stats get
```

If your current runtime matches the target vendor in `.agents/oma-config.yaml`, workflows should prefer native subagents:

- Claude Code -> `.claude/agents/*.md`
- Codex CLI -> `.codex/agents/*.toml`
- Qwen Code -> `.qwen/agents/*.md`, selected through the Agent tool's `subagent_type`
- Antigravity CLI/IDE -> `oma agent spawn` through `agy`

Cross-vendor tasks and `model_preset: free` use `oma agent spawn`. Native dispatch still requires the [result lifecycle](./agent-results-and-resume.md) to record verification evidence.

---

## Example 6: ultrawork for maximum quality

**You type:**
```text
/ultrawork Build a payment processing module with Stripe integration
```

**What happens (5 phases, 17 steps, 12 isolated review steps):**

**Phase 1, PLAN (Steps 1-4, PM Agent inline):**
- Step 1: Create plan with task breakdown, API contracts, dependencies
- Step 2: Plan Review (completeness check; are all requirements mapped?)
- Step 3: Meta Review (self-verify the review was sufficient)
- Step 4: Over-Engineering Review (MVP focus, no unnecessary complexity)
- PLAN_GATE: Plan documented, assumptions listed, scope authorized

**Phase 2, IMPL (Step 5, Dev Agents spawned):**
- Backend agent implements Stripe integration (webhooks, idempotency, error handling)
- Frontend agent builds checkout flow and payment status UI
- Step 5.2: Record a baseline only when a defined measurement comparison is needed
- IMPL_GATE: Applicable non-emitting checks and tests pass, only planned files modified; build checks run only when explicitly requested

**Phase 3, VERIFY (Steps 6-8, QA Agent spawned):**
- Step 6: Alignment Review (does implementation match the plan?)
- Step 7: Security/Bug Review (OWASP, npm audit, Stripe security best practices)
- Step 8: Improvement/Regression Review (no regressions introduced)
- VERIFY_GATE: Zero CRITICAL, zero HIGH, applicable project measurement targets met

**Phase 4, REFINE (Steps 9-13, Refactor Agent spawned):**
- Step 9: Split large files (> 500 lines) and functions (> 50 lines)
- Step 10: Integration/Reuse Review (eliminate duplicate logic)
- Step 11: Side Effect Review (trace cascade impact with `find_referencing_symbols`)
- Step 12: Full Change Review (naming consistency, style alignment)
- Step 13: Clean up dead code
- REFINE_GATE: no unresolved measured regression, code clean

**Phase 5, SHIP (Steps 14-17, QA Agent spawned):**
- Step 14: Code Quality Review (lint, types, coverage)
- Step 15: UX Flow Verification (end-to-end payment user journey)
- Step 16: Related Issues Review (final cascade impact check)
- Step 17: Deployment Readiness (secrets management, migration scripts, rollback plan)
- SHIP_GATE: All checks pass; reuse existing authorization. Publishing or deployment requires authorization for that action.

---

## All workflow commands

| Command | Type | What It Does | When to Use |
|---------|------|-------------|-------------|
| `/orchestrate` | Persistent | Loads or creates a plan, then delegates parallel execution with monitoring and verification | Independent tasks suited to automated parallel coordination |
| `/work` | Persistent | Step-by-step multi-domain planning, implementation, and QA within the authorized scope | Features spanning multiple domains that need coordinated delivery |
| `/ultrawork` | Persistent | 5-phase, 17-step quality workflow with 12 isolated review checkpoints | Maximum quality delivery, production-critical code |
| `/plan` | Non-persistent | PM-driven task breakdown, API contracts, and tracked plan artifacts in `docs/plans/work/` (sequential `NNN-name.md`, Status field for lifecycle) | Before any complex multi-agent work; complex features needing tracked progress and decision logs |
| `/brainstorm` | Non-persistent | Approach exploration with 2-3 proposals and a draft in `docs/decisions/` | Before committing to an implementation approach |
| `/deepinit` | Non-persistent | Full project initialization (AGENTS.md, ARCHITECTURE.md, docs/) | Setting up oh-my-agent in an existing codebase |
| `/review` | Non-persistent | QA pipeline: OWASP security, performance, accessibility, code quality | Before merging code, pre-deployment review |
| `/security` | Non-persistent | Scan application source, agent skills, or MCP components; run scoped web penetration tests against a test deployment; validate findings and configure security gates through `oma-security` | Before a release, or when a change needs a security scan or gate |
| `/debug` | Non-persistent | Structured debugging: reproduce, diagnose, fix, regression test, scan | Investigating bugs and errors |
| `/design` | Non-persistent | 7-phase design workflow producing DESIGN.md with tokens | Building design systems, landing pages, UI redesigns |
| `/scm` | Non-persistent | SCM workflow for Git (branch/merge/conflict/worktree/baseline) plus Conventional Commit generation with auto type/scope detection and feature splitting | After completing code changes or when handling repository configuration management tasks |
| `/tools` | Non-persistent | MCP tool visibility management (enable/disable groups) | Controlling which MCP tools agents can use |
| `/stack-set` | Non-persistent | Auto-detect project tech stack and generate backend or mobile (Swift/Flutter/RN) references | Setting up language-specific coding conventions |
| `/architecture` | Non-persistent | Architecture diagnosis, comparison, and decision records | Reviewing boundaries or choosing an architecture |
| `/convert` | Non-persistent | Route document conversion to the appropriate skill | Converting HWP/HWPX or PDF source files |
| `/docs` | Non-persistent | Documentation verification and diff-targeted sync proposals | Checking docs against the current codebase |
| `/explain` | Non-persistent | Generate and validate an offline HTML code-change explainer | Teaching a diff, PR, branch, or commit range |
| `/recap` | Non-persistent | Summarize work across supported AI tool histories | Daily or period retrospectives |
| `/schedule` | Non-persistent | Register recurring agent jobs | Nightly recaps, scans, or housekeeping |
| `/video` | Non-persistent | Compose reproducible videos from scripts, narration, and visuals | Shorts, explainers, and demos |
| `/ralph` | Persistent | Repeated ultrawork execution with a prompted judge and loop safeguards | Explicit requests to repeat execution until mechanical completion criteria pass |

---

## Auto-detection examples

oh-my-agent detects workflow keywords in 11 languages. Here are examples showing how natural language triggers workflows:

| You Type | Detected Workflow | Language |
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

**Informational queries are filtered out:**

| You Type | Result |
|----------|--------|
| "what is orchestrate?" | No workflow triggered (informational pattern: "what is") |
| "explain how /plan works" | No workflow triggered (informational pattern: "explain") |
| "어떻게 사용해?" | No workflow triggered (informational pattern: "어떻게") |
| "レビューとは何ですか" | No workflow triggered (informational pattern: "とは") |

---

## All 33 skills: quick reference

The installer’s `all` preset follows the live registry. The table groups every current skill by its primary use; a skill can still coordinate with another skill at a boundary.

| Skill | Best For | Primary Output |
|-------|---------|---------------|
| **oma-academic-writing** | Academic drafting, revision, and anti-AI review | Publication-oriented prose and claim/evidence revisions |
| **oma-architecture** | System boundaries, tradeoffs, ADRs | Reports in `.agents/results/architecture/`; decision records in `docs/decisions/` |
| **oma-backend** | APIs, auth, server logic, migrations | Router/service/repository changes and verification |
| **oma-brainstorm** | Ambiguous ideas and approach comparison | Decision draft in `docs/decisions/` |
| **oma-coordination** | Manual multi-agent coordination | Step-by-step task and handoff guidance |
| **oma-db** | Schema design, ERD, query tuning, capacity planning | Schema documentation, migrations, and recovery plan |
| **oma-debug** | Bug reproduction and root cause analysis | Minimal fix, regression evidence, and pattern scan |
| **oma-security** | Source, agent-skill, and MCP security scanning; scoped web penetration tests | Validated findings and scan-gate configuration |
| **oma-design** | Design systems, landing pages, tokens | `DESIGN.md`, tokens, and component guidance |
| **oma-dev-workflow** | CI/CD, monorepos, migrations, release automation | Workflow configuration and release checks |
| **oma-docs** | Broken references and documentation drift | Verify report or diff-targeted sync candidates |
| **oma-explanation** | Diff, PR, branch, or commit walkthroughs | Offline HTML explainer with Background, Intuition, Code, and Quiz |
| **oma-frontend** | UI components, forms, pages, Angular or React styling | Frontend changes and relevant checks |
| **oma-hwp** | HWP/HWPX/HWPML conversion | Markdown with headings, tables, images, and links |
| **oma-image** | Image generation and visual assets | Reproducible image run with manifest |
| **oma-market** | Pain points, trends, competitor and discovery research | LAW-compliant research brief with frameworks |
| **oma-mobile** | Flutter, React Native, and Swift iOS work | Mobile screens, state, platform integration, and tests |
| **oma-observability** | Traces, metrics, logs, profiles, SLOs, incident forensics | Layered observability recommendation or implementation guidance |
| **oma-orchestration** | Automated parallel agent execution | Coordinated plans, memory updates, and result collection |
| **oma-pdf** | PDF conversion and OCR-aware extraction | Markdown with reading order, tables, lists, and images |
| **oma-pm** | Requirements, task breakdown, API contracts | `.agents/results/plan-{sessionId}.json` and task board |
| **oma-qa** | Security, performance, accessibility, and quality review | Findings report with severity and remediation evidence |
| **oma-recap** | Cross-tool work retrospectives | Daily or period recap in `.agents/results/recap/` |
| **oma-refactor** | Behavior-preserving restructuring | Refactor changes with characterization and quality evidence |
| **oma-scholar** | Scholarly search and paper sidecars | Validated `.knows.yaml` sidecar operations |
| **oma-scm** | Git branching, worktrees, baselines, and commit hygiene | SCM plan or Conventional Commit output |
| **oma-search** | Trust-scored docs, web, code, and local search | Routed search results with trust labels |
| **oma-skill-creation** | Creating and auditing OMA skills | SSL-lite skill files and `oma skill audit` results |
| **oma-slide** | HTML presentation decks and exports | Validated bundled HTML, PDF, PNG, or PPTX |
| **oma-tf-infra** | Terraform infrastructure, IAM, and policy-as-code | Terraform modules, plans, and controls |
| **oma-translation** | UI, documentation, and marketing localization | Context-preserving translated content |
| **oma-video** | Shorts, explainers, and demos | Reproducible video run with assets and manifest |
| **oma-voice** | Local TTS, STT, and voiceovers | Audio or transcription artifacts with manifest |

---

## Dashboard setup

```bash
oma dashboard terminal   # live table in this terminal; Ctrl+C to exit
oma dashboard web        # prints http://127.0.0.1:9847/; open it in a browser
```

Both commands watch `.agents/state/memories/` for progress and `.agents/results/` for `result-*.md` reports under the current directory. Pass `--project-root <path>` to watch another project. Setting `MEMORIES_DIR` keeps the dashboard on that single custom directory. The agent table has four columns:

| Column | Source |
|--------|--------|
| Agent | `task-board.md`, or agent names discovered in memory files |
| Status | Terminal symbols: ● running (green), ✓ completed (cyan), ✗ failed (red), ○ blocked (yellow), ◌ pending (dim) |
| Turn | `turn: N` in the agent's `progress-<agent>*.md` file |
| Task | Task text from the task board or the agent's file |

Below the table, both dashboards list the latest activity from the five most recently modified memory files. Layouts, data sources, and recovery steps are in [Dashboard Monitoring](./dashboard-monitoring.md).

---

## Key concepts explained

### Progressive disclosure

Skills load in two layers to save tokens. Layer 1 (`SKILL.md`) enters context when the host routes the skill — the injector passes a path, not the body. Layer 2 (`resources/`) is read only when the task needs it; difficulty sets a soft budget, not a file list. The savings depend on the skills and the task, so measure them instead of assuming a figure: [token savings math](../core-concepts/skills.md#token-savings-math) has the script and explains what its estimates cover.

### Token optimization

Beyond progressive disclosure, oh-my-agent optimizes tokens through:
- **Context budget management**: no full file reads; use `find_symbol` instead of `read_file`
- **Lazy resource loading**: load error playbooks only on errors, checklists only at verification
- **Difficulty-based branching**: Simple tasks skip analysis and use minimal checklists
- **Progress tracking**: agents record read files to prevent re-reads

### CLI spawning

When you run `oma agent spawn`, the CLI:
1. Resolves the role's vendor from explicit options, agent overrides, the model preset, and the configured fallback
2. Injects the vendor-specific execution protocol from `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`
3. Composes the agent prompt using the SKILL.md core rules, execution protocol, and task-relevant resources
4. Spawns the agent as an independent CLI process
5. The run records a structured receipt under `.agents/state/agent-runs/` and injects a claim path
6. The agent writes a structured claim; human-readable progress and result Markdown files are supplemental

### Project memory store

Agents coordinate through durable files at `.agents/state/memories/` (older projects fall back to the legacy `.serena/memories/` path). This directory holds session summaries, task boards, progress, lessons, and experiment records. Human-readable `result-{agentId}-{taskId}-{runId}-{sessionId}.md` reports go in `.agents/results/`. Structured receipts and claims under `.agents/state/agent-runs/` remain authoritative for CLI spawns, and frozen execution plans stay in `.agents/state/agent-plans/`. Agents read and write these files with their native file tools; the tool mapping stays configurable in `.agents/mcp.json → memoryConfig.tools`.

### Documents and reports

Use `docs/decisions/` for approach proposals and ADRs, with a `Status` field such as `draft`, `accepted`, or `superseded`. UI design belongs in `DESIGN.md`. Work plans stay in `docs/plans/work/`, and adopted API contracts stay in `docs/plans/contracts/`.

Execution reports and contract drafts belong in `.agents/results/`. When a document becomes a maintained project reference, move it to the relevant `docs/` directory and leave a link at its previous location. See [Artifact Layout](./artifact-layout.md) for the complete layout and migration commands.

### Workspaces

<!-- oma-docs:ignore-start -->
The `-w` flag on `agent spawn` isolates an agent to a specific directory. This is critical for parallel execution. Without workspace isolation, two agents might modify the same file simultaneously, creating conflicts. Standard workspace layout: `./apps/api` (backend), `./apps/web` (frontend), `./apps/mobile` (mobile).
<!-- oma-docs:ignore-end -->

---

## Tips

1. **Be specific in prompts.** "Build a TODO app with JWT auth, React frontend, Express backend, PostgreSQL" produces better results than "make an app."

2. **Use workspaces for parallel agents.** Always pass `-w ./path` to prevent file conflicts between agents running simultaneously.

3. **Lock API contracts before spawning implementation agents.** Run `/plan` first so frontend and backend agents agree on endpoint shapes.

4. **Monitor actively.** Open a dashboard terminal to catch failing agents early rather than discovering issues after all agents complete.

5. **Iterate with re-spawns.** If an agent's output is not right, re-spawn it with the original task plus correction context. Do not start over.

6. **Match coordination to the task.** Start with a single skill for one domain; use the [selection guide](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) when the task needs coordination or an explicit quality process.

7. **Use `/brainstorm` before `/plan` for ambiguous ideas.** Brainstorm clarifies intent and approach before the PM agent decomposes into tasks.

8. **Run `/deepinit` on new codebases.** It creates AGENTS.md and ARCHITECTURE.md that help all agents understand the project structure.

9. **Configure `model_preset`.** Start with `auto`, choose a fixed preset such as `claude`, `antigravity`, `codex`, `qwen`, `cursor`, `kiro`, or `mixed`, or use `free` with its local gateway. Add `agents:` overrides for fine-grained control. See [Per-Agent Models](./per-agent-models.md).

10. **Use `/ultrawork` when you explicitly want its full review process.** The 5-phase workflow runs 12 isolated review steps; skill loading alone does not run those checks.

---

## Troubleshooting

Common problems are below. For error messages, run-result failures, schedules, and hooks, see [Troubleshooting](./troubleshooting.md).

| Problem | Cause | Fix |
|---------|-------|-----|
| Skills not detected in IDE | `.agents/skills/` missing or no `SKILL.md` files | Run the installer (`bunx oh-my-agent@latest`), verify symlinks in `.claude/skills/`, restart IDE |
| CLI not found when spawning | Selected AI CLI not installed or outside `PATH` | Run `which <selected-cli>` (for example, `claude`, `codex`, `agy`, `qwen`, or `kiro-cli`), open a new shell, or install it per the installation guide |
| Agents producing conflicting code | No workspace isolation | Use separate workspaces: `-w ./apps/api`, `-w ./apps/web` |
| Dashboard shows "No agents detected yet" | Agents have not written to memory yet, or the dashboard watches another directory | Wait for the first progress file; run from the project root or pass `--project-root <path>` |
| `oma dashboard web` exits with "port 9847 is already in use" | Another process holds the port | `DASHBOARD_PORT=8080 oma dashboard web` |
| QA report has 50+ issues | Normal for first review of large codebases | Focus on CRITICAL and HIGH severity first. Document MEDIUM/LOW for future sprints. |
| Auto-detection triggers wrong workflow | Keyword ambiguity | Use explicit `/command` instead of natural language. Report false triggers for improvement. |
| Persistent workflow will not stop | State file still exists | Say "workflow done" in the chat, or manually delete the state file from `.agents/state/` |
| Agent blocked on HIGH clarification | Requirements too ambiguous | Provide the specific answers the agent requested, then re-run |
| MCP tools not working | Serena not configured or not running | Run `oma doctor` to verify MCP config |
| Agent exceeds its execution budget | Task too complex for one run | Decompose the task, use a workflow with explicit task boundaries, or retry with a narrower acceptance contract |
| Wrong CLI used for agent | `model_preset` not configured or agent override missing | Run `oma install` to configure, or set `model_preset` in `oma-config.yaml`. See [Per-Agent Models](./per-agent-models.md). |

---

## Next steps

- One change in one domain: [Single Skill](./single-skill.md)
- A feature across several domains: [Multi-Agent Projects](./multi-agent-project.md)
- A bug with an error message: [Bug Fixing](./bug-fixing.md)
- Watch a run: [Dashboard Monitoring](./dashboard-monitoring.md)
- Audit or resume agent results: [Results and Resume](./agent-results-and-resume.md)
- Find or migrate OMA documents: [Artifact Layout](./artifact-layout.md)
- Something failed: [Troubleshooting](./troubleshooting.md)
- Project integration details: [Integration Guide](./integration.md)
- Terms used in these guides: [Glossary](../getting-started/glossary.md)
