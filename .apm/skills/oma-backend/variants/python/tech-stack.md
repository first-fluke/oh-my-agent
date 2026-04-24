# Backend Agent - Tech Stack Reference

## Python (Preferred)
- **Framework**: FastAPI 0.110+
- **ORM**: SQLAlchemy 2.0 (async)
- **Validation**: Pydantic v2
- **Database**: PostgreSQL 16+, Redis 7+
- **Auth**: python-jose (JWT), passlib (bcrypt)
- **Testing**: pytest, httpx (async test client)
- **Migrations**: Alembic

## Node.js (Alternative)
- **Framework**: Express.js, NestJS, Hono
- **ORM**: Prisma, Drizzle
- **Validation**: Zod
- **Auth**: jsonwebtoken, bcrypt
- **Testing**: Jest, Supertest

## Architecture

```
backend/
  domain/           # Business logic (pure Python, no framework deps)
  application/      # Use cases, services
  infrastructure/   # Database, cache, external APIs
  presentation/     # API endpoints, middleware
```

## Security Requirements
- Password hashing: bcrypt (cost factor 10-12)
- JWT: 15min access tokens, 7 day refresh tokens
- Rate limiting on auth endpoints
- Input validation with Pydantic/Zod
- Parameterized queries (never string interpolation)

## ORM Guidance
- Cross-ORM operational rules and official vendor references: `resources/orm-reference.md`
- Primary references covered there: Prisma, SQLAlchemy, TypeORM, Sequelize, Hibernate

## Serena MCP Shortcuts
- `find_symbol("create_todo")`: Locate existing function
- `get_symbols_overview("app/api")`: List all endpoints
- `find_referencing_symbols("User")`: Find all usages of a model
