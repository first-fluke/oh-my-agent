---
title: "Guide : Projets Multi-Agents"
description: Guide complet pour coordonner plusieurs agents de domaine en frontend, backend, base de données, mobile et QA — de la planification au merge.
---

# Guide : Projets multi-agents

## Quand utiliser la coordination multi-agents

Votre fonctionnalité couvre plusieurs domaines -- API backend + UI frontend + schéma de base de données + client mobile + revue QA. Un seul agent ne peut pas gérer l'ensemble du périmètre, et vous avez besoin que les domaines progressent en parallèle sans écraser mutuellement leurs fichiers.

La coordination multi-agents est le bon choix lorsque :

- La tâche implique 2 domaines ou plus (frontend, backend, mobile, db, QA, debug, pm).
- Il y a des contrats d'API entre les domaines (ex. : un endpoint REST consommé à la fois par le web et le mobile).
- Vous souhaitez une exécution parallèle pour réduire le temps réel d'exécution.
- Vous avez besoin d'une revue QA après l'implémentation sur tous les domaines.

Si votre tâche s'inscrit entièrement dans un seul domaine, utilisez directement l'agent spécifique à la place.

---

## The Full Sequence: /plan to /review

The recommended multi-agent workflow follows a strict four-step pipeline.

### Step 1: /plan — Requirements and Task Decomposition

The `/plan` workflow runs inline (no subagent spawning) and produces a structured plan.

```
/plan
```

What happens:

1. **Gather requirements** — The PM agent asks about target users, core features, constraints, and deployment targets.
2. **Analyze technical feasibility** — Uses MCP code analysis tools (`get_symbols_overview`, `find_symbol`, `search_for_pattern`) to scan the existing codebase for reusable code and architecture patterns.
3. **Define API contracts** — Designs endpoint contracts (method, path, request/response schemas, auth, error responses) and saves them to `.agents/skills/_shared/core/api-contracts/`.
4. **Decompose into tasks** — Breaks the project into actionable tasks, each with: assigned agent, title, acceptance criteria, priority (P0-P3), and dependencies.
5. **Review plan with user** — Presents the full plan for confirmation. The workflow will not proceed without explicit user approval.
6. **Save plan** — Writes the approved plan to `.agents/results/plan-{sessionId}.json` and records a summary in memory.

The output `.agents/results/plan-{sessionId}.json` is the input for both `/work` and `/orchestrate`.

### Step 2: /work or /orchestrate — Execution

You have two execution paths:

| Aspect | /work | /orchestrate |
|:-------|:-----------|:-------------|
| **Interaction** | Interactive — user confirms at each stage | Automated — runs to completion |
| **PM planning** | Built-in (Step 2 runs PM agent) | Requires plan from /plan |
| **User checkpoint** | After plan review (Step 3) | Before starting (plan must exist) |
| **Persistent mode** | Yes — cannot be terminated until complete | Yes — cannot be terminated until complete |
| **Best for** | First-time use, complex projects needing oversight | Repeat runs, well-defined tasks |

#### /work — Interactive Multi-Agent Pipeline

```
/work
```

1. Analyzes the user's request and identifies involved domains.
2. Runs the PM agent for task decomposition (creates plan-\{sessionId\}.json).
3. Presents plan for user confirmation — **blocks until confirmed**.
4. Spawns agents by priority tier (P0 first, then P1, etc.), with each same-priority task running in parallel.
5. Monitors agent progress via memory files.
6. Runs QA agent review on all deliverables (OWASP Top 10, performance, accessibility, code quality).
7. If QA finds CRITICAL or HIGH issues, re-spawns the responsible agent with QA findings. Repeats up to 2 times per issue. If the same issue persists, activates the **Exploration Loop** — generates 2-3 alternative approaches, spawns the same agent type with different hypothesis prompts in separate workspaces, QA scores each, and the best result is adopted.

#### /orchestrate — Automated Parallel Execution

```
/orchestrate
```

1. Loads `.agents/results/plan-{sessionId}.json` (will not proceed without one).
2. Initializes a session with ID format `session-YYYYMMDD-HHMMSS`.
3. Creates `orchestrator-session.md` and `task-board.md` in the memory directory.
4. Spawns agents per priority tier, each getting: task description, API contracts, and context.
5. Monitors progress by polling `progress-{agent}.md` files.
6. Verifies each completed agent via `verify.sh` — PASS (exit 0) accepts, FAIL (exit 1) re-spawns with error context (max 2 retries), and persistent failure triggers the Exploration Loop.
7. Collects all `result-{agent}.md` files and compiles a final report.

### Step 3: agent:spawn — CLI-Level Agent Management

The `agent:spawn` command is the low-level mechanism that workflows call internally. You can also use it directly:

```bash
oma agent:spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

**All flags:**

| Flag | Description |
|:-----|:-----------|
| `-m, --model <vendor>` | CLI vendor override (gemini/claude/codex/qwen). Overrides all config. |
| `-w, --workspace <path>` | Working directory for the agent. Auto-detected from monorepo config if omitted. |

**Vendor resolution order** (first match wins):

1. `--model` flag on the command line
2. `model_preset (per-agent overrides via `agents:`)` in `oma-config.yaml` for this specific agent type
3. `default_cli` in `oma-config.yaml`
4. `active_vendor` in `cli-config.yaml`
5. `gemini` (hardcoded default)

**Workspace auto-detection** checks monorepo configs in this order: pnpm-workspace.yaml, package.json workspaces, lerna.json, nx.json, turbo.json, mise.toml. Each workspace directory is scored against agent type keywords (e.g., "web", "frontend", "client" for the frontend agent). If no monorepo config is found, it falls back to hardcoded candidates like `apps/web`, `apps/frontend`, `frontend/`, etc.

**Prompt resolution:** The `<prompt>` argument can be either inline text or a file path. If the path resolves to an existing file, its contents are read and used as the prompt. The CLI also injects vendor-specific execution protocols from `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`.

### Step 4: /review — QA Verification

```
/review
```

The review workflow runs a full QA pipeline:

1. **Identify scope** — Asks what to review (specific files, feature branch, or entire project).
2. **Automated security checks** — Runs `npm audit`, `bandit`, or equivalent.
3. **OWASP Top 10 manual review** — Injection, broken auth, sensitive data, access control, misconfig, insecure deserialization, vulnerable components, insufficient logging.
4. **Performance analysis** — N+1 queries, missing indexes, unbounded pagination, memory leaks, unnecessary re-renders, bundle sizes.
5. **Accessibility** — WCAG 2.1 AA: semantic HTML, ARIA, keyboard nav, color contrast, focus management.
6. **Code quality** — Naming, error handling, test coverage, TypeScript strict mode, unused imports, async/await patterns.
7. **Report** — Findings categorized as CRITICAL / HIGH / MEDIUM / LOW with `file:line`, description, and remediation code.

For large scopes, the workflow delegates to the QA agent subagent. With the `--fix` option, it enters a Fix-Verify Loop: spawn domain agents to fix CRITICAL/HIGH issues, re-review, repeat up to 3 times.

---

## Session ID Strategy

Every orchestration session gets a unique identifier in the format:

```
session-YYYYMMDD-HHMMSS
```

Example: `session-20260324-143052`

The session ID is used to:

- Name memory files (`orchestrator-session.md`, `task-board.md`)
- Track agent processes via PID files in the system temp directory (`/tmp/subagent-{session-id}-{agent-id}.pid`)
- Correlate log files (`/tmp/subagent-{session-id}-{agent-id}.log`)
- Group results in `.agents/results/parallel-{timestamp}/`

The session ID is generated at Step 2 of `/orchestrate` and passed to all spawned agents. This ensures all agents, logs, and PID files for a single run can be traced back to one session.

---

## Workspace Assignment Per Domain

Each agent is spawned in an isolated workspace directory to prevent file conflicts. The assignment follows these rules:

### Automatic Detection

When `-w` is omitted (or set to `.`), the CLI detects the best workspace by:

1. Scanning monorepo config files (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml).
2. Expanding glob patterns (e.g., `apps/*`) into actual directories.
3. Scoring each directory against agent-type keywords:

| Agent Type | Keywords (in priority order) |
|:-----------|:---------------------------|
| frontend | web, frontend, client, ui, app, dashboard, admin, portal |
| backend | api, backend, server, service, gateway, core |
| mobile | mobile, ios, android, native, rn, expo |

4. Exact directory name match scores 100, contains-keyword scores 50, path-contains scores 25.
5. Highest-scoring directory wins.

### Fallback Candidates

If no monorepo config exists, the CLI checks hardcoded paths in order:

- **frontend:** `apps/web`, `apps/frontend`, `apps/client`, `packages/web`, `packages/frontend`, `frontend`, `web`, `client`
- **backend:** `apps/api`, `apps/backend`, `apps/server`, `packages/api`, `packages/backend`, `backend`, `api`, `server`
- **mobile:** `apps/mobile`, `apps/app`, `packages/mobile`, `mobile`, `app`

If nothing matches, the agent runs in the current directory (`.`).

### Explicit Override

Always available:

```bash
oma agent:spawn frontend "Build landing page" session-id -w ./packages/web-app
```

---

## Contract-First Rule

API contracts are the synchronization mechanism between agents. The contract-first rule means:

1. **Contracts are defined before implementation begins.** The `/plan` workflow's Step 3 produces API contracts that are saved to `.agents/skills/_shared/core/api-contracts/`.

2. **Every agent receives its relevant contracts as context.** When `/orchestrate` spawns agents in Step 3, each agent gets "task description, API contracts, relevant context."

3. **Contracts define the interface boundary.** A contract specifies:
   - HTTP method and path
   - Request body schema (with types)
   - Response body schema (with types)
   - Authentication requirements
   - Error response formats

4. **Contract violations are caught during monitoring.** Step 5 of `/work` uses MCP code analysis tools (`find_symbol`, `search_for_pattern`) to verify API contract alignment between agents.

5. **QA review checks contract adherence.** The QA agent's Alignment Review (Step 6 in ultrawork) explicitly compares implementation against the plan, including API contracts.

**Why this matters:** Without contracts, a backend agent might return `{ "user_id": 1 }` while the frontend agent consumes `{ "userId": 1 }`. The contract-first rule eliminates this class of integration bugs entirely.

---

## Merge Gates: 4 Conditions

Before any multi-agent work is considered complete, four conditions must be met:

### 1. Build Succeeds

All code compiles and builds without errors. This is checked by the verification script (`verify.sh`), which runs build commands appropriate to the agent type.

### 2. Tests Pass

All existing tests continue to pass, and new tests cover the implemented functionality. The QA agent reviews test coverage as part of its Code Quality Review.

### 3. Only Planned Files Modified

Agents must not modify files outside their assigned scope. The verification step checks that only files related to the agent's task have been changed. This prevents agents from making unintended side effects in shared code.

### 4. QA Review Clear

No CRITICAL or HIGH findings remain from the QA agent's review. MEDIUM and LOW findings can be documented for future sprints, but blockers must be resolved.

In the ultrawork workflow, these translate into explicit **phase gates** (PLAN_GATE, IMPL_GATE, VERIFY_GATE, REFINE_GATE, SHIP_GATE) with checkbox-style criteria that must all pass before proceeding.

---

## Spawn Examples

### Single Agent Spawn

```bash
# Spawn backend agent with Gemini (default)
oma agent:spawn backend "Implement /api/users CRUD endpoint per API contract" session-20260324-143000

# Spawn frontend agent with Claude, explicit workspace
oma agent:spawn frontend "Build user dashboard with React" session-20260324-143000 -m claude -w ./apps/web

# Spawn from a prompt file
oma agent:spawn backend ./prompts/auth-api.md session-20260324-143000 -w ./api
```

### Parallel Execution via agent:parallel

Using a YAML tasks file:

```yaml
# tasks.yaml
tasks:
  - agent: backend
    task: "Implement user authentication API with JWT tokens"
    workspace: ./api
  - agent: frontend
    task: "Build login page and auth flow UI"
    workspace: ./web
  - agent: mobile
    task: "Implement mobile auth screens with biometric support"
    workspace: ./mobile
```

```bash
oma agent:parallel tasks.yaml
```

Using inline mode:

```bash
oma agent:parallel --inline \
  "backend:Implement user auth API:./api" \
  "frontend:Build login page:./web" \
  "mobile:Implement auth screens:./mobile"
```

Background mode (no wait):

```bash
oma agent:parallel tasks.yaml --no-wait
# Returns immediately, results written to .agents/results/parallel-{timestamp}/
```

With vendor override:

```bash
oma agent:parallel tasks.yaml -m claude
```

---

## Anti-Patterns to Avoid

### 1. Skipping the Plan

Starting `/orchestrate` without a plan file. The workflow will refuse to proceed. Always run `/plan` first, or use `/work` which has built-in planning.

### 2. Overlapping Workspaces

Assigning two agents to the same workspace directory. This causes file conflicts — one agent's changes overwrite another's. Always use separate workspace directories.

### 3. Missing API Contracts

Spawning backend and frontend agents without defining contracts first. They will make incompatible assumptions about data formats, field names, and error handling.

### 4. Ignoring QA Findings

Treating QA review as optional. CRITICAL and HIGH findings represent real bugs that will surface in production. The workflow enforces this by looping until no blockers remain.

### 5. Manual File Coordination

Trying to manually merge agent outputs instead of letting the verification and QA pipeline handle integration. The automated pipeline catches issues that manual review misses.

### 6. Over-Parallelization

Running P1 tasks before P0 tasks complete. Priority tiers exist because P1 tasks often depend on P0 outputs. The workflows enforce tier ordering automatically.

### 7. Skipping Verification

Using `agent:spawn` directly without running the verification script afterward. The verification step catches build failures, test regressions, and scope violations that would otherwise propagate.

---

## Cross-Domain Integration Validation

After all agents complete their individual tasks, cross-domain integration must be validated:

1. **API contract alignment** — MCP tools (`find_symbol`, `search_for_pattern`) verify that backend implementations match the contracts consumed by frontend and mobile.

2. **Type consistency** — TypeScript types, Python dataclasses, or Dart models shared across domains must use consistent field names and types.

3. **Authentication flow** — If the backend implements JWT auth, the frontend must correctly send tokens in headers, and the mobile app must store and refresh them appropriately.

4. **Error handling** — All consumers of an API must handle the documented error responses. If the backend returns `{ "error": "unauthorized", "code": 401 }`, all clients must handle this format.

5. **Database schema alignment** — If the database agent creates migrations, the backend ORM models must match the schema exactly.

The QA agent's Alignment Review (Step 6 in ultrawork, Step 6 in work) performs this cross-domain validation systematically.

---

## When It's Done

A multi-agent project is complete when:

- All agents in all priority tiers have completed successfully.
- Verification scripts pass for every agent (exit code 0).
- QA review reports zero CRITICAL and zero HIGH findings.
- Cross-domain API contract alignment is confirmed.
- Build succeeds and all tests pass.
- The final report is written to memory and presented to the user.
- User gives final approval (in `/work` and ultrawork's SHIP_GATE).
