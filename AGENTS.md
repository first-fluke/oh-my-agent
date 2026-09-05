<!-- OMA:START — managed by oh-my-agent. Do not edit this block manually. -->

# oh-my-agent

> Follow `.agents/skills/_shared/core/execution-policy.md` for authorization, clarification, verification, and completion. Carry out authorized work without repeated approval. System/developer instructions and the user's request take precedence over OMA defaults. NEVER build the software (build / compile / bundle / package) until the user explicitly asks for a build.

## Architecture

- **SSOT**: `.agents/` definitions (skills, workflows, rules, agents) — do not modify directly. Run outputs under `.agents/results/` and `.agents/state/` are generated artifacts, not SSOT.
- **Response language**: Follows `language` in `.agents/oma-config.yaml`
- **Skills**: `.agents/skills/` (domain specialists)
- **Workflows**: `.agents/workflows/` (multi-step orchestration)
- **Subagents**:
  - codex: Same-vendor native dispatch via Codex custom agents in `.codex/agents/{name}.toml`; cross-vendor fallback via `oma agent:spawn`
  - cursor: `@agent-name` (defined in `.cursor/agents/`)
  - qwen: `oma agent:spawn {agent} {prompt} {sessionId}`
  - pi: pi has no native subagent API; use `oma agent:spawn {agent} {prompt} {sessionId} -m pi` for CLI subprocess dispatch

## Per-Agent Dispatch

1. Resolve `target_vendor_for_agent` from `.agents/oma-config.yaml`.
2. If `target_vendor_for_agent === current_runtime_vendor`, use the runtime's native subagent path.
3. If vendors differ, or native subagents are unavailable, use `oma agent:spawn` for that agent only.

## Code Search

Use **serena MCP** tools for code search and discovery — they are symbol-aware and faster on large repos. Native Read / Glob / Grep is a fallback only when serena is unavailable or times out, or for plain non-code content reads. Serena's symbol-aware edit and diagnostic tools remain available after discovery.

| Task | Preferred tool |
|------|----------------|
| Locate a symbol definition (class / function / variable) | `find_symbol` |
| Find references / callers of a symbol | `find_referencing_symbols` |
| Outline a file's top-level symbols | `get_symbols_overview` |
| Pattern or regex search across the codebase | `search_for_pattern` |
| Find a file by name | `find_file` |
| List directory contents | `list_dir` |

Serena result size: omit `max_answer_chars` (uses `default_max_tool_answer_chars` in `~/.serena/serena_config.yml`, typically 150000) unless you need a hard cap. Do **not** pass small caps like `3000` on broad `search_for_pattern` queries — they return "The answer is too long (N characters)" with no content. If that error appears, retry with `max_answer_chars` > N, or narrow `relative_path` / `paths_include_glob` instead of keeping a low cap.

## Workflows

Execute by naming the workflow in your prompt. Keywords are auto-detected via hooks.

| Workflow | File | Description |
|----------|------|-------------|
| orchestrate | `orchestrate.md` | Parallel subagents + Review Loop |
| work | `work.md` | Step-by-step with remediation loop |
| ultrawork | `ultrawork.md` | 5-Phase Gate Loop with cross-context reviews |
| ralph | `ralph.md` | Persistent loop wrapping ultrawork with an independent judge |
| plan | `plan.md` | PM task breakdown |
| brainstorm | `brainstorm.md` | Design-first ideation |
| architecture | `architecture.md` | Architecture diagnosis, comparison, ADR |
| design | `design.md` | Design system + DESIGN.md with anti-pattern enforcement |
| review | `review.md` | QA audit |
| debug | `debug.md` | Root cause + minimal fix |
| deepsec | `deepsec.md` | Drive `oma-deepsec` end-to-end (setup / scan / pr-review / matchers / triage / config / troubleshoot) |
| scm | `scm.md` | SCM + Git operations + Conventional Commits |
| docs | `docs.md` | Documentation drift verify + sync |
| recap | `recap.md` | Daily / period AI conversation recap |
| deepinit | `deepinit.md` | Project harness init (AGENTS.md / ARCHITECTURE.md / docs/) |
| convert | `convert.md` | File format conversion by category: documents→Markdown (oma-pdf/oma-hwp), image/video/audio transcode (ffmpeg) |
| video | `video.md` | Brief → script → assets → render-spec → Remotion (oma-video) |
| schedule | `schedule.md` | Register & manage time-based agent jobs via `oma schedule:*` |
| explain | `explain.md` | Diff/PR/branch → self-contained interactive HTML explainer via oma-explanation |

(`tools` and `stack-set` are slash-invoked utilities, `schedule` is a slash-invoked workflow (`oma schedule:*` time-based jobs), `convert` is slash-invoked to avoid false positives on "convert this code" phrasing, and `explain` is slash-invoked because "explain" is everyday vocabulary, excluded from keyword detection to avoid false positives; all are intentionally excluded from keyword detection.)

To execute: read and follow `.agents/workflows/{name}.md` step by step.

## Auto-Detection

Hooks (codex): `UserPromptSubmit` (keyword detection), `PreToolUse`, `PostToolUse` (refactor-guard recorder, opt-in), `Stop` (persistent mode + refactor guard)
Hooks (cursor): `UserPromptSubmit` / `beforeSubmitPrompt` (keyword detection), `afterFileEdit` (refactor-guard recorder, opt-in), `stop` (persistent mode + refactor guard)
Hooks (qwen): `UserPromptSubmit` (keyword detection), `PreToolUse`, `PostToolUse` (refactor-guard recorder, opt-in), `Stop` (persistent mode + refactor guard)
Extension bridge (pi): `.pi/extensions/oma/index.ts` maps `before_agent_start` and `tool_call` to OMA hook scripts
Keywords defined in `.agents/hooks/core/triggers.json` (multi-language).
Persistent workflows (orchestrate, ultrawork, work, ralph) block termination until complete.
Deactivate: say "workflow done".

## Rules

1. **Do not modify `.agents/` definition files** (SSOT protection: skills, workflows, rules, agents, config). Writing run outputs under `.agents/results/` and `.agents/state/` are generated artifacts, not SSOT.
2. Workflows execute via keyword detection or explicit naming, never self-initiated.
3. Response language follows `.agents/oma-config.yaml`

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
