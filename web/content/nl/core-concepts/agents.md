---
title: Agenten
description: Volledige referentie voor alle 14 oh-my-agent agenten — hun domeinen, tech stacks, bronbestanden, mogelijkheden, charter preflight protocol, tweelaagse skill-loading, scoped uitvoeringsregels, kwaliteitspoorten, werkruimtestrategie, orchestratiestroom en runtimegeheugen.
---

# Agenten

Agenten in oh-my-agent zijn gespecialiseerde engineeringrollen. Elke agent heeft een afgebakend domein, tech-stackkennis, bronbestanden, kwaliteitspoorten en uitvoeringsbeperkingen. Agenten zijn geen generieke chatbots — het zijn afgebakende werkers die binnen hun domein blijven en gestructureerde protocollen volgen.

---

## Agentcategorieen

| Categorie | Agenten | Verantwoordelijkheid |
|-----------|---------|---------------------|
| **Ideevorming** | oma-brainstorm | Ideeen verkennen, benaderingen voorstellen, ontwerpdocumenten produceren |
| **Planning** | oma-pm | Requirementsdecompositie, taakopsplitsing, API-contracten, prioriteitstoewijzing |
| **Implementatie** | oma-frontend, oma-backend, oma-mobile, oma-db | Productiecode schrijven in hun respectievelijke domeinen |
| **Design** | oma-design | Designsystemen, DESIGN.md, tokens, typografie, kleur, beweging, toegankelijkheid |
| **Infrastructuur** | oma-tf-infra | Multi-cloud Terraform-provisioning, IAM, kostenoptimalisatie, policy-as-code |
| **DevOps** | oma-dev-workflow | mise task runner, CI/CD, migraties, releasecoordinatie, monorepo-automatisering |
| **Kwaliteit** | oma-qa | Beveiligingsaudit (OWASP), prestaties, toegankelijkheid (WCAG), codekwaliteitsreview |
| **Debugging** | oma-debug | Bugreproductie, oorzaakanalyse, minimale fixes, regressietests |
| **Lokalisatie** | oma-translator | Contextbewuste vertaling met behoud van toon, register en domein-termen |
| **Coordinatie** | oma-orchestrator, oma-coordination | Geautomatiseerde en handmatige multi-agent orchestratie |
| **Git** | oma-commit | Conventional Commits-generatie, functie-gebaseerde commitsplitsing |

---

## Gedetailleerde Agentreferentie

### oma-brainstorm

**Domein:** Design-first ideevorming voor planning of implementatie.

**Wanneer gebruiken:** Bij het verkennen van een nieuw functie-idee, het begrijpen van gebruikersintentie, het vergelijken van benaderingen. Gebruik voor `/plan` bij complexe of dubbelzinnige verzoeken.

**Wanneer NIET gebruiken:** Duidelijke requirements (ga naar oma-pm), implementatie (ga naar domeinagenten), code review (ga naar oma-qa).

**Kernregels:**
- Geen implementatie of planning voor ontwerpgoedkeuring
- Een verduidelijkende vraag tegelijk (geen batches)
- Altijd 2-3 benaderingen voorstellen met een aanbevolen optie
- Sectie-voor-sectie ontwerp met gebruikersbevestiging bij elke stap
- YAGNI — ontwerp alleen wat nodig is

**Workflow:** 6 fasen: Contextverkenning, Vragen, Benaderingen, Ontwerp, Documentatie (opslaan in `docs/plans/`), Overgang naar `/plan`.

**Bronnen:** Gebruikt alleen gedeelde bronnen (clarification-protocol, reasoning-templates, quality-principles, skill-routing).

---

### oma-pm

**Domein:** Productmanagement — requirementsanalyse, taakdecompositie, API-contracten.

**Wanneer gebruiken:** Bij het opsplitsen van complexe functies, het bepalen van haalbaarheid, het prioriteren van werk, het definieren van API-contracten.

**Kernregels:**
- API-first ontwerp: definieer contracten voor implementatietaken
- Elke taak heeft: agent, titel, acceptatiecriteria, prioriteit, afhankelijkheden
- Minimaliseer afhankelijkheden voor maximale parallelle uitvoering
- Beveiliging en testen zijn onderdeel van elke taak (geen aparte fasen)
- Taken moeten door een enkele agent voltooid kunnen worden
- Lever JSON-plan + task-board.md voor orchestratorcompatibiliteit

**Uitvoer:** `.agents/plan.json`, `.agents/brain/current-plan.md`, geheugen schrijven voor orchestrator.

**Bronnen:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json`, `../_shared/core/api-contracts/`.

**Beurtlimieten:** Standaard 10, maximaal 15.

---

### oma-frontend

**Domein:** Web UI — React, Next.js, TypeScript met FSD-lite architectuur.

**Wanneer gebruiken:** Bij het bouwen van gebruikersinterfaces, componenten, client-side logica, styling, formuliervalidatie, API-integratie.

**Tech stack:**
- React + Next.js (Server Components standaard, Client Components voor interactiviteit)
- TypeScript (strict)
- TailwindCSS v4 + shadcn/ui (alleen-lezen primitieven, uitbreiden via cva/wrappers)
- FSD-lite: root `src/` + feature `src/features/*/` (geen cross-feature imports)

**Bibliotheken:**
| Doel | Bibliotheek |
|------|------------|
| Datums | luxon |
| Styling | TailwindCSS v4 + shadcn/ui |
| Hooks | ahooks |
| Utils | es-toolkit |
| URL State | nuqs |
| Server State | TanStack Query |
| Client State | Jotai (minimaal gebruik) |
| Formulieren | @tanstack/react-form + Zod |
| Auth | better-auth |

**Kernregels:**
- shadcn/ui eerst, uitbreiden via cva, nooit `components/ui/*` direct wijzigen
- Design tokens 1:1 mapping (nooit kleuren hardcoden)
- Proxy boven middleware (Next.js 16+ gebruikt `proxy.ts`, niet `middleware.ts` voor proxy-logica)
- Geen prop drilling voorbij 3 niveaus — gebruik Jotai atoms
- Absolute imports met `@/` verplicht
- FCP-doel < 1s
- Responsive breakpoints: 320px, 768px, 1024px, 1440px

**Bronnen:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `component-template.tsx`, `snippets.md`, `error-playbook.md`, `checklist.md`, `examples/`.

**Kwaliteitspoort checklist:**
- Toegankelijkheid: ARIA-labels, semantische headings, toetsenbordnavigatie
- Mobiel: geverifieerd op mobiele viewports
- Prestaties: geen CLS, snelle lading
- Veerkracht: Error Boundaries en Loading Skeletons
- Tests: logica gedekt door Vitest
- Kwaliteit: typecheck en lint slagen

**Beurtlimieten:** Standaard 20, maximaal 30.

---

### oma-backend

**Domein:** API's, server-side logica, authenticatie, databasebewerkingen.

**Wanneer gebruiken:** REST/GraphQL API's, databasemigraties, auth, server bedrijfslogica, achtergrondtaken.

**Architectuur:** Router (HTTP) -> Service (Bedrijfslogica) -> Repository (Datatoegang) -> Models.

**Stackdetectie:** Leest projectmanifesten (pyproject.toml, package.json, Cargo.toml, go.mod, etc.) om taal en framework te bepalen. Valt terug op `stack/`-directory indien aanwezig, of vraagt gebruiker om `/stack-set` uit te voeren.

**Kernregels:**
- Clean architecture: geen bedrijfslogica in route handlers
- Alle invoer gevalideerd met de validatiebibliotheek van het project
- Alleen geparametriseerde queries (nooit string-interpolatie in SQL)
- JWT + bcrypt voor auth; rate limit auth-endpoints
- Async waar ondersteund; type-annotaties op alle signatures
- Aangepaste excepties via gecentraliseerde foutmodule
- Expliciete ORM-laadstrategie, transactiegrenzen, veilige levenscyclus

**Bronnen:** `execution-protocol.md`, `examples.md`, `orm-reference.md`, `checklist.md`, `error-playbook.md`. Stack-specifieke bronnen in `stack/` (gegenereerd door `/stack-set`): `tech-stack.md`, `snippets.md`, `api-template.*`, `stack.yaml`.

**Beurtlimieten:** Standaard 20, maximaal 30.

---

### oma-mobile

**Domein:** Cross-platform mobiele apps — Flutter, React Native.

**Wanneer gebruiken:** Native mobiele apps (iOS + Android), mobielspecifieke UI-patronen, platformfuncties (camera, GPS, pushmeldingen), offline-first architectuur.

**Architectuur:** Clean Architecture: domain -> data -> presentation.

**Tech stack:** Flutter/Dart, Riverpod/Bloc (state management), Dio met interceptors (API), GoRouter (navigatie), Material Design 3 (Android) + iOS HIG.

**Kernregels:**
- Riverpod/Bloc voor state management (geen rauwe setState voor complexe logica)
- Alle controllers opgeruimd in `dispose()`-methode
- Dio met interceptors voor API-aanroepen; offline sierlijk afhandelen
- 60fps-doel; test op beide platforms

**Bronnen:** `execution-protocol.md`, `tech-stack.md`, `snippets.md`, `screen-template.dart`, `checklist.md`, `error-playbook.md`, `examples.md`.

**Beurtlimieten:** Standaard 20, maximaal 30.

---

### oma-db

**Domein:** Database-architectuur — SQL, NoSQL, vectordatabases.

**Wanneer gebruiken:** Schemaontwerp, ERD, normalisatie, indexering, transacties, capaciteitsplanning, back-upstrategie, migratieontwerp, vector DB/RAG-architectuur, anti-patroon review, compliance-bewust ontwerp (ISO 27001/27002/22301).

**Standaard workflow:** Verkennen (entiteiten, toegangspatronen, volume identificeren) -> Ontwerpen (schema, constraints, transacties) -> Optimaliseren (indexes, partitionering, archivering, anti-patronen).

**Kernregels:**
- Kies eerst model, dan engine
- 3NF standaard voor relationeel; documenteer BASE-afwegingen voor gedistribueerd
- Documenteer alle drie schemalagen: extern, conceptueel, intern
- Integriteit is eersteklas: entiteit, domein, referentieel, bedrijfsregel
- Concurrency is nooit impliciet: definieer transactiegrenzen en isolatieniveaus
- Vector-DB's zijn ophaalinfrastructuur, geen source-of-truth
- Behandel vectorzoekopdrachten nooit als drop-in vervanging voor lexicale zoekopdrachten

**Vereiste deliverables:** Extern schemasamenvatting, conceptueel schema, intern schema, datastandaardentabel, woordenlijst, capaciteitsschatting, back-up/herstelstrategie. Voor vector/RAG: embedding versiebeleid, chunkingbeleid, hybride ophaalstrategie.

**Bronnen:** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-design

**Domein:** Designsystemen, UI/UX, DESIGN.md-beheer.

**Wanneer gebruiken:** Bij het maken van designsystemen, landingspagina's, design tokens, kleurenpaletten, typografie, responsive layouts, toegankelijkheidsreview.

**Workflow:** 7 fasen: Setup (contextgathering) -> Extractie (optioneel, van referentie-URL's) -> Verbetering (vage promptverrijking) -> Voorstel (2-3 ontwerprichtingen) -> Generatie (DESIGN.md + tokens) -> Audit (responsief, WCAG, Nielsen, AI slop-controle) -> Overdracht.

**Anti-patroon handhaving ("geen AI slop"):**
- Typografie: systeemfontstapel standaard; geen standaard Google Fonts zonder rechtvaardiging
- Kleur: geen paars-naar-blauw gradienten, geen gradient-orbs/blobs, geen puur wit op puur zwart
- Layout: geen geneste kaarten, geen desktop-only layouts, geen standaard 3-metriek statistieklayouts
- Beweging: geen bounce easing overal, geen animaties > 800ms, moet prefers-reduced-motion respecteren
- Componenten: geen glassmorphism overal, alle interactieve elementen hebben toetsenbord/touch alternatieven nodig

**Kernregels:**
- Controleer eerst `.design-context.md`; maak aan indien afwezig
- Systeemfontstapel standaard (CJK-klare fonts voor ko/ja/zh)
- WCAG AA minimum voor alle ontwerpen
- Responsive-first (mobiel als standaard)
- Presenteer 2-3 richtingen, krijg bevestiging

**Bronnen:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md`, plus `reference/`-directory (typografie, kleur-en-contrast, spatieel-ontwerp, bewegingsontwerp, responsief-ontwerp, componentpatronen, toegankelijkheid, shader-en-3d) en `examples/` (design-context-voorbeeld, landingspagina-prompt).

---

### oma-tf-infra

**Domein:** Infrastructure-as-code met Terraform, multi-cloud.

**Wanneer gebruiken:** Provisioning op AWS/GCP/Azure/Oracle Cloud, Terraform-configuratie, CI/CD-authenticatie (OIDC), CDN/load balancers/storage/netwerken, statusbeheer, ISO-compliance infrastructuur.

**Clouddetectie:** Leest Terraform-providers en resource-prefixen (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). Bevat een volledige multi-cloud resource mapping-tabel.

**Kernregels:**
- Provider-agnostisch: detecteer cloud uit projectcontext
- Remote state met versiebeheer en vergrendeling
- OIDC-first voor CI/CD auth
- Plan voor apply altijd
- Least privilege IAM
- Tag alles (Environment, Project, Owner, CostCenter)
- Geen secrets in code
- Versiepinning op alle providers en modules
- Geen auto-approve in productie

**Bronnen:** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md`, `examples.md`.

---

### oma-dev-workflow

**Domein:** Monorepo-taakautomatisering en CI/CD.

**Wanneer gebruiken:** Dev-servers draaien, lint/format/typecheck uitvoeren over apps, databasemigraties, API-generatie, i18n-builds, productiebuilds, CI/CD-optimalisatie, pre-commit validatie.

**Kernregels:**
- Gebruik altijd `mise run`-taken in plaats van directe pakketbeheerder-commando's
- Draai lint/test alleen op gewijzigde apps
- Valideer commitberichten met commitlint
- CI moet ongewijzigde apps overslaan
- Gebruik nooit directe pakketbeheerder-commando's wanneer mise-taken bestaan

**Bronnen:** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md`, `troubleshooting.md`.

---

### oma-qa

**Domein:** Kwaliteitsborging — beveiliging, prestaties, toegankelijkheid, codekwaliteit.

**Wanneer gebruiken:** Laatste review voor deployment, beveiligingsaudits, prestatieanalyse, toegankelijkheidscompliance, testdekkingsanalyse.

**Review prioriteitsvolgorde:** Beveiliging > Prestaties > Toegankelijkheid > Codekwaliteit.

**Ernstniveaus:**
- **CRITICAL**: Beveiligingsinbreuk, risico op dataverlies
- **HIGH**: Blokkeert lancering
- **MEDIUM**: Fix deze sprint
- **LOW**: Backlog

**Kernregels:**
- Elke bevinding moet bestand:regel, beschrijving en fix bevatten
- Draai eerst geautomatiseerde tools (npm audit, bandit, lighthouse)
- Geen vals-positieven — elke bevinding moet reproduceerbaar zijn
- Lever remediatiecode, niet alleen beschrijvingen

**Bronnen:** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md`, `examples.md`.

**Beurtlimieten:** Standaard 15, maximaal 20.

---

### oma-debug

**Domein:** Bugdiagnose en -oplossing.

**Wanneer gebruiken:** Door gebruikers gerapporteerde bugs, crashes, prestatieproblemen, intermitterende storingen, race conditions, regressiebugs.

**Methodologie:** Reproduceer eerst, diagnose dan. Raad nooit naar fixes.

**Kernregels:**
- Identificeer de oorzaak, niet alleen symptomen
- Minimale fix: verander alleen wat noodzakelijk is
- Elke fix krijgt een regressietest
- Zoek naar vergelijkbare patronen elders
- Documenteer in `.agents/brain/bugs/`

**Serena MCP-tools gebruikt:**
- `find_symbol("functionName")` — lokaliseer de functie
- `find_referencing_symbols("Component")` — vind alle gebruiken
- `search_for_pattern("error pattern")` — vind vergelijkbare problemen

**Bronnen:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md`, `examples.md`.

**Beurtlimieten:** Standaard 15, maximaal 25.

---

### oma-translator

**Domein:** Contextbewuste meertalige vertaling.

**Wanneer gebruiken:** Bij het vertalen van UI-teksten, documentatie, marketingteksten, het beoordelen van bestaande vertalingen, het maken van woordenlijsten.

**4-stappen methode:** Bron Analyseren (register, intentie, domeintermen, culturele referenties, emotionele connotaties, figuurlijk taalgebruik mapping) -> Betekenis Extraheren (bronstructuur verwijderen) -> Reconstrueren in Doeltaal (natuurlijke woordvolgorde, registermatching, zinssplitsing/samenvoeging) -> Verifieren (natuurlijkheidsrubriek + anti-AI-patrooncontrole).

**Optionele 7-stappen verfijnde modus** voor publicatiekwaliteit: uitgebreid met Kritische Review, Revisie en Polijst-stappen.

**Kernregels:**
- Scan eerst bestaande localebestanden om conventies te matchen
- Vertaal betekenis, niet woorden
- Behoud emotionele connotaties
- Produceer nooit woord-voor-woord vertalingen
- Meng nooit registers binnen een tekst
- Behoud domeinspecifieke terminologie als zodanig

**Bronnen:** `translation-rubric.md`, `anti-ai-patterns.md`.

---

### oma-orchestrator

**Domein:** Geautomatiseerde multi-agent coordinatie via CLI-spawning.

**Wanneer gebruiken:** Complexe functies die meerdere agenten parallel vereisen, geautomatiseerde uitvoering, full-stack implementatie.

**Configuratiestandaarden:**

| Instelling | Standaard | Beschrijving |
|-----------|-----------|-------------|
| MAX_PARALLEL | 3 | Maximaal gelijktijdige subagenten |
| MAX_RETRIES | 2 | Herhaalpogingen per mislukte taak |
| POLL_INTERVAL | 30s | Statuscontrole-interval |
| MAX_TURNS (impl) | 20 | Beurtlimiet voor backend/frontend/mobile |
| MAX_TURNS (review) | 15 | Beurtlimiet voor qa/debug |
| MAX_TURNS (plan) | 10 | Beurtlimiet voor pm |

**Workflowfasen:** Plan -> Setup (sessie-ID, geheugeninitialisatie) -> Uitvoeren (spawn per prioriteitstier) -> Monitoren (poll voortgang) -> Verifieren (geautomatiseerd + cross-review lus) -> Verzamelen (resultaten compileren).

**Agent-naar-agent reviewlus:**
1. Zelf-review: agent controleert eigen diff tegen acceptatiecriteria
2. Geautomatiseerd verifieren: `oma verify {agent-type} --workspace {workspace}`
3. Cross-review: QA-agent reviewt wijzigingen
4. Bij falen: problemen worden teruggekoppeld voor reparatie (maximaal 5 totale lusiteraties)

**Clarification Debt-monitoring:** Houdt gebruikerscorrecties bij tijdens sessies. Gebeurtenissen gescoord als verduidelijking (+10), correctie (+25), overdoen (+40). CD >= 50 triggert verplichte RCA. CD >= 80 pauseert de sessie.

**Bronnen:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-commit

**Domein:** Git-commitgeneratie volgens Conventional Commits.

**Wanneer gebruiken:** Na het voltooien van codewijzigingen, bij het uitvoeren van `/commit`.

**Committypen:** feat, fix, refactor, docs, test, chore, style, perf.

**Workflow:** Wijzigingen analyseren -> Splitsen per functie (als > 5 bestanden die verschillende scopes beslaan) -> Type bepalen -> Scope bepalen -> Beschrijving schrijven (imperatief, < 72 tekens, kleine letters, geen punt aan het einde) -> Commit onmiddellijk uitvoeren.

**Regels:**
- Nooit `git add -A` of `git add .` gebruiken
- Nooit secrets-bestanden committen
- Altijd bestanden specificeren bij staging
- Gebruik HEREDOC voor meerregelige commitberichten
- Co-Author: `First Fluke <our.first.fluke@gmail.com>`

---

## Charter Preflight (CHARTER_CHECK)

Voordat er code wordt geschreven, moet elke implementatie-agent een CHARTER_CHECK-blok uitvoeren:

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {agentdomein}
- Must NOT do: {3 constraints uit taakscope}
- Success criteria: {meetbare criteria}
- Assumptions: {toegepaste standaarden}
```

**Doel:**
- Verklaart wat de agent wel en niet zal doen
- Vangt scope creep op voordat code wordt geschreven
- Maakt aannames expliciet voor gebruikersreview
- Biedt testbare succescriteria

**Verduidelijkingsniveaus:**
- **LOW**: Duidelijke requirements. Ga verder met genoemde aannames.
- **MEDIUM**: Gedeeltelijk dubbelzinnig. Lijst opties, ga verder met de meest waarschijnlijke.
- **HIGH**: Zeer dubbelzinnig. Zet status op geblokkeerd, lijst vragen, schrijf GEEN code.

In subagentmodus (CLI-gespawnd) kunnen agenten gebruikers niet direct vragen. LOW gaat verder, MEDIUM verkleint en interpreteert, HIGH blokkeert en retourneert vragen voor de orchestrator om door te geven.

---

## Tweelaagse Skill Loading

De kennis van elke agent is verdeeld over twee lagen:

**Laag 1 — SKILL.md (~800 bytes):**
Altijd geladen. Bevat frontmatter (naam, beschrijving), wanneer gebruiken / niet gebruiken, kernregels, architectuuroverzicht, bibliothekenlijst en verwijzingen naar Laag 2-bronnen.

**Laag 2 — resources/ (op aanvraag geladen):**
Alleen geladen wanneer de agent actief werkt, en alleen de bronnen die bij het taaktype en de moeilijkheidsgraad passen:

| Moeilijkheid | Geladen Bronnen |
|-------------|----------------|
| **Eenvoudig** | alleen execution-protocol.md |
| **Gemiddeld** | execution-protocol.md + examples.md |
| **Complex** | execution-protocol.md + examples.md + tech-stack.md + snippets.md |

Aanvullende bronnen worden tijdens uitvoering geladen wanneer nodig:
- `checklist.md` — bij de Verificatiestap
- `error-playbook.md` — alleen wanneer fouten optreden
- `common-checklist.md` — voor eindverificatie van Complexe taken

---

## Afgebakende Uitvoering

Agenten opereren binnen strikte domeingrenzen:

- Een frontend-agent wijzigt geen backend-code
- Een backend-agent raakt geen UI-componenten aan
- Een DB-agent implementeert geen API-endpoints
- Agenten documenteren out-of-scope afhankelijkheden voor andere agenten

Wanneer een taak ontdekt wordt die tot een ander domein behoort tijdens uitvoering, documenteert de agent dit in zijn resultaatbestand als escalatie-item, in plaats van het zelf te proberen.

---

## Werkruimtestrategie

Voor multi-agent projecten voorkomen gescheiden werkruimten bestandsconflicten:

```
./apps/api      → backend-agent werkruimte
./apps/web      → frontend-agent werkruimte
./apps/mobile   → mobile-agent werkruimte
```

Werkruimten worden gespecificeerd met de `-w`-vlag bij het spawnen van agenten:

```bash
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Orchestratiestroom

Bij het uitvoeren van een multi-agent workflow (`/orchestrate` of `/work`):

1. **PM Agent** ontleedt het verzoek in domeinspecifieke taken met prioriteiten (P0, P1, P2) en afhankelijkheden
2. **Sessie geinitialiseerd** — sessie-ID gegenereerd, `orchestrator-session.md` en `task-board.md` aangemaakt in geheugen
3. **P0-taken** parallel gespawnd (tot MAX_PARALLEL gelijktijdige agenten)
4. **Voortgang bewaakt** — orchestrator pollt `progress-{agent}.md`-bestanden elke POLL_INTERVAL
5. **P1-taken** gespawnd nadat P0 voltooid is, enzovoort
6. **Verificatielus** draait voor elke voltooide agent (zelf-review -> geautomatiseerd verifieren -> cross-review door QA)
7. **Resultaten verzameld** uit alle `result-{agent}.md`-bestanden
8. **Eindrapport** met sessiesamenvatting, gewijzigde bestanden, resterende problemen

---

## Agentdefinities

Agenten zijn gedefinieerd op twee locaties:

**`.agents/agents/`** — Bevat 7 subagentdefinitiebestanden:
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`

Deze bestanden definieren de identiteit van de agent, uitvoeringsprotocolreferentie, CHARTER_CHECK-sjabloon, architectuursamenvatting en regels. Ze worden gebruikt bij het spawnen van subagenten via de Task/Agent tool (Claude Code) of CLI.

**`.claude/agents/`** — IDE-specifieke subagentdefinities die verwijzen naar de `.agents/agents/`-bestanden via symlinks of directe kopieen voor Claude Code-compatibiliteit.

---

## Runtimestatus (Serena Geheugen)

Tijdens orchestratiesessies coordineren agenten via gedeelde geheugenbestanden in `.serena/memories/` (configureerbaar via `mcp.json`):

| Bestand | Eigenaar | Doel | Anderen |
|---------|----------|------|---------|
| `orchestrator-session.md` | Orchestrator | Sessie-ID, status, starttijd, fasebijhouding | Alleen-lezen |
| `task-board.md` | Orchestrator | Taaktoewijzingen, prioriteiten, statusupdates | Alleen-lezen |
| `progress-{agent}.md` | Die agent | Beurt-voor-beurt voortgang: uitgevoerde acties, gelezen/gewijzigde bestanden, huidige status | Orchestrator leest |
| `result-{agent}.md` | Die agent | Einduitvoer: status (voltooid/mislukt), samenvatting, gewijzigde bestanden, acceptatiecriteria checklist | Orchestrator leest |
| `session-metrics.md` | Orchestrator | Clarification Debt-bijhouding, Quality Score-voortgang | QA leest |
| `experiment-ledger.md` | Orchestrator/QA | Experimentbijhouding wanneer Quality Score actief is | Allen lezen |

Geheugentools zijn configureerbaar. Standaard gebruikt Serena MCP (`read_memory`, `write_memory`, `edit_memory`), maar aangepaste tools kunnen worden geconfigureerd in `mcp.json`:

```json
{
  "memoryConfig": {
    "provider": "serena",
    "basePath": ".serena/memories",
    "tools": {
      "read": "read_memory",
      "write": "write_memory",
      "edit": "edit_memory"
    }
  }
}
```

Dashboards (`oma dashboard` en `oma dashboard:web`) bewaken deze geheugenbestanden voor realtime monitoring.
