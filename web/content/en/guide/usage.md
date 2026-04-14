---
title: Usage Guide
description: Comprehensive usage guide for oh-my-agent — quick start, detailed real-world examples covering single tasks, multi-domain projects, bug fixes, design systems, CLI parallel execution, and ultrawork. All workflow commands, auto-detection examples in multiple languages, all 14 skills with use cases, dashboard setup, key concepts, tips, and troubleshooting.
---

# How to Use oh-my-agent

## Quick Start

1. Open your project in an AI-powered IDE (Claude Code, Gemini CLI, Cursor, Antigravity, etc.)
2. Skills are auto-detected from `.agents/skills/`
3. Describe what you want in natural language — oh-my-agent routes to the right agent
4. For multi-agent work, use `/work` or `/orchestrate`

That is the entire workflow. No special syntax required for single-domain tasks.

---

## Example 1: Simple Single Task

**You type:**
```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**What happens:**

1. The `oma-frontend` skill auto-activates (keywords: "form", "component", "Tailwind CSS")
2. Layer 1 (SKILL.md) is already loaded — agent identity, core rules, library list
3. Layer 2 resources load on-demand:
   - `execution-protocol.md` — the 4-step workflow (Analyze, Plan, Implement, Verify)
   - `snippets.md` — form + Zod validation patterns
   - `component-template.tsx` — React component structure
4. Agent outputs a **CHARTER_CHECK**:
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
5. Agent implements:
   - React component with TypeScript in `src/features/auth/components/login-form.tsx`
   - Zod validation schema in `src/features/auth/utils/login-validation.ts`
   - Vitest tests in `src/features/auth/utils/__tests__/login-validation.test.ts`
   - Loading skeleton in `src/features/auth/components/skeleton/login-form-skeleton.tsx`
6. Agent runs the checklist: accessibility (ARIA labels, semantic HTML, keyboard nav), mobile viewport, performance (no CLS), error boundaries

**Output:** A production-ready React component with TypeScript, validation, tests, and accessibility — not just a suggestion.

---

## Example 2: Multi-Domain Project

**You type:**
```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**What happens:**

1. Keyword detection identifies this as multi-domain (frontend + backend + mobile)
2. If you have not used a workflow command, oh-my-agent suggests `/work` or `/orchestrate`

**Using `/work` (step-by-step with user control):**

```
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Step 1 — PM Agent plans:**
   - Identifies domains: backend (auth API, task CRUD), frontend (login, task list UI), mobile (Flutter app)
   - Defines API contracts: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`
   - Creates prioritized task breakdown:
     - P0: Backend auth API, Backend task CRUD API
     - P1: Frontend login/register, Frontend task list, Mobile auth screens, Mobile task list
     - P2: QA review
   - Saves to `.agents/results/plan-{sessionId}.json`

4. **Step 2 — You review and confirm the plan**

5. **Step 3 — Agents spawn by priority:**
   ```bash
   # P0 tier (parallel)
   oma agent:spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 -w ./apps/api &
   oma agent:spawn db "User and task schema design" session-todo-01 &
   wait

   # P1 tier (parallel, after P0 completes)
   oma agent:spawn frontend "Login, register, task list UI" session-todo-01 -w ./apps/web &
   oma agent:spawn mobile "Auth and task screens" session-todo-01 -w ./apps/mobile &
   wait
   ```

6. **Step 4 — QA Agent reviews:**
   - Security: OWASP Top 10 compliance (JWT validation, CSRF, SQL injection check)
   - Performance: N+1 query check, pagination verification
   - Accessibility: WCAG 2.1 AA on all frontend components
   - Cross-domain: API contract alignment between frontend, mobile, and backend

7. **Step 5 — Iterate:** If QA finds CRITICAL issues, re-spawn the responsible agent with the QA report.

---

## Example 3: Bug Fixing

**You type:**
```
There's a bug — clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**What happens:**

1. `oma-debug` activates automatically (keywords: "bug", "error", "Cannot read property")
2. **Step 1 — Collect:** The error message and context are captured
3. **Step 2 — Reproduce:** MCP `search_for_pattern` finds the `.map()` call in `src/features/tasks/components/task-list.tsx`
4. **Step 3 — Diagnose:** MCP `find_referencing_symbols` traces the data flow:
   - `useQuery` hook fetches tasks from API
   - Component renders before data arrives
   - `tasks` is `undefined` during loading state
   - Root cause: missing loading state check before `.map()`
5. **Step 4 — Propose fix:** Present minimal change — add loading state check and null guard
6. **Step 5 — Implement:**
   - Add loading skeleton while data fetches
   - Add null check: `tasks?.map()` or early return for loading state
   - Write regression test that verifies component renders correctly when `tasks` is undefined
7. **Step 6 — Similar pattern scan:** MCP `search_for_pattern` searches for other `.map()` calls on potentially undefined arrays
   - Finds 3 similar patterns in `user-list.tsx`, `comment-list.tsx`, `notification-list.tsx`
   - Proactively applies the same fix pattern
8. **Step 7 — Document:** Bug report written to memory with root cause, fix, and prevention

---

## Example 4: Design System

**You type:**
```
Design a dark premium landing page for my B2B SaaS analytics product
```

**What happens:**

1. `oma-design` activates (keywords: "design", "landing page", "dark", "premium")
2. **Phase 1 — SETUP:** Checks for `.design-context.md`. If missing, asks:
   - What languages does the service support? (en only / + CJK)
   - Target audience? (B2B, technical users, 25-45)
   - Brand personality? (professional / premium)
   - Aesthetic direction? (dark premium)
   - Reference sites? (user provides examples)
   - Accessibility? (WCAG AA)
3. **Phase 3 — ENHANCE:** If the prompt is vague, transforms it into section-by-section specification
4. **Phase 4 — PROPOSE:** Presents 3 design directions:
   - **Direction A: "Midnight Observatory"** — Deep navy (#0f1729), cyan accents (#22d3ee), Inter + JetBrains Mono, bento grid layout, scroll-driven reveals
   - **Direction B: "Carbon Interface"** — Neutral gray (#18181b), amber accents (#f59e0b), system fonts, chess layout, hover-driven micro-interactions
   - **Direction C: "Deep Space"** — Pure dark (#0a0a0a), emerald accents (#10b981), Geist + Geist Mono, full-bleed sections, entrance animations
5. **Phase 5 — GENERATE:** Based on chosen direction, generates:
   - `DESIGN.md` with 6 sections (typography, color, spacing, motion, components, accessibility)
   - CSS custom properties
   - Tailwind config extensions
   - shadcn/ui theme variables
6. **Phase 6 — AUDIT:** Runs checks for responsive (320px minimum), WCAG 2.2, Nielsen heuristics, AI slop detection
7. **Phase 7 — HANDOFF:** "Design complete. Run `/orchestrate` to implement with oma-frontend."

---

## Example 5: CLI Parallel Execution

```bash
# Single agent — simple task
oma agent:spawn frontend "Add dark mode toggle to the header" session-ui-01

# Three agents in parallel — full-stack feature
oma agent:spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent:spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent:spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# After editing .agents/agents/ or workflows, regenerate vendor-native files
oma link claude codex gemini

# Monitor while agents work (separate terminal)
oma dashboard        # Terminal UI with live table
oma dashboard:web    # Web UI at http://localhost:9847

# After implementation, run QA
oma agent:spawn qa "Review notification feature across all platforms" session-notif-01

# Check session statistics after completion
oma stats
```

If your current runtime matches the target vendor in `.agents/oma-config.yaml`, workflows should prefer native subagents:

- Claude Code -> `.claude/agents/*.md`
- Codex CLI -> `.codex/agents/*.toml`
- Gemini CLI -> `.gemini/agents/*.md`

Cross-vendor tasks still use `oma agent:spawn`.

---

## Example 6: Ultrawork — Maximum Quality

**You type:**
```
/ultrawork Build a payment processing module with Stripe integration
```

**What happens (5 phases, 17 steps, 11 review steps):**

**Phase 1 — PLAN (Steps 1-4, PM Agent inline):**
- Step 1: Create plan with task breakdown, API contracts, dependencies
- Step 2: Plan Review — completeness check (are all requirements mapped?)
- Step 3: Meta Review — self-verify the review was sufficient
- Step 4: Over-Engineering Review — MVP focus, no unnecessary complexity
- PLAN_GATE: Plan documented, assumptions listed, user confirms

**Phase 2 — IMPL (Step 5, Dev Agents spawned):**
- Backend agent implements Stripe integration (webhooks, idempotency, error handling)
- Frontend agent builds checkout flow and payment status UI
- Step 5.2: Measure baseline Quality Score (tests, lint, typecheck)
- IMPL_GATE: Build succeeds, tests pass, only planned files modified

**Phase 3 — VERIFY (Steps 6-8, QA Agent spawned):**
- Step 6: Alignment Review — does implementation match the plan?
- Step 7: Security/Bug Review — OWASP, npm audit, Stripe security best practices
- Step 8: Improvement/Regression Review — no regressions introduced
- VERIFY_GATE: Zero CRITICAL, zero HIGH, Quality Score >= 75

**Phase 4 — REFINE (Steps 9-13, Debug Agent spawned):**
- Step 9: Split large files (> 500 lines) and functions (> 50 lines)
- Step 10: Integration/Reuse Review — eliminate duplicate logic
- Step 11: Side Effect Review — trace cascade impact with `find_referencing_symbols`
- Step 12: Full Change Review — naming consistency, style alignment
- Step 13: Clean up dead code
- REFINE_GATE: Quality Score non-regressed, code clean

**Phase 5 — SHIP (Steps 14-17, QA Agent spawned):**
- Step 14: Code Quality Review — lint, types, coverage
- Step 15: UX Flow Verification — end-to-end payment user journey
- Step 16: Related Issues Review — final cascade impact check
- Step 17: Deployment Readiness — secrets management, migration scripts, rollback plan
- SHIP_GATE: All checks pass, user gives final approval

---

## All 15 Workflow Commands

| Command | Type | What It Does | When to Use |
|---------|------|-------------|-------------|
| `/orchestrate` | Persistent | Automated parallel agent execution with monitoring and verification loops | Large projects needing maximum parallelism |
| `/work` | Persistent | Step-by-step multi-domain coordination with user approval at each gate | Features spanning multiple agents where you want control |
| `/ultrawork` | Persistent | 5-phase, 17-step quality workflow with 11 review checkpoints | Maximum quality delivery, production-critical code |
| `/plan` | Non-persistent | PM-driven task breakdown and API contract definition | Before any complex multi-agent work |
| `/exec-plan` | Non-persistent | Create and track execution plans as repository artifacts | Complex features needing tracked progress and decision logs |
| `/brainstorm` | Non-persistent | Design-first ideation with 2-3 approach proposals | Before committing to an implementation approach |
| `/deepinit` | Non-persistent | Full project initialization — AGENTS.md, ARCHITECTURE.md, docs/ | Setting up oh-my-agent in an existing codebase |
| `/review` | Non-persistent | QA pipeline: OWASP security, performance, accessibility, code quality | Before merging code, pre-deployment review |
| `/debug` | Non-persistent | Structured debugging: reproduce, diagnose, fix, regression test, scan | Investigating bugs and errors |
| `/design` | Non-persistent | 7-phase design workflow producing DESIGN.md with tokens | Building design systems, landing pages, UI redesigns |
| `/scm` | Non-persistent | SCM workflow for Git (branch/merge/conflict/worktree/baseline) plus Conventional Commit generation with auto type/scope detection and feature splitting | After completing code changes or when handling repository configuration management tasks |
| `/tools` | Non-persistent | MCP tool visibility management (enable/disable groups) | Controlling which MCP tools agents can use |
| `/stack-set` | Non-persistent | Auto-detect project tech stack and generate backend references | Setting up language-specific coding conventions |
| `/ralph` | Persistent | Self-referential completion loop wrapping ultrawork with independent judge | When agents must keep working until verifiable criteria pass |

---

## Auto-Detection Examples

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

## All 14 Skills — Quick Reference

| Skill | Best For | Primary Output |
|-------|---------|---------------|
| **oma-brainstorm** | "I have an idea", exploring approaches | Design document in `docs/plans/` |
| **oma-pm** | "plan this", task breakdown | `.agents/results/plan-{sessionId}.json`, `task-board.md` |
| **oma-frontend** | UI components, forms, pages, styling | React/TypeScript components, Vitest tests |
| **oma-backend** | APIs, auth, server logic, migrations | Endpoints, models, services, tests |
| **oma-db** | Schema design, ERD, query tuning, capacity planning | Schema documentation, migration scripts, glossary |
| **oma-mobile** | Mobile apps, platform features | Flutter screens, state management, tests |
| **oma-design** | Design systems, landing pages, tokens | `DESIGN.md`, CSS/Tailwind tokens, component specs |
| **oma-qa** | Security audit, performance, accessibility | QA report with CRITICAL/HIGH/MEDIUM/LOW findings |
| **oma-debug** | Bug investigation, root cause analysis | Fixed code + regression tests + similar pattern fixes |
| **oma-tf-infra** | Cloud infrastructure provisioning | Terraform modules, IAM policies, cost estimates |
| **oma-dev-workflow** | CI/CD, monorepo tasks, release automation | mise.toml configs, pipeline definitions |
| **oma-translator** | Multilingual content, i18n files | Translated text preserving tone and register |
| **oma-orchestrator** | Automated parallel agent execution | Orchestrated results from multiple agents |
| **oma-scm** | Git commits | Conventional Commits with proper type/scope |

---

## Dashboard Setup

### Terminal Dashboard

```bash
oma dashboard
```

Displays a live-updating table in your terminal:
- Session ID and overall status (RUNNING / COMPLETED / FAILED)
- Per-agent rows: status, turn count, latest activity, elapsed time
- Watches `.serena/memories/` for real-time progress updates

### Web Dashboard

```bash
oma dashboard:web
# Opens http://localhost:9847
```

Features:
- Real-time updates via WebSocket (no manual refresh)
- Auto-reconnect on connection drops
- Session status with color-coded agent indicators (green=complete, yellow=running, red=failed)
- Activity log streaming from progress and result files
- Historical session data

### Recommended Layout

Use 3 terminals:
1. **Dashboard terminal:** `oma dashboard` — continuous monitoring
2. **Command terminal:** Agent spawn commands, workflow commands
3. **Build terminal:** Test runs, build logs, git operations

---

## Key Concepts Explained

### Progressive Disclosure

Skills load in two layers to save tokens. Layer 1 (SKILL.md, ~800 bytes) is always present. Layer 2 (resources/) loads only when the agent is working, and only the resources matching the task difficulty. This saves approximately 75% of tokens compared to loading everything upfront. On flash-tier models (128K context), this means approximately 125K tokens available for actual work instead of 108K.

### Token Optimization

Beyond progressive disclosure, oh-my-agent optimizes tokens through:
- **Context budget management** — no full file reads; use `find_symbol` instead of `read_file`
- **Lazy resource loading** — load error playbooks only on errors, checklists only at verification
- **Difficulty-based branching** — Simple tasks skip analysis and use minimal checklists
- **Progress tracking** — agents record read files to prevent re-reads

### CLI Spawning

When you run `oma agent:spawn`, the CLI:
1. Resolves the vendor (using the 5-level priority)
2. Injects the vendor-specific execution protocol from `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`
3. Composes the agent prompt using the SKILL.md core rules, execution protocol, and task-relevant resources
4. Spawns the agent as an independent CLI process
5. The agent writes progress to `.serena/memories/progress-{agent}.md`
6. On completion, writes final result to `.serena/memories/result-{agent}.md`

### Serena Memory

Agents coordinate through shared memory files at `.serena/memories/`. The orchestrator writes `orchestrator-session.md` (session state) and `task-board.md` (task assignments). Each agent writes its own `progress-{agent}.md` (turn-by-turn updates) and `result-{agent}.md` (final output). Memory tools are configurable — defaults are `read_memory`, `write_memory`, `edit_memory` via Serena MCP.

### Workspaces

The `-w` flag on `agent:spawn` isolates an agent to a specific directory. This is critical for parallel execution — without workspace isolation, two agents might modify the same file simultaneously, creating conflicts. Standard workspace layout: `./apps/api` (backend), `./apps/web` (frontend), `./apps/mobile` (mobile).

---

## Tips

1. **Be specific in prompts.** "Build a TODO app with JWT auth, React frontend, Express backend, PostgreSQL" produces better results than "make an app."

2. **Use workspaces for parallel agents.** Always pass `-w ./path` to prevent file conflicts between agents running simultaneously.

3. **Lock API contracts before spawning implementation agents.** Run `/plan` first so frontend and backend agents agree on endpoint shapes.

4. **Monitor actively.** Open a dashboard terminal to catch failing agents early rather than discovering issues after all agents complete.

5. **Iterate with re-spawns.** If an agent's output is not right, re-spawn it with the original task plus correction context. Do not start over.

6. **Start with `/work` when unsure.** It provides step-by-step guidance with user confirmation at each gate.

7. **Use `/brainstorm` before `/plan` for ambiguous ideas.** Brainstorm clarifies intent and approach before the PM agent decomposes into tasks.

8. **Run `/deepinit` on new codebases.** It creates AGENTS.md and ARCHITECTURE.md that help all agents understand the project structure.

9. **Configure agent-CLI mapping.** Route complex reasoning tasks (qa, debug, frontend) to Claude and fast generation tasks (backend, pm) to Gemini.

10. **Use `/ultrawork` for production-critical code.** The 5-phase, 11-review-step workflow catches issues that simpler workflows miss.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Skills not detected in IDE | `.agents/skills/` missing or no `SKILL.md` files | Run the installer (`bunx oh-my-agent@latest`), verify symlinks in `.claude/skills/`, restart IDE |
| CLI not found when spawning | AI CLI not installed globally | `which gemini` / `which claude` — install missing CLIs per the installation guide |
| Agents producing conflicting code | No workspace isolation | Use separate workspaces: `-w ./apps/api`, `-w ./apps/web` |
| Dashboard shows "No agents detected" | Agents have not written to memory yet | Wait for agents to start (first write at turn 1), or verify session ID matches |
| Web dashboard will not start | Dependencies not installed | Run `bun install` in the web/ directory first |
| QA report has 50+ issues | Normal for first review of large codebases | Focus on CRITICAL and HIGH severity first. Document MEDIUM/LOW for future sprints. |
| Auto-detection triggers wrong workflow | Keyword ambiguity | Use explicit `/command` instead of natural language. Report false triggers for improvement. |
| Persistent workflow will not stop | State file still exists | Say "workflow done" in the chat, or manually delete the state file from `.agents/state/` |
| Agent blocked on HIGH clarification | Requirements too ambiguous | Provide the specific answers the agent requested, then re-run |
| MCP tools not working | Serena not configured or not running | Run `oma doctor` to verify MCP config |
| Agent exceeds turn limit | Task too complex for default turns | Increase turns with `-t 30` flag, or decompose into smaller tasks |
| Wrong CLI used for agent | agent_cli_mapping not configured | Run `oma install` to configure, or edit `oma-config.yaml` directly |

---

For single-domain task patterns, see [Single Skill Guide](./single-skill).
For project integration details, see [Integration Guide](./integration).
