---
title: Workflows
description: Volledige referentie voor alle 20 oh-my-agent-workflows, met slashcommando's, persistente en niet-persistente modi, trigger-keywords in 11 talen, fasen en stappen, gelezen en geschreven bestanden, autodetectie via triggers.json en keyword-detector.ts, filtering van informatieve patronen en statebeheer voor persistente modi.
---

# Workflows

Workflows zijn processen met meerdere stappen die door slashcommando's worden gestart; de vier persistente modi starten ook wanneer een gewoon verzoek ze bij naam noemt. Ze beschrijven hoe agenten taken uitvoeren, van eenstapstaken tot kwaliteitsworkflows met vijf fasen.

OMA heeft 20 workflows; 4 zijn [persistent](../getting-started/glossary.md#persistent-workflow) en bewaren status tussen beurten.

## Workflows in één oogopslag

| Workflow | Gebruik voor | Persistent |
|---|---|---|
| [`/orchestrate`](#orchestrate) | Geautomatiseerde parallelle agentuitvoering op basis van een plan, met verificatielussen | Ja |
| [`/work`](#work) | Stapsgewijze coördinatie over meerdere domeinen: plannen, implementeren, QA, herstellen | Ja |
| [`/ultrawork`](#ultrawork) | De kwaliteitsworkflow met 5 fasen en 12 geïsoleerde reviewstappen | Ja |
| [`/ralph`](#ralph) | Ultrawork herhalen tot mechanisch verifieerbare criteria slagen | Ja |
| [`/plan`](#plan) | PM-taakopdeling met afhankelijkheden en API-contracten | Nee |
| [`/brainstorm`](#brainstorm) | Design-first ideevorming vóór de planning | Nee |
| [`/architecture`](#architecture) | Architectuurbeslissingen, reviews en ADR's | Nee |
| [`/deepinit`](#deepinit) | AGENTS.md, ARCHITECTURE.md en `docs/` genereren voor een bestaande codebase | Nee |
| [`/review`](#review) | QA-review: security, prestaties, toegankelijkheid, codekwaliteit | Nee |
| [`/security`](#security) | Securityscans van broncode, agentskills en MCP-componenten; validatie van bevindingen; CI-gates | Nee |
| [`/debug`](#debug) | Bugdiagnose en -fix met een regressietest | Nee |
| [`/design`](#design) | Designbevindingen, DESIGN.md, een herontwerprichting of designtokens | Nee |
| [`/scm`](#scm) | Git-bewerkingen en Conventional Commits | Nee |
| [`/convert`](#convert) | Documenten en media tussen formaten converteren | Nee |
| [`/docs`](#docs) | Documentatiedrift detecteren en synchroniseren | Nee |
| [`/recap`](#recap) | Dagelijkse of periodieke werkrecap over AI-tools heen | Nee |
| [`/stack-set`](#stack-set) | Stackspecifieke referenties voor een domeinskill | Nee |
| [`/video`](#video) | MP4-generatie via de skill `oma-video` | Nee |
| [`/schedule`](#schedule) | Terugkerende, tijdgebonden agentjobs | Nee |
| [`/explain`](#explain) | Een interactieve HTML-uitleg van een codewijziging of een onderwerp | Nee |

---

## Een skill of workflow kiezen {#choosing-a-skill-or-workflow}

Kies op basis van de coördinatie en verificatie die de taak nodig heeft. Heb je al een workflow gekozen, volg die dan; ga door met een actieve workflow totdat je die expliciet annuleert of wijzigt. Gebruik voor een nieuwe taak zonder gekozen workflow deze gids:

| Wat de taak nodig heeft | Kies | Voorbeeld |
|---|---|---|
| Eén domein zonder agentcoördinatie | [Single skill](/docs/guide/single-skill) | Een API-endpoint toevoegen en de validatie testen |
| Meerdere domeinen met stapsgewijze planning, implementatie en QA | `/work` | Een API-wijziging coördineren met web- en mobileclients |
| Onafhankelijke taken automatisch parallel delegeren | `/orchestrate` | Backend- en frontendtaken parallel uitvoeren nadat afhankelijkheden zijn opgelost |
| Expliciet gevraagde uitgebreide kwaliteitsaanpak | `/ultrawork` | Volledige reviews voor planning, implementatie, verificatie, verfijning en releasegereedheid uitvoeren |
| Expliciet gevraagd herhalen tot mechanisch verifieerbare criteria slagen | `/ralph` | Implementatie en verificatie door de judge herhalen tot de opgegeven regressiechecks slagen, binnen de lusbeveiligingen |

`/orchestrate` laadt een bruikbaar plan of maakt er een via `/plan` voordat agenten worden gespawnd. `/plan` vooraf draaien is dus niet nodig. Een bestaand plan onderscheidt `/work` niet van `/orchestrate`; kies op basis van de gewenste coördinatie. Beide kunnen onafhankelijke taken parallel uitvoeren.

Acceptatiecriteria en tests horen ook bij single-skilltaken. Alleen hun aanwezigheid activeert `/ralph` niet: elke Ralph-iteratie voert het volledige ultraworkproces en een judge-ronde uit. Kies Ralph dus wanneer je die herhaalde verificatielus wilt. Safeguards kunnen de workflow met onvolledig of geblokkeerd werk laten stoppen.

Deze tabel is advies voor selectie en geen automatische router. De hostagent kan een passende aanpak adviseren; een workflow aanbevelen of uitleggen start hem niet. Een slashcommando selecteert er expliciet één. Wanneer de keyword-detection-hook aanstaat, kunnen overeenkomende geconfigureerde keywords of patronen er ook één activeren, onder voorbehoud van de filters voor informatieve vragen. De detector classificeert niet hoeveel domeinen een verzoek heeft, controleert niet of een plan klaar is en gebruikt de tabel niet als prioriteitsalgoritme.

Planreview hergebruikt de autorisatie die al voor de taak is gegeven. Agenten vragen alleen naar een materiële ontbrekende beslissing of een actie buiten die scope. Een release-readinessreview geeft op zichzelf geen toestemming om te publiceren of te deployen.

---

## Persistente workflows {#persistent-workflows}

Persistente workflows blijven lopen totdat alle taken klaar zijn. Ze bewaren state in `.agents/state/` en injecteren bij elk gebruikersbericht opnieuw context met `[OMA PERSISTENT MODE: ...]` totdat ze expliciet worden gedeactiveerd.

De persistente modus start alleen bij een **expliciete aanroep**: het slashcommando van de workflow (`/ultrawork`, of een vorm met namespace zoals `/oma:ultrawork`), of de eigen naam van de workflow in gewone tekst (de lijst `explicit` in `triggers.json`: "orchestrate" en de daar vermelde vertalingen, "ultrawork"/"ulw", "work mode"/"work workflow", "ralph"/"랄프"). De keyword-hook opent een workflow niet vanuit een andere zin.

### /orchestrate

**Beschrijving:** Geautomatiseerde parallelle agentuitvoering via de CLI. Spawnt subagenten via de CLI, coördineert via duurzame runstate en receipts, bewaakt voortgang en draait verificatielussen.

**Persistent:** Ja. Statusbestand: `.agents/state/orchestrate-state-{sessionId}.json`.

**Trigger-keywords:**
| Taal | Keywords |
|----------|----------|
| Explicit (persistent) | "orchestrate", "オーケストレート", "orquestar", "orchestrer", "orchestrieren", "orquestrar", "оркестровать", "orkestreren", "orkiestrować" |

Zinnen als "do everything", "전부 해줘" of "build me an app" starten deze workflow niet.

**Stappen:**
1. **Stap 0, Preparation:** Lees de coördinatieskill, context-loading guide en memory protocol. Detecteer de vendor.
2. **Stap 1, Load/Create Plan:** Controleer `.agents/results/plan-{sessionId}.json` en daarna het meest recente `plan-*.json`. Is er geen plan — of is het plan niet uitvoeringsklaar (taak mist agent, prioriteitstier, afhankelijkheden of acceptatiecriteria) — delegeer dan inline naar `/plan` om er één te maken met dezelfde sessie-ID. Presenteer het plan, hergebruik bestaande autorisatie en vraag alleen vóór delegatie naar een materiële ontbrekende beslissing of nieuwe autorisatie.
3. **Stap 2, Initialize Session:** Laad `oma-config.yaml`, toon de CLI-mappingstabel en hergebruik de sessie-ID uit het plan of genereer er één (`session-YYYYMMDD-HHMMSS`). Selecteer voor elke taak de skillreferenties die de taak nodig heeft door de taak te vergelijken met de intentsignaturen van de geïnstalleerde skills; één skill die met vertrouwen matcht, is genoeg. Maak `orchestrator-session-{sessionId}.md` en `task-board-{sessionId}.md` in de geconfigureerde geheugenopslag en leg daar per taak de geselecteerde referenties en de reden voor de selectie vast. Dit zijn coördinatornotities; de launcher dwingt ze niet af.
4. **Stap 3, Spawn Agents:** Spawn voor elke prioriteitstier (laagste eerst: tier 1, daarna tier 2 enzovoort) agenten via de passende vendormethode (native subagenten wanneer huidige runtime en doelvendor overeenkomen; `oma agent spawn` voor externe of cross-vendor taken). Elke agent krijgt zijn taak, de API-contracten en zijn geselecteerde referenties met hun laadvoorwaarden. Overschrijd MAX_PARALLEL (standaard 3) nooit.
5. **Stap 4, Monitor:** Controleer de procesgezondheid met `oma agent status`. Geef de voorkeur aan voltooiingsmeldingen van de host; poll anders gewijzigde rungebonden `progress-{agentId}-{taskId}-{runId}-{sessionId}.md`-bestanden met begrensde backoff, lees de gestructureerde receipts en werk het task board bij. Let op voltooiingen, fouten en crashes.
6. **Stap 5, Verify:** Draai per voltooide agent eerst een mechanische self-check (lint, typecheck, tests, diff-scope; maximaal 3 cycli), daarna `verify.sh {agent-type} {workspace}` (backend, frontend, mobile, qa, debug en pm; andere agenttypes registreren `SKIP`) en vervolgens een QA-cross-review. Faalt de verificatie, dan spawn je opnieuw met foutcontext. Herhaalde mislukkingen kunnen alternatieve hypotheses rechtvaardigen, maar de oorspronkelijke poging, elke retry en elke hypothese putten uit hetzelfde gezamenlijke herstelbudget (`max_attempts`, standaard 3 inclusief de oorspronkelijke poging). Bewaar onopgeloste evidence als het budget een vergelijkingsronde niet kan dekken.
7. **Stap 6, Collect:** Lees rungebonden resultaatbestanden en gestructureerde claims en stel de samenvatting op.
8. **Stap 7, Final Report:** Presenteer de sessiesamenvatting. Als er experimenten zijn uitgevoerd, vat dan evidence en beslissingen samen; leg lessons alleen vast wanneer een herbruikbare oorzaak is vastgesteld.

```mermaid
flowchart TD
  S1{"Step 1: usable plan JSON?"} -->|no| MK["Create the plan inline with /plan, same session ID"]
  S1 -->|yes| S2
  MK --> S2["Step 2: session ID, task references, task board"]
  S2 --> S3["Step 3: dispatch by priority tier, tier 1 first; native subagent or oma agent spawn --task-id"]
  S3 --> S4["Step 4: monitor with oma agent status and progress files"]
  S4 --> SC["Step 5: mechanical self-check, up to 3 cycles"]
  SC --> VS{"verify.sh, or SKIP for unsupported agent types"}
  VS -->|"PASS or SKIP"| QA{"QA cross-review"}
  QA -->|"FAIL: findings back to the agent"| SC
  QA -->|PASS| S6["Step 6: collect claims; emit and verify the QA verdict"]
  S6 --> S7(["Step 7: final report"])
  VS -->|FAIL| CL{"classify the failure"}
  CL -->|"workflow evidence"| EV(["one metadata-only repair, then partial handoff if it still fails"])
  CL -->|product| BG{"attempts left in max_attempts?"}
  BG -->|"yes: retry with error context or a 2-3 hypothesis round"| S3
  BG -->|no| STOP(["preserve partial evidence; report partial or failed"])
  QA -.->|"review limit reached"| STOP
```

**Bestanden gelezen:** `.agents/results/plan-{sessionId}.json`, `.agents/oma-config.yaml`, rungebonden voortgangs- en resultaatbestanden en gestructureerde runreceipts.
**Bestanden geschreven:** rungebonden sessie- en task-board-state in de geconfigureerde geheugenopslag, gestructureerde receipts en claims en het eindrapport.

**Wanneer gebruiken:** Grote projecten die maximale paralleliteit met geautomatiseerde coördinatie nodig hebben.

---

### /work

**Beschrijving:** Stapsgewijze coördinatie over meerdere domeinen. PM plant eerst, daarna voeren agenten uit binnen de geautoriseerde scope, gevolgd door QA-review en probleemoplossing.

**Persistent:** Ja. Statusbestand: `.agents/state/work-state-{sessionId}.json`.

**Trigger-keywords:**
| Taal | Keywords |
|----------|----------|
| Explicit (persistent) | "work mode", "work workflow" |

Het losse woord "work" is geen trigger — het is gewone woordenschat ("Does this work on Windows?"). Ook "step by step" en de vertalingen daarvan starten deze workflow niet.

**Stappen:**
1. **Stap 0, Preparation:** Lees skills, context-loading en memory protocol. Registreer het begin van de sessie.
2. **Stap 1, Analyze Requirements:** Bepaal welke domeinen betrokken zijn. Is er één domein, stel dan direct gebruik van de agent voor.
3. **Stap 2, PM Agent Planning:** PM splitst requirements op, definieert API-contracten, maakt een geprioriteerde taakverdeling en slaat die op in `.agents/results/plan-{sessionId}.json`.
4. **Stap 3, Review Plan:** Presenteer het plan en ga verder binnen bestaande autorisatie. Vraag alleen naar een materiële ontbrekende beslissing of nieuwe autorisatie.
5. **Stap 4, Spawn Agents:** Spawn per prioriteitstier, parallel binnen dezelfde tier en in aparte werkruimtes.
6. **Stap 5, Monitor:** Poll voortgangsbestanden en verifieer de afstemming van API-contracten tussen agenten.
7. **Stap 6, QA Review:** Spawn een QA-agent voor security (OWASP), prestaties, toegankelijkheid en codekwaliteit.
8. **Stap 6.1, Measurements** (conditioneel): Registreer een baseline wanneer een gedefinieerde vergelijking nodig is.
9. **Stap 7, Iterate:** Bij CRITICAL/HIGH-issues spawn je de verantwoordelijke agent opnieuw. Blijft hetzelfde probleem na 2 pogingen bestaan, activeer dan de Exploration Loop.

**Wanneer gebruiken:** Features die meerdere domeinen overspannen en planning, implementatie en QA stap voor stap moeten coördineren.

---

### /ultrawork

**Beschrijving:** De kwaliteitsgerichte workflow. Hij heeft 5 fasen, in totaal 17 stappen en 12 geïsoleerde reviewstappen. Elke fase heeft een gate die moet slagen vóór de volgende begint.

**Persistent:** Ja. Statusbestand: `.agents/state/ultrawork-state-{sessionId}.json`.

**Trigger-keywords:**
| Taal | Keywords |
|----------|----------|
| Explicit (persistent) | "ultrawork", "ulw" |

**Fasen en stappen:**

| Fase | Stappen | Agent | Reviewperspectief |
|-------|-------|-------|-------------------|
| **PLAN** | 1-4 | PM-agent (auteur, stap 1) + CCR-reviewers (stappen 2-4) | Volledigheid, metareview, over-engineering/eenvoud |
| **IMPL** | 5 | Dev-agents (gespawnd) | Implementatie |
| **VERIFY** | 6-8 | CCR-reviewers | Afstemming, veiligheid (OWASP), regressiepreventie |
| **REFINE** | 9-13 | Refactor-agent (stappen 9, 11, 13) + CCR-reviewers (stappen 10, 12) | Bestanden splitsen, hergebruik, cascade-impact, consistentie, dode code |
| **SHIP** | 14-17 | CCR-reviewers | Codekwaliteit (lint/coverage), UX-flow, gerelateerde issues, deploymentgereedheid |

Elke reviewstap draait als een eigen reviewer-subagent met verse context ([Cross-Context Review](../getting-started/glossary.md#cross-context-review-ccr)). De PM-agent reviewt zijn eigen plan niet inline.

**Gatedefinities:**
- **PLAN_GATE:** Plan gedocumenteerd, aannames opgesomd, alternatieven bekeken, over-engineering gereviewd en scope geautoriseerd.
- **IMPL_GATE:** Toepasselijke checks en tests zonder emit slagen, alleen geplande bestanden gewijzigd en baseline-evidence vastgelegd voor daadwerkelijke experimenten. Buildchecks alleen als die expliciet zijn gevraagd.
- **VERIFY_GATE:** Implementatie voldoet aan requirements, nul CRITICAL, nul HIGH, geen regressies, toepasselijke meetdoelen van het project gehaald.
- **REFINE_GATE:** Onderhoudbaarheidsregels van het project gevolgd, integratiekansen vastgelegd, bijwerkingen geverifieerd, code opgeruimd, geen onopgeloste regressie.
- **SHIP_GATE:** Kwaliteitschecks slagen, UX geverifieerd, gerelateerde issues opgelost, deploymentchecklist voltooid, toepasselijke meetdoelen van het project gehaald met actuele evidence. Hergebruik bestaande autorisatie; publiceren of deployen vereist autorisatie voor die actie.

**Gedrag bij falende gate:**
- Eerste keer: ga terug naar de relevante stap, herstel en probeer opnieuw.
- Tweede keer op hetzelfde probleem: heroverweeg de oorzaak; als alternatieven het testen waard zijn binnen het resterende budget, vergelijk dan geïsoleerde experimenten met het vereiste gedrag en gedefinieerde metrics.
- Limieten: een PLAN-fout gaat alleen terug naar stap 1 vóór de eerste taakdispatch (daarna is het plan onveranderlijk). Retries in VERIFY en REFINE stoppen wanneer het aantal gatefouten het geconfigureerde maximum bereikt (standaard 5 VERIFY- + REFINE-cycli) of wanneer het kostenplafond van de sessie wordt overschreden.

```mermaid
flowchart TD
  S1["Step 1: PM Agent writes the plan JSON"] --> PR["Steps 2-4: 3 CCR reviewers, completeness, meta-review, simplicity"]
  PR --> PG{"PLAN_GATE"}
  PG -->|"fail, before first dispatch"| S1
  PG -->|pass| S5["Step 5: implementation agents in parallel"]
  S5 --> IG{"IMPL_GATE"}
  IG -->|"fail: re-spawn failed agents"| S5
  IG -->|pass| VR["Steps 6-8: 3 CCR reviewers, alignment, safety, regression"]
  VR --> VG{"VERIFY_GATE"}
  VG -->|fail| VL{"cycle limit or cost cap reached?"}
  VL -->|"no: root-cause fix"| S5
  VG -->|pass| RF["Steps 9-13: 2 CCR reviews, then refactor actions"]
  RF --> RG{"REFINE_GATE"}
  RG -->|fail| RL{"cycle limit or cost cap reached?"}
  RL -->|"no: re-spawn Refactor Agent"| RF
  RG -->|"pass, or recorded skip"| SR["Steps 14-17: 4 CCR reviewers, quality, UX, related issues, deployment"]
  SR --> SG{"SHIP_GATE"}
  SG -->|"fail: re-run affected steps"| SR
  SG -->|pass| DONE(["Final results; optional oma docs verify"])
  VL -->|yes| STOP(["Stop: save step results, report unresolved items"])
  RL -->|yes| STOP
```

**Conditionele uitbreidingen:** Vergelijkingen op gedefinieerde metrics, experimentbeslissingen en evidence, hypothese-exploratie binnen een budget en lessons die door herbruikbare oorzaken worden onderbouwd.

**Voorwaarde om REFINE over te slaan:** Simple-taken onder 50 regels.

**Wanneer gebruiken:** Een volledig reviewproces uitvoeren voordat je beslist of het resultaat klaar is voor release. De workflow registreert checks en bevindingen; hij beslist niet zelf of iets productiegereed is.

---

### /ralph

**Beschrijving:** Persistente zelfreferentiële uitvoeringslus. Omwikkelt ultrawork met een [judge](../getting-started/glossary.md#judge) die na elke iteratie de voltooiingscriteria controleert. Meldt volledige voltooiing wanneer alle criteria slagen, gedeeltelijke voltooiing wanneer alleen geslaagde en geblokkeerde criteria overblijven, of stopt wanneer safeguards afgaan.

**Persistent:** Ja. Statusbestand: `.agents/state/ralph-state-{sessionId}.json`.

**Trigger-keywords:**
| Taal | Keywords |
|----------|----------|
| Explicit (persistent) | "ralph", "랄프" |

Losse hervatfrases ("keep going", "carry on", "계속해", "続けて", "продолжай", …) en voltooiingsformuleringen ("don't stop", "끝까지 해") starten deze workflow niet.

**Fasen:**
1. **Fase 0, INIT:** Laad prerequisites (context-loading, memory protocol, judge protocol). Definieer en registreer mechanisch verifieerbare voltooiingscriteria, zoals testassertions, typechecks zonder emit, exitcodes of het bestaan van bestanden. Voeg buildchecks alleen toe wanneer die expliciet zijn gevraagd. Toon de criteria en ga verder binnen de geautoriseerde scope. Initialiseer de sessie met `max_iterations: 5`.
2. **Fase 1, EXEC:** Voer ultrawork uit (PLAN → IMPL → VERIFY → REFINE → SHIP) als één iteratie onder de sessie-ID van Ralph. Draai daarna de artefactgate `oma ralph verify --json --session-id <sessionId> --newer-than <iteration start>`. Faalt die, dan telt de iteratie als niet uitgevoerd: Ralph registreert de overtreding, herstelt het werk en draait de gate opnieuw.
3. **Fase 2, JUDGE:** Een judge controleert elk voltooiingscriterium tegen de werkelijke projectstatus (voer geautoriseerde checks uit en verifieer het bestaan van bestanden). De workflowprompt draagt de orchestrator op de judge als aparte agent met verse context te spawnen, alleen geïnformeerd over de criteria; niets bevestigt die spawn mechanisch, en een runtime die geen subagenten kan spawnen krijgt de instructie inline te beoordelen en `ralph.judge-inline-fallback` te registreren. Registreer bewijs en criteriumstatus: PASS, FAIL, REGRESSED of BLOCKED.
4. **Beslissingsgate:** Als alle criteria PASS zijn → meld volledige voltooiing. Als alleen PASS en BLOCKED overblijven → meld gedeeltelijke voltooiing. Bij FAIL of REGRESSED voer je de foutcontext aan de volgende iteratie toe, onder voorbehoud van safeguards.
5. **Fase 3, REPLAN:** Beperk de volgende iteratie tot FAIL- en REGRESSED-items (diff-bewuste diagnose), sla BLOCKED-items over en houd PASS-criteria binnen de scope van de judge. Ga terug naar fase 1.
6. **Safeguards:** De lus stopt als `current_iteration >= max_iterations` (standaard 5). Een criterium dat 3 opeenvolgende keren faalt door dezelfde oorzaak wordt BLOCKED en niet opnieuw geprobeerd (stuck detection).

```mermaid
flowchart TD
  INIT["Phase 0 INIT: define verifiable criteria, max_iterations = 5"] --> EXEC["Phase 1 EXEC: run the full ultrawork workflow"]
  EXEC --> GATE{"oma ralph verify: plan, QA, and refactor evidence current?"}
  GATE -->|"no: iteration not performed"| REPAIR["Record the violation, emit gate.failed, repair the work"]
  REPAIR --> GATE
  GATE -->|yes| JUDGE["Phase 2 JUDGE: judge re-checks every criterion, including earlier passes"]
  JUDGE --> VERDICT{"verdict"}
  VERDICT -->|"COMPLETED: all PASS"| DONE(["Full completion report"])
  VERDICT -->|"PARTIAL: only PASS and BLOCKED"| PART(["Partial completion report"])
  VERDICT -->|"FAIL: any FAIL or REGRESSED"| LIMIT{"current_iteration >= max_iterations?"}
  LIMIT -->|yes| SAFE(["Safeguard report"])
  LIMIT -->|no| REPLAN["Phase 3 REPLAN: FAIL and REGRESSED items only; skip BLOCKED"]
  REPLAN --> EXEC
```

De judge-node is de via de prompt aangestuurde judge uit fase 2: de workflow draagt de orchestrator op hem met verse context te spawnen, en een runtime die geen subagenten kan spawnen beoordeelt inline en registreert de fallback.

**Belangrijkste verschil met /ultrawork:** Ultrawork voert een proces met 5 fasen uit en retryt bij een falende gate. Ralph wikkelt ultrawork in een retrylus met een via de prompt aangestuurde judge die elk criterium opnieuw tegen projectevidence verifieert. De lus eindigt met een volledig rapport, een gedeeltelijk rapport voor geblokkeerd werk of een safeguardrapport.

**Bestanden gelezen:** `.agents/workflows/ralph/resources/judge-protocol.md`, alle ultraworkbestanden.
**Bestanden geschreven:** `session-ralph-{sessionId}.md` (geheugen), iteratielogs en eindrapport.

**Wanneer gebruiken:** Wanneer je expliciet herhaalde uitvoering en herverificatie door de judge tegen mechanische voltooiingscriteria wilt. Tests alleen vereisen Ralph niet; reken op het volledige ultraworkproces per iteratie en op de safeguards.

---

## Niet-persistente workflows

### /plan

**Beschrijving:** PM-gestuurde taakdecompositie. Analyseert requirements, selecteert de tech stack, splitst op in geprioriteerde taken met afhankelijkheden en definieert API-contracten.

**Trigger-keywords:** Geen. Start de workflow met `/plan`. De keyword-hook opent deze workflow niet vanuit een zin.

**Stappen:** Requirements verzamelen -> technische haalbaarheid analyseren (MCP-codeanalyse) -> complexiteit inschatten (Simple/Medium/Complex) -> API-contracten definiëren (bij werk over grenzen) -> taken opsplitsen -> review met gebruiker -> planartefacts opslaan (machineleesbare JSON + mensleesbare tracker voor Medium/Complex).

**Uitvoer:** `.agents/results/plan-{sessionId}.json`, een geheugenbericht en (Medium/Complex) `docs/plans/work/{NNN}-{name}.md` met taakentabel, beslislog en voortgangsnotities. De levenscyclus wordt gevolgd via het veld `Status` in de Markdown-header (`Active` -> `Completed`); plannen worden niet tussen mappen verplaatst. Benaderingen die via `/brainstorm` zijn gekozen, worden opgeslagen in `docs/decisions/{NNN}-{name}.md`.

**Uitvoering:** Inline (zonder subagents te spawnen). `/orchestrate` of `/work` gebruikt het resultaat en werkt taak/statusvelden bij.

---

### /brainstorm

**Beschrijving:** Design-first ideevorming. Verheldert intent en constraints, stelt benaderingen voor en maakt vóór planning een goedgekeurd ontwerpdocument.

**Trigger-keywords:** Geen. Start de workflow met `/brainstorm`. De keyword-hook opent deze workflow niet vanuit een zin.

**Stappen:** Projectcontext verkennen (MCP-analyse) -> verduidelijkingsvragen stellen (één tegelijk) -> 2-3 benaderingen met afwegingen voorstellen -> ontwerp sectie voor sectie presenteren (met gebruikersgoedkeuring per stap) -> blinde reviewronde -> de gekozen benadering opslaan in `docs/decisions/{NNN}-{name}.md` en `docs/decisions/index.md` bijwerken -> overgang: `/plan` voorstellen.

**Regels:** Geen implementatie of planning vóór ontwerpgoedkeuring. Geen code-output. YAGNI.

---

### /architecture

**Beschrijving:** Softwarearchitectuurworkflow die architectuurproblemen diagnosticeert, de juiste analysemethode kiest (diagnostic routing / design-twice / ATAM / CBAM / ADR), opties vergelijkt, stakeholderinput samenbrengt en een aanbeveling, review of ADR produceert.

**Trigger-keywords:** Geen. Start de workflow met `/architecture`. De keyword-hook opent deze workflow niet vanuit een zin.

**Stappen:** Beslissing kaderen (nieuwe architectuur/review/afwegingsanalyse/investeringsprioritering/ADR) -> methode kiezen via diagnostische routering -> huidige architectuur analyseren via MCP-codeanalyse (`get_symbols_overview`, `find_symbol`, `find_referencing_symbols`) -> stakeholderinput synthetiseren (alleen als de beslissing transversaal genoeg is) -> aanbeveling met expliciete aannames, afwegingen, risico's en validatiestappen maken -> bij implementatie doorgeven aan `/plan`.

**Regels:** Schrijf in deze workflow GEEN implementatiecode of taakplannen. Geef na de architectuurbeslissing door aan `/plan`. Gebruik MCP-tools overal; vervang ze niet door ruwe file reads of grep.

**Wanneer gebruiken:** Keuzes voor systeemarchitectuur, grenzen van modules/services/eigenaarschap, refactorprioritering, ADR-auteurschap en onderzoek naar architectuurpijn (change amplification, verborgen afhankelijkheden en onhandige API's).

---

### /deepinit

**Beschrijving:** Volledige projectinitialisatie. Analyseert een bestaande codebase en genereert AGENTS.md, ARCHITECTURE.md en een gestructureerde `docs/`-kennisbasis.

**Trigger-keywords:** Geen. Start de workflow met `/deepinit`. De keyword-hook opent deze workflow niet vanuit een zin.

**Stappen:** Preparation -> codebase analyseren (projecttype, architectuur, impliciete regels, domeinen en grenzen) -> ARCHITECTURE.md maken (domeinmap, onder 200 regels) -> `docs/`-kennisbasis genereren (decisions/, plans/, generated/, product-specs/, references/ en domeindocs) -> root AGENTS.md maken (~100 regels, inhoudsopgave) -> boundary-AGENTS.md's maken (monorepo-pakketten, elk onder 50 regels) -> bestaande harness bijwerken (bij opnieuw uitvoeren) -> valideren (geen dode links, regellimieten).

**Uitvoer:** AGENTS.md, ARCHITECTURE.md, docs/decisions/, docs/plans/, docs/PLANS.md, docs/QUALITY-SCORE.md, docs/CODE-REVIEW.md en waar nodig ontdekte domeindocumentatie.

---

### /review

**Beschrijving:** Volledige QA-reviewpipeline. Beveiligingsaudit (OWASP Top 10), prestatieanalyse, toegankelijkheidscheck (WCAG 2.2 AA) en codekwaliteitsreview.

**Trigger-keywords:** Geen. Start de workflow met `/review`. De keyword-hook opent deze workflow niet vanuit een zin.

**Stappen:** Reviewscope bepalen -> geautomatiseerde securitychecks (`npm audit`, `bandit` of het equivalent voor de stack) -> handmatige securityreview (OWASP Top 10) -> prestatieanalyse -> toegankelijkheidsreview (WCAG 2.2 AA) -> codekwaliteitsreview -> QA-rapport genereren.

**Scope:** De scope komt uit het verzoek: specifieke bestanden, een featurebranch, een PR of het hele project. Een PR of branch wordt gedifft tegen de basisbranch. Zonder opgegeven scope reviewt de workflow de huidige ongecommitte wijzigingen en branchwijzigingen en vermeldt hij die aanname; hij vraagt alleen wanneer er niets is om de scope uit af te leiden.

**Optionele fix-verificatielus** (met `--fix`): na het QA-rapport domeinagenten spawnen om CRITICAL/HIGH-issues te herstellen, QA opnieuw draaien en dit maximaal 3 keer herhalen.

**Delegatie:** Bij grote scopes delegeert de workflow stap 2-7 aan een gespawnde QA-subagent.

---

### /security

**Beschrijving:** Voer de `oma-security`-skill uit voor broncode, agentskills of MCP-componenten. De workflow kiest de relevante engine, legt dekking en bewijs vast, valideert bevindingen en past de ingestelde CI-gate toe. Een pentest van een afgebakende webtestdeployment draait alleen op een uitdrukkelijk ARTEX-verzoek, tegen een ARTEX-platform dat je zelf aanlevert en dat is beoordeeld.

**Startpunt:** `/security`. De keyword-hook opent deze workflow niet vanuit een zin. Binnen de workflow worden Deepsec en de Cisco-scanners gekozen op basis van doel en intentie. Een repositoryscan selecteert alleen broncode; skill-, MCP- en runtimescans worden niet impliciet toegevoegd.

**Doelen en engines:**

| Doel | Engine |
|--------|--------|
| Broncode | Standaard Vercel Deepsec; Cisco AI Deep SAST op verzoek |
| Agentskillpakket | Cisco Skill Scanner |
| MCP-component of -server | Cisco MCP Scanner |
| Webtestdeployment (runtime-pentest) | Standaard geen. ARTEX alleen op uitdrukkelijk verzoek, op een door de gebruiker aangeleverd en beoordeeld ARTEX-platform, binnen de toegestane doel- en uitvoeringsscope |

Runtimetests hebben geen meegeleverde engine: de skill installeert, bouwt of deployt geen ARTEX-platform. Zonder een uitdrukkelijk ARTEX-verzoek, een concrete webtestdeployment en een beoordeeld platform vermeldt de workflow de ontbrekende voorwaarde, legt hij de runtimefase vast als `skipped` en gaat hij door met de andere geselecteerde operaties.

De auditmethodiek van Cloudflare geeft richting aan onafhankelijke verificatie en reproductie in een lokale sandbox. Deze voegt geen scanner toe en toont geen hogere detectienauwkeurigheid aan.

**Stappen:**

1. Lees `.agents/skills/oma-security/SKILL.md` en alleen de resources die nodig zijn voor het doel en de intentie.
2. Bepaal het doel (`source`, `skill`, `mcp` of `web_runtime`) en de intentie (`setup`, `scan`, `diff`, `pentest`, `triage`, `validate`, `ci` of `troubleshoot`). Controleer de versie, beschikbare interface, credentials en het uitvoeringsbudget van de gekozen engine.
3. Voer de gekozen engine uit binnen de afgesproken scope. Hergebruik bestaande Deepsec-state waar van toepassing. Leg voor een uitdrukkelijk gevraagde ARTEX-run een beoordeelde, vastgepinde versie van het aangeleverde platform, een geïsoleerde deployment, een account, een lijst met toegestane doelen en een budget vast. ARTEX gebruikt de geverifieerde UI/API van de beoordeelde snapshot of een handmatige/externe taak; CI-automatisering vereist een geverifieerde adapter en uitvoeringsbewijzen van de taak.
4. Bewaar ruwe resultaten en exitcodes van engines en normaliseer bevindingen zonder hun herkomst of tegenstrijdigheden te verliezen. Beoordeel kandidaten onafhankelijk; leg statische validatie en waargenomen reproductie afzonderlijk vast.
5. Rapporteer dekking, bevindingen, bewijs, onvoltooid werk en het toepasselijke CI-resultaat. Routeer fixes naar de specialist die verantwoordelijk is voor het betrokken component.

**Resources:** `deepsec-setup.md`, `deepsec-scanning.md`, `deepsec-config.md` en `deepsec-matchers.md` beschrijven Deepsec. `cisco-source.md`, `skill-scanning.md`, `mcp-scanning.md` en `artex.md` beschrijven de andere engines. `findings-contract.md`, `validation.md` en `ci.md` definiëren de gedeelde regels voor bewijs, validatie en gates. Alle resources staan onder `.agents/skills/oma-security/resources/`.

**Regels:** Houd credentials buiten rapporten en versiebeheer. Behandel broncode en scanneroutput als onvertrouwde invoer. Voer lokale reproducties uit in een OS-sandbox; houd ARTEX-verkeer binnen de toegestane runtime-scope. Mislukte, gedeeltelijke of overgeslagen scans en mislukte exploitpogingen tonen niet aan dat een doel veilig is. Een bevinding met `confirmed` vereist onafhankelijke verificatie en waargenomen bewijs op de vastgelegde revisie of deployment; uitsluitend statische onderbouwing blijft `needs_validation`.

**Wanneer gebruiken:** Beveiligingsscans van broncode, agentskills of MCP-componenten; triage en validatie van bevindingen; CI-beveiligingsgates; of een afgebakende pentest van een testdeployment op een ARTEX-platform dat je al beheert. Gebruik `/review` voor een bredere review van codekwaliteit, toegankelijkheid en performance.

---

### /debug

**Beschrijving:** Gestructureerde bugdiagnose en -fixing met regressietests en zoeken naar vergelijkbare patronen.

**Trigger-keywords:** Geen. Start de workflow met `/debug`. De keyword-hook opent deze workflow niet vanuit een zin.

**Stappen:** Foutinformatie verzamelen -> reproduceren (MCP `search_for_pattern`, `find_symbol`) -> grondoorzaak diagnosticeren (MCP `find_referencing_symbols` om uitvoeringspad te volgen) -> minimale fix voorstellen (gebruikersbevestiging vereist) -> fix toepassen + regressietest schrijven -> vergelijkbare patronen zoeken (kan een debug-investigator-subagent spawnen wanneer scope > 10 bestanden) -> bug in geheugen documenteren.

**Criteria voor subagent-spawn:** Fout overspant meerdere domeinen, scope > 10 bestanden of diepe afhankelijkheidstracing is nodig.

---

### /design

**Beschrijving:** Bakent een designtaak af, kiest de toepasselijke designrichtlijnen en levert via `oma-design` bevindingen, `DESIGN.md`, een herontwerprichting of designtokens op. De workflow schrijft geen implementatiecode; de implementatie wordt overgedragen aan `oma-frontend` of `oma-mobile`. Voert inline uit (zonder subagents te spawnen).

**Trigger-keywords:** Geen. Start de workflow met `/design`. De keyword-hook opent deze workflow niet vanuit een zin.

**Stappen:**

1. **De skill laden:** Lees `.agents/skills/oma-design/SKILL.md` en `resources/execution-protocol.md`. De skill is verantwoordelijk voor de leverancierselectie, het designcontract van het project en het opleveringsbewijs; de workflow bepaalt de volgorde van de operaties en voegt zelf geen visuele regels toe.
2. **Scope en context vaststellen:** Classificeer het gevraagde resultaat: bevindingen (een audit), een designsysteemdocument, een herontwerprichting of tokens. Lees het verzoek, de bestaande `DESIGN.md`, `.design-context.md` wanneer die bestaat, merkmateriaal, ondersteunde talen en de betrokken UI. Laad voor een bestaande site of applicatie `redesign-protocol.md` en stel Preserve of Overhaul vast voordat je wijzigingen voorstelt. De workflow vraagt alleen naar een keuze die het resultaat wezenlijk verandert en die het verzoek, de artefacten en de codebase niet beantwoorden. `.design-context.md` wordt alleen aangemaakt of bijgewerkt wanneer een inhoudelijke verkenningsronde de beslissing heeft onderbouwd.
3. **Richtlijnen kiezen en referenties verzamelen:** Kies via `external-design-skills.md` één leverancier voor de operatie (Interface Design, Taste of Impeccable). Een taak met alleen documentatie of een tokencontract blijft lokaal. Optionele inputs worden alleen geladen wanneer de taak erom vraagt: een gevraagde vendor-seed (`getdesign-fetcher.md`), een gevraagde Stitch-operatie (`stitch-integration.md`), beeldmateriaal en placeholders (`asset-strategy.md`) of een oppervlak dat rond een datatabel of grid is gebouwd (`data-grid.md`). Een niet-beschikbare integratie wordt gemeld als bewijsbeperking en niet stilzwijgend vervangen.
4. **De richting bepalen:** Pas de gekozen richtlijnen toe op het projectbewijs. Alternatieve richtingen worden alleen gepresenteerd wanneer een onopgeloste keuze het resultaat wezenlijk beïnvloedt; een bestaande richting en autorisatie volstaan wanneer ze die keuze beantwoorden.
5. **Het artefact maken:** Een designsysteem maakt `DESIGN.md` aan of werkt die bij volgens `design-md-spec.md`, met behoud van alle negen secties inclusief sectie 9 (Agent Prompt Guide). Tokens volgen `design-tokens.md` en mappen semantische rollen op het bestaande tokensysteem en themaformaat van het project. Een audit levert bevindingen op met de geïnspecteerde locatie, het bewijs, het effect en de aanbeveling, en wijzigt niets.
6. **Verifiëren en overdragen:** Voer de toepasselijke controles uit `checklist.md` uit en benoem wat is geïnspecteerd. Rapporteer de opgeleverde artefacten, de gekozen route en de herkomst ervan, de verificatieresultaten en de resterende beperkingen, en draag de implementatie daarna over aan `oma-frontend` (web) of `oma-mobile` (native).

**Beperkingen:** Elke richting blijft binnen het merk van het project, de CJK-fontdekking waar die talen worden ondersteund, de bestaande implementatiestack, responsive gedrag vanaf de kleinste ondersteunde viewport en WCAG AA, tenzij het project een strenger doel stelt. Controles die een gerenderde implementatie nodig hebben, worden gespecificeerd maar blijven niet-uitgevoerd bij werk dat alleen uit documenten bestaat.

---

### /scm

**Beschrijving:** Conventional Commits genereren met automatische splitsing per feature.

**Trigger-keywords:** Geen (uitgesloten van autodetectie).

**Stappen:** Wijzigingen analyseren (git status, git diff) -> features scheiden (bij > 5 bestanden over verschillende scopes/typen) -> type bepalen (feat/fix/refactor/docs/test/chore/style/perf) -> scope bepalen (gewijzigde module) -> beschrijving schrijven (imperatief, < 72 tekens) -> commit direct uitvoeren (geen bevestigingsprompt).

**Regels:** Gebruik nooit `git add -A`. Commit geen secrets. Gebruik HEREDOC voor meerregelige berichten. Voeg alleen een co-author-trailer toe wanneer de effectieve `scm.co_author`-configuratie die inschakelt en beide waarden levert.

---

### /convert

**Beschrijving:** Een bestand van het ene formaat naar het andere converteren, gerouteerd op mediacategorie. **Documenten** (PDF via `opendataloader-pdf`/`oma-pdf`; HWP/HWPX/HWPML via `kordoc`/`oma-hwp`) worden naar Markdown geëxtraheerd. **Afbeeldingen**, **video** en **audio** worden met `ffmpeg` naar een doelindeling getranscodeerd (al beschikbaar voor `oma-video`).

**Trigger-keywords:** Geen (wordt expliciet met een invoerpad aangeroepen).

**Stappen:** Invoer valideren en routeren op categorie (document `.pdf`/`.hwp*`; afbeelding `.jpg`/`.png`/`.webp`/…; video `.mp4`/`.mov`/…; audio `.mp3`/`.wav`/…) -> doelindeling oplossen (documentstandaard = Markdown; media = expliciete `--to`) -> converteren (PDF: `uvx opendataloader-pdf`, gescande PDF's gebruiken hybride OCR; HWP: `bunx kordoc@latest`; media: `ffmpeg`) -> documenten normaliseren (PDF: `uvx mdformat`; HWP: `flatten-tables.ts`) -> verifiëren (Markdown lezen / media met `ffprobe`) -> bron→doelindeling en kwaliteits-/codeckeuzes rapporteren.

**Regels:** Routeer op categorie; draai nooit een documentconverter op media of omgekeerd. De standaardoutput staat in dezelfde map als de invoer. Rapporteer kwaliteits-/codeckeuzes voor media (transcoding is niet lossless). Sla geen stappen over. De responstaal volgt `.agents/oma-config.yaml`.

**Wanneer gebruiken:** PDF of Koreaanse HWP-familiedocumenten naar Markdown converteren voor LLM/RAG-inname, of afbeeldingen (jpg→webp/png), video (mov→mp4, mp4→gif) en audio (wav→mp3) transcoderen.

---

### /docs

**Beschrijving:** Documentatiedrift en sync via `oma-docs`. Verify vindt kapotte refs in alle repo-Markdown (standaardglob `**/*.md`); sync stelt per document patches voor die door een git-diff zijn geraakt. Voert inline uit (zonder subagents); alle vendors roepen `oma docs` direct aan.

**Trigger-keywords:** Geen. Start de workflow met `/docs`. De keyword-hook opent deze workflow niet vanuit een zin.

**Stappen:** Modus detecteren (`verify` standaard; `sync` wanneer de prompt sync noemt of een git-diffbereik levert) -> preflight (`command -v oma`; bij sync bruikbare diff bevestigen, terugvallen op `HEAD~1..HEAD`) -> Verify: `oma docs verify --json` (exit `0` schoon, `1` kapotte refs) of Sync: `oma docs sync --json` op het bereik -> bevindingen synthetiseren volgens het host-LLM-contract (verify: groeperen op CRITICAL/HIGH/MEDIUM/LOW met concrete fixes; sync: minimale unified-diff-patches opstellen) -> elke sync-patch interactief presenteren (`[y] apply [n] skip [d] show diff [s] show full proposal`; nooit automatisch toepassen) -> na apply de index regenereren via `oma docs verify --json` -> modus, aantallen per type en verwijzingen naar `docs/generated/doc-refs.json` / `url-drift.json` rapporteren.

**Regels:** Pas sync-patches nooit automatisch toe (per document is `[y]` vereist). Wijzig `.agents/` nooit (SSOT). Ontbreekt `oma docs`, toon dan een installatiehint en stop — val niet terug op handmatige greps.

**Bestanden gelezen:** doel-Markdown (`**/*.md` of gevraagde glob), `git diff` voor sync-`changedFiles`.
**Bestanden geschreven:** `docs/generated/doc-refs.json` (altijd opnieuw gegenereerd door verify), `docs/generated/url-drift.json` (wanneer URL-check draait), goedgekeurde doc-patches (bij sync `[y]`).

**Wanneer gebruiken:** Controleren of docs bij de codebase passen (kapotte bestandspaden, CLI-commando's, configkeys, env-vars), of patches voorstellen na een codewijziging.

---

### /recap

**Beschrijving:** Dagelijkse of periodieke werkrecap via `oma-recap`. Lost datum of venster op uit natural language, roept `oma recap --json` aan over geschiedenissen van meerdere AI-tools (Grok, Claude, Codex, Qwen, Cursor, Antigravity), delegeert thema-analyse en Markdown-opmaak aan de skill en meldt een TL;DR plus opslagpad. Voert inline uit (zonder subagents); alle vendors roepen `oma recap` direct aan.

**Trigger-keywords:** Geen. Start de workflow met `/recap`. De keyword-hook opent deze workflow niet vanuit een zin.

**Stappen:** Modus detecteren en venster oplossen (`daily` standaard met vandaag; `period` bij zinnen als "this week" / "지난 7일" naar `--window Nd`) -> `--tool`-filter alleen ophalen als gebruiker tools expliciet noemt (`grok, claude, codex, qwen, cursor, antigravity`) -> preflight (`command -v oma`) -> `oma recap --json` draaien (daily: `--date YYYY-MM-DD` of weglaten; period: `--window 7d` / `30d`) -> synthese volgens skillcontract opslaan (15-minutendrempel voor thema's, dag- versus meerdagensjabloon) -> 3-bullet TL;DR en opslagpad rapporteren.

**Regels:** Wijzig `.agents/` nooit (SSOT). Vertaal technische termen (projectnamen, toolnamen, CLI-vlaggen) in de opgeslagen recap nooit automatisch. Verzin geen recap als geen bron beschikbaar is.

**Bestanden gelezen:** Conversatiegeschiedenissen van AI-tools (via `oma recap`).
**Bestanden geschreven:** `.agents/results/recap/{date}.md` of `.agents/results/recap/{start}~{end}.md`.

**Wanneer gebruiken:** Werk over AI-tools heen van een dag of periode samenvatten (week/maand), eventueel gefilterd op specifieke tools.

---

### /stack-set

**Beschrijving:** Projecttechstack automatisch detecteren en taalspecifieke referenties genereren voor de opgeloste domeinskill. Backendmanifesten routeren naar `oma-backend`; mobile stacks (Swift/iOS via `Package.swift`/`.xcodeproj`, Kotlin/Android via `settings.gradle.kts`, Flutter via `pubspec.yaml`, React Native via `package.json` + react-native) routeren naar `oma-mobile`; frontendmanifesten (Angular, Next.js, React, Vue, Svelte) routeren naar `oma-frontend`. Wanneer meer dan één domein wordt gedetecteerd en het verzoek er geen noemt, vraagt de workflow welk domein moet worden geconfigureerd.

**Trigger-keywords:** Geen (uitgesloten van autodetectie).

<!-- oma-docs:ignore-start -->
**Stappen:** Detecteren (manifesten scannen: pyproject.toml, package.json, Cargo.toml, pom.xml, go.mod, mix.exs, Gemfile, *.csproj, Package.swift, *.xcodeproj, pubspec.yaml) -> Bevestigen (gedetecteerde stack tonen en gebruikersbevestiging krijgen) -> Genereren (`stack/stack.yaml`, `stack/tech-stack.md`, `stack/snippets.md` met 8 verplichte patronen, en voor backend `stack/api-template.*`; een mobile stack bewaart het snippet voor de API-service of repository in `stack/snippets.md`) -> Verifiëren.
<!-- oma-docs:ignore-end -->

**Uitvoer:** Bestanden in de `stack/`-map van de opgeloste domeinskill (bijvoorbeeld `.agents/skills/oma-backend/stack/` of `.agents/skills/oma-mobile/stack/`). Wijzigt SKILL.md of `resources/` niet.

---

### /video

**Beschrijving:** De `oma-video`-skill end-to-end aansturen: briefing -> script -> narratie -> visuals -> captions -> render-spec -> beheerde HyperFrames (of MoneyPrinterTurbo)-compositor. De workflow maakt een reproduceerbare runmap en levert pas na compositor- en ffprobe-checks een echte `.mp4`. Providerconfiguratie is optioneel voor ondersteunde asset-fallbacks; een fout in compositor of toolchain blijft een mislukte run. Voert inline uit (zonder subagents te spawnen).

**Trigger-keywords:** Geen. Start de workflow met `/video`. De keyword-hook opent deze workflow niet vanuit een zin.

**Stappen:**
1. **Briefing en modus oplossen:** Kies `shorts` (9:16), `explainer` (16:9) of `demo` (een door een mens gemaakte schermopname, aangeleverd met `--capture`); pas modusdefaults toe, overschrijfbaar met vlaggen.
2. **Script samenstellen:** Genereer scènes + narratie (LLM wanneer een key aanwezig is, anders een deterministische outline uit de briefing).
3. **Assets synthetiseren:** Narratie via `oma-voice`, visuals standaard via `oma-image`, key-free captionalignment en voor `demo` de ingelezen opname van de mens. Een `oma-slide`-frame wordt alleen gebruikt voor een scène waarvan `visual.ref` een bestaande deckmap noemt; stock- (Pexels) en AIGC-visuals (Pixelle) worden bereikt met `--visual stock` of `--visual aigc` wanneer hun key is ingesteld. `--source web --url` voegt alleen URL-context toe; de CLI opent geen browser en neemt er geen op. Elke provider valt terug op een deterministische fallback.
4. **Render-spec bouwen:** Schrijf `render-spec.json` (de determinismegrens) plus assets in de runmap.
5. **Renderen:** Spawn het beheerde HyperFrames-project (of MoneyPrinterTurbo) als subprocess. Een normale compositor- of toolchainfout laat de run falen; de deterministische placeholder is alleen beschikbaar via het expliciete mock/testpad (`OMA_VIDEO_MOCK=1`). Een `demo`-run heeft `--polish` nodig om de opname door de `Demo`-compositie te leiden, waar persoonsgegevens worden gemaskeerd; zonder die optie is de uitvoer-MP4 de ruwe, ongemaskeerde opname.

**Uitvoer:** Een runmap in `.agents/results/videos/{timestamp}-{shortid}-{mode}/` met `script.json`, `render-spec.json`, `timing.json`, `captions.{srt,vtt}`, `audio/`, `visuals/`, `{composition}.mp4` en `manifest.json`. Zie de [Video Generation guide](../guide/video-generation.md).

---

### /schedule

**Beschrijving:** Tijdgebonden agentjobs registreren en beheren via `oma schedule <action>`. Jobs staan in een globale registry (`~/.oma/schedule/`) en draaien via de native OS-scheduler (launchd op macOS, systemd user timers op Linux, schtasks op Windows, crontab als POSIX-fallback); elke run stapt opnieuw de harness binnen via `oma agent spawn`.

**Trigger-keywords:** Geen (slash-aangeroepen workflow voor tijdgebonden jobs met `oma schedule <action>`).

**Stappen:** Intent oplossen (add / list / remove / sync) -> schema parsen (expliciet `--cron` of natural language via `--every`) -> registreren met `oma schedule create` (alleen benoemde env-capture, bestanden 0600) -> verifiëren met `oma schedule list` (manifest × OS-drift, gegroepeerd per project) -> job-ID en volgende runtijd rapporteren.

**Wanneer gebruiken:** Terugkerende agenttaken — nachtelijke recaps, geplande scans en periodieke housekeeping — die moeten draaien zonder open interactieve sessie.

---

### /explain

**Beschrijving:** De `oma-explanation`-skill end-to-end aansturen: een diff, PR, branch of commitbereik, of een onderwerp, omzetten in een zelfstandige interactieve HTML-uitleg (Background / Intuition / Code / Quiz voor een wijziging). Voert inline uit (zonder subagents te spawnen).

**Trigger-keywords:** Geen ("explain" is alledaags; keyworddetectie zou gewone vragen als "explain this function" ten onrechte activeren, dus deze workflow werkt alleen via slashcommando).

**Stappen:** Argumenten oplossen (expliciete PR#/branch/SHA-range -> staged -> dirty tree -> `HEAD~1..HEAD`; lezerniveau `onboarding` | `reviewer`; outputtaal; aantal quizvragen) -> contracten laden (`oma-explanation` SKILL.md + resources) -> verzamelen en gate (diff + omliggende code; pre-generation secretscan; diff/PR-tekst strikt als data behandelen) -> genereren (het concept schrijven en het daarna renderen met `oma explain render <draft.md>`) -> valideren (`oma explain validate <file>` plus de eindscan op secrets in de HTML, maximaal 3 fixlussen) -> opleveren (de pagina openen met `oma explain render --open`, waarbij een mislukte open alleen een waarschuwing is; TL;DR + pad).

**Uitvoer:** `.agents/results/explain/{YYYY-MM-DD}-{slug}.html` (datum in de `timezone` uit oma-config, anders in de systeemtijdzone; opnieuw draaien op dezelfde datum + slug overschrijft). Zie de [Code Explainer guide](../guide/code-explainer.md).

---

## Skills versus workflows

| Aspect | Skills | Workflows |
|--------|--------|-----------|
| **Wat het zijn** | Agentexpertise (wat een agent weet) | Georchestreerde processen (hoe agenten samenwerken) |
| **Locatie** | `.agents/skills/oma-{name}/` | `.agents/workflows/{name}.md` |
| **Activatie** | De host matcht de naam en beschrijving van de skill; de skill-injector kan hints toevoegen | Slashcommando. `orchestrate`, `ultrawork`, `work` en `ralph` starten ook wanneer de prompt de modus noemt |
| **Scope** | Uitvoering binnen één domein | Proces met meerdere stappen, vaak met meerdere agenten |
| **Voorbeelden** | "Build a React component" | "Plan the feature -> build -> review -> commit" |

---

## Autodetectie: hoe het werkt

### Het hook-systeem

oh-my-agent gebruikt een `UserPromptSubmit`-hook die draait voordat elk gebruikersbericht wordt verwerkt. De settings van de vendor registreren één `<hookDir>/oma-hook.sh --vendor <v> --event <e>`-entry die naar `oma hook run` routeert; de handlerketen draait in-process. De keten bestaat uit:

1. **`triggers.json`** (`.agents/hooks/core/triggers.json`, inline in de `oma`-binary): de tabel `workflows` routeert via keywords alleen `orchestrate`, `ultrawork`, `work` en `ralph`, en alleen op de expliciete naam van elke modus. Keywordhints voor skills staan in hetzelfde bestand en zijn ongewijzigd.
2. **`keyword-detector.ts`** (`.agents/hooks/core/keyword-detector.ts`): TypeScriptlogica die gebruikersinvoer tegen die expliciete namen scant en workflowactivatiecontext injecteert.
3. **`persistent-mode.ts`** (`.agents/hooks/core/persistent-mode.ts`): dwingt persistente workflowuitvoering af door actieve statusbestanden te controleren en workflowcontext opnieuw te injecteren.

### Detectiestroom

1. De gebruiker typt een prompt.
2. De hook controleert of de prompt met een `/command` begint (zo ja, keywordinjectie overslaan; het commando laadt de workflow). Een persistent slashcommando schrijft nog steeds het statusbestand van die modus.
3. De hook saneert de invoer (codeblokken, geciteerde strings en geplakte system-echo-blokken strippen) en scant daarna de keywordlijsten onder `workflows` in `.agents/hooks/core/triggers.json`. Die lijsten bevatten alleen de expliciete namen van `orchestrate`, `ultrawork`, `work` en `ralph`. Een reinforcement guard onderdrukt retriggers wanneer dezelfde workflow in de afgelopen 60 seconden 2+ keer is geactiveerd.
4. Als er een match is, controleer je of de invoer bij informatieve patronen past.
5. Is de vraag informatief (bijvoorbeeld "what is orchestrate?"), filter die dan weg (geen workflowtrigger).
6. Matcht de expliciete naam, injecteer dan `[OMA WORKFLOW: {workflow-name}]` en draag de agent op die workflow direct te starten. Als meerdere expliciete namen matchen, wint het langste keyword en daarna de declaratievolgorde.
7. Dezelfde expliciete match schrijft het statusbestand van de persistente modus. De modus noemen binnen een korte vraag start hem nog steeds (`ultrawork로 해줄래?`). Een vraag over de modus (`What is ultrawork?`) doet dat niet.
8. De agent leest de geïnjecteerde tag en laadt het bijbehorende workflowbestand uit `.agents/workflows/`.

### Taalsectieconventie

`.agents/hooks/core/triggers.json` gebruikt voor `keywords`, `patterns` en `informationalPatterns` een structuur per taal:

| Sectie | Gedrag |
|---------|---------|
| `*` | Universal. Gebruik voor Engelse inhoud (lingua franca) en echt cross-language tokens (zoals workflownaam `"orchestrate"`). |
| `en` | Engels. Functioneel gelijk aan `*`. |
| `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl` | Taalspecifieke formuleringen. |

Elke sectie wordt altijd geladen: gebruikers typen hun prompt in de taal waarin ze denken, en de instelling `language` in `.agents/oma-config.yaml` bepaalt alleen de antwoordtaal. Een keyword in één taal kan alleen matchen met een prompt die dat schrift bevat, dus het samenvoegen van alle secties kan niet afgaan op niet-gerelateerde prompts.

Woordgrenzen hangen alleen af van het keyword zelf, nooit van `language`: ASCII-keywords matchen alleen hele woorden (dus "work" matcht niet met "network" en "ulw" niet met een langere identifier), terwijl keywords met niet-ASCII-tekst als substrings matchen, omdat CJK-partikels direct aan het woord vastzitten ("랄프로").

### Pattern-veld (raw regex) {#pattern-field-raw-regex}

De detector kan nog steeds een `patterns`-veld van een workflow compileren: ruwe regexstrings met de vlaggen `iu`, voor intent met meerdere tokens die een keywordlijst niet kan uitdrukken. De meegeleverde tabel `workflows` declareert geen `patterns`. Elke expliciete naam staat ook in `keywords`, omdat een match alleen als expliciet telt wanneer de gematchte keywordtekst in de lijst `explicit` van die workflow staat.

```jsonc
{
  "workflows": {
    "orchestrate": {
      "persistent": true,
      "explicit": ["orchestrate", "オーケストレート", "orquestar"],
      "keywords": {
        "*": ["orchestrate"],
        "ja": ["オーケストレート"],
        "es": ["orquestar"]
      }
    }
  }
}
```

Auteursregels:
- Strings worden direct gecompileerd; escape backslashes eenmaal voor JSON en eenmaal voor regex (`\\b`, `\\s+`)
- Er wordt geen automatische word-boundary toegevoegd; auteurs van patronen moeten zelf `\b` gebruiken
- Ongeldige regex wordt runtime stil overgeslagen (zichtbaar bij configuratiebewerking via test failures)

### Filtering van informatieve patronen

De sectie `informationalPatterns` in `.agents/hooks/core/triggers.json` bevat zinnen die op vragen in plaats van commando's wijzen. Rond elke mogelijke workflowmatch wordt in een venster van 60 tekens gecontroleerd:

| Sectie | Voorbeelden van patronen |
|---------|----------------------|
| `*` (universeel Engels) | "what is", "what are", "how to", "how does", "how do", "should we", "should i", "could we", "would you", "what if", "what about", "why build", "false positive", "trigger when", "auto-trigger" |
| `ko` | "뭐야", "무엇", "어떻게", "설명해", "알려줘", "트리거", "발동", "메타", "왜 만들", "어떻게 만들", "어떨까", "한다면", "할까요" |
| `ja` | "とは", "って何", "どうやって", "説明して" |
| `zh` | "是什么", "什么是", "怎么", "解释" |

Als de invoer zowel een expliciete modusnaam als een informatief patroon matcht, wint het informatieve patroon en wordt geen workflow gestart. Dat blokkeert prompts zoals:
- `"what is orchestrate?"`: `what is` in `*` blokkeert het keyword `orchestrate`
- `"orchestrate 트리거 해주면 되나요?"`: `트리거` in `ko` blokkeert het keyword `orchestrate`

### Workflows die de keyword-hook niet opent {#workflows-the-keyword-hook-does-not-open}

Elke workflow behalve `orchestrate`, `ultrawork`, `work` en `ralph` start vanuit zijn slashcommando. Het procedurebestand blijft in `.agents/workflows/` staan. `excludedWorkflows` noemt `stack-set`, `schedule` en `convert`, zodat een keywordbank die drie niet kan routeren, ook niet als er later een wordt toegevoegd. `/explain` blijft slash-only omdat "explain" alledaagse taal is. Keywordhints voor skills in hetzelfde bestand staan daar los van en injecteren nog steeds skillcontext.

---

## Mechaniek van de persistente modus {#persistent-mode-mechanics}

### Statusbestanden

Persistente workflows (orchestrate, ultrawork, work, ralph) maken statusbestanden in `.agents/state/` wanneer ze expliciet worden aangeroepen (zie [Persistente workflows](#persistent-workflows)):

```text
.agents/state/
├── orchestrate-state-{sessionId}.json
├── ultrawork-state-{sessionId}.json
├── work-state-{sessionId}.json
└── ralph-state-{sessionId}.json
```

`{sessionId}` is de sessie-ID van de host, zodat gelijktijdige sessies geen bestand delen. Een bestand legt de workflownaam, sessie-ID, activatietijd en het reinforcementaantal vast, plus na `oma goal set` het goal contract. Fasevoortgang wordt bijgehouden in geheugenbestanden zoals `session-ultrawork.md`, niet hier.

### Reinforcement

Wanneer een persistente workflow actief is, injecteert de `persistent-mode.ts`-hook `[OMA PERSISTENT MODE: {workflow-name}]` in elk gebruikersbericht. Zo blijft de workflow ook over meerdere gespreksturns heen actief.

### Goal contract (optionele stop gate + budget)

`oma goal set` koppelt een mechanisch voltooiingscontract aan een actieve persistente workflow:

- `--gate typecheck|test|lint`: de Stop-hook laat de sessie **alleen eindigen wanneer dat `package.json`-script slaagt** (als argv-array uitgevoerd, zonder shell; vrije commando's worden bewust geweigerd). Bij falen blokkeert de hook met de staart van de output; fouten en time-outs tellen mee voor de reinforcementlimiet zodat een rode gate niet eeuwig blokkeert.
- `--budget-minutes <n>`: wall-clockbudget vanaf activatie. Bij overschrijding wordt de workflow gedeactiveerd en kan een eerlijke gedeeltelijke stop worden gemaakt, vastgelegd in het eventlog van de sessie.

Zonder contract werkt de persistente modus zoals hierboven beschreven — het contract is opt-in. Zie `goal set` in de [CLI-commandoreferentie](../cli-interfaces/commands.md#goal-set).

### Deactivering

Om een persistente workflow te deactiveren, zegt de gebruiker "workflow done" (of het equivalent in de ingestelde taal). Dit:
1. verwijdert het statusbestand uit `.agents/state/`;
2. stopt het injecteren van de persistente context;
3. keert terug naar de normale werking.

De workflow kan ook natuurlijk eindigen wanneer alle stappen klaar zijn en de laatste gate slaagt. Met een geconfigureerde `goal set`-gate deactiveert een geslaagde gate de workflow automatisch.

---

## Typische workflowsequenties

| Doel | Sequentie |
|------|----------|
| Feature binnen één domein | Taak beschrijven → relevante skill → implementeren → gerichte verificatie |
| Complex multi-domeinproject | `/work` → PM plant → review binnen geautoriseerde scope → agenten spawnen → QA reviewt → issues herstellen → rapport |
| Geautomatiseerde parallelle implementatie | `/orchestrate` → plan laden of maken → afhankelijkheden oplossen → onafhankelijke taken spawnen → verifiëren → rapport |
| Oplevering met maximale kwaliteit | `/ultrawork` → PLAN (plan + 3 reviews) → IMPL → VERIFY (3 reviews) → REFINE (2 reviews + 3 refactoracties) → SHIP (4 reviews) |
| Bugonderzoek | `/debug` → reproduceren → grondoorzaak → minimale fix → regressietest → scan op vergelijkbare patronen |
| Van design naar implementatie | `/brainstorm` → ontwerpdocument → `/plan` → taakopdeling → `/orchestrate` → parallelle implementatie → `/review` → `/scm` |
| Nieuwe codebase instellen | `/deepinit` → AGENTS.md + ARCHITECTURE.md + `docs/` |
| Herhaalde uitvoering met verificatie door de judge | `/ralph` → criteria definiëren → ultrawork → artefactgate → judge → zo nodig herhalen → volledig rapport, gedeeltelijk rapport of safeguardrapport |

---

## Zie ook

- [Parallelle uitvoering](./parallel-execution.md): `oma agent spawn`, `oma agent parallel` en monitoring
- [Projectstructuur](./project-structure.md): waar workflowstate en geheugenbestanden staan
- [`oma goal set`](../cli-interfaces/commands.md#goal-set): stop gate en budget voor persistente workflows
- [Gids voor multi-agentprojecten](../guide/multi-agent-project.md)
- [Probleemoplossing](../guide/troubleshooting.md)
- [Woordenlijst](../getting-started/glossary.md)
