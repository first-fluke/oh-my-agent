---
title: "Anwendungsfall: Einzelner Skill"
description: Wenn du nur einen Agenten für eine fokussierte Aufgabe brauchst — der schnelle Weg.
---

# Single Skill Execution

Single skill execution is the fast path — one agent, one domain, one focused task. No orchestration overhead, no multi-agent coordination. The skill auto-activates from your natural language prompt.

---

## When to Use Single Skill

Use this when your task meets ALL of these criteria:

- **Owned by one domain** — the entire task belongs to frontend, backend, mobile, database, design, infrastructure, or another single domain
- **Self-contained** — no cross-domain API contract changes, no backend changes needed for a frontend task
- **Clear scope** — you know what the output should be (a component, an endpoint, a schema, a fix)
- **No coordination** — other agents do not need to run before or after

**Examples of single-skill tasks:**
- Build one UI component
- Add one API endpoint
- Fix one bug in one layer
- Design one database table
- Write one Terraform module
- Translate one set of i18n strings
- Create one design system section

**Switch to multi-agent** (`/coordinate` or `/orchestrate`) when:
- UI work needs a new API contract (frontend + backend)
- One fix cascades across layers (debug + implementation agents)
- The feature spans frontend, backend, and database
- Scope grows beyond one domain after the first iteration

---

## Preflight Checklist

Before prompting, answer these four questions (they map to the [Prompt Structure](/core-concepts/skills) four elements):

| Element | Question | Why It Matters |
|---------|----------|----------------|
| **Goal** | What specific artifact should be created or changed? | Prevents ambiguity — "add a button" vs "add a form with validation" |
| **Context** | What stack, framework, and conventions apply? | Agent detects from project files, but explicit is better |
| **Constraints** | What rules must be followed? (style, security, performance, compatibility) | Without constraints, agents use defaults that may not match your project |
| **Done When** | What acceptance criteria will you check? | Gives the agent a target and you a verification checklist |

If any element is missing from your prompt, the agent will either:
- **LOW uncertainty:** Apply defaults and list assumptions
- **MEDIUM uncertainty:** Present 2-3 options and proceed with the most likely
- **HIGH uncertainty:** Block and ask questions (will not write code)

---

## Prompt Template

```text
Build <specific artifact> using <stack/framework>.
Constraints: <style, performance, security, or compatibility constraints>.
Acceptance criteria:
1) <testable criterion>
2) <testable criterion>
3) <testable criterion>
Add tests for: <critical test cases>.
```

### Template Breakdown

| Part | Purpose | Example |
|------|---------|---------|
| `Build <specific artifact>` | The Goal — what to create | "Build a user registration form component" |
| `using <stack/framework>` | The Context — tech stack | "using React + TypeScript + Tailwind CSS" |
| `Constraints:` | Rules the agent must follow | "accessible labels, no external form libraries, client-side validation only" |
| `Acceptance criteria:` | Done When — verifiable outcomes | "1) email format validation 2) password strength indicator 3) submit disabled while invalid" |
| `Add tests for:` | Test requirements | "valid/invalid submit paths, edge cases for email validation" |

---

## Real Examples

### Frontend: Login Form

```text
Create a login form component in React + TypeScript + Tailwind CSS.
Constraints: accessible labels, client-side validation with Zod, no external form library beyond @tanstack/react-form, shadcn/ui Button and Input components.
Acceptance criteria:
1) Email validation with meaningful error messages
2) Password minimum 8 characters with feedback
3) Disabled submit button while form is invalid
4) Keyboard and screen-reader friendly (ARIA labels, focus management)
5) Loading state while submitting
Add unit tests for: valid submission path, invalid email, short password, loading state.
```

**Expected execution flow:**

1. **Skill activation:** `oma-frontend` activates (keywords: "form", "component", "Tailwind CSS", "React")
2. **Difficulty assessment:** Medium (2-3 files, some design decisions around validation UX)
3. **Resources loaded:**
   - `execution-protocol.md` (always)
   - `snippets.md` (form + Zod patterns)
   - `component-template.tsx` (React structure)
4. **CHARTER_CHECK output:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
5. **Implementation:**
   - Creates `src/features/auth/components/login-form.tsx` (Client Component with `"use client"`)
   - Creates `src/features/auth/utils/login-schema.ts` (Zod schema)
   - Creates `src/features/auth/components/skeleton/login-form-skeleton.tsx`
   - Uses shadcn/ui `<Button>`, `<Input>`, `<Label>` (read-only, no modifications)
   - Form handled by `@tanstack/react-form` with Zod validation
   - Absolute imports with `@/`
   - One component per file
6. **Verification:**
   - Checklist: ARIA labels present, semantic headings, keyboard navigation works
   - Mobile: renders correctly at 320px viewport
   - Performance: no CLS
   - Tests: Vitest test file at `src/features/auth/utils/__tests__/login-schema.test.ts`

---

### Backend: REST API Endpoint

```text
Add a paginated GET /api/tasks endpoint that returns tasks for the authenticated user.
Constraints: Repository-Service-Router pattern, parameterized queries, JWT auth required, cursor-based pagination.
Acceptance criteria:
1) Returns only tasks owned by the authenticated user
2) Cursor-based pagination with next/prev cursors
3) Filterable by status (todo, in_progress, done)
4) Response includes total count
Add tests for: auth required, pagination, status filter, empty results.
```

**Expected execution flow:**

1. **Skill activation:** `oma-backend` activates (keywords: "API", "endpoint", "REST")
2. **Stack detection:** Reads `pyproject.toml` or `package.json` to determine language/framework. If `stack/` exists, loads conventions from there.
3. **Difficulty assessment:** Medium (2-3 files: route, service, repository, plus test)
4. **Resources loaded:**
   - `execution-protocol.md` (always)
   - `stack/snippets.md` if available (route, paginated query patterns)
   - `stack/tech-stack.md` if available (framework-specific API)
5. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **Implementation:**
   - Repository: `TaskRepository.find_by_user(user_id, cursor, status, limit)` with parameterized query
   - Service: `TaskService.get_user_tasks(user_id, cursor, status, limit)` — business logic wrapper
   - Router: `GET /api/tasks` with JWT auth middleware, input validation, response formatting
   - Tests: auth required returns 401, pagination returns correct cursor, filter works, empty returns 200 with empty array

---

### Mobile: Settings Screen

```text
Build a settings screen in Flutter with profile editing (name, email, avatar), notification preferences (toggle switches), and a logout button.
Constraints: Riverpod for state management, GoRouter for navigation, Material Design 3, handle offline gracefully.
Acceptance criteria:
1) Profile fields pre-populated from user data
2) Changes saved on submit with loading indicator
3) Notification toggles persist locally (SharedPreferences)
4) Logout clears token storage and navigates to login
5) Offline: show cached data with "offline" banner
Add tests for: profile save, logout flow, offline state.
```

**Expected execution flow:**

1. **Skill activation:** `oma-mobile` activates (keywords: "Flutter", "screen", "mobile")
2. **Difficulty assessment:** Medium (settings screen + state management + offline handling)
3. **Resources loaded:**
   - `execution-protocol.md`
   - `snippets.md` (screen template, Riverpod provider pattern)
   - `screen-template.dart`
4. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
5. **Implementation:**
   - Screen: `lib/features/settings/presentation/settings_screen.dart` (Stateless Widget with Riverpod)
   - Providers: `lib/features/settings/providers/settings_provider.dart`
   - Repository: `lib/features/settings/data/settings_repository.dart`
   - Offline handling: Dio interceptor catches `SocketException`, falls back to cached data
   - All controllers disposed in `dispose()` method

---

### Database: Schema Design

```text
Design a database schema for a multi-tenant SaaS project management tool. Entities: Organization, Project, Task, User, TeamMembership.
Constraints: PostgreSQL, 3NF, soft delete with deleted_at, audit fields (created_at, updated_at, created_by), row-level security for tenant isolation.
Acceptance criteria:
1) ERD with all relationships documented
2) External, conceptual, and internal schema layers documented
3) Index strategy for common query patterns (tasks by project, tasks by assignee)
4) Capacity estimation for 10K orgs, 100K users, 1M tasks
5) Backup strategy with full + incremental cadence
Add deliverables: data standards table, glossary, migration script.
```

**Expected execution flow:**

1. **Skill activation:** `oma-db` activates (keywords: "database", "schema", "ERD", "migration")
2. **Difficulty assessment:** Complex (architecture decisions, multiple entities, capacity planning)
3. **Resources loaded:**
   - `execution-protocol.md`
   - `document-templates.md` (deliverable structure)
   - `examples.md`
   - `anti-patterns.md` (review during optimization)
4. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **Workflow:** Explore (entities, relationships, access patterns, volume estimates) -> Design (external/conceptual/internal schemas, constraints, lifecycle fields) -> Optimize (indexes for query patterns, partitioning strategy, backup plan, anti-pattern review)
6. **Deliverables:**
   - External schema summary (views per role: admin, project manager, team member)
   - Conceptual schema with ERD (Organization 1:N Project, Project 1:N Task, Organization 1:N TeamMembership, etc.)
   - Internal schema with physical DDL, indexes, partitioning
   - Data standards table (field naming rules, type conventions)
   - Glossary (tenant, workspace, assignee, etc.)
   - Capacity estimation sheet
   - Backup strategy (daily full + hourly incremental, 30-day retention)
   - Migration script

---

## Quality Gate Checklist

After the agent delivers its output, verify these items before accepting:

### Universal Checks (All Agents)

- [ ] **Behavior matches acceptance criteria** — every criterion from your prompt is satisfied
- [ ] **Tests cover happy path and key edge cases** — not just the happy path
- [ ] **No unrelated file changes** — only files relevant to the task were modified
- [ ] **Shared modules not broken** — imports, types, and interfaces used by other code still work
- [ ] **Charter was followed** — the "Must NOT do" constraints were respected
- [ ] **Lint, typecheck, build pass** — run your project's standard checks

### Frontend-Specific

- [ ] Accessibility: interactive elements have `aria-label`, semantic headings, keyboard navigation works
- [ ] Mobile: renders correctly at 320px, 768px, 1024px, 1440px breakpoints
- [ ] Performance: no CLS, FCP target met
- [ ] Error boundaries and loading skeletons implemented
- [ ] shadcn/ui components not directly modified (wrappers used instead)
- [ ] Absolute imports with `@/` (no relative `../../`)

### Backend-Specific

- [ ] Clean architecture maintained: no business logic in route handlers
- [ ] All inputs validated (no trusting user input)
- [ ] Parameterized queries only (no string interpolation in SQL)
- [ ] Custom exceptions via centralized error module (no raw HTTP exceptions)
- [ ] Auth endpoints rate-limited

### Mobile-Specific

- [ ] All controllers disposed in `dispose()` method
- [ ] Offline gracefully handled
- [ ] 60fps target maintained (no jank)
- [ ] Tested on both iOS and Android

### Database-Specific

- [ ] At least 3NF (or documented justification for denormalization)
- [ ] All three schema layers documented (external, conceptual, internal)
- [ ] Integrity constraints explicit (entity, domain, referential, business-rule)
- [ ] Anti-pattern review completed

---

## Escalation Signals

Watch for these signals that indicate you should switch from single-skill to multi-agent execution:

| Signal | What It Means | Action |
|--------|--------------|--------|
| Agent says "this requires a backend change" | Task has cross-domain dependencies | Switch to `/coordinate` — add backend agent |
| Agent's CHARTER_CHECK shows "Must NOT do" items that are actually needed | Scope exceeds one domain | Plan the full feature with `/plan` first |
| Fix cascades into 3+ files across different layers | One fix affects multiple domains | Use `/debug` with broader scope, or `/coordinate` |
| Agent discovers an API contract mismatch | Frontend/backend disagreement | Run `/plan` to define contracts, then re-spawn both agents |
| Quality gate fails on integration points | Components do not connect properly | Add QA review step: `oma agent:spawn qa "Review integration"` |
| Task grows from "one component" to "three components + new route + API" | Scope creep during execution | Stop, run `/plan` to decompose, then `/orchestrate` |
| Agent blocks with HIGH clarification | Requirements fundamentally ambiguous | Answer the agent's questions or run `/brainstorm` to clarify approach |

### The General Rule

If you find yourself re-spawning the same agent more than twice with refinements, the task is probably multi-domain and needs `/coordinate` or at minimum a `/plan` step to decompose it properly.
