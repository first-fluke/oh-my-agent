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

Loader przechodzi w górę od bieżącego katalogu i zatrzymuje się przy najbliższym katalogu `.agents/`, który zawiera wspólną albo lokalną konfigurację. W tym katalogu:

1. Najpierw oceniany jest `oma-config.cue`.
2. `oma-config.yaml` jest używany, gdy wspólny plik CUE nie istnieje albo nie może zostać oceniony.
3. Jeden plik lokalny (`oma-config.local.cue` albo `.local.yaml`) jest scalany na wierzchu pliku wspólnego.
4. Ustawione `OMA_MODEL_PRESET` nadpisuje `model_preset` dla tego procesu.

Mapy są scalane rekurencyjnie. Tablice, skalary i `null` zastępują wartość wspólną. Obecność obu lokalnych formatów jest błędem. Błędny lokalny plik kończy działanie, aby prywatne nadpisanie nie mogło zostać po cichu pominięte.

To reguła najbliższej warstwy, a nie ogólne scalanie projektu z katalogiem HOME. Instalacja globalna odczytuje `~/.agents/oma-config.*`, ponieważ HOME jest jej katalogiem instalacyjnym. Polecenie projektu odczytuje najbliższą warstwę projektu. Wyjątkiem jest sprawdzanie `auto_update_cli`: najpierw sprawdza projekt, potem HOME, a na końcu przyjmuje wartość domyślną włączoną.

## Klucze najwyższego poziomu

Poniższe klucze są odczytywane przez bieżący schemat runtime’u albo przez dostarczonych konsumentów OMA. Klucz oznaczony jako sparse jest celowo częściowy: pomiń zagnieżdżoną wartość, aby zachować domyślne ustawienie kodu.

| Klucz | Typ lub akceptowane wartości | Wartość domyślna przy braku | Przeznaczenie |
| --- | --- | --- | --- |
| `language` | string | `en` | Język odpowiedzi używany przez workflowy i umiejętności. |
| `translation_voice` | `formal`, `balanced`, `interpreter` | `balanced` w dostarczonym szablonie | Wybór głosu dla `oma-translation`. |
| `date_format` | `ISO`, `US`, `EU` | `ISO` w dostarczonym szablonie; pominięcie nie ustawia jawnego nadpisania | Preferencja formatowania dat. |
| `timezone` | nazwa IANA | systemowa strefa czasowa | Daty używane w harmonogramach i raportach. |
| `auto_update_cli` | boolean | `true` | Tła sprawdzające wersję CLI; wyłącz je wartością `false`. |
| `telemetry` | boolean | `false` | Zgoda na telemetrię dostawcy używana podczas instalacji, aktualizacji i uzgadniania linków. |
| `model_preset` | niepusty string | `auto` w nowych szablonach | Wbudowany albo własny preset modeli. `OMA_MODEL_PRESET` nadpisuje go dla jednego procesu. |
| `free` | `base_url`, `api_key_env`, `model` | `http://127.0.0.1:31415/v1`, `FREELLM_API_KEY`, `auto` | Ustawienia FreeLLMAPI, gdy preset to `free`; `FREELLM_BASE_URL` i `FREELLM_MODEL` nadpisują wartości pliku, a nazwa klucza nigdy nie zawiera sekretu. Zobacz [konfigurację modeli per agent](/docs/guide/per-agent-models#freellmapi-preset). |
| `providers` | `docs`, `web`, `code_intelligence`, `code_intelligence_guard`, `semantic_memory` | `context7`, `native`, `serena`, `block`, `agentmemory` | Wybór dostawców dokumentacji, wyszukiwania, inteligencji kodu i pamięci semantycznej. Inteligencja kodu przyjmuje `serena` albo `gortex`, a pamięć semantyczna `agentmemory`, `honcho` albo `none`. `code_intelligence_guard` (`block` albo `off`) steruje strażnikiem wyszukiwania PreToolUse. Natywne wyszukiwania ograniczone do potwierdzonych wykluczeń dostawcy lub ścieżek spoza projektu są dozwolone bez obejścia. Strażnik odczytuje wykluczenia Sereny i włączone reguły gitignore albo listę wykluczeń Gortex; nie wnioskuje zależności z nazw katalogów. Hook nie wymienia `OMA_CI_ALLOW_NATIVE`. Wyszukiwanie w powłoce z prefiksem `OMA_CI_ALLOW_NATIVE=1` omija strażnika wyłącznie dla zasobów spoza projektu lub ignorowanych ścieżek, których strażnik nie rozpoznał, a nie dla kodu źródłowego projektu. |
| `brave` | `api_key_env` albo `api_key_vault` | nieustawione | Odwołanie do poświadczenia wyszukiwania Brave. |
| `honcho` | `base_url`, `workspace_id`, `project_id`, `api_key_env`, `api_key_vault`, `timeout_ms`, `max_results`, `max_tokens`, `recall_mode` | Zobacz [szczegóły Honcho](#honcho-semantic-memory) | Ustawienia połączenia z pamięcią semantyczną Honcho. |
| `agents` | ID agenta → `model`, opcjonalne `effort`, `thinking`, `memory` | rozstrzygnięcie presetu | Nadpisania per agent stosowane na wybranym presecie. Effort to `none`, `low`, `medium`, `high` albo `xhigh`; memory to `user`, `project` albo `local`. |
| `models` | slug modelu → mapowanie CLI | nieustawione | Wbudowane definicje modeli dla obsługiwanych CLI dostawców. |
| `custom_presets` | preset → opis, opcjonalne `extends`, `agent_defaults` | nieustawione | Presety użytkownika; `extends` może dziedziczyć po wbudowanym presecie. |
| `vendors` | YAML: `string[]` wybranych ID dostawców; szablon CUE: opcjonalna mapa zapasowa `vendors.pi` | wszyscy dostawcy możliwi do linkowania dla listy YAML | Wybór integracji dostawców, które `oma install` i `oma update` projektują w YAML. Mapa możliwości dispatchu znajduje się w zarządzanej konfiguracji orkiestracji; zobacz [metadane wyboru dostawcy i dispatchu](#vendor-selection-and-dispatch-metadata). |
| `default_cli` | string | zapasowa wartość konsumenta | Starszy zapasowy wybór samego dostawcy, gdy nie rozstrzyga się żaden plan modelu. |
| `session.quota_cap` | `tokens`, `spawn_count`, `per_vendor: map<string, integer>` | każdy pominięty wymiar nie ma limitu | Twarde limity tokenów i uruchomień sprawdzane przed kolejnym uruchomieniem agenta; zobacz [limity kwot sesji](#session-quota-caps). |
| `docs` | `auto_verify`, `check_urls`, `exclude` | `false`, `true`, `[]` | Zachowanie `oma docs verify` i wykluczenia skanowania. |
| `serena` | `mode: bridge\|stdio`, `auto_update` | `bridge`, `true` | Transport MCP Sereny i zachowanie aktualizacji. |
| `mcp.devtools_browsers` | `aside`, `chrome`, `firefox` albo `[]` | nieustawione = pozostaw istniejącą konfigurację | Wybór Browser DevTools MCP podczas uzgadniania. Jawnie pusta lista usuwa wybrane wpisy przeglądarek. |
| `video` | częściowa mapa należąca do umiejętności | domyślna umiejętności; zobacz [Generowanie wideo](/docs/guide/video-generation) | Routing wideo, kolejność dostawców, wynik, koszty, limity i ustawienia odświeżania HyperFrames. |
| `image` | częściowa mapa należąca do umiejętności | domyślna umiejętności; zobacz [Generowanie obrazów](/docs/guide/image-generation) | Dostawca obrazów, rozmiar, jakość, wynik, porównanie i ustawienia kosztów. |
| `voice` | `notification_profile`, `asset_profile`, `output_dir`, `auto_notify_after_sec`, `max_tts_chars`, `max_stt_minutes` | domyślna umiejętności; zobacz [Workflowy treści i badań](/docs/guide/content-and-research#generate-speech-or-transcribe-audio) | Profil Voicebox, wynik i limity długości. |
| `hwp` | `format`, `version.*`, `output.*` | domyślna umiejętności; zobacz [Workflowy treści i badań](/docs/guide/content-and-research#extract-hwp-family-documents) | Format Kordoc, kanał wersji i lokalizacja wyniku. |
| `pdf` | `format`, `image_output`, `image_format`, `use_struct_tree`, `ocr.*`, `output.*` | domyślna umiejętności; zobacz [Workflowy treści i badań](/docs/guide/content-and-research#extract-pdf-content) | Ekstrakcja PDF, OCR, obrazy i ustawienia nadpisywania. |
| `scholar` | `base_url` | domyślna umiejętności; zobacz [Workflowy treści i badań](/docs/guide/content-and-research#search-and-validate-scholarly-material) | Host endpointu Knows; kształt protokołu pozostaje własnością umiejętności. |
| `diagram` | `engine`, `explain_sidecar`, `archify.*` | domyślna umiejętności; zobacz [Diagram Engine](/docs/guide/diagram-engine) | Wybór Mermaid/archify i ustawienia zarządzanego silnika. |
| `market` | `managed`, `channel`, `check_interval_min`, `path`, `python`, `save_dir` | domyślna umiejętności; zobacz [Badania rynku](/docs/guide/market-research) | Rozstrzyganie zarządzanego silnika last30days i lokalizacja wyników. |

Dostarczony szablon zawiera też bloki należące do konsumentów. Ich bieżące klucze i wartości domyślne to:

| Blok | Klucze odczytywane przez konsumenta | Wartość domyślna | Skutek |
| --- | --- | --- | --- |
| `memory.gc` | `keep_sessions`, `max_age_days` | zachowaj 100 sesji; usuń artefakty Sereny starsze niż 50 dni; `0` wyłącza usuwanie według wieku | Wartości domyślne `oma memory gc`; flagi polecenia je nadpisują. |
| `serena_reaper` | `enabled`, `policy: lru\|idle`, `keep_warm`, `idle_minutes`, `grace_seconds` | `false`, `lru`, `2`, `10`, `90` | Steruje zaplanowaną ścieżką czyszczenia LSP Sereny. Interaktywne `oma serena reap` pozostaje jawne; ciche uruchomienia zaplanowane są opcjonalne. |
| `refactor_guard` | `enabled`, `max_lines` | `false`, `500` | Włącza guard hooka stop i ustawia budżet kodu na plik. |
| `scm` | `conventional_commits`, `branching_strategy`, `require_pr_for_default_branch`, `co_author.*`, `forbidden_patterns`, `allowed_exceptions` | dostarczony szablon włącza conventional commits i ochronę PR, z tożsamością współautora oraz listami nazw plików z szablonu | Steruje umiejętnością SCM, hookiem commita i guardem wzorców sekretów. Przed włączeniem trailerów współautora zastąp wartości tożsamości z szablonu własnymi. |

Bloki te są akceptowane przez przekazywanie konfiguracji i interpretowane przez odpowiednią funkcję albo workflow. Parser `serena_reaper` odczytuje pokazane wyżej klucze snake_case, choć starsze komentarze szablonu używały nazw camelCase. Przed dodaniem zagnieżdżonych kluczy przeczytaj odpowiedni przewodnik funkcji; ta strona nie wymyśla kluczy spoza wymienionych tu konsumentów.

## Dokładne obiekty zagnieżdżone

### Pamięć semantyczna Honcho {#honcho-semantic-memory}

Mapa `honcho` jest walidowana przez `HonchoConfigSchema`. Nazwy kluczy i skuteczne zachowanie runtime’u są następujące:

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

`session.quota_cap` to częściowa mapa. Każde pole jest opcjonalne; pominięte pole pozostawia ten wymiar bez limitu. Wartości muszą być nieujemnymi liczbami całkowitymi, a `per_vendor` mapuje nazwy dostawców na budżety tokenów:

```yaml
session:
  quota_cap:
    tokens: 2000000
    spawn_count: 30
    per_vendor:
      claude: 1500000
      codex: 500000
```

Loader limitu sprawdza warstwę CUE użytkownika, potem warstwę YAML użytkownika, a następnie zapasowe wartości dostarczonego szablonu. Przed uruchomieniem OMA sprawdza w tej kolejności `spawn_count`, łączną liczbę `tokens` i `per_vendor`. Limit zostaje osiągnięty, gdy użycie jest większe lub równe jego wartości; OMA blokuje następne uruchomienie i zgłasza wymiar, który zadziałał. Użycie oznacza rozliczanie tokenów, a nie szacowanie rachunku.

### Wybór dostawcy i metadane dispatchu {#vendor-selection-and-dispatch-metadata}

W należącym do użytkownika `.agents/oma-config.yaml` `vendors` jest listą wybranych ID integracji:

```yaml
vendors:
  - claude
  - codex
  - pi
```

Brak listy albo pusta lista wybiera wszystkie ID z rejestru dostawców, które można linkować w OMA. Lista steruje projekcjami instalacji i aktualizacji; nie jest mapą możliwości poleceń per dostawca.

Dostarczony schemat `.agents/oma-config.cue` dopuszcza też obiekt `vendors.pi` z polami `command`, `prompt_flag`, `model_flag`, `default_model` i `thinking_flag`. Ten blok jest typowanym kształtem zapasowym w szablonie CUE; bieżąca ścieżka dispatchu agentów rozstrzyga pola możliwości z zarządzanego rejestru orkiestracji poniżej, więc nie używaj `vendors.pi` zamiast listy wyboru YAML.

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

Wybierz stały preset dla projektu, zachowując osobiste nadpisanie lokalnie:

```yaml
# .agents/oma-config.yaml
language: en
model_preset: mixed

# .agents/oma-config.local.yaml
agents:
  backend:
    model: openai/gpt-5.4
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

## Zasady aktualizacji i własności

`.agents/oma-config.yaml` należy do użytkownika. `oma update` zachowuje istniejącą treść i może dopisać nowo dostarczone klucze najwyższego poziomu szablonu pod znacznikiem `# Added by oma update`. `oma update --force` może zastąpić konfigurację użytkownika, konfigurację MCP i katalogi stosu; używaj go tylko wtedy, gdy chcesz zresetować te dostosowania. Lokalne pliki nakładek pozostają prywatnym miejscem na wartości właściwe dla komputera.

Nie umieszczaj kluczy API w tym pliku. Używaj pól `api_key_env` albo `api_key_vault`, a właściwe poświadczenie przechowuj we wskazanym magazynie sekretów albo w środowisku.

Szczegóły rozstrzygania modeli opisano w [konfiguracji modeli per agent](/docs/guide/per-agent-models). Semantykę warstw i zachowanie przy błędach opisano w [semantyce konfiguracji OMA](/docs/guide/oma-config-semantics).
