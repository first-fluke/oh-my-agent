---
title: "Opcje CLI"
description: Referencja opcji CLI oma — flagi globalne, kontrola wyjścia, zmienione nazwy, opcje poszczególnych poleceń, kody wyjścia oraz rejestr generowany z oma describe.
---

# Opcje CLI

## Szybka referencja {#quick-reference}

| Chcę... | Użyj |
|:-------------|:----|
| Uruchomić bez pytań | `-y` / `--yes` (honorowane są też `OMA_YES=1` i `CI=true`); `oma update --ci` daje zwykłe, nieinteraktywne wyjście |
| Otrzymać JSON | `--json`, `--output json` lub `OH_MY_AG_OUTPUT_FORMAT=json`. Wyjątki opisuje sekcja [Opcje wyjścia](#output-options) |
| Działać na instalacji globalnej | `-g` / `--global` lub `OMA_INSTALL_GLOBAL=1`; `OMA_HOME` przenosi katalog główny przechowywania globalnego |
| Podejrzeć zmiany przed ich wprowadzeniem | `--dry-run` tam, gdzie polecenie je wymienia. Zobacz [Które polecenia obsługują JSON](#commands-supporting-json-output) |
| Zobaczyć flagi polecenia | `oma <command> --help`, `oma describe "<command>"` lub [rejestr](#complete-public-option-registry) na końcu tej strony |
| Naprawić skrypt, który przestał działać po aktualizacji | [Zmienione nazwy poleceń i opcji](#renamed-commands-and-options) |
| Rozgałęzić skrypt w zależności od błędu | [Kody wyjścia](#exit-codes) |

---

## Opcje globalne {#global-options}

Te opcje są dostępne dla głównego polecenia `oma` / `oh-my-agent`:

| Flaga | Opis |
|:-----|:-----------|
| `-g, --global` | Działa na globalnej instalacji OMA (`~/.oma/.agents/` lub `$OMA_HOME/.agents/`) zamiast na `<cwd>/.agents/` |
| `-y, --yes` | Pomija pytania, gdy wybrane polecenie obsługuje potwierdzenie; kontrole bezpieczeństwa danego polecenia nadal obowiązują. Honoruje też `OMA_YES=1` i `CI=true` |
| `-V, --version` | Wypisuje numer wersji i kończy działanie |
| `-h, --help` | Wyświetla pomoc dla polecenia |

Wszystkie podpolecenia obsługują również `-h, --help`, aby wyświetlić własny tekst pomocy.

`--global` ustawia katalog główny instalacji dla całego procesu, więc `install`, `update`, `link` i `uninstall` używają instalacji globalnej niezależnie od bieżącego katalogu:

| Tryb | Jak go wybrać | Położenie `.agents/` |
|:-----|:-----------------|:--------------------|
| Projekt (domyślnie) | nic | `<cwd>/.agents/` |
| Globalny | `--global` lub `OMA_INSTALL_GLOBAL=1` | `$OMA_HOME/.agents/` (domyślnie `~/.oma/.agents/`) |

`OMA_HOME=<abs-path>` zmienia katalog główny przechowywania globalnego; musi to być ścieżka bezwzględna. Instalacje projektowe nadal używają cwd. Uruchom `oma home --json`, aby wyświetlić rozpoznane lokalizacje, oraz `oma home migrate --dry-run`, aby podejrzeć migrację starszych danych. Zobacz [Instalacja globalna](../guide/global-install.md).

---

## Zmienione nazwy poleceń i opcji {#renamed-commands-and-options}

Ścieżki poleceń używają spacji, a nie dwukropków, a kilka poleceń i opcji zmieniło nazwy. Stare formy są odrzucane, a nie traktowane jako aliasy:

- Stare polecenie kończy się błędem `Unknown command: ... Use oma --help.` lub `Unexpected argument for oma <group>. Use --help.`
- Same nazwy grup `dashboard`, `state` i `stats` wyświetlają teraz pomoc grupy zamiast uruchamiać polecenie.
- Stara opcja kończy się błędem `Removed option <old>. Use <new>.`; usunięte flagi akcji `state` i `stats` kończą się błędem `Removed option <old>. Use an explicit action; see oma --help.`

Rozpoznawane są nadal tylko `schedule:run` i `serena daemon:gc`, dzięki czemu wpisy systemowego harmonogramu utworzone przez starsze wersje nadal działają.

| Stare polecenie | Użyj teraz |
|:------------|:--------|
| dowolna ścieżka z dwukropkiem `a:b` (`agent:spawn`, `state:emit`, ...) | ścieżka rozdzielona spacjami (`agent spawn`, `state emit`) |
| `dashboard`, `dashboard:web` | `dashboard terminal`, `dashboard web` |
| `hook --vendor ...` | `hook run --vendor ...` |
| `intel run` | `intel suggest` |
| `state`, `state:get <id>` | `state list`, `state get <id>` |
| `state --activate` / `--archive` / `--purge` | `state activate` / `state archive` / `state purge` |
| `state:required-decisions` | `state decisions list` |
| `state:inject-log ... --entry <file>` | `state inject-log list`, `state inject-log get <session-id> <file>` |
| `stats`, `stats --reset` | `stats get`, `stats reset` |
| `memory:retry-drain` | `memory retry drain` |
| `vault rm` | `vault delete` |
| `search api <url>`, `search rss <url>` | `search api fetch <url>`, `search rss fetch <url>` |
| `search api:search`, `search rss:google` | `search api search`, `search rss google` |
| `skills audit` / `lint` / `eval` / `promotions` / `rollback` / `procedure` / `meta-optimize` / `evolution-stats` / `matrix` | `skill ...` (liczba pojedyncza) |
| `skills opt` | `skill optimize` |
| `slide new`, `slide viewer` | `slide create`, `slide preview` |
| `slide pdf` / `png` / `pptx` | `slide export pdf` / `png` / `pptx` |
| `slide import-pptx`, `slide fetch-video`, `slide styles ...` | `slide import pptx`, `slide asset fetch-video`, `slide style ...` |
| `image list-vendors`, `video list-providers` | `image vendor list`, `video provider list` |
| `schedule:add`, `schedule:remove` | `schedule create`, `schedule delete` |
| `verify <agent-type>` | `verify agent <agent-type>` |

| Stara opcja | Użyj teraz |
|:-----------|:--------|
| `-m, --model <vendor>` | `--vendor <vendor>` |
| `-r, --root <path>` | `--project-root <path>` |
| `--sid`, `--session` | `--session-id <id>` |
| `--format <fmt>` | `--output <format>` (`search media --format` pozostaje bez zmian) |
| `--out <dir>`, `--out-dir` | `--output-dir <path>` |
| `--out <file>`, `--out-file` | `--output-file <path>`; `--report-file <path>` w `slide validate` i `explain validate` |
| `--dir` | `--workspace <path>` w poleceniach `slide`, `--output-dir <path>` w `slide create`, `--input-dir <path>` w `explain validate` |
| `--max` | `--limit <n>` w `scholar search` |
| `--allow-external-out` | `--allow-external-output` |
| `--timeout <seconds>`, `--timeout <ms>`, `--timeout-minutes` | `--timeout <duration>` (`30s`, `2m`). Jednostka jest wymagana tam, gdzie stara wartość była w milisekundach lub minutach |
| `--max-age-days` | `--max-age <duration>`; `--expires-after <duration>` w `schedule create` |

---

## Opcje wyjścia {#output-options}

Wiele poleceń obsługuje wyjście maszynowe dla potoków CI/CD i automatyzacji. Wyjście JSON można zażądać na trzy sposoby.

### 1. Flaga --json

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

Flaga `--json` jest dostępna tylko na ścieżkach, które ją wymieniają. Nie wyciągaj wniosków z samej rodziny poleceń: na przykład końcowe ścieżki `image`, `video` i `slide` udostępniają `--output` tam, gdzie wymienia je rejestr, a `search` zawsze wypisuje JSON.

### 2. Flaga --output

```bash
oma stats get --output json
oma doctor --output text
```

W większości poleceń `--output` przyjmuje `text` lub `json`. Zapewnia tę samą funkcję co `--json`, ale pozwala też jawnie zażądać wyjścia tekstowego, co przydaje się, gdy zmienna środowiskowa jest ustawiona na `json`.

**Walidacja:** Jeśli podano nieprawidłowy format, CLI zgłasza: `Invalid output format: {value}. Expected one of text, json`.

### 3. Zmienna środowiskowa OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Ustaw tę zmienną środowiskową na `json`, aby JSON był domyślnym formatem w poleceniach, które go obsługują. Rozpoznawane jest tylko `json`; każda inna wartość jest ignorowana, a wyjście pozostaje tekstowe.

### Jak wybierany jest format {#how-the-format-is-chosen}

Flaga w wierszu poleceń wygrywa ze zmienną środowiskową. Podanie jednocześnie `--json` i `--output` z wartością inną niż JSON jest błędem, a nie regułą pierwszeństwa.

| Podajesz | Zmienna nieustawiona | `OH_MY_AG_OUTPUT_FORMAT=json` |
|:---------|:---------------|:------------------------------|
| nic | tekst | JSON |
| `--json` lub `--output json` | JSON | JSON |
| `--output text` | tekst | tekst |
| `--json --output text` | błąd: `--json conflicts with --output. Choose one output format.` | ten sam błąd |

Niektóre polecenia używają własnych wartości formatu:

| Polecenia | Kontrola formatu |
|:---------|:---------------|
| `search ...` | Zawsze JSON; `--pretty` dodaje tylko wcięcia. `search providers` i `search web` przyjmują też `--json` |
| `describe` | Zawsze JSON |
| `image ...`, `video ...` | `--output text\|json` (domyślnie `text`) |
| `slide validate` | `--output json\|concise` (domyślnie `concise`) |
| `explain validate` | `--output concise\|json` (domyślnie `concise`) lub `--json` |
| `hook probe` | `--output text\|md\|json` |

### Które polecenia obsługują JSON {#commands-supporting-json-output}

Każde polecenie przyjmujące `--json` lub `--output` zgłasza `supportsJsonOutput: true` w `oma describe`, a [rejestr](#complete-public-option-registry) na końcu tej strony wymienia flagi dla każdej ścieżki. Polecenia, które zawsze wypisują JSON bez flagi (`describe` i większość podpoleceń `search`), nie są oznaczone. Aby wyświetlić te ścieżki z poziomu CLI:

```bash
oma describe | jq -r '.. | objects | select(.supportsJsonOutput? == true) | .path'
```

W ten sam sposób użyj `select(.supportsDryRun? == true)`, aby znaleźć polecenia z `--dry-run`.

---

## Opcje poszczególnych poleceń {#per-command-options}

### install

```text
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

Instalator interaktywny zapisuje ustawienia wybranego dostawcy w `.agents/oma-config.yaml`. Flagi dostawców wybierają integracje wyszukiwania w sieci, inteligencji kodu i pamięci semantycznej; `--honcho-url` i `--honcho-workspace` konfigurują usługę pamięci Honcho po wybraniu tego dostawcy. Główna flaga `-y, --yes` działa, gdy przebieg instalacji prosi o potwierdzenie.

### doctor

```text
oma doctor [--json] [--output <format>] [--profile] [--heal-check <agentType>]
```

| Flaga | Opis | Domyślnie |
|:-----|:-----------|:--------|
| `--json` | Emituje JSON zamiast sformatowanego tekstu. | `false` |
| `--output <format>` | Jawny format wyjścia (`text` lub `json`). Zobacz [Opcje wyjścia](#output-options). | `text` |
| `--profile` | Wyświetla macierz zdrowia profilu (rozpoznany slug modelu, CLI i status uwierzytelnienia każdego agenta z aktywnego `model_preset` oraz nadpisań `agents:`). Zobacz [Modele per agent](../guide/per-agent-models.md). | `false` |
| `--heal-check <agentType>` | Dołącza kontrolę bramki samonaprawy dla agenta. | |

Z `--json` raport ma pola najwyższego poziomu `ok` i `issues`, a `doctor` kończy się kodem `1`, gdy `issues` jest większe od zera.

### update

```text
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| Flaga | Skrót | Opis | Domyślnie |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Nadpisuje dostosowane przez użytkownika pliki konfiguracji podczas aktualizacji. Dotyczy: `oma-config.yaml`, `mcp.json`, katalogów `stack/`. Bez tej flagi pliki są kopiowane zapasowo przed aktualizacją i przywracane po niej. | `false` |
| `--with-new-skills` | | Instaluje umiejętności dodane do rejestru od bieżącej instalacji. | `false` |
| `--ci` | | Uruchamia nieinteraktywny tryb CI. Pomija wszystkie pytania o potwierdzenie i używa zwykłego wyjścia konsoli zamiast spinnerów i animacji. Wymagane w potokach CI/CD bez stdin. | `false` |
| `--yes` | `-y` | Pomija pytania. Nie tworzy brakujących katalogów dostawców, chyba że użyto `--all` lub `--vendor`. | `false` |
| `--all` | | Tworzy lub aktualizuje wszystkich obsługiwanych dostawców zakresu projektu. | `false` |
| `--vendor <vendors>` | | Tworzy lub aktualizuje listę dostawców rozdzielaną przecinkami, np. `claude,qwen`. | Tylko istniejące katalogi dostawców |

`oma update mcp` używa tych samych opcji `--yes`, `--ci`, `--all` i `--vendor` przy wyborze serwerów MCP przeglądarki. Nie używa `--force` ani `--with-new-skills`.

**Działanie z --force:**
- `oma-config.yaml` jest zastępowany domyślną wersją z rejestru.
- `mcp.json` jest zastępowany domyślną wersją z rejestru.
- Katalog backendu `stack/` (zasoby zależne od języka) jest zastępowany.
- Wszystkie pozostałe pliki są aktualizowane niezależnie od tej flagi.

**Działanie z --ci:**
- Brak `console.clear()` przy starcie.
- `@clack/prompts` zostaje zastąpione zwykłym `console.log`.
- Pytania o wykrycie konkurencyjnych narzędzi są pomijane.
- Błędy są zgłaszane jako wyjątki zamiast wywołania `process.exit(1)`.

**Zakres dostawców:**
- `oma update` aktualizuje tylko katalogi dostawców, które już istnieją.
- `oma update --yes` używa tego samego zakresu dostawców bez pytań.
- `oma update --all` tworzy lub aktualizuje wszystkich obsługiwanych dostawców zakresu projektu.
- `oma update --vendor claude,qwen` tworzy lub aktualizuje tylko wymienionych dostawców.

### stats

```text
oma stats get [--json | --output <format>]
oma stats reset [--json | --output <format>]
```

| Flaga | Opis | Domyślnie |
|:-----|:-----------|:--------|
| `--json` | Emituje JSON. `stats get` wypisuje obiekt metryk; `stats reset` wypisuje `{"reset":true}`. | `false` |
| `--output <format>` | Emituje `text` lub `json`. | `text` |

`oma stats reset` jest poleceniem resetowania; `oma stats get --reset` kończy się błędem `Removed option --reset`.

:::note
`stats get` nie jest tylko do odczytu. Każde wywołanie liczy się jako sesja i dodaje diff ostatnich 10 commitów do skumulowanych liczników plików i wierszy w `.agents/state/metrics.json`, więc nie odpytuj go cyklicznie.
:::

### retro

```text
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flaga | Opis | Domyślnie |
|:-----|:-----------|:--------|
| `--interactive` | Starszy tryb prowadzony: pyta, co udało się osiągnąć, jakie są kluczowe wnioski i kolejne kroki. Ignoruje okno, `--compare` i `--json`. | `false` |
| `--compare` | Porównuje bieżące okno czasowe z poprzednim o tej samej długości. Pokazuje metryki delta (np. commity +12, dodane wiersze -340). | `false` |

**Format argumentu window:** liczba, po której następuje `h`, `d` lub `w`.
- `24h`: 24 godziny
- `7d`: 7 dni
- `2w`: 2 tygodnie
- Pominięcie oznacza wartość domyślną (7 dni)

Miesiące nie są obsługiwane: `oma retro 1m` kończy się błędem `Invalid window: 1m. Use: 24h, 7d, 14d, 30d, 2w`.

### cleanup

```text
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Flaga | Skrót | Opis | Domyślnie |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Tryb podglądu. Wyświetla elementy do wyczyszczenia, ale niczego nie zmienia. Kod wyjścia 0 niezależnie od wyników. | `false` |
| `--yes` | `-y` | Pomija wszystkie pytania o potwierdzenie. Czyści wszystko bez pytania. Przydatne w skryptach i CI. | `false` |

**Co zostaje wyczyszczone:**
1. Osierocone pliki PID: `/tmp/subagent-*.pid`, gdy wskazany proces już nie działa.
2. Osierocone pliki dziennika: `/tmp/subagent-*.log` odpowiadające nieaktywnym PID-om.
3. Katalogi Gemini Antigravity: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. Z czasem gromadzą stan i mogą znacznie urosnąć.

### agent spawn

```text
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Flaga | Skrót | Opis | Domyślnie |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | — | Łączy ponowienie z poprzednim identyfikatorem uruchomienia. | |
| `--fallback-vendors` | — | Jawny, uporządkowany łańcuch dostawców fallbacku rozdzielony przecinkami. | |
| `--task-id` | — | ID zadania z planu sesji. | ID agenta |
| `--vendor` | — | Nadpisanie dostawcy CLI. `--help` wymienia `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` i `pi`. | Rozpoznany z konfiguracji |
| `--workspace` | `-w` | Katalog roboczy agenta. Jeśli pominięty lub ustawiony na `.`, CLI automatycznie wykrywa workspace na podstawie plików konfiguracji monorepo (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Wykryty automatycznie lub `.` |
| `--isolation` | — | Tryb izolacji: `worktree` tworzy git worktree przy każdym uruchomieniu; domyślnie `none`. | `none` |
| `--read-only` | — | Ogranicza uruchomionego agenta do narzędzi niedestrukcyjnych i wyłącza flagi automatycznej zgody. | `false` |

**Walidacja:**
- `agent-id` i `session-id` nie mogą zawierać `..`, `?`, `#`, `%` ani znaków sterujących. `agent spawn` nie ma stałej listy identyfikatorów agentów; routing modeli i dostawców rozpoznaje `orchestrator`, `architecture`, `qa`, `pm`, `backend`, `frontend`, `mobile`, `db`, `debug`, `refactor`, `docs`, `tf-infra` i `explore`, a także aliasy takie jak `backend-engineer`, `qa-reviewer` i `research-explorer`.
- `--vendor` musi być identyfikatorem dostawcy oma: `antigravity`, `claude`, `codex`, `commandcode`, `copilot`, `cursor`, `grok`, `hermes`, `kimi`, `kiro`, `opencode`, `pi`, `qwen` lub `zcode`. Poniższa tabela obejmuje osiem dostawców wymienionych przez `--help`.

**Działanie zależne od dostawcy:**

| Dostawca | Polecenie | Flaga automatycznej zgody | Flaga promptu |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | (brak) | `-p` |
| codex | `codex` | `--sandbox workspace-write` | (brak; prompt jest pozycyjny) |
| cursor | `cursor-agent` | zależna od dostawcy | `-p` |
| opencode | `opencode` | zależna od dostawcy | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | zależna od dostawcy | `-p` |
| pi | `pi` | wyłączona w trybie `--read-only` | prompt jest pozycyjny |

Te wartości domyślne można nadpisać w `.agents/skills/oma-orchestration/config/cli-config.yaml`.

Codex zachowuje swój sandbox workspace-write. oma włącza dostęp do sieci i dodaje katalog główny projektu, katalog stanu OMA (`~/.oma`) oraz istniejące cache menedżerów pakietów jako katalogi zapisywalne. `oma update` zastępuje `cli-config.yaml`, więc trwały tryb ustaw przez `OMA_CODEX_SANDBOX`: `read-only`, `workspace-write` (domyślnie) albo `danger-full-access` (bez sandboxa i bez zatwierdzeń).

### agent status

```text
oma agent status <session-id> [agent-ids...] [--project-root <path>]
```

| Flaga | Opis | Domyślnie |
|:-----|:-----------|:--------|
| `--project-root <path>` | Projekt, z którego odczytywany jest rejestr uruchomień agentów i pliki `.agents/state/memories/result-{agent}.md`. `-r` i `--root` zostały usunięte i kończą się błędem `Removed option -r. Use --project-root.` | Bieżący katalog roboczy |

Polecenie wypisuje jeden wiersz `{agent-id}:{status}` dla każdego żądanego agenta. Dla każdego agenta używa pierwszego istniejącego źródła:

```mermaid
flowchart TD
  start["agent status SESSION AGENT"] --> reg{"Run for this session and agent in the agent-run registry?"}
  reg -->|yes| regStatus["Registry status, downgraded to failed or stale"]
  reg -->|no| result{"result-AGENT.md exists?"}
  result -->|yes| legacy["legacy-STATUS, or unverified without a header"]
  result -->|no| statusFile{"subagent-SESSION-AGENT.status in the OS temp dir?"}
  statusFile -->|yes| exited["legacy-completed, or the status in the file"]
  statusFile -->|no| pidFile{"subagent-SESSION-AGENT.pid alive?"}
  pidFile -->|yes| running["running"]
  pidFile -->|"no, or no PID file"| crashed["crashed"]
```

| Status | Znaczenie |
|:-------|:--------|
| `running`, `completed`, `partial`, `blocked`, `failed` | Status zapisany w rejestrze uruchomień agentów |
| `failed` | Zgłaszany także wtedy, gdy zarejestrowane uruchomienie ma status `running`, ale jego proces runnera już nie istnieje |
| `stale` | Zarejestrowane uruchomienie ma status `completed`, ale dowody wyniku nie przechodzą już walidacji |
| `legacy-<status>` | Brak zarejestrowanego uruchomienia; `result-{agent}.md` ma nagłówek `## Status: <status>` |
| `unverified` | Brak zarejestrowanego uruchomienia; `result-{agent}.md` nie ma nagłówka statusu |
| `legacy-completed` | Brak uruchomienia i pliku wyniku; plik `.status` sesji zawiera `completed` (każda inna wartość jest wypisywana bez zmian) |
| `crashed` | Nic nie znaleziono albo starszy plik PID wskazuje na nieaktywny proces |

Sposób zapisywania uruchomień opisuje [Wyniki agentów i wznawianie](../guide/agent-results-and-resume.md).

### agent parallel

```text
oma agent parallel [tasks...] [--session-id <id>] [--vendor <vendor>] [-i | --inline] [--no-wait]
```

| Flaga | Skrót | Opis | Domyślnie |
|:-----|:------|:-----------|:--------|
| `--session-id <id>` | — | ID sesji dla każdego uruchomienia. Przekaż to samo ID do `oma agent status`. | Nazwa katalogu uruchomienia, `parallel-<timestamp>-<suffix>` |
| `--vendor` | — | Nadpisanie dostawcy CLI stosowane do wszystkich uruchamianych agentów. | Rozpoznany dla agenta z konfiguracji |
| `--inline` | `-i` | Traktuje argumenty zadań jako ciągi `agent:task[:workspace]` zamiast ścieżki pliku. | `false` |
| `--no-wait` | | Tryb w tle. Uruchamia wszystkich agentów i natychmiast wraca, nie czekając na zakończenie. Lista PID-ów i dzienniki są zapisywane w `.agents/results/parallel-<timestamp>-<suffix>/`. | `false` (czeka na zakończenie) |

**Format zadań inline:** `agent:task` lub `agent:task:workspace`
- Workspace jest wykrywany przez sprawdzenie, czy ostatni segment rozdzielony dwukropkiem zaczyna się od `./`, `/` lub jest równy `.`.
- Przykład: `backend:Implement auth API:./api` -- agent=backend, task="Implement auth API", workspace=./api.
- Przykład: `frontend:Build login page` -- agent=frontend, task="Build login page", workspace=wykryty automatycznie.

**Format pliku z zadaniami YAML:**

```yaml
tasks:
  - id: api            # optional; default <agent>-<index>
    agent: backend
    task: "Implement user API"
    workspace: ./api   # optional; auto-detected when omitted
  - agent: frontend
    task: "Build user dashboard"
```

### recap

```text
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

| Flaga | Opis | Domyślnie |
|:-----|:-----------|:--------|
| `--window <period>` | Okno czasowe w postaci `<n>h`, `<n>d` lub `<n>w` (na przykład `1d`, `3d`, `7d`, `2w`, `30d`). Wartości powyżej 30 dni są przycinane do 30 dni z ostrzeżeniem. Ignorowane, gdy ustawiono `--date`. | `1d` |
| `--date <date>` | Konkretna data (`YYYY-MM-DD`). Ma pierwszeństwo przed `--window`. | |
| `--tool <tools>` | Filtruje sesje według narzędzia. Wartości rozdzielane przecinkami: `antigravity`, `claude`, `codex`, `cursor`, `gemini`, `grok`, `qwen`. | wszystkie narzędzia |
| `--top <n>` | Pokazuje w podsumowaniu tylko N najważniejszych projektów/tematów. | bez limitu |
| `--sort <metric>` | Sortuje sesje według `count` lub `duration`. | `count` |
| `--mermaid` | Zamiast domyślnego podsumowania wypisuje wykres Gantta Mermaid. `--json` ma pierwszeństwo. | `false` |
| `--graph` | Otwiera interaktywny graf w dashboardzie webowym (`/recap`). Ma pierwszeństwo przed `--mermaid` i `--json`. | `false` |

### search

```text
oma search <subcommand> [...]
```

Każde podpolecenie `search` wypisuje JSON na stdout bez żadnej flagi; `providers` i `web` przyjmują też `--json`. Żadne nie przyjmuje `--output`. `--pretty` zmienia tylko wcięcia.

| Podpolecenie | Ważne opcje |
|:-----------|:---------------|
| `providers` | `--json`, `--pretty` |
| `web <query>` | `--provider <id>`, `--limit <n>` (domyślnie `10`), `--timeout <duration>` (domyślnie `15s`), `--json`, `--pretty` |
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout <duration>` (domyślnie `15s`), `--locale`, `--pretty` |
| `meta <url>` / `archive <url>` / `api fetch <url>` / `rss fetch <url>` | `--timeout <duration>` (domyślnie `15s`), `--locale` (domyślnie `en-US,en;q=0.9`), `--pretty` |
| `api search <query>` | `--platforms <list>`, `--timeout <duration>`, `--locale`, `--pretty` |
| `rss google <query>` | `--locale` (domyślnie `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (domyślnie `en`), `--format <spec>`, `--timeout <duration>` (domyślnie `30s`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (domyślnie `github`), `--language`, `--repo`, `--limit` (domyślnie `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | brak (uruchamia kontrole binariów Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

`search` używa wspólnej skali kodów wyjścia; zobacz [Kody wyjścia](#exit-codes).

### image

```text
oma image <subcommand> [...]
```

Format wyjścia jest kontrolowany osobno dla każdego podpolecenia przez `--output <text|json>`.

`image generate` przyjmuje:

| Flaga | Skrót | Opis | Domyślnie |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` rozpoznaje dostawcę na podstawie aktywnej konfiguracji `image:` i dostępnego uwierzytelnienia. | `auto` |
| `--size <size>` | | `WxH` z obiema krawędziami podzielnymi przez 16, w zakresie 16–3840 i proporcją 1:3–3:1, albo `auto`. | domyślne dostawcy |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | domyślne dostawcy |
| `--count <n>` | `-n` | Liczba obrazów, 1..5. | `1` |
| `--output-dir <dir>` | | Katalog wyjściowy. Musi znajdować się w `$PWD`, chyba że ustawiono `--allow-external-output`. | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | Zezwala na ścieżki `--output-dir` poza `$PWD`. | `false` |
| `--model <name>` | | Nadpisanie modelu dostawcy. Model antigravity wybiera `agy`. | domyślne dostawcy |
| `--timeout <duration>` | | Timeout obrazu podany jako czas trwania. | domyślne dostawcy |
| `--reference <path>` | `-r` | Obraz referencyjny do przeniesienia stylu/tematu. Można powtarzać (`-r a.png -r b.png`) lub podać listę rozdzielaną przecinkami. Sprawdzany jest rozmiar (≤5 MB), format (PNG/JPEG/GIF/WebP przez magic bytes) i liczba (≤10). Obsługiwane przez `codex` i `antigravity`; przez `pollinations` odrzucane z kodem 4. | |
| `--yes` | `-y` | Pomija pytanie o potwierdzenie kosztu. | `false` |
| `--no-prompt-in-manifest` | | Zapisuje SHA256 promptu zamiast tekstu źródłowego w `manifest.json`. | `false` |
| `--dry-run` | | Wypisuje plan i szacowany koszt; niczego nie uruchamia. | `false` |
| `--output <format>` | | `text` \| `json`. | `text` |

`image doctor` i `image vendor list` przyjmują `--output <text|json>`. Do wykrywania dostawców używaj `image vendor list`; stara forma `image list-vendors` kończy się błędem.

### video

```text
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` przyjmuje opcje planowania i przechwytywania `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` i `--capture-stop`. Przyjmuje też `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output` oraz `--no-brief-in-manifest`. Przechwytywanie przeglądarki używa `--source web --url <url>`; domyślne źródło to `file`. Zwykłe renderowanie wymaga utworzonej kompozycji i działającego kompozytora; placeholdery są ograniczone do ścieżki testowej `OMA_VIDEO_MOCK=1`.

`video doctor` raportuje lub przygotowuje toolchain HyperFrames/MPT/Strudel. `compose` przygotowuje kontrakt kompozycji uruchomienia, a `render` lintuje, renderuje i bada wynik. `provider list` raportuje status dostawcy i klucza. Manifest uruchomienia i sekwencję odzyskiwania opisuje [Generowanie wideo](../guide/video-generation.md).

### memory init

```text
oma memory init [--json] [--output <format>] [--force]
```

| Flaga | Opis | Domyślnie |
|:-----|:-----------|:--------|
| `--force` | Nadpisuje puste lub istniejące pliki schematu w `.agents/state/memories/`. Bez tej flagi istniejące pliki pozostają nietknięte. | `false` |

### verify

```text
oma verify agent <agent-type> [-w <workspace>] [--session-id <id>] [--task-id <id>] [--run-id <id>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Flaga | Skrót | Opis | Domyślnie |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Ścieżka katalogu workspace do weryfikacji. | Bieżący katalog roboczy |
| `--session-id <id>` | | Wybiera plan sesji i raporty. Wymagane, gdy istnieje wiele planów, chyba że potwierdzenie uruchomienia identyfikuje sesję. | |
| `--task-id <id>` | | Wybiera zakres i raport jednego zadania. Wymaga `--session-id` lub `--run-id`. | |
| `--run-id <id>` | | Wybiera raport konkretnego uruchomienia. Sesja i zadanie są ustalane z lokalnego potwierdzenia; jeśli go brak, podaj oba identyfikatory jawnie. | |

**Typy agentów:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers` mierzy dokładność detektora słów kluczowych na oznaczonym korpusie. Progi procentowe są bramkami; użyj wyjścia JSON, gdy zadanie CI musi sprawdzić poszczególne wyniki. Stara forma `oma verify <agent-type>` kończy się błędem; użyj `verify agent <agent-type>`.

---

## Kody wyjścia {#exit-codes}

**Wspólna skala (`image`, `video`, `search`):**

| Kod | Znaczenie |
|:-----|:--------|
| `0` | powodzenie |
| `1` | błąd ogólny |
| `2` | zablokowane lub odmowa ze względów bezpieczeństwa po stronie dostawcy |
| `3` | nie znaleziono |
| `4` | nieprawidłowe dane wejściowe |
| `5` | wymagane uwierzytelnienie lub binarium dostawcy nie jest zainstalowane |
| `6` | timeout |

**Zależne od polecenia:**

| Polecenie | Kody |
|:--------|:------|
| `doctor --json` | `0` brak problemów, `1` jeden lub więcej problemów |
| `verify agent` | `0` wszystkie kontrole przeszły, `1` kontrola nie przeszła lub typ agenta jest nieprawidłowy, `2` nie znaleziono workspace |
| `verify triggers` | `0` w granicach progów, `1` przekroczono próg |
| `docs verify` | `1` znaleziono uszkodzone referencje |
| `vault get` | `1` nieprawidłowa nazwa klucza, `2` brak takiego wpisu |

---

## Praktyczne przykłady {#practical-examples}

### Pipeline CI: aktualizacja i weryfikacja {#ci-pipeline-update-and-verify}

```bash
# Update in CI mode, then fail the job when doctor reports any issue
oma update --ci
oma doctor --json | jq -e '.ok' > /dev/null
```

### Wsadowe uruchamianie agentów z monitoringiem statusu {#batch-agent-execution-with-status-monitoring}

```bash
# Choose the session ID first and pass it to both commands
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent parallel tasks.yaml --session-id "$SESSION_ID" --no-wait

# Check status every 5 seconds
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
# Without `watch` (stock macOS), loop instead:
# while sleep 5; do oma agent status "$SESSION_ID" backend frontend mobile; done
```

### Czyszczenie w CI po testach {#cleanup-in-ci-after-tests}

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Weryfikacja uwzględniająca workspace {#workspace-aware-verification}

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Retro z porównaniem do przeglądu sprintu {#retro-with-comparison-for-sprint-reviews}

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare
```

### Pełny skrypt kontroli zdrowia {#full-health-check-script}

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== oh-my-agent Health Check ==="

report="$(mktemp)"
# doctor exits 1 when it finds issues; keep the report and continue
oma doctor --json > "$report" || true

# Check CLI installations
jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version // "unknown"))" else "MISSING" end)"' "$report"
jq -r '"Issues: \(.issues)"' "$report"

# Check auth status (an object of booleans keyed by github and each vendor ID)
oma auth status --json | jq -r 'to_entries[] | "\(.key): \(if .value then "authenticated" else "not authenticated" end)"'

echo "=== Done ==="
```

### Describe do introspekcji agentów {#describe-for-agent-introspection}

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```

---

## Pełny publiczny rejestr opcji {#complete-public-option-registry}

Każdy wiersz to ścieżka polecenia, które działa samodzielnie; grupy, które tylko wyświetlają pomoc, pominięto, a wspólne flagi główne opisuje sekcja [Opcje globalne](#global-options). Wartości domyślne podano obok opcji. Uruchom `oma describe "<path>"`, aby uzyskać pełny JSON jednej ścieżki.

:::note
Ta tabela jest generowana z `oma describe`. Nie edytuj jej ręcznie: uruchom `node cli/scripts/generate-cli-reference.mjs`, aby ją wygenerować ponownie, albo dodaj `--check`, aby zakończyć z błędem, gdy jest nieaktualna.
:::

<!-- oma:generated cli-registry:start -->

| Command | Arguments | Options | Description |
|:--|:--|:--|:--|
| `agent begin` | `<agent-id> <task-id> <session-id>` | `--project-root <path>`, `-w, --workspace <path>` | Start an evidence-backed native agent run |
| `agent context` | `<agent-id>` | `--project-root <path>`, `--difficulty <level>` (default: `Medium`) | Load graph-selected context for a native dispatch prompt |
| `agent finish` | `<run-id> <result-file>` | `--project-root <path>` | Validate a native agent result against its verification receipts |
| `agent parallel` | `[tasks...]` | `--session-id <id>`, `--vendor <vendor>`, `-i, --inline`, `--no-wait` | Run multiple sub-agents in parallel |
| `agent parallel-supervisor` | `<manifest>` | — | — |
| `agent resume` | `<session-id>` | `--project-root <path>`, `--dry-run`, `--max-attempts <count>` (default: `3`) | Resume safe incomplete tasks, reusing current acceptance evidence |
| `agent review` | — | `--vendor <vendor>`, `-p, --prompt <prompt>`, `-w, --workspace <path>`, `--no-uncommitted` | Run code review using external CLI (codex/claude/qwen/grok) |
| `agent spawn` | `<agent-id> <prompt> <session-id>` | `--resumed-from <run-id>`, `--fallback-vendors <vendors>`, `--task-id <id>`, `--vendor <vendor>`, `-w, --workspace <path>`, `--isolation <mode>`, `--read-only` | Spawn a subagent (prompt can be inline text or a file path) |
| `agent status` | `<session-id> [agent-ids...]` | `--project-root <path>` (default: current directory) | Check status of subagents |
| `agent verify` | `<run-id> [command...]` | `--project-root <path>`, `--required`, `--affected <paths...>` | Execute verification argv after -- and record its real exit code |
| `auth status` | — | `--json`, `--output <format>` | Check authentication status of all supported CLIs |
| `bridge` | `[url]` | `--context <name>` (default: `ide`), `--oma-home <path>`, `--oma-state-home <path>` | Proxy MCP stdio to a shared per-project Serena server (started on demand) |
| `cleanup` | — | `--dry-run`, `-y, --yes`, `--json`, `--output <format>` | Clean up orphaned subagent processes and temp files |
| `dashboard terminal` | — | `--project-root <path>` | Start terminal dashboard (real-time agent monitoring) |
| `dashboard web` | — | `--project-root <path>` | Start web dashboard on http://127.0.0.1:9847 |
| `describe` | `[command-path]` | — | Describe CLI commands as JSON for runtime introspection |
| `diagram archify` | `[args...]` | — | Run the installed archify CLI (doctor \| guide \| validate \| deliver \| visual-check …) with update checks disabled |
| `diagram resolve` | — | `--engine <engine>`, `--refresh`, `--offline`, `--json`, `--output <format>` | Report which diagram engine workflows should use, and where archify lives |
| `diagram update` | — | `--json`, `--output <format>` | Download the latest archify release into oma's managed cache (~/.cache/oma-diagram/archify) |
| `docs i18n` | — | `--json`, `--min-severity <level>` (default: `MEDIUM`) | Detect drift between English source docs (web/docs) and i18n translations (web/i18n/{lang}/...). Emits structural signals (line count, heading count, last-commit timestamp) per pair so the host LLM can decide which translations need a diff-sync patch. The CLI never edits translations. |
| `docs lint` | — | `--json`, `--locales <list>` | Lint translated docs for content-level anti-patterns (em-dashes in CJK targets, etc.). Complements `oma docs i18n` (structural drift) with style/anti-pattern checks per oma-translation SKILL.md § Stage 4. The CLI never auto-fixes — it only reports issues for the host LLM to restructure. |
| `docs sync` | `[diff-range]` | `--json` | Given a git diff, list docs that reference changed files. The host LLM (skill runtime) is expected to read this list plus the diff and propose patches per the SKILL.md contract — the CLI never auto-edits docs. Default diff-range: --cached (staged changes), fallback to HEAD~1..HEAD. |
| `docs verify` | `[path]` | `--json`, `--report-file <path>`, `--no-urls`, `--urls-sync` | Extract L2 references from docs and report broken targets. Regenerates docs/generated/doc-refs.json as a side effect. Exit code: 0 = clean, 1 = broken refs found. URL link checking is delegated to `lychee` (install: brew install lychee). |
| `doctor` | — | `--profile`, `--heal-check <agentType>`, `--json`, `--output <format>` | Check CLI installations, MCP configs, and skill status |
| `emit` | — | `--target <target>` (default: `all`), `--output-dir <path>` (default: `.`), `--json`, `--output <format>` | Emit standards-conformant artifacts from the .agents/ SSOT (Agent Skills spec, Agent Plugins package, Claude Code plugin marketplace, AGENTS.md, cli/AGENTS.md) |
| `explain components` | `[name]` | `--json`, `--output <format>` | List the components a draft can use, or print one component's syntax |
| `explain lint` | `[file]` | `--style <level>`, `--lang <code>`, `--json`, `--output <format>` | Check the prose of a draft (file or stdin) without rendering |
| `explain patch` | `<html> [file]` | `--panel <id>`, `--open`, `--json`, `--output <format>` | Replace one panel of a rendered page from its embedded draft (new panel from file or stdin) |
| `explain render` | `[file]` | `--output-file <path>`, `--template <name>`, `--theme <name>`, `--mode <mode>`, `--style <level>`, `--lang <code>`, `--archify`, `--no-archify`, `--open`, `--json`, `--output <format>` | Render a Markdown draft (file or stdin) into one self-contained HTML explanation |
| `explain validate` | `[file]` | `--input-dir <path>`, `--output <format>` (default: `concise`), `--report-file <path>`, `--json` | Validate self-contained explain HTML report artifacts |
| `goal set` | — | `--workflow <name>`, `--session-id <id>`, `--gate <keyword>`, `--budget-minutes <n>`, `--description <text>`, `--json`, `--output <format>` | Attach a goal contract (deterministic stop gate / wall-clock budget) to an active persistent workflow |
| `harness eval` | — | `--suite <path>`, `--candidate <path>`, `--partition <name>` (default: `validation`), `--mock`, `--action <mode>`, `--transcript <path>`, `--live`, `--record`, `--record-file <path>`, `--yes`, `--timeout <duration>` (default: `15m`), `--require-coverage`, `--json`, `--output <format>` | Compare a candidate .agents overlay with the current baseline |
| `harness evolution disable` | — | `--json`, `--output <format>` | — |
| `harness evolution enable` | — | `--max-dispatches <n>`, `--cron <expr>` (default: `0 3 * * *`), `--mode <mode>` (default: `apply`), `--json`, `--output <format>` | — |
| `harness evolution run` | — | `--scheduled`, `--json`, `--output <format>` | — |
| `harness evolution status` | — | `--json`, `--output <format>` | — |
| `harness feedback` | — | `--live`, `--apply`, `--max-epochs <n>` (default: `1`), `--incident <ids...>`, `--scan-runs`, `--json`, `--output <format>` | Promote captured incidents to skill fixtures and optimize the affected skills |
| `harness incident capture` | — | `--spec <path>`, `--run <id>`, `--json`, `--output <format>` | — |
| `harness incident export` | `<id>` | `--json`, `--output <format>` | — |
| `harness incident promote` | `<id>` | `--skill <id>`, `--draft`, `--force`, `--json`, `--output <format>` | — |
| `harness incident reproduce` | `<id>` | `--candidate <path>`, `--action <mode>`, `--record-file <path>`, `--transcript <path>`, `--record`, `--yes`, `--timeout <duration>` (default: `15m`), `--json`, `--output <format>` | — |
| `harness incident scan` | — | `--limit <n>`, `--skeleton <run-id>`, `--json`, `--output <format>` | List failed, blocked, or partial agent runs that no captured incident references yet |
| `harness incident show` | `<id>` | `--json`, `--output <format>` | — |
| `help` | — | — | Show help information |
| `home` | — | `--json`, `--output <format>` | Inspect and migrate OMA global storage |
| `home migrate` | — | `--dry-run`, `--json`, `--output <format>` | Copy legacy OMA global files; preserve originals |
| `hook probe` | — | `--vendor <list>`, `--output <format>` (default: `text`), `--hooks-dir <dir>` | Probe per-vendor L1 hook compatibility and print a matrix (D63) |
| `hook run` | — | `--vendor <v>`, `--event <e>`, `--matcher <m>` | Dispatch a vendor hook event through the centralised oma hook router (design 019) |
| `hook script` | — | `--vendor <v>`, `--script <name>` | Run one installed hook handler through the CLI memory adapter |
| `image doctor` | — | `--output <format>` (default: `text`) | Check authentication and install status per vendor |
| `image generate` | `<prompt...>` | `--vendor <name>` (default: `auto`), `--size <size>`, `--quality <level>`, `-n, --count <n>`, `--output-dir <path>`, `--allow-external-output`, `--model <name>`, `--timeout <duration>`, `-r, --reference <path>`, `-y, --yes`, `--no-prompt-in-manifest`, `--dry-run`, `--output <format>` (default: `text`) | Generate images via pollinations (flux/zimage, free), codex (gpt-image-2, ChatGPT OAuth), or antigravity (gemini nano-banana via `agy` CLI, free with Gemini Code Assist sign-in) |
| `image vendor list` | — | `--output <format>` (default: `text`) | List registered vendors and supported models |
| `install` | — | `--web-search <provider>`, `--code-intelligence <provider>`, `--semantic-memory <provider>`, `--honcho-url <url>`, `--honcho-workspace <id>` | Install oh-my-agent skills and configurations |
| `intel suggest` | — | `--config <path>`, `--topic <topic>`, `--target <target>`, `--repos <repos>`, `--since <window>`, `--last-commits <n>`, `--output-dir <path>`, `--dry-run`, `--fixture <path>`, `--create-issue`, `--base-repo <owner/name>`, `--yes`, `--json`, `--output <format>` | Suggest high-value product work from market/code intelligence |
| `link` | `[vendors...]` | `--dry-run` | Regenerate vendor files (.claude/, .cursor/, etc.) from .agents/ SSOT |
| `market detect-trap` | `<topic>` | `--force` | Preflight check that refuses keyword-trap queries |
| `market resolve` | — | `--refresh`, `--offline`, `--json`, `--output <format>` | Report the last30days engine oma will run (managed latest, pin, or local copy) and the Python it uses |
| `market run` | `[args...]` | — | Run the last30days engine (scripts/last30days.py) with the given arguments; --save-dir defaults to market.save_dir |
| `market update` | — | `--json`, `--output <format>` | Download the latest last30days release into oma's managed cache (~/.cache/oma-market/last30days) |
| `memory daemon restart` | — | `--port <port>` (default: `3111`), `--dry-run`, `--json`, `--output <format>` | Restart the OMA-owned AgentMemory daemon |
| `memory daemon start` | — | `--port <port>` (default: `3111`), `--dry-run`, `--json`, `--output <format>` | Start AgentMemory in the background |
| `memory daemon status` | — | `--json`, `--output <format>` | Show daemon status |
| `memory daemon stop` | — | `--dry-run`, `--json`, `--output <format>` | Stop the OMA-owned AgentMemory daemon |
| `memory gc` | — | `--scope <scope>` (default: `all`), `--keep <count>`, `--max-age <duration>`, `--dry-run`, `--json`, `--output <format>` | Garbage-collect project-local memory: prune old L1 sessions and ephemeral Serena files |
| `memory import` | — | `--source <source>` (default: `all`), `--since <since>` (default: `30d`), `--dry-run`, `--force-partial`, `--json`, `--output <format>` | Import vendor conversation history into AgentMemory |
| `memory init` | — | `--force`, `--json`, `--output <format>` | Initialize the coordination store in .agents/state/memories |
| `memory keys` | — | `--kind <kind>` (default: `connection`), `--profile <name>` (default: `oma`), `--key-env <name>` (default: `LLM_OPENAI_API_KEY`), `--from-env <name>`, `--dry-run`, `--json`, `--output <format>` | Configure Honcho connection or local embedding credentials |
| `memory maintain` | `<action>` | `--keep <count>` (default: `5`), `--dry-run`, `--json`, `--output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum |
| `memory maintain backup` | — | `--keep <count>` (default: `5`), `--dry-run`, `--json`, `--output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum |
| `memory maintain prune` | — | `--keep <count>` (default: `5`), `--dry-run`, `--json`, `--output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum |
| `memory maintain vacuum` | — | `--keep <count>` (default: `5`), `--dry-run`, `--json`, `--output <format>` | Maintain AgentMemory local storage: backup, prune, vacuum |
| `memory retry drain` | — | `--dry-run`, `--json`, `--output <format>` | Drain queued semantic-memory deliveries |
| `memory service install` | — | `--port <port>` (default: `3111`), `--dry-run`, `--json`, `--output <format>` | Install AgentMemory launchd/systemd service integration |
| `memory service uninstall` | — | `--dry-run`, `--json`, `--output <format>` | Uninstall AgentMemory launchd/systemd service integration |
| `memory setup` | — | `--endpoint <url>`, `--port <port>`, `--install`, `--start`, `--dry-run`, `--json`, `--output <format>` | Prepare AgentMemory endpoint configuration |
| `memory status` | — | `--json`, `--output <format>` | Show selected semantic-memory provider health |
| `memory upgrade` | — | `--port <port>`, `--dry-run`, `--json`, `--output <format>` | Stop, backup, upgrade, restart, and health-check AgentMemory |
| `model check` | — | `--json`, `--fail-on-drift`, `--owner <name>`, `--probe` | Check model registry against live vendor model lists |
| `model probe` | `<slug>` | `--json`, `--timeout <duration>` | Probe a model slug against its vendor CLI to verify it is accepted |
| `model propose` | — | `--json`, `--owner <name>`, `--write`, `--timeout <duration>` | Run model:check --probe internally and generate an oma-config `models:` patch for accepted candidates |
| `profile create` | `<slot>` | `--json`, `--output <format>` | Create a local profile |
| `profile list` | — | `--json`, `--output <format>` | List local profiles |
| `profile run` | `<slot> <command> [args...]` | — | Run one command with OMA_PROFILE set for the child process |
| `profile show` | `[slot]` | `--json`, `--output <format>` | Show a local profile |
| `profile use` | `<slot>` | `--shell <shell>`, `--json`, `--output <format>` | Print shell code to activate an existing profile |
| `ralph verify` | — | `--session-id <id>`, `--newer-than <iso>`, `--no-emit`, `--json`, `--output <format>` | Verify ralph EXEC artifacts (anti-circumvention gate, ralph.md Step 1.3) |
| `recap` | — | `--window <period>` (default: `1d`), `--date <date>`, `--tool <tools>`, `--top <n>`, `--sort <metric>` (default: `count`), `--mermaid`, `--graph`, `--json`, `--output <format>` | Recap AI tool conversation history |
| `retro` | `[window]` | `--interactive`, `--compare`, `--json`, `--output <format>` | Engineering retrospective with metrics & trends |
| `schedule builtin-evolution-add` | `<workspace>` | `--cron <expr>` | — |
| `schedule create` | `<agent-id> <prompt>` | `--cron <expr>`, `--every <phrase>`, `--vendor <vendor>`, `-w, --workspace <path>`, `--once`, `--expires-after <duration>`, `--env <keys>`, `--dry-run`, `--accept-rounded` | Register a scheduled agent job |
| `schedule delete` | `<id>` | — | Remove a scheduled job from manifest and OS scheduler |
| `schedule inspect` | `<id>` | — | Inspect one scheduler manifest entry for internal callers |
| `schedule list` | — | `--json`, `--output <format>` | List scheduled jobs with OS drift state (synced/stale/missing-in-os/orphan-in-os), grouped by project |
| `schedule run` | `<id>` | `--oma-home <path>`, `--oma-state-home <path>`, `--registration <identity>` | Execute a scheduled job by id (invoked by OS scheduler; not normally called directly) |
| `schedule sync` | — | `--prune` | Re-sync manifest → OS scheduler (registers missing jobs, rewrites stale commands). Use --prune to remove orphan OS jobs. |
| `scholar get` | `<id>` | `--section <name>` | Fetch a sidecar (knows record_id) or work metadata (W-id, DOI, arXiv:&lt;id&gt;, CorpusId:&lt;n&gt;, S2 paperId) |
| `scholar lint` | `<file>` | `--lenient`, `--fail-on-warning` | Validate a .knows.yaml or .knows.json sidecar (v0.9.0) |
| `scholar resolve` | `<query...>` | — | Find best paper match across knows.academy, OpenAlex, Semantic Scholar |
| `scholar search` | `<query...>` | `--limit <n>` (default: `10`), `--year-min <year>`, `--always-fallback` | Search papers (knows.academy → OpenAlex → Semantic Scholar) |
| `search api fetch` | `<url>` | `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Fetch via matched platform API (Phase 0) |
| `search api search` | `<query>` | `--platforms <list>`, `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Fan-out keyword search across platforms that support it |
| `search archive` | `<url>` | `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Fetch via AMP / archive.today / Wayback |
| `search code` | `<query>` | `--host <github\|gitlab>` (default: `github`), `--language <lang>`, `--repo <owner/repo>`, `--limit <n>` (default: `20`), `--pretty` | Search code via gh / glab |
| `search doctor` | — | — | Check dependencies (Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search fetch` | `<url>` | `--only <strategies>`, `--skip <strategies>`, `--include-archive`, `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Fetch URL via auto-escalating strategy pipeline |
| `search media` | `<url>` | `--subs`, `--sub-lang <list>` (default: `en`), `--format <spec>`, `--timeout <duration>` (default: `30s`), `--pretty` | Extract media metadata via yt-dlp (1858 sites) |
| `search meta` | `<url>` | `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Extract OGP / JSON-LD / Schema.org from URL |
| `search providers` | — | `--json`, `--pretty` | List registered search providers and inspect selection without network calls |
| `search rss fetch` | `<url>` | `--timeout <duration>` (default: `15s`), `--locale <value>` (default: `en-US,en;q=0.9`), `--pretty` | Discover and parse RSS/Atom feed for a URL |
| `search rss google` | `<query>` | `--locale <value>` (default: `en-US`) | Build Google News RSS URL for a query |
| `search trust` | `<domain>` | `--pretty` | Resolve trust level / score for a domain |
| `search web` | `<query>` | `--provider <id>`, `--limit <n>` (default: `10`), `--timeout <duration>` (default: `15s`), `--json`, `--pretty` | Search with the selected web provider (Brave has a CLI adapter) |
| `serena check` | — | `--project <path>` (default: `apps/mobile`), `--dart-sdk <path>`, `--timeout <duration>` (default: `60s`), `--staged` | Analyze a Dart package using the managed shared Serena LSP |
| `serena daemon gc` | — | `--quiet` | Stop shared Serena daemons with no clients after the idle grace period |
| `serena reap` | — | `--dry-run`, `--quiet` | Kill idle Serena LSP children to reclaim memory (Serena self-heals on next tool call) |
| `serena reaper disable` | — | `--dry-run` | Uninstall the periodic Serena Reaper scheduled task |
| `serena reaper enable` | — | `--dry-run` | Install the periodic Serena Reaper scheduled task (runs every 5 minutes) |
| `serena setup` | — | — | Repair the managed adapter and install the oma-dart-check compatibility launcher |
| `skill audit` | — | `--json`, `--output <format>` | Check frontmatter description similarity between installed skills |
| `skill eval` | — | `--skill <id>`, `--mock`, `--live`, `--record`, `--yes`, `--task-dir <path>`, `--max-tasks <n>`, `--trials <n>`, `--require-coverage`, `--neg-transfer`, `--routing`, `--json`, `--output <format>` | Measure per-skill utility lift (treatment vs baseline on held-out tasks) |
| `skill evolution-stats` | — | `--skill <id>`, `--json`, `--output <format>` | Aggregate recorded optimization runs: proposals, acceptance, verified improvements, rollbacks, by memory mode and procedure |
| `skill lint` | — | `--skill <id>`, `--json`, `--output <format>` | Detect per-skill authoring smells (frontmatter, structure, broken refs) |
| `skill matrix` | — | `--suite <path>`, `--project-root <path>`, `--skills <names>`, `--delivery <mode>` (default: `native`), `--vendors <ids>` (default: `claude,codex`), `--cases <ids>`, `--live`, `--yes`, `--timeout-seconds <n>` (default: `120`), `--claude-model <model>`, `--codex-model <model>`, `--report <path>`, `--json`, `--output <format>` | Test native skill discovery, references and output contracts across CLI vendors |
| `skill meta-optimize` | — | `--target <part>` (default: `optimizer`), `--skill <ids...>`, `--anchor <ids...>`, `--repeats <n>` (default: `3`), `--candidates <n>` (default: `2`), `--max-epochs <n>` (default: `1`), `--edits-per-epoch <k>` (default: `4`), `--live`, `--apply`, `--memory <mode>` (default: `none`), `--yes`, `--json`, `--output <format>` | Propose and score changes to the evolution procedure itself on held-out skills; promote only with a paired bootstrap interval above zero |
| `skill optimize` | — | `--skill <id>`, `--dry-run`, `--apply`, `--mock`, `--live`, `--max-epochs <n>` (default: `8`), `--edits-per-epoch <k>` (default: `4`), `--lr <chars>` (default: `600`), `--yes`, `--memory <mode>` (default: `recall`), `--json`, `--output <format>` | Optimize a skill's SKILL.md to maximize measured held-out utility lift |
| `skill procedure` | — | `--export`, `--json`, `--output <format>` | Show the evolution procedure (optimizer/maintainer prompts, constitution) and its hashes; --export writes editable defaults |
| `skill promotions` | — | `--skill <id>`, `--all`, `--json`, `--output <format>` | List recorded SKILL.md promotions and rollbacks for a skill, or every skill and the procedure with --all |
| `skill rollback` | — | `--skill <id>`, `--json`, `--output <format>` | Restore the SKILL.md body replaced by the most recent recorded promotion |
| `slide asset fetch-video` | `<url>` | `--workspace <path>`, `--output-name <name>` | Download video via yt-dlp into ./assets/ and print local ref |
| `slide bundle` | — | `--workspace <path>`, `--output-file <path>`, `--inline-fonts` | Merge per-slide files into a single self-contained .html deliverable |
| `slide create` | — | `--output-dir <path>` (default: `my-deck`), `--force` | Scaffold a new slide working directory with starter HTML, assets/, and meta.json |
| `slide doctor` | — | — | Probe required deps (chrome, puppeteer-core) and optional deps (yt-dlp, pptxgenjs) |
| `slide edit` | — | `--workspace <path>`, `--port <n>` (default: `0`) | Open browser bbox editor (node:http server at 127.0.0.1, dispatches to oma agent runner) |
| `slide export pdf` | — | `--workspace <path>`, `--output-file <path>`, `--mode <mode>` (default: `capture`) | Export slides to PDF via puppeteer-core |
| `slide export png` | — | `--workspace <path>`, `--output-dir <path>`, `--resolution <res>` (default: `1080p`) | Export each slide as a PNG image via puppeteer-core |
| `slide export pptx` | — | `--workspace <path>`, `--output-file <path>` | [EXPERIMENTAL] Export to PPTX via pptxgenjs (raster-backed, gradients rasterized) |
| `slide import pptx` | `<file>` | `--workspace <path>` | Import a .pptx file into slide fragments via officeparser (bunx, best-effort) |
| `slide preview` | — | `--workspace <path>` | Build viewer.html (deck-stage web component + speaker-notes panel, toggle with `n`) |
| `slide style get` | `<slug>` | `--refresh` | Fetch a bold template design.md (always-latest main; cached for offline fallback) |
| `slide style list` | — | — | List available style presets (vendored + bold-template index) |
| `slide style preview` | `<slug>` | — | Preview a style preset in the terminal |
| `slide validate` | — | `--workspace <path>`, `--output <format>` (default: `concise`), `--slide <file>`, `--report-file <path>` | Geometric quality gate — renders slides via puppeteer-core and checks overflow/overlap/font-size |
| `star` | — | — | Star oh-my-agent on GitHub |
| `state activate` | `<session-id>` | `--category <category>` (default: `main`), `--archived`, `--all-projects`, `--project <project>`, `--search <text>`, `--older-than <duration>` (default: `90d`), `--dry-run`, `--json`, `--output <format>` | Inspect OMA L1 workflow state |
| `state archive` | — | `--category <category>` (default: `main`), `--archived`, `--all-projects`, `--project <project>`, `--search <text>`, `--older-than <duration>` (default: `90d`), `--dry-run`, `--json`, `--output <format>` | Inspect OMA L1 workflow state |
| `state decisions list` | `[workflow]` | `--agent <id>`, `--json`, `--output <format>` | List workflow checkpoints or available agent decision subjects |
| `state emit` | `<kind> [payload]` | `--session-id <id>`, `--category <category>` (default: `main`), `--vendor <vendor>`, `--vendor-sid <vendorSid>`, `--parent-event-id <eventId>`, `--causality-key <key>`, `--ts <iso>`, `--no-mirror`, `--json`, `--output <format>` | Append an OMA L1 workflow event |
| `state get` | `<sid>` | `--json`, `--output <format>` | Inspect one OMA L1 session by ID |
| `state heal-check` | — | `--agent <agentType>`, `--json`, `--output <format>` | Check whether self-healing is allowed for an agent |
| `state inject-log get` | `<session-id> <file>` | `--json`, `--output <format>` | List or view per-boundary inject audit logs (D52) |
| `state inject-log list` | `<sid>` | `--entry <file>`, `--json`, `--output <format>` | List or view per-boundary inject audit logs (D52) |
| `state list` | — | `--category <category>` (default: `main`), `--archived`, `--all-projects`, `--project <project>`, `--search <text>`, `--older-than <duration>` (default: `90d`), `--dry-run`, `--json`, `--output <format>` | Inspect OMA L1 workflow state |
| `state migrate` | — | `--runtime`, `--include-active`, `--dry-run`, `--json`, `--output <format>` | Migrate project state to the home profile |
| `state purge` | — | `--category <category>` (default: `main`), `--archived`, `--all-projects`, `--project <project>`, `--search <text>`, `--older-than <duration>` (default: `90d`), `--dry-run`, `--json`, `--output <format>` | Inspect OMA L1 workflow state |
| `state repair` | — | `--dry-run`, `--json`, `--output <format>` | Repair OMA L1 workflow state files |
| `state summary` | `[sid]` | `--category <category>` (default: `main`), `--json`, `--output <format>` | Export a session summary to the coordination store |
| `state trajectory` | `[sid]` | `--category <category>` (default: `main`), `--open`, `--width <columns>`, `--sequence`, `--ascii`, `--json`, `--output <format>` | Show a session trajectory: L1 events joined with vendor transcripts |
| `state verify` | — | `--workflow <workflow>`, `--checkpoint <checkpoint>`, `--instance <id>`, `--session-id <id>`, `--category <category>` (default: `main`), `--no-emit-missing`, `--json`, `--output <format>` | Verify required L1 events for a workflow checkpoint |
| `stats get` | — | `--json`, `--output <format>` | View productivity metrics |
| `stats reset` | — | `--json`, `--output <format>` | View productivity metrics |
| `uninstall` | — | `--dry-run`, `-y, --yes` | Remove oh-my-agent's owned files (preserves oma-config.yaml, mcp.json, and user-authored skills) |
| `update` | — | `-f, --force`, `--with-new-skills`, `--ci`, `-y, --yes`, `--all`, `--vendor <vendors>` | Update skills to latest version from registry |
| `update mcp` | — | `-y, --yes`, `--ci`, `--all`, `--vendor <vendors>` | Choose browser MCP servers (Aside, Chrome DevTools, Firefox DevTools) |
| `vault delete` | `<name>` | — | Remove a secret from the keychain and the index |
| `vault get` | `<name>` | — | Print stored value to stdout (for: export KEY=$(oma vault get &lt;name&gt;)) |
| `vault list` | — | `--json` | List stored secret names (values never displayed) |
| `vault store` | `<name>` | `--value <value>` | Store a secret under &lt;name&gt; (interactive password prompt) |
| `verify agent` | `<agent-type>` | `-w, --workspace <path>` (default: current directory), `--session-id <id>`, `--task-id <id>`, `--run-id <id>`, `--json`, `--output <format>` | — |
| `verify triggers` | — | `--corpus <path>`, `--max-false-fire <pct>`, `--max-missed-fire <pct>`, `--json`, `--output <format>` | Measure keyword-detector trigger accuracy against a labeled prompt corpus |
| `version` | — | — | Show version number |
| `video compose` | `<runDir>` | `--output <format>` (default: `text`), `--refresh`, `--offline` | Scaffold the run's Hyperframes project on the latest toolchain + heygen-com/hyperframes; prints the authoring contract |
| `video doctor` | — | `--output <format>` (default: `text`), `--install`, `--upgrade`, `--install-mpt`, `--install-strudel` | Check video provider and compositor readiness |
| `video generate` | `<brief...>` | `--mode <mode>`, `--aspect <aspect>`, `--locale <lang>`, `--captions <style>`, `--visual <mode>`, `--voice <profile>`, `--music <mode>`, `--duration <sec>`, `--compositor <name>`, `--capture <path>`, `--source <kind>` (default: `file`), `--url <url>`, `--device <name>`, `--ready-selector <css>`, `--show-cursor`, `--polish`, `--capture-timeout <sec>`, `--capture-stop <mode>`, `--output-dir <path>`, `--allow-external-output`, `--max-usd <n>`, `--seed <n>`, `--timeout <duration>`, `-y, --yes`, `--dry-run`, `--script <path>`, `--output <format>` (default: `text`), `--no-brief-in-manifest` | Generate a video run directory from a brief |
| `video provider list` | — | `--output <format>` (default: `text`) | List video providers and availability |
| `video render` | `<runDir>` | `--output <format>` (default: `text`) | Re-render a run directory from render-spec.json |
| `visualize` | — | `--focus <node-or-path>`, `--affected <paths...>`, `--json`, `--output <format>` | Visualize project structure as a dependency graph |

<!-- oma:generated cli-registry:end -->

---

## Zobacz też {#see-also}

- [Polecenia CLI](./commands.md): działanie i przykłady dla każdego polecenia.
- Pliki reguł dostawców (`.cursor/rules`, ...) są regenerowane przez [`oma link <vendor>`](./commands.md#link), a nie przez osobne polecenie `export`.
- [Referencja konfiguracji](../guide/configuration-reference.md): klucze konfiguracji, które nadpisują te flagi.
- [Automatyczne aktualizacje](../guide/automated-updates.md): uruchamianie `oma update` z GitHub Action.
- [Monitorowanie dashboardu](../guide/dashboard-monitoring.md): `agent status` i dashboardy.
- [Instalacja globalna](../guide/global-install.md): katalogi główne instalacji projektowej i globalnej.
- [Rozwiązywanie problemów](../guide/troubleshooting.md)
