# Supported Agents

`oh-my-agent` uses `.agents/` as the project-level source of truth for skills, workflows, agents, hooks, and shared resources.

`oma install` and `oma link` project that source into each selected runtime's own layout: skill symlinks, generated agent files, hook registrations, MCP entries, and the managed block in `AGENTS.md`. The vendor list lives in `cli/constants/vendors.ts` (`ALL_CLI_VENDORS`); the projection runs in `cli/commands/link/run.ts`.

## Support Matrix

The installer offers 14 targets. Amp is listed for reference only.

| Tool / IDE | Skill path | Status | Interop Mode | Notes |
|------------|------------|--------|--------------|-------|
| Antigravity CLI (`agy`) | `.agents/skills/` (read directly) + `~/.gemini/antigravity-cli/skills/` | First-class | Native + HOME adapter | Workspace hooks in `.agents/hooks.json`, MCP in `.agents/mcp_config.json`, HUD status line in `~/.gemini/antigravity-cli/settings.json`. The HOME skill links need consent at install. No generated agent files |
| Claude Code | `.claude/skills/` | First-class | Native + Adapter | Skill symlinks, workflow slash commands, `.claude/agents/`, `.claude/rules/`, hooks and HUD in `.claude/settings.json`, MCP in `.mcp.json`. Reads the OMA block in `AGENTS.md` |
| Codex CLI | `.codex/skills/` | First-class | Native + Adapter | `.codex/agents/*.toml`, hooks in `.codex/hooks.json` (trust them once with `/hooks`), MCP in `.codex/config.toml`, `AGENTS.md` |
| CommandCode | `.commandcode/skills/` | First-class (opt-in) | Native + Adapter | `.commandcode/agents/`, hooks in `.commandcode/settings.json`, MCP in the project `.mcp.json` it shares with Claude Code. Not selected by default |
| Cursor | `.cursor/skills/` | First-class | Native + Adapter | `.cursor/rules/*.mdc`, `.cursor/agents/` (`@agent-name`), hooks in `.cursor/hooks.json`, a generated `.cursor/mcp.json`, `AGENTS.md` |
| GitHub Copilot | `.github/skills/` | Supported | Symlinks + prompts + MCP | Workflow wrappers in `.github/prompts/*.prompt.md`, MCP in `.github/mcp.json`. No hooks |
| Grok Build | `.agents/skills/` (read directly, no symlinks) | First-class | Native + Adapter | `.grok/agents/`, hooks in `.grok/hooks/oma-hooks.json`, MCP in `.grok/config.toml` |
| Hermes Agent | `~/.hermes/skills/oma/` | Supported | HOME skills + MCP | HOME-only, so it needs consent and has no per-project isolation. MCP in `~/.hermes/config.yaml`. No hooks |
| Kimi Code CLI | `.agents/skills/` (read directly) + `~/.kimi-code/skills/` | First-class (opt-in) | Native + HOME adapter | Hooks are global-only `[[hooks]]` in `~/.kimi-code/config.toml`; MCP stays in the project `.kimi-code/mcp.json`. HOME writes need consent. No generated agent files |
| Kiro CLI | `.kiro/skills/` | First-class (opt-in) | Native + Adapter | `.kiro/agents/*.md`, hook agent `.kiro/agents/oma-hooks.json` (set as the default agent when none is set), `.kiro/hooks/oma-hook.sh`, MCP under `.kiro/settings/` |
| OpenCode | `.opencode/skills/` | First-class | In-process plugin | Plugin bridge in `.opencode/plugins/oma/`, registered in `.opencode/opencode.jsonc` (or an existing `.opencode/opencode.json`); generated `.opencode/agents/*.md` |
| pi | `.agents/skills/` (read directly) | Supported | Extension bridge | Hooks through the `.pi/extensions/oma/` extension, workflow prompts in `.pi/prompts/*.md`, MCP in `.pi/mcp.json` through pi-mcp-adapter, `AGENTS.md` |
| Qwen Code | `.agents/skills/` (read directly) | First-class | Native + Adapter | Workflow links in `.qwen/skills/`; `.qwen/agents/*.md`, hooks, HUD, and MCP in `.qwen/settings.json`, `AGENTS.md`. No domain skill links |
| ZCode | none (workflows only) | Supported | Workflow slash-commands | Workflow symlinks in `.zcode/commands/*.md`, MCP in `.zcode/config.json`. No skills, no hooks |
| Amp | `.agents/skills/` | Compatible | Reads the SSOT | Not an installer target; Amp reads `.agents/skills/` on its own |
| Gemini CLI | none | Removed | none | The Gemini CLI vendor is gone: oma no longer writes `.gemini/agents/` or Gemini hooks, and `oma link gemini` is rejected. Google stops serving Gemini CLI for Google One and unpaid tiers on June 18, 2026. `model_preset: gemini` redirects to `antigravity`, and a config that still names a `gemini` preset or a `google/*` model prints a deprecation warning (`cli/utils/gemini-deprecation.ts`). Use Antigravity CLI |

Opt-in vendors appear in the installer but are not preselected; neither are the in-process plugin vendors (OpenCode, pi). HOME-scoped vendors (Antigravity, Hermes, Kimi) are not offered on Windows or in CI; an interactive install asks before linking their skills into HOME, and a non-interactive install (`-y`) skips that step.

Every vendor that gets skill symlinks also gets each workflow as a slash-command skill: `<skill dir>/<workflow>/SKILL.md` is a symlink to `.agents/workflows/<workflow>.md`. Vendors that read `.agents/skills/` directly (Grok, pi, Amp) get no such links.

Qwen reads domain skills from `.agents/skills/` directly and keeps only workflow links in `.qwen/skills/`. Install, update, and link remove legacy OMA skill links while preserving user-owned entries. Qwen does not consume optimizer overlays outside the shared discovery directory, so overlay promotion is refused in Qwen projects.

## Hook Wiring

Which hooks each runtime registers, from `.agents/hooks/variants/` and the vendor installers. The [README Host differences table](../README.md#host-differences) summarizes the last two columns.

| Runtime | Registered in | Events | Keyword detection | Stop gate |
|---------|---------------|--------|-------------------|-----------|
| Claude Code | `.claude/settings.json` | SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop | yes | yes |
| Codex CLI | `.codex/hooks.json` | UserPromptSubmit, PreToolUse, PostToolUse, Stop | yes | yes |
| Qwen Code | `.qwen/settings.json` | UserPromptSubmit, PreToolUse, PostToolUse, Stop | yes | yes |
| Grok Build | `.grok/hooks/oma-hooks.json` | UserPromptSubmit, PreToolUse, PostToolUse, Stop | yes | yes |
| Kimi Code CLI | `~/.kimi-code/config.toml` (global only) | UserPromptSubmit, PreToolUse, PostToolUse, Stop | yes | yes |
| Cursor | `.cursor/hooks.json` | sessionStart, beforeSubmitPrompt, preToolUse, afterFileEdit, stop | yes | yes (re-enters as a follow-up message) |
| Antigravity CLI | `.agents/hooks.json` | PreInvocation, PostToolUse, Stop | yes | yes (handlers run through `bun`, not the `oma` wrapper) |
| OpenCode | `.opencode/plugins/oma/` (in-process plugin) | `chat.message`, `tool.execute.before`, `session.idle` | yes | best-effort |
| pi | `.pi/extensions/oma/` (in-process extension) | `before_agent_start`, `tool_call`, `agent_settled` | yes | best-effort (needs a pi build with `agent_settled`) |
| Kiro CLI | `.kiro/agents/oma-hooks.json` | userPromptSubmit, preToolUse, stop | yes | no: Kiro ignores Stop hook output |
| CommandCode | `.commandcode/settings.json` | SessionStart, PostToolUse, Stop | no prompt hook | yes |
| GitHub Copilot, Hermes, ZCode | none | none | no hooks | no hooks |

Antigravity hooks fire only in interactive sessions; headless `agy --print` does not run them. Codex does not run `.codex/hooks.json` until you trust it once in its `/hooks` browser.

## Vendor Adaptation

<!-- oma-docs:ignore-start -->
> **slug-based dispatch.** Vendor selection is driven by model slugs resolved against the built-in registry (`cli/platform/model-registry/raw-registry.ts`) plus user slugs under `models:` in `.agents/oma-config.yaml`. Per-agent overrides and the active runtime profile live in `.agents/oma-config.cue` or `.agents/oma-config.yaml`. See [web/docs/guide/per-agent-models.md](../web/docs/guide/per-agent-models.md).
<!-- oma-docs:ignore-end -->

Abstract agent definitions in `.agents/agents/` are vendor-neutral (name, description, skills only). The CLI generates vendor-specific files from the variants in `.agents/agents/variants/` (Qwen's variant is built into `cli/platform/agent-composer.ts`):

| Vendor | Generated Path | Format | Subagent Spawning |
|--------|---------------|--------|-------------------|
| Claude Code | `.claude/agents/*.md` | Markdown with frontmatter | Agent tool; `oma agent spawn` runs natively from a Claude session |
| Codex CLI | `.codex/agents/*.toml` | TOML | Native |
| CommandCode | `.commandcode/agents/*.md` | Markdown | Loaded by CommandCode; `oma agent spawn` has no CommandCode target |
| Cursor | `.cursor/agents/*.md` | Markdown | `@agent-name`; `oma agent spawn` runs `cursor agent -p` natively from a Cursor session |
| Grok Build | `.grok/agents/*.md` | Markdown | Loaded by Grok; `oma agent spawn --vendor grok` runs as an external process |
| Kiro CLI | `.kiro/agents/*.md` | Markdown | Native (`kiro-cli chat --agent <name>`) |
| OpenCode | `.opencode/agents/*.md` | Markdown | `oma agent spawn --vendor opencode` (external) |
| Qwen Code | `.qwen/agents/*.md` | Markdown | Qwen's Agent tool (`subagent_type`); `oma agent spawn` always runs Qwen as an external process |
| Antigravity CLI | none (no generated files) | none | Native: `agy -p "@<agent> …"` |
| Kimi Code CLI | none | none | `oma agent spawn --vendor kimi` (external) |
| pi | none (`.pi/prompts/*.md` are workflow prompts, not agents) | none | `oma agent spawn --vendor pi` (external); pi has no native subagent API |

## What “First-class” Means

- The installer understands the tool's expected project layout
- Skills remain authored once under `.agents/skills/`
- Interop directories are generated rather than becoming separate sources of truth
- Workflows and shared resources continue to be managed from the same project structure

## Claude Code Native Integration

Claude Code gets more than skill symlinks:

- **`AGENTS.md`**: oma writes its managed block into `AGENTS.md`. It never creates `CLAUDE.md`; when a user-owned `CLAUDE.md` exists, oma appends one `@AGENTS.md` import line so the block is not shadowed.
- **`.claude/skills/`**: domain skills are directory symlinks to `.agents/skills/`. Each workflow is a `.claude/skills/<workflow>/SKILL.md` symlink to `.agents/workflows/<workflow>.md`, invoked as a slash command, not keyword-auto-activated.
- **`.claude/agents/`**: subagent definitions generated from `.agents/agents/*.md`
- **`.claude/rules/`**: rules generated from `.agents/rules/`, with `globs` mapped to `paths`
- **`.claude/settings.json`**: hook registrations, the HUD status line, and permission entries; project installs also mark the workspace trusted in `~/.claude.json`
- **`.mcp.json`**: project MCP servers seeded from `.agents/mcp.json`; user entries are kept. The configured code-intelligence server (`providers.code_intelligence`) is approved in an existing `.claude/settings.local.json`, including after an Esc on Claude's "new MCP servers" dialog rejected it
- **Native loop patterns**: Review Loop, Issue Remediation Loop, and Phase Gate Loop run through the Agent tool
- Generated files point back to `.agents/` as the source of truth. Edit `.agents/` and rerun `oma link`; do not edit the generated copies.

## Host Trust for oma Hooks

Most hosts hold a project's hooks back until the user trusts the folder, and `-p` / headless runs never ask, so a fresh install would run without oma until someone answered a prompt. `oma install`, `oma update` and `oma link` record that trust the way each host's own "trust" answer does. They only touch a host that has been run before, never override an explicit "untrusted" decision, and skip the step on a write they cannot make exactly.

| Host | What oma records |
|---|---|
| Claude Code | `projects[<root>].hasTrustDialogAccepted` in `.claude.json` (in `$CLAUDE_CONFIG_DIR` when set, else `~`) |
| Qwen Code | the approval of oma's project hooks in `~/.qwen/hookApprovals.json`, and `TRUST_FOLDER` in `~/.qwen/trustedFolders.json` (needed once `security.folderTrust.enabled` is on) |
| Codex | `[projects."<root>"] trust_level = "trusted"` plus a `[hooks.state."…"] trusted_hash` for each oma hook in `$CODEX_HOME/config.toml` (global installs: the hook hashes only). Hooks you disabled are left alone |
| cursor-agent | the `.workspace-trusted` marker under `~/.cursor/projects/<slug>/` |
| Copilot CLI | the project in `trustedFolders` of `~/.copilot/config.json` |
| Grok | `[folders."<git root>"] trusted = true` in `~/.grok/trusted_folders.toml` |
| Antigravity (agy) | the project in `trustedWorkspaces` of `~/.gemini/antigravity-cli/settings.json` |
| Kiro (V3 engine) | `workspaceTrusted: true` in `~/.kiro/workspace-roots/<id>/permissions.yaml` (not on Windows) |
| Command Code | the `~/.commandcode/projects/<slug>` directory |
| pi (0.79+) | `"<root>": true` in `~/.pi/agent/trust.json` |

opencode, Kilo and Kimi load hooks and plugins without a trust gate. Grok, Cursor and Copilot CLI also run the `.claude/settings.json` hooks; when the host has its own oma hooks, the Claude copy steps aside so oma runs once. Trust is recorded for project installs only, except Codex's per-hook hashes, which global hooks need too.

## Current Design Principle

`oh-my-agent` does not want one repository per IDE.

Instead:

1. author skills once under `.agents/`
2. generate compatibility views for each tool
3. keep workflows and shared resources portable
4. preserve one source of truth for versioning and maintenance

## Dispatch Principle

For each planned agent:

1. Resolve the target vendor from `.agents/oma-config.cue` or `.agents/oma-config.yaml`
2. If `target_vendor === current_runtime_vendor` and the vendor has a native path (Antigravity, Claude Code, Codex, Cursor, Kiro), use it
3. Otherwise, fall back to `oma agent spawn` as an external process

## Related Docs

- [AGENTS_SPEC.md](./AGENTS_SPEC.md)
- [README.md](../README.md)
- [web/docs/guide/integration.md](../web/docs/guide/integration.md)
