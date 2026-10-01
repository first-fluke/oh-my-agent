---
title: "Gids: Multi-agentprojecten"
sidebar_label: Multi-agentprojecten
description: Volledige gids voor het coördineren van meerdere domeinagents voor frontend, backend, database, mobile en QA, van planning tot merge.
---

# Gids: Multi-agentprojecten

## Wanneer gebruik je multi-agentcoördinatie?

Je feature beslaat meerdere domeinen: backend-API + frontend-UI + databaseschema + mobileclient + QA-review. Eén agent kan de volledige scope niet uitvoeren. De domeinen moeten parallel vooruitgaan zonder elkaars bestanden te overschrijven.

Multi-agentcoördinatie is de juiste keuze wanneer:

- De taak 2 of meer domeinen omvat (frontend, backend, mobile, db, QA, debug, pm).
- Er API-contracten tussen domeinen zijn (bijvoorbeeld een REST-endpoint dat zowel door web als mobile wordt gebruikt).
- Je parallelle uitvoering wilt gebruiken om de doorlooptijd te verkorten.
- Je na de implementatie een QA-review over alle domeinen nodig hebt.

Als je taak volledig binnen één domein past, gebruik je rechtstreeks de specifieke agent.

---

## De volledige reeks: van /plan tot /review

De aanbevolen multi-agentworkflow volgt een vaste pipeline met vier stappen.

### Stap 1: /plan voor requirements en taakdecompositie

De workflow `/plan` draait inline (zonder subagents te starten) en maakt een gestructureerd plan.

```
/plan
```

Wat er gebeurt:

1. **Requirements verzamelen:** De PM-agent vraagt naar doelgebruikers, kernfeatures, beperkingen en deploymentdoelen.
2. **Technische haalbaarheid analyseren:** Gebruikt de geconfigureerde code-intelligenceprovider om herbruikbare code en architectuurpatronen in de bestaande codebase te vinden. Native search is alleen voor paden buiten het project of genegeerde paden.
3. **API-contracten definiëren:** Ontwerpt endpointcontracten (methode, pad, request-/responseschema's, auth en foutresponses) en slaat ze op in `.agents/results/api-contracts/` (runartefacten). Duurzame specs worden gepromoveerd naar `docs/plans/contracts/` wanneer ze worden gecommit.
4. **Opsplitsen in taken:** Deelt het project op in uitvoerbare taken, elk met een toegewezen agent, titel, acceptatiecriteria, prioriteit (P0–P3) en afhankelijkheden.
5. **Plan met de gebruiker reviewen:** Presenteert het volledige plan ter bevestiging. De workflow gaat pas verder na expliciete goedkeuring.
6. **Plan opslaan:** Schrijft het goedgekeurde plan naar `.agents/results/plan-{sessionId}.json` en legt een samenvatting vast in het geheugen.

De output `.agents/results/plan-{sessionId}.json` is de input voor zowel `/work` als `/orchestrate`.

### Stap 2: /work of /orchestrate voor uitvoering

Je hebt twee uitvoeringspaden:

| Aspect | /work | /orchestrate |
|:-------|:------|:-------------|
| **Interactie** | Interactief (de gebruiker bevestigt elke fase) | Geautomatiseerd (draait tot voltooiing) |
| **PM-planning** | Ingebouwd (stap 2 draait de PM-agent) | Laadt een bestaand plan; maakt er inline één wanneer het ontbreekt |
| **Checkpoint met gebruiker** | Na review van het plan (stap 3) | Het inline plan passeert nog steeds de reviewgate vóór de fan-out |
| **Persistente modus** | Ja (kan niet worden beëindigd voordat alles klaar is) | Ja (kan niet worden beëindigd voordat alles klaar is) |
| **Geschikt voor** | Eerste gebruik en complexe projecten die toezicht nodig hebben | Herhaalde runs en duidelijk afgebakende taken |

#### /work: interactieve multi-agentpipeline

```
/work
```

1. Analyseert het verzoek van de gebruiker en identificeert de betrokken domeinen.
2. Start de PM-agent voor taakdecompositie (maakt `plan-{sessionId}.json`).
3. Presenteert het plan ter bevestiging. **Blokkeert tot bevestiging.**
4. Start agents per prioriteitstier (eerst P0, daarna P1 enzovoort); taken met dezelfde prioriteit draaien parallel.
5. Monitort de voortgang van agents via memorybestanden.
6. Start een QA-agentreview over alle deliverables (OWASP Top 10, performance, toegankelijkheid en codekwaliteit).
7. Als QA CRITICAL- of HIGH-problemen vindt, start de verantwoordelijke agent opnieuw met de bevindingen. Dit gebeurt maximaal 2 keer per probleem. Als hetzelfde probleem blijft bestaan, activeert de workflow de **Exploration Loop**: genereert 2–3 alternatieve aanpakken, start hetzelfde agenttype met verschillende hypotheseprompts in afzonderlijke workspaces, laat QA elke aanpak scoren en neemt de beste uitkomst over.

#### /orchestrate: geautomatiseerde parallelle uitvoering

```
/orchestrate
```

1. Laadt `.agents/results/plan-{sessionId}.json`, en maakt inline een plan via `/plan` wanneer er geen bruikbaar planbestand is.
2. Initialiseert een sessie met een ID in de vorm `session-YYYYMMDD-HHMMSS`.
3. Maakt `orchestrator-session.md` en `task-board.md` in de memorydirectory.
4. Start agents per prioriteitstier; elke agent ontvangt de taakomschrijving, API-contracten en context.
5. Monitort de voortgang door `progress-{agent}.md` te pollen.
6. Verifieert elke voltooide agent via `verify.sh`. PASS (exit 0) accepteert het resultaat; FAIL (exit 1) start opnieuw met foutcontext (maximaal 2 retries). Aanhoudende mislukking activeert de Exploration Loop.
7. Verzamelt alle `result-{agent}.md`-bestanden en stelt een eindrapport samen.

### Stap 3: agent spawn voor CLI-agentbeheer

Het commando `agent spawn` is het low-levelmechanisme dat workflows intern gebruiken. Je kunt het ook rechtstreeks gebruiken:

```bash
oma agent spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

**Alle flags:**

| Flag | Beschrijving |
|:-----|:-------------|
| `--vendor <vendor>` | Overschrijving van de CLI-vendor (antigravity/claude/codex/cursor/opencode/qwen/grok/pi). Overschrijft de modelresolutie voor deze spawn. |
| `-w, --workspace <path>` | Werkdirectory voor de agent. Wordt automatisch uit de monorepo-configuratie afgeleid als deze ontbreekt. |
| `--task-id <id>` | Koppelt de spawn aan een taak in het sessieplan; standaard de agent-ID. |
| `--isolation worktree` | Maakt een git-worktree voor de spawn; standaard is er geen extra isolatie. |
| `--read-only` | Beperkt het child tot inspectietools en onderdrukt auto-approveflags. |

**Volgorde voor vendorresolutie** (eerste match wint):

1. De `--vendor`-flag op de commandoregel
2. De `agents:`-override in `oma-config.yaml` voor deze agent
3. De standaardagenten van de actieve `model_preset`

Zie [Per-Agent Models](./per-agent-models.md) voor configuratiedetails.

**Automatische workspace-detectie** controleert monorepo-configuraties in deze volgorde: `pnpm-workspace.yaml`, `package.json` workspaces, `lerna.json`, `nx.json`, `turbo.json`, `mise.toml`. Elke workspacedirectory krijgt een score op basis van trefwoorden voor het agenttype (zoals "web", "frontend", "client" voor de frontendagent). Als er geen monorepo-configuratie wordt gevonden, valt de detectie terug op vaste kandidaten zoals `apps/web`, `apps/frontend`, `frontend/` enzovoort.

**Promptresolutie:** Het argument `<prompt>` kan inline tekst of een bestandspad zijn. Als het pad naar een bestaand bestand verwijst, worden de inhoud ervan als prompt gebruikt. De CLI injecteert ook vendorspecifieke uitvoeringsprotocollen uit `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`.

### Stap 4: /review voor QA-verificatie

```
/review
```

De reviewworkflow voert een volledige QA-pipeline uit:

1. **Scope bepalen:** Vraagt wat er moet worden gereviewd (specifieke bestanden, een featurebranch of het hele project).
2. **Geautomatiseerde securitycontroles:** Voert `npm audit`, `bandit` of het equivalent uit.
3. **Handmatige review volgens OWASP Top 10:** Injection, broken auth, gevoelige data, toegangscontrole, misconfiguratie, onveilige deserialisatie, kwetsbare componenten en onvoldoende logging.
4. **Performanceanalyse:** N+1-queries, ontbrekende indexen, onbegrensde paginering, memory leaks, onnodige rerenders en bundelgroottes.
5. **Toegankelijkheid:** WCAG 2.1 AA, inclusief semantische HTML, ARIA, toetsenbordnavigatie, kleurcontrast en focusbeheer.
6. **Codekwaliteit:** Naamgeving, foutafhandeling, testdekking, TypeScript strict mode, ongebruikte imports en async/await-patronen.
7. **Rapport:** Bevindingen worden ingedeeld als CRITICAL / HIGH / MEDIUM / LOW met `file:line`, beschrijving en herstelcode.

Voor grote scopes delegeert de workflow aan de QA-agent. Met de optie `--fix` start een Fix-Verify Loop: domeinagents lossen CRITICAL/HIGH-problemen op, de review wordt opnieuw uitgevoerd en dit herhaalt zich maximaal 3 keer.

---

## Sessie-ID-strategie

Elke orchestratiesessie krijgt een unieke identifier in de vorm:

```
session-YYYYMMDD-HHMMSS
```

Voorbeeld: `session-20260324-143052`

De sessie-ID wordt gebruikt voor:

- Memorybestanden (`orchestrator-session.md`, `task-board.md`)
- Het volgen van agentprocessen via PID-bestanden in de tijdelijke systeemdirectory (`/tmp/subagent-{session-id}-{agent-id}.pid`)
- Het koppelen van logbestanden (`/tmp/subagent-{session-id}-{agent-id}.log`)
- Het groeperen van resultaten in `.agents/results/parallel-{timestamp}/`

De sessie-ID wordt in stap 2 van `/orchestrate` gegenereerd en aan alle gestarte agents doorgegeven. Zo kunnen alle agents, logs en PID's van één run worden teruggevoerd naar die run.

---

## Workspace-toewijzing per domein

Elke agent wordt gestart in een geïsoleerde workspace om bestandsconflicten te voorkomen. De toewijzing volgt deze regels:

### Automatische detectie

Wanneer `-w` ontbreekt (of op `.` staat), detecteert de CLI de beste workspace door:

1. Monorepo-configuraties te scannen (`pnpm-workspace.yaml`, `package.json`, `lerna.json`, `nx.json`, `turbo.json`, `mise.toml`).
2. Globpatronen (zoals `apps/*`) uit te breiden naar bestaande directories.
3. Elke directory te scoren op basis van trefwoorden voor het agenttype:

| Agenttype | Trefwoorden (in volgorde van prioriteit) |
|:----------|:-----------------------------------------|
| frontend | web, frontend, client, ui, app, dashboard, admin, portal |
| backend | api, backend, server, service, gateway, core |
| mobile | mobile, ios, android, native, rn, expo |

4. De directorynaam exact te vergelijken (score 100), daarna matches in de naam (score 50) en matches in het pad (score 25).
5. De directory met de hoogste score te kiezen.

### Terugvalkandidaten

Als er geen monorepo-configuratie bestaat, controleert de CLI deze paden in deze volgorde:

- **frontend:** `apps/web`, `apps/frontend`, `apps/client`, `packages/web`, `packages/frontend`, `frontend`, `web`, `client`
- **backend:** `apps/api`, `apps/backend`, `apps/server`, `packages/api`, `packages/backend`, `backend`, `api`, `server`
- **mobile:** `apps/mobile`, `apps/app`, `packages/mobile`, `packages/app`, `mobile`, `app`

Als niets matcht, draait de agent in de huidige directory (`.`).

### Expliciete override

Altijd beschikbaar:

```bash
oma agent spawn frontend "Build landing page" session-id -w ./packages/web-app
```

---

## Contract-first-regel

API-contracten zijn het synchronisatiemechanisme tussen agents. De contract-first-regel betekent:

1. **Contracten worden gedefinieerd voordat de implementatie begint.** Stap 3 van de `/plan`-workflow maakt API-contracten aan en slaat ze op in `.agents/results/api-contracts/` (of in `docs/plans/contracts/` voor duurzame specs).

2. **Elke agent ontvangt de relevante contracten als context.** Wanneer `/orchestrate` agents start in stap 3, ontvangt elke agent de taakomschrijving, API-contracten en relevante context.

3. **Contracten definiëren de interfacegrens.** Een contract specificeert:
   - HTTP-methode en pad
   - Schema van de requestbody (met types)
   - Schema van de responsebody (met types)
   - Authenticatievereisten
   - Formaten van foutresponses

4. **Contractschendingen worden tijdens monitoring gevonden.** Stap 5 van `/work` gebruikt de geconfigureerde code-intelligenceprovider om te controleren of API-implementaties overeenkomen tussen agents. Native search is alleen voor paden buiten het project of genegeerde paden.

5. **QA controleert naleving van contracten.** De Alignment Review van de QA-agent (stap 6 in ultrawork) vergelijkt de implementatie systematisch met het plan, inclusief API-contracten.

Zonder contracten kan een backendagent `{ "user_id": 1 }` retourneren terwijl de frontend `{ "userId": 1 }` verwacht. De contract-first-regel voorkomt zulke integratiefouten.

---

## Merge-gates: 4 voorwaarden

Multi-agentwerk is pas klaar wanneer aan vier voorwaarden is voldaan:

### 1. Aangegeven controles slagen

Elke acceptatiecriteria heeft een passende controle en de controles uit het plan slagen. Een build wordt alleen meegenomen wanneer de projectgate dat vereist; het result contract legt de werkelijke argv en exitcode vast.

### 2. Tests slagen

Alle bestaande tests blijven slagen en nieuwe tests dekken de geïmplementeerde functionaliteit. De QA-agent beoordeelt de testdekking als onderdeel van de Code Quality Review.

### 3. Alleen geplande bestanden gewijzigd

Agents wijzigen geen bestanden buiten hun toegewezen scope. De verificatiestap controleert dat alleen bestanden die bij de taak horen zijn veranderd. Zo worden onbedoelde neveneffecten in gedeelde code voorkomen.

### 4. QA-review is schoon

Er blijven geen CRITICAL- of HIGH-bevindingen over uit de QA-review. MEDIUM- en LOW-bevindingen mogen voor toekomstige sprints worden gedocumenteerd, maar blockers moeten worden opgelost.

In de ultrawork-workflow worden deze voorwaarden expliciete fasepoorten (PLAN_GATE, IMPL_GATE, VERIFY_GATE, REFINE_GATE, SHIP_GATE) met checkboxcriteria die allemaal moeten slagen voordat je doorgaat.

---

## Spawnvoorbeelden

### Eén agent starten

```bash
# Spawn backend agent with Gemini (default)
oma agent spawn backend "Implement /api/users CRUD endpoint per API contract" session-20260324-143000

# Spawn frontend agent with Claude, explicit workspace
oma agent spawn frontend "Build user dashboard with React" session-20260324-143000 --vendor claude -w ./apps/web

# Spawn from a prompt file
oma agent spawn backend ./prompts/auth-api.md session-20260324-143000 -w ./api
```

### Parallelle uitvoering via agent parallel

Met een YAML-takenbestand:

```yaml
# tasks.yaml
tasks:
  - agent: backend
    task: "Implement user authentication API with JWT tokens"
    workspace: ./api
  - agent: frontend
    task: "Build login page and auth flow UI"
    workspace: ./web
  - agent: mobile
    task: "Implement mobile auth screens with biometric support"
    workspace: ./mobile
```

```bash
oma agent parallel tasks.yaml
```

Met inline modus:

```bash
oma agent parallel --inline \
  "backend:Implement user auth API:./api" \
  "frontend:Build login page:./web" \
  "mobile:Implement auth screens:./mobile"
```

Achtergrondmodus (niet wachten):

```bash
oma agent parallel tasks.yaml --no-wait
# Returns immediately, results written to .agents/results/parallel-{timestamp}/
```

Met vendoroverride:

```bash
oma agent parallel tasks.yaml --vendor claude
```

---

## Anti-patronen om te vermijden

### 1. Het plan klakkeloos goedkeuren

`/orchestrate` kan inline een plan maken via `/plan` wanneer er geen bruikbaar planbestand is. Ook dat inline plan doorloopt de reviewgate van `/plan`, waarna de fan-out de goedgekeurde decompositie volgt. Voor grote multi-domeinprojecten is het beter `/plan` vooraf te draaien, zodat je een duurzame tracker in `docs/plans/work/` hebt en ruimte om de decompositie te verfijnen voordat agents starten.

### 2. Overlappende workspaces

Twee agents aan dezelfde workspacedirectory toewijzen. Dit veroorzaakt bestandsconflicten waarbij de wijzigingen van de ene agent die van de andere overschrijven. Gebruik altijd afzonderlijke workspaces.

### 3. API-contracten overslaan

Backend- en frontendagents starten zonder eerst contracten te definiëren. Ze maken dan incompatibele aannames over dataformaten, veldnamen en foutafhandeling.

### 4. QA-bevindingen negeren

QA-review als optioneel behandelen. CRITICAL- en HIGH-bevindingen zijn echte bugs die in productie zichtbaar worden. De workflow dwingt dit af door te blijven loopen totdat er geen blockers meer zijn.

### 5. Handmatige bestandscoördinatie

Agentresultaten handmatig proberen samen te voegen in plaats van de verificatie- en QA-pipeline de integratie te laten afhandelen. De geautomatiseerde pipeline vangt problemen op die een handmatige review mist.

### 6. Te veel parallelliseren

P1-taken starten voordat P0-taken klaar zijn. Prioriteitstiers bestaan omdat P1-taken vaak afhankelijk zijn van P0-resultaten. De workflows handhaven automatisch de volgorde per tier.

### 7. Verificatie overslaan

`agent spawn` rechtstreeks gebruiken zonder daarna het result contract vast te leggen. Voer de vastgelegde controles voor de taak uit en sluit af met een gestructureerde claim; zie [Agentresultaten en hervatten](/docs/guide/agent-results-and-resume). De verificatiestap van de workflow vangt daarna mislukte controles en scope-afwijkingen op voordat resultaten opnieuw worden gebruikt.

---

## Cross-domeinintegratie valideren

Nadat alle agents hun individuele taken hebben afgerond, moet de cross-domeinintegratie worden gevalideerd:

1. **Afstemming van API-contracten:** De geconfigureerde code-intelligenceprovider controleert of backendimplementaties overeenkomen met de contracten die frontend en mobile gebruiken. Native search is alleen voor paden buiten het project of genegeerde paden.

2. **Typeconsistentie:** TypeScript-types, Python-dataclasses en Dart-modellen die tussen domeinen worden gedeeld, gebruiken consistente veldnamen en types.

3. **Authenticatiestroom:** Als de backend JWT-auth implementeert, moet de frontend tokens correct meesturen in headers en moet de mobileapp ze correct opslaan en vernieuwen.

4. **Foutafhandeling:** Alle API-consumers handelen de gedocumenteerde foutresponses af. Als de backend `{ "error": "unauthorized", "code": 401 }` teruggeeft, moeten alle clients dit formaat afhandelen.

5. **Afstemming met databaseschema:** Als de databaseagent migraties maakt, moeten de backend-ORM-modellen exact overeenkomen met het schema.

De Alignment Review van de QA-agent (stap 6 in ultrawork en stap 6 in work) voert deze cross-domeinvalidatie systematisch uit.

---

## Wanneer is het klaar?

Een multi-agentproject is klaar wanneer:

- Alle agents in alle prioriteitstiers succesvol zijn afgerond.
- Verificatiescripts voor elke agent slagen (exitcode 0).
- De QA-review nul CRITICAL- en nul HIGH-bevindingen meldt.
- De afstemming van cross-domein-API-contracten is bevestigd.
- De build slaagt en alle tests slagen.
- Het eindrapport in memory is geschreven en aan de gebruiker is gepresenteerd.
- De gebruiker finale goedkeuring geeft (in `/work` en de SHIP_GATE van ultrawork).
