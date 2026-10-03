---
title: "Przewodnik: projekty wieloagentowe"
sidebar_label: Projekty wieloagentowe
description: Kompletny przewodnik koordynowania wielu agentów domenowych w obszarach frontendu, backendu, baz danych, urządzeń mobilnych i QA — od planowania po scalanie.
---

# Przewodnik: projekty wieloagentowe

## Kiedy używać koordynacji wieloagentowej

Funkcja obejmuje wiele domen: backendowe API + frontendowy interfejs użytkownika + schemat bazy danych + klient mobilny + przegląd QA. Jeden agent nie może obsłużyć pełnego zakresu, a domeny muszą rozwijać się równolegle bez nadpisywania swoich plików.

Koordynacja wieloagentowa jest właściwym wyborem, gdy:

- Zadanie obejmuje co najmniej 2 domeny (frontend, backend, mobile, db, QA, debug, pm).
- Między domenami istnieją kontrakty API (np. endpoint REST używany zarówno przez aplikację webową, jak i mobilną).
- Chcesz wykonywać pracę równolegle, aby skrócić czas rzeczywisty.
- Potrzebujesz przeglądu QA po implementacji we wszystkich domenach.

Jeśli zadanie w całości mieści się w jednej domenie, użyj bezpośrednio wyspecjalizowanego agenta.

---

## Pełna sekwencja: od /plan do /review

Zalecany workflow wieloagentowy przebiega według ścisłego czteroetapowego potoku.

### Krok 1: /plan — wymagania i podział zadań

Workflow `/plan` działa inline (bez uruchamiania subagentów) i tworzy ustrukturyzowany plan.

```
/plan
```

Co się dzieje:

1. **Zebranie wymagań**: agent PM pyta o użytkowników docelowych, główne funkcje, ograniczenia i środowiska wdrożeniowe.
2. **Analiza wykonalności technicznej**: korzysta ze skonfigurowanego dostawcy inteligencji kodu, aby przeanalizować istniejącą bazę kodu pod kątem kodu do ponownego użycia i wzorców architektonicznych. Natywne wyszukiwanie służy wyłącznie do ścieżek spoza projektu lub ścieżek ignorowanych.
3. **Definicja kontraktów API**: projektuje kontrakty endpointów (metoda, ścieżka, schematy żądania/odpowiedzi, uwierzytelnianie, odpowiedzi błędów) i zapisuje je w `.agents/results/api-contracts/` (artefakty uruchomienia), a trwałe specyfikacje przenosi do `docs/plans/contracts/`, gdy są zatwierdzane.
4. **Podział na zadania**: rozbija projekt na zadania możliwe do wykonania, z przypisanym agentem, tytułem, kryteriami akceptacji, priorytetem (P0–P3) i zależnościami.
5. **Przegląd planu z użytkownikiem**: przedstawia pełny plan do zatwierdzenia. Workflow nie przejdzie dalej bez wyraźnej zgody użytkownika.
6. **Zapisanie planu**: zapisuje zatwierdzony plan w `.agents/results/plan-{sessionId}.json` i rejestruje podsumowanie w pamięci.

Wynik `.agents/results/plan-{sessionId}.json` jest wejściem zarówno dla `/work`, jak i `/orchestrate`.

### Krok 2: /work lub /orchestrate — wykonanie

Masz dwie ścieżki wykonania:

| Aspekt | /work | /orchestrate |
|:-------|:-----------|:-------------|
| **Interakcja** | Interaktywna (użytkownik potwierdza każdy etap) | Automatyczna (działa do ukończenia) |
| **Planowanie PM** | Wbudowane (Krok 2 uruchamia agenta PM) | Wczytuje plan, jeśli istnieje; gdy go nie ma, tworzy go inline |
| **Punkt kontrolny użytkownika** | Po przeglądzie planu (Krok 3) | Plan inline przechodzi przez bramkę przeglądu przed rozdzieleniem zadań |
| **Tryb trwały** | Tak (nie można go zakończyć przed ukończeniem) | Tak (nie można go zakończyć przed ukończeniem) |
| **Najlepsze zastosowanie** | Pierwsze użycie, złożone projekty wymagające nadzoru | Powtarzane uruchomienia, dobrze zdefiniowane zadania |

#### /work: interaktywny potok wieloagentowy

```
/work
```

1. Analizuje żądanie użytkownika i wykrywa zaangażowane domeny.
2. Uruchamia agenta PM do podziału zadań (tworzy plan-\{sessionId\}.json).
3. Przedstawia plan do zatwierdzenia przez użytkownika. **Wstrzymuje się do czasu potwierdzenia.**
4. Uruchamia agentów według poziomu priorytetu (najpierw P0, potem P1 itd.), przy czym zadania o tym samym priorytecie działają równolegle.
5. Monitoruje postęp agentów za pomocą plików pamięci.
6. Uruchamia przegląd agenta QA dla wszystkich rezultatów (OWASP Top 10, wydajność, dostępność, jakość kodu).
7. Jeśli QA znajdzie problemy CRITICAL lub HIGH, ponownie uruchamia odpowiedzialnego agenta z ustaleniami QA. Powtarza to maksymalnie 2 razy dla każdego problemu. Jeśli ten sam problem pozostaje, aktywuje **pętlę eksploracji**: generuje 2–3 alternatywne podejścia, uruchamia ten sam typ agenta z innymi hipotezami w oddzielnych workspace’ach, QA ocenia każde podejście, a najlepszy wynik zostaje przyjęty.

#### /orchestrate: automatyczne wykonanie równoległe

```
/orchestrate
```

1. Wczytuje `.agents/results/plan-{sessionId}.json`, a gdy nie ma użytecznego planu, tworzy plan inline przez `/plan`.
2. Inicjalizuje sesję z identyfikatorem w formacie `session-YYYYMMDD-HHMMSS`.
3. Tworzy `orchestrator-session.md` i `task-board.md` w katalogu pamięci.
4. Uruchamia agentów według poziomu priorytetu, przekazując każdemu: opis zadania, kontrakty API i kontekst.
5. Monitoruje postęp, odpytując pliki `progress-{agent}.md`.
6. Weryfikuje każdego ukończonego agenta za pomocą `verify.sh`. PASS (kod wyjścia 0) akceptuje wynik; FAIL (kod wyjścia 1) uruchamia agenta ponownie z kontekstem błędu (maksymalnie 2 ponowienia); trwała porażka uruchamia pętlę eksploracji.
7. Zbiera wszystkie pliki `result-{agent}.md` i kompiluje raport końcowy.

### Krok 3: agent spawn — zarządzanie agentami na poziomie CLI

Polecenie `agent spawn` jest niskopoziomowym mechanizmem, który workflowy wywołują wewnętrznie. Możesz też użyć go bezpośrednio:

```bash
oma agent spawn backend "Implement user auth API with JWT" session-20260324-143000 -w ./api
```

**Wszystkie flagi:**

| Flaga | Opis |
|:-----|:-----------|
| `--vendor <vendor>` | Nadpisanie dostawcy CLI (antigravity/claude/codex/cursor/opencode/qwen/grok/pi). Nadpisuje rozstrzyganie modelu dla tego uruchomienia. |
| `-w, --workspace <path>` | Katalog roboczy agenta. Jeśli go pominięto, jest wykrywany automatycznie z konfiguracji monorepo. |
| `--task-id <id>` | Wiąże uruchomienie z zadaniem w planie sesji; domyślnie używa identyfikatora agenta. |
| `--isolation worktree` | Tworzy git worktree dla uruchomienia; domyślnie nie ma dodatkowej izolacji. |
| `--read-only` | Ogranicza dziecko do narzędzi inspekcji i wyłącza flagi automatycznej akceptacji. |

**Kolejność rozstrzygania dostawcy** (wygrywa pierwsze dopasowanie):

1. Flaga `--vendor` w wierszu polecenia
2. Nadpisanie `agents:` w `oma-config.yaml` dla tego agenta
3. Domyślne ustawienia agentów aktywnego `model_preset`

Szczegóły konfiguracji znajdziesz w [Modelach per agent](./per-agent-models.md).

**Automatyczne wykrywanie workspace** sprawdza konfiguracje monorepo w tej kolejności: pnpm-workspace.yaml, package.json workspaces, lerna.json, nx.json, turbo.json, mise.toml. Każdy katalog workspace jest oceniany względem słów kluczowych typu agenta (np. „web”, „frontend”, „client” dla agenta frontend). Jeśli nie znaleziono konfiguracji monorepo, mechanizm przechodzi do zakodowanych na stałe kandydatów, takich jak `apps/web`, `apps/frontend`, `frontend/` itd.

**Rozstrzyganie promptu:** argument `<prompt>` może być tekstem inline albo ścieżką do pliku. Jeśli ścieżka wskazuje istniejący plik, jego zawartość jest odczytywana i używana jako prompt. CLI wstrzykuje również protokoły wykonania zależne od dostawcy z `.agents/skills/_shared/runtime/execution-protocols/{vendor}.md`.

### Krok 4: /review — weryfikacja QA

```
/review
```

Workflow przeglądu uruchamia pełny potok QA:

1. **Określenie zakresu**: pyta, co ma zostać przejrzane (konkretne pliki, gałąź funkcji albo cały projekt).
2. **Zautomatyzowane kontrole bezpieczeństwa**: uruchamia `npm audit`, `bandit` lub odpowiednik.
3. **Ręczny przegląd OWASP Top 10**: wstrzykiwanie, złamane uwierzytelnianie, dane wrażliwe, kontrola dostępu, błędna konfiguracja, niebezpieczna deserializacja, podatne komponenty, niewystarczające logowanie.
4. **Analiza wydajności**: zapytania N+1, brakujące indeksy, nieograniczona paginacja, wycieki pamięci, zbędne ponowne renderowanie, rozmiary bundli.
5. **Dostępność**: WCAG 2.1 AA, w tym semantyczny HTML, ARIA, nawigacja klawiaturą, kontrast kolorów i zarządzanie fokusem.
6. **Jakość kodu**: nazewnictwo, obsługa błędów, pokrycie testami, tryb ścisły TypeScript, nieużywane importy, wzorce async/await.
7. **Raport**: ustalenia są kategoryzowane jako CRITICAL / HIGH / MEDIUM / LOW i zawierają `file:line`, opis oraz kod naprawczy.

Dla dużych zakresów workflow deleguje zadanie do subagenta QA. Z opcją `--fix` przechodzi do pętli naprawa–weryfikacja: uruchamia agentów domenowych, aby naprawili problemy CRITICAL/HIGH, ponownie wykonuje przegląd i powtarza go maksymalnie 3 razy.

---

## Strategia identyfikatora sesji

Każda sesja orkiestracji otrzymuje unikatowy identyfikator w formacie:

```
session-YYYYMMDD-HHMMSS
```

Przykład: `session-20260324-143052`

Identyfikator sesji służy do:

- nazywania plików pamięci (`orchestrator-session.md`, `task-board.md`)
- śledzenia procesów agentów za pomocą plików PID w katalogu tymczasowym systemu (`/tmp/subagent-{session-id}-{agent-id}.pid`)
- korelowania plików logów (`/tmp/subagent-{session-id}-{agent-id}.log`)
- grupowania wyników w `.agents/results/parallel-{timestamp}/`

Identyfikator sesji jest generowany w Kroku 2 `/orchestrate` i przekazywany wszystkim uruchomionym agentom. Dzięki temu wszystkie agenty, logi i pliki PID z jednego uruchomienia można prześledzić w ramach jednej sesji.

---

## Przydzielanie workspace według domeny

Każdy agent jest uruchamiany w izolowanym katalogu workspace, aby zapobiec konfliktom plików. Przydział opiera się na następujących zasadach:

### Automatyczne wykrywanie

Gdy pominięto `-w` (albo ustawiono `.`), CLI wykrywa najlepszy workspace w następujący sposób:

1. Skanuje pliki konfiguracji monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml).
2. Rozwija wzorce glob (np. `apps/*`) do rzeczywistych katalogów.
3. Ocenia każdy katalog względem słów kluczowych typu agenta:

| Typ agenta | Słowa kluczowe (w kolejności priorytetu) |
|:-----------|:----------------------------------------|
| frontend | web, frontend, client, ui, app, dashboard, admin, portal |
| backend | api, backend, server, service, gateway, core |
| mobile | mobile, ios, android, native, rn, expo |

4. Dokładne dopasowanie nazwy katalogu otrzymuje wynik 100, dopasowanie zawierające słowo kluczowe wynik 50, a dopasowanie w ścieżce wynik 25.
5. Wygrywa katalog z najwyższym wynikiem.

### Kandydaci awaryjni

Jeśli nie ma konfiguracji monorepo, CLI sprawdza zakodowane na stałe ścieżki w tej kolejności:

- **frontend:** `apps/web`, `apps/frontend`, `apps/client`, `packages/web`, `packages/frontend`, `frontend`, `web`, `client`
- **backend:** `apps/api`, `apps/backend`, `apps/server`, `packages/api`, `packages/backend`, `backend`, `api`, `server`
- **mobile:** `apps/mobile`, `apps/app`, `packages/mobile`, `mobile`, `app`

Jeśli nic nie pasuje, agent działa w bieżącym katalogu (`.`).

### Jawne nadpisanie

Zawsze dostępne:

```bash
oma agent spawn frontend "Build landing page" session-id -w ./packages/web-app
```

---

## Reguła contract-first

Kontrakty API są mechanizmem synchronizacji między agentami. Reguła contract-first oznacza, że:

1. **Kontrakty są definiowane przed rozpoczęciem implementacji.** Krok 3 workflow `/plan` tworzy kontrakty API i zapisuje je w `.agents/results/api-contracts/` (albo w `docs/plans/contracts/` dla trwałych specyfikacji).

2. **Każdy agent otrzymuje odpowiednie kontrakty jako kontekst.** Gdy `/orchestrate` uruchamia agentów w Kroku 3, każdy dostaje „opis zadania, kontrakty API i odpowiedni kontekst”.

3. **Kontrakty definiują granicę interfejsu.** Kontrakt określa:
   - metodę HTTP i ścieżkę
   - schemat ciała żądania (z typami)
   - schemat ciała odpowiedzi (z typami)
   - wymagania uwierzytelniania
   - formaty odpowiedzi błędów

4. **Naruszenia kontraktów są wykrywane podczas monitorowania.** Krok 5 `/work` korzysta ze skonfigurowanego dostawcy inteligencji kodu, aby zweryfikować zgodność API między agentami. Natywne wyszukiwanie służy wyłącznie do ścieżek spoza projektu lub ścieżek ignorowanych.

5. **Przegląd QA sprawdza zgodność z kontraktami.** Przegląd Alignment Review agenta QA (Krok 6 w ultrawork) jawnie porównuje implementację z planem, w tym z kontraktami API.

Bez kontraktów agent backend może zwrócić `{ "user_id": 1 }`, podczas gdy agent frontend konsumuje `{ "userId": 1 }`. Reguła contract-first zapobiega tej klasie błędów integracji.

---

## Bramki scalania: 4 warunki

Przed uznaniem pracy wieloagentowej za ukończoną muszą zostać spełnione cztery warunki:

### 1. Zadeklarowane kontrole zakończone pomyślnie

Każde kryterium akceptacji ma odpowiednią kontrolę, a kontrole zadeklarowane w planie przechodzą. Build jest uwzględniany tylko wtedy, gdy wymaga go bramka projektu; kontrakt wyników zapisuje rzeczywiste argv i kod wyjścia.

### 2. Testy przechodzą

Wszystkie istniejące testy nadal przechodzą, a nowe testy pokrywają funkcjonalność. Agent QA sprawdza pokrycie testami w ramach przeglądu jakości kodu.

### 3. Zmieniono tylko zaplanowane pliki

Agenci nie mogą modyfikować plików poza przydzielonym zakresem. Krok weryfikacji sprawdza, czy zmieniono wyłącznie pliki związane z zadaniem agenta. Zapobiega to niezamierzonym skutkom ubocznym we współdzielonym kodzie.

### 4. Przegląd QA jest czysty

Po przeglądzie agenta QA nie pozostają ustalenia CRITICAL ani HIGH. Ustalenia MEDIUM i LOW można udokumentować na przyszłe sprinty, ale blokery muszą zostać usunięte.

W workflow ultrawork odpowiadają temu jawne **bramki faz** (PLAN_GATE, IMPL_GATE, VERIFY_GATE, REFINE_GATE, SHIP_GATE) z kryteriami w formie pól wyboru, które wszystkie muszą przejść przed dalszym działaniem.

---

## Przykłady uruchamiania

### Pojedynczy agent

```bash
# Spawn backend agent with Gemini (default)
oma agent spawn backend "Implement /api/users CRUD endpoint per API contract" session-20260324-143000

# Spawn frontend agent with Claude, explicit workspace
oma agent spawn frontend "Build user dashboard with React" session-20260324-143000 --vendor claude -w ./apps/web

# Spawn from a prompt file
oma agent spawn backend ./prompts/auth-api.md session-20260324-143000 -w ./api
```

### Wykonanie równoległe przez agent parallel

Za pomocą pliku z zadaniami YAML:

```yaml
# tasks.yaml
tasks:
  - agent: backend
    task: "Implement user authentication API with JWT tokens"
    workspace: ./api
  - agent: frontend
    task: "Build login page and auth flow UI"
    workspace: ./web
  - agent: mobile
    task: "Implement mobile auth screens with biometric support"
    workspace: ./mobile
```

```bash
oma agent parallel tasks.yaml
```

W trybie inline:

```bash
oma agent parallel --inline \
  "backend:Implement user auth API:./api" \
  "frontend:Build login page:./web" \
  "mobile:Implement auth screens:./mobile"
```

Tryb w tle (bez oczekiwania):

```bash
oma agent parallel tasks.yaml --no-wait
# Returns immediately, results written to .agents/results/parallel-{timestamp}/
```

Z nadpisaniem dostawcy:

```bash
oma agent parallel tasks.yaml --vendor claude
```

---

## Antywzorce, których należy unikać

### 1. Mechaniczne zatwierdzanie planu

`/orchestrate` może utworzyć plan przez `/plan` inline, gdy nie istnieje użyteczny plik planu. Plan inline nadal przechodzi przez bramkę przeglądu `/plan`, a rozdzielenie zadań w następnym kroku korzysta z zatwierdzonego podziału. Przy dużej pracy obejmującej wiele domen uruchom `/plan` z wyprzedzeniem, aby mieć trwały rejestr w `docs/plans/work/` i miejsce na dopracowanie podziału przed uruchomieniem agentów.

### 2. Nakładające się workspace’y

Przydzielanie dwóch agentów do tego samego katalogu workspace. Powoduje konflikty plików, w których zmiany jednego agenta nadpisują zmiany drugiego. Zawsze używaj oddzielnych katalogów workspace.

### 3. Brak kontraktów API

Uruchamianie agentów backendu i frontendu bez wcześniejszego zdefiniowania kontraktów. Agenci przyjmą niezgodne założenia dotyczące formatów danych, nazw pól i obsługi błędów.

### 4. Ignorowanie ustaleń QA

Traktowanie przeglądu QA jako opcjonalnego. Ustalenia CRITICAL i HIGH oznaczają rzeczywiste błędy, które pojawią się na produkcji. Workflow wymusza usuwanie blokerów przez powtarzanie pętli do ich zniknięcia.

### 5. Ręczna koordynacja plików

Ręczne scalanie wyników agentów zamiast przekazania integracji potokowi weryfikacji i QA. Zautomatyzowany potok wychwytuje problemy pomijane podczas ręcznego przeglądu.

### 6. Nadmierna równoległość

Uruchamianie zadań P1 przed zakończeniem zadań P0. Zadania P1 często zależą od rezultatów P0, dlatego istnieją poziomy priorytetu. Workflow automatycznie wymusza kolejność poziomów.

### 7. Pomijanie weryfikacji

Bezpośrednie używanie `agent spawn` bez zapisania kontraktu wyniku. Uruchom przypięte kontrole zadania i zakończ pracę ustrukturyzowanym zgłoszeniem; zobacz [Wyniki agentów i wznawianie](/docs/guide/agent-results-and-resume). Krok weryfikacji workflowu wychwytuje następnie nieudane kontrole i rozbieżności zakresu, zanim wyniki zostaną ponownie użyte.

---

## Weryfikacja integracji między domenami

Po ukończeniu indywidualnych zadań przez wszystkich agentów trzeba zweryfikować integrację między domenami:

1. **Zgodność kontraktów API**: skonfigurowany dostawca inteligencji kodu sprawdza, czy implementacje backendu odpowiadają kontraktom używanym przez frontend i mobile. Natywne wyszukiwanie służy wyłącznie do ścieżek spoza projektu lub ścieżek ignorowanych.

2. **Spójność typów**: typy TypeScript, dataclasses Pythona albo modele Dart współdzielone między domenami muszą używać spójnych nazw pól i typów.

3. **Przepływ uwierzytelniania**: jeśli backend implementuje uwierzytelnianie JWT, frontend musi poprawnie wysyłać tokeny w nagłówkach, a aplikacja mobilna musi je przechowywać i odpowiednio odświeżać.

4. **Obsługa błędów**: wszyscy konsumenci API muszą obsługiwać udokumentowane odpowiedzi błędów. Jeśli backend zwraca `{ "error": "unauthorized", "code": 401 }`, wszystkie klienty muszą obsługiwać ten format.

5. **Zgodność schematu bazy danych**: jeśli agent bazy danych tworzy migracje, modele ORM backendu muszą dokładnie odpowiadać schematowi.

Przegląd Alignment Review agenta QA (Krok 6 w ultrawork, Krok 6 w work) systematycznie wykonuje tę walidację między domenami.

---

## Kiedy jest gotowe

Projekt wieloagentowy jest ukończony, gdy:

- Wszyscy agenci na wszystkich poziomach priorytetu ukończyli pracę pomyślnie.
- Skrypty weryfikacji przechodzą dla każdego agenta (kod wyjścia 0).
- Przegląd QA wykazuje zero ustaleń CRITICAL i zero HIGH.
- Potwierdzono zgodność kontraktów API między domenami.
- Build kończy się pomyślnie i wszystkie testy przechodzą.
- Raport końcowy został zapisany w pamięci i przedstawiony użytkownikowi.
- Użytkownik wyraził końcową zgodę (w `/work` i w bramce SHIP_GATE workflowu ultrawork).
