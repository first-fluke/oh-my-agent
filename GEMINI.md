<!-- OMA:START — managed by oh-my-agent. Do not edit this block manually. -->

# oh-my-agent

## Architecture

- **SSOT**: `.agents/` directory (do not modify directly)
- **Response language**: Follows `language` in `.agents/oma-config.yaml`
- **Skills**: `.agents/skills/` (domain specialists)
- **Workflows**: `.agents/workflows/` (multi-step orchestration)
- **Subagents**: Same-vendor native: `@agent-name` (defined in `.gemini/agents/`) when the runtime verifies Gemini subagents. Otherwise `oma agent:spawn {agent} {prompt} {sessionId}`

## Workflows

Execute by naming the workflow in your prompt. Keywords are auto-detected via hooks.

| Workflow | File | Description |
|----------|------|-------------|
| orchestrate | `orchestrate.md` | Parallel subagents + Review Loop |
| work | `work.md` | Step-by-step with remediation loop |
| ultrawork | `ultrawork.md` | 5-Phase Gate Loop (11 reviews) |
| plan | `plan.md` | PM task breakdown |
| brainstorm | `brainstorm.md` | Design-first ideation |
| review | `review.md` | QA audit |
| debug | `debug.md` | Root cause + minimal fix |
| scm | `scm.md` | SCM + Git operations + Conventional Commits |

To execute: read and follow `.agents/workflows/{name}.md` step by step.

## Per-Agent Dispatch

1. Resolve the target vendor for each agent from `.agents/oma-config.yaml` (`agent_cli_mapping`, then `default_cli`).
2. If `target_vendor === current_runtime_vendor` and that runtime supports the vendor's native role-subagent path, use the generated native agent definition for that vendor.
3. Otherwise use `oma agent:spawn {agent} {prompt} {sessionId}` for that agent only.

## Auto-Detection

Hooks: `BeforeAgent` (keyword detection), `BeforeTool`, `AfterAgent` (persistent mode)
Keywords defined in `.agents/hooks/core/triggers.json` (multi-language).
Persistent workflows (orchestrate, ultrawork, work) block termination until complete.
Deactivate: say "workflow done".

## Rules

1. **Do not modify `.agents/` files** — SSOT protection
2. Workflows execute via keyword detection or explicit naming — never self-initiated
3. Response language follows `.agents/oma-config.yaml`

## Project Rules

Read the relevant file from `.agents/rules/` when working on matching code.

| Rule | File | Scope |
|------|------|-------|
| debug | `.agents/rules/debug.md` | on request |
| quality | `.agents/rules/quality.md` | on request |
| i18n-guide | `.agents/rules/i18n-guide.md` | always |
| backend | `.agents/rules/backend.md` | on request |
| frontend | `.agents/rules/frontend.md` | **/*.{tsx,jsx,css,scss} |
| design | `.agents/rules/design.md` | on request |
| commit | `.agents/rules/commit.md` | on request |
| infrastructure | `.agents/rules/infrastructure.md` | **/*.{tf,tfvars,hcl} |
| dev-workflow | `.agents/rules/dev-workflow.md` | on request |
| mobile | `.agents/rules/mobile.md` | **/*.{dart,swift,kt} |
| database | `.agents/rules/database.md` | **/*.{sql,prisma} |

<!-- OMA:END -->
