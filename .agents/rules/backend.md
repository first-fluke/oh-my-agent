---
description: Backend API coding standards with clean architecture (Router/Service/Repository pattern)
globs:
alwaysApply: false
---

# Backend Coding Standards

## Core Rules

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

## Architecture

```
Router (HTTP) → Service (Business Logic) → Repository (Data Access) → Models
```

## Principles

- **DRY**: Business logic in Service, data access in Repository
- **Single Responsibility**: Classes and functions should have one responsibility
- **Dependency Inversion**: Use your framework's DI mechanism
- **KISS**: Keep it simple and clear
