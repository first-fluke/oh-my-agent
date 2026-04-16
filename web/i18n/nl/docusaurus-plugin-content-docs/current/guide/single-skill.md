---
title: "Gids: Enkele Skill Uitvoering"
description: Gedetailleerde gids voor enkel-domein taken in oh-my-agent — wanneer gebruiken, preflight checklist, promptsjabloon met uitleg, praktijkvoorbeelden voor frontend, backend, mobile en database taken, verwachte uitvoeringsstroom, kwaliteitspoort checklist en escalatiesignalen.
---

# Enkele Skill Uitvoering

Enkele skill-uitvoering is het snelle pad — een agent, een domein, een gerichte taak. Geen orchestratie-overhead, geen multi-agent coordinatie. De skill activeert automatisch vanuit je natuurlijke taalprompt.

---

## Wanneer Enkele Skill Gebruiken

Gebruik dit wanneer je taak aan ALLE criteria voldoet:

- **In bezit van een domein** — de hele taak behoort tot frontend, backend, mobile, database, design, infrastructuur of een ander enkel domein
- **Op zichzelf staand** — geen cross-domein API-contractwijzigingen nodig
- **Duidelijke scope** — je weet wat de uitvoer moet zijn
- **Geen coordinatie** — andere agenten hoeven niet voor of na te draaien

**Schakel over naar multi-agent** (`/work` of `/orchestrate`) wanneer:
- UI-werk een nieuw API-contract nodig heeft (frontend + backend)
- Een fix cascade veroorzaakt over lagen heen
- De functie frontend, backend en database beslaat
- Scope groeit voorbij een domein na de eerste iteratie

---

## Preflight Checklist

| Element | Vraag | Waarom Het Ertoe Doet |
|---------|-------|----------------------|
| **Doel** | Welk specifiek artefact moet worden gemaakt of gewijzigd? | Voorkomt dubbelzinnigheid |
| **Context** | Welke stack, framework en conventies zijn van toepassing? | Agent detecteert uit projectbestanden, maar expliciet is beter |
| **Beperkingen** | Welke regels moeten worden gevolgd? | Zonder beperkingen gebruiken agenten standaarden die niet bij je project passen |
| **Klaar Wanneer** | Welke acceptatiecriteria ga je controleren? | Geeft de agent een doel en jou een verificatiechecklist |

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

---

## Praktijkvoorbeelden

### Frontend: Inlogformulier

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

**Verwachte uitvoeringsstroom:** Skill activatie -> Moeilijkheidsbeoordeling (Gemiddeld) -> Resources laden -> CHARTER_CHECK -> Implementatie (componenten, schema, skeleton, tests) -> Verificatie (checklist)

---

### Backend: REST API Endpoint

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

---

### Mobile: Instellingenscherm

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

---

### Database: Schemaontwerp

```text
Design a database schema for a multi-tenant SaaS project management tool. Entities: Organization, Project, Task, User, TeamMembership.
Constraints: PostgreSQL, 3NF, soft delete with deleted_at, audit fields (created_at, updated_at, created_by), row-level security for tenant isolation.
Acceptance criteria:
1) ERD with all relationships documented
2) External, conceptual, and internal schema layers documented
3) Index strategy for common query patterns
4) Capacity estimation for 10K orgs, 100K users, 1M tasks
5) Backup strategy with full + incremental cadence
Add deliverables: data standards table, glossary, migration script.
```

---

## Kwaliteitspoort Checklist

### Universele Controles (Alle Agenten)

- [ ] Gedrag matcht acceptatiecriteria
- [ ] Tests dekken happy path en belangrijke edge cases
- [ ] Geen ongerelateerde bestandswijzigingen
- [ ] Gedeelde modules niet gebroken
- [ ] Charter is gevolgd
- [ ] Lint, typecheck, build slagen

### Frontend-Specifiek
- [ ] Toegankelijkheid: `aria-label`, semantische headings, toetsenbordnavigatie
- [ ] Mobiel: correct op 320px, 768px, 1024px, 1440px breakpoints
- [ ] Prestaties: geen CLS, FCP-doel gehaald
- [ ] Error boundaries en loading skeletons
- [ ] shadcn/ui componenten niet direct gewijzigd
- [ ] Absolute imports met `@/`

### Backend-Specifiek
- [ ] Clean architecture: geen bedrijfslogica in route handlers
- [ ] Alle invoer gevalideerd
- [ ] Alleen geparametriseerde queries
- [ ] Auth-endpoints rate-limited

### Mobile-Specifiek
- [ ] Alle controllers opgeruimd in `dispose()`
- [ ] Offline sierlijk afgehandeld
- [ ] 60fps-doel gehandhaafd
- [ ] Getest op iOS en Android

### Database-Specifiek
- [ ] Minimaal 3NF (of gedocumenteerde rechtvaardiging voor denormalisatie)
- [ ] Alle drie schemalagen gedocumenteerd
- [ ] Anti-patroon review voltooid

---

## Escalatiesignalen

| Signaal | Wat Het Betekent | Actie |
|---------|-----------------|-------|
| Agent zegt "dit vereist een backend-wijziging" | Taak heeft cross-domein afhankelijkheden | Schakel over naar `/work` |
| Agent's CHARTER_CHECK toont "Must NOT do"-items die wel nodig zijn | Scope overschrijdt een domein | Plan de volledige functie met `/plan` |
| Fix cascade naar 3+ bestanden over lagen | Een fix raakt meerdere domeinen | Gebruik `/debug` met bredere scope, of `/work` |
| Agent ontdekt API-contract mismatch | Frontend/backend onenigheid | Draai `/plan` om contracten te definieren |
| Agent blokkeert met HIGH verduidelijking | Requirements fundamenteel dubbelzinnig | Beantwoord vragen of draai `/brainstorm` |

### De Algemene Regel

Als je dezelfde agent meer dan twee keer herspawnt met verfijningen, is de taak waarschijnlijk multi-domein en heeft deze `/work` nodig of minimaal een `/plan`-stap.
