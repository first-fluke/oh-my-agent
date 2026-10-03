---
title: Introductie
description: Een uitgebreid overzicht van oh-my-agent, het multi-agent-orchestratieframework dat AI-codeerassistenten omzet in gespecialiseerde engineeringteams met 33 skillpakketten, 12 subagentdefinities, progressief laden van skills en portabiliteit tussen IDE's.
---

# Introductie

oh-my-agent is een multi-agent-orchestratieframework voor AI-aangedreven IDE's en CLI-tools. In plaats van voor alles op één AI-assistent te vertrouwen, routeert oh-my-agent werk langs 33 skillpakketten en 13 canonieke dispatchrollen. Twaalf ingecheckte subagentdefinitiebestanden leveren herbruikbare persona's voor implementatie, review, planning, debugging, documentatie, onderzoek en infrastructuur. `research-explorer.md` wordt gekoppeld aan de canonieke rol `explore`; `orchestrator` is een runtime-coördinatierol zonder afzonderlijk definitiebestand.

OMA biedt mechanische controles wanneer je ze aanroept of een workflow selecteert die ze bevat. `oma verify agent <agent-type>` voert de controles uit voor het geselecteerde agenttype; `/ralph` voegt verificatie met artefacten en een judge-lus toe; ingeschakelde Stop-hooks van leveranciers kunnen een workflow openhouden terwijl de geconfigureerde controles draaien. Alleen skills laden stelt geen acceptatie vast en een gewone prompt voert niet automatisch elke workflowgate uit. Gebruik de acceptatiecriteria van de workflow en de resulterende bestanden om te bepalen wat voltooid is.

Het volledige systeem staat in een draagbare `.agents/`-directory binnen je project. Schakel tussen Claude Code, Codex CLI, Antigravity CLI of IDE, Cursor, OpenCode en andere ondersteunde tools; je agentconfiguratie reist met je code mee.

Ben je nieuw met OMA, begin dan met [Snel starten](./quick-start.md) en lees daarna [Belangrijke standaardinstellingen](./important-defaults.md). De installatie maakt de SSOT en leveranciersintegraties aan; de eerste nuttige controle is `oma doctor`, en de eerste nuttige taak is één kleine wijziging binnen één domein. Gebruik `/work` of `/orchestrate` pas wanneer de taak coördinatie nodig heeft.

---

## Het multi-agentparadigma

Traditionele AI-codeerassistenten behandelen frontend, backend, database, beveiliging en infrastructuur vaak vanuit één promptcontext. Dat kan leiden tot:

- **Contextverdunning**: kennis voor elk domein laden verspilt contextvensterruimte
- **Onduidelijk eigenaarschap**: een taak over meerdere domeinen heeft geen expliciete grens voor elk onderdeel
- **Handmatige coördinatie**: voor complexe features over meerdere domeinen moeten de host of de gebruiker handoffs kiezen

oh-my-agent lost dit op met specialisatie:

1. **Elke skill heeft een primair domein.** De frontend-skill kent React/Next.js, shadcn/ui, TailwindCSS v4 en FSD-lite-architectuur. De backend-skill kent het Repository-Service-Router-patroon, geparametriseerde queries en JWT-authenticatie. Domeinen kunnen elkaar aan grenzen overlappen; gebruik daarom de acceptatiecriteria van de taak om te bepalen wanneer een tweede skill of een coördinerende workflow nodig is.
2. **Agenten kunnen parallel draaien.** Terwijl een backend-agent een API bouwt, kan een frontend-agent in zijn eigen workspace werken. De orchestrator coördineert via duurzame bestanden en receipts die aan een run zijn gekoppeld.
3. **Kwaliteitsrichtlijnen zijn ingebouwd.** Skills bevatten domeinchecklists, foutoplossingshandleidingen en charterregels. Charter preflight beperkt de scope voordat code wordt geschreven; QA-review draait wanneer de geselecteerde workflow die bevat of wanneer je erom vraagt.

---

## De huidige catalogus: 33 skills, 12 definities, 21 workflows

De catalogus scheidt drie zaken die gemakkelijk door elkaar raken:

- **Skills** zijn de 33 domeinkennis-pakketten onder `.agents/skills/*/SKILL.md`. Ze routeren vanuit natuurlijke taal en laden hun resources progressief.
- **Agentdefinities** zijn de 12 bestanden onder `.agents/agents/`. Ze leveren vendor-native subagentpersona's en verwijzen naar één of meer skills.
- **Workflows** zijn de 21 procesdefinities onder `.agents/workflows/`. Vier zijn persistent (`orchestrate`, `work`, `ultrawork` en `ralph`); de overige draaien tot een rapport en houden geen persistente modus actief.

De onderstaande secties behouden de gedetailleerde skillcatalogus. Wanneer een naam of beschrijving verandert, is de live frontmatter van `SKILL.md` leidend.

De 12 ingecheckte definitiebestanden dekken de 13 runtime-rollen via aliassen: `research-explorer.md` wordt gekoppeld aan `explore`, terwijl `orchestrator` alleen tijdens runtime bestaat. De andere definitiebestanden worden gekoppeld aan de benoemde rollen in [Agenten](../core-concepts/agents.md).

### Ideevorming, architectuur en planning

| Agent | Rol | Belangrijkste mogelijkheden |
|-------|------|-----------------|
| **oma-brainstorm** | Ideevorming met design als uitgangspunt | Verkent gebruikersintentie, stelt 2-3 benaderingen met afwegingsanalyse voor en maakt ontwerpdocumenten voordat code wordt geschreven. Workflow met 6 fasen: Context, Vragen, Benaderingen, Ontwerp, Documentatie, Overgang naar `/plan`. |
| **oma-architecture** | Specialist in systeemarchitectuur | Grenzen tussen modules, services en eigenaarschap, afwegingsanalyse en synthese van stakeholders. Methodes: diagnostische routering, design-twice-vergelijking, risicoanalyse in ATAM-stijl, prioritering in CBAM-stijl en beslisrecords in ADR-stijl. Standaard kostenbewust. |
| **oma-pm** | Productmanager | Ontleedt requirements in geprioriteerde taken met afhankelijkheden. Definieert API-contracten. Levert `.agents/results/plan-{sessionId}.json` en een sessiespecifiek taakbord. Ondersteunt ISO 21500-concepten, ISO 31000-risicokaders en ISO 38500-governance. |

### Implementatie

| Agent | Rol | Techstack en resources |
|-------|------|----------------------|
| **oma-frontend** | UI/UX-specialist | React, Next.js, TypeScript, TailwindCSS v4, shadcn/ui en FSD-lite-architectuur. Libraries: luxon (datums), ahooks of @mantine/hooks (hooks), es-toolkit (utils), Jotai/Zustand (clientstate), TanStack Query via door orval gegenereerde hooks (serverstate), @tanstack/react-form + Zod (formulieren), better-auth (auth) en nuqs (URL-state). Resources: `execution-protocol.md`, `tech-stack.md`, `tailwind-rules.md`, `snippets.md`, `angular-rules.md`, `error-playbook.md` en `checklist.md`. |
| **oma-backend** | API- en serverspecialist | Clean architecture (Router-Service-Repository-Models). Stack-onafhankelijk; detecteert Python/Node.js/Rust/Go/Java/Elixir/Ruby/.NET uit projectmanifesten. JWT + Argon2id voor auth. Resources: `execution-protocol.md`, `orm-reference.md`, `checklist.md` en `error-playbook.md`. Ondersteunt `/stack-set` voor het genereren van taalspecifieke `stack/`-referenties. |
| **oma-mobile** | Cross-platform mobile | Flutter, Dart, Riverpod/Bloc voor state management, Dio met interceptors voor API-aanroepen en GoRouter voor navigatie. Clean architecture: domain-data-presentation. Material Design 3 (Android) + iOS HIG. Doel: 60fps. Ondersteunt ook native Swift iOS: SwiftUI + `@Observable` (iOS 17+), Apple's `swift-openapi-generator` voor API-clients en de projectindeling `App/Core/Features/Shared`. Resources: `execution-protocol.md`, `tech-stack.md`, `screen-template.dart`, `screen-template.swift`, `screen-template.tsx`, `checklist.md` en `error-playbook.md`; platformspecifieke varianten worden door `/stack-set` gematerialiseerd. |
| **oma-db** | Databasearchitectuur | Modellering van SQL-, NoSQL- en vectordatabases. Schemaontwerp (standaard 3NF), normalisatie, indexering, transacties, capaciteitsplanning en back-upstrategie. Ondersteunt ontwerp met aandacht voor ISO 27001/27002/22301. Resources: `execution-protocol.md`, `document-templates.md`, `anti-patterns.md`, `vector-db.md`, `iso-controls.md`, `checklist.md` en `error-playbook.md`. |

### Design

| Agent | Rol | Belangrijkste mogelijkheden |
|-------|------|-----------------|
| **oma-design** | Specialist in designsystemen | Maakt DESIGN.md met tokens, typografie, kleursystemen, motion design (motion/react, GSAP, Three.js), responsive-first layouts en WCAG 2.2-compliance. Workflow met 7 fasen: Setup, Extract, Enhance, Propose, Generate, Audit, Handoff. Handhaaft anti-patronen (geen "AI slop"). Optionele Stitch MCP-integratie. Resources: `design-md-spec.md`, `design-tokens.md`, `anti-patterns.md`, `prompt-enhancement.md`, `stitch-integration.md` en de directory `reference/` met gidsen voor typografie, kleur, ruimte, beweging, responsive design, componenten, toegankelijkheid en shaders. |

### Infrastructuur, DevOps en observability

| Agent | Rol | Belangrijkste mogelijkheden |
|-------|------|-----------------|
| **oma-tf-infra** | Infrastructure-as-code | Multi-cloud Terraform (AWS, GCP, Azure, Oracle Cloud). OIDC-first-auth, least-privilege-IAM, policy-as-code (OPA/Sentinel) en kostenoptimalisatie. Ondersteunt ISO/IEC 42001 AI-controls, ISO 22301-continuïteit en ISO/IEC/IEEE 42010-architectuurdocumentatie. Resources: `multi-cloud-examples.md`, `cost-optimization.md`, `policy-testing-examples.md`, `iso-42001-infra.md` en `checklist.md`. |
| **oma-dev-workflow** | Taakautomatisering voor monorepo's | mise task runner, CI/CD-pipelines, databasemigraties, releasecoördinatie, git hooks en pre-commitvalidatie. Resources: `validation-pipeline.md`, `database-patterns.md`, `api-workflows.md`, `i18n-patterns.md`, `release-coordination.md` en `troubleshooting.md`. |
| **oma-observability** | Intentgebaseerde observability-router | MELT+P-signaaldekking (metrics/logs/traces/profiles/cost/audit/privacy), transporttuning (UDP/MTU, OTLP gRPC versus HTTP, Collector-topologie en sampling), W3C Trace Context-propagatie, SLO-beheer en burn-rate-alerts, incidentforensiek (lokalisatie in 6 dimensies) en meta-observability (self-health, kloksynchronisatie, cardinaliteit en retentie). CNCF-first; Fluentd is verouderd (gebruik Fluent Bit of OTel Collector). |

### Kwaliteit en debugging

| Agent | Rol | Belangrijkste mogelijkheden |
|-------|------|-----------------|
| **oma-qa** | Quality assurance | Security-audit (OWASP Top 10), prestatieanalyse, toegankelijkheid (WCAG 2.2 AA) en codekwaliteitsreview. Ernst: CRITICAL/HIGH/MEDIUM/LOW met bestand:regel en remediatiecode. Ondersteunt ISO/IEC 25010-kwaliteitskenmerken en ISO/IEC 29119-testuitlijning. Resources: `execution-protocol.md`, `iso-quality.md`, `checklist.md`, `self-check.md` en `error-playbook.md`. |
| **oma-debug** | Bugdiagnose en -oplossing | Reproduce-first-methodologie. Oorzaakanalyse, minimale fixes, verplichte regressietests en zoeken naar vergelijkbare patronen. Gebruikt code-intelligence-MCP-tools (Gortex of Serena) voor het traceren van symbolen. Resources: `execution-protocol.md`, `common-patterns.md`, `debugging-checklist.md`, `bug-report-template.md` en `error-playbook.md`. |
| **oma-refactor** | Gedragsbehoudende refactoring | Veilige, stapsgewijze herstructurering met karakteriseringstests als vangnet. Hotspots selecteren (complexiteit × churn), code smells/SATD selecteren, terugvallen via de Mikado-methode bij fouten, expand-contract voor stateful wijzigingen en refactor-only commits (geen gedragswijzigingen combineren). Engine-first-transformaties (IDE rename, jscodeshift/ast-grep), metrics via `uvx lizard` / `uvx radon`. Leesbaarheid is het succescriterium; metrics zijn proxy's. |

### Lokalisatie, coördinatie en git

| Agent | Rol | Belangrijkste mogelijkheden |
|-------|------|-----------------|
| **oma-translation** | Contextbewuste vertaling | Flow met zes scènes: Prepare, Acquire, Reason, Act, Verify, Finalize. De vertaalmethode heeft vier stappen: betekenis en beschermde syntax lezen, register kiezen, in de doeltaal reconstrueren en de auteursstijl behouden waar die thuishoort. Profielen per doeltaal (`resources/lang/{code}.md`) bevatten register- en typografieregels. Resources: `translation-rubric.md`, `anti-ai-patterns.md`, `lang/{ko,ja,zh,en}.md`. |
| **oma-orchestration** | Geautomatiseerde multi-agentcoördinator | Start CLI-subagenten parallel, coördineert via duurzame sessie-, taakbord-, voortgangs- en resultaatbestanden en bewaakt verificatielussen. Configureerbaar: MAX_PARALLEL (standaard 3), MAX_RETRIES (standaard 2), POLL_INTERVAL (standaard 30s). Bevat een agent-naar-agent-reviewlus en optionele sessie-evidence. Resources: `subagent-prompt-template.md` en `memory-schema.md`. |
| **oma-scm** | Software configuration management (SCM) + Git | Begeleidt branchingstrategieën, merge/rebase/conflict-workflows, worktrees, baselines en release-status. Geeft ook richtlijnen voor Conventional Commit-berichten met veilig stagen; co-author-trailers komen uit de effectieve `scm.co_author`-configuratie wanneer die is ingeschakeld. |
| **oma-coordination** | Handleiding voor handmatige multi-agentworkflows | Stapsgewijze coördinatie van PM-, Frontend-, Backend-, Mobile- en QA-agenten via CLI `oma agent spawn`. Begint met PM-decompositie, start taken met dezelfde prioriteit in aparte workspaces, bewaakt rungebonden voortgangs- en resultaatbestanden, stemt API- en datacontracten af vóór frontend- en mobilewerk en eindigt met QA-review. De handmatige tegenhanger van `oma-orchestration`. |

### Zoeken, retrospectief en documentverwerking

| Agent | Rol | Belangrijkste mogelijkheden |
|-------|------|-----------------|
| **oma-search** | Intentgebaseerde zoekrouter | Routeert queries naar Context7 (docs), native websearch, `gh`/`glab` (code) en lokale code-intelligence (Gortex of Serena). Geeft domeinvertrouwensscores aan alle niet-lokale resultaten. Fail-forward-routing (docs→web→fetch). Flags: `--docs`, `--code`, `--web`, `--strict`, `--wide`, `--gitlab`. |
| **oma-recap** | Tooloverkoepelend werkretrospectief | Analyseert conversatiegeschiedenissen van Grok, Claude, Codex, Gemini, Qwen, Cursor en Antigravity. Lost natuurlijke-taalinvoer voor datum/venster op, groepeert op tool+sessie, extraheert thema's, rendert dagelijkse/periode-samenvattingen en registreert wanneer de CLI een gevraagd venster tot 30 dagen beperkt. |
| **oma-hwp** | HWP/HWPX/HWPML → Markdown | Conversie van Koreaanse tekstverwerkersdocumenten via `bunx kordoc@latest`. Behoudt koppen, tabellen (ook geneste), voetnoten, hyperlinks en afbeeldingen. Verwijdert Hancom Private Use Area-tekens via de nabewerker `flatten-tables.ts`. |
| **oma-pdf** | PDF → Markdown | Conversie van PDF-documenten via `uvx opendataloader-pdf`. Behoudt koppen, tabellen, lijsten en afbeeldingen; hybride OCR-modus voor gescande PDF's; output genormaliseerd met `uvx mdformat`. |

### Academisch en onderzoeksgericht schrijven

| Agent | Rol | Belangrijkste mogelijkheden |
|-------|------|-----------------|
| **oma-academic-writing** | Publicatieklare Engelse proza | Schrijft, herziet en controleert essays, rapporten, executive summaries, conclusies en literatuurreviews. Handhaaft vier protocollen tegelijk: zinstructuur (4 typen, afwisselende lengte/openers), werkwoorden (verboden generieke werkwoorden vervangen vanuit een getrapt academisch corpus), hedging (sterkte afgestemd op bewijs) en anti-AI-compliance. Rubric-gate met quote vóór oordeel, Claim-Evidence Map en reverse outlining. Modi: `draft` / `revise` / `review`. |
| **oma-scholar** | Sidecar voor onderzoekspapers | Zoekt, genereert, valideert, reviewt en vergelijkt academische papers via de Knows `.knows.yaml`-sidecarspecificatie (v0.9.0 / `paper@1`). Tokenzuinige toegang tot claims/evidence/relations (~700 tokens alleen voor claims tegenover ~10K voor de volledige PDF). CLI: `oma scholar search/resolve/get/lint` tegen knows.academy, met automatische OpenAlex-fallback voor papers van vóór 2026. Anti-fabrication: onbekende velden worden weggelaten in plaats van ingevuld. |

### Beveiliging

| Agent | Rol | Belangrijkste mogelijkheden |
|-------|------|-----------------|
| **oma-deepsec** | Driver voor agentgebaseerde kwetsbaarheidsscanner | Stuurt Vercels `deepsec` (`bunx deepsec`) end-to-end aan: voert `init` uit voor de `.deepsec/`-workspace, schrijft een projectspecifiek `INFO.md`, voert kostenbewuste `scan`/`process`/`triage`/`revalidate`/`export`-passes uit, gate PR's via `process --diff` met een two-job-CI-patroon en schrijft eigen matchers. Kalibreert met `--limit 50 --concurrency 5` vóór een grote pass en noemt vóór betaald werk een dollarprognose; de kosten variëren met repositorygrootte en backend. Agent-backends: `codex` (gpt-5.5) of `claude` (claude-opus-4-8). |

### Documentatie en metatooling

| Agent | Rol | Belangrijkste mogelijkheden |
|-------|------|-----------------|
| **oma-docs** | Detector voor documentatiedrift | `verify`-modus controleert `docs/**/*.md` deterministisch op gebroken verwijzingen (bestandspaden, CLI-commando's, configuratiesleutels, omgevingsvariabelen en scripts) en eindigt met 0/1; `sync`-modus koppelt een git-diff aan kandidaatdocumenten en stelt host-LLM-patches voor die per document worden bevestigd (nooit automatisch toegepast). URL-controle wordt gedelegeerd aan `lychee`; de CLI geeft gestructureerde JSON uit en de host-LLM doet alle synthese (zonder vendor-SDK-aanroepen). Wijzigt `.agents/` nooit. |
| **oma-skill-creation** | Specialist in SSL-lite-skillauthoring | Maakt, werkt bij en controleert OMA-skills in het SSL-lite-formaat met de vier verplichte secties (Scheduling / Structural Flow / Logical Operations / References). Classificeert het skilltype, voegt precies één inline canoniek pad toe, handhaaft `When NOT to use`-cross-routes en verplaatst lange variantdetails naar `resources/`. Voert `oma skill audit` uit om botsingen in routeringsbeschrijvingen te detecteren (waarschuwing ≥ 60%, fout ≥ 75% TF-IDF-cosinus). |
| **oma-explanation** | Uitlegger van codewijzigingen | Zet een diff, PR, branch of commitbereik om in een zelfstandige offline HTML-uitleg met secties Background, Intuition, Code en Quiz. De `/explain`-workflow valideert het eindartefact en schrijft het onder `.agents/results/explain/`. |

### Marktonderzoek

| Agent | Rol | Belangrijkste mogelijkheden |
|-------|------|-----------------|
| **oma-market** | Inlichtingen uit communitysignalen | Voert de upstream `last30days`-engine uit (Reddit met echte upvotes en comments, X, YouTube-transcripten, TikTok, HN, Polymarket, GitHub, arXiv, Techmeme, Bluesky, web en meer) via `oma market run`; oma gebruikt altijd de nieuwste engine-release (`~/.cache/oma-market/`), gate elke run met `detect-trap`, classificeert intentie (pijn / trend / concurrent / discovery) en voegt SWOT-, Porter's 5F- en PESTEL-secties toe. Schrijft één LAW-conforme briefing naar `.agents/results/market/{slug}-{YYYYMMDD}.md`. |

### Media en contentgeneratie

| Agent | Rol | Belangrijkste mogelijkheden |
|-------|------|-----------------|
| **oma-image** | Multi-vendor-router voor afbeeldingen | Authentication-aware parallel dispatch naar Codex (`gpt-image-2` via ChatGPT OAuth, CLI-first), Antigravity-Gemini-familie "nano-banana"-modellen via de `agy` CLI + Gemini Code Assist en Pollinations (gratis `flux`/`zimage`). Verduidelijkings-/amplificatieprotocol vóór generatie, maximaal 10 referentiebeelden, kostenbeveiliging (bevestiging vanaf ≥ $0.20), `manifest.json` voor reproduceerbaarheid. CLI: `oma image generate`, `oma image doctor` en `oma image vendor list`. |
| **oma-slide** | Generator voor animatierijke HTML-decks | Genereert onderscheidende, anti-"AI slop"-presentatiedecks op een vast 1920×1080-podium, valideert deterministisch geometrie, bundelt naar één HTML-bestand en exporteert via de `oma slide`-CLI naar PDF/PNG/PPTX. Stijlpresets + vette templates, CJK→Pretendard-regel, `prefers-reduced-motion` + zichtbare focus vereist, maximaal 3 automatische validatie-fixes. Delegeert afbeeldingen aan `oma-image`; optionele Canva-MCP-export/import. |
| **oma-video** | Router voor shorts, explainers en demo's | Maakt shorts/reels (9:16), explainers (16:9) en door mensen opgenomen demo's (16:9) via de `oma video`-CLI. De deterministische asset-bus (`script.json` → `timing.json` → `render-spec.json`) voedt een beheerde HyperFrames-compositor; assetproviders mogen lokale fallbacks gebruiken, maar een ontbrekende compositie/toolchain of renderfout laat de run mislukken. Bij menselijke capture worden credentials nooit geautomatiseerd. |
| **oma-voice** | Lokale TTS en STT | Stuurt de Voicebox-MCP-server aan voor on-device notificaties, asset-TTS en transcriptie zonder cloudcalls of kosten per call. TTS gebruikt standaard WAV en kan lokaal naar MP3 worden getranscodeerd; transcriptie accepteert audiopaden of base64. TTS-calls zijn beperkt tot 5000 tekens en STT-input tot 30 minuten; persistente asset-/transcriptieruns schrijven een manifest. |

---

## Model voor progressieve onthulling

oh-my-agent gebruikt een skillarchitectuur met twee lagen om uitputting van het contextvenster te voorkomen:

**Laag 1: SKILL.md (~3.100 tokens mediaan, geladen wanneer de skill wordt gerouteerd)**
Bevat de identiteit van de agent, routeringsvoorwaarden, kernregels en richtlijnen voor "when to use / when NOT to use". Dit is alles wat wordt geladen wanneer de agent niet actief werkt.

**Laag 2: resources/ (on demand geladen)**
Bevat uitvoeringsprotocollen, techstackreferenties, codefragmenten, foutoplossingshandleidingen, checklists en voorbeelden. Deze worden alleen geladen wanneer de agent wordt aangeroepen, en dan alleen de resources die relevant zijn voor het specifieke taaktype (op basis van de moeilijkheidsinschatting en de mapping van taak naar resource in `context-loading.md`).

Gemeten over een sessie met 5 agenten levert dit ongeveer 17-19K tokens aan skillcontext op voor een Simple- of Medium-taak tegenover een plafond van 72K — ongeveer 75% van het maximum blijft ongebruikt, en bij Complex-taken die stackreferenties laden daalt dat tot ongeveer 47%. Zie [de berekening van tokensparing](../core-concepts/skills.md#token-savings-math) voor de gemeten tabel en het script waarmee je die reproduceert.

---

## .agents/: de single Source of Truth (SSOT)

Alles wat oh-my-agent nodig heeft, staat in de directory `.agents/`:

```
.agents/
├── oma-config.yaml         # Shared preferences and provider/model settings
├── oma-config.cue          # Optional schema-backed configuration
├── skills/                 # 33 skill directories + _shared resources
│   ├── _shared/            # Core resources used by all agents
│   └── oma-{skill}/         # Per-skill SKILL.md + resources/variants
├── workflows/              # 21 workflow definitions
├── agents/                 # 12 subagent definitions
├── results/plan-{sessionId}.json               # Generated plan output
├── state/                  # Active workflow state files
├── results/                # Agent result files
└── mcp.json                # MCP server configuration
```

De directory `.claude/` bestaat alleen als IDE-integratielaag. Deze bevat symlinks terug naar `.agents/` en hooks voor trefwoorddetectie en de HUD-statusregel. De directory `.agents/state/memories/` bevat runtime-coördinatiestatus tijdens orchestratiesessies; oudere projecten kunnen terugvallen op de legacy-directory `.serena/memories/`.

Dat betekent dat je agentconfiguratie:
- **Draagbaar** is: wissel van IDE zonder opnieuw te configureren
- **Versiebeheerd** is: commit `.agents/` samen met je code
- **Deelbaar** is: teamleden krijgen dezelfde agentconfiguratie

---

## Ondersteunde IDE's en CLI-tools

oh-my-agent werkt met de geselecteerde AI-aangedreven IDE's en CLI's via hun native skill-/prompt-loading of gegenereerde integratiebestanden:

| Tool | Integratiemethode | Parallelle agenten |
|------|-------------------|-------------------|
| **Claude Code** | Native skills + Agent-tool | Task-tool voor echt parallelisme |
| **Antigravity CLI/IDE** | Skills en MCP-instellingen geprojecteerd voor `agy` | `oma agent spawn` |
| **Codex CLI** | Skills automatisch geladen | Door het model gemedieerde parallelle verzoeken |
| **Cursor** | Skills via `.cursor/`-integratie | Handmatig spawnen |
| **OpenCode** | Skills + in-process plugin bridge + gegenereerde subagenten (`.opencode/agents/`) | `oma agent spawn --vendor opencode` |
| **Kimi Code CLI** | Hooks + skills in `~/.kimi-code/` (toestemming vereist voor schrijven naar HOME; leest SSOT `.agents/skills/` ook native); projectgebonden Serena MCP | `oma agent spawn --vendor kimi` |

Agent-spawning past zich aan elke geselecteerde leverancier aan via leveranciersdetectie en de actieve configuratie. Runtimes van dezelfde leverancier kunnen native subagenten gebruiken; cross-vendor werk valt terug op `oma agent spawn`. Zie [Parallelle uitvoering](../core-concepts/parallel-execution.md) voor de dispatchregels.

---

## Het skillrouteringssysteem

Wanneer je een prompt verstuurt, bepaalt oh-my-agent welke agent de taak afhandelt via de skillrouteringskaart (`.agents/skills/_shared/core/skill-routing.md`):

| Domeintrefwoorden | Gerouteerd naar |
|-------------------|----------------|
| API, endpoint, REST, GraphQL, database, migration | oma-backend |
| auth, JWT, login, register, password | oma-backend |
| UI, component, page, form, screen (web) | oma-frontend |
| style, Tailwind, responsive, CSS | oma-frontend |
| mobile, iOS, Android, Flutter, React Native, Swift, SwiftUI, app | oma-mobile |
| bug, error, crash, broken, slow | oma-debug |
| review, security, performance, accessibility | oma-qa |
| UI design, design system, landing page, DESIGN.md | oma-design |
| brainstorm, ideate, explore, idea | oma-brainstorm |
| plan, breakdown, task, sprint | oma-pm |
| automatic, parallel, orchestrate | oma-orchestration |

Voor complexe verzoeken over meerdere domeinen volgt de routering vaste uitvoeringsvolgorden. Zo wordt "Create a fullstack app" gerouteerd naar: oma-pm (plan), daarna oma-backend + oma-frontend (parallelle implementatie) en daarna oma-qa (review).

---

## HUD-statusregel

Wanneer je Claude Code gebruikt, toont oh-my-agent een permanente statusindicator `[OMA]` in de statusbalk met:
- De modelnaam (bijvoorbeeld Opus, Sonnet)
- Contextgebruik met kleurcodering (groen < 70%, geel 70-85%, rood > 85%)
- De actieve workflowstatus (als een persistente workflow draait)

De HUD wordt aangedreven door `.claude/hooks/hud.ts` met de `statusLine`-hookfunctie van Claude Code.

---

## Automatische workflowdetectie

Je hoeft `/command` niet te typen om workflows te activeren. Het hooksysteem van oh-my-agent scant je invoer in natuurlijke taal tegen triggerwoorden in `.agents/hooks/core/triggers.json` (ingebouwd in het `oma`-binary en gedeeld door elke leverancier), met ondersteuning voor 11 talen (Engels, Koreaans, Japans, Chinees, Spaans, Frans, Duits, Portugees, Russisch, Nederlands en Pools).

- **Actiegerichte invoer** (bijvoorbeeld "plan the auth feature") laadt automatisch de workflow
- **Informatieve invoer** (bijvoorbeeld "what is orchestrate?") wordt eruit gefilterd; er wordt geen workflow geactiveerd
- **Expliciete `/command`**: de hook slaat detectie over om dubbele activatie te voorkomen
- **Persistente workflows** injecteren context opnieuw bij elk bericht totdat je "workflow done" zegt

Elk hookevent wordt afgeleverd via de canonieke `oma hook run`-ABI: de leverancier roept `oma-hook.sh --vendor <v> --event <nativeEvent>` aan, waarna de in-process-handlerketen wordt uitgevoerd en de leveranciersspecifieke dialectvorm naar stdout wordt geschreven (altijd exit 0, fail-open).

---

## Cross-vendorondersteuning

oh-my-agent is niet beperkt tot Claude Code. Leveranciers met hooks delen dezelfde `oma hook run`-ABI, terwijl extension-leveranciers hun in-process bridge gebruiken:

| Leverancier | Hookaflevering | StatusLine |
|---------|--------------|------------|
| **Claude Code** | `oma-hook.sh --vendor claude --event UserPromptSubmit` / `PreToolUse` / `Stop` | `bun .claude/hooks/hud.ts` (direct, ongewijzigd) |
| **Codex CLI** | `oma-hook.sh --vendor codex --event UserPromptSubmit` / `PreToolUse` / `Stop` | — |
| **Qwen Code** | `oma-hook.sh --vendor qwen --event UserPromptSubmit` / `PreToolUse` / `Stop` | `bun`-pad via `ui.statusLine` |
| **Cursor** | `oma-hook.sh --vendor cursor --event beforeSubmitPrompt` / `preToolUse` | — |
| **Grok** | `oma-hook.sh --vendor grok --event UserPromptSubmit` / `Stop` | — |
| **Kiro** | `oma-hook.sh --vendor kiro --event userPromptSubmit` / `preToolUse` / `stop` | — |
| **Kimi Code** | `oma-hook.sh --vendor kimi --event UserPromptSubmit` / `PreToolUse` / `Stop` (alleen globale TOML `[[hooks]]` in `~/.kimi-code/config.toml`) | — |
| **Antigravity** | `oma-hook.sh --vendor antigravity --event PreInvocation` / `PreToolUse` / `Stop` | — |
| **pi** | In-process bridge (`installPiExtension`) — niet via `oma hook run` | — |

De directory `.agents/` blijft de bron van waarheid. De installatie linkt de skills, workflows, hooks en agentdefinities die je selecteert, of projecteert ze naar de leveranciers die je selecteert; mogelijkheden verschillen per leverancier. Zowel native subagenten van dezelfde leverancier als cross-vendoragenten die via de CLI worden gestart lezen uit die bron.

---

## Wat volgt

- **[Installatie](./installation.md)**: drie installatiemethoden, presets, CLI-setup en verificatie
- **[Agenten](/docs/core-concepts/agents)**: uitgebreide uitleg van de 33 skills, 13 dispatchrollen en charter preflight
- **[Skills](/docs/core-concepts/skills)**: uitleg van de architectuur met twee lagen
- **[Workflows](/docs/core-concepts/workflows)**: alle 21 workflows met triggers en fasen
- **[Gebruiksgids](/docs/guide/usage)**: praktijkvoorbeelden van enkele taken tot volledige orchestratie
