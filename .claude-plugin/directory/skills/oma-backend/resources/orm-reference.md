# Backend Agent - ORM Reference

Use this guide when the task involves ORM query design, relation loading, transaction scoping, or session/client lifecycle decisions.

## ORM Rules

### 1. Relation loading must be chosen per use case

Backend Agent should therefore:
- choose loading strategy per endpoint or service method
- compare join-based eager loading, batched/select-in loading, and separate follow-up queries
- choose SQLAlchemy's `joinedload`, `selectinload`, `lazyload`, or `raiseload` explicitly for the access pattern
- use Sequelize `include` for join-based eager loading or `separate: true` for `hasMany` when separate loading fits the query
- treat accidental lazy loads in loops as a performance bug

### 2. Transaction boundaries must follow business operations

Backend Agent should therefore:
- open one explicit transaction for one business operation; in Sequelize, use a managed transaction callback for that unit of work
- keep read-modify-write flows inside the same transaction boundary
- avoid per-statement auto-commit designs
- never hold a database transaction open across user think time

### 3. ORM lifecycle objects are not generic shared singletons

Backend Agent should therefore:
- reuse factory/client objects only when the ORM recommends reuse
- keep transaction-scoped mutable objects request-scoped or task-scoped
- never share stateful unit-of-work objects across concurrent tasks unless the vendor explicitly permits it

Operational reading:
- Prisma: reuse one `PrismaClient` in long-running apps; do not create a new client per query; do not disconnect after every request
- SQLAlchemy: `Session` and `AsyncSession` are mutable, transaction-scoped, and the documented model is session-per-thread / async-session-per-task
- Hibernate: prefer session-per-request over session-per-operation

### 4. Field projection is mandatory unless full entity hydration is required

Backend Agent should therefore:
- fetch only required columns, attributes, or nested fields using Prisma nested `select`, TypeORM `select`, or Sequelize `attributes`
- prefer projections, DTO shaping, or raw results when domain objects are not needed; use TypeORM `getRawMany()` or Sequelize `{ raw: true }` when entity hydration is unnecessary
- treat over-fetching as a query design flaw, not a minor optimization item

### 5. Mapping defaults must never be trusted blindly

Lazy and eager defaults are convenience features, not query plans. Multiple vendors warn that both directions can fail differently:
- lazy defaults can explode into N+1
- eager defaults can create oversized joins, duplicate parent rows, or unnecessary payloads

Backend Agent should therefore:
- inspect relation defaults before changing repository or endpoint behavior
- override defaults at query time when access shape differs from mapping defaults
- prefer repository-level query shaping over relying on entity metadata alone

### 6. Query review must include access-path and row-shape checks

Backend Agent should therefore review:
- missing indexes on filters, joins, and foreign keys
- full table scans
- repeated identical queries that should be cached or batched
- row multiplication from `hasMany` / collection eager joins
- memory cost of hydrating full entities when raw results or projections are enough
