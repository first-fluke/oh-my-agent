---
title: Project Structure
description: Reader-oriented map of an oh-my-agent installation, covering the SSOT under .agents/, representative skill resources, workflows, checked-in agent definitions, runtime state, vendor integration layers, and the source repository layout.
---

# Project Structure

After installing oh-my-agent, your project gains two core directory trees: `.agents/` (the single source of truth, including the `.agents/state/memories/` coordination store) and runtime integration layers (e.g. `.claude/`, `.cursor/`, `.codex/`). If Serena is chosen as the code-intelligence provider, an optional `.serena/` directory may also exist for Serena's onboarding memories. This page explains the shared files and the optional/generated paths that matter when troubleshooting.

---

## Representative directory tree

The tree below shows the shared resources and representative domain skills in detail. The current catalog has 33 skill directories; omitted skills follow the same `SKILL.md` plus optional `resources/`, `variants/`, or skill-specific directory pattern. Treat the live `.agents/` tree as authoritative when a generated or optional file is absent.

```
your-project/
├── .agents/                          ← Single Source of Truth (SSOT)
│   ├── oma-config.cue / .yaml    ← Language, model_preset, providers, agent overrides
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Resources used by ALL agents
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── antigravity.md
│   │   │   │       ├── codex.md
│   │   │   │       ├── commandcode.md / kimi.md / kiro.md
│   │   │   │       ├── opencode.md / pi.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/
│   │   │   ├── SKILL.md
│   │   │   └── resources/              ← execution, stack, Angular, snippets, checks
│   │   │
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, ORM, checklist, recovery
│   │   │   └── variants/               ← node, python, rust seeds / generated refs
│   │   │
│   │   ├── oma-mobile/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/              ← execution, tech stack, screen templates, checks
│   │   │   └── variants/               ← stack schema and generated platform refs
│   │   │
│   │   ├── oma-db/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── document-templates.md
│   │   │       ├── anti-patterns.md
│   │   │       ├── vector-db.md
│   │   │       ├── migration-playbook.md
│   │   │       ├── query-tuning.md
│   │   │       ├── iso-controls.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── execution-protocol.md
│   │   │   │   ├── anti-patterns.md
│   │   │   │   ├── checklist.md
│   │   │   │   ├── design-md-spec.md
│   │   │   │   ├── design-tokens.md
│   │   │   │   ├── prompt-enhancement.md
│   │   │   │   ├── stitch-integration.md
│   │   │   │   └── error-playbook.md
│   │   │   └── reference/
│   │   │       ├── typography.md
│   │   │       ├── color-and-contrast.md
│   │   │       ├── spatial-design.md
│   │   │       ├── motion-design.md
│   │   │       ├── responsive-design.md
│   │   │       ├── component-patterns.md
│   │   │       ├── accessibility.md
│   │   │       └── shader-and-3d.md
│   │   │
│   │   ├── oma-pm/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── examples.md
│   │   │       ├── iso-planning.md
│   │   │       ├── plan-phase-protocol.md
│   │   │       ├── task-template.json
│   │   │       └── error-playbook.md
│   │   │
│   │   ├── oma-qa/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── iso-quality.md
│   │   │       ├── checklist.md
│   │   │       ├── self-check.md
│   │   │       ├── error-playbook.md
│   │   │       └── verify-ship-protocol.md
│   │   │
│   │   ├── oma-debug/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── common-patterns.md
│   │   │       ├── debugging-checklist.md
│   │   │       ├── bug-report-template.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── ...
│   │   │
│   │   ├── oma-tf-infra/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── execution-protocol.md
│   │   │       ├── multi-cloud-examples.md
│   │   │       ├── cost-optimization.md
│   │   │       ├── policy-testing-examples.md
│   │   │       ├── iso-42001-infra.md
│   │   │       ├── checklist.md
│   │   │       ├── error-playbook.md
│   │   │       └── examples.md
│   │   │
│   │   ├── oma-dev-workflow/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── validation-pipeline.md
│   │   │       ├── database-patterns.md
│   │   │       ├── api-workflows.md
│   │   │       ├── i18n-patterns.md
│   │   │       ├── release-coordination.md
│   │   │       └── troubleshooting.md
│   │   │
│   │   ├── oma-translation/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       ├── translation-rubric.md
│   │   │       ├── anti-ai-patterns.md
│   │   │       └── lang/
│   │   │           ├── _template.md
│   │   │           ├── en.md
│   │   │           ├── ja.md
│   │   │           ├── ko.md
│   │   │           └── zh.md
│   │   │
│   │   ├── oma-orchestration/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   │   ├── subagent-prompt-template.md
│   │   │   │   └── memory-schema.md
│   │   │   ├── scripts/
│   │   │   │   ├── spawn-agent.sh
│   │   │   │   ├── parallel-run.sh
│   │   │   │   └── verify.sh
│   │   │   ├── templates/
│   │   │   └── config/
│   │   │       └── cli-config.yaml
│   │   │
│   │   ├── oma-brainstorm/
│   │   │   └── SKILL.md
│   │   │
│   │   ├── oma-coordination/
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   │       └── examples.md
│   │   │
│   │   └── oma-scm/
│   │       ├── SKILL.md
│   │       ├── config/
│   │       │   └── commit-config.yaml
│   │       └── resources/
│   │           └── conventional-commits.md
│   │
│   ├── workflows/                    ← 21 process definitions
│   │   ├── orchestrate.md             ← Persistent: automated parallel execution
│   │   ├── work.md                    ← Persistent: step-by-step coordination
│   │   ├── ultrawork.md               ← Persistent: 5-phase quality workflow
│   │   ├── ralph.md                   ← Persistent: repeated execution + judge
│   │   ├── plan.md / brainstorm.md / architecture.md
│   │   ├── deepinit.md / review.md / debug.md / design.md
│   │   ├── scm.md / tools.md / stack-set.md / convert.md
│   │   ├── docs.md / explain.md / recap.md / schedule.md / video.md
│   │   └── ...                         ← Keep this list aligned with `.agents/workflows/`
│   │
│   ├── agents/                        ← 12 checked-in subagent definitions
│   │   ├── architecture-reviewer.md / backend-engineer.md
│   │   ├── db-engineer.md / debug-investigator.md / docs-curator.md
│   │   ├── frontend-engineer.md / mobile-engineer.md / pm-planner.md
│   │   ├── qa-reviewer.md / refactor-engineer.md
│   │   ├── research-explorer.md / tf-infra-engineer.md
│   │
│   ├── results/                       ← Plans, claims, reports, and generated artifacts
│   ├── state/                         ← Active workflow state files
│   │   ├── orchestrate-state.json     ← (exists only when workflow is active)
│   │   ├── ultrawork-state.json
│   │   ├── work-state.json
│   │   └── memories/                  ← Coordination memory store (canonical path)
│   │       ├── orchestrator-session-{sessionId}.md ← Session ID, status, phase tracking
│   │       ├── task-board-{sessionId}.md          ← Task assignments and status
│   │       ├── progress-{agentId}-{taskId}-{runId}-{sessionId}.md ← Run-scoped progress updates
│   │       ├── result-{agentId}-{taskId}-{runId}-{sessionId}.md   ← Run-scoped final outputs
│   │       ├── session-metrics.md         ← Session evidence and experiment results
│   │       ├── experiment-ledger.md       ← Experiment tracking (conditional)
│   │       ├── session-work.md            ← Work workflow session state
│   │       ├── session-ultrawork.md       ← Ultrawork workflow session state
│   │       ├── session-cost-{sessionId}.md ← Per-session spawn cost telemetry
│   │       └── archive/
│   │           └── metrics-{date}.md      ← Archived session metrics
│   └── mcp.json                       ← MCP server configuration
│
├── .claude/                           ← IDE Integration Layer
│   ├── settings.json                  ← Hooks registration and permissions
│   ├── hooks/                         ← Only the variant's runtime-required files (see below)
│   │   ├── oma-hook.sh                ← Generated wrapper: resolves oma binary, exec oma hook "$@"
│   │   ├── hud.ts                     ← [OMA] statusline indicator (bun path, not routed via oma hook)
│   │   └── filter-test-output.sh      ← Test-output filter; in-process test-filter pipes Bash test commands through it
│   ├── skills/                        ← Symlinks → .agents/skills/
│   │   ├── oma-frontend -> ../../.agents/skills/oma-frontend
│   │   ├── oma-backend -> ../../.agents/skills/oma-backend
│   │   └── ...
│   └── agents/                        ← Subagent definitions for Claude Code
│       ├── backend-engineer.md
│       ├── frontend-engineer.md
│       └── ...
│
└── .serena/                           ← Optional: Serena MCP (only created if Serena is used)
    └── memories/                       ← Serena's own onboarding knowledge (code_style.md,
        │                                 project_purpose.md, ...); legacy coordination
        │                                 fallback for older projects
        └── ...
```

---

## .agents/: the Source of Truth

This is the core directory. Everything agents need lives here. It is the only directory that matters for agent behavior. All other directories are derived from it.

### oma-config.cue and oma-config.yaml

**`oma-config.yaml`**: Central configuration file with:
- `language`: Response language code (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl)
- `date_format`: Timestamp format string (`ISO`, `US`, or `EU`; default `ISO`)
- `timezone`: IANA timezone identifier; omitted values use the system timezone
- `model_preset`: Active model preset key (`auto` by default, or a fixed/custom preset)
- `providers`: Capability providers for docs, web, code intelligence, and semantic memory
- `auto_update_cli`: Background update check (default `true`, opt out with `false`)
- `telemetry`: Vendor telemetry opt-in (default `false`)
- `mcp.devtools_browsers`: Optional browser list; unset preserves existing entries
- `agents`: Optional per-agent overrides (object-only `AgentSpec`)
- `models`: Optional user-defined model slugs
- `custom_presets`: Optional user-defined presets with optional `extends:`

### skills/

Where skill expertise lives. There are 33 skill directories plus `_shared` resources in the current catalog; the `all` preset derives from this live tree.

**`_shared/`**: Resources used by all agents:
- `core/`: Routing, context loading, prompt structure, clarification protocol, context budget, difficulty assessment, reasoning templates, quality principles, vendor detection, session metrics, common checklist, lessons learned, API contract templates
- `runtime/`: Memory protocol, event spec, result contract, and vendor-specific execution protocols
- `conditional/`: Quality score measurement, experiment ledger tracking, exploration loop protocol (loaded only when triggered)

**`oma-{skill}/`**: Per-skill directories. Each contains:
- `SKILL.md` (about 2,631 tokens median in the current tree): Layer 1, loaded when the skill is routed. Identity, routing, core rules.
- `resources/`: Layer 2, on-demand. Execution protocols, examples, checklists, error playbooks, tech stacks, snippets, templates.
- Some skills have additional subdirectories: `variants/` (backend/mobile seeds), generated `stack/` references from `/stack-set`, `reference/` (oma-design), and skill-specific scripts/config.

### workflows/

21 Markdown files defining slash command behavior. Each file contains:
- YAML frontmatter with `description`
- Mandatory rules section (response language, step ordering, MCP tool requirements)
- Vendor detection instructions
- Step-by-step execution protocol
- Gate definitions (for persistent workflows)

Persistent workflows: `orchestrate.md`, `work.md`, `ultrawork.md`, and `ralph.md`.
Non-persistent workflows include `plan.md`, `brainstorm.md`, `architecture.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`, `convert.md`, `docs.md`, `explain.md`, `recap.md`, `schedule.md`, and `video.md`.

### agents/

12 subagent definition files used when spawning agents via the Task tool (Claude Code) or CLI. Each file defines:
- Frontmatter: `name`, `description`, `skills` (which skill to load)
- Execution protocol reference
- Charter preflight (CHARTER_CHECK) template
- Architecture summary
- Domain-specific rules (10 rules)
- Statement: "Never modify `.agents/` files"

### plan-\{sessionId\}.json

Generated by the `/plan` workflow. Contains the structured task breakdown with agent assignments, priorities, dependencies, and acceptance criteria. Consumed by `/orchestrate` and `/work`. The companion human-readable tracker lives at `docs/plans/work/{NNN}-{name}.md` (lifecycle via the `Status` field). Permanent design references live alongside under `docs/plans/designs/{NNN}-{name}.md`.

### state/

Active workflow state files for persistent workflows. These JSON files exist only while a persistent workflow is running. Deleting them (or saying "workflow done") deactivates the workflow.

The `state/memories/` subdirectory is the canonical coordination memory store: orchestrator session state, task board, per-agent progress and result files, session metrics, and cost telemetry. It is the path the dashboards watch and the CLI resolves first (older projects fall back to the legacy `.serena/memories/` location). See [.agents/state/memories/: runtime state](#agentsstatememories-runtime-state) below.

### results/

Agent result files. Created by completed agents with status (completed/failed), summary, files changed, and acceptance criteria checklist. Read by the orchestrator during collection and by dashboards for monitoring.

### mcp.json

MCP server configuration including:
- Server definitions (Serena, etc.)
- Memory configuration: `memoryConfig.provider`, `memoryConfig.basePath`, `memoryConfig.tools` (read/write/edit tool names)
- Tool group definitions for `/tools` management

---

## .claude/: IDE integration

This directory connects oh-my-agent to Claude Code and other IDEs.

### settings.json

Registers hooks and permissions for Claude Code. Each event hook entry now uses the `oma hook run` canonical ABI:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [{
          "name": "oma-hook-UserPromptSubmit",
          "type": "command",
          "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/oma-hook.sh --vendor claude --event UserPromptSubmit",
          "timeout": 25
        }]
      }
    ]
  }
}
```

The `statusLine` entry stays on a direct `bun` path (hot-path display, not routed through `oma hook run`).

### hooks/

A vendor's `hooks/` directory contains **only the files that something executes or reads from that directory at runtime**. The handler chain itself (keyword detection, persistent mode, skill injection, …) runs in-process inside the `oma` binary via `oma hook run` — handler `.ts` files are bundled into the CLI at build time and are NOT materialized into vendor directories.

**`oma-hook.sh`**: Generated wrapper script written by `oma link`/`oma install`/`oma update`. Every vendor hook event routes through this file. Resolution order at runtime: `$OMA_BIN` (explicit override) → `command -v oma` (PATH) → well-known install dirs such as `$HOME/.bun/bin` and `$HOME/.local/share/mise/shims` (GUI-launched agents inherit a minimal PATH) → `exit 0` (fail-open, never blocks the agent). Nothing machine-specific is written into the script, so the file is byte-identical for every developer and safe to commit. Passes `"$@"` verbatim so `--vendor`, `--event`, and `--matcher` args reach `oma hook run` unchanged. Includes the self-dedup preamble that suppresses double-fire when both a project and a global install register the same event.

**`hud.ts`**: Renders the `[OMA]` indicator in the status bar showing model name, context usage (color-coded: green/yellow/red), and active workflow state. Registered directly under `statusLine` (not routed through `oma hook run`) to preserve hot-path render latency. Materialized only for vendors whose variant registers a `statusLine` or hud-only event (for example, claude, antigravity, and qwen). It infers its vendor dialect from its own installed path, so the per-vendor copy is load-bearing.

**`filter-test-output.sh`**: Shell filter that trims noisy test-runner output. The in-process test-filter handler rewrites detected Bash test commands to pipe through `<hookDir>/filter-test-output.sh`, so this file is materialized for every vendor whose variant registers `test-filter.ts` (all except cursor).

#### Where the handler logic actually lives

The handler sources are the SSOT at `.agents/hooks/core/` and run in-process via `oma hook run`:

**`keyword-detector.ts`**: Pure handler (`run(input, ctx): HandlerResult | null`) for keyword detection. Logic:
1. Sanitizes input (strips code blocks, quoted strings, pasted system-echo blocks)
2. Scans cleaned input against trigger `keywords` (literal) and `patterns` (regex)
3. Checks for informational patterns in a 60-character window around each match
4. Applies reinforcement guard (suppresses if same workflow triggered 2+ times in 60s)
5. Returns a `context` result injecting `[OMA WORKFLOW: ...]` or `[OMA PERSISTENT MODE: ...]`

**`persistent-mode.ts`**: Pure handler (`run()`) that checks for active state files in `.agents/state/` and reinforces persistent workflow execution. Called in-process via `oma hook run` on `Stop` events.

**`scm-guard.ts`**: Pure handler (`run()`) on `PreToolUse` (Bash/shell tools) that denies `git add` of likely-secret files. Enforces `forbidden_patterns` minus `allowed_exceptions` from `.agents/skills/oma-scm/config/commit-config.yaml` (embedded defaults when the config is absent). Runs before `test-filter` in the chain for claude, codex, cursor, grok, kimi, kiro, and qwen, and in the opencode bridge (`tool.execute.before` throws to block) and pi bridge (`tool_call` returns `{ block: true, reason }`); a command prefixed with `OMA_SCM_ALLOW_SECRETS=1` bypasses the guard after explicit user approval. Broad staging (`git add -A` / `git add .`) is intentionally not blocked — that rule depends on user consent the hook cannot observe.

**`triggers.json`**: The keyword-to-workflow mapping, statically inlined into the `oma` binary at build time (source: `.agents/hooks/core/triggers.json`). Defines:
- `workflows`: Map of workflow name to `{ persistent: boolean, keywords: { language: [...] }, patterns?: { language: [...] } }`. `keywords` are literal phrases; `patterns` are raw regex strings (compiled with `iu` flags).
- `informationalPatterns`: Phrases that indicate questions (filtered out from auto-detection)
- `excludedWorkflows`: Workflows that require explicit `/command` invocation
- `cjkScripts`: Language codes using CJK scripts (ko, ja, zh)

Language sections in `keywords`, `patterns`, and `informationalPatterns` follow this convention:
- `*`: Universal/English. Always loaded regardless of `language` setting in `.agents/oma-config.yaml`.
- `en`: Loaded for backward compatibility. Functionally equivalent to `*`. New English content should go in `*`.
- `ko`/`ja`/`zh`/etc.: Language-specific. Loaded only when `language: <code>` is set in `.agents/oma-config.yaml`.

#### Per-vendor materialization: before → after

Older installs copied the **entire** `.agents/hooks/core/` set (~20 files) into every vendor's hook directory, even though the in-process dispatch made most of them dead files:

```
# BEFORE — every vendor hookDir (.claude/hooks, .codex/hooks, .cursor/hooks, …)
hooks/
├── oma-hook.sh            ← executed (event dispatch)
├── hud.ts                 ← executed (statusLine)
├── filter-test-output.sh  ← read (test-filter pipe target)
├── keyword-detector.ts    ← dead copy (runs in-process via oma hook)
├── persistent-mode.ts     ← dead copy
├── skill-injector.ts      ← dead copy
├── state-boundary.ts      ← dead copy
├── test-filter.ts         ← dead copy
├── code-intelligence-primer.ts ← dead copy
├── triggers.json          ← dead copy (inlined into the oma binary)
├── types.ts, constants.ts, fs-utils.ts, hook-output.ts,
│   agentmemory-client.ts, agy-input.ts,
│   inject-log.ts, state-emit.ts, state-marker.ts,
│   vendor-renderer.ts     ← dead copies (handler-chain internals)
└── …
```

Now the installer derives a whitelist from the vendor's variant JSON (`requiredVariantScripts` in `cli/platform/hooks-composer.ts`) and materializes only what that vendor executes or reads:

```
# AFTER
.claude/hooks/              .codex/hooks/  .grok/hooks/  .kiro/hooks/
├── oma-hook.sh             ├── oma-hook.sh
├── hud.ts                  └── filter-test-output.sh
└── filter-test-output.sh
                            .cursor/hooks/  .commandcode/hooks/
.qwen/hooks/  .kiro/hooks/  └── oma-hook.sh
(same as .claude where the variant needs it)
```

| Vendor | Materialized files | Why |
|---|---|---|
| claude, qwen | `oma-hook.sh`, `hud.ts`, `filter-test-output.sh` | statusLine + test-filter |
| codex, grok, kiro | `oma-hook.sh`, `filter-test-output.sh` | test-filter, no statusLine |
| cursor | `oma-hook.sh` | no statusLine, no test-filter |
| commandcode | `oma-hook.sh` | Stop only — Command Code has no prompt event and PreToolUse cannot rewrite input ([hooks reference](https://commandcode.ai/docs/hooks/reference)) |
| antigravity | none (project) — `hud.ts` + core hooks copied to `~/.gemini/antigravity-cli/hooks/` | agy reads settings only from HOME and workspace hooks from `.agents/hooks.json`, which runs handlers straight from `.agents/hooks/core/`; a project `.gemini/antigravity-cli/` is never loaded (`homeOnly` variant flag) |
| pi | full `.agents/hooks/core/` set under `.pi/extensions/oma/` | the pi bridge spawns handlers as subprocesses instead of using settings hooks |

The destination directory is cleared before copying, so re-running `oma install`/`oma update`/`oma link` on an older install automatically sweeps the stale full-copy files.

#### Debugging a handler chain in isolation

You can run any handler chain against a real payload without triggering the live agent session:

```bash
# Inspect what keyword-detector injects for a given prompt
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a pre_tool block (Bash tool)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event Stop
```

`oma hook run` always exits 0 (fail-open). Empty stdout means the chain produced no-op for that event. The vendor-dialect JSON (or plain text for kiro prompts) is written to stdout when a handler fires.

#### Migration from pre-019 installs

Existing installs that have the old `bun "$CLAUDE_PROJECT_DIR/.claude/hooks/keyword-detector.ts"` entries are automatically migrated the next time you run `oma install`, `oma update`, or `oma link`. The installer uses marker-based replacement: only OMA-managed hook groups (identified by their `name`/`command` patterns) are replaced; any hook groups you added yourself are preserved in their original order. The `statusLine`/hud path is not changed. The pi in-process bridge is not affected. See `cli/commands/hook/command.ts` for the router implementation (internally referred to as "design 019") and `cli/platform/hooks-composer/` for the per-vendor materialization logic.

### skills/

Symlinks pointing to `.agents/skills/`. This makes skills visible to IDEs that read from `.claude/skills/` while keeping `.agents/` as the single source of truth.

### agents/

Subagent definitions formatted for Claude Code's Agent tool. These reference the skill files and include the CHARTER_CHECK template.

---

## .agents/state/memories/: runtime state

Where agents write their progress during orchestration sessions. This is the canonical coordination memory store; the CLI resolves it first and falls back to the legacy `.serena/memories/` path for projects created before the move. Session and task-board files include the session ID; progress and result files include the agent, task, run, and session IDs. This directory is watched by dashboards for real-time updates.

| File | Owner | Purpose |
|------|-------|---------|
| `orchestrator-session-{sessionId}.md` | Orchestrator | Session metadata: ID, status, start time, current phase |
| `task-board-{sessionId}.md` | Orchestrator | Task assignments: agent, task, priority, status, dependencies |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | That run | Turn-by-turn updates: actions taken, files read/modified, current status |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | That run | Final output: completion status, summary, files changed, acceptance criteria |
| `session-metrics.md` | Orchestrator | Material corrections and experiment evidence |
| `experiment-ledger.md` | Orchestrator/QA | Evidence rows for actual experiments |
| `session-work.md` | Work workflow | Work-specific session state |
| `session-ultrawork.md` | Ultrawork workflow | Ultrawork-specific phase tracking |
| `session-cost-{sessionId}.md` | System | Per-session spawn cost telemetry |
| `archive/metrics-{date}.md` | System | Archived session metrics (30-day retention) |

Memory file paths and tool names are configurable in `.agents/mcp.json` via `memoryConfig`.

Serena's own onboarding memories (`code_style.md`, `project_purpose.md`, and similar knowledge files) remain in `.serena/memories/` and are separate from these coordination artifacts.

---

## oh-my-agent source repository structure

If you are working on oh-my-agent itself (not just using it), the repository is a monorepo:

```
oh-my-agent/
├── cli/                  ← CLI tool source (TypeScript, run with bun)
│   ├── cli.ts / bin/     ← CLI entry points
│   ├── commands/         ← User-facing command families
│   ├── platform/         ← Agent, vendor, skill, and hook adapters
│   ├── vendors/ / utils/ / types/
│   ├── package.json
│   └── install.sh        ← Bootstrap installer
├── web/                  ← Documentation site (Docusaurus)
│   ├── docs/             ← English documentation pages (base locale)
│   └── i18n/             ← Translated documentation pages
├── action/               ← GitHub Action for automated skill updates
├── docs/                 ← Translated READMEs and specifications
├── .agents/              ← EDITABLE in source repo (this IS the source)
├── .claude/              ← IDE integration
├── CLAUDE.md             ← Project instructions for Claude Code
└── package.json          ← Root workspace config
```

In the source repo, `.agents/` modifications are allowed (this is the SSOT exception for the source repo itself). The `.agents/` rules about not modifying this directory apply to consumer projects, not the oh-my-agent repository.

Development commands (run from the repository root):
- `bun run test`: CLI tests (vitest)
- `bun run lint`: Lint CLI and web workspaces
- `bun run build`: CLI build
- `bun run typecheck`: Type-check CLI and web
- Commits must follow conventional commit format (commitlint enforced)
