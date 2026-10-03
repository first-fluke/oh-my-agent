---
title: Przewodnik użycia
sidebar_label: Korzystanie z OMA
description: Przewodnik użycia OMA obejmujący wybór zadań z myślą o czytelniku, przykłady dla jednej umiejętności i wielu domen, workflowy, automatyczne wykrywanie, wszystkie 33 pakiety umiejętności, równoległe wykonanie CLI, dashboardy, ustawienia domyślne i odzyskiwanie.
---

# Jak używać oh-my-agent

## Szybki start

1. Otwórz projekt w wybranym IDE lub CLI z obsługą AI (Claude Code, Codex CLI, Cursor, Antigravity, OpenCode, Kimi, Kiro, Qwen albo innym obsługiwanym hoście)
2. Wybrany host może ładować umiejętności z `.agents/skills/`; włączone hooki mogą wykrywać workflowy na podstawie słów kluczowych w języku naturalnym
3. Opisz po prostu, czego chcesz. Host albo wybrany workflow skieruje zadanie do właściwej umiejętności
4. Przy pracy wieloagentowej użyj `/work` albo `/orchestrate`

Zadania w jednej domenie nie wymagają specjalnej składni. Skorzystaj z [przewodnika wyboru umiejętności i workflowu](/docs/core-concepts/workflows#choosing-a-skill-or-workflow), aby wybrać między pojedynczą umiejętnością, `/work`, `/orchestrate`, `/ultrawork` i `/ralph`. Konfigurację znajdziesz w [Szybkim starcie](../getting-started/quick-start.md), a przed zmianą dostawców przeczytaj [Ważne ustawienia domyślne](../getting-started/important-defaults.md).

---

## Przykład 1: proste zadanie w jednej domenie

**Wpisujesz:**
```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**Co się dzieje:**

1. Host kieruje żądanie do `oma-frontend` (słowa takie jak „form”, „component” i „Tailwind CSS” są sygnałami routingu)
2. Warstwa 1 (SKILL.md) jest już załadowana i zawiera tożsamość agenta, podstawowe reguły oraz listę bibliotek
3. Zasoby warstwy 2 są ładowane na żądanie:
   - `execution-protocol.md`: workflow w 4 krokach (Analyze, Plan, Implement, Verify)
   - `snippets.md`: wzorce formularzy i walidacji Zod
   - istniejące wzorce komponentów oraz `snippets.md`, gdy umiejętność je dostarcza
4. Agent wypisuje **CHARTER_CHECK**:
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
<!-- oma-docs:ignore-start -->
5. Agent implementuje:
   - komponent React z TypeScript w `src/features/auth/components/login-form.tsx`
   - schemat walidacji Zod w `src/features/auth/utils/login-validation.ts`
   - testy Vitest w `src/features/auth/utils/__tests__/login-validation.test.ts`
   - skeleton ładowania w `src/features/auth/components/skeleton/login-form-skeleton.tsx`
<!-- oma-docs:ignore-end -->
6. Agent uruchamia checklistę: dostępność (etykiety ARIA, semantyczny HTML, nawigacja klawiaturą), widok mobilny, wydajność (brak CLS), granice błędów

**Oczekiwany wynik:** Ograniczony zakresem komponent React z TypeScript, walidacją, testami i dowodami dostępności, gdy projekt obsługuje takie kontrole. Prompt i wybrany workflow określają, które pliki oraz kontrole faktycznie zostaną uruchomione.

---

## Przykład 2: projekt obejmujący wiele domen

**Wpisujesz:**
```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**Co się dzieje:**

1. To żądanie obejmuje pracę frontendową, backendową i mobilną. Host może użyć tego zakresu, aby zaproponować sposób koordynacji.
2. Gdy hook wykrywania słów kluczowych jest włączony, „Build a TODO app” pasuje do skonfigurowanego wzorca `/orchestrate` i może go aktywować. Hook dopasowuje tekst, ale nie klasyfikuje żądania jako wielodomenowego. Użyj jawnej komendy, aby wybrać potrzebny workflow.

**Korzystanie z `/work` (krok po kroku, z kontrolą użytkownika):**

```
/work Build a TODO app with user authentication, task CRUD, and a mobile app
```

3. **Krok 1, agent PM planuje:**
   - rozpoznaje domeny: backend (API uwierzytelniania, CRUD zadań), frontend (logowanie, interfejs listy zadań), mobile (aplikacja Flutter)
   - definiuje kontrakty API: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /tasks`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`
   - tworzy priorytetyzowany podział zadań:
     - P0: API uwierzytelniania backendu, API CRUD zadań backendu
     - P1: logowanie/rejestracja frontendu, lista zadań frontendu, ekrany uwierzytelniania mobile, lista zadań mobile
     - P2: przegląd QA
   - zapisuje wynik w `.agents/results/plan-{sessionId}.json`

4. **Krok 2, przejrzyj plan:** Agent przedstawia plan i działa dalej w ramach istniejącej autoryzacji, pytając tylko o istotną brakującą decyzję lub nowe uprawnienie.

5. **Krok 3, agenci uruchamiają się według priorytetu:**
   ```bash
   # P0 tier (parallel)
   oma agent spawn backend "JWT auth API + task CRUD endpoints" session-todo-01 -w ./apps/api &
   oma agent spawn db "User and task schema design" session-todo-01 &
   wait

   # P1 tier (parallel, after P0 completes)
   oma agent spawn frontend "Login, register, task list UI" session-todo-01 -w ./apps/web &
   oma agent spawn mobile "Auth and task screens" session-todo-01 -w ./apps/mobile &
   wait
   ```

6. **Krok 4, agent QA wykonuje przegląd:**
   - bezpieczeństwo: zgodność z OWASP Top 10 (walidacja JWT, CSRF, kontrola SQL injection)
   - wydajność: kontrola zapytań N+1, weryfikacja paginacji
   - dostępność: WCAG 2.1 AA we wszystkich komponentach frontendu
   - między domenami: zgodność kontraktów API między frontendem, mobile i backendem

7. **Krok 5, iteruj:** Jeśli QA znajdzie problemy CRITICAL, uruchom ponownie odpowiedzialnego agenta z raportem QA.

---

## Przykład 3: naprawianie błędu

**Wpisujesz:**
```
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
```
Design a dark premium landing page for my B2B SaaS analytics product
```

**Co się dzieje:**

1. `oma-design` aktywuje się (słowa kluczowe: „design”, „landing page”, „dark”, „premium”)
2. **Faza 1, SETUP:** Sprawdza `.design-context.md`. Jeśli go brakuje, pyta:
   - Jakie języki obsługuje usługa? (tylko en / + CJK)
   - Odbiorcy docelowi? (B2B, użytkownicy techniczni, 25–45)
   - Osobowość marki? (profesjonalna / premium)
   - Kierunek estetyczny? (dark premium)
   - Strony referencyjne? (użytkownik podaje przykłady)
   - Dostępność? (WCAG AA)
3. **Faza 3, ENHANCE:** Jeśli prompt jest niejasny, przekształca go w specyfikację sekcja po sekcji
4. **Faza 4, PROPOSE:** Przedstawia 3 kierunki projektowe:
   - **Kierunek A: „Midnight Observatory”**: głęboki granat (#0f1729), cyjanowe akcenty (#22d3ee), Inter + JetBrains Mono, układ bento grid, odsłanianie sterowane przewijaniem
   - **Kierunek B: „Carbon Interface”**: neutralna szarość (#18181b), bursztynowe akcenty (#f59e0b), fonty systemowe, układ szachownicy, mikrointerakcje sterowane najechaniem
   - **Kierunek C: „Deep Space”**: czysta czerń (#0a0a0a), szmaragdowe akcenty (#10b981), Geist + Geist Mono, sekcje full-bleed, animacje wejścia
5. **Faza 5, GENERATE:** Na podstawie wybranego kierunku generuje:
   - `DESIGN.md` z 6 sekcjami (typografia, kolor, odstępy, ruch, komponenty, dostępność)
   - własne właściwości CSS
   - rozszerzenia konfiguracji Tailwind
   - zmienne motywu shadcn/ui
6. **Faza 6, AUDIT:** Uruchamia kontrole responsywności (minimum 320px), WCAG 2.2, heurystyk Nielsena i wykrywania AI slop
7. **Faza 7, HANDOFF:** „Projekt ukończony. Uruchom `/orchestrate`, aby zaimplementować go z oma-frontend.”

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
oma dashboard web    # Web UI at http://localhost:9847

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
```
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
| `/review` | Nietrwały | Potok QA: bezpieczeństwo OWASP, wydajność, dostępność, jakość kodu | Przed scaleniem kodu, przed wdrożeniem |
| `/debug` | Nietrwały | Ustrukturyzowane debugowanie: odtwórz, zdiagnozuj, napraw, napisz test regresji, przeskanuj | Badanie błędów i awarii |
| `/design` | Nietrwały | 7-fazowy workflow projektowy tworzący DESIGN.md z tokenami | Tworzenie systemów projektowych, landing page'ów, redesign UI |
| `/scm` | Nietrwały | Workflow SCM dla Git (branch/merge/conflict/worktree/baseline) oraz generowanie Conventional Commit z automatycznym rozpoznaniem typu/zakresu i podziałem funkcjonalności | Po zakończeniu zmian kodu albo przy zadaniach związanych z zarządzaniem konfiguracją repozytorium |
| `/tools` | Nietrwały | Zarządzanie widocznością narzędzi MCP (włączanie/wyłączanie grup) | Sterowanie narzędziami MCP dostępnymi dla agentów |
| `/stack-set` | Nietrwały | Automatyczne wykrywanie stosu technologicznego projektu i generowanie odwołań backendowych albo mobilnych (Swift/Flutter/RN) | Konfiguracja konwencji kodowania właściwych dla języka |
| `/architecture` | Nietrwały | Diagnoza architektury, porównanie i zapisy decyzji | Przegląd granic albo wybór architektury |
| `/convert` | Nietrwały | Kierowanie konwersji dokumentów do właściwej umiejętności | Konwersja plików źródłowych HWP/HWPX albo PDF |
| `/docs` | Nietrwały | Weryfikacja dokumentacji i propozycje synchronizacji celowane diffem | Sprawdzanie dokumentacji względem bieżącej bazy kodu |
| `/explain` | Nietrwały | Generowanie i walidacja offline'owego objaśnienia zmian w kodzie HTML | Nauczanie na podstawie diffu, PR-a, brancha albo zakresu commitów |
| `/recap` | Nietrwały | Podsumowanie pracy z historii obsługiwanych narzędzi AI | Retrospektywa dnia lub okresu |
| `/schedule` | Nietrwały | Rejestrowanie cyklicznych zadań agentów | Nocne podsumowania, skany albo porządki |
| `/video` | Nietrwały | Komponowanie odtwarzalnych filmów ze skryptów, narracji i wizualiów | Shorts, objaśnienia i demonstracje |
| `/ralph` | Trwały | Wielokrotne wykonanie ultrawork z niezależnym sędzią i zabezpieczeniami pętli | Jawne żądanie powtarzania wykonania do spełnienia mechanicznych kryteriów ukończenia |

---

## Przykłady automatycznego wykrywania

oh-my-agent wykrywa słowa kluczowe workflowów w 11 językach. Poniższe przykłady pokazują, jak język naturalny uruchamia workflowy:

| Wpisujesz | Wykryty workflow | Język |
|----------|------------------|----------|
| "plan the authentication feature" | `/plan` | English |
| "do everything in parallel" | `/orchestrate` | English |
| "review the code for security" | `/review` | English |
| "brainstorm some ideas for the dashboard" | `/brainstorm` | English |
| "design a landing page for our product" | `/design` | English |
| "fix the login bug" | `/debug` | English |
| "계획 세워줘" | `/plan` | Korean |
| "버그 수정해줘" | `/debug` | Korean |
| "디자인 시스템 만들어줘" | `/design` | Korean |
| "자동으로 실행해" | `/orchestrate` | Korean |
| "コードレビューして" | `/review` | Japanese |
| "計画を立てて" | `/plan` | Japanese |
| "修复这个 bug" | `/debug` | Chinese |
| "设计一个着陆页" | `/design` | Chinese |
| "revisar código" | `/review` | Spanish |
| "diseña la página" | `/design` | Spanish |
| "debuggen" | `/debug` | German |
| "coordonner étape par étape" | `/work` | French |
| "don't stop until it's done" | `/ralph` | English |
| "끝까지 해" | `/ralph` | Korean |
| "最後までやって" | `/ralph` | Japanese |

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
| **oma-coordination** | Ręczna koordynacja wieloagentowa | Wskazówki krok po kroku dotyczące zadań i przekazania |
| **oma-db** | Projekt schematu, ERD, strojenie zapytań, planowanie pojemności | Dokumentacja schematu, migracje i plan odzyskiwania |
| **oma-debug** | Odtwarzanie błędów i analiza przyczyny źródłowej | Minimalna poprawka, dowody regresji i skan wzorców |
| **oma-deepsec** | Skanowanie podatności z agentami | Raporty skanu, triage, rewalidacji i bramki |
| **oma-design** | Systemy projektowe, landing page'e, tokeny | `DESIGN.md`, tokeny i wskazówki komponentów |
| **oma-dev-workflow** | CI/CD, monorepo, migracje, automatyzacja wydań | Konfiguracja workflowu i kontrole wydań |
| **oma-docs** | Uszkodzone odnośniki i dryf dokumentacji | Raport verify albo kandydaci synchronizacji celowani diffem |
| **oma-explanation** | Przejścia po diffie, PR-ze, branchu albo commitach | Offline'owe objaśnienie HTML z Background, Intuition, Code i Quiz |
| **oma-frontend** | Komponenty UI, formularze, strony, stylowanie Angulara albo Reacta | Zmiany frontendu i właściwe kontrole |
| **oma-hwp** | Konwersja HWP/HWPX/HWPML | Markdown z nagłówkami, tabelami, obrazami i linkami |
| **oma-image** | Generowanie obrazów i zasobów wizualnych | Odtwarzalny przebieg obrazu z manifestem |
| **oma-market** | Problemy, trendy, konkurencja i badania odkrywcze | Brief badawczy zgodny z LAW i frameworkami |
| **oma-mobile** | Praca we Flutterze, React Native i Swift iOS | Ekrany mobilne, stan, integracja platformy i testy |
| **oma-observability** | Trace'y, metryki, logi, profile, SLO, analiza incydentów | Warstwowa rekomendacja obserwowalności albo wskazówki implementacji |
| **oma-orchestration** | Automatyczne równoległe wykonywanie agentów | Skoordynowane plany, aktualizacje pamięci i zebranie wyników |
| **oma-pdf** | Konwersja PDF i ekstrakcja z OCR | Markdown z kolejnością czytania, tabelami, listami i obrazami |
| **oma-pm** | Wymagania, podział zadań, kontrakty API | `.agents/results/plan-{sessionId}.json` i task board |
| **oma-qa** | Przegląd bezpieczeństwa, wydajności, dostępności i jakości | Raport ustaleń z ważnością i dowodami remediacji |
| **oma-recap** | Retrospektywy pracy z wielu narzędzi | Podsumowanie dnia lub okresu w `.agents/results/recap/` |
| **oma-refactor** | Restrukturyzacja zachowująca działanie | Zmiany refaktoryzacyjne z testami charakterystyki i dowodami jakości |
| **oma-scholar** | Wyszukiwanie naukowe i sidecary artykułów | Zweryfikowane operacje na sidecarze `.knows.yaml` |
| **oma-scm** | Branche Git, worktree, baseline'y i higiena commitów | Plan SCM albo wynik Conventional Commit |
| **oma-search** | Dokumentacja, web, kod i wyszukiwanie lokalne z oceną zaufania | Wyniki routowanego wyszukiwania z etykietami zaufania |
| **oma-skill-creation** | Tworzenie i audyt umiejętności OMA | Pliki umiejętności SSL-lite i wyniki `oma skill audit` |
| **oma-slide** | Prezentacje HTML i eksporty | Zweryfikowany zbundlowany HTML, PDF, PNG albo PPTX |
| **oma-tf-infra** | Infrastruktura Terraform, IAM i polityka jako kod | Moduły Terraform, plany i kontrole |
| **oma-translation** | Lokalizacja UI, dokumentacji i marketingu | Tłumaczenie zachowujące kontekst |
| **oma-video** | Shorts, objaśnienia i demonstracje | Odtwarzalny przebieg wideo z zasobami i manifestem |
| **oma-voice** | Lokalny TTS, STT i voiceovery | Artefakty audio lub transkrypcji z manifestem |

---

## Konfiguracja dashboardu

### Dashboard terminalowy

```bash
oma dashboard terminal
```

Wyświetla w terminalu tabelę aktualizowaną na żywo:
- ID sesji i ogólny status (RUNNING / COMPLETED / FAILED)
- Wiersze per agent: status, liczba tur, ostatnia aktywność, czas, który upłynął
- Obserwuje `.agents/state/memories/` i pokazuje postęp w czasie rzeczywistym

### Dashboard webowy

```bash
oma dashboard web
# Opens http://localhost:9847
```

Funkcje:
- Aktualizacje w czasie rzeczywistym przez WebSocket (bez ręcznego odświeżania)
- Automatyczne ponowne połączenie po zerwaniu
- Status sesji ze wskaźnikami agentów oznaczonymi kolorami (zielony = ukończony, żółty = uruchomiony, czerwony = nieudany)
- Strumieniowany dziennik aktywności z plików postępu i wyników
- Dane historyczne sesji

### Zalecany układ

Używaj 3 terminali:
1. **Terminal dashboardu:** `oma dashboard terminal` do ciągłego monitorowania
2. **Terminal komend:** polecenia uruchamiania agentów i workflowów
3. **Terminal builda:** uruchamianie testów, logi builda i operacje Git

---

## Wyjaśnienie kluczowych pojęć

### Progressive disclosure

Umiejętności ładują się w dwóch warstwach, aby oszczędzać tokeny. Warstwa 1 (`SKILL.md`, około 2631 tokenów mediany w bieżącym drzewie 33 umiejętności) trafia do kontekstu, gdy host kieruje do umiejętności — injector przekazuje ścieżkę, a nie treść. Warstwa 2 (`resources/`) jest odczytywana dopiero wtedy, gdy wymaga tego zadanie, zgodnie z poziomami trudności. W pomiarze sesji 5 agentów zadanie Simple albo Medium zajmuje około 18–19 tys. tokenów kontekstu umiejętności przy limicie 73 tys., pozostawiając około 109 tys. z kontekstu 128 tys. na rzeczywistą pracę; zadanie Complex zajmuje około 39 tys., pozostawiając około 89 tys. Zobacz [matematykę oszczędności tokenów](../core-concepts/skills.md#token-savings-math), aby znaleźć tabelę i skrypt odtwarzający te wartości.

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

Agenci koordynują się przez trwałe pliki w `.agents/state/memories/` (starsze projekty przechodzą do starszej ścieżki `.serena/memories/`). Orkiestrator zapisuje sesję przypisaną do uruchomienia i pliki task boardu. Każde uruchomienie zapisuje `progress-{agentId}-{taskId}-{runId}-{sessionId}.md` i `result-{agentId}-{taskId}-{runId}-{sessionId}.md`, gdy włączono Markdown dla postępu lub wyniku; ustrukturyzowane potwierdzenia i twierdzenia w `.agents/state/agent-runs/` są źródłem prawdy dla uruchomień CLI. Agenci odczytują i zapisują te pliki własnymi narzędziami plikowymi; mapowanie narzędzi pozostaje konfigurowalne w `.agents/mcp.json → memoryConfig.tools`.

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

## Rozwiązywanie problemów

| Problem | Przyczyna | Poprawka |
|---------|--------|-----|
| Umiejętności nie są wykrywane w IDE | Brak `.agents/skills/` albo plików `SKILL.md` | Uruchom instalator (`bunx oh-my-agent@latest`), sprawdź dowiązania symboliczne w `.claude/skills/`, uruchom ponownie IDE |
| CLI nie jest znajdowane podczas uruchamiania | Wybrane CLI AI nie jest zainstalowane albo nie ma go w `PATH` | Uruchom `which <selected-cli>` (np. `claude`, `codex`, `agy`, `qwen` albo `kiro`), otwórz nową powłokę lub zainstaluj je według przewodnika instalacji |
| Agenci tworzą sprzeczny kod | Brak izolacji przestrzeni roboczych | Użyj osobnych przestrzeni: `-w ./apps/api`, `-w ./apps/web` |
| Dashboard pokazuje „No agents detected” | Agenci nie zapisali jeszcze nic w pamięci | Poczekaj na uruchomienie agentów (pierwszy zapis w turze 1) albo sprawdź zgodność ID sesji |
| Dashboard webowy nie startuje | Zależności nie są zainstalowane | Najpierw uruchom `bun install` w katalogu web/ |
| Raport QA ma ponad 50 problemów | To normalne przy pierwszym przeglądzie dużej bazy kodu | Najpierw zajmij się ważnością CRITICAL i HIGH. MEDIUM/LOW zapisz na przyszłe sprinty. |
| Automatyczne wykrywanie uruchamia zły workflow | Niejednoznaczność słów kluczowych | Zamiast języka naturalnego użyj jawnego `/command`. Zgłaszaj fałszywe wyzwolenia do poprawy. |
| Trwałego workflowu nie da się zatrzymać | Plik stanu nadal istnieje | Napisz na czacie „workflow done” albo ręcznie usuń plik stanu z `.agents/state/` |
| Agent blokuje się na doprecyzowaniu HIGH | Wymagania są zbyt niejednoznaczne | Podaj konkretne odpowiedzi, o które poprosił agent, a następnie uruchom ponownie |
| Narzędzia MCP nie działają | Serena nie jest skonfigurowana albo nie działa | Uruchom `oma doctor`, aby zweryfikować konfigurację MCP |
| Agent przekracza budżet wykonania | Zadanie jest zbyt złożone na jeden przebieg | Rozbij zadanie, użyj workflowu z jawnymi granicami zadań albo ponów z węższym kontraktem akceptacji |
| Użyto złego CLI dla agenta | `model_preset` nie jest skonfigurowany albo brakuje nadpisania agenta | Uruchom `oma install`, aby skonfigurować, albo ustaw `model_preset` w `oma-config.yaml`. Zobacz [Modele per agent](./per-agent-models.md). |

---

Dla wzorców zadań w jednej domenie zobacz [Przewodnik pojedynczej umiejętności](./single-skill.md).
Szczegóły integracji opisuje [Przewodnik integracji](./integration.md).
