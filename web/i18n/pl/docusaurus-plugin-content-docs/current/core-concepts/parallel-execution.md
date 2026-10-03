---
title: Wykonywanie równoległe
description: Uruchamiaj równolegle wiele ról dispatchu OMA z bieżącą składnią CLI, plikami zadań, trybem inline, izolacją workspace'ów, rozstrzyganiem modeli i dostawców, monitorowaniem, identyfikatorami sesji oraz wzorcami odzyskiwania.
---

# Wykonywanie równoległe {#parallel-execution}

Główną zaletą oh-my-agent jest jednoczesne uruchamianie wielu wyspecjalizowanych agentów. Gdy agent backendu implementuje API, agent frontendu tworzy UI, a agent mobile buduje ekrany aplikacji, orkiestrator koordynuje je przez trwały stan uruchomienia i potwierdzenia.

---

## agent:spawn: uruchamianie pojedynczego agenta {#agentspawn-single-agent-spawning}

### Podstawowa składnia {#basic-syntax}

```bash
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

### Parametry {#parameters}

| Parametr | Wymagany | Opis |
|-----------|----------|-------------|
| `agent-id` | Tak | Kanoniczna rola dispatchu: `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` lub `explore` |
| `prompt` | Tak | Opis zadania (ciąg w cudzysłowie albo ścieżka do pliku promptu) |
| `session-id` | Tak | Grupuje agentów pracujących nad tą samą funkcją. Format: `session-YYYYMMDD-HHMMSS` albo dowolny unikatowy ciąg. |
| `options` | Nie | Zobacz tabelę opcji poniżej |

### Opcje {#options}

| Flaga | Skrót | Opis |
|------|-------|-------------|
| `--workspace <path>` | `-w` | Katalog roboczy agenta. Agent modyfikuje pliki tylko w tym katalogu. |
| `--vendor <vendor>` | | Nadpisuje dostawcę CLI dla tego uruchomienia (`antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` lub `pi`). |
| `--resumed-from <run-id>` |  | Łączy retry z poprzednim uruchomieniem opartym na dowodach. |
| `--fallback-vendors <vendors>` |  | Uporządkowane, rozdzielone przecinkami fallbacki dostawców, gdy główny dostawca nie może działać. |
| `--task-id <id>` |  | Wiąże uruchomienie z identyfikatorem zadania z planu sesji. |
| `--isolation <mode>` |  | `worktree` tworzy świeży git worktree w tymczasowym katalogu worktree OMA. Worktree pozostaje do przeglądu oraz scalenia lub odrzucenia. |
| `--read-only` |  | Ogranicza uruchomionego agenta do narzędzi niedestrukcyjnych. |

### Przykłady {#examples}

```bash
# Spawn a backend agent with default vendor
oma agent spawn backend "Implement JWT authentication API with refresh tokens" session-01

# Spawn with workspace isolation
oma agent spawn backend "Auth API + DB migration" session-01 -w ./apps/api

# Override the CLI vendor for this specific spawn
oma agent spawn frontend "Build login form" session-01 --vendor claude -w ./apps/web

# Retry a run while preserving its evidence chain
oma agent spawn backend "Fix the payment gateway issue" session-01 --resumed-from run-123

# Use a prompt file instead of inline text
oma agent spawn backend ./prompts/auth-api.md session-01 -w ./apps/api

# Run inside an isolated git worktree (hypothesis spawn pattern)
oma agent spawn backend "Try a Drizzle-based rewrite" session-01 --isolation worktree
```

---

## Równoległe uruchamianie z procesami w tle {#parallel-spawning-with-background-processes}

Aby uruchomić wielu agentów jednocześnie, użyj procesów powłoki działających w tle:

```bash
# Spawn 3 agents in parallel
oma agent spawn backend "Implement auth API" session-01 -w ./apps/api &
oma agent spawn frontend "Build login form" session-01 -w ./apps/web &
oma agent spawn mobile "Auth screens with biometrics" session-01 -w ./apps/mobile &
wait  # Block until all agents complete
```

Znak `&` uruchamia każdego agenta w tle. `wait` blokuje działanie do czasu zakończenia wszystkich procesów działających w tle.

### Wzorzec uwzględniający workspace {#workspace-aware-pattern}

Zawsze przydzielaj osobne workspace'y podczas równoległego uruchamiania, aby zapobiec konfliktom plików:

```bash
# Full-stack parallel execution
oma agent spawn backend "JWT auth + DB migration" session-02 -w ./apps/api &
oma agent spawn frontend "Login + token refresh + dashboard" session-02 -w ./apps/web &
oma agent spawn mobile "Auth screens + offline token storage" session-02 -w ./apps/mobile &
wait

# After implementation, run QA (sequential; depends on implementation)
oma agent spawn qa "Review all implementations for security and accessibility" session-02
```

---

## agent:parallel: tryb równoległy inline {#agentparallel-inline-parallel-mode}

Dla czytelniejszej składni, która automatycznie obsługuje zarządzanie procesami w tle:

### Składnia {#syntax}

```bash
oma agent parallel --inline "<agent1>:<prompt1>" "<agent2>:<prompt2>" [options]
```

### Przykłady {#examples-1}

```bash
# Basic parallel execution
oma agent parallel --inline \
  "backend:Implement auth API" \
  "frontend:Build login form" \
  "mobile:Auth screens"

# With no-wait (fire and forget)
oma agent parallel --inline "backend:Auth API" "frontend:Login form" --no-wait

# All agents share the same session automatically
oma agent parallel --inline \
  "backend:JWT auth with refresh tokens" \
  "frontend:Login form with email validation" \
  "db:User schema with soft delete and audit trail" \
  --session session-auth-01
```

Flaga `--inline` analizuje każdy argument `agent:task`. Dodaj trzecią ścieżkę rozdzieloną dwukropkami (`agent:task:workspace`), gdy zadanie potrzebuje konkretnego workspace'u. Bez `--inline` przekaż plik zadań YAML w formacie `{tasks: [{id?, agent, task, workspace?}]}`. `--session` wiąże wyniki równoległe z istniejącą sesją.

---

## Konfiguracja wielu CLI {#multi-cli-configuration}

oh-my-agent kieruje każdego agenta do odpowiedniego CLI przez `model_preset` w `.agents/oma-config.yaml`. Wybierz wbudowany preset dla używanego dostawcy i opcjonalnie nadpisz poszczególnych agentów.

### Przykład konfiguracji {#configuration-example}

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed   # mixed: Claude for coordination, Codex for implementation/explore

# Override specific agents on top of the preset
agents:
  frontend: { model: anthropic/claude-sonnet-4-6 }
  backend:  { model: openai/gpt-5.5, effort: high }
```

Wbudowane presety: `auto`, `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` i `mixed`. Szczegóły znajdziesz w [Modelach per agent](../guide/per-agent-models.md).

### Rozstrzyganie dostawcy {#vendor-resolution}

Gdy `oma agent spawn` ustala, którego CLI użyć:

| Priorytet | Źródło | Przykład |
|----------|-------|---------|
| 1 (najwyższy) | Flaga `--vendor` | `oma agent spawn backend "task" session-01 --vendor claude` |
| 2 | Nadpisanie `agents:` w `oma-config.yaml` | `agents: { backend: { model: openai/gpt-5.5 } }` |
| 3 | Domyślne wartości agenta aktywnego `model_preset` | wyszukiwanie presetu dla roli agenta |

Flaga `--vendor` zawsze wygrywa. Jeśli nie podano flagi, system sprawdza nadpisania `agents:`, następnie domyślne wartości presetu, a potem skonfigurowane CLI zapasowe. Przy `model_preset: auto` model dostarczają natywne ustawienia bieżącego runtime'u.

---

## Metody uruchamiania właściwe dla dostawcy {#vendor-specific-spawn-methods}

Mechanizm uruchamiania zależy od IDE/CLI:

| Dostawca | Sposób uruchamiania agentów | Obsługa wyników |
|--------|----------------------|-----------------|
| **Claude Code** | Zadania tego samego dostawcy używają narzędzia Agent z `.claude/agents/{name}.md`; zadania między dostawcami przechodzą do `oma agent spawn`. | Zwrót synchroniczny |
| **Codex CLI** | Zadania tego samego dostawcy używają natywnych agentów niestandardowych z `.codex/agents/{name}.toml`; zadania między dostawcami przechodzą do `oma agent spawn`. | Wyjście JSON |
| **Antigravity CLI/IDE** | `oma agent spawn` przez runtime `agy`; niestandardowi natywni subagenci nie są wymagani | Trwałe potwierdzenie i odpytywanie pliku wyniku |
| **Cursor** | Używa wygenerowanej integracji Cursor, jeśli jest dostępna; w przeciwnym razie `oma agent spawn` | Odpytywanie pliku wyniku |
| **OpenCode / pi** | Przy wybraniu korzysta z mostka rozszerzeń działającego w procesie; praca między dostawcami używa `oma agent spawn` | Odpytywanie pliku wyniku |
| **CLI Fallback** | `oma agent spawn {agent} {prompt} {session} -w {workspace}` | Odpytywanie wyniku opartego na dowodach |

Podczas pracy w Claude Code workflow korzysta bezpośrednio z narzędzia `Agent`:

```
Agent(subagent_type="backend-engineer", prompt="...", run_in_background=true)
Agent(subagent_type="frontend-engineer", prompt="...", run_in_background=true)
```

Wiele wywołań narzędzia Agent w tej samej wiadomości wykonuje się naprawdę równolegle, bez sekwencyjnego oczekiwania.

Ta sama reguła dispatchu dotyczy wszystkich dostawców:

1. Rozstrzygnij `target_vendor_for_agent` z `.agents/oma-config.yaml`
2. Jeśli pasuje do dostawcy bieżącego runtime'u, użyj natywnego pliku agenta tego dostawcy
3. Jeśli nie pasuje, użyj `oma agent spawn` tylko dla tego agenta

---

## Monitorowanie agentów {#monitoring-agents}

### Dashboard terminalowy {#terminal-dashboard}

```bash
oma dashboard terminal
```

Wyświetla na żywo tabelę z:
- ID sesji i ogólnym statusem
- statusem każdego agenta (running, completed, failed)
- liczbą tur
- ostatnią aktywnością z plików postępu
- upływem czasu

Dashboard obserwuje `.agents/state/memories/` i aktualizuje się w czasie rzeczywistym, gdy agenci zapisują postęp.

### Dashboard webowy {#web-dashboard}

```bash
oma dashboard web
# Opens http://localhost:9847
```

Funkcje:
- aktualizacje w czasie rzeczywistym przez WebSocket
- automatyczne ponowne łączenie po utracie połączenia
- kolorowe wskaźniki statusu agentów
- strumieniowanie dziennika aktywności z plików postępu i wyników
- historia sesji

### Zalecany układ terminali {#recommended-terminal-layout}

Użyj 3 terminali, aby uzyskać najlepszą widoczność:

```
┌─────────────────────────┬──────────────────────┐
│                         │                      │
│   Terminal 1:           │   Terminal 2:        │
│   oma dashboard terminal         │   Agent spawn        │
│   (live monitoring)     │   commands           │
│                         │                      │
├─────────────────────────┴──────────────────────┤
│                                                │
│   Terminal 3:                                  │
│   Test/build logs, git operations              │
│                                                │
└────────────────────────────────────────────────┘
```

### Sprawdzanie statusu pojedynczego agenta {#checking-individual-agent-status}

```bash
oma agent status <session-id> <agent-id>
```

Zwraca bieżący status określonego agenta: running, completed lub failed, a także liczbę tur i ostatnią aktywność.

---

## Strategia identyfikatorów sesji {#session-id-strategy}

Identyfikatory sesji grupują agentów pracujących nad tą samą funkcją. Dobre praktyki:

- **Jedna sesja na funkcję:** wszyscy agenci pracujący nad „user authentication” współdzielą `session-auth-01`
- **Format:** używaj opisowych ID: `session-auth-01`, `session-payment-v2`, `session-20260324-143000`
- **Generowanie automatyczne:** orkiestrator generuje ID w formacie `session-YYYYMMDD-HHMMSS`
- **Możliwość ponownego użycia w iteracji:** użyj tego samego ID sesji przy ponownym uruchamianiu agentów z poprawkami

Identyfikatory sesji określają:
- które pliki pamięci przypisane do uruchomienia agenci odczytują i zapisują (`progress-{agentId}-{taskId}-{runId}-{sessionId}.md`, `result-{agentId}-{taskId}-{runId}-{sessionId}.md`)
- co monitoruje dashboard
- jak wyniki są grupowane w raporcie końcowym

---

## Wskazówki dotyczące wykonywania równoległego {#tips-for-parallel-execution}

### Rób {#do}

1. **Najpierw zablokuj kontrakty API.** Uruchom `/plan` przed agentami implementacji, aby agenci frontendu i backendu uzgodnili endpointy, schematy żądań/odpowiedzi oraz formaty błędów.

2. **Używaj jednego ID sesji na funkcję.** Dzięki temu wyniki agentów są zgrupowane, a monitoring dashboardu pozostaje spójny.

3. **Przydziel osobne workspace'y.** Zawsze używaj `-w`, aby odizolować agentów:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   ```


4. **Aktywnie monitoruj.** Otwórz terminal dashboardu, aby wcześnie wychwytywać problemy. Agent, który zawiedzie, marnuje tury, jeśli nie zostanie szybko zauważony.

5. **Uruchom QA po implementacji.** Uruchom agenta QA sekwencyjnie, gdy wszyscy agenci implementacji zakończą pracę:
   ```bash
   oma agent spawn backend "task" session-01 -w ./apps/api &
   oma agent spawn frontend "task" session-01 -w ./apps/web &
   wait
   oma agent spawn qa "Review all changes" session-01
   ```

6. **Iteruj przez ponowne uruchomienia.** Jeśli wynik agenta wymaga dopracowania, uruchom go ponownie z pierwotnym zadaniem i kontekstem korekty. Nie rozpoczynaj nowej sesji.

7. **Zacznij od `/work`, jeśli nie masz pewności.** Workflow work prowadzi przez proces krok po kroku i wymaga potwierdzenia użytkownika na każdej bramce.

### Nie rób {#do-not}

1. **Nie uruchamiaj agentów w tym samym workspace.** Dwaj agenci zapisujący do tego samego katalogu utworzą konflikty scalania i nadpiszą sobie pracę.

2. **Nie przekraczaj MAX_PARALLEL (domyślnie 3).** Większa liczba równoległych agentów nie zawsze oznacza szybszą pracę. Domyślna wartość 3 jest dostrojona do większości systemów. Każdy agent potrzebuje pamięci i CPU.

3. **Nie pomijaj etapu planu.** Uruchamianie agentów bez planu prowadzi do rozbieżnych implementacji: frontend buduje się wtedy przeciwko jednemu kształtowi API, a backend przeciwko innemu.

4. **Nie ignoruj agentów, którzy zawiedli.** Praca nieudanego agenta jest nieukończona. Sprawdź jego ustrukturyzowane zgłoszenie albo wynik przypisany do uruchomienia, znajdź przyczynę i popraw prompt, a następnie uruchom agenta ponownie.

5. **Nie mieszaj identyfikatorów sesji dla powiązanych zadań.** Jeśli agenci backendu i frontendu pracują nad tą samą funkcją, muszą współdzielić ID sesji, aby orkiestrator mógł ich koordynować.

---

## Przykład od początku do końca {#end-to-end-example}

Kompletny workflow równoległego wykonywania dla funkcji uwierzytelniania użytkownika:

```bash
# Step 1: Plan the feature
# (In your AI IDE, run /plan or describe the feature)
# This creates .agents/results/plan-{sessionId}.json with task breakdown

# Step 2: Spawn implementation agents in parallel
oma agent spawn backend "Implement JWT auth API with registration, login, refresh, and logout endpoints. Use Argon2id for password hashing. Follow the API contract in .agents/results/api-contracts/" session-auth-01 -w ./apps/api &
oma agent spawn frontend "Build login and registration forms with email validation, password strength indicator, and error handling. Use the API contract for endpoint integration." session-auth-01 -w ./apps/web &
oma agent spawn mobile "Create auth screens (login, register, forgot password) with biometric login support and secure token storage." session-auth-01 -w ./apps/mobile &

# Step 3: Monitor in a separate terminal
# Terminal 2:
oma dashboard terminal

# Step 4: Wait for all implementation agents
wait

# Step 5: Run QA review
oma agent spawn qa "Review all auth implementations across backend, frontend, and mobile for OWASP Top 10 compliance, accessibility, and cross-domain consistency." session-auth-01

# Step 6: If QA finds issues, re-spawn specific agents with fixes
oma agent spawn backend "Fix: QA found missing rate limiting on login endpoint and SQL injection risk in user search. Apply fixes per QA report." session-auth-01 -w ./apps/api

# Step 7: Re-run QA to verify fixes
oma agent spawn qa "Re-review backend auth after fixes." session-auth-01
```
