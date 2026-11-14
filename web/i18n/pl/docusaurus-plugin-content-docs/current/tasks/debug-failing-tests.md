---
title: Debugowanie nieprzechodzącego testu
description: Odtwórz niepowodzenie testu, wyizoluj jego przyczynę, wprowadź ograniczoną poprawkę i zweryfikuj regresję istniejącym runnerem testów projektu.
---

# Debugowanie nieprzechodzącego testu {#debug-a-failing-test}

Użyj `oma-debug`, gdy masz nieprzechodzące polecenie, stack trace albo powtarzalny nieprawidłowy wynik.

## Załaduj umiejętność {#load-the-skill}

Poproś agenta kodującego, aby uruchomił to polecenie i przeczytał jego instrukcje oraz katalog pomocniczy:

```bash
bunx skills use first-fluke/oh-my-agent@oma-debug
```

## Dostarcz dane wejściowe {#provide-the-input}

- Dokładne nieprzechodzące polecenie i pełne, istotne wyjście awarii.
- Oczekiwane zachowanie, checkout/ref, wersję runtime'u i wymagane usługi lokalne.
- Pliki albo ostatnią zmianę, którą podejrzewasz, oraz dozwolony zakres edycji.

## Zadaj zadanie {#give-the-task}

Ten konkretny przykład używa fixture'ów regresji bootstrapu wtyczki z tego repozytorium. Dla innego projektu użyj własnego nieprzechodzącego polecenia.

```text
Use oma-debug to investigate the plugin-bootstrap test failure. Reproduce it with:
bun run --cwd cli test --project scripts --maxWorkers 1 plugin-bootstrap.test.ts
Expected behavior: a Bash installer runs through Bash, each project has its own
wiring receipt, and failed wiring never records readiness. Establish the failure
before editing. If the test already passes, report that result rather than
inventing a repair. Limit changes to the bootstrap and relevant regression tests.
Re-run the failing case and related hook fixtures; report commands and exits.
```

## Sprawdź wynik {#check-the-result}

Spodziewaj się odtworzonej awarii, jej ścieżki przyczynowej, ograniczonej poprawki i testu regresji powiązanego z tą awarią. Raport powinien oddzielić niedostępne środowisko od zdiagnozowanego defektu kodu.

Sprawdź, że regresja nie przechodzi dla pierwotnego zachowania i przechodzi z poprawką. Uruchom ponownie podane polecenie w tym samym środowisku, a następnie sprawdź wyniki powiązanych testów. Jeśli odtworzenie nadal jest zablokowane, oczekuj dokładnego blokera i słabszych dostępnych dowodów.

## Zależności i następny krok {#dependencies-and-next-step}

Agent używa runnera testów projektu i skonfigurowanych narzędzi nawigacji po źródłach. Przykład wymaga istniejącego Bun i zależności deweloperskich repozytorium. Te fixture'y wtyczki są pomijane w Windows; użyj nieprzechodzącego testu obsługiwanego przez platformę. Załadowanie umiejętności nie instaluje zależności ani nie naprawia brakującej usługi.

Zobacz [przykład naprawy hooków wtyczki](https://firstfluke.com/oh-my-agent/docs/examples/plugin-hook-repair/), aby poznać rzeczywistą zmianę źródła i granice fixture'ów. Przy zarządzanym wykonaniu albo hookach projektu [wybierz konfigurację runtime'u](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset), która zawiera `oma-debug`.
