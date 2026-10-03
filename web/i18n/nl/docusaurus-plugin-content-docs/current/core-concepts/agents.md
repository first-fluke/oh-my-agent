---
title: Agenten
description: Naslagwerk voor OMA's 33 skillpakketten, 13 canonieke dispatchrollen en 12 ingecheckte subagentdefinities, met hun domeinen, bronnen, charter-preflight, progressief laden, scopes, kwaliteitspoorten, werkruimtestrategie, orchestratie en runtimegeheugen.
---

# Agenten

OMA houdt skillpakketten, dispatchrollen en bestanden met subagentdefinities uit elkaar. Een skill routeert domeinkennis en laadt die; een canonieke rol is de runtime-identiteit die voor dispatch wordt gebruikt; een ingecheckte definitie geeft een subagent een leveranciersspecifieke persona. Deze lagen overlappen bewust. Bepaal aan de hand van de taakgrens en de acceptatiecriteria of één skill volstaat.

De agentdefinities onder `.agents/agents/` zijn de bron van waarheid. OMA projecteert ze naar leveranciersspecifieke bestanden voor runtimes die aangepaste subagenten ondersteunen:

- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.cursor/agents/*`, `.opencode/agents/*` of een andere ondersteunde projectie van de geselecteerde leverancier

Wanneer een workflow een agent aan dezelfde leverancier koppelt als de huidige runtime, gebruikt de workflow eerst het native agentbestand van die runtime. Taken over leveranciers heen vallen terug op `oma agent spawn`.

> **Modeldispatch per agent:** elke agent wordt via `model_preset` (en optionele `agents:`-overschrijvingen) in `.agents/oma-config.yaml` gekoppeld aan een specifieke model-slug, CLI-leverancier en redeneerinspanning. Zie [Per-Agent Models](../guide/per-agent-models.md) voor configuratiedetails en [`oma doctor --profile`](../cli-interfaces/commands.md#doctor) om de actuele matrix te bekijken.

---

## Agentcategorieën

| Categorie | Agenten | Verantwoordelijkheid |
|----------|--------|---------------|
| **Ideevorming** | oma-brainstorm | Ideeën verkennen, benaderingen voorstellen en ontwerpdocumenten maken |
| **Architectuur** | oma-architecture | Grenzen van systemen/modules/services, analyses in ADR/ATAM/CBAM-stijl en afwegingsrecords |
| **Planning** | oma-pm | Requirements opsplitsen, taken verdelen, API-contracten en prioriteiten vastleggen |
| **Implementatie** | oma-frontend, oma-backend, oma-mobile, oma-db | Code schrijven binnen hun eigen domein |
| **Design** | oma-design | Designsystemen, DESIGN.md, tokens, typografie, kleur, beweging en toegankelijkheid |
| **Infrastructuur** | oma-tf-infra | Multi-cloud Terraform-provisioning, IAM, kostenoptimalisatie en policy-as-code |
| **DevOps** | oma-dev-workflow | mise task runner, CI/CD, migraties, releasecoördinatie en monorepo-automatisering |
| **Observability** | oma-observability | Observability-pipelines, traceerbaarheidsrouting, MELT+P-signalen (metrics/logs/traces/profiles/cost/audit/privacy), SLO-beheer, incidentforensiek en transporttuning |
| **Kwaliteit** | oma-qa | Beveiligingsaudit (OWASP), prestaties, toegankelijkheid (WCAG) en codekwaliteitsreview |
| **Debugging** | oma-debug | Bugs reproduceren, oorzaken analyseren, minimale fixes en regressietests |
| **Lokalisatie** | oma-translation | Contextbewuste vertaling met behoud van toon, register en domeintermen |
| **Coördinatie** | oma-orchestration, oma-coordination | Geautomatiseerde en handmatige multi-agentorchestratie |
| **Git** | oma-scm | Conventional Commits genereren en commits per functie opsplitsen |
| **Zoeken en ophalen** | oma-search | Intentgebaseerde zoekrouter met trust scoring (Context7-documentatie, web, `gh`/`glab`-code en lokale code-intelligentie) |
| **Retrospectief** | oma-recap | Conversatiegeschiedenis over tools heen analyseren en thematische werksamenvattingen maken |
| **Documentverwerking** | oma-hwp, oma-pdf | HWP/HWPX/HWPML en PDF naar Markdown converteren voor LLM/RAG-inname |
| **Documentatie** | oma-docs | Documentatiedrift detecteren (kapotte verwijzingen verifiëren en sync-patches voorstellen voor diff-getroffen docs) |
| **Uitleg** | oma-explanation | Offline interactieve HTML-uitleg voor diffs, branches, PR's of commitreeksen |
| **Academisch schrijven** | oma-academic-writing, oma-scholar | Publicatieklare academische tekst opstellen/controleren en Knows-sidecars voor onderzoek, zoeken en peerreview |
| **Beveiliging** | oma-deepsec | Vercels agentgestuurde deepsec-scanner kostenbewust aansturen (scannen, PR-gates, matchers en triage) |
| **Refactoring** | oma-refactor | Gedragsbehoudende, stapsgewijze herstructurering met hotspotselectie en karakteriseringstests |
| **Marktonderzoek** | oma-market | Communitysignalen onderzoeken naar pijnpunten, trends, concurrenten en discovery met SWOT/Porter's 5F/PESTEL |
| **Skill-auteurschap** | oma-skill-creation | OMA-skills maken en valideren in SSL-lite-formaat |
| **Mediageneratie** | oma-image, oma-slide, oma-video, oma-voice | AI-afbeeldingen, HTML-presentaties, korte/uitleg/demo-video's en lokale TTS/STT |

---

## Gedetailleerde agentreferentie

### oma-brainstorm

**Domein:** Design-first ideevorming vóór planning of implementatie.

**Wanneer gebruiken:** Een nieuw feature-idee verkennen, gebruikersintentie begrijpen of benaderingen vergelijken. Gebruik deze agent vóór `/plan` bij complexe of ambigue verzoeken.

**Wanneer NIET gebruiken:** Duidelijke requirements (ga naar oma-pm), implementatie (ga naar domeinagenten), code review (ga naar oma-qa).

**Kernregels:**
- Geen implementatie of planning vóór goedkeuring van het ontwerp
- Eén verduidelijkende vraag per keer (geen batches)
- Altijd 2-3 benaderingen voorstellen met één aanbevolen optie
- Het ontwerp sectie voor sectie uitwerken, met bevestiging van de gebruiker bij elke stap
- YAGNI: ontwerp alleen wat nodig is

**Workflow:** 6 fasen: context verkennen, vragen, benaderingen, ontwerp, documentatie (opslaan in `docs/plans/`) en overgang naar `/plan`.

**Bronnen:** Gebruikt alleen gedeelde bronnen (clarification-protocol, quality-principles, skill-routing).

---

### oma-architecture

**Domein:** Software- en systeemarchitectuur, waaronder grenzen van modules en services, afwegingsanalyse, synthese van stakeholders en beslissingsrecords.

**Wanneer gebruiken:** Systeemarchitectuur kiezen of beoordelen, grenzen van modules/services/eigenaarschap bepalen, architectuuropties met expliciete afwegingen vergelijken, architectuurpijn onderzoeken (change amplification, verborgen afhankelijkheden, onhandige API's), architectuurinvesteringen of refactorings prioriteren en architectuuraanbevelingen of ADR's schrijven.

**Wanneer NIET gebruiken:** Visuele/designsystemen (gebruik oma-design), featureplanning en taakdecompositie (gebruik oma-pm), Terraform-implementatie (gebruik oma-tf-infra), bugdiagnose (gebruik oma-debug) of beveiligings-, prestatie- en toegankelijkheidsreview (gebruik oma-qa).

**Methodologieën:** Diagnostische routering, design-twice-vergelijking, risicoanalyse in ATAM-stijl, prioritering in CBAM-stijl en beslissingsrecords in ADR-stijl.

**Kernregels:**
- Diagnoseer eerst het architectuurprobleem en kies daarna een methode
- Gebruik de lichtste methode die voor de huidige beslissing volstaat
- Houd architectuurontwerp, UI/visueel ontwerp en Terraform-delivery uit elkaar
- Raadpleeg stakeholderagents alleen wanneer de beslissing voldoende transversaal is om die kosten te rechtvaardigen
- De kwaliteit van de aanbeveling is belangrijker dan consensus als toneelstuk: raadpleeg breed en beslis expliciet
- Elke aanbeveling vermeldt aannames, afwegingen, risico's en validatiestappen
- Wees standaard kostenbewust: let op implementatiekosten, operationele kosten, teamcomplexiteit en toekomstige wijzigingskosten

**Bronnen:** `SKILL.md` en de map `resources/` met methodologiegidsen (diagnostic-routing, design-twice, ATAM, CBAM en ADR-sjablonen).

---

### oma-pm

**Domein:** Productmanagement, waaronder requirementsanalyse, taakdecompositie en API-contracten.

**Wanneer gebruiken:** Complexe features opsplitsen, haalbaarheid bepalen, werk prioriteren en API-contracten definiëren.

**Kernregels:**
- API-first ontwerp: definieer contracten vóór implementatietaken
- Elke taak heeft een agent, titel, acceptatiecriteria, prioriteit en afhankelijkheden
- Minimaliseer afhankelijkheden voor maximale parallelle uitvoering
- Beveiliging en testen horen bij elke taak; het zijn geen aparte fasen
- Taken moeten door één agent te voltooien zijn
- Lever het JSON-plan plus een sessiegebonden task board voor orchestratorcompatibiliteit

**Uitvoer:** `.agents/results/plan-{sessionId}.json`, `.agents/results/result-pm.md` en een geheugenbericht voor de orchestrator.

**Bronnen:** `execution-protocol.md`, `examples.md`, `iso-planning.md`, `task-template.json` en `../_shared/core/api-contracts/template.md` (contracten staan in `.agents/results/api-contracts/`).

---

### oma-frontend

**Domein:** Web-UI met React, Next.js en TypeScript volgens FSD-lite.

**Wanneer gebruiken:** Gebruikersinterfaces, componenten, clientlogica, styling, formuliervalidatie en API-integratie bouwen.

**Technologiestack:**
- React + Next.js (Server Components standaard, Client Components voor interactiviteit)
- TypeScript (strict)
- TailwindCSS v4 + shadcn/ui (alleen-lezenprimitieven, uitbreiden via cva/wrappers)
- FSD-lite: root `src/` + feature `src/features/*/` (geen cross-feature imports)

**Bibliotheken:**
| Doel | Bibliotheek |
|---------|---------|
| Datums | luxon |
| Styling | TailwindCSS v4 + shadcn/ui |
| Hooks | ahooks of @mantine/hooks |
| Utils | es-toolkit |
| URL State | nuqs |
| Server State | TanStack Query (orval-gegenereerde hooks wanneer een OpenAPI-spec bestaat) |
| Client State | Jotai (minimaal gebruiken) |
| Formulieren | @tanstack/react-form + Zod |
| Auth | better-auth |

**Kernregels:**
- shadcn/ui eerst, uitbreiden via cva; wijzig `components/ui/*` nooit rechtstreeks
- Design tokens 1:1 mappen; hardcode nooit kleuren
- Proxy boven middleware (Next.js 16+ gebruikt `proxy.ts`, niet `middleware.ts`, voor proxylogica)
- Geen prop drilling voorbij 3 niveaus; gebruik Jotai-atoms
- Absolute imports met `@/` zijn verplicht
- FCP-doel < 1s
- Responsive breakpoints: 320px, 768px, 1024px, 1440px

**Bronnen:** `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `snippets.md`, `angular-rules.md`, `error-playbook.md` en `checklist.md`.

**Checklist voor de kwaliteitspoort:**
- Toegankelijkheid: ARIA-labels, semantische headings en toetsenbordnavigatie
- Mobiel: geverifieerd op mobiele viewports
- Prestaties: geen CLS en snelle laadtijd
- Veerkracht: Error Boundaries en Loading Skeletons
- Tests: logica gedekt door Vitest
- Kwaliteit: typecheck en lint slagen

---

### oma-backend

**Domein:** API's, serverlogica, authenticatie en databasebewerkingen.

**Wanneer gebruiken:** REST/GraphQL-API's, databasemigraties, auth, serverbedrijfslogica en achtergrondtaken.

**Architectuur:** Router (HTTP) -> Service (bedrijfslogica) -> Repository (datatoegang) -> Models.

**Stackdetectie:** Leest projectmanifesten (pyproject.toml, package.json, Cargo.toml, go.mod enzovoort) om taal en framework te bepalen. Als projectspecifieke conventies ontbreken, vraagt de agent om `/stack-set` uit te voeren; die opdracht materialiseert de opgeloste `stack/`-referenties uit de meegeleverde schema's en sjablonen.

**Kernregels:**
- Clean architecture: geen bedrijfslogica in route handlers
- Valideer alle invoer met de validatiebibliotheek van het project
- Gebruik alleen geparametriseerde queries; interpoleer nooit strings in SQL
- JWT + Argon2id voor auth (bcrypt is toegestaan voor legacycompatibiliteit); rate-limit auth-endpoints
- Gebruik async waar dat wordt ondersteund en type-annotaties op alle signatures
- Gebruik custom exceptions via een gecentraliseerde foutmodule
- Definieer expliciete ORM-laadstrategie, transactiegrenzen en een veilige levenscyclus

**Bronnen:** `execution-protocol.md`, `orm-reference.md`, `checklist.md` en `error-playbook.md`. `variants/stack.schema.json` definieert de vorm van het stackmanifest.

<!-- oma-docs:ignore-start -->
Projectspecifieke `stack/stack.yaml`, `stack/tech-stack.md`, snippets en API-sjablonen worden indien nodig gegenereerd door `/stack-set`; ze bestaan nog niet voordat de stack is gematerialiseerd.
<!-- oma-docs:ignore-end -->

---

### oma-mobile

**Domein:** Cross-platform en native mobiele apps (Flutter, React Native en native Swift iOS).

**Wanneer gebruiken:** Native mobiele apps (iOS + Android), mobielspecifieke UI-patronen, platformfuncties (camera, GPS, pushmeldingen), offline-first architectuur en native Swift iOS-apps met SwiftUI en `swift-openapi-generator`.

**Architectuur:** Clean Architecture: domain -> data -> presentation. Voor Swift iOS: de projectindeling `App/Core/Features/Shared`.

**Technologiestacks:**
- Flutter/Dart: Riverpod/Bloc (state management), Dio met interceptors (API), GoRouter (navigatie), Material Design 3 (Android) + iOS HIG.
- Native Swift iOS (iOS 17+): SwiftUI + `@Observable` (Observation-framework), Apple's `swift-openapi-generator` voor API-clients en indeling `App/Core/Features/Shared`.

**Kernregels:**
- Gebruik Riverpod/Bloc voor state management (geen kale setState voor complexe logica)
- Ruim alle controllers op in de methode `dispose()`
- Gebruik Dio met interceptors voor API-aanroepen en handel offline situaties netjes af
- Streef naar 60fps en test op beide platforms
- Swift: gebruik `@Observable` boven `ObservableObject` op iOS 17+; genereer API-clients uit OpenAPI-specs via `swift-openapi-generator`

**Bronnen:** `execution-protocol.md`, `tech-stack.md`, `screen-template.dart`, `screen-template.swift`, `screen-template.tsx`, `checklist.md` en `error-playbook.md`. De map `variants/` bevat het stackschema en gegenereerde platformreferenties zodra `/stack-set` ze materialiseert.

---

### oma-db

**Domein:** Databasearchitectuur voor SQL-, NoSQL- en vectordatabases.

**Wanneer gebruiken:** Schemadesign, ERD's, normalisatie, indexering, transacties, capaciteitsplanning, back-upstrategie, migratieontwerp, vector-DB/RAG-architectuur, antipatronenreview en compliancebewust ontwerp (ISO 27001/27002/22301).

**Standaardworkflow:** Verkennen (entiteiten, toegangspatronen en volume bepalen) -> Ontwerpen (schema, constraints en transacties) -> Optimaliseren (indexen, partitionering, archivering en antipatronen).

**Kernregels:**
- Kies eerst het model en daarna de engine
- 3NF is de standaard voor relationele databases; documenteer BASE-afwegingen voor gedistribueerde systemen
- Documenteer alle drie schemalagen: extern, conceptueel en intern
- Integriteit staat centraal: entiteit, domein, referentieel en bedrijfsregel
- Concurrency is nooit impliciet: definieer transactiegrenzen en isolatieniveaus
- Vector-DB's zijn retrievalinfrastructuur, geen source of truth
- Behandel vector search nooit als directe vervanging voor lexicaal zoeken

**Vereiste deliverables:** Een samenvatting van het externe schema, conceptueel schema, intern schema, tabel met datastandaarden, woordenlijst, capaciteitsraming en back-up-/herstelstrategie. Voor vector/RAG: beleid voor embeddingversies en chunking plus een hybride retrievalstrategie.

**Bronnen:** `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md`, `error-playbook.md` en `examples.md`.

---

### oma-design

**Domein:** Designsystemen, UI/UX en beheer van DESIGN.md.

**Wanneer gebruiken:** Designsysteem, landingspagina, designtokens, kleurenpalet, typografie, responsive layout of toegankelijkheidsreview maken.

**Workflow:** 7 fasen: Setup (context verzamelen) -> Extract (optioneel, uit referentie-URL's) -> Enhance (vage prompt verrijken) -> Propose (2-3 ontwerprichtingen) -> Generate (DESIGN.md + tokens) -> Audit (responsive, WCAG, Nielsen, AI-slopcontrole) -> Handoff.

**Antipatroonhandhaving ("geen AI-slop"):**
- Typografie: standaard een systeemfontstack; geen standaard Google Fonts zonder onderbouwing
- Kleur: geen paars-naar-blauwe gradients, gradient-orbs of blobs, en geen puur wit op puur zwart
- Layout: geen geneste kaarten, desktop-only layouts of generieke statistieklayouts met drie metrieken
- Beweging: overal bounce easing gebruiken mag niet, animaties duren maximaal 800ms en moeten `prefers-reduced-motion` respecteren
- Componenten: geen glassmorphism overal; elk interactief element heeft een toetsenbord- en touchalternatief

**Kernregels:**
- Controleer eerst `.design-context.md` en maak die aan als hij ontbreekt
- Gebruik standaard een systeemfontstack (CJK-klare fonts voor ko/ja/zh)
- Hanteer minimaal WCAG AA voor elk ontwerp
- Werk responsive-first, met mobiel als uitgangspunt
- Presenteer 2-3 richtingen en vraag om bevestiging

**Bronnen:** `execution-protocol.md`, `anti-patterns.md`, `checklist.md`, `design-md-spec.md`, `design-tokens.md`, `prompt-enhancement.md`, `stitch-integration.md`, `error-playbook.md` en de map `reference/` (typografie, kleur en contrast, ruimtelijk ontwerp, bewegingsontwerp, responsive design, componentpatronen, toegankelijkheid en shaders/3D).

---

### oma-tf-infra

**Domein:** Infrastructure-as-code met Terraform voor meerdere clouds.

**Wanneer gebruiken:** Provisioning op AWS/GCP/Azure/Oracle Cloud, Terraformconfiguratie, CI/CD-authenticatie (OIDC), CDN/load balancers/storage/netwerken, statebeheer en ISO-compliance-infrastructuur.

**Clouddetectie:** Leest Terraformproviders en resourceprefixen (`google_*` = GCP, `aws_*` = AWS, `azurerm_*` = Azure, `oci_*` = Oracle Cloud). Bevat een volledige mappingtabel voor multi-cloudresources.

**Kernregels:**
- Provideragnostisch: detecteer de cloud uit de projectcontext
- Gebruik remote state met versioning en locking
- Gebruik OIDC eerst voor CI/CD-auth
- Plan altijd vóór apply
- Hanteer least privilege voor IAM
- Tag alles (Environment, Project, Owner, CostCenter)
- Zet geen secrets in code
- Pin versies van alle providers en modules
- Gebruik geen auto-approve in productie

**Bronnen:** `execution-protocol.md`, `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md`, `checklist.md`, `error-playbook.md` en `examples.md`.

---

### oma-dev-workflow

**Domein:** Taakautomatisering en CI/CD voor monorepo's.

**Wanneer gebruiken:** Devservers draaien, lint/format/typecheck uitvoeren over apps, databasemigraties, API-generatie, i18n-builds, productiebuilds, CI/CD-optimalisatie en pre-commitvalidatie.

**Kernregels:**
- Gebruik altijd `mise run`-taken in plaats van directe package-managercommando's
- Draai lint/test alleen voor gewijzigde apps
- Valideer commitberichten met commitlint
- Laat CI ongewijzigde apps overslaan
- Gebruik nooit directe package-managercommando's wanneer er mise-taken bestaan

**Bronnen:** `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md` en `troubleshooting.md`.

---

### oma-observability

**Domein:** Intentgebaseerde observability- en traceerbaarheidsroutering over lagen, grenzen en signalen.

**Wanneer gebruiken:** Observability-pipelines opzetten (OTel SDK + Collector + vendorbackend), traceerbaarheid over service- en domeingrenzen heen (W3C-propagators, baggage, multi-tenant, multi-cloud), transporttuning (UDP/MTU-drempels, OTLP gRPC vs HTTP, Collector DaemonSet vs sidecartopologie, samplingrecepten), incidentforensiek (lokalisatie langs 6 dimensies: code / service / layer / host / region / infra), vendorcategorie kiezen (OSS full-stack vs commerciële SaaS vs high-cardinality specialist vs profiling specialist), observability-as-code (Grafana Jsonnet-dashboards, PrometheusRule CRD, OpenSLO YAML, SLO burn-rate-alerts), meta-observability (pipeline-zelfgezondheid, clock skew, cardinality-guardrails, retentiematrix), MELT+P-signaaldekking (metrics, logs, traces, profiles, cost, audit, privacy) en migreren van verouderde tools (Fluentd -> Fluent Bit of OTel Collector).

**Wanneer NIET gebruiken:** LLM ops/gen_ai-observability (gebruik Langfuse, Arize Phoenix, LangSmith, Braintrust), data-pipeline-lineage (OpenLineage + Marquez, dbt test, Airflow lineage), IoT-/fysieke datacentertelemetrie (Nlyte, Sunbird, Device42), orkestratie van chaos engineering (Chaos Mesh, Litmus, Gremlin, ChaosToolkit), GPU-/TPU-infrastructuur (NVIDIA DCGM Exporter), software supply chain (sigstore, in-toto, SLSA), incidentresponsworkflow/paging (PagerDuty, OpsGenie, Grafana OnCall) of een single-vendor setup die al door de eigen skill van die vendor wordt gedekt.

**Kernregels:**
- Classificeer de intent vóór routering: setup | migrate | investigate | alert | trace | tune | route
- Kies eerst de categorie, niet het vendorregister: delegeer via `resources/vendor-categories.md` naar vendor-eigen skills en dupliceer geen vendordocumentatie
- Transporttuning is het onderscheidende onderdeel: UDP/MTU-drempels, OTLP-protocolkeuze, Collectortopologie en samplingrecepten worden elders niet diep behandeld
- Meta-observability is niet onderhandelbaar: valideer pipeline-zelfgezondheid, kloksynchronisatie (< 100 ms drift), cardinality en retentie vóór je een setup voltooid noemt
- Geef de voorkeur aan CNCF: Prometheus, Jaeger, Thanos, Fluent Bit, OpenTelemetry, Cortex, OpenCost, OpenFeature, Flagger, Falco
- Fluentd is deprecated (CNCF 2025-10): adviseer Fluent Bit of OTel Collector voor nieuwe projecten en migraties
- Gebruik W3C Trace Context als standaardpropagator; vertaal per cloud (AWS X-Ray `X-Amzn-Trace-Id`, GCP Cloud Trace, Datadog, Cloudflare, Linkerd)
- Privacy vóór features: pas PII-redactie, samplingbewuste baggage-regels en onveranderlijke SOC2/ISO-audit plus GDPR/PIPA-wissing toe bij collectie, niet alleen bij opslag

**Bronnen:** `SKILL.md`, `resources/execution-protocol.md`, `resources/intent-rules.md`, `resources/vendor-categories.md`, `resources/matrix.md`, `resources/checklist.md`, `resources/anti-patterns.md`, `resources/examples.md`, `resources/meta-observability.md`, `resources/observability-as-code.md`, `resources/incident-forensics.md`, `resources/standards.md`, plus diepere bronnen onder `resources/layers/` (L3-network, L4-transport, L7-application, mesh), `resources/signals/` (metrics, logs, traces, profiles, cost, audit, privacy), `resources/transport/` (collector-topology, otlp-grpc-vs-http, sampling-recipes, udp-statsd-mtu) en `resources/boundaries/` (cross-application, multi-tenant, release, slo).

---

### oma-qa

**Domein:** Kwaliteitsborging voor beveiliging, prestaties, toegankelijkheid en codekwaliteit.

**Wanneer gebruiken:** Eindreview vóór deployment, beveiligingsaudits, prestatieanalyse, toegankelijkheidscompliance en analyse van testdekking.

**Reviewprioriteit:** Beveiliging > Prestaties > Toegankelijkheid > Codekwaliteit.

**Ernstniveaus:**
- **CRITICAL**: beveiligingsinbreuk of risico op dataverlies
- **HIGH**: blokkeert de release
- **MEDIUM**: in deze sprint oplossen
- **LOW**: backlog

**Kernregels:**
- Elke bevinding bevat bestand:regel, beschrijving en fix
- Draai eerst geautomatiseerde tools (npm audit, bandit, lighthouse)
- Geen false positives; elke bevinding moet reproduceerbaar zijn
- Lever remediatiecode, niet alleen een beschrijving

**Bronnen:** `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md`, `error-playbook.md` en `examples.md`.

---

### oma-debug

**Domein:** Bugs diagnosticeren en oplossen.

**Wanneer gebruiken:** Bugs die gebruikers melden, crashes, prestatieproblemen, intermitterende fouten, race conditions en regressiebugs.

**Methodologie:** Reproduceer eerst en diagnoseer daarna. Raad nooit naar fixes.

**Kernregels:**
- Zoek de grondoorzaak, niet alleen de symptomen
- Minimale fix: verander alleen wat nodig is
- Elke fix krijgt een regressietest
- Zoek elders naar vergelijkbare patronen
- Documenteer in `.agents/results/`

**Code-intelligentie (Gortex of Serena):**
- `find_symbol("functionName")` of symbolnavigatie in Gortex: lokaliseer de functie
- `find_referencing_symbols("Component")` of impactanalyse in Gortex: vind alle gebruiken
- `search_for_pattern("error pattern")` of zoeken in Gortex: vind vergelijkbare problemen

**Bronnen:** `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md`, `error-playbook.md` en `examples.md`.

---

### oma-translation

**Domein:** Contextbewuste meertalige vertaling.

**Wanneer gebruiken:** UI-teksten, documentatie en marketingteksten vertalen, bestaande vertalingen reviewen of woordenlijsten maken.

**Zes scènes:** Prepare, Acquire, Reason, Act, Verify en Finalize. De vertaalmethode heeft vier stappen: betekenis en beschermde syntax lezen, register kiezen, reconstrueren in de doeltaal en de auteursstijl behouden waar die past.

**Kernregels:**
- Scan eerst bestaande locale-bestanden om conventies te volgen
- Vertaal betekenis, geen woorden
- Behoud emotionele connotaties
- Lever nooit een woord-voor-woordvertaling
- Meng geen registers binnen één tekst
- Behoud domeinspecifieke terminologie onvertaald

**Bronnen:** `translation-rubric.md`, `anti-ai-patterns.md` (beide taalneutraal) en een profiel per doeltaal onder `resources/lang/` (`ko`, `ja`, `zh`, `en`; gebruik `_template.md` om een profiel toe te voegen).

---

### oma-orchestration

**Domein:** Geautomatiseerde multi-agentcoördinatie via CLI-spawning.

**Wanneer gebruiken:** Complexe features waarvoor meerdere agenten parallel nodig zijn, geautomatiseerde uitvoering en full-stackimplementatie.

**Configuratiestandaarden:**

| Instelling | Standaard | Beschrijving |
|---------|---------|-------------|
| MAX_PARALLEL | 3 | Maximum aantal gelijktijdige subagenten |
| MAX_RETRIES | 2 | Aantal herhaalpogingen per mislukte taak |
| POLL_INTERVAL | 30s | Interval voor statuscontroles |

**Workflowfasen:** Plan -> Setup (sessie-ID en geheugeninitialisatie) -> Execute (spawnen per prioriteitstier) -> Monitor (voortgang pollen) -> Verify (geautomatiseerde + cross-reviewlus) -> Collect (resultaten verzamelen).

**Reviewlus tussen agenten:**
1. Zelfreview: de agent vergelijkt zijn diff met de acceptatiecriteria
2. Geautomatiseerde verificatie: `oma verify agent {agent-type} --workspace {workspace}`
3. Cross-review: een QA-agent reviewt de wijzigingen
4. Bij falen: problemen gaan terug naar de verantwoordelijke agent (maximaal 5 totale lusiteraties)

**Sessie-evidence:** Legt waar nuttig wezenlijke correcties en beoordeelde reviewbevindingen vast, met oorzaak, impact en verificatie. Er geldt geen strafscore en geen door een score geactiveerde pauze.

**Bronnen:** `subagent-prompt-template.md`, `memory-schema.md`.

---

### oma-scm

**Domein:** Software configuration management (SCM) en Git: branches, merges, conflicten, worktrees, baselines, auditgereedheid en Conventional Commits.

**Wanneer gebruiken:** Na codewijzigingen (`/scm`), bij mergeconflicten, branchstrategie, releases/tags of een SCM-vraag in de repository.

**Committypen:** feat, fix, refactor, docs, test, chore, style, perf.

**Workflow (commits):** Wijzigingen analyseren -> per feature splitsen waar nodig -> type bepalen -> scope bepalen -> beschrijving schrijven (imperatief, korter dan 72 tekens, kleine letters, geen punt aan het einde) -> committen met expliciete paden.

**Regels:**
- Gebruik nooit `git add -A` of `git add .`
- Commit nooit secret-bestanden
- Specificeer altijd bestanden bij staging
- Gebruik HEREDOC voor meerregelige commitberichten
- Voeg co-author-trailers alleen toe wanneer de effectieve `scm.co_author`-configuratie ze inschakelt en naam en e-mail levert

---

### oma-coordination

**Domein:** Handleiding voor handmatige, stapsgewijze multi-agentcoördinatie.

**Wanneer gebruiken:** Complexe projecten waarin je bij elke poort human-in-the-loop-controle wilt, voor handmatig agenten spawnen en voor stapsgewijze coördinatierecepten.

**Wanneer NIET gebruiken:** Volledig geautomatiseerde parallelle uitvoering (gebruik oma-orchestration) of taken binnen één domein (gebruik de domeinagent direct).

**Kernregels:**
- Presenteer altijd eerst het plan voor gebruikersbevestiging voordat je agenten spawnt
- Werk één prioriteitstier tegelijk af en wacht vóór de volgende tier
- De gebruiker keurt elke poortovergang goed
- QA-review is verplicht vóór samenvoegen
- Gebruik een remediatielus voor CRITICAL/HIGH-bevindingen

**Workflow:** PM plant -> gebruiker bevestigt -> spawnen per prioriteitstier -> monitoren -> QA-review -> problemen oplossen -> opleveren.

**Verschil met oma-orchestration:** Coordination is handmatig en begeleid (de gebruiker bepaalt het tempo); orchestrator is geautomatiseerd (agenten worden met minimale gebruikersinterventie gespawnd en uitgevoerd).

---

### oma-search

**Domein:** Intentgebaseerde zoekrouter met trust scoring. Routeert queries naar Context7 (docs), native web search, `gh`/`glab` (code) en lokale code-intelligentie (Gortex of Serena).

**Wanneer gebruiken:** Officiële bibliotheek- en frameworkdocumentatie vinden, webonderzoek doen naar tutorials/voorbeelden/vergelijkingen/oplossingen, GitHub/GitLab-code zoeken naar implementatiepatronen, queries routeren waarvan het kanaal onduidelijk is en zoekinfrastructuur leveren aan andere skills (gedeelde invocatie).

**Wanneer NIET gebruiken:** Alleen-lokale codebaseverkenning (gebruik de code-intelligentie-MCP direct), Git-historie of blame-analyse (gebruik oma-scm) of volledig architectuuronderzoek (gebruik oma-architecture, die deze skill intern kan aanroepen).

**Kernregels:**
- Classificeer de intent vóór het zoeken; elke query gaat eerst door IntentClassifier
- Eén query, één beste route; vermijd redundante multi-route tenzij de intent ambigu is
- Geef elk resultaat een trust score; alle niet-lokale resultaten krijgen domeinlabels uit het trustregister
- Flags overschrijven de classifier: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`
- Fail forward: valt de primaire route uit, val dan netjes terug (docs→web, web→`oma search fetch`-strategieën)
- Extra MCP is niet nodig: Context7 voor docs, runtime-native voor web, CLI voor code en de ingestelde provider (Gortex of Serena) voor lokaal
- Web search is vendoragnostisch: gebruik wat de huidige runtime biedt (WebSearch, Google, Bing)
- Ken trust alleen op domeinniveau toe; gebruik geen scores voor subpaden of afzonderlijke pagina's

**Bronnen:** `SKILL.md` en de map `resources/` met intent-classifier, routeringsdefinities en trustregister.

---

### oma-recap

**Domein:** Conversatiegeschiedenis over meerdere AI-tools (Claude, Codex, Qwen, Cursor) analyseren en thematische dagelijkse of periodieke werksamenvattingen maken.

**Wanneer gebruiken:** Een werkdag of periode samenvatten, de werkstroom over meerdere AI-tools begrijpen, tool-switching-patronen analyseren of dagelijkse stand-ups, weekretrospectives en werklogboeken voorbereiden.

**Wanneer NIET gebruiken:** Een retrospective op basis van Git-commits (gebruik `oma retro`), realtime agentmonitoring (gebruik `oma dashboard terminal`) of productiviteitsmetrieken (gebruik `oma stats get`).

**Proces:**
1. Los datum of tijdvenster op uit natuurlijke taal (today, yesterday, last Monday of een expliciete datum)
2. Haal conversatiegegevens op via `oma recap --date YYYY-MM-DD` of `--since` / `--until`
3. Groepeer per tool en sessie
4. Extraheer thema's (features waaraan is gewerkt, bugs die zijn opgelost, tools die zijn verkend)
5. Render een thematische dag- of periodesamenvatting

**Bronnen:** `SKILL.md`; zwaar werk wordt gedelegeerd aan de `oma recap`-CLI.

---

### oma-hwp

**Domein:** HWP/HWPX/HWPML (Koreaanse tekstverwerker) naar Markdown converteren met `kordoc`.

**Wanneer gebruiken:** Koreaanse HWP-documenten (`.hwp`, `.hwpx`, `.hwpml`) naar Markdown converteren, Koreaanse overheids- of bedrijfsdocumenten voorbereiden voor LLM-context of RAG, en gestructureerde inhoud (tabellen, koppen, lijsten, afbeeldingen, voetnoten, hyperlinks) uit HWP halen.

**Wanneer NIET gebruiken:** PDF-bestanden (gebruik oma-pdf), XLSX/DOCX (buiten scope), HWP genereren/bewerken (buiten scope) of al-tekstbestanden (gebruik de Read-tool direct).

**Kernregels:**
- Gebruik `bunx kordoc@latest` (geen installatie nodig); geef altijd `@latest` of een gepinde versie door
- Het standaarduitvoerformaat is Markdown
- Zonder uitvoermap komt de uitvoer in dezelfde map als het invoerbestand
- kordoc behoudt structuur (koppen, tabellen, geneste tabellen, voetnoten, hyperlinks en afbeeldingen)
- kordoc levert beveiligingen tegen ZIP-bombs, XXE, SSRF en XSS; voeg geen eigen beveiligingen toe
- Meld de beperking duidelijk wanneer HWP versleuteld of met DRM vergrendeld is
- Gebruik daarna `resources/flatten-tables.ts` om HTML-`<table>`-blokken om te zetten naar GFM-pipe-tabellen en Hancom Private Use Area-tekens te verwijderen

**Bronnen:** `SKILL.md`, `config/` en `resources/flatten-tables.ts`.

---

### oma-pdf

**Domein:** PDF naar Markdown converteren met `opendataloader-pdf`.

**Wanneer gebruiken:** PDF's naar Markdown converteren voor LLM-context of RAG, gestructureerde inhoud (tabellen, koppen, lijsten en afbeeldingen) uit PDF's halen en PDF-gegevens voorbereiden voor AI-gebruik.

**Wanneer NIET gebruiken:** PDF's genereren of maken (gebruik passende documenttools), bestaande PDF's bewerken (buiten scope) of al-tekstbestanden eenvoudig lezen (gebruik de Read-tool direct).

**Kernregels:**
- Gebruik `uvx opendataloader-pdf` (geen installatie nodig)
- Het standaarduitvoerformaat is Markdown
- Zonder uitvoermap komt de uitvoer in dezelfde map als de invoer-PDF
- Behoud de documentstructuur (koppen, tabellen, lijsten en afbeeldingen)
- Gebruik voor gescande PDF's de hybride modus met OCR
- Voer altijd `uvx mdformat` uit op de uitvoer om Markdown te normaliseren
- Valideer dat de Markdown leesbaar en goed gestructureerd is
- Meld conversieproblemen (ontbrekende tabellen, verminkte tekst)

**Bronnen:** `SKILL.md`, `config/` en `resources/`.

---

### oma-academic-writing

**Domein:** Publicatieklare academische Engelse tekst: essays, rapporten, analyse, executive summaries, conclusies en literatuuroverzichten schrijven, reviseren en auditen.

**Wanneer gebruiken:** Academische rapporten of essays opstellen/reviseren, executive summaries, conclusies of literatuuroverzichten schrijven, AI-achtig academisch Engels herschrijven, of een concept beoordelen op zinsvariatie, werkwoordkeuze, anti-AI-naleving, specificiteit, hedging, alineahelderheid, ritme en claim-evidence-alignment.

**Wanneer NIET gebruiken:** Vertalen (gebruik oma-translation), bronnen zoeken of citaties verzamelen (gebruik oma-scholar), rubric en taakdecompositie (gebruik oma-pm), code-documentatie/README/API-tekst (gebruik het domein zelf), informele of marketingtekst of niet-Engelse academische tekst (schrijf eerst in het Engels en draag daarna over aan oma-translation).

**Modi:** `draft` (heading + prose + Writing Notes + Claim-Evidence Map), `revise` (origineel + revisie + changelist) en `review` (PASS/FAIL-rapport over zinsstructuur, werkwoordkwaliteit, anti-AI, specificiteit, hedging, alineahelderheid, ritme en claim-evidence-alignment).

**Kernregels:**
- Citeer vóór je oordeelt: haal eerst de letterlijke rubric- of constrainttekst aan
- Elke zin moet verifieerbaar zijn; verzin geen gegevens, statistieken of citaties
- Verboden generieke werkwoorden (`show`, `have`, `make`, `do`, `get`, `use`, …) mogen geen hoofdwerkwoord zijn
- Varieer zinstype, lengte en openingswoorden; schrijf nooit drie of meer zinnen van hetzelfde type achter elkaar
- Stem de sterkte van hedging af op de sterkte van het bewijs; gebruik geen eerste persoon `I think`/`I believe`
- Koppel elke claim aan bewijs in de Claim-Evidence Map; verzwak of verwijder claims zonder bewijs

**Workflow:** 6 stappen — rubric/concept lezen en constraints citeren, alinea's plannen als Topic-Support-Conclude, schrijven volgens alle vier protocollen, auditen met de anti-AI-checklist, reverse-outline + Claim-Evidence Map maken en polijsten (hardop lezen, samenhang, specificiteit, woordenaantal en ritme).

**Bronnen:** `anti-ai-checklist.md`, `sentence-structure-reference.md`, `academic-verb-tiers.md`, `hedging-guide.md` en de gedeelde bronnen `context-loading` en `quality-principles`.

---

### oma-deepsec

**Domein:** Vercels agentgestuurde kwetsbaarheidsscanner `deepsec` end-to-end aansturen, veilig en kostenbewust binnen een doelrepository.

**Wanneer gebruiken:** `.deepsec/` voor het eerst installeren in een repo (`init`, `INFO.md` en calibratiescan), een volledige of afgebakende scan uitvoeren en findings verwerken, een CI-gate per PR opzetten met `process --diff`, projectspecifieke matchers schrijven, een backlog met findings triageren (severity bucketing, FP-cuts met `revalidate`, export) of fouten in deepsec diagnosticeren.

**Wanneer NIET gebruiken:** Een generieke OWASP- of lintreview zonder deepsec (gebruik oma-qa), algemene CVE- of dependencyadviezen (gebruik oma-qa of oma-search), een niet-deepsec SAST-pipeline ontwerpen (gebruik oma-architecture), applicatiecode schrijven/auditen (routeer naar oma-backend/frontend/mobile), cloud/IAM/Terraform hardenen (gebruik oma-tf-infra) of een finding in productcode oplossen (gebruik oma-debug nadat deepsec de finding heeft geproduceerd).

**Kernregels:**
- Start nooit een onbegrensde `process` op een repo waarvan de omvang niet is gemeten; kalibreer eerst (`--limit 50 --concurrency 5`) wanneer het aantal bestanden onbekend is of groter dan 500
- Noem kosten en stopconditie vóór een AI-pass (ongeveer $25-60 voor 100 bestanden tot $500-1,200 voor 2.000, met een factor 2-3 variatie)
- Hervat, reset niet: voer na quota-, netwerk- of Ctrl-C-onderbreking dezelfde opdracht opnieuw uit; verwijder nooit `data/<id>/`
- Houd `INFO.md` kort en projectspecifiek (50-100 regels, 3-5 voorbeelden per sectie)
- Gebruik voor PR/CI-gates het patroon met twee jobs; geef de job die PR-code uitvoert nooit `pull-requests: write`; pin actions in productie op volledige SHA's
- Vraag vóór de eerste betaalde call om de agentkeuze (`codex`/`gpt-5.5` of `claude`/`claude-opus-4-8`); echo of commit credentials nooit

**Workflow:** PREPARE (intent, repo-root, credential, budget, severity floor, agent) -> ACQUIRE (config, `INFO.md`, run history, reposignalen) -> REASON (kleinst voldoende pass kiezen) -> ACT (vanuit `.deepsec/` draaien) -> VERIFY (`status`, `RunMeta`, exitcode) -> FINALIZE (findings per ernst/oordeel, dollarbedrag, follow-ups).

**Bronnen:** `setup.md`, `scanning.md`, `pr-review.md`, `matchers.md`, `triage.md`, `config.md`.

---

### oma-docs

**Domein:** Documentatiedrift detecteren: verwijzingen in `docs/**/*.md` tegen de huidige codebase verifiëren (verify-modus) en patches voorstellen voor docs die door een diff zijn geraakt (sync-modus).

**Wanneer gebruiken:** Na een refactor, hernoeming of verwijdering van bestanden om verouderde verwijzingen te vinden; vóór een release om CLI-commando's, bestandspaden en configkeys te controleren; na een omvangrijke diff om geraakte docs te vinden; of voor een periodieke driftcontrole.

**Wanneer NIET gebruiken:** Docs genereren voor iets dat nog niet is gedocumenteerd, meertalige docs vertalen (gebruik oma-translation), drift op symboolniveau, CI-blokkerende handhaving (v1 waarschuwt alleen).

**Kernregels:**
- Wijzig `.agents/` nooit (SSOT-bescherming)
- Pas sync-patches nooit automatisch toe; sync vereist altijd interactieve bevestiging (`[y]` per document)
- Bij ontbrekende LLM gaat verify terug naar ruwe JSON en sync naar alleen de kandidatenlijst
- Bestanden met secrets (`.env*`, `*.pem`, `*.key`, `id_rsa*` en gitignored bestanden) verschijnen nooit in sync-output
- De CLI doet geen directe LLM-calls: hij levert gestructureerde data; het host-LLM doet synthese en patchontwerp, onafhankelijk van vendor
- URL-controle wordt gedelegeerd aan `lychee`; de hook is in v1 warn-only en blokkeert workflowvoltooiing nooit

**Workflow:** verify-modus — extract -> resolve -> report (deterministische CLI, exit 0 schoon / 1 kapotte refs). sync-modus — git diff -> reverse lookup -> kandidatenlijst -> host-LLM-patches -> interactief accepteren/weigeren -> `doc-refs.json` opnieuw genereren.

**Bronnen:** Gebruikt alleen gedeelde bronnen; de implementatie staat in `cli/commands/docs/` (`extract.ts`, `resolve.ts`, `reporter.ts`, `sync-propose.ts`).

---

### oma-explanation

**Domein:** Interactieve uitleg voor codewijzigingen.

**Wanneer gebruiken:** Een diff, pull request, branch of commitreeks uitleggen aan een lezer die achtergrond, intuïtie, codewalkthrough en een korte quiz in één offline HTML-artifact nodig heeft.

**Workflow:** Leest de gevraagde wijziging, bouwt een zelfstandige HTML-uitleg met secties Background / Intuition / Code / Quiz, valideert het artifact en schrijft het onder `.agents/results/explain/`.

**Wanneer NIET gebruiken:** Een gewone docs-pagina, live feature-implementatie of slide deck (gebruik `oma-slide` voor presentaties).

**Bronnen:** Gedeelde execution- en quality-resources plus de artifactvalidatie van de `/explain`-workflow.

---

### oma-image

**Domein:** Multi-vendor AI-afbeeldingen genereren met auth-bewuste parallelle dispatch (Codex `gpt-image-2`, Antigravity Gemini-familie “nano-banana” via `agy` met intern geselecteerd model, Pollinations flux/zimage).

**Wanneer gebruiken:** Afbeeldingen, visuele assets, illustraties, productfoto's, concept art of mockups genereren; dezelfde prompt met meerdere beeldmodellen vergelijken; afbeeldingen uit prompts in editorworkflows maken.

**Wanneer NIET gebruiken:** Een bestaande afbeelding bewerken of foto's manipuleren, video of audio genereren (gebruik oma-video/oma-voice), inline vector/SVG-compositie uit gestructureerde data of eenvoudige asset-resizing/-conversie.

**Kernregels:**
- Verduidelijk vóór invocatie: als onderwerp, stijl, compositie of gebruik onduidelijk is, stel eerst een vraag of verrijk de prompt en toon de uitgebreide versie
- Auth-bewuste dispatch: voer alleen geauthenticeerde vendors uit; met `--vendor all` moet elke gevraagde vendor beschikbaar zijn
- Kostenpoort: bevestig runs met een geschatte kosten van ≥ $0.20 (`--yes`/`OMA_IMAGE_YES=1` omzeilt dit); `pollinations` en `antigravity` zijn standaard gratis
- Padveiligheid: output buiten `$PWD` vereist `--allow-external-output`; maximaal `n` = 5
- Geregistreerde output: elke run schrijft naast de afbeeldingen een `manifest.json` met prompt, vendor/model, inputs en artifactmetadata. Dit legt reproduceerbaarheidsgegevens vast, maar belooft geen pixelidentieke output.
- Stuur bijgevoegde referentieafbeeldingen automatisch door via `--reference <path>` (codex/antigravity)

**Workflow:** PREPARE (prompt verduidelijken/verrijken, vendor kiezen) -> ACQUIRE (auth, referenties en outputpad valideren) -> ACT (`oma image generate`) -> VERIFY (manifest, bestanden en exitcode) -> FINALIZE (outputpaden en waarschuwingen).

**Bronnen:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md` en `config/image-config.yaml`.

---

### oma-market

**Domein:** Marktonderzoek op basis van communitysignalen: pijnpunten, trends, concurrentiepositionering en discovery. Onderzoek gebruikt de upstream [`last30days`](https://github.com/mvanhorn/last30days-skill)-engine (Reddit, X, YouTube, TikTok, Instagram, HN, Polymarket, GitHub, arXiv, Techmeme, Digg, LinkedIn, StockTwits, Bluesky, web en meer), die OMA automatisch op de nieuwste release houdt.

**Wanneer gebruiken:** Echte pijnpunten uit communityposts halen, trends detecteren binnen een venster van 7/30/90/180 dagen, sentiment van concurrenten analyseren met SWOT/Porter's 5F, open discovery (`--discover`), personen/bedrijven/tickers onderzoeken, hiring-signalen zoeken of vervolgonderzoek uitvoeren.

**Wanneer NIET gebruiken:** Algemeen webonderzoek zonder marktframe (gebruik oma-search), academische literatuur (gebruik oma-scholar) of live dashboards/geplande monitoring (wikkel deze skill met `oma schedule <action>`).

**Kernregels:**
- Eerst detect-trap: start de engine nooit zonder preflight (`--force` alleen na expliciete bevestiging)
- Eén engine, altijd de nieuwste: `oma market resolve` vernieuwt de beheerde kopie (`~/.cache/oma-market/last30days/<tag>/`); een stale lokaal geïnstalleerde kopie is alleen fallback wanneer offline niets gecached is
- Volg de `SKILL.md` van de opgeloste engine letterlijk; de enige vervanging is `oma market run <args>` in plaats van het ruwe `python3 scripts/last30days.py`
- Nooit alleen WebSearch: geen engine, geen Python 3.12+ of een niet-nul exitcode betekent stoppen en rapporteren
- Sources met keys worden alleen via de upstream setup wizard met gebruikersconsent ingeschakeld; overgeslagen bronnen blijven in de footer zichtbaar
- Frameworks citeren alleen engineclusters; badge op de eerste regel en upstream LAWs zijn verplicht vóór het bestand wordt geschreven
- Eén brief per run in `.agents/results/market/{topic-slug}-{YYYYMMDD}.md`; frameworks schakelen automatisch volgens intent (pain/trend -> SWOT, competitor -> SWOT + Porter's 5F, discovery -> SWOT + PESTEL)

**Workflow:** detect-trap -> `oma market resolve` -> upstream `SKILL.md` lezen -> upstream pre-research (setup wizard, handle/subreddit oplossen, queryplan) -> `oma market run … --emit=compact` -> synthese volgens upstream OUTPUT CONTRACT -> frameworks toevoegen -> self-check -> schrijven.

**Bronnen:** `intent-rules.md`, `output-laws.md`, `execution-protocol.md`, `checklist.md`, `error-playbook.md` en `frameworks/` (swot, porters-5f, pestel). CLI: `oma market detect-trap | resolve | update | run`.

---

### oma-refactor

**Domein:** Gedragsbehoudende refactoring: veilig en stapsgewijs herstructureren met code-smell/SATD/hotspotselectie, karakteriseringstests, metriekpoorten en refactor-only commits.

**Wanneer gebruiken:** Refactoring uitvoeren op specifieke files/modules (extract, move, rename, decompose, idiom alignment), voorbereidend refactoren vóór een feature, legacy/brownfield rescue, hotspots selecteren op churn × complexity of auditen of code veilig refactorbaar is.

**Wanneer NIET gebruiken:** Een gemeld defect of falend gedrag oplossen (gebruik oma-debug; refactoring mag gedrag niet veranderen), beveiligings-/prestatie-/toegankelijkheidsaudit (gebruik oma-qa), systeemontwerp/modulegrenzen/ADR's (gebruik oma-architecture), DB-schema- of migratiemechaniek (gebruik oma-db), commits splitsen/stagen (gebruik oma-scm) of performanceoptimalisatie als doel.

**Kernregels:**
- Gedrag behouden: het consumercontract (Hyrum-aware) is onaantastbaar; tuning is bijeffect, nooit doel
- Verifieerbaar: restructureer nooit zonder vangnet; ontbreekt dat, schrijf eerst karakteriseringstests (golden master) in aparte commits
- Incrementeel: één benoemde transformatie per commit; bij herhaald falen Mikado gebruiken (voorwaarde registreren, volledig terugdraaien, recursief werken)
- Gescheiden (twee petten): meng gedragswijzigingen nooit in refactor-commits (alleen `refactor:`-type)
- Economisch: leesbaarheid is hoofddoel; refactor geen code die verdwijnt of weinig churn heeft
- Afwijken van conventies vereist de oma-architecture ADR-route; metrics zijn proxies (Goodhart)

**Workflow:** PREPARE (green/brownfield, size gates, hotspot rank) -> ACQUIRE (code lezen via symboltools, metrics + git-signalen verzamelen) -> REASON (atomair transformatieschema/expand-contract) -> ACT (één engine-first-transformatie) -> VERIFY (tests onveranderd opnieuw draaien -> commit, of Mikado revert) -> FINALIZE (metricdelta + oordeel over leesbaarheid).

**Bronnen:** `definition.md`, `measurement.md`, `governance.md` en gedeelde `context-loading` en `quality-principles`.

---

### oma-scholar

**Domein:** Scholarly research companion met de Knows `.knows.yaml`-sidecarspecificatie: gestructureerde paper-sidecars genereren, valideren, reviewen, opvragen en vergelijken, plus ophalen van knows.academy.

**Wanneer gebruiken:** Papers tokenefficiënt lezen via sidecars (~700 tokens claims-only versus ~10K volledige PDF), `.knows.yaml` genereren uit concepten/LaTeX/notities, sidecars valideren vóór delen, peerreviews als sidecars produceren, bestaande sidecars opvragen of samenvatten, twee papers structureel vergelijken, en zoeken/ophalen uit knows.academy.

**Wanneer NIET gebruiken:** Algemeen webonderzoek of niet-academische inhoud (gebruik oma-search), papers vertalen (gebruik oma-translation), alleen PDF-parsing zonder sidecar (gebruik oma-pdf) of een volledig peerreviewproces met editorsysteem.

**Modi:** Generate, Validate, Review, Analyze, Compare, Remote (search/fetch).

**Kernregels:**
- Doelspecificatie is v0.9.0 / `paper@1`-profiel; het host-LLM genereert sidecars (roep nooit een extern LLM-SDK aan)
- Anti-fabricatie: als DOI/venue/jaar niet in de bron staat, laat de key volledig weg; schrijf nooit `doi: TODO` en gok niet
- Gebruik exacte veldnamen, één `provenance.actor`-object, gesloten enums en ongequote getallen
- Relation density ≥ 1.5 per statement; elke claim heeft bewijs in `supported_by`
- Valideer vóór delen (`oma scholar lint`); gebruik `--lenient` voor sidecars van derden
- knows.academy -> OpenAlex-fallback voor oudere of niet-2026 papers; de publieke proxy-API heeft geen auth nodig

**Workflow:** PREPARE (modus + bron) -> ACQUIRE (metadata, secties of lokale tekst) -> REASON (claims/evidence/relations extraheren) -> ACT (generate/lint/review/analyze/compare/fetch) -> VERIFY (schema, enums, ID's en relaties) -> FINALIZE (sidecar/rapport/samenvatting met kanttekeningen).

**Bronnen:** `execution-protocol.md`, `sidecar-spec.md`, `api-endpoints.md`, `setup-openalex.md`, `upstream-spec-cache.md`, `fallback-providers.md`, `checklist.md` en `config/scholar-config.yaml`.

---

### oma-skill-creation

**Domein:** OMA-skills maken en valideren in SSL-lite Markdown-formaat (Scheduling / Structural Flow / Logical Operations / References).

**Wanneer gebruiken:** Een nieuwe skill onder `.agents/skills/{name}/SKILL.md` maken, een bestaande skill naar SSL-lite omzetten, een canoniek commando/workflowpad toevoegen, routering/executie/validatiedetail auditen of bepalen of variantedetail in `resources/` hoort.

**Wanneer NIET gebruiken:** Externe skills installeren in `$CODEX_HOME/skills` (extern), een Codex-pluginbundle maken (extern), een algemeen projectplan zonder skill-auteurschap schrijven (gebruik oma-pm) of product-/infrastructuur-/frontend-/backend-/mobilecode bewerken (gebruik de passende specialist).

**Kernregels:**
- Behoud exact de vier top-levelsecties: Scheduling, Structural Flow, Logical Operations, References
- Houd YAML-frontmatter met duidelijke `name` en `description`; voer `oma skill audit` uit na wijzigingen aan de description (waarschuwt bij ≥ 60%, faalt bij ≥ 75% TF-IDF-cosinecollision)
- Neem concrete `When NOT to use`-grenzen op met verwijzingen naar aangrenzende skills
- Voeg precies één inline canoniek pad toe (`Canonical command path` voor kwetsbare/herhaalbare commando's, `Canonical workflow path` voor oordeel-/onderzoeksstromen)
- Zet lange variantdetails in `resources/`; maak geen README/changelog/install-docs in een skill

**Workflow:** PREPARE (doel, triggers, grenzen, I/O, afhankelijkheden) -> ACQUIRE (1-3 vergelijkbare skills + conventies lezen) -> REASON (inline versus `resources/`) -> ACT (opstellen vanuit SSL-lite-sjabloon) -> VERIFY (structurele/routerings-/execution-/formattingchecks) -> FINALIZE (gewijzigde bestanden + validatierapport).

**Bronnen:** `ssl-lite-template.md`, `validation-checklist.md` en gedeelde `context-loading` en `quality-principles`.

---

### oma-slide

**Domein:** HTML-presentatiedecks met veel animatie op een vast podium van 1920×1080, met deterministische validate/bundle/export naar PDF/PNG/PPTX via de `oma slide`-CLI.

**Wanneer gebruiken:** Een nieuwe presentatie maken, een bestaand deck verbeteren of herformatteren, per-slide HTML met animaties en design-doctrine maken, exporteren naar PDF/PNG/PPTX, een stijlpreset toepassen of exporteren naar/importeren uit Canva.

**Wanneer NIET gebruiken:** Gewone documentcreatie zonder slides, alleen beeldgeneratie (gebruik oma-image), een merk/designsysteem definiëren (gebruik oma-design) of alleen deterministische CLI-operaties uitvoeren zonder generatie (roep de `oma slide`-CLI direct aan).

**Kernregels:**
- De skill schrijft HTML; de CLI doet de rest (scaffold, validate, bundle, export)
- Alleen lokale assets: geen remote URL's in `<img src>`/`<video src>`, alleen `./assets/<file>`
- CJK -> Pretendard-font verplicht op elke Koreaanse/Japanse/Chinese slide
- `prefers-reduced-motion`-wrapper, zichtbare focus states en `data-om-validate` zijn op elke slide verplicht
- Maximaal 3 autofix-iteraties bij validatie; toon daarna de diff
- Delegeer beeldgeneratie naar oma-image; Canva MCP is optioneel en wordt alleen met expliciete gebruikersconsent automatisch geprovisioneerd

**Workflow:** 7 fasen — DETECT (modus), DISCOVER (verduidelijken + assets beoordelen), STYLE (3 live previews -> gebruiker kiest), GENERATE (`slide-NN.html` op 1920×1080), VALIDATE (`oma slide validate`, maximaal 3 autofix-lussen), REVIEW (viewer + optionele bbox-editor), DELIVER (`bundle` + optionele PDF/PNG/PPTX-export).

**Bronnen:** `generation-protocol.md`, `design-doctrine.md`, `fixed-stage.md`, `style-presets.md`, `selection-index.json`, `animation-patterns.md`, `canva-integration.md`, `checklist.md` en de map `assets/`.

---

### oma-video

**Domein:** Short-form-, uitleg- en door mensen opgenomen demovideo's genereren via de `oma video`-CLI, van script en narratie tot visuals, captions en HyperFrames-render.

**Wanneer gebruiken:** Short-formvideo (shorts/reels, 9:16), explainers (16:9/9:16) uit een README/code/data, demo's/walkthroughs uit een schermopname (`--source file`) of begeleide browsercapture in een venster voor elke URL (`--source web`), of een bestaande run deterministisch opnieuw renderen.

**Wanneer NIET gebruiken:** Eén stilstaand beeld genereren (gebruik oma-image), een slide deck genereren (gebruik oma-slide; video gebruikt die intern voor explainerframes), alleen spraakaudio genereren (gebruik oma-voice), niet-lineair editen van een bestaand voltooid mp4-bestand of live streamen (begeleide webcapture valt wel binnen scope).

**Kernregels:**
- Verduidelijk of leid de modus af vóór invocatie; toon het afgeleide plan in plaats van stil te renderen vanuit een vage briefing
- Providerconfiguratie is optioneel voor ondersteunde asset-fallbacks; betaalde providers (Pexels, Pixelle) worden alleen automatisch ingeschakeld als hun env-key aanwezig is; een compositorfout wordt nooit vervangen door fallbackvideo
- Kostenpoort bij ≥ `$0.20` (`--yes`/`OMA_VIDEO_YES=1` omzeilt); limieten van 180s duur / 40 scènes
- Renderinputs staan in `render-spec.json`, assets, seed en ingesloten Pretendard; `OMA_VIDEO_MOCK=1` is een testharnas voor golden fixtures, geen gebruikersdeliverable
- Demo is human-in-the-loop: webcapture opent alleen een headed browser en neemt op terwijl een mens de flow bestuurt — GEEN credentialautomatisering; `--url` en tokens worden gemaskeerd in logs/manifest
- Padveiligheid (`--allow-external-output` voor output buiten `$PWD`)

**Workflow:** PREPARE (modus/aspect/locale, briefing verduidelijken/versterken) -> ACQUIRE (providerbeschikbaarheid peilen, capturepad valideren, kosten controleren) -> ACT (script -> voice ∥ visuals ∥ captions -> render-spec -> render) -> VERIFY (schema, manifesthashes, exitcode, mp4) -> FINALIZE (run-dir + mp4-pad + dekkingswaarschuwingen).

**Bronnen:** `execution-protocol.md`, `vendor-matrix.md`, `prompt-tips.md`, `checklist.md`, plus de `hyperframes-authoring/`-modusgidsen, de web-capture-driver en de fallback-compositor `mpt/`; `config/video-config.yaml`.

---

### oma-voice

**Domein:** Local-first text-to-speech en speech-to-text via de Voicebox MCP-server — volledig lokaal, zonder cloud, API-keys of kosten per call.

**Wanneer gebruiken:** Korte notificatieaudio voor voltooiing of blockers genereren, voice-over/narratie/audio-assets (mp3 of wav) maken, lokale audiobestanden (mp3, wav, m4a, webm, flac) naar Markdown transcriberen of voiceprofielen vergelijken door dezelfde tekst opnieuw te draaien met verschillende profiel-ID's.

**Wanneer NIET gebruiken:** Cloud-TTS of cloudstemmen met hoge fidelity, realtime terminalmicrofoondictatie (gebruik Voicebox' hotkey-dictation), sample-upload voor voice cloning/profielcreatie (doe dat in de Voicebox-desktopapp) of video-/muziek-/sounddesign.

**Kernregels:**
- Voicebox is vereist: bij een mislukte handshake/`GET /health` geef je één installatie-/starttip en stop je; retry of automatische herstart is niet toegestaan
- Een profiel is vereist: als `voicebox_list_profiles` leeg is, wijs je de gebruiker naar de app-UI en stop je
- Lengtelimieten: TTS maximaal 5000 tekens per call (waarschuw bij 2000), STT maximaal 30 minuten; v1 chunkt niet automatisch
- Transparantie bij auto-invocatie: notificaties alleen bij taken langer dan `auto_notify_after_sec` (standaard 60s); kondig de intent altijd in één regel aan
- Padveiligheid (waarschuw + bevestiging voor output buiten `$PWD`); SIGINT schrijft geen gedeeltelijke output
- Een manifest is vereist voor elke generatie; geen kostenpoort (Voicebox is gratis)

**Workflow:** PREPARE (tekst/audio/taal/pad/profiel valideren) -> ACQUIRE (eenmalig verduidelijken als een signaal ontbreekt) -> ACT (MCP `voicebox_speak` of `voicebox_transcribe`) -> VERIFY (aanwezigheid van audio/transcript + manifestvelden) -> FINALIZE (`manifest.json` en rapportpad schrijven).

**Bronnen:** `voice-matrix.md`, `prompt-tips.md`, `execution-protocol.md`, `checklist.md` en `config/voice-config.yaml`.

---

## Charter preflight (CHARTER_CHECK)

Voordat er code wordt geschreven, moet elke implementatieagent een CHARTER_CHECK-blok uitvoeren:

```
CHARTER_CHECK:
- Clarification level: {LOW | MEDIUM | HIGH}
- Task domain: {agent domain}
- Must NOT do: {3 constraints from task scope}
- Success criteria: {measurable criteria}
- Assumptions: {defaults applied}
```

**Doel:**
- Verklaart wat de agent wel en niet zal doen
- Vangt scope creep op voordat code wordt geschreven
- Maakt aannames expliciet voor gebruikersreview
- Levert toetsbare succescriteria

**Verduidelijkingsniveaus:**
- **LOW**: Duidelijke requirements. Ga verder met de genoemde aannames.
- **MEDIUM**: Gedeeltelijk dubbelzinnig. Noem opties en ga verder met de meest waarschijnlijke.
- **HIGH**: Zeer dubbelzinnig. Zet de status op geblokkeerd, noteer vragen en schrijf GEEN code.

In subagentmodus (CLI-gespawnd) kunnen agenten gebruikers niet rechtstreeks vragen. LOW gaat verder; MEDIUM verkleint en interpreteert; HIGH blokkeert en geeft vragen terug die de orchestrator kan doorsturen.

---

## Tweelaags laden van skills

De kennis van elke agent is verdeeld over twee lagen:

**Laag 1: SKILL.md (geladen wanneer de skill wordt gerouteerd)**
Bevat frontmatter (`name` en `description`), wanneer de skill wel/niet wordt gebruikt, kernregels, architectuuroverzicht, bibliothekenlijst en verwijzingen naar Laag 2.

**Laag 2: resources/ (op aanvraag geladen)**
Wordt alleen geladen wanneer de agent actief werkt, en alleen met de bronnen die de taak nodig heeft. De moeilijkheidsgraad bepaalt een zacht tokenbudget, geen vaste lijst met bestanden; zie [Resources laden per taak](./skills.md#resource-loading-by-task).

Tijdens de uitvoering worden aanvullend geladen wanneer dat nodig is:
- `checklist.md`: bij de Verify-stap
- `error-playbook.md`: alleen wanneer fouten optreden
- `common-checklist.md`: voor de eindverificatie van complexe taken

---

## Afgebakende uitvoering

Agenten opereren binnen strikte domeingrenzen:

- Een frontend-agent wijzigt geen backendcode
- Een backend-agent raakt geen UI-componenten aan
- Een DB-agent implementeert geen API-endpoints
- Agenten documenteren out-of-scope afhankelijkheden voor andere agenten

Wanneer tijdens de uitvoering blijkt dat een taak bij een ander domein hoort, documenteert de agent dat als escalatie-item in het resultaatbestand in plaats van de taak zelf uit te voeren.

---

## Werkruimtestrategie

Voor multi-agentprojecten voorkomen gescheiden werkruimtes bestandsconflicten:

```
./apps/api → backend agent workspace
./apps/web → frontend agent workspace
./apps/mobile → mobile agent workspace
```

Werkruimtes worden met de `-w`-vlag opgegeven bij het spawnen van agenten:

```bash
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api
oma agent spawn frontend "Build login form" session-01 -w ./apps/web
```

---

## Orchestratiestroom

Bij een multi-agentworkflow (`/orchestrate` of `/work`):

1. **PM-agent** splitst het verzoek op in domeinspecifieke taken met prioriteiten (P0, P1, P2) en afhankelijkheden
2. **Sessie initialiseren:** sessie-ID genereren, `orchestrator-session-{sessionId}.md` en `task-board-{sessionId}.md` maken in de geconfigureerde geheugenopslag
3. **P0-taken** parallel spawnen (maximaal MAX_PARALLEL tegelijk)
4. **Monitoren:** rungebonden `progress-{agentId}-{taskId}-{runId}-{sessionId}.md`-bestanden en gestructureerde receipts pollen en het task board bijwerken; let op voltooide, mislukte en gecrashte runs
5. **Verifiëren:** voor elke voltooide agent `verify.sh {agent-type} {workspace}` draaien. Bij falen opnieuw spawnen met foutcontext (maximaal 2 retries). Na 2 retries de Exploration Loop activeren: 2-3 hypotheses genereren, parallelle experimenten spawnen en scoren
6. **Verzamelen:** rungebonden resultaatbestanden en gestructureerde claims lezen en de samenvatting opstellen
7. **Eindrapport:** sessiesamenvatting presenteren. Als Quality Score is gemeten, de Experiment Ledger samenvatten en lessons automatisch genereren

---

## Agentdefinities

Agenten zijn op twee plaatsen gedefinieerd:

**`.agents/agents/`**: Bevat 12 ingecheckte bronbestanden met subagentdefinities, waaronder:
- `backend-engineer.md`
- `frontend-engineer.md`
- `mobile-engineer.md`
- `db-engineer.md`
- `qa-reviewer.md`
- `debug-investigator.md`
- `pm-planner.md`
- `architecture-reviewer.md`
- `tf-infra-engineer.md`
- `docs-curator.md`
- `refactor-engineer.md`
- `research-explorer.md`

Deze bestanden definiëren de identiteit van de agent, verwijzing naar het uitvoeringsprotocol, het CHARTER_CHECK-sjabloon, een architectuursamenvatting en regels. Ze worden gebruikt bij het spawnen van subagenten via de Task/Agent-tool (Claude Code) of CLI.

De runtime biedt daarnaast 13 canonieke dispatchrollen: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` en `explore`. `research-explorer.md` is de ingecheckte definitie die aan `explore` is gekoppeld; `orchestrator` is een runtimecoördinatierol zonder apart definitiebestand.

**Leveranciersspecifieke projecties:** OMA materialiseert de brondefinities in runtimebestanden:
- `.claude/agents/*.md`
- `.codex/agents/*.toml`
- `.cursor/agents/*`, `.opencode/agents/*` en andere projecties van ondersteunde leveranciers

Deze gegenereerde bestanden worden vernieuwd door `oma link`, `oma install` en `oma update`.

---

## Runtimestatus (projectgeheugenopslag)

Tijdens orchestratiesessies coördineren agenten via gedeelde geheugenbestanden in `.agents/state/memories/` (oudere projecten vallen terug op het legacy-pad `.serena/memories/`; dit is configureerbaar via `mcp.json`):

| Bestand | Eigenaar | Doel | Anderen |
|---------|----------|------|---------|
| `orchestrator-session-{sessionId}.md` | Orchestrator | Sessie-ID, status, starttijd en fasebewaking | Alleen-lezen |
| `task-board-{sessionId}.md` | Orchestrator | Taaktoewijzingen, prioriteiten en statusupdates | Alleen-lezen |
| `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` | Die run | Voortgang per beurt: acties, gelezen/gewijzigde bestanden en huidige status | Orchestrator leest |
| `result-{agentId}-{taskId}-{runId}-{sessionId}.md` | Die run | Einduitvoer: status (voltooid/mislukt), samenvatting, gewijzigde bestanden en acceptatiecriteria-checklist | Orchestrator leest |
| `session-metrics.md` | Orchestrator | Optionele sessie-evidence en gemeten experimentresultaten | QA leest |
| `experiment-ledger.md` | Orchestrator/QA | Evidence voor daadwerkelijke experimenten | Iedereen leest |

Geheugentools zijn configureerbaar. Standaard lezen en schrijven agenten deze bestanden met hun native tools (`Read`, `Write`, `Edit`), maar de toolmapping kan in `mcp.json` worden aangepast:

```json
{
"memoryConfig": {
"basePath": ".agents/state/memories",
"tools": {
"read": "Read",
"write": "Write",
"edit": "Edit"
}
}
}
```

Dashboards (`oma dashboard terminal` en `oma dashboard web`) bewaken deze geheugenbestanden voor realtime monitoring.
