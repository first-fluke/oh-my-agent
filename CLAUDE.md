<!-- OMA:START — managed by oh-my-agent. Do not edit this block manually. -->

# oh-my-agent

Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. System/developer instructions and the user's request take precedence over OMA defaults. Never build, compile, bundle, or package software unless the user explicitly requests a build.

- **SSOT**: Do not modify `.agents/` definitions (skills, workflows, rules, agents, config) directly. Run outputs under `.agents/results/` and `.agents/state/` are generated artifacts and may be written.
- **Response language**: Follow `language` in `.agents/oma-config.yaml`.
- **Skills**: Read the relevant `.agents/skills/{name}/SKILL.md` when needed.
- **Subagents**: Same-vendor native dispatch via Claude Code Agent tool with `.claude/agents/{name}.md`; cross-vendor fallback via `oma agent spawn`
- Write non-ASCII tool-call parameters as literal UTF-8, not Unicode escapes.

## Per-Agent Dispatch

Resolve the target vendor for each agent from `.agents/oma-config.yaml`. Use native subagents when it matches the current runtime; otherwise, or when native dispatch is unavailable, use `oma agent spawn` for that agent.

## Code Search

Serena MCP is required for code search and discovery. Load deferred tools before use. Use native search/read only when Serena is unavailable or times out, or for plain non-code content.

## Workflows

Run workflows only when explicitly requested or detected by a hook; never self-initiate. Read and follow `.agents/workflows/{name}.md`. Continue active workflows until complete or explicitly cancelled.

## Project Rules

Read the relevant file from `.agents/rules/` when working on matching code.

| Rule | File | Scope |
|------|------|-------|
| backend | `.agents/rules/backend.md` | on request |
| commit | `.agents/rules/commit.md` | on request |
| database | `.agents/rules/database.md` | **/*.{sql,prisma} |
| debug | `.agents/rules/debug.md` | on request |
| design | `.agents/rules/design.md` | on request |
| dev-workflow | `.agents/rules/dev-workflow.md` | on request |
| frontend | `.agents/rules/frontend.md` | **/*.{tsx,jsx,css,scss} |
| i18n-arb | `.agents/rules/i18n-arb.md` | **/*.arb |
| i18n-guide | `.agents/rules/i18n-guide.md` | always |
| infrastructure | `.agents/rules/infrastructure.md` | **/*.{tf,tfvars,hcl} |
| market | `.agents/rules/market.md` | on request |
| mobile | `.agents/rules/mobile.md` | **/*.{dart,swift,kt} |
| quality | `.agents/rules/quality.md` | on request |

<!-- OMA:END -->

## Install Mode

oma supports project-mode (`<cwd>/.agents/`) and global-mode (`~/.agents/`).
When touching install/update/uninstall code, read `web/docs/guide/global-install.md`.

## Source Repo: Additional Rules

> This section applies only to the oh-my-agent source repository itself.

- `.agents/` modifications are allowed (this IS the source repo)
- `bun run test` runs CLI tests (vitest).
- `bun run lint` runs the linter.
- `bun run build` builds the CLI.
- `bun run typecheck` type-checks CLI and web. **Run it before every commit**: vitest (esbuild), biome, and `bun build` all skip tsc, so type errors otherwise surface only at the pre-push hook and reject the push late.
- **When manually exercising the CLI, always run the LOCAL code**: `bun cli/cli.ts <args>` (source) or `node cli/bin/cli.js <args>` (fresh build after `bun run build`). Never use `bun run oma` or bare `oma` — the repo root has no workspace bin link, so both silently fall back to the globally installed (likely stale) oma on PATH, and you end up debugging against the wrong version.
- commitlint: conventional commits required (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test)
- Commit Co-Author: `First Fluke <our.first.fluke@gmail.com>`
