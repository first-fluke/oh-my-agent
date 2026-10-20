---
title: Szybki start
description: Uruchom jedno zadanie o ograniczonym zakresie od instalacji po weryfikację, z oczekiwanym wyjściem i odzyskiwaniem.
---

# Szybki start

Aby uruchomić jedno małe zadanie i zapisać konkretny wynik, przygotuj katalog projektu oraz co najmniej jedno obsługiwane CLI AI lub IDE. Instalator może skonfigurować `bun`, `uv`, Serenę, CUE oraz globalne polecenie `oma` na macOS, Linuxie lub Windowsie; wybrana integracja hosta jest wymagana przy pierwszym prompcie, natomiast integracje dostawców i przeglądarki są opcjonalne.

## 1. Zainstaluj

W katalogu projektu uruchom instalator początkowy:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

W Windows PowerShell uruchom:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Interaktywna konfiguracja pyta o język odpowiedzi, dostawców CLI, [dostawców możliwości](./glossary.md#capability-provider), [preset modelu](./glossary.md#model-preset), [preset umiejętności](./glossary.md#skill-preset) projektu oraz ewentualny wariant stosu. Przy pierwszym uruchomieniu zachowaj wartości domyślne, wybierz używanego dostawcę i preset projektu najbardziej zbliżony do repozytorium. Umiejętności każdego presetu oraz [workflowy wymagające umiejętności spoza presetu](./installation.md#workflows-that-need-skills-outside-a-preset) opisano w sekcji [Presety](./installation.md#presets).

Jeśli masz już `bun`, uruchom instalator bezpośrednio:

```bash
bunx oh-my-agent@latest
```

Skrypty początkowe instalują się w bieżącym projekcie. Użyj `oma install --global`, gdy potrzebujesz instalacji na poziomie HOME; przed łączeniem instalacji projektowej i globalnej przeczytaj [Instalację globalną](../guide/global-install.md).


## 2. Sprawdź wynik

Uruchom kontrolę stanu z tego samego katalogu projektu:

```bash
oma doctor
```

Polecenie w trybie tekstowym wypisuje raport z sekcjami takimi jak `CLI Status` i `Skills Status`, a następnie zwraca status wyjścia do powłoki. Dokładne wiersze zależą od hostów zainstalowanych w projekcie:

```text
┌   🩺 oh-my-agent doctor
◇  CLI Status ...
◇  Skills Status ...
$ echo $?
0
```

`oma doctor` może zgłaszać problemy z opcjonalnymi integracjami jako ostrzeżenia. Domyślne przygotowanie AgentMemory jest sprawdzane podczas `oma install` i `oma update`; błędy instalacji, uruchomienia lub kontroli stanu zatrzymują te polecenia. Wybranie `providers.semantic_memory: none` albo `honcho` lub ustawienie `OMA_NO_AGENTMEMORY=1` pomija to przygotowanie.

Dla statusu czytelnego maszynowo `oma doctor --json` kończy się niezerowym kodem wyjścia, gdy raport zawiera problemy. Użyj `oma doctor --profile`, aby sprawdzić rozstrzygnięty model i CLI dla każdej kanonicznej roli agenta.

Jeśli `oma` jest niedostępne, ale Bun jest zainstalowany, uruchom tę samą kontrolę bez polecenia globalnego:

```bash
bunx oh-my-agent@latest doctor
```

Jeśli samo polecenie nadal nie jest dostępne, otwórz nową powłokę albo dodaj katalog binarny menedżera pakietów do `PATH`; sposób instalacji polecenia `oma` pokazuje [Instalacja](./installation.md#method-3-global-install). Jeśli `oma doctor` zgłosi nieprawidłową konfigurację, popraw wskazane pole i uruchom polecenie ponownie. Nie usuwaj `.agents/oma-config.yaml` w ramach odzyskiwania: to konfiguracja należąca do użytkownika, która zachowuje ustawienia podczas aktualizacji.

## 3. Uruchom jedno małe zadanie

Otwórz repozytorium w skonfigurowanym narzędziu AI i poproś o jedną nazwaną umiejętność i jeden samodzielny wynik:

```text
Use the discovered `oma-docs` skill to check one existing link in this project's README. If it is stale, update only that link. Done when you report the inspected target, the exact verification command, and its exit status.
```

Host powinien zidentyfikować wybraną umiejętność, sprawdzić jeden cel i zgłosić albo punktową zmianę linku, albo że link jest już poprawny. Dołącz wyjście polecenia i status wyjścia każdej kontroli, która faktycznie została uruchomiona.

Gdy hook słów kluczowych jest włączony dla wybranego hosta, może uruchomić pasujący workflow. Routing umiejętności wykonuje host albo wybrany workflow, więc dowolny prompt hosta nie gwarantuje hooka, konkretnej umiejętności ani `CHARTER_CHECK`. Kontrakt wykonania powinien mimo to sprawdzić konwencje repozytorium, wprowadzić wyłącznie zmianę w wyznaczonym zakresie i zgłosić jej weryfikację. Dokładne pliki i polecenie zależą od projektu.

Dla zadania przekraczającego granice API i UI wybierz jawnie `/work` albo `/orchestrate`. Dla jednej domeny przejdź do [Wykonania pojedynczej umiejętności](../guide/single-skill.md). [Przewodnik użycia](../guide/usage.md) zawiera dłuższe przykłady.

## 4. Poznaj wartości domyślne przed skalowaniem

OMA rozpoczyna z `model_preset: auto`, Sereną do inteligencji kodu, Agent Memory do pamięci semantycznej, natywnym wyszukiwaniem w sieci i wyłączoną telemetrią. Serena używa współdzielonego transportu `bridge` i automatycznie się aktualizuje, chyba że skonfigurujesz inaczej. Browser DevTools MCP jest opcjonalny; nowa konfiguracja interaktywna najpierw oferuje Aside. Skutki tych ustawień i klucze nadpisywania opisano w [Ważnych wartościach domyślnych](./important-defaults.md).

Jeśli zarządzane zadanie utknie, zacznij od `oma agent status <session-id> [agent-id]`, a następnie sprawdź jego pokwitowanie w `.agents/state/agent-runs/` oraz wstrzykniętą ścieżkę ustrukturyzowanego zgłoszenia. Rekordy te pokazują uruchomienie, zadanie, workspace, kod wyjścia i status weryfikacji. Czytelne dla człowieka pliki `result-*.md` i `progress-*.md` w `.agents/state/memories/` dodają kontekst, gdy są dostępne. Ponów tylko najmniejsze nieudane polecenie po potwierdzeniu, że uruchomienie nie jest już aktywne. [Trwały workflow](./glossary.md#persistent-workflow) pozostaje aktywny do ukończenia albo do chwili wypowiedzenia `workflow done`; odzyskiwanie z pliku stanu opisano w [Workflowach](../core-concepts/workflows.md#persistent-mode-mechanics).

## Następne kroki

- [Ważne wartości domyślne](./important-defaults.md) — priorytety, dostawcy i sposoby odzyskiwania
- [Instalacja](./installation.md) — presety, konfiguracja dostawców, instalacje globalne i aktualizacje
- [Agenci](../core-concepts/agents.md) — 33 pakiety umiejętności i role dispatchu
- [Workflowy](../core-concepts/workflows.md) — planowanie, wykonanie równoległe, QA i tryby trwałe
- [Rozwiązywanie problemów](../guide/troubleshooting.md) — gdy instalacja, dostawca albo hook nie działa zgodnie z oczekiwaniami
