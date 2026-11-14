---
name: oma-backend
description: "Implement server APIs, authentication, and application data access. Schema modeling and query tuning use oma-db."
---

# Backend Agent - API & Server Specialist

## Scheduling

### Goal
Implement or review backend APIs, authentication, database integration, server-side business logic, and migrations using the project's existing backend stack and clean architecture boundaries.

### Intent signature
- User asks for API, endpoint, REST, GraphQL, auth, server, migration, repository, service, router, or background job work.
- User needs backend code that coordinates validation, business logic, persistence, transactions, and backing services.

### When to use
- Building REST APIs or GraphQL endpoints
- Data access code and migrations that an API change needs
- Authentication and authorization
- Server-side business logic
- Background jobs and queues

### When NOT to use
- Frontend UI -> use Frontend Agent
- Mobile-specific code -> use Mobile Agent
- Schema modeling, index design, and query tuning -> use `oma-db`

### Expected inputs
- Target feature, endpoint, migration, auth flow, or server behavior
- Existing backend stack files such as manifests, routes, services, models, and database config
- API contracts, schemas, validation rules, and persistence requirements
- Required verification commands or project conventions

### Expected outputs
- Backend code changes in router, service, repository, model, migration, or test files
- Validated inputs, safe queries, transaction boundaries, and error handling
- Verification status: which checks ran, and what was not verified

### Dependencies
- Project stack manifests and existing backend conventions
- `resources/execution-protocol.md`, `resources/checklist.md`, and `resources/orm-reference.md`
<!-- oma-docs:ignore-start -->
- Optional stack reference (`stack/`, or the matching `variants/<language>/`): `stack.yaml`, `tech-stack.md`, snippets, and API templates
<!-- oma-docs:ignore-end -->
- Database, queue, cache, mail, auth, or external API resources configured through environment or secret managers

### Control-flow features
- Branches by detected stack, ORM/query pattern, auth requirement, migration impact, and transaction scope
- Reads and writes codebase files
- May touch local database migrations or generated code
- Must not hardcode secrets or share unsafe ORM lifecycle objects across concurrent work

## Structural Flow

### Entry
1. Detect the backend stack from project files first.
2. Identify affected router, service, repository, model, migration, and test boundaries.
3. Load stack-specific references only when needed.

### Scenes
1. **PREPARE**: Determine stack, architecture boundaries, and acceptance criteria.
2. **ACQUIRE**: Read existing routes, services, repositories, models, schemas, and config.
3. **ACT**: Implement backend changes with validation, business logic, persistence, and tests.
4. **VERIFY**: Select the relevant lint, type, test, and migration checks and review the applicable checklist items. Run a check only when the user or the active workflow requires it; otherwise report what was not verified.
5. **FINALIZE**: Report changed behavior, verification, and unresolved risks.

### Transitions
- If stack files exist, follow them before generic guidance.
- If ORM performance, relationship loading, transactions, or N+1 risk appears, use `resources/orm-reference.md`.
- If database schema impact is primary and API work is secondary, coordinate with `oma-db`.
- If auth server setup touches DB adapters or server libraries, keep it in backend scope.

### Failure and recovery
- If stack cannot be determined, ask the user or suggest running `/stack-set`.
- If a required check fails, fix the root cause before handoff.
- If required secrets or services are unavailable, document the blocker and keep code configurable.

### Exit
- Success: backend change is implemented, covered by tests, and aligned with local architecture.
- Partial success: blocker, missing dependency, or verification gap is explicit.

## Logical Operations

### Actions
| Action | SSL primitive | Evidence |
|--------|---------------|----------|
| Detect stack and conventions | `READ` | Manifests, stack files, existing code |
| Select implementation boundary | `SELECT` | Router/service/repository pattern |
| Validate inputs and schemas | `VALIDATE` | Stack validation library |
| Implement business logic | `WRITE` | Service layer code |
| Implement persistence | `WRITE` | Repository/model/migration code |
| Call external/backing services | `CALL_TOOL` | DB, queue, cache, auth, or API clients |
| Run required checks | `CALL_TOOL` | Checks the user or active workflow requires |
| Report result | `NOTIFY` | Final summary |

### Tools and instruments
- Project language/framework toolchain
- ORM or database client
- Test, lint, typecheck, and migration commands
- Stack-specific templates and snippets when present

### Canonical workflow path
Use the configured code-intelligence provider to locate files and inspect symbols
or content. For Serena, use `find_file`, `search_for_pattern`,
`get_symbols_overview`, and `find_symbol`. Native search is limited to the
provider exclusions and non-code paths permitted by the project's search policy.

<!-- oma-docs:ignore-start -->
Then select the project's verification commands (lint, typecheck, tests, and migrations when schema changes are involved), preferring the `verify:` commands in `stack/stack.yaml` when present. Run them only when the user or the active workflow requires it; otherwise report what was not verified.
<!-- oma-docs:ignore-end -->

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `CODEBASE` | Backend source, tests, schemas, migrations |
| `LOCAL_FS` | Stack references and generated artifacts |
| `PROCESS` | Required test, lint, typecheck, and migration commands |
| `CREDENTIALS` | Environment-managed DB URLs, API keys, secrets |
| `NETWORK` | External APIs or backing services when required |

### Preconditions
- Target behavior and affected backend boundary are identifiable.
- Project stack and verification commands can be inferred or are provided.
- Required credentials remain outside source code.

### Effects and side effects
- Mutates backend source files, tests, and possibly migrations.
- May change database schema, API behavior, auth behavior, or service contracts.
- May require generated clients or migration artifacts.

### Guardrails
Apply framework, library, architecture, and data-model defaults only when the target project has no established choice. Scoped edits do not authorize a stack migration or unrelated infrastructure.

### Architecture Pattern

```
Router (HTTP) → Service (Business Logic) → Repository (Data Access) → Models
```

- **Router**: receives HTTP requests, validates input, calls the Service (injected through the framework's DI), and returns the response
- **Service**: owns business decisions, Repository composition, and external API calls
- **Repository**: encapsulates DB CRUD and query logic and returns ORM entities

### Core Rules

1. **Clean architecture**: router → service → repository → models
2. **No business logic in route handlers**
3. **All inputs validated** with your stack's validation library
4. **Parameterized queries only** (never string interpolation)
5. **JWT + Argon2id for auth** (bcrypt acceptable for legacy compatibility); rate limit auth endpoints
6. **Async where supported**; type annotations on all signatures
7. **Custom exceptions** via centralized error module (not raw HTTP exceptions)
8. **Explicit ORM loading strategy**: do not rely on default relation loading when query shape matters
9. **Explicit transaction boundaries**: group one business operation into one request/service-scoped unit of work
10. **Safe ORM lifecycle**: do not share mutable ORM session/entity manager/client objects across concurrent work unless the ORM explicitly supports it
11. **Config from the environment; a fallback is declared, never implied**: DB URLs, API keys, secrets, and feature flags come from environment variables or a secret manager, never from source. A missing credential fails with a clear error by default. A deterministic local fallback is written only when the integration is declared key-optional (a key provisioned later, a demo from a clean checkout) or a test/demo mode is explicitly selected: keep the real call and the fallback as separate env-conditional branches, mark the fallback `// TODO(oma-deferred): integrate <vendor> when key is provisioned`, and label its output as simulated. A simulated payment, authentication, mail, or other effect is never reported as a completed real operation, and shipping only the fallback leaves the spec unmet.
12. **Stateless services**: no in-memory session or user state between requests; use external stores (DB, Redis, cache) for shared state
13. **Backing services as resources**: DB, queue, cache, mail are swappable attached resources connected via config; Repository layer must not assume a specific instance

### Stack Detection

1. **Project files first**: Read existing code, package manifests (pyproject.toml, package.json, Cargo.toml, go.mod, pom.xml, etc.) to determine the tech stack
2. **Stack reference second**: Use `stack/` when present; otherwise the matching `variants/<language>/`. An installed project with a chosen preset has `stack/` and no `variants/`; the plugin and source layouts have `variants/` and no `stack/`. Treat it as supplementary reference for coding conventions and snippet templates
3. **Neither applies**: Ask the user or suggest running `/stack-set`

### Stack-Specific Reference

File names are relative to the stack reference directory selected above.

<!-- oma-docs:ignore-start -->
- **Stack manifest (SSOT)**: `stack.yaml`: structured declaration (`language`, `framework`, `orm`) and the `verify:` contract. `oma verify agent backend` runs the `verify:` block of `stack/stack.yaml`. The manifest's JSON Schema is `variants/stack.schema.json` in the plugin and source layouts; an installed project does not carry it.
- Tech stack narrative: `tech-stack.md`: human-readable reference only; `stack.yaml` wins on conflict.
- Code snippets (copy-paste ready): `snippets.md`
- API template: `api-template.*`
<!-- oma-docs:ignore-end -->

## References
- Local code tools: `../_shared/core/code-intelligence.md` (code search/navigation)

- Execution steps (follow for the selected task): `resources/execution-protocol.md`
- Checklist (check the applicable items before handoff): `resources/checklist.md`
- ORM reference: `resources/orm-reference.md`
- Error recovery: `resources/error-playbook.md`
- Context loading: `../_shared/core/context-loading.md`
- Clarification: `../_shared/core/clarification-protocol.md`
- Context budget: `../_shared/core/context-budget.md`
- Lessons learned: `../_shared/core/lessons-learned.md` (matching prior failure or requested retrospective)
- Observability handoff: `../oma-observability/SKILL.md` §Integrations — propagators/baggage, span conventions, log correlation, PII redaction
