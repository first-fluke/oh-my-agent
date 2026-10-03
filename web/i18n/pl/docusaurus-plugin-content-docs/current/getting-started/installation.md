---
title: Instalacja
description: Zainstaluj oh-my-agent, wybierz umiejętności i dostawców, poznaj generowane pliki projektu, skonfiguruj domyślne ustawienia modeli i runtime'u oraz sprawdź konfigurację za pomocą oma doctor.
---

# Instalacja {#installation}

## Wymagania wstępne {#prerequisites}

- **IDE lub CLI z obsługą AI**: co najmniej jeden obsługiwany host, taki jak Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot lub Hermes
- **bun**: środowisko uruchomieniowe JavaScript i menedżer pakietów (skrypt instalacyjny zainstaluje je automatycznie, jeśli go brakuje)
- **uv**: menedżer pakietów Pythona (skrypt bootstrapu zaproponuje instalację, jeśli go brakuje)
- **Dostawca inteligencji kodu**: domyślnym dostawcą jest Serena. Obsługiwany jest także Gortex, jeśli zostanie wybrany w konfiguracji dostawcy. Instalator może skonfigurować Serenę przez `uv tool install`; gdy brakuje opcjonalnej zależności, kontynuuje z ostrzeżeniem. Przy wybranym Gortex `oma install` i `oma update` w trybie projektu rejestrują projekt w demonie Gortex (`gortex track`), gdy nie jest jeszcze śledzony, i dodają wygenerowane przez OMA katalogi do listy wykluczeń tego projektu za pośrednictwem CLI Gortex; nic nie jest zapisywane w drzewie projektu. Sam Gortex trzeba zainstalować osobno.

Instalator grupuje integracje według możliwości. Dostawcy hooków to Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro i Qwen; OpenCode i pi używają mostków rozszerzeń; GitHub Copilot i Hermes otrzymują dowiązania do umiejętności, a ZCode — polecenia workflowów. Możesz wybrać wielu dostawców, ale pierwsze zadanie wymaga tylko hosta, którego planujesz używać.

---

## Metoda 0: CLI skills (najszybsza dla samych umiejętności) {#method-0-skills-cli-fastest-for-skills-only}

Zainstaluj pakiet umiejętności OMA w wykrytych runtime'ach agentów:

```bash
npx skills add first-fluke/oh-my-agent
```

To najlżejsza ścieżka wejścia, gdy chcesz mieć umiejętności bez pełnego harnessu. Dla workflowów, reguł, hooków, bramek i `oma agent spawn` użyj Metody 1 lub 2 poniżej.

## Metoda 1: instalacja jednym wierszem (pełny harness) {#method-1-one-liner-install-full-harness}

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Oba skrypty bootstrapu działają tak samo:
1. Wykrywają platformę (macOS, Linux lub Windows)
2. Sprawdzają bun i uv (oraz Serenę, jeśli została wybrana), instalując brakujące elementy
3. Uruchamiają interaktywny instalator z wyborem presetu i dostawcy
4. Tworzą `.agents/` z wybranymi umiejętnościami i konfiguracją
5. Konfigurują warstwy integracji runtime'u (hooki, dowiązania symboliczne i ustawienia dla wykrytych dostawców)
6. Konfigurują serwery MCP dla inteligencji kodu i pamięci

Bootstrap kontynuuje działanie po błędach opcjonalnych zależności i podaje polecenia dalszych czynności. Po zakończeniu instalatora uruchom `oma doctor`.

---

## Metoda 2: instalacja ręczna przez bunx {#method-2-manual-install-via-bunx}

```bash
bunx oh-my-agent@latest
```

To uruchamia interaktywny instalator bez bootstrapu zależności. Bun musi być już zainstalowany.

Instalator prosi o wybór presetu umiejętności. Bieżące presety są zdefiniowane w `cli/constants/skill-data.ts`:

### Presety {#presets}

| Preset | Zawarte umiejętności |
|--------|---------------------|
| **all** | Wszystkie 33 bieżące pakiety umiejętności |
| **fullstack** | Architektura, brainstorming, design, frontend, backend, mobile, bazy danych, PM, QA, debugowanie, SCM, Terraform i workflow deweloperski |
| **fullstack-web** | Implementacja fullstack web, architektura, design, PM, QA, debugowanie, SCM i workflow deweloperski |
| **fullstack-mobile** | Implementacja fullstack ukierunkowana na mobile, architektura, design, PM, QA, debugowanie, SCM i workflow deweloperski |
| **frontend** | Architektura, brainstorming, design, frontend, PM, QA, debugowanie i SCM |
| **backend** | Architektura, brainstorming, backend, bazy danych, PM, QA, debugowanie, SCM i workflow deweloperski |
| **mobile** | Architektura, brainstorming, mobile, PM, QA, debugowanie i SCM |
| **devops** | Architektura, brainstorming, Terraform, workflow deweloperski, obserwowalność, PM, QA, debugowanie i SCM |
| **research** | Scholar, market, PDF, HWP, pisanie akademickie, search, translation i SCM |
| **content** | Design, image, voice, pisanie akademickie, translation i SCM |

Presety są pakietami umiejętności; nie tworzą jednej definicji subagenta dla każdej umiejętności. Preset `all` rozwija się na podstawie aktywnego rejestru umiejętności, więc lista może rosnąć wraz z repozytorium. Presety domenowe zawierają tylko umiejętności potrzebne w danym obszarze.

Współdzielone zasoby (`_shared/`) są instalowane niezależnie od presetu. Obejmuje to routing podstawowy, ładowanie kontekstu, strukturę promptów, wykrywanie dostawcy, protokoły wykonywania i protokół pamięci.

### Co zostanie utworzone {#what-gets-created}

Po instalacji projekt będzie zawierał:

```
.agents/
├── oma-config.yaml # Your preferences
├── oma-config.cue # Optional schema-backed configuration
├── skills/
│ ├── _shared/ # Shared resources (always installed)
│ │ ├── core/ # skill-routing, context-loading, etc.
│ │ ├── runtime/ # memory-protocol, execution-protocols/
│ │ └── conditional/ # quality-score, experiment-ledger, etc.
│ ├── oma-frontend/ # Per preset
│ │ ├── SKILL.md
│ │ └── resources/
│ └── ... # Other selected skills
├── workflows/ # Current workflow definitions (21 in this checkout)
├── agents/ # Subagent definitions
├── mcp.json # MCP server configuration
├── results/ # Plans and agent results (populated by workflows)
└── state/ # Persistent workflow and coordination state

.claude/
├── settings.json # Vendor settings, when Claude Code is selected
├── hooks/oma-hook.sh # Generated wrapper for the in-process hook chain
├── hooks/hud.ts # Optional [OMA] statusline indicator
├── skills/ # Symlinks → .agents/skills/
└── agents/ # Generated native subagent files, when supported

.agents/state/memories/
└── ... # Runtime coordination state
```

Instalator tworzy katalogi dostawców tylko dla wybranych hostów. Źródło hooków pozostaje w `.agents/hooks/core/`; wygenerowane pliki dostawcy są wynikami integracji. W starszych projektach Serena może także używać starszego katalogu `.serena/memories/`.


---

## Metoda 3: instalacja globalna {#method-3-global-install}

Dla użycia na poziomie CLI (dashboardy, uruchamianie agentów, diagnostyka) zainstaluj oh-my-agent globalnie:

### Homebrew (macOS/Linux) {#homebrew-macoslinux}

```bash
brew install oh-my-agent
```

### Globalna instalacja npm / bun {#npm--bun-global}

```bash
bun install --global oh-my-agent
# or
npm install --global oh-my-agent
```

To instaluje globalnie polecenie `oma` i udostępnia wszystkie polecenia CLI z dowolnego katalogu:

```bash
oma doctor # Health check
oma doctor --profile # Show resolved model/CLI per dispatch role
oma dashboard terminal # Terminal monitoring
oma dashboard web # Web dashboard at http://localhost:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update oh-my-agent
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # MCP stdio ↔ Streamable HTTP bridge
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives (alias: `oma s`)
oma image # Multi-vendor AI image generation (alias: `oma img`)
oma video # Video generation and capture
oma slide # Presentation generation and export
oma export # Export skills for external IDEs (e.g. cursor)
oma star # Star the repository
```

`oma` to skrót od `oh-my-agent`. Oba warianty działają jako polecenia CLI.

---

## Instalacja narzędzi CLI AI {#ai-cli-tool-installation}

Potrzebujesz co najmniej jednego narzędzia CLI AI. oh-my-agent obsługuje wielu dostawców, a różne CLI możesz łączyć, używając mapowania agent–CLI.

### Claude Code {#claude-code}

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

Uwierzytelnianie odbywa się automatycznie przy pierwszym uruchomieniu. Claude Code używa `.claude/` do hooków i ustawień, a umiejętności są dowiązane z `.agents/skills/`.

### Codex CLI {#codex-cli}

```bash
bun install --global @openai/codex
# or
npm install --global @openai/codex
```

Po instalacji uruchom `codex login`, aby się uwierzytelnić.

### Qwen CLI {#qwen-cli}

```bash
bun install --global @qwen-code/qwen-code
```

Po instalacji uruchom `/auth` w CLI, aby się uwierzytelnić.

### Antigravity CLI (`agy`) {#antigravity-cli-agy}

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

Uwierzytelnianiem przy pierwszym uruchomieniu zajmuje się `agy`. Plik wykonywalny to `agy`. W środowiskach bez interfejsu ustaw zamiast tego zmienną środowiskową `ANTIGRAVITY_API_KEY`. `oma doctor` raportuje stan uwierzytelniania przez `~/.gemini/antigravity-cli/cache/onboarding.json`.

---

## oma-config.yaml {#oma-configyaml}

Polecenie `oma install` tworzy `.agents/oma-config.yaml`. To centralny plik konfiguracji całego działania oh-my-agent:

```yaml
# Required
language: en
model_preset: auto          # follows the current runtime's native model settings

# Optional — date/time preferences
date_format: ISO
timezone: Australia/Sydney  # omit to use the system timezone

# Optional — auto-update the CLI in background
auto_update_cli: true
telemetry: false

# Optional — capability providers (defaults are context7/native/serena/agentmemory)
# providers:
#   docs: context7
#   web: native
#   code_intelligence: serena
#   code_intelligence_guard: block   # deny native Grep/Glob/rg while serena is configured (off to disable)
#   semantic_memory: agentmemory

# Optional — browser DevTools MCP. Omit to preserve the current setup.
# mcp:
#   devtools_browsers: [aside]

# Optional — partial override per agent (object-only, shallow merge)
agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.6 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### Referencja pól {#field-reference}

| Pole | Typ | Wymagane | Opis |
|-------|------|----------|-------------|
| `language` | string | Tak | Kod języka odpowiedzi. Obsługuje en, ko, ja, zh, es, fr, de, pt, ru, nl, pl. |
| `model_preset` | string | Tak | Aktywny klucz presetu. `auto` podąża za bieżącym runtime'em; stałe klucze to `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` i `mixed`. Prawidłowe są także niestandardowe klucze presetów. Zobacz [Modele per agent](../guide/per-agent-models.md). |
| `default_cli` | string | Nie | Zapasowe CLI dla `oma agent spawn`, gdy jawne ustawienia agenta i wybrany preset nie rozstrzygną dostawcy. |
| `free` | map | Nie | Ustawienia bramy FreeLLMAPI używane przy `model_preset: free`; klucze API przechowuj w zmiennych środowiskowych. |
| `providers` | map | Nie | Dostawcy możliwości: `code_intelligence` (`serena` lub `gortex`), `code_intelligence_guard` (`block` lub `off`), `docs` (`context7`), `web` (`native` lub `brave`) oraz `semantic_memory` (`agentmemory`, `honcho` lub `none`). |
| `date_format` | string | Nie | Format znacznika czasu (`ISO`, `US`, `EU`). Domyślnie: `ISO`. |
| `timezone` | string | Nie | Identyfikator strefy czasowej (np. `Asia/Seoul`). Pominięte wartości używają strefy czasowej systemu hosta. |
| `auto_update_cli` | boolean | Nie | Czy rutynowe sprawdzenia CLI mogą aktualizować je w tle. Domyślnie: `true` (wyłącz przez `false`). |
| `telemetry` | boolean | Nie | Zgoda na telemetrię dostawcy. Domyślnie: `false`. |
| `agents` | map | Nie | Częściowe nadpisania per agent (tylko obiektowy `AgentSpec`). Są płytko scalane z domyślnymi wartościami presetu. |
| `models` | map | Nie | Zdefiniowane przez użytkownika slugi modeli, wcześniej przechowywane w `models.yaml`. |
| `custom_presets` | map | Nie | Presety zdefiniowane przez użytkownika. Obsługują `extends:` dla częściowego dziedziczenia z wbudowanego presetu. |
| `mcp.devtools_browsers` | list | Nie | Przeglądarki dla DevTools MCP: `aside`, `chrome` lub `firefox`. Pominięcie zachowuje istniejącą konfigurację; `[]` jawnie wyłącza serwer przeglądarki. |
| `serena.mode` | string | Nie | `bridge` współdzieli serwer Serena projektu i jest domyślne; `stdio` wybiera jeden proces na sesję. |
| `serena.auto_update` | boolean | Nie | Czy `oma update` aktualizuje Serenę. Domyślnie: `true`. |

> **Format konfiguracji:** Prawidłowy `.agents/oma-config.cue` jest oceniany jako konfiguracja współdzielona. Jeśli ocena współdzielonego CUE zakończy się niepowodzeniem, loader może przejść do `.agents/oma-config.yaml`; lokalna nakładka (`oma-config.local.cue` lub `.yaml`) jest opcjonalna, a nieprawidłowa intencja lokalna jest błędem krytycznym. `OMA_MODEL_PRESET` nadpisuje wartość pliku dla bieżącego procesu.

### Rozstrzyganie dostawcy {#vendor-resolution}

Podczas uruchamiania agenta CLI rozstrzyga ustawienia w tej kolejności: `agents.<id>`, wybrany `model_preset`, zapasowa konfiguracja orkiestratora presetu, a następnie `default_cli`. Przy `model_preset: auto` model dostarcza natywna konfiguracja bieżącego runtime'u; nieznany runtime przechodzi do `default_cli`. Pełną macierz opisano w [Modelach per agent](../guide/per-agent-models.md).


---

## Weryfikacja: `oma doctor` {#verification-oma-doctor}

Po instalacji i konfiguracji sprawdź, czy wszystko działa:

```bash
oma doctor
```

To polecenie sprawdza:
- czy CLI wybranego hosta jest zainstalowane i dostępne; narzędzia opcjonalne raportuje osobno
- czy skonfigurowane wpisy serwerów MCP są prawidłowe (np. Serena, Gortex, Context7 lub DevTools)
- czy pliki umiejętności istnieją i mają prawidłowy frontmatter SKILL.md
- czy dowiązania symboliczne i skrypty hooków wskazują prawidłowe cele
- czy hooki są prawidłowo skonfigurowane w plikach ustawień dostawcy
- czy wybrani dostawcy inteligencji kodu i pamięci są osiągalni (przy Gortex także to, czy bieżący projekt należy do zbioru śledzonego przez demona)
- czy `oma-config.cue` / `oma-config.yaml` jest prawidłowy i zawiera wymagane pola

Jeśli coś jest nie tak, `oma doctor` identyfikuje brakujący lub nieprawidłowy element i oddziela blokery pierwszego zadania od ostrzeżeń o opcjonalnych integracjach.

Aby sprawdzić rozstrzygnięty model i CLI każdego agenta, uruchom:

```bash
oma doctor --profile
```

Pełną macierz i informacje o migracji opisano w [Modelach per agent](../guide/per-agent-models.md).

---

## Aktualizowanie {#updating}

### Aktualizacja CLI {#cli-update}

```bash
oma update
```

To aktualizuje globalne CLI oh-my-agent do najnowszej wersji.

### Aktualizacja umiejętności projektu {#project-skills-update}

Umiejętności i workflowy projektu można aktualizować przez GitHub Action (`action/`) do aktualizacji automatycznych albo ręcznie, ponownie uruchamiając instalator:

```bash
bunx oh-my-agent@latest
```

Instalator wykrywa istniejące instalacje i proponuje aktualizację, zachowując `oma-config.yaml` oraz niestandardową konfigurację.

---

## Co dalej {#what-is-next}

Otwórz projekt w wybranym IDE lub CLI AI i zacznij używać oh-my-agent. Routing umiejętności zależy od hosta; włączone hooki mogą wykrywać workflowy. Wypróbuj:

```
"Build a login form with email validation using Tailwind CSS"
```

Możesz też użyć polecenia workflowu:

```
/plan authentication feature with JWT and refresh tokens
```

Szczegółowe przykłady znajdziesz w [Przewodniku użycia](/docs/guide/usage), a informacje o działaniu poszczególnych specjalistów w [Agentach](/docs/core-concepts/agents).
