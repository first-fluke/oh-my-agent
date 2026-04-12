---
title: Gebruiksgids
description: Uitgebreide gebruiksgids voor oh-my-agent — snelstart, gedetailleerde praktijkvoorbeelden voor enkele taken, multi-domein projecten, bugfixes, designsystemen, CLI parallelle uitvoering en ultrawork. Alle workflowcommando's, auto-detectievoorbeelden in meerdere talen, alle 14 skills met toepassingen, dashboardsetup, kernconcepten, tips en probleemoplossing.
---

# Hoe oh-my-agent te Gebruiken

## Snelstart

1. Open je project in een AI-aangedreven IDE (Claude Code, Gemini CLI, Cursor, Antigravity, etc.)
2. Skills worden automatisch gedetecteerd vanuit `.agents/skills/`
3. Beschrijf wat je wilt in natuurlijke taal — oh-my-agent routeert naar de juiste agent
4. Voor multi-agent werk, gebruik `/work` of `/orchestrate`

Dat is de volledige workflow. Geen speciale syntaxis nodig voor enkel-domein taken.

---

## Voorbeeld 1: Eenvoudige Enkele Taak

**Je typt:**
```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**Wat er gebeurt:**

1. De `oma-frontend`-skill activeert automatisch (trefwoorden: "form", "component", "Tailwind CSS")
2. Laag 1 (SKILL.md) is al geladen — agentidentiteit, kernregels, bibliothekenlijst
3. Laag 2-bronnen laden op aanvraag: `execution-protocol.md`, `snippets.md`, `component-template.tsx`
4. Agent levert een **CHARTER_CHECK**
5. Agent implementeert: React-component, Zod-validatieschema, Vitest-tests, Loading skeleton
6. Agent draait de checklist: toegankelijkheid, mobiel, prestaties, veerkracht

**Uitvoer:** Een productiegereed React-component met TypeScript, validatie, tests en toegankelijkheid.

---

## Voorbeeld 2: Multi-Domein Project

**Je typt:**
```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**Wat er gebeurt:**

1. Trefwoorddetectie identificeert dit als multi-domein (frontend + backend + mobile)
2. oh-my-agent stelt `/work` of `/orchestrate` voor

**Met `/work` (stap-voor-stap met gebruikerscontrole):**

3. **Stap 1 — PM Agent plant:** Identificeert domeinen, definieert API-contracten, maakt geprioriteerde taakopsplitsing
4. **Stap 2 — Je reviewt en bevestigt het plan**
5. **Stap 3 — Agenten spawnen per prioriteit** (P0 parallel, dan P1, etc.)
6. **Stap 4 — QA Agent reviewt:** Beveiliging, prestaties, toegankelijkheid, cross-domein uitlijning
7. **Stap 5 — Itereren:** Bij CRITICAL-problemen, herspawn verantwoordelijke agent

---

## Voorbeeld 3: Bugfixing

**Je typt:**
```
There's a bug — clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**Wat er gebeurt:**

1. `oma-debug` activeert automatisch
2. **Reproduceren:** MCP `search_for_pattern` vindt de `.map()`-aanroep
3. **Diagnosticeren:** MCP `find_referencing_symbols` traceert de datastroom — component rendert voor data arriveert
4. **Minimale fix voorstellen:** Loading state check en null guard toevoegen
5. **Implementeren + regressietest**
6. **Vergelijkbare patronen scannen:** Vindt en fixt 3 vergelijkbare patronen elders
7. **Documenteren:** Bugrapport geschreven naar geheugen

---

## Voorbeeld 4: Designsysteem

**Je typt:**
```
Design a dark premium landing page for my B2B SaaS analytics product
```

**Wat er gebeurt:**

1. `oma-design` activeert
2. **Fase 1 — SETUP:** Vraagt naar talen, doelgroep, merkpersoonlijkheid, esthetische richting
3. **Fase 4 — PROPOSE:** Presenteert 3 ontwerprichtingen met kleur, typografie, layout, beweging
4. **Fase 5 — GENERATE:** Genereert DESIGN.md + CSS/Tailwind/shadcn tokens
5. **Fase 6 — AUDIT:** Controles voor responsief, WCAG 2.2, Nielsen, AI slop-detectie
6. **Fase 7 — HANDOFF:** "Ontwerp compleet. Voer `/orchestrate` uit om te implementeren."

---

## Voorbeeld 5: CLI Parallelle Uitvoering

```bash
# Enkele agent
oma agent:spawn frontend "Add dark mode toggle to the header" session-ui-01

# Drie agenten parallel
oma agent:spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent:spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent:spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# Monitor (aparte terminal)
oma dashboard

# Na implementatie, draai QA
oma agent:spawn qa "Review notification feature across all platforms" session-notif-01
```

---

## Voorbeeld 6: Ultrawork — Maximale Kwaliteit

**Je typt:**
```
/ultrawork Build a payment processing module with Stripe integration
```

**Wat er gebeurt (5 fasen, 17 stappen, 11 reviewstappen):**

- **Fase 1 — PLAN:** Plan met taakopsplitsing, API-contracten, afhankelijkheden. Volledigheidsreview, meta-review, over-engineeringreview.
- **Fase 2 — IMPL:** Backend implementeert Stripe-integratie, frontend bouwt checkout-stroom.
- **Fase 3 — VERIFY:** Uitlijningsreview, beveiligings/bugreview, regressiereview.
- **Fase 4 — REFINE:** Grote bestanden splitsen, integratie/hergebruikreview, bijeffectenreview, dode code opruimen.
- **Fase 5 — SHIP:** Codekwaliteitsreview, UX-stroomverificatie, deploymentgereedheid.

---

## Alle Workflowcommando's

| Commando | Type | Wat Het Doet | Wanneer Gebruiken |
|----------|------|-------------|-------------------|
| `/orchestrate` | Persistent | Geautomatiseerde parallelle agentuitvoering met monitoring | Grote projecten met maximale parallelisme |
| `/work` | Persistent | Stap-voor-stap multi-domeincoordinatie met gebruikersgoedkeuring | Functies die meerdere agenten beslaan |
| `/ultrawork` | Persistent | 5-fasen, 17-stappen kwaliteitsworkflow met 11 reviewcheckpoints | Maximale kwaliteitslevering |
| `/plan` | Niet-persistent | PM-gedreven taakopsplitsing en API-contractdefinitie | Voor complex multi-agent werk |
| `/exec-plan` | Niet-persistent | Uitvoeringsplannen als repository-artefacten | Complexe functies met bijgehouden voortgang |
| `/brainstorm` | Niet-persistent | Design-first ideevorming met 2-3 benaderingsvoorstellen | Voor het vastleggen van een implementatiebenadering |
| `/deepinit` | Niet-persistent | Volledige projectinitialisatie | oh-my-agent instellen in bestaande codebase |
| `/review` | Niet-persistent | QA-pipeline: OWASP, prestaties, toegankelijkheid, codekwaliteit | Voor het mergen van code |
| `/debug` | Niet-persistent | Gestructureerd debuggen | Onderzoek van bugs en fouten |
| `/design` | Niet-persistent | 7-fasen designworkflow met DESIGN.md | Designsystemen, landingspagina's |
| `/scm` | Niet-persistent | Conventionele commit met auto type/scope-detectie | Na het voltooien van codewijzigingen |
| `/tools` | Niet-persistent | MCP-toolzichtbaarheidsbeheer | MCP-tools beheren |
| `/stack-set` | Niet-persistent | Auto-detectie tech stack en backend-referenties genereren | Taalspecifieke conventies instellen |

---

## Auto-Detectievoorbeelden

| Je Typt | Gedetecteerde Workflow | Taal |
|---------|----------------------|------|
| "plan the authentication feature" | `/plan` | Engels |
| "do everything in parallel" | `/orchestrate` | Engels |
| "review the code for security" | `/review` | Engels |
| "fix the login bug" | `/debug` | Engels |
| "계획 세워줘" | `/plan` | Koreaans |
| "버그 수정해줘" | `/debug` | Koreaans |
| "コードレビューして" | `/review` | Japans |
| "修复这个 bug" | `/debug` | Chinees |
| "coordonner étape par étape" | `/work` | Frans |

**Informatieve vragen worden uitgefilterd:** "what is orchestrate?" triggert geen workflow.

---

## Alle 14 Skills — Snelreferentie

| Skill | Geschikt Voor | Primaire Uitvoer |
|-------|-------------|------------------|
| **oma-brainstorm** | "Ik heb een idee", benaderingen verkennen | Ontwerpdocument in `docs/plans/` |
| **oma-pm** | "plan dit", taakopsplitsing | `.agents/results/plan-{sessionId}.json`, `task-board.md` |
| **oma-frontend** | UI-componenten, formulieren, pagina's, styling | React/TypeScript-componenten, Vitest-tests |
| **oma-backend** | API's, auth, serverlogica, migraties | Endpoints, models, services, tests |
| **oma-db** | Schemaontwerp, ERD, capaciteitsplanning | Schemadocumentatie, migratiescripts |
| **oma-mobile** | Mobiele apps, platformfuncties | Flutter-schermen, state management, tests |
| **oma-design** | Designsystemen, landingspagina's, tokens | DESIGN.md, CSS/Tailwind tokens |
| **oma-qa** | Beveiligingsaudit, prestaties, toegankelijkheid | QA-rapport met CRITICAL/HIGH/MEDIUM/LOW |
| **oma-debug** | Bugonderzoek, oorzaakanalyse | Gefixte code + regressietests |
| **oma-tf-infra** | Cloud infrastructuurprovisioning | Terraform-modules, IAM-policies |
| **oma-dev-workflow** | CI/CD, monorepo-taken | mise.toml configs, pipelinedefinities |
| **oma-translator** | Meertalige content, i18n-bestanden | Vertaalde tekst met behoud van toon |
| **oma-orchestrator** | Geautomatiseerde parallelle agentuitvoering | Georkestreerde resultaten |
| **oma-scm** | Git-commits | Conventional Commits met type/scope |

---

## Tips

1. **Wees specifiek in prompts.** Gedetailleerde beschrijvingen produceren betere resultaten.
2. **Gebruik werkruimten voor parallelle agenten.** Geef altijd `-w ./pad` mee.
3. **Vergrendel API-contracten voor implementatie.** Draai eerst `/plan`.
4. **Monitor actief.** Open een dashboardterminal.
5. **Itereer met herspawns.** Herspawn met correctiecontext.
6. **Begin met `/work` bij twijfel.**
7. **Gebruik `/brainstorm` voor `/plan` bij dubbelzinnige ideeen.**
8. **Draai `/deepinit` op nieuwe codebases.**
9. **Configureer agent-CLI mapping.** Routeer complexe taken naar Claude, snelle naar Gemini.
10. **Gebruik `/ultrawork` voor productiekritieke code.**

---

## Probleemoplossing

| Probleem | Oorzaak | Oplossing |
|----------|---------|----------|
| Skills niet gedetecteerd in IDE | `.agents/skills/` ontbreekt | Voer installer uit, verifieer symlinks, herstart IDE |
| CLI niet gevonden bij spawning | AI CLI niet globaal geinstalleerd | Installeer ontbrekende CLI's |
| Agenten produceren conflicterende code | Geen werkruimte-isolatie | Gebruik gescheiden werkruimten: `-w ./apps/api`, `-w ./apps/web` |
| Dashboard toont geen agenten | Agenten hebben nog niet naar geheugen geschreven | Wacht op eerste schrijfactie, verifieer sessie-ID |
| QA-rapport heeft 50+ problemen | Normaal bij eerste review van grote codebases | Focus op CRITICAL en HIGH eerst |
| Auto-detectie triggert verkeerde workflow | Trefwoordambiguiteit | Gebruik expliciet `/command` |
| Persistente workflow stopt niet | Statusbestand bestaat nog | Zeg "workflow done" of verwijder handmatig |
| Agent geblokkeerd op HIGH verduidelijking | Requirements te dubbelzinnig | Beantwoord de vragen van de agent |
| Agent overschrijdt beurtlimiet | Taak te complex | Verhoog beurten met `-t 30` of splits taak op |

---

Voor enkel-domein taakpatronen, zie [Enkele Skill Gids](./single-skill).
Voor projectintegratie details, zie [Integratiegids](./integration).
