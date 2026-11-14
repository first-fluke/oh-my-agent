---
title: Przegląd kodu AI przed scaleniem
description: Przejrzyj kod napisany przez AI pod kątem błędów, brakujących kontroli i regresji, używając ograniczonego diffa i powtarzalnych ustaleń.
---

# Przegląd kodu AI przed scaleniem {#review-ai-code-before-merging}

Użyj `oma-qa`, aby przejrzeć zmianę względem zamierzonego zachowania. Zacznij od diffa i istniejących kontroli projektu.

## Załaduj umiejętność {#load-the-skill}

Poproś agenta kodującego, aby uruchomił to polecenie, a następnie przeczytał zwrócone instrukcje oraz katalog pomocniczy:

```bash
bunx skills use first-fluke/oh-my-agent@oma-qa
```

## Dostarcz dane wejściowe {#provide-the-input}

- Zmianę albo lokalny ref porównania, na przykład `origin/main`.
- Oczekiwane zachowanie, zwłaszcza uprawnienia, zmiany danych i obsługę awarii.
- Istniejące polecenia lint/test oraz ewentualne ograniczenia środowiska.

## Zadaj zadanie {#give-the-task}

```text
Use oma-qa to review this branch's diff against origin/main. Focus on
authorization mistakes, unintended data changes, and regressions in error
handling. Read the affected callers and tests. Keep application source unchanged.
Run the existing focused checks that apply, without installing tools or running
a build. For each confirmed finding, give severity, file:line, the trigger,
observed evidence, and a concrete fix. Report unavailable checks separately.
```

## Sprawdź wynik {#check-the-result}

Spodziewaj się uporządkowanych ustaleń z odtworzeniem albo rozstrzygającym dowodem w kodzie, sugerowanej poprawki i faktycznie uruchomionych poleceń. Jeśli nie potwierdzono defektu, raport powinien mimo to wskazać sprawdzony zakres i pozostałe luki.

Otwórz każdą cytowaną lokalizację i sprawdź, że wyzwalacz do niej dociera. Uruchom ponownie wąską kontrolę użytą jako dowód. Brakujące narzędzie albo nieprzetestowana ścieżka to luka weryfikacji; samo podsumowanie przeglądu nie dowodzi, że zmianę można bezpiecznie wydać.

## Zależności i następny krok {#dependencies-and-next-step}

Agent potrzebuje dostępu do diffa, lokalnego źródła i istniejących narzędzi kontroli projektu. Kontrole przeglądarki, bezpieczeństwa i wydajności potrzebują odpowiadającego im celu i narzędzi. Załadowanie umiejętności nie dostarcza tych zależności.

Przy potwierdzonej awarii przejdź do [debugowania nieprzechodzącego testu](https://firstfluke.com/oh-my-agent/docs/tasks/debug-failing-tests/). Jeśli potrzebujesz hooków projektu albo workflowów zespołowych, [wybierz konfigurację runtime'u](https://firstfluke.com/oh-my-agent/docs/getting-started/choose-setup/#install-a-skill-preset), która zawiera `oma-qa`.
