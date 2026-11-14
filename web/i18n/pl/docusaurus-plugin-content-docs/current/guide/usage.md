---
title: Przewodnik użycia
sidebar_label: Korzystanie z OMA
description: Przewodnik użycia OMA obejmujący wybór zadań z myślą o czytelniku, przykłady dla jednej umiejętności i wielu domen, workflowy, automatyczne wykrywanie, wszystkie 33 pakiety umiejętności, równoległe wykonanie CLI, dashboardy, ustawienia domyślne i odzyskiwanie.
---

# Jak używać oh-my-agent

## Szybki start

1. Otwórz projekt w wybranym IDE lub CLI z obsługą AI (Claude Code, Codex CLI, Cursor, Antigravity, OpenCode, Kimi, Kiro, Qwen albo innym obsługiwanym hoście)
2. Wybrany host może ładować [umiejętności](../getting-started/glossary.md#skill) z `.agents/skills/`; włączone hooki dodają podpowiedzi umiejętności na podstawie słów kluczowych w języku naturalnym i uruchamiają [workflow](../getting-started/glossary.md#workflow) wyłącznie z jego komendy slash albo — dla czterech trybów trwałych — z jego nazwy
3. Opisz w języku naturalnym, czego chcesz. Host albo wybrany workflow skieruje zadanie do właściwej umiejętności
4. Przy pracy wieloagentowej użyj `/work` albo `/orchestrate`

Zadania w jednej domenie nie wymagają specjalnej składni. Skorzystaj z [przewodnika wyboru umiejętności i workflowu](/docs/core-concepts/workflows#choosing-a-skill-or-workflow), aby wybrać między pojedynczą umiejętnością, `/work`, `/orchestrate`, `/ultrawork` i `/ralph`. Konfigurację znajdziesz w [Szybkim starcie](../getting-started/quick-start.md), a przed zmianą dostawców przeczytaj [Ważne ustawienia domyślne](../getting-started/important-defaults.md).

## Wybierz przewodnik

| Twoje zadanie | Zacznij od | Przewodnik |
|-----------|------------|-------|
| Jedna zmiana w jednej domenie | Zwykły prompt (routing umiejętności) | [Jedna umiejętność](./single-skill.md) |
| Funkcja obejmująca API, UI, mobile albo bazę danych | `/work` (krok po kroku) albo `/orchestrate` (automatycznie) | [Projekty wieloagentowe](./multi-agent-project.md) |
| Błąd z komunikatem błędu | `/debug` wraz z błędem i krokami odtworzenia | [Naprawianie błędów](./bug-fixing.md) |
| Obserwowanie agentów podczas pracy | `oma dashboard terminal` | [Monitorowanie dashboardu](./dashboard-monitoring.md) |
| Audyt albo wznawianie wyników agentów | `oma agent resume SESSION_ID --dry-run` | [Wyniki i wznawianie](./agent-results-and-resume.md) |
| Wyszukiwanie lub migracja dokumentów OMA | `oma docs migrate --dry-run` | [Układ artefaktów](./artifact-layout.md) |
| Coś się nie powiodło | `oma doctor --json` | [Rozwiązywanie problemów](./troubleshooting.md) |

---

## Przykład 1: proste zadanie w jednej domenie

**Wpisujesz:**
```text
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**Co się dzieje:**

1. Host kieruje żądanie do `oma-frontend` (słowa takie jak „form”, „component” i „Tailwind CSS” są sygnałami routingu)
2. Warstwa 1 (SKILL.md) jest już załadowana i zawiera tożsamość agenta, podstawowe reguły oraz listę bibliotek
3. Zasoby warstwy 2 są ładowane na żądanie:
   - `execution-protocol.md`: workflow w 4 krokach (Analyze, Plan, Implement, Verify)
   - `snippets.md`: wzorce formularzy i walidacji Zod oraz istniejące wzorce komponentów, gdy umiejętność je dostarcza
<!-- oma-docs:ignore-start -->
4. Agent implementuje:
   - komponent React z TypeScript w `src/features/auth/components/login-form.tsx`
   - schemat walidacji Zod w `src/features/auth/utils/login-validation.ts`
   - testy Vitest w `src/features/auth/utils/__tests__/login-validation.test.ts`
   - skeleton ładowania w `src/features/auth/components/skeleton/login-form-skeleton.tsx`
<!-- oma-docs:ignore-end -->
5. Agent uruchamia checklistę: dostępność (etykiety ARIA, semantyczny HTML, nawigacja klawiaturą), widok mobilny, wydajność (brak CLS), granice błędów

**Oczekiwany wynik:** Ograniczony zakresem komponent React z TypeScript, walidacją, testami i dowodami dostępności, gdy projekt obsługuje takie kontrole. Prompt i wybrany workflow określają, które pliki oraz kontrole faktycznie zostaną uruchomione.

---

## Przykład 2: projekt obejmujący wiele domen

**Wpisujesz:**
```text
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**Co się dzieje:**

1. To żądanie obejmuje pracę frontendową, backendową i mobilną. Host może użyć tego zakresu, aby zaproponować sposób koordynacji.
2. Hook wykrywania słów kluczowych nie uruchamia workflowu z tego zdania: aktywuje wyłącznie `orchestrate`, `ultrawork`, `work` lub `ralph` i tylko wtedy, gdy prompt wymienia nazwę trybu. Nie klasyfikuje żądania jako wielodomenowego. Użyj jawnej komendy, aby wybrać potrzebny workflow.

**Korzystanie z `/work` (krok po kroku, z kontrolą użytkownika):**

```text
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Krok 1, agent PM planuje:**
   - rozpoznaje domeny: backend (API uwierzytelniania, CRUD zadań), frontend (logowanie, interfejs listy zadań), mobile (aplikacja Flutter)
   - definiuje kontrakty API: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`
   - tworzy podział zadań według poziomów priorytetu (niższe poziomy uruchamiają się najpierw):
     - Poziom 1: API uwierzytelniania backendu, API CRUD zadań backendu
     - Poziom 2: logowanie/rejestracja frontendu, lista zadań frontendu, ekrany uwierzytelniania mobile, lista zadań mobile
     - Poziom 3: przegląd QA
   - zapisuje wynik w `.agents/results/plan-{sessionId}.json`

4. **Krok 2, przejrzyj plan:** Agent przedstawia plan i działa dalej w ramach istniejącej autoryzacji, pytając tylko o istotną brakującą decyzję lub nowe uprawnienie.

5. **Krok 3, agenci uruchamiają się według poziomu priorytetu:**
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

   `--task-id` musi odpowiadać `id` zadania w planie sesji; bez tej flagi ID zadania domyślnie przyjmuje ID agenta, a sesja z planem odrzuca ID, którego nie zawiera (`Unknown plan task`). Sesje ad hoc bez planu mogą ją pominąć.

6. **Krok 4, agent QA wykonuje przegląd:**
   - bezpieczeństwo: zgodność z OWASP Top 10 (walidacja JWT, CSRF, kontrola SQL injection)
   - wydajność: kontrola zapytań N+1, weryfikacja paginacji
   - dostępność: WCAG 2.2 AA we wszystkich komponentach frontendu
   - między domenami: zgodność kontraktów API między frontendem, mobile i backendem

7. **Krok 5, iteruj:** Jeśli QA znajdzie problemy CRITICAL, uruchom ponownie odpowiedzialnego agenta z raportem QA.

---

## Przykład 3: naprawianie błędu

**Wpisujesz:**
```text
There's a bug. Clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**Co się dzieje:**

1. `oma-debug` aktywuje się automatycznie (słowa kluczowe: „bug”, „error”, „Cannot read property”)
2. **Krok 1, zbierz:** Zostają przechwycone komunikat błędu i kontekst
<!-- oma-docs:ignore-start -->
3. **Krok 2, odtwórz:** MCP `search_for_pattern` znajduje wywołanie `.map()` w `src/features/tasks/components/task-list.tsx`
<!-- oma-docs:ignore-end -->
4. **Krok 3, zdiagnozuj:** MCP `find_referencing_symbols` śledzi przepływ danych:
   - hook `useQuery` pobiera zadania z API
   - komponent renderuje się, zanim nadejdą dane
   - `tasks` ma wartość `undefined` podczas stanu ładowania
   - przyczyna źródłowa: brak sprawdzenia stanu ładowania przed `.map()`
5. **Krok 4, zaproponuj poprawkę:** Przedstaw minimalną zmianę, dodając sprawdzenie stanu ładowania i ochronę przed nullem
6. **Krok 5, zaimplementuj:**
   - dodaj skeleton ładowania podczas pobierania danych
   - dodaj sprawdzenie wartości null: `tasks?.map()` albo wcześniejszy zwrot dla stanu ładowania
   - napisz test regresji potwierdzający poprawne renderowanie komponentu, gdy `tasks` ma wartość undefined
7. **Krok 6, przeskanuj podobne wzorce:** MCP `search_for_pattern` wyszukuje inne wywołania `.map()` na tablicach, które mogą być niezdefiniowane
   - znajduje 3 podobne wzorce w `user-list.tsx`, `comment-list.tsx` i `notification-list.tsx`
   - proaktywnie stosuje ten sam wzorzec poprawki
8. **Krok 7, udokumentuj:** Raport błędu zostaje zapisany w pamięci wraz z przyczyną źródłową, poprawką i sposobem zapobiegania

---

## Przykład 4: system projektowy

**Wpisujesz:**
```text
/design Define a dark, premium visual system for my B2B SaaS analytics product. English and Korean, WCAG AA.
```

**Co się dzieje:**

1. **Wczytanie umiejętności:** Workflow czyta umiejętność `oma-design` i jej protokół wykonania. Umiejętność odpowiada za wybór dostawcy i kontrakt projektowy projektu.
2. **Ustalenie zakresu i kontekstu:** Żądanie zostaje zaklasyfikowane jako dokument systemu projektowego. Workflow odczytuje istniejący `DESIGN.md`, `.design-context.md` (gdy jest obecny), materiały marki, obsługiwane języki i objęty zmianą interfejs użytkownika oraz wyszukuje istniejące biblioteki UI, pliki motywów i tokeny. W przypadku istniejącego produktu najpierw ustala Preserve albo Overhaul. Pyta wyłącznie o wybór, który istotnie zmienia wynik i na który nie odpowiadają żądanie ani baza kodu; ten prompt podaje już języki, grupę odbiorców i docelowy poziom dostępności, więc nie ma żadnej ankiety.
3. **Dobór wytycznych i zebranie referencji:** Dla danej operacji wybierana jest jedna zewnętrzna umiejętność projektowa: Interface Design dla dashboardu albo interfejsu produktu SaaS, Taste dla pozostałych nowych kierunków artystycznych w sieci, Impeccable dla krytyki lub dopracowania istniejącego UI. Wskazany seed dostawcy, operacja Stitch, wytyczne dotyczące zasobów albo reguły data-grid ładują się tylko wtedy, gdy zadanie ich wymaga.
4. **Wybór kierunku:** Wybrane wytyczne są stosowane do dowodów z projektu. Alternatywne kierunki przedstawia się tylko wtedy, gdy nierozstrzygnięta decyzja istotnie wpływa na wynik; kierunek wybrany już wcześniej zostaje użyty ponownie. Każdy kierunek mieści się w granicach marki, pokrycia czcionek CJK dla języka koreańskiego, istniejącego stosu implementacyjnego, responsywności od najmniejszego obsługiwanego viewportu oraz WCAG AA.
5. **Utworzenie artefaktu:** Plik `DESIGN.md` zostaje utworzony lub zaktualizowany ze wszystkimi dziewięcioma sekcjami, w tym sekcją 9 (Agent Prompt Guide). Tokeny mapują role semantyczne na istniejący w projekcie system tokenów i format motywu; nie wprowadza się żadnej równoległej konfiguracji. Nie powstaje żaden kod implementacyjny.
6. **Weryfikacja i przekazanie:** Sprawdzane są odpowiednie pozycje listy kontrolnej i wymieniane jest to, co zostało sprawdzone. Kontrole wymagające wyrenderowanej implementacji są określane, ale pozostają nieuruchomione. Raport wymienia dostarczone artefakty, wybraną trasę, wyniki weryfikacji i pozostałe ograniczenia, po czym przekazuje implementację do `oma-frontend` (web) albo `oma-mobile` (native).

---

## Przykład 5: równoległe wykonanie CLI

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

Jeśli bieżący runtime odpowiada docelowemu dostawcy w `.agents/oma-config.yaml`, workflowy powinny preferować subagentów natywnych dla runtime'u:

- Claude Code -> `.claude/agents/*.md`
- Codex CLI -> `.codex/agents/*.toml`
- Qwen Code -> `.qwen/agents/*.md`, wybierane przez `subagent_type` narzędzia Agent
- Antigravity CLI/IDE -> `oma agent spawn` przez `agy`

Zadania między dostawcami oraz `model_preset: free` używają `oma agent spawn`. Natywny dispatch nadal wymaga [cyklu życia wyniku](./agent-results-and-resume.md), aby zapisać dowody weryfikacji.

---

## Przykład 6: ultrawork dla maksymalnej jakości

**Wpisujesz:**
```text
/ultrawork Build a payment processing module with Stripe integration
```

**Co się dzieje (5 faz, 17 kroków, 12 odizolowanych kroków przeglądu):**

**Faza 1, PLAN (kroki 1–4, agent PM inline):**
- Krok 1: Utwórz plan z podziałem zadań, kontraktami API i zależnościami
- Krok 2: przegląd planu (kontrola kompletności: czy wszystkie wymagania są zmapowane?)
- Krok 3: przegląd meta (samodzielnie zweryfikuj, czy przegląd był wystarczający)
- Krok 4: przegląd przeinżynierowania (MVP, bez niepotrzebnej złożoności)
- PLAN_GATE: Plan udokumentowany, założenia wypisane, zakres autoryzowany

**Faza 2, IMPL (krok 5, uruchomieni agenci deweloperscy):**
- Agent backendu implementuje integrację Stripe (webhooki, idempotencja, obsługa błędów)
- Agent frontendu buduje przepływ checkoutu i interfejs statusu płatności
- Krok 5.2: Zapisz baseline tylko wtedy, gdy potrzebne jest zdefiniowane porównanie pomiarów
- IMPL_GATE: Odpowiednie kontrole i testy niewytwarzające artefaktów przechodzą, zmieniono tylko zaplanowane pliki; kontrole builda są uruchamiane tylko na wyraźne żądanie

**Faza 3, VERIFY (kroki 6–8, uruchomiony agent QA):**
- Krok 6: przegląd zgodności (czy implementacja odpowiada planowi?)
- Krok 7: przegląd bezpieczeństwa/błędów (OWASP, npm audit, praktyki bezpieczeństwa Stripe)
- Krok 8: przegląd ulepszeń/regresji (czy nie wprowadzono regresji?)
- VERIFY_GATE: zero CRITICAL, zero HIGH, spełnione odpowiednie cele pomiarowe projektu

**Faza 4, REFINE (kroki 9–13, uruchomiony agent refaktoryzacji):**
- Krok 9: Podziel duże pliki (> 500 linii) i funkcje (> 50 linii)
- Krok 10: przegląd integracji/ponownego użycia (usuń zduplikowaną logikę)
- Krok 11: przegląd efektów ubocznych (prześledź wpływ kaskadowy przez `find_referencing_symbols`)
- Krok 12: pełny przegląd zmian (spójność nazewnictwa, zgodność stylu)
- Krok 13: usuń martwy kod
- REFINE_GATE: brak nierozwiązanej zmierzonej regresji, kod uporządkowany

**Faza 5, SHIP (kroki 14–17, uruchomiony agent QA):**
- Krok 14: przegląd jakości kodu (lint, typy, pokrycie)
- Krok 15: weryfikacja przepływu UX (end-to-end ścieżka użytkownika płatności)
- Krok 16: przegląd powiązanych problemów (końcowa kontrola wpływu kaskadowego)
- Krok 17: gotowość do wdrożenia (zarządzanie sekretami, skrypty migracji, plan wycofania)
- SHIP_GATE: Wszystkie kontrole przechodzą; użyj istniejącej autoryzacji. Publikacja lub wdrożenie wymaga autoryzacji dla tej czynności.

---

## Wszystkie komendy workflowów

| Komenda | Typ | Co robi | Kiedy używać |
|---------|------|---------|-------------|
| `/orchestrate` | Trwały | Ładuje albo tworzy plan, następnie deleguje wykonanie równoległe z monitorowaniem i weryfikacją | Niezależne zadania pasujące do automatycznej koordynacji równoległej |
| `/work` | Trwały | Planowanie wielodomenowe krok po kroku, implementacja i QA w autoryzowanym zakresie | Funkcje obejmujące wiele domen i wymagające skoordynowanego dostarczenia |
| `/ultrawork` | Trwały | 5-fazowy, 17-krokowy workflow jakości z 12 odizolowanymi punktami przeglądu | Dostarczenie o maksymalnej jakości, kod krytyczny dla produkcji |
| `/plan` | Nietrwały | Podział zadań prowadzony przez PM, kontrakty API i śledzone artefakty planu w `docs/plans/work/` (sekwencyjne `NNN-name.md`, pole Status dla cyklu życia) | Przed złożoną pracą wieloagentową; złożone funkcje wymagające śledzonego postępu i logów decyzji |
| `/brainstorm` | Nietrwały | Ideacja projektowa z 2–3 propozycjami podejść | Przed wyborem podejścia implementacyjnego |
| `/deepinit` | Nietrwały | Pełna inicjalizacja projektu (AGENTS.md, ARCHITECTURE.md, docs/) | Konfiguracja oh-my-agent w istniejącej bazie kodu |
| `/review` | Nietrwały | Potok QA: bezpieczeństwo OWASP, wydajność, dostępność, jakość kodu. Zakres pochodzi z żądania i domyślnie obejmuje bieżące zmiany | Przed scaleniem kodu, przed wdrożeniem |
| `/security` | Nietrwały | Skanowanie kodu źródłowego aplikacji, umiejętności agentów albo komponentów MCP, walidacja ustaleń i konfiguracja bramek bezpieczeństwa przez `oma-security`. Testy penetracyjne ograniczonego zakresem testowego wdrożenia webowego działają wyłącznie na dostarczonej przez użytkownika i zweryfikowanej platformie uruchomieniowej | Przed wydaniem albo gdy zmiana wymaga skanu lub bramki bezpieczeństwa |
| `/debug` | Nietrwały | Ustrukturyzowane debugowanie: odtwórz, zdiagnozuj, napraw, napisz test regresji, przeskanuj | Badanie błędów i awarii |
| `/design` | Nietrwały | Określa zakres zadania projektowego, wybiera odpowiednie wytyczne projektowe i dostarcza ustalenia, `DESIGN.md`, kierunek przeprojektowania albo tokeny projektowe przez `oma-design` | Definiowanie lub przegląd systemu wizualnego, redesign UI, audyty designu |
| `/scm` | Nietrwały | Workflow SCM dla Git (branch/merge/conflict/worktree/baseline) oraz generowanie Conventional Commit z automatycznym rozpoznaniem typu/zakresu i podziałem funkcjonalności | Po zakończeniu zmian kodu albo przy zadaniach związanych z zarządzaniem konfiguracją repozytorium |
| `/stack-set` | Nietrwały | Automatyczne wykrywanie stosu technologicznego projektu i generowanie odwołań backendowych, frontendowych albo mobilnych (Swift/Kotlin/Flutter/RN) | Konfiguracja konwencji kodowania właściwych dla języka |
| `/architecture` | Nietrwały | Diagnoza architektury, porównanie i zapisy decyzji | Przegląd granic albo wybór architektury |
| `/convert` | Nietrwały | Kierowanie konwersji dokumentów do właściwej umiejętności | Konwersja plików źródłowych HWP/HWPX albo PDF |
| `/docs` | Nietrwały | Weryfikacja dokumentacji i propozycje synchronizacji celowane diffem | Sprawdzanie dokumentacji względem bieżącej bazy kodu |
| `/explain` | Nietrwały | Generowanie offline'owego objaśnienia HTML dla zmiany kodu lub tematu, walidacja przez `oma explain validate` i otwarcie przez `oma explain render --open` | Nauczanie na podstawie diffu, PR-a, brancha albo zakresu commitów lub objaśnianie tematu |
| `/recap` | Nietrwały | Podsumowanie pracy z historii obsługiwanych narzędzi AI | Retrospektywa dnia lub okresu |
| `/schedule` | Nietrwały | Rejestrowanie cyklicznych zadań agentów | Nocne podsumowania, skany albo porządki |
| `/video` | Nietrwały | Komponowanie odtwarzalnych filmów ze skryptów, narracji i wizualiów | Shorts, objaśnienia i demonstracje |
| `/ralph` | Trwały | Wielokrotne wykonanie ultrawork z sędzią uruchamianym promptem i zabezpieczeniami pętli | Jawne żądanie powtarzania wykonania do spełnienia mechanicznych kryteriów ukończenia |

---

## Przykłady automatycznego wykrywania

oh-my-agent wykrywa słowa kluczowe workflowów w 11 językach. Poniższe przykłady pokazują, jak język naturalny uruchamia workflowy:

| Wpisujesz | Wykryty workflow | Język |
|----------|------------------|----------|
| "Orchestrate this deployment." | `/orchestrate` | English |
| "orquestar este trabajo" | `/orchestrate` | Spanish |
| "ultrawork this refactor" | `/ultrawork` | English |
| "ulw로 고쳐줘" | `/ultrawork` | Korean |
| "Switch to work mode for this refactor." | `/work` | English |
| "work workflow로 진행해줘" | `/work` | Korean |
| "ralph this task" | `/ralph` | English |
| "랄프로 끝까지 해줘" | `/ralph` | Korean |

**Zapytania informacyjne są odfiltrowywane:**

| Wpisujesz | Wynik |
|----------|--------|
| "what is orchestrate?" | Workflow nie jest uruchamiany (wzorzec informacyjny: "what is") |
| "explain how /plan works" | Workflow nie jest uruchamiany (wzorzec informacyjny: "explain") |
| "어떻게 사용해?" | Workflow nie jest uruchamiany (wzorzec informacyjny: "어떻게") |
| "レビューとは何ですか" | Workflow nie jest uruchamiany (wzorzec informacyjny: "とは") |

---

## Wszystkie 33 umiejętności: szybka ściąga

Preset instalatora `all` korzysta z aktywnego rejestru. Tabela grupuje wszystkie bieżące umiejętności według głównego zastosowania; umiejętność nadal może współpracować z inną na granicy domen.

| Umiejętność | Najlepsze zastosowanie | Główny wynik |
|-------|---------|---------------|
| **oma-academic-writing** | Pisanie akademickie, redakcja i przegląd anty-AI | Proza publikacyjna oraz poprawki twierdzeń/dowodów |
| **oma-architecture** | Granice systemu, kompromisy, ADR-y | Rekomendacja architektoniczna albo rejestr decyzji |
| **oma-backend** | API, auth, logika serwerowa, migracje | Zmiany routera/serwisu/repozytorium i weryfikacja |
| **oma-brainstorm** | Niejednoznaczne pomysły i porównanie podejść | Dokument projektowy w `docs/plans/designs/` |
| **oma-coordination** | Wspólne zasady koordynacji dla `/work`, `/orchestrate` i `/ultrawork`; ręczna koordynacja krok po kroku | Wskazówki dotyczące ponownego użycia planu, uzgadniania kontraktów, własności workspace'u i przekazania do QA |
| **oma-db** | Projekt schematu, ERD, strojenie zapytań, planowanie pojemności | Dokumentacja schematu, migracje i plan odzyskiwania |
| **oma-debug** | Odtwarzanie błędów i analiza przyczyny źródłowej | Minimalna poprawka, dowody regresji i skan wzorców |
| **oma-security** | Skanowanie bezpieczeństwa kodu źródłowego, umiejętności agentów i MCP; testy penetracyjne wyłącznie na dostarczonej przez użytkownika i zweryfikowanej platformie uruchomieniowej | Zweryfikowane ustalenia i konfiguracja bramek skanowania |
| **oma-design** | Systemy wizualne, `DESIGN.md`, kierunek przeprojektowania, przegląd projektu UI | Decyzja projektowa lub ustalenia, `DESIGN.md` przy zmianie systemu oraz przekazanie do implementacji |
| **oma-dev-workflow** | CI/CD, monorepo, migracje, automatyzacja wydań | Konfiguracja workflowu i kontrole wydań |
| **oma-docs** | Uszkodzone odnośniki i dryf dokumentacji | Raport verify albo kandydaci synchronizacji celowani diffem |
| **oma-explanation** | Przejścia po diffie, PR-ze, branchu albo commitach; objaśnienia tematów | Offline'owe objaśnienie HTML (Background, Intuition, Code i Quiz dla zmiany) |
| **oma-frontend** | Komponenty UI, formularze, strony, stylowanie Angulara albo Reacta | Zmiany frontendu i właściwe kontrole |
| **oma-hwp** | Konwersja HWP/HWPX/HWPML | Markdown z nagłówkami, tabelami, obrazami i linkami |
| **oma-image** | Generowanie obrazów i zasobów wizualnych | Odtwarzalny przebieg obrazu z manifestem |
| **oma-market** | Problemy, trendy, konkurencja i badania odkrywcze | Brief badawczy zgodny z LAW i frameworkami |
| **oma-mobile** | Praca we Flutterze, React Native, Swift iOS i Kotlin Android | Ekrany mobilne, stan, integracja platformy i testy |
| **oma-observability** | Trace'y, metryki, logi, profile, SLO, analiza incydentów | Warstwowa rekomendacja obserwowalności albo wskazówki implementacji |
| **oma-orchestration** | Automatyczne równoległe wykonywanie agentów | Skoordynowane plany, aktualizacje pamięci i zebranie wyników |
| **oma-pdf** | Konwersja PDF i ekstrakcja z OCR | Markdown z kolejnością czytania, tabelami, listami i obrazami |
| **oma-pm** | Wymagania, podział zadań, kontrakty API | `.agents/results/plan-{sessionId}.json` i task board |
| **oma-qa** | Przegląd bezpieczeństwa, wydajności, dostępności i jakości | Raport ustaleń z ważnością i dowodami remediacji |
| **oma-recap** | Retrospektywy pracy z wielu narzędzi | Podsumowanie dnia lub okresu w `.agents/results/recap/` |
| **oma-refactor** | Restrukturyzacja zachowująca działanie | Zmiany refaktoryzacyjne z testami charakterystyki i dowodami jakości |
| **oma-scholar** | Wyszukiwanie naukowe i sidecary artykułów | Zweryfikowane operacje na sidecarze `.knows.yaml` |
| **oma-scm** | Branche Git, worktree, baseline'y i higiena commitów | Plan SCM albo wynik Conventional Commit |
| **oma-search** | Dokumentacja zewnętrzna, źródła w sieci, zdalny kod i odczyt znanych adresów URL | Cytowane źródła z trasą, dostawcą, dowodami i ograniczeniami |
| **oma-skill-creation** | Tworzenie i audyt umiejętności OMA | Pliki umiejętności SSL-lite i wyniki `oma skill audit` |
| **oma-slide** | Prezentacje HTML i eksporty | Zweryfikowany zbundlowany HTML, PDF, PNG albo PPTX |
| **oma-tf-infra** | Infrastruktura Terraform, IAM i polityka jako kod | Moduły Terraform, plany i kontrole |
| **oma-translation** | Lokalizacja UI, dokumentacji i marketingu | Tłumaczenie zachowujące kontekst |
| **oma-video** | Shorts, objaśnienia i demonstracje | Odtwarzalny przebieg wideo z zasobami i manifestem |
| **oma-voice** | Lokalny TTS, STT i voiceovery | Artefakty audio lub transkrypcji z manifestem |

---

## Konfiguracja dashboardu

```bash
oma dashboard terminal   # live table in this terminal; Ctrl+C to exit
oma dashboard web        # prints http://127.0.0.1:9847/; open it in a browser
```

Obie komendy obserwują `.agents/state/memories/` w bieżącym katalogu. Przekaż `--project-root <path>`, aby obserwować inny projekt, albo ustaw `MEMORIES_DIR`. Tabela agentów ma cztery kolumny:

| Kolumna | Źródło |
|--------|--------|
| Agent | `task-board.md` albo nazwy agentów wykryte w plikach pamięci |
| Status | Symbole terminalowe: ● uruchomiony (zielony), ✓ ukończony (cyjan), ✗ nieudany (czerwony), ○ zablokowany (żółty), ◌ oczekujący (przygaszony) |
| Turn | `turn: N` w pliku `progress-<agent>*.md` agenta |
| Task | Tekst zadania z task boardu albo z pliku agenta |

Pod tabelą oba dashboardy wyświetlają najnowszą aktywność z pięciu ostatnio zmodyfikowanych plików pamięci. Układy, źródła danych i kroki odzyskiwania opisuje [Monitorowanie dashboardu](./dashboard-monitoring.md).

---

## Wyjaśnienie kluczowych pojęć

### Progressive disclosure

Umiejętności ładują się w dwóch warstwach, aby oszczędzać tokeny. Warstwa 1 (`SKILL.md`) trafia do kontekstu, gdy host kieruje do umiejętności — injector przekazuje ścieżkę, a nie treść. Warstwa 2 (`resources/`) jest odczytywana dopiero wtedy, gdy wymaga tego zadanie; poziom trudności wyznacza miękki budżet, a nie listę plików. Oszczędność zależy od umiejętności i zadania, więc zmierz ją, zamiast zakładać konkretną liczbę: [matematyka oszczędności tokenów](../core-concepts/skills.md#token-savings-math) zawiera skrypt i wyjaśnia, co obejmują jego szacunki.

### Optymalizacja tokenów

Poza progressive disclosure oh-my-agent optymalizuje tokeny przez:
- **Zarządzanie budżetem kontekstu:** nie czytaj całych plików; używaj `find_symbol` zamiast `read_file`
- **Leniwe ładowanie zasobów:** playbooki błędów ładuj tylko po błędach, a checklisty dopiero podczas weryfikacji
- **Rozgałęzienia zależne od trudności:** zadania Simple pomijają analizę i używają minimalnych checklist
- **Śledzenie postępu:** agenci zapisują odczytane pliki, aby nie czytać ich ponownie

### Uruchamianie CLI

Gdy uruchamiasz `oma agent spawn`, CLI:
1. Rozstrzyga dostawcę roli na podstawie jawnych opcji, nadpisań agenta, presetu modelu i skonfigurowanego fallbacku
2. Wstrzykuje protokół wykonania właściwy dla dostawcy z `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`
3. Składa prompt agenta z podstawowych reguł SKILL.md, protokołu wykonania i zasobów właściwych dla zadania
4. Uruchamia agenta jako niezależny proces CLI
5. Zapisuje ustrukturyzowane potwierdzenie uruchomienia w `.agents/state/agent-runs/` i wstrzykuje ścieżkę twierdzenia
6. Agent zapisuje twierdzenie strukturalne; czytelne dla człowieka pliki Markdown postępu i wyniku są dodatkiem

### Magazyn pamięci projektu

Agenci koordynują się przez trwałe pliki w `.agents/state/memories/` (starsze projekty przechodzą do starszej ścieżki `.serena/memories/`). Katalog ten przechowuje podsumowania sesji, task boardy, postęp, wnioski i rekordy eksperymentów. Czytelne dla człowieka raporty `result-{agentId}-{taskId}-{runId}-{sessionId}.md` trafiają do `.agents/results/`. Ustrukturyzowane potwierdzenia i twierdzenia w `.agents/state/agent-runs/` pozostają źródłem prawdy dla uruchomień CLI, a zamrożone plany wykonania znajdują się w `.agents/state/agent-plans/`. Agenci odczytują i zapisują te pliki własnymi narzędziami plikowymi; mapowanie narzędzi pozostaje konfigurowalne w `.agents/mcp.json → memoryConfig.tools`.

### Dokumenty i raporty

Użyj `docs/decisions/` dla propozycji podejść i ADR-ów z polem `Status`, takim jak `draft`, `accepted` lub `superseded`. Projekty UI należą do `DESIGN.md`. Plany prac pozostają w `docs/plans/work/`, a przyjęte kontrakty API w `docs/plans/contracts/`.

Raporty z wykonania i szkice kontraktów należą do `.agents/results/`. Gdy dokument staje się utrzymywaną dokumentacją referencyjną projektu, przenieś go do odpowiedniego katalogu `docs/` i zostaw link w poprzedniej lokalizacji. Pełny układ i polecenia migracji znajdziesz w [Układzie artefaktów](./artifact-layout.md).

### Przestrzenie robocze

<!-- oma-docs:ignore-start -->
Flaga `-w` przy `agent spawn` izoluje agenta w konkretnym katalogu. Jest to kluczowe przy wykonywaniu równoległym. Bez izolacji dwaj agenci mogą równocześnie modyfikować ten sam plik i powodować konflikty. Standardowy układ przestrzeni roboczych: `./apps/api` (backend), `./apps/web` (frontend), `./apps/mobile` (mobile).
<!-- oma-docs:ignore-end -->

---

## Wskazówki

1. **Precyzyjnie formułuj prompty.** „Zbuduj aplikację TODO z auth JWT, frontendem React, backendem Express i PostgreSQL” da lepsze rezultaty niż „zrób aplikację”.

2. **Używaj przestrzeni roboczych przy agentach równoległych.** Zawsze przekazuj `-w ./path`, aby zapobiec konfliktom plików między równocześnie działającymi agentami.

3. **Zablokuj kontrakty API przed uruchomieniem agentów implementacyjnych.** Najpierw uruchom `/plan`, aby agenci frontendu i backendu uzgodnili kształty endpointów.

4. **Monitoruj aktywnie.** Otwórz terminal dashboardu, aby wcześnie zauważyć agentów kończących się błędem, zamiast odkrywać problemy po zakończeniu wszystkich prac.

5. **Iteruj przez ponowne uruchomienia.** Jeśli wynik agenta nie jest poprawny, uruchom go ponownie z pierwotnym zadaniem i kontekstem korekty. Nie zaczynaj od zera.

6. **Dobierz koordynację do zadania.** Dla jednej domeny zacznij od pojedynczej umiejętności; użyj [przewodnika wyboru](/docs/core-concepts/workflows#choosing-a-skill-or-workflow), gdy zadanie wymaga koordynacji albo jawnego procesu jakości.

7. **Przy niejasnych pomysłach użyj `/brainstorm` przed `/plan`.** Brainstorm wyjaśnia intencję i podejście, zanim agent PM rozłoży pracę na zadania.

8. **Na nowych bazach kodu uruchom `/deepinit`.** Tworzy AGENTS.md i ARCHITECTURE.md, które pomagają wszystkim agentom zrozumieć strukturę projektu.

9. **Skonfiguruj `model_preset`.** Zacznij od `auto`, wybierz stały preset, taki jak `claude`, `antigravity`, `codex`, `qwen`, `cursor`, `kiro` lub `mixed`, albo użyj `free` z lokalną bramką. Dodaj nadpisania `agents:` dla szczegółowej kontroli. Zobacz [Modele per agent](./per-agent-models.md).

10. **Użyj `/ultrawork`, gdy jawnie chcesz jego pełnego procesu przeglądu.** Workflow 5 faz uruchamia 12 odizolowanych kroków przeglądu; samo ładowanie umiejętności tych kontroli nie uruchamia.

---

## Rozwiązywanie problemów {#troubleshooting}

Typowe problemy opisano poniżej. Komunikaty błędów, nieudane wyniki uruchomień, harmonogramy i hooki omawia [Rozwiązywanie problemów](./troubleshooting.md).

| Problem | Przyczyna | Poprawka |
|---------|--------|-----|
| Umiejętności nie są wykrywane w IDE | Brak `.agents/skills/` albo plików `SKILL.md` | Uruchom instalator (`bunx oh-my-agent@latest`), sprawdź dowiązania symboliczne w `.claude/skills/`, uruchom ponownie IDE |
| CLI nie jest znajdowane podczas uruchamiania | Wybrane CLI AI nie jest zainstalowane albo nie ma go w `PATH` | Uruchom `which <selected-cli>` (np. `claude`, `codex`, `agy`, `qwen` albo `kiro-cli`), otwórz nową powłokę lub zainstaluj je według przewodnika instalacji |
| Agenci tworzą sprzeczny kod | Brak izolacji przestrzeni roboczych | Użyj osobnych przestrzeni: `-w ./apps/api`, `-w ./apps/web` |
| Dashboard pokazuje „No agents detected yet” | Agenci nie zapisali jeszcze nic w pamięci albo dashboard obserwuje inny katalog | Poczekaj na pierwszy plik postępu; uruchom z katalogu głównego projektu albo przekaż `--project-root <path>` |
| `oma dashboard web` kończy się komunikatem „port 9847 is already in use” | Inny proces zajmuje port | `DASHBOARD_PORT=8080 oma dashboard web` |
| Raport QA ma ponad 50 problemów | To normalne przy pierwszym przeglądzie dużej bazy kodu | Najpierw zajmij się ważnością CRITICAL i HIGH. MEDIUM/LOW zapisz na przyszłe sprinty. |
| Tryb trwały uruchamia się, gdy tylko wspomnisz jego nazwę | Prompt wymienia `orchestrate`, `ultrawork`, `work mode` albo `ralph` poza pytaniem lub blokiem kodu | Napisz „workflow done”, aby go zakończyć. Zgłaszaj fałszywe wyzwolenia do poprawy. |
| Trwałego workflowu nie da się zatrzymać | Plik stanu nadal istnieje | Napisz na czacie „workflow done” albo ręcznie usuń plik stanu z `.agents/state/` |
| Agent blokuje się na doprecyzowaniu HIGH | Wymagania są zbyt niejednoznaczne | Podaj konkretne odpowiedzi, o które poprosił agent, a następnie uruchom ponownie |
| Narzędzia MCP nie działają | Serena nie jest skonfigurowana albo nie działa | Uruchom `oma doctor`, aby zweryfikować konfigurację MCP |
| Agent przekracza budżet wykonania | Zadanie jest zbyt złożone na jeden przebieg | Rozbij zadanie, użyj workflowu z jawnymi granicami zadań albo ponów z węższym kontraktem akceptacji |
| Użyto złego CLI dla agenta | `model_preset` nie jest skonfigurowany albo brakuje nadpisania agenta | Uruchom `oma install`, aby skonfigurować, albo ustaw `model_preset` w `oma-config.yaml`. Zobacz [Modele per agent](./per-agent-models.md). |

---

## Dalsze kroki

- Jedna zmiana w jednej domenie: [Jedna umiejętność](./single-skill.md)
- Funkcja obejmująca kilka domen: [Projekty wieloagentowe](./multi-agent-project.md)
- Błąd z komunikatem błędu: [Naprawianie błędów](./bug-fixing.md)
- Obserwowanie przebiegu: [Monitorowanie dashboardu](./dashboard-monitoring.md)
- Audyt albo wznawianie wyników agentów: [Wyniki i wznawianie](./agent-results-and-resume.md)
- Coś się nie powiodło: [Rozwiązywanie problemów](./troubleshooting.md)
- Szczegóły integracji z projektem: [Przewodnik integracji](./integration.md)
- Terminy używane w tych przewodnikach: [Słownik](../getting-started/glossary.md)
