# oh-my-agent: Multi-Agent Harness

[![npm version](https://img.shields.io/npm/v/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![npm downloads](https://img.shields.io/npm/dm/oh-my-agent?color=cb3837&logo=npm)](https://www.npmjs.com/package/oh-my-agent) [![GitHub stars](https://img.shields.io/github/stars/first-fluke/oh-my-agent?style=flat&logo=github)](https://github.com/first-fluke/oh-my-agent) [![License](https://img.shields.io/github/license/first-fluke/oh-my-agent)](https://github.com/first-fluke/oh-my-agent/blob/main/LICENSE) [![Last Updated](https://img.shields.io/github/last-commit/first-fluke/oh-my-agent?label=updated&logo=git)](https://github.com/first-fluke/oh-my-agent/commits/main)

[English](../README.md) | [한국어](./README.ko.md) | [中文](./README.zh.md) | [Português](./README.pt.md) | [日本語](./README.ja.md) | [Français](./README.fr.md) | [Español](./README.es.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [Deutsch](./README.de.md)

De Ultimate Agent Orchestrator voor agentisch programmeren.

Orkestreer 10 gespecialiseerde domein agents (PM, Frontend, Backend, DB, Mobile, QA, Debug, Brainstorm, DevWorkflow, Terraform) via **Serena Memory**. Biedt parallelle CLI-uitvoering, realtime observability dashboards en zero-config progressieve skill loading. De alles-inbegrepen oplossing voor agentisch programmeren.

> **Vind je dit project leuk?** Geef het een ster!
>
> ```bash
> gh api --method PUT /user/starred/first-fluke/oh-my-agent
> ```
>
> Probeer onze geoptimaliseerde starter template: [fullstack-starter](https://github.com/first-fluke/fullstack-starter)

## Inhoudsopgave

- [Architectuur](#architectuur)
- [Waarom anders](#waarom-anders)
- [Compatibiliteit](#compatibiliteit)
- [`.agents` Specificatie](#agents-specificatie)
- [Wat is dit?](#wat-is-dit)
- [Snel starten](#snel-starten)
- [Sponsors](#sponsors)
- [Licentie](#licentie)

## Waarom anders

- **`.agents/` is de bron van waarheid**: skills, workflows, gedeelde bronnen en configuratie leven in één draagbare projectstructuur in plaats van gevangen te zitten in één IDE-plugin.
- **Rolgebaseerde agentteams**: PM, QA, DB, Infra, Frontend, Backend, Mobile, Debug en Workflow agents zijn gemodelleerd als een engineeringorganisatie, niet zomaar een stapel prompts.
- **Workflow-first orchestratie**: planning, review, debug en gecoördineerde uitvoering zijn first-class workflows, geen nagedachten.
- **Standaard-bewust ontwerp**: agents dragen nu gerichte begeleiding voor ISO-gedreven planning, QA, databasecontinuïteit/veiligheid en infrastructuurgovernance.
- **Gebouwd voor verificatie**: dashboards, manifestgeneratie, gedeelde uitvoeringsprotocollen en gestructureerde uitvoer geven de voorkeur aan traceerbaarheid boven alleen-vibe-generatie.

## Compatibiliteit

`oh-my-agent` is ontworpen rond `.agents/` en overbrugt dan naar andere toolspecifieke skillmappen wanneer nodig.

| Tool / IDE | Skill Bron | Interop Mode | Notities |
|------------|---------------|--------------|-------|
| Antigravity | `.agents/skills/` | Native | Primaire bron-van-waarheid lay-out |
| Claude Code | `.claude/skills/` | Symlink naar `.agents/skills/` | Beheerd door installer |
| OpenCode | `.agents/skills/` | Native-compatibel | Gebruikt dezelfde projectniveau skillbron |
| Amp | `.agents/skills/` | Native-compatibel | Deelt dezelfde projectniveau bron |
| Codex CLI | `.agents/skills/` | Native-compatibel | Werkt vanaf dezelfde project skillbron |
| Cursor | `.agents/skills/` | Native-compatibel | Kan dezelfde projectniveau skillbron consumeren |
| GitHub Copilot | `.github/skills/` | Optionele symlink | Geïnstalleerd wanneer geselecteerd tijdens setup |

Zie [SUPPORTED_AGENTS.md](./SUPPORTED_AGENTS.md) voor de huidige supportmatrix en interoperabiliteitsnotities.

## `.agents` Specificatie

`oh-my-agent` behandelt `.agents/` als een draagbare projectconventie voor agent skills, workflows en gedeelde context.

- Skills leven in `.agents/skills/<skill-name>/SKILL.md`
- Gedeelde bronnen leven in `.agents/skills/_shared/`
- Workflows leven in `.agents/workflows/*.md`
- Projectconfiguratie leeft in `.agents/config/`
- CLI-metagegevens en verpakking blijven uitgelijnd via gegenereerde manifesten

Zie [AGENTS_SPEC.md](./AGENTS_SPEC.md) voor de projectlay-out, vereiste bestanden, interoperabiliteitsregels en bron-van-waarheid model.

## Architectuur

```mermaid
flowchart TD
    subgraph Workflows["Workflows"]
        direction TB
        W0["/brainstorm"]
        W1["/coordinate"]
        W1b["/coordinate-pro"]
        W2["/orchestrate"]
        W3["/plan"]
        W4["/review"]
        W5["/debug"]
    end

    subgraph Orchestration["Orkestratie"]
        direction TB
        PM[pm-agent]
        WF[workflow-guide]
        ORC[orchestrator]
    end

    subgraph Domain["Domein Agents"]
        direction TB
        FE[frontend-agent]
        BE[backend-agent]
        DB[db-agent]
        MB[mobile-agent]
        TF[tf-infra-agent]
    end

    subgraph Quality["Kwaliteit"]
        direction TB
        QA[qa-agent]
        DBG[debug-agent]
    end


    Workflows --> Orchestration
    Orchestration --> Domain
    Domain --> Quality
    Quality --> CMT([commit])
```

## Wat is dit?

Een verzameling **Agent Skills** die collaboratieve multi-agent ontwikkeling mogelijk maken. Werk wordt verdeeld over expert agents:

| Agent | Specialisatie | Triggers |
|-------|---------------|----------|
| **Brainstorm** | Design-first ideatie vóór planning | "brainstorm", "ideate", "explore idea" |
| **Workflow Guide** | Coördineert complexe multi-agent projecten | "multi-domein", "complex project" |
| **PM Agent** | Requirements analyse, taak decompositie, architectuur | "plan", "onderverdelen", "wat moeten we bouwen" |
| **Frontend Agent** | React/Next.js, TypeScript, Tailwind CSS | "UI", "component", "styling" |
| **Backend Agent** | FastAPI, PostgreSQL, JWT authenticatie | "API", "database", "authenticatie" |
| **DB Agent** | SQL/NoSQL-modellering, normalisatie, integriteit, back-up, capaciteitsplanning | "ERD", "schema", "databaseontwerp", "index-tuning" |
| **Mobile Agent** | Flutter cross-platform ontwikkeling | "mobiele app", "iOS/Android" |
| **QA Agent** | OWASP Top 10 beveiliging, prestaties, toegankelijkheid | "bekijk beveiliging", "audit", "controleer prestaties" |
| **Debug Agent** | Bug diagnose, root cause analyse, regressietests | "bug", "fout", "crash" |
| **Developer Workflow** | Monorepo-taakautomatisering, mise-taken, CI/CD, migraties, release | "dev workflow", "mise-taken", "CI/CD-pipeline" |
| **TF Infra Agent** | Multi-cloud IaC-provisioning (AWS, GCP, Azure, OCI) | "infrastructuur", "terraform", "cloud-setup" |
| **Orchestrator** | CLI-gebaseerde parallelle agent uitvoering met Serena Memory | "spawn agent", "parallelle uitvoering" |
| **Commit** | Conventional Commits met projectspecifieke regels | "commit", "wijzigingen opslaan" |

## Snel starten

### Vereisten

- **AI IDE** (Antigravity, Claude Code, Codex, Gemini, etc.)
- **Bun** (voor CLI en dashboards)
- **uv** (voor Serena setup)

### Optie 1: Interactieve CLI (aanbevolen)

```bash
# Installeer bun als je het nog niet hebt:
# curl -fsSL https://bun.sh/install | bash

# Installeer uv als je het nog niet hebt:
# curl -LsSf https://astral.sh/uv/install.sh | sh

bunx oh-my-agent
```

Selecteer je projecttype en skills worden geïnstalleerd in `.agents/skills/`.

| Preset | Skills |
|--------|--------|
| ✨ All | Alles |
| 🌐 Fullstack | brainstorm, frontend, backend, db, pm, qa, debug, commit |
| 🎨 Frontend | brainstorm, frontend, pm, qa, debug, commit |
| ⚙️ Backend | brainstorm, backend, db, pm, qa, debug, commit |
| 📱 Mobile | brainstorm, mobile, pm, qa, debug, commit |
| 🚀 DevOps | brainstorm, tf-infra, dev-workflow, pm, qa, debug, commit |

### Optie 2: Globale installatie (voor Orchestrator)

Om de core tools globaal te gebruiken of de SubAgent Orchestrator uit te voeren:

```bash
bun install --global oh-my-agent
```

Je hebt ook minimaal één CLI tool nodig:

| CLI | Installeren | Authenticatie |
|-----|-------------|---------------|
| Gemini | `bun install --global @anthropic-ai/gemini-cli` | `gemini auth` |
| Claude | `curl -fsSL https://claude.ai/install.sh \| bash` | `claude auth` |
| Codex | `bun install --global @openai/codex` | `codex auth` |
| Qwen | `bun install --global @qwen-code/qwen` | `qwen auth` |

### Optie 3: Integreren in bestaand project

**Aanbevolen (CLI):**

Voer het volgende commando uit in je projectroot om automatisch skills en workflows te installeren/updaten:

```bash
bunx oh-my-agent
```

> **Tip:** Voer `bunx oh-my-agent doctor` uit na installatie om te verifiëren dat alles correct is ingesteld (inclusief globale workflows).

### 2. Chat

**Eenvoudige taak** (enkele agent activeert automatisch):

```
"Maak een loginformulier met Tailwind CSS en formuliervalidatie"
→ frontend-agent activeert
```

**Complex project** (workflow-guide coördineert):

```
"Bouw een TODO app met gebruikersauthenticatie"
→ workflow-guide → PM Agent plant → agents gespawned in Agent Manager
```

**Expliciete coördinatie** (door gebruiker getriggerde workflow):

```
/coordinate
→ Stap-voor-stap: PM planning → agent spawning → QA review
```

**Wijzigingen committen** (conventional commits):

```
/commit
→ Analyseer wijzigingen, stel commit type/scope voor, creëer commit met Co-Author
```

### 3. Monitoren met dashboards

Voor dashboard setup en gebruiksdetails, zie [`web/content/nl/guide/usage.md`](./web/content/nl/guide/usage.md#realtime-dashboards).

## Sponsors

Dit project wordt onderhouden dankzij onze genereuze sponsors.

<a href="https://github.com/sponsors/first-fluke">
  <img src="https://img.shields.io/badge/Sponsor-♥-ea4aaa?style=for-the-badge" alt="Sponsor" />
</a>
<a href="https://buymeacoffee.com/firstfluke">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-FFDD00?style=for-the-badge" alt="Buy Me a Coffee" />
</a>

### 🚀 Champion

<!-- Champion tier ($100/mo) logo's hier -->

### 🛸 Booster

<!-- Booster tier ($30/mo) logo's hier -->

### ☕ Contributor

<!-- Contributor tier ($10/mo) namen hier -->

[Word sponsor →](https://github.com/sponsors/first-fluke)

Zie [SPONSORS.md](./SPONSORS.md) voor een volledige lijst van supporters.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=first-fluke/oh-my-agent&type=date&legend=bottom-right)](https://www.star-history.com/#first-fluke/oh-my-agent&type=date&legend=bottom-right)

## Licentie

MIT
