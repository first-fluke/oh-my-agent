# Supported Agents

`oh-my-agent` uses `.agents/` as the project-level source of truth for skills, workflows, and shared resources.

The installer can then project compatibility to other tool-specific directories with symlinks where needed.

## Support Matrix

| Tool / IDE | Project Skill Path | Status | Interop Mode | Notes |
|------------|--------------------|--------|--------------|-------|
| Antigravity | `.agents/skills/` | First-class | Native | Primary source-of-truth layout; reads `.agents/agents/` directly but no custom subagent spawning |
| Claude Code | `.claude/skills/` + `.claude/agents/` | First-class | Native + Adapter | Domain skill symlinks + thin router workflow skills, subagents generated from `.agents/agents/`, and CLAUDE.md |
| Codex CLI | `.codex/agents/` + `.agents/skills/` | First-class | Native + Adapter | Agent definitions generated as TOML from `.agents/agents/`; same-vendor tasks can dispatch natively |
| Gemini CLI | `.gemini/agents/` + `.agents/skills/` | First-class | Native + Adapter | Agent definitions generated as Markdown from `.agents/agents/`; same-vendor tasks can dispatch natively |
| OpenCode | `.agents/skills/` | First-class | Native-compatible | Shares the same project-level source |
| Amp | `.agents/skills/` | First-class | Native-compatible | Shares the same project-level source |
| Cursor | `.agents/skills/` | First-class | Native-compatible | Can consume the same project-level skill source |
| GitHub Copilot | `.github/skills/` | Supported | Optional symlink | Created when selected during install |

## Vendor Adaptation

> **RARDO v2.1 — slug-based dispatch.** Vendor selection is now driven by model slugs resolved against `CORE_REGISTRY` (12 verified slugs) plus user additions via `.agents/config/models.yaml`. Per-agent overrides and the active runtime profile live in `.agents/oma-config.yaml`. See [web/docs/guide/per-agent-models.md](../web/docs/guide/per-agent-models.md).

Abstract agent definitions in `.agents/agents/` are vendor-neutral (name, description, skills only). The CLI generates vendor-specific files:

| Vendor | Generated Path | Format | Subagent Spawning |
|--------|---------------|--------|-------------------|
| Claude Code | `.claude/agents/*.md` | Markdown with frontmatter | Task tool |
| Codex CLI | `.codex/agents/*.toml` | TOML | Native |
| Gemini CLI | `.gemini/agents/*.md` | Markdown | Native |
| Antigravity | (reads `.agents/agents/` directly) | YAML | Not supported (no custom subagents) |

## What “First-class” Means

- The installer understands the tool's expected project layout
- Skills remain authored once under `.agents/skills/`
- Interop directories are generated rather than becoming separate sources of truth
- Workflows and shared resources continue to be managed from the same project structure

## Claude Code Native Integration

Claude Code extends beyond symlinks with a full native adapter layer:

- **`CLAUDE.md`** at project root (auto-loaded by Claude Code)
- **`.claude/skills/`** — 12 thin router SKILL.md files that delegate to `.agents/workflows/` (they contain routing logic only, not workflow content). Skills are explicitly invoked via slash commands, not keyword-auto-activated.
- **`.claude/agents/`** — generated subagent definitions from `.agents/agents/*.md`
- **`.codex/agents/`** — generated Codex custom agents for same-vendor native dispatch
- **`.gemini/agents/`** — generated Gemini native agents for same-vendor native dispatch
- **`stack/`** — generated backend stack artifacts (SSOT exception, created by `/stack-set` or `oma install` variant)
- **Native loop patterns** — Review Loop, Issue Remediation Loop, Phase Gate Loop via Task tool
- Domain skills remain as symlinks from `.agents/skills/` (coexist with thin router workflow skills)
- `.agents/` is never modified — all native files reference it as the source of truth

## Current Design Principle

`oh-my-agent` does not want one repository per IDE.

Instead:

1. author skills once under `.agents/`
2. generate compatibility views for each tool
3. keep workflows and shared resources portable
4. preserve one source of truth for versioning and maintenance

## Dispatch Principle

For each planned agent:

1. Resolve the target vendor from `.agents/oma-config.yaml`
2. If `target_vendor === current_runtime_vendor`, use the runtime's native agent file (`.claude/agents`, `.codex/agents`, `.gemini/agents`)
3. Otherwise, fall back to `oma agent:spawn`

## Related Docs

- [AGENTS_SPEC.md](./AGENTS_SPEC.md)
- [README.md](../README.md)
- [web/content/en/guide/integration.md](../web/content/en/guide/integration.md)
