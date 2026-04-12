<!-- OMA:START — managed by oh-my-agent. Do not edit this block manually. -->
# oh-my-agent — Claude Code Integration

## Architecture
- **SSOT**: `.agents/` directory (do not modify directly)
- **Response language**: Follows `language` in `.agents/oma-config.yaml`
- **Domain Skills**: `.agents/skills/` (exposed to `.claude/skills/` via symlinks)
- **Workflows**: `.agents/workflows/` (mapped to `.claude/skills/` as thin routers)
- **Subagents**: `.claude/agents/` (spawned via Task tool)

## Slash Commands

| Command | Workflow | Execution |
|:--|:--|:--|
| `/orchestrate` | `orchestrate.md` | Parallel subagents + Review Loop |
| `/work` | `work.md` | TaskCreate + Issue Remediation Loop |
| `/ultrawork` | `ultrawork.md` | 5-Phase Gate Loop |
| `/plan` | `plan.md` | Inline PM analysis |
| `/exec-plan` | `exec-plan.md` | Inline plan management |
| `/brainstorm` | `brainstorm.md` | Inline design exploration |
| `/review` | `review.md` | qa-reviewer subagent delegation |
| `/debug` | `debug.md` | Inline + subagent |
| `/scm` | `scm.md` | Inline SCM + git operations |
| `/tools` | `tools.md` | Inline MCP management |
| `/stack-set` | `stack-set.md` | Inline stack configuration |
| `/design` | `design.md` | Inline 7-phase design workflow |
| `/deepinit` | `deepinit.md` | Inline project initialization |

## Automatic Workflow Detection

Workflows activate via natural-language keywords — no `/command` required.
The `UserPromptSubmit` hook detects keywords and injects `[OMA WORKFLOW: ...]` into context.
Trigger keywords are defined in `.claude/hooks/triggers.json` (multi-language support).

### Hook Behavior
- `[OMA WORKFLOW: ...]` → read and execute the workflow file immediately
- `[OMA PERSISTENT MODE: ...]` → workflow still in progress, continue execution
- Informational context ("what is X?") is filtered out — no false triggers
- Explicit `/command` input skips the hook (no duplication)
- Persistent-mode workflows (`ultrawork`, `orchestrate`, `work`) block termination until complete
- Deactivate persistent mode: say "workflow done" → deletes `.agents/state/{workflow}-state-{sessionId}.json`

## Required References (before any skill execution)
1. `.agents/skills/_shared/core/skill-routing.md` — Agent routing
2. `.agents/skills/_shared/core/context-loading.md` — Selective resource loading
3. `.agents/skills/_shared/core/prompt-structure.md` — Goal, Context, Constraints, Done When

## Subagent Rules
- Definitions: `.claude/agents/*.md` → spawn via Task tool
- Parallel: multiple Task tool calls in a single message
- Results: synchronous return, written to `.agents/results/result-{agent}[-{sessionId}].md`
- Subagents require Charter Preflight (`CHARTER_CHECK`)

## HUD Statusline
The `[OMA]` indicator in the status bar confirms oh-my-agent is active.
It shows: model name, context usage (green/yellow/red), and active workflow state.

## Rules
1. **Do not modify `.agents/` files** — SSOT protection
2. Domain skills load only via explicit invocation or agent `skills` field
3. Workflows execute via explicit `/command` or hook auto-detection only — never self-initiated
4. Plans saved to `.agents/results/plan-{sessionId}.json`
5. `stack/` is generated output — SSOT exception
<!-- OMA:END -->

## Source Repo — Additional Rules

> This section applies only to the oh-my-agent source repository itself.

- `.agents/` modifications are allowed (this IS the source repo)
- `bun run test` — CLI tests (vitest)
- `bun run lint` — Lint
- `bun run build` — CLI build
- commitlint: conventional commits required (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test)
- Commit Co-Author: `First Fluke <our.first.fluke@gmail.com>`
