# Backend Agent - Tech Stack Reference (Python)

## Primary Stack
- **Language**: Python 3.11+ (type hints on all signatures)
- **Framework**: Litestar 2.25+, using the explicit parameter markers (`JSONBody`, `FromPath`, `FromQuery`, `NamedDependency`)
- **ORM**: SQLAlchemy 2.0 (async) through Advanced Alchemy 1.10+ (`litestar[sqlalchemy]`): `SQLAlchemyPlugin` for the engine and request-scoped session, `SQLAlchemyAsyncRepositoryService` with an inner `SQLAlchemyAsyncRepository` for services and data access, `UUIDv7AuditBase` models
- **Validation**: msgspec `Struct`s with `Annotated[..., msgspec.Meta(...)]` constraints (Litestar uses msgspec internally, so no extra is needed); Litestar DTOs only where the wire shape must differ from the model
- **IDs**: UUIDv7 primary keys (`uuid-utils`)
- **Database**: PostgreSQL 16+, Redis 7+
- **Auth**: `litestar.security.jwt.JWTAuth` (`litestar[jwt]`), `pwdlib[argon2]` (Argon2id; add the `bcrypt` extra to verify legacy hashes)
- **Testing**: pytest, `litestar.testing.AsyncTestClient` (built on httpx)
- **Migrations**: Alembic, run through the `litestar database` CLI that the Advanced Alchemy plugin registers

## Ecosystem Defaults
Use these when the project needs one and has no established choice.

| Need | Default |
|------|---------|
| ASGI server | Granian (uvicorn acceptable) |
| Background jobs | SAQ via `litestar-saq` |
| Logging | structlog via Litestar's structlog plugin |
| Stores/cache | Litestar stores with Redis |

## Architecture
```
app/
  controllers/      # Litestar controllers (thin, delegate to services)
  services/         # Advanced Alchemy services: business logic, authorization, inner repository
  models/           # SQLAlchemy models on Advanced Alchemy bases
  schemas/          # msgspec request/response Structs
  core/             # Config, database plugin config, auth, error types
  main.py           # Litestar app wiring (plugins, auth, exception handlers)
migrations/         # Alembic revisions
```

## Security Requirements
- Password hashing: Argon2id via `pwdlib` (bcrypt cost 10-12 acceptable for legacy compatibility)
- JWT: 15min access tokens, 7 day refresh tokens
- Rate limiting on auth endpoints
- Input validation with msgspec Structs on `JSONBody` and constrained parameter markers
- Parameterized queries via SQLAlchemy (never string interpolation)

## Linter/Formatter
- **Ruff**: lint + format
- **mypy** (or pyright): static type checking
