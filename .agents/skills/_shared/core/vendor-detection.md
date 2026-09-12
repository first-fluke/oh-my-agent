# Vendor Detection Protocol

When executing a workflow, determine your runtime environment using this priority order.
Then resolve the target vendor for each agent from `.agents/oma-config.cue` or `.agents/oma-config.yaml`. Apply project-local configuration overlays. With `model_preset: free`, use `oma agent spawn` so the FreeLLMAPI route is applied. Otherwise explicit `agents:` model overrides take priority. With `model_preset: auto` (the default for new installs), unconfigured agents follow the current runtime's native agent definitions and model settings; do not substitute a fixed vendor preset or inject a model/effort override. When the runtime cannot be detected, use `default_cli` (or `claude` when omitted). Fixed built-in and custom presets continue to resolve model slugs (`<owner>/<slug>`) to their owning vendors. See `web/docs/guide/per-agent-models.md` for details.

Important:
- Do **not** choose one spawn strategy for the entire workflow based only on the main runtime vendor.
- Decide per agent:
  - `current_runtime_vendor`
  - `target_vendor_for_agent`
  - whether that exact runtime can invoke that target vendor natively
- If native invocation is not available for that agent, fall back to `oma agent spawn`.

## Identify the current runtime

Use explicit host identity and runtime configuration first. Inspect the native dispatch capability actually exposed in the session. Shared tool names such as `apply_patch`, an `@` syntax, or a skill-directory path do not uniquely identify a vendor.

If identity or native dispatch is unresolved, use the configured fallback; do not guess that the runtime is Codex or Antigravity from a generic tool. For OpenCode, an explicitly identified session with native `task` can dispatch through it even when `apply_patch` is also available.

## Vendor-Specific Spawn Methods

| Vendor | Spawn Method | Result Handling |
|:---|:---|:---|
| Claude Code | `Agent` tool with `.claude/agents/{name}.md` | Synchronous return |
| OpenCode | Same session: native `task` tool with `subagent_type: {agent-id}` (the only path that shows as a native child task in the active OpenCode GUI/TUI). External fallback: `oma agent spawn`, which creates a temporary primary wrapper that delegates to the `mode: subagent` agent — `opencode run --agent {subagent}` alone is rejected and falls back to the default agent. | Native task return / result file poll |
| Codex CLI | Current-session native dispatch with custom agents in `.codex/agents/{name}.toml` when available, otherwise `oma agent spawn` | JSON output |
| Gemini CLI | Current-session native dispatch with `.gemini/agents/{name}.md` when available, otherwise `oma agent spawn` | JSON output or MCP memory poll |
| Antigravity | Prefer `oma agent spawn` unless a native role-subagent path is explicitly verified for the target vendor | MCP memory poll |
| CLI Fallback | `oma agent spawn {agent} {prompt} {session} -w {workspace}` | Result file poll |

## Dispatch Rule

For each agent:

1. Resolve `target_vendor_for_agent` from config
2. If `target_vendor_for_agent === current_runtime_vendor` and that runtime has a verified native role-subagent path for that vendor, use the vendor variant agent definition
3. Otherwise, use `oma agent spawn`

Example:
- Runtime: Claude Code
- Resolved models: `frontend` → `anthropic/…`, `backend` → `anthropic/…`, `qa` → `google/…` (owning vendors: claude, claude, gemini)
- Result:
  - `frontend` -> native Claude subagent
  - `backend` -> native Claude subagent
  - `qa` -> external Gemini spawn

### OpenCode specifics

- If `current_runtime_vendor == opencode` and `target_vendor_for_agent == opencode` and the `task` tool exists, use native `task(subagent_type: "<agent-id>")`.
- Do **not** use `oma agent spawn` for same-session OpenCode subagents — it is an external fallback and will not appear as a native child task in the active OpenCode GUI/TUI.
- Before using the `oma agent spawn` fallback, confirm that native same-runtime dispatch is genuinely unavailable.
