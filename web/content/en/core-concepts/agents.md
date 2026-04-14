---
title: Agents
description: Complete reference for all 14 oh-my-agent agents — their domains, tech stacks, resource files, capabilities, charter preflight protocol, two-layer skill loading, scoped execution rules, quality gates, workspace strategy, orchestration flow, and runtime memory.
---

# Agents

Agents in oh-my-agent are specialized engineering roles. Each agent has a defined domain, tech stack knowledge, resource files, quality gates, and execution constraints. Agents are not generic chatbots — they are scoped workers that stay in their lane and follow structured protocols.

The agent definitions under `.agents/agents/` are the source of truth. OMA projects them into vendor-native files for runtimes that support custom subagents:

- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.gemini/agents/*.md`

When a workflow maps an agent to the same vendor as the current runtime, it should use that runtime's native agent file first. Cross-vendor tasks fall back to `oma agent:spawn`.

---

## Agent Categories

| Category | Agents | Responsibility |
|----------|--------|---------------|
| **Ideation** | oma-brainstorm | Exploring ideas, proposing approaches, producing design documents |
| **Planning** | oma-pm | Requirements decomposition, task breakdown, API contracts, priority assignment |
| **Implementation** | oma-frontend, oma-backend, oma-mobile, oma-db | Writing production code in their respective domains |
| **Design** | oma-design | Design systems, DESIGN.md, tokens, typography, color, motion, accessibility |
| **Infrastructure** | oma-tf-infra | Multi-cloud Terraform provisioning, IAM, cost optimization, policy-as-code |
| **DevOps** | oma-dev-workflow | mise task runner, CI/CD, migrations, release coordination, monorepo automation |
| **Quality** | oma-qa | Security audit (OWASP), performance, accessibility (WCAG), code quality review |
| **Debugging** | oma-debug | Bug reproduction, root cause analysis, minimal fixes, regression tests |
| **Localization** | oma-translator | Context-aware translation preserving tone, register, and domain terms |
| **Coordination** | oma-orchestrator, oma-coordination | Automated and manual multi-agent orchestration |
| **Git** | oma-scm | Conventional Commits generation, feature-based commit splitting |

---

## Detailed Agent Reference

### oma-brainstorm

**Domain:** Design-first ideation before planning or implementation.

**When to use:** Exploring a new feature idea, understanding user intent, comparing approaches. Use before `/plan` for complex or ambiguous requests.

**When NOT to use:** Clear requirements (go to oma-pm), implementation (go to domain agents), code review (go to oma-qa).

**Core rules:**
- No implementation or planning before design approval
- One clarifying question at a time (not batches)
- Always propose 2-3 approaches with a recommended option
- Section-by-section design with user confirmation at each step
- YAGNI — design only what is needed

**Workflow:** 6 phases: Context exploration, Questions, Approaches, Design, Documentation (saves to `docs/plans/`), Transition to `/plan`.

**Resources:** Uses shared resources only (clarification-protocol, reasoning-templates, quality-principles, skill-routing).

---

### oma-pm

**Domain:** Product management — requirements analysis, task decomposition, API contracts.

**When to use:** Breaking down complex features, determining feasibility, prioritizing work, defining API contracts.

**Core rules:**
- API-first design: define contracts before implementation tasks
- Every task has: agent, title, acceptance criteria, priority, dependencies
- Minimize dependencies for maximum parallel execution
- Security and testing are part of every task (not separate phases)
- Tasks must be completable by a single agent
- Output JSON plan + task-board.md for orchestrator compatibility

**Output:** `.agents/results/plan-{sessionId}.json`, `.agents/results/result-pm.md`, memory write for orchestrator.

**Resources:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/`.

**Turn limits:** Default 10, max 15.

---

### oma-frontend

**Domain:** Web UI — React, Next.js, TypeScript with FSD-lite architecture.

**When to use:** Building user interfaces, components, client-side logic, styling, form validation, API integration.

**Tech stack:**
- React + Next.js (Server Components default, Client Components for interactivity)
- TypeScript (strict)
- TailwindCSS v4 + shadcn/ui (read-only primitives, extend via cva/wrappers)
- FSD-lite: root `src/` + feature `src/features/*/` (no cross-feature imports)

**Libraries:**
| Purpose | Library |
|---------|---------|
| Dates | luxon |
| Styling | TailwindCSS v4 + shadcn/ui |
| Hooks | ahooks |
| Utils | es-toolkit |
| URL State | nuqs |
| Server State | TanStack Query |
| Client State | Jotai (minimize use) |
| Forms | @tanstack/react-form + Zod |
| Auth | better-auth |

**Core rules:**
- shadcn/ui first, extend via cva, never modify `components/ui/*` directly
- Design tokens 1:1 mapping (never hardcode colors)
- Proxy over middleware (Next.js 16+ uses `proxy.ts`, not `middleware.ts` for proxy logic)
- No prop drilling beyond 3 levels — use Jotai atoms
- Absolute imports with `@/` mandatory
- FCP target < 1s
- Responsive breakpoints: 320px, 768px, 1024px, 1440px

**Resources:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`.

**Quality gate checklist:**
- Accessibility: ARIA labels, semantic headings, keyboard navigation
- Mobile: verified on mobile viewports
- Performance: no CLS, fast load
- Resilience: Error Boundaries and Loading Skeletons
- Tests: logic covered by Vitest
- Quality: typecheck and lint pass

**Turn limits:** Default 20, max 30.

---

### oma-backend

**Domain:** APIs, server-side logic, authentication, database operations.

**When to use:** REST/GraphQL APIs, database migrations, auth, server business logic, background jobs.

**Architecture:** Router (HTTP) -> Service (Business Logic) -> Repository (Data Access) -> Models.

**Stack detection:** Reads project manifests (pyproject.toml, package.json, Cargo.toml, go.mod, etc.) to determine language and framework. Falls back to `stack/` directory if present, or asks user to run `/stack-set`.

**Core rules:**
- Clean architecture: no business logic in route handlers
- All inputs validated with the project's validation library
- Parameterized queries only (never string interpolation in SQL)
- JWT + bcrypt for auth; rate limit auth endpoints
- Async where supported; type annotations on all signatures
- Custom exceptions via centralized error module
- Explicit ORM loading strategy, transaction boundaries, safe lifecycle

**Resources:** `execution-protocol.md`, `examples.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. Stack-specific resources in `stack/` (generated by `/stack-set`): `tech-stack.md`, `snippets.md`, `api-template.*`, `stack.yaml`.

**Turn limits:** Default 20, max 30.

---

### oma-mobile

**Domain:** Cross-platform mobile apps — Flutter, React Native.

**When to use:** Native mobile apps (iOS + Android), mobile-specific UI patterns, platform features (camera, GPS, push notifications), offline-first architecture.

**Architecture:** Clean Architecture: domain -> data -> presentation.

**Tech stack:** Flutter/Dart, Riverpod/Bloc (state management), Dio with interceptors (API), GoRouter (navigation), Material Design 3 (Android) + iOS HIG.

**Core rules:**
- Riverpod/Bloc for state management (no raw setState for complex logic)
- All controllers disposed in `dispose()` method
- Dio with interceptors for API calls; handle offline gracefully
- 60fps target; test on both platforms

**Resources:** `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`, `examples.md`.

**Turn limits:** Default 20, max 30.

---

### oma-db

**Domain:** Database architecture — SQL, NoSQL, vector databases.

**When to use:** Schema design, ERD, normalization, indexing, transactions, capacity planning, backup strategy, migration design, vector DB/RAG architecture, anti-pattern review, compliance-aware design (ISO 27001/27002/22301).

**Default workflow:** Explore (identify entities, access patterns, volume) -> Design (schema, constraints, transactions) -> Optimize (indexes, partitioning, archival, anti-patterns).

**Core rules:**
- Choose model first, engine second
- 3NF default for relational; document BASE tradeoffs for distributed
- Document all three schema layers: external, conceptual, internal
- Integrity is first-class: entity, domain, referential, business-rule
- Concurrency is never implicit: define transaction boundaries and isolation levels
- Vector DBs are retrieval infrastructure, not source-of-truth
- Never treat vector search as a drop-in replacement for lexical search

**Required deliverables:** External schema summary, conceptual schema, internal schema, data standards table, glossary, capacity estimation, backup/recovery strategy. For vector/RAG: embedding version policy, chunking policy, hybrid retrieval strategy.

**Resources:** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-design

**Domain:** Design systems, UI/UX, DESIGN.md management.

**When to use:** Creating design systems, landing pages, design tokens, color palettes, typography, responsive layouts, accessibility review.

**Workflow:** 7 phases: Setup (context gathering) -> Extract (optional, from reference URLs) -> Enhance (vague prompt augmentation) -> Propose (2-3 design directions) -> Generate (DESIGN.md + tokens) -> Audit (responsive, WCAG, Nielsen, AI slop check) -> Handoff.

**Anti-pattern enforcement ("no AI slop"):**
- Typography: system font stack default; no default Google Fonts without justification
- Color: no purple-to-blue gradients, no gradient orbs/blobs, no pure white on pure black
- Layout: no nested cards, no desktop-only layouts, no cookie-cutter 3-metric stat layouts
- Motion: no bounce easing everywhere, no animations > 800ms, must respect prefers-reduced-motion
- Components: no glassmorphism everywhere, all interactive elements need keyboard/touch alternatives

**Core rules:**
- Check `.design-context.md` first; create if missing
- System font stack default (CJK-ready fonts for ko/ja/zh)
- WCAG AA minimum for all designs
- Responsive-first (mobile as default)
- Present 2-3 directions, get confirmation

**Resources:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, plus `reference/` directory (typography, color-and-contrast, spatial-design, motion-design, responsive-design, component-patterns, accessibility, shader-and-3d) and `examples/` (design-context-example, landing-page-prompt).

---

### oma-tf-infra

**Domain:** Infrastructure-as-code with Terraform, multi-cloud.

**When to use:** Provisioning on AWS/GCP/Azure/Oracle Cloud, Terraform configuration, CI/CD authentication (OIDC), CDN/load balancers/storage/networking, state management, ISO compliance infrastructure.

**Cloud detection:** Reads Terraform providers and resource prefixes (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). Includes a full multi-cloud resource mapping table.

**Core rules:**
- Provider-agnostic: detect cloud from project context
- Remote state with versioning and locking
- OIDC-first for CI/CD auth
- Plan before apply always
- Least privilege IAM
- Tag everything (Environment, Project, Owner, CostCenter)
- No secrets in code
- Version pin all providers and modules
- No auto-approve in production

**Resources:** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-dev-workflow

**Domain:** Monorepo task automation and CI/CD.

**When to use:** Running dev servers, executing lint/format/typecheck across apps, database migrations, API generation, i18n builds, production builds, CI/CD optimization, pre-commit validation.

**Core rules:**
- Always use `mise run` tasks instead of direct package manager commands
- Run lint/test only on changed apps
- Validate commit messages with commitlint
- CI should skip unchanged apps
- Never use direct package manager commands when mise tasks exist

**Resources:** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`.

---

### oma-qa

**Domain:** Quality assurance — security, performance, accessibility, code quality.

**When to use:** Final review before deployment, security audits, performance analysis, accessibility compliance, test coverage analysis.

**Review priority order:** Security > Performance > Accessibility > Code Quality.

**Severity levels:**
- **CRITICAL**: Security breach, data loss risk
- **HIGH**: Blocks launch
- **MEDIUM**: Fix this sprint
- **LOW**: Backlog

**Core rules:**
- Every finding must include file:line, description, and fix
- Run automated tools first (npm audit, bandit, lighthouse)
- No false positives — every finding must be reproducible
- Provide remediation code, not just descriptions

**Resources:** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

**Turn limits:** Default 15, max 20.

---

### oma-debug

**Domain:** Bug diagnosis and fixing.

**When to use:** User-reported bugs, crashes, performance issues, intermittent failures, race conditions, regression bugs.

**Methodology:** Reproduce first, then diagnose. Never guess at fixes.

**Core rules:**
- Identify root cause, not just symptoms
- Minimal fix: change only what is necessary
- Every fix gets a regression test
- Search for similar patterns elsewhere
- Document in `.agents/results/`

**Serena MCP tools used:**
- `find_symbol("functionName")` — locate the function
- `find_referencing_symbols("Component")` — find all usages
- `search_for_pattern("error pattern")` — find similar issues

**Resources:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

**Turn limits:** Default 15, max 25.

---

### oma-translator

**Domain:** Context-aware multilingual translation.

**When to use:** Translating UI strings, documentation, marketing copy, reviewing existing translations, creating glossaries.

**4-stage method:** Analyze Source (register, intent, domain terms, cultural references, emotional connotations, figurative language mapping) -> Extract Meaning (strip source structure) -> Reconstruct in Target Language (natural word order, register matching, sentence splitting/merging) -> Verify (naturalness rubric + anti-AI pattern check).

**Optional 7-stage refined mode** for publication quality: extends with Critical Review, Revision, and Polish stages.

**Core rules:**
- Scan existing locale files first to match conventions
- Translate meaning, not words
- Preserve emotional connotations
- Never produce word-for-word translations
- Never mix registers within a piece
- Preserve domain-specific terminology as-is

**Resources:** `translation-rubric.md`, `anti-ai-patterns.md`.

---

### oma-orchestrator

**Domain:** Automated multi-agent coordination via CLI spawning.

**When to use:** Complex features requiring multiple agents in parallel, automated execution, full-stack implementation.

**Configuration defaults:**

| Setting | Default | Description |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | Maximum concurrent subagents |
| MAX_RETRIES | 2 | Retry attempts per failed task |
| POLL_INTERVAL | 30s | Status check interval |
| MAX_TURNS (impl) | 20 | Turn limit for backend/frontend/mobile |
| MAX_TURNS (review) | 15 | Turn limit for qa/debug |
| MAX_TURNS (plan) | 10 | Turn limit for pm |

**Workflow phases:** Plan -> Setup (session ID, memory initialization) -> Execute (spawn by priority tier) -> Monitor (poll progress) -> Verify (automated + cross-review loop) -> Collect (compile results).

**Agent-to-agent review loop:**
1. Self-review: agent checks own diff against acceptance criteria
2. Automated verify: `oma verify {agent-type} --workspace {workspace}`
3. Cross-review: QA agent reviews changes
4. On failure: issues fed back for fixing (max 5 total loop iterations)

**Clarification Debt monitoring:** Tracks user corrections during sessions. Events scored as clarify (+10), correct (+25), redo (+40). CD >= 50 triggers mandatory RCA. CD >= 80 pauses session.

**Resources:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**Domain:** Software configuration management (SCM) and Git — branching, merges, worktrees, baselines, audit readiness, plus Conventional Commits.

**When to use:** After code changes (`/scm`), merge conflicts, branch strategy, releases/tags, or any repo CM question.

**Commit types:** feat, fix, refactor, docs, test, chore, style, perf.

**Workflow (commits):** Analyze changes → Split by feature when needed → type → scope → description (imperative, under 72 chars, lowercase, no trailing period) → commit with explicit paths.

**Rules:**
- Never use `git add -A` or `git add .`
- Never commit secrets files
- Always specify files when staging
- Use HEREDOC for multi-line commit messages
- Co-Author: `First Fluke <our.first.fluke@gmail.com>`

---

### oma-coordination

**Domain:** Manual step-by-step multi-agent coordination guide.

**When to use:** Complex projects where you want human-in-the-loop control at every gate, manual agent spawning guidance, step-by-step coordination recipes.

**When NOT to use:** Fully automated parallel execution (use oma-orchestrator), single-domain tasks (use the domain agent directly).

**Core rules:**
- Always present the plan for user confirmation before spawning agents
- One priority tier at a time — wait for completion before next tier
- User approves each gate transition
- QA review is mandatory before merging
- Issue remediation loop for CRITICAL/HIGH findings

**Workflow:** PM plans → User confirms → Spawn by priority tier → Monitor → QA review → Fix issues → Ship.

**Difference from oma-orchestrator:** Coordination is manual and guided (user controls pace), orchestrator is automated (agents spawn and run with minimal user intervention).

---

## Charter Preflight (CHARTER_CHECK)

Before writing any code, every implementation agent must output a CHARTER_CHECK block:

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {agent domain}
- Must NOT do: {3 constraints from task scope}
- Success criteria: {measurable criteria}
- Assumptions: {defaults applied}
```

**Purpose:**
- Declares what the agent will and will not do
- Catches scope creep before code is written
- Makes assumptions explicit for user review
- Provides testable success criteria

**Clarification levels:**
- **LOW**: Clear requirements. Proceed with stated assumptions.
- **MEDIUM**: Partially ambiguous. List options, proceed with most likely.
- **HIGH**: Very ambiguous. Set status to blocked, list questions, DO NOT write code.

In subagent mode (CLI-spawned), agents cannot ask users directly. LOW proceeds, MEDIUM narrows and interprets, HIGH blocks and returns questions for the orchestrator to relay.

---

## Two-Layer Skill Loading

Each agent's knowledge is split across two layers:

**Layer 1 — SKILL.md (~800 bytes):**
Always loaded. Contains frontmatter (name, description), when to use / not use, core rules, architecture overview, library list, and references to Layer 2 resources.

**Layer 2 — resources/ (loaded on-demand):**
Loaded only when the agent is actively working, and only the resources matching the task type and difficulty:

| Difficulty | Resources Loaded |
|-----------|-----------------|
| **Simple** | execution-protocol.md only |
| **Medium** | execution-protocol.md + examples.md |
| **Complex** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

Additional resources are loaded during execution as needed:
- `checklist.md` — at the Verify step
- `error-playbook.md` — only when errors occur
- `common-checklist.md` — for final verification of Complex tasks

---

## Scoped Execution

Agents operate under strict domain boundaries:

- A frontend agent will not modify backend code
- A backend agent will not touch UI components
- A DB agent will not implement API endpoints
- Agents document out-of-scope dependencies for other agents

When a task is discovered that belongs to a different domain during execution, the agent documents it in its result file as an escalation item, rather than attempting to handle it.

---

## Workspace Strategy

For multi-agent projects, separate workspaces prevent file conflicts:

```
./apps/api      → backend agent workspace
./apps/web      → frontend agent workspace
./apps/mobile   → mobile agent workspace
```

Workspaces are specified with the `-w` flag when spawning agents:

```bash
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Orchestration Flow

When running a multi-agent workflow (`/orchestrate` or `/work`):

1. **PM Agent** decomposes the request into domain-specific tasks with priorities (P0, P1, P2) and dependencies
2. **Session initialized** — session ID generated, `orchestrator-session.md` and `task-board.md` created in memory
3. **P0 tasks** spawned in parallel (up to MAX_PARALLEL concurrent agents)
4. **Progress monitored** — orchestrator polls `progress-{agent}.md` files every POLL_INTERVAL
5. **P1 tasks** spawned after P0 completes, and so on
6. **Verification loop** runs for each completed agent (self-review -> automated verify -> cross-review by QA)
7. **Results collected** from all `result-{agent}.md` files
8. **Final report** with session summary, files changed, remaining issues

---

## Agent Definitions

Agents are defined in two locations:

**`.agents/agents/`** — Contains the abstract source-of-truth agent definitions, including:
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`
- `architecture-reviewer.md`
- `tf-infra-engineer.md`

These files define the agent's identity, execution protocol reference, CHARTER_CHECK template, architecture summary, and rules. They are used when spawning subagents via the Task/Agent tool (Claude Code) or CLI.

**Vendor-native projections** — OMA materializes the source definitions into runtime-specific agent files:
- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.gemini/agents/*.md`

These generated files are refreshed by `oma link`, `oma install`, and `oma update`.

---

## Runtime State (Serena Memory)

During orchestration sessions, agents coordinate through shared memory files in `.serena/memories/` (configurable via `mcp.json`):

| File | Owner | Purpose | Others |
|------|-------|---------|--------|
| `orchestrator-session.md` | Orchestrator | Session ID, status, start time, phase tracking | Read-only |
| `task-board.md` | Orchestrator | Task assignments, priorities, status updates | Read-only |
| `progress-{agent}.md` | That agent | Turn-by-turn progress: actions taken, files read/modified, current status | Orchestrator reads |
| `result-{agent}.md` | That agent | Final output: status (completed/failed), summary, files changed, acceptance criteria checklist | Orchestrator reads |
| `session-metrics.md` | Orchestrator | Clarification Debt tracking, Quality Score progression | QA reads |
| `experiment-ledger.md` | Orchestrator/QA | Experiment tracking when Quality Score is active | All read |

Memory tools are configurable. Default uses Serena MCP (`read_memory`, `write_memory`, `edit_memory`), but custom tools can be configured in `mcp.json`:

```json
{
  "memoryConfig": {
    "provider": "serena",
    "basePath": ".serena/memories",
    "tools": {
      "read": "read_memory",
      "write": "write_memory",
      "edit": "edit_memory"
    }
  }
}
```

Dashboards (`oma dashboard` and `oma dashboard:web`) watch these memory files for real-time monitoring.
