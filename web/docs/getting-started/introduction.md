---
title: Introduction
description: A comprehensive overview of oh-my-agent, the multi-agent orchestration framework that turns AI coding assistants into specialized engineering teams with 33 skill packages, 12 subagent definitions, progressive skill loading, and cross-IDE portability.
---

# Introduction

oh-my-agent is a multi-agent orchestration framework for AI-powered IDEs and CLI tools. Instead of relying on a single AI assistant for everything, oh-my-agent routes work across 33 skill packages and 13 canonical dispatch roles. Twelve checked-in subagent definition files provide the reusable implementation, review, planning, debugging, documentation, research, and infrastructure personas. `research-explorer.md` maps to the canonical `explore` role; `orchestrator` is a runtime coordination role without a separate definition file.

OMA provides mechanical checks when you invoke them or select a workflow that includes them. `oma verify agent <agent-type>` runs the checks for the selected agent type; `/ralph` adds artifact-backed verification and a judge loop; enabled vendor Stop hooks can keep a workflow open while its configured checks run. Skill loading alone does not establish acceptance, and a plain prompt does not automatically run every workflow gate. Use the workflow's acceptance criteria and the resulting files to decide what is complete.

The entire system lives in a portable `.agents/` directory inside your project. Switch between Claude Code, Codex CLI, Antigravity CLI or IDE, Cursor, OpenCode, and other supported tools, and your agent configuration travels with your code.

If you are new to OMA, start with [Quick Start](./quick-start.md), then read [Important Defaults](./important-defaults.md). Installation creates the SSOT and vendor integrations; the first useful check is `oma doctor`; the first useful task is one small single-domain change. Move to `/work` or `/orchestrate` only when the task needs coordination.

---

## The multi-agent paradigm

Traditional AI coding assistants often handle frontend, backend, database, security, and infrastructure from one prompt context. That can lead to:

- **Context dilution**: loading knowledge for every domain wastes the context window
- **Unclear ownership**: a cross-domain task has no explicit boundary for each part
- **Manual coordination**: complex features spanning multiple domains need handoffs chosen by the host or user

oh-my-agent solves this with specialization:

1. **Each skill has a primary domain.** The frontend skill knows React/Next.js, shadcn/ui, TailwindCSS v4, FSD-lite architecture. The backend skill knows the Repository-Service-Router pattern, parameterized queries, and JWT authentication. Domains can overlap at boundaries, so use the task's acceptance criteria to decide when a second skill or a coordinating workflow is needed.

2. **Agents can run in parallel.** While a backend agent builds an API, a frontend agent can work in its own workspace. The orchestrator coordinates through durable, run-scoped files and receipts.

3. **Quality guidance is built in.** Skills carry domain checklists, error playbooks, and charter rules. Charter preflight narrows scope before code is written; QA review runs when the selected workflow includes it or when you request it.

---

## The current catalog: 33 skills, 12 definitions, 21 workflows

The catalog separates three things that are easy to confuse:

- **Skills** are the 33 domain knowledge packages under `.agents/skills/*/SKILL.md`. They route from natural-language intent and load their resources progressively.
- **Agent definitions** are the 12 files under `.agents/agents/`. They provide vendor-native subagent personas and reference one or more skills.
- **Workflows** are the 21 process definitions under `.agents/workflows/`. Four are persistent (`orchestrate`, `work`, `ultrawork`, and `ralph`); the rest run to a report and do not keep persistent mode active.

The sections below preserve the detailed skill catalog. When a name or description changes, the live `SKILL.md` frontmatter is authoritative.

The 12 checked-in definition files cover the 13 runtime roles through aliases: `research-explorer.md` maps to `explore`, while `orchestrator` is runtime-only. The other definition files map to the named roles listed in [Agents](../core-concepts/agents.md).

### Ideation, architecture, and planning

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-brainstorm** | Design-first ideation | Explores user intent, proposes 2-3 approaches with trade-off analysis, produces design documents before any code is written. 6-phase workflow: Context, Questions, Approaches, Design, Documentation, Transition to `/plan`. |
| **oma-architecture** | System architecture specialist | Module/service/ownership boundaries, tradeoff analysis, stakeholder synthesis. Methodologies: diagnostic routing, design-twice comparison, ATAM-style risk analysis, CBAM-style prioritization, ADR-style decision records. Cost-aware by default. |
| **oma-pm** | Product manager | Decomposes requirements into prioritized tasks with dependencies. Defines API contracts. Outputs `.agents/results/plan-{sessionId}.json` and a session-scoped task board. Supports ISO 21500 concepts, ISO 31000 risk framing, ISO 38500 governance. |

### Implementation

| Agent | Role | Tech Stack & Resources |
|-------|------|----------------------|
| **oma-frontend** | UI/UX specialist | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui, FSD-lite architecture. Libraries: luxon (dates), ahooks or @mantine/hooks (hooks), es-toolkit (utils), Jotai/Zustand (client state), TanStack Query via orval-generated hooks (server state), @tanstack/react-form + Zod (forms), better-auth (auth), nuqs (URL state). Resources: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `snippets.md`, `angular-rules.md`, `error-playbook.md`, `checklist.md`. |
| **oma-backend** | API & server specialist | Clean architecture (Router-Service-Repository-Models). Stack-agnostic; detects Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET from project manifests. JWT + Argon2id for auth. Resources: `execution-protocol.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. Supports `/stack-set` for generating language-specific `stack/` references. |
| **oma-mobile** | Cross-platform mobile | Flutter, Dart, Riverpod/Bloc for state management, Dio with interceptors for API calls, GoRouter for navigation. Clean architecture: domain-data-presentation. Material Design 3 (Android) + iOS HIG. 60fps target. Also supports Swift native iOS: SwiftUI + `@Observable` (iOS 17+), Apple `swift-openapi-generator` for API clients, `App/Core/Features/Shared` project layout. Resources: `execution-protocol.md`, `tech-stack.md`, `screen-template.dart`, `screen-template.swift`, `screen-template.tsx`, `checklist.md`, `error-playbook.md`; platform-specific variants are materialized by `/stack-set`. |
| **oma-db** | Database architecture | SQL, NoSQL, and vector database modeling. Schema design (3NF default), normalization, indexing, transactions, capacity planning, backup strategy. Supports ISO 27001/27002/22301-aware design. Resources: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### Design

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-design** | Design system specialist | Creates DESIGN.md with tokens, typography, color systems, motion design (motion/react, GSAP, Three.js), responsive-first layouts, WCAG 2.2 compliance. 7-phase workflow: Setup, Extract, Enhance, Propose, Generate, Audit, Handoff. Enforces anti-patterns (no "AI slop"). Optional Stitch MCP integration. Resources: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, plus `reference/` directory with typography, color, spatial, motion, responsive, component, accessibility, and shader guides. |

### Infrastructure, DevOps, and observability

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-tf-infra** | Infrastructure-as-code | Multi-cloud Terraform (AWS, GCP, Azure, Oracle Cloud). OIDC-first auth, least privilege IAM, policy-as-code (OPA/Sentinel), cost optimization. Supports ISO/IEC 42001 AI controls, ISO 22301 continuity, ISO/IEC/IEEE 42010 architecture documentation. Resources: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | Monorepo task automation | mise task runner, CI/CD pipelines, database migrations, release coordination, git hooks, pre-commit validation. Resources: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |
| **oma-observability** | Intent-based observability router | MELT+P signal coverage (metrics/logs/traces/profiles/cost/audit/privacy), transport tuning (UDP/MTU, OTLP gRPC vs HTTP, Collector topology, sampling), W3C Trace Context propagation, SLO management and burn-rate alerts, incident forensics (6-dimension localization), meta-observability (self-health, clock sync, cardinality, retention). CNCF-first; Fluentd deprecated (use Fluent Bit or OTel Collector). |

### Quality and debugging

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-qa** | Quality assurance | Security audit (OWASP Top 10), performance analysis, accessibility (WCAG 2.2 AA), code quality review. Severity: CRITICAL/HIGH/MEDIUM/LOW with file:line and remediation code. Supports ISO/IEC 25010 quality characteristics and ISO/IEC 29119 test alignment. Resources: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | Bug diagnosis and fixing | Reproduce-first methodology. Root cause analysis, minimal fixes, mandatory regression tests, similar pattern scanning. Uses code-intelligence MCP tools (Gortex or Serena) for symbol tracing. Resources: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |
| **oma-refactor** | Behavior-preserving refactoring | Safe incremental restructuring gated by characterization-test safety nets. Hotspot targeting (complexity × churn), code-smell/SATD selection, Mikado-method revert on failure, expand-contract for stateful change, refactor-only commits (no behavior change mixed in). Engine-first transforms (IDE rename, jscodeshift/ast-grep), metrics via `uvx lizard` / `uvx radon`. Readability is the success criterion; metrics are proxies. |

### Localization, coordination, and git

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-translation** | Context-aware translation | Six-scene flow: Prepare, Acquire, Reason, Act, Verify, Finalize. The translation method has four steps: read meaning and protected syntax, choose register, reconstruct in the target language, and preserve author style where it belongs. Per-target language profiles (`resources/lang/{code}.md`) carry register and typography rules. Resources: `translation-rubric.md`, `anti-ai-patterns.md`, `lang/{ko,ja,zh,en}.md`. |
| **oma-orchestration** | Automated multi-agent coordinator | Spawns CLI subagents in parallel, coordinates through durable session, task-board, progress, and result files, and monitors verification loops. Configurable: MAX_PARALLEL (default 3), MAX_RETRIES (default 2), POLL_INTERVAL (default 30s). Includes agent-to-agent review loop and optional session evidence. Resources: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-scm** | Software configuration management (SCM) + Git | Handles branching strategies, merge/rebase/conflict workflows, worktrees, baselines, and release-state tracking. Also guides Conventional Commit messages with safe staging; co-author trailers come from effective `scm.co_author` configuration when enabled. |
| **oma-coordination** | Manual multi-agent workflow guide | Step-by-step coordination of PM, Frontend, Backend, Mobile, and QA agents via CLI `oma agent spawn`. Starts with PM decomposition, spawns same-priority tasks in separate workspaces, monitors run-scoped progress/result files, aligns API/data contracts before frontend/mobile work, and ends with QA review. The manual counterpart to `oma-orchestration`. |

### Search, retrospective, and document processing

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-search** | Intent-based search router | Routes queries to Context7 (docs), native web search, `gh`/`glab` (code), local code intelligence (Gortex or Serena). Domain trust scoring on all non-local results. Fail-forward routing (docs→web→fetch). Flags: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`. |
| **oma-recap** | Cross-tool work retrospective | Analyzes conversation histories from Grok, Claude, Codex, Gemini, Qwen, Cursor, and Antigravity. Resolves natural-language date/window input, groups by tool+session, extracts themes, renders daily/period summaries, and records when the CLI caps a requested window at 30 days. |
| **oma-hwp** | HWP/HWPX/HWPML → Markdown | Korean word-processor document conversion via `bunx kordoc@latest`. Preserves headings, tables (incl. nested), footnotes, hyperlinks, images. Strips Hancom Private Use Area characters via `flatten-tables.ts` post-processor. |
| **oma-pdf** | PDF → Markdown | PDF document conversion via `uvx opendataloader-pdf`. Preserves headings, tables, lists, images; OCR hybrid mode for scanned PDFs; output normalized with `uvx mdformat`. |

### Academic and research writing

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-academic-writing** | Publication-grade English prose | Drafts, revises, and audits essays, reports, executive summaries, conclusions, and literature reviews. Enforces four protocols simultaneously: Sentence Structure (4 types, varied length/openers), Verb (banned generic verbs replaced from a tiered academic corpus), Hedging (strength matched to evidence), and Anti-AI compliance. Quote-before-judgment rubric gate, Claim-Evidence Map, reverse outlining. Modes: `draft` / `revise` / `review`. |
| **oma-scholar** | Research paper sidecar companion | Searches, generates, validates, reviews, and compares scholarly papers via the Knows `.knows.yaml` sidecar spec (v0.9.0 / `paper@1`). Token-efficient claim/evidence/relation access (~700 tokens for claims-only vs ~10K full PDF). `oma scholar search/resolve/get/lint` over knows.academy with automatic OpenAlex fallback for pre-2026 papers. Anti-fabrication: omits unknown fields rather than guessing. |

### Security

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-deepsec** | Agent-powered vulnerability scanner driver | Operates Vercel's `deepsec` (`bunx deepsec`) end-to-end: `init` the `.deepsec/` workspace, write a project-specific `INFO.md`, run cost-aware `scan`/`process`/`triage`/`revalidate`/`export` passes, gate PRs via `process --diff` with a two-job CI pattern, and author custom matchers. Calibrates with `--limit 50 --concurrency 5` before a large pass and states a dollar forecast before paid work; cost varies by repository size and backend. Agent backends: `codex` (gpt-5.5) or `claude` (claude-opus-4-8). |

### Documentation and meta-tooling

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-docs** | Documentation drift detector | `verify` mode deterministically checks `docs/**/*.md` for broken refs (file paths, CLI commands, config keys, env vars, scripts) and exits 0/1; `sync` mode correlates a git diff to candidate docs and drafts host-LLM patch proposals confirmed per-doc (never auto-applies). URL checking delegated to `lychee`; CLI emits structured JSON, host LLM does all synthesis (no vendor SDK calls). Never modifies `.agents/`. |
| **oma-skill-creation** | SSL-lite skill authoring specialist | Creates, updates, and audits OMA skills in the SSL-lite format with the four mandatory sections (Scheduling / Structural Flow / Logical Operations / References). Classifies skill type, inserts exactly one inline canonical path, enforces `When NOT to use` cross-routes, and runs `oma skill audit` to catch description collisions (warn ≥ 60%, fail ≥ 75% TF-IDF cosine). Pushes long variant detail into `resources/`. |
| **oma-explanation** | Code-change explainer | Turns a diff, PR, branch, or commit range into a self-contained offline HTML explainer with Background, Intuition, Code, and Quiz sections. The `/explain` workflow validates the final artifact and writes it under `.agents/results/explain/`. |

### Market research

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-market** | Community signal intelligence | Runs the upstream `last30days` engine (Reddit with real upvotes and comments, X, YouTube transcripts, TikTok, HN, Polymarket, GitHub, arXiv, Techmeme, Bluesky, web and more) through `oma market run`; oma keeps the engine **always at the latest release** (`~/.cache/oma-market/`), gates every run with `detect-trap`, classifies intent (pain / trend / competitor / discovery), and appends SWOT / Porter's 5F / PESTEL sections. Emits one LAW-compliant brief at `.agents/results/market/{slug}-{YYYYMMDD}.md`. |

### Media and content generation

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-image** | Multi-vendor image router | Authentication-aware parallel dispatch to Codex (`gpt-image-2` via ChatGPT OAuth, CLI-first), Antigravity Gemini-family “nano-banana” models via the `agy` CLI + Gemini Code Assist (the exact model is selected internally), and Pollinations (free `flux`/`zimage`). Clarification/amplification protocol before generation, up to 10 reference images, cost guardrail (confirm at ≥ $0.20), `manifest.json` for reproducibility. CLI: `oma image generate`, `oma image doctor`, and `oma image vendor list`. |
| **oma-slide** | Animation-rich HTML deck generator | Generates distinctive, anti-"AI slop" presentation decks authored at a fixed 1920×1080 stage, then deterministically validates geometry, bundles to single-file HTML, and exports to PDF/PNG/PPTX via the `oma slide` CLI. Style presets + bold templates, CJK→Pretendard rule, `prefers-reduced-motion` + visible focus required, max-3 auto-fix validate loop. Delegates imagery to `oma-image`; optional Canva MCP export/import. |
| **oma-video** | Short-form, explainer & demo router | Creates shorts/reels (9:16), explainers (16:9), and human-recorded demos (16:9) through the `oma video` CLI. The deterministic asset bus (`script.json` → `timing.json` → `render-spec.json`) feeds a vendored Remotion compositor; asset providers may use local fallbacks, while missing composition/toolchain or render errors fail the run. Human capture never automates credentials. |
| **oma-voice** | Local-first TTS and STT | Drives the Voicebox MCP server for on-device notifications, asset TTS, and transcription without cloud calls or per-call cost. TTS defaults to WAV and can be locally transcoded to MP3; transcription accepts audio paths or base64. TTS calls cap at 5000 characters and STT inputs at 30 minutes; persisted asset/transcription runs write a manifest. |

---

## Progressive disclosure model

oh-my-agent uses a two-layer skill architecture to prevent context window exhaustion:

**Layer 1: SKILL.md (~3,100 tokens median, loaded when the skill is routed)**
Contains the agent's identity, routing conditions, core rules, and "when to use / when NOT to use" guidance. This is all that is loaded when the agent is not actively working.

**Layer 2: resources/ (loaded on-demand)**
Contains execution protocols, tech stack references, code snippets, error playbooks, checklists, and examples. These are loaded only when the agent is invoked for a task, and even then, only the resources relevant to the specific task type are loaded (based on the difficulty assessment and task-resource mapping in `context-loading.md`).

Measured across a 5-agent session, this holds roughly 17-19K tokens of skill context for a Simple or Medium task against a 72K ceiling — about 75% of the maximum avoided, falling to ~47% for Complex tasks that pull in stack references. See [token savings math](../core-concepts/skills.md#token-savings-math) for the measured table and the script that reproduces it.

---

## .agents/: the single Source of Truth (SSOT)

Everything oh-my-agent needs lives in the `.agents/` directory:

```
.agents/
├── oma-config.yaml         # Shared preferences and provider/model settings
├── oma-config.cue          # Optional schema-backed configuration
├── skills/                 # 33 skill directories + _shared resources
│   ├── _shared/            # Core resources used by all agents
│   └── oma-{skill}/         # Per-skill SKILL.md + resources/variants
├── workflows/              # 21 workflow definitions
├── agents/                 # 12 subagent definitions
├── results/plan-{sessionId}.json               # Generated plan output
├── state/                  # Active workflow state files
├── results/                # Agent result files
└── mcp.json                # MCP server configuration
```

The `.claude/` directory exists only as an IDE integration layer. It contains symlinks pointing back to `.agents/`, plus hooks for keyword detection and the HUD statusline. The `.agents/state/memories/` directory holds runtime coordination state during orchestration sessions (older projects fall back to the legacy `.serena/memories/` path).

This architecture means your agent configuration is:
- **Portable**: switch IDEs without reconfiguring
- **Version-controlled**: commit `.agents/` alongside your code
- **Shareable**: team members get the same agent setup

---

## Supported IDEs and CLI tools

oh-my-agent works with the selected AI-powered IDEs and CLIs through their native skill/prompt loading or generated integration files:

| Tool | Integration Method | Parallel Agents |
|------|-------------------|----------------|
| **Claude Code** | Native skills + Agent tool | Task tool for true parallelism |
| **Antigravity CLI/IDE** | Skills and MCP settings projected for `agy` | `oma agent spawn` |
| **Codex CLI** | Skills auto-loaded | Model-mediated parallel requests |
| **Cursor** | Skills via `.cursor/` integration | Manual spawning |
| **OpenCode** | Skills + in-process plugin bridge + generated subagents (`.opencode/agents/`) | `oma agent spawn --vendor opencode` |
| **Kimi Code CLI** | Hooks + skills in `~/.kimi-code/` (consent-gated HOME write; also reads SSOT `.agents/skills/` natively); project-scoped Serena MCP | `oma agent spawn --vendor kimi` |

Agent spawning adapts to each selected vendor through vendor detection and the active configuration. Same-vendor runtimes may use native subagents; cross-vendor work falls back to `oma agent spawn`. See [Parallel Execution](../core-concepts/parallel-execution.md) for the dispatch rules.

---

## Skill routing system

When you send a prompt, oh-my-agent determines which agent handles it using the skill routing map (`.agents/skills/_shared/core/skill-routing.md`):

| Domain Keywords | Routed To |
|----------------|-----------|
| API, endpoint, REST, GraphQL, database, migration | oma-backend |
| auth, JWT, login, register, password | oma-backend |
| UI, component, page, form, screen (web) | oma-frontend |
| style, Tailwind, responsive, CSS | oma-frontend |
| mobile, iOS, Android, Flutter, React Native, Swift, SwiftUI, app | oma-mobile |
| bug, error, crash, broken, slow | oma-debug |
| review, security, performance, accessibility | oma-qa |
| UI design, design system, landing page, DESIGN.md | oma-design |
| brainstorm, ideate, explore, idea | oma-brainstorm |
| plan, breakdown, task, sprint | oma-pm |
| automatic, parallel, orchestrate | oma-orchestration |

For complex requests that span multiple domains, routing follows established execution orders. For example, "Create a fullstack app" routes to: oma-pm (plan) then oma-backend + oma-frontend (parallel implementation) then oma-qa (review).

---

## HUD statusline

When running in Claude Code, oh-my-agent displays a persistent status indicator `[OMA]` in the status bar showing:
- Model name (e.g., Opus, Sonnet)
- Context usage with color coding (green < 70%, yellow 70-85%, red > 85%)
- Active workflow state (if a persistent workflow is running)

The HUD is powered by `.claude/hooks/hud.ts` using Claude Code's `statusLine` hook feature.

---

## Automatic workflow detection

You do not need to type `/command` to trigger workflows. oh-my-agent's hook system scans your natural language input against keyword triggers defined in `.agents/hooks/core/triggers.json` (inlined into the `oma` binary and shared by every vendor), supporting 11 languages (English, Korean, Japanese, Chinese, Spanish, French, German, Portuguese, Russian, Dutch, Polish).

- **Actionable input** (e.g., "plan the auth feature") → automatically loads the workflow
- **Informational input** (e.g., "what is orchestrate?") → filtered out, no workflow triggered
- **Explicit `/command`** → hook skips detection to avoid duplication
- **Persistent workflows** reinject context on every message until you say "workflow done"

Every hook event is delivered through the `oma hook run` canonical ABI: the vendor fires `oma-hook.sh --vendor <v> --event <nativeEvent>`, which routes to the in-process handler chain and emits the vendor-specific dialect on stdout (always exit 0, fail-open).

---

## Cross-vendor support

oh-my-agent is not limited to Claude Code. Hook-capable vendors share the same `oma hook run` ABI, while extension vendors use their in-process bridge:

| Vendor | Hook delivery | StatusLine |
|--------|--------------|------------|
| **Claude Code** | `oma-hook.sh --vendor claude --event UserPromptSubmit` / `PreToolUse` / `Stop` | `bun .claude/hooks/hud.ts` (direct, unchanged) |
| **Codex CLI** | `oma-hook.sh --vendor codex --event UserPromptSubmit` / `PreToolUse` / `Stop` | — |
| **Qwen Code** | `oma-hook.sh --vendor qwen --event UserPromptSubmit` / `PreToolUse` / `Stop` | `bun` path via `ui.statusLine` |
| **Cursor** | `oma-hook.sh --vendor cursor --event beforeSubmitPrompt` / `preToolUse` | — |
| **Grok** | `oma-hook.sh --vendor grok --event UserPromptSubmit` / `Stop` | — |
| **Kiro** | `oma-hook.sh --vendor kiro --event userPromptSubmit` / `preToolUse` / `stop` | — |
| **Kimi Code** | `oma-hook.sh --vendor kimi --event UserPromptSubmit` / `PreToolUse` / `Stop` (global-only TOML `[[hooks]]` in `~/.kimi-code/config.toml`) | — |
| **Antigravity** | `oma-hook.sh --vendor antigravity --event PreInvocation` / `PreToolUse` / `Stop` | — |
| **pi** | In-process bridge (`installPiExtension`) — not routed through `oma hook run` | — |

The `.agents/` directory remains the source of truth. Installation links or projects its skills, workflows, hooks, and agent definitions into the vendors you selected; capabilities differ by vendor. Native same-vendor subagents and CLI-spawned cross-vendor agents both read from that source.

---

## What is next

- **[Installation](./installation.md)**: Three install methods, presets, CLI setup, and verification
- **[Agents](/docs/core-concepts/agents)**: Deep dive into the 33 skills, 13 dispatch roles, and charter preflight
- **[Skills](/docs/core-concepts/skills)**: The two-layer architecture explained
- **[Workflows](/docs/core-concepts/workflows)**: All 21 workflows with triggers and phases
- **[Usage Guide](/docs/guide/usage)**: Real examples from single tasks to full orchestration
