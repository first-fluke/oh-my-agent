# mise Basics

Load when installing or verifying mise, laying out monorepo task files, writing
task definitions, drafting an env template, or formatting a workflow report.
Paths such as `apps/api` are placeholders; use the repository's actual layout.

## Prerequisites

Reuse an existing `mise` installation. If it is missing, install it with a package manager supported by your platform. For example, with Homebrew already installed:

```bash
brew install mise
```

For other platforms, use a package-manager method from the [official installation guide](https://mise.jdx.dev/installing-mise.html). Do not pipe a remote installation script directly into a shell.

Follow the [shell setup guide](https://mise.jdx.dev/shell-setup.html) for your current shell when activation is needed. Check for existing activation before editing shell configuration, and use `mise` from `PATH` rather than assuming `~/.local/bin/mise`.

```bash
# Verify mise is available
mise --version

# Install all runtimes defined in mise.toml
mise install

# Verify installation
mise list
```

## Project Structure (Monorepo)

```
project-root/
├── mise.toml            # Root task definitions
├── apps/
│   ├── api/            # Backend application
│   │   └── mise.toml   # App-specific tasks
│   ├── web/            # Frontend application
│   │   └── mise.toml
│   └── mobile/         # Mobile application
│       └── mise.toml
├── packages/
│   ├── shared/         # Shared libraries
│   └── config/         # Shared configuration
└── scripts/            # Utility scripts
```

The root `mise.toml` must enable monorepo task paths, or every `//path:task` invocation fails with "require a monorepo root configuration":

```toml
# Root mise.toml — monorepo_root is a top-level key (before any [table])
monorepo_root = true

[monorepo]
config_roots = ["apps/*", "packages/*"]
```

## Task Syntax

**Root-level tasks:**
```bash
mise run lint        # Lint all apps (parallel)
mise run test        # Test all apps (parallel)
mise run dev         # Start all dev servers
mise run build       # Production builds
```

**App-specific tasks:**
```bash
# Syntax: mise run //{path}:{task}
mise run //apps/api:dev
mise run //apps/api:test
mise run //apps/web:build
```

Task names containing `:` are quoted in TOML: `[tasks."gen:api"]`.

## Common Task Patterns

| Task Type | Purpose | Example |
|-----------|---------|---------|
| `dev` | Start development server | `mise run //apps/api:dev` |
| `build` | Production build | `mise run //apps/web:build` |
| `test` | Run test suite | `mise run //apps/api:test` |
| `lint` | Run linter | `mise run lint` |
| `format` | Format code | `mise run format` |
| `format:check` | Check formatting without writes | `mise run format:check` |
| `typecheck` | Type checking | `mise run typecheck` |
| `check` | Aggregate applicable non-emitting checks | `mise run check` |
| `migrate` | Database migrations | `mise run //apps/api:migrate` |

## Task Dependencies

Define dependencies in `mise.toml`:

```toml
[tasks.build]
depends = ["lint", "test"]
run = "echo 'Building after lint and test pass'"

[tasks.dev]
depends = ["//apps/api:dev", "//apps/web:dev"]
```

## Parallel vs Sequential Execution

**Parallel (independent tasks):**
```bash
# Runs all lint tasks simultaneously (via depends)
mise run lint

# mise-native parallel execution of multiple tasks
mise run lint ::: test
```

**Sequential (dependent tasks):**
```bash
# Runs in order: lint → test → build
mise run lint && mise run test && mise run build
```

**Mixed approach:**
```bash
# Start dev servers in background
mise run //apps/api:dev &
mise run //apps/web:dev &
wait
```

## Environment Variables

Placeholder entries for an `.env.example`; real values stay out of `mise.toml` and version control:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Cache
REDIS_URL=redis://localhost:6379/0

# API
API_URL=http://localhost:8000

# Frontend
PUBLIC_API_URL=http://localhost:8000
```

## Output Templates

When setting up development environment:
1. Runtime installation verification (`mise list`)
2. Dependency installation commands per app
3. Environment variable template (.env.example)
4. Development server startup commands
5. Common task quick reference

When running tasks:
1. Command executed with full path
2. Expected output summary
3. Duration and success/failure status
4. Next recommended actions

When troubleshooting:
1. Diagnostic commands (`mise config`, `mise doctor`)
2. Common issue solutions
3. Port/process conflict resolution
4. Cleanup commands if needed
