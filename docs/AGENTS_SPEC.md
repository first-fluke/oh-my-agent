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

## Interoperability Model

`oh-my-agent` authors skills once under `.agents/skills/`.

Compatibility directories are projections, not separate sources of truth:

- `.claude/skills/`
- `.cursor/skills/`
- `.github/skills/`

Where supported, these should point back to `.agents/skills/` via symlinks or equivalent generated views.

### Claude Code Native Adapter

Claude Code uses a hybrid model beyond simple symlinks:

```text
.claude/
├── skills/
│   ├── oma-backend/  → ../../.agents/skills/oma-backend  (symlink, domain skill)
│   ├── orchestrate/SKILL.md                                   (native, workflow skill)
│   └── ...
├── agents/
│   ├── backend-engineer.md         (subagent definition)
│   ├── qa-reviewer.md          (subagent definition)
│   └── ...
└── settings.local.json         (hooks for SSOT protection)
```

- **Domain skills**: symlinked from `.agents/skills/` (unchanged)
- **Workflow skills**: native SKILL.md files that reference `.agents/workflows/*.md` as the source of truth
- **Subagents**: `.claude/agents/*.md` definitions spawned via Task tool, referencing domain skills via `skills:` frontmatter
- **CLAUDE.md**: project-level integration file auto-loaded by Claude Code

All native files reference `.agents/` — they never replace or duplicate it.

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
