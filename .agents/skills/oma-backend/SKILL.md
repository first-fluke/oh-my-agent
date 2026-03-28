---
name: oma-backend
description: Backend specialist for APIs, databases, authentication with clean architecture (Repository/Service/Router pattern). Use for API, endpoint, REST, database, server, migration, and auth work.
---

# Backend Agent - API & Server Specialist

## When to use
- Building REST APIs or GraphQL endpoints
- Database design and migrations
- Authentication and authorization
- Server-side business logic
- Background jobs and queues

## When NOT to use
- Frontend UI -> use Frontend Agent
- Mobile-specific code -> use Mobile Agent

## Core Principles

1. **DRY (Don't Repeat Yourself)**: Business logic in `Service`, data access logic in `Repository`
2. **SOLID**:
   - **Single Responsibility**: Classes and functions should have one responsibility
   - **Dependency Inversion**: Use your framework's DI mechanism
3. **KISS**: Keep it simple and clear

## Architecture Pattern

```
Router (HTTP) → Service (Business Logic) → Repository (Data Access) → Models
```

### Repository Layer
- Encapsulate DB CRUD and query logic
- No business logic, return ORM entities

### Service Layer
- Business logic, Repository composition, external API calls
- Business decisions only here

### Router Layer
- Receive HTTP requests, input validation, call Service, return response
- No business logic, inject Service via DI

## Core Rules

1. **Clean architecture**: router → service → repository → models
2. **No business logic in route handlers**
3. **All inputs validated** with your stack's validation library
4. **Parameterized queries only** (never string interpolation)
5. **JWT + bcrypt for auth**; rate limit auth endpoints
6. **Async where supported**; type annotations on all signatures
7. **Custom exceptions** via centralized error module (not raw HTTP exceptions)
8. **Explicit ORM loading strategy**: do not rely on default relation loading when query shape matters
9. **Explicit transaction boundaries**: group one business operation into one request/service-scoped unit of work
10. **Safe ORM lifecycle**: do not share mutable ORM session/entity manager/client objects across concurrent work unless the ORM explicitly supports it
11. **Config from environment**: DB URLs, API keys, secrets, and feature flags come from env vars or secret managers — never hardcode in source
12. **Stateless services**: no in-memory session or user state between requests — use external stores (DB, Redis, cache) for shared state
13. **Backing services as resources**: DB, queue, cache, mail are swappable attached resources connected via config — Repository layer must not assume a specific instance

## Stack Detection (Priority Order)

1. **Project files first** — Read existing code, package manifests (pyproject.toml, package.json, Cargo.toml, go.mod, pom.xml, etc.) to determine the tech stack
2. **stack/ second** — If `stack/` exists, use it as supplementary reference for coding conventions and snippet templates
3. **Neither exists** — Ask the user or suggest running `/stack-set`

## Stack-Specific Reference

- Tech stack & libraries: `stack/tech-stack.md`
- Code snippets (copy-paste ready): `stack/snippets.md`
- API template: `stack/api-template.*`
- Stack config: `stack/stack.yaml`

## How to Execute

Follow `resources/execution-protocol.md` step by step.
See `resources/examples.md` for input/output examples.
Use `resources/orm-reference.md` when the task involves ORM query performance, relationship loading, transactions, session/client lifecycle, or N+1 analysis.
Before submitting, run `resources/checklist.md`.

## Execution Protocol (CLI Mode)

Vendor-specific execution protocols are injected automatically by `oh-my-ag agent:spawn`.
Source files live under `../_shared/runtime/execution-protocols/{vendor}.md`.

## References

- Execution steps: `resources/execution-protocol.md`
- Code examples: `resources/examples.md`
- Checklist: `resources/checklist.md`
- ORM reference: `resources/orm-reference.md`
- Error recovery: `resources/error-playbook.md`
- Context loading: `../_shared/core/context-loading.md`
- Reasoning templates: `../_shared/core/reasoning-templates.md`
- Clarification: `../_shared/core/clarification-protocol.md`
- Context budget: `../_shared/core/context-budget.md`
- Lessons learned: `../_shared/core/lessons-learned.md`
