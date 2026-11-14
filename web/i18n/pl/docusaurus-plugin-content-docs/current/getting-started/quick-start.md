---
title: Szybki start
description: Wybierz jedną umiejętność lub preset runtime'u, a następnie uruchom pierwsze zadanie o ograniczonym zakresie z obserwowaną weryfikacją.
---

# Szybki start

Sprawdź wynik na jednym ukierunkowanym zadaniu. Załaduj umiejętność w używanym już agencie kodującym albo zainstaluj runtime, gdy potrzebujesz hooków projektowych, wyspecjalizowanych agentów i workflowów. Przewodnik [Wybór konfiguracji](./choose-setup.md) wyjaśnia dostępne ścieżki oraz ich zależności.

## 1. Wybierz konfigurację {#1-install}

Dla poniższego zadania Git wyłącznie do odczytu poproś agenta o załadowanie umiejętności i przeczytanie jej instrukcji oraz katalogu pomocniczego:

```bash
bunx skills use first-fluke/oh-my-agent@oma-scm
```

Przejdź do zadania w kroku 3. Operacje CLI tej umiejętności, pozostałe umiejętności, reguły projektu i usługi zewnętrzne pozostają osobnymi zależnościami. Załadowanie tej umiejętności nie uruchamia instalatora OMA.

### Zainstaluj runtime, gdy jest potrzebny

Instalator początkowy runtime'u może przygotować `bun`, `uv`, Serenę, CUE oraz globalne polecenie `oma`. Wybierz używane już CLI AI lub IDE; integracje dostawców i przeglądarki zależą od planowanych zadań.

W katalogu projektu uruchom instalator początkowy:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

W Windows PowerShell uruchom:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Interaktywna konfiguracja pyta o dostawców CLI, [dostawców możliwości](./glossary.md#capability-provider), [preset modelu](./glossary.md#model-preset), [preset umiejętności](./glossary.md#skill-preset) projektu oraz ewentualny wariant stosu; instalacja zachowuje istniejący język odpowiedzi albo wykrywa język systemu automatycznie. Przy pierwszym uruchomieniu zachowaj wartości domyślne, wybierz używanego dostawcę i preset projektu najbardziej zbliżony do repozytorium. Umiejętności każdego presetu oraz [workflowy wymagające umiejętności spoza presetu](./installation.md#workflows-that-need-skills-outside-a-preset) opisano w sekcji [Presety](./installation.md#presets).

Jeśli masz już `bun`, uruchom instalator bezpośrednio:

```bash
bunx oh-my-agent@latest
```

Skrypty początkowe instalują się w bieżącym projekcie. Użyj `oma install --global`, gdy potrzebujesz instalacji na poziomie HOME; przed łączeniem instalacji projektowej i globalnej przeczytaj [Instalację globalną](../guide/global-install.md).

## 2. Sprawdź wynik

Przy tymczasowym ładowaniu umiejętności potwierdź, że agent przeczytał wybrane instrukcje, i zweryfikuj samo zadanie. Przy instalacji runtime'u uruchom kontrolę stanu z tego samego katalogu projektu:

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

Otwórz istniejące repozytorium Git w swoim narzędziu AI. Użyj załadowanej umiejętności `oma-scm` albo kopii zainstalowanej przez nazwany preset runtime'u. Jeśli użyto wyboru Custom, dołącz `oma-scm` do tego przykładu:

```text
Use oma-scm to inspect this repository's current branch and working tree. Do not edit, stage, commit, or contact remotes. Report staged, unstaged, and untracked changes, with the Git commands and exit statuses actually observed.
```

Porównaj zgłoszoną gałąź i zmiany z rzeczywistym wynikiem Git. Agent powinien podać, które polecenia zostały uruchomione oraz jakie miały statusy wyjścia. To zadanie wyłącznie do odczytu nie wymaga testów kodu ani budowania.

Zwykły prompt nie uruchamia żadnego workflowu; tam, gdzie hook promptu jest włączony, dodaje on doradczą podpowiedź umiejętności. Routing umiejętności wykonuje host albo wybrany workflow, więc dowolny prompt hosta nie gwarantuje hooka ani konkretnej umiejętności. Kontrakt wykonania powinien mimo to sprawdzić konwencje repozytorium, zachować żądany zakres wyłącznie do odczytu i zgłosić zaobserwowane kontrole. Dokładne pliki i polecenie zależą od projektu.

Dla zadania przekraczającego granice API i UI wybierz jawnie `/work` albo `/orchestrate`. Dla jednej domeny przejdź do [Wykonania pojedynczej umiejętności](../guide/single-skill.md). [Przewodnik użycia](../guide/usage.md) zawiera dłuższe przykłady.

## 4. Poznaj wartości domyślne runtime'u przed skalowaniem

Tymczasowe ładowanie umiejętności nie konfiguruje tych domyślnych ustawień runtime'u. Dla hooków projektowych, konfiguracji dostawców lub workflowów zespołowych użyj ścieżki runtime'u opisanej w [Wybór konfiguracji](./choose-setup.md).

OMA rozpoczyna z `model_preset: auto`, Sereną do inteligencji kodu, Agent Memory do pamięci semantycznej, natywnym wyszukiwaniem w sieci i wyłączoną telemetrią. Serena używa współdzielonego transportu `bridge` i automatycznie się aktualizuje, chyba że skonfigurujesz inaczej. Browser DevTools MCP jest opcjonalny; nowa konfiguracja interaktywna najpierw oferuje Aside. Skutki tych ustawień i klucze nadpisywania opisano w [Ważnych wartościach domyślnych](./important-defaults.md).

Jeśli zarządzane zadanie utknie, zacznij od `oma agent status <session-id> [agent-id]`, a następnie sprawdź jego pokwitowanie w `.agents/state/agent-runs/` oraz wstrzykniętą ścieżkę ustrukturyzowanego zgłoszenia. Rekordy te pokazują uruchomienie, zadanie, workspace, kod wyjścia i status weryfikacji. Czytelne dla człowieka pliki `result-*.md` i `progress-*.md` w `.agents/state/memories/` dodają kontekst, gdy są dostępne. Ponów tylko najmniejsze nieudane polecenie po potwierdzeniu, że uruchomienie nie jest już aktywne. [Trwały workflow](./glossary.md#persistent-workflow) pozostaje aktywny do ukończenia albo do chwili wypowiedzenia `workflow done`; odzyskiwanie z pliku stanu opisano w [Workflowach](../core-concepts/workflows.md#persistent-mode-mechanics).

## Następne kroki

- [Wybór konfiguracji](./choose-setup.md) — dla pojedynczej umiejętności, presetu runtime'u albo wtyczki Claude Code
- [Ważne wartości domyślne](./important-defaults.md) — priorytety, dostawcy i sposoby odzyskiwania
- [Instalacja](./installation.md) — presety, konfiguracja dostawców, instalacje globalne i aktualizacje
- [Agenci](../core-concepts/agents.md) — 33 pakiety umiejętności i role dispatchu
- [Workflowy](../core-concepts/workflows.md) — planowanie, wykonanie równoległe, QA i tryby trwałe
- [Rozwiązywanie problemów](../guide/troubleshooting.md) — gdy instalacja, dostawca albo hook nie działa zgodnie z oczekiwaniami
