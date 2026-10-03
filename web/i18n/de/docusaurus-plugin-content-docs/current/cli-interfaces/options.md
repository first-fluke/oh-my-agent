---
title: "CLI-Optionen"
description: Vollständige Referenz aller CLI-Optionen mit globalen Flags, Ausgabesteuerung, befehlsspezifischen Optionen und praxisnahen Nutzungsmustern.
---

# CLI-Optionen

## Globale Optionen

Diese Optionen stehen beim Root-Befehl `oma` / `oh-my-agent` zur Verfügung:

| Flag | Beschreibung |
|:-----|:-----------|
| `-g, --global` | Arbeitet mit der HOME-Installation (`~/.agents/`) statt mit `<cwd>/.agents/` |
| `-y, --yes` | Überspringt Nachfragen, sofern der gewählte Befehl eine Bestätigung unterstützt; befehlsspezifische Sicherheitsprüfungen bleiben aktiv |
| `-V, --version` | Gibt die Versionsnummer aus und beendet sich |
| `-h, --help` | Zeigt die Hilfe für den Befehl an |

Alle Unterbefehle unterstützen ebenfalls `-h, --help`, um ihren spezifischen Hilfetext anzuzeigen.

`--global` setzt das Installationsstammverzeichnis für den gesamten Prozess. Daher verwenden `install`, `update`, `link` und `uninstall` unabhängig vom aktuellen Arbeitsverzeichnis immer `~/.agents/`. `OMA_HOME=<abs-path>` überschreibt diesen Wert — siehe [Globale Installation](../guide/global-install.md).

---

## Ausgabeoptionen {#output-options}

Viele Befehle unterstützen maschinenlesbare Ausgabe für CI/CD-Pipelines und Automatisierung. JSON-Ausgabe kann in dieser Reihenfolge angefordert werden:

### 1. --json-Flag

```bash
oma stats get --json
oma doctor --json
oma cleanup --json
```

Das `--json`-Flag ist nur für die einzelnen Pfade verfügbar, die es ausweisen. Leite die Unterstützung nicht aus einer Befehlsfamilie ab: Die Blätter von `image`, `video` und `slide` stellen beispielsweise dort `--output` bereit, wo die Registry es aufführt, während `search` einen eigenen JSON-Stream hat. Die Registry-Matrix am Ende dieser Seite ist die maßgebliche Liste pro Pfad.

### 2. --output-Flag

```bash
oma stats get --output json
oma doctor --output text
```

Das `--output`-Flag akzeptiert `text` oder `json`. Es bietet dieselbe Funktion wie `--json`, erlaubt aber auch, ausdrücklich Textausgabe anzufordern (nützlich, wenn die Umgebungsvariable auf json gesetzt ist, du für einen bestimmten Befehl aber Text brauchst).

**Validierung:** Bei einem ungültigen Format wirft die CLI den Fehler `Invalid output format: {value}. Expected one of text, json`.

### 3. Umgebungsvariable OH_MY_AG_OUTPUT_FORMAT

```bash
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get # outputs JSON
oma doctor # outputs JSON
oma retro # outputs JSON
```

Setze diese Umgebungsvariable auf `json`, um bei allen Befehlen, die dies unterstützen, JSON-Ausgabe zu erzwingen. Nur `json` wird erkannt; jeder andere Wert wird ignoriert und standardmäßig als Text behandelt.

**Auflösungsreihenfolge:** `--json`-Flag > `--output`-Flag > `OH_MY_AG_OUTPUT_FORMAT`-Umgebungsvariable > `text` (Standard).

### Befehle mit JSON-Ausgabe

| Befehl | `--json` | `--output` | Hinweise |
|:--------|:---------|:----------|:------|
| `doctor` | Yes | Yes | Enthält CLI-Prüfungen, MCP-Status und Skill-Status |
| `stats` | Yes | Yes | Vollständiges Metrikobjekt |
| `retro` | Yes | Yes | Snapshot mit Metriken, Autoren und Commit-Typen |
| `cleanup` | Yes | Yes | Liste der bereinigten Elemente |
| `auth status` | Yes | Yes | Authentifizierungsstatus pro CLI |
| `memory init` | Yes | Yes | Ergebnis der Initialisierung |
| `verify agent` / `verify triggers` | Yes | Yes | Verifikationsergebnisse pro Prüfung |
| `visualize` | Yes | Yes | Abhängigkeitsgraph als JSON |
| `describe` | Always JSON | N/A | Gibt immer JSON aus (Introspektionsbefehl) |
| `recap` | Yes | Yes | Konversationsverlauf pro Tool/Sitzung |
| `image generate` / `image doctor` / `image vendor list` | N/A | Yes | `--output json` verwenden; `vendor list` ist der kanonische Discovery-Pfad |
| `video generate` / `video doctor` / `video compose` / `video render` / `video provider list` | N/A | Yes | `--output json` für das Laufobjekt oder den Bereitschaftsbericht verwenden |
| `explain validate` | Yes | Yes | Validierungsbericht für Artefakte |
| `diagram resolve` / `diagram update` | Yes | Yes | Auflösung der Engine oder Ergebnis des verwalteten Caches |
| `market resolve` / `market update` | Yes | Yes | Status der verwalteten Research-Engine |
| `docs verify` / `docs sync` / `docs i18n` / `docs lint` | Yes | N/A | Jeder Docs-Pfad verwendet seine eigenen Berichtsoptionen |
| `search ...` | Always JSON | N/A | Alle `search`-Unterbefehle streamen JSON; mit `--pretty` wird die Ausgabe lesbarer formatiert |

---

## Optionen pro Befehl

### install

```
oma install [--web-search <provider>] [--code-intelligence <provider>] [--semantic-memory <provider>] [--honcho-url <url>] [--honcho-workspace <id>]
```

Der interaktive Installer schreibt die ausgewählten Provider-Einstellungen nach `.agents/oma-config.yaml`. Die Provider-Flags wählen die Integrationen für Websuche, Codeintelligenz und semantischen Speicher; `--honcho-url` und `--honcho-workspace` konfigurieren den Honcho-Speicherdienst, wenn dieser Provider ausgewählt ist. Das Root-Flag `-y, --yes` gilt, wenn ein Installationsablauf eine Bestätigung anfordert.

### doctor

```
oma doctor [--json] [--output <format>] [--profile]
```

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--json` | Gibt JSON statt formatiertem Text aus. | `false` |
| `--output <format>` | Explizites Ausgabeformat (`text` oder `json`). Siehe [Ausgabeoptionen](#output-options). | `text` |
| `--profile` | Zeigt die Profil-Gesundheitsmatrix (aufgelöster Modell-Slug, CLI und Authentifizierungsstatus pro Agent aus dem aktiven `model_preset` und den `agents:`-Überschreibungen). Siehe [Agentenmodelle](../guide/per-agent-models.md). | `false` |

### update

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
oma update mcp [-y | --yes] [--ci] [--all] [--vendor <vendors>]
```

| Flag | Kurz | Beschreibung | Standard |
|:-----|:------|:-----------|:--------|
| `--force` | `-f` | Überschreibt benutzerdefinierte Konfigurationsdateien während des Updates. Betrifft: `oma-config.yaml`, `mcp.json` und `stack/`-Verzeichnisse. Ohne dieses Flag werden die Dateien vor dem Update gesichert und danach wiederhergestellt. | `false` |
| `--with-new-skills` | | Installiert Skills, die seit der aktuellen Installation zur Registry hinzugekommen sind. | `false` |
| `--ci` | | Führt den nicht-interaktiven CI-Modus aus. Überspringt alle Bestätigungsdialoge und verwendet einfache Konsolenausgabe statt Spinner und Animationen. Für CI/CD-Pipelines ohne verfügbares stdin erforderlich. | `false` |
| `--yes` | `-y` | Überspringt Nachfragen. Erstellt keine fehlenden Vendor-Verzeichnisse, sofern nicht zusätzlich `--all` oder `--vendor` angegeben ist. | `false` |
| `--all` | | Erstellt oder aktualisiert alle unterstützten projektbezogenen Vendoren. | `false` |
| `--vendor <vendors>` | | Erstellt oder aktualisiert eine durch Kommas getrennte Vendor-Liste, zum Beispiel `claude,qwen`. | Nur vorhandene Vendor-Verzeichnisse |

`oma update mcp` verwendet beim Auswählen von Browser-MCP-Servern dieselben Steuerungen `--yes`, `--ci`, `--all` und `--vendor`. Es verwendet weder `--force` noch `--with-new-skills`.

**Verhalten mit --force:**
- `oma-config.yaml` wird durch den Registry-Standard ersetzt.
- `mcp.json` wird durch den Registry-Standard ersetzt.
- Das Backend-`stack/`-Verzeichnis (sprachspezifische Ressourcen) wird ersetzt.
- Alle anderen Dateien werden unabhängig von diesem Flag immer aktualisiert.

**Verhalten mit --ci:**
- Beim Start kein `console.clear()`.
- `@clack/prompts` wird durch einfaches `console.log` ersetzt.
- Die Erkennung konkurrierender Tools wird übersprungen.
- Fehler werden geworfen, statt `process.exit(1)` aufzurufen.

**Vendor-Geltungsbereich:**
- `oma update` aktualisiert nur bereits vorhandene Vendor-Verzeichnisse.
- `oma update --yes` verwendet denselben Vendor-Geltungsbereich ohne Nachfragen.
- `oma update --all` erstellt oder aktualisiert alle unterstützten projektbezogenen Vendoren.
- `oma update --vendor claude,qwen` erstellt oder aktualisiert nur die angegebenen Vendoren.

### stats

```
oma stats get [--json] [--output <format>]
oma stats reset
```

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--json` | Gibt das Ergebnis des Zurücksetzens als JSON aus. | `false` |
| `--output <format>` | Gibt `text` oder `json` aus. | `text` |

`oma stats reset` ist der Befehl zum Zurücksetzen. Die frühere Schreibweise `oma stats get --reset` gehört nicht zur aktuellen öffentlichen Oberfläche.

### retro

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--interactive` | Interaktiver Modus mit manueller Dateneingabe. Fragt nach zusätzlichem Kontext, der nicht aus Git gewonnen werden kann (z. B. Stimmung oder bemerkenswerte Ereignisse). | `false` |
| `--compare` | Vergleicht das aktuelle Zeitfenster mit dem vorherigen Zeitfenster gleicher Länge. Zeigt Delta-Metriken an (z. B. Commits +12, hinzugefügte Zeilen -340). | `false` |

**Format des Zeitfensterarguments:**
- `7d`: 7 Tage
- `2w`: 2 Wochen
- `1m`: 1 Monat
- Für den Standardwert (7 Tage) weglassen

### cleanup

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

| Flag | Kurz | Beschreibung | Standard |
|:-----|:------|:-----------|:--------|
| `--dry-run` | | Vorschaumodus. Listet alle zu bereinigenden Elemente auf, nimmt aber keine Änderungen vor. Der Exit-Code ist unabhängig von den Funden 0. | `false` |
| `--yes` | `-y` | Überspringt alle Bestätigungsdialoge. Bereinigt alles ohne Nachfrage. Nützlich in Skripten und CI. | `false` |

**Bereinigt werden:**
1. Verwaiste PID-Dateien: `/tmp/subagent-*.pid`, wenn der referenzierte Prozess nicht mehr läuft.
2. Verwaiste Logdateien: `/tmp/subagent-*.log`, die zu beendeten PIDs gehören.
3. Gemini-Antigravity-Verzeichnisse: `.gemini/antigravity/brain/`, `.gemini/antigravity/implicit/`, `.gemini/antigravity/knowledge/`. Dort sammelt sich mit der Zeit Zustand an, der viel Speicher belegen kann.

### agent spawn

```
oma agent spawn <agent-id> <prompt> <session-id> [options]
```

| Flag | Kurz | Beschreibung | Standard |
|:-----|:------|:-----------|:--------|
| `--resumed-from` | — | Verknüpft einen Wiederholungsversuch mit der vorherigen Lauf-ID. | |
| `--fallback-vendors` | — | Explizite, geordnete und durch Kommas getrennte Fallback-Vendor-Kette. | |
| `--task-id` | — | Aufgaben-ID aus dem Sitzungsplan. | Agent-ID |
| `--vendor` | — | CLI-Vendor-Überschreibung. Die Laufzeit akzeptiert `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok` oder `pi`. | Aus Konfiguration aufgelöst |
| `--workspace` | `-w` | Arbeitsverzeichnis des Agenten. Wenn es weggelassen oder auf `.` gesetzt wird, erkennt die CLI den Workspace anhand von Monorepo-Konfigurationsdateien (pnpm-workspace.yaml, package.json, lerna.json, nx.json, turbo.json, mise.toml) automatisch. | Automatisch erkannt oder `.` |
| `--isolation` | — | Isolationsmodus: `worktree` erstellt pro Start ein Git-Worktree; der Standard ist `none`. | `none` |
| `--read-only` | — | Beschränkt den gestarteten Agenten auf nicht-destruktive Tools und unterdrückt Auto-Approve-Flags. | `false` |

**Validierung:**
- `agent-id` muss einer von `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` sein.
- `session-id` darf `..`, `?`, `#`, `%` oder Steuerzeichen nicht enthalten.
- `vendor` muss einer von `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi` sein.

**Vendor-spezifisches Verhalten:**

| Vendor | Befehl | Auto-Approve-Flag | Prompt-Flag |
|:-------|:--------|:-----------------|:-----------|
| antigravity | `agy` | `--dangerously-skip-permissions` | `-p` |
| claude | `claude` | (keines) | `-p` |
| codex | `codex` | `--sandbox workspace-write` | (keines; Prompt ist positionell) |
| cursor | `cursor-agent` | vendor-spezifisch | `-p` |
| opencode | `opencode` | vendor-spezifisch | `-p` |
| qwen | `qwen` | `--yolo` | `-p` |
| grok | `grok` | vendor-spezifisch | `-p` |
| pi | `pi` | im `--read-only`-Modus unterdrückt | Prompt ist positionell |

Diese Standards können in `.agents/skills/oma-orchestration/config/cli-config.yaml` überschrieben werden.

### agent status

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

| Flag | Kurz | Beschreibung | Standard |
|:-----|:------|:-----------|:--------|
| `--root` | `-r` | Stammverzeichnis zum Auffinden von Memory-Dateien (`.agents/state/memories/result-{agent}.md`) und PID-Dateien. | Aktuelles Arbeitsverzeichnis |

**Logik der Statusbestimmung:**
1. Wenn `.agents/state/memories/result-{agent}.md` existiert, wird der Header `## Status:` gelesen. Ohne Header wird `completed` gemeldet.
2. Wenn die PID-Datei `/tmp/subagent-{session-id}-{agent}.pid` existiert, wird geprüft, ob die PID aktiv ist. Bei aktiver PID wird `running`, bei beendeter PID `crashed` gemeldet.
3. Wenn keine der beiden Dateien existiert, wird `crashed` gemeldet.

### agent parallel

```
oma agent parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

| Flag | Kurz | Beschreibung | Standard |
|:-----|:------|:-----------|:--------|
| `--vendor` | — | CLI-Vendor-Überschreibung für alle gestarteten Agenten. | Pro Agent aus der Konfiguration aufgelöst |
| `--inline` | `-i` | Interpretiert Aufgabenargumente als Zeichenketten im Format `agent:task[:workspace]` statt als Dateipfad. | `false` |
| `--no-wait` | | Hintergrundmodus. Startet alle Agenten und kehrt sofort zurück, ohne auf den Abschluss zu warten. PID-Liste und Logs werden unter `.agents/results/parallel-{timestamp}/` gespeichert. | `false` (wartet auf Abschluss) |

**Format für Inline-Aufgaben:** `agent:task` oder `agent:task:workspace`
- Der Workspace wird erkannt, indem geprüft wird, ob das letzte durch Doppelpunkt getrennte Segment mit `./` oder `/` beginnt oder `.` entspricht.
- Beispiel: `backend:Implement auth API:./api` — agent=backend, task="Implement auth API", workspace=./api.
- Beispiel: `frontend:Build login page` — agent=frontend, task="Build login page", workspace=automatisch erkannt.

**Format der YAML-Aufgabendatei:**
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

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--window <period>` | Zeitfenster: `1d`, `3d`, `7d`, `2w`, `30d`. Wird ignoriert, wenn `--date` gesetzt ist. | `1d` |
| `--date <date>` | Bestimmtes Datum (`YYYY-MM-DD`). Hat Vorrang vor `--window`. | |
| `--tool <tools>` | Filtert Sitzungen nach Tool. Durch Kommas getrennt: `grok`, `claude`, `codex`, `qwen`, `cursor`, `antigravity`. | alle Tools |
| `--top <n>` | Zeigt nur die N wichtigsten Projekte oder Themen in der Zusammenfassung. | unbegrenzt |
| `--sort <metric>` | Sortiert Sitzungen nach `count` oder `duration`. | `count` |
| `--mermaid` | Gibt statt der Standardzusammenfassung ein Mermaid-Gantt-Diagramm aus. | `false` |
| `--graph` | Öffnet einen interaktiven Graphen im Browser. Ist mit `--mermaid` nicht kombinierbar. | `false` |

> **Hinweis:** Das Erzeugen von Vendor-Regeldateien (z. B. `.cursor/rules`) aus den installierten Skills übernimmt [`oma link <vendor>`](./commands.md#link), nicht ein separater `export`-Befehl.

### search

```
oma search <subcommand> [...]
```

Die Gruppe `search` liefert einen eigenen JSON-Output (keine Flags `--json` / `--output`). Verwende bei URL- und Abfrage-Unterbefehlen `--pretty`, um Ergebnisse formatiert auszugeben, und beachte die folgenden unterbefehlspezifischen Optionen:

| Unterbefehl | Wichtige Optionen |
|:-----------|:---------------|
| `fetch <url>` | `--only`, `--skip`, `--include-archive`, `--timeout`, `--locale`, `--pretty` |
| `api <url>` / `meta <url>` / `rss <url>` / `archive <url>` | `--timeout`, `--locale`, `--pretty` |
| `api:search <query>` | `--platforms <list>`, `--timeout`, `--locale`, `--pretty` |
| `rss:google <query>` | `--locale` (Standard `en-US`) |
| `media <url>` | `--subs`, `--sub-lang <list>` (Standard `en`), `--format <spec>`, `--timeout` (Standard `30`), `--pretty` |
| `code <query>` | `--host <github\|gitlab>` (Standard `github`), `--language`, `--repo`, `--limit` (Standard `20`), `--pretty` |
| `trust <domain>` | `--pretty` |
| `doctor` | keine (prüft Binärdateien für Chrome / `python3 curl_cffi` / `yt-dlp` / `gh`) |

**Exit-Codes:** `0` ok, `1` Fehler, `2` blockiert, `3` nicht gefunden, `4` ungültige Eingabe, `5` Authentifizierung erforderlich, `6` Zeitüberschreitung. Verwende sie in Skripten, um vorübergehende Blockaden von ungültigen Eingaben zu unterscheiden.

### image

```
oma image <subcommand> [...]
```

Das Ausgabeformat wird pro Unterbefehl über `--output <text|json>` gesteuert.

`image generate` akzeptiert:

| Flag | Kurz | Beschreibung | Standard |
|:-----|:------|:-----------|:--------|
| `--vendor <name>` | | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all`. `auto` wird aus der aktiven `image:`-Konfiguration und der verfügbaren Authentifizierung aufgelöst. | `auto` |
| `--size <size>` | | `WxH`, wobei beide Kanten durch 16 teilbar und 16–3840 lang sein müssen, mit einem Seitenverhältnis von 1:3–3:1, oder `auto`. | Vendor-Standard |
| `--quality <level>` | | `low` \| `medium` \| `high` \| `auto`. | Vendor-Standard |
| `--count <n>` | `-n` | Anzahl der Bilder, 1..5. | `1` |
| `--output-dir <dir>` | | Ausgabeverzeichnis. Muss innerhalb von `$PWD` liegen, sofern nicht `--allow-external-output` gesetzt ist. | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | | Erlaubt Pfade von `--output-dir` außerhalb von `$PWD`. | `false` |
| `--model <name>` | | Vendor-spezifische Modellüberschreibung. Das Antigravity-Modell wird von `agy` ausgewählt. | Vendor-Standard |
| `--timeout <duration>` | | Zeitüberschreitung pro Bild als Duration-Wert. | Vendor-Standard |
| `--reference <path>` | `-r` | Referenzbild zur Übernahme von Stil oder Motiv. Wiederholbar (`-r a.png -r b.png`) oder durch Kommas getrennt. Validierung: Größe (≤5MB), Format (PNG/JPEG/GIF/WebP anhand der Magic Bytes) und Anzahl (≤10). Unterstützt von `codex` und `antigravity`; mit Exit 4 bei `pollinations` abgelehnt. | |
| `--yes` | `-y` | Überspringt die Kostenbestätigung. | `false` |
| `--no-prompt-in-manifest` | | Speichert den SHA256-Hash des Prompts statt des Klartexts in `manifest.json`. | `false` |
| `--dry-run` | | Gibt Plan und Kostenschätzung aus, führt aber nichts aus. | `false` |
| `--output <format>` | | `text` \| `json`. | `text` |

`image doctor` und `image vendor list` akzeptieren `--output <text|json>`. `image list-vendors` bleibt ein Hilfealias; `vendor list` ist der kanonische Discovery-Pfad.

### video

```
oma video generate <brief...> [options]
oma video doctor [--output <format>] [--install|--upgrade|--install-mpt|--install-strudel]
oma video compose <run-dir> [--output <format>] [--refresh] [--offline]
oma video render <run-dir> [--output <format>]
oma video provider list [--output <format>]
```

`video generate` akzeptiert die Steuerungen für Planung und Aufnahme `--mode`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor`, `--capture`, `--source`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` und `--capture-stop`. Außerdem werden `--output-dir`, `--allow-external-output`, `--max-usd`, `--seed`, `--timeout`, `--script`, `--dry-run`, `--yes`, `--output` und `--no-brief-in-manifest` akzeptiert. Browseraufnahmen verwenden `--source web --url <url>`; `file` ist die Standardsource. Für einen normalen Renderlauf braucht es eine verfasste Composition und einen funktionierenden Compositor; Platzhalter sind auf den Testpfad `OMA_VIDEO_MOCK=1` beschränkt.

`video doctor` meldet oder provisioniert die Remotion/MPT/Strudel-Toolchain. `compose` bereitet den Composition-Vertrag des Laufs vor, `render` führt Typechecks aus, rendert und prüft die Ausgabe. `provider list` meldet Provider- und Schlüsselstatus. Siehe [Videogenerierung](../guide/video-generation.md) für Laufmanifest und Wiederherstellungsablauf.

### memory init

```
oma memory init [--json] [--output <format>] [--force]
```

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--force` | Überschreibt leere oder vorhandene Schemadateien in `.agents/state/memories/`. Ohne dieses Flag werden vorhandene Dateien nicht verändert. | `false` |

### verify

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

| Flag | Kurz | Beschreibung | Standard |
|:-----|:------|:-----------|:--------|
| `--workspace` | `-w` | Pfad zum zu verifizierenden Workspace-Verzeichnis. | Aktuelles Arbeitsverzeichnis |

**Agententypen:** `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm`.

`verify triggers` misst die Genauigkeit des Keyword-Detektors anhand eines beschrifteten Prompt-Korpus. Die prozentualen Schwellenwerte sind Gates; verwende JSON-Ausgabe, wenn ein CI-Job einzelne Befunde prüfen muss. Die alte Schreibweise `oma verify <agent-type>` ist eine kompatible Hilfeform; `verify agent` ist der registrierte Pfad.

---

## Praxisbeispiele

### CI-Pipeline: Update und Verifikation

```bash
# Update in CI mode, then run doctor to verify installation
oma update --ci
oma doctor --json | jq '.healthy'
```

### Automatisierte Metrikerfassung

```bash
# Collect metrics as JSON and pipe to a monitoring system
export OH_MY_AG_OUTPUT_FORMAT=json
oma stats get | curl -X POST -H "Content-Type: application/json" -d @- https://metrics.example.com/api/v1/push
```

### Stapelweise Agentenausführung mit Statusüberwachung

```bash
# Start agents in background
oma agent parallel tasks.yaml --no-wait

# Check status periodically
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
watch -n 5 "oma agent status $SESSION_ID backend frontend mobile"
```

### Bereinigung in CI nach Tests

```bash
# Clean up all orphaned processes without prompts
oma cleanup --yes --json
```

### Workspacebezogene Verifikation

```bash
# Verify each domain in its workspace
oma verify agent backend -w ./apps/api
oma verify agent frontend -w ./apps/web
oma verify agent mobile -w ./apps/mobile
```

### Retrospektive mit Vergleich für Sprint-Reviews

```bash
# Two-week sprint retro with comparison to previous sprint
oma retro 2w --compare

# Save as JSON for sprint report
oma retro 2w --json > sprint-retro-$(date +%Y%m%d).json
```

### Vollständiges Gesundheitscheckskript

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

### Describe zur Agentenintrospektion

```bash
# An AI agent can discover available commands
oma describe | jq '.command.subcommands[] | {name, description}'

# Get details about a specific command
oma describe "agent spawn" | jq '.command.options[] | {flags, description}'
```

## Vollständige öffentliche Optionsregistry

Die folgende Matrix wird aus der eingecheckten öffentlichen Befehlsregistry erzeugt. Sie dient als Abdeckungsindex für diese Seite: Eine Zeile mit `—` hat keine befehlsspezifischen Optionen; gemeinsame Root-Flags und Hilfealiase werden oben beschrieben. Führe `oma describe "<path>"` aus, um die Laufzeithilfe zu prüfen, wenn sich eine Wertsyntax ändert.

| Befehlspfad | Öffentliche Optionen | Zweck |
|---|---|---|
| `install` | `--web-search <provider>, --code-intelligence <provider>, --semantic-memory <provider>, --honcho-url <url>, --honcho-workspace <id>` | oh-my-agent-Skills und Konfigurationen installieren |
| `describe` | `—` | CLI-Befehle zur Laufzeitintrospektion als JSON beschreiben |
| `uninstall` | `--dry-run, -y, --yes` | Von oh-my-agent verwaltete Dateien entfernen (bewahrt oma-config.yaml, mcp.json und benutzerdefinierte Skills) |
| `update` | `-f, --force, --with-new-skills, --ci, -y, --yes, --all, --vendor <vendors>` | Skills auf die neueste Registry-Version aktualisieren |
| `update mcp` | `-y, --yes, --ci, --all, --vendor <vendors>` | Browser-MCP-Server auswählen (Aside, Chrome DevTools, Firefox DevTools) |
| `link` | `--dry-run` | Vendor-Dateien (`.claude/`, `.cursor/` usw.) aus der SSOT `.agents/` neu erzeugen |
| `intel` | `—` | Produktintelligenz-Pipeline: Recherche, Lücken, PRD und Issue-Vorschlag |
| `intel suggest` | `--config <path>, --topic <topic>, --target <target>, --repos <repos>, --since <window>, --last-commits <n>, --output-dir <path>, --dry-run, --fixture <path>, --create-issue, --base-repo <owner/name>, --yes, --json, --output <format>` | Aus Markt- und Codeintelligenz wertvolle Produktarbeit vorschlagen |
| `market` | `—` | Marktrecherche zu Community-Signalen über die stets aktuelle last30days-Engine |
| `market detect-trap` | `--force` | Vorabprüfung, die Keyword-Trap-Abfragen ablehnt |
| `market resolve` | `--refresh, --offline, --json, --output <format>` | Die von oma ausgeführte last30days-Engine (verwaltet aktuell, fest angeheftet oder lokale Kopie) und das verwendete Python melden |
| `market update` | `--json, --output <format>` | Die neueste last30days-Version in den verwalteten oma-Cache (`~/.cache/oma-market/last30days`) herunterladen |
| `market run` | `—` | Die last30days-Engine (`scripts/last30days.py`) mit den angegebenen Argumenten ausführen; `--save-dir` verwendet standardmäßig `market.save_dir` |
| `doctor` | `--profile, --heal-check <agentType>, --json, --output <format>` | CLI-Installationen, MCP-Konfigurationen und Skill-Status prüfen |
| `profile` | `—` | Lokale OMA-Ausführungsprofile verwalten |
| `profile list` | `--json, --output <format>` | Lokale Profile auflisten |
| `profile show` | `--json, --output <format>` | Ein lokales Profil anzeigen |
| `profile create` | `--json, --output <format>` | Ein lokales Profil erstellen |
| `profile use` | `--shell <shell>, --json, --output <format>` | Shell-Code zur Aktivierung eines vorhandenen Profils ausgeben |
| `profile run` | `—` | Einen Befehl mit `OMA_PROFILE` für den Kindprozess ausführen |
| `retro` | `--interactive, --compare, --json, --output <format>` | Engineering-Retrospektive mit Metriken und Trends |
| `recap` | `--window <period>, --date <date>, --tool <tools>, --top <n>, --sort <metric>, --mermaid, --graph, --json, --output <format>` | Konversationsverlauf aus KI-Tools zusammenfassen |
| `docs` | `—` | Dokumentationsdrift erkennen: Referenzen prüfen und Aktualisierungen für diff-betroffene Dokumente vorschlagen |
| `docs verify` | `--json, --report-file <path>, --no-urls, --urls-sync` | L2-Referenzen aus Dokumenten extrahieren und defekte Ziele melden. Erzeugt nebenbei `docs/generated/doc-refs.json` neu. Exit-Code: 0 = sauber, 1 = defekte Referenzen gefunden. Die URL-Prüfung übernimmt `lychee` (Installation: brew install lychee). |
| `docs sync` | `--json` | Bei einem Git-Diff Dokumente auflisten, die geänderte Dateien referenzieren. Das Host-LLM liest diese Liste mit dem Diff und schlägt gemäß dem SKILL.md-Vertrag Patches vor — die CLI bearbeitet Dokumente nie automatisch. Standard-Diffbereich: `--cached` (gestagte Änderungen), Fallback auf `HEAD~1..HEAD`. |
| `docs i18n` | `--json, --min-severity <level>` | Drift zwischen englischen Quelldokumenten (`web/docs`) und i18n-Übersetzungen (`web/i18n/{lang}/...`) erkennen. Gibt pro Paar strukturelle Signale (Zeilenanzahl, Überschriftenanzahl, Zeitpunkt des letzten Commits) aus, damit das Host-LLM entscheidet, welche Übersetzungen einen Diff-Sync-Patch brauchen. Die CLI bearbeitet Übersetzungen nie. |
| `docs lint` | `--json, --locales <list>` | Übersetzte Dokumente auf inhaltliche Anti-Pattern prüfen (z. B. Gedankenstriche in CJK-Zielen). Ergänzt `oma docs i18n` (struktureller Drift) durch Stil- und Anti-Pattern-Prüfungen gemäß oma-translation SKILL.md § Stage 4. Die CLI behebt nichts automatisch, sondern meldet nur Probleme für eine Umstrukturierung durch das Host-LLM. |
| `emit` | `--target <target>, --output-dir <path>, --json, --output <format>` | Standardkonforme Artefakte aus der SSOT `.agents/` erzeugen (Agent-Skills-Spezifikation, Agent-Plugins-Paket, Claude-Code-Plugin-Marktplatz, AGENTS.md, an `cli/` gebundene Vendor-Dokumente) |
| `cleanup` | `--dry-run, -y, --yes, --json, --output <format>` | Verwaiste Subagent-Prozesse und temporäre Dateien bereinigen |
| `bridge` | `--context <name>` | MCP-stdio an einen gemeinsamen Serena-Server pro Projekt weiterleiten (wird bei Bedarf gestartet) |
| `verify` | `—` | Subagent-Ausgabe prüfen (backend/frontend/mobile/qa/debug/pm) oder die Genauigkeit des Keyword-Detektors messen |
| `verify agent` | `-w, --workspace <path>, --json, --output <format>` |  |
| `verify triggers` | `--corpus <path>, --max-false-fire <pct>, --max-missed-fire <pct>, --json, --output <format>` | Genauigkeit der Keyword-Detektor-Auslösung anhand eines beschrifteten Prompt-Korpus messen |
| `vault` | `—` | API-Schlüssel und Geheimnisse im OS-Schlüsselbund verwalten (macOS Keychain / Linux Secret Service / Windows Credential Manager) |
| `vault store` | `--value <value>` | Ein Geheimnis unter `<name>` speichern (interaktive Passworteingabe) |
| `vault get` | `—` | Gespeicherten Wert nach stdout ausgeben (für: export KEY=$(oma vault get <name>)) |
| `vault list` | `--json` | Gespeicherte Geheimnisnamen auflisten (Werte werden nie angezeigt) |
| `vault delete` | `—` | Ein Geheimnis aus Schlüsselbund und Index entfernen |
| `star` | `—` | oh-my-agent auf GitHub mit einem Stern versehen |
| `visualize` | `--focus <node-or-path>, --affected <paths...>, --json, --output <format>` | Projektstruktur als Abhängigkeitsgraph visualisieren |
| `search` | `—` | Mechanische Suchprimitive — fetch, meta, rss, media, trust, code |
| `search providers` | `--json, --pretty` | Registrierte Suchprovider auflisten und Auswahl ohne Netzwerkzugriff prüfen |
| `search web` | `--provider <id>, --limit <n>, --timeout <duration>, --json, --pretty` | Mit dem ausgewählten Webprovider suchen (Brave hat einen CLI-Adapter) |
| `search fetch` | `--only <strategies>, --skip <strategies>, --include-archive, --timeout <duration>, --locale <value>, --pretty` | Eine URL über eine automatisch eskalierende Strategiepipeline abrufen |
| `search meta` | `--timeout <duration>, --locale <value>, --pretty` | OGP / JSON-LD / Schema.org aus einer URL extrahieren |
| `search media` | `--subs, --sub-lang <list>, --format <spec>, --timeout <duration>, --pretty` | Medienmetadaten über yt-dlp extrahieren (1858 Websites) |
| `search archive` | `--timeout <duration>, --locale <value>, --pretty` | Über AMP / archive.today / Wayback abrufen |
| `search trust` | `--pretty` | Vertrauensstufe oder Score für eine Domain auflösen |
| `search code` | `--host <github\|gitlab>, --language <lang>, --repo <owner/repo>, --limit <n>, --pretty` | Code über gh / glab durchsuchen |
| `search doctor` | `—` | Abhängigkeiten prüfen (Chrome, python3 curl_cffi, yt-dlp, gh) |
| `search api` | `—` |  |
| `search api fetch` | `--timeout <duration>, --locale <value>, --pretty` | Über den passenden Plattform-API-Handler abrufen (Phase 0) |
| `search api search` | `--platforms <list>, --timeout <duration>, --locale <value>, --pretty` | Schlüsselwortsuche über mehrere unterstützte Plattformen verteilen |
| `search rss` | `—` |  |
| `search rss fetch` | `--timeout <duration>, --locale <value>, --pretty` | RSS-/Atom-Feed für eine URL entdecken und parsen |
| `search rss google` | `--locale <value>` | Google-News-RSS-URL für eine Abfrage erzeugen |
| `harness` | `—` | OMA-Harness-Overlays gegen isolierte Repository-Aufgaben auswerten |
| `harness eval` | `--suite <path>, --candidate <path>, --mock, --live, --record, --record-file <path>, --yes, --timeout <duration>, --require-coverage, --json, --output <format>` | Ein `.agents`-Overlay-Kandidat mit der aktuellen Baseline vergleichen |
| `slide` | `—` | HTML-Präsentationstoolkit — 1920×1080-Slide-Decks erstellen, validieren, exportieren und bearbeiten |
| `slide validate` | `--workspace <path>, --output <format>, --slide <file>, --report-file <path>` | Geometrisches Qualitätsgate — rendert Slides über puppeteer-core und prüft Überlauf, Überlappung und Schriftgröße |
| `slide bundle` | `--workspace <path>, --output-file <path>, --inline-fonts` | Slide-Dateien zu einem einzelnen eigenständigen `.html`-Ausgabedokument zusammenführen |
| `slide edit` | `--workspace <path>, --port <n>` | Browser-Bounding-Box-Editor öffnen (node:http-Server unter 127.0.0.1, Weiterleitung an den oma-Agenten-Runner) |
| `slide doctor` | `—` | Erforderliche Abhängigkeiten (chrome, puppeteer-core) und optionale Abhängigkeiten (yt-dlp, pptxgenjs) prüfen |
| `slide create` | `--output-dir <path>, --force` | Neues Slide-Arbeitsverzeichnis mit Start-HTML, `assets/` und `meta.json` anlegen |
| `slide preview` | `--workspace <path>` | `viewer.html` erzeugen (deck-stage-Webkomponente und Speaker-Notes-Panel, mit `n` umschalten) |
| `slide export` | `—` |  |
| `slide export pdf` | `--workspace <path>, --output-file <path>, --mode <mode>` | Slides über puppeteer-core als PDF exportieren |
| `slide export png` | `--workspace <path>, --output-dir <path>, --resolution <res>` | Jede Slide über puppeteer-core als PNG-Bild exportieren |
| `slide export pptx` | `--workspace <path>, --output-file <path>` | [EXPERIMENTAL] Über pptxgenjs als PPTX exportieren (rasterbasiert, Verläufe gerastert) |
| `slide import` | `—` |  |
| `slide import pptx` | `--workspace <path>` | Eine `.pptx`-Datei über officeparser in Slide-Fragmente importieren (bunx, best effort) |
| `slide asset` | `—` |  |
| `slide asset fetch-video` | `--workspace <path>, --output-name <name>` | Video über yt-dlp nach `./assets/` herunterladen und lokale Referenz ausgeben |
| `slide style` | `—` | Designstil-Presets durchsuchen und abrufen |
| `slide style list` | `—` | Verfügbare Stil-Presets auflisten (vendored + bold-template-Index) |
| `slide style preview` | `—` | Ein Stil-Preset im Terminal anzeigen |
| `slide style get` | `--refresh` | Ein Bold-Template-`design.md` abrufen (immer aktuelles main; für Offline-Fallback zwischengespeichert) |
| `scholar` | `—` | Paper-Sidecars von Knows.academy (OpenAlex- und Semantic-Scholar-Fallbacks) |
| `scholar search` | `--limit <n>, --year-min <year>, --always-fallback` | Papers suchen (knows.academy → OpenAlex → Semantic Scholar) |
| `scholar resolve` | `—` | Beste Paper-Übereinstimmung über knows.academy, OpenAlex und Semantic Scholar finden |
| `scholar get` | `--section <name>` | Ein Sidecar (knows record_id) oder Werkmetadaten abrufen (W-ID, DOI, arXiv:<id>, CorpusId:<n>, S2 paperId) |
| `scholar lint` | `--lenient, --fail-on-warning` | Ein `.knows.yaml`- oder `.knows.json`-Sidecar validieren (v0.9.0) |
| `image` | `—` | Authentifizierungsbewusste parallele KI-Bildgenerierung über mehrere Vendoren |
| `image generate` | `--vendor <name>, --size <size>, --quality <level>, -n, --count <n>, --output-dir <path>, --allow-external-output, --model <name>, --timeout <duration>, -r, --reference <path>, -y, --yes, --no-prompt-in-manifest, --dry-run, --output <format>` | Bilder über pollinations (flux/zimage, kostenlos), codex (gpt-image-2, ChatGPT-OAuth) oder antigravity (Gemini nano-banana über `agy`-CLI, kostenlos mit Gemini-Code-Assist-Anmeldung) erzeugen |
| `image doctor` | `--output <format>` | Authentifizierungs- und Installationsstatus pro Vendor prüfen |
| `image vendor` | `—` |  |
| `image vendor list` | `--output <format>` | Registrierte Vendoren und unterstützte Modelle auflisten |
| `video` | `—` | Kurzvideos, Erklärvideos und Demo-Videos erzeugen |
| `video generate` | `--mode <mode>, --aspect <aspect>, --locale <lang>, --captions <style>, --visual <mode>, --voice <profile>, --music <mode>, --duration <sec>, --compositor <name>, --capture <path>, --source <kind>, --url <url>, --device <name>, --ready-selector <css>, --show-cursor, --polish, --capture-timeout <sec>, --capture-stop <mode>, --output-dir <path>, --allow-external-output, --max-usd <n>, --seed <n>, --timeout <duration>, -y, --yes, --dry-run, --script <path>, --output <format>, --no-brief-in-manifest` | Ein Video-Laufverzeichnis aus einem Brief erzeugen |
| `video doctor` | `--output <format>, --install, --upgrade, --install-mpt, --install-strudel` | Bereitschaft von Videoprovider und Compositor prüfen |
| `video compose` | `--output <format>, --refresh, --offline` | Das Remotion-Projekt eines Laufs mit aktueller Toolchain und remotion-dev/skills vorbereiten; den Authoring-Vertrag ausgeben |
| `video render` | `--output <format>` | Ein Laufverzeichnis anhand von render-spec.json erneut rendern |
| `video provider` | `—` |  |
| `video provider list` | `--output <format>` | Videoprovider und Verfügbarkeit auflisten |
| `serena` | `—` | Serena-MCP-Lifecycle-Hilfsprogramme für den Sprachserver |
| `serena reap` | `--dry-run, --quiet` | Inaktive Serena-LSP-Kinder beenden, um Speicher freizugeben (Serena heilt sich beim nächsten Toolaufruf selbst) |
| `serena reaper` | `—` |  |
| `serena reaper enable` | `--dry-run` | Periodische geplante Serena-Reaper-Aufgabe installieren (läuft alle 5 Minuten) |
| `serena reaper disable` | `--dry-run` | Periodische geplante Serena-Reaper-Aufgabe deinstallieren |
| `explain` | `—` | Werkzeuge für Artefaktverwaltung und Qualitätsvalidierung erklären |
| `explain validate` | `--input-dir <path>, --output <format>, --report-file <path>, --json` | Eigenständige Explain-HTML-Berichtsartefakte validieren |
| `diagram` | `—` | Hilfsfunktionen für Diagramm-Engines (interaktives archify-HTML oder Mermaid-Fallback) |
| `diagram resolve` | `--engine <engine>, --refresh, --offline, --json, --output <format>` | Melden, welche Diagramm-Engine Workflows verwenden sollen und wo archify liegt |
| `diagram update` | `--json, --output <format>` | Die neueste archify-Version in den verwalteten oma-Cache (`~/.cache/oma-diagram/archify`) laden |
| `diagram archify` | `—` | Die installierte archify-CLI ausführen (doctor \| guide \| validate \| deliver \| visual-check …), mit deaktivierten Update-Prüfungen |
| `help` | `—` | Hilfeinformationen anzeigen |
| `version` | `—` | Versionsnummer anzeigen |
| `dashboard` | `—` |  |
| `dashboard terminal` | `—` | Terminal-Dashboard starten (Echtzeit-Agentenüberwachung) |
| `dashboard web` | `—` | Web-Dashboard unter http://127.0.0.1:9847 starten |
| `auth` | `—` |  |
| `auth status` | `--json, --output <format>` | Authentifizierungsstatus aller unterstützten CLIs prüfen |
| `hook` | `—` |  |
| `hook run` | `--vendor <v>, --event <e>, --matcher <m>` | Ein Vendor-Hook-Event über den zentralen oma-Hook-Router auslösen (Design 019) |
| `hook probe` | `--vendor <list>, --output <format>, --hooks-dir <dir>` | L1-Hook-Kompatibilität pro Vendor prüfen und eine Matrix ausgeben (D63) |
| `state` | `—` |  |
| `state emit` | `--session-id <id>, --category <category>, --vendor <vendor>, --vendor-sid <vendorSid>, --parent-event-id <eventId>, --causality-key <key>, --ts <iso>, --no-mirror, --json, --output <format>` | Ein OMA-L1-Workflow-Event anhängen |
| `state migrate` | `--include-active, --dry-run, --json, --output <format>` | Veraltete Sitzungen ins Home-Profil migrieren und verifizierte Originale entfernen |
| `state get` | `--json, --output <format>` | Einen OMA-L1-Workflowstatus anhand der ID prüfen |
| `state list` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | OMA-L1-Workflowstatus prüfen |
| `state repair` | `--dry-run, --json, --output <format>` | OMA-L1-Workflowstatusdateien reparieren |
| `state verify` | `--workflow <workflow>, --checkpoint <checkpoint>, --session-id <id>, --category <category>, --no-emit-missing, --json, --output <format>` | Erforderliche L1-Events für einen Workflow-Checkpoint verifizieren |
| `state decisions` | `—` |  |
| `state decisions list` | `--json, --output <format>` | Erforderliche `decision.made`-L1-Checkpoints auflisten |
| `state inject-log` | `—` |  |
| `state inject-log list` | `--entry <file>, --json, --output <format>` | Injection-Audit-Logs pro Grenze auflisten oder anzeigen (D52) |
| `state inject-log get` | `--json, --output <format>` | Injection-Audit-Logs pro Grenze auflisten oder anzeigen (D52) |
| `state summary` | `--category <category>, --json, --output <format>` | Eine Sitzungszusammenfassung in den Coordination Store exportieren |
| `state heal-check` | `--agent <agentType>, --json, --output <format>` | Prüfen, ob Self-Healing für einen Agenten zulässig ist |
| `state activate` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | OMA-L1-Workflowstatus prüfen |
| `state archive` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | OMA-L1-Workflowstatus prüfen |
| `state purge` | `--category <category>, --archived, --all-projects, --project <project>, --search <text>, --older-than <duration>, --dry-run, --json, --output <format>` | OMA-L1-Workflowstatus prüfen |
| `ralph` | `—` |  |
| `ralph verify` | `--session-id <id>, --newer-than <iso>, --no-emit, --json, --output <format>` | Ralph-EXEC-Artefakte verifizieren (Anti-Umgehungs-Gate, ralph.md Schritt 1.3) |
| `goal` | `—` |  |
| `goal set` | `--workflow <name>, --session-id <id>, --gate <keyword>, --budget-minutes <n>, --description <text>, --json, --output <format>` | Einen Zielvertrag (deterministisches Stop-Gate / Zeitbudget) an einen aktiven persistenten Workflow anhängen |
| `stats` | `—` |  |
| `stats get` | `--json, --output <format>` | Produktivitätsmetriken anzeigen |
| `stats reset` | `--json, --output <format>` | Produktivitätsmetriken anzeigen |
| `agent` | `—` |  |
| `agent context` | `--project-root <path>, --difficulty <level>` | Graphausgewählten Kontext für einen nativen Dispatch-Prompt laden |
| `agent resume` | `--project-root <path>, --dry-run, --max-attempts <count>` | Sichere unvollständige Aufgaben fortsetzen und die aktuelle Abnahme-Evidenz wiederverwenden |
| `agent begin` | `--project-root <path>, -w, --workspace <path>` | Einen evidenzbasierten nativen Agentenlauf starten |
| `agent verify` | `--project-root <path>, --required, --affected <paths...>` | Verifikations-argv nach `--` ausführen und den echten Exit-Code aufzeichnen |
| `agent finish` | `--project-root <path>` | Ein natives Agentenergebnis anhand seiner Verifikationsbelege validieren |
| `agent spawn` | `--resumed-from <run-id>, --fallback-vendors <vendors>, --task-id <id>, --vendor <vendor>, -w, --workspace <path>, --isolation <mode>, --read-only` | Einen Subagenten starten (Prompt kann Inline-Text oder Dateipfad sein) |
| `agent status` | `--project-root <path>` | Status von Subagenten prüfen |
| `agent parallel` | `--session-id <id>, --vendor <vendor>, -i, --inline, --no-wait` | Mehrere Subagenten parallel ausführen |
| `agent review` | `--vendor <vendor>, -p, --prompt <prompt>, -w, --workspace <path>, --no-uncommitted` | Code-Review mit externer CLI ausführen (codex/claude/qwen/grok) |
| `model` | `—` |  |
| `model check` | `--json, --fail-on-drift, --owner <name>, --probe` | Modellregistry mit den Live-Modelllisten der Vendoren vergleichen |
| `model probe` | `--json, --timeout <duration>` | Einen Modell-Slug über die Vendor-CLI prüfen, um seine Akzeptanz zu verifizieren |
| `model propose` | `--json, --owner <name>, --write, --timeout <duration>` | Intern `model check --probe` ausführen und für akzeptierte Kandidaten einen `oma-config`-Patch `models:` erzeugen |
| `memory` | `—` |  |
| `memory keys` | `--kind <kind>, --profile <name>, --key-env <name>, --from-env <name>, --dry-run, --json, --output <format>` | Honcho-Verbindung oder lokale Embedding-Anmeldedaten konfigurieren |
| `memory init` | `--force, --json, --output <format>` | Coordination Store in `.agents/state/memories` initialisieren |
| `memory setup` | `--endpoint <url>, --port <port>, --install, --start, --dry-run, --json, --output <format>` | AgentMemory-Endpunktkonfiguration vorbereiten |
| `memory daemon` | `—` | Einen von OMA verwalteten AgentMemory-Daemonprozess verwalten |
| `memory daemon status` | `--json, --output <format>` | Daemonstatus anzeigen |
| `memory daemon start` | `--port <port>, --dry-run, --json, --output <format>` | AgentMemory im Hintergrund starten |
| `memory daemon stop` | `--dry-run, --json, --output <format>` | Den von OMA verwalteten AgentMemory-Daemon anhalten |
| `memory daemon restart` | `--port <port>, --dry-run, --json, --output <format>` | Den von OMA verwalteten AgentMemory-Daemon neu starten |
| `memory service` | `—` | AgentMemory-Integration als OS-Dienst verwalten |
| `memory service install` | `--port <port>, --dry-run, --json, --output <format>` | AgentMemory-launchd/systemd-Dienstintegration installieren |
| `memory service uninstall` | `--dry-run, --json, --output <format>` | AgentMemory-launchd/systemd-Dienstintegration deinstallieren |
| `memory status` | `--json, --output <format>` | Gesundheitsstatus des ausgewählten Providers für semantischen Speicher anzeigen |
| `memory retry` | `—` |  |
| `memory retry drain` | `--dry-run, --json, --output <format>` | Wartende AgentMemory-Observe-Wiederholungen abarbeiten |
| `memory import` | `--source <source>, --since <since>, --dry-run, --force-partial, --json, --output <format>` | Gesprächsverlauf aus Vendoren in AgentMemory importieren |
| `memory maintain` | `--keep <count>, --dry-run, --json, --output <format>` | Lokalen AgentMemory-Speicher pflegen: sichern, bereinigen, vakuumieren |
| `memory maintain backup` | `--keep <count>, --dry-run, --json, --output <format>` | Lokalen AgentMemory-Speicher pflegen: sichern, bereinigen, vakuumieren |
| `memory maintain prune` | `--keep <count>, --dry-run, --json, --output <format>` | Lokalen AgentMemory-Speicher pflegen: sichern, bereinigen, vakuumieren |
| `memory maintain vacuum` | `--keep <count>, --dry-run, --json, --output <format>` | Lokalen AgentMemory-Speicher pflegen: sichern, bereinigen, vakuumieren |
| `memory gc` | `--scope <scope>, --keep <count>, --max-age <duration>, --dry-run, --json, --output <format>` | Projektspeicher bereinigen: alte L1-Sitzungen und temporäre Serena-Dateien entfernen |
| `memory upgrade` | `--port <port>, --dry-run, --json, --output <format>` | AgentMemory stoppen, sichern, aktualisieren, neu starten und Gesundheitsstatus prüfen |
| `skill` | `—` | Installierte Skills prüfen und auditieren |
| `skill audit` | `--json, --output <format>` | Ähnlichkeit von Frontmatter-Beschreibungen installierter Skills prüfen |
| `skill lint` | `--skill <id>, --json, --output <format>` | Autorierungsprobleme pro Skill erkennen (Frontmatter, Struktur, defekte Referenzen) |
| `skill eval` | `--skill <id>, --mock, --live, --record, --yes, --task-dir <path>, --max-tasks <n>, --require-coverage, --neg-transfer, --json, --output <format>` | Nutzwert eines Skills messen (Treatment gegenüber Baseline bei zurückgehaltenen Aufgaben) |
| `skill optimize` | `--skill <id>, --dry-run, --apply, --mock, --live, --max-epochs <n>, --edits-per-epoch <k>, --lr <chars>, --yes, --json, --output <format>` | `SKILL.md` eines Skills optimieren, um den gemessenen Nutzwert bei zurückgehaltenen Aufgaben zu maximieren |
| `schedule` | `—` |  |
| `schedule create` | `--cron <expr>, --every <phrase>, --vendor <vendor>, -w, --workspace <path>, --once, --expires-after <duration>, --env <keys>, --dry-run, --accept-rounded` | Einen geplanten Agentenjob registrieren |
| `schedule list` | `--json, --output <format>` | Geplante Jobs mit OS-Driftstatus (synced/missing-in-os/orphan-in-os) nach Projekt gruppiert auflisten |
| `schedule delete` | `—` | Einen geplanten Job aus Manifest und OS-Scheduler entfernen |
| `schedule run` | `—` | Einen geplanten Job anhand seiner ID ausführen (vom OS-Scheduler aufgerufen; normalerweise nicht direkt) |
| `schedule sync` | `--prune` | Manifest und OS-Scheduler erneut synchronisieren. Mit `--prune` verwaiste OS-Jobs entfernen. |
