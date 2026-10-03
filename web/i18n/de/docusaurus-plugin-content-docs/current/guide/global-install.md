---
title: "Anleitung: Globale Installation"
sidebar_label: Globale Installation
description: Installieren Sie oh-my-agent in Ihrem Benutzer-HOME (~/.agents/) statt pro Projekt, damit dieselben Skills, Workflows und Regeln in jedem Projekt gelten. Behandelt oma install --global, oma update --global, oma uninstall --global, die OMA_HOME-Überschreibung, die Erkennung paralleler Installationen mit oma doctor sowie plattformspezifische Hinweise (sudo-Verweigerung, CI, WSL und cwd=HOME-Schutz).
---

## Was ist eine globale Installation?

Standardmäßig beschränkt `oma install` alles auf das aktuelle Projektverzeichnis: Die SSOT liegt unter `<cwd>/.agents/`, und Vendor-Konfigurationen werden in `<cwd>/.claude/`, `<cwd>/.codex/` usw. geschrieben. Eine **globale Installation** (`oma install --global`) installiert oh-my-agent stattdessen in Ihrem Benutzer-HOME. Dadurch stehen dieselben Skills, Workflows und Regeln in jedem geöffneten Projekt zur Verfügung, ohne dass Sie den Installationsschritt wiederholen müssen. Die SSOT liegt unter `~/.agents/`, die Vendor-Konfigurationen unter `~/.claude/`, `~/.codex/` usw.

## Vergleich: Projekt und global

| Aspekt | Projekt (`oma install`) | Global (`oma install --global`) |
|--------|------------------------|--------------------------------|
| SSOT-Speicherort | `<cwd>/.agents/` | `~/.agents/` |
| Vendor-Konfigurationen | `<cwd>/.claude/`, `<cwd>/.codex/` usw. | `~/.claude/`, `~/.codex/` usw. |
| Sperrdatei | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Metadaten | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Anwendungsfall | Projektspezifische Anpassung | Persönlicher Standard für alle Projekte |
| Gültigkeitsbereich von oma-config.yaml | Projektspezifisch | Benutzerweite Baseline |

Beide Modi können gleichzeitig bestehen. `oma doctor` meldet beide Installationen, sofern vorhanden, und weist auf Abweichungen zwischen ihnen hin.

Nach einer erfolgreichen globalen Installation können Sie die Dateien im Benutzerkontext und das aufgelöste Profil prüfen:

```bash
oma doctor --json
oma doctor --profile
```

Der erste Befehl meldet den Zustand der Installation und der Vendoren; der Profilbefehl zeigt den von den Agenten verwendeten Modellplan. Führen Sie beide Befehle aus einem beliebigen Projekt aus, wenn Sie die globale Installation prüfen möchten.

## Erstmalige Einrichtung

Wenn Sie `oma install --global` auf einem Rechner zum ersten Mal ausführen, zeigt die Installation vor dem Fortfahren einen erklärenden Hinweis an:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Bestätigen Sie, um fortzufahren. Danach folgt die Installation demselben interaktiven Ablauf wie bei einer Projektinstallation (Sprache, Modell-Preset, Projekttyp, Vendor-Auswahl).

Nach einer erfolgreichen Installation werden die nächsten Schritte angezeigt:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Hinweise

### Sudo wird verweigert

`oma install` (in jedem Modus) beendet sich sofort, wenn es unter `sudo` ausgeführt wird:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Führen Sie den Befehl als normaler Benutzer ohne `sudo` aus.

### CI-Umgebungen

Wenn Sie `oma install --global` in einer CI-Pipeline ausführen, wird das HOME-Verzeichnis des CI-Runners verändert. Das ist in der Regel unerwünscht. Falls Sie die globale Installation dennoch benötigen, etwa in einer Bootstrap-Pipeline, gibt oma eine Warnung aus:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

Die Installation wird fortgesetzt, wenn `--yes` oder `OMA_YES=1` gesetzt ist. Ohne diese Angabe wird die Warnung angezeigt und die Installation interaktiv fortgesetzt, was in den meisten CI-Setups zu einem Hängenbleiben führt.

### WSL: Linux-HOME und Windows-USERPROFILE

Wenn oma erkennt, dass es im Windows Subsystem for Linux läuft, gibt es Folgendes aus:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Eine WSL-Installation und eine PowerShell-Installation sind unabhängig voneinander. Wenn Sie globale Abdeckung auf beiden Seiten möchten, führen Sie `oma install --global` einmal aus WSL und einmal aus PowerShell aus.

### Guard bei cwd = HOME (Projektmodus)

`oma link` und `oma update` (ohne `--global`) verweigern die Ausführung, solange Ihr aktuelles Verzeichnis Ihr HOME ist. Im Projektmodus wäre `<cwd>/.claude/settings.json` gleich `~/.claude/settings.json` — Ihre globalen Claude-Code-Einstellungen — und das projektbezogene Rendering würde dessen `$HOME/.claude/hooks/...`-Befehle auf `$CLAUDE_PROJECT_DIR/...` umschreiben, wodurch jeder Hook und die Statuszeile in Projekten ohne eigenes `.claude/hooks/` kaputtgehen. Verwenden Sie stattdessen `oma link --global` / `oma update --global` für die HOME-Installation oder wechseln Sie zuerst per `cd` in ein Projekt.

Wenn Sie `oma install` (ohne `--global`) ausführen, während Ihr aktuelles Verzeichnis Ihr HOME ist, warnt oma Sie:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

Im nicht-interaktiven bzw. CI-Modus wird der Vorgang automatisch abgebrochen. Verwenden Sie `--global`, wenn Sie eine benutzerweite Installation beabsichtigen.

## Globale Installation neu verknüpfen

`oma link` regeneriert die Vendor-nativen Dateien aus der SSOT, ohne neu zu installieren. Wie `install` und `update` löst der Befehl sein Ziel aus dem Installationskontext auf. Verwenden Sie daher `--global`, um `~/.agents/` abzugleichen; der Befehl funktioniert aus jedem Verzeichnis, nicht nur aus `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.agents/oma-config.yaml)
oma link opencode --global
```

Ohne `--global` zielt `oma link` auf `<cwd>/.agents/`. Wenn Sie es in einem Projekt ausführen, während Ihre Installation global ist, meldet der Befehl daher, dass dort kein `.agents/`-Verzeichnis gefunden wurde.

## Deinstallation

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

Der Deinstallationsbefehl trennt oma-eigene von benutzereigenen Dateien. Benutzereigene Inhalte (`oma-config.yaml`, `mcp.json`, eigene Skills ohne den Marker `<!-- oma:generated -->`) werden nie gelöscht.

Um eine Projektinstallation zu deinstallieren, lassen Sie `--global` weg:

```bash
oma uninstall [--dry-run]
```

## OMA_HOME-Überschreibung

Für Tests oder Staging können Sie alle oma-Operationen in ein beliebiges Verzeichnis umleiten:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` hat Vorrang vor `--global` und `process.cwd()`. Verbotene Systempfade (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) werden auch über `OMA_HOME` abgelehnt. Der Pfad muss absolut und beschreibbar sein.

Für einen sicheren Smoke-Test setzen Sie `OMA_HOME` auf ein leeres, beschreibbares Verzeichnis und führen `oma install --global --yes` aus. Die Zusammenfassung sollte dieses Verzeichnis als Installationsstamm nennen. Entfernen Sie das Verzeichnis nach dem Test und führen Sie anschließend die echte Installation mit dem vorgesehenen HOME aus.
