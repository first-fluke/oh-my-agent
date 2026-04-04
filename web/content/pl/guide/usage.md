---
title: Przewodnik użytkowania
description: Kompleksowy przewodnik użytkowania oh-my-agent — szybki start, szczegółowe przykłady z życia wzięte obejmujące pojedyncze zadania, projekty wielodomenowe, naprawy błędów, systemy projektowe, równoległe wykonanie CLI i ultrawork. Wszystkie polecenia workflow, przykłady automatycznego wykrywania w wielu językach, wszystkie 14 umiejętności z przypadkami użycia, konfiguracja panelu kontrolnego, kluczowe koncepcje, wskazówki i rozwiązywanie problemów.
---

# Jak używać oh-my-agent

## Szybki start

1. Otwórz projekt w IDE zasilanym AI (Claude Code, Gemini CLI, Cursor, Antigravity, itp.)
2. Umiejętności są automatycznie wykrywane z `.agents/skills/`
3. Opisz czego potrzebujesz w języku naturalnym — oh-my-agent kieruje do właściwego agenta
4. Do pracy wieloagentowej użyj `/coordinate` lub `/orchestrate`

To cały workflow. Nie potrzeba specjalnej składni do zadań jednodomenowych.

---

## Przykład 1: Proste pojedyncze zadanie

**Wpisujesz:**
```
Create a login form component with email and password fields, client-side validation, and accessible labels using Tailwind CSS
```

**Co się dzieje:**

1. Skill `oma-frontend` aktywuje się automatycznie (słowa kluczowe: "form", "component", "Tailwind CSS")
2. Warstwa 1 (SKILL.md) jest już załadowana — tożsamość agenta, podstawowe reguły, lista bibliotek
3. Zasoby Warstwy 2 ładują się na żądanie:
   - `execution-protocol.md` — 4-krokowy workflow (Analiza, Plan, Implementacja, Weryfikacja)
   - `snippets.md` — wzorce formularzy + walidacji Zod
   - `component-template.tsx` — struktura komponentu React
4. Agent generuje **CHARTER_CHECK**:
   ```
   CHARTER_CHECK:
   - Clarification level: LOW
   - Task domain: frontend
   - Must NOT do: backend API, database, mobile screens
   - Success criteria: email/password validation, accessible labels, keyboard-friendly
   - Assumptions: React + TypeScript, shadcn/ui, TailwindCSS v4, @tanstack/react-form + Zod
   ```
5. Agent implementuje:
   - Komponent React z TypeScript w `src/features/auth/components/login-form.tsx`
   - Schemat walidacji Zod w `src/features/auth/utils/login-validation.ts`
   - Testy Vitest w `src/features/auth/utils/__tests__/login-validation.test.ts`
   - Loading skeleton w `src/features/auth/components/skeleton/login-form-skeleton.tsx`
6. Agent uruchamia listę kontrolną: dostępność (etykiety ARIA, semantyczny HTML, nawigacja klawiaturą), widok mobilny, wydajność (brak CLS), error boundaries

**Wyjście:** Gotowy do produkcji komponent React z TypeScript, walidacją, testami i dostępnością — nie tylko sugestia.

---

## Przykład 2: Projekt wielodomenowy

**Wpisujesz:**
```
Build a TODO app with user authentication, task CRUD, and a mobile companion app
```

**Co się dzieje:**

1. Wykrywanie słów kluczowych identyfikuje to jako wielodomenowe (frontend + backend + mobile)
2. Jeśli nie użyłeś polecenia workflow, oh-my-agent sugeruje `/coordinate` lub `/orchestrate`

**Używając `/coordinate` (krok po kroku z kontrolą użytkownika):**

3. **Krok 1 — Agent PM planuje:** Identyfikuje domeny, definiuje kontrakty API, tworzy priorytetyzowany rozkład zadań, zapisuje do `.agents/plan.json`
4. **Krok 2 — Przeglądasz i potwierdzasz plan**
5. **Krok 3 — Agenci uruchamiani wg priorytetu** (P0 równolegle, potem P1...)
6. **Krok 4 — Agent QA przegląda:** Bezpieczeństwo OWASP Top 10, wydajność, dostępność WCAG 2.1 AA, zgodność kontraktów API
7. **Krok 5 — Iteracja:** Jeśli QA znajdzie problemy CRITICAL, ponowne uruchomienie odpowiedzialnego agenta z raportem QA.

---

## Przykład 3: Naprawa błędu

**Wpisujesz:**
```
There's a bug — clicking the save button shows "Cannot read property 'map' of undefined" in the task list
```

**Co się dzieje:**

1. `oma-debug` aktywuje się automatycznie (słowa kluczowe: "bug", "error")
2. **Krok 2 — Reprodukcja:** MCP `search_for_pattern` znajduje wywołanie `.map()` w `src/features/tasks/components/task-list.tsx`
3. **Krok 3 — Diagnoza:** Śledzenie przepływu danych — `tasks` jest `undefined` podczas stanu ładowania
4. **Krok 4 — Propozycja minimalnej poprawki** z potwierdzeniem użytkownika
5. **Krok 5 — Implementacja:** Loading skeleton + null guard + test regresji
6. **Krok 6 — Skan podobnych wzorców:** Znajduje 3 podobne wzorce w innych komponentach — proaktywnie naprawia
7. **Krok 7 — Dokumentacja:** Raport o błędzie zapisany do pamięci

---

## Przykład 4: System projektowy

**Wpisujesz:**
```
Design a dark premium landing page for my B2B SaaS analytics product
```

Aktywuje się `oma-design`, przechodzi przez 7 faz: SETUP (kontekst), ENHANCE (specyfikacja), PROPOSE (3 kierunki projektowe), GENERATE (DESIGN.md + tokeny), AUDIT (WCAG, responsive, AI slop), HANDOFF.

---

## Przykład 5: Wykonanie równoległe CLI

```bash
# Pojedynczy agent — proste zadanie
oma agent:spawn frontend "Add dark mode toggle to the header" session-ui-01

# Trzech agentów równolegle — funkcjonalność full-stack
oma agent:spawn backend "Implement notification API with WebSocket support" session-notif-01 -w ./apps/api &
oma agent:spawn frontend "Build notification center with real-time updates" session-notif-01 -w ./apps/web &
oma agent:spawn mobile "Add push notification screens and in-app notification list" session-notif-01 -w ./apps/mobile &
wait

# Monitoruj podczas pracy agentów (oddzielny terminal)
oma dashboard        # TUI z żywą tabelą
oma dashboard:web    # Web UI pod http://localhost:9847

# Po implementacji, uruchom QA
oma agent:spawn qa "Review notification feature across all platforms" session-notif-01
```

---

## Przykład 6: Ultrawork — maksymalna jakość

```
/ultrawork Build a payment processing module with Stripe integration
```

5 faz, 17 kroków, 11 kroków przeglądu:

- **PLAN (Kroki 1-4):** Stworzenie planu, przegląd kompletności, meta-przegląd, przegląd nadmiernej inżynierii
- **IMPL (Krok 5):** Agenci Dev implementują, mierzony bazowy Quality Score
- **VERIFY (Kroki 6-8):** Przegląd zgodności, bezpieczeństwa/błędów, ulepszenia/regresji
- **REFINE (Kroki 9-13):** Dzielenie plików, ponowne użycie, efekty uboczne, spójność, martwy kod
- **SHIP (Kroki 14-17):** Jakość kodu, przepływ UX, powiązane problemy, gotowość do wdrożenia

---

## Wszystkie polecenia workflow

| Polecenie | Typ | Co robi | Kiedy używać |
|---------|------|-------------|-------------|
| `/orchestrate` | Trwały | Automatyczne równoległe wykonanie agentów z monitoringiem i pętlami weryfikacji | Duże projekty wymagające maksymalnej równoległości |
| `/coordinate` | Trwały | Krokowa koordynacja wielodomenowa z zatwierdzeniem użytkownika | Funkcjonalności obejmujące wielu agentów z kontrolą |
| `/ultrawork` | Trwały | 5-fazowy, 17-krokowy workflow jakości z 11 punktami kontrolnymi | Maksymalna jakość dostarczenia, kod krytyczny dla produkcji |
| `/plan` | Nietrwały | Rozkład zadań sterowany przez PM i definicja kontraktów API | Przed złożoną pracą wieloagentową |
| `/exec-plan` | Nietrwały | Tworzenie i śledzenie planów wykonawczych jako artefaktów repozytorium | Złożone funkcjonalności wymagające śledzonego postępu |
| `/brainstorm` | Nietrwały | Ideacja z priorytetem projektowania z 2-3 propozycjami podejść | Przed zobowiązaniem się do podejścia implementacyjnego |
| `/deepinit` | Nietrwały | Pełna inicjalizacja projektu — AGENTS.md, ARCHITECTURE.md, docs/ | Konfiguracja oh-my-agent w istniejącej bazie kodu |
| `/review` | Nietrwały | Pipeline QA: bezpieczeństwo OWASP, wydajność, dostępność, jakość kodu | Przed mergowaniem kodu, przegląd przedwdrożeniowy |
| `/debug` | Nietrwały | Ustrukturyzowane debugowanie: reprodukcja, diagnoza, poprawka, test regresji, skan | Śledztwo w sprawie błędów |
| `/design` | Nietrwały | 7-fazowy workflow projektowy produkujący DESIGN.md z tokenami | Budowa systemów projektowych, stron landing page |
| `/commit` | Nietrwały | Konwencjonalny commit z automatycznym wykryciem typu/zakresu | Po zakończeniu zmian w kodzie |
| `/tools` | Nietrwały | Zarządzanie widocznością narzędzi MCP (włączanie/wyłączanie grup) | Kontrola dostępnych narzędzi MCP |
| `/stack-set` | Nietrwały | Automatyczne wykrywanie stosu technologicznego i generowanie referencji backend | Konfiguracja konwencji kodowania per język |

---

## Automatyczne wykrywanie — przykłady

oh-my-agent wykrywa słowa kluczowe workflow w 11 językach:

| Wpisujesz | Wykryty workflow | Język |
|----------|------------------|----------|
| "plan the authentication feature" | `/plan` | Angielski |
| "do everything in parallel" | `/orchestrate` | Angielski |
| "review the code for security" | `/review` | Angielski |
| "계획 세워줘" | `/plan` | Koreański |
| "버그 수정해줘" | `/debug` | Koreański |
| "コードレビューして" | `/review` | Japoński |
| "修复这个 bug" | `/debug` | Chiński |
| "coordonner étape par étape" | `/coordinate` | Francuski |

**Zapytania informacyjne są odfiltrowywane:** "what is orchestrate?" nie wyzwala żadnego workflow.

---

## Wskazówki

1. **Bądź konkretny w promptach.** "Build a TODO app with JWT auth, React frontend, Express backend, PostgreSQL" daje lepsze wyniki niż "make an app."
2. **Używaj przestrzeni roboczych dla równoległych agentów.** Zawsze przekazuj `-w ./ścieżka` aby zapobiec konfliktom plików.
3. **Zablokuj kontrakty API przed uruchomieniem agentów implementacyjnych.** Uruchom `/plan` najpierw.
4. **Aktywnie monitoruj.** Otwórz terminal z panelem aby wcześnie wychwycić nieudanych agentów.
5. **Iteruj przez ponowne uruchomienia.** Nie zaczynaj od nowa — uruchom ponownie z kontekstem korekty.
6. **Zacznij od `/coordinate` gdy nie masz pewności.** Prowadzi krok po kroku.
7. **Używaj `/brainstorm` przed `/plan` dla niejasnych pomysłów.**
8. **Uruchom `/deepinit` na nowych bazach kodu.** Tworzy AGENTS.md i ARCHITECTURE.md.
9. **Skonfiguruj mapowanie agent-CLI.** Kieruj złożone rozumowanie do Claude, szybkie generowanie do Gemini.
10. **Używaj `/ultrawork` dla kodu krytycznego dla produkcji.**

---

## Rozwiązywanie problemów

| Problem | Przyczyna | Rozwiązanie |
|---------|-------|-----|
| Umiejętności nie wykryte w IDE | Brak `.agents/skills/` lub plików `SKILL.md` | Uruchom instalator (`bunx oh-my-agent@latest`), zweryfikuj symlinki, uruchom ponownie IDE |
| CLI nie znalezione przy uruchamianiu | AI CLI nie zainstalowane globalnie | `which gemini` / `which claude` — zainstaluj brakujące CLI |
| Agenci produkują konfliktujący kod | Brak izolacji przestrzeni roboczej | Użyj oddzielnych przestrzeni roboczych: `-w ./apps/api`, `-w ./apps/web` |
| Panel pokazuje "No agents detected" | Agenci jeszcze nie zapisali do pamięci | Poczekaj na start agentów lub zweryfikuj ID sesji |
| Automatyczne wykrywanie wyzwala błędny workflow | Niejednoznaczność słów kluczowych | Użyj jawnej `/komendy` zamiast języka naturalnego |
| Trwały workflow nie zatrzymuje się | Plik stanu nadal istnieje | Powiedz "workflow done" lub ręcznie usuń plik stanu z `.agents/state/` |
| Agent zablokowany na HIGH clarification | Wymagania zbyt niejednoznaczne | Podaj konkretne odpowiedzi lub uruchom `/brainstorm` |

---

Więcej wzorców zadań jednodomenowych w [Przewodniku pojedynczej umiejętności](./single-skill).
Szczegóły integracji z projektem w [Przewodniku integracji](./integration).
