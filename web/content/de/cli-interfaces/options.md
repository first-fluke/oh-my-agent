---
title: CLI-Optionen
description: Erschöpfende Referenz aller CLI-Optionen — globale Flags, Ausgabesteuerung, Optionen pro Befehl und praxisnahe Nutzungsmuster.
---

# CLI-Optionen

## Globale Optionen

Diese Optionen stehen beim Root-Befehl `oma` / `oh-my-agent` zur Verfügung:

| Flag | Beschreibung |
|:-----|:-----------|
| `-V, --version` | Versionsnummer ausgeben und beenden |
| `-h, --help` | Hilfe für den Befehl anzeigen |

Alle Unterbefehle unterstützen ebenfalls `-h, --help` zur Anzeige ihres spezifischen Hilfetextes.

---

## Ausgabe-Optionen

Viele Befehle unterstützen maschinenlesbare Ausgabe für CI/CD-Pipelines und Automatisierung. Es gibt drei Möglichkeiten, JSON-Ausgabe anzufordern, in der Prioritätsreihenfolge:

### 1. --json-Flag

```bash
oma stats --json
oma doctor --json
oma cleanup --json
```

Das `--json`-Flag ist der einfachste Weg zur JSON-Ausgabe. Verfügbar bei: `doctor`, `stats`, `retro`, `cleanup`, `auth:status`, `usage:anti`, `memory:init`, `verify`, `visualize`.

### 2. --output-Flag

```bash
oma stats --output json
oma doctor --output text
```

Das `--output`-Flag akzeptiert `text` oder `json`. Es bietet dieselbe Funktionalität wie `--json`, ermöglicht aber auch die explizite Anforderung von Textausgabe (nützlich, wenn die Umgebungsvariable auf json gesetzt ist, Sie aber für einen bestimmten Befehl Text möchten).

**Validierung:** Bei ungültigem Format gibt die CLI folgenden Fehler aus: `Invalid output format: {value}. Expected one of text, json`.

### 3. Umgebungsvariable OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats    # gibt JSON aus
oma doctor   # gibt JSON aus
oma retro    # gibt JSON aus
```

Setzen Sie diese Umgebungsvariable auf `json`, um JSON-Ausgabe bei allen Befehlen zu erzwingen, die dies unterstützen. Nur `json` wird erkannt; jeder andere Wert wird ignoriert und es wird Text als Standard verwendet.

**Auflösungsreihenfolge:** `--json`-Flag > `--output`-Flag > `OH_MY_AG_OUTPUT_FORMAT`-Umgebungsvariable > `text` (Standard).

### Befehle mit JSON-Ausgabe

| Befehl | `--json` | `--output` | Hinweise |
|:--------|:---------|:----------|:------|
| `doctor` | Ja | Ja | Enthält CLI-Prüfungen, MCP-Status, Skill-Status |
| `stats` | Ja | Ja | Vollständiges Metrik-Objekt |
| `retro` | Ja | Ja | Snapshot mit Metriken, Autoren, Commit-Typen |
| `cleanup` | Ja | Ja | Liste der bereinigten Elemente |
| `auth:status` | Ja | Ja | Authentifizierungsstatus pro CLI |
| `usage:anti` | Ja | Ja | Modell-Nutzungskontingente |
| `memory:init` | Ja | Ja | Initialisierungsergebnis |
| `verify` | Ja | Ja | Verifikationsergebnisse pro Prüfung |
| `visualize` | Ja | Ja | Abhängigkeitsgraph als JSON |
| `describe` | Immer JSON | N/A | Gibt immer JSON aus (Introspektionsbefehl) |

---

## Optionen pro Befehl

### update

```
oma update [-f | --force] [--ci]
```

| Flag | Kurz | Beschreibung | Standard |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Benutzerdefinierte Konfigurationsdateien beim Update überschreiben. Betrifft: `oma-config.yaml`, `mcp.json`, `stack/`-Verzeichnisse. Ohne dieses Flag werden diese Dateien vor dem Update gesichert und danach wiederhergestellt. | `false` |
| `--ci` | | Nicht-interaktiver CI-Modus. Überspringt alle Bestätigungsaufforderungen, verwendet Klartext-Konsolenausgabe statt Spinner und Animationen. Erforderlich für CI/CD-Pipelines, in denen stdin nicht verfügbar ist. | `false` |

**Verhalten mit --force:**
- `oma-config.yaml` wird durch den Registry-Standard ersetzt.
- `mcp.json` wird durch den Registry-Standard ersetzt.
- Backend-`stack/`-Verzeichnis (sprachspezifische Ressourcen) wird ersetzt.
- Alle anderen Dateien werden unabhängig von diesem Flag immer aktualisiert.

**Verhalten mit --ci:**
- Kein `console.clear()` beim Start.
- `@clack/prompts` wird durch einfaches `console.log` ersetzt.
- Erkennung konkurrierender Tools wird übersprungen.
- Fehler werfen Exceptions statt `process.exit(1)` aufzurufen.

### stats

```
oma stats [--json] [--output <format>] [--reset]
```

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--reset` | Alle Metrikdaten zurücksetzen. Löscht `.serena/metrics.json` und erstellt die Datei mit leeren Werten neu. | `false` |

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--interactive` | Interaktiver Modus mit manueller Dateneingabe. Fragt nach zusätzlichem Kontext, der nicht aus Git gewonnen werden kann (z. B. Stimmung, bemerkenswerte Ereignisse). | `false` |
| `--compare` | Aktuelles Zeitfenster mit dem vorherigen gleichlangen Zeitfenster vergleichen. Zeigt Delta-Metriken an (z. B. Commits +12, hinzugefügte Zeilen -340). | `false` |

**Format des Zeitfenster-Arguments:**
- `7d` — 7 Tage
- `2w` — 2 Wochen
- `1m` — 1 Monat
- Weglassen für Standard (7 Tage)

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Flag | Kurz | Beschreibung | Standard |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Vorschaumodus. Listet alle Elemente auf, die bereinigt würden, nimmt aber keine Änderungen vor. Exit-Code 0 unabhängig von Funden. | `false` |
| `--yes` | `-y` | Alle Bestätigungsaufforderungen überspringen. Bereinigt alles ohne Nachfrage. Nützlich in Skripten und CI. | `false` |

**Was bereinigt wird:**
1. Verwaiste PID-Dateien: `/tmp/subagent-*.pid`, bei denen der referenzierte Prozess nicht mehr läuft.
2. Verwaiste Logdateien: `/tmp/subagent-*.log`, die zu beendeten PIDs gehören.
3. Gemini-Antigravity-Verzeichnisse: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/` — diese sammeln über die Zeit Zustand an und können groß werden.

### usage:anti

```
oma usage:anti [--json] [--output <format>] [--raw]
```

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--raw` | Rohe RPC-Antwort von Antigravity IDE ohne Verarbeitung ausgeben. Nützlich zum Debuggen von Verbindungsproblemen. | `false` |

### agent:spawn

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

| Flag | Kurz | Beschreibung | Standard |
|:-----|:------|:-----------|:--------|
| `--model` | `-m` | CLI-Vendor-Überschreibung. Muss einer der folgenden sein: `gemini`, `claude`, `codex`, `qwen`. Überschreibt alle konfigurationsbasierten Vendor-Auflösungen. | Aus Konfiguration aufgelöst |
| `--workspace` | `-w` | Arbeitsverzeichnis für den Agenten. Bei Weglassen oder Angabe von `.` erkennt die CLI den Workspace automatisch aus Monorepo-Konfigurationsdateien (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml). | Automatisch erkannt oder `.` |

**Validierung:**
- `agent-id` muss einer der folgenden sein: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.
- `session-id` darf nicht `..`, `?`, `#`, `%` oder Steuerzeichen enthalten.
- `vendor` muss einer der folgenden sein: `gemini`, `claude`, `codex`, `qwen`.

**Vendor-spezifisches Verhalten:**

| Vendor | Befehl | Auto-Approve-Flag | Prompt-Flag |
|:-------|:--------|:-----------------|:-----------|
| gemini | `gemini` | `--approval-mode=yolo` | `-p` |
| claude | `claude` | (keines) | `-p` |
| codex | `codex` | `--full-auto` | (keines — Prompt ist positionell) |
| qwen | `qwen` | `--yolo` | `-p` |

Diese Standards können in `.agents/skills/oma-orchestrator/config/cli-config.yaml` überschrieben werden.

### agent:status

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

| Flag | Kurz | Beschreibung | Standard |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Stammpfad zum Auffinden von Memory-Dateien (`.serena/memories/result-{agent}.md`) und PID-Dateien. | Aktuelles Arbeitsverzeichnis |

**Logik der Statusbestimmung:**
1. Falls `.serena/memories/result-{agent}.md` existiert: liest den `## Status:`-Header. Ohne Header wird `completed` gemeldet.
2. Falls PID-Datei unter `/tmp/subagent-{session-id}-{agent}.pid` existiert: prüft, ob der PID aktiv ist. Meldet `running` bei aktivem, `crashed` bei beendetem Prozess.
3. Falls keine der Dateien existiert: meldet `crashed`.

### agent:parallel

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| Flag | Kurz | Beschreibung | Standard |
|:-----|:------|:-----------|:--------|
| `--model` | `-m` | CLI-Vendor-Überschreibung, die auf alle gestarteten Agenten angewendet wird. | Pro Agent aus Konfiguration aufgelöst |
| `--inline` | `-i` | Aufgabenargumente als `agent:task[:workspace]`-Zeichenketten statt als Dateipfad interpretieren. | `false` |
| `--no-wait` | | Hintergrundmodus. Startet alle Agenten und kehrt sofort zurück, ohne auf den Abschluss zu warten. PID-Liste und Logs werden in `.agents/results/parallel-{timestamp}/` gespeichert. | `false` (wartet auf Abschluss) |

**Inline-Aufgabenformat:** `agent:task` oder `agent:task:workspace`
- Der Workspace wird erkannt, indem geprüft wird, ob das letzte durch Doppelpunkt getrennte Segment mit `./`, `/` beginnt oder `.` entspricht.
- Beispiel: `backend:Implement auth API:./api` — agent=backend, task="Implement auth API", workspace=./api.
- Beispiel: `frontend:Build login page` — agent=frontend, task="Build login page", workspace=automatisch erkannt.

**YAML-Aufgabendateiformat:**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # optional
  - agent: frontend
    task: "Build user dashboard"
```

### memory:init

```
oma memory:init [--json] [--output <format>] [--force]
```

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--force` | Leere oder vorhandene Schemadateien in `.serena/memories/` überschreiben. Ohne dieses Flag werden vorhandene Dateien nicht berührt. | `false` |

### verify

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

| Flag | Kurz | Beschreibung | Standard |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Pfad zum zu verifizierenden Workspace-Verzeichnis. | Aktuelles Arbeitsverzeichnis |

**Agententypen:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

---

## Praktische Beispiele

### CI-Pipeline: Aktualisierung und Verifikation

```bash
# Im CI-Modus aktualisieren, dann doctor zur Installationsverifikation ausführen
oma update --ci
oma doctor --json | jq '.healthy'
```

### Automatisierte Metrikerfassung

```bash
# Metriken als JSON erfassen und an ein Überwachungssystem weiterleiten
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Stapelweise Agentenausführung mit Statusüberwachung

```bash
# Agenten im Hintergrund starten
oma agent:parallel tasks.yaml --no-wait

# Status regelmäßig prüfen
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent:status $SESSION_ID backend frontend mobile"
```

### Bereinigung in CI nach Tests

```bash
# Alle verwaisten Prozesse ohne Nachfrage bereinigen
oma cleanup --yes --json
```

### Workspace-bewusste Verifikation

```bash
# Jede Domäne in ihrem Workspace verifizieren
oma verify backend -w ./apps/api
oma verify frontend -w ./apps/web
oma verify mobile -w ./apps/mobile
```

### Retrospektive mit Vergleich für Sprint-Reviews

```bash
# Zwei-Wochen-Sprint-Retrospektive mit Vergleich zum vorherigen Sprint
oma retro 2w --compare

# Als JSON für Sprint-Bericht speichern
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Vollständiges Gesundheitscheck-Skript

```bash
#!/bin/bash
set -e

echo "=== oh-my-agent Gesundheitscheck ==="

# CLI-Installationen prüfen
oma doctor --json | jq -r '.clis[] | "\(.name): \(if .installed then "OK (\(.version))" else "FEHLT" end)"'

# Authentifizierungsstatus prüfen
oma auth:status --json | jq -r '.[] | "\(.name): \(.status)"'

# Metriken prüfen
oma stats --json | jq -r '"Sitzungen: \(.sessions), Aufgaben: \(.tasksCompleted)"'

echo "=== Fertig ==="
```

### Beschreibung für Agenten-Introspektion

```bash
# Ein KI-Agent kann verfügbare Befehle ermitteln
oma describe | jq '.command.subcommands[] | {name, description}'

# Details zu einem bestimmten Befehl abrufen
oma describe agent:spawn | jq '.command.options[] | {flags, description}'
```
