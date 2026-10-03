---
title: "Przewodnik: instalacja globalna"
sidebar_label: Instalacja globalna
description: Zainstaluj oh-my-agent w katalogu HOME użytkownika (~/.agents/) zamiast per projekt, aby te same umiejętności, workflowy i reguły obowiązywały we wszystkich projektach. Obejmuje oma install --global, oma update --global, oma uninstall --global, nadpisanie OMA_HOME, wykrywanie podwójnej instalacji przez oma doctor oraz zastrzeżenia platformowe (odmowa sudo, CI, WSL i ochrona cwd=HOME).
---

## Czym jest instalacja globalna?

Domyślnie `oma install` ogranicza wszystko do bieżącego katalogu projektu: SSOT znajduje się w `<cwd>/.agents/`, a konfiguracje vendorów są zapisywane w `<cwd>/.claude/`, `<cwd>/.codex/` itd. **Instalacja globalna** (`oma install --global`) umieszcza oh-my-agent w katalogu HOME użytkownika, dzięki czemu te same umiejętności, workflowy i reguły są dostępne w każdym otwieranym projekcie bez powtarzania kroku instalacji. SSOT znajduje się w `~/.agents/`, a konfiguracje vendorów w `~/.claude/`, `~/.codex/` itd.

## Porównanie instalacji projektowej i globalnej

| Aspekt | Projekt (`oma install`) | Globalna (`oma install --global`) |
|--------|------------------------|--------------------------------|
| Położenie SSOT | `<cwd>/.agents/` | `~/.agents/` |
| Konfiguracje vendorów | `<cwd>/.claude/`, `<cwd>/.codex/` itd. | `~/.claude/`, `~/.codex/` itd. |
| Plik blokady | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Metadane | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Zastosowanie | Dostosowanie per projekt | Osobiste ustawienia domyślne we wszystkich projektach |
| Zakres oma-config.yaml | Właściwy dla projektu | Bazowy dla użytkownika |

Oba tryby mogą współistnieć. `oma doctor` zgłasza obie instalacje, jeśli są obecne, i sygnalizuje rozbieżności między nimi.

Po udanej instalacji globalnej sprawdź pliki zakotwiczone w katalogu użytkownika oraz rozstrzygnięty profil:

```bash
oma doctor --json
oma doctor --profile
```

Pierwsze polecenie zgłasza stan instalacji i vendorów; polecenie z profilem pokazuje plan modeli używany przez agentów. Uruchom je z dowolnego projektu, gdy chcesz sprawdzić instalację globalną.

## Konfiguracja przy pierwszym uruchomieniu

Przy pierwszym uruchomieniu `oma install --global` na danym komputerze instalator pokazuje przed kontynuowaniem objaśnienie:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Potwierdź, aby kontynuować. Instalacja przebiega potem tak samo jak instalacja projektowa (język, preset modelu, typ projektu, wybór vendora).

Po udanej instalacji zostaną pokazane kolejne kroki:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Zastrzeżenia

### Odmowa działania przez sudo

`oma install` (w dowolnym trybie) natychmiast kończy działanie uruchomiony przez `sudo`:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Uruchom polecenie jako zwykły użytkownik, bez `sudo`.

### Środowiska CI

Uruchomienie `oma install --global` w potoku CI modyfikuje katalog HOME runnera CI. Zwykle jest to niepożądane. Jeśli jednak tego potrzebujesz (np. w potoku rozruchowym), oma wyświetla ostrzeżenie:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

Instalacja przebiega, gdy ustawiono `--yes` / `OMA_YES=1`. Bez tego ostrzeżenie zostaje pokazane, a instalacja kontynuuje się interaktywnie (co w większości konfiguracji CI spowoduje zawieszenie).

### WSL: Linux HOME a Windows USERPROFILE

Gdy oma wykryje działanie wewnątrz Windows Subsystem for Linux, wypisuje:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Instalacja WSL i instalacja z PowerShella są niezależne. Aby mieć globalny zakres po obu stronach, uruchom `oma install --global` raz w WSL i raz w PowerShellu.

### Strażnik cwd = HOME (tryb projektowy)

`oma link` i `oma update` (bez `--global`) odmawiają działania, gdy bieżący katalog jest Twoim katalogiem HOME. W trybie projektowym `<cwd>/.claude/settings.json` byłoby `~/.claude/settings.json` — Twoimi globalnymi ustawieniami Claude Code — a renderowanie w zakresie projektu przepisałoby jego polecenia `$HOME/.claude/hooks/...` na `$CLAUDE_PROJECT_DIR/...`, psując każdy hook i pasek statusu w projektach bez własnego `.claude/hooks/`. Zamiast tego użyj `oma link --global` / `oma update --global` do instalacji w HOME albo najpierw przejdź (`cd`) do projektu.

Jeśli uruchomisz `oma install` (bez `--global`), gdy bieżący katalog jest katalogiem HOME, oma ostrzega:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

W trybie nieinteraktywnym / CI działanie jest automatycznie przerywane. Użyj `--global`, jeśli zamierzasz zainstalować narzędzie dla całego użytkownika.

## Ponowne linkowanie instalacji globalnej

`oma link` regeneruje pliki natywne dla vendorów z SSOT bez ponownej instalacji. Tak jak `install` i `update`, rozstrzyga cel na podstawie kontekstu instalacji, więc przekaż `--global`, aby zsynchronizować `~/.agents/` — działa to z dowolnego katalogu, nie tylko z `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.agents/oma-config.yaml)
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

Polecenie odinstalowania rozdziela pliki należące do oma od plików użytkownika. Treści użytkownika (oma-config.yaml, mcp.json, niestandardowe umiejętności bez znacznika `<!-- oma:generated -->`) nigdy nie są usuwane.

Aby odinstalować instalację projektową, pomiń `--global`:

```bash
oma uninstall [--dry-run]
```

## Nadpisanie OMA_HOME

Na potrzeby testów lub środowiska przejściowego możesz przekierować wszystkie operacje oma do dowolnego katalogu:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` ma pierwszeństwo przed `--global` i `process.cwd()`. Zabronione ścieżki systemowe (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) są odrzucane nawet przez `OMA_HOME`. Ścieżka musi być bezwzględna i zapisywalna.

Aby bezpiecznie wykonać test smoke, wskaż `OMA_HOME` na pusty, zapisywalny katalog i uruchom `oma install --global --yes`; podsumowanie powinno wskazać ten katalog jako katalog główny instalacji. Po teście usuń katalog, a następnie uruchom właściwą instalację z zamierzonym HOME.
