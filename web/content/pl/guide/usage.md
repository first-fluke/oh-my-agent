---
title: Przewodnik użytkowania
description: Kompletny przewodnik użytkowania z przykładami, przepływami pracy, obsługą dashboardu i rozwiązywaniem problemów.
---

# Jak używać umiejętności Multi-Agent Antigravity

## Szybki start

1. **Otwórz w Antigravity IDE**
   ```bash
   antigravity open /path/to/oh-my-agent
   ```

2. **Umiejętności są wykrywane automatycznie.** Antigravity skanuje `.agents/skills/` i indeksuje wszystkie dostępne umiejętności.

3. **Rozmawiaj w IDE.** Opisz co chcesz zbudować.

---

## Przykłady użycia

### Przykład 1: Proste zadanie jednodomeno we

**Wpisujesz:**
```
"Utwórz komponent formularza logowania z polami email i hasło używając Tailwind CSS"
```

**Co się dzieje:**
- Wywołujesz `oma-frontend` przez /command lub pole skills agenta
- Umiejętność ładuje się na żądanie (Progresywne ujawnianie)
- Otrzymujesz komponent React z TypeScript, Tailwind, walidacją formularza

### Przykład 2: Złożony projekt wielodomenowy

**Wpisujesz:**
```
"Zbuduj aplikację TODO z uwierzytelnianiem użytkownika"
```

**Co się dzieje:**

1. **Workflow Guide aktywuje się** — wykrywa złożoność wielodomenową
2. **PM Agent planuje** — tworzy podział zadań z priorytetami
3. **Uruchamiasz agentów przez CLI**:
   ```bash
   oma agent:spawn backend "API uwierzytelniania JWT" session-01 &
   oma agent:spawn frontend "UI logowania i TODO" session-01 &
   wait
   ```
4. **Agenci pracują równolegle** — zapisują wyniki do bazy wiedzy
5. **Ty koordynujesz** — przeglądasz `.agents/results/` pod kątem spójności
6. **QA Agent przegląda** — audyt bezpieczeństwa/wydajności
7. **Napraw i iteruj** — ponownie uruchom agentów z poprawkami

### Przykład 3: Naprawianie błędów

**Wpisujesz:**
```
"Jest błąd — kliknięcie logowania pokazuje 'Cannot read property map of undefined'"
```

**Co się dzieje:**

1. **oma-debug aktywuje się** — analizuje błąd
2. **Znaleziona przyczyna źródłowa** — komponent mapuje `todos` zanim dane się załadują
3. **Dostarczono poprawkę** — dodane stany ładowania i kontrole null
4. **Napisany test regresji** — zapewnia że błąd się nie powtórzy
5. **Znalezione podobne wzorce** — proaktywnie naprawia 3 inne komponenty

### Przykład: Tworzenie systemu projektowego

**Wpisujesz:**
```
"Zaprojektuj ciemną, premium stronę docelową dla mojego produktu SaaS"
```

**Co się dzieje:**

1. **oma-design się aktywuje** — sprawdza `.design-context.md`
2. **Kontekst zebrany** — pyta o grupę docelową, markę, kierunek estetyczny
3. **Prompt ulepszony** — niejasne żądanie zamienione w specyfikację sekcja po sekcji
4. **Zaproponowane 2-3 kierunki** — opcje kolorów, typografii, układu, animacji
5. **DESIGN.md wygenerowany** — 6-sekcyjny system projektowy + tokeny
6. **Audyt przeprowadzony** — responsywność, WCAG, heurystyki Nielsena, kontrola AI slop
7. **Przekazanie** — gotowe do implementacji z oma-frontend

### Przykład 4: Równoległe wykonywanie oparte na CLI

```bash
# Pojedynczy agent (workspace wykrywany automatycznie)
oma agent:spawn backend "Implementuj API uwierzytelniania JWT" session-01

# Równoległe agenty
oma agent:spawn backend "Implementuj API uwierzytelniania" session-01 &
oma agent:spawn frontend "Utwórz formularz logowania" session-01 &
oma agent:spawn mobile "Zbuduj ekrany uwierzytelniania" session-01 &
wait
```

**Monitoruj w czasie rzeczywistym:**
```bash
# Terminal (oddzielne okno terminala)
bunx oh-my-agent dashboard

# Lub przeglądarka
bunx oh-my-agent dashboard:web
# → http://localhost:9847
```

---

## Dashboardy w czasie rzeczywistym

### Dashboard terminalowy

```bash
bunx oh-my-agent dashboard
```

Obserwuje `.serena/memories/` używając `fswatch` (macOS) lub `inotifywait` (Linux). Wyświetla tabelę na żywo ze statusem sesji, stanami agentów, turami i najnowszą aktywnością. Aktualizuje się automatycznie gdy zmieniają się pliki pamięci.

**Wymagania:**
- macOS: `brew install fswatch`
- Linux: `apt install inotify-tools`

### Dashboard webowy

```bash
npm install          # tylko za pierwszym razem
bunx oh-my-agent dashboard:web
```

Otwórz `http://localhost:9847` w przeglądarce. Funkcje:

- **Aktualizacje w czasie rzeczywistym** przez WebSocket (sterowane zdarzeniami, nie odpytywanie)
- **Auto-ponowne łączenie** jeśli połączenie zostanie przerwane
- **UI w stylu Serena** z fioletowymi kolorami akcentu
- **Status sesji** — ID i stan uruchomiony/ukończony/nieudany
- **Tabela agentów** — nazwa, status (z kolorowymi kropkami), liczba tur, opis zadania
- **Dziennik aktywności** — najnowsze zmiany z plików postępu i wyników

Serwer obserwuje `.serena/memories/` używając chokidar z debounce (100ms). Tylko zmienione pliki wyzwalają odczyty — bez pełnego ponownego skanowania.

---

## Kluczowe koncepcje

### Progresywne ujawnianie
Umiejętności są wywoływane jawnie przez /command lub ładowane przez pole skills agenta. Tylko potrzebna umiejętność ładuje się do kontekstu.

### Projekt umiejętności zoptymalizowany tokenowo
Każda umiejętność wykorzystuje dwuwarstwową architekturę dla maksymalnej efektywności tokenowej:
- **SKILL.md** (~40 linii): Tożsamość, routing, podstawowe zasady — ładowane natychmiast
- **resources/**: Protokoły wykonania, przykłady, listy kontrolne, podręczniki błędów — ładowane na żądanie

Współdzielone zasoby znajdują się w `_shared/` (nie jest to umiejętność) i są odwoływane przez wszystkich agentów:
- Protokoły wykonania chain-of-thought z 4-etapowym przepływem pracy
- Przykłady few-shot wejście/wyjście dla wskazówek modeli średniego poziomu
- Podręczniki odzyskiwania po błędach z eskalacją "3 strikes"
- Szablony rozumowania dla ustrukturyzowanej analizy wieloetapowej
- Zarządzanie budżetem kontekstu dla poziomów modeli Flash/Pro
- Automatyczna weryfikacja przez `verify.sh`
- Akumulacja nauk z wielu sesji

### Uruchamianie agentów przez CLI
Użyj `oma agent:spawn` aby uruchamiać agentów przez CLI. Respektuje `agent_cli_mapping` w `user-preferences.yaml` aby wybrać odpowiednie CLI (gemini, claude, codex, qwen) dla typu agenta. Workspace jest wykrywany automatycznie z typowych konwencji monorepo lub może być ustawiony jawnie z `-w`.

### Baza wiedzy
Wyniki agentów przechowywane w `.agents/results/`. Zawiera plany, kod, raporty i notatki koordynacyjne.

### Pamięć Serena
Ustrukturyzowany stan runtime w `.serena/memories/`. Orchestrator zapisuje informacje o sesji, tablice zadań, postęp dla poszczególnych agentów i wyniki. Dashboardy obserwują te pliki do monitorowania.

### Przestrzenie robocze
Agenci mogą pracować w oddzielnych katalogach aby uniknąć konfliktów. Workspace jest wykrywany automatycznie z typowych konwencji monorepo:
```
./apps/api   or ./backend   → Workspace Backend Agent
./apps/web   or ./frontend  → Workspace Frontend Agent
./apps/mobile or ./mobile   → Workspace Mobile Agent
```

---

## Dostępne umiejętności

| Umiejętność | Przypadek użycia | Wynik |
|-------|-------------------|--------|
| oma-coordination | Złożonych projektów wielodomenowych | Koordynacja agentów krok po kroku |
| oma-pm | "zaplanuj to", "rozbij" | `.agents/plan.json` |
| oma-frontend | UI, komponenty, stylizacja | Komponenty React, testy |
| oma-backend | API, bazy danych, uwierzytelnianie | Endpointy API, modele, testy |
| oma-mobile | Aplikacje mobilne, iOS/Android | Ekrany Flutter, zarządzanie stanem |
| oma-brainstorm | Ideacja, eksploracja koncepcji | Dokument projektowy |
| oma-db | Baza danych, schemat, ERD, migracja | Projektowanie schematów, optymalizacja zapytań |
| oma-dev-workflow | CI/CD, git hooks, konfiguracja monorepo | Konfiguracje przepływu, automatyzacja |
| oma-tf-infra | Terraform, infrastruktura chmurowa | Moduły IaC, zarządzanie stanem |
| oma-translator | Tłumaczenie, treści wielojęzyczne | Przetłumaczony tekst z zachowaniem tonu |
| oma-qa | "sprawdź bezpieczeństwo", "audyt" | Raport QA z priorytetowymi poprawkami |
| oma-debug | Raporty błędów, komunikaty o błędach | Naprawiony kod, testy regresji |
| oma-orchestrator | Wykonywanie pod-agentów przez CLI | Wyniki w `.agents/results/` |
| oma-commit | "commit", "zapisz zmiany" | Commity Git (auto-podział według funkcji) |

---

## Polecenia przepływów pracy

Wpisz te w czacie Antigravity IDE aby wyzwolić przepływy pracy krok po kroku:

| Polecenie | Opis |
|---------|-------------|
| `/brainstorm` | Ideacja i eksploracja koncepcji z priorytetem projektowania |
| `/coordinate` | Orkiestracja multi-agentowa przez CLI z wskazówkami krok po kroku |
| `/deepinit` | Głęboka inicjalizacja projektu z hierarchiczną strukturą AGENTS.md |
| `/exec-plan` | Zarządzanie i wykonywanie istniejącego planu zadań |
| `/orchestrate` | Automatyczne równoległe wykonywanie agentów przez CLI |
| `/plan` | Dekompozycja zadań PM z kontraktami API |
| `/review` | Pełny pipeline QA (bezpieczeństwo, wydajność, dostępność, jakość kodu) |
| `/debug` | Strukturalne naprawianie błędów (odtwórz → zdiagnozuj → napraw → test regresji) |
| `/setup` | Konfiguracja CLI i MCP dla środowiska deweloperskiego |
| `/tools` | Zarządzanie narzędziami MCP i ich konfiguracją |
| `/ultrawork` | Maksymalna równoległość z bramkami fazowymi dla złożonych zadań |
| `/stack-set` | Ustawienie stosu językowego backendu oma-backend (Python, Node.js, Rust) |

Są to oddzielne od **umiejętności** (wywoływanych przez /command lub pole skills agenta). Przepływy pracy dają Ci jawną kontrolę nad procesami wieloetapowymi.

---

## Typowe przepływy pracy

### Przepływ pracy A: Pojedyncza umiejętność

```
Ty: "Utwórz komponent przycisku"
  → Antigravity ładuje oma-frontend
  → Otrzymujesz komponent natychmiast
```

### Przepływ pracy B: Projekt multi-agentowy (Auto)

```
Ty: "Zbuduj aplikację TODO z uwierzytelnianiem"
  → użyj /coordinate aby uruchomić oma-coordination
  → PM Agent tworzy plan
  → Uruchamiasz agentów przez CLI (oma agent:spawn)
  → Agenci pracują równolegle
  → QA Agent przegląda
  → Naprawiaj problemy, iteruj
```

### Przepływ pracy B-2: Projekt multi-agentowy (Jawny)

```
Ty: /coordinate
  → Przepływ pracy krok po kroku z przewodnikiem
  → Planowanie PM → przegląd planu → uruchamianie agentów → monitorowanie → przegląd QA
```

### Przepływ pracy C: Naprawianie błędów

```
Ty: "Przycisk logowania rzuca TypeError"
  → oma-debug aktywuje się
  → Analiza przyczyny źródłowej
  → Poprawka + test regresji
  → Sprawdzone podobne wzorce
```

### Przepływ pracy D: Orkiestracja CLI z dashboardem

```
Terminal 1: bunx oh-my-agent dashboard:web
Terminal 2: oma agent:spawn backend "zadanie" session-01 &
            oma agent:spawn frontend "zadanie" session-01 &
Przeglądarka: http://localhost:9847 → status w czasie rzeczywistym
```

---

## Wskazówki

1. **Bądź konkretny** — "Zbuduj aplikację TODO z uwierzytelnianiem JWT, frontendem React, backendem Express" jest lepsze niż "zrób aplikację"
2. **Użyj uruchamiania przez CLI** dla projektów wielodomenowych — nie próbuj robić wszystkiego w jednym czacie
3. **Przeglądaj bazę wiedzy** — sprawdź `.agents/results/` pod kątem spójności API
4. **Iteruj z ponownymi uruchomieniami** — udoskonalaj instrukcje, nie zaczynaj od nowa
5. **Używaj dashboardów** — `bunx oh-my-agent dashboard` lub `bunx oh-my-agent dashboard:web` do monitorowania sesji orchestratora
6. **Oddzielne przestrzenie robocze** — przypisz każdemu agentowi własny katalog

---

## Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---------|----------|
| Umiejętności nie ładują się | `antigravity open .`, sprawdź `.agents/skills/`, zrestartuj IDE |
| CLI nie znalezione | Sprawdź `which gemini` / `which claude`, zainstaluj brakujące CLI |
| Niekompatybilne wyniki agentów | Przejrzyj oba w bazie wiedzy, uruchom ponownie z poprawkami |
| Dashboard: "No agents" | Pliki pamięci nie utworzone jeszcze, najpierw uruchom orchestrator |
| Dashboard webowy nie uruchamia się | Uruchom `npm install` aby zainstalować chokidar i ws |
| fswatch nie znaleziony | macOS: `brew install fswatch`, Linux: `apt install inotify-tools` |
| Raport QA ma 50+ problemów | Skup się najpierw na CRITICAL/HIGH, udokumentuj resztę na później |

---

## Polecenia CLI

```bash
bunx oh-my-agent                # Interaktywny instalator umiejętności
bunx oh-my-agent doctor         # Sprawdź konfigurację i napraw brakujące umiejętności
bunx oh-my-agent doctor --json  # Wyjście JSON dla CI/CD
bunx oh-my-agent update         # Zaktualizuj umiejętności do najnowszej wersji
bunx oh-my-agent stats          # Wyświetl metryki produktywności
bunx oh-my-agent stats --reset  # Resetuj metryki
bunx oh-my-agent retro          # Retrospektywa sesji (nauki i kolejne kroki)
bunx oh-my-agent dashboard      # Dashboard terminalowy w czasie rzeczywistym
bunx oh-my-agent dashboard:web  # Dashboard webowy (http://localhost:9847)
bunx oh-my-agent help           # Pokaż pomoc
```

---

## Dla deweloperów (Przewodnik integracji)

Jeśli chcesz zintegrować te umiejętności z istniejącym projektem Antigravity, zobacz [AGENT_GUIDE.md](../AGENT_GUIDE.md) dla:
- Szybka 3-etapowa integracja
- Pełna integracja dashboardu
- Dostosowywanie umiejętności do Twojego stosu technologicznego
- Rozwiązywanie problemów i najlepsze praktyki

---

**Po prostu rozmawiaj w Antigravity IDE.** Do monitorowania użyj dashboardów. Do wykonywania przez CLI użyj skryptów orchestratora. Aby zintegrować z istniejącym projektem, zobacz [AGENT_GUIDE.md](../AGENT_GUIDE.md).
