---
title: "Przewodnik: Wykonanie pojedynczej umiejętności"
description: Szczegółowy przewodnik po zadaniach jednodomenowych w oh-my-agent — kiedy używać, lista kontrolna przed uruchomieniem, szablon promptu z wyjaśnieniem, realne przykłady dla zadań frontend, backend, mobile i baz danych, oczekiwany przepływ wykonania, lista kontrolna bramki jakości i sygnały eskalacji.
---

# Wykonanie pojedynczej umiejętności

Wykonanie pojedynczej umiejętności to szybka ścieżka — jeden agent, jedna domena, jedno skoncentrowane zadanie. Bez narzutu orkiestracji, bez koordynacji wieloagentowej. Umiejętność aktywuje się automatycznie z promptu w języku naturalnym.

---

## Kiedy używać pojedynczej umiejętności

Używaj gdy zadanie spełnia WSZYSTKIE te kryteria:

- **Należy do jednej domeny** — całe zadanie należy do frontend, backend, mobile, bazy danych, designu, infrastruktury lub innej pojedynczej domeny
- **Jest samodzielne** — brak międzydomenowych zmian kontraktów API, brak potrzeby zmian backend dla zadania frontend
- **Ma jasny zakres** — wiesz jakie powinno być wyjście (komponent, endpoint, schemat, poprawka)
- **Nie wymaga koordynacji** — inni agenci nie muszą działać przed ani po

**Przełącz na wieloagentowe** (`/coordinate` lub `/orchestrate`) gdy:
- Praca UI wymaga nowego kontraktu API (frontend + backend)
- Jedna poprawka kaskaduje przez warstwy (debug + agenci implementacyjni)
- Funkcjonalność obejmuje frontend, backend i bazę danych
- Zakres rośnie poza jedną domenę po pierwszej iteracji

---

## Lista kontrolna przed uruchomieniem

Przed napisaniem promptu, odpowiedz na te cztery pytania (mapują się na cztery elementy struktury promptu):

| Element | Pytanie | Dlaczego ma znaczenie |
|---------|----------|----------------|
| **Cel** | Jaki konkretny artefakt powinien być stworzony lub zmieniony? | Zapobiega niejednoznaczności |
| **Kontekst** | Jaki stos, framework i konwencje obowiązują? | Agent wykrywa z plików projektu, ale jawne jest lepsze |
| **Ograniczenia** | Jakie reguły muszą być przestrzegane? (styl, bezpieczeństwo, wydajność, kompatybilność) | Bez ograniczeń agenci używają domyślnych, które mogą nie pasować |
| **Gotowe gdy** | Jakie kryteria akceptacji sprawdzisz? | Daje agentowi cel i Tobie listę do weryfikacji |

---

## Szablon promptu

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

## Realne przykłady

### Frontend: Formularz logowania

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

**Oczekiwany przepływ:** Aktywacja `oma-frontend` -> Ocena trudności: Średnia -> Ładowanie zasobów (execution-protocol.md, snippets.md, component-template.tsx) -> CHARTER_CHECK -> Implementacja (komponent, schemat Zod, testy, skeleton) -> Weryfikacja (dostępność, mobile, wydajność).

### Backend: Endpoint REST API

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

### Mobile: Ekran ustawień

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

### Baza danych: Projektowanie schematu

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

## Lista kontrolna bramki jakości

### Sprawdzenia uniwersalne (wszyscy agenci)

- [ ] **Zachowanie pasuje do kryteriów akceptacji**
- [ ] **Testy pokrywają happy path i kluczowe przypadki brzegowe**
- [ ] **Brak niezwiązanych zmian plików**
- [ ] **Współdzielone moduły nie są zepsute**
- [ ] **Karta została przestrzegana** — ograniczenia "Must NOT do" respektowane
- [ ] **Lint, typecheck, build przechodzą**

### Specyficzne dla frontend

- [ ] Dostępność: `aria-label`, nagłówki semantyczne, nawigacja klawiaturą
- [ ] Mobile: poprawne renderowanie na breakpointach 320px, 768px, 1024px, 1440px
- [ ] Wydajność: brak CLS, cel FCP osiągnięty
- [ ] shadcn/ui nie modyfikowane bezpośrednio (używane wrappery)

### Specyficzne dla backend

- [ ] Czysta architektura: brak logiki biznesowej w handlerach route
- [ ] Wszystkie dane wejściowe walidowane
- [ ] Wyłącznie zapytania parametryzowane
- [ ] Endpointy auth z rate limiting

---

## Sygnały eskalacji

| Sygnał | Co oznacza | Działanie |
|--------|--------------|--------|
| Agent mówi "this requires a backend change" | Zadanie ma zależności międzydomenowe | Przełącz na `/coordinate` |
| CHARTER_CHECK pokazuje elementy "Must NOT do" które są potrzebne | Zakres przekracza jedną domenę | Zaplanuj pełną funkcjonalność z `/plan` |
| Poprawka kaskaduje do 3+ plików w różnych warstwach | Jedna poprawka dotyczy wielu domen | Użyj `/debug` z szerszym zakresem |
| Agent blokuje się na HIGH clarification | Wymagania fundamentalnie niejednoznaczne | Odpowiedz na pytania lub uruchom `/brainstorm` |

### Ogólna reguła

Jeśli okaże się, że uruchamiasz tego samego agenta ponownie więcej niż dwukrotnie z udoskonaleniami, zadanie jest prawdopodobnie wielodomenowe i wymaga `/coordinate` lub co najmniej kroku `/plan` do właściwej dekompozycji.
