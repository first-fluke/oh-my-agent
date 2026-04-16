---
title: Introductie
description: Een uitgebreid overzicht van oh-my-agent — het multi-agent orchestratieframework dat AI-coderingsassistenten transformeert in gespecialiseerde engineeringteams met 14 domeinagenten, progressieve skill-loading en cross-IDE portabiliteit.
---

# Introductie

oh-my-agent is een multi-agent orchestratieframework voor AI-aangedreven IDE's en CLI-tools. In plaats van te vertrouwen op een enkele AI-assistent voor alles, verdeelt oh-my-agent werk over 14 gespecialiseerde agenten — elk gemodelleerd naar een echte engineeringteamrol met eigen tech-stackkennis, uitvoeringsprotocollen, foutoplossingshandleidingen en kwaliteitschecklists.

Het volledige systeem bevindt zich in een draagbare `.agents/`-directory binnen je project. Schakel tussen Claude Code, Gemini CLI, Codex CLI, Antigravity IDE, Cursor of een ander ondersteund hulpmiddel — je agentconfiguratie reist mee met je code.

---

## Het Multi-Agent Paradigma

Traditionele AI-coderingsassistenten opereren als generalisten. Ze behandelen frontend, backend, database, beveiliging en infrastructuur met dezelfde promptcontext en hetzelfde niveau van expertise. Dit leidt tot:

- **Contextverdunning** — kennis laden voor elk domein verspilt het contextvenster
- **Inconsistente kwaliteit** — een generalist kan in geen enkel domein een specialist evenaren
- **Geen coordinatie** — complexe functies die meerdere domeinen beslaan worden sequentieel afgehandeld

oh-my-agent lost dit op met specialisatie:

1. **Elke agent kent een domein grondig.** De frontend-agent kent React/Next.js, shadcn/ui, TailwindCSS v4, FSD-lite architectuur. De backend-agent kent het Repository-Service-Router patroon, geparametriseerde queries, JWT-authenticatie. Ze overlappen niet.

2. **Agenten draaien parallel.** Terwijl de backend-agent je API bouwt, maakt de frontend-agent al de UI. De orchestrator coordineert via gedeeld geheugen.

3. **Kwaliteit is ingebouwd.** Elke agent heeft een domeinspecifieke checklist en foutoplossingshandleiding. Charter preflight vangt scope creep op voordat code wordt geschreven. QA-review is een eersteklas stap, geen bijzaak.

---

## Alle 14 Agenten

### Ideevorming en Planning

| Agent | Rol | Belangrijkste Mogelijkheden |
|-------|-----|---------------------------|
| **oma-brainstorm** | Design-first ideevorming | Verkent gebruikersintentie, stelt 2-3 benaderingen voor met afwegingsanalyse, produceert ontwerpdocumenten voordat er code wordt geschreven. 6-fasen workflow: Context, Vragen, Benaderingen, Ontwerp, Documentatie, Overgang naar `/plan`. |
| **oma-pm** | Productmanager | Ontleedt requirements in geprioriteerde taken met afhankelijkheden. Definieert API-contracten. Levert `.agents/results/plan-{sessionId}.json` en `task-board.md`. Ondersteunt ISO 21500-concepten, ISO 31000-risicokader, ISO 38500-governance. |

### Implementatie

| Agent | Rol | Tech Stack & Bronnen |
|-------|-----|---------------------|
| **oma-frontend** | UI/UX-specialist | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui, FSD-lite architectuur. Bibliotheken: luxon (datums), ahooks (hooks), es-toolkit (utils), Jotai (client state), TanStack Query (server state), @tanstack/react-form + Zod (formulieren), better-auth (auth), nuqs (URL state). Bronnen: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`. |
| **oma-backend** | API & server-specialist | Clean architecture (Router-Service-Repository-Models). Stack-agnostisch — detecteert Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET uit projectmanifesten. JWT + bcrypt voor auth. Bronnen: `execution-protocol.md`, `orm-reference.md`, `examples.md`, `checklist.md`, `error-playbook.md`. Ondersteunt `/stack-set` voor het genereren van taalspecifieke `stack/`-referenties. |
| **oma-mobile** | Cross-platform mobiel | Flutter, Dart, Riverpod/Bloc voor state management, Dio met interceptors voor API-aanroepen, GoRouter voor navigatie. Clean architecture: domain-data-presentation. Material Design 3 (Android) + iOS HIG. 60fps-doel. Bronnen: `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`. |
| **oma-db** | Database-architectuur | SQL, NoSQL en vectordatabase-modellering. Schemaontwerp (standaard 3NF), normalisatie, indexering, transacties, capaciteitsplanning, back-upstrategie. Ondersteunt ISO 27001/27002/22301-bewust ontwerp. Bronnen: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`. |

### Design

| Agent | Rol | Belangrijkste Mogelijkheden |
|-------|-----|---------------------------|
| **oma-design** | Designsysteem-specialist | Maakt DESIGN.md met tokens, typografie, kleursystemen, bewegingsontwerp (motion/react, GSAP, Three.js), responsive-first layouts, WCAG 2.2-compliance. 7-fasen workflow: Setup, Extractie, Verbetering, Voorstel, Generatie, Audit, Overdracht. Handhaaft anti-patronen (geen "AI slop"). Optionele Stitch MCP-integratie. Bronnen: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md`, plus `reference/`-directory met typografie, kleur, spatieel, beweging, responsief, component, toegankelijkheid en shader-gidsen. |

### Infrastructuur en DevOps

| Agent | Rol | Belangrijkste Mogelijkheden |
|-------|-----|---------------------------|
| **oma-tf-infra** | Infrastructure-as-code | Multi-cloud Terraform (AWS, GCP, Azure, Oracle Cloud). OIDC-first auth, least privilege IAM, policy-as-code (OPA/Sentinel), kostenoptimalisatie. Ondersteunt ISO/IEC 42001 AI-controls, ISO 22301-continuiteit, ISO/IEC/IEEE 42010-architectuurdocumentatie. Bronnen: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`. |
| **oma-dev-workflow** | Monorepo-taakautomatisering | mise task runner, CI/CD-pipelines, databasemigraties, releasecoordinatie, git hooks, pre-commit validatie. Bronnen: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`. |

### Kwaliteit en Debugging

| Agent | Rol | Belangrijkste Mogelijkheden |
|-------|-----|---------------------------|
| **oma-qa** | Kwaliteitsborging | Beveiligingsaudit (OWASP Top 10), prestatieanalyse, toegankelijkheid (WCAG 2.1 AA), codekwaliteitsreview. Ernst: CRITICAL/HIGH/MEDIUM/LOW met bestand:regel en remediatiecode. Ondersteunt ISO/IEC 25010-kwaliteitskenmerken en ISO/IEC 29119-testuitlijning. Bronnen: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`. |
| **oma-debug** | Bugdiagnose en -oplossing | Reproduceer-eerst methodologie. Oorzaakanalyse, minimale fixes, verplichte regressietests, scanning van vergelijkbare patronen. Gebruikt Serena MCP voor symbooltracing. Bronnen: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`. |

### Lokalisatie, Coordinatie en Git

| Agent | Rol | Belangrijkste Mogelijkheden |
|-------|-----|---------------------------|
| **oma-translator** | Contextbewuste vertaling | 4-stappen vertaalmethode: Bron Analyseren, Betekenis Extraheren, Reconstrueren in Doeltaal, Verifieren. Behoudt toon, register en domein-terminologie. Anti-AI-patroondetectie. Ondersteunt batchvertaling (i18n-bestanden). Optionele 7-stappen verfijnde modus voor publicatiekwaliteit. Bronnen: `translation-rubric.md`, `anti-ai-patterns.md`. |
| **oma-orchestrator** | Geautomatiseerde multi-agent coordinator | Spawnt CLI-subagenten parallel, coordineert via MCP-geheugen, bewaakt voortgang, voert verificatielussen uit. Configureerbaar: MAX_PARALLEL (standaard 3), MAX_RETRIES (standaard 2), POLL_INTERVAL (standaard 30s). Bevat agent-naar-agent reviewlus en Clarification Debt-monitoring. Bronnen: `subagent-prompt-template.md`, `memory-schema.md`. |
| **oma-scm** | Conventionele commits | Analyseert wijzigingen, bepaalt type/scope, splitst per functie indien nodig, genereert commitberichten in Conventional Commits-formaat. Co-Author: `First Fluke <our.first.fluke@gmail.com>`. |

---

## Progressieve Onthulling Model

oh-my-agent gebruikt een tweelaagse skill-architectuur om uitputting van het contextvenster te voorkomen:

**Laag 1 — SKILL.md (~800 bytes, altijd geladen):**
Bevat de identiteit van de agent, routeringscondities, kernregels en "wanneer gebruiken / wanneer NIET gebruiken"-richtlijnen. Dit is alles wat geladen wordt wanneer de agent niet actief werkt.

**Laag 2 — resources/ (op aanvraag geladen):**
Bevat uitvoeringsprotocollen, tech-stackreferenties, codefragmenten, foutoplossingshandleidingen, checklists en voorbeelden. Deze worden alleen geladen wanneer de agent voor een taak wordt ingezet, en zelfs dan alleen de bronnen die relevant zijn voor het specifieke taaktype (op basis van de moeilijkheidsbeoordeling en taak-bronmapping in `context-loading.md`).

Dit ontwerp bespaart ongeveer 75% aan tokens vergeleken met alles vooraf laden. Voor flash-tier modellen (128K context) is het totale bronnenbudget ongeveer 3.100 tokens — slechts 2,4% van het contextvenster.

---

## .agents/ — De Single Source of Truth (SSOT)

Alles wat oh-my-agent nodig heeft bevindt zich in de `.agents/`-directory:

```
.agents/
├── config/                 # oma-config.yaml
├── skills/                 # 15 skill-directory's (14 agenten + _shared)
│   ├── _shared/            # Kernbronnen gebruikt door alle agenten
│   └── oma-{agent}/        # Per-agent SKILL.md + resources/
├── workflows/              # 14 workflowdefinities
├── agents/                 # 7 subagentdefinities
├── results/plan-{sessionId}.json               # Gegenereerde planuitvoer
├── state/                  # Actieve workflowstatusbestanden
├── results/                # Agentresultaatbestanden
└── mcp.json                # MCP-serverconfiguratie
```

De `.claude/`-directory bestaat alleen als IDE-integratielaag — deze bevat symlinks die terugverwijzen naar `.agents/`, plus hooks voor trefwoorddetectie en de HUD-statusbalk. De `.serena/memories/`-directory bevat runtimestatus tijdens orchestratiesessies.

Deze architectuur betekent dat je agentconfiguratie:
- **Draagbaar** is — wissel van IDE zonder herconfiguratie
- **Versiebeheerd** is — commit `.agents/` samen met je code
- **Deelbaar** is — teamleden krijgen dezelfde agentopstelling

---

## Ondersteunde IDE's en CLI-Tools

oh-my-agent werkt met elke AI-aangedreven IDE of CLI die skill/prompt-loading ondersteunt:

| Tool | Integratiemethode | Parallelle Agenten |
|------|-------------------|-------------------|
| **Claude Code** | Native skills + Agent tool | Task tool voor echte parallelisme |
| **Gemini CLI** | Skills automatisch geladen vanuit `.agents/skills/` | `oma agent:spawn` |
| **Codex CLI** | Skills automatisch geladen | Model-gemedieerde parallelle verzoeken |
| **Antigravity IDE** | Skills automatisch geladen | `oma agent:spawn` |
| **Cursor** | Skills via `.cursor/`-integratie | Handmatige spawning |
| **OpenCode** | Skills laden | Handmatige spawning |

Agent-spawning past zich automatisch aan elke leverancier aan via het leveranciersdetectieprotocol, dat controleert op leveranciersspecifieke markers (bijv. het `Agent`-tool voor Claude Code, `apply_patch` voor Codex CLI).

---

## Skill Routeringssysteem

Wanneer je een prompt verstuurt, bepaalt oh-my-agent welke agent deze afhandelt met behulp van de skill-routeringskaart (`.agents/skills/_shared/core/skill-routing.md`):

| Domeintrefwoorden | Gerouteerd Naar |
|-------------------|----------------|
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

Voor complexe verzoeken die meerdere domeinen beslaan, volgt de routering vastgestelde uitvoeringsvolgorden. Bijvoorbeeld, "Maak een fullstack-app" routeert naar: oma-pm (plan) dan oma-backend + oma-frontend (parallelle implementatie) dan oma-qa (review).

---

## Wat Volgt

- **[Installatie](./installation.md)** — Drie installatiemethoden, presets, CLI-setup en verificatie
- **[Agenten](/docs/core-concepts/agents)** — Diepgaand overzicht van alle 14 agenten en charter preflight
- **[Skills](/docs/core-concepts/skills)** — De tweelaagse architectuur uitgelegd
- **[Workflows](/docs/core-concepts/workflows)** — Alle 14 workflows met triggers en fasen
- **[Gebruiksgids](/docs/guide/usage)** — Praktijkvoorbeelden van enkele taken tot volledige orchestratie
