---
title: Naprawa hooków wtyczki i bootstrapu projektu
description: Jak naprawiono ścieżki hooków marketplace, provisioning Bash i pokwitowania bootstrapu projektu, wraz z fixture'ami regresji.
---

# Naprawa hooków wtyczki i bootstrapu projektu {#repairing-plugin-hooks-and-project-bootstrap}

Naprawa wtyczki w [`2a29d3a8`](https://github.com/first-fluke/oh-my-agent/commit/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c) dotyczyła dispatchu hooków i zachowania bootstrapu. Jej rodzic, `82649cbd`, jest stanem sprzed tej zmiany i służy do porównania.

## Mechanizm awarii {#failure-mechanism}

[Stary manifest hooków](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/hooks/hooks.json) wywoływał pliki pod `${CLAUDE_PLUGIN_ROOT}/.claude/hooks/`. Te ścieżki zależą od wygenerowanych plików; fixture ze świeżym cache wtyczki nie umieszcza ich w katalogu wtyczki.

[Stary bootstrap](https://github.com/first-fluke/oh-my-agent/blob/82649cbd70fe1a1997bf149241fbcfb629510c5e/scripts/plugin-bootstrap.sh) uruchamiał też pobrany instalator Bash przez `sh -c`. Jego znacznik sukcesu leżał we współdzielonych danych wtyczki, a szybka ścieżka sprawdzała tylko ten znacznik, wersję CLI i obecność pliku ustawień projektu. Drugi projekt z plikiem ustawień mógł więc pominąć własne podłączenie.

## Naprawa {#repair}

[Nowy dispatcher](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.sh) wywołuje zainstalowane CLI. Gdy pasujący wykonywalny hook projektu już obsługuje zdarzenie, hook marketplace ustępuje mu, aby zdarzenie nie zostało wysłane dwukrotnie.

[Nowy bootstrap](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.sh):

- Uruchamia instalator Bash przez Bash i sprawdza niepowodzenia provisioningu.
- Wymusza instalację projektu nawet wtedy, gdy dziedziczone jest ustawienie instalacji globalnej.
- Zapisuje pokwitowanie w `.agents/state/plugin-bootstrap.version` tego projektu.
- Przed ponownym użyciem pokwitowania sprawdza konfigurację, metadane wersji, wykonywalny wrapper i zarejestrowane zdarzenia.
- Zachowuje diagnostykę nieudanej instalacji w `.agents/state/plugin-bootstrap.last-error.log` bez zapisywania pokwitowania sukcesu.

## Odtwórz kontrole regresji {#reproduce-the-regression-checks}

Użyj jednorazowego checkoutu `2a29d3a8eb4d760e4e4000b484c9f04761c59f5c` z już dostępnymi Bun i zależnościami deweloperskimi repozytorium. Z jego katalogu głównego:

```bash
bun run --cwd cli test --project scripts --maxWorkers 1 \
  plugin-bootstrap.test.ts plugin-hook.test.ts plugin-install.integration.test.ts
```

Fixture'y obejmują osobne granice:

| Fixture | Co sprawdzają jego asercje |
|---|---|
| [Bootstrap](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-bootstrap.test.ts) | Provisioning wyłącznie przez Bash, osobne pokwitowania projektów, konfiguracja tylko w CUE, niekompletne podłączenie, niepowodzenia wersji i zachowana diagnostyka. |
| [Dispatch hooków](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-hook.test.ts) | Dispatch ze świeżego cache, budżety czasu handlerów, zachowanie payloadu, własność pasującego hooka projektu oraz fallback, gdy tej własności brakuje albo jest nieprawidłowa. |
| [Integracja instalacji](https://github.com/first-fluke/oh-my-agent/blob/2a29d3a8eb4d760e4e4000b484c9f04761c59f5c/scripts/plugin-install.integration.test.ts) | Dwie instalacje projektowe, zachowane ustawienia użytkownika, jedno dostarczenie prompt/Stop przez obie rejestracje oraz ponowienie po nieudanym podłączeniu. |

Te fixture'y tworzą katalogi tymczasowe i fałszywe polecenia CLI; fixture integracyjny używa rzeczywistego kompozytora hooków. Sprawdzają dispatch powłoki i zapisane skutki bez instalacji marketplace i bez wywołania modelu. Zestawy są pomijane w Windows.

## Co pozostaje do sprawdzenia w rzeczywistej sesji {#what-remains-to-check-in-a-real-session}

Przechodzący przebieg fixture'ów nie dowodzi działającej sesji Claude Code. W rzeczywistym projekcie docelowym sprawdź pokwitowanie i konfigurację, uruchom `oma doctor`, uruchom sesję ponownie i przećwicz właściwe zachowanie promptu oraz Stop, sprawdzając zaobserwowane skutki. Dostępność CLI, poświadczenia, zachowanie dostawcy i polityka hooków hosta potrzebują własnych dowodów.

Przy tym samym podejściu odtwórz–napraw–zweryfikuj dla innej awarii zacznij od [debugowania nieprzechodzącego testu](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). [Wybierz konfigurację](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/) wyjaśnia, kiedy potrzebny jest runtime projektu.
