---
title: "Gids: Uitvoering met één skill"
sidebar_label: Eén skill
description: Gedetailleerde gids voor taken binnen één domein in oh-my-agent, met gebruiksmomenten, preflight-checklist, promptsjabloon met uitleg, praktijkvoorbeelden voor frontend-, backend-, mobile- en databasetaken, de verwachte uitvoeringsstroom, een checklist voor de kwaliteitsgate en escalatiesignalen.
---

# Uitvoering met één skill

Uitvoering met één skill is de snelle route: één agent, één domein, één gerichte taak. Er is geen orchestratie-overhead en geen coördinatie tussen meerdere agenten. Een host of geselecteerde workflow kan een prompt in natuurlijke taal naar de skill routeren; het hook-systeem detecteert workflows zelf en het routinggedrag hangt af van de geselecteerde runtime.

## Snelle route

1. Voer één keer `oma doctor` uit om de geselecteerde hostintegratie te controleren. Optionele waarschuwingen over providers blokkeren een taak niet wanneer die providers niet worden gebruikt.
2. Beschrijf één zelfstandige wijziging met een duidelijke voorwaarde **Goal**, **Context**, **Constraints** en **Done When**.
3. Verwacht dat de geselecteerde skill de repository inspecteert, zijn scope vermeldt wanneer het actieve uitvoeringscontract een `CHARTER_CHECK` vereist en rapporteert welke controles werkelijk zijn uitgevoerd.
4. Als de taak zich uitbreidt over API-, UI-, database- of mobilegrenzen, stop je de run met één skill en schakel je over naar `/work` of `/orchestrate`.

Gebruik voor vastgelopen beheerde runs `oma agent status <session-id> [agent-id]`. Inspecteer daarna de receipts in `.agents/state/agent-runs/` en het geïnjecteerde claimpad voordat je opnieuw probeert. Zie [Belangrijke standaardinstellingen](../getting-started/important-defaults.md) voor provider- en herstelgedrag.

---

## Wanneer gebruik je één skill?

Gebruik dit wanneer je taak aan AL deze criteria voldoet:

- **Eigendom van één domein**: de volledige taak hoort bij frontend, backend, mobile, database, design, infrastructuur of een ander afzonderlijk domein.
- **Zelfstandig**: er zijn geen API-contractwijzigingen over domeinen heen en een frontendtaak heeft bijvoorbeeld geen backendwijziging nodig.
- **Duidelijke scope**: je weet wat de output moet zijn (een component, endpoint, schema of fix).
- **Geen coördinatie**: andere agenten hoeven niet voor of na deze taak te draaien.

**Voorbeelden van taken met één skill:**

- Eén UI-component bouwen
- Eén API-endpoint toevoegen
- Eén bug in één laag oplossen
- Eén databasetabel ontwerpen
- Eén Terraform-module schrijven
- Eén set i18n-strings vertalen
- Eén gedeelte van een designsysteem maken

**Schakel over naar multi-agent** (`/work` of `/orchestrate`) wanneer:

- UI-werk een nieuw API-contract nodig heeft (frontend + backend)
- Eén fix doorwerkt naar meerdere lagen (debug + implementatieagents)
- De feature frontend, backend en database omvat
- De scope na de eerste iteratie groter wordt dan één domein

Tests en acceptatiecriteria horen ook bij werk met één skill; op zichzelf vereisen ze geen `/ralph`. Zie voor coördinatie tussen domeinen of een expliciet gevraagd kwaliteitsproces de [keuzegids voor skills en workflows](/docs/core-concepts/workflows#choosing-a-skill-or-workflow).

---

## Preflight-checklist

Beantwoord deze vier vragen voordat je de prompt schrijft:

| Element | Vraag | Waarom dit belangrijk is |
|---------|-------|--------------------------|
| **Goal** | Welk specifiek artefact moet worden gemaakt of gewijzigd? | Voorkomt dubbelzinnigheid (bijvoorbeeld ‘een knop toevoegen’ versus ‘een formulier met validatie toevoegen’). |
| **Context** | Welke stack, welk framework en welke conventies zijn van toepassing? | De agent kan dit uit projectbestanden afleiden, maar expliciete context is beter. |
| **Constraints** | Welke regels moeten worden gevolgd? (stijl, security, performance, compatibiliteit) | Zonder beperkingen gebruiken agenten standaardinstellingen die niet bij je project passen. |
| **Done When** | Welke acceptatiecriteria ga je controleren? | Geeft de agent een doel en jou een verificatiechecklist. |

Als een element in je prompt ontbreekt, zal de agent:

- **LOW uncertainty:** standaardinstellingen toepassen en aannames opsommen
- **MEDIUM uncertainty:** 2–3 opties presenteren en doorgaan met de waarschijnlijkste
- **HIGH uncertainty:** blokkeren en vragen stellen (er wordt geen code geschreven)

---

## Promptsjabloon

```text
Build <specific artifact> using <stack/framework>.
Constraints: <style, performance, security, or compatibility constraints>.
Acceptance criteria:
1) <testable criterion>
2) <testable criterion>
3) <testable criterion>
Add tests for: <critical test cases>.
```

### Uitleg van het sjabloon

| Onderdeel | Doel | Voorbeeld |
|---------|------|---------|
| `Build <specific artifact>` | Het Goal (wat je maakt) | "Build a user registration form component" |
| `using <stack/framework>` | De Context (technische stack) | "using React + TypeScript + Tailwind CSS" |
| `Constraints:` | Regels die de agent moet volgen | "accessible labels, no external form libraries, client-side validation only" |
| `Acceptance criteria:` | Done When (verifieerbare resultaten) | "1) email format validation 2) password strength indicator 3) submit disabled while invalid" |
| `Add tests for:` | Testvereisten | "valid/invalid submit paths, edge cases for email validation" |

---

## Praktijkvoorbeelden

### Frontend: inlogformulier

```text
Create a login form component in React + TypeScript + Tailwind CSS.
Constraints: accessible labels, client-side validation with Zod, no external form library beyond @tanstack/react-form, shadcn/ui Button and Input components.
Acceptance criteria:
1) Email validation with meaningful error messages
2) Password minimum 8 characters with feedback
3) Disabled submit button while form is invalid
4) Keyboard and screen-reader friendly (ARIA labels, focus management)
5) Loading state while submitting
Add unit tests for: valid submission path, invalid email, short password, loading state.
```

**Verwachte uitvoeringsstroom:**

1. **Skill-routing:** De host of workflow selecteert `oma-frontend` (woorden zoals "form", "component", "Tailwind CSS" en "React" zijn routing-signalen).
2. **Moeilijkheidsinschatting:** Gemiddeld (2–3 bestanden, met enkele ontwerpkeuzes rond de validatie-UX).
3. **Geladen resources:**
   - `execution-protocol.md` (altijd)
   - `snippets.md` (formulier- en Zod-patronen, plus bestaande componentpatronen wanneer de skill die aanlevert)
4. **Uitvoeringscontract (wanneer ingeschakeld) kan `CHARTER_CHECK` uitsturen:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
<!-- oma-docs:ignore-start -->
5. **Implementatie:**
   - Maakt `src/features/auth/components/login-form.tsx` (Client Component met `"use client"`)
   - Maakt `src/features/auth/utils/login-schema.ts` (Zod-schema)
   - Maakt `src/features/auth/components/skeleton/login-form-skeleton.tsx`
   - Gebruikt shadcn/ui `<Button>`, `<Input>`, `<Label>` (alleen lezen, niet wijzigen)
   - Het formulier wordt afgehandeld door `@tanstack/react-form` met Zod-validatie
   - Absolute imports met `@/`
   - Eén component per bestand
6. **Verificatie:**
   - Checklist: ARIA-labels aanwezig, semantische headings, toetsenbordnavigatie werkt
   - Mobile: correcte weergave bij een viewport van 320px
   - Performance: geen CLS
   - Tests: Vitest-testbestand op `src/features/auth/utils/__tests__/login-schema.test.ts`
<!-- oma-docs:ignore-end -->

---

### Backend: REST API-endpoint

```text
Add a paginated GET /api/tasks endpoint that returns tasks for the authenticated user.
Constraints: Repository-Service-Router pattern, parameterized queries, JWT auth required, cursor-based pagination.
Acceptance criteria:
1) Returns only tasks owned by the authenticated user
2) Cursor-based pagination with next/prev cursors
3) Filterable by status (todo, in_progress, done)
4) Response includes total count
Add tests for: auth required, pagination, status filter, empty results.
```

**Verwachte uitvoeringsstroom:**

1. **Skill-routing:** De host of workflow selecteert `oma-backend` (woorden zoals "API", "endpoint" en "REST" zijn routing-signalen).
2. **Stackdetectie:** Leest `pyproject.toml` of `package.json` om de taal en het framework te bepalen. Als gegenereerde `stack/`-verwijzingen of meegeleverde `variants/` bestaan, laadt de agent de conventies daaruit.
3. **Moeilijkheidsinschatting:** Gemiddeld (2–3 bestanden: route, service, repository en test).
4. **Geladen resources:**
   - `execution-protocol.md` (altijd)
<!-- oma-docs:ignore-start -->
   - overeenkomende `stack/snippets.md` of `variants/{node,python,rust}/snippets.md` wanneer beschikbaar
   - overeenkomende `stack/tech-stack.md` of verwijzingen naar variant-tech-stacks
<!-- oma-docs:ignore-end -->
5. **Uitvoeringscontract (wanneer ingeschakeld) kan `CHARTER_CHECK` uitsturen:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **Implementatie:**
   - Repository: `TaskRepository.find_by_user(user_id, cursor, status, limit)` met geparametriseerde query
   - Service: `TaskService.get_user_tasks(user_id, cursor, status, limit)` (wrapper voor bedrijfslogica)
   - Router: `GET /api/tasks` met JWT-authmiddleware, invoervalidatie en response-opmaak
   - Tests: auth is vereist en geeft 401, paginering geeft de juiste cursor, filter werkt, lege resultaten geven 200 met een lege array

---

### Mobile: instellingenscherm

```text
Build a settings screen in Flutter with profile editing (name, email, avatar), notification preferences (toggle switches), and a logout button.
Constraints: Riverpod for state management, GoRouter for navigation, Material Design 3, handle offline gracefully.
Acceptance criteria:
1) Profile fields pre-populated from user data
2) Changes saved on submit with loading indicator
3) Notification toggles persist locally (SharedPreferences)
4) Logout clears token storage and navigates to login
5) Offline: show cached data with "offline" banner
Add tests for: profile save, logout flow, offline state.
```

**Verwachte uitvoeringsstroom:**

1. **Skill-routing:** De host of workflow selecteert `oma-mobile` (woorden zoals "Flutter", "screen" en "mobile" zijn routing-signalen).
2. **Moeilijkheidsinschatting:** Gemiddeld (instellingenscherm + state management + offline-afhandeling).
3. **Geladen resources:**
   - `execution-protocol.md`
   - `snippets.md` (schermtemplate, Riverpod-providerpatroon)
   - `screen-template.dart`
4. **Uitvoeringscontract (wanneer ingeschakeld) kan `CHARTER_CHECK` uitsturen:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
<!-- oma-docs:ignore-start -->
5. **Implementatie:**
   - Scherm: `lib/features/settings/presentation/settings_screen.dart` (Stateless Widget met Riverpod)
   - Providers: `lib/features/settings/providers/settings_provider.dart`
   - Repository: `lib/features/settings/data/settings_repository.dart`
   - Offline-afhandeling: Dio-interceptor vangt `SocketException` op en valt terug op gecachte data
   - Alle controllers worden opgeruimd in de `dispose()`-methode
<!-- oma-docs:ignore-end -->

---

### Database: schemaontwerp

```text
Design a database schema for a multi-tenant SaaS project management tool. Entities: Organization, Project, Task, User, TeamMembership.
Constraints: PostgreSQL, 3NF, soft delete with deleted_at, audit fields (created_at, updated_at, created_by), row-level security for tenant isolation.
Acceptance criteria:
1) ERD with all relationships documented
2) External, conceptual, and internal schema layers documented
3) Index strategy for common query patterns (tasks by project, tasks by assignee)
4) Capacity estimation for 10K orgs, 100K users, 1M tasks
5) Backup strategy with full + incremental cadence
Add deliverables: data standards table, glossary, migration script.
```

**Verwachte uitvoeringsstroom:**

1. **Skill-routing:** De host of workflow selecteert `oma-db` (woorden zoals "database", "schema", "ERD" en "migration" zijn routing-signalen).
2. **Moeilijkheidsinschatting:** Complex (architectuurbeslissingen, meerdere entiteiten en capaciteitsplanning).
3. **Geladen resources:**
   - `execution-protocol.md`
   - `document-templates.md` (structuur van deliverables)
   - `examples.md`
   - `anti-patterns.md` (controle tijdens optimalisatie)
4. **Uitvoeringscontract (wanneer ingeschakeld) kan `CHARTER_CHECK` uitsturen:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **Workflow:** Verkennen (entiteiten, relaties, toegangspatronen, volume-inschattingen) -> Ontwerpen (externe/conceptuele/interne schema's, constraints, lifecyclevelden) -> Optimaliseren (indexen voor querypatronen, partitioneringsstrategie, back-upplan, controle op anti-patronen)
6. **Deliverables:**
   - Samenvatting van het externe schema (views per rol: admin, projectmanager, teamlid)
   - Conceptueel schema met ERD (Organization 1:N Project, Project 1:N Task, Organization 1:N TeamMembership, enzovoort)
   - Intern schema met fysieke DDL, indexen en partitionering
   - Tabel met datastandaarden (regels voor veldnamen, typeconventies)
   - Begrippenlijst (tenant, workspace, assignee, enzovoort)
   - Capaciteitsinschatting
   - Back-upstrategie (dagelijkse volledige back-up + elk uur incrementeel, 30 dagen bewaren)
   - Migrationscript

---

## Checklist voor de kwaliteitsgate

Controleer deze punten voordat je de output van de agent accepteert:

### Universele controles (alle agenten)

- [ ] **Gedrag voldoet aan de acceptatiecriteria:** elk criterium uit je prompt is vervuld
- [ ] **Tests dekken het happy path en belangrijke edge cases:** niet alleen het happy path
- [ ] **Geen ongerelateerde bestandswijzigingen:** alleen bestanden die bij de taak horen zijn gewijzigd
- [ ] **Gedeelde modules niet gebroken:** imports, types en interfaces die andere code gebruikt werken nog
- [ ] **Charter gevolgd:** de beperkingen uit `Must NOT do` zijn gerespecteerd
- [ ] **Lint, typecheck en build slagen:** voer de standaardcontroles van je project uit

### Frontend-specifiek

- [ ] Toegankelijkheid: interactieve elementen hebben `aria-label`, semantische headings en werkende toetsenbordnavigatie
- [ ] Mobile: correcte weergave bij 320px, 768px, 1024px en 1440px
- [ ] Performance: geen CLS en de FCP-doelstelling is gehaald
- [ ] Error boundaries en loading skeletons zijn geïmplementeerd
- [ ] shadcn/ui-componenten zijn niet rechtstreeks gewijzigd (gebruik wrappers)
- [ ] Absolute imports met `@/` (geen relatieve `../../`)

### Backend-specifiek

- [ ] Clean architecture blijft behouden: geen bedrijfslogica in route handlers
- [ ] Alle invoer is gevalideerd (vertrouw invoer niet blind)
- [ ] Alleen geparametriseerde queries (geen stringinterpolatie in SQL)
- [ ] Custom exceptions via een gecentraliseerde errormodule (geen ruwe HTTP-exceptions)
- [ ] Auth-endpoints zijn rate-limited

### Mobile-specifiek

- [ ] Alle controllers worden opgeruimd in de `dispose()`-methode
- [ ] Offline wordt netjes afgehandeld
- [ ] De 60fps-doelstelling blijft behouden (geen haperingen)
- [ ] Getest op zowel iOS als Android

### Database-specifiek

- [ ] Minstens 3NF (of de denormalisatie is gemotiveerd)
- [ ] Alle drie schemalagen zijn gedocumenteerd (extern, conceptueel, intern)
- [ ] Integriteitsconstraints zijn expliciet (entiteit, domein, referentieel, bedrijfsregel)
- [ ] Controle op anti-patronen is uitgevoerd

---

## Escalatiesignalen

Let op deze signalen dat je van uitvoering met één skill naar multi-agentuitvoering moet overschakelen:

| Signaal | Wat het betekent | Actie |
|---------|-------------------|-------|
| Agent zegt "dit vereist een backendwijziging" | De taak heeft afhankelijkheden over domeinen heen | Schakel over naar `/work` en voeg een backendagent toe |
| De `CHARTER_CHECK` van de agent bevat onderdelen bij "Must NOT do" die wel nodig zijn | De scope overschrijdt één domein | Plan de volledige feature eerst met `/plan` |
| Een fix werkt door naar 3+ bestanden in verschillende lagen | Eén fix raakt meerdere domeinen | Gebruik `/debug` met bredere scope of `/work` |
| De agent ontdekt een API-contractmismatch | Frontend en backend zijn het niet eens | Voer `/plan` uit om contracten te definiëren en start daarna beide agenten opnieuw |
| Een kwaliteitsgate faalt op integratiepunten | Componenten sluiten niet op elkaar aan | Voer `/review` uit, of voeg een QA-ronde toe: `oma agent spawn qa "Review the integration" SESSION_ID --read-only` |
| De taak groeit van ‘één component’ naar ‘drie componenten + nieuwe route + API’ | De scope groeit tijdens de uitvoering | Stop, deel de taak op met `/plan` en ga daarna door met `/orchestrate` |
| De agent blokkeert met HIGH-verduidelijking | De requirements zijn fundamenteel dubbelzinnig | Beantwoord de vragen van de agent of voer `/brainstorm` uit |

### Vuistregel

Als je dezelfde agent meer dan twee keer opnieuw start met verfijningen, is de taak waarschijnlijk multi-domein. Gebruik `/work`, of op zijn minst `/plan`, om de taak op te splitsen.

---

## Volgende stappen {#next-steps}

- De taak beslaat meerdere domeinen: [Multi-agentprojecten](./multi-agent-project.md)
- De taak is een bug: [Bugs oplossen](./bug-fixing.md)
- Een run controleren of hervatten: [Resultaten en hervatten](./agent-results-and-resume.md)
- Er ging iets mis: [Probleemoplossing](./troubleshooting.md)
- Kiezen tussen een skill en een workflow: [Workflows](../core-concepts/workflows.md#choosing-a-skill-or-workflow)
