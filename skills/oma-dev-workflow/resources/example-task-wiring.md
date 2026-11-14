# Example Task Wiring

Load when wiring migrations, local infrastructure, API client generation, or
i18n builds into mise tasks. These are examples for one stack (FastAPI + Alembic
with uv, a Next.js web app with orval and next-intl, a Flutter mobile app).
Keep the task names and dependency shape; replace each `run` command with the
repository's own tool.

## Migrations

```toml
# apps/api/mise.toml
[tasks.migrate]
description = "Apply migrations"
run = "uv run alembic upgrade head"

[tasks."migrate:create"]
description = "Create new migration"
usage = 'arg "<name>"'
run = 'uv run alembic revision --autogenerate -m "$usage_name"'

[tasks."migrate:check"]
description = "Show current migration"
run = "uv run alembic current"

[tasks."migrate:rollback"]
description = "Rollback one migration"
run = "uv run alembic downgrade -1"
```

Review a generated migration before applying it. A reset task that downgrades
to base and re-applies is destructive: require confirmation before running it.

## Local Infrastructure (Docker, manual)

These tasks are manual development conveniences. They are not a test dependency:
the default test suite must not require `infra:up`, and tests that need a live
database belong to the opt-in `test:integration` task described in
[validation-pipeline.md](validation-pipeline.md).

```toml
# apps/api/mise.toml
[tasks."infra:up"]
description = "Start local infrastructure (PostgreSQL, Redis, etc.)"
run = "docker compose -f docker-compose.infra.yml up -d"

[tasks."infra:down"]
description = "Stop local infrastructure"
run = "docker compose -f docker-compose.infra.yml down"
```

`docker compose ... down -v` removes volumes; treat it as a destructive task.

## API Client Generation

Each client task depends on the schema task, so one root task regenerates
everything in order.

```toml
# apps/api/mise.toml
[tasks."gen:openapi"]
description = "Generate OpenAPI schema"
run = "uv run python -c 'from src.main import app; import json; print(json.dumps(app.openapi()))' > openapi.json"

# apps/web/mise.toml
[tasks."gen:api"]
description = "Generate API client from OpenAPI"
depends = ["//apps/api:gen:openapi"]
run = "bunx orval"

# apps/mobile/mise.toml
[tasks."gen:api"]
description = "Generate API client from OpenAPI"
depends = ["//apps/api:gen:openapi"]
run = "dart run swagger_parser"

# Root mise.toml
[tasks."gen:api"]
description = "Generate API clients for all apps"
depends = ["//apps/web:gen:api", "//apps/mobile:gen:api"]
```

## i18n Builds

A shared package builds the per-platform files; app tasks depend on it.

```toml
# packages/i18n/mise.toml
[tasks.build]
description = "Build i18n files for all platforms"
depends = ["build:web", "build:mobile"]

[tasks."build:web"]
description = "Build for web (next-intl JSON)"
run = "bun scripts/build-web.js"

[tasks."build:mobile"]
description = "Build for mobile (Flutter ARB)"
run = "bun scripts/build-mobile.js"

# apps/web/mise.toml
[tasks.dev]
depends = ["//packages/i18n:build"]
run = "bun dev"

# apps/mobile/mise.toml
[tasks."gen:l10n"]
description = "Generate Flutter localizations"
run = "flutter gen-l10n"
```
