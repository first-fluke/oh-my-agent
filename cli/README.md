# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[한국어](https://github.com/first-fluke/oh-my-agent/blob/main/docs/README.ko.md) | [中文](https://github.com/first-fluke/oh-my-agent/blob/main/docs/README.zh.md) | [Português](https://github.com/first-fluke/oh-my-agent/blob/main/docs/README.pt.md) | [日本語](https://github.com/first-fluke/oh-my-agent/blob/main/docs/README.ja.md) | [Français](https://github.com/first-fluke/oh-my-agent/blob/main/docs/README.fr.md) | [Español](https://github.com/first-fluke/oh-my-agent/blob/main/docs/README.es.md) | [Nederlands](https://github.com/first-fluke/oh-my-agent/blob/main/docs/README.nl.md) | [Polski](https://github.com/first-fluke/oh-my-agent/blob/main/docs/README.pl.md) | [Русский](https://github.com/first-fluke/oh-my-agent/blob/main/docs/README.ru.md) | [Deutsch](https://github.com/first-fluke/oh-my-agent/blob/main/docs/README.de.md) | [Tiếng Việt](https://github.com/first-fluke/oh-my-agent/blob/main/docs/README.vi.md)

Ever wished your AI assistant had coworkers? That's what oh-my-agent does.

Instead of one AI doing everything (and getting confused halfway through), oh-my-agent splits work across **specialized agents** — frontend, backend, QA, PM, DB, mobile, infra, debug, design, and more. Each one knows its domain deeply, has its own tools and checklists, and stays in its lane.

Works with all major AI IDEs: Antigravity, Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode, and more.

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
| 🌐 Fullstack | frontend + backend + db + pm + qa + debug + brainstorm + commit |
| 🎨 Frontend | frontend + pm + qa + debug + brainstorm + commit |
| ⚙️ Backend | backend + db + pm + qa + debug + brainstorm + commit |
| 📱 Mobile | mobile + pm + qa + debug + brainstorm + commit |
| 🚀 DevOps | tf-infra + dev-workflow + pm + qa + debug + brainstorm + commit |

## Your Agent Team

| Agent | What They Do |
|-------|-------------|
| **oma-brainstorm** | Explores ideas before you commit to building |
| **oma-pm** | Plans tasks, breaks down requirements, defines API contracts |
| **oma-frontend** | React/Next.js, TypeScript, Tailwind CSS v4, shadcn/ui |
| **oma-backend** | APIs in Python, Node.js, or Rust |
| **oma-db** | Schema design, migrations, indexing, vector DB |
| **oma-mobile** | Flutter cross-platform apps |
| **oma-design** | Design systems, tokens, accessibility, responsive |
| **oma-qa** | OWASP security, performance, accessibility review |
| **oma-debug** | Root cause analysis, fixes, regression tests |
| **oma-tf-infra** | Multi-cloud Terraform IaC |
| **oma-dev-workflow** | CI/CD, releases, monorepo automation |
| **oma-translator** | Natural multilingual translation |
| **oma-orchestrator** | Parallel agent execution via CLI |
| **oma-commit** | Clean conventional commits |
| **oma-pdf** | PDF to Markdown conversion |

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

| Command | What It Does |
|---------|-------------|
| `/plan` | PM breaks down your feature into tasks |
| `/work` | Step-by-step multi-agent execution |
| `/orchestrate` | Automated parallel agent spawning |
| `/ultrawork` | 5-phase quality workflow with 11 review gates |
| `/review` | Security + performance + accessibility audit |
| `/debug` | Structured root-cause debugging |
| `/design` | 7-phase design system workflow |
| `/brainstorm` | Free-form ideation |
| `/commit` | Conventional commit with type/scope analysis |

**Auto-detection**: You don't even need slash commands — keywords like "plan", "review", "debug" in your message (in 11 languages!) auto-activate the right workflow.

## CLI

```bash
# Install globally
bun install --global oh-my-agent   # or: brew install oh-my-agent

# Use anywhere
oma doctor                  # Health check
oma dashboard               # Real-time agent monitoring
oma agent:spawn backend "Build auth API" session-01
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
```

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
        W3["/plan"]
        W4["/review"]
        W5["/debug"]
        W6["/deepinit"]
        W7["/design"]
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
    Quality --> CMT([oma-commit])
```

## Learn More

- **[Detailed Documentation](https://github.com/first-fluke/oh-my-agent/blob/main/docs/AGENTS_SPEC.md)** — Full technical spec and architecture
- **[Supported Agents](https://github.com/first-fluke/oh-my-agent/blob/main/docs/SUPPORTED_AGENTS.md)** — Agent support matrix across IDEs
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

See [SPONSORS.md](https://github.com/first-fluke/oh-my-agent/blob/main/SPONSORS.md) for a full list of supporters.



## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## License

MIT
