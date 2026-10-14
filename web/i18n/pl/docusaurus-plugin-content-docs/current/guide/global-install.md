---
title: "Przewodnik: instalacja globalna"
sidebar_label: Instalacja globalna
description: Zainstaluj oh-my-agent w globalnym katalogu domowym OMA (~/.oma/) zamiast per projekt, aby te same umiejętności, workflowy i reguły obowiązywały we wszystkich projektach. Obejmuje oma install --global, oma update --global, oma uninstall --global, nadpisanie OMA_HOME, wykrywanie podwójnej instalacji przez oma doctor oraz zastrzeżenia platformowe (odmowa sudo, CI, WSL i ochrona cwd=HOME).
---

## Czym jest instalacja globalna?

Domyślnie `oma install` ogranicza wszystko do bieżącego katalogu projektu: SSOT znajduje się w `<cwd>/.agents/`, a konfiguracje vendorów są zapisywane w `<cwd>/.claude/`, `<cwd>/.codex/` itd. **Instalacja globalna** (`oma install --global`) umieszcza oh-my-agent zamiast tego w globalnym katalogu domowym OMA, dzięki czemu te same umiejętności, workflowy i reguły są dostępne w każdym otwieranym projekcie bez powtarzania kroku instalacji. SSOT znajduje się w `~/.oma/.agents/`, a konfiguracje vendorów pozostają w `~/.claude/`, `~/.codex/` itd.

## Porównanie instalacji projektowej i globalnej

| Aspekt | Projekt (`oma install`) | Globalna (`oma install --global`, domyślny katalog domowy OMA) |
|--------|------------------------|--------------------------------|
| Położenie SSOT | `<cwd>/.agents/` | `~/.oma/.agents/` |
| Konfiguracje vendorów | `<cwd>/.claude/`, `<cwd>/.codex/` itd. | `~/.claude/`, `~/.codex/` itd. |
| Plik blokady | `<cwd>/.agents/_install.lock` | `~/.oma/.agents/_install.lock` |
| Metadane | `<cwd>/.agents/skills/_version.json` (schemaVersion 2) | `~/.oma/.agents/skills/_version.json` (schemaVersion 2) |
| Zastosowanie | Dostosowanie per projekt | Osobiste ustawienia domyślne we wszystkich projektach |
| Zakres oma-config.yaml | Właściwy dla projektu | Bazowy dla użytkownika |

Oba tryby mogą współistnieć. `oma doctor` zgłasza obie instalacje, jeśli są obecne, i sygnalizuje rozbieżności między nimi.

Po udanej instalacji globalnej sprawdź pliki zakotwiczone w katalogu użytkownika oraz rozstrzygnięty profil:

```bash
oma doctor --global --json
oma doctor --global --profile
```

Pierwsze polecenie zgłasza stan instalacji i vendorów; polecenie z profilem pokazuje plan modeli używany przez agentów. Zachowaj `--global` (albo `-g`): bez niego oba polecenia sprawdzają projekt w bieżącym katalogu, z konfiguracją tego projektu nałożoną na globalne wartości domyślne.

## Konfiguracja przy pierwszym uruchomieniu

Przy pierwszym uruchomieniu `oma install --global` na danym komputerze instalator pokazuje przed kontynuowaniem objaśnienie:

```text
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.oma/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.oma/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Potwierdź, aby kontynuować. Instalacja przebiega potem tak samo jak instalacja projektowa (język, preset modelu, typ projektu, wybór vendora).

Po udanej instalacji zostaną pokazane kolejne kroki:

```text
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Zastrzeżenia

### Odmowa działania przez sudo

`oma install` (w dowolnym trybie) natychmiast kończy działanie uruchomiony przez `sudo`:

```text
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Uruchom polecenie jako zwykły użytkownik, bez `sudo`.

### Środowiska CI

Uruchomienie `oma install --global` w potoku CI modyfikuje katalog HOME runnera CI. Zwykle jest to niepożądane. Jeśli jednak tego potrzebujesz (np. w potoku rozruchowym), oma wyświetla ostrzeżenie:

```text
Running `oma install --global` in CI. This will modify the CI user's HOME. Proceeding because --yes / non-interactive mode is set.
```

Ostrzeżenie pojawia się, gdy `CI` ma wartość `true` albo `1`. Te wartości już przełączają instalację w tryb nieinteraktywny, więc przebiega ona z wartościami domyślnymi i nie czeka na dane wejściowe. Poza CI to samo nieinteraktywne zachowanie daje `--yes` albo `OMA_YES=1`.

### WSL: Linux HOME a Windows USERPROFILE

Gdy oma wykryje działanie wewnątrz Windows Subsystem for Linux, wypisuje:

```text
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Instalacja WSL i instalacja z PowerShella są niezależne. Aby mieć globalny zakres po obu stronach, uruchom `oma install --global` raz w WSL i raz w PowerShellu.

### Strażnik cwd = HOME (tryb projektowy)

`oma link` i `oma update` (bez `--global`) odmawiają działania, gdy bieżący katalog jest Twoim katalogiem HOME. W trybie projektowym `<cwd>/.claude/settings.json` byłoby `~/.claude/settings.json` — Twoimi globalnymi ustawieniami Claude Code — a renderowanie w zakresie projektu przepisałoby jego polecenia `$HOME/.claude/hooks/...` na `$CLAUDE_PROJECT_DIR/...`, psując każdy hook i pasek statusu w projektach bez własnego `.claude/hooks/`. Zamiast tego użyj `oma link --global` / `oma update --global` dla instalacji globalnej albo najpierw przejdź (`cd`) do projektu.

Jeśli uruchomisz `oma install` (bez `--global`), gdy bieżący katalog jest katalogiem HOME, oma ostrzega:

```text
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

W trybie nieinteraktywnym / CI działanie jest automatycznie przerywane. Użyj `--global`, jeśli zamierzasz zainstalować narzędzie dla całego użytkownika.

## Ponowne linkowanie instalacji globalnej

`oma link` regeneruje pliki natywne dla vendorów z SSOT bez ponownej instalacji. Tak jak `install` i `update`, rozstrzyga cel na podstawie kontekstu instalacji, więc przekaż `--global`, aby zsynchronizować `~/.oma/.agents/` — działa to z dowolnego katalogu, nie tylko z `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.oma/.agents/oma-config.yaml)
oma link opencode --global
```

Bez `--global` `oma link` kieruje działanie do `<cwd>/.agents/`, więc uruchomienie go w projekcie, gdy instalacja jest globalna, zgłasza brak katalogu `.agents/`.

## Odinstalowanie

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

Polecenie odinstalowania rozdziela pliki należące do oma od plików użytkownika. Usuwa wyłącznie umiejętności zapisane jako zarządzane przez OMA w `managed-skills.json` w `.agents/state/`; znacznik `<!-- oma:generated -->` identyfikuje wygenerowane pliki promptów Copilota. Treści użytkownika (`oma-config.yaml`, `mcp.json` i umiejętności niezapisane jako zarządzane) nigdy nie są usuwane. Najpierw uruchom `--dry-run`, aby zobaczyć dokładną listę.

Aby odinstalować instalację projektową, pomiń `--global`:

```bash
oma uninstall [--dry-run]
```

## Nadpisanie OMA_HOME

Ustaw `OMA_HOME` na ścieżkę bezwzględną, aby przenieść globalne dane należące do OMA:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` to główny katalog globalnego przechowywania, a nie cel instalacji projektowej. Przy powyższej wartości globalne definicje znajdują się w `/tmp/oma-test/.agents/`; instalacja projektowa i linkowanie nadal używają `<cwd>/.agents/`. Natywne ustawienia vendorów i uwierzytelnianie pozostają poza `OMA_HOME`. Globalne pliki integracji OpenCode są zapisywane w `~/.config/opencode/` w rzeczywistym katalogu HOME.

`OMA_STATE_HOME` to jawny wyjątek dla przechowywania profili, L1 i runtime projektu: musi być ścieżką bezwzględną i zawiera `u/`. Gdy nie jest ustawione, profile podążają za `OMA_HOME`. `XDG_CONFIG_HOME` nie przenosi już stanu OMA i nie zmienia ścieżki wyjściowej OpenCode w OMA. Sekrety w OS Keychain, dane AgentMemory/Honcho oraz cache zarządzanych toolchainów pozostają u swoich dotychczasowych właścicieli.

## Układ globalnego przechowywania

Dane globalne domyślnie znajdują się w `~/.oma`. Gdy ustawiono `OMA_HOME`, zastąp `~/.oma` jego wartością:

| Dane | Położenie |
|---|---|
| Globalne definicje, konfiguracja, metadane instalacji | `~/.oma/.agents/` |
| Manifest harmonogramu, przechwycone środowisko, logi uruchomień | `~/.oma/schedule/` |
| Globalne kopie zapasowe | `~/.oma/backup/` |
| Rejestr, blokady i logi Sereny | `~/.oma/state/serena/` |
| Indeks nazw kluczy sejfu | `~/.oma/state/vault-index.json` |
| Profile, sesje L1, runtime projektu | `~/.oma/u/<profile>/` (`<OMA_STATE_HOME>/u/<profile>/`, gdy ustawiono `OMA_STATE_HOME`) |

Konfiguracja globalna dostarcza wartości domyślne. Najbliższe projektowe `.agents/oma-config.*` i
jego lokalna nakładka je nadpisują; różne nadrzędne katalogi główne projektów nie są scalane.
Pełną kolejność opisuje [Ładowanie konfiguracji](./oma-config-semantics.md#precedence-table).
Projekt wybierający `semantic_memory: none` pozostawia pamięć wyłączoną nawet wtedy, gdy
konfiguracja globalna wybiera AgentMemory.

## Istniejące instalacje

Migracja katalogu domowego kopiuje dane należące do OMA z `~/.agents/` i `~/.config/oma/`
do nowego układu. Oryginały pozostają, z wyjątkiem zweryfikowanych katalogów umiejętności należących do OMA
przekształconych w linki wykrywania: ich oryginalna zawartość jest archiwizowana w
`~/.oma/backup/legacy-global-skills/`, zanim stara ścieżka stanie się linkiem do zmigrowanej
umiejętności. Istniejące pliki docelowe nie są nadpisywane; konflikty i dane w użyciu
są zgłaszane do ponowienia. Indeksy sejfu
scalają nazwy kluczy bez przenoszenia wartości sekretów poza systemowy pęk kluczy. Umiejętności
użytkownika i obce linki pozostają na miejscu; pliki uwierzytelniania vendorów nie są
przenoszone. Czytniki runtime używają wyłącznie
nowych ścieżek.

```bash
oma home migrate --dry-run --json
oma home migrate --json
oma schedule sync
```

Globalna instalacja i aktualizacja uruchamiają migrację przed zapisaniem swoich plików globalnych.
Projektowa instalacja/aktualizacja używa ujednoliconych katalogów głównych bez migrowania niepowiązanych danych
globalnych. Migracja nie zmienia rejestracji zadań systemowych; jeśli istnieją harmonogramy, uruchom `oma schedule sync`
po migracji. Aktywne usługi albo runnery mogą odroczyć dane;
zakończ te procesy i ponownie uruchom migrację.

## Zobacz także

- [Ładowanie konfiguracji](./oma-config-semantics.md): jak scalane są globalne, projektowe i lokalne pliki konfiguracji
- [Integracja z istniejącym projektem](./integration.md): instalacja w trybie projektowym, weryfikacja i wycofanie
- [Automatyczne aktualizacje](./automated-updates.md): uruchamianie `oma update` z CI
