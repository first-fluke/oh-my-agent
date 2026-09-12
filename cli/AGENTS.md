<!-- OMA:START — managed by oh-my-agent. Do not edit this block manually. -->

# CLI instructions

Follow the repository-root instructions for authorization, completion, provider selection, and project rules. Paths below are relative to the repository root.
Use `.agents/skills/_shared/core/code-intelligence.md` for the configured provider and native fallback; this directory does not select a separate provider.

- **Subagents**: Same-vendor native dispatch via Codex custom agents in `.codex/agents/{name}.toml`; cross-vendor fallback via `oma agent spawn`; use the root dispatch configuration.
- Select tests from the affected CLI behavior. Run builds only when explicitly requested.

## Workflows

Run workflows only when explicitly requested or detected by a hook; never self-initiate. Read `.agents/workflows/{name}.md` for the selected workflow.

<!-- OMA:END -->
