---
title: Gebruiksgids
sidebar_label: OMA gebruiken
description: Gebruiksgids voor OMA met taakselectie vanuit de lezer, voorbeelden voor single-skill- en multi-domeintaken, workflows, autodetectie, alle 33 skillpakketten, parallelle CLI-uitvoering, dashboards, defaults en herstel.
---

# oh-my-agent gebruiken

## Snelstart

1. Open je project in een geselecteerde AI-IDE of CLI (Claude Code, Codex CLI, Cursor, Antigravity, OpenCode, Kimi, Kiro, Qwen of een andere ondersteunde host).
2. De geselecteerde host kan [skills](../getting-started/glossary.md#skill) uit `.agents/skills/` laden; ingeschakelde hooks voegen skillhints toe op basis van natural-language-keywords en starten een [workflow](../getting-started/glossary.md#workflow) alleen via het slash-commando of, voor de vier persistente modi, via de naam van de modus.
3. Beschrijf in natuurlijke taal wat je wilt. De host of de geselecteerde workflow routeert de taak naar de relevante skill.
4. Gebruik voor multi-agentwerk `/work` of `/orchestrate`.

Voor single-domaintaken is geen speciale syntax nodig. Gebruik de [gids voor skill- en workflowselectie](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) om te kiezen tussen één skill, `/work`, `/orchestrate`, `/ultrawork` en `/ralph`. Zie [Snel starten](../getting-started/quick-start.md) voor de setup en [Important Defaults](../getting-started/important-defaults.md) vóór je providers wijzigt.

## Kies een gids

| Je taak | Begin met | Gids |
|-----------|------------|-------|
| Eén wijziging in één domein | Een gewone prompt (skillroutering) | [Single Skill](./single-skill.md) |
| Een feature over API, UI, mobile of database | `/work` (stap voor stap) of `/orchestrate` (geautomatiseerd) | [Multi-Agent Projects](./multi-agent-project.md) |
| Een bug met een foutmelding | `/debug` plus de fout en reproductiestappen | [Bug Fixing](./bug-fixing.md) |
| Agenten volgen terwijl ze draaien | `oma dashboard terminal` | [Dashboardmonitoring](./dashboard-monitoring.md) |
| Agentresultaten auditen of hervatten | `oma agent resume SESSION_ID --dry-run` | [Results and Resume](./agent-results-and-resume.md) |
| OMA-documenten vinden of migreren | `oma docs migrate --dry-run` | [Artefactindeling](./artifact-layout.md) |
| Er is iets misgegaan | `oma doctor --json` | [Probleemoplossing](./troubleshooting.md) |

---

## Voorbeeld 1: eenvoudige single task

**Je typt:**
```text
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**Wat gebeurt er:**

1. De host routeert het verzoek naar `oma-frontend` (keywords zoals "form", "component" en "Tailwind CSS" zijn routeringssignalen).
2. Laag 1 (`SKILL.md`) is al geladen met agentidentiteit, kernregels en bibliothekenlijst.
3. Laag 2-resources worden op aanvraag geladen:
   - `execution-protocol.md`: de workflow met 4 stappen (Analyze, Plan, Implement, Verify)
   - `snippets.md`: patronen voor formulieren en Zod-validatie, plus bestaande componentpatronen wanneer de skill die aanlevert
<!-- oma-docs:ignore-start -->
4. De agent implementeert:
   - React-component met TypeScript in `src/features/auth/components/login-form.tsx`
   - Zod-validatieschema in `src/features/auth/utils/login-validation.ts`
   - Vitest-tests in `src/features/auth/utils/__tests__/login-validation.test.ts`
   - Laadskelet in `src/features/auth/components/skeleton/login-form-skeleton.tsx`
<!-- oma-docs:ignore-end -->
5. De agent voert de checklist uit: toegankelijkheid (ARIA-labels, semantische HTML, toetsenbordnavigatie), mobiele viewport, prestaties (geen CLS) en error boundaries.

**Verwacht resultaat:** Een afgebakende React-component met TypeScript, validatie, tests en toegankelijkheidsbewijs wanneer het project die checks ondersteunt. De prompt en de geselecteerde workflow bepalen welke bestanden en checks werkelijk draaien.

---

## Voorbeeld 2: multi-domeinproject

**Je typt:**
```text
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**Wat gebeurt er:**

1. Dit verzoek omvat frontend-, backend- en mobilewerk. De hostagent kan die scope gebruiken om een coördinatieaanpak voor te stellen.
2. De keyword-detection-hook start geen workflow vanuit deze zin: hij activeert alleen `orchestrate`, `ultrawork`, `work` of `ralph`, en alleen wanneer de prompt de modus bij naam noemt. Hij classificeert het verzoek niet als multi-domein. Gebruik een expliciet commando om de gewenste workflow te kiezen.

**Met `/work` (stap voor stap met gebruikerscontrole):**

```text
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Stap 1, PM Agent plant:**
   - Identificeert domeinen: backend (auth API, task CRUD), frontend (login, task list UI), mobile (Flutter-app)
   - Definieert API-contracten: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`
   - Maakt een taakverdeling per prioriteitstier (lagere tiers draaien eerst):
     - Tier 1: Backend auth API, Backend task CRUD API
     - Tier 2: frontend-login/registratie, frontend-taaklijst, mobiele authschermen, mobiele taaklijst
     - Tier 3: QA-review
   - Slaat op in `.agents/results/plan-{sessionId}.json`

4. **Stap 2, Plan reviewen:** De agent presenteert het plan en gaat verder binnen de bestaande autorisatie. Hij vraagt alleen naar een materiële ontbrekende beslissing of nieuwe autorisatie.

5. **Stap 3, Agenten spawnen per prioriteitstier:**
   ```bash
   # Tier 1 (parallel). Task IDs come from .agents/results/plan-session-todo-01.json
   oma agent spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 --task-id api-auth -w ./apps/api &
   oma agent spawn db "User and task schema design" session-todo-01 --task-id db-schema &
   wait

   # Tier 2 (parallel, after tier 1 completes)
   oma agent spawn frontend "Login, register, task list UI" session-todo-01 --task-id web-ui -w ./apps/web &
   oma agent spawn mobile "Auth and task screens" session-todo-01 --task-id mobile-ui -w ./apps/mobile &
   wait
   ```

   `--task-id` moet overeenkomen met een taak-`id` in het sessieplan; zonder deze optie valt de taak-ID terug op de agent-ID, en een geplande sessie weigert een ID die er niet in staat (`Unknown plan task`). Ad-hocsessies zonder plan kunnen de optie weglaten.

6. **Stap 4, QA-agent reviewt:**
   - Beveiliging: OWASP Top 10-compliance (JWT-validatie, CSRF, SQL-injectiecontrole)
   - Prestaties: N+1-querycontrole, paginering verifiëren
   - Toegankelijkheid: WCAG 2.2 AA voor alle frontendcomponenten
   - Cross-domain: API-contractafstemming tussen frontend, mobile en backend

7. **Stap 5, Itereren:** Als QA CRITICAL-issues vindt, spawn je de verantwoordelijke agent opnieuw met het QA-rapport.

---

## Voorbeeld 3: bugfixing

**Je typt:**
```text
There's a bug. Clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**Wat gebeurt er:**

1. `oma-debug` activeert automatisch (keywords: "bug", "error", "Cannot read property").
2. **Stap 1, verzamelen:** De foutmelding en context worden vastgelegd.
<!-- oma-docs:ignore-start -->
3. **Stap 2, reproduceren:** MCP `search_for_pattern` vindt de `.map()`-call in `src/features/tasks/components/task-list.tsx`.
<!-- oma-docs:ignore-end -->
4. **Stap 3, diagnosticeren:** MCP `find_referencing_symbols` volgt de datastroom:
   - `useQuery`-hook haalt taken uit de API
   - Component rendert voordat data binnen is
   - `tasks` is `undefined` tijdens de loading state
   - Grondoorzaak: ontbrekende loading-statecheck vóór `.map()`
5. **Stap 4, fix voorstellen:** Presenteer een minimale wijziging met loading-statecheck en null guard.
6. **Stap 5, implementeren:**
   - Voeg een laadskelet toe terwijl data wordt opgehaald
   - Voeg een null-check toe: `tasks?.map()` of vroeg terugkeren bij de loading state
   - Schrijf een regressietest die verifieert dat de component correct rendert wanneer `tasks` `undefined` is
7. **Stap 6, scan op vergelijkbare patronen:** MCP `search_for_pattern` zoekt andere `.map()`-calls op mogelijk undefined arrays.
   - Vindt 3 vergelijkbare patronen in `user-list.tsx`, `comment-list.tsx`, `notification-list.tsx`
   - Past hetzelfde fixpatroon proactief toe
8. **Stap 7, documenteren:** Er wordt een bugrapport in het geheugen geschreven met oorzaak, fix en preventie.

---

## Voorbeeld 4: designsysteem

**Je typt:**
```text
/design Define a dark, premium visual system for my B2B SaaS analytics product. English and Korean, WCAG AA.
```

**Wat gebeurt er:**

1. **Laad de skill:** De workflow leest de skill `oma-design` en het bijbehorende uitvoeringsprotocol. De skill is verantwoordelijk voor de keuze van de leverancier en het projectdesigncontract.
2. **Bepaal scope en context:** Het verzoek wordt geclassificeerd als een designsysteemdocument. De workflow leest de bestaande `DESIGN.md`, `.design-context.md` indien aanwezig, merkmateriaal, ondersteunde talen en de betrokken UI, en zoekt naar bestaande UI-bibliotheken, themabestanden en tokens. Voor een bestaand product bepaalt hij eerst Preserve of Overhaul. Hij vraagt alleen door over een keuze die het resultaat materieel verandert en die niet uit het verzoek en de codebase blijkt; deze prompt vermeldt al de talen, doelgroep en toegankelijkheidsdoelstelling, dus er volgt geen vragenlijst.
3. **Selecteer richtlijnen en verzamel referenties:** Er wordt één externe designskill gekozen voor de bewerking: Interface Design voor een dashboard of SaaS-product-UI, Taste voor andere nieuwe web-artdirection, Impeccable voor kritische review of afwerking van een bestaande UI. Een aangevraagde vendorseed, een Stitch-bewerking, assetrichtlijnen of datagrid-regels worden alleen geladen wanneer de taak daarom vraagt.
4. **Bepaal de richting:** De gekozen richtlijnen worden toegepast op het projectbewijs. Alternatieve richtingen worden alleen voorgelegd wanneer een onopgeloste keuze het resultaat materieel beïnvloedt; een richting die je al hebt gekozen wordt hergebruikt. Elke richting blijft binnen het merk, CJK-lettertypedekking voor Koreaans, de bestaande implementatiestack, responsief gedrag vanaf de kleinste ondersteunde viewport en WCAG AA.
5. **Lever het artefact op:** `DESIGN.md` wordt aangemaakt of bijgewerkt met alle negen secties, inclusief Sectie 9 (Agent Prompt Guide). Tokens koppelen semantische rollen aan het bestaande tokensysteem en themaformaat van het project; er wordt geen parallelle configuratie geïntroduceerd. Er wordt geen implementatiecode geschreven.
6. **Verifieer en draag over:** De toepasselijke checklistitems worden gecontroleerd en wat is geïnspecteerd wordt benoemd. Controles waarvoor een gerenderde implementatie nodig is worden gespecificeerd maar niet uitgevoerd. Het rapport somt de opgeleverde artefacten, de gekozen route, de verificatieresultaten en de resterende beperkingen op, en draagt de implementatie daarna over aan `oma-frontend` (web) of `oma-mobile` (native).

---

## Voorbeeld 5: parallelle CLI-uitvoering

```bash
# Single agent for a simple task
oma agent spawn frontend "Add dark mode toggle to the header" session-ui-01

# Three agents in parallel for a full-stack feature
oma agent spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# After editing .agents/agents/ or workflows, regenerate vendor-native files
oma link claude codex antigravity

# Monitor while agents work (separate terminal)
oma dashboard terminal        # Terminal UI with live table
oma dashboard web             # Web UI; prints http://127.0.0.1:9847/

# After implementation, run QA
oma agent spawn qa "Review notification feature across all platforms" session-notif-01

# Check session statistics after completion
oma stats get
```

Als je huidige runtime overeenkomt met de doelvendor in `.agents/oma-config.yaml`, moeten workflows native subagenten prefereren:

- Claude Code -> `.claude/agents/*.md`
- Codex CLI -> `.codex/agents/*.toml`
- Qwen Code -> `.qwen/agents/*.md`, geselecteerd via de `subagent_type` van de Agent-tool
- Antigravity CLI/IDE -> `oma agent spawn` via `agy`

Cross-vendor taken en `model_preset: free` gebruiken `oma agent spawn`. Native dispatch vereist nog steeds de [resultaatlevenscyclus](./agent-results-and-resume.md) om verificatie-evidence vast te leggen.

---

<a id="voorbeeld-6-ultrawork-voor-maximale-kwaliteit"></a>
## Voorbeeld 6: uitgebreide review met ultrawork {#example-6-ultrawork-for-maximum-quality}

**Je typt:**
```text
/ultrawork Build a payment processing module with Stripe integration
```

**Wat gebeurt er (5 fasen, 17 stappen, 12 geïsoleerde reviewstappen):**

**Fase 1, PLAN (stappen 1-4, PM-agent inline):**
- Stap 1: Plan maken met taakverdeling, API-contracten en afhankelijkheden
- Stap 2: Planreview (volledigheidscontrole; zijn alle requirements gekoppeld?)
- Stap 3: Metareview (zelf verifiëren of de review voldoende was)
- Stap 4: Over-engineeringreview (MVP-focus, geen onnodige complexiteit)
- PLAN_GATE: Plan gedocumenteerd, aannames opgesomd, scope geautoriseerd

**Fase 2, IMPL (stap 5, dev-agents gespawnd):**
- Backend-agent implementeert Stripe-integratie (webhooks, idempotency, foutafhandeling)
- Frontend-agent bouwt checkoutflow en UI voor betaalstatus
- Stap 5.2: Alleen een baseline vastleggen wanneer een gedefinieerde meetvergelijking nodig is
- IMPL_GATE: toepasselijke checks en tests zonder emit slagen, alleen geplande bestanden gewijzigd; buildchecks alleen wanneer expliciet gevraagd

**Fase 3, VERIFY (stappen 6-8, QA-agent gespawnd):**
- Stap 6: Alignmentreview (komt implementatie overeen met het plan?)
- Stap 7: Security-/bugreview (OWASP, npm audit, Stripe-security best practices)
- Stap 8: Improvement-/regressiereview (geen regressies geïntroduceerd)
- VERIFY_GATE: nul CRITICAL, nul HIGH, toepasselijke meetdoelen van het project gehaald

**Fase 4, REFINE (stappen 9-13, refactor-agent gespawnd):**
- Stap 9: Grote bestanden (> 500 regels) en functies (> 50 regels) splitsen
- Stap 10: Integration-/reuse-review (dubbele logica verwijderen)
- Stap 11: Side-effectreview (cascade-impact volgen met `find_referencing_symbols`)
- Stap 12: Volledige changereview (naamgevingsconsistentie, stijlafstemming)
- Stap 13: Dode code opruimen
- REFINE_GATE: geen onopgeloste gemeten regressie, code schoon

**Fase 5, SHIP (stappen 14-17, QA-agent gespawnd):**
- Stap 14: Codekwaliteitsreview (lint, types, coverage)
- Stap 15: UX-flowverificatie (end-to-end betaalreis)
- Stap 16: Review van gerelateerde issues (laatste cascade-impactcheck)
- Stap 17: Deploymentgereedheid (secretsmanagement, migratiescripts, rollbackplan)
- SHIP_GATE: alle checks slagen; bestaande autorisatie hergebruiken. Publiceren of deployen vereist autorisatie voor die actie.

---

## Alle workflowcommando's

| Commando | Type | Wat het doet | Wanneer gebruiken |
|---------|------|-------------|---------|
| `/orchestrate` | Persistent | Laadt of maakt een plan en delegeert daarna parallelle uitvoering met monitoring en verificatie | Onafhankelijke taken geschikt voor automatische parallelle coördinatie |
| `/work` | Persistent | Stapsgewijze planning, implementatie en QA over meerdere domeinen binnen de geautoriseerde scope | Features over meerdere domeinen die gecoördineerde levering nodig hebben |
| `/ultrawork` | Persistent | Kwaliteitsworkflow met 5 fasen, 17 stappen en 12 geïsoleerde reviewcheckpoints | Maximale kwaliteit, productie-kritieke code |
| `/plan` | Niet-persistent | PM-gestuurde taakdecompositie, API-contracten en bijgehouden planartefacts in `docs/plans/work/` (sequentiële `NNN-name.md`, veld Status voor levenscyclus) | Vóór complex multi-agentwerk; complexe features met bijgehouden voortgang en beslislogs |
| `/brainstorm` | Niet-persistent | Design-first ideevorming met 2-3 benaderingen | Vóór je een implementatieaanpak vastlegt |
| `/deepinit` | Niet-persistent | Volledige projectinitialisatie (AGENTS.md, ARCHITECTURE.md, docs/) | oh-my-agent in een bestaande codebase instellen |
| `/review` | Niet-persistent | QA-pipeline: OWASP-security, prestaties, toegankelijkheid en codekwaliteit. De scope komt uit het verzoek en valt standaard terug op de huidige wijzigingen | Vóór code mergen, review vóór deployment |
| `/security` | Niet-persistent | Applicatiebroncode, agent-skills of MCP-componenten scannen, bevindingen valideren en security gates configureren via `oma-security`. Penetratietests van een afgebakend web-testdeployment draaien alleen tegen een door de gebruiker aangeleverd en beoordeeld runtimeplatform | Vóór een release, of wanneer een wijziging een securityscan of gate nodig heeft |
| `/debug` | Niet-persistent | Gestructureerd debuggen: reproduceren, diagnosticeren, fixen, regressietest en scan | Bugs en fouten onderzoeken |
| `/design` | Niet-persistent | Bakent een designtaak af, kiest de toepasselijke designrichtlijnen en levert bevindingen, `DESIGN.md`, een redesignrichting of designtokens op via `oma-design` | Een visueel systeem definiëren of reviewen, UI-redesigns en designaudits |
| `/scm` | Niet-persistent | SCM-workflow voor Git (branch/merge/conflict/worktree/baseline) plus Conventional Commit-generatie met automatische type-/scopedetectie en featuresplitsing | Na codewijzigingen of bij repository configuration management |
| `/stack-set` | Niet-persistent | Projecttechstack automatisch detecteren en backend- of mobile-referenties genereren (Swift/Flutter/RN) | Taalspecifieke codeconventies instellen |
| `/architecture` | Niet-persistent | Architectuur diagnosticeren, vergelijken en beslisrecords maken | Grenzen reviewen of architectuur kiezen |
| `/convert` | Niet-persistent | Documentconversie naar de passende skill routeren | HWP/HWPX- of PDF-bronbestanden converteren |
| `/docs` | Niet-persistent | Documentatie verifiëren en diffgerichte syncvoorstellen maken | Docs tegen de huidige codebase controleren |
| `/explain` | Niet-persistent | Offline HTML-uitleg genereren voor een codewijziging of een onderwerp, valideren met `oma explain validate` en openen met `oma explain render --open` | Een diff, PR, branch of commitreeks onderwijzend uitleggen, of een onderwerp verklaren |
| `/recap` | Niet-persistent | Werk samenvatten uit ondersteunde AI-toolgeschiedenissen | Dagelijkse of periodieke retrospective |
| `/schedule` | Niet-persistent | Terugkerende agentjobs registreren | Nachtelijke recaps, scans of housekeeping |
| `/video` | Niet-persistent | Reproduceerbare video's samenstellen uit script, narratie en visuals | Shorts, explainers en demo's |
| `/ralph` | Persistent | Ultrawork herhaald uitvoeren met een geprompte judge en lusbeveiligingen | Expliciet herhalen tot mechanische voltooiingscriteria slagen |

---

## Voorbeelden van autodetectie

De keyword-hook start alleen vier persistente modi, en alleen wanneer de prompt de modus bij naam noemt. Andere workflows starten via hun slash-commando.

| Je typt | Gedetecteerde workflow | Taal |
|----------|------------------|----------|
| "Orchestrate this deployment." | `/orchestrate` | Engels |
| "orquestar este trabajo" | `/orchestrate` | Spaans |
| "ultrawork this refactor" | `/ultrawork` | Engels |
| "ulw로 고쳐줘" | `/ultrawork` | Koreaans |
| "Switch to work mode for this refactor." | `/work` | Engels |
| "work workflow로 진행해줘" | `/work` | Koreaans |
| "ralph this task" | `/ralph` | Engels |
| "랄프로 끝까지 해줘" | `/ralph` | Koreaans |

Zinnen zoals "plan the authentication feature", "fix the login bug", "do everything in parallel" en "don't stop until it's done" starten geen workflow.

**Informatieve vragen worden gefilterd:**

| Je typt | Resultaat |
|----------|--------|
| "what is orchestrate?" | Geen workflowtrigger (informatief patroon: "what is") |
| "explain how /plan works" | Geen workflowtrigger (informatief patroon: "explain") |
| "어떻게 사용해?" | Geen workflowtrigger (informatief patroon: "어떻게") |
| "レビューとは何ですか" | Geen workflowtrigger (informatief patroon: "とは") |

---

## Alle 33 skills: snelreferentie

De `all`-preset van de installer volgt de live registry. De tabel groepeert elke actuele skill op primair gebruik; een skill kan bij een grens nog steeds met een andere samenwerken.

| Skill | Beste gebruik | Primaire output |
|-------|------------|---------------|
| **oma-academic-writing** | Academische tekst opstellen, reviseren en anti-AI-review | Publicatiegerichte tekst en claim/evidence-revisies |
| **oma-architecture** | Systeemgrenzen, afwegingen, ADR's | Architectuuraanbeveling of beslisrecord |
| **oma-backend** | API's, auth, serverlogica, migraties | Router/service/repository-wijzigingen en verificatie |
| **oma-brainstorm** | Ambigue ideeën en benaderingsvergelijking | Ontwerpdocument in `docs/plans/designs/` |
| **oma-coordination** | Gedeelde coördinatieregels voor `/work`, `/orchestrate` en `/ultrawork`; handmatige stapsgewijze coördinatie | Richtlijnen voor planhergebruik, contractafstemming, workspace-eigendom en QA-overdracht |
| **oma-db** | Schemadesign, ERD, querytuning, capaciteitsplanning | Schemasdocumentatie, migraties en herstelplan |
| **oma-debug** | Bugreproductie en grondoorzaakanalyse | Minimale fix, regressiebewijs en patroonscan |
| **oma-security** | Securityscans van broncode, agent-skills en MCP; penetratietests alleen op een door de gebruiker aangeleverd en beoordeeld runtimeplatform | Gevalideerde bevindingen en configuratie van scan-gates |
| **oma-design** | Visuele systemen, `DESIGN.md`, redesignrichting, UI-designreview | Designbesluit of bevindingen, `DESIGN.md` wanneer het systeem verandert en een overdracht voor implementatie |
| **oma-dev-workflow** | CI/CD, monorepo's, migraties, releaseautomatisering | Workflowconfiguratie en releasechecks |
| **oma-docs** | Kapotte verwijzingen en documentatiedrift | Verificatierapport of diffgerichte synckandidaten |
| **oma-explanation** | Diff-, PR-, branch- of commitwalkthroughs; uitleg over onderwerpen | Offline HTML-uitleg (Background, Intuition, Code en Quiz voor een wijziging) |
| **oma-frontend** | UI-componenten, formulieren, pagina's, Angular- of React-styling | Frontendwijzigingen en relevante checks |
| **oma-hwp** | HWP/HWPX/HWPML-conversie | Markdown met koppen, tabellen, afbeeldingen en links |
| **oma-image** | Afbeeldingen en visuele assets genereren | Reproduceerbare beeldrun met manifest |
| **oma-market** | Pijnpunten, trends, concurrentie en discovery onderzoeken | LAW-conforme onderzoeksbrief met frameworks |
| **oma-mobile** | Flutter-, React Native-, Swift-iOS- en Kotlin-Android-werk | Mobiele schermen, state, platformintegratie en tests |
| **oma-observability** | Traces, metrics, logs, profiles, SLO's, incidentforensiek | Gelaagd observabilityadvies of implementatiegids |
| **oma-orchestration** | Geautomatiseerde parallelle agentuitvoering | Gecoördineerde plannen, geheugenupdates en resultaatverzameling |
| **oma-pdf** | PDF-conversie en OCR-bewuste extractie | Markdown met leesvolgorde, tabellen, lijsten en afbeeldingen |
| **oma-pm** | Requirements, taakverdeling, API-contracten | `.agents/results/plan-{sessionId}.json` en task board |
| **oma-qa** | Security-, prestatie-, toegankelijkheids- en kwaliteitsreview | Bevindingenrapport met ernst en remediatiebewijs |
| **oma-recap** | Retrospectives over tools heen | Dagrecap of perioderecap in `.agents/results/recap/` |
| **oma-refactor** | Gedragsbehoudende herstructurering | Refactorwijzigingen met karakterisering en kwaliteitbewijs |
| **oma-scholar** | Scholarly search en paper-sidecars | Gevalideerde `.knows.yaml`-sidecarbewerkingen |
| **oma-scm** | Git-branches, worktrees, baselines en commit-hygiëne | SCM-plan of Conventional Commit-output |
| **oma-search** | Externe documentatie, webbronnen, externe code en het lezen van bekende URL's | Geciteerde bronnen met route, provider, bewijs en beperkingen |
| **oma-skill-creation** | OMA-skills maken en auditen | SSL-lite-skillbestanden en `oma skill audit`-resultaten |
| **oma-slide** | HTML-presentatiedecks en exports | Gevalideerde gebundelde HTML, PDF, PNG of PPTX |
| **oma-tf-infra** | Terraform-infrastructuur, IAM en policy-as-code | Terraformmodules, plannen en controls |
| **oma-translation** | UI-, documentatie- en marketinglokalisatie | Contextbehoudende vertaalde content |
| **oma-video** | Shorts, explainers en demo's | Reproduceerbare videorun met assets en manifest |
| **oma-voice** | Lokale TTS, STT en voice-overs | Audio- of transcriptartefacts met manifest |

---

## Dashboard instellen

```bash
oma dashboard terminal   # live table in this terminal; Ctrl+C to exit
oma dashboard web        # prints http://127.0.0.1:9847/; open it in a browser
```

Beide commando's bewaken `.agents/state/memories/` onder de huidige directory. Geef `--project-root <path>` mee om een ander project te bewaken, of stel `MEMORIES_DIR` in. De agenttabel heeft vier kolommen:

| Kolom | Bron |
|--------|--------|
| Agent | `task-board.md`, of agentnamen die in geheugenbestanden zijn gevonden |
| Status | Terminalsymbolen: ● running (groen), ✓ completed (cyaan), ✗ failed (rood), ○ blocked (geel), ◌ pending (gedimd) |
| Turn | `turn: N` in het `progress-<agent>*.md`-bestand van de agent |
| Task | Taaktekst uit het task board of het bestand van de agent |

Onder de tabel tonen beide dashboards de laatste activiteit uit de vijf meest recent gewijzigde geheugenbestanden. Indelingen, databronnen en herstelstappen staan in [Dashboardmonitoring](./dashboard-monitoring.md).

---

## Kernconcepten uitgelegd

### Progressieve onthulling

Skills laden in twee lagen om tokens te besparen. Laag 1 (`SKILL.md`) komt in de context wanneer de host de skill routeert — de injector geeft een pad, niet de inhoud. Laag 2 (`resources/`) wordt alleen gelezen wanneer de taak die nodig heeft; de moeilijkheidsgraad bepaalt een zacht budget, geen lijst met bestanden. Hoeveel dat bespaart, hangt af van de skills en de taak, dus meet het in plaats van een getal aan te nemen: de [tokenbesparingsberekening](../core-concepts/skills.md#token-savings-math) bevat het script en legt uit wat de schattingen dekken.

### Tokenoptimalisatie

Naast progressieve onthulling optimaliseert oh-my-agent tokens via:
- **Contextbudgetbeheer:** geen volledige file reads; gebruik `find_symbol` in plaats van `read_file`
- **Lazy resource loading:** error playbooks alleen bij fouten laden, checklists pas bij verificatie
- **Vertakking op moeilijkheid:** Simple-taken slaan analyse over en gebruiken minimale checklists
- **Voortgangstracking:** agenten registreren gelezen bestanden om herlezen te voorkomen

### CLI-spawning

Wanneer je `oma agent spawn` draait, doet de CLI het volgende:
1. De vendor van de rol oplossen uit expliciete opties, agentoverrides, de modelpreset en de ingestelde fallback
2. Het vendor-specifieke uitvoeringsprotocol uit `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md` injecteren
3. De agentprompt samenstellen met de kernregels van SKILL.md, het uitvoeringsprotocol en taakrelevante resources
4. De agent als onafhankelijk CLI-proces spawnen
5. Een gestructureerde receipt onder `.agents/state/agent-runs/` schrijven en een claimpad injecteren
6. De agent een gestructureerde claim laten schrijven; mensleesbare voortgangs- en resultaat-Markdown is aanvullend

### Projectgeheugenopslag

Agenten coördineren via duurzame bestanden in `.agents/state/memories/` (oudere projecten vallen terug op het legacy-pad `.serena/memories/`). De orchestrator schrijft rungebonden sessie- en task-boardbestanden. Elke run schrijft `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` en `result-{agentId}-{taskId}-{runId}-{sessionId}.md` wanneer Markdown-output voor voortgang of resultaten aanstaat; gestructureerde receipts en claims in `.agents/state/agent-runs/` zijn leidend voor CLI-spawns. Agenten lezen en schrijven deze bestanden met hun native tools; de toolmapping blijft configureerbaar in `.agents/mcp.json → memoryConfig.tools`.

### Documenten en rapporten

Gebruik `docs/decisions/` voor aanpakvoorstellen en ADR's, met een veld `Status` zoals `draft`, `accepted` of `superseded`. UI-design hoort in `DESIGN.md`. Werkplannen blijven in `docs/plans/work/`, en overgenomen API-contracten blijven in `docs/plans/contracts/`.

Uitvoeringsrapporten en conceptcontracten horen in `.agents/results/`. Wanneer een document een onderhouden projectreferentie wordt, verplaats je het naar de relevante map onder `docs/` en laat je op de vorige locatie een link achter. Zie [Artefactindeling](./artifact-layout.md) voor de volledige indeling en migratieopdrachten.

### Werkruimtes

<!-- oma-docs:ignore-start -->
De vlag `-w` bij `agent spawn` isoleert een agent in een specifieke directory. Dit is essentieel voor parallelle uitvoering. Zonder isolatie kunnen twee agenten tegelijk hetzelfde bestand wijzigen en conflicten veroorzaken. Standaardindeling: `./apps/api` (backend), `./apps/web` (frontend), `./apps/mobile` (mobile).
<!-- oma-docs:ignore-end -->

---

## Tips

1. **Wees specifiek in prompts.** "Build a TODO app with JWT auth, React frontend, Express backend, PostgreSQL" benoemt de vereiste stack en functionaliteit; "make an app" laat die open.

2. **Gebruik werkruimtes voor parallelle agenten.** Geef altijd `-w ./path` mee om conflicten te voorkomen tussen gelijktijdig draaiende agenten.

3. **Leg API-contracten vast vóór implementatieagenten spawnen.** Draai eerst `/plan`, zodat frontend- en backendagenten dezelfde endpointvormen gebruiken.

4. **Monitor actief.** Open een dashboardterminal om falende agenten vroeg te zien, in plaats van problemen pas na voltooiing van alle agenten te ontdekken.

5. **Itereer met respawns.** Als output niet klopt, spawn je opnieuw met de oorspronkelijke taak plus correctiecontext. Begin niet opnieuw vanaf nul.

6. **Stem coördinatie af op de taak.** Begin voor één domein met een enkele skill; gebruik de [selectiegids](/docs/core-concepts/workflows#choosing-a-skill-or-workflow) wanneer de taak coördinatie of een expliciet kwaliteitsproces nodig heeft.

7. **Gebruik `/brainstorm` vóór `/plan` bij ambigue ideeën.** Brainstorm verheldert intent en aanpak voordat de PM-agent taken opdeelt.

8. **Draai `/deepinit` op nieuwe codebases.** Die opdracht maakt AGENTS.md en ARCHITECTURE.md zodat alle agenten de projectstructuur begrijpen.

9. **Configureer `model_preset`.** Begin met `auto`, kies een vaste preset zoals `claude`, `antigravity`, `codex`, `qwen`, `cursor`, `kiro` of `mixed`, of gebruik `free` met de lokale gateway. Voeg `agents:`-overrides toe voor fijnmazige controle. Zie [Modellen per agent](./per-agent-models.md).

10. **Gebruik `/ultrawork` wanneer je expliciet het volledige reviewproces wilt.** De workflow met 5 fasen draait 12 geïsoleerde reviewstappen; alleen skills laden voert die checks niet uit.

---

## Probleemoplossing {#troubleshooting}

Zie [Probleemoplossing](./troubleshooting.md) voor foutmeldingen, mislukte runresultaten, schedules en hooks.

| Probleem | Oorzaak | Oplossing |
|---------|-------|-----|
| Skills worden niet gedetecteerd in de IDE | `.agents/skills/` ontbreekt of bevat geen `SKILL.md`-bestanden | Draai de installer (`bunx oh-my-agent@latest`), controleer symlinks in `.claude/skills/` en start de IDE opnieuw |
| CLI niet gevonden bij spawnen | Geselecteerde AI-CLI is niet geïnstalleerd of staat niet op `PATH` | Draai `which <selected-cli>` (bijvoorbeeld `claude`, `codex`, `agy`, `qwen` of `kiro-cli`), open een nieuwe shell of installeer volgens de installatiegids |
| Agenten produceren conflicterende code | Geen werkruimte-isolatie | Gebruik aparte werkruimtes: `-w ./apps/api`, `-w ./apps/web` |
| Dashboard toont "No agents detected yet" | Agenten hebben nog niet naar geheugen geschreven, of het dashboard bewaakt een andere directory | Wacht op het eerste progressbestand; draai vanuit de projectroot of geef `--project-root <path>` mee |
| `oma dashboard web` stopt met "port 9847 is already in use" | Een ander proces bezet de poort | `DASHBOARD_PORT=8080 oma dashboard web` |
| QA-rapport heeft 50+ issues | Normaal bij een eerste review van grote codebases | Richt je eerst op CRITICAL en HIGH. Documenteer MEDIUM/LOW voor latere sprints |
| Een persistente modus start terwijl je alleen de naam noemde | De prompt noemt `orchestrate`, `ultrawork`, `work mode` of `ralph` buiten een vraag of codeblok | Zeg "workflow done" om de modus vrij te geven. Meld false triggers ter verbetering |
| Persistente workflow stopt niet | Statusbestand bestaat nog | Zeg "workflow done" in de chat, of verwijder het statusbestand handmatig uit `.agents/state/` |
| Agent is geblokkeerd op HIGH-clarification | Requirements zijn te ambigue | Geef de gevraagde antwoorden en voer daarna opnieuw uit |
| MCP-tools werken niet | Serena is niet geconfigureerd of draait niet | Voer `oma doctor` uit om de MCP-configuratie te controleren |
| Agent overschrijdt uitvoeringsbudget | Taak is te complex voor één run | Deel de taak op, gebruik een workflow met expliciete taakgrenzen of retry met een smallere acceptatie-omschrijving |
| Verkeerde CLI voor agent gebruikt | `model_preset` niet geconfigureerd of agentoverride ontbreekt | Voer `oma install` uit om te configureren, of stel `model_preset` in `oma-config.yaml` in. Zie [Modellen per agent](./per-agent-models.md). |

---

## Volgende stappen

- Eén wijziging in één domein: [Single Skill](./single-skill.md)
- Een feature over meerdere domeinen: [Multi-Agent Projects](./multi-agent-project.md)
- Een bug met een foutmelding: [Bug Fixing](./bug-fixing.md)
- Een run volgen: [Dashboardmonitoring](./dashboard-monitoring.md)
- Agentresultaten auditen of hervatten: [Results and Resume](./agent-results-and-resume.md)
- OMA-documenten vinden of migreren: [Artefactindeling](./artifact-layout.md)
- Er is iets misgegaan: [Probleemoplossing](./troubleshooting.md)
- Details over projectintegratie: [Integratiegids](./integration.md)
- Termen die in deze gidsen worden gebruikt: [Woordenlijst](../getting-started/glossary.md)
