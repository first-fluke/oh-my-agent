---
title: Skills
description: Volledige gids voor de oh-my-agent tweelaagse skill-architectuur — SKILL.md-ontwerp, on-demand resource loading, elk gedeeld resource uitgelegd, conditionele protocollen, per-skill resourcetypen, leverancier-uitvoeringsprotocollen, tokenbesparingsberekening en skill-routeringsmechanismen.
---

# Skills

Skills zijn gestructureerde kennispakketten die elke agent zijn domeinexpertise geven. Het zijn niet alleen prompts — ze bevatten uitvoeringsprotocollen, tech-stackreferenties, codesjablonen, foutoplossingshandleidingen, kwaliteitschecklists en few-shot voorbeelden, georganiseerd in een tweelaagse architectuur ontworpen voor tokenefficiency.

---

## Het Tweelaagse Ontwerp

### Laag 1: SKILL.md (~800 bytes, altijd geladen)

Elke skill heeft een `SKILL.md`-bestand in de root. Dit wordt altijd in het contextvenster geladen wanneer de skill wordt gerefereerd. Het bevat:

- **YAML frontmatter** met `name` en `description` (gebruikt voor routering en weergave)
- **Wanneer gebruiken / Wanneer NIET gebruiken** — expliciete activeringsvoorwaarden
- **Kernregels** — de 5-15 meest kritieke beperkingen voor het domein
- **Architectuuroverzicht** — hoe code gestructureerd moet zijn
- **Bibliothekenlijst** — goedgekeurde afhankelijkheden en hun doelen
- **Referenties** — verwijzingen naar Laag 2-bronnen (worden nooit automatisch geladen)

Voorbeeld frontmatter:

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

Het description-veld is cruciaal — het bevat de routeringstrefwoorden die het skill-routeringssysteem gebruikt om taken aan agenten te koppelen.

### Laag 2: resources/ (op aanvraag geladen)

De `resources/`-directory bevat diepgaande uitvoeringskennis. Deze bestanden worden alleen geladen wanneer:
1. De agent expliciet wordt ingezet (via `/command` of agent skills-veld)
2. De specifieke resource nodig is voor het huidige taaktype en de moeilijkheidsgraad

Deze on-demand loading wordt gestuurd door de contextladingsgids (`.agents/skills/_shared/core/context-loading.md`), die taaktypen koppelt aan vereiste resources per agent.

---

## Bestandsstructuur Voorbeeld

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Laag 1: altijd geladen (~800 bytes)
└── resources/
    ├── execution-protocol.md         ← Laag 2: stap-voor-stap workflow
    ├── tech-stack.md                 ← Laag 2: gedetailleerde technologiespecificaties
    ├── tailwind-rules.md             ← Laag 2: Tailwind-specifieke conventies
    ├── component-template.tsx        ← Laag 2: React componentsjabloon
    ├── snippets.md                   ← Laag 2: kopieer-en-plak codepatronen
    ├── error-playbook.md             ← Laag 2: foutherstelprocedures
    ├── checklist.md                  ← Laag 2: kwaliteitsverificatie checklist
    └── examples/                     ← Laag 2: few-shot invoer/uitvoer voorbeelden
        └── examples.md

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── examples.md
│   ├── orm-reference.md              ← Domeinspecifiek (ORM queries, N+1, transacties)
│   ├── checklist.md
│   └── error-playbook.md
└── stack/                             ← Gegenereerd door /stack-set (taalspecifiek)
    ├── stack.yaml
    ├── tech-stack.md
    ├── snippets.md
    └── api-template.*

.agents/skills/oma-design/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── anti-patterns.md
│   ├── checklist.md
│   ├── design-md-spec.md
│   ├── design-tokens.md
│   ├── prompt-enhancement.md
│   ├── stitch-integration.md
│   └── error-playbook.md
├── reference/                         ← Diepgaand referentiemateriaal
│   ├── typography.md
│   ├── color-and-contrast.md
│   ├── spatial-design.md
│   ├── motion-design.md
│   ├── responsive-design.md
│   ├── component-patterns.md
│   ├── accessibility.md
│   └── shader-and-3d.md
└── examples/
    ├── design-context-example.md
    └── landing-page-prompt.md
```

---

## Per-Skill Resourcetypen

| Resourcetype | Bestandsnaampatroon | Doel | Wanneer Geladen |
|-------------|---------------------|------|----------------|
| **Uitvoeringsprotocol** | `execution-protocol.md` | Stap-voor-stap workflow: Analyseren -> Plannen -> Implementeren -> Verifieren | Altijd (met SKILL.md) |
| **Tech Stack** | `tech-stack.md` | Gedetailleerde technologiespecificaties, versies, configuratie | Complexe taken |
| **Foutoplossingshandleiding** | `error-playbook.md` | Herstelprocedures met "3 strikes"-escalatie | Alleen bij fouten |
| **Checklist** | `checklist.md` | Domeinspecifieke kwaliteitsverificatie | Bij Verificatiestap |
| **Fragmenten** | `snippets.md` | Kopieer-en-plak klare codepatronen | Gemiddelde/Complexe taken |
| **Voorbeelden** | `examples.md` of `examples/` | Few-shot invoer/uitvoer voorbeelden voor het LLM | Gemiddelde/Complexe taken |
| **Varianten** | `stack/`-directory | Taal/framework-specifieke referenties (gegenereerd door `/stack-set`) | Wanneer stack bestaat |
| **Sjablonen** | `component-template.tsx`, `screen-template.dart` | Boilerplate bestandssjablonen | Bij componentcreatie |
| **Domeinreferentie** | `orm-reference.md`, `anti-patterns.md`, etc. | Diepgaande domeinkennis voor specifieke subtaken | Taaktype-specifiek |

---

## Gedeelde Bronnen (_shared/)

Alle agenten delen gemeenschappelijke fundamenten vanuit `.agents/skills/_shared/`. Deze zijn georganiseerd in drie categorieen:

### Kernbronnen (`.agents/skills/_shared/core/`)

| Resource | Doel | Wanneer Geladen |
|----------|------|----------------|
| **`skill-routing.md`** | Koppelt taaktrefwoorden aan de juiste agent. Bevat de Skill-Agent Mapping-tabel, Complex Request Routing-patronen, Inter-Agent Afhankelijkheidsregels, Escalatieregels en Beurtlimietgids. | Gerefereerd door orchestrator en coordinatie-skills |
| **`context-loading.md`** | Definieert welke bronnen geladen worden voor welk taaktype en moeilijkheid. Bevat per-agent taaktype-naar-resource mappingtabellen en conditionele protocollaadtriggers. | Bij workflowstart (Stap 0 / Fase 0) |
| **`prompt-structure.md`** | Definieert de vier elementen die elke taakprompt moet bevatten: Doel, Context, Beperkingen, Klaar Wanneer. Bevat sjablonen voor PM, implementatie en QA-agenten. Lijst anti-patronen (beginnen met alleen een Doel). | Gerefereerd door PM-agent en alle workflows |
| **`clarification-protocol.md`** | Definieert onzekerheidsniveaus (LOW/MEDIUM/HIGH) met acties voor elk. Bevat onzekerheidstriggers, escalatiesjablonen, vereiste verificatie-items per agenttype en subagentmodusgedrag. | Wanneer requirements dubbelzinnig zijn |
| **`context-budget.md`** | Tokenbudgetbeheer. Definieert bestandsleesstrategie (gebruik `find_symbol` niet `read_file`), resource loading-budgetten per modeltier (Flash: ~3.100 tokens / Pro: ~5.000 tokens), grote bestandsafhandeling en symptomen van contextoverflow. | Bij workflowstart |
| **`difficulty-guide.md`** | Criteria voor het classificeren van taken als Eenvoudig/Gemiddeld/Complex. Definieert verwachte beurtaantallen, protocolvertakking (Fast Track / Standaard / Uitgebreid) en herstel bij misinschatting. | Bij taakstart (Stap 0) |
| **`reasoning-templates.md`** | Gestructureerde redeneersjablonen met invulvelden voor veelvoorkomende beslissingspatronen. | Tijdens complexe beslissingen |
| **`quality-principles.md`** | 4 universele kwaliteitsprincipes toegepast over alle agenten. | Bij workflowstart voor kwaliteitsgerichte workflows (ultrawork) |
| **`vendor-detection.md`** | Protocol voor het detecteren van de huidige runtime-omgeving (Claude Code, Codex CLI, Gemini CLI, Antigravity, CLI Fallback). Gebruikt markercontroles: Agent tool = Claude Code, apply_patch = Codex, @-syntaxis = Gemini. | Bij workflowstart |
| **`session-metrics.md`** | Clarification Debt (CD)-scoring en sessiemetrieken bijhouden. Definieert gebeurtenistypen (verduidelijking +10, correctie +25, overdoen +40), drempelwaarden (CD >= 50 = RCA, CD >= 80 = pauze) en integratiepunten. | Tijdens orchestratiesessies |
| **`common-checklist.md`** | Universele kwaliteitschecklist toegepast bij eindverificatie van Complexe taken (naast agentspecifieke checklists). | Verificatiestap van Complexe taken |
| **`lessons-learned.md`** | Repository van eerdere sessieleerpunten, automatisch gegenereerd uit Clarification Debt-overschrijdingen en afgewezen experimenten. Georganiseerd per domeinsectie. | Gerefereerd na fouten en aan sessieeinde |
| **`api-contracts/`** | Directory met API-contractsjabloon en gegenereerde contracten. `template.md` definieert het per-endpoint formaat (methode, pad, request/response schema's, auth, fouten). | Wanneer cross-boundary werk gepland is |

### Runtime Bronnen (`.agents/skills/_shared/runtime/`)

| Resource | Doel |
|----------|------|
| **`memory-protocol.md`** | Geheugenbestandsformaat en -bewerkingen voor CLI-subagenten. Definieert Bij Start, Tijdens Uitvoering en Bij Voltooiing protocollen met configureerbare geheugentools (lezen/schrijven/bewerken). Bevat experimentbijhouding-extensie. |
| **`execution-protocols/claude.md`** | Claude Code-specifieke uitvoeringspatronen. Geinjecteerd door `oma agent:spawn` wanneer leverancier claude is. |
| **`execution-protocols/gemini.md`** | Gemini CLI-specifieke uitvoeringspatronen. |
| **`execution-protocols/codex.md`** | Codex CLI-specifieke uitvoeringspatronen. |
| **`execution-protocols/qwen.md`** | Qwen CLI-specifieke uitvoeringspatronen. |

Leverancierspecifieke uitvoeringsprotocollen worden automatisch geinjecteerd door `oma agent:spawn` — agenten hoeven ze niet handmatig te laden.

### Conditionele Bronnen (`.agents/skills/_shared/conditional/`)

Deze worden alleen geladen wanneer specifieke voorwaarden worden vervuld tijdens uitvoering:

| Resource | Triggerconditie | Geladen Door | Geschatte Tokens |
|----------|-----------------|-------------|-----------------|
| **`quality-score.md`** | VERIFY- of SHIP-fase begint in een workflow die kwaliteitsmeting ondersteunt | Orchestrator (doorgestuurd naar QA-agentprompt) | ~250 |
| **`experiment-ledger.md`** | Eerste experiment geregistreerd na het vaststellen van een IMPL-basislijn | Orchestrator (inline, na basislijnmeting) | ~250 |
| **`exploration-loop.md`** | Dezelfde poort faalt twee keer op hetzelfde probleem | Orchestrator (inline, voor het spawnen van hypothese-agenten) | ~250 |

Budgetimpact: ongeveer 750 tokens totaal als alle 3 worden geladen. Aangezien laden conditioneel is, laden typische sessies 1-2 hiervan. Flash-tier budget blijft binnen de circa 3.100 token-toewijzing.

---

## Hoe Skills Routeren via skill-routing.md

De skill-routeringskaart definieert hoe taken aan agenten worden gekoppeld:

### Eenvoudige Routering (Enkel Domein)

Een prompt met "Bouw een inlogformulier met Tailwind CSS" matcht de trefwoorden `UI`, `component`, `form`, `Tailwind`, en routeert naar **oma-frontend**.

### Complexe Verzoekroutering

Multi-domein verzoeken volgen vastgestelde uitvoeringsvolgorden:

| Verzoekpatroon | Uitvoeringsvolgorde |
|----------------|---------------------|
| "Maak een fullstack-app" | oma-pm -> (oma-backend + oma-frontend) parallel -> oma-qa |
| "Maak een mobiele app" | oma-pm -> (oma-backend + oma-mobile) parallel -> oma-qa |
| "Fix bug en review" | oma-debug -> oma-qa |
| "Ontwerp en bouw een landingspagina" | oma-design -> oma-frontend |
| "Ik heb een idee voor een functie" | oma-brainstorm -> oma-pm -> relevante agenten -> oma-qa |
| "Doe alles automatisch" | oma-orchestrator (intern: oma-pm -> agenten -> oma-qa) |

### Inter-Agent Afhankelijkheidsregels

**Kunnen parallel draaien (geen afhankelijkheden):**
- oma-backend + oma-frontend (wanneer API-contract vooraf gedefinieerd is)
- oma-backend + oma-mobile (wanneer API-contract vooraf gedefinieerd is)
- oma-frontend + oma-mobile (onafhankelijk van elkaar)

**Moeten sequentieel draaien:**
- oma-brainstorm -> oma-pm (ontwerp komt voor planning)
- oma-pm -> alle andere agenten (planning komt eerst)
- implementatie-agent -> oma-qa (review na implementatie)
- oma-backend -> oma-frontend/oma-mobile (wanneer geen vooraf gedefinieerd API-contract)

**QA is altijd laatste**, behalve wanneer de gebruiker review van specifieke bestanden aanvraagt.

---

## Tokenbesparingsberekening

Overweeg een 5-agent orchestratiesessie (pm, backend, frontend, mobile, qa):

**Zonder progressieve onthulling:**
- Elke agent laadt alle bronnen: ~4.000 tokens per agent
- Totaal: 5 x 4.000 = 20.000 tokens verbruikt voordat er werk begint

**Met progressieve onthulling:**
- Alleen Laag 1 voor alle agenten: 5 x 800 = 4.000 tokens
- Laag 2 alleen geladen voor actieve agenten (typisch 1-2 tegelijk): +1.500 tokens
- Totaal: ~5.500 tokens

**Besparing: ongeveer 72-75%**

Op flash-tier modellen (128K context) is dit het verschil tussen 108K tokens beschikbaar voor werk versus 125K tokens — een aanzienlijke marge voor complexe taken.

---

## Resource Loading per Taakmoeilijkheid

De moeilijkheidsgids classificeert taken in drie niveaus, die bepalen hoeveel van Laag 2 wordt geladen:

### Eenvoudig (3-5 beurten verwacht)

Enkele bestandswijziging, duidelijke requirements, herhaling van bestaande patronen.

Laadt: alleen `execution-protocol.md`. Sla analyse over, ga direct naar implementatie met minimale checklist.

### Gemiddeld (8-15 beurten verwacht)

2-3 bestandswijzigingen, enige ontwerpbeslissingen nodig, patronen toepassen op nieuwe domeinen.

Laadt: `execution-protocol.md` + `examples.md`. Standaardprotocol met korte analyse en volledige verificatie.

### Complex (15-25 beurten verwacht)

4+ bestandswijzigingen, architectuurbeslissingen vereist, nieuwe patronen introduceren, afhankelijkheden van andere agenten.

Laadt: `execution-protocol.md` + `examples.md` + `tech-stack.md` + `snippets.md`. Uitgebreid protocol met checkpoints, tussentijdse voortgangsregistratie en volledige verificatie inclusief `common-checklist.md`.

---

## Context-Loading Taakkaarten (Per Agent)

De contextladingsgids biedt gedetailleerde taaktype-naar-resource mappings. Hier zijn de belangrijkste mappings:

### Backend Agent

| Taaktype | Vereiste Bronnen |
|----------|-----------------|
| CRUD API-creatie | stack/snippets.md (route, schema, model, test) |
| Authenticatie | stack/snippets.md (JWT, wachtwoord) + stack/tech-stack.md |
| DB-migratie | stack/snippets.md (migratie) |
| Prestatieoptimalisatie | examples.md (N+1 voorbeeld) |
| Bestaande code aanpassen | examples.md + Serena MCP |

### Frontend Agent

| Taaktype | Vereiste Bronnen |
|----------|-----------------|
| Componentcreatie | snippets.md + component-template.tsx |
| Formulierimplementatie | snippets.md (formulier + Zod) |
| API-integratie | snippets.md (TanStack Query) |
| Styling | tailwind-rules.md |
| Paginalayout | snippets.md (grid) + examples.md |

### Design Agent

| Taaktype | Vereiste Bronnen |
|----------|-----------------|
| Designsysteemcreatie | reference/typography.md + reference/color-and-contrast.md + reference/spatial-design.md + design-md-spec.md |
| Landingspagina-ontwerp | reference/component-patterns.md + reference/motion-design.md + prompt-enhancement.md + examples/landing-page-prompt.md |
| Designaudit | checklist.md + anti-patterns.md |
| Design token-export | design-tokens.md |
| 3D / shader-effecten | reference/shader-and-3d.md + reference/motion-design.md |
| Toegankelijkheidsreview | reference/accessibility.md + checklist.md |

### QA Agent

| Taaktype | Vereiste Bronnen |
|----------|-----------------|
| Beveiligingsreview | checklist.md (Beveiligingssectie) |
| Prestatiereview | checklist.md (Prestatiesectie) |
| Toegankelijkheidsreview | checklist.md (Toegankelijkheidssectie) |
| Volledige audit | checklist.md (volledig) + self-check.md |
| Kwaliteitsscore | quality-score.md (conditioneel) |

---

## Orchestrator Promptsamenstelling

Wanneer de orchestrator prompts samenstelt voor subagenten, bevat deze alleen taakrelevante bronnen:

1. De Kernregels-sectie van de agent SKILL.md
2. `execution-protocol.md`
3. Bronnen die overeenkomen met het specifieke taaktype (uit bovenstaande kaarten)
4. `error-playbook.md` (altijd inbegrepen — herstel is essentieel)
5. Serena Memory Protocol (CLI-modus)

Deze gerichte samenstelling voorkomt het laden van onnodige bronnen, waardoor de beschikbare context van de subagent voor daadwerkelijk werk wordt gemaximaliseerd.
