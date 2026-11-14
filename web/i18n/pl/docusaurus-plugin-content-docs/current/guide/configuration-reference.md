---
title: "Przewodnik: konfiguracja referencyjna"
sidebar_label: Konfiguracja referencyjna
description: Obsługiwane lokalizacje konfiguracji OMA, priorytety, typowane klucze, wartości domyślne i zasady własności aktualizacji.
---

# Konfiguracja referencyjna

OMA odczytuje konfigurację z `.agents/oma-config.cue` albo `.agents/oma-config.yaml`. Lokalna nakładka, `.agents/oma-config.local.cue` albo `.agents/oma-config.local.yaml`, służy do ustawień właściwych dla komputera, które nie powinny trafić do współdzielonego pliku.

Uruchom to w projekcie, którego konfigurację chcesz sprawdzić:

```bash
oma doctor --profile
```

Oczekiwany wynik to rozstrzygnięty profil pokazujący wybrany preset i plan modeli per agent. Jeśli polecenie zgłosi błąd parsowania, popraw najbliższą warstwę konfiguracji przed zmianą ustawień modeli.

## Który plik wygrywa

Loader odczytuje globalne wartości domyślne z `$OMA_HOME/.agents/` (domyślnie
`~/.oma/.agents/`), a następnie przechodzi w górę od bieżącego katalogu i zatrzymuje się przy
najbliższym projektowym katalogu `.agents/`. W każdym wybranym katalogu:

1. `oma-config.yaml` dostarcza wspólne wartości.
2. `oma-config.cue`, jeśli istnieje i jest poprawny, nadpisuje każdy klucz, który ustawia; klucze YAML, których nie ustawia, pozostają. Jeśli pliku CUE nie można ocenić, OMA ostrzega i używa wyłącznie pliku YAML.
3. Jeden plik lokalny (`oma-config.local.cue` albo `.local.yaml`) jest scalany na wierzchu wspólnego wyniku.

Wspólny/lokalny wynik projektu nadpisuje wspólny/lokalny wynik globalny.
Ustawione `OMA_MODEL_PRESET` nadpisuje `model_preset` po wszystkich warstwach plików.
Pełną kolejność, diagram przepływu i rozwiązywanie problemów opisano w
[Ładowaniu konfiguracji](/docs/guide/oma-config-semantics#precedence-table).

Mapy są scalane rekurencyjnie. Tablice, skalary i `null` zastępują wartość wspólną. Obecność obu lokalnych formatów jest błędem. Błędny lokalny plik kończy działanie, aby prywatne nadpisanie nie mogło zostać po cichu pominięte.

Różne nadrzędne katalogi główne projektów nie są scalane. Pusty najbliższy projektowy
`.agents/` nadal wyznacza tę granicę. Wycofana instalacja `~/.agents/`
jest wejściem migracji i nie jest odczytywana jako zapasowa warstwa projektu. Globalne wartości domyślne nie
zmieniają tożsamości bieżącego projektu ani zakresu jego pamięci.

## Klucze najwyższego poziomu {#top-level-keys}

Poniższe klucze są odczytywane przez bieżący schemat runtime’u albo przez dostarczonych konsumentów OMA. Klucz oznaczony jako sparse jest celowo częściowy: pomiń zagnieżdżoną wartość, aby zachować domyślne ustawienie kodu.

| Klucz | Typ lub akceptowane wartości | Wartość domyślna przy braku | Przeznaczenie |
| --- | --- | --- | --- |
| `language` | string | `en` | Język odpowiedzi używany przez workflowy i umiejętności. Instalacja zachowuje istniejącą wartość albo inicjuje ją z języka systemu bez pytania. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` w dostarczonym szablonie | Wybór głosu dla `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` w dostarczonym szablonie; pominięcie nie ustawia jawnego nadpisania | Preferencja formatowania dat. |
| `timezone` | nazwa IANA | systemowa strefa czasowa | Daty używane w harmonogramach i raportach. |
| `auto_update_cli` | boolean | `true` | Tła sprawdzające wersję CLI; wyłącz je wartością `false`. |
| `telemetry` | boolean | `false` | Zgoda na telemetrię dostawcy używana podczas instalacji, aktualizacji i uzgadniania linków. |
| `model_preset` | niepusty string | `auto` w nowych szablonach | Wbudowany albo własny preset modeli. `OMA_MODEL_PRESET` nadpisuje go dla jednego procesu. |
| `free` | `base_url`, `api_key_env`, `model` | nieustawione | Starsza pisownia `providers.free` (`model` to tam `default_model`); nadal jest odczytywana, a `oma update` ją przenosi. |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory`; sekcje poświadczeń `brave`, `exa`, `honcho`; każdy inny `<name>` → obiekt dostawcy LLM | `context7`, `native`, `serena`, `block`, `agentmemory`; brak poświadczeń i dostawców LLM | Wybór dostawców dokumentacji, wyszukiwania, inteligencji kodu i pamięci semantycznej, przechowywanie odwołań do ich poświadczeń oraz deklaracja endpointów LLM, przez które można kierować agentów. Zobacz [Dostawcy](#providers). |
| `brave`, `exa`, `honcho` | jak pod `providers` | nieustawione | Starsze pisownie najwyższego poziomu dla `providers.brave`, `providers.exa` i `providers.honcho`; nadal są odczytywane, a `oma update` je przenosi. |
| `agents` | ID agenta → `model`, opcjonalne `effort`, `thinking`, `memory`; `default` → `cli`, `effort`, `thinking`, `memory` | rozstrzygnięcie presetu; `default.cli` wraca do `claude` (`codex` dla trasy dostawcy) | Nadpisania per agent stosowane na wybranym presecie. Effort to `none`, `low`, `medium`, `high` albo `xhigh`; memory to `user`, `project` albo `local`. `agents.default` uzupełnia te pola każdej roli, która ich nie ustawia, a jego `cli` (jedno z `claude`, `codex`, `cursor`, `antigravity`, `qwen`, `grok`, `kimi`, `kiro`, `opencode`, `pi`) jest vendorem używanym, gdy nic innego go nie wybiera: niewykryty runtime przy `auto` albo trasa dostawcy po `--vendor`, `OMA_RUNTIME_VENDOR` i wykrytym runtime’ie. Model w postaci `<provider>/<model-id>` kieruje rolę przez tego dostawcę LLM. |
| `models` | slug modelu → mapowanie CLI | nieustawione | Wstawiane definicje modeli dla obsługiwanych CLI dostawców. |
| `custom_presets` | preset → opis, opcjonalne `extends`, `agent_defaults` | nieustawione | Presety użytkownika; `extends` może dziedziczyć po wbudowanym presecie. |
| `vendors` | `string[]` wybranych ID dostawców (YAML i CUE) | brak: `oma link` używa każdego dostawcy możliwego do linkowania, `oma update` używa dostawców, których katalogi projektu istnieją | Wybór integracji dostawców, które `oma install` i `oma update` projektują. Mapa możliwości dispatchu znajduje się w zarządzanej konfiguracji orkiestracji; zobacz [metadane wyboru dostawcy i dispatchu](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | ID dostawcy | nieustawione | Starsza pisownia `agents.default.cli`; nadal jest odczytywana, a `oma update` ją przenosi. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | każdy pominięty wymiar nie ma limitu | Zapisane użycie tokenów i limity uruchomień sprawdzane przed następnym uruchomieniem agenta; zobacz [limity kwot sesji](#session-quota-caps). |
| `diagnostic_feedback` | `enabled`, `host_diagnostics`, `timeout_ms` | automatycznie dla obsługiwanych hostów terminalowych, `false`, `1400` | Porównuje diagnostykę Sereny przed i po natywnych edycjach plików; zobacz [Informacja zwrotna diagnostyki](#diagnostic-feedback). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | Zachowanie `oma docs verify` i wykluczenia skanowania. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Transport MCP Sereny i zachowanie aktualizacji. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` albo `[]` | nieustawione = pozostaw istniejącą konfigurację | Wybór Browser DevTools MCP podczas uzgadniania. Jawnie pusta lista usuwa wybrane wpisy przeglądarek. |
| `video` | częściowa mapa należąca do umiejętności | domyślna umiejętności; zobacz [Generowanie wideo](/docs/guide/video-generation) | Routing wideo, kolejność dostawców, wynik, koszty, limity i ustawienia odświeżania HyperFrames. |
| `image` | częściowa mapa należąca do umiejętności | domyślna umiejętności; zobacz [Generowanie obrazów](/docs/guide/image-generation) | Dostawca obrazów, rozmiar, jakość, wynik, porównanie i ustawienia kosztów. |
| `voice` | `backend`, `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | `backend: auto`; pozostałe klucze: domyślna umiejętności; zobacz [Workflowy treści i badań](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Backend mowy (`auto`, `voicebox`, `voicestudio`; używany też przez narrację `oma video`), profil, wynik i limity długości. |
| `hwp` | `format`, `version.*`, `output.*` | domyślna umiejętności; zobacz [Workflowy treści i badań](/docs/guide/content-and-research#extract-hwp-family-documents) | Format Kordoc, kanał wersji i lokalizacja wyniku. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | domyślna umiejętności; zobacz [Workflowy treści i badań](/docs/guide/content-and-research#extract-pdf-content) | Ekstrakcja PDF, OCR, obrazy i ustawienia nadpisywania. |
| `scholar` | `base_url` | domyślna umiejętności; zobacz [Workflowy treści i badań](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Host endpointu Knows; kształt protokołu pozostaje własnością umiejętności. |
| `diagram` | `engine`, `explain_sidecar`, `archify.path`, `archify.quality`, `archify.open` | domyślna umiejętności; zobacz [Diagram Engine](/docs/guide/diagram-engine) | Wybór Mermaid/archify oraz ustawienia przypięcia i jakości archify. Wycofane `archify.managed`, `archify.channel` i `archify.check_interval_min` są ignorowane z powiadomieniem, a `oma update` je usuwa. |
| `market` | `path`, `python`, `save_dir` | domyślna umiejętności; zobacz [Badania rynku](/docs/guide/market-research) | Przypięcie silnika last30days, interpreter i lokalizacja wyników. Wycofane `managed`, `channel` i `check_interval_min` są ignorowane z powiadomieniem, a `oma update` je usuwa. |

Dostarczony szablon zawiera też bloki należące do konsumentów. Ich bieżące klucze i wartości domyślne to:

| Blok | Klucze odczytywane przez konsumenta | Wartość domyślna | Skutek |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | zachowaj 100 sesji; usuń artefakty Sereny starsze niż 50 dni; `0` wyłącza usuwanie według wieku | Wartości domyślne `oma memory gc`; flagi polecenia je nadpisują. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Steruje zaplanowaną ścieżką czyszczenia LSP Sereny. Interaktywne `oma serena reap` pozostaje jawne; ciche uruchomienia zaplanowane są opcjonalne. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Włącza guard hooka stop i ustawia budżet kodu na plik. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | dostarczony szablon włącza conventional commits i ochronę PR, z tożsamością współautora oraz listami nazw plików z szablonu | Steruje umiejętnością SCM, hookiem commita i guardem wzorców sekretów. Przed włączeniem trailerów współautora zastąp wartości tożsamości z szablonu własnymi. |

Bloki te są akceptowane przez przekazywanie konfiguracji i interpretowane przez odpowiednią funkcję albo workflow. Parser `serena_reaper` odczytuje wyłącznie pokazane wyżej klucze snake_case i ignoruje camelCase. Dostarczone szablony nadal pokazują camelCase (`keepWarm`, `idleMinutes`, `graceSeconds`), a dostarczony schemat CUE odrzuca klucze snake_case w swoim bloku schematu (`field not allowed`), więc ustawiaj je w `oma-config.yaml` albo w lokalnej nakładce YAML. Przed dodaniem zagnieżdżonych kluczy przeczytaj odpowiedni przewodnik funkcji; ta strona nie wymyśla kluczy spoza wymienionych tu konsumentów.

## Dokładne obiekty zagnieżdżone

### Dostawcy {#providers}

`providers` wybiera jednego dostawcę dla każdej możliwości:

| Klucz | Akceptowane wartości | Wartość domyślna |
| --- | --- | --- |
| `docs` | `context7` | `context7` |
| `web` | ID dostawcy wyszukiwania (małe litery, cyfry, `_`, `-`), na przykład `native` albo `brave` | `native` |
| `code_intelligence` | `serena`, `gortex` | `serena` |
| `code_intelligence_guard` | `block`, `off` | `block` |
| `semantic_memory` | `agentmemory`, `honcho`, `none` | `agentmemory` |

Trzy zarezerwowane klucze trzymają sekcję poświadczeń albo połączenia dla selektora: `providers.brave` i `providers.exa` (`api_key_env` albo `api_key_vault`) dla `web` oraz `providers.honcho` dla `semantic_memory` (zobacz [Pamięć semantyczna Honcho](#honcho-semantic-memory)). Ich starsze pisownie najwyższego poziomu nadal są odczytywane.

Każdy inny klucz pod `providers` to **dostawca LLM**: endpoint zgodny z OpenAI albo Anthropic, przez który `oma agent spawn` może skierować podrzędne CLI zamiast własnego konta tego CLI. Wartość jest obiektem:

| Pole | Akceptowane wartości | Wymagane | Przeznaczenie |
| --- | --- | --- | --- |
| `base_url` | bezwzględny URL HTTP(S) bez poświadczeń, query ani fragmentu; `/v1` jest dopisywane, gdy go brak | tak | Endpoint. |
| `api_key_env` | nazwa zmiennej środowiskowej | tak (z wyjątkiem `free`, które domyślnie używa `FREELLM_API_KEY`) | Skąd odczytywany jest klucz; plik nigdy nie zawiera klucza. `base_url` jest opcjonalny tylko dla `free` (`http://127.0.0.1:31415/v1`). |
| `transport` | `chat_completions` (domyślnie), `responses`, `anthropic_messages`, `multi` | nie | Protokół, którym mówi endpoint. Wybiera podrzędne CLI: `chat_completions` → Codex albo Qwen, `responses` → Codex, `anthropic_messages` → Claude, `multi` (brama obsługująca wszystkie trzy) → Codex, Claude albo Qwen. |
| `default_model` | ID modelu | gdy dostawca jest używany jako `model_preset` | Model, którego używa każda rola przy `model_preset: <name>`. |

```yaml
providers:
  code_intelligence: serena
  exaone:
    base_url: https://api.exaone.ai/v1
    api_key_env: EXAONE_API_KEY
    transport: chat_completions
    default_model: k-exaone_v2.5
agents:
  default: { effort: medium }
  backend: { model: exaone/k-exaone_v2.5 }
```

`free` to wbudowany dostawca lokalnej bramy FreeLLMAPI: każde pole ma wartość domyślną, `FREELLM_BASE_URL` i `FREELLM_MODEL` nadpisują plik, a starszy blok `free:` najwyższego poziomu nadal jest odczytywany (jego `model` to tutaj `default_model`); zobacz [Własni dostawcy LLM](/docs/guide/per-agent-models#custom-llm-providers).

`code_intelligence_guard` steruje strażnikiem wyszukiwania PreToolUse. Natywne wyszukiwania ograniczone do potwierdzonych wykluczeń dostawcy lub ścieżek spoza projektu są dozwolone bez obejścia. Strażnik odczytuje wykluczenia Sereny i włączone reguły gitignore albo listę wykluczeń Gortex; nie wnioskuje zależności z nazw katalogów.

Hook nie wymienia `OMA_CI_ALLOW_NATIVE`. Wyszukiwanie w powłoce z prefiksem `OMA_CI_ALLOW_NATIVE=1` omija strażnika wyłącznie dla zasobów spoza projektu lub ignorowanych ścieżek, których strażnik nie rozpoznał, a nie dla kodu źródłowego projektu.

### Pamięć semantyczna Honcho {#honcho-semantic-memory}

Mapa `providers.honcho` (starszy `honcho` najwyższego poziomu, nadal odczytywany) jest walidowana przez `HonchoConfigSchema`. Nazwy kluczy i skuteczne zachowanie runtime’u są następujące:

| Klucz | Kształt | Skuteczna wartość domyślna albo ograniczenie |
| --- | --- | --- |
| `base_url` | string URL | `https://api.honcho.dev`; HTTPS jest wymagane poza lokalnym HTTP loopback. Poświadczenia, query stringi i fragmenty są odrzucane. |
| `workspace_id` | 1–128 liter, cyfr, `_` albo `-` | Wymagane przy uruchomieniu dostawcy. Interaktywny instalator ustawia `oma`, gdy nie ma zapisanej wartości. |
| `project_id` | przycięty string o długości 1–128 znaków | Pominięcie oznacza bieżący katalog główny projektu OMA. |
| `api_key_env` | nazwa zmiennej środowiskowej | `HONCHO_API_KEY`. Endpoint spoza loopback wymaga tej zmiennej albo `api_key_vault`. |
| `api_key_vault` | nazwa klucza skarbca (`A-Z`, `a-z`, cyfry, `.`, `_`, `-`; 1–64 znaki) | Pominięcie oznacza brak wyszukiwania w skarbcu. Gdy obecne są oba odwołania do poświadczeń, najpierw używana jest wartość środowiskowa. |
| `timeout_ms` | liczba całkowita `100`–`30000` | `5000` milisekund. Ten sam termin obejmuje żądanie statusu albo pamięci. |
| `max_results` | liczba całkowita `1`–`50` | `8` wyników przywołania. |
| `max_tokens` | liczba całkowita `128`–`16000` | `2000` bajtów UTF-8 dla przywołanej treści i wywnioskowanego kontekstu. |
| `recall_mode` | `messages` albo `hybrid` | Instalator zapisuje `messages` dla nowego wyboru. Pominięta wartość włącza żądanie reprezentacji dostawcy oraz przywołanie wiadomości. |

Na przykład zdalny workspace może używać odwołania do sekretu bez umieszczania sekretu w YAML:

```yaml
providers:
  semantic_memory: honcho
honcho:
  base_url: https://honcho.example.com
  workspace_id: team
  project_id: product-docs
  api_key_vault: honcho-team
  timeout_ms: 5000
  max_results: 8
  max_tokens: 2000
  recall_mode: messages
```

Podczas interaktywnego albo nieinteraktywnego konfigurowania Honcho bez zapisanej wartości instalator używa `http://127.0.0.1:8000` jako początkowego URL. To ustawienie instalatora jest oddzielne od wcześniejszego zapasowego ustawienia runtime’u dostawcy. Po wybraniu dostawcy użyj `oma memory status`; brak workspace’u albo poświadczenia zostanie zgłoszony jako niedostępność, a nie jako ciche przełączenie na innego dostawcę pamięci.

### Limity kwot sesji {#session-quota-caps}

`session.quota_cap` to częściowa mapa. Każde pole jest opcjonalne; pominięte pole pozostawia ten wymiar bez limitu. Wartości muszą być nieujemnymi liczbami całkowitymi zapisanymi bez separatorów `_` (YAML odczytuje `2_000_000` jako string, co pozostawia ten wymiar bez limitu). `per_vendor` mapuje ID dostawców dispatchu, takie jak `claude`, `codex` albo `antigravity`, na budżety tokenów:

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

Loader limitu sprawdza warstwę CUE użytkownika, potem warstwę YAML użytkownika, a następnie zapasowe wartości dostarczonego szablonu. Przed uruchomieniem OMA sprawdza w tej kolejności `spawn_count`, łączną liczbę `tokens` i `per_vendor`. Limit zostaje osiągnięty, gdy użycie jest większe lub równe jego wartości; OMA blokuje następne uruchomienie i zgłasza wymiar, który zadziałał.

OMA rezerwuje oszacowanie tokenów wejściowych w momencie startu uruchomienia. Gdy po uruchomieniu dostępny jest obsługiwany natywny transkrypt, zapisane użycie wejścia, cache i wyjścia zastępuje to oszacowanie bez liczenia kolejnego uruchomienia. W przeciwnym razie rekord pozostaje jawnie oszacowany z długości promptu. Zaobserwowane użycie sesji głównej jest oznaczane jako częściowe, gdy natywni subagenci są poza zakresem przechwytywania. Limity tokenów zależą więc od dostępnych obserwacji; nie przerywają już działającego procesu podrzędnego ani nie gwarantują limitu rozliczenia. `spawn_count` jest najbardziej przewidywalnym limitem.

### Budżet wykonania sesji {#session-execution-budget}

Ustaw `session.execution`, aby ograniczyć czas, który upłynął, dla dispatchu CLI i weryfikacji zarządzanych przez OMA. Użyj dodatniego `timeout_seconds` albo `deadline` w formacie ISO 8601 ze strefą czasową:

```yaml
session:
  execution:
    timeout_seconds: 1800
```

Polecenia `oma agent spawn`, `parallel`, `review`, `resume`, `begin` i `verify` przyjmują `--timeout-seconds` albo `--deadline`. Przygotowanie, wykonanie, ponowienia i kontrole dzielą jeden bezwzględny termin. Wygrywa najwcześniejszy skonfigurowany, odziedziczony albo utrwalony termin; ponowienia i wznowienie nie resetują zegara. Pomiń `session.execution` i obie flagi, aby pozostawić ten wymiar bez limitu, chyba że termin podał proces nadrzędny.

Historia wykonania jest przechowywana w `.agents/state/executions/`. Anulowanie albo przekroczenie limitu czasu blokuje dalsze wykonanie w tej sesji i zapisuje powód zatrzymania. Te kontrole obejmują procesy uruchomione przez zarządzaną ścieżkę CLI. Natywni agenci vendora i dowolne zadania powłoki potrzebują mechanizmu anulowania swojego hosta; limity CPU, RAM i pamięci masowej wymagają wsparcia dostawcy.

Zarządzane podrzędne CLI dziedziczą `OMA_EXECUTION_DEADLINE`, `OMA_EXECUTION_STATE` i `OMA_EXECUTION_ID`. Ścieżka stanu i ID wykonania tworzą powiązane odwołanie dziedziczenia; obca, zniekształcona albo niespójna księga jest odrzucana przed zapisem. Przy opakowywaniu podrzędnego procesu OMA przekazuj całe odziedziczone środowisko. Ustawienie tych zmiennych nie dodaje egzekwowania terminu do niepowiązanego programu.

Przy anulowaniu OMA wstrzymuje przyjmowanie nowych uruchomień i próbuje ograniczonego zakończenia posiadanych obliczeń. Zachowuje logi, wyniki, worktree i zarejestrowane metadane zasobów. Usunięcie artefaktów albo zasobów zewnętrznych wymaga żądania albo jawnej polityki retencji. Nieudane zakończenie pozostaje widoczne, zamiast być zgłaszane jako pełne wyczyszczenie.

### Informacja zwrotna diagnostyki {#diagnostic-feedback}

Dla obsługiwanych hostów terminalowych OMA porównuje błędy i ostrzeżenia przed i po natywnych edycjach plików i wstrzykuje nowo zgłoszoną diagnostykę do następnej informacji zwrotnej narzędzia. Używa już działającego, dopasowanego do projektu demona HTTP Sereny, gdy Serena jest skutecznym dostawcą inteligencji kodu (domyślnie, gdy nie wskazano dostawcy). Nigdy nie uruchamia demona ani buildu. Własne edycje symboliczne Sereny są wyłączone, ponieważ już dostarczają diagnostykę.

```yaml
diagnostic_feedback:
  enabled: true
  host_diagnostics: false
  timeout_ms: 1400
```

Ustaw `enabled: false`, aby wyłączyć tę informację. Ustaw `host_diagnostics: true`, gdy host już dostarcza diagnostykę edycji; Cursor i Antigravity są pomijane automatycznie. Nadpisania lokalne dla projektu podążają za zwykłymi warstwami konfiguracji. Nadpisania środowiskowe to `OMA_DIAGNOSTIC_FEEDBACK`, `OMA_HOST_DIAGNOSTICS` i `OMA_DIAGNOSTIC_FEEDBACK_TIMEOUT_MS`.

Limit czasu obejmuje każdy kompletny hook przed edycją albo po niej i mieści się w zakresie 100–10 000 milisekund. Wolni dostawcy mogą użyć większego limitu. Nieudane albo przekroczone wyszukanie pomija informację i zaczyna krótkie ochłodzenie; nie liczy się jako czysty wynik diagnostyczny. Brakujące albo nieaktualne linie bazowe sprzed edycji również pomijają informację. Każdy hook sprawdza co najwyżej trzy pliki i zgłasza co najwyżej osiem nowych błędów albo ostrzeżeń.

### Wybór dostawcy i metadane dispatchu {#vendor-selection-and-dispatch-metadata}

W należącym do użytkownika `.agents/oma-config.yaml` `vendors` jest listą wybranych ID integracji:

```yaml
vendors:
  - claude
  - codex
  - pi
```

Lista wybiera dokładnie tych dostawców, a `vendors: []` nie wybiera żadnego. Bez klucza `vendors` `oma link` obejmuje każdego dostawcę z rejestru dostawców, których można linkować w OMA, natomiast `oma update` obejmuje tylko dostawców, których katalogi projektu już istnieją. Lista steruje projekcjami instalacji i aktualizacji; nie jest mapą możliwości poleceń per dostawca.

Dostarczony schemat `.agents/oma-config.cue` typuje `vendors` jako tę samą listę (`[...string]`). Starsze szablony CUE typowały go jako obiekt `vendors.pi` (`#VendorsConfig`), którego nic nie czyta: dispatch agentów rozstrzyga pola możliwości z zarządzanego rejestru orkiestracji poniżej. Jeśli Twój `oma-config.cue` nadal deklaruje `vendors?: #VendorsConfig`, zmień to na `vendors?: [...string]`, zanim umieścisz tam listę wyboru.

Zarządzany `.agents/skills/oma-orchestration/config/cli-config.yaml` zawiera tę mapę możliwości. Każdy wpis `vendors.<id>` obsługuje następujące pola:

| Pole | Kształt | Zastosowanie |
| --- | --- | --- |
| `command` | string wykonywalnego pliku | Program do uruchomienia. |
| `subcommand` | string | Podpolecenie wstawiane przed opcjami, na przykład `codex exec`. |
| `prompt_flag` | string albo `none`/`null` w celu wyłączenia | Flaga łączona z promptem; po wyłączeniu używany jest prompt pozycyjny. |
| `auto_approve_flag` | string | Flaga dostawcy wyłączająca pytanie o zgodę podczas zapisu. Pomijana w trybie tylko do odczytu. |
| `read_only_flag` | string | Flaga dostawcy tylko do odczytu. Gdy jej brak, builder używa zapasowej wartości właściwej dla dostawcy albo ostrzega. |
| `output_format_flag` | string | Flaga wybierająca wynik czytelny maszynowo. |
| `output_format` | string | Wartość łączona z `output_format_flag`. |
| `model_flag` | string | Flaga łączona z `default_model`. |
| `default_model` | string | Wartość modelu używana, gdy rozstrzygnięty plan jej nie dostarcza. |
| `isolation_env` | string `NAME=value` | Opcjonalne przypisanie środowiska; niebezpieczne klucze loadera lub interpretera są odrzucane, a `$$` rozwija się do ID bieżącego procesu. |
| `isolation_flags` | string argumentów w stylu shell | Dodatkowe argumenty izolacji dzielone na tokeny argv. |

Zarządzany plik możliwości jest odtwarzany przez aktualizacje OMA. Do wyboru modeli edytuj należące do użytkownika klucze `agents`, `models` i `custom_presets`; tej mapy możliwości używaj tylko przy utrzymywaniu zarządzanych danych orkiestracji albo debugowaniu adaptera dostawcy. Komentowany obiekt `vendors.pi` ze starszych szablonów to metadane zapasowe i nie zastępuje listy wybranych dostawców ani zarządzanego rejestru dispatchu.

## Typowe zmiany

Wybierz stały preset dla projektu, zachowując osobiste nadpisanie lokalnie.

**Plik wspólny** (commitowany):

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed
```

**Nakładka lokalna** (ignorowana przez Git):

```yaml
# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-6.1-terra
    effort: high
```

Jawnie wybierz dostawców inteligencji kodu i pamięci:

```yaml
providers:
  code_intelligence: serena
  code_intelligence_guard: block   # off → advisory primer only, no tool denial
  semantic_memory: none
```

Pozostaw konfigurację przeglądarki bez zmian podczas aktualizacji albo usuń ją celowo:

```yaml
# Omit mcp.devtools_browsers to leave existing browser entries unchanged.
mcp:
  devtools_browsers: []
```

## Zasady aktualizacji i własności {#update-and-ownership-rules}

`.agents/oma-config.yaml` należy do użytkownika. `oma update` zachowuje istniejącą treść i może dopisać nowo dostarczone klucze najwyższego poziomu szablonu pod znacznikiem `# Added by oma update`. `oma update --force` może zastąpić konfigurację użytkownika, konfigurację MCP i katalogi stosu; używaj go tylko wtedy, gdy chcesz zresetować te dostosowania. Lokalne pliki nakładek pozostają prywatnym miejscem na wartości właściwe dla komputera.

Nie umieszczaj kluczy API w tym pliku. Używaj pól `api_key_env` albo `api_key_vault`, a właściwe poświadczenie przechowuj we wskazanym magazynie sekretów albo w środowisku.

Szczegóły rozstrzygania modeli opisano w [konfiguracji modeli per agent](/docs/guide/per-agent-models). Semantykę warstw i zachowanie przy błędach opisano w [semantyce konfiguracji OMA](/docs/guide/oma-config-semantics).
