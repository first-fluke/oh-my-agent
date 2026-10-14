---
title: Dlaczego oh-my-agent
description: Wybierz oh-my-agent, gdy potrzebujesz umiejętności agentów należących do repozytorium, workflowów, wielodostawowego routingu i jawnej weryfikacji.
---

# Dlaczego oh-my-agent {#why-oh-my-agent}

oh-my-agent dodaje warstwę należącą do repozytorium wokół CLI agentów, których zespół już używa. Katalog `.agents/` przechowuje [umiejętności](./glossary.md#skill), [workflowy](./glossary.md#workflow), [definicje agentów](./glossary.md#agent-definition), reguły i konfigurację modeli. Pliki natywne dla dostawców są generowane z tego [źródła prawdy](./glossary.md#ssot), więc ich zachowanie można przeglądać i zmieniać razem z projektem.

## Wybierz go, gdy repozytorium potrzebuje warstwy koordynacji {#choose-it-when-the-repository-needs-the-coordination-layer}

OMA pasuje do projektu, gdy potrzebujesz jednej lub kilku z tych rzeczy:

- **Kilku hostów lub dostawców agentów.** `model_preset: auto` używa natywnej konfiguracji bieżącego runtime'u. Stałe i niestandardowe presety mogą kierować role do innych dostawców; `oma agent spawn` obsługuje dispatch nienatywny.
- **Powtarzalnego workflowu zespołowego.** `/work` obsługuje jedno ograniczone zadanie, `/orchestrate` koordynuje delegowaną pracę, `/ultrawork` uruchamia pracę równoległą z etapami review, a `/ralph` powtarza zadanie z jawną fazą sędziego.
- **Instrukcji należących do repozytorium.** Umiejętności, workflowy, reguły i definicje agentów leżą obok kodu. `oma link` projektuje wybrane pliki do formatów obsługiwanych przez dostawców.
- **Mechanicznych kontroli i trwałych wyników.** Uruchomienia agentów mogą zapisywać ustrukturyzowane potwierdzenia statusu i wyniku, a `oma verify agent <agent-type>` i `oma docs verify` dostarczają jawnych kontroli.

Jeśli projekt używa jednego hosta i nie potrzebuje współdzielonych umiejętności, workflowów ani routingu dostawców, dodatkowe pliki `.agents/` i polecenia CLI mogą nie uzasadniać konfiguracji. OMA jest warstwą koordynacji; nie zastępuje modelu, edytora ani kryteriów akceptacji właściwych dla projektu.

## Weryfikacja jest wybieranym poleceniem {#verification-is-a-command-you-select}

Uruchom `oma verify agent <agent-type> --workspace <path>`, gdy chcesz wykonać kontrole dla roli backendowej, frontendowej, mobilnej, QA, debugowania lub planowania. Weryfikator łączy inspekcje statyczne ze skonfigurowanymi poleceniami, takimi jak testy, kontrola typów, kontrole SQL lub `flutter analyze`; zobacz [`cli/commands/verify/report.ts`](https://github.com/first-fluke/oh-my-agent/blob/main/cli/commands/verify/report.ts). Raport pokazuje wynik każdej kontroli. Przejście tych kontroli nie dowodzi, że funkcja spełnia wymagania produktu lub domeny, dlatego kryteria akceptacji zadania nadal wymagają przeglądu.

`/ralph` dodaje osobną fazę [sędziego](./glossary.md#judge), gdy wybierzesz ten workflow. Ponownie sprawdza zadeklarowane kryteria w kolejnych iteracjach i zapisuje artefakty workflowu; nie jest bramką uruchamianą dla każdego zwykłego promptu. Samo załadowanie umiejętności także nie uruchamia każdego workflowu ani polecenia weryfikacji.

## Dispatch pozostaje widoczny {#dispatch-remains-visible}

`oma doctor --profile` pokazuje rozstrzygniętego dostawcę i model dla każdej roli dispatchu. `oma agent spawn <agent-id> <prompt> <session-id>` jest jawną ścieżką CLI, gdy rolą nie zajmuje się bieżący host. Reguły rozstrzygania modelu i zachowanie zależne od dostawcy opisano w [Ważnych wartościach domyślnych](./important-defaults.md) i [Modelach per agent](../guide/per-agent-models.md).

Hooki mogą aktywować workflow tylko wtedy, gdy włączona jest odpowiednia integracja hosta. Natywny routing umiejętności wykonuje host, a routing workflowu wynika z wybranego workflowu lub hooka; zwykły prompt nie gwarantuje uruchomienia konkretnej umiejętności ani bramki.

Opcjonalne mechanizmy koordynacji opisano w [limicie sesji](../guide/configuration-reference.md#session-quota-caps), w [pętli retry i eksploracji `/orchestrate`](../core-concepts/workflows.md#orchestrate) oraz w [przypisywaniu workspace'ów](../core-concepts/parallel-execution.md#workspace-aware-pattern).

## Praktyczny kompromis {#the-practical-trade-off}

OMA daje zespołowi wspólne miejsce do definiowania routingu, kroków wykonania, kontroli i plików wyjściowych. W zamian zespół musi utrzymywać tę konfigurację repozytorium i decydować, które workflowy lub polecenia weryfikacji należą do kontraktu akceptacji. Taki kompromis jest użyteczny, gdy spójność między współtwórcami jest ważniejsza niż najmniejsza możliwa instalacja.

Oryginalną dyskusję o pozycjonowaniu znajdziesz w [issue #155](https://github.com/first-fluke/oh-my-agent/issues/155#issuecomment-4142133589).

## Następne kroki {#next-steps}

- [Szybki start](./quick-start.md): zainstaluj, sprawdź konfigurację i uruchom jedno zadanie o ograniczonym zakresie
- [Ważne wartości domyślne](./important-defaults.md): co instalator włącza i jak to zmienić
- [Instalacja](./installation.md#presets): wybierz preset umiejętności obejmujący workflowy, których zamierzasz używać
- [Workflowy](../core-concepts/workflows.md): kiedy używać `/work`, `/orchestrate`, `/ultrawork` i `/ralph`
- [Rozwiązywanie problemów](../guide/troubleshooting.md): poprawki problemów z instalacją, dostawcami i hookami
