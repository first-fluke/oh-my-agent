---
title: Instalacja
description: Kompletny przewodnik instalacji oh-my-agent — trzy metody instalacji, wszystkie sześć presetów z listami umiejętności, wymagania narzędzi CLI dla czterech dostawców, konfiguracja po instalacji, pola user-preferences.yaml oraz weryfikacja za pomocą oma doctor.
---

# Instalacja

## Wymagania wstępne

- **IDE lub CLI zasilane AI** — co najmniej jedno z: Claude Code, Gemini CLI, Codex CLI, Qwen CLI, Antigravity IDE, Cursor lub OpenCode
- **bun** — środowisko uruchomieniowe JavaScript i menedżer pakietów (automatycznie instalowany przez skrypt, jeśli brak)
- **uv** — menedżer pakietów Python dla Serena MCP (automatycznie instalowany, jeśli brak)

---

## Metoda 1: Instalacja jednolinijkowa (zalecana)

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

Ten skrypt:
1. Wykrywa platformę (macOS, Linux)
2. Sprawdza obecność bun i uv, instalując je jeśli brak
3. Uruchamia interaktywny instalator z wyborem presetu
4. Tworzy `.agents/` z wybranymi umiejętnościami
5. Konfiguruje warstwę integracji `.claude/` (hooki, dowiązania symboliczne, ustawienia)
6. Konfiguruje Serena MCP jeśli wykryty

Typowy czas instalacji: poniżej 60 sekund.

---

## Metoda 2: Ręczna instalacja przez bunx

```bash
bunx oh-my-agent
```

Uruchamia interaktywny instalator bez bootstrapu zależności. Wymaga wcześniej zainstalowanego bun.

Instalator prosi o wybranie presetu, który określa, jakie umiejętności zostaną zainstalowane:

### Presety

| Preset | Zawarte umiejętności |
|--------|----------------|
| **all** | oma-brainstorm, oma-pm, oma-frontend, oma-backend, oma-db, oma-mobile, oma-design, oma-qa, oma-debug, oma-tf-infra, oma-dev-workflow, oma-translator, oma-orchestrator, oma-commit, oma-coordination |
| **fullstack** | oma-frontend, oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **frontend** | oma-frontend, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **backend** | oma-backend, oma-db, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **mobile** | oma-mobile, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |
| **devops** | oma-tf-infra, oma-dev-workflow, oma-pm, oma-qa, oma-debug, oma-brainstorm, oma-commit |

Każdy preset zawiera oma-pm (planowanie), oma-qa (przegląd), oma-debug (naprawa błędów), oma-brainstorm (ideacja) i oma-commit (git) jako bazowych agentów. Presety domenowe dodają odpowiednich agentów implementacyjnych.

Zasoby współdzielone (`_shared/`) są zawsze instalowane niezależnie od presetu. Obejmują one podstawowy routing, ładowanie kontekstu, strukturę promptów, wykrywanie dostawcy, protokoły wykonawcze i protokół pamięci.

### Co zostaje utworzone

Po instalacji projekt będzie zawierał:

```
.agents/
├── config/
│   └── user-preferences.yaml      # Preferencje (tworzone przez /setup)
├── skills/
│   ├── _shared/                    # Zasoby współdzielone (zawsze instalowane)
│   │   ├── core/                   # skill-routing, context-loading, itd.
│   │   ├── runtime/                # memory-protocol, execution-protocols/
│   │   └── conditional/            # quality-score, experiment-ledger, itd.
│   ├── oma-frontend/               # Według presetu
│   │   ├── SKILL.md
│   │   └── resources/
│   └── ...                         # Inne wybrane umiejętności
├── workflows/                      # Wszystkie 14 definicji workflow
├── agents/                         # Definicje subagentów
├── mcp.json                        # Konfiguracja serwera MCP
├── plan.json                       # Pusty (wypełniany przez /plan)
├── state/                          # Pusty (używany przez trwałe workflow)
└── results/                        # Pusty (wypełniany przez uruchomienia agentów)

.claude/
├── settings.json                   # Hooki i uprawnienia
├── hooks/
│   ├── triggers.json               # Mapowanie słów kluczowych na workflow (11 języków)
│   ├── keyword-detector.ts         # Logika automatycznego wykrywania
│   ├── persistent-mode.ts          # Wymuszanie trwałych workflow
│   └── hud.ts                      # Wskaźnik [OMA] w pasku stanu
├── skills/                         # Dowiązania symboliczne → .agents/skills/
└── agents/                         # Definicje subagentów dla IDE

.serena/
└── memories/                       # Stan runtime (wypełniany podczas sesji)
```

---

## Metoda 3: Instalacja globalna

Dla użycia na poziomie CLI (panele kontrolne, uruchamianie agentów, diagnostyka), zainstaluj oh-my-agent globalnie:

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# lub
npm install --global oh-my-agent
```

To instaluje polecenie `oma` globalnie, dając dostęp do wszystkich poleceń CLI z dowolnego katalogu:

```bash
oma doctor              # Kontrola zdrowia
oma dashboard           # Monitoring w terminalu
oma dashboard:web       # Panel webowy pod http://localhost:9847
oma agent:spawn         # Uruchamianie agentów z terminala
oma agent:parallel      # Równoległe wykonywanie agentów
oma agent:status        # Sprawdzanie stanu agenta
oma stats               # Statystyki sesji
oma retro               # Analiza retrospektywna
oma cleanup             # Czyszczenie artefaktów sesji
oma update              # Aktualizacja oh-my-agent
oma verify              # Weryfikacja wyjścia agenta
oma visualize           # Wizualizacja zależności
oma describe            # Opis struktury projektu
oma bridge              # Most SSE-to-stdio dla Antigravity
oma memory:init         # Inicjalizacja dostawcy pamięci
oma auth:status         # Sprawdzanie stanu uwierzytelniania CLI
oma usage:anti          # Wykrywanie anty-wzorców użycia
oma star                # Dodanie gwiazdki do repozytorium
```

Globalny alias `oma` jest równoważny z `oh-my-ag` (pełna nazwa polecenia).

---

## Instalacja narzędzi AI CLI

Potrzebujesz co najmniej jednego zainstalowanego narzędzia AI CLI. oh-my-agent obsługuje czterech dostawców i możesz je mieszać — używając różnych CLI dla różnych agentów poprzez mapowanie agent-CLI.

### Gemini CLI

```bash
bun install --global @google/gemini-cli
# lub
npm install --global @google/gemini-cli
```

Uwierzytelnianie jest automatyczne przy pierwszym uruchomieniu. Gemini CLI domyślnie czyta umiejętności z `.agents/skills/`.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# lub
npm install --global @anthropic-ai/claude-code
```

Uwierzytelnianie jest automatyczne przy pierwszym uruchomieniu. Claude Code używa `.claude/` dla hooków i ustawień, z umiejętnościami dowiązanymi symbolicznie z `.agents/skills/`.

### Codex CLI

```bash
bun install --global @openai/codex
# lub
npm install --global @openai/codex
```

Po instalacji uruchom `codex login` aby się uwierzytelnić.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

Po instalacji uruchom `/auth` wewnątrz CLI aby się uwierzytelnić.

---

## Konfiguracja po instalacji: `/setup`

Po instalacji otwórz projekt w IDE AI i uruchom polecenie `/setup`. Ten interaktywny workflow (zdefiniowany w `.agents/workflows/setup.md`) przeprowadzi Cię przez:

### Krok 1: Ustawienia języka

Ustawia język odpowiedzi dla wszystkich agentów i workflow. Obsługiwane wartości to m.in.: `en`, `ko`, `ja`, `zh`, `es`, `fr`, `de`, `pt`, `ru`, `nl`, `pl`.

### Krok 2: Stan instalacji CLI

Skanuje zainstalowane CLI (`which gemini`, `which claude`, `which codex`) i wyświetla ich wersje. Podaje polecenia instalacji dla brakujących CLI.

### Krok 3: Stan połączenia MCP

Weryfikuje konfigurację serwera MCP dla każdego CLI:
- Gemini CLI: sprawdza `~/.gemini/settings.json`
- Claude CLI: sprawdza `~/.claude.json` lub `--mcp-config`
- Codex CLI: sprawdza `~/.codex/config.toml`
- Antigravity IDE: sprawdza `~/.gemini/antigravity/mcp_config.json`

Oferuje skonfigurowanie Serena MCP w trybie Command (prosty, jeden proces na sesję) lub SSE (współdzielony serwer, mniejsze zużycie pamięci, wymaga polecenia `oma bridge` dla Antigravity).

### Krok 4: Mapowanie Agent-CLI

Konfiguruje, które CLI obsługuje którego agenta. Na przykład możesz kierować `frontend` i `qa` do Claude (lepsze wnioskowanie) a `backend` i `pm` do Gemini (szybsze generowanie).

### Krok 5: Podsumowanie

Wyświetla kompletną konfigurację i sugeruje następne kroki.

---

## user-preferences.yaml

Workflow `/setup` tworzy plik `.agents/config/user-preferences.yaml`. To centralny plik konfiguracyjny dla całego zachowania oh-my-agent:

```yaml
# Język odpowiedzi dla wszystkich agentów i workflow
language: en

# Format daty używany w raportach i plikach pamięci
date_format: "YYYY-MM-DD"

# Strefa czasowa dla znaczników czasu
timezone: "UTC"

# Domyślne narzędzie CLI do uruchamiania agentów
# Opcje: gemini, claude, codex, qwen
default_cli: gemini

# Mapowanie CLI per agent (nadpisuje default_cli)
agent_cli_mapping:
  frontend: claude       # Złożone wnioskowanie UI
  backend: gemini        # Szybkie generowanie API
  mobile: gemini
  db: gemini
  pm: gemini             # Szybki rozkład zadań
  qa: claude             # Dokładny przegląd bezpieczeństwa
  debug: claude          # Głęboka analiza przyczyn źródłowych
  design: claude
  tf-infra: gemini
  dev-workflow: gemini
  translator: claude
  orchestrator: gemini
  commit: gemini
```

### Referencja pól

| Pole | Typ | Domyślna | Opis |
|-------|------|---------|-------------|
| `language` | string | `en` | Kod języka odpowiedzi. Wszystkie wyjścia agentów, komunikaty workflow i raporty używają tego języka. Obsługuje 11 języków (en, ko, ja, zh, es, fr, de, pt, ru, nl, pl). |
| `date_format` | string | `YYYY-MM-DD` | Format daty dla znaczników czasu w planach, plikach pamięci i raportach. |
| `timezone` | string | `UTC` | Strefa czasowa dla wszystkich znaczników czasu. Używa standardowych identyfikatorów stref (np. `Asia/Seoul`, `America/New_York`). |
| `default_cli` | string | `gemini` | Awaryjne CLI gdy nie istnieje mapowanie specyficzne dla agenta. Używane jako poziom 3 w priorytecie rozwiązywania dostawcy. |
| `agent_cli_mapping` | map | (pusty) | Mapuje identyfikatory agentów na konkretnych dostawców CLI. Ma pierwszeństwo przed `default_cli`. |

### Priorytet rozwiązywania dostawcy

Przy uruchamianiu agenta, dostawca CLI jest określany według tego priorytetu (od najwyższego):

1. Flaga `--vendor` przekazana do `oma agent:spawn`
2. Wpis `agent_cli_mapping` dla konkretnego agenta w `user-preferences.yaml`
3. Ustawienie `default_cli` w `user-preferences.yaml`
4. `active_vendor` w `cli-config.yaml` (awaryjne zachowanie wsteczne)
5. `gemini` (zakodowany na stałe ostateczny fallback)

---

## Weryfikacja: `oma doctor`

Po instalacji i konfiguracji zweryfikuj, czy wszystko działa:

```bash
oma doctor
```

To polecenie sprawdza:
- Czy wszystkie wymagane narzędzia CLI są zainstalowane i dostępne
- Czy konfiguracja serwera MCP jest poprawna
- Czy pliki umiejętności istnieją z poprawnym frontmatterem SKILL.md
- Czy dowiązania symboliczne w `.claude/skills/` wskazują na poprawne cele
- Czy hooki są prawidłowo skonfigurowane w `.claude/settings.json`
- Czy dostawca pamięci jest osiągalny (Serena MCP)
- Czy `user-preferences.yaml` jest poprawnym YAML z wymaganymi polami

Jeśli coś jest nie tak, `oma doctor` powie dokładnie co naprawić, z gotowymi poleceniami do skopiowania.

---

## Aktualizacja

### Aktualizacja CLI

```bash
oma update
```

Aktualizuje globalne CLI oh-my-agent do najnowszej wersji.

### Aktualizacja umiejętności projektu

Umiejętności i workflow w projekcie mogą być aktualizowane przez GitHub Action (`action/`) do automatycznych aktualizacji, lub ręcznie przez ponowne uruchomienie instalatora:

```bash
bunx oh-my-agent
```

Instalator wykrywa istniejące instalacje i oferuje aktualizację z zachowaniem `user-preferences.yaml` i dowolnej niestandardowej konfiguracji.

---

## Co dalej

Otwórz projekt w IDE AI i zacznij używać oh-my-agent. Umiejętności są automatycznie wykrywane. Spróbuj:

```
"Build a login form with email validation using Tailwind CSS"
```

Lub użyj polecenia workflow:

```
/plan authentication feature with JWT and refresh tokens
```

Zobacz [Przewodnik użytkowania](/guide/usage) po szczegółowe przykłady, lub poznaj [Agentów](/core-concepts/agents) aby zrozumieć co robi każdy specjalista.
