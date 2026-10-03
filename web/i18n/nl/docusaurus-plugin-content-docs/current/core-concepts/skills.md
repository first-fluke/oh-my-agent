---
title: Skills
description: Complete gids voor OMA's 33-skill, tweelaagse architectuur, met SKILL.md-routering, on-demand resources, gedeelde en conditionele protocollen, vendoruitvoering, tokenmetingen en routeringsmechanismen.
---

# Skills

Skills zijn gestructureerde kennispakketten die een dispatchrol domeinrichtlijnen geven. Ze bevatten uitvoeringsprotocollen, verwijzingen naar technologiestacks, codesjablonen, error playbooks, kwaliteitschecklists en voorbeelden wanneer de skill die levert. Alles is georganiseerd in een tweelaagse architectuur die is ontworpen voor tokenefficiëntie.

---

## Het tweelaagse ontwerp

### Laag 1: SKILL.md (geladen wanneer de skill wordt gerouteerd)

Elke skill heeft een `SKILL.md` in de root. Het bestand komt in het contextvenster wanneer de skill wordt gerouteerd — de injector-hook geeft een **padverwijzing**, niet de inhoud. Een niet-gerouteerde skill kost daardoor niets bovenop zijn `description`. Het bestand bevat:

- **YAML-frontmatter** met `name` en `description` (voor routering en weergave)
- **When to use / When NOT to use**: expliciete activatievoorwaarden
- **Core rules**: de 5-15 belangrijkste beperkingen voor het domein
- **Architecture overview**: hoe code moet worden gestructureerd
- **Library list**: goedgekeurde dependencies en hun doel
- **References**: verwijzingen naar Laag 2-resources (worden nooit automatisch geladen)

Voorbeeld van frontmatter:

```yaml
---
name: oma-frontend
description: Frontend specialist for React, Next.js, TypeScript with FSD-lite architecture, shadcn/ui, and design system alignment. Use for UI, component, page, layout, CSS, Tailwind, and shadcn work.
---
```

Het veld `description` is belangrijk: het bevat de routeringswoorden waarmee het skill-routersysteem taken aan agenten koppelt.

### Laag 2: resources/ (op aanvraag geladen)

De map `resources/` bevat diepgaande uitvoeringskennis. Deze bestanden worden alleen geladen wanneer:
1. de host of workflow de skill heeft geselecteerd (bijvoorbeeld via een native skillmatch of een expliciet commando);
2. de huidige taak voldoet aan de laadvoorwaarde van de referentie.

Dit laden op aanvraag wordt gestuurd door de context-loading guide (`.agents/skills/_shared/core/context-loading.md`), die entry-instructies onderscheidt van door de taak geselecteerde referenties.

---

## Voorbeeld van bestandsstructuur

```
.agents/skills/oma-frontend/
├── SKILL.md                          ← Layer 1: loaded when routed
└── resources/
    ├── execution-protocol.md         ← Layer 2: step-by-step workflow
    ├── tech-stack.md                 ← Layer 2: detailed technology specs
    ├── angular-rules.md              ← Layer 2: Angular-specific conventions
    ├── snippets.md                   ← Layer 2: copy-paste code patterns
    ├── error-playbook.md             ← Layer 2: error recovery procedures
    └── checklist.md                  ← Layer 2: quality verification checklist

.agents/skills/oma-backend/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── orm-reference.md              ← Domain-specific (ORM queries, N+1, transactions)
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Shipped language seeds / generated references
    ├── node/
    ├── python/
    └── rust/

.agents/skills/oma-mobile/
├── SKILL.md
├── resources/
│   ├── execution-protocol.md
│   ├── tech-stack.md
│   ├── screen-template.dart
│   ├── screen-template.swift         ← Swift native iOS screen template
│   ├── screen-template.tsx            ← React Native screen template
│   ├── checklist.md
│   └── error-playbook.md
└── variants/                          ← Stack schema and generated platform references
    ├── README.md
    └── stack.schema.json

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
└── reference/                         ← Deep reference material
    ├── typography.md
    ├── color-and-contrast.md
    ├── spatial-design.md
    ├── motion-design.md
    ├── responsive-design.md
    ├── component-patterns.md
    ├── accessibility.md
    └── shader-and-3d.md
```

---

## Resourcetypen per skill

| Resourcetype | Bestandsnaam-patroon | Doel | Wanneer geladen |
|--------------|-----------------|---------|-------------|
| **Execution Protocol** | `execution-protocol.md` | Stapsgewijze workflow: Analyze -> Plan -> Implement -> Verify | Geselecteerde bewerking heeft de commando- of contractdetails nodig |
| **Tech Stack** | `tech-stack.md` | Gedetailleerde technologiespecificaties, versies en configuratie | Geselecteerd framework of stackkeuze |
| **Error Playbook** | `error-playbook.md` | Herstelprocedures met escalatie na "3 strikes" | Alleen bij fouten |
| **Checklist** | `checklist.md` | Domeinspecifieke kwaliteitsverificatie | Bij de Verify-stap |
| **Snippets** | `snippets.md` | Direct kopieerbare codepatronen | Onbekende implementatie of outputvorm |
| **Examples** | `examples.md` of `examples/` | Few-shot input/output-voorbeelden voor het LLM | Onbekende implementatie of outputvorm |
| **Variants** | map `variants/` | Taal- of frameworkspecifieke referenties. Backend levert seeds voor `node`, `python` en `rust`; mobile levert een schema en kan gegenereerde platformreferenties krijgen. | Wanneer een passende stack bestaat |
| **Templates** | `component-template.tsx`, `screen-template.dart` | Boilerplate-sjablonen voor bestanden | Bij het maken van een component |
| **Domeinreferentie** | `orm-reference.md`, `anti-patterns.md`, enzovoort | Diepgaande domeinkennis voor specifieke subtaken | Afhankelijk van het taaktype |

---

## Gedeelde resources (_shared/)

Alle agenten delen gemeenschappelijke fundamenten uit `.agents/skills/_shared/`. Die zijn onderverdeeld in drie categorieën:

### Kernresources (`.agents/skills/_shared/core/`)

| Resource | Doel | Wanneer geladen |
|----------|------|-------------|
| **`skill-routing.md`** | Routeert op basis van taakresultaat, eigenaarschap en daadwerkelijke afhankelijkheden; geen verplichte agentketen of beurtquotum. | Door orchestratie- en coördinatieskills geraadpleegd |
| **`context-loading.md`** | Entry van de verantwoordelijke skill, conditionele referenties en laadgrenzen van de runtime. | Bij het samenstellen van context |
| **`prompt-structure.md`** | Geeft richtlijnen voor overdrachten van onbekende taken met doel, context, echte beperkingen en acceptatiebewijs; geen verplicht sjabloon voor directe taken. | Door PM-agent en alle workflows geraadpleegd |
| **`clarification-protocol.md`** | Lost routinedetails op uit de context en vraagt alleen om wezenlijke ontbrekende informatie of toestemming. | Bij ambigue requirements |
| **`context-budget.md`** | Schattingen van bestandsgrootte, daadwerkelijke promptmeting, afgebakende leesacties en checkpoints. | Lange taken of diagnose van contextoverhead |
| **`difficulty-guide.md`** | Kiest planningsdiepte en deliverables op basis van afhankelijkheden en verificatiebehoeften. | Wanneer decompositie een moeilijkheidsinschatting nodig heeft |
| **`quality-principles.md`** | Richtlijnen voor scope, onderhoudbaarheid, bewijs en evenredige verificatie. | Aan het begin van kwaliteitsworkflows (ultrawork) |
| **`vendor-detection.md`** | Detecteert de huidige runtime (Claude Code, Codex CLI, Antigravity, Cursor, Kiro, Qwen en CLI-fallback) via hostmarkers en ingestelde vendorstatus. | Aan het begin van de workflow |
| **`session-metrics.md`** | Optioneel sessiebewijs zonder strafscores voor gesprekken of evaluators. | Gevraagde retrospective of wezenlijke correctie |
| **`common-checklist.md`** | Toepasselijke domeinoverstijgende controles; geen globale limieten op het aantal regels en geen algemene catch-verplichting. | Domeinoverstijgende review wanneer relevant |
| **`lessons-learned.md`** | Op bewijs gebaseerde lessen vastleggen en toepassen, met versie-/triggervoorwaarden; geen automatische RCA-drempel. | Na fouten en aan het einde van een sessie |
| **`api-contracts/`** | Optioneel contractsjabloon. Hergebruik projectschema's; gegenereerde contracten staan buiten de skillbron. | Wanneer werk over grenzen heen wordt gepland |

### Runtimeresources (`.agents/skills/_shared/runtime/`)

| Resource | Doel |
|---------|---------|
| **`memory-protocol.md`** | Formaat en bewerkingen van geheugenbestanden voor CLI-subagenten. Beschrijft On Start, During Execution en On Completion met configureerbare geheugentools (lezen/schrijven/bewerken), plus de extensie voor experimenttracking. |
| **`execution-protocols/claude.md`** | Claude Code-specifieke uitvoeringspatronen. Wordt door `oma agent spawn` geïnjecteerd wanneer de vendor claude is. |
| **`execution-protocols/antigravity.md`** | Uitvoeringspatronen voor de Antigravity CLI (`agy`). |
| **`execution-protocols/codex.md`** | Uitvoeringspatronen voor Codex CLI. |
| **`execution-protocols/commandcode.md`** | Uitvoeringspatronen voor CommandCode. |
| **`execution-protocols/grok.md`** | Uitvoeringspatronen voor Grok. |
| **`execution-protocols/kimi.md`** | Uitvoeringspatronen voor Kimi Code. |
| **`execution-protocols/kiro.md`** | Uitvoeringspatronen voor Kiro. |
| **`execution-protocols/opencode.md`** | Uitvoeringspatronen voor de OpenCode-extensie. |
| **`execution-protocols/pi.md`** | Uitvoeringspatronen voor de pi-extensie. |
| **`execution-protocols/qwen.md`** | Uitvoeringspatronen voor Qwen CLI. |

Vendor-specifieke uitvoeringsprotocollen worden automatisch geïnjecteerd bij CLI-gespawnde agenten via `oma agent spawn`. Native subagenten gebruiken de integratieregels van de geselecteerde vendor.

### Conditionele resources (`.agents/skills/_shared/conditional/`)

Deze worden alleen geladen wanneer tijdens de uitvoering aan specifieke voorwaarden is voldaan:

| Resource | Triggerconditie | Geladen door |
|----------|-----------------|--------------|
| **`quality-score.md`** | Een gedefinieerde baseline of experimentvergelijking is nodig | Orchestrator (geeft door aan QA-agentprompt) |
| **`experiment-ledger.md`** | Het eerste experiment wordt vastgelegd na een IMPL-baseline | Orchestrator (inline, na baselinemeting) |
| **`exploration-loop.md`** | Herhaald herstel mislukt en alternatieven zijn binnen het budget het testen waard | Orchestrator (inline, vóór hypotheses te spawnen) |

Deze resources worden uitgesteld totdat hun afzonderlijke triggers van toepassing zijn. De moeilijkheidsgraad alleen injecteert ze niet.

---

## Hoe skills routeren via skill-routing.md

De skill-routeringskaart bepaalt hoe taken aan agenten worden gekoppeld:

### Eenvoudige routering (één domein)

Een prompt met "Build a login form with Tailwind CSS" matcht de keywords `UI`, `component`, `form`, `Tailwind` en routeert naar **oma-frontend**.

### Complexe verzoekroutering

Verzoeken over meerdere domeinen volgen vaste uitvoeringsvolgordes:

| Verzoekpatroon | Uitvoeringsvolgorde |
|----------------|----------------|
| "Maak een fullstack-app" | oma-pm -> (oma-backend + oma-frontend) parallel -> oma-qa |
| "Maak een mobiele app" | oma-pm -> (oma-backend + oma-mobile) parallel -> oma-qa |
| "Fix bug en review" | oma-debug -> oma-qa |
| "Ontwerp en bouw een landingspagina" | oma-design -> oma-frontend |
| "Ik heb een idee voor een feature" | oma-brainstorm -> oma-pm -> relevante agenten -> oma-qa |
| "Doe alles automatisch" | oma-orchestration (intern: oma-pm -> agenten -> oma-qa) |

### Inter-agentafhankelijkheidsregels

**Kunnen parallel (geen afhankelijkheden):**
- oma-backend + oma-frontend (wanneer het API-contract vooraf is gedefinieerd)
- oma-backend + oma-mobile (wanneer het API-contract vooraf is gedefinieerd)
- oma-frontend + oma-mobile (onafhankelijk van elkaar)

**Moeten sequentieel:**
- oma-brainstorm -> oma-pm (ontwerp vóór planning)
- oma-pm -> alle andere agenten (planning eerst)
- implementatieagent -> oma-qa (review na implementatie)
- oma-backend -> oma-frontend/oma-mobile (wanneer geen vooraf gedefinieerd API-contract bestaat)

**QA komt altijd als laatste**, behalve wanneer de gebruiker alleen een review van specifieke bestanden vraagt.

---

## Tokenbesparingsberekening {#token-savings-math}

Meet voordat je besparingen claimt:

```bash
bun scripts/measure-skill-context.ts
bun scripts/measure-skill-context.ts --skills oma-pm,oma-backend,oma-frontend --json
oma agent context backend --difficulty Simple
```

Het script rapporteert schattingen (UTF-8-bytes / 4) voor scenario's op basis van bestandsgrootte. `routed` is alleen de entry; `simple`, `medium` en `complex` voegen hypothetische protocol-, voorbeeld- en stackbestanden toe ter vergelijking. Hun namen blijven behouden voor scriptcompatibiliteit, niet als instructies om vooraf te laden. `all` is een plafond voor de resourceomvang, geen runtimeconfiguratie. Een verse checkout kan één platformseed als proxy voor de omvang gebruiken; er wordt niet elk platform geladen.

Het contextcommando toont de daadwerkelijke injectie van de taakcontext. Het bevat niet de rest van het gesprek of elke instructie van de host of runtime. Gebruik een samengestelde prompt of gebruikstelemetrie om de totale inputtokens, de latentie en de kosten op een benoemd model te meten. Leid die niet af uit de omvang van de repository of uit aantallen gegenereerde mirrors.

## Resources laden per taak {#resource-loading-by-task}

Elk moeilijkheidsniveau begint met de verantwoordelijke skill. De graaf is een referentie-index; aangrenzende knopen geven geen toestemming om een andere specialist, een error playbook of een conditionele experimentworkflow te laden.

De loader hanteert zachte budgetten van 1.500 / 4.000 / 8.000 geschatte tokens voor Simple / Medium / Complex. Een entry die het budget overschrijdt, blijft behouden en de overschrijding wordt gerapporteerd. Ondersteunende referenties blijven uitgesteld, tenzij ze expliciet worden geselecteerd nadat hun taaktrigger is vastgesteld. Een vereiste entry wordt nooit vervangen door kleinere, niet-gerelateerde documenten.

Verificatie volgt het risico van de taak en de requirements van het project. Een moeilijkheidslabel vereist geen volledige testsuite, geen vast preflightantwoord en geen tweede goedkeuring voor werk waarvoor al toestemming is verleend.

## Context-loading-taakkaarten (per agent)

Dit zijn voorbeelden van referenties om te raadplegen wanneer de taak ze nodig heeft. Gebruik de actuele index van de verantwoordelijke skill en selecteer alleen toepasselijke secties:

### Backend agent

| Taaktype | Vereiste resources |
|-----------|-------------------|
| CRUD-API maken | passende `variants/{node,python,rust}/snippets.md` wanneer aanwezig |
| Authenticatie | passende variant `snippets.md` + `tech-stack.md` wanneer aanwezig |
| DB-migratie | passende variant `snippets.md` wanneer aanwezig |
| Performanceoptimalisatie | `orm-reference.md` en eventuele bijpassende voorbeelden die de skill levert |
| Bestaande code wijzigen | de projectprovider voor code-intelligentie en relevante uitvoeringsresources |

### Frontend agent

| Taaktype | Vereiste resources |
|-----------|-------------------|
| Component maken | `snippets.md` + bestaande componentpatronen van het project |
| Formulierimplementatie | `snippets.md` (formulier + Zod) |
| API-integratie | `snippets.md` (TanStack Query) |
| Styling | `tailwind-rules.md` |
| Paginalayout | `snippets.md` (grid) |

### Design agent

| Taaktype | Vereiste resources |
|-----------|-------------------|
| Designsysteem maken | `reference/typography.md` + `reference/color-and-contrast.md` + `reference/spatial-design.md` + `design-md-spec.md` |
| Landingspagina ontwerpen | `reference/component-patterns.md` + `reference/motion-design.md` + `prompt-enhancement.md` |
| Designaudit | `checklist.md` + `anti-patterns.md` |
| Designtokens exporteren | `design-tokens.md` |
| 3D- en shadereffecten | `reference/shader-and-3d.md` + `reference/motion-design.md` |
| Toegankelijkheidsreview | `reference/accessibility.md` + `checklist.md` |

### QA-agent

| Taaktype | Vereiste resources |
|-----------|-------------------|
| Securityreview | `checklist.md` (sectie Security) |
| Performancereview | `checklist.md` (sectie Performance) |
| Toegankelijkheidsreview | `checklist.md` (sectie Accessibility) |
| Volledige audit | `checklist.md` (volledig) + `self-check.md` |
| Vergelijking van een gedefinieerde metric | `quality-score.md` (conditioneel) |

---

## Promptcompositie door de orchestrator

Wanneer de orchestrator prompts voor subagenten samenstelt, neemt hij alleen taakrelevante resources op:

1. Pad naar het SKILL.md van de verantwoordelijke skill (de CLI-dispatch injecteert de inhoud al)
2. De execution-protocol-sectie van een geselecteerde bewerking, wanneer nodig
3. Resources voor het specifieke taaktype (uit de kaarten hierboven)
4. De relevante error-playbook-sectie, alleen na een waargenomen fout
5. Memory Protocol (CLI-modus)

Deze gerichte samenstelling voorkomt dat onnodige resources worden geladen en laat de subagent zoveel mogelijk context overhouden voor het eigenlijke werk.

---

## Sessiebewijs en retrospectieve review

Sessierecords leggen wezenlijke correcties, scopewijzigingen, herwerk en beslechte reviewbevindingen met bewijs vast. Noodzakelijke verduidelijking wordt niet bestraft. De voormalige gewogen CD- en EA-scores en de door drempels getriggerde RCA-regels zijn verwijderd; het waren promptinstructies, geen door de CLI berekende metrics.

Gebruik waar mogelijk bestaande taakresultaten. Een apart `session-metrics-{sessionId}.md` is optioneel in de geconfigureerde coördinatiestore. Een herhaalde fout of een gevraagde retrospective kan een les rechtvaardigen, maar een gewone mislukte controle of een betwiste bevinding levert niet automatisch een les op. Bewaar historische logboeken; herschrijf ze niet in het nieuwe formaat.

`oma stats` rapporteert productiviteit en samenvattingen van geregistreerd gebruik en geregistreerde kosten. `oma retro` groepeert daadwerkelijke gebeurtenissen rond poorten, blockers en ontbrekende beslissingen tot suggesties. Geen van beide berekent CD- of EA-scores uit deze Markdown-artefacten.

## Taakdecompositie en contextherstel

Plan rond afhankelijkheden en onafhankelijk verifieerbaar gedrag. Vaste sprintaantallen, bestandsaantallen en beurtschattingen bepalen de reviewdiepte of de voltooiing niet. Houd tests en foutafhandeling samen met het gedrag dat ze verifiëren.

Sla bij een waargenomen stilstand of verlies van bruikbare context het afgeronde werk, de resterende criteria, relevante paden en verificatiebewijs op voordat je hervat of opnieuw dispatcht. Behoud bestaand werk en voorkom dat een lopende poging wordt gedupliceerd. Een verhouding tussen beurten en voortgang vereist op zichzelf geen reset.

## Conditionele meting en exploratie

Een gedefinieerde baseline of experimentvergelijking activeert meetrichtlijnen; alleen het hebben van tests of lint doet dat niet. Leg vergelijkbare metrics vast met eenheden, methode, revisie en bewijs. Vereiste controles op correctheid en beveiliging blijven onafhankelijk. OMA heeft geen standaard samengestelde formule, geen poort op basis van lettercijfers en geen rollback die door een score wordt getriggerd.

Een daadwerkelijk experiment legt zijn hypothese, het bewijs voor baseline en kandidaat, de vereiste controles, de beslissing en de eigen bestanden vast. Herhaalde fouten kunnen het testen van een ander mechanisme rechtvaardigen, binnen het bestaande herstelbudget. Isoleer experimentwijzigingen, behoud niet-gerelateerde bewerkingen en verifieer de geïntegreerde kandidaat voordat je de poort hervat.
