# cli/ Architecture

See full decision record: [`.agents/results/architecture/adr-cli-refactor-boundaries.md`](../.agents/results/architecture/adr-cli-refactor-boundaries.md).

## Layout

```
cli/
  cli.ts                         composition root (Commander wiring)
  bin/                           published entry
  commands/<name>/               one folder per CLI command
    command.ts                   Commander registration (export register<Name>())
    <name>.ts                    business flow (for fully-sliced commands: no Clack, no process.exit)
    ui.ts                        Clack / picocolors prompts (where split has been applied)
    internal/                    slice-private helpers (not exported)
  commands/migrations/           shared install + update migrations (exception: both slices may import)
  vendors/<vendor>/              per-CLI-vendor adapter (claude, gemini, codex, qwen, mixed)
    auth.ts
    settings.ts
    index.ts                     Vendor registry (cli/vendors/index.ts)
  platform/                      SSOT installer: writes vendor files from .agents/
  state/                         agent execution evidence, memory adapter, state API compatibility exports
  io/                            external I/O adapters (github, tarball, serena, mcp-bridge, http, git)
  utils/                         shared helpers (cli-framework, process-signals, frontmatter, time-window, competitors, graph, config, fs)
  types/  constants/              shared primitives
  dashboard/                     terminal + web dashboards
  scripts/                       dev/build/release scripts
```

## Rules

1. `commands/<x>` **must not** import from `commands/<y>`. Shared logic belongs in `vendors/`, `platform/`, `io/`, or `utils/`. Exception: `commands/migrations/` (shared install+update infrastructure).
2. `command.ts` contains only Commander wiring and argument normalization. No business logic, no Clack, no direct FS/network access.
3. `<name>.ts` (the slice's pure flow) must not import `@clack/prompts` or `picocolors`. Interactive prompts live in `ui.ts`.
4. `vendors/<vendor>/` owns everything vendor-specific. Other packages iterate via the `Vendor` registry in `vendors/index.ts`.
5. `platform/` is the only package that writes vendor files from `.agents/` SSOT.
6. Tests colocate with the unit under test (`<slice>/<name>.test.ts`).

The canonical event envelope, durable writes, session index operations, and metadata reducer live in `.agents/hooks/core/state-core.ts`. CLI `state/events.ts` adds the asynchronous memory adapter; standalone hooks use the same core through compatibility exports. `state-index-lock.ts` serializes index updates across CLI and hook processes. Keep the core dependency-free so installed standalone hooks can load it.

`session-storage.ts` owns home profile paths (`~/.oma/u/0/sessions/`), project identity, and legacy project-session compatibility. Project-scoped consumers use `listSessionIds()` and `sessionDir()`; scanning `sessionsDir()` directly would include other projects. Active indexes and locks live under the selected profile's `projects/<project-id>/`. See [profile session storage](../docs/migrations/profile-sessions.md) for environment overrides and future account linkage.

`state/session-migration.ts` implements migration 028 for install/update and `oma state migrate`. Copies are verified and flushed before originals are removed; temporary source renames make the path switch atomic and interrupted cleanup is retried. The index lock protects active pointers, and per-session write locks coordinate event/injection writes with migration. Acquire the index lock before a session lock whenever both are required. Explicit `--include-active` migration preserves active pointers; automatic install/update migration defers active sessions.

Agent runs use `state/agent-results.ts` for structured claims, actual verification receipts, and content hashes. See [execution evidence and graph queries](../docs/migrations/execution-evidence.md) for usage and migration from Markdown-only completion.

Single and parallel process launches share `io/runtime-dispatch/prepared-agent-dispatch.ts` for workspace options and OpenCode primary wrappers. Parallel tasks use their individual run IDs for wrapper filenames so one task's cleanup cannot remove another task's wrapper.

`io/schedule/` owns scheduler manifests, OS adapters, and reconciliation shared by the schedule and update commands. `commands/schedule/` retains command behavior and compatibility exports; update imports reconciliation from the shared I/O layer.

`io/video/` owns video configuration and HyperFrames toolchain setup shared by video and update. The boundary checker parses import declarations, re-exports, literal dynamic imports, and `require()` calls; comments and strings containing import examples are ignored.

## Path alias

Use `@cli/*` (mapped to `cli/*` in `tsconfig.json`) for cross-slice imports. Example:

```ts
import { claudeAuth } from "@cli/vendors/claude/auth";
import { installSkill } from "@cli/platform/skills-installer";
import { fetchRemoteManifest } from "@cli/platform/manifest";
```

<!-- oma-docs:ignore-start -->
Relative imports are fine **within** a slice (`./internal/foo`). Avoid relative imports that traverse siblings (`../other-slice/...`).
<!-- oma-docs:ignore-end -->

## Boundary enforcement

Biome's built-in `noRestrictedImports` uses exact module names and does not support glob patterns, so cross-slice prevention is enforced by:

1. Code review (ADR-referenced rules).
2. `cli/scripts/check-boundaries.mjs` — path-resolving CI check (wired into `.github/workflows/test.yml`) that fails when `commands/<x>` files import from `commands/<y>`. `commands/migrations/` is allowlisted as shared infrastructure, and a frozen `ALLOWED_EDGES` set documents the sanctioned command-to-command dependencies (doctor→skills/memory/hook diagnostics, install/update→link, memory→recap parsers, market→search transport). Do not extend the edge set to silence a failure — move the shared code to `utils/`, `io/`, or `platform/` instead.

## `commands/docs/` — Documentation Drift Detection

Added in v1 (issue [#326](https://github.com/gracefullight/oh-my-agent/issues/326), design `docs/plans/designs/008-oma-docs.md`). Exposes `oma docs verify` and `oma docs sync`.

| File | Role |
|------|------|
| `extract.ts` | Markdown AST (`remark` + `unified`) + L2 ref extractor (file / url / cli / script / env / config). Produces `docs/generated/doc-refs.json`. |
| `resolve.ts` | Deterministic broken-ref checker — file existence, HTTP HEAD, CLI `which`, script lookup, env grep, config deep-path. No LLM dependency. |
| `reporter.ts` | Renders `DriftReport` as deterministic markdown (human) or JSON (`--json`). No LLM call — natural-language synthesis is the host LLM's responsibility. |
| `sync-propose.ts` | Git diff intake, reverse index lookup, secret redaction (file exclusion + content sanitizer), candidate-doc selector. No LLM call — patch synthesis and the interactive `[y/n/d/s]` prompt are the host LLM's responsibility. Never auto-applies. |
| `command.ts` | Commander wiring for `verify` and `sync` subcommands, argument normalization only. |

## Follow-ups (not done in the initial refactor)

- `install` and `update` slices still inline Clack prompts in `install.ts` / `update.ts`. A follow-up can extract `ui.ts` once an `InstallOptions` / `UpdateOptions` type is defined and tests cover the interactive flow.
- `platform/skills-installer.ts` still re-exports `agent-composer`, `hooks-composer`, `vendor-adapter`. Drop the barrel once all callers import from the real module.
<!-- oma-docs:ignore-start -->
- Extract MCP HTTP-stdio bridge from `commands/bridge/run.ts` into `io/mcp-bridge.ts`.
<!-- oma-docs:ignore-end -->
