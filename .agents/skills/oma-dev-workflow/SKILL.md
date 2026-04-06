---
name: oma-dev-workflow
description: Use when setting up or optimizing developer workflows in a monorepo, managing mise tasks, git hooks, CI/CD pipelines, database migrations, or release automation. Invoke for development environment setup, build automation, testing workflows, and release coordination.
---

# Dev Workflow - Monorepo Task Automation Specialist

## When to use

- Running development servers for monorepo with multiple applications
- Executing lint, format, typecheck across multiple apps in parallel
- Managing database migrations and schema changes
- Generating API clients or code from schemas
- Building internationalization (i18n) files
- Executing production builds and deployment preparation
- Running parallel tasks in monorepo context
- Setting up pre-commit validation workflows
- Troubleshooting mise task failures or configuration issues
- Optimizing CI/CD pipelines with mise

## When NOT to use

- Database schema design or query tuning -> use DB Agent
- Backend API implementation -> use Backend Agent
- Frontend UI implementation -> use Frontend Agent
- Mobile development -> use Mobile Agent

## Core Rules

1. Always use `mise run` tasks instead of direct package manager commands
2. Run `mise install` after pulling changes that might update runtime versions
3. Use parallel tasks (`mise run lint`, `mise run test`) for independent operations
4. Run lint/test only on apps with changed files (`lint:changed`, `test:changed`)
5. Validate commit messages with commitlint before committing
6. Run pre-commit validation pipeline for staged files only
7. Configure CI to skip unchanged apps for faster builds
8. Check `mise tasks --all` to discover available tasks before running
9. Verify task output and exit codes for CI/CD integration
10. Document task dependencies in mise.toml comments
11. Use consistent task naming conventions across apps
12. Enable mise in CI/CD pipelines for reproducible builds
13. Pin runtime versions in mise.toml for consistency
14. Test tasks locally before committing CI/CD changes
15. Never use direct package manager commands when mise tasks exist
16. Never modify mise.toml without understanding task dependencies
17. Never skip `mise install` after toolchain version updates
18. Never run dev servers without checking port availability first
19. Never commit without running validation on affected apps
20. Never ignore task failures - always investigate root cause
21. Never hardcode secrets in mise.toml files
22. Never assume task availability - always verify with `mise tasks`
23. Never run destructive tasks (clean, reset) without confirmation
24. Never skip reading task definitions before running unfamiliar tasks

## Technical Guidelines

### Prerequisites

```bash
# Install mise
curl https://mise.run | sh

# Activate in shell
echo 'eval "$(~/.local/bin/mise activate)"' >> ~/.zshrc

# Install all runtimes defined in mise.toml
mise install

# Verify installation
mise list
```

### Project Structure (Monorepo)

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

### Task Syntax

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

### Common Task Patterns

| Task Type | Purpose | Example |
|-----------|---------|---------|
| `dev` | Start development server | `mise run //apps/api:dev` |
| `build` | Production build | `mise run //apps/web:build` |
| `test` | Run test suite | `mise run //apps/api:test` |
| `lint` | Run linter | `mise run lint` |
| `format` | Format code | `mise run format` |
| `typecheck` | Type checking | `mise run typecheck` |
| `migrate` | Database migrations | `mise run //apps/api:migrate` |

### Reference Guide

| Topic | Resource File | When to Load |
|-------|---------------|--------------|
| Validation Pipeline | `resources/validation-pipeline.md` | Git hooks, CI/CD, change-based testing |
| Database & Infrastructure | `resources/database-patterns.md` | Migrations, local Docker infra |
| API Generation | `resources/api-workflows.md` | Generating API clients |
| i18n Patterns | `resources/i18n-patterns.md` | Internationalization |
| Release Coordination | `resources/release-coordination.md` | Versioning, changelog, releases |
| Troubleshooting | `resources/troubleshooting.md` | Debugging issues |

### Task Dependencies

Define dependencies in `mise.toml`:

```toml
[tasks.build]
depends = ["lint", "test"]
run = "echo 'Building after lint and test pass'"

[tasks.dev]
depends = ["//apps/api:dev", "//apps/web:dev"]
```

### Parallel vs Sequential Execution

**Parallel (independent tasks):**
```bash
# Runs all lint tasks simultaneously
mise run lint
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

### Environment Variables

Common patterns for monorepo env vars:

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

## Troubleshooting Guide

| Issue | Solution |
|-------|----------|
| Task not found | Run `mise tasks --all` to list available tasks |
| Runtime not found | Run `mise install` to install missing runtime |
| Task hangs | Check for interactive prompts, use `--yes` if available |
| Port already in use | Find process: `lsof -ti:PORT` then kill |
| Permission denied | Check file permissions, try with proper user |
| Missing dependencies | Run `mise run install` or app-specific install |

## How to Execute

Follow the core workflow step by step:
1. **Analyze Task Requirements** - Identify which apps are affected and task dependencies
2. **Check mise Configuration** - Verify mise.toml structure and available tasks
3. **Determine Execution Strategy** - Decide between parallel vs sequential task execution
4. **Run Prerequisites** - Install runtimes, dependencies if needed
5. **Execute Tasks** - Run mise tasks with proper error handling
6. **Verify Results** - Check output, logs, and generated artifacts
7. **Report Status** - Summarize success/failure with actionable next steps

## Execution Protocol (CLI Mode)

Vendor-specific execution protocols are injected automatically by `oma agent:spawn`.
Source files live under `../_shared/runtime/execution-protocols/{vendor}.md`.

## References

- Clarification: `../_shared/core/clarification-protocol.md`
- Difficulty assessment: `../_shared/core/difficulty-guide.md`

## Knowledge Reference

mise, task runner, monorepo, dev server, lint, format, test, typecheck, build, deployment, ci/cd, parallel execution, workflow, automation, tooling
