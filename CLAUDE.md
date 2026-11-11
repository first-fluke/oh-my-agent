# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Agent policy (completion rules, subagent dispatch, Serena-only code search, workflows, project rules table) lives in the root `AGENTS.md`; this file does not repeat it.

## What this repo is

oh-my-agent (`oma`) is a CLI plus a library of agent skills, workflows, roles, and hooks that it installs into 14+ coding-agent hosts (Claude Code, Codex, Cursor, Gemini/Antigravity, Qwen, Kiro, opencode/Kilo, pi, Grok, Kimi, ZCode, Copilot, …). Bun workspace with two packages: `cli/` (the published `oh-my-agent` npm package) and `web/` (docs site). Runtimes are pinned in `mise.toml` (bun, node 26, hk, cue).

## Commands

Run from the repo root. `mise run node:oh-my-agent#<script>` wraps the root `package.json` scripts; `bun run <script>` is equivalent.

```bash
bun install                                   # deps
bun run lint                                  # biome check (cli); lint:fix to apply
bun run typecheck                             # tsc for root + web
bun run test                                  # full vitest suite (cli + scripts/)
bun run --cwd cli test io/serena-daemon.test.ts       # one file — path is relative to cli/
bun run --cwd cli test io/serena-daemon.test.ts -t "parseWindowsDaemons"   # one test
bun run --cwd cli check:boundaries            # cross-slice import rule (see Architecture)
bun run --cwd cli check:emit-drift            # committed emitted artifacts match `oma emit`
bun run docs:check                            # cli/README.md, CLI reference, skill catalog in sync
bun cli/cli.ts <command> ...                  # run the CLI from source, e.g. `bun cli/cli.ts doctor`
```

Do not run `build` unless asked (root `AGENTS.md`). Git hooks are managed by hk (`hk.pkl`, install with `mise run hooks`): pre-commit runs biome; commit-msg runs commitlint (conventional commits) and a co-author guard; pre-push runs typecheck → docs:check → tests changed since upstream (`cli/scripts/test-changed.sh`) → emit-drift.

### Test layout quirks (`cli/vitest.config.ts`)

- Three vitest projects: `main` (cli), `scripts` (repo `scripts/**/*.test.ts`), and `daemon-threads`, which quarantines `io/serena-daemon.test.ts` and `commands/doctor/serena-daemons.test.ts` on the threads pool. Tests that mutate process-global state (env, cwd) must not go in that project.
- `@cli/*` path alias maps to `cli/*` in both tsconfig and vitest; use it for cross-slice imports.
- CI does not run the full suite on Windows (it hangs). Win32-only code paths are exercised only by the explicit file list in the "Test win32-only code paths" step of `.github/workflows/test.yml` — add new win32-specific test files there.

## Architecture

### `.agents/` is the source of truth; most other agent-facing files are generated

- `.agents/` holds the canonical skills (`skills/`), workflows (`workflows/`), role definitions (`agents/`), rules (`rules/`), hooks (`hooks/core` shared logic + `hooks/variants/<vendor>` adapters), and config (`oma-config.cue` / `oma-config.yaml`, with `.local` overlays).
- `oma link` / `oma install` (code in `cli/platform/`) materialize per-vendor copies: `.claude/`, `.codex/`, `.cursor/`, `.qwen/`, `.kiro/`, `.pi/`, `.opencode/`, … These are gitignored; never edit them as the source.
- `oma emit --target all` (`cli/commands/emit/`, `cli/platform/emit/*`) writes the committed distribution artifacts at the repo root: `skills/`, `plugin.json`, `mcp.json`, `.claude-plugin/`, `.grok-plugin/`, `.zcode-plugin/`, `.kimi-plugin/`, `com.firstfluke.oma/`, `com.github.copilot/`, `opencode-package/`, and `cli/AGENTS.md`. Change the source in `.agents/` or the emitter, then re-emit; `check:emit-drift` fails on hand edits.
- `cli/README.md` is synced from the root README, and the CLI reference and skill catalog are generated (`cli/scripts/sync-readme.mjs`, `generate-cli-reference.mjs`, `generate-skill-catalog.mjs`); `docs:check` enforces this.

### CLI layering (`cli/ARCHITECTURE.md` has the full rules)

- `cli/cli.ts` is the Commander composition root; most commands are lazy-imported.
- `commands/<name>/` is one slice per command: `command.ts` (Commander wiring only) → `<name>.ts` (flow, no Clack/picocolors) → `ui.ts` (prompts). A command slice must not import another command slice; shared code goes to `io/` (external I/O: git, http, serena, schedule, agentmemory, runtime dispatch), `platform/` (the only writer of vendor files from `.agents/`), `vendors/<vendor>/` (all vendor-specific settings/auth/MCP logic, iterated through the registry in `vendors/index.ts`), or `utils/`. `check:boundaries` enforces this; do not grow its `ALLOWED_EDGES` set to silence a failure.
- `commands/migrations/` holds numbered install/update migrations (`NNN-name.ts`, registered in `migrations/index.ts`). They are shared by `install` and `update`. Changes to what a vendor config should look like usually need both a vendor-module change and a migration that rewrites existing installs.
- `.agents/hooks/core/state-core.ts` is the dependency-free event/state core shared by the CLI (`cli/state/`) and installed standalone hooks; keep it dependency-free.
- Global state lives under `OMA_HOME` (default `~/.oma`, resolved by `utils/oma-home.ts`); project state stays under `<project>/.agents/`.

### Serena integration

Code intelligence goes through Serena. Default `serena.mode: bridge`: each vendor's MCP entry runs `oma bridge` (`commands/bridge/run.ts`), a stdio↔HTTP proxy onto one shared Serena daemon per (project root, context), managed by `io/serena-daemon.ts` with its registry and lock in `io/serena-daemon/registry.ts`. Daemons are spawned detached, reused across sessions, replaced when the runtime revision (`io/serena-managed-runtime.ts`) changes and no clients are attached, and reclaimed after an idle grace period. Process discovery is platform-specific (`ps` on POSIX, Win32_Process on Windows, where one daemon is a `serena.exe` → python process chain).

## Conventions

- Commits: conventional commits (`commitlint.config.mjs`); description under 72 chars, imperative, lowercase. Releases and versions are driven by release-please; do not bump versions by hand.
- Code, comments, commits, and PRs are in English; replies follow the user's language (`.agents/rules/i18n-guide.md`).
