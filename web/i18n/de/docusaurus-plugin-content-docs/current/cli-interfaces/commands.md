---
title: "CLI-Befehle"
description: Vollständige Referenz aller oh-my-agent-CLI-Befehle mit Syntax, Optionen und Beispielen, nach Kategorien geordnet.
---

# CLI-Befehle

Nach der globalen Installation (`bun install --global oh-my-agent`) kannst du `oma` oder `oh-my-agent` verwenden. Für eine einmalige Nutzung ohne Installation führe `npx oh-my-agent` aus.

Die Umgebungsvariable `OH_MY_AG_OUTPUT_FORMAT` kann auf `json` gesetzt werden, um bei allen Befehlen, die dies unterstützen, maschinenlesbare Ausgabe zu erzwingen. Dies entspricht der Übergabe von `--json` an jeden einzelnen Befehl.

## Mit einer Aufgabe beginnen

Wähle den kleinsten Befehl, der deine Frage beantwortet. Jeder unten aufgeführte Befehl gibt einen Pfad oder Bericht aus, den du prüfen kannst, bevor du mit dem nächsten Schritt fortfährst.

| Aufgabe | Hier beginnen | Erwartetes Ergebnis |
|:-----|:-----------|:----------------|
| Ein Projekt installieren oder reparieren | `oma install` und dann `oma doctor` | Installierte Ressourcen und ein Gesundheitsbericht; verwende `oma doctor --profile`, wenn es um die Modellauflösung geht. |
| Einen Befehl oder eine Option aus einem Agenten herausfinden | `oma describe` oder `oma describe "image generate"` | JSON mit Argumenten, Optionen und verschachtelten Befehlen. |
| Ein Bild erzeugen | `oma image generate "<prompt>" --output json` | Bildpfade und ein Manifest unter `.agents/results/images/`. |
| Ein Video planen oder rendern | `oma video generate "<brief>" --dry-run` | Ein Laufverzeichnis mit Planungsartefakten; Composition und Render erst nach dem Authoring ausführen. |
| Einen interaktiven Code-Explainer erstellen | `/explain` | Ein validiertes eigenständiges HTML-Artefakt unter `.agents/results/explain/`. |
| Eine Diagramm-Engine auflösen | `oma diagram resolve --output json` | Die ausgewählte Mermaid- oder archify-Engine und ihre Begründung. |
| Community-Signale recherchieren | `oma market detect-trap "<topic>"` | Ein Vorabprüfungsergebnis; fahre nur bei bestandenem Gate mit `oma market resolve --output json` und dem Upstream-Lauf fort. |
| Ein Paper konvertieren oder prüfen | `oma scholar search "<query>"` | Suchergebnisse von Knows, OpenAlex oder Semantic Scholar; ein Sidecar mit `oma scholar get` abrufen. |
| Ein Slide-Deck erstellen | `oma slide create --output-dir <dir>` | Ein Arbeitsverzeichnis, das erstellt, validiert, gebündelt und exportiert werden kann. |
| Dokumentationsdrift prüfen | `oma docs verify --json` | Ein strukturierter Bericht über defekte Referenzen und ein neu erzeugter Referenzindex. |

Die eingecheckte Registry ist die Quelle für diese Befehlsübersicht. Die kanonischen Discovery-Namen unten stammen aus `oma describe`; die interaktive Hilfe kann Kompatibilitätsaliase wie `slide new`, `slide viewer`, `image list-vendors` oder `video list-providers` anzeigen.

## Aktuelle Befehlsoberfläche

Diese Übersicht hält die ausführlichen Referenzen unten überschaubar und macht seltener verwendete Familien auffindbar. Verwende für die genaue Argumentgrammatik das jeweilige `--help` oder `oma describe <path>`; [CLI-Optionen](./options.md) enthält die vollständige Flag-Matrix der Registry.

| Familie | Registrierte Pfade |
|:-------|:-----------------|
| `install` | `install` |
| `describe` | `describe` |
| `uninstall` | `uninstall` |
| `update` | `update`, `update mcp` |
| `link` | `link` |
| `intel` | `intel`, `intel suggest` |
| `market` | `market`, `market detect-trap`, `market resolve`, `market update`, `market run` |
| `doctor` | `doctor` |
| `profile` | `profile`, `profile list`, `profile show`, `profile create`, `profile use`, `profile run` |
| `retro` | `retro` |
| `recap` | `recap` |
| `docs` | `docs`, `docs verify`, `docs sync`, `docs i18n`, `docs lint` |
| `emit` | `emit` |
| `cleanup` | `cleanup` |
| `bridge` | `bridge` |
| `verify` | `verify`, `verify agent`, `verify triggers` |
| `vault` | `vault`, `vault store`, `vault get`, `vault list`, `vault delete` |
| `star` | `star` |
| `visualize` | `visualize` |
| `search` | `search`, `search providers`, `search web`, `search fetch`, `search meta`, `search media`, `search archive`, `search trust`, `search code`, `search doctor`, `search api`, `search api fetch`, `search api search`, `search rss`, `search rss fetch`, `search rss google` |
| `harness` | `harness`, `harness eval` |
| `slide` | `slide`, `slide validate`, `slide bundle`, `slide edit`, `slide doctor`, `slide create`, `slide preview`, `slide export`, `slide export pdf`, `slide export png`, `slide export pptx`, `slide import`, `slide import pptx`, `slide asset`, `slide asset fetch-video`, `slide style`, `slide style list`, `slide style preview`, `slide style get` |
| `scholar` | `scholar`, `scholar search`, `scholar resolve`, `scholar get`, `scholar lint` |
| `image` | `image`, `image generate`, `image doctor`, `image vendor`, `image vendor list` |
| `video` | `video`, `video generate`, `video doctor`, `video compose`, `video render`, `video provider`, `video provider list` |
| `serena` | `serena`, `serena reap`, `serena reaper`, `serena reaper enable`, `serena reaper disable` |
| `explain` | `explain`, `explain validate` |
| `diagram` | `diagram`, `diagram resolve`, `diagram update`, `diagram archify` |
| `help` | `help` |
| `version` | `version` |
| `dashboard` | `dashboard`, `dashboard terminal`, `dashboard web` |
| `auth` | `auth`, `auth status` |
| `hook` | `hook`, `hook run`, `hook probe` |
| `state` | `state`, `state emit`, `state migrate`, `state get`, `state list`, `state repair`, `state verify`, `state decisions`, `state decisions list`, `state inject-log`, `state inject-log list`, `state inject-log get`, `state summary`, `state heal-check`, `state activate`, `state archive`, `state purge` |
| `ralph` | `ralph`, `ralph verify` |
| `goal` | `goal`, `goal set` |
| `stats` | `stats`, `stats get`, `stats reset` |
| `agent` | `agent`, `agent context`, `agent resume`, `agent begin`, `agent verify`, `agent finish`, `agent spawn`, `agent status`, `agent parallel`, `agent review` |
| `model` | `model`, `model check`, `model probe`, `model propose` |
| `memory` | `memory`, `memory keys`, `memory init`, `memory setup`, `memory daemon`, `memory daemon status`, `memory daemon start`, `memory daemon stop`, `memory daemon restart`, `memory service`, `memory service install`, `memory service uninstall`, `memory status`, `memory retry`, `memory retry drain`, `memory import`, `memory maintain`, `memory maintain backup`, `memory maintain prune`, `memory maintain vacuum`, `memory gc`, `memory upgrade` |
| `skill` | `skill`, `skill audit`, `skill lint`, `skill eval`, `skill optimize` |
| `schedule` | `schedule`, `schedule create`, `schedule list`, `schedule delete`, `schedule run`, `schedule sync` |

Wenn ein Befehl seine übrigen Argumente an ein anderes Tool delegiert, lässt die Registry seine Optionen absichtlich offen. Das gilt für `market run` und `diagram archify`; lies die aufgelöste Upstream-Hilfe, bevor du eine ändernde oder netzwerkgebundene Operation ausführst.

---

## Einrichtung und Installation {#setup-installation}

### install

`oma` ohne Argumente startet den interaktiven Installer. `oma install` ist die explizite Form und akzeptiert Optionen zur Providerauswahl.

```
oma
oma install
oma install --web-search native --code-intelligence gortex --semantic-memory agent-memory
```

`--web-search`, `--code-intelligence` und `--semantic-memory` behalten die gespeicherte Providerauswahl bei, wenn sie weggelassen werden. `--honcho-url` und `--honcho-workspace` konfigurieren eine neue Honcho-Verbindung, wenn dieser Provider ausgewählt ist. Das Root-Flag `-y, --yes` überspringt Nachfragen und verwendet Standardwerte; `--global` zielt auf die HOME-Installation.

**Funktionsweise:**
1. Prüft auf ein veraltetes `.agent/`-Verzeichnis und migriert es zu `.agents/`, falls vorhanden.
2. Erkennt konkurrierende Tools und bietet deren Entfernung an.
3. Fragt nach dem Projekttyp (All, Fullstack, Frontend, Backend, Mobile, DevOps, Custom).
4. Wenn Backend ausgewählt ist, fragt nach der Sprachvariante (Python, Node.js, Rust, Other).
5. Fragt nach GitHub-Copilot-Symlinks.
6. Lädt das neueste Tarball aus der Registry herunter.
7. Installiert gemeinsame Ressourcen, Workflows, Konfigurationen und ausgewählte Skills.
8. Installiert Vendor-Anpassungen für die ausgewählten Vendoren (projektspezifische Einstellungen; keine stillen Vendor-Schreibvorgänge auf HOME-Ebene).
9. Erstellt CLI-Symlinks.
10. Bietet die empfohlene **globale** Git-Konfiguration zur optionalen Bestätigung an:
    - `rerere.enabled=true` — Wiederverwendung von Merge-Konfliktlösungen in Multi-Agenten-Projekten
    - `init.defaultBranch=main` — einheitlicher Standardbranch für neue Repositories
    - Unter `--yes` / CI vollständig übersprungen (gibt stattdessen Hinweise zur manuellen Behebung aus)
11. Bietet die Konfiguration von MCP an, wo dies zutrifft.
12. Fragt nach einem GitHub-Stern, wenn `gh` authentifiziert ist.

**Beispiel:**
```bash
cd /path/to/my-project
oma
# Follow the interactive prompts
```

### doctor {#doctor}

Gesundheitscheck für CLI-Installationen, MCP-Konfigurationen und den Skill-Status.

```
oma doctor [--json] [--output <format>] [--profile]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--json` | Ausgabe als JSON |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |
| `--profile` | Profil-Gesundheitsmatrix anzeigen. Zeigt den aufgelösten Modell-Slug, die CLI und den Authentifizierungsstatus pro Agent aus dem aktiven `model_preset` und den `agents:`-Überschreibungen. Siehe [Agentenmodelle](../guide/per-agent-models.md). |

**Geprüft wird:**
- CLI-Installationen: agy, claude, codex, qwen (Version und Pfad).
- Authentifizierungsstatus jeder CLI.
- MCP-Konfiguration: `~/.gemini/settings.json`, `~/.claude.json`, `~/.codex/config.toml`.
- Installierte Skills: welche Skills vorhanden sind und welchen Status sie haben.
- Memory-Store-Verzeichnis: Vorhandensein und Dateianzahl von `.agents/state/memories/` (ältere Projekte verwenden ersatzweise den veralteten Pfad `.serena/memories/`).
- Marker für doppelte Installationen (Projekt gegenüber global) und zugehörige Warnungen.
- Empfohlene **globale** Git-Konfiguration (`gitRecommended` in JSON):
  - `rerere.enabled=true`
  - `init.defaultBranch=main`
  - Jede Abweichung zählt zu `totalIssues`.
- Projektbezogene Vendor-Kontextdateien (z. B. `CLAUDE.md` / `AGENTS.md`-OMA-Blöcke, wenn die passende CLI installiert ist).
- AgentMemory-, State-/Hook-Gesundheit, Serena-Reaper-Diagnose und zugehörige Problemzähler.

**Automatische Reparatur:** Werden fehlende Skills erkannt, bietet `doctor` deren interaktive Installation an. Fehlt die empfohlene Git-Konfiguration oder ist sie falsch, werden dieselben optionalen globalen Korrekturen wie bei install/update angeboten.

**Beispiele:**
```bash
# Interactive text output
oma doctor

# JSON output for CI pipelines
oma doctor --json

# Pipe to jq for specific checks
oma doctor --json | jq '.clis[] | select(.installed == false)'

# Inspect the profile resolution matrix
oma doctor --profile
```

### update

Skills auf die neueste Version aus der Registry aktualisieren.

```
oma update [-f | --force] [--with-new-skills] [--ci] [-y | --yes] [--all] [--vendor <vendors>]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `-f, --force` | Benutzerdefinierte Konfigurationsdateien (`oma-config.yaml`, `mcp.json`, `stack/`-Verzeichnisse) überschreiben |
| `--with-new-skills` | In dieser Version neue Skills installieren; ohne das Flag werden nur bereits installierte Skills aktualisiert. |
| `--ci` | Nicht-interaktiven CI-Modus ausführen (Nachfragen überspringen, Klartextausgabe) |
| `-y, --yes` | Nachfragen überspringen. Der Vendor-Geltungsbereich bleibt unverändert: Nur vorhandene Vendor-Verzeichnisse werden aktualisiert, sofern nicht `--all` oder `--vendor` angegeben ist. |
| `--all` | Alle unterstützten projektbezogenen Vendoren erstellen oder aktualisieren. |
| `--vendor <vendors>` | Bestimmte Vendoren erstellen oder aktualisieren. Akzeptiert eine durch Kommas getrennte Liste wie `claude,qwen`. |

**Funktionsweise:**
1. Ruft `prompt-manifest.json` aus der Registry ab, um die neueste Version zu prüfen.
2. Vergleicht sie mit der lokalen Version in `.agents/skills/_version.json`.
3. Beendet sich, falls bereits die aktuelle Version installiert ist.
4. Lädt das neueste Tarball herunter und entpackt es.
5. Bewahrt benutzerdefinierte Dateien auf (außer bei `--force`).
6. Kopiert neue Dateien über `.agents/`.
7. Stellt aufbewahrte Dateien wieder her.
8. Aktualisiert Vendor-Anpassungen und erneuert Symlinks. Standardmäßig werden nur Vendor-Verzeichnisse berührt, die bereits im Projekt vorhanden sind.
9. Bietet die empfohlene **globale** Git-Konfiguration an (dieselbe optionale Einstellung wie bei install: `rerere.enabled`, `init.defaultBranch`). Unter `--yes` / `--ci` wird sie übersprungen.

**Beispiele:**
```bash
# Standard update (preserves config)
oma update

# Force update (resets all config to defaults)
oma update --force

# CI mode (no prompts, no spinners)
oma update --ci

# CI mode with force
oma update --ci --force

# Update existing vendors without prompts
oma update --yes

# Create/update every supported project-scoped vendor
oma update --all

# Create/update only Claude and Qwen integrations
oma update --vendor claude,qwen

# Also refresh browser MCP selections
oma update mcp --ci
```

`oma update mcp` besitzt eigene Optionen `--yes`, `--ci`, `--all` und `--vendor <vendors>`. Damit werden unterstützte Browser-MCP-Server (Aside, Chrome DevTools oder Firefox DevTools) für die ausgewählten projektbezogenen Vendoren ausgewählt.

### uninstall

Von OMA verwaltete Dateien im ausgewählten Installationsstamm anzeigen oder entfernen:

```
oma uninstall --dry-run
oma uninstall --yes
```

`--dry-run` listet die Entfernungen auf, ohne Dateien zu ändern. `--yes` überspringt die Bestätigungsabfrage. Der Befehl bewahrt `oma-config.yaml`, `mcp.json` und benutzerdefinierte Skills gemäß der registrierten Befehlsbeschreibung. Wenn die Vorschau eine Datei enthält, die du noch brauchst, halte an und bewahre die Dry-Run-Ausgabe zur Prüfung auf.

### link {#link}

Vendor-native Dateien aus der SSOT `.agents/` neu erzeugen, ohne neu zu installieren.

```
oma link [vendors...] [--global]
```

**Beispiele:**

```bash
# Regenerate all configured vendors
oma link

# Regenerate only Claude and Codex files
oma link claude codex

# Regenerate the HOME install (~/.agents/) from any directory
oma link opencode --global
```

Ohne `--global` zielt link auf `<cwd>/.agents/`; mit `--global` auf `~/.agents/` (oder `OMA_HOME`). Siehe [Globale Installation](../guide/global-install.md).

**Funktionsweise:**
1. Erzeugt Vendor-native Agentendateien aus `.agents/agents/` neu.
2. Aktualisiert Hooks und lokale Einstellungen für die ausgewählten Vendoren.
3. Erzeugt Integrationsblöcke in `CLAUDE.md`, `GEMINI.md` oder `AGENTS.md` neu.
4. Aktualisiert die Cursor-MCP-Verknüpfung und CLI-Skill-Symlinks, wenn relevant.

Verwende den Befehl nach Änderungen an `.agents/agents/`, `.agents/workflows/`, `.agents/rules/` oder Hook-Definitionen.

**Modellverhalten:**
- Native Dispatches innerhalb desselben Vendors verwenden das im erzeugten Vendor-Agentenfile definierte Modell.
- Externe Fallback-Dispatches verwenden den `default_model` des jeweiligen Vendors aus `.agents/skills/oma-orchestration/config/cli-config.yaml`.

**Dispatch-Verhalten:**
- Entspricht der Ziel-Vendor der aktuellen Laufzeit und unterstützt diese Laufzeit native Rollenagenten, verwendet OMA nativen Dispatch.
- Andernfalls fällt OMA auf `oma agent spawn` zurück.

### setup (Workflow)

Der `/setup`-Workflow (innerhalb einer Agentensitzung aufgerufen) bietet interaktive Konfiguration von Sprache, CLI-Installationen, MCP-Verbindungen und Agenten-CLI-Zuordnung. Er unterscheidet sich von `oma` (dem Installer): `/setup` konfiguriert eine bereits installierte Instanz.

---

## Überwachung und Metriken {#monitoring-metrics}

### dashboard

Das Terminal-Dashboard zur Echtzeitüberwachung von Agenten starten.

```
oma dashboard terminal
```

Keine Optionen. Überwacht `.agents/state/memories/` im aktuellen Verzeichnis (ältere Projekte verwenden ersatzweise den veralteten Pfad `.serena/memories/`). Rendert eine Rahmenzeichnungsoberfläche mit Sitzungsstatus, Agententabelle und Aktivitätsfeed. Aktualisiert bei jeder Dateiänderung. Mit `Ctrl+C` beenden.

Das Memory-Verzeichnis kann über die Umgebungsvariable `MEMORIES_DIR` überschrieben werden.

**Beispiel:**
```bash
# Standard usage
oma dashboard terminal

# Custom memories directory
MEMORIES_DIR=/path/to/.agents/state/memories oma dashboard terminal
```

### dashboard web

Das Web-Dashboard starten.

```
oma dashboard web
```

Startet einen HTTP-Server unter `http://localhost:9847` mit einer WebSocket-Verbindung für Live-Updates. Öffne die URL in einem Browser, um das Dashboard anzuzeigen.

**Umgebungsvariablen:**

| Variable | Standard | Beschreibung |
|:---------|:--------|:-----------|
| `DASHBOARD_PORT` | `9847` | Port für den HTTP-/WebSocket-Server |
| `MEMORIES_DIR` | `{cwd}/.agents/state/memories` | Pfad zum Memory-Verzeichnis (für ältere Projekte ersatzweise `{cwd}/.serena/memories`) |

**Beispiel:**
```bash
# Standard usage
oma dashboard web

# Custom port
DASHBOARD_PORT=8080 oma dashboard web
```

### stats

Produktivitätsmetriken anzeigen.

```
oma stats get [--json] [--output <format>]
oma stats reset [--json] [--output <format>]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--json` | Ausgabe als JSON |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |

**Erfasste Metriken:**
- Anzahl der Sitzungen
- Verwendete Skills (mit Häufigkeit)
- Abgeschlossene Aufgaben
- Gesamte Sitzungszeit
- Geänderte Dateien, hinzugefügte Zeilen, entfernte Zeilen
- Zeitstempel der letzten Aktualisierung

**Kosten-Telemetrie** (über alle Dateien `session-cost-*.md` unter `.agents/state/memories/` aggregiert):
- Gesamtzahl der Eingabetokens (Näherung über Promptzeichen, noch keine Ausgabetokens)
- Anzahl der Starts
- Geschätzte USD anhand einer konservativen Rate für Eingabetokens pro Vendor (Claude $3/M, Codex $5/M, Gemini $0.3/M, Qwen $0/M, Cursor $5/M, Antigravity $0.3/M)
- Aufschlüsselung pro Vendor (Tokens · Starts · USD)

Die Schätzung ist eine Untergrenze und kein abrechnungsgenauer Betrag. Konfiguriere `session.quota_cap` in `.agents/oma-config.yaml`, um beim Start harte Budgets durchzusetzen; siehe die Seite Why oh-my-agent unter Erste Schritte für das qualitätsorientierte Arsenal, zu dem diese Limits gehören.

Metriken werden in `.agents/state/metrics.json` gespeichert; eine veraltete `.serena/metrics.json` wird gelesen, wenn sie vorhanden ist. Die Daten werden aus Git-Statistiken und Memory-Dateien erfasst.

**Beispiele:**
```bash
# View current metrics
oma stats get

# JSON output
oma stats get --json

# Reset all metrics
oma stats reset
```

### recap

Den Konversationsverlauf von KI-Tools über Claude-, Codex-, Qwen- und Cursor-Sitzungen zusammenfassen.

```
oma recap [--window <period>] [--date <date>] [--tool <tools>] [--top <n>] [--sort <metric>] [--mermaid] [--graph] [--json] [--output <format>]
```

**Optionen:**

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--window <period>` | Zeitfenster: `1d`, `3d`, `7d`, `2w`, `30d` | `1d` |
| `--date <date>` | Bestimmtes Datum (`YYYY-MM-DD`); hat Vorrang vor `--window` | |
| `--tool <tools>` | Filter durch Kommas getrennt: `grok,claude,codex,qwen,cursor,antigravity` | alle |
| `--top <n>` | Die N wichtigsten Projekte oder Themen anzeigen | |
| `--sort <metric>` | Nach `count` oder `duration` sortieren | `count` |
| `--mermaid` | Als Mermaid-Gantt-Diagramm ausgeben | |
| `--graph` | Einen interaktiven Graphen im Browser öffnen | |
| `--json` / `--output <format>` | Maschinenlesbare Ausgabe | `text` |

**Beispiele:**

```bash
oma recap                                     # Today (1d)
oma recap --window 7d                         # Last week
oma recap --date 2026-04-20 --tool grok,claude
oma recap --window 7d --mermaid > week.mmd
oma recap --window 30d --graph                # Interactive browser graph
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
| `--compare` | Aktuelles Fenster mit dem vorherigen Fenster gleicher Länge vergleichen |

**Angezeigt werden:**
- Tweetfähige Zusammenfassung (Metriken in einer Zeile)
- Zusammenfassungstabelle (Commits, geänderte Dateien, hinzugefügte/entfernte Zeilen, Mitwirkende)
- Trends gegenüber der letzten Retrospektive (wenn ein vorheriger Snapshot vorhanden ist)
- Ranking der Mitwirkenden
- Verteilung der Commit-Zeitpunkte (stündliches Histogramm)
- Arbeitssitzungen
- Aufschlüsselung der Commit-Typen (feat, fix, chore usw.)
- Hotspots (am häufigsten geänderte Dateien)

**Beispiele:**
```bash
# Last 7 days (default)
oma retro

# Last 30 days
oma retro 30d

# Last 2 weeks
oma retro 2w

# Compare with previous period
oma retro 7d --compare

# Interactive mode
oma retro --interactive

# JSON for automation
oma retro 7d --json
```

---

## Sitzungen und lokale Profile {#sessions-and-local-profiles}

### state list

Die OMA-Workflow-Sitzungen des aktuellen Projekts auflisten. Eine ausdrücklich globale Suche listet Sitzungen über Projekte hinweg im ausgewählten lokalen Profil auf:

```bash
oma state list
oma state list --all-projects --json
oma state list --all-projects --project /path/to/project
oma state list --all-projects --search migration
```

`--all-projects` ist schreibgeschützt. Es kann nicht mit Sitzungsaktivierung oder Wartung kombiniert werden. Normale Sitzungslese- und -schreibvorgänge behalten ihren Projektbereich bei. Veraltete Sitzungen anderer Repositories müssen zuerst in den Home-Speicher migriert werden, bevor sie in der aggregierten Liste erscheinen.

### profile

Lokale Speicherprofile unter `~/.oma/u/<slot>/` verwalten. Slots sind nichtnegative Dezimalzahlen und unabhängig von Modell-Presets und Provider-Anmeldekonten.

```bash
oma profile list --json
oma profile create 1
oma profile show
eval "$(oma profile use 1 --shell zsh)"
oma profile show
oma profile run 1 -- oma state list --all-projects --json
```

`profile use` gibt Shell-Aktivierungscode aus; durch Auswerten wird `OMA_PROFILE` in der aktuellen Shell gesetzt. Der Aufruf allein verändert weder die übergeordnete Shell noch bereits laufende Anwendungen und speichert keinen separaten CLI-Standard. CLI-Befehle und Vendor-Hooks, die aus der aktivierten Shell gestartet werden, übernehmen dasselbe Profil. Standard ist Profil `0`; `OMA_STATE_HOME` überschreibt das Speicherstammverzeichnis. `profile run <slot> -- <command> [args...]` wählt das Profil nur für diesen Befehl und seine Kindprozesse aus. Der Trenner hält Optionen wie `--help` und `--json` beim Kindbefehl.

---

## Agentenverwaltung {#agent-management}

### agent spawn

Einen Subagentenprozess starten.

```
oma agent spawn <agent-id> <prompt> <session-id> [-m <vendor>] [-w <workspace>] [--isolation <mode>]
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `agent-id` | Yes | Agententyp. Einer von: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Yes | Aufgabenbeschreibung. Kann Inline-Text oder ein Dateipfad sein. |
| `session-id` | Yes | Sitzungskennung (Format: `session-YYYYMMDD-HHMMSS`) |

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--vendor <vendor>` | CLI-Vendor-Überschreibung: `antigravity`, `claude`, `codex`, `cursor`, `qwen`, `grok`, `pi` |
| `-w, --workspace <path>` | Arbeitsverzeichnis des Agenten. Wird automatisch aus der Monorepo-Konfiguration erkannt, wenn es weggelassen wird. |
| `--isolation <mode>` | Isolationsmodus pro Start. Derzeit wird `worktree` unterstützt: Erstellt ein neues Git-Worktree unter `${tmpdir}/oma-worktrees/{sessionId}/{agentId}` auf dem Branch `oma/{sessionId}/{agentId}` und führt den Agenten dort aus. Das Worktree bleibt nach dem Beenden erhalten; Befehle zum Zusammenführen oder Verwerfen werden zur manuellen Prüfung ausgegeben (kein automatisches Zusammenführen). |
| `--read-only` | Beschränkt den gestarteten Agenten auf nicht-destruktive Tools (unterdrückt Auto-Approve-Flags). Wird intern von `oma skill eval --live` für beide Eval-Arme verwendet. |
| `--fallback-vendors <vendors>` | Aktiviert eine geordnete, durch Kommas getrennte Kette von bis zu drei konfigurierten CLI-Vendoren. Die Fortsetzung erfordert einen erkannten Quoten-/Rate-Limit-/vorübergehenden Fehler und einen neuen sicheren Handoff-Checkpoint. |

**Reihenfolge der Vendor-Auflösung:** `--vendor`-Flag > `agents:`-Überschreibung in `oma-config.yaml` > Agentenstandards des aktiven `model_preset`.

**Prompt-Auflösung:** Ist das Prompt-Argument der Pfad zu einer vorhandenen Datei, wird deren Inhalt als Prompt verwendet. Andernfalls wird das Argument als Inline-Text verwendet. Vendor-spezifische Ausführungsprotokolle werden automatisch angehängt.

**Exit-Codes:**

| Code | Bedeutung |
|:-----|:--------|
| `0` | Der Vendor-Prozess wurde mit 0 beendet und im Workspace existiert ein Sitzungsartefakt. |
| `3` | Der Vendor-Prozess wurde mit 0 beendet, hat aber **kein Sitzungsartefakt** im Workspace geschrieben (z. B. agy schreibt in seinen eigenen vertrauenswürdigen Root statt nach `-w`). Ein `blocker.raised`-Event wird an den Sitzungsverlauf angehängt und `agent status` meldet `no-artifact`. Behandle den Start nicht als abgeschlossen. |
| other | Der Vendor-Prozess selbst ist fehlgeschlagen; sein Exit-Code wird weitergereicht. |

**Beispiele:**
```bash
# Inline prompt, auto-detect workspace
oma agent spawn backend "Implement /api/users CRUD endpoint" session-20260324-143000

# Prompt from file, explicit workspace
oma agent spawn frontend ./prompts/dashboard.md session-20260324-143000 -w ./apps/web

# Override vendor to Claude
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude -w ./api

# Allow a prepared task handoff to another configured vendor
oma agent spawn backend "Implement auth" session-20260324-143000 --vendor claude --fallback-vendors codex,qwen -w ./api

# Mobile agent with auto-detected workspace
oma agent spawn mobile "Add biometric login" session-20260324-143000

# Run inside an isolated git worktree (useful for hypothesis spawns or
# when parallel agents would touch shared files)
oma agent spawn backend "Try a Drizzle-based rewrite" session-20260324-143000 --isolation worktree
```

**Vendor-Failover:** Fallback-Kandidaten müssen einen Vendor-Eintrag in der installierten CLI-Konfiguration besitzen. Jeder Versuch verwendet die Modellkonfiguration seines Ziel-Vendors und durchläuft die bestehenden Sitzungsquotenprüfungen. Der Multi-Provider-Proxy `pi` ist in dieser ersten Fallback-Funktion ausgeschlossen. Es werden keine zusätzlichen Provider-Anmeldedaten oder kostenpflichtigen API-Routen erstellt.

Wenn Failover aktiviert ist, erhält die Aufgabe Anweisungen, einen laufbezogenen sicheren Handoff-Eintrag unter `.agents/results/` vorzubereiten. Ein Nachfolger liest diesen Eintrag und prüft den Workspace, bevor er die verbleibende Arbeit fortsetzt. Eine erschöpfte Quote ohne nutzbaren Checkpoint endet mit einem Needs-Review-Eintrag. Abbruch, gewöhnliche Aufgabenfehler und abgeschlossene Läufe starten keinen weiteren Versuch. `--read-only` hebt die Checkpoint-Anforderung nicht auf.

Sitzungsereignisse zeichnen den Übergangsgrund sowie Quell- und Ziel-Vendor auf; jeder Versuch hat eine eigene Laufidentität und der Nachfolger wird mit seinem Vorgänger verknüpft. Dies gilt für von `oma agent spawn` gestartete Subprozesse; eine bestehende interaktive Unterhaltung in einer Vendor-App wird nicht automatisch umgeschaltet. Wenn `--fallback-vendors` weggelassen wird, bleibt die übliche Ausführung mit einem Vendor erhalten.

### agent status

Den Status eines oder mehrerer Subagenten prüfen.

```
oma agent status <session-id> [agent-ids...] [-r <root>]
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `session-id` | Yes | Die zu prüfende Sitzungs-ID |
| `agent-ids` | No | Durch Leerzeichen getrennte Liste von Agenten-IDs. Wenn weggelassen, gibt es keine Ausgabe. |

**Optionen:**

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `-r, --root <path>` | Stammverzeichnis für Memory-Prüfungen | Aktuelles Verzeichnis |

**Statuswerte:**
- `completed`: Ergebnisdatei ist vorhanden (mit optionalem Status-Header).
- `running`: PID-Datei ist vorhanden und der Prozess aktiv.
- `crashed`: PID-Datei ist vorhanden, aber der Prozess beendet, oder es wurde keine PID-/Ergebnisdatei gefunden.
- `no-artifact`: Der Vendor-Prozess wurde mit 0 beendet, hat aber kein Sitzungsartefakt im Workspace geschrieben (stiller, fehlgeleiteter Schreibvorgang — siehe Exit-Code `3` von `agent spawn`). Behandle den Start als fehlgeschlagen.

**Ausgabeformat:** Eine Zeile pro Agent: `{agent-id}:{status}`

**Beispiele:**
```bash
# Check specific agents
oma agent status session-20260324-143000 backend frontend

# Output:
# backend:running
# frontend:completed

# Check with custom root
oma agent status session-20260324-143000 qa -r /path/to/project
```

### agent parallel

Mehrere Subagenten parallel ausführen.

```
oma agent parallel [tasks...] [-m <vendor>] [-i | --inline] [--no-wait]
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `tasks` | Yes | Entweder ein Pfad zu einer YAML-Aufgabendatei oder (mit `--inline`) Inline-Aufgabenspezifikationen |

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--vendor <vendor>` | CLI-Vendor-Überschreibung für alle Agenten |
| `-i, --inline` | Inline-Modus: Aufgaben als Argumente im Format `agent:task[:workspace]` angeben |
| `--no-wait` | Hintergrundmodus (Agenten starten und sofort zurückkehren) |

**Format der YAML-Aufgabendatei:**
```yaml
tasks:
- agent: backend
task: "Implement user API"
workspace: ./api # optional, auto-detected if omitted
- agent: frontend
task: "Build user dashboard"
workspace: ./web
```

**Format für Inline-Aufgaben:** `agent:task` oder `agent:task:workspace` (der Workspace muss mit `./` oder `/` beginnen).

**Ergebnisverzeichnis:** `.agents/results/parallel-{timestamp}/` enthält für jeden Agenten Logdateien.

**Beispiele:**
```bash
# From YAML file
oma agent parallel tasks.yaml

# Inline mode
oma agent parallel --inline "backend:Implement auth API:./api" "frontend:Build login:./web"

# Background mode (no wait)
oma agent parallel tasks.yaml --no-wait

# Override vendor for all agents
oma agent parallel tasks.yaml --vendor claude
```

### agent review

Ein Code-Review mit einer externen KI-CLI (codex, claude, qwen oder grok) ausführen.

```
oma agent review [--vendor <vendor>] [-p <prompt>] [-w <path>] [--no-uncommitted]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--vendor <vendor>` | Zu verwendender CLI-Vendor: `codex`, `claude`, `qwen` oder `grok`. Standard ist `codex`, wenn der aufgelöste Konfigurations-Vendor nicht unterstützt wird. |
| `-p, --prompt <prompt>` | Benutzerdefinierter Review-Prompt. Wenn weggelassen, wird ein Standard-Code-Review-Prompt verwendet. |
| `-w, --workspace <path>` | Zu prüfender Pfad. Standard ist das aktuelle Arbeitsverzeichnis. |
| `--no-uncommitted` | Review nicht committeter Änderungen überspringen. Dann werden nur innerhalb der aktuellen Sitzung committete Änderungen geprüft. |

**Funktionsweise:**
- Erkennt die aktuelle Sitzungs-ID automatisch aus der Umgebung oder der jüngsten Git-Aktivität.
- Für `codex`: verwendet den nativen Unterbefehl `codex review`.
- Für `claude`, `qwen`: erstellt eine promptbasierte Review-Anfrage und ruft die CLI mit dem Review-Prompt auf.
- Standardmäßig werden nicht committete Änderungen im Arbeitsverzeichnis geprüft.
- Mit `--no-uncommitted` wird das Review auf innerhalb der aktuellen Sitzung committete Änderungen beschränkt.

**Beispiele:**
```bash
# Review uncommitted changes with default vendor
oma agent review

# Review with codex (uses native codex review command)
oma agent review --vendor codex

# Review with claude using a custom prompt
oma agent review --vendor claude -p "Focus on security vulnerabilities and input validation"

# Review a specific path
oma agent review -w ./apps/api

# Review only committed changes (skip working tree)
oma agent review --no-uncommitted

# Review committed changes in a specific workspace with qwen
oma agent review --vendor qwen -w ./apps/web --no-uncommitted
```

### goal set {#goal-set}

Einen Zielvertrag an einen aktiven persistenten Workflow (orchestrate, ultrawork, work, ralph) anhängen. Der Vertrag wird mechanisch durch den Stop-Hook des persistenten Modus durchgesetzt — der Abschluss ist keine Ermessensentscheidung des Modells mehr.

```
oma goal set [--workflow <name>] [--session-id <id>] [--gate <keyword>] [--budget-minutes <n>] [--description <text>]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--gate <keyword>` | Deterministisches Stop-Gate: `typecheck`, `test` oder `lint`. Wird auf das gleichnamige `package.json`-Skript abgebildet und ohne Shell als argv-Array ausgeführt. Solange es gesetzt ist, lässt der Stop-Hook den Workflow **nur passieren, wenn dieses Skript erfolgreich ist**; bei einem Fehler blockiert er mit dem Ende der Ausgabe, damit der Agent weiß, was zu beheben ist. Freie Befehle werden abgelehnt — der Gate-Wert liegt in einer von Agenten beschreibbaren State-Datei, und das Ausführen beliebiger Zeichenketten daraus würde die Berechtigungsschicht umgehen. |
| `--budget-minutes <n>` | Zeitbudget ab Aktivierung des Workflows. Nach Ablauf deaktiviert der Stop-Hook den Workflow und erlaubt einen ehrlichen partiellen Stopp (Maschinenurteil, als `gate.failed` mit `gate: "budget"` im Sitzungsereignisverlauf aufgezeichnet). |
| `--description <text>` | Menschlich lesbare Beschreibung des Ziels. Nur informativ. |
| `--workflow <name>` | Ziel-Workflow, wenn mehrere persistente Workflows aktiv sind. |
| `--session <id>` | Suffix der Sitzungs-ID der State-Datei. |

**Hinweise zum Verhalten:**
- Gate bestanden → Workflow wird deaktiviert, `gate.passed` wird ausgegeben, der Stopp ist erlaubt.
- Gate-Fehler und Timeout (harte Grenze 60 s) zählen beide zum Verstärkungslimit (5). Ein dauerhaft rotes Gate kann Stopps daher nicht für immer blockieren; der Ablauf nach 2 Stunden bleibt der letzte Schutz.
- Ohne Zielvertrag verhält sich der persistente Modus genau wie zuvor (nur Verstärkungs-Prompts) — der Vertrag ist vollständig optional.

**Beispiele:**
```bash
# After starting /ultrawork: require typecheck to pass before the session may end
oma goal set --gate typecheck

# Bound an autonomous run: stop honestly after 2 hours even if incomplete
oma goal set --workflow ultrawork --gate test --budget-minutes 120
```

---

## Geplante Agenten {#scheduled-agents}

### schedule create

Einen geplanten Agentenjob registrieren. Genau eines von `--cron` oder `--every` ist erforderlich.

```
oma schedule create <agent-id> <prompt> --cron "<5-field>" | --every "<phrase>" [-m <vendor>] [-w <path>] [--once] [--expires-after <n>] [--env <KEY1,KEY2>]
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `agent-id` | Yes | Agententyp: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |
| `prompt` | Yes | Aufgabenbeschreibung, die zum Auslösezeitpunkt an den Agenten übergeben wird |

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--cron "<expr>"` | Cron-Ausdruck mit 5 Feldern (z. B. `"0 9 * * *"`). Exklusiv mit `--every`. |
| `--every "<phrase>"` | Intervall in natürlicher Sprache: `5m`, `2h`, `1d`, `every 20m`, `every 5 minutes`. Rundet auf den nächsten als Cron darstellbaren Schritt und gibt einen Hinweis aus. Exklusiv mit `--cron`. |
| `--vendor <vendor>` | CLI-Vendor-Überschreibung, die an `oma agent spawn` übergeben wird: `antigravity`, `claude`, `codex`, `cursor`, `opencode`, `qwen`, `grok`, `pi`. Standardmäßig automatische Erkennung. |
| `-w, --workspace <path>` | Arbeitsverzeichnis des Agenten. Standard ist das Verzeichnis zum Zeitpunkt der Registrierung. |
| `--once` | Einmalmodus: wird einmal ausgelöst und entfernt sich danach selbst. |
| `--expires-after <duration>` | Wiederkehrenden Job nach N Tagen automatisch ablaufen lassen (`0` = unbegrenzt). |
| `--env <KEY1,KEY2>` | Benannte Umgebungsvariablen zur Laufzeitinjektion nach `~/.agents/schedule/env/<id>` (0600) kopieren. Nur die angegebenen Schlüssel werden erfasst, nie die gesamte Umgebung. |

**Funktionsweise:**
1. Parst und validiert den Cron-Ausdruck (oder konvertiert den `--every`-Ausdruck in Cron).
2. Schreibt den Job nach `~/.agents/schedule/schedules.json` (globales Manifest, Berechtigungen 0600).
3. Registriert den Job beim OS-Scheduler (launchd / systemd --user / schtasks). Der OS-Job ruft im konfigurierten Intervall `oma schedule run <id>` auf.

**Beispiele:**
```bash
# Exact cron: weekdays at 9 AM
oma schedule create qa-reviewer "Run QA review on latest changes" --cron "0 9 * * 1-5"

# Natural language: every 2 hours
oma schedule create backend "Check for slow queries" --every "2h"

# One-shot, pinned vendor and workspace
oma schedule create pm "Generate sprint plan" --cron "0 9 * * 1" --once --vendor claude -w /path/to/project

# Capture specific env vars for the job
oma schedule create backend "Sync external data" --cron "0 * * * *" --env SYNC_API_KEY,SYNC_TARGET_URL
```

Siehe den Leitfaden [Geplante Agenten](../guide/scheduled-agents.md) für einen vollständigen Ablauf.

### schedule list

Alle geplanten Jobs über alle Projekte hinweg nach Projekt gruppiert mit OS-Driftstatus auflisten.

```
oma schedule list [--json]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--json` | Ausgabe als JSON |

**Driftstatus:** `synced` (Manifest und OS stimmen überein), `missing-in-os` (mit `schedule sync` reparieren), `orphan-in-os` (OS enthält einen nicht im Manifest vorhandenen Job; mit `schedule sync --prune` entfernen).

**Beispiele:**
```bash
oma schedule list
oma schedule list --json | jq '.jobs[] | select(.drift != "synced")'
```

### schedule delete

Einen geplanten Job sowohl aus dem Manifest als auch aus dem OS-Scheduler entfernen.

```
oma schedule delete <id>
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `id` | Yes | Job-ID aus `schedule list` (Format: `sch_<base32-12>`) |

**Beispiel:**
```bash
oma schedule delete sch_abc123def456
```

### schedule run

Einen geplanten Job anhand seiner ID ausführen. Dies ist der vom OS-Scheduler zum Auslösezeitpunkt aufgerufene Einstiegspunkt. Normalerweise wird der Befehl nicht manuell aufgerufen, kann aber zum Debuggen eines Jobs dienen.

```
oma schedule run <id>
```

**Funktionsweise:**
1. Sucht `<id>` im Manifest (beendet sich mit einem Fehler, wenn sie nicht gefunden wird).
2. Lädt erfasste Umgebungsvariablen aus `~/.agents/schedule/env/<id>` und injiziert sie.
3. Ruft `oma agent spawn <agentId> <prompt> <sessionId> --vendor <vendor> -w <workspace>` auf.
4. Schreibt das Ergebnis nach `~/.agents/schedule/runs/<id>/<ISO-timestamp>.md`.
5. Aktualisiert `lastFiredAt` im Manifest und entfernt sich selbst, wenn der Job `--once` ist.
6. Schlägt bei abgelaufener Authentifizierung laut fehl: beendet sich mit einem Fehler und gibt `re-auth required: <vendor>` nach stderr aus. Der Befehl meldet nie stillschweigend Erfolg.

**Beispiel:**
```bash
# Invoke manually to debug a job
oma schedule run sch_abc123def456
```

### schedule sync

Das Manifest erneut mit dem OS-Scheduler synchronisieren. Repariert Drift nach Systemmigrationen oder Zurücksetzen des OS-Schedulers.

```
oma schedule sync [--prune]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--prune` | Entfernt zusätzlich OS-Jobs, die nicht im Manifest stehen (`orphan-in-os`). Ohne `--prune` werden verwaiste Jobs gemeldet, aber nicht entfernt. |

**Beispiele:**
```bash
# Repair missing-in-os jobs
oma schedule sync

# Repair missing-in-os AND remove orphans
oma schedule sync --prune
```

---

## Speicherverwaltung {#memory-management}

### memory init

Das Schema des Coordination-Memory-Stores initialisieren.

```
oma memory init [--json] [--output <format>] [--force]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--json` | Ausgabe als JSON |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |
| `--force` | Leere oder vorhandene Schemadateien überschreiben |

**Funktionsweise:** Erstellt die Verzeichnisstruktur `.agents/state/memories/` mit initialen Schemadateien, die Agenten und Workflows zum Lesen und Schreiben des Koordinationsstatus verwenden.

**Beispiele:**
```bash
# Initialize memory
oma memory init

# Force overwrite existing schema
oma memory init --force
```

---

## Integrationen und Hilfsprogramme {#integration-utilities}

### auth status

Den Authentifizierungsstatus aller unterstützten CLIs prüfen.

```
oma auth status [--json] [--output <format>]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--json` | Ausgabe als JSON |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |

**Geprüft werden:** GitHub CLI (`gh`), Antigravity CLI (`agy`), Gemini CLI, Claude CLI, Codex CLI, Cursor CLI und Qwen CLI.

**Beispiele:**
```bash
oma auth status
oma auth status --json
```

### bridge

MCP-stdio an einen gemeinsamen Serena-Server pro Projekt weiterleiten.

```
oma bridge [url] [--context <name>]
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `url` | No | Mit einem vom Aufrufer verwalteten Endpunkt verbinden, statt einen gemeinsamen Daemon aufzulösen |
| `--context` | No | Serena-Kontext für den Daemon (Standard `ide`); Daemons werden danach unterschieden |

**Funktionsweise:** Dies ist der Standardaufruf jedes Vendor-Serena-MCP-Eintrags — du rufst ihn normalerweise nicht von Hand auf. Serens Stdio-Transport startet für jede Agentensitzung einen eigenen Python-Prozess mit vollständigem Language-Server-Stack, sodass die Kosten mit der Zahl geöffneter Sitzungen wachsen. Die Bridge reduziert das auf einen Server pro Projekt: Sie ermittelt das Projektstammverzeichnis aus dem Arbeitsverzeichnis, startet bei Bedarf einen auf `--project` festgelegten Serena-HTTP-Server und leitet die Sitzung dorthin weiter.

Die Angabe von `--project` ist wichtig: Ein Server ohne dieses Flag stellt das Tool `activate_project` bereit, mit dem eine Sitzung das Projekt unter den anderen Sitzungen austauschen könnte.

**Architektur:**
```
session A --stdio--> oma bridge --.
                                   >-- HTTP --> one Serena server (+ LSPs)
session B --stdio--> oma bridge --'
```

**Lebenszyklus:** Die erste Sitzung startet den Server, spätere Sitzungen verwenden ihn wieder und jeder Proxy registriert sich als Client. Wenn sich die letzte Sitzung trennt, bleibt der Server 10 Minuten warm — ein Neustart verbindet sich erneut — und wird sonst vom nächsten startenden Bridge-Prozess heruntergefahren. Ist der gemeinsame Server nicht erreichbar, fällt der Proxy auf eine sitzungslokale Serena-Stdio-Verbindung zurück.

Opt-out mit `serena.mode: stdio` in `.agents/oma-config.yaml`.

**Beispiel:**
```bash
# Connect to a server you manage yourself
oma bridge http://localhost:12341/mcp
```

### verify

Subagent-Ausgabe anhand erwarteter Kriterien verifizieren.

```
oma verify agent <agent-type> [-w <workspace>] [--json] [--output <format>]
oma verify triggers [--corpus <path>] [--max-false-fire <pct>] [--max-missed-fire <pct>] [--json] [--output <format>]
```

**Argumente von `verify agent`:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `agent-type` | Yes | Einer von: `backend`, `frontend`, `mobile`, `qa`, `debug`, `pm` |

**Optionen:**

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `-w, --workspace <path>` | Zu verifizierender Workspace-Pfad | Aktuelles Verzeichnis |
| `--json` | Ausgabe als JSON | |
| `--output <format>` | Ausgabeformat (`text` oder `json`) | |

**Funktionsweise:** Führt das Verifikationsskript für den angegebenen Agententyp aus und prüft erfolgreichen Build, Testergebnisse und Scope-Konformität.

`verify triggers` misst die Genauigkeit des Keyword-Detektors anhand eines beschrifteten Prompt-Korpus. Die prozentualen Schwellenwerte sind Gates. Der registrierte Pfad ist `verify agent`; die alte Schreibweise auf oberster Ebene kann weiterhin in der Kompatibilitätshilfe erscheinen.

**Gemeinsame Prüfungen (alle Agententypen):**
- **Scope Check**: Liest Aufgabenscopes aus `.agents/results/plan-{sessionId}.json`. Vergleicht geänderte Dateien aus `git diff` mit den definierten Scope-Mustern. Schlägt fehl, wenn Dateien außerhalb des zugewiesenen Agentenscopes geändert wurden.
- **Charter Preflight**: Prüft, ob `result-{agent}.md` einen korrekt ausgefüllten `CHARTER_CHECK:`-Block ohne offene Platzhalter enthält.
- **Hardcoded Secrets**: Durchsucht `.py`, `.ts`, `.tsx`, `.js`, `.dart` nach Mustern wie `password = "..."`, `api_key = "..."` (Test-/Beispieldateien ausgenommen).
- **TODO/FIXME Comments**: Zählt Kommentare mit `TODO`, `FIXME`, `HACK`, `XXX` (warnt bei Treffern).

**Agentenspezifische Prüfungen:**

| Agententyp | Zusätzliche Prüfungen |
|:-----------|:-----------------|
| `backend` | Python-Syntaxvalidierung (`py_compile`), Erkennung von SQL-Injection (f-string + SQL-Schlüsselwörter), Ausführung von Python-Tests (`pytest`) |
| `frontend` | TypeScript-Kompilierung (`tsc --noEmit`), Erkennung von Inline-Stilen (`style={{`), Verwendung des Typs `any` (Fehler bei > 3), Frontend-Tests (`vitest`) |
| `mobile` | Flutter-/Dart-Analyse (`flutter analyze` oder `dart analyze`), Flutter-Tests (`flutter test`) |
| `qa` | Selbstprüfungsverifikation |
| `debug` | Führt je nach erkanntem Projekttyp Python- oder Frontend-Tests aus |
| `pm` | Validiert, dass `.agents/results/plan-{sessionId}.json` existiert und gültiges JSON enthält |

**Ausgabeformat:**
Jede Prüfung meldet `PASS`, `FAIL`, `WARN` oder `SKIP` mit einer Detailnachricht. Das Gesamtergebnis ist nur bei null fehlgeschlagenen Prüfungen `ok: true`.

**Beispiele:**
```bash
# Verify backend output in default workspace
oma verify agent backend

# Verify frontend in specific workspace
oma verify agent frontend -w ./apps/web

# JSON output for CI
oma verify agent backend --json
```

### hook

Ein Vendor-Hook-Event über den zentralen oma-Hook-Router auslösen (Design 019). Dies ist die kanonische ABI, die von jedem generierten `oma-hook.sh`-Wrapper aller Vendoren aufgerufen wird. Der Befehl kann auch direkt verwendet werden, um Handlerketten isoliert zu debuggen oder zu testen.

```
oma hook run --vendor <v> --event <nativeEvent> [--matcher <tool>]
```

**Optionen:**

| Flag | Erforderlich | Beschreibung |
|:-----|:---------|:-----------|
| `--vendor <v>` | Yes | Vendor-Identität. Einer von: `antigravity`, `claude`, `codex`, `commandcode`, `cursor`, `grok`, `kimi`, `kiro` oder `qwen`. (Der Vendor `pi` ist hier **nicht** gültig — er verwendet die In-Process-Bridge `installPiExtension` statt `oma hook run`.) |
| `--event <e>` | Yes | Nativer Hook-Eventname, wie er in den Vendor-Einstellungen registriert ist (z. B. `UserPromptSubmit`, `PreToolUse`, `Stop`) |
| `--matcher <m>` | No | Optionaler Toolname oder Matcher, der aus der Hook-Registrierung weitergereicht wird (z. B. `Bash`) |

**Stdin-/Stdout-Vertrag:**
- **stdin**: Vendor-nativer JSON-Payload (dasselbe Objekt, das der Vendor an Hook-Prozesse übergibt).
- **stdout**: Vendor-Dialekt-JSON (oder Klartext für kiro-Prompts), wenn ein Handler auslöst; leer, wenn kein Handler eine Ausgabe erzeugt.
- **Exit-Code**: immer `0` (Fail-Open — Fehler werden nach stderr geschrieben, der Agent wird nie blockiert).

**Laufzeit-Datenfluss:**
```
vendor fires: oma-hook.sh --vendor claude --event UserPromptSubmit
  stdin: {"prompt":"...","cwd":"/project","sessionId":"..."}
  → oma hook resolves handler chain from .agents/hooks/variants/claude.json
  → runs: keyword-detector → state-boundary → skill-injector (in-process)
  → merges HandlerResult values (context: concat; pre_tool: last mutate wins; stop: any block)
  → emits vendor dialect to stdout
  → exit 0
```

**Handlerketten isoliert debuggen:**

```bash
# Test what keyword-detector injects for a given prompt (Claude)
echo '{"prompt":"orchestrate the auth feature","cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Test a Bash pre_tool block (Claude)
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor claude --event PreToolUse --matcher Bash

# Test persistent-mode Stop enforcement (Codex)
echo '{"cwd":"/path/to/project"}' \
  | oma hook run --vendor codex --event Stop

# Test an Antigravity BeforeTool event
echo '{"tool_name":"run_shell_command","tool_input":{"command":"cat /etc/passwd"},"cwd":"/path/to/project"}' \
  | oma hook run --vendor antigravity --event BeforeTool
```

Leere stdout-Ausgabe bedeutet, dass die Kette für dieses Event einen No-op erzeugt hat. Ein JSON-Objekt auf stdout ist der Vendor-Dialekt, den die Agentensitzung erhält.

**Hinweise zum Geltungsbereich:**
- `statusLine`-/Hud-Einträge werden nicht über `oma hook run` geleitet (die Anzeige im Hot Path bleibt auf einem direkten `bun`-Pfad).
- Der pi-Vendor verwendet seine In-Process-Bridge `installPiExtension`, nicht `oma hook run`.

Siehe `cli/commands/hook/command.ts` für die Router-Implementierung (intern als „Design 019“ bezeichnet) und `cli/commands/hook/probe/` für die Vendor-Kompatibilitätsmatrix.

**Beispiele:**
```bash
# Inspect Claude keyword-detection output for a real prompt
echo '{"prompt":"plan the new checkout feature","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor claude --event UserPromptSubmit

# Verify a Qwen Stop event fires the persistent-mode block
echo '{"cwd":"'$(pwd)'"}' | oma hook run --vendor qwen --event Stop

# Check Antigravity hook output format
echo '{"prompt":"brainstorm","cwd":"'$(pwd)'"}' \
  | oma hook run --vendor antigravity --event BeforeAgent
```

---

### hook probe

Die Hook-Kompatibilität pro Vendor prüfen und eine Abdeckungsmatrix ausgeben.

```
oma hook probe [--vendor <list>] [--output <fmt>] [--hooks-dir <dir>]
```

**Optionen:**

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--vendor <list>` | Durch Kommas getrennte Vendoren, die geprüft werden sollen | Alle unterstützten Vendoren |
| `--output <fmt>` | Ausgabeformat: `text`, `md` oder `json` | `text` |
| `--hooks-dir <dir>` | Überschreibt das Verzeichnis `.agents/hooks/core` | Automatisch erkannt |

**Geprüft wird:** Für jeden Vendor wird geprüft, ob die zentralen Hook-Skripte (`keyword-detector`, `persistent-mode` usw.) vorhanden sind und ob das Varianten-JSON Events korrekt Handlerketten zuordnet. Exit-Code `1`, wenn ein Vendor den Status `failed` meldet.

**Beispiele:**
```bash
# Text matrix for all vendors
oma hook probe

# Markdown matrix (useful in CI PR comments)
oma hook probe --output md

# JSON for programmatic consumption
oma hook probe --output json | jq '.results[] | select(.status == "failed")'

# Probe a subset of vendors
oma hook probe --vendor claude,codex,antigravity
```

---

### vault

API-Schlüssel und andere Geheimnisse im OS-Schlüsselbund verwalten (macOS Keychain, Linux Secret Service oder Windows Credential Manager), unterstützt durch `@napi-rs/keyring`. Werte erscheinen nie in Shell-History oder Umgebungsdateien; nur die Schlüsselnamen werden in `~/.config/oma/vault-index.json` erfasst, damit `oma vault list` sie ohne Offenlegung der Geheimnisse auflisten kann.

```
oma vault store <name> [--value <value>]
oma vault get <name>
oma vault list [--json]
oma vault delete <name>
```

**Unterbefehle:**

| Unterbefehl | Beschreibung |
|:------------|:-----------|
| `store <name>` | Fragt nach einem Geheimniswert (verdeckte Eingabe) und schreibt ihn unter `name` in den OS-Schlüsselbund. `--value <value>` akzeptiert den Wert Inline für nicht-interaktive Nutzung (in der Shell-History sichtbar; die Eingabeaufforderung ist vorzuziehen). |
| `get <name>` | Gibt den gespeicherten Wert ohne Zusatztext nach stdout aus, damit er in Shells verwendet werden kann: `export ANTHROPIC_API_KEY=$(oma vault get anthropic)`. Beendet sich mit Code `2`, wenn der Schlüssel nicht existiert. |
| `list` | Listet gespeicherte Schlüsselnamen mit ihren `createdAt`-Zeitstempeln auf. Werte werden nie angezeigt. |
| `rm <name>` | Entfernt das Geheimnis aus Schlüsselbund und Index. |

**Regeln für Schlüsselnamen:** 1–64 Zeichen aus `[A-Za-z0-9._-]`. Beispiele: `anthropic`, `openai-prod`, `github_pat`, `sentry.dsn`.

**Native Abhängigkeit:** Das native Modul `@napi-rs/keyring` wird verzögert geladen. Wenn das Laden fehlschlägt (z. B. unter headless Linux ohne `libsecret` oder `gnome-keyring`), gibt der Befehl einen ausdrücklichen Fehler mit Installationshinweis aus, statt stillschweigend zurückzufallen.

**Beispiele:**
```bash
# Store with a hidden interactive prompt
oma vault store anthropic

# Non-interactive (note: value is visible in shell history)
oma vault store openai --value sk-test-...

# Use in a shell pipeline
export ANTHROPIC_API_KEY=$(oma vault get anthropic)
oma agent spawn backend "Refactor /api/auth" session-20260517-150000

# List entries (names only)
oma vault list

# Remove
oma vault delete anthropic
```

### cleanup

Verwaiste Subagent-Prozesse und temporäre Dateien bereinigen.

```
oma cleanup [--dry-run] [-y | --yes] [--json] [--output <format>]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--dry-run` | Anzeigen, was bereinigt würde, ohne Änderungen vorzunehmen |
| `-y, --yes` | Bestätigungsdialoge überspringen und alles bereinigen |
| `--json` | Ausgabe als JSON |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |

**Bereinigt werden:**
- Verwaiste PID-Dateien im temporären Systemverzeichnis (`/tmp/subagent-*.pid`).
- Verwaiste Logdateien (`/tmp/subagent-*.log`).
- **Verwaiste Serena-Sprachserver** — wenn ein MCP-Client (z. B. Claude) beendet wird, wird sein `serena start-mcp-server` an init vererbt und seine LSP-Kinder (`tsserver`, `pyright` usw., Hunderte MB) laufen ohne Client weiter. Sie werden hier beendet. Der Fall *inaktiv, aber noch verbunden* wird separat durch [`serena reap`](#serena) behandelt.
- Gemini-Antigravity-Verzeichnisse (brain, implicit, knowledge) unter `.gemini/antigravity/`.

**Beispiele:**
```bash
# Preview what would be cleaned
oma cleanup --dry-run

# Clean with confirmation prompts
oma cleanup

# Clean everything without prompts
oma cleanup --yes

# JSON output for automation
oma cleanup --json
```

### serena {#serena}

Speicher von Serenas projektspezifischen Sprachservern zurückgewinnen. Serena startet pro geöffnetem Projekt einen LSP-Stack (`tsserver`, `pyright` usw., etwa 300 MB) und hält ihn die ganze Sitzung über warm — bei mehreren geöffneten Projekten summiert sich das. Der Reaper beendet inaktive LSP-Kinder; Serena heilt sich beim nächsten Toolaufruf selbst und startet sie erneut (kein Neustart erforderlich).

```
oma serena reap [--dry-run] [--quiet]
oma serena reaper enable [--dry-run]
oma serena reaper disable [--dry-run]
```

**Unterbefehle:**

| Befehl | Beschreibung |
|:--------|:-----------|
| `serena reap` | Inaktive LSPs einmalig sofort beenden. Interaktive Läufe werden immer ausgeführt; `--quiet` (der geplante Pfad) beachtet die optionale `enabled`-Aktivierung. |
| `serena reap --dry-run` | Ziele und voraussichtlich freigegebenen Speicher anzeigen — beendet niemals Prozesse. |
| `serena reaper enable` | Eine Hintergrundaufgabe installieren, die alle 5 Minuten `serena reap --quiet` ausführt (launchd / systemd timer / Windows Task Scheduler). |
| `serena reaper disable` | Die Hintergrundaufgabe entfernen. |

**Richtlinie:** `lru` (Standard) hält die zuletzt aktiven `keepWarm`-Projekte warm und beendet den Rest; `idle` beendet jedes Projekt, das länger als `idleMinutes` inaktiv ist. Ein Zeitfenster `graceSeconds` schützt laufende Toolaufrufe.

**Konfiguration** (`.agents/oma-config.yaml`, optional — standardmäßig deaktiviert):

```yaml
serena_reaper:
  enabled: false     # gates the scheduled (--quiet) path; interactive reap always runs
  policy: lru        # lru | idle
  keepWarm: 2        # LRU: keep this many most-recently-active projects warm
  idleMinutes: 10    # idle threshold / LRU secondary floor
  graceSeconds: 90   # in-flight protection; SIGTERM→SIGKILL window
```

Diagnoseinformationen (KEEP-/REAP-Status pro Projekt und Quelle des Aktivitätssignals) zeigt [`oma doctor`](#doctor). Verwaiste Serena-LSPs (toter Client) werden unabhängig von dieser Einstellung durch [`oma cleanup`](#cleanup) beendet.

**Beispiele:**
```bash
# See what would be reclaimed across all open projects
oma serena reap --dry-run

# Reap idle LSPs once, right now
oma serena reap

# Turn on automatic 5-minute background reaping
#   (set serena_reaper.enabled: true in oma-config.yaml first)
oma serena reaper enable

# Turn it back off
oma serena reaper disable
```

### visualize

Die Projektstruktur als Abhängigkeitsgraph visualisieren.

```
oma visualize [--json] [--output <format>]
oma viz [--json] [--output <format>]
```

`viz` ist ein integrierter Alias für `visualize`.

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--json` | Ausgabe als JSON |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |

**Funktionsweise:** Analysiert die Projektstruktur und erzeugt einen Abhängigkeitsgraphen, der Beziehungen zwischen Skills, Agenten, Workflows und gemeinsam genutzten Ressourcen zeigt.

**Beispiele:**
```bash
oma visualize
oma viz --json
```

### search

Mechanische Suchprimitive für Abruf, Metadaten, RSS, Medien, Code und Vertrauensbewertung. Alias ist `oma s`. Alle Unterbefehle geben JSON nach stdout aus (ein Objekt pro Zeile oder mit `--pretty` formatiert).

```
oma search <subcommand> ...
oma s <subcommand> ...
```

**Unterbefehle:**

| Unterbefehl | Zweck |
|:-----------|:--------|
| `fetch <url>` | URL über eine automatisch eskalierende Strategiepipeline abrufen (api → probe → impersonate → browser → archive) |
| `api <url>` | Über den passenden Plattform-API-Handler abrufen (Phase 0) |
| `api:search <query>` | Schlüsselwortsuche an alle unterstützten Plattformen verteilen (`--platforms <list>`) |
| `meta <url>` | OGP-/JSON-LD-/Schema.org-Metadaten extrahieren |
| `rss <url>` | RSS-/Atom-Feed entdecken und parsen |
| `rss:google <query>` | Google-News-RSS-URL für eine Abfrage erzeugen |
| `media <url>` | Medienmetadaten über `yt-dlp` extrahieren (1858 Websites) |
| `archive <url>` | Über AMP / archive.today / Wayback-Fallback abrufen |
| `trust <domain>` | Vertrauensstufe oder Score einer Domain auflösen |
| `code <query>` | Code über `gh` (GitHub) oder `glab` (GitLab) durchsuchen |
| `doctor` | Abhängigkeiten prüfen (Chrome, `python3` + `curl_cffi`, `yt-dlp`, `gh`) |

**Gemeinsame Optionen für URL-/Abfrage-Unterbefehle:**

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--timeout <seconds>` | Zeitüberschreitung pro Strategie | `15` (`30` für `media`) |
| `--locale <value>` | `Accept-Language`-Header | `en-US,en;q=0.9` |
| `--pretty` | JSON-Ausgabe formatiert ausgeben | `false` |

**Zusätzliche Optionen für `fetch`:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--only <strategies>` | Durch Kommas getrennte auszuführende Strategien (`api,probe,impersonate,browser,archive`) |
| `--skip <strategies>` | Durch Kommas getrennte zu überspringende Strategien |
| `--include-archive` | Archivstrategie als letzten Fallback anhängen |

**Zusätzliche Optionen für `media`:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--subs` | Untertitel schreiben |
| `--sub-lang <list>` | Durch Kommas getrennte Untertitelsprachen (Standard: `en`) |
| `--format <spec>` | yt-dlp-Formatspezifikation |

**Zusätzliche Optionen für `code`:**

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--host <github\|gitlab>` | Host | `github` |
| `--language <lang>` | Sprachfilter | |
| `--repo <owner/repo>` | Auf ein Repository beschränken | |
| `--limit <n>` | Maximale Ergebnisse | `20` |

**Exit-Codes:** `0` ok, `1` Fehler, `2` blockiert, `3` nicht gefunden, `4` ungültige Eingabe, `5` Authentifizierung erforderlich, `6` Zeitüberschreitung.

**Beispiele:**

```bash
# Auto-escalating fetch
oma search fetch https://example.com/article --pretty

# Force a single strategy
oma search fetch https://example.com --only browser

# Cross-platform keyword search via API handlers
oma search api search "RAG patterns" --platforms hackernews,reddit

# Find a repo's trust score
oma search trust github.com

# Code search (defaults to GitHub)
oma search code "useEffect cleanup" --language ts --limit 10

# Verify your local dependencies
oma search doctor
```

Die Registry stellt außerdem folgende explizite Discovery-Hilfen bereit:

```bash
# Inspect which providers are registered without making a network request
oma search providers --json

# Use the selected web provider with bounded output
oma search web "latest browser automation" --limit 10 --timeout 30s --pretty

# Fetch metadata and feeds directly
oma search meta https://example.com/article --pretty
oma search media https://example.com/video --subs --sub-lang en --pretty
oma search archive https://example.com/article --pretty

# Platform API and RSS routes
oma search api fetch https://example.com/article --pretty
oma search api search "RAG patterns" --platforms hackernews,reddit --pretty
oma search rss fetch https://example.com/feed.xml --pretty
oma search rss google "browser automation"
```

`search` gibt auch ohne `--json` JSON aus. `--pretty` ändert nur die Darstellung, nicht das Ergebnisschema. `search web` akzeptiert `--provider`, `--limit`, `--timeout`, `--json` und `--pretty`. Wenn eine Strategie blockiert ist oder eine Abhängigkeit fehlt, verwende die Exit-Code-Tabelle und führe `oma search doctor` aus, bevor du die Strategie änderst.

### image

Mehrere Vendoren für KI-Bildgenerierung mit authentifizierungsbewusstem parallelem Dispatch. Alias ist `oma img`.

```
oma image <subcommand> ...
oma img <subcommand> ...
```

**Unterbefehle:**

| Unterbefehl | Zweck |
|:-----------|:--------|
| `generate <prompt...>` | Bilder über `pollinations` (flux/zimage, kostenlos), `codex` (gpt-image-2 über ChatGPT OAuth) oder `antigravity` (nano-banana über Gemini-Code-Assist-Abonnement, ohne Schlüssel) erzeugen |
| `doctor` | Authentifizierungs- und Installationsstatus pro Vendor prüfen |
| `vendor list` | Registrierte Vendoren und unterstützte Modelle auflisten |

**Optionen von `image generate`:**

| Flag | Beschreibung | Standard |
|:-----|:-----------|:--------|
| `--vendor <name>` | `auto` \| `pollinations` \| `codex` \| `antigravity` \| `all` | `auto` |
| `--size <size>` | Beliebiges `WxH` mit durch 16 teilbaren Kanten, 16–3840 und Seitenverhältnis 1:3–3:1; `auto` ist ebenfalls zulässig. | Vendor-Standard |
| `--quality <level>` | `low` \| `medium` \| `high` \| `auto` | Vendor-Standard |
| `-n, --count <n>` | Anzahl der Bilder (1..5) | `1` |
| `--output-dir <path>` | Ausgabeverzeichnis | `.agents/results/images/{timestamp}/` |
| `--allow-external-output` | Ausgabepfade außerhalb von `$PWD` erlauben | `false` |
| `--model <name>` | Vendor-spezifische Modellüberschreibung; wird von `antigravity`, dessen Modell undurchsichtig ist, ignoriert. | Vendor-Standard |
| `--timeout <duration>` | Zeitüberschreitung pro Bild | Vendor-Standard |
| `-r, --reference <path>` | Referenzbild(er); wiederholbar oder durch Kommas getrennt. Unterstützt von `codex` und `antigravity`, bei `pollinations` abgelehnt. Jeweils ≤5 MB PNG/JPEG/GIF/WebP (Magic-Byte-Validierung), maximal 10. | |
| `-y, --yes` | Kostenbestätigung überspringen | `false` |
| `--no-prompt-in-manifest` | SHA256 des Prompts statt des Klartexts speichern | `false` |
| `--dry-run` | Plan und Kostenschätzung ausgeben, aber nichts ausführen | `false` |
| `--output <format>` | CLI-Ausgabeformat: `text` \| `json` | `text` |

Jeder Lauf schreibt ein `manifest.json` neben die erzeugten Bilder. Es zeichnet Vendor, Modell, Prompt (oder Hash), Größe, Qualität und Kosten auf.

**Beispiele:**

```bash
# Free, no-config generation
oma image generate "minimalist sunrise over mountains"

# Specific vendor + size + count, skip cost prompt
oma image generate "logo concept" --vendor codex --size 1024x1024 -n 3 -y

# All vendors in parallel for comparison
oma image generate "cat astronaut" --vendor all

# Cost estimate without spending
oma image generate "test prompt" --dry-run

# Use a reference image to guide style / subject (codex or antigravity)
oma image generate "same otter in dramatic lighting" --vendor codex -r ~/Downloads/otter.jpeg

# Multiple references (repeatable or comma-separated)
oma image generate "blend these styles" --vendor antigravity -r a.png -r b.png
oma image generate "blend these styles" --vendor antigravity -r a.png,b.png

# Per-vendor doctor check
oma image doctor --output json
```

### video

Kurzvideos, Erklärvideos und Demo-Videos planen, authoren und rendern. `generate` erstellt Brief, Skript, Render-Spezifikation und Laufmanifest; für einen echten MP4-Renderlauf sind eine Composition und ein funktionierender Compositor erforderlich.

```
oma video generate "three ways to reduce build times" --mode shorts --dry-run --output json
oma video generate "product walkthrough" --mode demo --capture ./capture.mp4 --output json
oma video doctor --output json
oma video provider list --output json
oma video compose <runDir> --output json
oma video render <runDir> --output json
```

`generate` akzeptiert `--mode shorts|explainer|demo`, `--aspect`, `--locale`, `--captions`, `--visual`, `--voice`, `--music`, `--duration`, `--compositor remotion|mpt`, `--capture`, `--source file|web`, `--url`, `--device`, `--ready-selector`, `--show-cursor`, `--polish`, `--capture-timeout` und `--capture-stop duration:<seconds>|selector:<css>`. Verwende für eine Browseraufnahme `--source web --url <url>`; `--source file` ist die Standardsource. `--output-dir` wählt den Laufstamm, `--allow-external-output` erlaubt einen Pfad außerhalb von `$PWD`, `--max-usd` setzt eine Kostengrenze, `--seed` stabilisiert Planungseingaben und `--no-brief-in-manifest` speichert statt des Brieftexts dessen Hash. `--dry-run` stoppt nach der Planung. `--output text|json` steuert das CLI-Laufobjekt.

`doctor` prüft die zwischengespeicherte Remotion/MPT-Toolchain und akzeptiert `--install`, `--upgrade`, `--install-mpt` und `--install-strudel`. `provider list` meldet Providerverfügbarkeit und Schlüsselstatus. `compose` erzeugt oder aktualisiert die Lauf-Composition und meldet den Authoring-Vertrag; `render` führt Typechecks aus, rendert und prüft die Ausgabe. Fehlender Compositor, fehlende Composition oder fehlende Toolchain-Abhängigkeiten sind Fehler. Der nur für Tests gedachte Pfad `OMA_VIDEO_MOCK=1` ist der einzige Platzhaltermodus; ein normaler Lauf ersetzt niemals die Ausgabe durch eine Text- oder winzige MP4-Datei.

Eine erfolgreiche JSON-Ausgabe enthält `runDir`, `manifestPath`, `scriptPath` und `renderSpecPath`; das Manifest verzeichnet ausgewählte Provider, Eingaben und erzeugte Artefakte. Nach `compose` authorst du die erzeugte Composition gemäß `AUTHORING.md` und führst danach `render` erneut aus. Wenn ein Provider-Schlüssel fehlt, führe `oma video doctor` aus; bei fehlgeschlagener Aufnahme prüfe URL, Selector, Gerät und Timeout; bei fehlgeschlagenem Render behebe zuerst die Composition-Diagnose.

### star

oh-my-agent auf GitHub mit einem Stern versehen.

```
oma star
```

Keine Optionen. Erfordert eine installierte und authentifizierte `gh`-CLI. Markiert das Repository `first-fluke/oh-my-agent` mit einem Stern.

**Beispiel:**
```bash
oma star
```

### describe

CLI-Befehle zur Laufzeitintrospektion als JSON beschreiben.

```
oma describe [command-path]
```

**Argumente:**

| Argument | Erforderlich | Beschreibung |
|:---------|:---------|:-----------|
| `command-path` | No | Der zu beschreibende Befehl. Wenn weggelassen, wird das Root-Programm beschrieben. |

**Funktionsweise:** Gibt ein JSON-Objekt mit Name, Beschreibung, Argumenten, Optionen und Unterbefehlen des Befehls aus. Wird von KI-Agenten verwendet, um verfügbare CLI-Funktionen zu verstehen.

**Beispiele:**
```bash
# Describe all commands
oma describe

# Describe a specific command
oma describe "agent spawn"

# Describe a subcommand
oma describe "agent:parallel"
```

---

## Recherche- und Artefaktbefehle {#research-and-artifact-commands}

Diese Familien sind nützlich, wenn die Ausgabe ein Rechercheartefakt, eine Präsentation oder ein Bericht ist. Die Abschnitte sind hier bewusst kurz; die verknüpften Leitfäden erklären Ablauf und Wiederherstellungsoptionen.

### intel suggest

Produktarbeit aus Markt- und Repository-Signalen vorschlagen:

```
oma intel suggest --topic "developer onboarding" --target ./my-product --dry-run
oma intel suggest --config .agents/intel.yaml --json
```

`--config` liefert die vollständige Konfiguration. Für einmalige Läufe wählen `--topic`, `--target`, `--repos`, `--since` und `--last-commits` die Eingaben aus. `--output-dir` steuert lokale Berichte und `--fixture` liefert eine lokale JSON-Fixture für deterministische Reviews. `--create-issue` legt die akzeptierten Kandidaten in GitHub an und erfordert ein konfiguriertes Ziel sowie eine Bestätigung; kombiniere es mit `--base-repo <owner/name>`, um das Repository auszuwählen, und verwende `--yes` nur in einem bereits freigegebenen Automatisierungskontext. `--dry-run` und `--json` sind sichere Prüfpfade.

### market

Die Market-Familie delegiert an die aufgelöste Upstream-Engine `last30days`. Beginne mit Gate und Resolver:

```
TOPIC="browser automation pain points"
oma market detect-trap "$TOPIC"
oma market resolve --output json
oma market run "$TOPIC" --days 30 --emit=compact
```

`market detect-trap` beendet sich mit Exit 2 und einer Neuformulierung für Keyword-Trap- oder zu breite Themen; `--force` umgeht dieses Gate nur, wenn der Benutzer ausdrücklich fortfahren möchte. `market resolve` akzeptiert `--refresh` und `--offline`, `market update` aktualisiert den verwalteten Engine-Cache. `market run` reicht seine übrigen Argumente an die aufgelöste Python-Engine weiter und ergänzt bei einem angegebenen Thema `--save-dir` aus `market.save_dir`. Lies vor der Auswahl von Upstream-Flags [Marktrecherche](../guide/market-research.md); die `--help`-Ausgabe gehört zur verwalteten Engine und ändert sich mit dem Release.

### docs

Mit der Docs-Familie Dokumentationsdrift prüfen. Die Befehle sind berichtsorientiert; `sync` listet Kandidaten für den Host-Agenten auf und bearbeitet Dateien nicht selbst.

```
oma docs verify --json
oma docs verify --no-urls --report-file .agents/results/docs-drift.md
oma docs sync HEAD~3..HEAD --json
oma docs i18n --json --min-severity HIGH
oma docs lint --json --locales ko,ja
```

`verify` prüft lokale Referenzen und erzeugt `docs/generated/doc-refs.json` neu; `--urls-sync` wartet auf den optionalen `lychee`-URL-Durchlauf. `sync` verwendet standardmäßig zunächst gestagte Änderungen und dann `HEAD~1..HEAD` und gibt Kandidaten im Format `{doc, changedFiles, matchedRefs}` aus. `i18n` meldet strukturellen Drift zwischen Englisch und Übersetzung, `lint` Stilprobleme in übersetzten Dokumenten. Kein Unterbefehl bearbeitet Dokumente automatisch.

### slide

`oma slide` arbeitet mit einem Arbeitsverzeichnis aus 1920×1080-HTML-Slidefragmenten. Ein minimaler Arbeitsablauf ist:

```
oma slide create --output-dir .agents/results/slides/demo
# author slide-01.html and meta.json in that directory
oma slide validate --workspace .agents/results/slides/demo --output json
oma slide preview --workspace .agents/results/slides/demo
oma slide bundle --workspace .agents/results/slides/demo
```

Das Qualitätsgate meldet Befunde zu Überlauf, Überlappung und Schriftgröße. Verwende `--slide <file>` für eine einzelne Slide-Prüfung und `--report-file <path>` zusammen mit JSON-Ausgabe. Exportiere erst nach der Validierung:

```
oma slide export pdf --workspace <dir> --output-file <file> --mode capture
oma slide export png --workspace <dir> --output-dir <dir> --resolution 1080p
oma slide export pptx --workspace <dir> --output-file <file>
```

Der PPTX-Export ist experimentell und rasterbasiert. `slide import pptx <file>`, `slide asset fetch-video <url>` und `slide style list|preview|get <slug>` decken Eingabeartefakte und Stilsuche ab. Für Authoring-Entscheidungen und die festen Stage-Beschränkungen siehe [oma-slide](../guide/content-and-research.md#slides-and-presentations).

### scholar

Papers und Werkmetadaten suchen und Sidecars vor der Weitergabe validieren:

```
oma scholar search "vision language action" --limit 10
oma scholar resolve "Attention Is All You Need"
oma scholar get --section statements "knows:generated/reconvla/1.0.0"
oma scholar get "10.48550/arXiv.1706.03762"
oma scholar lint paper.knows.yaml
```

`search` kann OpenAlex-Ergebnisse mit `--year-min` begrenzen und mit `--always-fallback` Fallback-Provider erzwingen. `get --section` akzeptiert `statements`, `evidence`, `relations`, `artifacts` oder `citation`. `lint --lenient` stuft verwaiste Querverweise zwischen Records zu Warnungen herab; `--fail-on-warning` lässt Warnungen in CI fehlschlagen. Die CLI sucht zuerst in Knows, danach in OpenAlex und Semantic Scholar; sie übermittelt keine Sidecars an Upstream.

### explain

`/explain` ist der Authoring-Workflow. Die CLI validiert bereits erstellte Artefakte:

```
oma explain validate .agents/results/explain/2026-09-09-change.html
oma explain validate --input-dir .agents/results/explain --output json --report-file .agents/results/explain/report.json
```

Übergib entweder eine Datei oder `--input-dir`, nicht beides. Die Validierung prüft den Vertrag für eigenständiges HTML und meldet maschinenlesbare Fehler; sie bewertet nicht die inhaltliche Richtigkeit der Erklärung. Siehe [Code-Explainer](../guide/code-explainer.md).

### diagram

Die Engine auflösen, bevor ein Workflow ein strukturelles Diagramm ausgibt:

```
oma diagram resolve --output json
oma diagram resolve --engine mermaid --offline
oma diagram update
oma diagram archify validate architecture <stem>.archify.json --quality showcase --json
oma diagram archify deliver architecture <stem>.archify.json <stem>.archify.html --quality showcase --json
```

`diagram resolve` akzeptiert `--engine auto|archify|mermaid`, `--refresh` und `--offline`. `diagram update` aktualisiert die verwaltete archify-Kopie. `diagram archify` reicht die übrigen Argumente an die aufgelöste Upstream-Executable weiter und übernimmt deren Exit-Code. Mermaid bleibt die Markdown-SSOT; das HTML ist ein abgeleitetes Artefakt. Siehe [Diagramm-Engine](../guide/diagram-engine.md).

## Status-, Modell- und Memory-Inspektion {#state-model-and-memory-inspection}

Die folgenden Familien stellen dauerhaften Workflowstatus sowie Diagnoseinformationen zu Modellen und Providern bereit. Für Aktionen zur Bereinigung ist `--dry-run` vorzuziehen; wenn ein anderes Programm das Ergebnis verarbeitet, verwende `--json`.

### state

```
oma state list --json
oma state list --all-projects --project /path/to/project --search migration
oma state get <session-id> --json
oma state verify --workflow work --checkpoint complete --json
oma state archive --older-than 90d --dry-run --json
oma state purge --older-than 90d --dry-run --json
```

`state emit` zeichnet ein L1-Event mit expliziter Kategorie und Sitzungsmetadaten auf. `state migrate` verschiebt veraltete Sitzungen in das ausgewählte Profil. `state repair` repariert fehlerhafte Statusdateien. `state decisions list` sowie `state inject-log list|get` prüfen erforderliche Entscheidungen und Injection-Audit-Einträge. `state activate`, `state archive` und `state purge` sind explizite Aktionen; die alten booleschen Aktionsflags werden abgelehnt. Archiviere oder lösche erst nach einer Dry-Run-Prüfung, da diese Befehle den lokalen Status ändern.

### model

```
oma model check --json
oma model check --owner openai --fail-on-drift
oma model probe openai/gpt-5 --timeout 30s --json
oma model propose --owner anthropic --json
```

`model check` vergleicht die Registry mit den Live-Listen der Vendoren und kann neue Kandidaten prüfen. `model probe` testet einen Slug anhand der Vendor-CLI. `model propose` gibt einen `oma-config`-Patch für `models:` aus; verwende `--write` nur, wenn du die Konfiguration ändern willst. Verfügbarkeit und Quote eines Vendors können Prüfungen scheitern lassen, auch wenn ein Registry-Eintrag gültig ist.

### Befehle für Agenten-Evidenz

Native Agentenläufe verwenden eine evidenzbasierte Abfolge:

```
SESSION_ID="session-$(date +%Y%m%d-%H%M%S)"
oma agent context docs --difficulty Medium
oma agent begin docs docs "$SESSION_ID" --workspace .
# Use the runId and claimPath printed by begin.
oma agent verify "<run-id>" --required
oma agent finish "<run-id>" "<claim-path>"
```

`agent context` lädt graphausgewählten Kontext; `begin` startet einen Lauf und gibt eine generierte Lauf-ID sowie einen Claim-Pfad aus; `verify` erhält diese Lauf-ID und führt die festgelegten Prüfungen (`--required`) aus oder grenzt sie mit `--affected` ein; `finish` erhält Lauf-ID und Pfad zur Claim-Datei. `agent resume --dry-run` meldet bereite und wiederverwendbare Aufgaben, `agent resume --max-attempts <n>` wiederholt nur Aufgaben, die der Plan zulässt. Siehe [Agentenergebnisse und Fortsetzen](../guide/agent-results-and-resume.md) für Plan- und Claim-Form. Diese Befehle gehören zum OMA-Ausführungsvertrag; für gewöhnliche Nutzerarbeit können stattdessen `agent spawn`, `agent parallel` oder `agent review` verwendet werden.

### memory

```
oma memory status --json
oma memory keys --kind connection --dry-run --json
oma memory init --json
oma memory setup --endpoint http://127.0.0.1:8000 --dry-run --json
oma memory import --source claude --since 7d --dry-run --json
oma memory gc --scope project --keep 20 --dry-run --json
```

`memory keys` konfiguriert Honcho-Verbindung oder Embedding-Anmeldedaten; `--dry-run` zeigt Ziele an, ohne Schlüssel zu lesen oder zu schreiben. `memory setup` bereitet einen AgentMemory-Endpunkt vor und kann optional `--install` oder `--start` verwenden. `memory daemon` und `memory service` verwalten lokale Prozesse oder die Integration als OS-Dienst. `memory maintain backup|prune|vacuum`, `memory retry drain`, `memory upgrade` und `memory gc` sind Wartungsaktionen; prüfe deren JSON- oder Dry-Run-Ausgabe, bevor du sie anwendest.

## Skillverwaltung {#skill-management}

### skills audit

Installierte Skills auf überlappende Beschreibungen, Black-Hole-Generalismus und nachlassende Routingqualität bei großen Bibliotheken prüfen.

```
oma skill audit [--json] [--output <format>]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--json` | JSON-Ausgabe für CI/CD |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |

**Geprüft wird:**
- **Paarweise Beschreibungsähnlichkeit**: TF-IDF-Kosinusähnlichkeit zwischen jedem installierten Skillpaar. Warnung ab ≥ 60 %, Fehler ab ≥ 75 %.
- **Black-Hole-Erkennung**: Markiert Skills, deren mittlere Ähnlichkeit zu allen anderen ein positiver Ausreißer ist (≥ Mittelwert + 1,5 × Standardabweichung). Das weist auf eine zu allgemeine Beschreibung hin, die das Routing übernehmen könnte.
- **Abnahme durch Bibliotheksgröße**: Warnt bei mehr als 60 installierten Skills (die Routinggenauigkeit nimmt logarithmisch mit wachsender Bibliothek ab).
- **Fokusprüfung**: Warnt, wenn ein Skill zu einem Bundle ausufert — mehr als 20 Referenzdokumente (`.md`-Dateien neben `SKILL.md`, vendorte Bäume ausgenommen) oder ein `SKILL.md`-Text mit mehr als 25.000 Zeichen. Fokussierte Skills schneiden besser ab (SkillsBench, arXiv:2602.12670); die Lösung ist Aufteilen, nicht Löschen.

**Exit-Codes:** `0`, wenn alle Befunde im Warnbereich liegen oder keine Befunde vorhanden sind; `1`, wenn mindestens ein Paar den Fehlerbereich erreicht.

**Beispiele:**
```bash
oma skill audit
oma skill audit --json | jq '.findings'
```

### skills lint

Autorenfehler pro Skill erkennen: Qualitätsmängel innerhalb einer einzelnen `SKILL.md`, im Unterschied zu `skills audit`, das Beziehungen *zwischen* Skills prüft. Grundlage ist die Skill-Smell-Taxonomie aus arXiv:2607.01456 (über 99 % der SKILL.md-Dateien aus der Praxis enthalten mindestens einen solchen Geruch).

```
oma skill lint [--skill <id>] [--json] [--output <format>]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--skill <id>` | Einen einzelnen Skill linten |
| `--json` | JSON-Ausgabe für CI/CD |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |

**Allgemeine Smells (jeder Skill):**

| Smell | Schweregrad | Bedeutung |
|:------|:---------|:--------|
| `missing-name` | fail | Frontmatter-`name` fehlt oder ist leer |
| `missing-description` | fail | Frontmatter-`description` fehlt oder ist leer — das Routing hängt davon ab |
| `weak-description` | warn | Beschreibung unter 40 Zeichen — zu dünn für Routing |
| `body-too-long` | warn | SKILL.md-Text mit mehr als 500 Zeilen — Details hinter Progressive Disclosure nach `resources/` verschieben |
| `template-placeholder` | warn | Verbliebener Text `{Placeholder}` außerhalb von Code-Spans |
| `broken-reference` | fail | Referenziert eine nicht vorhandene Datei unter `resources/`, `config/`, `scripts/` oder `assets/` |

**SSL-lite-Smells** (die SSL-lite-Validierung ist erforderlich, wenn der deklarierte Name eines Skills oder der bereitgestellte Verzeichnis- bzw. Aliasname mit `oma-` beginnt, auch ohne `## Scheduling`; ein unpräfixiertes Alias kann einen deklarierten `oma-`-Namen nicht umgehen. Gewöhnliche unpräfixierte Skills wählen das Format durch `## Scheduling`):

| Smell | Schweregrad | Bedeutung |
|:------|:---------|:--------|
| `ssl-structure` | fail | Top-Level-Abschnitte weichen von `Scheduling / Structural Flow / Logical Operations / References` ab |
| `canonical-path` | fail | Nicht genau ein `### Canonical command path` oder `### Canonical workflow path` |
| `missing-boundaries` | warn | Kein `### When NOT to use` — Skills ohne Grenzen übernehmen das Routing |
| `empty-failure-recovery` | warn | `### Failure and recovery` fehlt oder ist leer (akzeptiert Aufzählungen oder Tabellenzeilen) — Fehlermechanismen gemäß SkillLens beschreiben |

**Exit-Codes:** `0`, wenn keine Smells mit Schweregrad fail vorliegen; `1`, wenn mindestens ein solcher Smell vorliegt.

**Beispiele:**
```bash
oma skill lint
oma skill lint --skill oma-scholar
oma skill lint --json | jq '.smells'
```

### skills eval

Den Nutzwert pro Skill messen: Verbessert das Laden eines Skills tatsächlich die Ergebnisse bei zurückgehaltenen Aufgaben? Dies ist das Nutzwert-Gegenstück zu `skills audit` (dort wird die Überschneidung von Beschreibungsgrenzen gemessen). `audit` fragt „Sind zwei Skills redundant?“, `eval` fragt „Hilft dieser Skill?“

```
oma skill eval [--skill <id>] [--mock | --live] [--record] [--yes]
                [--task-dir <path>] [--max-tasks <n>] [--require-coverage]
                [--json] [--output <format>]
```

**Optionen:**

| Flag | Beschreibung |
|:-----|:-----------|
| `--skill <id>` | Zu evaluierende Skill-ID (einfacher Name ohne Pfadtrenner). Standard ist `_all`. |
| `--mock` | Aufgezeichnete Rollouts aus `_rollouts/` wiedergeben (Standard; deterministisch, kein LLM-Dispatch). Sicher für CI. |
| `--live` | Live-Agenten-Dispatch — startet pro Aufgabe über `oma agent spawn --read-only` zwei Arme (Baseline und Treatment). Gibt eine Kostenvorschau aus und fragt ohne `--yes` nach Bestätigung. |
| `--record` | Aufgezeichnete Live-Rollouts (einschließlich Judge-Urteilen) für spätere `--mock`-Wiedergabe nach `_rollouts/` schreiben. Nur mit `--live` sinnvoll. |
| `--yes` | Kostenbestätigung überspringen. Nur mit `--live` sinnvoll. |
| `--task-dir <path>` | Verzeichnis der Aufgaben-Fixtures überschreiben (muss im Workspace-Root liegen). Standard: `.agents/eval/<skill>/`. |
| `--max-tasks <n>` | Anzahl evaluierter Aufgaben begrenzen (in deterministischer Sortierreihenfolge). |
| `--require-coverage` | Mit Exit ungleich null abbrechen, wenn weniger als 5 Aufgaben gefunden werden (verhindert stilles Grün in CI). |
| `--json` | JSON-Ausgabe für CI/CD |
| `--output <format>` | Ausgabeformat (`text` oder `json`) |

**Funktionsweise:**

Für jede Aufgaben-Fixture in `.agents/eval/<skill>/`:
1. **Baseline-Arm** — Der Aufgaben-Prompt wird ohne geladenen Skill dispatcht.
2. **Treatment-Arm** — `SKILL.md` wird dem Prompt vorangestellt und anschließend dispatcht.
3. Jeder Arm wird von seinem Checker bewertet (standardmäßig Judge; für deterministische Opt-ins `assert` oder `regex`).
4. `utilityLift = weighted_mean(treatment scores) − weighted_mean(baseline scores)`.

**Entscheidungen:**

| Entscheidung | Bedingung |
|:---------|:---------|
| `pass` | `utilityLift ≥ 5%` |
| `warn` | `0% < utilityLift < 5%` |
| `fail` | `utilityLift ≤ 0%` (Exit-Code 1) |
| `insufficient` | Weniger als 5 bewertbare Aufgaben (Exit-Code 1 nur mit `--require-coverage`) |

**Empfohlener Modus:** Verwende `--live` mit Judge-Checkern, um den tatsächlichen Nutzwert des Skills zu messen. Nutze `--mock`, um aufgezeichnete Judge-Urteile offline wiederzugeben oder deterministische `assert`-/`regex`-Vertragsprüfungen auszuführen.

**Umgebungsvariable:** `OMA_SKILLEVAL_MOCK=1` erzwingt unabhängig von den Flags den Mock-Modus.

**Exit-Codes:** `0` bei pass oder warn; `1` bei fail oder insufficient mit `--require-coverage`.

**Beispiele:**
```bash
# Dry-run on recorded rollouts (CI-safe)
oma skill eval --skill oma-scholar

# Live run with cost preview
oma skill eval --skill oma-scholar --live

# Live run, record results for future mock replay, skip prompt
oma skill eval --skill oma-scholar --live --record --yes

# JSON output for CI
oma skill eval --skill oma-scholar --json

# Fail CI when no tasks exist
oma skill eval --skill oma-scholar --require-coverage

# Limit to 10 tasks
oma skill eval --skill oma-scholar --max-tasks 10
```

Siehe den Leitfaden [Skill-Nutzwert-Evaluation](../guide/skill-eval.md) für das Fixture-Format unter `.agents/eval/` und die Checker-Typen.

---

### skills opt

Einen Skill mit persistenter Evolution nach dem WikiSkill-Prinzip in `SKILL.md` optimieren. Ein Maintainer verdichtet beobachtbare Rollout-Evidenz zu begrenztem Wissen, ein Proposer gibt begrenzte Add-/Delete-/Replace-Änderungen aus und abgelehnte Ergebnisse bleiben über Läufe hinweg erhalten. Kandidaten müssen den zurückgehaltenen Validierungssplit strikt verbessern; `--apply` erfordert zusätzlich eine strikte Verbesserung auf einem vom Runner verwalteten Final-Test-Split. Forschungsgrundlage: WikiSkill (arXiv:2608.27454).

```
oma skill optimize [--skill <id>] [--dry-run | --apply] [--mock | --live]
               [--max-epochs <n>] [--edits-per-epoch <k>] [--lr <chars>]
               [--yes] [--json] [--output <format>]
```

**Optionen:**

| Flag | Standard | Beschreibung |
|:-----|:--------|:-----------|
| `--skill <id>` | `_all` | Zu optimierende Skill-ID (einfacher Name ohne Pfadtrenner). |
| `--dry-run` | **yes (default)** | Änderungen vorschlagen und den Diff ausgeben, ohne `SKILL.md` zu ändern; erzeugte Evolutionsbelege werden dennoch aufgezeichnet. |
| `--apply` | — | Akzeptierte Änderungen anwenden; sichert das Original vor einem atomaren Schreibvorgang und schreibt nur eine validierte Verbesserung. |
| `--mock` | **yes (default)** | Aufgezeichnete Optimiereränderungen und Eval-Urteile wiedergeben (deterministisch, offline). Sicher für CI. |
| `--live` | — | Live-LLM-Optimierer-Dispatch — verursacht echte Modellaufrufe pro Epoche. Gibt eine Kostenvorschau aus und fragt ohne `--yes` nach Bestätigung. |
| `--max-epochs <n>` | `8` | Maximale Anzahl der Optimierungsepochen. |
| `--edits-per-epoch <k>` | `4` | Pro Epoche vorgeschlagene Kandidatenänderungen. |
| `--lr <chars>` | `600` | Textbudget der Lernrate: maximale Nettozeichenänderung pro Änderung. |
| `--yes` | — | Kostenbestätigung überspringen (nur mit `--live`). |
| `--json` | — | JSON-Ausgabe für CI/CD. |
| `--output <format>` | `text` | Ausgabeformat (`text` oder `json`). |

**Harte Abhängigkeit:** Erfordert mindestens 5 Aufgaben-Fixtures in `.agents/eval/<skill>/`. Bei weniger Fixtures wird mit einer verständlichen Meldung abgebrochen. Siehe den Leitfaden [Skill-Nutzwert-Evaluation](../guide/skill-eval.md) zum Erstellen der Fixtures.

**Train-/Validation-/Test-Split:** Fixtures werden deterministisch im Verhältnis 60/20/20 aufgeteilt. Maintainer und Proposer sehen nur TRAIN-Evidenz, die Kandidatenauswahl verwendet zurückgehaltene VALIDATION-Aufgaben und der vom Runner verwaltete TEST-Split bleibt bis zum Ende der Evolution verborgen. `--apply` schreibt nur, wenn sich sowohl Validierungs- als auch Final-Test-Nutzwert strikt verbessern.

**SSOT-Hinweis:** Skills mit einer ID, die mit `oma-` beginnt, werden durch `oma update` überschrieben. Für solche Skills wird `--apply` nicht empfohlen — verwende den Standard `--dry-run` und reiche den vorgeschlagenen Diff upstream ein. Benutzerdefinierte Skills können frei angewendet werden.

**Exit-Codes:** `0`, wenn die Optimierung abgeschlossen ist; `1` bei unzureichenden Fixtures oder ungültigem Argument.

**Beispiele:**
```bash
# Propose edits (dry-run, mock — does not change SKILL.md, fully offline)
oma skill optimize --skill oma-scholar --mock --dry-run

# Apply accepted edits (backs up the original first)
oma skill optimize --skill oma-scholar --mock --apply

# Live optimizer with cost preview
oma skill optimize --skill oma-scholar --live

# Live optimizer, skip confirmation, apply if improved
oma skill optimize --skill oma-scholar --live --apply --yes

# JSON output for CI
oma skill optimize --skill oma-scholar --json

# Tune epochs and edits budget
oma skill optimize --skill oma-scholar --max-epochs 4 --edits-per-epoch 2 --lr 300
```

Siehe den Leitfaden [Skill-Optimierung](../guide/skill-opt.md) für den vollständigen Ablauf sowie Hinweise zu SSOT und Overfitting-Schutz.

---

### harness eval

Ein `.agents/`-Overlay-Kandidat wird anhand gepaarter, isolierter Repository-Aufgaben mit dem aktuellen OMA-Harness verglichen. Zielagent und Vendor-Route bleiben fest; deterministische Prüfungen bewerten die Dateien und Ausgaben beider Arme.

```
oma harness eval --suite <path> --candidate <path> [--mock | --live]
                 [--record] [--record-file <path>] [--yes]
                 [--timeout-minutes <n>] [--require-coverage]
                 [--json] [--output <format>]
```

| Flag | Beschreibung |
|:-----|:------------|
| `--suite <path>` | Erforderliche Suite-YAML. Suite und Fixture-Workspaces müssen im Projektstamm liegen. |
| `--candidate <path>` | Erforderliches Kandidatenstammverzeichnis mit einem begrenzten `.agents/`-Overlay. |
| `--mock` | Einen aufgezeichneten Lauf mit passendem Hash wiedergeben (Standard; deterministisch und offline). |
| `--live` | Baseline- und Kandidatenarm über den Zielagenten der Suite ausführen. |
| `--record` | Einen Live-Lauf für spätere Mock-Wiedergabe speichern. Erfordert `--live`. |
| `--record-file <path>` | Aufzeichnungspfad überschreiben; er muss im Projektstamm bleiben. |
| `--yes` | Kostenbestätigung für den Live-Lauf überspringen. |
| `--timeout-minutes <n>` | Timeout pro Arm, für Baseline und Kandidat identisch. Standard: `15`. |
| `--require-coverage` | Mit Exit ungleich null abbrechen, wenn weniger als fünf gepaarte Aufgaben bewertbar sind. |
| `--json` | Die vollständige Evaluation als JSON ausgeben. |
| `--output <format>` | Ausgabeformat (`text` oder `json`). |

**Entscheidungsgate:** pass erfordert mindestens 5 gepaarte Aufgaben, einen Nutzwertzuwachs von mindestens 5 Prozentpunkten und null Regressionen. Eine Regression schlägt immer fehl. Eine Abdeckung unter dem Minimum ist `insufficient` und beendet sich nur mit `--require-coverage` mit einem Fehler.

**Isolation:** Kandidatendateien dürfen im temporären Kandidatenarm nur Inhalte von `.agents/agents`, `.agents/rules`, `.agents/skills` und `.agents/workflows` ersetzen. Hooks, Konfiguration, State, Eval-Fixtures, Symlinks, Vendor-Varianten, geschützte Änderungen am Frontmatter der Agentenausführung und fixture-eigene Vendor-Harness-Dateien werden abgelehnt. Ein Arm schlägt fehl, wenn er während der Ausführung geschützte Definitionen verändert. Vendor-Ermittlung über HOME wird für Live-Evaluation verweigert. Die primäre Agentenroute ist festgelegt; das Pinnen verschachtelter Subagentenmodelle wird noch nicht erzwungen.

```bash
# Generate a live measurement and recording
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --live --record

# Replay the same measurement in CI
oma harness eval --suite harness-eval/suite.yaml --candidate candidate --mock --require-coverage --json
```

Siehe den Leitfaden [Harness-Evaluation](../guide/harness-eval.md) für Suite-Schema, unterstützte Prüfungen, Isolationsmodell und aktuelle Einschränkungen.

---

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

## Umgebungsvariablen {#environment-variables}

| Variable | Beschreibung | Verwendet von |
|:---------|:-----------|:--------|
| `OH_MY_AG_OUTPUT_FORMAT` | Auf `json` setzen, um JSON-Ausgabe bei allen unterstützenden Befehlen zu erzwingen | Alle Befehle mit `--json`-Flag |
| `DASHBOARD_PORT` | Port für das Web-Dashboard | `dashboard web` |
| `MEMORIES_DIR` | Pfad zum Memory-Verzeichnis überschreiben | `dashboard`, `dashboard web` |
| `OMA_SKILLEVAL_MOCK` | Auf `1` setzen, um im Befehl `oma skill eval` unabhängig von den Flags den Mock-Modus zu erzwingen | `skills eval` |

---

## Aliase {#aliases}

| Alias | Vollständiger Befehl |
|:------|:------------|
| `viz` | `visualize` |
