---
title: "Przewodnik: instalacja globalna"
description: Zainstaluj oh-my-agent w katalogu HOME użytkownika (~/.agents/) zamiast per projekt, aby te same skille, workflowy i reguły obowiązywały we wszystkich projektach. Obejmuje oma install --global, oma update --global, oma uninstall --global, nadpisanie OMA_HOME, wykrywanie podwójnej instalacji przez oma doctor oraz zastrzeżenia platformowe (odmowa sudo, CI, WSL, ochrona cwd=HOME).
---

## Czym jest instalacja globalna?

Domyślnie `oma install` ogranicza wszystko do bieżącego katalogu projektu: SSOT trafia do `<cwd>/.agents/`, a konfiguracje vendorów do `<cwd>/.claude/`, `<cwd>/.codex/` itd. **Instalacja globalna** (`oma install --global`) umieszcza oh-my-agent w katalogu HOME użytkownika, dzięki czemu te same skille, workflowy i reguły są dostępne w każdym otwieranym projekcie bez powtarzania kroku instalacji. SSOT znajduje się w `~/.agents/`, a konfiguracje vendorów w `~/.claude/`, `~/.codex/` itd.

## Porównanie: projekt vs globalna

| Aspekt | Projekt (`oma install`) | Globalna (`oma install --global`) |
|--------|------------------------|--------------------------------|
| Lokalizacja SSOT | `<cwd>/.agents/` | `~/.agents/` |
| Konfiguracje vendorów | `<cwd>/.claude/`, `<cwd>/.codex/` itd. | `~/.claude/`, `~/.codex/` itd. |
| Plik blokady | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Metadane | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Zastosowanie | Personalizacja per projekt | Osobisty standard dla wszystkich projektów |
| Zakres oma-config.yaml | Specyficzny dla projektu | Bazowy dla całego konta użytkownika |

Oba tryby mogą współistnieć. `oma doctor` raportuje obie instalacje, jeśli istnieją, i sygnalizuje rozbieżności między nimi.

## Pierwsze uruchomienie

Przy pierwszym wywołaniu `oma install --global` na danej maszynie instalator wyświetla notkę wyjaśniającą przed kontynuacją:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Potwierdź, aby kontynuować. Dalsza instalacja przebiega zgodnie z tym samym interaktywnym przepływem co instalacja projektowa (język, preset modelu, typ projektu, wybór vendora).

Po udanej instalacji wyświetlane są kolejne kroki:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Zastrzeżenia

### Odmowa sudo

`oma install` (w dowolnym trybie) kończy działanie natychmiast, gdy zostanie uruchomione pod `sudo`:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Uruchom polecenie jako zwykły użytkownik, bez `sudo`.

### Środowiska CI

Uruchomienie `oma install --global` wewnątrz pipeline'u CI modyfikuje katalog HOME runnera CI. Zwykle nie jest to pożądane. Jeśli faktycznie tego potrzebujesz (np. w pipeline bootstrapującym), oma wypisze ostrzeżenie:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

Instalacja jest kontynuowana, jeżeli ustawiono `--yes` / `OMA_YES=1`. W przeciwnym razie ostrzeżenie pojawia się, a instalacja działa interaktywnie (co w większości konfiguracji CI doprowadzi do zawieszenia).

### WSL: linuksowy HOME vs windowsowy USERPROFILE

Gdy oma wykryje uruchomienie w Windows Subsystem for Linux, wypisuje:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Instalacja po stronie WSL i po stronie PowerShell są niezależne. Aby uzyskać globalne pokrycie po obu stronach, uruchom `oma install --global` raz w WSL i raz w PowerShell.

### Ostrzeżenie cwd = HOME (tryb projektowy)

Gdy uruchomisz `oma install` (bez `--global`) z poziomu katalogu HOME, oma wyświetli ostrzeżenie:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

W trybie nieinteraktywnym / CI operacja zostaje automatycznie przerwana. Jeśli planujesz instalację dla całego konta, użyj `--global`.

## Deinstalacja

```bash
# Podgląd usuwanych elementów (nic nie jest kasowane)
oma uninstall --global --dry-run

# Usunięcie instalacji globalnej
oma uninstall --global
```

Polecenie deinstalacji rozróżnia pliki należące do oma od plików należących do użytkownika. Zawartość użytkownika (oma-config.yaml, mcp.json, własne skille bez znacznika `<!-- oma:generated -->`) nigdy nie jest usuwana.

Aby zdeinstalować wersję projektową, pomiń `--global`:

```bash
oma uninstall [--dry-run]
```

## Nadpisanie OMA_HOME

Na potrzeby testów lub środowiska staging możesz przekierować wszystkie operacje oma do dowolnego katalogu:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` ma pierwszeństwo nad `--global` i `process.cwd()`. Zabronione ścieżki systemowe (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) są odrzucane nawet przy użyciu `OMA_HOME`. Ścieżka musi być bezwzględna i zapisywalna.
