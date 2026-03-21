# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[한국어](./docs/README.ko.md) | [中文](./docs/README.zh.md) | [Português](./docs/README.pt.md) | [日本語](./docs/README.ja.md) | [Français](./docs/README.fr.md) | [Español](./docs/README.es.md) | [Nederlands](./docs/README.nl.md) | [Polski](./docs/README.pl.md) | [Русский](./docs/README.ru.md) | [Deutsch](./docs/README.de.md)

The portable, role-based agent harness for serious AI-assisted engineering.

Orchestrate 10 specialized domain agents (PM, Frontend, Backend, DB, Mobile, QA, Debug, Brainstorm, DevWorkflow, Terraform) via **Serena Memory**. `oh-my-agent` uses `.agents/` as the source of truth for portable skills and workflows, then projects compatibility to other AI IDEs and CLIs. It combines role-based agents, explicit workflows, real-time observability, and standards-aware guidance for teams that want less AI slop and more disciplined execution.

## Table of Contents

- [Architecture](#architecture)
- [Why Different](#why-different)
- [Compatibility](#compatibility)
- [The `.agents` Spec](#the-agents-spec)
- [What Is This?](#what-is-this)
- [Quick Start](#quick-start)
- [Sponsors](#sponsors)
- [License](#license)

## Architecture

```mermaid
flowchart TD
    subgraph Workflows["Workflows"]
        direction TB
        W0["/brainstorm"]
        W1["/coordinate"]
        W1b["/ultrawork"]
        W2["/orchestrate"]
        W3["/plan"]
        W4["/review"]
        W5["/debug"]
        W6["/deepinit"]
    end

    subgraph Orchestration["Orchestration"]
        direction TB
        PM[oma-pm]
        ORC[oma-orchestrator]
    end

    subgraph Domain["Domain Agents"]
        direction TB
        FE[oma-frontend]
        BE[oma-backend]
        DB[oma-db]
        MB[oma-mobile]
        TF[oma-tf-infra]
    end

    subgraph Quality["Quality"]
        direction TB
        QA[oma-qa]
        DBG[oma-debug]
    end

    Workflows --> Orchestration
    Orchestration --> Domain
    Domain --> Quality
    Quality --> CMT([oma-commit])
```

## Why Different

- **`.agents/` is the source of truth**: skills, workflows, shared resources, and config live in one portable project structure instead of being trapped inside one IDE plugin.
- **Role-shaped agent teams**: PM, QA, DB, Infra, Frontend, Backend, Mobile, Debug, and Workflow agents are modeled like an engineering org, not just a pile of prompts.
- **Workflow-first orchestration**: planning, review, debug, and coordinated execution are first-class workflows, not afterthoughts.
- **Standards-aware by design**: agents now carry focused guidance for ISO-driven planning, QA, database continuity/security, and infrastructure governance.
- **Built for verification**: dashboards, manifest generation, shared execution protocols, and structured outputs favor traceability over vibe-only generation.

## Compatibility

`oh-my-agent` is designed around `.agents/` and then bridges to other tool-specific skill folders when needed.

| Tool / IDE | Skills Source | Interop Mode | Notes |
|------------|---------------|--------------|-------|
| Antigravity | `.agents/skills/` | Native | Primary source-of-truth layout; no custom subagent spawning |
| Claude Code | `.claude/skills/` + `.claude/agents/` | Native + Adapter | Symlinks for domain skills + thin router workflow skills, subagents generated from `.agents/agents/`, and CLAUDE.md |
| Codex CLI | `.codex/agents/` + `.agents/skills/` | Native + Adapter | Agent TOML generated from `.agents/agents/` |
| Gemini CLI | `.gemini/agents/` + `.agents/skills/` | Native + Adapter | Agent MD generated from `.agents/agents/` |
| OpenCode | `.agents/skills/` | Native-compatible | Uses the same project-level skill source |
| Amp | `.agents/skills/` | Native-compatible | Shares the same project-level source |
| Cursor | `.agents/skills/` | Native-compatible | Can consume the same project-level skill source |
| GitHub Copilot | `.github/skills/` | Optional symlink | Installed when selected during setup |

See [SUPPORTED_AGENTS.md](./docs/SUPPORTED_AGENTS.md) for the current support matrix and interoperability notes.

### Claude Code Native Integration

Claude Code has first-class native integration beyond symlinks:

- **`CLAUDE.md`** — project identity, architecture, and rules (auto-loaded by Claude Code)
- **`.claude/skills/`** — 12 thin router SKILL.md files that delegate to `.agents/workflows/` (e.g., `/orchestrate`, `/coordinate`, `/ultrawork`). Skills are explicitly invoked via slash commands, not keyword-auto-activated.
- **`.claude/agents/`** — 7 subagent definitions generated from `.agents/agents/*.yaml`, spawned via Task tool (backend-engineer, frontend-engineer, mobile-engineer, db-engineer, qa-reviewer, debug-investigator, pm-planner)
- **Native loop patterns** — Review Loop, Issue Remediation Loop, and Phase Gate Loop using synchronous Task tool results instead of CLI polling

Domain skills (oma-backend, oma-frontend, etc.) remain as symlinks from `.agents/skills/`. Workflow skills are thin router SKILL.md files that delegate to the corresponding `.agents/workflows/*.md` source of truth.

## The `.agents` Spec

`oh-my-agent` treats `.agents/` as a portable project convention for agent skills, workflows, and shared context.

- Skills live in `.agents/skills/<skill-name>/SKILL.md`
- Abstract agent definitions live in `.agents/agents/` (vendor-neutral SSOT; the CLI generates `.claude/agents/`, `.codex/agents/`, `.gemini/agents/` from these)
- Shared resources live in `.agents/skills/_shared/`
  and are grouped into `core/`, `conditional/`, and `runtime/`
- Workflows live in `.agents/workflows/*.md`
- Project config lives in `.agents/config/`
- CLI metadata and packaging stay aligned through generated manifests

See [AGENTS_SPEC.md](./docs/AGENTS_SPEC.md) for the project layout, required files, interoperability rules, and source-of-truth model.

## What Is This?

A collection of **Agent Skills** enabling collaborative multi-agent development. Work is distributed across expert agents with explicit roles, workflows, and verification boundaries:

| Agent | Specialization | Triggers |
|-------|---------------|----------|
| **Brainstorm** | Design-first ideation before planning | "brainstorm", "ideate", "explore idea" |
| **PM Agent** | Requirements analysis, task decomposition, architecture | "plan", "break down", "what should we build" |
| **Frontend Agent** | React/Next.js, TypeScript, Tailwind CSS | "UI", "component", "styling" |
| **Backend Agent** | Backend (Python, Node.js, Rust, ...) | "API", "database", "authentication" |
| **DB Agent** | SQL/NoSQL modeling, normalization, integrity, backup, capacity | "ERD", "schema", "database design", "index tuning" |
| **Mobile Agent** | Flutter cross-platform development | "mobile app", "iOS/Android" |
| **QA Agent** | OWASP Top 10 security, performance, accessibility | "review security", "audit", "check performance" |
| **Debug Agent** | Bug diagnosis, root cause analysis, regression tests | "bug", "error", "crash" |
| **Developer Workflow** | Monorepo task automation, mise tasks, CI/CD, migrations, release | "dev workflow", "mise tasks", "CI/CD pipeline" |
| **TF Infra Agent** | Multi-cloud IaC provisioning (AWS, GCP, Azure, OCI) | "infrastructure", "terraform", "cloud setup" |
| **Orchestrator** | CLI-based parallel agent execution with Serena Memory | "spawn agent", "parallel execution" |
| **Commit** | Conventional Commits with project-specific rules | "commit", "save changes" |

## Quick Start

### Prerequisites

- **AI IDE** (Antigravity, Claude Code, Codex, Gemini, etc.)

### Option 1: One-Line Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Automatically detects and installs missing dependencies (bun, uv), then launches the interactive setup.

### Option 2: Manual Install

```bash
# Install bun if you don't have it:
# curl -fsSL https://bun.sh/install | bash

# Install uv if you don't have it:
# curl -LsSf https://astral.sh/uv/install.sh | sh

bunx oh-my-agent
```

Select your project type and skills will be installed to `.agents/skills/`, with compatibility symlinks created under `.agents/skills/` and `.claude/skills/`.

| Preset | Skills |
|--------|--------|
| ✨ All | Everything |
| 🌐 Fullstack | oma-brainstorm, oma-frontend, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-commit |
| 🎨 Frontend | oma-brainstorm, oma-frontend, oma-pm, oma-qa, oma-debug, oma-commit |
| ⚙️ Backend | oma-brainstorm, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-commit |
| 📱 Mobile | oma-brainstorm, oma-mobile, oma-pm, oma-qa, oma-debug, oma-commit |
| 🚀 DevOps | oma-brainstorm, oma-tf-infra, oma-dev-workflow, oma-pm, oma-qa, oma-debug, oma-commit |

### Option 3: Global Installation (For Orchestrator)

To use the core tools globally or run the SubAgent Orchestrator:

```bash
bun install --global oh-my-agent
```

You'll also need at least one CLI tool:

| CLI | Install | Auth |
|-----|---------|------|
| Gemini | `bun install --global @google/gemini-cli` | Auto on first `gemini` run |
| Claude | `curl -fsSL https://claude.ai/install.sh \| bash` | Auto on first `claude` run |
| Codex | `bun install --global @openai/codex` | `codex login` |
| Qwen | `bun install --global @qwen-code/qwen-code` | `/auth` inside CLI |

### 2. Chat

**Complex project** (/coordinate workflow):

```
"Build a TODO app with user authentication"
→ /coordinate → PM Agent plans → agents spawned in Agent Manager
```

**Maximum deployment** (/ultrawork workflow):

```
"Refactor auth module, add API tests, and update docs"
→ /ultrawork → Independent tasks execute in parallel across agents
```

**Simple task** (invoke a domain skill directly):

```
"Create a login form with Tailwind CSS and form validation"
→ oma-frontend skill
```

**Commit changes** (conventional commits):

```
/commit
→ Analyze changes, suggest commit type/scope, create commit with Co-Author
```

### 3. Monitor with Dashboards

For dashboard setup and usage details, see [`web/content/en/guide/usage.md`](./web/content/en/guide/usage.md#real-time-dashboards).

## Sponsors

This project is maintained thanks to our generous sponsors.

> **Like this project?** Give it a star!
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Try our optimized starter template: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion

<!-- Champion tier ($100/mo) logos here -->

### 🛸 Booster

<!-- Booster tier ($30/mo) logos here -->

### ☕ Contributor

<!-- Contributor tier ($10/mo) names here -->

[Become a sponsor →](https://github.com/sponsors/first-fluke)

See [SPONSORS.md](./SPONSORS.md) for a full list of supporters.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)

## License

MIT
