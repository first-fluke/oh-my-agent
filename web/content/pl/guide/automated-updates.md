---
title: Automatyczne aktualizacje
description: Kompletna dokumentacja GitHub Action oh-my-agent — konfiguracja, wszystkie wejścia i wyjścia, szczegółowe przykłady, jak działa pod spodem i porównanie z centralnym rejestrem.
---

# Automatyczne aktualizacje

## Przegląd

GitHub Action oh-my-agent (`first-fluke/oh-my-agent/action@v1`) automatycznie aktualizuje umiejętności agentów w projekcie uruchamiając `oma update` w CI. Obsługuje dwa tryby: tworzenie pull request do przeglądu lub bezpośredni commit na gałąź.

---

## Szybka konfiguracja

Dodaj ten plik do projektu jako `.github/workflows/update-oh-my-agent.yml`:

```yaml
name: Update oh-my-agent

on:
  schedule:
    - cron: '0 9 * * 1'  # Każdy poniedziałek o 9:00 UTC
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: first-fluke/oh-my-agent/action@v1
```

---

## Wszystkie wejścia Action

| Wejście | Typ | Domyślne | Opis |
|:------|:-----|:--------|:-----------|
| `mode` | string | `"pr"` | `"pr"` tworzy pull request. `"commit"` pushuje bezpośrednio. |
| `base-branch` | string | `"main"` | Gałąź bazowa dla PR lub docelowa dla commitów. |
| `force` | string | `"false"` | Gdy `"true"`, nadpisuje pliki konfiguracyjne użytkownika. |
| `pr-title` | string | `"chore(deps): update oh-my-agent skills"` | Tytuł PR. |
| `pr-labels` | string | `"dependencies,automated"` | Etykiety PR oddzielone przecinkami. |
| `commit-message` | string | `"chore(deps): update oh-my-agent skills"` | Wiadomość commita. |
| `token` | string | `${{ github.token }}` | Token GitHub. Użyj PAT jeśli PR ma wyzwalać inne workflow. |

## Wszystkie wyjścia Action

| Wyjście | Typ | Opis |
|:-------|:-----|:-----------|
| `updated` | string | `"true"` jeśli wykryto zmiany |
| `version` | string | Wersja po aktualizacji |
| `pr-number` | string | Numer pull request (tylko tryb pr) |
| `pr-url` | string | URL pull request (tylko tryb pr) |

---

## Szczegółowe przykłady

### Domyślny tryb PR
Tworzy PR w każdy poniedziałek jeśli dostępne aktualizacje. Używa `peter-evans/create-pull-request@v8`.

### Tryb bezpośredniego commita z PAT
Dla zespołów chcących natychmiastowych aktualizacji bez przeglądu PR. Użyj PAT aby commit wyzwalał dalsze workflow.

### Warunkowe powiadomienie
Aktualizacja z powiadomieniem Slack gdy dostępna nowa wersja — użyj `steps.update.outputs.updated == 'true'`.

### Tryb wymuszenia
Resetuje wszystkie pliki konfiguracyjne do domyślnych — użyj `force: 'true'`. Tylko ręczne wyzwalanie.

---

## Jak działa pod spodem

1. **Setup Bun** — `oven-sh/setup-bun@v2`
2. **Instalacja oh-my-agent** — `bun install -g oh-my-agent`
3. **Uruchomienie oma update** — Z flagami `--ci` i opcjonalnie `--force`
4. **Sprawdzenie zmian** — `git status --porcelain .agents/ .claude/`
5. **Tryb pr:** Tworzenie PR przez `peter-evans/create-pull-request@v8`
6. **Tryb commit:** Konfiguracja git jako `github-actions[bot]`, stage, commit, push

---

## Porównanie z centralnym rejestrem

| Aspekt | GitHub Action | Centralny rejestr |
|:-------|:-------------|:----------------|
| **Pliki do dodania** | 1 plik workflow | 3 pliki |
| **Przypinanie wersji** | Nie — zawsze najnowsza | Tak |
| **Weryfikacja sum kontrolnych** | Nie | Tak — SHA256 |
| **Zachowanie konfiguracji** | Automatyczne | Ręczne (wzorce preserve) |
| **Najlepsze dla** | Proste projekty | Organizacje wieloprojektowe |
