---
title: Installation
description: oh-my-agent installieren, Skills und Provider auswählen, die erzeugten Projektdateien verstehen, Modell- und Laufzeitstandardwerte konfigurieren und die Einrichtung mit oma doctor prüfen.
---

# Installation

## Voraussetzungen

- **Eine KI-gestützte IDE oder CLI:** mindestens ein unterstützter Host wie Claude Code, Codex CLI, Qwen Code, Antigravity CLI (`agy`), Cursor, OpenCode, Kimi Code CLI, Kiro, CommandCode, pi, GitHub Copilot oder Hermes
- **bun:** JavaScript-Laufzeit und Paketmanager (wird vom Installationsskript automatisch angeboten, wenn es fehlt)
- **uv:** Python-Paketmanager (das Bootstrap-Skript bietet die Installation an, wenn es fehlt)
- **Code-Intelligence-Provider:** Serena ist der Standardprovider. Bei entsprechender Provider-Konfiguration wird auch Gortex unterstützt. Der Installer kann Serena über `uv tool install` einrichten und mit einer Warnung fortfahren, wenn eine optionale Abhängigkeit fehlt. Ist Gortex ausgewählt, registrieren `oma install` und `oma update` im Projektmodus das Projekt beim Gortex-Daemon (`gortex track`), sofern es noch nicht verfolgt wird, und tragen die von OMA erzeugten Verzeichnisse über die Gortex-CLI in die Ausschlussliste dieses Projekts ein; in den Projektbaum wird nichts geschrieben. Gortex selbst muss separat installiert werden.

Der Installer gruppiert Integrationen nach Fähigkeiten. Zu den Hook-Vendors gehören Antigravity, Claude, Codex, CommandCode, Cursor, Grok, Kimi, Kiro und Qwen; OpenCode und pi verwenden Erweiterungsbrücken; GitHub Copilot und Hermes erhalten Skill-Links; ZCode erhält Workflow-Befehle. Sie können mehrere Vendors auswählen, für die erste Aufgabe genügt jedoch der Host, den Sie verwenden möchten.

---

## Methode 0: Skills-CLI (am schnellsten für reine Skills)

Installieren Sie das OMA-Skill-Paket in die erkannten Agent-Laufzeiten:

```bash
npx skills add first-fluke/oh-my-agent
```

Das ist der leichteste Einstieg, wenn Sie Skills ohne das vollständige Harness möchten. Für Workflows, Regeln, Hooks, Gates und `oma agent spawn` verwenden Sie unten Methode 1 oder 2.

## Methode 1: Einzeiler-Installation (vollständiges Harness)

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/first-fluke/oh-my-agent/main/cli/install.ps1 | iex
```

Beide Bootstrap-Skripte arbeiten gleich:
1. Sie erkennen die Plattform (macOS, Linux oder Windows).
2. Sie prüfen bun und uv (sowie Serena, wenn ausgewählt) und installieren Fehlendes.
3. Sie starten den interaktiven Installer mit der Auswahl von Preset und Provider.
4. Sie erstellen `.agents/` mit den ausgewählten Skills und der Konfiguration.
5. Sie richten Laufzeit-Integrationsschichten ein (Hooks, Symlinks und Einstellungen für erkannte Vendors).
6. Sie konfigurieren Code-Intelligence- und Memory-MCP-Server.

Das Bootstrap-Skript läuft auch nach Fehlern bei optionalen Abhängigkeiten weiter und nennt Folgebefehle. Führen Sie nach Abschluss des Installers `oma doctor` aus.

---

## Methode 2: Manuelle Installation via bunx

```bash
bunx oh-my-agent@latest
```

Damit startet der interaktive Installer ohne Dependency-Bootstrap. bun muss bereits installiert sein.

Der Installer fordert Sie auf, ein Skill-Preset auszuwählen. Die aktuellen Presets sind in `cli/constants/skill-data.ts` definiert:

### Presets

| Preset | Enthaltene Skills |
|--------|-------------------|
| **all** | Alle 33 aktuellen Skill-Pakete |
| **fullstack** | Architektur, Brainstorming, Design, Frontend, Backend, Mobile, Datenbank, PM, QA, Debugging, SCM, Terraform und Developer-Workflow |
| **fullstack-web** | Fullstack-Webimplementierung, Architektur, Design, PM, QA, Debugging, SCM und Developer-Workflow |
| **fullstack-mobile** | Mobile-orientierte Fullstack-Implementierung, Architektur, Design, PM, QA, Debugging, SCM und Developer-Workflow |
| **frontend** | Architektur, Brainstorming, Design, Frontend, PM, QA, Debugging und SCM |
| **backend** | Architektur, Brainstorming, Backend, Datenbank, PM, QA, Debugging, SCM und Developer-Workflow |
| **mobile** | Architektur, Brainstorming, Mobile, PM, QA, Debugging und SCM |
| **devops** | Architektur, Brainstorming, Terraform, Developer-Workflow, Observability, PM, QA, Debugging und SCM |
| **research** | Scholar, Market, PDF, HWP, Academic Writing, Search, Translation und SCM |
| **content** | Design, Image, Voice, Academic Writing, Translation und SCM |

Presets sind Skill-Bundles; sie erzeugen keine eigene Subagent-Definition pro Skill. Das Preset `all` wird aus der aktuellen Skill-Registry erweitert, daher kann die Liste mit dem Repository wachsen. Domänen-Presets enthalten nur die dafür erforderlichen Skills.

Die gemeinsamen Ressourcen (`_shared/`) werden unabhängig vom Preset immer installiert. Dazu gehören Core-Routing, Context Loading, Prompt-Struktur, Vendor-Erkennung, Ausführungsprotokolle und Memory-Protokoll.

### Was erstellt wird

Nach der Installation enthält Ihr Projekt:

```
.agents/
├── oma-config.yaml # Your preferences
├── oma-config.cue # Optional schema-backed configuration
├── skills/
│ ├── _shared/ # Shared resources (always installed)
│ │ ├── core/ # skill-routing, context-loading, etc.
│ │ ├── runtime/ # memory-protocol, execution-protocols/
│ │ └── conditional/ # quality-score, experiment-ledger, etc.
│ ├── oma-frontend/ # Per preset
│ │ ├── SKILL.md
│ │ └── resources/
│ └── ... # Other selected skills
├── workflows/ # Current workflow definitions (21 in this checkout)
├── agents/ # Subagent definitions
├── mcp.json # MCP server configuration
├── results/ # Plans and agent results (populated by workflows)
└── state/ # Persistent workflow and coordination state

.claude/
├── settings.json # Vendor settings, when Claude Code is selected
├── hooks/oma-hook.sh # Generated wrapper for the in-process hook chain
├── hooks/hud.ts # Optional [OMA] statusline indicator
├── skills/ # Symlinks → .agents/skills/
└── agents/ # Generated native subagent files, when supported

.agents/state/memories/
└── ... # Runtime coordination state
```

Der Installer erstellt Vendor-Verzeichnisse nur für die ausgewählten Hosts. Die Hook-Quelle bleibt in `.agents/hooks/core/`; erzeugte Vendor-Dateien sind Integrationsausgaben. Serena kann in älteren Projekten zusätzlich das Legacy-Verzeichnis `.serena/memories/` verwenden.

---

## Methode 3: Globale Installation

Für CLI-Nutzung (Dashboards, Agenten-Spawning und Diagnose) installieren Sie oh-my-agent global:

### Homebrew (macOS/Linux)

```bash
brew install oh-my-agent
```

### npm / bun global

```bash
bun install --global oh-my-agent
# or
npm install --global oh-my-agent
```

Damit wird der Befehl `oma` global installiert und Sie erhalten aus jedem Verzeichnis Zugriff auf alle CLI-Befehle:

```bash
oma doctor # Health check
oma doctor --profile # Show resolved model/CLI per dispatch role
oma dashboard terminal # Terminal monitoring
oma dashboard web # Web dashboard at http://localhost:9847
oma agent spawn # Spawn agents from terminal
oma agent parallel # Parallel agent execution
oma agent status # Check agent status
oma agent review # Code review via an external CLI
oma docs verify # Check documentation references
oma skill audit # Audit skill routing descriptions
oma stats get # Session statistics
oma recap # Conversation history recap across AI tools
oma link # Regenerate vendor-native files from `.agents/` SSOT
oma update # Update oh-my-agent
oma verify agent <agent-type> # Verify agent output (build/test/scope/secrets)
oma describe # Introspect CLI commands as JSON
oma bridge # MCP stdio ↔ Streamable HTTP bridge
oma memory init # Initialize coordination memory schema
oma auth status # Check CLI auth status
oma search # Mechanical search primitives (alias: `oma s`)
oma image # Multi-vendor AI image generation (alias: `oma img`)
oma video # Video generation and capture
oma slide # Presentation generation and export
oma export # Export skills for external IDEs (e.g. cursor)
oma star # Star the repository
```

`oma` ist die Kurzform von `oh-my-agent`; beide funktionieren als CLI-Befehle.

---

## Installation der KI-CLI-Tools

Sie benötigen mindestens ein installiertes KI-CLI-Tool. oh-my-agent unterstützt mehrere Vendors, die Sie über unterschiedliche CLIs für unterschiedliche Agenten mischen können.

### Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
# or
npm install --global @anthropic-ai/claude-code
```

Die Authentifizierung erfolgt beim ersten Start automatisch. Claude Code verwendet `.claude/` für Hooks und Einstellungen; Skills werden aus `.agents/skills/` verlinkt.

### Codex CLI

```bash
bun install --global @openai/codex
# or
npm install --global @openai/codex
```

Führen Sie nach der Installation `codex login` zur Authentifizierung aus.

### Qwen CLI

```bash
bun install --global @qwen-code/qwen-code
```

Führen Sie nach der Installation `/auth` innerhalb der CLI zur Authentifizierung aus.

### Antigravity CLI (`agy`)

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
```

Die Authentifizierung übernimmt `agy` beim ersten Start. Das Binary heißt `agy`. Setzen Sie in headless-Umgebungen stattdessen `ANTIGRAVITY_API_KEY`. `oma doctor` meldet den Authentifizierungsstatus über `~/.gemini/antigravity-cli/cache/onboarding.json`.

---

## oma-config.yaml

Der Befehl `oma install` erstellt `.agents/oma-config.yaml`. Dies ist die zentrale Konfigurationsdatei für das gesamte Verhalten von oh-my-agent:

```yaml
# Required
language: en
model_preset: auto          # follows the current runtime's native model settings

# Optional — date/time preferences
date_format: ISO
timezone: Australia/Sydney  # omit to use the system timezone

# Optional — auto-update the CLI in background
auto_update_cli: true
telemetry: false

# Optional — capability providers (defaults are context7/native/serena/agentmemory)
# providers:
#   docs: context7
#   web: native
#   code_intelligence: serena
#   code_intelligence_guard: block   # deny native Grep/Glob/rg while serena is configured (off to disable)
#   semantic_memory: agentmemory

# Optional — browser DevTools MCP. Omit to preserve the current setup.
# mcp:
#   devtools_browsers: [aside]

# Optional — partial override per agent (object-only, shallow merge)
agents:
  backend: { model: openai/gpt-5.5, effort: high }
  qa:      { model: anthropic/claude-sonnet-4-6 }

# Optional — user-defined model slugs
# models:
#   my-fast:
#     cli: antigravity
#     cli_model: "Gemini 3.6 Flash (Medium)"
#     supports: { thinking: true }

# Optional — user-defined presets
# custom_presets:
#   my-team:
#     extends: claude
#     agent_defaults:
#       backend: { model: openai/gpt-5.5, effort: high }
```

### Feldreferenz

| Feld | Typ | Erforderlich | Beschreibung |
|------|-----|--------------|--------------|
| `language` | string | Ja | Antwortsprachcode. Unterstützt en, ko, ja, zh, es, fr, de, pt, ru, nl, pl. |
| `model_preset` | string | Ja | Aktiver Preset-Schlüssel. `auto` folgt der aktuellen Laufzeit; feste Schlüssel sind `free`, `antigravity`, `claude`, `codex`, `qwen`, `cursor`, `kiro` und `mixed`. Auch benutzerdefinierte Preset-Schlüssel sind gültig. Siehe [Modelle pro Agent](../guide/per-agent-models.md). |
| `default_cli` | string | Nein | Fallback-CLI für `oma agent spawn`, wenn explizite Agenteneinstellungen und das ausgewählte Preset keinen Vendor auflösen. |
| `free` | map | Nein | FreeLLMAPI-Gateway-Einstellungen bei `model_preset: free`; API-Schlüssel gehören in Umgebungsvariablen. |
| `providers` | map | Nein | Fähigkeits-Provider: `code_intelligence` (`serena` oder `gortex`), `code_intelligence_guard` (`block` oder `off`), `docs` (`context7`), `web` (`native` oder `brave`) und `semantic_memory` (`agentmemory`, `honcho` oder `none`). |
| `date_format` | string | Nein | Zeitstempelformat (`ISO`, `US`, `EU`). Standard: `ISO`. |
| `timezone` | string | Nein | Zeitzonenkennung (zum Beispiel `Asia/Seoul`). Ohne Wert wird die Zeitzone des Hosts verwendet. |
| `auto_update_cli` | boolean | Nein | Ob routinemäßige CLI-Prüfungen im Hintergrund aktualisieren dürfen. Standard: `true` (mit `false` deaktivieren). |
| `telemetry` | boolean | Nein | Opt-in für Vendor-Telemetrie. Standard: `false`. |
| `agents` | map | Nein | Partielle Überschreibungen pro Agent (nur `AgentSpec`-Objekte). Werden flach über Preset-Standardwerte gemergt. |
| `models` | map | Nein | Benutzerdefinierte Modell-Slugs, früher in `models.yaml`. |
| `custom_presets` | map | Nein | Benutzerdefinierte Presets. Unterstützt `extends:` für partielle Vererbung eines eingebauten Presets. |
| `mcp.devtools_browsers` | list | Nein | Browser für DevTools MCP: `aside`, `chrome` oder `firefox`. Ohne Wert bleibt die vorhandene Einrichtung erhalten; `[]` deaktiviert den Browser-Server ausdrücklich. |
| `serena.mode` | string | Nein | `bridge` teilt einen projektweiten Serena-Server und ist der Standard; `stdio` aktiviert einen Prozess pro Sitzung. |
| `serena.auto_update` | boolean | Nein | Ob `oma update` Serena aktualisiert. Standard: `true`. |

> **Konfigurationsformat:** Eine gültige `.agents/oma-config.cue` wird als gemeinsame Konfiguration ausgewertet. Wenn die Auswertung der gemeinsamen CUE-Datei fehlschlägt, kann der Loader auf `.agents/oma-config.yaml` zurückfallen; ein lokales Overlay (`oma-config.local.cue` oder `.yaml`) ist optional, eine ungültige lokale Absicht ist jedoch fatal. `OMA_MODEL_PRESET` überschreibt den Dateiwert für den aktuellen Prozess.

### Vendor-Auflösung

Beim Starten eines Agenten löst die CLI die Einstellungen in dieser Reihenfolge auf: `agents.<id>`, das ausgewählte `model_preset`, der Orchestrator-Fallback des Presets und anschließend `default_cli`. Bei `model_preset: auto` liefert die native Konfiguration der aktuellen Laufzeit das Modell; eine unbekannte Laufzeit fällt auf `default_cli` zurück. Die vollständige Matrix steht unter [Modelle pro Agent](../guide/per-agent-models.md).

---

## Verifikation: `oma doctor`

Prüfen Sie nach Installation und Einrichtung, ob alles funktioniert:

```bash
oma doctor
```

Dieser Befehl prüft:
- Die ausgewählte Host-CLI ist installiert und erreichbar; optionale Tools werden getrennt gemeldet.
- Konfigurierte MCP-Servereinträge sind gültig (zum Beispiel Serena, Gortex, Context7 oder DevTools).
- Skill-Dateien existieren mit gültigem SKILL.md-Frontmatter.
- Symlinks und Hook-Skripte zeigen auf gültige Ziele.
- Hooks sind in den Vendor-Einstellungsdateien korrekt konfiguriert.
- Ausgewählte Code-Intelligence- und Memory-Provider sind erreichbar (bei Gortex zusätzlich, ob sich das aktuelle Projekt in der Menge der vom Daemon verfolgten Projekte befindet).
- `oma-config.cue` / `oma-config.yaml` ist mit den erforderlichen Feldern gültig.

Wenn etwas nicht stimmt, nennt `oma doctor` das fehlende oder ungültige Element und trennt Blocker für die erste Aufgabe von Warnungen zu optionalen Integrationen.

Für das aufgelöste Modell und die CLI jedes Agenten führen Sie aus:

```bash
oma doctor --profile
```

Die vollständige Matrix und Migrationsdetails stehen unter [Modelle pro Agent](../guide/per-agent-models.md).

---

## Aktualisierung

### CLI-Aktualisierung

```bash
oma update
```

Damit wird die globale oh-my-agent-CLI auf die neueste Version aktualisiert.

### Projekt-Skills aktualisieren

Skills und Workflows innerhalb eines Projekts können über die GitHub Action (`action/`) automatisch oder manuell durch erneutes Ausführen des Installers aktualisiert werden:

```bash
bunx oh-my-agent@latest
```

Der Installer erkennt vorhandene Installationen und bietet eine Aktualisierung an, wobei `oma-config.yaml` und benutzerdefinierte Konfigurationen erhalten bleiben.

---

## Nächste Schritte

Öffnen Sie Ihr Projekt in der ausgewählten KI-IDE oder CLI und beginnen Sie, oh-my-agent zu verwenden. Skill-Routing hängt vom Host ab; aktivierte Hooks können Workflows erkennen. Probieren Sie:

```
"Build a login form with email validation using Tailwind CSS"
```

Oder verwenden Sie einen Workflow-Befehl:

```
/plan authentication feature with JWT and refresh tokens
```

Weitere Beispiele finden Sie im [Nutzungsleitfaden](/docs/guide/usage). Unter [Agenten](/docs/core-concepts/agents) erfahren Sie, welche Aufgaben die einzelnen Spezialisten übernehmen.
