---
title: Wykonywanie równoległe
description: Kompletny przewodnik po jednoczesnym uruchamianiu wielu agentów oh-my-agent — składnia agent:spawn ze wszystkimi opcjami, tryb inline agent:parallel, wzorce z izolacją przestrzeni roboczej, konfiguracja wielu CLI, priorytet rozwiązywania dostawcy, monitoring za pomocą paneli kontrolnych, strategia ID sesji oraz anty-wzorce do unikania.
---

# Wykonywanie równoległe

Główną zaletą oh-my-agent jest jednoczesne uruchamianie wielu wyspecjalizowanych agentów. Podczas gdy agent backendowy implementuje API, agent frontendowy tworzy interfejs użytkownika, a agent mobilny buduje ekrany aplikacji — wszystko koordynowane przez współdzieloną pamięć.

---

## agent:spawn — uruchamianie pojedynczego agenta

### Podstawowa składnia

```bash
oma agent:spawn <agent-id> <prompt> <session-id> [opcje]
```

### Parametry

| Parametr | Wymagany | Opis |
|-----------|----------|-------------|
| `agent-id` | Tak | Identyfikator agenta: `backend`, `frontend`, `mobile`, `db`, `pm`, `qa`, `debug`, `design`, `tf-infra`, `dev-workflow`, `translator`, `orchestrator`, `commit` |
| `prompt` | Tak | Opis zadania (ciąg w cudzysłowach lub ścieżka do pliku promptu) |
| `session-id` | Tak | Grupuje agentów pracujących nad tą samą funkcjonalnością. Format: `session-YYYYMMDD-HHMMSS` lub dowolny unikalny ciąg. |
| `opcje` | Nie | Zobacz tabelę opcji poniżej |

### Opcje

| Flaga | Skrót | Opis |
|------|-------|-------------|
| `--workspace <ścieżka>` | `-w` | Katalog roboczy dla agenta. Agenci modyfikują pliki tylko w tym katalogu. |
| `--model <nazwa>` | `-m` | Nadpisanie dostawcy CLI dla tego konkretnego uruchomienia. Opcje: `gemini`, `claude`, `codex`, `qwen`. |
| `--max-turns <n>` | `-t` | Nadpisanie domyślnego limitu tur dla tego agenta. |
| `--json` | | Wyjście jako JSON (przydatne do skryptowania). |
| `--no-wait` | | Wystrzel i zapomnij — powróć natychmiast bez czekania na zakończenie. |

### Przykłady

```bash
# Uruchom agenta backend z domyślnym dostawcą
oma agent:spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Uruchom z izolacją przestrzeni roboczej
oma agent:spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Nadpisz dostawcę dla tego konkretnego agenta
oma agent:spawn frontend "Build login form" session-01 -m claude -w ./apps/web

# Ustaw wyższy limit tur dla złożonego zadania
oma agent:spawn backend "Implement payment gateway integration" session-01 -t 30

# Użyj pliku promptu zamiast tekstu inline
oma agent:spawn backend ./prompts/auth-api.md session-01 -w ./apps/api
```

---

## Równoległe uruchamianie z procesami w tle

Aby uruchomić wielu agentów jednocześnie, użyj procesów w tle w powłoce:

```bash
# Uruchom 3 agentów równolegle
oma agent:spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent:spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent:spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Blokuj do zakończenia wszystkich agentów
```

`&` uruchamia każdego agenta w tle. `wait` blokuje do zakończenia wszystkich procesów w tle.

### Wzorzec z izolacją przestrzeni roboczej

Zawsze przypisuj oddzielne przestrzenie robocze przy równoległym uruchamianiu agentów, aby zapobiec konfliktom plików:

```bash
# Równoległe wykonanie full-stack
oma agent:spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent:spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent:spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# Po implementacji, uruchom QA (sekwencyjnie — zależy od implementacji)
oma agent:spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel — tryb równoległy inline

Dla czystszej składni, która automatycznie zarządza procesami w tle:

### Składnia

```bash
oma agent:parallel -i <agent1>:<prompt1> <agent2>:<prompt2> [opcje]
```

### Przykłady

```bash
# Podstawowe wykonanie równoległe
oma agent:parallel -i backend:"Implement auth API" frontend:"Build login form" mobile:"Auth screens"

# Z no-wait (wystrzel i zapomnij)
oma agent:parallel -i backend:"Auth API" frontend:"Login form" --no-wait

# Wszystkie agenci automatycznie dzielą tę samą sesję
oma agent:parallel -i \
  backend:"JWT auth with refresh tokens" \
  frontend:"Login form with email validation" \
  db:"User schema with soft delete and audit trail"
```

Flaga `-i` (inline) pozwala określić pary agent-prompt bezpośrednio w poleceniu.

---

## Konfiguracja wielu CLI

Nie wszystkie CLI AI działają jednakowo dobrze we wszystkich domenach. oh-my-agent pozwala kierować agentów do CLI, które najlepiej obsługuje ich domenę.

### Pełny przykład konfiguracji

```yaml
# .agents/oma-config.yaml

# Język odpowiedzi
language: en

# Format daty dla raportów
date_format: "YYYY-MM-DD"

# Strefa czasowa dla znaczników czasu
timezone: "Asia/Seoul"

# Domyślne CLI (używane gdy brak mapowania per agent)
default_cli: gemini

# Routing CLI per agent
agent_cli_mapping:
  frontend: claude       # Złożone wnioskowanie UI, kompozycja komponentów
  backend: gemini        # Szybkie scaffolding API, generowanie CRUD
  mobile: gemini         # Szybkie generowanie kodu Flutter
  db: gemini             # Szybkie projektowanie schematu
  pm: gemini             # Szybka dekompozycja zadań
  qa: claude             # Dokładny przegląd bezpieczeństwa i dostępności
  debug: claude          # Głęboka analiza przyczyn źródłowych, śledzenie symboli
  design: claude         # Niuansowane decyzje projektowe, wykrywanie anty-wzorców
  tf-infra: gemini       # Generowanie HCL
  dev-workflow: gemini   # Konfiguracja menedżera zadań
  translator: claude     # Niuansowane tłumaczenie z wrażliwością kulturową
  orchestrator: gemini   # Szybka koordynacja
  commit: gemini         # Proste generowanie wiadomości commitów
```

### Priorytet rozwiązywania dostawcy

Gdy `oma agent:spawn` określa którego CLI użyć, podąża za tym priorytetem (najwyższy wygrywa):

| Priorytet | Źródło | Przykład |
|----------|--------|---------|
| 1 (najwyższy) | Flaga `--model` | `oma agent:spawn backend "task" session-01 -m claude` |
| 2 | `agent_cli_mapping` | `agent_cli_mapping.backend: gemini` w oma-config.yaml |
| 3 | `default_cli` | `default_cli: gemini` w oma-config.yaml |
| 4 | `active_vendor` | Stare ustawienie z `cli-config.yaml` |
| 5 (najniższy) | Zakodowany fallback | `gemini` |

Oznacza to, że flaga `--model` zawsze wygrywa. Jeśli flaga nie jest podana, system sprawdza mapowanie per agent, potem domyślne, potem starszą konfigurację, a na końcu fallback do Gemini.

---

## Metody uruchamiania specyficzne dla dostawcy

Mechanizm uruchamiania różni się w zależności od IDE/CLI:

| Dostawca | Jak agenci są uruchamiani | Obsługa wyników |
|--------|----------------------|-----------------|
| **Claude Code** | Narzędzie `Agent` z definicjami `.claude/agents/{nazwa}.md`. Wiele wywołań Agent w jednej wiadomości = prawdziwa równoległość. | Synchroniczny zwrot |
| **Codex CLI** | Równoległy subagent mediowany przez model | Wyjście JSON |
| **Gemini CLI** | Polecenie CLI `oh-my-ag agent:spawn` | Odpytywanie pamięci MCP |
| **Antigravity IDE** | Tylko `oh-my-ag agent:spawn` (niestandardowe subagenty niedostępne) | Odpytywanie pamięci MCP |
| **CLI Fallback** | `oh-my-ag agent:spawn {agent} {prompt} {session} -w {workspace}` | Odpytywanie pliku wyników |

Przy działaniu wewnątrz Claude Code, workflow używa bezpośrednio narzędzia `Agent`:
```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Wiele wywołań narzędzia Agent w jednej wiadomości wykonuje się jako prawdziwa równoległość — bez sekwencyjnego czekania.

---

## Monitoring agentów

### Panel w terminalu

```bash
oma dashboard
```

Wyświetla żywą tabelę z:
- ID sesji i ogólnym statusem
- Statusem per agent (running, completed, failed)
- Licznikami tur
- Najnowszą aktywnością z plików postępu
- Czasem upływu

Panel obserwuje `.serena/memories/` dla aktualizacji w czasie rzeczywistym. Odświeża się gdy agenci zapisują postęp.

### Panel webowy

```bash
oma dashboard:web
# Otwiera http://localhost:9847
```

Funkcje:
- Aktualizacje w czasie rzeczywistym przez WebSocket
- Automatyczne ponowne połączenie przy utracie połączenia
- Kolorowe wskaźniki statusu agentów
- Strumieniowanie logu aktywności z plików postępu i wyników
- Historia sesji

### Zalecany układ terminala

Użyj 3 terminali dla optymalnej widoczności:

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard         │   Polecenia          │
│   (monitoring na żywo)  │   uruchamiania       │
│                         │   agentów            │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Logi testów/buildu, operacje git             │
│                                                │
└────────────────────────────────────────────────┘
```

### Sprawdzanie statusu pojedynczego agenta

```bash
oma agent:status <session-id> <agent-id>
```

Zwraca bieżący status konkretnego agenta: running, completed lub failed, wraz z liczbą tur i ostatnią aktywnością.

---

## Strategia ID sesji

ID sesji grupują agentów pracujących nad tą samą funkcjonalnością. Najlepsze praktyki:

- **Jedna sesja na funkcjonalność:** Wszyscy agenci pracujący nad "uwierzytelnianiem użytkowników" dzielą `session-auth-01`
- **Format:** Używaj opisowych identyfikatorów: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Auto-generowane:** Orkiestrator generuje ID w formacie `session-YYYYMMDD-HHMMSS`
- **Wielokrotne użycie do iteracji:** Używaj tego samego ID sesji przy ponownym uruchamianiu agentów z udoskonaleniami

ID sesji określają:
- Jakie pliki pamięci agenci czytają i zapisują (`progress-{agent}.md`, `result-{agent}.md`)
- Co panel kontrolny monitoruje
- Jak wyniki są grupowane w raporcie końcowym

---

## Wskazówki do wykonywania równoległego

### Rób

1. **Najpierw zablokuj kontrakty API.** Uruchom `/plan` przed uruchomieniem agentów implementacyjnych, aby agenci frontend i backend uzgodnili endpointy, schematy żądań/odpowiedzi i formaty błędów.

2. **Używaj jednego ID sesji na funkcjonalność.** Utrzymuje to wyjścia agentów w grupach i monitoring panelu spójnym.

3. **Przypisuj oddzielne przestrzenie robocze.** Zawsze używaj `-w` do izolacji agentów:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   ```

4. **Aktywnie monitoruj.** Otwórz terminal z panelem aby wcześnie wychwycić problemy — nieudany agent marnuje tury jeśli nie zostanie szybko wykryty.

5. **QA uruchamiaj po implementacji.** Uruchom agenta QA sekwencyjnie po zakończeniu wszystkich agentów implementacyjnych:
   ```bash
   oma agent:spawn backend "task" session-01 -w ./apps/api &
   oma agent:spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent:spawn qa "Review all changes" session-01
   ```

6. **Iteruj przez ponowne uruchomienia.** Jeśli wyjście agenta wymaga udoskonalenia, uruchom go ponownie z oryginalnym zadaniem plus kontekstem korekty. Nie rozpoczynaj nowej sesji.

7. **Zacznij od `/work` jeśli nie masz pewności.** Workflow work prowadzi Cię krok po kroku z potwierdzeniem użytkownika przy każdej bramce.

### Nie rób

1. **Nie uruchamiaj agentów w tej samej przestrzeni roboczej.** Dwóch agentów piszących do tego samego katalogu stworzy konflikty merge i nadpisze pracę drugiego.

2. **Nie przekraczaj MAX_PARALLEL (domyślnie 3).** Więcej współbieżnych agentów nie zawsze oznacza szybsze wyniki. Każdy agent potrzebuje zasobów pamięci i CPU. Domyślne 3 jest zoptymalizowane dla większości systemów.

3. **Nie pomijaj kroku planowania.** Uruchamianie agentów bez planu prowadzi do niespójnych implementacji — frontend buduje pod jeden kształt API podczas gdy backend buduje inny.

4. **Nie ignoruj nieudanych agentów.** Praca nieudanego agenta jest niekompletna. Sprawdź `result-{agent}.md` po przyczynę niepowodzenia, napraw prompt i uruchom ponownie.

5. **Nie mieszaj ID sesji dla powiązanej pracy.** Jeśli agenci backend i frontend pracują nad tą samą funkcjonalnością, muszą dzielić ID sesji aby orkiestrator mógł ich koordynować.

---

## Przykład end-to-end

Kompletny workflow wykonywania równoległego dla budowy funkcjonalności uwierzytelniania użytkowników:

```bash
# Krok 1: Zaplanuj funkcjonalność
# (W IDE AI, uruchom /plan lub opisz funkcjonalność)
# To tworzy .agents/plan.json z rozkładem zadań

# Krok 2: Uruchom agentów implementacyjnych równolegle
oma agent:spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use bcrypt for password hashing. Follow the API contract in .agents/skills/_shared/core/api-contracts/" session-auth-01 -w ./apps/api &
oma agent:spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent:spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Krok 3: Monitoruj w oddzielnym terminalu
# Terminal 2:
oma dashboard

# Krok 4: Czekaj na wszystkich agentów implementacyjnych
wait

# Krok 5: Uruchom przegląd QA
oma agent:spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Krok 6: Jeśli QA znajdzie problemy, ponownie uruchom konkretnych agentów z poprawkami
oma agent:spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Krok 7: Ponownie uruchom QA aby zweryfikować poprawki
oma agent:spawn qa "Re-review backend auth after fixes." session-auth-01
```
