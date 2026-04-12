---
title: CLI-Befehle
description: Vollständige Referenz jedes oh-my-agent-CLI-Befehls — Syntax, Optionen, Beispiele, nach Kategorie geordnet.
---

# CLI-Befehle

Nach der globalen Installation (`bun install --global oh-my-agent`) stehen die Befehle `oma` oder `oh-my-agent` zur Verfügung. Für einmalige Nutzung ohne Installation kann `npx oh-my-agent` verwendet werden.

Die Umgebungsvariable `OH_MY_AG_OUTPUT_FORMAT` kann auf `json` gesetzt werden, um bei allen Befehlen, die dies unterstützen, maschinenlesbare Ausgabe zu erzwingen. Dies entspricht der Übergabe von `--json` an jeden einzelnen Befehl.

---

## Einrichtung und Installation

### oma (install)

Der Standardbefehl ohne Argumente startet den interaktiven Installer.

```
oma
```

**Funktionsweise:**
1. Prüft auf ein veraltetes `.agent/`-Verzeichnis und migriert es zu `.agents/`, falls vorhanden.
2. Erkennt konkurrierende Tools und bietet deren Entfernung an.
3. Fragt nach dem Projekttyp (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. Bei Auswahl von Backend wird nach der Sprachvariante gefragt (Python, Node.js, Rust, Other).
5. Fragt nach GitHub-Copilot-Symlinks.
6. Lädt das neueste Tarball aus der Registry herunter.
7. Installiert gemeinsame Ressourcen, Workflows, Konfigurationen und ausgewählte Skills.
8. Installiert Vendor-Anpassungen für alle Anbieter (Claude, Codex, Gemini, Qwen).
9. Erstellt CLI-Symlinks.
10. Bietet an, `git rerere` zu aktivieren.
11. Bietet an, MCP für Antigravity IDE und Gemini CLI zu konfigurieren.

**Beispiel:**
```bash
cd /path/to/my-project
oma
# Den interaktiven Eingabeaufforderungen folgen
```

### doctor

Gesundheitscheck für CLI-Installationen, MCP-Konfigurationen und Skill-Status.

```
oma doctor [--json] [--output <format>]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--json` | Ausgabe als JSON |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |

**Geprüft wird:**
- CLI-Installationen: gemini, claude, codex, qwen (Version und Pfad).
- Authentifizierungsstatus jeder CLI.
- MCP-Konfiguration: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Installierte Skills: welche Skills vorhanden sind und deren Status.

**Beispiele:**
```bash
# Interaktive Textausgabe
oma doctor

# JSON-Ausgabe für CI-Pipelines
oma doctor --json

# Per Pipe an jq für gezielte Prüfungen
oma doctor --json | jq '.clis[] | select(.installed == false)'
```

### update

Skills auf die neueste Version aus der Registry aktualisieren.

```
oma update [-f | --force] [--ci]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `-f, --force` | Benutzerdefinierte Konfigurationsdateien überschreiben (`oma-config.yaml`, `mcp.json`, `stack/`-Verzeichnisse) |
| `--ci` | Nicht-interaktiver CI-Modus (Eingabeaufforderungen überspringen, Klartextausgabe) |

**Funktionsweise:**
1. Ruft `prompt-manifest.json` aus der Registry ab, um die neueste Version zu prüfen.
2. Vergleicht mit der lokalen Version in `.agents/skills/_version.json`.
3. Beendet sich, falls bereits aktuell.
4. Lädt das neueste Tarball herunter und entpackt es.
5. Bewahrt benutzerdefinierte Dateien auf (außer bei `--force`).
6. Kopiert neue Dateien über `.agents/`.
7. Stellt aufbewahrte Dateien wieder her.
8. Aktualisiert Vendor-Anpassungen und erneuert Symlinks.

**Beispiele:**
```bash
# Standard-Update (Konfiguration bleibt erhalten)
oma update

# Erzwungenes Update (setzt alle Konfigurationen auf Standardwerte zurück)
oma update --force

# CI-Modus (keine Eingabeaufforderungen, keine Spinner)
oma update --ci

# CI-Modus mit erzwungenem Update
oma update --ci --force
```

---

## Überwachung und Metriken

### dashboard

Startet das Terminal-Dashboard zur Echtzeit-Agentenüberwachung.

```
oma dashboard
```

Keine Optionen. Überwacht `.serena/memories/` im aktuellen Verzeichnis. Rendert eine Rahmenzeichnungs-Oberfläche mit Sitzungsstatus, Agententabelle und Aktivitäts-Feed. Aktualisiert bei jeder Dateiänderung. Mit `Strg+C` beenden.

Das Memories-Verzeichnis kann über die Umgebungsvariable `MEMORIES_DIR` überschrieben werden.

**Beispiel:**
```bash
# Standardverwendung
oma dashboard

# Benutzerdefiniertes Memories-Verzeichnis
MEMORIES_DIR=/path/to/.serena/memories oma dashboard
```

### dashboard:web

Startet das Web-Dashboard.

```
oma dashboard:web
```

Startet einen HTTP-Server auf `http://localhost:9847` mit einer WebSocket-Verbindung für Live-Updates. Die URL im Browser öffnen, um das Dashboard anzuzeigen.

**Umgebungsvariablen:**

| Variable | Standard | Beschreibung |
|:---------|:--------|:-----------|
| `DASHBOARD_PORT` | `9847` | Port für den HTTP-/WebSocket-Server |
| `MEMORIES_DIR` | `{cwd}/.serena/memories` | Pfad zum Memories-Verzeichnis |

**Beispiel:**
```bash
# Standardverwendung
oma dashboard:web

# Benutzerdefinierter Port
DASHBOARD_PORT=8080 oma dashboard:web
```

### stats

Produktivitätsmetriken anzeigen.

```
oma stats [--json] [--output <format>] [--reset]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--json` | Ausgabe als JSON |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |
| `--reset` | Alle Metrikdaten zurücksetzen |

**Erfasste Metriken:**
- Anzahl der Sitzungen
- Verwendete Skills (mit Häufigkeit)
- Abgeschlossene Aufgaben
- Gesamte Sitzungszeit
- Geänderte Dateien, hinzugefügte Zeilen, entfernte Zeilen
- Zeitstempel der letzten Aktualisierung

Metriken werden in `.serena/metrics.json` gespeichert. Die Daten werden aus Git-Statistiken und Memory-Dateien erfasst.

**Beispiele:**
```bash
# Aktuelle Metriken anzeigen
oma stats

# JSON-Ausgabe
oma stats --json

# Alle Metriken zurücksetzen
oma stats --reset
```

### retro

Engineering-Retrospektive mit Metriken und Trends.

```
oma retro [window] [--json] [--output <format>] [--interactive] [--compare]
```

**Argumente:**

| Argument | Beschreibung | Standard |
|:---------|:-----------|:--------|
| `window` | Zeitfenster für die Analyse (z. B. `7d`, `2w`, `1m`) | Letzte 7 Tage |

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--json` | Ausgabe als JSON |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |
| `--interactive` | Interaktiver Modus mit manueller Eingabe |
| `--compare` | Aktuelles Zeitfenster mit dem vorherigen gleichlangen Zeitfenster vergleichen |

**Anzeige:**
- Tweet-taugliche Zusammenfassung (einzeilige Metriken)
- Zusammenfassungstabelle (Commits, geänderte Dateien, hinzugefügte/entfernte Zeilen, Mitwirkende)
- Trends im Vergleich zur letzten Retrospektive (falls vorheriger Snapshot vorhanden)
- Mitwirkenden-Rangliste
- Commit-Zeitverteilung (stündliches Histogramm)
- Arbeitssitzungen
- Aufschlüsselung der Commit-Typen (feat, fix, chore usw.)
- Hotspots (am häufigsten geänderte Dateien)

**Beispiele:**
```bash
# Letzte 7 Tage (Standard)
oma retro

# Letzte 30 Tage
oma retro 30d

# Letzte 2 Wochen
oma retro 2w

# Mit vorherigem Zeitraum vergleichen
oma retro 7d --compare

# Interaktiver Modus
oma retro --interactive

# JSON für Automatisierung
oma retro 7d --json
```

---

## Agenten-Verwaltung

### agent:spawn

Einen Subagenten-Prozess starten.

```
oma agent:spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>]
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `agent-id` | Ja | Agententyp. Einer von: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Ja | Aufgabenbeschreibung. Kann Inline-Text oder ein Dateipfad sein. |
| `session-id` | Ja | Sitzungskennung (Format: `session-YYYYMMDD-HHMMSS`) |

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `-m, --model <vendor>` | CLI-Vendor-Überschreibung: `gemini`, `claude`, `codex`, `qwen` |
| `-w, --workspace <path>` | Arbeitsverzeichnis für den Agenten. Wird automatisch aus der Monorepo-Konfiguration erkannt, wenn nicht angegeben. |

**Reihenfolge der Vendor-Auflösung:** `--model`-Flag > `agent_cli_mapping` in oma-config.yaml > `default_cli` > `active_vendor` in cli-config.yaml > `gemini`.

**Prompt-Auflösung:** Ist das Prompt-Argument ein Pfad zu einer vorhandenen Datei, wird deren Inhalt als Prompt verwendet. Andernfalls wird das Argument als Inline-Text verwendet. Vendor-spezifische Ausführungsprotokolle werden automatisch angehängt.

**Beispiele:**
```bash
# Inline-Prompt, Workspace automatisch erkennen
oma agent:spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# Prompt aus Datei, expliziter Workspace
oma agent:spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# Vendor auf Claude überschreiben
oma agent:spawn backend "Implement auth" session-20260324-143000 -m claude -w ./api

# Mobile-Agent mit automatisch erkanntem Workspace
oma agent:spawn mobile "Add biometric login" session-20260324-143000
```

### agent:status

Status eines oder mehrerer Subagenten prüfen.

```
oma agent:status <session-id> [agent-ids...] [-r <root>]
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `session-id` | Ja | Die zu prüfende Sitzungs-ID |
| `agent-ids` | Nein | Leerzeichengetrennte Liste von Agenten-IDs. Ohne Angabe keine Ausgabe. |

**Optionen:**

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `-r, --root <path>` | Stammpfad für Memory-Prüfungen | Aktuelles Verzeichnis |

**Statuswerte:**
- `completed` — Ergebnisdatei vorhanden (mit optionalem Status-Header).
- `running` — PID-Datei vorhanden und Prozess aktiv.
- `crashed` — PID-Datei vorhanden, aber Prozess beendet, oder weder PID- noch Ergebnisdatei gefunden.

**Ausgabeformat:** Eine Zeile pro Agent: `{agent-id}:{status}`

**Beispiele:**
```bash
# Bestimmte Agenten prüfen
oma agent:status session-20260324-143000 backend frontend

# Ausgabe:
# backend:running
# frontend:completed

# Prüfung mit benutzerdefiniertem Stammpfad
oma agent:status session-20260324-143000 qa -r /path/to/project
```

### agent:parallel

Mehrere Subagenten parallel ausführen.

```
oma agent:parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `tasks` | Ja | Entweder ein YAML-Aufgabendateipfad oder (mit `--inline`) Inline-Aufgabenspezifikationen |

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `-m, --model <vendor>` | CLI-Vendor-Überschreibung für alle Agenten |
| `-i, --inline` | Inline-Modus: Aufgaben als `agent:task[:workspace]`-Argumente angeben |
| `--no-wait` | Hintergrundmodus — Agenten starten und sofort zurückkehren |

**YAML-Aufgabendateiformat:**
```yaml
tasks:
  - agent: backend
    task: "Implement user API"
    workspace: ./api           # optional, wird automatisch erkannt wenn nicht angegeben
  - agent: frontend
    task: "Build user dashboard"
    workspace: ./web
```

**Inline-Aufgabenformat:** `agent:task` oder `agent:task:workspace` (Workspace muss mit `./` oder `/` beginnen).

**Ergebnisverzeichnis:** `.agents/results/parallel-{timestamp}/` enthält Logdateien für jeden Agenten.

**Beispiele:**
```bash
# Aus YAML-Datei
oma agent:parallel tasks.yaml

# Inline-Modus
oma agent:parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# Hintergrundmodus (kein Warten)
oma agent:parallel tasks.yaml --no-wait

# Vendor für alle Agenten überschreiben
oma agent:parallel tasks.yaml -m claude
```

### agent:review

Führt ein Code-Review mit einer externen KI-CLI durch (codex, claude, gemini oder qwen).

```
oma agent:review [-m <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `-m, --model <vendor>` | Zu verwendende CLI: `codex`, `claude`, `gemini`, `qwen`. Standardmäßig wird der aus der Konfiguration aufgelöste Vendor verwendet. |
| `-p, --prompt <prompt>` | Benutzerdefinierter Review-Prompt. Wird ein Standard-Code-Review-Prompt verwendet, wenn nicht angegeben. |
| `-w, --workspace <path>` | Zu prüfender Pfad. Standardmäßig das aktuelle Arbeitsverzeichnis. |
| `--no-uncommitted` | Review von nicht-committeten Änderungen überspringen. Wenn gesetzt, werden nur committete Änderungen der Sitzung geprüft. |

**Funktionsweise:**
- Erkennt die aktuelle Sitzungs-ID automatisch aus der Umgebung oder der jüngsten Git-Aktivität.
- Für `codex`: Verwendet den nativen `codex review`-Unterbefehl.
- Für `claude`, `gemini`, `qwen`: Erstellt eine prompt-basierte Review-Anfrage und ruft die CLI mit dem Review-Prompt auf.
- Standardmäßig werden nicht-committete Änderungen im Arbeitsverzeichnis geprüft.
- Mit `--no-uncommitted` wird das Review auf Änderungen beschränkt, die innerhalb der aktuellen Sitzung committet wurden.

**Beispiele:**
```bash
# Nicht-committete Änderungen mit Standard-Vendor prüfen
oma agent:review

# Review mit codex (verwendet nativen codex-review-Befehl)
oma agent:review -m codex

# Review mit claude und benutzerdefiniertem Prompt
oma agent:review -m claude -p "Focus on security vulnerabilities and input validation"

# Bestimmten Pfad prüfen
oma agent:review -w ./apps/api

# Nur committete Änderungen prüfen (Arbeitsverzeichnis überspringen)
oma agent:review --no-uncommitted

# Committete Änderungen in bestimmtem Workspace mit gemini prüfen
oma agent:review -m gemini -w ./apps/web --no-uncommitted
```

---

## Speicher-Verwaltung

### memory:init

Das Serena-Memory-Schema initialisieren.

```
oma memory:init [--json] [--output <format>] [--force]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--json` | Ausgabe als JSON |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |
| `--force` | Leere oder vorhandene Schemadateien überschreiben |

**Funktionsweise:** Erstellt die Verzeichnisstruktur `.serena/memories/` mit initialen Schemadateien, die von den MCP-Memory-Tools zum Lesen und Schreiben des Agentenstatus verwendet werden.

**Beispiele:**
```bash
# Memory initialisieren
oma memory:init

# Erzwungenes Überschreiben vorhandener Schemata
oma memory:init --force
```

---

## Integration und Hilfsprogramme

### auth:status

Authentifizierungsstatus aller unterstützten CLIs prüfen.

```
oma auth:status [--json] [--output <format>]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--json` | Ausgabe als JSON |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |

**Prüft:** Gemini (API-Schlüssel), Claude (API-Schlüssel oder OAuth), Codex (API-Schlüssel), Qwen (API-Schlüssel).

**Beispiele:**
```bash
oma auth:status
oma auth:status --json
```


### bridge

MCP-Stdio zu Streamable-HTTP-Transport überbrücken.

```
oma bridge [url]
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `url` | Nein | Die Streamable-HTTP-Endpunkt-URL (z. B. `http://localhost:12341/mcp`) |

**Funktionsweise:** Fungiert als Protokollbrücke zwischen dem MCP-Stdio-Transport (verwendet von Antigravity IDE) und dem Streamable-HTTP-Transport (verwendet vom Serena-MCP-Server). Dies ist erforderlich, da Antigravity IDE HTTP-/SSE-Transporte nicht direkt unterstützt.

**Architektur:**
```
Antigravity IDE <-- stdio --> oma bridge <-- HTTP --> Serena Server
```

**Beispiel:**
```bash
# Brücke zum lokalen Serena-Server
oma bridge http://localhost:12341/mcp
```

### verify

Subagenten-Ausgabe anhand erwarteter Kriterien verifizieren.

```
oma verify <agent-type> [-w <workspace>] [--json] [--output <format>]
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `agent-type` | Ja | Einer von: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**Optionen:**

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `-w, --workspace <path>` | Zu verifizierender Workspace-Pfad | Aktuelles Verzeichnis |
| `--json` | Ausgabe als JSON | |
| `--output <format>` | Ausgabeformat (`text` oder `json`) | |

**Funktionsweise:** Führt das Verifikationsskript für den angegebenen Agententyp aus und prüft Build-Erfolg, Testergebnisse und Scope-Konformität.

**Beispiele:**
```bash
# Backend-Ausgabe im Standard-Workspace verifizieren
oma verify backend

# Frontend in bestimmtem Workspace verifizieren
oma verify frontend -w ./apps/web

# JSON-Ausgabe für CI
oma verify backend --json
```

### cleanup

Verwaiste Subagenten-Prozesse und temporäre Dateien bereinigen.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--dry-run` | Anzeigen, was bereinigt würde, ohne Änderungen vorzunehmen |
| `-y, --yes` | Bestätigungsaufforderungen überspringen und alles bereinigen |
| `--json` | Ausgabe als JSON |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |

**Bereinigt wird:**
- Verwaiste PID-Dateien im System-Temp-Verzeichnis (`/tmp/subagent-*.pid`).
- Verwaiste Logdateien (`/tmp/subagent-*.log`).
- Gemini-Antigravity-Verzeichnisse (brain, implicit, knowledge) unter `.gemini/antigravity/`.

**Beispiele:**
```bash
# Vorschau der Bereinigung
oma cleanup --dry-run

# Bereinigung mit Bestätigungsaufforderungen
oma cleanup

# Alles ohne Nachfrage bereinigen
oma cleanup --yes

# JSON-Ausgabe für Automatisierung
oma cleanup --json
```

### visualize

Projektstruktur als Abhängigkeitsgraph visualisieren.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` ist ein eingebauter Alias für `visualize`.

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--json` | Ausgabe als JSON |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |

**Funktionsweise:** Analysiert die Projektstruktur und erzeugt einen Abhängigkeitsgraphen, der die Beziehungen zwischen Skills, Agenten, Workflows und gemeinsamen Ressourcen darstellt.

**Beispiele:**
```bash
oma visualize
oma viz --json
```

### star

oh-my-agent auf GitHub mit einem Stern markieren.

```
oma star
```

Keine Optionen. Erfordert die installierte und authentifizierte `gh`-CLI. Markiert das Repository `first-fluke/oh-my-agent` mit einem Stern.

**Beispiel:**
```bash
oma star
```

### describe

CLI-Befehle als JSON für Laufzeit-Introspektion beschreiben.

```
oma describe [command-path]
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `command-path` | Nein | Der zu beschreibende Befehl. Ohne Angabe wird das Stammprogramm beschrieben. |

**Funktionsweise:** Gibt ein JSON-Objekt mit Name, Beschreibung, Argumenten, Optionen und Unterbefehlen des Befehls aus. Wird von KI-Agenten verwendet, um die verfügbaren CLI-Fähigkeiten zu verstehen.

**Beispiele:**
```bash
# Alle Befehle beschreiben
oma describe

# Bestimmten Befehl beschreiben
oma describe agent:spawn

# Unterbefehl beschreiben
oma describe "agent:parallel"
```

### help

Hilfeinformationen anzeigen.

```
oma help
```

Zeigt den vollständigen Hilfetext mit allen verfügbaren Befehlen an.

### version

Versionsnummer anzeigen.

```
oma version
```

Gibt die aktuelle CLI-Version aus und beendet sich.

---

## Umgebungsvariablen

| Variable | Beschreibung | Verwendet von |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Auf `json` setzen, um JSON-Ausgabe bei allen Befehlen zu erzwingen, die dies unterstützen | Alle Befehle mit `--json`-Flag |
| `DASHBOARD_PORT` | Port für das Web-Dashboard | `dashboard:web` |
| `MEMORIES_DIR` | Pfad zum Memories-Verzeichnis überschreiben | `dashboard`, `dashboard:web` |

---

## Aliase

| Alias | Vollständiger Befehl |
|:------|:------------|
| `viz` | `visualize` |
