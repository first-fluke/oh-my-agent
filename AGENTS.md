<!-- OMA:START — managed by oh-my-agent. Do not edit this block manually. -->

# oh-my-agent

Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. System/developer instructions and the user's request take precedence over OMA defaults. Never build, compile, bundle, or package software unless the user explicitly requests a build.

- **SSOT**: Do not modify `.agents/` definitions (skills, workflows, rules, agents, config) directly. Run outputs under `.agents/results/` and `.agents/state/` are generated artifacts and may be written.
- **Response language**: The user's prompt language wins; use `language` in `.agents/oma-config.yaml` only when the prompt carries no language signal, then English.
- **Skills**: Read the relevant `.agents/skills/{name}/SKILL.md` when needed.
- **Subagents**:
  - claude: Same-vendor native dispatch via Claude Code Agent tool with `.claude/agents/{name}.md`; cross-vendor fallback via `oma agent spawn`
  - codex: Same-vendor native dispatch via Codex custom agents in `.codex/agents/{name}.toml`; cross-vendor fallback via `oma agent spawn`. A role file without `model` runs on your model: spawn `docs-curator` and `research-explorer` with the fastest model the spawn tool lists as available, and leave `model` unset otherwise. Never invent a model name
  - cursor: `@agent-name` (defined in `.cursor/agents/`)
  - qwen: Same-vendor native dispatch via Qwen Code subagents in `.qwen/agents/{name}.md`; cross-vendor fallback via `oma agent spawn`
  - pi: pi has no native subagent API; use `oma agent spawn {agent} {prompt} {sessionId} --vendor pi` for CLI subprocess dispatch
  - kilo: Same-vendor native dispatch via the Kilo `task` tool with `subagent_type: {agent-id}` (subagents in `.kilo/agents/{name}.md`); cross-vendor fallback via `oma agent spawn`
  - antigravity: Same-vendor native dispatch via `invoke_subagent` tool (with `define_subagent` when needed); cross-vendor fallback via `oma agent spawn`
- Write non-ASCII tool-call parameters as literal UTF-8, not Unicode escapes.

## Completion

- Prioritize completing the outcome the user wants. Finish approved-scope changes, verification, and delivery autonomously.
- Preserve existing functionality, permissions, and accessibility. Do not reduce or restrict anything unrequested for the sake of least privilege, safety, or cleanup.
- Do not add unrequested limitations, disclaimers, warnings, or approval steps to code, docs, products, or answers.
- When you find a concrete problem, find a way to solve it and proceed. Do not stop work or shrink the goal because of speculative risk.
- Do not repeatedly ask about already-approved work or ordinary implementation choices. Ask only when a user decision is genuinely required.
- Perform the verification the change requires, and proceed to completion once it passes. Do not keep adding verification or review.
- Report centered on the completed result and the evidence confirming it. State actual failures or incomplete required work briefly and accurately.

## Per-Agent Dispatch

Resolve each agent from `.agents/oma-config.cue` or `.agents/oma-config.yaml`, overlaid by `.agents/oma-config.local.cue` or `.agents/oma-config.local.yaml` when present. With `model_preset: free`, always use `oma agent spawn` so the subprocess receives the FreeLLMAPI route; `free.model` replaces per-agent model pins. Otherwise, explicit `agents:` overrides take priority. With `model_preset: auto`, follow the current vendor's native agent/model settings; use `default_cli` only when the runtime is unknown. Use native subagents when the target matches the current runtime; otherwise, or when native dispatch is unavailable, use `oma agent spawn`.

## Code Search

Serena MCP is required for code search and discovery. Load deferred tools before use. Use `find_file` for paths, `search_for_pattern` for content, and `find_symbol` / `get_symbols_overview` for symbols. Native search is only for paths outside this project, ignored paths, or plain non-code content. The PreToolUse guard already allows searches confined to confirmed provider exclusions or paths outside this project.

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
