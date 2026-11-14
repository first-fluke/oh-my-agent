---
name: oma-dev-workflow
description: Configure development tasks, git hooks, CI/CD, or release
  automation. Use when creating or fixing a repository development workflow.
---

# Dev Workflow - Monorepo Task Automation Specialist

## Scheduling

### Goal
Set up, run, optimize, and troubleshoot reproducible development workflows using `mise`, language-specific checks, commitlint, validation pipelines, CI/CD, migrations, i18n builds, and release coordination.

### Intent signature
- User asks about dev servers, mise tasks, lint/format/typecheck/test/build, git hooks, CI/CD, migrations, generated clients, i18n builds, or release automation.
- User needs workflow execution or developer environment setup rather than product feature implementation.
- User asks to configure Ruff/pyrefly, Biome/TypeScript 7, Dart/Flutter checks, Hadolint, or commitlint.

### When to use

- Running development servers for monorepo with multiple applications
- Executing lint, format, typecheck across multiple apps in parallel
- Managing database migrations and schema changes
- Generating API clients or code from schemas
- Building internationalization (i18n) files
- Executing production builds and deployment preparation
- Running parallel tasks in monorepo context
- Setting up pre-commit validation workflows
- Configuring language-specific lint, format, and typecheck tools, Dockerfile linting, and commit-message validation
- Troubleshooting mise task failures or configuration issues
- Optimizing CI/CD pipelines with mise

### When NOT to use

- Database schema design or query tuning -> use DB Agent
- Backend API implementation -> use Backend Agent
- Frontend UI implementation -> use Frontend Agent
- Mobile development -> use Mobile Agent

### Expected inputs
- Requested workflow operation, affected apps/packages, and current monorepo structure
- Project manifests, lockfiles, tool configs, `mise.toml`, task definitions, CI files, hook manager, and failure logs when relevant
- Desired validation, setup, or release outcome

### Expected outputs
- Executed or documented mise task workflow
- Updated workflow config, CI/CD pipeline, hooks, env template, or release guidance when requested
- Project-local tool dependencies/configs and runnable `lint`, `format`, `format:check`, `typecheck`, and commitlint tasks for the selected profiles
- Status report with commands, outputs, failures, and next actions

### Dependencies
- `mise`, project task definitions, runtime versions, package managers behind mise tasks
- Resource guides for mise basics, tooling profiles, validation, example task wiring, release coordination, and troubleshooting (References)
- Selected language toolchains and locally provisioned commitlint; no package downloads from Git hooks

### Control-flow features
- Branches by affected apps, task dependency graph, port availability, task failure, and CI/release context
- Calls local process commands; may write workflow/config files
- Must avoid destructive tasks and secrets in workflow configs

## Structural Flow

### Entry
1. Identify affected apps/packages and requested workflow outcome.
2. Read `mise.toml` files and available tasks.
3. Determine whether tasks can run in parallel or must be sequential.

### Scenes
1. **PREPARE**: Analyze requirements, task graph, runtime prerequisites, and ports.
2. **ACQUIRE**: Inspect mise config, task definitions, CI hooks, env patterns, and logs.
3. **ACT**: Run or modify mise tasks, workflow configs, or validation pipelines.
4. **VERIFY**: Check exit codes, generated artifacts, logs, and CI compatibility.
5. **FINALIZE**: Report command status, duration, failures, and next steps.

### Transitions
- If runtime versions changed, run `mise install`.
- If changed-file tasks exist, prefer changed-scope validation.
- If port is occupied, resolve or select another port before starting dev server.
- If a task is unfamiliar, read its definition before running.
- For setup, preserve existing tools and commands; apply language defaults only where configuration is missing. For execution-only requests, use existing checks without installing or replacing tools.
- `/stack-set` detects and records the stack. This skill owns tool setup and task/CI wiring; domain skills consume the resulting verification commands.

### Failure and recovery
- If task is missing, run `mise tasks --all`.
- If runtime is missing, run or recommend `mise install`.
- If task hangs, check for prompts or long-running dev-server behavior.
- If destructive task is requested, require confirmation.
- If a selected checker cannot run, report that check as incomplete and fix its setup within scope; do not replace it with a passing placeholder or a build.
- If a hook skips because another check is still running and exits 0, that push was not validated. Stop the owned previous run, or exit nonzero. Do not hide a gate failure with `|| true`.

### Exit
- Success: workflow runs or config changes are verified.
- Partial success: task failures, missing runtime, or CI/environment blockers are explicit.

## Logical Operations

### Actions
| Action | SSL primitive | Evidence |
|--------|---------------|----------|
| Read task definitions | `READ` | `mise.toml`, CI config |
| Select task strategy | `SELECT` | Parallel/sequential/changed-scope |
| Run workflow commands | `CALL_TOOL` | `mise run`, `mise install`, `mise tasks` |
| Write workflow config | `WRITE` | Hooks, CI, env templates |
| Validate outputs | `VALIDATE` | Exit codes, logs, artifacts |
| Report status | `NOTIFY` | Final workflow summary |

### Tools and instruments
- `mise`, shell, CI/CD tooling, project package manager tasks behind mise
- Resource guides listed under References, loaded on their stated triggers

### Canonical command path
1. Inspect affected app manifests, lockfiles, tool configs, `mise.toml`, CI, hooks, and any `stack/stack.yaml`. Read task definitions and use `mise tasks --all` to discover existing commands.
2. For setup or tool changes, load the selected tooling profiles from References. Configure missing dependencies, settings, and tasks with the detected package manager; preserve existing tool choices. For checks alone, skip setup.
3. Expose applicable checks as `lint`, `format:check`, and `typecheck`; keep mutating `format` separate. A `check` task can aggregate non-emitting checks. Connect existing stack `verify.syntax.cmd` to that task without adding unsupported schema keys; preserve `verify.tests` and domain-specific scans.
4. For hook/CI setup, load the validation pipeline. Provision locked local tools first, preserve the existing hook manager, and connect commitlint to the local `commit-msg` hook. Staged lint stays on pre-commit. Typecheck the whole affected app on the push gate when commit time is the constraint. Configure CI for app checks and tests; integration tests stay out of default hooks and required CI (Guardrails).
5. Before relaunching local validation, follow the validation pipeline's repeated-run guidance. A skipped run is not a pass. Run the configured `mise run check` aggregate, or the applicable individual `lint`, `format:check`, and `typecheck` tasks, plus the relevant hermetic tests. Do not start Docker or external services for validation. Run each underlying checker once. Use `mise run //{path}:{task}` for configured monorepos; typecheck the complete affected app rather than individual changed files.
6. Report the selected tools, commands, checks passed, and any unavailable or inapplicable checks. Builds remain subject to the execution policy.

### Resource scope
| Scope | Resource target |
|-------|-----------------|
| `CODEBASE` | `mise.toml`, CI configs, scripts, generated clients |
| `LOCAL_FS` | Env templates, build outputs, logs |
| `PROCESS` | mise, build, test, lint, dev-server commands |
| `CREDENTIALS` | Secrets must not be hardcoded in workflow configs |

### Preconditions
- Target workflow and affected project area are identifiable.
- Task definitions can be discovered or missing-task state is reported.

### Effects and side effects
- May start dev servers, run tests/builds, generate clients, run migrations, or edit workflow configs.
- May consume CPU/time or occupy ports.

### Guardrails

1. Use `mise run` tasks instead of direct package manager commands. Discover them with `mise tasks --all`; never assume a task exists
2. Run `mise install` after pulling changes or toolchain updates that change runtime versions
3. Read a task's definition and dependencies before running an unfamiliar task or modifying `mise.toml`
4. Use parallel tasks (`mise run lint`, `mise run test`) for independent operations. Cap concurrency when a measurement shows more workers slow the same suite
5. Run lint and test on changed scope, and configure CI to skip unchanged apps. Keep a repository selector that already fails closed on shared or unknown paths; do not replace it with the generic affected-checks helper
6. Validate commit messages with commitlint before committing
7. Run the pre-commit validation pipeline for staged files only, and never commit past a failing staged lint. Typecheck the whole affected app on the push gate when doing it on every commit would dominate commit time
8. Check task output and exit codes, and investigate the root cause of a failure instead of ignoring it
9. Document task dependencies in mise.toml comments and use consistent task naming conventions across apps
10. Enable mise in CI/CD pipelines and pin runtime versions in mise.toml for reproducible runs
11. Try new or changed tasks locally before committing CI/CD changes that depend on them
12. Never fetch packages from a Git hook. When a mise task already runs a checker, call that task. A hook running under `mise exec` may call the pinned local binary directly
13. Never run dev servers without checking port availability first
14. Never hardcode secrets in mise.toml files
15. Never run destructive tasks (clean, reset) without confirmation
16. Always quote task names containing `:` in mise.toml (`[tasks."lint:changed"]`) — unquoted colons fail TOML parsing
17. Always set `monorepo_root = true` (plus `[monorepo].config_roots`) in the root mise.toml before using `//path:task` syntax
18. Keep check tasks non-mutating; run format/fix tasks only within the requested edit scope, and never rewrite unstaged changes from a Git hook
19. Prefer hermetic tests: do not introduce tests that need Docker, containers (including testcontainers), or external services. If unavoidable, isolate them in a separate opt-in integration task, document the dependency, and keep that task out of `git:pre-commit`, `git:pre-push`, `validate:changed`, and required CI gates

## References

| Resource | Load when |
|----------|-----------|
| [resources/mise-basics.md](resources/mise-basics.md) | Installing or verifying mise, monorepo layout and root config, task syntax and dependencies, env templates, report templates |
| [resources/tooling-profiles.md](resources/tooling-profiles.md) | Configuring or changing Python, JS/TS, Dart/Flutter, Dockerfile, or commitlint tooling |
| [resources/validation-pipeline.md](resources/validation-pipeline.md) | Git hooks, CI/CD, change-based testing, repeated local validation |
| [resources/example-task-wiring.md](resources/example-task-wiring.md) | Wiring migrations, optional local Docker infra (not a test dependency), API client generation, or i18n builds into tasks |
| [resources/release-coordination.md](resources/release-coordination.md) | Versioning, changelog, releases |
| [resources/troubleshooting.md](resources/troubleshooting.md) | A task is missing, hangs, or fails on runtime, port, or configuration problems |
| `references/_shared/core/clarification-protocol.md` | A missing fact changes the outcome |
| `references/_shared/core/difficulty-guide.md` | Unresolved scope or dependencies |

### Knowledge Reference

mise, task runner, monorepo, dev server, lint, format, test, typecheck, build, deployment, ci/cd, parallel execution, workflow, automation, tooling