# Vendor Detection Protocol

When executing a workflow, determine your runtime environment using this priority order.
Then resolve the target vendor for each agent from `.agents/oma-config.yaml`: the `model_preset` entry plus per-agent `agents:` overrides resolve each agent to a model slug (`<owner>/<slug>`), and the model's owning vendor is that agent's target vendor. See `web/docs/guide/per-agent-models.md` for the resolution order. (The legacy `agent_cli_mapping` / `default_cli` keys were replaced by `model_preset` in migration 008; only pre-migration configs still carry them.)

Important:
- Do **not** choose one spawn strategy for the entire workflow based only on the main runtime vendor.
- Decide per agent:
  - `current_runtime_vendor`
  - `target_vendor_for_agent`
  - whether that exact runtime can invoke that target vendor natively
- If native invocation is not available for that agent, fall back to `oma agent:spawn`.

## Detection Order (use first match)

1. **Claude Code**: Your system prompt contains "You are Claude Code" OR the `Agent` tool is available
2. **OpenCode**: The native `task` tool is available in the current session OR the runtime identifies as OpenCode (e.g. `OMA_RUNTIME_VENDOR=opencode`). This takes precedence over generic `apply_patch` availability.
3. **Codex CLI**: Your system prompt contains "Codex CLI" OR the `apply_patch` tool is available — but only when no higher-priority runtime-specific subagent tool (e.g. OpenCode's `task`) is present.
4. **Gemini CLI**: This file was auto-loaded from `.agents/skills/` AND `@` subagent syntax is available
5. **Antigravity IDE**: This file was auto-loaded from `.agents/skills/` AND no `@` subagent syntax
6. **CLI Fallback**: None of the above matched → use `oma agent:spawn`

> Why OpenCode outranks the `apply_patch` signal: an OpenCode session can expose
> both `apply_patch` and the native `task` tool. Matching Codex on `apply_patch`
> first would misclassify the runtime and push every agent onto the `oma
> agent:spawn` external fallback instead of native `task` dispatch.

## Vendor-Specific Spawn Methods

| Vendor | Spawn Method | Result Handling |
|:---|:---|:---|
| Claude Code | `Agent` tool with `.claude/agents/{name}.md` | Synchronous return |
| OpenCode | Same session: native `task` tool with `subagent_type: {agent-id}` (the only path that shows as a native child task in the active OpenCode GUI/TUI). External fallback: `oma agent:spawn`, which creates a temporary primary wrapper that delegates to the `mode: subagent` agent — `opencode run --agent {subagent}` alone is rejected and falls back to the default agent. | Native task return / result file poll |
| Codex CLI | Native custom agents in `.codex/agents/{name}.toml` via `codex exec "@agent ..."` when available, otherwise `oma agent:spawn` | JSON output |
| Gemini CLI | `.gemini/agents/{name}.md` native subagents via `gemini -p "@agent ..."` when available, otherwise `oma agent:spawn` | JSON output or MCP memory poll |
| Antigravity | Prefer `oma agent:spawn` unless a native role-subagent path is explicitly verified for the target vendor | MCP memory poll |
| CLI Fallback | `oma agent:spawn {agent} {prompt} {session} -w {workspace}` | Result file poll |

## Dispatch Rule

For each agent:

1. Resolve `target_vendor_for_agent` from config
2. If `target_vendor_for_agent === current_runtime_vendor` and that runtime has a verified native role-subagent path for that vendor, use the vendor variant agent definition
3. Otherwise, use `oma agent:spawn`

Example:
- Runtime: Claude Code
- Resolved models: `frontend` → `anthropic/…`, `backend` → `anthropic/…`, `qa` → `google/…` (owning vendors: claude, claude, gemini)
- Result:
  - `frontend` -> native Claude subagent
  - `backend` -> native Claude subagent
  - `qa` -> external Gemini spawn

### OpenCode specifics

- If `current_runtime_vendor == opencode` and `target_vendor_for_agent == opencode` and the `task` tool exists, use native `task(subagent_type: "<agent-id>")`.
- Do **not** use `oma agent:spawn` for same-session OpenCode subagents — it is an external fallback and will not appear as a native child task in the active OpenCode GUI/TUI.
- Before using the `oma agent:spawn` fallback, confirm that native same-runtime dispatch is genuinely unavailable.
