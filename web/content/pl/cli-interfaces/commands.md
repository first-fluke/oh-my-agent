---
title: Polecenia CLI
description: Kompletna referencja każdego polecenia CLI oh-my-agent — składnia, opcje, przykłady, zorganizowane według kategorii.
---

# Polecenia CLI

Po globalnej instalacji (`bun install --global oh-my-agent`), używaj `oma` lub `oh-my-ag`. Oba są aliasami tego samego pliku binarnego. Do jednorazowego użycia bez instalacji uruchom `npx oh-my-agent`.

Zmienna środowiskowa `OH_MY_AG_OUTPUT_FORMAT` może być ustawiona na `json` aby wymusić wyjście maszynowe na poleceniach które to obsługują. To odpowiednik przekazania `--json` do każdego polecenia.

---

## Konfiguracja i instalacja

### oma (install)

Domyślne polecenie bez argumentów uruchamia interaktywny instalator.

```
oma
```

**Co robi:** Sprawdza legacy, wykrywa konkurencję, pyta o typ projektu i wariant języka, pobiera tarball, instaluje umiejętności, konfiguruje dowiązania symboliczne i adaptacje dostawców, opcjonalnie git rerere i MCP.

### doctor

Kontrola zdrowia instalacji CLI, konfiguracji MCP i stanu umiejętności.

```
oma doctor [--json] [--output <format>]
```

### update

Aktualizacja umiejętności do najnowszej wersji z rejestru.

```
oma update [-f | --force] [--ci]
```

| Flaga | Opis |
|:-----|:-----------|
| `-f, --force` | Nadpisz niestandardowe pliki konfiguracyjne |
| `--ci` | Tryb nieinteraktywny CI (pomija podpowiedzi, zwykły tekst) |

---

## Monitoring i metryki

### dashboard

```
oma dashboard
```
Obserwuje `.serena/memories/`. Renderuje UI z rysowaniem ramek. `Ctrl+C` aby wyjść. Nadpisz katalog: `MEMORIES_DIR=...`.

### dashboard:web

```
oma dashboard:web
```
Serwer HTTP na `http://localhost:9847` z WebSocket na żywo. Port: `DASHBOARD_PORT`. Katalog: `MEMORIES_DIR`.

### stats

```
oma stats [--json] [--output <format>] [--reset]
```
Metryki: sesje, użyte umiejętności, wykonane zadania, czas sesji, zmienione pliki.

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Argument | Opis | Domyślne |
|:---------|:-----------|:--------|
| `window` | Okno czasowe (np. `7d`, `2w`, `1m`) | 7 dni |

Opcje: `--interactive` (ręczne wpisy), `--compare` (porównanie z poprzednim oknem).

---

## Zarządzanie agentami

### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-v <vendor>] [-w <workspace>]
```

| Argument | Wymagany | Opis |
|:---------|:---------|:-----------|
| `agent-id` | Tak | Typ agenta: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Tak | Opis zadania. Tekst inline lub ścieżka do pliku. |
| `session-id` | Tak | Identyfikator sesji (format: `session-YYYYMMDD-HHMMSS`) |

Opcje: `-v, --vendor` (nadpisanie dostawcy), `-w, --workspace` (katalog roboczy, auto-wykrywany z konfiguracji monorepo).

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

Statusy: `completed`, `running`, `crashed`. Wyjście: `{agent-id}:{status}` per linia.

### agent:parallel

```
oma agent:parallel [tasks...] [-v <vendor>] [-i | --inline] [--no-wait]
```

Tryb inline: `agent:task[:workspace]`. Tryb YAML: plik z kluczem `tasks`. Tryb `--no-wait`: uruchom i powróć natychmiast.

---

## Zarządzanie pamięcią

### memory:init

```
oma memory:init [--json] [--output <format>] [--force]
```

Tworzy strukturę `.serena/memories/` z początkowymi plikami schematu.

---

## Integracja i narzędzia

### auth:status

```
oma auth:status [--json] [--output <format>]
```
Sprawdza uwierzytelnianie: Gemini (klucz API), Claude (klucz API lub OAuth), Codex, Qwen.

### usage:anti

```
oma usage:anti [--json] [--output <format>] [--raw]
```
Kwoty użycia modeli z lokalnego Antigravity IDE.

### bridge

```
oma bridge [url]
```
Most protokołu MCP stdio do Streamable HTTP. Wymagany dla Antigravity IDE.

### verify

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```
Weryfikuje wyjście subagenta: sukces buildu, wyniki testów, zgodność zakresu.

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```
Czyści: osierocone pliki PID, logi, katalogi Gemini Antigravity.

### visualize

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```
Wizualizacja struktury projektu jako graf zależności. `viz` jest wbudowanym aliasem.

### star

```
oma star
```
Dodaje gwiazdkę oh-my-agent na GitHub. Wymaga zainstalowanego i uwierzytelnionego `gh`.

### describe

```
oma describe [command-path]
```
Opisuje polecenia CLI jako JSON do introspekcji runtime. Używane przez agentów AI.

### help / version

```
oma help
oma version
```

---

## Zmienne środowiskowe

| Zmienna | Opis | Używane przez |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Ustaw na `json` aby wymusić wyjście JSON | Wszystkie polecenia z `--json` |
| `DASHBOARD_PORT` | Port panelu webowego | `dashboard:web` |
| `MEMORIES_DIR` | Nadpisanie ścieżki katalogu pamięci | `dashboard`, `dashboard:web` |

---

## Aliasy

| Alias | Pełne polecenie |
|:------|:------------|
| `oma` | `oh-my-ag` |
| `viz` | `visualize` |
