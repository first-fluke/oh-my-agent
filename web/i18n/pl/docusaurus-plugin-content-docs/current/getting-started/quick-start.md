---
title: Szybki start
description: Uruchom jedno zadanie o ograniczonym zakresie od instalacji po weryfikację, z oczekiwanym wyjściem i odzyskiwaniem.
---

# Szybki start

Użyj tej strony, aby uruchomić jedno małe zadanie i zapisać konkretny wynik. Potrzebujesz katalogu projektu oraz co najmniej jednego obsługiwanego CLI AI lub IDE. Instalator może skonfigurować `bun`, `uv`, Serenę i CUE na macOS, Linuxie lub Windowsie; wybrana integracja hosta jest wymagana przy pierwszym prompcie, natomiast integracje dostawców i przeglądarki są opcjonalne.

## 1. Zainstaluj

### Najszybsza ścieżka — umiejętności do Twoich agentów

```bash
npx skills add first-fluke/oh-my-agent
```

To instaluje pakiet umiejętności OMA w wykrytych runtime'ach agentów (Claude Code, Cursor, Codex i inne). Umiejętności uczą agenta, jak pracować. Aby uzyskać bramki hooka Stop, weryfikację artefaktów, niezależnych sędziów i CLI `oma`, zainstaluj poniżej pełny harness.

Instalacje samych umiejętności nie dostarczają CLI `oma`, hooków, workflowów ani sędziów. Do pierwszego zadania poniżej użyj nazwanej, zainstalowanej umiejętności; pełnego harnessu użyj, gdy potrzebujesz kontroli CLI.

### Pełny harness (bramki, hooki, CLI)

W katalogu projektu uruchom instalator początkowy:

```bash
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

W Windows PowerShell uruchom:

```powershell
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Interaktywna konfiguracja pyta o język odpowiedzi, dostawców CLI, dostawców możliwości, preset modelu, preset umiejętności projektu oraz ewentualny wariant stosu. Przy pierwszym uruchomieniu zachowaj wartości domyślne, wybierz używanego dostawcę i preset projektu najbardziej zbliżony do repozytorium.

Jeśli masz już `bun`, uruchom instalator bezpośrednio:

```bash
bunx oh-my-agent@latest
```

Skrypty początkowe instalują się w bieżącym projekcie. Użyj `oma install --global`, gdy potrzebujesz instalacji na poziomie HOME; przed łączeniem instalacji projektowej i globalnej przeczytaj [Instalację](./installation.md).

## 2. Sprawdź wynik (tylko pełny harness)

Jeśli zainstalowano pełny harness, uruchom kontrolę stanu z tego samego katalogu projektu:

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

Opcjonalne integracje MCP, przeglądarki, pamięci lub inteligencji kodu mogą pojawić się jako ostrzeżenia; są potrzebne tylko przy zadaniach, które z nich korzystają. Dla statusu czytelnego maszynowo `oma doctor --json` kończy się niezerowym kodem wyjścia, gdy raport zawiera problemy. Użyj `oma doctor --profile`, aby sprawdzić rozstrzygnięty model i CLI dla każdej kanonicznej roli agenta.

Jeśli `oma` jest niedostępne, ale Bun jest zainstalowany, uruchom tę samą kontrolę bez polecenia globalnego:

```bash
bunx oh-my-agent@latest doctor
```

Jeśli samo polecenie nadal nie jest dostępne, otwórz nową powłokę albo dodaj katalog binarny menedżera pakietów do `PATH`. Jeśli `oma doctor` zgłosi nieprawidłową konfigurację, popraw wskazane pole i uruchom polecenie ponownie. Nie usuwaj `.agents/oma-config.yaml` w ramach odzyskiwania: to konfiguracja należąca do użytkownika, która zachowuje ustawienia podczas aktualizacji.

Jeśli zainstalowano same umiejętności, pomiń tę kontrolę CLI i przejdź do zadania z nazwaną umiejętnością poniżej.

## 3. Uruchom jedno małe zadanie

Otwórz repozytorium w skonfigurowanym narzędziu AI i poproś o jedną nazwaną umiejętność i jeden samodzielny wynik:

```text
Use the discovered `oma-docs` skill to check one existing link in this project's README. If it is stale, update only that link. Done when you report the inspected target, the exact verification command, and its exit status.
```

Host powinien zidentyfikować wybraną umiejętność, sprawdzić jeden cel i zgłosić albo punktową zmianę linku, albo że link jest już poprawny. Dołącz wyjście polecenia i status wyjścia każdej kontroli, która faktycznie została uruchomiona. Instalacja samych umiejętności nie dodaje `/debug`, `/ralph`, hooków ani bramek workflowów; poproszenie o nazwaną umiejętność utrzymuje to pierwsze zadanie w granicach zainstalowanych możliwości.

Gdy hook słów kluczowych jest włączony dla wybranego hosta, może uruchomić pasujący workflow. Routing umiejętności wykonuje host albo wybrany workflow, więc dowolny prompt hosta nie gwarantuje hooka, konkretnej umiejętności ani `CHARTER_CHECK`. Kontrakt wykonania powinien mimo to sprawdzić konwencje repozytorium, wprowadzić wyłącznie zmianę w wyznaczonym zakresie i zgłosić jej weryfikację. Dokładne pliki i polecenie zależą od projektu.

Dla zadania przekraczającego granice API i UI wybierz jawnie `/work` albo `/orchestrate`. Dla jednej domeny przejdź do [Wykonania pojedynczej umiejętności](../guide/single-skill.md). [Przewodnik użycia](../guide/usage.md) zawiera dłuższe przykłady.

## 4. Poznaj wartości domyślne przed skalowaniem

OMA rozpoczyna z `model_preset: auto`, Sereną do inteligencji kodu, Agent Memory do pamięci semantycznej, natywnym wyszukiwaniem w sieci i wyłączoną telemetrią. Serena używa współdzielonego transportu `bridge` i automatycznie się aktualizuje, chyba że skonfigurujesz inaczej. Browser DevTools MCP jest opcjonalny; nowa konfiguracja interaktywna najpierw oferuje Aside. Skutki tych ustawień i klucze nadpisywania opisano w [Ważnych wartościach domyślnych](./important-defaults.md).

Jeśli zarządzane zadanie utknie, zacznij od `oma agent status <session-id> [agent-id]`, a następnie sprawdź jego pokwitowanie w `.agents/state/agent-runs/` oraz wstrzykniętą ścieżkę ustrukturyzowanego zgłoszenia. Rekordy te pokazują uruchomienie, zadanie, workspace, kod wyjścia i status weryfikacji. Czytelne dla człowieka pliki `result-*.md` i `progress-*.md` w `.agents/state/memories/` dodają kontekst, gdy są dostępne. Ponów tylko najmniejsze nieudane polecenie po potwierdzeniu, że uruchomienie nie jest już aktywne. Trwały workflow pozostaje aktywny do ukończenia albo do chwili wypowiedzenia `workflow done`; odzyskiwanie z pliku stanu opisano w [Workflowach](../core-concepts/workflows.md#persistent-mode-mechanics).

## Następne kroki

- [Ważne wartości domyślne](./important-defaults.md) — priorytety, dostawcy i sposoby odzyskiwania
- [Instalacja](./installation.md) — presety, konfiguracja dostawców, instalacje globalne i aktualizacje
- [Agenci](../core-concepts/agents.md) — 33 pakiety umiejętności i role dispatchu
- [Workflowy](../core-concepts/workflows.md) — planowanie, wykonanie równoległe, QA i tryby trwałe
