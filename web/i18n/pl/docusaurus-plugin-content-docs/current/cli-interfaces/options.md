---
title: "Opcje CLI"
description: Wyczerpująca referencja wszystkich opcji CLI — flagi globalne, kontrola wyjścia, opcje poleceń i praktyczne wzorce użycia.
---

# Opcje CLI

## Opcje globalne

Te opcje są dostępne dla głównego polecenia `oma` / `oh-my-agent`:

| Flaga | Opis |
| :----- | :----------- |
| `-g, --global` | Działa na instalacji HOME (`~/.agents/`) zamiast na `<cwd>/.agents/` |
| `-y, --yes` | Pomija pytania, gdy wybrane polecenie obsługuje potwierdzenie; kontrole bezpieczeństwa danego polecenia nadal obowiązują |
| `-V, --version` | Wypisuje numer wersji i kończy działanie |
| `-h, --help` | Wyświetla pomoc dla polecenia |

Wszystkie podpolecenia obsługują również `-h, --help`, aby wyświetlić własny tekst pomocy.

`--global` ustawia katalog główny instalacji dla całego procesu, więc `install`, `update`, `link` i `uninstall` zawsze używają `~/.agents/`, niezależnie od katalogu, z którego je uruchamiasz. `OMA_HOME=<abs-path>` nadpisuje to ustawienie — zobacz [Instalacja globalna](../guide/global-install.md).

---

## Opcje wyjścia {#output-options}

Wiele poleceń obsługuje wyjście maszynowe dla potoków CI/CD i automatyzacji. Wyjście JSON można zażądać na trzy sposoby, w następującej kolejności priorytetu:

### 1. Flaga --json

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

Flaga `--json` jest dostępna tylko na ścieżkach, które ją deklarują. Nie wyciągaj wniosków z samej rodziny poleceń: na przykład końcowe ścieżki `image`, `video` i `slide` udostępniają `--output` tam, gdzie wymienia je rejestr, a `search` ma własny strumień JSON. Macierz rejestru na końcu strony jest źródłem prawdy dla poszczególnych ścieżek.

### 2. Flaga --output

```bash
oma stats get --output json
oma doctor --output text
```

Flaga `--output` przyjmuje `text` lub `json`. Zapewnia tę samą funkcję co `--json`, ale pozwala jawnie zażądać wyjścia tekstowego (przydatne, gdy zmienna środowiskowa jest ustawiona na json, a dla konkretnego polecenia potrzebujesz tekstu).

**Walidacja:** Jeśli podano nieprawidłowy format, CLI zgłasza: `Invalid output format: {value}. Expected one of text, json`.

### 3. Zmienna środowiskowa OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Ustaw tę zmienną środowiskową na `json`, aby wymusić wyjście JSON we wszystkich obsługujących je poleceniach. Rozpoznawane jest tylko `json`; każda inna wartość jest ignorowana, a domyślnie używany jest tekst.

**Kolejność rozstrzygania:** flaga `--json` > flaga `--output` > zmienna środowiskowa `OH_MY_AG_OUTPUT_FORMAT` > `text` (domyślnie).

### Polecenia obsługujące wyjście JSON

| Polecenie | `--json` | `--output` | Uwagi |
| :-------- | :--------- | :---------- | :------ |
| `doctor` | Tak | Tak | Obejmuje kontrole CLI, status MCP i status umiejętności |
| `stats` | Tak | Tak | Pełny obiekt metryk |
| `retro` | Tak | Tak | Snapshot z metrykami, autorami i typami commitów |
| `cleanup` | Tak | Tak | Lista wyczyszczonych elementów |
| `auth status` | Tak | Tak | Status uwierzytelnienia dla każdego CLI |
| `memory init` | Tak | Tak | Wynik inicjalizacji |
| `verify agent` / `verify triggers` | Tak | Tak | Wyniki weryfikacji każdej kontroli |
| `visualize` | Tak | Tak | Graf zależności jako JSON |
| `describe` | Zawsze JSON | N/D | Zawsze wypisuje JSON (polecenie introspekcji) |
| `recap` | Tak | Tak | Historia rozmów według narzędzia/sesji |
| `image generate` / `image doctor` / `image vendor list` | N/D | Tak | Użyj `--output json`; `vendor list` jest kanoniczną ścieżką wykrywania |
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | N/D | Tak | Użyj `--output json` dla obudowy uruchomienia lub raportu gotowości |
| `explain validate` | Tak | Tak | Raport walidacji artefaktu |
| `explain render` / `explain patch` / `explain components` | Tak | Tak | Raport renderowania: plik, ostrzeżenia, stan sidecara |
| `explain lint` | Tak | Tak | Ostrzeżenia dotyczące tekstu |
| `diagram resolve` / `diagram update` | Tak | Tak | Wynik wyboru silnika lub zarządzanej pamięci podręcznej |
| `market resolve` / `market update` | Tak | Tak | Status zarządzanego silnika badawczego |
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | Tak | N/D | Każda ścieżka docs ma własne opcje raportu |
| `search ...` | Zawsze JSON | N/D | Wszystkie podpolecenia `search` strumieniują JSON; do czytania użyj `--pretty` |

---

## Opcje poszczególnych poleceń

### install

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

Instalator interaktywny zapisuje ustawienia wybranego dostawcy w `.agents/oma-config.yaml`. Flagi dostawców wybierają integracje wyszukiwania w sieci, inteligencji kodu i pamięci semantycznej; `--honcho-url` i `--honcho-workspace` konfigurują usługę pamięci Honcho po wybraniu tego dostawcy. Główna flaga `-y, --yes` działa, gdy przebieg instalacji prosi o potwierdzenie.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Flaga | Opis | Domyślnie |
| :----- | :----------- | :-------- |
| `--json` | Emituje JSON zamiast sformatowanego tekstu. | `false` |
| `--output <format>` | Jawny format wyjścia (`text` lub `json`). Zobacz [Opcje wyjścia](#output-options). | `text` |
| `--profile` | Wyświetla macierz zdrowia profilu (rozpoznany slug modelu, CLI i status uwierzytelnienia agenta z aktywnego `model_preset` oraz nadpisań `agents:`). Zobacz [Modele per agent](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| Flaga | Skrót | Opis | Domyślnie |
| :----- | :------ | :----------- | :-------- |
| `--force` | `-f` | Nadpisuje dostosowane przez użytkownika pliki konfiguracji podczas aktualizacji. Dotyczy: `oma-config.yaml`, `mcp.json`, katalogów `stack/`. Bez tej flagi pliki są kopiowane zapasowo przed aktualizacją i przywracane po niej. | `false` |
| `--with-new-skills` |  | Instaluje umiejętności dodane do rejestru od bieżącej instalacji. | `false` |
| `--ci` |  | Uruchamia nieinteraktywny tryb CI. Pomija wszystkie pytania o potwierdzenie i używa zwykłego wyjścia konsoli zamiast spinnerów i animacji. Wymagane w potokach CI/CD bez stdin. | `false` |
| `--yes` | `-y` | Pomija pytania. Nie tworzy brakujących katalogów dostawców, chyba że użyto `--all` lub `--vendor`. | `false` |
| `--all` |  | Tworzy lub aktualizuje wszystkich obsługiwanych dostawców zakresu projektu. | `false` |
| `--vendor <vendors>` |  | Tworzy lub aktualizuje listę dostawców rozdzielaną przecinkami, np. `claude,qwen`. | Tylko istniejące katalogi dostawców |

`oma update mcp` używa tych samych opcji `--yes`, `--ci`, `--all` i `--vendor` przy wyborze serwerów MCP przeglądarki. Nie używa `--force` ani `--with-new-skills`.

**Działanie z --force:**
- `oma-config.yaml` jest zastępowany domyślną wersją z rejestru.
- `mcp.json` jest zastępowany domyślną wersją z rejestru.
- Katalog backendu `stack/` (zasoby zależne od języka) jest zastępowany.
- Wszystkie pozostałe pliki są aktualizowane niezależnie od tej flagi.

**Działanie z --ci:**
- Brak `console.clear()` przy starcie.
- `@clack/prompts` zastępuje zwykłe `console.log`.
- Pytania o wykrycie konkurencyjnych narzędzi są pomijane.
- Błędy są zgłaszane zamiast wywołania `process.exit(1)`.

**Zakres dostawców:**
- `oma update` aktualizuje tylko katalogi dostawców, które już istnieją.
- `oma update --yes` używa tego samego zakresu dostawców bez pytań.
- `oma update --all` tworzy lub aktualizuje wszystkich obsługiwanych dostawców zakresu projektu.
- `oma update --vendor claude,qwen` tworzy lub aktualizuje tylko wymienionych dostawców.

### stats

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| Flaga | Opis | Domyślnie |
| :----- | :----------- | :-------- |
| `--json` | Emituje wynik resetowania jako JSON. | `false` |
| `--output <format>` | Emituje `text` lub `json`. | `text` |

`oma stats reset` jest poleceniem resetowania. Dawna forma `oma stats get --reset` nie należy do bieżącej publicznej listy.

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flaga | Opis | Domyślnie |
| :----- | :----------- | :-------- |
| `--interactive` | Tryb interaktywny z ręcznym wprowadzaniem danych. Pyta o kontekst, którego nie można pobrać z git (np. nastrój, ważne wydarzenia). | `false` |
| `--compare` | Porównuje bieżące okno czasowe z poprzednim o tej samej długości. Pokazuje metryki delta (np. commity +12, dodane wiersze -340). | `false` |

**Format argumentu window:**
- `7d`: 7 dni
- `2w`: 2 tygodnie
- `1m`: 1 miesiąc
- Pominięcie oznacza wartość domyślną (7 dni)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Flaga | Skrót | Opis | Domyślnie |
| :----- | :------ | :----------- | :-------- |
| `--dry-run` |  | Tryb podglądu. Wyświetla elementy do wyczyszczenia, ale nie zmienia plików. Kod wyjścia 0 niezależnie od wyników. | `false` |
| `--yes` | `-y` | Pomija wszystkie pytania o potwierdzenie. Czyści wszystko bez pytania. Przydatne w skryptach i CI. | `false` |

**Co zostaje wyczyszczone:**
1. Osierocone pliki PID: `/tmp/subagent-*.pid`, gdy wskazany proces już nie działa.
2. Osierocone pliki dziennika: `/tmp/subagent-*.log` odpowiadające nieaktywnym PID-om.
3. Katalogi Gemini Antigravity: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. Z czasem gromadzą stan i mogą znacznie urosnąć.

### agent spawn

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Flaga | Skrót | Opis | Domyślnie |
| :----- | :------ | :----------- | :-------- |
| `--resumed-from` | — | Łączy ponowienie z poprzednim identyfikatorem uruchomienia. |  |
| `--fallback-vendors` | — | Jawny, uporządkowany łańcuch dostawców fallbacku rozdzielony przecinkami. |  |
| `--task-id` | — | ID zadania z planu sesji. | ID agenta |
| `--vendor` | — | Nadpisanie dostawcy CLI. Runtime przyjmuje `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` lub `pi`. | Rozpoznany z konfiguracji |
| `--workspace` | `-w` | Katalog roboczy agenta. Jeśli pominięty lub ustawiony na `.`, CLI automatycznie wykrywa workspace na podstawie plików konfiguracji monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Wykryty automatycznie lub `.` |
| `--isolation` | — | Tryb izolacji: `worktree` tworzy git worktree przy każdym uruchomieniu; domyślnie `none`. | `none` |
| `--read-only` | — | Ogranicza uruchomionego agenta do narzędzi niedestrukcyjnych i wyłącza flagi automatycznej zgody. | `false` |

**Walidacja:**
- `agent-id` musi być jedną z wartości: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` nie może zawierać `..`, `?`, `#`, `%` ani znaków sterujących.
- `vendor` musi być jedną z wartości: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`.

**Działanie zależne od dostawcy:**

| Dostawca | Polecenie | Flaga automatycznej zgody | Flaga promptu |
| :------- | :-------- | :----------------- | :----------- |
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | (none) | `-p` |
| codex | `codex` | `--sandbox workspace-write` | (none; prompt is positional) |
| cursor | `cursor-agent` | vendor-specific | `-p` |
| opencode | `opencode` | vendor-specific | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | vendor-specific | `-p` |
| pi | `pi` | suppressed in `--read-only` mode | prompt is positional |

Te wartości domyślne można nadpisać w `.agents/skills/oma-orchestration/config/cli-config.yaml`.

Codex zachowuje swój sandbox workspace-write. oma włącza dostęp do sieci i dodaje katalog główny projektu, katalog stanu OMA (`~/.oma`) oraz istniejące cache menedżerów pakietów jako katalogi zapisywalne. `oma update` zastępuje `cli-config.yaml`, więc trwały tryb ustaw przez `OMA_CODEX_SANDBOX`: `read-only`, `workspace-write` (domyślnie) albo `danger-full-access` (bez sandboxa i bez zatwierdzeń).

### agent status

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| Flaga | Skrót | Opis | Domyślnie |
| :----- | :------ | :----------- | :-------- |
| `--root` | `-r` | Katalog główny do wyszukiwania plików pamięci (`.agents/state/memories/result-{agent}.md`) i plików PID. | Bieżący katalog roboczy |

**Logika ustalania statusu:**
1. Jeśli istnieje `.agents/state/memories/result-{agent}.md`: odczytuje nagłówek `## Status:`. Bez nagłówka zgłasza `completed`.
2. Jeśli istnieje plik PID pod `/tmp/subagent-{session-id}-{agent}.pid`: sprawdza, czy PID działa. Zgłasza `running`, gdy działa, i `crashed`, gdy nie działa.
3. Jeśli nie istnieje żaden z plików: zgłasza `crashed`.

### agent parallel

```
oma agent parallel [tasks...] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

| Flaga | Skrót | Opis | Domyślnie |
| :----- | :------ | :----------- | :-------- |
| `--vendor` | — | Nadpisanie dostawcy CLI stosowane do wszystkich uruchamianych agentów. | Rozpoznany dla agenta z konfiguracji |
| `--inline` | `-i` | Traktuje argumenty zadań jako ciągi `agent:task[:workspace]` zamiast ścieżki pliku. | `false` |
| `--no-wait` |  | Background mode. Starts all agents and returns immediately without waiting for completion. PID list and logs are saved to `.agents/results/parallel-{timestamp}/`. | `false` (waits dla completion) |

**Format zadań inline:** `agent:task` lub `agent:task:workspace`
- Workspace jest wykrywany przez sprawdzenie, czy ostatni segment rozdzielony dwukropkiem zaczyna się od `./`, `/` lub jest równy `.`.
- Przykład: `backend:Implement auth API:./api` — agent=backend, task="Implement auth API", workspace=./api.
- Przykład: `frontend:Build login page` — agent=frontend, task="Build login page", workspace=wykryty automatycznie.

**Format pliku z zadaniami YAML:**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional
- agent: frontend
task: "Build user dashboard"
```

### recap

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Flaga | Opis | Domyślnie |
| :----- | :----------- | :-------- |
| `--window <period>` | Time window: `1d`, `3d`, `7d`, `2w`, `30d`. Ignored when `--date` is set. | `1d` |
| `--date <date>` | Konkretna data (`YYYY-MM-DD`). Ma pierwszeństwo przed `--window`. |  |
| `--tool <tools>` | Filtruje sesje według narzędzia. Wartości rozdzielane przecinkami: `grok`, `claude`, `codex`, `qwen`, `cursor`, `antigravity`. | wszystkie narzędzia |
| `--top <n>` | Pokazuje w podsumowaniu tylko N najważniejszych projektów/tematów. | bez limitu |
| `--sort <metric>` | Sortuje sesje według `count` lub `duration`. | `count` |
| `--mermaid` | Zamiast domyślnego podsumowania wypisuje wykres Gantta Mermaid. | `false` |
| `--graph` | Otwiera interaktywny graf w przeglądarce. Wyklucza się z `--mermaid`. | `false` |

> **Uwaga:** Generowanie plików reguł dostawcy (np. `.cursor/rules`) z zainstalowanych umiejętności obsługuje [`oma link <vendor>`](./commands.md#link), a nie osobne polecenie `export`.

### search

```
oma search <subcommand> [...]
```

Grupa `search` ma własne wyjście JSON (bez flag `--json` / `--output`). Użyj `--pretty` w podpoleceniach URL/zapytania, aby sformatować wyniki, i korzystaj z opcji właściwych podpoleceniom poniżej:

| Podpolecenie | Ważne opcje |
| :----------- | :--------------- |
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (domyślnie `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (domyślnie `en`), `--format <spec>`, `--timeout` (domyślnie `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (domyślnie `github`), `--language`, `--repo`, `--limit` (domyślnie `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | brak (uruchamia kontrole binariów Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

**Kody wyjścia:** `0` powodzenie, `1` błąd, `2` zablokowane, `3` nie znaleziono, `4` nieprawidłowe dane wejściowe, `5` wymagane uwierzytelnienie, `6` timeout. Używaj ich w skryptach, aby odróżniać przejściowe blokady od nieprawidłowych danych.

### image

```
oma image <subcommand> [...]
```

Format wyjścia jest kontrolowany osobno dla każdego podpolecenia przez `--output <text|json>`.

`image generate` przyjmuje:

| Flaga | Skrót | Opis | Domyślnie |
| :----- | :------ | :----------- | :-------- |
| `--vendor <name>` |  | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` rozpoznaje dostawcę na podstawie aktywnej konfiguracji `image:` i dostępnego uwierzytelnienia. | `auto` |
| `--size <size>` |  | `WxH` z obiema krawędziami podzielnymi przez 16, w zakresie 16–3840 i proporcją 1:3–3:1, albo `auto`. | domyślne dostawcy |
| `--quality <level>` |  | `low` \| `medium` \| `high` \| `auto`. | domyślne dostawcy |
| `--count <n>` | `-n` | Liczba obrazów, 1..5. | `1` |
| `--output-dir <dir>` |  | Katalog wyjściowy. Musi znajdować się w `$PWD`, chyba że ustawiono `--allow-external-output`. | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` |  | Zezwala na ścieżki `--output-dir` poza `$PWD`. | `false` |
| `--model <name>` |  | Nadpisanie modelu dostawcy. Model antigravity wybiera `agy`. | domyślne dostawcy |
| `--timeout <duration>` |  | Timeout obrazu podany jako czas trwania. | domyślne dostawcy |
| `--reference <path>` | `-r` | Obraz referencyjny do przeniesienia stylu/tematu. Można powtarzać (`-r a.png -r b.png`) lub podać listę rozdzielaną przecinkami. Sprawdzany jest rozmiar (≤5 MB), format (PNG/JPEG/GIF/WebP przez magic bytes) i liczba (≤10). Obsługiwane przez `codex` i `antigravity`; przez `pollinations` odrzucane z kodem 4. |  |
| `--yes` | `-y` | Pomija pytanie o potwierdzenie kosztu. | `false` |
| `--no-prompt-in-manifest` |  | Zapisuje SHA256 promptu zamiast tekstu źródłowego w `manifest.json`. | `false` |
| `--dry-run` |  | Wypisuje plan i szacowany koszt; niczego nie uruchamia. | `false` |
| `--output <format>` |  | `text` \| `json`. | `text` |

`image doctor` i `image vendor list` przyjmują `--output <text|json>`. `image list-vendors` pozostaje aliasem w pomocy; `vendor list` jest kanoniczną ścieżką wykrywania.

### video

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` przyjmuje opcje planowania i przechwytywania `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` i `--capture-stop`. Przyjmuje też `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output` oraz `--no-brief-in-manifest`. Przechwytywanie przeglądarki używa `--source web --url <url>`; domyślne źródło to `file`. Zwykłe renderowanie wymaga utworzonej kompozycji i działającego kompozytora; placeholdery są ograniczone do ścieżki testowej `OMA_VIDEO_MOCK=1`.

`video doctor` raportuje lub przygotowuje toolchain HyperFrames/MPT/Strudel. `compose` przygotowuje kontrakt kompozycji uruchomienia, a `render` lintuje, renderuje i bada wynik. `provider list` raportuje status dostawcy i klucza. Manifest uruchomienia i sekwencję odzyskiwania opisuje [Generowanie wideo](../guide/video-generation.md).

### memory init

```
oma memory init [--json] [--output <format>] [--force]
```

| Flaga | Opis | Domyślnie |
| :----- | :----------- | :-------- |
| `--force` | Nadpisuje puste lub istniejące pliki schematu w `.agents/state/memories/`. Bez tej flagi istniejące pliki pozostają nietknięte. | `false` |

### verify

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Flaga | Skrót | Opis | Domyślnie |
| :----- | :------ | :----------- | :-------- |
| `--workspace` | `-w` | Ścieżka katalogu workspace do weryfikacji. | Bieżący katalog roboczy |

**Typy agentów:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers` mierzy dokładność detektora słów kluczowych na oznaczonym korpusie. Progi procentowe są bramkami; użyj wyjścia JSON, gdy zadanie CI musi sprawdzić poszczególne wyniki. Stara forma `oma verify <agent-type>` pozostaje formą pomocy zgodności; zarejestrowana ścieżka to `verify agent`.

---

## Praktyczne przykłady

### Pipeline CI: aktualizacja i weryfikacja

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Automatyczne zbieranie metryk

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Wsadowe uruchamianie agentów z monitoringiem statusu

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### Czyszczenie w CI po testach

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Weryfikacja uwzględniająca workspace

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Retro z porównaniem do przeglądu sprintu

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Pełny skrypt kontroli zdrowia

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Health Check ==="

# Check CLI installations
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "MISSING" end)"'

# Check auth status
oma auth status --json | jq -r '.[] | "\(.name): \(.status)"'

# Check metrics
oma stats get --json | jq -r '"Sessions: \(.sessions), Tasks: \(.tasksCompleted)"'

echo "=== Done ==="
```

### Describe do introspekcji agentów

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```
## Pełny publiczny rejestr opcji

Poniższa macierz jest generowana ze sprawdzonego publicznego rejestru poleceń. To indeks pokrycia tej strony: wiersz z `—` nie ma opcji właściwych poleceniu, a współdzielone flagi główne i aliasy pomocy opisano powyżej. Uruchom `oma describe "<path>"`, aby sprawdzić pomoc runtime, gdy zmieni się gramatyka wartości.

| Ścieżka polecenia | Publiczne opcje | Cel |
| --- | --- | --- |
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | Instaluje umiejętności i konfiguracje oh-my-agent |
| `describe` | `—` | Opisuje polecenia CLI jako JSON do introspekcji w czasie działania |
| `uninstall` | `--dry-run, -y, --yes` | Usuwa pliki należące do oh-my-agent (zachowuje oma-config.yaml, mcp.json i umiejętności użytkownika) |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | Aktualizuje umiejętności do najnowszej wersji z rejestru |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | Wybiera serwery MCP przeglądarki (Aside, Chrome DevTools, Firefox DevTools) |
| `link` | `--dry-run` | Regeneruje pliki dostawców (.claude/, .cursor/ itd.) z SSOT .agents/ |
| `intel` | `—` | Potok inteligencji produktu: badania, luki, PRD i propozycje issue |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | Sugeruje wartościową pracę nad produktem na podstawie inteligencji rynkowej i kodu |
| `market` | `—` | Badania rynku na podstawie sygnałów społeczności przez zawsze aktualny silnik last30days |
| `market detect-trap` | `--force` | Kontrola preflight odrzucająca zapytania będące pułapką słów kluczowych |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | Raportuje silnik last30days, który uruchomi oma (zarządzana wersja, przypięta wersja lub kopia lokalna), oraz używanego Pythona |
| `market update` | `--json, --output <format>` | Pobiera najnowsze wydanie last30days do zarządzanej pamięci podręcznej oma (~/.cache/oma-market/last30days) |
| `market run` | `—` | Uruchamia silnik last30days (scripts/last30days.py) z podanymi argumentami; --save-dir domyślnie używa market.save_dir |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | Sprawdza instalacje CLI, konfiguracje MCP i status umiejętności |
| `profile` | `—` | Zarządza lokalnymi profilami wykonywania OMA |
| `profile list` | `--json, --output <format>` | Wyświetla lokalne profile |
| `profile show` | `--json, --output <format>` | Wyświetla lokalny profil |
| `profile create` | `--json, --output <format>` | Tworzy lokalny profil |
| `profile use` | `--shell <shell>, --json, --output <format>` | Wypisuje kod powłoki aktywujący istniejący profil |
| `profile run` | `—` | Uruchamia jedno polecenie z OMA_PROFILE ustawionym dla procesu potomnego |
| `retro` | `--interactive, --compare, --json, --output <format>` | Retrospektywa inżynierska z metrykami i trendami |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | Tworzy podsumowanie historii rozmów narzędzi AI |
| `docs` | `—` | Wykrywanie rozbieżności dokumentacji: weryfikuje referencje i proponuje aktualizacje dokumentów dotkniętych diffem |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | Wyodrębnia referencje L2 z dokumentów i raportuje uszkodzone cele. Przy okazji regeneruje docs/generated/doc-refs.json. Kod wyjścia: 0 = czysto, 1 = znaleziono uszkodzone referencje. Sprawdzanie URL przekazuje do `lychee` (instalacja: brew install lychee). |
| `docs sync` | `--json` | Na podstawie diffu git wyświetla dokumenty odwołujące się do zmienionych plików. LLM hosta (runtime umiejętności) powinien odczytać tę listę wraz z diffem i zaproponować poprawki zgodnie z kontraktem SKILL.md — CLI nigdy nie edytuje dokumentów automatycznie. Domyślny zakres diffu: --cached (zmiany staged), fallback do HEAD~1..HEAD. |
| `docs i18n` | `--json, --min-severity <level>` | Wykrywa rozbieżność między angielskimi dokumentami źródłowymi (web/docs) a tłumaczeniami i18n (web/i18n/{lang}/...). Dla każdej pary emituje sygnały strukturalne (liczba wierszy, nagłówków i znacznik czasu ostatniego commita), aby LLM hosta mógł zdecydować, które tłumaczenia wymagają synchronizacji z diffem. CLI nigdy nie edytuje tłumaczeń. |
| `docs lint` | `--json, --locales <list>` | Lintuje przetłumaczone dokumenty pod kątem antywzorców treści (np. em dash w celach CJK). Uzupełnia `oma docs i18n` (rozbieżność strukturalna) o kontrole stylu i antywzorców według oma-translation SKILL.md § Etap 4. CLI nigdy nie naprawia automatycznie — tylko raportuje problemy, aby LLM hosta mógł przebudować tekst. |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | Emituje artefakty zgodne ze standardami z SSOT .agents/ (specyfikacja Agent Skills, pakiet Agent Plugins, marketplace pluginów Claude Code, AGENTS.md i dokumenty dostawców zakresu cli/) |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | Czyści osierocone procesy subagentów i pliki tymczasowe |
| `bridge` | `--context <name>` | Przekazuje MCP stdio do współdzielonego serwera Serena dla projektu (uruchamianego na żądanie) |
| `verify` | `—` | Weryfikuje wynik subagenta (backend/frontend/mobile/qa/debug/pm) albo mierzy dokładność wyzwalacza detektora słów kluczowych |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` |  |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | Mierzy dokładność wyzwalacza detektora słów kluczowych na oznaczonym korpusie promptów |
| `vault` | `—` | Zarządza kluczami API i sekretami w systemowym magazynie kluczy (macOS Keychain / Linux Secret Service / Windows Credential Manager) |
| `vault store` | `--value <value>` | Zapisuje sekret pod <name> (interaktywny prompt hasła) |
| `vault get` | `—` | Wypisuje zapisaną wartość na stdout (do: export KEY=$(oma vault get <name>)) |
| `vault list` | `--json` | Wyświetla nazwy zapisanych sekretów (wartości nigdy nie są pokazywane) |
| `vault delete` | `—` | Usuwa sekret z magazynu kluczy i indeksu |
| `star` | `—` | Dodaje gwiazdkę oh-my-agent na GitHubie |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | Wizualizuje strukturę projektu jako graf zależności |
| `search` | `—` | Mechanizmy wyszukiwania — fetch, meta, rss, media, trust i code |
| `search providers` | `--json, --pretty` | Wyświetla zarejestrowanych dostawców wyszukiwania i sprawdza wybór bez połączeń sieciowych |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | Wyszukuje wybranym dostawcą sieci (Brave ma adapter CLI) |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | Pobiera URL przez potok strategii o rosnącym poziomie |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | Wyodrębnia OGP / JSON-LD / Schema.org z URL |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | Wyodrębnia metadane mediów przez yt-dlp (1858 witryn) |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | Pobiera przez AMP / archive.today / Wayback |
| `search trust` | `--pretty` | Rozpoznaje poziom / wynik zaufania domeny |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | Wyszukuje kod przez gh / glab |
| `search doctor` | `—` | Sprawdza zależności (Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search api` | `—` |  |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | Pobiera przez dopasowane API platformy (faza 0) |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | Rozsyła wyszukiwanie słów kluczowych do obsługujących je platform |
| `search rss` | `—` |  |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | Wykrywa i analizuje kanał RSS/Atom dla URL |
| `search rss google` | `--locale <value>` | Buduje URL RSS Google News dla zapytania |
| `harness` | `—` | Ocenia nakładki harness OMA na izolowanych zadaniach repozytorium |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | Porównuje nakładkę .agents kandydata z bieżącym baseline |
| `harness incident promote` | `--skill <id>, --draft, --force, --json, --output <format>` | Wywodzi fixture regresji umiejętności z zapisanego incydentu |
| `harness feedback` | `--live, --apply, --max-epochs <n>, --incident <ids...>, --scan-runs, --json, --output <format>` | Promuje incydenty i optymalizuje objęte umiejętności |
| `harness evolution enable` | `--max-dispatches <n>, --cron <expr>, --mode <mode>, --json, --output <format>` | Włącza budżetowany, zaplanowany cykl sprzężenia zwrotnego projektu; tryb to apply lub propose |
| `harness evolution status` | `--json, --output <format>` | Pokazuje konfigurację, harmonogram, oczekującą pracę, konflikty i ostatni cykl |
| `harness evolution disable` | `--json, --output <format>` | Wyłącza zaplanowany cykl sprzężenia zwrotnego projektu |
| `harness evolution run` | `--json, --output <format>` | Uruchamia jeden cykl w zapisanym trybie i budżecie włączonego projektu |
| `slide` | `—` | Narzędzia prezentacji HTML — tworzenie szkieletu, walidacja, eksport i edycja prezentacji 1920×1080 |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | Geometryczna bramka jakości — renderuje slajdy przez puppeteer-core i sprawdza przepełnienie/nakładanie/rozmiar czcionki |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | Łączy pliki slajdów w jeden samowystarczalny artefakt .html |
| `slide edit` | `--workspace <path>, --port <n>` | Otwiera edytor bbox w przeglądarce (serwer node:http pod 127.0.0.1 przekazuje do runnera agenta oma) |
| `slide doctor` | `—` | Bada wymagane zależności (chrome, puppeteer-core) i opcjonalne (yt-dlp, pptxgenjs) |
| `slide create` | `--output-dir <path>, --force` | Tworzy katalog roboczy slajdów ze startowym HTML, assets/ i meta.json |
| `slide preview` | `--workspace <path>` | Buduje viewer.html (deck-stage web component + speaker-notes panel, toggle z `n`) |
| `slide export` | `—` |  |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | Eksportuje slajdy do PDF przez puppeteer-core |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | Eksportuje każdy slajd jako PNG przez puppeteer-core |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | [EKSPERYMENTALNE] Eksportuje do PPTX przez pptxgenjs (oparte na rastrze, gradienty rastrowane) |
| `slide import` | `—` |  |
| `slide import pptx` | `--workspace <path>` | Importuje plik .pptx do fragmentów slajdów przez officeparser (bunx, best-effort) |
| `slide asset` | `—` |  |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | Pobiera wideo przez yt-dlp do ./assets/ i wypisuje lokalną referencję |
| `slide style` | `—` | Przegląda i pobiera presety stylu projektu |
| `slide style list` | `—` | Wyświetla dostępne presety stylu (vendored + indeks bold-template) |
| `slide style preview` | `—` | Wyświetla podgląd presetu stylu w terminalu |
| `slide style get` | `--refresh` | Pobiera design.md pogrubionego szablonu (zawsze aktualny main; buforowany jako fallback offline) |
| `scholar` | `—` | Sidecary artykułów Knows.academy (fallbacki OpenAlex + Semantic Scholar) |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | Wyszukuje artykuły (knows.academy → OpenAlex → Semantic Scholar) |
| `scholar resolve` | `—` | Znajduje najlepsze dopasowanie artykułu w knows.academy, OpenAlex i Semantic Scholar |
| `scholar get` | `--section <name>` | Pobiera sidecar (knows record_id) lub metadane pracy (W-id, DOI, arXiv:<id>, CorpusId:<n>, S2 paperId) |
| `scholar lint` | `--lenient, --fail-on-warning` | Weryfikuje sidecar .knows.yaml lub .knows.json (v0.9.0) |
| `image` | `—` | Generowanie obrazów AI u wielu dostawców — równoległy dispatch uwzględniający uwierzytelnienie |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | Generuje images przez pollinations (flux/zimage, free), codex (gpt-image-2, ChatGPT OAuth), lub antigravity (gemini nano-banana przez `agy` CLI, free z Gemini Code Assist sign-in) |
| `image doctor` | `--output <format>` | Sprawdza uwierzytelnienie i status instalacji każdego dostawcy |
| `image vendor` | `—` |  |
| `image vendor list` | `--output <format>` | Wyświetla zarejestrowanych dostawców i obsługiwane modele |
| `video` | `—` | Generowanie krótkich filmów, objaśnień i dem |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | Generuje katalog uruchomienia wideo z briefu |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | Sprawdza gotowość dostawcy wideo i kompozytora |
| `video compose` | `--output <format>, --refresh, --offline` | Tworzy szkielet projektu HyperFrames uruchomienia na najnowszym toolchainie + heygen-com/hyperframes; wypisuje kontrakt autorstwa |
| `video render` | `--output <format>` | Ponownie renderuje katalog uruchomienia z render-spec.json |
| `video provider` | `—` |  |
| `video provider list` | `--output <format>` | Wyświetla dostawców wideo i ich dostępność |
| `serena` | `—` | Narzędzia cyklu życia serwera językowego Serena MCP |
| `serena reap` | `--dry-run, --quiet` | Kończy bezczynne procesy potomne LSP Sereny, aby odzyskać pamięć (Serena sama się naprawia przy następnym wywołaniu) |
| `serena reaper` | `—` |  |
| `serena reaper enable` | `--dry-run` | Instaluje cykliczne zadanie Serena Reaper (uruchamiane co 5 minut) |
| `serena reaper disable` | `--dry-run` | Odinstalowuje cykliczne zadanie Serena Reaper |
| `explain` | `—` | Objaśnia zarządzanie artefaktami i narzędzia walidacji jakości |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | Weryfikuje samowystarczalne artefakty raportów HTML explain |
| `explain render` | `--output-file <path>, --template <name>, --theme <name>, --mode <mode>, --style <level>, --lang <code>, --archify, --no-archify, --open, --output <format>, --json` | Renderuje szkic Markdown (plik lub stdin) do jednej samodzielnej strony HTML z objaśnieniem |
| `explain lint` | `--style <level>, --lang <code>, --output <format>, --json` | Sprawdza tekst szkicu (plik lub stdin) bez renderowania |
| `explain patch` | `--panel <id>, --open, --output <format>, --json` | Podmienia jeden panel wyrenderowanej strony na podstawie osadzonego szkicu |
| `explain components` | `--output <format>, --json` | Wypisuje komponenty dostępne w szkicu albo składnię jednego z nich |
| `diagram` | `—` | Pomocnicze narzędzia silnika diagramów (interaktywny HTML archify lub fallback Mermaid) |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | Raportuje, którego silnika diagramów powinny używać workflow, i gdzie znajduje się archify |
| `diagram update` | `--json, --output <format>` | Pobiera najnowsze wydanie archify do zarządzanej pamięci podręcznej oma (~/.cache/oma-diagram/archify) |
| `diagram archify` | `—` | Run the installed archify CLI (doctor \| guide \| validate \| deliver \|visual-check …) z update checks disabled |
| `help` | `—` | Wyświetla informacje pomocy |
| `version` | `—` | Wyświetla numer wersji |
| `dashboard` | `—` |  |
| `dashboard terminal` | `—` | Uruchamia terminalowy dashboard (monitoring agentów w czasie rzeczywistym) |
| `dashboard web` | `—` | Uruchamia dashboard webowy pod http://127.0.0.1:9847 |
| `auth` | `—` |  |
| `auth status` | `--json, --output <format>` | Sprawdza status uwierzytelnienia wszystkich obsługiwanych CLI |
| `hook` | `—` |  |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | Przekazuje zdarzenie hooka dostawcy przez scentralizowany router hooków oma (design 019) |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | Bada zgodność hooków L1 dostawców i wypisuje macierz (D63) |
| `state` | `—` |  |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | Dopisuje zdarzenie workflow OMA L1 |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | Migruje odziedziczone sesje do profilu domowego i usuwa zweryfikowane oryginały |
| `state get` | `--json, --output <format>` | Sprawdza jedną sesję OMA L1 po ID |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Sprawdza stan workflow OMA L1 |
| `state repair` | `--dry-run, --json, --output <format>` | Naprawia pliki stanu workflow OMA L1 |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | Weryfikuje wymagane zdarzenia L1 dla punktu kontrolnego workflow |
| `state decisions` | `—` |  |
| `state decisions list` | `--json, --output <format>` | Wyświetla wymagane punkty kontrolne L1 decision.made |
| `state inject-log` | `—` |  |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | Wyświetla lub przegląda dzienniki audytu inject dla każdej granicy (D52) |
| `state inject-log get` | `--json, --output <format>` | Wyświetla lub przegląda dzienniki audytu inject dla każdej granicy (D52) |
| `state summary` | `--category <category>, --json, --output <format>` | Eksportuje podsumowanie sesji do magazynu koordynacji |
| `state trajectory` | `--category <category>, --open, --width <columns>, --sequence, --ascii, --json, --output <format>` | Pokazuje trajektorię sesji: zdarzenia L1 połączone z transkryptami dostawców |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | Sprawdza, czy samonaprawa jest dozwolona dla agenta |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Sprawdza stan workflow OMA L1 |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Sprawdza stan workflow OMA L1 |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | Sprawdza stan workflow OMA L1 |
| `ralph` | `—` |  |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | Weryfikuje artefakty ralph EXEC (bramka antyobejściowa, ralph.md krok 1.3) |
| `goal` | `—` |  |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | Dołącza kontrakt celu (deterministyczna bramka zatrzymania / budżet czasu rzeczywistego) do aktywnego trwałego workflow |
| `stats` | `—` |  |
| `stats get` | `--json, --output <format>` | Wyświetla metryki produktywności |
| `stats reset` | `--json, --output <format>` | Wyświetla metryki produktywności |
| `agent` | `—` |  |
| `agent context` | `--project-root <path>, --difficulty <level>` | Ładuje kontekst wybrany przez graf do promptu natywnego dispatchu |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | Wznawia bezpieczne nieukończone zadania, ponownie używając bieżących dowodów akceptacji |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | Rozpoczyna natywne uruchomienie agenta oparte na dowodach |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | Wykonuje argv weryfikacji po -- i zapisuje rzeczywisty kod wyjścia |
| `agent finish` | `--project-root <path>` | Weryfikuje wynik natywnego agenta względem potwierdzeń weryfikacji |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | Uruchamia subagenta (prompt może być tekstem inline lub ścieżką pliku) |
| `agent status` | `--project-root <path>` | Sprawdza status subagentów |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | Uruchamia wiele subagentów równolegle |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | Uruchamia przegląd kodu przez zewnętrzne CLI (codex/claude/qwen/grok) |
| `model` | `—` |  |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | Porównuje rejestr modeli z bieżącymi listami modeli dostawców |
| `model probe` | `--json, --timeout <duration>` | Bada slug modelu przez CLI dostawcy, aby sprawdzić, czy jest akceptowany |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | Uruchamia model:check --probe internally i generate an oma-config `models:` patch dla accepted candidates |
| `memory` | `—` |  |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Konfiguruje połączenie Honcho lub lokalne dane uwierzytelniające embeddingów |
| `memory init` | `--force, --json, --output <format>` | Inicjalizuje magazyn koordynacji w .agents/state/memories |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | Przygotowuje konfigurację punktu końcowego AgentMemory |
| `memory daemon` | `—` | Zarządza procesem daemona AgentMemory należącym do OMA |
| `memory daemon status` | `--json, --output <format>` | Wyświetla status daemona |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | Uruchamia AgentMemory w tle |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | Zatrzymuje daemona AgentMemory należącego do OMA |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | Ponownie uruchamia daemona AgentMemory należącego do OMA |
| `memory service` | `—` | Zarządza integracją usługi systemowej AgentMemory |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | Instaluje integrację usługi AgentMemory launchd/systemd |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | Odinstalowuje integrację usługi AgentMemory launchd/systemd |
| `memory status` | `--json, --output <format>` | Wyświetla zdrowie wybranego dostawcy pamięci semantycznej |
| `memory retry` | `—` |  |
| `memory retry drain` | `--dry-run, --json, --output <format>` | Opróżnia kolejkę ponowień obserwacji AgentMemory |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | Importuje historię rozmów dostawcy do AgentMemory |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | Konserwuje lokalne przechowywanie AgentMemory: kopia zapasowa, przycinanie, vacuum |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | Konserwuje lokalne przechowywanie AgentMemory: kopia zapasowa, przycinanie, vacuum |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | Konserwuje lokalne przechowywanie AgentMemory: kopia zapasowa, przycinanie, vacuum |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | Konserwuje lokalne przechowywanie AgentMemory: kopia zapasowa, przycinanie, vacuum |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | Wykonuje garbage collection pamięci lokalnej projektu: usuwa stare sesje L1 i tymczasowe pliki Sereny |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | Zatrzymuje, tworzy kopię, aktualizuje, ponownie uruchamia i sprawdza zdrowie AgentMemory |
| `skill` | `—` | Sprawdza i audytuje zainstalowane umiejętności |
| `skill audit` | `--json, --output <format>` | Sprawdza podobieństwo opisów frontmatter między zainstalowanymi umiejętnościami |
| `skill lint` | `--skill <id>, --json, --output <format>` | Wykrywa problemy autorskie umiejętności (frontmatter, struktura, uszkodzone referencje) |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --trials <n>, --require-coverage, --neg-transfer, --routing, --json, --output <format>` | Mierzy wzrost użyteczności umiejętności (treatment względem baseline na zadaniach odłożonych) |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --memory <mode>, --json, --output <format>` | Optymalizuje SKILL.md umiejętności, aby zmaksymalizować zmierzony wzrost użyteczności na zadaniach odłożonych |
| `skill meta-optimize` | `--target <part>, --skill <ids...>, --anchor <ids...>, --repeats <n>, --candidates <n>, --max-epochs <n>, --edits-per-epoch <k>, --live, --apply, --memory <mode>, --yes, --json, --output <format>` | Proponuje i ocenia zmiany procedury ewolucji na odłożonych umiejętnościach |
| `skill procedure` | `--export, --json, --output <format>` | Pokazuje procedurę ewolucji (prompty optymalizatora/Maintainera, konstytucję) i jej hashe |
| `skill evolution-stats` | `--skill <id>, --json, --output <format>` | Agreguje zapisane przebiegi optymalizacji według wyniku, trybu pamięci i procedury |
| `skill promotions` | `--skill <id>, --all, --json, --output <format>` | Opisuje zapisane promocje i wycofania SKILL.md dla umiejętności albo, z `--all`, dla każdej umiejętności i procedury |
| `skill rollback` | `--skill <id>, --json, --output <format>` | Przywraca treść SKILL.md zastąpioną przez ostatnią zapisaną promocję |
| `schedule` | `—` |  |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | Rejestruje zaplanowane zadanie agenta |
| `schedule list` | `--json, --output <format>` | Wyświetla zaplanowane zadania ze stanem rozbieżności z systemem (synced/missing-in-os/orphan-in-os), pogrupowane według projektu |
| `schedule delete` | `—` | Usuwa zaplanowane zadanie z manifestu i systemowego harmonogramu |
| `schedule run` | `—` | Wykonuje zaplanowane zadanie po id (wywoływane przez systemowy harmonogram; zwykle nie wywołuje się bezpośrednio) |
| `schedule sync` | `--prune` | Ponownie synchronizuje manifest → harmonogram systemowy. Użyj --prune, aby usunąć osierocone zadania systemowe. |
