---
title: "Przewodnik: wykonanie jednej umiejętności"
sidebar_label: Jedna umiejętność
description: "Szczegółowy przewodnik po zadaniach w jednej domenie w oh-my-agent: kiedy używać, checklista preflight, szablon promptu z objaśnieniem, przykłady zadań frontendowych, backendowych, mobilnych i bazodanowych, oczekiwany przebieg wykonania, checklista bramki jakości i sygnały eskalacji."
---

# Wykonanie jednej umiejętności

Wykonanie jednej umiejętności kieruje jedno skupione zadanie w jednej domenie do jednego agenta. Host albo wybrany workflow może skierować prompt w języku naturalnym do umiejętności; sam system hooków wykrywa workflowy, a zachowanie routingu zależy od wybranego runtime'u.

## Szybka ścieżka

1. Raz uruchom `oma doctor`, aby potwierdzić integrację z wybranym hostem. Opcjonalne ostrzeżenia dostawcy nie blokują zadania, które z niego nie korzysta.
2. Opisz jedną samodzielną zmianę z jasnymi warunkami **Goal**, **Context**, **Constraints** i **Done When**.
3. Oczekuj, że wybrana umiejętność przejrzy repozytorium, określi swój zakres, gdy aktywny kontrakt wykonania wymaga `CHARTER_CHECK`, i zgłosi, które kontrole faktycznie wykonała.
4. Jeśli zadanie przekroczy granice API, UI, bazy danych lub mobile, zatrzymaj wykonanie jednej umiejętności i przełącz się na `/work` albo `/orchestrate`.

W przypadku zatrzymanych uruchomień zarządzanych użyj `oma agent status <session-id> [agent-id]`, a przed ponowieniem sprawdź potwierdzenia w `.agents/state/agent-runs/` oraz wstrzykniętą ścieżkę twierdzenia. Zobacz [Ważne ustawienia domyślne](../getting-started/important-defaults.md), aby poznać zachowanie dostawców i odzyskiwanie.

---

## Kiedy używać jednej umiejętności

Używaj tej ścieżki, gdy zadanie spełnia WSZYSTKIE poniższe kryteria:

- **Należy do jednej domeny:** całe zadanie dotyczy frontendu, backendu, mobile, bazy danych, designu, infrastruktury albo innej pojedynczej domeny
- **Jest samodzielne:** nie wymaga zmian kontraktu API między domenami ani zmian backendu dla zadania frontendowego
- **Ma jasny zakres:** wiesz, jaki powinien być wynik (komponent, endpoint, schemat albo poprawka)
- **Nie wymaga koordynacji:** inni agenci nie muszą działać przed tym zadaniem ani po nim

**Przykłady zadań dla jednej umiejętności:**
- Zbudowanie jednego komponentu UI
- Dodanie jednego endpointu API
- Naprawa jednego błędu w jednej warstwie
- Zaprojektowanie jednej tabeli bazy danych
- Napisanie jednego modułu Terraform
- Przetłumaczenie jednego zestawu ciągów i18n
- Utworzenie jednej sekcji systemu projektowego

**Przełącz się na wiele agentów** (`/work` albo `/orchestrate`), gdy:
- praca UI wymaga nowego kontraktu API (frontend + backend)
- jedna poprawka rozchodzi się na wiele warstw (agenci debugowania i implementacji)
- funkcja obejmuje frontend, backend i bazę danych
- po pierwszej iteracji zakres wychodzi poza jedną domenę

Testy i kryteria akceptacji również należą do pracy z jedną umiejętnością; same w sobie nie wymagają `/ralph`. Przy koordynacji między domenami albo jawnie żądanym procesie jakości użyj [przewodnika wyboru umiejętności i workflowu](/docs/core-concepts/workflows#choosing-a-skill-or-workflow).

---

## Checklista preflight

Przed napisaniem promptu odpowiedz na te cztery pytania:

| Element | Pytanie | Dlaczego to ważne |
|---------|---------|------------------|
| **Cel** | Jaki konkretny artefakt należy utworzyć albo zmienić? | Zapobiega niejasnościom (np. „dodaj przycisk” kontra „dodaj formularz z walidacją”) |
| **Kontekst** | Jaki stos, framework i konwencje obowiązują? | Agent wykrywa je z plików projektu, ale jawne podanie jest lepsze |
| **Ograniczenia** | Jakich reguł trzeba przestrzegać? (styl, bezpieczeństwo, wydajność, kompatybilność) | Bez ograniczeń agenci użyją ustawień domyślnych, które mogą nie pasować do projektu |
| **Kiedy gotowe** | Jakie kryteria akceptacji sprawdzisz? | Daje agentowi cel, a Tobie checklistę weryfikacji |

Jeśli w promptcie brakuje któregoś elementu, agent:
- **LOW niepewności:** zastosuje ustawienia domyślne i wypisze założenia
- **MEDIUM niepewności:** przedstawi 2–3 opcje i przejdzie do najbardziej prawdopodobnej
- **HIGH niepewności:** zablokuje się i zada pytania (nie napisze kodu)

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

### Rozbiór szablonu

| Część | Cel | Przykład |
|------|-----|---------|
| `Build <specific artifact>` | Cel (co utworzyć) | "Build a user registration form component" |
| `using <stack/framework>` | Kontekst (stos technologiczny) | "using React + TypeScript + Tailwind CSS" |
| `Constraints:` | Reguły, których agent musi przestrzegać | "accessible labels, no external form libraries, client-side validation only" |
| `Acceptance criteria:` | Kiedy gotowe (weryfikowalne wyniki) | "1) email format validation 2) password strength indicator 3) submit disabled while invalid" |
| `Add tests for:` | Wymagania dotyczące testów | "valid/invalid submit paths, edge cases for email validation" |

---

## Rzeczywiste przykłady

### Frontend: formularz logowania

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

**Oczekiwany przebieg wykonania:**

1. **Routing umiejętności:** Host albo workflow wybiera `oma-frontend` (słowa takie jak „form”, „component”, „Tailwind CSS” i „React” są sygnałami routingu)
2. **Ocena trudności:** Medium (2–3 pliki, kilka decyzji projektowych dotyczących UX walidacji)
3. **Załadowane zasoby:**
   - `execution-protocol.md` (zawsze)
   - `snippets.md` (wzorce formularzy i Zod oraz istniejące wzorce komponentów, gdy umiejętność je dostarcza)
4. **Kontrakt wykonania (gdy włączony) może wypisać `CHARTER_CHECK`:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: form validation, accessibility, loading state, tests
   - Assumptions: Next.js App Router, @tanstack/react-form + Zod, shadcn/ui, FSD-lite architecture
   ```
<!-- oma-docs:ignore-start -->
5. **Implementacja:**
   - tworzy `src/features/auth/components/login-form.tsx` (Client Component z `"use client"`)
   - tworzy `src/features/auth/utils/login-schema.ts` (schemat Zod)
   - tworzy `src/features/auth/components/skeleton/login-form-skeleton.tsx`
   - używa komponentów shadcn/ui `<Button>`, `<Input>`, `<Label>` (tylko do odczytu, bez modyfikacji)
   - formularz obsługuje `@tanstack/react-form` z walidacją Zod
   - używa importów absolutnych z `@/`
   - jeden komponent na plik
6. **Weryfikacja:**
   - checklista: obecne etykiety ARIA, semantyczne nagłówki, działająca nawigacja klawiaturą
   - mobile: poprawne renderowanie przy viewport 320px
   - wydajność: brak CLS
   - testy: plik testu Vitest w `src/features/auth/utils/__tests__/login-schema.test.ts`
<!-- oma-docs:ignore-end -->

---

### Backend: endpoint REST API

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

**Oczekiwany przebieg wykonania:**

1. **Routing umiejętności:** Host albo workflow wybiera `oma-backend` (słowa takie jak „API”, „endpoint” i „REST” są sygnałami routingu)
2. **Wykrywanie stosu:** Odczytuje `pyproject.toml` albo `package.json`, aby ustalić język/framework. Jeśli istnieją wygenerowane odwołania `stack/` albo dostarczone `variants/`, ładuje z nich konwencje.
3. **Ocena trudności:** Medium (2–3 pliki: trasa, serwis, repozytorium oraz test)
4. **Załadowane zasoby:**
   - `execution-protocol.md` (zawsze)
<!-- oma-docs:ignore-start -->
   - pasujące `stack/snippets.md` albo `variants/{node,python,rust}/snippets.md`, jeśli są dostępne
   - pasujące `stack/tech-stack.md` albo odwołania do tech-stack z wariantu, jeśli są dostępne
<!-- oma-docs:ignore-end -->
5. **Kontrakt wykonania (gdy włączony) może wypisać `CHARTER_CHECK`:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: backend
   - Must NOT do: frontend UI, mobile screens, database schema changes
   - Success criteria: authenticated endpoint, cursor pagination, status filter, tests
   - Assumptions: existing JWT auth middleware, PostgreSQL, existing Task model
   ```
6. **Implementacja:**
   - Repozytorium: `TaskRepository.find_by_user(user_id, cursor, status, limit)` z zapytaniem parametryzowanym
   - Serwis: `TaskService.get_user_tasks(user_id, cursor, status, limit)` (opakowanie logiki biznesowej)
   - Router: `GET /api/tasks` z middleware uwierzytelniania JWT, walidacją danych wejściowych i formatowaniem odpowiedzi
   - Testy: wymagane uwierzytelnianie zwraca 401, paginacja zwraca poprawny kursor, filtr działa, pusty wynik zwraca 200 z pustą tablicą

---

### Mobile: ekran ustawień

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

**Oczekiwany przebieg wykonania:**

1. **Routing umiejętności:** Host albo workflow wybiera `oma-mobile` (słowa takie jak „Flutter”, „screen” i „mobile” są sygnałami routingu)
2. **Ocena trudności:** Medium (ekran ustawień + zarządzanie stanem + obsługa trybu offline)
3. **Załadowane zasoby:**
   - `execution-protocol.md`
   - `snippets.md` (szablon ekranu, wzorzec providera Riverpod)
   - `screen-template.dart`
4. **Kontrakt wykonania (gdy włączony) może wypisać `CHARTER_CHECK`:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: mobile
   - Must NOT do: backend API changes, web frontend, database schema
   - Success criteria: profile editing, notification toggles, logout, offline
   - Assumptions: existing auth service, Dio interceptors, Riverpod, GoRouter
   ```
<!-- oma-docs:ignore-start -->
5. **Implementacja:**
   - ekran: `lib/features/settings/presentation/settings_screen.dart` (Stateless Widget z Riverpod)
   - providery: `lib/features/settings/providers/settings_provider.dart`
   - repozytorium: `lib/features/settings/data/settings_repository.dart`
   - obsługa offline: interceptor Dio przechwytuje `SocketException` i korzysta z danych z cache
   - wszystkie kontrolery są zwalniane w metodzie `dispose()`
<!-- oma-docs:ignore-end -->

---

### Baza danych: projekt schematu

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

**Oczekiwany przebieg wykonania:**

1. **Routing umiejętności:** Host albo workflow wybiera `oma-db` (słowa takie jak „database”, „schema”, „ERD” i „migration” są sygnałami routingu)
2. **Ocena trudności:** Complex (decyzje architektoniczne, wiele encji, planowanie pojemności)
3. **Załadowane zasoby:**
   - `execution-protocol.md`
   - `document-templates.md` (struktura rezultatów)
   - `examples.md`
   - `anti-patterns.md` (przegląd podczas optymalizacji)
4. **Kontrakt wykonania (gdy włączony) może wypisać `CHARTER_CHECK`:**
   ```text
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: database
   - Must NOT do: API implementation, frontend UI, infrastructure
   - Success criteria: schema, ERD, indexes, capacity estimate, backup strategy
   - Assumptions: PostgreSQL, 3NF, soft delete, multi-tenant with RLS
   ```
5. **Workflow:** Eksploruj (encje, relacje, wzorce dostępu, szacunki wolumenu) -> Projektuj (zewnętrzny/koncepcyjny/wewnętrzny schemat, ograniczenia, pola cyklu życia) -> Optymalizuj (indeksy dla wzorców zapytań, strategia partycjonowania, plan backupu, przegląd antywzorców)
6. **Rezultaty:**
   - podsumowanie schematu zewnętrznego (widoki według roli: administrator, kierownik projektu, członek zespołu)
   - schemat koncepcyjny z ERD (Organization 1:N Project, Project 1:N Task, Organization 1:N TeamMembership itd.)
   - schemat wewnętrzny z fizycznym DDL, indeksami i partycjonowaniem
   - tabela standardów danych (reguły nazewnictwa pól, konwencje typów)
   - glosariusz (tenant, workspace, assignee itd.)
   - arkusz szacowania pojemności
   - strategia backupu (pełny codziennie + przyrostowy co godzinę, retencja 30 dni)
   - skrypt migracji

---

## Checklista bramki jakości

Po dostarczeniu wyniku przez agenta przed akceptacją sprawdź:

### Kontrole uniwersalne (wszyscy agenci)

- [ ] **Zachowanie spełnia kryteria akceptacji:** każde kryterium z promptu jest spełnione
- [ ] **Testy obejmują ścieżkę poprawną i kluczowe przypadki brzegowe:** nie tylko ścieżkę poprawną
- [ ] **Brak niepowiązanych zmian plików:** zmieniono tylko pliki dotyczące zadania
- [ ] **Współdzielone moduły nie są uszkodzone:** importy, typy i interfejsy używane przez inny kod nadal działają
- [ ] **Przestrzegano karty:** zachowano ograniczenia z sekcji „Must NOT do”
- [ ] **Lint, typecheck, build przechodzą:** uruchom standardowe kontrole projektu

### Właściwe dla frontendu

- [ ] Dostępność: elementy interaktywne mają `aria-label`, semantyczne nagłówki i działającą nawigację klawiaturą
- [ ] Mobile: poprawne renderowanie przy breakpointach 320px, 768px, 1024px i 1440px
- [ ] Wydajność: brak CLS, osiągnięty cel FCP
- [ ] Zaimplementowano granice błędów i skeletony ładowania
- [ ] Komponentów shadcn/ui nie modyfikowano bezpośrednio (użyto wrapperów)
- [ ] Importy absolutne z `@/` (bez względnych `../../`)

### Właściwe dla backendu

- [ ] Zachowano czystą architekturę: brak logiki biznesowej w handlerach tras
- [ ] Wszystkie dane wejściowe są walidowane (brak zaufania do danych użytkownika)
- [ ] Wyłącznie zapytania parametryzowane (bez interpolacji ciągów w SQL)
- [ ] Własne wyjątki przechodzą przez scentralizowany moduł błędów (bez surowych wyjątków HTTP)
- [ ] Endpointy uwierzytelniania mają ograniczenie częstotliwości

### Właściwe dla mobile

- [ ] Wszystkie kontrolery są zwalniane w metodzie `dispose()`
- [ ] Tryb offline jest obsłużony poprawnie
- [ ] Utrzymano cel 60 kl./s (bez zacięć)
- [ ] Testy wykonano na iOS i Androidzie

### Właściwe dla bazy danych

- [ ] Co najmniej 3NF (albo udokumentowane uzasadnienie denormalizacji)
- [ ] Udokumentowano wszystkie trzy warstwy schematu (zewnętrzną, koncepcyjną i wewnętrzną)
- [ ] Jawnie opisano ograniczenia integralności (encji, domeny, referencyjne, reguły biznesowe)
- [ ] Ukończono przegląd antywzorców

---

## Sygnały eskalacji

Zwróć uwagę na sygnały oznaczające, że należy przejść z wykonania jednej umiejętności do pracy wieloagentowej:

| Sygnał | Znaczenie | Działanie |
|--------|-----------|-----------|
| Agent mówi „to wymaga zmiany backendu” | Zadanie ma zależności między domenami | Przełącz się na `/work` i dodaj agenta backendu |
| CHARTER_CHECK agenta pokazuje elementy „Must NOT do”, które są jednak potrzebne | Zakres przekracza jedną domenę | Najpierw zaplanuj pełną funkcję przez `/plan` |
| Poprawka rozchodzi się na co najmniej 3 pliki w różnych warstwach | Jedna poprawka dotyka wielu domen | Użyj `/debug` z szerszym zakresem albo `/work` |
| Agent odkrywa niezgodność kontraktu API | Frontend i backend się nie zgadzają | Uruchom `/plan`, zdefiniuj kontrakty, potem uruchom ponownie obu agentów |
| Bramka jakości nie przechodzi w punktach integracji | Komponenty nie łączą się poprawnie | Uruchom `/review` albo dodaj przebieg QA: `oma agent spawn qa "Review the integration" SESSION_ID --read-only` |
| Zadanie rośnie z „jednego komponentu” do „trzech komponentów + nowej trasy + API” | Zakres rozszerza się podczas wykonania | Zatrzymaj pracę, uruchom `/plan`, rozłóż zadanie, a potem `/orchestrate` |
| Agent blokuje się przy doprecyzowaniu HIGH | Wymagania są zasadniczo niejednoznaczne | Odpowiedz na pytania agenta albo uruchom `/brainstorm`, aby doprecyzować podejście |

### Reguła praktyczna

Jeśli uruchamiasz tego samego agenta ponownie więcej niż dwa razy z poprawkami, zadanie prawdopodobnie obejmuje wiele domen. Uruchom `/work` albo przynajmniej `/plan`, aby je rozłożyć.

---

## Następne kroki

- Zadanie obejmuje kilka domen: [Projekty wieloagentowe](./multi-agent-project.md)
- Zadanie to błąd: [Naprawianie błędów](./bug-fixing.md)
- Audyt albo wznowienie uruchomienia: [Wyniki i wznawianie](./agent-results-and-resume.md)
- Coś się nie powiodło: [Rozwiązywanie problemów](./troubleshooting.md)
- Wybór między umiejętnością a workflowem: [Workflowy](../core-concepts/workflows.md#choosing-a-skill-or-workflow)
