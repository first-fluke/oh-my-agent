---
title: "Anleitung: Globale Installation"
sidebar_label: Globale Installation
description: Installieren Sie oh-my-agent im globalen OMA-Home (~/.oma/) statt pro Projekt, damit dieselben Skills, Workflows und Regeln in jedem Projekt gelten. Behandelt oma install --global, oma update --global, oma uninstall --global, die OMA_HOME-Überschreibung, die Erkennung paralleler Installationen mit oma doctor sowie plattformspezifische Hinweise (sudo-Verweigerung, CI, WSL und cwd=HOME-Schutz).
---

## Was ist eine globale Installation?

Standardmäßig beschränkt `oma install` alles auf das aktuelle Projektverzeichnis: Die SSOT liegt unter `<cwd>/.agents/`, und Vendor-Konfigurationen werden in `<cwd>/.claude/`, `<cwd>/.codex/` usw. geschrieben. Eine **globale Installation** (`oma install --global`) installiert oh-my-agent stattdessen im globalen OMA-Home. Dadurch stehen dieselben Skills, Workflows und Regeln in jedem geöffneten Projekt zur Verfügung, ohne dass Sie den Installationsschritt wiederholen müssen. Die SSOT liegt unter `~/.oma/.agents/`; die Vendor-Konfigurationen bleiben unter `~/.claude/`, `~/.codex/` usw.

## Vergleich: Projekt und global

| Aspekt | Projekt (`oma install`) | Global (`oma install --global`, Standard-OMA-Home) |
|--------|------------------------|--------------------------------|
| SSOT-Speicherort | `<cwd>/.agents/` | `~/.oma/.agents/` |
| Vendor-Konfigurationen | `<cwd>/.claude/`, `<cwd>/.codex/` usw. | `~/.claude/`, `~/.codex/` usw. |
| Sperrdatei | `<cwd>/.agents/_install.lock` | `~/.oma/.agents/_install.lock` |
| Metadaten | `<cwd>/.agents/skills/_version.json` (schemaVersion 2) | `~/.oma/.agents/skills/_version.json` (schemaVersion 2) |
| Anwendungsfall | Projektspezifische Anpassung | Persönlicher Standard für alle Projekte |
| Gültigkeitsbereich von oma-config.yaml | Projektspezifisch | Benutzerweite Baseline |

Beide Modi können gleichzeitig bestehen. `oma doctor` meldet beide Installationen, sofern vorhanden, und weist auf Abweichungen zwischen ihnen hin.

Prüfen Sie nach einer erfolgreichen globalen Installation die Dateien im Benutzerkontext und das aufgelöste Profil:

```bash
oma doctor --global --json
oma doctor --global --profile
```

Der erste Befehl meldet den Zustand der Installation und der Vendoren; der Profilbefehl zeigt den von den Agenten verwendeten Modellplan. Behalten Sie `--global` (oder `-g`) bei: Ohne diese Option prüfen beide Befehle das Projekt im aktuellen Verzeichnis, wobei dessen Konfiguration über die globalen Standardwerte gelegt wird.

## Erstmalige Einrichtung

Wenn Sie `oma install --global` auf einem Rechner zum ersten Mal ausführen, zeigt die Installation vor dem Fortfahren einen erklärenden Hinweis an:

```text
This is your first global install of oh-my-agent.
Scope:
  - SSOT: ~/.oma/.agents/  (all skills, workflows, rules)
  - Vendor configs: ~/.claude/, ~/.codex/, ~/.gemini/, ~/.qwen/  (symlinks + settings)
  - Lock file: ~/.oma/.agents/_install.lock
Existing per-project installs are not affected.

? Proceed with the global install? (y/N)
```

Bestätigen Sie, um fortzufahren. Danach folgt die Installation demselben interaktiven Ablauf wie bei einer Projektinstallation (Sprache, Modell-Preset, Projekttyp, Vendor-Auswahl).

Nach einer erfolgreichen Installation werden die nächsten Schritte angezeigt:

```text
1. Open your project in your IDE
2. Type /orchestrate to spawn a multi-agent workflow
3. Run `oma doctor` if anything looks off
```

## Hinweise

### Sudo wird verweigert

`oma install` (in jedem Modus) beendet sich sofort, wenn es unter `sudo` ausgeführt wird:

```text
Refusing to install under sudo. Re-run as the target user (without sudo) — oma writes to your HOME and runs as your user.
```

Führen Sie den Befehl als normaler Benutzer ohne `sudo` aus.

### CI-Umgebungen

Wenn Sie `oma install --global` in einer CI-Pipeline ausführen, wird das HOME-Verzeichnis des CI-Runners verändert. Das ist in der Regel unerwünscht. Falls Sie die globale Installation dennoch benötigen, etwa in einer Bootstrap-Pipeline, gibt oma eine Warnung aus:

```text
Running `oma install --global` in CI. This will modify the CI user's HOME. Proceeding because --yes / non-interactive mode is set.
```

Die Warnung erscheint, wenn `CI` auf `true` oder `1` gesetzt ist. Diese Werte machen die Installation bereits nicht-interaktiv, sodass sie mit Standardwerten fortfährt und nicht auf Eingaben wartet. Außerhalb von CI erzielen Sie mit `--yes` oder `OMA_YES=1` dasselbe nicht-interaktive Verhalten.

### WSL: Linux-HOME und Windows-USERPROFILE

Wenn oma erkennt, dass es im Windows Subsystem for Linux läuft, gibt es Folgendes aus:

```text
WSL detected: your $HOME (/home/<user>) is the WSL Linux home and is distinct
from your Windows %USERPROFILE%. oma will install only to the WSL HOME.
If you want a Windows-side install, re-run this command from PowerShell.
```

Eine WSL-Installation und eine PowerShell-Installation sind unabhängig voneinander. Wenn Sie globale Abdeckung auf beiden Seiten möchten, führen Sie `oma install --global` einmal aus WSL und einmal aus PowerShell aus.

### Guard bei cwd = HOME (Projektmodus)

`oma link` und `oma update` (ohne `--global`) verweigern die Ausführung, solange Ihr aktuelles Verzeichnis Ihr HOME ist. Im Projektmodus wäre `<cwd>/.claude/settings.json` gleich `~/.claude/settings.json` — Ihre globalen Claude-Code-Einstellungen — und das projektbezogene Rendering würde dessen `$HOME/.claude/hooks/...`-Befehle auf `$CLAUDE_PROJECT_DIR/...` umschreiben, wodurch jeder Hook und die Statuszeile in Projekten ohne eigenes `.claude/hooks/` kaputtgehen. Verwenden Sie stattdessen `oma link --global` / `oma update --global` für die globale Installation oder wechseln Sie zuerst per `cd` in ein Projekt.

Wenn Sie `oma install` (ohne `--global`) ausführen, während Ihr aktuelles Verzeichnis Ihr HOME ist, warnt oma Sie:

```text
You're running oma in your HOME directory without --global. This will scatter
files in ~/. Are you sure?
```

Im nicht-interaktiven bzw. CI-Modus wird der Vorgang automatisch abgebrochen. Verwenden Sie `--global`, wenn Sie eine benutzerweite Installation beabsichtigen.

## Globale Installation neu verknüpfen

`oma link` regeneriert die Vendor-nativen Dateien aus der SSOT, ohne neu zu installieren. Wie `install` und `update` löst der Befehl sein Ziel aus dem Installationskontext auf. Verwenden Sie daher `--global`, um `~/.oma/.agents/` abzugleichen; der Befehl funktioniert aus jedem Verzeichnis, nicht nur aus `$HOME`:

```bash
# Regenerate every configured vendor in the global install
oma link --global

# Regenerate only opencode (e.g. after editing per-agent models in ~/.oma/.agents/oma-config.yaml)
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

Der Deinstallationsbefehl trennt oma-eigene von benutzereigenen Dateien. Er entfernt nur die Skills, die in `managed-skills.json` unter `.agents/state/` als von OMA verwaltet erfasst sind; der Marker `<!-- oma:generated -->` kennzeichnet generierte Copilot-Prompt-Dateien. Benutzereigene Inhalte (`oma-config.yaml`, `mcp.json` und nicht als verwaltet erfasste Skills) werden nie gelöscht. Führen Sie zuerst `--dry-run` aus, um die genaue Liste zu sehen.

Um eine Projektinstallation zu deinstallieren, lassen Sie `--global` weg:

```bash
oma uninstall [--dry-run]
```

## OMA_HOME-Überschreibung

Setzen Sie `OMA_HOME` auf einen absoluten Pfad, um die globalen OMA-eigenen Daten zu verlagern:

```bash
OMA_HOME=/tmp/oma-test oma install --global
```

`OMA_HOME` ist der globale Speicherstamm, kein Ziel für Projektinstallationen. Mit dem obigen Wert liegen die globalen Definitionen unter `/tmp/oma-test/.agents/`; Projektinstallation und `link` verwenden weiterhin `<cwd>/.agents/`. Vendor-native Einstellungen und Authentifizierung bleiben außerhalb von `OMA_HOME`. Globale OpenCode-Integrationsdateien werden nach `~/.config/opencode/` unter dem tatsächlichen HOME-Verzeichnis geschrieben.

`OMA_STATE_HOME` ist eine ausdrückliche Ausnahme für den Laufzeitspeicher von Profilen, L1 und Projekten: Der Pfad muss absolut sein und enthält `u/`. Ist die Variable nicht gesetzt, folgen Profile `OMA_HOME`. `XDG_CONFIG_HOME` verlagert den OMA-Zustand nicht mehr und ändert auch nicht den OpenCode-Ausgabepfad von OMA. Secrets im OS-Schlüsselbund, AgentMemory/Honcho-Daten und Caches verwalteter Toolchains bleiben bei ihren bisherigen Besitzern.

## Layout des globalen Speichers

Globale Daten liegen standardmäßig unter `~/.oma`. Ist `OMA_HOME` gesetzt, ersetzen Sie `~/.oma` durch dessen Wert:

| Daten | Speicherort |
|---|---|
| Globale Definitionen, Konfiguration, Installationsmetadaten | `~/.oma/.agents/` |
| Zeitplan-Manifest, erfasste Umgebung, Laufprotokolle | `~/.oma/schedule/` |
| Globale Backups | `~/.oma/backup/` |
| Serena-Registry, Sperren, Protokolle | `~/.oma/state/serena/` |
| Index der Vault-Schlüsselnamen | `~/.oma/state/vault-index.json` |
| Profile, L1-Sitzungen, Projektlaufzeit | `~/.oma/u/<profile>/` (`<OMA_STATE_HOME>/u/<profile>/`, wenn `OMA_STATE_HOME` gesetzt ist) |

Die globale Konfiguration liefert Standardwerte. Die nächstgelegene Projektdatei `.agents/oma-config.*` und
ihr lokales Overlay überschreiben sie; verschiedene übergeordnete Projektstämme werden nicht zusammengeführt.
Die vollständige Reihenfolge finden Sie unter [Laden der Konfiguration](./oma-config-semantics.md#precedence-table).
Ein Projekt, das `semantic_memory: none` wählt, lässt den Speicher deaktiviert, selbst wenn die
globale Konfiguration AgentMemory auswählt.

## Bestehende Installationen

Die Home-Migration kopiert OMA-eigene Daten aus `~/.agents/` und `~/.config/oma/`
in das neue Layout. Die Originale bleiben erhalten, mit Ausnahme verifizierter OMA-eigener Skill-Verzeichnisse,
die in Discovery-Links umgewandelt werden: Ihr ursprünglicher Inhalt wird unter
`~/.oma/backup/legacy-global-skills/` archiviert, bevor der alte Pfad zu einem Link auf den migrierten
Skill wird. Vorhandene Zieldateien werden nicht überschrieben; Konflikte und Daten in Verwendung
werden für einen erneuten Versuch gemeldet. Vault-Indizes
führen Schlüsselnamen zusammen, ohne geheime Werte aus dem OS-Schlüsselbund zu verschieben. Benutzer-Skills
und fremde Links bleiben an Ort und Stelle; Authentifizierungsdateien der Vendoren werden nicht
verschoben. Laufzeitleser verwenden nur
die neuen Pfade.

```bash
oma home migrate --dry-run --json
oma home migrate --json
oma schedule sync
```

Globale Installation und globales Update führen die Migration aus, bevor sie ihre globalen Dateien schreiben.
Projektinstallation und -update verwenden die vereinheitlichten Stämme, ohne unabhängige globale
Daten zu migrieren. Die Migration ändert keine Job-Registrierungen des Betriebssystems; führen Sie nach der Migration `oma schedule sync`
aus, wenn Zeitpläne vorhanden sind. Aktive Dienste oder Runner können Daten zurückstellen;
beenden Sie diese Prozesse und führen Sie die Migration erneut aus.

## Siehe auch

- [Laden der Konfiguration](./oma-config-semantics.md): wie globale, Projekt- und lokale Konfigurationsdateien zusammengeführt werden
- [Integration in bestehende Projekte](./integration.md): Installation im Projektmodus, Verifizierung und Rollback
- [Automatisierte Updates](./automated-updates.md): `oma update` aus CI ausführen
