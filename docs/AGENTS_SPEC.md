# `.agents` Specification

This document defines the project convention used by `oh-my-agent` for portable agent skills, workflows, and shared resources.

It is not a formal external standard. It is the interoperability contract used by this repository and its installer.

## Goals

- keep one project-level source of truth for skills
- make skills portable across multiple AI IDEs and CLIs
- separate reusable skills from workflow orchestration
- support generated compatibility directories without duplicating content

## Source-of-Truth Layout

```text
.agents/
├── agents/                 (abstract agent definitions — vendor-neutral SSOT)
│   ├── backend-engineer.md
│   ├── frontend-engineer.md
│   └── ...
├── skills/
│   ├── _shared/
│   │   ├── core/
│   │   ├── conditional/
│   │   └── runtime/
│   ├── <skill-name>/
│   │   ├── SKILL.md
│   │   └── resources/
│   └── _version.json
├── workflows/
├── config/
├── brain/
├── stack/                  (generated backend stack — SSOT exception)
│   └── variants/           (language/framework variant definitions)
└── mcp.json
```

## Skills

Each skill lives at:

```text
.agents/skills/<skill-name>/SKILL.md
```

### Required file

- `SKILL.md`

### Required frontmatter

- `name`
- `description`

### Optional skill folders

- `resources/`
- `scripts/`
- `templates/`
- `config/`
- `stack/` (generated backend stack artifacts, language-agnostic)
- `variants/` (stack variant definitions for different languages/frameworks)

## Shared Resources

Shared, non-skill-specific materials live under:

```text
.agents/skills/_shared/
```

This includes:

- `core/` for commonly referenced guides and rules
- `conditional/` for protocols loaded only when a workflow reaches a trigger
- `runtime/` for CLI/runtime-injected protocols
- shared templates such as `core/api-contracts/`

## Abstract Agent Definitions

Vendor-neutral agent definitions live under:

```text
.agents/agents/<agent-name>.md
```

Each definition contains only portable fields:

- `name`: agent identifier (e.g., `backend-engineer`)
- `description`: role summary
- `skills`: list of domain skills the agent may use

These definitions contain no vendor-specific fields (no Claude `allowed_tools`, no Codex `model`, etc.). The CLI generates vendor-adapted files from these abstractions:

- `.claude/agents/*.md` (Claude Code, Markdown with frontmatter)
- `.codex/agents/*.toml` (Codex CLI, TOML format)
- `.commandcode/agents/`, `.cursor/agents/`, `.grok/agents/`, `.kiro/agents/`, `.opencode/agents/`, `.qwen/agents/` (Markdown)

Antigravity CLI gets no generated agent files; it dispatches natively with `agy -p "@<agent> …"`. See [SUPPORTED_AGENTS.md](./SUPPORTED_AGENTS.md) for the full per-vendor table. The Gemini CLI vendor was removed: oma no longer generates `.gemini/agents/`.

## Workflows

Multi-step orchestration flows live under:

```text
.agents/workflows/*.md
```

These are distinct from skills:

- **skills** provide reusable role/domain behavior
- **workflows** sequence multiple agents or phases

## Config

Project-level defaults live under:

```text
.agents/config/
```

Typical examples:

- user preferences
- CLI mappings
- MCP bridge settings

### `agent_cli_mapping`: dual format

`agent_cli_mapping` in `.agents/oma-config.yaml` accepts two value shapes so legacy configs keep working:

```yaml
agent_cli_mapping:
  pm: "claude"                         # legacy string — vendor only
  backend:                             # AgentSpec object
    model: "openai/gpt-5.5"
    effort: high
    thinking: false
    memory: default
```

Unspecified agents fall back to the active `runtime_profile` defined in `defaults.yaml` (`antigravity`, `claude`, `codex`, `qwen`, `cursor`, `mixed`). See [web/docs/guide/per-agent-models.md](../web/docs/guide/per-agent-models.md) for the full resolution order.

## Interoperability Model

`oh-my-agent` authors skills once under `.agents/skills/`.

Compatibility directories are projections, not separate sources of truth:

- `.claude/skills/` (domain skill symlinks plus workflow `SKILL.md` symlinks into `.agents/workflows/`)
- `.codex/agents/` (generated from `.agents/agents/`)
- `.cursor/skills/`
- `.github/skills/`

Where supported, these should point back to `.agents/` via symlinks or equivalent generated views. Every vendor that gets skill symlinks also gets each workflow as a slash-command skill: `<vendor skills dir>/<workflow>/SKILL.md` is a symlink to `.agents/workflows/<workflow>.md`, so the workflow file is its own skill manifest and no wrapper or copy is generated (`cli/platform/skills-installer/workflow-links.ts`).

### Claude Code Native Adapter

Claude Code uses a hybrid model beyond simple symlinks:

```text
.claude/
├── skills/
│   ├── oma-backend/  → ../../.agents/skills/oma-backend  (symlink, domain skill, language-agnostic)
│   ├── orchestrate/SKILL.md  → ../../../.agents/workflows/orchestrate.md  (symlink, workflow slash command)
│   └── ...
├── agents/
│   ├── backend-engineer.md         (generated from .agents/agents/backend-engineer.md)
│   ├── qa-reviewer.md              (generated from .agents/agents/qa-reviewer.md)
│   └── ...
└── settings.local.json         (hooks for SSOT protection)
```

- **Domain skills**: symlinked from `.agents/skills/` (unchanged)
- **Workflow skills**: each `.claude/skills/<workflow>/SKILL.md` is a symlink to `.agents/workflows/<workflow>.md`, invoked as a slash command (not keyword-auto-activated)
- **Subagents**: `.claude/agents/*.md` definitions generated from `.agents/agents/*.md` abstractions, spawned via Agent tool
- **CLAUDE.md**: project-level integration file auto-loaded by Claude Code

All native files reference `.agents/`; they never replace or duplicate it.

## Same-Vendor Native Dispatch

Workflows resolve a target vendor per agent from `.agents/oma-config.yaml`.

- If `target_vendor === current_runtime_vendor`, OMA should use the runtime's native agent file first:
  - Claude Code -> `.claude/agents/*.md`
  - Codex CLI -> `.codex/agents/*.toml`
  - Cursor -> `.cursor/agents/*.md`
  - Kiro CLI -> `.kiro/agents/*.md`
  - Antigravity CLI -> `agy -p "@<agent> …"` (no generated files)
- If the task targets a different vendor, or the native path is unavailable, OMA falls back to `oma agent spawn`.

## Packaging Rules

- repository-owned skill metadata is tracked in git
- generated compatibility directories should not become divergent copies
- manifests may be generated for packaging and validation
- workflows and shared resources remain anchored to `.agents/`

## Invariants

- one canonical project skill source
- portable `SKILL.md` shape
- explicit separation between skills, workflows, and shared resources
- compatibility is additive, not a forked content model

## Why This Matters

Without a shared project convention, each AI IDE or CLI tends to create its own isolated prompt/plugin ecosystem.

`.agents/` is the mechanism `oh-my-agent` uses to keep:

- skills reusable
- maintenance centralized
- workflows portable
- team-level agent design consistent
