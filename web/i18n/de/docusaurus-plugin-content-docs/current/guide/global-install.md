---
title: "Anleitung: Globale Installation"
description: Installieren Sie oh-my-agent in Ihrem Benutzer-HOME (~/.agents/) statt pro Projekt, sodass dieselben Skills, Workflows und Regeln in jedem Projekt gelten. Behandelt oma install --global, oma update --global, oma uninstall --global, die OMA_HOME-Überschreibung, die Erkennung doppelter Installationen via oma doctor sowie plattformspezifische Einschränkungen (sudo-Verweigerung, CI, WSL, cwd=HOME-Schutz).
---

## Was ist eine globale Installation?

Standardmäßig bezieht sich `oma install` auf das aktuelle Projektverzeichnis: Die SSOT liegt unter `<cwd>/.agents/`, und Vendor-Konfigurationen werden in `<cwd>/.claude/`, `<cwd>/.codex/` usw. geschrieben. Eine **globale Installation** (`oma install --global`) installiert oh-my-agent stattdessen in Ihr Benutzer-HOME, sodass dieselben Skills, Workflows und Regeln in jedem Projekt verfügbar sind, das Sie öffnen, ohne den Installationsschritt zu wiederholen. Die SSOT liegt unter `~/.agents/`, und Vendor-Konfigurationen liegen unter `~/.claude/`, `~/.codex/` usw.

## Vergleich: Projekt vs. global

| Aspekt | Projekt (`oma install`) | Global (`oma install --global`) |
|--------|------------------------|--------------------------------|
| SSOT-Speicherort | `<cwd>/.agents/` | `~/.agents/` |
| Vendor-Konfigurationen | `<cwd>/.claude/`, `<cwd>/.codex/` usw. | `~/.claude/`, `~/.codex/` usw. |
| Lock-Datei | `<cwd>/.agents/_install.lock` | `~/.agents/_install.lock` |
| Metadaten | `<cwd>/.agents/_version.json (schemaVersion=2)` | `~/.agents/_version.json (schemaVersion=2)` |
| Anwendungsfall | Projektspezifische Anpassung | Persönlicher Standard für alle Projekte |
| `oma-config.yaml`-Gültigkeitsbereich | Projektspezifisch | Benutzerweite Baseline |

Beide Modi können koexistieren. `oma doctor` meldet beide Installationen, sofern vorhanden, und weist auf Abweichungen zwischen ihnen hin.

## Erstmalige Einrichtung

Wenn Sie `oma install --global` zum ersten Mal auf einem Rechner ausführen, zeigt die Installation vor dem Fortfahren einen erklärenden Hinweis an:

```
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Bestätigen Sie, um fortzufahren. Die Installation folgt anschließend demselben interaktiven Ablauf wie eine Projektinstallation (Sprache, Modell-Preset, Projekttyp, Vendor-Auswahl).

Nach erfolgreicher Installation werden die nächsten Schritte angezeigt:

```
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Einschränkungen

### Sudo wird verweigert

`oma install` (in jedem Modus) bricht sofort ab, wenn es unter `sudo` ausgeführt wird:

```
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Führen Sie den Befehl als Ihr normaler Benutzer ohne `sudo` aus.

### CI-Umgebungen

Wenn Sie `oma install --global` innerhalb einer CI-Pipeline ausführen, wird das HOME-Verzeichnis des CI-Runners verändert. Das ist in der Regel unerwünscht. Falls Sie es dennoch benötigen (etwa in einer Bootstrapping-Pipeline), gibt oma eine Warnung aus:

```
Running `oma install --global` in CI. This will modify the CI user's HOME.
```

Die Installation wird fortgesetzt, wenn `--yes` bzw. `OMA_YES=1` gesetzt ist. Andernfalls wird die Warnung angezeigt und die Installation läuft interaktiv weiter (was in den meisten CI-Setups hängenbleibt).

### WSL: Linux-HOME vs. Windows-USERPROFILE

Wenn oma erkennt, dass es im Windows Subsystem for Linux läuft, gibt es Folgendes aus:

```
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Eine WSL-Installation und eine PowerShell-Installation sind voneinander unabhängig. Wenn Sie globale Abdeckung auf beiden Seiten möchten, führen Sie `oma install --global` jeweils einmal aus WSL und einmal aus PowerShell aus.

### cwd = HOME-Warnung (Projektmodus)

Wenn Sie `oma install` (ohne `--global`) ausführen, während Ihr aktuelles Verzeichnis Ihr HOME ist, warnt oma Sie:

```
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

Im nicht-interaktiven bzw. CI-Modus bricht der Vorgang automatisch ab. Verwenden Sie `--global`, wenn Sie eine benutzerweite Installation beabsichtigen.

## Deinstallation

```bash
# Preview what would be removed (never deletes anything)
oma uninstall --global --dry-run

# Remove the global install
oma uninstall --global
```

Der Deinstallationsbefehl trennt oma-eigene Dateien von benutzereigenen Dateien. Benutzereigene Inhalte (`oma-config.yaml`, `mcp.json`, eigene Skills ohne den Marker `<!-- oma:generated -->`) werden niemals gelöscht.

Um eine Projektinstallation zu entfernen, lassen Sie `--global` weg:

```bash
oma uninstall [--dry-run]
```

## OMA_HOME-Überschreibung

Für Test- oder Staging-Zwecke können Sie alle oma-Operationen in ein beliebiges Verzeichnis umleiten:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` hat Vorrang vor `--global` und `process.cwd()`. Verbotene Systempfade (`/etc`, `/usr`, `/bin`, `/boot`, `/sys`, `/proc`) werden auch über `OMA_HOME` abgelehnt. Der Pfad muss absolut und beschreibbar sein.
