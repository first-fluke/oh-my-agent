---
title: Projectstructuur
description: Uitgebreide directorystructuur van een oh-my-agent installatie met elk bestand en elke directory uitgelegd — .agents/ (config, skills, workflows, agents, state, results, mcp.json), .claude/ (settings, hooks, skills symlinks, agents), .serena/memories/ en de oh-my-agent bronrepostructuur.
---

# Projectstructuur

Na het installeren van oh-my-agent krijgt je project drie directorystructuren: `.agents/` (de single source of truth), `.claude/` (IDE-integratielaag) en `.serena/` (runtimestatus). Deze pagina documenteert elk bestand en zijn doel.

---

## Volledige Directorystructuur

```
your-project/
├── .agents/                          ← Single Source of Truth (SSOT)
│   ├── config/
│   │   └── oma-config.yaml    ← Taal, tijdzone, CLI-mapping
│   │
│   ├── skills/
│   │   ├── _shared/                  ← Bronnen gebruikt door ALLE agenten
│   │   │   ├── README.md
│   │   │   ├── core/
│   │   │   │   ├── skill-routing.md
│   │   │   │   ├── context-loading.md
│   │   │   │   ├── prompt-structure.md
│   │   │   │   ├── clarification-protocol.md
│   │   │   │   ├── context-budget.md
│   │   │   │   ├── difficulty-guide.md
│   │   │   │   ├── reasoning-templates.md
│   │   │   │   ├── quality-principles.md
│   │   │   │   ├── vendor-detection.md
│   │   │   │   ├── session-metrics.md
│   │   │   │   ├── common-checklist.md
│   │   │   │   ├── lessons-learned.md
│   │   │   │   └── api-contracts/
│   │   │   │       ├── README.md
│   │   │   │       └── template.md
│   │   │   ├── runtime/
│   │   │   │   ├── memory-protocol.md
│   │   │   │   └── execution-protocols/
│   │   │   │       ├── claude.md
│   │   │   │       ├── gemini.md
│   │   │   │       ├── codex.md
│   │   │   │       └── qwen.md
│   │   │   └── conditional/
│   │   │       ├── quality-score.md
│   │   │       ├── experiment-ledger.md
│   │   │       └── exploration-loop.md
│   │   │
│   │   ├── oma-frontend/             ← Per-agent skill-directory's
│   │   │   ├── SKILL.md
│   │   │   └── resources/
│   │   ├── oma-backend/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   └── stack/                 ← Gegenereerd door /stack-set
│   │   ├── oma-mobile/
│   │   ├── oma-db/
│   │   ├── oma-design/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   ├── reference/
│   │   │   └── examples/
│   │   ├── oma-pm/
│   │   ├── oma-qa/
│   │   ├── oma-debug/
│   │   ├── oma-tf-infra/
│   │   ├── oma-dev-workflow/
│   │   ├── oma-translator/
│   │   ├── oma-orchestrator/
│   │   │   ├── SKILL.md
│   │   │   ├── resources/
│   │   │   ├── scripts/
│   │   │   ├── templates/
│   │   │   └── config/
│   │   ├── oma-brainstorm/
│   │   ├── oma-coordination/
│   │   └── oma-scm/
│   │
│   ├── workflows/                    ← 14 workflowdefinities
│   │   ├── orchestrate.md             ← Persistent: geautomatiseerde parallelle uitvoering
│   │   ├── work.md             ← Persistent: stap-voor-stap coordinatie
│   │   ├── ultrawork.md              ← Persistent: 5-fasen kwaliteitsworkflow
│   │   ├── plan.md                   ← PM taakopsplitsing
│   │   ├── exec-plan.md              ← Uitvoeringsplanbeheer
│   │   ├── brainstorm.md             ← Design-first ideevorming
│   │   ├── deepinit.md               ← Projectinitialisatie
│   │   ├── review.md                 ← QA-reviewpipeline
│   │   ├── debug.md                  ← Gestructureerd debuggen
│   │   ├── design.md                 ← 7-fasen designworkflow
│   │   ├── scm.md                 ← Conventionele commits
│   │   ├── tools.md                  ← MCP-toolbeheer
│   │   └── stack-set.md              ← Tech-stackconfiguratie
│   │
│   ├── agents/                       ← 7 subagentdefinitiebestanden
│   │   ├── backend-engineer.md
│   │   ├── frontend-engineer.md
│   │   ├── mobile-engineer.md
│   │   ├── db-engineer.md
│   │   ├── qa-reviewer.md
│   │   ├── debug-investigator.md
│   │   └── pm-planner.md
│   │
│   ├── results/plan-{sessionId}.json                      ← Gegenereerde planuitvoer (gevuld door /plan)
│   ├── state/                         ← Actieve workflowstatusbestanden
│   ├── results/                       ← Agentresultaatbestanden
│   └── mcp.json                       ← MCP-serverconfiguratie
│
├── .claude/                           ← IDE Integratielaag
│   ├── settings.json                  ← Hookregistratie en permissies
│   ├── hooks/
│   │   ├── triggers.json              ← Trefwoord-naar-workflow mapping (11 talen)
│   │   ├── keyword-detector.ts        ← Auto-detectielogica
│   │   ├── persistent-mode.ts         ← Persistente workflow-handhaving
│   │   └── hud.ts                     ← [OMA] statusbalk-indicator
│   ├── skills/                        ← Symlinks → .agents/skills/
│   └── agents/                        ← Subagentdefinities voor Claude Code
│
└── .serena/                           ← Runtimestatus (Serena MCP)
    └── memories/
        ├── orchestrator-session.md    ← Sessie-ID, status, fasebijhouding
        ├── task-board.md              ← Taaktoewijzingen en status
        ├── progress-{agent}.md        ← Per-agent voortgangsupdates
        ├── result-{agent}.md          ← Per-agent einduitvoer
        ├── session-metrics.md         ← Clarification Debt en Quality Score bijhouding
        ├── experiment-ledger.md       ← Experimentbijhouding (conditioneel)
        ├── session-work.md      ← Work workflow sessiestatus
        ├── session-ultrawork.md       ← Ultrawork workflow sessiestatus
        ├── tool-overrides.md          ← Tijdelijke toolbeperkingen (/tools --temp)
        └── archive/
            └── metrics-{datum}.md     ← Gearchiveerde sessiemetrieken
```

---

## .agents/ — De Bron van Waarheid

Dit is de kerndirectory. Alles wat agenten nodig hebben bevindt zich hier. Het is de enige directory die ertoe doet voor agentgedrag — alle andere directory's zijn ervan afgeleid.

### config/

**`oma-config.yaml`** — Centraal configuratiebestand met: `language` (antwoordtaalcode), `date_format` (tijdstempelnotatie), `timezone` (tijdzone-identificator), `default_cli` (fallback CLI-leverancier), `agent_cli_mapping` (per-agent CLI-routering).

### skills/

Waar agentexpertise leeft. 15 directory's totaal: 14 agent-skills + 1 gedeelde bronnendirectory.

**`_shared/`** — Bronnen gebruikt door alle agenten:
- `core/` — Routering, contextlading, promptstructuur, verduidelijkingsprotocol, contextbudget, moeilijkheidsbeoordeling, redeneersjablonen, kwaliteitsprincipes, leveranciersdetectie, sessiemetrieken, algemene checklist, leerpunten, API-contractsjablonen
- `runtime/` — Geheugenprotocol voor CLI-subagenten, leverancierspecifieke uitvoeringsprotocollen (claude, gemini, codex, qwen)
- `conditional/` — Quality score-meting, experiment ledger-bijhouding, exploratieslus-protocol (alleen geladen wanneer getriggerd)

**`oma-{agent}/`** — Per-agent skill-directory's met `SKILL.md` (~800 bytes, Laag 1: altijd geladen) en `resources/` (Laag 2: op aanvraag).

### workflows/

14 Markdown-bestanden die slash-commandogedrag definieren. Persistente workflows: `orchestrate.md`, `work.md`, `ultrawork.md`. Niet-persistent: `plan.md`, `exec-plan.md`, `brainstorm.md`, `deepinit.md`, `review.md`, `debug.md`, `design.md`, `scm.md`, `tools.md`, `stack-set.md`.

### agents/

7 subagentdefinitiebestanden gebruikt bij het spawnen van agenten via de Task tool (Claude Code) of CLI.

### plan-{sessionId}.json

Gegenereerd door `/plan`. Bevat de gestructureerde taakopsplitsing. Geconsumeerd door `/orchestrate`, `/work` en `/exec-plan`.

### state/

Actieve workflowstatusbestanden. JSON-bestanden bestaan alleen terwijl een persistente workflow draait.

### results/

Agentresultaatbestanden. Aangemaakt door voltooide agenten. Gelezen door de orchestrator en dashboards.

### mcp.json

MCP-serverconfiguratie inclusief serverdefinities, geheugenconfiguratie en toolgroepdefinities.

---

## .claude/ — IDE-Integratie

### settings.json
Registreert hooks en permissies voor Claude Code.

### hooks/
- **`triggers.json`** — Trefwoord-naar-workflow mapping voor 11 talen
- **`keyword-detector.ts`** — Scant invoer, injecteert workflowcontext
- **`persistent-mode.ts`** — Versterkt persistente workflows
- **`hud.ts`** — Rendert de `[OMA]`-indicator in de statusbalk

### skills/
Symlinks naar `.agents/skills/`. Maakt skills zichtbaar voor IDE's terwijl `.agents/` de single source of truth blijft.

### agents/
Subagentdefinities voor Claude Code's Agent tool.

---

## .serena/memories/ — Runtimestatus

| Bestand | Eigenaar | Doel |
|---------|----------|------|
| `orchestrator-session.md` | Orchestrator | Sessiemetadata: ID, status, starttijd, huidige fase |
| `task-board.md` | Orchestrator | Taaktoewijzingen: agent, taak, prioriteit, status, afhankelijkheden |
| `progress-{agent}.md` | Die agent | Beurt-voor-beurt updates: acties, bestanden, status |
| `result-{agent}.md` | Die agent | Einduitvoer: voltooiingsstatus, samenvatting, bestanden, criteria |
| `session-metrics.md` | Orchestrator | Clarification Debt-gebeurtenissen, Quality Score-voortgang |
| `experiment-ledger.md` | Orchestrator/QA | Experimentrijen wanneer Quality Score actief is |
| `tool-overrides.md` | /tools workflow | Tijdelijke toolbeperkingen (sessie-gebonden) |
| `archive/metrics-{datum}.md` | Systeem | Gearchiveerde sessiemetrieken (30 dagen bewaring) |

---

## oh-my-agent Bronrepositorystructuur

```
oh-my-agent/
├── cli/                  ← CLI-toolbron (TypeScript, gebouwd met bun)
│   ├── src/
│   ├── package.json
│   └── install.sh
├── web/                  ← Documentatiesite (Next.js)
│   └── content/
│       └── en/
├── action/               ← GitHub Action voor geautomatiseerde skill-updates
├── docs/                 ← Vertaalde README's en specificaties
├── .agents/              ← BEWERKBAAR in bronrepo (dit IS de bron)
├── .claude/              ← IDE-integratie
├── .serena/              ← Ontwikkelingsruntimestatus
├── CLAUDE.md             ← Projectinstructies voor Claude Code
└── package.json          ← Root werkruimteconfiguratie
```

Ontwikkelcommando's: `bun run test` (CLI-tests), `bun run lint` (Lint), `bun run build` (CLI-build). Commits vereisen conventioneel commitformaat.
