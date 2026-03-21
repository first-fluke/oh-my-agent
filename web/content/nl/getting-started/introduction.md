---
title: Introductie
description: Wat oh-my-agent is en hoe multi-agentsamenwerking werkt.
---

# Introductie

oh-my-agent is een multi-agentorkestrator voor Antigravity IDE. Het routeert verzoeken naar gespecialiseerde skills en coördineert agents via Serena-geheugens.

## Wat u krijgt

- Verzoekgestuurde skillroutering
- Werkstroomgebaseerde uitvoering voor planning/review/debugging
- CLI-orkestratie voor parallelle agentruns
- Realtime dashboards voor sessiemonitoring

## Agentrollen

| Agent | Verantwoordelijkheid |
|---|---|
| oma-coordination | Coördineert complexe multidomain-projecten |
| oma-pm | Planning en architectuuropsplitsing |
| oma-frontend | React/Next.js-implementatie |
| oma-backend | API/database/auth-implementatie |
| oma-mobile | Flutter/mobiele implementatie |
| oma-brainstorm | Design-first ideevorming en conceptverkenning |
| oma-db | Databasemodellering, schemaontwerp en queryoptimalisatie |
| oma-dev-workflow | Ontwikkelworkflow-optimalisatie en CI/CD |
| oma-tf-infra | Terraform infrastructure-as-code provisioning |
| oma-translator | Contextbewuste meertalige vertaling |
| oma-qa | Beveiligings-/prestatie-/toegankelijkheidsreview |
| oma-debug | Hoofdoorzaakanalyse en regressieveilige fixes |
| oma-orchestrator | CLI-gebaseerde subagentorkestratie |
| oma-commit | Conventionele commitworkflow |

## Projectstructuur

- `.agents/skills/`: skilldefinities en resources
- `.agents/workflows/`: expliciete workflowcommando's
- `.serena/memories/`: runtime-orkestratiestatus
- `cli/cli.ts`: bron van waarheid voor commandointerfaces

## Progressieve ontsluiting

1. Verzoekintentie identificeren
2. Alleen benodigde skillresources laden
3. Uitvoeren met gespecialiseerde agents
4. Verifiëren en itereren via QA-/debuglussen
