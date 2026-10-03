---
title: "Przewodnik: rozwiązywanie problemów"
sidebar_label: Rozwiązywanie problemów
description: Diagnozuj problemy z instalacją, konfiguracją, dostawcą, dashboardem, harmonogramem, ewaluacją i wynikami agentów za pomocą kontroli opartych na źródłach.
---

# Rozwiązywanie problemów

Zacznij od diagnozy czytelnej maszynowo, uruchomionej z katalogu projektu albo katalogu instalacji:

```bash
oma doctor --json
```

Polecenie powinno zakończyć się JSON-em wskazującym ustalenia dotyczące instalacji, dostawcy, konfiguracji i integracji. Dodaj `--profile`, gdy problem dotyczy rozstrzygania modelu albo agenta. Zachowaj JSON przy zgłaszaniu problemu; zawiera wybrane ścieżki i kontrole, bez potrzeby formułowania przypuszczeń w opisie.

## CLI albo instalacja używa niewłaściwych plików

Sprawdź jawnie kontekst:

```bash
oma doctor --json
oma doctor --profile
```

Polecenia projektu odczytują najbliższy `.agents/oma-config.cue` albo `.agents/oma-config.yaml`, a następnie jedną lokalną nakładkę. Polecenie globalne odczytuje katalog instalacji HOME. Jeśli istnieją jednocześnie lokalne pliki CUE i YAML, usuń jeden z nich. Jeśli lokalny plik jest niepoprawny, OMA zatrzymuje się zamiast po cichu ignorować nadpisanie. Zobacz [Konfigurację referencyjną](/docs/guide/configuration-reference).

Po aktualizacji sprawdź konfigurację i wygenerowane ścieżki:

```bash
oma update --ci
oma doctor --json
```

`oma update --ci` utrzymuje uruchomienie bez interakcji. Jeśli konfiguracja użytkownika została nieoczekiwanie zastąpiona, sprawdź, czy użyto `--force`; zwykłe aktualizacje zachowują konfigurację użytkownika, a tryb wymuszony może ją zastąpić.

## Instalacja lub aktualizacja nie może pobrać wydania

<!-- oma-docs:ignore-start -->
`oma install`, `oma update` oraz naprawa wykonywana przez `oma doctor` pobierają wydanie wskazane przez `prompt-manifest.json` na gałęzi `main`. Najpierw próbują zasobu `agent-skills.tar.gz` z wydania GitHub `cli-v<version>`, sprawdzanego względem jego pliku `.sha256`, potem archiwum źródłowego tego tagu, a na końcu płytkiego klonu tagu. Niezgodność sumy kontrolnej albo payload, którego `.agents/skills/_version.json` wskazuje inną wersję, zatrzymuje uruchomienie zamiast próbować innego źródła.
<!-- oma-docs:ignore-end -->

Tuż po utworzeniu wydania manifest może wskazywać wersję, której zasoby nadal są publikowane; poczekaj kilka minut i spróbuj ponownie. Aby celowo zainstalować niewydaną zawartość z gałęzi `main`, włącz to dla danego uruchomienia:

```bash
OMA_UPDATE_CHANNEL=main oma update
```

Uruchomienie wypisuje ostrzeżenie: zawartość gałęzi main nie jest ani otagowanym wydaniem, ani zweryfikowana sumą kontrolną.

## Dostawca nie uruchamia się

Uruchom własną kontrolę uwierzytelnienia dostawcy, a następnie sprawdź rozstrzygnięty profil OMA:

```bash
oma doctor --profile
oma agent spawn AGENT "print the resolved runtime and stop" SESSION --read-only
```

Użyj dokładnego polecenia dostawcy wskazanego przez `oma doctor`, aby uwierzytelnić się ponownie. Nadpisanie modelu musi używać formy `owner/model` akceptowanej przez schemat, a jego dostawca musi obsługiwać wybrany transport CLI. Przy `model_preset: free` sprawdź rozstrzygnięty URL bramy i model za pomocą `oma doctor --profile`, a następnie upewnij się, że skonfigurowana zmienna środowiskowa klucza API zawiera klucz. Jeśli pominiesz mapę `free`, wartości domyślne to `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY` i model `auto`; nigdy nie umieszczaj samego klucza API w YAML.

Jeśli dziecko zakończy się bez artefaktu wyniku, sprawdź katalog uruchomienia i status rodzica. Uruchomione dziecko otrzymuje tożsamość uruchomienia i instrukcje dotyczące wyniku, zapisuje zgłoszenie we wstrzykniętej ścieżce i raportuje swoje artefakty; rodzic finalizuje zarządzane pokwitowanie po zapisaniu kodu wyjścia. Dzieci tylko do odczytu zwracają `OMA_RESULT_JSON: ...`; ta linia jest zapisywana jako inspekcja i nie spełnia wymogu wykonywalnej weryfikacji.

## Hooki są zainstalowane, ale nie działają

W Codex sprawdź wygenerowany plik i przejdź jednorazowy proces zaufania:

```bash
test -f .codex/hooks.json
codex
# inside Codex: /hooks
```

Uruchom `/hooks` po pierwszej instalacji oraz po aktualizacji, która zmieniła ciąg polecenia. Podprocesy Codex uruchamiane przez OMA przekazują flagę obejścia dla własnego zarządzanego wywołania; nie oznacza to zaufania hookowi w sesji Codex uruchomionej samodzielnie. Zobacz [Zaufanie hookom Codex](/docs/guide/codex-hook-trust).

## Dashboard jest pusty albo rozłączony

Uruchom dashboard terminalowy z projektu zawierającego pliki sesji:

```bash
oma dashboard terminal
```

Domyślnie odczytuje `.agents/state/memories/`. Ustaw `MEMORIES_DIR`, gdy stan znajduje się gdzie indziej. Dashboard webowy wiąże się z loopbackiem i wypisuje URL z tokenem:

```bash
MEMORIES_DIR=/path/to/.agents/state/memories DASHBOARD_PORT=9847 oma dashboard web
```

Otwórz dokładny URL wypisany przez polecenie; API webowe i WebSocket wymagają tokenu dashboardu. Jeśli port jest zajęty, użyj innego `DASHBOARD_PORT`. Jeśli nie pojawiają się agenci, sprawdź, czy workflow zapisał pliki sesji, zadań i postępu w wybranym katalogu pamięci. Dashboard nie przeszukuje automatycznie starszego katalogu `.serena/memories/`.

## Harmonogramu brakuje albo nie został uruchomiony

Sprawdź manifest i stan harmonogramu:

```bash
oma schedule list
oma schedule sync
oma schedule run SCHEDULE_ID
```

`schedule list` zgłasza `synced`, `stale`, `missing-in-os` i `orphan-in-os`. `schedule sync` przywraca brakujące zadania i przepisuje przestarzałe rejestracje (wiersz `Unknown command: schedule:run` w logu uruchomienia oznacza, że rejestracja powstała przed zmianą nazwy polecenia; `oma update` synchronizuje ją ponownie automatycznie); dodaj `--prune` tylko wtedy, gdy osierocone zadania systemu operacyjnego powinny zostać usunięte. Podgląd utworzony za pomocą `--dry-run` nie rejestruje zadania. Dla cyklicznego interwału zaakceptuj zaokrąglenie OMA przez `--accept-rounded` po sprawdzeniu podglądu. Sprawdź log uruchomienia w `~/.agents/schedule/runs/<id>/` pod kątem niezerowego kodu wyjścia dostawcy albo komunikatu `re-auth required`.

## Raport ewaluacji albo optymalizacji nie pokazuje pokrycia

Zarówno ewaluacja umiejętności, jak i jej optymalizacja wymagają co najmniej pięciu fixture’ów w `.agents/eval/<skill>/`. W trybie mock zapisane pochodzenie rolloutów musi pasować do bieżącej umiejętności i skrótów fixture’ów. Nagraj ponownie w trybie live, gdy zmienił się fixture albo umiejętność; nie kopiuj starego pliku `_rollouts` do nowego katalogu umiejętności i nie traktuj go jako bieżącego dowodu.

Przy optymalizacji zachowaj domyślne `--dry-run` podczas przeglądania proponowanego diffu. `--apply` wymaga ścisłego dodatniego wyniku walidacji oraz przechodzącego podziału testów należącego do runnera; umiejętność należąca do OMA może zostać nadpisana przez późniejsze `oma update`.

## Wyniku nie można zakończyć ani wznowić

Sprawdź pliki uruchomień i planu:

```bash
ls .agents/state/agent-runs/
oma agent resume SESSION_ID --dry-run
```

Przed zakończeniem uruchom `oma agent verify RUN_ID --required`. Zakończone zgłoszenie z nieudanym pokwitowaniem, zmienionymi wejściami, brakującymi artefaktami, nierozwiązanymi elementami albo zmienionym kontraktem zadania zostaje odrzucone albo zdegradowane. Wznowienie jest automatyczne tylko dla zadań z `retry_policy: "safe"`, odtwarzalnym promptem i pozostałymi próbami. Aktywny proces albo przerwana natywna próba bez jasnego wyniku częściowego lub nieudanego zostaje pozostawiona bez zmian, aby zapobiec zduplikowanej pracy. Zobacz [Wyniki agentów i wznawianie](/docs/guide/agent-results-and-resume).

Prosząc o pomoc, dołącz odpowiedni wynik `oma doctor --json`, polecenie, ID sesji/uruchomienia i nierozwiązany komunikat. Nie dołączaj poświadczeń ani zawartości plików zawierających sekrety.
