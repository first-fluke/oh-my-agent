---
name: oma-backend
description: Backend specialist for APIs, databases, authentication using FastAPI with clean architecture (Repository/Service/Router pattern). Use for API, endpoint, REST, database, server, migration, and auth work.
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

## Core Rules

1. **DRY (Don't Repeat Yourself)**: Business logic in `Service`, data access logic in `Repository`
2. **SOLID**:
   - **Single Responsibility**: Classes and functions should have one responsibility
   - **Dependency Inversion**: Use FastAPI's `Depends` for dependency injection
3. **KISS**: Keep it simple and clear

## Architecture Pattern

```
Router (HTTP) → Service (Business Logic) → Repository (Data Access) → Models
```

### Repository Layer
- **File**: `src/[domain]/repository.py`
- **Role**: Encapsulate DB CRUD and query logic
- **Principle**: No business logic, return SQLAlchemy models

### Service Layer
- **File**: `src/[domain]/service.py`
- **Role**: Business logic, Repository composition, external API calls
- **Principle**: Business decisions only here

### Router Layer
- **File**: `src/[domain]/router.py`
- **Role**: Receive HTTP requests, input validation, call Service, return response
- **Principle**: No business logic, inject Service via DI

## Core Rules

1. **Clean architecture**: router → service → repository → models
2. **No business logic in route handlers**
3. **All inputs validated with Pydantic**
4. **Parameterized queries only** (never string interpolation)
5. **JWT + bcrypt for auth**; rate limit auth endpoints
6. **Async/await consistently**; type hints on all signatures
7. **Custom exceptions** via `src/lib/exceptions.py` (not raw HTTPException)
8. **Explicit ORM loading strategy**: do not rely on default relation loading when query shape matters
9. **Explicit transaction boundaries**: group one business operation into one request/service-scoped unit of work
10. **Safe ORM lifecycle**: do not share mutable ORM session/entity manager/client objects across concurrent work unless the ORM explicitly supports it

## Dependency Injection

```python
# src/recipes/routers/dependencies.py
async def get_recipe_service(db: AsyncSession = Depends(get_db)) -> RecipeService:
    repository = RecipeRepository(db)
    return RecipeService(repository)

# src/recipes/routers/base_router.py
@router.get("/{recipe_id}")
async def get_recipe(
    recipe_id: str,
    service: RecipeService = Depends(get_recipe_service)
):
    return await service.get_recipe(recipe_id)
```

## Code Quality

- **Python 3.12+**: Strict type hints (mypy)
- **Async/Await**: Required for I/O-bound operations
- **Ruff**: Linting/formatting (Double Quotes, Line Length 100)

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
- Code snippets: `resources/snippets.md`
- Checklist: `resources/checklist.md`
- ORM reference: `resources/orm-reference.md`
- Error recovery: `resources/error-playbook.md`
- Tech stack: `resources/tech-stack.md`
- API template: `resources/api-template.py`
- Context loading: `../_shared/core/context-loading.md`
- Reasoning templates: `../_shared/core/reasoning-templates.md`
- Clarification: `../_shared/core/clarification-protocol.md`
- Context budget: `../_shared/core/context-budget.md`
- Lessons learned: `../_shared/core/lessons-learned.md`

> [!IMPORTANT]
> When adding new modules, always include `__init__.py` to maintain package structure
