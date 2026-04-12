# oh-my-agent: Portable Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md) | [Tiếng Việt](./README.vi.md) | [ภาษาไทย](./README.th.md)

Ooit gewenst dat je AI-assistent collega's had? Dat is precies wat oh-my-agent doet.

In plaats van een enkele AI die alles doet (en halverwege de draad kwijtraakt), verdeelt oh-my-agent het werk over **gespecialiseerde agents** — frontend, backend, architecture, QA, PM, DB, mobile, infra, debug, design en meer. Elk van hen kent zijn domein door en door, heeft eigen tools en checklists, en blijft in zijn eigen baan.

Werkt met alle grote AI IDE's: Antigravity, Claude Code, Cursor, Gemini CLI, Codex CLI, OpenCode en meer.

## Snel starten

```bash
# Eenregelig (installeert bun & uv automatisch als ze ontbreken)
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash

# Of handmatig
bunx oh-my-agent@latest
```

Kies een preset en je bent klaar:

| Preset | Wat je krijgt |
|--------|-------------|
| ✨ All | Alle agents en skills |
| 🌐 Fullstack | architecture + frontend + backend + db + pm + qa + debug + brainstorm + scm |
| 🎨 Frontend | architecture + frontend + pm + qa + debug + brainstorm + scm |
| ⚙️ Backend | architecture + backend + db + pm + qa + debug + brainstorm + scm |
| 📱 Mobile | architecture + mobile + pm + qa + debug + brainstorm + scm |
| 🚀 DevOps | architecture + tf-infra + dev-workflow + pm + qa + debug + brainstorm + scm |

## Jouw Agent Team

| Agent | Wat ze doen |
|-------|-------------|
| **oma-architecture** | Architectuur-trade-offs, grenzen, ADR/ATAM/CBAM-bewuste analyse |
| **oma-backend** | API's in Python, Node.js of Rust |
| **oma-brainstorm** | Verkent ideeen voordat je begint met bouwen |
| **oma-db** | Schema-ontwerp, migraties, indexering, vector DB |
| **oma-debug** | Root cause-analyse, fixes, regressietests |
| **oma-design** | Design systems, tokens, toegankelijkheid, responsive |
| **oma-dev-workflow** | CI/CD, releases, monorepo-automatisering |
| **oma-frontend** | React/Next.js, TypeScript, Tailwind CSS v4, shadcn/ui |
| **oma-mobile** | Cross-platform apps met Flutter |
| **oma-orchestrator** | Parallelle agent-uitvoering via CLI |
| **oma-pdf** | PDF naar Markdown conversie |
| **oma-pm** | Plant taken, splitst requirements op, definieert API-contracten |
| **oma-qa** | OWASP-beveiliging, performance, toegankelijkheidsreview |
| **oma-scm** | SCM (softwareconfiguratiebeheer): branching, merges, worktrees, baselines; Conventional Commits |
| **oma-tf-infra** | Multi-cloud Terraform IaC (Infrastructure as Code) |
| **oma-translator** | Natuurlijke meertalige vertaling |

## Hoe het werkt

Gewoon chatten. Beschrijf wat je wilt en oh-my-agent zoekt uit welke agents nodig zijn.

```
Jij: "Bouw een TODO-app met gebruikersauthenticatie"
→ PM plant het werk
→ Backend bouwt de auth API
→ Frontend bouwt de React UI
→ DB ontwerpt het schema
→ QA reviewt alles
→ Klaar: gecoordineerde, gereviewde code
```

Of gebruik slash commands voor gestructureerde workflows:

| Stap | Commando | Wat het doet |
|------|----------|-------------|
| 1 | `/brainstorm` | Vrije brainstorm |
| 2 | `/architecture` | Software-architectuurreview, trade-offs, ADR/ATAM/CBAM-stijl analyse |
| 3 | `/design` | 7-fasen design system workflow |
| 4 | `/plan` | PM splitst je feature op in taken |
| 5 | `/work` | Stapsgewijze multi-agent uitvoering |
| 5 | `/orchestrate` | Automatische parallelle agent-spawning |
| 5 | `/ultrawork` | 5-fasen kwaliteitsworkflow met 11 review gates |
| 6 | `/review` | Beveiligings- + performance- + toegankelijkheidsaudit |
| 7 | `/debug` | Gestructureerde root cause-debugging |
| 8 | `/scm` | SCM- en Git-workflow met ondersteuning voor Conventional Commits |

**Autodetectie**: Je hebt de slash commands niet eens nodig — woorden als "architectuur", "plan", "review" en "debug" in je bericht (in 11 talen!) activeren automatisch de juiste workflow.

## CLI

```bash
# Globaal installeren
bun install --global oh-my-agent   # of: brew install oh-my-agent

# Overal gebruiken
oma doctor                  # Health check
oma dashboard               # Realtime agent-monitoring
oma agent:spawn backend "Build auth API" session-01
oma agent:parallel -i backend:"Auth API" frontend:"Login form"
```

## Waarom oh-my-agent?

> [Meer lezen →](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589)

- **Draagbaar** — `.agents/` reist mee met je project, niet opgesloten in een IDE
- **Rolgebaseerd** — Agents gemodelleerd als een echt engineeringteam, niet een stapel prompts
- **Token-efficient** — Tweelaags skill-ontwerp bespaart ~75% tokens
- **Kwaliteit eerst** — Charter preflight, quality gates en review-workflows ingebouwd
- **Multi-vendor** — Mix Gemini, Claude, Codex en Qwen per agent-type
- **Observeerbaar** — Terminal- en webdashboards voor realtime monitoring

## Architectuur

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

## Meer informatie

- **[Uitgebreide documentatie](./AGENTS_SPEC.md)** — Volledige technische spec en architectuur
- **[Ondersteunde agents](./SUPPORTED_AGENTS.md)** — Agent-ondersteuningsmatrix per IDE
- **[Webdocs](https://first-fluke.github.io/oh-my-agent/)** — Handleidingen, tutorials en CLI-referentie

## Sponsors

Dit project wordt onderhouden dankzij onze gulle sponsors.

> **Vind je dit project leuk?** Geef een ster!
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Probeer onze geoptimaliseerde startertemplate: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

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

[Word sponsor →](https://github.com/sponsors/first-fluke)

Zie [SPONSORS.md](../SPONSORS.md) voor de volledige lijst van supporters.



## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)


## Licentie

MIT
