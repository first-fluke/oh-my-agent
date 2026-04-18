# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[한국어](./docs/README.ko.md) | [中文](./docs/README.zh.md) | [Português](./docs/README.pt.md) | [日本語](./docs/README.ja.md) | [Français](./docs/README.fr.md) | [Español](./docs/README.es.md) | [Nederlands](./docs/README.nl.md) | [Polski](./docs/README.pl.md) | [Русский](./docs/README.ru.md) | [Deutsch](./docs/README.de.md) | [Tiếng Việt](./docs/README.vi.md) | [ภาษาไทย](./docs/README.th.md)

Ever wished your AI assistant had coworkers? That's what oh-my-agent does.

Instead of one AI doing everything (and getting confused halfway through), oh-my-agent splits work across **specialized agents** — frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design, and more. Each one knows its domain deeply, has its own tools and checklists, and stays in its lane.

Works with all major AI IDEs: Antigravity, Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode, and more.

Vendor-native subagents are generated from `.agents/agents/`:
- Claude Code uses `.claude/agents/*.md`
- Codex CLI uses `.codex/agents/*.toml`
- Gemini CLI uses `.gemini/agents/*.md`

When a workflow resolves an agent to the same vendor as the current runtime, it should use that vendor's native subagent path first. Cross-vendor tasks fall back to `oma agent:spawn`.

## Quick Start

```bash
# One-liner (auto-installs bun & uv if missing)
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash

# Or manual
bunx oh-my-agent@latest
```

`install.sh` supports macOS/Linux only. On Windows, install `bun` and `uv` manually, then run `bunx oh-my-agent@latest`.

Pick a preset and you're ready:

| Preset | What You Get |
|--------|-------------|
| ✨ All | Every agent and skill |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + scm |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + scm |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + scm |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + scm |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + scm |

## Your Agent Team

| Agent | What They Do |
|-------|-------------|
| **oma-architecture** | Architectural tradeoffs, boundaries, ADR/ATAM/CBAM-aware analysis |
| **oma-backend** | APIs in Python, Node.js, or Rust |
| **oma-brainstorm** | Explores ideas before you commit to building |
| **oma-db** | Schema design, migrations, indexing, vector DB |
| **oma-debug** | Root cause analysis, fixes, regression tests |
| **oma-design** | Design systems, tokens, accessibility, responsive |
| **oma-dev-workflow** | CI/CD, releases, monorepo automation |
| **oma-frontend** | React/Next.js, TypeScript, Tailwind CSS v4, shadcn/ui |
| **oma-hwp** | HWP/HWPX/HWPML to Markdown conversion |
| **oma-mobile** | Flutter cross-platform apps |
| **oma-orchestrator** | Parallel agent execution via CLI |
| **oma-pdf** | PDF to Markdown conversion |
| **oma-pm** | Plans tasks, breaks down requirements, defines API contracts |
| **oma-qa** | OWASP security, performance, accessibility review |
| **oma-recap** | Conversation history recap and themed work summaries |
| **oma-scm** | SCM (software configuration management) — branching, merges, worktrees, baselines; Conventional Commits |
| **oma-search** | Intent-based search router with trust scoring — docs, web, code, local |
| **oma-tf-infra** | Multi-cloud Terraform IaC (Infrastructure as Code) |
| **oma-translator** | Natural multilingual translation |

## How It Works

Just chat. Describe what you want and oh-my-agent figures out which agents to use.

```
You: "Build a TODO app with user authentication"
→ PM plans the work
→ Backend builds auth API
→ Frontend builds React UI
→ DB designs schema
→ QA reviews everything
→ Done: coordinated, reviewed code
```

Or use slash commands for structured workflows:

| Step | Command | What It Does |
|------|---------|-------------|
| 1 | `/brainstorm` | Free-form ideation |
| 2 | `/architecture` | Software architecture review, tradeoffs, ADR/ATAM/CBAM-style analysis |
| 2 | `/design` | 7-phase design system workflow |
| 2 | `/plan` | PM breaks down your feature into tasks |
| 3 | `/work` | Step-by-step multi-agent execution |
| 3 | `/orchestrate` | Automated parallel agent spawning |
| 3 | `/ultrawork` | 5-phase quality workflow with 11 review gates |
| 4 | `/review` | Security + performance + accessibility audit |
| 5 | `/debug` | Structured root-cause debugging |
| 6 | `/scm` | SCM + Git workflow and Conventional Commit support |

**Auto-detection**: You don't even need slash commands — keywords like "architecture", "plan", "review", and "debug" in your message (in 11 languages!) auto-activate the right workflow.

## CLI

```bash
# Install globally
bun install --global oh-my-agent   # or: brew install oh-my-agent

# Use anywhere
oma doctor                  # Health check
oma dashboard               # Real-time agent monitoring
oma link                    # Regenerate .claude/.codex/.gemini/etc. from .agents/
oma agent:spawn backend "Build auth API" session-01
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
```

Model selection follows two layers:
- Same-vendor native dispatch uses the generated vendor agent definition in `.claude/agents/`, `.codex/agents/`, or `.gemini/agents/`.
- Cross-vendor or fallback CLI dispatch uses the vendor defaults in `.agents/skills/oma-orchestrator/config/cli-config.yaml`.

## Why oh-my-agent?

> [Read why →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **Portable** — `.agents/` travels with your project, not trapped in one IDE
- **Role-based** — Agents modeled like a real engineering team, not a pile of prompts
- **Token-efficient** — Two-layer skill design saves ~75% of tokens
- **Quality-first** — Charter preflight, quality gates, and review workflows built in
- **Multi-vendor** — Mix Gemini, Claude, Codex, and Qwen per agent type
- **Observable** — Terminal and web dashboards for real-time monitoring

## Architecture

```mermaid
flowchart TD
    subgraph Workflows["Workflows"]
        direction TB
        W0["/brainstorm"]
        W1["/work"]
        W1b["/ultrawork"]
        W2["/orchestrate"]
        W3["/architecture"]
        W4["/plan"]
        W5["/review"]
        W6["/debug"]
        W7["/deepinit"]
        W8["/design"]
    end

    subgraph Orchestration["Orchestration"]
        direction TB
        PM[oma-pm]
        ORC[oma-orchestrator]
    end

    subgraph Domain["Domain Agents"]
        direction TB
        ARC[oma-architecture]
        FE[oma-frontend]
        BE[oma-backend]
        DB[oma-db]
        MB[oma-mobile]
        DES[oma-design]
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
    Quality --> SCM([oma-scm])
```

## Learn More

- **[Detailed Documentation](./docs/AGENTS_SPEC.md)** — Full technical spec and architecture
- **[Supported Agents](./docs/SUPPORTED_AGENTS.md)** — Agent support matrix across IDEs
- **[Web Docs](https://first-fluke.github.io/oh-my-agent/)** — Guides, tutorials, and CLI reference

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
