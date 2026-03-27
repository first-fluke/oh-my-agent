---
title: "Anwendungsfall: Einzelner Skill"
description: Detaillierte Anleitung für Einzeldomänen-Aufgaben in oh-my-agent — wann verwenden, Preflight-Checkliste, Prompt-Vorlage mit Erklärung, praxisnahe Beispiele für Frontend, Backend, Mobile und Datenbank, erwarteter Ausführungsablauf, Qualitäts-Gate-Checkliste und Eskalationssignale.
---

# Einzelne Skill-Ausführung

Einzelne Skill-Ausführung ist der schnelle Weg — ein Agent, eine Domäne, eine fokussierte Aufgabe. Kein Orchestrierungsaufwand, keine Multi-Agenten-Koordination. Der Skill aktiviert sich automatisch aus Ihrem natürlichsprachlichen Prompt.

---

## Wann einzelne Skills verwenden

Verwenden Sie dies, wenn Ihre Aufgabe ALLE diese Kriterien erfüllt:

- **Gehört einer Domäne** — die gesamte Aufgabe gehört zu Frontend, Backend, Mobile, Datenbank, Design, Infrastruktur oder einer anderen einzelnen Domäne
- **In sich abgeschlossen** — keine domänenübergreifenden API-Vertragsänderungen, keine Backend-Änderungen für eine Frontend-Aufgabe nötig
- **Klarer Umfang** — Sie wissen, wie das Ergebnis aussehen soll (eine Komponente, ein Endpunkt, ein Schema, eine Korrektur)
- **Keine Koordination** — andere Agenten müssen nicht vorher oder nachher laufen

**Beispiele für Einzelne-Skill-Aufgaben:**
- Eine UI-Komponente erstellen
- Einen API-Endpunkt hinzufügen
- Einen Bug in einer Schicht beheben
- Eine Datenbanktabelle entwerfen
- Ein Terraform-Modul schreiben
- Einen Satz i18n-Strings übersetzen
- Einen Design-System-Abschnitt erstellen

**Zu Multi-Agent wechseln** (`/coordinate` oder `/orchestrate`) wenn:
- UI-Arbeit einen neuen API-Vertrag braucht (Frontend + Backend)
- Eine Korrektur sich über Schichten hinweg auswirkt (Debug + Implementierungsagenten)
- Das Feature Frontend, Backend und Datenbank umfasst
- Der Umfang nach der ersten Iteration über eine Domäne hinauswächst

---

## Preflight-Checkliste

Beantworten Sie vor dem Prompt diese vier Fragen (sie entsprechen den vier Elementen der [Prompt-Struktur](/core-concepts/skills)):

| Element | Frage | Warum es wichtig ist |
|---------|----------|----------------|
| **Ziel** | Welches spezifische Artefakt soll erstellt oder geändert werden? | Verhindert Mehrdeutigkeit — "einen Button hinzufügen" vs. "ein Formular mit Validierung hinzufügen" |
| **Kontext** | Welcher Stack, welches Framework und welche Konventionen gelten? | Agent erkennt aus Projektdateien, aber explizit ist besser |
| **Einschränkungen** | Welche Regeln müssen eingehalten werden? (Stil, Sicherheit, Performance, Kompatibilität) | Ohne Einschränkungen verwenden Agenten Standards, die möglicherweise nicht zu Ihrem Projekt passen |
| **Fertig wenn** | Welche Akzeptanzkriterien werden Sie prüfen? | Gibt dem Agenten ein Ziel und Ihnen eine Verifikationscheckliste |

Fehlt ein Element in Ihrem Prompt, wird der Agent entweder:
- **LOW-Unsicherheit:** Standards anwenden und Annahmen auflisten
- **MEDIUM-Unsicherheit:** 2-3 Optionen präsentieren und mit der wahrscheinlichsten fortfahren
- **HIGH-Unsicherheit:** Blockieren und Fragen stellen (wird keinen Code schreiben)

---

## Prompt-Vorlage

```text
Build <specific artifact> using <stack/framework>.
Constraints: <style, performance, security, or compatibility constraints>.
Acceptance criteria:
1) <testable criterion>
2) <testable criterion>
3) <testable criterion>
Add tests for: <critical test cases>.
```

### Vorlagenaufschlüsselung

| Teil | Zweck | Beispiel |
|------|---------|---------|
| `Build <specific artifact>` | Das Ziel — was erstellt werden soll | "Build a user registration form component" |
| `using <stack/framework>` | Der Kontext — Tech-Stack | "using React + TypeScript + Tailwind CSS" |
| `Constraints:` | Regeln, die der Agent einhalten muss | "accessible labels, no external form libraries, client-side validation only" |
| `Acceptance criteria:` | Fertig wenn — verifizierbare Ergebnisse | "1) email format validation 2) password strength indicator 3) submit disabled while invalid" |
| `Add tests for:` | Testanforderungen | "valid/invalid submit paths, edge cases for email validation" |

---

## Praxisbeispiele

### Frontend: Login-Formular

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

**Erwarteter Ausführungsablauf:**

1. **Skill-Aktivierung:** `oma-frontend` aktiviert sich (Keywords: "form", "component", "Tailwind CSS", "React")
2. **Schwierigkeitsbewertung:** Mittel (2-3 Dateien, einige Designentscheidungen zur Validierungs-UX)
3. **Geladene Ressourcen:**
   - `execution-protocol.md` (immer)
   - `snippets.md` (Formular- + Zod-Muster)
   - `component-template.tsx` (React-Struktur)
4. **CHARTER_CHECK-Ausgabe:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
5. **Implementierung:**
   - Erstellt `src/features/auth/components/login-form.tsx` (Client Component mit `"use client"`)
   - Erstellt `src/features/auth/utils/login-schema.ts` (Zod-Schema)
   - Erstellt `src/features/auth/components/skeleton/login-form-skeleton.tsx`
   - Verwendet shadcn/ui `<Button>`, `<Input>`, `<Label>` (schreibgeschützt, keine Modifikationen)
   - Formular über `@tanstack/react-form` mit Zod-Validierung
   - Absolute Imports mit `@/`
   - Eine Komponente pro Datei
6. **Verifikation:**
   - Checkliste: ARIA-Labels vorhanden, semantische Überschriften, Tastaturnavigation funktioniert
   - Mobil: rendert korrekt bei 320px-Viewport
   - Performance: kein CLS
   - Tests: Vitest-Testdatei unter `src/features/auth/utils/__tests__/login-schema.test.ts`

---

### Backend: REST-API-Endpunkt

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

**Erwarteter Ausführungsablauf:**

1. **Skill-Aktivierung:** `oma-backend` aktiviert sich (Keywords: "API", "endpoint", "REST")
2. **Stack-Erkennung:** Liest `pyproject.toml` oder `package.json`, um Sprache/Framework zu bestimmen. Falls `stack/` existiert, werden Konventionen von dort geladen.
3. **Schwierigkeitsbewertung:** Mittel (2-3 Dateien: Route, Service, Repository, plus Test)
4. **Geladene Ressourcen:**
   - `execution-protocol.md` (immer)
   - `stack/snippets.md` falls verfügbar (Route, paginierte Abfragemuster)
   - `stack/tech-stack.md` falls verfügbar (Framework-spezifische API)
5. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **Implementierung:**
   - Repository: `TaskRepository.find_by_user(user_id, cursor, status, limit)` mit parametrisierter Abfrage
   - Service: `TaskService.get_user_tasks(user_id, cursor, status, limit)` — Geschäftslogik-Wrapper
   - Router: `GET /api/tasks` mit JWT-Auth-Middleware, Eingabevalidierung, Antwortformatierung
   - Tests: Auth erforderlich gibt 401 zurück, Paginierung gibt korrekten Cursor zurück, Filter funktioniert, leer gibt 200 mit leerem Array zurück

---

### Mobile: Einstellungsbildschirm

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

**Erwarteter Ausführungsablauf:**

1. **Skill-Aktivierung:** `oma-mobile` aktiviert sich (Keywords: "Flutter", "screen", "mobile")
2. **Schwierigkeitsbewertung:** Mittel (Einstellungsbildschirm + Zustandsverwaltung + Offline-Behandlung)
3. **Geladene Ressourcen:**
   - `execution-protocol.md`
   - `snippets.md` (Bildschirmvorlage, Riverpod-Provider-Muster)
   - `screen-template.dart`
4. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
5. **Implementierung:**
   - Bildschirm: `lib/features/settings/presentation/settings_screen.dart` (Stateless Widget mit Riverpod)
   - Provider: `lib/features/settings/providers/settings_provider.dart`
   - Repository: `lib/features/settings/data/settings_repository.dart`
   - Offline-Behandlung: Dio-Interceptor fängt `SocketException`, greift auf gecachte Daten zurück
   - Alle Controller in der `dispose()`-Methode freigegeben

---

### Datenbank: Schema-Design

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

**Erwarteter Ausführungsablauf:**

1. **Skill-Aktivierung:** `oma-db` aktiviert sich (Keywords: "database", "schema", "ERD", "migration")
2. **Schwierigkeitsbewertung:** Komplex (Architekturentscheidungen, mehrere Entitäten, Kapazitätsplanung)
3. **Geladene Ressourcen:**
   - `execution-protocol.md`
   - `document-templates.md` (Ergebnisstruktur)
   - `examples.md`
   - `anti-patterns.md` (Review während der Optimierung)
4. **CHARTER_CHECK:**
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **Workflow:** Erkunden (Entitäten, Beziehungen, Zugriffsmuster, Volumenschätzungen) -> Entwerfen (externe/konzeptionelle/interne Schemata, Constraints, Lebenszyklus-Felder) -> Optimieren (Indizes für Abfragemuster, Partitionierungsstrategie, Backup-Plan, Anti-Pattern-Review)
6. **Ergebnisse:**
   - Zusammenfassung des externen Schemas (Sichten pro Rolle: Admin, Projektmanager, Teammitglied)
   - Konzeptionelles Schema mit ERD (Organisation 1:N Projekt, Projekt 1:N Aufgabe, Organisation 1:N Teammitgliedschaft usw.)
   - Internes Schema mit physischem DDL, Indizes, Partitionierung
   - Datenstandards-Tabelle (Feldbenennungsregeln, Typkonventionen)
   - Glossar (Mandant, Workspace, Beauftragter usw.)
   - Kapazitätsschätzungsblatt
   - Backup-Strategie (täglich voll + stündlich inkrementell, 30-Tage-Aufbewahrung)
   - Migrationsskript

---

## Qualitäts-Gate-Checkliste

Nach der Lieferung durch den Agenten diese Punkte vor der Abnahme verifizieren:

### Universelle Prüfungen (alle Agenten)

- [ ] **Verhalten entspricht den Akzeptanzkriterien** — jedes Kriterium aus Ihrem Prompt ist erfüllt
- [ ] **Tests decken Happy Path und wichtige Grenzfälle ab** — nicht nur den Happy Path
- [ ] **Keine unverwandten Dateiänderungen** — nur aufgabenrelevante Dateien wurden modifiziert
- [ ] **Gemeinsame Module nicht beschädigt** — Imports, Typen und Schnittstellen, die von anderem Code verwendet werden, funktionieren noch
- [ ] **Charter wurde eingehalten** — die "Must NOT do"-Einschränkungen wurden respektiert
- [ ] **Lint, Typecheck, Build bestehen** — die Standardprüfungen Ihres Projekts ausführen

### Frontend-spezifisch

- [ ] Barrierefreiheit: interaktive Elemente haben `aria-label`, semantische Überschriften, Tastaturnavigation funktioniert
- [ ] Mobil: rendert korrekt bei 320px, 768px, 1024px, 1440px Breakpoints
- [ ] Performance: kein CLS, FCP-Ziel erreicht
- [ ] Error Boundaries und Lade-Skelette implementiert
- [ ] shadcn/ui-Komponenten nicht direkt modifiziert (Wrapper stattdessen verwendet)
- [ ] Absolute Imports mit `@/` (keine relativen `../../`)

### Backend-spezifisch

- [ ] Clean Architecture eingehalten: keine Geschäftslogik in Route-Handlern
- [ ] Alle Eingaben validiert (Benutzereingaben nicht vertrauen)
- [ ] Nur parametrisierte Abfragen (keine String-Interpolation in SQL)
- [ ] Benutzerdefinierte Exceptions über zentrales Fehlermodul (keine rohen HTTP-Exceptions)
- [ ] Auth-Endpunkte mit Rate-Limiting versehen

### Mobile-spezifisch

- [ ] Alle Controller in der `dispose()`-Methode freigegeben
- [ ] Offline-Zustand elegant behandelt
- [ ] 60-fps-Ziel eingehalten (keine Ruckler)
- [ ] Auf iOS und Android getestet

### Datenbank-spezifisch

- [ ] Mindestens 3NF (oder dokumentierte Begründung für Denormalisierung)
- [ ] Alle drei Schema-Schichten dokumentiert (extern, konzeptionell, intern)
- [ ] Integritäts-Constraints explizit (Entitäts-, Domänen-, referentielle und Geschäftsregel-Integrität)
- [ ] Anti-Pattern-Review abgeschlossen

---

## Eskalationssignale

Auf diese Signale achten, die anzeigen, dass von Einzelner-Skill- zu Multi-Agenten-Ausführung gewechselt werden sollte:

| Signal | Bedeutung | Aktion |
|--------|--------------|--------|
| Agent sagt "dies erfordert eine Backend-Änderung" | Aufgabe hat domänenübergreifende Abhängigkeiten | Zu `/coordinate` wechseln — Backend-Agent hinzufügen |
| CHARTER_CHECK des Agenten zeigt "Must NOT do"-Elemente, die tatsächlich benötigt werden | Umfang überschreitet eine Domäne | Das vollständige Feature zuerst mit `/plan` planen |
| Korrektur kaskadiert in 3+ Dateien über verschiedene Schichten | Eine Korrektur betrifft mehrere Domänen | `/debug` mit breiterem Umfang verwenden, oder `/coordinate` |
| Agent entdeckt eine API-Vertrags-Diskrepanz | Frontend-/Backend-Unstimmigkeit | `/plan` zur Vertragsdefinition ausführen, dann beide Agenten erneut starten |
| Qualitäts-Gate scheitert an Integrationspunkten | Komponenten passen nicht richtig zusammen | QA-Review-Schritt hinzufügen: `oma agent:spawn qa "Review integration"` |
| Aufgabe wächst von "eine Komponente" zu "drei Komponenten + neue Route + API" | Scope-Creep während der Ausführung | Stoppen, `/plan` zur Zerlegung ausführen, dann `/orchestrate` |
| Agent blockiert mit HIGH-Klärung | Anforderungen grundlegend mehrdeutig | Die Fragen des Agenten beantworten oder `/brainstorm` zur Klärung des Ansatzes ausführen |

### Die allgemeine Regel

Wenn Sie feststellen, dass Sie denselben Agenten mehr als zweimal mit Verfeinerungen erneut starten, ist die Aufgabe wahrscheinlich domänenübergreifend und benötigt `/coordinate` oder zumindest einen `/plan`-Schritt zur ordnungsgemäßen Zerlegung.
