---
title: Opcje CLI
description: Wyczerpująca referencja wszystkich opcji CLI — flagi globalne, kontrola wyjścia, opcje per polecenie i wzorce użycia w praktyce.
---

# Opcje CLI

## Opcje globalne

Dostępne na głównym poleceniu `oma` / `oh-my-agent`:

| Flaga | Opis |
|:-----|:-----------|
| `-V, --version` | Wyświetl numer wersji i zakończ |
| `-h, --help` | Wyświetl pomoc dla polecenia |

Wszystkie podpolecenia obsługują też `-h, --help` aby pokazać swoją specyficzną pomoc.

---

## Opcje wyjścia

Wiele poleceń obsługuje wyjście maszynowe dla pipeline CI/CD i automatyzacji. Trzy sposoby żądania wyjścia JSON, w kolejności priorytetu:

### 1. Flaga --json

```bash
oma stats --json
oma doctor --json
oma cleanup --json
```

Dostępna na: `doctor`, `stats`, `retro`, `cleanup`, `auth:status`, `usage:anti`, `memory:init`, `verify`, `visualize`.

### 2. Flaga --output

```bash
oma stats --output json
oma doctor --output text
```

Akceptuje `text` lub `json`. Pozwala jawnie zażądać tekstu gdy zmienna środowiskowa jest ustawiona na json.

### 3. Zmienna środowiskowa OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats    # wyjście JSON
oma doctor   # wyjście JSON
```

**Kolejność rozwiązywania:** flaga `--json` > flaga `--output` > zmienna `OH_MY_AG_OUTPUT_FORMAT` > `text` (domyślna).

---

## Opcje per polecenie

### update

| Flaga | Skrót | Opis | Domyślna |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Nadpisz niestandardowe pliki konfiguracyjne. Dotyczy: `oma-config.yaml`, `mcp.json`, katalogi `stack/`. | `false` |
| `--ci` | | Tryb nieinteraktywny CI. Pomija podpowiedzi, zwykłe wyjście konsolowe. | `false` |

### stats

| Flaga | Opis |
|:-----|:-----------|
| `--reset` | Resetuj wszystkie dane metryk. Usuwa i odtwarza `.serena/metrics.json`. |

### retro

| Flaga | Opis |
|:-----|:-----------|
| `--interactive` | Tryb interaktywny z ręcznym wprowadzaniem danych. |
| `--compare` | Porównaj bieżące okno z poprzednim o tej samej długości. |

Format argumentu window: `7d` (7 dni), `2w` (2 tygodnie), `1m` (1 miesiąc).

### cleanup

| Flaga | Skrót | Opis |
|:-----|:------|:-----------|
| `--dry-run` | | Tryb podglądu. Lista bez zmian. |
| `--yes` | `-y` | Pomiń podpowiedzi. Wyczyść wszystko bez pytania. |

**Co jest czyszczone:** Osierocone pliki PID (`/tmp/subagent-*.pid`), logi (`/tmp/subagent-*.log`), katalogi Gemini Antigravity.

### agent:spawn

| Flaga | Skrót | Opis |
|:-----|:------|:-----------|
| `--model` | `-m` | Nadpisanie dostawcy CLI. Musi być: `gemini`, `claude`, `codex`, `qwen`. |
| `--workspace` | `-w` | Katalog roboczy. Auto-wykrywany z konfiguracji monorepo jeśli pominięty. |

**Zachowanie specyficzne dla dostawcy:**

| Dostawca | Polecenie | Flaga auto-approve | Flaga promptu |
|:-------|:--------|:-----------------|:-----------|
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | (brak) | `-p` |
| codex | `codex` | `--full-auto` | (brak — prompt pozycyjny) |
| qwen | `qwen` | `--yolo` | `-p` |

### agent:status

| Flaga | Skrót | Opis |
|:-----|:------|:-----------|
| `--root` | `-r` | Ścieżka główna do lokalizacji plików pamięci i PID. |

### agent:parallel

| Flaga | Skrót | Opis |
|:-----|:------|:-----------|
| `--model` | `-m` | Nadpisanie dostawcy dla wszystkich agentów. |
| `--inline` | `-i` | Interpretuj argumenty jako ciągi `agent:task[:workspace]`. |
| `--no-wait` | | Tryb w tle. Uruchom i powróć natychmiast. |

Format inline: `agent:task` lub `agent:task:workspace`. Workspace wykrywany gdy ostatni segment zaczyna się od `./` lub `/`.

### memory:init

| Flaga | Opis |
|:-----|:-----------|
| `--force` | Nadpisz puste lub istniejące pliki schematu. |

### verify

| Flaga | Skrót | Opis |
|:-----|:------|:-----------|
| `--workspace` | `-w` | Ścieżka katalogu przestrzeni roboczej do weryfikacji. |

---

## Przykłady praktyczne

### Pipeline CI: Aktualizacja i weryfikacja
```bash
oma update --ci
oma doctor --json | jq '.healthy'
```

### Automatyczne zbieranie metryk
```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Wsadowe wykonanie agentów z monitoringiem statusu
```bash
oma agent:parallel tasks.yaml --no-wait
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### Czyszczenie w CI po testach
```bash
oma cleanup --yes --json
```

### Weryfikacja z izolacją przestrzeni roboczej
```bash
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### Retro z porównaniem do przeglądu sprintu
```bash
oma retro 2w --compare
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Pełny skrypt kontroli zdrowia
```bash
#!/bin/bash
set -e
echo "=== Kontrola zdrowia oh-my-agent ==="
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "BRAK" end)"'
oma auth:status --json | jq -r '.[] | "\(.name): \(.status)"'
oma stats --json | jq -r '"Sesje: \(.sessions), Zadania: \(.tasksCompleted)"'
echo "=== Gotowe ==="
```

### Describe do introspekcji agentów
```bash
oma describe | jq '.command.subcommands[] | {name, description}'
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
