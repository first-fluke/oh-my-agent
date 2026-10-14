---
title: "Przewodnik: rozwiązywanie problemów"
sidebar_label: Rozwiązywanie problemów
description: Diagnozuj awarie instalacji, konfiguracji, dostawcy, hooków, dashboardu, harmonogramu, ewaluacji i wyników agentów według objawu albo dokładnego komunikatu błędu, z kontrolami i poprawkami opartymi na źródłach.
---

# Rozwiązywanie problemów

Zacznij od diagnozy czytelnej maszynowo, uruchomionej z katalogu projektu albo katalogu instalacji:

```bash
oma doctor --json
```

Polecenie powinno zakończyć się JSON-em wskazującym ustalenia dotyczące instalacji, dostawcy, konfiguracji i integracji. Dodaj `--profile`, gdy problem dotyczy rozstrzygania modelu albo agenta. Zachowaj JSON przy zgłaszaniu problemu; zawiera wybrane ścieżki i kontrole, bez potrzeby formułowania przypuszczeń w opisie.

## Znajdź swój objaw {#find-your-symptom}

| Objaw | Przejdź do |
|---------|-------|
| OMA odczytuje niewłaściwą konfigurację albo aktualizacja zastąpiła twoje ustawienia | [CLI albo instalacja używa niewłaściwych plików](#the-cli-or-install-is-using-the-wrong-files) |
| `oma install` albo `oma update` nie może pobrać wydania | [Instalacja lub aktualizacja nie może pobrać wydania](#an-install-or-update-cannot-download-the-release) |
| CLI dostawcy albo model się nie uruchamia | [Dostawca nie uruchamia się](#a-vendor-does-not-start) |
| Hooki są zainstalowane, ale nic się nie dzieje | [Hooki są zainstalowane, ale nie działają](#hooks-are-installed-but-do-not-run) |
| Dashboard jest pusty, rozłączony albo nie chce się uruchomić | [Dashboard jest pusty albo rozłączony](#the-dashboard-is-empty-or-disconnected) |
| Brakuje zaplanowanego zadania albo zakończyło się ono niepowodzeniem | [Harmonogramu brakuje albo nie został uruchomiony](#a-schedule-is-missing-or-did-not-run) |
| Ewaluacja albo optymalizacja umiejętności nie raportuje pokrycia | [Raport ewaluacji albo optymalizacji nie pokazuje pokrycia](#evaluation-or-optimization-reports-no-coverage) |
| Uruchomienia agenta nie da się zweryfikować, zakończyć ani wznowić | [Wyniku nie można zakończyć ani wznowić](#a-result-cannot-finish-or-resume) |
| CLI wypisało komunikat błędu | [Znajdź swój błąd](#find-your-error) |

## Znajdź swój błąd {#find-your-error}

Każdy z poniższych komunikatów jest wypisywany przez CLI. Dopasuj początek komunikatu.

| Komunikat | Przyczyna | Poprawka |
|---------|-------|-----|
| `Unknown plan task: <id>` | ID zadania (z `--task-id` albo domyślnie ID agenta) nie jest `id` zadania w `.agents/results/plan-<session>.json` | Przekaż `--task-id` z ID zadania z planu |
| `Plan is immutable after dispatch; ...` | Plan sesji zmienił się po pierwszym wysłaniu | Przywróć plan albo zapisz zmieniony plan pod nowym ID sesji (i nowym `lineage_id`, jeśli go ustawiasz) |
| `Task acceptance contract changed before dispatch` albo `Plan changed before dispatch` | Plan był edytowany w trakcie uruchamiania przebiegu | Spróbuj ponownie, gdy plan będzie stabilny |
| `Attempt limit reached for workflow lineage and logical goal` | Wyczerpano `max_attempts` planu (domyślnie 3, łącznie z pierwszą próbą) | Przejrzyj nieudane próby, zanim zaplanujesz kolejną |
| `Cannot verify a finished run; start a new run` | `oma agent verify` uruchomiono po zakończeniu przebiegu | Rozpocznij nowy przebieg za pomocą `oma agent begin` |
| `Choose a command, --required, or --affected` | `oma agent verify` nie otrzymało trybu weryfikacji albo otrzymało więcej niż jeden | Użyj dokładnie jednego z `--required`, `--affected PATH...` albo `-- <argv>` |
| `No complete test selection for affected paths: ...` | Graf nie ma pełnego wyboru testów dla tych ścieżek | Użyj `--required` |
| `The spawning parent finalizes managed runs; write the claim file instead` | `oma agent finish` wywołano dla przebiegu uruchomionego przez `oma agent spawn` albo `parallel` | Zapisz zgłoszenie we wstrzykniętej ścieżce; rodzic finalizuje przebieg |
| `Resume requires a session plan with task contracts` | Sesja nie ma pliku planu | Wznawianie działa tylko dla sesji opartych na planie; zamiast tego uruchom zadanie ponownie |
| `A resume coordinator already owns this session` | Działa inne `oma agent resume` dla tej sesji albo jego dzierżawa pochodzi z innego hosta | Poczekaj, aż drugie wznowienie się zakończy; dzierżawa pozostawiona przez martwy proces na tym samym hoście jest odzyskiwana automatycznie |
| `No graph-backed context found for <agent>` | Dla tego agenta nie istnieje kontekst grafu | Popraw definicję zadania albo kontynuuj udokumentowaną w projekcie natywną ścieżką wyszukiwania |
| `Dashboard failed: port 9847 is already in use. ...` | Inny proces zajmuje port dashboardu | `DASHBOARD_PORT=8080 oma dashboard web` albo zatrzymaj drugi proces |
| `Invalid DASHBOARD_PORT: ...` | `DASHBOARD_PORT` nie jest liczbą całkowitą od 1 do 65535 | Ustaw poprawny port albo usuń zmienną, aby użyć 9847 |
| `Removed option <old>. Use <new>.` | Polecenie użyło usuniętej pisowni flagi | Użyj flagi wskazanej w komunikacie |
| `Unknown command: ... Use oma --help.` | Ścieżka polecenia została usunięta albo przemianowana | Uruchom `oma --help` albo `oma describe`, aby poznać aktualne ścieżki |
| `oma agent spawn` kończy się kodem 3 | Dostawca zakończył się kodem 0, ale przebieg nie zakończył się stanem `completed` | Przeczytaj `unresolved` w rekordzie uruchomienia; zobacz [Wyniki agentów i wznawianie](./agent-results-and-resume.md) |

## CLI albo instalacja używa niewłaściwych plików {#the-cli-or-install-is-using-the-wrong-files}

Sprawdź jawnie kontekst:

```bash
oma doctor --json
oma doctor --profile
```

| Objaw | Przyczyna | Poprawka |
|---------|-------|-----|
| Ustawienie jest ignorowane albo wygrywa globalna wartość domyślna | Polecenia odczytują globalne wartości domyślne z `$OMA_HOME/.agents/` (domyślnie `~/.oma/.agents/`), następnie najbliższą współdzieloną konfigurację projektu i jedną lokalną nakładkę. Różne nadrzędne katalogi główne projektów nie są scalane | Sprawdź, które ścieżki konfiguracji wybrał `oma doctor --json`, i edytuj plik, który jest faktycznie odczytywany |
| OMA zatrzymuje się podczas wczytywania konfiguracji | Istnieją jednocześnie lokalne pliki CUE i YAML albo lokalny plik jest niepoprawny. OMA zatrzymuje się zamiast po cichu ignorować nadpisanie | Usuń jeden z dwóch lokalnych plików albo popraw niepoprawny |
| Konfiguracja użytkownika została zastąpiona po aktualizacji | Aktualizację uruchomiono z `--force`. Zwykłe aktualizacje zachowują konfigurację należącą do użytkownika; tryb wymuszony może ją zastąpić | Zaktualizuj bez `--force`, a następnie sprawdź konfigurację i wygenerowane ścieżki |

Kolejność plików opisuje [Konfiguracja referencyjna](/docs/guide/configuration-reference). Po aktualizacji sprawdź konfigurację i wygenerowane ścieżki:

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` utrzymuje uruchomienie bez interakcji.

## Instalacja lub aktualizacja nie może pobrać wydania {#an-install-or-update-cannot-download-the-release}

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` oraz naprawa wykonywana przez `oma doctor` pobierają wydanie wskazane przez `prompt-manifest.json` na gałęzi `main`. Najpierw próbują zasobu `agent-skills.tar.gz` z wydania GitHub `cli-v<version>`, sprawdzanego względem jego pliku `.sha256`, potem archiwum źródłowego tego tagu, a na końcu płytkiego klonu tagu. Niezgodność sumy kontrolnej albo payload, którego `.agents/skills/_version.json` wskazuje inną wersję, zatrzymuje uruchomienie zamiast próbować innego źródła.
<!-- oma-docs:ignore-end -->

| Objaw | Przyczyna | Poprawka |
|---------|-------|-----|
| Pobieranie kończy się niepowodzeniem tuż po wydaniu | Manifest wskazuje wersję, której zasoby nadal są publikowane | Poczekaj kilka minut i spróbuj ponownie |
| Potrzebujesz niewydanej zawartości z `main` | Wydania instalują tylko otagowaną zawartość | Włącz to dla jednego uruchomienia za pomocą `OMA_UPDATE_CHANNEL=main oma update` |

```bash
OMA_UPDATE_CHANNEL=main oma update
```

Uruchomienie wypisuje ostrzeżenie: zawartość gałęzi main nie jest ani otagowanym wydaniem, ani zweryfikowana sumą kontrolną.

## Dostawca nie uruchamia się {#a-vendor-does-not-start}

Uruchom własną kontrolę uwierzytelnienia dostawcy, a następnie sprawdź rozstrzygnięty profil OMA:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

| Objaw | Przyczyna | Poprawka |
|---------|-------|-----|
| CLI dostawcy nie jest uwierzytelnione | Sesja dostawcy wygasła albo nigdy nie została skonfigurowana | Uwierzytelnij się ponownie dokładnym poleceniem dostawcy wskazanym przez `oma doctor` |
| Nadpisanie modelu jest odrzucane | Nadpisanie nie ma formy `owner/model` akceptowanej przez schemat albo jego dostawca nie obsługuje wybranego transportu CLI | Użyj formy `owner/model` z dostawcą, który obsługuje ten transport |
| `model_preset: free` nie może połączyć się z bramą | Rozstrzygnięty URL bramy albo model jest błędny albo skonfigurowana zmienna środowiskowa klucza API jest pusta | Sprawdź URL bramy i model za pomocą `oma doctor --profile`, a następnie ustaw klucz w zmiennej środowiskowej |
| Dziecko kończy się bez artefaktu wyniku | Dziecko nie zapisało zgłoszenia we wstrzykniętej ścieżce | Sprawdź katalog uruchomienia i status rodzica (zobacz niżej) |

Jeśli pominiesz mapę `free`, wartości domyślne to `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` i model `auto`; nigdy nie umieszczaj samego klucza API w YAML.

Uruchomione dziecko otrzymuje tożsamość uruchomienia i instrukcje dotyczące wyniku, zapisuje zgłoszenie we wstrzykniętej ścieżce i raportuje swoje artefakty; rodzic finalizuje zarządzane pokwitowanie po zapisaniu kodu wyjścia. Dzieci tylko do odczytu zwracają `OMA_RESULT_JSON: ...`; ta linia jest zapisywana jako inspekcja i nie spełnia wymogu wykonywalnej weryfikacji.

## Hooki są zainstalowane, ale nie działają {#hooks-are-installed-but-do-not-run}

| Objaw | Przyczyna | Poprawka |
|---------|-------|-----|
| Codex nie uruchamia hooków OMA | Hooki nie są jeszcze zaufane: to pierwsza instalacja albo aktualizacja zmieniła ciąg polecenia hooka | Sprawdź `.codex/hooks.json`, a następnie uruchom `/hooks` wewnątrz Codex |

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Podprocesy Codex uruchamiane przez OMA przekazują flagę obejścia dla własnego zarządzanego wywołania; nie oznacza to zaufania hookowi w sesji Codex uruchomionej samodzielnie. Zobacz [Zaufanie hookom Codex](/docs/guide/codex-hook-trust).

## Dashboard jest pusty albo rozłączony {#the-dashboard-is-empty-or-disconnected}

Uruchom dashboard terminalowy z projektu zawierającego pliki sesji:

```bash
oma dashboard terminal
```

| Objaw | Przyczyna | Poprawka |
|---------|-------|-----|
| `No agents detected yet` | Workflow nie zapisał jeszcze plików sesji, zadań ani postępu w obserwowanym katalogu pamięci albo dashboard obserwuje inny katalog | Poczekaj na pierwszy plik postępu; uruchom z katalogu głównego projektu, przekaż `--project-root <path>` albo ustaw `MEMORIES_DIR` |
| Pliki w starszym katalogu `.serena/memories/` się nie pojawiają | Dashboard odczytuje `.agents/state/memories/` i nie przeszukuje starszego katalogu | Ustaw `MEMORIES_DIR` na katalog zawierający te pliki |
| `oma dashboard web` kończy się komunikatem `port 9847 is already in use` | Inny proces zajmuje port | Użyj innego `DASHBOARD_PORT` |
| Strona webowa pozostaje w stanie Disconnected po ponownym uruchomieniu dashboardu | Każde uruchomienie tworzy nowy token dostępu, a otwarta karta nadal przechowuje stary | Przeładuj stronę |

Dashboard webowy wiąże się z loopbackiem i wypisuje swój URL. Otwórz go; strona zawiera własny token dla API webowego i WebSocket.

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Więcej sygnałów dashboardu znajdziesz w [Monitorowaniu dashboardu](./dashboard-monitoring.md#troubleshooting-runbook).

## Harmonogramu brakuje albo nie został uruchomiony {#a-schedule-is-missing-or-did-not-run}

Sprawdź manifest i stan harmonogramu. Pierwsze dwa polecenia są tylko do odczytu; ostatnie dwa zmieniają stan:

```bash
oma schedule list                 # read-only: synced, stale, missing-in-os, orphan-in-os
oma schedule inspect SCHEDULE_ID  # read-only: one manifest entry
oma schedule sync                 # writes: registers missing jobs and rewrites stale ones
oma schedule run SCHEDULE_ID      # executes the job now (normally invoked by the OS scheduler)
```

| Objaw | Przyczyna | Poprawka |
|---------|-------|-----|
| `schedule list` pokazuje `missing-in-os` albo `stale` | Rejestracji w systemie operacyjnym brakuje albo jest nieaktualna | `oma schedule sync` |
| Log uruchomienia pokazuje `Unknown command: schedule:run` | Rejestracja powstała przed zmianą nazwy polecenia | `oma update` synchronizuje ją ponownie automatycznie; `oma schedule sync` również ją przepisuje |
| `schedule list` pokazuje `orphan-in-os` | Zadanie systemu operacyjnego nie ma wpisu w manifeście | `oma schedule sync --prune`, tylko gdy osierocone zadania powinny zostać usunięte |
| Utworzony harmonogram nigdy się nie zarejestrował | Utworzono go z `--dry-run`, które tylko pokazuje podgląd | Utwórz go ponownie bez `--dry-run` |
| Cykliczny interwał nie został zarejestrowany | Interwał wymaga zaokrąglenia | Przejrzyj podgląd, a następnie zaakceptuj zaokrąglenie przez `--accept-rounded` |
| Zadanie zostało uruchomione, ale się nie powiodło | Dostawca zakończył się niezerowym kodem albo log zawiera `re-auth required` | Sprawdź log uruchomienia w `~/.oma/schedule/runs/<id>/` i ponownie uwierzytelnij dostawcę |

## Raport ewaluacji albo optymalizacji nie pokazuje pokrycia {#evaluation-or-optimization-reports-no-coverage}

| Objaw | Przyczyna | Poprawka |
|---------|-------|-----|
| Ewaluacja albo optymalizacja umiejętności nie raportuje pokrycia | W `.agents/eval/<skill>/` jest mniej niż pięć fixture’ów | Dodawaj fixture’y, aż będzie ich co najmniej pięć |
| Tryb mock odrzuca nagrane rollouty | Pochodzenie nagranego rolloutu nie pasuje do bieżącej umiejętności i skrótów fixture’ów | Nagraj ponownie w trybie live; nie kopiuj starego pliku `_rollouts` do nowego katalogu umiejętności i nie traktuj go jako bieżącego dowodu |
| `--apply` odmawia zapisu | `--apply` wymaga ścisłego dodatniego wyniku walidacji oraz przechodzącego podziału testów należącego do runnera | Zachowaj domyślne `--dry-run` podczas przeglądania proponowanego diffu i najpierw napraw nieudaną walidację |

Umiejętność należąca do OMA zmieniona przez `--apply` może zostać nadpisana przez późniejsze `oma update`.

## Wyniku nie można zakończyć ani wznowić {#a-result-cannot-finish-or-resume}

Sprawdź pliki uruchomień i planu:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

| Objaw | Przyczyna | Poprawka |
|---------|-------|-----|
| Zakończone zgłoszenie zostaje odrzucone albo zdegradowane | Nieudane pokwitowanie, zmienione wejścia, brakujące artefakty, nierozwiązane elementy albo zmieniony kontrakt zadania | Przed zakończeniem uruchom `oma agent verify RUN_ID --required` i napraw to, co zgłasza pokwitowanie |
| Wznowienie pozostawia zadanie w stanie `blocked` | Automatyczne wznowienie wymaga `retry_policy: "safe"`, odtwarzalnego promptu i pozostałych prób | Przeczytaj przyczynę w raporcie dry-run. Plan jest zamrażany po pierwszym wysłaniu, więc ustaw `retry_policy` w planie nowej sesji albo uruchom zadanie ponownie ręcznie |
| Wznowienie nie ponawia zadania | Aktywny proces albo przerwana natywna próba bez jasnego wyniku częściowego lub nieudanego zostaje pozostawiona bez zmian, aby zapobiec zduplikowanej pracy | Poczekaj na aktywny proces albo najpierw sfinalizuj natywną próbę |

Pełny cykl życia opisuje strona [Wyniki agentów i wznawianie](./agent-results-and-resume.md).

## Poproś o pomoc {#ask-for-help}

Prosząc o pomoc, dołącz odpowiedni wynik `oma doctor --json`, polecenie, ID sesji/uruchomienia i nierozwiązany komunikat. Nie dołączaj poświadczeń ani zawartości plików zawierających sekrety. Zgłoś problem na [github.com/first-fluke/oh-my-agent/issues](https://github.com/first-fluke/oh-my-agent/issues).

## Zobacz także {#see-also}

- [Korzystanie z OMA](./usage.md#troubleshooting): problemy z konfiguracją, takie jak brakujące umiejętności, CLI i konflikty przestrzeni roboczej
- [Monitorowanie dashboardu](./dashboard-monitoring.md#troubleshooting-runbook): sygnały zawieszonego, awaryjnie zakończonego i rozłączonego dashboardu
- [Wyniki agentów i wznawianie](./agent-results-and-resume.md): rekordy uruchomień, zgłoszenia i odzyskiwanie
- [Słownik](../getting-started/glossary.md): terminy takie jak [rekord uruchomienia i zgłoszenie](../getting-started/glossary.md#run-record-and-claim)
