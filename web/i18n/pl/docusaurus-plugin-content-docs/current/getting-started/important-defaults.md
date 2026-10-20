---
title: Ważne wartości domyślne
description: Wartości domyślne oh-my-agent wpływające na routing, wybór modelu, dostawców, aktualizacje, telemetrię, Browser MCP, transport Sereny i odzyskiwanie workflowów.
---

# Ważne wartości domyślne

Wartości domyślne utrzymują stabilność konfiguracji użytkownika i są rozstrzygane w czasie działania, więc pominięty klucz może zachowywać się inaczej niż jawnie pusta wartość. Użyj tych informacji, gdy harness działa inaczej, niż oczekujesz.

## Wartości domyślne wpływające na pierwsze uruchomienie

| Obszar | Wartość domyślna | Skutek | Nadpisanie |
|---|---|---|---|
| Język odpowiedzi | `en` | Odpowiedzi agentów i workflowów są po angielsku, chyba że konfiguracja projektu wybiera inny obsługiwany język. Jawna instrukcja użytkownika albo sesji może nadal nadpisać domyślny język projektu, jeśli host lub workflow ją obsługuje. | `language` w `.agents/oma-config.yaml` albo `.cue` |
| Routing modeli ([preset modelu](./glossary.md#model-preset)) | `auto` | Używana jest natywna konfiguracja agentów bieżącego runtime’u. Nieznane runtime’y korzystają z `default_cli`, gdy jest ustawione. | `model_preset`, `default_cli` albo `agents.<id>` |
| Inteligencja kodu ([dostawca możliwości](./glossary.md#capability-provider)) | `serena` | Nowa instalacja próbuje zainstalować Serenę i podłącza jej konfigurację MCP. | `providers.code_intelligence: gortex` albo `serena` |
| Strażnik wyszukiwania kodu | `block` | Dopóki skonfigurowany jest dostawca inteligencji kodu, hook PreToolUse odmawia użycia natywnych `Grep`/`Glob` oraz rekurencyjnego wyszukiwania w powłoce (`rg`, `grep -r`, `find -name`) i kieruje agenta do narzędzi dostawcy. Wyszukiwania ograniczone do potwierdzonych wykluczeń lub ścieżek spoza projektu są dozwolone. Hook nie reklamuje obejścia dla kodu źródłowego projektu. | `providers.code_intelligence_guard: off` |
| Pamięć semantyczna | `agentmemory` | Instalacja i aktualizacja ponownie używają działającego endpointu AgentMemory albo instalują i uruchamiają zarządzaną usługę lokalną, a przed zakończeniem sukcesem sprawdzają jej gotowość. Jawne niestandardowe endpointy są sprawdzane bez zastępowania. | `providers.semantic_memory: honcho` albo `none`; `OMA_NO_AGENTMEMORY=1` pomija konfigurację AgentMemory. |
| Wyszukiwanie w sieci | `native` | Wyszukiwanie korzysta z natywnego kanału sieciowego runtime’u, chyba że wybrano dostawcę. | `providers.web` |
| Dostawca dokumentacji | `context7` | Gdy umiejętność tego zażąda, wyszukiwanie dokumentacji korzysta z dostawcy Context7. | `providers.docs` |
| Telemetria | wyłączona | Podczas linkowania OMA zapisuje ustawienia rezygnacji z telemetrii dostawców. | `telemetry: true` |
| Automatyczna aktualizacja CLI | włączona | CLI sprawdza dostępność aktualizacji, chyba że je wyłączysz. | `auto_update_cli: false` |
| Format daty | `ISO` | Daty używają formatu ISO, gdy projekt nie ustawi innego formatu. | `date_format: US` albo `EU` |
| Strefa czasowa | systemowa strefa czasowa | Zaplanowane i raportowane godziny są zgodne z hostem, gdy `timezone` jest pominięte. | `timezone: Australia/Sydney` (albo inna nazwa IANA) |
| Transport Sereny | `bridge` | Sesje współdzielą jeden serwer Sereny na projekt; niedostępny bridge przechodzi na stdio lokalne dla sesji. | `serena.mode: stdio` |
| Automatyczna aktualizacja Sereny | włączona | `oma update` aktualizuje lokalne narzędzie Sereny, gdy jest to możliwe. | `serena.auto_update: false` |
| Browser DevTools MCP | nieustawione | Istniejące wpisy przeglądarek są zachowywane; nowa instalacja interaktywna oferuje `aside`. | `mcp.devtools_browsers: [aside]`, `[chrome]`, `[firefox]` albo `[]` |
| Serena Reaper | ścieżka harmonogramu wyłączona | `serena_reaper.enabled: false` pozostawia okresowe sprzątanie nieaktywne. Interaktywne `oma serena reap` nadal działa. | `serena_reaper.enabled: true` oraz `oma serena reaper enable` |

Nazwy dostawców i wartości domyślne pochodzą z loaderów runtime’u oraz promptów instalatora. Plik konfiguracji wygenerowany przez instalator zawiera komentarze dla dostępnych sekcji; użyj ich jako przewodnika po schemacie właściwym dla danej wersji.

## Priorytet konfiguracji

OMA ładuje globalne wartości domyślne z `$OMA_HOME/.agents/` (domyślnie `~/.oma/.agents/`),
a następnie nakłada na nie wspólną konfigurację najbliższego projektowego `.agents/` oraz jej plik lokalny.
Różne nadrzędne katalogi główne projektów nie są scalane. W każdym z tych zakresów
preferowane jest `oma-config.cue`, a YAML służy jako wartość zapasowa; zachowaj tylko jedną lokalną nakładkę
(`oma-config.local.cue` albo `.yaml`). `OMA_MODEL_PRESET` nadpisuje `model_preset`
po załadowaniu plików. Nieprawidłowa lokalna konfiguracja zatrzymuje ładowanie.

Routing modeli ma dwa szczególne przypadki przed kolejnością stałego presetu:

- Przy `model_preset: auto` używana jest natywna konfiguracja agenta/modelu bieżącego runtime’u. Jawne nadpisania `agents.<id>` nadal mają pierwszeństwo; nieznany runtime może użyć `default_cli`.
- Przy `model_preset: free` potomne uruchomienia używają lokalnej bramy FreeLLMAPI. `free.model` wybiera model bramy i zastępuje przypięcia modeli per agent; gdy go brakuje, używane jest `FREELLM_MODEL` albo zapasowa wartość dostawcy `auto`.

Dla stałego albo własnego presetu obowiązuje następująca kolejność:

1. Jawne nadpisanie `agents.<id>`.
2. Pasujący wpis `model_preset`, wbudowany albo z `custom_presets`.
3. Wpis `orchestrator` presetu, gdy rola nie ma własnego wpisu.
4. `default_cli` jako zapasowy dostawca, gdy wcześniejsze poziomy nie rozstrzygną planu.

Preset `free` dostarcza wartości domyślne dla wszystkich trzech ustawień dostawcy: `base_url` to `http://127.0.0.1:31415/v1`, `api_key_env` to `FREELLM_API_KEY` (akceptowany jest też alias zgodności `FREELLMAPI_API_KEY`), a `model` to `auto`. Nadal potrzebny jest działający klucz API we wskazanej zmiennej środowiskowej; nie ma zapasowego dostawcy. Ustaw te wartości w `oma-config.local.yaml`, gdy mają pozostać lokalne dla komputera, albo użyj `FREELLM_BASE_URL` i `FREELLM_MODEL` do nadpisań na poziomie procesu.

## Wartości domyślne o zaskakujących skutkach

Pominięty klucz `mcp.devtools_browsers` oznacza „pozostaw bieżące wpisy przeglądarek bez zmian”. Jawnie pusta lista usuwa wpisy przeglądarek podczas uzgadniania. Procesy Browser MCP działają osobno dla każdej sesji agenta, więc włączaj je tylko wtedy, gdy zadanie steruje przeglądarką.

Domyślny tryb Sereny `bridge` ogranicza liczbę zduplikowanych procesów serwera językowego, gdy kilku agentów pracuje w jednym projekcie. `stdio` jest sposobem odzyskiwania, gdy lokalny bridge nie może się uruchomić albo gdy ważna jest ścisła izolacja procesów. Serena sama naprawia swoje dzieci serwera językowego przy następnym wywołaniu narzędzia; reaper pamięci jest oddzielny i nie trzeba go włączać do normalnej pracy.

Domyślne ustawienie telemetrii to rezygnacja. Ustawienie `telemetry: true` usuwa wpisy rezygnacji OMA dostawców przy następnym linkowaniu lub aktualizacji, co może ponownie włączyć funkcje dostawcy zależne od telemetrii. To ustawienie steruje zmianami integracji dostawców; nie zmienia plików kosztu sesji zapisywanych przez OMA na potrzeby własnego rozliczania.

## Ścieżki odzyskiwania

| Objaw | Najpierw sprawdź | Odzyskiwanie |
|---|---|---|
| Pliki dostawcy są nieaktualne | `oma doctor` i `oma link --dry-run` | Uruchom `oma link <vendor>` po edycji `.agents/`; zachowaj SSOT jako źródło. |
| Model nie jest akceptowany | `oma doctor --profile` | Przełącz na `auto`, użyj wbudowanego presetu albo zdefiniuj slug modelu pod `models:`. |
| Narzędzia Sereny przekraczają limit czasu | `oma doctor` i sekcja dostawcy | Spróbuj `serena.mode: stdio`; jeśli problemem jest pamięć, wyświetl podgląd za pomocą `oma serena reap --dry-run`. |
| [Trwały workflow](./glossary.md#persistent-workflow) nie chce się zatrzymać | `.agents/state/*-state.json` | Powiedz `workflow done`; sprawdź plik stanu tylko wtedy, gdy workflow nie posprzątał po sobie. |
| Zaplanowany reaper nic nie robi | Sekcja Serena Reaper w `oma doctor` | Ustaw `serena_reaper.enabled: true`, a następnie uruchom `oma serena reaper enable`. |
| Lokalna konfiguracja uniemożliwia start | Ścieżka błędu w `oma doctor` | Popraw albo usuń lokalną nakładkę; nie twórz jednocześnie nakładki `.cue` i `.yaml`. |

Kontynuuj przez [Instalację](./installation.md), [Konfigurację modeli per agent](../guide/per-agent-models.md) albo [semantykę konfiguracji OMA](../guide/oma-config-semantics.md). Problemy, których tu nie wymieniono, opisuje [Rozwiązywanie problemów](../guide/troubleshooting.md).
