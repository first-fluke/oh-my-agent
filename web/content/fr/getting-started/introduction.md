---
title: Introduction
description: Une vue d'ensemble complète d'oh-my-agent — le framework d'orchestration multi-agents qui transforme les assistants de codage IA en équipes d'ingénierie spécialisées avec 14 agents de domaine, chargement progressif des compétences et portabilité entre IDE.
---

# Introduction

oh-my-agent is a multi-agent orchestration framework for AI-powered IDEs and CLI tools. Instead of relying on a single AI assistant for everything, oh-my-agent decomposes work across 14 specialized agents — each modeled after a real engineering team role with its own tech stack knowledge, execution protocols, error playbooks, and quality checklists.

The entire system lives in a portable `.agents/` directory inside your project. Switch between Claude Code, Gemini CLI, Codex CLI, Antigravity IDE, Cursor, or any other supported tool — your agent configuration travels with your code.

---

## The Multi-Agent Paradigm

Traditional AI coding assistants operate as generalists. They handle frontend, backend, database, security, and infrastructure with the same prompt context and the same level of expertise. This leads to:

- **Context dilution** — loading knowledge for every domain wastes the context window
- **Inconsistent quality** — a generalist can not match a specialist in any single domain
- **No coordination** — complex features spanning multiple domains get handled sequentially

oh-my-agent solves this with specialization:

1. **Each agent knows one domain deeply.** The frontend agent knows React/Next.js, shadcn/ui, TailwindCSS v4, FSD-lite architecture. The backend agent knows the Repository-Service-Router pattern, parameterized queries, JWT authentication. They do not overlap.

2. **Agents run in parallel.** While the backend agent builds your API, the frontend agent is already creating the UI. The orchestrator coordinates via shared memory.

3. **Quality is built in.** Every agent has a domain-specific checklist and error playbook. Charter preflight catches scope creep before code is written. QA review is a first-class step, not an afterthought.

---

## All 14 Agents

### Ideation and Planning

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-brainstorm** | Design-first ideation | Explores user intent, proposes 2-3 approaches with trade-off analysis, produces design documents before any code is written. 6-phase workflow: Context, Questions, Approaches, Design, Documentation, Transition to `/plan`. |
| **oma-pm** | Product manager | Decomposes requirements into prioritized tasks with dependencies. Defines API contracts. Outputs `.agents/plan.json` and `task-board.md`. Supports ISO 21500 concepts, ISO 31000 risk framing, ISO 38500 governance. |

### Implementation

| Agent | Role | Tech Stack & Resources |
|-------|------|----------------------|
| **oma-frontend** | UI/UX specialist | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui, FSD-lite architecture. Libraries: luxon (dates), ahooks (hooks), es-toolkit (utils), Jotai (client state), TanStack Query (server state), @tanstack/react-form + Zod (forms), better-auth (auth), nuqs (URL state). Resources: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`. |
| **oma-backend** | API & server specialist | Clean architecture (Router-Service-Repository-Models). Stack-agnostic — detects Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET from project manifests. JWT + bcrypt for auth. Resources: `execution-protocol.md`, `orm-reference.md`, `examples.md`, `checklist.md`, `error-playbook.md`. Supports `/stack-set` for generating language-specific `stack/` references. |
| **oma-mobile** | Cross-platform mobile | Flutter, Dart, Riverpod/Bloc for state management, Dio with interceptors for API calls, GoRouter for navigation. Clean architecture: domain-data-presentation. Material Design 3 (Android) + iOS HIG. 60fps target. Resources: `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`. |
| **oma-db** | Database architecture | SQL, NoSQL, and vector database modeling. Schema design (3NF default), normalization, indexing, transactions, capacity planning, backup strategy. Supports ISO 27001/27002/22301-aware design. Resources: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### Design

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-design** | Design system specialist | Creates DESIGN.md with tokens, typography, color systems, motion design (motion/react, GSAP, Three.js), responsive-first layouts, WCAG 2.2 compliance. 7-phase workflow: Setup, Extract, Enhance, Propose, Generate, Audit, Handoff. Enforces anti-patterns (no "AI slop"). Optional Stitch MCP integration. Resources: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, plus `reference/` directory with typography, color, spatial, motion, responsive, component, accessibility, and shader guides. |

### Infrastructure and DevOps

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-tf-infra** | Infrastructure-as-code | Multi-cloud Terraform (AWS, GCP, Azure, Oracle Cloud). OIDC-first auth, least privilege IAM, policy-as-code (OPA/Sentinel), cost optimization. Supports ISO/IEC 42001 AI controls, ISO 22301 continuity, ISO/IEC/IEEE 42010 architecture documentation. Resources: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | Monorepo task automation | mise task runner, CI/CD pipelines, database migrations, release coordination, git hooks, pre-commit validation. Resources: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |

### Quality and Debugging

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-qa** | Quality assurance | Security audit (OWASP Top 10), performance analysis, accessibility (WCAG 2.1 AA), code quality review. Severity: CRITICAL/HIGH/MEDIUM/LOW with file:line and remediation code. Supports ISO/IEC 25010 quality characteristics and ISO/IEC 29119 test alignment. Resources: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | Bug diagnosis and fixing | Reproduce-first methodology. Root cause analysis, minimal fixes, mandatory regression tests, similar pattern scanning. Uses Serena MCP for symbol tracing. Resources: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |

### Localization, Coordination, and Git

| Agent | Role | Key Capabilities |
|-------|------|-----------------|
| **oma-translator** | Context-aware translation | 4-stage translation method: Analyze Source, Extract Meaning, Reconstruct in Target Language, Verify. Preserves tone, register, and domain terminology. Anti-AI pattern detection. Supports batch translation (i18n files). Optional 7-stage refined mode for publication quality. Resources: `translation-rubric.md`, `anti-ai-patterns.md`. |
| **oma-orchestrator** | Automated multi-agent coordinator | Spawns CLI subagents in parallel, coordinates via MCP memory, monitors progress, runs verification loops. Configurable: MAX_PARALLEL (default 3), MAX_RETRIES (default 2), POLL_INTERVAL (default 30s). Includes agent-to-agent review loop and Clarification Debt monitoring. Resources: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-commit** | Conventional commits | Analyzes changes, determines type/scope, splits by feature when appropriate, generates commit messages in Conventional Commits format. Co-Author: `First Fluke <our.first.fluke@gmail.com>`. |

---

## Progressive Disclosure Model

oh-my-agent uses a two-layer skill architecture to prevent context window exhaustion:

**Layer 1 — SKILL.md (~800 bytes, always loaded):**
Contains the agent's identity, routing conditions, core rules, and "when to use / when NOT to use" guidance. This is all that is loaded when the agent is not actively working.

**Layer 2 — resources/ (loaded on-demand):**
Contains execution protocols, tech stack references, code snippets, error playbooks, checklists, and examples. These are loaded only when the agent is invoked for a task, and even then, only the resources relevant to the specific task type are loaded (based on the difficulty assessment and task-resource mapping in `context-loading.md`).

This design saves approximately 75% of tokens compared to loading everything upfront. For flash-tier models (128K context), the total resource budget is approximately 3,100 tokens — just 2.4% of the context window.

---

## .agents/ — The Single Source of Truth (SSOT)

Everything oh-my-agent needs lives in the `.agents/` directory:

```
.agents/
├── config/                 # user-preferences.yaml
├── skills/                 # 15 skill directories (14 agents + _shared)
│   ├── _shared/            # Core resources used by all agents
│   └── oma-{agent}/        # Per-agent SKILL.md + resources/
├── workflows/              # 14 workflow definitions
├── agents/                 # 7 subagent definitions
├── plan.json               # Generated plan output
├── state/                  # Active workflow state files
├── results/                # Agent result files
└── mcp.json                # MCP server configuration
```

The `.claude/` directory exists only as an IDE integration layer — it contains symlinks pointing back to `.agents/`, plus hooks for keyword detection and the HUD statusline. The `.serena/memories/` directory holds runtime state during orchestration sessions.

This architecture means your agent configuration is:
- **Portable** — switch IDEs without reconfiguring
- **Version-controlled** — commit `.agents/` alongside your code
- **Shareable** — team members get the same agent setup

---

## Supported IDEs and CLI Tools

oh-my-agent works with any AI-powered IDE or CLI that supports skill/prompt loading:

| Tool | Integration Method | Parallel Agents |
|------|-------------------|----------------|
| **Claude Code** | Native skills + Agent tool | Task tool for true parallelism |
| **Gemini CLI** | Skills auto-loaded from `.agents/skills/` | `oh-my-ag agent:spawn` |
| **Codex CLI** | Skills auto-loaded | Model-mediated parallel requests |
| **Antigravity IDE** | Skills auto-loaded | `oh-my-ag agent:spawn` |
| **Cursor** | Skills via `.cursor/` integration | Manual spawning |
| **OpenCode** | Skills loading | Manual spawning |

Agent spawning adapts to each vendor automatically via the vendor detection protocol, which checks for vendor-specific markers (e.g., the `Agent` tool for Claude Code, `apply_patch` for Codex CLI).

---

## Skill Routing System

When you send a prompt, oh-my-agent determines which agent handles it using the skill routing map (`.agents/skills/_shared/core/skill-routing.md`):

| Domain Keywords | Routed To |
|----------------|-----------|
| API, endpoint, REST, GraphQL, database, migration | oma-backend |
| auth, JWT, login, register, password | oma-backend |
| UI, component, page, form, screen (web) | oma-frontend |
| style, Tailwind, responsive, CSS | oma-frontend |
| mobile, iOS, Android, Flutter, React Native, app | oma-mobile |
| bug, error, crash, broken, slow | oma-debug |
| review, security, performance, accessibility | oma-qa |
| UI design, design system, landing page, DESIGN.md | oma-design |
| brainstorm, ideate, explore, idea | oma-brainstorm |
| plan, breakdown, task, sprint | oma-pm |
| automatic, parallel, orchestrate | oma-orchestrator |

For complex requests that span multiple domains, routing follows established execution orders. For example, "Create a fullstack app" routes to: oma-pm (plan) then oma-backend + oma-frontend (parallel implementation) then oma-qa (review).

---

## What is Next

- **[Installation](./installation)** — Three install methods, presets, CLI setup, and verification
- **[Agents](/core-concepts/agents)** — Deep dive into all 14 agents and charter preflight
- **[Skills](/core-concepts/skills)** — The two-layer architecture explained
- **[Workflows](/core-concepts/workflows)** — All 14 workflows with triggers and phases
- **[Usage Guide](/guide/usage)** — Real examples from single tasks to full orchestration
